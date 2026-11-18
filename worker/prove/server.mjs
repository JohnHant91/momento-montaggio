// Server locale per provare la pagina nel browser: worker vero + ambiente finto.
import http from 'node:http';
import { W, env, cron } from './finto.mjs';
const ctx = { waitUntil() {}, passThroughOnException() {} };
http.createServer(async (q, s) => {
  const corpo = ['GET', 'HEAD'].includes(q.method) ? undefined : await new Promise((ok) => { const b = []; q.on('data', (c) => b.push(c)); q.on('end', () => ok(Buffer.concat(b))); });
  if (q.url === '/__cron') { await cron(); s.end('ok'); return; }
  const r = await W.fetch(new Request('http://localhost:8790' + q.url, { method: q.method, headers: q.headers, body: corpo }), env, ctx);
  const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
  if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].replace('; Secure', '');
  s.writeHead(r.status, h); s.end(Buffer.from(await r.arrayBuffer()));
}).listen(8790, () => console.log('pronto su 8790'));
