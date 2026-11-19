"""Prova del formato split_grafico su una clip di parlato: python3 motore/prova_split.py clip.mp4 out.mp4"""
import json, sys
sys.path.insert(0, "motore")
from formati import SplitGrafico
from montatore import Montatore

info = Montatore.probe(sys.argv[1])
piano = {"formato": "split_grafico", "look": "naturale_vivace", "evidenzia": [],
         "segmenti": [{"file": sys.argv[1], "in": 0, "durata": info["dur"]}],
         "grafiche": [{"tipo": "titolo", "sulla_parola": "", "dati": {"testo": "Prova del formato split", "accento": "split", "sotto": "grafiche animate"}},
                      {"tipo": "sito", "sulla_parola": "", "dati": {"url": "https://www.anthropic.com"}}],
         "palette": {"accento": "#D4552F", "secondario": "#F6D9CE"}, "font_split": {"titoli": "Instrument Serif", "testo": "Inter", "mono": "JetBrains Mono"}}
print(json.dumps(SplitGrafico(piano).monta(sys.argv[2]), ensure_ascii=False, indent=1))
