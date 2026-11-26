// Manuali di reparto: regole e metodi estratti dalle skill "social-media-skills" caricate da Johnny
// (short-form-video-script, reels-script, hook-writer, viral-reverse-engineering, caption-writer, instagram-seo,
//  hashtag-strategy, instagram-reels-publishing, capcut, captions-and-clipping, ai-music-and-sound).
// Gli agenti girano su Cloudflare e non possono leggere le skill: qui c'è il loro contenuto operativo.

export const MANUALE_DIRETTORE = `MANUALE DEL DIRETTORE CREATIVO (dalle skill short-form-video-script + reels-script)
- Lo scopo del reel è essere impossibile da saltare: conta la visione fino in fondo, non i like.
- Metodo WATCH:
  W · Vinci i primi 3 secondi (lì avviene il 50-60% degli abbandoni): l'inquadratura più forte per prima, niente intro,
      logo o saluti; gancio a 3 livelli insieme: immagine + testo a schermo + parlato (se c'è).
  A · Arco con anelli aperti: gancio → corpo → payoff → chiusura/loop; cambio visivo ogni 2-4 s; ogni secondo deve
      catturare, insegnare o preparare il payoff, il resto si taglia.
  T · Due tracce: la maggior parte guarda SENZA AUDIO → la storia deve reggersi sui testi a schermo; il suono aggiunge.
  C · Mantieni la promessa: il payoff consegna ciò che il gancio promette (niente esca: crea un crollo di retention che
      l'algoritmo punisce).
  H · Chiudi con un loop (la fine riporta al primo fotogramma, così si riguarda) e UNA call to action breve legata al valore.
- Instagram Reels: la portata arriva soprattutto da chi non ti segue; contano watch-through e INVII in DM (pesano 3-5 volte
  i like). Chiediti sempre: chi lo manderebbe a chi, e perché? Durata ideale 15-35 s (~75 parole ≈ 30 s); fino a 90 s solo
  se il contenuto lo regge. Mai allungare.
- Un reel = una sola idea e un solo obiettivo (portata, invii, salvataggi, follower o commenti).
- Ricerca su Instagram ora è per parole chiave: la parola chiave principale va nel testo a schermo dei primi secondi e nella
  prima frase della caption; il contenuto visivo deve corrispondere alla caption.
- Requisiti per essere spinto: contenuto originale, nessun watermark di altre piattaforme, con audio, nicchia chiara.
- La copertina si sceglie prima di pubblicare e non si cambia dopo: fotogramma forte + testo grande al centro.`;

export const MANUALE_IRIS = `MANUALE DI IRIS (dalla skill viral-reverse-engineering)
- Meccanismo, non superficie: individua i 1-2 elementi portanti (di solito il gancio e la leva emotiva/di condivisione),
  non le caratteristiche incidentali. Copiare il rumore riproduce rumore.
- Prova controfattuale: "se tolgo questo elemento, funziona ancora?" Se crolla è un motore, se no è incidentale.
- Leva di condivisione (perché qualcuno lo manda a un altro): identità, emozione forte (meraviglia, umorismo,
  ispirazione), valore sociale, utilità pratica, immedesimazione, storia. Senza leva di condivisione: visualizzazioni sì,
  viralità no.
- Onestà sulla fortuna: profilo molto grande, momento irripetibile, caso, sopravvivenza dei soli vincitori. Se il successo
  dipende da questo, dichiaralo NON replicabile e non inventare una regola.
- Uscita: il principio in una riga ("la leva è X") applicabile al nostro settore, mai una copia.`;

