# Architecture

Eclipse 3D is split into a small public extension layer, an engine/data layer, and interchangeable renderer backends. The production entry point bundles these modules into one browser IIFE.

`TurboWarp runtime events → TurboWarpBridge → Engine`

## Extension and runtime bridge

`src/entry.js` validates that the extension is running unsandboxed, creates the bridge and extension, then registers it with TurboWarp.

`Turbo3DExtension` is the public boundary. It normalizes names, converts block arguments, clamps the values that have defined limits, and translates command failures into `lastError`. Reporters read engine state directly.

`TurboWarpBridge` owns the runtime listeners:

- `AFTER_EXECUTE` advances the shared engine simulation clock only when `projectRunning && !runtimePaused`. A frozen tick may flush pending separate-canvas work, without calling any simulation subsystem.
- `PROJECT_START` authorizes a Green Flag session and resets its time origin, including when already-running threads are replaced. `PROJECT_RUN_START` is deliberately ignored: the VM also emits it for clicked command/reporter stacks, and can omit it during a rapid Green Flag restart.
- `RUNTIME_PAUSED` / `RUNTIME_UNPAUSED` track the TurboWarp pause addon contract, reset the clock origin and physics fractional debt, and hold/resume only audio voices that the runtime pause interrupted. They never authorize a stopped session.
- `PROJECT_STOP_ALL` pauses the shared engine tick, clears tweens under the established Stop All policy, resets profiler samples, and invalidates once so the frozen output may remain displayed.
- `RUNTIME_DISPOSED` stops the session and clears engine project state; `PROJECT_LOADED` leaves the newly loaded project stopped.
- `STAGE_SIZE_CHANGED` invalidates the backend.

The bridge sets both `renderer.dirty` and, when available, calls `runtime.requestRedraw()` so scratch-render asks for a new frame.

## Engine lifecycle

Scene teardown removes pending visibility work and releases consumers before their resources. Model imports record resource ownership before asynchronous image decoding. Cancelled loaders stop after each await; failed text creation and tween replacement leave existing state intact.

`Engine` owns the scene manager, model, geometry, material, environment, light, texture, and render-target stores; render-quality and logical post state; the active renderer backend; profiler; and last command error.

- Initialization creates one backend and is idempotent until disposal.
- Reset clears scenes, model assets, imported geometry, materials, environments, textures, named render targets, post settings, and profiler samples but preserves the allocated backend and stage drawable. Renderer caches and target managers release project resources; backend disposal releases all remaining GPU state.
- Disposal destroys the backend resources, clears scenes, and returns the engine to its uninitialized state.
- Stop All preserves logical scene and GPU resources while preventing model animation, sprite animation, particles, decal lifetimes, physics, audio tracking, profiling, adaptive-resolution sampling, synchronization, and repeated render flushing from advancing. Only a later `PROJECT_START` Green Flag signal resumes without accumulating stopped wall time or autoplaying paused audio; `PROJECT_RUN_START` never authorizes simulation.
- Scene changes are synchronized into the backend before rendering.
- Quality state survives reset. Backend recreation for native antialiasing constructs the replacement before disposing the prior drawable/context, so a failed allocation does not first destroy working output.
- Stage drawable ownership retains the original layer group for destruction, as required by scratch-render. Scene installation restores its order within that group above a newly loaded Stage; later Scratch sprite layers remain above Eclipse 3D. Reordering uses the finite last valid index (exclusive group end minus one): Infinity can cross the next group in the pinned renderer and corrupt target teardown. The renderer-owned pair survives project RUNTIME_DISPOSED while that same renderer survives; target disposal does not invalidate its group. No layer-order polling or per-frame reorder is performed.

Most block mutations update a data version and call `Engine.invalidate()`. The backend then renders on demand. `Engine.tick()` advances active model players and effect state from the monotonic runtime timestamp, caps one update to 100 ms after suspension, and invalidates only when a pose, sprite frame, particle state, or decal lifetime actually changes. Static scenes and paused unchanged animation/effects retain the on-demand path.

## Scene data

`SceneManager` stores named scenes in a `Map` and tracks one active scene. The first created scene becomes active. A scene contains:

- an `ObjectStore` for cubes, cameras, and directional lights;
- a map of cube `InstanceGroup` objects;
- a map of hierarchy-aware `ModelInstance` objects retaining engine model assets;
- texture IDs on cubes and instance groups, referring to the engine texture store;
- one active camera ID;
- a fixed RGBA background value;
- one optional engine-owned scene environment ID;
- a set of engine-owned point/spot light IDs;
- an `EffectStore` containing scene-owned sprite, particle-emitter, and decal instances which retain shared engine texture IDs;
- a version used to detect renderer uploads.

