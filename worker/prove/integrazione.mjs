// Prova completa del worker con D1 (sqlite), KV in memoria e Claude simulato.
// Uso: node prove/integrazione.mjs   (dalla cartella worker, dopo la build in dist/)
import { W, env, GEST, chiama, cron, sblocca, stato } from './finto.mjs';
const errori = [];
const ok = (cond, cosa) => { if (cond) console.log('  ✓', cosa); else { console.log('  ✗', cosa); errori.push(cosa); } };
console.log('\n1) pagina e accesso');
let r = await chiama('/'); ok(r.status === 200 && String(r.j).includes('<html'), 'la pagina si apre');
r = await chiama('/api/azienda'); ok(r.status === 401 || r.status === 403, 'senza accesso le API sono chiuse (' + r.status + ')');
r = await chiama('/api/accedi', { method: 'POST', body: { password: 'sbagliata1' } }); ok(r.status === 401, 'password errata rifiutata');
r = await chiama('/api/accedi', { method: 'POST', body: { password: 'provaprova' } }); ok(r.status === 200, 'accesso con la password giusta');
r = await chiama('/sala3d.js'); ok(r.status === 200, 'modulo sala 3D servito');

console.log('\n2) agenzia e sala');
r = await chiama('/api/azienda'); ok(r.status === 200 && r.j.squadra?.capo?.r?.includes('Direttrice'), 'Alba è la Direttrice');
r = await chiama('/api/riunioni'); ok(r.status === 200 && Array.isArray(r.j), 'elenco riunioni vuoto ok');

console.log('\n3) richiesta → riunione in sala meeting');
r = await chiama('/api/capo', { method: 'POST', body: { testo: '6 post di dicembre per Villetta Prova, romantici' } });
ok(r.status === 200 && r.j.riunione, 'la richiesta apre una riunione (#' + r.j.riunione + ')');
const rid = r.j.riunione;
r = await chiama('/api/incarichi'); ok(r.j.length === 0, 'nessun incarico parte prima della scelta');
r = await chiama('/api/riunioni'); ok(r.j[0]?.in_sala && r.j[0].partecipanti.length === 7, 'i 7 capireparto sono in sala');
await cron();
r = await chiama('/api/riunioni/' + rid); ok(r.j.stato === 'proposte' && r.j.proposte.length === 2 && r.j.verbale.length >= 4, 'dopo la riunione: proposte e verbale');
ok(r.j.nomi?.direttore?.startsWith('Leo'), 'i nomi dei capi arrivano alla pagina');
r = await chiama('/api/chat/capo'); ok(r.j.some((c) => c.testo.includes('#/riunione/' + rid)), 'Alba scrive in chat con il link alle proposte');
r = await chiama('/api/riunioni/' + rid + '/scegli', { method: 'POST', body: { indice: 0 } });
ok(r.status === 200 && r.j.incarichi.length === 3, 'scelta la prima: partono 3 incarichi (agente inesistente scartato)');
const inc = (await chiama('/api/incarichi')).j;
ok(inc.every((i) => i.cliente) , 'il nuovo cliente è stato creato e collegato');
r = await chiama('/api/riunioni/' + rid + '/scegli', { method: 'POST', body: { indice: 1 } }); ok(r.status === 400, 'non si può scegliere due volte');
const dip = env.DB._db.prepare('SELECT id, agente, dipende_da, stato FROM incarichi ORDER BY id').all();
ok(dip[1].dipende_da === dip[0].id && dip[2].dipende_da === dip[0].id, 'copy e caroselli aspettano la scheda del brand');

console.log('\n4) gli uffici lavorano');
await cron(); sblocca('incarichi');
let st = env.DB._db.prepare('SELECT agente, stato FROM incarichi ORDER BY id').all();
ok(st[0].stato === 'fatto' && st[1].stato === 'in_coda', 'prima il brand, gli altri aspettano');
await cron();
st = env.DB._db.prepare('SELECT agente, stato, errore, blocco_fino FROM incarichi ORDER BY id').all();
ok(st[1].stato === 'da_approvare' && st[2].stato === 'da_approvare', 'poi copy e caroselli insieme: contenuti da approvare');
const scheda = env.DB._db.prepare('SELECT scheda FROM clienti').get(); ok(scheda?.scheda?.includes('B&B'), 'la scheda cliente è stata salvata');
r = await chiama('/api/contenuti'); ok(r.j.length === 2, 'contenuti in approvazione');
const c1 = r.j[0];
r = await chiama('/api/contenuti/' + c1.id, { method: 'POST', body: { azione: 'approva' } }); ok(r.status === 200, 'approvo un contenuto');
ok(env.DB._db.prepare('SELECT stato FROM contenuti WHERE id=?').get(c1.id).stato === 'programmato', 'approvato con data → programmato');

