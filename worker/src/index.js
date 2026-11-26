import { REGOLE_REEL_BASE } from './lavoro.js';
import { persone } from './persone.js';
// Momento Reel · Worker Cloudflare: pagina regia + API + cron che fa lavorare gli agenti.
import { CHIAVI_OPZIONI, CHIAVI_SEGRETE, J, all, configurazione, log, one, ora, run, schema } from './db.js';
import { avanza, ricordaScartato } from './lavoro.js';
import { rilevaStile } from './stili.js';
import { apiPiani, avanzaPiani, schemaPiani } from './copioni.js';
import { apiAgenzia, avanzaUffici, schemaAgenzia } from './agenzia.js';
import { apiRiunioni, avanzaRiunioni } from './riunioni.js';
import { apiAvatar, avanzaAvatar, firmaPubblica } from './avatar.js';
import { apiConsumi } from './consumi.js';
import { diagnosiGemini, youtube } from './servizi.js';
import { apiPost, avanzaPost } from './post.js';
import { motoreApi } from './motore.js';
import { apiNotifiche, controllaApprovazioni, schemaNotifiche, SW, MANIFEST } from './notifiche.js';
import { ICONA_192, ICONA_512 } from './icone.js';
import { apiImporta } from './importa.js';
import { apiCalendario } from './calendario.js';
import { apiArchivio, linkValido, pulisci, servi, trovaCartella } from './archivio.js';
import { PAGINA } from './pagina.js';
import SALA3D_JS from './sala3d.txt';

const json = (d, status = 200, extra = {}) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

// ACCESSO: email + password scelte al primo accesso. La password non è mai salvata in chiaro: PBKDF2 con sale casuale.
// Se la perdi: codice di recupero (mostrato una volta sola al primo accesso) → nuova password.
const imp = async (env, k) => (await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', k))?.valore || '';
const salva = (env, k, v) => run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)', k, v);
async function pbkdf2(password, sale, giri = 100000) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sale), iterations: giri }, k, 256));
}
const casuale = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
async function nuovoSegreto(testo) { const sale = casuale(16); return `pbkdf2$100000$${sale}$${await pbkdf2(testo, sale)}`; }
async function verifica(testo, salvato) {
  const [tipo, giri, sale, h] = String(salvato || '').split('$');
  if (tipo !== 'pbkdf2' || !h) return false;
  const x = await pbkdf2(testo, sale, Number(giri));
  let d = 0; for (let i = 0; i < Math.max(x.length, h.length); i++) d |= (x.charCodeAt(i) || 0) ^ (h.charCodeAt(i) || 0);
  return d === 0;
}
function codiceRecupero() { // es. K7QM-2XPA-9TRB-W4HC: facile da scrivere, niente lettere ambigue
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => A[x % A.length]).join('').match(/.{4}/g).join('-');
}
const normCodice = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function hashPassword(env) { return (await imp(env, 'ADMIN_PW')) || null; }
// la sessione è legata a password ED email: cambiando una delle due, tutti gli accessi vecchi decadono
async function firma(hash, email) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(hash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('momento-agency-sessione|' + email)));
}
const emailAccesso = (env) => imp(env, 'ADMIN_EMAIL');
async function autorizzato(req, env) {
  const h = await hashPassword(env), email = await emailAccesso(env);
  if (!h || !email) return false;
  const c = /(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(req.headers.get('cookie') || '');
  return !!c && c[1] === await firma(h, email);
}
const cookie = (v, maxAge) => `mr_s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// master a pezzi (oltre 20 MB): ricompongo al volo, anche per le richieste a intervalli di Safari
async function videoAPezzi(env, req, url, chiave, primo, md, vv) {
  const P = 20 * 1024 * 1024, tot = md.totale, n = md.parti;
  const h = new Headers({ 'content-type': md.tipo || 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' });
  if (url.searchParams.get('scarica')) h.set('content-disposition', `attachment; filename="reel-${vv[1]}.mp4"`);
  const rg = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let a = 0, b = tot - 1, status = 200;
  if (rg) {
    a = rg[1] === '' ? Math.max(0, tot - Number(rg[2])) : Number(rg[1]);
    b = rg[1] === '' || rg[2] === '' ? tot - 1 : Math.min(Number(rg[2]), tot - 1);
    if (a > b || a >= tot) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${tot}` } });
    if (rg[2] === '' && b - a + 1 > P) b = Math.min(tot - 1, (Math.floor(a / P) + 1) * P - 1); // una parte per richiesta
    h.set('content-range', `bytes ${a}-${b}/${tot}`); status = 206;
  }
  h.set('content-length', String(b - a + 1));
  const { readable, writable } = new TransformStream();
  (async () => {
    const w = writable.getWriter();
    try {
      for (let k = Math.floor(a / P); k <= Math.floor(b / P) && k < n; k++) {
        const buf = k === 0 ? primo : await env.VIDEO.get(`${chiave}#${k}`, 'arrayBuffer');
        const da = Math.max(a - k * P, 0), fino = Math.min(b - k * P + 1, buf.byteLength);
        await w.write(new Uint8Array(buf.slice(da, fino)));
      }
    } finally { await w.close(); }
  })();
  return new Response(readable, { status, headers: h });
}

