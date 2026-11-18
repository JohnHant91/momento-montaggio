// Stella · ricercatrice di stile. Catalogo degli stili di montaggio: GENERE (come si gira e si taglia) + MOOD (che
// emozione dà). Johnny scrive "video street emozionale" e il catalogo dà al Regista e al montatore le regole precise;
// gli scout cercano reel montati in quello stile (anche fuori settore) e Iris ne estrae la ricetta da applicare alle clip.

export const GENERI = {
  educativo: { nome: 'Talking head educativo con grafiche', parole: ['talking head', 'parlato in camera', 'educativo', 'tutorial', 'consigli', 'tips', 'spiegazione', 'divulgativo', 'faccio vedere', 'ti spiego'], formato: 'talking_head',
    regole: 'Una persona parla in camera a busto, seduta a una scrivania, luci colorate (gel magenta e blu) su sfondo materico scuro, un oggetto brandizzato in campo (tazza). Montaggio a jump cut serrati: niente pause, un punch-in a ogni frase, cambio di inquadratura ogni 4-5 s. Sottotitoli piccoli e bianchi in alto, parola per parola; i concetti chiave diventano CARTELLI grandi su fasce colorate inclinate (blu e rosa) che entrano quando la parola si sente; parole smentite barrate. Foto e screenshot entrano come CARTOLINE ruotate ai lati della testa con etichetta (prima/dopo, 1/2/3). Struttura: gancio forte nei primi 2 s con promessa, contesto, 3 punti numerati (con il pannello a elenco), onestà sui limiti, chiusura con CTA. Durata 60-95 s.',
    look: 'naturale_vivace', camera: 'ferma', durata: [2, 5], transizioni: ['taglio_netto'], effetti: ['punch_in', 'nessuno'], globali: [], rallenty: 'mai', finale: null,
    cerca: { yt: ['talking head reel editing captions'], tt: ['talking head edit tutorial'], ig: ['talkinghead', 'contentcreatoritalia'] } },
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
  evento: { nome: 'Evento / festa', parole: ['evento', 'festa', 'party', 'serata', 'inaugurazione', 'concerto'],
    regole: 'Energia delle persone: sorrisi, abbracci, brindisi, luci, ballo. Si alternano totali della folla e dettagli. Ritmo che cresce verso il momento clou, rallenty sui gesti di festa, highlight finale.',
    look: 'naturale_vivace', camera: 'morbida', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'flash_bianco', 'zoom'], effetti: ['punch_in', 'zoom_lento', 'nessuno'], globali: ['light_leak'], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['event highlight reel cinematic'], tt: ['event recap video'], ig: ['eventvideography', 'recapvideo'] } },
  food: { settore: true, nome: 'Food', parole: ['food', 'cibo', 'piatto', 'ricetta', 'cucina', 'ristorante', 'pizza', 'pizzeria', 'trattoria', 'osteria', 'pasticceria', 'gelateria', 'dolce', 'chef', 'caffè', 'caffe', 'torrefazione', 'cocktail', 'vino', 'cantina'],
    regole: 'Fame visiva: macro su texture, vapore, filo della mozzarella, versate in rallenty, mani dello chef. Pezzi brevi 0,8-2 s, ordine di preparazione, piatto finito come climax.',
    look: 'caldo_cinematico', camera: 'ferma', durata: [0.8, 2], transizioni: ['taglio_netto'], effetti: ['dolly_in', 'punch_in', 'nessuno'], globali: [], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['food cinematic b-roll'], tt: ['food cinematic'], ig: ['foodvideography', 'foodcinematography'] } },
  viaggio: { settore: true, nome: 'Viaggio / luogo', parole: ['viaggio', 'travel', 'luogo', 'territorio', 'borgo', 'mare', 'vacanza', 'turismo'],
    regole: 'Senso del luogo: panorami ampi alternati a dettagli e persone che vivono il posto. Movimenti fluidi, transizioni di movimento (whip pan) tra un luogo e l’altro, ritmo sul battito, luce dorata.',
    look: 'teal_orange', camera: 'morbida', durata: [1, 2.5], transizioni: ['taglio_netto', 'whip_pan', 'dissolvenza'], effetti: ['slider_dx', 'slider_sx', 'zoom_lento', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['cinematic travel reel'], tt: ['travel edit cinematic'], ig: ['travelreels', 'cinematictravel'] } },
  immobiliare: { settore: true, nome: 'Immobiliare / struttura', parole: ['immobiliare', 'casa', 'appartamento', 'camere', 'struttura', 'b&b', 'hotel', 'interni', 'villa'],
    regole: 'Spazi ariosi e puliti: linee dritte, movimenti lentissimi (slider, dolly), luce naturale, nessun tremolio. Si passa da stanza a stanza seguendo un percorso, dettagli di design, finale sulla vista migliore.',
    look: 'pulito_commerciale', camera: 'ferma', durata: [1.8, 3.2], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['slider_dx', 'slider_sx', 'dolly_in', 'nessuno'], globali: [], rallenty: 'mai', finale: 'bianco',
    cerca: { yt: ['real estate cinematic reel'], tt: ['real estate video tour'], ig: ['realestatevideo', 'hotelvideography'] } },
  moda: { settore: true, nome: 'Moda', parole: ['moda', 'fashion', 'abbigliamento', 'outfit', 'collezione', 'boutique', 'lookbook'],
    regole: 'Ritmo da passerella: pose, tessuti in movimento, dettagli di cuciture e accessori. Tagli sul battito, speed e rallenty alternati, flash sugli accenti.',
    look: 'pulito_commerciale', camera: 'morbida', durata: [0.7, 1.8], transizioni: ['taglio_netto', 'flash_bianco', 'glitch'], effetti: ['punch_in', 'zoom_out', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['fashion film edit'], tt: ['fashion edit'], ig: ['fashionfilm', 'fashionvideography'] } },
  racconto: { nome: 'Racconto / documentario', parole: ['racconto', 'storia', 'documentario', 'artigiano', 'mestiere'],
    regole: 'Una persona e la sua storia: inquadrature di lavoro vero, volti, mani, ambienti. Pezzi più lunghi (2-4 s), il suono originale conta, montaggio che respira. Sottotitoli se si parla.',
    look: 'moody_caldo', camera: 'morbida', durata: [2, 4], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['zoom_lento', 'dolly_in', 'nessuno'], globali: ['grana'], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['mini documentary craftsman cinematic'], tt: ['mini documentary'], ig: ['minidocumentary', 'artisanvideo'] } },
  vlog: { nome: 'Vlog / giornata', parole: ['vlog', 'giornata', 'day in the life', 'routine', 'una giornata', 'diario'],
    regole: 'Racconto in prima persona di una giornata: si alternano momenti al telefono/in camera e b-roll di ciò che si fa. Tagli rapidi sui gesti quotidiani, jump cut nel parlato, orari o tappe come testi, tono spontaneo, camera a mano leggera.',
    look: 'naturale_vivace', camera: 'a_mano', durata: [0.7, 2], transizioni: ['taglio_netto', 'whip_pan', 'zoom'], effetti: ['punch_in', 'zoom_out', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['day in the life vlog edit'], tt: ['day in my life'], ig: ['dayinmylife', 'vlogitalia'] } },
  tutorial: { nome: 'Tutorial / come si fa', parole: ['tutorial', 'come si fa', 'come fare', 'how to', 'passaggi', 'ricetta passo', 'guida', 'spiegazione'],
    regole: 'Insegna una cosa sola, a passi numerati: ogni passo è un pezzo chiaro con il dettaglio dell’azione, testo grande con numero e verbo. Ritmo deciso, niente fronzoli, risultato finale mostrato all’inizio (gancio) e alla fine.',
    look: 'pulito_commerciale', camera: 'ferma', durata: [1.2, 2.8], transizioni: ['taglio_netto', 'zoom'], effetti: ['punch_in', 'dolly_in', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['tutorial reel edit step by step'], tt: ['tutorial step by step'], ig: ['tutorialvideo', 'howto'] } },
  prima_dopo: { nome: 'Prima / dopo · trasformazione', parole: ['prima e dopo', 'prima/dopo', 'before after', 'trasformazione', 'restyling', 'ristrutturazione', 'makeover'],
    regole: 'Mostra il "prima" senza esagerarlo, il processo in pochi tagli veloci e il "dopo" come climax con il colpo più forte (taglio sul battito, flash o zoom). Stessa inquadratura prima e dopo quando possibile: è il match cut che fa effetto. Niente trucchi che falsano il risultato.',
    look: 'naturale_vivace', camera: 'ferma', durata: [0.6, 2.5], transizioni: ['taglio_netto', 'flash_bianco', 'zoom', 'whip_pan'], effetti: ['punch_in', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['before after transformation reel'], tt: ['before after transformation'], ig: ['beforeandafter', 'transformation'] } },
  dietro_le_quinte: { nome: 'Dietro le quinte', parole: ['dietro le quinte', 'backstage', 'behind the scenes', 'bts', 'come lavoriamo', 'making of'],
    regole: 'Mostra il lavoro vero: preparazione, errori, risate, attrezzatura, persone. Camera a mano onesta, ritmo vivace, testi ironici o informativi, suono originale presente.',
    look: 'naturale_vivace', camera: 'a_mano', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'whip_pan'], effetti: ['punch_in', 'zoom_out', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['behind the scenes reel edit'], tt: ['behind the scenes'], ig: ['behindthescenes', 'backstage'] } },
  intervista: { nome: 'Intervista / testimonianza', parole: ['intervista', 'testimonianza', 'recensione cliente', 'testimonial', 'parla il titolare', 'racconta'],
    regole: 'La persona che parla è il cuore: si tolgono pause ed esitazioni, la frase più forte apre il reel, sottotitoli grandi, b-roll sulle parole chiave. Inquadratura stabile, luce morbida sul volto.',
    look: 'caldo_cinematico', camera: 'ferma', durata: [2, 6], transizioni: ['taglio_netto'], effetti: ['punch_in', 'nessuno'], globali: [], rallenty: 'mai', finale: null,
    cerca: { yt: ['testimonial video edit'], tt: ['customer testimonial'], ig: ['testimonial', 'intervista'] } },
  musicale: { nome: 'Videoclip / sul ritmo', parole: ['videoclip', 'music video', 'sul ritmo', 'a tempo di musica', 'beat', 'montaggio musicale'],
    regole: 'La musica comanda tutto: ogni taglio cade su un battito, gli accenti hanno flash, zoom o shake, le parti calme hanno rallenty. Il climax coincide con il drop.',
    look: 'teal_orange', camera: 'morbida', durata: [0.4, 1.5], transizioni: ['taglio_netto', 'flash_bianco', 'zoom', 'whip_pan', 'glitch'], effetti: ['punch_in', 'shake', 'zoom_out', 'nessuno'], globali: [], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['beat sync edit reel'], tt: ['beat sync edit'], ig: ['beatsync', 'videoedit'] } },
  transizioni: { nome: 'Transizioni / trend edit', parole: ['transizioni', 'transition', 'trend', 'edit trend', 'cambio outfit', 'tik tok trend'],
    regole: 'Ogni passaggio è un trucco di transizione: movimento della camera o della mano che copre l’inquadratura (whip pan), zoom che entra e riesce in un altro luogo, flash sul battito. Pezzi brevissimi e a tempo.',
    look: 'naturale_vivace', camera: 'a_mano', durata: [0.4, 1.2], transizioni: ['whip_pan', 'zoom', 'flash_bianco', 'glitch', 'slide'], effetti: ['punch_in', 'shake', 'zoom_out', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['smooth transition edit reel'], tt: ['transition edit'], ig: ['transitionvideo', 'transitions'] } },
  ugc: { nome: 'UGC / autentico da smartphone', parole: ['ugc', 'autentico', 'spontaneo', 'da telefono', 'smartphone', 'creator'],
    regole: 'Sembra girato da un cliente vero: inquadrature a mano, verticale nativo, luce naturale, parlato diretto in camera, testi in stile app. Niente color pesante né effetti cinematografici.',
    look: 'naturale_vivace', camera: 'a_mano', durata: [0.8, 2.5], transizioni: ['taglio_netto'], effetti: ['punch_in', 'nessuno'], globali: [], rallenty: 'mai', finale: null,
    cerca: { yt: ['ugc video ad example'], tt: ['ugc creator'], ig: ['ugccreator', 'ugcvideo'] } },
  timelapse: { nome: 'Timelapse / hyperlapse', parole: ['timelapse', 'time lapse', 'hyperlapse', 'accelerato', 'velocizzato'],
    regole: 'Il tempo che corre: cieli, folla, preparazioni, allestimenti accelerati, alternati a momenti a velocità normale o in rallenty per contrasto. Camera ferma per i timelapse.',
    look: 'teal_orange', camera: 'ferma', durata: [1, 3], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['zoom_lento', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['timelapse cinematic reel'], tt: ['timelapse'], ig: ['timelapse', 'hyperlapse'] } },
  drone: { nome: 'Drone / aereo', parole: ['drone', 'aereo', 'dall\'alto', 'fpv', 'panoramica aerea'],
    regole: 'Spazio e grandezza: movimenti aerei lunghi e fluidi, rivelazioni (reveal) del luogo, alternati a dettagli a terra per dare scala. Ritmo largo, musica epica o ambient.',
    look: 'teal_orange', camera: 'morbida', durata: [2, 4], transizioni: ['taglio_netto', 'dissolvenza', 'whip_pan'], effetti: ['zoom_lento', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['cinematic drone reel'], tt: ['drone cinematic'], ig: ['dronevideo', 'aerialvideo'] } },
  matrimonio: { nome: 'Matrimonio / cerimonia', parole: ['matrimonio', 'sposi', 'cerimonia', 'battesimo', 'comunione', 'wedding'],
    regole: 'Highlight cinematografico: preparativi, dettagli (anelli, abito), emozioni dei volti, momenti chiave (sì, bacio, lancio del bouquet), festa. Rallenty sui momenti, dissolvenze sui salti di tempo, voce degli sposi se c’è.',
    look: 'emozionale_film', camera: 'morbida', durata: [1.5, 3.5], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['zoom_lento', 'dolly_in', 'nessuno'], globali: ['glow'], rallenty: 'spesso', finale: 'bianco',
    cerca: { yt: ['wedding highlight cinematic reel'], tt: ['wedding film'], ig: ['weddingfilm', 'weddingvideography'] } },
  sport: { settore: true, nome: 'Sport / fitness', parole: ['sport', 'fitness', 'palestra', 'allenamento', 'calcio', 'gara', 'workout'],
    regole: 'Fatica e potenza: rallenty su sudore, salti, colpi; tagli veloci sui battiti; angoli bassi, primi piani dello sforzo. Contrasto alto, colori freddi o desaturati.',
    look: 'street_urbano', camera: 'morbida', durata: [0.5, 1.6], transizioni: ['taglio_netto', 'flash_bianco', 'whip_pan', 'zoom'], effetti: ['punch_in', 'shake', 'nessuno'], globali: ['grana'], rallenty: 'spesso', finale: 'nero',
    cerca: { yt: ['sports cinematic edit'], tt: ['gym edit cinematic'], ig: ['fitnessvideo', 'sportvideography'] } },
  auto: { settore: true, nome: 'Auto / moto', parole: ['auto', 'macchina', 'moto', 'car', 'automotive', 'concessionaria'],
    regole: 'Linee e riflessi: carrellate lungo la carrozzeria, dettagli di fari e cerchi, rombo del motore, passaggi in movimento. Tagli sul ritmo, look contrastato, riflessi controllati.',
    look: 'spot_contrasto', camera: 'morbida', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'whip_pan', 'flash_bianco'], effetti: ['slider_dx', 'slider_sx', 'dolly_in', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['car commercial cinematic'], tt: ['car cinematic edit'], ig: ['carvideography', 'automotivevideo'] } },
  beauty: { settore: true, nome: 'Beauty / estetica', parole: ['beauty', 'trucco', 'makeup', 'parrucchiere', 'estetista', 'capelli', 'unghie', 'skincare', 'centro estetico'],
    regole: 'Pelle, texture e luce: macro sui prodotti, gesti delicati, risultato finale in luce morbida. Colori puliti e luminosi, rallenty su capelli e polveri, transizioni morbide.',
    look: 'pastello_soft', camera: 'ferma', durata: [1, 2.5], transizioni: ['taglio_netto', 'dissolvenza', 'flash_bianco'], effetti: ['dolly_in', 'punch_in', 'nessuno'], globali: ['glow'], rallenty: 'spesso', finale: 'bianco',
    cerca: { yt: ['beauty commercial cinematic'], tt: ['beauty cinematic'], ig: ['beautyvideo', 'beautyvideography'] } },
  aziendale: { nome: 'Aziendale / istituzionale', parole: ['aziendale', 'istituzionale', 'corporate', 'azienda', 'presentazione', 'chi siamo', 'brand video'],
    regole: 'Credibilità: persone al lavoro, ambienti ordinati, macchinari, team, numeri veri come testi. Ritmo medio, movimenti puliti, look sobrio, chiusura con logo e claim.',
    look: 'pulito_commerciale', camera: 'ferma', durata: [1.5, 3], transizioni: ['taglio_netto', 'dissolvenza'], effetti: ['slider_dx', 'slider_sx', 'dolly_in', 'nessuno'], globali: [], rallenty: 'a_volte', finale: 'bianco',
    cerca: { yt: ['corporate brand video cinematic'], tt: ['brand film'], ig: ['brandfilm', 'corporatevideo'] } },
  cortometraggio: { nome: 'Cinematografico / corto', parole: ['cinematografico', 'cortometraggio', 'film', 'cinema', 'short film', 'narrativo'],
    regole: 'Linguaggio da film: bande cinema, inquadrature composte, tempi lunghi, silenzi, suono d’ambiente curato, una piccola storia con inizio e fine. Color da pellicola e grana.',
    look: 'caldo_cinematico', camera: 'morbida', durata: [2, 4.5], transizioni: ['taglio_netto', 'dissolvenza', 'fadenero'], effetti: ['dolly_in', 'zoom_lento', 'slider_dx', 'nessuno'], globali: ['bande_cinema', 'grana'], rallenty: 'a_volte', finale: 'nero',
    cerca: { yt: ['cinematic short film reel'], tt: ['short film cinematic'], ig: ['shortfilm', 'cinematicvideo'] } },
  asmr: { nome: 'ASMR / sensoriale', parole: ['asmr', 'sensoriale', 'rilassante suoni', 'satisfying'],
    regole: 'Il suono è protagonista: niente musica o musica bassissima, audio originale alto e pulito (taglio, versata, croccante), macro lentissimi, tagli dolci, nessun testo.',
    look: 'caldo_cinematico', camera: 'ferma', durata: [1.5, 3.5], transizioni: ['taglio_netto'], effetti: ['dolly_in', 'nessuno'], globali: [], rallenty: 'a_volte', finale: null,
    cerca: { yt: ['asmr cinematic food'], tt: ['asmr satisfying'], ig: ['asmrvideo', 'satisfyingvideo'] } },
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
  ironico: { nome: 'Ironico / divertente', parole: ['ironico', 'comico', 'divertente', 'meme', 'scherzoso', 'buffo', 'ridere'],
    regole: 'Tempi comici: pausa prima della battuta, punch-in sulle reazioni, tagli secchi, testi grandi a effetto, suoni buffi e silenzi improvvisi. Mai volgare, nel tono del brand.',
    look: 'amichevole_solare', durata: [0.5, 1.8], transizioni: ['taglio_netto', 'zoom'], globali: [], rallenty: 'a_volte', apertura: null, finale: null,
    musica: 'pop/quirky giocoso, 100-130 BPM', cerca: ['funny'], ig: 'funnyreels' },
  misterioso: { nome: 'Misterioso / suspense', parole: ['misterioso', 'mistero', 'suspense', 'thriller', 'enigmatico', 'rivelazione', 'teaser'],
    regole: 'Si mostra poco: dettagli parziali, ombre, controluce, rivelazione finale. Ritmo trattenuto con colpi improvvisi, dissolvenze al nero, colori freddi e scuri. Ottimo per teaser e lanci.',
    look: 'moody_scuro', durata: [1.2, 3], transizioni: ['taglio_netto', 'fadenero', 'glitch'], globali: ['vignettatura', 'grana'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'ambient scuro/pulsante con riser, 70-100 BPM', cerca: ['mysterious teaser'], ig: 'teaser' },
  epico: { nome: 'Epico / grandioso', parole: ['epico', 'grandioso', 'potente', 'maestoso', 'trailer', 'cinematic epic'],
    regole: 'Senso di grandezza: inquadrature ampie, rallenty potenti, crescendo fino a un climax, colpi sui battiti forti, bande cinema. Musica orchestrale che sale.',
    look: 'teal_orange', durata: [1, 3], transizioni: ['taglio_netto', 'fadenero', 'flash_bianco'], globali: ['bande_cinema'], rallenty: 'spesso', apertura: 'nero', finale: 'nero',
    musica: 'orchestrale/trailer epico, 80-120 BPM', cerca: ['epic cinematic'], ig: 'epicvideo' },
  motivazionale: { nome: 'Motivazionale / ispirazionale', parole: ['motivazionale', 'ispirazionale', 'ispirante', 'motivazione', 'sfida', 'crescita', 'sogno'],
    regole: 'Dalla fatica al risultato: frasi forti a schermo, una alla volta, rallenty sui momenti di sforzo e di conquista, ritmo che cresce, finale luminoso.',
    look: 'caldo_cinematico', durata: [1, 2.5], transizioni: ['taglio_netto', 'flash_bianco', 'dissolvenza'], globali: [], rallenty: 'spesso', apertura: 'nero', finale: 'bianco',
    musica: 'piano + percussioni in crescendo, 90-120 BPM', cerca: ['motivational'], ig: 'motivationalvideo' },
  rilassante: { nome: 'Rilassante / calmo', parole: ['rilassante', 'calmo', 'relax', 'tranquillo', 'zen', 'benessere', 'spa'],
    regole: 'Respiro lungo: inquadrature lunghe e ferme, movimenti lentissimi, acqua, luce, natura, suoni ambientali morbidi, dissolvenze. Nessun flash, nessun testo aggressivo.',
    look: 'pastello_soft', durata: [2.5, 4.5], transizioni: ['dissolvenza', 'taglio_netto'], globali: ['glow'], rallenty: 'spesso', apertura: 'bianco', finale: 'bianco',
    musica: 'ambient/lo-fi morbido, 60-80 BPM', cerca: ['relaxing cinematic'], ig: 'relaxingvideo' },
  malinconico: { nome: 'Malinconico / nostalgia dolce', parole: ['malinconico', 'malinconia', 'triste', 'nostalgia', 'ricordo', 'addio'],
    regole: 'Colori spenti, luce di fine giornata, inquadrature vuote e silenziose, ritmo lento, dissolvenze, pochi testi poetici. Chiusura al nero.',
    look: 'emozionale_film', durata: [2, 4], transizioni: ['dissolvenza', 'fadenero', 'taglio_netto'], globali: ['grana', 'vignettatura'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'piano lento/archi, 55-80 BPM', cerca: ['melancholic cinematic'], ig: 'cinematicmood' },
  glamour: { nome: 'Glamour / sensuale', parole: ['glamour', 'sensuale', 'seducente', 'sexy'],
    regole: 'Luce scolpita, pelle e tessuti, sguardi in camera, rallenty, contrasto ricco, toni caldi o neon. Movimenti lenti e sicuri, montaggio sul ritmo.',
    look: 'neon_notte', durata: [1, 2.5], transizioni: ['taglio_netto', 'dissolvenza', 'flash_bianco'], globali: ['glow'], rallenty: 'spesso', apertura: 'nero', finale: 'nero',
    musica: 'r&b/deep house, 95-120 BPM', cerca: ['glamour night'], ig: 'nightvibes' },
  festoso: { nome: 'Festoso / celebrativo', parole: ['festoso', 'celebrativo', 'anniversario', 'compleanno', 'festeggiamo', 'auguri', 'inaugurazione'],
    regole: 'Gioia condivisa: brindisi, coriandoli, abbracci, luci; tagli vivaci sul ritmo, flash sugli applausi, bagliori. Finale con il messaggio di auguri.',
    look: 'amichevole_solare', durata: [0.7, 2], transizioni: ['taglio_netto', 'flash_bianco', 'zoom'], globali: ['light_leak'], rallenty: 'spesso', apertura: null, finale: 'bianco',
    musica: 'pop/funk festoso, 105-128 BPM', cerca: ['celebration'], ig: 'celebration' },
  minimal: { nome: 'Minimal / pulito', parole: ['minimal', 'minimalista', 'pulito', 'essenziale', 'clean'],
    regole: 'Meno è meglio: composizioni con molto spazio, sfondi neutri, un soggetto per inquadratura, tagli netti, nessun effetto, testi sottili e piccoli, colori desaturati.',
    look: 'pulito_commerciale', durata: [1.5, 3], transizioni: ['taglio_netto'], globali: [], rallenty: 'mai', apertura: 'bianco', finale: 'bianco',
    musica: 'minimal elettronica/piano, 80-110 BPM', cerca: ['minimal aesthetic'], ig: 'minimalaesthetic' },
  sognante: { nome: 'Sognante / onirico', parole: ['sognante', 'onirico', 'dreamy', 'fiabesco', 'magico', 'incantato'],
    regole: 'Come un sogno: alone luminoso, controluce, pastelli, rallenty fluttuanti, dissolvenze lunghe, bagliori. Nessun taglio brusco.',
    look: 'romantico_soft', durata: [2, 4], transizioni: ['dissolvenza'], globali: ['glow', 'light_leak'], rallenty: 'spesso', apertura: 'bianco', finale: 'bianco',
    musica: 'dream pop/ambient, 60-90 BPM', cerca: ['dreamy aesthetic'], ig: 'dreamyaesthetic' },
  drammatico: { nome: 'Drammatico / dark', parole: ['drammatico', 'dark', 'cupo', 'intenso', 'scuro'],
    regole: 'Ombre profonde e contrasto duro, luce da un lato, volti seri, ritmo teso con pause, colpi sonori sui tagli, bianco e nero o colori molto spenti.',
    look: 'moody_scuro', durata: [1.2, 3], transizioni: ['taglio_netto', 'fadenero'], globali: ['grana', 'vignettatura'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'cinematic dark/percussivo, 70-110 BPM', cerca: ['dark cinematic'], ig: 'darkaesthetic' },
  bianco_nero: { nome: 'Bianco e nero', parole: ['bianco e nero', 'b/n', 'bn', 'monocromatico', 'black and white'],
    regole: 'Tutto in bianco e nero contrastato: conta la luce, la forma e il gesto. Grana leggera, composizioni forti.',
    look: 'bn_contrasto', durata: [1.2, 3], transizioni: ['taglio_netto', 'dissolvenza'], globali: ['grana'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'piano/jazz/ambient', cerca: ['black and white cinematic'], ig: 'blackandwhitevideo' },
  neon: { nome: 'Neon / anni 80', parole: ['neon', 'anni 80', '80s', 'synthwave', 'retrowave', 'cyber'],
    regole: 'Notte e colori elettrici magenta/ciano, riflessi, insegne, glitch e flash sui battiti, glow. Musica synth.',
    look: 'neon_notte', durata: [0.6, 1.8], transizioni: ['taglio_netto', 'glitch', 'flash_bianco'], globali: ['glow', 'grana'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'synthwave/retrowave, 90-120 BPM', cerca: ['neon synthwave'], ig: 'neonaesthetic' },
  vhs: { nome: 'VHS / anni 90', parole: ['vhs', 'anni 90', '90s', 'videocassetta', 'camcorder', 'y2k'],
    regole: 'Estetica da videocassetta: colori sbavati, righe, rumore, data in sovrimpressione se serve, camera a mano. Ironico e nostalgico.',
    look: 'vintage_film', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'glitch'], globali: ['vhs'], rallenty: 'mai', apertura: null, finale: null,
    musica: 'lo-fi/90s, 85-110 BPM', cerca: ['vhs aesthetic'], ig: 'vhsaesthetic' },
  estivo: { nome: 'Estivo', parole: ['estivo', 'estate', 'summer', 'mare', 'spiaggia', 'agosto', 'ferragosto'],
    regole: 'Sole, acqua, pelle abbronzata, colori saturi e luminosi, tuffi in rallenty, ritmo allegro, bagliori di luce.',
    look: 'estate_luminosa', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'whip_pan', 'flash_bianco'], globali: ['light_leak'], rallenty: 'spesso', apertura: null, finale: null,
    musica: 'tropical/pop estivo, 100-124 BPM', cerca: ['summer vibes'], ig: 'summervibes' },
  autunnale: { nome: 'Autunnale', parole: ['autunnale', 'autunno', 'autumn', 'ottobre', 'novembre', 'vendemmia', 'castagne'],
    regole: 'Toni ambra e rame, foglie, vapore, maglioni, luce bassa, ritmo morbido, grana leggera.',
    look: 'autunno_caldo', durata: [1.5, 3], transizioni: ['taglio_netto', 'dissolvenza'], globali: ['grana'], rallenty: 'a_volte', apertura: null, finale: 'nero',
    musica: 'folk acustico, 70-100 BPM', cerca: ['autumn cinematic'], ig: 'autumnvibes' },
  invernale: { nome: 'Invernale', parole: ['invernale', 'inverno', 'winter', 'neve', 'freddo', 'gennaio'],
    regole: 'Luce fredda e pulita, fiato nell’aria, neve, contrasto tra esterno freddo e interno caldo, ritmo calmo, dissolvenze.',
    look: 'inverno_freddo', durata: [1.8, 3.2], transizioni: ['taglio_netto', 'dissolvenza'], globali: [], rallenty: 'a_volte', apertura: 'bianco', finale: 'bianco',
    musica: 'ambient/piano invernale, 60-90 BPM', cerca: ['winter cinematic'], ig: 'wintervibes' },
  primaverile: { nome: 'Primaverile', parole: ['primaverile', 'primavera', 'spring', 'fiori', 'pasqua', 'aprile', 'maggio'],
    regole: 'Fiori, verde tenero, luce fresca, colori pastello vivi, ritmo leggero, glow delicato.',
    look: 'pastello_soft', durata: [1.2, 2.5], transizioni: ['taglio_netto', 'dissolvenza'], globali: ['glow'], rallenty: 'a_volte', apertura: 'bianco', finale: 'bianco',
    musica: 'acustica leggera, 90-115 BPM', cerca: ['spring aesthetic'], ig: 'springvibes' },
  halloween: { nome: 'Halloween', parole: ['halloween', 'horror', 'spaventoso', 'zucche'],
    regole: 'Buio, arancio e viola, ombre, glitch, colpi sonori, tagli improvvisi, zucche e candele. Ironico più che spaventoso, salvo richiesta.',
    look: 'moody_scuro', durata: [0.8, 2.2], transizioni: ['taglio_netto', 'glitch', 'fadenero'], globali: ['grana', 'vignettatura'], rallenty: 'a_volte', apertura: 'nero', finale: 'nero',
    musica: 'spooky/elettronica dark, 90-120 BPM', cerca: ['halloween edit'], ig: 'halloweenvibes' },
  professionale: { nome: 'Professionale / autorevole', parole: ['professionale', 'autorevole', 'serio', 'affidabile', 'tecnico', 'b2b'],
    regole: 'Sicurezza e competenza: inquadrature curate e stabili, dati veri a schermo, ritmo misurato, look pulito, nessun effetto giocoso.',
    look: 'pulito_commerciale', durata: [1.5, 3], transizioni: ['taglio_netto'], globali: [], rallenty: 'mai', apertura: null, finale: 'bianco',
    musica: 'corporate minimal, 90-115 BPM', cerca: ['professional brand'], ig: 'brandvideo' },
};

// trova gli stili citati: vince la parola più specifica (più lunga), poi l'ordine di priorità
const PRIORITA_MOOD = ['natalizio', 'halloween', 'estivo', 'autunnale', 'invernale', 'primaverile', 'romantico', 'bianco_nero', 'neon', 'vhs', 'nostalgico', 'emozionale', 'malinconico', 'epico', 'misterioso', 'drammatico', 'sognante', 'glamour', 'elegante', 'minimal', 'rilassante', 'motivazionale', 'festoso', 'energico', 'ironico', 'amichevole', 'professionale'];
const trova = (testo, catalogo, priorita = []) => {
  const t = ' ' + String(testo || '').toLowerCase().replace(/[.,;:!?()"]/g, ' ') + ' ';
  const pesi = Object.keys(catalogo).map((k) => [k, Math.max(0, ...catalogo[k].parole.filter((p) => t.includes(p.length <= 4 ? ' ' + p + ' ' : p)).map((p) => p.length))]).filter(([, w]) => w > 0);
  const pr = (k) => (priorita.includes(k) ? priorita.indexOf(k) : 99);
  // i generi "di settore" (food, moda…) contano meno di uno stile scritto esplicitamente (street, vlog…)
  const sett = (k) => (catalogo[k].settore ? 1 : 0);
  return pesi.sort((a, b) => (priorita.length ? pr(a[0]) - pr(b[0]) : sett(a[0]) - sett(b[0]) || b[1] - a[1])).map(([k]) => k);
};

// "mi serve un video street emozionale" → { genere: 'street', mood: ['emozionale'] }
export function rilevaStile(testo, scelta) {
  const [g0, m0] = String(scelta || '').split('+');
  const genere = GENERI[g0] ? g0 : (trova(testo, GENERI)[0] || null);
  const mood = MOOD[m0] ? [m0] : trova(testo, MOOD, PRIORITA_MOOD).slice(0, 2);
  if (!genere && !mood.length) return null;
  return { genere, mood };
}

// ricetta finale: il mood comanda colore ed emozione, il genere comanda ripresa e taglio
export function ricetta(stile) {
  if (!stile) return null;
  if (stile.libero && !stile.genere && !(stile.mood || []).length) {
    return { nome: stile.libero, look: null, camera: 'morbida', durata: null, transizioni: ['taglio_netto', 'dissolvenza', 'flash_bianco', 'whip_pan', 'zoom', 'glitch', 'slide', 'fadenero'], effetti: null, globali: [], rallenty: 'a_volte', apertura: null, finale: null, musica: null,
      regole: `STILE "${stile.libero}" (non è nel catalogo): ricava ritmo, transizioni, color, camera, testi e musica SOLO dai reel di riferimento montati in questo stile e applicali alle clip.` };
  }
  const G = GENERI[stile.genere] || null, Ms = (stile.mood || []).map((m) => MOOD[m]).filter(Boolean);
  const M = Ms[0] || null;
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const durate = [G?.durata, M?.durata].filter(Boolean);
  return {
    nome: [G?.nome, ...Ms.map((m) => m.nome)].filter(Boolean).join(' + '),
    formato: G?.formato || null,
    look: M?.look || G?.look || null,
    camera: G?.camera || 'morbida',
    durata: durate.length ? [Math.min(...durate.map((d) => d[0])), Math.max(...durate.map((d) => d[1]))].map((x, i) => durate.length > 1 ? (durate[0][i] + durate[1][i]) / 2 : x) : null,
    transizioni: uniq([...(M?.transizioni || []), ...(G?.transizioni || [])]),
    effetti: G?.effetti || null,
    globali: uniq([...(G?.globali || []), ...Ms.flatMap((m) => m.globali || [])]),
    rallenty: M?.rallenty || G?.rallenty || 'a_volte',
    apertura: M?.apertura ?? null, finale: M?.finale ?? G?.finale ?? null,
    musica: Ms.map((m) => m.musica).join(' / ') || null,
    regole: [G && `GENERE ${G.nome.toUpperCase()}: ${G.regole}${G.formato ? ` FORMATO DEL MONTATORE: ${G.formato} (se le clip hanno parlato), con sottotitoli "piccoli_alto", 4-10 cartelli, schede per ogni foto/screenshot caricato e il pannello "steps" per i punti numerati.` : ''}`, ...Ms.map((m) => `MOOD ${m.nome.toUpperCase()}: ${m.regole}`)].filter(Boolean).join('\n'),
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
  // le ricerche suggerite da Leo per lo stile (servono soprattutto per gli stili fuori catalogo)
  const extra = (stile?.ricerca || []).filter(Boolean);
  return { yt: [...extra, ...yt].slice(0, 2), tt: [...extra.slice(0, 1), ...tt].slice(0, 2), ig };
}

export const ELENCO_STILI = { generi: Object.fromEntries(Object.entries(GENERI).map(([k, v]) => [k, v.nome])), mood: Object.fromEntries(Object.entries(MOOD).map(([k, v]) => [k, v.nome])) };
