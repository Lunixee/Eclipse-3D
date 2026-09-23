# Eclipse 3D

Eclipse 3D is a WebGL 2 scene engine for TurboWarp. It provides cameras, shared models and materials, skeletal animation, lights and shadows, particles, picking, gameplay physics, audio, and render targets through Scratch blocks.

## Load the extension

To add Eclipse 3D to a project in TurboWarp Desktop or the TurboWarp web editor, use **Add Extension → Custom Extension → File** to open `dist/turbo3d.js` and enable unsandboxed execution. A minified bundle is also included. Eclipse 3D requires WebGL 2 and does not run on the Scratch website.

To try an example, open a project from [examples](examples/index.md), approve its embedded extension, and click Green Flag. You do not need to load the extension separately for these projects. [First-Person Knife](examples/first-person-knife/README.md) is playable without a rig; owners can press I to load their separately purchased KnifeFPS.glb. The paid asset is not included.

## Build from source

Install Node.js 22 or newer, then run:

~~~sh
npm ci
npm run build
npm run build:min
npm run docs
npm run examples
~~~

For development, `npm run dev` serves this directory at http://localhost:8000. Load http://localhost:8000/dist/turbo3d.js as a custom extension URL. This local server is optional for the included SB3 examples.

## Guides

- [First scene and loading](docs/getting-started.md)
- [Coordinates, resource ownership and lifecycle](docs/concepts.md)
- [Local GLB/glTF importing](docs/model-import.md)
- [Block reference](docs/reference/index.md) and [workflows](docs/workflows.md)
- [Performance](docs/performance.md), [limitations and troubleshooting](docs/limitations.md)
- [Compatibility](docs/compatibility.md), [architecture](ARCHITECTURE.md), [custom GLSL](CUSTOM_RENDERING.md), [physics and audio](PHYSICS_AUDIO.md)

## Validation

~~~sh
npm run lint
npm run typecheck
node scripts/block-inventory.mjs
npm run docs:check
npm run examples:check
npm run knife:check
~~~

Rebuild the extension and regenerate examples after a source edit. See [generation instructions](docs/generation.md) for reproducible docs and optional Packager HTML exports. `npm run website` assembles the publishing files under `artifacts/website/`; it does not deploy them.

The [source layout](ARCHITECTURE.md) keeps the engine, tools, docs and examples under one root. No Git checkout is required to build.

Eclipse 3D was formerly Turbo3D. API v19 retains every existing opcode, argument and menu. The extension ID `turbo3d`, shader prefix `t3d_` and bundle filenames remain compatible. The local importer adds one block; see the [inventory](BLOCKS.md).

MIT licensed. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_LICENSES.md).

Palette links are configured in `src/extension/publicLinks.js`. Set the documentation, website and hosted example SB3 URLs before a release build; unset buttons show a short configuration message.
