// La catena di lavoro: piano → ricerca → riferimenti (Gemini guarda) → clip (Analista) → scheda tecnica.
// Ogni minuto il cron fa avanzare i lavori aperti, una fase alla volta, ripartendo da dove si era fermato.
import { J, all, log, one, ora, run, configurazione } from './db.js';
import { libreriaTesto } from './libreria.js';
import * as S from './servizi.js';
import * as A from './archivio.js';
import { inviaPush } from './notifiche.js';
import { PALETTE, descriviPalette } from './palette.js';
import { ANIMAZIONI } from './animazioni.js';
import { SKILL as SKILL_V } from './skill_testi.js';
import { clientePerNome, lineaCliente, testoLinea, ripassoChiara } from './chiara.js';
import { rilevaStile, ricetta, ricercaStile } from './stili.js';
import { LUT, LUT_NOMI, lutPerStile, descriviLut, voceLut } from './lut.js';
import { MANUALE_AUDIO, MANUALE_COPY, MANUALE_DIRETTORE, MANUALE_FORMATI, MANUALE_IRIS, MANUALE_MODELLO, MANUALE_PUBBLICAZIONE, MANUALE_REGISTA, MANUALE_SPOT } from './manuali.js';
import { chi } from './consumi.js';

const FASI = ['piano', 'ricerca', 'riferimenti', 'clip', 'scheda', 'regia', 'montaggio', 'fatto'];
const BLOCCO_MIN = 15;       // un lavoro "preso" resta riservato per 15 minuti (le risposte lunghe di Claude ci stanno)
const BUDGET_MS = 9 * 60e3;  // quanto lavora ogni giro del cron
const PER_GIRO = 3;          // video guardati in parallelo per giro

// ------------------------------------------------------------------ prompt degli agenti
const SISTEMA_PIANO = `Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.

${MANUALE_DIRETTORE}`;

const piano = (prompt) => `RICHIESTA DI JOHNNY:
${prompt}

Prepara il piano di ricerca. Cerca i video che hanno FUNZIONATO nel settore: mescola ricerche italiane
e inglesi (le tecniche di montaggio migliori spesso arrivano da USA/UK). Hashtag specifici del settore,
mai generici tipo "reels" o "viral".
JSON:
{
  "settore": "settore in 2-4 parole",
  "obiettivo": "cosa deve ottenere il reel",
  "pubblico": "a chi parla",
  "youtube_query": ["3-4 ricerche"],
  "tiktok_query": ["2-3 ricerche"],
  "tiktok_hashtag": ["2-3 hashtag senza #"],
  "instagram_hashtag": ["2 hashtag senza #: il PRIMO è il più preciso per la nicchia del cliente (es. panettoneartigianale), si usa solo quello; il secondo è di riserva"],
  "stile_montaggio": {"descrizione": "lo stile/mood di montaggio che Johnny chiede, con parole sue (es. street emozionale) o null se non lo dice",
                      "ricerca_en": ["2 ricerche in inglese per trovare reel MONTATI in quello stile, anche fuori settore (es. emotional street cinematic edit)"]}
}`;

const analisiRiferimento = (settore) => `Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.

${MANUALE_IRIS}

È un riferimento per un reel del settore "${settore}".
Non vedi il video in movimento: ti do (1) una tavola con i primi 3 secondi (il gancio), (2) una tavola con un
fotogramma per ogni inquadratura, con il tempo scritto in giallo, (3) MISURE ESATTE fatte con ffmpeg e Whisper
(tagli, durate delle inquadrature, BPM, volume, parlato trascritto). Le misure sono vere: copiale così come sono.
Il resto (testi a schermo, colore, inquadrature, effetti visibili) lo deduci dai fotogrammi. Quello che da
fotogrammi fermi non si può sapere (es. come si animano i testi, effetti sonori) scrivilo null o "non verificabile".
Non inventare. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${libreriaTesto()}

Rispondi SOLO con JSON:
{
  "durata_sec": n,
  "gancio": {"fine_sec": n, "cosa_succede": "...", "tipo": "domanda|promessa|visivo_forte|curiosita|problema|altro", "testo_a_schermo": "testo esatto o null"},
  "numero_tagli": n,
  "durata_media_inquadratura_sec": n,
  "ritmo": "lento|medio|veloce|frenetico",
  "tagli_sul_beat": true/false,
  "struttura": [{"da": n, "a": n, "fase": "gancio|sviluppo|climax|chiusura", "cosa_succede": "..."}],
  "inquadrature_tipiche": ["..."],
  "movimenti_camera": ["..."],
  "testi": {"presenti": bool, "stile": "nome libreria", "posizione": "alto|centro|terzo_inferiore", "font": "bastoni/grazie/script, spessore, maiuscolo?", "colori": "...", "animazione": "...", "parole_per_schermata": n},
  "sottotitoli_parlato": {"presenti": bool, "stile": "nome libreria o null"},
  "colore": {"look": "nome libreria", "descrizione": "..."},
  "effetti": ["nomi libreria"],
  "effetti_extra": ["effetti non in libreria, descritti"],
  "transizioni": ["nomi libreria"],
  "audio": {"musica": bool, "mood": "nome libreria", "bpm_stimato": n|null, "voce": "nessuna|voiceover|parlato_in_camera|entrambi", "effetti_sonori": ["..."]},
  "chiusura": {"tipo": "cta|loop|logo|nessuna", "cosa_succede": "..."},
  "perche_funziona": "2-3 frasi concrete",
  "motori": ["i 1-2 elementi portanti (prova controfattuale)"],
  "leva_condivisione": "identità|emozione|valore_sociale|utilità|immedesimazione|storia|nessuna",
  "replicabile": {"si": bool, "perche": "eventuali fattori di fortuna/dimensione profilo"},
  "principio": "la leva in una riga, applicabile al nostro settore",
  "da_copiare": ["tecniche replicabili"],
  "da_evitare": ["cosa non funziona o è già visto"]
}`;

const analisiClip = (contesto) => `Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
per chi dovrà montare un reel verticale 9:16. Non vedi il video in movimento: ti do i fotogrammi in ordine di tempo
(tempo in giallo) e MISURE ESATTE: fps, risoluzione, durata; per ogni fotogramma nitidezza (varianza del laplaciano
su 480 px: sotto ~40 tende a mosso/sfocato, sopra ~150 è nitido), luminosità 0-255, % bruciato e % chiuso;
movimento tra fotogrammi (alto = camera o soggetto che si muovono); parlato trascritto da Whisper.
Usa le misure per qualità e problemi, i fotogrammi per contenuto e inquadrature. Non inventare.
Sii sintetico: al massimo 8 momenti e 5 problemi, frasi brevi.
Se è una FOTO o una SLIDE (tecnico.tipo = immagine): niente momenti né problemi di tempo; descrivi cosa mostra e trascrivi
il testo che contiene (se è una slide di carosello) in "testo_nell_immagine".

VERSO DELL'IMMAGINE ("rotazione"): 90 (orario), -90 (antiorario) o 180 SOLO se l'immagine è chiaramente coricata o capovolta
(persone sdraiate di lato, orizzonte verticale, scritte girate). Una ripresa orizzontale DRITTA non si gira mai: 0
(regola di Johnny: le orizzontali restano orizzontali, il montatore le ritaglia in 9:16 sul soggetto). Nel dubbio 0.

Contesto del lavoro: ${contesto}

Rispondi SOLO con JSON:
{
  "descrizione": "cosa c'è nella clip in una frase",
  "luogo_luce": "interno/esterno, tipo di luce",
  "momenti": [{"da": n, "a": n, "cosa_succede": "...", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro",
    "movimento_camera": "statico|panoramica|carrellata|gimbal|mano_libera|drone", "soggetti": ["..."],
    "qualita": 1-5, "uso_consigliato": "gancio|sviluppo|climax|chiusura|b_roll|scartare", "perche": "..."}],
  "problemi": [{"da": n, "a": n, "tipo": "mosso|fuori_fuoco|sovraesposto|sottoesposto|rumore_audio|altro", "nota": "..."}],
  "parlato": {"presente": bool, "sintesi": "di cosa si parla, o null"},
  "adatta_al_verticale": "si|serve_reframe",
  "rotazione": 0,
  "note_montaggio": "consigli pratici per usarla",
  "testo_nell_immagine": "solo per foto/slide: il testo scritto, o null"
}`;

const SISTEMA_SCHEDA = `Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guiderà
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Sii denso e sintetico: frasi brevi, niente ripetizioni, cita solo le clip che userai davvero.
Rispondi SOLO JSON.

${MANUALE_DIRETTORE}

${MANUALE_MODELLO}

${MANUALE_PUBBLICAZIONE}

${MANUALE_AUDIO}`;

const scheda = (prompt, piano, rif, clip) => `RICHIESTA DI JOHNNY:
${prompt}

PIANO: ${JSON.stringify(piano)}

LIBRERIA:
${libreriaTesto()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di più):
${JSON.stringify(rif)}

CLIP DISPONIBILI (analisi dell'Analista; può essere vuoto):
${JSON.stringify(clip)}

Produci la scheda:
{
  "titolo_lavoro": "...",
  "concept": "l'idea in 2 frasi",
  "cosa_funziona_nel_settore": ["pattern comuni con dati, es. 'gancio entro 1,5 s in 6 video su 8'"],
  "durata_target_sec": n,
  "formato": "9:16",
  "struttura": [{"fase": "gancio|sviluppo|climax|chiusura", "da": n, "a": n, "obiettivo": "...", "contenuto": "..."}],
  "ritmo": {"durata_media_inquadratura_sec": n, "tagli_sul_beat": bool, "variazioni": "dove rallentare/accelerare"},
  "gancio": {"tipo": "...", "idea": "...", "testo_proposto": "..."},
  "colore": {"look": "nome libreria", "note": "..."},
  "testi": {"stile": "nome libreria", "posizione": "...", "font_suggerito": "font Google Fonts", "colori": "hex", "animazione": "...", "max_parole_per_schermata": n},
  "sottotitoli": {"usare": bool, "stile": "nome libreria"},
  "effetti": [{"nome": "nome libreria", "dove": "quando usarlo"}],
  "transizioni": ["nomi libreria"],
  "audio": {"mood": "nome libreria", "bpm": n, "musica_suggerita": "tipo di brano da cercare su IG/TikTok", "effetti_sonori": ["..."], "voce": "nessuna|voiceover|parlato_clip", "note_voce": "..."},
  "chiusura": {"tipo": "...", "cta": "..."},
  "obiettivo_reel": "portata|invii|salvataggi|follower|commenti",
  "leva_invio": "chi lo manderebbe a chi e perché",
  "loop": "come la fine si ricollega all'inizio",
  "parola_chiave": "parola chiave principale per la ricerca Instagram",
  "copertina": {"momento": "quale inquadratura", "testo": "testo grande della copertina"},
  "caption": "bozza caption",
  "hashtag": ["..."],
  "riferimenti_chiave": [{"url": "...", "perche": "..."}],
  "clip_da_usare": [{"file": "...", "momento": "da-a sec", "per": "fase"}],
  "clip_mancanti": ["inquadrature che servirebbero e non ci sono"],
  "rischi": ["cosa può venire male e come evitarlo"]
}`;

// ------------------------------------------------------------------ cache delle analisi (non si paga due volte)
async function cache(env, chiave, calcola) {
  const r = await one(env, 'SELECT dati FROM cache_analisi WHERE chiave=?', chiave);
  if (r) return { dati: J(r.dati), daCache: true };
  const dati = await calcola();
  await run(env, 'INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)', chiave, JSON.stringify(dati), ora());
  return { dati, daCache: false };
}

// ------------------------------------------------------------------ le fasi
// MODO SNELLO (default): Johnny dà clip + prompt. Niente piano con Claude, niente ricerca/riferimenti, niente scheda:
// si paga solo la visione delle clip nuove, il Regista e una revisione.
const snello = (L) => !J(L.link_rif, []).length && !J(L.stile, null)?.avatar && (FONTI[L.fonte || 'pcloud'] || FONTI.pcloud).pronta(L);
async function fasePiano(env, cfg, L) {
  if (snello(L)) { await run(env, 'UPDATE lavori SET piano=?, scheda=? WHERE id=?', JSON.stringify({ obiettivo: 'reel dalle clip di Johnny' }), JSON.stringify({ richiesta_di_johnny: L.prompt }), L.id); return; }
  // reel col mio avatar: il piano è già nel copione, niente chiamata a Claude
  // reel col mio avatar: niente Claude per il piano; si cercano i reel del tema da cui prendere spunto per il montaggio
  if (J(L.stile, null)?.avatar) {
    const tema = ((L.prompt || '').match(/Argomento del piano \(per la palette\): (.+)/) || [])[1]?.trim().slice(0, 80) || 'consigli';
    await run(env, 'UPDATE lavori SET piano=? WHERE id=?', JSON.stringify({ settore: tema, obiettivo: 'reel per il profilo Instagram di Johnny',
      youtube_query: [tema + ' shorts', tema + ' reel italiano'], tiktok_query: [tema], tiktok_hashtag: [], instagram_hashtag: [] }), L.id);
    await log(env, L.id, 'direttore', `cerco reel su "${tema}" da cui prendere spunto per il montaggio`);
    return;
  }
  await log(env, L.id, 'direttore', 'leggo la richiesta e preparo la ricerca');
  const p = await S.claude(cfg, SISTEMA_PIANO, piano(L.prompt), { maxTokens: 1500 });
  // Stella: se Johnny ha chiesto uno stile (street, emozionale, natalizio…) metà della ricerca va su reel montati in quello stile
  let stile = J(L.stile, null) || rilevaStile(L.prompt);
  // stile che non è nel catalogo (es. "wes anderson", "documentario anni 70"): Stella lo ricava solo dai riferimenti
  const sm = p.stile_montaggio;
  if (sm?.descrizione && (!stile || (!stile.genere && !stile.mood?.length))) stile = { ...(stile?.solo_clip ? { solo_clip: true } : {}), genere: null, mood: [], libero: String(sm.descrizione).slice(0, 120), ricerca: (sm.ricerca_en || []).slice(0, 2) };
  else if (stile && sm?.ricerca_en?.length && !stile.ricerca) stile.ricerca = sm.ricerca_en.slice(0, 2);
  if (stile?.avatar || stile?.solo_clip) await run(env, 'UPDATE lavori SET stile=? WHERE id=?', JSON.stringify(stile), L.id);
  else if (stile) {
    const q = ricercaStile(stile, p.settore), R = ricetta(stile);
    p.youtube_query = [...q.yt, ...(p.youtube_query || [])].slice(0, 4);
    p.tiktok_query = [...q.tt, ...(p.tiktok_query || [])].slice(0, 4);
    p.instagram_hashtag = [...(p.instagram_hashtag || []), ...q.ig].slice(0, 3); // prima la nicchia del cliente, poi lo stile
    await run(env, 'UPDATE lavori SET stile=? WHERE id=?', JSON.stringify(stile), L.id);
    await log(env, L.id, 'stella', `🎨 stile ${R.nome}: cerco reel montati così (${[...q.yt, ...q.tt].join(' · ')}) e ne estraggo la ricetta da applicare alle tue clip`);
  }
  await run(env, 'UPDATE lavori SET piano=? WHERE id=?', JSON.stringify(p), L.id);
  await log(env, L.id, 'direttore', `settore: ${p.settore || "-"} · obiettivo: ${p.obiettivo || '-'}`);
}

