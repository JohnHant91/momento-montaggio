// Momento Reel · servizi esterni: Claude (cervello), Gemini (occhi), YouTube, Apify (TikTok/IG), pCloud.
// Tutto via fetch: nessuna libreria, gira interamente su Cloudflare Workers.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a capo e tabulazioni non protetti dentro le stringhe (capita con le risposte spezzate dalle citazioni)
function riparaJson(t) {
  let out = '', dentro = false, esc = false;
  for (const ch of t) {
    if (dentro && !esc && (ch === '\n' || ch === '\r' || ch === '\t')) { out += ch === '\t' ? '\\t' : ch === '\n' ? '\\n' : ''; continue; }
    if (ch === '"' && !esc) dentro = !dentro;
    esc = ch === '\\' && !esc;
    out += ch;
  }
  return out;
}

export function estraiJson(testo) {
  if (testo && typeof testo === 'object') return testo;
  let t = String(testo || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  t = t.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, ''); // tag di citazione scritti nel testo: non servono nel JSON
  try { return JSON.parse(t); } catch {}
  for (const [a, c] of [['{', '}'], ['[', ']']]) {
    const i = t.indexOf(a), j = t.lastIndexOf(c);
    if (i !== -1 && j > i) {
      try { return JSON.parse(t.slice(i, j + 1)); } catch {}
      try { return JSON.parse(riparaJson(t.slice(i, j + 1))); } catch {}
    }
  }
  throw new Error('risposta non in JSON: ' + t.slice(0, 300));
}

// fetch con ripetizione su limiti di traffico / errori temporanei
export async function richiesta(url, opts = {}, tentativi = 4) {
  let ultimo;
  for (let n = 0; n < tentativi; n++) {
    try {
      const r = await fetch(url, opts);
      if ([429, 500, 502, 503, 504, 529].includes(r.status)) {
        ultimo = new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
        await sleep(4000 * (n + 1) * (r.status === 429 ? 3 : 1));
        continue;
      }
      return r;
    } catch (e) {
      ultimo = e;
      if (opts.body && typeof opts.body !== 'string') break; // uno stream non si può rimandare
      await sleep(3000 * (n + 1));
    }
  }
  throw new Error(`richiesta fallita (${String(url).split('?')[0]}): ${ultimo?.message || ultimo}`);
}

