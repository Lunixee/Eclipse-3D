# Materials & Textures

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Materials, assignment and surface state](#materials-assignment-and-surface-state)
- [PBR and shader preparation](#pbr-and-shader-preparation)
- [Textures and sampling](#textures-and-sampling)

## Materials, assignment and surface state

Create a named `unlit`, `basic-lit` or `pbr` material and assign it to resources. Cloning makes independent material settings while retaining referenced textures. `setMaterialColor` is the older resource-targeted convenience operation; `setMaterialBaseColor` addresses a named shared material. Editing a shared material affects all of its users.

Base color multiplies texture and tint. Emissive color/intensity adds surface emission; it does not create a light. Opacity and alpha cutoff use percent in the material blocks. Alpha mode selects opaque, cutout or blended behavior. Side selects front/back/double rendering. Blend selection establishes sensible depth-write defaults; an explicit depth-write block can override them. Transparent instances are not globally depth-sorted.

Depth test determines visibility against depth already drawn; depth write determines whether later draws see this surface. Render order sorts within the mesh opaque/cutout or blended queue. Polygon offsets help coplanar surfaces; they are not a substitute for appropriate geometry or clipping planes. Effects remain a separate render phase. Custom materials use their shader-defined discard instead of the ordinary cutout path.

PBR environment intensity/yaw modify material IBL binding without rebuilding the environment; background is unaffected. Material number/text/Boolean families expose the selected retained factor, texture name, render-state flag or color. PBR-only fields require a PBR material. Users count references; detach or delete consumers before deleting a material. See [Materials & Lighting example](../../examples/materials-lighting/README.md).

### createMaterial

![create material [MATERIAL] type [TYPE]](../assets/blocks/createMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>TYPE</code> | string; <code>basic-lit</code> | <code>unlit</code>, <code>basic-lit</code>, <code>pbr</code> |

### cloneMaterial

![clone material [SOURCE] as [MATERIAL]](../assets/blocks/cloneMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SOURCE</code> | string; <code>surface</code> | — |
| <code>MATERIAL</code> | string; <code>surface copy</code> | — |

### setResourceMaterial

![set [RESOURCE] material [MATERIAL]](../assets/blocks/setResourceMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

### setMaterialColor

![set [NAME] material color [COLOR]](../assets/blocks/setMaterialColor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>COLOR</code> | color; <code>#3388ee</code> | — |

### setMaterialBaseColor

![set material [MATERIAL] base color [COLOR]](../assets/blocks/setMaterialBaseColor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |

### setMaterialOpacity

![set material [MATERIAL] opacity [OPACITY] %](../assets/blocks/setMaterialOpacity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>OPACITY</code> | number; <code>100</code> | — |

### setMaterialTexture

![set material [MATERIAL] texture [TEXTURE]](../assets/blocks/setMaterialTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>TEXTURE</code> | string; <code>checker</code> | — |

### setMaterialEmissive

![set material [MATERIAL] emissive color [COLOR] intensity [INTENSITY]](../assets/blocks/setMaterialEmissive.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>COLOR</code> | color; <code>#000000</code> | — |
| <code>INTENSITY</code> | number; <code>0</code> | — |

### setMaterialEmissiveIntensity

![set material [MATERIAL] emissive intensity [INTENSITY]](../assets/blocks/setMaterialEmissiveIntensity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>INTENSITY</code> | number; <code>1</code> | — |

### setMaterialDoubleSided

![set material [MATERIAL] double sided [ENABLED]](../assets/blocks/setMaterialDoubleSided.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>ENABLED</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### setMaterialDepthTest

![set material [MATERIAL] depth test [ENABLED]](../assets/blocks/setMaterialDepthTest.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setMaterialDepthWrite

![set material [MATERIAL] depth write [ENABLED]](../assets/blocks/setMaterialDepthWrite.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setMaterialAlphaMode

![set material [MATERIAL] alpha mode [MODE]](../assets/blocks/setMaterialAlphaMode.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>MODE</code> | string; <code>opaque</code> | <code>opaque</code>, <code>cutout</code>, <code>blend</code> |

### setMaterialAlphaCutoff

![set material [MATERIAL] alpha cutoff [CUTOFF] %](../assets/blocks/setMaterialAlphaCutoff.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |
| <code>CUTOFF</code> | number; <code>50</code> | — |

### setMaterialSide

![set material [MATERIAL] side [SIDE]](../assets/blocks/setMaterialSide.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>SIDE</code> | string; <code>front</code> | <code>front</code>, <code>back</code>, <code>double</code> |

### setMaterialBlendMode

![set material [MATERIAL] blend [MODE]](../assets/blocks/setMaterialBlendMode.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>MODE</code> | string; <code>opaque</code> | <code>opaque</code>, <code>normal</code>, <code>additive</code> |

### setMaterialRenderNumber

![set material [MATERIAL] render [PROPERTY] [VALUE]](../assets/blocks/setMaterialRenderNumber.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>renderOrder</code> | <code>renderOrder</code>, <code>polygonOffsetFactor</code>, <code>polygonOffsetUnits</code> |
| <code>VALUE</code> | number; <code>0</code> | — |

### setMaterialEnvironmentFactor

![set PBR material [MATERIAL] environment [PROPERTY] [VALUE]](../assets/blocks/setMaterialEnvironmentFactor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>intensity</code> | <code>intensity</code>, <code>rotation</code> |
| <code>VALUE</code> | number; <code>1</code> | — |

### materialExists

![material [MATERIAL] exists?](../assets/blocks/materialExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

### materialOfResource

![material of [RESOURCE]](../assets/blocks/materialOfResource.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |

### materialType

![type of material [MATERIAL]](../assets/blocks/materialType.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

### materialUsers

![material [MATERIAL] users](../assets/blocks/materialUsers.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

### materialNumber

![material [MATERIAL] [PROPERTY] number](../assets/blocks/materialNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>opacity %</code> | <code>opacity %</code>, <code>alpha cutoff %</code>, <code>emissive intensity</code>, <code>normal strength</code>, <code>ao strength</code>, <code>render order</code>, <code>polygon offset factor</code>, <code>polygon offset units</code>, <code>environment intensity</code>, <code>environment rotation degrees</code> |

### materialText

![material [MATERIAL] [PROPERTY] text](../assets/blocks/materialText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>side</code> | <code>side</code>, <code>alpha mode</code>, <code>blend</code>, <code>shader</code>, <code>base color</code>, <code>emissive color</code>, <code>base texture</code>, <code>normal texture</code>, <code>metallic texture</code>, <code>roughness texture</code>, <code>metallic roughness texture</code>, <code>emissive texture</code>, <code>ambient occlusion texture</code> |

### materialBoolean

![material [MATERIAL] [PROPERTY] ?](../assets/blocks/materialBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>depth test</code> | <code>depth test</code>, <code>depth write</code>, <code>double sided</code> |

### deleteMaterial

![delete material [MATERIAL]](../assets/blocks/deleteMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

## PBR and shader preparation

Metallic and roughness are metallic/roughness PBR factors; normal and AO strengths scale their maps. Metallic/roughness data and normal/AO maps are linear data, while base/emissive color textures normally use sRGB. The combined metallic-roughness map follows glTF channel conventions. Removing a map releases its reference; it does not delete the shared texture.

PBR metallic and roughness reporters return factors. `warmMaterialShader` prepares the shader variant on demand so its first compile can occur during loading. Warmup cannot guarantee every later material/state variant is already compiled. Factor/uniform changes should not be treated as new shader sources. Use shader compile and program-switch counters to confirm the behavior in a representative scene.

### setPbrFactor

![set PBR material [MATERIAL] [PROPERTY] [VALUE]](../assets/blocks/setPbrFactor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>material</code> | — |
| <code>PROPERTY</code> | string; <code>metallic</code> | <code>metallic</code>, <code>roughness</code>, <code>normal strength</code>, <code>AO strength</code> |
| <code>VALUE</code> | number; <code>0</code> | — |

### setPbrMapTexture

![set PBR material [MATERIAL] [MAP] texture [TEXTURE]](../assets/blocks/setPbrMapTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>metal</code> | — |
| <code>MAP</code> | string; <code>normal</code> | <code>normal</code>, <code>metallic</code>, <code>roughness</code>, <code>metallic-roughness</code>, <code>emissive</code>, <code>ambient-occlusion</code> |
| <code>TEXTURE</code> | string; <code>surface map</code> | — |

### removePbrMapTexture

![remove [MAP] texture from PBR material [MATERIAL]](../assets/blocks/removePbrMapTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MAP</code> | string; <code>normal</code> | <code>normal</code>, <code>metallic</code>, <code>roughness</code>, <code>metallic-roughness</code>, <code>emissive</code>, <code>ambient-occlusion</code> |
| <code>MATERIAL</code> | string; <code>metal</code> | — |

### pbrMetallic

![metallic of PBR material [MATERIAL]](../assets/blocks/pbrMetallic.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>metal</code> | — |

### pbrRoughness

![roughness of PBR material [MATERIAL]](../assets/blocks/pbrRoughness.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>metal</code> | — |

### warmMaterialShader

![prepare shader for material [MATERIAL]](../assets/blocks/warmMaterialShader.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MATERIAL</code> | string; <code>metal</code> | — |

## Textures and sampling

Generated textures need no external files. URL/data-URI textures load asynchronously, costumes use the current Scratch target asset, and file loading requires an accepted user interaction. Check state/error and dimensions before relying on an external texture. The named texture can be shared by materials, effects, environments and custom samplers.

UV offset/repeat/rotation are retained sampling transforms. Minification filters may use mipmaps; magnification supports nearest/linear only. Wrap U/V independently with clamp/repeat/mirror. Mipmap, flip-Y, anisotropy and color-space controls affect texture interpretation/sampling. Mark color images sRGB and data maps linear; changing color space is not an image-conversion tool. Device limits may cap effective anisotropy.

The typed filter/wrap/Boolean blocks expose validated options; `setTextureOption` remains available for its existing option contract. Texture reporters return dimensions in pixels, user count, settings, load state or failure text. Deletion rejects textures retained by consumers, including render-target use. Unchanged frames reuse GPU storage rather than decoding or uploading again.

### createGeneratedTexture

![create texture [TEXTURE] preset [PRESET] color [PRIMARY] second [SECONDARY] size [SIZE]](../assets/blocks/createGeneratedTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |
| <code>PRESET</code> | string; <code>checker</code> | <code>solid</code>, <code>checker</code> |
| <code>PRIMARY</code> | color; <code>#ffffff</code> | — |
| <code>SECONDARY</code> | color; <code>#202020</code> | — |
| <code>SIZE</code> | number; <code>64</code> | — |

### loadTextureFromSource

![load texture [TEXTURE] from URL or data URI [SOURCE]](../assets/blocks/loadTextureFromSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>image</code> | — |
| <code>SOURCE</code> | string; <code>data:image/png;base64,...</code> | — |

### loadTextureFromCostume

![load texture [TEXTURE] from costume [COSTUME]](../assets/blocks/loadTextureFromCostume.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>costumeTexture</code> | — |
| <code>COSTUME</code> | string; <code>costume1</code> | — |

### loadTextureFromFile

![load texture [TEXTURE] from selected image file](../assets/blocks/loadTextureFromFile.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>localTexture</code> | — |

### setResourceTexture

![set [RESOURCE] texture [TEXTURE]](../assets/blocks/setResourceTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>TEXTURE</code> | string; <code>checker</code> | — |

### setTextureOption

![set texture [TEXTURE] option [OPTION] to [VALUE]](../assets/blocks/setTextureOption.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |
| <code>OPTION</code> | string; <code>min-filter</code> | <code>min-filter</code>, <code>mag-filter</code>, <code>wrap-u</code>, <code>wrap-v</code>, <code>mipmaps</code>, <code>anisotropy</code>, <code>color-space</code>, <code>flip-y</code> |
| <code>VALUE</code> | string; <code>linear-mipmap-linear</code> | — |

### setTextureUV

![set texture [TEXTURE] UV offset [OFFSET_X] [OFFSET_Y] repeat [REPEAT_X] [REPEAT_Y] rotation [ROTATION]](../assets/blocks/setTextureUV.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |
| <code>OFFSET_X</code> | number; <code>0</code> | — |
| <code>OFFSET_Y</code> | number; <code>0</code> | — |
| <code>REPEAT_X</code> | number; <code>1</code> | — |
| <code>REPEAT_Y</code> | number; <code>1</code> | — |
| <code>ROTATION</code> | angle; <code>0</code> | — |

### setTextureFilter

![set texture [TEXTURE] [FILTER] [VALUE]](../assets/blocks/setTextureFilter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>FILTER</code> | string; <code>min-filter</code> | <code>min-filter</code>, <code>mag-filter</code> |
| <code>VALUE</code> | string; <code>linear</code> | <code>nearest</code>, <code>linear</code>, <code>nearest-mipmap-nearest</code>, <code>linear-mipmap-nearest</code>, <code>nearest-mipmap-linear</code>, <code>linear-mipmap-linear</code> |

### setTextureWrap

![set texture [TEXTURE] wrap [AXIS] [VALUE]](../assets/blocks/setTextureWrap.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>AXIS</code> | string; <code>u</code> | <code>u</code>, <code>v</code> |
| <code>VALUE</code> | string; <code>repeat</code> | <code>clamp</code>, <code>repeat</code>, <code>mirror</code> |

### setTextureBooleanOption

![set texture [TEXTURE] [OPTION] [ENABLED]](../assets/blocks/setTextureBooleanOption.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>OPTION</code> | string; <code>mipmaps</code> | <code>mipmaps</code>, <code>flip-y</code> |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setTextureAnisotropy

![set texture [TEXTURE] anisotropy [VALUE]](../assets/blocks/setTextureAnisotropy.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>VALUE</code> | number; <code>1</code> | — |

### setTextureColorSpace

![set texture [TEXTURE] color space [SPACE]](../assets/blocks/setTextureColorSpace.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>SPACE</code> | string; <code>srgb</code> | <code>srgb</code>, <code>linear</code> |

### textureExists

![texture [TEXTURE] exists?](../assets/blocks/textureExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |

### textureState

![texture [TEXTURE] state](../assets/blocks/textureState.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |

### textureError

![texture [TEXTURE] error](../assets/blocks/textureError.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>image</code> | — |

### textureDimension

![texture [TEXTURE] [DIMENSION]](../assets/blocks/textureDimension.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>DIMENSION</code> | string; <code>width</code> | <code>width</code>, <code>height</code> |

### textureUsers

![texture [TEXTURE] users](../assets/blocks/textureUsers.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>checker</code> | — |

### textureNumber

![texture [TEXTURE] [PROPERTY] number](../assets/blocks/textureNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>PROPERTY</code> | string; <code>anisotropy</code> | <code>anisotropy</code>, <code>offset u</code>, <code>offset v</code>, <code>repeat u</code>, <code>repeat v</code>, <code>rotation degrees</code> |

### textureText

![texture [TEXTURE] [PROPERTY] text](../assets/blocks/textureText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>PROPERTY</code> | string; <code>min filter</code> | <code>min filter</code>, <code>mag filter</code>, <code>wrap u</code>, <code>wrap v</code>, <code>color space</code> |

### textureBoolean

![texture [TEXTURE] [PROPERTY] ?](../assets/blocks/textureBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>texture</code> | — |
| <code>PROPERTY</code> | string; <code>mipmaps</code> | <code>mipmaps</code>, <code>flip y</code> |

### deleteTexture

![delete texture [TEXTURE]](../assets/blocks/deleteTexture.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXTURE</code> | string; <code>image</code> | — |
