// IMPAGINATORE: il nostro "Canva". Ogni slide approvata diventa una pagina HTML con un modello di Momento
// (colori, font e logo del cliente), e il motore GitHub la fotografa a 1080×1350 con Chrome. Niente Canva da fare a mano.
import { J, all, one, ora, run, configurazione, log } from './db.js';
import { logoCliente } from './archivio.js';
import { coloriCliente } from './palette.js';
import { clientePerNome, schemaChiara } from './chiara.js';

export const MODELLI = {
  copertina_foto: 'foto a tutto schermo, titolo grande in basso su sfumatura',
  copertina_titolo: 'solo tipografia: titolo enorme su colore pieno del brand, forma grafica di accento',
  testo: 'titolo e paragrafo su sfondo pulito, numero di pagina',
  foto_testo: 'foto nei 3/5 alti, titolo e testo sotto',
  lista: 'titolo e 3-5 punti (scrivi i punti nel testo separati da a capo)',
  citazione: 'frase in grande tra virgolette, autore sotto',
  numero: 'un numero enorme (deve essere nel titolo, vero e dato da Johnny) con la spiegazione sotto',
  cta: 'chiusura: logo, invito all\u2019azione, profilo',
  checklist: 'lista da spuntare con le caselle (il formato più salvato): un punto per riga nel testo',
  confronto: 'due colonne sì/no o prima/dopo: nel testo righe che iniziano con + (giusto) e - (sbagliato)',
  collage: '2-4 foto a griglia con un titolo (metti le altre foto in "altre_foto")',
  editoriale: 'stile rivista: titolo grande serif, foto ritagliata in un riquadro, testo in colonna',
  nota: 'come un post/nota condivisa: scheda bianca con nome del profilo e testo personale, tono diretto',
  panorama: 'una foto orizzontale che continua da una slide all\u2019altra (usa la stessa foto su slide consecutive)',
};
// TEMI: lo stile grafico di tutto il carosello. Stesso contenuto, aspetto diverso: mai due caroselli uguali di fila.
// [descrizione, font titoli, font testo, scala titoli, quando usarlo]
export const TEMI = {
  pulito: ['essenziale: fondo chiaro, sans, icone in riquadro', 'Montserrat', 'Inter', 1, 'servizi|aziend|corporate|profession'],
  linee: ['minimal elegante: filetti sottili, titoli serif leggeri, molta aria ordinata', 'Playfair Display', 'Inter', 1, 'minimal|elegant|beauty|benessere|studio'],
  bold: ['d’impatto: titoli condensati MAIUSCOLI enormi, grande forma tonda', 'Anton', 'Inter', 1.18, 'sport|palestra|energ|street|lancio|promo'],
  notte: ['scuro: fondo quasi nero con bagliore del colore del brand', 'Space Grotesk', 'Inter', 1, 'tech|ai|notte|locale|cocktail|video'],
  rivista: ['editoriale: serif grande, testatina con filetto, taglio da magazine', 'DM Serif Display', 'Lora', 1.05, 'moda|rivista|cultura|vino|ristorante|storia'],
  brutal: ['grafico deciso: cornice e bordi spessi, ombre piene, titolo evidenziato', 'Archivo Black', 'Space Grotesk', 0.92, 'creativ|giovane|agenzia|marketing|trend'],
  morbido: ['soft: macchie di colore sfumate, contenuto in scheda bianca arrotondata', 'Poppins', 'DM Sans', 0.92, 'soft|delicat|bimbi|dolci|pasticc|salute'],
  nastro: ['giocoso: titolo su nastro colorato inclinato, fondo a puntini', 'DM Sans', 'DM Sans', 0.9, 'gioc|iron|simpat|pet|food|bar'],
  lusso: ['elegante: fondo scuro, cornice sottile, serif fine centrato', 'Cormorant Garamond', 'Lora', 1.18, 'lusso|gioiell|hotel|b&b|wedding|matrimon'],
  griglia: ['tecnico: fondo a quadretti, angoli a squadra, etichette spaziate', 'Space Grotesk', 'Manrope', 1, 'tech|dati|guida|tutorial|edil|impiant'],
  gradiente: ['moderno: tutto sul colore pieno del brand con luci sfumate', 'Manrope', 'Inter', 1, 'modern|app|digital|startup|social'],
  cornice: ['fotografico: foto in cornice bianca tipo stampa, serif morbido', 'Instrument Serif', 'DM Sans', 1.12, 'foto|viaggi|casa|immobil|artigian|natura'],
};
export const descriviTemi = () => Object.entries(TEMI).map(([k, v]) => '- ' + k + ': ' + v[0]).join('\n');
// il tema di un post: quello scelto dall'agente se non è già stato usato da poco, altrimenti il primo libero adatto allo stile
export function scegliTema(voluto, usati, stile, seme) {
  const K = Object.keys(TEMI), u = new Set(usati);
  if (TEMI[voluto] && !u.has(voluto)) return voluto;
  const mood = String((stile?.mood || '') + ' ' + (stile?.nicchia || '')).toLowerCase();
  const adatti = K.filter((k) => new RegExp(TEMI[k][4]).test(mood));
  const giro = [...adatti, ...K.map((_, i) => K[(i + seme) % K.length])];
  return giro.find((k) => !u.has(k)) || giro[0];
}
const FONT = { 'Inter': 'Inter:wght@400;600;800', 'Montserrat': 'Montserrat:wght@400;600;800', 'Poppins': 'Poppins:wght@400;600;800', 'Manrope': 'Manrope:wght@400;600;800',
  'DM Sans': 'DM+Sans:wght@400;600;800', 'Space Grotesk': 'Space+Grotesk:wght@400;600;700', 'Archivo Black': 'Archivo+Black', 'Bebas Neue': 'Bebas+Neue', 'Anton': 'Anton',
  'Playfair Display': 'Playfair+Display:wght@500;700;900', 'DM Serif Display': 'DM+Serif+Display', 'Fraunces': 'Fraunces:wght@500;700;900', 'Lora': 'Lora:wght@400;600',
  'Cormorant Garamond': 'Cormorant+Garamond:wght@500;700', 'Instrument Serif': 'Instrument+Serif' };
