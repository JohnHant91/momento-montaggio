// CHIARA, social media manager: il collante del Social. Per ogni cliente tiene la LINEA EDITORIALE
// (voce, pilastri, cosa evitare, mix del mese) che tutti i colleghi social leggono prima di lavorare,
// e ripassa i contenuti prima che arrivino a Johnny (coerenza con la linea, niente doppioni, CTA giusta).
import { J, all, one, ora, run, log } from './db.js';
import * as S from './servizi.js';
import { SKILL } from './skill_testi.js';

// lo schema si controlla UNA volta per istanza, non a ogni richiesta (erano decine di query in più per ogni pagina)
let _fattoChiara;
export function schemaChiara(env) { return (_fattoChiara ||= _schemaChiara(env).catch((e) => { _fattoChiara = null; throw e; })); }
async function _schemaChiara(env) {
  await env.DB.prepare('ALTER TABLE clienti ADD COLUMN linea TEXT').run().catch(() => {});
  await env.DB.prepare('ALTER TABLE clienti ADD COLUMN colori TEXT').run().catch(() => {});
  await env.DB.prepare('ALTER TABLE clienti ADD COLUMN domande TEXT').run().catch(() => {});
  await env.DB.prepare('ALTER TABLE clienti ADD COLUMN ig_user_id TEXT').run().catch(() => {});
  await env.DB.prepare('ALTER TABLE clienti ADD COLUMN ig_username TEXT').run().catch(() => {});
}

export async function clientePerNome(env, nome) {
  if (!nome) return null;
  await schemaChiara(env);
  return one(env, 'SELECT * FROM clienti WHERE lower(nome)=lower(?) OR instr(lower(nome), lower(?)) > 0 LIMIT 1', nome, nome);
}

// la linea editoriale del cliente: se non c'è la scrive Chiara (una volta), poi resta e si aggiorna su richiesta
export async function lineaCliente(env, cfg, C, forza = false) {
  if (!C) return null;
  await schemaChiara(env);
  const ora_ = J(C.linea, null);
  if (ora_ && !forza) return ora_;
  const pubblicati = await all(env, "SELECT tipo, titolo FROM contenuti WHERE cliente_id=? AND stato IN ('programmato','pubblicato','approvato') ORDER BY id DESC LIMIT 20", C.id).catch(() => []);
  const out = await S.claude(cfg, `Sei Chiara, social media manager di AGENZIA MOMENTO AI e capo del Social. Scrivi la LINEA EDITORIALE di un cliente: la usano Giulia (testi), Pietro (grafica, caroselli, copertine) e il comparto Video. Niente dati inventati: se non sai qualcosa, scrivilo in "da_chiedere".
===== SKILL: social-strategy =====
${(SKILL['social-strategy'] || '').slice(0, 4000)}`,
  `CLIENTE: ${C.nome}${C.nicchia ? ' · ' + C.nicchia : ''}
SCHEDA: ${String(C.scheda || '(non ancora scritta)').slice(0, 5000)}
NOTE DI JOHNNY: ${C.note || '-'}
ULTIMI CONTENUTI: ${pubblicati.map((x) => x.tipo + ': ' + (x.titolo || '')).join(' | ') || 'nessuno'}
Rispondi SOLO JSON: {"obiettivo": "cosa devono ottenere i social", "pubblico": "a chi parliamo", "voce": "come parliamo (3-4 aggettivi e un esempio di frase)",
 "pilastri": ["3-5 temi fissi"], "cosa_evitare": ["..."], "mix_mese": {"reel": n, "caroselli": n, "post": n, "storie_a_settimana": n},
 "stile_visivo": "colori, look, cosa deve vedersi", "cta": ["2-3 inviti all'azione tipici"], "da_chiedere": ["cosa manca per lavorare meglio"]}`, { maxTokens: 2500 });
  out.aggiornata = ora();
  await run(env, 'UPDATE clienti SET linea=?, aggiornato=? WHERE id=?', JSON.stringify(out), ora(), C.id);
  await log(env, null, 'smm', `📣 Chiara ha scritto la linea editoriale di ${C.nome}: la seguono Giulia, Pietro e il Video`);
  return out;
}

export const testoLinea = (L) => L ? `LINEA EDITORIALE DEL CLIENTE (di Chiara, social media manager: seguila):
obiettivo: ${L.obiettivo || '-'} · pubblico: ${L.pubblico || '-'}
voce: ${L.voce || '-'}
pilastri: ${(L.pilastri || []).join('; ')}
evitare: ${(L.cosa_evitare || []).join('; ')}
stile visivo: ${L.stile_visivo || '-'}
CTA tipiche: ${(L.cta || []).join('; ')}` : '';

// ripasso di Chiara prima che i contenuti arrivino a Johnny (modello leggero: costa pochissimo)
export async function ripassoChiara(env, cfg, C, cosa, contenuto) {
  try {
    const L = C ? J(C.linea, null) : null;
    const recenti = C ? await all(env, "SELECT titolo FROM contenuti WHERE cliente_id=? ORDER BY id DESC LIMIT 15", C.id).catch(() => []) : [];
    const out = await S.claude({ ...cfg, CLAUDE_MODEL: cfg.CLAUDE_MODEL_LIGHT || cfg.CLAUDE_MODEL }, 'Sei Chiara, social media manager. Ripassi il lavoro dei colleghi prima che vada al titolare: breve, concreta, in italiano.',
      `${testoLinea(L) || 'Linea editoriale: non ancora scritta.'}
CONTENUTI GIÀ USCITI DI RECENTE: ${recenti.map((x) => x.titolo).filter(Boolean).join(' | ') || 'nessuno'}
DA RIPASSARE (${cosa}): ${JSON.stringify(contenuto).slice(0, 6000)}
Rispondi SOLO JSON: {"voto": 1-10, "ok": true|false, "nota": "1-2 frasi per Johnny: cosa va bene e cosa cambieresti (coerenza con la linea, doppioni, gancio, CTA)"}`, { maxTokens: 400 });
    return { voto: Number(out.voto) || null, ok: out.ok !== false, nota: String(out.nota || '').slice(0, 400), quando: ora() };
  } catch (_) { return null; }
}
