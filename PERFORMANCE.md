# Performance notes

Use the [project performance guide](docs/performance.md) to choose settings. This document describes allocation, batching and cache behavior for engine contributors.

## Render-quality cost model

Internal pixel count is approximately `stage width × stage height × effective DPR² × scale²`. A 50% scale shades one quarter as many color pixels as 100%; 75% shades about 56%. Fixed scene traversal, instance upload, texture upload, and shadow-map work do not scale with color resolution, so frame time will not always follow pixel count.

The maximum pixel-ratio control caps the host drawing-buffer ratio before resolution scale. It never changes logical Scratch coordinates or stage aspect. A size change reallocates the separate canvas drawing buffer or shared render-target storage once; unchanged settings add no per-frame allocation.

Native antialiasing is available only on `separate-canvas` and requires backend recreation because WebGL context attributes are immutable. Presets leave it off. The `shared-webgl2` target is single-sample and rejects `native` instead of exposing a control it cannot implement.

Render distance reduces color instances and vertex/fragment work, but currently scans cube centers and model bounds and repacks the instance buffer when the active camera moves. It is useful for large, spread-out scenes and can cost more in a small dense scene. Zero keeps the unlimited fast path. Shadow maps retain their own caster volume and invalidation.

Texture quality changes only global mipmap use and an anisotropy cap. It reapplies sampler parameters on resident textures without decoding or uploading base pixels again. It does not destructively rescale source images.

Adaptive resolution is off by default. When enabled, 30 consecutive overloaded intervals lower scale by five points; 60 consecutive headroom intervals raise it by five. A 15% overload and 18% headroom band prevents oscillation around the target. It does not respond to an isolated spike or change shadow, texture, or antialias settings.

## Known costs

The separate backend avoids host-state queries and accidental state leakage. On each changed frame it renders to its own canvas and calls `updateBitmapSkin`, which uploads that canvas into scratch-render. That path may dominate at large stage resolutions even when geometry rendering is cheap.

The current instance upload has several deliberate prototype limitations:

- Any instance-version change repacks affected standalone cubes, groups, and model render items into one staging buffer.
- The whole active range is sent with `gl.bufferData`; there are no partial updates or persistent GPU ranges.
- Imported models use frustum/spatial culling and static unskinned asset LOD. Occlusion culling, arbitrary skinned asset LOD, and dynamic geometry streaming are not implemented.
- The state guard has not been minimized against a measured scratch-render contract.

Materials add a draw call when their uniform/state values differ, even if they share a shader program. Objects sharing one material remain in one batch. Materials sharing a named texture reuse one GPU upload. Different texture names may share decoded source data but retain independent GPU texture objects so filtering, wrapping, mipmaps, and flip-Y cannot interfere. Color-space interpretation is shader-role state and does not duplicate raw RGBA8 storage.

## Material cost model

Legacy program keys contain type (`unlit`/`basic-lit`), base-texture presence, and alpha mode. PBR keys contain only normal-map presence and alpha mode. Metallic, roughness, colors, intensities, texture IDs, and all other map-presence flags are uniforms, so numeric edits and same-role replacements do not compile programs. Double-sided and depth controls remain fixed-function state.

`unlit` omits lighting/shadow sampling and `basic-lit` retains ambient-plus-Lambert, so neither pays for PBR. PBR evaluates GGX/Smith/Schlick direct light plus optional maps, indirect AO, emissive, the existing shadow lookup, and an environment branch when active. Seven material roles, one shadow map, and two filtered environment maps use ten fragment texture units against WebGL 2's guaranteed minimum of sixteen. Assigning one texture to several material roles reuses one unit/bind and one upload. Cutout adds discard and keeps its compact non-PBR shadow-depth path.

Groups are sorted only when instance/material assignment data is repacked. The sort clusters program, culling/depth state, texture, then material ID to reduce switches without allocating per frame. A single shared material over 10,000 instances remains one color draw. Many distinct materials necessarily produce many draws because their uniforms differ, although they can still share cached programs and textures.

Material programs persist across engine reset and are released only with the renderer backend/context. A loading screen can prepare a requested material's current variant; this does not blindly compile unused combinations or upload its maps. Backend recreation still requires recreation/warmup. The PBR benchmark reports warmup separately from the first completed draw and checks for zero color-shader compiles after warmup.

