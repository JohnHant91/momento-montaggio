// Reel "split educativo": sopra un foglio color carta con griglia dove si animano le grafiche che seguono quello che si
// dice (titoli, siti, terminale, contatori, liste, confronti…), al centro il sottotitolo a pillola nera in stampatello,
// sotto la persona che parla. Ogni tanto la grafica prende tutto lo schermo. Colori e font cambiano con l'argomento:
// li sceglie il Regista nella "palette"; lo stile (impaginazione, movimenti, ritmo) resta sempre lo stesso.
import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "./sicuro";
import { loadFont as serifInstrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as serifPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as serifFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as serifDM } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as sansInter } from "@remotion/google-fonts/Inter";
import { loadFont as sansGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as sansManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as monoJet } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as monoPlex } from "@remotion/google-fonts/IBMPlexMono";
import { ease, molle } from "./theme";
import { Respiro, Cornice, Cursore, Coriandoli, Fantasma, Icone, Lente, Successo, Lampo, Cubo, Grana, EFFETTI_BASE, GLIFI_BASE } from "./Effetti";

const FONT_TITOLI: Record<string, () => { fontFamily: string }> = {
  "Instrument Serif": serifInstrument, "Playfair Display": serifPlayfair, Fraunces: serifFraunces, "DM Serif Display": serifDM,
  Inter: sansInter, "Space Grotesk": sansGrotesk, Manrope: sansManrope,
};
const FONT_TESTO: Record<string, () => { fontFamily: string }> = { Inter: sansInter, "Space Grotesk": sansGrotesk, Manrope: sansManrope };
const FONT_MONO: Record<string, () => { fontFamily: string }> = { "JetBrains Mono": monoJet, "IBM Plex Mono": monoPlex };
const famiglia = (mappa: Record<string, () => { fontFamily: string }>, nome: string | undefined, base: string) => (mappa[nome || ""] || mappa[base])().fontFamily;

export type Parola = { t: string; da: number; a: number; k?: boolean };
export type Riga = { da: number; a: number; p: number[] };
export type Scena = { da: number; a: number; tipo: string; pieno?: boolean; dati: any; effetti?: string[] };
export type Palette = { fondo: string; inchiostro: string; accento: string; secondario: string; tenue: string };
export type SplitProps = {
  durata: number; fps: number; video: string; volto?: { cx: number; cy: number };
  palette: Palette; font?: { titoli?: string; testo?: string; mono?: string };
  parole: Parola[]; righe: Riga[]; scene: Scena[];
  tracker?: { totale: number; voci: { da: number; etichetta: string }[] } | null;
  ritaglio?: string | null; // la persona ritagliata (video con trasparenza) per gli effetti addosso
  finale?: string; // bianco | nero: dissolvenza finale (mai troncato)
  riquadro?: "pieno" | "box"; // box: la persona in un riquadro piccolo centrato in basso (stile reel "Casa smart?"), sfondo chiaro a macchie
};

const ALTO_GRAFICA = 1000; // la metà alta (con un po' di aria) è delle grafiche
const Y_PILLOLA = 1010;
const Y_PERSONA = 1060;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Ctx = { pal: Palette; titoli: string; testo: string; mono: string; fps: number };
const C = React.createContext<Ctx>(null as any);

// entrata (molla) e uscita (veloce) di ogni elemento dentro la sua scena
const useVita = (inizio = 0, molla = molle.snappy) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame: f - inizio, fps, config: molla });
  const u = interpolate(f, [durationInFrames - 6, durationInFrames], [0, 1], clamp);
  return { s, u, f, fps, dur: durationInFrames };
};
const Entra: React.FC<{ ritardo?: number; da?: "basso" | "alto" | "scala"; style?: React.CSSProperties; children: React.ReactNode }> = ({ ritardo = 0, da = "basso", style, children }) => {
  const { s, u } = useVita(ritardo);
  const sp = da === "basso" ? `translateY(${(1 - s) * 40}px)` : da === "alto" ? `translateY(${(s - 1) * 40}px)` : "";
  return <div style={{ ...style, opacity: interpolate(s, [0, 0.5], [0, 1], clamp) * (1 - u), transform: `${sp} scale(${(0.9 + 0.1 * s) * (1 - 0.06 * u)})` }}>{children}</div>;
};

