// IMPORTAZIONE DA PCLOUD → ARCHIVIO. Il motore GitHub copia le cartelle pCloud nell'archivio R2 a velocità da data center
// (non usa la connessione di Johnny). La regia prepara l'elenco, GitHub scarica da pCloud e carica qui a pezzi da 50 MB.
import { J, all, one, ora, run, configurazione } from './db.js';
import { pcloudApi } from './servizi.js';
import { pulisci, schemaArchivio, tipoFile } from './archivio.js';

const UTILI = /\.(mp4|mov|m4v|mxf|avi|mkv|webm|mts|jpe?g|png|webp|heic|heif|tiff?|dng|cr2|cr3|nef|arw|raf|orf|rw2|mp3|m4a|wav|aac|flac|ogg|psd|ai|svg|pdf|cube|lut|aep|prproj|zip)$/i;

export async function schemaImporta(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS importazioni (id INTEGER PRIMARY KEY AUTOINCREMENT, link TEXT, cartella TEXT, stato TEXT DEFAULT 'da_fare',
    file TEXT, totale INTEGER DEFAULT 0, errore TEXT, pass TEXT, fino TEXT, creato TEXT, aggiornato TEXT)`).run();
}

async function sveglia(env, id) {
  const cfg = await configurazione(env);
  if (!cfg.GITHUB_TOKEN) return false;
  const r = await fetch('https://api.github.com/repos/JohnHant91/momento-montaggio/actions/workflows/importa.yml/dispatches', {
    method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { importazione: String(id) } }),
    headers: { authorization: `Bearer ${cfg.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'momento-reel', 'x-github-api-version': '2022-11-28' },
  });
  return r.status === 204;
}

const riassunto = (I) => { const F = J(I.file, []); const fatti = F.filter((f) => f.stato === 'fatto');
  return { id: I.id, cartella: I.cartella, stato: I.stato, errore: I.errore, creato: I.creato, aggiornato: I.aggiornato, file: F.length, fatti: fatti.length,
    saltati: F.filter((f) => f.stato === 'saltato').length, errori: F.filter((f) => f.stato === 'errore').length,
    totale: I.totale, copiati: fatti.reduce((s, f) => s + (f.dimensione || 0), 0) }; };

