var A=()=>new Date().toISOString(),S=(t,i=null)=>{try{return t==null?i:JSON.parse(t)}catch{return i}},O=async(t,i,...e)=>(await t.DB.prepare(i).bind(...e).all()).results||[],y=(t,i,...e)=>t.DB.prepare(i).bind(...e).first(),x=(t,i,...e)=>t.DB.prepare(i).bind(...e).run(),K=!1;async function z(t){if(!K){await t.DB.batch([t.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),t.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),t.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),t.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),t.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]);for(let i of["motore_pass TEXT","motore_fino TEXT","motore_visto TEXT"])try{await t.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${i}`).run()}catch{}K=!0}}async function g(t,i,e,o,a="info"){await x(t,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",i,e,String(o).slice(0,600),a,A())}var D=["ANTHROPIC_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],M=["CLAUDE_MODEL","CLAUDE_MODEL_LIGHT","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA"];async function k(t){let i=Object.fromEntries((await O(t,"SELECT chiave, valore FROM impostazioni")).map(o=>[o.chiave,o.valore])),e=(o,a)=>t[o]||i[o]||a;return{ANTHROPIC_API_KEY:e("ANTHROPIC_API_KEY"),GEMINI_API_KEY:e("GEMINI_API_KEY"),YOUTUBE_API_KEY:e("YOUTUBE_API_KEY"),APIFY_TOKEN:e("APIFY_TOKEN"),CLAUDE_MODEL:e("CLAUDE_MODEL","claude-sonnet-5-5"),CLAUDE_MODEL_LIGHT:e("CLAUDE_MODEL_LIGHT","claude-haiku-5-5"),WEB_SEARCH_TOOL:e("WEB_SEARCH_TOOL","web_search_20250305"),GEMINI_MODELS:String(e("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(o=>o.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:e("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:e("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(e("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(e("DURATA_MAX",90)),MESI_RICERCA:Number(e("MESI_RICERCA",18)),FPS_ANALISI:Number(e("FPS_ANALISI",4)),_salvate:i,_env:Object.fromEntries(D.map(o=>[o,!!t[o]]))}}var Et={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},bt={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},wt={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},Tt=["alto","centro","terzo_inferiore"],At=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function U(){let t=["LOOK COLORE:"];for(let[i,e]of Object.entries(Et))t.push(`- ${i}: ${e}`);t.push(`
EFFETTI E TRANSIZIONI:`);for(let[i,e]of Object.entries(bt))t.push(`- ${i}: ${e}`);t.push(`
STILI TESTO:`);for(let[i,e]of Object.entries(wt))t.push(`- ${i}: ${e}`);return t.push(`
POSIZIONI TESTO: ${Tt.join(", ")}`),t.push(`MOOD MUSICA: ${At.join(", ")}`),t.join(`
`)}var B=t=>new Promise(i=>setTimeout(i,t));function W(t){if(t&&typeof t=="object")return t;let i=String(t||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(i)}catch{}for(let[e,o]of[["{","}"],["[","]"]]){let a=i.indexOf(e),n=i.lastIndexOf(o);if(a!==-1&&n>a)try{return JSON.parse(i.slice(a,n+1))}catch{}}throw new Error("risposta non in JSON: "+i.slice(0,300))}async function L(t,i={},e=4){let o;for(let a=0;a<e;a++)try{let n=await fetch(t,i);if([429,500,502,503,504,529].includes(n.status)){o=new Error(`HTTP ${n.status}: ${(await n.text()).slice(0,300)}`),await B(4e3*(a+1)*(n.status===429?3:1));continue}return n}catch(n){if(o=n,i.body&&typeof i.body!="string")break;await B(3e3*(a+1))}throw new Error(`richiesta fallita (${String(t).split("?")[0]}): ${o?.message||o}`)}async function j(t,i,e,{maxTokens:o=8e3,json:a=!0}={}){if(!t.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let n=await L("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:o,system:i,messages:[{role:"user",content:e}]})});if(n.status!==200)throw new Error(`Claude ${n.status}: ${(await n.text()).slice(0,400)}`);let s=await n.json(),r=(s.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");if(s.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata (troppo lunga): riprovo");return a?W(r):r}async function J(t,i,e,o,a,n=4e3){if(!t.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let s=[];for(let f of a)s.push({type:"text",text:`Immagine: ${f.cosa}`}),s.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:f.jpeg}});s.push({type:"text",text:o});let r=await L("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:i,max_tokens:n,system:e,messages:[{role:"user",content:s}]})}),c=await r.text();if(r.status!==200)throw r.status===429||/credit balance|billing/i.test(c)?new Error("LIMITE_CLAUDE: "+c.slice(0,200)):new Error(`Claude ${r.status}: ${c.slice(0,300)}`);let l=JSON.parse(c);if(l.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata");let d=W((l.content||[]).filter(f=>f.type==="text").map(f=>f.text).join(""));return d._uso=l.usage?{in:l.usage.input_tokens,out:l.usage.output_tokens,modello:i}:void 0,d}var xt=t=>{let i=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(t||"");return i?(+i[1]||0)*3600+(+i[2]||0)*60+(+i[3]||0):0};async function St(t,i){let e=await L("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:3e3,tools:[{type:t.WEB_SEARCH_TOOL,name:"web_search",max_uses:6}],messages:[{role:"user",content:`Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi pi\xF9 visti e apprezzati per queste ricerche: ${i.join(" | ")}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.`}]})});if(e.status!==200)throw new Error(`ricerca web ${e.status}: ${(await e.text()).slice(0,200)}`);let o=await e.json(),a=new Map,n=(l,d)=>{let f=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l||"");f&&!a.has(f[1])&&a.set(f[1],d||"")};for(let l of o.content||[])l.type==="web_search_tool_result"&&Array.isArray(l.content)&&l.content.forEach(d=>n(d.url,d.title));let r=[...(o.content||[]).filter(l=>l.type==="text").map(l=>l.text).join(`
`).matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(l=>l[1]).filter(l=>a.has(l)),c=[...new Set([...r,...a.keys()])].slice(0,12);return{video:c.map((l,d)=>({piattaforma:"youtube",id:l,url:`https://www.youtube.com/watch?v=${l}`,video_url:null,titolo:a.get(l)||"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0,data:"",ordine_web:d})),nota:c.length?null:"la ricerca web non ha trovato Shorts"}}async function X(t,i,e=15){if(!t.YOUTUBE_API_KEY)return St(t,i);let o=new Date(Date.now()-t.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),a=[];for(let n of i){let s=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:n,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:o,maxResults:e,key:t.YOUTUBE_API_KEY}).forEach(([c,l])=>s.searchParams.set(c,l));let r=await L(s.toString());if(r.status!==200)throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0,200)}`);a.push(...((await r.json()).items||[]).map(c=>c.id?.videoId).filter(Boolean))}return a=[...new Set(a)],{video:await V(t,a,t.DURATA_MAX)}}async function V(t,i,e=9999){let o=[];for(let a=0;a<i.length;a+=50){let n=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${i.slice(a,a+50).join(",")}&key=${t.YOUTUBE_API_KEY}`,s=await L(n);if(s.status===200)for(let r of(await s.json()).items||[]){let c=r.statistics||{},l=r.snippet||{},d=xt(r.contentDetails?.duration);!d||d>e||o.push({piattaforma:"youtube",id:r.id,url:`https://www.youtube.com/watch?v=${r.id}`,video_url:null,titolo:l.title||"",autore:l.channelTitle||"",views:+c.viewCount||0,likes:+c.likeCount||0,commenti:+c.commentCount||0,condivisioni:0,durata:d,data:l.publishedAt||""})}}return o}async function P(t,i,e){let o=`https://api.apify.com/v2/acts/${i.replace("/","~")}/run-sync-get-dataset-items?token=${t.APIFY_TOKEN}&timeout=280`,a=await L(o,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)},2);if(a.status!==200&&a.status!==201)throw new Error(`Apify ${i} ${a.status}: ${(await a.text()).slice(0,200)}`);let n=await a.json();return Array.isArray(n)?n:[]}var E=(t,...i)=>{for(let e of i){let o=t;for(let a of e.split("."))o=o==null?void 0:Array.isArray(o)&&/^\d+$/.test(a)?o[+a]:o[a];if(o!=null&&o!==""&&!(Array.isArray(o)&&!o.length))return o}},N=t=>Math.round(Number(t)||0);function Z(t){return{piattaforma:"tiktok",id:String(E(t,"id","video_id")||""),url:E(t,"webVideoUrl","url","detail_url")||"",video_url:E(t,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(E(t,"text","desc","ad_title")||"").slice(0,200),autore:E(t,"authorMeta.name","author","brand_name")||"",views:N(E(t,"playCount","views")),likes:N(E(t,"diggCount","likes")),commenti:N(E(t,"commentCount","comments")),condivisioni:N(E(t,"shareCount","shares")),durata:N(E(t,"videoMeta.duration","duration_sec","duration")),data:E(t,"createTimeISO")||""}}function Q(t){return{piattaforma:"instagram",id:String(E(t,"shortCode","id")||""),url:E(t,"url","reelURL")||"",video_url:E(t,"videoUrl","video_url")||null,titolo:String(E(t,"caption")||"").slice(0,200),autore:E(t,"ownerUsername")||"",views:N(E(t,"videoPlayCount","videoViewCount","views")),likes:N(E(t,"likesCount","likes")),commenti:N(E(t,"commentsCount","comments")),condivisioni:0,durata:N(E(t,"videoDuration","duration")),data:E(t,"timestamp")||"",_video:!!E(t,"videoUrl")||/video|clips/i.test(String(E(t,"type","productType")||""))}}async function tt(t,i,e,o=10){return t.APIFY_TOKEN?{video:(await P(t,t.APIFY_TIKTOK_ACTOR,{searchQueries:i,hashtags:e.map(n=>n.replace(/^#/,"")),searchSection:"/video",resultsPerPage:o,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(Z).filter(n=>n.id&&(!n.durata||n.durata<=t.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function it(t,i,e=15){return t.APIFY_TOKEN?{video:(await P(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:i.map(a=>`https://www.instagram.com/explore/tags/${a.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:e,addParentData:!1})).map(Q).filter(a=>a.id&&a._video&&(!a.durata||a.durata<=t.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function et(t,i){let e=[],o=[],a=[];for(let s of i){let r=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(s);r?e.push(r[1]):/tiktok\.com/.test(s)?o.push(s):/instagram\.com/.test(s)&&a.push(s)}let n=[];return e.length&&(t.YOUTUBE_API_KEY?n.push(...await V(t,e)):n.push(...e.map(s=>({piattaforma:"youtube",id:s,url:`https://www.youtube.com/watch?v=${s}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),(o.length||a.length)&&!t.APIFY_TOKEN&&(n.nota=`${o.length+a.length} link TikTok/Instagram non guardabili senza Apify`),o.length&&t.APIFY_TOKEN&&n.push(...(await P(t,t.APIFY_TIKTOK_ACTOR,{postURLs:o,shouldDownloadVideos:!0,resultsPerPage:1})).map(Z)),a.length&&t.APIFY_TOKEN&&n.push(...(await P(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:a,resultsType:"posts",resultsLimit:1})).map(Q)),{video:n.map(s=>({...s,scelto_da_johnny:!0})),nota:n.nota}}function at(t){if(!t.views&&t.ordine_web!==void 0)return 10-t.ordine_web*.1;let i=Math.max(t.views||0,1),e=((t.likes||0)+2*(t.commenti||0)+3*(t.condivisioni||0))/i;return Math.round((Math.log10(i+1)+Math.min(e,.3)*10)*1e3)/1e3}var It=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function yt(t){try{return new URL(t).searchParams.get("code")}catch{return null}}async function Ot(t,i,e){let o=yt(t);if(!o)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let a=/(^|\/\/)e\.|eapi/.test(t)?["eapi","api"]:["api","eapi"],n;for(let s of a){let r=new URL(`https://${s}.pcloud.com/${i}`);r.searchParams.set("code",o),Object.entries(e||{}).forEach(([l,d])=>r.searchParams.set(l,d));let c=await(await L(r.toString())).json();if(c.result===0)return c;n=c}throw new Error(`pCloud: ${n?.error||"errore "+n?.result}`)}async function ot(t){let i=await Ot(t,"showpublink",{}),e=[],o=(a,n="")=>{a.isfolder?(a.contents||[]).forEach(s=>o(s,n?`${n}/${a.name}`:a.name)):(a.category===2||It.test(a.name))&&e.push({fileid:a.fileid,nome:a.name,cartella:n,dimensione:a.size,hash:String(a.hash||a.fileid),tecnico:{durata_sec:a.duration?Number(a.duration):null,risoluzione:a.width?`${a.width}x${a.height}`:null,fps:a.fps?Number(a.fps):null,orientamento:a.width?a.height>a.width?"verticale":a.width>a.height?"orizzontale":"quadrato":null,rallenty_possibile:a.fps?Number(a.fps)>=48:null}})};return o(i.metadata),e}var nt=["piano","ricerca","riferimenti","clip","scheda","fatto"],Rt=12,st=9*6e4;var kt=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.`,Nt=t=>`RICHIESTA DI JOHNNY:
${t}

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
}`,ct=t=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
\xC8 un riferimento per un reel del settore "${t}".
Non vedi il video in movimento: ti do (1) una tavola con i primi 3 secondi (il gancio), (2) una tavola con un
fotogramma per ogni inquadratura, con il tempo scritto in giallo, (3) MISURE ESATTE fatte con ffmpeg e Whisper
(tagli, durate delle inquadrature, BPM, volume, parlato trascritto). Le misure sono vere: copiale cos\xEC come sono.
Il resto (testi a schermo, colore, inquadrature, effetti visibili) lo deduci dai fotogrammi. Quello che da
fotogrammi fermi non si pu\xF2 sapere (es. come si animano i testi, effetti sonori) scrivilo null o "non verificabile".
Non inventare. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${U()}

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
}`,lt=t=>`Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
per chi dovr\xE0 montare un reel verticale 9:16. Non vedi il video in movimento: ti do i fotogrammi in ordine di tempo
(tempo in giallo) e MISURE ESATTE: fps, risoluzione, durata; per ogni fotogramma nitidezza (varianza del laplaciano
su 480 px: sotto ~40 tende a mosso/sfocato, sopra ~150 \xE8 nitido), luminosit\xE0 0-255, % bruciato e % chiuso;
movimento tra fotogrammi (alto = camera o soggetto che si muovono); parlato trascritto da Whisper.
Usa le misure per qualit\xE0 e problemi, i fotogrammi per contenuto e inquadrature. Non inventare.

Contesto del lavoro: ${t}

Rispondi SOLO con JSON:
{
  "descrizione": "cosa c'\xE8 nella clip in una frase",
  "luogo_luce": "interno/esterno, tipo di luce",
  "momenti": [{"da": n, "a": n, "cosa_succede": "...", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro",
    "movimento_camera": "statico|panoramica|carrellata|gimbal|mano_libera|drone", "soggetti": ["..."],
    "qualita": 1-5, "uso_consigliato": "gancio|sviluppo|climax|chiusura|b_roll|scartare", "perche": "..."}],
  "problemi": [{"da": n, "a": n, "tipo": "mosso|fuori_fuoco|sovraesposto|sottoesposto|rumore_audio|altro", "nota": "..."}],
  "parlato": {"presente": bool, "sintesi": "di cosa si parla, o null"},
  "adatta_al_verticale": "si|serve_reframe|solo_con_sfondo_sfocato",
  "note_montaggio": "consigli pratici per usarla"
}`,Ct=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`,Lt=(t,i,e,o)=>`RICHIESTA DI JOHNNY:
${t}

