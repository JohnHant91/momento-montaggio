// Nora · Idee e copioni: dal tuo elenco di argomenti costruisce il piano editoriale del contratto
// (es. 20 reel in 3 mesi) e per ogni reel scrive il copione da girare: scene, tipo di inquadratura, durata, audio,
// testi, caption. Lavora a fasi dal cron: strategia → copioni a gruppi di 4 → fatto. Si può rifare un singolo reel.
import { all, one, run, J, ora, configurazione, log } from './db.js';
import * as S from './servizi.js';
import { MANUALE_COPIONI, MANUALE_COPY, MANUALE_DIRETTORE } from './manuali.js';
import { chi } from './consumi.js';

const GRUPPO = 4; // reel per chiamata a Claude
const BLOCCO_MIN = 15;

export async function schemaPiani(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS piani (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente TEXT, dati TEXT, stato TEXT NOT NULL DEFAULT 'in_corso', fase TEXT NOT NULL DEFAULT 'strategia',
    strategia TEXT, reel TEXT, errore TEXT, tentativi INTEGER DEFAULT 0, blocco_fino TEXT, creato TEXT, aggiornato TEXT)`).run();
}

const SISTEMA_STRATEGIA = `Sei Nora, content strategist e sceneggiatrice di Momento Produzione, agenzia che gira e monta
video e foto per i social dei clienti (ristoranti, bar, B&B, negozi, artigiani, professionisti). Johnny ti dà il cliente,
gli argomenti e il numero di reel del contratto: tu costruisci il piano editoriale che poi l'agenzia gira e monta.

${MANUALE_DIRETTORE}

${MANUALE_COPIONI}

Regole del piano:
- Usa gli argomenti di Johnny come materia prima: puoi dividerli, combinarli e ordinarli, non inventare servizi o
  prodotti che il cliente non ha. Se un argomento è vago, trasformalo in un'idea concreta e girabile.
- Distribuisci i reel sulle settimane del contratto in modo regolare (stessi giorni della settimana), alternando
  pilastri e formati: mai due reel uguali di fila. Il primo mese deve contenere i reel più forti per farsi conoscere.
- Pensa alla produzione: raggruppa i reel in GIORNATE DI RIPRESA per luogo e situazione (meno uscite = più margine
  per l'agenzia). Ogni giornata indica quali reel si girano, dove, chi deve esserci, e quanto dura.
- Rispondi SOLO JSON.`;

const SISTEMA_COPIONE = `Sei Nora, sceneggiatrice di Momento Produzione. Scrivi copioni di reel da GIRARE: il videomaker
li legge sul set e deve sapere esattamente cosa riprendere, come e per quanto; il montatore deve sapere come montarli.

${MANUALE_COPIONI}

${MANUALE_COPY}

Rispondi SOLO JSON.`;

function datiTesto(d) {
  return `CLIENTE: ${d.cliente}
SETTORE / ATTIVITÀ: ${d.settore || '(deducilo dal cliente e dagli argomenti)'}
ARGOMENTI DA COPRIRE (scelti da Johnny):
${(d.argomenti || []).map((a, i) => `${i + 1}. ${a}`).join('\n')}
NUMERO DI REEL: ${d.numero}
DURATA DEL CONTRATTO: ${d.mesi} mesi, dal ${d.inizio}
PIATTAFORME: ${d.piattaforme || 'Instagram Reels (+ TikTok)'}
OBIETTIVO DEL CLIENTE: ${d.obiettivo || '(deducilo)'}
PUBBLICO: ${d.pubblico || '(deducilo)'}
TONO: ${d.tono || '(deducilo dal settore)'}
NOTE DI JOHNNY: ${d.note || '—'}`;
}

async function faseStrategia(env, cfg, P) {
  const d = J(P.dati, {});
  await log(env, null, 'idee', `💡 piano "${d.cliente}": studio gli argomenti e distribuisco ${d.numero} reel in ${d.mesi} mesi`);
  const s = await S.claude(cfg, SISTEMA_STRATEGIA, `${datiTesto(d)}

Restituisci:
{
  "titolo_piano": "...",
  "sintesi": "3-4 frasi: l'idea guida del piano e perché funziona per questo cliente",
  "pubblico": "chi guarda e cosa gli interessa",
  "linea_editoriale": "tono, stile visivo, cosa rende riconoscibili questi reel",
  "pilastri": [{"nome": "...", "perche": "...", "quota": "percentuale dei reel"}],
  "mix_formati": "quanti reel per formato e perché",
  "frequenza": "es. 2 a settimana, martedì e venerdì",
  "calendario": [{"numero": 1, "settimana": 1, "data": "YYYY-MM-DD", "argomento": "...", "pilastro": "...", "formato": "montaggio|talking_head|carosello|tutorial|dietro_le_quinte|prima_dopo|pov|intervista|trend",
                  "idea": "una frase concreta", "obiettivo": "visibilità|salvataggi|condivisioni|interazione|contatti", "gancio_bozza": "..."}],
  "giornate_di_ripresa": [{"giorno": 1, "reel": [1, 4, 7], "dove": "...", "chi": "persone che devono esserci", "durata": "es. mezza giornata", "note": "..."}],
  "consigli": ["3-5 consigli pratici per la produzione e la pubblicazione"]
}
Il calendario deve avere ESATTAMENTE ${d.numero} reel, numerati da 1 a ${d.numero}.`, { maxTokens: 16000 });
  const cal = (s.calendario || []).slice(0, d.numero).map((r, i) => ({ ...r, numero: i + 1 }));
  if (cal.length < d.numero) throw new Error(`la strategia ha solo ${cal.length} reel su ${d.numero}: riprovo`);
  s.calendario = cal;
  await run(env, "UPDATE piani SET strategia=?, reel=?, fase='copioni', aggiornato=? WHERE id=?", JSON.stringify(s), JSON.stringify(cal.map((c) => ({ numero: c.numero, stato: 'da_scrivere' }))), ora(), P.id);
  await log(env, null, 'idee', `💡 piano "${s.titolo_piano || d.cliente}": ${cal.length} reel in calendario, ${(s.giornate_di_ripresa || []).length} giornate di ripresa. Ora scrivo i copioni`);
}

async function faseCopioni(env, cfg, P) {
  const d = J(P.dati, {});
  const s = J(P.strategia, {});
  const reel = J(P.reel, []);
  const daFare = reel.filter((r) => r.stato !== 'fatto').slice(0, GRUPPO);
  if (!daFare.length) {
    await run(env, "UPDATE piani SET fase='fatto', stato='pronto', aggiornato=? WHERE id=?", ora(), P.id);
    await log(env, null, 'idee', `✅ piano "${s.titolo_piano || d.cliente}" pronto: ${reel.length} copioni da girare`);
    return;
  }
  const voci = daFare.map((r) => {
    const c = s.calendario.find((x) => x.numero === r.numero) || {};
    return { ...c, nota_di_johnny: r.nota || undefined };
  });
  await log(env, null, 'idee', `✍️ scrivo i copioni ${voci.map((v) => '#' + v.numero).join(', ')} del piano "${s.titolo_piano || d.cliente}"`);
  const out = await S.claude(cfg, SISTEMA_COPIONE, `${datiTesto(d)}

PIANO GIÀ DECISO:
- idea guida: ${s.sintesi || ''}
- linea editoriale: ${s.linea_editoriale || ''}
- pubblico: ${s.pubblico || ''}

REEL DA SCRIVERE ORA (rispetta argomento, formato, pilastro e obiettivo; se c'è una nota di Johnny, seguila):
${JSON.stringify(voci, null, 1)}

Per ognuno restituisci un copione completo:
{"copioni": [{
  "numero": n, "titolo": "...", "formato": "...", "durata_sec": 15-45, "obiettivo": "...",
  "concetto": "2 frasi: cosa racconta e perché qualcuno lo guarda fino alla fine",
  "gancio": {"visivo": "cosa si vede nei primi 2 secondi", "testo_a_schermo": "max 7 parole o null", "parlato": "prima frase detta o null"},
  "scene": [{"n": 1, "da_sec": 0, "a_sec": 2,
             "inquadratura": "macro|dettaglio|primo piano|piano medio|piano americano|totale|POV|dall'alto",
             "cosa_riprendere": "soggetto e azione precisi",
             "camera": "cavalletto fisso|gimbal|a mano|slider + eventuale movimento",
             "angolo": "frontale|laterale|dall'alto|dal basso|3/4",
             "luce": "naturale da finestra|calda|controluce|...",
             "girare_sec": "quanti secondi girare (sempre più del montato)",
             "fps": "25 oppure 50 per il rallenty",
             "audio": "ambiente|parlato in camera|voce fuori campo|nessuno",
             "testo_a_schermo": "... o null", "parlato": "battuta esatta o null"}],
  "parlato_completo": "tutto il testo detto (talking head / voce fuori campo) o null",
  "montaggio": {"ritmo": "...", "look": "...", "transizioni": "...", "finale": "..."},
  "musica": "mood, genere e BPM indicativi (da libreria con licenza)",
  "lista_riprese": ["checklist per il videomaker: ogni clip da portare a casa, comprese le B-roll di scorta"],
  "da_preparare": ["oggetti, prodotti, persone, abbigliamento, permessi"],
  "caption": "caption pronta, prima riga ≤125 caratteri con la parola chiave",
  "hashtag": ["3-5"], "cta": "una sola call to action",
  "ganci_alternativi": ["2 alternative da testare"],
  "note_set": "consigli pratici per il set"
}]}`, { maxTokens: 20000 });
  const nuovi = Object.fromEntries((out.copioni || []).map((c) => [Number(c.numero), c]));
  const fresco = J((await one(env, 'SELECT reel FROM piani WHERE id=?', P.id))?.reel, reel);
  let scritti = 0;
  for (const r of fresco) {
    if (daFare.some((x) => x.numero === r.numero) && nuovi[r.numero]?.scene?.length) {
      Object.assign(r, { stato: 'fatto', copione: nuovi[r.numero], nota: undefined, scritto: ora() });
      scritti++;
    }
  }
  if (!scritti) throw new Error('Claude non ha restituito copioni validi: riprovo');
  const finiti = fresco.every((r) => r.stato === 'fatto');
  await run(env, 'UPDATE piani SET reel=?, fase=?, stato=?, aggiornato=? WHERE id=?', JSON.stringify(fresco), finiti ? 'fatto' : 'copioni', finiti ? 'pronto' : 'in_corso', ora(), P.id);
  await log(env, null, 'idee', finiti ? `✅ piano "${s.titolo_piano || d.cliente}" pronto: ${fresco.length} copioni da girare`
    : `✍️ ${fresco.filter((r) => r.stato === 'fatto').length}/${fresco.length} copioni scritti`);
}

// chiamata dal cron: un passo per volta, con blocco (due giri del cron non lavorano lo stesso piano)
export async function avanzaPiani(env) {
  const adesso = ora();
  const presi = await all(env, `UPDATE piani SET blocco_fino=?, tentativi=tentativi+1, aggiornato=?
    WHERE id = (SELECT id FROM piani WHERE stato='in_corso' AND (blocco_fino IS NULL OR blocco_fino < ?) ORDER BY id LIMIT 1) RETURNING *`,
  new Date(Date.now() + BLOCCO_MIN * 60e3).toISOString(), adesso, adesso);
  if (!presi.length) return;
  const P = presi[0];
  const cfg = chi(await configurazione(env), { area: 'copioni', agente: 'idee' });
  try {
    if (P.fase === 'strategia') await faseStrategia(env, cfg, P);
    else await faseCopioni(env, cfg, P);
    await run(env, 'UPDATE piani SET blocco_fino=NULL, tentativi=0, errore=NULL WHERE id=?', P.id);
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 400);
    const stop = P.tentativi >= 3 || /manca la chiave/.test(msg);
    await run(env, 'UPDATE piani SET stato=?, errore=?, blocco_fino=?, aggiornato=? WHERE id=?', stop ? 'errore' : 'in_corso', msg,
      stop ? null : new Date(Date.now() + 2 * 60e3).toISOString(), ora(), P.id);
    await log(env, null, 'idee', `${stop ? '❌ fermo' : '⚠️ riprovo tra 2 minuti'} (piano #${P.id}): ${msg}`, stop ? 'errore' : 'warn');
  }
}

// ---------------------------------------------------------------- API
export async function apiPiani(req, env, p, m, json) {
  if (p === '/api/piani' && m === 'GET') {
    return json(await all(env, "SELECT id, cliente, stato, fase, errore, creato, json_extract(strategia, '$.titolo_piano') AS titolo, json_extract(dati, '$.numero') AS numero, json_extract(dati, '$.mesi') AS mesi, (SELECT COUNT(*) FROM json_each(piani.reel) WHERE json_extract(value, '$.stato')='fatto') AS scritti FROM piani ORDER BY id DESC LIMIT 60"));
  }
  if (p === '/api/piani' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const cfg = await configurazione(env);
    if (!cfg.ANTHROPIC_API_KEY) return json({ errore: 'Prima inserisci la chiave Claude in ⚙︎ Impostazioni' }, 400);
    const cliente = String(d.cliente || '').trim();
    const argomenti = String(d.argomenti || '').split('\n').map((x) => x.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 60);
    const numero = Math.round(Number(d.numero) || 20);
    const mesi = Math.round(Number(d.mesi) || 3);
    if (!cliente) return json({ errore: 'scrivi il nome del cliente' }, 400);
    if (!argomenti.length) return json({ errore: 'scrivi almeno un argomento (uno per riga)' }, 400);
    if (numero < 1 || numero > 60) return json({ errore: 'il numero di reel va da 1 a 60' }, 400);
    const inizio = /^\d{4}-\d{2}-\d{2}$/.test(d.inizio || '') ? d.inizio : new Date().toISOString().slice(0, 10);
    const dati = { cliente, settore: String(d.settore || '').trim(), argomenti, numero, mesi: Math.min(Math.max(mesi, 1), 24), inizio,
      obiettivo: String(d.obiettivo || '').trim(), pubblico: String(d.pubblico || '').trim(), tono: String(d.tono || '').trim(),
      piattaforme: String(d.piattaforme || '').trim(), note: String(d.note || '').trim() };
    const r = await one(env, 'INSERT INTO piani (cliente, dati, creato, aggiornato) VALUES (?,?,?,?) RETURNING id', cliente, JSON.stringify(dati), ora(), ora());
    await log(env, null, 'idee', `💡 nuovo piano #${r.id} per ${cliente}: ${numero} reel in ${dati.mesi} mesi, parto entro un minuto`);
    return json({ id: r.id });
  }
  const pp = p.match(/^\/api\/piani\/(\d+)$/);
  if (pp && m === 'GET') {
    const P = await one(env, 'SELECT * FROM piani WHERE id=?', pp[1]);
    if (!P) return json({ errore: 'piano non trovato' }, 404);
    return json({ ...P, dati: J(P.dati, {}), strategia: J(P.strategia), reel: J(P.reel, []) });
  }
  if (pp && m === 'DELETE') {
    await run(env, 'DELETE FROM piani WHERE id=?', pp[1]);
    return json({ ok: true });
  }
  const rp = p.match(/^\/api\/piani\/(\d+)\/riprova$/);
  if (rp && m === 'POST') {
    await run(env, "UPDATE piani SET stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?", ora(), rp[1]);
    return json({ ok: true });
  }
  // rifà un solo copione, con le indicazioni di Johnny
  const rr = p.match(/^\/api\/piani\/(\d+)\/reel\/(\d+)\/rifai$/);
  if (rr && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const P = await one(env, 'SELECT * FROM piani WHERE id=?', rr[1]);
    if (!P) return json({ errore: 'piano non trovato' }, 404);
    const reel = J(P.reel, []);
    const r = reel.find((x) => x.numero === Number(rr[2]));
    if (!r) return json({ errore: 'reel non trovato' }, 404);
    Object.assign(r, { stato: 'da_scrivere', nota: String(d.nota || '').trim().slice(0, 1500) || undefined, copione: undefined });
    const strategia = J(P.strategia, {});
    if (d.argomento && strategia?.calendario) {
      const c = strategia.calendario.find((x) => x.numero === r.numero);
      if (c) c.argomento = String(d.argomento).slice(0, 300);
    }
    await run(env, "UPDATE piani SET reel=?, strategia=?, fase='copioni', stato='in_corso', errore=NULL, tentativi=0, blocco_fino=NULL, aggiornato=? WHERE id=?",
      JSON.stringify(reel), JSON.stringify(strategia), ora(), P.id);
    await log(env, null, 'idee', `✍️ riscrivo il copione #${r.numero} del piano #${P.id}${r.nota ? ': ' + r.nota.slice(0, 100) : ''}`);
    return json({ ok: true });
  }
  return null;
}
