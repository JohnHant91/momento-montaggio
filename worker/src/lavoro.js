// La catena di lavoro: piano → ricerca → riferimenti (Gemini guarda) → clip (Analista) → scheda tecnica.
// Ogni minuto il cron fa avanzare i lavori aperti, una fase alla volta, ripartendo da dove si era fermato.
import { J, all, log, one, ora, run, configurazione } from './db.js';
import { libreriaTesto } from './libreria.js';
import * as S from './servizi.js';

const FASI = ['piano', 'ricerca', 'riferimenti', 'clip', 'scheda', 'regia', 'montaggio', 'fatto'];
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
  "da_copiare": ["tecniche replicabili"],
  "da_evitare": ["cosa non funziona o è già visto"]
}`;

const analisiClip = (contesto) => `Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
per chi dovrà montare un reel verticale 9:16. Non vedi il video in movimento: ti do i fotogrammi in ordine di tempo
(tempo in giallo) e MISURE ESATTE: fps, risoluzione, durata; per ogni fotogramma nitidezza (varianza del laplaciano
su 480 px: sotto ~40 tende a mosso/sfocato, sopra ~150 è nitido), luminosità 0-255, % bruciato e % chiuso;
movimento tra fotogrammi (alto = camera o soggetto che si muovono); parlato trascritto da Whisper.
Usa le misure per qualità e problemi, i fotogrammi per contenuto e inquadrature. Non inventare.

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
  "adatta_al_verticale": "si|serve_reframe|solo_con_sfondo_sfocato",
  "note_montaggio": "consigli pratici per usarla"
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
  await log(env, L.id, 'scout_yt', `${cfg.YOUTUBE_API_KEY ? 'cerco Shorts' : 'cerco Shorts sul web'}: ${(p.youtube_query || []).join(' · ')}`);
  if (cfg.APIFY_TOKEN) {
    await log(env, L.id, 'scout_tt', `cerco su TikTok: ${[...(p.tiktok_query || []), ...(p.tiktok_hashtag || []).map((h) => '#' + h)].join(' · ')}`);
    await log(env, L.id, 'scout_ig', `cerco reel: ${(p.instagram_hashtag || []).map((h) => '#' + h).join(' · ')}`);
  }
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
    perFonte[nomi[i]] = lista;
    if ((i === 1 || i === 2) && !cfg.APIFY_TOKEN) continue; // Tea e Ines a riposo senza Apify
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

async function avvisoMotore(env, L) {
  if (L.motore_visto && Date.now() - new Date(L.motore_visto) > 75 * 60e3 && !(L.motore_fino && L.motore_fino > ora())) {
    await log(env, L.id, 'motore', 'il motore GitHub non si fa vivo da più di un\'ora: controlla GitHub → momento-montaggio → Actions', 'warn');
    await run(env, 'UPDATE lavori SET motore_visto=? WHERE id=?', ora(), L.id);
  }
  return false;
}

export const chiaveRif = (v) => `rif2:${v.piattaforma}:${v.id}`;

// Le clip le prepara il motore su GitHub Actions (download da pCloud + copia leggera 720p con ffmpeg)
// e le manda alla regia, che le passa a Gemini: vedi motore.js. Qui si aspetta e si tiene il conto.
async function faseClip(env, cfg, L) {
  if (!L.pcloud) { await log(env, L.id, 'analista', 'nessuna cartella pCloud: lavoro solo sui riferimenti'); return true; }
  let clip = J(L.clip, null);
  if (!clip) {
    const lista = await S.pcloudClip(L.pcloud);
    if (!lista.length) throw new Error('nella cartella pCloud non ci sono video');
    clip = lista.map((c) => ({ ...c, stato: 'da_guardare' }));
    // le clip già viste in altri lavori non si riguardano (e non si pagano)
    let gia = 0;
    for (const c of clip) {
      const r = await one(env, 'SELECT dati FROM cache_analisi WHERE chiave=?', chiaveClip(c));
      if (r) { const d = J(r.dati, {}); Object.assign(c, { stato: 'fatto', analisi: d.analisi || d, tecnico: d.tecnico || c.tecnico }); gia++; }
    }
    await run(env, 'UPDATE lavori SET clip=?, motore_visto=? WHERE id=?', JSON.stringify(clip), ora(), L.id);
    const peso = Math.round(clip.reduce((s, c) => s + (c.dimensione || 0), 0) / 1073741824 * 10) / 10;
    await log(env, L.id, 'analista', `${clip.length} clip trovate su pCloud (${peso} GB)${gia ? `, ${gia} già viste in passato` : ''}`);
    if (clip.some((c) => c.stato === 'da_guardare')) await log(env, L.id, 'motore', 'chiamo il motore GitHub: scarico e misuro le clip per Ada');
  }
  if (!clip.some((c) => c.stato === 'da_guardare')) return true;
  return avvisoMotore(env, L);
}

