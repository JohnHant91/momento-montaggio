var E=()=>new Date().toISOString(),T=(t,a=null)=>{try{return t==null?a:JSON.parse(t)}catch{return a}},A=async(t,a,...e)=>(await t.DB.prepare(a).bind(...e).all()).results||[],x=(t,a,...e)=>t.DB.prepare(a).bind(...e).first(),_=(t,a,...e)=>t.DB.prepare(a).bind(...e).run(),F=!1;async function C(t){if(!F){await t.DB.batch([t.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),t.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),t.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),t.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),t.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]);for(let a of["motore_pass TEXT","motore_fino TEXT","motore_visto TEXT"])try{await t.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${a}`).run()}catch{}F=!0}}async function f(t,a,e,o,i="info"){await _(t,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",a,e,String(o).slice(0,600),i,E())}var k=["ANTHROPIC_API_KEY","GEMINI_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],P=["CLAUDE_MODEL","GEMINI_MODELS","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA","FPS_ANALISI"];async function O(t){let a=Object.fromEntries((await A(t,"SELECT chiave, valore FROM impostazioni")).map(o=>[o.chiave,o.valore])),e=(o,i)=>t[o]||a[o]||i;return{ANTHROPIC_API_KEY:e("ANTHROPIC_API_KEY"),GEMINI_API_KEY:e("GEMINI_API_KEY"),YOUTUBE_API_KEY:e("YOUTUBE_API_KEY"),APIFY_TOKEN:e("APIFY_TOKEN"),CLAUDE_MODEL:e("CLAUDE_MODEL","claude-sonnet-5-5"),WEB_SEARCH_TOOL:e("WEB_SEARCH_TOOL","web_search_20250305"),GEMINI_MODELS:String(e("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(o=>o.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:e("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:e("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(e("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(e("DURATA_MAX",90)),MESI_RICERCA:Number(e("MESI_RICERCA",18)),FPS_ANALISI:Number(e("FPS_ANALISI",4)),_salvate:a,_env:Object.fromEntries(k.map(o=>[o,!!t[o]]))}}var vt={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},bt={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},Et={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},_t=["alto","centro","terzo_inferiore"],wt=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function D(){let t=["LOOK COLORE:"];for(let[a,e]of Object.entries(vt))t.push(`- ${a}: ${e}`);t.push(`
EFFETTI E TRANSIZIONI:`);for(let[a,e]of Object.entries(bt))t.push(`- ${a}: ${e}`);t.push(`
STILI TESTO:`);for(let[a,e]of Object.entries(Et))t.push(`- ${a}: ${e}`);return t.push(`
POSIZIONI TESTO: ${_t.join(", ")}`),t.push(`MOOD MUSICA: ${wt.join(", ")}`),t.join(`
`)}var L=t=>new Promise(a=>setTimeout(a,t));function H(t){if(t&&typeof t=="object")return t;let a=String(t||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(a)}catch{}for(let[e,o]of[["{","}"],["[","]"]]){let i=a.indexOf(e),n=a.lastIndexOf(o);if(i!==-1&&n>i)try{return JSON.parse(a.slice(i,n+1))}catch{}}throw new Error("risposta non in JSON: "+a.slice(0,300))}async function I(t,a={},e=4){let o;for(let i=0;i<e;i++)try{let n=await fetch(t,a);if([429,500,502,503,504,529].includes(n.status)){o=new Error(`HTTP ${n.status}: ${(await n.text()).slice(0,300)}`),await L(4e3*(i+1)*(n.status===429?3:1));continue}return n}catch(n){if(o=n,a.body&&typeof a.body!="string")break;await L(3e3*(i+1))}throw new Error(`richiesta fallita (${String(t).split("?")[0]}): ${o?.message||o}`)}async function z(t,a,e,{maxTokens:o=8e3,json:i=!0}={}){if(!t.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let n=await I("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:o,system:a,messages:[{role:"user",content:e}]})});if(n.status!==200)throw new Error(`Claude ${n.status}: ${(await n.text()).slice(0,400)}`);let c=await n.json(),r=(c.content||[]).filter(s=>s.type==="text").map(s=>s.text).join("");if(c.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata (troppo lunga): riprovo");return i?H(r):r}var $="https://generativelanguage.googleapis.com";async function M(t,a,{bassa:e=!1}={}){if(!t.GEMINI_API_KEY)throw new Error("manca la chiave Gemini (Impostazioni)");let o={responseMimeType:"application/json",temperature:.2};e&&(o.mediaResolution="MEDIA_RESOLUTION_LOW");let i=JSON.stringify({contents:[{role:"user",parts:a}],generationConfig:o}),n=[];for(let c of t.GEMINI_MODELS){let r=await I(`${$}/v1beta/models/${c}:generateContent`,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":t.GEMINI_API_KEY},body:i}),s=await r.text();if(r.status===200){let p=(JSON.parse(s).candidates?.[0]?.content?.parts||[]).map(d=>d.text||"").join("");if(!p)throw new Error("Gemini senza risposta: "+s.slice(0,300));return H(p)}if((r.status===404||r.status===400)&&/not found|not supported|is not available/i.test(s)){n.push(c);continue}throw new Error(`Gemini ${r.status} (${c}): ${s.slice(0,400)}`)}throw new Error("nessun modello Gemini disponibile tra: "+n.join(", "))}function K(t,a,e,o){return M(t,[{fileData:{fileUri:a},videoMetadata:{fps:o||t.FPS_ANALISI}},{text:e}])}async function Tt(t,a,e,o={}){let i=await I(a,{headers:{"user-agent":"Mozilla/5.0",...o}});if(!i.ok)throw new Error(`download non riuscito (HTTP ${i.status}): link scaduto o non pubblico`);let n=(i.headers.get("content-type")||"").split(";")[0];n.startsWith("video/")||(n="video/mp4");let c=Number(i.headers.get("content-length")||0),r;if(c>0){let{readable:s,writable:l}=new FixedLengthStream(c);i.body.pipeTo(l).catch(()=>{}),r=s}else{let s=await i.arrayBuffer();if(s.byteLength>95*1024*1024)throw new Error("video senza dimensione dichiarata e troppo grande");c=s.byteLength,r=s}return B(t,r,c,n,e)}async function B(t,a,e,o,i){if(e>1900*1024*1024)throw new Error("video oltre 1,9 GB: troppo grande per Gemini");let n=await I(`${$}/upload/v1beta/files`,{method:"POST",headers:{"x-goog-api-key":t.GEMINI_API_KEY,"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":String(e),"X-Goog-Upload-Header-Content-Type":o,"content-type":"application/json"},body:JSON.stringify({file:{display_name:String(i).slice(0,120)}})}),c=n.headers.get("x-goog-upload-url");if(!c)throw new Error(`upload Gemini non avviato (${n.status}): ${(await n.text()).slice(0,200)}`);let s=(await(await I(c,{method:"POST",headers:{"Content-Length":String(e),"X-Goog-Upload-Offset":"0","X-Goog-Upload-Command":"upload, finalize"},body:a},1)).json()).file;if(!s?.name)throw new Error("upload Gemini fallito");for(let l=0;l<90;l++){if(s.state==="ACTIVE")return{uri:s.uri,mime:o};if(s.state==="FAILED")throw new Error("Gemini non \xE8 riuscito a leggere il video");await L(5e3),s=await(await I(`${$}/v1beta/${s.name}`,{headers:{"x-goog-api-key":t.GEMINI_API_KEY}})).json()}throw new Error("Gemini: tempo scaduto in elaborazione video")}async function q(t,a,e,o,i,n){if(!t.GEMINI_API_KEY)throw new Error("manca la chiave Gemini (Impostazioni)");let{uri:c,mime:r}=await B(t,a,e,"video/mp4",o);return M(t,[{fileData:{fileUri:c,mimeType:r},videoMetadata:{fps:n||t.FPS_ANALISI}},{text:i}],{bassa:!0})}async function X(t,a,e,o,i,n){let{uri:c,mime:r}=await Tt(t,a,e,n);return M(t,[{fileData:{fileUri:c,mimeType:r},videoMetadata:{fps:i||t.FPS_ANALISI}},{text:o}])}var xt=t=>{let a=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(t||"");return a?(+a[1]||0)*3600+(+a[2]||0)*60+(+a[3]||0):0};async function St(t,a){let e=await I("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:3e3,tools:[{type:t.WEB_SEARCH_TOOL,name:"web_search",max_uses:6}],messages:[{role:"user",content:`Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi pi\xF9 visti e apprezzati per queste ricerche: ${a.join(" | ")}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.`}]})});if(e.status!==200)throw new Error(`ricerca web ${e.status}: ${(await e.text()).slice(0,200)}`);let o=await e.json(),i=new Map,n=(l,p)=>{let d=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l||"");d&&!i.has(d[1])&&i.set(d[1],p||"")};for(let l of o.content||[])l.type==="web_search_tool_result"&&Array.isArray(l.content)&&l.content.forEach(p=>n(p.url,p.title));let r=[...(o.content||[]).filter(l=>l.type==="text").map(l=>l.text).join(`
`).matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(l=>l[1]).filter(l=>i.has(l)),s=[...new Set([...r,...i.keys()])].slice(0,12);return{video:s.map((l,p)=>({piattaforma:"youtube",id:l,url:`https://www.youtube.com/watch?v=${l}`,video_url:null,titolo:i.get(l)||"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0,data:"",ordine_web:p})),nota:s.length?null:"la ricerca web non ha trovato Shorts"}}async function J(t,a,e=15){if(!t.YOUTUBE_API_KEY)return St(t,a);let o=new Date(Date.now()-t.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),i=[];for(let n of a){let c=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:n,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:o,maxResults:e,key:t.YOUTUBE_API_KEY}).forEach(([s,l])=>c.searchParams.set(s,l));let r=await I(c.toString());if(r.status!==200)throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0,200)}`);i.push(...((await r.json()).items||[]).map(s=>s.id?.videoId).filter(Boolean))}return i=[...new Set(i)],{video:await W(t,i,t.DURATA_MAX)}}async function W(t,a,e=9999){let o=[];for(let i=0;i<a.length;i+=50){let n=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${a.slice(i,i+50).join(",")}&key=${t.YOUTUBE_API_KEY}`,c=await I(n);if(c.status===200)for(let r of(await c.json()).items||[]){let s=r.statistics||{},l=r.snippet||{},p=xt(r.contentDetails?.duration);!p||p>e||o.push({piattaforma:"youtube",id:r.id,url:`https://www.youtube.com/watch?v=${r.id}`,video_url:null,titolo:l.title||"",autore:l.channelTitle||"",views:+s.viewCount||0,likes:+s.likeCount||0,commenti:+s.commentCount||0,condivisioni:0,durata:p,data:l.publishedAt||""})}}return o}async function N(t,a,e){let o=`https://api.apify.com/v2/acts/${a.replace("/","~")}/run-sync-get-dataset-items?token=${t.APIFY_TOKEN}&timeout=280`,i=await I(o,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)},2);if(i.status!==200&&i.status!==201)throw new Error(`Apify ${a} ${i.status}: ${(await i.text()).slice(0,200)}`);let n=await i.json();return Array.isArray(n)?n:[]}var h=(t,...a)=>{for(let e of a){let o=t;for(let i of e.split("."))o=o==null?void 0:Array.isArray(o)&&/^\d+$/.test(i)?o[+i]:o[i];if(o!=null&&o!==""&&!(Array.isArray(o)&&!o.length))return o}},y=t=>Math.round(Number(t)||0);function V(t){return{piattaforma:"tiktok",id:String(h(t,"id","video_id")||""),url:h(t,"webVideoUrl","url","detail_url")||"",video_url:h(t,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(h(t,"text","desc","ad_title")||"").slice(0,200),autore:h(t,"authorMeta.name","author","brand_name")||"",views:y(h(t,"playCount","views")),likes:y(h(t,"diggCount","likes")),commenti:y(h(t,"commentCount","comments")),condivisioni:y(h(t,"shareCount","shares")),durata:y(h(t,"videoMeta.duration","duration_sec","duration")),data:h(t,"createTimeISO")||""}}function Z(t){return{piattaforma:"instagram",id:String(h(t,"shortCode","id")||""),url:h(t,"url","reelURL")||"",video_url:h(t,"videoUrl","video_url")||null,titolo:String(h(t,"caption")||"").slice(0,200),autore:h(t,"ownerUsername")||"",views:y(h(t,"videoPlayCount","videoViewCount","views")),likes:y(h(t,"likesCount","likes")),commenti:y(h(t,"commentsCount","comments")),condivisioni:0,durata:y(h(t,"videoDuration","duration")),data:h(t,"timestamp")||"",_video:!!h(t,"videoUrl")||/video|clips/i.test(String(h(t,"type","productType")||""))}}async function Q(t,a,e,o=10){return t.APIFY_TOKEN?{video:(await N(t,t.APIFY_TIKTOK_ACTOR,{searchQueries:a,hashtags:e.map(n=>n.replace(/^#/,"")),searchSection:"/video",resultsPerPage:o,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(V).filter(n=>n.id&&(!n.durata||n.durata<=t.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function tt(t,a,e=15){return t.APIFY_TOKEN?{video:(await N(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:a.map(i=>`https://www.instagram.com/explore/tags/${i.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:e,addParentData:!1})).map(Z).filter(i=>i.id&&i._video&&(!i.durata||i.durata<=t.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function at(t,a){let e=[],o=[],i=[];for(let c of a){let r=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(c);r?e.push(r[1]):/tiktok\.com/.test(c)?o.push(c):/instagram\.com/.test(c)&&i.push(c)}let n=[];return e.length&&(t.YOUTUBE_API_KEY?n.push(...await W(t,e)):n.push(...e.map(c=>({piattaforma:"youtube",id:c,url:`https://www.youtube.com/watch?v=${c}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),(o.length||i.length)&&!t.APIFY_TOKEN&&(n.nota=`${o.length+i.length} link TikTok/Instagram non guardabili senza Apify`),o.length&&t.APIFY_TOKEN&&n.push(...(await N(t,t.APIFY_TIKTOK_ACTOR,{postURLs:o,shouldDownloadVideos:!0,resultsPerPage:1})).map(V)),i.length&&t.APIFY_TOKEN&&n.push(...(await N(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:i,resultsType:"posts",resultsLimit:1})).map(Z)),{video:n.map(c=>({...c,scelto_da_johnny:!0})),nota:n.nota}}function et(t){if(!t.views&&t.ordine_web!==void 0)return 10-t.ordine_web*.1;let a=Math.max(t.views||0,1),e=((t.likes||0)+2*(t.commenti||0)+3*(t.condivisioni||0))/a;return Math.round((Math.log10(a+1)+Math.min(e,.3)*10)*1e3)/1e3}var At=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function It(t){try{return new URL(t).searchParams.get("code")}catch{return null}}async function yt(t,a,e){let o=It(t);if(!o)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let i=/(^|\/\/)e\.|eapi/.test(t)?["eapi","api"]:["api","eapi"],n;for(let c of i){let r=new URL(`https://${c}.pcloud.com/${a}`);r.searchParams.set("code",o),Object.entries(e||{}).forEach(([l,p])=>r.searchParams.set(l,p));let s=await(await I(r.toString())).json();if(s.result===0)return s;n=s}throw new Error(`pCloud: ${n?.error||"errore "+n?.result}`)}async function it(t){let a=await yt(t,"showpublink",{}),e=[],o=(i,n="")=>{i.isfolder?(i.contents||[]).forEach(c=>o(c,n?`${n}/${i.name}`:i.name)):(i.category===2||At.test(i.name))&&e.push({fileid:i.fileid,nome:i.name,cartella:n,dimensione:i.size,hash:String(i.hash||i.fileid),tecnico:{durata_sec:i.duration?Number(i.duration):null,risoluzione:i.width?`${i.width}x${i.height}`:null,fps:i.fps?Number(i.fps):null,orientamento:i.width?i.height>i.width?"verticale":i.width>i.height?"orizzontale":"quadrato":null,rallenty_possibile:i.fps?Number(i.fps)>=48:null}})};return o(a.metadata),e}var rt=["piano","ricerca","riferimenti","clip","scheda","fatto"],Ot=12,nt=9*6e4,Rt=3,kt=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
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
}`,st=t=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
\xC8 un riferimento per un reel del settore "${t}". Misura, non inventare: se un dato non \xE8 verificabile
scrivi null. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${D()}

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
}`,ct=t=>`Sei l'assistente al montaggio di un'agenzia video. Guarda e ascolta questa clip GREZZA
e descrivi cosa contiene per chi dovr\xE0 montare un reel verticale 9:16. Tempi precisi in secondi.
Non inventare: solo ci\xF2 che vedi e senti.

Contesto del lavoro: ${t}

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
}`,Ct=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`,Pt=(t,a,e,o)=>`RICHIESTA DI JOHNNY:
${t}

