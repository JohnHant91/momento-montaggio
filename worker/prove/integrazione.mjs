// Prova completa del worker con D1 (sqlite), KV in memoria e Claude simulato.
// Uso: node prove/integrazione.mjs   (dalla cartella worker, dopo la build in dist/)
import { W, env, GEST, chiama, cron, sblocca, stato } from './finto.mjs';
import { correggiTesti } from '../src/lavoro.js';
import { configurazione } from '../src/db.js';
import { linkFirmato, firmaSorgenti } from '../src/archivio.js';
const errori = [];
const ok = (cond, cosa) => { if (cond) console.log('  ✓', cosa); else { console.log('  ✗', cosa); errori.push(cosa); } };
console.log('\n1) pagina e accesso');
let r = await chiama('/'); ok(r.status === 200 && String(r.j).includes('<html'), 'la pagina si apre');
r = await chiama('/api/azienda'); ok(r.status === 401 || r.status === 403, 'senza accesso le API sono chiuse (' + r.status + ')');
env.DB._db.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('APPROVAZIONI_INTERMEDIE','si')").run(); // la suite copre il percorso con le approvazioni
r = await chiama('/api/stato'); ok(r.j.configurato === false, 'accesso ancora da creare');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'johnny@prova.it', password: 'corta' } }); ok(r.status === 400, 'password troppo corta rifiutata al primo accesso');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'johnny@prova.it', password: 'provaprova' } }); ok(r.status === 200 && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(r.j.codice_recupero || ''), 'primo accesso: email e password salvate, codice di recupero dato');
const codice1 = r.j.codice_recupero;
r = await chiama('/api/azienda'); ok(r.status === 200, 'dopo il primo accesso si entra');
r = await chiama('/api/esci');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'johnny@prova.it', password: 'sbagliata1' } }); ok(r.status === 401, 'password errata rifiutata');
r = await chiama('/api/accedi', { method: 'POST', body: { password: 'provaprova' } }); ok(r.status === 400, 'senza email rifiutato');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'altro@prova.it', password: 'provaprova' } }); ok(r.status === 401, 'email diversa da quella registrata rifiutata');
r = await chiama('/api/recupera', { method: 'POST', body: { email: 'johnny@prova.it', codice: 'AAAA-BBBB-CCCC-DDDD', password: 'nuovapass1' } }); ok(r.status === 401, 'codice di recupero sbagliato rifiutato');
r = await chiama('/api/recupera', { method: 'POST', body: { email: 'johnny@prova.it', codice: codice1.toLowerCase().replace(/-/g, ' '), password: 'nuovapass1' } }); ok(r.status === 200 && r.j.codice_recupero && r.j.codice_recupero !== codice1, 'recupero: nuova password e nuovo codice');
r = await chiama('/api/recupera', { method: 'POST', body: { email: 'johnny@prova.it', codice: codice1, password: 'altrapass1' } }); ok(r.status === 401, 'il codice usato non vale più');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'johnny@prova.it', password: 'provaprova' } }); ok(r.status === 401, 'la password vecchia non vale più');
r = await chiama('/api/accedi', { method: 'POST', body: { email: 'Johnny@Prova.it', password: 'nuovapass1' } }); ok(r.status === 200, 'accesso con la password nuova (email con maiuscole)');
r = await chiama('/api/password', { method: 'POST', body: { attuale: 'sbagliata', nuova: 'provaprova' } }); ok(r.status === 400, 'cambio password: serve quella attuale');
r = await chiama('/api/password', { method: 'POST', body: { attuale: 'nuovapass1', nuova: 'provaprova' } }); ok(r.status === 200 && r.j.codice_recupero, 'cambio password riuscito');
r = await chiama('/api/azienda'); ok(r.status === 200, 'dopo il cambio resti dentro');
r = await chiama('/sala3d.js'); ok(r.status === 200, 'modulo sala 3D servito');

console.log('\n2) agenzia e sala');
r = await chiama('/api/azienda'); ok(r.status === 200 && r.j.squadra?.capo?.r?.includes('Direttrice'), 'Alba è la Direttrice');
r = await chiama('/api/riunioni'); ok(r.status === 200 && Array.isArray(r.j), 'elenco riunioni vuoto ok');

