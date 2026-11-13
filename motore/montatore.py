#!/usr/bin/env python3
"""Montatore di Momento Reel (gira su GitHub Actions o in locale).

Riceve un PIANO DI MONTAGGIO (scritto dal Regista a partire dalla scheda tecnica) e consegna un reel 9:16 finito.
Reparti, nell'ordine in cui lavorano:
  Colorist     → uniforma le clip (bilanciamento del bianco ed esposizione misurati) e applica il look (LUT 3D)
  Editor       → reframe intelligente 9:16 (segue volti/soggetto), stabilizzazione, rallenty veri, durate sul beat
  VFX          → punch-in, zoom, shake, transizioni (flash, whip, zoom, glitch, dissolvenza), light leak, grana
  Sottotitoli  → testi animati (ASS) con font Google, sottotitoli parola per parola/karaoke dal parlato (Whisper)
  Audio        → suono originale, musica (se c'è), sound design generato (whoosh, impatti, riser), −14 LUFS
  Revisore     → controlla fotogrammi neri, durata, volume, peso; scarta se qualcosa non va
Ogni pezzo si monta in parallelo, poi si assembla.
"""
import json, math, os, re, shutil, subprocess, tempfile, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np

W, H, FPS = 1080, 1920, 30
X264_INT = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-r", str(FPS)]  # intermedi: qualità alta
PARALLELO = int(os.environ.get("PARALLELO_MONTAGGIO", str(max(2, (os.cpu_count() or 2)))))