URL and costume decoding runs asynchronously. File and network failures update resource state without entering the render hot path. Uploads do not use `readPixels`, and generated or decoded pixels are not copied again on unchanged frames.

These are profiling targets, not reasons to add complexity before the browser numbers exist.

## Static-model cost model

Parsing and image decoding are asynchronous CPU/setup work. glTF accessor conversion, strip/fan triangulation, missing-normal generation, hierarchy validation, material construction, and texture decode occur once per named asset rather than once per instance. Model instances retain that asset and store only root/node transforms, derived matrices, bounds, and small render-item references.

Repeated compatible model instances batch by geometry, material, and selected local-light identity. Multiple primitives or materials necessarily add draws; spatially different light selections can also split a group, as with cube instances. Imported transforms are precomposed on the CPU into the existing matrix-instance stream so the vertex shader does not evaluate a node hierarchy or trigonometric Euler transform per vertex.

The parser supports glTF skins, animation channels, inverse binds, and morph metadata while rejecting unsupported required extensions, compressed geometry, eight-weight skinning, and material UV1 selection. Morph metadata is retained but morph deformation is not rendered. These explicit boundaries avoid hidden fallback work or incorrect output. Basic `BLEND` submission is available for imported materials, but it is not sorted back-to-front and blended primitives do not cast directional shadows; projects requiring correct complex transparency should keep that limitation in mind.

## Animation and skinning cost model

Static models retain the shader, vertex layout, palette-free VAO, and compatible instanced batching. They allocate no animation pose/blend buffers, skin buffers, or joint palettes and perform no animation sampling or hierarchy update on ticks.

Active animation CPU cost scales with sampled channels, affected node hierarchies, and joints. Sampler arrays and channel bindings are immutable asset data. Instances reuse typed pose, blend, and palette buffers; playback does not reparse models, decode images, rebuild materials, upload geometry, or recompile programs. Runtime ticks cap a suspended-tab step at 100 ms.

Skinned geometry adds one immutable joint/weight buffer. A changed `(mesh node, skin)` pose updates one reusable 4×joint-count RGBA32F palette texture; multiple primitives on the node share that upload. Paused poses perform zero sampling and palette uploads. Instance-root movement changes only the ordinary matrix stream because it cancels from the mesh-local palette.

Independent skinned poses currently draw once per primitive. Ten independently timed two-primitive models therefore produce 20 color draws while sharing geometry, materials, textures, programs, clips, and sampler data. A palette atlas can be considered later if measurements justify the complexity.

An animated visible shadow caster increments the directional shadow version for a changed pose. A paused caster reuses the cached map, and receiver-only animation does not invalidate it. Skinned primitive spheres are expanded once from skeleton reach and clip translation/scale envelopes; Eclipse 3D does not CPU-skin vertices every frame to calculate exact animated bounds.

## Directional-shadow cost model

An update repacks visible casters into a reusable transform/alpha buffer, uploads it, clears one depth target, and normally submits one opaque instanced draw. Each cutout material adds a minimal sampled-alpha depth batch; instances sharing that material remain one draw. Static maps avoid all of that work. Moving the normal camera or a non-caster, or changing receiver/bias/filter state, reuses the map. Moving the light/caster, changing its projection or material assignment, or changing a cutout caster's opacity, cutoff, texture, sampling, or UV regenerates it. Resolution changes dispose and recreate the target once.

Preset scaling is bounded: 512² hard shadows at `low`, 1,024² four-tap filtering at `medium`, 2,048² four-tap filtering at `high`, and 2,048² nine-tap filtering at `ultra`. `ultra` increases filtering rather than allocating a 4,096² target. Individual settings remain available through `custom`.

Shadow profiler values are latest-frame CPU submission metrics, not GPU timer-query results. Cached maps report zero shadow draws/time and retain the caster count represented by the map.

## Environment-lighting cost model

Environment GPU work is lazy. No source assigned means no preprocessing resources; an assigned environment in an unlit/basic-lit-only scene also stays unallocated unless its background is visible. PBR without an environment keeps the existing ambient fallback and does not bind the two IBL maps.

