#!/usr/bin/env python3
"""Motore "occhi" di Momento Reel (gira su GitHub Actions). Niente Gemini.

Per ogni video da guardare (reel di riferimento o clip grezza da pCloud):
  1. lo scarica (pCloud, link mp4 di TikTok/IG via Apify, YouTube con yt-dlp)
  2. lo MISURA qui, gratis: tagli esatti (ffmpeg), durata inquadrature, nitidezza, esposizione,
     movimento, BPM della musica, parlato trascritto (Whisper)
  3. estrae i fotogrammi chiave (gancio + uno per inquadratura) in due tavole JPEG con i tempi
  4. manda misure + tavole alla regia (Cloudflare), che le fa guardare a Claude

Qui non c'è nessuna chiave: il motore si presenta con l'identità OIDC firmata da GitHub
e ogni lavoro ha un lasciapassare usa-e-getta.
"""
import base64, io, json, math, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

REGIA = os.environ.get("REGIA", "https://momento-reel.gestionalelcl.workers.dev").rstrip("/")
PCLOUD_HOSTS = os.environ.get("PCLOUD_HOSTS")  # solo per i test
DURATA_MAX = int(os.environ.get("DURATA_MAX_MIN", "50")) * 60
PARALLELO = int(os.environ.get("PARALLELO", "2"))
WHISPER_MODELLO = os.environ.get("WHISPER_MODELLO", "small")
UA = "momento-montaggio/2.0"
INIZIO = time.time()
FERMO = {"motivo": None}
_whisper = {"m": None}
import threading
_lock_whisper = threading.Lock()


def log(*a):
    print(f"[motore {time.strftime('%H:%M:%S')}]", *a, flush=True)


# ------------------------------------------------------------------ comunicazione con la regia
def http(url, data=None, headers=None, method=None, timeout=600):
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data is not None else "GET"))
    req.add_header("user-agent", UA)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    return urllib.request.urlopen(req, timeout=timeout)


def token_github():
    if os.environ.get("TOKEN_PROVA"):
        return os.environ["TOKEN_PROVA"]
    url, tok = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"), os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not tok:
        sys.exit("manca l'identità OIDC di GitHub (serve 'permissions: id-token: write')")
    with http(url + "&audience=momento-reel", headers={"authorization": "bearer " + tok}) as r:
        return json.load(r)["value"]


def prossimo():
    try:
        with http(REGIA + "/api/motore/prossimo", data=b"", headers={"authorization": "Bearer " + token_github()}) as r:
            return None if r.status == 204 else json.load(r)
    except urllib.error.HTTPError as e:
        log("la regia ha risposto", e.code, e.read()[:300])
        return None


def regia(lavoro, azione, indice=None, corpo=None, timeout=900):
    q = f"?i={indice}&tipo={lavoro['tipo']}" if indice is not None else f"?tipo={lavoro['tipo']}"
    data = json.dumps(corpo or {}).encode()
    with http(f"{REGIA}/api/motore/{lavoro['id']}/{azione}{q}", data=data, timeout=timeout,
              headers={"x-pass": lavoro["pass"], "content-type": "application/json"}) as r:
        return json.loads(r.read() or b"{}")


# ------------------------------------------------------------------ download
def link_pcloud(lavoro, fileid):
    hosts = PCLOUD_HOSTS.split(",") if PCLOUD_HOSTS else (
        ["https://eapi.pcloud.com", "https://api.pcloud.com"] if lavoro.get("pcloud_eu") else ["https://api.pcloud.com", "https://eapi.pcloud.com"])
    ultimo = None
    for h in hosts:
        q = urllib.parse.urlencode({"code": lavoro["pcloud_code"], "fileid": fileid})
        with http(f"{h}/getpublinkdownload?{q}", timeout=60) as r:
            d = json.load(r)
        if d.get("result") == 0:
            return ("" if d["hosts"][0].startswith("http") else "https://") + d["hosts"][0] + d["path"]
        ultimo = d
    raise RuntimeError(f"pCloud: {ultimo.get('error') or ultimo}")


