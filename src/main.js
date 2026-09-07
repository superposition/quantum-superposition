import "./style.css";
import "./gallery.css";
import {
  clamp,
  TAU,
  measure,
  probabilityZero,
  dephasedVector,
  purity,
  sectionRadius,
} from "./quantum.js";
import { createRenderer } from "./renderer.js";
import { catalog, galleryOrder, isSphereMode } from "./catalog.js";
import {
  gates,
  sequenceAxes,
  applySequence,
  stateName,
  operatorName,
  cliffordOrientations,
  stabilizerStates,
} from "./clifford.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const state = {
  mode: 0,
  p1: 0.5,
  phase: 0,
  time: 0,
  yaw: 0.38,
  pitch: 0.62,
  paused: motion.matches,
  previewPaused: motion.matches,
  coherence: 0.35,
  axes: [1, 2, 3],
};
let gateInput = { p1: state.p1, phase: state.phase };
let sequence = [];
let collapsed = null;
let shots = [];
let basis = "z";
const names = catalog;

function random() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}
function outcomes() {
  return {
    z: ["zero", "one"],
    x: ["plus", "minus"],
    y: ["Y positive", "Y negative"],
  }[basis];
}

function updateState() {
  const percent = Math.round(state.p1 * 100);
  const degrees = Math.round((state.phase / TAU) * 360);
  $("#balance").value = percent;
  $("#phase").value = degrees;
  $("#balance-value").textContent = `${percent}% one`;
  $("#phase-value").textContent = `${degrees} degrees`;
  $("#balance").style.setProperty("--fill", `${percent}%`);
  $("#phase").style.setProperty("--fill", `${degrees / 3.6}%`);
  $("#balance").setAttribute(
    "aria-valuetext",
    `${100 - percent} percent zero, ${percent} percent one`,
  );
  $("#phase").setAttribute("aria-valuetext", `${degrees} degrees`);
  $("#state-formula").textContent =
    `${stateName(state)}. A Z measurement gives zero with ${(100 * (1 - state.p1)).toFixed(1)}% probability and one with ${(100 * state.p1).toFixed(1)}% probability.`;
  const p = probabilityZero(state.p1, state.phase, basis);
  const labels = outcomes();
  $("#expected").textContent =
    `Expected: ${(p * 100).toFixed(0)}% ${labels[0]}; ${((1 - p) * 100).toFixed(0)}% ${labels[1]}`;
  $("#coherence").value = Math.round(state.coherence * 100);
  $("#coherence").style.setProperty("--fill", `${state.coherence * 100}%`);
  $("#coherence-value").textContent = state.coherence.toFixed(2);
  $("#purity-value").textContent =
    `Purity: ${purity(dephasedVector(state.p1, state.phase, state.coherence)).toFixed(3)}`;
  $("#section-value").textContent =
    `Height: ${(1 - 2 * state.p1).toFixed(2)}. Disk radius: ${sectionRadius(state.p1).toFixed(3)}.`;
  updateClifford();
}

function startSequence() {
  gateInput = { p1: state.p1, phase: state.phase };
  sequence = [];
  state.axes = [1, 2, 3];
}

function updateClifford() {
  $("#gate-input").textContent = `Starting state: ${stateName(gateInput)}.`;
  $("#gate-sequence").textContent = sequence.length
    ? sequence.map((key, i) => `${i + 1}. ${gates[key].name}`).join("; ")
    : "No gates applied.";
  $("#gate-result").textContent =
    `Current state: ${stateName(state)}. ${sequence.length ? gates[sequence.at(-1)].explanation : "Choose a gate to change this state."}`;
  $("#gate-undo").disabled = !sequence.length;
  $("#gate-clear").disabled = !sequence.length;
  for (let i = 0; i < 3; i++)
    $(`#operator-${i}`).textContent = operatorName(state.axes[i]);
  const index = cliffordOrientations.findIndex((axes) =>
    axes.every((axis, i) => axis === state.axes[i]),
  );
  $("#operator-count").textContent =
    `Orientation ${index + 1} of ${cliffordOrientations.length}. Overall phase is ignored.`;
  for (const [axis, name] of [
    ["x", "plus"],
    ["y", "Y positive"],
    ["z", "zero"],
  ]) {
    $(`#gate-probability-${axis}`).textContent =
      `${(100 * probabilityZero(state.p1, state.phase, axis)).toFixed(1)}% ${name}`;
  }
}

function runSequence() {
  Object.assign(state, applySequence(gateInput, sequence));
  state.axes = sequenceAxes(sequence);
  clearMeasurements();
  updateState();
}

$$("[data-gate]").forEach((button) =>
  button.addEventListener("click", () => {
    sequence.push(button.dataset.gate);
    runSequence();
  }),
);
$("#gate-undo").addEventListener("click", () => {
  sequence.pop();
  runSequence();
});
$("#gate-clear").addEventListener("click", () => {
  sequence = [];
  runSequence();
});
$$("[data-gate-start]").forEach((button) =>
  button.addEventListener("click", () => {
    const preset = stabilizerStates[Number(button.dataset.gateStart)];
    Object.assign(state, { p1: preset.p1, phase: preset.phase });
    startSequence();
    clearMeasurements();
    updateState();
  }),
);
$$("[data-gate-demo]").forEach((button) =>
  button.addEventListener("click", () => {
    gateInput = { p1: 0, phase: 0 };
    sequence = button.dataset.gateDemo.split(",");
    runSequence();
  }),
);

