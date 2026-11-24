"""Importazione pCloud -> Archivio dell'agenzia (Cloudflare R2).
Gira su GitHub Actions: scarica i file dalla cartella pCloud e li carica nell'archivio a pezzi da 50 MB,
più file insieme. Il repo è pubblico: nel log solo numeri, mai nomi di file, cartelle o link."""
import json, os, sys, time, urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor

REGIA = os.environ.get("REGIA", "https://momento-reel.gestionalelcl.workers.dev")
UA = "momento-importa/1.0"
PARALLELI = 4


def log(*a):
    print(f"[importa {time.strftime('%H:%M:%S')}]", *a, flush=True)


def http(url, data=None, headers=None, method=None, timeout=600):
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


def regia(job, azione, i=None, corpo=None, dati=None, extra="", metodo=None):
    q = f"?i={i}" if i is not None else "?"
    h = {"x-pass": job["pass"]}
    if dati is None:
        dati = json.dumps(corpo or {}).encode()
        h["content-type"] = "application/json"
    else:
        h["content-type"] = "application/octet-stream"
    for t in range(5):
        try:
            with http(f"{REGIA}/api/motore/importa/{job['id']}/{azione}{q}{extra}", data=dati, headers=h, method=metodo, timeout=900) as r:
                return json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 409):
                raise
            if t == 4:
                raise
        except Exception:
            if t == 4:
                raise
        time.sleep(3 * (t + 1))


def link_pcloud(job, fileid):
    hosts = ["https://eapi.pcloud.com", "https://api.pcloud.com"] if job.get("pcloud_eu") else ["https://api.pcloud.com", "https://eapi.pcloud.com"]
    for h in hosts:
        q = urllib.parse.urlencode({"code": job["pcloud_code"], "fileid": fileid})
        with http(f"{h}/getpublinkdownload?{q}", timeout=60) as r:
            d = json.load(r)
        if d.get("result") == 0:
            return ("" if d["hosts"][0].startswith("http") else "https://") + d["hosts"][0] + d["path"]
    raise RuntimeError("pCloud non dà il link")


def leggi_pieno(r, n):
    buf = bytearray()
    while len(buf) < n:
        b = r.read(min(8 << 20, n - len(buf)))
        if not b:
            break
        buf += b
    return bytes(buf)


def copia(job, f):
    upload = None
    try:
        inizio = regia(job, "inizio", f["i"])
        upload, passo = inizio["upload"], inizio["parte_mb"] << 20
        parti, n = [], 1
        with http(link_pcloud(job, f["fileid"]), timeout=900) as r:
            while True:
                blocco = leggi_pieno(r, passo)
                if not blocco:
                    break
                parti.append(regia(job, "parte", f["i"], dati=blocco, extra=f"&u={urllib.parse.quote(upload)}&n={n}", metodo="PUT"))
                n += 1
                if len(blocco) < passo:
                    break
        regia(job, "fine", f["i"], {"upload": upload, "parti": parti})
        return f.get("dimensione") or 0, None
    except Exception as e:
        try:
            regia(job, "esito", f["i"], {"errore": str(e)[:200], "upload": upload})
        except Exception:
            pass
        return 0, str(e)[:120]


def main():
    tok = token_github()
    q = f"?id={os.environ.get('IMPORTAZIONE') or 0}"
    with http(REGIA + "/api/motore/importa/prendi" + q, data=b"", headers={"authorization": "Bearer " + tok}) as r:
        if r.status == 204:
            log("niente da importare")
            return
        job = json.load(r)
    file = job["file"]
    tot = sum(x.get("dimensione") or 0 for x in file)
    log(f"importazione #{job['id']}: {len(file)} file, {tot / 1073741824:.1f} GB")
    t0, fatti, gb, errori = time.time(), 0, 0, 0
    with ThreadPoolExecutor(PARALLELI) as ex:
        for byte, err in ex.map(lambda f: copia(job, f), sorted(file, key=lambda x: x.get("dimensione") or 0)):
            fatti += 1
            gb += byte
            errori += 1 if err else 0
            if err:
                log(f"un file non copiato ({err.split(':')[0][:60]})")
            if fatti % 5 == 0 or fatti == len(file):
                s = max(1, time.time() - t0)
                log(f"{fatti}/{len(file)} file · {gb / 1073741824:.1f} GB · {gb / 1048576 / s:.0f} MB/s")
                try:
                    regia(job, "vivo")
                except Exception:
                    pass
    log(f"finito: {fatti - errori} copiati, {errori} errori, {(time.time() - t0) / 60:.0f} min")


if __name__ == "__main__":
    main()
