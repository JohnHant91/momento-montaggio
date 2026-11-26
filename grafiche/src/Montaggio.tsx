// MONTATORE MOMENTO — una sola composizione Remotion che monta tutto il reel da una "timeline" preparata dal motore:
// clip tagliate sul ritmo della musica, transizioni (zoom blur, whip, glitch, rgb split, flash, light leak, dissolvenze…),
// movimenti di camera, motion graphics (titoli animati presi da Magic UI e dai componenti del video-toolkit),
// sottotitoli animati, look (grana, vignettatura, light leak, bande cinema), musica con ducking ed effetti sonori.
// Regole fisse: la faccia resta sempre libera (le grafiche stanno ai lati, sopra la testa o dietro), i sottotitoli
// stanno sotto, tutto dentro la safe zone di Reels / TikTok / Shorts.
import React from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Img, Sequence, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "./sicuro";
import { getAvailableFonts } from "@remotion/google-fonts";
import { loadFont as sansMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as sansInter } from "@remotion/google-fonts/Inter";
import { loadFont as dispBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as serifPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as scriptPacifico } from "@remotion/google-fonts/Pacifico";
import { Transizione, PresenzaClip, TIPI_TRANSIZIONE } from "./montatore/transizioni";
import { Titolo, TitoloProps } from "./montatore/titoli";
import { Sottotitoli, SottotitoliProps } from "./montatore/sottotitoli";
import { Look, LookProps } from "./montatore/look";
import { Elemento, ElementoM, BarraAvanzamento } from "./montatore/elementi";

const FONT: Record<string, string> = {
  montserrat: sansMontserrat().fontFamily,
  inter: sansInter().fontFamily,
  bebas: dispBebas().fontFamily,
  playfair: serifPlayfair().fontFamily,
  pacifico: scriptPacifico().fontFamily,
};
// TUTTI i Google Fonts (~1.700, licenza libera): oltre ai 5 di casa, qualsiasi famiglia chiesta per nome si scarica al render
const norm = (x: string) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const DISPONIBILI = getAvailableFonts();
const caricati: Record<string, string> = {};
export function caricaFont(nome?: string) {
  const k = norm(nome || "");
  if (!k || FONT[k] || caricati[k]) return;
  const f = DISPONIBILI.find((x) => norm(x.fontFamily) === k || norm(x.importName) === k);
  if (!f) return;
  caricati[k] = `"${f.fontFamily}"`;
  const h = delayRender(`font ${f.fontFamily}`);
  f.load().then((m) => m.loadFont().waitUntilDone()).then(() => continueRender(h)).catch(() => continueRender(h));
}
export const font = (n?: string) => FONT[norm(n || "montserrat")] || caricati[norm(n || "")] || FONT.montserrat;