`ObjectStore` uses structure-of-arrays typed storage. Positions, rotations, scales, colors, camera parameters, light intensities, kinds, and liveness are kept in separate typed arrays. A dense ID list makes render traversal proportional to the number of live objects. Deleted IDs are reused, and capacity doubles when necessary.

An `InstanceGroup` packs each cube into 14 floats: position, Euler rotation, scale, RGBA tint, and receive-shadow state. Ordinary cubes and groups store a stable material ID separately. Group mutations notify their scene so the relevant GPU buffers are uploaded again; material uniform changes do not touch that buffer.

Color-instance uploads and shadow invalidation use separate versions. Camera/light-only changes do not repack color instances. Camera movement also leaves a static shadow map valid, while caster transforms, caster visibility/casting state, relevant group data, light transforms, and shadow-camera settings advance the shadow version.

## Model assets and geometry

`ModelStore` separates asynchronous named model assets from scene instances. URL/data-URI sources use TurboWarp's fetch permission path, while local files use a user-selected binary `.glb` or self-contained `.gltf`; external files referenced by a selected local `.gltf` are rejected because the browser cannot safely infer adjacent user files. An asset can be `loading`, `ready`, or `error`. It owns references to every imported geometry, material, and texture, and deletion is refused while an instance retains it.

`GltfParser` reads glTF 2.0 JSON and GLB v2 containers. It handles embedded and relative buffers, accessor offsets/strides/normalization/sparse overrides, unsigned indices, non-indexed triangles, triangle strips/fans, generated normals, tangents, UV0/UV1 accessors, vertex colors, node TRS/matrices, skins/inverse binds, animation samplers/channels, morph metadata, default scenes, PBR/unlit materials, buffer-view/data-URI images, samplers, and `KHR_texture_transform`. Required unsupported extensions are rejected. Material sampling currently uses only `TEXCOORD_0`; a material requesting UV1 is rejected instead of silently sampling the wrong coordinates.

## Animation and GPU skinning

`ModelAsset` owns immutable base node TRS, clip/channel/sampler arrays, skins, inverse bind matrices, morph metadata, meshes, materials, and textures. Animated `ModelInstance` objects own mutable runtime TRS and reusable blend buffers; all instances own lightweight playback state and hierarchy matrices, while skinned instances own palettes. Static assets allocate none of the animation pose/blend arrays. Playing two instances at different times never duplicates source geometry or clip data.

Clips retain stable glTF-order indices, imported or generated names, durations, target-node bindings, and immutable keyframe arrays. Translation, rotation, and scale channels support STEP, LINEAR, and glTF Hermite CUBICSPLINE interpolation; sampled rotations are normalized, and linear/crossfade quaternion paths use the shortest hemisphere. Clip time, speed, looping, pause/finished state, and deterministic two-clip transition state belong to each model instance rather than the shared asset.

Active channels write only their target properties; non-targeted properties retain manual runtime values. Changing clips resets formerly targeted properties to the imported base pose. During a crossfade, a missing property on either clip samples the imported base value. `stop` preserves the current pose, `pause` preserves and freezes it, and `reset pose` stops playback and restores all imported node transforms.

The matrix convention is column-major. For a skinned mesh node, the CPU palette entry is `inverse(instanceRoot * meshNodeWorld) * (instanceRoot * jointWorld) * inverseBindMatrix`. The vertex shader then applies the palette in mesh-local space followed by the ordinary model-instance matrix. The shared instance root cancels inside the palette, so root movement does not require a palette upload; mesh-node and joint pose changes do. Normals use an inverse-transpose skin linear transform with a finite degenerate fallback, while tangents use the skin linear transform and both are normalized after the model transform.

Each distinct `(mesh node, skin)` pose owns a reusable 4×joint-count `RGBA32F` nearest-filtered palette texture. Multiple primitives on that node share it. A texture is allocated once per renderer backend and updated only when its palette version changes. The practical joint limit is the device's `MAX_TEXTURE_SIZE`; no shader is compiled per joint count. Static shaders do not declare, bind, or sample palettes.

`JOINTS_0` accepts legal glTF unsigned joint-component types, while `WEIGHTS_0` accepts floating-point or normalized integer values. Four weights are normalized during import; a zero-sum tuple safely becomes `[1,0,0,0]`. Missing inverse-bind matrices use the glTF identity default. Eight-weight `JOINTS_1`/`WEIGHTS_1` meshes are rejected rather than silently losing influences. Morph target accessors, default weights, and animation-channel metadata are retained as groundwork, but vertex morph deformation is not rendered.

