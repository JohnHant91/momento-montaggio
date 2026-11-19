#!/usr/bin/env python3
"""Formati di reel oltre al montaggio classico (motore/montatore.py).

  TalkingHead  → una persona che parla in camera: tolgo i silenzi, punch zoom a ogni frase, sottotitoli grandi con il
                 riquadro che scorre di parola in parola, la prima frase come gancio grande sopra la testa (con "boom"),
                 testi sempre fuori dal viso e dentro le zone sicure, b-roll sulle parole chiave, grade leggero, CTA.
  Carosello    → le slide di un carosello diventano un reel: ogni slide intera su una copia sfocata di se stessa, barre di
                 avanzamento in stile storie, push-in lento, transizioni a spinta con whoosh e tick, gancio e CTA.

Il Regista (Rocco) sceglie il formato nel piano: "formato": "montaggio" | "talking_head" | "carosello".
"""
import json, math, os, re, subprocess, time
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from montatore import Montatore, W, H, FPS, X264_INT, PARALLELO

# zone sicure di Instagram: sopra ~250 px e sotto ~350 px ci sono nome, caption e pulsanti
SICURO_ALTO, SICURO_BASSO = 250, H - 350
FOTOGRAMMA = 1 / FPS


def a_griglia(t):
    """Tempi allineati ai fotogrammi: i pezzi si concatenano senza perdere sincronia tra audio e video."""
    return round(t * FPS) / FPS


def norm(w):
    return re.sub(r"[^\wàèéìòù']", "", str(w).lower())


class _Base(Montatore):
    def misura_font(self, famiglia, peso, dim_ass):
        """Larghezza delle parole come le disegna libass (serve per far scorrere il riquadro sotto la parola giusta)."""
        from PIL import ImageFont
        f = os.path.join(self.fontdir, re.sub(r"\W+", "", famiglia) + f"-{peso}.ttf")
        if not os.path.exists(f):
            cand = [os.path.join(self.fontdir, x) for x in sorted(os.listdir(self.fontdir)) if x.endswith(".ttf")]
            f = cand[0] if cand else "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        prova = ImageFont.truetype(f, 200)
        asc, desc = prova.getmetrics()
        em = dim_ass * 200 / max(1, asc + desc)  # libass: dimensione = altezza della riga (ascendente + discendente)
        fnt = ImageFont.truetype(f, max(8, int(round(em))))
        return lambda testo: fnt.getlength(testo)

    @staticmethod
    def rettangolo(w, h, r=18):
        """Rettangolo arrotondato come disegno ASS (in pixel)."""
        r = min(r, w / 2, h / 2)
        k = r * 0.45
        return (f"m {r:.0f} 0 l {w - r:.0f} 0 b {w - k:.0f} 0 {w:.0f} {k:.0f} {w:.0f} {r:.0f} l {w:.0f} {h - r:.0f} "
                f"b {w:.0f} {h - k:.0f} {w - k:.0f} {h:.0f} {w - r:.0f} {h:.0f} l {r:.0f} {h:.0f} b {k:.0f} {h:.0f} 0 {h - k:.0f} 0 {h - r:.0f} "
                f"l 0 {r:.0f} b 0 {k:.0f} {k:.0f} 0 {r:.0f} 0")

    def intestazione_ass(self, stili):
        return ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\n"
                "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                + "".join(f"Style: {s}\n" for s in stili) + "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")

    def mix_sfx(self, base_wav, eventi, totale, out_wav, vol_base=1.0):
        """Mette gli effetti sonori sopra una traccia (voce o silenzio)."""
        args = ["-i", base_wav]
        filt = [f"[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol_base:.2f}[b]"]
        mix = ["[b]"]
        for n, (tipo, t, vol) in enumerate(eventi):
            args += ["-i", self.sfx(tipo)]
            ms = max(0, int(t * 1000))
            filt.append(f"[{n + 1}:a]volume={vol:.2f},adelay={ms}|{ms}[s{n}]")
            mix.append(f"[s{n}]")
        filt.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,apad,atrim=duration={totale:.3f}[a]")
        self.ff(args + ["-filter_complex", ";".join(filt), "-map", "[a]", "-c:a", "pcm_s16le", "-ar", "48000", out_wav], "effetti sonori")
        return out_wav

    def sfx(self, tipo):
        path = os.path.join(self.tmp, f"sfx_{tipo}.wav")
        if tipo in ("boom", "tick", "pop") and not os.path.exists(path):
            src, af = {
                "boom": ("sine=f=48:d=0.9", "afade=t=out:st=0.05:d=0.85,volume=1.1,aecho=0.7:0.5:60|120:0.35|0.2,lowpass=f=300"),
                "tick": ("sine=f=2400:d=0.05", "afade=t=out:st=0.005:d=0.045,volume=0.35"),
                "pop": ("sine=f=900:d=0.08", "afade=t=out:st=0.01:d=0.07,volume=0.25"),
            }[tipo]
            self.ff(["-f", "lavfi", "-i", src, "-af", af, "-ar", "48000", "-ac", "2", path], f"sfx {tipo}")
            return path
        return super().sfx(tipo)


# ====================================================================== GRAFICHE (Remotion)
GRAFICHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "grafiche")


def render_pannello(props, out, avvisa=None):
    """Pannello explainer animato (Remotion) con trasparenza: ProRes 4444 da sovrapporre al video."""
    if not os.path.isdir(os.path.join(GRAFICHE, "node_modules", "remotion")):
        if avvisa:
            avvisa("vfx", "preparo il motore grafico (Remotion), solo la prima volta")
        p = subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=GRAFICHE, capture_output=True, text=True, timeout=900)
        if p.returncode != 0:
            raise RuntimeError("installazione Remotion non riuscita: " + p.stderr[-300:])
    pj = out + ".json"
    with open(pj, "w") as f:
        json.dump(props, f, ensure_ascii=False)
    p = subprocess.run(["npx", "remotion", "render", "src/index.ts", "Pannello", out, f"--props={pj}", "--codec=prores", "--prores-profile=4444",
                        "--pixel-format=yuva444p10le", "--image-format=png", "--log=error"], cwd=GRAFICHE, capture_output=True, text=True, timeout=1800)
    if p.returncode != 0 or not os.path.exists(out):
        raise RuntimeError("render del pannello non riuscito: " + (p.stderr or p.stdout)[-400:])
    return out


