"""L'OCCHIO DEL VIDEOMAKER — gratis, senza intelligenza artificiale a pagamento (OpenCV sul motore GitHub).

Guarda la clip come la guarda un videomaker, 10 volte al secondo, e per ogni istante sa:
  - CAMERA: si muove? trema (vibrazione) o fa una panoramica/carrellata regolare? scatta?
  - SOGGETTO: cosa si muove nell'inquadratura al netto del movimento di camera, dove (riquadro) e quanto
  - AZIONE: quando inizia e finisce un gesto (il panettone che scivola, la glassa che cola, le mani che lavorano)
  - FUOCO: nitidezza, e se il fuoco "va e viene"
  - LUCE: bianchi bruciati, neri chiusi, sfarfallio
  - PERSONE: volti in campo
Da qui sceglie il tratto da montare: l'AZIONE sul prodotto, intera (taglio sull'azione), con camera ferma,
a fuoco e ben esposta, e il centro dell'inquadratura 9:16 sul punto dove succede.

Uso:  python3 occhio.py clip.mp4 [ruota] [durata_pezzo]   -> scheda JSON + tratto consigliato
"""
import json, math, subprocess, sys

import cv2
import numpy as np

FPS = 10          # fotogrammi analizzati al secondo
LARGO = 240       # larghezza di analisi (veloce: una clip da 30 s si guarda in pochi secondi)


def leggi(path, ruota=0, inizio=0.0, durata=None):
    """Fotogrammi a colori (BGR), già raddrizzati, a FPS fissi."""
    vf = [f"fps={FPS}"]
    if ruota == 90:
        vf.append("transpose=1")
    elif ruota == -90:
        vf.append("transpose=2")
    elif ruota == 180:
        vf.append("hflip,vflip")
    vf.append(f"scale={LARGO}:-2")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{inizio:.3f}"]
    if durata:
        cmd += ["-t", f"{durata:.3f}"]
    cmd += ["-i", path, "-vf", ",".join(vf), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.run(cmd, capture_output=True)
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                         "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")
    w0, h0 = int(pr[0]), int(pr[1])
    if ruota in (90, -90):
        w0, h0 = h0, w0
    h = int(round(LARGO * h0 / w0 / 2) * 2)
    n = len(p.stdout) // (LARGO * h * 3)
    return np.frombuffer(p.stdout[: n * LARGO * h * 3], np.uint8).reshape(n, h, LARGO, 3)


_VOLTI = None


def volti(grigio):
    global _VOLTI
    if _VOLTI is None:
        try:
            _VOLTI = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        except Exception:
            _VOLTI = False
    if not _VOLTI or _VOLTI.empty():  # versioni di OpenCV senza il rilevatore di volti: lo salto
        return []
    f = _VOLTI.detectMultiScale(grigio, 1.15, 5, minSize=(18, 18))
    return [tuple(int(v) for v in x) for x in f]


