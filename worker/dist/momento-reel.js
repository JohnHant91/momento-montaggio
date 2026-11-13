var E=()=>new Date().toISOString(),w=(t,e=null)=>{try{return t==null?e:JSON.parse(t)}catch{return e}},R=async(t,e,...i)=>(await t.DB.prepare(e).bind(...i).all()).results||[],y=(t,e,...i)=>t.DB.prepare(e).bind(...i).first(),S=(t,e,...i)=>t.DB.prepare(e).bind(...i).run(),W=!1;async function M(t){if(!W){await t.DB.batch([t.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),t.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),t.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),t.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),t.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]);for(let e of["motore_pass TEXT","motore_fino TEXT","motore_visto TEXT","montaggio TEXT"])try{await t.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${e}`).run()}catch{}W=!0}}async function g(t,e,i,a,o="info"){await S(t,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",e,i,String(a).slice(0,600),o,E())}var D=["ANTHROPIC_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],U=["CLAUDE_MODEL","CLAUDE_MODEL_LIGHT","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA"];async function k(t){let e=Object.fromEntries((await R(t,"SELECT chiave, valore FROM impostazioni")).map(a=>[a.chiave,a.valore])),i=(a,o)=>t[a]||e[a]||o;return{ANTHROPIC_API_KEY:i("ANTHROPIC_API_KEY"),GEMINI_API_KEY:i("GEMINI_API_KEY"),YOUTUBE_API_KEY:i("YOUTUBE_API_KEY"),APIFY_TOKEN:i("APIFY_TOKEN"),CLAUDE_MODEL:i("CLAUDE_MODEL","claude-sonnet-5-5"),CLAUDE_MODEL_LIGHT:i("CLAUDE_MODEL_LIGHT","claude-haiku-5-5"),WEB_SEARCH_TOOL:i("WEB_SEARCH_TOOL","web_search_20250305"),GEMINI_MODELS:String(i("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(a=>a.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:i("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:i("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(i("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(i("DURATA_MAX",90)),MESI_RICERCA:Number(i("MESI_RICERCA",18)),FPS_ANALISI:Number(i("FPS_ANALISI",4)),_salvate:e,_env:Object.fromEntries(D.map(a=>[a,!!t[a]]))}}var At={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},xt={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},It={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},yt=["alto","centro","terzo_inferiore"],Ot=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function j(){let t=["LOOK COLORE:"];for(let[e,i]of Object.entries(At))t.push(`- ${e}: ${i}`);t.push(`
EFFETTI E TRANSIZIONI:`);for(let[e,i]of Object.entries(xt))t.push(`- ${e}: ${i}`);t.push(`
STILI TESTO:`);for(let[e,i]of Object.entries(It))t.push(`- ${e}: ${i}`);return t.push(`
POSIZIONI TESTO: ${yt.join(", ")}`),t.push(`MOOD MUSICA: ${Ot.join(", ")}`),t.join(`
`)}var J=t=>new Promise(e=>setTimeout(e,t));function X(t){if(t&&typeof t=="object")return t;let e=String(t||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(e)}catch{}for(let[i,a]of[["{","}"],["[","]"]]){let o=e.indexOf(i),r=e.lastIndexOf(a);if(o!==-1&&r>o)try{return JSON.parse(e.slice(o,r+1))}catch{}}throw new Error("risposta non in JSON: "+e.slice(0,300))}async function z(t,e={},i=4){let a;for(let o=0;o<i;o++)try{let r=await fetch(t,e);if([429,500,502,503,504,529].includes(r.status)){a=new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,300)}`),await J(4e3*(o+1)*(r.status===429?3:1));continue}return r}catch(r){if(a=r,e.body&&typeof e.body!="string")break;await J(3e3*(o+1))}throw new Error(`richiesta fallita (${String(t).split("?")[0]}): ${a?.message||a}`)}async function L(t,e,i,{maxTokens:a=8e3,json:o=!0}={}){if(!t.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let r=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:a,system:e,messages:[{role:"user",content:i}]})});if(r.status!==200)throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0,400)}`);let c=await r.json(),d=(c.content||[]).filter(n=>n.type==="text").map(n=>n.text).join("");if(c.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata (troppo lunga): riprovo");return o?X(d):d}async function V(t,e,i,a,o,r=4e3){if(!t.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let c=[];for(let f of o)c.push({type:"text",text:`Immagine: ${f.cosa}`}),c.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:f.jpeg}});c.push({type:"text",text:a});let d=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:e,max_tokens:r,system:i,messages:[{role:"user",content:c}]})}),n=await d.text();if(d.status!==200)throw d.status===429||/credit balance|billing/i.test(n)?new Error("LIMITE_CLAUDE: "+n.slice(0,200)):new Error(`Claude ${d.status}: ${n.slice(0,300)}`);let s=JSON.parse(n);if(s.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata");let l=X((s.content||[]).filter(f=>f.type==="text").map(f=>f.text).join(""));return l._uso=s.usage?{in:s.usage.input_tokens,out:s.usage.output_tokens,modello:e}:void 0,l}var Rt=t=>{let e=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(t||"");return e?(+e[1]||0)*3600+(+e[2]||0)*60+(+e[3]||0):0};async function kt(t,e){let i=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":t.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:t.CLAUDE_MODEL,max_tokens:3e3,tools:[{type:t.WEB_SEARCH_TOOL,name:"web_search",max_uses:6}],messages:[{role:"user",content:`Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi pi\xF9 visti e apprezzati per queste ricerche: ${e.join(" | ")}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.`}]})});if(i.status!==200)throw new Error(`ricerca web ${i.status}: ${(await i.text()).slice(0,200)}`);let a=await i.json(),o=new Map,r=(s,l)=>{let f=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(s||"");f&&!o.has(f[1])&&o.set(f[1],l||"")};for(let s of a.content||[])s.type==="web_search_tool_result"&&Array.isArray(s.content)&&s.content.forEach(l=>r(l.url,l.title));let d=[...(a.content||[]).filter(s=>s.type==="text").map(s=>s.text).join(`
`).matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(s=>s[1]).filter(s=>o.has(s)),n=[...new Set([...d,...o.keys()])].slice(0,12);return{video:n.map((s,l)=>({piattaforma:"youtube",id:s,url:`https://www.youtube.com/watch?v=${s}`,video_url:null,titolo:o.get(s)||"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0,data:"",ordine_web:l})),nota:n.length?null:"la ricerca web non ha trovato Shorts"}}async function Z(t,e,i=15){if(!t.YOUTUBE_API_KEY)return kt(t,e);let a=new Date(Date.now()-t.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),o=[];for(let r of e){let c=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:r,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:a,maxResults:i,key:t.YOUTUBE_API_KEY}).forEach(([n,s])=>c.searchParams.set(n,s));let d=await z(c.toString());if(d.status!==200)throw new Error(`YouTube ${d.status}: ${(await d.text()).slice(0,200)}`);o.push(...((await d.json()).items||[]).map(n=>n.id?.videoId).filter(Boolean))}return o=[...new Set(o)],{video:await Q(t,o,t.DURATA_MAX)}}async function Q(t,e,i=9999){let a=[];for(let o=0;o<e.length;o+=50){let r=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${e.slice(o,o+50).join(",")}&key=${t.YOUTUBE_API_KEY}`,c=await z(r);if(c.status===200)for(let d of(await c.json()).items||[]){let n=d.statistics||{},s=d.snippet||{},l=Rt(d.contentDetails?.duration);!l||l>i||a.push({piattaforma:"youtube",id:d.id,url:`https://www.youtube.com/watch?v=${d.id}`,video_url:null,titolo:s.title||"",autore:s.channelTitle||"",views:+n.viewCount||0,likes:+n.likeCount||0,commenti:+n.commentCount||0,condivisioni:0,durata:l,data:s.publishedAt||""})}}return a}async function $(t,e,i){let a=`https://api.apify.com/v2/acts/${e.replace("/","~")}/run-sync-get-dataset-items?token=${t.APIFY_TOKEN}&timeout=280`,o=await z(a,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)},2);if(o.status!==200&&o.status!==201)throw new Error(`Apify ${e} ${o.status}: ${(await o.text()).slice(0,200)}`);let r=await o.json();return Array.isArray(r)?r:[]}var A=(t,...e)=>{for(let i of e){let a=t;for(let o of i.split("."))a=a==null?void 0:Array.isArray(a)&&/^\d+$/.test(o)?a[+o]:a[o];if(a!=null&&a!==""&&!(Array.isArray(a)&&!a.length))return a}},N=t=>Math.round(Number(t)||0);function tt(t){return{piattaforma:"tiktok",id:String(A(t,"id","video_id")||""),url:A(t,"webVideoUrl","url","detail_url")||"",video_url:A(t,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(A(t,"text","desc","ad_title")||"").slice(0,200),autore:A(t,"authorMeta.name","author","brand_name")||"",views:N(A(t,"playCount","views")),likes:N(A(t,"diggCount","likes")),commenti:N(A(t,"commentCount","comments")),condivisioni:N(A(t,"shareCount","shares")),durata:N(A(t,"videoMeta.duration","duration_sec","duration")),data:A(t,"createTimeISO")||""}}function et(t){return{piattaforma:"instagram",id:String(A(t,"shortCode","id")||""),url:A(t,"url","reelURL")||"",video_url:A(t,"videoUrl","video_url")||null,titolo:String(A(t,"caption")||"").slice(0,200),autore:A(t,"ownerUsername")||"",views:N(A(t,"videoPlayCount","videoViewCount","views")),likes:N(A(t,"likesCount","likes")),commenti:N(A(t,"commentsCount","comments")),condivisioni:0,durata:N(A(t,"videoDuration","duration")),data:A(t,"timestamp")||"",_video:!!A(t,"videoUrl")||/video|clips/i.test(String(A(t,"type","productType")||""))}}async function it(t,e,i,a=10){return t.APIFY_TOKEN?{video:(await $(t,t.APIFY_TIKTOK_ACTOR,{searchQueries:e,hashtags:i.map(r=>r.replace(/^#/,"")),searchSection:"/video",resultsPerPage:a,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(tt).filter(r=>r.id&&(!r.durata||r.durata<=t.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function ot(t,e,i=15){return t.APIFY_TOKEN?{video:(await $(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:e.map(o=>`https://www.instagram.com/explore/tags/${o.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:i,addParentData:!1})).map(et).filter(o=>o.id&&o._video&&(!o.durata||o.durata<=t.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function at(t,e){let i=[],a=[],o=[];for(let c of e){let d=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(c);d?i.push(d[1]):/tiktok\.com/.test(c)?a.push(c):/instagram\.com/.test(c)&&o.push(c)}let r=[];return i.length&&(t.YOUTUBE_API_KEY?r.push(...await Q(t,i)):r.push(...i.map(c=>({piattaforma:"youtube",id:c,url:`https://www.youtube.com/watch?v=${c}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),(a.length||o.length)&&!t.APIFY_TOKEN&&(r.nota=`${a.length+o.length} link TikTok/Instagram non guardabili senza Apify`),a.length&&t.APIFY_TOKEN&&r.push(...(await $(t,t.APIFY_TIKTOK_ACTOR,{postURLs:a,shouldDownloadVideos:!0,resultsPerPage:1})).map(tt)),o.length&&t.APIFY_TOKEN&&r.push(...(await $(t,t.APIFY_INSTAGRAM_ACTOR,{directUrls:o,resultsType:"posts",resultsLimit:1})).map(et)),{video:r.map(c=>({...c,scelto_da_johnny:!0})),nota:r.nota}}function rt(t){if(!t.views&&t.ordine_web!==void 0)return 10-t.ordine_web*.1;let e=Math.max(t.views||0,1),i=((t.likes||0)+2*(t.commenti||0)+3*(t.condivisioni||0))/e;return Math.round((Math.log10(e+1)+Math.min(i,.3)*10)*1e3)/1e3}var Nt=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function Ct(t){try{return new URL(t).searchParams.get("code")}catch{return null}}async function zt(t,e,i){let a=Ct(t);if(!a)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let o=/(^|\/\/)e\.|eapi/.test(t)?["eapi","api"]:["api","eapi"],r;for(let c of o){let d=new URL(`https://${c}.pcloud.com/${e}`);d.searchParams.set("code",a),Object.entries(i||{}).forEach(([s,l])=>d.searchParams.set(s,l));let n=await(await z(d.toString())).json();if(n.result===0)return n;r=n}throw new Error(`pCloud: ${r?.error||"errore "+r?.result}`)}async function nt(t){let e=await zt(t,"showpublink",{}),i=[],a=(o,r="")=>{o.isfolder?(o.contents||[]).forEach(c=>a(c,r?`${r}/${o.name}`:o.name)):(o.category===2||Nt.test(o.name))&&i.push({fileid:o.fileid,nome:o.name,cartella:r,dimensione:o.size,hash:String(o.hash||o.fileid),tecnico:{durata_sec:o.duration?Number(o.duration):null,risoluzione:o.width?`${o.width}x${o.height}`:null,fps:o.fps?Number(o.fps):null,orientamento:o.width?o.height>o.width?"verticale":o.width>o.height?"orizzontale":"quadrato":null,rallenty_possibile:o.fps?Number(o.fps)>=48:null}})};return a(e.metadata),i}var lt=["piano","ricerca","riferimenti","clip","scheda","regia","montaggio","fatto"],Dt=12,ct=9*6e4;var $t=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.`,Lt=t=>`RICHIESTA DI JOHNNY:
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
}`,dt=t=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.
\xC8 un riferimento per un reel del settore "${t}".
Non vedi il video in movimento: ti do (1) una tavola con i primi 3 secondi (il gancio), (2) una tavola con un
fotogramma per ogni inquadratura, con il tempo scritto in giallo, (3) MISURE ESATTE fatte con ffmpeg e Whisper
(tagli, durate delle inquadrature, BPM, volume, parlato trascritto). Le misure sono vere: copiale cos\xEC come sono.
Il resto (testi a schermo, colore, inquadrature, effetti visibili) lo deduci dai fotogrammi. Quello che da
fotogrammi fermi non si pu\xF2 sapere (es. come si animano i testi, effetti sonori) scrivilo null o "non verificabile".
Non inventare. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${j()}

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
}`,pt=t=>`Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
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
}`,Pt=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.`,Mt=(t,e,i,a)=>`RICHIESTA DI JOHNNY:
${t}

