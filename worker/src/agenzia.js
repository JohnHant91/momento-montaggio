// AGENZIA MOMENTO AI · gli uffici dell'azienda (oltre al comparto Reel di lavoro.js e a Nora di copioni.js).
// Ogni agente ha il suo metodo (le skill in ./skills, licenza MIT) e lavora sugli "incarichi".
// Il cron fa partire insieme gli incarichi di agenti diversi: nessuno aspetta il collega, salvo quando
// un incarico dipende dal lavoro di un altro (es. il copy aspetta la strategia).
import { all, one, run, J, ora, configurazione, log } from './db.js';
import * as S from './servizi.js';
import { SKILL } from './skill_testi.js';
import { nuovoPianoAvatar } from './avatar.js';
import { nuovoLavoroPost } from './post.js';
import { registra, daUsage, chi } from './consumi.js';

export const UFFICI = [
  ['direzione', 'Direzione'], ['marketing', 'Ufficio Marketing'], ['social', 'Ufficio Social'], ['video', 'Ufficio Video'],
  ['foto', 'Ufficio Foto'], ['web', 'Web & E-commerce'], ['booking', 'Booking & WhatsApp'], ['gestionale', 'Ufficio Gestionale'], ['contabilita', 'Ufficio Contabile'],
];

// agenti degli uffici (quelli del Video sono la squadra reel, definita nella pagina)
export const SQUADRA = {
  capo: { n: 'Alba', r: 'Direttrice dell’agenzia', u: 'direzione', i: '🧭', c: '#3fd0c9', skill: ['social-strategy'], d: 'È l’unica con cui parli. Riceve le tue richieste, convoca i capireparto in sala meeting, ti porta le proposte e, quando scegli, fa partire gli uffici. Ogni settimana guida la riunione operativa in direzione e ti manda il report.' },
  stratega: { n: 'Marco', r: 'Stratega · brand, strategia, campagne e report', u: 'marketing', i: '♟️', c: '#7aa2ff', skill: ['brand-profile', 'social-strategy', 'content-pillars', 'goals-and-kpis', 'content-audit', 'competitor-analysis', 'campaign-and-launch-planning', 'seasonal-and-moment-marketing', 'analytics-and-reporting'], d: 'Fa tutto il marketing di un cliente in una persona sola: scheda cliente (chi è, a chi parla, come parla, cosa non dire; tutti gli altri la leggono), strategia, obiettivi e pilastri, audit del profilo e dei concorrenti, campagne e ricorrenze, report mensile dai numeri che gli dai. Non inventa numeri.' },
  ricerca: { n: 'Sofia', r: 'Ricerca, trend e virali', u: 'marketing', i: '📚', c: '#5aa9e6', skill: ['audience-research', 'trend-jacking', 'viral-reverse-engineering'], d: 'Si documenta sul web su ogni argomento (fatti verificati con le fonti, numeri, errori comuni, domande della gente) e trova i trend e i video virali del settore. Una ricerca vale per 10 contenuti. Non inventa nulla.' },
  copywriter: { n: 'Giulia', r: 'Copy, calendario e community', u: 'social', i: '✍️', c: '#f0b44c', skill: ['caption-writer', 'hook-writer', 'hashtag-strategy', 'content-calendar', 'reply-and-comment-writer'], d: 'Caption, ganci, hashtag e parole chiave nella voce del cliente; costruisce il calendario editoriale e programma i contenuti che approvi; prepara le risposte a commenti e recensioni (tu approvi prima che escano).' },
  caroselli: { n: 'Pietro', r: 'Caroselli e grafiche', u: 'social', i: '🗂️', c: '#e58bd0', skill: ['carousel-writer', 'quote-cards-and-text-graphics', 'design-and-templates'], d: 'Caroselli slide per slide e grafiche: testi, impaginazione e indicazioni per Canva.' },
  ritocco: { n: 'Teo', r: 'Fotoritocco · maestro di Photoshop e Lightroom', u: 'foto', i: '🪄', c: '#9bf6ff', skill: ['ai-image-editing', 'image-prompt'], d: 'Il reparto foto in una persona: carichi su pCloud la cartella dello shooting e lui sviluppa i RAW (o i JPG) con un look uniforme come un preset Lightroom, fa un ritocco leggero e naturale della pelle, scarta le foto mosse, a occhi chiusi e i doppioni, e ti consegna lo ZIP. Prepara anche i brief degli shooting e, quando non c’è una foto vera, i prompt per le immagini AI. Mai falsare prodotti e luoghi.' },
  web: { n: 'Walter', r: 'Sito, SEO ed e-commerce', u: 'web', i: '🌐', c: '#8ecae6', skill: ['ai-search-optimization', 'social-seo', 'social-proof-and-testimonials', 'email-and-newsletter'], d: 'Testi del sito, SEO e visibilità su Google e sulle AI, link in bio; schede prodotto, recensioni, newsletter e funnel per vendere online.' },
  booking: { n: 'Bea', r: 'Booking e WhatsApp', u: 'booking', i: '🛎️', c: '#caffbf', skill: ['social-selling-and-dm', 'reply-and-comment-writer'], d: 'Risponde alle richieste di prenotazione e ai messaggi WhatsApp/DM. Per ora prepara le risposte; la risposta automatica arriva quando colleghiamo WhatsApp.' },
  avatar: { n: 'Ava', r: 'Avatar HeyGen', u: 'video', i: '🎭', c: '#b388ff', speciale: true, d: 'Genera i video con l’avatar di Johnny (HeyGen) dai copioni approvati e li passa al comparto Reel per il montaggio.' },
  gestionale: { n: 'Gino', r: 'Segreteria gestionale', u: 'gestionale', i: '🗄️', c: '#90be6d', chat: true, d: 'Ha il pieno controllo del gestionale: gli scrivi “segnami uno shooting il 12” o “nuovo cliente…” e lui lo fa.' },
  contabile: { n: 'Dora', r: 'Contabile', u: 'contabilita', i: '🧾', c: '#f9c74f', chat: true, d: 'Preventivi dal listino, entrate e uscite, scadenze e incassi da sollecitare, sul gestionale.' },
};
// agenti accorpati (Johnny: meno agenti, più compiti, metà spesa): i vecchi nomi lavorano col nuovo responsabile
export const ACCORPATI = { brand: 'stratega', audit: 'stratega', campagne: 'stratega', report: 'stratega', calendario: 'copywriter', community: 'copywriter',
  trend: 'ricerca', fotografo: 'ritocco', immagini: 'ritocco', ecommerce: 'web' };
