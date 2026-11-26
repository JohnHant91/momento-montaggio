"""Copie leggere (480 px, dritte, keyframe ogni 0,5 s) delle clip dei pezzi di un reel già montato, per il taglio dal telefono."""
import json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from prova_verso import chiama, token_github, UA, REGIA

TRASP = {90: "transpose=1", -90: "transpose=2", 180: "hflip,vflip"}
ID = os.environ["LAVORO"]


def uno(p):
    src, out = f"/tmp/p/s{p['k']}.mp4", f"/tmp/p/o{p['k']}.mp4"
    with urllib.request.urlopen(urllib.request.Request(p["url"], headers={"user-agent": UA}), timeout=900) as r, open(src, "wb") as o:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            o.write(b)
    vf = ["fps=25"] + ([TRASP[p["ruota"]]] if p["ruota"] in TRASP else []) + ["scale=480:-2"]
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-an", "-vf", ",".join(vf), "-c:v", "libx264", "-preset", "veryfast",
                    "-g", "12", "-keyint_min", "12", "-crf", "31", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-fs", "19M", out], check=True, timeout=600)
    with open(out, "rb") as f:
        req = urllib.request.Request(f"{REGIA}/api/motore/verso-prova/proxy-su?id={ID}&k={p['k']}", data=f.read(), method="POST",
                                     headers={"authorization": "Bearer " + token_github(), "content-type": "video/mp4", "user-agent": UA})
    urllib.request.urlopen(req, timeout=300).read()
    os.remove(src)
    return os.path.getsize(out)


os.makedirs("/tmp/p", exist_ok=True)
P = chiama(f"/api/motore/verso-prova/proxy-lista?id={ID}", {}).get("pezzi") or []
with ThreadPoolExecutor(4) as ex:
    mb = list(ex.map(uno, P))
chiama(f"/api/motore/verso-prova/proxy-fatto?id={ID}", {})
print(f"copie: {len(mb)}, {sum(mb) / 1048576:.1f} MB in tutto")