export type ClipM = {
  src: string;            // file in public/ (già tagliato, raddrizzato e col colore sistemato dal motore)
  foto?: boolean;         // immagine ferma invece di video (Ken Burns)
  inizio: number;         // secondi sul reel
  durata: number;         // secondi sul reel (comprende la sovrapposizione della transizione d'ingresso)
  da?: number;            // secondi di partenza dentro il file
  velocita?: number;      // 0.5 = rallenty
  volume?: number;        // 0 = muto
  movimento?: "fermo" | "push_in" | "push_out" | "pan_sx" | "pan_dx" | "sali" | "scendi" | "punch" | "shake" | "ken_burns";
  fuoco?: { x: number; y: number }; // punto da tenere al centro degli zoom (0-1)
  ingresso?: { tipo: string; durata: number };
};
export type SfxM = { t: number; file: string; volume?: number };
export type MontaggioProps = {
  fps: number; durata: number; larghezza?: number; altezza?: number;
  clip: ClipM[];
  titoli?: TitoloProps[];
  sottotitoli?: SottotitoliProps | null;
  look?: LookProps;
  audio?: { musica?: { file: string; volume?: number; da?: number; ducking?: { da: number; a: number }[]; fade_out?: number } | null; sfx?: SfxM[] };
  palette?: { accento?: string; testo?: string; sfondo?: string; secondario?: string };
  font?: { titoli?: string; testo?: string };
  finale?: { tipo: "bianco" | "nero" | "taglio"; durata?: number; logo?: string | null; coda?: number } | null;
  elementi?: ElementoM[];   // frecce, cerchi, spunte, conto alla rovescia… (montatore/elementi.tsx)
  barra?: boolean;          // barra di avanzamento in alto
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// movimento di camera dentro la clip (sempre morbido: easing, mai lineare a scatti)
const Movimento: React.FC<{ c: ClipM; children: React.ReactNode }> = ({ c, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(1, c.durata * fps);
  const t = interpolate(f, [0, n], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const fx = (c.fuoco?.x ?? 0.5) * 100, fy = (c.fuoco?.y ?? 0.4) * 100;
  let s = 1, x = 0, y = 0, r = 0;
  switch (c.movimento) {
    case "push_in": s = 1.0 + 0.1 * t; break;
    case "push_out": s = 1.12 - 0.1 * t; break;
    case "ken_burns": s = 1.04 + 0.08 * t; x = -2 + 4 * t; break;
    case "pan_sx": s = 1.12; x = 4 - 8 * t; break;
    case "pan_dx": s = 1.12; x = -4 + 8 * t; break;
    case "sali": s = 1.12; y = 4 - 8 * t; break;
    case "scendi": s = 1.12; y = -4 + 8 * t; break;
    case "punch": { const p = spring({ frame: f, fps, config: { damping: 14, stiffness: 160 } }); s = 1.16 - 0.08 * p; break; }
    case "shake": { s = 1.08; x = Math.sin(f * 1.9) * 0.6 + Math.sin(f * 4.3) * 0.35; y = Math.cos(f * 2.3) * 0.5; r = Math.sin(f * 1.3) * 0.4; break; }
    default: s = 1.0 + 0.02 * t; // anche "fermo" respira appena: un'immagine perfettamente ferma sembra un errore
  }
  return <AbsoluteFill style={{ transform: `translate(${x}%, ${y}%) scale(${s}) rotate(${r}deg)`, transformOrigin: `${fx}% ${fy}%` }}>{children}</AbsoluteFill>;
};

const Media: React.FC<{ c: ClipM }> = ({ c }) => {
  const { fps } = useVideoConfig();
  const stile: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  if (c.foto) return <Img src={staticFile(c.src)} style={stile} />;
  return <OffthreadVideo src={staticFile(c.src)} startFrom={Math.round((c.da || 0) * fps)} playbackRate={c.velocita || 1} volume={c.volume ?? 0} muted={!c.volume} style={stile} />;
};

export const Montaggio: React.FC<MontaggioProps> = (P) => {
  // font chiesti per nome (titoli, testo, sottotitoli, singoli titoli): caricati una volta prima del primo fotogramma
  React.useState(() => { [P.font?.titoli, P.font?.testo, P.sottotitoli?.font, ...(P.titoli || []).map((t: any) => t.font)].forEach((n) => caricaFont(n)); return 0; });
  const { fps } = useVideoConfig();
  const f = useCurrentFrame();
  const accento = P.palette?.accento || "#FFD43B";
  const clip = P.clip || [];
  // dissolvenza finale (mai troncato): al bianco o al nero
  const fin = P.finale && P.finale.tipo !== "taglio" ? P.finale : null;
  // con il logo: il bianco arriva prima e resta (coda), poi il logo entra piano al centro
  const coda = (fin?.logo ? fin.coda || 2.2 : 0) * fps;
  const fd = (fin?.durata || 0.8) * fps, tot = P.durata * fps - coda;
  const chiusura = fin ? interpolate(f, [tot - fd, tot - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) : 0;
  const logoP = fin?.logo ? spring({ frame: f - tot, fps, config: { damping: 20, stiffness: 90 } }) : 0;
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: font(P.font?.testo) }}>
      {clip.map((c, i) => {
        const succ = clip[i + 1];
        return (
          <Sequence key={i} from={Math.round(c.inizio * fps)} durationInFrames={Math.max(1, Math.round(c.durata * fps))}>
            <PresenzaClip ingresso={c.ingresso} uscita={succ?.ingresso} durata={c.durata}>
              <Movimento c={c}><Media c={c} /></Movimento>
            </PresenzaClip>
          </Sequence>
        );
      })}
      {/* effetti che stanno SOPRA il taglio (flash, light leak, glitch sul colpo) */}
      {clip.slice(1).map((c, i) => c.ingresso && c.ingresso.tipo !== "taglio" ? (
        <Sequence key={"tr" + i} from={Math.round((c.inizio) * fps)} durationInFrames={Math.max(1, Math.round((c.ingresso.durata || 0.4) * fps))}>
          <Transizione tipo={c.ingresso.tipo} accento={accento} />
        </Sequence>
      ) : null)}
      <Look {...(P.look || {})} accento={accento} durata={P.durata} />
      {(P.titoli || []).map((t, i) => (
        <Sequence key={"t" + i} from={Math.round(t.da * fps)} durationInFrames={Math.max(1, Math.round((t.a - t.da) * fps))}>
          <Titolo {...t} accento={t.accento || accento} font={font(t.font || P.font?.titoli)} fontTesto={font(P.font?.testo)} />
        </Sequence>
      ))}
      {(P.elementi || []).map((e, i) => (
        <Sequence key={"e" + i} from={Math.round(e.da * fps)} durationInFrames={Math.max(1, Math.round((e.a - e.da) * fps))}>
          <Elemento {...e} accento={accento} font={font(P.font?.titoli)} />
        </Sequence>
      ))}
      {P.barra ? <BarraAvanzamento colore={accento} durata={P.durata} /> : null}
      {P.sottotitoli ? <Sottotitoli {...P.sottotitoli} accento={P.sottotitoli.accento || accento} font={font(P.sottotitoli.font || P.font?.testo)} /> : null}
      {/* audio: musica (con ducking sotto la voce e chiusura sfumata) ed effetti sonori sui tagli */}
      {P.audio?.musica ? <Musica {...P.audio.musica} durata={P.durata} /> : null}
      {(P.audio?.sfx || []).map((s, i) => (
        <Sequence key={"s" + i} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(2.5 * fps)}>
          <Audio src={staticFile(s.file)} volume={s.volume ?? 0.6} />
        </Sequence>
      ))}
      {fin ? <AbsoluteFill style={{ background: fin.tipo === "bianco" ? "#fff" : "#000", opacity: chiusura }} /> : null}
      {fin?.logo && f >= tot ? <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img src={staticFile(fin.logo)} style={{ width: 520, maxHeight: 520, objectFit: "contain", opacity: logoP, transform: `scale(${0.9 + 0.1 * logoP})`, filter: `blur(${(1 - logoP) * 10}px)` }} />
      </AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

const Musica: React.FC<{ file: string; volume?: number; da?: number; ducking?: { da: number; a: number }[]; fade_out?: number; durata: number }> = (m) => {
  const { fps } = useVideoConfig();
  const base = m.volume ?? 0.8, fo = (m.fade_out ?? 1.5) * fps, tot = m.durata * fps;
  return (
    <Audio src={staticFile(m.file)} startFrom={Math.round((m.da || 0) * fps)} volume={(fr) => {
      let v = base * interpolate(fr, [0, 8], [0, 1], clamp) * interpolate(fr, [tot - fo, tot], [1, 0], clamp);
      for (const d of m.ducking || []) { // la musica si abbassa quando qualcuno parla
        const a = d.da * fps, b = d.a * fps;
        if (fr > a - 8 && fr < b + 8) v *= interpolate(fr, [a - 8, a, b, b + 8], [1, 0.28, 0.28, 1], clamp);
      }
      return v;
    }} />
  );
};

export { TIPI_TRANSIZIONE };