Independent skinned poses are submitted as one draw per primitive. They still share geometry, materials, textures, programs, and clip data. This deliberately leaves room for a later palette-atlas/shared-pose instancing optimization without making unrelated instances share a pose.

`ModelInstance` keeps root TRS, mutable node-local matrices, derived world matrices, primitive render items, bounds, material overrides, and cast/receive flags. Root changes update the hierarchy without dirtying mesh-local palettes. Animation and node edits update only dirty nodes and their descendants. Skinned bounds are conservatively expanded once from skeleton reach and clip translation/scale envelopes, avoiding per-frame CPU skinning. Scene deletion releases the asset reference. Root transforms use the existing resource transform blocks; the initial node block sets one node's local translation.

Renderer recreation discards backend-owned geometry, VAOs, programs, textures, and palette textures without discarding CPU asset or per-instance animation state. The next render lazily recreates required resources and uploads the current dirty palette once.

## Local-light resources and selection

`LightStore` owns named point and spot lights. Scenes retain their IDs, and scene reset/disposal deletes the lights they own. A light stores world position, linear color, bounded non-photometric intensity, finite range, enabled state, and a monotonic data revision. Spot lights add a normalized direction and validated inner/outer half-cone angles. A zero direction is rejected instead of allowing NaNs into shader state. The representation does not allocate a GPU object per light and leaves room for later shadow or layer metadata.

Selection is cached by renderable bounds, light-store revision, and limit. Stable selected identities preserve the existing instance buffer and draw grouping; selected data changes update packed uniforms without repacking transforms. Large instance groups are considered in 256-instance spatial ranges so distant parts can receive different lights. Adjacent ranges with the same material and selected IDs merge back into one instanced draw. This is a forward-rendering compromise, not clustered lighting or per-instance light lists.

## Texture resources

`TextureStore` owns named texture resources for the entire engine. A resource contains sampling settings, a UV transform, load state, error state, and a reference to decoded source data. Generated textures are ready immediately. URL, data-URI, costume, and selected-file sources load asynchronously.

Decoded sources are cached by stable source key. Loading the same URL or costume asset under more than one texture name reuses the decoded pixels. Scene objects retain texture IDs explicitly; deleting an object releases one reference, while deleting an in-use texture is rejected. Reset and disposal release every CPU-side source, close `ImageBitmap` objects where supported, and abort loads whose final resource was deleted.

Each renderer context has its own `TextureCache`. It creates at most one `WebGLTexture` per named texture resource, uploads raw RGBA8 pixels only when decoded data or flip-Y changes, and deletes stale GPU resources after engine-side disposal. Filtering, wrapping, mipmaps, and anisotropy remain texture-object state. Color-space interpretation moved into material shaders: base/emissive roles can decode sRGB while data roles read the same GPU object linearly. This permits one texture to fill color and data roles without duplicate uploads. Pixel-store state is restored immediately after upload so experimental shared-context rendering does not leak it.

## Material resources

`MaterialStore` owns stable named materials across scenes. Scene resources retain material IDs; materials retain every assigned texture role, so deleting one object cannot dispose a map used by another. Assigning one texture to several roles increments explicit role ownership but still resolves to one decoded source and one renderer-local GPU object. The built-in `default` basic-lit material preserves previous API behavior. The older per-resource texture block resolves to a cached hidden basic-lit material per texture.

`unlit` and `basic-lit` retain their compact original shaders. The `pbr` family adds metallic/roughness factors and base-color, normal, metallic, roughness, packed metallic-roughness, emissive, and AO maps. The packed layout matches glTF (`G=roughness`, `B=metallic`); assigning that resource to AO also reads `R`, allowing ORM reuse. PBR uses GGX/Trowbridge-Reitz distribution, Smith visibility, Schlick Fresnel, energy-conscious diffuse/specular balance, one directional light, the existing directional shadow, and scene ambient color/intensity. Public color-picker values are converted from sRGB into the linear factors stored by PBR materials and lights; per-resource tint is decoded in the PBR shader. AO modulates ambient only. Imported tangents drive normal mapping when present; geometry without tangents retains the scale-relative derivative fallback. Imported `BLEND` materials use alpha blending with depth writes disabled, but the first implementation does not sort blended primitives or instances back-to-front.

Unlit ignores point/spot lights. Basic-lit and PBR append one fixed `local` feature key only when a selected list is non-empty; exact count, identity, transform, color, intensity, range, and cone values are uniforms and never shader keys. Basic-lit uses inexpensive diffuse local lighting, while PBR sends local radiance through the existing GGX BRDF. The zero-local-light keys and shader sources remain the paths.

