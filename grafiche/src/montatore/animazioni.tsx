// Animazioni di ENTRATA del testo, sul modello delle classi di animate.css (MIT) e delle preset di testo dei
// programmi di montaggio. Ogni preset dice da dove parte il testo (spostamento, scala, rotazione, sfocatura...)
// e con che curva arriva al suo posto. Si applica a lettere, parole o riga intera (campo "unita" del titolo).
import { Easing } from "remotion";
import { interpolate } from "../sicuro";
import type React from "react";

type Da = { x?: number; y?: number; s?: number; sx?: number; sy?: number; r?: number; rx?: number; ry?: number; b?: number; k?: number; o?: number };
type Curva = "morbida" | "ritorno" | "rimbalzo" | "elastica" | "secca";
export type Preset = { da: Da; curva: Curva; dur?: number; descr: string; it: string };

// x / y in % della grandezza dell'elemento, r in gradi, b = sfocatura px, k = inclinazione, o = opacità iniziale
export const PRESET: Record<string, Preset> = {
  dissolvi: { da: { o: 0 }, curva: "morbida", descr: "fadeIn", it: "compare in dissolvenza" },
  dissolvi_su: { da: { o: 0, y: 60 }, curva: "morbida", descr: "fadeInUp", it: "sale dal basso sfumando" },
  dissolvi_giu: { da: { o: 0, y: -60 }, curva: "morbida", descr: "fadeInDown", it: "scende dall'alto sfumando" },
  dissolvi_sx: { da: { o: 0, x: -60 }, curva: "morbida", descr: "fadeInLeft", it: "arriva da sinistra sfumando" },
  dissolvi_dx: { da: { o: 0, x: 60 }, curva: "morbida", descr: "fadeInRight", it: "arriva da destra sfumando" },
  dissolvi_su_lungo: { da: { o: 0, y: 220 }, curva: "morbida", descr: "fadeInUpBig", it: "sale da lontano" },
  dissolvi_giu_lungo: { da: { o: 0, y: -220 }, curva: "morbida", descr: "fadeInDownBig", it: "scende da lontano" },
  sfocato: { da: { o: 0, b: 18 }, curva: "morbida", descr: "blurIn", it: "va a fuoco" },
  sfocato_su: { da: { o: 0, b: 14, y: 40 }, curva: "morbida", descr: "blurInUp", it: "va a fuoco salendo" },
  sfocato_zoom: { da: { o: 0, b: 16, s: 1.4 }, curva: "morbida", descr: "blurZoomIn", it: "va a fuoco rimpicciolendo" },
  zoom: { da: { o: 0, s: 0.3 }, curva: "morbida", descr: "zoomIn", it: "si ingrandisce dal piccolo" },
  zoom_grande: { da: { o: 0, s: 2.4 }, curva: "morbida", descr: "zoomOut-in", it: "arriva enorme e si rimpicciolisce" },
  zoom_su: { da: { o: 0, s: 0.4, y: 120 }, curva: "ritorno", descr: "zoomInUp", it: "si ingrandisce salendo" },
  zoom_giu: { da: { o: 0, s: 0.4, y: -120 }, curva: "ritorno", descr: "zoomInDown", it: "si ingrandisce scendendo" },
  zoom_sx: { da: { o: 0, s: 0.4, x: -120 }, curva: "ritorno", descr: "zoomInLeft", it: "si ingrandisce da sinistra" },
  zoom_dx: { da: { o: 0, s: 0.4, x: 120 }, curva: "ritorno", descr: "zoomInRight", it: "si ingrandisce da destra" },
  rimbalzo: { da: { o: 0, s: 0.3 }, curva: "rimbalzo", descr: "bounceIn", it: "entra rimbalzando" },
  rimbalzo_su: { da: { o: 0, y: 160 }, curva: "rimbalzo", descr: "bounceInUp", it: "rimbalza dal basso" },
  rimbalzo_giu: { da: { o: 0, y: -160 }, curva: "rimbalzo", descr: "bounceInDown", it: "cade e rimbalza" },
  rimbalzo_sx: { da: { o: 0, x: -160 }, curva: "rimbalzo", descr: "bounceInLeft", it: "rimbalza da sinistra" },
  rimbalzo_dx: { da: { o: 0, x: 160 }, curva: "rimbalzo", descr: "bounceInRight", it: "rimbalza da destra" },
  scivola_su: { da: { y: 100 }, curva: "morbida", descr: "slideInUp", it: "scivola su (nascosto sotto una riga)" },
  scivola_giu: { da: { y: -100 }, curva: "morbida", descr: "slideInDown", it: "scivola giù" },
  scivola_sx: { da: { x: -100, o: 0 }, curva: "morbida", descr: "slideInLeft", it: "scivola da sinistra" },
  scivola_dx: { da: { x: 100, o: 0 }, curva: "morbida", descr: "slideInRight", it: "scivola da destra" },
  indietro_su: { da: { o: 0, y: 140, s: 0.7 }, curva: "ritorno", descr: "backInUp", it: "torna indietro salendo" },
  indietro_giu: { da: { o: 0, y: -140, s: 0.7 }, curva: "ritorno", descr: "backInDown", it: "torna indietro scendendo" },
  indietro_sx: { da: { o: 0, x: -140, s: 0.7 }, curva: "ritorno", descr: "backInLeft", it: "torna indietro da sinistra" },
  indietro_dx: { da: { o: 0, x: 140, s: 0.7 }, curva: "ritorno", descr: "backInRight", it: "torna indietro da destra" },
  ruota: { da: { o: 0, r: -200 }, curva: "morbida", descr: "rotateIn", it: "entra ruotando" },
  ruota_basso_sx: { da: { o: 0, r: -45, y: 40 }, curva: "morbida", descr: "rotateInDownLeft", it: "ruota dal basso a sinistra" },
  ruota_basso_dx: { da: { o: 0, r: 45, y: 40 }, curva: "morbida", descr: "rotateInDownRight", it: "ruota dal basso a destra" },
  ruota_alto_sx: { da: { o: 0, r: 45, y: -40 }, curva: "morbida", descr: "rotateInUpLeft", it: "ruota dall'alto a sinistra" },
  ruota_alto_dx: { da: { o: 0, r: -45, y: -40 }, curva: "morbida", descr: "rotateInUpRight", it: "ruota dall'alto a destra" },
  gira_x: { da: { o: 0, rx: 90 }, curva: "ritorno", descr: "flipInX", it: "si gira in verticale" },
  gira_y: { da: { o: 0, ry: 90 }, curva: "ritorno", descr: "flipInY", it: "si gira in orizzontale" },
  luce_sx: { da: { o: 0, x: -140, k: 30 }, curva: "secca", descr: "lightSpeedInLeft", it: "arriva veloce inclinato da sinistra" },
  luce_dx: { da: { o: 0, x: 140, k: -30 }, curva: "secca", descr: "lightSpeedInRight", it: "arriva veloce inclinato da destra" },
  rotola: { da: { o: 0, x: -120, r: -120 }, curva: "morbida", descr: "rollIn", it: "rotola dentro" },
  scatola: { da: { o: 0, s: 0.1, r: 30 }, curva: "elastica", descr: "jackInTheBox", it: "salta fuori come da una scatola" },
  elastico: { da: { o: 0, sx: 1.6, sy: 0.4 }, curva: "elastica", descr: "rubberBand-in", it: "entra schiacciato ed elastico" },
  allunga_o: { da: { o: 0, sx: 0 }, curva: "ritorno", descr: "stretchInX", it: "si allunga in orizzontale" },
  allunga_v: { da: { o: 0, sy: 0 }, curva: "ritorno", descr: "stretchInY", it: "si allunga in verticale" },
  cade: { da: { o: 0, y: -300, r: 12 }, curva: "rimbalzo", descr: "drop", it: "cade dall'alto" },
  pop: { da: { o: 0, s: 0 }, curva: "elastica", descr: "popIn", it: "esplode fuori" },
  impatto: { da: { o: 0, s: 3 }, curva: "secca", descr: "slam", it: "sbatte sullo schermo" },
  inclina: { da: { o: 0, k: 40, x: -40 }, curva: "ritorno", descr: "skewIn", it: "entra inclinato" },
  onda: { da: { o: 0, y: 70, r: 8 }, curva: "elastica", descr: "wave", it: "a onda, una dopo l'altra" },
};

