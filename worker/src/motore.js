// Motore su GitHub Actions (repo johnhant91/momento-montaggio): si presenta con l'identità OIDC firmata da GitHub,
// prende le clip da preparare, le scarica da pCloud, ne fa una copia leggera 720p con ffmpeg e la manda qui.
// La regia la passa a Gemini (la chiave resta su Cloudflare: su GitHub non c'è nessuna chiave).
import { J, log, one, ora, run, configurazione } from './db.js';
import { analisiClip, chiaveClip } from './lavoro.js';
import * as S from './servizi.js';

const REPO = 'johnhant91/momento-montaggio';
const AUD = 'momento-reel';
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

// aggiorna UNA clip dentro l'elenco (json_set è atomico: le risposte in parallelo non si pestano i piedi)
async function aggiornaClip(env, id, indice, clip) {
  await run(env, 'UPDATE lavori SET clip=json_set(clip, ?, json(?)), motore_visto=? WHERE id=?', `$[${Math.trunc(indice)}]`, JSON.stringify(clip), ora(), id);
}

export async function motoreApi(req, env, url) {
  const p = url.pathname, m = req.method;

  // 1) il motore chiede lavoro
  if (p === '/api/motore/prossimo' && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    const adesso = ora();
    const pass = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const L = await one(env, `UPDATE lavori SET motore_pass=?, motore_fino=?, motore_visto=? WHERE id = (
        SELECT id FROM lavori WHERE stato='in_corso' AND fase='clip' AND clip IS NOT NULL
          AND EXISTS (SELECT 1 FROM json_each(lavori.clip) WHERE json_extract(value, '$.stato')='da_guardare')
          AND (motore_fino IS NULL OR motore_fino < ?) ORDER BY id LIMIT 1)
      RETURNING id, prompt, pcloud, clip`, pass, new Date(Date.now() + 50 * 60e3).toISOString(), adesso, adesso);
    if (!L) return new Response(null, { status: 204 });
    const clip = J(L.clip, []).map((c, i) => ({ indice: i, fileid: c.fileid, nome: c.nome, dimensione: c.dimensione, tentativi: c.tentativi || 0, stato: c.stato }))
      .filter((c) => c.stato === 'da_guardare');
    await log(env, L.id, 'motore', `⚙️ motore GitHub al lavoro: ${clip.length} clip da scaricare e alleggerire`);
    return json({ id: L.id, pass, pcloud_code: codice(L.pcloud), pcloud_eu: /(^|\/\/)e\.|eapi/.test(L.pcloud), clip });
  }

  const mm = p.match(/^\/api\/motore\/(\d+)\/(clip|errore|fine)$/);
  if (!mm) return json({ errore: 'non trovato' }, 404);
  const id = Number(mm[1]);
  const L = await one(env, 'SELECT id, prompt, clip, motore_pass, motore_fino, stato FROM lavori WHERE id=?', id);
  const pass = req.headers.get('x-pass') || '';
  if (!L || !L.motore_pass || pass.length < 32 || pass !== L.motore_pass) return json({ errore: 'lasciapassare non valido' }, 403);
  const clip = J(L.clip, []);
  const indice = Number(url.searchParams.get('i'));
  const c = clip[indice];

  // 2) arriva la copia leggera di una clip: la regia la passa a Gemini (Ada) e salva l'analisi
  if (mm[2] === 'clip' && m === 'POST') {
    if (!c) return json({ errore: 'clip sconosciuta' }, 400);
    const lunghezza = Number(req.headers.get('content-length') || 0);
    if (!lunghezza || lunghezza > 400 * 1024 * 1024) return json({ errore: 'dimensione non valida' }, 400);
    let tecnico = {};
    try { tecnico = JSON.parse(decodeURIComponent(req.headers.get('x-tecnico') || '{}')); } catch {}
    const cfg = await configurazione(env);
    c.tecnico = { ...(c.tecnico || {}), ...tecnico };
    await log(env, id, 'analista', `sto guardando ${c.nome} (${c.tecnico.risoluzione || '?'} · ${c.tecnico.fps || '?'} fps · ${c.tecnico.durata_sec || '?'} s)`);
    try {
      const { readable, writable } = new FixedLengthStream(lunghezza);
      req.body.pipeTo(writable).catch(() => {});
      const analisi = await S.guardaCorpo(cfg, readable, lunghezza, c.nome, analisiClip(L.prompt), 1);
      Object.assign(c, { stato: 'fatto', analisi, errore: undefined });
      await env.DB.prepare('INSERT OR REPLACE INTO cache_analisi (chiave, dati, quando) VALUES (?,?,?)').bind(chiaveClip(c), JSON.stringify({ analisi, tecnico: c.tecnico }), ora()).run();
      await aggiornaClip(env, id, indice, c);
      await log(env, id, 'analista', `guardata: ${c.nome} — ${String(analisi.descrizione || '').slice(0, 120)}`);
      return json({ ok: true });
    } catch (e) {
      const errore = String(e?.message || e).slice(0, 300);
      if (errore.startsWith('QUOTA_GEMINI')) { // non è colpa della clip: resta da guardare, il motore si ferma e riprova più tardi
        await log(env, id, 'analista', errore.replace('QUOTA_GEMINI: ', '⏸ '), 'warn');
        return json({ errore, quota: true }, 429);
      }
      c.tentativi = (c.tentativi || 0) + 1;
      c.errore = errore;
      c.stato = c.tentativi < 3 && !/manca la chiave/.test(errore) ? 'da_guardare' : 'saltato';
      await aggiornaClip(env, id, indice, c);
      await log(env, id, 'analista', `${c.nome}: ${errore}${c.stato === 'saltato' ? ' — saltata' : ` — riprovo (${c.tentativi}/3)`}`, 'warn');
      return json({ errore }, 502);
    }
  }

  // 3) il motore non è riuscito a scaricare/convertire una clip
  if (mm[2] === 'errore' && m === 'POST') {
    if (!c) return json({ errore: 'clip sconosciuta' }, 400);
    const d = await req.json().catch(() => ({}));
    c.tentativi = (c.tentativi || 0) + 1;
    c.errore = String(d.errore || 'errore del motore').slice(0, 300);
    c.stato = c.tentativi < 3 ? 'da_guardare' : 'saltato';
    await aggiornaClip(env, id, indice, c);
    await log(env, id, 'motore', `${c.nome}: ${c.errore}${c.stato === 'saltato' ? ' — saltata' : ' — riprovo'}`, 'warn');
    return json({ ok: true });
  }

  // 4) giro finito: libera il lavoro (se restano clip da riprovare, il prossimo giro le riprende)
  if (mm[2] === 'fine' && m === 'POST') {
    await run(env, 'UPDATE lavori SET motore_pass=NULL, motore_fino=NULL, motore_visto=? WHERE id=?', ora(), id);
    const fatte = clip.filter((x) => x.stato === 'fatto').length;
    await log(env, id, 'motore', `giro del motore finito: ${fatte}/${clip.length} clip guardate da Ada`);
    return json({ ok: true });
  }
  return json({ errore: 'metodo non consentito' }, 405);
}
