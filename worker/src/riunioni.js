// RIUNIONI · Johnny parla solo con la Direttrice (Alba).
// 1) Ogni sua richiesta: Alba convoca i capireparto in SALA MEETING, discutono e preparano 2-3 proposte.
//    Johnny ne sceglie una (o la modifica) e solo allora partono gli uffici.
// 2) Ogni lunedì mattina: riunione operativa in DIREZIONE sull'andamento dell'agenzia, con report per Johnny.
import { all, one, run, J, ora, configurazione, log } from './db.js';
import * as S from './servizi.js';
import { SQUADRA, DELEGABILI, cliente, eseguiPiano } from './agenzia.js';

// capireparto: [ufficio, id agente, nome, ruolo]
export const CAPI = [
  ['direzione', 'capo', 'Alba', 'Direttrice'],
  ['marketing', 'stratega', 'Marco', 'capo Marketing'],
  ['social', 'calendario', 'Rita', 'capo Social'],
  ['video', 'direttore', 'Leo', 'capo Video (direttore creativo del comparto Reel)'],
  ['foto', 'fotografo', 'Ugo', 'capo Foto'],
  ['web', 'web', 'Walter', 'capo Web & E-commerce'],
  ['booking', 'booking', 'Bea', 'capo Booking & WhatsApp'],
  ['gestionale', 'gestionale', 'Gino', 'capo Gestionale'],
  ['contabilita', 'contabile', 'Dora', 'capo Contabilità'],
];
const PER_RICHIESTA = ['capo', 'stratega', 'calendario', 'direttore', 'fotografo', 'web', 'booking'];
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
export async function chiediDirettrice(env, testo, clienteId) {
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'user', testo, ora());
  const r = await one(env, `INSERT INTO riunioni (tipo, stato, richiesta, cliente_id, partecipanti, titolo, creato, aggiornato) VALUES ('richiesta','in_corso',?,?,?,?,?,?) RETURNING id`,
    testo, clienteId || null, JSON.stringify(PER_RICHIESTA), testo.slice(0, 80), ora(), ora());
  const risposta = 'Ricevuto. Convoco subito i capireparto in sala meeting: tra qualche minuto ti porto le proposte e scegli tu come procedere.';
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant', risposta, ora());
  await log(env, null, 'capo', `🗣️ riunione #${r.id} in sala meeting: ${testo.slice(0, 80)}`);
  return { risposta, riunione: r.id, incarichi: [] };
}

