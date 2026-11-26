// Transizioni tra le clip. Le due clip si sovrappongono per la durata della transizione: quella che esce e quella che
// entra ricevono ognuna il proprio stile (scala, sfocatura, spostamento, ritaglio). Sopra il taglio può esserci un
// effetto (flash, light leak, glitch). Idee e parametri dai preset del claude-code-video-toolkit (zoom-blur, glitch,
// rgb-split, light-leak; MIT) e da @remotion/transitions, riscritti per funzionare fotogramma per fotogramma.
import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "../sicuro";

export const TIPI_TRANSIZIONE = ["taglio", "dissolvenza", "zoom_blur", "whip_sx", "whip_dx", "whip_su", "glitch", "rgb_split", "flash_bianco",
  "light_leak", "scorri_su", "zoom_in", "spin", "iris", "sfocatura", "flash_nero",
  // famiglia xfade di ffmpeg riscritta in Remotion (tendine, spinte, coperture, forme, strisce, 3D)
  "tendina_sx", "tendina_dx", "tendina_su", "tendina_giu", "spingi_sx", "spingi_dx", "spingi_giu", "copri_sx", "copri_dx", "copri_su", "copri_giu",
  "cerchio_chiudi", "rombo", "rettangolo", "apri_verticale", "apri_orizzontale", "diagonale_sx", "diagonale_dx", "strisce_orizzontali",
  "strisce_verticali", "radiale", "schiaccia_o", "schiaccia_v", "grigio", "cubo_sx", "cubo_dx", "ribalta", "caduta", "zoom_out", "persiana"];

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const morbido = Easing.inOut(Easing.cubic);
// numero pseudo-casuale stabile per fotogramma (il render salta tra i fotogrammi: niente Math.random)
const e = (p: number) => morbido(Math.min(1, Math.max(0, p)));
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// stile della clip durante l'ingresso (p 0→1) o l'uscita (p 0→1)
function stile(tipo: string, p: number, entra: boolean, f: number): React.CSSProperties {
  const q = entra ? p : 1 - p; // 1 = clip piena
  switch (tipo) {
    case "dissolvenza": return { opacity: entra ? q : 1 };
    case "zoom_blur": {
      const s = entra ? interpolate(p, [0, 1], [1.35, 1], clamp) : interpolate(p, [0, 1], [1, 1.35], clamp);
      const b = interpolate(entra ? p : 1 - p, [0, 0.5, 1], [22, 6, 0], clamp);
      return { transform: `scale(${s})`, filter: `blur(${b}px)`, opacity: entra ? interpolate(p, [0, 0.35], [0, 1], clamp) : 1 };
    }
    case "zoom_in": return { transform: `scale(${entra ? interpolate(p, [0, 1], [0.7, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) }) : interpolate(p, [0, 1], [1, 1.6], clamp)})`, opacity: entra ? interpolate(p, [0, 0.3], [0, 1], clamp) : interpolate(p, [0.6, 1], [1, 0], clamp) };
    case "whip_sx": case "whip_dx": case "whip_su": {
      const dir = tipo === "whip_sx" ? -1 : 1, asseY = tipo === "whip_su";
      const sp = entra ? interpolate(p, [0, 1], [110, 0], { ...clamp, easing: Easing.out(Easing.exp) }) : interpolate(p, [0, 1], [0, -110], { ...clamp, easing: Easing.in(Easing.exp) });
      const b = interpolate(entra ? p : 1 - p, [0, 0.6, 1], [40, 10, 0], clamp);
      const tr = asseY ? `translateY(${-sp}%)` : `translateX(${sp * dir}%)`;
      return { transform: tr, filter: `blur(${b}px)` };
    }
    case "scorri_su": return { transform: `translateY(${entra ? interpolate(p, [0, 1], [100, 0], { ...clamp, easing: morbido }) : interpolate(p, [0, 1], [0, -30], { ...clamp, easing: morbido })}%)` };
    case "spin": {
      const r = entra ? interpolate(p, [0, 1], [-25, 0], { ...clamp, easing: Easing.out(Easing.cubic) }) : interpolate(p, [0, 1], [0, 25], { ...clamp, easing: Easing.in(Easing.cubic) });
      const s = entra ? interpolate(p, [0, 1], [1.5, 1], clamp) : interpolate(p, [0, 1], [1, 1.5], clamp);
      return { transform: `rotate(${r}deg) scale(${s})`, filter: `blur(${Math.abs(r) * 0.8}px)`, opacity: entra ? interpolate(p, [0, 0.4], [0, 1], clamp) : 1 };
    }
    case "iris": return entra ? { clipPath: `circle(${interpolate(p, [0, 1], [0, 75], { ...clamp, easing: morbido })}% at 50% 45%)` } : {};
    case "sfocatura": return { filter: `blur(${interpolate(entra ? p : 1 - p, [0, 1], [30, 0], clamp)}px)`, opacity: entra ? q : 1 };
    case "glitch": case "rgb_split": {
      const forza = interpolate(entra ? p : 1 - p, [0, 0.5, 1], [1, 0.6, 0], clamp);
      const dx = (rnd(f) - 0.5) * 60 * forza;
      return { transform: `translateX(${dx}px)`, filter: `saturate(${1 + forza}) contrast(${1 + forza * 0.4})`, opacity: entra ? (p < 0.5 ? (rnd(f + 7) > 0.5 ? 1 : 0) : 1) : 1 };
    }
    case "flash_bianco": case "flash_nero": case "light_leak": return entra ? { opacity: interpolate(p, [0, 0.45, 0.55], [0, 0, 1], clamp) } : {};
    // ---- tendine: la clip nuova si scopre da un lato
    case "tendina_sx": return entra ? { clipPath: `inset(0 0 0 ${100 - e(p) * 100}%)` } : {};
    case "tendina_dx": return entra ? { clipPath: `inset(0 ${100 - e(p) * 100}% 0 0)` } : {};
    case "tendina_su": return entra ? { clipPath: `inset(${100 - e(p) * 100}% 0 0 0)` } : {};
    case "tendina_giu": return entra ? { clipPath: `inset(0 0 ${100 - e(p) * 100}% 0)` } : {};
    // ---- spinte: la nuova spinge via la vecchia
    case "spingi_sx": return { transform: `translateX(${entra ? 100 - e(p) * 100 : -e(p) * 100}%)` };
    case "spingi_dx": return { transform: `translateX(${entra ? -100 + e(p) * 100 : e(p) * 100}%)` };
    case "spingi_giu": return { transform: `translateY(${entra ? -100 + e(p) * 100 : e(p) * 100}%)` };
    // ---- coperture: la nuova scorre sopra la vecchia ferma
    case "copri_sx": return entra ? { transform: `translateX(${100 - e(p) * 100}%)`, boxShadow: "0 0 60px rgba(0,0,0,.5)" } : {};
    case "copri_dx": return entra ? { transform: `translateX(${-100 + e(p) * 100}%)`, boxShadow: "0 0 60px rgba(0,0,0,.5)" } : {};
    case "copri_su": return entra ? { transform: `translateY(${100 - e(p) * 100}%)`, boxShadow: "0 0 60px rgba(0,0,0,.5)" } : {};
    case "copri_giu": return entra ? { transform: `translateY(${-100 + e(p) * 100}%)`, boxShadow: "0 0 60px rgba(0,0,0,.5)" } : {};
    // ---- forme
    case "cerchio_chiudi": { const r = (1 - e(p)) * 80; return entra ? { WebkitMaskImage: `radial-gradient(circle at 50% 45%, transparent ${r}%, #000 ${r + 0.5}%)`, maskImage: `radial-gradient(circle at 50% 45%, transparent ${r}%, #000 ${r + 0.5}%)` } : {}; }
    case "rombo": { const k = e(p) * 100; return entra ? { clipPath: `polygon(50% ${50 - k}%, ${50 + k}% 50%, 50% ${50 + k}%, ${50 - k}% 50%)` } : {}; }
    case "rettangolo": { const k = 50 - e(p) * 50; return entra ? { clipPath: `inset(${k}% ${k}% ${k}% ${k}%)` } : {}; }
    case "apri_verticale": { const k = 50 - e(p) * 50; return entra ? { clipPath: `inset(0 ${k}% 0 ${k}%)` } : {}; }
    case "apri_orizzontale": { const k = 50 - e(p) * 50; return entra ? { clipPath: `inset(${k}% 0 ${k}% 0)` } : {}; }
    case "diagonale_sx": { const k = e(p) * 200; return entra ? { clipPath: `polygon(0 0, ${k}% 0, 0 ${k}%)` } : {}; }
    case "diagonale_dx": { const k = e(p) * 200; return entra ? { clipPath: `polygon(100% 0, ${100 - k}% 0, 100% ${k}%)` } : {}; }
    case "strisce_orizzontali": { const k = e(p) * 10; const m = `repeating-linear-gradient(to bottom, #000 0 ${k}%, transparent ${k}% 10%)`; return entra ? { WebkitMaskImage: m, maskImage: m } : {}; }
    case "strisce_verticali": { const k = e(p) * 10; const m = `repeating-linear-gradient(to right, #000 0 ${k}%, transparent ${k}% 10%)`; return entra ? { WebkitMaskImage: m, maskImage: m } : {}; }
    case "persiana": { const k = e(p) * 12.5; const m = `repeating-linear-gradient(to bottom, #000 0 ${k}%, transparent ${k}% 12.5%)`; return entra ? { WebkitMaskImage: m, maskImage: m, transform: `scaleY(${1 + (1 - p) * 0.05})` } : {}; }
    case "radiale": { const m = `conic-gradient(from 0deg at 50% 45%, #000 ${e(p) * 360}deg, transparent ${e(p) * 360 + 0.5}deg)`; return entra ? { WebkitMaskImage: m, maskImage: m } : {}; }
    // ---- deformazioni
    case "schiaccia_o": return { transform: `scaleX(${entra ? e(p) : 1 - e(p)})` };
    case "schiaccia_v": return { transform: `scaleY(${entra ? e(p) : 1 - e(p)})` };
    case "grigio": return entra ? { opacity: interpolate(p, [0.5, 1], [0, 1], clamp), filter: `grayscale(${1 - p})` } : { filter: `grayscale(${Math.min(1, p * 2)})` };
    case "zoom_out": return entra ? { transform: `scale(${interpolate(p, [0, 1], [1.5, 1], { ...clamp, easing: morbido })})`, opacity: interpolate(p, [0, 0.5], [0, 1], clamp) } : { transform: `scale(${1 - e(p) * 0.3})` };
    case "caduta": return entra ? { transform: `translateY(${interpolate(p, [0, 1], [-100, 0], { ...clamp, easing: Easing.out(Easing.bounce) })}%)` } : {};
    // ---- 3D
    case "cubo_sx": return entra ? { transform: `perspective(1600px) rotateY(${90 - e(p) * 90}deg)`, transformOrigin: "left center" } : { transform: `perspective(1600px) rotateY(${-e(p) * 90}deg)`, transformOrigin: "right center" };
    case "cubo_dx": return entra ? { transform: `perspective(1600px) rotateY(${-90 + e(p) * 90}deg)`, transformOrigin: "right center" } : { transform: `perspective(1600px) rotateY(${e(p) * 90}deg)`, transformOrigin: "left center" };
    case "ribalta": return entra ? { transform: `perspective(1600px) rotateY(${p < 0.5 ? 90 : 90 - (p - 0.5) * 180}deg)`, opacity: p < 0.5 ? 0 : 1 } : { transform: `perspective(1600px) rotateY(${Math.min(90, p * 180)}deg)`, opacity: p < 0.5 ? 1 : 0 };
    default: return {};
  }
}