async function api(req, env, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/stato') return json({ configurato: !!((await hashPassword(env)) && (await emailAccesso(env))), dentro: await autorizzato(req, env) });

  if ((p === '/api/accedi' || p === '/api/recupera') && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const email = String(d.email || '').trim().toLowerCase(), password = String(d.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ errore: 'scrivi un’email valida' }, 400);
    // troppi tentativi sbagliati dallo stesso indirizzo: blocco per 15 minuti (contro chi prova password o codici a raffica)
    const kip = 'accesso_ko:' + (req.headers.get('cf-connecting-ip') || 'x');
    const falliti = Number(await env.VIDEO.get(kip).catch(() => 0)) || 0;
    if (falliti >= 8) return json({ errore: 'troppi tentativi sbagliati: riprova tra 15 minuti' }, 429);
    const sbagliato = async (msg) => { await env.VIDEO.put(kip, String(falliti + 1), { expirationTtl: 900 }).catch(() => {}); return json({ errore: msg }, 401); };
    const [salvata, pw] = [await emailAccesso(env), await hashPassword(env)];
    const entra = async (extra = {}) => { const h = await hashPassword(env); return json({ ok: true, ...extra }, 200, { 'set-cookie': cookie(await firma(h, email), 60 * 60 * 24 * 60) }); };
    const nuovaPassword = async (testo) => {
      await salva(env, 'ADMIN_PW', await nuovoSegreto(testo));
      const codice = codiceRecupero();
      await salva(env, 'RECUPERO', await nuovoSegreto(normCodice(codice)));
      await run(env, "DELETE FROM impostazioni WHERE chiave='ADMIN_HASH'"); // la vecchia password (solo password) non vale più
      return codice;
    };
    if (p === '/api/recupera') { // password persa: email + codice di recupero → nuova password (e nuovo codice)
      if (!salvata || !pw) return json({ errore: 'l’accesso non è ancora stato creato' }, 400);
      if (password.length < 8) return json({ errore: 'la nuova password deve avere almeno 8 caratteri' }, 400);
      if (email !== salvata || !(await verifica(normCodice(d.codice), await imp(env, 'RECUPERO')))) return sbagliato('email o codice di recupero errato');
      const codice = await nuovaPassword(password);
      return entra({ codice_recupero: codice });
    }
    if (!salvata || !pw) { // primo accesso: email e password scelte ora diventano quelle dell'agenzia
      if (password.length < 8) return json({ errore: 'la password deve avere almeno 8 caratteri' }, 400);
      await salva(env, 'ADMIN_EMAIL', email);
      const codice = await nuovaPassword(password);
      return entra({ codice_recupero: codice, nuovo: true });
    }
    if (email !== salvata || !(await verifica(password, pw))) return sbagliato('email o password errata');
    return entra();
  }
  if (p === '/api/password' && m === 'POST') { // cambio password da dentro: serve quella attuale
    if (!(await autorizzato(req, env))) return json({ errore: 'accesso richiesto' }, 401);
    const d = await req.json().catch(() => ({}));
    if (!(await verifica(String(d.attuale || ''), await hashPassword(env)))) return json({ errore: 'la password attuale non è giusta' }, 400);
    if (String(d.nuova || '').length < 8) return json({ errore: 'la nuova password deve avere almeno 8 caratteri' }, 400);
    await salva(env, 'ADMIN_PW', await nuovoSegreto(String(d.nuova)));
    const codice = codiceRecupero();
    await salva(env, 'RECUPERO', await nuovoSegreto(normCodice(codice)));
    const email = await emailAccesso(env);
    return json({ ok: true, codice_recupero: codice }, 200, { 'set-cookie': cookie(await firma(await hashPassword(env), email), 60 * 60 * 24 * 60) });
  }
  if (p === '/api/esci') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });

  if (!(await autorizzato(req, env))) return json({ errore: 'accesso richiesto' }, 401);
  { const n = await apiNotifiche(req, env, p, m); if (n) return n; }

  // regole fisse dei reel scritte da Johnny: Rocco le legge in ogni piano di montaggio
  if (p === '/api/regole-reel' && m === 'GET') return json({ testo: (await imp(env, 'REGOLE_REEL')) || REGOLE_REEL_BASE });
  if (p === '/api/regole-reel' && m === 'POST') { const d = await req.json().catch(() => ({})); await salva(env, 'REGOLE_REEL', String(d.testo || '').slice(0, 6000)); return json({ ok: true }); }
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
    // le chiavi API non finiscono mai nel database: vanno messe come segreti del worker su Cloudflare
    if (CHIAVI_SEGRETE.some((k) => typeof d[k] === 'string' && d[k].trim())) return json({ errore: 'Le chiavi API non si salvano qui: vanno messe come segreti su Cloudflare (chiedilo a Claude in chat).' }, 400);
    for (const k of CHIAVI_OPZIONI) {
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
    const piani = await all(env, "SELECT id, cliente, fase, blocco_fino FROM piani WHERE stato='in_corso' ORDER BY id").catch(() => []);
    const cfg = await configurazione(env);
    const chiavi = { Claude: !!cfg.ANTHROPIC_API_KEY };
    const riposo = cfg.APIFY_TOKEN ? [] : ['scout_tt', 'scout_ig'];
    return json({ adesso: ora(), attivi, piani, ultimi, feed, conti, chiavi, riposo, yt_web: !cfg.YOUTUBE_API_KEY });
  }
  const ag = p.match(/^\/api\/regia\/agente\/([a-z_]+)$/);
  if (ag && m === 'GET') {
    return json(await all(env, 'SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40', ag[1]));
  }

  if (p === '/api/lavori' && m === 'GET') {
    const r = await all(env, "SELECT id, prompt, stato, fase, errore, creato, aggiornato, approvato, json_extract(scheda, '$.titolo_lavoro') AS titolo, json_extract(montaggio, '$.stato') AS mstato, json_extract(montaggio, '$.copertina') AS copertina, json_extract(stile, '$.avatar') AS avatar, json_extract(montaggio, '$.nota_chiara.nota') AS nota_chiara, json_extract(montaggio, '$.nota_chiara.voto') AS voto_chiara FROM lavori ORDER BY id DESC LIMIT 100");
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
    let stile = rilevaStile(prompt, d.stile);
    // con le clip di Johnny e la spunta "solo le mie clip": niente ricerca di reel sulle piattaforme (si studiano solo i suoi modelli)
    if (d.solo_clip && (pcloud || (Array.isArray(d.video) && d.video.length))) stile = { ...(stile || { genere: null, mood: [] }), solo_clip: true };
    // in alternativa a pCloud: video da link diretti (es. il video dell'avatar HeyGen)
    const video = (Array.isArray(d.video) ? d.video : []).filter((v) => /^https:\/\//.test(v?.url || '')).slice(0, 20).map((v) => ({ nome: String(v.nome || '').slice(0, 80), url: v.url, durata: Number(v.durata) || null }));
    // archivio interno: la cartella scelta, oppure quella che il prompt nomina (es. "torretta … panettoni" → Clienti/Torretta/Panettoni)
    let arch = !video.length && !pcloud ? (pulisci(d.archivio) || await trovaCartella(env, prompt).catch(() => null)) : null;
    if (arch && d.solo_clip) stile = { ...(stile || { genere: null, mood: [] }), solo_clip: true };
    // LUT: la sceglie Johnny prima del montaggio (nessuna scelta automatica)
    if (d.lut && /^[a-z0-9_]{2,40}$/.test(String(d.lut))) stile = { ...(stile || { genere: null, mood: [] }), lut: String(d.lut) };
    const r = video.length
      ? await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, stile, creato, aggiornato) VALUES (?,?,?,'url',?,?,?) RETURNING id", prompt, JSON.stringify(video), JSON.stringify(link), stile ? JSON.stringify(stile) : null, ora(), ora())
      : await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, stile, creato, aggiornato) VALUES (?,?,?,?,?,?,?) RETURNING id", prompt, arch || pcloud, JSON.stringify(link), arch ? 'archivio' : 'pcloud', stile ? JSON.stringify(stile) : null, ora(), ora());
    if (arch) await log(env, r.id, 'regia', `🗂️ clip dall'archivio: ${arch}`);
    await log(env, r.id, 'regia', '🎬 nuovo lavoro in coda: il Direttore creativo parte entro un minuto');
    return json({ id: r.id });
  }
  const vv = p.match(/^\/api\/lavori\/(\d+)\/(reel\.mp4|anteprima\.jpg|copertina\.jpg)$/);
  if (vv && m === 'GET') {
    if (!env.VIDEO) return json({ errore: 'archivio video non collegato' }, 404);
    const chiave = `lavoro-${vv[1]}/${vv[2]}`;
    const { value, metadata } = await env.VIDEO.getWithMetadata(chiave, { type: 'arrayBuffer' });
    if (!value) return json({ errore: 'non ancora pronto' }, 404);
    if ((metadata?.parti || 1) > 1) return videoAPezzi(env, req, url, chiave, value, metadata, vv);
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
  const mm = p.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro|girato|rimonta|pausa|riprendi|approva))?$/);
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
      const Ld = await one(env, 'SELECT * FROM lavori WHERE id=?', id);
      if (Ld) await ricordaScartato(env, Ld).catch(() => 0);
      await env.DB.batch([env.DB.prepare('DELETE FROM lavori WHERE id=?').bind(id), env.DB.prepare('DELETE FROM registro WHERE lavoro_id=?').bind(id)]);
      if (env.VIDEO) { const k = await env.VIDEO.list({ prefix: `lavoro-${id}/` }).catch(() => ({ keys: [] })); for (const x of k.keys) await env.VIDEO.delete(x.name).catch(() => {}); }
      return json({ ok: true });
    }
    // pausa: il lavoro si ferma dov'è (se il motore sta montando, finisce quel passaggio e poi si ferma); riprendi: riparte da lì
    if (mm[2] === 'pausa' && m === 'POST') {
      await run(env, "UPDATE lavori SET stato='pausa', blocco_fino=NULL, motore_pass=NULL, motore_fino=NULL, aggiornato=? WHERE id=? AND stato IN ('in_corso','errore')", ora(), id);
      await log(env, id, 'regia', '⏸️ messo in pausa da Johnny');
      return json({ ok: true });
    }
    if (mm[2] === 'riprendi' && m === 'POST') {
      await run(env, "UPDATE lavori SET stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, motore_svegliato=NULL, aggiornato=? WHERE id=? AND stato IN ('pausa','errore')", ora(), id);
      await log(env, id, 'regia', '▶️ ripreso');
      return json({ ok: true });
    }
    // approvazione del reel finito (sezione Approvazioni)
    if (mm[2] === 'approva' && m === 'POST') {
      await run(env, "UPDATE lavori SET approvato=?, aggiornato=? WHERE id=? AND stato='pronto'", ora(), ora(), id);
      await log(env, id, 'regia', '✅ reel approvato da Johnny');
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
      const L = await one(env, 'SELECT montaggio, clip, fonte, pcloud FROM lavori WHERE id=?', id);
      const mont = J(L?.montaggio, null);
      if (!mont?.piano) return json({ errore: 'questo lavoro non ha ancora un montaggio da rifare' }, 400);
      await ricordaScartato(env, L).catch(() => 0); // il montaggio che Johnny vuole rifare non deve tornare uguale
      mont.indicazioni_rimonta = { testo: String(d.testo || '').slice(0, 800), look: d.look || null, durata: Number(d.durata) || null, ritmo: d.ritmo || null, formato: ['montaggio', 'talking_head', 'carosello'].includes(d.formato) ? d.formato : null, lut: d.lut || null };
      // "rimontalo romantico", "più street": se nelle indicazioni c'è uno stile, diventa lo stile del lavoro
      const nuovoStile = rilevaStile(String(d.testo || ''), d.stile);
      if (nuovoStile) await run(env, 'UPDATE lavori SET stile=? WHERE id=?', JSON.stringify(nuovoStile), id);
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
  if (p === '/api/diagnosi/gemini') return json(await diagnosiGemini(await configurazione(env)));
  if (p === '/api/consumi') return await apiConsumi(req, env, p, m, json) || json({ errore: 'metodo non valido' }, 405);
  if (p.startsWith('/api/post')) { const r = await apiPost(req, env, p, m, json); if (r) return r; }
  if (p.startsWith('/api/avatar')) {
    const r = await apiAvatar(req, env, p, m, json);
    if (r) return r;
  }
  if (p.startsWith('/api/calendario')) {
    const r = await apiCalendario(req, env, p, m, json);
    if (r) return r;
  }
  if (p.startsWith('/api/archivio/importa')) {
    const r = await apiImporta(req, env, p, m, json);
    if (r) return r;
  }
  if (p.startsWith('/api/archivio')) {
    const r = await apiArchivio(req, env, p, m, json);
    if (r) return r;
  }
  if (/^\/api\/(capo|riunioni)/.test(p)) {
    const r = await apiRiunioni(req, env, p, m, json);
    if (r) return r;
  }
  if (/^\/api\/(azienda|capo|chat|incarichi|contenuti|clienti|gestionale|approvazioni)/.test(p)) {
    const r = await apiAgenzia(req, env, p, m, json);
    if (r) return r;
  }
  if (p.startsWith('/api/piani')) {
    const r = await apiPiani(req, env, p, m, json);
    if (r) return r;
  }
  return json({ errore: 'non trovato' }, 404);
}