def scarica_url(url, dest):
    try:
        with http(url, timeout=900, headers={"user-agent": "Mozilla/5.0"}) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f, 1 << 22)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"download non riuscito (HTTP {e.code}): link scaduto o non pubblico")


def scarica(lavoro, el, cartella):
    dest = os.path.join(cartella, f"v_{el['indice']}")
    if el.get("fileid"):
        scarica_url(link_pcloud(lavoro, el["fileid"]), dest)
    elif el.get("video_url"):
        scarica_url(el["video_url"], dest)
    elif el.get("url"):
        if not shutil.which("yt-dlp"):
            raise RuntimeError("yt-dlp non installato")
        p = subprocess.run(["yt-dlp", "-q", "--no-playlist", "-f", "b[height<=1080][ext=mp4]/b[height<=1080]/b", "-o", dest + ".%(ext)s", el["url"]],
                           capture_output=True, text=True, timeout=600)
        trovati = [f for f in os.listdir(cartella) if f.startswith(f"v_{el['indice']}.")]
        if p.returncode != 0 or not trovati:
            raise RuntimeError("il sito non ha lasciato scaricare il video: " + (p.stderr.strip().splitlines() or ["?"])[-1][:200])
        os.replace(os.path.join(cartella, trovati[0]), dest)
    else:
        raise RuntimeError("nessun video scaricabile")
    return dest


# ------------------------------------------------------------------ misure
def esegui(cmd, timeout=900):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def tecnico(path):
    d = json.loads(esegui(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path], 120).stdout or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), {})
    num, _, den = (v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1").partition("/")
    fps = round(float(num) / float(den), 2) if float(den or 0) else 0
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    for sd in v.get("side_data_list", []) or []:
        if abs(int(sd.get("rotation", 0) or 0)) in (90, 270):
            w, h = h, w
    return {
        "durata_sec": round(float(d.get("format", {}).get("duration") or 0), 2),
        "risoluzione": f"{w}x{h}", "fps": fps, "codec": v.get("codec_name"),
        "orientamento": "verticale" if h > w else "orizzontale" if w > h else "quadrato",
        "audio": any(s.get("codec_type") == "audio" for s in d.get("streams", [])),
        "rallenty_possibile": fps >= 48,
    }


def tagli(path, soglia):
    """Tempi esatti dei cambi d'inquadratura (rilevamento scene di ffmpeg)."""
    p = esegui(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-an", "-vf",
                f"scale=320:-2,select='gt(scene,{soglia})',showinfo", "-f", "null", "-"])
    t = [float(m) for m in re.findall(r"pts_time:([\d.]+)", p.stderr)]
    pul = []
    for x in t:  # due "tagli" a meno di 0,25 s sono lo stesso taglio (flash, transizioni)
        if not pul or x - pul[-1] > 0.25:
            pul.append(round(x, 2))
    return pul


def fotogramma(path, t, larghezza=None):
    vf = ["-vf", f"scale={larghezza}:-2"] if larghezza else []
    p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{max(t, 0):.3f}", "-i", path, "-frames:v", "1", *vf,
                        "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, timeout=120)
    if p.returncode != 0 or not p.stdout:
        return None
    return Image.open(io.BytesIO(p.stdout)).convert("RGB")


def qualita(img):
    """Nitidezza (varianza del laplaciano), luminosità, % bruciato/chiuso su un fotogramma piccolo."""
    g = np.asarray(img.convert("L").resize((480, int(480 * img.height / img.width))), dtype=np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    return {"nitidezza": round(float(lap.var()), 1), "luminosita": round(float(g.mean()), 1),
            "bruciato_pct": round(float((g > 250).mean() * 100), 1), "chiuso_pct": round(float((g < 8).mean() * 100), 1)}, g


def audio_wav(path, dest, sr=16000):
    p = esegui(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "s16le", dest], 600)
    if p.returncode != 0 or not os.path.exists(dest) or os.path.getsize(dest) < sr:
        return None
    return np.fromfile(dest, dtype=np.int16).astype(np.float32) / 32768.0