The first required render converts the source to one cosine-weighted diffuse equirectangular map and a GGX-prefiltered RGBA8 mip chain. This is setup work and can cause a visible first-use stall; production does not call `finish` or read pixels. Static frames reuse the pair. Camera/object/direct-light/material edits, intensity, rotation, and background visibility do not regenerate it. Source pixels, source color-space/flip-Y interpretation, source replacement, and environment-quality limits do.

Quality limits are centralized: potato uses 8×4 diffuse and 32×16 specular with 8/12 samples; low uses 16×8 and 64×32 with 16/24; medium/custom uses 16×8 and 128×64 with 32/48; high uses 32×16 and 256×128 with 48/64; ultra retains 32×16 and 256×128 but raises samples to 64/96. These values change approximation/setup cost without rewriting roughness or other artistic values. The filtered results are standard-range linear RGBA8; floating-point HDR sources are future work.

PBR samples the diffuse map once and the prefiltered chain once per fragment, with an analytic split-sum BRDF approximation rather than another lookup texture. Roughness selects a mip. Environment identity, intensity, rotation, and material factors are uniforms, so they do not add shader variants or break a shared instanced draw. Enabling the visible sky adds one fullscreen draw independently of IBL.

Environment profiler time is CPU command-submission time. The browser harness separately records the synchronously completed first frame and cached median/p95/maximum; only the harness calls `gl.finish`. Filtered resource count and preprocessing count are reliable structural counters, while exact GPU memory is estimated from RGBA8 dimensions because driver allocation overhead is unavailable.

## Local-light cost model

Point lights use a stabilized inverse-square term multiplied by a squared smooth finite-range cutoff. Spot lights add a smoothstep penumbra between outer and inner cone cosines. Intensity is an artistic multiplier rather than a photometric-unit claim. PBR local lights reuse GGX/Smith/Schlick direct lighting; basic-lit uses diffuse only; unlit has no local-light shader path.

Zero selected lights retain the exact material keys and shaders. Local-light-capable programs use one fixed eight-entry layout plus a runtime active count; exact count and properties never compile variants. Packed arrays require five uniform calls when a program's current list changes. One unchanged single-list draw submits nothing on the next frame; multiple differently lit batches must resubmit their lists as the shared program state changes. The profiler's historical “GPU uploads” name counts these per-frame uniform-list submissions, not buffer allocation, persistent GPU resources, or a cumulative total. Moving a selected light updates data without rebuilding instance transforms. Moving an irrelevant light can force a cheap relevance check, but if selected IDs/data are unchanged it causes no batch rebuild or uniform submission. It does not invalidate the directional map or environment preprocessing cache.

Selection uses object bounds and 256-instance spatial ranges for large groups. Ranges with identical material and selected IDs merge into one instanced draw, preserving the 10,000-instance fast path when lighting is compatible. A group spanning distinct light regions may produce multiple draws; applying one global light list would be faster but visibly incorrect, while one list per instance would destroy batching. This range-level compromise should be revisited only with measured scenes that justify clustered/tiled lighting or a spatial index.

Latest-frame profiler counters expose total/enabled lights, absolute/effective budgets, the maximum selected list on an actual draw, selected references, selection evaluations/time, packed-list rebuilds, uniform submissions, local-light-capable draws, and range/cone/budget rejections. Rejection counts are light-to-region references from selection work, not necessarily unique scene lights; cached frames have no rejections when no relation is recomputed. The CPU time measures JavaScript selection only; it is not local-light GPU time. Profiling stores scalar results and does not add GPU queries or readbacks.

## Profiler semantics

The extension's FPS reporters measure intervals between TurboWarp `AFTER_EXECUTE` events. Render timing measures the synchronous backend call. Neither uses GPU timer queries, and the normal renderer can complete work asynchronously. Treat these reporters as runtime diagnostics, not authoritative GPU frame time.

## Measurement rules

- Record browser, OS, GPU, stage resolution, backend, object count, warm-up, and sample count with every GPU result.
- Compare unchanged builds on the same device. Browser power policy and background tabs can move results substantially.
- Use medians and tail latency. A single peak FPS figure is not useful for Scratch projects.
- Keep CPU setup, GPU render, shared-state overhead, and bitmap upload as separate measurements.
- Run lightweight node setup measurements during development. Run the browser matrix only after relevant renderer changes.
- Do not describe `gl.finish` benchmark throughput as game FPS; it intentionally serializes CPU and GPU work to make backend costs visible.