async function svolgiRichiesta(env, cfg, R) {
  const clienti = await all(env, 'SELECT id, nome, nicchia, (scheda IS NOT NULL) AS ha_scheda FROM clienti ORDER BY nome');
  const C = R.cliente_id ? await cliente(env, R.cliente_id) : null;
  const precedente = J(R.esito, {})?.rifai_da;
  const out = await S.claude(cfg, `Sei il verbale vivo della RIUNIONE PREVENTIVA dei capireparto di AGENZIA MOMENTO AI (Momento Produzione: video, foto, social, siti ed e-commerce per clienti di ogni nicchia).
Johnny (il titolare) ha fatto una richiesta alla Direttrice. Prima di far partire qualsiasi lavoro, i capireparto si riuniscono e preparano 2 o 3 PROPOSTE davvero diverse
(per esempio: essenziale e veloce / completa / più ambiziosa, oppure strade creative diverse). Johnny sceglierà.

CAPIREPARTO PRESENTI E I LORO UFFICI:
${squadraTesto()}

REGOLE
- La discussione è concreta e breve: ogni capo parla solo per il suo reparto, dice cosa serve, rischi, tempi. Niente frasi di circostanza.
- Le proposte devono essere fattibili con gli agenti che esistono. Per ogni proposta scrivi anche il "piano" esatto da eseguire se Johnny la sceglie.
- Se mancano informazioni importanti, dillo nella proposta (campo "domande"), non inventare dati del cliente.
- Se il cliente non ha la scheda, il primo incarico del piano è a "brand" e gli altri che ne hanno bisogno lo aspettano ("dopo").
- Gestionale e contabilità (Gino, Dora) li attivi solo se la richiesta lo riguarda: in quel caso nel piano scrivi cosa fare in "note_gestionale".`,
  `OGGI: ${new Date().toISOString().slice(0, 10)}
CLIENTI DELL'AGENZIA: ${clienti.map((c) => `#${c.id} ${c.nome}${c.nicchia ? ' (' + c.nicchia + ')' : ''}${c.ha_scheda ? '' : ' [senza scheda]'}`).join('; ') || 'nessuno'}
${C ? `CLIENTE SELEZIONATO DA JOHNNY: #${C.id} ${C.nome}\n${(C.scheda || '').slice(0, 3000)}` : ''}
${precedente ? `\nPROPOSTE DELLA RIUNIONE PRECEDENTE (Johnny le ha rimandate indietro):\n${precedente}` : ''}

RICHIESTA DI JOHNNY: ${R.richiesta}

Rispondi SOLO JSON:
{"titolo": "titolo breve della riunione",
 "verbale": [{"chi": "id del capo (${PER_RICHIESTA.join(', ')})", "testo": "intervento di 1-3 frasi"}],
 "proposte": [{"titolo": "...", "sintesi": "2-3 frasi", "passi": ["cosa fa ogni reparto, in ordine"], "reparti": ["marketing", "social", ...], "tempi": "es. 2 giorni", "pro": "...", "contro": "...", "domande": ["..."],
   "piano": {"cliente_id": numero o null, "nuovo_cliente": {"nome": "...", "nicchia": "..."} o null,
     "incarichi": [{"agente": "uno di: ${DELEGABILI.join(', ')}", "titolo": "...", "brief": "brief completo e autonomo", "dopo": null}],
     "reel": {"prompt": "descrizione completa del reel", "pcloud": "link o null"} o null,
     "copioni": {"argomenti": ["..."], "numero": 20, "mesi": 3} o null, "note_gestionale": null}}],
 "consigliata": indice della proposta che la riunione consiglia,
 "messaggio": "messaggio di Alba a Johnny: com'è andata la riunione e cosa consiglia, in 2-3 frasi"}
Il verbale ha 6-12 interventi; parlano solo i capi presenti; Alba apre e chiude.`, { maxTokens: 14000 });
  const proposte = (out.proposte || []).slice(0, 3);
  if (!proposte.length) throw new Error('la riunione non ha prodotto proposte');
  const fine = new Date(Math.max(Date.now() + 30e3, new Date(R.creato).getTime() + DURATA_VISIVA)).toISOString();
  await run(env, `UPDATE riunioni SET stato='proposte', titolo=?, verbale=?, proposte=?, consigliata=?, messaggio=?, errore=NULL, blocco_fino=NULL, fine_visiva=?, aggiornato=? WHERE id=?`,
    String(out.titolo || R.titolo).slice(0, 120), JSON.stringify(out.verbale || []), JSON.stringify(proposte), Number(out.consigliata) || 0, String(out.messaggio || ''), fine, ora(), R.id);
  await run(env, 'INSERT INTO chat (canale, ruolo, testo, quando) VALUES (?,?,?,?)', 'capo', 'assistant',
    `${out.messaggio || 'Riunione finita.'} Le proposte sono qui: #/riunione/${R.id}`, ora());
  await log(env, null, 'capo', `📋 riunione #${R.id} finita: ${proposte.length} proposte da scegliere`);
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
  const ufficio = (a) => SQUADRA[a]?.u || 'video';
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
  const fine = new Date(Math.max(Date.now() + 30e3, new Date(R.creato).getTime() + DURATA_VISIVA)).toISOString();
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

function oraRoma() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { giorno: p.weekday, ora: Number(p.hour) };
}

// cron: ogni lunedì dalle 9 la riunione operativa; poi svolge le riunioni aperte
export async function avanzaRiunioni(env) {
  await schemaRiunioni(env);
  const { giorno, ora: h } = oraRoma();
  if (giorno === 'Mon' && h >= 9) {
    const ultima = await one(env, "SELECT creato FROM riunioni WHERE tipo='settimanale' ORDER BY id DESC LIMIT 1");
    if (!ultima || Date.now() - new Date(ultima.creato).getTime() > 6 * 864e5) await convocaSettimanale(env);
  }
  const adesso = ora();
  const aperte = await all(env, "SELECT * FROM riunioni WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 2", adesso);
  if (!aperte.length) return;
  const cfg = await configurazione(env);
  await Promise.allSettled(aperte.map(async (R0) => {
    const R = await one(env, "UPDATE riunioni SET blocco_fino=?, tentativi=tentativi+1, aggiornato=? WHERE id=? AND stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) RETURNING *",
      new Date(Date.now() + 10 * 60e3).toISOString(), ora(), R0.id, adesso);
    if (!R) return;
    try { if (R.tipo === 'settimanale') await svolgiSettimanale(env, cfg, R); else await svolgiRichiesta(env, cfg, R); }
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
  if (modifica) {
    const cfg = await configurazione(env);
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