def bpm(y, sr=16000):
    """Stima del tempo: forza degli attacchi + autocorrelazione (60-180 BPM)."""
    if y is None or len(y) < sr * 4:
        return None, 0.0
    hop, win = 256, 1024
    n = 1 + (len(y) - win) // hop
    if n < 50:
        return None, 0.0
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * np.hanning(win), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(axis=1)
    flux = flux - flux.mean()
    if not flux.any():
        return None, 0.0
    ac = np.correlate(flux, flux, mode="full")[len(flux) - 1:]
    fr = sr / hop
    lag = np.arange(len(ac)) / fr
    ok = (lag >= 60 / 180) & (lag <= 60 / 60)
    if not ok.any():
        return None, 0.0
    i = np.argmax(ac * ok)
    forza = float(ac[i] / (ac[0] + 1e-9))
    return round(60 / lag[i], 1), round(forza, 2)


def volume(path):
    p = esegui(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128", "-f", "null", "-"], 600)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)
    return float(m[-1]) if m else None


def trascrivi(y):
    """Trascrizione da audio già decodificato (16 kHz mono): niente decodifica di faster-whisper/PyAV."""
    if y is None or len(y) < 16000:
        return {"presente": False}
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {"presente": None, "nota": "Whisper non installato"}
    with _lock_whisper:  # un solo modello in memoria, una trascrizione alla volta
        if _whisper["m"] is None:
            _whisper["m"] = WhisperModel(WHISPER_MODELLO, device="cpu", compute_type="int8")
        seg, info = _whisper["m"].transcribe(y, vad_filter=True, beam_size=1)
        righe = [{"da": round(s.start, 2), "a": round(s.end, 2), "testo": s.text.strip()} for s in seg if s.text.strip()]
    return {"presente": bool(righe), "lingua": info.language if righe else None, "trascrizione": righe[:80]}


# ------------------------------------------------------------------ tavole di fotogrammi
def font(dim):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, dim)
    return ImageFont.load_default()


