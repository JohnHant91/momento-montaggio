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
import json, math, os, re, shutil, subprocess, tempfile, time, urllib.error, urllib.parse, urllib.request
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
        self.qc = []

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
        # cinema low-key caldo (alla "Nomads"): ombre profonde ma morbide, alte luci ambrate, marroni ricchi, verdi spenti
        # spot di prodotto: neri profondi, contrasto pieno, colori naturali e ricchi, nessuna dominante
        "spot_contrasto":     (1.20, 1.06, (0.00, 0.00, 0.01), (0.015, 0.005, -0.01), 0.00, 0.98, False),
        "moody_caldo":        (1.14, 0.95, (0.015, 0.005, -0.005), (0.06, 0.025, -0.06), 0.015, 0.93, False),
        # stili di montaggio (catalogo di Stella)
        "street_urbano":      (1.18, 0.80, (-0.02, 0.01, 0.04), (0.03, 0.02, -0.01), 0.02, 0.97, False),
        "emozionale_film":    (1.04, 0.85, (0.01, 0.01, 0.03), (0.05, 0.025, -0.03), 0.05, 0.95, False),
        "romantico_soft":     (0.92, 0.92, (0.03, 0.015, 0.02), (0.05, 0.03, 0.00), 0.07, 0.98, False),
        "amichevole_solare":  (1.06, 1.20, (0.00, 0.00, 0.00), (0.04, 0.02, -0.02), 0.00, 1.00, False),
        "natalizio_caldo":    (1.10, 1.08, (0.02, 0.00, -0.01), (0.08, 0.04, -0.05), 0.03, 0.97, False),
        "neon_notte":         (1.16, 1.15, (0.04, -0.02, 0.07), (0.05, -0.01, 0.06), 0.02, 0.97, False),
        "estate_luminosa":    (1.05, 1.22, (0.00, 0.01, 0.02), (0.05, 0.03, -0.03), 0.00, 1.00, False),
        "autunno_caldo":      (1.08, 0.92, (0.02, 0.01, -0.02), (0.08, 0.03, -0.06), 0.03, 0.96, False),
        "inverno_freddo":     (1.08, 0.88, (-0.01, 0.01, 0.05), (-0.01, 0.01, 0.04), 0.02, 0.98, False),
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
    def statistiche(quadri):
        """Colore medio dei toni medi (normalizzato) e luminosità mediana dei fotogrammi."""
        if not quadri:
            return None
        px = np.concatenate([q.reshape(-1, 3).astype(np.float32) for _, q in quadri])
        lum = px.mean(axis=1)
        medi = px[(lum > 20) & (lum < 235)]
        if len(medi) < 100:
            return None
        m = medi.mean(axis=0)
        return {"rgb": m / max(m.mean(), 1), "y": float(np.median(lum))}

    def riferimento(self, segmenti):
        """Shot matching: il colore e l'esposizione di riferimento sono la mediana di tutti i pezzi, così le clip
        sembrano girate nella stessa luce (prima ognuna veniva neutralizzata per conto suo e il reel 'saltava')."""
        def misura(s):
            vel = 0.5 if s.get("rallenty") else float(s.get("velocita", 1) or 1)
            q = self.fotogrammi(s["file"], float(s.get("in", 0)), max(0.3, float(s["durata"]) * vel), 3)
            return self.statistiche(q)
        with ThreadPoolExecutor(PARALLELO) as ex:
            st = [x for x in ex.map(misura, segmenti) if x]
        if len(st) < 2:
            return None
        rgb = np.median(np.array([x["rgb"] for x in st]), axis=0)
        y = float(np.clip(np.median([x["y"] for x in st]), 100, 118))  # luminoso sì, ma non lattiginoso
        self.report.append(f"color: riferimento comune per {len(st)} pezzi (luminosità {y:.0f}, dominante R{rgb[0]:.2f} G{rgb[1]:.2f} B{rgb[2]:.2f})")
        return {"rgb": rgb, "y": y}

    def correzione(self, quadri):
        """Bianco ed esposizione del pezzo portati verso il riferimento comune (o, senza riferimento, gray-world delicato)."""
        if not quadri:
            return ""
        px = np.concatenate([q.reshape(-1, 3).astype(np.float32) for _, q in quadri])
        lum = px.mean(axis=1)
        medi = px[(lum > 20) & (lum < 235)]  # esclude bruciati e neri
        if len(medi) < 100:
            return ""
        m = medi.mean(axis=0)
        rif = getattr(self, "rif_colore", None)
        if rif is not None:
            gain = np.clip(rif["rgb"] / np.maximum(m / max(m.mean(), 1), 0.01), 0.86, 1.14)
            gain = 1 + (gain - 1) * 0.85
            y_target = max(rif["y"], 106)
        else:
            gain = np.clip(m.mean() / np.maximum(m, 1), 0.88, 1.12)
            gain = 1 + (gain - 1) * 0.7  # correzione delicata: non deve ammazzare il look naturale della luce
            y_target = 112
        y = float(np.median(lum))
        # regola di Johnny: reel LUMINOSI e COLORATI. Livelli: il nero vero del pezzo va a 0 e il suo punto più chiaro
        # quasi a 255, poi una gamma che porta i mezzitoni a ~118. (Prima la gamma era calcolata al contrario: le clip
        # scure venivano scurite ancora.)
        # il punto più scuro del pezzo diventa nero vero (prima solo se era già sotto 20: i neri restavano grigi)
        lo, hi = min(float(np.percentile(lum, 0.3)), 48.0), max(float(np.percentile(lum, 99.5)), 90.0)
        yn = (y - lo) / max(1.0, hi - lo)
        esp = math.log(max(yn, 0.03)) / math.log(max(y_target, 60) / 255)  # >1 = schiarire
        gamma = float(np.clip(esp, 0.85, 2.0)) if 3 < y < 245 else 1.0  # oltre 2 la grana del sensore esplode
        livelli = f"colorlevels=rimin={lo / 255:.3f}:gimin={lo / 255:.3f}:bimin={lo / 255:.3f}:rimax={hi / 255:.3f}:gimax={hi / 255:.3f}:bimax={hi / 255:.3f},"
        filtro = f"colorchannelmixer=rr={gain[0]:.3f}:gg={gain[1]:.3f}:bb={gain[2]:.3f},{livelli}eq=gamma={gamma:.3f}:saturation=1.22"
        # sempre un piede nelle ombre: neri densi, mezzitoni dove sono (più deciso se la clip è stata aperta molto)
        # la gamma che apre una clip buia alza soprattutto le ombre (neri grigi): le riporto giù in proporzione
        f = float(np.clip((gamma - 1.0) / 1.0, 0.0, 1.0))
        filtro += (f",curves=all='0/0 0.1/{0.07 - 0.04 * f:.3f} 0.2/{0.18 - 0.1 * f:.3f} 0.4/{0.39 - 0.07 * f:.3f} 0.6/{0.6 - 0.015 * f:.3f} 0.8/0.8 1/1'")
        # sovraesposizione: tante zone quasi bianche o immagine troppo chiara -> curva che recupera le alte luci
        bruciati = float((lum > 240).mean())
        p98 = float(np.percentile(lum, 98))
        if bruciati > 0.015 or p98 > 248 or y > 150:
            k = float(np.clip(max(bruciati * 2.5, (y - 130) / 400, (p98 - 235) / 150), 0.04, 0.18))
            filtro += (f",curves=all='0/0 0.25/{0.25 - k * 0.3:.3f} 0.5/{0.5 - k * 0.8:.3f} 0.75/{0.75 - k:.3f} 0.9/{0.88 - k:.3f} 1/{0.96 - k * 0.5:.3f}'")
        # neri lavati: un po' di profondità
        p2 = float(np.percentile(lum, 2)) - lo
        if p2 > 28 and gamma < 1.3:
            filtro += f",curves=all='{min(p2 - 10, 40) / 255:.3f}/0 1/1'"
        return filtro

    def filtro_colore(self, lut):
        """LUT da pellicola/grading scelta dal colorist (libreria G'MIC) al posto del look generato, se c'è."""
        if self.p.get("lut"):
            try:
                import lut as LUTLIB
                L = self.p["lut"]
                f = LUTLIB.filtro(L.get("nome"), L.get("intensita"), L.get("pacchetto"), L.get("file"), L.get("bn"))
                if f:
                    if not getattr(self, "_lut_detta", False):
                        self._lut_detta = True
                        self.report.append(f"color: LUT {L.get('nome')} al {float(L.get('intensita') or 0.7) * 100:.0f}%")
                    return f
            except Exception as e:
                self.report.append(f"LUT {self.p['lut'].get('nome')} non disponibile ({e}): uso il look {self.p.get('look')}")
                self.p["lut"] = None
        return f"lut3d='{lut}'"

    def nero_lut(self):
        """Le LUT da pellicola alzano il nero (effetto 'sbiadito'): misuro dove finisce il nero e lo riporto a zero."""
        if not self.p.get("lut"):
            return ""
        if not hasattr(self, "_nero_lut"):
            self._nero_lut = ""
            try:
                import lut as LUTLIB
                L = self.p["lut"]
                f = LUTLIB.file_lut(L.get("nome"), L.get("pacchetto"), L.get("file"))
                k = float(L.get("intensita") or 0.7)
                for riga in open(f):
                    v = riga.split()
                    if len(v) == 3:
                        try:
                            n = [float(x) * k for x in v]
                            break
                        except ValueError:
                            continue
                m = max(0.0, min(n))
                if m > 0.008:
                    self._nero_lut = f"colorlevels=rimin={n[0]:.3f}:gimin={n[1]:.3f}:bimin={n[2]:.3f}"
                    self.report.append(f"color: la LUT alzava il nero a {m * 255:.0f}/255, riportato a 0")
            except Exception:
                pass
        return self._nero_lut

    def movimento_camera(self, src, t_in, durata):
        """Tremolio (scatti ad alta frequenza, in px su 160 di larghezza) e deriva (spostamento totale / larghezza)."""
        info = self.probe(src)
        w = 160
        h = int(round(w * info["h"] / max(1, info["w"]) / 2) * 2) if info["w"] else 284
        p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t_in:.3f}", "-t", f"{max(durata, 0.3):.3f}", "-i", src,
                            "-vf", f"fps=15,scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True)
        dati = np.frombuffer(p.stdout, dtype=np.uint8)
        nf = dati.size // (w * h)
        if nf < 4:
            return {"tremolio": 0.0, "deriva": 0.0}
        g = list(dati[: nf * w * h].reshape(nf, h, w).astype(np.float32))
        fin = np.outer(np.hanning(h), np.hanning(w))
        spost = []
        for a, b in zip(g, g[1:]):
            A = np.fft.fft2((a - a.mean()) * fin)
            B = np.fft.fft2((b - b.mean()) * fin)
            R = A * np.conj(B)
            r = np.abs(np.fft.ifft2(R / (np.abs(R) + 1e-6)))
            y, x = np.unravel_index(np.argmax(r), r.shape)
            spost.append((x if x < w // 2 else x - w, y if y < h // 2 else y - h))
        s = np.array(spost, dtype=np.float32)
        if len(s) >= 3:
            liscio = np.array([s[max(0, k - 1):k + 2].mean(axis=0) for k in range(len(s))])
            tremolio = float(np.abs(s - liscio).mean())
        else:
            tremolio = 0.0
        deriva = float(np.hypot(*s.sum(axis=0)) / w)
        return {"tremolio": tremolio, "deriva": deriva}

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
        su = f"scale={W * 2}:{H * 2}:flags=bicubic,"  # zoompan arrotonda ai pixel: lavorare al doppio elimina gli scatti

        def zoom(z):
            return su + f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"
        if effetto in ("slider_dx", "slider_sx"):  # carrello laterale lento, come una slitta
            a, b = (0.15, 0.85) if effetto == "slider_dx" else (0.85, 0.15)
            return su + (f"zoompan=z='1.10':x='(iw-iw/zoom)*({a}+({b - a})*min(1,{tt}/{d:.2f}))':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}")
        if effetto == "dolly_in":  # avvicinamento morbido e continuo (spot di prodotto)
            return zoom(f"1+0.06*{tt}/{d:.2f}")
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
            # 50 fps a 0,6x = 30 fps veri (a 0,5x sarebbero 25 fps e il 30 fps duplicherebbe fotogrammi: scatti)
            # rallenty vero solo sul girato a 48 fps o più; sotto, niente fotogrammi inventati (deformano l'immagine): al massimo 0,8x
            vel = min(vel, max(0.5, FPS / info["fps"])) if info["fps"] >= 45 else 1.0
        if info["fps"] < 45 and vel < 1:
            vel = 1.0  # sul girato a 24-30 fps un rallentamento ripete i fotogrammi: l'immagine scatta
        sorgente = dur * vel  # secondi di girato che servono
        t_in = max(0.0, min(float(s.get("in", 0)), max(0.0, info["dur"] - sorgente - 0.05)))
        out = os.path.join(self.tmp, f"pezzo_{i:02d}.mp4")
        # cerco nei dintorni il tratto di girato più fermo (i tagli non devono cadere su uno scatto di camera)
        if not s.get("in_preciso") and not s.get("zoom_fisso") and info["dur"] - sorgente > 0.6:
            t_in = self.finestra_stabile(i, src, t_in, sorgente, info["dur"])

        quadri = self.fotogrammi(src, t_in, max(sorgente, 0.2), 6)
        corr = self.correzione(quadri)
        filtri = []
        # stabilizzazione: misuro il movimento della camera (tremolio e spostamento) e scelgo come fermarla
        ferma = bool(self.p.get("camera_ferma"))
        if ferma:  # stile "camera ferma": nessun movimento, né aggiunto né del girato
            s["effetto"] = "nessuno"
        stab = True if (self.p.get("stabilizza_tutto") or ferma) else s.get("stabilizza", "auto")
        cam = self.movimento_camera(src, t_in, sorgente)
        if stab == "auto":
            stab = cam["tremolio"] > 0.6 and s.get("effetto") not in ("shake",)
        if (cam["tremolio"] > 0.35 or (cam["deriva"] > 0.06 and cam["tremolio"] > 0.2)) and s.get("effetto") in ("dolly_in", "slider_dx", "slider_sx", "zoom_lento", "zoom_out"):
            # camera a mano: un movimento finto sopra lo renderebbe scattoso
            self.report.append(f"pezzo {i + 1}: niente movimento aggiunto (camera a mano)")
            s["effetto"] = "nessuno"
        trf = os.path.join(self.tmp, f"stab_{i}.trf")
        # vidstab sul motore GitHub (ffmpeg 8) rovina l'immagine: fotogrammi a chiazze, mani "trascinate", scatti.
        # Verificato su una clip vera: senza stabilizzazione il pezzo è pulito. I tratti mossi li evita la scelta del
        # tratto fermo e le clip troppo mosse vengono sostituite con altre riprese.
        if stab is True and not os.environ.get("STABILIZZA_VIDSTAB"):
            stab = False
            self.report.append(f"pezzo {i + 1}: niente stabilizzazione (rovinava l'immagine)")
        if stab is True:
            try:
                self.ff(["-ss", f"{t_in:.3f}", "-t", f"{sorgente + 0.2:.3f}", "-i", src, "-vf",
                         f"vidstabdetect=shakiness=8:accuracy=10:stepsize=8:mincontrast=0.2:result={trf}", "-f", "null", "-"], "stabilizza")
                a_mano = bool(self.p.get("camera_a_mano"))  # stile street: tolgo il tremolio ma tengo la camera viva
                if cam["deriva"] < 0.01 and cam["tremolio"] < 0.5 and not a_mano:  # solo se era quasi ferma: il treppiede finto salta
                    filtri.append(f"vidstabtransform=input={trf}:tripod=1:maxangle=0:optzoom=1:interpol=bicubic")
                    modo = "bloccata come su treppiede" + (f", la ripresa si spostava del {cam['deriva'] * 100:.0f}%" if cam["deriva"] >= 0.025 else "")
                else:  # movimento voluto: lo tengo ma lo rendo morbido (finestra di ~1,2 s)
                    sm = int(min(80, max(20, info["fps"] * (0.5 if a_mano else 1.2))))
                    filtri.append(f"vidstabtransform=input={trf}:smoothing={sm}:maxangle=0:optzoom=1:interpol=bicubic")
                    modo = "movimento ammorbidito"
                self.report.append(f"pezzo {i + 1}: stabilizzato ({modo}, tremolio {cam['tremolio']:.2f})")
            except RuntimeError:
                pass
        # reframe 9:16 che segue il soggetto (panoramica lineare dentro il pezzo)
        sw, sh = info["w"] or W, info["h"] or H
        if sw / sh > W / H + 0.02:
            centri = [float(s["centro_x"])] if s.get("centro_x") is not None else (self.centro_soggetto(quadri) if quadri else [0.5])  # centro_x: oggetto su cui va l'attenzione
            c0, c1 = float(np.mean(centri[: max(1, len(centri) // 2)])), float(np.mean(centri[len(centri) // 2:] or centri))
            if abs(c1 - c0) < 0.06:
                c0 = c1 = (c0 + c1) / 2
            cw = sh * W / H
            x0 = min(max(0, c0 * sw - cw / 2), sw - cw)
            x1 = min(max(0, c1 * sw - cw / 2), sw - cw)
            durv = max(dur, 0.1)
            filtri.append(f"crop=w={int(cw) // 2 * 2}:h={sh}:x='{x0:.1f}+({x1 - x0:.1f})*min(1,t/{durv * vel:.3f})':y=0")
            self.report.append(f"pezzo {i + 1}: reframe {('fisso' if x0 == x1 else 'con panoramica')} sul soggetto")
        zf = s.get("zoom_fisso") or {}
        if float(zf.get("z") or 1) > 1.01:
            # avvicinamento su un dettaglio (es. solo i chicchi): ritaglio a piena risoluzione del girato, prima di ridurre
            z, cx, cy = float(zf["z"]), float(zf.get("cx", 0.5)), float(zf.get("cy", 0.5))
            filtri.append(f"crop=w='trunc(iw/{z:.3f}/2)*2':h='trunc(ih/{z:.3f}/2)*2':x='max(0,min(iw-ow,iw*{cx:.3f}-ow/2))':y='max(0,min(ih-oh,ih*{cy:.3f}-oh/2))'")
            self.report.append(f"pezzo {i + 1}: avvicinato {z:.1f}x sul dettaglio")
        filtri.append(f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}")
        # velocità: rallenty vero se il girato è a 50/60 fps, altrimenti fotogrammi intermedi ricostruiti
        if abs(vel - 1) > 0.01:
            filtri.append(f"setpts=PTS/{vel:.4f}")
        filtri.append(f"fps={FPS}")
        mov = self.movimento(s.get("effetto", ""), dur)
        if mov:
            filtri.append(mov)
        # pulizia della grana PRIMA di schiarire: più il pezzo era buio (gamma alta), più rumore del sensore viene fuori
        mg = re.search(r"eq=gamma=([0-9.]+)", corr or "")  # i pezzi vanno in parallelo: la gamma la leggo dal filtro del pezzo
        g = float(mg.group(1)) if mg else 1.0
        dn = "hqdn3d=1.5:1.5:3:3" if g <= 1.15 else "hqdn3d=2.5:2:5:4" if g <= 1.5 else "hqdn3d=3.5:3:6:5"
        filtri.append(dn)
        if g > 1.15:
            self.report.append(f"pezzo {i + 1}: grana pulita (era buio, schiarito con gamma {g:.2f})")
        if corr:
            filtri.append(corr)
        filtri.append(self.filtro_colore(lut))
        nl = self.nero_lut()
        if nl:
            filtri.append(nl)
        # rifinitura da consegna: nitidezza leggera solo sulla luminanza (sui pezzi schiariti di meno: riaccenderebbe la grana)
        filtri.append("unsharp=5:5:0.35:5:5:0" if g <= 1.15 else "unsharp=5:5:0.2:5:5:0")
        if "glow" in globali:  # alone luminoso morbido (romantico, natalizio)
            filtri.append("split[ga][gb];[gb]gblur=sigma=22[gg];[ga][gg]blend=all_mode=screen:all_opacity=0.18")
        if "vhs" in globali:  # videocassetta: colori sbavati, morbidezza, rumore e leggero tremolio di righe
            filtri.append("rgbashift=rh=4:bh=-4,gblur=sigma=0.8,noise=alls=10:allf=t+u,eq=saturation=1.15:contrast=0.95")
        if "grana" in globali:
            filtri.append("noise=alls=6:allf=t")
        if "vignettatura" in globali and not self.p.get("luminoso", True):  # regola di Johnny: reel luminosi, niente bordi scuri
            filtri.append("vignette=PI/5")
        filtri.append(f"trim=duration={dur:.3f},setpts=PTS-STARTPTS,setsar=1,format=yuv420p")
        tentativi = [filtri, [f for f in filtri if not f.startswith(("vidstab", "minterpolate"))],
                     [f if not f.startswith("split[lua]") else f"lut3d='{lut}'" for f in filtri if not f.startswith(("vidstab", "minterpolate"))]]
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
        # controllo qualità del pezzo montato: se trema ancora lo segnalo al revisore
        try:
            dopo = self.movimento_camera(out, 0, dur)
            if dopo["tremolio"] > 0.6 and s.get("effetto") != "shake":
                self.qc.append(f"pezzo {i + 1} trema ancora (tremolio {dopo['tremolio']:.2f}): meglio un'altra clip")
        except Exception:
            pass
        if dur < 0.35:
            self.qc.append(f"pezzo {i + 1} dura solo {dur:.2f}s (sembra un errore di taglio)")
        return out

    def finestra_stabile(self, i, src, t_in, sorgente, durata_clip):
        """Prova il tratto richiesto e quelli spostati di ±0,4/0,8 s: tiene il più fermo, solo se è nettamente meglio."""
        def punteggio(t):
            m = self.movimento_camera(src, t, sorgente)
            return m["tremolio"] + 8 * m["deriva"]
        candidati = [t_in] + [t_in + d for d in (-0.4, 0.4, -0.8, 0.8) if 0 <= t_in + d <= durata_clip - sorgente - 0.05]
        try:
            punti = [(punteggio(t), t) for t in candidati]
        except Exception:
            return t_in
        base = punti[0][0]
        migliore = min(punti)
        if migliore[1] != t_in and migliore[0] < base * 0.7 and base > 0.25:
            self.report.append(f"pezzo {i + 1}: spostato di {migliore[1] - t_in:+.1f}s sul tratto più fermo")
            return migliore[1]
        return t_in

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
        # stessi parametri per tutti i pezzi (xfade si ferma in silenzio se time base o fps non coincidono)
        for k in range(len(pezzi)):
            fc.append(f"[{k}:v]fps={FPS},settb=1/{FPS},setpts=PTS-STARTPTS,scale={W}:{H},setsar=1,format=yuv420p[n{k}]")
        inizi, totale, prev = [0.0], dur[0], "[n0]"
        for k in range(1, len(pezzi)):
            nome = segmenti[k].get("transizione_in") or "taglio_netto"
            if nome == "taglio_netto" or nome not in self.TRANS:
                # taglio secco: concat (un xfade da un fotogramma tronca il video dopo il primo pezzo)
                fc.append(f"{prev}[n{k}]concat=n=2:v=1:a=0,settb=1/{FPS}[x{k}]")
                inizi.append(totale)
                totale += dur[k]
            else:
                tr, td = self.TRANS[nome]
                td = min(td, dur[k] * 0.4, dur[k - 1] * 0.4)
                fc.append(f"{prev}[n{k}]xfade=transition={tr}:duration={td:.3f}:offset={totale - td:.3f},settb=1/{FPS}[x{k}]")
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
            base = "https://fonts.googleapis.com/css2?family=" + urllib.parse.quote(famiglia)
            ttf = None
            for suff in (f":wght@{peso}", ":wght@700", ":wght@600", ":wght@400", ""):  # non tutti i font hanno tutti i pesi
                try:
                    css = urllib.request.urlopen(urllib.request.Request(base + suff, headers={"user-agent": "Mozilla/4.0"}), timeout=30).read().decode()
                except urllib.error.HTTPError:
                    continue
                ttf = re.search(r"url\((https://[^)]+\.ttf)\)", css)
                if ttf:
                    break
            if not ttf:
                raise RuntimeError("font non trovato su Google Fonts")
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
        pos_y = {"alto": 420, "centro": 900, "terzo_inferiore": 1120}  # zona sicura Reel: 220-1470, pulsanti a destra da 1220
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
            col_t = f"\\c{self.ass_colore(t['colore'])}" if t.get("colore") else ""
            if stile == "nessun_testo":
                continue
            if stile == "etichetta_box":
                ev.append(f"Dialogue: 2,{self.tempo_ass(a)},{self.tempo_ass(b)},Box,,0,0,0,,{{\\an5\\pos(540,{y})\\fad(120,150)\\fscx80\\fscy80\\t(0,180,\\fscx100\\fscy100)}}{testo}")
            elif stile == "sottotitolo_classico":
                ev.append(f"Dialogue: 2,{self.tempo_ass(a)},{self.tempo_ass(b)},Classico,,0,0,0,,{{\\fad(150,150){col_t}}}{testo}")
            else:  # titolo grande: parole che entrano una alla volta con un piccolo "pop", la parola chiave in colore
                parole_t = testo.split()
                chiave = (t.get("evidenzia") or "").lower()
                pezzi = []
                for k, w in enumerate(parole_t):
                    t0 = int(k * (90 if anim != "dissolvi" else 0))
                    colore = f"\\c{acc}" if chiave and chiave in w.lower() else ""
                    pezzi.append(f"{{\\alpha&HFF&{colore}\\t({t0},{t0 + 160},\\alpha&H00&)\\fscx70\\fscy70\\t({t0},{t0 + 200},\\fscx104\\fscy104)\\t({t0 + 200},{t0 + 300},\\fscx100\\fscy100)}}{w}{{\\c{self.ass_colore(t['colore']) if t.get('colore') else bianco}}}")
                ev.append(f"Dialogue: 3,{self.tempo_ass(a)},{self.tempo_ass(b)},Titolo,,0,0,0,,{{\\an5\\pos(540,{y})\\fad(0,220){col_t}}}{' '.join(pezzi)}")
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
        # 1) mix audio a parte (senza normalizzare)
        mixwav = os.path.join(self.tmp, "mix.wav")
        if mix:
            filt.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,apad,atrim=duration={totale:.3f},aformat=sample_rates=48000:channel_layouts=stereo[aout]")
            self.ff(args + ["-filter_complex", ";".join(filt), "-map", "[aout]", "-vn", "-t", f"{totale:.3f}", "-c:a", "pcm_s16le", mixwav], "mix audio")
        else:
            self.ff(["-f", "lavfi", "-t", f"{totale:.3f}", "-i", "anullsrc=r=48000:cl=stereo", "-c:a", "pcm_s16le", mixwav], "silenzio")
        self.finale(video, ass, mixwav, totale, out)

    def finale(self, video, ass, mixwav, totale, out, normalizza=True):
        """Volume a −14 LUFS (loudnorm a due passaggi: il passaggio singolo sbaglia sui mix con molte pause), testi bruciati, encode finale."""
        norm = "anull"
        p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", mixwav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True)
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr)
        if m and normalizza:
            mis = json.loads(m.group(0))
            if mis.get("input_i") not in ("-inf", None) and float(mis["input_i"]) > -60:
                norm = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={mis['input_i']}:measured_TP={mis['input_tp']}:measured_LRA={mis['input_lra']}:"
                        f"measured_thresh={mis['input_thresh']}:offset={mis['target_offset']}:linear=true,aresample=48000")
        rate = max(8.0, min(16.0, 560 / max(totale, 1)))  # Mbit/s: master di qualità (IG ricomprime: più parte pulito, meglio esce); resta sotto ~75 MB
        self.ff(["-i", video, "-i", mixwav, "-filter_complex", f"[0:v]ass='{ass}':fontsdir='{self.fontdir}'[vout];[1:a]{norm}" + (f",afade=t=out:st={totale - getattr(self, 'fine_nero', 0) - 0.3:.3f}:d={getattr(self, 'fine_nero', 0) + 0.3:.3f}" if getattr(self, "fine_nero", 0) else "") + "[aout]",
                 "-map", "[vout]", "-map", "[aout]", "-t", f"{totale:.3f}",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-tune", "film", "-x264-params", "aq-mode=3", "-profile:v", "high", "-maxrate", f"{rate:.1f}M", "-bufsize", f"{rate * 4:.1f}M",
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
        q = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-count_packets", "-show_entries", "stream=nb_read_packets",
                            "-of", "csv=p=0", out], capture_output=True, text=True)
        try:
            dur_video = int(q.stdout.strip().split(",")[0]) / FPS
        except ValueError:
            dur_video = 0
        if dur_video < info["dur"] - 0.5:
            raise RuntimeError(f"il video finisce a {dur_video:.1f}s ma l'audio dura {info['dur']:.1f}s: montaggio incompleto, non lo consegno")
        neri = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", p.stderr)
        chiusura = self.p.get("chiusura") or {}
        fine_video = info["dur"] - (float(chiusura.get("durata", 0)) if chiusura else 0)
        neri = [(float(a), float(b)) for a, b in neri if float(a) < fine_video - 0.2]
        if neri:
            problemi.append("fotogrammi neri a " + ", ".join(f"{a:.1f}s" for a, _ in neri[:3]))
        lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)
        lufs = float(lufs[-1]) if lufs else None
        if lufs is not None and lufs > -60 and abs(lufs + 14) > 2.5 and not getattr(self, "senza_voce", False):
            problemi.append(f"volume {lufs:.1f} LUFS (atteso −14)")
        mb = os.path.getsize(out) / 1048576
        if mb > 95:
            problemi.append(f"file troppo pesante per l'archivio ({mb:.0f} MB, max 95)")
        # alte luci bruciate dopo il color (8 fotogrammi campione)
        try:
            coda = 3.0 if (self.p.get("finale") or "").lower() == "bianco" else float((self.p.get("chiusura") or {}).get("durata", 0) or 0) + 0.3
            q = self.fotogrammi(out, 0.3, max(0.5, info["dur"] - coda - 0.3), 8)
            brucia = [(tt, float((qq.mean(axis=2) > 250).mean())) for tt, qq in q]
            peggio = [f"{tt:.1f}s" for tt, b in brucia if b > 0.04]
            if peggio:
                problemi.append("alte luci bruciate a " + ", ".join(peggio[:3]))
        except Exception:
            pass
        problemi += getattr(self, "qc", [])
        return {"durata": round(info["dur"], 2), "lufs": lufs, "mb": round(mb, 1), "problemi": problemi, "note": self.report}

    def chiusura_bianca(self, video, totale):
        """L'ultima immagine sfuma nel bianco, poi compare piano il logo del cliente (se c'è)."""
        logo = (self.p.get("logo") or {}).get("file")
        mus = self.p.get("musica") or {}
        resto = float(mus.get("durata") or 0) - totale if mus.get("file") else 0
        dc = float(np.clip(resto, 2.4, 4.0)) if resto > 0 else 3.0  # la chiusura usa la musica che avanza
        df = 0.9
        v1 = os.path.join(self.tmp, "verso_bianco.mp4")
        self.ff(["-i", video, "-vf", f"fade=t=out:st={totale - df:.3f}:d={df:.3f}:color=white"] + X264_INT + [v1], "sfumo al bianco")
        card = os.path.join(self.tmp, "card_logo.mp4")
        if logo:
            self.ff(["-f", "lavfi", "-i", f"color=c=white:s={W}x{H}:r={FPS}:d={dc:.3f}", "-loop", "1", "-t", f"{dc:.3f}", "-i", logo,
                     "-filter_complex", f"[1:v]scale=640:-1,format=rgba,fade=t=in:st=0.35:d=1.0:alpha=1[l];[0:v][l]overlay=(W-w)/2:(H-h)/2-40:format=auto,format=yuv420p[v]",
                     "-map", "[v]", "-t", f"{dc:.3f}"] + X264_INT + [card], "logo")
        else:
            self.ff(["-f", "lavfi", "-i", f"color=c=white:s={W}x{H}:r={FPS}:d={dc:.3f}", "-vf", "format=yuv420p"] + X264_INT + [card], "bianco")
        lista = os.path.join(self.tmp, "fine.txt")
        with open(lista, "w") as f:
            f.write(f"file '{v1}'\nfile '{card}'\n")
        out = os.path.join(self.tmp, "video_chiusura.mp4")
        self.ff(["-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", out], "chiusura")
        self.report.append("chiusura: sfumato al bianco" + (" con il logo" if logo else " (logo non trovato)"))
        return out, totale + dc

    def aggancia_ai_battiti(self, segmenti):
        """Con una musica: ogni taglio cade su un battito (griglia a mezza battuta), dentro i limiti del girato."""
        mus = self.p.get("musica") or {}
        if not mus.get("battuta") or not mus.get("file"):
            return
        mezza = float(mus["battuta"]) / 2
        primo = float(mus.get("primo_battito") or 0) % mezza
        cum, spostati = 0.0, 0
        for k, s in enumerate(segmenti):
            vel = 0.5 if s.get("rallenty") else float(s.get("velocita", 1) or 1)
            dispon = max(0.3, (s["_info"]["dur"] - 0.05) / vel)
            target = cum + float(s["durata"])
            passi = max(1, round((target - primo) / mezza))
            fine = primo + passi * mezza
            while fine - cum < max(0.6, mezza) and fine - cum < dispon:
                fine += mezza
            while fine - cum > dispon and fine - mezza - cum >= 0.4:
                fine -= mezza
            nuova = round(fine - cum, 3)
            if abs(nuova - float(s["durata"])) > 0.02:
                spostati += 1
            s["durata"] = nuova
            cum = fine
        # il reel finisce a fine battuta (4 tempi): la musica chiude la frase invece di essere tagliata a metà
        batt = float(mus["battuta"]) * 4
        p0 = float(mus.get("primo_battito") or 0)
        if segmenti and batt > 0:
            s = segmenti[-1]
            vel = 0.5 if s.get("rallenty") else float(s.get("velocita", 1) or 1)
            dispon = max(0.3, (s["_info"]["dur"] - 0.05) / vel)
            inizio_ult = cum - float(s["durata"])
            for fine in sorted([p0 + k * batt for k in (math.floor((cum - p0) / batt), math.ceil((cum - p0) / batt))], key=lambda f: abs(f - cum)):
                if 0.8 <= fine - inizio_ult <= dispon:
                    if abs(fine - cum) > 0.02:
                        s["durata"] = round(fine - inizio_ult, 3)
                        self.report.append(f"finale allineato alla fine della battuta musicale ({fine:.2f}s)")
                    break
        self.report.append(f"musica a {float(mus.get('bpm') or 0):.0f} BPM: {spostati} tagli spostati sul battito")

    # -------------------------------------------------------------- regia del montaggio
    def monta(self, out_finale):
        t0 = time.time()
        P = self.p
        segmenti = [dict(s) for s in P["segmenti"]]
        for s in segmenti:
            s["_info"] = self.probe(s["file"])
        self.aggancia_ai_battiti(segmenti)
        self.qc = []
        self.avvisa("color", f"preparo il look {P.get('look', 'naturale_vivace')} e porto i {len(segmenti)} pezzi alla stessa luce (shot matching)")
        try:
            self.rif_colore = self.riferimento(segmenti)
        except Exception:
            self.rif_colore = None
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
        finale = (P.get("finale") or ("nero" if not P.get("chiusura") else "")).lower()
        apertura = (P.get("apertura") or ("bianco" if finale == "bianco" else "")).lower()
        if apertura in ("bianco", "nero"):  # il reel nasce dal bianco (o dal nero), come si chiude
            v2 = os.path.join(self.tmp, "video_apertura.mp4")
            self.ff(["-i", video, "-vf", f"fade=t=in:st=0:d=0.6:color={'white' if apertura == 'bianco' else 'black'}"] + X264_INT + [v2], "apertura")
            video = v2
        if finale == "bianco":
            video, totale = self.chiusura_bianca(video, totale)
        if finale == "nero":  # chiusura cinematografica: l'ultima immagine scende al nero
            v2 = os.path.join(self.tmp, "video_finale.mp4")
            dn = min(1.0, max(0.5, totale * 0.04))
            self.ff(["-i", video, "-vf", f"fade=t=out:st={totale - dn:.3f}:d={dn:.3f}"] + X264_INT + [v2], "finale a nero")
            video = v2
            self.fine_nero = dn
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
            hx = (c.get("colore") or "#101417").lstrip("#")[:6].ljust(6, "0")
            lum = (0.2126 * int(hx[0:2], 16) + 0.7152 * int(hx[2:4], 16) + 0.0722 * int(hx[4:6], 16)) / 255
            col_chiusura = "#1A1A1A" if lum > 0.6 else None  # sfondo chiaro → testo scuro, sempre leggibile
            if c.get("testo"):
                testi.append({"da": a, "a": totale, "testo": c["testo"], "stile": "titolo_grande_centrale", "posizione": "centro", "evidenzia": c.get("evidenzia"), "colore": col_chiusura})
            if c.get("sottotesto"):
                testi.append({"da": a + 0.35, "a": totale, "testo": c["sottotesto"], "stile": "sottotitolo_classico", "colore": col_chiusura})
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
