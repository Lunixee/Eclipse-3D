# Third-party software

The source build at `dist/eclipse3d.js`, distributed as `eclipse3d.js`, contains only Eclipse 3D source compiled by esbuild. The
runtime does not bundle Three.js or load any library from a CDN.

The direct development dependencies installed by `package-lock.json` are:

| Package | Version | License | Use |
| --- | ---: | --- | --- |
| `@eslint/js` | 9.39.5 | MIT | ESLint's standard JavaScript rules |
| `@types/node` | 24.13.3 | MIT | Type information for development scripts |
| `esbuild` | 0.28.2 | MIT | Extension bundling |
| `eslint` | 9.39.5 | MIT | Static analysis |
| `globals` | 16.5.0 | MIT | ESLint browser and Node global definitions |
| `typescript` | 5.9.3 | Apache-2.0 | JavaScript type checking |
| `@turbowarp/scratchblocks` | 3.6.7 | MIT | Offline Scratch-style block SVG layout |
| `@fontsource/roboto` | 5.3.0 | SIL OFL-1.1 (font) / MIT (package tooling) | Pinned outlined documentation/hero lettering |
| `fontkit` | 2.0.4 | MIT | Deterministic font shaping and glyph paths |
| `jsdom` | 26.1.0 | MIT | Offline SVG document construction and link checks |
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
work. Build and documentation dependencies are development tools; they
are not included in the self-contained production extension JavaScript.

The First-Person Knife Demo includes scenery under CC0 and CC BY 4.0. Its
[asset credits](examples/first-person-knife/ASSET_CREDITS.md) identify each asset,
creator, source, license and modification. The crate by plaggy is **CC BY 4.0**,
despite its source title containing "CC0". The purchased KnifeFPS.glb rig by
RGS_Dev is not distributed; users select their own copy at runtime.