// ------------------------------------------------------------------ sfondo: carta, griglia, crocette
// sfondo a macchie fatto con sfumature radiali: stesso effetto del blur ma si disegna in un attimo (il blur a 110 px
// su 4 cerchi, rifatto a ogni fotogramma, era metà del tempo di render)
const Macchie: React.FC<{ pal: Palette }> = ({ pal }) => {
  const f = useCurrentFrame();
  const m = [[180, 260, 520, pal.accento], [900, 620, 460, pal.secondario], [240, 1250, 560, pal.secondario], [880, 1550, 520, pal.accento]] as const;
  const sfum = m.map(([x, y, r, c], i) => `radial-gradient(circle ${r}px at ${Math.round(x + Math.sin(f / (70 + i * 13) + i) * 40)}px ${Math.round(y + Math.cos(f / (80 + i * 11) + i) * 40)}px, ${c}47 0%, ${c}00 100%)`).join(", ");
  return <AbsoluteFill style={{ background: `${sfum}, ${pal.fondo}` }} />;
};
const Sfondo: React.FC<{ pal: Palette }> = ({ pal }) => {
  const f = useCurrentFrame();
  const croci = [[90, 140], [990, 210], [180, 760], [930, 880], [540, 120], [70, 1500], [1010, 1350]];
  return (
    <AbsoluteFill style={{ background: pal.fondo }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${pal.tenue} 1px, transparent 1px), linear-gradient(90deg, ${pal.tenue} 1px, transparent 1px)`,
        backgroundSize: "90px 90px", backgroundPosition: `${(f * 0.15) % 90}px 0px`, opacity: 0.55 }} />
      {croci.map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, color: pal.tenue, fontSize: 30, fontWeight: 300, opacity: 0.9, transform: `rotate(${(f + i * 40) * 0.2}deg)` }}>+</div>
      ))}
      <div style={{ position: "absolute", left: 120, top: 260, width: 300, height: 300, borderRadius: "50%", border: `2px solid ${pal.tenue}`, opacity: 0.5, transform: `translateY(${Math.sin(f / 40) * 10}px)` }} />
      <div style={{ position: "absolute", right: 110, top: 520, width: 240, height: 180, borderRadius: 24, border: `2px solid ${pal.tenue}`, opacity: 0.5, transform: `translateY(${Math.cos(f / 50) * 10}px)` }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ le scene
const Titolo: React.FC<{ d: any; scrivi?: boolean }> = ({ d, scrivi }) => {
  const x = React.useContext(C);
  const { f, fps } = useVita();
  // il Regista a volte chiama il campo "titolo" o "valore": il titolo non deve mai restare vuoto
  const testo = String(d.testo || d.titolo || d.valore || d.nome || "");
  if (!d.sotto) d = { ...d, sotto: d.sottotitolo || (d.titolo && d.testo && d.testo !== testo ? d.testo : d.etichetta) };
  const parole = testo.split(" ");
  const acc = String(d.accento || "").toLowerCase();
  const èAccento = (p: string) => !!acc && acc.split(" ").includes(p.toLowerCase().replace(/[.,!?:]/g, ""));
  const size = d.grande ? 150 : 112;
  if (scrivi) { // lettera per lettera, col cursore che lampeggia (come nel riferimento)
    const n = Math.floor(interpolate(f, [3, 3 + testo.length * 1.15], [0, testo.length], clamp));
    let resto = n;
    return (
      <div style={{ textAlign: "center", padding: "0 70px" }}>
        <div style={{ fontFamily: x.titoli, fontSize: size, lineHeight: 1.04, color: x.pal.inchiostro, letterSpacing: -2 }}>
          {parole.map((p, i) => {
            const vis = p.slice(0, Math.max(0, resto)); resto -= p.length + 1;
            if (!vis) return null;
            return <span key={i} style={{ fontStyle: èAccento(p) ? "italic" : "normal", color: èAccento(p) ? x.pal.accento : undefined }}>{vis}{i < parole.length - 1 && resto >= 0 ? " " : ""}</span>;
          })}
          <span style={{ display: "inline-block", width: 6, height: size * 0.8, marginLeft: 6, background: x.pal.accento, verticalAlign: "-0.08em", opacity: Math.floor(f / 9) % 2 && n >= testo.length ? 0 : 1 }} />
        </div>
        {d.sotto ? <Entra ritardo={Math.round(testo.length * 1.15) + 6}><div style={{ fontFamily: x.testo, fontSize: 40, color: x.pal.inchiostro, opacity: 0.6, marginTop: 26 }}>{d.sotto}</div></Entra> : null}
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: "0 70px" }}>
      <div style={{ fontFamily: x.titoli, fontSize: size, lineHeight: 1.02, color: x.pal.inchiostro, letterSpacing: -2 }}>
        {parole.map((p, i) => {
          const s = spring({ frame: f - i * 4, fps, config: molle.snappy });
          return <span key={i} style={{ display: "inline-block", marginRight: 26, opacity: interpolate(s, [0, 0.5], [0, 1], clamp), transform: `translateY(${(1 - s) * 50}px)`,
            fontStyle: èAccento(p) ? "italic" : "normal", color: èAccento(p) ? x.pal.accento : undefined }}>{p}</span>;
        })}
      </div>
      {d.sotto ? <Entra ritardo={parole.length * 4 + 4}><div style={{ fontFamily: x.testo, fontSize: 40, color: x.pal.inchiostro, opacity: 0.6, marginTop: 26 }}>{d.sotto}</div></Entra> : null}
    </div>
  );
};

// oggetto 3D che cade e rimbalza, con il titolo scritto sopra
const Oggetto: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
      {d.titolo ? <Titolo d={{ testo: d.titolo, accento: d.accento }} scrivi /> : null}
      <Cubo pal={x.pal} simbolo={String(d.simbolo || "✦").slice(0, 3)} font={x.testo} />
    </div>
  );
};

// il numero gigante lo disegna il "fantasma" dietro: qui un tondo pieno col numero e l'etichetta grande
const Numero: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36, padding: "0 90px" }}>
      <Entra da="scala"><div style={{ width: 170, height: 170, borderRadius: "50%", background: x.pal.accento, color: "#fff", display: "grid", placeItems: "center",
        fontFamily: x.titoli, fontSize: 110, lineHeight: 1, boxShadow: "0 24px 50px -20px rgba(0,0,0,.35)" }}>{d.valore}</div></Entra>
      <Entra ritardo={6}><div style={{ fontFamily: x.titoli, fontSize: 88, color: x.pal.inchiostro, lineHeight: 1.02, maxWidth: 640 }}>{d.etichetta}</div></Entra>
    </div>
  );
};

const Finestra: React.FC<{ titolo?: string; scuro?: boolean; children: React.ReactNode; larga?: number }> = ({ titolo, scuro, children, larga = 900 }) => {
  const x = React.useContext(C);
  return (
    <div style={{ width: larga, background: scuro ? "#16171B" : "#fff", borderRadius: 26, boxShadow: "0 30px 70px -25px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: scuro ? "#202127" : "#F4F3F0" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: "50%", background: c }} />)}
        {titolo ? <div style={{ marginLeft: 18, flex: 1, height: 32, borderRadius: 8, background: scuro ? "#2A2B31" : "#fff", color: scuro ? "#9a9a9a" : "#6b6b6b",
          fontFamily: x.mono, fontSize: 20, display: "flex", alignItems: "center", padding: "0 14px", overflow: "hidden", whiteSpace: "nowrap" }}>{titolo}</div> : null}
      </div>
      {children}
    </div>
  );
};

const Sito: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const { f, dur } = useVita();
  const z = interpolate(f, [0, dur], [1, 1.08], clamp);
  const ev = d.evidenzia;
  return (
    <Entra da="scala">
      <Finestra titolo={d.indirizzo || d.titolo}>
        <div style={{ height: 560, overflow: "hidden", position: "relative", background: "#fafafa" }}>
          {d.img ? <Img src={staticFile(d.img)} style={{ width: "100%", transform: `scale(${z})`, transformOrigin: "50% 0%" }} />
            : <div style={{ padding: 50, fontFamily: x.titoli, fontSize: 70, color: x.pal.inchiostro }}>{d.titolo}</div>}
          {ev ? <div style={{ position: "absolute", left: `${ev.x * 100}%`, top: `${ev.y * 100}%`, width: `${ev.w * 100}%`, height: `${ev.h * 100}%`,
            border: `5px solid ${x.pal.accento}`, borderRadius: 12, opacity: interpolate(f, [12, 20], [0, 1], clamp) }} /> : null}
        </div>
      </Finestra>
    </Entra>
  );
};

const Terminale: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const { f } = useVita();
  const cmd = String(d.comando || "");
  const scritti = Math.floor(interpolate(f, [4, 4 + cmd.length * 1.4], [0, cmd.length], clamp));
  const fineCmd = 4 + cmd.length * 1.4;
  const righe: string[] = d.righe || [];
  return (
    <Entra da="scala">
      <Finestra scuro larga={920}>
        <div style={{ padding: "30px 34px", fontFamily: x.mono, fontSize: 34, color: "#EDEDED", minHeight: 300, lineHeight: 1.5 }}>
          <div><span style={{ color: x.pal.accento }}>$ </span>{cmd.slice(0, scritti)}<span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1 }}>▌</span></div>
          {righe.map((r, i) => (
            <div key={i} style={{ color: i === righe.length - 1 ? "#5FD38D" : "#A9A9A9", opacity: interpolate(f, [fineCmd + 6 + i * 6, fineCmd + 10 + i * 6], [0, 1], clamp) }}>{r}</div>
          ))}
        </div>
      </Finestra>
    </Entra>
  );
};

const Contatore: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const { f, fps } = useVita();
  const da = Number(d.da) || 0, a = Number(d.a) || 0;
  const v = interpolate(f, [4, 4 + fps * 1.2], [da, a], { ...clamp, easing: ease.out });
  const dec = Math.abs(a) < 10 && !Number.isInteger(a) ? 1 : 0;
  return (
    <Entra da="scala">
      <div style={{ background: "#fff", borderRadius: 34, padding: "50px 80px", textAlign: "center", boxShadow: "0 30px 70px -25px rgba(0,0,0,.3)" }}>
        <div style={{ fontFamily: x.titoli, fontSize: 210, lineHeight: 1, color: x.pal.accento }}>{d.prefisso || ""}{v.toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: dec })}{d.suffisso || ""}</div>
        <div style={{ fontFamily: x.testo, fontSize: 40, color: x.pal.inchiostro, opacity: 0.65, marginTop: 10 }}>{d.etichetta}</div>
      </div>
    </Entra>
  );
};

// Icone Iconify (set Phosphor, MIT): "ph:coffee-bold" → svg vettoriale del colore giusto. Qualsiasi altro testo resta com'è.
const ICONA_RE = /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/;
export const Icona: React.FC<{ nome?: string; colore: string; lato: number }> = ({ nome, colore, lato }) => {
  if (!nome) return null;
  if (!ICONA_RE.test(nome)) return <span style={{ fontSize: lato * 0.85, lineHeight: 1 }}>{nome}</span>;
  const [set, n] = nome.split(":");
  return <Img src={`https://api.iconify.design/${set}/${n}.svg?color=${encodeURIComponent(colore)}&height=${lato * 2}`} style={{ width: lato, height: lato }} maxRetries={2} onError={() => { /* icona non arrivata: il riquadro resta vuoto, il reel si monta lo stesso */ }} />;
};

const Lista: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const voci: string[] = (d.voci || []).slice(0, 6);
  return (
    <div style={{ width: 880 }}>
      {d.titolo ? <Entra><div style={{ fontFamily: x.titoli, fontSize: 76, color: x.pal.inchiostro, marginBottom: 28 }}>{d.titolo}</div></Entra> : null}
      {voci.map((v, i) => (
        <Entra key={i} ritardo={6 + i * 7}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, background: "#fff", borderRadius: 22, padding: "22px 28px", marginBottom: 16, boxShadow: "0 14px 34px -20px rgba(0,0,0,.35)" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: d.spunte ? "#E7F6EC" : x.pal.accento, color: d.spunte ? "#22A55B" : "#fff",
              fontFamily: x.testo, fontWeight: 800, fontSize: 30, display: "grid", placeItems: "center" }}>{d.spunte ? <Icona nome="ph:check-bold" colore="#22A55B" lato={32} /> : (d.icone?.[i] ? <Icona nome={d.icone[i]} colore="#ffffff" lato={30} /> : i + 1)}</div>
            <div style={{ fontFamily: x.testo, fontSize: 40, color: x.pal.inchiostro, fontWeight: 600 }}>{v}</div>
          </div>
        </Entra>
      ))}
    </div>
  );
};

