import React from "react";
import { Composition } from "remotion";
import { Pannello, PannelloProps } from "./Pannello";
import { FPS } from "./theme";

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

export const Root: React.FC = () => (
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
);