const ease = (c: Curva) => c === "ritorno" ? Easing.out(Easing.back(1.7)) : c === "rimbalzo" ? Easing.out(Easing.bounce)
  : c === "elastica" ? Easing.out(Easing.elastic(1.1)) : c === "secca" ? Easing.out(Easing.exp) : Easing.out(Easing.cubic);

// stile dell'elemento a "t" fotogrammi dal suo inizio (durata in fotogrammi)
export function animaStile(nome: string, t: number, durata = 18): React.CSSProperties {
  const P = PRESET[nome] || PRESET.dissolvi_su;
  const n = Math.max(4, Math.round(durata * (P.dur || 1)));
  const p = interpolate(t, [0, n], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease(P.curva) });
  const q = 1 - p, d = P.da;
  const op = d.o === undefined ? 1 : interpolate(t, [0, n * 0.45], [d.o, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tr = [
    d.x || d.y ? `translate(${(d.x || 0) * q}%, ${(d.y || 0) * q}%)` : "",
    d.s !== undefined ? `scale(${1 + (d.s - 1) * q})` : "",
    d.sx !== undefined || d.sy !== undefined ? `scale(${1 + ((d.sx ?? 1) - 1) * q}, ${1 + ((d.sy ?? 1) - 1) * q})` : "",
    d.r ? `rotate(${d.r * q}deg)` : "", d.rx ? `perspective(600px) rotateX(${d.rx * q}deg)` : "", d.ry ? `perspective(600px) rotateY(${d.ry * q}deg)` : "",
    d.k ? `skewX(${d.k * q}deg)` : "",
  ].filter(Boolean).join(" ");
  return { display: "inline-block", opacity: t < 0 ? 0 : op, transform: tr || undefined, filter: d.b ? `blur(${d.b * q}px)` : undefined, whiteSpace: "pre" };
}
