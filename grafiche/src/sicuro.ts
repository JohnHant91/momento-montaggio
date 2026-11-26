// interpolate che non fa mai cadere il render: se i punti di ingresso non crescono (scene cortissime, durate a zero)
// li distanzia di un soffio invece di lanciare "inputRange must be strictly monotonically increasing".
import { interpolate as base } from "remotion";

export const interpolate: typeof base = (v, ingresso, uscita, opzioni) => {
  const x = [...ingresso];
  for (let i = 1; i < x.length; i++) if (!(x[i] > x[i - 1])) x[i] = x[i - 1] + 1e-4;
  return base(Number.isFinite(v) ? v : 0, x, uscita, opzioni);
};
