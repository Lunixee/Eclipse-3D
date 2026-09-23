# Lighting & Environment

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Directional and ambient lights](#directional-and-ambient-lights)
- [Point and spot lights](#point-and-spot-lights)
- [Directional shadows](#directional-shadows)
- [Environment resources](#environment-resources)

## Directional and ambient lights

Directional lights contribute one direction across the scene. Create a named light, set its color/intensity and orient it with shared rotation controls. Ambient light is scene-wide diffuse fill, not a resource or a substitute for PBR environment lighting. Unlit materials ignore these lighting inputs.

Directional number/text/Boolean queries expose intensity, color and shadow configuration without rendering a shadow map. Color inputs are sRGB colors converted for lighting. Intensity is a factor, not a percent. Configure directional shadow casting in the following subgroup only when needed.

### createDirectionalLight

![create directional light [NAME] intensity [INTENSITY]](../assets/blocks/createDirectionalLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sun</code> | — |
| <code>INTENSITY</code> | number; <code>1</code> | — |

### setDirectionalLight

![set directional light [LIGHT] color [COLOR] intensity [INTENSITY]](../assets/blocks/setDirectionalLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |
| <code>INTENSITY</code> | number; <code>1</code> | — |

### setAmbientLight

![set ambient light color [COLOR] intensity [INTENSITY]](../assets/blocks/setAmbientLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |
| <code>INTENSITY</code> | number; <code>0.03</code> | — |

### directionalLightNumber

![directional light [LIGHT] [PROPERTY] number](../assets/blocks/directionalLightNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>PROPERTY</code> | string; <code>intensity</code> | <code>intensity</code>, <code>shadow map size</code>, <code>shadow bias</code>, <code>shadow normal bias</code>, <code>shadow distance</code>, <code>shadow near</code>, <code>shadow far</code>, <code>shadow bounds</code> |

### directionalLightText

![directional light [LIGHT] [PROPERTY] text](../assets/blocks/directionalLightText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>PROPERTY</code> | string; <code>color</code> | <code>color</code>, <code>shadow filter</code> |

### directionalLightBoolean

![directional light [LIGHT] [PROPERTY] ?](../assets/blocks/directionalLightBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>PROPERTY</code> | string; <code>casts shadows</code> | <code>casts shadows</code> |

## Point and spot lights

Point lights emit from a world position with finite range. Spot lights add a normalized direction and inner/outer cone angles in degrees. Aim a spot explicitly or toward a world point. Keep inner angle within outer angle, and select a useful finite range. Color, intensity, range and enabled state have separate controls and typed reporters.

The renderer selects a bounded local-light list; the global maximum-light setting can limit how many configured lights contribute. Created, active and selected counts therefore need not match. Changes dirty the retained selection/upload path; a static list is reused. Point/spot shadows are unsupported. Delete local lights with their own deletion block, not by treating them as mesh instances.

### createPointLight

![create point light [NAME]](../assets/blocks/createPointLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>lamp</code> | — |

### createSpotLight

![create spot light [NAME]](../assets/blocks/createSpotLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>spot</code> | — |

### setLocalLightPosition

![set light [LIGHT] position x [X] y [Y] z [Z]](../assets/blocks/setLocalLightPosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>3</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setLocalLightColor

![set light [LIGHT] color [COLOR]](../assets/blocks/setLocalLightColor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>COLOR</code> | color; <code>#ff8844</code> | — |

### setLocalLightIntensity

![set light [LIGHT] intensity [INTENSITY]](../assets/blocks/setLocalLightIntensity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>INTENSITY</code> | number; <code>20</code> | — |

### setLocalLightRange

![set light [LIGHT] range [RANGE]](../assets/blocks/setLocalLightRange.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>RANGE</code> | number; <code>10</code> | — |

### setLocalLightEnabled

![set light [LIGHT] enabled [ENABLED]](../assets/blocks/setLocalLightEnabled.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setSpotLightDirection

![set spot light [LIGHT] direction x [X] y [Y] z [Z]](../assets/blocks/setSpotLightDirection.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>spot</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>-1</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### pointSpotLightToward

![point spot light [LIGHT] toward x [X] y [Y] z [Z]](../assets/blocks/pointSpotLightToward.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>spot</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setSpotLightInnerAngle

![set spot light [LIGHT] inner angle [DEGREES]](../assets/blocks/setSpotLightInnerAngle.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>spot</code> | — |
| <code>DEGREES</code> | angle; <code>20</code> | — |

### setSpotLightOuterAngle

![set spot light [LIGHT] outer angle [DEGREES]](../assets/blocks/setSpotLightOuterAngle.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>spot</code> | — |
| <code>DEGREES</code> | angle; <code>30</code> | — |

### localLightExists

![local light [LIGHT] exists?](../assets/blocks/localLightExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightType

![type of local light [LIGHT]](../assets/blocks/localLightType.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightPosition

![[AXIS] position of local light [LIGHT]](../assets/blocks/localLightPosition.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightIntensity

![intensity of local light [LIGHT]](../assets/blocks/localLightIntensity.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightRange

![range of local light [LIGHT]](../assets/blocks/localLightRange.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightEnabled

![local light [LIGHT] enabled?](../assets/blocks/localLightEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

### localLightText

![local light [LIGHT] [PROPERTY] text](../assets/blocks/localLightText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |
| <code>PROPERTY</code> | string; <code>color</code> | <code>color</code> |

### spotLightNumber

![spot light [LIGHT] [PROPERTY] number](../assets/blocks/spotLightNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>spot</code> | — |
| <code>PROPERTY</code> | string; <code>inner angle degrees</code> | <code>inner angle degrees</code>, <code>outer angle degrees</code>, <code>direction x</code>, <code>direction y</code>, <code>direction z</code> |

### deleteLocalLight

![delete local light [LIGHT]](../assets/blocks/deleteLocalLight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>lamp</code> | — |

## Directional shadows

Shadows require global enablement, a shadow-casting directional light, casters and receiving materials/resources. The quality preset establishes a starting configuration; per-light map size, bias, normal bias, filtering, distance, near/far and bounds permit explicit control. Map dimensions are pixels; other distances/biases follow the light-space/world conventions of the setting.

Use the smallest bounds and distance that cover the intended scene. Too little bias causes acne; too much detaches shadows. Larger maps and PCF filtering increase GPU cost and memory. The global shadow quality/map-size reporters describe policy; directional-light property reporters inspect individual overrides.

Dirty shadow state triggers necessary redraws; static maps can remain cached. Custom contract-v1 materials and blended meshes do not become ordinary directional casters. Neither point/spot shadows nor recursive shadow passes are implied. The debug counters distinguish submitted casters, triangles, maps updated and measured shadow render time.

### setShadowsEnabled

![set shadows [ENABLED]](../assets/blocks/setShadowsEnabled.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setShadowQuality

![set shadow quality [QUALITY]](../assets/blocks/setShadowQuality.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>QUALITY</code> | string; <code>medium</code> | <code>off</code>, <code>low</code>, <code>medium</code>, <code>high</code>, <code>ultra</code>, <code>custom</code> |

### setLightCastsShadows

![set light [LIGHT] cast shadows [ENABLED]](../assets/blocks/setLightCastsShadows.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setResourceCastsShadows

![set [RESOURCE] cast shadows [ENABLED]](../assets/blocks/setResourceCastsShadows.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setResourceReceivesShadows

![set [RESOURCE] receive shadows [ENABLED]](../assets/blocks/setResourceReceivesShadows.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setShadowMapSize

![set light [LIGHT] shadow map size [SIZE]](../assets/blocks/setShadowMapSize.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>SIZE</code> | number; <code>1024</code> | — |

### setShadowBias

![set light [LIGHT] shadow bias [VALUE]](../assets/blocks/setShadowBias.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>0.0015</code> | — |

### setShadowNormalBias

![set light [LIGHT] shadow normal bias [VALUE]](../assets/blocks/setShadowNormalBias.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>0.02</code> | — |

### setShadowFilter

![set light [LIGHT] shadow filtering [FILTER]](../assets/blocks/setShadowFilter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>FILTER</code> | string; <code>pcf-4</code> | <code>hard</code>, <code>pcf-4</code>, <code>pcf-9</code> |

### setShadowDistance

![set light [LIGHT] shadow distance [VALUE]](../assets/blocks/setShadowDistance.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>40</code> | — |

### setShadowCameraNear

![set light [LIGHT] shadow camera near [VALUE]](../assets/blocks/setShadowCameraNear.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>1</code> | — |

### setShadowCameraFar

![set light [LIGHT] shadow camera far [VALUE]](../assets/blocks/setShadowCameraFar.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>100</code> | — |

### setShadowBounds

![set light [LIGHT] shadow bounds [VALUE]](../assets/blocks/setShadowBounds.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |
| <code>VALUE</code> | number; <code>25</code> | — |

### shadowsEnabled

![shadows enabled?](../assets/blocks/shadowsEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowQuality

![shadow quality](../assets/blocks/shadowQuality.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### shadowMapSize

![shadow map size of [LIGHT]](../assets/blocks/shadowMapSize.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>LIGHT</code> | string; <code>sun</code> | — |

## Environment resources

Create a solid-color environment or one sourced from an existing equirectangular texture, then assign it to the scene. A texture-backed environment must reach ready state before useful lighting can be expected. Replacing its source retains/releases the corresponding texture. Clear the scene environment to detach it without destroying the shared asset.

Intensity is a lighting factor, rotation is yaw in degrees and background enablement controls whether the environment is drawn behind objects. PBR materials receive environment lighting; basic-lit/unlit do not automatically become reflective. State/text reporters expose source texture and errors; users indicates retained consumers.

Source/quality changes may preprocess reusable environment resources. Yaw and intensity are uniform changes and do not reprocess the image. This is standard-range environment lighting, not HDR rendering or dynamic reflection probes. Delete scene references before deleting environments or their textures.

### createSolidEnvironment

![create environment [ENVIRONMENT] with solid color [COLOR]](../assets/blocks/createSolidEnvironment.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>studio</code> | — |
| <code>COLOR</code> | color; <code>#7aa5d8</code> | — |

### createEnvironmentFromTexture

![create environment [ENVIRONMENT] from equirectangular texture [TEXTURE]](../assets/blocks/createEnvironmentFromTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
| <code>TEXTURE</code> | string; <code>environmentMap</code> | — |

### setEnvironmentTexture

![set environment [ENVIRONMENT] source texture [TEXTURE]](../assets/blocks/setEnvironmentTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
| <code>TEXTURE</code> | string; <code>environmentMap</code> | — |

### setSceneEnvironment

![set scene environment [ENVIRONMENT]](../assets/blocks/setSceneEnvironment.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### clearSceneEnvironment

![clear scene environment](../assets/blocks/clearSceneEnvironment.svg)

**Command.** See the group guide above.

### setEnvironmentIntensity

![set environment [ENVIRONMENT] intensity [INTENSITY]](../assets/blocks/setEnvironmentIntensity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
| <code>INTENSITY</code> | number; <code>1</code> | — |

### setEnvironmentRotation

![set environment [ENVIRONMENT] rotation [ROTATION]](../assets/blocks/setEnvironmentRotation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
| <code>ROTATION</code> | angle; <code>0</code> | — |

### setEnvironmentBackground

![set environment [ENVIRONMENT] background [ENABLED]](../assets/blocks/setEnvironmentBackground.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
| <code>ENABLED</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### environmentExists

![environment [ENVIRONMENT] exists?](../assets/blocks/environmentExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### environmentState

![environment [ENVIRONMENT] state](../assets/blocks/environmentState.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### activeEnvironment

![active scene environment](../assets/blocks/activeEnvironment.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

### environmentUsers

![environment [ENVIRONMENT] users](../assets/blocks/environmentUsers.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### environmentIntensity

![environment [ENVIRONMENT] intensity](../assets/blocks/environmentIntensity.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### environmentRotation

![environment [ENVIRONMENT] rotation](../assets/blocks/environmentRotation.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### environmentBackgroundEnabled

![environment [ENVIRONMENT] background enabled?](../assets/blocks/environmentBackgroundEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |

### environmentText

![environment [ENVIRONMENT] [PROPERTY] text](../assets/blocks/environmentText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>environment</code> | — |
| <code>PROPERTY</code> | string; <code>source texture</code> | <code>source texture</code>, <code>error</code> |

### deleteEnvironment

![delete environment [ENVIRONMENT]](../assets/blocks/deleteEnvironment.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ENVIRONMENT</code> | string; <code>outdoors</code> | — |
