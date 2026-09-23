# Third-party software

The source build at `dist/eclipse3d.js`, distributed as `eclipse3d.js`, contains only Eclipse 3D source compiled by esbuild. The
runtime does not bundle Three.js or load any library from a CDN. Three.js is used
by the development benchmark and example asset tooling. It is not included in
the engine or required by projects that use Eclipse 3D.

The direct development dependencies installed by `package-lock.json` are:

| Package | Version | License | Use |
| --- | ---: | --- | --- |
| `@eslint/js` | 9.39.5 | MIT | ESLint's standard JavaScript rules |
| `@turbowarp/jszip` | 3.12.0 | MIT or GPL-3.0-or-later | Builds the Packager SB3 fixture; Eclipse 3D uses it under MIT |
| `@turbowarp/packager` | 3.13.0 | MPL-2.0 | Reproducible standalone-package test |
| `@types/node` | 24.13.3 | MIT | Type information for development scripts |
| `esbuild` | 0.28.2 | MIT | Production and benchmark bundling |
| `eslint` | 9.39.5 | MIT | Static analysis |
| `globals` | 16.5.0 | MIT | ESLint browser and Node global definitions |
| `three` | 0.185.1 | MIT | Development benchmark and example asset tooling |
| `typescript` | 5.9.3 | Apache-2.0 | JavaScript type checking |
| `scratch-parser` | 6.0.1 | BSD-3-Clause | SB3 structural validation |
| `@turbowarp/scratchblocks` | 3.6.7 | MIT | Offline Scratch-style block SVG layout |
| `@fontsource/roboto` | 5.3.0 | SIL OFL-1.1 (font) / MIT (package tooling) | Pinned outlined documentation/hero lettering |
| `fontkit` | 2.0.4 | MIT | Deterministic font shaping and glyph paths |
| `jsdom` | 26.1.0 | MIT | Offline SVG document construction and link checks |
| `@napi-rs/canvas` | 0.1.80 | MIT | Small source-icon contact-sheet preview |
| `@resvg/resvg-js` | 2.6.2 | MPL-2.0 | Faithful static SVG raster previews |
| `marked` | 18.0.13 | MIT | Static documentation HTML generation |

Transitive dependency versions and their license metadata are recorded in
`package-lock.json` and the installed packages. Packaged TurboWarp HTML also
contains TurboWarp Packager/scaffolding components and their generated license
notices; those are produced by the Packager rather than redistributed in the
Eclipse 3D extension bundle.

The generated block artwork uses scratchblocks' MIT-licensed shapes. Its notice is
retained in [scratchblocks-MIT.txt](assets/licenses/scratchblocks-MIT.txt). Roboto
glyph outlines retain the [SIL Open Font License](assets/licenses/Roboto-OFL.txt).
The Eclipse icon/hero geometry and teaching GLB/WAV/SVG assets are original project
work. Documentation and example-build dependencies are development tools; they
are not included in the self-contained production extension JavaScript.

The First-Person Knife Demo includes scenery under CC0 and CC BY 4.0. Its
[asset credits](examples/first-person-knife/ASSET_CREDITS.md) identify each asset,
creator, source, license and modification. The crate by plaggy is **CC BY 4.0**,
despite its source title containing "CC0". The purchased KnifeFPS.glb rig by
RGS_Dev is not distributed; users select their own copy at runtime.
