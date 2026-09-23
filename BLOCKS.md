# Block and menu inventory

The visual [block reference](docs/reference/index.md) covers current usage and defaults. This inventory includes every registered opcode, including hidden compatibility aliases. API v19 is preserved with one additive convenience command: `importModelFile`.

<!-- block-inventory:start -->
## Complete registered block inventory

Generated from production registration with `node scripts/block-inventory.mjs --write`; API version 19 preserves existing serialized blocks and menus.

Original discovery: 426. Current registration: 582. Visible palette: 560 (476 independent entries plus 84 canonical family blocks). Retained hidden legacy aliases: 22; other hidden/internal: 0; removed: 0; unresolved: 0.

Every registered block is an independent command/reporter, a canonical property family, or a retained compatibility alias. The three palette buttons are UI controls without serialized opcodes and are excluded from these totals.

Canonical family blocks are marked “family” below. Legacy opcodes keep their original argument names, types, menus and defaults; they execute in loaded projects but are omitted from the palette. The numeric/text ray reporters have separate menus and stable return types. Existing mixed `rayHitValue` behavior remains only for compatibility.

### Consolidation families

| Family | Preferred opcode(s) | Legacy opcode(s) | Reason |
| --- | --- | --- | --- |
| Post color factors | `setPostColorFactor` | `setPostBrightness`, `setPostContrast`, `setPostSaturation` | Three dimensionless numeric color factors share one command. |
| Bloom factors | `setBloomFactor` | `setBloomIntensity`, `setBloomThreshold` | Numeric intensity and luminance threshold; quality remains separate. |
| Vignette factors | `setVignetteFactor` | `setVignetteIntensity`, `setVignetteRadius`, `setVignetteSoftness` | Three numeric vignette controls share one command. |
| PBR factors | `setPbrFactor` | `setPbrMetallic`, `setPbrRoughness`, `setPbrNormalStrength`, `setPbrAoStrength` | Numeric factors share material lookup; colors, textures and toggles remain separate. |
| Material creation | `createMaterial` | `createPbrMaterial` | Existing material type menu already includes PBR. |
| Camera clip planes | `setCameraClip` | `setCameraNearClip`, `setCameraFarClip` | Both distances use the same validated projection update. |
| Texture dimensions | `textureDimension` | `textureWidth`, `textureHeight` | Width/height are numeric dimensions of the same named texture. |
| Target dimensions | `renderTargetDimension` | `renderTargetWidth`, `renderTargetHeight` | Width/height are numeric dimensions of the same named render target. |
| Internal render dimensions | `internalRenderDimension` | `internalRenderWidth`, `internalRenderHeight` | Both report allocated render pixels; pixel count remains distinct. |
| Typed ray results | `rayHitNumber`, `rayHitText` | `rayHitValue` | Separate numeric and text fields; hit/miss remains a Boolean block. |

### Every registered block

