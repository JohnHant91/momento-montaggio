"""Prova del verso del girato su una cartella dell'Archivio (lanciata a mano da GitHub).
Per ogni clip: un fotogramma letto direttamente dal link firmato (senza scaricare il file), giudizio di Claude
(dritta / da girare), tavola di controllo cifrata con la chiave dello studio. Nel log solo numeri."""
import base64, io, json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw

REGIA = os.environ.get("REGIA", "https://momento-reel.gestionalelcl.workers.dev")


def token_github():
    url, tok = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"], os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    with urllib.request.urlopen(urllib.request.Request(url + "&audience=momento-reel", headers={"authorization": "bearer " + tok}), timeout=30) as r:
        return json.loads(r.read())["value"]


def chiama(percorso, corpo):
    req = urllib.request.Request(REGIA + percorso, data=json.dumps(corpo).encode(), method="POST",
                                 headers={"authorization": "Bearer " + token_github(), "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.loads(r.read())


def durata(url):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", url], capture_output=True, text=True, timeout=120)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


def fotogramma(f):
    d = durata(f["url"]) or 2
    p = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{d * 0.4:.2f}", "-i", f["url"], "-frames:v", "1",
                        "-vf", "scale=512:512:force_original_aspect_ratio=decrease", "-q:v", "4", "-f", "image2", "-"], capture_output=True, timeout=300)
    return p.stdout or None


def main():
    el = chiama("/api/motore/verso-prova/prendi", {})
    F = el.get("file") or []
    print(f"clip da controllare: {len(F)}")
    with ThreadPoolExecutor(8) as ex:
        jpg = list(ex.map(fotogramma, F))
    ok = [(f, j) for f, j in zip(F, jpg) if j]
    print(f"fotogrammi letti: {len(ok)}")
    r = chiama("/api/motore/verso-prova/esito", {"nomi": [f["nome"] for f, _ in ok], "immagini": [base64.b64encode(j).decode() for _, j in ok]})
    gradi = r.get("gradi") or []
    print("risultato: " + ", ".join(f"{g}" for g in gradi))
    print(f"da girare: {sum(1 for g in gradi if g)} su {len(gradi)}")
    # tavola: a sinistra il fotogramma com'è, a destra come diventa
    os.makedirs("/tmp/tavole", exist_ok=True)
    celle = []
    for (f, j), g in zip(ok, gradi + [0] * len(ok)):
        im = Image.open(io.BytesIO(j)).convert("RGB")
        dopo = im.rotate({90: -90, -90: 90, 180: 180}.get(g, 0), expand=True)
        c = Image.new("RGB", (560, 300), (20, 20, 20))
        a = im.copy(); a.thumbnail((260, 240)); b = dopo.copy(); b.thumbnail((260, 240))
        c.paste(a, (10, 50)); c.paste(b, (290, 50))
        dr = ImageDraw.Draw(c)
        dr.text((10, 8), f"{f['nome'][:40]}", fill=(255, 220, 0))
        dr.text((10, 26), f"verso: {g}", fill=(255, 255, 255) if not g else (255, 90, 90))
        celle.append(c)
    for k in range(0, len(celle), 12):
        lotto = celle[k:k + 12]
        tav = Image.new("RGB", (560 * 3, 300 * ((len(lotto) + 2) // 3)), (0, 0, 0))
        for n, c in enumerate(lotto):
            tav.paste(c, ((n % 3) * 560, (n // 3) * 300))
        tav.save(f"/tmp/tavole/verso_{k // 12 + 1:02d}.jpg", quality=85)


if __name__ == "__main__":
    main()
