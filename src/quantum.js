export const TAU = Math.PI * 2;
export const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/** Pure state: sqrt(1-p1)|0> + exp(i*phase)*sqrt(p1)|1>. */
export function blochVector(p1, phase) {
  const p = clamp(p1);
  const equator = 2 * Math.sqrt(p * (1 - p));
  return [equator * Math.cos(phase), equator * Math.sin(phase), 1 - 2 * p];
}

/** Probability of the positive eigenstate: |0> for Z, |+> for X. */
export function probabilityZero(p1, phase, basis = "z") {
  if (basis === "z") return 1 - clamp(p1);
  if (basis === "x") return clamp((1 + blochVector(p1, phase)[0]) / 2);
  throw new RangeError(`Unsupported basis: ${basis}`);
}

export function collapse(basis, outcome) {
  if (outcome !== 0 && outcome !== 1)
    throw new RangeError("Outcome must be 0 or 1");
  if (basis === "z") return { p1: outcome, phase: 0 };
  if (basis === "x") return { p1: 0.5, phase: outcome === 0 ? 0 : Math.PI };
  throw new RangeError(`Unsupported basis: ${basis}`);
}

export function measure(p1, phase, basis = "z", random = Math.random) {
  const outcome = random() < probabilityZero(p1, phase, basis) ? 0 : 1;
  return { outcome, state: collapse(basis, outcome) };
}

/** Two coherent plane-wave modes under a shared Gaussian envelope.
 * This visual field uses arbitrary units and is not a normalized spatial PDF.
 * A common time phase animates Re(psi) without changing |psi|^2.
 */
export function waveAt(x, z, p1, phase, time = 0) {
  const envelope = Math.exp(-(x * x * 0.13 + z * z * 0.23));
  const a = Math.sqrt(1 - clamp(p1));
  const b = Math.sqrt(clamp(p1));
  const phi0 = x * 3.1 + z * 1.1 - time;
  const phi1 = -x * 3.1 + z * 1.1 + phase - time;
  const real = envelope * (a * Math.cos(phi0) + b * Math.cos(phi1));
  const imaginary = envelope * (a * Math.sin(phi0) + b * Math.sin(phi1));
  return { real, imaginary, intensity: real * real + imaginary * imaginary };
}
