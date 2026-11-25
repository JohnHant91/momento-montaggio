"""Studio: rifà un singolo pezzo del montaggio su GitHub (stesso ffmpeg del motore) per trovare dove nasce un difetto."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import montatore as MT
MT.FPS = 25
MT.X264_INT[MT.X264_INT.index("-r") + 1] = "25"
src = "/tmp/tavole/pezzo.mp4"
os.makedirs("/tmp/studio", exist_ok=True)
print(subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True).stdout.splitlines()[0])
piano = {"segmenti": [{"file": src, "in": 0.0, "durata": 2.6, "effetto": "nessuno", "centro_x": 0.62}], "look": "pulito_commerciale", "intensita_look": 0.8, "stabilizza_tutto": True}
m = MT.Montatore(piano, "/tmp/studio/lav", avvisa=lambda *a: print(*a))
s = piano["segmenti"][0]
s["_info"] = m.probe(s["file"])
out = m.pezzo(0, s, m.crea_lut("pulito_commerciale", 0.8), set())
print("\n".join(m.report))
subprocess.run(["cp", out, "/tmp/studio/pezzo_github.mp4"])
# stesso pezzo senza stabilizzazione, per confronto
s2 = dict(s, effetto="nessuno"); m.p["stabilizza_tutto"] = False
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-t", "2.6", "-vf", "fps=25", "-c:v", "libx264", "-crf", "16", "/tmp/studio/solo_fps.mp4"])
