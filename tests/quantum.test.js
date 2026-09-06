import test from 'node:test';
import assert from 'node:assert/strict';
import { blochVector, probabilityZero, collapse, measure, waveAt } from '../src/quantum.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('pure states stay normalized on the Bloch sphere', () => {
  for (let p = 0; p <= 100; p++) for (let phi = 0; phi < 7; phi++) {
    const vector = blochVector(p / 100, phi);
    close(vector.reduce((sum, x) => sum + x * x, 0), 1);
    close(probabilityZero(p / 100, phi, 'z'), 1 - p / 100);
  }
});
test('phase distinguishes coherent plus and minus states in X but not Z', () => {
  close(probabilityZero(.5, 0, 'x'), 1);
  close(probabilityZero(.5, Math.PI, 'x'), 0);
  close(probabilityZero(.5, 0, 'z'), .5);
  close(probabilityZero(.5, Math.PI, 'z'), .5);
});
test('remeasuring a collapsed state in its own basis repeats the outcome', () => {
  for (const basis of ['z', 'x']) for (const outcome of [0, 1]) {
    const state = collapse(basis, outcome);
    for (const r of [0, .1, .5, .999999999]) assert.equal(measure(state.p1, state.phase, basis, () => r).outcome, outcome);
  }
});
test('measurement follows the Born threshold and cross-basis probabilities', () => {
  assert.equal(measure(.3, .8, 'z', () => .69).outcome, 0);
  assert.equal(measure(.3, .8, 'z', () => .71).outcome, 1);
  close(probabilityZero(0, 0, 'x'), .5);
  close(probabilityZero(1, 0, 'x'), .5);
});
test('coherent waves interfere, cancel, and preserve intensity under global phase', () => {
  close(waveAt(0, 0, .5, 0).intensity, 2);
  close(waveAt(0, 0, .5, Math.PI).intensity, 0);
  for (const t of [0, .5, 2, 9]) close(waveAt(.8, .3, .7, 1.2, t).intensity, waveAt(.8, .3, .7, 1.2, 0).intensity);
  for (const p of [0, 1]) close(waveAt(.8, .3, p, 0).intensity, waveAt(.8, .3, p, Math.PI).intensity);
});
