// RIUNIONI · Johnny parla solo con la Direttrice (Alba).
import { inviaPush } from './notifiche.js';
// 1) Ogni sua richiesta: Alba convoca i capireparto in SALA MEETING, discutono e preparano 2-3 proposte.
//    Johnny ne sceglie una (o la modifica) e solo allora partono gli uffici.
// 2) Ogni lunedì mattina: riunione operativa in DIREZIONE sull'andamento dell'agenzia, con report per Johnny.
import { all, one, run, J, ora, configurazione, log } from './db.js';
import * as S from './servizi.js';
import { SQUADRA, DELEGABILI, agId, cliente, eseguiPiano } from './agenzia.js';
import { GENERI } from './stili.js';
import { nuovoPianoAvatar, richiestaProfilo } from './avatar.js';
import { chi } from './consumi.js';
import { nuovoLavoroPost } from './post.js';

// capireparto: [ufficio, id agente, nome, ruolo]
export const CAPI = [
  ['direzione', 'capo', 'Alba', 'Direttrice'],
  ['marketing', 'stratega', 'Marco', 'capo Marketing'],
  ['social', 'smm', 'Chiara', 'Social media manager, capo Social'],
  ['video', 'regista', 'Rocco', 'regista e capo Video'],
  ['foto', 'ritocco', 'Teo', 'capo Foto'],
  ['web', 'web', 'Walter', 'capo Web & E-commerce'],
  ['booking', 'booking', 'Bea', 'capo Booking & WhatsApp'],
  ['gestionale', 'gestionale', 'Gino', 'capo Gestionale'],
  ['contabilita', 'contabile', 'Dora', 'capo Contabilità'],
];
const PER_RICHIESTA = ['capo', 'stratega', 'smm', 'regista', 'ritocco', 'web', 'booking'];
const SETTIMANALE = CAPI.map((c) => c[1]);
const NOME = Object.fromEntries(CAPI.map(([, id, n, r]) => [id, `${n} (${r})`]));
const DURATA_VISIVA = 150e3; // i capireparto restano in sala almeno 2 minuti e mezzo: arrivano, discutono, tornano

