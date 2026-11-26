"""Prova dell'OCCHIO DEL VIDEOMAKER su una cartella dell'Archivio (gratis: solo OpenCV, nessuna AI a pagamento).
Per ogni clip: azioni, problemi e tratto consigliato. Risultato cifrato con la chiave dello studio; nel log solo numeri."""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
import occhio as OC
from prova_verso import chiama, UA

# verso delle clip (le Sony sono girate con la camera in verticale)
RUOTE = json.loads(os.environ.get("RUOTE") or "{}")
FRASI = [x for x in (os.environ.get("FRASI") or "").split("|") if x]


def una(f):
    dest = os.path.join("/tmp/clip", f["nome"])
    try:
        with urllib.request.urlopen(urllib.request.Request(f["url"], headers={"user-agent": UA}), timeout=600) as r, open(dest, "wb") as o:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                o.write(b)
        r = int(RUOTE.get(f["nome"], RUOTE.get("*sony*", 0) if f["nome"].startswith("C0") else 0))
        le = OC.leggi_scheda(OC.guarda(dest, r))
        vi = None
        if FRASI:
            import vista as VI
            vi = VI.momenti(VI.guarda(dest, FRASI, r))
        return {"vista": vi, "nome": f["nome"], "ruota": r, "breve": OC.scheda_breve(le), "azioni": le["azioni"],
                "consigliato_3s": OC.tratto_migliore(le, 3.4), "durata": le.get("durata")}
    except Exception as e:
        return {"nome": f["nome"], "errore": str(e)[:200]}
    finally:
        if os.path.exists(dest):
            os.remove(dest)


def main():
    os.makedirs("/tmp/clip", exist_ok=True)
    F = [f for f in (chiama("/api/motore/verso-prova/prendi", {}).get("file") or []) if f["nome"].lower().endswith((".mp4", ".mov"))]
    print(f"clip: {len(F)}")
    if FRASI:  # carico la vista una volta sola prima dei thread
        import vista as VI
        VI.modello()
    with ThreadPoolExecutor(2 if FRASI else 4) as ex:
        out = list(ex.map(una, F))
    print(f"guardate: {sum(1 for o in out if 'breve' in o)} - azioni trovate: {sum(len(o.get('azioni') or []) for o in out)}")
    os.makedirs("/tmp/tavole", exist_ok=True)
    json.dump(out, open("/tmp/tavole/occhio.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
