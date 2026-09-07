import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import * as api from "vgpu/node";
import { createScene } from "../src/pipeline.js";
import { catalog, previewState } from "../src/catalog.js";
import { waveAt } from "../src/quantum.js";

const updateGallery = process.argv.includes("--update-gallery");
await mkdir("artifacts", { recursive: true });
if (updateGallery) await mkdir("public/gallery", { recursive: true });
const gpu = await api.init();
const errors = [];
gpu.onError((error) => errors.push(error));
const size = [600, 380],
  captures = new Map();
try {
  const output = api.target(gpu, { size });
  const scene = createScene(api, gpu, output, previewState(0), true);
  await scene.compile();
  const cases = [
    ...catalog.map((item) => [item.id, previewState(item.mode)]),
    ["wave-pi", { ...previewState(0), phase: Math.PI }],
    ["bloch-zero", { ...previewState(1), p1: 0 }],
    ["complex-pi", { ...previewState(3), phase: Math.PI }],
    ["dephase-zero", { ...previewState(4), coherence: 0 }],
    ["dephase-pure", { ...previewState(4), coherence: 1 }],
    ["section-lower", { ...previewState(5), p1: 0.75 }],
    ["clifford-zero", { ...previewState(6), p1: 0, phase: 0 }],
    ["operators-h", { ...previewState(7), axes: [3, -2, 1] }],
  ];
  for (const [name, state] of cases) {
    scene.update(state);
    api.frame(gpu, (frame) => scene.render(frame));
    const pixels = await output.read();
    await gpu.settled();
    assert.equal(
      errors.length,
      0,
      errors.map((error) => error.message).join("\n"),
    );
    const png = new PNG({ width: size[0], height: size[1] });
    png.data.set(pixels);
    const encoded = PNG.sync.write(png);
    await writeFile(`artifacts/${name}.png`, encoded);
    if (updateGallery && catalog.some((item) => item.id === name))
      await writeFile(`public/gallery/${name}.png`, encoded);
    let bright = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 70) bright++;
    assert.ok(bright > 150, `${name}: expected visible pixels, got ${bright}`);
    captures.set(name, pixels);
    console.log(`${name}: ${bright} visible pixels, no GPU errors`);
  }
  for (const [a, b] of [
    ["wave", "wave-pi"],
    ["bloch", "bloch-zero"],
    ["complex", "complex-pi"],
    ["dephase-zero", "dephase-pure"],
    ["section", "section-lower"],
    ["clifford", "clifford-zero"],
    ["operators", "operators-h"],
  ]) {
    const difference = captures
      .get(a)
      .reduce((sum, value, i) => sum + Math.abs(value - captures.get(b)[i]), 0);
    assert.ok(
      difference > 10000,
      `${a} / ${b}: controls must affect rendered pixels`,
    );
  }
  const phase = captures.get("complex");
  for (const [x, y] of [
    [250, 140],
    [310, 210],
    [380, 170],
  ]) {
    const field = waveAt(
      ((x + 0.5) / size[0] - 0.5) * 10.4,
      ((y + 0.5) / size[1] - 0.5) * 7.4,
      0.5,
      0,
      0.7,
    );
    const angle = Math.atan2(field.imaginary, field.real + 1e-12);
    const strength = Math.pow(Math.min(1, field.intensity * 0.5), 0.45);
    const base = [0.065, 0.11, 0.09];
    const expected = [0, 2.1, 4.2].map((offset, i) =>
      Math.round(
        255 *
          (base[i] * (1 - strength) +
            (0.55 + 0.4 * Math.cos(angle + offset)) * strength),
      ),
    );
    for (let channel = 0; channel < 3; channel++)
      assert.ok(
        Math.abs(phase[(y * size[0] + x) * 4 + channel] - expected[channel]) <=
          3,
        "GPU phase encoding must match the CPU amplitude model",
      );
  }
  console.log(
    "GPU checks passed: eight gallery models, parameter variants, CPU/GPU phase agreement.",
  );
} finally {
  gpu.dispose();
}
