// Unica fonte di colori, curve e molle: niente valori sparsi nei componenti.
import { Easing } from "remotion";

export const FPS = 30;

export const temi = {
  dark: { bg: "#0E1116", bgAlt: "#171C24", text: "#F5F5F4", dim: "#A3A3A3", griglia: "rgba(255,255,255,0.08)" },
  light: { bg: "#F7F4EE", bgAlt: "#EDE8DF", text: "#17171A", dim: "#6B6B6B", griglia: "rgba(0,0,0,0.08)" },
} as const;

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // entrate
  inOut: Easing.bezier(0.83, 0, 0.17, 1), // movimenti
  in: Easing.bezier(0.7, 0, 0.84, 0), // uscite
};

export const molle = {
  snappy: { damping: 14, stiffness: 160, mass: 0.6 },
  smooth: { damping: 20, stiffness: 90, mass: 1 },
  bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
};
