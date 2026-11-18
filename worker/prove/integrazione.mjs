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

console.log('\n11) pagina: lo script si compila');
const html = await (await chiama('/', { grezzo: true })).text();
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
try { new Function(script[1]); ok(true, 'JavaScript della pagina valido'); } catch (e) { ok(false, 'JavaScript della pagina: ' + e.message); }

console.log('\n' + (errori.length ? '❌ ' + errori.length + ' problemi:\n - ' + errori.join('\n - ') : '✅ tutto ok') + '\n');
process.exit(errori.length ? 1 : 0);
