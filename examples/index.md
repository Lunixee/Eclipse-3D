# Eclipse 3D examples

Seven small teaching projects and a complete first-person knife demo. Each embeds Eclipse 3D. The knife demo is playable without a rig; owners can optionally load their separately purchased rig at runtime.

| Example | What it demonstrates |
| --- | --- |
| [First-Person Knife Demo](first-person-knife/README.md) | Movement, animation, combat and local model importing; purchased rig optional. |
| [Hello 3D](hello-3d/README.md) | A first retained scene: one camera, one cube and two light inputs. |
| [Materials & Lighting](materials-lighting/README.md) | Compare rough ceramic with a metallic surface under shared studio light. |
| [Animated Model](animated-model/README.md) | Load an embedded original glTF rotor and play its named Spin clip. |
| [Particles](particles/README.md) | A seeded fountain with bounded capacity, gravity and color/alpha over life. |
| [Physics & Audio](physics-audio/README.md) | An attached dynamic box falls onto a static floor while carrying a quiet positional pulse. |
| [Post Processing & Render Targets](post-processing/README.md) | A second camera updates an in-world monitor while the main view uses vignette, color and FXAA. |
| [Custom Rendering](custom-rendering/README.md) | Original octahedron geometry with a project-defined unlit GLSL material and typed tint uniform. |

## Rebuild

Run `npm run build`, then `npm run examples`. Use `npm run examples:package` for standalone HTML exports under `artifacts/examples/`. Screenshots are real runtime captures and are refreshed only after visual changes.

Generated SB3 files embed the exact development bundle. Regenerate them after any production edit. The project definitions and original model/audio assets are maintained under `scripts/examples/`; no benchmark fixture scripts are imported.
