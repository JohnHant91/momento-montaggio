// Il "look" sopra tutto il reel: grana pellicola e vignettatura (FilmGrain e Vignette del video-toolkit, MIT),
// light leak caldi in momenti scelti, bande cinema, colore finale (tinta leggera), polvere/neve/coriandoli per gli
// stili stagionali (es. spot natalizio: neve che cade e bagliori).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type LookProps = {
  grana?: number; vignetta?: number; bande?: boolean; tinta?: string; tinta_forza?: number;
  light_leaks?: number[];          // secondi in cui passa un bagliore caldo
  particelle?: "neve" | "polvere" | "coriandoli" | "bokeh" | null;
  accento?: string; durata?: number;
};
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rnd = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

export const Look: React.FC<LookProps> = (L) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {L.tinta ? <AbsoluteFill style={{ background: L.tinta, mixBlendMode: "soft-light", opacity: L.tinta_forza ?? 0.25 }} /> : null}
      {L.particelle ? <Particelle tipo={L.particelle} accento={L.accento || "#fff"} /> : null}
      {(L.light_leaks || []).map((x, i) => {
        const p = interpolate(t, [x, x + 1.6], [0, 1], clamp);
        if (p <= 0 || p >= 1) return null;
        const px = interpolate(p, [0, 1], [-30, 130]);
        return <AbsoluteFill key={i} style={{ mixBlendMode: "screen", opacity: Math.sin(p * Math.PI) * 0.85,
          background: `radial-gradient(ellipse 65% 45% at ${px}% 35%, rgba(255,160,70,.9), rgba(255,80,40,.4) 45%, transparent 70%)` }} />;
      })}
      {(L.vignetta ?? 0.35) > 0 ? <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${L.vignetta ?? 0.35}) 100%)` }} /> : null}
      {(L.grana ?? 0.06) > 0 ? <AbsoluteFill style={{ opacity: L.grana ?? 0.06, mixBlendMode: "overlay", backgroundPosition: `${rnd(f) * 200}px ${rnd(f + 3) * 200}px`,
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} /> : null}
      {L.bande ? <><div style={{ position: "absolute", left: 0, right: 0, top: 0, height: height * 0.07, background: "#000" }} /><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.07, background: "#000" }} /></> : null}
      <div style={{ display: "none" }}>{width}</div>
    </AbsoluteFill>
  );
};

const Particelle: React.FC<{ tipo: string; accento: string }> = ({ tipo, accento }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const n = tipo === "bokeh" ? 14 : tipo === "coriandoli" ? 40 : 60;
  return (
    <AbsoluteFill>
      {Array.from({ length: n }, (_, i) => {
        const v = tipo === "neve" ? 1.2 + rnd(i) * 2.2 : tipo === "coriandoli" ? 4 + rnd(i) * 5 : 0.4 + rnd(i) * 0.8;
        const y = ((rnd(i + 9) * height + f * v * (tipo === "polvere" ? -1 : 1)) % (height + 60) + height + 60) % (height + 60) - 30;
        const x = rnd(i + 3) * width + Math.sin(f / 30 + i) * (tipo === "neve" ? 26 : 10);
        const d = tipo === "bokeh" ? 40 + rnd(i + 1) * 90 : tipo === "coriandoli" ? 14 : 3 + rnd(i + 1) * 7;
        const st: React.CSSProperties = { position: "absolute", left: x, top: y, width: d, height: tipo === "coriandoli" ? d * 0.5 : d, borderRadius: tipo === "coriandoli" ? 2 : "50%",
          background: tipo === "coriandoli" ? [accento, "#fff", "#ff4fa0", "#4fd1ff"][i % 4] : tipo === "bokeh" ? `radial-gradient(circle, rgba(255,220,150,.55), transparent 70%)` : "rgba(255,255,255,.9)",
          opacity: tipo === "polvere" ? 0.35 : tipo === "bokeh" ? 0.7 : 0.85, filter: tipo === "neve" && d > 7 ? "blur(1.5px)" : undefined, transform: tipo === "coriandoli" ? `rotate(${f * 6 + i * 40}deg)` : undefined };
        return <div key={i} style={st} />;
      })}
    </AbsoluteFill>
  );
};
