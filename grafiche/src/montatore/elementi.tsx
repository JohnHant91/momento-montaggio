// Elementi grafici animati disegnati in SVG (nessuna licenza esterna): frecce e cerchi "a mano" che indicano un
// dettaglio, sottolineature, spunte e croci, scintille, lente su un dettaglio, conto alla rovescia, barra di avanzamento,
// adesivo-etichetta. Ogni elemento ha posizione x,y (0-1 del fotogramma) e colore; la faccia la protegge il motore.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type ElementoM = {
  tipo: "freccia" | "freccia_curva" | "cerchio" | "riquadro" | "sottolinea" | "scarabocchio" | "spunta" | "croce" | "scintille" | "lente" | "conto_rovescia" | "etichetta" | "punto" | "stelle";
  da: number; a: number; x?: number; y?: number; dimensione?: number; colore?: string; testo?: string; verso?: "sx" | "dx" | "su" | "giu"; numero?: number;
};
export const TIPI_ELEMENTO = ["freccia", "freccia_curva", "cerchio", "riquadro", "sottolinea", "scarabocchio", "spunta", "croce", "scintille", "lente", "conto_rovescia", "etichetta", "punto", "stelle"];

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const W = 1080, H = 1920;

// tratto che si disegna (stroke-dashoffset) con un leggero tremolio da pennarello
const Tratto: React.FC<{ d: string; p: number; col: string; sp?: number; len?: number }> = ({ d, p, col, sp = 14, len = 2400 }) => (
  <path d={d} fill="none" stroke={col} strokeWidth={sp} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))" }} />
);