// la pagina chiede la sala 3D con la versione nell'indirizzo: dopo ogni pubblicazione il browser prende quella nuova
const VERSIONE_SALA = (() => { let h = 2166136261; for (let i = 0; i < SALA3D_JS.length; i++) h = Math.imul(h ^ SALA3D_JS.charCodeAt(i), 16777619); return (h >>> 0).toString(36); })();
const PAGINA_V = PAGINA.split("import('/sala3d.js')").join("import('/sala3d.js?v=" + VERSIONE_SALA + "')");

async function gestionaleUfficiale(req, env, url) {
  if (!env.GESTAPP) return new Response('Gestionale non collegato', { status: 503 });
  const dentro = url.pathname.slice('/gestionale'.length) || '/';
  const h = new Headers(req.headers);
  const sess = (req.headers.get('cookie') || '').match(/(?:^|;\s*)sess=([a-f0-9]{64})/);
  if (sess) h.set('cookie', 'sess=' + sess[1]); else h.delete('cookie'); // al gestionale passa solo la sua sessione
  const r = await env.GESTAPP.fetch(new Request('https://momento-gestionale' + dentro + url.search, { method: req.method, headers: h, body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(), redirect: 'manual' }));
  const out = new Headers(r.headers);
  out.delete('x-frame-options');
  const csp = out.get('content-security-policy');
  if (csp) out.set('content-security-policy', csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'"));
  const ck = r.headers.getSetCookie ? r.headers.getSetCookie() : r.headers.getAll ? r.headers.getAll('set-cookie') : [r.headers.get('set-cookie')].filter(Boolean);
  out.delete('set-cookie');
  for (const c of ck) out.append('set-cookie', c.replace(/Path=\/(;|$)/i, 'Path=/gestionale/$1'));
  if ((out.get('content-type') || '').includes('text/html')) {
    const html = (await r.text()).replaceAll('/api/', '/gestionale/api/');
    out.delete('content-length');
    return new Response(html, { status: r.status, headers: out });
  }
  return new Response(r.body, { status: r.status, headers: out });
}

// diagnosi Gemini una sola volta dopo il rilascio: il risultato finisce nel registro
async function provaYoutube(env) { // una volta: la chiave YouTube appena aggiunta funziona?
  const K = 'prova_youtube_1';
  if (await env.VIDEO.get(K)) return;
  await env.VIDEO.put(K, '1', { expirationTtl: 86400 * 30 });
  const cfg = await configurazione(env);
  if (!cfg.YOUTUBE_API_KEY) return;
  try { const v = await youtube(cfg, ['claude ai tutorial'], 5); await log(env, null, 'scout_yt', `🩺 chiave YouTube ok: ${v.length} Shorts trovati con l'API ufficiale (gratis)`); }
  catch (e) { await log(env, null, 'scout_yt', '🩺 chiave YouTube non funziona: ' + String(e.message).slice(0, 300), 'warn'); }
}
async function provaHeygen(env) { // una volta: la chiave HeyGen funziona? credito e avatar visibili (nessun video generato)
  const K = 'prova_heygen_1';
  if (await env.VIDEO.get(K)) return;
  const cfg = await configurazione(env);
  if (!cfg.HEYGEN_API_KEY) return;
  await env.VIDEO.put(K, '1', { expirationTtl: 86400 * 30 });
  const h = { 'x-api-key': cfg.HEYGEN_API_KEY, accept: 'application/json' };
  const prova = async (u) => { try { const r = await fetch('https://api.heygen.com' + u, { headers: h }); return `${u.split('?')[0]} → ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 260)}`; } catch (e) { return u + ' → ' + e.message; } };
  const righe = [await prova('/v2/user/remaining_quota'), await prova('/v2/avatar/' + cfg.HEYGEN_AVATAR + '/details'), await prova('/v2/voices/' + cfg.HEYGEN_VOCE)];
  await log(env, null, 'avatar', '🩺 prova chiave HeyGen: ' + righe.join(' | ').slice(0, 580));
}
async function diagnosiUnaVolta(env) {
  await provaYoutube(env);
  await provaHeygen(env);
  const K = 'diagnosi_gemini_2';
  if (await env.VIDEO.get(K)) return;
  await env.VIDEO.put(K, 'in_corso', { expirationTtl: 86400 * 30 });
  try {
    const r = await diagnosiGemini(await configurazione(env));
    await log(env, null, 'regia', '🩺 diagnosi Gemini: ' + (Array.isArray(r) ? r.map((x) => `${x.modello} ${x.prova}: ${x.stato || x.errore} ${x.secondi || ''}s ${String(x.risposta || '').replace(/\s+/g, ' ').slice(0, 90)}`).join(' | ') : JSON.stringify(r)));
  } catch (e) { await log(env, null, 'regia', '🩺 diagnosi Gemini fallita: ' + e.message, 'warn'); }
}

export default {
  async fetch(req, env) {
    await schema(env);
    await schemaPiani(env);
    await schemaAgenzia(env);
    await schemaNotifiche(env);
    const url = new URL(req.url);
    if (url.pathname.startsWith('/persone/')) {
      try { return await persone(req, env, url); }
      catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
    }
    // icona della scheda del browser: M bianca su quadrato teal (colore Momento)
    if (url.pathname === '/favicon.svg' || url.pathname === '/favicon.ico') return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0E9F9A"/><path d="M15 48V17h7l10 15 10-15h7v31h-7.5V29.5L32 42l-9.5-12.5V48z" fill="#fff"/></svg>`, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' } });
    // app sul telefono: manifest, service worker per le notifiche, icone
    if (url.pathname === '/manifest.webmanifest') return new Response(MANIFEST, { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } });
    if (url.pathname === '/sw.js') return new Response(SW, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
    if (url.pathname === '/icona-192.png' || url.pathname === '/icona-512.png') return new Response(Uint8Array.from(atob(url.pathname.includes('192') ? ICONA_192 : ICONA_512), (c) => c.charCodeAt(0)), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
    if (url.pathname === '/sala3d.js') return new Response(SALA3D_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': url.searchParams.get('v') === VERSIONE_SALA ? 'public, max-age=31536000, immutable' : 'no-cache' } });
    // file dell'archivio per il motore GitHub: link firmato e a scadenza, niente accesso senza firma
    if (url.pathname === '/archivio-file') {
      const pa = pulisci(url.searchParams.get('p'));
      if (!(await linkValido(env, pa, url.searchParams.get('s'), url.searchParams.get('f')))) return json({ errore: 'link non valido o scaduto' }, 403);
      return servi(env, req, pa);
    }
    // file dei reel raggiungibili da Instagram (Meta scarica il video da qui): link firmato, niente accesso senza firma
    const pubP = url.pathname.match(/^\/pubblico\/post\/(\d+)\/(\d+-\d+)\.jpg$/); // slide dei caroselli per Instagram
    if (pubP) {
      if (!env.IG_INTERNO_KEY || url.searchParams.get('f') !== await firmaPubblica(env, 'post' + pubP[1], pubP[2])) return json({ errore: 'link non valido' }, 403);
      const { value, metadata } = await env.VIDEO.getWithMetadata(`post-${pubP[1]}/${pubP[2]}.png`, { type: 'arrayBuffer' });
      if (!value) return json({ errore: 'non pronta' }, 404);
      return new Response(value, { headers: { 'content-type': metadata?.tipo || 'image/jpeg', 'content-length': String(value.byteLength) } });
    }
    const pub = url.pathname.match(/^\/pubblico\/(\d+)\/(reel\.mp4|copertina\.jpg|anteprima\.jpg)$/);
    if (pub) {
      if (!env.IG_INTERNO_KEY || url.searchParams.get('f') !== await firmaPubblica(env, pub[1], pub[2])) return json({ errore: 'link non valido' }, 403);
      const chiave = `lavoro-${pub[1]}/${pub[2]}`;
      const { value, metadata } = await env.VIDEO.getWithMetadata(chiave, { type: 'arrayBuffer' });
      if (!value) return json({ errore: 'non pronto' }, 404);
      if ((metadata?.parti || 1) > 1) return videoAPezzi(env, req, url, chiave, value, metadata, [null, pub[1], pub[2]]);
      return new Response(value, { headers: { 'content-type': metadata?.tipo || (pub[2] === 'reel.mp4' ? 'video/mp4' : 'image/jpeg'), 'accept-ranges': 'bytes', 'content-length': String(value.byteLength) } });
    }
    // gestionale ufficiale (worker momento-gestionale) dentro la regia: stesso indirizzo, così si può incorniciare e i cookie restano di prima parte
    if (url.pathname === '/gestionale') return Response.redirect(url.origin + '/gestionale/', 302);
    if (url.pathname.startsWith('/gestionale/')) {
      if (!(await autorizzato(req, env))) return url.pathname.startsWith('/gestionale/api/') ? json({ errore: 'accesso richiesto' }, 401) : Response.redirect(url.origin + '/', 302);
      return gestionaleUfficiale(req, env, url);
    }
    if (url.pathname.startsWith('/api/motore/')) {
      try { return await motoreApi(req, env, url); }
      catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
    }
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); }
      catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
    }
    return new Response(PAGINA_V, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  },
  async scheduled(evento, env, ctx) {
    await schema(env);
    await schemaPiani(env);
    await schemaAgenzia(env);
    await schemaNotifiche(env);
    ctx.waitUntil(Promise.all([avanza(env), avanzaPiani(env), avanzaUffici(env), avanzaRiunioni(env), avanzaAvatar(env), avanzaPost(env), diagnosiUnaVolta(env), controllaApprovazioni(env).catch((e) => console.log('notifiche', e.message))]));
  },
};
