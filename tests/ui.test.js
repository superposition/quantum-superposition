import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { parseHTML } from "linkedom";
import * as quantum from "../src/quantum.js";

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
    .replace(/^import .*;\r?\n/gm, "")
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
  assert.match(text("#measurement-result"), /now \|1⟩/);
  click("#measure-one");
  assert.match(text("#measurement-result"), /now \|1⟩/);
  click("#reset");
  assert.equal(text("#shot-count"), "0");
  assert.equal($("#balance").value, "50");
  change("#basis", "x", "change");
  click("#run-shots");
  assert.equal(text("#count-zero"), "128");
  change("#phase", "180");
  click("#run-shots");
  assert.equal(text("#count-one"), "128");
  assert.equal(text("#outcome-one"), "|−⟩");
  click("#prepare");
  assert.match(text("#measurement-result"), /fresh copy/);
  click("#tab-bloch");
  click('[data-preset="zero"]');
  assert.equal($("#balance").value, "0");
  assert.equal($(".pole-zero").hidden, false);
  const key = new window.Event("keydown");
  key.key = "ArrowRight";
  $("#tab-bloch").dispatchEvent(key);
  assert.equal($("#tab-measure").getAttribute("aria-selected"), "true");
  click("#pause");
  assert.equal($("#pause").getAttribute("aria-pressed"), "false");
});
