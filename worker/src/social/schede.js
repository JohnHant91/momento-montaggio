// AGENZIA SOCIAL · SETTORE 1: CLIENTI E SCHEDE
// I clienti vengono dal gestionale (sola lettura, solo quelli "Attivo") più il profilo IG personale di Johnny.
// Per ognuno l'agenzia scrive una SCHEDA in Archivio (Clienti/<nome>/SCHEDA.md): è la fonte di verità che leggono
// tutti gli altri settori. Se la scheda c'è già non la riscrive (Johnny può correggerla a mano).
import { all, one, run, ora, J, configurazione, log } from '../db.js';
import { registraFile } from '../archivio.js';
import { registra, daUsage, chi } from '../consumi.js';

export const JOHNNY = { id: 'johnny', nome: 'Johnny · IG personale', cartella: 'Johnny IG personale', personale: true };

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoSchede;
export function schemaSchede(env) { return (_fattoSchede ||= _schemaSchede(env).catch((e) => { _fattoSchede = null; throw e; })); }
async function _schemaSchede(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS s_clienti (id TEXT PRIMARY KEY, nome TEXT NOT NULL, cartella TEXT NOT NULL, stato TEXT,
    scheda TEXT, errore TEXT, aggiornato TEXT)`).run();
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const VUOTE = new Set(['srl', 'snc', 'sas', 'spa', 'da', 'di', 'la', 'il', 'lo', 'le', 'dei', 'del', 'della', 'app', 'flli', 'f', 'lli', 'and']);
const parole = (s) => new Set((norm(s).match(/[a-z0-9]{3,}/g) || []).filter((w) => !VUOTE.has(w)));

// cartella del cliente in Archivio: quella esistente che gli somiglia di più, altrimenti Clienti/<nome>
async function cartellaDi(env, nome) {
  const C = await all(env, "SELECT percorso FROM archivio WHERE tipo='cartella' AND cartella='Clienti'");
  const pn = parole(nome);
  let best = null, voto = 0;
  for (const { percorso } of C) {
    const pc = parole(percorso.split('/')[1]);
    const comuni = [...pc].filter((w) => pn.has(w)).length;
    if (comuni && comuni / pc.size >= 0.6 && comuni > voto) { voto = comuni; best = percorso; }
  }
  return best || 'Clienti/' + String(nome).replace(/[\/\\]/g, '-').trim();
}

export async function clientiAgenzia(env) {
  const G = env.GEST ? await env.GEST.prepare("SELECT id, data FROM records WHERE store='clienti'").all().then((r) => r.results || []) : [];
  const out = [];
  for (const r of G) {
    const d = J(r.data, {});
    if (String(d.stato || '').toLowerCase() !== 'attivo') continue;
    out.push({ id: 'g:' + r.id, nome: d.nome, cartella: await cartellaDi(env, d.nome), gestionale: { servizi: d.servizi, social: d.social, note: d.note, indirizzo: d.indirizzo, referente: d.referente } });
  }
  out.push({ ...JOHNNY });
  return out;
}

const SISTEMA = `Sei lo stratega di un'agenzia di social media italiana (Momento Produzione). Scrivi la SCHEDA CLIENTE: il documento
che tutti gli altri reparti (ricerca, calendario editoriale, idee, grafica Canva, montaggio reel, copy) leggono prima di lavorare.
Regole: scrivi solo cose vere. Quello che trovi sul web lo scrivi con la fonte; quello che deduci lo marchi [DA CONFERMARE];
quello che non sai lo lasci [DA CONFERMARE] senza inventare. Niente numeri, premi, prezzi, orari o storia inventati.
Italiano semplice, frasi brevi, niente gergo da marketing.`;

const MODELLO = (c, extra) => `CLIENTE: ${c.nome}
${c.personale ? 'È il profilo Instagram PERSONALE di Johnny (titolare di Momento Produzione), con il suo volto e la sua voce.' : `Dati dal gestionale dell'agenzia: ${JSON.stringify(c.gestionale)}`}
${extra ? 'MATERIALE GIÀ RACCOLTO IN PASSATO (usalo, è affidabile salvo dove dice da confermare):\n' + extra.slice(0, 9000) : ''}

Cerca sul web il cliente (sito, Instagram, Facebook, Google, articoli) per capire cosa fa davvero, dove si trova e come comunica.
Poi scrivi la scheda in Markdown con ESATTAMENTE queste sezioni:

# ${c.nome}
## In breve (2-3 righe: cosa fa, dove, per chi)
## Profili social (account Instagram con @, Facebook, TikTok, sito; ognuno con fonte o [DA CONFERMARE])
## Obiettivo dei social (cosa deve ottenere: clienti in negozio, prenotazioni, notorietà, vendite online…)
## Pubblico (chi sono, cosa cercano, cosa li blocca)
## Tono di voce (come parla: 3 aggettivi, tu o lei, 2 frasi di esempio SÌ e 2 NO)
## Cose da non dire mai
## Pilastri dei contenuti (4-5 argomenti fissi a rotazione, ognuno con 1 riga di spiegazione)
## Pacchetto del mese (post, caroselli, reel al mese; se non lo sai proponi 4 post, 4 caroselli, 4 reel e scrivi [DA CONFERMARE])
## Stile grafico per Canva (colori in HEX, font, logo, stile delle foto; se non li trovi proponi e scrivi [DA CONFERMARE])
## Da chiedere a Johnny (elenco breve delle informazioni mancanti più importanti)`;

// Claude con ricerca web, risposta in testo (Markdown)
async function scriviScheda(cfg, testo) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.CLAUDE_MODEL, max_tokens: 14000, system: SISTEMA, tools: [{ type: cfg.WEB_SEARCH_TOOL, name: 'web_search', max_uses: 5 }], messages: [{ role: 'user', content: testo }] }),
  });
  if (r.status !== 200) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  await registra(cfg, 'claude', cfg.CLAUDE_MODEL, daUsage(d.usage));
  if (d.stop_reason === 'max_tokens') throw new Error('scheda troncata');
  const md = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  const i = md.indexOf('# ');
  return i >= 0 ? md.slice(i) : md;
}

