// Rendering patterns adapted from vgpu's gradient, fft-ocean, particle-orbit, and clipping
// examples. Quantum field equations and the Bloch mapping are site-specific.
// See ATTRIBUTION.md for canonical sources and the inspected revision.
export const backgroundShader = /* wgsl */ `
struct Params { width: f32, height: f32, mode: f32, padding: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = (uv - 0.5) * vec2f(params.width / params.height, 1.0);
  let halo = exp(-dot(p, p) * 5.0);
  var color = vec3f(0.058, 0.103, 0.085) + vec3f(0.022, 0.027, 0.018) * halo;
  let px = uv * vec2f(params.width, params.height);
  let grid = min(abs(fract(px.x / 50.0) - 0.5), abs(fract(px.y / 50.0) - 0.5));
  color += vec3f(0.014, 0.019, 0.014) * (1.0 - smoothstep(0.0, 0.012, grid)) * halo;
  return vec4f(color, 1.0);
}
`;

export const particleShader = /* wgsl */ `
struct Params {
  time: f32, p1: f32, phase: f32, mode: f32,
  width: f32, height: f32, yaw: f32, pitch: f32,
  coherence: f32, padding: f32,
}
@group(0) @binding(0) var<uniform> params: Params;
const PI: f32 = 3.14159265359;
struct Out {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec3f,
  @location(2) alpha: f32,
}
fn project(point: vec3f) -> vec3f {
  let cy = cos(params.yaw); let sy = sin(params.yaw);
  let cp = cos(params.pitch); let sp = sin(params.pitch);
  let a = vec3f(point.x * cy + point.z * sy, point.y, -point.x * sy + point.z * cy);
  let b = vec3f(a.x, a.y * cp - a.z * sp, a.y * sp + a.z * cp);
  let depth = 7.7 + b.z;
  return vec3f(b.x * 3.05 / depth / (params.width / params.height), b.y * 3.05 / depth, depth);
}
@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Out {
  var corners = array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
  let corner = corners[vertex];
  var point = vec3f(0.0);
  var color = vec3f(0.65, 0.78, 0.84);
  var alpha: f32 = 0.3;
  var radius: f32 = 1.5;
  if (params.mode < 0.5) {
    let x = (f32(instance % 256u) / 255.0 - 0.5) * 10.4;
    let z = (f32(instance / 256u) / 127.0 - 0.5) * 7.4;
    let env = exp(-(x*x*0.13 + z*z*0.23));
    let a = sqrt(1.0 - params.p1); let b = sqrt(params.p1);
    let phase0 = x*3.1 + z*1.1 - params.time;
    let phase1 = -x*3.1 + z*1.1 + params.phase - params.time;
    let real = env*(a*cos(phase0) + b*cos(phase1));
    let imag = env*(a*sin(phase0) + b*sin(phase1));
    let intensity = real*real + imag*imag;
    point = vec3f(x, real * 1.22, z);
    color = mix(vec3f(0.44,0.66,0.78), vec3f(0.92,0.59,0.37), smoothstep(-1.2, 2.5, x));
    color = mix(color, vec3f(0.97,0.9,0.74), min(intensity*0.38,0.65));
    alpha = 0.018*env + intensity * 0.48;
    radius = 0.75 + min(intensity, 1.5)*0.72;
  } else if (params.mode < 1.5 || params.mode > 3.5) {
    let equator = 2.0 * sqrt(params.p1 * (1.0 - params.p1));
    // Logical Bloch coordinates (x,y,z) map to world (x,z,-y), so |0> is up.
    let state = vec3f(equator*cos(params.phase), 1.0-2.0*params.p1, -equator*sin(params.phase));
    if (instance < 32000u) {
      let longitude = f32(instance % 250u) / 250.0 * 2.0 * PI;
      let latitude = f32(instance / 250u) / 127.0 * PI;
      point = vec3f(sin(latitude)*cos(longitude), cos(latitude), sin(latitude)*sin(longitude)) * 1.75;
      let ring = (instance % 250u) % 25u == 0u || (instance / 250u) % 16u == 0u;
      alpha = select(0.014, 0.32, ring);
      radius = select(0.8,1.25,ring);
      color = mix(vec3f(0.48,0.7,0.8),vec3f(0.9,0.72,0.51), (point.y/1.75+1.0)*0.5);
      if (params.mode > 4.5 && point.y > (1.0-2.0*params.p1)*1.75) { alpha = 0.0; }
    } else {
      let progress = min(1.0, f32(instance - 32000u) / 700.0);
      point = state * 1.75 * progress;
      color = vec3f(0.98, 0.72, 0.49);
      alpha = select(0.018, 0.035, progress >= 1.0);
      radius = select(1.7, 7.0, progress >= 1.0);
      if (params.mode > 3.5 && params.mode < 4.5) {
        // Pure reference and the dephased vector share the same population z.
        if (instance < 32384u) {
          point = state * 1.75 * min(1.0,f32(instance-32000u)/360.0);
          color = vec3f(0.45,0.7,0.85); alpha = 0.04; radius = 1.1;
        } else {
          let v = vec3f(state.x*params.coherence,state.y,state.z*params.coherence);
          let t = min(1.0,f32(instance-32384u)/340.0);
          point = v * 1.75 * t;
          alpha = 0.055; radius = select(1.8,7.0,t>=1.0);
        }
      }
      if (params.mode > 4.5) {
        let height = 1.0-2.0*params.p1;
        let diskRadius = sqrt(max(0.0,1.0-height*height));
        let i = f32(instance-32000u);
        var angle = i * 2.399963;
        var r = sqrt(min(1.0,i/639.0));
        if (i >= 640.0) { r=1.0; angle=(i-640.0)/128.0*2.0*PI; }
        point = vec3f(r*diskRadius*cos(angle),height,r*diskRadius*sin(angle))*1.75;
        alpha = select(0.32,0.7,i>=640.0); radius=select(1.6,2.4,i>=640.0);
      }
    }
  } else {
    let x = (f32(instance%256u)/255.0-0.5)*12.0;
    let z = (f32(instance/256u)/127.0-0.5)*8.0;
    point = vec3f(x,sin(x+z+params.time*.2)*.25,z);
    color = vec3f(0.31,0.41,0.35);
    alpha = 0.025 * exp(-(x*x+z*z)*.08);
    radius = 0.65;
  }
  let projected = project(point);
  let scale = clamp(params.height / 565.0, 0.75, 2.0);
  let offset = corner * radius * scale * 2.0 / vec2f(params.width,params.height);
  var out: Out;
  out.position = vec4f(projected.xy + offset, 0.5, 1.0);
  out.local = corner;
  out.color = color;
  out.alpha = alpha;
  return out;
}
@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  let r2 = dot(in.local,in.local);
  if (r2 > 1.0) { discard; }
  let falloff = exp(-r2*3.5) * (1.0-smoothstep(0.65,1.0,r2));
  return vec4f(in.color * in.alpha * falloff, 0.0);
}
`;

