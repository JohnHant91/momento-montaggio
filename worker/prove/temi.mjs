// Anteprima di tutti i temi dei caroselli: stesse 7 slide di prova in ogni tema. Uso: node prove/temi.mjs <cartella>
import fs from 'fs';
import { slideHTML, TEMI } from '../src/impagina.js';
const out = process.argv[2] || '/tmp/temi';
fs.mkdirSync(out, { recursive: true });
const stile = { palette: ['#F1EFEA', '#17171A', '#0E9F9A'], mood: 'pulito' };
const S = [
  { ruolo: 'copertina', modello: 'copertina_titolo', titolo: 'Il tuo profilo non vende? 5 errori da togliere', testo: 'Guida pratica per attività locali' },
  { modello: 'testo', icona: 'ph:target-bold', titolo: '1. Parli a tutti, quindi a nessuno', testo: 'Scegli un cliente preciso e scrivi ogni post come se parlassi solo a lui.' },
  { modello: 'lista', titolo: '2. La bio non dice cosa fai', testo: 'Chi sei e per chi lavori\nIl risultato che porti\nUn solo invito chiaro' },
  { modello: 'checklist', titolo: '3. Prima di pubblicare', testo: 'Gancio nei primi 2 secondi\nUna sola idea per post\nInvito finale\nSottotitoli leggibili' },
  { modello: 'confronto', titolo: '4. Come lo dici', testo: '- Siamo leader del settore\n- Qualità e professionalità\n+ Ti consegno il sito in 10 giorni\n+ Ecco il prima e dopo' },
  { modello: 'citazione', titolo: 'Chi guarda non compra il servizio: compra il risultato.', testo: 'Regola numero uno' },
  { ruolo: 'cta', modello: 'cta', titolo: 'Salvalo per il prossimo post', testo: 'Seguimi per altri consigli pratici ogni settimana.' },
];
for (const tema of Object.keys(TEMI)) S.forEach((slide, i) => fs.writeFileSync(`${out}/${tema}-${i + 1}.html`, slideHTML({ slide, i, totale: S.length, stile, logo: null, profilo: 'momentoproduzione', tema, firma: '@momentoproduzione' })));
console.log(Object.keys(TEMI).length, 'temi');