export const MANUALE_REGISTA = `MANUALE DEL REGISTA (dalle skill capcut + short-form-video-script + captions-and-clipping)
- Metodo EDITS: monta seguendo la scheda; taglia tutto ciò che non serve; il gancio arriva nei primi secondi; l'ultimo
  taglio è il loop.
- Ritmo: cambio visivo ogni 2-4 s (taglio, punch-in, cambio inquadratura, testo che compare); niente tratti morti.
- Primo pezzo = l'immagine più forte di tutto il girato (mai un'inquadratura di apertura lenta, mai il logo all'inizio).
- Alterna i piani (totale, dettaglio, primo piano) e i movimenti; non ripetere lo stesso momento.
- Il finale deve poter "chiudere il cerchio" con l'inizio (stessa inquadratura, stesso gesto o movimento che riparte).
- Ogni clip deve stare in piedi da sola nel suo pezzo, con il soggetto inquadrato nel 9:16.
REGOLE DA MONTATORE PROFESSIONISTA (valgono sempre):
- Taglia SULL'AZIONE: il taglio cade a metà di un gesto (mano che versa, porta che si apre, tazza che si alza) e il
  pezzo dopo continua lo stesso movimento da un'altra inquadratura. È il taglio che non si vede.
- Mai due pezzi di fila con la stessa inquadratura e lo stesso soggetto (jump cut): cambia piano (totale → medio →
  dettaglio) o angolo di almeno 30°. Rispetta la direzione: se una cosa si muove verso destra, nel pezzo dopo continua
  verso destra.
- Match cut quando puoi: forma, colore o movimento simile che lega due pezzi diversi (cerchio della tazza → cerchio
  della tostatrice). Sono i momenti che fanno dire "che montaggio".
- "in" di ogni pezzo: scegli il tratto dove la camera è ferma o il movimento è pulito e costante; mai entrare o uscire
  durante uno scatto, una messa a fuoco che cerca o un cambio di esposizione. Se un momento esatto conta (il chicco
  che cade, il sorriso), metti "in_preciso": true e il montatore non lo sposta.
- Durate: dettagli e macro 1-2 s, piani medi 2-3 s, il "momento eroe" (la scena più bella) può tenere 3-4 s e merita il
  rallenty. Il ritmo cresce verso il climax e respira nel finale.
- Rallenty solo su gesti che lo meritano (liquidi, polvere, chicchi, capelli, acqua) e solo se il girato è a 50/60 fps.
- Transizioni: il 90% sono tagli netti. Dissolvenze solo per salti di tempo o luogo, mai effetti a caso.
- Il color lo uniforma il montatore (stessa luce per tutte le clip): tu scegli un solo look coerente col brand.
- Evita clip sovraesposte, mosse, sfocate o con persone tagliate male: se un pezzo non è all'altezza, toglilo e accorcia
  il reel. Meglio 25 secondi perfetti che 45 con due clip brutte.`;

export const MANUALE_COPY = `MANUALE DEL COPY (dalle skill hook-writer + caption-writer + instagram-seo + hashtag-strategy)
- Il gancio funziona aprendo un vuoto che chi guarda deve chiudere. Meccanismi: curiosità, contrario, posta in gioco/costo,
  numero specifico, identità ("se sei..."), storia già in corso, errore, trasformazione prima→dopo, domanda, attualità.
- Scrivi 5 ganci con meccanismi DIVERSI, scegli il migliore: deve essere specifico, vero (il video lo mantiene),
  comprensibile senza audio, nel tono del brand. I ganci-template ("il segreto che nessuno ti dice") sono morti.
- Testi a schermo: brevi, leggibili in un colpo d'occhio, portano la storia anche senza audio.
- Caption: la prima riga (~125 caratteri, prima del "...altro") è tutto: niente saluti né descrizioni dell'immagine;
  contiene la parola chiave principale in modo naturale. Corpo che mantiene la promessa, UNA sola call to action legata
  all'obiettivo (salva, manda a..., commenta con..., link in bio).
- Ricerca Instagram: parola chiave principale nella prima frase + 2-4 parole correlate nel testo, mai riempire di keyword.
- Hashtag: 3-5 etichette di argomento specifiche (non trenta, non generici tipo #reels #viral).
- Mai statistiche inventate o promesse false.`;

export const MANUALE_PUBBLICAZIONE = `REGOLE DI PUBBLICAZIONE (dalla skill instagram-reels-publishing)
- 1080x1920, 9:16. Zone coperte dall'interfaccia: circa 250 px in alto e 350 px in basso → testi, volti e CTA nella fascia
  centrale (anche per i ritagli 4:5 del feed e 3:4 della griglia profilo).
- Copertina: scelta prima di pubblicare, non modificabile dopo; meglio una copertina dedicata che un fotogramma qualsiasi;
  testo grande (≥60 px) al centro.`;

