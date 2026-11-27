// CALENDARIO "Cosa esce": i contenuti pronti (reel e caroselli) si trascinano su un giorno; si vedono la settimana e la prossima.
import { J, all, one, ora, run } from './db.js';

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoCalendario;
export function schemaCalendario(env) { return (_fattoCalendario ||= _schemaCalendario(env).catch((e) => { _fattoCalendario = null; throw e; })); }
async function _schemaCalendario(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS uscite (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, rif INTEGER NOT NULL, n INTEGER DEFAULT 0,
    data TEXT NOT NULL, ora TEXT, creato TEXT, UNIQUE(tipo, rif, n))`).run();
}

export async function apiCalendario(req, env, p, m, json) {
  if (!p.startsWith('/api/calendario')) return null;
  await schemaCalendario(env);
  if (p === '/api/calendario' && m === 'GET') {
    const U = await all(env, 'SELECT * FROM uscite');
    const fissata = (tipo, rif, n = 0) => U.find((u) => u.tipo === tipo && u.rif === rif && (u.n || 0) === n) || null;
    const voci = [];
    // reel
    const R = await all(env, "SELECT id, prompt, stato, fase, approvato, aggiornato, json_extract(scheda, '$.titolo_lavoro') AS titolo, json_extract(montaggio, '$.copertina') AS copertina, json_extract(montaggio, '$.stato') AS mstato FROM lavori ORDER BY id DESC LIMIT 80");
    for (const l of R) {
      const pronto = l.stato === 'pronto';
      const u = fissata('reel', l.id);
      voci.push({ tipo: 'reel', rif: l.id, n: 0, titolo: l.titolo || String(l.prompt || '').slice(0, 60), link: '#/lavoro/' + l.id,
        img: l.copertina ? `/api/lavori/${l.id}/copertina.jpg` : null, stato: pronto ? (l.approvato ? 'approvato' : 'da_approvare') : l.stato === 'errore' ? 'errore' : l.stato === 'pausa' ? 'pausa' : 'in_lavorazione',
        fase: l.fase, data: u?.data || null, ora: u?.ora || null });
    }
    // caroselli e post (uno per contenuto)
    const P = await all(env, "SELECT id, cliente, stato, fase, contenuti, slide_file FROM post_lavori ORDER BY id DESC LIMIT 40").catch(() => []);
    for (const q of P) {
      const Ct = J(q.contenuti, {}), file = J(q.slide_file, {}) || {};
      const post = (Ct.post || []).filter((x) => x.stato !== 'scartato');
      if (!post.length) { voci.push({ tipo: 'post', rif: q.id, n: 0, titolo: (q.cliente || 'Caroselli') + ' · in lavorazione', link: '#/post/' + q.id, img: null, stato: 'in_lavorazione', data: null }); continue; }
      for (const x of post) {
        const u = fissata('post', q.id, x.n);
        const pronta = file[`post-${q.id}/${x.n}-1.png`];
        voci.push({ tipo: 'post', rif: q.id, n: x.n, titolo: x.titolo || 'Carosello', cliente: q.cliente, link: '#/post/' + q.id, img: pronta ? `/api/post/${q.id}/slide/${x.n}-1.png` : null,
          stato: x.ig_id ? 'programmato' : pronta ? (q.stato === 'da_vedere' ? 'da_approvare' : 'approvato') : q.stato === 'da_approvare' ? 'da_approvare' : 'in_lavorazione', data: u?.data || (x.ig_quando ? x.ig_quando.slice(0, 10) : null), ora: u?.ora || null });
      }
    }
    // contenuti del calendario dell'agenzia (post scritti dagli agenti con una data)
    const C = await all(env, "SELECT c.id, c.titolo, c.tipo, c.data, c.ora, c.stato, k.nome AS cliente FROM contenuti c LEFT JOIN clienti k ON k.id=c.cliente_id WHERE c.stato != 'scartato' AND c.data IS NOT NULL ORDER BY c.data DESC LIMIT 80").catch(() => []);
    for (const c of C) voci.push({ tipo: 'contenuto', rif: c.id, n: 0, titolo: c.titolo || c.tipo, cliente: c.cliente, link: '#/approvazioni', img: null, stato: c.stato, data: c.data, ora: c.ora, fisso: true });
    return json({ oggi: ora().slice(0, 10), voci });
  }
  if (p === '/api/calendario' && m === 'POST') { // {tipo, rif, n, data|null, ora}
    const d = await req.json().catch(() => ({}));
    if (!['reel', 'post'].includes(d.tipo) || !Number(d.rif)) return json({ errore: 'contenuto non valido' }, 400);
    if (!d.data) { await run(env, 'DELETE FROM uscite WHERE tipo=? AND rif=? AND n=?', d.tipo, Number(d.rif), Number(d.n) || 0); return json({ ok: true }); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return json({ errore: 'data non valida' }, 400);
    await run(env, `INSERT INTO uscite (tipo, rif, n, data, ora, creato) VALUES (?,?,?,?,?,?) ON CONFLICT(tipo, rif, n) DO UPDATE SET data=excluded.data, ora=excluded.ora`,
      d.tipo, Number(d.rif), Number(d.n) || 0, d.data, /^\d{2}:\d{2}$/.test(d.ora || '') ? d.ora : null, ora());
    return json({ ok: true });
  }
  return null;
}
