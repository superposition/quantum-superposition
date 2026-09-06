# Superposition

Six interactive quantum models rendered with vgpu and hosted on GitHub Pages. Each gallery entry states its coordinates, visual encoding, assumptions, and conceptual boundaries.

**Live site:** https://superposition.github.io/quantum-superposition/

- **Wave interference:** change the relative phase and amplitude balance of two coherent modes. The GPU draws 32,768 field samples as luminous instanced particles.
- **Complex amplitude:** a fullscreen shader maps phase to a cyclic color palette and intensity to brightness. It uses the same amplitude equations as the particle field.
- **The qubit:** explore a pure qubit on the Bloch sphere. Prepare |0⟩, |1⟩, |+⟩, or |−⟩, or choose any balance and phase.
- **Pure and mixed states:** a dephasing channel scales transverse Bloch components by a coherence factor. The readout reports density-matrix purity.
- **Constant-probability sections:** plane clipping exposes a disk of Bloch-ball states with equal Z-basis populations. Its rim is pure; its interior is mixed.
- **Measurement:** collect 128 shots from independently prepared copies in the Z or X basis. Measure a single copy to observe ideal collapse and repeatability in the same basis.

The site is fully static. Six independently prepared previews share one WebGPU device and pause when offscreen. Each preview opens a model in the main viewer. Rendered PNGs provide gallery fallbacks; the main viewer has an interactive Canvas renderer. The page includes keyboard controls, responsive layouts, independent pause controls, and reduced-motion support. Fonts are bundled locally. No accounts, tracking, server, or API keys are required.

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

The physics tests verify normalization, Born probabilities, phase sensitivity, collapse, interference, dephasing, purity, and Bloch-ball sections. A DOM integration check exercises the actual controls, six-model navigation, measurement batches, single-copy collapse, and pause behavior. The optional GPU check requires a native WebGPU adapter (`npx vgpu doctor`); it renders the production pipeline for six models plus parameter variants, checks that controls affect pixels, and compares the phase shader to the CPU amplitude equations. Images are saved in ignored `artifacts/`. Run `npm run gallery:render` to regenerate the six committed preview PNGs in `public/gallery/`. CI runs the deterministic physics and interaction checks and the production build without requiring a GPU.

## Publish

The `Publish GitHub Pages` workflow builds and deploys every push to `main`. Repository **Settings → Pages → Source** must be **GitHub Actions**. The relative Vite base supports both repository Pages paths and root domains.

## Physics and visual conventions

The prepared state is `sqrt(1-p1)|0⟩ + exp(iφ)sqrt(p1)|1⟩`. Its Bloch vector is `(2sqrt(p1(1-p1))cosφ, 2sqrt(p1(1-p1))sinφ, 1-2p1)`.

The probability of the first result is `1-p1` in Z and `(1+x)/2` in X. An ideal projective measurement collapses a single copy to the resulting eigenstate. Changing basis preserves this collapsed copy. Editing preparation controls resets it. The batch always measures fresh copies of the prepared state, and never mutates the single copy. Each batch replaces the previous batch to keep exactly 128 dots and consistent statistics.

The wave illustration combines two plane-wave modes with opposite x components under a shared Gaussian envelope, in arbitrary units. It shows real amplitude as height and relative intensity as brightness. Its common time phase changes the displayed real amplitude without changing the interference intensity. The spatial field is not normalized as a probability density and is not a Schrödinger solver. Samples are field points. Bloch coordinates describe state space.

The dephasing model maps `(x,y,z)` to `(λx,λy,z)` and computes `Tr(ρ²)=(1+|r|²)/2`. The coherence parameter applies only to this derived-state view; the measurement entry samples the shared input pure state. The section model draws `z=1-2P(1)` with radius `sqrt(1-z²)`; clipping is geometric and does not implement a quantum operation. Entanglement, energy relaxation, and a physical time evolution are outside the models' scope. Measurement randomness uses the browser's cryptographic PRNG.

See [ATTRIBUTION.md](ATTRIBUTION.md) for graphics references and physics reading.
