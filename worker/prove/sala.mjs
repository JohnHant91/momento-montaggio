// Pagina di prova della sala 3D con dati finti (usata dal workflow prova-sala).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
const { SQUADRA, UFFICI } = await import('../src/agenzia.js');
const m = await import('../dist/momento-reel.js');
const env = { DB: { batch: async () => [], exec: async () => ({}), prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }), first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }) } };
const html = await (await m.default.fetch(new Request('https://x/'), env, { waitUntil() {} })).text();
const js = await (await m.default.fetch(new Request('https://x/sala3d.js'), env, { waitUntil() {} })).text();
const fra = new Date(Date.now() + 600e3).toISOString(), ora = new Date().toISOString();
const az = { adesso: ora, uffici: UFFICI, squadra: SQUADRA,
  attivi: [{ id: 7, agente: 'copywriter', titolo: '6 post di dicembre per A’ Villetta', stato: 'in_corso', blocco_fino: fra }, { id: 8, agente: 'caroselli', titolo: 'Carosello: 5 cose da fare a Castellabate', stato: 'in_coda' }, { id: 9, agente: 'stratega', titolo: 'Strategia Q1 Torretta', stato: 'in_corso', blocco_fino: fra }],
  recenti: [{ id: 7, agente: 'copywriter', titolo: '6 post di dicembre per A’ Villetta', stato: 'in_corso', aggiornato: ora }], da_approvare: 2, conti: [{ agente: 'copywriter', n: 4 }], clienti: 2,
  reel: [{ id: 2, fase: 'montaggio', blocco_fino: fra }], piani: [], gestionale: true,
  feed: [{ agente: 'editor', messaggio: 'monto 22 pezzi: reframe, stabilizzazione, rallenty', livello: 'info', quando: ora }, { agente: 'copywriter', messaggio: '✍️ inizio #7: 6 post di dicembre', livello: 'info', quando: ora }] };
const fake = { '/api/stato': { configurato: true, dentro: true }, '/api/azienda': az, '/api/lavori': [{ id: 2, prompt: 'Reel Torretta', titolo: 'Tostatura caffè · Torretta', stato: 'in_corso' }], '/api/clienti': [] };
const stub = '<script>const __F=' + JSON.stringify(fake) + ';const __of=window.fetch;window.fetch=async(u,o)=>{const k=new URL(typeof u==="string"?u:u.url,location.href).pathname;if(__F[k]!==undefined)return new Response(JSON.stringify(__F[k]),{headers:{"content-type":"application/json"}});if(k.startsWith("/persone/"))return __of("https://momento-reel.gestionalelcl.workers.dev"+k,o);return __of(u,o);};</script>';
const dir = process.argv[2] || '/tmp/sala';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/index.html', html.replace('<title>', stub + '<title>'));
writeFileSync(dir + '/sala3d.js', js);
console.log('ok');