class Montatore:
    def __init__(self, piano, cartella=None, avvisa=None):
        self.p = piano
        self.tmp = cartella or tempfile.mkdtemp(prefix="monta_")
        self.fontdir = os.path.join(self.tmp, "font")
        os.makedirs(self.fontdir, exist_ok=True)
        self.avvisa = avvisa or (lambda agente, msg: print(f"[{agente}] {msg}", flush=True))
        self.report = []

    # -------------------------------------------------------------- utilità
    def ff(self, args, cosa=""):
        p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args, capture_output=True, text=True)
        if p.returncode != 0:
            raise RuntimeError(f"ffmpeg {cosa}: {p.stderr.strip()[-700:]}")
        return p

    @staticmethod
    def probe(path):
        p = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path], capture_output=True, text=True)
        d = json.loads(p.stdout or "{}")
        v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), {})
        num, _, den = (v.get("avg_frame_rate") or "0/1").partition("/")
        fps = float(num) / float(den) if float(den or 0) else 0
        w, h = int(v.get("width") or 0), int(v.get("height") or 0)
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            rot = abs(int(sd.get("rotation", 0) or 0))
        if rot in (90, 270):
            w, h = h, w
        return {"dur": float(d.get("format", {}).get("duration") or 0), "fps": fps, "w": w, "h": h,
                "audio": any(s.get("codec_type") == "audio" for s in d.get("streams", []))}

    def fotogrammi(self, path, inizio, durata, n, larghezza=320):
        """n fotogrammi (array RGB) distribuiti nel tratto [inizio, inizio+durata]."""
        out = []
        info = self.probe(path)
        for k in range(n):
            t = inizio + durata * (k + 0.5) / n
            p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
                                "-vf", f"scale={larghezza}:-2", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
            if p.returncode == 0 and p.stdout:
                hh = int(round(larghezza * info["h"] / max(1, info["w"]) / 2) * 2) if info["w"] else 0
                arr = np.frombuffer(p.stdout, dtype=np.uint8)
                if hh and arr.size == larghezza * hh * 3:
                    out.append((t, arr.reshape(hh, larghezza, 3)))
        return out

    # -------------------------------------------------------------- colorist
    LOOKS = {
        #                      contrasto  sat   ombre(r,g,b)          luci(r,g,b)           nero  bianco  bn
        "caldo_cinematico":   (1.10, 1.08, (0.01, 0.00, 0.03), (0.07, 0.03, -0.05), 0.03, 0.98, False),
        "pulito_commerciale": (1.12, 1.10, (0.00, 0.00, 0.01), (0.01, 0.01, 0.00), 0.00, 1.00, False),
        "teal_orange":        (1.14, 1.12, (-0.03, 0.02, 0.06), (0.08, 0.02, -0.07), 0.02, 0.99, False),
        "moody_scuro":        (1.18, 0.82, (0.00, 0.01, 0.03), (0.02, 0.01, -0.01), 0.04, 0.90, False),
        "naturale_vivace":    (1.06, 1.18, (0.00, 0.00, 0.00), (0.02, 0.01, -0.01), 0.00, 1.00, False),
        "bn_contrasto":       (1.25, 0.00, (0.00, 0.00, 0.00), (0.00, 0.00, 0.00), 0.02, 1.00, True),
        "pastello_soft":      (0.90, 0.85, (0.03, 0.02, 0.04), (0.03, 0.02, 0.02), 0.08, 0.97, False),
        "vintage_film":       (0.96, 0.86, (0.02, 0.03, 0.04), (0.06, 0.03, -0.03), 0.08, 0.95, False),
    }

    def crea_lut(self, nome, intensita=1.0):
        con, sat, sh, hi, nero, bianco, bn = self.LOOKS.get(nome, self.LOOKS["naturale_vivace"])
        n = 33
        r, g, b = np.meshgrid(np.linspace(0, 1, n), np.linspace(0, 1, n), np.linspace(0, 1, n), indexing="ij")
        rgb = np.stack([r, g, b], -1)
        orig = rgb.copy()
        rgb = nero + rgb * (bianco - nero)
        rgb = 0.5 + (rgb - 0.5) * con + (con - 1) * 0.15 * np.sin((rgb - 0.5) * math.pi) * 0  # contrasto lineare morbido
        rgb = rgb + (con - 1) * 0.5 * (rgb - 0.5) * (1 - np.abs(2 * rgb - 1))  # curva a S sui mezzitoni
        luma = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])[..., None]
        rgb = rgb + np.array(sh) * (1 - luma) ** 2 + np.array(hi) * luma ** 2
        luma = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])[..., None]
        rgb = luma + (rgb - luma) * (0 if bn else sat)
        rgb = orig + (rgb - orig) * float(intensita)
        rgb = np.clip(rgb, 0, 1)
        path = os.path.join(self.tmp, f"look_{nome}.cube")
        with open(path, "w") as f:
            f.write(f"LUT_3D_SIZE {n}\n")
            for bi in range(n):          # ordine .cube: R più veloce, poi G, poi B
                for gi in range(n):
                    for ri in range(n):
                        f.write("%.5f %.5f %.5f\n" % tuple(rgb[ri, gi, bi]))
        return path

    @staticmethod
    def correzione(quadri):
        """Bilanciamento del bianco (gray-world, limitato) ed esposizione misurati sui fotogrammi del pezzo."""
        if not quadri:
            return ""
        px = np.concatenate([q.reshape(-1, 3).astype(np.float32) for _, q in quadri])
        lum = px.mean(axis=1)
        medi = px[(lum > 20) & (lum < 235)]  # esclude bruciati e neri
        if len(medi) < 100:
            return ""
        m = medi.mean(axis=0)
        grigio = m.mean()
        gain = np.clip(grigio / np.maximum(m, 1), 0.88, 1.12)
        gain = 1 + (gain - 1) * 0.7  # correzione delicata: non deve ammazzare il look naturale della luce
        y = float(np.median(lum))
        gamma = float(np.clip(math.log(118 / 255) / math.log(max(y, 5) / 255), 0.8, 1.25)) if 25 < y < 230 else 1.0
        gamma = 1 + (gamma - 1) * 0.6
        return f"colorchannelmixer=rr={gain[0]:.3f}:gg={gain[1]:.3f}:bb={gain[2]:.3f},eq=gamma={gamma:.3f}"

    # -------------------------------------------------------------- editor: reframe intelligente
    _volti = None

    def centro_soggetto(self, quadri):
        """Centro orizzontale (0-1) del soggetto per ogni fotogramma: volti > movimento > punto più "saliente"."""
        try:
            import cv2
            if Montatore._volti is None:
                c = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
                Montatore._volti = False if c.empty() else c
            if Montatore._volti is False:
                cv2 = None
        except Exception:
            cv2 = None
        centri, prec = [], None
        for _, q in quadri:
            h, w, _ = q.shape
            g = q.mean(axis=2).astype(np.float32)
            cx = None
            if cv2 is not None:
                volti = Montatore._volti.detectMultiScale(cv2.cvtColor(q, cv2.COLOR_RGB2GRAY), 1.15, 5, minSize=(w // 14, w // 14))
                if len(volti):
                    x, y, fw, fh = max(volti, key=lambda f: f[2] * f[3])
                    cx = (x + fw / 2) / w
            if cx is None:
                # salienza (residuo spettrale) + movimento rispetto al fotogramma prima
                small = g[:: max(1, h // 64), :: max(1, w // 64)]
                F = np.fft.fft2(small)
                logA = np.log(np.abs(F) + 1e-6)
                resid = logA - np.real(np.fft.ifft2(np.fft.fft2(logA) * np.fft.fft2(np.ones((3, 3)) / 9, logA.shape)))
                sal = np.abs(np.fft.ifft2(np.exp(resid + 1j * np.angle(F)))) ** 2
                peso = sal.sum(axis=0)
                if prec is not None and prec.shape == g.shape:
                    mov = np.abs(g - prec)[:: max(1, h // 64), :: max(1, w // 64)].sum(axis=0)
                    if mov.sum() > 1e-3:
                        peso = peso / (peso.sum() + 1e-9) + 1.5 * mov / (mov.sum() + 1e-9)
                xs = np.linspace(0, 1, len(peso))
                cx = float((xs * peso).sum() / (peso.sum() + 1e-9))
                cx = 0.5 + (cx - 0.5) * 0.7  # la salienza è rumorosa: avvicino al centro
            centri.append(cx)
            prec = g
        return centri

    # -------------------------------------------------------------- VFX: movimenti di macchina
    @staticmethod
    def movimento(effetto, dur):
        """Movimenti di macchina con zoompan a un fotogramma per volta (stabile; scale per-frame fa crashare ffmpeg 6)."""
        d = max(dur, 0.3)
        tt = f"(on/{FPS})"
        def zoom(z):
            return f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"
        if effetto == "punch_in":
            return zoom(f"1+0.16*max(0,1-{tt}/0.22)+0.04*min(1,{tt}/{d:.2f})")
        if effetto == "zoom_lento":
            return zoom(f"1+0.09*{tt}/{d:.2f}")
        if effetto == "zoom_out":
            return zoom(f"1.09-0.09*min(1,{tt}/{d:.2f})")
        if effetto == "shake":
            return (f"scale={int(W * 1.06) // 2 * 2}:{int(H * 1.06) // 2 * 2},"
                    f"crop={W}:{H}:x='(iw-{W})/2+14*sin(t*37)*exp(-3*t)':y='(ih-{H})/2+14*cos(t*29)*exp(-3*t)'")
        return ""

    # -------------------------------------------------------------- un pezzo della timeline
    def pezzo(self, i, s, lut, globali):
        src = s["file"]
        info = s["_info"]
        dur = float(s["durata"])
        vel = float(s.get("velocita", 1) or 1)
        rallenty = bool(s.get("rallenty"))
        if rallenty:
            vel = min(vel, 0.5)
        sorgente = dur * vel  # secondi di girato che servono
        t_in = max(0.0, min(float(s.get("in", 0)), max(0.0, info["dur"] - sorgente - 0.05)))
        out = os.path.join(self.tmp, f"pezzo_{i:02d}.mp4")

        quadri = self.fotogrammi(src, t_in, max(sorgente, 0.2), 6)
        corr = self.correzione(quadri)
        filtri = []
        # stabilizzazione (solo se la clip si muove molto e il regista non l'ha esclusa)
        stab = s.get("stabilizza", "auto")
        if stab == "auto" and len(quadri) > 2:
            diff = np.mean([np.abs(quadri[k + 1][1].astype(np.int16) - quadri[k][1].astype(np.int16)).mean() for k in range(len(quadri) - 1)])
            stab = diff > 18 and s.get("effetto") not in ("shake",)
        trf = os.path.join(self.tmp, f"stab_{i}.trf")
        if stab is True:
            try:
                self.ff(["-ss", f"{t_in:.3f}", "-t", f"{sorgente:.3f}", "-i", src, "-vf", f"vidstabdetect=shakiness=6:accuracy=12:result={trf}", "-f", "null", "-"], "stabilizza")
                filtri.append(f"vidstabtransform=input={trf}:smoothing=18:zoom=4:optzoom=0")
            except RuntimeError:
                pass
        # reframe 9:16 che segue il soggetto (panoramica lineare dentro il pezzo)
        sw, sh = info["w"] or W, info["h"] or H
        if sw / sh > W / H + 0.02:
            centri = self.centro_soggetto(quadri) if quadri else [0.5]
            c0, c1 = float(np.mean(centri[: max(1, len(centri) // 2)])), float(np.mean(centri[len(centri) // 2:] or centri))
            if abs(c1 - c0) < 0.06:
                c0 = c1 = (c0 + c1) / 2
            cw = sh * W / H
            x0 = min(max(0, c0 * sw - cw / 2), sw - cw)
            x1 = min(max(0, c1 * sw - cw / 2), sw - cw)
            durv = max(dur, 0.1)
            filtri.append(f"crop=w={int(cw) // 2 * 2}:h={sh}:x='{x0:.1f}+({x1 - x0:.1f})*min(1,t/{durv * vel:.3f})':y=0")
            self.report.append(f"pezzo {i + 1}: reframe {('fisso' if x0 == x1 else 'con panoramica')} sul soggetto")
        filtri.append(f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}")
        # velocità: rallenty vero se il girato è a 50/60 fps, altrimenti fotogrammi intermedi ricostruiti
        if abs(vel - 1) > 0.01:
            if vel < 1 and info["fps"] < 45:
                filtri.append(f"minterpolate=fps={FPS / vel:.0f}:mi_mode=mci:mc_mode=aobmc:vsbmc=1")
            filtri.append(f"setpts=PTS/{vel:.4f}")
        filtri.append(f"fps={FPS}")
        mov = self.movimento(s.get("effetto", ""), dur)
        if mov:
            filtri.append(mov)
        if corr:
            filtri.append(corr)
        filtri.append(f"lut3d='{lut}'")
        if "grana" in globali:
            filtri.append("noise=alls=6:allf=t")
        if "vignettatura" in globali:
            filtri.append("vignette=PI/5")
        filtri.append(f"trim=duration={dur:.3f},setpts=PTS-STARTPTS,setsar=1,format=yuv420p")
        tentativi = [filtri, [f for f in filtri if not f.startswith(("vidstab", "minterpolate"))]]
        for k, fl in enumerate(tentativi):
            try:
                self.ff(["-ss", f"{t_in:.3f}", "-t", f"{sorgente + 0.2:.3f}", "-i", src, "-vf", ",".join(fl), "-an"] + X264_INT + [out], f"pezzo {i + 1}")
                if k:
                    self.report.append(f"pezzo {i + 1}: montato senza stabilizzazione/interpolazione (troppo pesante)")
                break
            except RuntimeError:
                if k == len(tentativi) - 1:
                    raise
        s.update({"_in": t_in, "_vel": vel, "_out": out, "_stab": stab is True})
        return out

    # -------------------------------------------------------------- VFX: assemblaggio con transizioni
    TRANS = {"taglio_netto": ("fade", 1 / FPS), "dissolvenza": ("fade", 0.45), "flash_bianco": ("fadewhite", 0.16),
             "whip_pan": ("hblur", 0.22), "zoom": ("zoomin", 0.3), "glitch": ("pixelize", 0.18),
             "slide": ("slideleft", 0.25), "fadenero": ("fadeblack", 0.4)}

    def assembla(self, pezzi, segmenti):
        out = os.path.join(self.tmp, "video.mp4")
        dur = [self.probe(p)["dur"] for p in pezzi]
        args, fc = [], []
        for p in pezzi:
            args += ["-i", p]
        inizi, totale, prev = [0.0], dur[0], "[0:v]"
        for k in range(1, len(pezzi)):
            nome = segmenti[k].get("transizione_in") or "taglio_netto"
            tr, td = self.TRANS.get(nome, self.TRANS["taglio_netto"])
            td = min(td, dur[k] * 0.4, dur[k - 1] * 0.4)
            fc.append(f"{prev}[{k}:v]xfade=transition={tr}:duration={td:.3f}:offset={totale - td:.3f}[x{k}]")
            inizi.append(totale - td)
            totale += dur[k] - td
            prev = f"[x{k}]"
        if len(pezzi) == 1:
            shutil.copy(pezzi[0], out)
        else:
            self.ff(args + ["-filter_complex", ";".join(fc), "-map", prev] + X264_INT + [out], "transizioni")
        return out, totale, inizi, dur

    def light_leak(self, video, durata, momenti):
        """Bagliori di luce caldi in sovrapposizione (screen) nei momenti indicati."""
        if not momenti:
            return video
        leak = os.path.join(self.tmp, "leak.mp4")
        self.ff(["-f", "lavfi", "-i", f"gradients=s={W // 4}x{H // 4}:c0=0xff8a3c:c1=0xffd27a:c2=0x000000:c3=0x000000:n=4:speed=0.03:d={durata:.2f}:r={FPS}",
                 "-vf", f"scale={W}:{H},gblur=sigma=50,format=yuv420p"] + X264_INT + [leak], "light leak")
        en = "+".join(f"between(t,{a:.2f},{a + 0.7:.2f})" for a in momenti)
        out = os.path.join(self.tmp, "video_leak.mp4")
        self.ff(["-i", video, "-i", leak, "-filter_complex",
                 f"[0:v]format=gbrp[a];[1:v]format=gbrp[b];[a][b]blend=all_mode=screen:all_opacity=0.35:enable='{en}',format=yuv420p[v]",
                 "-map", "[v]"] + X264_INT + [out], "light leak")
        return out

    # -------------------------------------------------------------- testi
    def font(self, famiglia, peso=700):
        """Scarica un font da Google Fonts (TTF) per nome. Ritorna il nome di famiglia da usare nell'ASS."""
        nome_file = os.path.join(self.fontdir, re.sub(r"\W+", "", famiglia) + f"-{peso}.ttf")
        if os.path.exists(nome_file):
            return famiglia
        try:
            url = "https://fonts.googleapis.com/css2?family=" + urllib.parse.quote(famiglia) + f":wght@{peso}"
            req = urllib.request.Request(url, headers={"user-agent": "Mozilla/4.0"})  # UA vecchio → link .ttf
            css = urllib.request.urlopen(req, timeout=30).read().decode()
            ttf = re.search(r"url\((https://[^)]+\.ttf)\)", css)
            if not ttf:
                css = urllib.request.urlopen(urllib.request.Request(url.split(":wght")[0], headers={"user-agent": "Mozilla/4.0"}), timeout=30).read().decode()
                ttf = re.search(r"url\((https://[^)]+\.ttf)\)", css)
            with urllib.request.urlopen(ttf.group(1), timeout=60) as r, open(nome_file, "wb") as f:
                f.write(r.read())
            return famiglia
        except Exception as e:
            self.report.append(f"font {famiglia} non disponibile ({str(e)[:60]}): uso Montserrat")
            return famiglia if famiglia == "Montserrat" else self.font("Montserrat", peso)

    @staticmethod
    def ass_colore(hexcol, alpha=0):
        h = (hexcol or "#FFFFFF").lstrip("#")
        h = (h + "FFFFFF")[:6]
        return f"&H{alpha:02X}{h[4:6]}{h[2:4]}{h[0:2]}"

    @staticmethod
    def tempo_ass(s):
        s = max(0.0, s)
        return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"

    def scrivi_testi(self, testi, parole, totale):
        P = self.p
        fnt = P.get("font") or {}
        f_tit = self.font(fnt.get("titoli") or "Montserrat", 800)
        f_txt = self.font(fnt.get("testi") or "Montserrat", 600)
        col = P.get("colori") or {}
        bianco = self.ass_colore(col.get("testo", "#FFFFFF"))
        acc = self.ass_colore(col.get("accento", "#F2B84B"))
        box = self.ass_colore(col.get("box", "#000000"), 0x40)
        pos_y = {"alto": 420, "centro": 900, "terzo_inferiore": 1380}
        head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\n"
                "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                f"Style: Titolo,{f_tit},118,{bianco},{bianco},&H00000000,&H64000000,-1,0,0,0,100,100,1,0,1,0,7,5,70,70,0,1\n"
                f"Style: Box,{f_txt},64,{bianco},{bianco},{box},{box},-1,0,0,0,100,100,1,0,3,18,0,5,90,90,0,1\n"
                f"Style: Classico,{f_txt},58,{bianco},{bianco},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,90,90,420,1\n"
                f"Style: Sub,{f_txt},78,{bianco},{bianco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,0,5,80,80,0,1\n\n"
                "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        pulisci = lambda t: str(t).replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")
        ev = []
        for t in testi:
            a, b = float(t["da"]), min(float(t["a"]), totale)
            if b - a < 0.3:
                continue
            stile = t.get("stile", "titolo_grande_centrale")
            y = pos_y.get(t.get("posizione", "centro"), 900)
            anim = t.get("animazione", "pop")
            testo = pulisci(t["testo"])
            if stile == "nessun_testo":
                continue
            if stile == "etichetta_box":
                ev.append(f"Dialogue: 2,{self.tempo_ass(a)},{self.tempo_ass(b)},Box,,0,0,0,,{{\\an5\\pos(540,{y})\\fad(120,150)\\fscx80\\fscy80\\t(0,180,\\fscx100\\fscy100)}}{testo}")
            elif stile == "sottotitolo_classico":
                ev.append(f"Dialogue: 2,{self.tempo_ass(a)},{self.tempo_ass(b)},Classico,,0,0,0,,{{\\fad(150,150)}}{testo}")
            else:  # titolo grande: parole che entrano una alla volta con un piccolo "pop", la parola chiave in colore
                parole_t = testo.split()
                chiave = (t.get("evidenzia") or "").lower()
                pezzi = []
                for k, w in enumerate(parole_t):
                    t0 = int(k * (90 if anim != "dissolvi" else 0))
                    colore = f"\\c{acc}" if chiave and chiave in w.lower() else ""
                    pezzi.append(f"{{\\alpha&HFF&{colore}\\t({t0},{t0 + 160},\\alpha&H00&)\\fscx70\\fscy70\\t({t0},{t0 + 200},\\fscx104\\fscy104)\\t({t0 + 200},{t0 + 300},\\fscx100\\fscy100)}}{w}{{\\c{bianco}}}")
                ev.append(f"Dialogue: 3,{self.tempo_ass(a)},{self.tempo_ass(b)},Titolo,,0,0,0,,{{\\an5\\pos(540,{y})\\fad(0,220)}}{' '.join(pezzi)}")
        # sottotitoli dal parlato
        st = (P.get("sottotitoli") or {})
        if st.get("usare") and parole:
            stile = st.get("stile", "parola_per_parola")
            y = pos_y.get(st.get("posizione", "terzo_inferiore"), 1380)
            gruppo = 1 if stile == "parola_per_parola" else 3
            for g in range(0, len(parole), gruppo):
                blocco = parole[g:g + gruppo]
                for k, w in enumerate(blocco):
                    a = w["da"]
                    b = blocco[k + 1]["da"] if k + 1 < len(blocco) else w["a"] + 0.08
                    if stile == "parola_per_parola":
                        txt = f"{{\\an5\\pos(540,{y})\\fscx80\\fscy80\\t(0,90,\\fscx100\\fscy100)}}{pulisci(w['testo']).upper()}"
                    else:
                        txt = f"{{\\an5\\pos(540,{y})}}" + " ".join(
                            f"{{\\c{acc}}}{pulisci(x['testo']).upper()}{{\\c{bianco}}}" if j == k else pulisci(x["testo"]).upper() for j, x in enumerate(blocco))
                    ev.append(f"Dialogue: 1,{self.tempo_ass(a)},{self.tempo_ass(min(b, totale))},Sub,,0,0,0,,{txt}")
        path = os.path.join(self.tmp, "testi.ass")
        with open(path, "w", encoding="utf-8") as f:
            f.write(head + "\n".join(ev) + "\n")
        return path

    def trascrivi_tratti(self, segmenti, inizi):
        """Parole del parlato originale (Whisper) riportate sui tempi del reel."""
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            return []
        modello = WhisperModel(os.environ.get("WHISPER_MODELLO", "small"), device="cpu", compute_type="int8")
        parole = []
        for s, t0 in zip(segmenti, inizi):
            if not s["_info"]["audio"] or s.get("audio", 1) <= 0 or abs(s["_vel"] - 1) > 0.01:
                continue
            wav = os.path.join(self.tmp, f"voce_{id(s)}.wav")
            self.ff(["-ss", f"{s['_in']:.3f}", "-t", f"{s['durata']:.3f}", "-i", s["file"], "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", wav + ".raw"], "voce")
            y = np.fromfile(wav + ".raw", dtype=np.int16).astype(np.float32) / 32768.0 if os.path.exists(wav + ".raw") else None
            if y is None or len(y) < 8000:
                continue
            seg, _ = modello.transcribe(y, word_timestamps=True, vad_filter=True)
            for x in seg:
                for w in x.words or []:
                    if w.word.strip():
                        parole.append({"testo": w.word.strip(), "da": t0 + w.start, "a": t0 + w.end})
        return parole

    # -------------------------------------------------------------- chiusura
    def chiusura(self, cfg, lut):
        dur = float(cfg.get("durata", 2.4))
        out = os.path.join(self.tmp, "chiusura.mp4")
        colore = (cfg.get("colore") or "#101417").lstrip("#")
        self.ff(["-f", "lavfi", "-i", f"color=c=0x{colore}:s={W}x{H}:r={FPS}:d={dur}", "-vf", "format=yuv420p"] + X264_INT + [out], "chiusura")
        return out

    # -------------------------------------------------------------- audio
    def sfx(self, tipo):
        path = os.path.join(self.tmp, f"sfx_{tipo}.wav")
        if os.path.exists(path):
            return path
        if tipo == "whoosh":
            src, af = "anoisesrc=d=0.45:c=pink:a=0.7", "highpass=f=500,lowpass=f=6000,afade=t=in:d=0.3,afade=t=out:st=0.3:d=0.15,volume=0.45"
        elif tipo == "impatto":
            src, af = "sine=f=55:d=0.5", "afade=t=out:st=0.05:d=0.45,volume=0.9,aecho=0.6:0.4:40:0.3"
        else:  # riser
            src, af = "anoisesrc=d=1.2:c=white:a=0.5", "highpass=f=200,lowpass=f=9000,afade=t=in:d=1.15,volume=0.35"
        self.ff(["-f", "lavfi", "-i", src, "-af", af, "-ar", "48000", "-ac", "2", path], f"sfx {tipo}")
        return path

    def mixa(self, video, ass, totale, segmenti, inizi, tagli, punch, out):
        P = self.p
        args, filt, mix, k = ["-i", video], [], [], 1
        mus = P.get("musica") or {}
        if mus.get("file"):
            args += ["-i", mus["file"]]
            filt.append(f"[{k}:a]atrim=start={float(mus.get('inizio', 0)):.2f}:duration={totale:.3f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,"
                        f"volume={float(mus.get('volume', 0.9)):.2f},afade=t=in:d=0.2,afade=t=out:st={max(0, totale - 1.2):.2f}:d=1.2[mus]")
            mix.append("[mus]")
            k += 1
        for j, (s, t0) in enumerate(zip(segmenti, inizi)):
            vol = float(s.get("audio", 0.8 if not mus.get("file") else 0.35))
            if vol <= 0 or not s["_info"]["audio"] or abs(s["_vel"] - 1) > 0.01:
                continue
            args += ["-ss", f"{s['_in']:.3f}", "-t", f"{s['durata']:.3f}", "-i", s["file"]]
            ms = int(t0 * 1000)
            filt.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol:.2f},afade=t=in:d=0.04,"
                        f"afade=t=out:st={max(0, s['durata'] - 0.08):.3f}:d=0.08,adelay={ms}|{ms}[amb{j}]")
            mix.append(f"[amb{j}]")
            k += 1
        if P.get("sfx", True):
            eventi = [("whoosh", t - 0.22) for t, tr in tagli if tr not in ("taglio_netto", "dissolvenza", "fadenero")][:14]
            eventi += [("impatto", t) for t in punch[:8]]
            if P.get("riser") and totale > 4:
                eventi.append(("riser", max(0, float(P["riser"]) - 1.2)))
            for n, (tipo, t) in enumerate(eventi):
                args += ["-i", self.sfx(tipo)]
                ms = max(0, int(t * 1000))
                filt.append(f"[{k}:a]adelay={ms}|{ms}[s{n}]")
                mix.append(f"[s{n}]")
                k += 1
        if mix:
            filt.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,atrim=duration={totale:.3f},loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000[aout]")
        else:
            args += ["-f", "lavfi", "-t", f"{totale:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            filt.append(f"[{k}:a]anull[aout]")
        filt.append(f"[0:v]ass='{ass}':fontsdir='{self.fontdir}'[vout]")
        rate = max(3.0, min(12.0, 165 / max(totale, 1)))  # Mbit/s: il reel resta sotto ~22 MB (limite archivio 25 MB), IG ricomprime comunque
        self.ff(args + ["-filter_complex", ";".join(filt), "-map", "[vout]", "-map", "[aout]", "-t", f"{totale:.3f}",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high", "-maxrate", f"{rate:.1f}M", "-bufsize", f"{rate * 2:.1f}M",
                        "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], "mix finale")

    # -------------------------------------------------------------- revisore
    def revisiona(self, out):
        problemi = []
        info = self.probe(out)
        target = float(self.p.get("durata_target") or 0)
        if target and abs(info["dur"] - target) > max(4, target * 0.25):
            problemi.append(f"durata {info['dur']:.1f}s lontana dal previsto ({target:.0f}s)")
        p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", out, "-vf", "blackdetect=d=0.4:pix_th=0.06", "-af", "ebur128", "-f", "null", "-"],
                           capture_output=True, text=True)
        neri = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", p.stderr)
        chiusura = self.p.get("chiusura") or {}
        fine_video = info["dur"] - (float(chiusura.get("durata", 0)) if chiusura else 0)
        neri = [(float(a), float(b)) for a, b in neri if float(a) < fine_video - 0.2]
        if neri:
            problemi.append("fotogrammi neri a " + ", ".join(f"{a:.1f}s" for a, _ in neri[:3]))
        lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)
        lufs = float(lufs[-1]) if lufs else None
        if lufs is not None and lufs > -60 and abs(lufs + 14) > 2.5:
            problemi.append(f"volume {lufs:.1f} LUFS (atteso −14)")
        mb = os.path.getsize(out) / 1048576
        if mb > 24.5:
            problemi.append(f"file troppo pesante per l'archivio ({mb:.0f} MB, max 25)")
        return {"durata": round(info["dur"], 2), "lufs": lufs, "mb": round(mb, 1), "problemi": problemi, "note": self.report}

    # -------------------------------------------------------------- regia del montaggio
    def monta(self, out_finale):
        t0 = time.time()
        P = self.p
        segmenti = [dict(s) for s in P["segmenti"]]
        for s in segmenti:
            s["_info"] = self.probe(s["file"])
        self.avvisa("color", f"preparo il look {P.get('look', 'naturale_vivace')} e misuro bianco ed esposizione di {len(segmenti)} pezzi")
        lut = self.crea_lut(P.get("look", "naturale_vivace"), float(P.get("intensita_look", 1.0)))
        globali = set(P.get("effetti_globali") or [])
        self.avvisa("editor", f"monto {len(segmenti)} pezzi in parallelo: reframe sul soggetto, stabilizzazione, rallenty")
        with ThreadPoolExecutor(PARALLELO) as ex:
            pezzi = list(ex.map(lambda a: self.pezzo(a[0], a[1], lut, globali), enumerate(segmenti)))
        if P.get("chiusura"):
            pezzi.append(self.chiusura(P["chiusura"], lut))
            segmenti_tr = segmenti + [{"transizione_in": P["chiusura"].get("transizione", "dissolvenza")}]
        else:
            segmenti_tr = segmenti
        self.avvisa("vfx", "assemblo con le transizioni e gli effetti")
        video, totale, inizi, durate = self.assembla(pezzi, segmenti_tr)
        if "light_leak" in globali:
            momenti = [inizi[k] - 0.2 for k in range(1, len(segmenti)) if segmenti[k].get("transizione_in") in ("dissolvenza", "whip_pan", "zoom")] or [0.0]
            video = self.light_leak(video, totale, momenti[:5])
        if "bande_cinema" in globali:
            v2 = os.path.join(self.tmp, "video_bande.mp4")
            bh = int(H * 0.07)
            self.ff(["-i", video, "-vf", f"drawbox=x=0:y=0:w=iw:h={bh}:color=black:t=fill,drawbox=x=0:y=ih-{bh}:w=iw:h={bh}:color=black:t=fill"] + X264_INT + [v2], "bande")
            video = v2
        # testi: quelli del regista + chiusura
        testi = list(P.get("testi") or [])
        for k, s in enumerate(segmenti):
            if s.get("testo"):
                fine = inizi[k + 1] if k + 1 < len(inizi) else inizi[k] + durate[k]
                testi.append(dict(s["testo"], da=inizi[k] + 0.1, a=fine - 0.05))
        if P.get("chiusura"):
            c = P["chiusura"]
            a = inizi[-1] + 0.15
            if c.get("testo"):
                testi.append({"da": a, "a": totale, "testo": c["testo"], "stile": "titolo_grande_centrale", "posizione": "centro", "evidenzia": c.get("evidenzia")})
            if c.get("sottotesto"):
                testi.append({"da": a + 0.35, "a": totale, "testo": c["sottotesto"], "stile": "sottotitolo_classico"})
        parole = []
        if (P.get("sottotitoli") or {}).get("usare"):
            self.avvisa("sottotitoli", "trascrivo il parlato con Whisper")
            parole = self.trascrivi_tratti(segmenti, inizi[: len(segmenti)])
        self.avvisa("sottotitoli", f"scrivo {len(testi)} testi animati" + (f" e {len(parole)} parole di sottotitoli" if parole else ""))
        ass = self.scrivi_testi(testi, parole, totale)
        tagli = [(inizi[k], segmenti_tr[k].get("transizione_in") or "taglio_netto") for k in range(1, len(inizi))]
        punch = [inizi[k] for k, s in enumerate(segmenti) if s.get("effetto") == "punch_in"]
        self.avvisa("audio", "mix: suono delle clip, " + ("musica, " if (P.get("musica") or {}).get("file") else "") + "sound design e volume a −14 LUFS")
        self.mixa(video, ass, totale, segmenti, inizi, tagli, punch, out_finale)
        rep = self.revisiona(out_finale)
        rep["secondi_di_lavoro"] = round(time.time() - t0)
        self.avvisa("revisore", f"controllo: {rep['durata']}s · {rep['lufs']} LUFS · {rep['mb']} MB" + (" · ⚠ " + "; ".join(rep["problemi"]) if rep["problemi"] else " · tutto ok"))
        return rep


def copertina(sorgente, secondo, testo, dest, font_dir=None, colore_accento="#F2B84B"):
    """Copertina 1080x1920: fotogramma scelto (reframe al centro) + testo grande nella zona sicura della griglia 3:4."""
    from PIL import Image, ImageDraw, ImageFont, ImageEnhance
    p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0, secondo):.2f}", "-i", sorgente, "-frames:v", "1",
                        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
    import io
    im = Image.open(io.BytesIO(p.stdout)).convert("RGB") if p.stdout else Image.new("RGB", (W, H), (16, 20, 23))
    im = ImageEnhance.Brightness(im).enhance(0.82)
    if testo:
        d = ImageDraw.Draw(im)
        font_path = None
        for cand in ([os.path.join(font_dir, f) for f in sorted(os.listdir(font_dir))] if font_dir and os.path.isdir(font_dir) else []) + [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
            if cand.endswith(".ttf") and os.path.exists(cand):
                font_path = cand
                break
        parole, righe, dim = testo.upper().split(), [], 120
        f = ImageFont.truetype(font_path, dim) if font_path else ImageFont.load_default()
        riga = ""
        for w in parole:  # a capo entro 900 px di larghezza
            prova = (riga + " " + w).strip()
            if d.textlength(prova, font=f) > 900 and riga:
                righe.append(riga)
                riga = w
            else:
                riga = prova
        righe.append(riga)
        alt = dim * 1.12
        y = H / 2 - alt * len(righe) / 2
        for r in righe:  # centro della griglia 3:4 (y 240-1680): resta visibile in tutti i ritagli
            x = (W - d.textlength(r, font=f)) / 2
            d.text((x + 4, y + 5), r, font=f, fill=(0, 0, 0))
            d.text((x, y), r, font=f, fill=(255, 255, 255))
            y += alt
    im.save(dest, "JPEG", quality=90)
    return dest


def anteprima(video, dest, n=8):
    """Tavola di fotogrammi del reel finito (per vederlo al volo)."""
    d = Montatore.probe(video)["dur"]
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", f"fps={n}/{d:.3f},scale=270:-2,tile={n}x1:padding=6:color=black",
                    "-frames:v", "1", "-q:v", "3", dest], check=True)
    return dest


if __name__ == "__main__":
    import sys
    piano = json.load(open(sys.argv[1]))
    m = Montatore(piano)
    print(json.dumps(m.monta(sys.argv[2]), ensure_ascii=False, indent=1))