// la clip con il suo ingresso e la sua uscita (l'uscita usa la transizione d'ingresso della clip dopo)
export const PresenzaClip: React.FC<{ ingresso?: { tipo: string; durata: number }; uscita?: { tipo: string; durata: number }; durata: number; children: React.ReactNode }> = ({ ingresso, uscita, durata, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let st: React.CSSProperties = {};
  if (ingresso && ingresso.tipo !== "taglio") {
    const n = Math.max(1, ingresso.durata * fps);
    if (f < n) st = stile(ingresso.tipo, interpolate(f, [0, n], [0, 1], clamp), true, f);
  }
  if (uscita && uscita.tipo !== "taglio") {
    const n = Math.max(1, uscita.durata * fps), fine = durata * fps;
    if (f > fine - n) st = { ...st, ...stile(uscita.tipo, interpolate(f, [fine - n, fine], [0, 1], clamp), false, f) };
  }
  return <AbsoluteFill style={{ overflow: "hidden" }}><AbsoluteFill style={st}>{children}</AbsoluteFill></AbsoluteFill>;
};

// effetto sopra il taglio
export const Transizione: React.FC<{ tipo: string; accento: string }> = ({ tipo, accento }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = 0.45 * fps;
  const p = interpolate(f, [0, n], [0, 1], clamp);
  if (tipo === "flash_bianco" || tipo === "flash_nero") return <AbsoluteFill style={{ background: tipo === "flash_bianco" ? "#fff" : "#000", opacity: interpolate(p, [0, 0.45, 0.55, 1], [0, 1, 1, 0], clamp) }} />;
  if (tipo === "light_leak") {
    const x = interpolate(p, [0, 1], [-40, 120], clamp);
    return (
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: interpolate(p, [0, 0.3, 0.7, 1], [0, 1, 1, 0], clamp),
        background: `radial-gradient(ellipse 70% 55% at ${x}% 40%, rgba(255,170,80,.95), rgba(255,90,40,.55) 40%, transparent 72%), radial-gradient(ellipse 50% 40% at ${x - 30}% 70%, rgba(255,230,160,.8), transparent 70%)` }} />
    );
  }
  if (tipo === "glitch" || tipo === "rgb_split") {
    const forza = interpolate(p, [0, 0.4, 1], [1, 0.8, 0], clamp);
    const strisce = Array.from({ length: 7 }, (_, i) => ({ y: rnd(f * 3 + i) * 100, h: 2 + rnd(f + i * 5) * 9, dx: (rnd(f * 2 + i) - 0.5) * 140 * forza }));
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(255,0,80,${0.18 * forza}), transparent 30%, transparent 70%, rgba(0,220,255,${0.18 * forza}))`, mixBlendMode: "screen" }} />
        {strisce.map((s, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${s.y}%`, height: `${s.h}%`, transform: `translateX(${s.dx}px)`, background: i % 2 ? `rgba(255,255,255,${0.12 * forza})` : accento, opacity: 0.25 * forza, mixBlendMode: "screen" }} />)}
      </AbsoluteFill>
    );
  }
  if (tipo === "zoom_blur" || tipo === "whip_sx" || tipo === "whip_dx" || tipo === "whip_su") // un lampo di luce sul colpo
    return <AbsoluteFill style={{ background: "#fff", opacity: interpolate(p, [0, 0.2, 0.5], [0, 0.22, 0], clamp) }} />;
  return null;
};