| Opcode | Type / disposition | Text |
| --- | --- | --- |
| `initializeEngine` | command / CANONICAL-INDEPENDENT | initialize 3D engine using [BACKEND] |
| `createScene` | command / CANONICAL-INDEPENDENT | create 3D scene [SCENE] |
| `setActiveScene` | command / CANONICAL-INDEPENDENT | set active 3D scene [SCENE] |
| `setSceneBackground` | command / CANONICAL-INDEPENDENT | set scene background [COLOR] opacity [OPACITY] % |
| `sceneExists` | Boolean / CANONICAL-INDEPENDENT | 3D scene [SCENE] exists? |
| `sceneText` | reporter / CANONICAL-FAMILY | scene [PROPERTY] text |
| `sceneNumber` | reporter / CANONICAL-FAMILY | scene [PROPERTY] number |
| `engineInitialized` | Boolean / CANONICAL-INDEPENDENT | 3D engine initialized? |
| `renderOneFrame` | command / CANONICAL-INDEPENDENT | render one 3D frame |
| `deleteScene` | command / CANONICAL-INDEPENDENT | delete 3D scene [SCENE] |
| `resetEngine` | command / CANONICAL-INDEPENDENT | reset 3D engine |
| `disposeEngine` | command / CANONICAL-INDEPENDENT | dispose 3D engine |
| `createCamera` | command / CANONICAL-INDEPENDENT | create camera [NAME] field of view [FOV] |
| `setActiveCamera` | command / CANONICAL-INDEPENDENT | set active camera [NAME] |
| `lookCameraAt` | command / CANONICAL-INDEPENDENT | point camera [CAMERA] at world [X] [Y] [Z] |
| `setCameraFov` | command / CANONICAL-INDEPENDENT | set camera [CAMERA] FOV [FOV] |
| `changeCameraFov` | command / CANONICAL-INDEPENDENT | change camera [CAMERA] FOV by [AMOUNT] |
| `setCameraClip` | command / CANONICAL-FAMILY | set camera [CAMERA] [PLANE] clip [DISTANCE] |
| `cameraNumber` | reporter / CANONICAL-FAMILY | camera [CAMERA] [PROPERTY] number |
| `moveCameraLocal` | command / CANONICAL-INDEPENDENT | move camera [CAMERA] [BASIS] by [DISTANCE] |
| `rotateCamera` | command / CANONICAL-INDEPENDENT | rotate camera [CAMERA] [AXIS] by [DEGREES] degrees |
| `cameraBasisComponent` | reporter / CANONICAL-INDEPENDENT | camera [CAMERA] [BASIS] [AXIS] |
| `pointAheadOfCamera` | reporter / CANONICAL-INDEPENDENT | point [DISTANCE] ahead of camera [CAMERA] [AXIS] |
| `createCube` | command / CANONICAL-INDEPENDENT | create cube [NAME] |
| `createCubeInstances` | command / CANONICAL-INDEPENDENT | create instance group [GROUP] with [COUNT] cubes spacing [SPACING] |
| `setPosition` | command / CANONICAL-INDEPENDENT | set [NAME] position x [X] y [Y] z [Z] |
| `setRotation` | command / CANONICAL-INDEPENDENT | set [NAME] rotation x [X] y [Y] z [Z] |
| `setScale` | command / CANONICAL-INDEPENDENT | set [NAME] scale x [X] y [Y] z [Z] |
| `rotateResourceBy` | command / CANONICAL-FAMILY | rotate 3D resource [RESOURCE] by x [X] y [Y] z [Z] degrees |
| `setInstancePosition` | command / CANONICAL-INDEPENDENT | set instance [INDEX] of [GROUP] position x [X] y [Y] z [Z] |
| `setInstanceTransform` | command / CANONICAL-FAMILY | set instance [INDEX] of [GROUP] [PROPERTY] x [X] y [Y] z [Z] (rotation in degrees) |
| `lookObjectAt` | command / CANONICAL-INDEPENDENT | point 3D resource [RESOURCE] toward x [X] y [Y] z [Z] |
| `copyResourceTransform` | command / CANONICAL-INDEPENDENT | copy [PROPERTY] from [FROM] to [TO] |
| `setResourceVisible` | command / CANONICAL-INDEPENDENT | set 3D resource [RESOURCE] visible [ENABLED] |
| `setResourceTint` | command / CANONICAL-FAMILY | set 3D resource [RESOURCE] tint [COLOR] opacity [OPACITY] % |
| `setInstanceTint` | command / CANONICAL-FAMILY | set instance [INDEX] of [GROUP] tint [COLOR] opacity [OPACITY] % |
| `resourceExists` | Boolean / CANONICAL-INDEPENDENT | 3D resource [RESOURCE] exists? |
| `resourceKind` | reporter / CANONICAL-INDEPENDENT | 3D resource [RESOURCE] kind |
| `resourceVisible` | Boolean / CANONICAL-INDEPENDENT | 3D resource [RESOURCE] visible? |
| `resourceTransform` | reporter / CANONICAL-FAMILY | 3D resource [RESOURCE] [PROPERTY] [AXIS] (rotation in degrees) |
| `instanceTransform` | reporter / CANONICAL-FAMILY | instance [INDEX] of [GROUP] [PROPERTY] [AXIS] (rotation in degrees) |
| `resourceTint` | reporter / CANONICAL-FAMILY | 3D resource [RESOURCE] tint [COMPONENT] (RGB 0-255, alpha %) |
| `instanceTint` | reporter / CANONICAL-FAMILY | instance [INDEX] of [GROUP] tint [COMPONENT] (RGB 0-255, alpha %) |
| `instanceGroupNumber` | reporter / CANONICAL-FAMILY | instance group [GROUP] [PROPERTY] number |
| `deleteResource` | command / CANONICAL-INDEPENDENT | delete 3D resource [NAME] |
| `loadModelFromSource` | command / CANONICAL-INDEPENDENT | load glTF model [MODEL] from [SOURCE] |
| `importModelFile` | command / CANONICAL-INDEPENDENT | import 3D model file as [MODEL] |
| `loadModelFromFile` | command / CANONICAL-INDEPENDENT | load glTF model [MODEL] from local file |
| `createModelInstance` | command / CANONICAL-INDEPENDENT | create model instance [NAME] from [MODEL] |
| `createModelInstances` | command / CANONICAL-INDEPENDENT | create [COUNT] instances of model [MODEL] named [PREFIX] |
| `setModelNodePosition` | command / CANONICAL-INDEPENDENT | set node [NODE] of model instance [NAME] position x [X] y [Y] z [Z] |
| `modelExists` | Boolean / CANONICAL-INDEPENDENT | model [MODEL] exists? |
| `modelState` | reporter / CANONICAL-INDEPENDENT | state of model [MODEL] |
| `modelError` | reporter / CANONICAL-INDEPENDENT | error of model [MODEL] |
| `modelNodeCount` | reporter / CANONICAL-INDEPENDENT | node count of model [MODEL] |
| `modelPrimitiveCount` | reporter / CANONICAL-INDEPENDENT | primitive count of model [MODEL] |
| `modelTriangleCount` | reporter / CANONICAL-INDEPENDENT | triangle count of model [MODEL] |
| `modelNodeText` | reporter / CANONICAL-FAMILY | model [MODEL] node [INDEX] [PROPERTY] text |
| `modelNodeNumber` | reporter / CANONICAL-FAMILY | model [MODEL] node [INDEX] [PROPERTY] number |
| `modelSkinText` | reporter / CANONICAL-INDEPENDENT | model [MODEL] skin [INDEX] name |
| `modelSkinNumber` | reporter / CANONICAL-FAMILY | model [MODEL] skin [INDEX] [PROPERTY] joint [JOINT] |
| `modelInfoNumber` | reporter / CANONICAL-FAMILY | model asset [MODEL] [PROPERTY] number |
| `modelInstanceText` | reporter / CANONICAL-FAMILY | model instance [INSTANCE] [PROPERTY] text |
| `modelInstanceNumber` | reporter / CANONICAL-FAMILY | model instance [INSTANCE] [PROPERTY] number |
| `modelInstanceBoolean` | Boolean / CANONICAL-FAMILY | model instance [INSTANCE] [PROPERTY] ? |
| `deleteModelAsset` | command / CANONICAL-INDEPENDENT | delete model asset [MODEL] |
| `setResourceFrustumCulling` | command / CANONICAL-INDEPENDENT | set frustum culling of [RESOURCE] [ENABLED] |
| `resourceFrustumCullingEnabled` | Boolean / CANONICAL-INDEPENDENT | frustum culling of [RESOURCE] enabled? |
| `createLodGroup` | command / CANONICAL-INDEPENDENT | create LOD group [GROUP] |
| `addLodLevel` | command / CANONICAL-INDEPENDENT | add model [MODEL] to LOD group [GROUP] at distance [DISTANCE] |
| `assignModelLodGroup` | command / CANONICAL-INDEPENDENT | set LOD group of model instance [INSTANCE] to [GROUP] |
| `clearModelLodGroup` | command / CANONICAL-INDEPENDENT | clear LOD group of model instance [INSTANCE] |
| `setModelLodEnabled` | command / CANONICAL-INDEPENDENT | set LOD of model instance [INSTANCE] [ENABLED] |
| `setModelLodHysteresis` | command / CANONICAL-INDEPENDENT | set LOD hysteresis of [INSTANCE] to [DISTANCE] |
| `forceModelLodLevel` | command / CANONICAL-INDEPENDENT | force LOD level of [INSTANCE] to [LEVEL] |
| `modelLodGroup` | reporter / CANONICAL-INDEPENDENT | LOD group of [INSTANCE] |
| `currentModelLodLevel` | reporter / CANONICAL-INDEPENDENT | current LOD level of [INSTANCE] |
| `lodLevelText` | reporter / CANONICAL-FAMILY | LOD group [GROUP] level [LEVEL] model |
| `lodLevelNumber` | reporter / CANONICAL-FAMILY | LOD group [GROUP] level [LEVEL] threshold |
| `lodGroupLevelCount` | reporter / CANONICAL-INDEPENDENT | level count of LOD group [GROUP] |
| `lodGroupExists` | Boolean / CANONICAL-INDEPENDENT | LOD group [GROUP] exists? |
| `deleteLodGroup` | command / CANONICAL-INDEPENDENT | delete LOD group [GROUP] |
| `createCustomGeometry` | command / CANONICAL-INDEPENDENT | create [USAGE] geometry [GEOMETRY] data JSON [DATA] |
| `updateCustomGeometry` | command / CANONICAL-INDEPENDENT | replace dynamic geometry [GEOMETRY] data JSON [DATA] |
| `createGeometryModel` | command / CANONICAL-INDEPENDENT | create model [MODEL] from geometry [GEOMETRY] material [MATERIAL] |
| `customGeometryExists` | Boolean / CANONICAL-INDEPENDENT | custom geometry [GEOMETRY] exists? |
| `customGeometryNumber` | reporter / CANONICAL-FAMILY | custom geometry [GEOMETRY] [PROPERTY] number |
| `customGeometryBoolean` | Boolean / CANONICAL-FAMILY | custom geometry [GEOMETRY] [PROPERTY] ? |
| `customGeometryText` | reporter / CANONICAL-FAMILY | custom geometry [GEOMETRY] [PROPERTY] text |
| `deleteCustomGeometry` | command / CANONICAL-INDEPENDENT | delete custom geometry [GEOMETRY] |
| `createMaterial` | command / CANONICAL-FAMILY | create material [MATERIAL] type [TYPE] |
| `cloneMaterial` | command / CANONICAL-INDEPENDENT | clone material [SOURCE] as [MATERIAL] |
| `setResourceMaterial` | command / CANONICAL-INDEPENDENT | set [RESOURCE] material [MATERIAL] |
| `setMaterialColor` | command / CANONICAL-INDEPENDENT | set [NAME] material color [COLOR] |
| `setMaterialBaseColor` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] base color [COLOR] |
| `setMaterialOpacity` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] opacity [OPACITY] % |
| `setMaterialTexture` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] texture [TEXTURE] |
| `setMaterialEmissive` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] emissive color [COLOR] intensity [INTENSITY] |
| `setMaterialEmissiveIntensity` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] emissive intensity [INTENSITY] |
| `setMaterialDoubleSided` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] double sided [ENABLED] |
| `setMaterialDepthTest` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] depth test [ENABLED] |
| `setMaterialDepthWrite` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] depth write [ENABLED] |
| `setMaterialAlphaMode` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] alpha mode [MODE] |
| `setMaterialAlphaCutoff` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] alpha cutoff [CUTOFF] % |
| `setMaterialSide` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] side [SIDE] |
| `setMaterialBlendMode` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] blend [MODE] |
| `setMaterialRenderNumber` | command / CANONICAL-INDEPENDENT | set material [MATERIAL] render [PROPERTY] [VALUE] |
| `setMaterialEnvironmentFactor` | command / CANONICAL-INDEPENDENT | set PBR material [MATERIAL] environment [PROPERTY] [VALUE] |
| `materialExists` | Boolean / CANONICAL-INDEPENDENT | material [MATERIAL] exists? |
| `materialOfResource` | reporter / CANONICAL-INDEPENDENT | material of [RESOURCE] |
| `materialType` | reporter / CANONICAL-INDEPENDENT | type of material [MATERIAL] |
| `materialUsers` | reporter / CANONICAL-INDEPENDENT | material [MATERIAL] users |
| `materialNumber` | reporter / CANONICAL-FAMILY | material [MATERIAL] [PROPERTY] number |
| `materialText` | reporter / CANONICAL-FAMILY | material [MATERIAL] [PROPERTY] text |
| `materialBoolean` | Boolean / CANONICAL-FAMILY | material [MATERIAL] [PROPERTY] ? |
| `deleteMaterial` | command / CANONICAL-INDEPENDENT | delete material [MATERIAL] |
| `setPbrFactor` | command / CANONICAL-FAMILY | set PBR material [MATERIAL] [PROPERTY] [VALUE] |
| `setPbrMapTexture` | command / CANONICAL-INDEPENDENT | set PBR material [MATERIAL] [MAP] texture [TEXTURE] |
| `removePbrMapTexture` | command / CANONICAL-INDEPENDENT | remove [MAP] texture from PBR material [MATERIAL] |
| `pbrMetallic` | reporter / CANONICAL-INDEPENDENT | metallic of PBR material [MATERIAL] |
| `pbrRoughness` | reporter / CANONICAL-INDEPENDENT | roughness of PBR material [MATERIAL] |
| `warmMaterialShader` | command / CANONICAL-INDEPENDENT | prepare shader for material [MATERIAL] |
| `createGeneratedTexture` | command / CANONICAL-INDEPENDENT | create texture [TEXTURE] preset [PRESET] color [PRIMARY] second [SECONDARY] size [SIZE] |
| `loadTextureFromSource` | command / CANONICAL-INDEPENDENT | load texture [TEXTURE] from URL or data URI [SOURCE] |
| `loadTextureFromCostume` | command / CANONICAL-INDEPENDENT | load texture [TEXTURE] from costume [COSTUME] |
| `loadTextureFromFile` | command / CANONICAL-INDEPENDENT | load texture [TEXTURE] from selected image file |
| `setResourceTexture` | command / CANONICAL-INDEPENDENT | set [RESOURCE] texture [TEXTURE] |
| `setTextureOption` | command / CANONICAL-INDEPENDENT | set texture [TEXTURE] option [OPTION] to [VALUE] |
| `setTextureUV` | command / CANONICAL-INDEPENDENT | set texture [TEXTURE] UV offset [OFFSET_X] [OFFSET_Y] repeat [REPEAT_X] [REPEAT_Y] rotation [ROTATION] |
| `setTextureFilter` | command / CANONICAL-FAMILY | set texture [TEXTURE] [FILTER] [VALUE] |
| `setTextureWrap` | command / CANONICAL-FAMILY | set texture [TEXTURE] wrap [AXIS] [VALUE] |
| `setTextureBooleanOption` | command / CANONICAL-FAMILY | set texture [TEXTURE] [OPTION] [ENABLED] |
| `setTextureAnisotropy` | command / CANONICAL-INDEPENDENT | set texture [TEXTURE] anisotropy [VALUE] |
| `setTextureColorSpace` | command / CANONICAL-INDEPENDENT | set texture [TEXTURE] color space [SPACE] |
| `textureExists` | Boolean / CANONICAL-INDEPENDENT | texture [TEXTURE] exists? |
| `textureState` | reporter / CANONICAL-INDEPENDENT | texture [TEXTURE] state |
| `textureError` | reporter / CANONICAL-INDEPENDENT | texture [TEXTURE] error |
| `textureDimension` | reporter / CANONICAL-FAMILY | texture [TEXTURE] [DIMENSION] |
| `textureUsers` | reporter / CANONICAL-INDEPENDENT | texture [TEXTURE] users |
| `textureNumber` | reporter / CANONICAL-FAMILY | texture [TEXTURE] [PROPERTY] number |
| `textureText` | reporter / CANONICAL-FAMILY | texture [TEXTURE] [PROPERTY] text |
| `textureBoolean` | Boolean / CANONICAL-FAMILY | texture [TEXTURE] [PROPERTY] ? |
| `deleteTexture` | command / CANONICAL-INDEPENDENT | delete texture [TEXTURE] |
| `createDirectionalLight` | command / CANONICAL-INDEPENDENT | create directional light [NAME] intensity [INTENSITY] |
| `setDirectionalLight` | command / CANONICAL-INDEPENDENT | set directional light [LIGHT] color [COLOR] intensity [INTENSITY] |
| `setAmbientLight` | command / CANONICAL-INDEPENDENT | set ambient light color [COLOR] intensity [INTENSITY] |
| `directionalLightNumber` | reporter / CANONICAL-FAMILY | directional light [LIGHT] [PROPERTY] number |
| `directionalLightText` | reporter / CANONICAL-FAMILY | directional light [LIGHT] [PROPERTY] text |
| `directionalLightBoolean` | Boolean / CANONICAL-FAMILY | directional light [LIGHT] [PROPERTY] ? |
| `createPointLight` | command / CANONICAL-INDEPENDENT | create point light [NAME] |
| `createSpotLight` | command / CANONICAL-INDEPENDENT | create spot light [NAME] |
| `setLocalLightPosition` | command / CANONICAL-INDEPENDENT | set light [LIGHT] position x [X] y [Y] z [Z] |
| `setLocalLightColor` | command / CANONICAL-INDEPENDENT | set light [LIGHT] color [COLOR] |
| `setLocalLightIntensity` | command / CANONICAL-INDEPENDENT | set light [LIGHT] intensity [INTENSITY] |
| `setLocalLightRange` | command / CANONICAL-INDEPENDENT | set light [LIGHT] range [RANGE] |
| `setLocalLightEnabled` | command / CANONICAL-INDEPENDENT | set light [LIGHT] enabled [ENABLED] |
| `setSpotLightDirection` | command / CANONICAL-INDEPENDENT | set spot light [LIGHT] direction x [X] y [Y] z [Z] |
| `pointSpotLightToward` | command / CANONICAL-INDEPENDENT | point spot light [LIGHT] toward x [X] y [Y] z [Z] |
| `setSpotLightInnerAngle` | command / CANONICAL-INDEPENDENT | set spot light [LIGHT] inner angle [DEGREES] |
| `setSpotLightOuterAngle` | command / CANONICAL-INDEPENDENT | set spot light [LIGHT] outer angle [DEGREES] |
| `localLightExists` | Boolean / CANONICAL-INDEPENDENT | local light [LIGHT] exists? |
| `localLightType` | reporter / CANONICAL-INDEPENDENT | type of local light [LIGHT] |
| `localLightPosition` | reporter / CANONICAL-INDEPENDENT | [AXIS] position of local light [LIGHT] |
| `localLightIntensity` | reporter / CANONICAL-INDEPENDENT | intensity of local light [LIGHT] |
| `localLightRange` | reporter / CANONICAL-INDEPENDENT | range of local light [LIGHT] |
| `localLightEnabled` | Boolean / CANONICAL-INDEPENDENT | local light [LIGHT] enabled? |
| `localLightText` | reporter / CANONICAL-FAMILY | local light [LIGHT] [PROPERTY] text |
| `spotLightNumber` | reporter / CANONICAL-FAMILY | spot light [LIGHT] [PROPERTY] number |
| `deleteLocalLight` | command / CANONICAL-INDEPENDENT | delete local light [LIGHT] |
| `setShadowsEnabled` | command / CANONICAL-INDEPENDENT | set shadows [ENABLED] |
| `setShadowQuality` | command / CANONICAL-INDEPENDENT | set shadow quality [QUALITY] |
| `setLightCastsShadows` | command / CANONICAL-INDEPENDENT | set light [LIGHT] cast shadows [ENABLED] |
| `setResourceCastsShadows` | command / CANONICAL-INDEPENDENT | set [RESOURCE] cast shadows [ENABLED] |
| `setResourceReceivesShadows` | command / CANONICAL-INDEPENDENT | set [RESOURCE] receive shadows [ENABLED] |
| `setShadowMapSize` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow map size [SIZE] |
| `setShadowBias` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow bias [VALUE] |
| `setShadowNormalBias` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow normal bias [VALUE] |
| `setShadowFilter` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow filtering [FILTER] |
| `setShadowDistance` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow distance [VALUE] |
| `setShadowCameraNear` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow camera near [VALUE] |
| `setShadowCameraFar` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow camera far [VALUE] |
| `setShadowBounds` | command / CANONICAL-INDEPENDENT | set light [LIGHT] shadow bounds [VALUE] |
| `shadowsEnabled` | Boolean / CANONICAL-INDEPENDENT | shadows enabled? |
| `shadowQuality` | reporter / CANONICAL-INDEPENDENT | shadow quality |
| `shadowMapSize` | reporter / CANONICAL-INDEPENDENT | shadow map size of [LIGHT] |
| `createSolidEnvironment` | command / CANONICAL-INDEPENDENT | create environment [ENVIRONMENT] with solid color [COLOR] |
| `createEnvironmentFromTexture` | command / CANONICAL-INDEPENDENT | create environment [ENVIRONMENT] from equirectangular texture [TEXTURE] |
| `setEnvironmentTexture` | command / CANONICAL-INDEPENDENT | set environment [ENVIRONMENT] source texture [TEXTURE] |
| `setSceneEnvironment` | command / CANONICAL-INDEPENDENT | set scene environment [ENVIRONMENT] |
| `clearSceneEnvironment` | command / CANONICAL-INDEPENDENT | clear scene environment |
| `setEnvironmentIntensity` | command / CANONICAL-INDEPENDENT | set environment [ENVIRONMENT] intensity [INTENSITY] |
| `setEnvironmentRotation` | command / CANONICAL-INDEPENDENT | set environment [ENVIRONMENT] rotation [ROTATION] |
| `setEnvironmentBackground` | command / CANONICAL-INDEPENDENT | set environment [ENVIRONMENT] background [ENABLED] |
| `environmentExists` | Boolean / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] exists? |
| `environmentState` | reporter / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] state |
| `activeEnvironment` | reporter / CANONICAL-INDEPENDENT | active scene environment |
| `environmentUsers` | reporter / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] users |
| `environmentIntensity` | reporter / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] intensity |
| `environmentRotation` | reporter / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] rotation |
| `environmentBackgroundEnabled` | Boolean / CANONICAL-INDEPENDENT | environment [ENVIRONMENT] background enabled? |
| `environmentText` | reporter / CANONICAL-FAMILY | environment [ENVIRONMENT] [PROPERTY] text |
| `deleteEnvironment` | command / CANONICAL-INDEPENDENT | delete environment [ENVIRONMENT] |
| `animationCount` | reporter / CANONICAL-INDEPENDENT | animation count of model [MODEL] |
| `animationName` | reporter / CANONICAL-INDEPENDENT | animation name [INDEX] of model [MODEL] |
| `animationDuration` | reporter / CANONICAL-INDEPENDENT | animation duration [CLIP] of model [MODEL] |
| `modelAnimationText` | reporter / CANONICAL-INDEPENDENT | model [MODEL] animation [INDEX] name |
| `modelAnimationNumber` | reporter / CANONICAL-FAMILY | model [MODEL] animation [INDEX] [PROPERTY] |
| `playAnimation` | command / CANONICAL-INDEPENDENT | play animation [CLIP] on model instance [INSTANCE] looping [LOOPING] |
| `setAnimationTime` | command / CANONICAL-INDEPENDENT | set animation time of [INSTANCE] to [SECONDS] seconds |
| `setAnimationSpeed` | command / CANONICAL-INDEPENDENT | set animation speed of [INSTANCE] to [SPEED] |
| `setAnimationLooping` | command / CANONICAL-INDEPENDENT | set animation looping of [INSTANCE] to [LOOPING] |
| `crossfadeAnimation` | command / CANONICAL-INDEPENDENT | crossfade [INSTANCE] to animation [CLIP] over [SECONDS] seconds |
| `pauseAnimation` | command / CANONICAL-INDEPENDENT | pause animation on [INSTANCE] |
| `resumeAnimation` | command / CANONICAL-INDEPENDENT | resume animation on [INSTANCE] |
| `stopAnimation` | command / CANONICAL-INDEPENDENT | stop animation on [INSTANCE] |
| `resetModelPose` | command / CANONICAL-INDEPENDENT | reset pose of model instance [INSTANCE] |
| `currentAnimation` | reporter / CANONICAL-INDEPENDENT | current animation of [INSTANCE] |
| `animationTime` | reporter / CANONICAL-INDEPENDENT | animation time of [INSTANCE] |
| `animationProgress` | reporter / CANONICAL-INDEPENDENT | animation progress of [INSTANCE] |
| `animationPlaying` | Boolean / CANONICAL-INDEPENDENT | animation playing on [INSTANCE]? |
| `animationPaused` | Boolean / CANONICAL-INDEPENDENT | animation paused on [INSTANCE]? |
| `animationFinished` | Boolean / CANONICAL-INDEPENDENT | animation finished on [INSTANCE]? |
| `animationSpeed` | reporter / CANONICAL-INDEPENDENT | animation speed of [INSTANCE] |
| `createSprite` | command / CANONICAL-INDEPENDENT | create sprite [NAME] using texture [TEXTURE] |
| `setEffectVisible` | command / CANONICAL-INDEPENDENT | set effect [NAME] visible [VISIBLE] |
| `setEffectSize` | command / CANONICAL-INDEPENDENT | set effect [NAME] width [WIDTH] height [HEIGHT] |
| `setEffectTint` | command / CANONICAL-INDEPENDENT | set effect [NAME] tint [COLOR] opacity [OPACITY] brightness [BRIGHTNESS] |
| `setEffectAlphaMode` | command / CANONICAL-INDEPENDENT | set effect [NAME] alpha [MODE] cutoff [CUTOFF] |
| `setEffectLighting` | command / CANONICAL-INDEPENDENT | set effect [NAME] lighting [MODE] |
| `setEffectDepth` | command / CANONICAL-INDEPENDENT | set effect [NAME] depth test [TEST] write [WRITE] |
| `setEffectNumber` | command / CANONICAL-FAMILY | set effect [RESOURCE] [PROPERTY] to [VALUE] |
| `effectKind` | reporter / CANONICAL-INDEPENDENT | effect kind of [NAME] |
| `effectExists` | Boolean / CANONICAL-INDEPENDENT | effect [NAME] exists? |
| `effectVisible` | Boolean / CANONICAL-INDEPENDENT | effect [NAME] visible? |
| `effectNumber` | reporter / CANONICAL-FAMILY | effect [RESOURCE] [PROPERTY] number |
| `effectText` | reporter / CANONICAL-FAMILY | effect [RESOURCE] [PROPERTY] text |
| `effectBoolean` | Boolean / CANONICAL-FAMILY | effect [RESOURCE] [PROPERTY] ? |
| `setSpriteBillboardMode` | command / CANONICAL-INDEPENDENT | set sprite [NAME] facing [MODE] |
| `spriteBillboardMode` | reporter / CANONICAL-INDEPENDENT | billboard mode of sprite [NAME] |
| `setSpritePivot` | command / CANONICAL-INDEPENDENT | set sprite [NAME] pivot [PIVOT] |
| `setSpriteCustomPivot` | command / CANONICAL-INDEPENDENT | set sprite [NAME] custom pivot x [X] y [Y] |
| `setSpriteSheet` | command / CANONICAL-INDEPENDENT | set sprite [NAME] sheet columns [COLUMNS] rows [ROWS] |
| `setSpriteFrame` | command / CANONICAL-INDEPENDENT | set sprite [NAME] frame [FRAME] |
| `playSpriteFrames` | command / CANONICAL-INDEPENDENT | play sprite [NAME] frames [FIRST] to [LAST] at [FPS] FPS looping [LOOPING] |
| `pauseSpriteFrames` | command / CANONICAL-INDEPENDENT | pause sprite animation [NAME] |
| `resumeSpriteFrames` | command / CANONICAL-INDEPENDENT | resume sprite animation [NAME] |
| `stopSpriteFrames` | command / CANONICAL-INDEPENDENT | stop sprite animation [NAME] reset [RESET] |
| `setSpriteDirectionalViews` | command / CANONICAL-INDEPENDENT | set sprite [NAME] directional views [COUNT] facing [ANGLE] |
| `setSpriteDirectionalFrame` | command / CANONICAL-INDEPENDENT | map sprite [NAME] direction [DIRECTION] to frame [FRAME] |
| `spriteCurrentFrame` | reporter / CANONICAL-INDEPENDENT | current frame of sprite [NAME] |
| `spriteDirectionalFrame` | reporter / CANONICAL-INDEPENDENT | sprite [RESOURCE] direction [DIRECTION] frame |
| `createParticleEmitter` | command / CANONICAL-INDEPENDENT | create particle emitter [NAME] texture [TEXTURE] maximum [MAXIMUM] |
| `setParticleEmissionRate` | command / CANONICAL-INDEPENDENT | set emitter [NAME] rate [RATE] per second |
| `setParticleMaximum` | command / CANONICAL-INDEPENDENT | set emitter [NAME] maximum particles [MAXIMUM] |
| `setParticleSpawnShape` | command / CANONICAL-INDEPENDENT | set emitter [NAME] shape [SHAPE] extents x [X] y [Y] z [Z] |
| `setParticleVelocity` | command / CANONICAL-INDEPENDENT | set emitter [NAME] velocity x [X] y [Y] z [Z] spread [SPREAD] |
| `setParticleAcceleration` | command / CANONICAL-INDEPENDENT | set emitter [NAME] acceleration x [X] y [Y] z [Z] |
| `setParticleLifetime` | command / CANONICAL-INDEPENDENT | set emitter [NAME] lifetime [MINIMUM] to [MAXIMUM] seconds |
| `setParticleSizeOverLife` | command / CANONICAL-INDEPENDENT | set emitter [NAME] size [START] to [END] |
| `setParticleAlphaOverLife` | command / CANONICAL-INDEPENDENT | set emitter [NAME] alpha [START] to [END] % |
| `setParticleColorOverLife` | command / CANONICAL-INDEPENDENT | set emitter [NAME] color [START] to [END] |
| `setParticleRotation` | command / CANONICAL-INDEPENDENT | set emitter [NAME] rotation [MINIMUM] to [MAXIMUM] angular speed [ANGULARMINIMUM] to [ANGULARMAXIMUM] |
| `setParticleFrameRate` | command / CANONICAL-INDEPENDENT | set emitter [NAME] sprite-sheet FPS [FPS] |
| `setParticleSeed` | command / CANONICAL-INDEPENDENT | set emitter [NAME] random seed [SEED] |
| `setParticleSpread` | command / CANONICAL-INDEPENDENT | set emitter [RESOURCE] spread x [X] y [Y] z [Z] |
| `startParticleEmitter` | command / CANONICAL-INDEPENDENT | start emitter [NAME] |
| `stopParticleEmitter` | command / CANONICAL-INDEPENDENT | stop emitter [NAME] |
| `pauseParticleEmitter` | command / CANONICAL-INDEPENDENT | pause emitter [NAME] |
| `resumeParticleEmitter` | command / CANONICAL-INDEPENDENT | resume emitter [NAME] |
| `clearParticleEmitter` | command / CANONICAL-INDEPENDENT | clear emitter [NAME] |
| `burstParticles` | command / CANONICAL-INDEPENDENT | burst [COUNT] particles from [NAME] |
| `activeParticleCount` | reporter / CANONICAL-INDEPENDENT | active particles in [NAME] |
| `particleEmitterEmitting` | Boolean / CANONICAL-INDEPENDENT | emitter [NAME] emitting? |
| `particleEmitterPaused` | Boolean / CANONICAL-INDEPENDENT | emitter [NAME] paused? |
| `particleNumber` | reporter / CANONICAL-FAMILY | emitter [RESOURCE] [PROPERTY] number |
| `particleText` | reporter / CANONICAL-FAMILY | emitter [RESOURCE] [PROPERTY] text |
| `particleBoolean` | Boolean / CANONICAL-FAMILY | emitter [RESOURCE] [PROPERTY] ? |
| `createDecal` | command / CANONICAL-INDEPENDENT | create surface decal [NAME] using texture [TEXTURE] |
| `setDecalNormal` | command / CANONICAL-INDEPENDENT | set decal [NAME] normal x [X] y [Y] z [Z] |
| `setDecalOffset` | command / CANONICAL-INDEPENDENT | set decal [NAME] surface offset [OFFSET] |
| `setDecalLifetime` | command / CANONICAL-INDEPENDENT | set decal [NAME] lifetime [SECONDS] seconds (0 persistent) |
| `decalNumber` | reporter / CANONICAL-FAMILY | decal [RESOURCE] [PROPERTY] number |
| `decalBoolean` | Boolean / CANONICAL-FAMILY | decal [RESOURCE] [PROPERTY] ? |
| `create3DText` | command / CANONICAL-INDEPENDENT | create 3D text [NAME] text [TEXT] font [FONT] size [FONT_SIZE] resolution [RESOLUTION] height [HEIGHT] facing [MODE] |
| `set3DText` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] to [TEXT] |
| `set3DTextPosition` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] position [X] [Y] [Z] |
| `set3DTextSize` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] width [WIDTH] height [HEIGHT] |
| `set3DTextBillboard` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] facing [MODE] |
| `set3DTextPivot` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] pivot [PIVOT] |
| `set3DTextColor` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] color [COLOR] |
| `set3DTextFont` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] font [FONT] size [SIZE] |
| `set3DTextAlignment` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] alignment [ALIGNMENT] |
| `set3DTextBackground` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] background [COLOR] opacity [OPACITY] % |
| `set3DTextResolution` | command / CANONICAL-INDEPENDENT | set 3D text [NAME] resolution [RESOLUTION] |
| `textContent` | reporter / CANONICAL-FAMILY | 3D text [TEXT] [PROPERTY] text |
| `textNumber` | reporter / CANONICAL-FAMILY | 3D text [TEXT] [PROPERTY] number |
| `textBoolean` | Boolean / CANONICAL-FAMILY | 3D text [TEXT] [PROPERTY] ? |
| `delete3DText` | command / CANONICAL-INDEPENDENT | delete 3D text [NAME] |
| `createPhysicsBox` | command / CANONICAL-INDEPENDENT | create [TYPE] physics box [NAME] width [WIDTH] height [HEIGHT] depth [DEPTH] |
| `createPhysicsSphere` | command / CANONICAL-INDEPENDENT | create [TYPE] physics sphere [NAME] radius [RADIUS] |
| `setPhysicsGravity` | command / CANONICAL-INDEPENDENT | set physics gravity x [X] y [Y] z [Z] |
| `setPhysicsVector` | command / CANONICAL-INDEPENDENT | set physics body [NAME] [PROPERTY] x [X] y [Y] z [Z] |
| `setPhysicsNumber` | command / CANONICAL-INDEPENDENT | set physics body [NAME] [PROPERTY] [VALUE] |
| `setPhysicsTrigger` | command / CANONICAL-INDEPENDENT | set physics body [NAME] trigger [ENABLED] |
| `setPhysicsFilter` | command / CANONICAL-INDEPENDENT | set physics body [NAME] layer bits [LAYER] mask bits [MASK] |
| `attachPhysicsBody` | command / CANONICAL-INDEPENDENT | attach physics body [NAME] to object [OBJECT] offset x [X] y [Y] z [Z] |
| `physicsBodyExists` | Boolean / CANONICAL-INDEPENDENT | physics body [BODY] exists? |
| `physicsBodyNumber` | reporter / CANONICAL-INDEPENDENT | physics body [NAME] [FIELD] |
| `physicsBodySleeping` | Boolean / CANONICAL-INDEPENDENT | physics body [NAME] sleeping? |
| `physicsBodyText` | reporter / CANONICAL-FAMILY | physics body [BODY] [PROPERTY] text |
| `physicsBodyBoolean` | Boolean / CANONICAL-FAMILY | physics body [BODY] [PROPERTY] ? |
| `physicsBodyMeasure` | reporter / CANONICAL-FAMILY | physics body [BODY] [PROPERTY] number |
| `physicsWorldNumber` | reporter / CANONICAL-FAMILY | physics world [PROPERTY] number |
| `deletePhysicsBody` | command / CANONICAL-INDEPENDENT | delete physics body [NAME] |
| `physicsTouching` | Boolean / CANONICAL-INDEPENDENT | physics body [NAME] [STATE] touching [OTHER] ? |
| `physicsContactCount` | reporter / CANONICAL-INDEPENDENT | physics body [NAME] [STATE] contact count |
| `physicsContactName` | reporter / CANONICAL-INDEPENDENT | physics body [NAME] [STATE] contact [INDEX] name |
| `physicsContactNumber` | reporter / CANONICAL-INDEPENDENT | physics body [NAME] [STATE] contact [INDEX] [FIELD] |
| `loadAudioURL` | command / CANONICAL-INDEPENDENT | load audio asset [ASSET] from URL or data URI [URL] |
| `loadAudioSound` | command / CANONICAL-INDEPENDENT | load audio asset [ASSET] from this sprite sound [SOUND] |
| `unlockAudio` | command / CANONICAL-INDEPENDENT | unlock 3D audio |
| `createAudioSource` | command / CANONICAL-INDEPENDENT | create [MODE] audio source [NAME] asset [ASSET] |
| `setAudioNumber` | command / CANONICAL-INDEPENDENT | set audio source [NAME] [PROPERTY] [VALUE] |
| `setAudioLoop` | command / CANONICAL-INDEPENDENT | set audio source [NAME] loop [ENABLED] |
| `setAudioVector` | command / CANONICAL-INDEPENDENT | set audio source [NAME] [PROPERTY] x [X] y [Y] z [Z] |
| `attachAudioSource` | command / CANONICAL-INDEPENDENT | attach audio source [NAME] to object [OBJECT] |
| `controlAudioSource` | command / CANONICAL-INDEPENDENT | [ACTION] audio source [NAME] |
| `audioAssetExists` | Boolean / CANONICAL-INDEPENDENT | audio asset [ASSET] exists? |
| `audioAssetState` | reporter / CANONICAL-INDEPENDENT | audio asset [ASSET] state |
| `audioAssetNumber` | reporter / CANONICAL-FAMILY | audio asset [ASSET] [PROPERTY] number |
| `audioAssetText` | reporter / CANONICAL-FAMILY | audio asset [ASSET] [PROPERTY] text |
| `audioSourceExists` | Boolean / CANONICAL-INDEPENDENT | audio source [SOURCE] exists? |
| `audioSourceState` | reporter / CANONICAL-INDEPENDENT | audio source [NAME] state |
| `audioSourceNumber` | reporter / CANONICAL-INDEPENDENT | audio source [NAME] [PROPERTY] |
| `audioSourceText` | reporter / CANONICAL-FAMILY | audio source [SOURCE] [PROPERTY] text |
| `audioSourceBoolean` | Boolean / CANONICAL-FAMILY | audio source [SOURCE] [PROPERTY] ? |
| `audioSpatialNumber` | reporter / CANONICAL-FAMILY | audio source [SOURCE] [PROPERTY] number |
| `audioListenerNumber` | reporter / CANONICAL-FAMILY | camera [CAMERA] listener [PROPERTY] number |
| `deleteAudioSource` | command / CANONICAL-INDEPENDENT | delete audio source [NAME] |
| `deleteAudioAsset` | command / CANONICAL-INDEPENDENT | delete audio asset [ASSET] |
| `setRenderQuality` | command / CANONICAL-INDEPENDENT | set render quality [QUALITY] |
| `renderQuality` | reporter / CANONICAL-INDEPENDENT | render quality |
| `setRenderResolutionScale` | command / CANONICAL-INDEPENDENT | set render resolution scale to [PERCENT] % |
| `renderResolutionScale` | reporter / CANONICAL-INDEPENDENT | render resolution scale |
| `setMaxPixelRatio` | command / CANONICAL-INDEPENDENT | set maximum pixel ratio [RATIO] |
| `maxPixelRatio` | reporter / CANONICAL-INDEPENDENT | maximum pixel ratio |
| `setAntialiasing` | command / CANONICAL-INDEPENDENT | set antialiasing [MODE] |
| `antialiasing` | reporter / CANONICAL-INDEPENDENT | antialiasing mode |
| `setRenderDistance` | command / CANONICAL-INDEPENDENT | set render distance [DISTANCE] |
| `renderDistance` | reporter / CANONICAL-INDEPENDENT | render distance |
| `setFrustumCulling` | command / CANONICAL-INDEPENDENT | set scene frustum culling [ENABLED] |
| `frustumCullingEnabled` | Boolean / CANONICAL-INDEPENDENT | scene frustum culling enabled? |
| `setGlobalTextureQuality` | command / CANONICAL-INDEPENDENT | set texture quality [QUALITY] |
| `globalTextureQuality` | reporter / CANONICAL-INDEPENDENT | texture quality |
| `setGlobalEnvironmentQuality` | command / CANONICAL-INDEPENDENT | set environment quality [QUALITY] |
| `globalEnvironmentQuality` | reporter / CANONICAL-INDEPENDENT | environment quality |
| `setMaximumLocalLights` | command / CANONICAL-INDEPENDENT | set maximum local lights per draw [COUNT] |
| `maximumLocalLights` | reporter / CANONICAL-INDEPENDENT | maximum local lights per draw |
| `setAdaptiveResolution` | command / CANONICAL-INDEPENDENT | set adaptive resolution [ENABLED] |
| `adaptiveResolutionEnabled` | Boolean / CANONICAL-INDEPENDENT | adaptive resolution enabled? |
| `setAdaptiveTargetFps` | command / CANONICAL-INDEPENDENT | set adaptive resolution target to [FPS] FPS |
| `adaptiveTargetFps` | reporter / CANONICAL-INDEPENDENT | adaptive resolution target FPS |
| `setAdaptiveScaleRange` | command / CANONICAL-INDEPENDENT | set adaptive resolution range [MINIMUM] % to [MAXIMUM] % |
| `qualityNumber` | reporter / CANONICAL-FAMILY | quality [PROPERTY] number |
| `createRenderTarget` | command / CANONICAL-INDEPENDENT | create render target [TARGET] width [WIDTH] height [HEIGHT] |
| `resizeRenderTarget` | command / CANONICAL-INDEPENDENT | resize render target [TARGET] to [WIDTH] by [HEIGHT] |
| `renderSceneToRenderTarget` | command / CANONICAL-INDEPENDENT | render current scene to render target [TARGET] |
| `renderCameraToRenderTarget` | command / CANONICAL-INDEPENDENT | render scene from camera [CAMERA] to render target [TARGET] |
| `clearRenderTarget` | command / CANONICAL-INDEPENDENT | clear render target [TARGET] |
| `renderTargetExists` | Boolean / CANONICAL-INDEPENDENT | render target [TARGET] exists? |
| `renderTargetDimension` | reporter / CANONICAL-FAMILY | render target [TARGET] [DIMENSION] |
| `deleteRenderTarget` | command / CANONICAL-INDEPENDENT | delete render target [TARGET] |
| `setPostProcessing` | command / CANONICAL-INDEPENDENT | set post processing [ENABLED] |
| `setBloom` | command / CANONICAL-INDEPENDENT | set bloom [ENABLED] |
| `setBloomFactor` | command / CANONICAL-FAMILY | set bloom [PROPERTY] [VALUE] |
| `setBloomQuality` | command / CANONICAL-INDEPENDENT | set bloom radius / quality [QUALITY] |
| `setPostColorFactor` | command / CANONICAL-FAMILY | set post [PROPERTY] factor [VALUE] |
| `setVignetteFactor` | command / CANONICAL-FAMILY | set vignette [PROPERTY] [VALUE] |
| `setFxaa` | command / CANONICAL-INDEPENDENT | set post FXAA [ENABLED] |
| `postProcessingEnabled` | Boolean / CANONICAL-INDEPENDENT | post processing enabled? |
| `bloomEnabled` | Boolean / CANONICAL-INDEPENDENT | bloom enabled? |
| `bloomIntensity` | reporter / CANONICAL-INDEPENDENT | bloom intensity |
| `postNumber` | reporter / CANONICAL-FAMILY | post [PROPERTY] number |
| `postBoolean` | Boolean / CANONICAL-FAMILY | post [PROPERTY] ? |
| `resetPostProcessing` | command / CANONICAL-INDEPENDENT | reset post-processing settings |
| `createCustomShader` | command / CANONICAL-INDEPENDENT | create shader [SHADER] vertex [VERTEX] fragment [FRAGMENT] uniforms JSON [UNIFORMS] |
| `createCustomMaterial` | command / CANONICAL-INDEPENDENT | create material [MATERIAL] with custom shader [SHADER] |
| `setCustomUniform` | command / CANONICAL-INDEPENDENT | set custom material [MATERIAL] uniform [UNIFORM] value [VALUE] |
| `setCustomUniformVector` | command / CANONICAL-INDEPENDENT | set custom material [MATERIAL] vector [UNIFORM] x [X] y [Y] z [Z] w [W] |
| `setCustomSampler` | command / CANONICAL-INDEPENDENT | set custom material [MATERIAL] sampler [UNIFORM] texture [TEXTURE] |
| `customShaderExists` | Boolean / CANONICAL-INDEPENDENT | custom shader [SHADER] exists? |
| `customUniformText` | reporter / CANONICAL-FAMILY | custom material [MATERIAL] uniform [UNIFORM] [PROPERTY] text |
| `customUniformNumber` | reporter / CANONICAL-FAMILY | custom material [MATERIAL] uniform [UNIFORM] component [COMPONENT] |
| `customShaderNumber` | reporter / CANONICAL-FAMILY | custom shader [SHADER] [PROPERTY] number |
| `deleteCustomShader` | command / CANONICAL-INDEPENDENT | delete custom shader [SHADER] |
| `setRaycastBackface` | command / CANONICAL-INDEPENDENT | set raycast backfaces [POLICY] |
| `castWorldRay` | command / CANONICAL-INDEPENDENT | cast ray from [X] [Y] [Z] direction [DX] [DY] [DZ] distance [DISTANCE] filter [FILTER] |
| `castStageRay` | command / CANONICAL-INDEPENDENT | pick from camera [CAMERA] at stage x [X] y [Y] distance [DISTANCE] filter [FILTER] |
| `castCameraForwardRay` | command / CANONICAL-INDEPENDENT | cast camera [CAMERA] forward ray distance [DISTANCE] filter [FILTER] |
| `rayHit` | Boolean / CANONICAL-INDEPENDENT | ray hit? |
| `rayHitNumber` | reporter / CANONICAL-FAMILY | ray hit [FIELD] number |
| `rayHitText` | reporter / CANONICAL-FAMILY | ray hit [FIELD] text |
| `worldToStageValue` | reporter / CANONICAL-INDEPENDENT | world [X] [Y] [Z] from camera [CAMERA] as [VALUE] |
| `worldPointInFront` | Boolean / CANONICAL-INDEPENDENT | world [X] [Y] [Z] in front of camera [CAMERA]? |
| `worldPointVisible` | Boolean / CANONICAL-INDEPENDENT | world [X] [Y] [Z] visible by camera [CAMERA]? |
| `stageRayDirection` | reporter / CANONICAL-INDEPENDENT | camera [CAMERA] stage x [X] y [Y] ray direction [AXIS] |
| `createTerrain` | command / CANONICAL-INDEPENDENT | create terrain [NAME] width [WIDTH] depth [DEPTH] segments [X_SEGMENTS] by [Z_SEGMENTS] |
| `setTerrainHeight` | command / CANONICAL-INDEPENDENT | set terrain [NAME] grid x [X] z [Z] height [HEIGHT] |
| `setTerrainFlat` | command / CANONICAL-INDEPENDENT | set terrain [NAME] flat height [HEIGHT] |
| `generateTerrainHills` | command / CANONICAL-INDEPENDENT | generate terrain [NAME] hills amplitude [AMPLITUDE] frequency [FREQUENCY] seed [SEED] |
| `setTerrainMaterial` | command / CANONICAL-INDEPENDENT | set terrain [NAME] material [MATERIAL] |
| `terrainHeightAt` | reporter / CANONICAL-INDEPENDENT | terrain [NAME] height at world x [X] z [Z] |
| `terrainNormalAt` | reporter / CANONICAL-INDEPENDENT | terrain [NAME] normal [AXIS] at world x [X] z [Z] |
| `terrainExists` | Boolean / CANONICAL-INDEPENDENT | terrain [TERRAIN] exists? |
| `terrainGridHeight` | reporter / CANONICAL-INDEPENDENT | terrain [TERRAIN] grid x [X] z [Z] height |
| `terrainNumber` | reporter / CANONICAL-FAMILY | terrain [TERRAIN] [PROPERTY] number |
| `terrainBoolean` | Boolean / CANONICAL-FAMILY | terrain [TERRAIN] [PROPERTY] ? |
| `deleteTerrain` | command / CANONICAL-INDEPENDENT | delete terrain [NAME] |
| `distance3D` | reporter / CANONICAL-INDEPENDENT | 3D distance from [AX] [AY] [AZ] to [BX] [BY] [BZ] |
| `vectorLength3D` | reporter / CANONICAL-INDEPENDENT | length of vector [X] [Y] [Z] |
| `dotProduct3D` | reporter / CANONICAL-INDEPENDENT | dot [AX] [AY] [AZ] with [BX] [BY] [BZ] |
| `crossProduct3D` | reporter / CANONICAL-INDEPENDENT | cross [AX] [AY] [AZ] with [BX] [BY] [BZ] component [AXIS] |
| `vectorNormalizedComponent` | reporter / CANONICAL-INDEPENDENT | normalized [X] [Y] [Z] component [AXIS] |
| `directionComponent3D` | reporter / CANONICAL-INDEPENDENT | direction from [AX] [AY] [AZ] to [BX] [BY] [BZ] component [AXIS] |
| `angleBetweenVectors` | reporter / CANONICAL-INDEPENDENT | angle between [AX] [AY] [AZ] and [BX] [BY] [BZ] |
| `lerpNumber` | reporter / CANONICAL-INDEPENDENT | lerp [START] to [END] by [AMOUNT] |
| `clampNumber` | reporter / CANONICAL-INDEPENDENT | clamp [VALUE] between [MINIMUM] and [MAXIMUM] |
| `distanceBetweenResources` | reporter / CANONICAL-INDEPENDENT | distance from 3D resource [FROM] to [TO] |
| `transformResourceCoordinate` | reporter / CANONICAL-FAMILY | [DIRECTION] [KIND] by [RESOURCE] x [X] y [Y] z [Z] get [AXIS] |
| `moveObjectLocal` | command / CANONICAL-INDEPENDENT | move [NAME] [BASIS] by [DISTANCE] |
| `objectBasisComponent` | reporter / CANONICAL-INDEPENDENT | [NAME] [BASIS] [AXIS] |
| `moveResourceByCamera` | command / CANONICAL-INDEPENDENT | move [RESOURCE] by camera [CAMERA] [AXIS] [DISTANCE] |
| `tweenResourcePosition` | command / CANONICAL-INDEPENDENT | tween [NAME] position to [X] [Y] [Z] over [SECONDS] seconds [EASING] |
| `tweenResourceRotation` | command / CANONICAL-INDEPENDENT | tween [NAME] rotation to [X] [Y] [Z] degrees over [SECONDS] seconds [EASING] |
| `tweenResourceScale` | command / CANONICAL-INDEPENDENT | tween [NAME] scale to [X] [Y] [Z] over [SECONDS] seconds [EASING] |
| `tweenCameraFov` | command / CANONICAL-INDEPENDENT | tween camera [CAMERA] FOV to [FOV] over [SECONDS] seconds [EASING] |
| `pauseTween` | command / CANONICAL-INDEPENDENT | pause tweens on [NAME] |
| `resumeTween` | command / CANONICAL-INDEPENDENT | resume tweens on [NAME] |
| `stopTween` | command / CANONICAL-INDEPENDENT | stop tweens on [NAME] |
| `tweenActive` | Boolean / CANONICAL-INDEPENDENT | [NAME] has active tween? |
| `tweenNumber` | reporter / CANONICAL-FAMILY | tween on [NAME] [PROPERTY] number |
| `tweenBoolean` | Boolean / CANONICAL-FAMILY | tween on [NAME] [PROPERTY] ? |
| `rendererBackend` | reporter / CANONICAL-INDEPENDENT | 3D renderer backend |
| `currentFps` | reporter / CANONICAL-INDEPENDENT | 3D current FPS |
| `averageFps` | reporter / CANONICAL-INDEPENDENT | 3D average FPS |
| `drawCalls` | reporter / CANONICAL-INDEPENDENT | 3D draw calls |
| `internalRenderDimension` | reporter / CANONICAL-FAMILY | internal render [DIMENSION] |
| `effectivePixelRatio` | reporter / CANONICAL-INDEPENDENT | effective pixel ratio |
| `internalRenderPixels` | reporter / CANONICAL-INDEPENDENT | internal render pixel count |
| `lastError` | reporter / CANONICAL-INDEPENDENT | last 3D error |
| `clearError` | command / CANONICAL-INDEPENDENT | clear 3D error |
| `modelAssetCount` | reporter / CANONICAL-INDEPENDENT | loaded model asset count |
| `loadedGeometryCount` | reporter / CANONICAL-INDEPENDENT | loaded model geometry count |
| `geometryGpuBytes` | reporter / CANONICAL-INDEPENDENT | geometry GPU bytes |
| `geometryUploads` | reporter / CANONICAL-INDEPENDENT | geometry GPU uploads |
| `materialCount` | reporter / CANONICAL-INDEPENDENT | material count |
| `materialPrograms` | reporter / CANONICAL-INDEPENDENT | active material shader programs |
| `materialShaderCompiles` | reporter / CANONICAL-INDEPENDENT | material shader compiles |
| `materialProgramSwitches` | reporter / CANONICAL-INDEPENDENT | material program switches |
| `materialSwitches` | reporter / CANONICAL-INDEPENDENT | material switches |
| `textureSwitches` | reporter / CANONICAL-INDEPENDENT | texture switches |
| `pbrPrograms` | reporter / CANONICAL-INDEPENDENT | active PBR shader programs |
| `pbrDrawCalls` | reporter / CANONICAL-INDEPENDENT | PBR draw calls |
| `activeLocalLightCount` | reporter / CANONICAL-INDEPENDENT | active local light count |
| `selectedLocalLightCount` | reporter / CANONICAL-INDEPENDENT | selected local lights per draw |
| `localLightListRebuilds` | reporter / CANONICAL-INDEPENDENT | local light list rebuilds |
| `localLightGpuUploads` | reporter / CANONICAL-INDEPENDENT | local light GPU uploads |
| `localLightDrawCalls` | reporter / CANONICAL-INDEPENDENT | local-light-capable draw calls |
| `localLightSelectionTime` | reporter / CANONICAL-INDEPENDENT | local light selection time |
| `shadowRenderTime` | reporter / CANONICAL-INDEPENDENT | shadow rendering time |
| `shadowDrawCalls` | reporter / CANONICAL-INDEPENDENT | shadow draw calls |
| `shadowTriangles` | reporter / CANONICAL-INDEPENDENT | shadow triangles |
| `shadowCasters` | reporter / CANONICAL-INDEPENDENT | shadow casters |
| `shadowMapsUpdated` | reporter / CANONICAL-INDEPENDENT | shadow maps updated this frame |
| `environmentPreprocessTime` | reporter / CANONICAL-INDEPENDENT | environment preprocessing time |
| `environmentPreprocesses` | reporter / CANONICAL-INDEPENDENT | environments preprocessed this frame |
| `environmentResources` | reporter / CANONICAL-INDEPENDENT | GPU environment resource sets |
| `environmentIblDrawCalls` | reporter / CANONICAL-INDEPENDENT | environment-lit PBR draw calls |
| `environmentBackgroundDrawCalls` | reporter / CANONICAL-INDEPENDENT | environment background draw calls |
| `activeAnimationPlayers` | reporter / CANONICAL-INDEPENDENT | active animation players |
| `sampledAnimationChannels` | reporter / CANONICAL-INDEPENDENT | sampled animation channels |
| `animationSamplingTime` | reporter / CANONICAL-INDEPENDENT | animation sampling time |
| `jointPaletteUploads` | reporter / CANONICAL-INDEPENDENT | joint palette uploads |
| `jointPaletteUploadBytes` | reporter / CANONICAL-INDEPENDENT | joint palette upload bytes |
| `skinnedDrawCalls` | reporter / CANONICAL-INDEPENDENT | skinned draw calls |
| `skinnedShadowDrawCalls` | reporter / CANONICAL-INDEPENDENT | skinned shadow draw calls |
| `spriteCount` | reporter / CANONICAL-INDEPENDENT | sprite count |
| `visibleSpriteCount` | reporter / CANONICAL-INDEPENDENT | visible sprite count |
| `spriteDrawCalls` | reporter / CANONICAL-INDEPENDENT | sprite draw calls |
| `spriteInstanceUploadBytes` | reporter / CANONICAL-INDEPENDENT | sprite/effect instance upload bytes |
| `directionalFrameChanges` | reporter / CANONICAL-INDEPENDENT | directional sprite frame changes |
| `activeParticleEmitters` | reporter / CANONICAL-INDEPENDENT | active particle emitters |
| `totalActiveParticles` | reporter / CANONICAL-INDEPENDENT | total active particles |
| `particlesSpawned` | reporter / CANONICAL-INDEPENDENT | particles spawned this tick |
| `particlesExpired` | reporter / CANONICAL-INDEPENDENT | particles expired this tick |
| `particleSimulationTime` | reporter / CANONICAL-INDEPENDENT | particle simulation time |
| `visibleParticleEmitters` | reporter / CANONICAL-INDEPENDENT | visible particle emitters |
| `culledParticleEmitters` | reporter / CANONICAL-INDEPENDENT | culled particle emitters |
| `particleInstanceUploadBytes` | reporter / CANONICAL-INDEPENDENT | particle instance upload bytes |
| `particleDrawCalls` | reporter / CANONICAL-INDEPENDENT | particle draw calls |
| `decalCount` | reporter / CANONICAL-INDEPENDENT | decal count |
| `visibleDecalCount` | reporter / CANONICAL-INDEPENDENT | visible decal count |
| `decalDrawCalls` | reporter / CANONICAL-INDEPENDENT | decal draw calls |
| `textLabelCount` | reporter / CANONICAL-INDEPENDENT | 3D text label count |
| `textRasterizations` | reporter / CANONICAL-INDEPENDENT | 3D text rasterizations |
| `textTextureUploads` | reporter / CANONICAL-INDEPENDENT | 3D text texture uploads |
| `sharedTextTextures` | reporter / CANONICAL-INDEPENDENT | shared 3D text textures |
| `renderedTextInstances` | reporter / CANONICAL-INDEPENDENT | rendered 3D text instances |
| `textDrawCalls` | reporter / CANONICAL-INDEPENDENT | 3D text draw calls |
| `totalRenderables` | reporter / CANONICAL-INDEPENDENT | total renderables |
| `visibilityCandidates` | reporter / CANONICAL-INDEPENDENT | visibility candidates |
| `spatialCandidates` | reporter / CANONICAL-INDEPENDENT | spatial candidates |
| `frustumTests` | reporter / CANONICAL-INDEPENDENT | frustum tests |
| `frustumRejected` | reporter / CANONICAL-INDEPENDENT | frustum rejected |
| `renderDistanceRejected` | reporter / CANONICAL-INDEPENDENT | render distance rejected |
| `visibleRenderables` | reporter / CANONICAL-INDEPENDENT | visible renderables |
| `visibleInstances` | reporter / CANONICAL-INDEPENDENT | visible instances |
| `culledInstances` | reporter / CANONICAL-INDEPENDENT | culled instances |
| `visibilityCpuTime` | reporter / CANONICAL-INDEPENDENT | visibility CPU time |
| `spatialQueryCpuTime` | reporter / CANONICAL-INDEPENDENT | spatial query CPU time |
| `spatialIndexEntries` | reporter / CANONICAL-INDEPENDENT | spatial index entries |
| `spatialIndexUpdates` | reporter / CANONICAL-INDEPENDENT | spatial index updates |
| `spatialIndexRebuilds` | reporter / CANONICAL-INDEPENDENT | spatial index rebuilds |
| `dirtyBounds` | reporter / CANONICAL-INDEPENDENT | dirty bounds updated |
| `animatedBounds` | reporter / CANONICAL-INDEPENDENT | animated bounds updated |
| `visibleInstanceUploadBytes` | reporter / CANONICAL-INDEPENDENT | visible instance upload bytes |
| `lodEvaluations` | reporter / CANONICAL-INDEPENDENT | LOD evaluations |
| `lodSwitches` | reporter / CANONICAL-INDEPENDENT | LOD switches |
| `lodLevelInstanceCount` | reporter / CANONICAL-INDEPENDENT | instances using LOD level [LEVEL] |
| `shadowVisibilityCandidates` | reporter / CANONICAL-INDEPENDENT | shadow visibility candidates |
| `shadowFrustumRejected` | reporter / CANONICAL-INDEPENDENT | shadow frustum rejected |
| `shadowVisibleCasters` | reporter / CANONICAL-INDEPENDENT | visible shadow casters |
| `physicsMetric` | reporter / CANONICAL-INDEPENDENT | physics [METRIC] |
| `audioMetric` | reporter / CANONICAL-INDEPENDENT | audio [METRIC] |
| `postProcessingPassCount` | reporter / CANONICAL-INDEPENDENT | post-processing pass count |
| `postFullscreenDraws` | reporter / CANONICAL-INDEPENDENT | post fullscreen draws |
| `renderTargetAllocations` | reporter / CANONICAL-INDEPENDENT | render-target allocations this frame |
| `renderTargetResizes` | reporter / CANONICAL-INDEPENDENT | render-target resizes this frame |
| `renderTargetBytes` | reporter / CANONICAL-INDEPENDENT | estimated render-target GPU bytes |
| `bloomPasses` | reporter / CANONICAL-INDEPENDENT | bloom passes this frame |
| `postShaderCompiles` | reporter / CANONICAL-INDEPENDENT | post shader compiles |
| `offscreenCameraRenders` | reporter / CANONICAL-INDEPENDENT | offscreen camera renders this frame |
| `customRenderingMetric` | reporter / CANONICAL-INDEPENDENT | custom rendering [METRIC] |
| `raycastCount` | reporter / CANONICAL-INDEPENDENT | raycasts this update |
| `raycastBroadPhaseCandidates` | reporter / CANONICAL-INDEPENDENT | raycast broad-phase candidates |
| `raycastBoundsTests` | reporter / CANONICAL-INDEPENDENT | raycast bounds tests |
| `raycastTriangleTests` | reporter / CANONICAL-INDEPENDENT | raycast triangle tests |
| `raycastHits` | reporter / CANONICAL-INDEPENDENT | raycast hits this update |
| `raycastTime` | reporter / CANONICAL-INDEPENDENT | raycast CPU milliseconds |
| `terrainCount` | reporter / CANONICAL-INDEPENDENT | terrain count |
| `terrainTriangles` | reporter / CANONICAL-INDEPENDENT | terrain triangles |
| `terrainGeometryBuilds` | reporter / CANONICAL-INDEPENDENT | terrain geometry builds |
| `terrainGpuUploads` | reporter / CANONICAL-INDEPENDENT | terrain GPU uploads |
| `terrainGpuUploadBytes` | reporter / CANONICAL-INDEPENDENT | terrain GPU upload bytes |
| `visibleTerrainChunks` | reporter / CANONICAL-INDEPENDENT | visible terrain chunks |
| `culledTerrainChunks` | reporter / CANONICAL-INDEPENDENT | culled terrain chunks |
| `activeTweens` | reporter / CANONICAL-INDEPENDENT | active tweens |
| `tweenUpdates` | reporter / CANONICAL-INDEPENDENT | tween updates this frame |
| `completedTweens` | reporter / CANONICAL-INDEPENDENT | tweens completed this frame |
| `tweenUpdateTime` | reporter / CANONICAL-INDEPENDENT | tween update milliseconds |
| `internalRenderWidth` | reporter / LEGACY-COMPATIBILITY-ALIAS | internal render width |
| `internalRenderHeight` | reporter / LEGACY-COMPATIBILITY-ALIAS | internal render height |
| `setBloomIntensity` | command / LEGACY-COMPATIBILITY-ALIAS | set bloom intensity [VALUE] |
| `setBloomThreshold` | command / LEGACY-COMPATIBILITY-ALIAS | set bloom threshold [VALUE] |
| `setPostBrightness` | command / LEGACY-COMPATIBILITY-ALIAS | set post brightness [VALUE] |
| `setPostContrast` | command / LEGACY-COMPATIBILITY-ALIAS | set post contrast [VALUE] |
| `setPostSaturation` | command / LEGACY-COMPATIBILITY-ALIAS | set post saturation [VALUE] |
| `setVignetteIntensity` | command / LEGACY-COMPATIBILITY-ALIAS | set vignette intensity [VALUE] |
| `setVignetteRadius` | command / LEGACY-COMPATIBILITY-ALIAS | set vignette radius [VALUE] |
| `setVignetteSoftness` | command / LEGACY-COMPATIBILITY-ALIAS | set vignette softness [VALUE] |
| `renderTargetWidth` | reporter / LEGACY-COMPATIBILITY-ALIAS | render target [TARGET] width |
| `renderTargetHeight` | reporter / LEGACY-COMPATIBILITY-ALIAS | render target [TARGET] height |
| `createPbrMaterial` | command / LEGACY-COMPATIBILITY-ALIAS | create PBR material [MATERIAL] |
| `setPbrMetallic` | command / LEGACY-COMPATIBILITY-ALIAS | set PBR material [MATERIAL] metallic [VALUE] |
| `setPbrRoughness` | command / LEGACY-COMPATIBILITY-ALIAS | set PBR material [MATERIAL] roughness [VALUE] |
| `setPbrNormalStrength` | command / LEGACY-COMPATIBILITY-ALIAS | set PBR material [MATERIAL] normal strength [VALUE] |
| `setPbrAoStrength` | command / LEGACY-COMPATIBILITY-ALIAS | set PBR material [MATERIAL] AO strength [VALUE] |
| `textureWidth` | reporter / LEGACY-COMPATIBILITY-ALIAS | texture [TEXTURE] width |
| `textureHeight` | reporter / LEGACY-COMPATIBILITY-ALIAS | texture [TEXTURE] height |
| `rayHitValue` | reporter / LEGACY-COMPATIBILITY-ALIAS | ray hit [FIELD] |
| `setCameraNearClip` | command / LEGACY-COMPATIBILITY-ALIAS | set camera [CAMERA] near clip [DISTANCE] |
| `setCameraFarClip` | command / LEGACY-COMPATIBILITY-ALIAS | set camera [CAMERA] far clip [DISTANCE] |