def guarda(path, ruota=0):
    """La scheda del videomaker: una riga ogni 1/FPS secondi."""
    fr = leggi(path, ruota)
    if len(fr) < 3:
        return {"righe": [], "w": LARGO, "h": 0}
    h, w = fr.shape[1:3]
    piccolo = (w // 2, h // 2)
    grigi = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in fr]
    righe = []
    prec = None
    for i, g in enumerate(grigi):
        r = {"t": round(i / FPS, 2)}
        lap = cv2.Laplacian(g, cv2.CV_64F)
        r["nitido"] = float(lap.var())
        r["luce"] = float(g.mean())
        r["bruciato"] = float((g >= 250).mean())
        r["chiuso"] = float((g <= 6).mean())
        if i % 5 == 0:
            r["volti"] = volti(g)
        if prec is not None:
            # 1) movimento della CAMERA: modello globale (traslazione + rotazione + zoom) sui punti dell'immagine
            pts = cv2.goodFeaturesToTrack(prec, 250, 0.01, 6)
            cam = np.eye(2, 3, dtype=np.float32)
            if pts is not None and len(pts) >= 12:
                nxt, st, _ = cv2.calcOpticalFlowPyrLK(prec, g, pts, None, winSize=(21, 21), maxLevel=3)
                ok = st.reshape(-1) == 1
                # la camera si giudica sullo SFONDO (bordi dell'inquadratura): un oggetto grande che entra davanti
                # (il panettone spinto verso la camera, una mano) non deve sembrare la camera che si muove
                p0 = pts.reshape(-1, 2)
                bordo = ((p0[:, 0] < w * 0.22) | (p0[:, 0] > w * 0.78) | (p0[:, 1] < h * 0.18) | (p0[:, 1] > h * 0.82)) & ok
                scelti = bordo if bordo.sum() >= 10 else ok
                if scelti.sum() >= 8:
                    M, inl = cv2.estimateAffinePartial2D(pts[scelti], nxt[scelti], method=cv2.RANSAC, ransacReprojThreshold=1.0)
                    if M is not None:
                        # se lo sfondo è quasi fermo per la maggior parte dei punti, la camera è ferma: il resto è soggetto
                        mov = np.hypot(*(nxt[scelti] - pts[scelti]).reshape(-1, 2).T)
                        if np.median(mov) < 0.35:
                            M = np.eye(2, 3)
                        cam = M.astype(np.float32)
            dx, dy = float(cam[0, 2]), float(cam[1, 2])
            rot = math.degrees(math.atan2(cam[1, 0], cam[0, 0]))
            zoom = math.hypot(cam[0, 0], cam[1, 0])
            r["camera"] = [round(dx, 2), round(dy, 2), round(rot, 3), round(zoom, 4)]
            # 2) movimento del SOGGETTO: flusso denso meno il movimento di camera = ciò che si muove davvero nella scena
            a, b = cv2.resize(prec, piccolo), cv2.resize(g, piccolo)
            flow = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 15, 3, 5, 1.2, 0)
            yy, xx = np.mgrid[0:piccolo[1], 0:piccolo[0]].astype(np.float32)
            cs = cam.copy()
            cs[:, 2] /= 2
            gx = cs[0, 0] * xx + cs[0, 1] * yy + cs[0, 2] - xx
            gy = cs[1, 0] * xx + cs[1, 1] * yy + cs[1, 2] - yy
            res = np.hypot(flow[..., 0] - gx, flow[..., 1] - gy)
            res = cv2.GaussianBlur(res, (5, 5), 0)
            r["soggetto"] = round(float(np.percentile(res, 97)), 3)
            maschera = (res > max(0.6, float(np.percentile(res, 92)))).astype(np.uint8)
            maschera = cv2.morphologyEx(maschera, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, lab, stats, cent = cv2.connectedComponentsWithStats(maschera)
            if n > 1 and r["soggetto"] > 0.6:
                k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
                x, y, ww, hh, area = stats[k]
                if area > 12:
                    pw, ph = piccolo
                    r["dove"] = [round(x / pw, 3), round(y / ph, 3), round((x + ww) / pw, 3), round((y + hh) / ph, 3)]
        righe.append(r)
        prec = g
    return {"righe": righe, "w": w, "h": h, "fps": FPS, "durata": round(len(fr) / FPS, 2)}


def leggi_scheda(scheda):
    """Dalla scheda grezza ai giudizi del videomaker, istante per istante e per tratti."""
    R = scheda["righe"]
    if len(R) < 4:
        return {"istanti": [], "azioni": [], "problemi": []}
    w = scheda["w"]
    cam = np.array([r.get("camera", [0, 0, 0, 1]) for r in R], np.float32)
    trasl = np.hypot(cam[:, 0], cam[:, 1]) / w * 100            # % della larghezza per fotogramma
    rot = np.abs(cam[:, 2])
    # tremolio = parte "nervosa" del movimento di camera (oscillazione attorno alla media mobile): una panoramica
    # lenta e regolare ha traslazione costante e tremolio basso
    liscio = np.convolve(cam[:, 0], np.ones(5) / 5, "same"), np.convolve(cam[:, 1], np.ones(5) / 5, "same")
    trem = np.hypot(cam[:, 0] - liscio[0], cam[:, 1] - liscio[1]) / w * 100 + rot * 0.5
    sog = np.array([r.get("soggetto", 0) for r in R], np.float32)
    nit = np.array([r["nitido"] for r in R], np.float32)
    nit_rel = nit / max(1.0, float(np.percentile(nit, 90)))
    luce = np.array([r["luce"] for r in R], np.float32)
    bruc = np.array([r["bruciato"] for r in R], np.float32)
    chiu = np.array([r["chiuso"] for r in R], np.float32)
    sfarf = np.abs(np.diff(luce, prepend=luce[0]))
    ist = []
    for i, r in enumerate(R):
        camera = "ferma" if trasl[i] < 0.25 and trem[i] < 0.2 else "trema" if trem[i] > 0.45 or trasl[i] > 3 else "si muove"
        ist.append({"t": r["t"], "camera": camera, "tremolio": round(float(trem[i]), 3), "spostamento": round(float(trasl[i]), 3),
                    "azione": round(float(sog[i]), 2), "dove": r.get("dove"), "fuoco": round(float(nit_rel[i]), 2),
                    "luce": round(float(luce[i])), "bruciato": round(float(bruc[i]), 3), "chiuso": round(float(chiu[i]), 3),
                    "sfarfallio": round(float(sfarf[i]), 1), "volti": r.get("volti")})
    # AZIONI: tratti in cui il soggetto si muove davvero (sopra il "rumore" della clip) per almeno 0,4 s
    base = float(np.percentile(sog, 30))
    soglia = max(0.9, base * 2.2)
    attivo = np.convolve((sog > soglia).astype(float), np.ones(3) / 3, "same") > 0.5
    azioni, i = [], 0
    while i < len(attivo):
        if attivo[i]:
            j = i
            while j + 1 < len(attivo) and (attivo[j + 1] or (j + 2 < len(attivo) and attivo[j + 2])):
                j += 1
            if (j - i + 1) / FPS >= 0.4:
                box = [r["dove"] for r in R[i:j + 1] if r.get("dove")]
                if box:
                    b = np.array(box)
                    riq = [float(np.percentile(b[:, 0], 10)), float(np.percentile(b[:, 1], 10)), float(np.percentile(b[:, 2], 90)), float(np.percentile(b[:, 3], 90))]
                else:
                    riq = None
                azioni.append({"da": R[i]["t"], "a": R[j]["t"], "picco": R[i + int(np.argmax(sog[i:j + 1]))]["t"],
                               "forza": round(float(sog[i:j + 1].mean()), 2), "dove": [round(v, 3) for v in riq] if riq else None,
                               "camera_trema": bool((trem[i:j + 1] > 0.45).mean() > 0.3)})
            i = j + 1
        else:
            i += 1
    # PROBLEMI che un videomaker scarterebbe
    problemi = []

    def tratti(cond, tipo, nota):
        k = 0
        while k < len(cond):
            if cond[k]:
                j = k
                while j + 1 < len(cond) and cond[j + 1]:
                    j += 1
                if (j - k + 1) / FPS >= 0.3:
                    problemi.append({"da": R[k]["t"], "a": R[j]["t"], "tipo": tipo, "nota": nota})
                k = j + 1
            else:
                k += 1
    tratti(trem > 0.45, "camera_trema", "camera a mano che vibra")
    tratti(trasl > 4, "camera_scatta", "movimento di camera brusco")
    tratti(nit_rel < 0.45, "sfocato", "fuori fuoco o mosso")
    tratti(bruc > 0.08, "bruciato", "bianchi bruciati")
    tratti(chiu > 0.35, "buio", "neri chiusi")
    tratti(sfarf > 6, "sfarfallio", "la luce salta")
    return {"istanti": ist, "azioni": azioni, "problemi": problemi, "durata": scheda.get("durata")}


def tratto_migliore(lettura, durata, vicino=None, preferisci_azione=True):
    """Il tratto da montare come lo sceglierebbe un videomaker:
    - se c'è un'AZIONE sul soggetto, il pezzo la contiene intera (parte ~0,3 s prima che inizi = taglio sull'azione);
    - camera che non trema, a fuoco, luce giusta;
    - mai dentro un problema.
    Ritorna {in, voto (0-1, alto = meglio), motivo, centro_x, centro_y} oppure None."""
    ist = lettura["istanti"]
    if not ist:
        return None
    n = len(ist)
    lung = max(1, int(round(durata * FPS)))
    if lung > n:
        return None
    t = np.array([x["t"] for x in ist])
    trem = np.array([x["tremolio"] for x in ist])
    fuoco = np.array([x["fuoco"] for x in ist])
    azione = np.array([x["azione"] for x in ist])
    bruc = np.array([x["bruciato"] for x in ist])
    chiu = np.array([x["chiuso"] for x in ist])
    azmax = max(1.0, float(np.percentile(azione, 95)))
    migliore = None
    for s in range(0, n - lung + 1):
        e = s + lung
        f = float(np.clip(fuoco[s:e].mean(), 0, 1))
        stabil = float(np.clip(1 - trem[s:e].mean() / 0.45, 0, 1)) * float(np.clip(1 - (trem[s:e] > 0.6).mean() * 3, 0, 1))
        luce = 1 - float(np.clip((bruc[s:e] > 0.08).mean() + (chiu[s:e] > 0.35).mean(), 0, 1))
        att = float(np.clip(azione[s:e].mean() / azmax, 0, 1))
        # azione intera: premio se un gesto inizia e finisce dentro il tratto, penalità se viene tagliato a metà
        intera, tagliata, gesto = 0.0, 0.0, None
        for a in lettura["azioni"]:
            if a["camera_trema"]:
                continue
            dentro = min(t[e - 1], a["a"]) - max(t[s], a["da"])
            if dentro <= 0:
                continue
            lun_a = a["a"] - a["da"] + 0.1
            if t[s] <= a["da"] + 0.05 and t[e - 1] >= a["a"] - 0.05:
                if intera < 1.0 or (gesto and a["forza"] > gesto[2]):
                    gesto = (a["da"], a["a"], a["forza"])
                intera = max(intera, 1.0)
            else:
                intera = max(intera, 0.6 * dentro / lun_a)
                if t[s] > a["da"] + 0.3:
                    tagliata = max(tagliata, 0.3)  # entro a gesto già iniziato
        voto = 0.30 * stabil + 0.25 * f + 0.10 * luce + (0.20 * att + 0.25 * intera - tagliata if preferisci_azione else 0.15 * (1 - att))
        if vicino is not None:
            voto -= 0.01 * abs(t[s] - vicino)
        if migliore is None or voto > migliore[0]:
            migliore = (voto, s, e, stabil, f, att, intera, gesto)
    voto, s, e, stabil, f, att, intera, gesto = migliore
    dove = [x["dove"] for x in ist[s:e] if x["dove"] and x["azione"] > 0.9]
    cx = cy = None
    if dove:
        d = np.array(dove)
        cx = round(float(np.median((d[:, 0] + d[:, 2]) / 2)), 3)
        cy = round(float(np.median((d[:, 1] + d[:, 3]) / 2)), 3)
    motivo = ("azione intera" if intera >= 1 else "azione" if att > 0.4 else "tratto fermo") + \
             f", camera {'stabile' if stabil > 0.7 else 'un po’ mossa'}, fuoco {'buono' if f > 0.7 else 'morbido'}"
    # entro 0,3 s prima dell'azione (taglio sull'azione) se c'è spazio
    t_in = float(t[s])
    return {"in": round(t_in, 2), "voto": round(float(voto), 3), "motivo": motivo, "centro_x": cx, "centro_y": cy,
            "stabile": round(stabil, 2), "fuoco": round(f, 2), "azione": round(att, 2),
            "gesto": [gesto[0], gesto[1]] if gesto else None}


def scheda_breve(lettura, posizioni=True):
    """Testo compatto per il Regista (il cervello che decide il racconto): cosa succede e quando, in una riga per tratto."""
    out = []
    for a in lettura["azioni"]:
        d = a["dove"]
        pos = ""
        if d and posizioni:
            cx = (d[0] + d[2]) / 2
            pos = " a sinistra" if cx < 0.38 else " a destra" if cx > 0.62 else " al centro"
        out.append(f"{a['da']:.1f}-{a['a']:.1f}s azione{pos}" + (" (camera che trema)" if a["camera_trema"] else ""))
    for p in lettura["problemi"]:
        out.append(f"{p['da']:.1f}-{p['a']:.1f}s {p['nota']}")
    return "; ".join(out) or "nessuna azione: inquadratura ferma"


if __name__ == "__main__":
    src = sys.argv[1]
    ruota = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 3.4
    sc = guarda(src, ruota)
    le = leggi_scheda(sc)
    print(json.dumps({"azioni": le["azioni"], "problemi": le["problemi"], "breve": scheda_breve(le),
                      "consigliato": tratto_migliore(le, dur)}, ensure_ascii=False, indent=1))