// una scheda per giro di cron (ognuna ~1 minuto con la ricerca web); quelle già in Archivio non si toccano
export async function avanzaSchede(env) {
  await schemaSchede(env);
  const C = await clientiAgenzia(env);
  for (const c of C) {
    const p = `${c.cartella}/SCHEDA.md`;
    const gia = await env.ARCHIVIO.head(p);
    const riga = await one(env, 'SELECT * FROM s_clienti WHERE id=?', c.id);
    if (gia) {
      if (!riga || riga.stato !== 'pronta') await run(env, "INSERT OR REPLACE INTO s_clienti (id, nome, cartella, stato, aggiornato) VALUES (?,?,?,'pronta',?)", c.id, c.nome, c.cartella, ora());
      continue;
    }
    if (riga?.stato === 'errore' && riga.aggiornato > new Date(Date.now() - 3600e3).toISOString()) continue; // riprova fra un'ora
    const cfg = chi(await configurazione(env), { area: 'social', agente: 'stratega' });
    try {
      // materiale già scritto in passato (vecchie schede della regia) per non rifare il lavoro
      const vecchia = await one(env, 'SELECT scheda, linea FROM clienti WHERE gest_id=? OR lower(nome)=lower(?)', c.id.replace(/^g:/, ''), c.nome).catch(() => null)
        || (c.personale ? await one(env, "SELECT scheda, linea FROM clienti WHERE nome LIKE 'Johnny%'").catch(() => null) : null);
      const extra = vecchia ? [vecchia.scheda, vecchia.linea].filter(Boolean).join('\n\n') : '';
      const md = await scriviScheda(cfg, MODELLO(c, extra));
      if (md.length < 300) throw new Error('scheda troppo corta');
      const testo = md + `\n\n---\n_Scheda scritta dall'agenzia il ${ora().slice(0, 10)}. Correggi qui quello che non va: l'agenzia legge sempre questa versione._\n`;
      const o = await env.ARCHIVIO.put(p, testo, { httpMetadata: { contentType: 'text/markdown; charset=utf-8' } });
      await registraFile(env, p, o, 'text/markdown');
      await run(env, "INSERT OR REPLACE INTO s_clienti (id, nome, cartella, stato, aggiornato) VALUES (?,?,?,'pronta',?)", c.id, c.nome, c.cartella, ora());
    } catch (e) {
      await run(env, "INSERT OR REPLACE INTO s_clienti (id, nome, cartella, stato, errore, aggiornato) VALUES (?,?,?,'errore',?,?)", c.id, c.nome, c.cartella, String(e.message || e).slice(0, 300), ora());
    }
    return; // una per giro
  }
}

// la scheda come la legge ogni settore (sempre dall'Archivio: se Johnny la corregge, vale la sua versione)
export async function leggiScheda(env, cartella) {
  const o = await env.ARCHIVIO.get(`${cartella}/SCHEDA.md`);
  return o ? await o.text() : null;
}

export async function apiSchede(req, env, p, m, json) {
  if (p === '/api/social/clienti' && m === 'GET') {
    await schemaSchede(env);
    const C = await clientiAgenzia(env);
    const S = await all(env, 'SELECT * FROM s_clienti');
    return json(C.map((c) => ({ ...c, stato: S.find((s) => s.id === c.id)?.stato || 'da_fare', errore: S.find((s) => s.id === c.id)?.errore || null })));
  }
  if (p === '/api/social/scheda' && m === 'GET') {
    const c = new URL(req.url).searchParams.get('cartella') || '';
    const t = await leggiScheda(env, c);
    return t ? new Response(t, { headers: { 'content-type': 'text/markdown; charset=utf-8' } }) : json({ errore: 'scheda non ancora pronta' }, 404);
  }
  return null;
}
