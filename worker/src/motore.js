// Motore "occhi" su GitHub Actions (repo johnhant91/momento-montaggio). Si presenta con l'identità OIDC firmata da GitHub,
// prende i video da guardare (reel di riferimento o clip pCloud), li misura (ffmpeg, Whisper) ed estrae i fotogrammi chiave.
// La regia manda misure + fotogrammi a Claude (la chiave resta su Cloudflare: su GitHub non c'è nessuna chiave).
import { J, log, one, ora, run, configurazione } from './db.js';
import { analisiClip, analisiRiferimento, chiaveClip, chiaveRif } from './lavoro.js';
import * as S from './servizi.js';

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

const codice = (link) => { try { return new URL(link).searchParams.get('code'); } catch { return null; } };

// aggiorna UN elemento dentro l'elenco (json_set è atomico: le risposte in parallelo non si pestano i piedi)
async function aggiorna(env, id, colonna, indice, el) {
  await run(env, `UPDATE lavori SET ${colonna}=json_set(${colonna}, ?, json(?)), motore_visto=? WHERE id=?`, `$[${Math.trunc(indice)}]`, JSON.stringify(el), ora(), id);
}

const PENDENTE = (col) => `EXISTS (SELECT 1 FROM json_each(lavori.${col}) WHERE json_extract(value, '$.stato')='da_guardare')`;