export const MANUALE_AUDIO = `REGOLE AUDIO (dalla skill ai-music-and-sound)
- Per un brand mai musica protetta o "di tendenza" incorporata senza licenza (rischio silenziamento/rivendicazione).
- Il brano di tendenza si aggiunge in app dalla libreria di Instagram; nel file si mettono solo suono originale ed effetti.
- Il sound design (whoosh, impatti, riser sui tagli) nei video brevi conta spesso più del brano.`;

export const MANUALE_FORMATI = `FORMATI DEL MONTATORE (scegli "formato" nel piano, in base al girato e alla scheda)
- "montaggio": il reel classico da tante clip (b-roll, prodotto, luoghi, persone senza un discorso). Gancio → sviluppo →
  climax → chiusura sul ritmo. È il formato di base.
- "talking_head": una persona che PARLA IN CAMERA (clip con parlato presente e trascrizione). Il montatore toglie da solo
  i silenzi, fa un punch zoom a ogni frase, scrive sottotitoli grandi (1-3 parole) sotto il mento con un riquadro colorato
  che scorre di parola in parola, mette la prima frase come GANCIO grande sopra la testa con un "boom", e copre le parole
  chiave con i b-roll che scegli. Tu scegli SOLO i tratti di parlato buoni (le prese migliori, niente ripetizioni o frasi
  sbagliate), in ordine, con "in" e "durata" sui tempi della trascrizione; il primo tratto deve aprire con la frase più
  forte (il gancio: un risultato, una promessa, una domanda). Correggi le parole che Whisper sente male in "correzioni".
  B-roll: 2-5 inserti di 1,5-3 s sulle parole concrete (un piatto, una camera, il prodotto), mai durante il gancio.
  Testi sempre fuori dal viso: non servono "testo" sui segmenti. Durata ideale 20-45 s.
  PANNELLO EXPLAINER (facoltativo, solo talking_head): se chi parla dà NUMERI (una crescita, un confronto, una
  percentuale) o un PROCEDIMENTO a passi, aggiungi "pannello": scende sulla metà alta con un grafico animato che si
  disegna (line = andamento nel tempo, bar = confronto, steps = passi numerati) e il viso si sposta in basso. Usa SOLO
  numeri e passi detti davvero nella trascrizione: mai inventarli. Se non ci sono, niente pannello.
  STILE "EDUCATIVO CON GRAFICHE" (video tipo tutorial/consigli, 60-95 s): sottotitoli "piccoli_alto" (piccoli, bianchi, in
  alto); i concetti diventano "cartelli" (4-10): 1-4 parole GRANDI su fascia blu o rosa inclinata che entrano sulla parola
  detta (nomi di strumenti, il concetto del momento, "cosa NON si può fare"; stile "barrato" per una cosa smentita o
  sbagliata). Ogni foto o screenshot caricato con il girato diventa una "scheda": cartolina ruotata a lato della testa con
  etichetta (prima/dopo, 1/2/3, esempio) sulla parola che la cita; "prima" e "dopo" possono restare insieme. I punti
  numerati vanno nel pannello "steps" con i passi detti davvero.
- "carosello": hai delle FOTO/SLIDE (tecnico.tipo = immagine) che formano un carosello o una sequenza: ogni slide resta
  intera su uno sfondo sfocato di se stessa, con barre di avanzamento come le storie, push-in lento e transizioni a spinta
  con whoosh. Slide ricche di testo: ~1 s ogni 8 parole, minimo 1,8 s. Gancio breve sulla prima slide, CTA sull'ultima.
- "split_grafico": una persona che parla in camera (come talking_head: scegli i tratti di parlato buoni, in ordine) ma lo
  schermo è DIVISO: sotto la persona ferma, sopra un foglio color carta con griglia dove scorrono GRAFICHE ANIMATE che
  illustrano esattamente quello che si dice, al centro un sottotitolo a pillola nera in stampatello a macchina (i nomi
  chiave colorati: mettili in "evidenzia"). Regole delle "grafiche":
  · una nuova grafica ogni 3-4 secondi di parlato (un video di 50 s ne ha 12-16, MAI più di 16): meno grafiche ma ricche
    di movimento; ognuna sulla parola che la introduce; mai due grafiche dello stesso tipo di fila;
  · scegli il tipo giusto per la frase: il gancio/il concetto → titolo (con UNA parola "accento" in corsivo colorato);
    un elemento numerato della lista → numero ("1", nome); uno strumento/sito/app citato → sito con l'URL VERO e completo
    (https://…) della pagina principale, mai inventato (se non sei sicuro dell'indirizzo usa card); un comando, un prompt,
    un'automazione → terminale; una cifra detta → contatore; più punti → lista; prima/dopo, sbagliato/giusto → confronto;
    una funzione o un consiglio → card ("icona": un simbolo semplice tipo ✦ ⚙ ✎ ★ ⚡, niente emoji colorate); una domanda a
    un'AI → chat; numeri da confrontare → barre; la chiusura con tutti gli elementi → riepilogo; il gancio, un prodotto,
    un concetto da far "vedere" → oggetto (cubo 3D che cade e rimbalza, "simbolo": 1-3 caratteri tipo "€0", "AI", "✦",
    "titolo" scritto sopra con "accento");
  · EFFETTI (sei il SUPER MONTATORE di effetti speciali): ogni grafica può avere "effetti": [...] scelti tra
    scrivi (titolo a macchina col cursore), cornice (rettangolo da programma di design con maniglie ed etichetta),
    cursore (freccia del mouse che arriva e clicca, con suono), coriandoli (pallini colorati che esplodono e attraversano
    lo schermo, con pop), fantasma (numero gigante sullo sfondo), icone (tessere che fluttuano ai lati; "decor": ["Aa","%"]
    nei dati per scegliere i simboli), lente (lente che scorre sulla grafica), successo (barra verde "fatto"; testo in
    "successo" nei dati), scossa (scossone con tonfo sul dato forte), e gli effetti ADDOSSO A JOHNNY (persona ritagliata):
    dietro (scritta gigante DIETRO di lui, la parola chiave in "dietro" nei dati, max 2 parole; solo con la persona
    visibile, mai su grafiche "pieno"), esce (lui cresce e la testa esce dal riquadro sopra le grafiche: per il gancio o
    la rivelazione), adesivo (lui ritagliato come adesivo con contorno bianco e cornice tratteggiata "johnny.png", che
    sale sopra le grafiche: per un momento ironico o una domanda). Regole: 2-3 effetti per grafica, il gancio (prima
    grafica) SEMPRE con un effetto addosso (esce o dietro) + coriandoli o scossa; in tutto il video 2-4 effetti addosso
    (mai due di fila), 2-3 coriandoli, 1-2 scosse; cursore su card, sito e confronto; se non metti "effetti" valgono
    quelli di base del tipo (titolo: scrivi+icone, card: cornice+cursore+icone, numero: fantasma+coriandoli…);
  · 2-4 grafiche "pieno": true (terminale, sito, riepilogo) per dare respiro: la persona sparisce per qualche secondo;
  · testi brevissimi (titoli max 5 parole, voci max 4 parole), solo cose dette davvero: niente numeri o fatti inventati;
  · video a lista ("5 strumenti", "3 errori") → "tracker" con il totale e una voce per elemento sulla parola in cui entra.
  PALETTE E FONT SECONDO L'ARGOMENTO (lo stile resta, i colori cambiano): fondo chiaro tipo carta (es. #F1EFEA, #F4F1EA,
  #EEF1F4), inchiostro quasi nero, UN accento che richiama l'argomento (AI/Claude → terracotta #D4552F; Instagram/social →
  magenta #D6407F; soldi/business → verde #1F9D55; tech/dev → blu #2F6FED; food → arancio #E07A2F; Momento/agenzia → teal
  #0E9F9A), "secondario" = l'accento molto chiaro, "tenue" = rgba dell'inchiostro all'8-10%. Font: titoli serif elegante
  (Instrument Serif di base; Playfair/Fraunces per temi lusso o food; Space Grotesk se l'argomento è molto tech), testo
  Inter, mono JetBrains Mono. Niente "cartelli", "schede", "broll", "pannello" in questo formato. Durata 30-70 s.
- "parole_dietro": la persona che parla a TUTTO SCHERMO (ritagliata in automatico). Ogni frase del discorso diventa
  1-3 righe di parole GIGANTI DIETRO di lei (si generano da sole dai sottotitoli: maiuscole bianche, parole chiave colorate
  in rilievo 3D, una riga in serif corsivo) e la parola detta compare piccola sul petto. Tu decidi: "evidenzia" (le parole
  chiave, 8-14), "adesivi" (3-5 icone che esplodono dietro di lei sulle parole forti: cuore, like, fuoco, stella, soldi,
  razzo, check, instagram, ai), "grafiche" poche e mirate: card/titolo/lista = scheda di vetro che fluttua di lato per
  2-3 s (max 5 in tutto), numero con "pieno": true = capitolo a tutto schermo col numero enorme (per i video a lista),
  "effetti": ["coriandoli"] sul gancio o sul finale; "palette" (l'accento colora capitoli e anelli) e "font_split.titoli"
  (serif). Niente terminale, sito, chat, barre in questo formato. Durata 30-70 s.
Se il girato non si presta al formato (es. talking_head senza parlato), usa "montaggio".`;

