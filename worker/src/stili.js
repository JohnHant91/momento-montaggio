// Stella · ricercatrice di stile. Catalogo degli stili di montaggio: GENERE (come si gira e si taglia) + MOOD (che
// emozione dà). Johnny scrive "video street emozionale" e il catalogo dà al Regista e al montatore le regole precise;
// gli scout cercano reel montati in quello stile (anche fuori settore) e Iris ne estrae la ricetta da applicare alle clip.

export const GENERI = {
  broll: { nome: 'B-roll / atmosfera', parole: ['b-roll', 'broll', 'b roll', 'atmosfera', 'ambient', 'cinematic', 'cinematico'],
    regole: 'Racconto per immagini senza parlato: dettagli, mani, materia, luce. Movimenti lenti e puliti (slider, dolly), camera stabile. Pezzi 1,5-3 s, tagli netti sul battito, rallenty sui gesti belli. Testi assenti o un solo titolo elegante.',
    look: 'caldo_cinematico', camera: 'morbida', durata: [1.5, 3], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['dolly_in', 'slider_dx', 'slider_sx', 'zoom_lento', 'nessuno'], globali: [], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['cinematic b-roll reel'], tt: ['cinematic broll'], ig: ['cinematicbroll', 'brollvideo'] } },
  street: { nome: 'Street', parole: ['street', 'urbano', 'urban', 'strada', 'città', 'citta'],
    regole: 'Linguaggio urbano: camera a mano viva (si sente l’operatore ma senza tremolio fastidioso), angoli bassi, passanti, insegne, riflessi, ombre dure. Tagli veloci sul battito (0,6-1,5 s), whip pan e flash sugli accenti, punch-in sui colpi di cassa, qualche rallenty sui movimenti delle persone. Testi grandi, bold, maiuscoli, pochi.',
    look: 'street_urbano', camera: 'a_mano', durata: [0.6, 1.6], transizioni: ['taglio_netto', 'whip_pan', 'flash_bianco', 'glitch'], effetti: ['punch_in', 'shake', 'nessuno', 'zoom_out'], globali: ['grana'], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['street cinematic edit reel', 'street photography video edit'], tt: ['street edit', 'cinematic street'], ig: ['streetcinematography', 'streetvideography'] } },
  spot: { nome: 'Spot di prodotto', parole: ['spot', 'prodotto', 'pubblicità', 'pubblicita', 'commercial', 'adv'],
    regole: 'Il prodotto è l’eroe: macro, luce controllata, neri profondi, movimenti precisi. Pezzi 1-2,5 s, tagli secchi sul ritmo, rallenty su liquidi e particelle, zoom sul dettaglio. Finale con logo/claim.',
    look: 'spot_contrasto', camera: 'ferma', durata: [1, 2.5], transizioni: ['taglio_netto', 'flash_bianco'], effetti: ['dolly_in', 'punch_in', 'zoom_lento', 'nessuno'], globali: [], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['product commercial cinematic'], tt: ['product video commercial'], ig: ['productvideography', 'commercialvideo'] } },
  evento: { nome: 'Evento / festa', parole: ['evento', 'festa', 'matrimonio', 'party', 'serata', 'inaugurazione', 'concerto'],
    regole: 'Energia delle persone: sorrisi, abbracci, brindisi, luci, ballo. Si alternano totali della folla e dettagli. Ritmo che cresce verso il momento clou, rallenty sui gesti di festa, highlight finale.',
    look: 'naturale_vivace', camera: 'morbida', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'flash_bianco', 'zoom'], effetti: ['punch_in', 'zoom_lento', 'nessuno'], globali: ['light_leak'], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['event highlight reel cinematic'], tt: ['event recap video'], ig: ['eventvideography', 'recapvideo'] } },
  food: { nome: 'Food', parole: ['food', 'cibo', 'piatto', 'ricetta', 'cucina', 'ristorante', 'pizza', 'dolce'],
    regole: 'Fame visiva: macro su texture, vapore, filo della mozzarella, versate in rallenty, mani dello chef. Pezzi brevi 0,8-2 s, ordine di preparazione, piatto finito come climax.',
    look: 'caldo_cinematico', camera: 'ferma', durata: [0.8, 2], transizioni: ['taglio_netto'], effetti: ['dolly_in', 'punch_in', 'nessuno'], globali: [], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['food cinematic b-roll'], tt: ['food cinematic'], ig: ['foodvideography', 'foodcinematography'] } },
  viaggio: { nome: 'Viaggio / luogo', parole: ['viaggio', 'travel', 'luogo', 'territorio', 'borgo', 'mare', 'vacanza', 'turismo'],
    regole: 'Senso del luogo: panorami ampi alternati a dettagli e persone che vivono il posto. Movimenti fluidi, transizioni di movimento (whip pan) tra un luogo e l’altro, ritmo sul battito, luce dorata.',
    look: 'teal_orange', camera: 'morbida', durata: [1, 2.5], transizioni: ['taglio_netto', 'whip_pan', 'dissolvenza'], effetti: ['slider_dx', 'slider_sx', 'zoom_lento', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['cinematic travel reel'], tt: ['travel edit cinematic'], ig: ['travelreels', 'cinematictravel'] } },
  immobiliare: { nome: 'Immobiliare / struttura', parole: ['immobiliare', 'casa', 'appartamento', 'camere', 'struttura', 'b&b', 'hotel', 'interni', 'villa'],
    regole: 'Spazi ariosi e puliti: linee dritte, movimenti lentissimi (slider, dolly), luce naturale, nessun tremolio. Si passa da stanza a stanza seguendo un percorso, dettagli di design, finale sulla vista migliore.',
    look: 'pulito_commerciale', camera: 'ferma', durata: [1.8, 3.2], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['slider_dx', 'slider_sx', 'dolly_in', 'nessuno'], globali: [], rallenty: 'mai', finale: 'bianco',
    cerca: { yt: ['real estate cinematic reel'], tt: ['real estate video tour'], ig: ['realestatevideo', 'hotelvideography'] } },
  moda: { nome: 'Moda', parole: ['moda', 'fashion', 'abbigliamento', 'outfit', 'collezione', 'boutique', 'lookbook'],
    regole: 'Ritmo da passerella: pose, tessuti in movimento, dettagli di cuciture e accessori. Tagli sul battito, speed e rallenty alternati, flash sugli accenti.',
    look: 'pulito_commerciale', camera: 'morbida', durata: [0.7, 1.8], transizioni: ['taglio_netto', 'flash_bianco', 'glitch'], effetti: ['punch_in', 'zoom_out', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['fashion film edit'], tt: ['fashion edit'], ig: ['fashionfilm', 'fashionvideography'] } },
  racconto: { nome: 'Racconto / documentario', parole: ['racconto', 'storia', 'documentario', 'intervista', 'chi siamo', 'artigiano', 'mestiere'],
    regole: 'Una persona e la sua storia: inquadrature di lavoro vero, volti, mani, ambienti. Pezzi più lunghi (2-4 s), il suono originale conta, montaggio che respira. Sottotitoli se si parla.',
    look: 'moody_caldo', camera: 'morbida', durata: [2, 4], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['zoom_lento', 'dolly_in', 'nessuno'], globali: ['grana'], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['mini documentary craftsman cinematic'], tt: ['mini documentary'], ig: ['minidocumentary', 'artisanvideo'] } },
};