## visibility performance policy

Generic local bounds are computed once. Static world bounds change only with relevant instance/node transforms. Skinned bounds cost is proportional to active influenced joints only on pose/root changes; paused unchanged models retain 's zero sampling, hierarchy, palette, and now bound-update path. No CPU vertex deformation was added.

Scenes below 128 visible logical entries use a predictable linear scan. Larger scenes query the 32-unit loose grid. One moved object/group member updates one entry, same-cell motion avoids link churn, static objects require no maintenance, and camera/FOV/aspect/near/far changes never rebuild the index. Large multi-cell objects fall back conservatively rather than disappearing.

Visible members are compacted into existing reusable typed-array storage and grouped by the established batch key. Culling a fraction of 1,000 compatible objects should reduce written instances while retaining approximately the same logical material/geometry/light-selection draw count. Local-light spatial selection may still split a visible group where light sets genuinely differ; does not merge incompatible lighting to improve a counter.

Directional-shadow culling is light-space, not camera-space. This saves definitely irrelevant caster work while preserving off-camera shadow contributors. Camera motion alone can reuse a static shadow map. Pose/root/visibility/LOD changes to active casters invalidate correctly; paused unchanged animated casters remain cached.

Static-model LOD uses shared preloaded assets. A scene tracks only explicitly assigned instances for LOD evaluation, so ordinary static and animated models do not incur a model-count scan. Crossing a threshold can upload a level's geometry on first renderer use, but revisiting that level must reuse its buffers/programs/textures. Hysteresis prevents frame-to-frame threshold thrash. LOD does not reduce render quality silently: it is active only after an explicit group is assigned, can be disabled/forced per instance, and supports static unskinned asset swapping only.

Primary structural counters are visibility candidates/tests/rejections, visible and culled primitive instances, index updates/rebuilds, bound updates, LOD evaluations/switches/level counts, visible-instance upload bytes, geometry uploads, shader compiles after warmup, local-light selection work, and shadow candidates/rejections/draws. A model with three visible primitives contributes three packed primitive instances; model counts are reported separately where relevant. Internal LOD level-count arrays are zero-based, while public/current-LOD reporters are one-based with `1` as highest detail.

The browser matrix keeps completed-frame wall time, visibility/culling CPU time, loose-grid query CPU time, and dirty spatial-maintenance time distinct. The first has median/p95/max values and includes harness `gl.finish`; the next two are summed production timers across measured frames; `maximumSpatialUpdateMilliseconds` is the maximum explicit dirty-bounds/index synchronization among frames that actually update the grid. Static and camera-only rows require zero spatial-maintenance frames and exactly zero maintenance time. Median/p95/max timing remains useful, but browser scheduling and forced GPU completion make isolated spikes descriptive rather than universal.

## effects performance policy

The central rule is that billboarding, frame animation, particle motion, and decals change compact instance/simulation state—not static geometry. `GeometryStore` creates one immutable four-vertex quad lazily. Every renderer uploads it once on first effect use and all compatible effects share it. Scenes with no effects allocate no effect GPU buffer, quad, shader, simulation object, sort work, or effect upload, preserving the /12 static path.

Full/Y-axis/screen-aligned facing is vertex-shader work from shared camera uniforms plus compact per-instance position/size/pivot/roll. Camera rotation therefore reorients thousands of opaque/cutout sprites without rebuilding geometry, changing spatial membership, or uploading model matrices. A camera translation that leaves the visible set unchanged also leaves their compact instance buffer resident. Transparent visible effects are the intentional exception: position changes can require a repack for back-to-front ordering.

The effect buffer stores 24 floats (96 bytes) per submitted sprite, decal, or visible particle. Per-instance tint, opacity, brightness, atlas rectangle, and plane basis avoid material proliferation. Batch identity is limited to texture, billboard, lighting, alpha/cutoff, depth, decal offset state, and local-light selection. A compatible 10,000-sprite field targets one quad, one texture, one batch/draw, one initial compact upload, zero cached geometry uploads, and no post-warmup compile. Legitimate texture/render-state/local-light splits remain visible in the counters.

