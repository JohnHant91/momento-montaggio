var w=()=>new Date().toISOString(),T=(i,e=null)=>{try{return i==null?e:JSON.parse(i)}catch{return e}},N=async(i,e,...o)=>(await i.DB.prepare(e).bind(...o).all()).results||[],O=(i,e,...o)=>i.DB.prepare(e).bind(...o).first(),A=(i,e,...o)=>i.DB.prepare(e).bind(...o).run(),V=!1;async function U(i){if(!V){await i.DB.batch([i.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),i.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),i.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),i.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),i.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")]);for(let e of["motore_pass TEXT","motore_fino TEXT","motore_visto TEXT","montaggio TEXT","fonte TEXT DEFAULT 'pcloud'"])try{await i.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${e}`).run()}catch{}V=!0}}async function h(i,e,o,t,a="info"){await A(i,"INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",e,o,String(t).slice(0,600),a,w())}var $=["ANTHROPIC_API_KEY","YOUTUBE_API_KEY","APIFY_TOKEN"],j=["CLAUDE_MODEL","CLAUDE_MODEL_LIGHT","APIFY_TIKTOK_ACTOR","APIFY_INSTAGRAM_ACTOR","NUM_RIFERIMENTI","DURATA_MAX","MESI_RICERCA"];async function k(i){let e=Object.fromEntries((await N(i,"SELECT chiave, valore FROM impostazioni")).map(t=>[t.chiave,t.valore])),o=(t,a)=>i[t]||e[t]||a;return{ANTHROPIC_API_KEY:o("ANTHROPIC_API_KEY"),GEMINI_API_KEY:o("GEMINI_API_KEY"),YOUTUBE_API_KEY:o("YOUTUBE_API_KEY"),APIFY_TOKEN:o("APIFY_TOKEN"),CLAUDE_MODEL:o("CLAUDE_MODEL","claude-sonnet-5-5"),CLAUDE_MODEL_LIGHT:o("CLAUDE_MODEL_LIGHT","claude-haiku-5-5"),WEB_SEARCH_TOOL:o("WEB_SEARCH_TOOL","web_search_20250305"),GEMINI_MODELS:String(o("GEMINI_MODELS","gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map(t=>t.trim()).filter(Boolean),APIFY_TIKTOK_ACTOR:o("APIFY_TIKTOK_ACTOR","clockworks/tiktok-scraper"),APIFY_INSTAGRAM_ACTOR:o("APIFY_INSTAGRAM_ACTOR","apify/instagram-scraper"),NUM_RIFERIMENTI:Number(o("NUM_RIFERIMENTI",9)),DURATA_MAX:Number(o("DURATA_MAX",90)),MESI_RICERCA:Number(o("MESI_RICERCA",18)),FPS_ANALISI:Number(o("FPS_ANALISI",4)),_salvate:e,_env:Object.fromEntries($.map(t=>[t,!!i[t]]))}}var zi={caldo_cinematico:"toni caldi, ombre morbide, leggera grana, contrasto medio",pulito_commerciale:"bianchi puliti, colori fedeli, contrasto alto, nitido",teal_orange:"pelle calda, ombre e cieli verso il ciano, look da film",moody_scuro:"sottoesposto, colori desaturati, neri profondi",naturale_vivace:"colori saturi ma naturali, luminoso, estivo",bn_contrasto:"bianco e nero contrastato",pastello_soft:"colori pastello, alte luci morbide, poco contrasto",vintage_film:"neri sollevati, dominante calda, grana pellicola"},Ci={punch_in:"zoom secco del 10-20% sul taglio o sull'accento",zoom_lento:"zoom progressivo durante l'inquadratura",speed_ramp:"accelerazione/rallenty dentro la stessa clip",rallenty:"clip rallentata (fluida solo se girata a 50/60 fps)",whip_pan:"transizione a frusta con mosso direzionale",flash_bianco:"lampo bianco di 2-4 fotogrammi sul taglio",shake:"tremolio di camera sull'impatto",light_leak:"bagliore di luce in sovrapposizione",glitch:"distorsione digitale breve",split_screen:"schermo diviso in 2-3 riquadri",freeze_frame:"fermo immagine con testo",dissolvenza:"dissolvenza incrociata",taglio_netto:"taglio secco senza transizione",bande_cinema:"bande nere orizzontali (look cinema)",grana:"grana pellicola",vignettatura:"bordi scuriti"},$i={titolo_grande_centrale:"parole grandi al centro, 1-4 parole per schermata",parola_per_parola:"sottotitoli che compaiono una parola alla volta",karaoke_evidenziato:"frase intera, parola pronunciata evidenziata",sottotitolo_classico:"1-2 righe in basso, sobrio",etichetta_box:"testo dentro un box colorato",nessun_testo:"nessun testo a schermo"},Di=["alto","centro","terzo_inferiore"],Mi=["energico","elegante","emozionale","divertente","lusso","urbano_hiphop","acustico_caldo","elettronico","epico","chill"];function G(){let i=["LOOK COLORE:"];for(let[e,o]of Object.entries(zi))i.push(`- ${e}: ${o}`);i.push(`
EFFETTI E TRANSIZIONI:`);for(let[e,o]of Object.entries(Ci))i.push(`- ${e}: ${o}`);i.push(`
STILI TESTO:`);for(let[e,o]of Object.entries($i))i.push(`- ${e}: ${o}`);return i.push(`
POSIZIONI TESTO: ${Di.join(", ")}`),i.push(`MOOD MUSICA: ${Mi.join(", ")}`),i.join(`
`)}var Z=i=>new Promise(e=>setTimeout(e,i));function Q(i){if(i&&typeof i=="object")return i;let e=String(i||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");try{return JSON.parse(e)}catch{}for(let[o,t]of[["{","}"],["[","]"]]){let a=e.indexOf(o),n=e.lastIndexOf(t);if(a!==-1&&n>a)try{return JSON.parse(e.slice(a,n+1))}catch{}}throw new Error("risposta non in JSON: "+e.slice(0,300))}async function z(i,e={},o=4){let t;for(let a=0;a<o;a++)try{let n=await fetch(i,e);if([429,500,502,503,504,529].includes(n.status)){t=new Error(`HTTP ${n.status}: ${(await n.text()).slice(0,300)}`),await Z(4e3*(a+1)*(n.status===429?3:1));continue}return n}catch(n){if(t=n,e.body&&typeof e.body!="string")break;await Z(3e3*(a+1))}throw new Error(`richiesta fallita (${String(i).split("?")[0]}): ${t?.message||t}`)}async function C(i,e,o,{maxTokens:t=8e3,json:a=!0}={}){if(!i.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let n=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":i.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:i.CLAUDE_MODEL,max_tokens:t,system:e,messages:[{role:"user",content:o}]})});if(n.status!==200)throw new Error(`Claude ${n.status}: ${(await n.text()).slice(0,400)}`);let l=await n.json(),d=(l.content||[]).filter(r=>r.type==="text").map(r=>r.text).join("");if(l.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata (troppo lunga): riprovo");return a?Q(d):d}async function ii(i,e,o,t,a,n=4e3){if(!i.ANTHROPIC_API_KEY)throw new Error("manca la chiave Claude (Impostazioni)");let l=[];for(let g of a)l.push({type:"text",text:`Immagine: ${g.cosa}`}),l.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:g.jpeg}});l.push({type:"text",text:t});let d=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":i.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:e,max_tokens:n,system:o,messages:[{role:"user",content:l}]})}),r=await d.text();if(d.status!==200)throw d.status===429||/credit balance|billing/i.test(r)?new Error("LIMITE_CLAUDE: "+r.slice(0,200)):new Error(`Claude ${d.status}: ${r.slice(0,300)}`);let s=JSON.parse(r);if(s.stop_reason==="max_tokens")throw new Error("risposta di Claude troncata");let c=Q((s.content||[]).filter(g=>g.type==="text").map(g=>g.text).join(""));return c._uso=s.usage?{in:s.usage.input_tokens,out:s.usage.output_tokens,modello:e}:void 0,c}var Pi=i=>{let e=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(i||"");return e?(+e[1]||0)*3600+(+e[2]||0)*60+(+e[3]||0):0};async function Ui(i,e){let o=await z("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":i.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:i.CLAUDE_MODEL,max_tokens:3e3,tools:[{type:i.WEB_SEARCH_TOOL,name:"web_search",max_uses:6}],messages:[{role:"user",content:`Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi pi\xF9 visti e apprezzati per queste ricerche: ${e.join(" | ")}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.`}]})});if(o.status!==200)throw new Error(`ricerca web ${o.status}: ${(await o.text()).slice(0,200)}`);let t=await o.json(),a=new Map,n=(s,c)=>{let g=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(s||"");g&&!a.has(g[1])&&a.set(g[1],c||"")};for(let s of t.content||[])s.type==="web_search_tool_result"&&Array.isArray(s.content)&&s.content.forEach(c=>n(c.url,c.title));let d=[...(t.content||[]).filter(s=>s.type==="text").map(s=>s.text).join(`
`).matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(s=>s[1]).filter(s=>a.has(s)),r=[...new Set([...d,...a.keys()])].slice(0,12);return{video:r.map((s,c)=>({piattaforma:"youtube",id:s,url:`https://www.youtube.com/watch?v=${s}`,video_url:null,titolo:a.get(s)||"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0,data:"",ordine_web:c})),nota:r.length?null:"la ricerca web non ha trovato Shorts"}}async function ei(i,e,o=15){if(!i.YOUTUBE_API_KEY)return Ui(i,e);let t=new Date(Date.now()-i.MESI_RICERCA*30*864e5).toISOString().replace(/\.\d+Z$/,"Z"),a=[];for(let n of e){let l=new URL("https://www.googleapis.com/youtube/v3/search");Object.entries({part:"id",q:n,type:"video",videoDuration:"short",order:"viewCount",publishedAfter:t,maxResults:o,key:i.YOUTUBE_API_KEY}).forEach(([r,s])=>l.searchParams.set(r,s));let d=await z(l.toString());if(d.status!==200)throw new Error(`YouTube ${d.status}: ${(await d.text()).slice(0,200)}`);a.push(...((await d.json()).items||[]).map(r=>r.id?.videoId).filter(Boolean))}return a=[...new Set(a)],{video:await oi(i,a,i.DURATA_MAX)}}async function oi(i,e,o=9999){let t=[];for(let a=0;a<e.length;a+=50){let n=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${e.slice(a,a+50).join(",")}&key=${i.YOUTUBE_API_KEY}`,l=await z(n);if(l.status===200)for(let d of(await l.json()).items||[]){let r=d.statistics||{},s=d.snippet||{},c=Pi(d.contentDetails?.duration);!c||c>o||t.push({piattaforma:"youtube",id:d.id,url:`https://www.youtube.com/watch?v=${d.id}`,video_url:null,titolo:s.title||"",autore:s.channelTitle||"",views:+r.viewCount||0,likes:+r.likeCount||0,commenti:+r.commentCount||0,condivisioni:0,durata:c,data:s.publishedAt||""})}}return t}async function D(i,e,o){let t=`https://api.apify.com/v2/acts/${e.replace("/","~")}/run-sync-get-dataset-items?token=${i.APIFY_TOKEN}&timeout=280`,a=await z(t,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(o)},2);if(a.status!==200&&a.status!==201)throw new Error(`Apify ${e} ${a.status}: ${(await a.text()).slice(0,200)}`);let n=await a.json();return Array.isArray(n)?n:[]}var S=(i,...e)=>{for(let o of e){let t=i;for(let a of o.split("."))t=t==null?void 0:Array.isArray(t)&&/^\d+$/.test(a)?t[+a]:t[a];if(t!=null&&t!==""&&!(Array.isArray(t)&&!t.length))return t}},L=i=>Math.round(Number(i)||0);function ai(i){return{piattaforma:"tiktok",id:String(S(i,"id","video_id")||""),url:S(i,"webVideoUrl","url","detail_url")||"",video_url:S(i,"mediaUrls.0","videoMeta.downloadAddr","videoMeta.originalDownloadAddr","video_url_720p","videoUrl")||null,titolo:String(S(i,"text","desc","ad_title")||"").slice(0,200),autore:S(i,"authorMeta.name","author","brand_name")||"",views:L(S(i,"playCount","views")),likes:L(S(i,"diggCount","likes")),commenti:L(S(i,"commentCount","comments")),condivisioni:L(S(i,"shareCount","shares")),durata:L(S(i,"videoMeta.duration","duration_sec","duration")),data:S(i,"createTimeISO")||""}}function ti(i){return{piattaforma:"instagram",id:String(S(i,"shortCode","id")||""),url:S(i,"url","reelURL")||"",video_url:S(i,"videoUrl","video_url")||null,titolo:String(S(i,"caption")||"").slice(0,200),autore:S(i,"ownerUsername")||"",views:L(S(i,"videoPlayCount","videoViewCount","views")),likes:L(S(i,"likesCount","likes")),commenti:L(S(i,"commentsCount","comments")),condivisioni:0,durata:L(S(i,"videoDuration","duration")),data:S(i,"timestamp")||"",_video:!!S(i,"videoUrl")||/video|clips/i.test(String(S(i,"type","productType")||""))}}async function ri(i,e,o,t=10){return i.APIFY_TOKEN?{video:(await D(i,i.APIFY_TIKTOK_ACTOR,{searchQueries:e,hashtags:o.map(n=>n.replace(/^#/,"")),searchSection:"/video",resultsPerPage:t,shouldDownloadVideos:!0,shouldDownloadCovers:!1,shouldDownloadSubtitles:!1,shouldDownloadSlideshowImages:!1})).map(ai).filter(n=>n.id&&(!n.durata||n.durata<=i.DURATA_MAX))}:{video:[],nota:"TikTok saltato: manca il token Apify"}}async function ni(i,e,o=15){return i.APIFY_TOKEN?{video:(await D(i,i.APIFY_INSTAGRAM_ACTOR,{directUrls:e.map(a=>`https://www.instagram.com/explore/tags/${a.replace(/^#/,"")}/`),resultsType:"posts",resultsLimit:o,addParentData:!1})).map(ti).filter(a=>a.id&&a._video&&(!a.durata||a.durata<=i.DURATA_MAX))}:{video:[],nota:"Instagram saltato: manca il token Apify"}}async function si(i,e){let o=[],t=[],a=[];for(let l of e){let d=/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l);d?o.push(d[1]):/tiktok\.com/.test(l)?t.push(l):/instagram\.com/.test(l)&&a.push(l)}let n=[];return o.length&&(i.YOUTUBE_API_KEY?n.push(...await oi(i,o)):n.push(...o.map(l=>({piattaforma:"youtube",id:l,url:`https://www.youtube.com/watch?v=${l}`,titolo:"",autore:"",views:0,likes:0,commenti:0,condivisioni:0,durata:0})))),(t.length||a.length)&&!i.APIFY_TOKEN&&(n.nota=`${t.length+a.length} link TikTok/Instagram non guardabili senza Apify`),t.length&&i.APIFY_TOKEN&&n.push(...(await D(i,i.APIFY_TIKTOK_ACTOR,{postURLs:t,shouldDownloadVideos:!0,resultsPerPage:1})).map(ai)),a.length&&i.APIFY_TOKEN&&n.push(...(await D(i,i.APIFY_INSTAGRAM_ACTOR,{directUrls:a,resultsType:"posts",resultsLimit:1})).map(ti)),{video:n.map(l=>({...l,scelto_da_johnny:!0})),nota:n.nota}}function li(i){if(!i.views&&i.ordine_web!==void 0)return 10-i.ordine_web*.1;let e=Math.max(i.views||0,1),o=((i.likes||0)+2*(i.commenti||0)+3*(i.condivisioni||0))/e;return Math.round((Math.log10(e+1)+Math.min(o,.3)*10)*1e3)/1e3}var ji=/\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;function Gi(i){try{return new URL(i).searchParams.get("code")}catch{return null}}async function Hi(i,e,o){let t=Gi(i);if(!t)throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');let a=/(^|\/\/)e\.|eapi/.test(i)?["eapi","api"]:["api","eapi"],n;for(let l of a){let d=new URL(`https://${l}.pcloud.com/${e}`);d.searchParams.set("code",t),Object.entries(o||{}).forEach(([s,c])=>d.searchParams.set(s,c));let r=await(await z(d.toString())).json();if(r.result===0)return r;n=r}throw new Error(`pCloud: ${n?.error||"errore "+n?.result}`)}async function ci(i){let e=await Hi(i,"showpublink",{}),o=[],t=(a,n="")=>{a.isfolder?(a.contents||[]).forEach(l=>t(l,n?`${n}/${a.name}`:a.name)):(a.category===2||ji.test(a.name))&&o.push({fileid:a.fileid,nome:a.name,cartella:n,dimensione:a.size,hash:String(a.hash||a.fileid),tecnico:{durata_sec:a.duration?Number(a.duration):null,risoluzione:a.width?`${a.width}x${a.height}`:null,fps:a.fps?Number(a.fps):null,orientamento:a.width?a.height>a.width?"verticale":a.width>a.height?"orizzontale":"quadrato":null,rallenty_possibile:a.fps?Number(a.fps)>=48:null}})};return t(e.metadata),o}var H=`MANUALE DEL DIRETTORE CREATIVO (dalle skill short-form-video-script + reels-script)
- Lo scopo del reel \xE8 essere impossibile da saltare: conta la visione fino in fondo, non i like.
- Metodo WATCH:
  W \xB7 Vinci i primi 3 secondi (l\xEC avviene il 50-60% degli abbandoni): l'inquadratura pi\xF9 forte per prima, niente intro,
      logo o saluti; gancio a 3 livelli insieme: immagine + testo a schermo + parlato (se c'\xE8).
  A \xB7 Arco con anelli aperti: gancio \u2192 corpo \u2192 payoff \u2192 chiusura/loop; cambio visivo ogni 2-4 s; ogni secondo deve
      catturare, insegnare o preparare il payoff, il resto si taglia.
  T \xB7 Due tracce: la maggior parte guarda SENZA AUDIO \u2192 la storia deve reggersi sui testi a schermo; il suono aggiunge.
  C \xB7 Mantieni la promessa: il payoff consegna ci\xF2 che il gancio promette (niente esca: crea un crollo di retention che
      l'algoritmo punisce).
  H \xB7 Chiudi con un loop (la fine riporta al primo fotogramma, cos\xEC si riguarda) e UNA call to action breve legata al valore.
- Instagram Reels: la portata arriva soprattutto da chi non ti segue; contano watch-through e INVII in DM (pesano 3-5 volte
  i like). Chiediti sempre: chi lo manderebbe a chi, e perch\xE9? Durata ideale 15-35 s (~75 parole \u2248 30 s); fino a 90 s solo
  se il contenuto lo regge. Mai allungare.
- Un reel = una sola idea e un solo obiettivo (portata, invii, salvataggi, follower o commenti).
- Ricerca su Instagram ora \xE8 per parole chiave: la parola chiave principale va nel testo a schermo dei primi secondi e nella
  prima frase della caption; il contenuto visivo deve corrispondere alla caption.
- Requisiti per essere spinto: contenuto originale, nessun watermark di altre piattaforme, con audio, nicchia chiara.
- La copertina si sceglie prima di pubblicare e non si cambia dopo: fotogramma forte + testo grande al centro.`,pi=`MANUALE DI IRIS (dalla skill viral-reverse-engineering)
- Meccanismo, non superficie: individua i 1-2 elementi portanti (di solito il gancio e la leva emotiva/di condivisione),
  non le caratteristiche incidentali. Copiare il rumore riproduce rumore.
- Prova controfattuale: "se tolgo questo elemento, funziona ancora?" Se crolla \xE8 un motore, se no \xE8 incidentale.
- Leva di condivisione (perch\xE9 qualcuno lo manda a un altro): identit\xE0, emozione forte (meraviglia, umorismo,
  ispirazione), valore sociale, utilit\xE0 pratica, immedesimazione, storia. Senza leva di condivisione: visualizzazioni s\xEC,
  viralit\xE0 no.
- Onest\xE0 sulla fortuna: profilo molto grande, momento irripetibile, caso, sopravvivenza dei soli vincitori. Se il successo
  dipende da questo, dichiaralo NON replicabile e non inventare una regola.
- Uscita: il principio in una riga ("la leva \xE8 X") applicabile al nostro settore, mai una copia.`,ui=`MANUALE DEL REGISTA (dalle skill capcut + short-form-video-script + captions-and-clipping)
- Metodo EDITS: monta seguendo la scheda; taglia tutto ci\xF2 che non serve; il gancio arriva nei primi secondi; l'ultimo
  taglio \xE8 il loop.
- Ritmo: cambio visivo ogni 2-4 s (taglio, punch-in, cambio inquadratura, testo che compare); niente tratti morti.
- Primo pezzo = l'immagine pi\xF9 forte di tutto il girato (mai un'inquadratura di apertura lenta, mai il logo all'inizio).
- Alterna i piani (totale, dettaglio, primo piano) e i movimenti; non ripetere lo stesso momento.
- Il finale deve poter "chiudere il cerchio" con l'inizio (stessa inquadratura, stesso gesto o movimento che riparte).
- Ogni clip deve stare in piedi da sola nel suo pezzo, con il soggetto inquadrato nel 9:16.`,mi=`MANUALE DEL COPY (dalle skill hook-writer + caption-writer + instagram-seo + hashtag-strategy)
- Il gancio funziona aprendo un vuoto che chi guarda deve chiudere. Meccanismi: curiosit\xE0, contrario, posta in gioco/costo,
  numero specifico, identit\xE0 ("se sei..."), storia gi\xE0 in corso, errore, trasformazione prima\u2192dopo, domanda, attualit\xE0.
- Scrivi 5 ganci con meccanismi DIVERSI, scegli il migliore: deve essere specifico, vero (il video lo mantiene),
  comprensibile senza audio, nel tono del brand. I ganci-template ("il segreto che nessuno ti dice") sono morti.
- Testi a schermo: brevi, leggibili in un colpo d'occhio, portano la storia anche senza audio.
- Caption: la prima riga (~125 caratteri, prima del "...altro") \xE8 tutto: niente saluti n\xE9 descrizioni dell'immagine;
  contiene la parola chiave principale in modo naturale. Corpo che mantiene la promessa, UNA sola call to action legata
  all'obiettivo (salva, manda a..., commenta con..., link in bio).
- Ricerca Instagram: parola chiave principale nella prima frase + 2-4 parole correlate nel testo, mai riempire di keyword.
- Hashtag: 3-5 etichette di argomento specifiche (non trenta, non generici tipo #reels #viral).
- Mai statistiche inventate o promesse false.`,F=`REGOLE DI PUBBLICAZIONE (dalla skill instagram-reels-publishing)
- 1080x1920, 9:16. Zone coperte dall'interfaccia: circa 250 px in alto e 350 px in basso \u2192 testi, volti e CTA nella fascia
  centrale (anche per i ritagli 4:5 del feed e 3:4 della griglia profilo).
- Copertina: scelta prima di pubblicare, non modificabile dopo; meglio una copertina dedicata che un fotogramma qualsiasi;
  testo grande (\u226560 px) al centro.`,Y=`REGOLE AUDIO (dalla skill ai-music-and-sound)
- Per un brand mai musica protetta o "di tendenza" incorporata senza licenza (rischio silenziamento/rivendicazione).
- Il brano di tendenza si aggiunge in app dalla libreria di Instagram; nel file si mettono solo suono originale ed effetti.
- Il sound design (whoosh, impatti, riser sui tagli) nei video brevi conta spesso pi\xF9 del brano.`;var gi=["piano","ricerca","riferimenti","clip","scheda","regia","montaggio","fatto"],Fi=12,fi=9*6e4;var Yi=`Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.

${H}`,qi=i=>`RICHIESTA DI JOHNNY:
${i}

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
}`,_i=i=>`Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.

${pi}

\xC8 un riferimento per un reel del settore "${i}".
Non vedi il video in movimento: ti do (1) una tavola con i primi 3 secondi (il gancio), (2) una tavola con un
fotogramma per ogni inquadratura, con il tempo scritto in giallo, (3) MISURE ESATTE fatte con ffmpeg e Whisper
(tagli, durate delle inquadrature, BPM, volume, parlato trascritto). Le misure sono vere: copiale cos\xEC come sono.
Il resto (testi a schermo, colore, inquadrature, effetti visibili) lo deduci dai fotogrammi. Quello che da
fotogrammi fermi non si pu\xF2 sapere (es. come si animano i testi, effetti sonori) scrivilo null o "non verificabile".
Non inventare. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${G()}

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
  "motori": ["i 1-2 elementi portanti (prova controfattuale)"],
  "leva_condivisione": "identit\xE0|emozione|valore_sociale|utilit\xE0|immedesimazione|storia|nessuna",
  "replicabile": {"si": bool, "perche": "eventuali fattori di fortuna/dimensione profilo"},
  "principio": "la leva in una riga, applicabile al nostro settore",
  "da_copiare": ["tecniche replicabili"],
  "da_evitare": ["cosa non funziona o \xE8 gi\xE0 visto"]
}`,bi=i=>`Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
per chi dovr\xE0 montare un reel verticale 9:16. Non vedi il video in movimento: ti do i fotogrammi in ordine di tempo
(tempo in giallo) e MISURE ESATTE: fps, risoluzione, durata; per ogni fotogramma nitidezza (varianza del laplaciano
su 480 px: sotto ~40 tende a mosso/sfocato, sopra ~150 \xE8 nitido), luminosit\xE0 0-255, % bruciato e % chiuso;
movimento tra fotogrammi (alto = camera o soggetto che si muovono); parlato trascritto da Whisper.
Usa le misure per qualit\xE0 e problemi, i fotogrammi per contenuto e inquadrature. Non inventare.
Sii sintetico: al massimo 8 momenti e 5 problemi, frasi brevi.

Contesto del lavoro: ${i}

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
}`,Bi=`Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Rispondi SOLO JSON.

${H}

${F}

${Y}`,Ki=(i,e,o,t)=>`RICHIESTA DI JOHNNY:
${i}

PIANO: ${JSON.stringify(e)}

LIBRERIA:
${G()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di pi\xF9):
${JSON.stringify(o)}

CLIP DISPONIBILI (analisi dell'Analista; pu\xF2 essere vuoto):
${JSON.stringify(t)}

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
  "obiettivo_reel": "portata|invii|salvataggi|follower|commenti",
  "leva_invio": "chi lo manderebbe a chi e perch\xE9",
  "loop": "come la fine si ricollega all'inizio",
  "parola_chiave": "parola chiave principale per la ricerca Instagram",
  "copertina": {"momento": "quale inquadratura", "testo": "testo grande della copertina"},
  "caption": "bozza caption",
  "hashtag": ["..."],
  "riferimenti_chiave": [{"url": "...", "perche": "..."}],
  "clip_da_usare": [{"file": "...", "momento": "da-a sec", "per": "fase"}],
  "clip_mancanti": ["inquadrature che servirebbero e non ci sono"],
  "rischi": ["cosa pu\xF2 venire male e come evitarlo"]
}`;async function Wi(i,e,o){await h(i,o.id,"direttore","leggo la richiesta e preparo la ricerca");let t=await C(e,Yi,qi(o.prompt),{maxTokens:1500});await A(i,"UPDATE lavori SET piano=? WHERE id=?",JSON.stringify(t),o.id),await h(i,o.id,"direttore",`settore: ${t.settore} \xB7 obiettivo: ${t.obiettivo||"-"}`)}async function Ji(i,e,o){let t=T(o.piano,{}),a=["YouTube","TikTok","Instagram","Link tuoi"],n=["scout_yt","scout_tt","scout_ig","direttore"];await h(i,o.id,"scout_yt",`${e.YOUTUBE_API_KEY?"cerco Shorts":"cerco Shorts sul web"}: ${(t.youtube_query||[]).join(" \xB7 ")}`),e.APIFY_TOKEN&&(await h(i,o.id,"scout_tt",`cerco su TikTok: ${[...t.tiktok_query||[],...(t.tiktok_hashtag||[]).map(v=>"#"+v)].join(" \xB7 ")}`),await h(i,o.id,"scout_ig",`cerco reel: ${(t.instagram_hashtag||[]).map(v=>"#"+v).join(" \xB7 ")}`));let l=await Promise.allSettled([ei(e,t.youtube_query||[]),ri(e,t.tiktok_query||[],t.tiktok_hashtag||[]),ni(e,t.instagram_hashtag||[]),si(e,T(o.link_rif,[]))]),d={};for(let v=0;v<4;v++){let m=l[v];if(m.status==="rejected"){await h(i,o.id,n[v],`${a[v]}: ${m.reason?.message||m.reason}`,"warn"),d[a[v]]=[];continue}let f=Array.isArray(m.value)?m.value:m.value.video;d[a[v]]=f,!((v===1||v===2)&&!e.APIFY_TOKEN)&&(m.value.nota&&await h(i,o.id,n[v],m.value.nota,"warn"),(v<3||f.length)&&await h(i,o.id,n[v],v<3?`trovati ${f.length} video`:`i tuoi link: ${f.length} video`))}let r=[...d["Link tuoi"]],s=["YouTube","TikTok","Instagram"].filter(v=>d[v].length),c=s.length?Math.max(1,Math.floor(Math.max(e.NUM_RIFERIMENTI-r.length,s.length)/s.length)):0;for(let v of s){let m=new Set;r.push(...d[v].map(f=>({...f,punteggio:li(f)})).sort((f,u)=>u.punteggio-f.punteggio).filter(f=>!m.has(f.id)&&m.add(f.id)).slice(0,c))}let g=new Set;if(r.splice(0,r.length,...r.filter(v=>{let m=`${v.piattaforma}:${v.id}`;return!g.has(m)&&g.add(m)})),!r.length)throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");let p=r.map(v=>({video:v,stato:"da_guardare"}));await A(i,"UPDATE lavori SET candidati=?, riferimenti=?, motore_visto=NULL WHERE id=?",JSON.stringify(d),JSON.stringify(p),o.id),await h(i,o.id,"direttore",`scelgo ${p.length} reel da far guardare a Iris`)}async function Xi(i,e,o){let t=T(o.riferimenti,[]);if(!o.motore_visto){let a=0;for(let n of t){if(n.stato!=="da_guardare")continue;let l=await O(i,"SELECT dati FROM cache_analisi WHERE chiave=?",B(n.video));l&&(Object.assign(n,{stato:"fatto",analisi:T(l.dati,{})}),a++)}await A(i,"UPDATE lavori SET riferimenti=?, motore_visto=? WHERE id=?",JSON.stringify(t),w(),o.id),a&&await h(i,o.id,"occhi",`${a} reel gi\xE0 visti in passato: non li riguardo`),t.some(n=>n.stato==="da_guardare")&&await h(i,o.id,"motore",`chiamo il motore GitHub: scarico e misuro ${t.filter(n=>n.stato==="da_guardare").length} reel di riferimento`)}if(t.some(a=>a.stato==="da_guardare"))return q(i,o);if(!t.some(a=>a.stato==="fatto"))throw new Error("nessun reel di riferimento \xE8 stato analizzato (vedi il registro)");return await A(i,"UPDATE lavori SET motore_visto=NULL WHERE id=?",o.id),!0}async function q(i,e){return e.motore_visto&&Date.now()-new Date(e.motore_visto)>75*6e4&&!(e.motore_fino&&e.motore_fino>w())&&(await h(i,e.id,"motore","il motore GitHub non si fa vivo da pi\xF9 di un'ora: controlla GitHub \u2192 momento-montaggio \u2192 Actions","warn"),await A(i,"UPDATE lavori SET motore_visto=? WHERE id=?",w(),e.id)),!1}var B=i=>`rif2:${i.piattaforma}:${i.id}`,vi={pcloud:{nome:"Cartella pCloud",pronta:i=>!!i.pcloud,elenca:async i=>(await ci(i.pcloud)).map(e=>({...e,sorgente:{tipo:"pcloud",fileid:e.fileid}}))}};async function Vi(i,e,o){let t=vi[o.fonte||"pcloud"]||vi.pcloud;if(!t.pronta(o))return await h(i,o.id,"analista","nessun girato collegato: preparo scheda e lista delle riprese"),!0;let a=T(o.clip,null);if(!a){let n=await t.elenca(o);if(!n.length)throw new Error("nella cartella pCloud non ci sono video");a=n.map(r=>({...r,stato:"da_guardare"}));let l=0;for(let r of a){let s=await O(i,"SELECT dati FROM cache_analisi WHERE chiave=?",K(r));if(s){let c=T(s.dati,{});Object.assign(r,{stato:"fatto",analisi:c.analisi||c,tecnico:c.tecnico||r.tecnico}),l++}}await A(i,"UPDATE lavori SET clip=?, motore_visto=? WHERE id=?",JSON.stringify(a),w(),o.id);let d=Math.round(a.reduce((r,s)=>r+(s.dimensione||0),0)/1073741824*10)/10;await h(i,o.id,"analista",`${a.length} clip trovate (${t.nome}, ${d} GB)${l?`, ${l} gi\xE0 viste in passato`:""}`),a.some(r=>r.stato==="da_guardare")&&await h(i,o.id,"motore","chiamo il motore GitHub: scarico e misuro le clip per Ada")}return a.some(n=>n.stato==="da_guardare")?q(i,o):!0}var K=i=>`clip2:${i.hash}:${i.dimensione}`;async function Zi(i,e,o){await h(i,o.id,"direttore","incrocio riferimenti e clip, scrivo la scheda tecnica");let t=T(o.riferimenti,[]).filter(l=>l.stato==="fatto").map(l=>({piattaforma:l.video.piattaforma,url:l.video.url,views:l.video.views,likes:l.video.likes,scelto_da_johnny:!!l.video.scelto_da_johnny,analisi:l.analisi})),a=(T(o.clip,[])||[]).filter(l=>l.stato==="fatto").map(l=>({file:l.nome,tecnico:l.tecnico,...l.analisi})),n=await C(e,Bi,Ki(o.prompt,T(o.piano,{}),t,a),{maxTokens:16e3});await A(i,"UPDATE lavori SET scheda=? WHERE id=?",JSON.stringify(n),o.id),await h(i,o.id,"direttore",`scheda pronta: ${n.titolo_lavoro||""}`)}var M=["caldo_cinematico","pulito_commerciale","teal_orange","moody_scuro","naturale_vivace","bn_contrasto","pastello_soft","vintage_film"],Ei=["taglio_netto","dissolvenza","flash_bianco","whip_pan","zoom","glitch","slide","fadenero"],wi=["punch_in","zoom_lento","zoom_out","shake","nessuno"],Ti=["grana","vignettatura","bande_cinema","light_leak"],hi=`Sei il Regista e il Copy di Momento Produzione. Trasformi la SCHEDA TECNICA del Direttore creativo in un
PIANO DI MONTAGGIO preciso che un montatore automatico eseguir\xE0 alla lettera. Scegli i pezzi migliori dalle clip analizzate
(usa solo momenti con qualit\xE0 alta e senza problemi, rispetta i tempi da/a dei momenti), costruisci gancio \u2192 sviluppo \u2192 climax \u2192
chiusura, alterna inquadrature (totale/dettaglio/primo piano), non ripetere lo stesso momento. Il rallenty va su clip girate a
48 fps o pi\xF9 (rallenty_possibile). Testi brevi, in italiano corretto, niente formule abusate. Rispondi SOLO JSON.

${ui}

${mi}

${F}

${Y}`,Qi=(i,e)=>`SCHEDA TECNICA:
${JSON.stringify(i)}

CLIP DISPONIBILI (indice, file, dati tecnici, momenti con tempi e qualit\xE0, problemi):
${JSON.stringify(e)}

VALORI AMMESSI
- look: ${M.join(", ")}
- transizione_in: ${Ei.join(", ")} (la prima clip non ne ha)
- effetto: ${wi.join(", ")}
- effetti_globali: ${Ti.join(", ")}
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
  "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}],
  "loop": "come il finale si ricollega al primo pezzo",
  "copertina": {"clip": indice, "secondo": n, "testo": "testo grande della copertina (2-5 parole)"},
  "parola_chiave": "...",
  "caption": "caption finale: prima riga con la parola chiave, corpo, UNA call to action",
  "hashtag": ["3-5 etichette specifiche"],
  "musica_da_mettere": "che brano cercare su Instagram e da che secondo, a che volume rispetto al suono originale"
}`;async function ie(i,e,o){let t=T(o.scheda,{}),a=(T(o.clip,[])||[]).map((u,y)=>({c:u,i:y})).filter(({c:u})=>u.stato==="fatto").map(({c:u,i:y})=>({indice:y,file:u.nome,tecnico:u.tecnico,descrizione:u.analisi?.descrizione,momenti:u.analisi?.momenti,problemi:u.analisi?.problemi,parlato:u.analisi?.parlato,verticale:u.analisi?.adatta_al_verticale})),n=T(o.montaggio,null);if(!a.length){await h(i,o.id,"regista","nessun girato: scrivo la lista delle inquadrature da girare o da trovare");let u=await C(e,hi,`SCHEDA TECNICA:
${JSON.stringify(t)}

Non c'\xE8 ancora girato. Scrivi la LISTA DELLE RIPRESE necessarie per montare questo reel, nell'ordine del montaggio.
JSON: {"riprese": [{"n": 1, "fase": "gancio|sviluppo|climax|chiusura", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro", "cosa": "...", "movimento": "...", "durata_utile_sec": n, "fps_consigliati": 25|50|60, "note": "luce, angolo, cosa evitare"}],
 "consigli_ripresa": ["..."], "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}], "caption": "...", "hashtag": ["..."]}`,{maxTokens:6e3});return await A(i,"UPDATE lavori SET montaggio=? WHERE id=?",JSON.stringify({stato:"senza_girato",lista_riprese:u,creato:w()}),o.id),await h(i,o.id,"regista",`lista pronta: ${(u.riprese||[]).length} inquadrature. Aggiungi il girato dalla pagina del lavoro e monto.`),"salta"}let l=n?.indicazioni_rimonta;await h(i,o.id,"regista",l?`rimonto con le tue indicazioni: ${l.testo||""}`:`scrivo il piano di montaggio da ${a.length} clip`);let d=l?`

QUESTO \xC8 UN NUOVO MONTAGGIO. Piano precedente:
${JSON.stringify(n.piano||{})}

INDICAZIONI DI JOHNNY PER IL NUOVO MONTAGGIO (hanno la precedenza sulla scheda):
${JSON.stringify(l)}
Cambia davvero quello che chiede, il resto miglioralo se puoi.`:"",r=await C(e,hi,Qi(t,a)+d,{maxTokens:12e3}),s=T(o.clip,[]),c=(r.segmenti||[]).filter(u=>s[u.clip]?.stato==="fatto").slice(0,40).map((u,y)=>{let b=s[u.clip],R=Number(b.tecnico?.durata_sec)||9999,_=Math.min(Math.max(Number(u.durata)||1.5,.4),12),I=!!u.rallenty,Li=_*(I?.5:1);return{clip:u.clip,fileid:b.sorgente?.tipo==="url"?null:b.fileid,url:b.sorgente?.tipo==="url"?b.sorgente.url:null,nome:b.nome,in:Math.max(0,Math.min(Number(u.in)||0,Math.max(0,R-Li-.05))),durata:_,rallenty:I,effetto:wi.includes(u.effetto)?u.effetto:"nessuno",transizione_in:y===0?null:Ei.includes(u.transizione_in)?u.transizione_in:"taglio_netto",audio:Math.min(1,Math.max(0,Number(u.audio??.8))),motivo:u.motivo,testo:u.testo?.testo?u.testo:null}});if(!c.length)throw new Error("il piano del Regista non contiene pezzi validi");let g=l?.look&&M.includes(l.look)?l.look:null,p=r.copertina&&s[r.copertina.clip]?.stato==="fatto"?{fileid:s[r.copertina.clip].fileid,url:s[r.copertina.clip].sorgente?.url||null,secondo:Math.max(0,Number(r.copertina.secondo)||0),testo:String(r.copertina.testo||"").slice(0,60)}:null,v={...r,segmenti:c,look:g||(M.includes(r.look)?r.look:M.includes(t.colore?.look)?t.colore.look:"naturale_vivace"),effetti_globali:(r.effetti_globali||[]).filter(u=>Ti.includes(u)),copertina:p},m=(n?.versione||0)+1;await A(i,"UPDATE lavori SET montaggio=? WHERE id=?",JSON.stringify({stato:"da_fare",piano:v,versione:m,creato:w(),indicazioni:l||null}),o.id);let f=c.reduce((u,y)=>u+y.durata,0);return await h(i,o.id,"regista",`piano pronto: ${c.length} pezzi, ~${Math.round(f+(v.chiusura?.durata||0))} s, look ${v.look}`),(c.some(u=>u.testo)||v.chiusura)&&await h(i,o.id,"copy",`testi: ${[...c.filter(u=>u.testo).map(u=>'"'+u.testo.testo+'"'),v.chiusura?.testo?'"'+v.chiusura.testo+'"':""].filter(Boolean).join(" \xB7 ").slice(0,300)}`),await h(i,o.id,"motore","chiamo il motore GitHub per il montaggio"),!0}async function ee(i,e,o){let t=T(o.montaggio,null);if(!t||t.stato==="fatto")return!0;if(t.stato==="errore")throw new Error("montaggio non riuscito: "+(t.errore||""));return q(i,o)}async function oe(i,e,o,t){for(;Date.now()<t;){o=await O(i,"SELECT * FROM lavori WHERE id=?",o.id);let a=!0;if(o.fase==="piano"?await Wi(i,e,o):o.fase==="ricerca"?await Ji(i,e,o):o.fase==="riferimenti"?a=await Xi(i,e,o):o.fase==="clip"?a=await Vi(i,e,o):o.fase==="scheda"?await Zi(i,e,o):o.fase==="regia"?a=await ie(i,e,o):o.fase==="montaggio"&&(a=await ee(i,e,o)),!a)return"attesa";let n=gi[gi.indexOf(o.fase)+1];if(a==="salta"&&(n="fatto"),await A(i,"UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",n,n==="fatto"?"pronto":"in_corso",w(),o.id),n==="fatto"){await h(i,o.id,"regia",T((await O(i,"SELECT montaggio FROM lavori WHERE id=?",o.id))?.montaggio,null)?.stato==="fatto"?"\u2705 reel montato: aprilo e guardalo":"\u2705 lavoro pronto: apri la scheda");return}}}async function Ai(i){let e=Date.now(),o=await k(i),t=w(),a=new Date(Date.now()+Fi*6e4).toISOString();for(let n=0;n<5&&Date.now()-e<fi-6e4;n++){let l=await N(i,`UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`,a,t,t);if(!l.length)return;let d=l[0];try{await oe(i,o,d,e+fi)==="attesa"?await A(i,"UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?",new Date(Date.now()+5e4).toISOString(),d.id):await A(i,"UPDATE lavori SET blocco_fino=NULL WHERE id=?",d.id)}catch(r){let s=String(r?.message||r).slice(0,500),c=d.tentativi>=3||/manca la chiave/.test(s),g=new Date(Date.now()+2*6e4).toISOString();await A(i,"UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?",c?"errore":"in_corso",s,c?null:g,w(),d.id);let p=(await O(i,"SELECT fase FROM lavori WHERE id=?",d.id))?.fase||d.fase;await h(i,d.id,"regia",`${c?"\u274C fermo":"\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${p}): ${s}`,c?"errore":"warn")}}}var ae="johnhant91/momento-montaggio",te="momento-reel",re={riferimenti:"riferimenti",clip:"clip"},x=(i,e=200)=>new Response(JSON.stringify(i),{status:e,headers:{"content-type":"application/json","cache-control":"no-store"}}),W=i=>Uint8Array.from(atob(i.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(i.length/4)*4,"=")),e=>e.charCodeAt(0));async function ne(i){let o=String(i||"").replace(/^Bearer\s+/i,"").trim().split(".");if(o.length!==3)return null;let t,a;try{t=JSON.parse(new TextDecoder().decode(W(o[0]))),a=JSON.parse(new TextDecoder().decode(W(o[1])))}catch{return null}let n=Array.isArray(a.aud)?a.aud:[a.aud];if(a.iss!=="https://token.actions.githubusercontent.com"||!n.includes(te)||String(a.repository||"").toLowerCase()!==ae||!a.exp||a.exp*1e3<Date.now())return null;let d=((await(await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cf:{cacheTtl:3600,cacheEverything:!0}})).json()).keys||[]).find(c=>c.kid===t.kid);if(!d)return null;let r=await crypto.subtle.importKey("jwk",d,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},!1,["verify"]);return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",r,W(o[2]),new TextEncoder().encode(o[0]+"."+o[1]))?a:null}var Ii=i=>{try{return new URL(i).searchParams.get("code")}catch{return null}};async function J(i,e,o,t,a){await A(i,`UPDATE lavori SET ${o}=json_set(${o}, ?, json(?)), motore_visto=? WHERE id=?`,`$[${Math.trunc(t)}]`,JSON.stringify(a),w(),e)}var P=i=>`EXISTS (SELECT 1 FROM json_each(lavori.${i}) WHERE json_extract(value, '$.stato')='da_guardare')`;async function Si(i,e,o){let t=o.pathname,a=i.method;if(t==="/api/motore/coda"&&a==="GET"){let m=await O(e,`SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${P("riferimenti")}) OR (fase='clip' AND clip IS NOT NULL AND ${P("clip")}) OR
      (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))`);return x({lavoro:(m?.n||0)>0})}if(t==="/api/motore/prossimo"&&a==="POST"){if(!await ne(i.headers.get("authorization")))return x({errore:"motore non riconosciuto"},401);let m=w(),f=[...crypto.getRandomValues(new Uint8Array(24))].map(_=>_.toString(16).padStart(2,"0")).join(""),u=await O(e,`UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${P("riferimenti")}) OR
          (fase='clip' AND clip IS NOT NULL AND ${P("clip")}) OR
          (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))
        ORDER BY id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip, montaggio`,f,new Date(Date.now()+55*6e4).toISOString(),m,m);if(!u)return new Response(null,{status:204});let y=u.fase;if(y==="montaggio"){let _=T(u.montaggio,{});return await h(e,u.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: scarico ${new Set(_.piano.segmenti.map(I=>I.fileid)).size} clip e monto il reel`),x({id:u.id,tipo:y,pass:f,pcloud_code:Ii(u.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(u.pcloud||""),piano:_.piano})}let R=T(y==="riferimenti"?u.riferimenti:u.clip,[]).map((_,I)=>[_,I]).filter(([_])=>_.stato==="da_guardare").map(([_,I])=>y==="riferimenti"?{indice:I,nome:`${_.video.piattaforma} \xB7 ${(_.video.titolo||_.video.url||"").slice(0,60)}`,url:_.video.url,video_url:_.video.video_url?_.video.video_url.includes("api.apify.com")?`${o.origin}/api/motore/${u.id}/scarica?i=${I}&tipo=riferimenti&pass=${f}`:_.video.video_url:null}:{indice:I,nome:_.nome,fileid:_.sorgente?.tipo==="pcloud"||!_.sorgente?_.fileid:null,video_url:_.sorgente?.tipo==="url"?_.sorgente.url:null,dimensione:_.dimensione});return await h(e,u.id,"motore",`\u2699\uFE0F motore GitHub al lavoro: ${R.length} ${y==="riferimenti"?"reel da scaricare e misurare":"clip da scaricare e misurare"}`),x({id:u.id,tipo:y,pass:f,pcloud_code:Ii(u.pcloud),pcloud_eu:/(^|\/\/)e\.|eapi/.test(u.pcloud||""),elementi:R})}let n=t.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica|log|video|anteprima|copertina|esito)$/);if(!n)return x({errore:"non trovato"},404);let l=Number(n[1]),d=await O(e,"SELECT id, prompt, piano, fase, riferimenti, clip, montaggio, motore_pass FROM lavori WHERE id=?",l),r=i.headers.get("x-pass")||o.searchParams.get("pass")||"";if(!d||!d.motore_pass||r.length<32||r!==d.motore_pass)return x({errore:"lasciapassare non valido"},403);let s=re[o.searchParams.get("tipo")]||(d.fase==="riferimenti"?"riferimenti":"clip"),c=T(d[s],[]),g=Number(o.searchParams.get("i")),p=c[g],v=m=>s==="riferimenti"?`${m.video.piattaforma} ${m.video.id}`:m.nome;if(n[2]==="log"&&a==="POST"){let m=await i.json().catch(()=>({})),f=["editor","vfx","color","audio","sottotitoli","revisore","motore"].includes(m.agente)?m.agente:"motore";return await h(e,l,f,String(m.messaggio||"").slice(0,300),m.livello==="warn"?"warn":"info"),await A(e,"UPDATE lavori SET motore_visto=? WHERE id=?",w(),l),x({ok:!0})}if((n[2]==="video"||n[2]==="anteprima"||n[2]==="copertina")&&a==="POST"){if(!e.VIDEO)return x({errore:"archivio video non collegato"},500);let m=Number(i.headers.get("content-length")||0);if(!m||m>25*1024*1024)return x({errore:`file di ${Math.round(m/1048576)} MB: oltre il limite di 25 MB`},400);let f=`lavoro-${l}/${n[2]==="video"?"reel.mp4":n[2]+".jpg"}`;return await e.VIDEO.put(f,await i.arrayBuffer(),{metadata:{tipo:n[2]==="video"?"video/mp4":"image/jpeg"}}),x({ok:!0,chiave:f})}if(n[2]==="esito"&&a==="POST"){let m=await i.json().catch(()=>({})),f=T(d.montaggio,{});return m.errore?(f.tentativi=(f.tentativi||0)+1,f.errore=String(m.errore).slice(0,500),f.stato=f.tentativi<2?"da_fare":"errore",await h(e,l,"editor",`montaggio non riuscito: ${f.errore.slice(0,200)}${f.stato==="da_fare"?" \u2014 riprovo":""}`,"warn")):(Object.assign(f,{stato:"fatto",revisore:m.revisore||{},video:`lavoro-${l}/reel.mp4`,anteprima:`lavoro-${l}/anteprima.jpg`,copertina:m.copertina?`lavoro-${l}/copertina.jpg`:null,finito:w()}),delete f.indicazioni_rimonta),await A(e,"UPDATE lavori SET montaggio=?, motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",JSON.stringify(f),w(),l),x({ok:!0})}if(n[2]==="scarica"&&a==="GET"){if(!p?.video?.video_url)return x({errore:"niente da scaricare"},404);let m=await k(e),f=await fetch(p.video.video_url,{headers:{authorization:`Bearer ${m.APIFY_TOKEN}`}});return new Response(f.body,{status:f.status,headers:{"content-type":f.headers.get("content-type")||"video/mp4",...f.headers.get("content-length")?{"content-length":f.headers.get("content-length")}:{}}})}if(n[2]==="elemento"&&a==="POST"){if(!p)return x({errore:"elemento sconosciuto"},400);let m=await i.json().catch(()=>null);if(!m?.misure||!Array.isArray(m.immagini)||!m.immagini.length)return x({errore:"dati mancanti"},400);let f=await k(e),u=s==="riferimenti",y=u?"occhi":"analista",b=m.misure;await h(e,l,y,`sto guardando ${u?p.video.piattaforma+" \xB7 "+(p.video.titolo||p.video.url).slice(0,50):p.nome} (${b.tecnico?.risoluzione||"?"} \xB7 ${b.tecnico?.fps||"?"} fps \xB7 ${b.numero_tagli} tagli${b.bpm_stimato?" \xB7 "+b.bpm_stimato+" BPM":""})`);try{let R=u?_i(T(d.piano,{}).settore||""):bi(d.prompt),_=`MISURE ESATTE (ffmpeg + Whisper):
${JSON.stringify(b)}

Rispondi SOLO con il JSON richiesto.`,I=await ii(f,u?f.CLAUDE_MODEL:f.CLAUDE_MODEL_LIGHT,R,_,m.immagini.slice(0,3),7e3);return u?(Object.assign(I,{numero_tagli:b.numero_tagli,durata_media_inquadratura_sec:b.durata_media_inquadratura_sec,durata_sec:b.tecnico?.durata_sec}),I.audio={...I.audio||{},bpm_stimato:b.bpm_stimato??I.audio?.bpm_stimato??null,volume_lufs:b.volume_lufs},I.misure={tagli_sec:b.tagli_sec,piu_breve:b.inquadratura_piu_breve_sec,piu_lunga:b.inquadratura_piu_lunga_sec,tagli_sul_beat_indice:b.tagli_sul_beat_indice,parlato:b.parlato},Object.assign(p,{stato:"fatto",analisi:I,errore:void 0}),await e.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(B(p.video),JSON.stringify(I),w()).run()):(I.misure={qualita:b.qualita_fotogrammi,movimento:b.movimento_tra_fotogrammi,tagli_interni_sec:b.tagli_sec,volume_lufs:b.volume_lufs,parlato:b.parlato},Object.assign(p,{stato:"fatto",analisi:I,tecnico:{...p.tecnico||{},...b.tecnico},errore:void 0}),await e.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(K(p),JSON.stringify({analisi:I,tecnico:p.tecnico}),w()).run()),await J(e,l,s,g,p),await h(e,l,y,`guardato: ${u?p.video.piattaforma:p.nome} \u2014 ${String(u?I.perche_funziona||I.gancio?.cosa_succede:I.descrizione||"").slice(0,130)}`),x({ok:!0,uso:I._uso})}catch(R){let _=String(R?.message||R).slice(0,300);return _.startsWith("LIMITE_CLAUDE")?(await h(e,l,y,"\u23F8 Claude ha rifiutato per limite o credito esaurito: riprendo pi\xF9 tardi. "+_.slice(15,160),"warn"),x({errore:_},429)):(p.tentativi=(p.tentativi||0)+1,p.errore=_,p.stato=p.tentativi<3?"da_guardare":"saltato",await J(e,l,s,g,p),await h(e,l,y,`${v(p)}: ${_}${p.stato==="saltato"?" \u2014 saltato":` \u2014 riprovo (${p.tentativi}/3)`}`,"warn"),x({errore:_},502))}}if(n[2]==="errore"&&a==="POST"){if(!p)return x({errore:"elemento sconosciuto"},400);let m=await i.json().catch(()=>({}));return p.tentativi=(p.tentativi||0)+1,p.errore=String(m.errore||"errore del motore").slice(0,300),p.stato=p.tentativi<3&&!/YouTube non ha lasciato|HTTP 4\d\d/.test(p.errore)?"da_guardare":"saltato",await J(e,l,s,g,p),await h(e,l,"motore",`${v(p)}: ${p.errore}${p.stato==="saltato"?" \u2014 saltato":" \u2014 riprovo"}`,"warn"),x({ok:!0})}if(n[2]==="fine"&&a==="POST"){if(await A(e,"UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?",w(),l),(await i.json().catch(()=>({}))).silenzioso)return x({ok:!0});let m=c.filter(f=>f.stato==="fatto").length;return await h(e,l,"motore",`giro del motore finito: ${m}/${c.length} ${s==="riferimenti"?"reel":"clip"} analizzati`),x({ok:!0})}return x({errore:"metodo non consentito"},405)}var xi=`<!DOCTYPE html>
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
    '<label>Fonte del girato</label><select id="fo"><option value="pcloud">Le mie clip (cartella pCloud)</option><option disabled>Video stock \u2014 in arrivo</option><option disabled>Generati con AI \u2014 in arrivo</option></select>' +
    '<label>Cartella delle clip su pCloud (facoltativo)</label><input id="pc" placeholder="https://e.pcloud.link/publink/show?code=\u2026">' +
    '<div class="aiuto">Su pCloud: tasto destro sulla cartella \u2192 Condividi \u2192 Link di condivisione \u2192 copia. Senza clip ottieni scheda e lista delle riprese, e il girato lo aggiungi dopo.</div>' +
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
    '<b>Chiusura</b><span>' + e(s.chiusura?.tipo) + ' \u2014 ' + e(s.chiusura?.cta) + '</span>' +
    (s.obiettivo_reel ? '<b>Obiettivo</b><span>' + e(s.obiettivo_reel) + (s.leva_invio ? ' \xB7 chi lo manda a chi: ' + e(s.leva_invio) : '') + '</span>' : '') +
    (s.loop ? '<b>Loop</b><span>' + e(s.loop) + '</span>' : '') +
    (s.parola_chiave ? '<b>Parola chiave</b><span>' + e(s.parola_chiave) + '</span>' : '') +
    (s.copertina ? '<b>Copertina</b><span>' + e(s.copertina.momento) + ' \u2014 \u201C' + e(s.copertina.testo) + '\u201D</span>' : '') + '</div></div>' +
    '<h2>Cosa funziona nel settore</h2><div class="card">' + lst(s.cosa_funziona_nel_settore) + '</div>' +
    '<h2>Struttura</h2><div class="card"><table>' + st + '</table></div>' +
    '<h2>Clip da usare</h2><div class="card">' + lst((s.clip_da_usare || []).map((c) => c.file + ' \xB7 ' + c.momento + ' \u2192 ' + c.per)) + '</div>' +
    '<h2>Clip mancanti</h2><div class="card">' + lst(s.clip_mancanti) + '</div>' +
    '<h2>Rischi</h2><div class="card">' + lst(s.rischi) + '</div>' +
    '<h2>Caption</h2><div class="card"><p style="white-space:pre-wrap">' + e(s.caption) + '</p><p class="mut">' + e((s.hashtag || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p></div>';
}

const LOOKS_UI = [['', 'come prima'], ['caldo_cinematico', 'Caldo cinematico'], ['pulito_commerciale', 'Pulito commerciale'], ['teal_orange', 'Teal & orange'], ['moody_scuro', 'Moody scuro'], ['naturale_vivace', 'Naturale vivace'], ['bn_contrasto', 'Bianco e nero'], ['pastello_soft', 'Pastello'], ['vintage_film', 'Vintage film']];

function boxGirato(L) {
  return '<div class="card"><b>Aggiungi il girato</b><p class="mut">Link pubblico della cartella pCloud con le clip: Max le scarica e le misura, poi scheda, piano e montaggio.</p>' +
    '<input id="gir" placeholder="https://e.pcloud.link/publink/show?code=\u2026"><div style="margin-top:10px"><button id="gir_ok">Collega e monta</button></div><div id="gir_er" class="err"></div></div>';
}

function vistaReel(L) {
  const m = L.montaggio;
  if (!m) return L.stato === 'pronto' && !L.pcloud ? '<h2>Girato</h2>' + boxGirato(L) : '';
  if (m.stato === 'senza_girato') {
    const lr = m.lista_riprese || {};
    return '<h2>Lista delle riprese</h2><div class="card"><p class="mut">Non c\u2019\xE8 ancora girato: ecco cosa serve, nell\u2019ordine del montaggio.</p><table><tr><th>#</th><th>Fase</th><th>Inquadratura</th><th>Note</th></tr>' +
      (lr.riprese || []).map((r) => '<tr><td>' + e(r.n) + '</td><td>' + e(r.fase) + '</td><td><b>' + e(r.inquadratura) + '</b> \xB7 ' + e(r.cosa) + '<div class="mut">' + e(r.movimento) + ' \xB7 ' + e(r.durata_utile_sec) + ' s \xB7 ' + e(r.fps_consigliati) + ' fps</div></td><td class="mut">' + e(r.note) + '</td></tr>').join('') + '</table>' +
      ((lr.consigli_ripresa || []).length ? '<p><b>Consigli</b></p>' + lst(lr.consigli_ripresa) : '') + '</div>' + boxGirato(L);
  }
  if (m.stato !== 'fatto') return '<h2>Reel</h2><div class="card">' + (m.stato === 'errore' ? '<span class="err">Montaggio non riuscito: ' + e(m.errore) + '</span>' : '\u{1F3AC} In montaggio sul motore GitHub\u2026') + '</div>';
  const r = m.revisore || {}, p = m.piano || {};
  const t0 = Date.now();
  return '<h2>Il reel' + (m.versione > 1 ? ' \xB7 versione ' + m.versione : '') + '</h2><div class="card" style="text-align:center"><div class="riga" style="justify-content:center;align-items:flex-start;gap:14px">' +
    '<video src="/api/lavori/' + L.id + '/reel.mp4?v=' + e(m.versione || 1) + '" controls playsinline preload="metadata" style="width:100%;max-width:330px;border-radius:12px;background:#000"></video>' +
    (m.copertina ? '<div><img src="/api/lavori/' + L.id + '/copertina.jpg?v=' + e(m.versione || 1) + '" style="width:150px;border-radius:10px;display:block"><div class="mut">copertina</div></div>' : '') + '</div>' +
    '<div class="riga" style="justify-content:center;margin-top:10px"><a class="btn" href="/api/lavori/' + L.id + '/reel.mp4?scarica=1">Scarica MP4</a>' + (m.copertina ? '<a class="btn sec" href="/api/lavori/' + L.id + '/copertina.jpg?scarica=1">Scarica copertina</a>' : '') + '</div>' +
    '<p class="mut">' + e(r.durata) + ' s \xB7 ' + e(r.lufs) + ' LUFS \xB7 ' + e(r.mb) + ' MB \xB7 montato in ' + e(r.secondi_di_lavoro) + ' s</p>' +
    ((r.problemi || []).length ? '<p class="err">\u26A0\uFE0E ' + e(r.problemi.join(' \xB7 ')) + '</p>' : '<p style="color:var(--ok)">\u2713 Revisore: tutto ok</p>') + '</div>' +
    '<div class="card"><div class="kv">' +
    (p.parola_chiave ? '<b>Parola chiave</b><span>' + e(p.parola_chiave) + '</span>' : '') +
    (p.loop ? '<b>Loop</b><span>' + e(p.loop) + '</span>' : '') +
    (p.musica_da_mettere ? '<b>Musica (in app)</b><span>' + e(p.musica_da_mettere) + '</span>' : '') + '</div>' +
    (p.caption ? '<p style="white-space:pre-wrap"><b>Caption</b><br>' + e(p.caption) + '</p>' : '') +
    ((p.hashtag || []).length ? '<p class="mut">' + e(p.hashtag.map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p>' : '') +
    ((p.ganci_alternativi || []).length ? '<p><b>Ganci alternativi da provare</b></p>' + lst(p.ganci_alternativi.map((g) => g.testo + ' (' + g.meccanismo + ')')) : '') + '</div>' +
    '<div class="card"><b>Rimonta</b><p class="mut">Rif\xE0 solo piano e montaggio (niente nuova ricerca n\xE9 analisi).</p>' +
    '<label>Cosa cambiare</label><textarea id="rim_t" style="min-height:70px" placeholder="Es. pi\xF9 veloce, gancio con la tazza, meno testi, chiusura con il logo"></textarea>' +
    '<div class="riga"><div style="flex:1"><label>Look</label><select id="rim_l">' + LOOKS_UI.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('') + '</select></div>' +
    '<div style="flex:1"><label>Durata (s)</label><input id="rim_d" type="number" min="7" max="90" placeholder="come prima"></div></div>' +
    '<div style="margin-top:12px"><button id="rim_ok">Rimonta</button></div><div id="rim_er" class="err"></div></div>';
}

function vistaRiferimenti(R) {
  if (!R || !R.length) return '';
  return '<h2>Riferimenti (' + R.filter((r) => r.stato === 'fatto').length + '/' + R.length + ' guardati)</h2><div class="grid">' + R.map((r) => {
    const v = r.video, a = r.analisi || {};
    return '<div class="card"><div class="riga"><span class="tag ' + v.piattaforma + '">' + v.piattaforma + '</span>' + (v.scelto_da_johnny ? '<span class="pill">scelto da te</span>' : '') + '<span class="pill">' + e(r.stato.replace('_', ' ')) + '</span></div>' +
      '<p style="margin:8px 0 4px"><a href="' + e(v.url) + '" target="_blank" rel="noopener">' + e((v.titolo || v.url).slice(0, 80)) + '</a></p>' +
      '<div class="mut">' + n(v.views) + ' views \xB7 ' + n(v.likes) + ' like \xB7 ' + e(v.durata) + ' s \xB7 ' + e(v.autore) + '</div>' +
      (r.analisi ? '<p><b>Gancio</b> ' + e(a.gancio?.cosa_succede) + ' (fino a ' + e(a.gancio?.fine_sec) + ' s)<br><b>Ritmo</b> ' + e(a.ritmo) + ' \xB7 ' + e(a.numero_tagli) + ' tagli \xB7 media ' + e(a.durata_media_inquadratura_sec) + ' s<br><b>Look</b> ' + e(a.colore?.look) + ' \xB7 <b>Effetti</b> ' + e((a.effetti || []).join(', ')) + '<br><b>Audio</b> ' + e(a.audio?.mood) + ' ' + e(a.audio?.bpm_stimato) + ' BPM \xB7 voce ' + e(a.audio?.voce) + '</p><p class="mut">' + e(a.perche_funziona) + '</p>' + (a.principio ? '<p><b>Principio</b> ' + e(a.principio) + (a.replicabile && a.replicabile.si === false ? ' <span class="pill errore">poco replicabile</span>' : '') + '</p>' : '') : '') +
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
  if ($('#gir_ok')) $('#gir_ok').onclick = async () => { try { await chiama('/api/lavori/' + id + '/girato', { method: 'POST', body: { pcloud: $('#gir').value } }); rotta(); } catch (x) { $('#gir_er').textContent = x.message; } };
  if ($('#rim_ok')) $('#rim_ok').onclick = async () => { try { await chiama('/api/lavori/' + id + '/rimonta', { method: 'POST', body: { testo: $('#rim_t').value, look: $('#rim_l').value || null, durata: $('#rim_d').value || null } }); rotta(); } catch (x) { $('#rim_er').textContent = x.message; } };
  if ($('#rip')) $('#rip').onclick = async () => { await chiama('/api/lavori/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  if ($('#dl')) $('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(L.scheda, null, 2)], { type: 'application/json' })); a.download = 'scheda-' + id + '.json'; a.click(); };
  $('#del').onclick = async () => { if (confirm('Eliminare questo lavoro?')) { await chiama('/api/lavori/' + id, { method: 'DELETE' }); location.hash = '#/'; } };
  if (L.stato === 'in_corso') timer = setTimeout(() => { if (!document.activeElement || !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) rotta(); else timer = setTimeout(rotta, 6000); }, 6000);
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
<\/script></body></html>`;var E=(i,e=200,o={})=>new Response(JSON.stringify(i),{status:e,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...o}}),Ni=i=>[...new Uint8Array(i)].map(e=>e.toString(16).padStart(2,"0")).join(""),Ri=async i=>Ni(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(i)));async function X(i){return i.ADMIN_PASSWORD?Ri("momento-reel|"+i.ADMIN_PASSWORD):(await O(i,"SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore||null}async function ki(i){let e=await crypto.subtle.importKey("raw",new TextEncoder().encode(i),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return Ni(await crypto.subtle.sign("HMAC",e,new TextEncoder().encode("momento-reel-sessione")))}async function yi(i,e){let o=await X(e);if(!o)return!1;let t=/(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(i.headers.get("cookie")||"");return!!t&&t[1]===await ki(o)}var Oi=(i,e)=>`mr_s=${i}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${e}`;async function se(i,e,o){let t=o.pathname,a=i.method;if(t==="/api/stato")return E({configurato:!!await X(e),dentro:await yi(i,e)});if(t==="/api/accedi"&&a==="POST"){let{password:r}=await i.json().catch(()=>({}));if(!r||String(r).length<6)return E({errore:"password di almeno 6 caratteri"},400);let s=await X(e),c=Ri("momento-reel|"+r);if(!s)s=await c,await A(e,"INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)",s);else if(await c!==s)return E({errore:"password errata"},401);return E({ok:!0},200,{"set-cookie":Oi(await ki(s),3600*24*60)})}if(t==="/api/esci")return E({ok:!0},200,{"set-cookie":Oi("",0)});if(!await yi(i,e))return E({errore:"accesso richiesto"},401);if(t==="/api/impostazioni"&&a==="GET"){let r=await k(e),s=Object.fromEntries($.map(g=>{let p=r[g];return[g,{impostata:!!p,da_cloudflare:r._env[g],anteprima:p?"\u2022\u2022\u2022\u2022"+String(p).slice(-4):""}]})),c=Object.fromEntries(j.map(g=>[g,Array.isArray(r[g])?r[g].join(","):r[g]]));return E({segreti:s,opzioni:c})}if(t==="/api/impostazioni"&&a==="POST"){let r=await i.json().catch(()=>({})),s=[];for(let c of[...$,...j]){if(typeof r[c]!="string")continue;let g=r[c].trim();s.push(g?e.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(c,g):e.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(c))}return s.length&&await e.DB.batch(s),E({ok:!0})}if(t==="/api/regia"&&a==="GET"){let[r,s,c,g]=await Promise.all([N(e,"SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),N(e,"SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),N(e,"SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),N(e,"SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente",new Date(Date.now()-6048e5).toISOString())]),p=await k(e),v={Claude:!!p.ANTHROPIC_API_KEY},m=p.APIFY_TOKEN?[]:["scout_tt","scout_ig"];return E({adesso:w(),attivi:r,ultimi:s,feed:c,conti:g,chiavi:v,riposo:m,yt_web:!p.YOUTUBE_API_KEY})}let n=t.match(/^\/api\/regia\/agente\/([a-z_]+)$/);if(n&&a==="GET")return E(await N(e,"SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40",n[1]));if(t==="/api/lavori"&&a==="GET"){let r=await N(e,"SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");return E(r)}if(t==="/api/lavori"&&a==="POST"){let r=await i.json().catch(()=>({})),s=String(r.prompt||"").trim();if(s.length<10)return E({errore:"descrivi il reel in almeno una frase"},400);let c=await k(e),g=[["ANTHROPIC_API_KEY","Claude"]].filter(([f])=>!c[f]).map(([,f])=>f);if(g.length)return E({errore:`Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${g.join(", ")})`},400);let p=String(r.pcloud||"").trim()||null;if(p&&!/code=/.test(p))return E({errore:'il link pCloud deve essere il link pubblico della cartella (contiene "code=")'},400);let v=String(r.link_rif||"").split(/\s+/).filter(f=>/^https?:\/\//.test(f)).slice(0,10),m=await O(e,"INSERT INTO lavori (prompt, pcloud, link_rif, fonte, creato, aggiornato) VALUES (?,?,?,'pcloud',?,?) RETURNING id",s,p,JSON.stringify(v),w(),w());return await h(e,m.id,"regia","\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto"),E({id:m.id})}let l=t.match(/^\/api\/lavori\/(\d+)\/(reel\.mp4|anteprima\.jpg|copertina\.jpg)$/);if(l&&a==="GET"){if(!e.VIDEO)return E({errore:"archivio video non collegato"},404);let{value:r,metadata:s}=await e.VIDEO.getWithMetadata(`lavoro-${l[1]}/${l[2]}`,{type:"arrayBuffer"});if(!r)return E({errore:"non ancora pronto"},404);let c=new Headers({"content-type":s?.tipo||(l[2]==="reel.mp4"?"video/mp4":"image/jpeg"),"accept-ranges":"bytes","cache-control":"private, max-age=3600"});o.searchParams.get("scarica")&&c.set("content-disposition",`attachment; filename="${l[2]==="reel.mp4"?"reel":"copertina"}-${l[1]}.${l[2].split(".")[1]}"`);let g=r.byteLength,p=/bytes=(\d*)-(\d*)/.exec(i.headers.get("range")||"");if(p){let v=p[1]===""?Math.max(0,g-Number(p[2])):Number(p[1]),m=p[1]===""||p[2]===""?g-1:Math.min(Number(p[2]),g-1);return v>m||v>=g?new Response(null,{status:416,headers:{"content-range":`bytes */${g}`}}):(c.set("content-range",`bytes ${v}-${m}/${g}`),c.set("content-length",String(m-v+1)),new Response(r.slice(v,m+1),{status:206,headers:c}))}return c.set("content-length",String(g)),new Response(r,{headers:c})}let d=t.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro|girato|rimonta))?$/);if(d){let r=Number(d[1]);if(!d[2]&&a==="GET"){let s=await O(e,"SELECT * FROM lavori WHERE id=?",r);if(!s)return E({errore:"non trovato"},404);for(let c of["piano","riferimenti","clip","scheda","link_rif","montaggio"])s[c]=T(s[c]);return delete s.candidati,s.registro=await N(e,"SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200",r),E(s)}if(!d[2]&&a==="DELETE")return await e.DB.batch([e.DB.prepare("DELETE FROM lavori WHERE id=?").bind(r),e.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(r)]),E({ok:!0});if(d[2]==="girato"&&a==="POST"){let s=await i.json().catch(()=>({})),c=String(s.pcloud||"").trim();return/code=/.test(c)?(await A(e,"UPDATE lavori SET pcloud=?, fonte='pcloud', clip=NULL, montaggio=NULL, fase='clip', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, motore_visto=NULL, motore_pass=NULL, motore_fino=NULL, aggiornato=? WHERE id=?",c,w(),r),await h(e,r,"regia","\u{1F4C1} girato collegato: Max lo scarica e lo misura, poi scheda, piano e montaggio"),E({ok:!0})):E({errore:'serve il link pubblico della cartella pCloud (contiene "code=")'},400)}if(d[2]==="rimonta"&&a==="POST"){let s=await i.json().catch(()=>({})),c=await O(e,"SELECT montaggio, clip FROM lavori WHERE id=?",r),g=T(c?.montaggio,null);return g?.piano?(g.indicazioni_rimonta={testo:String(s.testo||"").slice(0,800),look:s.look||null,durata:Number(s.durata)||null,ritmo:s.ritmo||null},await A(e,"UPDATE lavori SET montaggio=?, fase='regia', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?",JSON.stringify(g),w(),r),await h(e,r,"regia",`\u{1F3AC} rimontaggio richiesto${s.testo?": "+String(s.testo).slice(0,120):""}`),E({ok:!0})):E({errore:"questo lavoro non ha ancora un montaggio da rifare"},400)}if(d[2]==="riprova"&&a==="POST"){let s=await i.json().catch(()=>({})),c=["piano","ricerca","riferimenti","clip","scheda","regia","montaggio"].includes(s.fase)?s.fase:null,g=await O(e,"SELECT fase, riferimenti, clip FROM lavori WHERE id=?",r);if(!g)return E({errore:"non trovato"},404);let p=c||(g.fase==="fatto"?"scheda":g.fase),v=m=>JSON.stringify((T(m,[])||[]).map(f=>f.stato==="saltato"?{...f,stato:"da_guardare",errore:void 0}:f));return await A(e,"UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",p,g.riferimenti?v(g.riferimenti):null,g.clip?v(g.clip):null,w(),r),p==="montaggio"&&await A(e,"UPDATE lavori SET montaggio=json_set(montaggio, '$.stato', 'da_fare', '$.tentativi', 0) WHERE id=? AND montaggio IS NOT NULL",r),await h(e,r,"regia",`\u{1F501} riparto dalla fase "${p}"`),E({ok:!0})}}return E({errore:"non trovato"},404)}var Ae={async fetch(i,e){await U(e);let o=new URL(i.url);if(o.pathname.startsWith("/api/motore/"))try{return await Si(i,e,o)}catch(t){return E({errore:String(t?.message||t).slice(0,300)},500)}if(o.pathname.startsWith("/api/"))try{return await se(i,e,o)}catch(t){return E({errore:String(t?.message||t).slice(0,300)},500)}return new Response(xi,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}})},async scheduled(i,e,o){await U(e),o.waitUntil(Ai(e))}};export{Ae as default};
