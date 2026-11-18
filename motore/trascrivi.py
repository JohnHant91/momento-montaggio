"""Trascrive l'audio di un video di riferimento (faster-whisper, modello small, CPU)."""
import sys
from faster_whisper import WhisperModel

m = WhisperModel("small", device="cpu", compute_type="int8")
seg, info = m.transcribe(sys.argv[1], vad_filter=True)
with open(sys.argv[2], "w") as f:
    f.write("lingua: %s\n" % info.language)
    for s in seg:
        f.write("[%.1f-%.1f] %s\n" % (s.start, s.end, s.text.strip()))
