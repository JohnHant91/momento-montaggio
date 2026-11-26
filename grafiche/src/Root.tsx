import React from "react";
import { Composition } from "remotion";
import { Pannello, PannelloProps } from "./Pannello";
import { FPS } from "./theme";
import { Split, SplitProps } from "./Split";
import { Dietro, DietroProps } from "./Dietro";
import { Montaggio, MontaggioProps } from "./Montaggio";
import { AbsoluteFill } from "remotion";
import { Sottotitoli, SottotitoliProps } from "./montatore/sottotitoli";

// anteprima di uno stile di sottotitoli su sfondo neutro (per l'archivio Stili)
const ProvaSottotitoli: React.FC<SottotitoliProps> = (p) => (<AbsoluteFill style={{ background: "linear-gradient(160deg,#3a4a5a,#1b2330)" }}><Sottotitoli {...p} y={960} /></AbsoluteFill>);

const esempio: PannelloProps = {
  chip: "TIP",
  titolo: "Prenotazioni dirette in 6 mesi",
  tipo: "line",
  punti: [
    { etichetta: "Gen", valore: 12 },
    { etichetta: "Feb", valore: 18 },
    { etichetta: "Mar", valore: 25 },
    { etichetta: "Apr", valore: 41 },
    { etichetta: "Mag", valore: 58 },
    { etichetta: "Giu", valore: 74 },
  ],
  unita: "",
  badge: "6x in sei mesi",
  accento: "#D97757",
  tema: "dark",
  durata: 8,
  grafico_in: 0.6,
};

const esempioSplit: SplitProps = {
  durata: 6, fps: 30, video: "base.mp4", volto: { cx: 0.5, cy: 0.3 },
  palette: { fondo: "#F1EFEA", inchiostro: "#17171A", accento: "#0E9F9A", secondario: "#CFE9E7", tenue: "rgba(23,23,26,0.08)" },
  parole: [{ t: "ciao", da: 0.2, a: 0.5 }], righe: [{ da: 0.2, a: 0.5, p: [0] }],
  scene: [{ da: 0, a: 3, tipo: "titolo", dati: { testo: "Prova split", accento: "split" } }], tracker: null,
};

export const Root: React.FC = () => (
  <>
  <Composition
    id="Split"
    component={Split}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 6}
    defaultProps={esempioSplit}
    calculateMetadata={({ props }) => ({ fps: props.fps || FPS, durationInFrames: Math.max(30, Math.ceil((props.durata || 6) * (props.fps || FPS))) })}
  />
  <Composition
    id="Dietro"
    component={Dietro}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 6}
    defaultProps={{ ...esempioSplit, adesivi: [] } as DietroProps}
    calculateMetadata={({ props }) => ({ fps: props.fps || FPS, durationInFrames: Math.max(30, Math.ceil((props.durata || 6) * (props.fps || FPS))) })}
  />
  <Composition
    id="Montaggio"
    component={Montaggio}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 6}
    defaultProps={{ fps: 30, durata: 6, clip: [] } as MontaggioProps}
    calculateMetadata={({ props }) => ({ fps: props.fps || FPS, width: props.larghezza || 1080, height: props.altezza || 1920, durationInFrames: Math.max(30, Math.ceil((props.durata || 6) * (props.fps || FPS))) })}
  />
  <Composition
    id="ProvaSottotitoli"
    component={ProvaSottotitoli}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={{ stile: "box", accento: "#FFD60A", font: "Montserrat, Arial, sans-serif", parole: [{ t: "Questo", da: 0.1, a: 0.4 }, { t: "panettone", da: 0.4, a: 0.9, k: true }, { t: "cambia", da: 0.9, a: 1.3 }, { t: "tutto", da: 1.3, a: 1.8 }] } as SottotitoliProps}
  />
  <Composition
    id="Pannello"
    component={Pannello}
    width={1080}
    height={960}
    fps={FPS}
    durationInFrames={FPS * 8}
    defaultProps={esempio}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(FPS * 2, Math.ceil((props.durata || 8) * FPS)) })}
  />
  </>
);