export const MANUALE_MODELLO = `REEL MODELLO DI JOHNNY (regola che vince su tutte le altre)
- I riferimenti "scelto_da_johnny" sono il MODELLO dello stile che Johnny vuole: replica il loro linguaggio, non la
  media degli altri riferimenti. Copia struttura e grammatica (look, ritmo, tipo di tagli, uso o NON uso dei testi,
  transizioni, finale), non i contenuti.
- Testi a schermo: se il modello non ha testi in sovraimpressione, il reel NON ha testi (segmenti con "testo": null,
  "chiusura": null, niente sottotitoli). Zero testi è una scelta valida e spesso la più premium: il racconto lo fanno
  le immagini. La copertina può avere un titolo, il video no.
- Stile cinematografico (il caso tipico dei modelli di Johnny): luce calda e bassa, profondità di campo ridotta,
  dettagli di mani e gesti, prodotto in macro. Tagli secchi sull'azione (match cut: il gesto inizia in un'inquadratura
  e continua nella successiva), un'inquadratura ogni 1,5-2,5 s, rallenty solo dove c'è un gesto da gustare (gocce, chicchi
  che cadono), niente zoom finti, niente grana pesante né vignette se il modello non le ha, look "moody_caldo" o
  "caldo_cinematico", finale con l'ultima immagine che scende al nero ("finale": "nero").
- Racconto: dalla materia prima al gesto finale (es. chicco → tostatura → mani → estrazione → servizio → assaggio),
  con un momento umano (persona di spalle, mani, sorriso) e una chiusura che lascia il desiderio.`;

