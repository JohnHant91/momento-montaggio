// Momento Reel · Worker Cloudflare: pagina regia + API + cron che fa lavorare gli agenti.
import { CHIAVI_OPZIONI, CHIAVI_SEGRETE, J, all, configurazione, log, one, ora, run, schema } from './db.js';
import { avanza } from './lavoro.js';
import { motoreApi } from './motore.js';
import { PAGINA } from './pagina.js';

const json = (d, status = 200, extra = {}) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function hashPassword(env) {
  if (env.ADMIN_PASSWORD) return sha('momento-reel|' + env.ADMIN_PASSWORD);
  return (await one(env, "SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore || null;
}
async function firma(hash) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(hash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('momento-reel-sessione')));
}
async function autorizzato(req, env) {
  const h = await hashPassword(env);
  if (!h) return false;
  const c = /(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(req.headers.get('cookie') || '');
  return !!c && c[1] === await firma(h);
}
const cookie = (v, maxAge) => `mr_s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function api(req, env, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/stato') return json({ configurato: !!(await hashPassword(env)), dentro: await autorizzato(req, env) });

  if (p === '/api/accedi' && m === 'POST') {
    const { password } = await req.json().catch(() => ({}));
    if (!password || String(password).length < 6) return json({ errore: 'password di almeno 6 caratteri' }, 400);
    let h = await hashPassword(env);
    const nuovo = sha('momento-reel|' + password);
    if (!h) { // primo accesso: la password scelta diventa quella della regia
      h = await nuovo;
      await run(env, "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)", h);
    } else if (await nuovo !== h) return json({ errore: 'password errata' }, 401);
    return json({ ok: true }, 200, { 'set-cookie': cookie(await firma(h), 60 * 60 * 24 * 60) });
  }
  if (p === '/api/esci') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });

  if (!(await autorizzato(req, env))) return json({ errore: 'accesso richiesto' }, 401);

  if (p === '/api/impostazioni' && m === 'GET') {
    const cfg = await configurazione(env);
    const segreti = Object.fromEntries(CHIAVI_SEGRETE.map((k) => {
      const v = cfg[k];
      return [k, { impostata: !!v, da_cloudflare: cfg._env[k], anteprima: v ? '••••' + String(v).slice(-4) : '' }];
    }));
    const opzioni = Object.fromEntries(CHIAVI_OPZIONI.map((k) => [k, Array.isArray(cfg[k]) ? cfg[k].join(',') : cfg[k]]));
    return json({ segreti, opzioni });
  }
  if (p === '/api/impostazioni' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const stmt = [];
    for (const k of [...CHIAVI_SEGRETE, ...CHIAVI_OPZIONI]) {
      if (typeof d[k] !== 'string') continue;
      const v = d[k].trim();
      stmt.push(v ? env.DB.prepare('INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)').bind(k, v)
                  : env.DB.prepare('DELETE FROM impostazioni WHERE chiave=?').bind(k));
    }
    if (stmt.length) await env.DB.batch(stmt);
    return json({ ok: true });
  }

  // stato dell'ufficio: lavori aperti + ultima attività di ogni agente
  if (p === '/api/regia' && m === 'GET') {
    const [attivi, ultimi, feed, conti] = await Promise.all([
      all(env, "SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),
      all(env, 'SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid'),
      all(env, 'SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30'),
      all(env, 'SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente', new Date(Date.now() - 7 * 864e5).toISOString()),
    ]);
    const cfg = await configurazione(env);
    const chiavi = { Claude: !!cfg.ANTHROPIC_API_KEY };
    const riposo = cfg.APIFY_TOKEN ? [] : ['scout_tt', 'scout_ig'];
    return json({ adesso: ora(), attivi, ultimi, feed, conti, chiavi, riposo, yt_web: !cfg.YOUTUBE_API_KEY });
  }
  const ag = p.match(/^\/api\/regia\/agente\/([a-z_]+)$/);
  if (ag && m === 'GET') {
    return json(await all(env, 'SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40', ag[1]));
  }

  if (p === '/api/lavori' && m === 'GET') {
    const r = await all(env, "SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");
    return json(r);
  }
  if (p === '/api/lavori' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const prompt = String(d.prompt || '').trim();
    if (prompt.length < 10) return json({ errore: 'descrivi il reel in almeno una frase' }, 400);
    const cfg = await configurazione(env);
    const mancanti = [['ANTHROPIC_API_KEY', 'Claude']].filter(([k]) => !cfg[k]).map(([, n]) => n);
    if (mancanti.length) return json({ errore: `Prima inserisci le chiavi in ⚙︎ Impostazioni (mancano: ${mancanti.join(', ')})` }, 400);
    const pcloud = String(d.pcloud || '').trim() || null;
    if (pcloud && !/code=/.test(pcloud)) return json({ errore: 'il link pCloud deve essere il link pubblico della cartella (contiene "code=")' }, 400);
    const link = String(d.link_rif || '').split(/\s+/).filter((l) => /^https?:\/\//.test(l)).slice(0, 10);
    const r = await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, creato, aggiornato) VALUES (?,?,?,'pcloud',?,?) RETURNING id", prompt, pcloud, JSON.stringify(link), ora(), ora());
    await log(env, r.id, 'regia', '🎬 nuovo lavoro in coda: il Direttore creativo parte entro un minuto');
    return json({ id: r.id });
  }
  const vv = p.match(/^\/api\/lavori\/(\d+)\/(reel\.mp4|anteprima\.jpg|copertina\.jpg)$/);
  if (vv && m === 'GET') {
    if (!env.VIDEO) return json({ errore: 'archivio video non collegato' }, 404);
    const { value, metadata } = await env.VIDEO.getWithMetadata(`lavoro-${vv[1]}/${vv[2]}`, { type: 'arrayBuffer' });
    if (!value) return json({ errore: 'non ancora pronto' }, 404);
    const h = new Headers({ 'content-type': metadata?.tipo || (vv[2] === 'reel.mp4' ? 'video/mp4' : 'image/jpeg'), 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' });
    if (url.searchParams.get('scarica')) h.set('content-disposition', `attachment; filename="${vv[2] === 'reel.mp4' ? 'reel' : 'copertina'}-${vv[1]}.${vv[2].split('.')[1]}"`);
    const tot = value.byteLength;
    const rg = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    if (rg) { // Safari su iPhone vuole le richieste a pezzi per riprodurre i video
      let a = rg[1] === '' ? Math.max(0, tot - Number(rg[2])) : Number(rg[1]);
      let b = rg[1] === '' || rg[2] === '' ? tot - 1 : Math.min(Number(rg[2]), tot - 1);
      if (a > b || a >= tot) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${tot}` } });
      h.set('content-range', `bytes ${a}-${b}/${tot}`); h.set('content-length', String(b - a + 1));
      return new Response(value.slice(a, b + 1), { status: 206, headers: h });
    }
    h.set('content-length', String(tot));
    return new Response(value, { headers: h });
  }
  const mm = p.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro|girato|rimonta))?$/);
  if (mm) {
    const id = Number(mm[1]);
    if (!mm[2] && m === 'GET') {
      const L = await one(env, 'SELECT * FROM lavori WHERE id=?', id);
      if (!L) return json({ errore: 'non trovato' }, 404);
      for (const k of ['piano', 'riferimenti', 'clip', 'scheda', 'link_rif', 'montaggio']) L[k] = J(L[k]);
      delete L.candidati;
      L.registro = await all(env, 'SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200', id);
      return json(L);
    }
    if (!mm[2] && m === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM lavori WHERE id=?').bind(id), env.DB.prepare('DELETE FROM registro WHERE lavoro_id=?').bind(id)]);
      return json({ ok: true });
    }
    // aggiungere il girato a un lavoro che non lo aveva (o cambiarlo): riparte dall'analisi delle clip
    if (mm[2] === 'girato' && m === 'POST') {
      const d = await req.json().catch(() => ({}));
      const pcloud = String(d.pcloud || '').trim();
      if (!/code=/.test(pcloud)) return json({ errore: 'serve il link pubblico della cartella pCloud (contiene "code=")' }, 400);
      await run(env, "UPDATE lavori SET pcloud=?, fonte='pcloud', clip=NULL, montaggio=NULL, fase='clip', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, motore_visto=NULL, motore_pass=NULL, motore_fino=NULL, aggiornato=? WHERE id=?", pcloud, ora(), id);
      await log(env, id, 'regia', '📁 girato collegato: Max lo scarica e lo misura, poi scheda, piano e montaggio');
      return json({ ok: true });
    }
    // rifare il montaggio con indicazioni (look, durata, ritmo, note) senza rifare ricerca e analisi
    if (mm[2] === 'rimonta' && m === 'POST') {
      const d = await req.json().catch(() => ({}));
      const L = await one(env, 'SELECT montaggio, clip FROM lavori WHERE id=?', id);
      const mont = J(L?.montaggio, null);
      if (!mont?.piano) return json({ errore: 'questo lavoro non ha ancora un montaggio da rifare' }, 400);
      mont.indicazioni_rimonta = { testo: String(d.testo || '').slice(0, 800), look: d.look || null, durata: Number(d.durata) || null, ritmo: d.ritmo || null, formato: ['montaggio', 'talking_head', 'carosello'].includes(d.formato) ? d.formato : null };
      await run(env, "UPDATE lavori SET montaggio=?, fase='regia', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(mont), ora(), id);
      await log(env, id, 'regia', `🎬 rimontaggio richiesto${d.testo ? ': ' + String(d.testo).slice(0, 120) : ''}`);
      return json({ ok: true });
    }
    if (mm[2] === 'riprova' && m === 'POST') {
      const d = await req.json().catch(() => ({}));
      const fase = ['piano', 'ricerca', 'riferimenti', 'clip', 'scheda', 'regia', 'montaggio'].includes(d.fase) ? d.fase : null;
      const L = await one(env, 'SELECT fase, riferimenti, clip FROM lavori WHERE id=?', id);
      if (!L) return json({ errore: 'non trovato' }, 404);
      const nuovaFase = fase || (L.fase === 'fatto' ? 'scheda' : L.fase);
      // rimette "da guardare" i video saltati, così un nuovo tentativo li riprova
      const ripristina = (s) => JSON.stringify((J(s, []) || []).map((x) => (x.stato === 'saltato' ? { ...x, stato: 'da_guardare', errore: undefined } : x)));
      await run(env, "UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",
        nuovaFase, L.riferimenti ? ripristina(L.riferimenti) : null, L.clip ? ripristina(L.clip) : null, ora(), id);
      if (nuovaFase === 'montaggio') await run(env, "UPDATE lavori SET montaggio=json_set(montaggio, '$.stato', 'da_fare', '$.tentativi', 0) WHERE id=? AND montaggio IS NOT NULL", id);
      await log(env, id, 'regia', `🔁 riparto dalla fase "${nuovaFase}"`);
      return json({ ok: true });
    }
  }
  return json({ errore: 'non trovato' }, 404);
}

export default {
  async fetch(req, env) {
    await schema(env);
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/motore/')) {
      try { return await motoreApi(req, env, url); }
      catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
    }
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); }
      catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
    }
    return new Response(PAGINA, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  },
  async scheduled(evento, env, ctx) {
    await schema(env);
    ctx.waitUntil(avanza(env));
  },
};