Particles use a fixed-capacity structure-of-arrays allocation per emitter and one dense live prefix. Spawn/expiry never allocates or splices particle objects; expiry swaps the final particle into the removed slot. Simulation scales with active unpaused particles and clamps one update to 100 ms. Fractional rate carry preserves time-based emission. Compatible emitters share the same renderer batch and draw even though seeds/state are independent. Conservative bounds are recomputed only when emitter position/size/spawn/velocity/acceleration/lifetime configuration changes, not for every particle or simulation tick. Offscreen culling skips instance packing/draw/local-light selection but deliberately continues CPU simulation. An offscreen simulation change advances the emitter's CPU-state version without advancing the store-wide render version; visibility re-entry later packs the current state, while unrelated visible batches remain resident in the meantime.

Paused unchanged emitters report zero simulated/spawned/expired particles and do not advance the effect render version, so the renderer submits no new instance data. Static sprites and persistent decals likewise cost only visibility query/submission on frames rendered for some other reason; Eclipse 3D remains invalidation-driven. Directional sprite selection scans only explicitly directional effects and uploads only when the selected frame actually changes.

Transparent sorting is intentionally practical: compatible sprite/decal items are sorted back-to-front with reusable arrays; compatible particle emitters are ordered by emitter center while particles retain dense simulation order. This keeps high-count effects instanced but cannot guarantee strict global/per-particle ordering. There is no OIT, GPU sorting, soft-particle depth sampling, or GPU simulation.

## render-target and post-processing performance policy

The zero-post path is a hard boundary. `PostProcessingSettings.active` is false when global post is off and also when it is on with neutral color/vignette settings and bloom/FXAA disabled. In that state `PostProcessPipeline` calls the existing scene renderer with the backend's original output framebuffer. It does not allocate a scene target, bloom pair, fullscreen VAO/program, or any post texture; it submits zero fullscreen/post/bloom draws. The shared backend retains only its pre-existing output texture required by scratch-render.

Named user targets are fixed-size and command-driven. Eclipse 3D never refreshes them automatically. Each definition owns front/back RGBA8+depth targets so same-target sampling remains safe; estimated memory is therefore `width × height × 8 bytes × 2` before implementation overhead. Offscreen renders reuse scene geometry, textures, programs, material/light caches, visibility/spatial infrastructure, and directional shadows. They can upload a different visible compact instance subset, but must not upload immutable geometry or advance simulation. Camera movement performs a visibility query without a spatial rebuild.

Estimated internal target memory, excluding driver overhead:

| Viewport / configuration | Scene color + depth/resolve | Bloom pairs | Total bytes | Approx. decimal MB |
| --- | ---: | ---: | ---: | ---: |
| 1280×720 medium, single-sample | 7,372,800 | 2,304,000 | 9,676,800 | 9.68 MB |
| 1920×1080 high, single-sample | 16,588,800 | 5,443,200 | 22,032,000 | 22.03 MB |
| 3840×2160 ultra, single-sample | 66,355,200 | 22,032,000 | 88,387,200 | 88.39 MB |
| 1920×1080 high, four-sample MSAA | 74,649,600 | 5,443,200 | 80,092,800 | 80.09 MB |

Production post processing and render-to-texture perform no CPU readback. Measure setup and resizing separately from cached rendering.

Post-processing uniform changes and intermediate resizing do not invalidate directional shadows. Caster changes still update the shadow map.

## game-utility performance policy

Raycasting is demand-driven CPU work. A cast reuses the scene raycaster's origin/direction/result vectors, candidate list, traversal stack, transform matrices, hit records, and filter state. Large scenes query the existing loose spatial grid with 3D-DDA traversal; small scenes keep the direct scan. Candidate bounds precede exact tests. Each immutable static geometry resource lazily owns one BVH per raycaster/version through a weak cache, so repeated model instances do not duplicate acceleration. Camera movement may change a query but performs no spatial rebuild. No ray block renders, reads pixels, uploads geometry/textures, or compiles a shader.

