// Personaggi 3D della sala (Mixamo): il Chrome di Johnny passa i link di esportazione, il worker scarica gli FBX,
// la pagina /persone/converti li trasforma in GLB leggeri nel browser e li rimanda qui. La sala li carica da /persone/<nome>.glb.
const P = 20 * 1024 * 1024;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', ...CORS } });

async function salva(env, chiave, buf, tipo) {
  const tot = buf.byteLength, n = Math.max(1, Math.ceil(tot / P));
  for (let k = 0; k < n; k++) await env.VIDEO.put(k ? chiave + '#' + k : chiave, buf.slice(k * P, (k + 1) * P), { metadata: { parti: n, totale: tot, tipo } });
  return tot;
}
async function leggi(env, chiave) {
  const { value, metadata } = await env.VIDEO.getWithMetadata(chiave, 'arrayBuffer');
  if (!value) return null;
  const n = metadata?.parti || 1; if (n === 1) return { buf: value, tipo: metadata?.tipo };
  const out = new Uint8Array(metadata.totale); out.set(new Uint8Array(value), 0);
  for (let k = 1; k < n; k++) out.set(new Uint8Array(await env.VIDEO.get(chiave + '#' + k, 'arrayBuffer')), k * P);
  return { buf: out.buffer, tipo: metadata?.tipo };
}

