var w=()=>new Date().toISOString(),E=(a,i=null)=>{try{return a==null?i:JSON.parse(a)}catch{return i}},T=async(a,i,...t)=>(await a.DB.prepare(i).bind(...t).all()).results||[],x=(a,i,...t)=>a.DB.prepare(i).bind(...t).first(),b=(a,i,...t)=>a.DB.prepare(i).bind(...t).run(),M=!1;async function k(a){M||(await a.DB.batch([a.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),a.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),a.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),a.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),a.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]),M=!0)}async function m(a,i,t,o,e="info"){await b(a,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",i,t,String(o).slice(0,600),e,w())}var y=["ANTHROPIC_API_KEY","GEMINI_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],R=["CLAUDE_MODEL","GEMINI_MODELS","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA","FPS_ANALISI"];async function S(a){let i=Object.fromEntries((await T(a,"SELECT chiave, valore FROM impostazioni")).map(o=>[o.chiave,o.valore])),t=(o,e)=>a[o]||i[o]||e;return{ANTHROPIC_API_KEY:t("ANTHROPIC_API_KEY"),GEMINI_API_KEY:t("GEMINI_API_KEY"),YOUTUBE_API_KEY:t("YOUTUBE_API_KEY"),APIFY_TOKEN:t("APIFY_TOKEN"),CLAUDE_MODEL:t("CLAUDE_MODEL","claude-sonnet-5-5"),GEMINI_MODELS:String(t("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(o=>o.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:t("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:t("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(t("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(t("DURATA_MAX",90)),MESI_RICERCA:Number(t("MESI_RICERCA",18)),FPS_ANALISI:Number(t("FPS_ANALISI",4)),_salvate:i,_env:Object.fromEntries(y.map(o=>[o,!!a[o]]))}}var da={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},pa={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},ua={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},ma=["alto","centro","terzo_inferiore"],fa=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function N(){let a=["LOOK COLORE:"];for(let[i,t]of Object.entries(da))a.push(`- ${i}: ${t}`);a.push(`
EFFETTI E TRANSIZIONI:`);for(let[i,t]of Object.entries(pa))a.push(`- ${i}: ${t}`);a.push(`
STILI TESTO:`);for(let[i,t]of Object.entries(ua))a.push(`- ${i}: ${t}`);return a.push(`
POSIZIONI TESTO: ${ma.join(", ")}`),a.push(`MOOD MUSICA: ${fa.join(", ")}`),a.join(`
`)}var C=a=>new Promise(i=>setTimeout(i,a));function L(a){if(a&&typeof a=="object")return a;let i=String(a||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(i)}catch{}for(let[t,o]of[["{","}"],["[","]"]]){let e=i.indexOf(t),n=i.lastIndexOf(o);if(e!==-1&&n>e)try{return JSON.parse(i.slice(e,n+1))}catch{}}throw new Error("risposta non in JSON: "+i.slice(0,300))}async function I(a,i={},t=4){let o;for(let e=0;e<t;e++)try{let n=await fetch(a,i);if([429,500,502,503,504,529].includes(n.status)){o=new Error(`HTTP ${n.status}: ${(await n.text()).slice(0,300)}`),await C(4e3*(e+1)*(n.status===429?3:1));continue}return n}catch(n){if(o=n,i.body&&typeof i.body!="string")break;await C(3e3*(e+1))}throw new Error(`richiesta fallita (${String(a).split("?")[0]}): ${o?.message||o}`)}async function P(a,i,t,{maxTokens:o=8e3,json:e=!0}={}){if(!a.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let n=await I("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":a.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:a.CLAUDE_MODEL,max_tokens:o,system:i,messages:[{role:"user",content:t}]})});if(n.status!==200)throw new Error(`Claude ${n.status}: ${(await n.text()).slice(0,400)}`);let r=((await n.json()).content||[]).filter(s=>s.type==="text").map(s=>s.text).join("");return e?L(r):r}var z="https://generativelanguage.googleapis.com";async function U(a,i){if(!a.GEMINI_API_KEY)throw new Error("manca la chiave Gemini (Impostazioni)");let t=JSON.stringify({contents:[{role:"user",parts:i}],generationConfig:{responseMimeType:"application/json",temperature:.2}}),o=[];for(let e of a.GEMINI_MODELS){let n=await I(`${z}/v1beta/models/${e}:generateContent?key=${a.GEMINI_API_KEY}`,{method:"POST",headers:{"content-type":"application/json"},body:t}),l=await n.text();if(n.status===200){let s=(JSON.parse(l).candidates?.[0]?.content?.parts||[]).map(c=>c.text||"").join("");if(!s)throw new Error("Gemini senza risposta: "+l.slice(0,300));return L(s)}if((n.status===404||n.status===400)&&/not found|not supported|is not available/i.test(l)){o.push(e);continue}throw new Error(`Gemini ${n.status} (${e}): ${l.slice(0,400)}`)}throw new Error("nessun modello Gemini disponibile tra: "+o.join(", "))}function j(a,i,t,o){return U(a,[{fileData:{fileUri:i},videoMetadata:{fps:o||a.FPS_ANALISI}},{text:t}])}async function ga(a,i,t,o={}){let e=await I(i,{headers:{"user-agent":"Mozilla/5.0",...o}});if(!e.ok)throw new Error(`download non riuscito (HTTP ${e.status}): link scaduto o non pubblico`);let n=(e.headers.get("content-type")||"").split(";")[0];n.startsWith("video/")||(n="video/mp4");let l=Number(e.headers.get("content-length")||0),r;if(l>0){let{readable:h,writable:p}=new FixedLengthStream(l);e.body.pipeTo(p).catch(()=>{}),r=h}else{let h=await e.arrayBuffer();if(h.byteLength>95*1024*1024)throw new Error("video senza dimensione dichiarata e troppo grande");l=h.byteLength,r=h}if(l>1900*1024*1024)throw new Error("video oltre 1,9 GB: troppo grande per Gemini");let s=await I(`${z}/upload/v1beta/files?key=${a.GEMINI_API_KEY}`,{method:"POST",headers:{"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":String(l),"X-Goog-Upload-Header-Content-Type":n,"content-type":"application/json"},body:JSON.stringify({file:{display_name:String(t).slice(0,120)}})}),c=s.headers.get("x-goog-upload-url");if(!c)throw new Error(`upload Gemini non avviato (${s.status}): ${(await s.text()).slice(0,200)}`);let u=(await(await I(c,{method:"POST",headers:{"Content-Length":String(l),"X-Goog-Upload-Offset":"0","X-Goog-Upload-Command":"upload, finalize"},body:r},1)).json()).file;if(!u?.name)throw new Error("upload Gemini fallito");for(let h=0;h<90;h++){if(u.state==="ACTIVE")return{uri:u.uri,mime:n};if(u.state==="FAILED")throw new Error("Gemini non \xE8 riuscito a leggere il video");await C(5e3),u=await(await I(`${z}/v1beta/${u.name}?key=${a.GEMINI_API_KEY}`)).json()}throw new Error("Gemini: tempo scaduto in elaborazione video")}async function $(a,i,t,o,e,n){let{uri:l,mime:r}=await ga(a,i,t,n);return U(a,[{fileData:{fileUri:l,mimeType:r},videoMetadata:{fps:e||a.FPS_ANALISI}},{text:o}])}var va=a=>{let i=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(a||"");return i?(+i[1]||0)*3600+(+i[2]||0)*60+(+i[3]||0):0};async function G(a,i,t=15){if(!a.YOUTUBE_API_KEY)return{video:[],nota:"YouTube saltato: manca la chiave"};let o=new Date(Date.now()-a.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),e=[];for(let n of i){let l=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:n,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:o,maxResults:t,key:a.YOUTUBE_API_KEY}).forEach(([s,c])=>l.searchParams.set(s,c));let r=await I(l.toString());if(r.status!==200)throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0,200)}`);e.push(...((await r.json()).items||[]).map(s=>s.id?.videoId).filter(Boolean))}return e=[...new Set(e)],{video:await Y(a,e,a.DURATA_MAX)}}async function Y(a,i,t=9999){let o=[];for(let e=0;e<i.length;e+=50){let n=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${i.slice(e,e+50).join(",")}&key=${a.YOUTUBE_API_KEY}`,l=await I(n);if(l.status===200)for(let r of(await l.json()).items||[]){let s=r.statistics||{},c=r.snippet||{},d=va(r.contentDetails?.duration);!d||d>t||o.push({piattaforma:"youtube",id:r.id,url:`https://www.youtube.com/watch?v=${r.id}`,video_url:null,titolo:c.title||"",autore:c.channelTitle||"",views:+s.viewCount||0,likes:+s.likeCount||0,commenti:+s.commentCount||0,condivisioni:0,durata:d,data:c.publishedAt||""})}}return o}async function O(a,i,t){let o=`https://api.apify.com/v2/acts/${i.replace("/","~")}/run-sync-get-dataset-items?token=${a.APIFY_TOKEN}&timeout=280`,e=await I(o,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(t)},2);if(e.status!==200&&e.status!==201)throw new Error(`Apify ${i} ${e.status}: ${(await e.text()).slice(0,200)}`);let n=await e.json();return Array.isArray(n)?n:[]}var g=(a,...i)=>{for(let t of i){let o=a;for(let e of t.split("."))o=o==null?void 0:Array.isArray(o)&&/^\d+$/.test(e)?o[+e]:o[e];if(o!=null&&o!==""&&!(Array.isArray(o)&&!o.length))return o}},A=a=>Math.round(Number(a)||0);function F(a){return{piattaforma:"tiktok",id:String(g(a,"id","video_id")||""),url:g(a,"webVideoUrl","url","detail_url")||"",video_url:g(a,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(g(a,"text","desc","ad_title")||"").slice(0,200),autore:g(a,"authorMeta.name","author","brand_name")||"",views:A(g(a,"playCount","views")),likes:A(g(a,"diggCount","likes")),commenti:A(g(a,"commentCount","comments")),condivisioni:A(g(a,"shareCount","shares")),durata:A(g(a,"videoMeta.duration","duration_sec","duration")),data:g(a,"createTimeISO")||""}}function H(a){return{piattaforma:"instagram",id:String(g(a,"shortCode","id")||""),url:g(a,"url","reelURL")||"",video_url:g(a,"videoUrl","video_url")||null,titolo:String(g(a,"caption")||"").slice(0,200),autore:g(a,"ownerUsername")||"",views:A(g(a,"videoPlayCount","videoViewCount","views")),likes:A(g(a,"likesCount","likes")),commenti:A(g(a,"commentsCount","comments")),condivisioni:0,durata:A(g(a,"videoDuration","duration")),data:g(a,"timestamp")||"",_video:!!g(a,"videoUrl")||/video|clips/i.test(String(g(a,"type","productType")||""))}}async function q(a,i,t,o=10){return a.APIFY_TOKEN?{video:(await O(a,a.APIFY_TIKTOK_ACTOR,{searchQueries:i,hashtags:t.map(n=>n.replace(/^#/,"")),searchSection:"/video",resultsPerPage:o,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(F).filter(n=>n.id&&(!n.durata||n.durata<=a.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function K(a,i,t=15){return a.APIFY_TOKEN?{video:(await O(a,a.APIFY_INSTAGRAM_ACTOR,{directUrls:i.map(e=>`https://www.instagram.com/explore/tags/${e.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:t,addParentData:!1})).map(H).filter(e=>e.id&&e._video&&(!e.durata||e.durata<=a.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function B(a,i){let t=[],o=[],e=[];for(let l of i){let r=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l);r?t.push(r[1]):/tiktok\.com/.test(l)?o.push(l):/instagram\.com/.test(l)&&e.push(l)}let n=[];return t.length&&(a.YOUTUBE_API_KEY?n.push(...await Y(a,t)):n.push(...t.map(l=>({piattaforma:"youtube",id:l,url:`https://www.youtube.com/watch?v=${l}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),o.length&&a.APIFY_TOKEN&&n.push(...(await O(a,a.APIFY_TIKTOK_ACTOR,{postURLs:o,shouldDownloadVideos:!0,resultsPerPage:1})).map(F)),e.length&&a.APIFY_TOKEN&&n.push(...(await O(a,a.APIFY_INSTAGRAM_ACTOR,{directUrls:e,resultsType:"posts",resultsLimit:1})).map(H)),n.map(l=>({...l,scelto_da_johnny:!0}))}function X(a){let i=Math.max(a.views||0,1),t=((a.likes||0)+2*(a.commenti||0)+3*(a.condivisioni||0))/i;return Math.round((Math.log10(i+1)+Math.min(t,.3)*10)*1e3)/1e3}var ha=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function ba(a){try{return new URL(a).searchParams.get("code")}catch{return null}}async function J(a,i,t){let o=ba(a);if(!o)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let e=/(^|\/\/)e\.|eapi/.test(a)?["eapi","api"]:["api","eapi"],n;for(let l of e){let r=new URL(`https://${l}.pcloud.com/${i}`);r.searchParams.set("code",o),Object.entries(t||{}).forEach(([c,d])=>r.searchParams.set(c,d));let s=await(await I(r.toString())).json();if(s.result===0)return s;n=s}throw new Error(`pCloud: ${n?.error||"errore "+n?.result}`)}async function W(a){let i=await J(a,"showpublink",{}),t=[],o=(e,n="")=>{e.isfolder?(e.contents||[]).forEach(l=>o(l,n?`${n}/${e.name}`:e.name)):(e.category===2||ha.test(e.name))&&t.push({fileid:e.fileid,nome:e.name,cartella:n,dimensione:e.size,hash:String(e.hash||e.fileid),tecnico:{durata_sec:e.duration?Number(e.duration):null,risoluzione:e.width?`${e.width}x${e.height}`:null,fps:e.fps?Number(e.fps):null,orientamento:e.width?e.height>e.width?"verticale":e.width>e.height?"orizzontale":"quadrato":null,rallenty_possibile:e.fps?Number(e.fps)>=48:null}})};return o(i.metadata),t}async function V(a,i){let t=await J(a,"getpublinkdownload",{fileid:i});return`https://${t.hosts[0]}${t.path}`}var Z=["piano","ricerca","riferimenti","clip","scheda","fatto"],_a=12,Q=9*6e4,wa=3,Ta=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.`,xa=a=>`RICHIESTA DI JOHNNY:
${a}

Prepara il piano di ricerca. Cerca i video che hanno FUNZIONATO nel settore: mescola ricerche italiane
e inglesi (le tecniche di montaggio migliori spesso arrivano da USA/UK). Hashtag specifici del settore,
mai generici tipo "reels" o "viral".
JSON:
{
  "settore": "settore in 2-4 parole",
  "obiettivo": "cosa deve ottenere il reel",
  "pubblico": "a chi parla",
  "youtube_query": ["3-4 ricerche"],
  "tiktok_query": ["2-3 ricerche"],
  "tiktok_hashtag": ["2-3 hashtag senza #"],
  "instagram_hashtag": ["3 hashtag senza #"]
}`,aa=a=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
\xC8 un riferimento per un reel del settore "${a}". Misura, non inventare: se un dato non \xE8 verificabile
scrivi null. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${N()}

Rispondi SOLO con JSON:
{
  "durata_sec": n,
  "gancio": {"fine_sec": n, "cosa_succede": "...", "tipo": "domanda|promessa|visivo_forte|curiosita|problema|altro", "testo_a_schermo": "testo esatto o null"},
  "numero_tagli": n,
  "durata_media_inquadratura_sec": n,
  "ritmo": "lento|medio|veloce|frenetico",
  "tagli_sul_beat": true/false,
  "struttura": [{"da": n, "a": n, "fase": "gancio|sviluppo|climax|chiusura", "cosa_succede": "..."}],
  "inquadrature_tipiche": ["..."],
  "movimenti_camera": ["..."],
  "testi": {"presenti": bool, "stile": "nome libreria", "posizione": "alto|centro|terzo_inferiore", "font": "bastoni/grazie/script, spessore, maiuscolo?", "colori": "...", "animazione": "...", "parole_per_schermata": n},
  "sottotitoli_parlato": {"presenti": bool, "stile": "nome libreria o null"},
  "colore": {"look": "nome libreria", "descrizione": "..."},
  "effetti": ["nomi libreria"],
  "effetti_extra": ["effetti non in libreria, descritti"],
  "transizioni": ["nomi libreria"],
  "audio": {"musica": bool, "mood": "nome libreria", "bpm_stimato": n|null, "voce": "nessuna|voiceover|parlato_in_camera|entrambi", "effetti_sonori": ["..."]},
  "chiusura": {"tipo": "cta|loop|logo|nessuna", "cosa_succede": "..."},
  "perche_funziona": "2-3 frasi concrete",
  "da_copiare": ["tecniche replicabili"],
  "da_evitare": ["cosa non funziona o \xE8 gi\xE0 visto"]
}`,Ia=a=>`Sei l'assistente al montaggio di un'agenzia video. Guarda e ascolta questa clip GREZZA
e descrivi cosa contiene per chi dovr\xE0 montare un reel verticale 9:16. Tempi precisi in secondi.
Non inventare: solo ci\xF2 che vedi e senti.

Contesto del lavoro: ${a}

Rispondi SOLO con JSON:
{
  "descrizione": "cosa c'\xE8 nella clip in una frase",
  "luogo_luce": "interno/esterno, tipo di luce",
  "momenti": [{"da": n, "a": n, "cosa_succede": "...", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro",
    "movimento_camera": "statico|panoramica|carrellata|gimbal|mano_libera|drone", "soggetti": ["..."],
    "qualita": 1-5, "uso_consigliato": "gancio|sviluppo|climax|chiusura|b_roll|scartare", "perche": "..."}],
  "problemi": [{"da": n, "a": n, "tipo": "mosso|fuori_fuoco|sovraesposto|sottoesposto|rumore_audio|altro", "nota": "..."}],
  "parlato": {"presente": bool, "lingua": "...", "trascrizione": [{"da": n, "a": n, "testo": "..."}]},
  "audio_ambiente": "suoni utili",
  "adatta_al_verticale": "si|serve_reframe|solo_con_sfondo_sfocato",
  "stima_fps_alti": "si|no|non_so"
}`,Aa=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`,Sa=(a,i,t,o)=>`RICHIESTA DI JOHNNY:
${a}

PIANO: ${JSON.stringify(i)}

LIBRERIA:
${N()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di pi\xF9):
${JSON.stringify(t)}

CLIP DISPONIBILI (analisi dell'Analista; pu\xF2 essere vuoto):
${JSON.stringify(o)}

Produci la scheda:
{
  "titolo_lavoro": "...",
  "concept": "l'idea in 2 frasi",
  "cosa_funziona_nel_settore": ["pattern comuni con dati, es. 'gancio entro 1,5 s in 6 video su 8'"],
  "durata_target_sec": n,
  "formato": "9:16",
  "struttura": [{"fase": "gancio|sviluppo|climax|chiusura", "da": n, "a": n, "obiettivo": "...", "contenuto": "..."}],
  "ritmo": {"durata_media_inquadratura_sec": n, "tagli_sul_beat": bool, "variazioni": "dove rallentare/accelerare"},
  "gancio": {"tipo": "...", "idea": "...", "testo_proposto": "..."},
  "colore": {"look": "nome libreria", "note": "..."},
  "testi": {"stile": "nome libreria", "posizione": "...", "font_suggerito": "font Google Fonts", "colori": "hex", "animazione": "...", "max_parole_per_schermata": n},
  "sottotitoli": {"usare": bool, "stile": "nome libreria"},
  "effetti": [{"nome": "nome libreria", "dove": "quando usarlo"}],
  "transizioni": ["nomi libreria"],
  "audio": {"mood": "nome libreria", "bpm": n, "musica_suggerita": "tipo di brano da cercare su IG/TikTok", "effetti_sonori": ["..."], "voce": "nessuna|voiceover|parlato_clip", "note_voce": "..."},
  "chiusura": {"tipo": "...", "cta": "..."},
  "caption": "bozza caption",
  "hashtag": ["..."],
  "riferimenti_chiave": [{"url": "...", "perche": "..."}],
  "clip_da_usare": [{"file": "...", "momento": "da-a sec", "per": "fase"}],
  "clip_mancanti": ["inquadrature che servirebbero e non ci sono"],
  "rischi": ["cosa pu\xF2 venire male e come evitarlo"]
}`;async function ia(a,i,t){let o=await x(a,"SELECT dati FROM cache_analisi WHERE chiave=?",i);if(o)return{dati:E(o.dati),daCache:!0};let e=await t();return await b(a,"INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)",i,JSON.stringify(e),w()),{dati:e,daCache:!1}}async function ya(a,i,t){await m(a,t.id,"direttore","leggo la richiesta e preparo la ricerca");let o=await P(i,Ta,xa(t.prompt),{maxTokens:1500});await b(a,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(o),t.id),await m(a,t.id,"direttore",`settore: ${o.settore} \xB7 obiettivo: ${o.obiettivo||"-"}`)}async function Oa(a,i,t){let o=E(t.piano,{}),e=["YouTube","TikTok","Instagram","Link tuoi"],n=["scout_yt","scout_tt","scout_ig","direttore"];await m(a,t.id,"scout_yt",`cerco Shorts: ${(o.youtube_query||[]).join(" \xB7 ")}`),await m(a,t.id,"scout_tt",`cerco su TikTok: ${[...o.tiktok_query||[],...(o.tiktok_hashtag||[]).map(p=>"#"+p)].join(" \xB7 ")}`),await m(a,t.id,"scout_ig",`cerco reel: ${(o.instagram_hashtag||[]).map(p=>"#"+p).join(" \xB7 ")}`);let l=await Promise.allSettled([G(i,o.youtube_query||[]),q(i,o.tiktok_query||[],o.tiktok_hashtag||[]),K(i,o.instagram_hashtag||[]),B(i,E(t.link_rif,[]))]),r={};for(let p=0;p<4;p++){let f=l[p];if(f.status==="rejected"){await m(a,t.id,n[p],`${e[p]}: ${f.reason?.message||f.reason}`,"warn"),r[e[p]]=[];continue}let _=Array.isArray(f.value)?f.value:f.value.video;f.value.nota&&await m(a,t.id,n[p],f.value.nota,"warn"),r[e[p]]=_,(p<3||_.length)&&await m(a,t.id,n[p],p<3?`trovati ${_.length} video`:`i tuoi link: ${_.length} video`)}let s=[...r["Link tuoi"]],c=["YouTube","TikTok","Instagram"].filter(p=>r[p].length),d=c.length?Math.max(1,Math.floor(Math.max(i.NUM_RIFERIMENTI-s.length,c.length)/c.length)):0;for(let p of c){let f=new Set;s.push(...r[p].map(_=>({..._,punteggio:X(_)})).sort((_,ca)=>ca.punteggio-_.punteggio).filter(_=>!f.has(_.id)&&f.add(_.id)).slice(0,d))}let u=new Set;if(s.splice(0,s.length,...s.filter(p=>{let f=`${p.piattaforma}:${p.id}`;return!u.has(f)&&u.add(f)})),!s.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let h=s.map(p=>({video:p,stato:"da_guardare"}));await b(a,"UPDATE lavori SET candidati=?, riferimenti=? WHERE id=?",JSON.stringify(r),JSON.stringify(h),t.id),await m(a,t.id,"direttore",`scelgo ${h.length} video da far guardare a Gemini`)}async function ka(a,i,t,o){let e=o.video,n=E(t.piano,{}).settore||"";await x(a,"SELECT 1 FROM cache_analisi WHERE chiave=?",`rif:${e.piattaforma}:${e.id}`)||await m(a,t.id,"occhi",`sto guardando ${e.piattaforma} \xB7 ${(e.titolo||e.url).slice(0,60)} (${(e.views||0).toLocaleString("it-IT")} views)`);let{dati:l,daCache:r}=await ia(a,`rif:${e.piattaforma}:${e.id}`,async()=>{if(e.piattaforma==="youtube")return j(i,e.url,aa(n));if(!e.video_url)throw new Error("nessun file video scaricabile");let s=e.video_url.includes("api.apify.com")?{authorization:`Bearer ${i.APIFY_TOKEN}`}:{};return $(i,e.video_url,`${e.piattaforma}_${e.id}`,aa(n),null,s)});return await m(a,t.id,"occhi",`${r?"gi\xE0 visto":"guardato"}: ${e.piattaforma} \xB7 ${(e.titolo||e.url).slice(0,60)}`),l}async function Ra(a,i,t,o){let e=E(t.riferimenti,[]);for(;Date.now()<o;){let n=e.filter(r=>r.stato==="da_guardare").slice(0,wa);if(!n.length)break;let l=await Promise.allSettled(n.map(r=>ka(a,i,t,r)));l.forEach((r,s)=>{r.status==="fulfilled"?Object.assign(n[s],{stato:"fatto",analisi:r.value}):Object.assign(n[s],{stato:"saltato",errore:String(r.reason?.message||r.reason).slice(0,300)})});for(let[r,s]of l.entries())s.status==="rejected"&&await m(a,t.id,"occhi",`saltato ${n[r].video.piattaforma} ${n[r].video.id}: ${n[r].errore}`,"warn");await b(a,"UPDATE lavori SET riferimenti=? WHERE id=?",JSON.stringify(e),t.id)}if(e.some(n=>n.stato==="da_guardare"))return!1;if(!e.some(n=>n.stato==="fatto")){let n=e.find(l=>/manca la chiave/.test(l.errore||""));throw new Error(n?n.errore:"Gemini non \xE8 riuscito a guardare nessun riferimento")}return!0}async function Na(a,i,t,o){if(!t.pcloud)return await m(a,t.id,"analista","nessuna cartella pCloud: lavoro solo sui riferimenti"),!0;let e=E(t.clip,null);if(!e){let n=await W(t.pcloud);if(!n.length)throw new Error("nella cartella pCloud non ci sono video");e=n.map(l=>({...l,stato:"da_guardare"})),await b(a,"UPDATE lavori SET clip=? WHERE id=?",JSON.stringify(e),t.id),await m(a,t.id,"analista",`${e.length} clip trovate su pCloud`)}for(;Date.now()<o;){let n=e.filter(r=>r.stato==="da_guardare").slice(0,2);if(!n.length)break;(await Promise.allSettled(n.map(async r=>{let{dati:s,daCache:c}=await ia(a,`clip:${r.hash}:${r.dimensione}`,async()=>{await m(a,t.id,"analista",`sto guardando ${r.nome} (${Math.round((r.dimensione||0)/1048576)} MB${r.tecnico?.fps?", "+r.tecnico.fps+" fps":""})`);let d=await V(t.pcloud,r.fileid);return $(i,d,r.nome,Ia(t.prompt),2)});return await m(a,t.id,"analista",`${c?"gi\xE0 vista":"guardata"}: ${r.nome}`),s}))).forEach((r,s)=>{r.status==="fulfilled"?Object.assign(n[s],{stato:"fatto",analisi:r.value}):Object.assign(n[s],{stato:"saltato",errore:String(r.reason?.message||r.reason).slice(0,300)})});for(let r of n)r.stato==="saltato"&&await m(a,t.id,"analista",`saltata ${r.nome}: ${r.errore}`,"warn");await b(a,"UPDATE lavori SET clip=? WHERE id=?",JSON.stringify(e),t.id)}return!e.some(n=>n.stato==="da_guardare")}async function Ca(a,i,t){await m(a,t.id,"direttore","incrocio riferimenti e clip, scrivo la scheda tecnica");let o=E(t.riferimenti,[]).filter(l=>l.stato==="fatto").map(l=>({piattaforma:l.video.piattaforma,url:l.video.url,views:l.video.views,likes:l.video.likes,scelto_da_johnny:!!l.video.scelto_da_johnny,analisi:l.analisi})),e=(E(t.clip,[])||[]).filter(l=>l.stato==="fatto").map(l=>({file:l.nome,tecnico:l.tecnico,...l.analisi})),n=await P(i,Aa,Sa(t.prompt,E(t.piano,{}),o,e),{maxTokens:8e3});await b(a,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(n),t.id),await m(a,t.id,"direttore",`scheda pronta: ${n.titolo_lavoro||""}`)}async function za(a,i,t,o){for(;Date.now()<o;){t=await x(a,"SELECT * FROM lavori WHERE id=?",t.id);let e=!0;if(t.fase==="piano"?await ya(a,i,t):t.fase==="ricerca"?await Oa(a,i,t):t.fase==="riferimenti"?e=await Ra(a,i,t,o):t.fase==="clip"?e=await Na(a,i,t,o):t.fase==="scheda"&&await Ca(a,i,t),!e)return;let n=Z[Z.indexOf(t.fase)+1];if(await b(a,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",n,n==="fatto"?"pronto":"in_corso",w(),t.id),n==="fatto"){await m(a,t.id,"regia","\u2705 lavoro pronto: apri la scheda");return}}}async function ta(a){let i=Date.now(),t=await S(a),o=w(),e=new Date(Date.now()+_a*6e4).toISOString();for(let n=0;n<5&&Date.now()-i<Q-6e4;n++){let l=await T(a,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,e,o,o);if(!l.length)return;let r=l[0];try{await za(a,t,r,i+Q),await b(a,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",r.id)}catch(s){let c=String(s?.message||s).slice(0,500),d=r.tentativi>=3||/manca la chiave/.test(c),u=new Date(Date.now()+2*6e4).toISOString();await b(a,"UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?",d?"errore":"in_corso",c,d?null:u,w(),r.id);let h=(await x(a,"SELECT fase FROM lavori WHERE id=?",r.id))?.fase||r.fase;await m(a,r.id,"regia",`${d?"\u274C fermo":"\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${h}): ${c}`,d?"errore":"warn")}}}var ea=`<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1113">
<title>Momento Reel \xB7 Regia</title>
<style>
:root{--teal:#12a3a4;--teal2:#3fd0c9;--bg:#0b1113;--card:#141c1f;--line:#223035;--txt:#e8eef0;--mut:#8fa3a8;--warn:#f0b44c;--err:#ef6b6b;--ok:#4fd18b}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--txt);font-size:15px}
header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(11,17,19,.95);backdrop-filter:blur(8px);z-index:5}
.logo{font-weight:700;font-size:20px;color:var(--teal2);letter-spacing:-.5px}.logo small{color:var(--mut);font-weight:400;font-size:13px;margin-left:6px}
header nav{margin-left:auto;display:flex;gap:6px}
main{max-width:980px;margin:auto;padding:18px}
a{color:var(--teal2)}h2{margin:26px 0 10px;font-size:17px;color:var(--teal2)}h1{font-size:21px;margin:6px 0 4px}
button,.btn{background:var(--teal);color:#fff;border:0;border-radius:10px;padding:10px 16px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
button.sec,.btn.sec{background:transparent;border:1px solid var(--line);color:var(--txt)}button.rosso{background:transparent;border:1px solid #5a2a2a;color:var(--err)}
button:disabled{opacity:.5}
input,textarea,select{width:100%;background:#0f1619;border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:11px 12px;font:inherit}
textarea{min-height:110px;resize:vertical}label{display:block;margin:16px 0 6px;font-weight:600}.aiuto{color:var(--mut);font-size:13px;margin-top:5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:10px 0}
.lav{display:block;color:inherit;text-decoration:none}.lav:hover{border-color:var(--teal)}
.mut{color:var(--mut);font-size:13px}.riga{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.pill{font-size:12px;padding:3px 9px;border-radius:20px;background:#1d2a2e;color:var(--mut);white-space:nowrap}
.pill.pronto{background:#123526;color:var(--ok)}.pill.in_corso{background:#10323a;color:var(--teal2)}.pill.errore{background:#3a1717;color:var(--err)}
.fasi{display:flex;gap:4px;margin:14px 0}.fasi div{flex:1;height:6px;border-radius:4px;background:var(--line)}.fasi .ok{background:var(--teal)}.fasi .ora{background:var(--teal2);animation:p 1.2s infinite}
@keyframes p{50%{opacity:.4}}
.fasinomi{display:flex;gap:4px;font-size:11px;color:var(--mut)}.fasinomi span{flex:1;text-align:center}
.log{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;max-height:320px;overflow:auto;background:#0f1619;border-radius:10px;padding:10px}
.log div{padding:3px 0;border-bottom:1px solid #18242a}.log .warn{color:var(--warn)}.log .errore{color:var(--err)}.log b{color:var(--teal2);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.tag{font-size:11px;text-transform:uppercase;padding:2px 8px;border-radius:6px;font-weight:700}
.youtube{background:#c4302b}.tiktok{background:#111;border:1px solid #25f4ee}.instagram{background:#c13584}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:top;font-size:14px}th{color:var(--mut);font-weight:500}
ul{margin:6px 0;padding-left:20px}li{margin:3px 0}
.kv{display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:14px}.kv b{color:var(--mut);font-weight:500}
.vuoto{text-align:center;padding:40px 10px;color:var(--mut)}
.err{color:var(--err);margin-top:10px}
.studio{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:12px}
.stanza{background:linear-gradient(180deg,#121b1e,#0f1619);border:1px solid var(--line);border-radius:18px;padding:12px 12px 6px;position:relative}
.stanza h3{margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);font-weight:600}
.stanza.spenta{opacity:.5;grid-column:1/-1}.posti{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:2px}.posti .scrivania{padding:6px;margin:0}.posti .av{width:40px;height:40px;font-size:19px}.stanza.spenta h3:after{content:' \xB7 arriva con la fase 2';text-transform:none;letter-spacing:0}
.scrivania{display:flex;gap:12px;align-items:flex-start;padding:10px;border-radius:14px;cursor:pointer;margin-bottom:6px;transition:background .2s}
.scrivania:hover{background:#18252a}
.av{width:52px;height:52px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:26px;background:#1a272b;border:3px solid var(--c,#345);position:relative}
.av:after{content:'';position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:50%;background:#46555a;border:2px solid var(--card)}
.lavora .av{animation:bob 1.4s ease-in-out infinite;box-shadow:0 0 0 0 var(--c);animation:bob 1.4s ease-in-out infinite,alone 1.8s infinite}
.lavora .av:after{background:var(--ok)}.coda .av:after{background:var(--warn)}.errore .av:after{background:var(--err)}
@keyframes bob{50%{transform:translateY(-3px)}}@keyframes alone{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--c) 60%,transparent)}100%{box-shadow:0 0 0 14px transparent}}
.chi{flex:1;min-width:0}.chi b{font-size:15px}.chi .ruolo{color:var(--mut);font-size:12px}
.schermo{margin-top:7px;background:#071012;border:1px solid #1d3036;border-radius:8px;padding:7px 9px;font:12.5px/1.35 ui-monospace,Menlo,monospace;color:#9fd9d4;min-height:34px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.lavora .schermo{border-color:color-mix(in srgb,var(--c) 60%,#1d3036);box-shadow:0 0 18px -6px var(--c)}
.lavora .schermo:after{content:'\u258B';animation:cur 1s steps(1) infinite;margin-left:2px}@keyframes cur{50%{opacity:0}}
.stato-ag{font-size:11px;font-weight:600;margin-left:6px;color:var(--mut)}.lavora .stato-ag{color:var(--ok)}.coda .stato-ag{color:var(--warn)}.errore .stato-ag{color:var(--err)}
.attivo{display:block;text-decoration:none;color:inherit}
.pannello{position:fixed;inset:auto 0 0 0;max-height:78vh;background:#101719;border-top:1px solid var(--teal);border-radius:18px 18px 0 0;padding:16px 18px 24px;overflow:auto;z-index:20;box-shadow:0 -20px 60px #000a;max-width:760px;margin:auto}
.velo{position:fixed;inset:0;background:#0008;z-index:19}
@media(max-width:600px){header{padding:10px 12px}.logo small{display:none}header nav .btn{padding:8px 10px;font-size:14px;white-space:nowrap}.posti{grid-template-columns:1fr 1fr}main{padding:12px}.kv{grid-template-columns:1fr}.kv b{margin-top:6px}}
</style></head><body>
<header><div class="logo">momento<small>reel \xB7 regia</small></div><nav id="nav"></nav></header>
<main id="app"><div class="vuoto">Carico\u2026</div></main>
<script>
const $ = (s) => document.querySelector(s);
const e = (s) => String(s ?? '\u2014').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (x) => (Number(x) || 0).toLocaleString('it-IT');
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Gemini guarda'],['clip','Analista'],['scheda','Scheda'],['fatto','Pronto']];
let timer = null;

const AGENTI = {
  direttore: { n: 'Leo', r: 'Direttore creativo', i: '\u{1F3AC}', c: '#12a3a4', s: 'direzione', d: 'Legge il tuo prompt, capisce settore, obiettivo e pubblico, decide cosa cercare. Alla fine incrocia riferimenti e clip e scrive la scheda tecnica per tutta la squadra.' },
  scout_yt: { n: 'Yuri', r: 'Scout YouTube Shorts', i: '\u25B6\uFE0F', c: '#e5483f', s: 'scouting', d: 'Cerca gli Shorts del settore pubblicati negli ultimi 18 mesi e li ordina per visualizzazioni e coinvolgimento (like, commenti).' },
  scout_tt: { n: 'Tea', r: 'Scout TikTok', i: '\u{1F3B5}', c: '#25d6ee', s: 'scouting', d: 'Cerca su TikTok per parole chiave e hashtag del settore (via Apify) e recupera il video per farlo guardare a Gemma.' },
  scout_ig: { n: 'Ines', r: 'Scout Instagram', i: '\u{1F4F8}', c: '#d6409f', s: 'scouting', d: 'Cerca i reel pi\xF9 visti sugli hashtag del settore (via Apify) e recupera il video per farlo guardare a Gemma.' },
  occhi: { n: 'Gemma', r: 'Occhi \xB7 guarda i reel', i: '\u{1F441}\uFE0F', c: '#8b7cf6', s: 'visione', d: 'Gemini: guarda e ascolta i reel scelti e li smonta: gancio, numero di tagli, durata delle inquadrature, testi, colore, effetti, musica e BPM, chiusura.' },
  analista: { n: 'Ada', r: 'Analista delle tue clip', i: '\u{1F50E}', c: '#f0b44c', s: 'visione', d: 'Gemini: guarda le tue clip grezze da pCloud e segna i momenti utili con i tempi, la qualit\xE0, i problemi (mosso, fuori fuoco) e il parlato.' },
  regista: { n: 'Regista', r: 'struttura scena per scena', i: '\u{1F3A5}', s: 'post' }, copy: { n: 'Copy', r: 'gancio, testi, caption', i: '\u270D\uFE0F', s: 'post' },
  editor: { n: 'Editor', r: 'timeline e tagli sul beat', i: '\u2702\uFE0F', s: 'post' }, vfx: { n: 'VFX', r: 'effetti e grafiche', i: '\u2728', s: 'post' },
  color: { n: 'Colorist', r: 'look e LUT', i: '\u{1F3A8}', s: 'post' }, audio: { n: 'Audio', r: 'musica, sfx, mix', i: '\u{1F3A7}', s: 'post' },
  voce: { n: 'Voce', r: 'voice-over', i: '\u{1F399}\uFE0F', s: 'post' }, sottotitoli: { n: 'Sottotitoli', r: 'parola per parola', i: '\u{1F4AC}', s: 'post' },
  revisore: { n: 'Revisore', r: 'controllo qualit\xE0', i: '\u2705', s: 'post' },
  regia: { n: 'Regia', r: 'sistema', i: '\u{1F6F0}\uFE0F', c: '#5d7378' },
};
const VECCHI = { 'Direttore creativo': 'direttore', 'Occhi (Gemini)': 'occhi', 'Analista': 'analista', 'Regia': 'regia', 'Ricerca': 'scout_yt' };
const AGID = (a) => AGENTI[a] ? a : VECCHI[a] || 'regia';
const STANZE = [['direzione', 'Direzione creativa'], ['scouting', 'Scouting \xB7 ricerca di settore'], ['visione', 'Sala visione'], ['post', 'Post-produzione']];
const FASE_AGENTI = { piano: ['direttore'], ricerca: ['scout_yt', 'scout_tt', 'scout_ig'], riferimenti: ['occhi'], clip: ['analista'], scheda: ['direttore'] };
const fa = (q) => { const s = (Date.now() - new Date(q)) / 1000; return s < 60 ? 'ora' : s < 3600 ? Math.round(s / 60) + ' min fa' : s < 86400 ? Math.round(s / 3600) + ' h fa' : new Date(q).toLocaleDateString('it-IT'); };

async function regia() {
  const R = await chiama('/api/regia');
  const ultimo = Object.fromEntries(R.ultimi.map((u) => [AGID(u.agente), u]));
  const conti = {}; R.conti.forEach((c) => { conti[AGID(c.agente)] = (conti[AGID(c.agente)] || 0) + c.n; });
  const stati = {};
  for (const L of R.attivi) for (const a of FASE_AGENTI[L.fase] || []) {
    const preso = L.blocco_fino && L.blocco_fino > R.adesso;
    if (stati[a]?.s !== 'lavora') stati[a] = { s: preso ? 'lavora' : 'coda', L };
  }
  for (const [a, u] of Object.entries(ultimo)) if (!stati[a] && u.livello === 'errore' && Date.now() - new Date(u.quando) < 30 * 60e3) stati[a] = { s: 'errore' };
  const testoStato = { lavora: 'al lavoro', coda: 'parte a breve', errore: 'bloccato' };
  const scr = (id) => {
    const A = AGENTI[id], st = stati[id] || {}, u = ultimo[id];
    const msg = st.s === 'coda' ? 'tocca a me: parto entro un minuto\u2026' : u ? u.messaggio : 'pronto, aspetto un lavoro';
    return '<div class="scrivania ' + (st.s || '') + '" style="--c:' + (A.c || '#345') + '" data-ag="' + id + '"><div class="av">' + A.i + '</div><div class="chi"><b>' + e(A.n) + '</b><span class="stato-ag">' + (testoStato[st.s] || (A.s === 'post' ? '' : 'libero')) + '</span><div class="ruolo">' + e(A.r) + (conti[id] ? ' \xB7 ' + conti[id] + ' azioni in 7 gg' : '') + '</div>' +
      (A.s === 'post' ? '' : '<div class="schermo">' + e(msg) + '</div>' + (u && !st.s ? '<div class="mut" style="font-size:11px;margin-top:3px">' + fa(u.quando) + (u.lavoro_id ? ' \xB7 lavoro #' + u.lavoro_id : '') + '</div>' : '')) + '</div></div>';
  };
  const attivi = R.attivi.map((L) => { const i = FASI.findIndex((f) => f[0] === L.fase);
    return '<a class="card attivo" href="#/lavoro/' + L.id + '"><div class="riga"><b style="flex:1">#' + L.id + ' \xB7 ' + e(L.settore || L.prompt.slice(0, 60)) + '</b><span class="pill in_corso">' + FASI[i][1] + '\u2026</span></div><div class="fasi">' + FASI.map((f, k) => '<div class="' + (k < i ? 'ok' : k === i ? 'ora' : '') + '"></div>').join('') + '</div></a>'; }).join('');
  const manca = Object.entries(R.chiavi || {}).filter(([, v]) => !v).map(([k]) => k);
  const avviso = manca.length ? '<a class="card attivo" href="#/impostazioni" style="border-color:var(--warn)"><b style="color:var(--warn)">\u26A0\uFE0E Mancano le chiavi: ' + manca.join(', ') + '</b><div class="mut">' + (manca.includes('Claude') || manca.includes('Gemini') ? 'Senza Claude e Gemini la squadra non pu\xF2 partire.' : 'Senza queste la ricerca salta alcune piattaforme.') + ' Tocca qui per inserirle.</div></a>' : '';
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Regia</h1><a class="btn" href="#/nuovo">+ Nuovo reel</a></div>' + avviso +
    (attivi || '<p class="mut">Nessun lavoro in corso: la squadra \xE8 libera. Avvia un reel con \u201C+ Nuovo reel\u201D.</p>') +
    '<div class="studio">' + STANZE.map(([s, nome]) => '<div class="stanza' + (s === 'post' ? ' spenta' : '') + '"><h3>' + nome + '</h3><div class="' + (s === 'post' ? 'posti' : '') + '">' + Object.keys(AGENTI).filter((a) => AGENTI[a].s === s).map(scr).join('') + '</div></div>').join('') + '</div>' +
    '<h2>In diretta</h2><div class="log">' + (R.feed.map((r) => { const A = AGENTI[AGID(r.agente)]; return '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> ' + A.i + ' <b>' + e(A.n) + '</b> ' + e(r.messaggio) + (r.lavoro_id ? ' <a href="#/lavoro/' + r.lavoro_id + '" class="mut">#' + r.lavoro_id + '</a>' : '') + '</div>'; }).join('') || '<div class="mut">ancora niente</div>') + '</div>';
  document.querySelectorAll('[data-ag]').forEach((d) => d.onclick = () => agente(d.dataset.ag, stati[d.dataset.ag]));
  timer = setTimeout(rotta, R.attivi.length ? 3000 : 10000);
}

async function agente(id, st) {
  const A = AGENTI[id];
  const righe = A.s === 'post' ? [] : await chiama('/api/regia/agente/' + id);
  const chiudi = () => { document.querySelector('.velo')?.remove(); document.querySelector('.pannello')?.remove(); };
  chiudi();
  document.body.insertAdjacentHTML('beforeend', '<div class="velo"></div><div class="pannello"><div class="riga"><div class="av" style="--c:' + (A.c || '#345') + '">' + A.i + '</div><div style="flex:1"><h1 style="margin:0">' + e(A.n) + '</h1><div class="mut">' + e(A.r) + '</div></div><button class="sec" id="xx">Chiudi</button></div>' +
    '<p>' + e(A.d || 'Questo agente entra in squadra con la fase 2 (montaggio): legger\xE0 la scheda tecnica del Direttore creativo.') + '</p>' +
    (st?.L ? '<p><b>Adesso:</b> lavoro <a href="#/lavoro/' + st.L.id + '">#' + st.L.id + '</a> \xB7 ' + e(st.L.settore || st.L.prompt.slice(0, 80)) + '</p>' : '') +
    (righe.length ? '<h2>Cosa ha fatto</h2><div class="log">' + righe.map((r) => '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleString('it-IT') + '</span> ' + e(r.messaggio) + (r.lavoro_id ? ' <a class="mut" href="#/lavoro/' + r.lavoro_id + '">#' + r.lavoro_id + '</a>' : '') + '</div>').join('') + '</div>' : '') + '</div>');
  document.querySelector('.velo').onclick = chiudi; $('#xx').onclick = chiudi;
  addEventListener('hashchange', chiudi, { once: true });
}

async function chiama(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/api/accedi') { accesso(); throw new Error('accesso'); }
  if (!r.ok) throw new Error(d.errore || 'errore ' + r.status);
  return d;
}

function menu(on) {
  $('#nav').innerHTML = on ? '<a class="btn sec" href="#/">Regia</a><a class="btn sec" href="#/lavori">Lavori</a><a class="btn" href="#/nuovo">+ Reel</a><a class="btn sec" href="#/impostazioni" title="Impostazioni">\u2699\uFE0E</a>' : '';
}

async function accesso() {
  menu(false);
  const s = await fetch('/api/stato').then((r) => r.json());
  $('#app').innerHTML = '<div class="card" style="max-width:420px;margin:40px auto"><h1>' + (s.configurato ? 'Accedi' : 'Scegli la password') + '</h1>' +
    '<p class="mut">' + (s.configurato ? 'Password della regia.' : 'Primo accesso: la password che scrivi diventa quella della regia (minimo 6 caratteri).') + '</p>' +
    '<input id="pw" type="password" autocomplete="current-password"><div style="margin-top:14px"><button id="go">Entra</button></div><div id="er" class="err"></div></div>';
  const vai = async () => { try { await chiama('/api/accedi', { method: 'POST', body: { password: $('#pw').value } }); location.hash = '#/'; rotta(); } catch (x) { $('#er').textContent = x.message; } };
  $('#go').onclick = vai; $('#pw').onkeydown = (ev) => ev.key === 'Enter' && vai(); $('#pw').focus();
}

async function lista() {
  const L = await chiama('/api/lavori');
  $('#app').innerHTML = '<div class="riga"><h1 style="flex:1">Lavori</h1><a class="btn" href="#/nuovo">+ Nuovo reel</a></div>' +
    (L.length ? L.map((l) => '<a class="card lav" href="#/lavoro/' + l.id + '"><div class="riga"><b style="flex:1">' + e(l.titolo || l.prompt.slice(0, 90)) + '</b><span class="pill ' + l.stato + '">' + e(stato(l)) + '</span></div><div class="mut" style="margin-top:6px">#' + l.id + ' \xB7 ' + new Date(l.creato).toLocaleString('it-IT') + (l.titolo ? ' \xB7 ' + e(l.prompt.slice(0, 70)) : '') + '</div></a>').join('')
      : '<div class="vuoto">Nessun lavoro. Scrivi il primo prompt con \u201C+ Nuovo reel\u201D.</div>');
  if (L.some((l) => l.stato === 'in_corso')) timer = setTimeout(rotta, 8000);
}
const stato = (l) => l.stato === 'pronto' ? 'pronto' : l.stato === 'errore' ? 'errore' : (FASI.find((f) => f[0] === l.fase) || [0, l.fase])[1] + '\u2026';

function nuovo() {
  $('#app').innerHTML = '<h1>Nuovo reel</h1><p class="mut">Il Direttore creativo cerca i video che funzionano nel settore su YouTube, TikTok e Instagram, Gemini li guarda, l\\'Analista guarda le tue clip e alla fine ricevi la scheda tecnica.</p>' +
    '<label>Cosa deve essere il reel</label><textarea id="pr" placeholder="Es. Reel per la pizzeria Da Gino a Salerno, 30 secondi, clip in cucina e in sala. Deve far venire fame e portare prenotazioni. Target 25-40 anni, tono giovane ma non volgare."></textarea>' +
    '<div class="aiuto">Cliente, settore, obiettivo, durata, tono, a chi parla. Pi\xF9 sei preciso, migliore \xE8 la ricerca.</div>' +
    '<label>Cartella delle clip su pCloud (facoltativo)</label><input id="pc" placeholder="https://e.pcloud.link/publink/show?code=\u2026">' +
    '<div class="aiuto">Su pCloud: tasto destro sulla cartella \u2192 Condividi \u2192 Link di condivisione \u2192 copia. Senza clip fa solo la ricerca.</div>' +
    '<label>Reel di riferimento che ti piacciono (facoltativo)</label><textarea id="lr" style="min-height:70px" placeholder="Un link per riga: YouTube, TikTok o Instagram"></textarea>' +
    '<div style="margin-top:18px"><button id="go">Avvia la squadra</button></div><div id="er" class="err"></div>';
  $('#go').onclick = async () => {
    $('#go').disabled = true;
    try { const r = await chiama('/api/lavori', { method: 'POST', body: { prompt: $('#pr').value, pcloud: $('#pc').value, link_rif: $('#lr').value } }); location.hash = '#/lavoro/' + r.id; }
    catch (x) { $('#er').textContent = x.message; $('#go').disabled = false; }
  };
}

function lst(a) { return a && a.length ? '<ul>' + a.map((x) => '<li>' + e(typeof x === 'object' ? Object.values(x).join(' \xB7 ') : x) + '</li>').join('') + '</ul>' : '<p class="mut">\u2014</p>'; }

function vistaScheda(s) {
  if (!s) return '';
  const st = (s.struttura || []).map((x) => '<tr><td style="white-space:nowrap">' + e(x.da) + '\u2013' + e(x.a) + ' s</td><td><b>' + e(x.fase) + '</b><div class="mut">' + e(x.obiettivo) + '</div></td><td>' + e(x.contenuto) + '</td></tr>').join('');
  const a = s.audio || {}, t = s.testi || {};
  return '<h2>Concept</h2><div class="card"><h1>' + e(s.titolo_lavoro) + '</h1><p>' + e(s.concept) + '</p><div class="kv">' +
    '<b>Durata</b><span>' + e(s.durata_target_sec) + ' s \xB7 ' + e(s.formato) + '</span>' +
    '<b>Gancio</b><span>' + e((s.gancio || {}).idea) + (s.gancio?.testo_proposto ? ' \u2014 \u201C' + e(s.gancio.testo_proposto) + '\u201D' : '') + '</span>' +
    '<b>Ritmo</b><span>inquadratura media ' + e(s.ritmo?.durata_media_inquadratura_sec) + ' s \xB7 ' + (s.ritmo?.tagli_sul_beat ? 'tagli sul beat' : 'tagli liberi') + ' \xB7 ' + e(s.ritmo?.variazioni) + '</span>' +
    '<b>Colore</b><span>' + e(s.colore?.look) + ' \u2014 ' + e(s.colore?.note) + '</span>' +
    '<b>Testi</b><span>' + e(t.stile) + ' \xB7 ' + e(t.posizione) + ' \xB7 ' + e(t.font_suggerito) + ' \xB7 ' + e(t.colori) + ' \xB7 ' + e(t.animazione) + '</span>' +
    '<b>Sottotitoli</b><span>' + (s.sottotitoli?.usare ? e(s.sottotitoli.stile) : 'no') + '</span>' +
    '<b>Effetti</b><span>' + e((s.effetti || []).map((x) => x.nome + ' (' + x.dove + ')').join(' \xB7 ')) + '</span>' +
    '<b>Transizioni</b><span>' + e((s.transizioni || []).join(', ')) + '</span>' +
    '<b>Audio</b><span>' + e(a.mood) + ' \xB7 ' + e(a.bpm) + ' BPM \xB7 ' + e(a.musica_suggerita) + '<br>voce: ' + e(a.voce) + (a.note_voce ? ' \u2014 ' + e(a.note_voce) : '') + '<br>effetti sonori: ' + e((a.effetti_sonori || []).join(', ')) + '</span>' +
    '<b>Chiusura</b><span>' + e(s.chiusura?.tipo) + ' \u2014 ' + e(s.chiusura?.cta) + '</span></div></div>' +
    '<h2>Cosa funziona nel settore</h2><div class="card">' + lst(s.cosa_funziona_nel_settore) + '</div>' +
    '<h2>Struttura</h2><div class="card"><table>' + st + '</table></div>' +
    '<h2>Clip da usare</h2><div class="card">' + lst((s.clip_da_usare || []).map((c) => c.file + ' \xB7 ' + c.momento + ' \u2192 ' + c.per)) + '</div>' +
    '<h2>Clip mancanti</h2><div class="card">' + lst(s.clip_mancanti) + '</div>' +
    '<h2>Rischi</h2><div class="card">' + lst(s.rischi) + '</div>' +
    '<h2>Caption</h2><div class="card"><p style="white-space:pre-wrap">' + e(s.caption) + '</p><p class="mut">' + e((s.hashtag || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p></div>';
}

function vistaRiferimenti(R) {
  if (!R || !R.length) return '';
  return '<h2>Riferimenti (' + R.filter((r) => r.stato === 'fatto').length + '/' + R.length + ' guardati)</h2><div class="grid">' + R.map((r) => {
    const v = r.video, a = r.analisi || {};
    return '<div class="card"><div class="riga"><span class="tag ' + v.piattaforma + '">' + v.piattaforma + '</span>' + (v.scelto_da_johnny ? '<span class="pill">scelto da te</span>' : '') + '<span class="pill">' + e(r.stato.replace('_', ' ')) + '</span></div>' +
      '<p style="margin:8px 0 4px"><a href="' + e(v.url) + '" target="_blank" rel="noopener">' + e((v.titolo || v.url).slice(0, 80)) + '</a></p>' +
      '<div class="mut">' + n(v.views) + ' views \xB7 ' + n(v.likes) + ' like \xB7 ' + e(v.durata) + ' s \xB7 ' + e(v.autore) + '</div>' +
      (r.analisi ? '<p><b>Gancio</b> ' + e(a.gancio?.cosa_succede) + ' (fino a ' + e(a.gancio?.fine_sec) + ' s)<br><b>Ritmo</b> ' + e(a.ritmo) + ' \xB7 ' + e(a.numero_tagli) + ' tagli \xB7 media ' + e(a.durata_media_inquadratura_sec) + ' s<br><b>Look</b> ' + e(a.colore?.look) + ' \xB7 <b>Effetti</b> ' + e((a.effetti || []).join(', ')) + '<br><b>Audio</b> ' + e(a.audio?.mood) + ' ' + e(a.audio?.bpm_stimato) + ' BPM \xB7 voce ' + e(a.audio?.voce) + '</p><p class="mut">' + e(a.perche_funziona) + '</p>' : '') +
      (r.errore ? '<p class="err">' + e(r.errore) + '</p>' : '') + '</div>';
  }).join('') + '</div>';
}

function vistaClip(C) {
  if (!C || !C.length) return '';
  return '<h2>Le tue clip (' + C.length + ')</h2><div class="card"><table><tr><th>Clip</th><th>Tecnico</th><th>Contenuto</th></tr>' + C.map((c) => {
    const t = c.tecnico || {}, a = c.analisi || {};
    return '<tr><td>' + e(c.nome) + '<div class="mut">' + e(c.stato.replace('_', ' ')) + '</div></td><td class="mut">' + e(t.risoluzione) + '<br>' + e(t.fps) + ' fps \xB7 ' + e(t.durata_sec) + ' s</td><td>' + e(a.descrizione || c.errore) +
      ((a.problemi || []).length ? '<div class="mut">\u26A0\uFE0E ' + e(a.problemi.map((p) => p.tipo + ' ' + p.da + '-' + p.a + 's').join(', ')) + '</div>' : '') + '</td></tr>';
  }).join('') + '</table></div>';
}

async function dettaglio(id) {
  const L = await chiama('/api/lavori/' + id);
  const i = FASI.findIndex((f) => f[0] === L.fase);
  const barra = '<div class="fasi">' + FASI.map((f, k) => '<div class="' + (k < i || L.stato === 'pronto' ? 'ok' : k === i && L.stato === 'in_corso' ? 'ora' : '') + '"></div>').join('') + '</div><div class="fasinomi">' + FASI.map((f) => '<span>' + f[1] + '</span>').join('') + '</div>';
  $('#app').innerHTML = '<div class="riga"><span class="pill ' + L.stato + '">' + e(stato(L)) + '</span><span class="mut">#' + L.id + ' \xB7 ' + new Date(L.creato).toLocaleString('it-IT') + '</span></div>' +
    '<p style="white-space:pre-wrap;margin:10px 0">' + e(L.prompt) + '</p>' + barra +
    (L.errore ? '<div class="card err">' + e(L.errore) + '</div>' : '') +
    '<div class="riga" style="margin-top:14px">' + (L.stato !== 'in_corso' ? '<button class="sec" id="rip">Riprova' + (L.stato === 'pronto' ? ' la scheda' : '') + '</button>' : '') +
    (L.scheda ? '<button class="sec" id="dl">Scarica scheda (JSON)</button>' : '') + '<button class="rosso" id="del">Elimina</button></div>' +
    vistaScheda(L.scheda) + vistaRiferimenti(L.riferimenti) + vistaClip(L.clip) +
    '<h2>Cosa stanno facendo gli agenti</h2><div class="log">' + L.registro.map((r) => { const A = AGENTI[AGID(r.agente)]; return '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> ' + A.i + ' <b>' + e(A.n) + '</b> ' + e(r.messaggio) + '</div>'; }).join('') + '</div>';
  if ($('#rip')) $('#rip').onclick = async () => { await chiama('/api/lavori/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  if ($('#dl')) $('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(L.scheda, null, 2)], { type: 'application/json' })); a.download = 'scheda-' + id + '.json'; a.click(); };
  $('#del').onclick = async () => { if (confirm('Eliminare questo lavoro?')) { await chiama('/api/lavori/' + id, { method: 'DELETE' }); location.hash = '#/'; } };
  if (L.stato === 'in_corso') timer = setTimeout(rotta, 6000);
}

const NOMI = { ANTHROPIC_API_KEY: ['Claude', 'console.anthropic.com \u2192 API Keys'], GEMINI_API_KEY: ['Gemini (gli occhi)', 'aistudio.google.com/apikey'], YOUTUBE_API_KEY: ['YouTube Data API v3', 'console.cloud.google.com \u2192 abilita \u201CYouTube Data API v3\u201D \u2192 Credenziali \u2192 Chiave API'], APIFY_TOKEN: ['Apify (TikTok e Instagram)', 'console.apify.com \u2192 Settings \u2192 API & Integrations'] };
async function impostazioni() {
  const d = await chiama('/api/impostazioni');
  $('#app').innerHTML = '<h1>Impostazioni</h1><p class="mut">Le chiavi restano sul tuo Cloudflare. Lascia vuoto un campo per non cambiarlo.</p>' +
    Object.entries(d.segreti).map(([k, v]) => '<label>' + NOMI[k][0] + ' ' + (v.impostata ? '<span class="pill pronto">impostata ' + e(v.anteprima) + '</span>' : '<span class="pill errore">manca</span>') + '</label>' +
      (v.da_cloudflare ? '<div class="aiuto">Impostata come segreto su Cloudflare.</div>' : '<input data-k="' + k + '" type="password" autocomplete="off" placeholder="incolla qui"><div class="aiuto">' + NOMI[k][1] + '</div>')).join('') +
    '<h2>Avanzate</h2>' + Object.entries(d.opzioni).map(([k, v]) => '<label>' + k + '</label><input data-k="' + k + '" data-o="1" value="' + e(v) + '">').join('') +
    '<div class="riga" style="margin-top:18px"><button id="sv">Salva</button><button class="sec" id="out">Esci</button></div><div id="er" class="err"></div>';
  $('#sv').onclick = async () => {
    const body = {};
    document.querySelectorAll('[data-k]').forEach((i) => { if (i.dataset.o || i.value.trim()) body[i.dataset.k] = i.value; });
    try { await chiama('/api/impostazioni', { method: 'POST', body }); await impostazioni(); $('#er').style.color = 'var(--ok)'; $('#er').textContent = '\u2713 Salvato'; } catch (x) { $('#er').textContent = x.message; }
  };
  $('#out').onclick = async () => { await fetch('/api/esci'); accesso(); };
}

async function rotta() {
  clearTimeout(timer);
  const h = location.hash || '#/';
  const s = await fetch('/api/stato').then((r) => r.json());
  if (!s.dentro) return accesso();
  menu(true);
  try {
    if (h.startsWith('#/lavoro/')) await dettaglio(h.split('/')[2]);
    else if (h === '#/nuovo') nuovo();
    else if (h === '#/impostazioni') await impostazioni();
    else if (h === '#/lavori') await lista();
    else if (!document.querySelector('.pannello')) await regia();
    else timer = setTimeout(rotta, 3000);
  } catch (x) { if (x.message !== 'accesso') $('#app').innerHTML = '<div class="card err">' + e(x.message) + '</div>'; }
}
addEventListener('hashchange', rotta);
rotta();
<\/script></body></html>`;var v=(a,i=200,t={})=>new Response(JSON.stringify(a),{status:i,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...t}}),na=a=>[...new Uint8Array(a)].map(i=>i.toString(16).padStart(2,"0")).join(""),sa=async a=>na(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(a)));async function D(a){return a.ADMIN_PASSWORD?sa("momento-reel|"+a.ADMIN_PASSWORD):(await x(a,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function la(a){let i=await crypto.subtle.importKey("raw",new TextEncoder().encode(a),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return na(await crypto.subtle.sign("HMAC",i,new TextEncoder().encode("momento-reel-sessione")))}async function oa(a,i){let t=await D(i);if(!t)return!1;let o=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(a.headers.get("cookie")||"");return!!o&&o[1]===await la(t)}var ra=(a,i)=>`mr_s=${a}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${i}`;async function Pa(a,i,t){let o=t.pathname,e=a.method;if(o==="/api/stato")return v({configurato:!!await D(i),dentro:await oa(a,i)});if(o==="/api/accedi"&&e==="POST"){let{password:r}=await a.json().catch(()=>({}));if(!r||String(r).length<6)return v({errore:"password di almeno 6 caratteri"},400);let s=await D(i),c=sa("momento-reel|"+r);if(!s)s=await c,await b(i,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",s);else if(await c!==s)return v({errore:"password errata"},401);return v({ok:!0},200,{"set-cookie":ra(await la(s),3600*24*60)})}if(o==="/api/esci")return v({ok:!0},200,{"set-cookie":ra("",0)});if(!await oa(a,i))return v({errore:"accesso richiesto"},401);if(o==="/api/impostazioni"&&e==="GET"){let r=await S(i),s=Object.fromEntries(y.map(d=>{let u=r[d];return[d,{impostata:!!u,da_cloudflare:r._env[d],anteprima:u?"\u2022\u2022\u2022\u2022"+String(u).slice(-4):""}]})),c=Object.fromEntries(R.map(d=>[d,Array.isArray(r[d])?r[d].join(","):r[d]]));return v({segreti:s,opzioni:c})}if(o==="/api/impostazioni"&&e==="POST"){let r=await a.json().catch(()=>({})),s=[];for(let c of[...y,...R]){if(typeof r[c]!="string")continue;let d=r[c].trim();s.push(d?i.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(c,d):i.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(c))}return s.length&&await i.DB.batch(s),v({ok:!0})}if(o==="/api/regia"&&e==="GET"){let[r,s,c,d]=await Promise.all([T(i,"SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),T(i,"SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),T(i,"SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),T(i,"SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente",new Date(Date.now()-6048e5).toISOString())]),u=await S(i),h={Claude:!!u.ANTHROPIC_API_KEY,Gemini:!!u.GEMINI_API_KEY,YouTube:!!u.YOUTUBE_API_KEY,Apify:!!u.APIFY_TOKEN};return v({adesso:w(),attivi:r,ultimi:s,feed:c,conti:d,chiavi:h})}let n=o.match(/^\/api\/regia\/agente\/([a-z_]+)$/);if(n&&e==="GET")return v(await T(i,"SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40",n[1]));if(o==="/api/lavori"&&e==="GET"){let r=await T(i,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return v(r)}if(o==="/api/lavori"&&e==="POST"){let r=await a.json().catch(()=>({})),s=String(r.prompt||"").trim();if(s.length<10)return v({errore:"descrivi il reel in almeno una frase"},400);let c=await S(i),d=[["ANTHROPIC_API_KEY","Claude"],["GEMINI_API_KEY","Gemini"]].filter(([f])=>!c[f]).map(([,f])=>f);if(d.length)return v({errore:`Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${d.join(", ")})`},400);let u=String(r.pcloud||"").trim()||null;if(u&&!/code=/.test(u))return v({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let h=String(r.link_rif||"").split(/\s+/).filter(f=>/^https?:\/\//.test(f)).slice(0,10),p=await x(i,"INSERT INTO lavori (prompt, pcloud, link_rif, creato, aggiornato) VALUES (?,?,?,?,?) RETURNING id",s,u,JSON.stringify(h),w(),w());return await m(i,p.id,"regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),v({id:p.id})}let l=o.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro))?$/);if(l){let r=Number(l[1]);if(!l[2]&&e==="GET"){let s=await x(i,"SELECT * FROM lavori WHERE id=?",r);if(!s)return v({errore:"non trovato"},404);for(let c of["piano","riferimenti","clip","scheda","link_rif"])s[c]=E(s[c]);return delete s.candidati,s.registro=await T(i,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",r),v(s)}if(!l[2]&&e==="DELETE")return await i.DB.batch([i.DB.prepare("DELETE FROM lavori WHERE id=?").bind(r),i.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(r)]),v({ok:!0});if(l[2]==="riprova"&&e==="POST"){let s=await a.json().catch(()=>({})),c=["piano","ricerca","riferimenti","clip","scheda"].includes(s.fase)?s.fase:null,d=await x(i,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",r);if(!d)return v({errore:"non trovato"},404);let u=c||(d.fase==="fatto"?"scheda":d.fase),h=p=>JSON.stringify((E(p,[])||[]).map(f=>f.stato==="saltato"?{...f,stato:"da_guardare",errore:void 0}:f));return await b(i,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",u,d.riferimenti?h(d.riferimenti):null,d.clip?h(d.clip):null,w(),r),await m(i,r,"regia",`\u{1F501} riparto dalla fase "${u}"`),v({ok:!0})}}return v({errore:"non trovato"},404)}var Ha={async fetch(a,i){await k(i);let t=new URL(a.url);if(t.pathname.startsWith("/api/"))try{return await Pa(a,i,t)}catch(o){return v({errore:String(o?.message||o).slice(0,300)},500)}return new Response(ea,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(a,i,t){await k(i),t.waitUntil(ta(i))}};export{Ha as default};
