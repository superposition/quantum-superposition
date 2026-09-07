# Sources and credits

The site uses [vgpu 0.4.0](https://vgpu.sh/docs/cli), published under the MIT license. Graphics patterns were inspected with the vgpu CLI from canonical example revision `69160a127bc8c2b54c5963763469d55909a349857129d91b3bc76c10839222a9` on September 6, 2026.

| Example                                                   | Technique adapted here                                                                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Simple Gradient](https://vgpu.sh/examples/gradient)      | Canvas surface, fullscreen fragment effect, explicit frame lifecycle, and cleanup.                                                                                                                            |
| [Particles ocean](https://vgpu.sh/examples/fft-ocean)     | Instance-indexed field grid, six-vertex particle billboards, screen-sized points, and additive rendering. The ocean's FFT and fluid physics are not used.                                                     |
| [Particle Orbit](https://vgpu.sh/examples/particle-orbit) | Soft particle falloff, luminous color, responsive canvas sizing, and interactive camera input. Its TypeGPU simulation and radiance-cascade pipeline are not used.                                             |
| [Clipping](https://vgpu.sh/examples/clipping)             | A plane test clips the sphere. The section radius is the square root of one minus the squared height. This site uses point sprites for the geometry. Clipping is a view operation, not a quantum measurement. |

The gallery uses eight vgpu surfaces with independent bindings on one GPU device. The complex-amplitude entry adds a phase-colour fragment shader; the measurement preview encodes exact default-state Z probabilities as bar heights. The measurement viewer displays sampled outcomes separately. The Clifford and Pauli views use the same point rendering approach for an octahedron, six state markers and three signed operator directions. Their geometry and quantum transformations were authored for this site. Static gallery images are generated from the same pipeline as the live previews.

The quantum equations, explanatory content, site design, controls, and fallback renderer were authored for this site. It is not an official vgpu or IBM project.

Physics reference: [IBM Quantum Learning — Quantum information](https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/single-systems/quantum-information), covering state vectors, amplitudes, normalization, measurement, and the plus/minus states.

Clifford reference: [IBM Quantum, Clifford operators](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.quantum_info.Clifford), defining the group through Pauli conjugation, listing its gates and generators, and describing the treatment of overall phase. The site enumerates all 24 single-qubit orientations directly and tests the signed mappings against independent complex matrices.

General gate reference: [IBM Quantum, T gate](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.circuit.library.TGate), giving its relative phase and rotation about Z. The T gate is described as a boundary of the Clifford model and is not included in the interactive gate set.

Newsreader, IBM Plex Sans, and IBM Plex Mono are distributed through Fontsource under the SIL Open Font License. License files are included in `public/licenses/` and published with the site, together with the vgpu MIT notice.
