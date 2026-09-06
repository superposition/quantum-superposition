# Sources and credits

The site uses [vgpu 0.4.0](https://vgpu.sh/docs/cli), published under the MIT license. Graphics patterns were inspected with the vgpu CLI from canonical example revision `69160a127bc8c2b54c5963763469d55909a349857129d91b3bc76c10839222a9` on September 6, 2026.

| Example | Technique adapted here |
| --- | --- |
| [Simple Gradient](https://vgpu.sh/examples/gradient) | Canvas surface, fullscreen fragment effect, explicit frame lifecycle, and cleanup. |
| [Particles ocean](https://vgpu.sh/examples/fft-ocean) | Instance-indexed field grid, six-vertex particle billboards, screen-sized points, and additive rendering. The ocean's FFT and fluid physics are not used. |
| [Particle Orbit](https://vgpu.sh/examples/particle-orbit) | Soft particle falloff, luminous color, responsive canvas sizing, and interactive camera input. Its TypeGPU simulation and radiance-cascade pipeline are not used. |

The quantum equations, explanatory content, site design, controls, and fallback renderer were authored for this site. It is not an official vgpu or IBM project.

Physics reference: [IBM Quantum Learning — Quantum information](https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/single-systems/quantum-information), covering state vectors, amplitudes, normalization, measurement, and the plus/minus states.

Newsreader, IBM Plex Sans, and IBM Plex Mono are distributed through Fontsource under the SIL Open Font License. License files are included in `public/licenses/` and published with the site, together with the vgpu MIT notice.
