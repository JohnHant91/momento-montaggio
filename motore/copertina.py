"""Copertina dei reel in stile miniatura YouTube: soggetto scontornato con bordo bianco e ombra,
sfondo sfocato e colorato, titolo enorme con contorno e la parola chiave in un riquadro colorato inclinato.
Tutto quello che conta sta nel 3:4 centrale (y 240-1680), così si legge anche nella griglia del profilo."""
import io, os, re, subprocess, urllib.request, urllib.parse
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance, ImageChops

W, H = 1080, 1920
# copertina: nella griglia del profilo si vede solo il 3:4 centrale (1080x1440 → y 240-1680): titolo e viso stanno lì dentro
SICURO_ALTO, SICURO_BASSO = 260, 1650


def _font(cartella, famiglia="Anton", peso=400):
    os.makedirs(cartella, exist_ok=True)
    dest = os.path.join(cartella, re.sub(r"\W+", "", famiglia) + f"-{peso}.ttf")
    if os.path.exists(dest):
        return dest
    try:
        u = None
        for suff in ([f":wght@{peso}"] if peso != 400 else []) + [":wght@800", ":wght@700", ""]:  # non tutti i font hanno tutti i pesi
            try:
                css = urllib.request.urlopen(urllib.request.Request("https://fonts.googleapis.com/css2?family=" + urllib.parse.quote(famiglia) + suff,
                                                                    headers={"user-agent": "Mozilla/4.0"}), timeout=30).read().decode()
            except Exception:
                continue
            m = re.search(r"url\((https://[^)]+\.ttf)\)", css)
            if m:
                u = m.group(1)
                break
        if not u:
            raise RuntimeError("font non trovato")
        with urllib.request.urlopen(u, timeout=60) as r, open(dest, "wb") as f:
            f.write(r.read())
        return dest
    except Exception:
        for c in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
            if os.path.exists(c):
                return c
        return None


def _fotogramma(sorgente, secondo):
    """Il fotogramma più nitido nell'intorno del secondo scelto (niente mosso in copertina)."""
    import cv2
    migliore, voto = None, -1
    for dt in (0, -0.4, 0.4, -0.8, 0.8):
        t = max(0, secondo + dt)
        p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", sorgente, "-frames:v", "1",
                            "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        if not p.stdout:
            continue
        im = Image.open(io.BytesIO(p.stdout)).convert("RGB")
        g = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
        v = cv2.Laplacian(g, cv2.CV_64F).var()
        if v > voto:
            migliore, voto = im, v
    return migliore or Image.new("RGB", (W, H), (20, 24, 28))


def _scontorna(im):
    """Maschera del soggetto (persona o prodotto) con rembg; None se non disponibile."""
    try:
        from rembg import remove, new_session
        modello = os.environ.get("REMBG_MODELLO", "isnet-general-use")
        sess = _scontorna.sessione = getattr(_scontorna, "sessione", None) or new_session(modello)
        m = remove(im, session=sess, only_mask=True, post_process_mask=True)
        m = m.convert("L")
        a = np.array(m)
        # tengo solo il soggetto principale (via i pezzetti staccati che allargano il ritaglio)
        import cv2
        n, lab, st, _ = cv2.connectedComponentsWithStats((a > 128).astype(np.uint8), 8)
        if n > 2:
            grande = st[1:, cv2.CC_STAT_AREA].max()
            tieni = [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] >= 0.08 * grande]
            a = np.where(np.isin(lab, tieni), a, 0).astype(np.uint8)
            m = Image.fromarray(a)
        if (a > 128).mean() < 0.04 or (a > 128).mean() > 0.85:  # niente soggetto chiaro: meglio non scontornare
            return None
        return m
    except Exception:
        return None


def _hex(c, riserva):
    c = str(c or "")
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if re.fullmatch(r"#[0-9a-fA-F]{6}", c) else riserva


def _a_capo(d, parole, f, larg):
    righe, riga = [], []
    for w in parole:
        prova = riga + [w]
        if riga and d.textlength(" ".join(prova), font=f) > larg:
            righe.append(riga)
            riga = [w]
        else:
            riga = prova
    if riga:
        righe.append(riga)
    return righe


