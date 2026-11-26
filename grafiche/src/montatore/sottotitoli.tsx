// Sottotitoli animati, sempre SOTTO il viso (fascia 1180-1480, dentro la safe zone di Reels/TikTok/Shorts).
// Stili: karaoke (pillola, la parola detta si accende), box (riquadro colorato che scorre di parola in parola, come la
// skill talking-head-reel), pop (1-3 parole che saltano fuori), grassetto (bianco con bordo, parole chiave colorate),
// minimal (pulito con ombra), neon (parola detta che si illumina), chiave (frase bianca, parola chiave grande e colorata),
// contorno (lettere vuote con bordo d'accento, la parola detta si riempie), macchina (lettere che si scrivono col cursore),
// mano (scritto a mano, minuscolo, sottolineatura a pennello). Le parole chiave si colorano con l'accento.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type ParolaS = { t: string; da: number; a: number; k?: boolean };
export type SottotitoliProps = {
  stile?: "karaoke" | "box" | "pop" | "grassetto" | "minimal" | "neon" | "chiave" | "contorno" | "macchina" | "mano";
  parole: ParolaS[];
  gruppi?: number[][];     // indici delle parole per riga (se manca: 3 parole a gruppo, spezzate sulle pause)
  y?: number;              // centro verticale (px); il motore lo mette sotto il mento
  accento?: string; font?: string; maiuscolo?: boolean;
  nascondi?: { da: number; a: number }[]; // momenti senza sottotitoli (es. mentre c'è un titolo in basso)
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

function raggruppa(p: ParolaS[], max = 3): number[][] {
  const g: number[][] = [];
  let cur: number[] = [];
  p.forEach((w, i) => {
    cur.push(i);
    const pausa = p[i + 1] ? p[i + 1].da - w.a : 1;
    if (cur.length >= max || pausa > 0.35 || /[.,!?;:]$/.test(w.t)) { g.push(cur); cur = []; }
  });
  if (cur.length) g.push(cur);
  return g;
}

export const Sottotitoli: React.FC<SottotitoliProps> = (S) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const P = S.parole || [];
  if (!P.length) return null;
  if ((S.nascondi || []).some((x) => t >= x.da && t < x.a)) return null;
  const stile = S.stile || "box";
  const gruppi = S.gruppi?.length ? S.gruppi : raggruppa(P, stile === "pop" ? 2 : 3);
  const gi = gruppi.findIndex((g, i) => { const da = P[g[0]].da - 0.06, fine = gruppi[i + 1] ? P[gruppi[i + 1][0]].da - 0.06 : P[g[g.length - 1]].a + 0.5; return t >= da && t < fine; });
  if (gi < 0) return null;
  const g = gruppi[gi];
  const ent = t - (P[g[0]].da - 0.06);
  const y = Math.min(S.y || 1100, 1100); // il riquadro (±110) resta sopra la colonna dei pulsanti (da 1220)
  const up = (s: string) => (S.maiuscolo === false || stile === "minimal" || stile === "mano" ? (stile === "mano" ? s.toLowerCase() : s) : s.toUpperCase());
  const attiva = g.findIndex((i) => t >= P[i].da - 0.03 && t < (P[i + 1] ? Math.max(P[i].a, P[i + 1].da - 0.03) : P[i].a + 0.3));
  const fs = stile === "pop" ? 92 : stile === "minimal" ? 58 : 70;
  const base: React.CSSProperties = { fontFamily: S.font, fontWeight: 900, fontSize: fs, lineHeight: 1.1, letterSpacing: -0.5 };
  const comparsa = spring({ frame: Math.round(ent * fps), fps, config: { damping: 15, stiffness: 190 } });

  let corpo: React.ReactNode;
  if (stile === "karaoke") {
    corpo = <div style={{ ...base, fontSize: 64, background: "rgba(255,255,255,.96)", borderRadius: 26, padding: "14px 34px 16px", boxShadow: "0 10px 34px rgba(0,0,0,.3)", display: "flex", gap: "0 16px", flexWrap: "wrap", justifyContent: "center", maxWidth: 900, transform: `scale(${0.9 + 0.1 * comparsa})` }}>
      {g.map((i, k) => <span key={i} style={{ color: k <= attiva ? (P[i].k ? S.accento : "#111") : "#a3a3a3" }}>{up(P[i].t)}</span>)}</div>;
  } else if (stile === "pop") {
    corpo = <div style={{ ...base, display: "flex", gap: "0 20px", color: "#fff", WebkitTextStroke: "3px #000", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,.35)" }}>
      {g.map((i) => { const s = spring({ frame: Math.round((t - P[i].da + 0.05) * fps), fps, config: { damping: 9, stiffness: 240 } });
        return <span key={i} style={{ display: "inline-block", transform: `scale(${t < P[i].da - 0.05 ? 0 : 0.5 + 0.5 * s}) rotate(${(i % 2 ? 1 : -1) * (1 - s) * 8}deg)`, color: P[i].k ? S.accento : "#fff" }}>{up(P[i].t)}</span>; })}</div>;
  } else if (stile === "grassetto" || stile === "neon") {
    corpo = <div style={{ ...base, display: "flex", gap: "0 18px", flexWrap: "wrap", justifyContent: "center", maxWidth: 940, transform: `translateY(${(1 - comparsa) * 24}px)`, opacity: comparsa }}>
      {g.map((i, k) => { const on = k === attiva;
        return <span key={i} style={stile === "neon"
          ? { color: on ? "#fff" : "rgba(255,255,255,.55)", textShadow: on ? `0 0 18px ${S.accento}, 0 0 42px ${S.accento}, 0 0 4px #fff` : "0 4px 16px rgba(0,0,0,.6)", transform: `scale(${on ? 1.08 : 1})`, display: "inline-block" }
          : { color: P[i].k ? S.accento : "#fff", WebkitTextStroke: "4px #000", paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,.45)", transform: `scale(${on ? 1.1 : 1})`, display: "inline-block" }}>{up(P[i].t)}</span>; })}</div>;
  } else if (stile === "minimal") {
    corpo = <div style={{ ...base, fontWeight: 700, color: "#fff", textShadow: "0 3px 14px rgba(0,0,0,.75)", maxWidth: 900, textAlign: "center", opacity: interpolate(ent, [0, 0.12], [0, 1], clamp) }}>
      {g.map((i) => <span key={i} style={{ color: P[i].k ? S.accento : "#fff" }}>{up(P[i].t) + " "}</span>)}</div>;
  } else if (stile === "chiave") {
    corpo = <div style={{ ...base, fontWeight: 800, display: "flex", gap: "0 16px", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", maxWidth: 940, opacity: comparsa }}>
      {g.map((i) => { const s = spring({ frame: Math.round((t - P[i].da + 0.04) * fps), fps, config: { damping: 10, stiffness: 220 } });
        return <span key={i} style={P[i].k
          ? { color: S.accento, fontSize: fs * 1.4, display: "inline-block", transform: `scale(${t < P[i].da - 0.04 ? 0.6 : 0.8 + 0.2 * s})`, textShadow: "0 6px 20px rgba(0,0,0,.5)" }
          : { color: "#fff", textShadow: "0 4px 16px rgba(0,0,0,.65)" }}>{up(P[i].t)}</span>; })}</div>;
  } else if (stile === "contorno") {
    corpo = <div style={{ ...base, fontSize: 80, display: "flex", gap: "0 18px", flexWrap: "wrap", justifyContent: "center", maxWidth: 960, transform: `scale(${0.94 + 0.06 * comparsa})`, opacity: comparsa }}>
      {g.map((i, k) => { const piena = k <= attiva;
        return <span key={i} style={{ color: piena ? S.accento : "transparent", WebkitTextStroke: `3px ${S.accento}`, textShadow: piena ? "0 6px 22px rgba(0,0,0,.45)" : "none" }}>{up(P[i].t)}</span>; })}</div>;
  } else if (stile === "macchina") {
    const testo = g.map((i) => up(P[i].t)).join(" ");
    const finoA = g.reduce((n, i, k) => { if (t >= P[i].a) return testo.split(" ").slice(0, k + 1).join(" ").length; if (t >= P[i].da) { const pre = k ? testo.split(" ").slice(0, k).join(" ").length + 1 : 0; return pre + Math.ceil(P[i].t.length * Math.min(1, (t - P[i].da) / Math.max(0.08, P[i].a - P[i].da))); } return n; }, 0);
    const cursore = Math.floor(t * 2.5) % 2 === 0;
    corpo = <div style={{ ...base, fontFamily: S.font || "monospace", fontWeight: 700, fontSize: 60, color: "#fff", background: "rgba(10,10,10,.72)", borderRadius: 14, padding: "12px 26px", maxWidth: 940, textAlign: "left" }}>
      {testo.slice(0, finoA)}<span style={{ color: S.accento, opacity: cursore ? 1 : 0 }}>▍</span></div>;
  } else if (stile === "mano") {
    corpo = <div style={{ ...base, fontWeight: 400, fontSize: 76, display: "flex", gap: "0 18px", flexWrap: "wrap", justifyContent: "center", maxWidth: 920, transform: `rotate(-3deg) translateY(${(1 - comparsa) * 18}px)`, opacity: comparsa }}>
      {g.map((i, k) => { const on = k === attiva; const l = interpolate(t - P[i].da, [0, 0.25], [0, 100], clamp);
        return <span key={i} style={{ position: "relative", display: "inline-block", color: "#fff", textShadow: "0 4px 14px rgba(0,0,0,.6)" }}>{up(P[i].t)}
          {on || P[i].k ? <span style={{ position: "absolute", left: -4, bottom: 2, height: 14, width: `${on ? l : 100}%`, background: S.accento, borderRadius: 8, transform: "skewX(-12deg)", zIndex: -1, opacity: 0.9 }} /> : null}</span>; })}</div>;
  } else { // box: riquadro d'accento che scorre sotto la parola detta
    corpo = <div style={{ ...base, display: "flex", gap: "0 10px", flexWrap: "wrap", justifyContent: "center", maxWidth: 960, transform: `scale(${0.92 + 0.08 * comparsa})` }}>
      {g.map((i, k) => { const on = k === attiva;
        return <span key={i} style={{ position: "relative", display: "inline-block", padding: "2px 12px", color: on ? "#111" : "#fff", textShadow: on ? "none" : "0 4px 16px rgba(0,0,0,.6), 0 0 2px #000" }}>
          {on ? <span style={{ position: "absolute", inset: 0, background: S.accento, borderRadius: 12, transform: `scale(${interpolate(t - P[i].da, [-0.03, 0.06], [0.7, 1], clamp)})`, zIndex: -1, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }} /> : null}
          {up(P[i].t)}</span>; })}</div>;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 40, right: 40, top: y - 110, height: 220, display: "flex", alignItems: "center", justifyContent: "center", isolation: "isolate" }}>{corpo}</div>
    </AbsoluteFill>
  );
};
