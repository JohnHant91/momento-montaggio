// D1: tabelle, impostazioni e registro attività.
export const ora = () => new Date().toISOString();
export const J = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };

export const all = async (env, sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
export const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
export const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();

let pronto = false;
export async function schema(env) {
  if (pronto) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)'),
  ]);
  // colonne aggiunte dopo (motore GitHub): se esistono già l'errore si ignora
  for (const c of ['motore_pass TEXT', 'motore_fino TEXT', 'motore_visto TEXT']) {
    try { await env.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${c}`).run(); } catch {}
  }
  pronto = true;
}

export async function log(env, lavoroId, agente, messaggio, livello = 'info') {
  await run(env, 'INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)',
    lavoroId, agente, String(messaggio).slice(0, 600), livello, ora());
}

export const CHIAVI_SEGRETE = ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'YOUTUBE_API_KEY', 'APIFY_TOKEN'];
export const CHIAVI_OPZIONI = ['CLAUDE_MODEL', 'GEMINI_MODELS', 'APIFY_TIKTOK_ACTOR', 'APIFY_INSTAGRAM_ACTOR', 'NUM_RIFERIMENTI', 'DURATA_MAX', 'MESI_RICERCA', 'FPS_ANALISI'];

// configurazione: i segreti di Cloudflare hanno la precedenza su quelli salvati dalla pagina Impostazioni
export async function configurazione(env) {
  const salvate = Object.fromEntries((await all(env, 'SELECT chiave, valore FROM impostazioni')).map((r) => [r.chiave, r.valore]));
  const v = (k, d) => env[k] || salvate[k] || d;
  return {
    ANTHROPIC_API_KEY: v('ANTHROPIC_API_KEY'), GEMINI_API_KEY: v('GEMINI_API_KEY'),
    YOUTUBE_API_KEY: v('YOUTUBE_API_KEY'), APIFY_TOKEN: v('APIFY_TOKEN'),
    CLAUDE_MODEL: v('CLAUDE_MODEL', 'claude-sonnet-5-5'), WEB_SEARCH_TOOL: v('WEB_SEARCH_TOOL', 'web_search_20250305'),
    GEMINI_MODELS: String(v('GEMINI_MODELS', 'gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash')).split(',').map((s) => s.trim()).filter(Boolean),
    APIFY_TIKTOK_ACTOR: v('APIFY_TIKTOK_ACTOR', 'clockworks/tiktok-scraper'),
    APIFY_INSTAGRAM_ACTOR: v('APIFY_INSTAGRAM_ACTOR', 'apify/instagram-scraper'),
    NUM_RIFERIMENTI: Number(v('NUM_RIFERIMENTI', 9)), DURATA_MAX: Number(v('DURATA_MAX', 90)),
    MESI_RICERCA: Number(v('MESI_RICERCA', 18)), FPS_ANALISI: Number(v('FPS_ANALISI', 4)),
    _salvate: salvate, _env: Object.fromEntries(CHIAVI_SEGRETE.map((k) => [k, !!env[k]])),
  };
}