console.log('\n5) proposta con modifiche e rifacimento');
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Altra richiesta di prova' } }); const rid2 = r.j.riunione;
await cron();
r = await chiama('/api/riunioni/' + rid2 + '/rifai', { method: 'POST', body: { nota: 'più ironiche' } }); ok(r.status === 200 && r.j.id, 'rifai riunione');
const rid3 = r.j.id;
ok((await chiama('/api/riunioni/' + rid2)).j.stato === 'chiusa', 'la vecchia riunione è chiusa');
await cron();
r = await chiama('/api/riunioni/' + rid3); ok(r.j.stato === 'proposte', 'la nuova riunione ha le proposte');
r = await chiama('/api/riunioni/' + rid3 + '/scegli', { method: 'POST', body: { indice: 1, modifica: 'tono ironico, niente reel' } });
ok(r.status === 200 && r.j.incarichi.length === 1 && !r.j.reel, 'scelta con modifiche: piano aggiornato da Alba');

console.log('\n6) seconda proposta con reel e copioni');
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Reel e copioni' } }); const rid4 = r.j.riunione;
await cron();
r = await chiama('/api/riunioni/' + rid4 + '/scegli', { method: 'POST', body: { indice: 1 } });
ok(r.status === 200 && r.j.reel && r.j.piano, 'parte un reel e un piano copioni (' + JSON.stringify(r.j).slice(0, 120) + ')');

console.log('\n7) riunione operativa settimanale');
r = await chiama('/api/riunioni/settimanale', { method: 'POST' }); ok(r.status === 200 && r.j.id, 'convocata a mano');
const sid = r.j.id;
r = await chiama('/api/riunioni/settimanale', { method: 'POST' }); ok(r.j.id === sid, 'non ne apre due insieme');
r = await chiama('/api/riunioni'); ok(r.j.find((x) => x.id === sid)?.partecipanti.length === 9, 'ci sono tutti e 9 i capireparto');
await cron();
r = await chiama('/api/riunioni/' + sid); ok(r.j.stato === 'report' && r.j.report?.priorita?.length && r.j.report?.dati?.periodo, 'report pronto con i numeri del sistema');

console.log('\n8) credito Claude finito');
stato.modoClaude = 'credito';
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Richiesta senza credito' } }); const rid5 = r.j.riunione;
await cron();
r = await chiama('/api/riunioni/' + rid5); ok(r.j.stato === 'in_corso' && /Credito/.test(r.j.errore || ''), 'la riunione aspetta il credito invece di fallire');
ok(r.j.tentativi === 0, 'i tentativi non si consumano');
stato.modoClaude = 'ok'; sblocca('riunioni');
await cron();
r = await chiama('/api/riunioni/' + rid5); ok(r.j.stato === 'proposte', 'ricaricato il credito, la riunione riparte da sola');

console.log('\n9) chat del gestionale (Gino)');
r = await chiama('/api/chat/gestionale', { method: 'POST', body: { testo: 'segnami uno shooting il 12' } });
ok(r.status === 200 && r.j.azioni?.length === 1, 'Gino crea l’evento nel gestionale');
ok(GEST._db.prepare("SELECT COUNT(*) n FROM records WHERE store='eventi'").get().n === 1, 'evento salvato nel D1 del gestionale');

console.log('\n10) personaggi 3D');
r = await chiama('/persone/elenco.json'); ok(r.status === 200 && Array.isArray(r.j), 'elenco personaggi');
r = await chiama('/persone/Remy.glb'); ok(r.status === 404, 'personaggio mancante → 404 pulito');
r = await chiama('/persone/prendi?t=x', { method: 'POST', body: {} }); ok(r.status === 403, 'senza gettone niente caricamenti');

