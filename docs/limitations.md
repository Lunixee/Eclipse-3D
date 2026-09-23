# Limitations and troubleshooting

## Deliberate scope

| Area | Implemented boundary |
| --- | --- |
| Host | Unsandboxed TurboWarp, WebGL 2; no Scratch website or WebGL 1 path |
| Models | glTF 2.0/GLB, TRS/skeletal animation and GPU skinning; morph metadata only; no Draco/Meshopt, imported cameras/lights or arbitrary extension-material families |
| Materials | Unlit/basic-lit/metallic-roughness PBR; TEXCOORD_0; no general depth-sorted transparent instances |
| Lighting | Directional/point/spot, directional shadows, standard-range environments; no point/spot shadows or dynamic probes |
| Effects | Quad sprites, CPU-simulated/GPU-instanced particles, surface quads for decals, raster text; no particle collision/GPU simulation or mesh-projected decals |
| Terrain | Finite heightfield; translation/nonzero scale/yaw; no pitch/roll, caves, streaming or infinite terrain |
| Physics | Translation-only world-axis boxes/spheres; no angular/mesh/CCD dynamics, joints or industrial stacking solver |
| Audio | Buffered positional/global playback; no streaming, reverb/occlusion, buses, doppler or completion hats |
| Post/targets | LDR RGBA8, fused color/vignette/FXAA and downsampled bloom; command-driven targets; no HDR, custom post chain, SSR/SSAO, depth of field or recursive portals |
| Custom GLSL | Contract v1: unlit, unskinned, no engine lighting/IBL/shadow hooks; conservative bounds and undeformed CPU picking |
| Recovery | Separate-canvas resources rebuild after restoration; shared host context remains lost |

These limitations are not hidden by the Eclipse branding. Advanced controls retain their technical wording and contracts.

## Nothing appears

Confirm the extension loaded unsandboxed and WebGL 2 is available. Create/select the scene and camera. Move the camera away from the object, aim it at the object, and choose a valid near/far interval. Check visibility, resource scale, alpha/depth settings and the last error. For a first diagnostic use the [Hello 3D example](../examples/hello-3d/README.md) at default quality.

A dark basic-lit/PBR object needs appropriate light/environment. A transparent image may also be hidden by alpha/depth settings. Render-target textures retain their last commanded image; issue a target-render command after creation or renderer recreation.

## Asset never becomes ready

Read the asset state and error text. URL loads need fetch permission, CORS and reachable dependent files. A local `.gltf` cannot read neighboring files automatically; use a self-contained GLB. Required unsupported extensions, malformed buffers or inconsistent attributes are rejected. Deletion/reset/name reuse can intentionally fence an old completion.

## Animation, particles or physics are frozen

Click Green Flag and confirm the runtime is not paused. A manually clicked palette stack does not authorize simulation. Only the active scene advances. Extra camera/target renders do not advance time again. Also check clip/emitter/tween-specific pause flags; stopping emission and pausing particles have different effects.

## Sound is silent

Confirm an asset is ready, a source exists and its state is playing. `blocked` means the browser requires a gesture: use an explicit unlock and play/resume action. Green Flag does not automatically restart old voices after Stop All. Check volume, listener/source positions and distance/cone settings. Embedded Scratch sounds are preferable for portable examples. Audio output still needs an actual listening check on the target host.

## A resource cannot be deleted

It is probably retained by a consumer. Delete scene instances before shared model assets; clear LOD assignments; release materials, samplers, environments, sources and targets in ownership order. Users/reference reporters help identify shared ownership. Do not repeatedly attempt deletion from a render loop.

## A custom shader fails

Read the diagnostic stage and shader name. Supply bodies with `main`, not a second `#version` or duplicate engine declarations. Keep active uniforms inside the typed schema and supported limits. A sampler needs a retained texture. A custom material cannot be assigned to a skinned draw. See [contract v1](../CUSTOM_RENDERING.md) for declarations, types and reserved names.

## Text differs across machines

Runtime text uses browser/system safe fonts and Unicode fallback. Glyph availability can vary; a fallback difference alone is not evidence of corrupt text. Documentation block SVGs instead use pinned font outlines and do not depend on installed fonts.