export const MANUALE_SPOT = `STILE "SPOT DI PRODOTTO" (il riferimento preferito di Johnny per caffè, food e artigianato)
- È una sequenza di HERO SHOT: ogni inquadratura mostra UNA sola azione bella nel suo momento migliore (chicchi che
  cadono, il getto dell'estrazione, la goccia, la crema che gira, la mano che versa) e dura 1,5-2,5 s, tagliata sul tempo.
- Quasi tutto in RALLENTY (se il girato è a 50/60 fps è un rallenty vero): il movimento lento e fluido è la firma dello
  stile. Scegli tratti girati fermi o con movimenti lenti e regolari: scarta i tratti con scatti, strappi o
  correzioni di inquadratura (Ada li segnala nei problemi). Solo le inquadrature girate FERME (cavalletto) prendono un movimento di macchina morbido: "dolly_in" (avvicinamento) o "slider_dx"/"slider_sx"
  (carrello laterale). Mai punch_in, shake o zoom veloci.
- Racconto di processo, dal grezzo al risultato: materia prima → lavorazione → dettaglio tecnico → prodotto finito →
  gesto finale (es. chicchi → tostatura → macinatura → estrazione → tazza → mescolare/assaggiare).
- Inquadrature: macro e dettagli, sfondi scuri o sfocati, niente totali piatti con luce piatta; scarta clip sovraesposte,
  mosse o con persone che guardano in camera.
- Look "spot_contrasto" (neri profondi, colori naturali e ricchi). Nessun testo durante il video; tagli secchi (al massimo
  una dissolvenza verso la fine); finale al nero ("finale": "nero").`;

