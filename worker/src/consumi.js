// CONTATORI DEI COSTI: ogni chiamata a pagamento (Claude, ricerche web, HeyGen) lascia una riga in "consumi"
// con chi l'ha fatta (agente, cliente, reel, piano del profilo). La pagina Costi somma tutto e fa la proiezione sul mese.
import { all, one, run, ora, configurazione } from './db.js';

// prezzi di listino in dollari per milione di token (input, output); cache: scrittura 1,25x input, lettura 0,1x input
const PREZZI = [
  [/haiku/i, 0.10, 0.50],
  [/opus/i, 4, 20],
  [/sonnet/i, 2, 10],
];
const RICERCA_WEB = 0.01; // 10 $ ogni 1.000 ricerche

export function prezzoClaude(modello, u = {}) {
  const p = PREZZI.find(([re]) => re.test(modello || '')) || PREZZI[2];
  const inp = (u.in || 0) * p[1] + (u.cache_w || 0) * p[1] * 1.25 + (u.cache_r || 0) * p[1] * 0.1;
  return inp / 1e6 + ((u.out || 0) * p[2]) / 1e6 + (u.ricerche || 0) * RICERCA_WEB;
}

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoConsumi;
export function schemaConsumi(env) { return (_fattoConsumi ||= _schemaConsumi(env).catch((e) => { _fattoConsumi = null; throw e; })); }
async function _schemaConsumi(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS consumi (
    id INTEGER PRIMARY KEY AUTOINCREMENT, quando TEXT, servizio TEXT, modello TEXT, area TEXT, agente TEXT, cliente_id INTEGER, lavoro_id INTEGER, piano_id INTEGER,
    in_tok INTEGER DEFAULT 0, out_tok INTEGER DEFAULT 0, cache_r INTEGER DEFAULT 0, cache_w INTEGER DEFAULT 0, ricerche INTEGER DEFAULT 0, secondi REAL DEFAULT 0, costo REAL DEFAULT 0)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS consumi_quando ON consumi (quando)').run();
}

// uso di una chiamata Claude: usage come lo restituisce l'API (input_tokens, output_tokens, cache_*, server_tool_use)
export function daUsage(usage) {
  if (!usage) return null;
  return { in: usage.input_tokens || 0, out: usage.output_tokens || 0, cache_w: usage.cache_creation_input_tokens || 0, cache_r: usage.cache_read_input_tokens || 0, ricerche: usage.server_tool_use?.web_search_requests || 0 };
}

let pronto = false;
export async function registra(cfg, servizio, modello, u = {}, costo = null) {
  const env = cfg?._rec;
  if (!env?.DB) return;
  u = u || {};
  try {
    if (!pronto) { await schemaConsumi(env); pronto = true; }
    const c = cfg._chi || {};
    const tot = costo ?? (servizio === 'claude' ? prezzoClaude(modello, u) : 0);
    await env.DB.prepare('INSERT INTO consumi (quando, servizio, modello, area, agente, cliente_id, lavoro_id, piano_id, in_tok, out_tok, cache_r, cache_w, ricerche, secondi, costo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(ora(), servizio, modello || null, c.area || 'altro', c.agente || null, c.cliente_id || null, c.lavoro_id || null, c.piano_id || null,
        u.in || 0, u.out || 0, u.cache_r || 0, u.cache_w || 0, u.ricerche || 0, u.secondi || 0, Math.round(tot * 1e6) / 1e6).run();
  } catch (_) { /* il contatore non deve mai fermare il lavoro */ }
}

// cfg con l'etichetta di chi sta lavorando (copia: le corsie in parallelo non si mescolano)
export const chi = (cfg, etichetta) => ({ ...cfg, _chi: { ...(cfg._chi || {}), ...etichetta } });