## Environment resources and IBL

`EnvironmentStore` owns named environments independently of materials. An environment retains one existing `TextureStore` resource or owns a hidden one-pixel generated texture for solid color. Scenes retain the selected environment, active-resource deletion is rejected, source replacement transfers texture ownership, and scene/reset disposal releases references in dependency order. URL, data URI, costume, and selected-file environments therefore use the established texture loaders rather than another decoder. Current inputs are RGBA8 standard-range images; floating-point HDR decode is intentionally not claimed yet.

PBR uses the prefiltered maps with an analytic split-sum BRDF approximation, avoiding a separate BRDF LUT resource. Roughness selects a specular mip while metallic/dielectric Fresnel remains in the existing shader. AO modulates the indirect contribution only; direct directional light, shadows, and emissive remain independent. Rotation is a world-Y sampling transform, so it changes both lighting and the optional sky without preprocessing or shader recompilation. A sky is one separate fullscreen draw and is disabled independently by default.

## Render-quality state

`RenderQualitySettings` is the engine-owned source of truth for resolution scale, pixel-ratio cap, antialias mode, render distance, texture limits, shadow preset, environment preprocessing limits, and adaptive-resolution configuration. Presets are ordinary setting bundles. Individual controls mark the aggregate preset `custom`; the settings remain readable and can be extended by later subsystems without adding renderer-specific state to Scratch blocks.

Both backends derive their internal width and height from the logical stage size, host drawing-buffer ratio, configured cap, and scale. Scratch stage coordinates and drawable size do not change. The separate canvas reallocates its drawing buffer only when the calculated size changes. The shared backend resizes its existing color/depth target storage. Native antialiasing is a WebGL context attribute, so changing it recreates only the separate backend; the shared single-sample render target rejects the unsupported mode.

Texture quality is a sampling cap at `TextureCache`: `potato` disables mipmap use and limits anisotropy to one; low/medium/high/ultra allow mipmaps and cap anisotropy at 2/4/8/16. Existing per-texture choices remain intact. A global change reapplies texture parameters but does not upload decoded pixels again.

Environment quality centrally selects diffuse/prefilter resolutions and fixed preprocessing sample counts. It changes approximation cost and storage, not material roughness or intensity. Reprocessing is lazy and occurs once the active environment is next needed.

Adaptive resolution consumes runtime frame intervals only when enabled. Consecutive samples outside a fixed hysteresis band must persist before it changes scale in five-point steps. It does not toggle shadows, textures, or antialiasing, and its disabled path performs no sampling work beyond the profiler's existing interval.

Render quality also caps selected local lights per draw: 2/4/6/8/8 for potato/low/medium/high/ultra. Custom values are clamped to 0–8. This changes computational budget rather than light color or intensity.

## Render path

The vertex shader applies scale and XYZ Euler rotation per instance and preserves normal orientation under negative scale. Unlit/basic-lit follow their previous paths; PBR evaluates its direct BRDF, environment-or-ambient indirect term, emissive, maps, and optional shared directional shadow. Opaque/cutout output remains compatible with scratch-render composition.

The current renderer reports zero material draws for an empty scene; an enabled environment background adds one fullscreen draw. Thousands of compatible instances sharing geometry, material, and local-light IDs remain one draw. Different geometry or materials require distinct draws but can share programs and GPU maps. The deliberate binding layout uses seven material roles, one shadow map, one diffuse environment map, and one prefiltered map: ten fragment units against WebGL 2's guaranteed minimum of sixteen. Duplicate material-role IDs share one unit and bind.

## Performance decisions already in use

- Typed arrays keep hot scene data compact and avoid per-object JavaScript records.
- Dense live IDs avoid scanning deleted capacity.
- Instance storage and matrices are reused between frames.
- Scene versioning avoids repacking and re-uploading unchanged instance data.
- Canonical geometry buffers are uploaded lazily once per backend; resources sharing geometry, material, and selected lights share an instanced draw call.
- Material variants compile once per backend. Compatible materials reuse programs, and uniform-only edits avoid instance uploads and recompilation.
- Texture source versions prevent unchanged pixel data from being uploaded again.
- Static output is rendered on invalidation rather than continuously.
- Static directional maps are reused independently of color-camera changes.
- Quality changes are versioned and allocate no per-frame setting objects in renderer hot loops.
- Environment preprocessing is cached by source and quality; intensity/rotation remain uniform-only, and unlit/basic-lit-only scenes allocate no environment GPU path unless the sky is visible.
- Point/spot selection is bounded and cached; the zero-light path keeps the prior shaders, and unchanged packed lists skip GPU uniform uploads.
- Effect geometry is one lazy immutable quad. Camera-facing bases come from shared uniforms in the vertex shader, and compatible sprites, decals, and particles share compact 24-float instance records and instanced draws.