console.log('\n12) profilo IG con avatar');
r = await chiama('/api/avatar', { method: 'POST', body: { argomento: 'perché i reel dei ristoranti non funzionano', numero: 3 } }); ok(r.status === 200 && r.j.id, 'argomento ricevuto');
const aid = r.j.id;
await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.fase === 'virali' && r.j.ricerca?.fatti?.length === 1 && r.j.ricerca.fonti.length === 1, 'Sofia: ricerca con fonti, il fatto con fonte inventata è scartato');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.fase === 'copioni' && r.j.virali?.ganci_che_funzionano?.length, 'Zoe: video virali studiati (' + (r.j.virali?.video?.length || 0) + ' video)');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.stato === 'da_approvare' && r.j.copioni.length === 3, 'Nora: 3 copioni da approvare');
r = await chiama('/api/avatar/' + aid + '/approva', { method: 'POST', body: { n: [1, 3], modifiche: { 3: 'testo modificato da Johnny' } } }); ok(r.status === 200, 'approvo 2 copioni, uno modificato');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.stato === 'attende_avatar', 'senza chiave HeyGen aspetta (e lo dice)');
env.HEYGEN_API_KEY = 'hg-finta'; sblocca('avatar_piani'); await cron();
ok(stato.heygen.length === 2 && stato.heygen[1].video_inputs[0].voice.input_text === 'testo modificato da Johnny', 'Ava: 2 video chiesti a HeyGen con il testo approvato');
ok(stato.heygen[0].video_inputs[0].character.avatar_id === '789cba3ed8ce45e98b0695720f3b8966', 'usa il tuo avatar');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.fase === 'montaggio' && r.j.video.every((v) => v.stato === 'fatto'), 'video pronti');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.stato === 'fatto' && r.j.lavori.length === 2, 'partono 2 montaggi nel comparto Reel');
const lav = env.DB._db.prepare("SELECT fonte, stile, pcloud FROM lavori WHERE fonte='url'").all();
ok(lav.length >= 2 && JSON.parse(lav.at(-1).stile).genere === 'educativo' && JSON.parse(lav.at(-1).pcloud)[0].url.startsWith('https://heygen.example/'), 'montaggio con stile educativo e video da link');
r = await chiama('/api/avatar/' + aid + '/video', { method: 'POST', body: { video: [{ n: 1, url: 'https://altro.example/x.mp4' }] } }); ok(r.status === 200, 'si possono anche passare video generati fuori (Claude in chat)');

console.log('\n13) "per il mio profilo personale" → parte tutto, poi Instagram');
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Alba, per il mio profilo personale preparami 2 reel sul perché i preventivi bassi uccidono le agenzie' } });
ok(r.status === 200 && r.j.avatar && !r.j.riunione, 'niente riunione: parte subito il piano del profilo (#' + r.j.avatar + ')');
const pid = r.j.avatar;
r = await chiama('/api/avatar/' + pid); ok(r.j.numero === 2 && r.j.argomento.startsWith('perché i preventivi') && r.j.fase === 'ricerca', 'numero e argomento capiti: ' + r.j.argomento);
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'fammi dei reel per il mio profilo IG' } }); ok(!r.j.avatar && /argomento/.test(r.j.risposta), 'senza argomento Alba lo chiede');
// Instagram: modulo finto collegato come service binding
const igCoda = [];
env.IG_INTERNO_KEY = 'chiave-interna-finta';
env.IG = { fetch: async (u, o) => { const url = new URL(u); if (o.headers['x-admin-key'] !== env.IG_INTERNO_KEY) return new Response('{"errore":"Non autorizzato"}', { status: 401 });
  if (url.pathname === '/coda' && o.method === 'POST') { const b = JSON.parse(o.body); const it = { id: 'ig' + (igCoda.length + 1), ...b, stato: 'programmato' }; igCoda.push(it); return new Response(JSON.stringify(it), { status: 201 }); }
  if (url.pathname === '/coda') return new Response(JSON.stringify(igCoda)); if (url.pathname === '/stato') return new Response('{"profilo":{"username":"prova"}}'); return new Response('{}', { status: 404 }); } };
