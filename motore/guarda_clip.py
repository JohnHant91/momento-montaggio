"""Studio: fotogrammi originali (senza alcuna lavorazione) di una clip dell'Archivio, per capire se un difetto è nel
girato o nel montaggio. Esce solo cifrato; nel log solo il formato tecnico."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova_verso import chiama, UA

nome, da, dur = os.environ["CLIP"], float(os.environ.get("DA", "0")), float(os.environ.get("DUR", "1.5"))
F = [f for f in chiama("/api/motore/verso-prova/prendi", {}).get("file", []) if f["nome"] == nome]
if not F:
    sys.exit("clip non trovata")
u = F[0]["url"]
p = subprocess.run(["ffprobe", "-v", "error", "-user_agent", UA, "-show_entries", "stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,field_order,bit_rate", "-of", "json", u], capture_output=True, text=True)
print(json.dumps(json.loads(p.stdout or "{}").get("streams", [])[:1]))
os.makedirs("/tmp/tavole", exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-user_agent", UA, "-ss", f"{da:.2f}", "-t", f"{dur:.2f}", "-i", u, "-vf", "scale=320:-2,tile=10x8", "-frames:v", "1", "/tmp/tavole/clip.jpg"])
subprocess.run(["ffmpeg", "-v", "error", "-user_agent", UA, "-ss", f"{da:.2f}", "-t", f"{dur:.2f}", "-i", u, "-c", "copy", "/tmp/tavole/pezzo.mp4"])
