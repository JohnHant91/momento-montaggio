"""GUARDA UN REEL FINITO: lo scarica dalla regia e prepara tavole di fotogrammi (4 al secondo) e la forma d'onda dell'audio,
per controllarlo a occhio. Risultato cifrato con la chiave dello studio; nel log solo numeri."""
import os, subprocess, sys, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import urllib.request
from prova_verso import token_github, UA, REGIA


def scarica(url, dest):
    h = {"user-agent": UA, "authorization": "Bearer " + token_github()}
    with urllib.request.urlopen(urllib.request.Request(url, headers=h, method="POST", data=b"{}"), timeout=900) as r, open(dest, "wb") as o:
        parti = int(r.headers.get("x-parti") or 1)
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            o.write(b)
    return parti

k = os.environ["CHIAVE"]
if k.startswith("post-"):  # slide di un post o carosello: "post-ID/N" → tutte le slide del post N in una tavola
    os.makedirs("/tmp/tavole", exist_ok=True)
    n = 0
    for i in range(1, 21):
        try:
            scarica(f"{REGIA}/api/motore/verso-prova/reel?k={urllib.parse.quote(k + '-' + str(i) + '.png')}", f"/tmp/s{i:02d}.png")
            if os.path.getsize(f"/tmp/s{i:02d}.png") < 2000:
                os.remove(f"/tmp/s{i:02d}.png"); break
            n += 1
        except Exception:
            break
    print("slide", n)
    subprocess.run(["ffmpeg", "-v", "error", "-pattern_type", "glob", "-i", "/tmp/s*.png", "-vf", f"scale=540:-2,tile={min(n, 4)}x{(n + 3) // 4}", "-frames:v", "1", "-q:v", "3", "-y", "/tmp/tavole/t000.jpg"], check=True)
    sys.exit(0)
dest = "/tmp/reel.mp4"
n = scarica(f"{REGIA}/api/motore/verso-prova/umano", dest) if k == "umano" else scarica(f"{REGIA}/api/motore/verso-prova/reel?k={urllib.parse.quote(k)}", dest)
if k == "umano":
    n = 1
    # tagli del montatore umano: dove cambia inquadratura (numeri utili per le regole)
    r = subprocess.run(["ffmpeg", "-i", dest, "-vf", "select='gt(scene,0.28)',showinfo", "-f", "null", "-"], capture_output=True, text=True).stderr
    import re
    print("tagli", " ".join(f"{float(x):.1f}" for x in re.findall(r"pts_time:([0-9.]+)", r)))
with open(dest, "ab") as o:
    for i in range(1, n):
        scarica(f"{REGIA}/api/motore/verso-prova/reel?k={urllib.parse.quote(k)}&n={i}", dest + ".p")
        o.write(open(dest + ".p", "rb").read())
os.makedirs("/tmp/tavole", exist_ok=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dest], capture_output=True, text=True).stdout.strip() or 0)
print("durata", round(dur, 1))
# tavole: 4 fotogrammi al secondo, 10 secondi per tavola (8 colonne x 5 righe), con il tempo stampato
for t in range(0, int(dur) + 1, 10):
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-t", "10", "-i", dest, "-vf",
                    f"fps=4,scale=216:384,drawtext=text='%{{eif\\:t+{t}\\:d}}.%{{eif\\:mod((t+{t})*100\\,100)\\:d\\:2}}s':x=4:y=4:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=8x5",
                    "-frames:v", "1", "-y", f"/tmp/tavole/t{t:03d}.jpg"], check=False)
subprocess.run(["ffmpeg", "-v", "error", "-i", dest, "-filter_complex", "showwavespic=s=1600x300:split_channels=0", "-frames:v", "1", "-y", "/tmp/tavole/audio.png"], check=False)
subprocess.run(["ffmpeg", "-v", "error", "-i", dest, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", "-y", "/tmp/tavole/audio.mp3"], check=False)
print("tavole", len(os.listdir("/tmp/tavole")))