### Registered menus

| Menu | Values | Reporter inputs |
| --- | --- | --- |
| `postColorFactor` | brightness, contrast, saturation | true |
| `bloomFactor` | intensity, threshold | true |
| `vignetteFactor` | intensity, radius, softness | true |
| `pbrFactor` | metallic, roughness, normal strength, AO strength | true |
| `cameraClipPlane` | near, far | true |
| `dimension` | width, height | true |
| `rayNumberField` | distance, x, y, z, normal x, normal y, normal z, triangle, primitive, geometry ID | true |
| `rayTextField` | object, kind, node, precision, material | true |
| `geometryUsage` | static, dynamic | true |
| `materialSide` | front, back, double | true |
| `materialBlend` | opaque, normal, additive | true |
| `materialRenderNumber` | renderOrder, polygonOffsetFactor, polygonOffsetUnits | true |
| `materialEnvironmentFactor` | intensity, rotation | true |
| `customRenderingMetric` | shader compiles, shader draws, uniform uploads, geometry uploads | true |
| `physicsType` | static, kinematic, dynamic | true |
| `physicsVector` | position, velocity | true |
| `physicsNumber` | mass, restitution, friction, gravityScale | true |
| `physicsContactState` | current, entered, exited | true |
| `physicsContactField` | normal x, normal y, normal z, point x, point y, point z, penetration | true |
| `physicsBodyField` | x, y, z, velocity x, velocity y, velocity z, mass, restitution, friction, gravityScale | true |
| `physicsMetric` | steps, integrated, candidates, narrowTests, gridUpdates, droppedTime, contactOverflows | true |
| `audioMode` | positional, global | true |
| `audioAction` | play, pause, resume, stop | true |
| `audioNumber` | volume, rate, refDistance, maxDistance, rolloff, coneInner, coneOuter, coneGain | true |
| `audioVector` | position, direction | true |
| `audioReadNumber` | time, duration, volume, rate, refDistance, maxDistance, rolloff, coneInner, coneOuter, coneGain | true |
| `audioMetric` | contexts, decodes, voices, listenerUpdates, sourceUpdates | true |
| `sceneTextProperty` | name, active camera, environment, background color, ambient color | true |
| `sceneNumberProperty` | background opacity %, ambient intensity, render resources, instance groups, model instances, effects, local lights, physics bodies, audio sources | true |
| `cameraNumberProperty` | fov degrees, near clip, far clip | true |
| `materialNumberProperty` | opacity %, alpha cutoff %, emissive intensity, normal strength, ao strength, render order, polygon offset factor, polygon offset units, environment intensity, environment rotation degrees | true |
| `materialTextProperty` | side, alpha mode, blend, shader, base color, emissive color, base texture, normal texture, metallic texture, roughness texture, metallic roughness texture, emissive texture, ambient occlusion texture | true |
| `materialBooleanProperty` | depth test, depth write, double sided | true |
| `textureNumberProperty` | anisotropy, offset u, offset v, repeat u, repeat v, rotation degrees | true |
| `textureTextProperty` | min filter, mag filter, wrap u, wrap v, color space | true |
| `textureBooleanProperty` | mipmaps, flip y | true |
| `instanceGroupNumberProperty` | members | true |
| `directionalLightNumberProperty` | intensity, shadow map size, shadow bias, shadow normal bias, shadow distance, shadow near, shadow far, shadow bounds | true |
| `directionalLightTextProperty` | color, shadow filter | true |
| `directionalLightBooleanProperty` | casts shadows | true |
| `localLightTextProperty` | color | true |
| `spotLightNumberProperty` | inner angle degrees, outer angle degrees, direction x, direction y, direction z | true |
| `environmentTextProperty` | source texture, error | true |
| `modelInfoNumberProperty` | skins, morph targets (metadata only), nodes, animations, primitives, scenes, users, cpu bytes | true |
| `modelInstanceTextProperty` | base asset, active lod asset, current animation, lod group | true |
| `modelInstanceNumberProperty` | selected animation, animation progress %, transition progress %, lod hysteresis, forced lod level, active lod level | true |
| `modelInstanceBooleanProperty` | animation looping, lod enabled, lod assigned, transition active | true |
| `effectNumberProperty` | width, height, pivot x, pivot y, opacity %, brightness, alpha cutoff %, sheet columns, sheet rows, frame, rendered frame, animation first frame, animation last frame, animation fps, animation time, directional views, facing degrees, roll degrees | true |
| `setEffectNumberProperty` | opacity %, brightness | true |
| `effectTextProperty` | alpha mode, lighting, texture, billboard mode | true |
| `effectBooleanProperty` | depth test, depth write, frame animation playing, frame animation paused, frame animation looping, frustum culling | true |
| `particleNumberProperty` | capacity, emission rate, minimum lifetime, maximum lifetime, spread x, spread y, spread z, spawn extent x, spawn extent y, spawn extent z, velocity x, velocity y, velocity z, acceleration x, acceleration y, acceleration z, start size, end size, start alpha %, end alpha %, minimum rotation degrees, maximum rotation degrees, minimum angular speed degrees, maximum angular speed degrees, particle frame rate, active particles | true |
| `particleTextProperty` | spawn shape, start color, end color | true |
| `particleBooleanProperty` | emitting, paused | true |
| `decalNumberProperty` | surface offset, lifetime, age, normal x, normal y, normal z | true |
| `decalBooleanProperty` | expired | true |
| `postNumberProperty` | brightness, contrast, saturation, bloom threshold, bloom quality level, vignette intensity, vignette radius, vignette softness | true |
| `postBooleanProperty` | active, fxaa | true |
| `qualityNumberProperty` | adaptive minimum scale %, adaptive maximum scale %, adaptive current scale % | true |
| `terrainNumberProperty` | width, depth, x segments, z segments, logical edits, geometry builds | true |
| `terrainBooleanProperty` | dirty | true |
| `textContentProperty` | text, font, alignment | true |
| `textNumberProperty` | font size pixels, resolution, world width, world height | true |
| `textBooleanProperty` | automatic width | true |
| `customGeometryNumberProperty` | vertices, indices, triangles, vertex bytes, index bytes, users, minimum x, minimum y, minimum z, maximum x, maximum y, maximum z | true |
| `customGeometryBooleanProperty` | dynamic | true |
| `customGeometryTextProperty` | usage | true |
| `customShaderNumberProperty` | uniforms, users | true |
| `physicsBodyTextProperty` | type, shape, object | true |
| `physicsBodyBooleanProperty` | trigger, attached | true |
| `physicsBodyMeasureProperty` | width, height, depth, radius, offset x, offset y, offset z, layer bits, mask bits | true |
| `physicsWorldNumberProperty` | gravity x, gravity y, gravity z | true |
| `audioSourceTextProperty` | mode, object, asset, error | true |
| `audioSourceBooleanProperty` | looping, attached | true |
| `audioSpatialNumberProperty` | position x, position y, position z, direction x, direction y, direction z | true |
| `audioAssetNumberProperty` | duration seconds, channels, sample rate hz, users | true |
| `audioAssetTextProperty` | state, error | true |
| `audioListenerNumberProperty` | position x, position y, position z, forward x, forward y, forward z, up x, up y, up z | true |
| `tweenNumberProperty` | position progress %, rotation progress %, scale progress %, fov progress % | true |
| `tweenBooleanProperty` | position paused, rotation paused, scale paused, fov paused | true |
| `resourceTransformProperty` | position, rotation, scale | true |
| `resourceTransformCopyProperty` | position, rotation, scale, all | true |
| `colorComponent` | red, green, blue, alpha | true |
| `coordinateDirection` | local to world, world to local | true |
| `coordinateKind` | point, direction | true |
| `cameraMoveAxis` | forward, right, up | true |
| `textureFilterKind` | min-filter, mag-filter | true |
| `textureFilterValue` | nearest, linear, nearest-mipmap-nearest, linear-mipmap-nearest, nearest-mipmap-linear, linear-mipmap-linear | true |
| `textureWrapAxis` | u, v | true |
| `textureWrapValue` | clamp, repeat, mirror | true |
| `textureBooleanOption` | mipmaps, flip-y | true |
| `textureColorSpace` | srgb, linear | true |
| `modelNodeTextProperty` | name, parent, children | true |
| `modelNodeNumberProperty` | parent index, child count, mesh index, skin index, translation x, translation y, translation z | true |
| `modelSkinNumberProperty` | joints, skeleton node, joint node | true |
| `modelAnimationNumberProperty` | duration seconds, start seconds, end seconds, channels, samplers | true |
| `customUniformTextProperty` | type, sampler texture | true |
| `backend` | auto, shared-webgl2, separate-canvas | true |
| `texturePreset` | solid, checker | true |
| `textureOption` | min-filter, mag-filter, wrap-u, wrap-v, mipmaps, anisotropy, color-space, flip-y | true |
| `onOff` | on, off | true |
| `shadowQuality` | off, low, medium, high, ultra, custom | true |
| `shadowFilter` | hard, pcf-4, pcf-9 | true |
| `renderQuality` | potato, low, medium, high, ultra | true |
| `antialias` | off, native | true |
| `pixelRatio` | automatic, 1, 1.5, 2 | true |
| `textureQuality` | potato, low, medium, high, ultra, custom | true |
| `environmentQuality` | potato, low, medium, high, ultra, custom | true |
| `localLightAxis` | x, y, z | true |
| `materialType` | unlit, basic-lit, pbr | true |
| `pbrMap` | normal, metallic, roughness, metallic-roughness, emissive, ambient-occlusion | true |
| `alphaMode` | opaque, cutout, blend | true |
| `billboardMode` | full, y-axis, fixed, screen-aligned | true |
| `spritePivot` | center, bottom-center, top-center | true |
| `effectAlphaMode` | opaque, cutout, blend, additive | true |
| `effectLighting` | unlit, lit | true |
| `particleSpawnShape` | point, box, sphere | true |
| `bloomQuality` | low, medium, high, ultra | true |
| `raycastBackface` | both, front, back | true |
| `raycastResultField` | object, kind, node, precision, distance, x, y, z, normal x, normal y, normal z, triangle, primitive, geometry ID, material | true |
| `coordinateValue` | stage x, stage y, depth, NDC x, NDC y, NDC z | true |
| `vectorAxis` | x, y, z | true |
| `basisAxis` | forward, right, up | true |
| `cameraRotationAxis` | yaw, pitch | true |
| `tweenEasing` | linear, ease-in, ease-out, ease-in-out, smoothstep | true |
| `textFont` | sans-serif, serif, monospace, system-ui, Arial, Verdana, Georgia, Times New Roman, Courier New | true |
| `textAlignment` | left, center, right | true |

<!-- block-inventory:end -->