export const MANUALE_COPIONI = `COME SCRIVO UN COPIONE DI REEL DA GIRARE (Nora)
FORMATO "TALKING HEAD EDUCATIVO CON GRAFICHE" (quando Johnny lo chiede o per il suo profilo personale):
- Set: busto seduto a una scrivania, camera fissa all'altezza degli occhi, luci colorate (gel magenta da un lato, blu
  dall'altro) su sfondo scuro materico, un oggetto brandizzato in campo (tazza), microfono a clip. Si gira in un'unica presa
  lunga: le pause e gli errori li toglie il montaggio.
- Testo (60-95 s): GANCIO nei primi 2 s con una promessa o un fatto sorprendente ("questo video l'ha montato…"), contesto
  in una frase, 3 PUNTI NUMERATI ("punto numero 1…"), un momento di onestà sui limiti ("cosa NON si può fare"), CTA finale.
  Frasi brevi da dire a tempo di parlato, niente frasi da leggere.
- Per ogni copione elenca: i CARTELLI (parole chiave da mostrare grandi e su quale parola), gli SCREENSHOT/FOTO da preparare
  (prima/dopo, schermate degli strumenti) e i 3 punti per il pannello a elenco.
FORMATO "AVATAR" (profilo Instagram di Johnny, video generati con il suo avatar HeyGen, stessa grafica del talking head):
- Scrivi SOLO il testo che dice l'avatar, in prima persona, italiano parlato, 120-180 parole (45-75 s), frasi brevi.
- Struttura GANCIO → PROBLEMA → TENSIONE → SOLUZIONE → CTA, tenendo lo spettatore sulle spine fino alla fine:
  GANCIO (prime 2-3 s): apre una domanda o una promessa che si chiude solo alla fine ("c'è un motivo se i tuoi reel non
  li guarda nessuno, e non è quello che pensi"). PROBLEMA: concreto, in cui chi guarda si riconosce. TENSIONE: 2-3
  "anelli aperti" uno dopo l'altro (sveli un pezzo e ne apri un altro: "ma prima devi sapere una cosa…", "e qui sbagliano
  tutti…"), mai la risposta prima del finale. SOLUZIONE: solo negli ultimi 10-15 s, chiara e pratica. CTA breve.
- Niente elenchi letti, niente emoji, niente parole difficili da pronunciare; numeri scritti in lettere.
- Elenca 4-8 CARTELLI (1-4 parole chiave e la parola su cui entrano), uno con stile "barrato" per l'errore comune.

- Un reel = UNA idea. Si capisce in 2 secondi e regge in una frase. Durata 15-35 s (fino a 45 solo per storie e tutorial).
- GANCIO nei primi 1-2 s: un'immagine che sorprende o una tensione (risultato prima del processo, dettaglio estremo,
  domanda, contrasto, errore comune, numero concreto). Mai loghi, saluti o presentazioni all'inizio.
- Struttura: gancio → sviluppo (2-4 passaggi, ognuno un'immagine nuova) → picco (il momento più bello) → chiusura che
  invita a salvare, condividere o scrivere. Un cambio visivo ogni 1,5-3 s.
- Ogni scena è una ripresa precisa: tipo di inquadratura, soggetto e azione, camera (cavalletto, gimbal, a mano),
  angolo, luce, secondi da girare (sempre il doppio del montato), 50 fps se va in rallenty. Alterna i piani:
  dettaglio → medio → totale, mai due inquadrature uguali di fila.
- Dettagli e mani vendono più dei totali: prodotto in macro, gesti dell'artigiano, materia prima, vapore, texture.
- Le persone: almeno un momento umano per reel (sguardo, sorriso, mani al lavoro). In talking head: battute brevi,
  una frase per inquadratura, la frase più forte per prima.
- Testi a schermo: massimo 7 parole, solo se aggiungono qualcosa che l'immagine non dice. Se lo stile è cinematografico,
  niente testi nel video.
- Formati che funzionano: processo dal grezzo al finito, prima/dopo, dietro le quinte, "3 cose che non sai su…",
  errore comune + soluzione, POV del cliente, giornata tipo, prodotto protagonista in macro, mini intervista al titolare,
  tutorial a passi, risposta a una domanda frequente, trend adattato al cliente (solo se coerente col brand).
- Pensa al set: lista delle riprese spuntabile, B-roll di scorta (ambiente, insegna, dettagli, persone di spalle),
  oggetti e persone da preparare, orario con la luce migliore. Musica sempre da libreria con licenza.
- Nessuna promessa falsa, nessun prezzo o dato inventato: usa solo quello che Johnny ha scritto negli argomenti.`;