export const MOOD = {
  natalizio: { nome: 'Natalizio', parole: ['natalizio', 'natale', 'christmas', 'xmas', 'feste', 'capodanno', 'dicembre'],
    regole: 'Atmosfera delle feste: luci calde, bokeh, decorazioni, rossi e oro, mani che preparano, regali, brindisi. Alone luminoso (glow) e bagliori, dissolvenze morbide, rallenty su luci e polvere dorata. Si apre e si chiude nel bianco o in una luce calda. Testi serif dorati.',
    look: 'natalizio_caldo', durata: [1.5, 3], transizioni: ['dissolvenza', 'taglio_netto', 'flash_bianco'], globali: ['glow', 'light_leak'], rallenty: 'spesso', apertura: 'bianco', finale: 'bianco',
    musica: 'natalizia libera da diritti (campanelli, archi, swing), 80-120 BPM', cerca: ['christmas cinematic'], ig: 'christmasreels' },
  romantico: { nome: 'Romantico', parole: ['romantico', 'romantica', 'amore', 'coppia', 'san valentino', 'sposi'],
    regole: 'Luce morbida e dorata, alone delicato (glow), dissolvenze, rallenty su sguardi, mani che si sfiorano, dettagli. Ritmo lento e fluido, colori pastello caldi, finale nel bianco. Testi in corsivo/serif, pochi.',
    look: 'romantico_soft', durata: [2, 3.5], transizioni: ['dissolvenza', 'taglio_netto'], globali: ['glow'], rallenty: 'spesso', apertura: 'bianco', finale: 'bianco',
    musica: 'acustica o piano romantico, 60-85 BPM', cerca: ['romantic cinematic'], ig: 'romanticvideo' },
  emozionale: { nome: 'Emozionale', parole: ['emozionale', 'emozionante', 'emozione', 'emotivo', 'commovente', 'toccante'],
    regole: 'Deve toccare: il montaggio respira, pezzi più lunghi sui volti e sui gesti, rallenty sui momenti umani, silenzio o musica che cresce (piano, archi). Si apre dal nero, colori morbidi e caldi, grana e vignettatura leggere, chiusura lenta al nero. Pochissimi testi, eleganti.',
    look: 'emozionale_film', durata: [1.8, 3.5], transizioni: ['taglio_netto', 'dissolvenza', 'fadenero'], globali: ['grana', 'vignettatura'], rallenty: 'spesso', apertura: 'nero', finale: 'nero',
    musica: 'piano/archi o ambient che cresce, 60-90 BPM', cerca: ['emotional cinematic'], ig: 'cinematicreels' },
  nostalgico: { nome: 'Nostalgico / vintage', parole: ['nostalgico', 'vintage', 'retro', 'ricordi', 'anni 80', 'anni 90', 'pellicola'],
    regole: 'Sapore di pellicola: grana evidente, colori sbiaditi caldi, bande cinema, dissolvenze, ritmo morbido.',
    look: 'vintage_film', durata: [1.8, 3], transizioni: ['dissolvenza', 'taglio_netto'], globali: ['grana', 'bande_cinema', 'vignettatura'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'lo-fi / vintage, 70-95 BPM', cerca: ['vintage film edit'], ig: 'vintagefilm' },
  elegante: { nome: 'Elegante / lusso', parole: ['elegante', 'lusso', 'luxury', 'raffinato', 'esclusivo', 'boutique'],
    regole: 'Lentezza voluta, composizioni pulite, movimenti lunghissimi, niente effetti né flash, colori sobri, testi sottili e spaziati.',
    look: 'moody_scuro', durata: [2.2, 4], transizioni: ['taglio_netto', 'dissolvenza'], globali: ['vignettatura'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'piano/ambient minimal, 60-90 BPM', cerca: ['luxury cinematic'], ig: 'luxuryvideo' },
  energico: { nome: 'Energico', parole: ['energico', 'dinamico', 'veloce', 'grintoso', 'hype', 'sportivo', 'sport'],
    regole: 'Tagli su mezza battuta, flash e zoom sugli accenti, shake sui drop, contrasto alto. Mai un secondo morto.',
    look: 'teal_orange', durata: [0.5, 1.3], transizioni: ['taglio_netto', 'flash_bianco', 'zoom', 'whip_pan'], globali: [], rallenty: 'a_volte', apertura: null, finale: null,
    musica: 'elettronica/hip hop/rock, 115-140 BPM', cerca: ['fast edit'], ig: 'fastedit' },
  amichevole: { nome: 'Amichevole', parole: ['amichevole', 'simpatico', 'allegro', 'divertente', 'informale', 'friendly', 'gioioso', 'solare'],
    regole: 'Caldo e alla mano: persone che sorridono e interagiscono, ritmo vivace (1-2 s), tagli netti e punch-in giocosi, colori luminosi e saturi, testi informali in box colorati, sottotitoli se si parla. Si chiude su un sorriso o un saluto.',
    look: 'amichevole_solare', durata: [0.9, 2], transizioni: ['taglio_netto', 'zoom', 'slide'], globali: [], rallenty: 'a_volte', apertura: null, finale: null,
    musica: 'acustica allegra/ukulele/pop leggero, 100-125 BPM', cerca: ['fun upbeat'], ig: 'behindthescenes' },
};

const trova = (testo, catalogo) => {
  const t = ' ' + String(testo || '').toLowerCase() + ' ';
  return Object.keys(catalogo).filter((k) => catalogo[k].parole.some((p) => t.includes(p.length <= 4 ? ' ' + p + ' ' : p)));
};

// "mi serve un video street emozionale" → { genere: 'street', mood: ['emozionale'] }
export function rilevaStile(testo, scelta) {
  const [g0, m0] = String(scelta || '').split('+');
  const genere = GENERI[g0] ? g0 : (trova(testo, GENERI)[0] || null);
  const mood = MOOD[m0] ? [m0] : trova(testo, MOOD).slice(0, 2);
  if (!genere && !mood.length) return null;
  return { genere, mood };
}

// ricetta finale: il mood comanda colore ed emozione, il genere comanda ripresa e taglio
export function ricetta(stile) {
  if (!stile) return null;
  const G = GENERI[stile.genere] || null, Ms = (stile.mood || []).map((m) => MOOD[m]).filter(Boolean);
  const M = Ms[0] || null;
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const durate = [G?.durata, M?.durata].filter(Boolean);
  return {
    nome: [G?.nome, ...Ms.map((m) => m.nome)].filter(Boolean).join(' + '),
    look: M?.look || G?.look || null,
    camera: G?.camera || 'morbida',
    durata: durate.length ? [Math.min(...durate.map((d) => d[0])), Math.max(...durate.map((d) => d[1]))].map((x, i) => durate.length > 1 ? (durate[0][i] + durate[1][i]) / 2 : x) : null,
    transizioni: uniq([...(M?.transizioni || []), ...(G?.transizioni || [])]),
    effetti: G?.effetti || null,
    globali: uniq([...(G?.globali || []), ...Ms.flatMap((m) => m.globali || [])]),
    rallenty: M?.rallenty || G?.rallenty || 'a_volte',
    apertura: M?.apertura ?? null, finale: M?.finale ?? G?.finale ?? null,
    musica: Ms.map((m) => m.musica).join(' / ') || null,
    regole: [G && `GENERE ${G.nome.toUpperCase()}: ${G.regole}`, ...Ms.map((m) => `MOOD ${m.nome.toUpperCase()}: ${m.regole}`)].filter(Boolean).join('\n'),
  };
}

// cosa cercano gli scout: reel montati in questo stile (anche fuori settore), oltre a quelli del settore
export function ricercaStile(stile, settore) {
  const G = GENERI[stile?.genere], Ms = (stile?.mood || []).map((m) => MOOD[m]).filter(Boolean);
  const m = Ms[0]?.cerca?.[0] || '';
  const s = String(settore || '').split(/[,·(]/)[0].trim();
  const yt = [...(G?.cerca.yt || []).map((q) => (m ? m + ' ' : '') + q), m && s ? `${m} ${s} reel` : ''].filter(Boolean).slice(0, 2);
  const tt = [...(G?.cerca.tt || []).map((q) => (m ? m.split(' ')[0] + ' ' : '') + q), m ? m + ' edit' : ''].filter(Boolean).slice(0, 2);
  const ig = [...(G?.cerca.ig || []).slice(0, Ms[0]?.ig ? 1 : 2), ...(Ms[0]?.ig ? [Ms[0].ig] : [])];
  return { yt, tt, ig };
}

export const ELENCO_STILI = { generi: Object.fromEntries(Object.entries(GENERI).map(([k, v]) => [k, v.nome])), mood: Object.fromEntries(Object.entries(MOOD).map(([k, v]) => [k, v.nome])) };