export const agId = (id) => (SQUADRA[id] ? id : ACCORPATI[id] || id);
export const DELEGABILI = Object.keys(SQUADRA).filter((k) => !SQUADRA[k].chat && !SQUADRA[k].speciale && k !== 'capo');
const MAX_FIGLI = 2, MAX_PROFONDITA = 2, IN_PARALLELO = 6, BLOCCO_MIN = 15;

export async function schemaAgenzia(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS clienti (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, nicchia TEXT, gest_id TEXT,
      scheda TEXT, note TEXT, creato TEXT, aggiornato TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS incarichi (id INTEGER PRIMARY KEY AUTOINCREMENT, agente TEXT NOT NULL, cliente_id INTEGER, titolo TEXT, brief TEXT,
      stato TEXT NOT NULL DEFAULT 'in_coda', esito TEXT, padre_id INTEGER, dipende_da INTEGER, profondita INTEGER DEFAULT 0, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS contenuti (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, incarico_id INTEGER, agente TEXT, tipo TEXT,
      piattaforma TEXT, data TEXT, ora TEXT, titolo TEXT, testo TEXT, visual TEXT, hashtag TEXT, stato TEXT NOT NULL DEFAULT 'da_approvare', nota TEXT,
      gest_id TEXT, creato TEXT, aggiornato TEXT)`),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, canale TEXT, ruolo TEXT, testo TEXT, quando TEXT)'),
  ]);
}

// ------------------------------------------------------------------ scheda cliente
export async function cliente(env, id) { return id ? one(env, 'SELECT * FROM clienti WHERE id=?', id) : null; }
const testoScheda = (C) => C ? `SCHEDA CLIENTE: ${C.nome}${C.nicchia ? ' · ' + C.nicchia : ''}
${C.scheda || '(la scheda non è ancora stata scritta: lavora con quello che sai dal brief e scrivilo in "domande")'}
${C.note ? 'NOTE DI JOHNNY: ' + C.note : ''}` : 'CLIENTE: nessuno in particolare (lavoro interno di Momento Produzione o generico).';

const ADATTA = `COME USI LE SKILL QUI SOTTO (sono il tuo metodo di lavoro, adattale così):
- "brand-profile.md", voce, pubblico ecc. = la SCHEDA CLIENTE che trovi nel messaggio. Se manca qualcosa, fai l'ipotesi più ragionevole e scrivila in "domande".
- "WoopSocial" o lo scheduler = il calendario dell'agenzia: tu proponi i contenuti con data e ora, Johnny li approva e l'agenzia li programma.
- Non hai accesso agli analytics né al web: usa solo i numeri e i fatti che ti vengono dati. Mai inventare dati, prezzi, recensioni, servizi, risultati.
- Non puoi fare domande in diretta: consegna comunque il lavoro finito e metti i dubbi in "domande".
- Scrivi sempre in italiano, pronto da usare.`;

// agenti con più compiti: si caricano solo le 2-3 skill che servono a QUESTO incarico (le skill intere sono la voce più cara del prompt)
const PAROLE_SKILL = {
  'brand-profile': ['scheda', 'brand', 'voce', 'identit'], 'social-strategy': ['strategi'], 'content-pillars': ['pilastr', 'rubric', 'temi'],
  'goals-and-kpis': ['obiettiv', 'kpi'], 'content-audit': ['audit', 'analizz', 'profilo'], 'competitor-analysis': ['concorrent', 'competitor'],
  'campaign-and-launch-planning': ['campagn', 'lancio', 'promo'], 'seasonal-and-moment-marketing': ['natal', 'pasqu', 'estat', 'ricorrenz', 'stagion', 'event', 'san valentino'],
  'analytics-and-reporting': ['report', 'numeri', 'risultat', 'statistic', 'insight'], 'caption-writer': ['caption', 'post', 'didascal', 'testi'],
  'hook-writer': ['gancio', 'ganci', 'hook'], 'hashtag-strategy': ['hashtag'], 'content-calendar': ['calendario', 'programm', 'piano editoriale', 'settiman', 'mese'],
  'reply-and-comment-writer': ['rispost', 'commenti', 'recension', 'messagg'], 'viral-reverse-engineering': ['viral'], 'trend-jacking': ['trend'],
  'audience-research': ['pubblico', 'target', 'ricerca'], 'ai-image-editing': ['ritocc', 'foto', 'selezion'], 'image-prompt': ['immagin', 'prompt', 'ai'],
  'ai-search-optimization': ['seo', 'google', 'chatgpt'], 'social-seo': ['seo', 'parole chiave'], 'social-proof-and-testimonials': ['recension', 'prodott', 'testimon'],
  'email-and-newsletter': ['newsletter', 'email'],
};
function sistemaAgente(id, testo = '') {
  const A = SQUADRA[agId(id)];
  const t = String(testo).toLowerCase();
  const tutte = A.skill || [];
  const punti = (k) => (PAROLE_SKILL[k] || []).filter((w) => t.includes(w)).length;
  const scelte = tutte.length <= 3 ? tutte : [...tutte].sort((a, b) => punti(b) - punti(a) || tutte.indexOf(a) - tutte.indexOf(b)).slice(0, 3);
  if (id === 'brand' && tutte.includes('brand-profile') && !scelte.includes('brand-profile')) scelte.splice(2, 1, 'brand-profile');
  const skill = scelte.map((s) => `\n\n===== SKILL: ${s} =====\n${(SKILL[s] || '').slice(0, 7000)}`).join('');
  return `Sei ${A.n}, ${A.r} di AGENZIA MOMENTO AI, l'agenzia di Johnny (Momento Produzione: video, foto, social, siti ed e-commerce per clienti di ogni nicchia: ristoranti, bar, B&B, negozi, artigiani, professionisti).
Il tuo compito: ${A.d}
Lavori in squadra: altri uffici lavorano in parallelo a te. Passa lavoro a un collega in "passa_a" (massimo ${MAX_FIGLI}) SOLO se è indispensabile per consegnare quello che Johnny ha chiesto (es. i post hanno bisogno della grafica). Ogni passaggio costa: niente lavori extra non richiesti.
Colleghi a cui puoi passare lavoro: ${DELEGABILI.filter((k) => k !== id).map((k) => `${k} (${SQUADRA[k].r})`).join(', ')}.

${ADATTA}${skill}`;
}

const FORMATO = `Rispondi SOLO con un JSON:
{"titolo": "...", "sintesi": "2-3 frasi per Johnny", "documento": "il lavoro completo in markdown (titoli con #, elenchi con -)",
 "contenuti": [{"tipo": "post|carosello|reel|storia|risposta|email|pagina_web|altro", "piattaforma": "instagram|facebook|tiktok|linkedin|whatsapp|sito|email|altro",
   "data": "YYYY-MM-DD o null", "ora": "HH:MM o null", "titolo": "...", "testo": "testo pronto da pubblicare/inviare",
   "visual": "cosa si vede: foto/video da usare, grafica slide per slide, o prompt immagine", "hashtag": ["..."]}],
 "passa_a": [{"agente": "id", "titolo": "...", "brief": "..."}],
 "domande": ["dubbi o informazioni che servirebbero"]}
"contenuti" solo se hai prodotto cose da pubblicare o inviare (vanno in approvazione a Johnny); altrimenti [].`;

async function eseguiIncarico(env, cfg, I) {
  const A = SQUADRA[agId(I.agente)];
  if (!A || A.chat) throw new Error('agente sconosciuto: ' + I.agente);
  const C = await cliente(env, I.cliente_id);
  // il lavoro dei colleghi da cui dipendo (e di chi mi ha passato l'incarico)
  const prima = await all(env, 'SELECT id, agente, titolo, esito FROM incarichi WHERE id IN (?, ?)', I.dipende_da || 0, I.padre_id || 0);
  const contesto = prima.map((p) => { const e = J(p.esito, {}); return `--- dal collega ${SQUADRA[agId(p.agente)]?.n || p.agente} (${SQUADRA[agId(p.agente)]?.r || ''}), incarico #${p.id} "${p.titolo}":\n${String(e.documento || e.sintesi || '').slice(0, 12000)}`; }).join('\n\n');
  await log(env, null, I.agente, `${A.i} inizio #${I.id}: ${I.titolo}${C ? ' · ' + C.nome : ''}`);
  const oggi = new Date().toISOString().slice(0, 10);
  const out = await S.claude(cfg, sistemaAgente(I.agente, `${I.titolo} ${I.brief}`), `OGGI: ${oggi}

${testoScheda(C)}

INCARICO #${I.id}: ${I.titolo}
${I.brief || ''}
${contesto ? '\nLAVORO GIÀ FATTO DAI COLLEGHI (usalo, non rifarlo):\n' + contesto : ''}

${I.agente === 'brand' ? 'Il "documento" è la SCHEDA CLIENTE completa e definitiva che leggeranno tutti gli altri agenti: chi è, offerta, pubblico, voce (con esempi di frasi sì/no), punto di vista, prove, regole e cose da non dire mai.\n\n' : ''}${FORMATO}`, { maxTokens: 16000 });
  const contenuti = Array.isArray(out.contenuti) ? out.contenuti.slice(0, 40) : [];
  for (const c of contenuti) {
    await run(env, `INSERT INTO contenuti (cliente_id, incarico_id, agente, tipo, piattaforma, data, ora, titolo, testo, visual, hashtag, creato, aggiornato)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, I.cliente_id || null, I.id, I.agente, String(c.tipo || 'post'), String(c.piattaforma || 'instagram'),
    /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : null, /^\d{1,2}:\d{2}$/.test(c.ora || '') ? c.ora : null,
    String(c.titolo || '').slice(0, 200), String(c.testo || ''), typeof c.visual === 'string' ? c.visual : JSON.stringify(c.visual || ''),
    JSON.stringify(Array.isArray(c.hashtag) ? c.hashtag : []), ora(), ora());
  }
  if (I.agente === 'brand' && C && out.documento) {
    await run(env, 'UPDATE clienti SET scheda=?, aggiornato=? WHERE id=?', String(out.documento), ora(), C.id);
  }
  // passaggi ai colleghi: partono subito, in parallelo tra loro
  let passati = 0;
  if ((I.profondita || 0) < MAX_PROFONDITA) {
    for (const p of (out.passa_a || []).slice(0, MAX_FIGLI)) {
      if (!DELEGABILI.includes(agId(p.agente)) || p.agente === I.agente) continue;
      await run(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, padre_id, profondita, creato, aggiornato) VALUES (?,?,?,?,?,?,?,?)',
        p.agente, I.cliente_id || null, String(p.titolo || I.titolo).slice(0, 200), String(p.brief || ''), I.id, (I.profondita || 0) + 1, ora(), ora());
      passati++;
    }
  }
  const esito = { titolo: out.titolo, sintesi: out.sintesi, documento: out.documento, domande: out.domande || [], contenuti: contenuti.length };
  await run(env, 'UPDATE incarichi SET stato=?, esito=?, errore=NULL, blocco_fino=NULL, aggiornato=? WHERE id=?', contenuti.length ? 'da_approvare' : 'fatto', JSON.stringify(esito), ora(), I.id);
  await log(env, null, I.agente, `✅ #${I.id} fatto${contenuti.length ? `: ${contenuti.length} contenuti da approvare` : ''}${passati ? ` · passato a ${passati} colleghi` : ''}`);
}

// cron: fino a IN_PARALLELO incarichi di agenti diversi, tutti insieme
export async function avanzaUffici(env) {
  const adesso = ora();
  const pronti = await all(env, `SELECT i.* FROM incarichi i WHERE i.stato='in_coda' AND (i.blocco_fino IS NULL OR i.blocco_fino < ?)
    AND (i.dipende_da IS NULL OR EXISTS (SELECT 1 FROM incarichi d WHERE d.id=i.dipende_da AND d.stato IN ('fatto','da_approvare','approvato')))
    AND i.agente NOT IN (SELECT agente FROM incarichi WHERE stato='in_corso' AND blocco_fino > ?) ORDER BY i.id LIMIT 40`, adesso, adesso);
  const scelti = [], visti = new Set();
  for (const I of pronti) { if (!visti.has(I.agente) && scelti.length < IN_PARALLELO) { visti.add(I.agente); scelti.push(I); } }
  if (!scelti.length) return;
  const cfg = await configurazione(env);
  await Promise.allSettled(scelti.map(async (I0) => {
    const I = await one(env, "UPDATE incarichi SET stato='in_corso', blocco_fino=?, tentativi=tentativi+1, aggiornato=? WHERE id=? AND stato='in_coda' RETURNING *",
      new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString(), ora(), I0.id);
    if (!I) return;
    try { await eseguiIncarico(env, chi(cfg, { area: 'uffici', agente: I.agente, cliente_id: I.cliente_id }), I); } catch (e) {
      const msg = String(e?.message || e).slice(0, 400);
      if (/credit balance|billing/i.test(msg)) { // credito Claude finito: metto in pausa senza bruciare i tentativi
        await run(env, "UPDATE incarichi SET stato='in_coda', errore=?, tentativi=0, blocco_fino=?, aggiornato=? WHERE id=?", 'Credito Claude esaurito: riparto da solo quando lo ricarichi', new Date(Date.now() + 10 * 60e3).toISOString(), ora(), I.id);
        await log(env, null, I.agente, '⏸️ credito Claude esaurito: ricarica su console.anthropic.com, poi riparto da solo', 'errore');
        return;
      }
      const stop = I.tentativi >= 3 || /manca la chiave/.test(msg);
      await run(env, 'UPDATE incarichi SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_coda', msg,
        stop ? null : new Date(Date.now() + 2 * 60e3).toISOString(), ora(), I.id);
      await log(env, null, I.agente, `${stop ? '❌ fermo' : '⚠️ riprovo tra 2 minuti'} (#${I.id}): ${msg}`, stop ? 'errore' : 'warn');
    }
  }));
  // in programmazione: contenuti approvati arrivati all'ora di uscita
  const ora_it = new Date(Date.now() + 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const scaduti = await all(env, "SELECT c.id, c.titolo, c.piattaforma, k.nome FROM contenuti c LEFT JOIN clienti k ON k.id=c.cliente_id WHERE c.stato='programmato' AND (c.data || ' ' || COALESCE(c.ora,'09:00')) <= ?", ora_it);
  for (const c of scaduti) {
    await run(env, "UPDATE contenuti SET stato='da_pubblicare', aggiornato=? WHERE id=?", ora(), c.id);
    await log(env, null, 'calendario', `⏰ è ora di pubblicare "${c.titolo}" (${c.piattaforma}${c.nome ? ' · ' + c.nome : ''}): nessun canale collegato, pubblicalo tu e segnalo come pubblicato`, 'warn');
  }
}

// ------------------------------------------------------------------ gestionale (D1 di momento-gestionale, binding GEST)
const STORE = {
  clienti: 'nome*, referente, telefono, email, piva, indirizzo, servizi (Social management|Produzione video|Foto|Sito web|E-commerce|Pacchetto completo|Altro), canone (€/mese imponibile), stato (Attivo|Prospect|In pausa|Chiuso), social, note',
  riprese: 'calendario dei contenuti da realizzare. titolo*, cliente* (id cliente), tipo (Video|Reel|Foto|Video + Foto|Stories|Spot|Intervista|Evento|Altro), data (shooting), ora, oraFine, location, stato (Da pianificare|Pianificato|Realizzato|In post-produzione|Consegnato|Pubblicato), consegna (data), shotlist, attrezzatura, assegnati ([id utenti]), note',
  attivita: 'cose da fare. titolo*, assegnati ([id utenti]), scadenza, priorita (Normale|Alta|Urgente), stato (Da fare|In corso|Fatto), cliente (id, facoltativo), descrizione',
  eventi: 'eventi e shooting di più giorni. titolo*, tipo (Shooting|Workshop|Evento|Altro), stato (Idea|In organizzazione|Confermato|Fatto|Annullato), data* (dal), al, ora, oraFine, location, assegnati ([id utenti]), concept, coinvolti, budget, note',
  turni: 'persone prenotate a un evento. evento* (id evento), nome*, data*, stato (Confermato|Da confermare|Annullato), ora, oraFine, telefono, persone, note',
  assenze: 'utente* (id utente), dal*, al, nota',
  contratti: 'titolo*, cliente* (id), firma, inizio, scadenza, importo, rinnovo (Nessuno|Tacito|Da rinegoziare), note (il PDF lo carica Johnny dal gestionale)',
  preventivi: 'numero (AAAA/NNN progressivo), data, validita (giorni), stato, cliente (id), iva, righe [{nome, descrizione, periodo, qta, um, prezzo, sconto}], condizioni, nota, scontoG, scontoF, dettaglio. Per un nuovo preventivo leggi prima l’ultimo e copia condizioni e nota.',
  servizi: 'listino. nome*, categoria, descrizione, um (pz|forfait|ora|mese), prezzo',
  movimenti: 'entrate e uscite. tipo* (Entrata|Uscita), data*, descrizione*, cliente (id), preventivo (id), categoria (Canone social|Produzione video/foto|Sito / e-commerce|Consulenza|Attrezzatura|Software / abbonamenti|Collaboratori|Altro), numero (n. fattura), imponibile* (senza IVA), iva (%, 22 di norma), stato (Pagato|Da incassare|Da pagare), fattura (—|Emessa|Da emettere), scadenza, note',
};
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const titoloRec = (d) => d.titolo || d.nome || d.descrizione || d.numero || '';

async function logGest(env, chi, azione, store, id, titolo) {
  try { await env.GEST.prepare('INSERT INTO log(ts,user_id,nome,azione,store,rec_id,titolo) VALUES(?,?,?,?,?,?,?)').bind(ora(), 'agente-ai', 'Agente AI · ' + chi, azione, store, id, String(titolo || '').slice(0, 150)).run(); } catch {}
}

const STRUMENTI = [
  { name: 'utenti', description: 'Elenco dei membri del team (id e nome) per i campi assegnati/utente.', input_schema: { type: 'object', properties: {} } },
  { name: 'cerca', description: 'Cerca record in una sezione del gestionale. Senza testo restituisce gli ultimi.', input_schema: { type: 'object', properties: { sezione: { type: 'string', enum: Object.keys(STORE) }, testo: { type: 'string' } }, required: ['sezione'] } },
  { name: 'leggi', description: 'Legge un record completo.', input_schema: { type: 'object', properties: { sezione: { type: 'string', enum: Object.keys(STORE) }, id: { type: 'string' } }, required: ['sezione', 'id'] } },
  { name: 'crea', description: 'Crea un record. campi = oggetto con i campi della sezione.', input_schema: { type: 'object', properties: { sezione: { type: 'string', enum: Object.keys(STORE) }, campi: { type: 'object' } }, required: ['sezione', 'campi'] } },
  { name: 'modifica', description: 'Modifica solo i campi indicati di un record esistente.', input_schema: { type: 'object', properties: { sezione: { type: 'string', enum: Object.keys(STORE) }, id: { type: 'string' }, campi: { type: 'object' } }, required: ['sezione', 'id', 'campi'] } },
  { name: 'elimina', description: 'Elimina un record. Usalo SOLO se Johnny ha confermato esplicitamente in chat di eliminare proprio quel record.', input_schema: { type: 'object', properties: { sezione: { type: 'string', enum: Object.keys(STORE) }, id: { type: 'string' }, confermato: { type: 'boolean' } }, required: ['sezione', 'id', 'confermato'] } },
];

async function strumento(env, chi, nome, a) {
  const G = env.GEST;
  if (!G) return { errore: 'gestionale non collegato' };
  if (nome === 'utenti') return (await G.prepare("SELECT id, nome, username, ruolo FROM users WHERE attivo=1").all()).results;
  if (a.sezione && !STORE[a.sezione]) return { errore: 'sezione inesistente' };
  if (nome === 'cerca') {
    const t = String(a.testo || '').trim();
    const r = (await G.prepare(`SELECT id, data FROM records WHERE store=? ${t ? 'AND data LIKE ?' : ''} ORDER BY updated DESC LIMIT 30`).bind(...(t ? [a.sezione, '%' + t + '%'] : [a.sezione])).all()).results;
    return r.map((x) => { const d = J(x.data, {}); delete d.righe; delete d.condizioni; return d; });
  }
  if (nome === 'leggi') { const r = await G.prepare('SELECT data FROM records WHERE store=? AND id=?').bind(a.sezione, a.id).first(); return r ? J(r.data) : { errore: 'non trovato' }; }
  if (nome === 'crea') {
    const id = gid(), t = ora();
    const d = { ...(a.campi || {}), id, created: t, creato: t, mod: t, by: 'agente-ai' };
    if (a.sezione === 'riprese' && !d.stato) d.stato = 'Da pianificare';
    if (a.sezione === 'attivita') { d.stato ||= 'Da fare'; d.priorita ||= 'Normale'; d.assegnati ||= []; }
    if (a.sezione === 'clienti') d.stato ||= 'Attivo';
    await G.prepare('INSERT INTO records(store,id,data,updated,by_user) VALUES(?,?,?,?,?)').bind(a.sezione, id, JSON.stringify(d), t, 'agente-ai').run();
    await logGest(env, chi, 'crea', a.sezione, id, titoloRec(d));
    return { ok: true, id, record: d };
  }
  if (nome === 'modifica') {
    const r = await G.prepare('SELECT data FROM records WHERE store=? AND id=?').bind(a.sezione, a.id).first();
    if (!r) return { errore: 'non trovato' };
    const d = { ...J(r.data, {}), ...(a.campi || {}), id: a.id, updated: ora(), mod: ora() };
    await G.prepare('UPDATE records SET data=?, updated=?, by_user=? WHERE store=? AND id=?').bind(JSON.stringify(d), ora(), 'agente-ai', a.sezione, a.id).run();
    await logGest(env, chi, 'modifica', a.sezione, a.id, titoloRec(d));
    return { ok: true, record: d };
  }
  if (nome === 'elimina') {
    if (!a.confermato) return { errore: 'serve la conferma esplicita di Johnny: chiedigliela in chat' };
    const r = await G.prepare('SELECT data FROM records WHERE store=? AND id=?').bind(a.sezione, a.id).first();
    if (!r) return { errore: 'non trovato' };
    await G.prepare('DELETE FROM records WHERE store=? AND id=?').bind(a.sezione, a.id).run();
    await logGest(env, chi, 'elimina', a.sezione, a.id, titoloRec(J(r.data, {})));
    return { ok: true };
  }
  return { errore: 'strumento sconosciuto' };
}

const SISTEMA_GEST = (id) => {
  const A = SQUADRA[id];
  const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const oggi = new Date(Date.now() + 3600e3);
  return `Sei ${A.n}, ${A.r} di AGENZIA MOMENTO AI. Hai pieno accesso al gestionale di Momento Produzione (usato anche dai soci Nicola e Mariapia) tramite gli strumenti.
${id === 'contabile' ? 'Ti occupi soprattutto di preventivi (dal listino servizi), movimenti (entrate/uscite), incassi da sollecitare, scadenze e contratti. Quando fai conti, mostra le cifre.' : 'Ti occupi di clienti, calendario dei contenuti (riprese), eventi e shooting, attività del team, assenze, contratti.'}
Oggi è ${giorni[oggi.getUTCDay()]} ${oggi.toISOString().slice(0, 10)} (ora italiana ${oggi.toISOString().slice(11, 16)}). Interpreta le date relative ("il 12", "venerdì prossimo") rispetto a oggi; "il 12" = il prossimo giorno 12.
SEZIONI E CAMPI (* obbligatori; i valori tra parentesi sono le uniche opzioni ammesse):
${Object.entries(STORE).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
REGOLE:
- Esegui subito quello che Johnny chiede, senza chiedere conferme inutili. Se manca un dato obbligatorio che non puoi dedurre, chiedilo in una riga.
- Per collegare un cliente cerca prima il suo id (cerca clienti). Se non esiste e serve, crealo.
- Per assegnare persone usa gli id da "utenti". "Io"/"me" = Giovanni Formicola (johnny).
- Non duplicare: prima di creare un cliente cerca se esiste già.
- Eliminare solo con conferma esplicita di Johnny nel messaggio.
- Alla fine rispondi breve in italiano: cosa hai fatto, con i dati principali (data, ora, cliente). Niente markdown pesante.`;
};

export async function chatGestionale(env, canale, testo) {
  const cfg = await configurazione(env);
  if (!cfg.ANTHROPIC_API_KEY) throw new Error('manca la chiave Claude');
  const storia = (await all(env, 'SELECT ruolo, testo FROM chat WHERE canale=? ORDER BY id DESC LIMIT 12', canale)).reverse();
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', canale, 'user', testo, ora());
  const messaggi = [];
  for (const m of storia) {
    const r = m.ruolo === 'user' ? 'user' : 'assistant';
    if (messaggi.length && messaggi[messaggi.length - 1].role === r) messaggi[messaggi.length - 1].content += '\n' + m.testo;
    else messaggi.push({ role: r, content: m.testo });
  }
  if (messaggi[0]?.role === 'assistant') messaggi.shift();
  if (messaggi.length && messaggi[messaggi.length - 1].role === 'user') messaggi[messaggi.length - 1].content += '\n' + testo;
  else messaggi.push({ role: 'user', content: testo });
  const azioni = [];
  let risposta = '';
  for (let giro = 0; giro < 10; giro++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.CLAUDE_MODEL, max_tokens: 4000, system: SISTEMA_GEST(canale), tools: STRUMENTI, messages: messaggi }),
    });
    if (r.status !== 200) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    await registra(chi(cfg, { area: 'gestionale', agente: canale }), 'claude', cfg.CLAUDE_MODEL, daUsage(d.usage));
    messaggi.push({ role: 'assistant', content: d.content });
    const usi = d.content.filter((c) => c.type === 'tool_use');
    risposta = d.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim() || risposta;
    if (!usi.length || d.stop_reason !== 'tool_use') break;
    const risultati = [];
    for (const u of usi) {
      let esito;
      try { esito = await strumento(env, SQUADRA[canale].n, u.name, u.input || {}); } catch (e) { esito = { errore: String(e?.message || e) }; }
      if (['crea', 'modifica', 'elimina'].includes(u.name) && esito?.ok) azioni.push(`${u.name} ${u.input.sezione}: ${titoloRec(esito.record || u.input.campi || {})}`);
      risultati.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(esito).slice(0, 15000) });
    }
    messaggi.push({ role: 'user', content: risultati });
  }
  risposta ||= azioni.length ? 'Fatto.' : 'Non sono riuscito a completare: riprova con più dettagli.';
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', canale, 'assistant', risposta, ora());
  for (const a of azioni) await log(env, null, canale, '🗄️ ' + a);
  return { risposta, azioni };
}