// Regole ricavate fotogramma per fotogramma dal reel di esempio mandato da Johnny ("Casa smart?", 16 s, persona nel riquadro).
export const MANUALE_BOX = `STILE BOX (il reel di esempio scelto da Johnny: vince su ogni altra regola di stile)
Formato "split_grafico" con "riquadro": "box". Lo schermo: sfondo chiaro, in alto UNA grafica alla volta, sotto la pillola
dei sottotitoli, in basso la persona in un riquadro. Il montatore fa da solo riquadro, sfondo, sottotitoli e tracker.
Tu decidi SOLO i tratti di parlato e le "grafiche". Regole:
1. GANCIO (primi 2-3 s): la prima grafica è un "titolo" di 2-3 parole che dice il tema (es. "Casa smart?") con un
   sottotitolo di max 5 parole. Entra sulla PRIMA parola detta.
2. UNA IDEA PER GRAFICA: ogni passaggio del discorso ha una grafica sola, che resta 2,5-5 s. In 60 s: 10-14 grafiche, mai di più.
3. TITOLI CORTI: titolo max 3 parole (max 18 caratteri), sottotitolo max 5 parole. Mai frasi intere: la frase la dice la voce.
4. TIPI AMMESSI: titolo, numero, lista (max 3 voci di 1-2 parole), card, confronto, barre, contatore, riepilogo.
   Vietati: sito, terminale, chat, oggetto. Niente "effetti": la grafica è pulita.
5. PASSAGGI: se il discorso ha 3-5 punti, metti il "tracker" con le voci (etichette di 1 parola) e apri ogni punto con un
   "titolo" o "numero" col nome del punto.
6. "pieno": true solo per 1-2 momenti chiave (un numero forte, la chiusura). Mai sul gancio.
7. CHIUSURA: l'ultima grafica è la chiamata all'azione (cosa fare adesso), "pieno": true, max 4 parole + una riga piccola.
8. PALETTE: fondo chiarissimo (#F7F5EF o simile), inchiostro quasi nero, UN accento vivo scelto per l'argomento, secondario = accento tenue.
   font_split.titoli: "Manrope" o "Space Grotesk" (sans grassetto), mai serif.
9. Solo parole e fatti detti nel video. Italiano corretto, niente maiuscole urlate.

COME COMPILI IL PIANO (obbligatorio)
- "formato": "split_grafico", "riquadro": "box".
- "segmenti": TUTTO il parlato della clip, in ordine, senza tagliare frasi né cambiare l'ordine (è un copione già scritto):
  un segmento per frase o gruppo di frasi, "in" e "durata" sui tempi della trascrizione. Togli solo pause e ripetizioni.
- "grafiche": OBBLIGATORIE, 10-14 per 60 s (mai meno di 1 ogni 6 s). Ognuna: {"tipo", "sulla_parola": la parola DETTA
  (scritta come nella trascrizione) su cui entra, in ordine di tempo, "pieno": bool, "dati": {...}}.
  dati per tipo → titolo: {"testo": "2-3 parole", "sotto": "max 5 parole"} · numero: {"valore": "1-3 caratteri", "etichetta"} ·
  lista: {"titolo", "voci": ["..."]} · card: {"titolo", "testo", "icona": "ph:nome-bold", "etichetta"} ·
  confronto: {"prima": {"titolo", "voci": []}, "dopo": {"titolo", "voci": []}} · barre: {"titolo", "unita", "voci": [{"etichetta", "valore"}]} ·
  contatore: {"da", "a", "etichetta", "prefisso", "suffisso"}.
- "tracker", "palette", "font_split", "evidenzia" (4-8 parole chiave da colorare nei sottotitoli), "copertina", "caption".
- Non compilare: titoli, cartelli, schede, broll, pannello, elementi, adesivi, transizioni, musica.`;