console.log('\n3) richiesta → piano eseguito subito (niente riunione preventiva)');
r = await chiama('/api/capo', { method: 'POST', body: { testo: '6 post di dicembre per Villetta Prova, romantici' } });
ok(r.status === 200 && r.j.riunione, 'la richiesta apre un lavoro (#' + r.j.riunione + ')');
const rid = r.j.riunione;
r = await chiama('/api/riunioni'); ok(r.j.some((x) => x.tipo === 'settimanale'), 'primo comando della settimana: parte la riunione operativa (report)');
await chiama('/api/capo', { method: 'POST', body: { testo: 'Ciao Alba' } });
r = await chiama('/api/riunioni'); ok(r.j.filter((x) => x.tipo === 'settimanale').length === 1, 'la riunione operativa si fa una sola volta a settimana');
env.DB._db.prepare("UPDATE riunioni SET stato='report' WHERE tipo='settimanale'").run();
env.DB._db.prepare("DELETE FROM riunioni WHERE richiesta='Ciao Alba'").run();
await cron();
r = await chiama('/api/riunioni/' + rid); ok(r.j.stato === 'proposte' && r.j.proposte.length >= 2, 'la riunione porta le proposte e aspetta la scelta di Johnny');
await chiama('/api/riunioni/' + rid + '/scegli', { method: 'POST', body: { indice: 0 } }); 
r = await chiama('/api/riunioni/' + rid); ok(r.j.stato === 'decisa', 'scelta la proposta, parte il piano');
const inc = (await chiama('/api/incarichi')).j;
ok(inc.length === 3, 'partono 3 incarichi (agente inesistente scartato)');
ok(inc.every((i) => i.cliente) , 'il nuovo cliente è stato creato e collegato');
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
{ const d1 = (await chiama('/api/approvazioni/documenti')).j; ok(Array.isArray(d1) && d1.length >= 1, 'i documenti degli agenti arrivano in Approvazioni (' + d1.length + ')'); await chiama('/api/incarichi/' + d1[0].id + '/visto', { method: 'POST', body: {} }); const d2 = (await chiama('/api/approvazioni/documenti')).j; ok(d2.length === d1.length - 1, 'letto: esce dalle Approvazioni'); }
r = await chiama('/api/contenuti'); ok(r.j.length === 2, 'contenuti in approvazione');
const c1 = r.j[0];
r = await chiama('/api/contenuti/' + c1.id, { method: 'POST', body: { azione: 'approva' } }); ok(r.status === 200, 'approvo un contenuto');
ok(env.DB._db.prepare('SELECT stato FROM contenuti WHERE id=?').get(c1.id).stato === 'programmato', 'approvato con data → programmato');

console.log('\n5) altre richieste: partono da sole');
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Altra richiesta di prova' } }); const rid2 = r.j.riunione;
await cron();
await chiama('/api/riunioni/' + rid2 + '/scegli', { method: 'POST', body: { indice: 0 } }); 
ok((await chiama('/api/riunioni/' + rid2)).j.stato === 'decisa', 'seconda richiesta: scelta e partita');

console.log('\n6) richiesta con reel e copioni');
r = await chiama('/api/capo', { method: 'POST', body: { testo: 'Reel e copioni' } }); const rid4 = r.j.riunione;
await cron();
await chiama('/api/riunioni/' + rid4 + '/scegli', { method: 'POST', body: { indice: 0 } }); 
r = await chiama('/api/riunioni/' + rid4);
ok(r.j.stato === 'decisa' && r.j.esito?.reel && r.j.esito?.piano, 'parte un reel e un piano copioni (' + JSON.stringify(r.j.esito || {}).slice(0, 120) + ')');

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
r = await chiama('/api/avatar/' + aid); ok(r.j.fase === 'copioni' && r.j.virali?.video?.length && !r.j.virali.ganci_che_funzionano, 'virali trovati, senza la chiamata a parte di Zoe (' + (r.j.virali?.video?.length || 0) + ' video)');
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
{ await cron(); const la = env.DB._db.prepare("SELECT fase, piano FROM lavori WHERE stile LIKE '%avatar%' ORDER BY id LIMIT 1").get();
  ok(la && la.fase !== 'clip' && JSON.parse(la.piano || '{}').youtube_query?.length, 'reel avatar: cerca i reel di riferimento sul tema (fase ' + la?.fase + ')'); }
