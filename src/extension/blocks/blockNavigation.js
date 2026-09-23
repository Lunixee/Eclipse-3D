// toolbox order; serialized definitions live in the block modules
export const BLOCK_SECTIONS = Object.freeze([
    Object.freeze({name: "Scene", groups: Object.freeze([
        Object.freeze({name: "Engine and scene lifecycle", opcodes: Object.freeze("initializeEngine createScene setActiveScene setSceneBackground sceneExists sceneText sceneNumber engineInitialized renderOneFrame deleteScene resetEngine disposeEngine".split(' '))})
    ])}),
    Object.freeze({name: "Camera", groups: Object.freeze([
        Object.freeze({name: "Camera selection and projection", opcodes: Object.freeze("createCamera setActiveCamera lookCameraAt setCameraFov changeCameraFov setCameraClip cameraNumber".split(' '))}),
        Object.freeze({name: "Camera movement and basis", opcodes: Object.freeze("moveCameraLocal rotateCamera cameraBasisComponent pointAheadOfCamera".split(' '))})
    ])}),
    Object.freeze({name: "Models & Objects", groups: Object.freeze([
        Object.freeze({name: "Primitive and instance creation", opcodes: Object.freeze("createCube createCubeInstances".split(' '))}),
        Object.freeze({name: "Shared resource and instance transforms", opcodes: Object.freeze("setPosition setRotation setScale rotateResourceBy setInstancePosition setInstanceTransform lookObjectAt copyResourceTransform setResourceVisible setResourceTint setInstanceTint resourceExists resourceKind resourceVisible resourceTransform instanceTransform resourceTint instanceTint instanceGroupNumber deleteResource".split(' '))}),
        Object.freeze({name: "Model assets and instances", opcodes: Object.freeze("loadModelFromSource importModelFile loadModelFromFile createModelInstance createModelInstances setModelNodePosition modelExists modelState modelError modelNodeCount modelPrimitiveCount modelTriangleCount modelNodeText modelNodeNumber modelSkinText modelSkinNumber modelInfoNumber modelInstanceText modelInstanceNumber modelInstanceBoolean deleteModelAsset".split(' '))}),
        Object.freeze({name: "Visibility and LOD", opcodes: Object.freeze("setResourceFrustumCulling resourceFrustumCullingEnabled createLodGroup addLodLevel assignModelLodGroup clearModelLodGroup setModelLodEnabled setModelLodHysteresis forceModelLodLevel modelLodGroup currentModelLodLevel lodLevelText lodLevelNumber lodGroupLevelCount lodGroupExists deleteLodGroup".split(' '))})
    ])}),
    Object.freeze({name: "Geometry", groups: Object.freeze([
        Object.freeze({name: "Custom geometry and model binding", opcodes: Object.freeze("createCustomGeometry updateCustomGeometry createGeometryModel customGeometryExists customGeometryNumber customGeometryBoolean customGeometryText deleteCustomGeometry".split(' '))})
    ])}),
    Object.freeze({name: "Materials & Textures", groups: Object.freeze([
        Object.freeze({name: "Materials, assignment and surface state", opcodes: Object.freeze("createMaterial cloneMaterial setResourceMaterial setMaterialColor setMaterialBaseColor setMaterialOpacity setMaterialTexture setMaterialEmissive setMaterialEmissiveIntensity setMaterialDoubleSided setMaterialDepthTest setMaterialDepthWrite setMaterialAlphaMode setMaterialAlphaCutoff setMaterialSide setMaterialBlendMode setMaterialRenderNumber setMaterialEnvironmentFactor materialExists materialOfResource materialType materialUsers materialNumber materialText materialBoolean deleteMaterial".split(' '))}),
        Object.freeze({name: "PBR and shader preparation", opcodes: Object.freeze("setPbrFactor setPbrMapTexture removePbrMapTexture pbrMetallic pbrRoughness warmMaterialShader".split(' '))}),
        Object.freeze({name: "Textures and sampling", opcodes: Object.freeze("createGeneratedTexture loadTextureFromSource loadTextureFromCostume loadTextureFromFile setResourceTexture setTextureOption setTextureUV setTextureFilter setTextureWrap setTextureBooleanOption setTextureAnisotropy setTextureColorSpace textureExists textureState textureError textureDimension textureUsers textureNumber textureText textureBoolean deleteTexture".split(' '))})
    ])}),
    Object.freeze({name: "Lighting & Environment", groups: Object.freeze([
        Object.freeze({name: "Directional and ambient lights", opcodes: Object.freeze("createDirectionalLight setDirectionalLight setAmbientLight directionalLightNumber directionalLightText directionalLightBoolean".split(' '))}),
        Object.freeze({name: "Point and spot lights", opcodes: Object.freeze("createPointLight createSpotLight setLocalLightPosition setLocalLightColor setLocalLightIntensity setLocalLightRange setLocalLightEnabled setSpotLightDirection pointSpotLightToward setSpotLightInnerAngle setSpotLightOuterAngle localLightExists localLightType localLightPosition localLightIntensity localLightRange localLightEnabled localLightText spotLightNumber deleteLocalLight".split(' '))}),
        Object.freeze({name: "Directional shadows", opcodes: Object.freeze("setShadowsEnabled setShadowQuality setLightCastsShadows setResourceCastsShadows setResourceReceivesShadows setShadowMapSize setShadowBias setShadowNormalBias setShadowFilter setShadowDistance setShadowCameraNear setShadowCameraFar setShadowBounds shadowsEnabled shadowQuality shadowMapSize".split(' '))}),
        Object.freeze({name: "Environment resources", opcodes: Object.freeze("createSolidEnvironment createEnvironmentFromTexture setEnvironmentTexture setSceneEnvironment clearSceneEnvironment setEnvironmentIntensity setEnvironmentRotation setEnvironmentBackground environmentExists environmentState activeEnvironment environmentUsers environmentIntensity environmentRotation environmentBackgroundEnabled environmentText deleteEnvironment".split(' '))})
    ])}),
    Object.freeze({name: "Animation", groups: Object.freeze([
        Object.freeze({name: "Clips, playback, blending and pose", opcodes: Object.freeze("animationCount animationName animationDuration modelAnimationText modelAnimationNumber playAnimation setAnimationTime setAnimationSpeed setAnimationLooping crossfadeAnimation pauseAnimation resumeAnimation stopAnimation resetModelPose currentAnimation animationTime animationProgress animationPlaying animationPaused animationFinished animationSpeed".split(' '))})
    ])}),
    Object.freeze({name: "Sprites, Particles, Decals & Text", groups: Object.freeze([
        Object.freeze({name: "Sprites and shared effect controls", opcodes: Object.freeze("createSprite setEffectVisible setEffectSize setEffectTint setEffectAlphaMode setEffectLighting setEffectDepth setEffectNumber effectKind effectExists effectVisible effectNumber effectText effectBoolean setSpriteBillboardMode spriteBillboardMode setSpritePivot setSpriteCustomPivot setSpriteSheet setSpriteFrame playSpriteFrames pauseSpriteFrames resumeSpriteFrames stopSpriteFrames setSpriteDirectionalViews setSpriteDirectionalFrame spriteCurrentFrame spriteDirectionalFrame".split(' '))}),
        Object.freeze({name: "Particles", opcodes: Object.freeze("createParticleEmitter setParticleEmissionRate setParticleMaximum setParticleSpawnShape setParticleVelocity setParticleAcceleration setParticleLifetime setParticleSizeOverLife setParticleAlphaOverLife setParticleColorOverLife setParticleRotation setParticleFrameRate setParticleSeed setParticleSpread startParticleEmitter stopParticleEmitter pauseParticleEmitter resumeParticleEmitter clearParticleEmitter burstParticles activeParticleCount particleEmitterEmitting particleEmitterPaused particleNumber particleText particleBoolean".split(' '))}),
        Object.freeze({name: "Decals", opcodes: Object.freeze("createDecal setDecalNormal setDecalOffset setDecalLifetime decalNumber decalBoolean".split(' '))}),
        Object.freeze({name: "Text", opcodes: Object.freeze("create3DText set3DText set3DTextPosition set3DTextSize set3DTextBillboard set3DTextPivot set3DTextColor set3DTextFont set3DTextAlignment set3DTextBackground set3DTextResolution textContent textNumber textBoolean delete3DText".split(' '))})
    ])}),
    Object.freeze({name: "Physics", groups: Object.freeze([
        Object.freeze({name: "Bodies, attachments and world settings", opcodes: Object.freeze("createPhysicsBox createPhysicsSphere setPhysicsGravity setPhysicsVector setPhysicsNumber setPhysicsTrigger setPhysicsFilter attachPhysicsBody physicsBodyExists physicsBodyNumber physicsBodySleeping physicsBodyText physicsBodyBoolean physicsBodyMeasure physicsWorldNumber deletePhysicsBody".split(' '))}),
        Object.freeze({name: "Contacts", opcodes: Object.freeze("physicsTouching physicsContactCount physicsContactName physicsContactNumber".split(' '))})
    ])}),
    Object.freeze({name: "Audio", groups: Object.freeze([
        Object.freeze({name: "Assets and source playback", opcodes: Object.freeze("loadAudioURL loadAudioSound unlockAudio createAudioSource setAudioNumber setAudioLoop setAudioVector attachAudioSource controlAudioSource audioAssetExists audioAssetState audioAssetNumber audioAssetText audioSourceExists audioSourceState audioSourceNumber audioSourceText audioSourceBoolean audioSpatialNumber audioListenerNumber deleteAudioSource deleteAudioAsset".split(' '))})
    ])}),
    Object.freeze({name: "Render Quality, Targets & Post Processing", groups: Object.freeze([
        Object.freeze({name: "Quality and visibility policy", opcodes: Object.freeze("setRenderQuality renderQuality setRenderResolutionScale renderResolutionScale setMaxPixelRatio maxPixelRatio setAntialiasing antialiasing setRenderDistance renderDistance setFrustumCulling frustumCullingEnabled setGlobalTextureQuality globalTextureQuality setGlobalEnvironmentQuality globalEnvironmentQuality setMaximumLocalLights maximumLocalLights setAdaptiveResolution adaptiveResolutionEnabled setAdaptiveTargetFps adaptiveTargetFps setAdaptiveScaleRange qualityNumber".split(' '))}),
        Object.freeze({name: "Render targets", opcodes: Object.freeze("createRenderTarget resizeRenderTarget renderSceneToRenderTarget renderCameraToRenderTarget clearRenderTarget renderTargetExists renderTargetDimension deleteRenderTarget".split(' '))}),
        Object.freeze({name: "Post processing", opcodes: Object.freeze("setPostProcessing setBloom setBloomFactor setBloomQuality setPostColorFactor setVignetteFactor setFxaa postProcessingEnabled bloomEnabled bloomIntensity postNumber postBoolean resetPostProcessing".split(' '))})
    ])}),
    Object.freeze({name: "Custom Rendering", groups: Object.freeze([
        Object.freeze({name: "GLSL programs, materials and uniforms", opcodes: Object.freeze("createCustomShader createCustomMaterial setCustomUniform setCustomUniformVector setCustomSampler customShaderExists customUniformText customUniformNumber customShaderNumber deleteCustomShader".split(' '))})
    ])}),
    Object.freeze({name: "Raycasting & Picking", groups: Object.freeze([
        Object.freeze({name: "Ray queries and typed results", opcodes: Object.freeze("setRaycastBackface castWorldRay castStageRay castCameraForwardRay rayHit rayHitNumber rayHitText".split(' '))}),
        Object.freeze({name: "Stage/world projection", opcodes: Object.freeze("worldToStageValue worldPointInFront worldPointVisible stageRayDirection".split(' '))})
    ])}),
    Object.freeze({name: "Terrain & World Utilities", groups: Object.freeze([
        Object.freeze({name: "Terrain construction, edits and queries", opcodes: Object.freeze("createTerrain setTerrainHeight setTerrainFlat generateTerrainHills setTerrainMaterial terrainHeightAt terrainNormalAt terrainExists terrainGridHeight terrainNumber terrainBoolean deleteTerrain".split(' '))}),
        Object.freeze({name: "Vectors and coordinates", opcodes: Object.freeze("distance3D vectorLength3D dotProduct3D crossProduct3D vectorNormalizedComponent directionComponent3D angleBetweenVectors lerpNumber clampNumber distanceBetweenResources transformResourceCoordinate".split(' '))})
    ])}),
    Object.freeze({name: "Tweens & Motion", groups: Object.freeze([
        Object.freeze({name: "Local and camera-relative motion", opcodes: Object.freeze("moveObjectLocal objectBasisComponent moveResourceByCamera".split(' '))}),
        Object.freeze({name: "Tweens", opcodes: Object.freeze("tweenResourcePosition tweenResourceRotation tweenResourceScale tweenCameraFov pauseTween resumeTween stopTween tweenActive tweenNumber tweenBoolean".split(' '))})
    ])}),
    Object.freeze({name: "Metrics, Profiling & Debug", groups: Object.freeze([
        Object.freeze({name: "Engine, output and errors", opcodes: Object.freeze("rendererBackend currentFps averageFps drawCalls internalRenderDimension effectivePixelRatio internalRenderPixels lastError clearError".split(' '))}),
        Object.freeze({name: "Model and geometry resources", opcodes: Object.freeze("modelAssetCount loadedGeometryCount geometryGpuBytes geometryUploads".split(' '))}),
        Object.freeze({name: "Materials and PBR", opcodes: Object.freeze("materialCount materialPrograms materialShaderCompiles materialProgramSwitches materialSwitches textureSwitches pbrPrograms pbrDrawCalls".split(' '))}),
        Object.freeze({name: "Lighting, shadows and environments", opcodes: Object.freeze("activeLocalLightCount selectedLocalLightCount localLightListRebuilds localLightGpuUploads localLightDrawCalls localLightSelectionTime shadowRenderTime shadowDrawCalls shadowTriangles shadowCasters shadowMapsUpdated environmentPreprocessTime environmentPreprocesses environmentResources environmentIblDrawCalls environmentBackgroundDrawCalls".split(' '))}),
        Object.freeze({name: "Animation and skinning", opcodes: Object.freeze("activeAnimationPlayers sampledAnimationChannels animationSamplingTime jointPaletteUploads jointPaletteUploadBytes skinnedDrawCalls skinnedShadowDrawCalls".split(' '))}),
        Object.freeze({name: "Sprites, particles, decals and text", opcodes: Object.freeze("spriteCount visibleSpriteCount spriteDrawCalls spriteInstanceUploadBytes directionalFrameChanges activeParticleEmitters totalActiveParticles particlesSpawned particlesExpired particleSimulationTime visibleParticleEmitters culledParticleEmitters particleInstanceUploadBytes particleDrawCalls decalCount visibleDecalCount decalDrawCalls textLabelCount textRasterizations textTextureUploads sharedTextTextures renderedTextInstances textDrawCalls".split(' '))}),
        Object.freeze({name: "Visibility, spatial index and LOD", opcodes: Object.freeze("totalRenderables visibilityCandidates spatialCandidates frustumTests frustumRejected renderDistanceRejected visibleRenderables visibleInstances culledInstances visibilityCpuTime spatialQueryCpuTime spatialIndexEntries spatialIndexUpdates spatialIndexRebuilds dirtyBounds animatedBounds visibleInstanceUploadBytes lodEvaluations lodSwitches lodLevelInstanceCount shadowVisibilityCandidates shadowFrustumRejected shadowVisibleCasters".split(' '))}),
        Object.freeze({name: "Physics and audio", opcodes: Object.freeze("physicsMetric audioMetric".split(' '))}),
        Object.freeze({name: "Post processing and targets", opcodes: Object.freeze("postProcessingPassCount postFullscreenDraws renderTargetAllocations renderTargetResizes renderTargetBytes bloomPasses postShaderCompiles offscreenCameraRenders".split(' '))}),
        Object.freeze({name: "Custom rendering", opcodes: Object.freeze("customRenderingMetric".split(' '))}),
        Object.freeze({name: "Raycasting, terrain and tweens", opcodes: Object.freeze("raycastCount raycastBroadPhaseCandidates raycastBoundsTests raycastTriangleTests raycastHits raycastTime terrainCount terrainTriangles terrainGeometryBuilds terrainGpuUploads terrainGpuUploadBytes visibleTerrainChunks culledTerrainChunks activeTweens tweenUpdates completedTweens tweenUpdateTime".split(' '))})
    ])})
]);

export const isExecutableBlock = block => Boolean(block && typeof block === 'object' &&
    typeof block.opcode === 'string' && block.blockType !== 'label');

export const organizeBlockPalette = (blocks, Scratch) => {
    const definitions = new Map(blocks.filter(isExecutableBlock).map(block => [block.opcode, block]));
    const result = [];
    const label = text => {
        if (Scratch.BlockType.LABEL) result.push({blockType: Scratch.BlockType.LABEL, text});
    };
    for (const section of BLOCK_SECTIONS) {
        if (result.length) result.push('---');
        label(section.name);
        for (const [index, group] of section.groups.entries()) {
            if (index) result.push('---');
            if (section.groups.length > 1) label(group.name);
            for (const opcode of group.opcodes) {
                const block = definitions.get(opcode);
                if (!block || block.hideFromPalette) throw new Error('Invalid public palette opcode: ' + opcode);
                result.push(block);
                definitions.delete(opcode);
            }
        }
    }
    for (const block of definitions.values()) {
        if (!block.hideFromPalette) throw new Error('Unplaced public opcode: ' + block.opcode);
        result.push(block);
    }
    return result;
};