These choices cover cubes and static imported meshes. Dynamic mesh streaming remains a separate future design.

## Boundaries and unfinished areas

The engine supports static and skeletally animated glTF/GLB mesh hierarchies, point and spot direct lighting, one standard-range environment, bounds-based frustum/render-distance culling, loose spatial grids, static-model LOD, billboards, typed-array particles, oriented-quad decals, and the translation-only box/sphere gameplay physics described below. It does not support eight-weight skinning, rendered morph targets, arbitrary animation graphs, additive skeletal layers, IK, retargeting, Draco/Meshopt, imported glTF cameras/lights, effect shadow casting/receiving, point/spot shadows, light layers, clustered/tiled lighting, floating-point HDR decode, reflection probes, occlusion culling, global/per-particle transparent sorting, GPU particle simulation, particle collision, projected decals, capsules, angular rigid-body dynamics, joints, mesh collision, CCD, or serialization. Cascaded, point, and spot shadows remain later techniques.

Backend integration details and risks are documented in [RENDERER_BACKENDS.md](RENDERER_BACKENDS.md).

## visibility, bounds, and LOD

adds a CPU visibility layer without replacing the renderer or its resource caches. `GeometryStore` computes one immutable local AABB and bounding sphere from each position stream. Imported primitives also retain per-joint influence AABBs and morph POSITION-delta bounds when those attributes exist. The built-in cube uses the same generic geometry-bound contract.

`ModelInstance` owns mutable world bounds; assets never do. Static primitive bounds are transformed with center/extents math using the absolute 3×3 matrix terms, so rotation and uniform, non-uniform, or negative scale remain conservative without transforming vertices. Node/world matrix dirtiness drives bound updates. A model aggregate is the union of its active primitive bounds.

For a skinned primitive, import groups bind-space vertices into conservative per-joint boxes according to positive `WEIGHTS_0` influences. When a palette changes, the instance transforms those boxes by `meshWorld * palette[joint]` and unions them. Because the palette already contains `inverse(meshWorld) * jointWorld * inverseBind`, this recovers `jointWorld * inverseBind` in world space. A multiply influenced vertex is included under each relevant joint, which is conservative. Cost scales with active joints, not vertex count; paused unchanged poses skip palette, hierarchy, and bound work.

The broad phase is a 32-world-unit loose uniform grid. Entries spanning at most 64 cells are linked into those cells; larger entries use an oversized fallback set and cannot be lost. Transform/visibility changes update only the affected entries, including a single member of an instance group. Same-cell movement reuses its cell-key list. Camera/projection movement changes only the query. Below 128 visible logical entries, the system uses a direct linear scan to avoid grid-query overhead. Candidate and output arrays, planes, bounds, and transform scratch buffers are reused.

Directional shadows have their own light-view frustum and visibility stamp. Camera culling never directly removes a caster. An off-camera object inside the light orthographic volume remains eligible; an object definitely outside that volume is rejected before shadow batching/upload. Camera-only motion does not increment `shadowRenderVersion`, so a cached shadow map remains reusable. Caster transform, animated pose, visibility, cutout state, or LOD geometry still invalidates when relevant.

`LodStore` owns named, reference-counted groups of one to sixteen already-loaded static unskinned `ModelAsset` levels. Threshold zero is mandatory for level 1 and later distance thresholds must be finite, non-negative, unique, and strictly increasing. The assigned instance's base asset must equal level 1. Selection is per instance from root-to-camera distance; the default one-unit hysteresis is applied on both directions. A force override selects a one-based level, `auto` restores distance selection, and disabling LOD selects the base level.

Lower-detail `ModelInstance` views are created lazily once per level and cached by asset ID. They reuse immutable geometry/material/texture resources and only mirror the outer instance's root transform; outer visibility, color, material override, and shadow flags remain authoritative. Switching levels invalidates instance/shadow data but does not parse assets, upload resident geometry again, or change compatible batching. Arbitrary skinned asset swapping is rejected because skeleton/node/skin compatibility is not yet modeled; animated models still use the full visibility/spatial system.

Renderer disposal does not destroy scene bounds, index, or LOD state. A replacement renderer lazily recreates only its GPU caches. Scene/project disposal removes visibility entries, releases LOD references, clears the grid, and then releases assets in dependency order.

## effects architecture