Camera projection, view, inverse-view-projection, position, and basis arrays are retained per camera and recomputed only for a transform/projection/aspect change. Logical Scratch-stage conversion deliberately ignores output resolution, DPR, render scale, post state, and target size. Camera helpers cause zero geometry uploads, shader compiles, or spatial rebuilds; normal rendering may still repack visible-instance data when a genuinely changed camera produces a different visible subset.

Tween records come from a reusable pool and store fixed typed start/delta/value arrays. The update loop does not create per-tween temporary arrays. It skips entirely with no active record or zero delta, and paused records are not applied. Only the engine update loop advances tweens; any number of main/offscreen render calls between updates adds zero tween work. The 0.1-second update clamp is intentional and matches the existing suspension behavior.

Terrain allocates retained heights, interleaved vertex data, normals/UVs, and one immutable index array at creation. A dirty set coalesces any number of height edits. One flush mutates retained arrays, recomputes normals, advances one dynamic geometry version, and produces one visible GPU vertex update; unchanged terrain produces zero geometry builds/uploads. Initial dynamic vertex storage uses `DYNAMIC_DRAW`, while the indexed `ELEMENT_ARRAY_BUFFER` remains immutable `STATIC_DRAW` VAO-owned state. Terrain uses ordinary model/material/light/shadow/culling batches. Each terrain uses one cull unit per terrain instead of pretending internal chunk streaming exists.

Text cache keys cover only raster-affecting definition state. Identical definitions share retained pixel/texture ownership; label position, orientation, pivot, billboard facing, camera movement, and world size do not invalidate the cache. A cache hit performs zero Canvas2D rasterization and zero new texture creation. A changed definition uploads once on next visible render, while an unchanged label or camera-only move uploads nothing. Text shares the existing effect geometry, programs, batching, post path, and renderer-restart texture recreation. Unicode glyph coverage and fallback appearance depend on the browser and installed/system fonts; no platform-identical fallback is promised.

Useful structural counters:

- raycasting: raycasts, broad-phase candidates, bounds tests, triangle tests, exact hits, and CPU milliseconds;
- tweens: active, applied, and completed records plus update milliseconds;
- terrain: resources/chunks, triangles, logical builds, GPU uploads/bytes, and visible/culled resources;
- text: labels, rasterizations, texture uploads, shared textures, rendered instances, and draws;
- general: geometry/texture uploads, shader compiles, spatial rebuilds, draws, and median/p95/max completed-frame time.

## custom-rendering performance policy

Custom programs are allocated lazily and cache by GLSL source, typed schema and contract version. Per-material numeric/color/sampler values are excluded from program identity: changing one value uploads only that active field on the next relevant draw and does not recompile, upload geometry, recreate textures, rebuild spatial acceleration, or preprocess an environment. Target samplers use the existing GPU target resolver rather than a CPU copy. A scene that never creates/draws custom state keeps the custom program cache absent and all custom compile/upload/draw/uniform counters at zero.

## physics and audio performance policy

Physics is unallocated until a scene creates a body. Bodies use a dedicated loose grid; dirty bodies alone update collision bounds, moving/dirty/contact-neighbor bodies alone query candidates, and sleeping supported dynamics leave integration, grid updates, and narrow-phase work at zero. Contact records are pooled and hard-capped at 8,192, with observable overflow rather than unbounded event history. Fixed 1/60-second work accepts at most 0.1 seconds and six substeps per engine update. This is representative sparse-scene acceleration, not a worst-case complexity guarantee for large overlapping/oversized volumes.

Audio is unallocated until first use and creates no `AudioContext` merely from extension/engine/scene/source-store construction. Identity-equivalent asset names share one load/buffer entry. Scratch sounds reuse the buffer already decoded in the host sound bank, avoiding a second decode and leaving context creation to explicit play/unlock; raw URL/data-URI or fallback bytes decode once in the engine context. Internal load/decode duration and reuse counters separate acquisition from decoding without adding frame work. Gain/panner nodes are persistent per played source; buffer source nodes alone are one-use. Only playing positional sources participate in changed-only source/listener propagation, and unchanged camera/root versions cause no native parameter writes. There is no audio traversal, decode, source/listener work, shader compile, upload, or renderer invalidation on the unused path.
