# momento-montaggio

Produzione automatica dei reel di Momento Produzione.

| Cartella | Dove gira | Cosa fa |
|---|---|---|
| `worker/` | **Cloudflare** (Worker `momento-reel` + D1) | Regia: pagina web, Direttore creativo, ricerca su YouTube/TikTok/Instagram, Gemini che guarda i video, Analista delle clip su pCloud, scheda tecnica |
| `motore/analizza.py` + `.github/workflows/analizza.yml` | **GitHub Actions** (ogni 5 min) | "Occhi": scarica reel e clip, li misura (ffmpeg, Whisper, BPM) ed estrae i fotogrammi chiave; la regia li fa guardare a Claude. Si presenta con l'identità OIDC di GitHub: nessuna chiave salvata qui |
| `motore/montatore.py` | **GitHub Actions** | **Montatore**: reframe 9:16 sul soggetto, stabilizzazione, rallenty veri, colore (bilanciamento misurato + LUT), transizioni, light leak, testi animati, sottotitoli, sound design, −14 LUFS, revisore. Il reel finito va nell'archivio R2 della regia |

## Fase 1 – Direttore creativo (attiva)

1. Scrivi il prompt del reel (+ link pubblico della cartella pCloud con le clip, + eventuali reel di riferimento).
2. Claude prepara la ricerca di settore.
3. YouTube Data API, Apify (TikTok, Instagram) trovano i video che funzionano; vengono classificati per visualizzazioni e coinvolgimento.
4. Il motore su GitHub scarica i reel migliori e le clip pCloud e li **misura** (ffmpeg: tagli esatti, durata inquadrature, nitidezza, esposizione, movimento, volume; BPM; parlato con Whisper), poi estrae le tavole di fotogrammi chiave.
5. La regia manda misure + fotogrammi a **Claude** (Iris per i reel, Ada per le clip): niente Gemini.
6. Claude scrive la scheda tecnica.
7. **Rocco (Regista) e Carla (Copy)** trasformano la scheda in un piano di montaggio con i tempi esatti delle clip.
8. Il **montatore** sul motore GitHub monta il reel e lo consegna alla regia, dove lo guardi e lo scarichi.

Un cron ogni minuto fa avanzare i lavori una fase alla volta (riprende da dove si era fermato, max 3 tentativi).
Le chiavi si inseriscono dalla pagina Impostazioni oppure come segreti del Worker
(`ANTHROPIC_API_KEY` obbligatoria; facoltative `APIFY_TOKEN`, `YOUTUBE_API_KEY`, `ADMIN_PASSWORD`).

Pubblicazione: `cd worker && npx wrangler deploy` (oppure il bundle già pronto in `worker/dist/momento-reel.js`).