// API dell'app (dietro l'accesso)
export async function apiImporta(req, env, p, m, json) {
  if (!p.startsWith('/api/archivio/importa')) return null;
  await schemaArchivio(env); await schemaImporta(env);
  const url = new URL(req.url);
  if (p === '/api/archivio/importa' && m === 'POST') {
    if (!env.ARCHIVIO) return json({ errore: 'archivio non collegato' }, 503);
    const d = await req.json().catch(() => ({}));
    const link = String(d.link || '').trim(), cartella = pulisci(d.cartella);
    if (!/code=/.test(link)) return json({ errore: 'serve il link pubblico della cartella pCloud (contiene "code=")' }, 400);
    if (!cartella) return json({ errore: 'scegli la cartella dell’archivio in cui copiare' }, 400);
    const meta = (await pcloudApi(link, 'showpublink', {})).metadata;
    const file = [];
    const visita = (x, rel) => {
      if (x.isfolder) { (x.contents || []).forEach((c) => visita(c, rel === null ? '' : (rel ? rel + '/' : '') + x.name)); return; }
      if (!UTILI.test(x.name) || /^\./.test(x.name)) return;
      file.push({ fileid: x.fileid, nome: x.name, rel: (rel ? rel + '/' : '') + x.name, dimensione: x.size || 0 });
    };
    if (meta.isfolder) visita(meta, null); else visita(meta, '');
    if (!file.length) return json({ errore: 'nella cartella pCloud non ci sono clip, foto, musica o grafiche' }, 400);
    // i file già presenti (stesso percorso e stesso peso) non si ricopiano
    for (const f of file) {
      const g = await one(env, 'SELECT dimensione FROM archivio WHERE percorso=?', pulisci(cartella + '/' + f.rel));
      f.stato = g && Number(g.dimensione) === Number(f.dimensione) ? 'saltato' : 'da_fare';
    }
    const totale = file.reduce((s, f) => s + f.dimensione, 0);
    const r = await one(env, "INSERT INTO importazioni (link, cartella, stato, file, totale, creato, aggiornato) VALUES (?,?,?,?,?,?,?) RETURNING id",
      link, cartella, file.some((f) => f.stato === 'da_fare') ? 'da_fare' : 'fatto', JSON.stringify(file), totale, ora(), ora());
    const partito = file.some((f) => f.stato === 'da_fare') ? await sveglia(env, r.id) : true;
    return json({ id: r.id, file: file.length, saltati: file.filter((f) => f.stato === 'saltato').length, gb: Math.round(totale / 1073741824 * 10) / 10, partito });
  }
  if (p === '/api/archivio/importazioni' && m === 'GET') {
    const c = pulisci(url.searchParams.get('cartella'));
    const L = await all(env, 'SELECT * FROM importazioni WHERE (? = \'\' OR cartella = ? OR (cartella >= ? AND cartella < ?)) ORDER BY id DESC LIMIT 10', c, c, c + '/', c + '0');
    return json(L.map(riassunto));
  }
  const ri = p.match(/^\/api\/archivio\/importa\/(\d+)\/(riprova|annulla)$/);
  if (ri && m === 'POST') {
    const I = await one(env, 'SELECT * FROM importazioni WHERE id=?', ri[1]);
    if (!I) return json({ errore: 'non trovata' }, 404);
    if (ri[2] === 'annulla') { await run(env, "UPDATE importazioni SET stato='annullata', aggiornato=? WHERE id=?", ora(), I.id); return json({ ok: true }); }
    const F = J(I.file, []).map((f) => f.stato === 'errore' || f.stato === 'in_corso' ? { ...f, stato: 'da_fare', errore: null } : f);
    await run(env, "UPDATE importazioni SET file=?, stato='da_fare', errore=NULL, fino=NULL, aggiornato=? WHERE id=?", JSON.stringify(F), ora(), I.id);
    return json({ ok: true, partito: await sveglia(env, I.id) });
  }
  return null;
}