PIANO: ${JSON.stringify(e)}

LIBRERIA:
${j()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di pi\xF9):
${JSON.stringify(i)}

CLIP DISPONIBILI (analisi dell'Analista; pu\xF2 essere vuoto):
${JSON.stringify(a)}

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
}`;async function Ut(t,e,i){await g(t,i.id,"direttore","leggo la richiesta e preparo la ricerca");let a=await L(e,$t,Lt(i.prompt),{maxTokens:1500});await S(t,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(a),i.id),await g(t,i.id,"direttore",`settore: ${a.settore} \xB7 obiettivo: ${a.obiettivo||"-"}`)}async function jt(t,e,i){let a=w(i.piano,{}),o=["YouTube","TikTok","Instagram","Link tuoi"],r=["scout_yt","scout_tt","scout_ig","direttore"];await g(t,i.id,"scout_yt",`${e.YOUTUBE_API_KEY?"cerco Shorts":"cerco Shorts sul web"}: ${(a.youtube_query||[]).join(" \xB7 ")}`),e.APIFY_TOKEN&&(await g(t,i.id,"scout_tt",`cerco su TikTok: ${[...a.tiktok_query||[],...(a.tiktok_hashtag||[]).map(h=>"#"+h)].join(" \xB7 ")}`),await g(t,i.id,"scout_ig",`cerco reel: ${(a.instagram_hashtag||[]).map(h=>"#"+h).join(" \xB7 ")}`));let c=await Promise.allSettled([Z(e,a.youtube_query||[]),it(e,a.tiktok_query||[],a.tiktok_hashtag||[]),ot(e,a.instagram_hashtag||[]),at(e,w(i.link_rif,[]))]),d={};for(let h=0;h<4;h++){let u=c[h];if(u.status==="rejected"){await g(t,i.id,r[h],`${o[h]}: ${u.reason?.message||u.reason}`,"warn"),d[o[h]]=[];continue}let m=Array.isArray(u.value)?u.value:u.value.video;d[o[h]]=m,!((h===1||h===2)&&!e.APIFY_TOKEN)&&(u.value.nota&&await g(t,i.id,r[h],u.value.nota,"warn"),(h<3||m.length)&&await g(t,i.id,r[h],h<3?`trovati ${m.length} video`:`i tuoi link: ${m.length} video`))}let n=[...d["Link tuoi"]],s=["YouTube","TikTok","Instagram"].filter(h=>d[h].length),l=s.length?Math.max(1,Math.floor(Math.max(e.NUM_RIFERIMENTI-n.length,s.length)/s.length)):0;for(let h of s){let u=new Set;n.push(...d[h].map(m=>({...m,punteggio:rt(m)})).sort((m,v)=>v.punteggio-m.punteggio).filter(m=>!u.has(m.id)&&u.add(m.id)).slice(0,l))}let f=new Set;if(n.splice(0,n.length,...n.filter(h=>{let u=`${h.piattaforma}:${h.id}`;return!f.has(u)&&f.add(u)})),!n.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let p=n.map(h=>({video:h,stato:"da_guardare"}));await S(t,"UPDATE lavori SET candidati=?, riferimenti=?, motore_visto=NULL WHERE id=?",JSON.stringify(d),JSON.stringify(p),i.id),await g(t,i.id,"direttore",`scelgo ${p.length} reel da far guardare a Iris`)}async function Ht(t,e,i){let a=w(i.riferimenti,[]);if(!i.motore_visto){let o=0;for(let r of a){if(r.stato!=="da_guardare")continue;let c=await y(t,"SELECT dati FROM cache_analisi WHERE chiave=?",F(r.video));c&&(Object.assign(r,{stato:"fatto",analisi:w(c.dati,{})}),o++)}await S(t,"UPDATE lavori SET riferimenti=?, motore_visto=? WHERE id=?",JSON.stringify(a),E(),i.id),o&&await g(t,i.id,"occhi",`${o} reel gi\xE0 visti in passato: non li riguardo`),a.some(r=>r.stato==="da_guardare")&&await g(t,i.id,"motore",`chiamo il motore GitHub: scarico e misuro ${a.filter(r=>r.stato==="da_guardare").length} reel di riferimento`)}if(a.some(o=>o.stato==="da_guardare"))return G(t,i);if(!a.some(o=>o.stato==="fatto"))throw new Error("nessun reel di riferimento \xE8 stato analizzato (vedi il registro)");return await S(t,"UPDATE lavori SET motore_visto=NULL WHERE id=?",i.id),!0}async function G(t,e){return e.motore_visto&&Date.now()-new Date(e.motore_visto)>75*6e4&&!(e.motore_fino&&e.motore_fino>E())&&(await g(t,e.id,"motore","il motore GitHub non si fa vivo da pi\xF9 di un'ora: controlla GitHub \u2192 momento-montaggio \u2192 Actions","warn"),await S(t,"UPDATE lavori SET motore_visto=? WHERE id=?",E(),e.id)),!1}var F=t=>`rif2:${t.piattaforma}:${t.id}`;async function Gt(t,e,i){if(!i.pcloud)return await g(t,i.id,"analista","nessuna cartella pCloud: lavoro solo sui riferimenti"),!0;let a=w(i.clip,null);if(!a){let o=await nt(i.pcloud);if(!o.length)throw new Error("nella cartella pCloud non ci sono video");a=o.map(d=>({...d,stato:"da_guardare"}));let r=0;for(let d of a){let n=await y(t,"SELECT dati FROM cache_analisi WHERE chiave=?",Y(d));if(n){let s=w(n.dati,{});Object.assign(d,{stato:"fatto",analisi:s.analisi||s,tecnico:s.tecnico||d.tecnico}),r++}}await S(t,"UPDATE lavori SET clip=?, motore_visto=? WHERE id=?",JSON.stringify(a),E(),i.id);let c=Math.round(a.reduce((d,n)=>d+(n.dimensione||0),0)/1073741824*10)/10;await g(t,i.id,"analista",`${a.length} clip trovate su pCloud (${c} GB)${r?`, ${r} gi\xE0 viste in passato`:""}`),a.some(d=>d.stato==="da_guardare")&&await g(t,i.id,"motore","chiamo il motore GitHub: scarico e misuro le clip per Ada")}return a.some(o=>o.stato==="da_guardare")?G(t,i):!0}var Y=t=>`clip2:${t.hash}:${t.dimensione}`;async function Ft(t,e,i){await g(t,i.id,"direttore","incrocio riferimenti e clip, scrivo la scheda tecnica");let a=w(i.riferimenti,[]).filter(c=>c.stato==="fatto").map(c=>({piattaforma:c.video.piattaforma,url:c.video.url,views:c.video.views,likes:c.video.likes,scelto_da_johnny:!!c.video.scelto_da_johnny,analisi:c.analisi})),o=(w(i.clip,[])||[]).filter(c=>c.stato==="fatto").map(c=>({file:c.nome,tecnico:c.tecnico,...c.analisi})),r=await L(e,Pt,Mt(i.prompt,w(i.piano,{}),a,o),{maxTokens:16e3});await S(t,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(r),i.id),await g(t,i.id,"direttore",`scheda pronta: ${r.titolo_lavoro||""}`)}var H=["caldo_cinematico","pulito_commerciale","teal_orange","moody_scuro","naturale_vivace","bn_contrasto","pastello_soft","vintage_film"],ut=["taglio_netto","dissolvenza","flash_bianco","whip_pan","zoom","glitch","slide","fadenero"],mt=["punch_in","zoom_lento","zoom_out","shake","nessuno"],ft=["grana","vignettatura","bande_cinema","light_leak"],Yt=`Sei il Regista e il Copy di Momento Produzione. Trasformi la SCHEDA TECNICA del Direttore creativo in un
PIANO DI MONTAGGIO preciso che un montatore automatico eseguir\xE0 alla lettera. Scegli i pezzi migliori dalle clip analizzate
(usa solo momenti con qualit\xE0 alta e senza problemi, rispetta i tempi da/a dei momenti), costruisci gancio \u2192 sviluppo \u2192 climax \u2192
chiusura, alterna inquadrature (totale/dettaglio/primo piano), non ripetere lo stesso momento. Il rallenty va su clip girate a
48 fps o pi\xF9 (rallenty_possibile). Testi brevi, in italiano corretto, niente formule abusate. Rispondi SOLO JSON.`,qt=(t,e)=>`SCHEDA TECNICA:
${JSON.stringify(t)}