const trovaFont = (nome, riserva) => Object.keys(FONT).find((f) => String(nome || '').toLowerCase().includes(f.toLowerCase())) || riserva;
const ICONA_RE = /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/;
// icone Iconify (set Phosphor, MIT) disegnate come svg del colore giusto
const icona = (nome, colore, lato) => ICONA_RE.test(nome || '') ? `<img class="ico" src="https://api.iconify.design/${nome.split(':')[0]}/${nome.split(':')[1]}.svg?color=${encodeURIComponent(colore)}&height=${lato * 2}" style="width:${lato}px;height:${lato}px">` : '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (c, r) => /^#[0-9a-f]{6}$/i.test(c || '') ? c : r;
const lum = (h) => { const n = parseInt(h.slice(1), 16); const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const suColore = (h) => lum(h) > 0.45 ? '#111111' : '#FFFFFF';

// colori del set: chiaro (fondo), scuro (testo/fondo forte), accento
export function tavolozza(stile) {
  const p = (stile?.palette || []).map((c) => hex(c, null)).filter(Boolean);
  const ordinati = [...p].sort((a, b) => lum(b) - lum(a));
  const chiaro = ordinati[0] && lum(ordinati[0]) > 0.6 ? ordinati[0] : '#F6F4EF';
  const scuro = ordinati.length && lum(ordinati[ordinati.length - 1]) < 0.12 ? ordinati[ordinati.length - 1] : '#16181A';
  const accento = hex(stile?.accento, null) || p.find((c) => c !== chiaro && c !== scuro) || '#0E9F9A';
  return { chiaro, scuro, accento };
}

export function modelloPer(slide, i, totale) {
  if (MODELLI[slide.modello]) return slide.modello;
  if (slide.ruolo === 'copertina' || i === 0) return slide.foto ? 'copertina_foto' : 'copertina_titolo';
  if (slide.ruolo === 'cta' || i === totale - 1) return 'cta';
  if (slide.foto) return 'foto_testo';
  if (/\n|;/.test(slide.testo || '')) return 'lista';
  return 'testo';
}

// una slide → pagina HTML completa (le foto e il logo sono segnaposto che il motore sostituisce con i file veri)
export function slideHTML({ slide, i, totale, stile, logo, profilo, tema, firma }) {
  const T = tavolozza(stile);
  const tm = TEMI[tema] ? tema : 'pulito', TM = TEMI[tm];
  const accentoVero = T.accento;
  if (tm === 'notte' || tm === 'lusso') T.chiaro = T.scuro;
  if (tm === 'gradiente') { T.chiaro = accentoVero; T.accento = suColore(accentoVero) === '#FFFFFF' ? '#FFFFFF' : T.scuro; }
  const ft = tm !== 'pulito' ? TM[1] : trovaFont(stile?.font_titoli, /elegant|lusso|romant|natal/i.test(stile?.mood || '') ? 'Playfair Display' : 'Montserrat');
  const fx = tm !== 'pulito' ? TM[2] : trovaFont(stile?.font_testo, 'Inter');
  const famiglie = [...new Set([ft, fx])].map((f) => 'family=' + FONT[f]).join('&');
  const m = modelloPer(slide, i, totale);
  const titolo = '<span class="tt">' + esc(slide.titolo) + '</span>', testo = esc(slide.testo);
  const foto = slide.foto ? `{{FOTO:${slide.foto}}}` : null;
  const logoTag = logo ? `<img class="logo" src="{{LOGO}}">` : '';
  const due = (n) => String(n).padStart(2, '0');
  const chi = firma ? esc(firma) : '';
  const passo = (slide.titolo || '').match(/^\s*(\d{1,2})\s*[.)]/)?.[1];
  // testata (chi parla + pagina) e piede (avanzamento + freccia): riempiono la slide e la tengono in serie con le altre
  const pagina = totale > 1 && m !== 'copertina_foto' && m !== 'copertina_titolo' ? `<div class="capo"><span>${m === 'editoriale' && logo ? '' : chi}</span><span>${due(i + 1)} / ${due(totale)}</span></div>` +
    (['testo', 'lista', 'citazione', 'numero', 'checklist', 'confronto'].includes(m) ? `<div class="piede"><i class="prog"><b style="width:${Math.round(((i + 1) / totale) * 100)}%"></b></i>${i < totale - 1 ? `<span class="fr">${icona('ph:arrow-right-bold', suColore(T.accento), 34)}</span>` : ''}</div>` : '') +
    (passo && m === 'testo' ? `<div class="ghost">${esc(passo)}</div>` : '') : '';
  const lungo = (slide.titolo || '').length;
  const tg = (base) => Math.round(base * TM[3] * (lungo > 60 ? 0.62 : lungo > 40 ? 0.78 : lungo > 24 ? 0.9 : 1));
  let corpo = '', fondo = T.chiaro;
  if (m === 'copertina_foto') {
    fondo = T.scuro;
    corpo = `<div class="foto piena" style="background-image:url('${foto}')"></div><div class="velo"></div>${logoTag}
      <div class="basso"><div class="barra" style="background:${T.accento}"></div><h1 style="font-size:${tg(118)}px;color:#fff">${titolo}</h1>${testo ? `<p style="color:rgba(255,255,255,.88)">${testo}</p>` : ''}</div><div class="scorri" style="color:#fff">scorri</div>`;
  } else if (m === 'copertina_titolo') {
    fondo = T.accento;
    const c = suColore(T.accento);
    corpo = `<div class="forma" style="background:${T.scuro}"></div>${logoTag}<div class="centro"><h1 style="font-size:${tg(140)}px;color:${c}">${titolo}</h1>${testo ? `<p style="color:${c};opacity:.85">${testo}</p>` : ''}</div><div class="scorri" style="color:${c}">scorri</div>`;
  } else if (m === 'foto_testo') {
    corpo = `<div class="foto alta" style="background-image:url('${foto}')"></div>${pagina}<div class="sotto"><h2 style="font-size:${tg(76)}px">${titolo}</h2>${testo ? `<p>${testo}</p>` : ''}</div>`;
  } else if (m === 'lista') {
    const punti = String(slide.testo || '').split(/\n|;/).map((x) => x.replace(/^\s*[-•\d.)]+\s*/, '').trim()).filter(Boolean).slice(0, 6);
    corpo = `${pagina}<div class="pieno"><h2 style="font-size:${tg(100)}px">${titolo}</h2><ul>${punti.map((x) => `<li>${slide.icona ? `<em class="ico-pt" style="background:${T.accento}">${icona(slide.icona, suColore(T.accento), 34)}</em>` : `<span style="background:${T.accento}"></span>`}${esc(x)}</li>`).join('')}</ul></div>`;
  } else if (m === 'citazione') {
    fondo = T.scuro;
    corpo = `${pagina}<div class="centro"><div class="virg" style="color:${T.accento}">“</div><h2 style="font-size:${tg(80)}px;color:#fff">${titolo}</h2>${testo ? `<p style="color:rgba(255,255,255,.75)">${testo}</p>` : ''}</div>`;
  } else if (m === 'numero') {
    const n = (slide.titolo || '').match(/[\d.,]+\s*%?|\d+/)?.[0] || '';
    const resto = esc((slide.titolo || '').replace(n, '').trim());
    corpo = `${pagina}<div class="centro">${slide.icona ? `<div class="ico-box" style="background:${T.accento}">${icona(slide.icona, suColore(T.accento), 72)}</div>` : ''}<div class="numero" style="color:${T.accento}">${esc(n)}</div>${resto ? `<h2 style="font-size:64px">${resto}</h2>` : ''}${testo ? `<p>${testo}</p>` : ''}</div>`;
  } else if (m === 'cta') {
    fondo = T.scuro;
    corpo = `<div class="centro">${logo ? `<img class="logo grande" src="{{LOGO}}">` : ''}<h2 style="font-size:${tg(88)}px;color:#fff">${titolo}</h2>${testo ? `<p style="color:rgba(255,255,255,.8)">${testo}</p>` : ''}
      ${profilo ? `<div class="profilo" style="background:${T.accento};color:${suColore(T.accento)}">@${esc(profilo)}</div>` : ''}</div>`;
  } else if (m === 'checklist') {
    const punti = String(slide.testo || '').split(/\n|;/).map((x) => x.replace(/^\s*[-•\d.)\[\]x✓]+\s*/i, '').trim()).filter(Boolean).slice(0, 7);
    corpo = `${pagina}<div class="pieno"><h2 style="font-size:${tg(96)}px">${titolo}</h2><ul class="spunte">${punti.map((x) => `<li><i style="border-color:${T.accento};background:${T.accento}">${icona('ph:check-bold', suColore(T.accento), 38)}</i>${esc(x)}</li>`).join('')}</ul></div>`;
  } else if (m === 'confronto') {
    const righe = String(slide.testo || '').split(/\n/).map((x) => x.trim()).filter(Boolean);
    const si = righe.filter((x) => /^\+/.test(x)).map((x) => esc(x.slice(1).trim())), no = righe.filter((x) => /^-/.test(x)).map((x) => esc(x.slice(1).trim()));
    corpo = `${pagina}<div class="pieno"><h2 style="font-size:${tg(90)}px">${titolo}</h2><div class="due"><div class="col no"><div class="segno">${icona('ph:x-bold', suColore(T.chiaro), 64)}</div>${no.map((x) => `<p>${x}</p>`).join('')}</div>
      <div class="col si" style="background:${T.accento};color:${suColore(T.accento)}"><div class="segno">${icona('ph:check-bold', suColore(T.accento), 64)}</div>${si.map((x) => `<p>${x}</p>`).join('')}</div></div></div>`;
  } else if (m === 'collage') {
    const tutte = [slide.foto, ...(slide.altre_foto || [])].filter(Boolean).slice(0, 4).map((f) => `{{FOTO:${f}}}`);
    corpo = `<div class="griglia g${tutte.length}">${tutte.map((u) => `<div style="background-image:url('${u}')"></div>`).join('')}</div>${titolo ? `<div class="etic" style="background:${T.chiaro};color:${suColore(T.chiaro)}">${titolo}</div>` : ''}`;
    fondo = T.chiaro;
  } else if (m === 'editoriale') {
    corpo = `${pagina}<div class="ed"><h1 style="font-size:${tg(112)}px">${titolo}</h1>${foto ? `<div class="ritaglio" style="background-image:url('${foto}')"></div>` : ''}${testo ? `<p class="colonna">${testo}</p>` : ''}</div>${logoTag}`;
  } else if (m === 'nota') {
    fondo = T.accento;
    corpo = `<div class="nota"><div class="testa"><div class="av" style="background:${T.scuro}">${esc((profilo || 'M')[0].toUpperCase())}</div><div><b>${esc(profilo ? profilo : 'Momento')}</b><small>@${esc(profilo || 'momento')}</small></div></div>
      <h2 style="font-size:${tg(66)}px">${titolo}</h2>${testo ? `<p>${testo}</p>` : ''}</div>${pagina}`;
  } else if (m === 'panorama') {
    const parte = Number(slide.parte ?? 0), di = Math.max(2, Number(slide.di ?? 3));
    fondo = T.scuro;
    corpo = `<div class="foto piena" style="background-image:url('${foto}');background-size:${di * 100}% auto;background-position:${(parte / (di - 1)) * 100}% 50%"></div>${titolo ? `<div class="velo"></div><div class="basso"><h2 style="font-size:${tg(84)}px;color:#fff">${titolo}</h2>${testo ? `<p style="color:rgba(255,255,255,.85)">${testo}</p>` : ''}</div>` : ''}`;
  } else {
    corpo = `${pagina}<div class="pieno">${slide.icona ? `<div class="ico-box" style="background:${T.accento}">${icona(slide.icona, suColore(T.accento), 72)}</div>` : `<div class="barra" style="background:${T.accento}"></div>`}<h2 style="font-size:${tg(104)}px">${titolo}</h2>${testo ? `<p class="grande">${testo}</p>` : ''}</div>${logoTag}`;
  }
  const colTesto = suColore(fondo);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?${famiglie}&display=block" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px;overflow:hidden}
