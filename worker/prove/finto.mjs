// Ambiente finto per le prove: D1 su sqlite, KV in memoria, Claude simulato, worker vero (dist/).
import { DatabaseSync } from 'node:sqlite';


// ---------------------------------------------------------------- D1 finto
function d1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => ({ results: db.prepare(sql).all(...args.map(v)) }),
    first: async () => { const r = db.prepare(sql).all(...args.map(v)); return r[0] ?? null; },
    run: async () => { const r = db.prepare(sql).run(...args.map(v)); return { success: true, meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
    raw: async () => db.prepare(sql).all(...args.map(v)).map((o) => Object.values(o)),
  });
  const v = (x) => (x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x);
  return { prepare: (sql) => stmt(sql), batch: async (L) => { const out = []; for (const s of L) out.push(await s.run()); return out; }, exec: async (sql) => { db.exec(sql); return {}; }, _db: db };
}
// ---------------------------------------------------------------- KV finto
function kv() {
  const m = new Map();
  const conv = (val, tipo) => {
    if (val == null) return null;
    if (tipo === 'arrayBuffer') return val instanceof ArrayBuffer ? val : val.buffer ? val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength) : new TextEncoder().encode(String(val)).buffer;
    if (tipo === 'json') return JSON.parse(typeof val === 'string' ? val : new TextDecoder().decode(val));
    if (tipo === 'stream') return new Response(val).body;
    return typeof val === 'string' ? val : new TextDecoder().decode(val);
  };
  return {
    get: async (k, o) => { const e = m.get(k); return e ? conv(e.v, typeof o === 'string' ? o : o?.type) : null; },
    getWithMetadata: async (k, o) => { const e = m.get(k); return { value: e ? conv(e.v, typeof o === 'string' ? o : o?.type) : null, metadata: e?.md ?? null }; },
    put: async (k, val, o) => { let x = val; if (val instanceof ReadableStream) x = new Uint8Array(await new Response(val).arrayBuffer()); else if (ArrayBuffer.isView(val)) x = new Uint8Array(val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength)); m.set(k, { v: x, md: o?.metadata ?? null }); },
    delete: async (k) => { m.delete(k); },
    list: async (o = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(o.prefix || '')).map((name) => ({ name, metadata: m.get(name).md })), list_complete: true }),
    _m: m,
  };
}

