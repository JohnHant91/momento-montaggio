# momento-montaggio

Produzione automatica dei reel di Momento Produzione.

| Cartella | Dove gira | Cosa fa |
|---|---|---|
| `worker/` | **Cloudflare** (Worker `momento-reel` + D1) | Regia: pagina web, Direttore creativo, ricerca su YouTube/TikTok/Instagram, Gemini che guarda i video, Analista delle clip su pCloud, scheda tecnica |
| `motore/analizza.py` + `.github/workflows/analizza.yml` | **GitHub Actions** (ogni 5 min) | Scarica le clip da pCloud, legge fps/risoluzione veri (ffprobe), crea copie leggere 720p (ffmpeg) e le manda alla regia, che le fa guardare ad Ada (Gemini). Si presenta con l'identità OIDC di GitHub: nessuna chiave salvata qui |
| `motore/` montaggio *(fase 2)* | **GitHub Actions** | Montaggio vero e proprio con ffmpeg |

## Fase 1 – Direttore creativo (attiva)

1. Scrivi il prompt del reel (+ link pubblico della cartella pCloud con le clip, + eventuali reel di riferimento).
2. Claude prepara la ricerca di settore.
3. YouTube Data API, Apify (TikTok, Instagram) trovano i video che funzionano; vengono classificati per visualizzazioni e coinvolgimento.
4. Gemini guarda i migliori (immagini + audio): gancio, tagli, ritmo, testi, colore, effetti, musica/BPM.
5. Gemini guarda le clip grezze da pCloud: momenti utili, qualità, problemi, parlato.
6. Claude scrive la scheda tecnica per regista, editor, VFX, color, audio, voce e sottotitoli.

Un cron ogni minuto fa avanzare i lavori una fase alla volta (riprende da dove si era fermato, max 3 tentativi).
Le chiavi si inseriscono dalla pagina Impostazioni oppure come segreti del Worker
(`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `APIFY_TOKEN`, facoltativo `ADMIN_PASSWORD`).

Pubblicazione: `cd worker && npx wrangler deploy` (oppure il bundle già pronto in `worker/dist/momento-reel.js`).