PIANO: ${JSON.stringify(a)}

LIBRERIA:
${D()}

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
}`;async function Dt(t,a,e){let o=await x(t,"SELECT dati FROM cache_analisi WHERE chiave=?",a);if(o)return{dati:T(o.dati),daCache:!0};let i=await e();return await _(t,"INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)",a,JSON.stringify(i),E()),{dati:i,daCache:!1}}async function Lt(t,a,e){await f(t,e.id,"direttore","leggo la richiesta e preparo la ricerca");let o=await z(a,kt,Nt(e.prompt),{maxTokens:1500});await _(t,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(o),e.id),await f(t,e.id,"direttore",`settore: ${o.settore} \xB7 obiettivo: ${o.obiettivo||"-"}`)}async function $t(t,a,e){let o=T(e.piano,{}),i=["YouTube","TikTok","Instagram","Link tuoi"],n=["scout_yt","scout_tt","scout_ig","direttore"];await f(t,e.id,"scout_yt",`${a.YOUTUBE_API_KEY?"cerco Shorts":"cerco Shorts sul web"}: ${(o.youtube_query||[]).join(" \xB7 ")}`),a.APIFY_TOKEN&&(await f(t,e.id,"scout_tt",`cerco su TikTok: ${[...o.tiktok_query||[],...(o.tiktok_hashtag||[]).map(u=>"#"+u)].join(" \xB7 ")}`),await f(t,e.id,"scout_ig",`cerco reel: ${(o.instagram_hashtag||[]).map(u=>"#"+u).join(" \xB7 ")}`));let c=await Promise.allSettled([J(a,o.youtube_query||[]),Q(a,o.tiktok_query||[],o.tiktok_hashtag||[]),tt(a,o.instagram_hashtag||[]),at(a,T(e.link_rif,[]))]),r={};for(let u=0;u<4;u++){let m=c[u];if(m.status==="rejected"){await f(t,e.id,n[u],`${i[u]}: ${m.reason?.message||m.reason}`,"warn"),r[i[u]]=[];continue}let b=Array.isArray(m.value)?m.value:m.value.video;r[i[u]]=b,!((u===1||u===2)&&!a.APIFY_TOKEN)&&(m.value.nota&&await f(t,e.id,n[u],m.value.nota,"warn"),(u<3||b.length)&&await f(t,e.id,n[u],u<3?`trovati ${b.length} video`:`i tuoi link: ${b.length} video`))}let s=[...r["Link tuoi"]],l=["YouTube","TikTok","Instagram"].filter(u=>r[u].length),p=l.length?Math.max(1,Math.floor(Math.max(a.NUM_RIFERIMENTI-s.length,l.length)/l.length)):0;for(let u of l){let m=new Set;s.push(...r[u].map(b=>({...b,punteggio:et(b)})).sort((b,w)=>w.punteggio-b.punteggio).filter(b=>!m.has(b.id)&&m.add(b.id)).slice(0,p))}let d=new Set;if(s.splice(0,s.length,...s.filter(u=>{let m=`${u.piattaforma}:${u.id}`;return!d.has(m)&&d.add(m)})),!s.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let g=s.map(u=>({video:u,stato:"da_guardare"}));await _(t,"UPDATE lavori SET candidati=?, riferimenti=? WHERE id=?",JSON.stringify(r),JSON.stringify(g),e.id),await f(t,e.id,"direttore",`scelgo ${g.length} video da far guardare a Gemini`)}async function zt(t,a,e,o){let i=o.video,n=T(e.piano,{}).settore||"";await x(t,"SELECT 1 FROM cache_analisi WHERE chiave=?",`rif:${i.piattaforma}:${i.id}`)||await f(t,e.id,"occhi",`sto guardando ${i.piattaforma} \xB7 ${(i.titolo||i.url).slice(0,60)} (${(i.views||0).toLocaleString("it-IT")} views)`);let{dati:c,daCache:r}=await Dt(t,`rif:${i.piattaforma}:${i.id}`,async()=>{if(i.piattaforma==="youtube")return K(a,i.url,st(n));if(!i.video_url)throw new Error("nessun file video scaricabile");let s=i.video_url.includes("api.apify.com")?{authorization:`Bearer ${a.APIFY_TOKEN}`}:{};return X(a,i.video_url,`${i.piattaforma}_${i.id}`,st(n),null,s)});return await f(t,e.id,"occhi",`${r?"gi\xE0 visto":"guardato"}: ${i.piattaforma} \xB7 ${(i.titolo||i.url).slice(0,60)}`),c}async function Mt(t,a,e,o){let i=T(e.riferimenti,[]);for(;Date.now()<o;){let n=i.filter(r=>r.stato==="da_guardare").slice(0,Rt);if(!n.length)break;let c=await Promise.allSettled(n.map(r=>zt(t,a,e,r)));c.forEach((r,s)=>{r.status==="fulfilled"?Object.assign(n[s],{stato:"fatto",analisi:r.value}):Object.assign(n[s],{stato:"saltato",errore:String(r.reason?.message||r.reason).slice(0,300)})});for(let[r,s]of c.entries())s.status==="rejected"&&await f(t,e.id,"occhi",`saltato ${n[r].video.piattaforma} ${n[r].video.id}: ${n[r].errore}`,"warn");await _(t,"UPDATE lavori SET riferimenti=? WHERE id=?",JSON.stringify(i),e.id)}if(i.some(n=>n.stato==="da_guardare"))return!1;if(!i.some(n=>n.stato==="fatto")){let n=i.find(c=>/manca la chiave/.test(c.errore||""));throw new Error(n?n.errore:"Gemini non \xE8 riuscito a guardare nessun riferimento")}return!0}async function Ut(t,a,e){if(!e.pcloud)return await f(t,e.id,"analista","nessuna cartella pCloud: lavoro solo sui riferimenti"),!0;let o=T(e.clip,null);if(!o){let i=await it(e.pcloud);if(!i.length)throw new Error("nella cartella pCloud non ci sono video");o=i.map(r=>({...r,stato:"da_guardare"}));let n=0;for(let r of o){let s=await x(t,"SELECT dati FROM cache_analisi WHERE chiave=?",U(r));if(s){let l=T(s.dati,{});Object.assign(r,{stato:"fatto",analisi:l.analisi||l,tecnico:l.tecnico||r.tecnico}),n++}}await _(t,"UPDATE lavori SET clip=?, motore_visto=? WHERE id=?",JSON.stringify(o),E(),e.id);let c=Math.round(o.reduce((r,s)=>r+(s.dimensione||0),0)/1073741824*10)/10;await f(t,e.id,"analista",`${o.length} clip trovate su pCloud (${c} GB)${n?`, ${n} gi\xE0 viste in passato`:""}`),o.some(r=>r.stato==="da_guardare")&&await f(t,e.id,"motore","chiamo il motore GitHub: scarico le clip e preparo le copie leggere per Ada")}return o.some(i=>i.stato==="da_guardare")?(e.motore_visto&&Date.now()-new Date(e.motore_visto)>45*6e4&&!(e.motore_fino&&e.motore_fino>E())&&(await f(t,e.id,"motore","il motore GitHub non risponde da 45 minuti: controlla GitHub \u2192 momento-montaggio \u2192 Actions","warn"),await _(t,"UPDATE lavori SET motore_visto=? WHERE id=?",E(),e.id)),!1):!0}var U=t=>`clip:${t.hash}:${t.dimensione}`;async function jt(t,a,e){await f(t,e.id,"direttore","incrocio riferimenti e clip, scrivo la scheda tecnica");let o=T(e.riferimenti,[]).filter(c=>c.stato==="fatto").map(c=>({piattaforma:c.video.piattaforma,url:c.video.url,views:c.video.views,likes:c.video.likes,scelto_da_johnny:!!c.video.scelto_da_johnny,analisi:c.analisi})),i=(T(e.clip,[])||[]).filter(c=>c.stato==="fatto").map(c=>({file:c.nome,tecnico:c.tecnico,...c.analisi})),n=await z(a,Ct,Pt(e.prompt,T(e.piano,{}),o,i),{maxTokens:16e3});await _(t,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(n),e.id),await f(t,e.id,"direttore",`scheda pronta: ${n.titolo_lavoro||""}`)}async function Gt(t,a,e,o){for(;Date.now()<o;){e=await x(t,"SELECT * FROM lavori WHERE id=?",e.id);let i=!0;if(e.fase==="piano"?await Lt(t,a,e):e.fase==="ricerca"?await $t(t,a,e):e.fase==="riferimenti"?i=await Mt(t,a,e,o):e.fase==="clip"?i=await Ut(t,a,e):e.fase==="scheda"&&await jt(t,a,e),!i)return"attesa";let n=rt[rt.indexOf(e.fase)+1];if(await _(t,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",n,n==="fatto"?"pronto":"in_corso",E(),e.id),n==="fatto"){await f(t,e.id,"regia","\u2705 lavoro pronto: apri la scheda");return}}}async function lt(t){let a=Date.now(),e=await O(t),o=E(),i=new Date(Date.now()+Ot*6e4).toISOString();for(let n=0;n<5&&Date.now()-a<nt-6e4;n++){let c=await A(t,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,i,o,o);if(!c.length)return;let r=c[0];try{await Gt(t,e,r,a+nt)==="attesa"?await _(t,"UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?",new Date(Date.now()+5e4).toISOString(),r.id):await _(t,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",r.id)}catch(s){let l=String(s?.message||s).slice(0,500),p=r.tentativi>=3||/manca la chiave/.test(l),d=new Date(Date.now()+2*6e4).toISOString();await _(t,"UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?",p?"errore":"in_corso",l,p?null:d,E(),r.id);let g=(await x(t,"SELECT fase FROM lavori WHERE id=?",r.id))?.fase||r.fase;await f(t,r.id,"regia",`${p?"\u274C fermo":"\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${g}): ${l}`,p?"errore":"warn")}}}var Yt="johnhant91/momento-montaggio",Ft="momento-reel",S=(t,a=200)=>new Response(JSON.stringify(t),{status:a,headers:{"content-type":"application/json","cache-control":"no-store"}}),j=t=>Uint8Array.from(atob(t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=")),a=>a.charCodeAt(0));async function Ht(t){let e=String(t||"").replace(/^Bearer\s+/i,"").trim().split(".");if(e.length!==3)return null;let o,i;try{o=JSON.parse(new TextDecoder().decode(j(e[0]))),i=JSON.parse(new TextDecoder().decode(j(e[1])))}catch{return null}let n=Array.isArray(i.aud)?i.aud:[i.aud];if(i.iss!=="https://token.actions.githubusercontent.com"||!n.includes(Ft)||String(i.repository||"").toLowerCase()!==Yt||!i.exp||i.exp*1e3<Date.now())return null;let r=((await(await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cf:{cacheTtl:3600,cacheEverything:!0}})).json()).keys||[]).find(p=>p.kid===o.kid);if(!r)return null;let s=await crypto.subtle.importKey("jwk",r,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},!1,["verify"]);return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",s,j(e[2]),new TextEncoder().encode(e[0]+"."+e[1]))?i:null}var Kt=t=>{try{return new URL(t).searchParams.get("code")}catch{return null}};async function G(t,a,e,o){await _(t,"UPDATE lavori SET clip=json_set(clip, ?, json(?)), motore_visto=? WHERE id=?",`$[${Math.trunc(e)}]`,JSON.stringify(o),E(),a)}async function dt(t,a,e){let o=e.pathname,i=t.method;if(o==="/api/motore/prossimo"&&i==="POST"){if(!await Ht(t.headers.get("authorization")))return S({errore:"motore non riconosciuto"},401);let g=E(),u=[...crypto.getRandomValues(new Uint8Array(24))].map(w=>w.toString(16).padStart(2,"0")).join(""),m=await x(a,`UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND fase='clip' AND clip IS NOT NULL
          AND EXISTS (SELECT 1 FROM json_each(lavori.clip) WHERE json_extract(value, '$.stato')='da_guardare')
          AND (motore_fino IS NULL OR motore_fino < ?) ORDER BY id LIMIT 1)
      RETURNING id, prompt, pcloud, clip`,u,new Date(Date.now()+50*6e4).toISOString(),g,g);if(!m)return new Response(null,{status:204});let b=T(m.clip,[]).map((w,R)=>({indice:R,fileid:w.fileid,nome:w.nome,dimensione:w.dimensione,tentativi:w.tentativi||0,stato:w.stato})).filter(w=>w.stato==="da_guardare");return await f(a,m.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: ${b.length} clip da scaricare e alleggerire`),S({id:m.id,pass:u,pcloud_code:Kt(m.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(m.pcloud),clip:b})}let n=o.match(/^\/api\/motore\/(\d+)\/(clip|errore|fine)$/);if(!n)return S({errore:"non trovato"},404);let c=Number(n[1]),r=await x(a,"SELECT id, prompt, clip, motore_pass, motore_fino, stato FROM lavori WHERE id=?",c),s=t.headers.get("x-pass")||"";if(!r||!r.motore_pass||s.length<32||s!==r.motore_pass)return S({errore:"lasciapassare non valido"},403);let l=T(r.clip,[]),p=Number(e.searchParams.get("i")),d=l[p];if(n[2]==="clip"&&i==="POST"){if(!d)return S({errore:"clip sconosciuta"},400);let g=Number(t.headers.get("content-length")||0);if(!g||g>400*1024*1024)return S({errore:"dimensione non valida"},400);let u={};try{u=JSON.parse(decodeURIComponent(t.headers.get("x-tecnico")||"{}"))}catch{}let m=await O(a);d.tecnico={...d.tecnico||{},...u},await f(a,c,"analista",`sto guardando ${d.nome} (${d.tecnico.risoluzione||"?"} \xB7 ${d.tecnico.fps||"?"} fps \xB7 ${d.tecnico.durata_sec||"?"} s)`);try{let{readable:b,writable:w}=new FixedLengthStream(g);t.body.pipeTo(w).catch(()=>{});let R=await q(m,b,g,d.nome,ct(r.prompt),1);return Object.assign(d,{stato:"fatto",analisi:R,errore:void 0}),await a.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(U(d),JSON.stringify({analisi:R,tecnico:d.tecnico}),E()).run(),await G(a,c,p,d),await f(a,c,"analista",`guardata: ${d.nome} \u2014 ${String(R.descrizione||"").slice(0,120)}`),S({ok:!0})}catch(b){let w=String(b?.message||b).slice(0,300);return d.tentativi=(d.tentativi||0)+1,d.errore=w,d.stato=d.tentativi<3&&!/manca la chiave/.test(w)?"da_guardare":"saltato",await G(a,c,p,d),await f(a,c,"analista",`${d.nome}: ${w}${d.stato==="saltato"?" \u2014 saltata":` \u2014 riprovo (${d.tentativi}/3)`}`,"warn"),S({errore:w},502)}}if(n[2]==="errore"&&i==="POST"){if(!d)return S({errore:"clip sconosciuta"},400);let g=await t.json().catch(()=>({}));return d.tentativi=(d.tentativi||0)+1,d.errore=String(g.errore||"errore del motore").slice(0,300),d.stato=d.tentativi<3?"da_guardare":"saltato",await G(a,c,p,d),await f(a,c,"motore",`${d.nome}: ${d.errore}${d.stato==="saltato"?" \u2014 saltata":" \u2014 riprovo"}`,"warn"),S({ok:!0})}if(n[2]==="fine"&&i==="POST"){await _(a,"UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",E(),c);let g=l.filter(u=>u.stato==="fatto").length;return await f(a,c,"motore",`giro del motore finito: ${g}/${l.length} clip guardate da Ada`),S({ok:!0})}return S({errore:"metodo non consentito"},405)}var pt=`<!DOCTYPE html>
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
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Gemini guarda'],['clip','Analista'],['scheda','Scheda'],['fatto','Pronto']];
let timer = null;

const AGENTI = {
  direttore: { n: 'Leo', r: 'Direttore creativo', i: '\u{1F3AC}', c: '#12a3a4', s: 'direzione', d: 'Legge il tuo prompt, capisce settore, obiettivo e pubblico, decide cosa cercare. Alla fine incrocia riferimenti e clip e scrive la scheda tecnica per tutta la squadra.' },
  scout_yt: { n: 'Yuri', r: 'Scout YouTube Shorts', i: '\u25B6\uFE0F', c: '#e5483f', s: 'scouting', d: 'Cerca gli Shorts del settore pubblicati negli ultimi 18 mesi e li ordina per visualizzazioni e coinvolgimento (like, commenti).' },
  scout_tt: { n: 'Tea', r: 'Scout TikTok', i: '\u{1F3B5}', c: '#25d6ee', s: 'scouting', d: 'Cerca su TikTok per parole chiave e hashtag del settore (via Apify) e recupera il video per farlo guardare a Gemma.' },
  scout_ig: { n: 'Ines', r: 'Scout Instagram', i: '\u{1F4F8}', c: '#d6409f', s: 'scouting', d: 'Cerca i reel pi\xF9 visti sugli hashtag del settore (via Apify) e recupera il video per farlo guardare a Gemma.' },
  occhi: { n: 'Gemma', r: 'Occhi \xB7 guarda i reel', i: '\u{1F441}\uFE0F', c: '#8b7cf6', s: 'visione', d: 'Gemini: guarda e ascolta i reel scelti e li smonta: gancio, numero di tagli, durata delle inquadrature, testi, colore, effetti, musica e BPM, chiusura.' },
  analista: { n: 'Ada', r: 'Analista delle tue clip', i: '\u{1F50E}', c: '#f0b44c', s: 'visione', d: 'Gemini: guarda le tue clip grezze da pCloud e segna i momenti utili con i tempi, la qualit\xE0, i problemi (mosso, fuori fuoco) e il parlato.' },
  motore: { n: 'Max', r: 'Motore GitHub \xB7 prepara le clip', i: '\u2699\uFE0F', c: '#9aa7ab', s: 'visione', d: 'Gira su GitHub Actions: scarica le tue clip da pCloud, legge risoluzione e fps veri e con ffmpeg ne fa copie leggere 720p (una clip da 500 MB diventa ~15 MB) da passare ad Ada. Si sveglia da solo ogni 5 minuti quando c\u2019\xE8 lavoro.' },
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
const FASE_AGENTI = { piano: ['direttore'], ricerca: ['scout_yt', 'scout_tt', 'scout_ig'], riferimenti: ['occhi'], clip: ['motore', 'analista'], scheda: ['direttore'] };
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
<\/script></body></html>`;var v=(t,a=200,e={})=>new Response(JSON.stringify(t),{status:a,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...e}}),ft=t=>[...new Uint8Array(t)].map(a=>a.toString(16).padStart(2,"0")).join(""),gt=async t=>ft(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)));async function Y(t){return t.ADMIN_PASSWORD?gt("momento-reel|"+t.ADMIN_PASSWORD):(await x(t,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function ht(t){let a=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return ft(await crypto.subtle.sign("HMAC",a,new TextEncoder().encode("momento-reel-sessione")))}async function ut(t,a){let e=await Y(a);if(!e)return!1;let o=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(t.headers.get("cookie")||"");return!!o&&o[1]===await ht(e)}var mt=(t,a)=>`mr_s=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${a}`;async function Bt(t,a,e){let o=e.pathname,i=t.method;if(o==="/api/stato")return v({configurato:!!await Y(a),dentro:await ut(t,a)});if(o==="/api/accedi"&&i==="POST"){let{password:r}=await t.json().catch(()=>({}));if(!r||String(r).length<6)return v({errore:"password di almeno 6 caratteri"},400);let s=await Y(a),l=gt("momento-reel|"+r);if(!s)s=await l,await _(a,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",s);else if(await l!==s)return v({errore:"password errata"},401);return v({ok:!0},200,{"set-cookie":mt(await ht(s),3600*24*60)})}if(o==="/api/esci")return v({ok:!0},200,{"set-cookie":mt("",0)});if(!await ut(t,a))return v({errore:"accesso richiesto"},401);if(o==="/api/impostazioni"&&i==="GET"){let r=await O(a),s=Object.fromEntries(k.map(p=>{let d=r[p];return[p,{impostata:!!d,da_cloudflare:r._env[p],anteprima:d?"\u2022\u2022\u2022\u2022"+String(d).slice(-4):""}]})),l=Object.fromEntries(P.map(p=>[p,Array.isArray(r[p])?r[p].join(","):r[p]]));return v({segreti:s,opzioni:l})}if(o==="/api/impostazioni"&&i==="POST"){let r=await t.json().catch(()=>({})),s=[];for(let l of[...k,...P]){if(typeof r[l]!="string")continue;let p=r[l].trim();s.push(p?a.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(l,p):a.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(l))}return s.length&&await a.DB.batch(s),v({ok:!0})}if(o==="/api/regia"&&i==="GET"){let[r,s,l,p]=await Promise.all([A(a,"SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),A(a,"SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),A(a,"SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),A(a,"SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente",new Date(Date.now()-6048e5).toISOString())]),d=await O(a),g={Claude:!!d.ANTHROPIC_API_KEY,Gemini:!!d.GEMINI_API_KEY},u=d.APIFY_TOKEN?[]:["scout_tt","scout_ig"];return v({adesso:E(),attivi:r,ultimi:s,feed:l,conti:p,chiavi:g,riposo:u,yt_web:!d.YOUTUBE_API_KEY})}let n=o.match(/^\/api\/regia\/agente\/([a-z_]+)$/);if(n&&i==="GET")return v(await A(a,"SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40",n[1]));if(o==="/api/lavori"&&i==="GET"){let r=await A(a,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return v(r)}if(o==="/api/lavori"&&i==="POST"){let r=await t.json().catch(()=>({})),s=String(r.prompt||"").trim();if(s.length<10)return v({errore:"descrivi il reel in almeno una frase"},400);let l=await O(a),p=[["ANTHROPIC_API_KEY","Claude"],["GEMINI_API_KEY","Gemini"]].filter(([m])=>!l[m]).map(([,m])=>m);if(p.length)return v({errore:`Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${p.join(", ")})`},400);let d=String(r.pcloud||"").trim()||null;if(d&&!/code=/.test(d))return v({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let g=String(r.link_rif||"").split(/\s+/).filter(m=>/^https?:\/\//.test(m)).slice(0,10),u=await x(a,"INSERT INTO lavori (prompt, pcloud, link_rif, creato, aggiornato) VALUES (?,?,?,?,?) RETURNING id",s,d,JSON.stringify(g),E(),E());return await f(a,u.id,"regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),v({id:u.id})}let c=o.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro))?$/);if(c){let r=Number(c[1]);if(!c[2]&&i==="GET"){let s=await x(a,"SELECT * FROM lavori WHERE id=?",r);if(!s)return v({errore:"non trovato"},404);for(let l of["piano","riferimenti","clip","scheda","link_rif"])s[l]=T(s[l]);return delete s.candidati,s.registro=await A(a,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",r),v(s)}if(!c[2]&&i==="DELETE")return await a.DB.batch([a.DB.prepare("DELETE FROM lavori WHERE id=?").bind(r),a.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(r)]),v({ok:!0});if(c[2]==="riprova"&&i==="POST"){let s=await t.json().catch(()=>({})),l=["piano","ricerca","riferimenti","clip","scheda"].includes(s.fase)?s.fase:null,p=await x(a,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",r);if(!p)return v({errore:"non trovato"},404);let d=l||(p.fase==="fatto"?"scheda":p.fase),g=u=>JSON.stringify((T(u,[])||[]).map(m=>m.stato==="saltato"?{...m,stato:"da_guardare",errore:void 0}:m));return await _(a,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",d,p.riferimenti?g(p.riferimenti):null,p.clip?g(p.clip):null,E(),r),await f(a,r,"regia",`\u{1F501} riparto dalla fase "${d}"`),v({ok:!0})}}return v({errore:"non trovato"},404)}var na={async fetch(t,a){await C(a);let e=new URL(t.url);if(e.pathname.startsWith("/api/motore/"))try{return await dt(t,a,e)}catch(o){return v({errore:String(o?.message||o).slice(0,300)},500)}if(e.pathname.startsWith("/api/"))try{return await Bt(t,a,e)}catch(o){return v({errore:String(o?.message||o).slice(0,300)},500)}return new Response(pt,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(t,a,e){await C(a),e.waitUntil(lt(a))}};export{na as default};
