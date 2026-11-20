// REEL CON L'AVATAR DI JOHNNY (profilo Instagram personale).
// Johnny dà l'argomento, poi gli agenti lavorano in fila:
//  1. Sofia (Ricerca) si documenta sul web: fatti verificati con le fonti, numeri, errori comuni, domande della gente.
//  2. Zoe (Trend) cerca i video simili e quelli virali sull'argomento (YouTube, TikTok, Instagram), ne guarda i migliori
//     e ricava ganci, strutture e angoli che funzionano.
//  3. Nora scrive i copioni GANCIO → PROBLEMA → TENSIONE → SOLUZIONE → CTA, con i cartelli. Johnny li approva.
//  4. Ava genera i video con l'avatar HeyGen (serve la chiave API; senza chiave li genera Claude dalla chat).
//  5. Il comparto Reel li monta con lo stile "Talking head educativo con grafiche".
import { all, one, run, J, ora, configurazione, log } from './db.js';
import * as S from './servizi.js';
import { SKILL } from './skill_testi.js';
import { MANUALE_COPIONI } from './manuali.js';
import { registra, daUsage, chi } from './consumi.js';

const BLOCCO_MIN = 12;

// ------------------------------------------------------------------ Instagram (worker momento-instagram, collegato come service binding IG)
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export async function firmaPubblica(env, id, file) { // link che Meta può scaricare: firmato con la chiave interna, mai indovinabile
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.IG_INTERNO_KEY || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`ig|${id}|${file}`))).slice(0, 40);
}
async function linkPubblico(env, origine, id, file) { return `${origine}/pubblico/${id}/${file}?f=${await firmaPubblica(env, id, file)}`; }
export async function instagram(env, metodo, percorso, corpo) {
  if (!env.IG || !env.IG_INTERNO_KEY) throw new Error('modulo Instagram non collegato');
  const r = await env.IG.fetch(`https://momento-instagram${percorso}`, { method: metodo, headers: { 'x-admin-key': env.IG_INTERNO_KEY, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.errore || `Instagram HTTP ${r.status}`);
  return d;
}
// prossimi orari buoni per il profilo (ora di Roma): 13:00 e 19:00, uno al giorno a partire da domani
function orariPubblicazione(quanti, da = new Date()) {
  const out = [], giorno = new Date(da); giorno.setUTCDate(giorno.getUTCDate() + 1);
  for (let i = 0; i < quanti; i++) {
    const d = new Date(giorno); d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10), h = i % 2 ? 13 : 19;
    // ora di Roma esatta (ora legale compresa): calcolo lo scarto del fuso a quella data
    const prova = new Date(`${iso}T${String(h).padStart(2, '0')}:00:00Z`);
    const roma = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(prova));
    out.push(new Date(prova.getTime() - ((roma - h + 24) % 24) * 3600e3).toISOString());
  }
  return out;
}

