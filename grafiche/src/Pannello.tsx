// Pannello "explainer": scende dall'alto sulla metà superiore del reel, con chip, titolo e un grafico che si disegna
// (linea con contatore, barre che crescono, oppure passi numerati) e un badge col risultato.
// Fondo trasparente fuori dalla card: il montatore lo sovrappone al video.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { ease, molle, temi } from "./theme";

const { fontFamily } = loadFont("normal", { weights: ["600", "800"], subsets: ["latin", "latin-ext"] });

export type Punto = { etichetta: string; valore: number };
export type PannelloProps = {
  chip?: string;
  titolo: string;
  tipo: "line" | "bar" | "steps";
  punti: Punto[];
  passi?: string[];
  unita?: string;
  badge?: string;
  accento?: string;
  tema?: "dark" | "light";
  durata: number;
  grafico_in?: number;
};

const ALTO = 270; // sotto la zona coperta dall'interfaccia di Instagram
const LATI = 70;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const formatta = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString("it-IT") : (Math.round(n * 10) / 10).toLocaleString("it-IT"));

// entrata standard: opacità + salita + scala insieme (mai una dissolvenza da sola)
const useEntrata = (inizio: number, molla = molle.snappy) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - inizio, fps, config: molla });
  return { opacity: interpolate(s, [0, 0.6], [0, 1], clamp), transform: `translateY(${(1 - s) * 28}px) scale(${0.9 + 0.1 * s})` };
};

const Chip: React.FC<{ testo: string; colore: string; inizio: number }> = ({ testo, colore, inizio }) => {
  const st = useEntrata(inizio, molle.bouncy);
  return (
    <div style={{ ...st, alignSelf: "flex-start", background: colore, color: "#fff", fontWeight: 800, fontSize: 30, letterSpacing: 3,
      padding: "10px 24px", borderRadius: 999 }}>{testo}</div>
  );
};

const Titolo: React.FC<{ testo: string; colore: string; inizio: number }> = ({ testo, colore, inizio }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontWeight: 800, fontSize: 64, lineHeight: 1.08, color: colore, display: "flex", flexWrap: "wrap", columnGap: 16 }}>
      {testo.split(" ").map((p, i) => {
        const s = spring({ frame: f - inizio - i * 3, fps, config: molle.snappy });
        return <span key={i} style={{ opacity: interpolate(s, [0, 0.5], [0, 1], clamp), transform: `translateY(${(1 - s) * 34}px)`, display: "inline-block" }}>{p}</span>;
      })}
    </div>
  );
};

const Linea: React.FC<{ punti: Punto[]; acc: string; t: (typeof temi)["dark"]; inizio: number; w: number; h: number; unita: string }> = ({ punti, acc, t, inizio, w, h, unita }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durata = Math.round(1.4 * fps);
  const p = interpolate(f - inizio, [0, durata], [0, 1], { ...clamp, easing: ease.inOut });
  const vals = punti.map((x) => x.valore);
  const min = Math.min(0, ...vals), max = Math.max(...vals) || 1;
  const xy = punti.map((x, i) => [24 + (i / Math.max(1, punti.length - 1)) * (w - 48), h - 50 - ((x.valore - min) / (max - min)) * (h - 120)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const lung = xy.reduce((s, [x, y], i) => (i ? s + Math.hypot(x - xy[i - 1][0], y - xy[i - 1][1]) : 0), 0);
  // punto che segue la testa della linea
  const pos = p * (punti.length - 1);
  const k = Math.min(punti.length - 2, Math.floor(pos));
  const fr = pos - k;
  const testa = punti.length > 1 ? [xy[k][0] + (xy[k + 1][0] - xy[k][0]) * fr, xy[k][1] + (xy[k + 1][1] - xy[k][1]) * fr] : xy[0];
  const valore = punti.length > 1 ? vals[k] + (vals[k + 1] - vals[k]) * fr : vals[0];
  const respiro = 1 + 0.08 * Math.sin((f / fps) * Math.PI * 2 * 0.8);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", right: 0, top: -6, fontWeight: 800, fontSize: 84, color: acc, opacity: interpolate(f - inizio, [0, 8], [0, 1], clamp) }}>
        {formatta(valore)}{unita}
      </div>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={0} x2={w} y1={h - 50 - g * (h - 120)} y2={h - 50 - g * (h - 120)} stroke={t.griglia} strokeWidth={2} />)}
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={acc} stopOpacity={0.35} /><stop offset="1" stopColor={acc} stopOpacity={0} /></linearGradient>
          <clipPath id="taglio"><rect x={0} y={-50} width={testa[0] + 2} height={h + 100} /></clipPath>
        </defs>
        <path d={`${d} L${xy[xy.length - 1][0]},${h - 50} L${xy[0][0]},${h - 50} Z`} fill="url(#area)" clipPath="url(#taglio)" />
        <path d={d} fill="none" stroke={acc} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={lung} strokeDashoffset={lung * (1 - p)} style={{ filter: `drop-shadow(0 0 14px ${acc})` }} />
        {p > 0 && <circle cx={testa[0]} cy={testa[1]} r={14 * respiro} fill="#fff" stroke={acc} strokeWidth={6} />}
        {punti.map((x, i) => (
          <text key={i} x={xy[i][0]} y={h - 6} textAnchor="middle" fontFamily={fontFamily} fontWeight={600} fontSize={26} fill={t.dim}
            opacity={interpolate(f - inizio - i * 3, [0, 10], [0, 1], clamp)}>{x.etichetta}</text>
        ))}
      </svg>
    </div>
  );
};