CLIP DISPONIBILI (indice, file, dati tecnici, momenti con tempi e qualit\xE0, problemi):
${JSON.stringify(e)}

VALORI AMMESSI
- look: ${H.join(", ")}
- transizione_in: ${ut.join(", ")} (la prima clip non ne ha)
- effetto: ${mt.join(", ")}
- effetti_globali: ${ft.join(", ")}
- stile testi: titolo_grande_centrale, etichetta_box, sottotitolo_classico; posizione: alto, centro, terzo_inferiore

JSON:
{
  "durata_target": n,
  "look": "...", "intensita_look": 0.6-1.0,
  "effetti_globali": ["..."],
  "font": {"titoli": "font Google Fonts", "testi": "font Google Fonts"},
  "colori": {"testo": "#hex", "accento": "#hex", "box": "#hex"},
  "sfx": true/false, "riser": secondi del primo picco (o null),
  "segmenti": [{"clip": indice, "in": secondi nella clip, "durata": secondi nel reel, "rallenty": bool, "effetto": "...",
                "transizione_in": "...", "audio": 0-1 (suono originale), "motivo": "perch\xE9 questo pezzo qui",
                "testo": {"testo": "...", "stile": "...", "posizione": "...", "evidenzia": "parola"} oppure null}],
  "sottotitoli": {"usare": bool, "stile": "parola_per_parola|karaoke_evidenziato|sottotitolo_classico", "posizione": "terzo_inferiore"},
  "chiusura": {"testo": "...", "sottotesto": "cta breve", "evidenzia": "parola", "durata": 2-3, "colore": "#hex"} oppure null,
  "caption": "caption finale per il post",
  "musica_da_mettere": "che brano cercare su Instagram e da che secondo, a che volume rispetto al suono originale"
}`;async function Bt(t,e,i){let a=w(i.scheda,{}),o=(w(i.clip,[])||[]).map((l,f)=>({c:l,i:f})).filter(({c:l})=>l.stato==="fatto").map(({c:l,i:f})=>({indice:f,file:l.nome,tecnico:l.tecnico,descrizione:l.analisi?.descrizione,momenti:l.analisi?.momenti,problemi:l.analisi?.problemi,parlato:l.analisi?.parlato,verticale:l.analisi?.adatta_al_verticale}));if(!o.length)return await g(t,i.id,"regista","nessuna clip analizzata: senza girato non posso montare. La scheda resta pronta da usare.","warn"),"salta";await g(t,i.id,"regista",`scrivo il piano di montaggio da ${o.length} clip`);let r=await L(e,Yt,qt(a,o),{maxTokens:12e3}),c=w(i.clip,[]),d=(r.segmenti||[]).filter(l=>c[l.clip]?.stato==="fatto").slice(0,40).map((l,f)=>{let p=c[l.clip],h=Number(p.tecnico?.durata_sec)||9999,u=Math.min(Math.max(Number(l.durata)||1.5,.4),12),m=!!l.rallenty,v=u*(m?.5:1);return{clip:l.clip,fileid:p.fileid,nome:p.nome,in:Math.max(0,Math.min(Number(l.in)||0,Math.max(0,h-v-.05))),durata:u,rallenty:m,effetto:mt.includes(l.effetto)?l.effetto:"nessuno",transizione_in:f===0?null:ut.includes(l.transizione_in)?l.transizione_in:"taglio_netto",audio:Math.min(1,Math.max(0,Number(l.audio??.8))),motivo:l.motivo,testo:l.testo?.testo?l.testo:null}});if(!d.length)throw new Error("il piano del Regista non contiene pezzi validi");let n={...r,segmenti:d,look:H.includes(r.look)?r.look:H.includes(a.colore?.look)?a.colore.look:"naturale_vivace",effetti_globali:(r.effetti_globali||[]).filter(l=>ft.includes(l))};await S(t,"UPDATE lavori SET montaggio=? WHERE id=?",JSON.stringify({stato:"da_fare",piano:n,creato:E()}),i.id);let s=d.reduce((l,f)=>l+f.durata,0);return await g(t,i.id,"regista",`piano pronto: ${d.length} pezzi, ~${Math.round(s+(n.chiusura?.durata||0))} s, look ${n.look}`),(d.some(l=>l.testo)||n.chiusura)&&await g(t,i.id,"copy",`testi: ${[...d.filter(l=>l.testo).map(l=>'"'+l.testo.testo+'"'),n.chiusura?.testo?'"'+n.chiusura.testo+'"':""].filter(Boolean).join(" \xB7 ").slice(0,300)}`),await g(t,i.id,"motore","chiamo il motore GitHub per il montaggio"),!0}async function Kt(t,e,i){let a=w(i.montaggio,null);if(!a||a.stato==="fatto")return!0;if(a.stato==="errore")throw new Error("montaggio non riuscito: "+(a.errore||""));return G(t,i)}async function Wt(t,e,i,a){for(;Date.now()<a;){i=await y(t,"SELECT * FROM lavori WHERE id=?",i.id);let o=!0;if(i.fase==="piano"?await Ut(t,e,i):i.fase==="ricerca"?await jt(t,e,i):i.fase==="riferimenti"?o=await Ht(t,e,i):i.fase==="clip"?o=await Gt(t,e,i):i.fase==="scheda"?await Ft(t,e,i):i.fase==="regia"?o=await Bt(t,e,i):i.fase==="montaggio"&&(o=await Kt(t,e,i)),!o)return"attesa";let r=lt[lt.indexOf(i.fase)+1];if(o==="salta"&&(r="fatto"),await S(t,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",r,r==="fatto"?"pronto":"in_corso",E(),i.id),r==="fatto"){await g(t,i.id,"regia",w((await y(t,"SELECT montaggio FROM lavori WHERE id=?",i.id))?.montaggio,null)?.stato==="fatto"?"\u2705 reel montato: aprilo e guardalo":"\u2705 lavoro pronto: apri la scheda");return}}}async function gt(t){let e=Date.now(),i=await k(t),a=E(),o=new Date(Date.now()+Dt*6e4).toISOString();for(let r=0;r<5&&Date.now()-e<ct-6e4;r++){let c=await R(t,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,o,a,a);if(!c.length)return;let d=c[0];try{await Wt(t,i,d,e+ct)==="attesa"?await S(t,"UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?",new Date(Date.now()+5e4).toISOString(),d.id):await S(t,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",d.id)}catch(n){let s=String(n?.message||n).slice(0,500),l=d.tentativi>=3||/manca la chiave/.test(s),f=new Date(Date.now()+2*6e4).toISOString();await S(t,"UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?",l?"errore":"in_corso",s,l?null:f,E(),d.id);let p=(await y(t,"SELECT fase FROM lavori WHERE id=?",d.id))?.fase||d.fase;await g(t,d.id,"regia",`${l?"\u274C fermo":"\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${p}): ${s}`,l?"errore":"warn")}}}var Jt="johnhant91/momento-montaggio",Xt="momento-reel",Vt={riferimenti:"riferimenti",clip:"clip"},I=(t,e=200)=>new Response(JSON.stringify(t),{status:e,headers:{"content-type":"application/json","cache-control":"no-store"}}),q=t=>Uint8Array.from(atob(t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=")),e=>e.charCodeAt(0));async function Zt(t){let i=String(t||"").replace(/^Bearer\s+/i,"").trim().split(".");if(i.length!==3)return null;let a,o;try{a=JSON.parse(new TextDecoder().decode(q(i[0]))),o=JSON.parse(new TextDecoder().decode(q(i[1])))}catch{return null}let r=Array.isArray(o.aud)?o.aud:[o.aud];if(o.iss!=="https://token.actions.githubusercontent.com"||!r.includes(Xt)||String(o.repository||"").toLowerCase()!==Jt||!o.exp||o.exp*1e3<Date.now())return null;let d=((await(await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cf:{cacheTtl:3600,cacheEverything:!0}})).json()).keys||[]).find(l=>l.kid===a.kid);if(!d)return null;let n=await crypto.subtle.importKey("jwk",d,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},!1,["verify"]);return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",n,q(i[2]),new TextEncoder().encode(i[0]+"."+i[1]))?o:null}var ht=t=>{try{return new URL(t).searchParams.get("code")}catch{return null}};async function B(t,e,i,a,o){await S(t,`UPDATE lavori SET ${i}=json_set(${i}, ?, json(?)), motore_visto=? WHERE id=?`,`$[${Math.trunc(a)}]`,JSON.stringify(o),E(),e)}var P=t=>`EXISTS (SELECT 1 FROM json_each(lavori.${t}) WHERE json_extract(value, '$.stato')='da_guardare')`;async function vt(t,e,i){let a=i.pathname,o=t.method;if(a==="/api/motore/coda"&&o==="GET"){let u=await y(e,`SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${P("riferimenti")}) OR (fase='clip' AND clip IS NOT NULL AND ${P("clip")}) OR
      (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))`);return I({lavoro:(u?.n||0)>0})}if(a==="/api/motore/prossimo"&&o==="POST"){if(!await Zt(t.headers.get("authorization")))return I({errore:"motore non riconosciuto"},401);let u=E(),m=[...crypto.getRandomValues(new Uint8Array(24))].map(_=>_.toString(16).padStart(2,"0")).join(""),v=await y(e,`UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${P("riferimenti")}) OR
          (fase='clip' AND clip IS NOT NULL AND ${P("clip")}) OR
          (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))
        ORDER BY id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip, montaggio`,m,new Date(Date.now()+55*6e4).toISOString(),u,u);if(!v)return new Response(null,{status:204});let O=v.fase;if(O==="montaggio"){let _=w(v.montaggio,{});return await g(e,v.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: scarico ${new Set(_.piano.segmenti.map(x=>x.fileid)).size} clip e monto il reel`),I({id:v.id,tipo:O,pass:m,pcloud_code:ht(v.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(v.pcloud||""),piano:_.piano})}let C=w(O==="riferimenti"?v.riferimenti:v.clip,[]).map((_,x)=>[_,x]).filter(([_])=>_.stato==="da_guardare").map(([_,x])=>O==="riferimenti"?{indice:x,nome:`${_.video.piattaforma} \xB7 ${(_.video.titolo||_.video.url||"").slice(0,60)}`,url:_.video.url,video_url:_.video.video_url?_.video.video_url.includes("api.apify.com")?`${i.origin}/api/motore/${v.id}/scarica?i=${x}&tipo=riferimenti&pass=${m}`:_.video.video_url:null}:{indice:x,nome:_.nome,fileid:_.fileid,dimensione:_.dimensione});return await g(e,v.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: ${C.length} ${O==="riferimenti"?"reel da scaricare e misurare":"clip da scaricare e misurare"}`),I({id:v.id,tipo:O,pass:m,pcloud_code:ht(v.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(v.pcloud||""),elementi:C})}let r=a.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica|log|video|anteprima|esito)$/);if(!r)return I({errore:"non trovato"},404);let c=Number(r[1]),d=await y(e,"SELECT id, prompt, piano, fase, riferimenti, clip, montaggio, motore_pass FROM lavori WHERE id=?",c),n=t.headers.get("x-pass")||i.searchParams.get("pass")||"";if(!d||!d.motore_pass||n.length<32||n!==d.motore_pass)return I({errore:"lasciapassare non valido"},403);let s=Vt[i.searchParams.get("tipo")]||(d.fase==="riferimenti"?"riferimenti":"clip"),l=w(d[s],[]),f=Number(i.searchParams.get("i")),p=l[f],h=u=>s==="riferimenti"?`${u.video.piattaforma} ${u.video.id}`:u.nome;if(r[2]==="log"&&o==="POST"){let u=await t.json().catch(()=>({})),m=["editor","vfx","color","audio","sottotitoli","revisore","motore"].includes(u.agente)?u.agente:"motore";return await g(e,c,m,String(u.messaggio||"").slice(0,300),u.livello==="warn"?"warn":"info"),await S(e,"UPDATE lavori SET motore_visto=? WHERE id=?",E(),c),I({ok:!0})}if((r[2]==="video"||r[2]==="anteprima")&&o==="POST"){if(!e.VIDEO)return I({errore:"archivio video non collegato"},500);let u=Number(t.headers.get("content-length")||0);if(!u||u>300*1024*1024)return I({errore:"dimensione non valida"},400);let m=`lavoro-${c}/${r[2]==="video"?"reel.mp4":"anteprima.jpg"}`,{readable:v,writable:O}=new FixedLengthStream(u);return t.body.pipeTo(O).catch(()=>{}),await e.VIDEO.put(m,v,{httpMetadata:{contentType:r[2]==="video"?"video/mp4":"image/jpeg"}}),I({ok:!0,chiave:m})}if(r[2]==="esito"&&o==="POST"){let u=await t.json().catch(()=>({})),m=w(d.montaggio,{});return u.errore?(m.tentativi=(m.tentativi||0)+1,m.errore=String(u.errore).slice(0,500),m.stato=m.tentativi<2?"da_fare":"errore",await g(e,c,"editor",`montaggio non riuscito: ${m.errore.slice(0,200)}${m.stato==="da_fare"?" \u2014 riprovo":""}`,"warn")):Object.assign(m,{stato:"fatto",revisore:u.revisore||{},video:`lavoro-${c}/reel.mp4`,anteprima:`lavoro-${c}/anteprima.jpg`,finito:E()}),await S(e,"UPDATE lavori SET montaggio=?, motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",JSON.stringify(m),E(),c),I({ok:!0})}if(r[2]==="scarica"&&o==="GET"){if(!p?.video?.video_url)return I({errore:"niente da scaricare"},404);let u=await k(e),m=await fetch(p.video.video_url,{headers:{authorization:`Bearer ${u.APIFY_TOKEN}`}});return new Response(m.body,{status:m.status,headers:{"content-type":m.headers.get("content-type")||"video/mp4",...m.headers.get("content-length")?{"content-length":m.headers.get("content-length")}:{}}})}if(r[2]==="elemento"&&o==="POST"){if(!p)return I({errore:"elemento sconosciuto"},400);let u=await t.json().catch(()=>null);if(!u?.misure||!Array.isArray(u.immagini)||!u.immagini.length)return I({errore:"dati mancanti"},400);let m=await k(e),v=s==="riferimenti",O=v?"occhi":"analista",T=u.misure;await g(e,c,O,`sto guardando ${v?p.video.piattaforma+" \xB7 "+(p.video.titolo||p.video.url).slice(0,50):p.nome} (${T.tecnico?.risoluzione||"?"} \xB7 ${T.tecnico?.fps||"?"} fps \xB7 ${T.numero_tagli} tagli${T.bpm_stimato?" \xB7 "+T.bpm_stimato+" BPM":""})`);try{let C=v?dt(w(d.piano,{}).settore||""):pt(d.prompt),_=`MISURE ESATTE (ffmpeg + Whisper):
${JSON.stringify(T)}

Rispondi SOLO con il JSON richiesto.`,x=await V(m,v?m.CLAUDE_MODEL:m.CLAUDE_MODEL_LIGHT,C,_,u.immagini.slice(0,3),v?5e3:3500);return v?(Object.assign(x,{numero_tagli:T.numero_tagli,durata_media_inquadratura_sec:T.durata_media_inquadratura_sec,durata_sec:T.tecnico?.durata_sec}),x.audio={...x.audio||{},bpm_stimato:T.bpm_stimato??x.audio?.bpm_stimato??null,volume_lufs:T.volume_lufs},x.misure={tagli_sec:T.tagli_sec,piu_breve:T.inquadratura_piu_breve_sec,piu_lunga:T.inquadratura_piu_lunga_sec,tagli_sul_beat_indice:T.tagli_sul_beat_indice,parlato:T.parlato},Object.assign(p,{stato:"fatto",analisi:x,errore:void 0}),await e.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(F(p.video),JSON.stringify(x),E()).run()):(x.misure={qualita:T.qualita_fotogrammi,movimento:T.movimento_tra_fotogrammi,tagli_interni_sec:T.tagli_sec,volume_lufs:T.volume_lufs,parlato:T.parlato},Object.assign(p,{stato:"fatto",analisi:x,tecnico:{...p.tecnico||{},...T.tecnico},errore:void 0}),await e.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(Y(p),JSON.stringify({analisi:x,tecnico:p.tecnico}),E()).run()),await B(e,c,s,f,p),await g(e,c,O,`guardato: ${v?p.video.piattaforma:p.nome} \u2014 ${String(v?x.perche_funziona||x.gancio?.cosa_succede:x.descrizione||"").slice(0,130)}`),I({ok:!0,uso:x._uso})}catch(C){let _=String(C?.message||C).slice(0,300);return _.startsWith("LIMITE_CLAUDE")?(await g(e,c,O,"\u23F8 Claude ha rifiutato per limite o credito esaurito: riprendo pi\xF9 tardi. "+_.slice(15,160),"warn"),I({errore:_},429)):(p.tentativi=(p.tentativi||0)+1,p.errore=_,p.stato=p.tentativi<3?"da_guardare":"saltato",await B(e,c,s,f,p),await g(e,c,O,`${h(p)}: ${_}${p.stato==="saltato"?" \u2014 saltato":` \u2014 riprovo (${p.tentativi}/3)`}`,"warn"),I({errore:_},502))}}if(r[2]==="errore"&&o==="POST"){if(!p)return I({errore:"elemento sconosciuto"},400);let u=await t.json().catch(()=>({}));return p.tentativi=(p.tentativi||0)+1,p.errore=String(u.errore||"errore del motore").slice(0,300),p.stato=p.tentativi<3&&!/YouTube non ha lasciato|HTTP 4\d\d/.test(p.errore)?"da_guardare":"saltato",await B(e,c,s,f,p),await g(e,c,"motore",`${h(p)}: ${p.errore}${p.stato==="saltato"?" \u2014 saltato":" \u2014 riprovo"}`,"warn"),I({ok:!0})}if(r[2]==="fine"&&o==="POST"){if(await S(e,"UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",E(),c),(await t.json().catch(()=>({}))).silenzioso)return I({ok:!0});let u=l.filter(m=>m.stato==="fatto").length;return await g(e,c,"motore",`giro del motore finito: ${u}/${l.length} ${s==="riferimenti"?"reel":"clip"} analizzati`),I({ok:!0})}return I({errore:"metodo non consentito"},405)}var _t=`<!DOCTYPE html>
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
.stanza.spenta{grid-column:1/-1}.posti{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:2px}.posti .scrivania{padding:6px;margin:0}.posti .av{width:40px;height:40px;font-size:19px}
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
const FASI = [['piano','Piano'],['ricerca','Ricerca'],['riferimenti','Studio reel'],['clip','Clip'],['scheda','Scheda'],['regia','Regia'],['montaggio','Montaggio'],['fatto','Pronto']];
let timer = null;

const AGENTI = {
  direttore: { n: 'Leo', r: 'Direttore creativo', i: '\u{1F3AC}', c: '#12a3a4', s: 'direzione', d: 'Legge il tuo prompt, capisce settore, obiettivo e pubblico, decide cosa cercare. Alla fine incrocia riferimenti e clip e scrive la scheda tecnica per tutta la squadra.' },
  scout_yt: { n: 'Yuri', r: 'Scout YouTube Shorts', i: '\u25B6\uFE0F', c: '#e5483f', s: 'scouting', d: 'Cerca gli Shorts del settore pubblicati negli ultimi 18 mesi e li ordina per visualizzazioni e coinvolgimento (like, commenti).' },
  scout_tt: { n: 'Tea', r: 'Scout TikTok', i: '\u{1F3B5}', c: '#25d6ee', s: 'scouting', d: 'Cerca su TikTok per parole chiave e hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  scout_ig: { n: 'Ines', r: 'Scout Instagram', i: '\u{1F4F8}', c: '#d6409f', s: 'scouting', d: 'Cerca i reel pi\xF9 visti sugli hashtag del settore (via Apify) e recupera il video per Max e Iris.' },
  occhi: { n: 'Iris', r: 'Occhi \xB7 studia i reel', i: '\u{1F441}\uFE0F', c: '#8b7cf6', s: 'visione', d: 'Claude: guarda i fotogrammi chiave dei reel scelti (gancio + uno per inquadratura) insieme alle misure esatte di Max e li smonta: gancio, ritmo, testi, colore, effetti, musica, chiusura, perch\xE9 funzionano.' },
  analista: { n: 'Ada', r: 'Analista delle tue clip', i: '\u{1F50E}', c: '#f0b44c', s: 'visione', d: 'Claude: guarda i fotogrammi delle tue clip e le misure di Max e segna i momenti utili con i tempi, la qualit\xE0, i problemi (mosso, fuori fuoco, esposizione) e il parlato.' },
  motore: { n: 'Max', r: 'Motore GitHub \xB7 scarica e misura', i: '\u2699\uFE0F', c: '#9aa7ab', s: 'visione', d: 'Gira su GitHub Actions: scarica reel e clip, misura con ffmpeg i tagli esatti, la durata delle inquadrature, nitidezza, esposizione e movimento, stima i BPM, trascrive il parlato con Whisper ed estrae i fotogrammi chiave per Iris e Ada.' },
  regista: { n: 'Rocco', r: 'Regista \xB7 piano di montaggio', i: '\u{1F3A5}', c: '#e07a5f', s: 'post', d: 'Claude: dalla scheda tecnica e dalle analisi delle clip sceglie i pezzi migliori (tempi esatti), l\u2019ordine, i rallenty, gli effetti e le transizioni: scrive il piano che il montatore esegue alla lettera.' },
  copy: { n: 'Carla', r: 'Copy \xB7 testi e caption', i: '\u270D\uFE0F', c: '#f2cc8f', s: 'post', d: 'Claude: scrive il gancio, i testi a schermo, la chiusura con la CTA e la caption del post.' },
  editor: { n: 'Edo', r: 'Editor \xB7 tagli e reframe', i: '\u2702\uFE0F', c: '#81b29a', s: 'post', d: 'Motore: reframe 9:16 che segue il soggetto (volti, movimento), stabilizzazione delle clip mosse, rallenty veri, durate esatte.' },
  vfx: { n: 'Vale', r: 'VFX \xB7 effetti e transizioni', i: '\u2728', c: '#c77dff', s: 'post', d: 'Motore: punch-in, zoom, shake, transizioni (flash, whip, zoom, glitch, dissolvenza), light leak, grana, bande cinema.' },
  color: { n: 'Cleo', r: 'Colorist \xB7 look', i: '\u{1F3A8}', c: '#ff9f1c', s: 'post', d: 'Motore: uniforma bianco ed esposizione di ogni clip (misurati) e applica il look della scheda con una LUT 3D.' },
  audio: { n: 'Aldo', r: 'Audio \xB7 mix e sound design', i: '\u{1F3A7}', c: '#4cc9f0', s: 'post', d: 'Motore: suono originale delle clip, sound design generato (whoosh, impatti, riser), volume finale a \u221214 LUFS.' },
  sottotitoli: { n: 'Sara', r: 'Testi animati e sottotitoli', i: '\u{1F4AC}', c: '#ffd166', s: 'post', d: 'Motore: testi animati con font Google, sottotitoli parola per parola o karaoke dal parlato (Whisper).' },
  revisore: { n: 'Remo', r: 'Revisore \xB7 controllo qualit\xE0', i: '\u2705', c: '#4fd18b', s: 'post', d: 'Motore: controlla fotogrammi neri, durata, volume e peso del file prima della consegna.' },
  regia: { n: 'Regia', r: 'sistema', i: '\u{1F6F0}\uFE0F', c: '#5d7378' },
};
const VECCHI = { 'Direttore creativo': 'direttore', 'Occhi (Gemini)': 'occhi', 'Analista': 'analista', 'Regia': 'regia', 'Ricerca': 'scout_yt' };
const AGID = (a) => AGENTI[a] ? a : VECCHI[a] || 'regia';
const STANZE = [['direzione', 'Direzione creativa'], ['scouting', 'Scouting \xB7 ricerca di settore'], ['visione', 'Sala visione'], ['post', 'Post-produzione']];
const FASE_AGENTI = { piano: ['direttore'], ricerca: ['scout_yt', 'scout_tt', 'scout_ig'], riferimenti: ['motore', 'occhi'], clip: ['motore', 'analista'], scheda: ['direttore'], regia: ['regista', 'copy'], montaggio: ['motore', 'editor', 'color', 'vfx', 'sottotitoli', 'audio', 'revisore'] };
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
    return '<div class="scrivania ' + (st.s || '') + '" style="--c:' + (A.c || '#345') + '" data-ag="' + id + '"><div class="av">' + A.i + '</div><div class="chi"><b>' + e(A.n) + '</b><span class="stato-ag">' + (testoStato[st.s] || 'libero') + '</span><div class="ruolo">' + e(A.r) + (conti[id] ? ' \xB7 ' + conti[id] + ' azioni in 7 gg' : '') + '</div>' +
      ('<div class="schermo">' + e(msg) + '</div>' + (u && !st.s ? '<div class="mut" style="font-size:11px;margin-top:3px">' + fa(u.quando) + (u.lavoro_id ? ' \xB7 lavoro #' + u.lavoro_id : '') + '</div>' : '')) + '</div></div>';
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
  const righe = await chiama('/api/regia/agente/' + id);
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

function vistaReel(L) {
  const m = L.montaggio;
  if (!m) return '';
  if (m.stato !== 'fatto') return '<h2>Reel</h2><div class="card">' + (m.stato === 'errore' ? '<span class="err">Montaggio non riuscito: ' + e(m.errore) + '</span>' : '\u{1F3AC} In montaggio sul motore GitHub\u2026') + '</div>';
  const r = m.revisore || {}, p = m.piano || {};
  return '<h2>Il reel</h2><div class="card" style="text-align:center"><video src="/api/lavori/' + L.id + '/reel.mp4" controls playsinline preload="metadata" style="width:100%;max-width:360px;border-radius:12px;background:#000"></video>' +
    '<div class="riga" style="justify-content:center;margin-top:10px"><a class="btn" href="/api/lavori/' + L.id + '/reel.mp4?scarica=1">Scarica MP4</a></div>' +
    '<p class="mut">' + e(r.durata) + ' s \xB7 ' + e(r.lufs) + ' LUFS \xB7 ' + e(r.mb) + ' MB \xB7 montato in ' + e(r.secondi_di_lavoro) + ' s</p>' +
    ((r.problemi || []).length ? '<p class="err">\u26A0\uFE0E ' + e(r.problemi.join(' \xB7 ')) + '</p>' : '<p style="color:var(--ok)">\u2713 Revisore: tutto ok</p>') +
    (p.musica_da_mettere ? '<p><b>Musica da aggiungere su IG:</b> ' + e(p.musica_da_mettere) + '</p>' : '') +
    (p.caption ? '<p style="white-space:pre-wrap;text-align:left"><b>Caption:</b> ' + e(p.caption) + '</p>' : '') + '</div>';
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
    vistaReel(L) + vistaScheda(L.scheda) + vistaRiferimenti(L.riferimenti) + vistaClip(L.clip) +
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
<\/script></body></html>`;var b=(t,e=200,i={})=>new Response(JSON.stringify(t),{status:e,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...i}}),wt=t=>[...new Uint8Array(t)].map(e=>e.toString(16).padStart(2,"0")).join(""),Tt=async t=>wt(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)));async function K(t){return t.ADMIN_PASSWORD?Tt("momento-reel|"+t.ADMIN_PASSWORD):(await y(t,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function St(t){let e=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return wt(await crypto.subtle.sign("HMAC",e,new TextEncoder().encode("momento-reel-sessione")))}async function bt(t,e){let i=await K(e);if(!i)return!1;let a=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(t.headers.get("cookie")||"");return!!a&&a[1]===await St(i)}var Et=(t,e)=>`mr_s=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${e}`;async function Qt(t,e,i){let a=i.pathname,o=t.method;if(a==="/api/stato")return b({configurato:!!await K(e),dentro:await bt(t,e)});if(a==="/api/accedi"&&o==="POST"){let{password:n}=await t.json().catch(()=>({}));if(!n||String(n).length<6)return b({errore:"password di almeno 6 caratteri"},400);let s=await K(e),l=Tt("momento-reel|"+n);if(!s)s=await l,await S(e,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",s);else if(await l!==s)return b({errore:"password errata"},401);return b({ok:!0},200,{"set-cookie":Et(await St(s),3600*24*60)})}if(a==="/api/esci")return b({ok:!0},200,{"set-cookie":Et("",0)});if(!await bt(t,e))return b({errore:"accesso richiesto"},401);if(a==="/api/impostazioni"&&o==="GET"){let n=await k(e),s=Object.fromEntries(D.map(f=>{let p=n[f];return[f,{impostata:!!p,da_cloudflare:n._env[f],anteprima:p?"\u2022\u2022\u2022\u2022"+String(p).slice(-4):""}]})),l=Object.fromEntries(U.map(f=>[f,Array.isArray(n[f])?n[f].join(","):n[f]]));return b({segreti:s,opzioni:l})}if(a==="/api/impostazioni"&&o==="POST"){let n=await t.json().catch(()=>({})),s=[];for(let l of[...D,...U]){if(typeof n[l]!="string")continue;let f=n[l].trim();s.push(f?e.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(l,f):e.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(l))}return s.length&&await e.DB.batch(s),b({ok:!0})}if(a==="/api/regia"&&o==="GET"){let[n,s,l,f]=await Promise.all([R(e,"SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),R(e,"SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),R(e,"SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),R(e,"SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente",new Date(Date.now()-6048e5).toISOString())]),p=await k(e),h={Claude:!!p.ANTHROPIC_API_KEY},u=p.APIFY_TOKEN?[]:["scout_tt","scout_ig"];return b({adesso:E(),attivi:n,ultimi:s,feed:l,conti:f,chiavi:h,riposo:u,yt_web:!p.YOUTUBE_API_KEY})}let r=a.match(/^\/api\/regia\/agente\/([a-z_]+)$/);if(r&&o==="GET")return b(await R(e,"SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40",r[1]));if(a==="/api/lavori"&&o==="GET"){let n=await R(e,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return b(n)}if(a==="/api/lavori"&&o==="POST"){let n=await t.json().catch(()=>({})),s=String(n.prompt||"").trim();if(s.length<10)return b({errore:"descrivi il reel in almeno una frase"},400);let l=await k(e),f=[["ANTHROPIC_API_KEY","Claude"]].filter(([m])=>!l[m]).map(([,m])=>m);if(f.length)return b({errore:`Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${f.join(", ")})`},400);let p=String(n.pcloud||"").trim()||null;if(p&&!/code=/.test(p))return b({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let h=String(n.link_rif||"").split(/\s+/).filter(m=>/^https?:\/\//.test(m)).slice(0,10),u=await y(e,"INSERT INTO lavori (prompt, pcloud, link_rif, creato, aggiornato) VALUES (?,?,?,?,?) RETURNING id",s,p,JSON.stringify(h),E(),E());return await g(e,u.id,"regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),b({id:u.id})}let c=a.match(/^\/api\/lavori\/(\d+)\/(reel\.mp4|anteprima\.jpg)$/);if(c&&o==="GET"){if(!e.VIDEO)return b({errore:"archivio video non collegato"},404);let n=await e.VIDEO.get(`lavoro-${c[1]}/${c[2]==="reel.mp4"?"reel.mp4":"anteprima.jpg"}`,{range:t.headers});if(!n)return b({errore:"non ancora pronto"},404);let s=new Headers;return n.writeHttpMetadata(s),s.set("etag",n.httpEtag),s.set("accept-ranges","bytes"),s.set("cache-control","private, max-age=3600"),i.searchParams.get("scarica")&&s.set("content-disposition",`attachment; filename="reel-${c[1]}.mp4"`),n.range?(s.set("content-range",`bytes ${n.range.offset}-${n.range.offset+n.range.length-1}/${n.size}`),s.set("content-length",String(n.range.length)),new Response(n.body,{status:206,headers:s})):(s.set("content-length",String(n.size)),new Response(n.body,{headers:s}))}let d=a.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro))?$/);if(d){let n=Number(d[1]);if(!d[2]&&o==="GET"){let s=await y(e,"SELECT * FROM lavori WHERE id=?",n);if(!s)return b({errore:"non trovato"},404);for(let l of["piano","riferimenti","clip","scheda","link_rif","montaggio"])s[l]=w(s[l]);return delete s.candidati,s.registro=await R(e,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",n),b(s)}if(!d[2]&&o==="DELETE")return await e.DB.batch([e.DB.prepare("DELETE FROM lavori WHERE id=?").bind(n),e.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(n)]),b({ok:!0});if(d[2]==="riprova"&&o==="POST"){let s=await t.json().catch(()=>({})),l=["piano","ricerca","riferimenti","clip","scheda","regia","montaggio"].includes(s.fase)?s.fase:null,f=await y(e,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",n);if(!f)return b({errore:"non trovato"},404);let p=l||(f.fase==="fatto"?"scheda":f.fase),h=u=>JSON.stringify((w(u,[])||[]).map(m=>m.stato==="saltato"?{...m,stato:"da_guardare",errore:void 0}:m));return await S(e,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",p,f.riferimenti?h(f.riferimenti):null,f.clip?h(f.clip):null,E(),n),p==="montaggio"&&await S(e,"UPDATE lavori SET montaggio=json_set(montaggio, '$.stato', 'da_fare', '$.tentativi', 0) WHERE id=? AND montaggio IS NOT NULL",n),await g(e,n,"regia",`\u{1F501} riparto dalla fase "${p}"`),b({ok:!0})}}return b({errore:"non trovato"},404)}var me={async fetch(t,e){await M(e);let i=new URL(t.url);if(i.pathname.startsWith("/api/motore/"))try{return await vt(t,e,i)}catch(a){return b({errore:String(a?.message||a).slice(0,300)},500)}if(i.pathname.startsWith("/api/"))try{return await Qt(t,e,i)}catch(a){return b({errore:String(a?.message||a).slice(0,300)},500)}return new Response(_t,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(t,e,i){await M(e),i.waitUntil(gt(e))}};export{me as default};