function updateShots() {
  const labels = outcomes();
  const zero = shots.filter((x) => x === 0).length,
    one = shots.length - zero;
  $("#shot-count").textContent = shots.length;
  $("#count-zero").textContent = zero;
  $("#count-one").textContent = one;
  $("#outcome-zero").textContent = labels[0];
  $("#outcome-one").textContent = labels[1];
  $("#bar-zero").style.width =
    `${shots.length ? (zero / shots.length) * 100 : 0}%`;
  $("#bar-one").style.width =
    `${shots.length ? (one / shots.length) * 100 : 0}%`;
  $("#shot-grid").replaceChildren(
    ...Array.from({ length: 128 }, (_, i) => {
      const dot = document.createElement("i");
      if (shots[i] !== undefined) dot.dataset.value = shots[i];
      return dot;
    }),
  );
}
function clearMeasurements() {
  collapsed = null;
  shots = [];
  updateShots();
  $("#measurement-result").textContent =
    "Measure one qubit to collapse its state. Measure it again in the same basis to get the same result.";
}
function setMode(mode, focus = false) {
  if (!names[mode]) return;
  state.mode = mode;
  state.pitch = isSphereMode(mode) ? 0.18 : 0.62;
  state.yaw = 0.38;
  const info = names[mode];
  $$(".lab-tabs [role=tab]").forEach((button) => {
    const selected = Number(button.dataset.mode) === mode;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (focus && selected) button.focus();
  });
  $("#experiment-panel").setAttribute("aria-labelledby", `tab-${info.id}`);
  $("#experiment-number").textContent = info.group;
  $("#experiment-title").textContent = info.title;
  $("#control-symbol").textContent = "";
  $("#experiment-description").textContent = info.description;
  $("#experiment-explanation").textContent = info.encoding;
  $("#model-coordinates").textContent = info.coordinates;
  $("#model-boundary").textContent = info.boundary;
  $("#model-technique").textContent = info.technique;
  $("#model-source").href = `https://vgpu.sh/examples/${info.source}`;
  $("#model-source").textContent = `vgpu source / ${info.sourceTitle}`;
  $("#scene-label").textContent = info.title;
  $("#scene-legend").textContent = info.legend;
  $("#canvas-equation").textContent = info.equation;
  $("#viewport").dataset.mode = mode;
  ["wave", "bloch", "measure"].forEach((name, i) => {
    $(`#${name}-controls`).hidden = i !== mode;
  });
  $$(".sphere-label").forEach((label) => {
    label.hidden = !isSphereMode(mode) || mode >= 5;
  });
  $("#phase-control").hidden = mode === 5;
  $("#preparation-readout").hidden = mode === 5;
  $("#dephase-controls").hidden = mode !== 4;
  $("#section-controls").hidden = mode !== 5;
  $("#complex-controls").hidden = mode !== 3;
  $("#clifford-controls").hidden = mode < 6;
  $("#operator-readout").hidden = mode !== 7;
  $("#gate-probabilities").hidden = mode !== 6;
  $$(".clifford-label").forEach((label) => {
    label.hidden = mode !== 6;
  });
  $$(".operator-label").forEach((label) => {
    label.hidden = mode !== 7;
  });
  $$(".gallery-card").forEach((card) => {
    card.dataset.selected = String(Number(card.dataset.cardMode) === mode);
  });
  $("#measurement-display").hidden = mode !== 2;
  $("#interaction-hint").textContent =
    mode === 2
      ? "128 independent preparations"
      : mode === 3
        ? "Phase in color; intensity in brightness"
        : "Drag to rotate";
  $("#quantum-canvas").setAttribute(
    "aria-label",
    `${info.title}. ${info.legend}.${[2, 3].includes(mode) ? "" : " Drag horizontally or use the left and right arrow keys to rotate the view."}`,
  );
}