const Barre: React.FC<{ punti: Punto[]; acc: string; t: (typeof temi)["dark"]; inizio: number; w: number; h: number; unita: string }> = ({ punti, acc, t, inizio, w, h, unita }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...punti.map((p) => p.valore)) || 1;
  const gap = 28;
  const bw = (w - gap * (punti.length - 1)) / punti.length;
  const ultima = punti.length - 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, width: w, height: h }}>
      {punti.map((p, i) => {
        const s = spring({ frame: f - inizio - i * 5, fps, config: molle.smooth });
        const alt = (p.valore / max) * (h - 120) * s;
        const eroe = i === ultima;
        return (
          <div key={i} style={{ width: bw, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 36, color: eroe ? acc : t.text, opacity: interpolate(s, [0.3, 0.8], [0, 1], clamp) }}>{formatta(p.valore * s)}{unita}</div>
            <div style={{ width: "100%", height: Math.max(4, alt), borderRadius: "16px 16px 6px 6px",
              background: eroe ? `linear-gradient(180deg, ${acc}, ${acc}CC)` : t.bgAlt, boxShadow: eroe ? `0 0 30px ${acc}66` : "none" }} />
            <div style={{ fontWeight: 600, fontSize: 26, color: t.dim, height: 34, textAlign: "center" }}>{p.etichetta}</div>
          </div>
        );
      })}
    </div>
  );
};

const Passi: React.FC<{ passi: string[]; acc: string; t: (typeof temi)["dark"]; inizio: number; durata: number }> = ({ passi, acc, t, inizio, durata }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ogni = Math.max(Math.round(0.45 * fps), Math.floor((durata * fps - inizio - fps) / Math.max(1, passi.length)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {passi.slice(0, 5).map((p, i) => {
        const s = spring({ frame: f - inizio - i * ogni, fps, config: molle.snappy });
        const attivo = f >= inizio + i * ogni && (i === passi.length - 1 || f < inizio + (i + 1) * ogni);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, opacity: interpolate(s, [0, 0.5], [0, 1], clamp),
            transform: `translateX(${(1 - s) * -60}px)` }}>
            <div style={{ width: 70, height: 70, borderRadius: 999, background: attivo ? acc : t.bgAlt, color: attivo ? "#fff" : t.text,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 34, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontWeight: 700, fontSize: 40, color: attivo ? t.text : t.dim, lineHeight: 1.15 }}>{p}</div>
          </div>
        );
      })}
    </div>
  );
};

const Badge: React.FC<{ testo: string; colore: string; inizio: number }> = ({ testo, colore, inizio }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - inizio, fps, config: molle.bouncy });
  const respiro = 1 + 0.025 * Math.sin(((f - inizio) / fps) * Math.PI * 2 * 0.6);
  return (
    <div style={{ position: "absolute", right: LATI, top: ALTO - 6, opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
      transform: `scale(${(0.6 + 0.4 * s) * respiro}) rotate(${(1 - s) * -8 + 2}deg)`, background: colore, color: "#fff",
      fontWeight: 800, fontSize: 32, padding: "12px 24px", borderRadius: 18, boxShadow: `0 10px 30px ${colore}55` }}>{testo}</div>
  );
};

export const Pannello: React.FC<PannelloProps> = (props) => {
  const f = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = temi[props.tema === "light" ? "light" : "dark"];
  const acc = props.accento || "#D97757";
  const entra = spring({ frame: f, fps, config: molle.smooth });
  const esce = interpolate(f, [durationInFrames - 10, durationInFrames], [0, 1], { ...clamp, easing: ease.in });
  const y = (1 - entra) * -height - esce * height;
  const inGrafico = Math.round((props.grafico_in ?? 0.6) * fps);
  const fineGrafico = inGrafico + Math.round((props.tipo === "steps" ? 0.5 : 1.5) * fps);
  const wGrafico = width - LATI * 2;
  const hGrafico = height - ALTO - 270;
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `translateY(${y}px)`,
        background: `radial-gradient(120% 90% at 85% 0%, ${acc}22 0%, transparent 55%), linear-gradient(180deg, ${t.bgAlt}, ${t.bg})`,
        borderRadius: "0 0 48px 48px", boxShadow: "0 24px 60px rgba(0,0,0,0.45)", overflow: "hidden" }}>
        {/* grana leggera: niente superfici piatte */}
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
          <filter id="grana"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(f / 2)} /></filter>
          <rect width="100%" height="100%" filter="url(#grana)" />
        </svg>
        <div style={{ position: "absolute", left: LATI, right: LATI, top: ALTO, display: "flex", flexDirection: "column", gap: 22 }}>
          <Chip testo={props.chip || "TIP"} colore={acc} inizio={6} />
          <Titolo testo={props.titolo} colore={t.text} inizio={10} />
        </div>
        <div style={{ position: "absolute", left: LATI, bottom: 60 }}>
          {props.tipo === "line" && <Linea punti={props.punti} acc={acc} t={t} inizio={inGrafico} w={wGrafico} h={hGrafico} unita={props.unita || ""} />}
          {props.tipo === "bar" && <Barre punti={props.punti} acc={acc} t={t} inizio={inGrafico} w={wGrafico} h={hGrafico} unita={props.unita || ""} />}
          {props.tipo === "steps" && <Passi passi={props.passi || props.punti.map((p) => p.etichetta)} acc={acc} t={t} inizio={inGrafico} durata={props.durata} />}
        </div>
        {props.badge && props.tipo !== "steps" && <Badge testo={props.badge} colore={acc} inizio={fineGrafico} />}
      </div>
    </AbsoluteFill>
  );
};
