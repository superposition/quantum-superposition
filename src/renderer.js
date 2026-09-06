import {
  waveAt,
  blochVector,
  dephasedVector,
  sectionRadius,
} from "./quantum.js";
import { createScene } from "./pipeline.js";
import { isSphereMode, previewState } from "./catalog.js";

// Camera projection is also used to place accessible DOM labels at the poles.
export function projectPoint(point, state, width, height) {
  const cy = Math.cos(state.yaw),
    sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch),
    sp = Math.sin(state.pitch);
  const x = point[0] * cy + point[2] * sy;
  const z = -point[0] * sy + point[2] * cy;
  const y = point[1] * cp - z * sp;
  const depth = 7.7 + point[1] * sp + z * cp;
  return [
    width / 2 + (((x * 3.05) / depth) * height) / 2,
    height / 2 - (((y * 3.05) / depth) * height) / 2,
  ];
}

export async function createRenderer(canvas, state, onStatus) {
  let disposed = false,
    failed = false,
    visible = true,
    dirty = true,
    last = 0,
    request = 0;
  let gpu, output, scene, stopResize, renderFrame, renderPreviews;
  const previews = [];
  const previewVisible = new Set();
  let previewDirty = true,
    lastPreview = 0;
  const previewObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) previewVisible.add(entry.target);
      else previewVisible.delete(entry.target);
    }
    previewDirty = true;
  });
  let context,
    useFallback = false;
  const viewport = canvas.parentElement;
  const resize = new ResizeObserver(() => {
    dirty = true;
    previewDirty = true;
  });
  resize.observe(viewport);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    dirty = true;
  });
  intersection.observe(viewport);

  function fallback(reason) {
    if (disposed || useFallback) return;
    useFallback = true;
    stopResize?.();
    gpu?.dispose();
    const next = canvas.cloneNode();
    canvas.replaceWith(next);
    canvas = next;
    context = canvas.getContext("2d");
    onStatus("Canvas rendering · same physics");
    for (const preview of previews) preview.canvas.style.opacity = "0";
    document.querySelector("#gallery-status").textContent =
      "Static previews · interactive Canvas viewer";
    if (reason)
      console.info(
        "WebGPU unavailable; using the Canvas renderer.",
        reason.message ?? reason,
      );
    dirty = true;
  }

  try {
    if (!navigator.gpu)
      throw new Error("WebGPU is not available in this browser.");
    const vgpu = await import("vgpu");
    gpu = await vgpu.init();
    output = vgpu.surface(gpu, canvas, { dpr: [1, 1.6] });
    scene = createScene(vgpu, gpu, output, state);
    await scene.compile();
    stopResize = output.onResize(() => {
      dirty = true;
    });
    gpu.gpu.lost.then((info) => {
      if (!disposed && !useFallback) fallback(info);
    });
    gpu.onError((error) => {
      failed = true;
      fallback(error);
    });
    onStatus("vgpu / WebGPU");
    renderFrame = () => vgpu.frame(gpu, (frame) => scene.render(frame));
    for (const previewCanvas of document.querySelectorAll(
      "[data-preview-mode]",
    )) {
      const settings = previewState(Number(previewCanvas.dataset.previewMode));
      const previewOutput = vgpu.surface(gpu, previewCanvas, { dpr: [1, 1] });
      const previewScene = createScene(
        vgpu,
        gpu,
        previewOutput,
        settings,
        true,
      );
      const stop = previewOutput.onResize(() => {
        previewDirty = true;
      });
      previews.push({
        canvas: previewCanvas,
        scene: previewScene,
        settings,
        stop,
      });
      previewObserver.observe(previewCanvas);
      resize.observe(previewCanvas.parentElement);
      await previewScene.compile();
    }
    document.querySelector("#gallery-status").textContent =
      "vgpu previews · independent default states";
    renderPreviews = () =>
      vgpu.frame(gpu, (frame) => {
        for (const preview of previews) {
          if (!previewVisible.has(preview.canvas)) continue;
          preview.scene.update(preview.settings);
          preview.scene.render(frame);
          preview.canvas.style.opacity = "1";
        }
      });
  } catch (error) {
    fallback(error);
  }

  let signature = "";
  function tick(now) {
    if (disposed) return;
    request = requestAnimationFrame(tick);
    const delta = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    if (document.hidden) return;
    if (
      !useFallback &&
      renderPreviews &&
      (previewDirty || (!state.previewPaused && now - lastPreview > 80))
    ) {
      if (!state.previewPaused)
        for (const preview of previews) {
          preview.settings.time +=
            Math.min((now - (lastPreview || now)) / 1000, 0.1) * 0.8;
          if (isSphereMode(preview.settings.mode))
            preview.settings.yaw += 0.008;
        }
      try {
        renderPreviews();
      } catch (error) {
        fallback(error);
      }
      lastPreview = now;
      previewDirty = false;
    }
    if (!visible) return;
    const currentSignature = [
      state.p1,
      state.phase,
      state.yaw,
      state.pitch,
      state.mode,
      state.paused,
      state.coherence,
    ].join("|");
    dirty ||= currentSignature !== signature;
    signature = currentSignature;
    if (state.paused && !dirty) return;
    if (!state.paused) state.time += delta * 0.8;
    try {
      if (useFallback) drawFallback(context, canvas, state);
      else if (!failed) {
        scene.update(state);
        renderFrame();
      }
    } catch (error) {
      fallback(error);
    }
    if (isSphereMode(state.mode)) {
      const { width, height } = viewport.getBoundingClientRect();
      for (const [selector, pole] of [
        [".pole-zero", 1],
        [".pole-one", -1],
      ]) {
        const [x, y] = projectPoint([0, pole * 1.98, 0], state, width, height);
        const label = viewport.querySelector(selector);
        label.style.left = `${x}px`;
        label.style.top = `${y - 10}px`;
        label.style.bottom = "auto";
      }
    }
    dirty = false;
  }
  request = requestAnimationFrame(tick);
  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(request);
      stopResize?.();
      resize.disconnect();
      intersection.disconnect();
      previewObserver.disconnect();
      for (const preview of previews) preview.stop();
      gpu?.dispose();
    },
  };
}

