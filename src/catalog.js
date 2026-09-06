export const catalog = [
  {
    mode: 0,
    id: "wave",
    title: "Wave interference",
    group: "Amplitude fields",
    equation: "ψ = αψ₀ + βψ₁",
    legend: "Height: Re(ψ) · brightness: |ψ|²",
    description:
      "Two coherent modes have complex amplitudes. Their sum determines the interference intensity. Relative phase shifts the interference fringes.",
    coordinates:
      "Two dimensionless spatial coordinates; vertical displacement represents the real amplitude.",
    boundary:
      "The points sample an amplitude field. They do not represent individual particles. The Gaussian envelope is illustrative and is not normalized as a spatial probability density.",
    encoding:
      "Instanced points display Re(ψ) as height and |ψ|² as brightness. Animation changes the common phase; intensity is time-independent in this model.",
    source: "fft-ocean",
    sourceTitle: "Particles ocean",
    technique: "Instanced particle field",
  },
  {
    mode: 1,
    id: "bloch",
    title: "Pure qubit states",
    group: "State space",
    equation: "|ψ⟩ = cos(θ/2)|0⟩ + exp(iφ)sin(θ/2)|1⟩",
    legend: "Copper: state vector · surface: pure states",
    description:
      "A pure qubit corresponds to a unit Bloch vector. Its polar angle determines the Z-basis probabilities. Its azimuth is the relative phase.",
    coordinates:
      "Bloch coordinates (x, y, z); z = P(0) − P(1). The vertical screen axis represents z.",
    boundary:
      "The sphere is a state-space representation. Its axes are not spatial coordinates or particle trajectories. This entry represents one qubit and excludes entanglement.",
    encoding:
      "The endpoint of the copper vector identifies the prepared state. The north and south poles are |0⟩ and |1⟩.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Point sprites and camera input",
  },
  {
    mode: 2,
    id: "measure",
    title: "Measurement statistics",
    group: "Measurement",
    equation: "P(k) = |⟨k|ψ⟩|²",
    legend: "Copper: first outcome · blue: second outcome",
    description:
      "Projective measurements sample the Born probabilities in a selected basis. Repeating the experiment on independently prepared copies produces outcome frequencies.",
    coordinates:
      "Sample index and counts. Each dot corresponds to one simulated measurement.",
    boundary:
      "A batch prepares a fresh pure state for each shot. Measuring one copy updates that copy to the outcome eigenstate. The random source is a browser PRNG; no quantum hardware is used.",
    encoding:
      "128 sample dots and a histogram display the batch outcomes. The single-copy measurement result is recorded separately.",
    source: "gradient",
    sourceTitle: "Simple Gradient",
    technique: "Fragment field with outcome overlay",
  },
  {
    mode: 3,
    id: "complex",
    title: "Complex amplitude",
    group: "Amplitude fields",
    equation: "ψ = Re(ψ) + i Im(ψ)",
    legend: "Color: arg(ψ) · brightness: |ψ|²",
    description:
      "A complex amplitude has magnitude and phase. The color map displays phase over the same two-mode field used in the interference surface.",
    coordinates:
      "Two dimensionless spatial coordinates, viewed directly from above.",
    boundary:
      "Color is a phase encoding. It is not an observable color of a quantum particle. A common phase rotates the color map while leaving |ψ|² unchanged.",
    encoding:
      "The cyclic palette maps phase from −π to π. Dark bands have low intensity; phase becomes undefined at exact amplitude zeros.",
    source: "gradient",
    sourceTitle: "Simple Gradient",
    technique: "Fullscreen fragment shader",
  },
  {
    mode: 4,
    id: "dephase",
    title: "Pure and mixed states",
    group: "State space",
    equation: "(x, y, z) → (λx, λy, z)",
    legend: "Copper: dephased state · blue: pure-state reference",
    description:
      "A phase-damping channel scales the off-diagonal density-matrix entries by λ. Z-basis populations are preserved while coherence decreases.",
    coordinates:
      "Bloch-ball coordinates. The vector length determines purity: Tr(ρ²) = (1 + |r|²)/2.",
    boundary:
      "Dephasing describes an ensemble channel without a recorded outcome. The slider parameterizes coherence, not physical time. This channel applies only to this view; the measurement entry samples the shared input pure state.",
    encoding:
      "The copper vector contracts toward the z axis as λ decreases. States with |r| < 1 are mixed. Z eigenstates remain pure under this channel.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Instanced state vectors",
  },
  {
    mode: 5,
    id: "section",
    title: "Constant-probability sections",
    group: "State space",
    equation: "z = 1 − 2P(1)",
    legend: "Copper plane: fixed P(1) · rim: pure states",
    description:
      "A plane at fixed Bloch z contains all single-qubit states with the same Z-basis probabilities. The boundary circle contains pure states; its interior contains mixed states.",
    coordinates: "A geometric section of the Bloch ball at z = 1 − 2P(1).",
    boundary:
      "Clipping reveals a set of states. It does not apply a quantum gate, perform a measurement, or collapse a wavefunction. Points on the section can differ in other measurement bases.",
    encoding:
      "The upper surface is clipped to expose the section. Changing P(1) moves the plane; the disk radius is √(1 − z²).",
    source: "clipping",
    sourceTitle: "Clipping",
    technique: "Plane clipping and section geometry",
  },
];

export const galleryOrder = [0, 3, 1, 4, 5, 2];
export const isSphereMode = (mode) => [1, 4, 5].includes(mode);
export function previewState(mode) {
  return {
    mode,
    p1: mode === 5 ? 0.35 : 0.5,
    phase: mode === 4 ? 0.7 : 0,
    coherence: 0.35,
    time: 0.7,
    yaw: 0.38,
    pitch: isSphereMode(mode) ? 0.22 : 0.62,
  };
}
