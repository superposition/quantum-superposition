# Superposition

A playground for possibility: three interactive quantum experiments, built with vgpu and hosted on GitHub Pages.

**Live site:** https://superposition.github.io/quantum-superposition/

- **Wave interference:** change the relative phase and amplitude balance of two coherent modes. The GPU draws 32,768 field samples as luminous instanced particles.
- **The qubit:** explore a pure qubit on the Bloch sphere. Prepare |0⟩, |1⟩, |+⟩, or |−⟩, or choose any balance and phase.
- **Measurement:** collect 128 shots from independently prepared copies in the Z or X basis. Measure a single copy to observe ideal collapse and repeatability in the same basis.

The site is fully static. All experiments run in the browser. It includes a Canvas fallback, keyboard controls, responsive layouts, pause controls, and reduced-motion support. Fonts are bundled locally. No accounts, tracking, server, or API keys are required.

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

The physics tests verify normalization, Born probabilities, phase sensitivity, collapse, and interference. A DOM integration check exercises the actual preparation controls, experiment tabs, keyboard navigation, fresh-copy batches, single-copy collapse, reset, and pause behavior. The optional GPU check requires a working native WebGPU adapter (`npx vgpu doctor`); it compiles and renders the actual production shaders and saves five images in ignored `artifacts/`. It checks that phase and balance changes affect the rendered pixels. CI runs the deterministic physics and interaction checks and the production build, without requiring a GPU.

## Publish

The `Publish GitHub Pages` workflow builds and deploys every push to `main`. Repository **Settings → Pages → Source** must be **GitHub Actions**. The relative Vite base supports both repository Pages paths and root domains.

## Physics and visual conventions

The prepared state is `sqrt(1-p1)|0⟩ + exp(iφ)sqrt(p1)|1⟩`. Its Bloch vector is `(2sqrt(p1(1-p1))cosφ, 2sqrt(p1(1-p1))sinφ, 1-2p1)`.

The probability of the first result is `1-p1` in Z and `(1+x)/2` in X. An ideal projective measurement collapses a single copy to the resulting eigenstate. Changing basis preserves this collapsed copy. Editing preparation controls resets it. The batch always measures fresh copies of the prepared state, and never mutates the single copy. Each batch replaces the previous batch to keep exactly 128 dots and consistent statistics.

The wave illustration combines two oppositely directed plane-wave modes under a shared Gaussian envelope, in arbitrary units. It shows real amplitude as height and relative intensity as brightness. Its common time phase changes the displayed real amplitude without changing the interference intensity. The spatial field is illustrative and is not normalized as a probability density; it is not a Schrödinger solver. Samples are field points, not quantum particles. The sphere is state space, not physical space. Noise and decoherence are omitted; measurement randomness is supplied by the browser's cryptographic PRNG, not quantum hardware.

See [ATTRIBUTION.md](ATTRIBUTION.md) for graphics references and physics reading.
