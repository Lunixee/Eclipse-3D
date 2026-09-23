# Metrics, Profiling & Debug

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Engine, output and errors](#engine-output-and-errors)
- [Model and geometry resources](#model-and-geometry-resources)
- [Materials and PBR](#materials-and-pbr)
- [Lighting, shadows and environments](#lighting-shadows-and-environments)
- [Animation and skinning](#animation-and-skinning)
- [Sprites, particles, decals and text](#sprites-particles-decals-and-text)
- [Visibility, spatial index and LOD](#visibility-spatial-index-and-lod)
- [Physics and audio](#physics-and-audio)
- [Post processing and targets](#post-processing-and-targets)
- [Custom rendering](#custom-rendering)
- [Raycasting, terrain and tweens](#raycasting-terrain-and-tweens)

## Engine, output and errors

Renderer backend returns the active backend name; FPS and average FPS describe host/update pacing rather than GPU throughput. Draw calls and internal width/height/pixel-count/pixel-ratio describe actual renderer output. The three-draw static baseline and scenario comparisons are historical performance evidence, not a promise for every material/feature combination.

`lastError` is the latest extension diagnostic. Clear it before isolating a new operation, then read it after a failure. Missing-resource typed queries can update this diagnostic, whereas existence probes are quiet. Metric reads do not create a renderer, force a frame, poll a GPU query or allocate optional subsystems. See [performance methodology](../performance.md).

### rendererBackend

![3D renderer backend](../assets/blocks/rendererBackend.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### currentFps

![3D current FPS](../assets/blocks/currentFps.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### averageFps

![3D average FPS](../assets/blocks/averageFps.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### drawCalls

![3D draw calls](../assets/blocks/drawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### internalRenderDimension

![internal render [DIMENSION]](../assets/blocks/internalRenderDimension.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>DIMENSION</code> | string; <code>width</code> | <code>width</code>, <code>height</code> |

### effectivePixelRatio

![effective pixel ratio](../assets/blocks/effectivePixelRatio.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### internalRenderPixels

![internal render pixel count](../assets/blocks/internalRenderPixels.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### lastError

![last 3D error](../assets/blocks/lastError.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### clearError

![clear 3D error](../assets/blocks/clearError.svg)

**Command.** See the group guide above.

## Model and geometry resources

Asset/geometry counts describe retained resources, not visible instances. Geometry GPU bytes describe cached GPU allocation, excluding unrelated textures/post targets. Geometry upload counts expose upload activity; compare changes after edits and renderer recreation, not just steady-state counts.

A shared geometry can have many instances with one allocation. Deleted consumers must release references before named assets disappear. Pair these counters with visible-instance and draw-call counters to distinguish resource ownership from submission cost.

### modelAssetCount

![loaded model asset count](../assets/blocks/modelAssetCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### loadedGeometryCount

![loaded model geometry count](../assets/blocks/loadedGeometryCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### geometryGpuBytes

![geometry GPU bytes](../assets/blocks/geometryGpuBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### geometryUploads

![geometry GPU uploads](../assets/blocks/geometryUploads.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Materials and PBR

Material count is retained logical resources. Program counts/compile counters concern renderer shader caches; program/material/texture switches and PBR draws concern submission. A first draw or warmup can compile even though a material was created earlier.

Compare steady frames after warmup. Sharing compatible materials reduces switches/batches; repeatedly creating equivalent names is not a shader-performance strategy. PBR programs/draws distinguish PBR usage from unlit/basic-lit/custom rendering.

### materialCount

![material count](../assets/blocks/materialCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### materialPrograms

![active material shader programs](../assets/blocks/materialPrograms.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### materialShaderCompiles

![material shader compiles](../assets/blocks/materialShaderCompiles.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### materialProgramSwitches

![material program switches](../assets/blocks/materialProgramSwitches.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### materialSwitches

![material switches](../assets/blocks/materialSwitches.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### textureSwitches

![texture switches](../assets/blocks/textureSwitches.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### pbrPrograms

![active PBR shader programs](../assets/blocks/pbrPrograms.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### pbrDrawCalls

![PBR draw calls](../assets/blocks/pbrDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Lighting, shadows and environments

Active lights count configured enabled local lights; selected lights describe the bounded renderer list. List rebuilds, GPU uploads and selection milliseconds expose dirty work. Local-light draw counts reflect draws using that path, not one draw per light.

Shadow time/draws/triangles/casters/maps-updated describe shadow work; cached static maps can mean zero updates. Environment preprocess time/count/resources expose source/quality preparation, while IBL/background draws describe use. Rotation/intensity changes should not be interpreted as source preprocessing. Record backend and enabled features with every comparison.

### activeLocalLightCount

![active local light count](../assets/blocks/activeLocalLightCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### selectedLocalLightCount

![selected local lights per draw](../assets/blocks/selectedLocalLightCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### localLightListRebuilds

![local light list rebuilds](../assets/blocks/localLightListRebuilds.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### localLightGpuUploads

![local light GPU uploads](../assets/blocks/localLightGpuUploads.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### localLightDrawCalls

![local-light-capable draw calls](../assets/blocks/localLightDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### localLightSelectionTime

![local light selection time](../assets/blocks/localLightSelectionTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowRenderTime

![shadow rendering time](../assets/blocks/shadowRenderTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowDrawCalls

![shadow draw calls](../assets/blocks/shadowDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowTriangles

![shadow triangles](../assets/blocks/shadowTriangles.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowCasters

![shadow casters](../assets/blocks/shadowCasters.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowMapsUpdated

![shadow maps updated this frame](../assets/blocks/shadowMapsUpdated.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentPreprocessTime

![environment preprocessing time](../assets/blocks/environmentPreprocessTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentPreprocesses

![environments preprocessed this frame](../assets/blocks/environmentPreprocesses.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentResources

![GPU environment resource sets](../assets/blocks/environmentResources.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentIblDrawCalls

![environment-lit PBR draw calls](../assets/blocks/environmentIblDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentBackgroundDrawCalls

![environment background draw calls](../assets/blocks/environmentBackgroundDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Animation and skinning

Players/channels and animation-sampling milliseconds describe CPU pose work. Joint-palette upload count/bytes describe changed GPU skinning data. Skinned main/shadow draws describe renderer submission, which may differ when shadows are disabled or an instance is culled.

Paused/static poses should reuse palettes; additional cameras must not advance clip time. Use animation state plus these counters to distinguish logical playback from visible or uploaded work.

### activeAnimationPlayers

![active animation players](../assets/blocks/activeAnimationPlayers.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### sampledAnimationChannels

![sampled animation channels](../assets/blocks/sampledAnimationChannels.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### animationSamplingTime

![animation sampling time](../assets/blocks/animationSamplingTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### jointPaletteUploads

![joint palette uploads](../assets/blocks/jointPaletteUploads.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### jointPaletteUploadBytes

![joint palette upload bytes](../assets/blocks/jointPaletteUploadBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### skinnedDrawCalls

![skinned draw calls](../assets/blocks/skinnedDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### skinnedShadowDrawCalls

![skinned shadow draw calls](../assets/blocks/skinnedShadowDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Sprites, particles, decals and text

Sprite/decal/text counts distinguish retained from visible instances and actual draws. Sprite upload bytes and directional-frame changes expose packing/atlas selection; camera-facing quads do not imply new geometry. Text rasterizations/uploads/shared textures separate expensive content changes from cheap transform changes.

Particle counters distinguish active emitters/particles, spawned/expired particles, simulation milliseconds, visible/culled emitters and uploaded bytes/draws. A culled emitter may still simulate. Low draw count does not eliminate blended overdraw or CPU simulation cost. Read counters after a representative frame and retain the scene/quality settings alongside them.

### spriteCount

![sprite count](../assets/blocks/spriteCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleSpriteCount

![visible sprite count](../assets/blocks/visibleSpriteCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spriteDrawCalls

![sprite draw calls](../assets/blocks/spriteDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spriteInstanceUploadBytes

![sprite/effect instance upload bytes](../assets/blocks/spriteInstanceUploadBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### directionalFrameChanges

![directional sprite frame changes](../assets/blocks/directionalFrameChanges.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### activeParticleEmitters

![active particle emitters](../assets/blocks/activeParticleEmitters.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### totalActiveParticles

![total active particles](../assets/blocks/totalActiveParticles.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### particlesSpawned

![particles spawned this tick](../assets/blocks/particlesSpawned.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### particlesExpired

![particles expired this tick](../assets/blocks/particlesExpired.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### particleSimulationTime

![particle simulation time](../assets/blocks/particleSimulationTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleParticleEmitters

![visible particle emitters](../assets/blocks/visibleParticleEmitters.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### culledParticleEmitters

![culled particle emitters](../assets/blocks/culledParticleEmitters.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### particleInstanceUploadBytes

![particle instance upload bytes](../assets/blocks/particleInstanceUploadBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### particleDrawCalls

![particle draw calls](../assets/blocks/particleDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### decalCount

![decal count](../assets/blocks/decalCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleDecalCount

![visible decal count](../assets/blocks/visibleDecalCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### decalDrawCalls

![decal draw calls](../assets/blocks/decalDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### textLabelCount

![3D text label count](../assets/blocks/textLabelCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### textRasterizations

![3D text rasterizations](../assets/blocks/textRasterizations.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### textTextureUploads

![3D text texture uploads](../assets/blocks/textTextureUploads.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### sharedTextTextures

![shared 3D text textures](../assets/blocks/sharedTextTextures.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderedTextInstances

![rendered 3D text instances](../assets/blocks/renderedTextInstances.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### textDrawCalls

![3D text draw calls](../assets/blocks/textDrawCalls.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Visibility, spatial index and LOD

Visibility counters follow different stages: total renderables, broad/spatial candidates, frustum tests/rejects, distance rejects and final visible renderables/instances. Do not subtract unrelated counters as if they all shared the same denominator. Timings are CPU milliseconds for the named visibility/spatial work.

Spatial entries, incremental updates/rebuilds and dirty/animated bounds describe retained index maintenance. Visible-instance upload bytes measure packed upload work. LOD evaluations/switches and per-level counts explain selected static detail. Shadow visibility candidates/rejects/casters describe the light view, which can differ from camera visibility.

Compare unchanged and edited frames to confirm caching; a metric read is not an instruction to rebuild anything. Force a relevant render/update before interpreting last-frame counters, and keep LOD/culling/image-quality policies equivalent across benchmark engines.

### totalRenderables

![total renderables](../assets/blocks/totalRenderables.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibilityCandidates

![visibility candidates](../assets/blocks/visibilityCandidates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spatialCandidates

![spatial candidates](../assets/blocks/spatialCandidates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### frustumTests

![frustum tests](../assets/blocks/frustumTests.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### frustumRejected

![frustum rejected](../assets/blocks/frustumRejected.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderDistanceRejected

![render distance rejected](../assets/blocks/renderDistanceRejected.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleRenderables

![visible renderables](../assets/blocks/visibleRenderables.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleInstances

![visible instances](../assets/blocks/visibleInstances.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### culledInstances

![culled instances](../assets/blocks/culledInstances.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibilityCpuTime

![visibility CPU time](../assets/blocks/visibilityCpuTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spatialQueryCpuTime

![spatial query CPU time](../assets/blocks/spatialQueryCpuTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spatialIndexEntries

![spatial index entries](../assets/blocks/spatialIndexEntries.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spatialIndexUpdates

![spatial index updates](../assets/blocks/spatialIndexUpdates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### spatialIndexRebuilds

![spatial index rebuilds](../assets/blocks/spatialIndexRebuilds.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### dirtyBounds

![dirty bounds updated](../assets/blocks/dirtyBounds.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### animatedBounds

![animated bounds updated](../assets/blocks/animatedBounds.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleInstanceUploadBytes

![visible instance upload bytes](../assets/blocks/visibleInstanceUploadBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### lodEvaluations

![LOD evaluations](../assets/blocks/lodEvaluations.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### lodSwitches

![LOD switches](../assets/blocks/lodSwitches.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### lodLevelInstanceCount

![instances using LOD level [LEVEL]](../assets/blocks/lodLevelInstanceCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LEVEL</code> | number; <code>1</code> | — |

### shadowVisibilityCandidates

![shadow visibility candidates](../assets/blocks/shadowVisibilityCandidates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowFrustumRejected

![shadow frustum rejected](../assets/blocks/shadowFrustumRejected.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowVisibleCasters

![visible shadow casters](../assets/blocks/shadowVisibleCasters.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Physics and audio

Physics metric menus expose body/contact/broad-phase/solver/timing and overflow counters; audio metric menus expose assets/sources/context/cache/playback/update work. Their units are specified in each menu label (counts, bytes or milliseconds where applicable).

These reporters remain zero-work when the optional subsystem has never been created. Read contact overflow and substep/work metrics when diagnosing dense scenes; read audio context/cache counts when checking restart/reload ownership. Build/integrity tests alone do not prove audible output or autoplay recovery.

### physicsMetric

![physics [METRIC]](../assets/blocks/physicsMetric.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>METRIC</code> | string; <code>steps</code> | <code>steps</code>, <code>integrated</code>, <code>candidates</code>, <code>narrowTests</code>, <code>gridUpdates</code>, <code>droppedTime</code>, <code>contactOverflows</code> |

### audioMetric

![audio [METRIC]](../assets/blocks/audioMetric.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>METRIC</code> | string; <code>decodes</code> | <code>contexts</code>, <code>decodes</code>, <code>voices</code>, <code>listenerUpdates</code>, <code>sourceUpdates</code> |

## Post processing and targets

Post pass/fullscreen-draw and bloom-pass counters show executed image passes; neutral post should keep the direct path. Target allocation/resize/byte counters distinguish storage from camera draws. Named double buffering consumes more storage than one color image.

Post shader compiles track preparation; offscreen camera renders count explicit target work. Rendering multiple cameras adds draw work but never additional simulation updates. Capture steady state separately from first use, resize and renderer recreation.

### postProcessingPassCount

![post-processing pass count](../assets/blocks/postProcessingPassCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### postFullscreenDraws

![post fullscreen draws](../assets/blocks/postFullscreenDraws.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderTargetAllocations

![render-target allocations this frame](../assets/blocks/renderTargetAllocations.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderTargetResizes

![render-target resizes this frame](../assets/blocks/renderTargetResizes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderTargetBytes

![estimated render-target GPU bytes](../assets/blocks/renderTargetBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### bloomPasses

![bloom passes this frame](../assets/blocks/bloomPasses.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### postShaderCompiles

![post shader compiles](../assets/blocks/postShaderCompiles.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### offscreenCameraRenders

![offscreen camera renders this frame](../assets/blocks/offscreenCameraRenders.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

## Custom rendering

The metric selector reports custom program/compile, numeric/sampler uniform upload, geometry upload and draw counters. Compile attempts and upload events accumulate for the renderer lifetime; custom draws describe the last render. Engine matrix/size/opacity uniforms are outside the user-uniform-upload counter.

Uniform value changes do not invalidate program identity. Repeated unchanged frames should not recompile or reupload unchanged numeric fields. Sampler bindings can be refreshed as target handles change. First custom draw/warmup creates the optional program cache; merely reading a metric does not.

### customRenderingMetric

![custom rendering [METRIC]](../assets/blocks/customRenderingMetric.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>METRIC</code> | string; <code>shader draws</code> | <code>shader compiles</code>, <code>shader draws</code>, <code>uniform uploads</code>, <code>geometry uploads</code> |

## Raycasting, terrain and tweens

Ray counters distinguish query count, broad-phase candidates, bounds/triangle tests, hits and CPU milliseconds. A hit reporter does not increment them; a new cast does. Bounds-precision skinned hits are not evidence of triangle testing.

Terrain counters expose named terrain count, triangles, geometry builds and GPU upload counts/bytes plus visible/culled chunks. Each current terrain is one finite chunk. Tween counters expose active records, updates/completions and update milliseconds. Query these after the relevant update rather than treating an idle zero as a missing feature.

### raycastCount

![raycasts this update](../assets/blocks/raycastCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### raycastBroadPhaseCandidates

![raycast broad-phase candidates](../assets/blocks/raycastBroadPhaseCandidates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### raycastBoundsTests

![raycast bounds tests](../assets/blocks/raycastBoundsTests.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### raycastTriangleTests

![raycast triangle tests](../assets/blocks/raycastTriangleTests.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### raycastHits

![raycast hits this update](../assets/blocks/raycastHits.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### raycastTime

![raycast CPU milliseconds](../assets/blocks/raycastTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### terrainCount

![terrain count](../assets/blocks/terrainCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### terrainTriangles

![terrain triangles](../assets/blocks/terrainTriangles.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### terrainGeometryBuilds

![terrain geometry builds](../assets/blocks/terrainGeometryBuilds.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### terrainGpuUploads

![terrain GPU uploads](../assets/blocks/terrainGpuUploads.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### terrainGpuUploadBytes

![terrain GPU upload bytes](../assets/blocks/terrainGpuUploadBytes.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### visibleTerrainChunks

![visible terrain chunks](../assets/blocks/visibleTerrainChunks.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### culledTerrainChunks

![culled terrain chunks](../assets/blocks/culledTerrainChunks.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### activeTweens

![active tweens](../assets/blocks/activeTweens.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### tweenUpdates

![tween updates this frame](../assets/blocks/tweenUpdates.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### completedTweens

![tweens completed this frame](../assets/blocks/completedTweens.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### tweenUpdateTime

![tween update milliseconds](../assets/blocks/tweenUpdateTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.