export const chiaveClip = (c) => `clip2:${c.hash}:${c.dimensione}`;
export { analisiClip, analisiRiferimento };

async function faseScheda(env, cfg, L) {
  await log(env, L.id, 'direttore', 'incrocio riferimenti e clip, scrivo la scheda tecnica');
  const rif = J(L.riferimenti, []).filter((r) => r.stato === 'fatto').map((r) => ({
    piattaforma: r.video.piattaforma, url: r.video.url, views: r.video.views, likes: r.video.likes,
    scelto_da_johnny: !!r.video.scelto_da_johnny, analisi: r.analisi,
  }));
  const clip = (J(L.clip, []) || []).filter((c) => c.stato === 'fatto').map((c) => ({ file: c.nome, tecnico: c.tecnico, ...c.analisi }));
  const s = await S.claude(cfg, SISTEMA_SCHEDA, scheda(L.prompt, J(L.piano, {}), rif, clip), { maxTokens: 16000 });
  await run(env, 'UPDATE lavori SET scheda=? WHERE id=?', JSON.stringify(s), L.id);
  await log(env, L.id, 'direttore', `scheda pronta: ${s.titolo_lavoro || ''}`);
}

// ------------------------------------------------------------------ motore
// ------------------------------------------------------------------ Regista: dalla scheda al piano di montaggio
const LOOKS = ['caldo_cinematico', 'pulito_commerciale', 'teal_orange', 'moody_scuro', 'naturale_vivace', 'bn_contrasto', 'pastello_soft', 'vintage_film'];
const TRANSIZIONI = ['taglio_netto', 'dissolvenza', 'flash_bianco', 'whip_pan', 'zoom', 'glitch', 'slide', 'fadenero'];
const EFFETTI_PEZZO = ['punch_in', 'zoom_lento', 'zoom_out', 'shake', 'nessuno'];
const EFFETTI_GLOBALI = ['grana', 'vignettatura', 'bande_cinema', 'light_leak'];

const SISTEMA_REGISTA = `Sei il Regista e il Copy di Momento Produzione. Trasformi la SCHEDA TECNICA del Direttore creativo in un
PIANO DI MONTAGGIO preciso che un montatore automatico eseguirà alla lettera. Scegli i pezzi migliori dalle clip analizzate
(usa solo momenti con qualità alta e senza problemi, rispetta i tempi da/a dei momenti), costruisci gancio → sviluppo → climax →
chiusura, alterna inquadrature (totale/dettaglio/primo piano), non ripetere lo stesso momento. Il rallenty va su clip girate a
48 fps o più (rallenty_possibile). Testi brevi, in italiano corretto, niente formule abusate. Rispondi SOLO JSON.`;

const pianoMontaggio = (scheda, clip) => `SCHEDA TECNICA:
${JSON.stringify(scheda)}

CLIP DISPONIBILI (indice, file, dati tecnici, momenti con tempi e qualità, problemi):
${JSON.stringify(clip)}

VALORI AMMESSI
- look: ${LOOKS.join(', ')}
- transizione_in: ${TRANSIZIONI.join(', ')} (la prima clip non ne ha)
- effetto: ${EFFETTI_PEZZO.join(', ')}
- effetti_globali: ${EFFETTI_GLOBALI.join(', ')}
- stile testi: titolo_grande_centrale, etichetta_box, sottotitolo_classico; posizione: alto, centro, terzo_inferiore

JSON:
{
  "durata_target": n,
  "look": "...", "intensita_look": 0.6-1.0,
  "effetti_globali": ["..."],
  "font": {"titoli": "font Google Fonts", "testi": "font Google Fonts"},
  "colori": {"testo": "#hex", "accento": "#hex", "box": "#hex"},
  "sfx": true/false, "riser": secondi del primo picco (o null),
  "segmenti": [{"clip": indice, "in": secondi nella clip, "durata": secondi nel reel, "rallenty": bool, "effetto": "...",
                "transizione_in": "...", "audio": 0-1 (suono originale), "motivo": "perché questo pezzo qui",
                "testo": {"testo": "...", "stile": "...", "posizione": "...", "evidenzia": "parola"} oppure null}],
  "sottotitoli": {"usare": bool, "stile": "parola_per_parola|karaoke_evidenziato|sottotitolo_classico", "posizione": "terzo_inferiore"},
  "chiusura": {"testo": "...", "sottotesto": "cta breve", "evidenzia": "parola", "durata": 2-3, "colore": "#hex"} oppure null,
  "caption": "caption finale per il post",
  "musica_da_mettere": "che brano cercare su Instagram e da che secondo, a che volume rispetto al suono originale"
}`;