# ====================================================================== TALKING HEAD
class TalkingHead(_Base):
    ZOOM = [1.0, 1.14, 1.05, 1.19]  # un "punch" diverso a ogni frase: il taglio si sente e il viso resta incorniciato

    def parole_clip(self, s):
        """Parole (Whisper, con tempi) del tratto scelto dal Regista, sui tempi della clip."""
        from faster_whisper import WhisperModel
        if not hasattr(TalkingHead, "_mod"):
            TalkingHead._mod = WhisperModel(os.environ.get("WHISPER_MODELLO", "small"), device="cpu", compute_type="int8")
        raw = os.path.join(self.tmp, f"voce_{s['_k']}.raw")
        self.ff(["-ss", f"{s['in']:.3f}", "-t", f"{s['durata']:.3f}", "-i", s["file"], "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", raw], "voce")
        y = np.fromfile(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if len(y) < 8000:
            return []
        seg, info = TalkingHead._mod.transcribe(y, word_timestamps=True, vad_filter=True, language=self.p.get("lingua") or None)
        out = []
        for x in seg:
            for w in x.words or []:
                if w.word.strip():
                    out.append({"testo": w.word.strip(), "da": s["in"] + w.start, "a": s["in"] + w.end, "seg": s["_k"]})
        return out

    def correggi(self, parole):
        corr = {norm(k): v for k, v in (self.p.get("correzioni") or {}).items() if norm(k)}
        for w in parole:
            if norm(w["testo"]) in corr:
                punt = re.findall(r"[.,!?;:]+$", w["testo"])
                w["testo"] = corr[norm(w["testo"])] + (punt[0] if punt else "")
        return parole

    @staticmethod
    def righe(parole, max_parole=3, max_car=16):
        """Righe brevi (1-3 parole): si leggono in un colpo d'occhio."""
        righe, cur = [], []
        for i, w in enumerate(parole):
            if cur:
                prima = cur[-1]
                spezza = (len(cur) >= max_parole or sum(len(x["testo"]) + 1 for x in cur) + len(w["testo"]) > max_car
                          or w["da"] - prima["a"] > 0.28 or re.search(r"[.!?;:,]$", prima["testo"]) or w["seg"] != prima["seg"])
                if spezza:
                    righe.append(cur)
                    cur = []
            cur.append(w)
        if cur:
            righe.append(cur)
        return righe

    def volto(self, s):
        """Posizione media del viso nel tratto (x, y centro e altezza, in frazioni della clip)."""
        quadri = self.fotogrammi(s["file"], s["in"], s["durata"], 6, 480)
        try:
            import cv2
            c = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            if c.empty():
                raise RuntimeError
        except Exception:
            return None
        trovati = []
        for _, q in quadri:
            h, w, _ = q.shape
            v = c.detectMultiScale(cv2.cvtColor(q, cv2.COLOR_RGB2GRAY), 1.12, 5, minSize=(w // 12, w // 12))
            if len(v):
                x, y, fw, fh = max(v, key=lambda f: f[2] * f[3])
                trovati.append(((x + fw / 2) / w, (y + fh / 2) / h, fh / h))
        if not trovati:
            return None
        a = np.median(np.array(trovati), axis=0)
        return {"cx": float(a[0]), "cy": float(a[1]), "fh": float(a[2])}

    def finestra(self, s, z):
        """Ritaglio 9:16 con zoom z: il viso resta centrato in orizzontale e al ~36% dell'altezza (spazio per i testi)."""
        sw, sh = s["_info"]["w"] or W, s["_info"]["h"] or H
        cw0 = min(sw, sh * W / H)
        ch0 = cw0 * H / W
        cw, ch = cw0 / z, ch0 / z
        v = s.get("_volto") or {"cx": 0.5, "cy": 0.4}
        x = min(max(0, v["cx"] * sw - cw / 2), sw - cw)
        y = min(max(0, v["cy"] * sh - ch * 0.36), sh - ch)
        return int(cw) // 2 * 2, int(ch) // 2 * 2, int(x), int(y)

    def tratto(self, i, p, lut):
        s = p["s"]
        cw, ch, x, y = self.finestra(s, p["zoom"])
        corr = s.get("_corr") or ""
        filtri = [f"crop={cw}:{ch}:{x}:{y}", f"scale={W}:{H}:flags=lanczos", f"fps={FPS}"]
        if corr:
            filtri.append(corr)
        filtri.append(self.filtro_colore(lut))
        if p["flash"]:  # un fotogramma più luminoso sul salto: il jump cut diventa un accento voluto
            filtri.append(f"eq=brightness=0.18:contrast=1.05:enable='lt(t,{FOTOGRAMMA * 1.5:.3f})'")
        if "vignettatura" in set(self.p.get("effetti_globali") or []):
            filtri.append("vignette=PI/6")
        filtri.append(f"trim=duration={p['durata']:.4f},setpts=PTS-STARTPTS,setsar=1,format=yuv420p")
        out = os.path.join(self.tmp, f"th_{i:03d}.mkv")
        af = ("aformat=sample_rates=48000:channel_layouts=stereo,"
              + ("afade=t=in:d=0.012," if p.get("fade_in", True) else "")
              + ("" if p["contiguo"] else f"afade=t=out:st={max(0, p['durata'] - 0.015):.4f}:d=0.015,")
              + f"apad,atrim=duration={p['durata']:.4f}")
        self.ff(["-ss", f"{p['src_da']:.4f}", "-t", f"{p['durata'] + 0.1:.4f}", "-i", s["file"], "-vf", ",".join(filtri), "-af", af,
                 "-t", f"{p['durata']:.4f}"] + X264_INT + ["-c:a", "pcm_s16le", out], f"tratto {i + 1}")
        return out

    def parlato(self):
        """Trascrive, toglie i silenzi, monta le frasi (con punch zoom) e pulisce la voce: base comune dei formati parlati."""
        t0 = time.time()
        P = self.p
        segmenti = [dict(s, _k=k) for k, s in enumerate(P["segmenti"])]
        for s in segmenti:
            s["_info"] = self.probe(s["file"])
            s["durata"] = min(float(s["durata"]), max(0.5, s["_info"]["dur"] - float(s.get("in", 0))))
            s["in"] = float(s.get("in", 0))
        self.avvisa("sottotitoli", f"trascrivo parola per parola {len(segmenti)} tratti di parlato")
        parole = []
        for s in segmenti:
            parole += self.parole_clip(s)
        parole = self.correggi(parole)
        if len(parole) < 3:
            raise RuntimeError("nei tratti scelti non si sente parlare: il formato talking-head ha bisogno di una voce")
        righe = self.righe(parole)

        self.avvisa("editor", "tolgo i silenzi, trovo il viso e preparo un punch zoom a ogni frase")
        with ThreadPoolExecutor(PARALLELO) as ex:
            volti = list(ex.map(self.volto, segmenti))
        for s, v in zip(segmenti, volti):
            s["_volto"] = v
            q = self.fotogrammi(s["file"], s["in"], s["durata"], 4)
            s["_corr"] = self.correzione(q)
        if not any(volti):
            self.report.append("viso non riconosciuto: inquadratura e testi in posizione standard")

        # tratti: una frase ciascuno; i silenzi oltre 0,35 s spariscono
        tratti, tagliati = [], 0.0
        for k, r in enumerate(righe):
            s = segmenti[r[0]["seg"]]
            da = r[0]["da"] - 0.06
            succ = righe[k + 1] if k + 1 < len(righe) else None
            contiguo = succ and succ[0]["seg"] == r[0]["seg"] and succ[0]["da"] - r[-1]["a"] < 0.35
            a = (succ[0]["da"] - 0.06) if contiguo else r[-1]["a"] + 0.16
            if tratti and tratti[-1]["s"] is s and tratti[-1]["contiguo"]:
                da = tratti[-1]["src_a"]
            da = max(s["in"], da)
            a = min(s["in"] + s["durata"], a)
            if tratti and tratti[-1]["s"] is s and not tratti[-1]["contiguo"]:
                tagliati += max(0, da - tratti[-1]["src_a"])
            if a - da < 0.2:
                a = da + 0.2
            tratti.append({"s": s, "src_da": da, "src_a": a, "riga": r, "contiguo": bool(contiguo)})
        # tempi sul reel (allineati ai fotogrammi)
        t = 0.0
        for k, p in enumerate(tratti):
            if k and tratti[k - 1]["contiguo"]:  # attaccato al precedente: riparte esattamente da dove finiva (niente click)
                p["src_da"] = tratti[k - 1]["src_da"] + tratti[k - 1]["durata"]
            p["durata"] = max(FOTOGRAMMA * 4, a_griglia(p["src_a"] - p["src_da"]))
            p["fade_in"] = k == 0 or not tratti[k - 1]["contiguo"]
            p["reel_da"] = t
            t += p["durata"]
            p["zoom"] = self.ZOOM[k % len(self.ZOOM)]
            p["flash"] = k > 0 and not tratti[k - 1]["contiguo"]
            for w in p["riga"]:
                w["t0"] = p["reel_da"] + (w["da"] - p["src_da"])
                w["t1"] = p["reel_da"] + (w["a"] - p["src_da"])
        totale = t
        self.report.append(f"talking-head: {len(tratti)} frasi, {tagliati:.1f} s di pause tolte")

        lut = self.crea_lut(P.get("look", "naturale_vivace"), min(0.75, float(P.get("intensita_look", 0.6))))
        self.avvisa("color", "grade leggero sul viso (pelle naturale) e bilanciamento del bianco")
        with ThreadPoolExecutor(PARALLELO) as ex:
            pezzi = list(ex.map(lambda a: self.tratto(a[0], a[1], lut), enumerate(tratti)))
        lista = os.path.join(self.tmp, "tratti.txt")
        with open(lista, "w") as f:
            f.write("".join(f"file '{x}'\n" for x in pezzi))
        unito = os.path.join(self.tmp, "parlato.mkv")
        self.ff(["-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", unito], "unisco le frasi")
        video = os.path.join(self.tmp, "parlato_v.mp4")
        voce = os.path.join(self.tmp, "voce.wav")
        self.ff(["-i", unito, "-map", "0:v", "-c:v", "copy", video], "video")
        self.ff(["-i", unito, "-map", "0:a", "-af", "highpass=f=80,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2",
                 "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", voce], "pulizia voce")
        return t0, P, segmenti, righe, tratti, totale, video, voce, lut

    def monta(self, out_finale):
        t0, P, segmenti, righe, tratti, totale, video, voce, lut = self.parlato()

        # b-roll sulle parole chiave (il parlato continua sotto)
        tutte = [w for r in righe for w in r]
        broll = [b for b in (P.get("broll") or []) if b.get("file")]
        gancio_fine = self.fine_gancio(righe)
        eventi_sfx = [("boom", 0.0, 0.9)]
        self.pannello = None
        pan = P.get("pannello") or {}
        if pan.get("titolo") and (pan.get("punti") or pan.get("passi")):
            chiave = norm(pan.get("sulla_parola", ""))
            w = next((w for w in tutte if chiave and norm(w["testo"]).startswith(chiave) and w["t0"] >= gancio_fine), None)
            da = max(gancio_fine, (w["t0"] - 0.15) if w else gancio_fine)
            fine = totale - (2.4 if (P.get("cta") or {}).get("testo") else 0.2)
            a = min(fine, da + float(pan.get("durata") or 99))
            if a - da >= 2.5:
                self.pannello = (da, a)
            else:
                self.report.append("pannello non inserito: non c'è abbastanza parlato dopo il gancio")
        if broll:
            self.avvisa("vfx", f"inserisco {len(broll)} b-roll sulle parole chiave")
            usati, pos = [], 0
            for b in broll:
                chiave = norm(b.get("sulla_parola", ""))
                w = next((w for w in tutte[pos:] if chiave and norm(w["testo"]).startswith(chiave) and w["t0"] > gancio_fine), None)
                if not w:
                    self.report.append(f"b-roll non inserito: la parola \"{b.get('sulla_parola')}\" non si sente dopo il gancio")
                    continue
                pos = tutte.index(w) + 1
                da = max(gancio_fine, w["t0"] - 0.08)
                dur = min(float(b.get("durata", 2.0)), 3.5, totale - da - 0.3)
                if dur < 0.8 or any(da < u["a"] + 0.6 for u in usati):
                    continue
                if self.pannello and da < self.pannello[1] and da + dur > self.pannello[0]:
                    continue  # durante il pannello il b-roll coprirebbe il grafico
                b2 = dict(b, durata=dur, effetto=b.get("effetto") or "zoom_lento", rallenty=bool(b.get("rallenty")), _info=self.probe(b["file"]))
                usati.append({"da": da, "a": da + dur, "b": b2})
            if usati:
                with ThreadPoolExecutor(PARALLELO) as ex:
                    clip_b = list(ex.map(lambda a: self.pezzo(100 + a[0], a[1]["b"], lut, set()), enumerate(usati)))
                args, fc, prev = ["-i", video], [], "[0:v]"
                for k, (u, c) in enumerate(zip(usati, clip_b)):
                    args += ["-i", c]
                    fc.append(f"[{k + 1}:v]setpts=PTS+{u['da']:.3f}/TB[b{k}];{prev}[b{k}]overlay=eof_action=pass:enable='between(t,{u['da']:.3f},{u['a']:.3f})'[v{k}]")
                    prev = f"[v{k}]"
                    eventi_sfx.append(("whoosh", u["da"] - 0.18, 0.5))
                v2 = os.path.join(self.tmp, "parlato_broll.mp4")
                self.ff(args + ["-filter_complex", ";".join(fc), "-map", prev] + X264_INT + [v2], "b-roll")
                video = v2
                self.broll_usati = usati

        if self.pannello:
            video = self.con_pannello(video, pan, eventi_sfx)
        if P.get("schede"):
            video = self.con_schede(video, tutte, gancio_fine, totale, eventi_sfx)
        self.avvisa("sottotitoli", f"scrivo {len(righe)} righe di sottotitoli con il riquadro che segue la voce")
        ass = self.sottotitoli(righe, totale, segmenti)
        for k, p in enumerate(tratti[1:], 1):
            if p["flash"]:
                eventi_sfx.append(("pop", p["reel_da"], 0.6))
        mixwav = self.mix_sfx(voce, eventi_sfx, totale, os.path.join(self.tmp, "mix.wav"))
        self.avvisa("audio", "voce pulita (rumore, compressione), effetti sonori, volume a −14 LUFS")
        self.finale(video, ass, mixwav, totale, out_finale)
        rep = self.revisiona(out_finale)
        rep["secondi_di_lavoro"] = round(time.time() - t0)
        rep["formato"] = "talking_head"
        self.avvisa("revisore", f"controllo: {rep['durata']}s · {rep['lufs']} LUFS · {rep['mb']} MB" + (" · ⚠ " + "; ".join(rep["problemi"]) if rep["problemi"] else " · tutto ok"))
        return rep

    def con_pannello(self, video, pan, eventi_sfx):
        """Explainer: il pannello animato scende sulla metà alta, il viso si sposta nella metà bassa."""
        da, a = self.pannello
        col = self.p.get("colori") or {}
        props = {"chip": str(pan.get("chip") or "TIP")[:14], "titolo": str(pan["titolo"])[:70], "tipo": pan.get("tipo") or "line",
                 "punti": pan.get("punti") or [], "passi": pan.get("passi") or None, "unita": pan.get("unita") or "", "badge": pan.get("badge") or None,
                 "accento": col.get("accento") or "#D97757", "tema": pan.get("tema") or "dark", "durata": round(a - da, 2), "grafico_in": 0.6}
        self.avvisa("vfx", f"disegno il pannello animato \"{props['titolo']}\" ({props['tipo']}) con Remotion")
        mov = render_pannello(props, os.path.join(self.tmp, "pannello.mov"), self.avvisa)
        y0 = int(min(max(0, H * 0.36 - 200), H // 2))  # il viso (al 36% dell'altezza) finisce nella parte alta della metà bassa
        out = os.path.join(self.tmp, "parlato_pannello.mp4")
        fc = (f"[0:v]split[f][c];[c]crop={W}:{H // 2}:0:{y0}[cam];[f]crop={W}:{H // 2}:0:0,gblur=sigma=30,eq=brightness=-0.2[alto];"
              f"[alto][cam]vstack[div];[0:v][div]overlay=0:0:enable='between(t,{da:.3f},{a:.3f})'[v1];"
              f"[1:v]setpts=PTS+{da:.3f}/TB,format=yuva420p[p];[v1][p]overlay=0:0:eof_action=pass:format=auto:enable='between(t,{da:.3f},{a + 0.05:.3f})'[v]")
        self.ff(["-i", video, "-i", mov, "-filter_complex", fc, "-map", "[v]"] + X264_INT + [out], "pannello")
        eventi_sfx += [("whoosh", da - 0.15, 0.6), ("tick", da + 2.1, 0.7)]
        self.report.append(f"pannello {props['tipo']} da {da:.1f}s a {a:.1f}s")
        return out

    def scheda_png(self, k, sc):
        """Foto/screenshot come cartolina: bordo bianco, angoli tondi, ombra, leggermente ruotata, etichetta colorata sopra."""
        from PIL import Image, ImageDraw, ImageFilter, ImageFont
        im = Image.open(sc["file"]).convert("RGB")
        mw, mh = 330, 470
        r = min(mw / im.width, mh / im.height)
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
        b = 12
        tela = Image.new("RGBA", (im.width + 2 * b, im.height + 2 * b), (255, 255, 255, 255))
        tela.paste(im, (b, b))
        m = Image.new("L", tela.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, tela.width - 1, tela.height - 1], radius=16, fill=255)
        tela.putalpha(m)
        et = str(sc.get("etichetta") or "").strip()[:16]
        alto = 0
        if et:
            fp = self.font_file(800) if hasattr(self, "font_file") else None
            try:
                fnt = ImageFont.truetype(fp or "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
            except Exception:
                fnt = ImageFont.load_default()
            tw = int(ImageDraw.Draw(tela).textlength(et, font=fnt)) + 34
            col = sc.get("colore") or ("#E8327A" if k % 2 == 0 else "#2F8CE0")
            chip = Image.new("RGBA", (tw, 52), (0, 0, 0, 0))
            ImageDraw.Draw(chip).rounded_rectangle([0, 0, tw - 1, 51], radius=12, fill=col)
            ImageDraw.Draw(chip).text((17, 6), et, font=fnt, fill="white")
            alto = 40
            nuova = Image.new("RGBA", (max(tela.width, tw + 20), tela.height + alto), (0, 0, 0, 0))
            nuova.paste(tela, (0, alto), tela)
            nuova.paste(chip, (nuova.width - tw - 6, 0), chip)
            tela = nuova
        ang = float(sc.get("rotazione", (-6 if sc.get("lato") == "sx" else 6)))
        tela = tela.rotate(ang, resample=Image.BICUBIC, expand=True)
        ombra = Image.new("RGBA", (tela.width + 60, tela.height + 60), (0, 0, 0, 0))
        sag = Image.new("L", tela.size, 0)
        sag.paste(tela.split()[3].point(lambda a: 120 if a > 0 else 0), (0, 0))
        ombra.paste((0, 0, 0, 255), (34, 42), sag)
        ombra = ombra.filter(ImageFilter.GaussianBlur(16))
        ombra.paste(tela, (30, 30), tela)
        out = os.path.join(self.tmp, f"scheda_{k:02d}.png")
        ombra.save(out)
        return out, ombra.width, ombra.height

    def con_schede(self, video, tutte, gancio_fine, totale, eventi_sfx):
        """Cartoline (foto, screenshot, prima/dopo) che entrano sulle parole chiave, ai lati della testa, sopra il parlato."""
        usate, pos = [], 0
        for k, sc in enumerate((self.p.get("schede") or [])[:8]):
            if not sc.get("file"):
                continue
            chiave = norm(sc.get("sulla_parola", ""))
            w = next((w for w in tutte[pos:] if chiave and norm(w["testo"]).startswith(chiave) and w["t0"] >= gancio_fine - 0.5), None)
            if not w:
                self.report.append(f"scheda non inserita: la parola \"{sc.get('sulla_parola')}\" non si sente")
                continue
            pos = tutte.index(w) + 1
            da = max(0.3, w["t0"] - 0.1)
            dur = min(float(sc.get("durata") or 2.6), 7.0, totale - da - 0.2)
            if dur < 0.8:
                continue
            png, pw, ph = self.scheda_png(k, sc)
            lato = sc.get("lato") or ("dx" if k % 2 == 0 else "sx")
            x = W - pw - 10 if lato == "dx" else 10
            y = int(SICURO_ALTO + 140)
            usate.append({"png": png, "da": da, "a": da + dur, "x": x, "y": y})
            eventi_sfx.append(("pop", da, 0.7))
        if not usate:
            return video
        self.avvisa("vfx", f"inserisco {len(usate)} cartoline (foto e screenshot) sulle parole chiave")
        args, fc, prev = ["-i", video], [], "[0:v]"
        for k, u in enumerate(usate):
            d = u["a"] - u["da"]
            args += ["-loop", "1", "-t", f"{d:.3f}", "-i", u["png"]]
            fc.append(f"[{k + 1}:v]format=rgba,fade=t=in:st=0:d=0.14:alpha=1,fade=t=out:st={max(0, d - 0.2):.3f}:d=0.2:alpha=1,setpts=PTS+{u['da']:.3f}/TB[s{k}];"
                      f"{prev}[s{k}]overlay={u['x']}:{u['y']}:eof_action=pass:enable='between(t,{u['da']:.3f},{u['a']:.3f})'[v{k}]")
            prev = f"[v{k}]"
        out = os.path.join(self.tmp, "parlato_schede.mp4")
        self.ff(args + ["-filter_complex", ";".join(fc), "-map", prev] + X264_INT + [out], "cartoline")
        self.report.append(f"{len(usate)} cartoline inserite")
        return out

    def fine_gancio(self, righe):
        g = self.p.get("gancio") or {}
        n = int(g.get("righe") or 0)
        if not n:  # di base: la prima frase (fino al primo punto o ~2,6 s, max 6 parole)
            parole, n = 0, 0
            for r in righe:
                n += 1
                parole += len(r)
                if re.search(r"[.!?]$", r[-1]["testo"]) or r[-1]["t1"] > 2.6 or parole >= 5:
                    break
        self._righe_gancio = max(1, min(n, len(righe)))
        return righe[self._righe_gancio - 1][-1]["t1"] + 0.15

    def sottotitoli(self, righe, totale, segmenti):
        P = self.p
        fnt = (P.get("font") or {})
        famiglia = self.font(fnt.get("testi") or "Montserrat", 800)
        col = P.get("colori") or {}
        bianco = self.ass_colore(col.get("testo", "#FFFFFF"))
        acc_hex = col.get("accento") or "#D97757"
        acc = self.ass_colore(acc_hex)
        giallo = self.ass_colore(col.get("evidenzia") or "#FFD84D")
        piccoli = (P.get("sottotitoli") or {}).get("stile") == "piccoli_alto"  # come nei video "talking head educativi": piccoli, in alto, i concetti nei cartelli
        DIM, DIM_G = (54 if piccoli else 84), 118
        largo = self.misura_font(famiglia, 800, DIM)
        largo_g = self.misura_font(famiglia, 800, DIM_G)
        # posizioni: sottotitoli sotto il mento, gancio sopra la testa, sempre nelle zone sicure
        v = next((s["_volto"] for s in segmenti if s.get("_volto")), None)
        if v:
            s0 = segmenti[0]
            cw, ch, x, y = self.finestra(s0, 1.0)
            sh = s0["_info"]["h"] or H
            alto_viso = ((v["cy"] - v["fh"] * 0.75) * sh - y) / ch * H
            mento = ((v["cy"] + v["fh"] * 0.62) * sh - y) / ch * H
            y_sub = int(min(max(mento + 150, 1180), SICURO_BASSO - 110))
            y_gancio = int(min(max(alto_viso - 130, SICURO_ALTO + 120), 760))
            if alto_viso - 130 < SICURO_ALTO + 60:  # testa troppo in alto: il gancio va sotto, al posto dei sottotitoli
                y_gancio = y_sub
        else:
            y_sub, y_gancio = 1330, 470
        pulisci = lambda t: str(t).replace("\\", "").replace("{", "(").replace("}", ")")
        evid = {norm(x) for x in (P.get("evidenzia") or []) + ((P.get("gancio") or {}).get("evidenzia") or []) if norm(x)}
        ev = []
        n_g = getattr(self, "_righe_gancio", 1)
        # gancio: le prime frasi grandi sopra la testa, parola per parola, con la parola chiave in giallo
        g_parole = [w for r in righe[:n_g] for w in r]
        testo_g = (P.get("gancio") or {}).get("testo")
        fine_g = g_parole[-1]["t1"] + 0.25
        if testo_g:  # testo scritto dal Copy (resta tutto insieme)
            ev.append(f"Dialogue: 4,{self.tempo_ass(0)},{self.tempo_ass(fine_g)},G,,0,0,0,,{{\\an5\\pos(540,{y_gancio})\\fscx60\\fscy60\\t(0,140,\\fscx106\\fscy106)\\t(140,240,\\fscx100\\fscy100)\\fad(0,180)}}{pulisci(testo_g).upper()}")
        else:
            righe_g, cur = [], []
            for w in g_parole:  # a capo entro 920 px
                if cur and largo_g(" ".join(x["testo"].upper() for x in cur + [w])) > 920:
                    righe_g.append(cur)
                    cur = []
                cur.append(w)
            if cur:
                righe_g.append(cur)
            for j, rg in enumerate(righe_g):
                yy = y_gancio + int((j - (len(righe_g) - 1) / 2) * DIM_G * 1.05)
                pezzi = []
                for w in rg:
                    t0 = max(0, int((w["t0"]) * 1000))
                    c = f"\\c{giallo}" if norm(w["testo"]) in evid else ""
                    pezzi.append(f"{{\\alpha&HFF&{c}\\t({t0},{t0 + 1},\\alpha&H00&)\\fscx55\\fscy55\\t({t0},{t0 + 130},\\fscx108\\fscy108)\\t({t0 + 130},{t0 + 220},\\fscx100\\fscy100)}}{pulisci(w['testo']).upper()}{{\\c{bianco}}}")
                ev.append(f"Dialogue: 4,{self.tempo_ass(0)},{self.tempo_ass(fine_g)},G,,0,0,0,,{{\\an5\\pos(540,{yy})\\fad(0,180)}}{' '.join(pezzi)}")
        # sottotitoli: una riga (1-3 parole) alla volta, il riquadro colorato scivola sotto la parola detta
        pad_x, alt_box = 18, int(DIM * 1.12)
        prec_box = None
        for k, r in enumerate(righe[n_g:], n_g):
            prossima = righe[k + 1][0]["t0"] if k + 1 < len(righe) else totale
            da, a = r[0]["t0"] - 0.02, min(prossima - 0.02, r[-1]["t1"] + 0.45, totale)
            parole_r = [pulisci(w["testo"]).upper() for w in r]
            larghe = [largo(p) for p in parole_r]
            spazio = largo(" ")
            tot = sum(larghe) + spazio * (len(r) - 1)
            x = 540 - tot / 2
            centri = []
            for lw in larghe:
                centri.append(x + lw / 2)
                x += lw + spazio
            testo = " ".join((f"{{\\c{giallo}}}{p}{{\\c{bianco}}}" if norm(w["testo"]) in evid else p) for p, w in zip(parole_r, r))
            pan = getattr(self, "pannello", None)
            y_r = (SICURO_BASSO - 120) if pan and pan[0] - 0.05 <= da < pan[1] else y_sub
            if piccoli:
                y_r = SICURO_ALTO + 30
                testo = " ".join((f"{{\\c{giallo}}}{pulisci(w['testo'])}{{\\c{bianco}}}" if norm(w["testo"]) in evid else pulisci(w["testo"])) for w in r)
                ev.append(f"Dialogue: 3,{self.tempo_ass(da)},{self.tempo_ass(a)},S,,0,0,0,,{{\\an5\\pos(540,{y_r})\\fad(60,0)}}{testo}")
                continue
            ev.append(f"Dialogue: 3,{self.tempo_ass(da)},{self.tempo_ass(a)},S,,0,0,0,,{{\\an5\\pos(540,{y_r})\\fscx86\\fscy86\\t(0,90,\\fscx100\\fscy100)}}{testo}")
            for j, w in enumerate(r):
                b0 = w["t0"]
                b1 = r[j + 1]["t0"] if j + 1 < len(r) else a
                bw, cx = larghe[j] + 2 * pad_x, centri[j]
                if j and prec_box:  # scivola dalla parola prima
                    (px, pw) = prec_box
                    sx = 100 * pw / bw
                    ev.append(f"Dialogue: 2,{self.tempo_ass(b0)},{self.tempo_ass(b1)},Box,,0,0,0,,{{\\an5\\move({px:.0f},{y_r},{cx:.0f},{y_r},0,90)\\fscx{sx:.0f}\\t(0,90,\\fscx100)\\c{acc}\\p1}}{self.rettangolo(bw, alt_box)}")
                else:
                    ev.append(f"Dialogue: 2,{self.tempo_ass(b0)},{self.tempo_ass(b1)},Box,,0,0,0,,{{\\an5\\pos({cx:.0f},{y_r})\\fscx70\\fscy70\\t(0,80,\\fscx100\\fscy100)\\c{acc}\\p1}}{self.rettangolo(bw, alt_box)}")
                prec_box = (cx, bw)
            prec_box = None
        # cartelli: 1-4 parole chiave grandi, su una fascia colorata inclinata, che entrano quando la parola si sente
        tutte_w = [w for r in righe for w in r]
        y_c = (SICURO_ALTO + 115) if piccoli else y_gancio
        cartelli, presi = [], set()
        for c in (P.get("cartelli") or [])[:12]:
            chiave = norm(c.get("sulla_parola", "")) or norm(str(c.get("testo", "")).split(" ")[0])
            w = next((w for w in tutte_w if chiave and id(w) not in presi and norm(w["testo"]).startswith(chiave) and w["t0"] >= fine_g - 0.3), None)
            if not w or not str(c.get("testo") or "").strip():
                self.report.append(f"cartello non inserito: la parola \"{c.get('sulla_parola')}\" non si sente")
                continue
            presi.add(id(w))
            cartelli.append((w["t0"] - 0.05, c))
        cartelli.sort(key=lambda x: x[0])
        for j, (da, c) in enumerate(cartelli):
            a = min(da + float(c.get("durata") or 1.7), cartelli[j + 1][0] - 0.05 if j + 1 < len(cartelli) else totale - 0.1)
            if a - da < 0.5:
                continue
            testo_c = pulisci(c["testo"])[:34]
            stile_c = c.get("stile") or "fascia"
            col_c = self.ass_colore({"blu": "#2F8CE0", "rosa": "#E8327A", "verde": "#22A55B"}.get(c.get("colore"), c.get("colore") if str(c.get("colore", "")).startswith("#") else acc_hex))
            rot = -3 if j % 2 == 0 else 2
            larg = self.misura_font(famiglia, 800, 92)(testo_c.upper()) + 56
            k = min(100, int(900 / max(1, larg) * 100))  # i cartelli lunghi si rimpiccioliscono per stare in 900 px
            entra = f"\\fscx{int(k * .4)}\\fscy{int(k * .4)}\\t(0,120,\\fscx{int(k * 1.08)}\\fscy{int(k * 1.08)})\\t(120,200,\\fscx{k}\\fscy{k})\\fad(0,120)"
            if stile_c == "fascia":
                ev.append(f"Dialogue: 6,{self.tempo_ass(da)},{self.tempo_ass(a)},Box,,0,0,0,,{{\\an5\\pos(540,{y_c})\\frz{rot}{entra}\\c{col_c}\\p1}}{self.rettangolo(larg, 118, 10)}")
            barrato = "\\s1" if stile_c == "barrato" else ""
            ev.append(f"Dialogue: 7,{self.tempo_ass(da)},{self.tempo_ass(a)},C,,0,0,0,,{{\\an5\\pos(540,{y_c})\\frz{rot}{barrato}{entra}}}{testo_c.upper()}")
        if cartelli:
            self.report.append(f"{len(cartelli)} cartelli con le parole chiave")
        # CTA finale
        cta = P.get("cta") or {}
        if cta.get("testo"):
            a = max(0.0, totale - float(cta.get("secondi", 2.2)))
            ev.append(f"Dialogue: 5,{self.tempo_ass(a)},{self.tempo_ass(totale)},CTA,,0,0,0,,{{\\an5\\pos(540,{SICURO_BASSO - 60})\\fscx70\\fscy70\\t(0,140,\\fscx100\\fscy100)\\fad(120,0)}}{pulisci(cta['testo'])}")
        stili = [f"G,{famiglia},{DIM_G},{bianco},{bianco},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,4,5,60,60,0,1",
                 f"S,{famiglia},{DIM},{bianco},{bianco},&H00000000,&H78000000,-1,0,0,0,100,100,0,0,1,5,3,5,60,60,0,1",
                 f"Box,{famiglia},{DIM},{acc},{acc},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1",
                 f"C,{famiglia},92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,3,5,40,40,0,1",
                 f"CTA,{famiglia},64,&H00FFFFFF,&H00FFFFFF,{acc},{acc},-1,0,0,0,100,100,0,0,3,22,0,5,60,60,0,1"]
        path = os.path.join(self.tmp, "sottotitoli.ass")
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.intestazione_ass(stili) + "\n".join(ev) + "\n")
        self.posizioni = {"sottotitoli_y": y_sub, "gancio_y": y_gancio}
        return path


# ====================================================================== CAROSELLO → REEL
class Carosello(_Base):
    senza_voce = True

    def slide_png(self, k, s):
        """Fotogramma completo della slide: sfondo sfocato e scurito + slide intera con ombra e angoli arrotondati."""
        from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
        im = Image.open(s["file"]).convert("RGB")
        sfondo = im.copy()
        r = max(W / sfondo.width, H / sfondo.height)
        sfondo = sfondo.resize((int(sfondo.width * r) + 1, int(sfondo.height * r) + 1), Image.LANCZOS)
        sfondo = sfondo.crop(((sfondo.width - W) // 2, (sfondo.height - H) // 2, (sfondo.width - W) // 2 + W, (sfondo.height - H) // 2 + H))
        sfondo = ImageEnhance.Brightness(sfondo.filter(ImageFilter.GaussianBlur(45))).enhance(0.55)
        # la slide resta intera, dentro la zona sicura (tra le barre in alto e la caption in basso)
        max_w, max_h = 960, SICURO_BASSO - SICURO_ALTO - 150
        r = min(max_w / im.width, max_h / im.height)
        fw, fh = int(im.width * r), int(im.height * r)
        fg = im.resize((fw, fh), Image.LANCZOS)
        cx, cy = W // 2, SICURO_ALTO + 60 + (SICURO_BASSO - SICURO_ALTO - 60) // 2
        x0, y0 = cx - fw // 2, cy - fh // 2
        ombra = Image.new("L", (W, H), 0)
        ImageDraw.Draw(ombra).rounded_rectangle([x0 + 6, y0 + 24, x0 + fw + 6, y0 + fh + 30], radius=28, fill=170)
        ombra = ombra.filter(ImageFilter.GaussianBlur(28))
        sfondo.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), ombra)
        maschera = Image.new("L", (fw, fh), 0)
        ImageDraw.Draw(maschera).rounded_rectangle([0, 0, fw - 1, fh - 1], radius=24, fill=255)
        sfondo.paste(fg, (x0, y0), maschera)
        out = os.path.join(self.tmp, f"slide_{k:02d}.png")
        sfondo.save(out)
        return out

    def clip_slide(self, k, s, lut):
        png = self.slide_png(k, s)
        d = float(s["_dur"])
        n = int(round(d * FPS))
        out = os.path.join(self.tmp, f"slide_{k:02d}.mp4")
        filtri = [f"zoompan=z='1+0.045*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"]
        if lut:
            filtri.append(self.filtro_colore(lut))
        filtri.append(f"trim=duration={d:.3f},setsar=1,format=yuv420p")
        self.ff(["-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", png, "-vf", ",".join(filtri)] + X264_INT + [out], f"slide {k + 1}")
        return out

    def monta(self, out_finale):
        t0 = time.time()
        P = self.p
        slide = [dict(s) for s in P["slide"] if s.get("file")]
        if len(slide) < 2:
            raise RuntimeError("servono almeno 2 slide per un carosello")
        for s in slide:
            parole = len(str(s.get("testo_slide") or "").split())
            s["_dur"] = max(1.8, float(s.get("durata") or 2.2), parole / 8)
        lut = self.crea_lut(P["look"], float(P.get("intensita_look", 0.5))) if P.get("look") and P.get("look") != "nessuno" else None
        self.avvisa("vfx", f"preparo {len(slide)} slide: sfondo sfocato, ombra e push-in lento")
        with ThreadPoolExecutor(PARALLELO) as ex:
            clip = list(ex.map(lambda a: self.clip_slide(a[0], a[1], lut), enumerate(slide)))
        video, totale, inizi, _ = self.assembla(clip, [{}] + [{"transizione_in": "slide"}] * (len(slide) - 1))
        self.avvisa("sottotitoli", "barre di avanzamento, gancio e call to action")
        ass = self.grafiche(slide, inizi, totale)
        silenzio = os.path.join(self.tmp, "silenzio.wav")
        self.ff(["-f", "lavfi", "-t", f"{totale:.3f}", "-i", "anullsrc=r=48000:cl=stereo", "-c:a", "pcm_s16le", silenzio], "silenzio")
        eventi = []
        for t in inizi[1:]:
            eventi += [("whoosh", t - 0.15, 0.55), ("tick", t + 0.2, 0.8)]
        mixwav = self.mix_sfx(silenzio, eventi, totale, os.path.join(self.tmp, "mix.wav"))
        self.avvisa("audio", "whoosh e tick a ogni cambio slide (la musica la metti da Instagram)")
        self.finale(video, ass, mixwav, totale, out_finale, normalizza=False)
        rep = self.revisiona(out_finale)
        rep["secondi_di_lavoro"] = round(time.time() - t0)
        rep["formato"] = "carosello"
        self.avvisa("revisore", f"controllo: {rep['durata']}s · {rep['mb']} MB" + (" · ⚠ " + "; ".join(rep["problemi"]) if rep["problemi"] else " · tutto ok"))
        return rep

    def grafiche(self, slide, inizi, totale):
        P = self.p
        famiglia = self.font((P.get("font") or {}).get("testi") or "Montserrat", 800)
        acc = self.ass_colore((P.get("colori") or {}).get("accento") or "#D97757")
        n = len(slide)
        x0, x1, gap, y, hh = 60, 1020, 10, SICURO_ALTO + 30, 8
        bw = (x1 - x0 - gap * (n - 1)) / n
        ev = []
        fine = [inizi[k + 1] if k + 1 < n else totale for k in range(n)]
        for k in range(n):
            x = x0 + k * (bw + gap)
            ev.append(f"Dialogue: 1,{self.tempo_ass(0)},{self.tempo_ass(totale)},Barra,,0,0,0,,{{\\an7\\pos({x:.0f},{y})\\alpha&H99&\\p1}}{self.rettangolo(bw, hh, 4)}")
            if k > 0:  # piene dopo
                ev.append(f"Dialogue: 2,{self.tempo_ass(fine[k - 1] if k else 0)},{self.tempo_ass(totale)},Barra,,0,0,0,,{{\\an7\\pos({x0 + (k - 1) * (bw + gap):.0f},{y})\\p1}}{self.rettangolo(bw, hh, 4)}")
            dur = int((fine[k] - inizi[k]) * 1000)
            ev.append(f"Dialogue: 2,{self.tempo_ass(inizi[k])},{self.tempo_ass(fine[k])},Barra,,0,0,0,,{{\\an7\\pos({x:.0f},{y})\\fscx0\\t(0,{dur},\\fscx100)\\p1}}{self.rettangolo(bw, hh, 4)}")
        pulisci = lambda t: str(t).replace("\\", "").replace("{", "(").replace("}", ")")
        g = (P.get("gancio") or {}).get("testo")
        if g:
            ev.append(f"Dialogue: 5,{self.tempo_ass(0.1)},{self.tempo_ass(fine[0] - 0.1)},Pill,,0,0,0,,{{\\an5\\pos(540,{SICURO_BASSO - 50})\\fscx70\\fscy70\\t(0,140,\\fscx100\\fscy100)\\fad(100,120)}}{pulisci(g)}")
        cta = (P.get("cta") or {}).get("testo")
        if cta:
            ev.append(f"Dialogue: 5,{self.tempo_ass(inizi[-1] + 0.3)},{self.tempo_ass(totale)},CTA,,0,0,0,,{{\\an5\\pos(540,{SICURO_BASSO - 50})\\fscx70\\fscy70\\t(0,140,\\fscx100\\fscy100)\\fad(100,0)}}{pulisci(cta)}")
        stili = [f"Barra,{famiglia},20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
                 f"Pill,{famiglia},60,&H00FFFFFF,&H00FFFFFF,&H40101010,&H40101010,-1,0,0,0,100,100,0,0,3,22,0,5,60,60,0,1",
                 f"CTA,{famiglia},62,&H00FFFFFF,&H00FFFFFF,{acc},{acc},-1,0,0,0,100,100,0,0,3,22,0,5,60,60,0,1"]
        path = os.path.join(self.tmp, "grafiche.ass")
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.intestazione_ass(stili) + "\n".join(ev) + "\n")
        return path


# ====================================================================== SPLIT EDUCATIVO (grafiche animate sopra, persona sotto)
TIPI_SCENA = {"titolo", "numero", "sito", "terminale", "contatore", "lista", "confronto", "card", "chat", "barre", "riepilogo"}
PALETTE_BASE = {"fondo": "#F1EFEA", "inchiostro": "#17171A", "accento": "#0E9F9A", "secondario": "#CFE9E7", "tenue": "rgba(23,23,26,0.09)"}


def installa_grafiche(avvisa=None):
    if not os.path.isdir(os.path.join(GRAFICHE, "node_modules", "remotion")):
        if avvisa:
            avvisa("vfx", "preparo il motore grafico (Remotion), solo la prima volta")
        p = subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=GRAFICHE, capture_output=True, text=True, timeout=900)
        if p.returncode != 0:
            raise RuntimeError("installazione Remotion non riuscita: " + p.stderr[-300:])


def screenshot_sito(url, out):
    """Schermata vera del sito citato (Chrome senza finestra del runner GitHub)."""
    for exe in ("google-chrome", "chromium-browser", "chromium"):
        try:
            p = subprocess.run([exe, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,900",
                                "--virtual-time-budget=6000", f"--screenshot={out}", url], capture_output=True, text=True, timeout=60)
            if os.path.exists(out) and os.path.getsize(out) > 5000:
                return True
        except Exception:
            continue
    return False


class SplitGrafico(TalkingHead):
    """Sopra: foglio color carta con le grafiche animate (Remotion) che seguono il discorso; al centro il sottotitolo a
    pillola nera; sotto la persona che parla. Colori e font arrivano dalla "palette" scelta dal Regista per l'argomento."""
    ZOOM = [1.0]  # niente punch: la persona sta ferma nel suo riquadro, il movimento lo fanno le grafiche

    def monta(self, out_finale):
        t0, P, segmenti, righe, tratti, totale, video, voce, lut = self.parlato()
        installa_grafiche(self.avvisa)
        parole, rr = [], []
        evid = {norm(x) for x in (P.get("evidenzia") or []) if norm(x)}
        for r in righe:
            idx = []
            for w in r:
                parole.append({"t": w["testo"], "da": round(w["t0"], 3), "a": round(w["t1"], 3), "k": norm(w["testo"]) in evid})
                idx.append(len(parole) - 1)
            rr.append({"da": round(r[0]["t0"], 3), "a": round(r[-1]["t1"], 3), "p": idx})
        # scene sulle parole dette (in ordine), ognuna fino all'inizio della successiva
        scene, pos = [], 0
        pub = os.path.join(GRAFICHE, "public")
        os.makedirs(pub, exist_ok=True)
        sigla = f"r{int(time.time())}"
        for g in (P.get("grafiche") or [])[:40]:
            if g.get("tipo") not in TIPI_SCENA:
                continue
            chiave = norm(str(g.get("sulla_parola", "")).split(" ")[0])
            k = next((i for i in range(pos, len(parole)) if chiave and norm(parole[i]["t"]).startswith(chiave)), None)
            if k is None:
                if not scene and pos == 0:
                    k = 0  # la prima grafica parte comunque col gancio
                else:
                    self.report.append(f"grafica {g.get('tipo')} saltata: \"{g.get('sulla_parola')}\" non si sente")
                    continue
            pos = k + 1
            d = dict(g.get("dati") or {})
            if g["tipo"] == "sito":
                url = d.get("url") or ""
                f = os.path.join(pub, f"{sigla}_sito{len(scene)}.png")
                if url.startswith("http") and screenshot_sito(url, f):
                    d["img"] = os.path.basename(f)
                    d.setdefault("indirizzo", re.sub(r"^https?://(www\.)?", "", url)[:60])
                else:
                    self.report.append(f"screenshot non riuscito per {url or '(nessun indirizzo)'}: uso la scheda senza immagine")
                    d.setdefault("titolo", re.sub(r"^https?://(www\.)?", "", url)[:40] or "sito")
            scene.append({"da": max(0.0, parole[k]["da"] - 0.12), "tipo": g["tipo"], "pieno": bool(g.get("pieno")), "dati": d})
        for i, s in enumerate(scene):
            s["a"] = round(scene[i + 1]["da"] if i + 1 < len(scene) else totale, 3)
            s["da"] = round(s["da"], 3)
        scene = [s for s in scene if s["a"] - s["da"] >= 0.5]
        if not scene:
            scene = [{"da": 0, "a": totale, "tipo": "titolo", "pieno": False, "dati": {"testo": (P.get("titolo") or " ".join(p["t"] for p in parole[:5]))[:40]}}]
        # barra 1/N: le voci della lista entrano sulle loro parole
        tracker = None
        tr = P.get("tracker") or {}
        if tr.get("voci"):
            voci, pos = [], 0
            for v in tr["voci"][:10]:
                chiave = norm(str(v.get("sulla_parola", "")).split(" ")[0])
                k = next((i for i in range(pos, len(parole)) if chiave and norm(parole[i]["t"]).startswith(chiave)), None)
                if k is not None:
                    voci.append({"da": parole[k]["da"], "etichetta": str(v.get("etichetta", ""))[:24]})
                    pos = k + 1
            if voci:
                tracker = {"totale": max(len(voci), int(tr.get("totale") or len(voci))), "voci": voci}
        pal = dict(PALETTE_BASE)
        for k2, v in (P.get("palette") or {}).items():
            if k2 in pal and isinstance(v, str) and re.match(r"^(#[0-9a-fA-F]{6}|rgba?\([0-9., ]+\))$", v.strip()):
                pal[k2] = v.strip()
        base = os.path.join(pub, f"{sigla}_base.mp4")
        self.ff(["-i", video, "-an", "-c:v", "copy", base], "persona")
        volto = segmenti[0].get("_volto") or {"cx": 0.5, "cy": 0.32}
        props = {"durata": round(totale, 3), "fps": FPS, "video": os.path.basename(base), "volto": {"cx": volto["cx"], "cy": volto["cy"]},
                 "palette": pal, "font": P.get("font_split") or {}, "parole": parole, "righe": rr, "scene": scene, "tracker": tracker}
        pj = os.path.join(self.tmp, "split.json")
        with open(pj, "w") as f:
            json.dump(props, f, ensure_ascii=False)
        self.avvisa("vfx", f"animo {len(scene)} grafiche sopra la persona" + (f" con la barra {len(tracker['voci'])}/{tracker['totale']}" if tracker else "") + " (Remotion)")
        anim = os.path.join(self.tmp, "split.mp4")
        try:
            p = subprocess.run(["npx", "remotion", "render", "src/index.ts", "Split", anim, f"--props={pj}", "--codec=h264", "--crf=16", "--muted",
                                "--concurrency=2", "--log=error"], cwd=GRAFICHE, capture_output=True, text=True, timeout=2400)
            if p.returncode != 0 or not os.path.exists(anim):
                raise RuntimeError("render delle grafiche non riuscito: " + (p.stderr or p.stdout)[-500:])
        finally:
            for x in os.listdir(pub):
                if x.startswith(sigla):
                    os.remove(os.path.join(pub, x))
        eventi_sfx = [("whoosh", s["da"] - 0.1, 0.35 if not s["pieno"] else 0.6) for s in scene[1:]]
        mixwav = self.mix_sfx(voce, eventi_sfx, totale, os.path.join(self.tmp, "mix.wav"))
        ass = os.path.join(self.tmp, "vuoto.ass")
        with open(ass, "w", encoding="utf-8") as f:
            f.write(self.intestazione_ass(["Vuoto,Arial,20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1"]))
        self.avvisa("audio", "voce pulita, whoosh sui cambi di grafica, volume a −14 LUFS")
        self.finale(anim, ass, mixwav, totale, out_finale)
        rep = self.revisiona(out_finale)
        rep["secondi_di_lavoro"] = round(time.time() - t0)
        rep["formato"] = "split_grafico"
        rep["grafiche"] = len(scene)
        self.avvisa("revisore", f"controllo: {rep['durata']}s · {len(scene)} grafiche · {rep['lufs']} LUFS" + (" · ⚠ " + "; ".join(rep["problemi"]) if rep["problemi"] else " · tutto ok"))
        return rep


FORMATI = {"talking_head": TalkingHead, "carosello": Carosello, "split_grafico": SplitGrafico}


def montatore_per(piano):
    return FORMATI.get(piano.get("formato"), Montatore)