const lav = env.DB._db.prepare("SELECT fonte, stile, pcloud FROM lavori WHERE fonte='url'").all();
ok(lav.length >= 2 && lav.slice(-2).map((x) => JSON.parse(x.stile).genere).join() === 'split,split' && JSON.parse(lav.at(-1).pcloud)[0].url.startsWith('https://heygen.example/'), 'i reel avatar usano lo split variante box, video da link');
r = await chiama('/api/avatar/' + aid); ok(r.j.idee.length === 10 && r.j.idee.filter((x) => x.usata).length === 3, 'una ricerca, 10 idee: 3 scritte, 7 in riserva');
ok(r.j.virali.ganci_che_funzionano?.length && r.j.virali.video?.length, 'Nora ricava gli schemi dei virali nella stessa chiamata delle idee');
r = await chiama('/api/avatar/' + aid + '/idea', { method: 'POST', body: { i: 5 } }); ok(r.status === 200, 'scelgo un\'idea in riserva');
r = await chiama('/api/avatar/' + aid + '/idea', { method: 'POST', body: { i: 0 } }); ok(r.status === 400 || r.status === 409, 'idea già usata o lavoro in corso: rifiutata');
sblocca('avatar_piani'); await cron();
r = await chiama('/api/avatar/' + aid); ok(r.j.stato === 'da_approvare' && r.j.copioni.length === 4 && r.j.copioni.at(-1).titolo === 'Reel dalla riserva' && r.j.idee[5].usata === 4, 'Nora scrive il copione dalla riserva senza rifare la ricerca');
r = await chiama('/api/avatar/' + aid + '/approva', { method: 'POST', body: { n: [4] } }); ok(r.status === 200, 'approvo il nuovo');
r = await chiama('/api/avatar/' + aid); ok(r.j.copioni.filter((c) => c.stato === 'approvato').length === 3, 'i copioni già fatti restano approvati');
sblocca('avatar_piani'); await cron();
ok(stato.heygen.length === 3, 'HeyGen genera solo il nuovo');
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
await chiama('/api/accedi', { method: 'POST', body: { email: 'johnny@prova.it', password: 'provaprova' } });
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
ok(P.fase === 'impagina' && P.stato === 'in_corso' && P.contenuti.post[0].caption === 'caption di Johnny' && P.contenuti.post[2].stato === 'scartato', 'Johnny approva 2 caroselli, uno modificato: vanno all\'impaginatore');
{ const { preparaImpaginazione } = await import('../src/impagina.js');
  const Pr = env.DB._db.prepare('SELECT * FROM post_lavori WHERE id=?').get(pid2); const pac = await preparaImpaginazione(env, Pr);
  ok(pac.slide.length >= 2 && pac.slide.every((x) => /<!DOCTYPE html>/.test(x.html) && /^post-\d+\/\d+-\d+\.png$/.test(x.chiave)), 'ogni slide approvata diventa una pagina da fotografare (' + pac.slide.length + ')');
  const pass = 'q'.repeat(40); env.DB._db.prepare("UPDATE post_lavori SET canva=? WHERE id=?").run(JSON.stringify({ pass }), pid2);
  const k = pac.slide.slice(0, 2).map((x) => x.chiave);
  for (const c of k) await W.fetch(new Request('https://x/api/motore/impagina/' + pid2 + '/slide?k=' + encodeURIComponent(c), { method: 'PUT', headers: { 'x-pass': pass }, body: new Uint8Array([255, 216, 255]) }), env);
  await W.fetch(new Request('https://x/api/motore/impagina/' + pid2 + '/fine', { method: 'POST', headers: { 'x-pass': pass, 'content-type': 'application/json' }, body: JSON.stringify({ fatte: k, errori: [] }) }), env);
  { const Pp = (await chiama('/api/post/' + pid2)).j; ok(Pp.contenuti.post.some((x) => x.nota_chiara?.nota), 'Chiara ripassa i caroselli prima di Johnny'); }
  P = (await chiama('/api/post/' + pid2)).j; ok(P.stato === 'da_vedere' && P.slide_file.length === 2, 'le slide impaginate tornano e vanno in Approvazioni');
  const a = await chiama('/api/azienda'); ok(a.j.da_approvare >= 1, 'il contatore delle approvazioni le conta'); }
