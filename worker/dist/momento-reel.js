// src/db.js
var ora = () => (/* @__PURE__ */ new Date()).toISOString();
var J = (s, d = null) => {
  try {
    return s == null ? d : JSON.parse(s);
  } catch {
    return d;
  }
};
var all = async (env, sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
var one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
var run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
var pronto = false;
async function schema(env) {
  if (pronto) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS lavori (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, pcloud TEXT, link_rif TEXT,
      stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'piano',
      piano TEXT, candidati TEXT, riferimenti TEXT, clip TEXT, scheda TEXT, errore TEXT,
      tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS registro (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lavoro_id INTEGER, agente TEXT, messaggio TEXT, livello TEXT, quando TEXT)`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS registro_lavoro ON registro(lavoro_id, id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS cache_analisi (chiave TEXT PRIMARY KEY, dati TEXT, quando TEXT)")
  ]);
  for (const c of ["motore_pass TEXT", "motore_fino TEXT", "motore_visto TEXT", "motore_svegliato INTEGER", "montaggio TEXT", "fonte TEXT DEFAULT 'pcloud'"]) {
    try {
      await env.DB.prepare(`ALTER TABLE lavori ADD COLUMN ${c}`).run();
    } catch {
    }
  }
  pronto = true;
}
async function log(env, lavoroId, agente, messaggio, livello = "info") {
  await run(
    env,
    "INSERT INTO registro (lavoro_id, agente, messaggio, livello, quando) VALUES (?,?,?,?,?)",
    lavoroId,
    agente,
    String(messaggio).slice(0, 600),
    livello,
    ora()
  );
}
var CHIAVI_SEGRETE = ["ANTHROPIC_API_KEY", "YOUTUBE_API_KEY", "APIFY_TOKEN", "GITHUB_TOKEN"];
var CHIAVI_OPZIONI = ["CLAUDE_MODEL", "CLAUDE_MODEL_LIGHT", "APIFY_TIKTOK_ACTOR", "APIFY_INSTAGRAM_ACTOR", "NUM_RIFERIMENTI", "DURATA_MAX", "MESI_RICERCA"];
async function configurazione(env) {
  const salvate = Object.fromEntries((await all(env, "SELECT chiave, valore FROM impostazioni")).map((r) => [r.chiave, r.valore]));
  const v = (k, d) => env[k] || salvate[k] || d;
  return {
    ANTHROPIC_API_KEY: v("ANTHROPIC_API_KEY"),
    GEMINI_API_KEY: v("GEMINI_API_KEY"),
    YOUTUBE_API_KEY: v("YOUTUBE_API_KEY"),
    APIFY_TOKEN: v("APIFY_TOKEN"),
    GITHUB_TOKEN: v("GITHUB_TOKEN"),
    CLAUDE_MODEL: v("CLAUDE_MODEL", "claude-sonnet-5-5"),
    CLAUDE_MODEL_LIGHT: v("CLAUDE_MODEL_LIGHT", "claude-haiku-5-5"),
    WEB_SEARCH_TOOL: v("WEB_SEARCH_TOOL", "web_search_20250305"),
    GEMINI_MODELS: String(v("GEMINI_MODELS", "gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash")).split(",").map((s) => s.trim()).filter(Boolean),
    APIFY_TIKTOK_ACTOR: v("APIFY_TIKTOK_ACTOR", "clockworks/tiktok-scraper"),
    APIFY_INSTAGRAM_ACTOR: v("APIFY_INSTAGRAM_ACTOR", "apify/instagram-scraper"),
    NUM_RIFERIMENTI: Number(v("NUM_RIFERIMENTI", 9)),
    DURATA_MAX: Number(v("DURATA_MAX", 90)),
    MESI_RICERCA: Number(v("MESI_RICERCA", 18)),
    FPS_ANALISI: Number(v("FPS_ANALISI", 4)),
    _salvate: salvate,
    _env: Object.fromEntries(CHIAVI_SEGRETE.map((k) => [k, !!env[k]]))
  };
}

// src/libreria.js
var LOOK_COLORE = {
  caldo_cinematico: "toni caldi, ombre morbide, leggera grana, contrasto medio",
  pulito_commerciale: "bianchi puliti, colori fedeli, contrasto alto, nitido",
  teal_orange: "pelle calda, ombre e cieli verso il ciano, look da film",
  moody_scuro: "sottoesposto, colori desaturati, neri profondi",
  naturale_vivace: "colori saturi ma naturali, luminoso, estivo",
  bn_contrasto: "bianco e nero contrastato",
  pastello_soft: "colori pastello, alte luci morbide, poco contrasto",
  vintage_film: "neri sollevati, dominante calda, grana pellicola"
};
var EFFETTI = {
  punch_in: "zoom secco del 10-20% sul taglio o sull'accento",
  zoom_lento: "zoom progressivo durante l'inquadratura",
  speed_ramp: "accelerazione/rallenty dentro la stessa clip",
  rallenty: "clip rallentata (fluida solo se girata a 50/60 fps)",
  whip_pan: "transizione a frusta con mosso direzionale",
  flash_bianco: "lampo bianco di 2-4 fotogrammi sul taglio",
  shake: "tremolio di camera sull'impatto",
  light_leak: "bagliore di luce in sovrapposizione",
  glitch: "distorsione digitale breve",
  split_screen: "schermo diviso in 2-3 riquadri",
  freeze_frame: "fermo immagine con testo",
  dissolvenza: "dissolvenza incrociata",
  taglio_netto: "taglio secco senza transizione",
  bande_cinema: "bande nere orizzontali (look cinema)",
  grana: "grana pellicola",
  vignettatura: "bordi scuriti"
};
var STILI_TESTO = {
  titolo_grande_centrale: "parole grandi al centro, 1-4 parole per schermata",
  parola_per_parola: "sottotitoli che compaiono una parola alla volta",
  karaoke_evidenziato: "frase intera, parola pronunciata evidenziata",
  sottotitolo_classico: "1-2 righe in basso, sobrio",
  etichetta_box: "testo dentro un box colorato",
  nessun_testo: "nessun testo a schermo"
};
var POSIZIONI = ["alto", "centro", "terzo_inferiore"];
var MOOD = ["energico", "elegante", "emozionale", "divertente", "lusso", "urbano_hiphop", "acustico_caldo", "elettronico", "epico", "chill"];
function libreriaTesto() {
  const r = ["LOOK COLORE:"];
  for (const [k, v] of Object.entries(LOOK_COLORE)) r.push(`- ${k}: ${v}`);
  r.push("\nEFFETTI E TRANSIZIONI:");
  for (const [k, v] of Object.entries(EFFETTI)) r.push(`- ${k}: ${v}`);
  r.push("\nSTILI TESTO:");
  for (const [k, v] of Object.entries(STILI_TESTO)) r.push(`- ${k}: ${v}`);
  r.push(`
POSIZIONI TESTO: ${POSIZIONI.join(", ")}`);
  r.push(`MOOD MUSICA: ${MOOD.join(", ")}`);
  return r.join("\n");
}

// src/servizi.js
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function estraiJson(testo) {
  if (testo && typeof testo === "object") return testo;
  let t = String(testo || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
  }
  for (const [a, c] of [["{", "}"], ["[", "]"]]) {
    const i = t.indexOf(a), j = t.lastIndexOf(c);
    if (i !== -1 && j > i) {
      try {
        return JSON.parse(t.slice(i, j + 1));
      } catch {
      }
    }
  }
  throw new Error("risposta non in JSON: " + t.slice(0, 300));
}
async function richiesta(url, opts = {}, tentativi = 4) {
  let ultimo;
  for (let n = 0; n < tentativi; n++) {
    try {
      const r = await fetch(url, opts);
      if ([429, 500, 502, 503, 504, 529].includes(r.status)) {
        ultimo = new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
        await sleep(4e3 * (n + 1) * (r.status === 429 ? 3 : 1));
        continue;
      }
      return r;
    } catch (e) {
      ultimo = e;
      if (opts.body && typeof opts.body !== "string") break;
      await sleep(3e3 * (n + 1));
    }
  }
  throw new Error(`richiesta fallita (${String(url).split("?")[0]}): ${ultimo?.message || ultimo}`);
}
async function claude(cfg, sistema, messaggio, { maxTokens = 8e3, json: json3 = true } = {}) {
  if (!cfg.ANTHROPIC_API_KEY) throw new Error("manca la chiave Claude (Impostazioni)");
  const messaggi = [{ role: "user", content: messaggio }];
  let testo = "";
  for (let pezzo = 0; pezzo < 4; pezzo++) {
    const r = await richiesta("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.CLAUDE_MODEL, max_tokens: maxTokens, system: sistema, messages: testo ? [...messaggi, { role: "assistant", content: testo }] : messaggi })
    });
    if (r.status !== 200) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 400)}`);
    const d = await r.json();
    testo += (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (d.stop_reason !== "max_tokens") return json3 ? estraiJson(testo) : testo;
    testo = testo.replace(/\s+$/, "");
  }
  throw new Error("risposta di Claude troncata anche dopo 4 continuazioni");
}
async function claudeVisione(cfg, modello, sistema, testo, immagini, maxTokens = 4e3) {
  if (!cfg.ANTHROPIC_API_KEY) throw new Error("manca la chiave Claude (Impostazioni)");
  const content = [];
  for (const im of immagini) {
    content.push({ type: "text", text: `Immagine: ${im.cosa}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: im.jpeg } });
  }
  content.push({ type: "text", text: testo });
  const r = await richiesta("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: modello, max_tokens: maxTokens, system: sistema, messages: [{ role: "user", content }] })
  });
  const t = await r.text();
  if (r.status !== 200) {
    if (r.status === 429 || /credit balance|billing/i.test(t)) throw new Error("LIMITE_CLAUDE: " + t.slice(0, 200));
    throw new Error(`Claude ${r.status}: ${t.slice(0, 300)}`);
  }
  const d = JSON.parse(t);
  if (d.stop_reason === "max_tokens") throw new Error("risposta di Claude troncata");
  const out = estraiJson((d.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
  out._uso = d.usage ? { in: d.usage.input_tokens, out: d.usage.output_tokens, modello } : void 0;
  return out;
}
var durataIso = (iso) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
};
async function youtubeDaWeb(cfg, queries) {
  const r = await richiesta("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.CLAUDE_MODEL,
      max_tokens: 3e3,
      tools: [{ type: cfg.WEB_SEARCH_TOOL, name: "web_search", max_uses: 6 }],
      messages: [{ role: "user", content: `Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi pi\xF9 visti e apprezzati per queste ricerche: ${queries.join(" | ")}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.` }]
    })
  });
  if (r.status !== 200) throw new Error(`ricerca web ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const visti = /* @__PURE__ */ new Map();
  const aggiungi = (url, titolo) => {
    const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
    if (m && !visti.has(m[1])) visti.set(m[1], titolo || "");
  };
  for (const b of d.content || []) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach((x) => aggiungi(x.url, x.title));
  }
  const testo = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const ordine = [...testo.matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map((m) => m[1]).filter((id) => visti.has(id));
  const ids = [.../* @__PURE__ */ new Set([...ordine, ...visti.keys()])].slice(0, 12);
  return {
    video: ids.map((id, i) => ({
      piattaforma: "youtube",
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      video_url: null,
      titolo: visti.get(id) || "",
      autore: "",
      views: 0,
      likes: 0,
      commenti: 0,
      condivisioni: 0,
      durata: 0,
      data: "",
      ordine_web: i
    })),
    nota: ids.length ? null : "la ricerca web non ha trovato Shorts"
  };
}
async function youtube(cfg, queries, perQuery = 15) {
  if (!cfg.YOUTUBE_API_KEY) return youtubeDaWeb(cfg, queries);
  const dopo = new Date(Date.now() - cfg.MESI_RICERCA * 30 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
  let ids = [];
  for (const q of queries) {
    const u = new URL("https://www.googleapis.com/youtube/v3/search");
    Object.entries({ part: "id", q, type: "video", videoDuration: "short", order: "viewCount", publishedAfter: dopo, maxResults: perQuery, key: cfg.YOUTUBE_API_KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await richiesta(u.toString());
    if (r.status !== 200) throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0, 200)}`);
    ids.push(...((await r.json()).items || []).map((i) => i.id?.videoId).filter(Boolean));
  }
  ids = [...new Set(ids)];
  return { video: await youtubeDettagli(cfg, ids, cfg.DURATA_MAX) };
}
async function youtubeDettagli(cfg, ids, durataMax = 9999) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const u = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids.slice(i, i + 50).join(",")}&key=${cfg.YOUTUBE_API_KEY}`;
    const r = await richiesta(u);
    if (r.status !== 200) continue;
    for (const v of (await r.json()).items || []) {
      const st = v.statistics || {}, sn = v.snippet || {};
      const durata = durataIso(v.contentDetails?.duration);
      if (!durata || durata > durataMax) continue;
      out.push({
        piattaforma: "youtube",
        id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        video_url: null,
        titolo: sn.title || "",
        autore: sn.channelTitle || "",
        views: +st.viewCount || 0,
        likes: +st.likeCount || 0,
        commenti: +st.commentCount || 0,
        condivisioni: 0,
        durata,
        data: sn.publishedAt || ""
      });
    }
  }
  return out;
}
async function apify(cfg, actor, input) {
  const u = `https://api.apify.com/v2/acts/${actor.replace("/", "~")}/run-sync-get-dataset-items?token=${cfg.APIFY_TOKEN}&timeout=280`;
  const r = await richiesta(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }, 2);
  if (r.status !== 200 && r.status !== 201) throw new Error(`Apify ${actor} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}
var primo = (d, ...chiavi) => {
  for (const k of chiavi) {
    let v = d;
    for (const p of k.split(".")) v = v == null ? void 0 : Array.isArray(v) && /^\d+$/.test(p) ? v[+p] : v[p];
    if (v !== void 0 && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) return v;
  }
  return void 0;
};
var num = (v) => Math.round(Number(v) || 0);
function normTiktok(it) {
  return {
    piattaforma: "tiktok",
    id: String(primo(it, "id", "video_id") || ""),
    url: primo(it, "webVideoUrl", "url", "detail_url") || "",
    video_url: primo(it, "mediaUrls.0", "videoMeta.downloadAddr", "videoMeta.originalDownloadAddr", "video_url_720p", "videoUrl") || null,
    titolo: String(primo(it, "text", "desc", "ad_title") || "").slice(0, 200),
    autore: primo(it, "authorMeta.name", "author", "brand_name") || "",
    views: num(primo(it, "playCount", "views")),
    likes: num(primo(it, "diggCount", "likes")),
    commenti: num(primo(it, "commentCount", "comments")),
    condivisioni: num(primo(it, "shareCount", "shares")),
    durata: num(primo(it, "videoMeta.duration", "duration_sec", "duration")),
    data: primo(it, "createTimeISO") || ""
  };
}
function normInstagram(it) {
  return {
    piattaforma: "instagram",
    id: String(primo(it, "shortCode", "id") || ""),
    url: primo(it, "url", "reelURL") || "",
    video_url: primo(it, "videoUrl", "video_url") || null,
    titolo: String(primo(it, "caption") || "").slice(0, 200),
    autore: primo(it, "ownerUsername") || "",
    views: num(primo(it, "videoPlayCount", "videoViewCount", "views")),
    likes: num(primo(it, "likesCount", "likes")),
    commenti: num(primo(it, "commentsCount", "comments")),
    condivisioni: 0,
    durata: num(primo(it, "videoDuration", "duration")),
    data: primo(it, "timestamp") || "",
    _video: !!primo(it, "videoUrl") || /video|clips/i.test(String(primo(it, "type", "productType") || ""))
  };
}
async function tiktok(cfg, queries, hashtags, perVoce = 10) {
  if (!cfg.APIFY_TOKEN) return { video: [], nota: "TikTok saltato: manca il token Apify" };
  const items = await apify(cfg, cfg.APIFY_TIKTOK_ACTOR, {
    searchQueries: queries,
    hashtags: hashtags.map((h) => h.replace(/^#/, "")),
    searchSection: "/video",
    resultsPerPage: perVoce,
    shouldDownloadVideos: true,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false
  });
  return { video: items.map(normTiktok).filter((v) => v.id && (!v.durata || v.durata <= cfg.DURATA_MAX)) };
}
async function instagram(cfg, hashtags, perVoce = 15) {
  if (!cfg.APIFY_TOKEN) return { video: [], nota: "Instagram saltato: manca il token Apify" };
  const items = await apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, {
    directUrls: hashtags.map((h) => `https://www.instagram.com/explore/tags/${h.replace(/^#/, "")}/`),
    resultsType: "posts",
    resultsLimit: perVoce,
    addParentData: false
  });
  return { video: items.map(normInstagram).filter((v) => v.id && v._video && (!v.durata || v.durata <= cfg.DURATA_MAX)) };
}
async function linkDiretti(cfg, links) {
  const yt = [], tt = [], ig = [];
  for (const l of links) {
    const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l);
    if (y) yt.push(y[1]);
    else if (/tiktok\.com/.test(l)) tt.push(l);
    else if (/instagram\.com/.test(l)) ig.push(l);
  }
  const out = [];
  if (yt.length) {
    if (cfg.YOUTUBE_API_KEY) out.push(...await youtubeDettagli(cfg, yt));
    else out.push(...yt.map((id) => ({ piattaforma: "youtube", id, url: `https://www.youtube.com/watch?v=${id}`, titolo: "", autore: "", views: 0, likes: 0, commenti: 0, condivisioni: 0, durata: 0 })));
  }
  if ((tt.length || ig.length) && !cfg.APIFY_TOKEN) out.nota = `${tt.length + ig.length} link TikTok/Instagram non guardabili senza Apify`;
  if (tt.length && cfg.APIFY_TOKEN) out.push(...(await apify(cfg, cfg.APIFY_TIKTOK_ACTOR, { postURLs: tt, shouldDownloadVideos: true, resultsPerPage: 1 })).map(normTiktok));
  if (ig.length && cfg.APIFY_TOKEN) out.push(...(await apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, { directUrls: ig, resultsType: "posts", resultsLimit: 1 })).map(normInstagram));
  return { video: out.map((v) => ({ ...v, scelto_da_johnny: true })), nota: out.nota };
}
function punteggio(v) {
  if (!v.views && v.ordine_web !== void 0) return 10 - v.ordine_web * 0.1;
  const views = Math.max(v.views || 0, 1);
  const coinv = ((v.likes || 0) + 2 * (v.commenti || 0) + 3 * (v.condivisioni || 0)) / views;
  return Math.round((Math.log10(views + 1) + Math.min(coinv, 0.3) * 10) * 1e3) / 1e3;
}
var VIDEO_EXT = /\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;
var FOTO_EXT = /\.(jpe?g|png|webp)$/i;
function codicePcloud(link) {
  try {
    return new URL(link).searchParams.get("code");
  } catch {
    return null;
  }
}
async function pcloudApi(link, metodo, params) {
  const code = codicePcloud(link);
  if (!code) throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');
  const host = /(^|\/\/)e\.|eapi/.test(link) ? ["eapi", "api"] : ["api", "eapi"];
  let ultimo;
  for (const h of host) {
    const u = new URL(`https://${h}.pcloud.com/${metodo}`);
    u.searchParams.set("code", code);
    Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
    const d = await (await richiesta(u.toString())).json();
    if (d.result === 0) return d;
    ultimo = d;
  }
  throw new Error(`pCloud: ${ultimo?.error || "errore " + ultimo?.result}`);
}
async function pcloudClip(link) {
  const d = await pcloudApi(link, "showpublink", {});
  const out = [];
  const visita = (m, cartella = "") => {
    if (m.isfolder) (m.contents || []).forEach((c) => visita(c, cartella ? `${cartella}/${m.name}` : m.name));
    else if ((m.category === 1 || FOTO_EXT.test(m.name)) && FOTO_EXT.test(m.name)) {
      out.push({
        fileid: m.fileid,
        nome: m.name,
        cartella,
        dimensione: m.size,
        hash: String(m.hash || m.fileid),
        tipo: "immagine",
        tecnico: { tipo: "immagine", durata_sec: 0, risoluzione: m.width ? `${m.width}x${m.height}` : null, orientamento: m.width ? m.height > m.width ? "verticale" : m.width > m.height ? "orizzontale" : "quadrato" : null }
      });
    } else if (m.category === 2 || VIDEO_EXT.test(m.name)) {
      out.push({
        fileid: m.fileid,
        nome: m.name,
        cartella,
        dimensione: m.size,
        hash: String(m.hash || m.fileid),
        tecnico: { durata_sec: m.duration ? Number(m.duration) : null, risoluzione: m.width ? `${m.width}x${m.height}` : null, fps: m.fps ? Number(m.fps) : null, orientamento: m.width ? m.height > m.width ? "verticale" : m.width > m.height ? "orizzontale" : "quadrato" : null, rallenty_possibile: m.fps ? Number(m.fps) >= 48 : null }
      });
    }
  };
  visita(d.metadata);
  return out;
}

// src/manuali.js
var MANUALE_DIRETTORE = `MANUALE DEL DIRETTORE CREATIVO (dalle skill short-form-video-script + reels-script)
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
- La copertina si sceglie prima di pubblicare e non si cambia dopo: fotogramma forte + testo grande al centro.`;
var MANUALE_IRIS = `MANUALE DI IRIS (dalla skill viral-reverse-engineering)
- Meccanismo, non superficie: individua i 1-2 elementi portanti (di solito il gancio e la leva emotiva/di condivisione),
  non le caratteristiche incidentali. Copiare il rumore riproduce rumore.
- Prova controfattuale: "se tolgo questo elemento, funziona ancora?" Se crolla \xE8 un motore, se no \xE8 incidentale.
- Leva di condivisione (perch\xE9 qualcuno lo manda a un altro): identit\xE0, emozione forte (meraviglia, umorismo,
  ispirazione), valore sociale, utilit\xE0 pratica, immedesimazione, storia. Senza leva di condivisione: visualizzazioni s\xEC,
  viralit\xE0 no.
- Onest\xE0 sulla fortuna: profilo molto grande, momento irripetibile, caso, sopravvivenza dei soli vincitori. Se il successo
  dipende da questo, dichiaralo NON replicabile e non inventare una regola.
- Uscita: il principio in una riga ("la leva \xE8 X") applicabile al nostro settore, mai una copia.`;
var MANUALE_REGISTA = `MANUALE DEL REGISTA (dalle skill capcut + short-form-video-script + captions-and-clipping)
- Metodo EDITS: monta seguendo la scheda; taglia tutto ci\xF2 che non serve; il gancio arriva nei primi secondi; l'ultimo
  taglio \xE8 il loop.
- Ritmo: cambio visivo ogni 2-4 s (taglio, punch-in, cambio inquadratura, testo che compare); niente tratti morti.
- Primo pezzo = l'immagine pi\xF9 forte di tutto il girato (mai un'inquadratura di apertura lenta, mai il logo all'inizio).
- Alterna i piani (totale, dettaglio, primo piano) e i movimenti; non ripetere lo stesso momento.
- Il finale deve poter "chiudere il cerchio" con l'inizio (stessa inquadratura, stesso gesto o movimento che riparte).
- Ogni clip deve stare in piedi da sola nel suo pezzo, con il soggetto inquadrato nel 9:16.`;
var MANUALE_COPY = `MANUALE DEL COPY (dalle skill hook-writer + caption-writer + instagram-seo + hashtag-strategy)
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
- Mai statistiche inventate o promesse false.`;
var MANUALE_PUBBLICAZIONE = `REGOLE DI PUBBLICAZIONE (dalla skill instagram-reels-publishing)
- 1080x1920, 9:16. Zone coperte dall'interfaccia: circa 250 px in alto e 350 px in basso \u2192 testi, volti e CTA nella fascia
  centrale (anche per i ritagli 4:5 del feed e 3:4 della griglia profilo).
- Copertina: scelta prima di pubblicare, non modificabile dopo; meglio una copertina dedicata che un fotogramma qualsiasi;
  testo grande (\u226560 px) al centro.`;
var MANUALE_AUDIO = `REGOLE AUDIO (dalla skill ai-music-and-sound)
- Per un brand mai musica protetta o "di tendenza" incorporata senza licenza (rischio silenziamento/rivendicazione).
- Il brano di tendenza si aggiunge in app dalla libreria di Instagram; nel file si mettono solo suono originale ed effetti.
- Il sound design (whoosh, impatti, riser sui tagli) nei video brevi conta spesso pi\xF9 del brano.`;
var MANUALE_FORMATI = `FORMATI DEL MONTATORE (scegli "formato" nel piano, in base al girato e alla scheda)
- "montaggio": il reel classico da tante clip (b-roll, prodotto, luoghi, persone senza un discorso). Gancio \u2192 sviluppo \u2192
  climax \u2192 chiusura sul ritmo. \xC8 il formato di base.
- "talking_head": una persona che PARLA IN CAMERA (clip con parlato presente e trascrizione). Il montatore toglie da solo
  i silenzi, fa un punch zoom a ogni frase, scrive sottotitoli grandi (1-3 parole) sotto il mento con un riquadro colorato
  che scorre di parola in parola, mette la prima frase come GANCIO grande sopra la testa con un "boom", e copre le parole
  chiave con i b-roll che scegli. Tu scegli SOLO i tratti di parlato buoni (le prese migliori, niente ripetizioni o frasi
  sbagliate), in ordine, con "in" e "durata" sui tempi della trascrizione; il primo tratto deve aprire con la frase pi\xF9
  forte (il gancio: un risultato, una promessa, una domanda). Correggi le parole che Whisper sente male in "correzioni".
  B-roll: 2-5 inserti di 1,5-3 s sulle parole concrete (un piatto, una camera, il prodotto), mai durante il gancio.
  Testi sempre fuori dal viso: non servono "testo" sui segmenti. Durata ideale 20-45 s.
  PANNELLO EXPLAINER (facoltativo, solo talking_head): se chi parla d\xE0 NUMERI (una crescita, un confronto, una
  percentuale) o un PROCEDIMENTO a passi, aggiungi "pannello": scende sulla met\xE0 alta con un grafico animato che si
  disegna (line = andamento nel tempo, bar = confronto, steps = passi numerati) e il viso si sposta in basso. Usa SOLO
  numeri e passi detti davvero nella trascrizione: mai inventarli. Se non ci sono, niente pannello.
- "carosello": hai delle FOTO/SLIDE (tecnico.tipo = immagine) che formano un carosello o una sequenza: ogni slide resta
  intera su uno sfondo sfocato di se stessa, con barre di avanzamento come le storie, push-in lento e transizioni a spinta
  con whoosh. Slide ricche di testo: ~1 s ogni 8 parole, minimo 1,8 s. Gancio breve sulla prima slide, CTA sull'ultima.
Se il girato non si presta al formato (es. talking_head senza parlato), usa "montaggio".`;

// src/lavoro.js
var FASI = ["piano", "ricerca", "riferimenti", "clip", "scheda", "regia", "montaggio", "fatto"];
var BLOCCO_MIN = 12;
var BUDGET_MS = 9 * 6e4;
var SISTEMA_PIANO = `Sei il Direttore creativo di Momento Produzione, agenzia italiana di video e social.
Ricevi la richiesta di un reel e prepari la ricerca dei video di riferimento del SETTORE del cliente
su YouTube Shorts, TikTok e Instagram Reels. Rispondi SOLO con JSON valido.

${MANUALE_DIRETTORE}`;
var piano = (prompt) => `RICHIESTA DI JOHNNY:
${prompt}

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
}`;
var analisiRiferimento = (settore) => `Sei un montatore video senior. Analizza questo reel come se dovessi rifarlo.

${MANUALE_IRIS}

\xC8 un riferimento per un reel del settore "${settore}".
Non vedi il video in movimento: ti do (1) una tavola con i primi 3 secondi (il gancio), (2) una tavola con un
fotogramma per ogni inquadratura, con il tempo scritto in giallo, (3) MISURE ESATTE fatte con ffmpeg e Whisper
(tagli, durate delle inquadrature, BPM, volume, parlato trascritto). Le misure sono vere: copiale cos\xEC come sono.
Il resto (testi a schermo, colore, inquadrature, effetti visibili) lo deduci dai fotogrammi. Quello che da
fotogrammi fermi non si pu\xF2 sapere (es. come si animano i testi, effetti sonori) scrivilo null o "non verificabile".
Non inventare. Tempi in secondi.

Per gli elementi visivi usa, quando possibile, i nomi di questa libreria:
${libreriaTesto()}

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
}`;
var analisiClip = (contesto) => `Sei l'assistente al montaggio di un'agenzia video. Descrivi questa clip GREZZA
per chi dovr\xE0 montare un reel verticale 9:16. Non vedi il video in movimento: ti do i fotogrammi in ordine di tempo
(tempo in giallo) e MISURE ESATTE: fps, risoluzione, durata; per ogni fotogramma nitidezza (varianza del laplaciano
su 480 px: sotto ~40 tende a mosso/sfocato, sopra ~150 \xE8 nitido), luminosit\xE0 0-255, % bruciato e % chiuso;
movimento tra fotogrammi (alto = camera o soggetto che si muovono); parlato trascritto da Whisper.
Usa le misure per qualit\xE0 e problemi, i fotogrammi per contenuto e inquadrature. Non inventare.
Sii sintetico: al massimo 8 momenti e 5 problemi, frasi brevi.
Se \xE8 una FOTO o una SLIDE (tecnico.tipo = immagine): niente momenti n\xE9 problemi di tempo; descrivi cosa mostra e trascrivi
il testo che contiene (se \xE8 una slide di carosello) in "testo_nell_immagine".

Contesto del lavoro: ${contesto}

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
  "note_montaggio": "consigli pratici per usarla",
  "testo_nell_immagine": "solo per foto/slide: il testo scritto, o null"
}`;
var SISTEMA_SCHEDA = `Sei il Direttore creativo di Momento Produzione. Scrivi la SCHEDA TECNICA che guider\xE0
regista, copy, editor, VFX, colorist, audio, voce e sottotitoli. Ogni scelta deve essere motivata dai
riferimenti analizzati e realizzabile con le clip disponibili. Usa SOLO elementi della libreria per look,
effetti, transizioni, stili testo e mood. Niente formule abusate ("POV", "aspetta la fine") se non richieste.
Il reel deve essere riconoscibile e diverso, non una copia. Non inventare clip che non esistono.
Sii denso e sintetico: frasi brevi, niente ripetizioni, cita solo le clip che userai davvero.
Rispondi SOLO JSON.

${MANUALE_DIRETTORE}

${MANUALE_PUBBLICAZIONE}

${MANUALE_AUDIO}`;
var scheda = (prompt, piano2, rif, clip) => `RICHIESTA DI JOHNNY:
${prompt}

PIANO: ${JSON.stringify(piano2)}

LIBRERIA:
${libreriaTesto()}

RIFERIMENTI ANALIZZATI (quelli "scelto_da_johnny" pesano di pi\xF9):
${JSON.stringify(rif)}

CLIP DISPONIBILI (analisi dell'Analista; pu\xF2 essere vuoto):
${JSON.stringify(clip)}

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
}`;
async function fasePiano(env, cfg, L) {
  await log(env, L.id, "direttore", "leggo la richiesta e preparo la ricerca");
  const p = await claude(cfg, SISTEMA_PIANO, piano(L.prompt), { maxTokens: 1500 });
  await run(env, "UPDATE lavori SET piano=? WHERE id=?", JSON.stringify(p), L.id);
  await log(env, L.id, "direttore", `settore: ${p.settore} \xB7 obiettivo: ${p.obiettivo || "-"}`);
}
async function faseRicerca(env, cfg, L) {
  const p = J(L.piano, {});
  const nomi = ["YouTube", "TikTok", "Instagram", "Link tuoi"];
  const AG = ["scout_yt", "scout_tt", "scout_ig", "direttore"];
  await log(env, L.id, "scout_yt", `${cfg.YOUTUBE_API_KEY ? "cerco Shorts" : "cerco Shorts sul web"}: ${(p.youtube_query || []).join(" \xB7 ")}`);
  if (cfg.APIFY_TOKEN) {
    await log(env, L.id, "scout_tt", `cerco su TikTok: ${[...p.tiktok_query || [], ...(p.tiktok_hashtag || []).map((h) => "#" + h)].join(" \xB7 ")}`);
    await log(env, L.id, "scout_ig", `cerco reel: ${(p.instagram_hashtag || []).map((h) => "#" + h).join(" \xB7 ")}`);
  }
  const esiti = await Promise.allSettled([
    youtube(cfg, p.youtube_query || []),
    tiktok(cfg, p.tiktok_query || [], p.tiktok_hashtag || []),
    instagram(cfg, p.instagram_hashtag || []),
    linkDiretti(cfg, J(L.link_rif, []))
  ]);
  const perFonte = {};
  for (let i = 0; i < 4; i++) {
    const e = esiti[i];
    if (e.status === "rejected") {
      await log(env, L.id, AG[i], `${nomi[i]}: ${e.reason?.message || e.reason}`, "warn");
      perFonte[nomi[i]] = [];
      continue;
    }
    const lista = Array.isArray(e.value) ? e.value : e.value.video;
    perFonte[nomi[i]] = lista;
    if ((i === 1 || i === 2) && !cfg.APIFY_TOKEN) continue;
    if (e.value.nota) await log(env, L.id, AG[i], e.value.nota, "warn");
    if (i < 3 || lista.length) await log(env, L.id, AG[i], i < 3 ? `trovati ${lista.length} video` : `i tuoi link: ${lista.length} video`);
  }
  const scelti = [...perFonte["Link tuoi"]];
  const fonti = ["YouTube", "TikTok", "Instagram"].filter((n) => perFonte[n].length);
  const quota = fonti.length ? Math.max(1, Math.floor(Math.max(cfg.NUM_RIFERIMENTI - scelti.length, fonti.length) / fonti.length)) : 0;
  for (const n of fonti) {
    const visti = /* @__PURE__ */ new Set();
    scelti.push(...perFonte[n].map((v) => ({ ...v, punteggio: punteggio(v) })).sort((a, b) => b.punteggio - a.punteggio).filter((v) => !visti.has(v.id) && visti.add(v.id)).slice(0, quota));
  }
  const unici = /* @__PURE__ */ new Set();
  scelti.splice(0, scelti.length, ...scelti.filter((v) => {
    const k = `${v.piattaforma}:${v.id}`;
    return !unici.has(k) && unici.add(k);
  }));
  if (!scelti.length) throw new Error("nessun video di riferimento trovato: controlla le chiavi in Impostazioni");
  const riferimenti = scelti.map((v) => ({ video: v, stato: "da_guardare" }));
  await run(env, "UPDATE lavori SET candidati=?, riferimenti=?, motore_visto=NULL WHERE id=?", JSON.stringify(perFonte), JSON.stringify(riferimenti), L.id);
  await log(env, L.id, "direttore", `scelgo ${riferimenti.length} reel da far guardare a Iris`);
}
async function faseRiferimenti(env, cfg, L) {
  const rif = J(L.riferimenti, []);
  if (!L.motore_visto) {
    let gia = 0;
    for (const r of rif) {
      if (r.stato !== "da_guardare") continue;
      const c = await one(env, "SELECT dati FROM cache_analisi WHERE chiave=?", chiaveRif(r.video));
      if (c) {
        Object.assign(r, { stato: "fatto", analisi: J(c.dati, {}) });
        gia++;
      }
    }
    await run(env, "UPDATE lavori SET riferimenti=?, motore_visto=? WHERE id=?", JSON.stringify(rif), ora(), L.id);
    if (gia) await log(env, L.id, "occhi", `${gia} reel gi\xE0 visti in passato: non li riguardo`);
    if (rif.some((r) => r.stato === "da_guardare")) await log(env, L.id, "motore", `chiamo il motore GitHub: scarico e misuro ${rif.filter((r) => r.stato === "da_guardare").length} reel di riferimento`);
  }
  if (rif.some((r) => r.stato === "da_guardare")) return avvisoMotore(env, L);
  if (!rif.some((r) => r.stato === "fatto")) throw new Error("nessun reel di riferimento \xE8 stato analizzato (vedi il registro)");
  await run(env, "UPDATE lavori SET motore_visto=NULL WHERE id=?", L.id);
  return true;
}
async function svegliaMotore(env, perche = "") {
  const cfg = await configurazione(env);
  if (!cfg.GITHUB_TOKEN) return false;
  const ultimo = (await one(env, "SELECT valore FROM impostazioni WHERE chiave='MOTORE_SVEGLIATO'"))?.valore;
  if (ultimo && Date.now() - Number(ultimo) < 3 * 6e4) return true;
  await run(env, "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('MOTORE_SVEGLIATO', ?)", String(Date.now()));
  const r = await fetch("https://api.github.com/repos/JohnHant91/momento-montaggio/actions/workflows/analizza.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: "main" }),
    headers: { authorization: `Bearer ${cfg.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "momento-reel", "x-github-api-version": "2022-11-28" }
  });
  if (r.status !== 204) {
    console.log("sveglia motore", r.status, (await r.text()).slice(0, 200));
    return false;
  }
  return true;
}
async function avvisoMotore(env, L) {
  if (!(L.motore_fino && L.motore_fino > ora())) {
    const ok = await svegliaMotore(env).catch(() => false);
    if (ok && !L.motore_svegliato) {
      await run(env, "UPDATE lavori SET motore_svegliato=1 WHERE id=?", L.id).catch(() => {
      });
      await log(env, L.id, "motore", "\u26A1 motore GitHub avviato: parte entro un minuto");
    }
  }
  if (L.motore_visto && Date.now() - new Date(L.motore_visto) > 75 * 6e4 && !(L.motore_fino && L.motore_fino > ora())) {
    await log(env, L.id, "motore", "il motore GitHub non si fa vivo da pi\xF9 di un'ora: controlla GitHub \u2192 momento-montaggio \u2192 Actions", "warn");
    await run(env, "UPDATE lavori SET motore_visto=? WHERE id=?", ora(), L.id);
  }
  return false;
}
var chiaveRif = (v) => `rif2:${v.piattaforma}:${v.id}`;
var FONTI = {
  pcloud: { nome: "Cartella pCloud", pronta: (L) => !!L.pcloud, elenca: async (L) => (await pcloudClip(L.pcloud)).map((c) => ({ ...c, sorgente: { tipo: "pcloud", fileid: c.fileid } })) }
};
async function faseClip(env, cfg, L) {
  const fonte = FONTI[L.fonte || "pcloud"] || FONTI.pcloud;
  if (!fonte.pronta(L)) {
    await log(env, L.id, "analista", "nessun girato collegato: preparo scheda e lista delle riprese");
    return true;
  }
  let clip = J(L.clip, null);
  if (!clip) {
    const lista = await fonte.elenca(L);
    if (!lista.length) throw new Error("nella cartella pCloud non ci sono n\xE9 video n\xE9 foto");
    clip = lista.map((c) => ({ ...c, stato: "da_guardare" }));
    let gia = 0;
    for (const c of clip) {
      const r = await one(env, "SELECT dati FROM cache_analisi WHERE chiave=?", chiaveClip(c));
      if (r) {
        const d = J(r.dati, {});
        Object.assign(c, { stato: "fatto", analisi: d.analisi || d, tecnico: d.tecnico || c.tecnico });
        gia++;
      }
    }
    await run(env, "UPDATE lavori SET clip=?, motore_visto=? WHERE id=?", JSON.stringify(clip), ora(), L.id);
    const peso = Math.round(clip.reduce((s, c) => s + (c.dimensione || 0), 0) / 1073741824 * 10) / 10;
    await log(env, L.id, "analista", `${clip.length} clip trovate (${fonte.nome}, ${peso} GB)${gia ? `, ${gia} gi\xE0 viste in passato` : ""}`);
    if (clip.some((c) => c.stato === "da_guardare")) await log(env, L.id, "motore", "chiamo il motore GitHub: scarico e misuro le clip per Ada");
  }
  if (!clip.some((c) => c.stato === "da_guardare")) return true;
  return avvisoMotore(env, L);
}
var chiaveClip = (c) => `clip2:${c.hash}:${c.dimensione}`;
async function faseScheda(env, cfg, L) {
  await log(env, L.id, "direttore", "incrocio riferimenti e clip, scrivo la scheda tecnica");
  const rif = J(L.riferimenti, []).filter((r) => r.stato === "fatto").map((r) => ({
    piattaforma: r.video.piattaforma,
    url: r.video.url,
    views: r.video.views,
    likes: r.video.likes,
    scelto_da_johnny: !!r.video.scelto_da_johnny,
    analisi: r.analisi
  }));
  const clip = (J(L.clip, []) || []).filter((c) => c.stato === "fatto").map((c) => ({ file: c.nome, tecnico: c.tecnico, ...c.analisi }));
  const s = await claude(cfg, SISTEMA_SCHEDA, scheda(L.prompt, J(L.piano, {}), rif, clip), { maxTokens: 16e3 });
  await run(env, "UPDATE lavori SET scheda=? WHERE id=?", JSON.stringify(s), L.id);
  await log(env, L.id, "direttore", `scheda pronta: ${s.titolo_lavoro || ""}`);
}
var LOOKS = ["caldo_cinematico", "pulito_commerciale", "teal_orange", "moody_scuro", "naturale_vivace", "bn_contrasto", "pastello_soft", "vintage_film"];
var TRANSIZIONI = ["taglio_netto", "dissolvenza", "flash_bianco", "whip_pan", "zoom", "glitch", "slide", "fadenero"];
var EFFETTI_PEZZO = ["punch_in", "zoom_lento", "zoom_out", "shake", "nessuno"];
var EFFETTI_GLOBALI = ["grana", "vignettatura", "bande_cinema", "light_leak"];
var FORMATI_REEL = ["montaggio", "talking_head", "carosello"];
var SISTEMA_REGISTA = `Sei il Regista e il Copy di Momento Produzione. Trasformi la SCHEDA TECNICA del Direttore creativo in un
PIANO DI MONTAGGIO preciso che un montatore automatico eseguir\xE0 alla lettera. Scegli i pezzi migliori dalle clip analizzate
(usa solo momenti con qualit\xE0 alta e senza problemi, rispetta i tempi da/a dei momenti), costruisci gancio \u2192 sviluppo \u2192 climax \u2192
chiusura, alterna inquadrature (totale/dettaglio/primo piano), non ripetere lo stesso momento. Il rallenty va su clip girate a
48 fps o pi\xF9 (rallenty_possibile). Testi brevi, in italiano corretto, niente formule abusate. Rispondi SOLO JSON.

${MANUALE_REGISTA}

${MANUALE_FORMATI}

${MANUALE_COPY}

${MANUALE_PUBBLICAZIONE}

${MANUALE_AUDIO}`;
var pianoMontaggio = (scheda2, clip) => `SCHEDA TECNICA:
${JSON.stringify(scheda2)}

CLIP DISPONIBILI (indice, file, dati tecnici, momenti con tempi e qualit\xE0, problemi):
${JSON.stringify(clip)}

VALORI AMMESSI
- look: ${LOOKS.join(", ")}
- transizione_in: ${TRANSIZIONI.join(", ")} (la prima clip non ne ha)
- effetto: ${EFFETTI_PEZZO.join(", ")}
- effetti_globali: ${EFFETTI_GLOBALI.join(", ")}
- stile testi: titolo_grande_centrale, etichetta_box, sottotitolo_classico; posizione: alto, centro, terzo_inferiore
- formato: montaggio, talking_head, carosello (vedi FORMATI DEL MONTATORE)

JSON (i campi "solo talking_head" e "solo carosello" mettili solo per quel formato):
{
  "formato": "montaggio|talking_head|carosello",
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
  "chiusura": {"testo": "...", "sottotesto": "cta breve", "evidenzia": "parola", "durata": 2-3, "colore": "#hex"} oppure null (non per talking_head/carosello),
  "gancio": {"testo": "solo carosello: frase breve sulla prima slide; talking_head: lascia null (usa la prima frase detta)", "evidenzia": ["parole del gancio da colorare"]},
  "evidenzia": ["solo talking_head: 3-8 parole chiave del discorso da colorare nei sottotitoli"],
  "correzioni": {"parola_sentita_male": "parola giusta"},
  "broll": [{"clip": indice, "in": secondi, "durata": 1.5-3, "sulla_parola": "parola detta su cui entra", "rallenty": bool}],
  "cta": {"testo": "solo talking_head/carosello: call to action breve (es. Scrivici ORTO in DM)"},
  "slide": [{"clip": indice di una foto/slide, "durata": secondi}],
  "pannello": {"chip": "TIP|DATO|COME FARE", "titolo": "max 6 parole", "tipo": "line|bar|steps", "punti": [{"etichetta": "...", "valore": n}],
               "passi": ["solo per steps, 2-5 frasi brevi"], "unita": "\u20AC|%|...", "badge": "risultato chiave breve, es. 6x", "sulla_parola": "parola detta su cui entra", "tema": "dark|light"} oppure null,
  "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}],
  "loop": "come il finale si ricollega al primo pezzo",
  "copertina": {"clip": indice, "secondo": n, "testo": "testo grande della copertina (2-5 parole)"},
  "parola_chiave": "...",
  "caption": "caption finale: prima riga con la parola chiave, corpo, UNA call to action",
  "hashtag": ["3-5 etichette specifiche"],
  "musica_da_mettere": "che brano cercare su Instagram e da che secondo, a che volume rispetto al suono originale"
}`;
async function faseRegia(env, cfg, L) {
  const scheda2 = J(L.scheda, {});
  const clip = (J(L.clip, []) || []).map((c, i) => ({ c, i })).filter(({ c }) => c.stato === "fatto").map(({ c, i }) => ({
    indice: i,
    file: c.nome,
    tipo: c.tipo === "immagine" || c.tecnico?.tipo === "immagine" ? "immagine" : "video",
    tecnico: c.tecnico,
    descrizione: c.analisi?.descrizione,
    momenti: c.analisi?.momenti,
    problemi: c.analisi?.problemi,
    parlato: c.analisi?.parlato,
    trascrizione: (c.analisi?.misure?.parlato?.trascrizione || []).slice(0, 60),
    testo_nell_immagine: c.analisi?.testo_nell_immagine || void 0,
    verticale: c.analisi?.adatta_al_verticale
  }));
  const prima = J(L.montaggio, null);
  if (!clip.length) {
    await log(env, L.id, "regista", "nessun girato: scrivo la lista delle inquadrature da girare o da trovare");
    const lr = await claude(cfg, SISTEMA_REGISTA, `SCHEDA TECNICA:
${JSON.stringify(scheda2)}

Non c'\xE8 ancora girato. Scrivi la LISTA DELLE RIPRESE necessarie per montare questo reel, nell'ordine del montaggio.
JSON: {"riprese": [{"n": 1, "fase": "gancio|sviluppo|climax|chiusura", "inquadratura": "totale|piano_medio|primo_piano|dettaglio|macro", "cosa": "...", "movimento": "...", "durata_utile_sec": n, "fps_consigliati": 25|50|60, "note": "luce, angolo, cosa evitare"}],
 "consigli_ripresa": ["..."], "ganci_alternativi": [{"testo": "...", "meccanismo": "..."}], "caption": "...", "hashtag": ["..."]}`, { maxTokens: 6e3 });
    await run(env, "UPDATE lavori SET montaggio=? WHERE id=?", JSON.stringify({ stato: "senza_girato", lista_riprese: lr, creato: ora() }), L.id);
    await log(env, L.id, "regista", `lista pronta: ${(lr.riprese || []).length} inquadrature. Aggiungi il girato dalla pagina del lavoro e monto.`);
    return "salta";
  }
  const indicazioni = prima?.indicazioni_rimonta;
  await log(env, L.id, "regista", indicazioni ? `rimonto con le tue indicazioni: ${indicazioni.testo || ""}` : `scrivo il piano di montaggio da ${clip.length} clip`);
  const extra = indicazioni ? `

QUESTO \xC8 UN NUOVO MONTAGGIO. Piano precedente:
${JSON.stringify(prima.piano || {})}

INDICAZIONI DI JOHNNY PER IL NUOVO MONTAGGIO (hanno la precedenza sulla scheda):
${JSON.stringify(indicazioni)}
Cambia davvero quello che chiede, il resto miglioralo se puoi.` : "";
  const p = await claude(cfg, SISTEMA_REGISTA, pianoMontaggio(scheda2, clip) + extra, { maxTokens: 12e3 });
  const tutte = J(L.clip, []);
  const eImm = (c) => c?.tipo === "immagine" || c?.tecnico?.tipo === "immagine";
  const sorg = (c) => ({ fileid: c.sorgente?.tipo === "url" ? null : c.fileid, url: c.sorgente?.tipo === "url" ? c.sorgente.url : null, nome: c.nome });
  let formato = FORMATI_REEL.includes(indicazioni?.formato) ? indicazioni.formato : FORMATI_REEL.includes(p.formato) ? p.formato : "montaggio";
  const slide = (p.slide || []).filter((s) => tutte[s.clip]?.stato === "fatto" && eImm(tutte[s.clip])).slice(0, 20).map((s) => ({ clip: s.clip, ...sorg(tutte[s.clip]), durata: Math.min(Math.max(Number(s.durata) || 2.2, 1.8), 8) }));
  if (formato === "carosello" && slide.length < 2) {
    const foto = tutte.map((c, i) => ({ c, i })).filter(({ c }) => c.stato === "fatto" && eImm(c));
    if (foto.length >= 2) slide.push(...foto.slice(0, 15).map(({ c, i }) => ({ clip: i, ...sorg(c), durata: 2.2 })));
    else formato = "montaggio";
  }
  const parla = (c) => c?.analisi?.misure?.parlato?.presente || c?.analisi?.parlato?.presente;
  if (formato === "talking_head" && !(p.segmenti || []).some((s) => parla(tutte[s.clip]))) formato = "montaggio";
  const seg = (p.segmenti || []).filter((s) => tutte[s.clip]?.stato === "fatto" && !eImm(tutte[s.clip])).slice(0, formato === "talking_head" ? 30 : 40).map((s, k) => {
    const c = tutte[s.clip];
    const durClip = Number(c.tecnico?.durata_sec) || 9999;
    const durata = Math.min(Math.max(Number(s.durata) || 1.5, 0.4), formato === "talking_head" ? 90 : 12);
    const rallenty = !!s.rallenty;
    const serve = durata * (rallenty ? 0.5 : 1);
    return {
      clip: s.clip,
      fileid: c.sorgente?.tipo === "url" ? null : c.fileid,
      url: c.sorgente?.tipo === "url" ? c.sorgente.url : null,
      nome: c.nome,
      in: Math.max(0, Math.min(Number(s.in) || 0, Math.max(0, durClip - serve - 0.05))),
      durata,
      rallenty,
      effetto: EFFETTI_PEZZO.includes(s.effetto) ? s.effetto : "nessuno",
      transizione_in: k === 0 ? null : TRANSIZIONI.includes(s.transizione_in) ? s.transizione_in : "taglio_netto",
      audio: Math.min(1, Math.max(0, Number(s.audio ?? 0.8))),
      motivo: s.motivo,
      testo: s.testo?.testo ? s.testo : null
    };
  });
  if (!seg.length && formato !== "carosello") throw new Error("il piano del Regista non contiene pezzi validi");
  const broll = formato !== "talking_head" ? [] : (p.broll || []).filter((b) => tutte[b.clip]?.stato === "fatto" && !eImm(tutte[b.clip]) && b.sulla_parola).slice(0, 8).map((b) => {
    const c = tutte[b.clip];
    const durata = Math.min(Math.max(Number(b.durata) || 2, 1), 3.5);
    return { clip: b.clip, ...sorg(c), in: Math.max(0, Math.min(Number(b.in) || 0, Math.max(0, (Number(c.tecnico?.durata_sec) || 9999) - durata * (b.rallenty ? 0.5 : 1) - 0.05))), durata, rallenty: !!b.rallenty, sulla_parola: String(b.sulla_parola).slice(0, 40) };
  });
  const lookVoluto = indicazioni?.look && LOOKS.includes(indicazioni.look) ? indicazioni.look : null;
  const cop = p.copertina && tutte[p.copertina.clip]?.stato === "fatto" ? { fileid: tutte[p.copertina.clip].fileid, url: tutte[p.copertina.clip].sorgente?.url || null, secondo: Math.max(0, Number(p.copertina.secondo) || 0), testo: String(p.copertina.testo || "").slice(0, 60) } : null;
  let pannello = null;
  const pn = p.pannello;
  if (formato === "talking_head" && pn?.titolo && ["line", "bar", "steps"].includes(pn.tipo)) {
    const punti = (pn.punti || []).filter((x) => x && Number.isFinite(Number(x.valore))).slice(0, 8).map((x) => ({ etichetta: String(x.etichetta || "").slice(0, 14), valore: Number(x.valore) }));
    const passi = (pn.passi || []).map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 5);
    if (pn.tipo === "steps" && passi.length >= 2 || pn.tipo !== "steps" && punti.length >= 2) {
      pannello = {
        chip: String(pn.chip || "TIP").slice(0, 14),
        titolo: String(pn.titolo).slice(0, 60),
        tipo: pn.tipo,
        punti,
        passi: passi.length ? passi : null,
        unita: String(pn.unita || "").slice(0, 4),
        badge: pn.badge ? String(pn.badge).slice(0, 20) : null,
        sulla_parola: String(pn.sulla_parola || "").slice(0, 40),
        tema: pn.tema === "light" ? "light" : "dark"
      };
    }
  }
  const piano2 = {
    ...p,
    formato,
    pannello,
    segmenti: formato === "carosello" ? [] : seg,
    broll,
    slide: formato === "carosello" ? slide : [],
    chiusura: formato === "montaggio" ? p.chiusura : null,
    look: lookVoluto || (LOOKS.includes(p.look) ? p.look : LOOKS.includes(scheda2.colore?.look) ? scheda2.colore.look : "naturale_vivace"),
    effetti_globali: (p.effetti_globali || []).filter((e) => EFFETTI_GLOBALI.includes(e)),
    copertina: cop
  };
  const versione = (prima?.versione || 0) + 1;
  await run(env, "UPDATE lavori SET montaggio=? WHERE id=?", JSON.stringify({ stato: "da_fare", piano: piano2, versione, creato: ora(), indicazioni: indicazioni || null }), L.id);
  const tot = seg.reduce((a, s) => a + s.durata, 0);
  const nomeF = { montaggio: "montaggio", talking_head: "talking-head", carosello: "carosello" }[formato];
  await log(env, L.id, "regista", formato === "carosello" ? `piano pronto: formato carosello, ${slide.length} slide` : `piano pronto: formato ${nomeF}, ${seg.length} ${formato === "talking_head" ? "tratti di parlato" : "pezzi"}${broll.length ? ` + ${broll.length} b-roll` : ""}${pannello ? ` + pannello ${pannello.tipo}` : ""}, ~${Math.round(tot + (piano2.chiusura?.durata || 0))} s, look ${piano2.look}`);
  if (seg.some((s) => s.testo) || piano2.chiusura) await log(env, L.id, "copy", `testi: ${[...seg.filter((s) => s.testo).map((s) => '"' + s.testo.testo + '"'), piano2.chiusura?.testo ? '"' + piano2.chiusura.testo + '"' : ""].filter(Boolean).join(" \xB7 ").slice(0, 300)}`);
  await log(env, L.id, "motore", "chiamo il motore GitHub per il montaggio");
  return true;
}
async function faseMontaggio(env, cfg, L) {
  const m = J(L.montaggio, null);
  if (!m) return true;
  if (m.stato === "fatto") return true;
  if (m.stato === "errore") throw new Error("montaggio non riuscito: " + (m.errore || ""));
  return avvisoMotore(env, L);
}
async function lavora(env, cfg, L, scadenza) {
  while (Date.now() < scadenza) {
    L = await one(env, "SELECT * FROM lavori WHERE id=?", L.id);
    let finita = true;
    if (L.fase === "piano") await fasePiano(env, cfg, L);
    else if (L.fase === "ricerca") await faseRicerca(env, cfg, L);
    else if (L.fase === "riferimenti") finita = await faseRiferimenti(env, cfg, L);
    else if (L.fase === "clip") finita = await faseClip(env, cfg, L);
    else if (L.fase === "scheda") await faseScheda(env, cfg, L);
    else if (L.fase === "regia") finita = await faseRegia(env, cfg, L);
    else if (L.fase === "montaggio") finita = await faseMontaggio(env, cfg, L);
    if (!finita) return "attesa";
    let prossima = FASI[FASI.indexOf(L.fase) + 1];
    if (finita === "salta") prossima = "fatto";
    await run(
      env,
      "UPDATE lavori SET fase=?, stato=?, tentativi=0, aggiornato=? WHERE id=?",
      prossima,
      prossima === "fatto" ? "pronto" : "in_corso",
      ora(),
      L.id
    );
    if (prossima === "fatto") {
      await log(env, L.id, "regia", J((await one(env, "SELECT montaggio FROM lavori WHERE id=?", L.id))?.montaggio, null)?.stato === "fatto" ? "\u2705 reel montato: aprilo e guardalo" : "\u2705 lavoro pronto: apri la scheda");
      return;
    }
  }
}
async function avanza(env) {
  const inizio = Date.now();
  const cfg = await configurazione(env);
  const adesso = ora();
  const libero = new Date(Date.now() + BLOCCO_MIN * 6e4).toISOString();
  for (let giri = 0; giri < 5 && Date.now() - inizio < BUDGET_MS - 6e4; giri++) {
    const presi = await all(env, `UPDATE lavori SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
      WHERE id = (SELECT id FROM lavori WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1)
      RETURNING *`, libero, adesso, adesso);
    if (!presi.length) return;
    const L = presi[0];
    try {
      const esito = await lavora(env, cfg, L, inizio + BUDGET_MS);
      if (esito === "attesa") await run(env, "UPDATE lavori SET blocco_fino=?, tentativi=0 WHERE id=?", new Date(Date.now() + 5e4).toISOString(), L.id);
      else await run(env, "UPDATE lavori SET blocco_fino=NULL WHERE id=?", L.id);
    } catch (e) {
      const msg = String(e?.message || e).slice(0, 500);
      const stop = L.tentativi >= 3 || /manca la chiave/.test(msg);
      const pausa = new Date(Date.now() + 2 * 6e4).toISOString();
      await run(env, "UPDATE lavori SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?", stop ? "errore" : "in_corso", msg, stop ? null : pausa, ora(), L.id);
      const fase = (await one(env, "SELECT fase FROM lavori WHERE id=?", L.id))?.fase || L.fase;
      await log(env, L.id, "regia", `${stop ? "\u274C fermo" : "\u26A0\uFE0F riprovo tra 2 minuti"} (fase ${fase}): ${msg}`, stop ? "errore" : "warn");
    }
  }
}

// src/motore.js
var REPO = "johnhant91/momento-montaggio";
var AUD = "momento-reel";
var COLONNA = { riferimenti: "riferimenti", clip: "clip" };
var json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
var b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function identitaGitHub(auth) {
  const tok = String(auth || "").replace(/^Bearer\s+/i, "").trim();
  const parti = tok.split(".");
  if (parti.length !== 3) return null;
  let hdr, pl;
  try {
    hdr = JSON.parse(new TextDecoder().decode(b64u(parti[0])));
    pl = JSON.parse(new TextDecoder().decode(b64u(parti[1])));
  } catch {
    return null;
  }
  const aud = Array.isArray(pl.aud) ? pl.aud : [pl.aud];
  if (pl.iss !== "https://token.actions.githubusercontent.com" || !aud.includes(AUD)) return null;
  if (String(pl.repository || "").toLowerCase() !== REPO || !pl.exp || pl.exp * 1e3 < Date.now()) return null;
  const jwks = await (await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", { cf: { cacheTtl: 3600, cacheEverything: true } })).json();
  const jwk = (jwks.keys || []).find((k) => k.kid === hdr.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parti[2]), new TextEncoder().encode(parti[0] + "." + parti[1]));
  return ok ? pl : null;
}
var codice = (link) => {
  try {
    return new URL(link).searchParams.get("code");
  } catch {
    return null;
  }
};
async function aggiorna(env, id, colonna, indice, el) {
  await run(env, `UPDATE lavori SET ${colonna}=json_set(${colonna}, ?, json(?)), motore_visto=? WHERE id=?`, `$[${Math.trunc(indice)}]`, JSON.stringify(el), ora(), id);
}
var PENDENTE = (col) => `EXISTS (SELECT 1 FROM json_each(lavori.${col}) WHERE json_extract(value, '$.stato')='da_guardare')`;
async function motoreApi(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === "/api/motore/coda" && m === "GET") {
    const r = await one(env, `SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE("riferimenti")}) OR (fase='clip' AND clip IS NOT NULL AND ${PENDENTE("clip")}) OR
      (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))`);
    return json({ lavoro: (r?.n || 0) > 0 });
  }
  if (p === "/api/motore/prossimo" && m === "POST") {
    if (!await identitaGitHub(req.headers.get("authorization"))) return json({ errore: "motore non riconosciuto" }, 401);
    const adesso = ora();
    const pass2 = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const L2 = await one(env, `UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE("riferimenti")}) OR
          (fase='clip' AND clip IS NOT NULL AND ${PENDENTE("clip")}) OR
          (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))
        ORDER BY id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip, montaggio`, pass2, new Date(Date.now() + 55 * 6e4).toISOString(), adesso, adesso);
    if (!L2) return new Response(null, { status: 204 });
    const tipo2 = L2.fase;
    if (tipo2 === "montaggio") {
      const m2 = J(L2.montaggio, {});
      await log(env, L2.id, "motore", `\u2699\uFE0F motore GitHub al lavoro: scarico ${new Set([...m2.piano.segmenti || [], ...m2.piano.broll || [], ...m2.piano.slide || []].map((s) => s.fileid || s.url)).size} file e monto il reel (${m2.piano.formato || "montaggio"})`);
      return json({ id: L2.id, tipo: tipo2, pass: pass2, pcloud_code: codice(L2.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L2.pcloud || ""), piano: m2.piano });
    }
    const elenco2 = J(tipo2 === "riferimenti" ? L2.riferimenti : L2.clip, []);
    const elementi = elenco2.map((x, i) => [x, i]).filter(([x]) => x.stato === "da_guardare").map(([x, i]) => tipo2 === "riferimenti" ? {
      indice: i,
      nome: `${x.video.piattaforma} \xB7 ${(x.video.titolo || x.video.url || "").slice(0, 60)}`,
      url: x.video.url,
      // i file di Apify li scarica la regia (ha il token), il motore passa da qui
      video_url: x.video.video_url ? x.video.video_url.includes("api.apify.com") ? `${url.origin}/api/motore/${L2.id}/scarica?i=${i}&tipo=riferimenti&pass=${pass2}` : x.video.video_url : null
    } : { indice: i, nome: x.nome, tipo: x.tipo || x.tecnico?.tipo || "video", fileid: x.sorgente?.tipo === "pcloud" || !x.sorgente ? x.fileid : null, video_url: x.sorgente?.tipo === "url" ? x.sorgente.url : null, dimensione: x.dimensione });
    await log(env, L2.id, "motore", `\u2699\uFE0F motore GitHub al lavoro: ${elementi.length} ${tipo2 === "riferimenti" ? "reel da scaricare e misurare" : "clip da scaricare e misurare"}`);
    return json({ id: L2.id, tipo: tipo2, pass: pass2, pcloud_code: codice(L2.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L2.pcloud || ""), elementi });
  }
  const mm = p.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica|log|video|anteprima|copertina|esito)$/);
  if (!mm) return json({ errore: "non trovato" }, 404);
  const id = Number(mm[1]);
  const L = await one(env, "SELECT id, prompt, piano, fase, riferimenti, clip, montaggio, motore_pass FROM lavori WHERE id=?", id);
  const pass = req.headers.get("x-pass") || url.searchParams.get("pass") || "";
  if (!L || !L.motore_pass || pass.length < 32 || pass !== L.motore_pass) return json({ errore: "lasciapassare non valido" }, 403);
  const tipo = COLONNA[url.searchParams.get("tipo")] || (L.fase === "riferimenti" ? "riferimenti" : "clip");
  const elenco = J(L[tipo], []);
  const indice = Number(url.searchParams.get("i"));
  const el = elenco[indice];
  const nome = (x) => tipo === "riferimenti" ? `${x.video.piattaforma} ${x.video.id}` : x.nome;
  if (mm[2] === "log" && m === "POST") {
    const d = await req.json().catch(() => ({}));
    const ag = ["editor", "vfx", "color", "audio", "sottotitoli", "revisore", "motore"].includes(d.agente) ? d.agente : "motore";
    await log(env, id, ag, String(d.messaggio || "").slice(0, 300), d.livello === "warn" ? "warn" : "info");
    await run(env, "UPDATE lavori SET motore_visto=? WHERE id=?", ora(), id);
    return json({ ok: true });
  }
  if ((mm[2] === "video" || mm[2] === "anteprima" || mm[2] === "copertina") && m === "POST") {
    if (!env.VIDEO) return json({ errore: "archivio video non collegato" }, 500);
    const lunghezza = Number(req.headers.get("content-length") || 0);
    if (!lunghezza || lunghezza > 25 * 1024 * 1024) return json({ errore: `file di ${Math.round(lunghezza / 1048576)} MB: oltre il limite di 25 MB` }, 400);
    const chiave = `lavoro-${id}/${mm[2] === "video" ? "reel.mp4" : mm[2] + ".jpg"}`;
    await env.VIDEO.put(chiave, await req.arrayBuffer(), { metadata: { tipo: mm[2] === "video" ? "video/mp4" : "image/jpeg" } });
    return json({ ok: true, chiave });
  }
  if (mm[2] === "esito" && m === "POST") {
    const d = await req.json().catch(() => ({}));
    const mont = J(L.montaggio, {});
    if (d.errore) {
      mont.tentativi = (mont.tentativi || 0) + 1;
      mont.errore = String(d.errore).slice(0, 500);
      mont.stato = mont.tentativi < 2 ? "da_fare" : "errore";
      await log(env, id, "editor", `montaggio non riuscito: ${mont.errore.slice(0, 200)}${mont.stato === "da_fare" ? " \u2014 riprovo" : ""}`, "warn");
    } else {
      Object.assign(mont, { stato: "fatto", revisore: d.revisore || {}, video: `lavoro-${id}/reel.mp4`, anteprima: `lavoro-${id}/anteprima.jpg`, copertina: d.copertina ? `lavoro-${id}/copertina.jpg` : null, finito: ora() });
      delete mont.indicazioni_rimonta;
    }
    await run(env, "UPDATE lavori SET montaggio=?, motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?", JSON.stringify(mont), ora(), id);
    return json({ ok: true });
  }
  if (mm[2] === "scarica" && m === "GET") {
    if (!el?.video?.video_url) return json({ errore: "niente da scaricare" }, 404);
    const cfg = await configurazione(env);
    const r = await fetch(el.video.video_url, { headers: { authorization: `Bearer ${cfg.APIFY_TOKEN}` } });
    return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "video/mp4", ...r.headers.get("content-length") ? { "content-length": r.headers.get("content-length") } : {} } });
  }
  if (mm[2] === "elemento" && m === "POST") {
    if (!el) return json({ errore: "elemento sconosciuto" }, 400);
    const d = await req.json().catch(() => null);
    if (!d?.misure || !Array.isArray(d.immagini) || !d.immagini.length) return json({ errore: "dati mancanti" }, 400);
    const cfg = await configurazione(env);
    const rif = tipo === "riferimenti";
    const agente = rif ? "occhi" : "analista";
    const mis = d.misure;
    await log(env, id, agente, `sto guardando ${rif ? el.video.piattaforma + " \xB7 " + (el.video.titolo || el.video.url).slice(0, 50) : el.nome} (${mis.tecnico?.tipo === "immagine" ? "foto " + (mis.tecnico?.risoluzione || "") : `${mis.tecnico?.risoluzione || "?"} \xB7 ${mis.tecnico?.fps || "?"} fps \xB7 ${mis.numero_tagli} tagli${mis.bpm_stimato ? " \xB7 " + mis.bpm_stimato + " BPM" : ""}`})`);
    try {
      const sistema = rif ? analisiRiferimento(J(L.piano, {}).settore || "") : analisiClip(L.prompt);
      const testo = `MISURE ESATTE (ffmpeg + Whisper):