export async function schemaRiunioni(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS riunioni (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, stato TEXT NOT NULL DEFAULT 'in_corso',
    richiesta TEXT, cliente_id INTEGER, partecipanti TEXT, titolo TEXT, verbale TEXT, proposte TEXT, consigliata INTEGER, messaggio TEXT, report TEXT,
    scelta INTEGER, modifica TEXT, esito TEXT, errore TEXT, tentativi INTEGER DEFAULT 0, blocco_fino TEXT, fine_visiva TEXT, creato TEXT, aggiornato TEXT)`).run();
}

const squadraTesto = () => CAPI.map(([u, id, n, r]) => {
  const membri = Object.entries(SQUADRA).filter(([, A]) => A.u === u).map(([k, A]) => `${A.n} [${k}] ${A.r}`).join('; ');
  return `- ${n} [${id}], ${r}. Ufficio: ${membri || (u === 'video' ? 'comparto Reel (monta i reel dalle clip del cliente)' : '—')}`;
}).join('\n');

// ------------------------------------------------------------------ la richiesta di Johnny arriva alla Direttrice
// inizio della settimana (lunedì 00:00, ora di Roma) in ISO UTC
function inizioSettimana() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - dow, 0, 0) - 2 * 3600e3); // margine sul fuso (CET/CEST)
  return d.toISOString();
}
// la riunione operativa (report) si fa UNA volta a settimana: al primo comando di creazione contenuti della settimana
async function settimanaleSeServe(env) {
  const u = await one(env, "SELECT id FROM riunioni WHERE tipo='settimanale' AND creato >= ? LIMIT 1", inizioSettimana());
  if (!u) await convocaSettimanale(env);
}

export async function chiediDirettrice(env, testo, clienteId) {
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'user', testo, ora());
  await settimanaleSeServe(env);
  // contenuti per il profilo personale di Johnny: niente riunione preventiva, parte subito tutta la catena del Profilo IG
  const prof = richiestaProfilo(testo);
  if (prof && !prof.argomento) {
    const cosa = /carosell|slide/i.test(testo) ? 'caroselli' : /\bpost\b|grafich/i.test(testo) ? 'post' : 'reel';
    const risposta = `Ok, ${prof.numero} ${cosa} per il tuo profilo. Su che argomento? Scrivimi per esempio: "per il mio profilo ${prof.numero} ${cosa} su come trovare clienti con Instagram".`;
    await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', risposta, ora());
    return { risposta, incarichi: [] };
  }
  if (prof && /carosell|\bpost\b|grafich|slide/i.test(testo)) { // caroselli/post per il profilo: comparto Post e caroselli
    const cfgP = await configurazione(env);
    const tipo = /carosell|slide/i.test(testo) ? 'carosello' : 'post';
    const pc = (testo.match(/https:\/\/\S*pcloud\S*code=\S+/) || [])[0] || null;
    const id = await nuovoLavoroPost(env, { cliente_id: Number(cfgP.IG_CLIENTE_ID) || null, cliente: 'Johnny · profilo Instagram', tipo, numero: prof.numero, brief: testo, pcloud: pc });
    const risposta = `Ricevuto: ${prof.numero} ${tipo === 'carosello' ? 'caroselli' : 'post'} per il tuo profilo su "${prof.argomento}". Ines e Tea cercano i più virali della nicchia, Iris li studia${pc ? ', Ada sceglie le tue foto' : ''}, Pietro e Giulia scrivono slide e caption. Te li porto da approvare in "Tocca a te", poi si impaginano su Canva e decidi tu quando pubblicarli.`;
    await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', risposta, ora());
    await log(env, null, 'capo', `🗂️ profilo IG di Johnny: lavoro post #${id}, ${prof.numero} ${tipo} su "${prof.argomento.slice(0, 60)}"`);
    return { risposta, post: id, incarichi: [] };
  }
  if (prof) {
    const id = await nuovoPianoAvatar(env, prof.argomento, prof.numero, testo);
    const risposta = `Ricevuto: ${prof.numero} reel per il tuo profilo su "${prof.argomento}". Parte subito la catena: Sofia si documenta, Zoe studia i video simili e i virali, Nora scrive i copioni (gancio → problema → tensione → soluzione). Quando sono pronti te li porto in "Tocca a te" da approvare; poi Ava genera i video col tuo avatar, il comparto Reel li monta e tu decidi quando pubblicarli.`;
    await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', risposta, ora());
    await log(env, null, 'capo', `📱 profilo IG di Johnny: piano #${id}, ${prof.numero} reel su "${prof.argomento.slice(0, 60)}"`);
    return { risposta, avatar: id, incarichi: [] };
  }
  const r = await one(env, `INSERT INTO riunioni (tipo, stato, richiesta, cliente_id, partecipanti, titolo, creato, aggiornato) VALUES ('richiesta','in_corso',?,?,?,?,?,?) RETURNING id`,
    testo, clienteId || null, JSON.stringify(PER_RICHIESTA), testo.split('\n')[0].slice(0, 80), ora(), ora());
  const risposta = 'Ricevuto. Passo subito il lavoro ai reparti: ti arriva da approvare quando è pronto.';
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', risposta, ora());
  await log(env, null, 'capo', `📨 richiesta #${r.id} ai reparti: ${testo.slice(0, 80)}`);
  return { risposta, riunione: r.id, incarichi: [] };
}

// idee già proposte o fatte (tutti i clienti): REGOLA N.1 di Johnny, ogni contenuto è diverso dagli altri
async function giaFatte(env) {
  const r = await all(env, "SELECT proposte, scelta FROM riunioni WHERE tipo='richiesta' AND stato='decisa' ORDER BY id DESC LIMIT 40").catch(() => []);
  const t = r.map((x) => { const P = J(x.proposte, [])[x.scelta ?? 0]; return P ? `${P.titolo}${P.gancio ? ' — ' + P.gancio : ''}` : null; }).filter(Boolean);
  const l = await all(env, "SELECT substr(prompt,1,110) AS p FROM lavori ORDER BY id DESC LIMIT 20").catch(() => []);
  return [...t, ...l.map((x) => x.p)].slice(0, 50);
}
const SCHEMA_PIANO = `{"cliente_id": numero o null, "nuovo_cliente": {"nome": "...", "nicchia": "..."} o null,
     "incarichi": [{"agente": "uno di: ${DELEGABILI.join(', ')}", "titolo": "...", "brief": "brief completo e autonomo", "dopo": null}],
     "reel": {"prompt": "descrizione completa del reel", "pcloud": "link o null"} o null,
     "copioni": {"argomenti": ["..."], "numero": 20, "mesi": 3} o null,
     "post": {"tipo": "carosello | post | misto", "numero": 3, "slide": 7, "brief": "di cosa parlano e per chi", "pcloud": "link della cartella foto o null"} o null (comparto Post e caroselli: Ines e Tea cercano i virali della nicchia, Iris li studia, Ada sceglie le foto, Pietro e Giulia scrivono, Johnny approva, si impaginano su Canva),
     "avatar": {"argomento": "...", "numero": 5, "note": "..."} o null (SOLO per i reel del PROFILO PERSONALE di Johnny fatti col suo avatar HeyGen: Sofia ricerca, Zoe studia i virali, Nora scrive i copioni, Ava genera, il comparto Reel monta),
     "note_gestionale": null}`;