body{background:${fondo};color:${colTesto};font-family:'${fx}',sans-serif;position:relative;-webkit-font-smoothing:antialiased}
h1,h2{font-family:'${ft}',serif;font-weight:800;line-height:1.02;letter-spacing:-.02em;text-wrap:balance}
p{font-size:46px;line-height:1.35;margin-top:30px;text-wrap:pretty;max-width:900px}p.grande{font-size:50px}
.foto{position:absolute;background-size:cover;background-position:center}.foto.piena{inset:0}.foto.alta{left:0;right:0;top:0;height:62%}
.velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.78) 100%)}
.basso{position:absolute;left:84px;right:84px;bottom:110px}.barra{width:96px;height:12px;border-radius:6px;margin-bottom:34px}
.centro{position:absolute;inset:0;padding:120px 96px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.pieno{position:absolute;inset:0;padding:150px 96px 120px;display:flex;flex-direction:column;justify-content:center}
.sotto{position:absolute;left:84px;right:84px;bottom:90px;top:66%;display:flex;flex-direction:column;justify-content:center}.sotto p{font-size:36px;margin-top:20px}
.forma{position:absolute;right:-180px;top:-180px;width:640px;height:640px;border-radius:50%;opacity:.16}
.logo{position:absolute;left:84px;top:84px;height:86px;max-width:300px;object-fit:contain}.logo.grande{position:static;height:150px;max-width:460px;margin-bottom:56px}
.scorri{position:absolute;right:84px;bottom:54px;font-size:28px;font-weight:600;letter-spacing:.04em;opacity:.8}
ul{list-style:none;padding:0;margin-top:44px;display:flex;flex-direction:column;gap:30px}li{display:flex;gap:28px;align-items:flex-start;font-size:50px;line-height:1.3}
li span{flex:0 0 22px;height:22px;border-radius:50%;margin-top:14px}
.virg{font-family:'${ft}',serif;font-size:260px;line-height:.6;height:120px}
.numero{font-family:'${ft}',serif;font-weight:800;font-size:300px;line-height:.9;letter-spacing:-.04em}
.profilo{margin-top:56px;padding:22px 40px;border-radius:999px;font-size:38px;font-weight:700}
.ico-box{width:128px;height:128px;border-radius:32px;display:grid;place-items:center;margin-bottom:40px}.ico-pt{flex:0 0 60px;height:60px;border-radius:16px;display:grid;place-items:center;font-style:normal}
.spunte li{align-items:center}.spunte i{flex:0 0 66px;height:66px;border-radius:14px;border:4px solid;display:grid;place-items:center;font-style:normal}.spunte i b{font-size:34px}
.due{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px}.col{border-radius:28px;padding:40px 34px;min-height:560px}.col.no{background:rgba(127,127,127,.12)}.col p{font-size:40px;margin-top:18px;line-height:1.3}
.segno{font-size:64px;font-weight:800;line-height:1}
.griglia{position:absolute;inset:0;display:grid;gap:10px;padding:10px}.griglia>div{background-size:cover;background-position:center;border-radius:18px}
.griglia.g2{grid-template-rows:1fr 1fr}.griglia.g3{grid-template-columns:1fr 1fr;grid-template-rows:1.3fr 1fr}.griglia.g3>div:first-child{grid-column:1/3}.griglia.g4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.etic{position:absolute;left:50px;bottom:50px;max-width:820px;padding:26px 34px;border-radius:22px;font-weight:800;font-size:52px;line-height:1.1}
.ed{position:absolute;inset:0;padding:120px 84px 90px}.ed h1{font-weight:900}.ritaglio{margin-top:46px;height:520px;border-radius:0 140px 0 140px;background-size:cover;background-position:center}.colonna{font-size:38px;column-count:2;column-gap:44px;max-width:none}
.nota{position:absolute;left:70px;right:70px;top:50%;transform:translateY(-50%);background:#fff;color:#111;border-radius:40px;padding:60px 56px;box-shadow:0 40px 80px -40px rgba(0,0,0,.45)}
.nota .testa{display:flex;gap:22px;align-items:center;margin-bottom:40px}.nota .av{width:84px;height:84px;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:40px;font-weight:800}.nota b{display:block;font-size:34px}.nota small{font-size:28px;opacity:.55}
.nota h2{font-family:inherit;font-weight:700;letter-spacing:-.01em;line-height:1.15}.nota p{font-size:36px;color:#333}
.capo{position:absolute;left:84px;right:84px;top:74px;display:flex;justify-content:space-between;font-size:28px;font-weight:600;opacity:.62;letter-spacing:.03em;z-index:3}
.piede{position:absolute;left:84px;right:84px;bottom:66px;height:72px;display:flex;align-items:center;gap:30px;z-index:3}
.prog{flex:1;height:6px;border-radius:3px;background:rgba(127,127,127,.28);overflow:hidden}.prog b{display:block;height:100%;background:var(--a)}
.fr{flex:0 0 72px;height:72px;border-radius:50%;background:var(--a);display:grid;place-items:center}
.ghost{position:absolute;right:50px;top:150px;font-family:'${ft}',serif;font-weight:800;font-size:560px;line-height:.8;color:var(--a);opacity:.16;z-index:0}
.pieno,.centro{z-index:2}.pieno{padding-bottom:180px}
body::before,body::after{content:'';position:absolute;pointer-events:none}
.t-linee::before{left:84px;right:84px;top:140px;border-top:2px solid currentColor;opacity:.45}.t-linee::after{left:84px;right:84px;bottom:160px;border-top:2px solid currentColor;opacity:.45}
.t-linee h1,.t-linee h2{font-weight:500;letter-spacing:-.01em;line-height:1.1}.t-linee .ico-box{border-radius:50%}.t-linee .barra{height:3px;width:170px}.t-linee .fr{flex-basis:124px;height:58px;border-radius:29px}.t-linee .prog{display:none}.t-linee .piede{justify-content:flex-end}.t-linee .capo{text-transform:uppercase;letter-spacing:.2em;font-size:22px}
.t-bold h1,.t-bold h2{text-transform:uppercase;line-height:.94;letter-spacing:.005em;font-weight:400}.t-bold::before{right:-280px;bottom:-240px;width:920px;height:920px;border-radius:50%;background:var(--a);opacity:.2}.t-bold .numero{font-weight:400}
.t-notte{background-image:radial-gradient(900px 700px at 90% 0%,color-mix(in srgb,var(--v) 50%,transparent),transparent 70%),radial-gradient(760px 640px at 0% 100%,color-mix(in srgb,var(--v) 28%,transparent),transparent 70%)}.t-notte .col.no{background:rgba(255,255,255,.09)}
.t-rivista .capo{border-bottom:3px solid currentColor;padding-bottom:20px;text-transform:uppercase;letter-spacing:.2em;font-size:22px;opacity:.9}.t-rivista h1,.t-rivista h2{font-weight:400;letter-spacing:-.01em}.t-rivista .barra{display:none}.t-rivista .pieno h2::after{content:'';display:block;width:150px;border-top:7px solid var(--a);margin-top:38px}.t-rivista p{font-size:44px}.t-rivista .ghost{opacity:.22}
.t-brutal::before{inset:34px;border:8px solid currentColor;z-index:1}.t-brutal .ico-box,.t-brutal .col,.t-brutal .profilo,.t-brutal .fr,.t-brutal .ico-pt,.t-brutal .spunte i{border-radius:0;border:6px solid var(--t);box-shadow:9px 9px 0 var(--t)}.t-brutal .pieno .tt{background:linear-gradient(transparent 66%,var(--a) 66%);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 6px}.t-brutal h1,.t-brutal h2{font-weight:400;line-height:1.08}.t-brutal .prog{border-radius:0;height:10px}.t-brutal .prog b{background:var(--t)}
.t-morbido{background-image:radial-gradient(640px 640px at 100% 0%,color-mix(in srgb,var(--v) 42%,transparent),transparent 70%),radial-gradient(760px 760px at 0% 100%,color-mix(in srgb,var(--v) 26%,transparent),transparent 70%)}.t-morbido .pieno{inset:150px 60px 170px;background:#fff;color:#161616;border-radius:60px;padding:76px 64px;box-shadow:0 50px 90px -50px rgba(0,0,0,.38)}.t-morbido .ico-box{border-radius:50%}.t-morbido .ghost{display:none}.t-morbido h1,.t-morbido h2{font-weight:600;line-height:1.08}
.t-nastro{background-image:radial-gradient(rgba(127,127,127,.24) 3px,transparent 3.5px);background-size:46px 46px}.t-nastro .pieno h2{transform:rotate(-2deg);line-height:1.32;transform-origin:left center}.t-nastro .pieno .tt{background:var(--a);color:var(--ta);padding:6px 20px;-webkit-box-decoration-break:clone;box-decoration-break:clone}.t-nastro .barra{display:none}.t-nastro .ico-box{transform:rotate(6deg);border-radius:50%}
.t-lusso::before{inset:44px;border:2px solid var(--a);opacity:.75}.t-lusso .pieno,.t-lusso .centro{align-items:center;text-align:center}.t-lusso h1,.t-lusso h2{font-weight:500;letter-spacing:0;line-height:1.06}.t-lusso ul{align-self:center;text-align:left}.t-lusso .barra{height:2px;width:120px}.t-lusso .prog{height:2px}.t-lusso .capo{letter-spacing:.24em;text-transform:uppercase;font-size:22px}.t-lusso .ghost{display:none}
.t-griglia{background-image:linear-gradient(rgba(127,127,127,.16) 2px,transparent 2px),linear-gradient(90deg,rgba(127,127,127,.16) 2px,transparent 2px);background-size:90px 90px}.t-griglia::before{left:40px;top:40px;width:74px;height:74px;border-left:7px solid var(--a);border-top:7px solid var(--a)}.t-griglia::after{right:40px;bottom:40px;width:74px;height:74px;border-right:7px solid var(--a);border-bottom:7px solid var(--a)}.t-griglia .capo{text-transform:uppercase;letter-spacing:.16em;font-size:22px;left:130px}.t-griglia .ico-box{border-radius:10px}.t-griglia h1,.t-griglia h2{font-weight:700}.t-griglia .piede{right:130px}
.t-gradiente{background-image:radial-gradient(820px 820px at 100% 0%,rgba(255,255,255,.3),transparent 70%),radial-gradient(900px 900px at 0% 100%,rgba(0,0,0,.24),transparent 70%)}.t-gradiente .col.no{background:rgba(0,0,0,.12)}
.t-cornice .foto.alta{left:60px;right:60px;top:60px;height:57%;border:16px solid #fff;box-shadow:0 34px 60px -34px rgba(0,0,0,.45)}.t-cornice .foto.piena{inset:40px}.t-cornice .velo{inset:40px}.t-cornice .ritaglio{border-radius:0;border:16px solid #fff;box-shadow:0 34px 60px -34px rgba(0,0,0,.45)}.t-cornice h1,.t-cornice h2{font-weight:400;letter-spacing:-.01em;line-height:1.04}.t-cornice .ed h1{font-weight:400}.t-cornice .ico-box{border-radius:50%}
.fit{display:flex;flex-direction:column;align-items:flex-start;width:100%}.fit ul,.fit .due{width:100%}.t-lusso .fit{align-items:center}.t-lusso .fit ul{width:auto}
.t-linee .forma,.t-rivista .forma,.t-lusso .forma,.t-griglia .forma,.t-brutal .forma,.t-nastro .forma,.t-cornice .forma,.t-bold .forma{display:none}
</style></head><body class="t-${tm}" style="--a:${T.accento};--v:${accentoVero};--s:${T.scuro};--c:${T.chiaro};--t:${colTesto};--ta:${suColore(T.accento)}">${corpo}<script>(function(){function fit(){var b=document.querySelector('.pieno,.centro');if(!b)return;var w=document.createElement('div');w.className='fit';while(b.firstChild)w.appendChild(b.firstChild);b.appendChild(w);var cs=getComputedStyle(b);var alto=b.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);for(var z=1.7;z>=0.55;z-=0.05){w.style.zoom=z;if(w.getBoundingClientRect().height<=alto*0.9&&w.scrollWidth*z<=b.clientWidth)break;}}if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);else fit();})();</script></body></html>`;
}

// le icone (Iconify) entrano nella pagina come dati: niente riquadri vuoti se la rete del motore rallenta
export async function incorporaIcone(html, memo = {}) {
  const U = [...new Set(html.match(/https:\/\/api\.iconify\.design\/[^"]+/g) || [])];
  for (const u of U) {
    if (!(u in memo)) memo[u] = await fetch(u.replace(/&amp;/g, '&')).then(async (r) => r.ok ? 'data:image/svg+xml;base64,' + btoa(await r.text()) : null).catch(() => null);
    if (memo[u]) html = html.split(u).join(memo[u]);
  }
  return html;
}

// pacchetto per il motore: tutte le slide dei post approvati
export async function preparaImpaginazione(env, P) {
  const Ct = J(P.contenuti, {});
  const st = Ct.stile || {};
  const cart = P.pcloud && !/code=/.test(P.pcloud) ? P.pcloud : (P.cliente ? 'Clienti/' + P.cliente : '');
  const logo = cart ? await logoCliente(env, cart).catch(() => null) : null;
  const cfg = await configurazione(env);
  const mio = String(P.cliente_id || '') === String(cfg.IG_CLIENTE_ID) || /^momento|profilo instagram/i.test(P.cliente || '');
  const profilo = mio ? (cfg.IG_USERNAME || '') : '';
  if (mio) { st.palette = ['#F1EFEA', '#17171A', '#0E9F9A']; st.accento = '#0E9F9A'; } // il profilo di Momento usa sempre i colori di Momento
  else { // i colori sono del cliente (di marca, o fissati la prima volta dall'archivio), non inventati a ogni carosello
    await schemaChiara(env);
    const C = P.cliente_id ? await one(env, 'SELECT * FROM clienti WHERE id=?', P.cliente_id) : await clientePerNome(env, P.cliente).catch(() => null);
    const K = await coloriCliente(env, C, { nicchia: P.nicchia || '', richiesta: (P.brief || '') + ' ' + (P.note || '') });
    st.palette = [K.chiaro, K.scuro, K.accento]; st.accento = K.accento;
    if (K.origine === 'nuova') await log(env, null, 'caroselli', `🎨 ${P.cliente}: nessun colore di marca, fisso la palette "${K.nome}" per tutti i suoi contenuti (cambiala nella scheda cliente)`).catch(() => {});
  }
  const firma = profilo ? '@' + profilo : mio ? 'Momento Produzione' : String(P.cliente || '').slice(0, 34);
  // regola n.1: nessun carosello uguale. Temi già usati dagli ultimi lavori dello stesso cliente + quelli di questo lotto
  const prima = await all(env, "SELECT contenuti FROM post_lavori WHERE cliente=? AND id<? ORDER BY id DESC LIMIT 4", P.cliente || '', P.id).catch(() => []);
  const usati = prima.flatMap((r) => (J(r.contenuti, {}).post || []).map((y) => y.tema).filter(Boolean)).slice(0, 5);
  let cambiato = false;
  const fotoF = (J(P.foto, {})?.foto || []);
  const slide = [];
  for (const x of (Ct.post || []).filter((y) => y.stato === 'approvato')) {
    const tema = scegliTema(x.tema, x.tema_fisso ? [] : usati, { ...st, nicchia: P.nicchia }, P.id * 5 + Number(x.n || 0) * 3);
    if (x.tema !== tema || !x.tema_fisso) { x.tema = tema; x.tema_fisso = true; cambiato = true; }
    usati.push(tema);
    const S = (x.slide || []).map((s) => ({ ...s }));
    for (let k = 0; k < S.length; k++) if (S[k].modello === 'panorama' && S[k].foto && (k === 0 || S[k - 1].modello !== 'panorama' || S[k - 1].foto !== S[k].foto)) {
      let j = k; while (j + 1 < S.length && S[j + 1].modello === 'panorama' && S[j + 1].foto === S[k].foto) j++;
      for (let t = k; t <= j; t++) Object.assign(S[t], { parte: t - k, di: Math.max(2, j - k + 1) });
    }
    S.forEach((s, k) => slide.push({ n: x.n, k: k + 1, chiave: `post-${P.id}/${x.n}-${k + 1}.png`, html: slideHTML({ slide: s, i: k, totale: S.length, stile: st, logo, profilo, tema, firma }),
      foto: [s.foto, ...(s.altre_foto || [])].filter(Boolean).map((nome) => { const f = fotoF.find((z) => z.nome === nome); return f ? { nome, ...(f.percorso ? { archivio: f.percorso } : { fileid: f.fileid }) } : null; }).filter(Boolean) }));
  }
  const memo = {};
  for (const x of slide) x.html = await incorporaIcone(x.html, memo);
  if (cambiato) await run(env, 'UPDATE post_lavori SET contenuti=? WHERE id=?', JSON.stringify(Ct), P.id);
  return { slide, logo, pcloud: /code=/.test(P.pcloud || '') ? P.pcloud : null };
}

export async function svegliaImpagina(env, id) {
  const cfg = await configurazione(env);
  if (!cfg.GITHUB_TOKEN) return false;
  const r = await fetch('https://api.github.com/repos/JohnHant91/momento-montaggio/actions/workflows/impagina.yml/dispatches', {
    method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { post: String(id) } }),
    headers: { authorization: `Bearer ${cfg.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'momento-reel', 'x-github-api-version': '2022-11-28' },
  });
  return r.status === 204;
}

