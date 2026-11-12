// La catena di lavoro: piano → ricerca → riferimenti (Gemini guarda) → clip (Analista) → scheda tecnica.
// Ogni minuto il cron fa avanzare i lavori aperti, una fase alla volta, ripartendo da dove si era fermato.
import { J, all, log, one, ora, run, configurazione } from './db.js';
import { libreriaTesto } from './libreria.js';
import * as S from './servizi.js';

const FASI = ['piano', 'ricerca', 'riferimenti', 'clip', 'scheda', 'fatto'];
const BLOCCO_MIN = 12;       // un lavoro "preso" resta riservato per 12 minuti
const BUDGET_MS = 9 * 60e3;  // quanto lavora ogni giro del cron
const PER_GIRO = 3;          // video guardati in parallelo per giro

// ------------------------------------------------------------------ prompt degli agenti
const SISTEMA_PIANO = `Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.`;

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
  "instagram_hashtag": ["3 hashtag senza #"]
}`;

const analisiRiferimento = (settore) => `Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
È un riferimento per un reel del settore "${settore}". Misura, non inventare: se un dato non è verificabile
scrivi null. Tempi in secondi.

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
  "da_copiare": ["tecniche replicabili"],
  "da_evitare": ["cosa non funziona o è già visto"]
}`;

const analisiClip = (contesto) => `Sei l'assistente al montaggio di un'agenzia video. Guarda e ascolta questa clip GREZZA
e descrivi cosa contiene per chi dovrà montare un reel verticale 9:16. Tempi precisi in secondi.
Non inventare: solo ciò che vedi e senti.

Contesto del lavoro: ${contesto}

