"""Libreria LUT del motore: scarica i pacchetti G'MIC (.cube) la prima volta, li tiene in cache e restituisce il file."""
import json, os, subprocess, sys, zipfile, urllib.request

CACHE = os.path.expanduser("~/.cache/momento-lut")
CATALOGO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "lut_catalogo.json")))


def file_lut(nome=None, pacchetto=None, file=None):
    """Percorso del .cube (scaricato se serve), o None."""
    voce = CATALOGO.get(nome or "", {})
    pacchetto, file = pacchetto or voce.get("pacchetto"), file or voce.get("file") or nome
    if not pacchetto or not file:
        return None
    cartella = os.path.join(CACHE, pacchetto)
    if not os.path.isdir(cartella):
        os.makedirs(CACHE, exist_ok=True)
        zp = os.path.join(CACHE, pacchetto + ".zip")
        urllib.request.urlretrieve(f"https://gmic.eu/color_presets/{pacchetto}/{pacchetto}_cube.zip", zp)
        with zipfile.ZipFile(zp) as z:
            z.extractall(cartella)
        os.remove(zp)
    for radice, _, files in os.walk(cartella):
        if file + ".cube" in files:
            return os.path.join(radice, file + ".cube")
    return None


def filtro(nome=None, intensita=None, pacchetto=None, file=None):
    """Filtro ffmpeg: la LUT mescolata all'immagine con l'intensità voluta."""
    p = file_lut(nome, pacchetto, file)
    if not p:
        return None
    k = float(intensita if intensita is not None else CATALOGO.get(nome or "", {}).get("intensita", 0.7))
    esc = p.replace("'", "\\'")
    if k >= 0.98:
        return f"lut3d=file='{esc}':interp=tetrahedral"
    return f"split[lua][lub];[lub]lut3d=file='{esc}':interp=tetrahedral[luc];[lua][luc]blend=all_mode=normal:all_opacity={k:.2f}"


if __name__ == "__main__":  # tavola di prova: python3 lut.py foto1 foto2 cartella_uscita
    from PIL import Image, ImageDraw
    a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]
    celle = []
    for nome in ["(originale)"] + list(CATALOGO):
        riga = []
        for src in (a, b):
            dst = f"/tmp/l_{len(celle)}_{len(riga)}.jpg"
            vf = "scale=300:-2" + ("" if nome == "(originale)" else "," + (filtro(nome) or "null"))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vf", vf, "-frames:v", "1", dst], check=False)
            riga.append(dst)
        celle.append((nome, riga))
    w, h = 300, 200
    col = 4
    righe = (len(celle) + col - 1) // col
    tav = Image.new("RGB", (col * (2 * w + 10), righe * (h + 24)), (20, 20, 20))
    d = ImageDraw.Draw(tav)
    for i, (nome, riga) in enumerate(celle):
        x, y = (i % col) * (2 * w + 10), (i // col) * (h + 24)
        for j, f in enumerate(riga):
            try:
                tav.paste(Image.open(f).convert("RGB").resize((w, h)), (x + j * w, y + 22))
            except Exception:
                pass
        d.text((x + 4, y + 4), nome, fill=(255, 255, 255))
    tav.save(os.path.join(out, "tavola_lut.jpg"), quality=82)
    # diagnosi: file trovato? quanto cambia l'immagine? è in bianco e nero?
    import numpy as np
    base = np.asarray(Image.open(celle[0][1][0]).convert("RGB"), dtype=np.float32)
    with open(os.path.join(out, "diagnosi.txt"), "w") as f:
        for nome, riga in celle[1:]:
            try:
                im = np.asarray(Image.open(riga[0]).convert("RGB"), dtype=np.float32)
                diff = float(np.abs(im - base).mean())
                sat = float((im.max(axis=2) - im.min(axis=2)).mean())
                f.write(f"{nome}\tfile={'si' if file_lut(nome) else 'NO'}\tdiff={diff:.1f}\tsat={sat:.1f}\tluma={im.mean():.0f}\n")
            except Exception as e:
                f.write(f"{nome}\terrore {e}\n")
    print(len(celle), "lut provate")
