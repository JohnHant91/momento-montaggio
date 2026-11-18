// Libreria LUT del colorist: pellicole vere e grading cinematografici, dalle collezioni gratuite di G'MIC (gmic.eu).
// Il motore scarica il pacchetto la prima volta e lo tiene in cache. "i" = intensità consigliata (0-1) su girato normale.
// Ogni voce: nome → [pacchetto, descrizione, intensità, adatta a (stili/mood)]
export const LUT = {
  // --- pellicole cinema e fotografiche a colori
  kodak_portra_400: ['negative_new', 'Kodak Portra 400: pelle naturale e calda, alte luci morbide, il look "film" più usato', 0.85, ['emozionale', 'matrimonio', 'racconto', 'intervista', 'romantico', 'beauty']],
  kodak_portra_160: ['negative_new', 'Kodak Portra 160: pastello delicato, contrasto basso, toni pelle perfetti', 0.85, ['romantico', 'beauty', 'sognante', 'primaverile']],
  kodak_portra_800: ['negative_new', 'Kodak Portra 800: caldo e ricco, ottimo per luce bassa e serate', 0.8, ['evento', 'festoso', 'autunnale', 'natalizio']],
  fuji_400h: ['negative_new', 'Fuji Pro 400H: verdi e azzurri freschi, pastello luminoso', 0.85, ['primaverile', 'sognante', 'viaggio', 'immobiliare', 'rilassante']],
  fuji_160c: ['negative_new', 'Fuji 160C: colori puliti e brillanti, leggermente freddi', 0.8, ['minimal', 'professionale', 'moda']],
  kodak_ektar_100: ['negative_color', 'Kodak Ektar 100: colori saturi e vividi, rossi e blu potenti', 0.75, ['estivo', 'viaggio', 'food', 'amichevole', 'energico']],
  fuji_superia_200: ['negative_color', 'Fuji Superia 200: la pellicola da rullino anni 90, verdi e magenta nostalgici', 0.8, ['nostalgico', 'vlog', 'ugc', 'malinconico']],
  agfa_vista_200: ['negative_color', 'Agfa Vista 200: caldo, rossi intensi, sapore vintage europeo', 0.8, ['nostalgico', 'autunnale', 'street', 'racconto']],
  kodak_elite_color_400: ['negative_color', 'Kodak Elite 400: colori brillanti e caldi da reportage', 0.8, ['viaggio', 'evento', 'dietro_le_quinte']],
  lomography_redscale_100: ['negative_color', 'Lomography Redscale: tutto rosso-arancio, estremo e artistico', 0.6, ['halloween', 'drammatico', 'musicale']],
  kodak_2383_constlmap: ['print', 'Kodak 2383 (pellicola di stampa cinema): il colore dei film hollywoodiani, ombre dense e calde', 0.55, ['cortometraggio', 'epico', 'drammatico', 'misterioso']],
  fuji_3513_constlmap: ['print', 'Fuji 3513 (stampa cinema): cinema europeo, più freddo e neutro', 0.55, ['cortometraggio', 'elegante', 'malinconico']],
  // --- bianco e nero
  ilford_hp_5: ['negative_new', 'Ilford HP5: bianco e nero classico da reportage, grana e contrasto medio', 0.95, ['bianco_nero', 'street', 'racconto', 'drammatico']],
  kodak_tri_x_400: ['negative_new', 'Kodak Tri-X 400: il bianco e nero più iconico, contrasto deciso', 0.95, ['bianco_nero', 'street', 'sport', 'drammatico'], 'kodak_tri-x_400'],
  fuji_neopan_acros_100: ['bw', 'Fuji Acros 100: bianco e nero pulito e morbido, elegante', 0.95, ['bianco_nero', 'elegante', 'minimal', 'moda']],
  ilford_delta_3200: ['bw', 'Ilford Delta 3200: bianco e nero sgranato e notturno', 0.95, ['bianco_nero', 'misterioso', 'neon']],
  // --- istantanee
  polaroid_690_warm: ['instant_pro', 'Polaroid 690 calda: colori sbiaditi e caldi da istantanea', 0.75, ['nostalgico', 'festoso', 'amichevole', 'vhs']],
  polaroid_px_70_cold: ['instant_consumer', 'Polaroid PX-70 fredda: istantanea moderna, ciano e pastello', 0.7, ['sognante', 'invernale', 'minimal'], 'polaroid_px-70_cold'],
  polaroid_time_zero_expired: ['instant_consumer', 'Polaroid Time Zero scaduta: colori bruciati e strani, effetto ricordo', 0.6, ['vhs', 'nostalgico', 'malinconico']],
  fuji_fp_100c: ['instant_pro', 'Fuji FP-100C: istantanea professionale, colori freschi e brillanti', 0.75, ['moda', 'primaverile', 'amichevole'], 'fuji_fp-100c'],
  // --- grading cinematografici e creativi
  bleach_bypass: ['others', 'Bleach bypass: desaturato e contrastatissimo, look da film di guerra/sport', 0.7, ['drammatico', 'sport', 'epico', 'street']],
  cinematic_01: ['others', 'Cinematic 01: teal & orange moderno da trailer', 0.7, ['epico', 'viaggio', 'drone', 'musicale', 'auto']],
  cinematic_02: ['others', 'Cinematic 02: cinema caldo e morbido', 0.7, ['emozionale', 'cortometraggio', 'broll']],
  cinematic_03: ['others', 'Cinematic 03: cinema freddo e contrastato', 0.7, ['misterioso', 'drammatico', 'aziendale']],
  hong_kong: ['others', 'Hong Kong: notte urbana verde-ciano e magenta, alla Wong Kar-wai', 0.65, ['neon', 'glamour', 'street', 'misterioso']],
  k_tone_vintage_kodachrome: ['others', 'Kodachrome vintage: il colore delle diapositive anni 60-70', 0.75, ['nostalgico', 'estivo', 'viaggio', 'food']],
  golden: ['others', 'Golden: luce dorata da tramonto', 0.7, ['natalizio', 'romantico', 'estivo', 'autunnale']],
  golden_vibrant: ['others', 'Golden vibrant: oro brillante e saturo, festoso', 0.65, ['natalizio', 'festoso', 'evento']],
  super_warm: ['others', 'Super warm: caldo avvolgente, interni e candele', 0.6, ['natalizio', 'autunnale', 'rilassante', 'food']],
  warm_highlight: ['others', 'Warm highlight: alte luci calde, ombre neutre', 0.7, ['food', 'beauty', 'immobiliare']],
  natural_vivid: ['others', 'Natural vivid: colori naturali ma più vivi, sicuro su tutto', 0.7, ['amichevole', 'tutorial', 'ugc', 'vlog', 'food']],
  vibrant_contrast: ['others', 'Vibrant contrast: punchy, colori e contrasto alti', 0.65, ['energico', 'sport', 'musicale', 'transizioni']],
  faded_analog: ['others', 'Faded analog: neri sollevati e colori sbiaditi da pellicola', 0.7, ['nostalgico', 'malinconico', 'sognante', 'vlog']],
  muted_fade: ['others', 'Muted fade: tenue e desaturato, minimal da rivista', 0.7, ['minimal', 'elegante', 'moda']],
  light_blown: ['others', 'Light blown: luminoso e arioso, alte luci aperte', 0.6, ['sognante', 'romantico', 'primaverile', 'beauty']],
  summer: ['others', 'Summer: estate solare, azzurri e caldi', 0.7, ['estivo', 'viaggio', 'amichevole']],
  sunny_warm: ['others', 'Sunny warm: sole caldo di metà pomeriggio', 0.7, ['estivo', 'food', 'amichevole', 'immobiliare']],
  color_rich: ['others', 'Color rich: colori pieni e profondi, da spot', 0.65, ['spot', 'food', 'auto', 'beauty']],
  nostalgic: ['others', 'Nostalgic: caldo sbiadito da album di famiglia', 0.7, ['nostalgico', 'malinconico', 'racconto']],
  '60s_faded': ['others', 'Anni 60 sbiadito: pastelli caldi d’epoca', 0.7, ['nostalgico', 'vhs']],
  // --- grading da colorist (pixls.us, inavision, berat, jtsemple, ohad peretz)
  cinematic_lady_bird: ['pixlsus', 'Lady Bird: indie cinema morbido, pelle calda e verdi spenti', 0.75, ['emozionale', 'racconto', 'malinconico', 'vlog']],
  cinematic_mexico: ['pixlsus', 'Mexico: giallo-arancio caldissimo, sole e polvere', 0.6, ['estivo', 'street', 'western']],
  metropolis: ['pixlsus', 'Metropolis: città fredda e contrastata', 0.7, ['street', 'aziendale', 'drammatico']],
  street: ['pixlsus', 'Street: grading urbano desaturato con ombre fredde', 0.75, ['street', 'sport', 'ugc']],
  modern_film: ['pixlsus', 'Modern film: pellicola moderna pulita, versatile', 0.75, ['broll', 'aziendale', 'viaggio', 'cortometraggio']],
  faded_print: ['pixlsus', 'Faded print: stampa sbiadita elegante', 0.7, ['elegante', 'nostalgico', 'moda']],
  autumn: ['pixlsus', 'Autumn: arancio e rame, foglie e maglioni', 0.75, ['autunnale', 'food', 'racconto']],
  taiga: ['pixlsus', 'Taiga: verdi profondi e freddi, natura nordica', 0.7, ['invernale', 'viaggio', 'drone']],
  night_spy: ['pixlsus', 'Night spy: notte verde-blu da spionaggio', 0.6, ['misterioso', 'halloween', 'neon']],
  seventies_magazine: ['pixlsus', 'Rivista anni 70: colori caldi e sbiaditi da stampa', 0.75, ['nostalgico', 'moda', 'vhs']],
  velvetia: ['pixlsus', 'Velvia: diapositiva saturissima, paesaggi spettacolari', 0.6, ['viaggio', 'drone', 'estivo', 'timelapse']],
  whiter_whites: ['pixlsus', 'Whiter whites: bianchi puliti e luminosi, interni da catalogo', 0.75, ['immobiliare', 'minimal', 'beauty', 'aziendale']],
  delicatessen: ['pixlsus', 'Delicatessen: verde-giallo caldo, cinema alla Jeunet', 0.6, ['ironico', 'food', 'cortometraggio']],
  london_nights: ['inavision', 'London nights: notte urbana blu e ambra', 0.7, ['neon', 'glamour', 'street', 'evento']],
  nightlife: ['inavision', 'Nightlife: locali e luci di sera, contrasto e magenta', 0.7, ['neon', 'glamour', 'evento', 'festoso']],
  cold_ice: ['inavision', 'Cold ice: freddo glaciale', 0.65, ['invernale', 'misterioso', 'sport']],
  jwick_21: ['inavision', 'Stile John Wick: neon blu-verde ad alto contrasto', 0.6, ['drammatico', 'neon', 'auto', 'sport']],
  vintage_mob: ['inavision', 'Vintage mob: gangster anni 50, caldo e contrastato', 0.65, ['drammatico', 'nostalgico', 'elegante']],
  cineblue: ['berat', 'Cineblue: cinema blu notte', 0.65, ['misterioso', 'malinconico', 'invernale']],
  goldentime: ['berat', 'Golden time: ora dorata cinematografica', 0.7, ['romantico', 'emozionale', 'matrimonio', 'natalizio']],
  green_and_orange: ['berat', 'Green & orange: variante più naturale del teal & orange', 0.7, ['viaggio', 'broll', 'racconto']],
  western: ['berat', 'Western: polvere, ocra e ombre secche', 0.65, ['drammatico', 'epico', 'auto']],
  crispromance: ['jtsemple', 'Crisp romance: romantico luminoso e nitido', 0.75, ['romantico', 'matrimonio', 'beauty']],
  magentacoffee: ['jtsemple', 'Magenta coffee: caffè e toni caldi rosati, da caffetteria', 0.7, ['food', 'amichevole', 'vlog']],
  minimalistcaffeination: ['jtsemple', 'Minimalist caffeination: chiaro e pulito, da caffetteria minimal', 0.75, ['minimal', 'food', 'ugc']],
  nostalgiahoney: ['jtsemple', 'Nostalgia honey: miele caldo nostalgico', 0.7, ['nostalgico', 'autunnale', 'romantico']],
  lushgreensummer: ['jtsemple', 'Lush green summer: verdi pieni d’estate', 0.7, ['estivo', 'viaggio', 'primaverile']],
  winterlighthouse: ['jtsemple', 'Winter lighthouse: inverno sul mare, azzurri freddi', 0.7, ['invernale', 'malinconico', 'viaggio']],
  justpeachy: ['jtsemple', 'Just peachy: pesca e rosa delicati', 0.7, ['romantico', 'beauty', 'primaverile']],
  teal_moonlight: ['ohadperetz', 'Teal moonlight: notte al chiaro di luna ciano', 0.65, ['misterioso', 'neon', 'halloween']],
  retro_summer_3: ['ohadperetz', 'Retro summer: estate anni 70', 0.7, ['estivo', 'nostalgico']],
  vintage_warmth_1: ['ohadperetz', 'Vintage warmth: calore vintage morbido', 0.7, ['nostalgico', 'natalizio', 'racconto']],
  true_colors_8: ['ohadperetz', 'True colors: colori fedeli e ricchi, quasi neutro', 0.7, ['spot', 'professionale', 'tutorial']],
};

export const LUT_NOMI = Object.keys(LUT);

// le LUT consigliate per uno stile (genere + mood), in ordine di pertinenza
export function lutPerStile(stile) {
  if (!stile) return [];
  const chiavi = [...(stile.mood || []), stile.genere].filter(Boolean);
  const punti = LUT_NOMI.map((n) => [n, chiavi.reduce((a, k, i) => a + (LUT[n][3].includes(k) ? (chiavi.length - i) * 2 : 0), 0)]).filter(([, p]) => p > 0);
  return punti.sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
}

export const descriviLut = (nomi) => nomi.map((n) => `- ${n}: ${LUT[n][1]} (intensità consigliata ${LUT[n][2]})`).join('\n');
export const voceLut = (nome, intensita) => {
  const L = LUT[nome];
  if (!L) return null;
  return { nome, file: L[4] || nome, pacchetto: L[0], intensita: Math.min(1, Math.max(0.2, Number(intensita) || L[2])) };
};
