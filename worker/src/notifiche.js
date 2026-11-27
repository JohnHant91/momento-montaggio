// NOTIFICHE SUL TELEFONO: l'agenzia si installa come app (schermata Home) e manda una notifica push quando qualcosa
// aspetta Johnny nella sezione Approvazioni (reel finito, copioni, caroselli, post).
// Push "senza contenuto" (Web Push con VAPID): il telefono riceve solo lo squillo, poi l'app chiede a noi il testo
// (/api/notifiche/ultima, con il login): così niente cifratura del messaggio e niente dati che girano fuori.
import { all, one, run, J, ora } from './db.js';

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const daB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoNotifiche;
export function schemaNotifiche(env) { return (_fattoNotifiche ||= _schemaNotifiche(env).catch((e) => { _fattoNotifiche = null; throw e; })); }
async function _schemaNotifiche(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS push (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE, dispositivo TEXT, creato TEXT)').run();
}

// chiavi VAPID: la privata è un segreto del Worker (VAPID_PRIVATA, JWK), la pubblica si ricava da lì
async function chiavi(env) {
  if (!env.VAPID_PRIVATA) return null;
  const jwk = JSON.parse(env.VAPID_PRIVATA);
  const priv = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const pub = new Uint8Array([4, ...daB64u(jwk.x), ...daB64u(jwk.y)]);
  return { priv, pub: b64u(pub) };
}

