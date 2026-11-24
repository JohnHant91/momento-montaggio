"""Motore grafico HyperFrames (HeyGen, Apache 2.0): costruisce la composizione HTML del reel e la renderizza in MP4.

Le animazioni riprendono i pezzi del catalogo HyperFrames (registry/components):
- caption-pill-karaoke: sottotitoli a pillola, la parola detta si accende (qui sotto il mento, mai sul viso)
- headline-slam: il gancio che sbatte a schermo sopra la testa, parole chiave colorate
- count-up: il numero che scorre fino al valore detto
- grain-overlay + vignette: la grana e i bordi scuri del look
- cta-close: la chiusura "segui" e la dissolvenza al bianco (mai troncata)
Regole della skill talking-head-reel: tutto nella safe zone di Reels/TikTok/Shorts, testi mai sul viso.
"""
import html
import json
import os
import re
import shutil
import subprocess
import time

W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM = 250, 1500  # sopra e sotto ci sono l'interfaccia di Instagram/TikTok


def _norm(s):
    return re.sub(r"[^a-z0-9àèéìòù]", "", str(s).lower())


def costruisci(progetto, video, totale, parole, righe, volto, P, fps=30):
    """Scrive index.html nella cartella del progetto. parole: [{t, da, a}], righe: [[indici]], volto: {cx, cy} (0-1)."""
    os.makedirs(progetto, exist_ok=True)
    shutil.copy(video, os.path.join(progetto, "base.mp4"))
    pal = P.get("palette") or {}
    accento = pal.get("accento") if re.match(r"^#[0-9a-fA-F]{6}$", str(pal.get("accento", ""))) else "#FFD43B"
    evid = {_norm(x) for x in (P.get("evidenzia") or []) if _norm(x)}
    cy = float((volto or {}).get("cy", 0.32))
    y_mento = min(1380, max(1050, int((cy + 0.17) * H)))
    # gancio sopra la testa se c'è spazio; se il viso è alto nell'inquadratura (es. avatar HeyGen) va sul petto, mai sugli occhi
    sopra = int((cy - 0.13) * H) - SAFE_TOP
    if sopra >= 300:
        y_gancio, alt_gancio = SAFE_TOP + 10, sopra - 10
    else:
        y_gancio, alt_gancio = y_mento - 60, 380
    y_numeri = y_mento + 130 if y_mento + 130 + 300 < SAFE_BOTTOM + 200 else SAFE_TOP  # i numeri sotto i sottotitoli, non sul viso

    # gancio: la prima frase (o quella scelta dal regista), fino alla fine della prima riga
    prima = righe[0] if righe else []
    # massimo 8 parole: se la prima frase è più lunga, il gancio finisce lì e i sottotitoli riprendono dalla parola dopo
    usate = prima[:8]
    fine_gancio = parole[usate[-1]]["a"] + 0.2 if usate else 2.5
    testo_gancio = str(P.get("gancio") or " ".join(parole[i]["t"] for i in usate)).strip()[:60]

    # numeri: grafiche "numero" del regista sulla parola detta → contatore che scorre
    numeri, pos = [], 0
    for g in P.get("grafiche") or []:
        if g.get("tipo") != "numero":
            continue
        d = g.get("dati") or {}
        val = str(d.get("valore", "")).strip()
        m = re.match(r"^([^\d-]*)(-?[\d.,]+)(.*)$", val)
        if not m:
            continue
        ch = _norm(str(g.get("sulla_parola", "")).split(" ")[0])
        k = next((i for i in range(pos, len(parole)) if ch and _norm(parole[i]["t"]).startswith(ch)), None)
        if k is None:
            continue
        pos = k + 1
        n = float(m.group(2).replace(".", "").replace(",", "."))
        numeri.append({"da": max(0.0, parole[k]["da"] - 0.1), "pre": m.group(1), "n": n, "dec": 1 if "," in m.group(2) else 0,
                       "post": m.group(3), "etichetta": str(d.get("etichetta", ""))[:40]})
    for i, x in enumerate(numeri):
        x["a"] = min(x["da"] + 2.6, numeri[i + 1]["da"] - 0.1 if i + 1 < len(numeri) else totale - 3)

    cta = str(P.get("cta") or "Seguimi per altri consigli")[:40]
    dati = {
        "totale": round(totale, 3), "accento": accento, "yMento": y_mento, "yGancio": y_gancio, "altGancio": alt_gancio, "yNumeri": y_numeri,
        "parole": [{"t": p["t"], "da": round(p["da"], 3), "a": round(p["a"], 3), "k": _norm(p["t"]) in evid} for p in parole],
        "righe": righe, "gancio": testo_gancio, "fineGancio": round(fine_gancio, 3),
        "evidGancio": [w for w in testo_gancio.split() if _norm(w) in evid] or [max(testo_gancio.split() or [""], key=len)],
        "numeri": numeri, "cta": cta,
    }
    pagina = PAGINA.replace("__DATI__", json.dumps(dati, ensure_ascii=False)).replace("__DUR__", f"{totale:.3f}").replace("__FPS__", str(fps))
    with open(os.path.join(progetto, "index.html"), "w", encoding="utf-8") as f:
        f.write(pagina)
    return dati