async function faseRegia(env, cfg, L) {
  const scheda = J(L.scheda, {});
  const clip = (J(L.clip, []) || []).map((c, i) => ({ c, i })).filter(({ c }) => c.stato === 'fatto').map(({ c, i }) => ({
    indice: i, file: c.nome, tecnico: c.tecnico, descrizione: c.analisi?.descrizione, momenti: c.analisi?.momenti,
    problemi: c.analisi?.problemi, parlato: c.analisi?.parlato, verticale: c.analisi?.adatta_al_verticale,
  }));
  if (!clip.length) {
    await log(env, L.id, 'regista', 'nessuna clip analizzata: senza girato non posso montare. La scheda resta pronta da usare.', 'warn');
    return 'salta';
  }
  await log(env, L.id, 'regista', `scrivo il piano di montaggio da ${clip.length} clip`);
  const p = await S.claude(cfg, SISTEMA_REGISTA, pianoMontaggio(scheda, clip), { maxTokens: 12000 });
  // controllo del piano: valori ammessi, clip esistenti, tempi dentro le clip
  const tutte = J(L.clip, []);
  const seg = (p.segmenti || []).filter((s) => tutte[s.clip]?.stato === 'fatto').slice(0, 40).map((s, k) => {
    const c = tutte[s.clip];
    const durClip = Number(c.tecnico?.durata_sec) || 9999;
    const durata = Math.min(Math.max(Number(s.durata) || 1.5, 0.4), 12);
    const rallenty = !!s.rallenty;
    const serve = durata * (rallenty ? 0.5 : 1);
    return {
      clip: s.clip, fileid: c.fileid, nome: c.nome, in: Math.max(0, Math.min(Number(s.in) || 0, Math.max(0, durClip - serve - 0.05))), durata, rallenty,
      effetto: EFFETTI_PEZZO.includes(s.effetto) ? s.effetto : 'nessuno',
      transizione_in: k === 0 ? null : (TRANSIZIONI.includes(s.transizione_in) ? s.transizione_in : 'taglio_netto'),
      audio: Math.min(1, Math.max(0, Number(s.audio ?? 0.8))), motivo: s.motivo, testo: s.testo?.testo ? s.testo : null,
    };
  });
  if (!seg.length) throw new Error('il piano del Regista non contiene pezzi validi');
  const piano = {
    ...p, segmenti: seg, look: LOOKS.includes(p.look) ? p.look : (LOOKS.includes(scheda.colore?.look) ? scheda.colore.look : 'naturale_vivace'),
    effetti_globali: (p.effetti_globali || []).filter((e) => EFFETTI_GLOBALI.includes(e)),
  };
  await run(env, 'UPDATE lavori SET montaggio=? WHERE id=?', JSON.stringify({ stato: 'da_fare', piano, creato: ora() }), L.id);
  const tot = seg.reduce((a, s) => a + s.durata, 0);
  await log(env, L.id, 'regista', `piano pronto: ${seg.length} pezzi, ~${Math.round(tot + (piano.chiusura?.durata || 0))} s, look ${piano.look}`);
  if (seg.some((s) => s.testo) || piano.chiusura) await log(env, L.id, 'copy', `testi: ${[...seg.filter((s) => s.testo).map((s) => '"' + s.testo.testo + '"'), piano.chiusura?.testo ? '"' + piano.chiusura.testo + '"' : ''].filter(Boolean).join(' · ').slice(0, 300)}`);
  await log(env, L.id, 'motore', 'chiamo il motore GitHub per il montaggio');
  return true;
}

async function faseMontaggio(env, cfg, L) {
  const m = J(L.montaggio, null);
  if (!m) return true; // niente da montare (nessuna clip)
  if (m.stato === 'fatto') return true;
  if (m.stato === 'errore') throw new Error('montaggio non riuscito: ' + (m.errore || ''));
  return avvisoMotore(env, L);
}

async function lavora(env, cfg, L, scadenza) {
  while (Date.now() < scadenza) {
    L = await one(env, 'SELECT * FROM lavori WHERE id=?', L.id);
    let finita = true;
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
  // prende un lavoro alla volta, riservandolo (così due giri del cron non lo fanno insieme)
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
      const stop = L.tentativi >= 3 || /manca la chiave/.test(msg); // senza chiave è inutile riprovare
      // pausa di 2 minuti prima del nuovo tentativo (prima ripartiva subito e bruciava i 3 tentativi in un secondo)
      const pausa = new Date(Date.now() + 2 * 60e3).toISOString();
      await run(env, 'UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso', msg, stop ? null : pausa, ora(), L.id);
      const fase = (await one(env, 'SELECT fase FROM lavori WHERE id=?', L.id))?.fase || L.fase;
      await log(env, L.id, 'regia', `${stop ? '❌ fermo' : '⚠️ riprovo tra 2 minuti'} (fase ${fase}): ${msg}`, stop ? 'errore' : 'warn');
    }
  }
}