// ---------------------------------------------------------------- Claude finto
const chiamateClaude = [];
export const stato = { modoClaude: 'ok' };
function rispostaClaude(body) {
  const sys = typeof body.system === 'string' ? body.system : JSON.stringify(body.system);
  const msg = JSON.stringify(body.messages);
  chiamateClaude.push(sys.slice(0, 60));
  if (sys.includes('RIUNIONE PREVENTIVA')) return {
    titolo: 'Post di dicembre per Villetta Prova',
    verbale: [{ chi: 'capo', testo: 'Apro la riunione.' }, { chi: 'stratega', testo: 'Serve la strategia.' }, { chi: 'calendario', testo: 'Calendario pronto in un giorno.' }, { chi: 'capo', testo: 'Chiudo.' }],
    proposte: [
      { titolo: 'Essenziale', sintesi: 'Solo post.', passi: ['Giulia scrive 6 post'], reparti: ['social'], tempi: '1 giorno', pro: 'veloce', contro: 'poco', domande: [],
        piano: { cliente_id: null, nuovo_cliente: { nome: 'Villetta Prova', nicchia: 'B&B' }, incarichi: [{ agente: 'brand', titolo: 'Scheda cliente', brief: 'scrivi la scheda', dopo: null }, { agente: 'copywriter', titolo: '6 post di dicembre', brief: 'post romantici', dopo: 0 }, { agente: 'caroselli', titolo: 'Carosello Natale', brief: 'carosello', dopo: 0 }, { agente: 'inesistente', titolo: 'x', brief: 'x' }], reel: null, copioni: null, note_gestionale: null } },
      { titolo: 'Completa', sintesi: 'Post e reel.', passi: ['post', 'reel'], reparti: ['social', 'video'], tempi: '3 giorni', pro: 'completa', contro: 'lenta',
        piano: { cliente_id: null, nuovo_cliente: null, incarichi: [{ agente: 'copywriter', titolo: 'post', brief: 'b', dopo: null }], reel: { prompt: 'reel romantico', pcloud: null }, copioni: { argomenti: ['camere', 'colazione'], numero: 4, mesi: 1 } } },
    ],
    consigliata: 0, messaggio: 'Riunione finita, vi consiglio la prima.',
  };
  if (sys.includes('RIUNIONE OPERATIVA SETTIMANALE')) return {
    titolo: 'Riunione operativa settimana 47', sintesi: 'Settimana tranquilla.', numeri: [{ etichetta: 'Incarichi fatti', valore: '3' }],
    reparti: [{ ufficio: 'Social', capo: 'Rita', fatto: '6 post', problemi: 'nessuno', prossima_settimana: 'calendario' }],
    decisioni: ['Avanti così'], priorita: ['Approvare i post'], per_johnny: ['Approva i post'], verbale: [{ chi: 'capo', testo: 'Inizio.' }], messaggio: 'Report pronto.',
  };
  if (sys.includes('vuole delle modifiche')) return { piano: { cliente_id: null, nuovo_cliente: null, incarichi: [{ agente: 'copywriter', titolo: 'post modificati', brief: 'tono ironico', dopo: null }], reel: null, copioni: null }, messaggio: 'Parto con le tue modifiche.' };
  if (msg.includes('INCARICO #')) {
    const brand = sys.includes('Sei Bianca');
    return { titolo: 'Fatto', sintesi: 'ok', documento: brand ? '# Scheda\nB&B romantico' : '# Lavoro', contenuti: brand ? [] : [{ tipo: 'post', piattaforma: 'instagram', data: '2026-12-01', ora: '18:00', titolo: 'Post 1', testo: 'Testo', visual: 'foto', hashtag: ['#bnb'] }], passa_a: [], domande: [] };
  }
  return { risposta: 'ok' };
}
function sse(obj) {
  const testo = JSON.stringify(obj);
  const ev = [{ type: 'message_start' }, { type: 'content_block_delta', delta: { type: 'text_delta', text: testo } }, { type: 'message_delta', delta: { stop_reason: 'end_turn' } }];
  return ev.map((e) => 'event: x\ndata: ' + JSON.stringify(e) + '\n\n').join('');
}
let giroGest = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) {
    if (stato.modoClaude === 'credito') return new Response(JSON.stringify({ type: 'error', error: { message: 'Your credit balance is too low to access the Anthropic API' } }), { status: 400 });
    const body = JSON.parse(opts.body);
    if (body.tools) { // chat del gestionale con strumenti
      const ultimo = body.messages.at(-1).content;
      if (typeof ultimo === 'string') return Response.json({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'crea', input: { sezione: 'eventi', campi: { titolo: 'Shooting', data: '2026-12-12', tipo: 'Shooting' } } }] });
      return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Fatto: shooting segnato il 12.' }] });
    }
    return new Response(sse(rispostaClaude(body)), { headers: { 'content-type': 'text/event-stream' } });
  }
  if (u.includes('api.github.com')) return new Response('', { status: 204 });
  return new Response('{}', { status: 200 });
};

// ---------------------------------------------------------------- avvio
const m = await import('../dist/momento-reel.js');
export const W = m.default;
export const GEST = d1();
GEST._db.exec(`CREATE TABLE records (store TEXT, id TEXT, data TEXT, updated TEXT, by_user TEXT); CREATE TABLE log (ts TEXT, user_id TEXT, nome TEXT, azione TEXT, store TEXT, rec_id TEXT, titolo TEXT);
  CREATE TABLE users (id TEXT, nome TEXT, username TEXT, ruolo TEXT, attivo INTEGER); INSERT INTO users VALUES ('u1','Johnny','johnny','admin',1);`);
export const env = { DB: d1(), GEST, VIDEO: kv(), ADMIN_PASSWORD: 'provaprova', ANTHROPIC_API_KEY: 'sk-finto', CLAUDE_MODEL: 'claude-test' };
const ctx = { waitUntil: (p) => attese.push(p), passThroughOnException() {} };
let attese = [];
let biscotto = '';
export async function chiama(path, { method = 'GET', body, grezzo } = {}) {
  const r = await W.fetch(new Request('https://x' + path, { method, headers: { cookie: biscotto, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env, ctx);
  const sc = r.headers.get('set-cookie'); if (sc) biscotto = sc.split(';')[0];
  if (grezzo) return r;
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}
export async function cron(n = 1) { for (let i = 0; i < n; i++) { attese = []; await W.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, env, ctx); const r = await Promise.allSettled(attese); r.filter((x) => x.status === 'rejected').forEach((x) => console.log('    [cron errore]', String(x.reason).slice(0, 200))); } }
export const sblocca = (tab) => env.DB._db.exec(`UPDATE ${tab} SET blocco_fino=NULL`);

