// EFFETTI del formato split: il "super montatore". Tutto disegnato in codice (niente file da scaricare, niente licenze).
// Ricavati dal reel di riferimento: niente resta fermo, ogni grafica ha un oggetto in movimento, un cursore che clicca,
// coriandoli che attraversano lo schermo, una cornice "da programma di design", numeri giganti sullo sfondo, icone che fluttuano.
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "./sicuro";
import { ease, molle } from "./theme";

export type Pal = { fondo: string; inchiostro: string; accento: string; secondario: string; tenue: string };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EXTRA = ["#F5C542", "#2E9E6B", "#141416", "#8EA3C2"]; // colori dei coriandoli oltre alla palette

// effetti di base per ogni tipo di grafica (il Regista può cambiarli scena per scena)
export const EFFETTI_BASE: Record<string, string[]> = {
  titolo: ["scrivi", "icone"], numero: ["fantasma", "coriandoli", "icone"], sito: ["cursore", "icone"], terminale: ["icone", "successo"],
  contatore: ["coriandoli", "scossa"], lista: ["lente", "icone"], confronto: ["cursore"], card: ["cornice", "cursore", "icone"],
  chat: ["icone"], barre: ["scossa", "icone"], riepilogo: ["coriandoli", "successo"], oggetto: ["cornice", "icone"],
};
export const GLIFI_BASE: Record<string, string[]> = {
  titolo: ["Aa", "✦"], numero: ["#", "↗"], sito: ["⌘", "↗"], terminale: [">_", "{ }"], contatore: ["%", "↑"], lista: ["✓", "☰"],
  confronto: ["⇄", "✓"], card: ["✦", "→"], chat: ["…", "✎"], barre: ["▤", "↑"], riepilogo: ["★", "✓"], oggetto: ["◇", "✦"],
};
// pseudo-casuale deterministico (stesso risultato a ogni fotogramma)
const caso = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ respiro: la grafica non è mai ferma; entra sfocata, esce rimpicciolendo
export const Respiro: React.FC<{ children: React.ReactNode; seme: number; scossa?: number }> = ({ children, seme, scossa }) => {
  const f = useCurrentFrame();
  const { durationInFrames: dur, fps } = useVideoConfig();
  const ent = interpolate(f, [0, 7], [10, 0], { ...clamp, easing: ease.out });
  const usc = interpolate(f, [dur - 8, dur], [0, 1], { ...clamp, easing: ease.in });
  const y = Math.sin((f + seme * 13) / 17) * 7 - usc * 40;
  const rot = Math.sin((f + seme * 7) / 29) * 0.7;
  const push = interpolate(f, [0, dur], [1, 1.035], clamp) * (1 - 0.08 * usc);
  let sx = 0;
  if (scossa != null) { const k = f - scossa; if (k >= 0 && k < 9) sx = Math.sin(k * 2.6) * (9 - k) * 1.6; } // scossa breve
  return <div style={{ transform: `translate(${sx}px, ${y}px) rotate(${rot}deg) scale(${push})`, filter: `blur(${ent + usc * 8}px)`, opacity: 1 - usc }}>{children}</div>;
};

// ------------------------------------------------------------------ cornice "da programma di design": rettangolo che si disegna, maniglie, etichetta
export const Cornice: React.FC<{ children: React.ReactNode; pal: Pal; mono: string; etichetta?: string }> = ({ children, pal, mono, etichetta }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = React.useRef<HTMLDivElement>(null);
  const tratto = interpolate(f, [6, 20], [0, 1], { ...clamp, easing: ease.inOut });
  const man = (i: number) => spring({ frame: f - 16 - i * 2, fps, config: molle.bouncy });
  const pad = 22;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {children}
      <svg style={{ position: "absolute", left: -pad, top: -pad, width: `calc(100% + ${pad * 2}px)`, height: `calc(100% + ${pad * 2}px)`, overflow: "visible", pointerEvents: "none" }}>
        <rect x="1.5" y="1.5" width="99%" height="99%" fill="none" stroke={pal.accento} strokeWidth="3" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tratto} rx="4" />
      </svg>
      {[[-pad, -pad], [`calc(100% + ${pad - 14}px)`, -pad], [-pad, `calc(100% + ${pad - 14}px)`], [`calc(100% + ${pad - 14}px)`, `calc(100% + ${pad - 14}px)`]].map(([l, t], i) => (
        <div key={i} style={{ position: "absolute", left: l as any, top: t as any, width: 14, height: 14, marginLeft: -6, marginTop: -6, background: "#fff", border: `3px solid ${pal.accento}`, transform: `scale(${man(i)})` }} />
      ))}
      {etichetta ? <div style={{ position: "absolute", left: -pad, top: -pad - 44, background: pal.accento, color: "#fff", fontFamily: mono, fontSize: 20, padding: "5px 12px", borderRadius: 6,
        transform: `translateY(${(1 - man(0)) * 12}px)`, opacity: man(0) }}>{etichetta}</div> : null}
    </div>
  );
};

