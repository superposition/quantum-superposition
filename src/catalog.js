export const catalog = [
  {
    mode: 0,
    id: "wave",
    title: "Wave interference",
    group: "Amplitudes",
    equation: "Amplitudes add before probabilities are calculated",
    legend: "Height shows real amplitude. Brightness shows intensity.",
    description:
      "Two waves combine. Their relative phase determines where they reinforce or cancel each other.",
    coordinates:
      "The two horizontal directions describe position in arbitrary units. Height shows the real part of the combined amplitude.",
    boundary:
      "Each point samples a wave field. The points are not individual particles. This illustrative field has not been scaled so that its total probability is one.",
    encoding:
      "Point height shows real amplitude. Brightness shows squared amplitude magnitude, called intensity. Animation changes the common phase while leaving intensity unchanged.",
    source: "fft-ocean",
    sourceTitle: "Particles ocean",
    technique: "A field drawn with repeated points",
  },
  {
    mode: 1,
    id: "bloch",
    title: "Pure qubit states",
    group: "State space",
    equation: "Each surface point represents a pure qubit state",
    legend: "The copper line points to the prepared state.",
    description:
      "A qubit is a quantum system with two basis states, called zero and one. A pure state appears as a point on the Bloch sphere.",
    coordinates:
      "The sphere has three measurement axes, called X, Y and Z. The upward direction is positive Z. Height sets the difference between the chances of zero and one.",
    boundary:
      "The sphere represents possible states, not a particle moving through space. It describes one qubit and cannot show entanglement between qubits.",
    encoding:
      "The copper line points from the centre to the current state. Zero is at the top and one is at the bottom. Relative phase sets the direction around the vertical axis.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Points on a sphere with a movable view",
  },
  {
    mode: 2,
    id: "measure",
    title: "Measurement statistics",
    group: "Measurement",
    equation: "Each measurement records one outcome",
    legend: "Copper marks the first outcome. Blue marks the second.",
    description:
      "The state and the measurement basis determine the chance of each outcome. A basis specifies the pair of states the measurement distinguishes.",
    coordinates:
      "Each dot records one simulated measurement. The bars count how often each outcome occurs.",
    boundary:
      "Each batch uses 128 fresh copies of the prepared state. Measuring the same copy again in the same basis repeats its recorded outcome. Random samples come from the browser, not quantum hardware.",
    encoding:
      "Dots and bars show the batch results. The result for a single copy is recorded separately. Changing the measurement basis can make that copy's next outcome uncertain again.",
    source: "gradient",
    sourceTitle: "Simple Gradient",
    technique: "A colour field with measurement counts",
  },
  {
    mode: 3,
    id: "complex",
    title: "Complex amplitude",
    group: "Amplitudes",
    equation: "Amplitude has both magnitude and phase",
    legend: "Colour shows phase. Brightness shows intensity.",
    description:
      "A complex amplitude has a size, called its magnitude, and an angle, called its phase. This view shows the same combined waves as the interference view.",
    coordinates:
      "The two directions describe position in arbitrary units, viewed from above.",
    boundary:
      "Colour is a way to display phase, not the visible colour of a quantum particle. Changing the common phase changes the colours without changing measurement probabilities.",
    encoding:
      "Colour follows a repeating scale of phase angles. Dark regions have low intensity. Phase is undefined wherever the amplitude is exactly zero.",
    source: "gradient",
    sourceTitle: "Simple Gradient",
    technique: "Colour calculated for each pixel",
  },
  {
    mode: 4,
    id: "dephase",
    title: "Pure and mixed states",
    group: "State space",
    equation: "Dephasing preserves the chances of zero and one",
    legend: "Copper shows the changed state. Blue shows the input.",
    description:
      "Dephasing reduces the phase coherence of a state. In this model it shortens the X and Y components while leaving the Z component unchanged.",
    coordinates:
      "Pure states lie on the sphere. Mixed states lie inside it. Purity ranges from one half at the centre to one on the surface.",
    boundary:
      "This view describes dephasing without a recorded measurement outcome. The coherence slider is not a clock. Only this view uses the changed state; the measurement view uses the shared pure preparation.",
    encoding:
      "The copper line approaches the vertical axis as coherence decreases. Zero and one remain pure under this process. The blue line retains the original pure state.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Two state directions drawn with points",
  },
  {
    mode: 5,
    id: "section",
    title: "Equal probability sections",
    group: "State space",
    equation: "Every point on the disk has the same zero and one chances",
    legend: "The copper disk contains states with equal Z probabilities.",
    description:
      "States at the same height have the same chances of zero and one in a Z measurement. A horizontal slice collects these states in one disk.",
    coordinates:
      "Height is the chance of zero minus the chance of one. The disk lies inside the Bloch sphere at that height.",
    boundary:
      "Cutting the drawing exposes a set of possible states. It does not apply a gate or perform a measurement. States on the same disk can give different X or Y measurement probabilities.",
    encoding:
      "The upper surface is removed to expose the disk. Its edge contains pure states and its interior contains mixed states. The disk becomes a point at either pole.",
    source: "clipping",
    sourceTitle: "Clipping",
    technique: "A plane cuts the sphere to reveal a section",
  },
  {
    mode: 6,
    id: "clifford",
    title: "Clifford gates",
    group: "Quantum logic",
    equation: "Gate order can change the final state",
    legend: "Six marked states surround the copper state direction.",
    description:
      "Clifford gates are reversible operations that carry Pauli operators to Pauli operators, possibly reversing their signs. Apply a sequence to change the prepared qubit.",
    coordinates:
      "The six marked directions are zero, one, plus, minus, Y positive and Y negative. They are the six single-qubit stabilizer states: each gives a certain outcome on one Pauli measurement axis.",
    boundary:
      "Clifford gates move these six states among themselves. They also act on every other qubit state, but cannot reach every pure state from zero. The connecting lines show geometry, not the physical path taken during a gate.",
    encoding:
      "The six marked directions form an octahedron. The copper line shows the current state after the complete sequence. A gate changes the shared preparation used by the other views.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Six state markers and an octahedron drawn with points",
  },
  {
    mode: 7,
    id: "operators",
    title: "Pauli operators",
    group: "Quantum logic",
    equation: "There are 24 single-qubit Clifford actions",
    legend: "Copper tracks X. Blue tracks Y. Green tracks Z.",
    description:
      "A Pauli operator describes a measurement with positive and negative outcomes. The same operator can also act as a gate. This view tracks the measurement operators through the gate sequence.",
    coordinates:
      "Fixed labels mark the positive X, Y and Z directions. Each coloured line follows an input operator as the sequence carries it to a positive or negative output direction.",
    boundary:
      "This is a forward transformation of operators alongside the state. A reversed operator sign swaps the positive and negative outcome labels. Overall phase is omitted; it does not change these operators or isolated-qubit probabilities.",
    encoding:
      "The table gives the exact operator mapping for the complete sequence. The three coloured directions stay perpendicular. Their 24 possible orientations describe all single-qubit Clifford actions when overall phase is ignored.",
    source: "particle-orbit",
    sourceTitle: "Particle Orbit",
    technique: "Three transformed operator directions drawn with points",
  },
];

export const galleryOrder = [0, 3, 1, 4, 5, 2, 6, 7];
export const isSphereMode = (mode) => [1, 4, 5, 6, 7].includes(mode);
export function previewState(mode) {
  return {
    mode,
    p1: mode === 5 ? 0.35 : 0.5,
    phase: mode === 4 ? 0.7 : mode === 6 ? Math.PI / 2 : 0,
    axes: mode === 7 ? [3, 1, 2] : [1, 2, 3],
    coherence: 0.35,
    time: 0.7,
    yaw: 0.38,
    pitch: isSphereMode(mode) ? 0.22 : 0.62,
  };
}