def renderizza(progetto, out, avvisa=None, timeout=2400):
    """Render con la CLI di HyperFrames (Chrome senza finestra + FFmpeg, gratis sul runner GitHub)."""
    t0 = time.time()
    p = subprocess.run(["npx", "-y", "hyperframes@latest", "render", "--output", out], cwd=progetto, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0 or not os.path.exists(out):
        raise RuntimeError("render HyperFrames non riuscito: " + (p.stderr or p.stdout)[-600:])
    if avvisa:
        avvisa("vfx", f"grafiche HyperFrames renderizzate in {round(time.time() - t0)} s")
    return out


def tavola(video, out, tempi):
    """Tavola di controllo: i fotogrammi chiave affiancati (da far approvare a Johnny prima del render completo)."""
    pezzi = []
    for i, t in enumerate(tempi):
        f = f"{out}_{i}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf", "scale=360:-1", f], check=False)
        if os.path.exists(f):
            pezzi.append(f)
    if not pezzi:
        return None
    args = ["ffmpeg", "-v", "error", "-y"]
    for f in pezzi:
        args += ["-i", f]
    args += ["-filter_complex", f"hstack=inputs={len(pezzi)}" if len(pezzi) > 1 else "null", out]
    subprocess.run(args, check=False)
    return out if os.path.exists(out) else None


