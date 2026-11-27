// POST E CAROSELLI: un comparto come quello dei Reel, ma per le immagini.
//  1. Ines (Instagram) e Tea (TikTok) cercano i post e i caroselli più virali della nicchia (via Apify; senza, Claude sul web).
//  2. Iris guarda le copertine e le slide dei migliori e ricava cosa funziona: ganci, struttura, stile grafico.
//  3. Ada guarda le foto che Johnny ha scattato (cartella pCloud) e sceglie le migliori, con lo spazio per i testi.
//  4. Pietro scrive i caroselli slide per slide (con la foto di ogni slide), Giulia caption e hashtag. Johnny approva.
//  5. Canva: i caroselli si impaginano su Canva (li crea Claude con Canva collegato) e tornano qui come PNG + link modificabile.
import { all, one, run, J, ora, configurazione, log, intermedie } from './db.js';
import * as S from './servizi.js';
import { SKILL } from './skill_testi.js';
import { chi } from './consumi.js';
import { cliente } from './agenzia.js';
import { instagram, firmaPubblica } from './avatar.js';
import { MODELLI, descriviTemi, svegliaImpagina } from './impagina.js';
import { fileSotto } from './archivio.js';
import { clientePerNome, lineaCliente, testoLinea, ripassoChiara } from './chiara.js';

const BLOCCO_MIN = 12;
export const FASI_POST = [['ricerca', 'Post virali'], ['studio', 'Studio'], ['foto', 'Foto'], ['contenuti', 'Testi'], ['approvazione', 'Approvazione'], ['impagina', 'Impaginazione'], ['fatto', 'Pronto']];
const AGENTE_FASE = { ricerca: 'scout_ig', studio: 'occhi', foto: 'analista', contenuti: 'caroselli', scarica: 'caroselli' };

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoPost;
export function schemaPost(env) { return (_fattoPost ||= _schemaPost(env).catch((e) => { _fattoPost = null; throw e; })); }
async function _schemaPost(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS post_lavori (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, cliente TEXT, nicchia TEXT, tipo TEXT DEFAULT 'carosello',
    numero INTEGER DEFAULT 3, slide INTEGER DEFAULT 7, brief TEXT, pcloud TEXT, esempi TEXT, note TEXT, fase TEXT NOT NULL DEFAULT 'ricerca', stato TEXT NOT NULL DEFAULT 'in_corso',
    virali TEXT, studio TEXT, foto TEXT, contenuti TEXT, canva TEXT, slide_file TEXT, errore TEXT, tentativi INTEGER DEFAULT 0, blocco_fino TEXT, riunione_id INTEGER, creato TEXT, aggiornato TEXT)`).run();
}

export async function nuovoLavoroPost(env, d) {
  await schemaPost(env);
  const C = d.cliente_id ? await cliente(env, d.cliente_id) : null;
  const r = await one(env, `INSERT INTO post_lavori (cliente_id, cliente, nicchia, tipo, numero, slide, brief, pcloud, esempi, note, riunione_id, creato, aggiornato)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`, C?.id || Number(d.cliente_id) || null, String(C?.nome || d.cliente || '').slice(0, 120), String(d.nicchia || C?.nicchia || '').slice(0, 200),
    ['carosello', 'post', 'misto'].includes(d.tipo) ? d.tipo : 'carosello', Math.min(12, Math.max(1, Number(d.numero) || 3)), Math.min(10, Math.max(2, Number(d.slide) || 7)),
    String(d.brief || '').slice(0, 4000), String(d.pcloud || '').trim() || null, JSON.stringify((d.esempi || []).filter((x) => /^https:\/\//.test(x)).slice(0, 10)),
    String(d.note || '').slice(0, 2000), d.riunione || null, ora(), ora());
  await log(env, null, 'scout_ig', `🗂️ nuovo lavoro post #${r.id} per ${C?.nome || d.cliente || 'cliente'}: ${d.numero || 3} ${d.tipo || 'carosello'}, cerco i più virali della nicchia`);
  return r.id;
}

// ------------------------------------------------------------------ 1. post e caroselli virali
const num = (v) => Math.round(Number(v) || 0);
function normIg(it) {
  const figli = it.childPosts || it.images || [];
  return {
    piattaforma: 'instagram', url: S.primo(it, 'url') || '', autore: S.primo(it, 'ownerUsername') || '', caption: String(S.primo(it, 'caption') || '').slice(0, 600),
    likes: num(S.primo(it, 'likesCount')), commenti: num(S.primo(it, 'commentsCount')), data: S.primo(it, 'timestamp') || '',
    carosello: /sidecar/i.test(it.type || '') || figli.length > 1, slide: Math.max(1, figli.length || 1),
    immagini: [S.primo(it, 'displayUrl'), ...figli.map((f) => (typeof f === 'string' ? f : f.displayUrl))].filter(Boolean).slice(0, 4),
    _video: /video/i.test(it.type || '') || !!it.videoUrl,
  };
}
function normTt(it) {
  const imm = (it.imagePost?.images || it.slideshowImageLinks || []).map((x) => x?.imageURL?.urlList?.[0] || x?.downloadLink || x?.tiktokLink || x).filter((x) => typeof x === 'string');
  return {
    piattaforma: 'tiktok', url: S.primo(it, 'webVideoUrl', 'url') || '', autore: S.primo(it, 'authorMeta.name') || '', caption: String(S.primo(it, 'text') || '').slice(0, 600),
    likes: num(S.primo(it, 'diggCount')), commenti: num(S.primo(it, 'commentCount')), condivisioni: num(S.primo(it, 'shareCount')), views: num(S.primo(it, 'playCount')),
    data: S.primo(it, 'createTimeISO') || '', carosello: imm.length > 1, slide: imm.length || 1, immagini: [S.primo(it, 'videoMeta.coverUrl', 'covers.0'), ...imm].filter(Boolean).slice(0, 4),
    _video: !imm.length,
  };
}
const forza = (p) => Math.log10(1 + (p.likes || 0) + 3 * (p.commenti || 0) + 4 * (p.condivisioni || 0)) + (p.carosello ? 0.3 : 0);

