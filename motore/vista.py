"""LA VISTA: un'AI open source che riconosce COSA c'è in ogni fotogramma (CLIP, gratis, gira sul motore GitHub).

L'occhio (occhio.py) sa QUANDO succede qualcosa e se la camera è buona; la vista sa COSA si vede:
"il panettone viene spostato", "mani che impastano", "la scatola porta verso la camera".
Insieme danno, secondo per secondo, quanto quel momento è SALIENTE per il racconto richiesto.

Uso: python3 vista.py clip.mp4 [ruota]  (frasi da cercare in env FRASI, separate da |, in inglese)
"""
import json, os, subprocess, sys

import numpy as np

MODELLO = os.environ.get("VISTA_MODELLO", "openai/clip-vit-base-patch32")
FPS = 2
_M = None

# cose che un videomaker NON monta mai in un reel promozionale
NEGATIVE = ["a blurry out of focus photo", "a ceiling", "a floor", "a wall", "an empty room",
            "motion blur from a moving camera", "a dark black image", "a person's back blocking the view"]


def modello():
    global _M
    if _M is None:
        import torch
        from transformers import CLIPModel, CLIPProcessor
        torch.set_num_threads(max(1, os.cpu_count() or 2))
        _M = (CLIPModel.from_pretrained(MODELLO).eval(), CLIPProcessor.from_pretrained(MODELLO), torch)
    return _M


def fotogrammi(path, ruota=0):
    vf = [f"fps={FPS}"]
    if ruota == 90:
        vf.append("transpose=1")
    elif ruota == -90:
        vf.append("transpose=2")
    elif ruota == 180:
        vf.append("hflip,vflip")
    vf.append("scale=224:224:force_original_aspect_ratio=increase,crop=224:224")
    p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vf", ",".join(vf),
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    n = len(p.stdout) // (224 * 224 * 3)
    return np.frombuffer(p.stdout[: n * 224 * 224 * 3], np.uint8).reshape(n, 224, 224, 3)


def testo(frasi):
    m, proc, torch = modello()
    with torch.no_grad():
        t = m.get_text_features(**proc(text=frasi, return_tensors="pt", padding=True))
    return t / t.norm(dim=-1, keepdim=True)


def guarda(path, frasi, ruota=0):
    """Per ogni mezzo secondo: quanto somiglia a ogni frase cercata e a ogni 'cosa da scartare'."""
    m, proc, torch = modello()
    fr = fotogrammi(path, ruota)
    if not len(fr):
        return {"t": [], "frasi": frasi, "voti": [], "scarto": []}
    tutte = list(frasi) + NEGATIVE
    T = testo(tutte)
    out = []
    with torch.no_grad():
        for i in range(0, len(fr), 32):
            im = m.get_image_features(**proc(images=list(fr[i:i + 32]), return_tensors="pt"))
            im = im / im.norm(dim=-1, keepdim=True)
            out.append((100.0 * im @ T.T).softmax(dim=-1).numpy())
    P = np.concatenate(out)
    k = len(frasi)
    return {"t": [round(i / FPS, 2) for i in range(len(P))], "frasi": frasi,
            "voti": P[:, :k].round(3).tolist(), "scarto": P[:, k:].sum(axis=1).round(3).tolist()}


def momenti(vista, soglia=0.35):
    """Tratti in cui una frase cercata domina l'immagine: [{frase, da, a, forza}]"""
    if not vista["t"]:
        return []
    V = np.array(vista["voti"])
    S = np.array(vista["scarto"])
    res = []
    for j, f in enumerate(vista["frasi"]):
        on = (V[:, j] > soglia) & (S < 0.4)
        i = 0
        while i < len(on):
            if on[i]:
                k = i
                while k + 1 < len(on) and on[k + 1]:
                    k += 1
                if k > i:  # almeno un secondo
                    res.append({"frase": f, "da": vista["t"][i], "a": round(vista["t"][k] + 1 / FPS, 2),
                                "forza": round(float(V[i:k + 1, j].mean()), 3)})
                i = k + 1
            else:
                i += 1
    return sorted(res, key=lambda r: -r["forza"])


if __name__ == "__main__":
    frasi = [x for x in (os.environ.get("FRASI") or "").split("|") if x] or ["a cake", "hands working dough"]
    v = guarda(sys.argv[1], frasi, int(sys.argv[2]) if len(sys.argv) > 2 else 0)
    print(json.dumps(momenti(v), ensure_ascii=False, indent=1))