// API del motore GitHub: si presenta con l'identità OIDC per prendere il lavoro, poi usa il lasciapassare
export async function motoreImporta(req, env, p, m, json, identitaGitHub) {
  if (!p.startsWith('/api/motore/importa')) return null;
  await schemaImporta(env);
  const url = new URL(req.url);
  if (p === '/api/motore/importa/prendi' && m === 'POST') {
    if (!(await identitaGitHub(req.headers.get('authorization')))) return json({ errore: 'motore non riconosciuto' }, 401);
    const id = Number(url.searchParams.get('id')) || 0;
    const pass = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const I = await one(env, `UPDATE importazioni SET stato='in_corso', pass=?, fino=?, aggiornato=? WHERE id = (SELECT id FROM importazioni
      WHERE stato IN ('da_fare','in_corso') AND (fino IS NULL OR fino < ?) AND (?=0 OR id=?) ORDER BY id LIMIT 1) RETURNING *`, pass, new Date(Date.now() + 30 * 60e3).toISOString(), ora(), ora(), id, id);
    if (!I) return new Response(null, { status: 204 });
    const code = new URL(I.link).searchParams.get('code');
    return json({ id: I.id, pass, pcloud_code: code, pcloud_eu: /(^|\/\/)e\.|eapi/.test(I.link), file: J(I.file, []).map((f, i) => ({ i, ...f })).filter((f) => f.stato !== 'fatto' && f.stato !== 'saltato') });
  }
  const mm = p.match(/^\/api\/motore\/importa\/(\d+)\/(inizio|parte|fine|esito|vivo)$/);
  if (!mm) return json({ errore: 'non trovato' }, 404);
  const I = await one(env, 'SELECT * FROM importazioni WHERE id=?', mm[1]);
  const pass = req.headers.get('x-pass') || '';
  if (!I || !I.pass || pass.length < 32 || pass !== I.pass) return json({ errore: 'lasciapassare non valido' }, 403);
  if (I.stato === 'annullata') return json({ errore: 'annullata', stop: true }, 409);
  const F = J(I.file, []);
  const i = Number(url.searchParams.get('i'));
  const f = F[i];
  const dest = f ? pulisci(I.cartella + '/' + f.rel) : null;
  const segna = async (cambi) => {
    // rilegge e scrive: più file avanzano insieme
    const ora_ = await one(env, 'SELECT file FROM importazioni WHERE id=?', I.id); const G = J(ora_.file, []); Object.assign(G[i], cambi);
    const fine = G.every((x) => ['fatto', 'saltato', 'errore'].includes(x.stato));
    await run(env, 'UPDATE importazioni SET file=?, stato=?, fino=?, aggiornato=? WHERE id=?', JSON.stringify(G),
      fine ? (G.some((x) => x.stato === 'errore') ? 'errore' : 'fatto') : 'in_corso', fine ? null : new Date(Date.now() + 30 * 60e3).toISOString(), ora(), I.id);
  };
  if (mm[2] === 'vivo' && m === 'POST') { await run(env, 'UPDATE importazioni SET fino=?, aggiornato=? WHERE id=?', new Date(Date.now() + 30 * 60e3).toISOString(), ora(), I.id); return json({ ok: true }); }
  if (!f) return json({ errore: 'file non trovato' }, 404);
  if (mm[2] === 'inizio' && m === 'POST') {
    const u = await env.ARCHIVIO.createMultipartUpload(dest, { httpMetadata: { contentType: mimeDi(f.nome) } });
    await segna({ stato: 'in_corso' });
    return json({ upload: u.uploadId, parte_mb: 50 });
  }
  if (mm[2] === 'parte' && m === 'PUT') {
    const parte = await env.ARCHIVIO.resumeMultipartUpload(dest, url.searchParams.get('u')).uploadPart(Number(url.searchParams.get('n')), req.body);
    return json({ n: parte.partNumber, etag: parte.etag });
  }
  if (mm[2] === 'fine' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const o = await env.ARCHIVIO.resumeMultipartUpload(dest, d.upload).complete((d.parti || []).map((x) => ({ partNumber: Number(x.n), etag: String(x.etag) })));
    const pezzi = dest.split('/');
    for (let k = 1; k < pezzi.length; k++) { const q = pezzi.slice(0, k).join('/'); await run(env, "INSERT OR IGNORE INTO archivio (percorso, cartella, nome, tipo, creato) VALUES (?,?,?,'cartella',?)", q, pezzi.slice(0, k - 1).join('/'), pezzi[k - 1], ora()); }
    await run(env, `INSERT INTO archivio (percorso, cartella, nome, tipo, dimensione, etag, mime, creato) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(percorso) DO UPDATE SET dimensione=excluded.dimensione, etag=excluded.etag, mime=excluded.mime, creato=excluded.creato`,
    dest, pezzi.slice(0, -1).join('/'), pezzi[pezzi.length - 1], tipoFile(dest), o.size || f.dimensione, o.etag || '', mimeDi(f.nome), ora());
    await segna({ stato: 'fatto', errore: null });
    return json({ ok: true });
  }
  if (mm[2] === 'esito' && m === 'POST') { // errore su un file
    const d = await req.json().catch(() => ({}));
    if (d.upload) { try { await env.ARCHIVIO.resumeMultipartUpload(dest, d.upload).abort(); } catch (_) {} }
    await segna({ stato: 'errore', errore: String(d.errore || 'errore').slice(0, 200) });
    return json({ ok: true });
  }
  return json({ errore: 'non trovato' }, 404);
}

const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', pdf: 'application/pdf', svg: 'image/svg+xml' };
const mimeDi = (n) => MIME[(n.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