// ------------------------------------------------------------------ API della pagina Costi
export async function apiConsumi(req, env, p, m, json) {
  // saldo Claude: Anthropic non lo fa leggere via API. Johnny scrive quello che vede nella Console, da lì scalo la spesa contata dall'agenzia
  if (p === '/api/consumi' && m === 'POST') {
    const d = await req.json().catch(() => ({})), v = Number(String(d.saldo ?? '').replace(',', '.'));
    if (!(v >= 0) || v > 100000) return json({ errore: 'scrivi il saldo in dollari, es. 23.50' }, 400);
    await env.DB.prepare('INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)').bind('SALDO_CLAUDE', JSON.stringify({ dollari: v, quando: ora() })).run();
    return json({ ok: true });
  }
  if (p !== '/api/consumi' || m !== 'GET') return null;
  await schemaConsumi(env);
  const url = new URL(req.url);
  const giorni = Math.min(365, Math.max(1, Number(url.searchParams.get('giorni')) || 30));
  const da = new Date(Date.now() - giorni * 864e5).toISOString();
  const cfg = await configurazione(env);
  const q = (sql, ...a) => all(env, sql, da, ...a);
  const [totale, servizi, aree, agenti, clienti, reel, profilo, giornaliero, mese] = await Promise.all([
    one(env, 'SELECT COALESCE(SUM(costo),0) AS costo, COUNT(*) AS chiamate, COALESCE(SUM(in_tok),0) AS in_tok, COALESCE(SUM(out_tok),0) AS out_tok, COALESCE(SUM(ricerche),0) AS ricerche, COALESCE(SUM(secondi),0) AS secondi, MIN(quando) AS primo FROM consumi WHERE quando > ?', da),
    q('SELECT servizio, SUM(costo) AS costo, COUNT(*) AS n FROM consumi WHERE quando > ? GROUP BY servizio ORDER BY costo DESC'),
    q('SELECT area, SUM(costo) AS costo, COUNT(*) AS n FROM consumi WHERE quando > ? GROUP BY area ORDER BY costo DESC'),
    q('SELECT agente, SUM(costo) AS costo, COUNT(*) AS n FROM consumi WHERE quando > ? AND agente IS NOT NULL GROUP BY agente ORDER BY costo DESC LIMIT 40'),
    q('SELECT c.cliente_id, k.nome, SUM(c.costo) AS costo, COUNT(*) AS n FROM consumi c LEFT JOIN clienti k ON k.id = c.cliente_id WHERE c.quando > ? AND c.cliente_id IS NOT NULL GROUP BY c.cliente_id ORDER BY costo DESC').catch(() => []),
    q("SELECT c.lavoro_id, json_extract(l.scheda, '$.titolo_lavoro') AS titolo, substr(l.prompt, 1, 80) AS prompt, l.stato, SUM(c.costo) AS costo, COUNT(*) AS n FROM consumi c LEFT JOIN lavori l ON l.id = c.lavoro_id WHERE c.quando > ? AND c.lavoro_id IS NOT NULL GROUP BY c.lavoro_id ORDER BY c.lavoro_id DESC LIMIT 40"),
    q('SELECT c.piano_id, a.argomento, a.numero, SUM(c.costo) AS costo, COUNT(*) AS n FROM consumi c LEFT JOIN avatar_piani a ON a.id = c.piano_id WHERE c.quando > ? AND c.piano_id IS NOT NULL GROUP BY c.piano_id ORDER BY c.piano_id DESC LIMIT 20').catch(() => []),
    q('SELECT substr(quando, 1, 10) AS giorno, SUM(costo) AS costo FROM consumi WHERE quando > ? GROUP BY giorno ORDER BY giorno'),
    one(env, 'SELECT COALESCE(SUM(costo),0) AS costo FROM consumi WHERE quando >= ?', new Date().toISOString().slice(0, 8) + '01'),
  ]);
  // costi fissi: "nome:dollari" separati da virgola, modificabili in Impostazioni
  const fissi = String(cfg.COSTI_FISSI || '').split(',').map((x) => x.split(':')).filter((x) => x[0]?.trim()).map(([n, v]) => ({ nome: n.trim(), dollari: Number(v) || 0 }));
  const fissiTot = fissi.reduce((s, f) => s + f.dollari, 0);
  // proiezione: media al giorno dei giorni con dati (al massimo i giorni scelti) × 30
  const giorniDati = totale.primo ? Math.max(1, Math.min(giorni, (Date.now() - new Date(totale.primo).getTime()) / 864e5)) : 0;
  const alGiorno = giorniDati ? totale.costo / giorniDati : 0;
  let saldo = null;
  try {
    const S = JSON.parse((await one(env, "SELECT valore FROM impostazioni WHERE chiave='SALDO_CLAUDE'"))?.valore || 'null');
    if (S) {
      const sp = await one(env, "SELECT COALESCE(SUM(costo),0) AS costo FROM consumi WHERE servizio='claude' AND quando > ?", S.quando);
      const set = await one(env, "SELECT COALESCE(SUM(costo),0) AS costo FROM consumi WHERE servizio='claude' AND quando > ?", new Date(Date.now() - 7 * 864e5).toISOString());
      const alG = set.costo / 7, residuo = S.dollari - sp.costo;
      saldo = { iniziale: S.dollari, quando: S.quando, speso: sp.costo, residuo, al_giorno: alG, giorni: alG > 0.001 ? Math.max(0, residuo / alG) : null };
    }
  } catch (_) {}
  return json({
    giorni, saldo, totale, servizi, aree, agenti, clienti, reel, profilo, giornaliero, fissi, fissi_totale: fissiTot,
    questo_mese: mese.costo, al_giorno: alGiorno, proiezione_mese: alGiorno * 30 + fissiTot, giorni_con_dati: giorniDati,
    cambio: Number(cfg.CAMBIO_USD_EUR) || 0.86, heygen_minuto: Number(cfg.HEYGEN_DOLLARI_MINUTO) || 1,
  });
}
