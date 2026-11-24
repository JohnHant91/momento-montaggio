// Titoli in motion graphics. Ogni stile riprende un componente di Magic UI (MIT) — blur-fade, text-animate,
// word-rotate, number-ticker, highlighter, typing-animation, hyper-text, sparkles-text, aurora-text, comic-text,
// text-3d-flip, line-shadow-text — riscritto per il render fotogramma per fotogramma di Remotion.
// Posizioni ammesse (la faccia resta libera): alto (sopra la testa), sx / dx (ai lati del viso), basso (sopra i
// sottotitoli), centro (solo sulle clip senza persone, decide il motore).
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type TitoloProps = {
  da: number; a: number; testo: string;
  stile?: "blur" | "sale" | "rotazione" | "numero" | "evidenziatore" | "macchina" | "hyper" | "scintille" | "aurora" | "impatto" | "etichetta" | "comic" | "flip3d" | "ombra";
  posizione?: "alto" | "basso" | "sx" | "dx" | "centro";
  chiave?: string[];        // parole da colorare con l'accento
  parole?: string[];        // per "rotazione": le parole che si alternano
  numero?: { valore: number; prima?: string; dopo?: string; decimali?: number };
  sotto?: string;           // riga piccola sotto il titolo
  accento?: string; font?: string; fontTesto?: string;
  dimensione?: number;      // px; se manca la sceglie in base alla lunghezza
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const rnd = (n: number) => { const x = Math.sin(n * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, "");

// riquadro della posizione (1080x1920, safe zone 250-1500 in altezza)
function box(pos: string | undefined): React.CSSProperties {
  switch (pos) {
    case "sx": return { left: 40, width: 360, top: 640, height: 560, alignItems: "flex-start", textAlign: "left" };
    case "dx": return { right: 40, width: 360, top: 640, height: 560, alignItems: "flex-end", textAlign: "right" };
    case "basso": return { left: 70, right: 70, top: 1120, height: 230, alignItems: "center", textAlign: "center" };
    case "centro": return { left: 70, right: 70, top: 660, height: 600, alignItems: "center", textAlign: "center" };
    default: return { left: 70, right: 70, top: 260, height: 300, alignItems: "center", textAlign: "center" };
  }
}

export const Titolo: React.FC<TitoloProps> = (T) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(1, (T.a - T.da) * fps);
  const lato = T.posizione === "sx" || T.posizione === "dx";
  const parole = String(T.testo || "").split(/\s+/).filter(Boolean);
  const chiavi = new Set((T.chiave || []).map(norm));
  const lungo = T.testo.length;
  const fs = T.dimensione || (lato ? (lungo < 12 ? 76 : lungo < 24 ? 60 : 46) : (lungo < 14 ? 112 : lungo < 28 ? 88 : lungo < 46 ? 68 : 56));
  // uscita comune a tutti gli stili: veloce, verso l'alto con sfocatura (mai uno sparire secco)
  const uscita = interpolate(f, [n - 8, n], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const base: React.CSSProperties = {
    fontFamily: T.font, fontWeight: 900, fontSize: fs, lineHeight: 1.02, color: "#fff", letterSpacing: -1,
    textShadow: "0 6px 30px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.4)", textTransform: T.stile === "macchina" || T.stile === "etichetta" ? "none" : "uppercase",
  };
  const col = (w: string) => (chiavi.has(norm(w)) ? T.accento : undefined);
  let corpo: React.ReactNode = null;

  switch (T.stile) {
    case "sale": // text-animate slideUp: parola per parola dal basso
      corpo = <div style={{ ...base, display: "flex", flexWrap: "wrap", gap: "0 0.25em", justifyContent: lato ? (T.posizione === "sx" ? "flex-start" : "flex-end") : "center" }}>
        {parole.map((w, i) => { const s = spring({ frame: f - i * 3, fps, config: { damping: 16, stiffness: 170 } });
          return <span key={i} style={{ display: "inline-block", overflow: "hidden" }}><span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 105}%)`, color: col(w) }}>{w}</span></span>; })}
      </div>; break;
    case "rotazione": { // word-rotate: la parola cambia ogni tanto
      const lista = T.parole?.length ? T.parole : parole, per = Math.max(10, n / lista.length), k = Math.min(lista.length - 1, Math.floor(f / per)), l = f - k * per;
      const ent = spring({ frame: l, fps, config: { damping: 15 } });
      const esce = k < lista.length - 1 ? interpolate(l, [per - 7, per], [0, 1], clamp) : 0;
      corpo = <div style={{ ...base }}>{T.sotto ? <div style={{ fontSize: fs * 0.42, fontWeight: 700, opacity: 0.9, letterSpacing: 0 }}>{T.sotto}</div> : null}
        <div style={{ color: T.accento, transform: `translateY(${(1 - ent) * 60 - esce * 60}px)`, opacity: ent * (1 - esce), filter: `blur(${(1 - ent) * 8 + esce * 8}px)` }}>{lista[k]}</div></div>; break;
    }
    case "numero": { // number-ticker
      const v = T.numero?.valore ?? Number(T.testo.replace(/[^\d.,-]/g, "").replace(",", ".")) ?? 0;
      const p = interpolate(f, [4, Math.min(n - 10, 1.3 * fps)], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
      const dec = T.numero?.decimali || 0;
      const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 150 } });
      corpo = <div style={{ ...base, transform: `scale(${0.6 + 0.4 * s})` }}>
        <div style={{ fontSize: fs * 1.55, color: T.accento, fontVariantNumeric: "tabular-nums", letterSpacing: -3 }}>{(T.numero?.prima || "") + (v * p).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (T.numero?.dopo || "")}</div>
        {T.sotto ? <div style={{ fontSize: fs * 0.36, fontWeight: 800, letterSpacing: 1 }}>{T.sotto}</div> : null}</div>; break;
    }
    case "evidenziatore": // highlighter: un pennarello passa dietro le parole chiave
      corpo = <div style={{ ...base, display: "flex", flexWrap: "wrap", gap: "0 0.25em", justifyContent: "center" }}>
        {parole.map((w, i) => { const k = chiavi.has(norm(w)); const p = interpolate(f, [8 + i * 2, 20 + i * 2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return <span key={i} style={{ position: "relative", display: "inline-block", color: k ? "#111" : "#fff", textShadow: k ? "none" : base.textShadow, opacity: interpolate(f, [i * 2, i * 2 + 6], [0, 1], clamp) }}>
            {k ? <span style={{ position: "absolute", left: "-0.08em", right: "-0.08em", top: "12%", bottom: "6%", background: T.accento, transformOrigin: "left", transform: `scaleX(${p}) skewX(-6deg)`, borderRadius: 6, zIndex: -1 }} /> : null}{w}</span>; })}
      </div>; break;
    case "macchina": { // typing-animation con cursore
      const c = Math.floor(interpolate(f, [0, Math.min(n * 0.7, T.testo.length * 1.6)], [0, T.testo.length], clamp));
      corpo = <div style={{ ...base, fontFamily: T.fontTesto, fontWeight: 800 }}>{T.testo.slice(0, c)}<span style={{ color: T.accento, opacity: Math.floor(f / 8) % 2 ? 1 : 0.15 }}>▍</span></div>; break;
    }
    case "hyper": { // hyper-text: le lettere si "decodificano"
      const al = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const fine = Math.min(n * 0.6, 22);
      const t = T.testo.split("").map((ch, i) => ch === " " ? " " : f > (i / T.testo.length) * fine + 3 ? ch : al[Math.floor(rnd(f + i * 13) * al.length)]).join("");
      corpo = <div style={{ ...base, fontFamily: "monospace", letterSpacing: 2 }}>{t}</div>; break;
    }
    case "scintille": { // sparkles-text
      const s = spring({ frame: f, fps, config: { damping: 14 } });
      corpo = <div style={{ ...base, position: "relative", transform: `scale(${0.8 + 0.2 * s})`, opacity: s }}>
        {parole.map((w, i) => <span key={i} style={{ color: col(w) }}>{w + " "}</span>)}
        {Array.from({ length: 9 }, (_, i) => { const ciclo = (f + i * 11) % 40, vita = Math.sin((ciclo / 40) * Math.PI);
          return <span key={"s" + i} style={{ position: "absolute", left: `${rnd(i * 7 + Math.floor((f + i * 11) / 40)) * 100}%`, top: `${rnd(i * 3 + 5 + Math.floor((f + i * 11) / 40)) * 100 - 20}%`, fontSize: fs * 0.32, color: i % 2 ? T.accento : "#fff", transform: `scale(${vita}) rotate(${ciclo * 6}deg)`, textShadow: "none" }}>✦</span>; })}
      </div>; break;
    }
    case "aurora": // aurora-text / animated-gradient-text
      corpo = <div style={{ ...base, backgroundImage: `linear-gradient(${90 + f * 2}deg, ${T.accento}, #ff4fd8, #6ee7ff, ${T.accento})`, backgroundSize: "300% 100%", backgroundPosition: `${(f * 2) % 300}% 50%`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none", filter: "drop-shadow(0 6px 24px rgba(0,0,0,.5))", opacity: interpolate(f, [0, 8], [0, 1], clamp) }}>{T.testo}</div>; break;
    case "impatto": { // kinetic: sbatte a schermo con contraccolpo e piccola scossa
      const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
      const sc = f < 10 ? Math.sin(f * 3) * (10 - f) * 0.9 : 0;
      corpo = <div style={{ ...base, fontSize: fs * 1.08, transform: `scale(${2.2 - 1.2 * s}) translate(${sc}px, ${-sc * 0.6}px)`, opacity: interpolate(f, [0, 3], [0, 1], clamp) }}>
        {parole.map((w, i) => <span key={i} style={{ color: col(w) }}>{w + " "}</span>)}</div>; break;
    }
    case "etichetta": { // lower third: barra d'accento + pillola
      const s = spring({ frame: f, fps, config: { damping: 18 } });
      corpo = <div style={{ display: "flex", alignItems: "stretch", gap: 0, transform: `translateX(${(1 - s) * (T.posizione === "dx" ? 60 : -60)}px)`, opacity: s }}>
        <div style={{ width: 12, background: T.accento, borderRadius: 6, transformOrigin: "bottom", transform: `scaleY(${s})` }} />
        <div style={{ background: "rgba(14,14,16,.82)", backdropFilter: "blur(10px)", padding: "16px 26px 18px", borderRadius: 14, marginLeft: 10 }}>
          <div style={{ fontFamily: T.font, fontWeight: 900, fontSize: fs * 0.62, color: "#fff", lineHeight: 1.05 }}>{T.testo}</div>
          {T.sotto ? <div style={{ fontFamily: T.fontTesto, fontWeight: 600, fontSize: fs * 0.32, color: T.accento, marginTop: 6, letterSpacing: 1, textTransform: "uppercase" }}>{T.sotto}</div> : null}
        </div></div>; break;
    }
    case "comic": { // comic-text: fumetto pop con bordo spesso e ombra netta
      const s = spring({ frame: f, fps, config: { damping: 8, stiffness: 200 } });
      corpo = <div style={{ ...base, color: T.accento, WebkitTextStroke: `${Math.round(fs / 14)}px #111`, paintOrder: "stroke fill", textShadow: `${fs / 12}px ${fs / 12}px 0 #111`, transform: `rotate(-4deg) scale(${s})` }}>{T.testo}</div>; break;
    }
    case "flip3d": // text-3d-flip: lettere che girano in 3D
      corpo = <div style={{ ...base, perspective: 800 }}>{T.testo.split("").map((ch, i) => { const r = interpolate(f, [i * 1.2, i * 1.2 + 10], [90, 0], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
        return <span key={i} style={{ display: "inline-block", transform: `rotateX(${r}deg)`, opacity: r > 80 ? 0 : 1, whiteSpace: "pre" }}>{ch}</span>; })}</div>; break;
    case "ombra": // line-shadow-text: ombra a righe che scorre
      corpo = <div style={{ ...base, position: "relative", opacity: interpolate(f, [0, 8], [0, 1], clamp) }}>
        <span style={{ position: "absolute", left: 8, top: 8, color: "transparent", backgroundImage: `repeating-linear-gradient(-45deg, ${T.accento} 0 4px, transparent 4px 8px)`, backgroundPosition: `${f}px 0`, WebkitBackgroundClip: "text", backgroundClip: "text", textShadow: "none" }}>{T.testo}</span>
        <span style={{ position: "relative" }}>{T.testo}</span></div>; break;
    default: // blur: blur-fade parola per parola
      corpo = <div style={{ ...base, display: "flex", flexWrap: "wrap", gap: "0 0.25em", justifyContent: lato ? (T.posizione === "sx" ? "flex-start" : "flex-end") : "center" }}>
        {parole.map((w, i) => { const p = interpolate(f, [i * 3, i * 3 + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return <span key={i} style={{ display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 14}px)`, transform: `translateY(${(1 - p) * 18}px)`, color: col(w) }}>{w}</span>; })}
        {T.sotto ? <div style={{ width: "100%", fontSize: fs * 0.36, fontWeight: 700, opacity: interpolate(f, [10, 18], [0, 0.95], clamp), letterSpacing: 0, textTransform: "none" }}>{T.sotto}</div> : null}
      </div>;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", justifyContent: "center", ...box(T.posizione),
        opacity: 1 - uscita, transform: `translateY(${-uscita * 30}px)`, filter: `blur(${uscita * 8}px)` }}>{corpo}</div>
    </AbsoluteFill>
  );
};
