"""Impaginatore: fotografa le slide dei caroselli (pagine HTML con i modelli dell'agenzia) a 1080x1350 con Chrome.
Gira su GitHub Actions. Il repo è pubblico: nel log solo numeri."""
import json, os, subprocess, sys, tempfile, time, urllib.request, urllib.parse, urllib.error, shutil
from concurrent.futures import ThreadPoolExecutor

REGIA = os.environ.get("REGIA", "https://momento-reel.gestionalelcl.workers.dev")
UA = "momento-impagina/1.0"


def log(*a):
    print(f"[impagina {time.strftime('%H:%M:%S')}]", *a, flush=True)


def http(url, data=None, headers=None, method=None, timeout=300):
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data is not None else "GET"))
    req.add_header("user-agent", UA)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    return urllib.request.urlopen(req, timeout=timeout)


def token_github():
    url, tok = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"), os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not tok:
        sys.exit("manca l'identità OIDC di GitHub")
    with http(url + "&audience=momento-reel", headers={"authorization": "bearer " + tok}) as r:
        return json.load(r)["value"]


def link_pcloud(job, fileid):
    hosts = ["https://eapi.pcloud.com", "https://api.pcloud.com"] if job.get("pcloud_eu") else ["https://api.pcloud.com", "https://eapi.pcloud.com"]
    for h in hosts:
        q = urllib.parse.urlencode({"code": job["pcloud_code"], "fileid": fileid})
        with http(f"{h}/getpublinkdownload?{q}", timeout=60) as r:
            d = json.load(r)
        if d.get("result") == 0:
            return ("" if d["hosts"][0].startswith("http") else "https://") + d["hosts"][0] + d["path"]
    raise RuntimeError("pCloud non dà il link")


def scarica(url, dest):
    with http(url, timeout=300) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f, 1 << 22)


def prepara_foto(src, dest):
    # foto ridotta a 2160 px (basta e avanza per 1080x1350) e girata secondo l'EXIF
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", "scale='min(2160,iw)':-2", "-q:v", "3", dest], capture_output=True, text=True)
    if p.returncode != 0 or not os.path.exists(dest):
        shutil.copy(src, dest)


CHROME = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")


def fotografa(html_path, png_path):
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox", "--force-device-scale-factor=1",
           "--window-size=1080,1350", "--virtual-time-budget=9000", "--allow-file-access-from-files", f"--screenshot={png_path}", "file://" + html_path]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if not os.path.exists(png_path):
        raise RuntimeError("chrome: " + (p.stderr.strip().splitlines() or ["?"])[-1][:120])


def main():
    tok = token_github()
    with http(REGIA + f"/api/motore/impagina/prendi?id={os.environ.get('POST') or 0}", data=b"", headers={"authorization": "Bearer " + tok}) as r:
        if r.status == 204:
            log("niente da impaginare")
            return
        job = json.load(r)
    cart = tempfile.mkdtemp(prefix="imp_")
    log(f"lavoro post #{job['id']}: {len(job['slide'])} slide")
    # foto e logo una volta sola
    foto = {}
    for s in job["slide"]:
        for f in s.get("foto") or []:
            if f["nome"] in foto:
                continue
            try:
                src = os.path.join(cart, f"orig_{len(foto)}")
                scarica(f["url"] if f.get("url") else link_pcloud(job, f["fileid"]), src)
                dest = os.path.join(cart, f"foto_{len(foto)}.jpg")
                prepara_foto(src, dest)
                foto[f["nome"]] = dest
            except Exception as e:
                log(f"una foto non scaricata ({str(e)[:60]})")
    logo = None
    if job.get("logo"):
        try:
            logo = os.path.join(cart, "logo.png")
            scarica(job["logo"], logo)
        except Exception:
            logo = None
    fatte, errori = [], []

    def una(s):
        html = s["html"]
        for nome, path in foto.items():
            html = html.replace("{{FOTO:" + nome + "}}", "file://" + path)
        html = html.replace("{{LOGO}}", "file://" + logo if logo else "")
        if "{{FOTO:" in html:  # foto mancante: fondo pieno al posto della foto
            html = html.replace("background-image:url('{{FOTO:", "background:#2a2a2a;--x:url('{{FOTO:")
        base = os.path.join(cart, s["chiave"].replace("/", "_"))
        with open(base + ".html", "w", encoding="utf-8") as fh:
            fh.write(html)
        try:
            fotografa(base + ".html", base + ".png")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", base + ".png", "-q:v", "2", base + ".jpg"], check=True)
            with open(base + ".jpg", "rb") as fh:
                dati = fh.read()
            for t in range(3):
                try:
                    with http(f"{REGIA}/api/motore/impagina/{job['id']}/slide?k={urllib.parse.quote(s['chiave'])}", data=dati, method="PUT",
                              headers={"x-pass": job["pass"], "content-type": "image/jpeg"}) as r:
                        r.read()
                    break
                except Exception:
                    if t == 2:
                        raise
                    time.sleep(3)
            return s["chiave"], None
        except Exception as e:
            return s["chiave"], str(e)[:120]

    with ThreadPoolExecutor(4) as ex:
        for k, err in ex.map(una, job["slide"]):
            (errori if err else fatte).append(err or k)
    with http(f"{REGIA}/api/motore/impagina/{job['id']}/fine", data=json.dumps({"fatte": fatte, "errori": errori}).encode(),
              headers={"x-pass": job["pass"], "content-type": "application/json"}) as r:
        r.read()
    log(f"finito: {len(fatte)} slide, {len(errori)} errori")


if __name__ == "__main__":
    main()