// API del motore: prende il lavoro (OIDC GitHub), riceve le slide fotografate
export async function motoreImpagina(req, env, p, m, json, identitaGitHub, firmaLink) {
  if (!p.startsWith('/api/motore/impagina')) return null;
  const url = new URL(req.url);
  if (p === '/api/motore/impagina/prendi' && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    const id = Number(url.searchParams.get('id')) || 0;
    const pass = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const P = await one(env, `UPDATE post_lavori SET canva=json_set(COALESCE(canva,'{}'), '$.pass', ?, '$.fino', ?), aggiornato=? WHERE id = (SELECT id FROM post_lavori WHERE fase='impagina' AND stato='in_corso'
      AND (?=0 OR id=?) AND (json_extract(canva,'$.fino') IS NULL OR json_extract(canva,'$.fino') < ?) ORDER BY id LIMIT 1) RETURNING *`, pass, new Date(Date.now() + 30 * 60e3).toISOString(), ora(), id, id, ora());
    if (!P) return new Response(null, { status: 204 });
    const pac = await preparaImpaginazione(env, P);
    for (const s of pac.slide) for (const f of s.foto) if (f.archivio) f.url = await firmaLink(env, url.origin, f.archivio);
    return json({ id: P.id, pass, pcloud_code: pac.pcloud ? new URL(pac.pcloud).searchParams.get('code') : null, pcloud_eu: /(^|\/\/)e\.|eapi/.test(pac.pcloud || ''),
      logo: pac.logo ? await firmaLink(env, url.origin, pac.logo) : null, slide: pac.slide });
  }
  const mm = p.match(/^\/api\/motore\/impagina\/(\d+)\/(slide|fine)$/);
  if (!mm) return json({ errore: 'non trovato' }, 404);
  const P = await one(env, 'SELECT * FROM post_lavori WHERE id=?', mm[1]);
  const pass = req.headers.get('x-pass') || '';
  if (!P || pass.length < 32 || pass !== J(P.canva, {})?.pass) return json({ errore: 'lasciapassare non valido' }, 403);
  if (mm[2] === 'slide' && m === 'PUT') {
    const chiave = String(url.searchParams.get('k') || '');
    if (!new RegExp(`^post-${P.id}/\\d+-\\d+\\.png$`).test(chiave)) return json({ errore: 'chiave non valida' }, 400);
    await env.VIDEO.put(chiave, await req.arrayBuffer(), { metadata: { tipo: 'image/jpeg' } });
    return json({ ok: true });
  }
  if (mm[2] === 'fine' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const fatte = (d.fatte || []).filter((k) => new RegExp(`^post-${P.id}/\\d+-\\d+\\.png$`).test(k));
    const file = Object.fromEntries(fatte.map((k) => [k, true]));
    const perPost = {};
    for (const k of fatte) { const [n] = k.split('/')[1].split('-').map(Number); (perPost[n] ||= []).push(k); }
    const canva = { motore: true, quando: ora(), post: Object.entries(perPost).map(([n, ks]) => ({ n: Number(n), png: ks.sort((a, b) => Number(a.split('-').pop().split('.')[0]) - Number(b.split('-').pop().split('.')[0])) })) };
    const ok = fatte.length && !(d.errori || []).length;
    await run(env, 'UPDATE post_lavori SET canva=?, slide_file=?, fase=?, stato=?, errore=?, aggiornato=? WHERE id=?', JSON.stringify(canva), JSON.stringify(file),
      ok ? 'fatto' : 'impagina', ok ? 'da_vedere' : 'errore', ok ? null : `slide non riuscite: ${(d.errori || []).slice(0, 3).join('; ')}`.slice(0, 400), ora(), P.id);
    await log(env, null, 'caroselli', ok ? `🎨 post #${P.id}: ${fatte.length} slide impaginate, pronte da guardare in Approvazioni` : `⚠️ post #${P.id}: impaginazione non riuscita`, ok ? 'info' : 'warn');
    return json({ ok: true });
  }
  return json({ errore: 'non trovato' }, 404);
}
