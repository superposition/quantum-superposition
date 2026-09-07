# Superposition

Eight interactive quantum models rendered with vgpu and hosted on GitHub Pages. Each gallery entry explains its coordinates, graphics and limits in plain English.

**Live site:** https://superposition.github.io/quantum-superposition/

- **Wave interference:** change the relative phase and amplitude balance of two coherent modes. The GPU draws 32,768 field samples as luminous instanced particles.
- **Complex amplitude:** a fullscreen shader maps phase to a cyclic color palette and intensity to brightness. It uses the same amplitude equations as the particle field.
- **The qubit:** explore a pure qubit on the Bloch sphere. Prepare zero, one, plus or minus, or choose any balance and phase.
- **Pure and mixed states:** a dephasing channel scales transverse Bloch components by a coherence factor. The readout reports density-matrix purity.
- **Constant-probability sections:** plane clipping exposes a disk of Bloch-ball states with equal Z-basis populations. Its rim is pure; its interior is mixed.
- **Measurement:** collect 128 measurements from fresh copies in the X, Y or Z basis. Measure a single copy to observe ideal collapse and repeatability in the same basis.
- **Clifford gates:** apply Hadamard, phase, inverse phase and Pauli X, Y and Z. Build a sequence, undo a gate or restore the starting state. The six marked stabilizer states form an octahedron.
- **Pauli operators:** follow the signed X, Y and Z operators through the same gate sequence. Three coloured directions and an exact mapping table show the complete operation, independent of the chosen input state.

The site is fully static. Eight independently prepared previews share one WebGPU device and pause when offscreen. Each preview opens a model in the main viewer. Rendered PNGs provide gallery fallbacks; the main viewer has an interactive Canvas renderer. The page includes keyboard controls, responsive layouts, independent pause controls, and reduced-motion support. Fonts are bundled locally. No accounts, tracking, server, or API keys are required.

## Develop

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

## Verify

```sh
npm test
npm run build
npm run test:gpu
```

The physics tests verify normalization, Born probabilities, phase sensitivity, collapse, interference, dephasing, purity and sphere sections. Clifford tests compare the rotations against independent complex gate matrices, verify signed operator conjugation, enumerate the 24 proper orientations and check gate order and Y measurements. A DOM integration check exercises the production controls, all eight models, sequence history, undo, reset, measurements and pause behaviour.

The optional GPU check requires a native WebGPU adapter (`npx vgpu doctor`). It renders all eight models and parameter variants, checks that controls affect pixels, and compares the phase shader to the CPU amplitude equations. Images are saved in ignored `artifacts/`. Run `npm run gallery:render` to regenerate the eight committed preview PNGs in `public/gallery/`. CI runs the physics and interaction checks and the production build without requiring a GPU.

## Publish

The `Publish GitHub Pages` workflow builds and deploys every push to `main`. Repository **Settings → Pages → Source** must be **GitHub Actions**. The relative Vite base supports both repository Pages paths and root domains.

## Physics and visual conventions

The balance slider sets the chance of one in a Z measurement. Relative phase sets the angle between the two amplitudes. The pure state is normalized, and its overall phase is omitted.

For each Pauli measurement, the chance of the positive outcome is one half of one plus the corresponding Bloch component. An ideal measurement collapses a single copy to the resulting measurement state. Changing basis preserves this collapsed copy. Editing preparation controls or applying a gate resets it. A batch measures fresh copies of the prepared state without changing the separate single copy. Each batch replaces the previous batch to keep exactly 128 dots and consistent statistics.

The wave illustration combines two plane-wave modes with opposite x components under a shared Gaussian envelope, in arbitrary units. It shows real amplitude as height and relative intensity as brightness. Its common time phase changes the displayed real amplitude without changing the interference intensity. The spatial field is not normalized as a probability density and is not a Schrödinger solver. Samples are field points. Bloch coordinates describe state space.

Dephasing scales the X and Y components by the coherence factor and preserves Z. Purity is one half of one plus the squared length of the Bloch vector. This process applies only to the dephasing view; the measurement view samples the shared pure preparation. The section height is the chance of zero minus the chance of one. Its radius is the square root of one minus the squared height. Clipping is geometric and does not implement a quantum operation.

Clifford gates are represented as exact signed permutations of the Pauli axes, using forward operator conjugation. Gate sequences apply in the time order shown. Every sequence is evaluated from its saved input state, which avoids accumulating rotation errors. Editing balance or phase starts a new sequence; changing models preserves the sequence. Undo removes the final gate, and restore removes all gates and restores the saved input. The 24 orientations are generated from Hadamard and phase, with overall phase ignored. The two order examples explicitly start at zero.

The term Clifford refers to the quantum gate group, not general Clifford algebras. Entanglement, energy relaxation and physical gate dynamics are outside the models' scope. Measurement randomness uses the browser's cryptographic random number generator.

See [ATTRIBUTION.md](ATTRIBUTION.md) for graphics references and physics reading.