${JSON.stringify(mis)}

Rispondi SOLO con il JSON richiesto.`;
      const analisi = await claudeVisione(cfg, rif ? cfg.CLAUDE_MODEL : cfg.CLAUDE_MODEL_LIGHT, sistema, testo, d.immagini.slice(0, 3), rif ? 7e3 : 7e3);
      if (rif) {
        Object.assign(analisi, { numero_tagli: mis.numero_tagli, durata_media_inquadratura_sec: mis.durata_media_inquadratura_sec, durata_sec: mis.tecnico?.durata_sec });
        analisi.audio = { ...analisi.audio || {}, bpm_stimato: mis.bpm_stimato ?? analisi.audio?.bpm_stimato ?? null, volume_lufs: mis.volume_lufs };
        analisi.misure = { tagli_sec: mis.tagli_sec, piu_breve: mis.inquadratura_piu_breve_sec, piu_lunga: mis.inquadratura_piu_lunga_sec, tagli_sul_beat_indice: mis.tagli_sul_beat_indice, parlato: mis.parlato };
        Object.assign(el, { stato: "fatto", analisi, errore: void 0 });
        await env.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(chiaveRif(el.video), JSON.stringify(analisi), ora()).run();
      } else {
        analisi.misure = { qualita: mis.qualita_fotogrammi, movimento: mis.movimento_tra_fotogrammi, tagli_interni_sec: mis.tagli_sec, volume_lufs: mis.volume_lufs, parlato: mis.parlato };
        Object.assign(el, { stato: "fatto", analisi, tecnico: { ...el.tecnico || {}, ...mis.tecnico }, errore: void 0 });
        await env.DB.prepare("INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)").bind(chiaveClip(el), JSON.stringify({ analisi, tecnico: el.tecnico }), ora()).run();
      }
      await aggiorna(env, id, tipo, indice, el);
      await log(env, id, agente, `guardato: ${rif ? el.video.piattaforma : el.nome} \u2014 ${String(rif ? analisi.perche_funziona || analisi.gancio?.cosa_succede : analisi.descrizione || "").slice(0, 130)}`);
      return json({ ok: true, uso: analisi._uso });
    } catch (e) {
      const errore = String(e?.message || e).slice(0, 300);
      if (errore.startsWith("LIMITE_CLAUDE")) {
        await log(env, id, agente, "\u23F8 Claude ha rifiutato per limite o credito esaurito: riprendo pi\xF9 tardi. " + errore.slice(15, 160), "warn");
        return json({ errore }, 429);
      }
      el.tentativi = (el.tentativi || 0) + 1;
      el.errore = errore;
      el.stato = el.tentativi < 3 ? "da_guardare" : "saltato";
      await aggiorna(env, id, tipo, indice, el);
      await log(env, id, agente, `${nome(el)}: ${errore}${el.stato === "saltato" ? " \u2014 saltato" : ` \u2014 riprovo (${el.tentativi}/3)`}`, "warn");
      return json({ errore }, 502);
    }
  }
  if (mm[2] === "errore" && m === "POST") {
    if (!el) return json({ errore: "elemento sconosciuto" }, 400);
    const d = await req.json().catch(() => ({}));
    el.tentativi = (el.tentativi || 0) + 1;
    el.errore = String(d.errore || "errore del motore").slice(0, 300);
    el.stato = el.tentativi < 3 && !/YouTube non ha lasciato|HTTP 4\d\d/.test(el.errore) ? "da_guardare" : "saltato";
    await aggiorna(env, id, tipo, indice, el);
    await log(env, id, "motore", `${nome(el)}: ${el.errore}${el.stato === "saltato" ? " \u2014 saltato" : " \u2014 riprovo"}`, "warn");
    return json({ ok: true });
  }
  if (mm[2] === "fine" && m === "POST") {
    await run(env, "UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?", ora(), id);
    if ((await req.json().catch(() => ({}))).silenzioso) return json({ ok: true });
    const fatti = elenco.filter((x) => x.stato === "fatto").length;
    await log(env, id, "motore", `giro del motore finito: ${fatti}/${elenco.length} ${tipo === "riferimenti" ? "reel" : "clip"} analizzati`);
    return json({ ok: true });
  }
  return json({ errore: "metodo non consentito" }, 405);
}

// src/pagina.js
var PAGINA = `<!DOCTYPE html>
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
    '<b>Formato</b><span>' + e({ talking_head: 'Talking-head', carosello: 'Carosello \u2192 reel' }[p.formato] || 'Montaggio') + '</span>' +
    (p.parola_chiave ? '<b>Parola chiave</b><span>' + e(p.parola_chiave) + '</span>' : '') +
    (p.loop ? '<b>Loop</b><span>' + e(p.loop) + '</span>' : '') +
    (p.musica_da_mettere ? '<b>Musica (in app)</b><span>' + e(p.musica_da_mettere) + '</span>' : '') + '</div>' +
    (p.caption ? '<p style="white-space:pre-wrap"><b>Caption</b><br>' + e(p.caption) + '</p>' : '') +
    ((p.hashtag || []).length ? '<p class="mut">' + e(p.hashtag.map((h) => '#' + String(h).replace(/^#/, '')).join(' ')) + '</p>' : '') +
    ((p.ganci_alternativi || []).length ? '<p><b>Ganci alternativi da provare</b></p>' + lst(p.ganci_alternativi.map((g) => g.testo + ' (' + g.meccanismo + ')')) : '') + '</div>' +
    '<div class="card"><b>Rimonta</b><p class="mut">Rif\xE0 solo piano e montaggio (niente nuova ricerca n\xE9 analisi).</p>' +
    '<label>Cosa cambiare</label><textarea id="rim_t" style="min-height:70px" placeholder="Es. pi\xF9 veloce, gancio con la tazza, meno testi, chiusura con il logo"></textarea>' +
    '<div class="riga"><div style="flex:1"><label>Look</label><select id="rim_l">' + LOOKS_UI.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('') + '</select></div>' +
    '<div style="flex:1"><label>Durata (s)</label><input id="rim_d" type="number" min="7" max="90" placeholder="come prima"></div>' +
    '<div style="flex:1"><label>Formato</label><select id="rim_f"><option value="">decide Rocco</option><option value="montaggio">Montaggio</option><option value="talking_head">Talking-head</option><option value="carosello">Carosello \u2192 reel</option></select></div></div>' +
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
    return '<tr><td>' + e(c.nome) + '<div class="mut">' + e(c.stato.replace('_', ' ')) + '</div></td><td class="mut">' + e(t.risoluzione) + '<br>' + (t.tipo === 'immagine' ? 'foto' : e(t.fps) + ' fps \xB7 ' + e(t.durata_sec) + ' s') + '</td><td>' + e(a.descrizione || c.errore) +
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
  if ($('#rim_ok')) $('#rim_ok').onclick = async () => { try { await chiama('/api/lavori/' + id + '/rimonta', { method: 'POST', body: { testo: $('#rim_t').value, look: $('#rim_l').value || null, durata: $('#rim_d').value || null, formato: $('#rim_f').value || null } }); rotta(); } catch (x) { $('#rim_er').textContent = x.message; } };
  if ($('#rip')) $('#rip').onclick = async () => { await chiama('/api/lavori/' + id + '/riprova', { method: 'POST', body: {} }); rotta(); };
  if ($('#dl')) $('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(L.scheda, null, 2)], { type: 'application/json' })); a.download = 'scheda-' + id + '.json'; a.click(); };
  $('#del').onclick = async () => { if (confirm('Eliminare questo lavoro?')) { await chiama('/api/lavori/' + id, { method: 'DELETE' }); location.hash = '#/'; } };
  if (L.stato === 'in_corso') timer = setTimeout(() => { if (!document.activeElement || !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) rotta(); else timer = setTimeout(rotta, 6000); }, 6000);
}

const NOMI = { ANTHROPIC_API_KEY: ['Claude', 'console.anthropic.com \u2192 API Keys'], GEMINI_API_KEY: ['Gemini (gli occhi)', 'aistudio.google.com/apikey'], YOUTUBE_API_KEY: ['YouTube Data API v3 (facoltativa: senza, Yuri cerca sul web)', 'console.cloud.google.com \u2192 abilita \u201CYouTube Data API v3\u201D \u2192 Credenziali \u2192 Chiave API'], APIFY_TOKEN: ['Apify (facoltativa: TikTok e Instagram)', 'console.apify.com \u2192 Settings \u2192 API & Integrations'], GITHUB_TOKEN: ['GitHub (avvio immediato del motore)', 'github.com/settings/personal-access-tokens/new \u2192 solo il repository momento-montaggio \u2192 permesso Actions: Read and write'] };
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
<\/script></body></html>`;

// src/index.js
var json2 = (d, status = 200, extra = {}) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
var hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
var sha = async (s) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
async function hashPassword(env) {
  if (env.ADMIN_PASSWORD) return sha("momento-reel|" + env.ADMIN_PASSWORD);
  return (await one(env, "SELECT valore FROM impostazioni WHERE chiave='ADMIN_HASH'"))?.valore || null;
}
async function firma(hash) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(hash), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("momento-reel-sessione")));
}
async function autorizzato(req, env) {
  const h = await hashPassword(env);
  if (!h) return false;
  const c = /(?:^|;\s*)mr_s=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  return !!c && c[1] === await firma(h);
}
var cookie = (v, maxAge) => `mr_s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
async function api(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === "/api/stato") return json2({ configurato: !!await hashPassword(env), dentro: await autorizzato(req, env) });
  if (p === "/api/accedi" && m === "POST") {
    const { password } = await req.json().catch(() => ({}));
    if (!password || String(password).length < 6) return json2({ errore: "password di almeno 6 caratteri" }, 400);
    let h = await hashPassword(env);
    const nuovo = sha("momento-reel|" + password);
    if (!h) {
      h = await nuovo;
      await run(env, "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('ADMIN_HASH', ?)", h);
    } else if (await nuovo !== h) return json2({ errore: "password errata" }, 401);
    return json2({ ok: true }, 200, { "set-cookie": cookie(await firma(h), 60 * 60 * 24 * 60) });
  }
  if (p === "/api/esci") return json2({ ok: true }, 200, { "set-cookie": cookie("", 0) });
  if (!await autorizzato(req, env)) return json2({ errore: "accesso richiesto" }, 401);
  if (p === "/api/impostazioni" && m === "GET") {
    const cfg = await configurazione(env);
    const segreti = Object.fromEntries(CHIAVI_SEGRETE.map((k) => {
      const v = cfg[k];
      return [k, { impostata: !!v, da_cloudflare: cfg._env[k], anteprima: v ? "\u2022\u2022\u2022\u2022" + String(v).slice(-4) : "" }];
    }));
    const opzioni = Object.fromEntries(CHIAVI_OPZIONI.map((k) => [k, Array.isArray(cfg[k]) ? cfg[k].join(",") : cfg[k]]));
    return json2({ segreti, opzioni });
  }
  if (p === "/api/impostazioni" && m === "POST") {
    const d = await req.json().catch(() => ({}));
    const stmt = [];
    for (const k of [...CHIAVI_SEGRETE, ...CHIAVI_OPZIONI]) {
      if (typeof d[k] !== "string") continue;
      const v = d[k].trim();
      stmt.push(v ? env.DB.prepare("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)").bind(k, v) : env.DB.prepare("DELETE FROM impostazioni WHERE chiave=?").bind(k));
    }
    if (stmt.length) await env.DB.batch(stmt);
    return json2({ ok: true });
  }
  if (p === "/api/regia" && m === "GET") {
    const [attivi, ultimi, feed, conti] = await Promise.all([
      all(env, "SELECT id, prompt, fase, stato, blocco_fino, json_extract(piano, '$.settore') AS settore FROM lavori WHERE stato='in_corso' ORDER BY id"),
      all(env, "SELECT r.agente, r.messaggio, r.livello, r.quando, r.lavoro_id FROM registro r JOIN (SELECT agente, MAX(id) AS mid FROM registro GROUP BY agente) u ON r.id = u.mid"),
      all(env, "SELECT agente, messaggio, livello, quando, lavoro_id FROM registro ORDER BY id DESC LIMIT 30"),
      all(env, "SELECT agente, COUNT(*) AS n FROM registro WHERE quando > ? GROUP BY agente", new Date(Date.now() - 7 * 864e5).toISOString())
    ]);
    const cfg = await configurazione(env);
    const chiavi = { Claude: !!cfg.ANTHROPIC_API_KEY };
    const riposo = cfg.APIFY_TOKEN ? [] : ["scout_tt", "scout_ig"];
    return json2({ adesso: ora(), attivi, ultimi, feed, conti, chiavi, riposo, yt_web: !cfg.YOUTUBE_API_KEY });
  }
  const ag = p.match(/^\/api\/regia\/agente\/([a-z_]+)$/);
  if (ag && m === "GET") {
    return json2(await all(env, "SELECT messaggio, livello, quando, lavoro_id FROM registro WHERE agente=? ORDER BY id DESC LIMIT 40", ag[1]));
  }
  if (p === "/api/lavori" && m === "GET") {
    const r = await all(env, "SELECT id, prompt, stato, fase, errore, creato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo FROM lavori ORDER BY id DESC LIMIT 60");
    return json2(r);
  }
  if (p === "/api/lavori" && m === "POST") {
    const d = await req.json().catch(() => ({}));
    const prompt = String(d.prompt || "").trim();
    if (prompt.length < 10) return json2({ errore: "descrivi il reel in almeno una frase" }, 400);
    const cfg = await configurazione(env);
    const mancanti = [["ANTHROPIC_API_KEY", "Claude"]].filter(([k]) => !cfg[k]).map(([, n]) => n);
    if (mancanti.length) return json2({ errore: `Prima inserisci le chiavi in \u2699\uFE0E Impostazioni (mancano: ${mancanti.join(", ")})` }, 400);
    const pcloud = String(d.pcloud || "").trim() || null;
    if (pcloud && !/code=/.test(pcloud)) return json2({ errore: 'il link pCloud deve essere il link pubblico della cartella (contiene "code=")' }, 400);
    const link = String(d.link_rif || "").split(/\s+/).filter((l) => /^https?:\/\//.test(l)).slice(0, 10);
    const r = await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, creato, aggiornato) VALUES (?,?,?,'pcloud',?,?) RETURNING id", prompt, pcloud, JSON.stringify(link), ora(), ora());
    await log(env, r.id, "regia", "\u{1F3AC} nuovo lavoro in coda: il Direttore creativo parte entro un minuto");
    return json2({ id: r.id });
  }
  const vv = p.match(/^\/api\/lavori\/(\d+)\/(reel\.mp4|anteprima\.jpg|copertina\.jpg)$/);
  if (vv && m === "GET") {
    if (!env.VIDEO) return json2({ errore: "archivio video non collegato" }, 404);
    const { value, metadata } = await env.VIDEO.getWithMetadata(`lavoro-${vv[1]}/${vv[2]}`, { type: "arrayBuffer" });
    if (!value) return json2({ errore: "non ancora pronto" }, 404);
    const h = new Headers({ "content-type": metadata?.tipo || (vv[2] === "reel.mp4" ? "video/mp4" : "image/jpeg"), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" });
    if (url.searchParams.get("scarica")) h.set("content-disposition", `attachment; filename="${vv[2] === "reel.mp4" ? "reel" : "copertina"}-${vv[1]}.${vv[2].split(".")[1]}"`);
    const tot = value.byteLength;
    const rg = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
    if (rg) {
      let a = rg[1] === "" ? Math.max(0, tot - Number(rg[2])) : Number(rg[1]);
      let b = rg[1] === "" || rg[2] === "" ? tot - 1 : Math.min(Number(rg[2]), tot - 1);
      if (a > b || a >= tot) return new Response(null, { status: 416, headers: { "content-range": `bytes */${tot}` } });
      h.set("content-range", `bytes ${a}-${b}/${tot}`);
      h.set("content-length", String(b - a + 1));
      return new Response(value.slice(a, b + 1), { status: 206, headers: h });
    }
    h.set("content-length", String(tot));
    return new Response(value, { headers: h });
  }
  const mm = p.match(/^\/api\/lavori\/(\d+)(?:\/(riprova|registro|girato|rimonta))?$/);
  if (mm) {
    const id = Number(mm[1]);
    if (!mm[2] && m === "GET") {
      const L = await one(env, "SELECT * FROM lavori WHERE id=?", id);
      if (!L) return json2({ errore: "non trovato" }, 404);
      for (const k of ["piano", "riferimenti", "clip", "scheda", "link_rif", "montaggio"]) L[k] = J(L[k]);
      delete L.candidati;
      L.registro = await all(env, "SELECT agente, messaggio, livello, quando FROM registro WHERE lavoro_id=? ORDER BY id DESC LIMIT 200", id);
      return json2(L);
    }
    if (!mm[2] && m === "DELETE") {
      await env.DB.batch([env.DB.prepare("DELETE FROM lavori WHERE id=?").bind(id), env.DB.prepare("DELETE FROM registro WHERE lavoro_id=?").bind(id)]);
      return json2({ ok: true });
    }
    if (mm[2] === "girato" && m === "POST") {
      const d = await req.json().catch(() => ({}));
      const pcloud = String(d.pcloud || "").trim();
      if (!/code=/.test(pcloud)) return json2({ errore: 'serve il link pubblico della cartella pCloud (contiene "code=")' }, 400);
      await run(env, "UPDATE lavori SET pcloud=?, fonte='pcloud', clip=NULL, montaggio=NULL, fase='clip', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, motore_visto=NULL, motore_pass=NULL, motore_fino=NULL, aggiornato=? WHERE id=?", pcloud, ora(), id);
      await log(env, id, "regia", "\u{1F4C1} girato collegato: Max lo scarica e lo misura, poi scheda, piano e montaggio");
      return json2({ ok: true });
    }
    if (mm[2] === "rimonta" && m === "POST") {
      const d = await req.json().catch(() => ({}));
      const L = await one(env, "SELECT montaggio, clip FROM lavori WHERE id=?", id);
      const mont = J(L?.montaggio, null);
      if (!mont?.piano) return json2({ errore: "questo lavoro non ha ancora un montaggio da rifare" }, 400);
      mont.indicazioni_rimonta = { testo: String(d.testo || "").slice(0, 800), look: d.look || null, durata: Number(d.durata) || null, ritmo: d.ritmo || null, formato: ["montaggio", "talking_head", "carosello"].includes(d.formato) ? d.formato : null };
      await run(env, "UPDATE lavori SET montaggio=?, fase='regia', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(mont), ora(), id);
      await log(env, id, "regia", `\u{1F3AC} rimontaggio richiesto${d.testo ? ": " + String(d.testo).slice(0, 120) : ""}`);
      return json2({ ok: true });
    }
    if (mm[2] === "riprova" && m === "POST") {
      const d = await req.json().catch(() => ({}));
      const fase = ["piano", "ricerca", "riferimenti", "clip", "scheda", "regia", "montaggio"].includes(d.fase) ? d.fase : null;
      const L = await one(env, "SELECT fase, riferimenti, clip FROM lavori WHERE id=?", id);
      if (!L) return json2({ errore: "non trovato" }, 404);
      const nuovaFase = fase || (L.fase === "fatto" ? "scheda" : L.fase);
      const ripristina = (s) => JSON.stringify((J(s, []) || []).map((x) => x.stato === "saltato" ? { ...x, stato: "da_guardare", errore: void 0 } : x));
      await run(
        env,
        "UPDATE lavori SET stato='in_corso', fase=?, errore=NULL, tentativi=0, blocco_fino=NULL, riferimenti=?, clip=?, aggiornato=? WHERE id=?",
        nuovaFase,
        L.riferimenti ? ripristina(L.riferimenti) : null,
        L.clip ? ripristina(L.clip) : null,
        ora(),
        id
      );
      if (nuovaFase === "montaggio") await run(env, "UPDATE lavori SET montaggio=json_set(montaggio, '$.stato', 'da_fare', '$.tentativi', 0) WHERE id=? AND montaggio IS NOT NULL", id);
      await log(env, id, "regia", `\u{1F501} riparto dalla fase "${nuovaFase}"`);
      return json2({ ok: true });
    }
  }
  return json2({ errore: "non trovato" }, 404);
}
var index_default = {
  async fetch(req, env) {
    await schema(env);
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/motore/")) {
      try {
        return await motoreApi(req, env, url);
      } catch (e) {
        return json2({ errore: String(e?.message || e).slice(0, 300) }, 500);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        return await api(req, env, url);
      } catch (e) {
        return json2({ errore: String(e?.message || e).slice(0, 300) }, 500);
      }
    }
    return new Response(PAGINA, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  },
  async scheduled(evento, env, ctx) {
    await schema(env);
    ctx.waitUntil(avanza(env));
  }
};
export {
  index_default as default
};
