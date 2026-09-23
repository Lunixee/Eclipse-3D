# Render Quality, Targets & Post Processing

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Quality and visibility policy](#quality-and-visibility-policy)
- [Render targets](#render-targets)
- [Post processing](#post-processing)

## Quality and visibility policy

Quality presets coordinate render resolution/DPR, antialiasing and feature policy. Apply a preset once, then override individual settings deliberately. Existing projects retain their previous defaults unless they execute quality blocks. Resolution scale is percent of the stage-derived output; maximum pixel ratio caps device scaling. Internal dimensions report the resulting physical pixels.

Render distance and frustum culling affect visibility; distance zero disables the finite cutoff. Global texture/environment quality and maximum local lights have their own sampling/resource/selection effects. Antialiasing depends on backend capabilities; FXAA is a separate post option. A setting reporter returns policy, which can differ from the effective output under device limits.

Adaptive resolution is opt-in. Set target FPS and minimum/maximum scale bounds; query its current scale through `qualityNumber`. It changes image quality to seek a budget, so disable or match its behavior for equivalent-quality comparisons. 

### setRenderQuality

![set render quality [QUALITY]](../assets/blocks/setRenderQuality.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>QUALITY</code> | string; <code>medium</code> | <code>potato</code>, <code>low</code>, <code>medium</code>, <code>high</code>, <code>ultra</code> |

### renderQuality

![render quality](../assets/blocks/renderQuality.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### setRenderResolutionScale

![set render resolution scale to [PERCENT] %](../assets/blocks/setRenderResolutionScale.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PERCENT</code> | number; <code>100</code> | — |

### renderResolutionScale

![render resolution scale](../assets/blocks/renderResolutionScale.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### setMaxPixelRatio

![set maximum pixel ratio [RATIO]](../assets/blocks/setMaxPixelRatio.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RATIO</code> | string; <code>automatic</code> | <code>automatic</code>, <code>1</code>, <code>1.5</code>, <code>2</code> |

### maxPixelRatio

![maximum pixel ratio](../assets/blocks/maxPixelRatio.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### setAntialiasing

![set antialiasing [MODE]](../assets/blocks/setAntialiasing.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODE</code> | string; <code>off</code> | <code>off</code>, <code>native</code> |

### antialiasing

![antialiasing mode](../assets/blocks/antialiasing.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### setRenderDistance

![set render distance [DISTANCE]](../assets/blocks/setRenderDistance.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>DISTANCE</code> | number; <code>0</code> | — |

### renderDistance

![render distance](../assets/blocks/renderDistance.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### setFrustumCulling

![set scene frustum culling [ENABLED]](../assets/blocks/setFrustumCulling.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### frustumCullingEnabled

![scene frustum culling enabled?](../assets/blocks/frustumCullingEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### setGlobalTextureQuality

![set texture quality [QUALITY]](../assets/blocks/setGlobalTextureQuality.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>QUALITY</code> | string; <code>custom</code> | <code>potato</code>, <code>low</code>, <code>medium</code>, <code>high</code>, <code>ultra</code>, <code>custom</code> |

### globalTextureQuality

![texture quality](../assets/blocks/globalTextureQuality.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### setGlobalEnvironmentQuality

![set environment quality [QUALITY]](../assets/blocks/setGlobalEnvironmentQuality.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>QUALITY</code> | string; <code>custom</code> | <code>potato</code>, <code>low</code>, <code>medium</code>, <code>high</code>, <code>ultra</code>, <code>custom</code> |

### globalEnvironmentQuality

![environment quality](../assets/blocks/globalEnvironmentQuality.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### setMaximumLocalLights

![set maximum local lights per draw [COUNT]](../assets/blocks/setMaximumLocalLights.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>COUNT</code> | number; <code>8</code> | — |

### maximumLocalLights

![maximum local lights per draw](../assets/blocks/maximumLocalLights.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### setAdaptiveResolution

![set adaptive resolution [ENABLED]](../assets/blocks/setAdaptiveResolution.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### adaptiveResolutionEnabled

![adaptive resolution enabled?](../assets/blocks/adaptiveResolutionEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### setAdaptiveTargetFps

![set adaptive resolution target to [FPS] FPS](../assets/blocks/setAdaptiveTargetFps.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>FPS</code> | number; <code>60</code> | — |

### adaptiveTargetFps

![adaptive resolution target FPS](../assets/blocks/adaptiveTargetFps.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### setAdaptiveScaleRange

![set adaptive resolution range [MINIMUM] % to [MAXIMUM] %](../assets/blocks/setAdaptiveScaleRange.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MINIMUM</code> | number; <code>50</code> | — |
| <code>MAXIMUM</code> | number; <code>100</code> | — |

### qualityNumber

![quality [PROPERTY] number](../assets/blocks/qualityNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>adaptive minimum scale %</code> | <code>adaptive minimum scale %</code>, <code>adaptive maximum scale %</code>, <code>adaptive current scale %</code> |

## Render targets

Create a fixed-size named RGBA8 target in pixels, then render the active scene through its current or a named camera. The target name can be used as a texture by a material or sampler. These commands update targets on demand; a target does not create another simulation loop or automatically refresh each frame.

Front/back storage makes sampling a target during its own render read the previous completed image, avoiding framebuffer feedback. This is deterministic self-reference, not recursive mirrors/portals. Target memory includes both color/depth sets. Resize reallocates; ordinary updates reuse handles.

Clear explicitly when wanted. Renderer recreation preserves logical definitions but command-produced contents must be replayed. Dimension reporters return pixels; existence is Boolean. Delete only after detaching materials/samplers and other consumers. See [Post Processing & Render Targets example](../../examples/post-processing/README.md).

### createRenderTarget

![create render target [TARGET] width [WIDTH] height [HEIGHT]](../assets/blocks/createRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |
| <code>WIDTH</code> | number; <code>320</code> | — |
| <code>HEIGHT</code> | number; <code>180</code> | — |

### resizeRenderTarget

![resize render target [TARGET] to [WIDTH] by [HEIGHT]](../assets/blocks/resizeRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |
| <code>WIDTH</code> | number; <code>320</code> | — |
| <code>HEIGHT</code> | number; <code>180</code> | — |

### renderSceneToRenderTarget

![render current scene to render target [TARGET]](../assets/blocks/renderSceneToRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |

### renderCameraToRenderTarget

![render scene from camera [CAMERA] to render target [TARGET]](../assets/blocks/renderCameraToRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>security</code> | — |
| <code>TARGET</code> | string; <code>monitor</code> | — |

### clearRenderTarget

![clear render target [TARGET]](../assets/blocks/clearRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |

### renderTargetExists

![render target [TARGET] exists?](../assets/blocks/renderTargetExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |

### renderTargetDimension

![render target [TARGET] [DIMENSION]](../assets/blocks/renderTargetDimension.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>target</code> | — |
| <code>DIMENSION</code> | string; <code>width</code> | <code>width</code>, <code>height</code> |

### deleteRenderTarget

![delete render target [TARGET]](../assets/blocks/deleteRenderTarget.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TARGET</code> | string; <code>monitor</code> | — |

## Post processing

Enable post processing, then configure bloom, color factors, vignette and FXAA. Brightness/contrast/saturation use neutral value 1; vignette intensity 0 is neutral. Bloom has intensity, threshold and quality controls. Master enablement alone with entirely neutral controls keeps the direct rendering path.

The chain is engine ordered: optional downsampled bloom followed by one fused color/vignette/bloom/optional-FXAA presentation pass. Output is LDR RGBA8; bloom operates on that limited range and is not HDR lighting. Final presentation preserves alpha. Custom post shaders, SSAO/SSR and depth-of-field are not part of this API.

Boolean reporters distinguish enabled/active state; numeric reporters expose factors, and `resetPostProcessing` restores neutral settings. Buffers/programs are retained while useful; size or configuration changes can allocate/compile. Use post counters to distinguish steady frames from first-use warmup and resize cost.

### setPostProcessing

![set post processing [ENABLED]](../assets/blocks/setPostProcessing.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setBloom

![set bloom [ENABLED]](../assets/blocks/setBloom.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setBloomFactor

![set bloom [PROPERTY] [VALUE]](../assets/blocks/setBloomFactor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>intensity</code> | <code>intensity</code>, <code>threshold</code> |
| <code>VALUE</code> | number; <code>0.8</code> | — |

### setBloomQuality

![set bloom radius / quality [QUALITY]](../assets/blocks/setBloomQuality.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>QUALITY</code> | string; <code>medium</code> | <code>low</code>, <code>medium</code>, <code>high</code>, <code>ultra</code> |

### setPostColorFactor

![set post [PROPERTY] factor [VALUE]](../assets/blocks/setPostColorFactor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>brightness</code> | <code>brightness</code>, <code>contrast</code>, <code>saturation</code> |
| <code>VALUE</code> | number; <code>1</code> | — |

### setVignetteFactor

![set vignette [PROPERTY] [VALUE]](../assets/blocks/setVignetteFactor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>intensity</code> | <code>intensity</code>, <code>radius</code>, <code>softness</code> |
| <code>VALUE</code> | number; <code>0</code> | — |

### setFxaa

![set post FXAA [ENABLED]](../assets/blocks/setFxaa.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### postProcessingEnabled

![post processing enabled?](../assets/blocks/postProcessingEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### bloomEnabled

![bloom enabled?](../assets/blocks/bloomEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### bloomIntensity

![bloom intensity](../assets/blocks/bloomIntensity.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

### postNumber

![post [PROPERTY] number](../assets/blocks/postNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>brightness</code> | <code>brightness</code>, <code>contrast</code>, <code>saturation</code>, <code>bloom threshold</code>, <code>bloom quality level</code>, <code>vignette intensity</code>, <code>vignette radius</code>, <code>vignette softness</code> |

### postBoolean

![post [PROPERTY] ?](../assets/blocks/postBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>active</code> | <code>active</code>, <code>fxaa</code> |

### resetPostProcessing

![reset post-processing settings](../assets/blocks/resetPostProcessing.svg)

**Command.** See the group guide above.