PAGINA = r"""<!doctype html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
  #main { position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: Montserrat, Inter, sans-serif; }
  #camera { position: absolute; inset: 0; transform-origin: 50% 35%; }
  #base { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
  .strato { position: absolute; inset: 0; pointer-events: none; }
  /* grain-overlay + vignette (catalogo HyperFrames) */
  #vignetta { background: radial-gradient(ellipse at 50% 42%, transparent 52%, rgba(0,0,0,.42) 100%); }
  #grana { opacity: .07; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
  /* headline-slam: il gancio */
  #gancio { position: absolute; left: 60px; right: 60px; display: flex; flex-wrap: wrap; justify-content: center; gap: 0 22px;
    font-weight: 900; font-size: 96px; line-height: .95; letter-spacing: -2px; text-transform: uppercase; color: #fff; text-align: center;
    text-shadow: 0 10px 40px rgba(0,0,0,.55), 0 2px 0 rgba(0,0,0,.35); }
  #gancio .w { display: inline-block; opacity: 0; }
  #gancio .acc { color: var(--acc); }
  /* caption-pill-karaoke: sottotitoli sotto il mento */
  #sotto { position: absolute; left: 90px; right: 90px; height: 220px; }
  .gruppo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; }
  .pill { padding: 16px 40px 18px; border-radius: 26px; background: rgba(255,255,255,.96); box-shadow: 0 10px 34px rgba(0,0,0,.28);
    max-width: 900px; display: flex; flex-wrap: wrap; justify-content: center; gap: 0 18px; font-weight: 800; font-size: 64px; line-height: 1.12; color: #9a9a9a; }
  .pill .p { display: inline-block; }
  .pill .p.k { color: var(--acc) !important; }
  /* count-up */
  .numero { position: absolute; left: 50%; top: 260px; white-space: nowrap; transform: translateX(-50%); opacity: 0; text-align: center; color: #fff;
    background: rgba(12,12,14,.72); backdrop-filter: blur(14px); border: 2px solid rgba(255,255,255,.16); border-radius: 34px; padding: 26px 56px 30px; }
  .numero .v { font-weight: 900; font-size: 128px; line-height: 1; color: var(--acc); font-variant-numeric: tabular-nums; }
  .numero .e { font-weight: 700; font-size: 40px; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; }
  /* cta-close */
  #cta { position: absolute; left: 50%; top: 1240px; transform: translateX(-50%); opacity: 0; display: flex; align-items: center; gap: 22px;
    background: var(--acc); color: #111; font-weight: 900; font-size: 54px; padding: 22px 46px; border-radius: 999px; box-shadow: 0 16px 40px rgba(0,0,0,.35); white-space: nowrap; }
  #lampo, #bianco { background: #fff; opacity: 0; }
</style>
</head>
<body>
<div id="main" data-composition-id="main" data-start="0" data-duration="__DUR__" data-fps="__FPS__" data-width="1080" data-height="1920">
  <div id="camera"><video id="base" class="clip" src="base.mp4" muted playsinline data-start="0" data-duration="__DUR__" data-track-index="0"></video></div>
  <div id="vignetta" class="strato"></div>
  <div id="grana" class="strato"></div>
  <div id="gancio"></div>
  <div id="sotto"></div>
  <div id="numeri" class="strato"></div>
  <div id="cta"><span>♥</span><span id="cta-t"></span></div>
  <div id="bianco" class="strato"></div>
</div>
<script>
  var D = __DATI__;
  var root = document.getElementById("main");
  root.style.setProperty("--acc", D.accento);
  var tl = gsap.timeline({ paused: true });

  // camera: push-in lento continuo (la punch zoom a ogni frase è già nel video)
  tl.fromTo("#camera", { scale: 1.0 }, { scale: 1.06, duration: D.totale, ease: "none" }, 0);

  // gancio sopra la testa: parole che sbattono una dopo l'altra, poi escono prima dei sottotitoli
  var g = document.getElementById("gancio");
  g.style.top = D.yGancio + "px";
  var acc = D.evidGancio.map(function (x) { return x.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, ""); });
  D.gancio.split(/\s+/).forEach(function (w, i) {
    var s = document.createElement("span");
    s.className = "w" + (acc.indexOf(w.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, "")) >= 0 ? " acc" : "");
    s.textContent = w;
    g.appendChild(s);
    tl.fromTo(s, { opacity: 0, scale: 2.2, y: -30 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: "back.out(2.2)" }, 0.08 + i * 0.09);
  });
  // il gancio sta in massimo 2-3 righe sopra la testa: il carattere si stringe finché ci sta
  var fs = 96;
  g.style.fontSize = fs + "px";
  while (g.scrollHeight > D.altGancio && fs > 54) { fs -= 4; g.style.fontSize = fs + "px"; }
  tl.to("#gancio", { opacity: 0, y: -40, duration: 0.25, ease: "power2.in" }, D.fineGancio);

  // sottotitoli: 1-4 parole per pillola, la parola detta si accende, le parole chiave nel colore d'accento
  var sotto = document.getElementById("sotto");
  sotto.style.top = (D.yMento - 110) + "px";
  var gruppi = [];
  D.righe.forEach(function (r) {
    for (var i = 0; i < r.length; i += 4) gruppi.push(r.slice(i, i + 4));
  });
  gruppi.forEach(function (gr, gi) {
    var p0 = D.parole[gr[0]], pN = D.parole[gr[gr.length - 1]];
    gr = gr.filter(function (i) { return D.parole[i].da >= D.fineGancio - 0.25; }); // le parole del gancio sono già nel titolo grande
    if (!gr.length) return;
    p0 = D.parole[gr[0]];
    var el = document.createElement("div");
    el.className = "gruppo";
    var pill = document.createElement("div");
    pill.className = "pill";
    gr.forEach(function (i) {
      var w = document.createElement("span");
      w.className = "p" + (D.parole[i].k ? " k" : "");
      w.id = "p" + i;
      w.textContent = D.parole[i].t.toLowerCase();
      pill.appendChild(w);
    });
    el.appendChild(pill);
    sotto.appendChild(el);
    var succ = gruppi[gi + 1] ? D.parole[gruppi[gi + 1][0]].da : D.totale;
    var da = Math.max(0, p0.da - 0.05), a = Math.max(da + 0.2, Math.min(succ - 0.02, pN.a + 0.3));
    tl.fromTo(el, { opacity: 0, y: 18, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.12, ease: "power2.out" }, da);
    tl.set(el, { opacity: 0 }, a);
    gr.forEach(function (i) {
      var w = document.getElementById("p" + i);
      tl.to(w, { color: "#111", duration: 0.08, ease: "none" }, Math.max(da, D.parole[i].da - 0.04));
      if (D.parole[i].k) tl.fromTo(w, { scale: 1 }, { scale: 1.18, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }, D.parole[i].da);
    });
  });

  // numeri che scorrono
  var box = document.getElementById("numeri");
  D.numeri.forEach(function (n, i) {
    var el = document.createElement("div");
    el.className = "numero";
    el.style.top = D.yNumeri + "px";
    el.innerHTML = '<div class="v"><span></span><span class="c">0</span><span></span></div>' + (n.etichetta ? '<div class="e"></div>' : "");
    var sp = el.querySelectorAll(".v span");
    sp[0].textContent = n.pre; sp[2].textContent = n.post;
    if (n.etichetta) el.querySelector(".e").textContent = n.etichetta;
    box.appendChild(el);
    tl.fromTo(el, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.8)" }, n.da);
    // il render salta da un fotogramma all'altro senza callback: si anima il testo stesso (count-up del catalogo)
    tl.fromTo(sp[1], { innerText: 0 }, { innerText: n.n, snap: { innerText: n.dec ? 0.1 : 1 }, duration: 1.1, ease: "power3.out" }, n.da + 0.1);
    tl.to(el, { opacity: 0, y: -30, duration: 0.25, ease: "power2.in" }, n.a);
  });

  // chiusura: CTA e dissolvenza al bianco (mai troncata)
  document.getElementById("cta-t").textContent = D.cta;
  var fine = Math.max(0, D.totale - 2.6);
  tl.fromTo("#cta", { opacity: 0, y: 60, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, fine);
  tl.to("#sotto", { opacity: 0, duration: 0.2 }, fine);
  tl.fromTo("#bianco", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.in" }, D.totale - 0.85);

  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
</script>
</body>
</html>
"""
