var _=()=>new Date().toISOString(),b=(a,i=null)=>{try{return a==null?i:JSON.parse(a)}catch{return i}},S=async(a,i,...t)=>(await a.DB.prepare(i).bind(...t).all()).results||[],I=(a,i,...t)=>a.DB.prepare(i).bind(...t).first(),g=(a,i,...t)=>a.DB.prepare(i).bind(...t).run(),D=!1;async function O(a){D||(await a.DB.batch([a.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),a.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),a.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),a.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),a.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]),D=!0)}async function f(a,i,t,o,e="info"){await g(a,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",i,t,String(o).slice(0,600),e,_())}var y=["ANTHROPIC_API_KEY","GEMINI_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],R=["CLAUDE_MODEL","GEMINI_MODELS","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA","FPS_ANALISI"];async function x(a){let i=Object.fromEntries((await S(a,"SELECT chiave, valore FROM impostazioni")).map(o=>[o.chiave,o.valore])),t=(o,e)=>a[o]||i[o]||e;return{ANTHROPIC_API_KEY:t("ANTHROPIC_API_KEY"),GEMINI_API_KEY:t("GEMINI_API_KEY"),YOUTUBE_API_KEY:t("YOUTUBE_API_KEY"),APIFY_TOKEN:t("APIFY_TOKEN"),CLAUDE_MODEL:t("CLAUDE_MODEL","claude-sonnet-5-5"),GEMINI_MODELS:String(t("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(o=>o.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:t("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:t("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(t("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(t("DURATA_MAX",90)),MESI_RICERCA:Number(t("MESI_RICERCA",18)),FPS_ANALISI:Number(t("FPS_ANALISI",4)),_salvate:i,_env:Object.fromEntries(y.map(o=>[o,!!a[o]]))}}var ca={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},da={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},pa={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},ua=["alto","centro","terzo_inferiore"],ma=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function k(){let a=["LOOK COLORE:"];for(let[i,t]of Object.entries(ca))a.push(`- ${i}: ${t}`);a.push(`
EFFETTI E TRANSIZIONI:`);for(let[i,t]of Object.entries(da))a.push(`- ${i}: ${t}`);a.push(`
STILI TESTO:`);for(let[i,t]of Object.entries(pa))a.push(`- ${i}: ${t}`);return a.push(`
POSIZIONI TESTO: ${ua.join(", ")}`),a.push(`MOOD MUSICA: ${ma.join(", ")}`),a.join(`
`)}var N=a=>new Promise(i=>setTimeout(i,a));function M(a){if(a&&typeof a=="object")return a;let i=String(a||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(i)}catch{}for(let[t,o]of[["{","}"],["[","]"]]){let e=i.indexOf(t),r=i.lastIndexOf(o);if(e!==-1&&r>e)try{return JSON.parse(i.slice(e,r+1))}catch{}}throw new Error("risposta non in JSON: "+i.slice(0,300))}async function w(a,i={},t=4){let o;for(let e=0;e<t;e++)try{let r=await fetch(a,i);if([429,500,502,503,504,529].includes(r.status)){o=new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,300)}`),await N(4e3*(e+1)*(r.status===429?3:1));continue}return r}catch(r){if(o=r,i.body&&typeof i.body!="string")break;await N(3e3*(e+1))}throw new Error(`richiesta fallita (${String(a).split("?")[0]}): ${o?.message||o}`)}async function P(a,i,t,{maxTokens:o=8e3,json:e=!0}={}){if(!a.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let r=await w("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":a.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:a.CLAUDE_MODEL,max_tokens:o,system:i,messages:[{role:"user",content:t}]})});if(r.status!==200)throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0,400)}`);let n=((await r.json()).content||[]).filter(l=>l.type==="text").map(l=>l.text).join("");return e?M(n):n}var C="https://generativelanguage.googleapis.com";async function L(a,i){if(!a.GEMINI_API_KEY)throw new Error("manca la chiave Gemini (Impostazioni)");let t=JSON.stringify({contents:[{role:"user",parts:i}],generationConfig:{responseMimeType:"application/json",temperature:.2}}),o=[];for(let e of a.GEMINI_MODELS){let r=await w(`${C}/v1beta/models/${e}:generateContent?key=${a.GEMINI_API_KEY}`,{method:"POST",headers:{"content-type":"application/json"},body:t}),s=await r.text();if(r.status===200){let l=(JSON.parse(s).candidates?.[0]?.content?.parts||[]).map(c=>c.text||"").join("");if(!l)throw new Error("Gemini senza risposta: "+s.slice(0,300));return M(l)}if((r.status===404||r.status===400)&&/not found|not supported|is not available/i.test(s)){o.push(e);continue}throw new Error(`Gemini ${r.status} (${e}): ${s.slice(0,400)}`)}throw new Error("nessun modello Gemini disponibile tra: "+o.join(", "))}function U(a,i,t,o){return L(a,[{fileData:{fileUri:i},videoMetadata:{fps:o||a.FPS_ANALISI}},{text:t}])}async function fa(a,i,t,o={}){let e=await w(i,{headers:{"user-agent":"Mozilla/5.0",...o}});if(!e.ok)throw new Error(`download non riuscito (HTTP ${e.status}): link scaduto o non pubblico`);let r=(e.headers.get("content-type")||"").split(";")[0];r.startsWith("video/")||(r="video/mp4");let s=Number(e.headers.get("content-length")||0),n;if(s>0){let{readable:d,writable:m}=new FixedLengthStream(s);e.body.pipeTo(m).catch(()=>{}),n=d}else{let d=await e.arrayBuffer();if(d.byteLength>95*1024*1024)throw new Error("video senza dimensione dichiarata e troppo grande");s=d.byteLength,n=d}if(s>1900*1024*1024)throw new Error("video oltre 1,9 GB: troppo grande per Gemini");let l=await w(`${C}/upload/v1beta/files?key=${a.GEMINI_API_KEY}`,{method:"POST",headers:{"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":String(s),"X-Goog-Upload-Header-Content-Type":r,"content-type":"application/json"},body:JSON.stringify({file:{display_name:String(t).slice(0,120)}})}),c=l.headers.get("x-goog-upload-url");if(!c)throw new Error(`upload Gemini non avviato (${l.status}): ${(await l.text()).slice(0,200)}`);let v=(await(await w(c,{method:"POST",headers:{"Content-Length":String(s),"X-Goog-Upload-Offset":"0","X-Goog-Upload-Command":"upload, finalize"},body:n},1)).json()).file;if(!v?.name)throw new Error("upload Gemini fallito");for(let d=0;d<90;d++){if(v.state==="ACTIVE")return{uri:v.uri,mime:r};if(v.state==="FAILED")throw new Error("Gemini non \xE8 riuscito a leggere il video");await N(5e3),v=await(await w(`${C}/v1beta/${v.name}?key=${a.GEMINI_API_KEY}`)).json()}throw new Error("Gemini: tempo scaduto in elaborazione video")}async function $(a,i,t,o,e,r){let{uri:s,mime:n}=await fa(a,i,t,r);return L(a,[{fileData:{fileUri:s,mimeType:n},videoMetadata:{fps:e||a.FPS_ANALISI}},{text:o}])}var ha=a=>{let i=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(a||"");return i?(+i[1]||0)*3600+(+i[2]||0)*60+(+i[3]||0):0};async function j(a,i,t=15){if(!a.YOUTUBE_API_KEY)return{video:[],nota:"YouTube saltato: manca la chiave"};let o=new Date(Date.now()-a.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),e=[];for(let r of i){let s=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:r,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:o,maxResults:t,key:a.YOUTUBE_API_KEY}).forEach(([l,c])=>s.searchParams.set(l,c));let n=await w(s.toString());if(n.status!==200)throw new Error(`YouTube ${n.status}: ${(await n.text()).slice(0,200)}`);e.push(...((await n.json()).items||[]).map(l=>l.id?.videoId).filter(Boolean))}return e=[...new Set(e)],{video:await Y(a,e,a.DURATA_MAX)}}async function Y(a,i,t=9999){let o=[];for(let e=0;e<i.length;e+=50){let r=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${i.slice(e,e+50).join(",")}&key=${a.YOUTUBE_API_KEY}`,s=await w(r);if(s.status===200)for(let n of(await s.json()).items||[]){let l=n.statistics||{},c=n.snippet||{},p=ha(n.contentDetails?.duration);!p||p>t||o.push({piattaforma:"youtube",id:n.id,url:`https://www.youtube.com/watch?v=${n.id}`,video_url:null,titolo:c.title||"",autore:c.channelTitle||"",views:+l.viewCount||0,likes:+l.likeCount||0,commenti:+l.commentCount||0,condivisioni:0,durata:p,data:c.publishedAt||""})}}return o}async function A(a,i,t){let o=`https://api.apify.com/v2/acts/${i.replace("/","~")}/run-sync-get-dataset-items?token=${a.APIFY_TOKEN}&timeout=280`,e=await w(o,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(t)},2);if(e.status!==200&&e.status!==201)throw new Error(`Apify ${i} ${e.status}: ${(await e.text()).slice(0,200)}`);let r=await e.json();return Array.isArray(r)?r:[]}var u=(a,...i)=>{for(let t of i){let o=a;for(let e of t.split("."))o=o==null?void 0:Array.isArray(o)&&/^\d+$/.test(e)?o[+e]:o[e];if(o!=null&&o!==""&&!(Array.isArray(o)&&!o.length))return o}},T=a=>Math.round(Number(a)||0);function F(a){return{piattaforma:"tiktok",id:String(u(a,"id","video_id")||""),url:u(a,"webVideoUrl","url","detail_url")||"",video_url:u(a,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(u(a,"text","desc","ad_title")||"").slice(0,200),autore:u(a,"authorMeta.name","author","brand_name")||"",views:T(u(a,"playCount","views")),likes:T(u(a,"diggCount","likes")),commenti:T(u(a,"commentCount","comments")),condivisioni:T(u(a,"shareCount","shares")),durata:T(u(a,"videoMeta.duration","duration_sec","duration")),data:u(a,"createTimeISO")||""}}function G(a){return{piattaforma:"instagram",id:String(u(a,"shortCode","id")||""),url:u(a,"url","reelURL")||"",video_url:u(a,"videoUrl","video_url")||null,titolo:String(u(a,"caption")||"").slice(0,200),autore:u(a,"ownerUsername")||"",views:T(u(a,"videoPlayCount","videoViewCount","views")),likes:T(u(a,"likesCount","likes")),commenti:T(u(a,"commentsCount","comments")),condivisioni:0,durata:T(u(a,"videoDuration","duration")),data:u(a,"timestamp")||"",_video:!!u(a,"videoUrl")||/video|clips/i.test(String(u(a,"type","productType")||""))}}async function H(a,i,t,o=10){return a.APIFY_TOKEN?{video:(await A(a,a.APIFY_TIKTOK_ACTOR,{searchQueries:i,hashtags:t.map(r=>r.replace(/^#/,"")),searchSection:"/video",resultsPerPage:o,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(F).filter(r=>r.id&&(!r.durata||r.durata<=a.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function K(a,i,t=15){return a.APIFY_TOKEN?{video:(await A(a,a.APIFY_INSTAGRAM_ACTOR,{directUrls:i.map(e=>`https://www.instagram.com/explore/tags/${e.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:t,addParentData:!1})).map(G).filter(e=>e.id&&e._video&&(!e.durata||e.durata<=a.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function B(a,i){let t=[],o=[],e=[];for(let s of i){let n=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(s);n?t.push(n[1]):/tiktok\.com/.test(s)?o.push(s):/instagram\.com/.test(s)&&e.push(s)}let r=[];return t.length&&(a.YOUTUBE_API_KEY?r.push(...await Y(a,t)):r.push(...t.map(s=>({piattaforma:"youtube",id:s,url:`https://www.youtube.com/watch?v=${s}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),o.length&&a.APIFY_TOKEN&&r.push(...(await A(a,a.APIFY_TIKTOK_ACTOR,{postURLs:o,shouldDownloadVideos:!0,resultsPerPage:1})).map(F)),e.length&&a.APIFY_TOKEN&&r.push(...(await A(a,a.APIFY_INSTAGRAM_ACTOR,{directUrls:e,resultsType:"posts",resultsLimit:1})).map(G)),r.map(s=>({...s,scelto_da_johnny:!0}))}function X(a){let i=Math.max(a.views||0,1),t=((a.likes||0)+2*(a.commenti||0)+3*(a.condivisioni||0))/i;return Math.round((Math.log10(i+1)+Math.min(t,.3)*10)*1e3)/1e3}var ga=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function va(a){try{return new URL(a).searchParams.get("code")}catch{return null}}async function J(a,i,t){let o=va(a);if(!o)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let e=/(^|\/\/)e\.|eapi/.test(a)?["eapi","api"]:["api","eapi"],r;for(let s of e){let n=new URL(`https://${s}.pcloud.com/${i}`);n.searchParams.set("code",o),Object.entries(t||{}).forEach(([c,p])=>n.searchParams.set(c,p));let l=await(await w(n.toString())).json();if(l.result===0)return l;r=l}throw new Error(`pCloud: ${r?.error||"errore "+r?.result}`)}async function q(a){let i=await J(a,"showpublink",{}),t=[],o=(e,r="")=>{e.isfolder?(e.contents||[]).forEach(s=>o(s,r?`${r}/${e.name}`:e.name)):(e.category===2||ga.test(e.name))&&t.push({fileid:e.fileid,nome:e.name,cartella:r,dimensione:e.size,hash:String(e.hash||e.fileid),tecnico:{durata_sec:e.duration?Number(e.duration):null,risoluzione:e.width?`${e.width}x${e.height}`:null,fps:e.fps?Number(e.fps):null,orientamento:e.width?e.height>e.width?"verticale":e.width>e.height?"orizzontale":"quadrato":null,rallenty_possibile:e.fps?Number(e.fps)>=48:null}})};return o(i.metadata),t}async function W(a,i){let t=await J(a,"getpublinkdownload",{fileid:i});return`https://${t.hosts[0]}${t.path}`}var V=["piano","ricerca","riferimenti","clip","scheda","fatto"],Ea=12,Z=9*6e4,_a=3,wa=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.`,Ta=a=>`RICHIESTA DI JOHNNY:
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
}`,Q=a=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
\xC8 un riferimento per un reel del settore "${a}". Misura, non inventare: se un dato non \xE8 verificabile
scrivi null. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${k()}

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
}`,Sa=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`,ya=(a,i,t,o)=>`RICHIESTA DI JOHNNY:
${a}

PIANO: ${JSON.stringify(i)}

LIBRERIA:
${k()}

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
}`;async function aa(a,i,t){let o=await I(a,"SELECT dati FROM cache_analisi WHERE chiave=?",i);if(o)return{dati:b(o.dati),daCache:!0};let e=await t();return await g(a,"INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)",i,JSON.stringify(e),_()),{dati:e,daCache:!1}}async function xa(a,i,t){await f(a,t.id,"Direttore creativo","leggo la richiesta e preparo la ricerca");let o=await P(i,wa,Ta(t.prompt),{maxTokens:1500});await g(a,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(o),t.id),await f(a,t.id,"Direttore creativo",`settore: ${o.settore} \xB7 obiettivo: ${o.obiettivo||"-"}`)}async function Aa(a,i,t){let o=b(t.piano,{}),e=await Promise.allSettled([j(i,o.youtube_query||[]),H(i,o.tiktok_query||[],o.tiktok_hashtag||[]),K(i,o.instagram_hashtag||[]),B(i,b(t.link_rif,[]))]),r=["YouTube","TikTok","Instagram","Link tuoi"],s={};for(let d=0;d<4;d++){let m=e[d];if(m.status==="rejected"){await f(a,t.id,"Ricerca",`${r[d]}: ${m.reason?.message||m.reason}`,"warn"),s[r[d]]=[];continue}let E=Array.isArray(m.value)?m.value:m.value.video;m.value.nota&&await f(a,t.id,"Ricerca",m.value.nota,"warn"),s[r[d]]=E,(d<3||E.length)&&await f(a,t.id,"Ricerca",`${r[d]}: ${E.length} video trovati`)}let n=[...s["Link tuoi"]],l=["YouTube","TikTok","Instagram"].filter(d=>s[d].length),c=l.length?Math.max(1,Math.floor(Math.max(i.NUM_RIFERIMENTI-n.length,l.length)/l.length)):0;for(let d of l){let m=new Set;n.push(...s[d].map(E=>({...E,punteggio:X(E)})).sort((E,la)=>la.punteggio-E.punteggio).filter(E=>!m.has(E.id)&&m.add(E.id)).slice(0,c))}let p=new Set;if(n.splice(0,n.length,...n.filter(d=>{let m=`${d.piattaforma}:${d.id}`;return!p.has(m)&&p.add(m)})),!n.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let v=n.map(d=>({video:d,stato:"da_guardare"}));await g(a,"UPDATE lavori SET candidati=?, riferimenti=? WHERE id=?",JSON.stringify(s),JSON.stringify(v),t.id),await f(a,t.id,"Direttore creativo",`scelgo ${v.length} video da far guardare a Gemini`)}async function Oa(a,i,t,o){let e=o.video,r=b(t.piano,{}).settore||"",{dati:s,daCache:n}=await aa(a,`rif:${e.piattaforma}:${e.id}`,async()=>{if(e.piattaforma==="youtube")return U(i,e.url,Q(r));if(!e.video_url)throw new Error("nessun file video scaricabile");let l=e.video_url.includes("api.apify.com")?{authorization:`Bearer ${i.APIFY_TOKEN}`}:{};return $(i,e.video_url,`${e.piattaforma}_${e.id}`,Q(r),null,l)});return await f(a,t.id,"Occhi (Gemini)",`${n?"gi\xE0 visto":"guardato"}: ${e.piattaforma} \xB7 ${(e.titolo||e.url).slice(0,60)}`),s}async function Ra(a,i,t,o){let e=b(t.riferimenti,[]);for(;Date.now()<o;){let r=e.filter(n=>n.stato==="da_guardare").slice(0,_a);if(!r.length)break;let s=await Promise.allSettled(r.map(n=>Oa(a,i,t,n)));s.forEach((n,l)=>{n.status==="fulfilled"?Object.assign(r[l],{stato:"fatto",analisi:n.value}):Object.assign(r[l],{stato:"saltato",errore:String(n.reason?.message||n.reason).slice(0,300)})});for(let[n,l]of s.entries())l.status==="rejected"&&await f(a,t.id,"Occhi (Gemini)",`saltato ${r[n].video.piattaforma} ${r[n].video.id}: ${r[n].errore}`,"warn");await g(a,"UPDATE lavori SET riferimenti=? WHERE id=?",JSON.stringify(e),t.id)}if(e.some(r=>r.stato==="da_guardare"))return!1;if(!e.some(r=>r.stato==="fatto"))throw new Error("Gemini non \xE8 riuscito a guardare nessun riferimento");return!0}async function ka(a,i,t,o){if(!t.pcloud)return await f(a,t.id,"Analista","nessuna cartella pCloud: lavoro solo sui riferimenti"),!0;let e=b(t.clip,null);if(!e){let r=await q(t.pcloud);if(!r.length)throw new Error("nella cartella pCloud non ci sono video");e=r.map(s=>({...s,stato:"da_guardare"})),await g(a,"UPDATE lavori SET clip=? WHERE id=?",JSON.stringify(e),t.id),await f(a,t.id,"Analista",`${e.length} clip trovate su pCloud`)}for(;Date.now()<o;){let r=e.filter(n=>n.stato==="da_guardare").slice(0,2);if(!r.length)break;(await Promise.allSettled(r.map(async n=>{let{dati:l,daCache:c}=await aa(a,`clip:${n.hash}:${n.dimensione}`,async()=>{let p=await W(t.pcloud,n.fileid);return $(i,p,n.nome,Ia(t.prompt),2)});return await f(a,t.id,"Analista",`${c?"gi\xE0 vista":"guardata"}: ${n.nome}`),l}))).forEach((n,l)=>{n.status==="fulfilled"?Object.assign(r[l],{stato:"fatto",analisi:n.value}):Object.assign(r[l],{stato:"saltato",errore:String(n.reason?.message||n.reason).slice(0,300)})});for(let n of r)n.stato==="saltato"&&await f(a,t.id,"Analista",`saltata ${n.nome}: ${n.errore}`,"warn");await g(a,"UPDATE lavori SET clip=? WHERE id=?",JSON.stringify(e),t.id)}return!e.some(r=>r.stato==="da_guardare")}async function Na(a,i,t){await f(a,t.id,"Direttore creativo","incrocio riferimenti e clip, scrivo la scheda tecnica");let o=b(t.riferimenti,[]).filter(s=>s.stato==="fatto").map(s=>({piattaforma:s.video.piattaforma,url:s.video.url,views:s.video.views,likes:s.video.likes,scelto_da_johnny:!!s.video.scelto_da_johnny,analisi:s.analisi})),e=(b(t.clip,[])||[]).filter(s=>s.stato==="fatto").map(s=>({file:s.nome,tecnico:s.tecnico,...s.analisi})),r=await P(i,Sa,ya(t.prompt,b(t.piano,{}),o,e),{maxTokens:8e3});await g(a,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(r),t.id),await f(a,t.id,"Direttore creativo",`scheda pronta: ${r.titolo_lavoro||""}`)}async function Ca(a,i,t,o){for(;Date.now()<o;){t=await I(a,"SELECT * FROM lavori WHERE id=?",t.id);let e=!0;if(t.fase==="piano"?await xa(a,i,t):t.fase==="ricerca"?await Aa(a,i,t):t.fase==="riferimenti"?e=await Ra(a,i,t,o):t.fase==="clip"?e=await ka(a,i,t,o):t.fase==="scheda"&&await Na(a,i,t),!e)return;let r=V[V.indexOf(t.fase)+1];if(await g(a,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",r,r==="fatto"?"pronto":"in_corso",_(),t.id),r==="fatto"){await f(a,t.id,"Regia","\u2705 lavoro pronto: apri la scheda");return}}}async function ta(a){let i=Date.now(),t=await x(a),o=_(),e=new Date(Date.now()+Ea*6e4).toISOString();for(let r=0;r<5&&Date.now()-i<Z-6e4;r++){let s=await S(a,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,e,o,o);if(!s.length)return;let n=s[0];try{await Ca(a,t,n,i+Z),await g(a,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",n.id)}catch(l){let c=String(l?.message||l).slice(0,500),p=n.tentativi>=3;await g(a,"UPDATE lavori SET stato=?, errore=?, blocco_fino=NULL, aggiornato=? WHERE id=?",p?"errore":"in_corso",c,_(),n.id),await f(a,n.id,"Regia",`${p?"\u274C fermo":"\u26A0\uFE0F riprovo"} (fase ${n.fase}): ${c}`,p?"errore":"warn")}}}var ia=`<!DOCTYPE html>
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
@media(max-width:600px){main{padding:12px}.kv{grid-template-columns:1fr}.kv b{margin-top:6px}}
</style></head><body>
<header><div class="logo">momento<small>reel \xB7 regia</small></div><nav id="nav"></nav></header>
<main id="app"><div class="vuoto">Carico\u2026</div></main>
<script>
const $ = (s) => document.querySelector(s);
const e = (s) => String(s ?? '\u2014').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (x) => (Number(x) || 0).toLocaleString('it-IT');
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Gemini guarda'],['clip','Analista'],['scheda','Scheda'],['fatto','Pronto']];
let timer = null;

async function chiama(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/api/accedi') { accesso(); throw new Error('accesso'); }
  if (!r.ok) throw new Error(d.errore || 'errore ' + r.status);
  return d;
}

function menu(on) {
  $('#nav').innerHTML = on ? '<a class="btn sec" href="#/">Lavori</a><a class="btn" href="#/nuovo">+ Reel</a><a class="btn sec" href="#/impostazioni" title="Impostazioni">\u2699\uFE0E</a>' : '';
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
    '<h2>Cosa stanno facendo gli agenti</h2><div class="log">' + L.registro.map((r) => '<div class="' + r.livello + '"><span class="mut">' + new Date(r.quando).toLocaleTimeString('it-IT') + '</span> <b>' + e(r.agente) + '</b> ' + e(r.messaggio) + '</div>').join('') + '</div>';
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
    try { await chiama('/api/impostazioni', { method: 'POST', body }); impostazioni(); } catch (x) { $('#er').textContent = x.message; }
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
    else await lista();
  } catch (x) { if (x.message !== 'accesso') $('#app').innerHTML = '<div class="card err">' + e(x.message) + '</div>'; }
}
addEventListener('hashchange', rotta);
rotta();
<\/script></body></html>`;var h=(a,i=200,t={})=>new Response(JSON.stringify(a),{status:i,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...t}}),ra=a=>[...new Uint8Array(a)].map(i=>i.toString(16).padStart(2,"0")).join(""),na=async a=>ra(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(a)));async function z(a){return a.ADMIN_PASSWORD?na("momento-reel|"+a.ADMIN_PASSWORD):(await I(a,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function sa(a){let i=await crypto.subtle.importKey("raw",new TextEncoder().encode(a),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return ra(await crypto.subtle.sign("HMAC",i,new TextEncoder().encode("momento-reel-sessione")))}async function ea(a,i){let t=await z(i);if(!t)return!1;let o=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(a.headers.get("cookie")||"");return!!o&&o[1]===await sa(t)}var oa=(a,i)=>`mr_s=${a}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${i}`;async function Pa(a,i,t){let o=t.pathname,e=a.method;if(o==="/api/stato")return h({configurato:!!await z(i),dentro:await ea(a,i)});if(o==="/api/accedi"&&e==="POST"){let{password:s}=await a.json().catch(()=>({}));if(!s||String(s).length<6)return h({errore:"password di almeno 6 caratteri"},400);let n=await z(i),l=na("momento-reel|"+s);if(!n)n=await l,await g(i,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",n);else if(await l!==n)return h({errore:"password errata"},401);return h({ok:!0},200,{"set-cookie":oa(await sa(n),3600*24*60)})}if(o==="/api/esci")return h({ok:!0},200,{"set-cookie":oa("",0)});if(!await ea(a,i))return h({errore:"accesso richiesto"},401);if(o==="/api/impostazioni"&&e==="GET"){let s=await x(i),n=Object.fromEntries(y.map(c=>{let p=s[c];return[c,{impostata:!!p,da_cloudflare:s._env[c],anteprima:p?"\u2022\u2022\u2022\u2022"+String(p).slice(-4):""}]})),l=Object.fromEntries(R.map(c=>[c,Array.isArray(s[c])?s[c].join(","):s[c]]));return h({segreti:n,opzioni:l})}if(o==="/api/impostazioni"&&e==="POST"){let s=await a.json().catch(()=>({})),n=[];for(let l of[...y,...R]){if(typeof s[l]!="string")continue;let c=s[l].trim();n.push(c?i.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(l,c):i.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(l))}return n.length&&await i.DB.batch(n),h({ok:!0})}if(o==="/api/lavori"&&e==="GET"){let s=await S(i,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return h(s)}if(o==="/api/lavori"&&e==="POST"){let s=await a.json().catch(()=>({})),n=String(s.prompt||"").trim();if(n.length<10)return h({errore:"descrivi il reel in almeno una frase"},400);let l=String(s.pcloud||"").trim()||null;if(l&&!/code=/.test(l))return h({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let c=String(s.link_rif||"").split(/\s+/).filter(v=>/^https?:\/\//.test(v)).slice(0,10),p=await I(i,"INSERT INTO lavori (prompt, pcloud, link_rif, creato, aggiornato) VALUES (?,?,?,?,?) RETURNING id",n,l,JSON.stringify(c),_(),_());return await f(i,p.id,"Regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),h({id:p.id})}let r=o.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro))?$/);if(r){let s=Number(r[1]);if(!r[2]&&e==="GET"){let n=await I(i,"SELECT * FROM lavori WHERE id=?",s);if(!n)return h({errore:"non trovato"},404);for(let l of["piano","riferimenti","clip","scheda","link_rif"])n[l]=b(n[l]);return delete n.candidati,n.registro=await S(i,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",s),h(n)}if(!r[2]&&e==="DELETE")return await i.DB.batch([i.DB.prepare("DELETE FROM lavori WHERE id=?").bind(s),i.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(s)]),h({ok:!0});if(r[2]==="riprova"&&e==="POST"){let n=await a.json().catch(()=>({})),l=["piano","ricerca","riferimenti","clip","scheda"].includes(n.fase)?n.fase:null,c=await I(i,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",s);if(!c)return h({errore:"non trovato"},404);let p=l||(c.fase==="fatto"?"scheda":c.fase),v=d=>JSON.stringify((b(d,[])||[]).map(m=>m.stato==="saltato"?{...m,stato:"da_guardare",errore:void 0}:m));return await g(i,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",p,c.riferimenti?v(c.riferimenti):null,c.clip?v(c.clip):null,_(),s),await f(i,s,"Regia",`\u{1F501} riparto dalla fase "${p}"`),h({ok:!0})}}return h({errore:"non trovato"},404)}var Ga={async fetch(a,i){await O(i);let t=new URL(a.url);if(t.pathname.startsWith("/api/"))try{return await Pa(a,i,t)}catch(o){return h({errore:String(o?.message||o).slice(0,300)},500)}return new Response(ia,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(a,i,t){await O(i),t.waitUntil(ta(i))}};export{Ga as default};