export async function persone(req, env, url) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const m = url.pathname.match(/^\/persone\/([A-Za-z0-9_]+)\.glb$/);
  if (m && req.method === 'GET') {
    const r = await leggi(env, 'persone/glb/' + m[1]);
    if (!r) return new Response('non trovato', { status: 404, headers: CORS });
    return new Response(r.buf, { headers: { 'content-type': 'model/gltf-binary', 'cache-control': 'public, max-age=86400', ...CORS } });
  }
  if (url.pathname === '/persone/elenco.json') return j(JSON.parse((await env.VIDEO.get('persone/pronti')) || '[]'));
  // tutto il resto vuole il gettone monouso
  const t = await env.VIDEO.get('persone/token');
  if (!t || url.searchParams.get('t') !== t) return j({ errore: 'gettone non valido' }, 403);
  if (url.pathname === '/persone/prendi' && req.method === 'POST') {
    const { nome, url: sorgente } = JSON.parse(await req.text());
    if (!/^[A-Za-z0-9_]+$/.test(nome) || !/^https:\/\/mixamo-storage-prod\.s3[.-][a-z0-9.-]*amazonaws\.com\//.test(sorgente)) return j({ errore: 'dati non validi' }, 400);
    const r = await fetch(sorgente); if (!r.ok) return j({ errore: 'S3 ' + r.status }, 502);
    const tot = await salva(env, 'persone/fbx/' + nome, await r.arrayBuffer(), 'application/octet-stream');
    const el = new Set(JSON.parse((await env.VIDEO.get('persone/fbx-elenco')) || '[]')); el.add(nome);
    await env.VIDEO.put('persone/fbx-elenco', JSON.stringify([...el]));
    return j({ ok: true, nome, byte: tot });
  }
  if (url.pathname === '/persone/fbx-elenco') return j(JSON.parse((await env.VIDEO.get('persone/fbx-elenco')) || '[]'));
  const f = url.pathname.match(/^\/persone\/fbx\/([A-Za-z0-9_]+)$/);
  if (f) { const r = await leggi(env, 'persone/fbx/' + f[1]); return r ? new Response(r.buf, { headers: CORS }) : j({ errore: 'manca' }, 404); }
  const g = url.pathname.match(/^\/persone\/glb\/([A-Za-z0-9_]+)$/);
  if (g && req.method === 'POST') {
    const tot = await salva(env, 'persone/glb/' + g[1], await req.arrayBuffer(), 'model/gltf-binary');
    const el = new Set(JSON.parse((await env.VIDEO.get('persone/pronti')) || '[]')); el.add(g[1]);
    await env.VIDEO.put('persone/pronti', JSON.stringify([...el]));
    return j({ ok: true, byte: tot });
  }
  if (url.pathname === '/persone/log' && req.method === 'POST') { await env.VIDEO.put('persone/log', await req.text()); return j({ ok: true }); }
  if (url.pathname === '/persone/log') return new Response((await env.VIDEO.get('persone/log')) || '', { headers: CORS });
  if (url.pathname === '/persone/ricevi') return new Response(PAGINA_RICEVI, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (url.pathname === '/persone/converti') return new Response(PAGINA_CONVERTI, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  return j({ errore: 'non trovato' }, 404);
}

const PAGINA_RICEVI = `<!doctype html><html><head><meta charset="utf-8"><title>Ricevo i personaggi</title><style>body{font:15px system-ui;padding:24px}</style></head><body>
<h2>Ricevo i personaggi da Mixamo…</h2><ul id="l"></ul>
<script>
const t = new URLSearchParams(location.search).get('t');
const ul = document.getElementById('l');
const scrivi = (s) => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); };
let fatto = false;
window.addEventListener('message', async (e) => {
  if (fatto || e.origin !== 'https://www.mixamo.com' || !e.data || !e.data.mixamo) return;
  fatto = true; e.source.postMessage({ ricevuto: true }, e.origin);
  for (const [nome, u] of Object.entries(e.data.mixamo)) {
    try { const j = await (await fetch('/persone/prendi?t=' + t, { method: 'POST', body: JSON.stringify({ nome, url: u }) })).json(); scrivi(nome + ': ' + (j.ok ? (j.byte / 1e6).toFixed(1) + ' MB' : j.errore)); }
    catch (x) { scrivi(nome + ': ' + x.message); }
  }
  scrivi('Ricevuti. Passo alla conversione…');
  setTimeout(() => { location.href = '/persone/converti?t=' + t; }, 1500);
});
if (window.opener) window.opener.postMessage({ pronto: true }, 'https://www.mixamo.com');
</script></body></html>`;

const PAGINA_CONVERTI = `<!doctype html><html><head><meta charset="utf-8"><title>Conversione personaggi</title>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<style>body{font:15px system-ui;padding:24px;max-width:760px}li{margin:4px 0}</style></head><body>
<h2>Sto preparando i personaggi della sala 3D…</h2><p>Lascia aperta questa scheda finché non compare <b>FINITO</b>.</p><ul id="l"></ul>
<script type="module">
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const t = new URLSearchParams(location.search).get('t');
const ul = document.getElementById('l'), log = [];
const scrivi = (s) => { log.push(s); const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); fetch('/persone/log?t=' + t, { method: 'POST', body: log.join('\\n') }); };
const tutti = await (await fetch('/persone/fbx-elenco?t=' + t)).json();
const solo = new URLSearchParams(location.search).get('solo');
const elenco = solo ? tutti.filter((n) => solo.split(',').includes(n)) : tutti;
for (const nome of elenco) {
  try {
    const anim = nome.startsWith('anim_');
    const buf = await (await fetch('/persone/fbx/' + nome + '?t=' + t)).arrayBuffer();
    const o = new FBXLoader().parse(buf, '');
    // aspetto le texture incorporate
    await new Promise((r) => setTimeout(r, 1500));
    const togli = [];
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (anim) { togli.push(m); return; }
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const nuovi = mats.map((p) => {
        const s = new THREE.MeshStandardMaterial({ name: p.name, color: p.color, map: p.map || null, roughness: 0.8, metalness: 0, transparent: !!p.transparent, alphaTest: p.alphaTest || 0, side: p.side });
        if (s.map) s.map.userData.mimeType = 'image/jpeg';
        return s;
      });
      m.material = Array.isArray(m.material) ? nuovi : nuovi[0];
    });
    togli.forEach((m) => m.parent.remove(m));
    const glb = await new GLTFExporter().parseAsync(o, { binary: true, maxTextureSize: 512, animations: o.animations, onlyVisible: false });
    const r = await (await fetch('/persone/glb/' + nome + '?t=' + t, { method: 'POST', body: glb })).json();
    scrivi('✓ ' + nome + ': ' + (buf.byteLength / 1e6).toFixed(1) + ' MB FBX → ' + (glb.byteLength / 1e6).toFixed(1) + ' MB GLB, animazioni ' + o.animations.map((a) => a.name + ' ' + a.duration.toFixed(1) + 's').join(', ') + (r.ok ? '' : ' ERRORE ' + JSON.stringify(r)));
  } catch (e) { scrivi('✗ ' + nome + ': ' + e.message); }
}
scrivi('FINITO');
</script></body></html>`;
