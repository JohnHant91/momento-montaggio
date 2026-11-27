// Archivio Stili · PALETTE DI COLORI per testi, titoli, sottotitoli e grafiche del reel.
// Nel prompt: "colori nero e giallo" oppure il nome di una palette ("palette energia"). [accento, secondario, fondo, inchiostro, mood]
export const PALETTE = {
  energia: ['#FFD60A', '#FF5E1A', '#0D0D0D', '#FFFFFF', 'energico, sport, lancio'],
  nero_giallo: ['#FFD60A', '#FFFFFF', '#0B0B0B', '#FFFFFF', 'street, deciso, tech'],
  fuoco: ['#FF3B30', '#FF9500', '#1A0A05', '#FFFFFF', 'promo, urgenza, food'],
  elettrico: ['#2F6BFF', '#00E5FF', '#05070F', '#FFFFFF', 'tech, AI, notte'],
  neon_rosa_blu: ['#FF2E93', '#2F6BFF', '#0B0B1A', '#FFFFFF', 'creator, notte, giovane'],
  acido: ['#C6FF00', '#FFFFFF', '#101010', '#FFFFFF', 'trend, giovane, glitch'],
  forno: ['#E0A63A', '#7A4B2A', '#F5EBDD', '#2A1A10', 'pane, artigiano, caldo'],
  caffe: ['#C8894B', '#3B2A20', '#EFE6DA', '#1E1410', 'caffè, banco, torrefazione'],
  pasticceria: ['#E8A0B4', '#F4D6C6', '#FFF8F2', '#4A2C2A', 'dolci, delicato'],
  natale: ['#C8102E', '#D4AF37', '#0F3D2E', '#FFFFFF', 'natale, feste'],
  oro_nero: ['#D4AF37', '#F5E6B8', '#0A0A0A', '#FFFFFF', 'lusso, elegante'],
  mare: ['#1F8FBF', '#F2E4C9', '#FFFFFF', '#0E2A3A', 'estate, hotel, mare'],
  tramonto: ['#FF7A59', '#FFC15E', '#2B1B3A', '#FFFFFF', 'emozionale, estate'],
  mediterraneo: ['#1E5AA8', '#F2C94C', '#FBF7EF', '#13294B', 'Italia, ceramiche, limoni'],
  oliva: ['#7A8B3A', '#D9C9A3', '#F6F2E8', '#2E2A1E', 'natura, olio, campagna'],
  bosco: ['#3F5A45', '#C9B79C', '#F3ECE0', '#1F2A22', 'legno, artigianato'],
  legno: ['#8B5A2B', '#E7D3B5', '#FAF4EA', '#2B1D12', 'falegnameria, caldo'],
  terracotta: ['#C65D3B', '#E9C6A5', '#FBF3EA', '#3A2219', 'casa, ceramica, rustico'],
  pastello: ['#F7A8B8', '#A8D8F0', '#FFF7FB', '#3A3A4A', 'soft, beauty, primavera'],
  lavanda: ['#9B87F5', '#E6E0FF', '#FAF8FF', '#2B2440', 'sognante, calmo'],
  menta: ['#2EC4B6', '#CBF3F0', '#FFFFFF', '#0F3B38', 'fresco, pulito, salute'],
  teal_momento: ['#0E9F9A', '#CFE9E7', '#F1EFEA', '#17171A', 'brand Momento, pulito'],
  bianco_nero: ['#FFFFFF', '#9A9A9A', '#000000', '#FFFFFF', 'bianco e nero, drammatico'],
  minimal_crema: ['#1A1A1A', '#B8A68F', '#F4F1EA', '#1A1A1A', 'minimal, editoriale'],
  vintage: ['#D98E04', '#8C4A2F', '#F1E3C8', '#2B2118', 'retrò, pellicola, nostalgia'],
  vhs: ['#FF4FD8', '#3DF5FF', '#14081F', '#FFFFFF', 'anni 90, vhs, ironico'],
  autunno: ['#C2571A', '#E8B04B', '#2A1A12', '#FFFFFF', 'autunno, vino, castagne'],
  inverno: ['#8FB8DE', '#FFFFFF', '#0F1A2A', '#FFFFFF', 'inverno, freddo, pulito'],
  romantico: ['#E36588', '#F7D6E0', '#FFF5F7', '#3D1F2B', 'romantico, san valentino'],
  corporate: ['#1F4E79', '#9DB9D5', '#FFFFFF', '#14212E', 'aziendale, professionale'],
  verde_successo: ['#22C55E', '#BBF7D0', '#0B1410', '#FFFFFF', 'risultati, prima/dopo'],
  halloween: ['#FF7518', '#7B2CBF', '#0A0A0A', '#FFFFFF', 'halloween, misterioso'],
};
export const descriviPalette = () => Object.entries(PALETTE).map(([k, v]) => `${k} (${v[4]}): accento ${v[0]}, secondario ${v[1]}, fondo ${v[2]}`).join('\n');