r = await chiama('/api/post/' + pid2 + '/canva', { method: 'POST', body: { post: [{ n: 1, design_id: 'DAF1234567x', link: 'https://www.canva.com/design/DAF/edit', png: ['https://export.canva.example/1.png', 'https://export.canva.example/2.png'] }] } });
P = await giro();
ok(P.stato === 'fatto' && P.slide_file.length === 2, 'le slide di Canva tornano in archivio');
let im = await chiama('/api/post/' + pid2 + '/slide/1-2.png', { grezzo: true }); ok(im.status === 200 && im.headers.get('content-type') === 'image/png', 'slide scaricabile');
im = await chiama('/api/post/img?u=' + encodeURIComponent('https://evil.example/x.jpg'), { grezzo: true }); ok(im.status === 400, 'anteprime solo da Instagram/TikTok');
r = await chiama('/api/consumi?giorni=30'); ok(r.j.aree.some((a) => a.area === 'post'), 'i costi dei post sono contati');

console.log('\n17) caroselli su Instagram');
r = await chiama('/api/post/' + pid2 + '/pubblica', { method: 'POST', body: { n: [1] } }); ok(r.status === 400 && /collegato/.test(r.j.errore), 'cliente senza Instagram collegato: non pubblica (mai sul tuo profilo)');
env.DB._db.prepare('UPDATE post_lavori SET cliente_id=3 WHERE id=?').run(pid2);
r = await chiama('/api/post/' + pid2 + '/pubblica', { method: 'POST', body: { n: [1] } }); ok(r.j.fatti?.[0]?.errore?.includes('JPG'), 'slide PNG: chiede di esportarle in JPG');
for (const k of ['1-1', '1-2']) await env.VIDEO.put('post-' + pid2 + '/' + k + '.png', new Uint8Array([255, 216, 255]).buffer, { metadata: { tipo: 'image/jpeg' } });
igCoda.length = 0;
r = await chiama('/api/post/' + pid2 + '/pubblica', { method: 'POST', body: { n: [1], quando: { 1: '2026-12-02T18:00:00Z' } } });
ok(r.j.ok && igCoda[0]?.type === 'carousel' && igCoda[0].media_urls.length === 2 && igCoda[0].caption.startsWith('caption di Johnny'), 'carosello in coda su Instagram con le 2 slide e la caption');
const su = new URL(igCoda[0].media_urls[1]);
let gs = await W.fetch(new Request('https://x' + su.pathname + su.search), env, {}); ok(gs.status === 200 && gs.headers.get('content-type') === 'image/jpeg', 'Meta scarica la slide dal link firmato');
gs = await W.fetch(new Request('https://x' + su.pathname + '?f=no'), env, {}); ok(gs.status === 403, 'senza firma no');
P = (await chiama('/api/post/' + pid2)).j; ok(P.contenuti.post[0].ig_stato === 'programmato' && P.instagram.suo_profilo, 'la pagina mostra lo stato su Instagram');

r = await chiama('/api/capo', { method: 'POST', body: { testo: 'per il mio profilo personale fammi 2 caroselli sugli errori nei preventivi delle agenzie' } });
ok(r.j.post && !r.j.avatar && !r.j.riunione, 'Alba: "caroselli per il mio profilo" parte nel comparto Post (#' + r.j.post + ')');
P = (await chiama('/api/post/' + r.j.post)).j; ok(P.numero === 2 && P.tipo === 'carosello' && P.cliente_id === 3, 'due caroselli sul tuo profilo ' + JSON.stringify([P.numero, P.tipo, P.cliente_id]));

console.log('\n11) pagina: lo script si compila');
const html = await (await chiama('/', { grezzo: true })).text();
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
{ const r1 = await chiama('/api/lavori', { method: 'POST', body: { prompt: 'reel della pizzeria con le mie clip in cucina', pcloud: 'https://e.pcloud.link/publink/show?code=ABC', solo_clip: true } }); ok(r1.status === 200, 'nuovo reel con solo le mie clip');
  sblocca('lavori'); await cron(); const Lx = env.DB._db.prepare('SELECT fase, stile FROM lavori WHERE id=?').get(r1.j.id); ok(JSON.parse(Lx.stile || '{}').solo_clip && !['ricerca', 'riferimenti', 'piano'].includes(Lx.fase), 'con solo le mie clip niente ricerca sulle piattaforme (fase ' + Lx.fase + ')'); }