const Confronto: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const lato = (o: any, buono: boolean, rit: number) => (
    <Entra ritardo={rit} style={{ flex: 1 }}>
      <div style={{ background: "#fff", borderRadius: 26, padding: 30, minHeight: 300, boxShadow: "0 24px 50px -25px rgba(0,0,0,.35)", borderTop: `10px solid ${buono ? x.pal.accento : "#B9B6AF"}` }}>
        <div style={{ fontFamily: x.mono, fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: buono ? x.pal.accento : "#8A8780" }}>{o?.titolo || (buono ? "dopo" : "prima")}</div>
        {(o?.voci || []).slice(0, 4).map((v: string, i: number) => (
          <div key={i} style={{ fontFamily: x.testo, fontSize: 34, color: x.pal.inchiostro, marginTop: 22, display: "flex", gap: 14 }}>
            <span style={{ color: buono ? "#22A55B" : "#E5484D", fontWeight: 800 }}>{buono ? "✓" : "✕"}</span><span style={{ opacity: buono ? 1 : 0.6 }}>{v}</span>
          </div>
        ))}
      </div>
    </Entra>
  );
  return <div style={{ display: "flex", gap: 26, width: 940 }}>{lato(d.prima, false, 0)}{lato(d.dopo, true, 8)}</div>;
};

