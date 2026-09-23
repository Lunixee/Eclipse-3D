# Renderer backends

| Backend value | scratch-render integration | Main cost | Status |
| --- | --- | --- | --- |
| `shared-webgl2` | Texture from an FBO on scratch-render's WebGL context | Host GL state capture and restoration | Experimental opt-in |
| `separate-canvas` | Separate canvas uploaded through a BitmapSkin | Canvas-to-texture upload after each changed render | Selected default |

`auto` selects `separate-canvas`. Shared mode remains available only when explicitly requested; it throws an extension error when the required scratch-render internals are unavailable.

Both paths require WebGL 2.

## Shared WebGL 2

The shared backend uses `renderer.gl`, renders into an RGBA8 texture with a 16-bit depth renderbuffer, and exposes that texture through a custom scratch-render `Skin`. The stage drawable calls the skin's `getTexture()`, which flushes pending 3D work immediately before scratch-render composites it.

This avoids copying rendered pixels through another canvas. It also means Eclipse 3D and scratch-render mutate the same WebGL state. Before creating, drawing, or destroying its resources, the backend exits any active scratch-render draw region and captures the state it changes. `GLStateGuard` restores the program, vertex array, array buffer, draw/read framebuffers, renderbuffer, active texture and its 2D binding, viewport, scissor box, masks, depth/cull/blend settings, clear values, and the relevant enable flags.

The integration currently requires these scratch-render implementation details:

- a WebGL 2 `renderer.gl`;
- `renderer.exports.Skin`;
- the private `_allSkins` collection;
- the private `_nextSkinId` counter.

Because those private fields are not a stable API, this backend is labelled as a prototype. Compatibility must be retested when scratch-render changes. The state guard covers the state Eclipse 3D currently changes; it is not a general isolation layer for future rendering features.

That controlled check is necessary but not sufficient for automatic selection. It does not contain a full scratch-render scene with sprites, pen, effects, monitors, and bubbles. Shared mode also showed prohibitive guarded timings at 10,000 cubes: 18.6 ms median and 36.2 ms p95, compared with 0.1 ms and 3.8 ms for the separate-canvas prototype in the same serialized harness. For project-level advice, see [performance guidance](PERFORMANCE.md).

The shared render target follows the physical size of scratch-render's canvas. Stage-native dimensions are used for skin size and rotation-center metadata.

## Separate canvas

The default backend creates a detached canvas and requests a WebGL 2 context with alpha and depth enabled, antialiasing disabled, and a high-performance power preference. It renders at the physical dimensions of scratch-render's canvas.

After a changed frame, the backend calls `renderer.updateBitmapSkin()` with the canvas. The canvas is marked non-reusable so TurboWarp's BitmapSkin can upload it directly instead of first converting it to `ImageData`. This path keeps Eclipse 3D's GL state isolated but pays for the bitmap upload into scratch-render's context.

The separate backend flushes pending work during the runtime's `AFTER_EXECUTE` event. `render one 3D frame` can also force a synchronous flush.

## Stage drawable

Both backends create one full-stage drawable, preferring scratch-render's `background` layer and falling back to `sprite`. Its position is `(0, 0)`, scale is 100%, and it is marked noninteractive when the renderer provides that method. Disposal destroys both the drawable and its skin.

The 3D output therefore participates in scratch-render composition instead of being overlaid as an independent DOM canvas.

## Invalidation and resizing

Scene mutations mark the backend pending. The shared backend also marks scratch-render dirty immediately; the separate backend marks it dirty after uploading its changed canvas. A render is skipped when the scene and output size are unchanged.

Both paths match the renderer canvas width and height, not only the logical Scratch stage size. A resize causes render-target or canvas storage to be reallocated before the next frame.

## Choosing a backend

`auto` selects `separate-canvas`, which isolates Eclipse GL state from scratch-render. Its full-frame bitmap upload is a scaling cost. `shared-webgl2` remains an explicit experimental option: it avoids that upload but must preserve the host renderer's GL state. Profile and test the target host before choosing it.
