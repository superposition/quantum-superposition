import "./style.css";
import { clamp, TAU, measure, probabilityZero } from "./quantum.js";
import { createRenderer } from "./renderer.js";

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
};
let collapsed = null;
let shots = [];
let basis = "z";
const names = [
  {
    id: "wave",
    title: "Possibilities <br />make waves.",
    symbol: "∿",
    label: "A field of possibilities",
    equation: "ψ = αψ₀ + βψ₁",
    legend: "Height = real amplitude · brightness = intensity",
    description:
      "Two amplitudes overlap. Where they agree, they reinforce. Where they oppose, they cancel. Change the phase to see it happen.",
    explanation:
      "A stylized surface of two coherent wave amplitudes. The height shows their real sum; brighter points mark greater intensity, |ψ|². These points sample a field — they aren’t individual particles.",
  },
  {
    id: "bloch",
    title: "One qubit. <br />Every direction.",
    symbol: "ψ",
    label: "The Bloch sphere",
    equation: "|ψ⟩ = cos(θ/2)|0⟩ + eⁱᵠsin(θ/2)|1⟩",
    legend: "Copper vector = your state · sphere = all pure states",
    description:
      "A qubit’s pure state is a point on a sphere. Change the balance to move between the poles. Change the phase to travel around them.",
    explanation:
      "The sphere is a map of pure qubit states, not physical space. The north and south poles are |0⟩ and |1⟩. Longitude encodes relative phase; latitude encodes the probabilities of a Z-basis measurement.",
  },
  {
    id: "measure",
    title: "Possibility. <br />Meet probability.",
    symbol: "⟨",
    label: "From amplitudes to outcomes",
    equation: "P(outcome) = |amplitude|²",
    legend: "Copper = first outcome · blue = second outcome",
    description:
      "One measurement gives one answer. Many fresh copies reveal a pattern. Switch the basis to discover why phase matters.",
    explanation:
      "The 128-shot experiment measures independently prepared copies of your chosen state. “Measure this qubit” instead collapses one copy; measuring that same copy again in the same basis repeats its outcome. All outcomes are sampled locally using the Born rule.",
  },
];

function random() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}
function outcomes() {
  return basis === "z" ? ["|0⟩", "|1⟩"] : ["|+⟩", "|−⟩"];
}

function updateState() {
  const percent = Math.round(state.p1 * 100);
  const degrees = Math.round((state.phase / TAU) * 360);
  $("#balance").value = percent;
  $("#phase").value = degrees;
  $("#balance-value").textContent = `${100 - percent} / ${percent}`;
  $("#phase-value").textContent = `${degrees}°`;
  $("#balance").style.setProperty("--fill", `${percent}%`);
  $("#phase").style.setProperty("--fill", `${degrees / 3.6}%`);
  $("#balance").setAttribute(
    "aria-valuetext",
    `${100 - percent} percent zero, ${percent} percent one`,
  );
  $("#phase").setAttribute("aria-valuetext", `${degrees} degrees`);
  const a = Math.sqrt(1 - state.p1).toFixed(3),
    b = Math.sqrt(state.p1).toFixed(3);
  const phase = degrees === 0 || degrees === 360 ? "" : `eⁱ${degrees}° `;
  $("#state-formula").textContent = `${a}|0⟩ + ${b}${phase}|1⟩`;
  const p = probabilityZero(state.p1, state.phase, basis);
  const labels = outcomes();
  $("#expected").textContent =
    `Expected: ${(p * 100).toFixed(0)}% ${labels[0]} · ${((1 - p) * 100).toFixed(0)}% ${labels[1]}`;
}

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
  state.mode = mode;
  state.pitch = mode === 1 ? 0.18 : 0.62;
  state.yaw = 0.38;
  const info = names[mode];
  $$(".lab-tabs [role=tab]").forEach((button, index) => {
    button.setAttribute("aria-selected", String(index === mode));
    button.tabIndex = index === mode ? 0 : -1;
    if (focus && index === mode) button.focus();
  });
  $("#experiment-panel").setAttribute("aria-labelledby", `tab-${info.id}`);
  $("#experiment-number").textContent = `Experiment ${mode + 1}`;
  $("#experiment-title").innerHTML = info.title;
  $("#control-symbol").textContent = info.symbol;
  $("#experiment-description").textContent = info.description;
  $("#experiment-explanation").textContent = info.explanation;
  $("#scene-label").textContent = `Fig. ${mode + 1} — ${info.label}`;
  $("#scene-legend").textContent = info.legend;
  $("#canvas-equation").textContent = info.equation;
  $("#viewport").dataset.mode = mode;
  ["wave", "bloch", "measure"].forEach((name, i) => {
    $(`#${name}-controls`).hidden = i !== mode;
  });
  $$(".sphere-label").forEach((label) => {
    label.hidden = mode !== 1;
  });
  $("#measurement-display").hidden = mode !== 2;
  $("#interaction-hint").textContent =
    mode === 2 ? "128 independent preparations" : "Drag to rotate ↔";
  $("#quantum-canvas").setAttribute(
    "aria-label",
    `${info.label}. ${info.legend}. Drag horizontally or use the left and right arrow keys to rotate the view.`,
  );
}