async function faseRicerca(env, cfg, P) {
  const C = P.cliente_id ? await cliente(env, P.cliente_id) : null;
  const q = await S.claude({ ...cfg, CLAUDE_MODEL: cfg.CLAUDE_MODEL_LIGHT }, 'Prepari le ricerche per trovare i post e i caroselli Instagram/TikTok più virali di una nicchia.',
    `NICCHIA: ${P.nicchia || C?.nicchia || ''}\nCLIENTE: ${P.cliente}\nBRIEF: ${P.brief}\nRispondi SOLO JSON: {"hashtag": ["5 hashtag instagram senza #, di nicchia ma con volume"], "tiktok": ["3 ricerche brevi per caroselli/foto su TikTok"]}`, { maxTokens: 600 });
  const lista = [];
  const esempi = J(P.esempi, []);
  if (cfg.APIFY_TOKEN) {
    const [ig, tt, miei] = await Promise.allSettled([
      S.apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, { directUrls: (q.hashtag || []).slice(0, 5).map((h) => `https://www.instagram.com/explore/tags/${String(h).replace(/^#/, '')}/`), resultsType: 'posts', resultsLimit: 25, addParentData: false }),
      S.apify(cfg, cfg.APIFY_TIKTOK_ACTOR, { searchQueries: (q.tiktok || []).slice(0, 3), resultsPerPage: 15, searchSection: '/photo', shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSlideshowImages: false }),
      esempi.length ? S.apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, { directUrls: esempi.filter((u) => /instagram/.test(u)), resultsType: 'posts', resultsLimit: 1 }) : Promise.resolve([]),
    ]);
    if (ig.status === 'fulfilled') lista.push(...ig.value.map(normIg));
    else await log(env, null, 'scout_ig', `Instagram non risponde: ${String(ig.reason?.message || ig.reason).slice(0, 120)}`, 'warn');
    if (tt.status === 'fulfilled') lista.push(...tt.value.map(normTt));
    else await log(env, null, 'scout_tt', `TikTok non risponde: ${String(tt.reason?.message || tt.reason).slice(0, 120)}`, 'warn');
    if (miei.status === 'fulfilled') lista.push(...miei.value.map((x) => ({ ...normIg(x), scelto_da_johnny: true })));
  } else {
    await log(env, null, 'scout_ig', 'senza token Apify cerco esempi sul web (niente numeri di like)', 'warn');
    const w = await S.claude(cfg, 'Sei uno scout di contenuti social. Usa solo link reali che trovi.', `Cerca esempi di caroselli Instagram/TikTok di successo nella nicchia "${P.nicchia || P.cliente}" (${(q.hashtag || []).join(', ')}). Rispondi SOLO JSON: {"esempi": [{"url": "...", "autore": "...", "perche": "..."}]}`, { maxTokens: 2000 }).catch(() => ({ esempi: [] }));
    lista.push(...(w.esempi || []).map((x) => ({ piattaforma: /tiktok/.test(x.url) ? 'tiktok' : 'instagram', url: x.url, autore: x.autore || '', caption: x.perche || '', likes: 0, commenti: 0, carosello: true, slide: 0, immagini: [] })));
  }
  const visti = new Set();
  const top = lista.filter((p) => p.url && !p._video && !visti.has(p.url) && visti.add(p.url))
    .map((p) => ({ ...p, forza: Math.round(forza(p) * 100) / 100 })).sort((a, b) => (b.scelto_da_johnny ? 99 : b.forza) - (a.scelto_da_johnny ? 99 : a.forza)).slice(0, 12);
  await run(env, "UPDATE post_lavori SET virali=?, fase='studio', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify({ hashtag: q.hashtag || [], post: top }), ora(), P.id);
  await log(env, null, 'scout_ig', `🔥 post #${P.id}: ${lista.length} post trovati, tengo i ${top.length} più forti (${top.filter((p) => p.carosello).length} caroselli). Li passo a Iris`);
}

// ------------------------------------------------------------------ 2. Iris studia le slide dei migliori
async function immagineBase64(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok || !/image/.test(r.headers.get('content-type') || '')) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.byteLength > 3.5e6) return null;
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return { jpeg: btoa(s), tipo: (r.headers.get('content-type') || 'image/jpeg').split(';')[0] };
  } catch (_) { return null; }
}

