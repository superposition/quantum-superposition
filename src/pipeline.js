import {
  backgroundShader,
  particleShader,
  phaseShader,
  uniforms,
} from "./shaders.js";

export function createScene(api, gpu, output, state, preview = false) {
  const background = api.effect(gpu, backgroundShader, {
    set: {
      params: {
        width: output.size[0],
        height: output.size[1],
        mode: state.mode,
        padding: 0,
      },
    },
  });
  const field = api.draw(gpu, {
    shader: particleShader,
    vertices: 6,
    instances: 32768,
    blend: "additive",
    set: { params: uniforms(state, output.size) },
  });
  const phase = api.effect(gpu, phaseShader, {
    set: { params: uniforms(state, output.size) },
  });
  let mode = state.mode;
  return {
    async compile() {
      await Promise.all([
        background.compile(output),
        field.compile(output),
        phase.compile(output),
      ]);
    },
    update(next, size = output.size) {
      mode = next.mode;
      const params = uniforms(next, size);
      field.set({ params });
      phase.set({ params });
      background.set({
        params: { width: size[0], height: size[1], mode, padding: 0 },
      });
    },
    render(frame) {
      frame.pass({ target: output }, (pass) => {
        if (mode === 3 || (preview && mode === 2)) pass.draw(phase);
        else {
          pass.draw(background);
          pass.draw(field);
        }
      });
    },
  };
}
