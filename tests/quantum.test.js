import test from "node:test";
import assert from "node:assert/strict";
import {
  blochVector,
  probabilityZero,
  collapse,
  measure,
  waveAt,
  dephasedVector,
  purity,
  sectionRadius,
} from "../src/quantum.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test("pure states stay normalized on the Bloch sphere", () => {
  for (let p = 0; p <= 100; p++)
    for (let phi = 0; phi < 7; phi++) {
      const vector = blochVector(p / 100, phi);
      close(
        vector.reduce((sum, x) => sum + x * x, 0),
        1,
      );
      close(probabilityZero(p / 100, phi, "z"), 1 - p / 100);
    }
});
test("phase distinguishes coherent plus and minus states in X but not Z", () => {
  close(probabilityZero(0.5, 0, "x"), 1);
  close(probabilityZero(0.5, Math.PI, "x"), 0);
  close(probabilityZero(0.5, 0, "z"), 0.5);
  close(probabilityZero(0.5, Math.PI, "z"), 0.5);
});
test("remeasuring a collapsed state in its own basis repeats the outcome", () => {
  for (const basis of ["z", "x", "y"])
    for (const outcome of [0, 1]) {
      const state = collapse(basis, outcome);
      for (const r of [0, 0.1, 0.5, 0.999999999])
        assert.equal(
          measure(state.p1, state.phase, basis, () => r).outcome,
          outcome,
        );
    }
});
test("measurement follows the Born threshold and cross-basis probabilities", () => {
  assert.equal(measure(0.3, 0.8, "z", () => 0.69).outcome, 0);
  assert.equal(measure(0.3, 0.8, "z", () => 0.71).outcome, 1);
  close(probabilityZero(0, 0, "x"), 0.5);
  close(probabilityZero(1, 0, "x"), 0.5);
});
test("coherent waves interfere, cancel, and preserve intensity under global phase", () => {
  close(waveAt(0, 0, 0.5, 0).intensity, 2);
  close(waveAt(0, 0, 0.5, Math.PI).intensity, 0);
  for (const t of [0, 0.5, 2, 9])
    close(
      waveAt(0.8, 0.3, 0.7, 1.2, t).intensity,
      waveAt(0.8, 0.3, 0.7, 1.2, 0).intensity,
    );
  for (const p of [0, 1])
    close(
      waveAt(0.8, 0.3, p, 0).intensity,
      waveAt(0.8, 0.3, p, Math.PI).intensity,
    );
});

test("dephasing preserves populations, reduces purity, and preserves Z eigenstates", () => {
  close(purity(dephasedVector(0.5, 0.8, 0)), 0.5);
  close(purity(dephasedVector(0.5, 0.8, 1)), 1);
  for (const p of [0, 0.2, 0.5, 0.8, 1])
    for (const lambda of [0, 0.2, 0.5, 1]) {
      const vector = dephasedVector(p, 1.3, lambda);
      close(vector[2], 1 - 2 * p);
      assert.ok(purity(vector) >= 0.5 - 1e-10 && purity(vector) <= 1 + 1e-10);
      if (p === 0 || p === 1) close(purity(vector), 1);
    }
});
test("constant-probability sections lie inside the Bloch ball with pure-state rims", () => {
  for (let p = 0; p <= 100; p++) {
    const z = 1 - (2 * p) / 100,
      r = sectionRadius(p / 100);
    close(r * r + z * z, 1);
    for (const phi of [0, 0.7, 2])
      close(purity([r * Math.cos(phi), r * Math.sin(phi), z]), 1);
  }
  close(sectionRadius(0), 0);
  close(sectionRadius(1), 0);
  close(sectionRadius(0.5), 1);
});
