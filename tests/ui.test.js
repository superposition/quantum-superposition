import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { parseHTML } from "linkedom";
import * as quantum from "../src/quantum.js";
import * as models from "../src/catalog.js";
import * as clifford from "../src/clifford.js";

test("experiment controls connect preparation, measurement, reset, and accessible tabs", async () => {
  const { document, window } = parseHTML(
    await fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
  );
  const $ = (selector) => document.querySelector(selector);
  // Linkedom's select value is read-only; model the standard browser setter.
  Object.defineProperty($("#basis"), "value", { value: "z", writable: true });
  const context = vm.createContext({
    document,
    window,
    console,
    Uint32Array,
    crypto: webcrypto,
    ...quantum,
    ...models,
    ...clifford,
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    createRenderer: async (_canvas, _state, status) => {
      status("Test renderer");
      return { dispose() {} };
    },
  });
  // Execute the production event handlers, omitting only the module imports
  // and Vite-only HMR hook. The production shaders are checked separately.
  const source = (
    await fs.readFile(new URL("../src/main.js", import.meta.url), "utf8")
  )
    .replace(/^import\s+[\s\S]*?;\r?\n/gm, "")
    .replace(/^if\s*\(import\.meta\.hot\).*$/gm, "");
  await vm.runInContext(`(async()=>{${source}\n})()`, context);
  const click = (selector) =>
    $(selector).dispatchEvent(new window.Event("click"));
  const change = (selector, value, type = "input") => {
    $(selector).value = value;
    $(selector).dispatchEvent(new window.Event(type));
  };
  const text = (selector) => $(selector).textContent;
  assert.equal($("#tab-wave").getAttribute("aria-selected"), "true");
  assert.equal($("#pause").getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelectorAll(".gallery-card").length, 8);
  click("#tab-measure");
  assert.equal($("#measurement-display").hidden, false);
  assert.equal(
    $("#experiment-panel").getAttribute("aria-labelledby"),
    "tab-measure",
  );
  change("#balance", "100");
  click("#run-shots");
  assert.equal(text("#count-one"), "128");
  assert.equal(text("#count-zero"), "0");
  assert.equal(
    document.querySelectorAll('#shot-grid i[data-value="1"]').length,
    128,
  );
  click("#measure-one");
  assert.match(text("#measurement-result"), /now one/);
  click("#measure-one");
  assert.match(text("#measurement-result"), /now one/);
  click("#reset");
  assert.equal(text("#shot-count"), "0");
  assert.equal($("#balance").value, "50");
  change("#basis", "x", "change");
  click("#run-shots");
  assert.equal(text("#count-zero"), "128");
  change("#phase", "180");
  click("#run-shots");
  assert.equal(text("#count-one"), "128");
  assert.equal(text("#outcome-one"), "minus");
  click("#prepare");
  assert.match(text("#measurement-result"), /fresh copy/);
  click("#tab-bloch");
  click('[data-preset="zero"]');
  assert.equal($("#balance").value, "0");
  assert.equal($(".pole-zero").hidden, false);
  const key = new window.Event("keydown");
  key.key = "ArrowRight";
  $("#tab-bloch").dispatchEvent(key);
  assert.equal($("#tab-dephase").getAttribute("aria-selected"), "true");
  assert.equal($("#dephase-controls").hidden, false);
  change("#coherence", "0");
  assert.match(text("#purity-value"), /1\.000/);
  change("#balance", "50");
  assert.match(text("#purity-value"), /0\.500/);
  click("#tab-section");
  assert.equal($("#phase-control").hidden, true);
  change("#balance", "0");
  assert.match(text("#section-value"), /radius: 0\.000/);
  click("#tab-complex");
  assert.equal($("#phase-control").hidden, false);
  assert.match(text("#model-boundary"), /display phase/);
  assert.equal(
    $("#model-source").getAttribute("href"),
    "https://vgpu.sh/examples/gradient",
  );
  click("#gallery-motion");
  assert.equal($("#gallery-motion").getAttribute("aria-pressed"), "false");
  click("#pause");
  assert.equal($("#pause").getAttribute("aria-pressed"), "false");
  click("#tab-clifford");
  assert.equal($("#clifford-controls").hidden, false);
  click('[data-gate-demo="h,s"]');
  assert.match(text("#gate-result"), /Current state: Y positive/);
  assert.match(text("#gate-probability-y"), /100\.0%/);
  assert.equal($("#phase").value, "90");
  assert.match(text("#gate-sequence"), /1\. Hadamard; 2\. Phase/);
  click("#tab-operators");
  assert.equal($("#operator-readout").hidden, false);
  assert.equal(text("#operator-0"), "Positive Z");
  assert.equal(text("#operator-1"), "Positive X");
  assert.equal(text("#operator-2"), "Positive Y");
  click("#gate-undo");
  assert.match(text("#gate-result"), /Current state: Plus/);
  assert.equal(text("#operator-1"), "Negative Y");
  click("#gate-clear");
  assert.match(text("#gate-result"), /Current state: Zero/);
  assert.equal($("#gate-undo").disabled, true);
  click('[data-gate-demo="s,h"]');
  assert.match(text("#gate-result"), /Current state: Plus/);
  click('[data-gate-demo="h,s"]');
  click("#tab-measure");
  change("#basis", "y", "change");
  click("#run-shots");
  assert.equal(text("#count-zero"), "128");
  click("#measure-one");
  assert.match(text("#measurement-result"), /now Y positive/);
  click("#tab-clifford");
  click('[data-gate="z"]');
  assert.match(text("#gate-result"), /Current state: Y negative/);
  assert.equal(text("#shot-count"), "0");
  change("#balance", "30");
  assert.equal(text("#gate-sequence"), "No gates applied.");
  assert.equal(text("#operator-0"), "Positive X");
  click('[data-gate="h"]');
  click("#gate-clear");
  assert.equal($("#balance").value, "30");
  assert.equal($("#phase").value, "270");
  click('[data-gate-start="4"]');
  assert.match(text("#gate-result"), /Current state: Zero/);
  click('[data-gate="x"]');
  assert.match(text("#gate-result"), /Current state: One/);
  click("#reset");
  assert.equal(text("#gate-sequence"), "No gates applied.");
  assert.match(text("#gate-result"), /Current state: Plus/);
});