def tavola(quadri, colonne, lato_max=1560):
    """Griglia di fotogrammi con il tempo scritto sopra, lato lungo ≤ 1560 px (ottimo per Claude)."""
    quadri = [(t, im) for t, im in quadri if im is not None]
    if not quadri:
        return None
    w0, h0 = quadri[0][1].size
    colonne = max(1, min(colonne, len(quadri)))
    righe = math.ceil(len(quadri) / colonne)
    cella_w = int(min(lato_max / colonne, lato_max / righe * w0 / h0))
    cella_h = int(cella_w * h0 / w0)
    out = Image.new("RGB", (cella_w * colonne, cella_h * righe), (12, 12, 12))
    f = font(max(14, cella_w // 11))
    d = ImageDraw.Draw(out)
    for k, (t, im) in enumerate(quadri):
        x, y = (k % colonne) * cella_w, (k // colonne) * cella_h
        out.paste(im.resize((cella_w - 4, cella_h - 4)), (x + 2, y + 2))
        etichetta = f"{t:.1f}s" if isinstance(t, (int, float)) else str(t)
        b = d.textbbox((0, 0), etichetta, font=f)
        d.rectangle([x + 4, y + 4, x + 12 + b[2], y + 10 + b[3]], fill=(0, 0, 0))
        d.text((x + 8, y + 6), etichetta, font=f, fill=(255, 220, 0))
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=82)
    return base64.b64encode(buf.getvalue()).decode()


# ------------------------------------------------------------------ analisi di un video
def analizza(lavoro, el, cartella):
    t0 = time.time()
    path = scarica(lavoro, el, cartella)
    mb = os.path.getsize(path) / 1048576
    rif = lavoro["tipo"] == "riferimenti"
    if not rif and (el.get("tipo") == "immagine" or re.search(r"\.(jpe?g|png|webp|heic)$", el.get("nome", ""), re.I)):
        return analizza_immagine(el, path, mb, t0)
    tec = tecnico(path)
    durata = tec["durata_sec"] or 1

    cuts = tagli(path, 0.30 if rif else 0.45)
    bordi = [0.0] + [c for c in cuts if 0 < c < durata] + [durata]
    shots = [(bordi[i], bordi[i + 1]) for i in range(len(bordi) - 1) if bordi[i + 1] - bordi[i] > 0.05]
    durate = [b - a for a, b in shots] or [durata]

    # fotogrammi: per i riferimenti uno al centro di ogni inquadratura, per le clip uno ogni ~2 s
    if rif:
        punti = [(a + b) / 2 for a, b in shots]
        if len(punti) > 16:
            punti = [punti[round(i * (len(punti) - 1) / 15)] for i in range(16)]
    else:
        n = int(min(12, max(4, durata // 2)))
        punti = [durata * (i + 0.5) / n for i in range(n)]
    larg = 480
    quadri = [(t, fotogramma(path, t, larg)) for t in punti]
    misure_q, grigi = [], []
    for t, im in quadri:
        if im is not None:
            q, g = qualita(im)
            misure_q.append({"t": round(t, 2), **q})
            grigi.append(g)
    movimento = [round(float(np.abs(grigi[i + 1] - grigi[i]).mean()), 1) for i in range(len(grigi) - 1)
                 if grigi[i].shape == grigi[i + 1].shape]

    immagini = []
    gancio = [(t, fotogramma(path, t, 540)) for t in [0, 0.5, 1.0, 1.5, 2.0, 2.8] if t < durata]
    if rif:
        immagini.append({"cosa": "primi 3 secondi (il gancio)", "jpeg": tavola(gancio, 3)})
    immagini.append({"cosa": "un fotogramma per inquadratura" if rif else "fotogrammi in ordine di tempo",
                     "jpeg": tavola(quadri, 4)})

    wav = os.path.join(cartella, f"a_{el['indice']}.raw")
    y = audio_wav(path, wav) if tec["audio"] else None
    tempo, forza_beat = bpm(y)
    # i tagli cadono sul beat? (distanza media dalla griglia del tempo stimato)
    sul_beat = None
    if tempo and len(cuts) >= 3:
        periodo = 60 / tempo
        scarti = [min((c % periodo), periodo - (c % periodo)) / periodo for c in cuts]
        sul_beat = round(1 - 2 * float(np.mean(scarti)), 2)  # 1 = perfettamente sul beat, ~0 = a caso
    try:
        parlato = trascrivi(y) if tec["audio"] else {"presente": False}
    except Exception as e:  # la trascrizione non deve mai bloccare l'analisi
        parlato = {"presente": None, "nota": f"trascrizione non riuscita: {str(e)[:120]}"}

    misure = {
        "tecnico": tec, "dimensione_mb": round(mb, 1),
        "tagli_sec": cuts[:120], "numero_tagli": len(cuts), "numero_inquadrature": len(shots),
        "durata_media_inquadratura_sec": round(float(np.mean(durate)), 2),
        "inquadratura_piu_breve_sec": round(min(durate), 2), "inquadratura_piu_lunga_sec": round(max(durate), 2),
        "qualita_fotogrammi": misure_q, "movimento_tra_fotogrammi": movimento,
        "volume_lufs": volume(path) if tec["audio"] else None,
        "bpm_stimato": tempo, "regolarita_beat": forza_beat, "tagli_sul_beat_indice": sul_beat,
        "parlato": parlato,
    }
    for f in (path, wav):
        if os.path.exists(f):
            os.remove(f)
    log(f"{el['nome'][:50]}: {mb:.0f} MB · {tec['risoluzione']} {tec['fps']}fps · {len(cuts)} tagli · "
        f"BPM {tempo} · parlato {'sì' if parlato.get('presente') else 'no'} · {time.time() - t0:.0f}s")
    return {"misure": misure, "immagini": [i for i in immagini if i["jpeg"]]}


def analizza_immagine(el, path, mb, t0):
    """Foto o slide di carosello: niente tempi né audio, solo l'immagine e le sue misure."""
    try:
        im = Image.open(path).convert("RGB")
    except Exception:
        im = fotogramma(path, 0)
    if im is None:
        raise RuntimeError("immagine non leggibile")
    q, _ = qualita(im)
    w, h = im.size
    misure = {"tecnico": {"tipo": "immagine", "risoluzione": f"{w}x{h}", "orientamento": "verticale" if h > w else "orizzontale" if w > h else "quadrato",
                          "durata_sec": 0, "audio": False}, "dimensione_mb": round(mb, 1), "qualita": q, "parlato": {"presente": False}}
    im.thumbnail((1400, 1400))
    os.remove(path)
    log(f"{el['nome'][:50]}: immagine {w}x{h} · {time.time() - t0:.0f}s")
    return {"misure": misure, "immagini": [{"cosa": "l'immagine (foto o slide di carosello)", "jpeg": tavola([("foto", im)], 1)}]}


def lavora_elemento(lavoro, el, cartella):
    if FERMO["motivo"]:
        return
    try:
        dati = analizza(lavoro, el, cartella)
        regia(lavoro, "elemento", el["indice"], dati)
        log(f"{el['nome'][:50]}: analizzato da Claude")
    except urllib.error.HTTPError as e:
        corpo = e.read()[:300]
        if e.code == 429:
            FERMO["motivo"] = "credito/limite Claude"
            log("Claude ha rifiutato per limite o credito: mi fermo, riprovo al prossimo giro")
        else:
            log(f"{el['nome'][:50]}: la regia ha risposto {e.code} {corpo!r}")
    except Exception as e:
        log(f"{el['nome'][:50]}: ERRORE {e}")
        try:
            regia(lavoro, "errore", el["indice"], {"errore": str(e)[:300]})
        except Exception as e2:
            log("errore non comunicato:", e2)


def invia_file(lavoro, azione, path, tipo_mime):
    with open(path, "rb") as f:
        with http(f"{REGIA}/api/motore/{lavoro['id']}/{azione}", data=f, timeout=900, headers={
                "x-pass": lavoro["pass"], "content-type": tipo_mime, "content-length": str(os.path.getsize(path))}) as r:
            return json.loads(r.read() or b"{}")


def monta(lavoro):
    """Scarica le clip del piano da pCloud e monta il reel con il montatore."""
    from montatore import anteprima, copertina
    from formati import montatore_per
    cartella = tempfile.mkdtemp(prefix="monta_")
    piano = dict(lavoro["piano"])

    def avvisa(agente, msg, livello="info"):
        log(f"[{agente}] {msg}")
        try:
            regia(lavoro, "log", corpo={"agente": agente, "messaggio": msg, "livello": livello})
        except Exception:
            pass
    try:
        chiave = lambda s: str(s.get("fileid") or s.get("url"))
        cop = piano.get("copertina") or {}
        voci = {chiave(s): s for s in (piano.get("segmenti") or []) + (piano.get("broll") or []) + (piano.get("slide") or [])
                if s.get("fileid") or s.get("url")}
        if cop.get("fileid") or cop.get("url"):
            voci.setdefault(chiave(cop), cop)
        avvisa("motore", f"scarico {len(voci)} clip")

        def prendi(k):
            s = voci[k]
            dest = os.path.join(cartella, "src_" + re.sub(r"\W+", "_", k)[-40:])
            scarica_url(link_pcloud(lavoro, s["fileid"]) if s.get("fileid") else s["url"], dest)
            return k, dest
        file_per_id = {}
        with ThreadPoolExecutor(3) as ex:
            for k, dest in ex.map(prendi, list(voci)):
                file_per_id[k] = dest
        for campo in ("segmenti", "broll", "slide"):
            if piano.get(campo):
                piano[campo] = [dict(s, file=file_per_id[chiave(s)]) for s in piano[campo] if chiave(s) in file_per_id]
        out = os.path.join(cartella, "reel.mp4")
        Classe = montatore_per(piano)
        avvisa("motore", f"formato: {piano.get('formato') or 'montaggio'}")
        m = Classe(piano, os.path.join(cartella, "lavoro"), avvisa=avvisa)
        rep = m.monta(out)
        prev = anteprima(out, os.path.join(cartella, "anteprima.jpg"))
        invia_file(lavoro, "video", out, "video/mp4")
        invia_file(lavoro, "anteprima", prev, "image/jpeg")
        cop_ok = False
        try:
            sorg = file_per_id.get(chiave(cop)) if (cop.get("fileid") or cop.get("url")) else out
            immagine = False
            if not sorg and piano.get("slide"):
                sorg, immagine = piano["slide"][0]["file"], True
            sorg = sorg or out
            sec = 0 if immagine else (float(cop.get("secondo", 0.6)) if sorg != out else 0.6)
            c = copertina(sorg, sec, cop.get("testo") or "", os.path.join(cartella, "copertina.jpg"), m.fontdir)
            invia_file(lavoro, "copertina", c, "image/jpeg")
            cop_ok = True
            avvisa("vfx", f"copertina pronta{': ' + cop['testo'] if cop.get('testo') else ''}")
        except Exception as e:
            avvisa("vfx", f"copertina non riuscita: {str(e)[:120]}", "warn")
        regia(lavoro, "esito", corpo={"revisore": rep, "copertina": cop_ok})
        avvisa("motore", f"🎬 reel consegnato: {rep['durata']} s, {rep['mb']} MB")
    except Exception as e:
        log("montaggio non riuscito:", e)
        try:
            regia(lavoro, "esito", corpo={"errore": str(e)[:500]})
        except Exception as e2:
            log("esito non comunicato:", e2)
    finally:
        shutil.rmtree(cartella, ignore_errors=True)


ATTESA_MAX = int(os.environ.get("ATTESA_MAX", "720"))  # resto sveglio 12 minuti senza lavoro: le fasi successive arrivano subito


def risveglia():
    """Prima di chiudere per limite di tempo, se c'è ancora lavoro rilancio il motore (workflow_dispatch con GITHUB_TOKEN)."""
    tok, repo = os.environ.get("GITHUB_TOKEN"), os.environ.get("GITHUB_REPOSITORY")
    if not tok or not repo:
        return
    try:
        with http(f"https://api.github.com/repos/{repo}/actions/workflows/analizza.yml/dispatches", data=json.dumps({"ref": "main"}).encode(),
                  headers={"authorization": f"Bearer {tok}", "accept": "application/vnd.github+json", "content-type": "application/json"}, method="POST"):
            log("lavoro ancora in coda: rilancio il motore")
    except Exception as e:
        log("rilancio non riuscito:", e)


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg mancante")
    giri, tentativi, ultimo = 0, {}, time.time()
    while time.time() - INIZIO < DURATA_MAX:
        lavoro = prossimo()
        if not lavoro:
            if time.time() - ultimo > ATTESA_MAX or FERMO["motivo"]:
                log("niente da guardare" if not giri else "finito: nessun nuovo lavoro")
                return
            time.sleep(15)  # gli agenti stanno pensando (scheda, regia): aspetto la fase dopo
            continue
        chiave = (lavoro["id"], lavoro["tipo"])
        tentativi[chiave] = tentativi.get(chiave, 0) + 1
        if tentativi[chiave] > 2 or FERMO["motivo"]:  # da riprovare: lo riprende il prossimo giro
            regia(lavoro, "fine", corpo={"silenzioso": True})
            log(f"lavoro #{lavoro['id']}: restano elementi da riprovare al prossimo giro")
            if FERMO["motivo"]:
                return
            time.sleep(60)
            continue
        ultimo = time.time()
        giri += 1
        if lavoro["tipo"] == "montaggio":
            log(f"lavoro #{lavoro['id']} · montaggio: {len(lavoro['piano']['segmenti'])} pezzi")
            monta(lavoro)
            ultimo = time.time()
            continue
        log(f"lavoro #{lavoro['id']} · {lavoro['tipo']}: {len(lavoro['elementi'])} video")
        cartella = tempfile.mkdtemp(prefix="occhi_")
        try:
            with ThreadPoolExecutor(PARALLELO) as ex:
                list(ex.map(lambda el: lavora_elemento(lavoro, el, cartella), lavoro["elementi"]))
        finally:
            shutil.rmtree(cartella, ignore_errors=True)
            try:
                regia(lavoro, "fine")
            except Exception as e:
                log("fine non comunicata:", e)
        ultimo = time.time()
    risveglia()


if __name__ == "__main__":
    main()