// ------------------------------------------------------------------ Claude
import { registra, daUsage } from './consumi.js';
export async function claude(cfg, sistema, messaggio, { maxTokens = 8000, json = true } = {}) {
  if (!cfg.ANTHROPIC_API_KEY) throw new Error('manca la chiave Claude (Impostazioni)');
  // in streaming (le risposte lunghe non vanno in timeout). Se la risposta non ci sta NON si ricomincia da capo
  // (si ripagava tutto lo scritto): Claude continua da dove si era fermato, fino a 2 volte.
  let testo = '';
  for (let giro = 0; giro < 3; giro++) {
    const messages = [{ role: 'user', content: messaggio }];
    if (testo) messages.push({ role: 'assistant', content: testo.replace(/\s+$/, '') });
    const r = await richiesta('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.CLAUDE_MODEL, max_tokens: maxTokens, stream: true, system: sistema, messages }),
    });
    if (r.status !== 200) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 400)}`);
    if (testo) testo = testo.replace(/\s+$/, '');
    let stop = null, resto = '';
    const uso = { in: 0, out: 0, cache_r: 0, cache_w: 0, ricerche: 0 };
    const dec = new TextDecoder();
    for await (const chunk of r.body) {
      resto += dec.decode(chunk, { stream: true });
      const righe = resto.split('\n');
      resto = righe.pop();
      for (const riga of righe) {
        if (!riga.startsWith('data:')) continue;
        let ev;
        try { ev = JSON.parse(riga.slice(5)); } catch { continue; }
        if (ev.type === 'message_start' && ev.message?.usage) Object.assign(uso, daUsage(ev.message.usage));
        if (ev.type === 'message_delta' && ev.usage) { uso.out = ev.usage.output_tokens || uso.out; uso.ricerche = ev.usage.server_tool_use?.web_search_requests || uso.ricerche; }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') testo += ev.delta.text;
        else if (ev.type === 'message_delta' && ev.delta?.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === 'error') throw new Error('Claude: ' + (ev.error?.message || 'errore nello streaming'));
      }
    }
    await registra(cfg, 'claude', cfg.CLAUDE_MODEL, uso);
    if (stop !== 'max_tokens') return json ? estraiJson(testo) : testo;
  }
  throw new Error('risposta di Claude troncata (troppo lunga anche continuando)');
}

// Claude con immagini (tavole di fotogrammi preparate dal motore GitHub)
// Gemini con immagini: per i REEL DI RIFERIMENTO (video pubblici, non materiale dei clienti) → piano gratuito, costo zero.
export async function geminiVisione(cfg, sistema, testo, immagini) {
  const parti = [{ text: sistema }];
  for (const im of immagini) parti.push({ text: `Immagine: ${im.cosa}` }, { inline_data: { mime_type: im.tipo || 'image/jpeg', data: im.jpeg } });
  parti.push({ text: testo });
  const out = await geminiGenera(cfg, parti);
  await registra(cfg, 'gemini', cfg.GEMINI_MODELS[0] || 'gemini', {}, 0);
  return out;
}

export async function claudeVisione(cfg, modello, sistema, testo, immagini, maxTokens = 4000) {
  if (!cfg.ANTHROPIC_API_KEY) throw new Error('manca la chiave Claude (Impostazioni)');
  const content = [];
  for (const im of immagini) {
    content.push({ type: 'text', text: `Immagine: ${im.cosa}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: im.tipo || 'image/jpeg', data: im.jpeg } });
  }
  content.push({ type: 'text', text: testo });
  const r = await richiesta('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modello, max_tokens: maxTokens, system: sistema, messages: [{ role: 'user', content }] }),
  });
  const t = await r.text();
  if (r.status !== 200) {
    // credito finito o limite: non è colpa del video, lo segnalo a parte
    if (r.status === 429 || /credit balance|billing/i.test(t)) throw new Error('LIMITE_CLAUDE: ' + t.slice(0, 200));
    throw new Error(`Claude ${r.status}: ${t.slice(0, 300)}`);
  }
  const d = JSON.parse(t);
  await registra(cfg, 'claude', modello, daUsage(d.usage));
  if (d.stop_reason === 'max_tokens') throw new Error('risposta di Claude troncata');
  const out = estraiJson((d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
  out._uso = d.usage ? { in: d.usage.input_tokens, out: d.usage.output_tokens, modello } : undefined;
  return out;
}

// ------------------------------------------------------------------ Gemini (non più usato: lasciato per eventuale ritorno)
const GBASE = 'https://generativelanguage.googleapis.com';

async function geminiGenera(cfg, parti, { bassa = false } = {}) {
  if (!cfg.GEMINI_API_KEY) throw new Error('manca la chiave Gemini (Impostazioni)');
  // bassa risoluzione: ~4 volte meno "token" per fotogramma → più veloce e consuma meno quota (basta per le clip grezze)
  const generationConfig = { responseMimeType: 'application/json', temperature: 0.2 };
  if (bassa) generationConfig.mediaResolution = 'MEDIA_RESOLUTION_LOW';
  const corpo = JSON.stringify({ contents: [{ role: 'user', parts: parti }], generationConfig });
  const errori = [];
  let quota = 0;
  for (const modello of cfg.GEMINI_MODELS) {
    let r;
    try {
      r = await richiesta(`${GBASE}/v1beta/models/${modello}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.GEMINI_API_KEY }, body: corpo,
      }, 2);
    } catch (e) {
      // quota del piano gratuito finita su questo modello: provo il prossimo (ogni modello ha la sua quota)
      if (/HTTP 429/.test(e.message)) { quota++; errori.push(modello + ': quota'); continue; }
      // modello sovraccarico o momentaneamente giù (503/500/504): non mi fermo, provo il modello successivo
      const g = e.message.match(/HTTP (5\d\d)/);
      if (g) { errori.push(modello + ': ' + g[1]); continue; }
      throw e;
    }
    const t = await r.text();
    if (r.status === 200) {
      const d = JSON.parse(t);
      const testo = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (!testo) throw new Error('Gemini senza risposta: ' + t.slice(0, 300));
      return estraiJson(testo);
    }
    if ((r.status === 404 || r.status === 400) && /not found|not supported|is not available/i.test(t)) { errori.push(modello); continue; }
    throw new Error(`Gemini ${r.status} (${modello}): ${t.slice(0, 400)}`);
  }
  if (quota) throw new Error('QUOTA_GEMINI: quota gratuita di Gemini esaurita (' + errori.join(', ') + '). Attiva la fatturazione su aistudio.google.com o aspetta il reset giornaliero');
  throw new Error('nessun modello Gemini ha risposto: ' + errori.join(', '));
}

// diagnosi: per ogni modello una domanda di testo e la visione di un video YouTube corto
export async function diagnosiGemini(cfg) {
  if (!cfg.GEMINI_API_KEY) return { errore: 'manca la chiave Gemini' };
  const out = [];
  for (const modello of cfg.GEMINI_MODELS) {
    for (const [prova, parti] of [['testo', [{ text: 'Rispondi solo con {"ok":true}' }]], ['youtube', [{ fileData: { fileUri: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' } }, { text: 'Descrivi il video in 5 parole. Rispondi in JSON {"descrizione":"..."}' }]]]) {
      const t0 = Date.now();
      try {
        const r = await fetch(`${GBASE}/v1beta/models/${modello}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ role: 'user', parts: parti }], generationConfig: { responseMimeType: 'application/json' } }) });
        out.push({ modello, prova, stato: r.status, secondi: Math.round((Date.now() - t0) / 100) / 10, risposta: (await r.text()).slice(0, 300) });
      } catch (e) { out.push({ modello, prova, errore: e.message }); }
    }
  }
  return out;
}