$$(".lab-tabs [role=tab]").forEach((button) => {
  button.addEventListener("click", () => setMode(Number(button.dataset.mode)));
  button.addEventListener("keydown", (event) => {
    let index = galleryOrder.indexOf(state.mode);
    if (event.key === "ArrowRight") index = (index + 1) % galleryOrder.length;
    else if (event.key === "ArrowLeft")
      index = (index + galleryOrder.length - 1) % galleryOrder.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = galleryOrder.length - 1;
    else return;
    event.preventDefault();
    setMode(galleryOrder[index], true);
  });
});
$$("[data-jump]").forEach((button) =>
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setMode(Number(button.dataset.jump), true);
    $("#experiments").scrollIntoView({
      behavior: motion.matches ? "instant" : "smooth",
    });
  }),
);
$("#coherence").addEventListener("input", (event) => {
  state.coherence = Number(event.target.value) / 100;
  updateState();
});
$("#balance").addEventListener("input", (event) => {
  state.p1 = Number(event.target.value) / 100;
  startSequence();
  clearMeasurements();
  updateState();
});
$("#phase").addEventListener("input", (event) => {
  state.phase = (Number(event.target.value) / 360) * TAU;
  startSequence();
  clearMeasurements();
  updateState();
});
$("#flip-phase").addEventListener("click", () => {
  state.phase = (state.phase + Math.PI) % TAU;
  startSequence();
  clearMeasurements();
  updateState();
});
$$("[data-preset]").forEach((button) =>
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;
    state.p1 = preset === "zero" ? 0 : preset === "one" ? 1 : 0.5;
    state.phase = preset === "minus" ? Math.PI : 0;
    startSequence();
    clearMeasurements();
    updateState();
  }),
);
$("#basis").addEventListener("change", (event) => {
  basis = event.target.value;
  // A new axis preserves a collapsed copy so incompatible-basis measurements
  // remain meaningful. The fresh-copy histogram is reset to avoid mixing axes.
  shots = [];
  updateShots();
  updateState();
  $("#measurement-result").textContent = collapsed
    ? "The same collapsed qubit is ready in the new basis. Its next outcome may be uncertain again."
    : "Basis changed. Run fresh copies or measure this qubit.";
});
$("#run-shots").addEventListener("click", () => {
  shots = Array.from(
    { length: 128 },
    () => measure(state.p1, state.phase, basis, random).outcome,
  );
  updateShots();
  const zeros = shots.filter((x) => x === 0).length;
  $("#measurement-result").textContent =
    `128 fresh copies: ${zeros} measured ${outcomes()[0]}, ${128 - zeros} measured ${outcomes()[1]}. The single-qubit copy is unchanged.`;
});
$("#measure-one").addEventListener("click", () => {
  const current = collapsed ?? state;
  const result = measure(current.p1, current.phase, basis, random);
  collapsed = result.state;
  $("#measurement-result").textContent =
    `This qubit is now ${outcomes()[result.outcome]}. Measure again in ${basis.toUpperCase()} for the same outcome, or prepare a fresh copy.`;
});
$("#prepare").addEventListener("click", () => {
  collapsed = null;
  $("#measurement-result").textContent =
    "A fresh copy of the prepared state is ready. Measure it to sample a new outcome.";
});
function updatePause() {
  $("#pause").textContent = state.paused ? "Play" : "Pause";
  $("#pause").setAttribute(
    "aria-label",
    state.paused ? "Play animation" : "Pause animation",
  );
  $("#pause").setAttribute("aria-pressed", String(state.paused));
}
$("#pause").addEventListener("click", () => {
  state.paused = !state.paused;
  updatePause();
});
motion.addEventListener("change", (event) => {
  state.paused = event.matches;
  state.previewPaused = event.matches;
  updatePause();
  updateGalleryPause();
});
function updateGalleryPause() {
  $("#gallery-motion").textContent = state.previewPaused
    ? "Play previews"
    : "Pause previews";
  $("#gallery-motion").setAttribute(
    "aria-pressed",
    String(state.previewPaused),
  );
}
$("#gallery-motion").addEventListener("click", () => {
  state.previewPaused = !state.previewPaused;
  updateGalleryPause();
});
$("#reset").addEventListener("click", () => {
  state.p1 = 0.5;
  state.phase = 0;
  state.time = 0;
  state.yaw = 0.38;
  state.pitch = isSphereMode(state.mode) ? 0.18 : 0.62;
  state.coherence = 0.35;
  basis = "z";
  $("#basis").value = basis;
  startSequence();
  clearMeasurements();
  updateState();
});
let pointer = null;
const viewport = $("#viewport");
viewport.addEventListener("pointerdown", (event) => {
  if (event.target.tagName !== "CANVAS" || [2, 3].includes(state.mode)) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  event.target.setPointerCapture(event.pointerId);
});
viewport.addEventListener("pointermove", (event) => {
  if (!pointer || event.pointerId !== pointer.id) return;
  state.yaw += (event.clientX - pointer.x) * 0.007;
  if (event.pointerType !== "touch")
    state.pitch = clamp(
      state.pitch + (event.clientY - pointer.y) * 0.004,
      -0.7,
      1.1,
    );
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  viewport.addEventListener(name, () => {
    pointer = null;
  });
viewport.addEventListener("keydown", (event) => {
  if (event.target.tagName !== "CANVAS" || [2, 3].includes(state.mode)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    state.yaw += event.key === "ArrowRight" ? 0.1 : -0.1;
  }
});

updateState();
updateShots();
updatePause();
updateGalleryPause();
setMode(0);
const renderer = await createRenderer($("#quantum-canvas"), state, (status) => {
  $("#renderer-status").textContent = status;
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) renderer.dispose();
});
if (import.meta.hot) import.meta.hot.dispose(() => renderer.dispose());