def copertina_moderna(sorgente, secondo, testo, dest, font_dir="/tmp/font_cop", evidenzia=None, accento="#FFD60A", secondario="#12A3A4", immagine=False):
    base = Image.open(sorgente).convert("RGB") if immagine else _fotogramma(sorgente, secondo)
    if immagine:
        r = max(W / base.width, H / base.height)
        base = base.resize((int(base.width * r + 1), int(base.height * r + 1)), Image.LANCZOS)
        base = base.crop(((base.width - W) // 2, (base.height - H) // 2, (base.width - W) // 2 + W, (base.height - H) // 2 + H))
    A, B = _hex(accento, (255, 214, 10)), _hex(secondario, (18, 163, 164))
    base = ImageEnhance.Contrast(ImageEnhance.Color(base).enhance(1.25)).enhance(1.12)

    # sfondo: lo stesso fotogramma sfocato e scurito, con una luce colorata dietro il soggetto
    sf = ImageEnhance.Brightness(base.filter(ImageFilter.GaussianBlur(38))).enhance(0.5)
    luce = Image.new("RGB", (W, H), B)
    alone = Image.new("L", (W, H), 0)
    ImageDraw.Draw(alone).ellipse((-200, 520, W + 200, H + 500), fill=170)
    sf = Image.composite(Image.blend(sf, luce, 0.55), sf, alone.filter(ImageFilter.GaussianBlur(160)))
    grad = Image.linear_gradient("L").resize((W, H))  # buio in alto per il testo
    sf = Image.composite(Image.new("RGB", (W, H), (8, 10, 12)), sf, ImageChops.invert(grad).point(lambda v: int(v * 0.55)))
    tela = sf.copy()

    # misuro prima il titolo: il soggetto va SOTTO, il viso non si copre mai
    fp = _font(font_dir, "Anton") if testo else None
    dmis = ImageDraw.Draw(tela)
    parole = [w for w in re.sub(r"\s+", " ", (testo or "").replace("*", " ")).strip().upper().split(" ") if w]
    righe, f, dim = [], None, 190
    while testo and dim > 90:
        f = ImageFont.truetype(fp, dim) if fp else ImageFont.load_default()
        righe = _a_capo(dmis, parole, f, 960)
        if len(righe) <= 3 and all(dmis.textlength(" ".join(r), font=f) <= 980 for r in righe):
            break
        dim -= 10
    alt = int(dim * 1.02)
    fondo_testo = (SICURO_ALTO + 20 + alt * len(righe) + 40) if testo else SICURO_ALTO

    maschera = _scontorna(base)
    if maschera is not None:
        # soggetto ingrandito e appoggiato in basso, bordo bianco spesso e ombra morbida
        box = maschera.getbbox() or (0, 0, W, H)
        sog, msk = base.crop(box), maschera.crop(box)
        # la testa parte sotto il titolo; il busto può uscire dal fondo
        spazio = H - fondo_testo
        s = min(spazio * 1.05 / sog.height, 1000 / sog.width, 1.7)
        sog = sog.resize((max(1, int(sog.width * s)), max(1, int(sog.height * s))), Image.LANCZOS)
        msk = msk.resize(sog.size, Image.LANCZOS)
        x, y = (W - sog.width) // 2, fondo_testo
        ombra = Image.new("L", (W, H), 0); ombra.paste(msk, (x + 18, y + 26))
        tela = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), tela, ombra.filter(ImageFilter.GaussianBlur(30)).point(lambda v: int(v * 0.7)))
        bordo = Image.new("L", (W, H), 0); bordo.paste(msk, (x, y))
        bordo = bordo.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(2))
        tela = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), tela, bordo)
        pieno = Image.new("L", (W, H), 0); pieno.paste(msk, (x, y))
        strato = Image.new("RGB", (W, H)); strato.paste(sog, (x, y))
        tela = Image.composite(strato, tela, pieno)
    else:
        # senza scontorno: il fotogramma nitido in un riquadro con bordo bianco, leggermente inclinato
        hq = max(600, min(1100, SICURO_BASSO + 140 - fondo_testo))
        q = base.resize((880, int(880 * H / W)), Image.LANCZOS)
        q = q.crop((0, max(0, int(q.height * 0.12)), 880, max(0, int(q.height * 0.12)) + hq))
        cornice = Image.new("RGB", (q.width + 28, q.height + 28), (255, 255, 255)); cornice.paste(q, (14, 14))
        cornice = cornice.rotate(2.5, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0))
        mk = Image.new("L", (q.width + 28, q.height + 28), 255).rotate(2.5, expand=True, resample=Image.BICUBIC)
        px, py = (W - cornice.width) // 2, fondo_testo
        om = Image.new("L", (W, H), 0); om.paste(mk, (px + 16, py + 24))
        tela = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), tela, om.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.6)))
        tela.paste(cornice, (px, py), mk)

    if testo:
        d = ImageDraw.Draw(tela)
        chiave = (evidenzia or "").upper().strip() or (max(parole, key=len) if parole else "")
        y = SICURO_ALTO + 20
        for r in righe:
            larg = d.textlength(" ".join(r), font=f) + (d.textlength(" ", font=f) * 0.6 if chiave and any(w.strip(".,!?:") == chiave.strip(".,!?:") for w in r) else 0)
            x = (W - larg) / 2
            for w in r:
                lw = d.textlength(w, font=f)
                if chiave and w.strip(".,!?:") == chiave.strip(".,!?:"):
                    # parola chiave: riquadro colorato inclinato con testo scuro, misurato sul disegno vero delle lettere
                    pad = int(dim * 0.12)
                    bx = f.getbbox(w)
                    tw, th = bx[2] - bx[0], bx[3] - bx[1]
                    tag = Image.new("RGBA", (tw + pad * 2, th + pad * 2), A + (255,))
                    ImageDraw.Draw(tag).text((pad - bx[0], pad - bx[1]), w, font=f, fill=(12, 12, 12))
                    tag = tag.rotate(-3, expand=True, resample=Image.BICUBIC)
                    tx, ty = int(x + bx[0] - pad - (tag.width - tw - pad * 2) / 2), int(y + bx[1] - pad - (tag.height - th - pad * 2) / 2)
                    tela.paste((0, 0, 0), (tx + 10, ty + 14), tag.getchannel("A").point(lambda v: int(v * 0.5)).filter(ImageFilter.GaussianBlur(8)))
                    tela.paste(tag, (tx, ty), tag)
                    d = ImageDraw.Draw(tela)
                else:
                    d.text((x + 8, y + 10), w, font=f, fill=(0, 0, 0))  # ombra netta
                    d.text((x, y), w, font=f, fill=(255, 255, 255), stroke_width=max(6, dim // 18), stroke_fill=(0, 0, 0))
                x += lw + d.textlength(" ", font=f) * (1.6 if chiave and w.strip(".,!?:") == chiave.strip(".,!?:") else 1)
            y += alt
    # vignetta finale
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse((-260, -200, W + 260, H + 200), fill=255)
    tela = Image.composite(tela, ImageEnhance.Brightness(tela).enhance(0.7), vig.filter(ImageFilter.GaussianBlur(180)))
    tela.save(dest, "JPEG", quality=92)
    return dest


# ------------------------------------------------------------------ copertine dei CLIENTI: stile ricavato dai loro esempi
RICETTA_BASE = {"posizione_testo": "basso", "allineamento": "sinistra", "font": "Montserrat", "peso": 800, "maiuscolo": False, "colore_testo": "#FFFFFF",
                "contorno": False, "riquadro": "nessuno", "colore_riquadro": "#FFFFFF", "colore_testo_riquadro": "#111111", "sfondo": "foto", "overlay": "gradiente_basso",
                "scontorno": False, "cornice": "nessuna", "logo": "alto_sinistra", "dimensione_testo": "grande", "barra_accento": True, "colore_accento": "#12A3A4"}


def copertina_ricetta(sorgente, secondo, testo, dest, ricetta=None, logo=None, font_dir="/tmp/font_cop", evidenzia=None, immagine=False):
    R = {**RICETTA_BASE, **{k: v for k, v in (ricetta or {}).items() if v not in (None, "")}}
    base = Image.open(sorgente).convert("RGB") if immagine else _fotogramma(sorgente, secondo)
    if immagine:
        r = max(W / base.width, H / base.height)
        base = base.resize((int(base.width * r + 1), int(base.height * r + 1)), Image.LANCZOS)
        base = base.crop(((base.width - W) // 2, (base.height - H) // 2, (base.width - W) // 2 + W, (base.height - H) // 2 + H))
    acc = _hex(R["colore_accento"], (18, 163, 164))
    # sfondo
    if R["sfondo"] == "colore":
        tela = Image.new("RGB", (W, H), acc)
    elif R["sfondo"] == "foto_sfocata":
        tela = ImageEnhance.Brightness(base.filter(ImageFilter.GaussianBlur(30))).enhance(0.6)
    else:
        tela = base.copy()
    ov = R["overlay"]
    if ov in ("gradiente_basso", "gradiente_alto", "scuro"):
        g = Image.linear_gradient("L").resize((W, H))
        if ov == "gradiente_alto":
            g = ImageChops.invert(g)
        if ov == "scuro":
            g = Image.new("L", (W, H), 120)
        else:
            g = g.point(lambda v: int(max(0, v - 90) * 1.5) if v > 90 else 0)
        tela = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), tela, g.point(lambda v: min(200, v)))
    d = ImageDraw.Draw(tela)
    righe, y0, blocco = [], SICURO_ALTO, 0
    if testo:
        fp = _font(font_dir, R["font"], int(R.get("peso") or 800))
        t = testo.upper() if R["maiuscolo"] else testo
        parole = t.split()
        base_dim = {"piccolo": 84, "medio": 112, "grande": 144}.get(R["dimensione_testo"], 130)
        dim = base_dim
        while dim > 60:
            f = ImageFont.truetype(fp, dim) if fp else ImageFont.load_default()
            righe = _a_capo(d, parole, f, 900)
            if len(righe) <= 4:
                break
            dim -= 8
        alt = int(dim * 1.12)
        blocco = alt * len(righe)
        y0 = {"alto": SICURO_ALTO + 40, "centro": (H - blocco) // 2}.get(R["posizione_testo"], SICURO_BASSO - blocco - 30)
    # soggetto scontornato o foto in cornice (quando lo sfondo non è già la foto)
    if R["sfondo"] != "foto":
        m = _scontorna(base) if R["scontorno"] else None
        if m is not None:
            box = m.getbbox() or (0, 0, W, H)
            sog, msk = base.crop(box), m.crop(box)
            s = min(H * 0.62 / sog.height, 1000 / sog.width, 1.7)
            sog, msk = sog.resize((int(sog.width * s), int(sog.height * s)), Image.LANCZOS), msk.resize((int(sog.width * s), int(sog.height * s)), Image.LANCZOS)
            x, y = (W - sog.width) // 2, H - sog.height
            tela.paste(sog, (x, y), msk)
        else:
            # la foto sta dove non c'è il testo
            if R["posizione_testo"] == "alto":
                top, fine = y0 + blocco + 40, SICURO_BASSO + 120
            else:
                top, fine = SICURO_ALTO - 40, (y0 - 70 if R["posizione_testo"] == "basso" else H - 200)
            hq = max(500, fine - top)
            q = base.resize((900, int(900 * H / W)), Image.LANCZOS)
            q = q.crop((0, min(200, max(0, q.height - hq)), 900, min(200, max(0, q.height - hq)) + hq))
            if R["cornice"] == "arrotondata":
                mk = Image.new("L", q.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, q.width, q.height), 60, fill=255)
                tela.paste(q, ((W - q.width) // 2, top), mk)
            else:
                if R["cornice"] == "bianca":
                    ImageDraw.Draw(tela).rectangle(((W - q.width) // 2 - 14, top - 14, (W + q.width) // 2 + 14, top + q.height + 14), fill=(255, 255, 255))
                tela.paste(q, ((W - q.width) // 2, top))
    d = ImageDraw.Draw(tela)
    if testo:
        if R.get("barra_accento") and R["riquadro"] == "nessuno":
            bx = 90 if R["allineamento"] == "sinistra" else W // 2 - 50
            d.rounded_rectangle((bx, y0 - 46, bx + 100, y0 - 32), 7, fill=acc)
        ct, cr, ctr = _hex(R["colore_testo"], (255, 255, 255)), _hex(R["colore_riquadro"], (255, 255, 255)), _hex(R["colore_testo_riquadro"], (17, 17, 17))
        chiave = (evidenzia or "").strip().upper()
        y = y0
        for r in righe:
            riga = " ".join(r)
            lw = d.textlength(riga, font=f)
            x = 90 if R["allineamento"] == "sinistra" else (W - lw) / 2
            if R["riquadro"] == "pieno":
                bb = f.getbbox(riga); pad = int(dim * 0.18)
                d.rounded_rectangle((x + bb[0] - pad, y + bb[1] - pad * 0.7, x + bb[2] + pad, y + bb[3] + pad * 0.7), int(dim * 0.18), fill=cr)
                d.text((x, y), riga, font=f, fill=ctr)
            else:
                xx = x
                for w in r:
                    ww = d.textlength(w, font=f)
                    if R["riquadro"] == "evidenzia" and chiave and w.upper().strip(".,!?:") == chiave.strip(".,!?:"):
                        bb = f.getbbox(w); pad = int(dim * 0.12)
                        d.rectangle((xx + bb[0] - pad, y + bb[1] - pad * 0.6, xx + bb[2] + pad, y + bb[3] + pad * 0.6), fill=cr)
                        d.text((xx, y), w, font=f, fill=ctr)
                    else:
                        kw = {"stroke_width": max(4, dim // 20), "stroke_fill": (0, 0, 0)} if R["contorno"] else {}
                        d.text((xx, y), w, font=f, fill=ct, **kw)
                    xx += ww + d.textlength(" ", font=f)
            y += alt
    if logo and os.path.exists(logo) and R["logo"] != "nessuno":
        try:
            lg = Image.open(logo).convert("RGBA")
            s = min(260 / lg.width, 120 / lg.height)
            lg = lg.resize((max(1, int(lg.width * s)), max(1, int(lg.height * s))), Image.LANCZOS)
            pos = {"alto_centro": ((W - lg.width) // 2, SICURO_ALTO), "basso_centro": ((W - lg.width) // 2, SICURO_BASSO - lg.height),
                   "alto_destra": (W - 90 - lg.width, SICURO_ALTO)}.get(R["logo"], (90, SICURO_ALTO))
            tela.paste(lg, pos, lg)
        except Exception:
            pass
    tela.save(dest, "JPEG", quality=92)
    return dest