try { new Function(script[1]); ok(true, 'JavaScript della pagina valido'); } catch (e) { ok(false, 'JavaScript della pagina: ' + e.message); }

{ const G = [{ tipo: 'titolo', dati: { testo: 'Perche nessuno lo sa' } }, { tipo: 'card', dati: { titolo: 'Ok', testo: 'giusto' } }];
  await correggiTesti(env, await configurazione(env), { id: null, prompt: 'copione' }, [{ trascrizione: [{ testo: 'perché nessuno lo sa' }] }], { grafiche: G });
  ok(G[0].dati.testo === 'Perche nessuno lo sa (corretto)' && G[1].dati.titolo === 'Ok', 'il correttore sistema i testi delle grafiche sbagliati e lascia quelli giusti'); }
console.log('\nArchivio interno (R2)');
{ let a = await chiama('/api/archivio/cartella', { method: 'POST', body: { percorso: 'Clienti/Torretta/Panettoni' } }); ok(a.status === 200, 'cartella cliente/progetto creata con le intermedie');
  await chiama('/api/archivio/cartella', { method: 'POST', body: { percorso: '../Musica/Natalizia/' } });
  a = await chiama('/api/archivio?cartella=Clienti/Torretta'); ok(a.j.voci.some((v) => v.nome === 'Panettoni' && v.tipo === 'cartella'), 'la sottocartella si vede');
  a = await chiama('/api/archivio'); ok(a.j.voci.some((v) => v.percorso === 'Musica'), 'percorso ripulito (niente ..)');
  await chiama('/api/archivio/carica?p=' + encodeURIComponent('Clienti/Torretta/Panettoni/C0001.MP4'), { method: 'PUT', body: 'video finto 1' });
  await chiama('/api/archivio/carica?p=' + encodeURIComponent('Clienti/Torretta/Panettoni/C0002.MP4'), { method: 'PUT', body: 'video finto 2' });
  await chiama('/api/archivio/carica?p=' + encodeURIComponent('Clienti/Torretta/logo.png'), { method: 'PUT', body: 'png' });
  await chiama('/api/archivio/carica?p=' + encodeURIComponent('Musica/Natalizia/Jingle.mp3'), { method: 'PUT', body: 'mp3' });
  await chiama('/api/archivio/carica?p=' + encodeURIComponent('Musica/Allegra/Sole.mp3'), { method: 'PUT', body: 'mp3' });
  // file grande a pezzi
  const I = (await chiama('/api/archivio/carica/inizio', { method: 'POST', body: { percorso: 'Clienti/Torretta/Panettoni/GRANDE.MOV', mime: 'video/quicktime' } })).j;
  const p1 = (await chiama('/api/archivio/carica/parte?p=' + encodeURIComponent(I.percorso) + '&u=' + I.upload + '&n=1', { method: 'PUT', body: 'aaaa' })).j;
  const p2 = (await chiama('/api/archivio/carica/parte?p=' + encodeURIComponent(I.percorso) + '&u=' + I.upload + '&n=2', { method: 'PUT', body: 'bb' })).j;
  a = await chiama('/api/archivio/carica/fine', { method: 'POST', body: { percorso: I.percorso, upload: I.upload, parti: [p1, p2], mime: 'video/quicktime' } });
  ok(a.status === 200 && /aaaa.*bb/.test(new TextDecoder().decode(env.ARCHIVIO._m.get('Clienti/Torretta/Panettoni/GRANDE.MOV').b)), 'file grande caricato a pezzi e ricomposto');
  a = await chiama('/api/archivio?cartella=Clienti/Torretta/Panettoni'); ok(a.j.voci.filter((v) => v.tipo === 'video').length === 3, 'i video del progetto sono in elenco');
  a = await chiama('/api/archivio/file?p=' + encodeURIComponent('Musica/Natalizia/Jingle.mp3')); ok(a.status === 200, 'il file si scarica dall\'app');
  // reel: la cartella si trova dal testo, la musica arriva da Musica/<umore>, il logo dalla cartella del cliente
  a = await chiama('/api/lavori', { method: 'POST', body: { prompt: 'Reel natalizio per la Torretta sui panettoni artigianali, 20 secondi, con la musica dall\'archivio', solo_clip: true } });
  const lid = a.j.id; let Lr = env.DB._db.prepare('SELECT fonte, pcloud FROM lavori WHERE id=?').get(lid);
  ok(Lr.fonte === 'archivio' && Lr.pcloud === 'Clienti/Torretta/Panettoni', 'il reel prende da solo la cartella Clienti/Torretta/Panettoni');
  for (let k = 0; k < 6; k++) { sblocca('lavori'); await cron(); Lr = env.DB._db.prepare('SELECT fase, clip FROM lavori WHERE id=?').get(lid); if (Lr.clip) break; }
  const cl = JSON.parse(Lr.clip || '[]');
  ok(cl.length === 4 && cl.some((c) => c.tipo === 'musica' && c.nome === 'Jingle.mp3') && !cl.some((c) => /logo/.test(c.nome)), 'clip dall\'archivio + brano natalizio dalla cartella Musica, logo escluso (' + cl.map((c) => c.nome).join(', ') + ')');
  { const u = await linkFirmato(env, 'https://x', 'Clienti/Torretta/Panettoni/C0001.MP4');
    const g = await W.fetch(new Request(u), env); ok(g.status === 200 && (await g.text()).includes('video finto 1'), 'il motore scarica con il link firmato');
    const g2 = await W.fetch(new Request(u.replace(/f=[0-9a-f]/, 'f=z')), env); ok(g2.status === 403, 'link manomesso rifiutato');
    const P = await firmaSorgenti(env, 'https://x', { segmenti: [{ url: 'archivio:Clienti/Torretta/Panettoni/C0002.MP4' }] }); ok(P.segmenti[0].url.startsWith('https://x/archivio-file?'), 'i pezzi del montaggio dall\'archivio diventano link firmati'); }
  a = await chiama('/api/archivio?p=' + encodeURIComponent('Clienti/Torretta/Panettoni'), { method: 'DELETE' });
  ok(a.j.eliminati === 3 && !env.ARCHIVIO._m.has('Clienti/Torretta/Panettoni/C0001.MP4'), 'cartella eliminata con i suoi file');
}
console.log('\nImportazione da pCloud');
{ let a = await chiama('/api/archivio/importa', { method: 'POST', body: { link: 'https://e.pcloud.link/publink/show?code=XYZ', cartella: 'Clienti/Torretta/Caffè' } });
  ok(a.status === 200 && a.j.file >= 2, 'la cartella pCloud viene letta (' + a.j.file + ' file)');
  const iid = a.j.id; const pass = 'p'.repeat(40);
  env.DB._db.prepare("UPDATE importazioni SET pass=?, stato='in_corso' WHERE id=?").run(pass, iid);
  const mot = (az, i, body, extra = '', metodo = 'POST') => W.fetch(new Request('https://x/api/motore/importa/' + iid + '/' + az + '?i=' + i + extra, { method: metodo, headers: { 'x-pass': pass, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body || {}) }), env).then((r) => r.json());
  const F = JSON.parse(env.DB._db.prepare('SELECT file FROM importazioni WHERE id=?').get(iid).file);
  for (let i = 0; i < F.length; i++) { const I = await mot('inizio', i); const pz = await mot('parte', i, 'contenuto' + i, '&u=' + I.upload + '&n=1', 'PUT'); await mot('fine', i, { upload: I.upload, parti: [pz] }); }
  a = await chiama('/api/archivio/importazioni?cartella=Clienti/Torretta/Caffè'); ok(a.j[0]?.stato === 'fatto' && a.j[0].fatti === F.length, 'importazione completata, file nell\'archivio');
  a = await chiama('/api/archivio?cartella=' + encodeURIComponent('Clienti/Torretta/Caffè')); ok(a.j.voci.length >= 1, 'i file importati si vedono nella cartella');
  const x = await W.fetch(new Request('https://x/api/motore/importa/' + iid + '/inizio?i=0', { method: 'POST', headers: { 'x-pass': 'sbagliato'.repeat(5) } }), env); ok(x.status === 403, 'senza lasciapassare il motore non scrive');
}
console.log('\n' + (errori.length ? '❌ ' + errori.length + ' problemi:\n - ' + errori.join('\n - ') : '✅ tutto ok') + '\n');
process.exit(errori.length ? 1 : 0);
