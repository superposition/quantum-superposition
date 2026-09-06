import { waveAt, blochVector } from "./quantum.js";
import { backgroundShader, particleShader, uniforms } from "./shaders.js";

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
  let gpu, output, background, particles, stopResize, renderFrame;
  let context,
    useFallback = false;
  const viewport = canvas.parentElement;
  const resize = new ResizeObserver(() => {
    dirty = true;
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
    background = vgpu.effect(gpu, backgroundShader, {
      set: {
        params: {
          width: output.size[0],
          height: output.size[1],
          mode: state.mode,
          padding: 0,
        },
      },
    });
    particles = vgpu.draw(gpu, {
      shader: particleShader,
      vertices: 6,
      instances: 32768,
      blend: "additive",
      set: { params: uniforms(state, output.size) },
    });
    await Promise.all([background.compile(output), particles.compile(output)]);
    stopResize = output.onResize(({ width, height }) => {
      background.set({ params: { width, height } });
      particles.set({ params: { width, height } });
      dirty = true;
    });
    gpu.gpu.lost.then((info) => {
      if (!disposed && !useFallback) fallback(info);
    });
    gpu.onError((error) => {
      failed = true;
      fallback(error);
    });
    onStatus("32,768 field samples");
    renderFrame = () =>
      vgpu.frame(gpu, (frame) => {
        frame.pass({ target: output }, (pass) => {
          pass.draw(background);
          pass.draw(particles);
        });
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
    if (!visible || document.hidden) return;
    const currentSignature = [
      state.p1,
      state.phase,
      state.yaw,
      state.pitch,
      state.mode,
      state.paused,
    ].join("|");
    dirty ||= currentSignature !== signature;
    signature = currentSignature;
    if (state.paused && !dirty) return;
    if (!state.paused) state.time += delta * 0.8;
    try {
      if (useFallback) drawFallback(context, canvas, state);
      else if (!failed) {
        particles.set({
          params: {
            time: state.time,
            p1: state.p1,
            phase: state.phase,
            mode: state.mode,
            yaw: state.yaw,
            pitch: state.pitch,
          },
        });
        renderFrame();
      }
    } catch (error) {
      fallback(error);
    }
    if (state.mode === 1) {
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
        const [x, y] = project(point);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const v = blochVector(state.p1, state.phase);
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