const REGOLE_PIANO = `CAPIREPARTO PRESENTI E I LORO UFFICI:
${squadraTesto()}

STILI DI VIDEO CHE IL COMPARTO REEL SA MONTARE (nel "prompt" del reel scrivi il nome dello stile): ${Object.values(GENERI).map((g) => g.nome).join(', ')}.
Per un "Talking head educativo con grafiche" la proposta include: copione di Nora (gancio, 3 punti numerati, limiti, CTA), set da preparare (luci colorate, scrivania, tazza col logo), elenco di screenshot/foto da caricare con il girato; Johnny gira, il comparto Reel monta.

REGOLE
- Il piano deve essere fattibile con gli agenti che esistono. Attiva SOLO i reparti che servono al comando.
- Se mancano informazioni, scegli tu la soluzione più ragionevole e scrivila in "domande"; non inventare dati del cliente.
- Se il cliente non ha la scheda, il primo incarico del piano è a "brand" e gli altri che ne hanno bisogno lo aspettano ("dopo").
- Gestionale e contabilità (Gino, Dora) li attivi solo se la richiesta lo riguarda: in quel caso nel piano scrivi cosa fare in "note_gestionale".`;

// PASSO 1: riunione operativa sul comando di Johnny → le 10 proposte migliori, tutte diverse. Sceglie lui.
async function svolgiRichiesta(env, cfg, R) {
  const clienti = await all(env, 'SELECT id, nome, nicchia, (scheda IS NOT NULL) AS ha_scheda FROM clienti ORDER BY nome');
  const C = R.cliente_id ? await cliente(env, R.cliente_id) : null;
  const precedente = J(R.esito, {})?.rifai_da;
  const fatte = await giaFatte(env);
  const out = await S.claude(cfg, `Sei Alba, Direttrice di AGENZIA MOMENTO AI (agenzia di marketing, social media e creazione di contenuti). Johnny (il titolare) ti ha dato un comando.
Fai la riunione operativa con i capireparto su QUEL cliente e porta a Johnny le 10 PROPOSTE MIGLIORI, dalla più forte alla più debole. Sceglie lui: tu non fai partire niente.
REGOLA N.1: ogni proposta è un'idea DAVVERO diversa dalle altre nove (angolo, gancio, formato, struttura) e diversa da tutto ciò che l'agenzia ha già fatto, per questo cliente e per gli altri. Vietate le varianti della stessa idea.
REGOLA N.2: niente fatti inventati. Le idee partono da ciò che è vero del cliente (scheda) e della sua nicchia; ciò che va verificato sul web lo scrivi in "da_verificare".
Se Johnny chiede UN contenuto (un reel, un post, un carosello) le 10 proposte sono 10 idee per quel contenuto. Se chiede PIÙ contenuti o un periodo, sono 10 linee di calendario editoriale diverse (ognuna con i suoi contenuti in sintesi).`,
  `OGGI: ${new Date().toISOString().slice(0, 10)}
CLIENTI DELL'AGENZIA: ${clienti.map((c) => `#${c.id} ${c.nome}${c.nicchia ? ' (' + c.nicchia + ')' : ''}`).join('; ') || 'nessuno'}
${C ? `CLIENTE SELEZIONATO DA JOHNNY: #${C.id} ${C.nome}\n${(C.scheda || '').slice(0, 3000)}` : ''}
${fatte.length ? `\nGIÀ PROPOSTO O FATTO DALL'AGENZIA (vietato riproporre o fare cose simili):\n- ${fatte.join('\n- ')}` : ''}
${precedente ? `\nPROPOSTE PRECEDENTI (Johnny le ha rimandate indietro: portane di nuove):\n${precedente}` : ''}

RICHIESTA DI JOHNNY: ${R.richiesta}

Rispondi SOLO JSON:
{"titolo": "titolo breve del lavoro", "cliente_id": numero o null,
 "proposte": [{"titolo": "max 8 parole", "formato": "reel | carosello | post | calendario", "gancio": "la prima frase o immagine che ferma chi scorre", "sintesi": "2 frasi: cosa si vede e perché funziona per questa nicchia", "passi": ["3-4 passaggi del contenuto"], "da_verificare": ["fatti da controllare sul web"]}],
 "consigliata": 0,
 "messaggio": "1-2 frasi di Alba a Johnny"}
"proposte" ha ESATTAMENTE 10 voci.`, { maxTokens: 9000 });
  // nella pagina: il formato come etichetta, il gancio dentro la sintesi
  const proposte = (out.proposte || []).slice(0, 10).map((x) => ({ ...x, tempi: x.formato || undefined, sintesi: `${x.gancio ? 'Gancio: “' + x.gancio + '”. ' : ''}${x.sintesi || ''}` }));
  if (proposte.length < 2) throw new Error('la riunione non ha prodotto abbastanza proposte');
  await run(env, `UPDATE riunioni SET stato='proposte', titolo=?, verbale=?, proposte=?, consigliata=?, messaggio=?, cliente_id=COALESCE(cliente_id, ?), errore=NULL, blocco_fino=NULL, fine_visiva=?, aggiornato=? WHERE id=?`,
    String(out.titolo || R.titolo).slice(0, 120), '[]', JSON.stringify(proposte), Number(out.consigliata) || 0, String(out.messaggio || ''), Number(out.cliente_id) || null, ora(), ora(), R.id);
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', `${out.messaggio || 'Riunione finita.'} Le ${proposte.length} proposte sono qui: #/riunione/${R.id}`, ora());
  await log(env, null, 'capo', `📋 riunione #${R.id} finita: ${proposte.length} proposte, scegli tu`);
  await inviaPush(env, '📋 Proposte pronte', `${proposte.length} idee per "${String(out.titolo || R.richiesta).slice(0, 60)}": scegline una`, `#/riunione/${R.id}`).catch(() => {});
}

// PASSO 2: Johnny ha scelto. Alba scrive il piano di produzione SOLO per quell'idea.
async function pianoPerScelta(env, R, P, modifica) {
  const cfg = chi(await configurazione(env), { area: 'riunioni', agente: 'capo', cliente_id: R.cliente_id });
  const C = R.cliente_id ? await cliente(env, R.cliente_id) : null;
  const out = await S.claude(cfg, `Sei Alba, Direttrice di AGENZIA MOMENTO AI. Johnny ha scelto UNA proposta della riunione: scrivi il piano di produzione per i reparti, solo per quell'idea.
ORDINE DI LAVORO OBBLIGATO: 1) ricerca sul web dei fatti veri (Sofia) e dei video/post di riferimento della nicchia e dello stile; 2) Nora scrive il copione dalla ricerca, senza inventare nulla e senza chiedere l'approvazione di Johnny; 3) produzione del contenuto (reel, carosello o post); 4) Johnny approva solo il risultato finale.
Nei brief scrivi sempre: "usa solo fatti trovati nella ricerca o nella scheda del cliente; niente numeri, prezzi, premi o date inventati" e "il contenuto deve essere diverso da quelli già fatti".

${REGOLE_PIANO}`,
  `${C ? `CLIENTE: #${C.id} ${C.nome}\n${(C.scheda || '').slice(0, 3000)}\n` : ''}RICHIESTA ORIGINALE DI JOHNNY: ${R.richiesta}
PROPOSTA SCELTA: ${JSON.stringify(P)}${modifica ? `\nMODIFICHE DI JOHNNY (da rispettare alla lettera): ${modifica}` : ''}

Rispondi SOLO JSON: {"piano": ${SCHEMA_PIANO}, "messaggio": "1 frase: cosa parte"}`, { maxTokens: 8000 });
  if (!out.piano) throw new Error('piano non prodotto');
  return out;
}

// ------------------------------------------------------------------ riunione operativa settimanale
async function numeri(env) {
  const da = new Date(Date.now() - 7 * 864e5).toISOString();
  const q = (sql, ...a) => all(env, sql, ...a).catch(() => []);
  const [inc, perAg, cont, reel, piani, nuovi, errori, attesa, riu] = await Promise.all([
    q('SELECT stato, COUNT(*) AS n FROM incarichi WHERE aggiornato > ? GROUP BY stato', da),
    q("SELECT agente, COUNT(*) AS n FROM incarichi WHERE aggiornato > ? AND stato IN ('fatto','da_approvare','approvato') GROUP BY agente", da),
    q('SELECT stato, COUNT(*) AS n FROM contenuti WHERE aggiornato > ? GROUP BY stato', da),
    q('SELECT stato, COUNT(*) AS n FROM lavori WHERE aggiornato > ? GROUP BY stato', da),
    q('SELECT stato, COUNT(*) AS n FROM piani WHERE aggiornato > ? GROUP BY stato', da),
    q('SELECT nome, nicchia FROM clienti WHERE creato > ?', da),
    q("SELECT agente, messaggio FROM registro WHERE livello='errore' AND quando > ? ORDER BY id DESC LIMIT 15", da),
    q("SELECT i.agente, i.titolo, i.stato, k.nome AS cliente FROM incarichi i LEFT JOIN clienti k ON k.id=i.cliente_id WHERE i.stato IN ('in_coda','in_corso','errore','da_approvare') ORDER BY i.id LIMIT 30"),
    q("SELECT titolo, stato FROM riunioni WHERE tipo='richiesta' AND creato > ?", da),
  ]);
  const ufficio = (a) => SQUADRA[agId(a)]?.u || 'video';
  const perUfficio = {};
  for (const r of perAg) perUfficio[ufficio(r.agente)] = (perUfficio[ufficio(r.agente)] || 0) + r.n;
  return { periodo: `${da.slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}`, incarichi: inc, fatti_per_ufficio: perUfficio, contenuti: cont, reel, piani, clienti_nuovi: nuovi, errori, in_sospeso: attesa, richieste_di_johnny: riu };
}

async function svolgiSettimanale(env, cfg, R) {
  const N = await numeri(env);
  const out = await S.claude(cfg, `Sei il verbale della RIUNIONE OPERATIVA SETTIMANALE dei capireparto di AGENZIA MOMENTO AI, in direzione, guidata dalla Direttrice Alba.
Si parla dell'andamento dell'agenzia nella settimana appena passata, usando SOLO i numeri forniti (non inventarne altri: se un dato manca, dillo).
CAPIREPARTO:
${squadraTesto()}
Ogni capo fa il punto del suo reparto (fatto, problemi, cosa farà la prossima settimana), poi si decidono priorità e cose da chiedere a Johnny.`,
  `NUMERI DELLA SETTIMANA (dal sistema): ${JSON.stringify(N)}

Rispondi SOLO JSON:
{"titolo": "Riunione operativa settimana ...",
 "sintesi": "3-4 frasi per Johnny: come è andata la settimana",
 "numeri": [{"etichetta": "...", "valore": "..."}],
 "reparti": [{"ufficio": "...", "capo": "nome", "fatto": "...", "problemi": "... o nessuno", "prossima_settimana": "..."}],
 "decisioni": ["..."], "priorita": ["le 3-5 priorità della settimana"], "per_johnny": ["cosa serve da Johnny: approvazioni, materiali, decisioni"],
 "verbale": [{"chi": "id del capo (${SETTIMANALE.join(', ')})", "testo": "intervento di 1-3 frasi"}],
 "messaggio": "messaggio di Alba a Johnny in 2 frasi"}`, { maxTokens: 10000 });
  const fine = ora(); // niente sala meeting
  await run(env, `UPDATE riunioni SET stato='report', titolo=?, verbale=?, report=?, messaggio=?, errore=NULL, blocco_fino=NULL, fine_visiva=?, aggiornato=? WHERE id=?`,
    String(out.titolo || 'Riunione operativa settimanale').slice(0, 120), JSON.stringify(out.verbale || []), JSON.stringify({ ...out, verbale: undefined, dati: N }), String(out.messaggio || ''), fine, ora(), R.id);
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', `${out.messaggio || 'Riunione operativa finita.'} Il report è qui: #/riunione/${R.id}`, ora());
  await log(env, null, 'capo', `📊 riunione operativa #${R.id} finita: report pronto`);
}

export async function convocaSettimanale(env, manuale = false) {
  const aperta = await one(env, "SELECT id FROM riunioni WHERE tipo='settimanale' AND stato='in_corso'");
  if (aperta) return aperta.id;
  const r = await one(env, `INSERT INTO riunioni (tipo, stato, partecipanti, titolo, creato, aggiornato) VALUES ('settimanale','in_corso',?,?,?,?) RETURNING id`,
    JSON.stringify(SETTIMANALE), 'Riunione operativa settimanale', ora(), ora());
  await log(env, null, 'capo', `🗓️ riunione operativa settimanale #${r.id} in direzione${manuale ? ' (convocata da Johnny)' : ''}`);
  return r.id;
}


// cron: svolge le riunioni aperte (la settimanale la apre il primo comando della settimana)
export async function avanzaRiunioni(env) {
  await schemaRiunioni(env);
  const adesso = ora();
  const aperte = await all(env, "SELECT * FROM riunioni WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 2", adesso);
  if (!aperte.length) return;
  const cfg = await configurazione(env);
  await Promise.allSettled(aperte.map(async (R0) => {
    const R = await one(env, "UPDATE riunioni SET blocco_fino=?, tentativi=tentativi+1, aggiornato=? WHERE id=? AND stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) RETURNING *",
      new Date(Date.now() + 10 * 60e3).toISOString(), ora(), R0.id, adesso);
    if (!R) return;
    const cfgR = chi(cfg, { area: 'riunioni', agente: 'capo', cliente_id: R.cliente_id });
    try { if (R.tipo === 'settimanale') await svolgiSettimanale(env, cfgR, R); else await svolgiRichiesta(env, cfgR, R); }
    catch (e) {
      const msg = String(e?.message || e).slice(0, 400);
      const credito = /credit balance|billing/i.test(msg);
      const stop = !credito && (R.tentativi >= 3 || /manca la chiave/.test(msg));
      await run(env, 'UPDATE riunioni SET stato=?, errore=?, blocco_fino=?, tentativi=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso',
        credito ? 'Credito Claude esaurito: la riunione riparte da sola quando lo ricarichi' : msg,
        stop ? null : new Date(Date.now() + (credito ? 10 : 2) * 60e3).toISOString(), credito ? 0 : R.tentativi, ora(), R.id);
      await log(env, null, 'capo', credito ? '⏸️ riunione in pausa: credito Claude esaurito' : `${stop ? '❌' : '⚠️'} riunione #${R.id}: ${msg}`, stop || credito ? 'errore' : 'warn');
    }
  }));
}

// ------------------------------------------------------------------ Johnny sceglie
async function scegli(env, R, indice, modifica) {
  const proposte = J(R.proposte, []);
  const P = proposte[indice];
  if (!P) throw new Error('proposta non trovata');
  let piano = P.piano || {}, messaggio = `Perfetto, parto con "${P.titolo}".`;
  if (!P.piano) { const o = await pianoPerScelta(env, R, P, modifica); piano = o.piano; messaggio = o.messaggio || messaggio; }
  else if (modifica) {
    const cfg = chi(await configurazione(env), { area: 'riunioni', agente: 'capo', cliente_id: R.cliente_id });
    const out = await S.claude(cfg, `Sei Alba, Direttrice di AGENZIA MOMENTO AI. Johnny ha scelto una proposta della riunione ma vuole delle modifiche. Aggiorna il piano rispettando ESATTAMENTE le sue modifiche e lo stesso formato. Agenti disponibili per gli incarichi: ${DELEGABILI.join(', ')}.`,
      `RICHIESTA ORIGINALE: ${R.richiesta}\nPROPOSTA SCELTA: ${JSON.stringify(P)}\nMODIFICHE DI JOHNNY: ${modifica}\n\nRispondi SOLO JSON: {"piano": {stesso formato del piano}, "messaggio": "conferma breve a Johnny di cosa parte"}`, { maxTokens: 10000 });
    piano = out.piano || piano; messaggio = out.messaggio || messaggio;
  }
  const origine = `Deciso nella riunione #${R.id} dei capireparto (proposta "${P.titolo}")${modifica ? '. Modifiche di Johnny: ' + modifica : ''}.`;
  const esito = await eseguiPiano(env, piano, R.richiesta, R.cliente_id, origine);
  await run(env, "UPDATE riunioni SET stato='decisa', scelta=?, modifica=?, esito=?, aggiornato=? WHERE id=?", indice, modifica || null, JSON.stringify({ ...esito, piano }), ora(), R.id);
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', messaggio, ora());
  if (piano.note_gestionale) await log(env, null, 'gestionale', '🗄️ dalla riunione: ' + String(piano.note_gestionale).slice(0, 200), 'warn');
  return { messaggio, ...esito };
}

// ------------------------------------------------------------------ API
export async function apiRiunioni(req, env, p, m, json) {
  await schemaRiunioni(env);
  const corpo = () => req.json().catch(() => ({}));
  if (p === '/api/capo' && m === 'POST') {
    const d = await corpo();
    if (String(d.testo || '').trim().length < 3) return json({ errore: 'scrivi la richiesta' }, 400);
    return json(await chiediDirettrice(env, String(d.testo).trim().slice(0, 4000), Number(d.cliente_id) || null));
  }
  if (p === '/api/riunioni' && m === 'GET') {
    const adesso = ora();
    const L = await all(env, `SELECT r.id, r.tipo, r.stato, r.titolo, r.richiesta, r.partecipanti, r.messaggio, r.consigliata, r.scelta, r.errore, r.fine_visiva, r.creato, r.aggiornato, k.nome AS cliente
      FROM riunioni r LEFT JOIN clienti k ON k.id=r.cliente_id ORDER BY r.id DESC LIMIT 60`);
    return json(L.map((r) => ({ ...r, partecipanti: J(r.partecipanti, []), in_sala: r.stato === 'in_corso' || (r.fine_visiva && r.fine_visiva > adesso) })));
  }
  if (p === '/api/riunioni/settimanale' && m === 'POST') return json({ id: await convocaSettimanale(env, true) });
  const mm = p.match(/^\/api\/riunioni\/(\d+)(?:\/(scegli|rifai))?$/);
  if (!mm) return null;
  const R = await one(env, 'SELECT r.*, k.nome AS cliente FROM riunioni r LEFT JOIN clienti k ON k.id=r.cliente_id WHERE r.id=?', mm[1]);
  if (!R) return json({ errore: 'riunione non trovata' }, 404);
  if (m === 'GET' && !mm[2]) return json({ ...R, partecipanti: J(R.partecipanti, []), verbale: J(R.verbale, []), proposte: J(R.proposte, []), report: J(R.report), esito: J(R.esito), nomi: NOME });
  if (m === 'POST' && mm[2] === 'scegli') {
    if (R.stato !== 'proposte') return json({ errore: R.stato === 'decisa' ? 'hai già scelto per questa riunione' : 'la riunione non è ancora finita' }, 400);
    const d = await corpo();
    return json(await scegli(env, R, Number(d.indice) || 0, String(d.modifica || '').trim().slice(0, 3000)));
  }
  if (m === 'POST' && mm[2] === 'rifai') {
    const d = await corpo();
    const prima = J(R.proposte, []).map((x, i) => `${i + 1}. ${x.titolo}: ${x.sintesi}`).join('\n');
    await run(env, "UPDATE riunioni SET stato='chiusa', aggiornato=? WHERE id=?", ora(), R.id);
    const nuova = await one(env, `INSERT INTO riunioni (tipo, stato, richiesta, cliente_id, partecipanti, titolo, esito, creato, aggiornato) VALUES ('richiesta','in_corso',?,?,?,?,?,?,?) RETURNING id`,
      R.richiesta + (d.nota ? `\n\nINDICAZIONI DI JOHNNY PER LA NUOVA RIUNIONE: ${String(d.nota).slice(0, 2000)}` : ''), R.cliente_id, JSON.stringify(PER_RICHIESTA), R.titolo, JSON.stringify({ rifai_da: prima }), ora(), ora());
    await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', 'Va bene, riconvoco i capireparto con le tue indicazioni.', ora());
    return json({ id: nuova.id });
  }
  if (m === 'DELETE') { await run(env, 'DELETE FROM riunioni WHERE id=?', R.id); return json({ ok: true }); }
  return null;
}