async function jwtVapid(env, aud, k) {
  const intest = b64u(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64u(new TextEncoder().encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:info@momentoproduzione.it' })));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.priv, new TextEncoder().encode(intest + '.' + corpo));
  return intest + '.' + corpo + '.' + b64u(firma);
}

export async function inviaPush(env, titolo, testo, link = '#/approvazioni') {
  const k = await chiavi(env);
  if (!k) return 0;
  await run(env, "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('NOTIFICA_ULTIMA', ?)", JSON.stringify({ titolo, testo, link, quando: ora() }));
  const iscritti = await all(env, 'SELECT id, endpoint FROM push');
  let ok = 0;
  for (const s of iscritti) {
    try {
      const u = new URL(s.endpoint);
      const r = await fetch(s.endpoint, { method: 'POST', headers: { TTL: '86400', Urgency: 'high', authorization: `vapid t=${await jwtVapid(env, u.origin, k)}, k=${k.pub}`, 'content-length': '0' } });
      if (r.status === 404 || r.status === 410) await run(env, 'DELETE FROM push WHERE id=?', s.id); // telefono disiscritto
      else if (r.ok) ok++;
      else console.log('push', r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.log('push errore', e.message); }
  }
  return ok;
}

// a ogni giro del cron: cosa aspetta Johnny? quello che non è ancora stato notificato parte come notifica
export async function controllaApprovazioni(env) {
  if (!env.VAPID_PRIVATA) return;
  const q = (sql) => all(env, sql).catch(() => []);
  const [reel, avatar, post, piani, cont, riun, doc] = await Promise.all([
    q("SELECT id, COALESCE(json_extract(scheda, '$.titolo_lavoro'), substr(prompt, 1, 60)) AS t FROM lavori WHERE stato='pronto' AND approvato IS NULL"),
    q("SELECT id, argomento AS t FROM avatar_piani WHERE stato='da_approvare'"),
    q("SELECT id, COALESCE(cliente, 'caroselli') AS t FROM post_lavori WHERE stato IN ('da_approvare','attende_canva','da_vedere')"),
    q("SELECT id, cliente AS t FROM piani WHERE stato='pronto' AND approvato IS NULL"),
    q("SELECT id, titolo AS t FROM contenuti WHERE stato IN ('da_approvare','da_pubblicare')"),
    q("SELECT id, COALESCE(titolo, substr(richiesta, 1, 60)) AS t FROM riunioni WHERE stato='proposte'"),
    q("SELECT id, titolo AS t FROM incarichi WHERE stato IN ('fatto','da_approvare') AND visto IS NULL AND esito LIKE '%documento%'"),
  ]);
  const voci = [...reel.map((x) => ['r' + x.id, '🎬 Reel pronto', x.t]), ...avatar.map((x) => ['a' + x.id, '🎭 Copioni del profilo', x.t]),
    ...post.map((x) => ['p' + x.id, '🗂️ Caroselli da approvare', x.t]), ...piani.map((x) => ['c' + x.id, '📝 Copioni clienti', x.t]), ...cont.map((x) => ['k' + x.id, '✅ Contenuto da approvare', x.t]),
    ...riun.map((x) => ['m' + x.id, '🤝 Proposte da scegliere', x.t]), ...doc.map((x) => ['d' + x.id, '📄 Documento da leggere', x.t])];
  const gia = new Set(J((await one(env, "SELECT valore FROM impostazioni WHERE chiave='NOTIFICATI'"))?.valore, []));
  const nuove = voci.filter(([k]) => !gia.has(k));
  // la lista si tiene corta: solo quello che aspetta ancora
  await run(env, "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('NOTIFICATI', ?)", JSON.stringify(voci.map(([k]) => k)));
  if (!nuove.length) return;
  const titolo = nuove.length === 1 ? nuove[0][1] : `${nuove.length} cose da approvare`;
  const testo = nuove.length === 1 ? String(nuove[0][2] || '').slice(0, 120) : nuove.slice(0, 4).map(([, t, x]) => `${t.split(' ')[0]} ${String(x || '').slice(0, 40)}`).join(' · ');
  await inviaPush(env, titolo, testo);
}

export async function apiNotifiche(req, env, p, m) {
  if (p === '/api/notifiche/chiave' && m === 'GET') return Response.json({ chiave: (await chiavi(env))?.pub || null });
  if (p === '/api/notifiche/iscrivi' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ep = String(d.endpoint || '');
    if (!/^https:\/\//.test(ep)) return Response.json({ errore: 'iscrizione non valida' }, { status: 400 });
    await run(env, 'INSERT OR REPLACE INTO push (endpoint, dispositivo, creato) VALUES (?,?,?)', ep, String(d.dispositivo || '').slice(0, 120), ora());
    return Response.json({ ok: true });
  }
  if (p === '/api/notifiche/prova' && m === 'POST') return Response.json({ inviate: await inviaPush(env, '🔔 Notifiche attive', 'Da ora ti avviso qui quando qualcosa aspetta la tua approvazione.') });
  if (p === '/api/notifiche/ultima' && m === 'GET') return Response.json(J((await one(env, "SELECT valore FROM impostazioni WHERE chiave='NOTIFICA_ULTIMA'"))?.valore, {}));
  if (p === '/api/notifiche/stato' && m === 'GET') return Response.json({ attive: !!env.VAPID_PRIVATA, dispositivi: (await one(env, 'SELECT COUNT(*) AS n FROM push'))?.n || 0 });
  return null;
}

// service worker dell'app: riceve lo squillo, chiede il testo e mostra la notifica; il tocco apre le Approvazioni
export const SW = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => e.waitUntil((async () => {
  let n = {};
  try { n = await (await fetch('/api/notifiche/ultima', { credentials: 'include' })).json(); } catch {}
  await self.registration.showNotification(n.titolo || 'MOMENTO AGENCY AI', { body: n.testo || 'Qualcosa aspetta la tua approvazione', icon: '/icona-192.png', badge: '/icona-192.png', tag: 'approvazioni', renotify: true, data: { link: n.link || '#/approvazioni' } });
})()));
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil((async () => {
  const url = '/' + (e.notification.data && e.notification.data.link || '#/approvazioni');
  const tutte = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of tutte) { if ('focus' in c) { await c.navigate(url).catch(() => {}); return c.focus(); } }
  return self.clients.openWindow(url);
})()); });
self.addEventListener('fetch', () => {});`;

export const MANIFEST = JSON.stringify({
  name: 'MOMENTO AGENCY AI', short_name: 'Momento AI', start_url: '/#/', scope: '/', display: 'standalone', background_color: '#F4F2EE', theme_color: '#0E9F9A',
  icons: [{ src: '/icona-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
});
