// ARCHIVIO: lo stoccaggio interno dell'agenzia su Cloudflare R2 (binding ARCHIVIO).
// Cartelle per cliente e per progetto (Clienti/Torretta/Panettoni), più Musica, Grafiche, Loghi…
// I file stanno su R2, l'indice (cartelle, nomi, pesi) su D1 così le liste sono istantanee.
import { J, all, one, ora, run } from './db.js';

const VIDEO = /\.(mp4|mov|m4v|mxf|avi|mkv|webm|mts)$/i;
const FOTO = /\.(jpe?g|png|webp|heic|heif|tiff?|dng|cr2|cr3|nef|arw|raf|orf|rw2)$/i;
const AUDIO = /\.(mp3|m4a|wav|aac|flac|ogg)$/i;
export const tipoFile = (nome) => VIDEO.test(nome) ? 'video' : AUDIO.test(nome) ? 'musica' : FOTO.test(nome) ? 'immagine' : 'altro';
const PARTE_MB = 50; // ogni pezzo passa dal worker: 50 MB stanno larghi nel limite di 100 MB a richiesta

// percorsi puliti: niente "..", niente barre doppie, niente caratteri di controllo
export function pulisci(p) {
  const pezzi = String(p || '').normalize('NFC').split('/').map((x) => x.trim().replace(/[\u0000-\u001f\\]/g, '')).filter((x) => x && x !== '.' && x !== '..');
  return pezzi.join('/').slice(0, 500);
}
const padre = (p) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const nomeDi = (p) => p.slice(p.lastIndexOf('/') + 1);

export async function schemaArchivio(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS archivio (percorso TEXT PRIMARY KEY, cartella TEXT NOT NULL, nome TEXT NOT NULL, tipo TEXT NOT NULL,
    dimensione INTEGER DEFAULT 0, etag TEXT, mime TEXT, creato TEXT)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS archivio_cartella ON archivio(cartella)').run();
}

export async function creaCartella(env, p) {
  // crea anche le cartelle intermedie (Clienti, Clienti/Torretta…)
  const pezzi = p.split('/');
  for (let k = 1; k <= pezzi.length; k++) {
    const q = pezzi.slice(0, k).join('/');
    await run(env, "INSERT OR IGNORE INTO archivio (percorso, cartella, nome, tipo, creato) VALUES (?,?,?,'cartella',?)", q, padre(q), nomeDi(q), ora());
  }
}

export async function registraFile(env, p, oggetto, mime) {
  if (padre(p)) await creaCartella(env, padre(p));
  await run(env, `INSERT INTO archivio (percorso, cartella, nome, tipo, dimensione, etag, mime, creato) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(percorso) DO UPDATE SET dimensione=excluded.dimensione, etag=excluded.etag, mime=excluded.mime, creato=excluded.creato`,
  p, padre(p), nomeDi(p), tipoFile(p), oggetto.size || 0, oggetto.etag || oggetto.httpEtag || '', mime || '', ora());
}

// tutti i file dentro una cartella (anche nelle sottocartelle)
export async function fileSotto(env, cartella) {
  const c = pulisci(cartella);
  return all(env, "SELECT * FROM archivio WHERE tipo != 'cartella' AND (cartella = ? OR (cartella >= ? AND cartella < ?)) ORDER BY percorso", c, c + '/', c + '0');
}