const Card: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  return (
    <Entra da="scala">
      <div style={{ width: 820, background: "#fff", borderRadius: 32, padding: 46, boxShadow: "0 30px 70px -25px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {d.icona ? <div style={{ width: 92, height: 92, borderRadius: 26, background: x.pal.secondario, display: "grid", placeItems: "center", fontSize: 52 }}><Icona nome={d.icona} colore={x.pal.inchiostro} lato={54} /></div> : null}
          <div style={{ fontFamily: x.titoli, fontSize: 68, color: x.pal.inchiostro, lineHeight: 1.05 }}>{d.titolo}</div>
        </div>
        {d.testo ? <div style={{ fontFamily: x.testo, fontSize: 36, color: x.pal.inchiostro, opacity: 0.7, marginTop: 24, lineHeight: 1.35 }}>{d.testo}</div> : null}
        {d.etichetta ? <div style={{ display: "inline-block", marginTop: 26, background: x.pal.accento, color: "#fff", fontFamily: x.mono, fontSize: 24, padding: "8px 18px", borderRadius: 10, letterSpacing: 2 }}>{d.etichetta}</div> : null}
      </div>
    </Entra>
  );
};

const Chat: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const { f } = useVita();
  const msg: { chi: string; testo: string }[] = (d.messaggi || []).slice(0, 4);
  return (
    <div style={{ width: 880, display: "flex", flexDirection: "column", gap: 18 }}>
      {msg.map((m, i) => {
        const tu = m.chi !== "ai";
        const inizio = i * 16;
        const n = Math.floor(interpolate(f, [inizio + 4, inizio + 4 + m.testo.length * 0.6], [0, m.testo.length], clamp));
        return (
          <Entra key={i} ritardo={inizio} style={{ alignSelf: tu ? "flex-end" : "flex-start", maxWidth: 700 }}>
            <div style={{ background: tu ? x.pal.inchiostro : "#fff", color: tu ? "#fff" : x.pal.inchiostro, borderRadius: 28, padding: "22px 30px", fontFamily: x.testo, fontSize: 36,
              lineHeight: 1.3, boxShadow: "0 14px 34px -20px rgba(0,0,0,.35)", borderBottomRightRadius: tu ? 8 : 28, borderBottomLeftRadius: tu ? 28 : 8 }}>
              {tu ? m.testo : m.testo.slice(0, n)}
            </div>
          </Entra>
        );
      })}
    </div>
  );
};

const Barre: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const { f, fps } = useVita();
  const voci: { etichetta: string; valore: number }[] = (d.voci || []).slice(0, 5);
  const max = Math.max(1, ...voci.map((v) => Number(v.valore) || 0));
  return (
    <Entra da="scala">
      <div style={{ width: 880, background: "#fff", borderRadius: 30, padding: 44, boxShadow: "0 30px 70px -25px rgba(0,0,0,.3)" }}>
        {d.titolo ? <div style={{ fontFamily: x.titoli, fontSize: 60, color: x.pal.inchiostro, marginBottom: 26 }}>{d.titolo}</div> : null}
        {voci.map((v, i) => {
          const s = spring({ frame: f - 8 - i * 5, fps, config: molle.smooth });
          const ultimo = i === voci.length - 1 || v.valore === max;
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: x.testo, fontSize: 30, color: x.pal.inchiostro, marginBottom: 8 }}>
                <span>{v.etichetta}</span><span style={{ fontWeight: 700 }}>{Math.round(v.valore * s).toLocaleString("it-IT")}{d.unita || ""}</span>
              </div>
              <div style={{ height: 30, borderRadius: 15, background: "#EFEDE8" }}>
                <div style={{ height: 30, borderRadius: 15, width: `${(v.valore / max) * 100 * s}%`, background: ultimo ? x.pal.accento : x.pal.secondario }} />
              </div>
            </div>
          );
        })}
      </div>
    </Entra>
  );
};