async function faseRicerca(env, cfg, L) {
  const p = J(L.piano, {});
  const nomi = ['YouTube', 'TikTok', 'Instagram', 'Link tuoi'];
  const AG = ['scout_yt', 'scout_tt', 'scout_ig', 'direttore'];
  if (!J(L.stile, null)?.solo_clip) await log(env, L.id, 'scout_yt', `${cfg.YOUTUBE_API_KEY ? 'cerco Shorts' : 'cerco Shorts sul web'}: ${(p.youtube_query || []).join(' · ')}`);
  if (cfg.APIFY_TOKEN && !J(L.stile, null)?.solo_clip) {
    await log(env, L.id, 'scout_tt', `cerco su TikTok: ${[...(p.tiktok_query || []), ...(p.tiktok_hashtag || []).map((h) => '#' + h)].join(' · ')}`);
    await log(env, L.id, 'scout_ig', `cerco reel su Instagram (API ufficiale, 1 hashtag): #${(p.instagram_hashtag || [])[0] || '?'}`);
  }
  const solo = !!J(L.stile, null)?.solo_clip; // Johnny ha chiesto solo le sue clip: si studiano solo i suoi reel modello
  const esiti = await Promise.allSettled([
    solo ? [] : S.youtube(cfg, p.youtube_query || []),
    solo ? [] : S.tiktok(cfg, p.tiktok_query || [], p.tiktok_hashtag || []),
    solo ? [] : S.instagram(cfg, p.instagram_hashtag || []),
    S.linkDiretti(cfg, J(L.link_rif, [])),
  ]);
  const perFonte = {};
  for (let i = 0; i < 4; i++) {
    const e = esiti[i];
    if (e.status === 'rejected') { await log(env, L.id, AG[i], `${nomi[i]}: ${e.reason?.message || e.reason}`, 'warn'); perFonte[nomi[i]] = []; continue; }
    const lista = Array.isArray(e.value) ? e.value : e.value.video;
    perFonte[nomi[i]] = lista;
    if ((i === 1 || i === 2) && !cfg.APIFY_TOKEN) continue; // Tea e Ines a riposo senza Apify
    if (i < 3 && J(L.stile, null)?.solo_clip) continue;
    if (e.value.nota) await log(env, L.id, AG[i], e.value.nota, 'warn');
    if (i < 3 || lista.length) await log(env, L.id, AG[i], i < 3 ? `trovati ${lista.length} video` : `i tuoi link: ${lista.length} video`);
  }
  // selezione: i link di Johnny sempre, poi i migliori di ogni piattaforma in parti uguali
  const scelti = [...perFonte['Link tuoi']];
  const fonti = ['YouTube', 'TikTok', 'Instagram'].filter((n) => perFonte[n].length);
  const quota = fonti.length ? Math.max(1, Math.floor(Math.max(cfg.NUM_RIFERIMENTI - scelti.length, fonti.length) / fonti.length)) : 0;
  for (const n of fonti) {
    const visti = new Set();
    scelti.push(...perFonte[n].map((v) => ({ ...v, punteggio: S.punteggio(v) }))
      .sort((a, b) => b.punteggio - a.punteggio)
      .filter((v) => !visti.has(v.id) && visti.add(v.id))
      .slice(0, quota));
  }
  const unici = new Set();
  scelti.splice(0, scelti.length, ...scelti.filter((v) => { const k = `${v.piattaforma}:${v.id}`; return !unici.has(k) && unici.add(k); }));
  if (!scelti.length) throw new Error('nessun video di riferimento trovato: controlla le chiavi in Impostazioni');
  const riferimenti = scelti.map((v) => ({ video: v, stato: 'da_guardare' }));
  await run(env, 'UPDATE lavori SET candidati=?, riferimenti=?, motore_visto=NULL WHERE id=?', JSON.stringify(perFonte), JSON.stringify(riferimenti), L.id);
  await log(env, L.id, 'direttore', `scelgo ${riferimenti.length} reel da far guardare a Iris`);
}

// I video li guarda il motore su GitHub (misure + fotogrammi) e la regia li fa giudicare a Claude: vedi motore.js.
// Qui si riempie dalla cache quello che è già stato visto e si aspetta il resto.
async function faseRiferimenti(env, cfg, L) {
  const rif = J(L.riferimenti, []);
  if (!L.motore_visto) {
    let gia = 0;
    for (const r of rif) {
      if (r.stato !== 'da_guardare') continue;
      const c = await one(env, 'SELECT dati FROM cache_analisi WHERE chiave=?', chiaveRif(r.video));
      if (c) { Object.assign(r, { stato: 'fatto', analisi: J(c.dati, {}) }); gia++; }
    }
    await run(env, 'UPDATE lavori SET riferimenti=?, motore_visto=? WHERE id=?', JSON.stringify(rif), ora(), L.id);
    if (gia) await log(env, L.id, 'occhi', `${gia} reel già visti in passato: non li riguardo`);
    if (rif.some((r) => r.stato === 'da_guardare')) await log(env, L.id, 'motore', `chiamo il motore GitHub: scarico e misuro ${rif.filter((r) => r.stato === 'da_guardare').length} reel di riferimento`);
  }
  if (rif.some((r) => r.stato === 'da_guardare')) return avvisoMotore(env, L);
  if (!rif.some((r) => r.stato === 'fatto')) throw new Error('nessun reel di riferimento è stato analizzato (vedi il registro)');
  await run(env, 'UPDATE lavori SET motore_visto=NULL WHERE id=?', L.id); // la fase clip riparte da zero col suo controllo
  return true;
}

