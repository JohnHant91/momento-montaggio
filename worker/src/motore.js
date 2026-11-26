import { firmaSorgenti, linkFirmato, servi } from './archivio.js';
import { motoreImporta } from './importa.js';
import { motoreImpagina } from './impagina.js';
// Motore "occhi" su GitHub Actions (repo johnhant91/momento-montaggio). Si presenta con l'identità OIDC firmata da GitHub,
// prende i video da guardare (reel di riferimento o clip pCloud), li misura (ffmpeg, Whisper) ed estrae i fotogrammi chiave.
// La regia manda misure + fotogrammi a Claude (la chiave resta su Cloudflare: su GitHub non c'è nessuna chiave).
import { J, all, log, one, ora, run, configurazione } from './db.js';
import { analisiClip, analisiRiferimento, chiaveClip, chiaveRif } from './lavoro.js';
import * as S from './servizi.js';
import { chi } from './consumi.js';

const REPO = 'johnhant91/momento-montaggio';
const AUD = 'momento-reel';
const COLONNA = { riferimenti: 'riferimenti', clip: 'clip' };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function identitaGitHub(auth) {
  const tok = String(auth || '').replace(/^Bearer\s+/i, '').trim();
  const parti = tok.split('.');
  if (parti.length !== 3) return null;
  let hdr, pl;
  try { hdr = JSON.parse(new TextDecoder().decode(b64u(parti[0]))); pl = JSON.parse(new TextDecoder().decode(b64u(parti[1]))); } catch { return null; }
  const aud = Array.isArray(pl.aud) ? pl.aud : [pl.aud];
  if (pl.iss !== 'https://token.actions.githubusercontent.com' || !aud.includes(AUD)) return null;
  if (String(pl.repository || '').toLowerCase() !== REPO || !pl.exp || pl.exp * 1000 < Date.now()) return null;
  const jwks = await (await fetch('https://token.actions.githubusercontent.com/.well-known/jwks', { cf: { cacheTtl: 3600, cacheEverything: true } })).json();
  const jwk = (jwks.keys || []).find((k) => k.kid === hdr.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(parti[2]), new TextEncoder().encode(parti[0] + '.' + parti[1]));
  return ok ? pl : null;
}

const codice = (link) => { try { return new URL(link).searchParams.get('code'); } catch { return String(link || '').match(/code=([\w-]+)/)?.[1] || null; } }; // anche dentro l'elenco JSON dei video da link

// aggiorna UN elemento dentro l'elenco (json_set è atomico: le risposte in parallelo non si pestano i piedi)
async function aggiorna(env, id, colonna, indice, el) {
  await run(env, `UPDATE lavori SET ${colonna}=json_set(${colonna}, ?, json(?)), motore_visto=? WHERE id=?`, `$[${Math.trunc(indice)}]`, JSON.stringify(el), ora(), id);
}

const PENDENTE = (col) => `EXISTS (SELECT 1 FROM json_each(lavori.${col}) WHERE json_extract(value, '$.stato')='da_guardare')`;

// verso del girato: Claude guarda i fotogrammi (a lotti di 10) e dice di quanto girare quelli coricati
const PROMPT_VERSO = `Controlli il verso dei fotogrammi di un girato. Per ogni immagine guarda se è DRITTA: persone in piedi
con la testa in alto, tavoli, banchi e pavimento in basso, oggetti appoggiati sotto, scritte leggibili da sinistra a destra.
Se la camera era tenuta in verticale l'immagine esce CORICATA: persone sdraiate di lato, piano del tavolo in verticale, scritte che
corrono dall'alto in basso. Rispondi SOLO JSON: {"gradi": [n, n, ...]} uno per immagine nell'ordine:
0 se è dritta, 90 se va girata di 90° in senso ORARIO per diventare dritta, -90 se in senso ANTIORARIO, 180 se è capovolta.
Guarda bene la gravità: liquidi che colano, impasto che cade, oggetti appoggiati. Un'inquadratura orizzontale dritta è 0.`;
async function chiediVerso(cfg, immagini) {
  const gradi = [];
  for (let k = 0; k < immagini.length; k += 10) {
    const lotto = immagini.slice(k, k + 10);
    const out = await S.claudeVisione(cfg, cfg.CLAUDE_MODEL, PROMPT_VERSO, `Immagini: ${lotto.length}.`, lotto.map((j, n) => ({ cosa: `fotogramma ${n + 1}`, jpeg: j })), 2000);
    for (let n = 0; n < lotto.length; n++) { const g = Number(out?.gradi?.[n]); gradi.push([90, -90, 180].includes(g) ? g : 0); }
  }
  return gradi;
}

