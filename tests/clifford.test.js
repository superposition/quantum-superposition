import test from "node:test";
import assert from "node:assert/strict";
import {
  gates,
  applySequence,
  sequenceAxes,
  cliffordOrientations,
  stateName,
  stabilizerStates,
} from "../src/clifford.js";
import { blochVector, probabilityZero, measure } from "../src/quantum.js";
const close = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const conjugate = (a) => [a[0], -a[1]];
const q = Math.SQRT1_2;
const matrices = {
  h: [
    [
      [q, 0],
      [q, 0],
    ],
    [
      [q, 0],
      [-q, 0],
    ],
  ],
  s: [
    [
      [1, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, 1],
    ],
  ],
  sdg: [
    [
      [1, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [0, -1],
    ],
  ],
  x: [
    [
      [0, 0],
      [1, 0],
    ],
    [
      [1, 0],
      [0, 0],
    ],
  ],
  y: [
    [
      [0, 0],
      [0, -1],
    ],
    [
      [0, 1],
      [0, 0],
    ],
  ],
  z: [
    [
      [1, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [-1, 0],
    ],
  ],
};
const matrixProduct = (a, b) =>
  a.map((row) =>
    b[0].map((_, j) => add(mul(row[0], b[0][j]), mul(row[1], b[1][j]))),
  );
const adjoint = (a) => a[0].map((_, i) => a.map((row) => conjugate(row[i])));

test("Clifford rotations agree with independent complex gate matrices on arbitrary states", () => {
  const sequences = [
    ...Object.keys(gates).map((key) => [key]),
    ["h", "s"],
    ["s", "h"],
    ["h", "s", "x", "sdg", "y", "z", "h"],
  ];
  for (const p1 of [0, 0.07, 0.3, 0.5, 0.91, 1])
    for (const phase of [0, 0.17, 1.7, Math.PI, 5.4])
      for (const sequence of sequences) {
        let amplitudes = [
          [Math.sqrt(1 - p1), 0],
          [Math.sqrt(p1) * Math.cos(phase), Math.sqrt(p1) * Math.sin(phase)],
        ];
        for (const gate of sequence)
          amplitudes = matrices[gate].map((row) =>
            add(mul(row[0], amplitudes[0]), mul(row[1], amplitudes[1])),
          );
        const [a, b] = amplitudes;
        const ab = mul(conjugate(a), b);
        const expected = [
          2 * ab[0],
          2 * ab[1],
          mul(conjugate(a), a)[0] - mul(conjugate(b), b)[0],
        ];
        const actual = applySequence({ p1, phase }, sequence);
        blochVector(actual.p1, actual.phase).forEach((v, i) =>
          close(v, expected[i]),
        );
      }
});

test("signed Pauli mappings use forward conjugation, including negative Y under Hadamard", () => {
  for (const [key, gate] of Object.entries(gates))
    for (const [i, pauli] of ["x", "y", "z"].entries()) {
      const result = matrixProduct(
        matrixProduct(matrices[key], matrices[pauli]),
        adjoint(matrices[key]),
      );
      const axis = gate.axes[i];
      const expected = matrices[["x", "y", "z"][Math.abs(axis) - 1]];
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 2; col++)
          for (let part = 0; part < 2; part++)
            close(
              result[row][col][part],
              Math.sign(axis) * expected[row][col][part],
            );
    }
  assert.deepEqual(sequenceAxes(["h"]), [3, -2, 1]);
  assert.deepEqual(sequenceAxes(["h", "s"]), [3, 1, 2]);
});

test("Hadamard and phase generate exactly 24 proper orientations and six stabilizer states", () => {
  assert.equal(cliffordOrientations.length, 24);
  assert.equal(new Set(cliffordOrientations.map((a) => a.join())).size, 24);
  for (const axes of cliffordOrientations) {
    assert.deepEqual(axes.map(Math.abs).sort(), [1, 2, 3]);
    const columns = axes.map((axis) =>
      [1, 2, 3].map((i) => (Math.abs(axis) === i ? Math.sign(axis) : 0)),
    );
    const [a, b, c] = columns;
    const cross = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    close(
      cross.reduce((sum, v, i) => sum + v * c[i], 0),
      1,
    );
  }
  for (const state of stabilizerStates)
    for (const gate of Object.keys(gates))
      assert.notEqual(
        stateName(applySequence(state, [gate])),
        "General pure state",
      );
  for (const sequence of [
    ["h", "h"],
    ["s", "s", "s", "s"],
    ["s", "sdg"],
    ["x", "x"],
    ["y", "y"],
    ["z", "z"],
  ])
    assert.deepEqual(sequenceAxes(sequence), [1, 2, 3]);
  assert.throws(() => sequenceAxes(["invalid"]), RangeError);
});

test("gate order and Y measurements distinguish the documented examples", () => {
  const input = { p1: 0, phase: 0 };
  const hs = applySequence(input, ["h", "s"]),
    sh = applySequence(input, ["s", "h"]);
  assert.equal(stateName(hs), "Y positive");
  assert.equal(stateName(sh), "Plus");
  close(probabilityZero(hs.p1, hs.phase, "y"), 1);
  close(probabilityZero(sh.p1, sh.phase, "y"), 0.5);
  for (const outcome of [0, 1]) {
    const result = measure(0.5, 0, "y", () => (outcome ? 0.9 : 0.1));
    assert.equal(result.outcome, outcome);
    for (const random of [0, 0.2, 0.999])
      assert.equal(
        measure(result.state.p1, result.state.phase, "y", () => random).outcome,
        outcome,
      );
  }
});