`EffectStore` owns three scene-resource kinds: sprites, particle emitters, and surface decals. Each resource owns only mutable presentation/simulation state and retains an existing engine texture; decoded image data and renderer-local texture objects remain in the established texture system. Names participate in the scene resource namespace, deletion releases the texture reference and spatial entry, and scene disposal clears every effect deterministically. CPU state survives renderer replacement while renderer-owned buffers, VAOs, programs, textures, and the quad upload are recreated lazily.

Full billboards derive a stable position-facing basis in the vertex shader. Y-axis billboards discard vertical camera displacement and keep world Y upright, with camera-basis fallbacks for coincident X/Z positions. Screen-aligned sprites use the camera's right/up basis, including roll; fixed sprites use their stored plane basis. Per-instance roll rotates only the final plane. World-space pivot is applied to the canonical quad in the shader: normalized `[0,0]` anchors its bottom-left, `[0.5,0.5]` its center, and `[1,1]` its top-right. Size remains in world units and therefore projects with perspective. Size, anchor, frame, tint, opacity, and brightness changes never recreate geometry or materials. Camera-only orientation changes are uniform work: opaque/cutout effect fields retain instance data, geometry, and spatial membership. Transparent visible fields may repack to preserve practical back-to-front order.

Atlas state is columns, rows, and a zero-based internal frame; public blocks use one-based frames. Sprite frame playback stores time/range/rate/loop flags directly on the instance and selects `floor(elapsedSeconds × FPS)` within its range. Equivalent elapsed time split across effect ticks produces the same frame; each engine effect tick retains the shared 100 ms suspension cap. Non-looping playback holds the last frame and stops after its range duration. A manual frame change is visible immediately without silently stopping or seeking an active animation, whose existing clock selects the frame again on the next timed update. Directional sprites retain a four- or eight-entry frame map and choose a deterministic angular sector from camera position around world Y. Shared textures/sheet dimensions remain reusable while independently animated/directional instances own only their current frame state.

Opaque and cutout effects default to depth test/write; blended and additive effects default to depth test without writes. Cutout samples the configured alpha threshold. Blended sprites/decals sort back-to-front inside compatible batches using reusable batch/item storage. Particle emitters sort by emitter center and preserve their dense particle order; this intentionally favors batching and is not strict per-particle or global order-independent transparency. Lit effects use a small diffuse shader with scene ambient, directional light, and the same bounded deterministic point/spot selection. Unlit effects have no IBL or local-light dependency. effects neither cast nor sample directional shadows; requesting casting/receiving is rejected rather than producing an opaque rectangular silhouette.

`ParticleEmitter` extends the shared visual style/state but stores hot particles in structure-of-arrays `Float32Array`s with one dense active prefix. Expiration uses swap removal; capacity changes copy only the retained prefix. A seeded xorshift generator drives point, box, and sphere spawn positions, velocity spread, lifetime, starting rotation, and angular velocity. A fractional accumulator converts particles/second into stable time-based emission. One tick clamps elapsed time to 100 ms and uses semi-implicit Euler: velocity changes by acceleration times the delta, position then changes by the updated velocity times the delta, and rotation changes by angular velocity times the delta. Particles expire before packing when `age >= lifetime`. Size, color, alpha, and atlas frame interpolate from clamped normalized age while packing the instance buffer; color alpha and the separate alpha-over-life curve multiply. Spawn/expiry/simulation metrics require no particle-object allocation.

Emitter visibility is one conservative bound covering spawn extent, maximum lifetime travel under velocity/spread/acceleration, and maximum particle size. Changing those configuration values updates one spatial entry; simulating particles does not rebuild bounds or upload geometry. An off-camera emitter continues simulation but writes no GPU instances. A paused unchanged emitter returns before simulation and leaves its cached instance data resident. Compatible emitters can share one texture/program/batch/draw even though their CPU state and random streams remain independent.

Decals are oriented surface quads, not deferred volume/projected decals. A normalized supplied normal deterministically produces an orthogonal right/up basis; a small surface offset and polygon offset reduce coplanar fighting. Position, size, pivot, tint, alpha/depth state, and optional lifetime reuse the same effect path. They do not raycast, clip to receiver geometry, wrap around edges, or conform to curved surfaces.

## render targets and post-processing

`PostProcessingSettings` and `RenderTargetStore` are logical engine state. They contain no WebGL handles and therefore survive backend recreation. A named target also creates an external `TextureResource`; materials, sprites, decals, and future shaders use its ordinary texture ID and ownership rules. `TextureCache` asks the active backend's target manager for the current GPU handle instead of uploading pixels, generating mipmaps, or reading the result to the CPU. Deleting a target in use is rejected exactly like deleting any referenced texture.

