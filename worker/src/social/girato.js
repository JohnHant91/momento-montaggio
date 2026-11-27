// GIRATO AUTOMATICO: Johnny carica le clip nella cartella "Da montare" del cliente (Archivio) e non fa altro.
// Qui si controlla ogni pochi minuti: quando una cartella ha clip nuove e il caricamento è finito (10 minuti senza
// nuovi file), parte da solo il montaggio, con nicchia e stile presi dalla scheda del cliente.
import { all, one, run, ora, log, J } from '../db.js';
import { inviaPush } from '../notifiche.js';
import { leggiScheda, schemaSchede } from './schede.js';
import { creaCartella } from '../archivio.js';

export const CARTELLA_GIRATO = 'Da montare';

export async function avanzaGirato(env) {
  await schemaSchede(env);
  const clienti = await all(env, "SELECT * FROM s_clienti WHERE cartella != ''");
  // la cartella "Da montare" esiste in ogni cliente, così Johnny la trova subito
  for (const c of clienti) await creaCartella(env, `${c.cartella}/${CARTELLA_GIRATO}`);
  const video = await all(env, "SELECT cartella, COUNT(*) AS n, MAX(creato) AS ultimo FROM archivio WHERE tipo='video' AND cartella LIKE ? GROUP BY cartella", `%/${CARTELLA_GIRATO}%`);
  for (const g of video) {
    const cl = clienti.find((c) => g.cartella === `${c.cartella}/${CARTELLA_GIRATO}` || g.cartella.startsWith(`${c.cartella}/${CARTELLA_GIRATO}/`));
    if (!cl) continue;
    if (Date.now() - new Date(g.ultimo).getTime() < 10 * 60e3) continue; // sta ancora caricando
    const chiave = 'GIRATO:' + g.cartella;
    const visto = J((await one(env, 'SELECT valore FROM impostazioni WHERE chiave=?', chiave))?.valore, null);
    if (visto && visto.n === g.n && visto.ultimo === g.ultimo) continue; // già montato con queste clip
    const scheda = (await leggiScheda(env, cl.cartella)) || '';
    const ripresa = g.cartella.split('/').slice(-1)[0];
    const prompt = `Cliente: ${cl.nome}. Reel con le clip girate da Johnny${ripresa !== CARTELLA_GIRATO ? ` (ripresa "${ripresa}")` : ''}.
Monta in autonomia un reel finito, pronto da approvare: scegli tu stile, ritmo, titoli, sottotitoli, transizioni e colori adatti alla nicchia e all'identità del cliente descritte nella scheda qui sotto. Metti tu la musica dall'archivio.
SCHEDA DEL CLIENTE:
${scheda.slice(0, 3500) || '(scheda non ancora scritta: deduci la nicchia dal nome del cliente e dalle clip)'}`;
    const r = await one(env, "INSERT INTO lavori (prompt, pcloud, link_rif, fonte, creato, aggiornato) VALUES (?,?,'[]','archivio',?,?) RETURNING id", prompt, g.cartella, ora(), ora());
    await run(env, 'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?,?)', chiave, JSON.stringify({ n: g.n, ultimo: g.ultimo, lavoro: r.id }));
    await log(env, r.id, 'direttore', `🎬 ${g.n} clip nuove in "${g.cartella}": parte da solo il montaggio per ${cl.nome}`);
    await inviaPush(env, `🎬 ${cl.nome}: montaggio partito`, `${g.n} clip trovate in "${CARTELLA_GIRATO}". Ti avviso quando il reel è da approvare.`).catch(() => {});
    return; // un lavoro per giro
  }
}