const lavAv = (await chiama('/api/avatar/' + aid)).j.lavori;
r = await chiama('/api/avatar/' + aid + '/pubblica', { method: 'POST', body: { n: 'tutti' } }); ok(r.j.fatti?.every((f) => /non ancora pronto/.test(f.errore || '')), 'non pubblica reel non ancora montati');
env.DB._db.prepare("UPDATE lavori SET stato='pronto' WHERE id=?").run(lavAv[0].lavoro);
await env.VIDEO.put('lavoro-' + lavAv[0].lavoro + '/reel.mp4', new Uint8Array([1, 2, 3]).buffer, { metadata: { tipo: 'video/mp4' } });
r = await chiama('/api/avatar/' + aid); ok(r.j.lavori[0].stato === 'pronto' && r.j.orari.length >= 1, 'la pagina sa quali reel sono pronti e propone gli orari');
r = await chiama('/api/avatar/' + aid + '/pubblica', { method: 'POST', body: { n: [lavAv[0].n], quando: { [lavAv[0].n]: '2026-12-01T18:00:00Z' } } });
ok(r.j.ok && igCoda.length === 1 && igCoda[0].publish_at === '2026-12-01T18:00:00.000Z' && igCoda[0].type === 'reel' && igCoda[0].ai_generated, 'reel messo in coda su Instagram all orario scelto');
ok(igCoda[0].caption.length > 3, 'caption con hashtag dal copione');
const mu = new URL(igCoda[0].media_url);
let g = await W.fetch(new Request('https://x' + mu.pathname + mu.search), env, {}); ok(g.status === 200 && (await g.arrayBuffer()).byteLength === 3, 'Meta può scaricare il reel dal link firmato');
g = await W.fetch(new Request('https://x' + mu.pathname + '?f=sbagliata'), env, {}); ok(g.status === 403, 'senza firma giusta il reel non si scarica');
r = await chiama('/api/avatar/' + aid + '/pubblica', { method: 'POST', body: { n: [lavAv[0].n] } }); ok(r.status === 400 && igCoda.length === 1, 'non lo programma due volte');
r = await chiama('/api/avatar/' + aid); ok(r.j.lavori[0].ig_stato === 'programmato', 'la pagina mostra lo stato su Instagram');

console.log('\n14) contatori dei costi');
r = await chiama('/api/consumi?giorni=30');
ok(r.status === 200 && r.j.totale.chiamate > 5 && r.j.totale.costo > 0, 'le chiamate sono contate (' + r.j.totale.chiamate + ', $' + r.j.totale.costo.toFixed(3) + ')');
const aree = r.j.aree.map((a) => a.area);
ok(['reel', 'riunioni', 'uffici', 'profilo'].every((a) => aree.includes(a)), 'divise per area: ' + aree.join(', '));
ok(r.j.agenti.some((a) => a.agente === 'capo') && r.j.agenti.some((a) => a.agente === 'ricerca'), 'divise per agente: ' + r.j.agenti.map((a) => a.agente).join(', '));
ok(r.j.servizi.some((s) => s.servizio === 'heygen' && s.costo > 1.9), 'HeyGen contato a minuti di video');
ok(r.j.reel.length >= 1 && r.j.profilo.length >= 1, 'costo per reel e per argomento del profilo');
ok(Math.abs(r.j.fissi_totale - 5) < 0.01 && r.j.proiezione_mese >= 5, 'costi fissi e previsione del mese');

