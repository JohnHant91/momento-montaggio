"""Studio: rifà un singolo pezzo del montaggio su GitHub (stesso ffmpeg del motore) per trovare dove nasce un difetto."""
import os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("LAVORO", "")
import montatore as MT
MT.FPS = 25
MT.X264_INT[MT.X264_INT.index("-r") + 1] = "25"
os.makedirs("/tmp/studio", exist_ok=True)
src = "/tmp/tavole/pezzo.mp4"
shutil.copy(src, "/tmp/studio/0_originale.mp4")
ruota = int(os.environ.get("RUOTA", "0") or 0)
if ruota:
    import analizza as AN
    AN.raddrizza(src, ruota, lambda *a: print(*a))
    shutil.copy(src, "/tmp/studio/1_raddrizzato.mp4")
piano = {"segmenti": [{"file": src, "in": 0.5, "durata": 3.4, "effetto": "nessuno"}], "look": "pulito_commerciale", "intensita_look": 0.8, "stabilizza_tutto": True}  # deve risultare pulito anche così
m = MT.Montatore(piano, "/tmp/studio/lav", avvisa=lambda *a: print(*a))
s = piano["segmenti"][0]
s["_info"] = m.probe(s["file"])
out = m.pezzo(0, s, m.crea_lut("pulito_commerciale", 0.8), set())
print("\n".join(m.report))
shutil.copy(out, "/tmp/studio/2_pezzo.mp4")