function drawFallback(ctx, canvas, state) {
  if (!ctx) return;
  const { width, height } = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.round(width * dpr),
    h = Math.round(height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#14231f";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width * 0.65,
  );
  glow.addColorStop(0, "#1d3027");
  glow.addColorStop(1, "#14231f");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  if (state.mode === 2) return;
  if (state.mode === 3) {
    const columns = 160,
      rows = 112;
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const wave = waveAt(
          ((column + 0.5) / columns - 0.5) * 10.4,
          ((row + 0.5) / rows - 0.5) * 7.4,
          state.p1,
          state.phase,
          state.time,
        );
        const angle = Math.atan2(wave.imaginary, wave.real + 1e-12);
        const strength = Math.pow(Math.min(1, wave.intensity * 0.5), 0.45);
        const base = [0.065, 0.11, 0.09];
        const rgb = [0, 2.1, 4.2].map((offset, i) =>
          Math.round(
            255 *
              (base[i] * (1 - strength) +
                (0.55 + 0.4 * Math.cos(angle + offset)) * strength),
          ),
        );
        ctx.fillStyle = `rgb(${rgb.join(",")})`;
        ctx.fillRect(
          (column * width) / columns,
          (row * height) / rows,
          width / columns + 1,
          height / rows + 1,
        );
      }
    return;
  }
  ctx.globalCompositeOperation = "lighter";
  if (state.mode === 0) {
    for (let iz = 0; iz < 75; iz++)
      for (let ix = 0; ix < 155; ix++) {
        const x = (ix / 154 - 0.5) * 10.4,
          z = (iz / 74 - 0.5) * 7.4;
        const wave = waveAt(x, z, state.p1, state.phase, state.time);
        const [sx, sy] = projectPoint(
          [x, wave.real * 1.22, z],
          state,
          width,
          height,
        );
        const alpha = Math.min(0.9, 0.025 + wave.intensity * 0.4);
        ctx.fillStyle =
          x > 0 ? `rgba(235,174,122,${alpha})` : `rgba(141,187,205,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.65 + wave.intensity * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
  } else {
    const project = (p) => projectPoint(p, state, width, height);
    for (let ring = 0; ring < 12; ring++) {
      ctx.beginPath();
      let segmentOpen = false;
      ctx.strokeStyle = ring % 3 === 0 ? "#9bbdcd75" : "#9bbdcd35";
      ctx.lineWidth = 0.6;
      for (let i = 0; i <= 150; i++) {
        const t = (i / 150) * Math.PI * 2,
          a = (ring / 12) * Math.PI;
        const point = [
          1.75 * Math.cos(t) * Math.cos(a),
          1.75 * Math.sin(t),
          1.75 * Math.cos(t) * Math.sin(a),
        ];
        if (state.mode === 5 && point[1] > (1 - 2 * state.p1) * 1.75) {
          segmentOpen = false;
          continue;
        }
        const [x, y] = project(point);
        segmentOpen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        segmentOpen = true;
      }
      ctx.stroke();
    }
    if (state.mode === 5) {
      const radius = sectionRadius(state.p1) * 1.75;
      ctx.beginPath();
      for (let i = 0; i <= 150; i++) {
        const angle = (i / 150) * Math.PI * 2;
        const [x, y] = project([
          radius * Math.cos(angle),
          (1 - 2 * state.p1) * 1.75,
          radius * Math.sin(angle),
        ]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "#d99b6230";
      ctx.strokeStyle = "#e8b38f";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    const pure = blochVector(state.p1, state.phase);
    if (state.mode === 4) {
      const reference = project([
        pure[0] * 1.75,
        pure[2] * 1.75,
        -pure[1] * 1.75,
      ]);
      ctx.beginPath();
      ctx.moveTo(...project([0, 0, 0]));
      ctx.lineTo(...reference);
      ctx.strokeStyle = "#9bbdcd";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    const v =
      state.mode === 4
        ? dephasedVector(state.p1, state.phase, state.coherence)
        : pure;
    const [x, y] = project([v[0] * 1.75, v[2] * 1.75, -v[1] * 1.75]);
    const center = project([0, 0, 0]);
    ctx.strokeStyle = "#e8b38f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(...center);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowColor = "#e8b38f";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#e8b38f";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalCompositeOperation = "source-over";
}