Named targets are command-driven and double-buffered. Rendering writes the back target while every sampler resolves the front/previous completed texture, then swaps only after a successful render. This prevents same-target framebuffer feedback and gives recursive/self-monitor content a deterministic one-frame-delayed source. The first front texture and every resized attachment are cleared to transparent black. Clear affects both sides. Named targets stay GPU-resident; production render-to-texture and post-processing never call `readPixels`.

The main post chain is engine ordered:

```text
existing scene renderer -> RGBA8 scene color + depth
                        -> optional brightness extraction/downsample
                        -> persistent separable-blur bloom levels
                        -> fused bloom/color/vignette/optional-FXAA presentation
```

Brightness, contrast, saturation, vignette, bloom composite, and final presentation share one final fullscreen draw. Bloom uses one color/scratch pair at each of one to four downsampled levels; those pairs are the reusable ping-pong pool. Programs and one empty fullscreen-triangle VAO are created lazily and cached. A scalar parameter update changes uniforms only. Bloom quality or viewport size may resize/allocate levels; unchanged dimensions reuse storage. Neutral color/vignette settings and disabled bloom/FXAA are skipped. `post processing on` with all-neutral controls still uses the direct path.

The separate-canvas direct path retains its existing canvas MSAA. When active post moves the scene offscreen and native antialiasing was requested, `RenderTarget` uses persistent WebGL2 multisample color/depth renderbuffers and blits color into the sampled RGBA8 texture; it does not recreate them per frame. The shared backend remains non-MSAA by contract. FXAA is an optional lightweight final alternative, not a claim that canvas MSAA automatically applies to a single-sample framebuffer.

The shared fullscreen primitive is the oversized clip-space triangle `(-1,-1)`, `(3,-1)`, `(-1,3)` with corresponding UVs `(0,0)`, `(2,0)`, `(0,2)`. The mapping covers exactly `0..1` across the visible viewport.

Post settings and post-only intermediate resizing do not participate in the directional-shadow cache key. Once the shadow is warm, brightness, contrast, saturation, vignette intensity/radius/softness, bloom intensity/threshold, FXAA, and post-intermediate resize each produce zero shadow updates. A real caster transform change still advances the scene/shadow version and updates the map. Renderer restart discards physical render targets, target-resolved texture handles, multisample storage, post programs, and the fullscreen VAO while preserving logical post settings and named-target definitions; the next use recreates them lazily and subsequent unchanged frames reuse them.

Logical teardown follows reference direction. Scenes/effects/terrains and model/environment/material stores release every consumer first; only then does `RenderTargetStore` delete its external texture resources, followed by the remaining texture store. This matters when a user-created named material samples a target: removing its scene object reduces the material's own use count, while disposing the named material releases its texture slot. The target deletion guard remains strict and succeeds only after that final reference reaches zero. Reset and disposal release resources in this order. The initialized engine retains its default material and built-in cube geometry.

## game utilities, terrain, and text

Gameplay services share the scene renderer. `Scene` owns one `CameraMathCache` per camera, one `Raycaster`, one `TweenStore`, one `TerrainStore`, and one `TextStore`. None creates an alternate render loop. Engine reset and scene disposal clear their logical resources in dependency order; renderer replacement discards only renderer-owned GPU objects, so retained terrain geometry and text pixels recreate through the existing caches.

Camera caches key view/projection/inverse-view-projection work by camera transform/projection version and aspect ratio. Stage projection and unprojection receive the logical Scratch stage width and height; DPR, render scale, post targets, and output framebuffer dimensions do not enter the coordinate contract. Cached right/up/forward vectors drive local movement and camera-forward rays. Look-at handles vertical directions with a stable fallback and treats a coincident target as a no-op. Camera changes invalidate visibility queries as before but never rebuild the loose spatial grid or touch geometry/program resources.

`Raycaster.cast` is synchronous and query-on-demand. It asks `VisibilitySystem` for conservative candidates; large scenes traverse `LooseSpatialGrid` cells with reusable 3D-DDA storage, while small scenes retain the direct scan. Bounds reject work before narrow phase. Cubes and grouped cube instances use local-space slabs. Static model and terrain primitives use indexed or non-indexed triangle tests through a lazily built geometry BVH held in a `WeakMap`, so every instance of one immutable geometry shares acceleration. Skinned primitives use their current conservative world bounds and label the result `bounds`; they do not test deformed triangles. Sprite and text effects use their resolved billboard plane and world rectangle. The reusable last-hit record exposes world position/normal, distance, resource/node/primitive/triangle/geometry/material identity, kind, and precision. Ray queries do not call the renderer, read GPU pixels, upload data, compile shaders, or rebuild spatial state.