// frase di Johnny alla Direttrice → "è per il mio profilo personale?" → numero di reel e argomento
export function richiestaProfilo(testo) {
  const t = String(testo || '');
  if (!/(mio\s+profilo|profilo\s+(personale|ig|instagram)|mio\s+(ig|instagram)|mia\s+pagina\s+(ig|instagram)|per\s+me\s+su\s+(ig|instagram))/i.test(t)) return null;
  const nm = t.match(/(\d+)\s*(reel|video|contenut|carosell|post|grafich)/i) || t.match(/\b(uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(reel|video|contenut|carosell|post|grafich)/i);
  const parole = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 };
  const numero = Math.min(10, Math.max(1, nm ? Number(nm[1]) || parole[nm[1].toLowerCase()] : 5));
  const am = t.match(/\b(?:(?:su|sul|sullo|sulla|sui|sugli|sulle|riguardo(?:\s+a(?:l|lla|gli|i)?)?|argomento:?|tema:?|parlando\s+di|che\s+parlano\s+di)\s+|sull['’]\s*)(.{2,})/i);
  const argomento = am && (am[1].replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim().slice(0, 300));
  return { numero, argomento: argomento || null };
}

export async function schemaAvatar(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS avatar_piani (id INTEGER PRIMARY KEY AUTOINCREMENT, argomento TEXT NOT NULL, numero INTEGER DEFAULT 5,
    note TEXT, fase TEXT NOT NULL DEFAULT 'ricerca', stato TEXT NOT NULL DEFAULT 'in_corso', ricerca TEXT, virali TEXT, copioni TEXT, video TEXT, lavori TEXT,
    errore TEXT, tentativi INTEGER DEFAULT 0, blocco_fino TEXT, riunione_id INTEGER, creato TEXT, aggiornato TEXT)`).run();
  for (const c of ['idee TEXT', 'idea_scelta INTEGER', 'cartella TEXT']) await env.DB.prepare('ALTER TABLE avatar_piani ADD COLUMN ' + c).run().catch(() => {});
}

export async function nuovoPianoAvatar(env, argomento, numero = 1, note = '', riunione = null) {
  await schemaAvatar(env);
  const r = await one(env, 'INSERT INTO avatar_piani (argomento, numero, note, riunione_id, creato, aggiornato) VALUES (?,?,?,?,?,?) RETURNING id',
    String(argomento).slice(0, 300), Math.min(10, Math.max(1, Number(numero) || 5)), String(note || '').slice(0, 2000), riunione, ora(), ora());
  await log(env, null, 'ricerca', `🔎 nuovo argomento per il profilo di Johnny: "${String(argomento).slice(0, 80)}" (${numero} reel): mi documento`);
  return r.id;
}

// ------------------------------------------------------------------ 1. ricerca sul web
async function claudeWeb(cfg, sistema, domanda, maxUses = 8) {
  const r = await S.richiesta('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.CLAUDE_MODEL, max_tokens: 12000, system: sistema, tools: [{ type: cfg.WEB_SEARCH_TOOL, name: 'web_search', max_uses: maxUses }], messages: [{ role: 'user', content: domanda }] }),
  });
  if (r.status !== 200) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  await registra(cfg, 'claude', cfg.CLAUDE_MODEL, daUsage(d.usage));
  const fonti = new Map();
  for (const b of d.content || []) if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach((x) => x.url && fonti.set(x.url, x.title || ''));
  const testo = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''); // con le citazioni il testo arriva spezzato in più blocchi, anche a metà di una stringa
  return { out: S.estraiJson(testo), fonti };
}

async function faseRicerca(env, cfg, A) {
  const { out, fonti } = await claudeWeb(cfg, `Sei Sofia, ricercatrice di AGENZIA MOMENTO AI. Ti documenti su un argomento per i reel del profilo Instagram di Johnny (video in cui parla il suo avatar).
Cerca sul web fonti affidabili e recenti (in italiano e in inglese). Usa SOLO quello che trovi: niente numeri o fatti inventati; se un dato non è verificabile non metterlo.

===== SKILL: content-research-and-sourcing =====
${(SKILL['content-research-and-sourcing'] || '').slice(0, 6000)}`,
  `ARGOMENTO: ${A.argomento}${A.note ? '\nINDICAZIONI DI JOHNNY: ' + A.note : ''}
OGGI: ${new Date().toISOString().slice(0, 10)}

Rispondi SOLO JSON:
{"sintesi": "5-8 frasi: cosa bisogna sapere",
 "fatti": [{"fatto": "...", "fonte": "url"}],
 "numeri": [{"dato": "...", "fonte": "url"}],
 "errori_comuni": ["cosa sbaglia la gente su questo argomento"],
 "domande_della_gente": ["domande vere che la gente si fa"],
 "miti": ["convinzioni sbagliate da smontare"],
 "angoli": ["5-10 angoli diversi per un reel, ognuno con un problema concreto e la sua soluzione"]}`);
  const valide = (x) => (x || []).filter((f) => !f.fonte || fonti.has(f.fonte) || [...fonti.keys()].some((u) => u.startsWith(String(f.fonte).slice(0, 40))));
  const ricerca = { ...out, fatti: valide(out.fatti), numeri: valide(out.numeri), fonti: [...fonti].slice(0, 25).map(([url, titolo]) => ({ url, titolo })) };
  await run(env, "UPDATE avatar_piani SET ricerca=?, fase='virali', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(ricerca), ora(), A.id);
  await log(env, null, 'ricerca', `📚 "${A.argomento.slice(0, 60)}": ${ricerca.fatti.length} fatti verificati, ${ricerca.fonti.length} fonti, ${(ricerca.angoli || []).length} angoli. Passo a Zoe i video virali`);
}

// ------------------------------------------------------------------ 2. video simili e virali
async function faseVirali(env, cfg, A) {
  const ric = J(A.ricerca, {});
  const q = await S.claude({ ...cfg, CLAUDE_MODEL: cfg.CLAUDE_MODEL_LIGHT }, 'Prepari le ricerche per trovare i reel più virali su un argomento.',
    `ARGOMENTO: ${A.argomento}\nRispondi SOLO JSON: {"youtube": ["2 ricerche brevi, una in italiano e una in inglese"], "tiktok": ["2 ricerche brevi"], "hashtag": ["3 hashtag instagram senza #"]}`, { maxTokens: 600 });
  const esiti = await Promise.allSettled([S.youtube(cfg, (q.youtube || [A.argomento]).slice(0, 2), 10), S.tiktok(cfg, (q.tiktok || []).slice(0, 2), [], 8), S.instagram(cfg, (q.hashtag || []).slice(0, 3), 8)]);
  const lista = [];
  for (const e of esiti) if (e.status === 'fulfilled') lista.push(...(Array.isArray(e.value) ? e.value : e.value.video || []));
  const visti = new Set();
  const top = lista.filter((v) => v && !visti.has(v.url) && visti.add(v.url)).map((v) => ({ ...v, punteggio: S.punteggio(v) })).sort((a, b) => b.punteggio - a.punteggio).slice(0, 15);
  await log(env, null, 'trend', `🔥 "${A.argomento.slice(0, 60)}": ${lista.length} video trovati, guardo i più virali`);
  // guardo davvero i 3 più forti (Gemini): gancio parola per parola, struttura, perché funziona
  const guardati = [];
  for (const v of top.filter((x) => x.piattaforma === 'youtube').slice(0, 3)) {
    try {
      const g = await S.guardaYoutube(cfg, v.url, `Analizza questo reel come un esperto di contenuti virali. Rispondi SOLO JSON:
{"gancio_testuale": "le prime parole dette o scritte, parola per parola", "struttura": "come è costruito secondo per secondo, in breve", "tensione": "come tiene lo spettatore fino alla fine", "soluzione": "cosa rivela alla fine", "perche_funziona": "...", "durata_sec": n}`, 1);
      guardati.push({ url: v.url, titolo: v.titolo, views: v.views, ...g });
    } catch (e) { await log(env, null, 'trend', `non riesco a guardare ${v.url}: ${String(e.message).slice(0, 120)}`, 'warn'); }
  }
  const sintesi = await S.claude(cfg, `Sei Zoe, Trend e idee di AGENZIA MOMENTO AI. Ricavi dai video virali cosa funziona su un argomento, senza copiare.

===== SKILL: viral-reverse-engineering =====
${(SKILL['viral-reverse-engineering'] || '').slice(0, 6000)}`,
  `ARGOMENTO: ${A.argomento}
VIDEO PIÙ VIRALI (titolo, visualizzazioni, piattaforma): ${JSON.stringify(top.map((v) => ({ p: v.piattaforma, titolo: (v.titolo || '').slice(0, 120), views: v.views, url: v.url })))}
VIDEO GUARDATI DAVVERO: ${JSON.stringify(guardati)}
DALLA RICERCA DI SOFIA: angoli ${JSON.stringify(ric.angoli || [])}; errori comuni ${JSON.stringify(ric.errori_comuni || [])}

Rispondi SOLO JSON: {"ganci_che_funzionano": ["schemi di gancio (non copiati)"], "strutture": ["..."], "angoli_scoperti": ["angoli che nessuno ha ancora fatto bene"], "durata_ideale_sec": n, "da_evitare": ["..."], "nota": "2 frasi per Nora"}`, { maxTokens: 4000 });
  const virali = { video: top.map((v) => ({ piattaforma: v.piattaforma, url: v.url, titolo: v.titolo, views: v.views })), guardati, ...sintesi };
  await run(env, "UPDATE avatar_piani SET virali=?, fase='copioni', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(virali), ora(), A.id);
  await log(env, null, 'trend', `🧠 "${A.argomento.slice(0, 60)}": ${(sintesi.ganci_che_funzionano || []).length} schemi di gancio, ${(sintesi.angoli_scoperti || []).length} angoli scoperti. Tocca a Nora`);
}

// ------------------------------------------------------------------ 3. copioni
const FORMATO_COPIONE = `{"titolo": "...", "angolo": "...", "testo": "tutto il testo detto dall'avatar, 120-180 parole",
  "gancio": "la prima frase", "soluzione": "la rivelazione finale in una frase",
  "cartelli": [{"testo": "1-4 parole", "sulla_parola": "parola detta su cui entra", "stile": "fascia|barrato", "colore": "blu|rosa"}],
  "caption": "caption Instagram con gancio e CTA", "hashtag": ["5 hashtag"], "fonti": ["url usati"]}`;
const contesto = (A) => `ARGOMENTO: ${A.argomento}${A.note ? '\nINDICAZIONI DI JOHNNY: ' + A.note : ''}
RICERCA DI SOFIA (usa SOLO questi fatti e numeri): ${JSON.stringify(J(A.ricerca, {})).slice(0, 12000)}
COSA FUNZIONA NEI VIRALI (Zoe): ${JSON.stringify({ ...J(A.virali, {}), video: undefined, guardati: undefined }).slice(0, 6000)}`;

// Una sola ricerca (Sofia + Zoe) vale per 10 reel: Nora propone 10 idee, sceglie le migliori e scrive il copione solo di
// quelle; le altre restano in riserva e diventano copioni quando Johnny le sceglie, senza rifare la ricerca.
async function faseCopioni(env, cfg, A) {
  const sistema = `Sei Nora, Idee e copioni di AGENZIA MOMENTO AI. Scrivi i testi che dirà l'AVATAR di Johnny nei reel del suo profilo Instagram.
${MANUALE_COPIONI}`;
  const idee = J(A.idee, null);
  const copioni = J(A.copioni, []) || [];
  if (idee && A.idea_scelta != null) { // copione da un'idea in riserva
    const I = idee[A.idea_scelta];
    if (!I) throw new Error('idea non trovata');
    const out = await S.claude(cfg, sistema, `${contesto(A)}

IDEA SCELTA DA JOHNNY: ${JSON.stringify(I)}
GIÀ FATTI (non ripeterli): ${copioni.map((c) => c.titolo).join(' · ')}
Scrivi il copione di QUESTA idea, formato AVATAR: GANCIO → PROBLEMA → TENSIONE (2-3 anelli aperti) → SOLUZIONE solo alla fine → CTA.
Rispondi SOLO JSON: ${FORMATO_COPIONE}`, { maxTokens: 4000 });
    const n = Math.max(0, ...copioni.map((c) => c.n)) + 1;
    copioni.push({ n, ...out, idea: A.idea_scelta, parole: String(out.testo || '').split(/\s+/).filter(Boolean).length, stato: 'da_approvare' });
    idee[A.idea_scelta].usata = n;
    await run(env, "UPDATE avatar_piani SET copioni=?, idee=?, idea_scelta=NULL, fase='approvazione', stato='da_approvare', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(copioni), JSON.stringify(idee), ora(), A.id);
    await log(env, null, 'idee', `✍️ copione "${out.titolo}" scritto dall'idea in riserva (senza nuova ricerca): aspetta la tua approvazione`);
    return;
  }
  const quanti = Math.min(A.numero || 1, 10);
  const out = await S.claude(cfg, sistema, `${contesto(A)}

1) Proponi 10 IDEE di reel DIVERSE (angoli diversi) su questo argomento, dalla migliore alla peggiore, con un voto 1-10 su quanto può diventare virale per il profilo di Johnny.
2) Scegli le ${quanti} migliori e scrivi SOLO per quelle il copione completo, formato AVATAR: GANCIO → PROBLEMA → TENSIONE (2-3 anelli aperti) → SOLUZIONE solo alla fine → CTA.
Rispondi SOLO JSON:
{"idee": [{"titolo": "...", "angolo": "...", "gancio": "la prima frase", "soluzione": "...", "voto": n, "perche": "1 frase"}],
 "scelte": [indici (da 0) delle idee scritte],
 "copioni": [${FORMATO_COPIONE}]}`, { maxTokens: 6000 + quanti * 2200 });
  const lista = (out.idee || []).slice(0, 10);
  const scelte = (out.scelte || []).map(Number);
  const nuovi = (out.copioni || []).slice(0, quanti).map((c, k) => ({ n: k + 1, ...c, idea: scelte[k] ?? null, parole: String(c.testo || '').split(/\s+/).filter(Boolean).length, stato: 'da_approvare' }));
  if (!nuovi.length) throw new Error('Nora non ha prodotto copioni');
  nuovi.forEach((c) => { if (c.idea != null && lista[c.idea]) lista[c.idea].usata = c.n; });
  await run(env, "UPDATE avatar_piani SET copioni=?, idee=?, fase='approvazione', stato='da_approvare', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(nuovi), JSON.stringify(lista), ora(), A.id);
  await log(env, null, 'idee', `💡 10 idee su "${A.argomento.slice(0, 60)}": Nora ha scelto le ${nuovi.length} migliori e ne ha scritto il copione, le altre ${lista.length - nuovi.length} restano in riserva`);
}

// ------------------------------------------------------------------ 4. avatar HeyGen
async function heygen(cfg, metodo, percorso, corpo) {
  const r = await S.richiesta('https://api.heygen.com' + percorso, { method: metodo, headers: { 'x-api-key': cfg.HEYGEN_API_KEY, 'content-type': 'application/json', accept: 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }, 2);
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = {}; }
  if (r.status >= 300 || d.error) throw new Error(`HeyGen ${r.status}: ${JSON.stringify(d.error || t).slice(0, 300)}`);
  return d.data || d;
}

async function faseAvatar(env, cfg, A) {
  const video = J(A.video, []) || [];
  const copioni = J(A.copioni, []).filter((c) => c.stato === 'approvato');
  if (!cfg.HEYGEN_API_KEY) {
    if (A.stato !== 'attende_avatar') {
      await run(env, "UPDATE avatar_piani SET stato='attende_avatar', blocco_fino=NULL, aggiornato=? WHERE id=?", ora(), A.id);
      await log(env, null, 'avatar', `🎭 ${copioni.length} copioni approvati: per generarli da sola mi serve la chiave HeyGen (Impostazioni). Intanto puoi chiederlo a Claude in chat`, 'warn');
    }
    return;
  }
  let cambiato = false;
  for (const c of copioni) {
    let v = video.find((x) => x.n === c.n);
    if (!v) {
      const d = await heygen(cfg, 'POST', '/v2/video/generate', {
        title: `IG Johnny · ${c.titolo}`.slice(0, 90), dimension: { width: 720, height: 1280 },
        video_inputs: [{ character: { type: 'avatar', avatar_id: cfg.HEYGEN_AVATAR, avatar_style: 'normal' }, voice: { type: 'text', input_text: c.testo, voice_id: cfg.HEYGEN_VOCE } }],
      });
      v = { n: c.n, video_id: d.video_id, stato: 'in_corso' };
      video.push(v); cambiato = true;
      await log(env, null, 'avatar', `🎭 genero il reel ${c.n} "${c.titolo}" con il tuo avatar`);
    } else if (v.stato === 'in_corso' && v.video_id) {
      const d = await heygen(cfg, 'GET', '/v1/video_status.get?video_id=' + encodeURIComponent(v.video_id));
      if (d.status === 'completed' && d.video_url) { Object.assign(v, { stato: 'fatto', url: d.video_url, durata: d.duration || null }); cambiato = true; await registra(cfg, 'heygen', 'avatar', { secondi: d.duration || 0 }, ((d.duration || 0) / 60) * (Number(cfg.HEYGEN_DOLLARI_MINUTO) || 1)); await log(env, null, 'avatar', `✅ reel ${c.n} generato (${Math.round(d.duration || 0)} s)`); }
      if (d.status === 'failed') { Object.assign(v, { stato: 'errore', errore: JSON.stringify(d.error || '').slice(0, 200) }); cambiato = true; await log(env, null, 'avatar', `❌ reel ${c.n}: ${v.errore}`, 'errore'); }
    }
  }
  const tutti = copioni.every((c) => video.some((x) => x.n === c.n && x.stato !== 'in_corso'));
  await run(env, 'UPDATE avatar_piani SET video=?, fase=?, stato=?, blocco_fino=?, aggiornato=? WHERE id=?', JSON.stringify(video), tutti ? 'montaggio' : 'avatar', 'in_corso',
    tutti ? null : new Date(Date.now() + 60e3).toISOString(), ora(), A.id);
  return cambiato;
}

// ------------------------------------------------------------------ 5. montaggio nel comparto Reel
async function faseMontaggio(env, cfg, A) {
  const copioni = J(A.copioni, []), video = (J(A.video, []) || []).filter((v) => v.stato === 'fatto' && v.url), lavori = J(A.lavori, []) || [];
  for (const v of video) {
    if (lavori.some((l) => l.n === v.n)) continue;
    const c = copioni.find((x) => x.n === v.n) || {};
    // si alternano i due stili dei reel di riferimento di Johnny (contando tutti i reel avatar già fatti)
    const fatti = (await one(env, `SELECT count(*) AS n FROM lavori WHERE stile LIKE '%"avatar":true%'`))?.n || 0;
    const formato = fatti % 2 ? 'split_grafico' : 'parole_dietro';
    const prompt = `Cliente: Johnny · profilo Instagram. Reel con l'avatar di Johnny. ${formato === 'parole_dietro'
      ? 'Formato parole_dietro (come i reel di riferimento di Johnny: lui a tutto schermo, le frasi diventano parole GIGANTI e colorate dietro di lui, adesivi che esplodono, schede di vetro ai lati, capitoli col numero enorme)'
      : 'Formato split_grafico (sopra le grafiche animate che seguono il discorso, al centro la pillola dei sottotitoli, sotto Johnny)'}, palette e font scelti in base all'argomento, effetti da super montatore, nessuna pausa.
Argomento del piano (per la palette): ${A.argomento}
Titolo: ${c.titolo}. Gancio: ${c.gancio}. Soluzione finale: ${c.soluzione}.
Testo detto: ${c.testo}${A.cartella ? '\nJohnny ha caricato su pCloud delle clip SUE da usare (b-roll, foto, schermate): usale nei punti giusti del discorso, il parlato resta quello dell\'avatar.' : ''}
Idee per le grafiche (concetto → parola su cui entra): ${(c.cartelli || []).map((k) => `${k.testo} → ${k.sulla_parola}`).join('; ')}`;
    const r = await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, stile, creato, aggiornato) VALUES (?,?,'[]','url',?,?,?) RETURNING id",
      prompt, JSON.stringify([{ nome: `avatar_${A.id}_${v.n}.mp4`, url: v.url, durata: v.durata }, ...(A.cartella ? [{ cartella: A.cartella }] : [])]), JSON.stringify({ genere: formato === 'parole_dietro' ? 'dietro' : 'split', mood: [], avatar: true }), ora(), ora());
    lavori.push({ n: v.n, lavoro: r.id });
    await log(env, r.id, 'regia', `🎬 reel ${v.n} "${c.titolo}" (avatar): parte il montaggio`);
  }
  const persi = (J(A.video, []) || []).filter((v) => v.stato === 'errore');
  if (persi.length) await log(env, null, 'avatar', `⚠️ ${persi.length} video avatar non generati da HeyGen (reel ${persi.map((v) => v.n).join(', ')}): non vanno al montaggio. ${persi[0].errore || ''}`.slice(0, 400), 'warn');
  await run(env, "UPDATE avatar_piani SET lavori=?, fase='fatto', stato=?, errore=?, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(lavori), lavori.length ? 'fatto' : 'errore',
    lavori.length ? null : 'nessun video avatar da montare: HeyGen non li ha generati', ora(), A.id);
}

// ------------------------------------------------------------------ cron
export async function avanzaAvatar(env) {
  await schemaAvatar(env);
  const adesso = ora();
  const L = await all(env, "SELECT * FROM avatar_piani WHERE stato IN ('in_corso','attende_avatar') AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 2", adesso);
  if (!L.length) return;
  const cfg0 = await configurazione(env);
  for (const A0 of L) {
    if (A0.stato === 'attende_avatar' && !cfg0.HEYGEN_API_KEY) continue;
    const cfg = chi(cfg0, { area: 'profilo', piano_id: A0.id, agente: { ricerca: 'ricerca', virali: 'trend', copioni: 'idee', avatar: 'avatar' }[A0.fase] || 'avatar' });
    const A = await one(env, 'UPDATE avatar_piani SET blocco_fino=?, tentativi=tentativi+1 WHERE id=? AND (blocco_fino IS NULL OR blocco_fino < ?) RETURNING *', new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString(), A0.id, adesso);
    if (!A) continue;
    try {
      if (A.fase === 'ricerca') await faseRicerca(env, cfg, A);
      else if (A.fase === 'virali') await faseVirali(env, cfg, A);
      else if (A.fase === 'copioni') await faseCopioni(env, cfg, A);
      else if (A.fase === 'avatar') await faseAvatar(env, cfg, A);
      else if (A.fase === 'montaggio') await faseMontaggio(env, cfg, A);
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 400);
      const credito = /credit balance|billing/i.test(msg);
      const stop = !credito && A.tentativi >= 3;
      await run(env, 'UPDATE avatar_piani SET stato=?, errore=?, tentativi=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : A.stato === 'attende_avatar' ? 'attende_avatar' : 'in_corso',
        credito ? 'Credito Claude esaurito: riparto da solo quando lo ricarichi' : msg, credito ? 0 : A.tentativi, stop ? null : new Date(Date.now() + (credito ? 10 : 3) * 60e3).toISOString(), ora(), A.id);
      const ag = { ricerca: 'ricerca', virali: 'trend', copioni: 'idee', avatar: 'avatar', montaggio: 'regia' }[A.fase] || 'ricerca';
      await log(env, null, ag, credito ? '⏸️ credito Claude esaurito: riparto quando lo ricarichi' : `${stop ? '❌' : '⚠️'} profilo IG #${A.id} (${A.fase}): ${msg}`, stop || credito ? 'errore' : 'warn');
    }
  }
}

