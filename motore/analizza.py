#!/usr/bin/env python3
"""Motore clip di Momento Reel (gira su GitHub Actions).

Chiede alla regia (Cloudflare) se ci sono clip da preparare, le scarica da pCloud,
legge i dati tecnici veri (ffprobe), ne fa una copia leggera 720p (ffmpeg) e la manda alla regia,
che la fa guardare ad Ada (Gemini). Qui non c'è nessuna chiave: il motore si presenta con
l'identità OIDC firmata da GitHub e ogni lavoro ha un lasciapassare usa-e-getta.
Solo libreria standard + ffmpeg.
"""
import json, os, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

REGIA = os.environ.get("REGIA", "https://momento-reel.gestionalelcl.workers.dev").rstrip("/")
PCLOUD_HOSTS = os.environ.get("PCLOUD_HOSTS")  # solo per i test
DURATA_MAX = int(os.environ.get("DURATA_MAX_MIN", "45")) * 60
PARALLELO = int(os.environ.get("PARALLELO", "2"))
UA = "momento-montaggio/1.0"
INIZIO = time.time()


def log(*a):
    print(f"[motore {time.strftime('%H:%M:%S')}]", *a, flush=True)


def http(url, data=None, headers=None, method=None, timeout=600):
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data is not None else "GET"))
    req.add_header("user-agent", UA)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    return urllib.request.urlopen(req, timeout=timeout)


def token_github():
    url, tok = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"), os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if os.environ.get("TOKEN_PROVA"):
        return os.environ["TOKEN_PROVA"]
    if not url or not tok:
        sys.exit("manca l'identità OIDC di GitHub (serve 'permissions: id-token: write')")
    with http(url + "&audience=momento-reel", headers={"authorization": "bearer " + tok}) as r:
        return json.load(r)["value"]


def prossimo():
    try:
        with http(REGIA + "/api/motore/prossimo", data=b"", headers={"authorization": "Bearer " + token_github()}) as r:
            if r.status == 204:
                return None
            return json.load(r)
    except urllib.error.HTTPError as e:
        log("la regia ha risposto", e.code, e.read()[:300])
        return None


def regia(lavoro, azione, indice=None, data=b"", headers=None, timeout=900):
    q = f"?i={indice}" if indice is not None else ""
    h = {"x-pass": lavoro["pass"], **(headers or {})}
    with http(f"{REGIA}/api/motore/{lavoro['id']}/{azione}{q}", data=data, headers=h, timeout=timeout) as r:
        return json.loads(r.read() or b"{}")


def link_pcloud(lavoro, fileid):
    hosts = PCLOUD_HOSTS.split(",") if PCLOUD_HOSTS else (
        ["https://eapi.pcloud.com", "https://api.pcloud.com"] if lavoro.get("pcloud_eu") else ["https://api.pcloud.com", "https://eapi.pcloud.com"])
    ultimo = None
    for h in hosts:
        q = urllib.parse.urlencode({"code": lavoro["pcloud_code"], "fileid": fileid})
        with http(f"{h}/getpublinkdownload?{q}", timeout=60) as r:
            d = json.load(r)
        if d.get("result") == 0:
            return ("https://" if not d["hosts"][0].startswith("http") else "") + d["hosts"][0] + d["path"]
        ultimo = d
    raise RuntimeError(f"pCloud: {ultimo.get('error') or ultimo}")


def tecnico(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path],
                         capture_output=True, text=True, timeout=120).stdout
    d = json.loads(out or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), {})
    num, _, den = (v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1").partition("/")
    fps = round(float(num) / float(den), 2) if float(den or 0) else 0
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        rot = abs(int(sd.get("rotation", 0) or 0))
    if rot in (90, 270):
        w, h = h, w
    return {
        "durata_sec": round(float(d.get("format", {}).get("duration") or 0), 2),
        "risoluzione": f"{w}x{h}", "fps": fps, "codec": v.get("codec_name"),
        "orientamento": "verticale" if h > w else "orizzontale" if w > h else "quadrato",
        "audio": any(s.get("codec_type") == "audio" for s in d.get("streams", [])),
        "rallenty_possibile": fps >= 48,
    }


def alleggerisci(src, dst, fps):
    # lato lungo 1280 px (720p), max 30 fps, audio leggero: basta e avanza per farla guardare a Gemini
    vf = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'" + (",fps=30" if fps > 30 else "")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast",
           "-crf", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", dst]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError("ffmpeg: " + p.stderr.strip()[-400:])


def prepara(lavoro, c, cartella):
    nome = c["nome"]
    orig = os.path.join(cartella, f"o_{c['indice']}")
    leggera = os.path.join(cartella, f"l_{c['indice']}.mp4")
    try:
        t0 = time.time()
        try:
            with http(link_pcloud(lavoro, c["fileid"]), timeout=900) as r, open(orig, "wb") as f:
                shutil.copyfileobj(r, f, 1 << 22)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"download da pCloud non riuscito (HTTP {e.code})")
        mb = os.path.getsize(orig) / 1048576
        tec = tecnico(orig)
        alleggerisci(orig, leggera, tec["fps"])
        os.remove(orig)
        mb2 = os.path.getsize(leggera) / 1048576
        log(f"{nome}: {mb:.0f} MB → {mb2:.1f} MB in {time.time() - t0:.0f}s ({tec['risoluzione']}, {tec['fps']} fps)")
        with open(leggera, "rb") as f:
            regia(lavoro, "clip", c["indice"], data=f, headers={
                "content-type": "video/mp4", "content-length": str(os.path.getsize(leggera)),
                "x-tecnico": urllib.parse.quote(json.dumps(tec)),
            })
        log(f"{nome}: guardata da Ada")
    except urllib.error.HTTPError as e:
        log(f"{nome}: la regia ha risposto {e.code} {e.read()[:200]!r}")  # l'errore lo ha già registrato la regia
    except Exception as e:
        log(f"{nome}: ERRORE {e}")
        try:
            regia(lavoro, "errore", c["indice"], data=json.dumps({"errore": str(e)[:300]}).encode(), headers={"content-type": "application/json"})
        except Exception as e2:
            log("errore non comunicato:", e2)
    finally:
        for p in (orig, leggera):
            if os.path.exists(p):
                os.remove(p)


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg mancante")
    giri, visti = 0, set()
    while time.time() - INIZIO < DURATA_MAX:
        lavoro = prossimo()
        if not lavoro:
            log("nessuna clip da preparare" if not giri else "finito")
            return
        if lavoro["id"] in visti:  # clip da riprovare: le riprende il prossimo giro (tra 5 minuti)
            regia(lavoro, "fine", data=b"")
            log(f"lavoro #{lavoro['id']}: restano clip da riprovare al prossimo giro")
            return
        visti.add(lavoro["id"])
        giri += 1
        log(f"lavoro #{lavoro['id']}: {len(lavoro['clip'])} clip")
        cartella = tempfile.mkdtemp(prefix="clip_")
        try:
            with ThreadPoolExecutor(PARALLELO) as ex:
                list(ex.map(lambda c: prepara(lavoro, c, cartella), lavoro["clip"]))
        finally:
            shutil.rmtree(cartella, ignore_errors=True)
            try:
                regia(lavoro, "fine", data=b"")
            except Exception as e:
                log("fine non comunicata:", e)


if __name__ == "__main__":
    main()