const Riepilogo: React.FC<{ d: any }> = ({ d }) => {
  const x = React.useContext(C);
  const voci: { nome: string; valore?: string }[] = (d.voci || []).slice(0, 7);
  return (
    <Entra da="scala">
      <div style={{ width: 820, background: "#fff", borderRadius: 30, padding: "34px 40px", boxShadow: "0 30px 70px -25px rgba(0,0,0,.3)" }}>
        <div style={{ fontFamily: x.mono, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: x.pal.accento, marginBottom: 14 }}>{d.titolo || "riepilogo"}</div>
        {voci.map((v, i) => (
          <Entra key={i} ritardo={6 + i * 5}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: i ? "1px solid #EEE" : "none", fontFamily: x.testo, fontSize: 36, color: x.pal.inchiostro }}>
              <span style={{ fontWeight: 600 }}>{v.nome}</span><span style={{ color: x.pal.accento, fontWeight: 700 }}>{v.valore || ""}</span>
            </div>
          </Entra>
        ))}
      </div>
    </Entra>
  );
};

const SCENE: Record<string, React.FC<{ d: any; scrivi?: boolean }>> = { oggetto: Oggetto, titolo: Titolo, numero: Numero, sito: Sito, terminale: Terminale, contatore: Contatore, lista: Lista, confronto: Confronto, card: Card, chat: Chat, barre: Barre, riepilogo: Riepilogo };