// link firmato che il motore GitHub usa per scaricare (vale 3 giorni, mai indovinabile)
async function firma(env, p, scade) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode((env.IG_INTERNO_KEY || '') + '|' + (env.ADMIN_PASSWORD || '') + '|archivio'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${p}|${scade}`)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}
export async function linkFirmato(env, origine, p) {
  const g = 86400e3, scade = (Math.floor(Date.now() / g) + 3) * g; // stesso link per tutto il giorno: il motore non scarica due volte lo stesso file
  return `${origine}/archivio-file?p=${encodeURIComponent(p)}&s=${scade}&f=${await firma(env, p, scade)}`;
}
export async function linkValido(env, p, s, f) { return Number(s) > Date.now() && f === await firma(env, p, Number(s)); }

// sorgente "archivio:percorso" dentro i piani → link firmato fresco quando il motore li prende
export async function firmaSorgenti(env, origine, x) {
  if (Array.isArray(x)) { for (let i = 0; i < x.length; i++) x[i] = await firmaSorgenti(env, origine, x[i]); return x; }
  if (x && typeof x === 'object') { for (const k of Object.keys(x)) x[k] = await firmaSorgenti(env, origine, x[k]); return x; }
  if (typeof x === 'string' && x.startsWith('archivio:')) return linkFirmato(env, origine, x.slice(9));
  return x;
}

// file da servire (download dall'app o dal motore), con supporto Range per i video
export async function servi(env, req, p) {
  if (!env.ARCHIVIO) return new Response('archivio non collegato', { status: 503 });
  const range = req.headers.get('range');
  const m = range && /bytes=(\d+)-(\d*)/.exec(range);
  const o = await env.ARCHIVIO.get(p, m ? { range: { offset: Number(m[1]), ...(m[2] ? { length: Number(m[2]) - Number(m[1]) + 1 } : {}) } } : {});
  if (!o) return new Response('file non trovato', { status: 404 });
  const h = new Headers({ 'content-type': o.httpMetadata?.contentType || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' });
  if (m) {
    const inizio = Number(m[1]), fine = m[2] ? Number(m[2]) : o.size - 1;
    h.set('content-range', `bytes ${inizio}-${fine}/${o.size}`); h.set('content-length', String(fine - inizio + 1));
    return new Response(o.body, { status: 206, headers: h });
  }
  h.set('content-length', String(o.size));
  return new Response(o.body, { headers: h });
}

// la cartella giusta per un reel, dal testo del prompt: "reel per la torretta sui panettoni" → Clienti/Torretta/Panettoni
export async function trovaCartella(env, testo) {
  const parole = new Set(String(testo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) || []);
  const radice = (w) => w.replace(/(i|e|a|o)$/, '');
  const radici = new Set([...parole].map(radice));
  const cartelle = await all(env, "SELECT percorso FROM archivio WHERE tipo='cartella' AND percorso LIKE 'Clienti/%'");
  let meglio = null, voto = 0;
  for (const { percorso } of cartelle) {
    const pezzi = percorso.split('/').slice(1).map((x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    const presi = pezzi.filter((x) => (x.match(/[a-z0-9]{3,}/g) || []).some((w) => parole.has(w) || radici.has(radice(w))));
    if (presi.length !== pezzi.length) continue; // ogni livello del percorso deve essere nominato
    const v = presi.length;
    if (v > voto) { voto = v; meglio = percorso; }
  }
  if (!meglio) return null;
  const n = await one(env, "SELECT COUNT(*) AS n FROM archivio WHERE tipo IN ('video','immagine') AND (cartella = ? OR (cartella >= ? AND cartella < ?))", meglio, meglio + '/', meglio + '0');
  return n.n ? meglio : null;
}

// il logo del cliente: un file "logo.*" nella cartella del cliente
export async function logoCliente(env, cartella) {
  const c = pulisci(cartella).split('/').slice(0, 2).join('/');
  if (!c.startsWith('Clienti/')) return null;
  const r = await one(env, "SELECT percorso FROM archivio WHERE cartella = ? AND tipo = 'immagine' AND lower(nome) LIKE 'logo%' ORDER BY (lower(nome) LIKE '%.png') DESC LIMIT 1", c);
  return r?.percorso || null;
}

export async function apiArchivio(req, env, p, m, json) {
  if (!p.startsWith('/api/archivio')) return null;
  const url = new URL(req.url);
  const corpo = async () => req.json().catch(() => ({}));
  await schemaArchivio(env);

  if (p === '/api/archivio' && m === 'GET') {
    const c = pulisci(url.searchParams.get('cartella'));
    const voci = await all(env, 'SELECT percorso, nome, tipo, dimensione, creato FROM archivio WHERE cartella = ? ORDER BY tipo != \'cartella\', nome COLLATE NOCASE', c);
    // peso di ogni sottocartella e dell'archivio intero (per la stima del costo)
    for (const v of voci.filter((x) => x.tipo === 'cartella')) {
      const s = await one(env, "SELECT COUNT(*) AS n, COALESCE(SUM(dimensione),0) AS b FROM archivio WHERE tipo != 'cartella' AND (cartella = ? OR (cartella >= ? AND cartella < ?))", v.percorso, v.percorso + '/', v.percorso + '0');
      Object.assign(v, { file: s.n, dimensione: s.b });
    }
    const tot = await one(env, "SELECT COALESCE(SUM(dimensione),0) AS b, COUNT(*) AS n FROM archivio WHERE tipo != 'cartella'");
    const gb = tot.b / 1073741824;
    return json({ cartella: c, voci, collegato: !!env.ARCHIVIO, totale: { file: tot.n, gb: Math.round(gb * 100) / 100, euro_mese: Math.round(Math.max(0, gb - 10) * 0.015 * 0.86 * 100) / 100 } });
  }
  if (p === '/api/archivio/stile-copertina' && m === 'GET') {
    const cl = pulisci(url.searchParams.get('cliente')).toLowerCase();
    const r = await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', 'COPERTINA:' + cl);
    return json({ ricetta: r ? J(r.valore, null) : null });
  }
  if (p === '/api/archivio/stile-copertina' && m === 'POST') {
    const d = await corpo();
    const c = pulisci(d.cartella); // es. Clienti/Torretta/Copertine
    const pz = c.split('/');
    if (pz[0] !== 'Clienti' || pz.length < 2) return json({ errore: 'metti gli esempi in Clienti/<cliente>/Copertine' }, 400);
    if (!env.ARCHIVIO) return json({ errore: 'archivio non collegato' }, 503);
    const es = (await fileSotto(env, c)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f.nome) && f.dimensione <= 3.5 * 1048576).slice(0, 6);
    if (!es.length) return json({ errore: 'in questa cartella non ci sono immagini di esempio (jpg/png sotto i 3,5 MB)' }, 400);
    const immagini = [];
    for (const f of es) {
      const o = await env.ARCHIVIO.get(f.percorso); if (!o) continue;
      const u8 = new Uint8Array(await o.arrayBuffer()); let bin = ''; for (let k = 0; k < u8.length; k += 32768) bin += String.fromCharCode(...u8.subarray(k, k + 32768));
      immagini.push({ cosa: f.nome, jpeg: btoa(bin), tipo: /png$/i.test(f.nome) ? 'image/png' : /webp$/i.test(f.nome) ? 'image/webp' : 'image/jpeg' });
    }
    const { configurazione } = await import('./db.js');
    const S = await import('./servizi.js');
    const cfg = await configurazione(env);
    const out = await S.claudeVisione(cfg, cfg.CLAUDE_MODEL, 'Sei un art director. Ricavi dalle copertine di esempio di un cliente le regole grafiche per rifarle uguali in automatico.',
      `Queste sono copertine di reel che il cliente vuole come modello. Ricava lo stile comune e rispondi SOLO JSON con questi campi (valori ammessi tra |):
{"posizione_testo": "alto|centro|basso", "allineamento": "sinistra|centro", "font": "nome del Google Font più simile (es. Montserrat, Anton, Bebas Neue, Playfair Display, Poppins, Archivo Black, DM Serif Display, Inter)", "peso": 400|600|700|800|900,
 "maiuscolo": true|false, "colore_testo": "#hex", "contorno": true|false, "riquadro": "nessuno|pieno|evidenzia", "colore_riquadro": "#hex", "colore_testo_riquadro": "#hex",
 "sfondo": "foto|foto_sfocata|colore", "overlay": "nessuno|gradiente_basso|gradiente_alto|scuro", "scontorno": true|false, "cornice": "nessuna|bianca|arrotondata",
 "logo": "nessuno|alto_sinistra|alto_centro|alto_destra|basso_centro", "dimensione_testo": "piccolo|medio|grande", "barra_accento": true|false, "colore_accento": "#hex",
 "descrizione": "2 frasi su com'è lo stile, per Johnny"}`, immagini, 1500);
    const nome = pz[1];
    await run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?, ?)', 'COPERTINA:' + nome.toLowerCase(), JSON.stringify({ ...out, esempi: immagini.length, quando: ora() }));
    const { log } = await import('./db.js');
    await log(env, null, 'caroselli', `🎨 Pietro ha studiato ${immagini.length} copertine di esempio di ${nome}: ${String(out.descrizione || '').slice(0, 160)}`).catch(() => {});
    return json({ ok: true, cliente: nome, ricetta: out });
  }
  if (p === '/api/archivio/cartelle' && m === 'GET') { // tutte le cartelle, per il menu a tendina dei reel
    return json(await all(env, "SELECT percorso FROM archivio WHERE tipo='cartella' ORDER BY percorso COLLATE NOCASE"));
  }
  if (p === '/api/archivio/cartella' && m === 'POST') {
    const d = await corpo(); const c = pulisci(d.percorso);
    if (!c) return json({ errore: 'scrivi il nome della cartella' }, 400);
    await creaCartella(env, c);
    return json({ ok: true, percorso: c });
  }
  if (!env.ARCHIVIO) return json({ errore: 'Archivio non ancora collegato: attiva R2 nella dashboard di Cloudflare' }, 503);

  // caricamento: file piccoli in una volta, file grandi a pezzi da 50 MB (multipart R2)
  if (p === '/api/archivio/carica' && m === 'PUT') {
    const c = pulisci(url.searchParams.get('p'));
    if (!c || !padre(c)) return json({ errore: 'il file va messo dentro una cartella' }, 400);
    const mime = req.headers.get('content-type') || 'application/octet-stream';
    const o = await env.ARCHIVIO.put(c, req.body, { httpMetadata: { contentType: mime } });
    await registraFile(env, c, o, mime);
    return json({ ok: true, percorso: c });
  }
  if (p === '/api/archivio/carica/inizio' && m === 'POST') {
    const d = await corpo(); const c = pulisci(d.percorso);
    if (!c || !padre(c)) return json({ errore: 'il file va messo dentro una cartella' }, 400);
    const u = await env.ARCHIVIO.createMultipartUpload(c, { httpMetadata: { contentType: d.mime || 'application/octet-stream' } });
    return json({ percorso: c, upload: u.uploadId, parte_mb: PARTE_MB });
  }
  if (p === '/api/archivio/carica/parte' && m === 'PUT') {
    const c = pulisci(url.searchParams.get('p'));
    const u = env.ARCHIVIO.resumeMultipartUpload(c, url.searchParams.get('u'));
    const parte = await u.uploadPart(Number(url.searchParams.get('n')), req.body);
    return json({ n: parte.partNumber, etag: parte.etag });
  }
  if (p === '/api/archivio/carica/fine' && m === 'POST') {
    const d = await corpo(); const c = pulisci(d.percorso);
    const u = env.ARCHIVIO.resumeMultipartUpload(c, d.upload);
    const o = await u.complete((d.parti || []).map((x) => ({ partNumber: Number(x.n), etag: String(x.etag) })));
    await registraFile(env, c, o, d.mime);
    return json({ ok: true, percorso: c });
  }
  if (p === '/api/archivio/carica/annulla' && m === 'POST') {
    const d = await corpo();
    try { await env.ARCHIVIO.resumeMultipartUpload(pulisci(d.percorso), d.upload).abort(); } catch (_) {}
    return json({ ok: true });
  }
  if (p === '/api/archivio/file' && m === 'GET') return servi(env, req, pulisci(url.searchParams.get('p')));
  if (p === '/api/archivio' && m === 'DELETE') { // file o cartella intera (la conferma la chiede la pagina)
    const c = pulisci(url.searchParams.get('p'));
    if (!c) return json({ errore: 'cosa elimino?' }, 400);
    const v = await one(env, 'SELECT tipo FROM archivio WHERE percorso=?', c);
    if (!v) return json({ errore: 'non trovato' }, 404);
    const file = v.tipo === 'cartella' ? (await fileSotto(env, c)).map((x) => x.percorso) : [c];
    for (let i = 0; i < file.length; i += 500) await env.ARCHIVIO.delete(file.slice(i, i + 500));
    await run(env, "DELETE FROM archivio WHERE percorso = ? OR (percorso >= ? AND percorso < ?)", c, c + '/', c + '0');
    return json({ ok: true, eliminati: file.length });
  }
  return json({ errore: 'non trovato' }, 404);
}

// FONTE per i reel: le clip di una cartella dell'archivio
export async function clipArchivio(env, cartella) {
  return (await fileSotto(env, cartella)).filter((f) => ['video', 'immagine', 'musica'].includes(f.tipo) && !/^logo/i.test(f.nome)).map((f) => ({
    fileid: 'a:' + f.percorso, nome: f.nome, cartella: f.cartella, dimensione: f.dimensione, hash: String(f.etag || f.percorso),
    ...(f.tipo === 'musica' ? { tipo: 'musica', tecnico: { tipo: 'musica' } } : f.tipo === 'immagine' ? { tipo: 'immagine', tecnico: { tipo: 'immagine', durata_sec: 0 } } : { tecnico: {} }),
    sorgente: { tipo: 'archivio', percorso: f.percorso },
  }));
}

// musica dalla cartella Musica dell'archivio (sottocartelle = umore): un brano adatto al reel
export async function branoArchivio(env, scegli) {
  const brani = (await fileSotto(env, 'Musica')).filter((f) => f.tipo === 'musica');
  if (!brani.length) return null;
  const lista = brani.slice(0, 120).map((b, i) => ({ i, umore: b.cartella.split('/').slice(1).join(' / ') || 'varie', brano: b.nome.replace(/\.[^.]+$/, '') }));
  let k = null;
  try { k = await scegli(lista); } catch (_) {}
  const b = brani[Number.isInteger(k) && brani[k] ? k : Math.floor(Math.random() * brani.length)];
  return { fileid: 'a:' + b.percorso, nome: b.nome, cartella: b.cartella, dimensione: b.dimensione, hash: String(b.etag || b.percorso), tipo: 'musica', tecnico: { tipo: 'musica' },
    sorgente: { tipo: 'archivio', percorso: b.percorso }, dalla_libreria: true };
}

// il cliente nominato nel testo, se ha una cartella in Clienti/
export async function clienteDalTesto(env, testo) {
  const t = String(testo || '').toLowerCase();
  const C = await all(env, "SELECT nome FROM archivio WHERE tipo='cartella' AND cartella='Clienti'");
  return C.map((c) => c.nome).find((n) => n.length > 2 && t.includes(n.toLowerCase())) || null;
}

export { J };