export function guardaYoutube(cfg, url, istruzioni, fps) {
  return geminiGenera(cfg, [
    { fileData: { fileUri: url }, videoMetadata: { fps: fps || cfg.FPS_ANALISI } },
    { text: istruzioni },
  ]);
}

// Scarica un video da un link e lo passa a Gemini in streaming (non resta niente su Cloudflare).
export async function caricaSuGemini(cfg, srcUrl, nome, headers = {}) {
  const src = await richiesta(srcUrl, { headers: { 'user-agent': 'Mozilla/5.0', ...headers } });
  if (!src.ok) throw new Error(`download non riuscito (HTTP ${src.status}): link scaduto o non pubblico`);
  let mime = (src.headers.get('content-type') || '').split(';')[0];
  if (!mime.startsWith('video/')) mime = 'video/mp4';
  let lunghezza = Number(src.headers.get('content-length') || 0);
  let corpo;
  if (lunghezza > 0) {
    const { readable, writable } = new FixedLengthStream(lunghezza);
    src.body.pipeTo(writable).catch(() => {});
    corpo = readable;
  } else {
    const buf = await src.arrayBuffer();
    if (buf.byteLength > 95 * 1024 * 1024) throw new Error('video senza dimensione dichiarata e troppo grande');
    lunghezza = buf.byteLength;
    corpo = buf;
  }
  return caricaFlusso(cfg, corpo, lunghezza, mime, nome);
}

async function caricaFlusso(cfg, corpo, lunghezza, mime, nome) {
  if (lunghezza > 1900 * 1024 * 1024) throw new Error('video oltre 1,9 GB: troppo grande per Gemini');
  const avvio = await richiesta(`${GBASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': cfg.GEMINI_API_KEY,
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(lunghezza), 'X-Goog-Upload-Header-Content-Type': mime,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: String(nome).slice(0, 120) } }),
  });
  const urlUpload = avvio.headers.get('x-goog-upload-url');
  if (!urlUpload) throw new Error(`upload Gemini non avviato (${avvio.status}): ${(await avvio.text()).slice(0, 200)}`);
  const fine = await richiesta(urlUpload, {
    method: 'POST',
    headers: { 'Content-Length': String(lunghezza), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: corpo,
  }, 1);
  let file = (await fine.json()).file;
  if (!file?.name) throw new Error('upload Gemini fallito');
  for (let i = 0; i < 90; i++) {
    if (file.state === 'ACTIVE') return { uri: file.uri, mime };
    if (file.state === 'FAILED') throw new Error('Gemini non è riuscito a leggere il video');
    await sleep(5000);
    file = await (await richiesta(`${GBASE}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': cfg.GEMINI_API_KEY } })).json();
  }
  throw new Error('Gemini: tempo scaduto in elaborazione video');
}