// ------------------------------------------------------------------ COLORI FISSI DEL CLIENTE
// I colori sono l'identità del cliente: cambiano stile e contenuto, i colori no. Quelli di marca li salva Johnny nella scheda;
// se mancano l'agenzia sceglie UNA palette dell'archivio per la nicchia e la fissa. Le stagionali valgono solo se chieste nel prompt.
const STAGIONALI = { natale: /natal|feste di fine anno|capodann/i, halloween: /halloween/i, romantico: /san valentino/i };
const NICCHIE = [['forno', /pan(e|ific)|forn|pizz/i], ['caffe', /caff|bar\b|torref|colazion/i], ['pasticceria', /pasticc|dolc|gelat|cake/i], ['mare', /mare|lido|spiagg|hotel|b&b|bed and|costier|barca/i],
  ['oro_nero', /luss|gioiell|orolog|boutique/i], ['mediterraneo', /ristor|trattor|pesce|osteria|cucina|ceramic|limon/i], ['oliva', /olio|agri|vino|cantin|campagn|bio\b/i], ['legno', /falegn|legno|arred|mobil/i],
  ['terracotta', /casa|immobil|edil|ristruttur|interior/i], ['pastello', /beauty|estet|parrucch|unghie|make.?up/i], ['menta', /salute|dent|farmac|fisio|medic|benesser/i], ['energia', /palestr|sport|fitness|crossfit|calcio/i],
  ['elettrico', /tech|software|ai\b|informat|digital|web|app\b/i], ['corporate', /studio|avvocat|commercial|assicur|consul|impiant|azienda/i], ['lavanda', /yoga|olistic|spa\b|relax/i], ['bosco', /artigian|natura|outdoor|trek/i],
  ['romantico', /wedding|matrimon|fior/i], ['neon_rosa_blu', /creator|locale notturn|discotec|dj\b|club/i], ['vintage', /vintage|barbier|barber|retr/i], ['fuoco', /burger|grigl|brace|street food|kebab/i]];
const esa = (c) => /^#[0-9a-f]{6}$/i.test(c || '') ? c.toUpperCase() : null;
const lumi = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
// una palette dell'archivio → {nome, chiaro, scuro, accento, secondario}
export function daArchivio(nome) {
  const v = PALETTE[nome]; if (!v) return null;
  const tutti = [v[2], v[3], v[1], v[0]].sort((a, b) => lumi(b) - lumi(a));
  const accento = lumi(v[0]) > 0.92 || lumi(v[0]) < 0.08 ? v[1] : v[0];
  const chiaro = lumi(tutti[0]) > 0.75 ? tutti[0] : '#F6F4EF', scuro = lumi(tutti[tutti.length - 1]) < 0.2 ? tutti[tutti.length - 1] : '#16181A';
  return { nome, chiaro, scuro, accento: accento === chiaro || accento === scuro ? v[1] : accento, secondario: v[1] };
}
export function paletteStagionale(testo) { const k = Object.keys(STAGIONALI).find((n) => STAGIONALI[n].test(testo || '')); return k ? daArchivio(k) : null; }
export function palettePerNicchia(testo, seme = 0) {
  const k = NICCHIE.find(([, re]) => re.test(testo || ''))?.[0];
  const neutre = ['minimal_crema', 'corporate', 'menta', 'mediterraneo', 'terracotta', 'bosco'];
  return daArchivio(k || neutre[Math.abs(seme) % neutre.length]);
}
// i colori salvati nella scheda (JSON) → oggetto pulito, o null
export function leggiColori(testo) {
  let d; try { d = typeof testo === 'string' ? JSON.parse(testo) : testo; } catch { d = null; }
  if (!d) return null;
  if (d.palette && PALETTE[d.palette] && !d.accento) return { ...daArchivio(d.palette), fissati: d.fissati || 'agenzia' };
  const accento = esa(d.accento); if (!accento) return null;
  return { nome: d.palette && PALETTE[d.palette] ? d.palette : null, chiaro: esa(d.chiaro) || '#F6F4EF', scuro: esa(d.scuro) || '#16181A', accento, secondario: esa(d.secondario) || accento, fissati: d.fissati || 'johnny' };
}
// i colori da usare per un contenuto del cliente C (riga di clienti, o null): stagionale chiesta → di marca → archivio (e la fissa)
export async function coloriCliente(env, C, { nicchia = '', richiesta = '' } = {}) {
  const st = paletteStagionale(richiesta);
  if (st) return { ...st, origine: 'stagionale' };
  const suoi = leggiColori(C?.colori);
  if (suoi) return { ...suoi, origine: suoi.fissati === 'johnny' ? 'marca' : 'fissata' };
  const scelta = palettePerNicchia((C?.nicchia || '') + ' ' + nicchia + ' ' + (C?.nome || ''), C?.id || nicchia.length);
  if (C?.id) await env.DB.prepare('UPDATE clienti SET colori=? WHERE id=? AND colori IS NULL').bind(JSON.stringify({ palette: scelta.nome, fissati: 'agenzia' }), C.id).run().catch(() => {});
  return { ...scelta, origine: 'nuova' };
}