console.log('\n15) gestionale ufficiale dentro la regia');
const visti = [];
env.GESTAPP = { fetch: async (rq) => { visti.push({ url: rq.url, cookie: rq.headers.get('cookie'), csrf: rq.headers.get('x-momento') });
  if (new URL(rq.url).pathname === '/') return new Response('<html><script>api(`/api/data`);fetch("/api/login")</script></html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" } });
  return new Response('{"ok":true}', { headers: { 'content-type': 'application/json', 'set-cookie': 'sess=' + 'a'.repeat(64) + '; Path=/; HttpOnly; Secure; SameSite=Strict' } }); } };
let gr = await chiama('/gestionale/', { grezzo: true }); const gh = await gr.text();
ok(gr.status === 200 && gh.includes('/gestionale/api/data') && !gh.includes('`/api/'), 'la pagina del gestionale arriva con gli indirizzi giusti');
ok(!gr.headers.get('x-frame-options') && gr.headers.get('content-security-policy').includes("frame-ancestors 'self'"), 'si può mostrare dentro la regia');
gr = await chiama('/gestionale/api/login', { method: 'POST', body: { u: 1 }, grezzo: true });
ok(visti.at(-1).url === 'https://momento-gestionale/api/login' && !String(visti.at(-1).cookie || '').includes('mr_s'), 'le chiamate vanno al gestionale senza il cookie della regia');
ok(/Path=\/gestionale\//.test(gr.headers.get('set-cookie') || ''), 'la sessione del gestionale resta sotto /gestionale/');
const fuori = await W.fetch(new Request('https://x/gestionale/api/data'), env, {}); ok(fuori.status === 401, 'senza accesso alla regia il gestionale non si raggiunge da qui');

console.log('\n16) post e caroselli');
await chiama('/api/accedi', { method: 'POST', body: { password: 'provaprova' } });
r = await chiama('/api/post', { method: 'POST', body: { cliente: 'Torretta', nicchia: 'caffetteria Salerno', tipo: 'carosello', numero: 3, slide: 7, brief: '3 caroselli sulla tostatura e le miscele della casa', pcloud: 'https://e.pcloud.link/publink/show?code=XYZ' } });
ok(r.status === 200 && r.j.id, 'nuovo lavoro post (#' + r.j.id + ') ' + (r.j.errore || ''));
const pid2 = r.j.id;
env.APIFY_TOKEN = 'apify-finto';
const giro = async () => { env.DB._db.prepare('UPDATE post_lavori SET blocco_fino=NULL').run(); await cron(); return (await chiama('/api/post/' + pid2)).j; };
let P = await giro();
ok(P.fase === 'studio' && P.virali.post.length === 3 && P.virali.post[0].carosello && !P.virali.post.some((x) => x.url.includes('CCC')), 'Ines e Tea: virali trovati, i video scartati, i caroselli prima (' + P.virali.post.map((x) => x.piattaforma).join(', ') + ')');
P = await giro(); ok(P.fase === 'foto' && P.studio.ganci.length && P.studio.immagini_viste > 0, 'Iris: studio con le slide guardate (' + P.studio.immagini_viste + ')');
P = await giro(); ok(P.fase === 'contenuti' && P.foto.foto.length === 2 && P.foto.foto.some((f) => f.uso === 'scarta'), 'Ada: foto guardate, la mossa scartata');
P = await giro(); ok(P.stato === 'da_approvare' && P.contenuti.post.length === 3 && P.contenuti.post[0].slide[0].foto === 'a.jpg', 'Pietro e Giulia: 3 caroselli (non 4), con la foto giusta in copertina');
r = await chiama('/api/post/' + pid2 + '/approva', { method: 'POST', body: { n: [1, 2], modifiche: { 1: { caption: 'caption di Johnny' } } } });
P = (await chiama('/api/post/' + pid2)).j;
ok(P.stato === 'attende_canva' && P.contenuti.post[0].caption === 'caption di Johnny' && P.contenuti.post[2].stato === 'scartato', 'Johnny approva 2 caroselli, uno modificato: pronti per Canva');
r = await chiama('/api/post/' + pid2 + '/canva', { method: 'POST', body: { post: [{ n: 1, design_id: 'DAF1234567x', link: 'https://www.canva.com/design/DAF/edit', png: ['https://export.canva.example/1.png', 'https://export.canva.example/2.png'] }] } });
P = await giro();
ok(P.stato === 'fatto' && P.slide_file.length === 2, 'le slide di Canva tornano in archivio');
let im = await chiama('/api/post/' + pid2 + '/slide/1-2.png', { grezzo: true }); ok(im.status === 200 && im.headers.get('content-type') === 'image/png', 'slide scaricabile');
im = await chiama('/api/post/img?u=' + encodeURIComponent('https://evil.example/x.jpg'), { grezzo: true }); ok(im.status === 400, 'anteprime solo da Instagram/TikTok');
r = await chiama('/api/consumi?giorni=30'); ok(r.j.aree.some((a) => a.area === 'post'), 'i costi dei post sono contati');

console.log('\n11) pagina: lo script si compila');
const html = await (await chiama('/', { grezzo: true })).text();
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
try { new Function(script[1]); ok(true, 'JavaScript della pagina valido'); } catch (e) { ok(false, 'JavaScript della pagina: ' + e.message); }

console.log('\n' + (errori.length ? '❌ ' + errori.length + ' problemi:\n - ' + errori.join('\n - ') : '✅ tutto ok') + '\n');
process.exit(errori.length ? 1 : 0);