// Avvia subito il motore su GitHub (workflow_dispatch) invece di aspettare il giro programmato.
// Al massimo una richiesta ogni 3 minuti, e non se il motore sta già lavorando a questo lavoro.
// Con l'id del lavoro parte un motore SOLO per quel reel, in parallelo agli altri (5 reel insieme = il tempo di uno).
export async function svegliaMotore(env, perche = '', lavoroId = 0) {
  const cfg = await configurazione(env);
  if (!cfg.GITHUB_TOKEN) return false;
  const chiave = 'MOTORE_SVEGLIATO' + (lavoroId ? '_' + lavoroId : '');
  const ultimo = (await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', chiave))?.valore;
  if (ultimo && Date.now() - Number(ultimo) < 3 * 60e3) return true;
  await run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?, ?)', chiave, String(Date.now()));
  const r = await fetch('https://api.github.com/repos/JohnHant91/momento-montaggio/actions/workflows/analizza.yml/dispatches', {
    method: 'POST', body: JSON.stringify(lavoroId ? { ref: 'main', inputs: { lavoro: String(lavoroId) } } : { ref: 'main' }),
    headers: { authorization: `Bearer ${cfg.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'momento-reel', 'x-github-api-version': '2022-11-28' },
  });
  if (r.status !== 204) {
    console.log('sveglia motore', r.status, (await r.text()).slice(0, 200));
    return false;
  }
  return true;
}

async function avvisoMotore(env, L) {
  if (!(L.motore_fino && L.motore_fino > ora())) {
    const ok = await svegliaMotore(env, '', L.id).catch(() => false);
    if (ok && !L.motore_svegliato) {
      await run(env, 'UPDATE lavori SET motore_svegliato=1 WHERE id=?', L.id).catch(() => {});
      await log(env, L.id, 'motore', '⚡ motore GitHub avviato: parte entro un minuto');
    }
  }
  if (L.motore_visto && Date.now() - new Date(L.motore_visto) > 75 * 60e3 && !(L.motore_fino && L.motore_fino > ora())) {
    await log(env, L.id, 'motore', 'il motore GitHub non si fa vivo da più di un\'ora: controlla GitHub → momento-montaggio → Actions', 'warn');
    await run(env, 'UPDATE lavori SET motore_visto=? WHERE id=?', ora(), L.id);
  }
  return false;
}

export const chiaveRif = (v) => `rif2:${v.piattaforma}:${v.id}`;

// Le clip le prepara il motore su GitHub Actions (download da pCloud + copia leggera 720p con ffmpeg)
// e le manda alla regia, che le passa a Gemini: vedi motore.js. Qui si aspetta e si tiene il conto.
// FONTI DEL GIRATO: ognuna restituisce l'elenco delle clip ({nome, dimensione, hash, tecnico, sorgente}).
// Il resto del sistema (analisi, scheda, regia, montatore) non sa da dove arrivano. Per aggiungere stock/AI/HeyGen
// basta aggiungere una voce qui e il download corrispondente nel motore (motore/analizza.py → scarica).
// dove il motore prende un file: pCloud (fileid), link diretto (url) o archivio interno ("archivio:percorso", firmato quando parte il motore)
// "ruota": gradi in senso orario per raddrizzare il girato coricato (lo vede Iris sui fotogrammi, lo applica il montatore)
// regola di Johnny: le clip orizzontali restano orizzontali (il montatore ritaglia il 9:16 sul soggetto); si gira solo
// il girato che Iris vede davvero coricato o capovolto
const ruotaDi = (c) => { const r = Number(c?.analisi?.rotazione); return [90, -90, 180].includes(r) ? { ruota: r } : {}; };
export const rifSorgente = (c) => ({ ...(c?.sorgente?.tipo === 'url' ? { fileid: null, url: c.sorgente.url }
  : c?.sorgente?.tipo === 'archivio' ? { fileid: null, url: 'archivio:' + c.sorgente.percorso } : { fileid: c?.fileid, url: null }), ...ruotaDi(c) });

export const FONTI = {
  archivio: { nome: 'Archivio dell\u2019agenzia', pronta: (L) => !!L.pcloud, elenca: async (L, env) => A.clipArchivio(env, L.pcloud) },
  pcloud: { nome: 'Cartella pCloud', pronta: (L) => !!L.pcloud, elenca: async (L) => (await S.pcloudClip(L.pcloud)).map((c) => ({ ...c, sorgente: { tipo: 'pcloud', fileid: c.fileid } })) },
  // video da link diretti (es. il video del tuo avatar HeyGen): in "pcloud" c'è l'elenco JSON [{nome, url, durata}]
  url: { nome: 'Video da link', pronta: (L) => !!L.pcloud, elenca: async (L) => [...J(L.pcloud, []).filter((v) => /^https:\/\//.test(v?.url || '')).map((v, i) => {
    let h = 2166136261; for (const ch of v.url.split('?')[0]) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return { fileid: `url${i}_${(h >>> 0).toString(36)}`, nome: String(v.nome || `video_${i + 1}.mp4`), hash: (h >>> 0).toString(36), dimensione: 0, sorgente: { tipo: 'url', url: v.url },
      tecnico: { durata_sec: Number(v.durata) || null, orientamento: 'verticale' } };
  }),
  // in più, le clip della cartella pCloud che Johnny aggiunge (b-roll, foto): {cartella: link}
  ...(await Promise.all(J(L.pcloud, []).filter((v) => /code=/.test(v?.cartella || '')).slice(0, 1).map((v) => S.pcloudClip(v.cartella)))).flat().map((c) => ({ ...c, sorgente: { tipo: 'pcloud', fileid: c.fileid } }))] },
};

async function faseClip(env, cfg, L) {
  const fonte = FONTI[L.fonte || 'pcloud'] || FONTI.pcloud;
  if (!fonte.pronta(L)) { await log(env, L.id, 'analista', 'nessun girato collegato: preparo scheda e lista delle riprese'); return true; }
  let clip = J(L.clip, null);
  if (!clip) {
    const lista = await fonte.elenca(L, env);
    if (!lista.filter((c) => c.tipo !== 'musica').length) throw new Error(L.fonte === 'archivio' ? `nella cartella ${L.pcloud} dell'archivio non ci sono né video né foto` : 'nella cartella pCloud non ci sono né video né foto');
    // niente brano nella cartella: Rocco ne prende uno dalla cartella Musica dell'archivio (le sottocartelle sono l'umore)
    // nuove disposizioni: la musica la mette Johnny in approvazione; dall'archivio solo se la chiede nel prompt
    if (env.ARCHIVIO && !lista.some((c) => c.tipo === 'musica') && /musica (dall'?|dell'?)archivio|metti (tu )?la musica|con (la )?musica/i.test(L.prompt || '')) {
      const st = J(L.stile, null);
      const b = await A.branoArchivio(env, async (brani) => {
        const r = await S.claude({ ...cfg, CLAUDE_MODEL: cfg.CLAUDE_MODEL_LIGHT || cfg.CLAUDE_MODEL }, 'Scegli la musica per un reel. Rispondi solo JSON {"i": numero}.',
          `REEL: ${L.prompt}\nSTILE: ${st?.nome || st?.genere || '-'} ${(st?.mood || []).join(', ')}\nBRANI (umore = sottocartella):\n${JSON.stringify(brani)}\nScegli il brano più adatto all'umore del reel.`, { maxTokens: 60 });
        return Number(r?.i);
      }).catch(() => null);
      if (b) { lista.push(b); await log(env, L.id, 'regista', `🎵 musica dall'archivio: ${b.cartella.split('/').slice(1).join(' / ') || 'Musica'} · ${b.nome}`); }
    }
    clip = lista.map((c) => ({ ...c, stato: 'da_guardare' }));
    // le clip già viste in altri lavori non si riguardano (e non si pagano)
    let gia = 0;
    for (const c of clip) {
      const r = await one(env, 'SELECT dati FROM cache_analisi WHERE chiave=?', chiaveClip(c));
      if (r) { const d = J(r.dati, {}); Object.assign(c, { stato: 'fatto', analisi: d.analisi || d, tecnico: d.tecnico || c.tecnico }); gia++; }
    }
    await run(env, 'UPDATE lavori SET clip=?, motore_visto=? WHERE id=?', JSON.stringify(clip), ora(), L.id);
    const peso = Math.round(clip.reduce((s, c) => s + (c.dimensione || 0), 0) / 1073741824 * 10) / 10;
    await log(env, L.id, 'analista', `${clip.length} clip trovate (${fonte.nome}, ${peso} GB)${gia ? `, ${gia} già viste in passato` : ''}`);
    if (clip.some((c) => c.stato === 'da_guardare')) await log(env, L.id, 'motore', 'chiamo il motore GitHub: scarico e misuro le clip per Ada');
  }
  if (!clip.some((c) => c.stato === 'da_guardare')) {
    // Dario guarda i problemi trovati da Iris e dice cosa rifare la prossima volta (senza costi: legge le analisi)
    const brutte = clip.filter((c) => c.stato === 'fatto' && (c.analisi?.problemi || []).length);
    if (brutte.length && !J(L.montaggio, null)?.consigli_dario) {
      const tipi = {}; for (const c of brutte) for (const pr of [].concat(c.analisi.problemi)) { const k = String(pr.tipo || pr).toLowerCase().split(/[ :,(]/)[0]; tipi[k] = (tipi[k] || 0) + 1; }
      const top = Object.entries(tipi).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} (${n})`).join(', ');
      await log(env, L.id, 'videomaker', `📱 Dario: ${brutte.length} clip su ${clip.length} hanno problemi (${top}). Rocco userà i tratti buoni; alla prossima ripresa: camera ferma o gimbal, più luce, 2-3 secondi di margine prima e dopo ogni azione.`);
    }
    return true;
  }
  return avvisoMotore(env, L);
}

export const chiaveClip = (c) => `clip2:${c.hash}:${c.dimensione}`;
// MONTAGGI SCARTATI: quando Johnny elimina un reel (o chiede di rimontarlo) i tratti usati restano in memoria per quel girato,
// così il montaggio successivo sulle stesse clip è per forza diverso
export const chiaveScarti = (L) => 'SCARTATI:' + (L.pcloud ? L.fonte + ':' + L.pcloud : (J(L.clip, []) || []).map((c) => c.nome).filter(Boolean).sort().join('|').slice(0, 400));
export function trattiDi(m) {
  const t = m?.revisore?.tratti;
  if (Array.isArray(t) && t.length) return t.map((x) => ({ nome: x.nome, in: Number(x.in) || 0, dur: Number(x.dur) || 0 }));
  return (m?.piano?.segmenti || []).map((x) => ({ nome: x.nome, in: Number(x.in) || 0, dur: Number(x.durata) || 0 })).filter((x) => x.nome);
}
// TAGLIO DI JOHNNY: i pezzi del reel finito, con il link per guardare la clip intera dal telefono
export async function pezziReel(env, origine, L) {
  const m = J(L.montaggio, null), tutte = J(L.clip, []) || [];
  const tr = m?.revisore?.tratti || [];
  const segs = m?.piano?.segmenti || [];
  const out = [];
  for (const [k, t] of tr.entries()) {
    const c = tutte.find((x) => x.nome === t.nome);
    const seg = segs.find((x) => x.nome === t.nome) || {};
    const proxy = !!m.revisore?.proxy;
    const link = proxy ? `/api/lavori/${L.id}/proxy-${k}.mp4?v=${m.versione || 1}` : c?.sorgente?.tipo === 'archivio' ? await A.linkFirmato(env, origine, c.sorgente.percorso) : (c?.sorgente?.tipo === 'url' ? c.sorgente.url : null);
    out.push({ pezzo: k, nome: t.nome, in: t.in, dur: t.dur, durata_clip: Number(c?.tecnico?.durata_sec) || null, link, ruota: proxy ? 0 : (seg.ruota ?? c?.analisi?.rotazione ?? 0),
      problema: (m.taglio?.pezzi || []).find((x) => x.pezzo === k)?.problema || null });
  }
  return { pezzi: out, taglio: m?.taglio || null };
}
export async function applicaTagli(env, L, tagli) {
  const m = J(L.montaggio, null), tutte = J(L.clip, []) || [];
  const tr = m?.revisore?.tratti || [], segs = m?.piano?.segmenti || [];
  if (!tr.length || !segs.length) throw new Error('questo reel non ha ancora i pezzi da tagliare');
  const usati = new Set();
  // ricostruisco il montaggio com'è uscito, pezzo per pezzo, tutto bloccato: cambia solo quello che tagli tu
  const nuovi = tr.map((t, i) => {
    let j = segs.findIndex((x, k) => !usati.has(k) && x.nome === t.nome);
    if (j < 0 && i < segs.length && !usati.has(i)) j = i;
    if (j >= 0) usati.add(j);
    const base = segs[j >= 0 ? j : Math.min(i, segs.length - 1)];
    const c = tutte.find((x) => x.nome === t.nome);
    const src = base.nome === t.nome || !c ? {} : { clip: tutte.indexOf(c), ...rifSorgente(c), nome: c.nome };
    return { ...base, ...src, in: Number(t.in) || 0, durata: Number(t.dur) || base.durata, in_bloccato: true };
  });
  const fatti = [];
  for (const x of tagli || []) {
    const s = nuovi[Number(x.pezzo)];
    const da = Number(x.da), a = Number(x.a);
    if (!s || !(a > da) || da < 0) continue;
    const vel = s.rallenty ? 0.5 : Number(s.velocita) || 1;
    s.in = Math.round(da * 100) / 100;
    s.durata = Math.round(Math.min(12, Math.max(0.4, (a - da) / vel)) * 100) / 100;
    s.in_bloccato = true;
    fatti.push(`pezzo ${Number(x.pezzo) + 1} (${s.nome}) da ${da.toFixed(1)} a ${a.toFixed(1)} s`);
  }
  if (!fatti.length) throw new Error('nessun taglio valido: segna inizio e fine');
  m.piano.segmenti = nuovi;
  Object.assign(m, { stato: 'da_fare', tentativi: 0, errore: null, salta_qa: true, versione: (m.versione || 1) + 1, taglio: null });
  delete m.qa;
  await run(env, "UPDATE lavori SET montaggio=?, stato='in_corso', fase='montaggio', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(m), ora(), L.id);
  await log(env, L.id, 'editor', `✂️ tagli di Johnny: ${fatti.join(' · ')}. Rimonto solo con questi, il resto resta uguale`);
  return fatti;
}
export async function ricordaScartato(env, L) {
  const m = J(L.montaggio, null);
  const tratti = trattiDi(m);
  if (!tratti.length) return 0;
  const k = chiaveScarti(L);
  const vecchi = J((await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', k))?.valore, []) || [];
  vecchi.unshift({ quando: ora(), tratti, apertura: tratti[0]?.nome || null });
  await run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)', k, JSON.stringify(vecchi.slice(0, 5)));
  return tratti.length;
}
export { analisiClip, analisiRiferimento };

async function faseScheda(env, cfg, L) {
  // reel avatar: niente scheda da Claude (era la chiamata più cara). Al Regista arrivano i riferimenti già analizzati, in breve.
  if (J(L.stile, null)?.avatar) {
    const spunti = J(L.riferimenti, []).filter((r) => r.stato === 'fatto' && r.analisi).slice(0, 6).map((r) => {
      const a = r.analisi; return { url: r.video.url, views: r.video.views, gancio: a.gancio, ritmo: a.ritmo, durata_media_inquadratura_sec: a.durata_media_inquadratura_sec, tagli_sul_beat: a.tagli_sul_beat, struttura: (a.struttura || []).slice(0, 5), testi: a.testi, sottotitoli: a.sottotitoli_parlato, grafiche: a.grafiche || a.elementi_grafici, transizioni: a.transizioni, colore: a.colore || a.color };
    });
    await run(env, 'UPDATE lavori SET scheda=? WHERE id=?', JSON.stringify({ richiesta_di_johnny: L.prompt, reel_di_riferimento_da_cui_prendere_spunto: spunti,
      come_usarli: 'Prendi spunto da gancio, ritmo, grafiche, testi e transizioni di questi reel del settore (senza copiarli). Il parlato e il copione restano quelli dell\'avatar.' }), L.id);
    await log(env, L.id, 'direttore', `${spunti.length} reel di riferimento passati al Regista come spunto`);
    return;
  }
  await log(env, L.id, 'direttore', 'incrocio riferimenti e clip, scrivo la scheda tecnica');
  const rif = J(L.riferimenti, []).filter((r) => r.stato === 'fatto').map((r) => ({
    piattaforma: r.video.piattaforma, url: r.video.url, views: r.video.views, likes: r.video.likes,
    scelto_da_johnny: !!r.video.scelto_da_johnny, analisi: r.analisi,
  }));
  const clip = (J(L.clip, []) || []).filter((c) => c.stato === 'fatto').map((c) => (c.tipo === 'musica' || c.tecnico?.tipo === 'musica'
    ? { file: c.nome, tipo: 'MUSICA del reel (brano con licenza)', durata_sec: c.tecnico?.durata_sec, bpm: c.analisi?.musica?.bpm, parte_forte_da_sec: c.analisi?.musica?.entrata }
    : { file: c.nome, tecnico: c.tecnico, ...c.analisi }));
  const R = ricetta(J(L.stile, null));
  const extraStile = R ? `\n\nSTILE DI MONTAGGIO CHIESTO DA JOHNNY: ${R.nome}\n${R.regole}\nNei riferimenti ci sono anche reel montati in questo stile (fuori settore): studiali per il LINGUAGGIO (ritmo, durata dei pezzi, transizioni, movimenti, color, testi, uso del rallenty, apertura e finale), non per i contenuti. Nella scheda aggiungi "ricetta_stile": {"ritmo": "...", "durata_pezzi_sec": [min, max], "transizioni": "...", "movimenti": "...", "color": "...", "testi": "...", "rallenty": "...", "apertura_finale": "...", "musica": "...", "da_evitare": "..."} da applicare alle clip di Johnny.` : '';
  const s = await S.claude(cfg, SISTEMA_SCHEDA, scheda(L.prompt, J(L.piano, {}), rif, clip) + extraStile, { maxTokens: 24000 });
  await run(env, 'UPDATE lavori SET scheda=? WHERE id=?', JSON.stringify(s), L.id);
  await log(env, L.id, 'direttore', `scheda pronta: ${s.titolo_lavoro || ''}`);
}

// ------------------------------------------------------------------ motore
// ------------------------------------------------------------------ Regista: dalla scheda al piano di montaggio
const LOOKS = ['neon_notte', 'estate_luminosa', 'autunno_caldo', 'inverno_freddo', 'street_urbano', 'emozionale_film', 'romantico_soft', 'amichevole_solare', 'natalizio_caldo', 'spot_contrasto', 'moody_caldo', 'caldo_cinematico', 'pulito_commerciale', 'teal_orange', 'moody_scuro', 'naturale_vivace', 'bn_contrasto', 'pastello_soft', 'vintage_film'];
const TRANSIZIONI = ['taglio_netto', 'dissolvenza', 'flash_bianco', 'whip_pan', 'zoom', 'glitch', 'slide', 'fadenero',
  // transizioni del montatore nuovo (Remotion)
  'zoom_blur', 'whip_sx', 'whip_dx', 'whip_su', 'rgb_split', 'light_leak', 'scorri_su', 'zoom_in', 'spin', 'iris', 'sfocatura', 'flash_nero',
  // famiglia xfade (tendine, spinte, coperture, forme, strisce, 3D)
  'tendina_sx', 'tendina_dx', 'tendina_su', 'tendina_giu', 'spingi_sx', 'spingi_dx', 'spingi_giu', 'copri_sx', 'copri_dx', 'copri_su', 'copri_giu', 'cerchio_chiudi', 'rombo', 'rettangolo', 'apri_verticale', 'apri_orizzontale', 'diagonale_sx', 'diagonale_dx', 'strisce_orizzontali', 'strisce_verticali', 'radiale', 'schiaccia_o', 'schiaccia_v', 'grigio', 'cubo_sx', 'cubo_dx', 'ribalta', 'caduta', 'zoom_out', 'persiana'];
// famiglie: lo stile che permette "whip_pan" permette anche whip_sx/dx/su, e così via
const FAMIGLIA_TR = { tendina_sx: 'slide', tendina_dx: 'slide', tendina_su: 'slide', tendina_giu: 'slide', spingi_sx: 'slide', spingi_dx: 'slide', spingi_giu: 'slide', copri_sx: 'slide', copri_dx: 'slide', copri_su: 'slide', copri_giu: 'slide', cerchio_chiudi: 'dissolvenza', rombo: 'dissolvenza', rettangolo: 'dissolvenza', apri_verticale: 'dissolvenza', apri_orizzontale: 'dissolvenza', diagonale_sx: 'dissolvenza', diagonale_dx: 'dissolvenza', strisce_orizzontali: 'slide', strisce_verticali: 'slide', radiale: 'dissolvenza', schiaccia_o: 'zoom', schiaccia_v: 'zoom', grigio: 'dissolvenza', cubo_sx: 'zoom', cubo_dx: 'zoom', ribalta: 'zoom', caduta: 'zoom', zoom_out: 'zoom', persiana: 'slide', whip_sx: 'whip_pan', whip_dx: 'whip_pan', whip_su: 'whip_pan', zoom_blur: 'zoom', zoom_in: 'zoom', spin: 'zoom', rgb_split: 'glitch', light_leak: 'dissolvenza', sfocatura: 'dissolvenza', iris: 'dissolvenza', scorri_su: 'slide', flash_nero: 'fadenero' };
const STILI_TITOLO = ['anima', 'blur', 'sale', 'rotazione', 'numero', 'evidenziatore', 'macchina', 'hyper', 'scintille', 'aurora', 'impatto', 'etichetta', 'comic', 'flip3d', 'ombra'];
const STILI_SOTT = ['karaoke', 'box', 'pop', 'grassetto', 'minimal', 'neon', 'chiave', 'contorno', 'macchina', 'mano'];
const FONT_REEL = ['montserrat', 'inter', 'bebas', 'playfair', 'pacifico'];
const EFFETTI_PEZZO = ['dolly_in', 'slider_dx', 'slider_sx', 'punch_in', 'zoom_lento', 'zoom_out', 'shake', 'nessuno'];
const EFFETTI_GLOBALI = ['grana', 'vignettatura', 'bande_cinema', 'light_leak', 'glow', 'vhs'];
const FORMATI_REEL = ['montaggio', 'talking_head', 'carosello', 'split_grafico', 'parole_dietro'];
const SPLITTISH = (f) => f === 'split_grafico' || f === 'parole_dietro'; // formati parlati con grafiche Remotion
const ADESIVI = ['cuore', 'like', 'fuoco', 'stella', 'soldi', 'razzo', 'check', 'instagram', 'ai'];
const TIPI_GRAFICA = ['oggetto', 'titolo', 'numero', 'sito', 'terminale', 'contatore', 'lista', 'confronto', 'card', 'chat', 'barre', 'riepilogo'];
const EFFETTI_SPLIT = ['scrivi', 'cornice', 'cursore', 'coriandoli', 'fantasma', 'icone', 'lente', 'successo', 'scossa', 'dietro', 'esce', 'adesivo'];
const FONT_SPLIT = { titoli: ['Instrument Serif', 'Playfair Display', 'Fraunces', 'DM Serif Display', 'Inter', 'Space Grotesk', 'Manrope'], testo: ['Inter', 'Space Grotesk', 'Manrope'], mono: ['JetBrains Mono', 'IBM Plex Mono'] };

const SISTEMA_REGISTA = `Sei il Regista e il Copy di Momento Produzione. Trasformi la SCHEDA TECNICA del Direttore creativo in un
PIANO DI MONTAGGIO preciso che un montatore automatico eseguirà alla lettera. Scegli i pezzi migliori dalle clip analizzate
(usa solo momenti con qualità alta e senza problemi, rispetta i tempi da/a dei momenti), costruisci gancio → sviluppo → climax →
chiusura, alterna inquadrature (totale/dettaglio/primo piano), non ripetere lo stesso momento. REGOLA DI JOHNNY: una clip lunga con più momenti
si può usare più volte, ma solo per momenti DIVERSI (almeno 2 s fra un tratto e l'altro, mai lo stesso tratto due volte); se le clip non bastano, fai un reel più corto. Il rallenty va su clip girate a
48 fps o più (rallenty_possibile). Testi brevi, in italiano corretto, niente formule abusate. Rispondi SOLO JSON COMPATTO
(niente a capo né spazi superflui; ogni "motivo" al massimo 8 parole; ometti i campi null): ogni parola scritta costa.

${MANUALE_REGISTA}

${MANUALE_MODELLO}

${MANUALE_SPOT}

${MANUALE_FORMATI}

${MANUALE_COPY}

${MANUALE_PUBBLICAZIONE}

${MANUALE_AUDIO}`;

const pianoMontaggio = (scheda, clip) => `SCHEDA TECNICA:
${JSON.stringify(scheda)}

CLIP DISPONIBILI (indice, file, dati tecnici, momenti con tempi e qualità, problemi):
${JSON.stringify(clip)}

VALORI AMMESSI
- look: ${LOOKS.join(', ')}
- transizione_in: ${TRANSIZIONI.join(', ')} (la prima clip non ne ha)
- effetto: ${EFFETTI_PEZZO.join(', ')}
- effetti_globali: ${EFFETTI_GLOBALI.join(', ')}
- lut: la sceglie Johnny prima del montaggio, tu metti sempre null
- stile testi: titolo_grande_centrale, etichetta_box, sottotitolo_classico; posizione: alto, centro, terzo_inferiore
- REGOLA FERREA DI JOHNNY: nei titoli e nei testi usa SOLO informazioni che Johnny ha scritto nella richiesta o che si sentono nel girato. Mai inventare numeri, tempi (es. "48 ore di lievitazione"), prezzi, ingredienti, premi o promesse: se non hai informazioni, titoli di atmosfera col nome del prodotto o del cliente, oppure nessun titolo.
- REGOLA DEL GIRATO: mai pezzi mossi, con scatti di camera o problemi; scegli il tratto fermo della clip o un'altra ripresa dello stesso momento.
- MONTATORE (formato montaggio): "titoli" in motion graphics, stile ${STILI_TITOLO.join(', ')} (con stile "anima" scegli anche "animazione" tra: ${Object.entries(ANIMAZIONI).map(([k, v]) => k + ' = ' + v[1]).join('; ')} e "unita": lettere|parole|riga; ogni titolo può avere un suo "font" Google); posizione alto (sopra la testa), sx / dx (ai lati del viso), basso, centro (SOLO su clip senza persone: la faccia deve restare sempre libera); sottotitoli.stile: ${STILI_SOTT.join(', ')}; font_reel: {titoli, testo} con il NOME di qualsiasi Google Font (es. Anton, Archivo Black, Oswald, Poppins, Space Grotesk, DM Serif Display, Caveat, Permanent Marker; i nostri di casa: ${FONT_REEL.join(', ')}); look_reel.particelle: neve, polvere, coriandoli, bokeh (es. neve per lo spot di Natale)
- formato: montaggio, talking_head, carosello, split_grafico, parole_dietro (vedi FORMATI DEL MONTATORE)
- adesivi (solo parole_dietro): ${ADESIVI.join(', ')}
- grafiche (solo split_grafico): ${TIPI_GRAFICA.join(', ')}; effetti delle grafiche: ${EFFETTI_SPLIT.join(', ')}; font_split.titoli: ${FONT_SPLIT.titoli.join(', ')}; testo: ${FONT_SPLIT.testo.join(', ')}; mono: ${FONT_SPLIT.mono.join(', ')}

JSON (i campi "solo talking_head" e "solo carosello" mettili solo per quel formato):
{
  "formato": "montaggio|talking_head|carosello|split_grafico|parole_dietro",
  "multicam": true/false (solo talking_head e parole_dietro: più camere virtuali dalla stessa ripresa dritta — larga, media, primo piano, di lato — che cambiano sull'inizio delle frasi con una frustata di 0,2 s; usalo quando la persona parla a lungo ferma in camera),
  "adesivi": [{"sulla_parola": "parola detta", "tipo": "cuore|like|fuoco|stella|soldi|razzo|check|instagram|ai"}] (solo parole_dietro, 3-5 in tutto il video),
  "durata_target": n,
  "look": "...", "intensita_look": 0.6-1.0,
  "lut": {"nome": "una LUT della libreria (pellicola o grading vero, prende il posto del look)", "intensita": 0.3-1.0, "perche": "..."} oppure null,
  "effetti_globali": ["..."],
  "font": {"titoli": "font Google Fonts", "testi": "font Google Fonts"},
  "colori": {"testo": "#hex", "accento": "#hex", "box": "#hex"},
  "sfx": true/false, "riser": secondi del primo picco (o null),
  "segmenti": [{"clip": indice, "in": secondi nella clip, "durata": secondi nel reel, "rallenty": bool, "effetto": "...",
                "transizione_in": "...", "audio": 0-1 (suono originale), "motivo": "perché questo pezzo qui",
                "testo": {"testo": "...", "stile": "...", "posizione": "...", "evidenzia": "parola"} oppure null,
                "zoom_fisso": {"z": 1.2-2.5, "cx": 0-1, "cy": 0-1} oppure null (avvicina su un dettaglio dell'inquadratura),
                "fuoco": "l'oggetto su cui deve stare l'attenzione in questo pezzo, in 1-4 parole (es. \"la scatola\", \"le mani\") oppure null:
                          il montatore lo trova nell'immagine e sposta/stringe l'inquadratura su di lui. Mettilo SEMPRE quando la richiesta
                          dice dove deve stare l'attenzione (es. \"nel finale l'attenzione sulla scatola\") nei pezzi dove quell'oggetto c'è",
                "in_preciso": true se il momento esatto conta (il montatore altrimenti può spostare l'inizio di ±0,8 s sul tratto più fermo)}],
  "sottotitoli": {"usare": bool, "stile": "parola_per_parola|karaoke_evidenziato|sottotitolo_classico|piccoli_alto (solo talking_head: sottotitoli piccoli in alto, i concetti li portano i cartelli)", "posizione": "terzo_inferiore"},
  "titoli": [{"testo": "1-6 parole", "da": secondi sul reel, "a": secondi, "stile": "...", "posizione": "alto|sx|dx|basso|centro", "sotto": "riga piccola facoltativa", "numero": {"valore": n, "prima": "€", "dopo": " ore"} (solo stile numero), "parole": ["solo stile rotazione"]}] (solo montaggio: 3-8 titoli in motion graphics sui momenti forti, mai sulla faccia),
  "elementi": [{"tipo": "freccia|freccia_curva|cerchio|riquadro|sottolinea|scarabocchio|spunta|croce|scintille|lente|conto_rovescia|etichetta|punto|stelle", "da": secondi, "a": secondi, "x": 0-1, "y": 0-1 (punto del fotogramma: dove sta il dettaglio da indicare; la freccia punta lì), "verso": "sx|dx|su|giu", "testo": "solo etichetta", "numero": "solo conto_rovescia (es. 3)", "dimensione": 0.5-2} ] (solo montaggio: 0-6 elementi grafici disegnati a mano per indicare un dettaglio, una cosa giusta/sbagliata, un momento; mai sulla faccia),
  "barra": true/false (barra di avanzamento in alto per tutto il reel: utile nei reel lunghi o a punti),
  "look_reel": {"grana": 0-0.15, "vignetta": 0-0.6, "particelle": "neve|polvere|coriandoli|bokeh|null", "tinta": "#hex o null", "tinta_forza": 0-0.4} (solo montaggio),
  "font_reel": {"titoli": "...", "testo": "..."} (solo montaggio),
  "chiusura": {"testo": "...", "sottotesto": "cta breve", "evidenzia": "parola", "durata": 2-3, "colore": "#hex"} oppure null (non per talking_head/carosello),
  "finale": "nero (l'ultima immagine scende al nero) | bianco (sfuma al bianco e compare il logo del cliente, se c'è) | null",
  "gancio": {"testo": "solo carosello: frase breve sulla prima slide; talking_head: lascia null (usa la prima frase detta)", "evidenzia": ["parole del gancio da colorare"]},
  "evidenzia": ["solo talking_head: 3-8 parole chiave del discorso da colorare nei sottotitoli"],
  "cartelli": [{"testo": "solo talking_head: 1-4 parole chiave GRANDI su fascia colorata inclinata (es. CLAUDE, IL GIRATO, cosa NON si può fare)", "sulla_parola": "parola detta su cui entra", "colore": "blu|rosa|verde|#hex", "stile": "fascia|grande|barrato (barrato = parola cancellata, per smentire)", "durata": 1.2-2.2}],
  "schede": [{"clip": indice di una FOTO o di uno SCREENSHOT caricato, "sulla_parola": "parola detta su cui entra", "etichetta": "prima|dopo|1|esempio… (max 2 parole)", "lato": "sx|dx", "durata": 2-6}],
  "correzioni": {"parola_sentita_male": "parola giusta"},
  "broll": [{"clip": indice, "in": secondi, "durata": 1.5-3, "sulla_parola": "parola detta su cui entra", "rallenty": bool}],
  "cta": {"testo": "solo talking_head/carosello: call to action breve (es. Scrivici ORTO in DM)"},
  "grafiche": [{"tipo": "solo split_grafico: oggetto|titolo|numero|sito|terminale|contatore|lista|confronto|card|chat|barre|riepilogo", "sulla_parola": "parola detta su cui entra (in ordine)", "pieno": true se prende tutto lo schermo,
                "effetti": ["2-3 tra scrivi|cornice|cursore|coriandoli|fantasma|icone|lente|successo|scossa|dietro|esce|adesivo (vedi le regole del formato)"],
                "dati": {"titolo: testo, accento (parola in corsivo colorato), sotto | numero: valore, etichetta | sito: url VERO e completo del sito citato, evidenzia {x,y,w,h 0-1} | terminale: comando, righe[] | contatore: da, a, etichetta, prefisso, suffisso | lista: titolo, voci[], spunte, icone[] (facoltative, una icona Iconify ph:...-bold per voce) | confronto: prima {titolo, voci[]}, dopo {titolo, voci[]} | card: titolo, testo, icona (nome icona Iconify del set Phosphor, es. ph:coffee-bold, ph:fire-bold, ph:map-pin-bold, ph:clock-bold, ph:star-bold — mai emoji), etichetta | oggetto: simbolo (1-3 caratteri), titolo, accento | chat: messaggi [{chi: tu|ai, testo}] | barre: titolo, unita, voci [{etichetta, valore}] | riepilogo: titolo, voci [{nome, valore}] | in tutti: dietro (parola gigante dietro Johnny), decor [simboli delle icone], successo (testo barra verde)"}}],
  "palette": {"fondo": "#hex chiaro tipo carta", "inchiostro": "#hex testo", "accento": "#hex unico colore forte, scelto per l'argomento", "secondario": "#hex tenue dell'accento", "tenue": "rgba(...) per la griglia"} (solo split_grafico),
  "riquadro": "pieno|box" (solo split_grafico: box = persona in un riquadro piccolo centrato in basso col bordo colorato, sfondo chiaro a macchie, titoli grandi in alto, sottotitolo karaoke a pillola; pieno = persona su tutta la metà bassa),
  "font_split": {"titoli": "...", "testo": "...", "mono": "..."} (solo split_grafico),
  "tracker": {"totale": n, "voci": [{"etichetta": "nome breve", "sulla_parola": "parola su cui entra"}]} oppure null (solo split_grafico, per i video a lista),
  "slide": [{"clip": indice di una foto/slide, "durata": secondi}],
  "pannello": {"chip": "TIP|DATO|COME FARE", "titolo": "max 6 parole", "tipo": "line|bar|steps", "punti": [{"etichetta": "...", "valore": n}],
               "passi": ["solo per steps, 2-5 frasi brevi"], "unita": "€|%|...", "badge": "risultato chiave breve, es. 6x", "sulla_parola": "parola detta su cui entra", "tema": "dark|light"} oppure null,
  "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}],
  "loop": "come il finale si ricollega al primo pezzo",
  "copertina": {"clip": indice, "secondo": n (un momento con il viso nitido e un'espressione forte, se c'è una persona), "testo": "titolo della copertina stile miniatura YouTube: 2-5 parole forti, curiosità o promessa, niente dati inventati", "evidenzia": "LA parola del titolo da mettere nel riquadro colorato", "colore": "#hex del riquadro (giallo #FFD60A di base, o un colore del brand che contrasti)"},
  "parola_chiave": "...",
  "caption": "caption finale: prima riga con la parola chiave, corpo, UNA call to action",
  "hashtag": ["3-5 etichette specifiche"],
  "musica_da_mettere": "che brano cercare su Instagram e da che secondo, a che volume rispetto al suono originale"
}`;

// Correttore: ogni testo che va in grafica viene riletto (modello leggero, pochi centesimi) contro quello che viene detto
// davvero e contro il copione: italiano corretto (accenti, apostrofi, maiuscole, concordanze) e niente fatti, numeri,
// nomi o siti inventati. Corregge sul posto; se un testo non si può salvare lo toglie.
export async function correggiTesti(env, cfg, L, clip, T) {
  const voci = [];
  const testi = (o, via) => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && /[a-zà-ú]{2}/i.test(v) && !/^(https?:|#|rgba?\()/.test(v) && !['tipo', 'stile', 'colore', 'lato', 'tema', 'sulla_parola', 'url', 'icona', 'chip'].includes(k)) voci.push({ id: voci.length, testo: v, set: (x) => { o[k] = x; } });
    else if (v && typeof v === 'object') testi(v, via); } };
  (T.grafiche || []).forEach((g) => testi(g.dati));
  (T.cartelli || []).forEach((c) => testi(c));
  (T.schede || []).forEach((c) => testi(c));
  testi(T.copertina); testi(T.pannello);
  (T.altri || []).forEach((x) => testi(x));
  if (!voci.length) return;
  const detto = clip.flatMap((c) => (c.trascrizione || []).map((x) => (typeof x === 'string' ? x : x.testo || x.t || ''))).join(' ').slice(0, 6000);
  try {
    const out = await S.claude({ ...cfg, CLAUDE_MODEL: cfg.CLAUDE_MODEL_LIGHT || cfg.CLAUDE_MODEL }, `Sei il correttore di bozze di AGENZIA MOMENTO AI. Rileggi i testi che compariranno nelle grafiche di un reel.
Regole: 1) italiano corretto: ortografia, accenti (è/é, perché, più, già), apostrofi, concordanze, maiuscole; niente parole inventate o storpiate; i nomi di prodotti e marchi restano come si scrivono davvero (ChatGPT, Claude, Instagram).
2) niente fatti inventati: un numero, una cifra, un nome, un sito o una promessa che NON compaiono in quello che viene detto o nel copione vanno tolti o resi generici.
3) non riscrivere per gusto: cambia solo se è sbagliato; mantieni la lunghezza (sono testi brevi da grafica).`,
    `COPIONE / RICHIESTA: ${String(L.prompt || '').slice(0, 5000)}
QUELLO CHE VIENE DETTO NEL VIDEO: ${detto || '(nessuna trascrizione)'}
TESTI DA RILEGGERE: ${JSON.stringify(voci.map((v) => ({ id: v.id, testo: v.testo })))}
Rispondi SOLO JSON: {"correzioni": [{"id": n, "testo": "testo corretto, oppure \"\" se va tolto perché inventato", "motivo": "breve"}]} (solo i testi da cambiare; [] se è tutto giusto)`, { maxTokens: 3000 });
    const fatte = [];
    for (const c of out.correzioni || []) { const v = voci[Number(c.id)]; if (!v || typeof c.testo !== 'string' || c.testo === v.testo) continue; v.set(c.testo.slice(0, 300)); fatte.push(`"${v.testo}" → ${c.testo ? '"' + c.testo + '"' : 'tolto'}${c.motivo ? ' (' + c.motivo + ')' : ''}`); }
    // una grafica rimasta senza testo non ha senso: via
    if (T.grafiche) for (let i = T.grafiche.length - 1; i >= 0; i--) { const d = T.grafiche[i].dati || {}; if (!Object.values(d).some((x) => (typeof x === 'string' && x.trim()) || (Array.isArray(x) && x.length) || typeof x === 'number')) T.grafiche.splice(i, 1); }
    await log(env, L.id, 'copy', fatte.length ? `✏️ correttore: ${fatte.length} testi sistemati: ${fatte.join(' · ')}`.slice(0, 900) : `✏️ correttore: ${voci.length} testi delle grafiche riletti, italiano e fatti ok`);
  } catch (e) { await log(env, L.id, 'copy', `correttore non disponibile (${String(e.message).slice(0, 100)}): testi lasciati come sono`, 'warn'); }
}

// regole fisse di Johnny per tutti i reel (modificabili in Impostazioni): Rocco le legge in ogni piano
export const REGOLE_REEL_BASE = `- Vale per QUALSIASI cliente e prodotto (cibo, moda, locali, servizi, oggetti): lo stile è questo, il soggetto cambia.
- Reel di PRODOTTO (misurato sul montaggio vero di Johnny, panettone Nonno Enrico: 48 s, 16 pezzi): 30-50 secondi, 12-16 pezzi.
  APERTURA lenta e d'atmosfera: una inquadratura lunga 4-8 s sulla lavorazione. CENTRO a ritmo: pezzi da 1-3 s che seguono il processo in ordine
  (lavorazione → trasformazione → prodotto finito). CHIUSURA sul prodotto confezionato: 2 inquadrature lunghe da 4-6 s (la scatola, il prodotto in mano/portato verso la camera).
  Momenti che NON possono mancare se sono nel girato: il prodotto che viene spostato/portato, la decorazione finale (granella, glassa), la confezione.
- Il PRODOTTO è il protagonista di ogni pezzo: si vede sempre, al centro dell'attenzione. In ogni clip si prende il momento in cui il prodotto si muove o viene lavorato (glassa che cola, panettone spostato, mani che impastano), mai il prodotto fermo se nella clip c'è il gesto. Usa le AZIONI viste dall'occhio (campo "occhio" delle clip: tempi esatti dei gesti).
- Il pezzo dura quanto il gesto: entra un attimo prima che il gesto inizi ed esce quando finisce (taglio sull'azione).
- Colore (metodo di Johnny): 1) esposizione automatica clip per clip, tutte uguali 2) base neutra Rec.709 3) montaggio 4) color finale UNA volta su tutto il reel. Neri e colori identici fra una clip e l'altra, niente vignettatura. La LUT la sceglie Johnny prima del montaggio.
- Durata massima 1'30" (oltre non è più un Reel).
- Testi, sottotitoli, loghi e il soggetto importante stanno nella zona sicura: 220 px liberi in alto, 450 px in basso, 35 px ai lati; in basso a destra, da 1220 px in giù, ci sono i pulsanti.
- Copertina: titolo e soggetto dentro il 3:4 centrale (1080x1440, da 240 a 1680 px), perché nella griglia del profilo si vede solo quello.
- Le clip orizzontali dritte restano orizzontali: si ritaglia il 9:16 sul soggetto. Si raddrizzano solo quelle girate con la camera in verticale (immagine coricata).
- Una clip lunga con più momenti si può usare più volte, ma solo per momenti DIVERSI: almeno 2 s di distanza fra un tratto e l'altro, mai lo stesso tratto due volte.
- Quando chiedo dove deve stare l'attenzione (es. "nel finale l'attenzione sulla scatola"), quell'oggetto deve stare al centro del 9:16 nei pezzi dove compare (campo "fuoco").
- Niente emoji nei testi a schermo.`;

async function faseRegia(env, cfg, L) {
  const scheda = J(L.scheda, {});
  const tutteC = J(L.clip, []) || [];
  const eMus = (c) => c?.tipo === 'musica' || c?.tecnico?.tipo === 'musica';
  const brani = tutteC.map((c, i) => ({ c, i })).filter(({ c }) => c.stato === 'fatto' && eMus(c));
  const brano = brani.length ? brani[brani.length - 1] : null; // l'ultimo brano messo nella cartella
  const clip = tutteC.map((c, i) => ({ c, i })).filter(({ c }) => c.stato === 'fatto' && !eMus(c)).map(({ c, i }) => ({
    indice: i, file: c.nome, tipo: c.tipo === 'immagine' || c.tecnico?.tipo === 'immagine' ? 'immagine' : 'video', tecnico: c.tecnico,
    descrizione: c.analisi?.descrizione, momenti: (c.analisi?.momenti || []).slice(0, 8), problemi: c.analisi?.problemi, parlato: c.analisi?.parlato,
    trascrizione: (c.analisi?.misure?.parlato?.trascrizione || []).slice(0, 40), testo_nell_immagine: c.analisi?.testo_nell_immagine || undefined,
    verticale: c.analisi?.adatta_al_verticale, occhio: c.analisi?.misure?.occhio || c.occhio || undefined,
  }));
  const prima = J(L.montaggio, null);
  if (!clip.length) {
    // senza girato: Dario (videomaker social) prepara le riprese; il montaggio parte quando arriva il girato
    await log(env, L.id, 'videomaker', '📱 Dario: non c\'è ancora girato, preparo le riprese per i social');
    const lr = await S.claude(cfg, `Sei Dario, videomaker social di AGENZIA MOMENTO AI. Prepari le riprese di reel verticali 9:16 per Instagram e TikTok: il primo secondo deve agganciare,
inquadrature pensate per il verticale (soggetto al centro, spazio sopra per i testi), movimento e luce semplici da fare con telefono o mirrorless, audio pulito.
${(SKILL_V['scripting-and-storyboarding'] || '').slice(0, 3000)}`, `SCHEDA TECNICA:
${JSON.stringify(scheda)}

Non c'è ancora girato. Scrivi la LISTA DELLE RIPRESE necessarie per montare questo reel, nell'ordine del montaggio.
JSON: {"riprese": [{"n": 1, "fase": "gancio|sviluppo|climax|chiusura", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro", "cosa": "...", "movimento": "...", "durata_utile_sec": n, "fps_consigliati": 25|50|60, "note": "luce, angolo, cosa evitare"}],
 "consigli_ripresa": ["..."], "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}], "caption": "...", "hashtag": ["..."]}`, { maxTokens: 6000 });
    await run(env, 'UPDATE lavori SET montaggio=? WHERE id=?', JSON.stringify({ stato: 'senza_girato', lista_riprese: lr, creato: ora() }), L.id);
    await log(env, L.id, 'videomaker', `📱 Dario: lista pronta, ${(lr.riprese || []).length} inquadrature in verticale con consigli di ripresa. Aggiungi il girato (Archivio o pCloud) e Rocco monta.`);
    return 'salta';
  }
  const indicazioni = prima?.indicazioni_rimonta;
  await log(env, L.id, 'regista', indicazioni ? `rimonto con ${indicazioni.da === 'revisore' ? 'le correzioni del revisore' : 'le tue indicazioni'}: ${indicazioni.testo || ''}` : `scrivo il piano di montaggio da ${clip.length} clip`);
  const extra = indicazioni ? `\n\nQUESTO È UN NUOVO MONTAGGIO. Piano precedente:\n${JSON.stringify(prima.piano || {})}\n\nINDICAZIONI ${indicazioni?.da === 'revisore' ? 'DEL REVISORE (ha bocciato il montaggio precedente)' : 'DI JOHNNY'} PER IL NUOVO MONTAGGIO (hanno la precedenza sulla scheda):\n${JSON.stringify(indicazioni)}\nCambia davvero quello che chiede, il resto miglioralo se puoi.` : '';
  const mu = brano?.c.analisi?.musica;
  const extraMusica = mu ? `\n\nMUSICA DEL REEL (brano con licenza scelto da Johnny: il montaggio si costruisce SU questa musica)
- durata ${brano.c.tecnico?.durata_sec} s, ${mu.bpm} BPM, una battuta = ${mu.battuta_sec} s, primo battito a ${mu.primo_battito} s
- volume per secondo (dB): ${JSON.stringify(mu.volume_al_secondo_db)}
- la parte forte entra a ${mu.entrata ?? '?'} s; picchi/accenti (s): ${JSON.stringify((mu.picchi || []).slice(0, 50))}
REGOLE: il reel dura quanto la musica o finisce su una frase musicale (durata_target = fine della frase scelta, non oltre ${brano.c.tecnico?.durata_sec} s);
ogni pezzo dura un multiplo di mezza battuta (il montatore aggancia i tagli ai battiti); sull'intro piano usa inquadrature
lente e d'atmosfera, all'entrata della parte forte metti il taglio più forte e accelera il ritmo; i rallenty sugli
accenti; l'audio delle clip va basso (0-0.25) perché comanda la musica; "riser" a null e niente effetti sonori forti.` : '';
  const R = ricetta(J(L.stile, null));
  const extraStile = R ? `\n\nSTILE DI MONTAGGIO SCELTO DA JOHNNY (vincolante): ${R.nome}
${R.regole}
RICETTA RICAVATA DAI REEL DI RIFERIMENTO IN QUESTO STILE: ${JSON.stringify(scheda.ricetta_stile || {})}
VINCOLI: look ${R.look}; durata dei pezzi ${R.durata ? R.durata.map((x) => x.toFixed(1)).join('-') + ' s' : 'libera'}; transizioni solo tra: ${R.transizioni.join(', ')}; ${R.effetti ? 'effetti solo tra: ' + R.effetti.join(', ') + '; ' : ''}rallenty: ${R.rallenty}; camera: ${R.camera === 'ferma' ? 'tutto bloccato come su treppiede' : R.camera === 'a_mano' ? 'camera a mano viva, non bloccarla' : 'stabile ma con i movimenti morbidi'}${R.musica ? '; musica adatta: ' + R.musica : ''}.
Applica questo linguaggio alle clip di Johnny: scegli i momenti che si prestano a questo stile.
LUT CONSIGLIATE PER QUESTO STILE (scegline una e dosala; più il girato è già bello e luminoso, più bassa l'intensità):
${descriviLut(lutPerStile(J(L.stile, null)))}` : '';
  // Chiara passa a Rocco la linea editoriale del cliente (voce, cosa evitare, CTA)
  const nomeCliente = L.fonte === 'archivio' && /^Clienti\//.test(L.pcloud || '') ? L.pcloud.split('/')[1] : await A.clienteDalTesto(env, L.prompt).catch(() => null);
  const Ccl = nomeCliente ? await clientePerNome(env, nomeCliente).catch(() => null) : null;
  const lineaCl = Ccl ? await lineaCliente(env, cfg, Ccl).catch(() => null) : null;
  const extraLinea = lineaCl ? '\n\n' + testoLinea(lineaCl) + '\nTitoli, testi a schermo, copertina e caption devono rispettare questa linea.' : '';
  if (lineaCl) await log(env, L.id, 'smm', `📣 Chiara passa a Rocco la linea editoriale di ${Ccl.nome}`);
  const regole = (await one(env, "SELECT valore FROM impostazioni WHERE chiave='REGOLE_REEL'"))?.valore || REGOLE_REEL_BASE;
  const extraRegole = `\n\nREGOLE FISSE DI JOHNNY PER TUTTI I REEL (vincolanti, valgono più di ogni altra indicazione):\n${regole}`;
  // NUOVE DISPOSIZIONI DI JOHNNY (nov 2026): le clip le sceglie lui, lo stile lo detta lui nel prompt, la musica la mette lui
  const extraDisposizioni = `\n\nCOME LAVORIAMO ORA (vincolante):
- Le clip le ha GIÀ SCELTE Johnny: sono quelle da usare. Usale TUTTE, ognuna almeno una volta, salvo una clip davvero inutilizzabile (mossa o sfocata in ogni tratto): in quel caso scrivilo in "note". Non aggiungere materiale che non c'è.
- Stile, mood, colori, sottotitoli, transizioni e titoli li detta Johnny nel prompt con i nomi dell'archivio Stili (es. "stile street, mood energico, colori nero e giallo, sottotitoli pop in bebas"): applicali alla lettera. Quello che non dice lo scegli tu coerente con il resto.
- I colori che chiede diventano la palette di testi, titoli e grafiche: se nomina una palette dell'archivio o colori che ci somigliano, metti il suo nome in "palette_nome"; altrimenti metti gli HEX in colori.accento. Palette disponibili:\n${descriviPalette()}
- MUSICA: non montarla tu${brano ? " (c'è un brano nella cartella: usa quello)" : ''}. Monta sul ritmo che chiede il mood e lascia il suono delle clip. In "musica_da_mettere" proponi 3 brani o generi precisi da cercare nella libreria audio di Instagram/Edits, con BPM, mood e il secondo da cui farla partire.`;
  // montaggi già scartati da Johnny con questo girato (+ quello precedente se è un rimontaggio): il nuovo deve essere diverso
  const scarti = J((await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', chiaveScarti(L)))?.valore, []) || [];
  const evita = scarti.flatMap((x) => x.tratti || []).slice(0, 80);
  const aperture = [...new Set(scarti.map((x) => x.apertura).filter(Boolean))];
  const extraScarti = scarti.length ? `\n\nMONTAGGI GIÀ SCARTATI DA JOHNNY CON QUESTO GIRATO (${scarti.length}): ${JSON.stringify(scarti.map((x) => (x.tratti || []).map((t) => `${t.nome}@${t.in.toFixed(1)}s`)))}
Il nuovo montaggio DEVE essere chiaramente diverso: apri con una clip diversa da ${aperture.join(', ') || 'quella usata'}, cambia l'ordine del racconto,
almeno metà dei pezzi da clip diverse o da momenti diversi delle stesse clip (lontani almeno 2 s da quelli già usati), idea di gancio nuova.` : '';
  if (scarti.length) await log(env, L.id, 'regista', `con questo girato Johnny ha già scartato ${scarti.length} montaggi: ne faccio uno diverso (${evita.length} tratti da evitare)`);
  const p = await S.claude(cfg, SISTEMA_REGISTA, pianoMontaggio(scheda, clip) + extraMusica + extraStile + extraLinea + extra + extraScarti + extraRegole + extraDisposizioni, { maxTokens: 12000 });
  // controllo del piano: valori ammessi, clip esistenti, tempi dentro le clip
  const tutte = J(L.clip, []);
  const eImm = (c) => c?.tipo === 'immagine' || c?.tecnico?.tipo === 'immagine';
  const sorg = (c) => ({ ...rifSorgente(c), nome: c.nome });
  let formato = FORMATI_REEL.includes(indicazioni?.formato) ? indicazioni.formato : (FORMATI_REEL.includes(R?.formato) ? R.formato : (FORMATI_REEL.includes(p.formato) ? p.formato : 'montaggio'));
  const slide = (p.slide || []).filter((s) => tutte[s.clip]?.stato === 'fatto' && eImm(tutte[s.clip])).slice(0, 20)
    .map((s) => ({ clip: s.clip, ...sorg(tutte[s.clip]), durata: Math.min(Math.max(Number(s.durata) || 2.2, 1.8), 8) }));
  if (formato === 'carosello' && slide.length < 2) {
    const foto = tutte.map((c, i) => ({ c, i })).filter(({ c }) => c.stato === 'fatto' && eImm(c));
    if (foto.length >= 2) slide.push(...foto.slice(0, 15).map(({ c, i }) => ({ clip: i, ...sorg(c), durata: 2.2 })));
    else formato = 'montaggio';
  }
  const parla = (c) => c?.analisi?.misure?.parlato?.presente || c?.analisi?.parlato?.presente;
  const parlato = formato === 'talking_head' || SPLITTISH(formato);
  if (parlato && !(p.segmenti || []).some((s) => parla(tutte[s.clip]))) formato = 'montaggio';
  const seg = (p.segmenti || []).filter((s) => tutte[s.clip]?.stato === 'fatto' && !eImm(tutte[s.clip])).slice(0, formato === 'talking_head' || SPLITTISH(formato) ? 30 : 40).map((s, k) => {
    const c = tutte[s.clip];
    const durClip = Number(c.tecnico?.durata_sec) || 9999;
    const durata = Math.min(Math.max(Number(s.durata) || 1.5, 0.4), formato === 'talking_head' || SPLITTISH(formato) ? 90 : 12);
    const rallenty = !!s.rallenty;
    const serve = durata * (rallenty ? 0.6 : 1);
    let inizio = Math.max(0, Math.min(Number(s.in) || 0, Math.max(0, durClip - serve - 0.05)));
    // niente tagli o transizioni già presenti dentro la clip (montaggi della camera, clip già editate)
    const interni = (c.analisi?.misure?.tagli_interni_sec || []).map(Number).filter((x) => x > 0.1 && x < durClip - 0.1).sort((a, b) => a - b);
    const dentro = (a) => interni.find((x) => x > a + 0.05 && x < a + serve - 0.05);
    if (dentro(inizio) !== undefined) {
      const dopo = interni.map((x) => x + 0.12).find((a) => a + serve < durClip - 0.05 && dentro(a) === undefined);
      const prima = [...interni].reverse().map((x) => x - serve - 0.12).find((a) => a >= 0 && dentro(a) === undefined);
      inizio = dopo ?? prima ?? inizio;
    }
    return {
      clip: s.clip, ...rifSorgente(c), nome: c.nome, in: inizio, durata, rallenty,
      effetto: EFFETTI_PEZZO.includes(s.effetto) ? s.effetto : 'nessuno',
      transizione_in: k === 0 ? null : (TRANSIZIONI.includes(s.transizione_in) ? s.transizione_in : 'taglio_netto'),
      audio: Math.min(1, Math.max(0, Number(s.audio ?? 0.8))), motivo: s.motivo, testo: s.testo?.testo ? s.testo : null,
      in_preciso: s.in_preciso === true || undefined,
      fuoco: typeof s.fuoco === 'string' && s.fuoco.trim() ? s.fuoco.trim().slice(0, 40) : undefined,
      zoom_fisso: s.zoom_fisso?.z > 1 ? { z: Math.min(2.5, Number(s.zoom_fisso.z)), cx: Math.min(1, Math.max(0, Number(s.zoom_fisso.cx ?? 0.5))), cy: Math.min(1, Math.max(0, Number(s.zoom_fisso.cy ?? 0.5))) } : undefined,
    };
  });
  // regola di Johnny: la stessa clip solo per momenti diversi (il parlato dei talking head/split invece si spezza in tanti pezzi)
  if (!(formato === 'talking_head' || SPLITTISH(formato))) {
    // la stessa clip può tornare solo per un momento diverso: almeno 2 s fra un tratto e l'altro
    const viste = {};
    const tenuti = seg.filter((x) => {
      const id = x.fileid || x.url || x.clip, a = Number(x.in) || 0, b = a + (Number(x.durata) || 0) * (x.rallenty ? 0.6 : 1);
      const prima = viste[id] || [];
      if (prima.some(([p, q]) => a < q + 2 && b > p - 2)) return false;
      viste[id] = [...prima, [a, b]];
      return true;
    });
    seg.splice(0, seg.length, ...tenuti);
    if (seg[0]) seg[0].transizione_in = null;
  }
  // rete di sicurezza (gratis): se Johnny ha chiesto dove va l'attenzione e il piano non l'ha segnato, lo segno sui pezzi finali
  const attenz = String((indicazioni?.testo || '') + ' ' + (L.prompt || '')).match(/attenzione\s+(?:deve\s+(?:essere|stare)\s+|va\s+|sempre\s+)?(?:sul|sulla|sullo|sui|sulle|sugli|su)\s+(?:l'|la\s+|il\s+|lo\s+|le\s+|i\s+|gli\s+)?([^.,;:\n]{2,30})/i);
  if (attenz && seg.length && !seg.some((x) => x.fuoco)) { const ogg = attenz[1].trim().split(/\s+/).slice(0, 4).join(' '); seg.slice(-2).forEach((x) => { x.fuoco = ogg; }); await log(env, L.id, 'regista', `🎯 attenzione su "${ogg}" nei pezzi finali`); }
  // Instagram: oltre 1'30" non è più un Reel → i pezzi in più si tolgono
  { let tot = 0; const k = seg.findIndex((x) => (tot += Number(x.durata) || 0) > 90); if (k > 0) { seg.splice(k); await log(env, L.id, 'regista', 'reel accorciato a 1\'30" (limite dei Reel)'); } }
  if (!seg.length && formato !== 'carosello') throw new Error('il piano del Regista non contiene pezzi validi');
  // lo stile è vincolante: transizioni ed effetti fuori stile vengono sostituiti
  if (R) {
    for (const s of seg) {
      if (s.transizione_in && !R.transizioni.includes(s.transizione_in) && !R.transizioni.includes(FAMIGLIA_TR[s.transizione_in]) && !new RegExp('\\b' + s.transizione_in + '\\b').test(String(L.prompt || '') + ' ' + String(indicazioni?.testo || ''))) s.transizione_in = R.transizioni.includes('taglio_netto') ? 'taglio_netto' : R.transizioni[0];
      if (R.effetti && !R.effetti.includes(s.effetto)) s.effetto = 'nessuno';
      if (R.rallenty === 'mai') s.rallenty = false;
    }
  }
  const broll = formato !== 'talking_head' ? [] : (p.broll || []).filter((b) => tutte[b.clip]?.stato === 'fatto' && !eImm(tutte[b.clip]) && b.sulla_parola).slice(0, 8).map((b) => {
    const c = tutte[b.clip];
    const durata = Math.min(Math.max(Number(b.durata) || 2, 1), 3.5);
    return { clip: b.clip, ...sorg(c), in: Math.max(0, Math.min(Number(b.in) || 0, Math.max(0, (Number(c.tecnico?.durata_sec) || 9999) - durata * (b.rallenty ? 0.5 : 1) - 0.05))), durata, rallenty: !!b.rallenty, sulla_parola: String(b.sulla_parola).slice(0, 40) };
  });
  // talking head: cartelli con le parole chiave e cartoline (foto/screenshot) sulle parole dette
  const cartelli = formato !== 'talking_head' ? [] : (p.cartelli || []).filter((c) => c?.testo && c?.sulla_parola).slice(0, 12).map((c) => ({
    testo: String(c.testo).slice(0, 34), sulla_parola: String(c.sulla_parola).slice(0, 40), colore: /^(blu|rosa|verde|#[0-9a-f]{6})$/i.test(c.colore || '') ? c.colore : null,
    stile: ['fascia', 'grande', 'barrato'].includes(c.stile) ? c.stile : 'fascia', durata: Math.min(2.6, Math.max(0.9, Number(c.durata) || 1.7)) }));
  const schede = formato !== 'talking_head' ? [] : (p.schede || []).filter((s) => tutte[s?.clip]?.stato === 'fatto' && eImm(tutte[s.clip]) && s.sulla_parola).slice(0, 8).map((s) => ({
    clip: s.clip, ...sorg(tutte[s.clip]), sulla_parola: String(s.sulla_parola).slice(0, 40), etichetta: String(s.etichetta || '').slice(0, 16), lato: s.lato === 'sx' ? 'sx' : 'dx', durata: Math.min(7, Math.max(1.5, Number(s.durata) || 2.6)) }));
  const lookVoluto = indicazioni?.look && LOOKS.includes(indicazioni.look) ? indicazioni.look : null;
  const cop = p.copertina && tutte[p.copertina.clip]?.stato === 'fatto' ? { ...rifSorgente(tutte[p.copertina.clip]), secondo: Math.max(0, Number(p.copertina.secondo) || 0), testo: String(p.copertina.testo || '').slice(0, 60), evidenzia: String(p.copertina.evidenzia || '').slice(0, 30) || null, colore: /^#[0-9a-f]{6}$/i.test(p.copertina.colore || '') ? p.copertina.colore : null } : null;
  let pannello = null;
  const pn = p.pannello;
  if (formato === 'talking_head' && pn?.titolo && ['line', 'bar', 'steps'].includes(pn.tipo)) {
    const punti = (pn.punti || []).filter((x) => x && Number.isFinite(Number(x.valore))).slice(0, 8).map((x) => ({ etichetta: String(x.etichetta || '').slice(0, 14), valore: Number(x.valore) }));
    const passi = (pn.passi || []).map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 5);
    if ((pn.tipo === 'steps' && passi.length >= 2) || (pn.tipo !== 'steps' && punti.length >= 2)) {
      pannello = { chip: String(pn.chip || 'TIP').slice(0, 14), titolo: String(pn.titolo).slice(0, 60), tipo: pn.tipo, punti, passi: passi.length ? passi : null,
        unita: String(pn.unita || '').slice(0, 4), badge: pn.badge ? String(pn.badge).slice(0, 20) : null, sulla_parola: String(pn.sulla_parola || '').slice(0, 40), tema: pn.tema === 'light' ? 'light' : 'dark' };
    }
  }
  // split: grafiche animate sopra la persona, colori e font per l'argomento
  const hex = (v) => (typeof v === 'string' && /^(#[0-9a-f]{6}|rgba?\([0-9., ]+\))$/i.test(v.trim()) ? v.trim() : undefined);
  const grafiche = !SPLITTISH(formato) ? [] : (p.grafiche || []).filter((g) => g && TIPI_GRAFICA.includes(g.tipo) && g.sulla_parola).slice(0, 40)
    .map((g) => ({ tipo: g.tipo, sulla_parola: String(g.sulla_parola).slice(0, 40), pieno: g.pieno === true, dati: g.dati && typeof g.dati === 'object' ? JSON.parse(JSON.stringify(g.dati).slice(0, 3000) || '{}') : {},
      ...(Array.isArray(g.effetti) && g.effetti.length ? { effetti: g.effetti.filter((e) => EFFETTI_SPLIT.includes(e)).slice(0, 5) } : {}) }))
    .map((g) => (g.pieno && g.effetti ? { ...g, effetti: g.effetti.filter((e) => !['dietro', 'esce', 'adesivo'].includes(e)) } : g)) // con la grafica a tutto schermo la persona non si vede
    .map((g) => (g.tipo === 'sito' && !/^https:\/\/[\w.-]+\.[a-z]{2,}/i.test(g.dati.url || '') ? { ...g, tipo: 'card', dati: { titolo: g.dati.titolo || g.dati.url || 'sito', testo: g.dati.testo || '' } } : g));
  const palette = !SPLITTISH(formato) ? null : Object.fromEntries(['fondo', 'inchiostro', 'accento', 'secondario', 'tenue'].map((k) => [k, hex(p.palette?.[k])]).filter(([, v]) => v));
  const font_split = !SPLITTISH(formato) ? null : Object.fromEntries(Object.entries(FONT_SPLIT).map(([k, ok]) => [k, ok.includes(p.font_split?.[k]) ? p.font_split[k] : ok[0]]));
  const tracker = formato === 'split_grafico' && p.tracker?.voci?.length ? { totale: Math.min(10, Math.max(1, Number(p.tracker.totale) || p.tracker.voci.length)), voci: p.tracker.voci.slice(0, 10).map((v) => ({ etichetta: String(v.etichetta || '').slice(0, 24), sulla_parola: String(v.sulla_parola || '').slice(0, 40) })).filter((v) => v.sulla_parola) } : null;
  const adesivi = formato === 'parole_dietro' ? (p.adesivi || []).filter((a) => a && a.sulla_parola && ADESIVI.includes(a.tipo)).slice(0, 8).map((a) => ({ sulla_parola: String(a.sulla_parola).slice(0, 40), tipo: a.tipo })) : [];
  const avatar = !!J(L.stile, null)?.avatar; // video HeyGen: niente tempi morti da tagliare, parlato intero
  await correggiTesti(env, cfg, L, clip, { grafiche, cartelli, schede, copertina: cop, pannello });
  // il montaggio delle clip lo fa il montatore nuovo (Remotion): titoli in motion graphics, sottotitoli animati, look
  const motore = formato === 'montaggio' ? 'montatore' : formato;
  const titoli = motore !== 'montatore' ? [] : (p.titoli || []).filter((x) => x?.testo).slice(0, 12).map((x) => ({
    testo: String(x.testo).slice(0, 80), da: Math.max(0, Number(x.da) || 0), a: Math.max(Number(x.a) || 0, (Number(x.da) || 0) + 1.2),
    stile: STILI_TITOLO.includes(x.stile) ? x.stile : 'blur', posizione: ['alto', 'basso', 'sx', 'dx', 'centro'].includes(x.posizione) ? x.posizione : 'alto',
    sotto: x.sotto ? String(x.sotto).slice(0, 50) : undefined, parole: Array.isArray(x.parole) ? x.parole.slice(0, 6).map((w) => String(w).slice(0, 24)) : undefined,
    numero: x.numero && Number.isFinite(Number(x.numero.valore)) ? { valore: Number(x.numero.valore), prima: String(x.numero.prima || '').slice(0, 4), dopo: String(x.numero.dopo || '').slice(0, 10), decimali: Number(x.numero.decimali) || 0 } : undefined,
    animazione: ANIMAZIONI[x.animazione] ? x.animazione : undefined, unita: ['lettere', 'parole', 'riga'].includes(x.unita) ? x.unita : undefined,
    font: typeof x.font === 'string' && /^[A-Za-z0-9 ]{2,40}$/.test(x.font) ? x.font : undefined }));
  // REGOLA DI JOHNNY: nei video niente informazioni inventate. Un titolo con un numero (ore, prezzi, quantità, anni…)
  // resta solo se quel numero l'ha scritto Johnny nella richiesta o si sente nel girato; il resto lo rilegge il correttore.
  const fonteFatti = (L.prompt + ' ' + clip.flatMap((c) => (c.trascrizione || []).map((x) => (typeof x === 'string' ? x : x.testo || x.t || ''))).join(' ')).toLowerCase();
  const numeriOk = (t) => (String(t).match(/\d+(?:[.,]\d+)?/g) || []).every((n) => fonteFatti.includes(n) || fonteFatti.includes(n.replace(',', '.')));
  for (let i = titoli.length - 1; i >= 0; i--) {
    const x = titoli[i];
    if (!numeriOk(x.testo + ' ' + (x.sotto || '') + ' ' + (x.numero ? x.numero.valore : ''))) {
      await log(env, L.id, 'copy', `✂️ tolto il titolo "${x.testo}${x.sotto ? ' · ' + x.sotto : ''}": il numero non l'hai dato tu e non si sente nel video`, 'warn');
      titoli.splice(i, 1);
    }
  }
  for (const sg of seg) if (sg.testo && !numeriOk(sg.testo.testo)) sg.testo = null;
  await correggiTesti(env, cfg, L, clip, { altri: [...titoli, ...seg.map((x) => x.testo).filter(Boolean), p.chiusura || null] });
  const lookReel = motore !== 'montatore' ? null : { grana: Math.min(0.15, Math.max(0, Number(p.look_reel?.grana ?? 0.06))), vignetta: Math.min(0.6, Math.max(0, Number(p.look_reel?.vignetta ?? 0.32))),
    particelle: ['neve', 'polvere', 'coriandoli', 'bokeh'].includes(p.look_reel?.particelle) ? p.look_reel.particelle : null,
    tinta: /^#[0-9a-f]{6}$/i.test(p.look_reel?.tinta || '') ? p.look_reel.tinta : null, tinta_forza: Math.min(0.4, Math.max(0, Number(p.look_reel?.tinta_forza ?? 0.18))) };
  // qualsiasi Google Font per nome (il motore grafico lo scarica al render); i 5 di casa restano il ripiego
  const fontOk = (x) => typeof x === 'string' && /^[A-Za-z0-9 ]{2,40}$/.test(x.trim()) ? x.trim() : null;
  const fontReel = motore !== 'montatore' ? null : { titoli: fontOk(p.font_reel?.titoli) || 'montserrat', testo: fontOk(p.font_reel?.testo) || 'montserrat' };
  if (motore === 'montatore' && p.sottotitoli) p.sottotitoli = { ...p.sottotitoli, stile: STILI_SOTT.includes(p.sottotitoli.stile) ? p.sottotitoli.stile : 'box' };
  // clip di riserva: le altre clip video del girato, così il montatore sostituisce un pezzo che trema con un'altra
  // ripresa dello stesso momento (la più vicina nell'ordine di ripresa) invece di montarlo mosso
  const usate = new Set(seg.map((x) => x.clip));
  const riserve = motore !== 'montatore' ? [] : tutte.map((c, i) => ({ c, i })).filter(({ c, i }) => c?.stato === 'fatto' && !eImm(c) && !usate.has(i) && (Number(c.tecnico?.durata_sec) || 0) >= 1.5)
    .slice(0, 6).map(({ c, i }) => ({ clip: i, ...sorg(c), nome: c.nome, durata_clip: Number(c.tecnico?.durata_sec) || null }));
  let logoArch = L.fonte === 'archivio' ? await A.logoCliente(env, L.pcloud).catch(() => null) : null;
  // copertina: stile YouTube per il profilo di Johnny, stile del cliente (ricavato dai suoi esempi) per i clienti
  if (cop) {
    const profilo = avatar || /profilo instagram|mio profilo|per il mio profilo/i.test(L.prompt || '');
    if (profilo) cop.stile = 'youtube';
    else {
      const nomeCl = L.fonte === 'archivio' && /^Clienti\//.test(L.pcloud || '') ? L.pcloud.split('/')[1] : (await A.clienteDalTesto(env, L.prompt).catch(() => null));
      cop.stile = 'cliente';
      cop.cliente = nomeCl || null;
      if (!logoArch && nomeCl) logoArch = await A.logoCliente(env, 'Clienti/' + nomeCl).catch(() => null);
      cop.ricetta = nomeCl ? J((await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', 'COPERTINA:' + nomeCl.toLowerCase()))?.valore, null) : null;
    }
  }
  const piano = {
    ...p, formato: motore, titoli, riserve, evita: evita.length ? evita : undefined, look_reel: lookReel, font_reel: fontReel, pannello, cartelli, schede, grafiche, palette, font_split, tracker, adesivi,
    ...(avatar ? { taglia_silenzi: false, multicam: p.multicam !== false } : {}),
    ...(formato === 'split_grafico' ? { riquadro: avatar || p.riquadro === 'box' ? 'box' : 'pieno' } : {}),
    logo: prima?.logo || (logoArch ? { archivio: logoArch } : null),
    stabilizza_tutto: !!(indicazioni?.stabilizza_tutto || prima?.piano?.stabilizza_tutto || p.stabilizza_tutto || R?.camera === 'morbida'),
    camera_ferma: R?.camera === 'a_mano' ? false : !!(indicazioni?.camera_ferma || prima?.piano?.camera_ferma || p.camera_ferma || R?.camera === 'ferma'),
    camera_a_mano: R?.camera === 'a_mano' || undefined,
    stile: R ? R.nome : undefined,
    apertura: ['nero', 'bianco'].includes(indicazioni?.apertura) ? indicazioni.apertura : (['nero', 'bianco'].includes(p.apertura) ? p.apertura : (R?.apertura || null)),
    finale: ['nero', 'bianco'].includes(indicazioni?.finale) ? indicazioni.finale : (['nero', 'bianco'].includes(p.finale) ? p.finale : (R?.finale || null)),
    musica: brano ? { ...rifSorgente(brano.c), nome: brano.c.nome, durata: brano.c.tecnico?.durata_sec, bpm: mu?.bpm, battuta: mu?.battuta_sec, primo_battito: mu?.primo_battito, volume: 0.9 } : null,
    sfx: brano ? false : p.sfx, segmenti: formato === 'carosello' ? [] : seg, broll, slide: formato === 'carosello' ? slide : [],
    chiusura: formato === 'montaggio' ? p.chiusura : null, palette: palette || (PALETTE[p.palette_nome] ? { accento: PALETTE[p.palette_nome][0], secondario: PALETTE[p.palette_nome][1], fondo: PALETTE[p.palette_nome][2], inchiostro: PALETTE[p.palette_nome][3] } : (p.colori?.accento ? { accento: p.colori.accento } : undefined)), look: lookVoluto || (R?.look && LOOKS.includes(R.look) ? R.look : (LOOKS.includes(p.look) ? p.look : (LOOKS.includes(scheda.colore?.look) ? scheda.colore.look : 'naturale_vivace'))),
    effetti_globali: [...new Set([...(p.effetti_globali || []), ...(R?.globali || [])])].filter((e) => EFFETTI_GLOBALI.includes(e)), copertina: cop,
    // LUT: quella chiesta da Johnny nel rimontaggio, poi quella del Regista, poi la prima consigliata dallo stile
    // LUT: SOLO quella scelta da Johnny (nel nuovo lavoro o nel rimontaggio); il Regista e lo stile non la scelgono più
    lut: (() => { const s = indicazioni?.lut || J(L.stile, null)?.lut || prima?.piano?.lut?.nome; return s && s !== 'nessuna' && LUT[s] ? { ...voceLut(s, null), scelta_da: 'johnny' } : null; })(),
  };
  if (PALETTE[p.palette_nome]) piano.colori = { ...(piano.colori || {}), accento: PALETTE[p.palette_nome][0], secondario: PALETTE[p.palette_nome][1] };
  const versione = (prima?.versione || 0) + 1;
  // Chiara ripassa titoli, copertina e caption prima del montaggio: la sua nota arriva a Johnny con il reel
  const notaChiara = await ripassoChiara(env, cfg, Ccl, 'reel', { titoli: (piano.titoli || []).map((t) => t.testo || t), copertina: piano.copertina?.testo, caption: piano.caption || p.caption, chiusura: piano.chiusura?.testo || p.chiusura }).catch(() => null);
  await run(env, 'UPDATE lavori SET montaggio=? WHERE id=?', JSON.stringify({ stato: 'da_fare', piano, versione, creato: ora(), indicazioni: indicazioni || null, nota_chiara: notaChiara, qa_giri: indicazioni?.da === 'revisore' ? (prima?.qa_giri || 0) : 0 }), L.id);
  const tot = seg.reduce((a, s) => a + s.durata, 0);
  const nomeF = { montaggio: 'montaggio', talking_head: 'talking-head', carosello: 'carosello', split_grafico: 'split con grafiche animate', parole_dietro: 'parole giganti dietro la persona' }[formato];
  await log(env, L.id, 'regista', formato === 'carosello' ? `piano pronto: formato carosello, ${slide.length} slide` :
    `piano pronto: formato ${nomeF}${piano.lut ? `, LUT ${piano.lut.nome} al ${Math.round(piano.lut.intensita * 100)}%` : ''}, ${seg.length} ${parlato ? 'tratti di parlato' : 'pezzi'}${grafiche.length ? ` + ${grafiche.length} grafiche animate` : ''}${broll.length ? ` + ${broll.length} b-roll` : ''}${pannello ? ` + pannello ${pannello.tipo}` : ''}, ~${Math.round(tot + (piano.chiusura?.durata || 0))} s, look ${piano.look}`);
  if (seg.some((s) => s.testo) || piano.chiusura) await log(env, L.id, 'copy', `testi: ${[...seg.filter((s) => s.testo).map((s) => '"' + s.testo.testo + '"'), piano.chiusura?.testo ? '"' + piano.chiusura.testo + '"' : ''].filter(Boolean).join(' · ').slice(0, 300)}`);
  await log(env, L.id, 'motore', 'chiamo il motore GitHub per il montaggio');
  return true;
}

// REVISORE (controllo qualità prima di Johnny): guarda un fotogramma al secondo del reel finito e decide se è da consegnare.
// Se non passa, rimanda il reel al Regista con le correzioni e si rimonta da solo (max 1 giro, per risparmiare token): Johnny vede solo reel promossi.
const SISTEMA_QA = `Sei il revisore finale di Momento Produzione: un videomaker senior che decide se un reel promozionale verticale
può andare al cliente. Guardi il foglio con un fotogramma al secondo del reel FINITO (il tempo è scritto in giallo). Sei severo ma giusto.
Bocci solo per difetti veri che un cliente noterebbe. Rispondi SOLO con JSON valido.`;
async function revisione(env, cfg, L, m) {
  const img = env.VIDEO ? await env.VIDEO.get(`lavoro-${L.id}/qa.jpg`, 'arrayBuffer').catch(() => null) : null;
  if (!img) return { passa: true, voto: null, nota: 'foglio non disponibile' };
  let b = ''; const u = new Uint8Array(img); for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode(...u.subarray(i, i + 0x8000));
  const scheda = J(L.scheda, {});
  const testo = `RICHIESTA DEL CLIENTE: ${String(L.prompt || '').slice(0, 600)}
RACCONTO PREVISTO: ${JSON.stringify(scheda.racconto || scheda.struttura || scheda.idea || '').slice(0, 800)}
PEZZI MONTATI (clip @ secondo): ${(m.revisore?.tratti || []).map((t) => `${t.nome}@${t.in}s/${t.dur}s`).join(', ')}
CONTROLLI AUTOMATICI DEL MOTORE: ${JSON.stringify((m.revisore?.problemi || []).slice(0, 10))}

Controlla: 1) il prodotto è protagonista e si vede bene; 2) il racconto è lineare e comprensibile (preparazione → trasformazione → prodotto finito → confezione/chiusura); 3) niente pezzi mossi, sfocati, bui, inquadrature di pavimento/soffitto/schiene; 4) niente due pezzi quasi uguali; 5) colore omogeneo fra i pezzi; 6) testi leggibili e non sopra la faccia o il prodotto; 7) il primo secondo aggancia.
JSON: {"voto": 1-10, "passa": true se voto >= 7 e nessun difetto grave, "difetti": [{"secondo": n, "problema": "...", "gravita": "grave|medio|lieve"}], "correzioni": "istruzioni precise per il Regista per rimontarlo (quali pezzi cambiare e con cosa), vuoto se passa"}`;
  const q = await S.claudeVisione(cfg, cfg.CLAUDE_MODEL, SISTEMA_QA, testo, [{ cosa: 'foglio del reel finito, un fotogramma al secondo', jpeg: btoa(b) }], 6000);
  return { passa: !!q?.passa && (Number(q.voto) || 0) >= 7, voto: Number(q?.voto) || null, difetti: (q?.difetti || []).slice(0, 8), correzioni: String(q?.correzioni || '').slice(0, 700) };
}

async function faseMontaggio(env, cfg, L) {
  const m = J(L.montaggio, null);
  if (!m) return true; // niente da montare (nessuna clip)
  if (m.stato === 'fatto' && m.foglio && !m.qa && !m.salta_qa && m.piano?.formato !== 'carosello') {
    const q = await revisione(env, cfg, L, m).catch((e) => ({ passa: true, voto: null, nota: 'revisione non riuscita: ' + String(e?.message || e).slice(0, 80) }));
    const giri = m.qa_giri || 0;
    m.qa = { ...q, quando: ora(), giro: giri + 1 };
    if (q.passa || giri >= 1) {
      await run(env, 'UPDATE lavori SET montaggio=? WHERE id=?', JSON.stringify(m), L.id);
      await log(env, L.id, 'revisore', q.passa && q.voto == null && q.nota ? `⚠️ ${q.nota}: il reel ti arriva senza controllo` : q.passa ? `✅ revisione superata${q.voto ? ` (voto ${q.voto}/10)` : ''}${q.nota ? ' · ' + q.nota : ''}` : `⚠️ dopo ${giri + 1} revisioni il voto è ${q.voto}/10: te lo consegno con i difetti segnati (${q.difetti.map((x) => x.problema).join('; ').slice(0, 200)})`, q.passa ? 'info' : 'warn');
      return true;
    }
    // bocciato su pezzi precisi: Johnny taglia lui quei pezzi dal telefono (una volta per reel), il resto resta com'è
    const tr = m.revisore?.tratti || [];
    let acc = 0; const fine = tr.map((t) => (acc += Number(t.dur) || 0));
    const pezzi = {};
    for (const d of q.difetti || []) {
      const sec = Number(d.secondo);
      if (d.gravita === 'lieve' || !Number.isFinite(sec) || !tr.length) continue;
      let k = fine.findIndex((f) => sec < f); if (k < 0) k = tr.length - 1;
      pezzi[k] = [pezzi[k], d.problema].filter(Boolean).join('; ').slice(0, 200);
    }
    // reel rotto o molto lontano dal piano (voto sotto 5): non è un taglio da chiedere a Johnny, si rifà da solo
    if (Object.keys(pezzi).length && !m.taglio_chiesto && (Number(q.voto) || 0) >= 5) {
      m.taglio = { pezzi: Object.entries(pezzi).map(([k, problema]) => ({ pezzo: Number(k), nome: tr[k]?.nome, problema })), quando: ora(), voto: q.voto };
      m.taglio_chiesto = true;
      await run(env, "UPDATE lavori SET montaggio=?, stato='pausa', aggiornato=? WHERE id=?", JSON.stringify(m), ora(), L.id);
      await log(env, L.id, 'revisore', `✂️ voto ${q.voto}/10: ${m.taglio.pezzi.map((x) => `pezzo ${x.pezzo + 1} (${x.nome}) ${x.problema}`).join(' · ').slice(0, 260)}. Aspetto il tuo taglio (se premi Riprendi va avanti così)`, 'warn');
      await inviaPush(env, `✂️ Reel #${L.id}: serve il tuo taglio`, `${m.taglio.pezzi.length} ${m.taglio.pezzi.length === 1 ? 'pezzo' : 'pezzi'} da sistemare: ${m.taglio.pezzi[0].problema}`.slice(0, 140), `#/lavoro/${L.id}`).catch(() => 0);
      return false;
    }
    // bocciato: torna al Regista con le correzioni, rimonta da solo
    m.indicazioni_rimonta = { testo: q.correzioni || q.difetti.map((x) => `${x.secondo}s: ${x.problema}`).join('; '), da: 'revisore' };
    m.qa_giri = giri + 1;
    await run(env, "UPDATE lavori SET montaggio=?, fase='regia', aggiornato=? WHERE id=?", JSON.stringify(m), ora(), L.id);
    await log(env, L.id, 'revisore', `🔁 bocciato (voto ${q.voto}/10): ${q.difetti.map((x) => `${x.secondo}s ${x.problema}`).join('; ').slice(0, 220)}. Lo rimonto da solo (giro ${giri + 1} di 2)`, 'warn');
    return false;
  }
  if (m.stato === 'fatto') return true;
  if (m.stato === 'errore') throw new Error('montaggio non riuscito: ' + (m.errore || ''));
  return avvisoMotore(env, L);
}

async function lavora(env, cfg, L, scadenza) {
  while (Date.now() < scadenza) {
    L = await one(env, 'SELECT * FROM lavori WHERE id=?', L.id);
    let finita = true;
    cfg = chi(cfg, { area: 'reel', lavoro_id: L.id, agente: { piano: 'direttore', ricerca: 'scout_yt', riferimenti: 'occhi', clip: 'analista', scheda: 'regista', regia: 'regista', montaggio: 'editor' }[L.fase] || 'regia' });
    if (L.fase === 'piano') await fasePiano(env, cfg, L);
    else if (L.fase === 'ricerca') await faseRicerca(env, cfg, L);
    else if (L.fase === 'riferimenti') finita = await faseRiferimenti(env, cfg, L);
    else if (L.fase === 'clip') finita = await faseClip(env, cfg, L);
    else if (L.fase === 'scheda') await faseScheda(env, cfg, L);
    else if (L.fase === 'regia') finita = await faseRegia(env, cfg, L);
    else if (L.fase === 'montaggio') finita = await faseMontaggio(env, cfg, L);
    if (!finita) return 'attesa';
    let prossima = FASI[FASI.indexOf(L.fase) + 1];
    if (finita === 'salta') prossima = 'fatto';
    // reel col mio avatar: lo studio dei virali l'ha già fatto Zoe nel piano del profilo, niente seconda ricerca (risparmia Apify, Claude e Gemini)
    if (L.fase === 'piano' && snello(L)) { prossima = 'clip'; await log(env, L.id, 'direttore', 'modo snello: clip + prompt, niente ricerca né scheda'); }
    else if (L.fase === 'clip' && snello(L) && !J(L.riferimenti, []).length) prossima = 'regia';
    else if (L.fase === 'piano' && J(L.stile, null)?.solo_clip && !J(L.link_rif, []).length) { prossima = 'clip'; await log(env, L.id, 'direttore', 'uso solo le tue clip: niente ricerca di reel sulle piattaforme'); }
    await run(env, 'UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?',
      prossima, prossima === 'fatto' ? 'pronto' : 'in_corso', ora(), L.id);
    if (prossima === 'fatto') { await log(env, L.id, 'regia', J((await one(env, 'SELECT montaggio FROM lavori WHERE id=?', L.id))?.montaggio, null)?.stato === 'fatto' ? '✅ reel montato: aprilo e guardalo' : '✅ lavoro pronto: apri la scheda'); return; }
  }
}

export async function avanza(env) {
  const inizio = Date.now();
  const cfg = await configurazione(env);
  const adesso = ora();
  const libero = new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString();
  // 3 corsie in parallelo: più reel avanzano insieme. Ogni lavoro è riservato (due corsie non prendono lo stesso)
  const corsia = async () => {
    for (let giri = 0; giri < 5 && Date.now() - inizio < BUDGET_MS - 60e3; giri++) {
      const presi = await all(env, `UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
        WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
        RETURNING *`, libero, adesso, adesso);
      if (!presi.length) return;
      const L = presi[0];
      try {
        const esito = await lavora(env, cfg, L, inizio + BUDGET_MS);
        // in attesa (es. del motore GitHub): lo rimetto in fila tra un minuto, senza contarlo come tentativo
        if (esito === 'attesa') await run(env, 'UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?', new Date(Date.now() + 50e3).toISOString(), L.id);
        else await run(env, 'UPDATE lavori SET blocco_fino=NULL WHERE id=?', L.id);
      } catch (e) {
        const msg = String(e?.message || e).slice(0, 500);
        const credito = /credit balance|billing/i.test(msg); // credito Claude finito: pausa senza bruciare i tentativi
        const stop = !credito && (L.tentativi >= 3 || /manca la chiave/.test(msg)); // senza chiave è inutile riprovare
        // pausa prima del nuovo tentativo (prima ripartiva subito e bruciava i 3 tentativi in un secondo)
        const pausa = new Date(Date.now() + (credito ? 10 : 2) * 60e3).toISOString();
        await run(env, 'UPDATE lavori SET stato=?, errore=?, blocco_fino=?, tentativi=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso', credito ? 'Credito Claude esaurito: riparto da solo quando lo ricarichi' : msg, stop ? null : pausa, credito ? 0 : L.tentativi, ora(), L.id);
        const fase = (await one(env, 'SELECT fase FROM lavori WHERE id=?', L.id))?.fase || L.fase;
        await log(env, L.id, 'regia', credito ? '⏸️ credito Claude esaurito: il reel riparte da solo quando lo ricarichi' : `${stop ? '❌ fermo' : '⚠️ riprovo tra 2 minuti'} (fase ${fase}): ${msg}`, stop || credito ? 'errore' : 'warn');
      }
    }
  };
  await Promise.all([corsia(), corsia(), corsia()]);
}