PIANO: ${JSON.stringify(i)}

LIBRERIA:
${U()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di pi\xF9):
${JSON.stringify(e)}

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
}`;async function Dt(t,i,e){await g(t,e.id,"direttore","leggo la richiesta e preparo la ricerca");let o=await j(i,kt,Nt(e.prompt),{maxTokens:1500});await x(t,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(o),e.id),await g(t,e.id,"direttore",`settore: ${o.settore} \xB7 obiettivo: ${o.obiettivo||"-"}`)}async function Pt(t,i,e){let o=S(e.piano,{}),a=["YouTube","TikTok","Instagram","Link tuoi"],n=["scout_yt","scout_tt","scout_ig","direttore"];await g(t,e.id,"scout_yt",`${i.YOUTUBE_API_KEY?"cerco Shorts":"cerco Shorts sul web"}: ${(o.youtube_query||[]).join(" \xB7 ")}`),i.APIFY_TOKEN&&(await g(t,e.id,"scout_tt",`cerco su TikTok: ${[...o.tiktok_query||[],...(o.tiktok_hashtag||[]).map(m=>"#"+m)].join(" \xB7 ")}`),await g(t,e.id,"scout_ig",`cerco reel: ${(o.instagram_hashtag||[]).map(m=>"#"+m).join(" \xB7 ")}`));let s=await Promise.allSettled([X(i,o.youtube_query||[]),tt(i,o.tiktok_query||[],o.tiktok_hashtag||[]),it(i,o.instagram_hashtag||[]),et(i,S(e.link_rif,[]))]),r={};for(let m=0;m<4;m++){let u=s[m];if(u.status==="rejected"){await g(t,e.id,n[m],`${a[m]}: ${u.reason?.message||u.reason}`,"warn"),r[a[m]]=[];continue}let h=Array.isArray(u.value)?u.value:u.value.video;r[a[m]]=h,!((m===1||m===2)&&!i.APIFY_TOKEN)&&(u.value.nota&&await g(t,e.id,n[m],u.value.nota,"warn"),(m<3||h.length)&&await g(t,e.id,n[m],m<3?`trovati ${h.length} video`:`i tuoi link: ${h.length} video`))}let c=[...r["Link tuoi"]],l=["YouTube","TikTok","Instagram"].filter(m=>r[m].length),d=l.length?Math.max(1,Math.floor(Math.max(i.NUM_RIFERIMENTI-c.length,l.length)/l.length)):0;for(let m of l){let u=new Set;c.push(...r[m].map(h=>({...h,punteggio:at(h)})).sort((h,w)=>w.punteggio-h.punteggio).filter(h=>!u.has(h.id)&&u.add(h.id)).slice(0,d))}let f=new Set;if(c.splice(0,c.length,...c.filter(m=>{let u=`${m.piattaforma}:${m.id}`;return!f.has(u)&&f.add(u)})),!c.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let p=c.map(m=>({video:m,stato:"da_guardare"}));await x(t,"UPDATE lavori SET candidati=?, riferimenti=?, motore_visto=NULL WHERE id=?",JSON.stringify(r),JSON.stringify(p),e.id),await g(t,e.id,"direttore",`scelgo ${p.length} reel da far guardare a Iris`)}async function $t(t,i,e){let o=S(e.riferimenti,[]);if(!e.motore_visto){let a=0;for(let n of o){if(n.stato!=="da_guardare")continue;let s=await y(t,"SELECT dati FROM cache_analisi WHERE chiave=?",H(n.video));s&&(Object.assign(n,{stato:"fatto",analisi:S(s.dati,{})}),a++)}await x(t,"UPDATE lavori SET riferimenti=?, motore_visto=? WHERE id=?",JSON.stringify(o),A(),e.id),a&&await g(t,e.id,"occhi",`${a} reel gi\xE0 visti in passato: non li riguardo`),o.some(n=>n.stato==="da_guardare")&&await g(t,e.id,"motore",`chiamo il motore GitHub: scarico e misuro ${o.filter(n=>n.stato==="da_guardare").length} reel di riferimento`)}if(o.some(a=>a.stato==="da_guardare"))return dt(t,e);if(!o.some(a=>a.stato==="fatto"))throw new Error("nessun reel di riferimento \xE8 stato analizzato (vedi il registro)");return await x(t,"UPDATE lavori SET motore_visto=NULL WHERE id=?",e.id),!0}async function dt(t,i){return i.motore_visto&&Date.now()-new Date(i.motore_visto)>75*6e4&&!(i.motore_fino&&i.motore_fino>A())&&(await g(t,i.id,"motore","il motore GitHub non si fa vivo da pi\xF9 di un'ora: controlla GitHub \u2192 momento-montaggio \u2192 Actions","warn"),await x(t,"UPDATE lavori SET motore_visto=? WHERE id=?",A(),i.id)),!1}var H=t=>`rif2:${t.piattaforma}:${t.id}`;async function zt(t,i,e){if(!e.pcloud)return await g(t,e.id,"analista","nessuna cartella pCloud: lavoro solo sui riferimenti"),!0;let o=S(e.clip,null);if(!o){let a=await ot(e.pcloud);if(!a.length)throw new Error("nella cartella pCloud non ci sono video");o=a.map(r=>({...r,stato:"da_guardare"}));let n=0;for(let r of o){let c=await y(t,"SELECT dati FROM cache_analisi WHERE chiave=?",G(r));if(c){let l=S(c.dati,{});Object.assign(r,{stato:"fatto",analisi:l.analisi||l,tecnico:l.tecnico||r.tecnico}),n++}}await x(t,"UPDATE lavori SET clip=?, motore_visto=? WHERE id=?",JSON.stringify(o),A(),e.id);let s=Math.round(o.reduce((r,c)=>r+(c.dimensione||0),0)/1073741824*10)/10;await g(t,e.id,"analista",`${o.length} clip trovate su pCloud (${s} GB)${n?`, ${n} gi\xE0 viste in passato`:""}`),o.some(r=>r.stato==="da_guardare")&&await g(t,e.id,"motore","chiamo il motore GitHub: scarico e misuro le clip per Ada")}return o.some(a=>a.stato==="da_guardare")?dt(t,e):!0}var G=t=>`clip2:${t.hash}:${t.dimensione}`;async function Mt(t,i,e){await g(t,e.id,"direttore","incrocio riferimenti e clip, scrivo la scheda tecnica");let o=S(e.riferimenti,[]).filter(s=>s.stato==="fatto").map(s=>({piattaforma:s.video.piattaforma,url:s.video.url,views:s.video.views,likes:s.video.likes,scelto_da_johnny:!!s.video.scelto_da_johnny,analisi:s.analisi})),a=(S(e.clip,[])||[]).filter(s=>s.stato==="fatto").map(s=>({file:s.nome,tecnico:s.tecnico,...s.analisi})),n=await j(i,Ct,Lt(e.prompt,S(e.piano,{}),o,a),{maxTokens:16e3});await x(t,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(n),e.id),await g(t,e.id,"direttore",`scheda pronta: ${n.titolo_lavoro||""}`)}async function Ut(t,i,e,o){for(;Date.now()<o;){e=await y(t,"SELECT * FROM lavori WHERE id=?",e.id);let a=!0;if(e.fase==="piano"?await Dt(t,i,e):e.fase==="ricerca"?await Pt(t,i,e):e.fase==="riferimenti"?a=await $t(t,i,e):e.fase==="clip"?a=await zt(t,i,e):e.fase==="scheda"&&await Mt(t,i,e),!a)return"attesa";let n=nt[nt.indexOf(e.fase)+1];if(await x(t,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",n,n==="fatto"?"pronto":"in_corso",A(),e.id),n==="fatto"){await g(t,e.id,"regia","\u2705 lavoro pronto: apri la scheda");return}}}async function pt(t){let i=Date.now(),e=await k(t),o=A(),a=new Date(Date.now()+Rt*6e4).toISOString();for(let n=0;n<5&&Date.now()-i<st-6e4;n++){let s=await O(t,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,a,o,o);if(!s.length)return;let r=s[0];try{await Ut(t,e,r,i+st)==="attesa"?await x(t,"UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?",new Date(Date.now()+5e4).toISOString(),r.id):await x(t,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",r.id)}catch(c){let l=String(c?.message||c).slice(0,500),d=r.tentativi>=3||/manca la chiave/.test(l),f=new Date(Date.now()+2*6e4).toISOString();await x(t,"UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?",d?"errore":"in_corso",l,d?null:f,A(),r.id);let p=(await y(t,"SELECT fase FROM lavori WHERE id=?",r.id))?.fase||r.fase;await g(t,r.id,"regia",`${d?"\u274C fermo":"\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${p}): ${l}`,d?"errore":"warn")}}}var jt="johnhant91/momento-montaggio",Ht="momento-reel",Gt={riferimenti:"riferimenti",clip:"clip"},I=(t,i=200)=>new Response(JSON.stringify(t),{status:i,headers:{"content-type":"application/json","cache-control":"no-store"}}),Y=t=>Uint8Array.from(atob(t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=")),i=>i.charCodeAt(0));async function Yt(t){let e=String(t||"").replace(/^Bearer\s+/i,"").trim().split(".");if(e.length!==3)return null;let o,a;try{o=JSON.parse(new TextDecoder().decode(Y(e[0]))),a=JSON.parse(new TextDecoder().decode(Y(e[1])))}catch{return null}let n=Array.isArray(a.aud)?a.aud:[a.aud];if(a.iss!=="https://token.actions.githubusercontent.com"||!n.includes(Ht)||String(a.repository||"").toLowerCase()!==jt||!a.exp||a.exp*1e3<Date.now())return null;let r=((await(await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cf:{cacheTtl:3600,cacheEverything:!0}})).json()).keys||[]).find(d=>d.kid===o.kid);if(!r)return null;let c=await crypto.subtle.importKey("jwk",r,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},!1,["verify"]);return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",c,Y(e[2]),new TextEncoder().encode(e[0]+"."+e[1]))?a:null}var Ft=t=>{try{return new URL(t).searchParams.get("code")}catch{return null}};async function F(t,i,e,o,a){await x(t,`UPDATE lavori SET ${e}=json_set(${e}, ?, json(?)), motore_visto=? WHERE id=?`,`$[${Math.trunc(o)}]`,JSON.stringify(a),A(),i)}var $=t=>`EXISTS (SELECT 1 FROM json_each(lavori.${t}) WHERE json_extract(value, '$.stato')='da_guardare')`;async function ut(t,i,e){let o=e.pathname,a=t.method;if(o==="/api/motore/coda"&&a==="GET"){let u=await y(i,`SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${$("riferimenti")}) OR (fase='clip' AND clip IS NOT NULL AND ${$("clip")}))`);return I({lavoro:(u?.n||0)>0})}if(o==="/api/motore/prossimo"&&a==="POST"){if(!await Yt(t.headers.get("authorization")))return I({errore:"motore non riconosciuto"},401);let u=A(),h=[...crypto.getRandomValues(new Uint8Array(24))].map(v=>v.toString(16).padStart(2,"0")).join(""),w=await y(i,`UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${$("riferimenti")}) OR
          (fase='clip' AND clip IS NOT NULL AND ${$("clip")}))
        ORDER BY id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip`,h,new Date(Date.now()+55*6e4).toISOString(),u,u);if(!w)return new Response(null,{status:204});let R=w.fase,C=S(R==="riferimenti"?w.riferimenti:w.clip,[]).map((v,T)=>[v,T]).filter(([v])=>v.stato==="da_guardare").map(([v,T])=>R==="riferimenti"?{indice:T,nome:`${v.video.piattaforma} \xB7 ${(v.video.titolo||v.video.url||"").slice(0,60)}`,url:v.video.url,video_url:v.video.video_url?v.video.video_url.includes("api.apify.com")?`${e.origin}/api/motore/${w.id}/scarica?i=${T}&tipo=riferimenti&pass=${h}`:v.video.video_url:null}:{indice:T,nome:v.nome,fileid:v.fileid,dimensione:v.dimensione});return await g(i,w.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: ${C.length} ${R==="riferimenti"?"reel da scaricare e misurare":"clip da scaricare e misurare"}`),I({id:w.id,tipo:R,pass:h,pcloud_code:Ft(w.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(w.pcloud||""),elementi:C})}let n=o.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica)$/);if(!n)return I({errore:"non trovato"},404);let s=Number(n[1]),r=await y(i,"SELECT id, prompt, piano, fase, riferimenti, clip, motore_pass FROM lavori WHERE id=?",s),c=t.headers.get("x-pass")||e.searchParams.get("pass")||"";if(!r||!r.motore_pass||c.length<32||c!==r.motore_pass)return I({errore:"lasciapassare non valido"},403);let l=Gt[e.searchParams.get("tipo")]||(r.fase==="riferimenti"?"riferimenti":"clip"),d=S(r[l],[]),f=Number(e.searchParams.get("i")),p=d[f],m=u=>l==="riferimenti"?`${u.video.piattaforma} ${u.video.id}`:u.nome;if(n[2]==="scarica"&&a==="GET"){if(!p?.video?.video_url)return I({errore:"niente da scaricare"},404);let u=await k(i),h=await fetch(p.video.video_url,{headers:{authorization:`Bearer ${u.APIFY_TOKEN}`}});return new Response(h.body,{status:h.status,headers:{"content-type":h.headers.get("content-type")||"video/mp4",...h.headers.get("content-length")?{"content-length":h.headers.get("content-length")}:{}}})}if(n[2]==="elemento"&&a==="POST"){if(!p)return I({errore:"elemento sconosciuto"},400);let u=await t.json().catch(()=>null);if(!u?.misure||!Array.isArray(u.immagini)||!u.immagini.length)return I({errore:"dati mancanti"},400);let h=await k(i),w=l==="riferimenti",R=w?"occhi":"analista",_=u.misure;await g(i,s,R,`sto guardando ${w?p.video.piattaforma+" \xB7 "+(p.video.titolo||p.video.url).slice(0,50):p.nome} (${_.tecnico?.risoluzione||"?"} \xB7 ${_.tecnico?.fps||"?"} fps \xB7 ${_.numero_tagli} tagli${_.bpm_stimato?" \xB7 "+_.bpm_stimato+" BPM":""})`);try{let C=w?ct(S(r.piano,{}).settore||""):lt(r.prompt),v=`MISURE ESATTE (ffmpeg + Whisper):
${JSON.stringify(_)}

Rispondi SOLO con il JSON richiesto.`,T=await J(h,w?h.CLAUDE_MODEL:h.CLAUDE_MODEL_LIGHT,C,v,u.immagini.slice(0,3),w?5e3:3500);return w?(Object.assign(T,{numero_tagli:_.numero_tagli,durata_media_inquadratura_sec:_.durata_media_inquadratura_sec,durata_sec:_.tecnico?.durata_sec}),T.audio={...T.audio||{},bpm_stimato:_.bpm_stimato??T.audio?.bpm_stimato??null,volume_lufs:_.volume_lufs},T.misure={tagli_sec:_.tagli_sec,piu_breve:_.inquadratura_piu_breve_sec,piu_lunga:_.inquadratura_piu_lunga_sec,tagli_sul_beat_indice:_.tagli_sul_beat_indice,parlato:_.parlato},Object.assign(p,{stato:"fatto",analisi:T,errore:void 0}),await i.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(H(p.video),JSON.stringify(T),A()).run()):(T.misure={qualita:_.qualita_fotogrammi,movimento:_.movimento_tra_fotogrammi,tagli_interni_sec:_.tagli_sec,volume_lufs:_.volume_lufs,parlato:_.parlato},Object.assign(p,{stato:"fatto",analisi:T,tecnico:{...p.tecnico||{},..._.tecnico},errore:void 0}),await i.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(G(p),JSON.stringify({analisi:T,tecnico:p.tecnico}),A()).run()),await F(i,s,l,f,p),await g(i,s,R,`guardato: ${w?p.video.piattaforma:p.nome} \u2014 ${String(w?T.perche_funziona||T.gancio?.cosa_succede:T.descrizione||"").slice(0,130)}`),I({ok:!0,uso:T._uso})}catch(C){let v=String(C?.message||C).slice(0,300);return v.startsWith("LIMITE_CLAUDE")?(await g(i,s,R,"\u23F8 Claude ha rifiutato per limite o credito esaurito: riprendo pi\xF9 tardi. "+v.slice(15,160),"warn"),I({errore:v},429)):(p.tentativi=(p.tentativi||0)+1,p.errore=v,p.stato=p.tentativi<3?"da_guardare":"saltato",await F(i,s,l,f,p),await g(i,s,R,`${m(p)}: ${v}${p.stato==="saltato"?" \u2014 saltato":` \u2014 riprovo (${p.tentativi}/3)`}`,"warn"),I({errore:v},502))}}if(n[2]==="errore"&&a==="POST"){if(!p)return I({errore:"elemento sconosciuto"},400);let u=await t.json().catch(()=>({}));return p.tentativi=(p.tentativi||0)+1,p.errore=String(u.errore||"errore del motore").slice(0,300),p.stato=p.tentativi<3&&!/YouTube non ha lasciato|HTTP 4\d\d/.test(p.errore)?"da_guardare":"saltato",await F(i,s,l,f,p),await g(i,s,"motore",`${m(p)}: ${p.errore}${p.stato==="saltato"?" \u2014 saltato":" \u2014 riprovo"}`,"warn"),I({ok:!0})}if(n[2]==="fine"&&a==="POST"){if(await x(i,"UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",A(),s),(await t.json().catch(()=>({}))).silenzioso)return I({ok:!0});let u=d.filter(h=>h.stato==="fatto").length;return await g(i,s,"motore",`giro del motore finito: ${u}/${d.length} ${l==="riferimenti"?"reel":"clip"} analizzati`),I({ok:!0})}return I({errore:"metodo non consentito"},405)}var mt=`<!DOCTYPE html>
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
.riposo{opacity:.4}.lavora .av:after{background:var(--ok)}.coda .av:after{background:var(--warn)}.errore .av:after{background:var(--err)}
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
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Studio reel'],['clip','Analista'],['scheda','Scheda'],['fatto','Pronto']];
let timer = null;

const AGENTI = {
  direttore: { n: 'Leo', r: 'Direttore creativo', i: '\u{1F3AC}', c: '#12a3a4', s: 'direzione', d: 'Legge il tuo prompt, capisce settore, obiettivo e pubblico, decide cosa cercare. Alla fine incrocia riferimenti e clip e scrive la scheda tecnica per tutta la squadra.' },
  scout_yt: { n: 'Yuri', r: 'Scout YouTube Shorts', i: '\u25B6\uFE0F', c: '#e5483f', s: 'scouting', d: 'Cerca gli Shorts del settore pubblicati negli ultimi 18 mesi e li ordina per visualizzazioni e coinvolgimento (like, commenti).' },
  scout_tt: { n: 'Tea', r: 'Scout TikTok', i: '\u{1F3B5}', c: '#25d6ee', s: 'scouting', d: 'Cerca su TikTok per parole chiave e hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  scout_ig: { n: 'Ines', r: 'Scout Instagram', i: '\u{1F4F8}', c: '#d6409f', s: 'scouting', d: 'Cerca i reel pi\xF9 visti sugli hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  occhi: { n: 'Iris', r: 'Occhi \xB7 studia i reel', i: '\u{1F441}\uFE0F', c: '#8b7cf6', s: 'visione', d: 'Claude: guarda i fotogrammi chiave dei reel scelti (gancio + uno per inquadratura) insieme alle misure esatte di Max e li smonta: gancio, ritmo, testi, colore, effetti, musica, chiusura, perch\xE9 funzionano.' },
  analista: { n: 'Ada', r: 'Analista delle tue clip', i: '\u{1F50E}', c: '#f0b44c', s: 'visione', d: 'Claude: guarda i fotogrammi delle tue clip e le misure di Max e segna i momenti utili con i tempi, la qualit\xE0, i problemi (mosso, fuori fuoco, esposizione) e il parlato.' },
  motore: { n: 'Max', r: 'Motore GitHub \xB7 scarica e misura', i: '\u2699\uFE0F', c: '#9aa7ab', s: 'visione', d: 'Gira su GitHub Actions: scarica reel e clip, misura con ffmpeg i tagli esatti, la durata delle inquadrature, nitidezza, esposizione e movimento, stima i BPM, trascrive il parlato con Whisper ed estrae i fotogrammi chiave per Iris e Ada.' },
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
const FASE_AGENTI = { piano: ['direttore'], ricerca: ['scout_yt', 'scout_tt', 'scout_ig'], riferimenti: ['motore', 'occhi'], clip: ['motore', 'analista'], scheda: ['direttore'] };
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
  for (const a of R.riposo || []) stati[a] = { s: 'riposo' };
  if (R.yt_web) AGENTI.scout_yt.r = 'Scout YouTube Shorts \xB7 cerca sul web';
  const testoStato = { lavora: 'al lavoro', coda: 'parte a breve', errore: 'bloccato', riposo: 'a riposo' };
  const scr = (id) => {
    const A = AGENTI[id], st = stati[id] || {}, u = ultimo[id];
    const msg = st.s === 'riposo' ? 'spento: per TikTok e Instagram servirebbe Apify' : st.s === 'coda' ? 'tocca a me: parto entro un minuto\u2026' : u ? u.messaggio : 'pronto, aspetto un lavoro';
    return '<div class="scrivania ' + (st.s || '') + '" style="--c:' + (A.c || '#345') + '" data-ag="' + id + '"><div class="av">' + A.i + '</div><div class="chi"><b>' + e(A.n) + '</b><span class="stato-ag">' + (testoStato[st.s] || (A.s === 'post' ? '' : 'libero')) + '</span><div class="ruolo">' + e(A.r) + (conti[id] ? ' \xB7 ' + conti[id] + ' azioni in 7 gg' : '') + '</div>' +
      (A.s === 'post' ? '' : '<div class="schermo">' + e(msg) + '</div>' + (u && !st.s ? '<div class="mut" style="font-size:11px;margin-top:3px">' + fa(u.quando) + (u.lavoro_id ? ' \xB7 lavoro #' + u.lavoro_id : '') + '</div>' : '')) + '</div></div>';
  };
  const attivi = R.attivi.map((L) => { const i = FASI.findIndex((f) => f[0] === L.fase);
    return '<a class="card attivo" href="#/lavoro/' + L.id + '"><div class="riga"><b style="flex:1">#' + L.id + ' \xB7 ' + e(L.settore || L.prompt.slice(0, 60)) + '</b><span class="pill in_corso">' + FASI[i][1] + '\u2026</span></div><div class="fasi">' + FASI.map((f, k) => '<div class="' + (k < i ? 'ok' : k === i ? 'ora' : '') + '"></div>').join('') + '</div></a>'; }).join('');
  const manca = Object.entries(R.chiavi || {}).filter(([, v]) => !v).map(([k]) => k);
  const avviso = manca.length ? '<a class="card attivo" href="#/impostazioni" style="border-color:var(--warn)"><b style="color:var(--warn)">\u26A0\uFE0E Mancano le chiavi: ' + manca.join(', ') + '</b><div class="mut">' + (manca.includes('Claude') ? 'Senza Claude la squadra non pu\xF2 partire.' : 'Senza queste la ricerca salta alcune piattaforme.') + ' Tocca qui per inserirle.</div></a>' : '';
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
  $('#app').innerHTML = '<h1>Nuovo reel</h1><p class="mut">Il Direttore creativo cerca i video che funzionano nel settore su YouTube, TikTok e Instagram, il motore li misura, Iris li studia, l\\'Analista studia le tue clip e alla fine ricevi la scheda tecnica.</p>' +
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

const NOMI = { ANTHROPIC_API_KEY: ['Claude', 'console.anthropic.com \u2192 API Keys'], GEMINI_API_KEY: ['Gemini (gli occhi)', 'aistudio.google.com/apikey'], YOUTUBE_API_KEY: ['YouTube Data API v3 (facoltativa: senza, Yuri cerca sul web)', 'console.cloud.google.com \u2192 abilita \u201CYouTube Data API v3\u201D \u2192 Credenziali \u2192 Chiave API'], APIFY_TOKEN: ['Apify (facoltativa: TikTok e Instagram)', 'console.apify.com \u2192 Settings \u2192 API & Integrations'] };
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
<\/script></body></html>`;var b=(t,i=200,e={})=>new Response(JSON.stringify(t),{status:i,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...e}}),ht=t=>[...new Uint8Array(t)].map(i=>i.toString(16).padStart(2,"0")).join(""),vt=async t=>ht(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)));async function q(t){return t.ADMIN_PASSWORD?vt("momento-reel|"+t.ADMIN_PASSWORD):(await y(t,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function _t(t){let i=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return ht(await crypto.subtle.sign("HMAC",i,new TextEncoder().encode("momento-reel-sessione")))}async function ft(t,i){let e=await q(i);if(!e)return!1;let o=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(t.headers.get("cookie")||"");return!!o&&o[1]===await _t(e)}var gt=(t,i)=>`mr_s=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${i}`;async function qt(t,i,e){let o=e.pathname,a=t.method;if(o==="/api/stato")return b({configurato:!!await q(i),dentro:await ft(t,i)});if(o==="/api/accedi"&&a==="POST"){let{password:r}=await t.json().catch(()=>({}));if(!r||String(r).length<6)return b({errore:"password di almeno 6 caratteri"},400);let c=await q(i),l=vt("momento-reel|"+r);if(!c)c=await l,await x(i,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",c);else if(await l!==c)return b({errore:"password errata"},401);return b({ok:!0},200,{"set-cookie":gt(await _t(c),3600*24*60)})}if(o==="/api/esci")return b({ok:!0},200,{"set-cookie":gt("",0)});if(!await ft(t,i))return b({errore:"accesso richiesto"},401);if(o==="/api/impostazioni"&&a==="GET"){let r=await k(i),c=Object.fromEntries(D.map(d=>{let f=r[d];return[d,{impostata:!!f,da_cloudflare:r._env[d],anteprima:f?"\u2022\u2022\u2022\u2022"+String(f).slice(-4):""}]})),l=Object.fromEntries(M.map(d=>[d,Array.isArray(r[d])?r[d].join(","):r[d]]));return b({segreti:c,opzioni:l})}if(o==="/api/impostazioni"&&a==="POST"){let r=await t.json().catch(()=>({})),c=[];for(let l of[...D,...M]){if(typeof r[l]!="string")continue;let d=r[l].trim();c.push(d?i.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(l,d):i.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(l))}return c.length&&await i.DB.batch(c),b({ok:!0})}if(o==="/api/regia"&&a==="GET"){let[r,c,l,d]=await Promise.all([O(i,"SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),O(i,"SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),O(i,"SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),O(i,"SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente",new Date(Date.now()-6048e5).toISOString())]),f=await k(i),p={Claude:!!f.ANTHROPIC_API_KEY},m=f.APIFY_TOKEN?[]:["scout_tt","scout_ig"];return b({adesso:A(),attivi:r,ultimi:c,feed:l,conti:d,chiavi:p,riposo:m,yt_web:!f.YOUTUBE_API_KEY})}let n=o.match(/^\/api\/regia\/agente\/([a-z_]+)$/);if(n&&a==="GET")return b(await O(i,"SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40",n[1]));if(o==="/api/lavori"&&a==="GET"){let r=await O(i,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return b(r)}if(o==="/api/lavori"&&a==="POST"){let r=await t.json().catch(()=>({})),c=String(r.prompt||"").trim();if(c.length<10)return b({errore:"descrivi il reel in almeno una frase"},400);let l=await k(i),d=[["ANTHROPIC_API_KEY","Claude"]].filter(([u])=>!l[u]).map(([,u])=>u);if(d.length)return b({errore:`Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${d.join(", ")})`},400);let f=String(r.pcloud||"").trim()||null;if(f&&!/code=/.test(f))return b({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let p=String(r.link_rif||"").split(/\s+/).filter(u=>/^https?:\/\//.test(u)).slice(0,10),m=await y(i,"INSERT INTO lavori (prompt, pcloud, link_rif, creato, aggiornato) VALUES (?,?,?,?,?) RETURNING id",c,f,JSON.stringify(p),A(),A());return await g(i,m.id,"regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),b({id:m.id})}let s=o.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro))?$/);if(s){let r=Number(s[1]);if(!s[2]&&a==="GET"){let c=await y(i,"SELECT * FROM lavori WHERE id=?",r);if(!c)return b({errore:"non trovato"},404);for(let l of["piano","riferimenti","clip","scheda","link_rif"])c[l]=S(c[l]);return delete c.candidati,c.registro=await O(i,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",r),b(c)}if(!s[2]&&a==="DELETE")return await i.DB.batch([i.DB.prepare("DELETE FROM lavori WHERE id=?").bind(r),i.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(r)]),b({ok:!0});if(s[2]==="riprova"&&a==="POST"){let c=await t.json().catch(()=>({})),l=["piano","ricerca","riferimenti","clip","scheda"].includes(c.fase)?c.fase:null,d=await y(i,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",r);if(!d)return b({errore:"non trovato"},404);let f=l||(d.fase==="fatto"?"scheda":d.fase),p=m=>JSON.stringify((S(m,[])||[]).map(u=>u.stato==="saltato"?{...u,stato:"da_guardare",errore:void 0}:u));return await x(i,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",f,d.riferimenti?p(d.riferimenti):null,d.clip?p(d.clip):null,A(),r),await g(i,r,"regia",`\u{1F501} riparto dalla fase "${f}"`),b({ok:!0})}}return b({errore:"non trovato"},404)}var ri={async fetch(t,i){await z(i);let e=new URL(t.url);if(e.pathname.startsWith("/api/motore/"))try{return await ut(t,i,e)}catch(o){return b({errore:String(o?.message||o).slice(0,300)},500)}if(e.pathname.startsWith("/api/"))try{return await qt(t,i,e)}catch(o){return b({errore:String(o?.message||o).slice(0,300)},500)}return new Response(mt,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(t,i,e){await z(i),e.waitUntil(pt(i))}};export{ri as default};