Rispondi SOLO con JSON:
{
  "descrizione": "cosa c'è nella clip in una frase",
  "luogo_luce": "interno/esterno, tipo di luce",
  "momenti": [{"da": n, "a": n, "cosa_succede": "...", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro",
    "movimento_camera": "statico|panoramica|carrellata|gimbal|mano_libera|drone", "soggetti": ["..."],
    "qualita": 1-5, "uso_consigliato": "gancio|sviluppo|climax|chiusura|b_roll|scartare", "perche": "..."}],
  "problemi": [{"da": n, "a": n, "tipo": "mosso|fuori_fuoco|sovraesposto|sottoesposto|rumore_audio|altro", "nota": "..."}],
  "parlato": {"presente": bool, "lingua": "...", "trascrizione": [{"da": n, "a": n, "testo": "..."}]},
  "audio_ambiente": "suoni utili",
  "adatta_al_verticale": "si|serve_reframe|solo_con_sfondo_sfocato",
  "stima_fps_alti": "si|no|non_so"
}`;

const SISTEMA_SCHEDA = `Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guiderà
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`;

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
async function fasePiano(env, cfg, L) {
  await log(env, L.id, 'direttore', 'leggo la richiesta e preparo la ricerca');
  const p = await S.claude(cfg, SISTEMA_PIANO, piano(L.prompt), { maxTokens: 1500 });
  await run(env, 'UPDATE lavori SET piano=? WHERE id=?', JSON.stringify(p), L.id);
  await log(env, L.id, 'direttore', `settore: ${p.settore} · obiettivo: ${p.obiettivo || '-'}`);
}

async function faseRicerca(env, cfg, L) {
  const p = J(L.piano, {});
  const nomi = ['YouTube', 'TikTok', 'Instagram', 'Link tuoi'];
  const AG = ['scout_yt', 'scout_tt', 'scout_ig', 'direttore'];
  await log(env, L.id, 'scout_yt', `cerco Shorts: ${(p.youtube_query || []).join(' · ')}`);
  await log(env, L.id, 'scout_tt', `cerco su TikTok: ${[...(p.tiktok_query || []), ...(p.tiktok_hashtag || []).map((h) => '#' + h)].join(' · ')}`);
  await log(env, L.id, 'scout_ig', `cerco reel: ${(p.instagram_hashtag || []).map((h) => '#' + h).join(' · ')}`);
  const esiti = await Promise.allSettled([
    S.youtube(cfg, p.youtube_query || []),
    S.tiktok(cfg, p.tiktok_query || [], p.tiktok_hashtag || []),
    S.instagram(cfg, p.instagram_hashtag || []),
    S.linkDiretti(cfg, J(L.link_rif, [])),
  ]);
  const perFonte = {};
  for (let i = 0; i < 4; i++) {
    const e = esiti[i];
    if (e.status === 'rejected') { await log(env, L.id, AG[i], `${nomi[i]}: ${e.reason?.message || e.reason}`, 'warn'); perFonte[nomi[i]] = []; continue; }
    const lista = Array.isArray(e.value) ? e.value : e.value.video;
    if (e.value.nota) await log(env, L.id, AG[i], e.value.nota, 'warn');
    perFonte[nomi[i]] = lista;
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
  await run(env, 'UPDATE lavori SET candidati=?, riferimenti=? WHERE id=?', JSON.stringify(perFonte), JSON.stringify(riferimenti), L.id);
  await log(env, L.id, 'direttore', `scelgo ${riferimenti.length} video da far guardare a Gemini`);
}

async function guardaRiferimento(env, cfg, L, r) {
  const v = r.video;
  const settore = J(L.piano, {}).settore || '';
  if (!(await one(env, 'SELECT 1 FROM cache_analisi WHERE chiave=?', `rif:${v.piattaforma}:${v.id}`)))
    await log(env, L.id, 'occhi', `sto guardando ${v.piattaforma} · ${(v.titolo || v.url).slice(0, 60)} (${(v.views || 0).toLocaleString('it-IT')} views)`);
  const { dati, daCache } = await cache(env, `rif:${v.piattaforma}:${v.id}`, async () => {
    if (v.piattaforma === 'youtube') return S.guardaYoutube(cfg, v.url, analisiRiferimento(settore));
    if (!v.video_url) throw new Error('nessun file video scaricabile');
    const h = v.video_url.includes('api.apify.com') ? { authorization: `Bearer ${cfg.APIFY_TOKEN}` } : {};
    return S.guardaUrlVideo(cfg, v.video_url, `${v.piattaforma}_${v.id}`, analisiRiferimento(settore), null, h);
  });
  await log(env, L.id, 'occhi', `${daCache ? 'già visto' : 'guardato'}: ${v.piattaforma} · ${(v.titolo || v.url).slice(0, 60)}`);
  return dati;
}

async function faseRiferimenti(env, cfg, L, scadenza) {
  const rif = J(L.riferimenti, []);
  while (Date.now() < scadenza) {
    const daFare = rif.filter((r) => r.stato === 'da_guardare').slice(0, PER_GIRO);
    if (!daFare.length) break;
    const esiti = await Promise.allSettled(daFare.map((r) => guardaRiferimento(env, cfg, L, r)));
    esiti.forEach((e, i) => {
      if (e.status === 'fulfilled') Object.assign(daFare[i], { stato: 'fatto', analisi: e.value });
      else Object.assign(daFare[i], { stato: 'saltato', errore: String(e.reason?.message || e.reason).slice(0, 300) });
    });
    for (const [i, e] of esiti.entries()) if (e.status === 'rejected') await log(env, L.id, 'occhi', `saltato ${daFare[i].video.piattaforma} ${daFare[i].video.id}: ${daFare[i].errore}`, 'warn');
    await run(env, 'UPDATE lavori SET riferimenti=? WHERE id=?', JSON.stringify(rif), L.id);
  }
  if (rif.some((r) => r.stato === 'da_guardare')) return false; // continua al prossimo giro
  if (!rif.some((r) => r.stato === 'fatto')) {
    const chiave = rif.find((r) => /manca la chiave/.test(r.errore || ''));
    throw new Error(chiave ? chiave.errore : 'Gemini non è riuscito a guardare nessun riferimento');
  }
  return true;
}

async function faseClip(env, cfg, L, scadenza) {
  if (!L.pcloud) { await log(env, L.id, 'analista', 'nessuna cartella pCloud: lavoro solo sui riferimenti'); return true; }
  let clip = J(L.clip, null);
  if (!clip) {
    const lista = await S.pcloudClip(L.pcloud);
    if (!lista.length) throw new Error('nella cartella pCloud non ci sono video');
    clip = lista.map((c) => ({ ...c, stato: 'da_guardare' }));
    await run(env, 'UPDATE lavori SET clip=? WHERE id=?', JSON.stringify(clip), L.id);
    await log(env, L.id, 'analista', `${clip.length} clip trovate su pCloud`);
  }
  while (Date.now() < scadenza) {
    const daFare = clip.filter((c) => c.stato === 'da_guardare').slice(0, 2);
    if (!daFare.length) break;
    const esiti = await Promise.allSettled(daFare.map(async (c) => {
      const { dati, daCache } = await cache(env, `clip:${c.hash}:${c.dimensione}`, async () => {
        await log(env, L.id, 'analista', `sto guardando ${c.nome} (${Math.round((c.dimensione || 0) / 1048576)} MB${c.tecnico?.fps ? ', ' + c.tecnico.fps + ' fps' : ''})`);
        const url = await S.pcloudLinkDownload(L.pcloud, c.fileid);
        return S.guardaUrlVideo(cfg, url, c.nome, analisiClip(L.prompt), 2);
      });
      await log(env, L.id, 'analista', `${daCache ? 'già vista' : 'guardata'}: ${c.nome}`);
      return dati;
    }));
    esiti.forEach((e, i) => {
      if (e.status === 'fulfilled') return Object.assign(daFare[i], { stato: 'fatto', analisi: e.value });
      const errore = String(e.reason?.message || e.reason).slice(0, 300);
      const n = (daFare[i].tentativi || 0) + 1;
      // errori di rete su file grandi: riprova la stessa clip fino a 3 volte
      Object.assign(daFare[i], { tentativi: n, errore, stato: n < 3 && !/manca la chiave/.test(errore) ? 'da_guardare' : 'saltato' });
    });
    for (const c of daFare) if (c.stato === 'da_guardare' && c.errore) await log(env, L.id, 'analista', `${c.nome}: ${c.errore} — riprovo (${c.tentativi}/3)`, 'warn');
    for (const c of daFare) if (c.stato === 'saltato') await log(env, L.id, 'analista', `saltata ${c.nome}: ${c.errore}`, 'warn');
    await run(env, 'UPDATE lavori SET clip=? WHERE id=?', JSON.stringify(clip), L.id);
  }
  return !clip.some((c) => c.stato === 'da_guardare');
}

async function faseScheda(env, cfg, L) {
  await log(env, L.id, 'direttore', 'incrocio riferimenti e clip, scrivo la scheda tecnica');
  const rif = J(L.riferimenti, []).filter((r) => r.stato === 'fatto').map((r) => ({
    piattaforma: r.video.piattaforma, url: r.video.url, views: r.video.views, likes: r.video.likes,
    scelto_da_johnny: !!r.video.scelto_da_johnny, analisi: r.analisi,
  }));
  const clip = (J(L.clip, []) || []).filter((c) => c.stato === 'fatto').map((c) => ({ file: c.nome, tecnico: c.tecnico, ...c.analisi }));
  const s = await S.claude(cfg, SISTEMA_SCHEDA, scheda(L.prompt, J(L.piano, {}), rif, clip), { maxTokens: 8000 });
  await run(env, 'UPDATE lavori SET scheda=? WHERE id=?', JSON.stringify(s), L.id);
  await log(env, L.id, 'direttore', `scheda pronta: ${s.titolo_lavoro || ''}`);
}

// ------------------------------------------------------------------ motore
async function lavora(env, cfg, L, scadenza) {
  while (Date.now() < scadenza) {
    L = await one(env, 'SELECT * FROM lavori WHERE id=?', L.id);
    let finita = true;
    if (L.fase === 'piano') await fasePiano(env, cfg, L);
    else if (L.fase === 'ricerca') await faseRicerca(env, cfg, L);
    else if (L.fase === 'riferimenti') finita = await faseRiferimenti(env, cfg, L, scadenza);
    else if (L.fase === 'clip') finita = await faseClip(env, cfg, L, scadenza);
    else if (L.fase === 'scheda') await faseScheda(env, cfg, L);
    if (!finita) return;
    const prossima = FASI[FASI.indexOf(L.fase) + 1];
    await run(env, 'UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?',
      prossima, prossima === 'fatto' ? 'pronto' : 'in_corso', ora(), L.id);
    if (prossima === 'fatto') { await log(env, L.id, 'regia', '✅ lavoro pronto: apri la scheda'); return; }
  }
}

export async function avanza(env) {
  const inizio = Date.now();
  const cfg = await configurazione(env);
  const adesso = ora();
  const libero = new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString();
  // prende un lavoro alla volta, riservandolo (così due giri del cron non lo fanno insieme)
  for (let giri = 0; giri < 5 && Date.now() - inizio < BUDGET_MS - 60e3; giri++) {
    const presi = await all(env, `UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`, libero, adesso, adesso);
    if (!presi.length) return;
    const L = presi[0];
    try {
      await lavora(env, cfg, L, inizio + BUDGET_MS);
      await run(env, 'UPDATE lavori SET blocco_fino=NULL WHERE id=?', L.id);
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 500);
      const stop = L.tentativi >= 3 || /manca la chiave/.test(msg); // senza chiave è inutile riprovare
      // pausa di 2 minuti prima del nuovo tentativo (prima ripartiva subito e bruciava i 3 tentativi in un secondo)
      const pausa = new Date(Date.now() + 2 * 60e3).toISOString();
      await run(env, 'UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso', msg, stop ? null : pausa, ora(), L.id);
      const fase = (await one(env, 'SELECT fase FROM lavori WHERE id=?', L.id))?.fase || L.fase;
      await log(env, L.id, 'regia', `${stop ? '❌ fermo' : '⚠️ riprovo tra 2 minuti'} (fase ${fase}): ${msg}`, stop ? 'errore' : 'warn');
    }
  }
}