// ------------------------------------------------------------------ Capo: smista le richieste agli uffici
// esegue un piano già deciso (dalla riunione e dalla scelta di Johnny): crea cliente se serve, incarichi in parallelo, reel, copioni
export async function eseguiPiano(env, out, testo, clienteId, origine = '') {
  let cid = Number(out.cliente_id) || clienteId || null;
  if (!cid && out.nuovo_cliente?.nome) {
    const r = await one(env, 'INSERT INTO clienti (nome, nicchia, creato, aggiornato) VALUES (?,?,?,?) RETURNING id', String(out.nuovo_cliente.nome).slice(0, 120), String(out.nuovo_cliente.nicchia || ''), ora(), ora());
    cid = r.id;
  }
  if (cid && !(await cliente(env, cid))) cid = null;
  const creati = [];
  for (const x of (out.incarichi || []).slice(0, 12)) {
    if (!DELEGABILI.includes(agId(x.agente))) continue;
    const dip = Number.isInteger(x.dopo) && creati[x.dopo] ? creati[x.dopo] : null;
    const r = await one(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, dipende_da, creato, aggiornato) VALUES (?,?,?,?,?,?,?) RETURNING id',
      x.agente, cid, String(x.titolo || '').slice(0, 200), String(x.brief || '') + (origine ? '\n\n' + origine : ''), dip, ora(), ora());
    creati.push(r.id);
  }
  let reel = null, piano = null;
  if (out.reel?.prompt) {
    const C2 = await cliente(env, cid);
    const pc = /code=/.test(out.reel.pcloud || '') ? out.reel.pcloud : null;
    const r = await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, creato, aggiornato) VALUES (?,?,'[]','pcloud',?,?) RETURNING id",
      (C2 ? `Cliente: ${C2.nome}. ` : '') + out.reel.prompt, pc, ora(), ora());
    reel = r.id;
    await log(env, r.id, 'regia', '🎬 nuovo reel deciso in riunione: il Direttore creativo parte entro un minuto');
  }
  if (out.copioni?.argomenti?.length) {
    const C2 = await cliente(env, cid);
    const dati = { cliente: C2?.nome || 'Cliente', settore: C2?.nicchia || '', argomenti: out.copioni.argomenti.slice(0, 60), numero: Math.min(60, Math.max(1, Number(out.copioni.numero) || 20)), mesi: Math.min(24, Math.max(1, Number(out.copioni.mesi) || 3)), inizio: new Date().toISOString().slice(0, 10), note: C2?.scheda ? 'SCHEDA CLIENTE:\n' + C2.scheda.slice(0, 6000) : '' };
    const r = await one(env, 'INSERT INTO piani (cliente, dati, creato, aggiornato) VALUES (?,?,?,?) RETURNING id', dati.cliente, JSON.stringify(dati), ora(), ora());
    piano = r.id;
  }
  let avatar = null;
  if (out.avatar?.argomento) avatar = await nuovoPianoAvatar(env, out.avatar.argomento, out.avatar.numero, out.avatar.note);
  let post = null;
  if (out.post?.brief) post = await nuovoLavoroPost(env, { ...out.post, cliente_id: cid || null, cliente: (cid ? (await cliente(env, cid))?.nome : '') || 'Cliente', pcloud: /code=/.test(out.post.pcloud || '') ? out.post.pcloud : null });
  await log(env, null, 'capo', `🧭 ${creati.length} incarichi assegnati${reel ? ', 1 reel' : ''}${piano ? ', 1 piano copioni' : ''}${avatar ? ', reel con avatar' : ''}${post ? ', post e caroselli' : ''}: ${String(testo).slice(0, 80)}`);
  return { cliente_id: cid, incarichi: creati, reel, piano, avatar, post };
}

