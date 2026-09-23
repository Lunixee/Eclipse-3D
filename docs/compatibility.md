# Compatibility and API stability

**Eclipse 3D was formerly Turbo3D. Existing Turbo3D projects remain compatible.**

The extension ID is `turbo3d`. Serialized opcodes, existing argument names/defaults, menu IDs/values, block shapes and hidden aliases are preserved. No project migration is needed.

| API v19 inventory | Before local import | Current |
| --- | ---: | ---: |
| Registered executable blocks | 581 | 582 |
| Visible blocks | 559 | 560 |
| Independent visible blocks | 475 | 476 |
| Canonical family blocks | 84 | 84 |
| Hidden compatibility aliases | 22 | 22 |
| Removed / unresolved | 0 | 0 |

The addition is `importModelFile`, **import 3D model file as [MODEL]**. The frozen v16, v18 and v19 fixtures remain unchanged. Labels and separators are not executable blocks. See [full inventory](../BLOCKS.md).

## Host requirements

Use unsandboxed TurboWarp with WebGL 2. The Scratch website, sandboxed extensions and WebGL 1 are unsupported. The default separate-canvas backend uses its own WebGL 2 context and a Scratch bitmap skin. Shared WebGL 2 is an advanced option coupled to private scratch-render hooks; see [backend contracts](../RENDERER_BACKENDS.md).

Compiler targets are Chrome 100, Firefox 100 and Safari 15 syntax. Actual compatibility also depends on the GPU, browser and host wrapper. A wrapper can disable file selection or audio, even when rendering works.

Packager can bake the extension and embedded assets into HTML. Network assets still need network access. Locally selected model files remain runtime inputs; they are not baked into the project. See [model importing](model-import.md) and [loading](getting-started.md).

The separate backend rebuilds its GPU resources after context restoration. The shared backend cannot reconstruct host-owned resources and requires host reinitialization after context loss. Green Flag starts simulation; Pause and Stop freeze it while explicit static edits may redraw. See [lifecycle](concepts.md#lifecycle).

Bundle paths, `Turbo3DExtension`, `extensionURLs.turbo3d`, shader names beginning `t3d_` and internal resource namespaces intentionally retain their compatibility names.
