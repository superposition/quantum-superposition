import { blochVector, clamp, TAU } from "./quantum.js";

// Images of positive X, Y and Z under U P U-dagger. A signed axis
// uses 1, 2 or 3 for X, Y or Z. Global phase is intentionally omitted.
export const gates = {
  h: {
    name: "Hadamard",
    axes: [3, -2, 1],
    explanation:
      "Exchanges the X and Z directions and reverses the Y direction.",
  },
  s: {
    name: "Phase",
    axes: [2, -1, 3],
    explanation:
      "Turns the state one quarter turn around Z. Plus becomes Y positive.",
  },
  sdg: {
    name: "Inverse phase",
    axes: [-2, 1, 3],
    explanation: "Reverses the quarter turn of the phase gate.",
  },
  x: {
    name: "Pauli X",
    axes: [1, -2, -3],
    explanation:
      "Turns the state half a turn around X. Zero and one exchange places.",
  },
  y: {
    name: "Pauli Y",
    axes: [-1, 2, -3],
    explanation:
      "Turns the state half a turn around Y. The X and Z directions reverse.",
  },
  z: {
    name: "Pauli Z",
    axes: [-1, -2, 3],
    explanation:
      "Turns the state half a turn around Z. Plus and minus exchange places.",
  },
};

export function transformVector(vector, axes) {
  const result = [0, 0, 0];
  axes.forEach((axis, i) => {
    result[Math.abs(axis) - 1] = Math.sign(axis) * vector[i];
  });
  return result;
}

export function composeAxes(previous, next) {
  return previous.map((axis) => Math.sign(axis) * next[Math.abs(axis) - 1]);
}

export function sequenceAxes(sequence) {
  return sequence.reduce(
    (axes, key) => {
      if (!gates[key]) throw new RangeError(`Unknown gate: ${key}`);
      return composeAxes(axes, gates[key].axes);
    },
    [1, 2, 3],
  );
}

export function stateFromVector([x, y, z]) {
  const p1 = clamp((1 - z) / 2);
  return {
    p1,
    phase: Math.hypot(x, y) < 1e-12 ? 0 : (Math.atan2(y, x) + TAU) % TAU,
  };
}

export function applySequence(input, sequence) {
  return stateFromVector(
    transformVector(blochVector(input.p1, input.phase), sequenceAxes(sequence)),
  );
}

export const stabilizerStates = [
  { name: "Plus", axis: 1, p1: 0.5, phase: 0 },
  { name: "Minus", axis: -1, p1: 0.5, phase: Math.PI },
  { name: "Y positive", axis: 2, p1: 0.5, phase: Math.PI / 2 },
  { name: "Y negative", axis: -2, p1: 0.5, phase: Math.PI * 1.5 },
  { name: "Zero", axis: 3, p1: 0, phase: 0 },
  { name: "One", axis: -3, p1: 1, phase: 0 },
];

export function stateName(state) {
  const vector = blochVector(state.p1, state.phase);
  return (
    stabilizerStates.find(
      ({ axis }) => Math.sign(axis) * vector[Math.abs(axis) - 1] > 1 - 1e-10,
    )?.name ?? "General pure state"
  );
}

export function operatorName(axis) {
  return `${axis > 0 ? "Positive" : "Negative"} ${["X", "Y", "Z"][Math.abs(axis) - 1]}`;
}

export const cliffordOrientations = [[1, 2, 3]];
const known = new Set(["1,2,3"]);
for (let i = 0; i < cliffordOrientations.length; i++) {
  for (const gate of [gates.h, gates.s]) {
    const next = composeAxes(cliffordOrientations[i], gate.axes);
    if (!known.has(next.join())) {
      known.add(next.join());
      cliffordOrientations.push(next);
    }
  }
}