/** Pure data function shared by browser and real GPU render checks. */
export function uniforms(state, size) {
  return {
    time: state.time ?? 0,
    p1: state.p1,
    phase: state.phase,
    mode: state.mode,
    width: size[0],
    height: size[1],
    yaw: state.yaw ?? 0.38,
    pitch: state.pitch ?? (state.mode === 1 ? 0.18 : 0.62),
    coherence: state.coherence ?? 1,
    padding: 0,
  };
}

export const phaseShader = /* wgsl */ `
struct Params {
  time: f32, p1: f32, phase: f32, mode: f32,
  width: f32, height: f32, yaw: f32, pitch: f32,
  coherence: f32, padding: f32,
}
@group(0) @binding(0) var<uniform> params: Params;
const PI: f32 = 3.14159265359;
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let base = vec3f(0.065,0.11,0.09);
  if (params.mode < 2.5) {
    // Gallery preview encodes exact Z probabilities as bar heights.
    let left = uv.x < 0.5;
    let probability = select(params.p1,1.0-params.p1,left);
    let center = select(0.68,0.32,left);
    let box = abs(uv.x-center)<0.095 && uv.y>0.8-probability*0.62 && uv.y<0.8;
    let color = select(vec3f(0.39,0.62,0.72),vec3f(0.82,0.51,0.31),left);
    return vec4f(select(base,color,box),1.0);
  }
  let x = (uv.x-0.5)*10.4;
  let z = (uv.y-0.5)*7.4;
  let envelope = exp(-(x*x*0.13+z*z*0.23));
  let a = sqrt(1.0-params.p1); let b = sqrt(params.p1);
  let p0=x*3.1+z*1.1-params.time;
  let p1=-x*3.1+z*1.1+params.phase-params.time;
  let real=envelope*(a*cos(p0)+b*cos(p1));
  let imag=envelope*(a*sin(p0)+b*sin(p1));
  let intensity=real*real+imag*imag;
  // Cyclic phase palette; the amplitude-zero branch avoids atan2(0,0).
  let phase=atan2(imag,real+1e-12);
  let hue=vec3f(0.55)+vec3f(0.4)*cos(vec3f(phase)+vec3f(0.0,2.1,4.2));
  let strength=pow(clamp(intensity*0.5,0.0,1.0),0.45);
  let color=mix(base,hue,strength);
  return vec4f(color,1.0);
}
`;