`TweenStore` keys pooled records by resource and property. Starting another tween for the same pair replaces it from the current value. Position, scale, shortest-path Euler rotation, and camera FOV share linear/ease-in/ease-out/ease-in-out/smoothstep interpolation. Only `Engine.tick` calls `Scene.updateTweens`; render and render-to-target calls never do. Each tick clamps elapsed input to the established 0.1-second suspension cap, matching animation/effect timing rather than promising arbitrary long-delta partition invariance. Paused records perform no update, zero-duration work applies immediately, and stop-all clears records without changing the renderer lifecycle.

`TerrainStore` creates one `Terrain`/`ModelInstance` facade per finite heightfield. Its initial interleaved vertices and immutable indices enter `GeometryStore`; the resource is marked dynamic so first and changed vertex allocations use `DYNAMIC_DRAW`, while the VAO-owned element buffer remains immutable `STATIC_DRAW`. Grid edits only mark a terrain dirty. One sync rewrites Y positions/normals into retained typed arrays, increments the geometry version once, updates conservative bounds/spatial state, and causes one renderer buffer update on next visible use. An unchanged sync is O(1) store work and zero upload. Height/normal queries map world X/Z through translation, yaw, and scale and interpolate the exact triangle split used by the index buffer. Each terrain is independently cullable but is not internally streamed or chunked. Renderer restart preserves the logical terrain and geometry ID/state while deleting old WebGL buffers; the next visible use creates new buffers once and the following unchanged frame uploads nothing.

The profiler merges per-update ray and tween metrics with terrain/text render metrics. Raycasts, candidates, bounds/triangle/exact hits and CPU time; active/updated/completed tweens and CPU time; terrain counts/triangles/build/upload bytes/visibility; and text labels/rasterizations/uploads/shared textures/instances/draws remain separate structural counters. Unused services perform no ray, tween, terrain, text rasterization or upload work.

## custom rendering

`CustomShaderStore` owns immutable project GLSL/schema definitions; `MaterialStore` custom materials retain them and own typed values plus TextureStore sampler references. `MaterialProgramCache` lazily delegates custom identities to one `CustomProgramCache` per renderer. Identity includes normalized source, schema and contract version but excludes values, so equivalent named definitions share a program and ordinary value changes only bind the affected active fields. Compilation/link/reflection errors are stage-labelled and cached. Renderer replacement deletes physical programs and lazily compiles from retained definitions; reset releases scene/model/material/sampler consumers before targets/textures and sweeps disposed programs, buffers and VAOs.

## gameplay physics and Web Audio

`Scene.ensurePhysics()` is the only creation boundary for the optional `PhysicsWorld`. Named records contain one world-axis box or sphere plus translation, velocity, body type, inverse mass, response/filter settings, attachment metadata, and retained contact pairs. The collision loose grid is separate from visibility and updates dirty bodies only. Fixed 1/60-second substeps run from `Engine.tick` after existing simulation systems; extra renders never step it. Static/kinematic/dynamic response is translation-only, contacts are capacity-bounded and pooled, and low-speed supported dynamics sleep without ongoing integration/broad-phase work.

Cube/model-root attachments are non-owning names resolved through `Scene`. Root callbacks dirty only attached consumers; physics writeback uses ordinary position setters and suppresses its own callback feedback. Deleting an object removes its body and stops/detaches audio at the last transform. Deleting a body/source preserves the object. Renderer recreation is irrelevant to logical physics state.

`Engine.ensureAudio()` lazily creates one `AudioSystem`, which in turn creates a native context only when byte decoding, play, or explicit unlock requires one. Packager/Desktop Scratch sounds resolve through the target sound bank and reuse Scratch's existing decoded buffer; retained embedded bytes remain a fallback for editor-like hosts. Asset names retain identity-keyed shared buffer entries; scene stores retain assets and own persistent gain/panner nodes plus ephemeral buffer voices. Changed-only engine ticks propagate attached transforms and the active-camera listener after physics. Stop All pauses voices and clears physics fractional debt; only `PROJECT_START` authorizes a fresh Green Flag session, without audio autoplay. Runtime pause captures voice offsets and resume restores only those voices; explicit source pause/stop/deletion or scene switch cancels that restoration. Reset and run generations fence obsolete asynchronous command diagnostics and pending file-picker continuations. Scene switches pause the old store, reset releases scene consumers/assets/cache while retaining an existing context, and final engine disposal closes it.
