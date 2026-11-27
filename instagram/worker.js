// momento-instagram — modulo di pubblicazione Instagram per Agenzia Momento AI
// Coda in KV (binding CODA). Cron ogni 5 minuti: crea il contenitore, aspetta l'elaborazione, pubblica.
// Secret richiesti: IG_TOKEN, ADMIN_KEY. Variabile: IG_USER_ID (il profilo di Johnny, quello predefinito).
// PIÙ ACCOUNT: Meta dà un token per ogni account Instagram. Per aggiungerne uno (Momento Produzione, un cliente) si crea
// il secret IG_TOKEN_<id dell'account> (il numero che Meta mostra sotto il nome). Ogni richiesta può portare "ig_user_id";
// senza, vale il profilo predefinito. GET /conti elenca gli account collegati.

const GRAPH = "https://graph.facebook.com";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// l'account su cui lavorare: quello chiesto (solo cifre) o quello predefinito
const conto = (env, id) => (/^\d{5,25}$/.test(String(id || "")) ? String(id) : env.IG_USER_ID);

async function graph(env, method, path, params = {}, io) {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (method === "GET") url.searchParams.set(k, String(v));
    else body.set(k, String(v));
  }
  const headers = { Authorization: `Bearer ${(io && env["IG_TOKEN_" + io]) || env.IG_TOKEN}` }; // il token dell'account, o quello predefinito
  const res = await fetch(url, method === "GET" ? { headers } : { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error ? `${data.error.message} (code ${data.error.code})` : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---------- coda ----------
async function listaCoda(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.CODA.list({ prefix: "post:", cursor });
    for (const k of page.keys) {
      const v = await env.CODA.get(k.name, "json");
      if (v) out.push(v);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => a.publish_at.localeCompare(b.publish_at));
}

async function salva(env, item) {
  item.updated_at = new Date().toISOString();
  await env.CODA.put(`post:${item.id}`, JSON.stringify(item));
}

async function log(env, testo) {
  const k = `log:${Date.now()}`;
  await env.CODA.put(k, testo, { expirationTtl: 60 * 60 * 24 * 30 });
}

// ---------- pubblicazione ----------
async function creaContenitore(env, item) {
  const io = conto(env, item.ig_user_id);
  const params = { caption: item.caption || "" };
  if (item.ai_generated) params.is_ai_generated = true;
  if (item.type === "reel") {
    params.media_type = "REELS";
    params.video_url = item.media_url;
    params.share_to_feed = true;
    if (item.cover_url) params.cover_url = item.cover_url;
  } else if (item.type === "story") {
    params.media_type = "STORIES";
    if (/\.(mp4|mov)(\?|$)/i.test(item.media_url)) params.video_url = item.media_url;
    else params.image_url = item.media_url;
  } else if (item.type === "carousel") {
    // carosello: prima un contenitore per ogni slide (solo JPEG), poi il contenitore padre con i figli
    const figli = [];
    for (const u of item.media_urls || []) {
      const f = /\.(mp4|mov)(\?|$)/i.test(u)
        ? await graph(env, "POST", `${io}/media`, { media_type: "VIDEO", video_url: u, is_carousel_item: true }, io)
        : await graph(env, "POST", `${io}/media`, { image_url: u, is_carousel_item: true }, io);
      figli.push(f.id);
    }
    params.media_type = "CAROUSEL";
    params.children = figli.join(",");
  } else {
    params.image_url = item.media_url; // solo JPEG
  }
  const r = await graph(env, "POST", `${io}/media`, params, io);
  return r.id;
}

async function avanza(env, item) {
  const io = conto(env, item.ig_user_id);
  try {
    if (!item.container_id) {
      item.container_id = await creaContenitore(env, item);
      item.stato = "in_elaborazione";
      await salva(env, item);
    }
    const st = await graph(env, "GET", item.container_id, { fields: "status_code,status" }, io);
    if (st.status_code === "IN_PROGRESS") {
      item.tentativi = (item.tentativi || 0) + 1;
      if (item.tentativi > 24) throw new Error("Elaborazione oltre 2 ore, annullato");
      await salva(env, item);
      return;
    }
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
      throw new Error(`Contenitore ${st.status_code}: ${st.status || ""}`);
    }
    if (st.status_code === "FINISHED") {
      const pub = await graph(env, "POST", `${io}/media_publish`, {
        creation_id: item.container_id,
      }, io);
      item.media_id = pub.id;
      try {
        const m = await graph(env, "GET", pub.id, { fields: "permalink" }, io);
        item.permalink = m.permalink;
      } catch (_) {}
      item.stato = "pubblicato";
      item.pubblicato_at = new Date().toISOString();
      await salva(env, item);
      await log(env, `Pubblicato ${item.id} → ${item.permalink || item.media_id}`);
    }
  } catch (e) {
    item.stato = "errore";
    item.errore = String(e.message || e);
    await salva(env, item);
    await log(env, `Errore ${item.id}: ${item.errore}`);
  }
}

async function eseguiCoda(env) {
  if (!env.IG_TOKEN || !env.IG_USER_ID) return { saltato: "IG_TOKEN o IG_USER_ID mancanti" };
  const ora = new Date().toISOString();
  const coda = await listaCoda(env);
  const daFare = coda.filter(
    (i) => (i.stato === "programmato" && i.publish_at <= ora) || i.stato === "in_elaborazione"
  );
  for (const item of daFare) await avanza(env, item);
  return { elaborati: daFare.length };
}

async function controlloToken(env) {
  try {
    const p = await graph(env, "GET", env.IG_USER_ID, { fields: "username,followers_count" });
    await env.CODA.put("stato:token", JSON.stringify({ ok: true, verificato: new Date().toISOString(), username: p.username }));
  } catch (e) {
    await env.CODA.put("stato:token", JSON.stringify({ ok: false, verificato: new Date().toISOString(), errore: String(e.message) }));
    await log(env, `TOKEN NON VALIDO: ${e.message}`);
  }
}

// gli account Instagram collegati: quello predefinito e uno per ogni secret IG_TOKEN_<id>
async function conti(env) {
  const out = [];
  const ids = [String(env.IG_USER_ID), ...Object.keys(env).map((k) => (k.match(/^IG_TOKEN_(\d{5,25})$/) || [])[1]).filter(Boolean)];
  for (const id of [...new Set(ids)]) {
    try {
      const p = await graph(env, "GET", id, { fields: "username" }, id);
      out.push({ ig_user_id: id, username: p.username, predefinito: id === String(env.IG_USER_ID) });
    } catch (e) {
      out.push({ ig_user_id: id, errore: String(e.message), predefinito: id === String(env.IG_USER_ID) });
    }
  }
  return out;
}

// ---------- HTTP ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return json({ servizio: "momento-instagram", endpoint: ["GET /stato", "GET /conti", "GET /coda", "POST /coda (type: reel | image | story | carousel)", "DELETE /coda/:id", "POST /esegui"] });
    }
    if (url.pathname === "/salute") {
      const out = { token_configurato: !!env.IG_TOKEN, admin_key_configurata: !!env.ADMIN_KEY };
      try {
        const p = await graph(env, "GET", env.IG_USER_ID, { fields: "username" });
        out.instagram = `ok (@${p.username})`;
      } catch (e) {
        out.instagram = `errore: ${e.message}`;
      }
      return json(out);
    }
    // accesso: chiave admin di Johnny oppure chiave interna dell'agenzia (momento-reel, tramite service binding)
    const chiave = request.headers.get("x-admin-key");
    if (!((env.ADMIN_KEY && chiave === env.ADMIN_KEY) || (env.INTERNO_KEY && chiave === env.INTERNO_KEY))) {
      return json({ errore: "Non autorizzato" }, 401);
    }

    if (url.pathname === "/stato" && request.method === "GET") {
      const io = conto(env, url.searchParams.get("ig_user_id"));
      const out = { ig_user_id: io, token_configurato: !!env.IG_TOKEN };
      try {
        out.profilo = await graph(env, "GET", io, { fields: "username,followers_count,media_count" }, io);
        out.limite_pubblicazione = await graph(env, "GET", `${io}/content_publishing_limit`, { fields: "config,quota_usage" }, io);
      } catch (e) {
        out.errore = String(e.message);
      }
      out.ultimo_controllo_token = await env.CODA.get("stato:token", "json");
      return json(out);
    }

    if (url.pathname === "/conti" && request.method === "GET") {
      try {
        return json({ conti: await conti(env) });
      } catch (e) {
        return json({ errore: String(e.message) }, 502);
      }
    }

    if (url.pathname === "/hashtag" && request.method === "GET") {
      // ricerca reel per hashtag con l'API ufficiale (gratis): top media dell'hashtag, solo video
      const tag = String(url.searchParams.get("tag") || "").replace(/^#/, "").trim().toLowerCase();
      if (!tag) return json({ errore: "manca tag" }, 400);
      try {
        const h = await graph(env, "GET", "ig_hashtag_search", { user_id: env.IG_USER_ID, q: tag });
        const hid = h.data && h.data[0] && h.data[0].id;
        if (!hid) return json({ tag, media: [] });
        const out = [];
        for (const tipo of ["top_media", "recent_media"]) {
          const m = await graph(env, "GET", hid + "/" + tipo, { user_id: env.IG_USER_ID, fields: "id,media_type,media_product_type,media_url,permalink,like_count,comments_count,caption,timestamp", limit: 50 });
          for (const x of m.data || []) if (x.media_type === "VIDEO" && !out.some((y) => y.id === x.id)) out.push(x);
          if (out.length >= Number(url.searchParams.get("n") || 15)) break;
        }
        return json({ tag, media: out });
      } catch (e) {
        return json({ errore: String(e.message) }, 502);
      }
    }

    if (url.pathname === "/coda" && request.method === "GET") {
      return json(await listaCoda(env));
    }

    if (url.pathname === "/coda" && request.method === "POST") {
      const b = await request.json().catch(() => null);
      const type = (b && b.type) || "reel";
      if (!["reel", "image", "story", "carousel"].includes(type)) return json({ errore: "type: reel | image | story | carousel" }, 400);
      if (type === "carousel") {
        if (!Array.isArray(b.media_urls) || b.media_urls.length < 2 || b.media_urls.length > 10) return json({ errore: "Il carosello vuole media_urls con 2-10 immagini JPEG" }, 400);
      } else if (!b || !b.media_url) return json({ errore: "Serve almeno media_url" }, 400);
      const publish_at = b.publish_at ? new Date(b.publish_at) : new Date();
      if (isNaN(publish_at)) return json({ errore: "publish_at non valido (usa ISO, es. 2026-11-20T18:30:00+01:00)" }, 400);
      if (b.caption && b.caption.length > 2200) return json({ errore: "Didascalia oltre 2200 caratteri" }, 400);
      if (b.ig_user_id && !/^\d{5,25}$/.test(String(b.ig_user_id))) return json({ errore: "ig_user_id non valido" }, 400);
      const item = {
        id: crypto.randomUUID(),
        type,
        ig_user_id: b.ig_user_id ? String(b.ig_user_id) : undefined, // vuoto = profilo predefinito
        media_url: type === "carousel" ? b.media_urls[0] : b.media_url,
        media_urls: type === "carousel" ? b.media_urls : undefined,
        cover_url: b.cover_url,
        caption: b.caption || "",
        ai_generated: !!b.ai_generated,
        publish_at: publish_at.toISOString(),
        stato: "programmato",
        creato_at: new Date().toISOString(),
      };
      await salva(env, item);
      return json(item, 201);
    }

    const del = url.pathname.match(/^\/coda\/([\w-]+)$/);
    if (del && request.method === "DELETE") {
      const item = await env.CODA.get(`post:${del[1]}`, "json");
      if (!item) return json({ errore: "Non trovato" }, 404);
      if (item.stato === "pubblicato") return json({ errore: "Già pubblicato: va cancellato da Instagram" }, 409);
      await env.CODA.delete(`post:${del[1]}`);
      return json({ eliminato: del[1] });
    }

    if (url.pathname === "/esegui" && request.method === "POST") {
      return json(await eseguiCoda(env));
    }

    return json({ errore: "Endpoint non trovato" }, 404);
  },

  async scheduled(event, env, ctx) {
    if (event.cron === "0 7 * * *") ctx.waitUntil(controlloToken(env));
    else ctx.waitUntil(eseguiCoda(env));
  },
};