// Carica su Gemini un video che arriva come flusso con lunghezza nota (dal motore GitHub) e lo fa guardare

export async function guardaCorpo(cfg, corpo, lunghezza, nome, istruzioni, fps) {
  if (!cfg.GEMINI_API_KEY) throw new Error('manca la chiave Gemini (Impostazioni)');
  const { uri, mime } = await caricaFlusso(cfg, corpo, lunghezza, 'video/mp4', nome);
  return geminiGenera(cfg, [
    { fileData: { fileUri: uri, mimeType: mime }, videoMetadata: { fps: fps || cfg.FPS_ANALISI } },
    { text: istruzioni },
  ], { bassa: true });
}

export async function guardaUrlVideo(cfg, srcUrl, nome, istruzioni, fps, headers) {
  const { uri, mime } = await caricaSuGemini(cfg, srcUrl, nome, headers);
  return geminiGenera(cfg, [
    { fileData: { fileUri: uri, mimeType: mime }, videoMetadata: { fps: fps || cfg.FPS_ANALISI } },
    { text: istruzioni },
  ]);
}

// ------------------------------------------------------------------ YouTube Shorts
const durataIso = (iso) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
};

// Senza chiave YouTube: Claude cerca sul web gli Shorts del settore (solo link reali presi dai risultati)
export async function youtubeDaWeb(cfg, queries) {
  const r = await richiesta('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg.CLAUDE_MODEL, max_tokens: 3000,
      tools: [{ type: cfg.WEB_SEARCH_TOOL, name: 'web_search', max_uses: 6 }],
      messages: [{ role: 'user', content: `Cerca su YouTube Shorts (anche con site:youtube.com/shorts) i video brevi più visti e apprezzati per queste ricerche: ${queries.join(' | ')}.
Voglio esempi reali di montaggio da cui imparare (stile, ritmo, gancio), pubblicati negli ultimi 2 anni, preferibilmente sotto i 90 secondi.
Alla fine elenca SOLO i link YouTube trovati nei risultati (massimo 10), uno per riga, con il titolo dopo " | ". Non inventare link.` }],
    }),
  });
  if (r.status !== 200) throw new Error(`ricerca web ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  await registra(cfg, 'claude', cfg.CLAUDE_MODEL, daUsage(d.usage));
  const visti = new Map();
  const aggiungi = (url, titolo) => {
    const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url || '');
    if (m && !visti.has(m[1])) visti.set(m[1], titolo || '');
  };
  for (const b of d.content || []) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach((x) => aggiungi(x.url, x.title));
  }
  // dal testo finale tiene solo i link che compaiono anche nei risultati della ricerca (niente link inventati)
  const testo = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const ordine = [...testo.matchAll(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map((m) => m[1]).filter((id) => visti.has(id));
  const ids = [...new Set([...ordine, ...visti.keys()])].slice(0, 12);
  return {
    video: ids.map((id, i) => ({
      piattaforma: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}`, video_url: null, titolo: visti.get(id) || '',
      autore: '', views: 0, likes: 0, commenti: 0, condivisioni: 0, durata: 0, data: '', ordine_web: i,
    })),
    nota: ids.length ? null : 'la ricerca web non ha trovato Shorts',
  };
}