$$(".lab-tabs [role=tab]").forEach((button) => {
  button.addEventListener("click", () => setMode(Number(button.dataset.mode)));
  button.addEventListener("keydown", (event) => {
    let mode = state.mode;
    if (event.key === "ArrowRight") mode = (mode + 1) % 3;
    else if (event.key === "ArrowLeft") mode = (mode + 2) % 3;
    else if (event.key === "Home") mode = 0;
    else if (event.key === "End") mode = 2;
    else return;
    event.preventDefault();
    setMode(mode, true);
  });
});
$$("[data-jump]").forEach((button) =>
  button.addEventListener("click", () => {
    setMode(Number(button.dataset.jump), true);
    $("#experiments").scrollIntoView({
      behavior: motion.matches ? "instant" : "smooth",
    });
  }),
);
$("#balance").addEventListener("input", (event) => {
  state.p1 = Number(event.target.value) / 100;
  clearMeasurements();
  updateState();
});
$("#phase").addEventListener("input", (event) => {
  state.phase = (Number(event.target.value) / 360) * TAU;
  clearMeasurements();
  updateState();
});
$("#flip-phase").addEventListener("click", () => {
  state.phase = (state.phase + Math.PI) % TAU;
  clearMeasurements();
  updateState();
});
$$("[data-preset]").forEach((button) =>
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;
    state.p1 = preset === "zero" ? 0 : preset === "one" ? 1 : 0.5;
    state.phase = preset === "minus" ? Math.PI : 0;
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
  $("#pause").textContent = state.paused ? "▷" : "Ⅱ";
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
  updatePause();
});
$("#reset").addEventListener("click", () => {
  state.p1 = 0.5;
  state.phase = 0;
  state.time = 0;
  state.yaw = 0.38;
  state.pitch = state.mode === 1 ? 0.18 : 0.62;
  basis = "z";
  $("#basis").value = basis;
  clearMeasurements();
  updateState();
});
let pointer = null;
const viewport = $("#viewport");
viewport.addEventListener("pointerdown", (event) => {
  if (event.target.tagName !== "CANVAS" || state.mode === 2) return;
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
  if (event.target.tagName !== "CANVAS" || state.mode === 2) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    state.yaw += event.key === "ArrowRight" ? 0.1 : -0.1;
  }
});

updateState();
updateShots();
updatePause();
setMode(0);
const renderer = await createRenderer($("#quantum-canvas"), state, (status) => {
  $("#renderer-status").textContent = status;
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) renderer.dispose();
});
if (import.meta.hot) import.meta.hot.dispose(() => renderer.dispose());