// ------------------------------------------------------------------ barra "1/5" degli elementi della lista
const Tracker: React.FC<{ tr: NonNullable<SplitProps["tracker"]>; t: number; pieno: number }> = ({ tr, t, pieno }) => {
  const x = React.useContext(C);
  const fatti = tr.voci.filter((v) => v.da <= t).length;
  const corrente = tr.voci.filter((v) => v.da <= t).slice(-1)[0];
  const primo = tr.voci[0]?.da ?? 0;
  if (t < primo - 1.6) return null;
  const s = spring({ frame: Math.round((t - (primo - 1.6)) * x.fps), fps: x.fps, config: molle.snappy });
  const cella = 50, larg = tr.totale * cella;
  return (
    <div style={{ position: "absolute", top: 120 + pieno * 20, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * -40}px)`, zIndex: 15 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 18, padding: "12px 18px", boxShadow: "0 10px 30px -18px rgba(0,0,0,.4)" }}>
        {Array.from({ length: tr.totale }).map((_, i) => {
          const v = tr.voci[i];
          const k = v ? (t - v.da) * x.fps : -1; // fotogrammi da quando la voce è arrivata
          const pulsa = k >= 0 && k < 14 ? 1 + Math.sin((k / 14) * Math.PI) * 0.25 : 1;
          return <div key={i} style={{ width: 40, height: 40, borderRadius: 10, background: i < fatti ? x.pal.accento : "#F0EEE9", color: "#fff", fontFamily: x.testo, fontWeight: 800, fontSize: 20,
            display: "grid", placeItems: "center", transform: `scale(${pulsa})`, boxShadow: k >= 0 && k < 14 ? `0 0 0 ${8 * Math.sin((k / 14) * Math.PI)}px color-mix(in srgb, ${x.pal.accento} 25%, transparent)` : "none" }}>{i < fatti ? i + 1 : ""}</div>;
        })}
        <div style={{ fontFamily: x.mono, fontSize: 22, color: "#8A8780", marginLeft: 8 }}>{fatti}/{tr.totale}</div>
        {corrente ? <div style={{ fontFamily: x.testo, fontWeight: 700, fontSize: 24, color: x.pal.inchiostro, marginLeft: 8, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{corrente.etichetta}</div> : null}
        {tr.voci.map((v, i) => { // il pezzo che vola dal centro della grafica nella sua casella
          const k = (t - v.da) * x.fps;
          if (k < 0 || k > 14) return null;
          const e = ease.inOut(k / 14);
          const dx = 18 + i * cella + 20, sx = 540 - (540 - larg / 2 - 18) , dy0 = 360;
          const px = interpolate(e, [0, 1], [sx, dx]), py = interpolate(e, [0, 1], [dy0, 20]) - Math.sin(e * Math.PI) * 120;
          return <div key={i} style={{ position: "absolute", left: px - 22, top: py - 22, width: 44, height: 44, borderRadius: 12, background: x.pal.accento, transform: `scale(${1.4 - 0.4 * e}) rotate(${(1 - e) * 120}deg)` }} />;
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ sottotitolo a pillola
const Pillola: React.FC<{ parole: Parola[]; righe: Riga[]; t: number; y: number; morbida?: boolean }> = ({ parole, righe, t, y, morbida }) => {
  const x = React.useContext(C);
  const f = useCurrentFrame();
  const r = righe.find((q) => t >= q.da - 0.04 && t < q.a + 0.12) || null;
  if (!r) return null;
  const s = spring({ frame: Math.max(0, f - Math.round(r.da * x.fps)), fps: x.fps, config: molle.bouncy });
  if (morbida) return ( // karaoke: frase in minuscolo, la parola detta adesso si accende
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 20 }}>
      <div style={{ background: "#10241A", borderRadius: 999, padding: "10px 26px", transform: `scale(${0.9 + 0.1 * s})`, boxShadow: "0 12px 26px -14px rgba(0,0,0,.5)",
        fontFamily: x.testo, fontWeight: 800, fontSize: 40, whiteSpace: "nowrap" }}>
        {r.p.map((i, k) => { const w = parole[i]; const ora = w && t >= w.da - 0.03; return <span key={k} style={{ color: ora && t < (w?.a ?? 0) + 0.1 ? x.pal.accento : "#fff", marginRight: k < r.p.length - 1 ? 12 : 0 }}>{(w?.t || "").replace(/[;:…]+$/, "")}</span>; })}
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 20 }}>
      <div style={{ background: "#141416", borderRadius: 14, padding: "12px 22px", transform: `scale(${0.85 + 0.15 * s})`, boxShadow: "0 14px 30px -14px rgba(0,0,0,.6)",
        fontFamily: x.mono, fontWeight: 700, fontSize: 44, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {r.p.map((i, k) => <span key={k} style={{ color: parole[i]?.k ? x.pal.accento : "#fff", marginRight: k < r.p.length - 1 ? 18 : 0 }}>{(parole[i]?.t || "").replace(/[.,;:!?…]+$/, "")}</span>)}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ effetti addosso (servono la persona ritagliata)
const ScrittaDietro: React.FC<{ testo: string; k: number; pal: Palette; font: string }> = ({ testo, k, pal, font }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: k, fps, config: molle.snappy });
  return <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: font, fontSize: testo.length > 8 ? 210 : 290, lineHeight: 0.9, letterSpacing: -6,
    color: pal.accento, textTransform: "uppercase", fontWeight: 800, opacity: interpolate(s, [0, 0.4], [0, 1], clamp), transform: `translateY(${(1 - s) * 120}px) scale(${0.85 + 0.15 * s})` }}>{testo}</div>;
};
const Fuori: React.FC<{ video: string; stile: React.CSSProperties; adesivo: boolean; pal: Palette; mono: string; yBox: number }> = ({ video, stile, adesivo, pal, mono, yBox }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const su = spring({ frame: f, fps, config: molle.bouncy });
  const giu = interpolate(f, [dur - 10, dur], [0, 1], { ...clamp, easing: ease.in });
  const k = su * (1 - giu);
  // esce: la stessa persona, ingrandita e alzata, con la testa fuori dal riquadro. adesivo: contorno bianco + ombra + cornice
  const alza = adesivo ? 430 : 0, sc = adesivo ? 0.62 : 1.22; // esce: cresce dal petto in su, la testa supera il bordo e copre la persona sotto
  const bordo = adesivo ? "drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 18px 24px rgba(0,0,0,.35))" : "drop-shadow(0 20px 30px rgba(0,0,0,.35))";
  return (
    <div style={{ position: "absolute", left: 0, top: yBox, width: 1080, height: 1920 - Y_PERSONA, pointerEvents: "none", zIndex: 18,
      transform: `translateY(${-alza * k}px) scale(${1 + (sc - 1) * k}) rotate(${adesivo ? -4 * k : 0}deg)`, transformOrigin: adesivo ? "50% 30%" : "50% 78%", opacity: adesivo ? Math.min(1, k * 1.5) : 1 }}>
      <div style={{ position: "absolute", inset: 0, filter: bordo }}>
        <OffthreadVideo src={staticFile(video)} transparent style={stile} />
      </div>
      {adesivo ? <div style={{ position: "absolute", left: 210, right: 210, top: -10, height: 760, border: `4px dashed ${pal.accento}`, borderRadius: 8, opacity: interpolate(f, [8, 14], [0, 1], clamp) * (1 - giu) }}>
        <div style={{ position: "absolute", left: -4, top: -44, background: pal.accento, color: "#fff", fontFamily: mono, fontSize: 22, padding: "6px 12px", borderRadius: 6 }}>johnny.png</div>
      </div> : null}
    </div>
  );
};

// ------------------------------------------------------------------ composizione
export const Split: React.FC<SplitProps> = (P) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const ctx: Ctx = { pal: P.palette, fps, titoli: famiglia(FONT_TITOLI, P.riquadro === "box" ? (["Inter", "Space Grotesk", "Manrope"].includes(P.font?.titoli || "") ? P.font?.titoli : "Manrope") : P.font?.titoli, "Instrument Serif"), testo: famiglia(FONT_TESTO, P.font?.testo, "Inter"), mono: famiglia(FONT_MONO, P.font?.mono, "JetBrains Mono") };
  // quanto la grafica è "a tutto schermo" adesso (0-1), con passaggi morbidi
  const pieno = P.scene.reduce((m, s) => (s.pieno ? Math.max(m, interpolate(t, [s.da - 0.35, s.da + 0.25, s.a - 0.25, s.a + 0.15], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) })) : m), 0);
  const zona = { top: 0, height: ALTO_GRAFICA + pieno * (1650 - ALTO_GRAFICA) };
  const cy = P.volto?.cy ?? 0.32;
  const scala = 1.05;
  const stileVideo: React.CSSProperties = { position: "absolute", left: (1080 - 1080 * scala) / 2, top: 0, width: 1080 * scala, height: 1920 * scala, objectFit: "cover" };
  // effetti addosso: la scena corrente chiede la scritta dietro, la persona che esce dal riquadro o l'adesivo?
  const scenaOra = P.scene.find((s) => t >= s.da && t < s.a);
  const effOra = scenaOra ? scenaOra.effetti || [] : [];
  const kOra = scenaOra ? (t - scenaOra.da) * fps : 0;
  const dietro = scenaOra && effOra.includes("dietro") ? { testo: String(scenaOra.dati?.dietro || scenaOra.dati?.accento || scenaOra.dati?.titolo || scenaOra.dati?.testo || "").split(" ").slice(0, 2).join(" "), k: kOra } : null;
  // punch: le frasi con una parola chiave fanno avvicinare un poco la persona
  const rk = P.righe.find((q) => t >= q.da && t < q.a && q.p.some((i) => P.parole[i]?.k));
  const punch = rk ? 1 + 0.035 * spring({ frame: Math.round((t - rk.da) * fps), fps, config: molle.snappy }) : 1;
  const box = P.riquadro === "box";
  // BOX: si apre con la persona grande (gancio), poi si stringe in un riquadro centrato con bordo colorato; sulle scene piene si stringe ancora
  const inizioBox = P.scene.find((q) => q.da > 1.2)?.da ?? 2.8;
  const kb = box ? interpolate(t, [inizioBox - 0.25, inizioBox + 0.35], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;
  const stretto = 1 - 0.35 * pieno;
  const bw = interpolate(kb, [0, 1], [1080, 560 * stretto]), bh = interpolate(kb, [0, 1], [1440, 740 * stretto]);
  const bx = (1080 - bw) / 2, by = interpolate(kb, [0, 1], [480, 1920 - 740 * stretto - 150]);
  const geo = box ? { left: bx, top: by, width: bw, height: bh } : { left: 0, top: Y_PERSONA, width: 1080, height: 1920 - Y_PERSONA };
  const hPersona = geo.height;
  if (box) { // il video copre il riquadro, viso a ~1/3
    const wv = bw * 1.06, hv = wv * 1920 / 1080;
    Object.assign(stileVideo, { left: (bw - wv) / 2, width: wv, height: hv, top: Math.max(bh - hv, Math.min(0, bh * 0.36 - cy * hv)) });
  } else stileVideo.top = Math.max(hPersona - 1920 * scala, Math.min(0, 330 - cy * 1920 * scala)); // il viso a ~1/3 del riquadro
  if (box) { zona.top = 0; zona.height = by - 110; }
  // MULTICAMERA nel riquadro: da una ripresa dritta, più "camere" (larga, media, primo piano, di lato). Si cambia a inizio
  // frase, almeno ogni 2,2 s, con uno scatto di 5 fotogrammi che poi resta fermo. Il viso resta sempre dentro il riquadro.
  if (box) {
    const CAM: [number, number][] = [[1, 0], [1.28, 0], [1.14, -5], [1.5, 0], [1.14, 5], [1.36, 0], [1.06, 0], [1.44, -3]];
    const tagli = React.useMemo(() => {
      const out = [0]; let ultimo = 0;
      P.righe.forEach((r, i) => {
        const prima = i ? P.parole[P.righe[i - 1].p.slice(-1)[0]]?.t || "" : "";
        if (i && r.da - ultimo >= 2.2 && (/[.!?]$/.test(prima) || r.da - ultimo >= 4.5)) { out.push(r.da); ultimo = r.da; }
      });
      return out;
    }, [P.righe, P.parole]);
    let k = 0; while (k + 1 < tagli.length && tagli[k + 1] <= t) k++;
    const [z1, x1] = CAM[k % CAM.length], [z0, x0] = k ? CAM[(k - 1) % CAM.length] : CAM[0];
    const m = interpolate(t, [tagli[k], tagli[k] + 5 / fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const z = z0 + (z1 - z0) * m, dx = x0 + (x1 - x0) * m;
    Object.assign(stileVideo, { transform: `translateX(${dx}%) scale(${z})`, transformOrigin: `50% ${cy * 100}%`, filter: m < 1 && k ? `blur(${(1 - m) * 6}px)` : undefined });
  }
  return (
    <C.Provider value={ctx}>
      <AbsoluteFill>
        {box ? <Macchie pal={P.palette} /> : <Sfondo pal={P.palette} />}
        {/* la persona, sotto (piccolo "punch" sulle frasi con parole chiave) */}
        <div style={{ position: "absolute", ...geo, overflow: "hidden", zIndex: 5,
          ...(box ? { borderRadius: 40 * kb, border: `${6 * kb}px solid ${P.palette.accento}`, boxShadow: `0 30px 60px -30px rgba(0,0,0,${0.45 * kb})` }
            : { opacity: 1 - pieno, transform: `translateY(${pieno * 160}px)`, borderTop: `2px solid ${P.palette.tenue}` }) }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${punch})`, transformOrigin: "50% 35%" }}>
            <OffthreadVideo src={staticFile(P.video)} style={stileVideo} />
            {/* scritta gigante DIETRO la persona: la persona ritagliata ci passa davanti */}
            {P.ritaglio && dietro ? <>
              <ScrittaDietro testo={dietro.testo} k={dietro.k} pal={P.palette} font={ctx.titoli} />
              <OffthreadVideo src={staticFile(P.ritaglio)} transparent style={stileVideo} />
            </> : null}
          </div>
          {box ? null : <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, transparent 60%, rgba(0,0,0,.25) 100%)" }} />}
        </div>
        {/* le grafiche, sopra */}
        <div style={{ position: "absolute", left: 0, right: 0, ...zona, ...(box ? { fontWeight: 800, letterSpacing: -1 } : {}) }}>
          {P.scene.map((s, i) => {
            const Comp = SCENE[s.tipo];
            if (!Comp) return null;
            const da = Math.round(s.da * fps), dur = Math.max(6, Math.round((s.a - s.da) * fps));
            // box: grafica pulita, niente decorazioni sparse (icone, lente, numero fantasma, lampi, cursore)
            const eff = box ? [] : (s.effetti || EFFETTI_BASE[s.tipo] || []); // box: grafica pulita, nessun effetto
            const ha = (e: string) => eff.includes(e);
            const fant = s.tipo === "numero" ? String(s.dati?.valore ?? "") : P.tracker ? String((P.tracker.voci.findIndex((v) => v.da >= s.da - 0.3 && v.da < s.a) + 1) || "") : "";
            const succ = ha("successo") ? (s.dati?.successo || (s.tipo === "terminale" ? (s.dati?.righe || []).slice(-1)[0] : s.tipo === "riepilogo" ? "fatto" : "")) : "";
            let corpo = <Comp d={s.dati || {}} scrivi={ha("scrivi")} />;
            if (ha("cornice")) corpo = <Cornice pal={P.palette} mono={ctx.mono} etichetta={s.dati?.etichetta_cornice || s.dati?.etichetta || s.dati?.titolo?.split(" ")[0]}>{corpo}</Cornice>;
            return (
              <Sequence key={i} from={da} durationInFrames={dur} layout="none">
                {ha("fantasma") && fant ? <Fantasma pal={P.palette} testo={fant} font={ctx.titoli} /> : null}
                <div style={{ position: "absolute", inset: 0, paddingTop: P.tracker ? 120 : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Respiro seme={i} scossa={ha("scossa") ? Math.round(fps * 1.3) : undefined}>{box ? <div style={{ transform: `scale(${s.tipo === "titolo" && String(s.dati?.testo || s.dati?.titolo || "").length > 11 ? 0.95 : 1.15})` }}>{corpo}</div> : corpo}</Respiro>
                </div>
                {ha("icone") ? <Icone pal={P.palette} glifi={s.dati?.decor || GLIFI_BASE[s.tipo] || []} font={ctx.mono} seme={i} /> : null}
                {ha("lente") ? <Lente pal={P.palette} /> : null}
                {ha("cursore") ? <Cursore pal={P.palette} x={620} y={(zona.height + (P.tracker ? 120 : 0)) / 2 + 60} /> : null}
                {succ ? <Successo testo={String(succ).slice(0, 40)} font={ctx.testo} /> : null}
                {i > 0 && !box ? <Lampo pal={P.palette} /> : null}
              </Sequence>
            );
          })}
        </div>
        {/* la persona che esce dal riquadro (la testa passa sopra le grafiche) oppure l'adesivo con contorno e cornice */}
        {!box && P.ritaglio && scenaOra && (effOra.includes("esce") || effOra.includes("adesivo")) ? (
          <Sequence from={Math.round(scenaOra.da * fps)} durationInFrames={Math.max(6, Math.round((scenaOra.a - scenaOra.da) * fps))} layout="none">
            <Fuori video={P.ritaglio} stile={stileVideo} adesivo={effOra.includes("adesivo")} pal={P.palette} mono={ctx.mono} yBox={Y_PERSONA + pieno * 160} />
          </Sequence>) : null}
        {/* coriandoli: partono dalla grafica e attraversano tutto lo schermo, persona compresa */}
        {P.scene.map((s, i) => (!box && (s.effetti || EFFETTI_BASE[s.tipo] || []).includes("coriandoli") ? (
          <Sequence key={"c" + i} from={Math.round(s.da * fps) + 4} durationInFrames={Math.round(fps * 1.8)} layout="none">
            <Coriandoli pal={P.palette} x={540} y={zona.height * 0.5} seme={i} />
          </Sequence>) : null))}
        {P.tracker ? (box ? <div style={{ position: "absolute", inset: 0, transform: "scale(1.5)", transformOrigin: "50% 70px", pointerEvents: "none", opacity: kb }}><Tracker tr={P.tracker} t={t} pieno={0} /></div> : <Tracker tr={P.tracker} t={t} pieno={pieno} />) : null}
        <Pillola parole={P.parole} righe={P.righe} t={t} y={box ? by - 78 : Y_PILLOLA - 40 + pieno * 640} morbida={box} />
        <Grana />
        {/* chiusura: dissolvenza al bianco (o al nero) negli ultimi 0,6 s, dopo l'ultima parola */}
        {P.finale === "bianco" || P.finale === "nero" ? <AbsoluteFill style={{ background: P.finale === "nero" ? "#000" : "#fff", pointerEvents: "none",
          opacity: interpolate(t, [P.durata - 0.6, P.durata - 0.05], [0, 1], { ...clamp, easing: ease.inOut }) }} /> : null}
      </AbsoluteFill>
    </C.Provider>
  );
};