export const Elemento: React.FC<ElementoM & { accento: string; font?: string }> = (E) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(1, (E.a - E.da) * fps);
  const col = E.colore || E.accento;
  const x = (E.x ?? 0.5) * W, y = (E.y ?? 0.5) * H, s = (E.dimensione ?? 1);
  const disegno = interpolate(f, [0, 0.45 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const esce = interpolate(f, [n - 6, n], [1, 0], clamp);
  const pop = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  let g: React.ReactNode = null;
  const rot = { sx: 180, dx: 0, su: -90, giu: 90 }[E.verso || "dx"] ?? 0;
  switch (E.tipo) {
    case "freccia": g = <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}><Tratto d="M -260 30 C -170 -20, -90 10, -20 0" p={disegno} col={col} /><Tratto d="M -60 -38 L -12 0 L -62 34" p={interpolate(f, [0.3 * fps, 0.55 * fps], [0, 1], clamp)} col={col} len={200} /></g>; break;
    case "freccia_curva": g = <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}><Tratto d="M -240 -120 C -260 40, -120 80, -24 4" p={disegno} col={col} /><Tratto d="M -70 -14 L -18 6 L -56 50" p={interpolate(f, [0.3 * fps, 0.55 * fps], [0, 1], clamp)} col={col} len={200} /></g>; break;
    case "cerchio": g = <g transform={`translate(${x},${y}) scale(${s})`}><Tratto d="M 150 -10 C 150 -110, -140 -120, -170 -10 C -195 90, 120 120, 165 20 C 175 -10, 140 -70, 90 -85" p={disegno} col={col} sp={12} /></g>; break;
    case "riquadro": g = <g transform={`translate(${x},${y}) scale(${s})`}><Tratto d="M -200 -110 L 205 -115 L 200 112 L -205 108 Z" p={disegno} col={col} sp={11} /></g>; break;
    case "sottolinea": g = <g transform={`translate(${x},${y}) scale(${s})`}><Tratto d="M -260 0 C -120 18, 80 -14, 260 6" p={disegno} col={col} sp={16} /></g>; break;
    case "scarabocchio": g = <g transform={`translate(${x},${y}) scale(${s})`}><Tratto d="M -220 0 C -160 -40, -140 40, -80 0 S 0 -40, 40 0 S 140 40, 220 -6" p={disegno} col={col} sp={13} /></g>; break;
    case "spunta": g = <g transform={`translate(${x},${y}) scale(${s * (0.6 + 0.4 * pop)})`}><circle r={110} fill={col} opacity={0.95} /><Tratto d="M -50 0 L -12 40 L 56 -40" p={interpolate(f, [4, 16], [0, 1], clamp)} col="#fff" sp={20} len={260} /></g>; break;
    case "croce": g = <g transform={`translate(${x},${y}) scale(${s * (0.6 + 0.4 * pop)})`}><circle r={110} fill="#E5383B" opacity={0.95} /><Tratto d="M -44 -44 L 44 44" p={interpolate(f, [4, 12], [0, 1], clamp)} col="#fff" sp={20} len={140} /><Tratto d="M 44 -44 L -44 44" p={interpolate(f, [9, 17], [0, 1], clamp)} col="#fff" sp={20} len={140} /></g>; break;
    case "punto": g = <g transform={`translate(${x},${y}) scale(${s})`}>{[0, 1].map((k) => { const c = ((f + k * 15) % 30) / 30; return <circle key={k} r={30 + c * 90} fill="none" stroke={col} strokeWidth={8} opacity={1 - c} />; })}<circle r={26} fill={col} /></g>; break;
    case "scintille": case "stelle": g = <g transform={`translate(${x},${y}) scale(${s})`}>{Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2, c = ((f + i * 5) % 24) / 24, r = 60 + c * 150, k = Math.sin(c * Math.PI);
        return <path key={i} transform={`translate(${Math.cos(a) * r},${Math.sin(a) * r}) scale(${k * (E.tipo === "stelle" ? 1.4 : 1)}) rotate(${c * 90})`} d="M 0 -26 L 7 -7 L 26 0 L 7 7 L 0 26 L -7 7 L -26 0 L -7 -7 Z" fill={i % 2 ? "#fff" : col} />; })}</g>; break;
    case "lente": g = <g transform={`translate(${x},${y}) scale(${s * (0.5 + 0.5 * pop)})`}><circle r={150} fill="rgba(255,255,255,.08)" stroke="#fff" strokeWidth={14} /><circle r={150} fill="none" stroke={col} strokeWidth={6} /><Tratto d="M 106 106 L 220 220" p={1} col="#fff" sp={26} len={200} /></g>; break;
    case "conto_rovescia": { const tot = Math.max(1, E.numero || 3), per = n / tot, k = Math.min(tot - 1, Math.floor(f / per)), l = f - k * per, sp = spring({ frame: l, fps, config: { damping: 9, stiffness: 220 } });
      g = <g transform={`translate(${x},${y})`}><circle r={190 * s} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={16} /><circle r={190 * s} fill="none" stroke={col} strokeWidth={16} strokeDasharray={2 * Math.PI * 190 * s} strokeDashoffset={2 * Math.PI * 190 * s * (l / per)} transform="rotate(-90)" />
        <text textAnchor="middle" dominantBaseline="central" fontSize={260 * s * (0.6 + 0.4 * sp)} fontWeight={900} fill="#fff" fontFamily={E.font} style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,.5))" }}>{tot - k}</text></g>; break; }
    case "etichetta": { const sp = spring({ frame: f, fps, config: { damping: 12, stiffness: 180 } });
      return <AbsoluteFill style={{ pointerEvents: "none", opacity: esce }}><div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(-4deg) scale(${sp * s})`, background: col, color: "#111", fontFamily: E.font, fontWeight: 900, fontSize: 54, padding: "14px 30px", borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>{E.testo || ""}</div></AbsoluteFill>; }
  }
  return <AbsoluteFill style={{ pointerEvents: "none", opacity: esce }}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{g}</svg></AbsoluteFill>;
};

// barra di avanzamento in alto per tutto il reel: tiene chi guarda fino alla fine
export const BarraAvanzamento: React.FC<{ colore: string; durata: number }> = ({ colore, durata }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <AbsoluteFill style={{ pointerEvents: "none" }}><div style={{ position: "absolute", left: 40, right: 40, top: 200, height: 10, borderRadius: 6, background: "rgba(255,255,255,.25)" }}>
    <div style={{ height: "100%", width: `${Math.min(100, (f / (durata * fps)) * 100)}%`, background: colore, borderRadius: 6, boxShadow: `0 0 14px ${colore}` }} /></div></AbsoluteFill>;
};
