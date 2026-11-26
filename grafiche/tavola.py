"""Tavole delle anteprime dell'archivio Stili: una griglia per sezione, solo per le sezioni renderizzate."""
import os
from PIL import Image, ImageDraw


def griglia(file, nome, cella, col, ritaglio=None, etichetta=lambda f: os.path.basename(f)[:-4]):
    file = [f for f in file if os.path.exists(f)]
    if not file:
        return
    W, H = cella
    righe = (len(file) + col - 1) // col
    out = Image.new("RGB", (W * col, (H + 22) * righe), (0, 0, 0))
    d = ImageDraw.Draw(out)
    for i, f in enumerate(file):
        im = Image.open(f).convert("RGB")
        if ritaglio:
            im = im.crop(ritaglio)
        x, y = (i % col) * W, (i // col) * (H + 22)
        out.paste(im.resize((W, H)), (x, y + 22))
        d.text((x + 4, y + 5), etichetta(f), fill=(255, 255, 255))
    out.save(nome, quality=84)


os.chdir(os.path.join(os.path.dirname(__file__), "out"))
dirf = lambda d: sorted(os.path.join(d, x) for x in os.listdir(d)) if os.path.isdir(d) else []
griglia([s + ".png" for s in ["karaoke", "box", "pop", "grassetto", "minimal", "neon", "chiave", "contorno", "macchina", "mano"]], "sottotitoli.jpg", (540, 300), 2, (0, 660, 1080, 1260))
griglia(sorted(x for x in os.listdir(".") if x.startswith("font_")), "font.jpg", (540, 300), 2, (0, 660, 1080, 1260))
griglia(dirf("tr"), "transizioni.jpg", (180, 320), 8)
griglia(dirf("an"), "animazioni.jpg", (270, 200), 4, (0, 760, 1080, 1160))
griglia(dirf("el"), "elementi.jpg", (270, 480), 5)
griglia(dirf("dt"), "dietro.jpg", (540, 960), 2)
griglia(dirf("bx"), "box.jpg", (360, 640), 3)
