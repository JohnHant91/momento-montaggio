// FORMATO "PAROLE DIETRO" — ricavato dai reel di riferimento di Johnny (profilo personale):
// la persona a tutto schermo, le frasi diventano parole GIGANTI e colorate DIETRO di lei (persona ritagliata davanti),
// la parola detta in piccolo davanti sul petto, adesivi che esplodono (cuore, fuoco, like, logo), schede di vetro che
// fluttuano ai lati, capitoli a tutto schermo col numero enorme, lampi di luce e push-in sulla persona.
import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "./sicuro";
import { loadFont as sansMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as serifInstrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as serifPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { ease, molle } from "./theme";
import { Grana, Lampo, Coriandoli } from "./Effetti";
import type { Parola, Riga, Scena, Palette } from "./Split";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SANS = sansMontserrat("normal", { weights: ["800", "900"] }).fontFamily;
const SERIF: Record<string, string> = { "Instrument Serif": serifInstrument().fontFamily, "Playfair Display": serifPlayfair("italic").fontFamily };

export type Adesivo = { da: number; tipo: string; lato?: "sx" | "dx" };
export type DietroProps = {
  durata: number; fps: number; video: string; volto: { cx: number; cy: number };
  palette: Palette; font?: { titoli?: string };
  parole: Parola[]; righe: Riga[]; scene: Scena[]; adesivi?: Adesivo[];
  ritaglio?: string | null; finale?: string;
};

// colori "da social" per le righe dietro: bianco, accento, un blu/arancio acceso, alternati
const viva = (pal: Palette) => ["#FFFFFF", pal.accento, "#3FA9F5", "#FF8A1F"];

// ------------------------------------------------------------------ la frase gigante dietro la persona
const FraseDietro: React.FC<{ parole: Parola[]; idx: number[]; t0: number; t1: number; pal: Palette; serif: string; y: number; n: number; maxH?: number }> = ({ parole, idx, t0, t1, pal, serif, y, n, maxH = 9999 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.round((t1 - t0) * fps);
  const usc = interpolate(f, [dur - 5, dur], [0, 1], { ...clamp, easing: ease.in });
  // righe da max ~11 caratteri: l'ultima parola chiave va da sola, più grande
  const righe: number[][] = [];
  let cur: number[] = [], len = 0;
  for (const i of idx) {
    const w = parole[i].t.replace(/[.,!?;:]/g, "");
    if (cur.length && (len + w.length > 11 || parole[i].k)) { righe.push(cur); cur = []; len = 0; }
    cur.push(i); len += w.length + 1;
    if (parole[i].k) { righe.push(cur); cur = []; len = 0; }
  }
  if (cur.length) righe.push(cur);
  const colori = viva(pal);
  // le righe devono stare nella fascia libera sopra la testa: se non ci stanno, si rimpicciolisce tutto il blocco
  const altezza = righe.reduce((a, r, ri) => a + (r.some((i) => parole[i].k) ? 210 : (ri + n) % 3 === 1 ? 120 : 130) * 0.92, 0);
  const fit = Math.max(0.5, Math.min(1, maxH / Math.max(1, altezza)));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, opacity: 1 - usc,
      transform: `scale(${1 + usc * 0.15})`, filter: `blur(${usc * 6}px)` }}>
      {righe.map((r, ri) => {
        const chiave = r.some((i) => parole[i].k);
        const stile = (ri + n) % 3; // 0: sans nero-bianco maiuscolo, 1: serif corsivo, 2: sans colorato
        const col = chiave ? colori[1 + ((n + ri) % 3)] : stile === 1 ? "#FFFFFF" : colori[(ri + n) % 2 === 0 ? 0 : 2];
        const size = (chiave ? 210 : stile === 1 ? 120 : 130) * fit;
        return (
          <div key={ri} style={{ display: "flex", gap: 22, lineHeight: 0.92, whiteSpace: "nowrap" }}>
            {r.map((i, wi) => {
              const k = Math.round((parole[i].da - t0) * fps);
              const s = spring({ frame: f - k + 2, fps, config: molle.bouncy });
              const testo = parole[i].t.replace(/[.,!?;:]/g, "");
              const estruso = chiave ? Array.from({ length: 8 }).map((_, z) => `${z + 1}px ${z + 1}px 0 color-mix(in srgb, ${col} 45%, #000)`).join(",") : "0 8px 24px rgba(0,0,0,.35)";
              return <span key={wi} style={{ fontFamily: stile === 1 && !chiave ? serif : SANS, fontStyle: stile === 1 && !chiave ? "italic" : "normal", fontWeight: 900,
                fontSize: size, color: col, textTransform: stile === 1 && !chiave ? "none" : "uppercase", letterSpacing: chiave ? -4 : -2, textShadow: estruso,
                opacity: interpolate(s, [0, 0.35], [0, 1], clamp), transform: `translateY(${(1 - s) * 70}px) scale(${0.6 + 0.4 * s})`, filter: `blur(${(1 - Math.min(1, s)) * 8}px)` }}>{testo}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ adesivi: icone che esplodono con anelli (dietro la persona)
const ICONE: Record<string, (c: string) => React.ReactNode> = {
  cuore: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#E53935" /><path d="M50 74 L28 52 A12 12 0 0 1 50 34 A12 12 0 0 1 72 52 Z" fill="#fff" /></svg>,
  like: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#1877F2" /><path d="M32 46h10v26H32zM46 72V46l10-16c4 0 6 3 5 7l-2 9h12c4 0 6 3 5 7l-4 14c-1 3-3 5-6 5z" fill="#fff" /></svg>,
  fuoco: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 6c6 18 26 26 26 50a26 26 0 0 1-52 0c0-14 8-20 12-30 4 10 8 12 10 16 2-12 0-24 4-36z" fill="#FF7A00" /><path d="M50 50c3 8 12 12 12 22a12 12 0 0 1-24 0c0-7 6-10 8-16 2 4 3 5 4-6z" fill="#FFD23F" /></svg>,
  stella: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#FFC107" /></svg>,
  soldi: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#1F9D55" /><text x="50" y="68" textAnchor="middle" fontSize="54" fontWeight="900" fill="#fff" fontFamily="Arial">€</text></svg>,
  razzo: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#5B5BF0" /><path d="M50 18c12 10 16 26 12 42H38c-4-16 0-32 12-42z" fill="#fff" /><circle cx="50" cy="40" r="6" fill="#5B5BF0" /><path d="M40 60l-8 12h12zM60 60l8 12H56z" fill="#FFD23F" /></svg>,
  check: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#22A55B" /><path d="M28 52l14 14 30-32" stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  instagram: () => <svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs><rect x="4" y="4" width="92" height="92" rx="26" fill="url(#ig)" /><rect x="24" y="24" width="52" height="52" rx="16" fill="none" stroke="#fff" strokeWidth="7" /><circle cx="50" cy="50" r="12" fill="none" stroke="#fff" strokeWidth="7" /><circle cx="68" cy="32" r="4" fill="#fff" /></svg>,
  ai: (c) => <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill={c} /><path d="M50 18l7 21 21 7-21 7-7 21-7-21-21-7 21-7z" fill="#fff" /></svg>,
};
const Adesivo: React.FC<{ tipo: string; lato: "sx" | "dx"; pal: Palette }> = ({ tipo, lato, pal }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const s = spring({ frame: f, fps, config: molle.bouncy });
  const usc = interpolate(f, [dur - 6, dur], [1, 0], clamp);
  const onda = interpolate(f, [0, 16], [0, 1], { ...clamp, easing: ease.out });
  const x = lato === "sx" ? 40 : 720, y = 800; // ai lati del busto, sotto la fascia delle parole
  return (
    <div style={{ position: "absolute", left: x, top: y + Math.sin(f / 10) * 8, width: 320, height: 320, transform: `scale(${s * usc}) rotate(${(1 - s) * -40 + Math.sin(f / 14) * 5}deg)` }}>
      {[0, 1].map((i) => <div key={i} style={{ position: "absolute", inset: -80 * onda - i * 40, borderRadius: "50%", border: `${10 - i * 4}px solid ${pal.accento}`, opacity: (1 - onda) * 0.8 }} />)}
      <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 20px 30px rgba(0,0,0,.35))" }}>{(ICONE[tipo] || ICONE.ai)(pal.accento)}</div>
    </div>
  );
};

// ------------------------------------------------------------------ scheda di vetro che fluttua di lato (davanti)
const Vetro: React.FC<{ d: any; lato: "sx" | "dx"; serif: string; top?: number }> = ({ d, lato, serif, top = 1200 }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const s = spring({ frame: f, fps, config: molle.snappy });
  const usc = interpolate(f, [dur - 10, dur], [0, 1], clamp);
  const ry = (lato === "sx" ? 22 : -22) + Math.sin(f / 30) * 3;
  return (
    <div style={{ position: "absolute", top: top + Math.sin(f / 18) * 10, [lato === "sx" ? "left" : "right"]: 50, width: 430, perspective: 900, opacity: s * (1 - usc) } as React.CSSProperties}>
      <div style={{ transform: `rotateY(${ry}deg) translateX(${(1 - s) * (lato === "sx" ? -300 : 300)}px)`, background: "rgba(255,255,255,.22)", backdropFilter: "blur(14px)",
        border: "2px solid rgba(255,255,255,.55)", borderRadius: 28, padding: "26px 28px", boxShadow: "0 30px 60px -20px rgba(0,0,0,.45)", color: "#fff" }}>
        {d.etichetta ? <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 }}>{d.etichetta}</div> : null}
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 58, lineHeight: 1.02, marginTop: 6, textShadow: "0 4px 16px rgba(0,0,0,.35)" }}>{d.titolo || d.testo}</div>
        {d.titolo && d.testo ? <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, marginTop: 10, opacity: 0.9 }}>{d.testo}</div> : null}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ capitolo a tutto schermo: numero enorme + titolo (come "1 font pairing")
const Capitolo: React.FC<{ d: any; pal: Palette; serif: string }> = ({ d, pal, serif }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const s = spring({ frame: f, fps, config: molle.smooth });
  const t = spring({ frame: f - 5, fps, config: molle.snappy });
  const usc = interpolate(f, [dur - 10, dur], [0, 1], clamp);
  const ent = interpolate(f, [0, 10], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }); // dissolvenza dalla persona, mai taglio secco
  const fondo = `color-mix(in srgb, ${pal.accento} 55%, #10140f)`;
  return (
    <AbsoluteFill style={{ background: fondo, alignItems: "center", justifyContent: "center", opacity: Math.min(ent, 1 - usc) }}>
      <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 560, lineHeight: 0.8, color: "#F4EFE6", transform: `translateY(${(1 - s) * 80}px) scale(${0.8 + 0.2 * s})`, opacity: s }}>{d.valore ?? d.numero ?? ""}</div>
      <div style={{ fontFamily: serif, fontSize: 96, color: "#F4EFE6", marginTop: 10, textAlign: "center", padding: "0 80px", opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>{d.etichetta || d.titolo || ""}</div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ composizione
export const Dietro: React.FC<DietroProps> = (P) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const serif = SERIF[P.font?.titoli || ""] || SERIF["Instrument Serif"];
  const cy = Math.min(0.45, Math.max(0.2, P.volto?.cy ?? 0.3));
  const scala = 1.0 + 0.06 * (t / Math.max(1, P.durata)); // lento push-in per tutto il video
  const rk = P.righe.find((q) => t >= q.da && t < q.a && q.p.some((i) => P.parole[i]?.k));
  const punch = rk ? 1 + 0.04 * spring({ frame: Math.round((t - rk.da) * fps), fps, config: molle.snappy }) : 1;
  const stileV: React.CSSProperties = { position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover" };
  const capitoli = P.scene.filter((s) => s.pieno);
  const inCapitolo = capitoli.some((s) => t >= s.da && t < s.a);
  // Le parole giganti devono LEGGERSI: se la testa arriva in alto, la persona (video + ritaglio) scende e la fascia
  // sopra la testa resta libera per le frasi; la testa ne copre solo il bordo basso ("dietro", non "coperte").
  const testa = Math.max(0, (cy - 0.17) * 1920); // dove inizia la testa (capelli) nel fotogramma
  const giu = Math.min(480, Math.max(0, 560 - testa)); // quanto scende la persona
  const yFrase = 210; // sotto l'interfaccia di Instagram
  const hFrase = testa + giu + 90 - yFrase; // la testa copre al massimo l'ultima riga di 90 px
  const parolaOra = P.parole.find((p) => t >= p.da && t < p.a + 0.08);
  const strato = (contenuto: React.ReactNode) => <div style={{ position: "absolute", inset: 0, transform: `translateY(${giu}px) scale(${scala * punch})`, transformOrigin: `50% ${cy * 100}%` }}>{contenuto}</div>;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {giu > 0 ? <OffthreadVideo src={staticFile(P.video)} muted style={{ ...stileV, transform: "scale(1.35)", transformOrigin: "50% 0%", filter: "blur(40px) brightness(0.75) saturate(1.2)" }} /> : null}
      {strato(<OffthreadVideo src={staticFile(P.video)} style={stileV} />)}
      {/* adesivi: dietro la persona */}
      {(P.adesivi || []).map((a, i) => (
        <Sequence key={"a" + i} from={Math.round(a.da * fps)} durationInFrames={Math.round(fps * 1.6)} layout="none">
          <Adesivo tipo={a.tipo} lato={a.lato || (i % 2 ? "dx" : "sx")} pal={P.palette} />
        </Sequence>
      ))}
      {/* frasi giganti: dietro la persona */}
      {P.righe.map((r, i) => (
        <Sequence key={"r" + i} from={Math.round(r.da * fps) - 2} durationInFrames={Math.max(6, Math.round((r.a - r.da) * fps) + 6)} layout="none">
          <FraseDietro parole={P.parole} idx={r.p} t0={r.da} t1={r.a + 0.15} pal={P.palette} serif={serif} y={yFrase} n={i} maxH={hFrase} />
        </Sequence>
      ))}
      {/* la persona ritagliata davanti alle scritte */}
      {P.ritaglio ? strato(<OffthreadVideo src={staticFile(P.ritaglio)} transparent style={stileV} />) : null}
      {/* la parola detta, piccola, sul petto */}
      {parolaOra && !inCapitolo ? <div style={{ position: "absolute", left: 0, right: 0, top: Math.min(1500, cy * 1920 + 520 + giu), textAlign: "center", fontFamily: SANS, fontWeight: 800,
        fontSize: 54, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,.6)" }}>{parolaOra.t.replace(/[.,!?;:]/g, "").toLowerCase()}</div> : null}
      {/* schede di vetro (davanti) */}
      {P.scene.filter((s) => !s.pieno && (s.tipo === "card" || s.tipo === "titolo" || s.tipo === "lista")).map((s, i) => (
        <Sequence key={"v" + i} from={Math.round(s.da * fps)} durationInFrames={Math.max(8, Math.min(Math.round((s.a - s.da) * fps), Math.round(fps * 3.2)))} layout="none">
          <Vetro d={s.tipo === "lista" ? { titolo: s.dati?.titolo, testo: (s.dati?.voci || []).join(" · ") } : s.tipo === "titolo" ? { titolo: s.dati?.testo, testo: s.dati?.sotto } : s.dati || {}} lato={i % 2 ? "dx" : "sx"} serif={serif} top={Math.min(1420, cy * 1920 + giu + 380)} />
        </Sequence>
      ))}
      {/* capitoli a tutto schermo */}
      {capitoli.map((s, i) => (
        <Sequence key={"c" + i} from={Math.round(s.da * fps)} durationInFrames={Math.max(8, Math.round((s.a - s.da) * fps))} layout="none">
          <Capitolo d={s.dati || {}} pal={P.palette} serif={serif} />
          <Lampo pal={P.palette} />
        </Sequence>
      ))}
      {/* coriandoli sulle scene che li chiedono */}
      {P.scene.filter((s) => (s.effetti || []).includes("coriandoli")).map((s, i) => (
        <Sequence key={"k" + i} from={Math.round(s.da * fps) + 3} durationInFrames={Math.round(fps * 1.8)} layout="none"><Coriandoli pal={P.palette} x={540} y={700} seme={i} /></Sequence>
      ))}
      <Grana />
      {P.finale === "bianco" || P.finale === "nero" ? <AbsoluteFill style={{ background: P.finale === "nero" ? "#000" : "#fff",
        opacity: interpolate(t, [P.durata - 0.6, P.durata - 0.05], [0, 1], { ...clamp, easing: ease.inOut }) }} /> : null}
    </AbsoluteFill>
  );
};