// ------------------------------------------------------------------ API
export async function apiAgenzia(req, env, p, m, json) {
  const corpo = () => req.json().catch(() => ({}));
  if (p === '/api/azienda' && m === 'GET') {
    const adesso = ora();
    const [attivi, recenti, approvare, conti, clienti, reelAttivi, pianiAttivi, profilo, postl] = await Promise.all([
      all(env, "SELECT id, agente, titolo, stato, blocco_fino FROM incarichi WHERE stato IN ('in_coda','in_corso') ORDER BY id"),
      all(env, "SELECT i.id, i.agente, i.titolo, i.stato, i.aggiornato, k.nome AS cliente FROM incarichi i LEFT JOIN clienti k ON k.id=i.cliente_id ORDER BY i.id DESC LIMIT 25"),
      one(env, "SELECT COUNT(*) AS n FROM contenuti WHERE stato IN ('da_approvare','da_pubblicare')"),
      all(env, "SELECT agente, COUNT(*) AS n FROM incarichi WHERE creato > ? GROUP BY agente", new Date(Date.now() - 30 * 864e5).toISOString()),
      one(env, 'SELECT COUNT(*) AS n FROM clienti'),
      all(env, "SELECT id, fase, blocco_fino FROM lavori WHERE stato='in_corso'"),
      all(env, "SELECT id FROM piani WHERE stato='in_corso'").catch(() => []),
      all(env, "SELECT id, fase, argomento, blocco_fino FROM avatar_piani WHERE stato='in_corso'").catch(() => []),
      all(env, "SELECT id, fase, cliente, blocco_fino FROM post_lavori WHERE stato='in_corso'").catch(() => []),
    ]);
    const feed = await all(env, 'SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 40');
    return json({ adesso, uffici: UFFICI, squadra: SQUADRA, attivi, recenti, da_approvare: approvare.n, conti, clienti: clienti.n, reel: reelAttivi, piani: pianiAttivi, profilo, postl, feed, gestionale: !!env.GEST });
  }
  const ch = p.match(/^\/api\/chat\/(capo|gestionale|contabile)$/);
  if (ch && m === 'GET') return json((await all(env, 'SELECT ruolo, testo, quando FROM chat WHERE canale=? ORDER BY id DESC LIMIT 40', ch[1])).reverse());
  if (ch && m === 'POST' && ch[1] !== 'capo') {
    const d = await corpo();
    if (!String(d.testo || '').trim()) return json({ errore: 'scrivi il messaggio' }, 400);
    return json(await chatGestionale(env, ch[1], String(d.testo).trim().slice(0, 4000)));
  }
  if (ch && m === 'DELETE') { await run(env, 'DELETE FROM chat WHERE canale=?', ch[1]); return json({ ok: true }); }

  // incarichi
  if (p === '/api/incarichi' && m === 'GET') {
    const u = new URL(req.url);
    const ag = u.searchParams.get('agente'), uf = u.searchParams.get('ufficio');
    const ids = ag ? [agId(ag)] : uf ? Object.keys(SQUADRA).filter((k) => SQUADRA[k].u === uf) : null;
    const r = await all(env, `SELECT i.id, i.agente, i.titolo, i.stato, i.errore, i.creato, i.aggiornato, i.padre_id, k.nome AS cliente FROM incarichi i LEFT JOIN clienti k ON k.id=i.cliente_id
      ${ids ? `WHERE i.agente IN (${ids.map(() => '?').join(',')})` : ''} ORDER BY i.id DESC LIMIT 80`, ...(ids || []));
    return json(r);
  }
  if (p === '/api/incarichi' && m === 'POST') {
    const d = await corpo();
    if (!DELEGABILI.includes(agId(d.agente))) return json({ errore: 'scegli un agente' }, 400);
    if (String(d.titolo || '').trim().length < 3) return json({ errore: 'scrivi cosa deve fare' }, 400);
    const r = await one(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, creato, aggiornato) VALUES (?,?,?,?,?,?) RETURNING id',
      d.agente, Number(d.cliente_id) || null, String(d.titolo).trim().slice(0, 200), String(d.brief || '').slice(0, 8000), ora(), ora());
    await log(env, null, d.agente, `📥 nuovo incarico #${r.id}: ${String(d.titolo).slice(0, 100)}`);
    return json({ id: r.id });
  }
  const ii = p.match(/^\/api\/incarichi\/(\d+)(?:\/(riprova|rifai))?$/);
  if (ii && m === 'GET' && !ii[2]) {
    const I = await one(env, 'SELECT i.*, k.nome AS cliente FROM incarichi i LEFT JOIN clienti k ON k.id=i.cliente_id WHERE i.id=?', ii[1]);
    if (!I) return json({ errore: 'non trovato' }, 404);
    const [figli, contenuti] = await Promise.all([
      all(env, 'SELECT id, agente, titolo, stato FROM incarichi WHERE padre_id=? OR dipende_da=? ORDER BY id', I.id, I.id),
      all(env, 'SELECT * FROM contenuti WHERE incarico_id=? ORDER BY data, ora, id', I.id),
    ]);
    return json({ ...I, esito: J(I.esito), figli, contenuti });
  }
  if (ii && m === 'POST' && ii[2]) {
    const d = await corpo();
    if (ii[2] === 'rifai') {
      const I = await one(env, 'SELECT * FROM incarichi WHERE id=?', ii[1]);
      const r = await one(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, padre_id, profondita, creato, aggiornato) VALUES (?,?,?,?,?,?,?,?) RETURNING id',
        I.agente, I.cliente_id, I.titolo + ' (rifatto)', `${I.brief || ''}\n\nCORREZIONI DI JOHNNY sul lavoro precedente (incarico #${I.id}): ${String(d.nota || '').slice(0, 2000)}`, I.id, MAX_PROFONDITA, ora(), ora());
      return json({ id: r.id });
    }
    await run(env, "UPDATE incarichi SET stato='in_coda', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", ora(), ii[1]);
    return json({ ok: true });
  }
  if (ii && m === 'DELETE') { await run(env, 'DELETE FROM incarichi WHERE id=?', ii[1]); await run(env, "DELETE FROM contenuti WHERE incarico_id=? AND stato='da_approvare'", ii[1]); return json({ ok: true }); }

  // contenuti: approvazioni e calendario
  if (p === '/api/contenuti' && m === 'GET') {
    const r = await all(env, `SELECT c.*, k.nome AS cliente FROM contenuti c LEFT JOIN clienti k ON k.id=c.cliente_id
      WHERE c.stato != 'scartato' ORDER BY CASE c.stato WHEN 'da_pubblicare' THEN 0 WHEN 'da_approvare' THEN 1 ELSE 2 END, COALESCE(c.data,'9999'), c.ora, c.id LIMIT 300`);
    return json(r);
  }
  const cc = p.match(/^\/api\/contenuti\/(\d+)$/);
  if (cc && m === 'POST') {
    const d = await corpo();
    const c = await one(env, 'SELECT c.*, k.gest_id AS cliente_gest FROM contenuti c LEFT JOIN clienti k ON k.id=c.cliente_id WHERE c.id=?', cc[1]);
    if (!c) return json({ errore: 'non trovato' }, 404);
    const campi = {};
    for (const k of ['testo', 'titolo', 'visual', 'data', 'ora', 'nota']) if (d[k] !== undefined) campi[k] = d[k] || null;
    if (d.azione === 'approva') campi.stato = (campi.data ?? c.data) ? 'programmato' : 'approvato';
    if (d.azione === 'scarta') campi.stato = 'scartato';
    if (d.azione === 'pubblicato') campi.stato = 'pubblicato';
    if (Object.keys(campi).length) await run(env, `UPDATE contenuti SET ${Object.keys(campi).map((k) => k + '=?').join(', ')}, aggiornato=? WHERE id=?`, ...Object.values(campi), ora(), c.id);
    // approvato → finisce anche nel calendario del gestionale (sezione riprese), così lo vedono i soci
    if (d.azione === 'approva' && env.GEST && c.cliente_gest) {
      try {
        const rec = { titolo: campi.titolo || c.titolo || c.tipo, cliente: c.cliente_gest, tipo: c.tipo === 'reel' ? 'Reel' : c.tipo === 'storia' ? 'Stories' : 'Foto', stato: 'Pianificato', consegna: campi.data ?? c.data ?? '', note: `${c.piattaforma} ${campi.ora ?? c.ora ?? ''}\n\n${campi.testo ?? c.testo ?? ''}`.slice(0, 3000), shotlist: String(campi.visual ?? c.visual ?? '').slice(0, 2000) };
        if (c.gest_id) await strumento(env, 'Rita', 'modifica', { sezione: 'riprese', id: c.gest_id, campi: rec });
        else { const r = await strumento(env, 'Rita', 'crea', { sezione: 'riprese', campi: rec }); if (r.id) await run(env, 'UPDATE contenuti SET gest_id=? WHERE id=?', r.id, c.id); }
      } catch {}
    }
    if (d.azione === 'pubblicato' && env.GEST && c.gest_id) { try { await strumento(env, 'Rita', 'modifica', { sezione: 'riprese', id: c.gest_id, campi: { stato: 'Pubblicato' } }); } catch {} }
    // incarico: quando non resta niente da approvare, è fatto
    if (c.incarico_id) {
      const resta = await one(env, "SELECT COUNT(*) AS n FROM contenuti WHERE incarico_id=? AND stato='da_approvare'", c.incarico_id);
      if (!resta.n) await run(env, "UPDATE incarichi SET stato='fatto', aggiornato=? WHERE id=? AND stato='da_approvare'", ora(), c.incarico_id);
    }
    return json({ ok: true });
  }

  // clienti
  if (p === '/api/clienti' && m === 'GET') return json(await all(env, 'SELECT id, nome, nicchia, gest_id, (scheda IS NOT NULL) AS ha_scheda, aggiornato FROM clienti ORDER BY nome'));
  if (p === '/api/clienti' && m === 'POST') {
    const d = await corpo();
    const nome = String(d.nome || '').trim();
    if (!nome) return json({ errore: 'scrivi il nome' }, 400);
    let gest = d.gest_id || null;
    if (!gest && d.crea_nel_gestionale && env.GEST) { const r = await strumento(env, 'Bianca', 'crea', { sezione: 'clienti', campi: { nome, servizi: 'Social management', stato: 'Attivo', note: d.nicchia || '' } }); gest = r.id || null; }
    const r = await one(env, 'INSERT INTO clienti (nome, nicchia, gest_id, note, creato, aggiornato) VALUES (?,?,?,?,?,?) RETURNING id', nome, String(d.nicchia || ''), gest, String(d.note || ''), ora(), ora());
    if (d.info) {
      await run(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, creato, aggiornato) VALUES (?,?,?,?,?,?)', 'brand', r.id, 'Scheda cliente: ' + nome,
        'Scrivi la scheda cliente completa con queste informazioni di Johnny:\n' + String(d.info).slice(0, 8000), ora(), ora());
    }
    return json({ id: r.id });
  }
  if (p === '/api/gestionale/clienti' && m === 'GET') {
    if (!env.GEST) return json([]);
    const r = (await env.GEST.prepare("SELECT id, data FROM records WHERE store='clienti' ORDER BY updated DESC").all()).results;
    return json(r.map((x) => { const d = J(x.data, {}); return { id: x.id, nome: d.nome, servizi: d.servizi, stato: d.stato }; }));
  }
  const kc = p.match(/^\/api\/clienti\/(\d+)(?:\/(scheda))?$/);
  if (kc && m === 'GET') {
    const C = await cliente(env, kc[1]);
    if (!C) return json({ errore: 'non trovato' }, 404);
    const inc = await all(env, 'SELECT id, agente, titolo, stato, aggiornato FROM incarichi WHERE cliente_id=? ORDER BY id DESC LIMIT 40', C.id);
    const con = await all(env, "SELECT id, tipo, piattaforma, data, ora, titolo, stato FROM contenuti WHERE cliente_id=? AND stato!='scartato' ORDER BY COALESCE(data,'9999') DESC LIMIT 60", C.id);
    return json({ ...C, incarichi: inc, contenuti: con });
  }
  if (kc && m === 'PUT') {
    const d = await corpo();
    await run(env, 'UPDATE clienti SET nome=COALESCE(?,nome), nicchia=COALESCE(?,nicchia), scheda=COALESCE(?,scheda), note=COALESCE(?,note), gest_id=COALESCE(?,gest_id), aggiornato=? WHERE id=?',
      d.nome ?? null, d.nicchia ?? null, d.scheda ?? null, d.note ?? null, d.gest_id ?? null, ora(), kc[1]);
    return json({ ok: true });
  }
  if (kc && kc[2] === 'scheda' && m === 'POST') {
    const d = await corpo();
    const C = await cliente(env, kc[1]);
    const r = await one(env, 'INSERT INTO incarichi (agente, cliente_id, titolo, brief, creato, aggiornato) VALUES (?,?,?,?,?,?) RETURNING id', 'brand', C.id, 'Scheda cliente: ' + C.nome,
      (C.scheda ? 'Aggiorna la scheda esistente (qui sotto) con le nuove informazioni.\nSCHEDA ATTUALE:\n' + C.scheda + '\n\n' : '') + 'INFORMAZIONI DI JOHNNY:\n' + String(d.info || '').slice(0, 8000), ora(), ora());
    return json({ id: r.id });
  }
  if (kc && m === 'DELETE') { await run(env, 'DELETE FROM clienti WHERE id=?', kc[1]); return json({ ok: true }); }
  return null;
}