export async function motoreApi(req, env, url) {
  const p = url.pathname, m = req.method;

  // 0) c'è qualcosa da guardare? (solo sì/no, senza dettagli: serve al motore per non installare niente se non serve)
  if (p === '/api/motore/coda' && m === 'GET') {
    const r = await one(env, `SELECT COUNT(*) AS n FROM lavori WHERE stato='in_corso' AND (
      (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE('riferimenti')}) OR (fase='clip' AND clip IS NOT NULL AND ${PENDENTE('clip')}) OR
      (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))`);
    return json({ lavoro: (r?.n || 0) > 0 });
  }

  // 1) il motore chiede lavoro
  if (p === '/api/motore/prossimo' && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    const adesso = ora();
    const pass = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const L = await one(env, `UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND (motore_fino IS NULL OR motore_fino < ?) AND (
          (fase='riferimenti' AND riferimenti IS NOT NULL AND ${PENDENTE('riferimenti')}) OR
          (fase='clip' AND clip IS NOT NULL AND ${PENDENTE('clip')}) OR
          (fase='montaggio' AND json_extract(montaggio, '$.stato')='da_fare'))
        ORDER BY id LIMIT 1)
      RETURNING id, fase, pcloud, riferimenti, clip, montaggio`, pass, new Date(Date.now() + 55 * 60e3).toISOString(), adesso, adesso);
    if (!L) return new Response(null, { status: 204 });
    const tipo = L.fase;
    if (tipo === 'montaggio') {
      const m = J(L.montaggio, {});
      await log(env, L.id, 'motore', `⚙️ motore GitHub al lavoro: scarico ${new Set(m.piano.segmenti.map((s) => s.fileid)).size} clip e monto il reel`);
      return json({ id: L.id, tipo, pass, pcloud_code: codice(L.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L.pcloud || ''), piano: m.piano });
    }
    const elenco = J(tipo === 'riferimenti' ? L.riferimenti : L.clip, []);
    const elementi = elenco.map((x, i) => [x, i]).filter(([x]) => x.stato === 'da_guardare').map(([x, i]) => tipo === 'riferimenti'
      ? { indice: i, nome: `${x.video.piattaforma} · ${(x.video.titolo || x.video.url || '').slice(0, 60)}`, url: x.video.url,
          // i file di Apify li scarica la regia (ha il token), il motore passa da qui
          video_url: x.video.video_url ? (x.video.video_url.includes('api.apify.com') ? `${url.origin}/api/motore/${L.id}/scarica?i=${i}&tipo=riferimenti&pass=${pass}` : x.video.video_url) : null }
      : { indice: i, nome: x.nome, fileid: x.sorgente?.tipo === 'pcloud' || !x.sorgente ? x.fileid : null, video_url: x.sorgente?.tipo === 'url' ? x.sorgente.url : null, dimensione: x.dimensione });
    await log(env, L.id, 'motore', `⚙️ motore GitHub al lavoro: ${elementi.length} ${tipo === 'riferimenti' ? 'reel da scaricare e misurare' : 'clip da scaricare e misurare'}`);
    return json({ id: L.id, tipo, pass, pcloud_code: codice(L.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L.pcloud || ''), elementi });
  }

  const mm = p.match(/^\/api\/motore\/(\d+)\/(elemento|errore|fine|scarica|log|video|anteprima|copertina|esito)$/);
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
  if (mm[2] === 'log' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ag = ['editor', 'vfx', 'color', 'audio', 'sottotitoli', 'revisore', 'motore'].includes(d.agente) ? d.agente : 'motore';
    await log(env, id, ag, String(d.messaggio || '').slice(0, 300), d.livello === 'warn' ? 'warn' : 'info');
    await run(env, 'UPDATE lavori SET motore_visto=? WHERE id=?', ora(), id);
    return json({ ok: true });
  }
  if ((mm[2] === 'video' || mm[2] === 'anteprima' || mm[2] === 'copertina') && m === 'POST') {
    if (!env.VIDEO) return json({ errore: 'archivio video non collegato' }, 500);
    const lunghezza = Number(req.headers.get('content-length') || 0);
    // archivio: KV (max 25 MB a file: un reel a 1080p di 30-60 s sta sui 10-20 MB)
    if (!lunghezza || lunghezza > 25 * 1024 * 1024) return json({ errore: `file di ${Math.round(lunghezza / 1048576)} MB: oltre il limite di 25 MB` }, 400);
    const chiave = `lavoro-${id}/${mm[2] === 'video' ? 'reel.mp4' : mm[2] + '.jpg'}`;
    await env.VIDEO.put(chiave, await req.arrayBuffer(), { metadata: { tipo: mm[2] === 'video' ? 'video/mp4' : 'image/jpeg' } });
    return json({ ok: true, chiave });
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
      Object.assign(mont, { stato: 'fatto', revisore: d.revisore || {}, video: `lavoro-${id}/reel.mp4`, anteprima: `lavoro-${id}/anteprima.jpg`, copertina: d.copertina ? `lavoro-${id}/copertina.jpg` : null, finito: ora() });
      delete mont.indicazioni_rimonta;
    }
    await run(env, 'UPDATE lavori SET montaggio=?, motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?', JSON.stringify(mont), ora(), id);
    return json({ ok: true });
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
    if (!d?.misure || !Array.isArray(d.immagini) || !d.immagini.length) return json({ errore: 'dati mancanti' }, 400);
    const cfg = await configurazione(env);
    const rif = tipo === 'riferimenti';
    const agente = rif ? 'occhi' : 'analista';
    const mis = d.misure;
    await log(env, id, agente, `sto guardando ${rif ? el.video.piattaforma + ' · ' + (el.video.titolo || el.video.url).slice(0, 50) : el.nome} (${mis.tecnico?.risoluzione || '?'} · ${mis.tecnico?.fps || '?'} fps · ${mis.numero_tagli} tagli${mis.bpm_stimato ? ' · ' + mis.bpm_stimato + ' BPM' : ''})`);
    try {
      const sistema = rif ? analisiRiferimento(J(L.piano, {}).settore || '') : analisiClip(L.prompt);
      const testo = `MISURE ESATTE (ffmpeg + Whisper):\n${JSON.stringify(mis)}\n\nRispondi SOLO con il JSON richiesto.`;
      const analisi = await S.claudeVisione(cfg, rif ? cfg.CLAUDE_MODEL : cfg.CLAUDE_MODEL_LIGHT, sistema, testo, d.immagini.slice(0, 3), rif ? 7000 : 7000);
      if (rif) { // i numeri misurati vincono sempre sulle stime
        Object.assign(analisi, { numero_tagli: mis.numero_tagli, durata_media_inquadratura_sec: mis.durata_media_inquadratura_sec, durata_sec: mis.tecnico?.durata_sec });
        analisi.audio = { ...(analisi.audio || {}), bpm_stimato: mis.bpm_stimato ?? analisi.audio?.bpm_stimato ?? null, volume_lufs: mis.volume_lufs };
        analisi.misure = { tagli_sec: mis.tagli_sec, piu_breve: mis.inquadratura_piu_breve_sec, piu_lunga: mis.inquadratura_piu_lunga_sec, tagli_sul_beat_indice: mis.tagli_sul_beat_indice, parlato: mis.parlato };
        Object.assign(el, { stato: 'fatto', analisi, errore: undefined });
        await env.DB.prepare('INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)').bind(chiaveRif(el.video), JSON.stringify(analisi), ora()).run();
      } else {
        analisi.misure = { qualita: mis.qualita_fotogrammi, movimento: mis.movimento_tra_fotogrammi, tagli_interni_sec: mis.tagli_sec, volume_lufs: mis.volume_lufs, parlato: mis.parlato };
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
    await run(env, 'UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?', ora(), id);
    if ((await req.json().catch(() => ({}))).silenzioso) return json({ ok: true });
    const fatti = elenco.filter((x) => x.stato === 'fatto').length;
    await log(env, id, 'motore', `giro del motore finito: ${fatti}/${elenco.length} ${tipo === 'riferimenti' ? 'reel' : 'clip'} analizzati`);
    return json({ ok: true });
  }
  return json({ errore: 'metodo non consentito' }, 405);
}