export async function youtube(cfg, queries, perQuery = 15) {
  if (!cfg.YOUTUBE_API_KEY) return youtubeDaWeb(cfg, queries);
  const dopo = new Date(Date.now() - cfg.MESI_RICERCA * 30 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
  let ids = [];
  for (const q of queries) {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    Object.entries({ part: 'id', q, type: 'video', videoDuration: 'short', order: 'viewCount', publishedAfter: dopo, maxResults: perQuery, key: cfg.YOUTUBE_API_KEY })
      .forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await richiesta(u.toString());
    if (r.status !== 200) throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0, 200)}`);
    ids.push(...((await r.json()).items || []).map((i) => i.id?.videoId).filter(Boolean));
  }
  ids = [...new Set(ids)];
  return { video: await youtubeDettagli(cfg, ids, cfg.DURATA_MAX) };
}

export async function youtubeDettagli(cfg, ids, durataMax = 9999) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const u = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids.slice(i, i + 50).join(',')}&key=${cfg.YOUTUBE_API_KEY}`;
    const r = await richiesta(u);
    if (r.status !== 200) continue;
    for (const v of (await r.json()).items || []) {
      const st = v.statistics || {}, sn = v.snippet || {};
      const durata = durataIso(v.contentDetails?.duration);
      if (!durata || durata > durataMax) continue;
      out.push({
        piattaforma: 'youtube', id: v.id, url: `https://www.youtube.com/watch?v=${v.id}`, video_url: null,
        titolo: sn.title || '', autore: sn.channelTitle || '', views: +st.viewCount || 0, likes: +st.likeCount || 0,
        commenti: +st.commentCount || 0, condivisioni: 0, durata, data: sn.publishedAt || '',
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ Apify (TikTok / Instagram)
export async function apify(cfg, actor, input) {
  const u = `https://api.apify.com/v2/acts/${actor.replace('/', '~')}/run-sync-get-dataset-items?token=${cfg.APIFY_TOKEN}&timeout=280`;
  const r = await richiesta(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }, 2);
  if (r.status !== 200 && r.status !== 201) throw new Error(`Apify ${actor} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

export const primo = (d, ...chiavi) => {
  for (const k of chiavi) {
    let v = d;
    for (const p of k.split('.')) v = v == null ? undefined : Array.isArray(v) && /^\d+$/.test(p) ? v[+p] : v[p];
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
  }
  return undefined;
};
const num = (v) => Math.round(Number(v) || 0);

function normTiktok(it) {
  return {
    piattaforma: 'tiktok', id: String(primo(it, 'id', 'video_id') || ''),
    url: primo(it, 'webVideoUrl', 'url', 'detail_url') || '',
    video_url: primo(it, 'mediaUrls.0', 'videoMeta.downloadAddr', 'videoMeta.originalDownloadAddr', 'video_url_720p', 'videoUrl') || null,
    titolo: String(primo(it, 'text', 'desc', 'ad_title') || '').slice(0, 200),
    autore: primo(it, 'authorMeta.name', 'author', 'brand_name') || '',
    views: num(primo(it, 'playCount', 'views')), likes: num(primo(it, 'diggCount', 'likes')),
    commenti: num(primo(it, 'commentCount', 'comments')), condivisioni: num(primo(it, 'shareCount', 'shares')),
    durata: num(primo(it, 'videoMeta.duration', 'duration_sec', 'duration')), data: primo(it, 'createTimeISO') || '',
  };
}

function normInstagram(it) {
  return {
    piattaforma: 'instagram', id: String(primo(it, 'shortCode', 'id') || ''),
    url: primo(it, 'url', 'reelURL') || '', video_url: primo(it, 'videoUrl', 'video_url') || null,
    titolo: String(primo(it, 'caption') || '').slice(0, 200), autore: primo(it, 'ownerUsername') || '',
    views: num(primo(it, 'videoPlayCount', 'videoViewCount', 'views')), likes: num(primo(it, 'likesCount', 'likes')),
    commenti: num(primo(it, 'commentsCount', 'comments')), condivisioni: 0,
    durata: num(primo(it, 'videoDuration', 'duration')), data: primo(it, 'timestamp') || '',
    _video: !!primo(it, 'videoUrl') || /video|clips/i.test(String(primo(it, 'type', 'productType') || '')),
  };
}

export async function tiktok(cfg, queries, hashtags, perVoce = 10) {
  if (!cfg.APIFY_TOKEN) return { video: [], nota: 'TikTok saltato: manca il token Apify' };
  const items = await apify(cfg, cfg.APIFY_TIKTOK_ACTOR, {
    searchQueries: queries, hashtags: hashtags.map((h) => h.replace(/^#/, '')), searchSection: '/video',
    resultsPerPage: perVoce, shouldDownloadVideos: true, shouldDownloadCovers: false,
    shouldDownloadSubtitles: false, shouldDownloadSlideshowImages: false,
  });
  return { video: items.map(normTiktok).filter((v) => v.id && (!v.durata || v.durata <= cfg.DURATA_MAX)) };
}

// Instagram con l'API ufficiale (gratis) tramite il modulo momento-instagram: ricerca per hashtag sul tuo account business
async function instagramUfficiale(cfg, hashtags, perVoce) {
  const env = cfg._rec;
  if (!env?.IG || !env?.IG_INTERNO_KEY) return null;
  const out = [], note = [];
  // Meta: max 30 hashtag diversi ogni 7 giorni → UN hashtag a reel (il più preciso, il primo); il secondo solo se il primo trova meno di 5 reel
  for (const h of hashtags.slice(0, 2)) {
    if (out.length >= 5) break;
    try {
      const r = await env.IG.fetch(`https://momento-instagram/hashtag?tag=${encodeURIComponent(h.replace(/^#/, ''))}&n=${perVoce}`, { headers: { 'x-admin-key': env.IG_INTERNO_KEY } });
      const d = await r.json();
      if (d.errore) { note.push(`#${h}: ${String(d.errore).slice(0, 80)}`); continue; }
      for (const x of d.media || []) out.push({
        piattaforma: 'instagram', id: String(x.id), url: x.permalink || '', video_url: x.media_url || null,
        titolo: String(x.caption || '').slice(0, 200), autore: '', views: 0, likes: num(x.like_count), commenti: num(x.comments_count),
        condivisioni: 0, durata: 0, data: x.timestamp || '',
      });
    } catch (e) { note.push(`#${h}: ${String(e.message).slice(0, 80)}`); }
  }
  return { video: out.filter((v) => v.id), nota: note.length ? 'Instagram (API ufficiale): ' + note.join('; ') : undefined };
}

export async function instagram(cfg, hashtags, perVoce = 15) {
  const uff = await instagramUfficiale(cfg, hashtags, perVoce);
  if (uff && uff.video.length) return uff;
  if (!cfg.APIFY_TOKEN) return uff || { video: [], nota: 'Instagram saltato: manca il token Apify' };
  const items = await apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, {
    directUrls: hashtags.map((h) => `https://www.instagram.com/explore/tags/${h.replace(/^#/, '')}/`),
    resultsType: 'posts', resultsLimit: perVoce, addParentData: false,
  });
  return { video: items.map(normInstagram).filter((v) => v.id && v._video && (!v.durata || v.durata <= cfg.DURATA_MAX)) };
}

// link incollati da Johnny (YouTube / TikTok / Instagram)
export async function linkDiretti(cfg, links) {
  const yt = [], tt = [], ig = [], altri = [];
  for (const l of links) {
    const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l);
    if (y) yt.push(y[1]);
    else if (/tiktok\.com/.test(l) && cfg.APIFY_TOKEN) tt.push(l);
    else if (/instagram\.com/.test(l) && cfg.APIFY_TOKEN) ig.push(l);
    else altri.push(l); // Pinterest, Vimeo, TikTok/Instagram senza Apify...: li scarica il motore con yt-dlp
  }
  const out = altri.map((url, i) => ({ piattaforma: (/pinterest|pin\.it/.test(url) ? 'pinterest' : /tiktok/.test(url) ? 'tiktok' : /instagram/.test(url) ? 'instagram' : /vimeo/.test(url) ? 'vimeo' : 'web'),
    id: 'link' + i + '_' + url.replace(/\W+/g, '').slice(-24), url, titolo: '', autore: '', views: 0, likes: 0, commenti: 0, condivisioni: 0, durata: 0 }));
  if (yt.length) {
    if (cfg.YOUTUBE_API_KEY) out.push(...await youtubeDettagli(cfg, yt));
    else out.push(...yt.map((id) => ({ piattaforma: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}`, titolo: '', autore: '', views: 0, likes: 0, commenti: 0, condivisioni: 0, durata: 0 })));
  }
  if (tt.length && cfg.APIFY_TOKEN) out.push(...(await apify(cfg, cfg.APIFY_TIKTOK_ACTOR, { postURLs: tt, shouldDownloadVideos: true, resultsPerPage: 1 })).map(normTiktok));
  if (ig.length && cfg.APIFY_TOKEN) out.push(...(await apify(cfg, cfg.APIFY_INSTAGRAM_ACTOR, { directUrls: ig, resultsType: 'posts', resultsLimit: 1 })).map(normInstagram));
  return { video: out.map((v) => ({ ...v, scelto_da_johnny: true })), nota: out.nota };
}

export function punteggio(v) {
  if (!v.views && v.ordine_web !== undefined) return 10 - v.ordine_web * 0.1;
  const views = Math.max(v.views || 0, 1);
  const coinv = ((v.likes || 0) + 2 * (v.commenti || 0) + 3 * (v.condivisioni || 0)) / views;
  return Math.round((Math.log10(views + 1) + Math.min(coinv, 0.3) * 10) * 1000) / 1000;
}

// ------------------------------------------------------------------ pCloud (link pubblico della cartella)
const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|avi|mts|mxf|webm)$/i;
const FOTO_EXT = /\.(jpe?g|png|webp)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|aac|flac|ogg)$/i;

function codicePcloud(link) {
  try { return new URL(link).searchParams.get('code'); } catch { return null; }
}

export async function pcloudApi(link, metodo, params) {
  const code = codicePcloud(link);
  if (!code) throw new Error('link pCloud non valido: deve contenere "code=" (link pubblico della cartella)');
  const host = /(^|\/\/)e\.|eapi/.test(link) ? ['eapi', 'api'] : ['api', 'eapi'];
  let ultimo;
  for (const h of host) {
    const u = new URL(`https://${h}.pcloud.com/${metodo}`);
    u.searchParams.set('code', code);
    Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
    const d = await (await richiesta(u.toString())).json();
    if (d.result === 0) return d;
    ultimo = d;
  }
  throw new Error(`pCloud: ${ultimo?.error || 'errore ' + ultimo?.result}`);
}

export async function pcloudClip(link) {
  const d = await pcloudApi(link, 'showpublink', {});
  const out = [];
  const visita = (m, cartella = '') => {
    if (m.isfolder) (m.contents || []).forEach((c) => visita(c, cartella ? `${cartella}/${m.name}` : m.name));
    else if (AUDIO_EXT.test(m.name)) {
      // brano musicale (con licenza) messo nella cartella: diventa la musica del reel
      out.push({ fileid: m.fileid, nome: m.name, cartella, dimensione: m.size, hash: String(m.hash || m.fileid), tipo: 'musica', tecnico: { tipo: 'musica' } });
    } else if ((m.category === 1 || FOTO_EXT.test(m.name)) && FOTO_EXT.test(m.name)) {
      // foto e slide di carosello (per il formato carosello e come immagini nel montaggio)
      out.push({ fileid: m.fileid, nome: m.name, cartella, dimensione: m.size, hash: String(m.hash || m.fileid), tipo: 'immagine',
        tecnico: { tipo: 'immagine', durata_sec: 0, risoluzione: m.width ? `${m.width}x${m.height}` : null, orientamento: m.width ? (m.height > m.width ? 'verticale' : m.width > m.height ? 'orizzontale' : 'quadrato') : null } });
    } else if (m.category === 2 || VIDEO_EXT.test(m.name)) {
      out.push({
        fileid: m.fileid, nome: m.name, cartella, dimensione: m.size, hash: String(m.hash || m.fileid),
        tecnico: { durata_sec: m.duration ? Number(m.duration) : null, risoluzione: m.width ? `${m.width}x${m.height}` : null, fps: m.fps ? Number(m.fps) : null, orientamento: m.width ? (m.height > m.width ? 'verticale' : m.width > m.height ? 'orizzontale' : 'quadrato') : null, rallenty_possibile: m.fps ? Number(m.fps) >= 48 : null },
      });
    }
  };
  visita(d.metadata);
  return out;
}

export async function pcloudLinkDownload(link, fileid) {
  const d = await pcloudApi(link, 'getpublinkdownload', { fileid });
  return `https://${d.hosts[0]}${d.path}`;
}