// ------------------------------------------------------------------ API
export async function apiAvatar(req, env, p, m, json) {
  await schemaAvatar(env);
  const corpo = () => req.json().catch(() => ({}));
  if (p === '/api/avatar' && m === 'GET') {
    const L = await all(env, 'SELECT id, argomento, numero, fase, stato, errore, creato, aggiornato FROM avatar_piani ORDER BY id DESC LIMIT 40');
    return json(L);
  }
  if (p === '/api/avatar' && m === 'POST') {
    const d = await corpo();
    if (String(d.argomento || '').trim().length < 3) return json({ errore: "scrivi l'argomento" }, 400);
    return json({ id: await nuovoPianoAvatar(env, String(d.argomento).trim(), Number(d.numero) || 1, d.note) });
  }
  if (p === '/api/avatar/instagram' && m === 'GET') { // stato del profilo e coda di pubblicazione
    try { return json({ collegato: true, stato: await instagram(env, 'GET', '/stato'), coda: await instagram(env, 'GET', '/coda') }); }
    catch (e) { return json({ collegato: false, errore: String(e.message || e) }); }
  }
  const mm = p.match(/^\/api\/avatar\/(\d+)(?:\/(approva|video|riprova|pubblica|idea))?$/);
  if (!mm) return null;
  const A = await one(env, 'SELECT * FROM avatar_piani WHERE id=?', mm[1]);
  if (!A) return json({ errore: 'non trovato' }, 404);
  if (m === 'GET' && !mm[2]) {
    const lavori = J(A.lavori, []) || [];
    for (const l of lavori) l.stato = (await one(env, 'SELECT stato FROM lavori WHERE id=?', l.lavoro))?.stato || 'sparito';
    if (lavori.some((l) => l.ig_id)) try { const coda = await instagram(env, 'GET', '/coda'); for (const l of lavori) { const q = coda.find((x) => x.id === l.ig_id); if (q) Object.assign(l, { ig_stato: q.stato, ig_link: q.permalink || null, ig_errore: q.errore || null }); } } catch (_) {}
    return json({ ...A, ricerca: J(A.ricerca), virali: J(A.virali), idee: J(A.idee, []), copioni: J(A.copioni, []), video: J(A.video, []), lavori, orari: orariPubblicazione(lavori.filter((l) => !l.ig_id).length) });
  }
  if (m === 'POST' && mm[2] === 'approva') { // {n: [numeri approvati], modifiche: {n: testo}}
    const d = await corpo();
    const ok = new Set((d.n || []).map(Number));
    const cartella = String(d.cartella || '').trim();
    if (cartella && !/code=/.test(cartella)) return json({ errore: 'il link pCloud deve essere il link pubblico della cartella (contiene "code=")' }, 400);
    if (cartella) await run(env, 'UPDATE avatar_piani SET cartella=? WHERE id=?', cartella.slice(0, 400), A.id);
    const copioni = J(A.copioni, []).map((c) => c.stato !== 'da_approvare' ? c : ({ ...c, testo: d.modifiche?.[c.n] ? String(d.modifiche[c.n]).slice(0, 4000) : c.testo, stato: ok.has(c.n) ? 'approvato' : 'scartato' }));
    if (!copioni.some((c) => c.stato === 'approvato' && ok.has(c.n))) return json({ errore: 'approva almeno un copione' }, 400);
    await run(env, "UPDATE avatar_piani SET copioni=?, fase='avatar', stato='in_corso', blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(copioni), ora(), A.id);
    await log(env, null, 'avatar', `🎭 ${ok.size} copioni approvati da Johnny su "${A.argomento.slice(0, 60)}"`);
    return json({ ok: true });
  }
  if (m === 'POST' && mm[2] === 'video') { // video generati fuori (es. Claude in chat con HeyGen): [{n, url, durata}]
    const d = await corpo();
    const video = J(A.video, []) || [];
    for (const v of d.video || []) if (/^https:\/\//.test(v.url || '')) { const i = video.findIndex((x) => x.n === Number(v.n)); const nv = { n: Number(v.n), url: v.url, durata: Number(v.durata) || null, stato: 'fatto' }; if (i >= 0) video[i] = nv; else video.push(nv); }
    await run(env, "UPDATE avatar_piani SET video=?, fase='montaggio', stato='in_corso', blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(video), ora(), A.id);
    return json({ ok: true });
  }
  if (m === 'POST' && mm[2] === 'pubblica') { // {n:[numeri] | 'tutti', quando:{n: ISO}} → in coda su Instagram, solo dopo l'ok di Johnny
    const d = await corpo();
    const copioni = J(A.copioni, []), lavori = J(A.lavori, []) || [];
    const scelti = lavori.filter((l) => d.n === 'tutti' || (d.n || []).map(Number).includes(l.n)).filter((l) => !l.ig_id);
    if (!scelti.length) return json({ errore: 'nessun reel da programmare' }, 400);
    const origine = new URL(req.url).origin, orari = orariPubblicazione(scelti.length), fatti = [];
    for (const [i, l] of scelti.entries()) {
      const L = await one(env, 'SELECT id, stato FROM lavori WHERE id=?', l.lavoro);
      if (!L || L.stato !== 'pronto') { fatti.push({ n: l.n, errore: 'montaggio non ancora pronto' }); continue; }
      const c = copioni.find((x) => x.n === l.n) || {};
      const caption = [d.caption?.[l.n] || c.caption || c.titolo || '', (c.hashtag || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
      const quando = d.quando?.[l.n] && !isNaN(new Date(d.quando[l.n])) ? new Date(d.quando[l.n]).toISOString() : orari[i];
      try {
        const it = await instagram(env, 'POST', '/coda', { type: 'reel', media_url: await linkPubblico(env, origine, L.id, 'reel.mp4'), cover_url: await linkPubblico(env, origine, L.id, 'copertina.jpg'), caption, ai_generated: true, publish_at: quando });
        Object.assign(l, { ig_id: it.id, ig_quando: it.publish_at });
        fatti.push({ n: l.n, quando: it.publish_at });
      } catch (e) { fatti.push({ n: l.n, errore: String(e.message || e) }); }
    }
    await run(env, 'UPDATE avatar_piani SET lavori=?, aggiornato=? WHERE id=?', JSON.stringify(lavori), ora(), A.id);
    const ok = fatti.filter((f) => f.quando);
    if (ok.length) await log(env, null, 'social', `📲 ${ok.length} reel del profilo programmati su Instagram: ${ok.map((f) => `#${f.n} ${f.quando.slice(0, 16).replace('T', ' ')}`).join(', ')}`);
    return json({ ok: ok.length > 0, fatti });
  }
  if (m === 'POST' && mm[2] === 'idea') { // {i}: copione da un'idea in riserva, senza rifare la ricerca
    const d = await corpo(), idee = J(A.idee, []) || [], i = Number(d.i);
    if (!idee[i]) return json({ errore: 'idea non trovata' }, 400);
    if (idee[i].usata) return json({ errore: 'questa idea ha già il suo copione' }, 400);
    if (A.stato === 'in_corso' && A.fase !== 'fatto') return json({ errore: 'aspetta che finisca il lavoro in corso su questo argomento' }, 409);
    await run(env, "UPDATE avatar_piani SET idea_scelta=?, fase='copioni', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", i, ora(), A.id);
    await log(env, null, 'idee', `💡 Johnny sceglie l'idea in riserva "${String(idee[i].titolo).slice(0, 70)}": Nora scrive il copione`);
    return json({ ok: true });
  }
  if (m === 'POST' && mm[2] === 'riprova') { await run(env, "UPDATE avatar_piani SET stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", ora(), A.id); return json({ ok: true }); }
  if (m === 'DELETE') { await run(env, 'DELETE FROM avatar_piani WHERE id=?', A.id); return json({ ok: true }); }
  return null;
}