async function faseStudio(env, cfg, P) {
  const V = J(P.virali, {}), post = V.post || [];
  const immagini = [];
  for (const [i, p] of post.slice(0, 6).entries()) for (const u of (p.immagini || []).slice(0, 2)) {
    const b = await immagineBase64(u);
    if (b && b.tipo === 'image/jpeg') immagini.push({ cosa: `esempio ${i + 1} (${p.piattaforma}, @${p.autore}, ${p.likes} like, ${p.commenti} commenti) · slide ${immagini.filter((x) => x.cosa.startsWith(`esempio ${i + 1} `)).length + 1}`, jpeg: b.jpeg });
    if (immagini.length >= 10) break;
  }
  const sistema = `Sei Iris, occhi di AGENZIA MOMENTO AI. Studi i caroselli e i post più virali di una nicchia e ricavi regole pratiche per crearne di nuovi, senza copiarli.
===== SKILL: carousel-writer =====
${(SKILL['carousel-writer'] || '').slice(0, 5000)}`;
  const domanda = `NICCHIA: ${P.nicchia || P.cliente}\nCAPTION E NUMERI DEI MIGLIORI:\n${post.map((p, i) => `${i + 1}. ${p.piattaforma} @${p.autore} · ${p.carosello ? p.slide + ' slide' : 'foto singola'} · ${p.likes} like · ${p.commenti} commenti · ${p.url}\n   ${p.caption.slice(0, 300)}`).join('\n')}
${immagini.length ? 'Ti allego le copertine e alcune slide.' : 'Le immagini non sono disponibili: lavora su caption e numeri.'}
Rispondi SOLO JSON:
{"sintesi": "3 frasi: cosa hanno in comune quelli che vanno meglio",
 "copertine": ["come sono fatte le copertine che fermano lo scroll: testo, dimensione, foto, contrasto"],
 "struttura": ["come si sviluppano slide dopo slide, quante slide, dove sta la CTA"],
 "stile_grafico": {"colori": "...", "font": "...", "layout": "...", "foto_o_grafica": "..."},
 "testo_per_slide": "quante parole al massimo per slide",
 "ganci": ["5 formule di gancio per la copertina che funzionano in questa nicchia"],
 "da_evitare": ["..."],
 "per_esempio": [{"n": 1, "perche_funziona": "..."}]}`;
  const out = immagini.length ? await S.claudeVisione(cfg, cfg.CLAUDE_MODEL, sistema, domanda, immagini, 5000) : await S.claude(cfg, sistema, domanda, { maxTokens: 5000 });
  delete out._uso;
  await run(env, "UPDATE post_lavori SET studio=?, fase='foto', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify({ ...out, immagini_viste: immagini.length }), ora(), P.id);
  await log(env, null, 'occhi', `👁️ post #${P.id}: ho studiato ${post.length} post virali (${immagini.length} slide guardate). ${String(out.sintesi || '').slice(0, 140)}`);
}

// ------------------------------------------------------------------ 3. Ada sceglie le foto di Johnny
async function fasefoto(env, cfg, P) {
  if (!P.pcloud) {
    await run(env, "UPDATE post_lavori SET foto=?, fase='contenuti', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify({ nessuna: true, foto: [] }), ora(), P.id);
    await log(env, null, 'analista', `post #${P.id}: nessuna cartella di foto, i caroselli saranno grafici`);
    return;
  }
  const daArchivio = !/code=/.test(P.pcloud);
  const tutte = daArchivio
    ? (await fileSotto(env, P.pcloud)).filter((f) => f.tipo === 'immagine' && !/^logo/i.test(f.nome) && /\.(jpe?g|png|webp)$/i.test(f.nome)).slice(0, 40).map((f) => ({ nome: f.nome, percorso: f.percorso, dimensione: f.dimensione, tipo: 'immagine', tecnico: {} }))
    : (await S.pcloudClip(P.pcloud)).filter((f) => f.tipo === 'immagine').slice(0, 40);
  if (!tutte.length) throw new Error('nella cartella pCloud non ci sono foto (jpg, png, webp)');
  const viste = J(P.foto, {})?.foto || [];
  const fatte = new Set(viste.map((f) => f.nome));
  const lotto = tutte.filter((f) => !fatte.has(f.nome)).slice(0, daArchivio ? 4 : 8);
  const immagini = [];
  for (const f of lotto) {
    try {
      if (daArchivio) { // dall'archivio: Claude vede le foto fino a ~4 MB (le più grandi le sceglie dal nome)
        if (!env.ARCHIVIO || f.dimensione > 3 * 1048576 || !/\.jpe?g$/i.test(f.nome)) continue;
        const o = await env.ARCHIVIO.get(f.percorso); if (!o) continue;
        const u8 = new Uint8Array(await o.arrayBuffer()); let bin = ''; for (let k = 0; k < u8.length; k += 32768) bin += String.fromCharCode(...u8.subarray(k, k + 32768));
        immagini.push({ cosa: f.nome, jpeg: btoa(bin), f }); continue;
      }
      const t = await S.pcloudApi(P.pcloud, 'getpubthumblink', { fileid: f.fileid, size: '640x640' });
      const b = await immagineBase64(`https://${t.hosts[0]}${t.path}`);
      if (b) immagini.push({ cosa: f.nome, jpeg: b.jpeg, f });
    } catch (_) { /* se una miniatura non arriva la salto */ }
  }
  if (immagini.length) {
    const out = await S.claudeVisione(cfg, cfg.CLAUDE_MODEL, 'Sei Ada, analista di AGENZIA MOMENTO AI. Valuti foto scattate da un fotografo per usarle nei caroselli Instagram di un cliente.',
      `CLIENTE: ${P.cliente} · NICCHIA: ${P.nicchia}\nBRIEF: ${P.brief}\nPer ogni foto allegata rispondi SOLO JSON: {"foto": [{"nome": "nome file esatto", "descrizione": "cosa si vede", "qualita": 1-10, "problemi": "mosso, buio... o vuoto", "spazio_testo": "dove si può mettere il testo (alto/basso/sinistra/nessuno)", "uso": "copertina | slide | sfondo | scarta"}]}`,
      immagini.map(({ cosa, jpeg }) => ({ cosa, jpeg })), 4000);
    for (const x of out.foto || []) { const f = lotto.find((l) => l.nome === x.nome); if (f) viste.push({ ...x, fileid: f.fileid, percorso: f.percorso, risoluzione: f.tecnico?.risoluzione, orientamento: f.tecnico?.orientamento }); }
  }
  for (const f of lotto) if (!viste.some((v) => v.nome === f.nome)) viste.push(f.percorso ? { nome: f.nome, percorso: f.percorso, uso: 'contenuto', qualita: 6, descrizione: 'foto grande non vista (scelta dal nome)' } : { nome: f.nome, fileid: f.fileid, uso: 'scarta', problemi: 'miniatura non disponibile' });
  const finite = viste.length >= tutte.length;
  await run(env, 'UPDATE post_lavori SET foto=?, fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?', JSON.stringify({ totale: tutte.length, foto: viste }), finite ? 'contenuti' : 'foto', ora(), P.id);
  await log(env, null, 'analista', `🔎 post #${P.id}: ${viste.length}/${tutte.length} foto guardate${finite ? `, ${viste.filter((v) => v.uso !== 'scarta').length} buone` : ''}`);
}

// ------------------------------------------------------------------ 4. Pietro scrive i caroselli, Giulia caption e hashtag
async function faseContenuti(env, cfg, P) {
  const C = P.cliente_id ? await cliente(env, P.cliente_id) : await clientePerNome(env, P.cliente).catch(() => null);
  const linea = C ? await lineaCliente(env, cfg, C).catch(() => null) : null;
  if (linea) await log(env, null, 'smm', `📣 Chiara passa a Pietro e Giulia la linea editoriale di ${C.nome}`);
  const St = J(P.studio, {}), F = (J(P.foto, {})?.foto || []).filter((f) => f.uso !== 'scarta').sort((a, b) => (b.qualita || 0) - (a.qualita || 0));
  const out = await S.claude(cfg, `Sei Pietro (caroselli e grafiche) con Giulia (copywriter) di AGENZIA MOMENTO AI. Scrivi post e caroselli Instagram pronti da impaginare con i modelli dell'agenzia.
TEMI GRAFICI (uno per ogni post, nel campo "tema": scegli in base allo stile del cliente e della nicchia; post diversi = temi DIVERSI):
${descriviTemi()}

MODELLI DI SLIDE (scegli per ogni slide quello giusto, la copertina con foto se c'è una foto buona):
${Object.entries(MODELLI).map(([k, v]) => '- ' + k + ': ' + v).join('\n')}
REGOLE: ogni slide ha UNA idea; copertina con gancio forte e corto; testi brevi (rispetta il massimo di parole per slide); l'ultima slide chiude con una CTA chiara;
niente emoji nei testi delle slide (le icone vanno nel campo icona); usa SOLO le foto dell'elenco (nome file esatto) quando ci sono, la migliore come copertina, mai la stessa foto due volte nello stesso carosello; niente dati inventati sul cliente.
===== SKILL: carousel-writer =====
${(SKILL['carousel-writer'] || '').slice(0, 6000)}
===== SKILL: caption-writer =====
${(SKILL['caption-writer'] || '').slice(0, 3000)}`,
  `CLIENTE: ${P.cliente}${C?.scheda ? '\nSCHEDA DEL CLIENTE:\n' + String(C.scheda).slice(0, 3000) : ''}${linea ? '\n' + testoLinea(linea) : ''}
NICCHIA: ${P.nicchia}
COSA VUOLE JOHNNY: ${P.numero} ${P.tipo === 'post' ? 'post a foto singola' : P.tipo === 'misto' ? 'contenuti tra caroselli e post singoli' : 'caroselli'} da ${P.slide} slide circa.
BRIEF: ${P.brief}${P.note ? '\nNOTE: ' + P.note : ''}
COSA HA IMPARATO IRIS DAI VIRALI: ${JSON.stringify(St).slice(0, 5000)}
FOTO DISPONIBILI (scattate da Johnny): ${F.length ? F.map((f) => `${f.nome} · ${f.descrizione || ''} · qualità ${f.qualita || '?'} · testo: ${f.spazio_testo || '?'} · ${f.orientamento || ''}`).join('\n') : 'nessuna: carosello grafico (tipografia, forme, colori del brand)'}

Rispondi SOLO JSON:
{"stile": {"palette": ["#hex", "#hex", "#hex"], "font_titoli": "...", "font_testo": "...", "mood": "...", "regole": "indicazioni grafiche per tutto il set"},
 "post": [{"n": 1, "tipo": "carosello | post", "titolo": "titolo interno", "obiettivo": "salvataggi | condivisioni | commenti | contatti",
   "tema": "uno dei TEMI GRAFICI",
   "data_proposta": "SOLO se il brief chiede un calendario editoriale o delle date: giorno e ora consigliati, formato 2026-12-03T19:00 (ora italiana), altrimenti null. È una proposta: decide Johnny quando approva",
   "slide": [{"n": 1, "ruolo": "copertina | contenuto | cta", "modello": "uno dei MODELLI", "titolo": "testo grande", "testo": "testo piccolo o vuoto (per lista: un punto per riga)", "foto": "nome file o null", "altre_foto": ["solo per collage"], "icona": "facoltativa: icona Iconify del set Phosphor per testo, lista e numero (es. ph:coffee-bold, ph:fire-bold, ph:clock-bold, ph:map-pin-bold, ph:heart-bold) — mai emoji"}],
   "caption": "caption completa con gancio e CTA", "hashtag": ["8-12 hashtag senza #"], "alt": "testo alternativo"}]}`, { maxTokens: 16000 });
  const post = (out.post || []).slice(0, P.numero).map((p, i) => ({ ...p, n: i + 1, stato: 'da_approvare' }));
  // Chiara ripassa ogni post prima che arrivi a Johnny
  for (const x of post) x.nota_chiara = await ripassoChiara(env, cfg, C, x.tipo || 'carosello', { titolo: x.titolo, slide: (x.slide || []).map((s) => [s.titolo, s.testo].filter(Boolean).join(' — ')), caption: x.caption });
  if (post.some((x) => x.nota_chiara)) await log(env, null, 'smm', `📣 Chiara ha ripassato ${post.length} contenuti di ${P.cliente}: le sue note sono in Approvazioni`);
  // i testi non passano più da Johnny: si impaginano subito e lui approva le grafiche finite
  if (!(await intermedie(env))) {
    post.forEach((x) => { x.stato = 'approvato'; });
    await run(env, "UPDATE post_lavori SET contenuti=?, canva=NULL, slide_file=NULL, fase='impagina', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify({ stile: out.stile || {}, post }), ora(), P.id);
    await log(env, null, 'caroselli', `🎨 post #${P.id}: ${post.length} ${P.tipo === 'post' ? 'post' : 'caroselli'} scritti, li impagino subito (approvi il risultato finito)`);
    return;
  }
  await run(env, "UPDATE post_lavori SET contenuti=?, fase='approvazione', stato='da_approvare', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify({ stile: out.stile || {}, post }), ora(), P.id);
  await log(env, null, 'caroselli', `🗂️ post #${P.id}: ${post.length} ${P.tipo === 'post' ? 'post' : 'caroselli'} scritti (${post.reduce((s, p) => s + (p.slide || []).length, 0)} slide). Johnny, tocca a te approvarli`);
}

// ------------------------------------------------------------------ 6. le slide fatte su Canva tornano qui (PNG nell'archivio)
async function faseScarica(env, cfg, P) {
  const cv = J(P.canva, {}), file = J(P.slide_file, {}) || {};
  let fatti = 0, mancano = 0;
  for (const d of cv.post || []) for (const [k, u] of (d.png || []).entries()) {
    const chiave = `post-${P.id}/${d.n}-${k + 1}.png`;
    if (file[chiave]) continue;
    if (fatti >= 12) { mancano++; continue; }
    const r = await fetch(u);
    if (!r.ok) throw new Error(`slide ${d.n}.${k + 1} non scaricabile da Canva (${r.status}): rifai l'esportazione`);
    await env.VIDEO.put(chiave, await r.arrayBuffer(), { metadata: { tipo: r.headers.get('content-type') || 'image/png' } });
    file[chiave] = true; fatti++;
  }
  const finito = !mancano;
  await run(env, 'UPDATE post_lavori SET slide_file=?, fase=?, stato=?, errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?', JSON.stringify(file), finito ? 'fatto' : 'scarica', finito ? 'fatto' : 'in_corso', ora(), P.id);
  if (finito) await log(env, null, 'caroselli', `✅ post #${P.id}: ${Object.keys(file).length} slide pronte, caption e hashtag inclusi`);
}

// ------------------------------------------------------------------ cron
export async function avanzaPost(env) {
  await schemaPost(env);
  const adesso = ora();
  const L = await all(env, "SELECT * FROM post_lavori WHERE stato='in_corso' AND fase IN ('ricerca','studio','foto','contenuti','scarica','impagina') AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 2", adesso);
  if (!L.length) return;
  const cfg0 = await configurazione(env);
  for (const P0 of L) {
    const P = await one(env, 'UPDATE post_lavori SET blocco_fino=?, tentativi=tentativi+1 WHERE id=? AND (blocco_fino IS NULL OR blocco_fino < ?) RETURNING *', new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString(), P0.id, adesso);
    if (!P) continue;
    const cfg = chi(cfg0, { area: 'post', agente: AGENTE_FASE[P.fase] || 'caroselli', cliente_id: P.cliente_id });
    try {
      if (P.fase === 'ricerca') await faseRicerca(env, cfg, P);
      else if (P.fase === 'studio') await faseStudio(env, cfg, P);
      else if (P.fase === 'foto') await fasefoto(env, cfg, P);
      else if (P.fase === 'contenuti') await faseContenuti(env, cfg, P);
      else if (P.fase === 'scarica') await faseScarica(env, cfg, P);
      else if (P.fase === 'impagina') {
        // chiamo il motore GitHub; se dopo 20 minuti non ha consegnato lo richiamo
        const cv = J(P.canva, {}) || {};
        if (!cv.svegliato || Date.now() - new Date(cv.svegliato) > 20 * 60e3) {
          const ok = await svegliaImpagina(env, P.id);
          await run(env, "UPDATE post_lavori SET canva=json_set(COALESCE(canva,'{}'), '$.svegliato', ?), tentativi=0, blocco_fino=? WHERE id=?", ora(), new Date(Date.now() + 5 * 60e3).toISOString(), P.id);
          if (!ok) throw new Error('GitHub non risponde: controlla il token GitHub in Impostazioni');
          await log(env, null, 'caroselli', `🎨 post #${P.id}: il motore impagina le slide`);
        } else await run(env, 'UPDATE post_lavori SET tentativi=0 WHERE id=?', P.id);
      }
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 400);
      const credito = /credit balance|billing/i.test(msg);
      const stop = !credito && P.tentativi >= 3;
      await run(env, 'UPDATE post_lavori SET stato=?, errore=?, tentativi=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso',
        credito ? 'Credito Claude esaurito: riparto da solo quando lo ricarichi' : msg, credito ? 0 : P.tentativi, stop ? null : new Date(Date.now() + (credito ? 10 : 3) * 60e3).toISOString(), ora(), P.id);
      await log(env, null, AGENTE_FASE[P.fase] || 'caroselli', credito ? '⏸️ credito Claude esaurito: riparto quando lo ricarichi' : `${stop ? '❌' : '⚠️'} post #${P.id} (${P.fase}): ${msg}`, stop || credito ? 'errore' : 'warn');
    }
  }
}

// ------------------------------------------------------------------ API
const IMG_OK = /(^|\.)(cdninstagram\.com|fbcdn\.net|tiktokcdn\.com|tiktokcdn-us\.com|ibyteimg\.com|muscdn\.com)$/;
export async function apiPost(req, env, p, m, json) {
  await schemaPost(env);
  const corpo = () => req.json().catch(() => ({}));
  if (p === '/api/post' && m === 'GET') return json(await all(env, "SELECT p.id, p.cliente, p.tipo, p.numero, p.fase, p.stato, p.errore, p.creato, p.aggiornato, json_extract(p.contenuti, '$.post[0].titolo') AS titolo, (SELECT COUNT(*) FROM json_each(p.contenuti, '$.post') WHERE json_extract(value, '$.stato')='approvato' AND json_extract(value, '$.finale') IS NULL) AS da_finale, (SELECT COUNT(*) FROM json_each(p.contenuti, '$.post') WHERE json_extract(value, '$.finale')='approvato') AS approvati FROM post_lavori p ORDER BY p.id DESC LIMIT 60"));
  if (p === '/api/post' && m === 'POST') {
    const d = await corpo();
    if (d.profilo) { d.cliente = 'Johnny · profilo Instagram'; d.cliente_id = Number((await configurazione(env)).IG_CLIENTE_ID) || null; } // il profilo personale di Johnny
    if (!d.cliente_id && String(d.cliente || '').trim().length < 2) return json({ errore: 'scegli o scrivi il cliente' }, 400);
    if (String(d.brief || '').trim().length < 10) return json({ errore: 'scrivi di cosa devono parlare (almeno una frase)' }, 400);
    if (d.pcloud && /^https?:/.test(d.pcloud) && !/code=/.test(d.pcloud)) return json({ errore: 'il link pCloud deve essere il link pubblico della cartella (contiene "code=")' }, 400);
    return json({ id: await nuovoLavoroPost(env, d) });
  }
  // anteprime delle immagini dei post virali (Instagram e TikTok non si lasciano incorporare da altri siti)
  if (p === '/api/post/img' && m === 'GET') {
    const u = new URL(req.url).searchParams.get('u') || '';
    let h; try { h = new URL(u); } catch { return json({ errore: 'indirizzo non valido' }, 400); }
    if (h.protocol !== 'https:' || !IMG_OK.test(h.hostname)) return json({ errore: 'sorgente non ammessa' }, 400);
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok || !/image/.test(r.headers.get('content-type') || '')) return json({ errore: 'immagine non disponibile' }, 404);
    return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type'), 'cache-control': 'private, max-age=86400' } });
  }
  const sl = p.match(/^\/api\/post\/(\d+)\/slide\/(\d+)-(\d+)\.png$/);
  if (sl && m === 'GET') {
    const { value, metadata } = await env.VIDEO.getWithMetadata(`post-${sl[1]}/${sl[2]}-${sl[3]}.png`, { type: 'arrayBuffer' });
    if (!value) return json({ errore: 'non pronta' }, 404);
    const h = { 'content-type': metadata?.tipo || 'image/png', 'cache-control': 'private, max-age=3600' };
    if (new URL(req.url).searchParams.get('scarica')) h['content-disposition'] = `attachment; filename="post${sl[1]}-${sl[2]}-slide${sl[3]}.png"`;
    return new Response(value, { headers: h });
  }
  const mm = p.match(/^\/api\/post\/(\d+)(?:\/(approva|riprova|canva|pubblica|finale))?$/);
  if (!mm) return null;
  const P = await one(env, 'SELECT * FROM post_lavori WHERE id=?', mm[1]);
  if (!P) return json({ errore: 'non trovato' }, 404);
  if (m === 'GET' && !mm[2]) {
    const file = Object.keys(J(P.slide_file, {}) || {});
    const cfg = await configurazione(env);
    const Ct = J(P.contenuti);
    if (Ct?.post?.some((x) => x.ig_id)) try { const coda = await instagram(env, 'GET', '/coda'); for (const x of Ct.post) { const q = coda.find((c) => c.id === x.ig_id); if (q) Object.assign(x, { ig_stato: q.stato, ig_link: q.permalink || null, ig_errore: q.errore || null }); } } catch (_) {}
    const tipi = {}; for (const k of file) { const v = await env.VIDEO.getWithMetadata(k, { type: 'stream' }); tipi[k] = v.metadata?.tipo || ''; v.value?.cancel?.(); }
    return json({ ...P, esempi: J(P.esempi, []), virali: J(P.virali), studio: J(P.studio), foto: J(P.foto), contenuti: Ct, canva: J(P.canva), slide_file: file, slide_tipi: tipi, fasi: FASI_POST,
      instagram: { collegato: !!(env.IG && env.IG_INTERNO_KEY), suo_profilo: String(P.cliente_id || '') === String(cfg.IG_CLIENTE_ID) || !!(P.cliente_id && (await cliente(env, P.cliente_id))?.ig_user_id) } });
  }
  if (m === 'POST' && mm[2] === 'approva') { // {n:[approvati], modifiche:{n: {slide:[...], caption}}}
    const d = await corpo();
    const ok = new Set((d.n || []).map(Number));
    const Ct = J(P.contenuti, {});
    Ct.post = (Ct.post || []).map((x) => { const mod = d.modifiche?.[x.n] || {}; return { ...x, slide: Array.isArray(mod.slide) ? mod.slide : x.slide, caption: typeof mod.caption === 'string' ? mod.caption.slice(0, 2200) : x.caption, stato: ok.has(x.n) ? 'approvato' : 'scartato' }; });
    if (!Ct.post.some((x) => x.stato === 'approvato')) return json({ errore: 'approva almeno un post' }, 400);
    for (const k of Object.keys(J(P.slide_file, {}) || {})) await env.VIDEO.delete(k);
    await run(env, "UPDATE post_lavori SET contenuti=?, canva=NULL, slide_file=NULL, fase='impagina', stato='in_corso', blocco_fino=NULL, tentativi=0, aggiornato=? WHERE id=?", JSON.stringify(Ct), ora(), P.id);
    await log(env, null, 'caroselli', `🎨 post #${P.id}: ${ok.size} approvati da Johnny, li impagino`);
    return json({ ok: true });
  }
  // APPROVAZIONE FINALE: Johnny guarda le slide impaginate e, post per post, approva, scarta o chiede modifiche
  if (m === 'POST' && mm[2] === 'finale') { // {n, azione: approva|scarta|rifai, nota}
    const d = await corpo();
    const Ct = J(P.contenuti, {});
    const x = (Ct.post || []).find((y) => Number(y.n) === Number(d.n));
    if (!x) return json({ errore: 'post non trovato' }, 404);
    if (d.azione === 'approva') { x.finale = 'approvato'; x.approvato_il = ora(); }
    else if (d.azione === 'scarta') x.finale = 'scartato';
    else if (d.azione === 'rifai') {
      const nota = String(d.nota || '').trim().slice(0, 1500);
      if (nota.length < 3) return json({ errore: 'scrivi cosa cambiare' }, 400);
      const cfg = chi(await configurazione(env), { area: 'post', agente: 'caroselli', cliente_id: P.cliente_id });
      const { nota_chiara, finale, approvato_il, ...pulito } = x;
      const out = await S.claude(cfg, `Sei il copy dei caroselli di AGENZIA MOMENTO AI. Johnny ha visto il post impaginato e chiede modifiche: applicale ESATTAMENTE, il resto resta com'è. Stesso formato JSON del post (stessi campi, stessi nomi dei modelli di slide: ${Object.keys(MODELLI).join(', ')}). Solo fatti veri già presenti nel post o detti da Johnny.`,
        `POST ATTUALE: ${JSON.stringify(pulito).slice(0, 9000)}\n\nMODIFICHE DI JOHNNY: ${nota}\n\nRispondi SOLO JSON: {"post": {il post riscritto}}`, { maxTokens: 6000 });
      if (!out.post?.slide?.length) return json({ errore: 'non sono riuscito a riscriverlo: riprova' }, 500);
      Object.assign(x, out.post, { n: x.n, stato: 'approvato', nota_johnny: nota }); delete x.finale;
      for (const k of Object.keys(J(P.slide_file, {}) || {})) await env.VIDEO.delete(k);
      await run(env, "UPDATE post_lavori SET contenuti=?, canva=NULL, slide_file=NULL, fase='impagina', stato='in_corso', errore=NULL, blocco_fino=NULL, tentativi=0, aggiornato=? WHERE id=?", JSON.stringify(Ct), ora(), P.id);
      await log(env, null, 'caroselli', `✏️ post #${P.id}.${x.n}: riscritto con le modifiche di Johnny, lo reimpagino`);
      return json({ ok: true, rifatto: true });
    } else return json({ errore: 'azione non valida' }, 400);
    await run(env, 'UPDATE post_lavori SET contenuti=?, aggiornato=? WHERE id=?', JSON.stringify(Ct), ora(), P.id);
    await log(env, null, 'caroselli', `${x.finale === 'approvato' ? '✅' : '🗑'} post #${P.id}.${x.n} ${x.finale} da Johnny`);
    return json({ ok: true });
  }
  if (m === 'POST' && mm[2] === 'canva') { // {post:[{n, design_id, link, png:[url…]}]} le slide fatte su Canva
    const d = await corpo();
    const post = (d.post || []).map((x) => ({ n: Number(x.n), design_id: String(x.design_id || ''), link: /^https:\/\//.test(x.link || '') ? x.link : null, png: (x.png || []).filter((u) => /^https:\/\//.test(u)).slice(0, 20) })).filter((x) => x.png.length);
    if (!post.length) return json({ errore: 'servono le immagini esportate da Canva' }, 400);
    // nuova esportazione (es. rifatta in JPG): le slide vecchie si buttano, altrimenti resterebbero quelle
    for (const k of Object.keys(J(P.slide_file, {}) || {})) await env.VIDEO.delete(k);
    await run(env, "UPDATE post_lavori SET canva=?, slide_file=NULL, fase='scarica', stato='in_corso', blocco_fino=NULL, tentativi=0, aggiornato=? WHERE id=?", JSON.stringify({ post, quando: ora() }), ora(), P.id);
    return json({ ok: true });
  }
  if (m === 'POST' && mm[2] === 'pubblica') { // {n:[numeri], quando:{n: ISO}} → in coda sul profilo Instagram collegato (solo dopo l'ok di Johnny)
    const cfg = await configurazione(env);
    const Cig = P.cliente_id ? await cliente(env, P.cliente_id) : null;
    const mioProfilo = String(P.cliente_id || '') === String(cfg.IG_CLIENTE_ID);
    if (!mioProfilo && !Cig?.ig_user_id) return json({ errore: 'per questo cliente non c\'è un account Instagram collegato: collegalo dalla sua scheda cliente' }, 400);
    const igConto = mioProfilo ? {} : { ig_user_id: Cig.ig_user_id }; // il tuo profilo è quello predefinito del modulo
    const d = await corpo();
    const Ct = J(P.contenuti, {}), file = J(P.slide_file, {}) || {}, cv = J(P.canva, {});
    const origine = new URL(req.url).origin, fatti = [];
    for (const x of (Ct.post || []).filter((y) => (d.n || []).map(Number).includes(y.n))) {
      if (x.finale !== 'approvato') { fatti.push({ n: x.n, errore: 'prima va approvato il contenuto finito' }); continue; }
      if (x.ig_id && !d.di_nuovo) { fatti.push({ n: x.n, errore: 'già programmato' }); continue; }
      const nSlide = ((cv.post || []).find((c) => c.n === x.n)?.png || []).length;
      const chiavi = Array.from({ length: nSlide }, (_, k) => `${x.n}-${k + 1}`).filter((k) => file[`post-${P.id}/${k}.png`]);
      if (!chiavi.length) { fatti.push({ n: x.n, errore: 'slide non ancora pronte' }); continue; }
      const tipi = await Promise.all(chiavi.map(async (k) => (await env.VIDEO.getWithMetadata(`post-${P.id}/${k}.png`, { type: 'stream' })).metadata?.tipo || ''));
      if (tipi.some((t) => !/jpe?g/i.test(t))) { fatti.push({ n: x.n, errore: 'Instagram accetta solo JPG: riesporta le slide da Canva in JPG' }); continue; }
      const link = await Promise.all(chiavi.slice(0, 10).map(async (k) => `${origine}/pubblico/post/${P.id}/${k}.jpg?f=${await firmaPubblica(env, 'post' + P.id, k)}`));
      const quando = d.subito ? new Date().toISOString() : d.quando?.[x.n] && !isNaN(new Date(d.quando[x.n])) ? new Date(d.quando[x.n]).toISOString() : new Date(Date.now() + 3600e3).toISOString();
      const caption = [x.caption || '', (x.hashtag || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
      try {
        const it = await instagram(env, 'POST', '/coda', link.length > 1 ? { type: 'carousel', media_urls: link, caption, publish_at: quando, ...igConto } : { type: 'image', media_url: link[0], caption, publish_at: quando, ...igConto });
        Object.assign(x, { ig_id: it.id, ig_quando: it.publish_at }); fatti.push({ n: x.n, quando: it.publish_at });
      } catch (e) { fatti.push({ n: x.n, errore: String(e.message || e) }); }
    }
    await run(env, 'UPDATE post_lavori SET contenuti=?, aggiornato=? WHERE id=?', JSON.stringify(Ct), ora(), P.id);
    const ok = fatti.filter((f) => f.quando);
    if (ok.length) await log(env, null, 'social', `📲 ${ok.length} ${ok.length === 1 ? 'carosello programmato' : 'caroselli programmati'} su Instagram: ${ok.map((f) => `#${f.n} ${f.quando.slice(0, 16).replace('T', ' ')}`).join(', ')}`);
    return json({ ok: ok.length > 0, fatti });
  }
  if (m === 'POST' && mm[2] === 'riprova') { await run(env, "UPDATE post_lavori SET stato='in_corso', fase=CASE WHEN fase IN ('canva','fatto') AND contenuti IS NOT NULL THEN 'impagina' ELSE fase END, canva=CASE WHEN fase IN ('canva','fatto','impagina') THEN NULL ELSE canva END, errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", ora(), P.id); return json({ ok: true }); }
  if (m === 'DELETE') {
    for (const k of Object.keys(J(P.slide_file, {}) || {})) await env.VIDEO.delete(k);
    await run(env, 'DELETE FROM post_lavori WHERE id=?', P.id); return json({ ok: true });
  }
  return null;
}