export async function motoreApi(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p.startsWith('/api/motore/verso-prova/') && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    if (p.endsWith('/prendi')) {
      const c = (await one(env, "SELECT valore FROM impostazioni WHERE chiave='PROVA_VERSO'"))?.valore || 'Clienti/PANIFICIO NONNO ENRICO';
      const F = await all(env, "SELECT percorso, nome, dimensione FROM archivio WHERE tipo='video' AND percorso >= ? AND percorso < ? ORDER BY percorso", c + '/', c + '0');
      const o = new URL(req.url).origin;
      return json({ cartella: c, file: await Promise.all(F.map(async (f) => ({ nome: f.nome, url: await linkFirmato(env, o, f.percorso) }))) });
    }
    // il reel finito (a pezzi da 20 MB nel KV), per controllarlo cifrato dallo studio
    if (p.endsWith('/reel')) {
      const id = Number(new URL(req.url).searchParams.get('id')) || 0;
      const n = Number(new URL(req.url).searchParams.get('n')) || 0;
      const kk = new URL(req.url).searchParams.get('k') || '';
      const base = /^(lavoro-\d+|backup\/lavoro-\d+-v\d+)\/reel\.mp4$/.test(kk) ? kk : `lavoro-${id}/reel.mp4`;
      const chiave = base + (n ? '#' + n : '');
      const { value, metadata } = await env.VIDEO.getWithMetadata(chiave, { type: 'arrayBuffer' });
      if (!value) return json({ errore: 'non trovato' }, 404);
      return new Response(value, { headers: { 'content-type': 'application/octet-stream', 'x-parti': String(metadata?.parti || 1) } });
    }
    // il reel montato a mano da Johnny (link pCloud salvato nelle impostazioni, mai nei log pubblici)
    if (p.endsWith('/umano')) {
      const link = (await one(env, "SELECT valore FROM impostazioni WHERE chiave='PROVA_UMANO'"))?.valore;
      if (!link) return json({});
      const F = (await S.pcloudClip(link)).filter((f) => f.tipo !== 'musica' && f.tipo !== 'immagine');
      if (!F.length) return json({ errore: 'nessun video nel link' });
      return json({ nome: F[0].nome, url: await S.pcloudLinkDownload(link, F[0].fileid) });
    }
    if (p.endsWith('/esito')) {
      const d = await req.json().catch(() => ({}));
      const cfg = chi(await configurazione(env), { area: 'reel', agente: 'occhi' });
      let gradi;
      try { gradi = await chiediVerso(cfg, (d.immagini || []).slice(0, 200)); } catch (e) { return json({ errore: String(e?.message || e).slice(0, 300) }, 500); }
      await run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)', 'PROVA_VERSO_ESITO', JSON.stringify({ quando: ora(), nomi: d.nomi || [], gradi }));
      return json({ gradi });
    }
  }
  if (p.startsWith('/api/motore/importa')) return motoreImporta(req, env, p, m, json, identitaGitHub);
  if (p.startsWith('/api/motore/impagina')) return motoreImpagina(req, env, p, m, json, identitaGitHub, linkFirmato);

  // 0) c'è qualcosa da guardare? (solo sì/no, senza dettagli: serve al motore per non installare niente se non serve)
  if (p === '/api/motore/coda' && m === 'GET') {
    const solo = Number(url.searchParams.get('lavoro')) || 0; // motore dedicato a un reel
    const r = await one(env, `SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (?=0 OR id=?) AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE('riferimenti')}) OR (fase='clip' AND clip IS NOT NULL AND ${PENDENTE('clip')}) OR
      (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))`, solo, solo);
    return json({ lavoro: (r?.n || 0) > 0 });
  }

  // 1) il motore chiede lavoro
  if (p === '/api/motore/prossimo' && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    const adesso = ora();
    const solo = Number(url.searchParams.get('lavoro')) || 0; // motore dedicato a un reel: prende solo quello
    const pass = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const L = await one(env, `UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (?=0 OR id=?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE('riferimenti')}) OR
          (fase='clip' AND clip IS NOT NULL AND ${PENDENTE('clip')}) OR
          (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))
        ORDER BY CASE WHEN fase='montaggio' THEN 0 ELSE 1 END, id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip, montaggio`, pass, new Date(Date.now() + 55 * 60e3).toISOString(), adesso, adesso, solo, solo);
    if (!L) return new Response(null, { status: 204 });
    const tipo = L.fase;
    if (tipo === 'montaggio') {
      const m = J(L.montaggio, {});
      await log(env, L.id, 'motore', `⚙️ motore GitHub al lavoro: scarico ${new Set([...(m.piano.segmenti || []), ...(m.piano.broll || []), ...(m.piano.slide || [])].map((s) => s.fileid || s.url)).size} file e monto il reel (${m.piano.formato || 'montaggio'})`);
      // chiave per cifrare la cache delle clip sul motore (repo pubblico: le clip dei clienti in cache sono sempre cifrate)
      let cache_key = null;
      if (env.IG_INTERNO_KEY) {
        const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.IG_INTERNO_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        cache_key = [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('clipcache-v1')))].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      return json({ id: L.id, tipo, pass, cache_key, pcloud_code: codice(L.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L.pcloud || ''), piano: await firmaSorgenti(env, url.origin, m.piano) });
    }
    const elenco = J(tipo === 'riferimenti' ? L.riferimenti : L.clip, []);
    const elementi = await Promise.all(elenco.map((x, i) => [x, i]).filter(([x]) => x.stato === 'da_guardare').map(async ([x, i]) => tipo === 'riferimenti'
      ? { indice: i, nome: `${x.video.piattaforma} · ${(x.video.titolo || x.video.url || '').slice(0, 60)}`, url: x.video.url,
          // i file di Apify li scarica la regia (ha il token), il motore passa da qui
          video_url: x.video.video_url ? (x.video.video_url.includes('api.apify.com') ? `${url.origin}/api/motore/${L.id}/scarica?i=${i}&tipo=riferimenti&pass=${pass}` : x.video.video_url) : null }
      : { indice: i, nome: x.nome, tipo: x.tipo || x.tecnico?.tipo || 'video', fileid: x.sorgente?.tipo === 'pcloud' || !x.sorgente ? x.fileid : null, video_url: x.sorgente?.tipo === 'url' ? x.sorgente.url : x.sorgente?.tipo === 'archivio' ? await linkFirmato(env, url.origin, x.sorgente.percorso) : null, dimensione: x.dimensione }));
    await log(env, L.id, 'motore', `⚙️ motore GitHub al lavoro: ${elementi.length} ${tipo === 'riferimenti' ? 'reel da scaricare e misurare' : 'clip da scaricare e misurare'}`);
    return json({ id: L.id, tipo, pass, pcloud_code: codice(L.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L.pcloud || ''), elementi });
  }

  const mm = p.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica|log|video|anteprima|copertina|esito|logo|fuoco|verso|proxy-\d{1,2})$/);
  if (!mm) return json({ errore: 'non trovato' }, 404);
  const id = Number(mm[1]);
  const L = await one(env, 'SELECT id, prompt, piano, fase, riferimenti, clip, montaggio, motore_pass FROM lavori WHERE id=?', id);
  const pass = req.headers.get('x-pass') || url.searchParams.get('pass') || '';
  if (!L || !L.motore_pass || pass.length < 32 || pass !== L.motore_pass) return json({ errore: 'lasciapassare non valido' }, 403);
  const tipo = COLONNA[url.searchParams.get('tipo')] || (L.fase === 'riferimenti' ? 'riferimenti' : 'clip');
  const elenco = J(L[tipo], []);
  const indice = Number(url.searchParams.get('i'));
  const el = elenco[indice];
  const nome = (x) => (tipo === 'riferimenti' ? `${x.video.piattaforma} ${x.video.id}` : x.nome);

  // ---- montaggio: avanzamento dei reparti, video, anteprima, esito del revisore
  // il montatore chiede dove sta nell'immagine l'oggetto su cui va l'attenzione (es. "la scatola")
  // il montatore chiede se il girato è coricato (camera tenuta in verticale): un fotogramma per clip, una sola chiamata
  if (mm[2] === 'verso' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const im = (d.immagini || []).slice(0, 60);
    if (!im.length) return json({ gradi: [] });
    const cfg = chi(await configurazione(env), { area: 'reel', lavoro_id: Number(id) || null, agente: 'occhi' });
    try { return json({ gradi: await chiediVerso(cfg, im) }); } catch (e) { return json({ gradi: [], errore: String(e?.message || e).slice(0, 200) }); }
  }
  if (mm[2] === 'fuoco' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    if (!d.jpeg || !d.oggetto) return json({ errore: 'dati mancanti' }, 400);
    const cfg = chi(await configurazione(env), { area: 'reel', lavoro_id: Number(id) || null, agente: 'editor' });
    try {
      const out = await S.claudeVisione(cfg, cfg.CLAUDE_MODEL_LIGHT, `Trovi un oggetto in un fotogramma di un video verticale. Rispondi SOLO JSON:
{"trovato": bool, "x": centro orizzontale 0-1, "y": centro verticale 0-1, "w": larghezza 0-1, "h": altezza 0-1}
Le misure sono frazioni dell'immagine (0,0 = in alto a sinistra). Se l'oggetto non c'è: {"trovato": false}.`,
        `Oggetto da trovare: ${String(d.oggetto).slice(0, 60)}`, [{ cosa: 'fotogramma', jpeg: d.jpeg }], 300);
      const n = (v) => Math.min(1, Math.max(0, Number(v)));
      return json(out?.trovato ? { trovato: true, x: n(out.x), y: n(out.y), w: n(out.w), h: n(out.h) } : { trovato: false });
    } catch (e) { return json({ trovato: false, errore: String(e?.message || e).slice(0, 200) }); }
  }
  if (mm[2] === 'log' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ag = ['editor', 'vfx', 'color', 'audio', 'sottotitoli', 'revisore', 'motore', 'caroselli'].includes(d.agente) ? d.agente : 'motore';
    await log(env, id, ag, String(d.messaggio || '').slice(0, 300), d.livello === 'warn' ? 'warn' : 'info');
    await run(env, 'UPDATE lavori SET motore_visto=? WHERE id=?', ora(), id);
    return json({ ok: true });
  }
  if ((mm[2] === 'video' || mm[2] === 'anteprima' || mm[2] === 'copertina' || /^proxy-\d+$/.test(mm[2])) && m === 'POST') {
    if (!env.VIDEO) return json({ errore: 'archivio video non collegato' }, 500);
    const lunghezza = Number(req.headers.get('content-length') || 0);
    // archivio: KV (max 25 MB a file: un reel a 1080p di 30-60 s sta sui 10-20 MB)
    if (!lunghezza || lunghezza > 25 * 1024 * 1024) return json({ errore: `file di ${Math.round(lunghezza / 1048576)} MB: oltre il limite di 25 MB` }, 400);
    const chiave = `lavoro-${id}/${mm[2] === 'video' ? 'reel.mp4' : mm[2].startsWith('proxy-') ? mm[2] + '.mp4' : mm[2] + '.jpg'}`;
    const tipo = mm[2] === 'video' || mm[2].startsWith('proxy-') ? 'video/mp4' : 'image/jpeg';
    // master oltre 20 MB: arriva a pezzi (parte 0 = chiave principale con i dati del file intero)
    const parte = Number(url.searchParams.get('parte') || 0), parti = Number(url.searchParams.get('parti') || 1);
    const k = parte ? `${chiave}#${parte}` : chiave;
    await env.VIDEO.put(k, await req.arrayBuffer(), { metadata: parte ? { tipo } : { tipo, parti, totale: Number(url.searchParams.get('totale') || lunghezza), parte_mb: 20 } });
    return json({ ok: true, chiave, parte, parti });
  }
  if (mm[2] === 'esito' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const mont = J(L.montaggio, {});
    if (d.errore) {
      mont.tentativi = (mont.tentativi || 0) + 1;
      mont.errore = String(d.errore).slice(0, 500);
      mont.stato = mont.tentativi < 2 ? 'da_fare' : 'errore';
      await log(env, id, 'editor', `montaggio non riuscito: ${mont.errore.slice(0, 200)}${mont.stato === 'da_fare' ? ' — riprovo' : ''}`, 'warn');
    } else {
      const foglio = d.revisore?.foglio;
      if (d.revisore) delete d.revisore.foglio;
      if (foglio && env.VIDEO) await env.VIDEO.put(`lavoro-${id}/qa.jpg`, Uint8Array.from(atob(foglio), (c) => c.charCodeAt(0)), { metadata: { tipo: 'image/jpeg' } }).catch(() => {});
      Object.assign(mont, { stato: 'fatto', qa: undefined, foglio: !!foglio, revisore: d.revisore || {}, video: `lavoro-${id}/reel.mp4`, anteprima: `lavoro-${id}/anteprima.jpg`, copertina: d.copertina ? `lavoro-${id}/copertina.jpg` : null, finito: ora() });
      delete mont.indicazioni_rimonta;
    }
    await run(env, 'UPDATE lavori SET montaggio=?, motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?', JSON.stringify(mont), ora(), id);
    return json({ ok: true });
  }

  // logo del cliente per la chiusura (salvato nell'archivio dalla Regia)
  if (mm[2] === 'logo' && m === 'GET') {
    const lg = J(L.montaggio, {})?.piano?.logo || {};
    if (lg.archivio && env.ARCHIVIO) return servi(env, req, lg.archivio);
    const chiave = lg.kv;
    const dati = chiave ? await env.VIDEO.get(chiave, 'arrayBuffer') : null;
    if (!dati) return json({ errore: 'logo non trovato' }, 404);
    return new Response(dati, { headers: { 'content-type': 'image/png' } });
  }

  // scaricamento dei video Apify (servono il token, che resta qui)
  if (mm[2] === 'scarica' && m === 'GET') {
    if (!el?.video?.video_url) return json({ errore: 'niente da scaricare' }, 404);
    const cfg = await configurazione(env);
    const r = await fetch(el.video.video_url, { headers: { authorization: `Bearer ${cfg.APIFY_TOKEN}` } });
    return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'video/mp4', ...(r.headers.get('content-length') ? { 'content-length': r.headers.get('content-length') } : {}) } });
  }

  // 2) arrivano misure + fotogrammi: Claude li guarda e scrive l'analisi
  if (mm[2] === 'elemento' && m === 'POST') {
    if (!el) return json({ errore: 'elemento sconosciuto' }, 400);
    const d = await req.json().catch(() => null);
    if (d?.misure?.tecnico?.tipo === 'musica' && tipo === 'clip') {
      const mis = d.misure;
      const analisi = { descrizione: `musica: ${Math.round(mis.tecnico.durata_sec)} s, ${mis.bpm || '?'} BPM`, musica: mis.musica, misure: {} };
      Object.assign(el, { stato: 'fatto', analisi, tecnico: { ...(el.tecnico || {}), ...mis.tecnico }, errore: undefined });
      await env.DB.prepare('INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)').bind(chiaveClip(el), JSON.stringify({ analisi, tecnico: el.tecnico }), ora()).run();
      await aggiorna(env, id, tipo, indice, el);
      await log(env, id, 'audio', `🎵 musica ascoltata: ${el.nome} — ${Math.round(mis.tecnico.durata_sec)} s, ${mis.musica?.bpm || '?'} BPM, la parte forte entra a ${mis.musica?.entrata ?? '?'} s`);
      return json({ ok: true });
    }
    if (!d?.misure || !Array.isArray(d.immagini) || !d.immagini.length) return json({ errore: 'dati mancanti' }, 400);
    const rif = tipo === 'riferimenti';
    const agente = rif ? 'occhi' : 'analista';
    const cfg = chi(await configurazione(env), { area: 'reel', lavoro_id: Number(id) || null, agente });
    const mis = d.misure;
    await log(env, id, agente, `sto guardando ${rif ? el.video.piattaforma + ' · ' + (el.video.titolo || el.video.url).slice(0, 50) : el.nome} (${mis.tecnico?.tipo === 'immagine' ? 'foto ' + (mis.tecnico?.risoluzione || '') : `${mis.tecnico?.risoluzione || '?'} · ${mis.tecnico?.fps || '?'} fps · ${mis.numero_tagli} tagli${mis.bpm_stimato ? ' · ' + mis.bpm_stimato + ' BPM' : ''}`})`);
    try {
      const sistema = rif ? analisiRiferimento(J(L.piano, {}).settore || '') : analisiClip(L.prompt);
      const testo = `MISURE ESATTE (ffmpeg + Whisper):\n${JSON.stringify(mis)}\n\nRispondi SOLO con il JSON richiesto.`;
      // reel di riferimento = video pubblici: li guarda Gemini col piano gratuito (zero costi); Claude solo se Gemini non risponde.
      // Le clip dei CLIENTI restano a Claude: il piano gratuito di Gemini usa i dati per addestrarsi.
      let analisi = null;
      if (rif && cfg.GEMINI_API_KEY) {
        try { analisi = await S.geminiVisione(cfg, sistema, testo, d.immagini.slice(0, 3)); } catch (e) { await log(env, id, agente, 'Gemini gratuito non disponibile (' + String(e.message).slice(0, 80) + '): uso Claude', 'warn'); }
      }
      if (!analisi) analisi = await S.claudeVisione(cfg, rif ? cfg.CLAUDE_MODEL : cfg.CLAUDE_MODEL_LIGHT, sistema, testo, d.immagini.slice(0, 3), rif ? 7000 : 7000);
      if (rif) { // i numeri misurati vincono sempre sulle stime
        Object.assign(analisi, { numero_tagli: mis.numero_tagli, durata_media_inquadratura_sec: mis.durata_media_inquadratura_sec, durata_sec: mis.tecnico?.durata_sec });
        analisi.audio = { ...(analisi.audio || {}), bpm_stimato: mis.bpm_stimato ?? analisi.audio?.bpm_stimato ?? null, volume_lufs: mis.volume_lufs };
        analisi.misure = { tagli_sec: mis.tagli_sec, piu_breve: mis.inquadratura_piu_breve_sec, piu_lunga: mis.inquadratura_piu_lunga_sec, tagli_sul_beat_indice: mis.tagli_sul_beat_indice, parlato: mis.parlato };
        Object.assign(el, { stato: 'fatto', analisi, errore: undefined });
        await env.DB.prepare('INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)').bind(chiaveRif(el.video), JSON.stringify(analisi), ora()).run();
      } else {
        analisi.misure = { qualita: mis.qualita_fotogrammi, movimento: mis.movimento_tra_fotogrammi, tagli_interni_sec: mis.tagli_sec, volume_lufs: mis.volume_lufs, parlato: mis.parlato, occhio: mis.occhio };
        Object.assign(el, { stato: 'fatto', analisi, tecnico: { ...(el.tecnico || {}), ...mis.tecnico }, errore: undefined });
        await env.DB.prepare('INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)').bind(chiaveClip(el), JSON.stringify({ analisi, tecnico: el.tecnico }), ora()).run();
      }
      await aggiorna(env, id, tipo, indice, el);
      await log(env, id, agente, `guardato: ${rif ? el.video.piattaforma : el.nome} — ${String(rif ? analisi.perche_funziona || analisi.gancio?.cosa_succede : analisi.descrizione || '').slice(0, 130)}`);
      return json({ ok: true, uso: analisi._uso });
    } catch (e) {
      const errore = String(e?.message || e).slice(0, 300);
      if (errore.startsWith('LIMITE_CLAUDE')) { // non è colpa del video: resta da guardare e il motore si ferma
        await log(env, id, agente, '⏸ Claude ha rifiutato per limite o credito esaurito: riprendo più tardi. ' + errore.slice(15, 160), 'warn');
        return json({ errore }, 429);
      }
      el.tentativi = (el.tentativi || 0) + 1;
      el.errore = errore;
      el.stato = el.tentativi < 3 ? 'da_guardare' : 'saltato';
      await aggiorna(env, id, tipo, indice, el);
      await log(env, id, agente, `${nome(el)}: ${errore}${el.stato === 'saltato' ? ' — saltato' : ` — riprovo (${el.tentativi}/3)`}`, 'warn');
      return json({ errore }, 502);
    }
  }

  // 3) il motore non è riuscito a scaricare/misurare un video
  if (mm[2] === 'errore' && m === 'POST') {
    if (!el) return json({ errore: 'elemento sconosciuto' }, 400);
    const d = await req.json().catch(() => ({}));
    el.tentativi = (el.tentativi || 0) + 1;
    el.errore = String(d.errore || 'errore del motore').slice(0, 300);
    // un video che non si scarica (es. YouTube che blocca) è inutile riprovarlo 3 volte
    el.stato = el.tentativi < 3 && !/YouTube non ha lasciato|HTTP 4\d\d/.test(el.errore) ? 'da_guardare' : 'saltato';
    await aggiorna(env, id, tipo, indice, el);
    await log(env, id, 'motore', `${nome(el)}: ${el.errore}${el.stato === 'saltato' ? ' — saltato' : ' — riprovo'}`, 'warn');
    return json({ ok: true });
  }

  // 4) giro finito: libera il lavoro (se restano elementi da riprovare, il prossimo giro li riprende)
  if (mm[2] === 'fine' && m === 'POST') {
    if ((await req.json().catch(() => ({}))).silenzioso) {
      // il motore ci ha già provato due volte in questo giro: il lavoro aspetta 20 minuti (così non blocca la coda degli
      // altri), gli elementi ancora da guardare contano un tentativo e al terzo vengono saltati
      let saltati = 0;
      for (const [i, x] of elenco.entries()) {
        if (x.stato !== 'da_guardare') continue;
        x.tentativi = (x.tentativi || 0) + 1;
        if (x.tentativi >= 3) { x.stato = 'saltato'; x.errore = x.errore || 'il motore non riesce a leggerlo (file danneggiato o troppo grande)'; saltati++; }
        await aggiorna(env, id, tipo, i, x);
      }
      await run(env, 'UPDATE lavori SET motore_pass=NULL, motore_fino=?, motore_visto=? WHERE id=?', new Date(Date.now() + 20 * 60e3).toISOString(), ora(), id);
      if (saltati) await log(env, id, 'motore', `${saltati} ${tipo === 'riferimenti' ? 'reel' : 'clip'} saltati: il motore non riesce a leggerli dopo 3 tentativi`, 'warn');
      return json({ ok: true });
    }
    await run(env, 'UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?', ora(), id);
    const fatti = elenco.filter((x) => x.stato === 'fatto').length;
    await log(env, id, 'motore', `giro del motore finito: ${fatti}/${elenco.length} ${tipo === 'riferimenti' ? 'reel' : 'clip'} analizzati`);
    return json({ ok: true });
  }
  return json({ errore: 'metodo non consentito' }, 405);
}
