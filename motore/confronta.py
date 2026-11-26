"""CONFRONTO CON IL MONTAGGIO UMANO (gratis, sul motore): prende il reel montato da Johnny e il girato originale,
trova ogni taglio del reel e da quale clip / da che secondo viene ogni pezzo (CLIP: regge crop, zoom e color).
Fa lo stesso col reel del montatore AI. Risultato cifrato con la chiave dello studio; nel log solo numeri."""
import json, os, subprocess, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from prova_verso import chiama, token_github, UA, REGIA
import vista as VI

RUOTE = json.loads(os.environ.get("RUOTE") or "{}")
TRASP = {90: "transpose=1", -90: "transpose=2", 180: "hflip,vflip"}


def scarica(url, dest, auth=False):
    h = {"user-agent": UA}
    if auth:
        h["authorization"] = "Bearer " + token_github()
    with urllib.request.urlopen(urllib.request.Request(url, headers=h, method="POST" if auth else "GET", data=b"{}" if auth else None), timeout=900) as r, open(dest, "wb") as o:
        parti = int(r.headers.get("x-parti") or 1)
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            o.write(b)
    return parti


def fotogrammi(path, fps, ruota=0, da=None, dur=None, lato=224):
    vf = [f"fps={fps}"] + ([TRASP[ruota]] if ruota in TRASP else []) + [f"scale={lato}:{lato}:force_original_aspect_ratio=increase,crop={lato}:{lato}"]
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"] + (["-ss", f"{da:.3f}"] if da is not None else []) + ["-i", path] + \
          (["-t", f"{dur:.3f}"] if dur else []) + ["-vf", ",".join(vf), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.run(cmd, capture_output=True)
    n = len(p.stdout) // (lato * lato * 3)
    return np.frombuffer(p.stdout[: n * lato * lato * 3], np.uint8).reshape(n, lato, lato, 3)


def emb(fr):
    m, proc, torch = VI.modello()
    out = []
    with torch.no_grad():
        for i in range(0, len(fr), 32):
            x = VI._vettore(m.get_image_features(**proc(images=list(fr[i:i + 32]), return_tensors="pt")))
            out.append((x / x.norm(dim=-1, keepdim=True)).numpy())
    return np.concatenate(out) if out else np.zeros((0, 512), np.float32)


def tagli(path):
    """tagli del reel: differenza fra fotogrammi consecutivi a 25 fps (scene detect di ffmpeg)"""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-vf", "select='gt(scene,0.28)',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    t = []
    for r in p.stderr.splitlines():
        if "pts_time:" in r:
            t.append(float(r.split("pts_time:")[1].split()[0]))
    return t


def durata(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(p.stdout.strip() or 0)


def analizza_reel(path, indice, nome_reel):
    D = durata(path)
    bordi = [0.0] + [c for c in tagli(path) if 0.3 < c < D - 0.2] + [D]
    shots = [(bordi[i], bordi[i + 1]) for i in range(len(bordi) - 1) if bordi[i + 1] - bordi[i] >= 0.25]
    out = []
    for a, b in shots:
        punti = [a + 0.12, (a + b) / 2, max(a + 0.12, b - 0.12)]
        fr = np.concatenate([fotogrammi(path, 25, 0, t, 0.04) for t in punti])
        if not len(fr):
            continue
        E = emb(fr)
        best = None
        for nome, (tt, M) in indice.items():
            s = E @ M.T  # 3 x n
            j = int(s[1].argmax())
            v = float(s[1, j])
            if best is None or v > best[0]:
                best = (v, nome, j, s)
        v, nome, j, s = best
        tt = indice[nome][0]
        t_mid = tt[j]
        # inizio e fine del pezzo nella clip (vicino al centro trovato): danno anche la velocità (rallenty)
        vic = np.abs(np.array(tt) - t_mid) < (b - a) * 2.5 + 1.5
        t_in = tt[int(np.where(vic, s[0], -9).argmax())]
        t_out = tt[int(np.where(vic, s[2], -9).argmax())]
        vel = round((t_out - t_in) / max(0.1, (b - a - 0.24)), 2)
        out.append({"reel_da": round(a, 2), "reel_a": round(b, 2), "dur": round(b - a, 2), "clip": nome, "clip_centro": round(t_mid, 2),
                    "clip_in": round(t_in, 2), "clip_out": round(t_out, 2), "velocita": vel, "somiglianza": round(v, 3)})
    print(f"{nome_reel}: {D:.1f} s, {len(out)} pezzi riconosciuti, somiglianza media {np.mean([o['somiglianza'] for o in out]):.2f}")
    return {"durata": round(D, 2), "pezzi": out}


def main():
    os.makedirs("/tmp/c", exist_ok=True)
    VI.modello()
    F = [f for f in (chiama("/api/motore/verso-prova/prendi", {}).get("file") or []) if f["nome"].lower().endswith((".mp4", ".mov"))]
    print(f"clip del girato: {len(F)}")

    def una(f):
        dest = os.path.join("/tmp/c", f["nome"])
        try:
            scarica(f["url"], dest)
            r = int(RUOTE.get(f["nome"], RUOTE.get("*sony*", 0) if f["nome"].startswith("C0") else 0))
            fr = fotogrammi(dest, 5, r)
            return f["nome"], fr
        except Exception as e:
            print("clip non letta:", str(e)[:80])
            return f["nome"], None
        finally:
            if os.path.exists(dest):
                os.remove(dest)
    indice = {}
    with ThreadPoolExecutor(3) as ex:
        for nome, fr in ex.map(una, F):
            if fr is not None and len(fr):
                indice[nome] = ([round(i / 5, 2) for i in range(len(fr))], emb(fr))
    print(f"indice: {len(indice)} clip, {sum(len(v[0]) for v in indice.values())} fotogrammi")
    res = {}
    U = chiama("/api/motore/verso-prova/umano", {})
    if U.get("url"):
        scarica(U["url"], "/tmp/umano.mp4")
        res["umano"] = analizza_reel("/tmp/umano.mp4", indice, "reel umano")
        res["umano"]["nome"] = U.get("nome")
    for k in [x for x in (os.environ.get("REEL_AI") or "").split(",") if x]:
        dest = f"/tmp/ai_{k.replace('/', '_')}.mp4"
        try:
            n = scarica(f"{REGIA}/api/motore/verso-prova/reel?k={urllib.parse.quote(k)}", dest, auth=True)
            with open(dest, "ab") as o:
                for i in range(1, n):
                    tmp = dest + ".p"
                    scarica(f"{REGIA}/api/motore/verso-prova/reel?k={urllib.parse.quote(k)}&n={i}", tmp, auth=True)
                    o.write(open(tmp, "rb").read())
            res["ai:" + k] = analizza_reel(dest, indice, "reel AI " + k)
        except Exception as e:
            print("reel AI non letto:", str(e)[:100])
    os.makedirs("/tmp/tavole", exist_ok=True)
    json.dump(res, open("/tmp/tavole/confronto.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