// ------------------------------------------------------------------ cursore che arriva, clicca (cerchio che si allarga) e si sposta un po'
export const Cursore: React.FC<{ pal: Pal; x: number; y: number }> = ({ pal, x, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arr = Math.round(fps * 0.75), click = Math.round(fps * 0.95);
  const k = interpolate(f, [8, arr], [0, 1], { ...clamp, easing: ease.inOut });
  const px = interpolate(k, [0, 1], [x + 420, x]) + Math.sin(f / 22) * 4 * k;
  const py = interpolate(k, [0, 1], [y + 300, y]) - Math.sin(k * Math.PI) * 60 + Math.cos(f / 25) * 3 * k;
  const premuto = f >= click && f < click + 5 ? 0.82 : 1;
  const onda = interpolate(f, [click, click + 14], [0, 1], { ...clamp, easing: ease.out });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: interpolate(f, [8, 14], [0, 1], clamp) }}>
      {f >= click ? <div style={{ position: "absolute", left: x - 40 * onda, top: y - 40 * onda, width: 80 * onda, height: 80 * onda, borderRadius: "50%", border: `4px solid ${pal.accento}`, opacity: 1 - onda }} /> : null}
      <svg width="46" height="56" viewBox="0 0 23 28" style={{ position: "absolute", left: px, top: py, transform: `scale(${premuto})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 8px rgba(0,0,0,.35))" }}>
        <path d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 16 L18 16 Z" fill="#141416" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ coriandoli: pallini che partono dalla grafica e attraversano lo schermo (anche sopra la persona)
export const Coriandoli: React.FC<{ pal: Pal; x: number; y: number; seme: number; quanti?: number }> = ({ pal, x, y, seme, quanti = 16 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colori = [pal.accento, pal.secondario, ...EXTRA];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: quanti }).map((_, i) => {
        const r = (n: number) => caso(seme * 31 + i * 7 + n);
        const t = (f - r(1) * 6) / (fps * 1.4);
        if (t < 0 || t > 1) return null;
        const ang = -Math.PI / 2 + (r(2) - 0.5) * Math.PI * 1.5;
        const v = 600 + r(3) * 700;
        const px = x + Math.cos(ang) * v * t;
        const py = y + Math.sin(ang) * v * t + 1500 * t * t; // gravità: salgono e ricadono
        const d = 16 + r(4) * 16;
        return <div key={i} style={{ position: "absolute", left: px - d / 2, top: py - d / 2, width: d, height: d, borderRadius: "50%", background: colori[i % colori.length],
          transform: `scale(${interpolate(t, [0, 0.12, 0.8, 1], [0, 1, 1, 0.4], clamp)})` }} />;
      })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ numero gigante "fantasma" dietro la grafica
export const Fantasma: React.FC<{ pal: Pal; testo: string; font: string }> = ({ pal, testo, font }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: molle.smooth });
  return <div style={{ position: "absolute", left: 40 + (1 - s) * -120, top: 110, fontFamily: font, fontSize: 620, lineHeight: 1, color: pal.accento, opacity: 0.16 * s, pointerEvents: "none" }}>{testo}</div>;
};

// ------------------------------------------------------------------ icone che fluttuano ai lati (piccole tessere bianche con un simbolo)
const POSTI = [[70, 760], [935, 700], [960, 180], [80, 230]];
export const Icone: React.FC<{ pal: Pal; glifi: string[]; font: string; seme: number }> = ({ pal, glifi, font, seme }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const usc = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return (
    <>
      {glifi.slice(0, 3).map((g, i) => {
        const p = POSTI[(i + seme) % POSTI.length];
        const s = spring({ frame: f - 10 - i * 6, fps, config: molle.bouncy });
        return <div key={i} style={{ position: "absolute", left: p[0], top: p[1] + Math.sin((f + i * 20) / 16) * 10, width: 78, height: 78, borderRadius: 20, background: "#fff",
          boxShadow: "0 14px 30px -14px rgba(0,0,0,.35)", display: "grid", placeItems: "center", fontFamily: font, fontWeight: 700, fontSize: 32, color: i === 0 ? pal.accento : pal.inchiostro,
          transform: `scale(${s * usc}) rotate(${Math.sin((f + i * 30) / 30) * 8}deg)` }}>{g}</div>;
      })}
    </>
  );
};

// ------------------------------------------------------------------ lente che passa sopra la grafica
export const Lente: React.FC<{ pal: Pal }> = ({ pal }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const k = interpolate(f, [fps * 0.5, Math.max(fps * 0.6, dur - fps * 0.4)], [0, 1], { ...clamp, easing: ease.inOut });
  const x = interpolate(k, [0, 1], [180, 820]), y = 430 + Math.sin(k * Math.PI * 2) * 90;
  return (
    <svg width="150" height="150" viewBox="0 0 60 60" style={{ position: "absolute", left: x, top: y, opacity: interpolate(f, [fps * 0.4, fps * 0.6], [0, 1], clamp), filter: "drop-shadow(0 8px 10px rgba(0,0,0,.3))", pointerEvents: "none" }}>
      <circle cx="24" cy="24" r="16" fill="rgba(255,255,255,.25)" stroke="#141416" strokeWidth="4" />
      <line x1="36" y1="36" x2="52" y2="52" stroke="#141416" strokeWidth="7" strokeLinecap="round" />
      <circle cx="18" cy="18" r="4" fill={pal.accento} opacity=".5" />
    </svg>
  );
};

// ------------------------------------------------------------------ barra verde "fatto"
export const Successo: React.FC<{ testo: string; font: string }> = ({ testo, font }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const s = spring({ frame: f - Math.round(dur * 0.55), fps, config: molle.snappy });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 16, padding: "14px 26px", boxShadow: "0 14px 30px -16px rgba(0,0,0,.35)", borderLeft: "8px solid #22A55B",
        fontFamily: font, fontWeight: 700, fontSize: 32, color: "#141416" }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#22A55B", color: "#fff", display: "grid", placeItems: "center", fontSize: 24 }}>✓</span>{testo}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ lampo di luce che attraversa la zona grafica al cambio scena
export const Lampo: React.FC<{ pal: Pal }> = ({ pal }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, 11], [0, 1], { ...clamp, easing: ease.inOut });
  if (k >= 1) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -200, bottom: -200, width: 340, left: `${-40 + k * 140}%`, transform: "rotate(14deg)", opacity: 0.45 * Math.sin(k * Math.PI),
      background: `linear-gradient(90deg, transparent, ${pal.secondario}, #ffffff, ${pal.secondario}, transparent)` }} />
  </AbsoluteFill>;
};

// ------------------------------------------------------------------ oggetto 3D (cubo) che cade, rimbalza e gira
export const Cubo: React.FC<{ pal: Pal; simbolo: string; font: string; lato?: number }> = ({ pal, simbolo, font, lato = 230 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cade = spring({ frame: f, fps, config: { damping: 9, stiffness: 120, mass: 0.9 } });
  const ry = 32 + Math.sin(f / 26) * 10 + (1 - cade) * 90;
  const faccia = (tr: string, bg: string, ch?: React.ReactNode) => <div style={{ position: "absolute", width: lato, height: lato, background: bg, transform: tr, display: "grid", placeItems: "center",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)", fontFamily: font, fontSize: lato * 0.42, fontWeight: 800, color: "#fff" }}>{ch}</div>;
  return (
    <div style={{ width: lato, height: lato, perspective: 1200, transform: `translateY(${(1 - cade) * -520}px)` }}>
      <div style={{ width: lato, height: lato, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(-22deg) rotateY(${ry}deg)` }}>
        {faccia(`translateZ(${lato / 2}px)`, pal.accento, simbolo)}
        {faccia(`rotateY(90deg) translateZ(${lato / 2}px)`, `color-mix(in srgb, ${pal.accento} 78%, #000)`)}
        {faccia(`rotateY(-90deg) translateZ(${lato / 2}px)`, `color-mix(in srgb, ${pal.accento} 78%, #000)`)}
        {faccia(`rotateX(90deg) translateZ(${lato / 2}px)`, `color-mix(in srgb, ${pal.accento} 70%, #fff)`)}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ grana e vignetta sopra tutto (texture "da video vero")
export const Grana: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "multiply" }}>
        <filter id="grana"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 50} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grana)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.22) 100%)" }} />
    </AbsoluteFill>
  );
};
