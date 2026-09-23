const SAMPLE_COUNT = 240;

export class FrameProfiler {
    constructor() {
        this.frameIntervals = new Float64Array(SAMPLE_COUNT);
        this.renderTimes = new Float64Array(SAMPLE_COUNT);
        this.frameIndex = 0;
        this.frameSamples = 0;
        this.renderIndex = 0;
        this.renderSamples = 0;
        this.lastFrameTime = -1;
        this.drawCalls = 0;
        this.instances = 0;
        this.shadowPasses = 0;
        this.shadowDrawCalls = 0;
        this.shadowTriangles = 0;
        this.shadowRenderTime = 0;
        this.shadowCasters = 0;
        this.shadowMapsUpdated = 0;
        this.materialCount = 0;
        this.materialPrograms = 0;
        this.materialShaderCompiles = 0;
        this.materialProgramSwitches = 0;
        this.materialSwitches = 0;
        this.textureSwitches = 0;
        this.pbrPrograms = 0;
        this.pbrDrawCalls = 0;
        this.environmentResources = 0;
        this.environmentPreprocesses = 0;
        this.environmentPreprocessTime = 0;
        this.environmentBackgroundDrawCalls = 0;
        this.environmentIblDrawCalls = 0;
        this.environmentTextureSwitches = 0;
        this.totalLocalLights = 0;
        this.enabledPointLights = 0;
        this.enabledSpotLights = 0;
        this.selectedLocalLights = 0;
        this.selectedPointLights = 0;
        this.selectedSpotLights = 0;
        this.selectedLocalLightReferences = 0;
        this.candidateLocalLightReferences = 0;
        this.localLightSelectionEvaluations = 0;
        this.localLightListRebuilds = 0;
        this.localLightGpuUploads = 0;
        this.localLightDrawCalls = 0;
        this.localLightsRejectedByRange = 0;
        this.localLightsRejectedByCone = 0;
        this.localLightsRejectedByBudget = 0;
        this.localLightSelectionTime = 0;
        this.absoluteMaximumLocalLights = 0;
        this.effectiveLocalLightBudget = 0;
        this.geometryResources = 0;
        this.geometryUploads = 0;
        this.customShaderCompiles = 0;
        this.customShaderDraws = 0;
        this.customUniformUploads = 0;
        this.customGeometryUploads = 0;
        this.geometryGpuBytes = 0;
        this.modelAssets = 0;
        this.modelInstances = 0;
        this.modelPrimitives = 0;
        this.modelTriangles = 0;
        this.terrainCount = 0;
        this.terrainTriangles = 0;
        this.terrainGeometryBuilds = 0;
        this.terrainGeometryBuildBytes = 0;
        this.terrainGpuUploads = 0;
        this.terrainGpuUploadBytes = 0;
        this.visibleTerrainChunks = 0;
        this.culledTerrainChunks = 0;
        this.textLabels = 0;
        this.visibleTextLabels = 0;
        this.renderedTextInstances = 0;
        this.textDrawCalls = 0;
        this.textRasterizations = 0;
        this.textTextureUploads = 0;
        this.sharedTextTextures = 0;
        this.activeAnimationPlayers = 0;
        this.sampledAnimationChannels = 0;
        this.animationSamplingTime = 0;
        this.animationHierarchyUpdates = 0;
        this.jointPalettesUpdated = 0;
        this.activeParticleEmitters = 0;
        this.activeParticles = 0;
        this.particlesSpawned = 0;
        this.particlesExpired = 0;
        this.particlesSimulated = 0;
        this.particleSimulationTime = 0;
        this.animatedSprites = 0;
        this.directionalFrameChanges = 0;
        this.activeTweens = 0;
        this.tweenUpdates = 0;
        this.completedTweens = 0;
        this.tweenUpdateTime = 0;
        this.raycasts = 0;
        this.raycastBroadPhaseCandidates = 0;
        this.raycastBoundsTests = 0;
        this.raycastTriangleTests = 0;
        this.raycastExactHits = 0;
        this.raycastHits = 0;
        this.raycastTime = 0;
        this.spriteCount = 0;
        this.visibleSprites = 0;
        this.culledSprites = 0;
        this.spriteBatches = 0;
        this.spriteDrawCalls = 0;
        this.spriteInstanceUploads = 0;
        this.spriteInstanceUploadBytes = 0;
        this.spriteSorts = 0;
        this.visibleParticleEmitters = 0;
        this.culledParticleEmitters = 0;
        this.renderedParticles = 0;
        this.particleInstanceUploads = 0;
        this.particleInstanceUploadBytes = 0;
        this.particleDrawCalls = 0;
        this.decalCount = 0;
        this.visibleDecals = 0;
        this.decalBatches = 0;
        this.decalDrawCalls = 0;
        this.effectInstanceUploads = 0;
        this.effectInstanceUploadBytes = 0;
        this.effectShaderCompiles = 0;
        this.jointPaletteUploads = 0;
        this.jointPaletteUploadBytes = 0;
        this.skinnedDrawCalls = 0;
        this.skinnedShadowDrawCalls = 0;
        this.visibleInstanceUploads = 0;
        this.visibleInstanceUploadBytes = 0;
        this.totalRenderables = 0;
        this.visibilityCandidates = 0;
        this.spatialCandidates = 0;
        this.bruteForceCandidates = 0;
        this.frustumTested = 0;
        this.frustumRejected = 0;
        this.renderDistanceRejected = 0;
        this.explicitlyHiddenRejected = 0;
        this.visibleRenderables = 0;
        this.visibleInstances = 0;
        this.culledInstances = 0;
        this.visibilityCpuTime = 0;
        this.spatialQueryCpuTime = 0;
        this.spatialIndexEntries = 0;
        this.spatialIndexUpdates = 0;
        this.spatialIndexRebuilds = 0;
        this.dirtyBounds = 0;
        this.animatedBounds = 0;
        this.visibilityReused = 0;
        this.visibilitySpatialPath = 0;
        this.lodEvaluations = 0;
        this.lodSwitches = 0;
        this.lodReused = 0;
        this.shadowVisibilityCandidates = 0;
        this.shadowFrustumRejected = 0;
        this.shadowVisibleCasters = 0;
        this.shadowSpatialCandidates = 0;
        this.shadowSpatialQueryTime = 0;
        this.shadowVisibilityReused = 0;
        this.shadowInstanceUploadBytes = 0;
        this.postProcessingActive = false;
        this.postPasses = 0;
        this.fullscreenDraws = 0;
        this.postFramebufferBinds = 0;
        this.renderTargetAllocations = 0;
        this.renderTargetResizes = 0;
        this.renderTargetReuses = 0;
        this.renderTargetBytes = 0;
        this.sceneTargetBytes = 0;
        this.bloomPasses = 0;
        this.bloomLevels = 0;
        this.bloomTargetBytes = 0;
        this.postShaderCompiles = 0;
        this.postShaderCompilesThisFrame = 0;
        this.targetResolves = 0;
        this.offscreenCameraRenders = 0;
        this.totalOffscreenCameraRenders = 0;
    }

    recordTick(now) {
        if (!Number.isFinite(now) || now < 0) return 0;
        let interval = 0;
        if (this.lastFrameTime >= 0) {
            interval = Math.max(0, now - this.lastFrameTime);
            this.frameIntervals[this.frameIndex] = interval;
            this.frameIndex = (this.frameIndex + 1) % SAMPLE_COUNT;
            this.frameSamples = Math.min(SAMPLE_COUNT, this.frameSamples + 1);
        }
        this.lastFrameTime = now;
        return interval;
    }

    /**
     * @param {number} milliseconds
     * @param {number} drawCalls
     * @param {number} instances
     * @param {{passes: number, drawCalls: number, triangles: number, cpuTime: number,
     * casters: number, mapUpdates: number, skinnedDrawCalls?: number, candidates?: number,
     * frustumRejected?: number, visibleCasters?: number, spatialCandidates?: number,
     * spatialQueryTime?: number, visibilityReused?: number, instanceUploadBytes?: number} | null} [shadow]
     * @param {{materialCount: number, activePrograms: number, shaderCompiles: number,
     * programSwitches: number, materialSwitches: number, textureSwitches: number,
     * pbrPrograms: number, pbrDrawCalls: number, environmentResources?: number,
     * environmentPreprocesses?: number, environmentPreprocessTime?: number,
     * environmentBackgroundDrawCalls?: number, environmentIblDrawCalls?: number,
     * environmentTextureSwitches?: number, totalLocalLights?: number,
     * enabledPointLights?: number, enabledSpotLights?: number, selectedLocalLights?: number,
     * selectedPointLights?: number, selectedSpotLights?: number,
     * selectedLocalLightReferences?: number, candidateLocalLightReferences?: number,
     * localLightSelectionEvaluations?: number, localLightListRebuilds?: number,
     * localLightGpuUploads?: number, localLightDrawCalls?: number,
     * localLightsRejectedByRange?: number, localLightsRejectedByCone?: number,
     * localLightsRejectedByBudget?: number, localLightSelectionTime?: number,
     * absoluteMaximumLocalLights?: number, effectiveLocalLightBudget?: number,
     * geometryResources?: number, geometryUploads?: number, geometryGpuBytes?: number,
     * customShaderCompiles?: number, customShaderDraws?: number, customUniformUploads?: number, customGeometryUploads?: number,
     * modelAssets?: number, modelInstances?: number, modelPrimitives?: number,
     * modelTriangles?: number, jointPaletteUploads?: number, jointPaletteUploadBytes?: number,
     * terrainCount?: number, terrainTriangles?: number, terrainGeometryBuilds?: number,
     * terrainGeometryBuildBytes?: number, terrainGpuUploads?: number, terrainGpuUploadBytes?: number,
     * visibleTerrainChunks?: number, culledTerrainChunks?: number, textLabels?: number,
     * visibleTextLabels?: number, renderedTextInstances?: number, textDrawCalls?: number,
     * textRasterizations?: number, textTextureUploads?: number, sharedTextTextures?: number,
     * skinnedDrawCalls?: number, visibleInstanceUploads?: number, visibleInstanceUploadBytes?: number,
     * totalRenderables?: number, visibilityCandidates?: number, spatialCandidates?: number,
     * bruteForceCandidates?: number, frustumTested?: number, frustumRejected?: number,
     * renderDistanceRejected?: number, explicitlyHiddenRejected?: number, visibleRenderables?: number,
     * visibleInstances?: number, culledInstances?: number, visibilityCpuTime?: number,
     * spatialQueryCpuTime?: number, spatialIndexEntries?: number, spatialIndexUpdates?: number,
     * spatialIndexRebuilds?: number, dirtyBounds?: number, animatedBounds?: number,
     * visibilityReused?: number, spatialPath?: number, lodEvaluations?: number,
     * lodSwitches?: number, lodReused?: number, spriteCount?: number, visibleSprites?: number,
     * culledSprites?: number, spriteBatches?: number, spriteDrawCalls?: number,
     * spriteInstanceUploads?: number, spriteInstanceUploadBytes?: number, spriteSorts?: number,
     * visibleParticleEmitters?: number, culledParticleEmitters?: number, renderedParticles?: number,
     * particleInstanceUploads?: number, particleInstanceUploadBytes?: number, particleDrawCalls?: number,
     * decalCount?: number, visibleDecals?: number, decalBatches?: number, decalDrawCalls?: number,
     * effectInstanceUploads?: number, effectInstanceUploadBytes?: number, effectShaderCompiles?: number,
     * directionalFrameChanges?: number} | null} [material]
     * @param {Record<string, any> | null} [post]
     */
    recordRender(milliseconds, drawCalls, instances, shadow = null, material = null, post = null) {
        this.renderTimes[this.renderIndex] = milliseconds;
        this.renderIndex = (this.renderIndex + 1) % SAMPLE_COUNT;
        this.renderSamples = Math.min(SAMPLE_COUNT, this.renderSamples + 1);
        this.drawCalls = drawCalls;
        this.instances = instances;
        this.shadowPasses = shadow?.passes ?? 0;
        this.shadowDrawCalls = shadow?.drawCalls ?? 0;
        this.shadowTriangles = shadow?.triangles ?? 0;
        this.shadowRenderTime = shadow?.cpuTime ?? 0;
        this.shadowCasters = shadow?.casters ?? 0;
        this.shadowMapsUpdated = shadow?.mapUpdates ?? 0;
        this.materialCount = material?.materialCount ?? 0;
        this.materialPrograms = material?.activePrograms ?? 0;
        this.materialShaderCompiles = material?.shaderCompiles ?? 0;
        this.materialProgramSwitches = material?.programSwitches ?? 0;
        this.materialSwitches = material?.materialSwitches ?? 0;
        this.textureSwitches = material?.textureSwitches ?? 0;
        this.pbrPrograms = material?.pbrPrograms ?? 0;
        this.pbrDrawCalls = material?.pbrDrawCalls ?? 0;
        this.environmentResources = material?.environmentResources ?? 0;
        this.environmentPreprocesses = material?.environmentPreprocesses ?? 0;
        this.environmentPreprocessTime = material?.environmentPreprocessTime ?? 0;
        this.environmentBackgroundDrawCalls = material?.environmentBackgroundDrawCalls ?? 0;
        this.environmentIblDrawCalls = material?.environmentIblDrawCalls ?? 0;
        this.environmentTextureSwitches = material?.environmentTextureSwitches ?? 0;
        this.totalLocalLights = material?.totalLocalLights ?? 0;
        this.enabledPointLights = material?.enabledPointLights ?? 0;
        this.enabledSpotLights = material?.enabledSpotLights ?? 0;
        this.selectedLocalLights = material?.selectedLocalLights ?? 0;
        this.selectedPointLights = material?.selectedPointLights ?? 0;
        this.selectedSpotLights = material?.selectedSpotLights ?? 0;
        this.selectedLocalLightReferences = material?.selectedLocalLightReferences ?? 0;
        this.candidateLocalLightReferences = material?.candidateLocalLightReferences ?? 0;
        this.localLightSelectionEvaluations = material?.localLightSelectionEvaluations ?? 0;
        this.localLightListRebuilds = material?.localLightListRebuilds ?? 0;
        this.localLightGpuUploads = material?.localLightGpuUploads ?? 0;
        this.localLightDrawCalls = material?.localLightDrawCalls ?? 0;
        this.localLightsRejectedByRange = material?.localLightsRejectedByRange ?? 0;
        this.localLightsRejectedByCone = material?.localLightsRejectedByCone ?? 0;
        this.localLightsRejectedByBudget = material?.localLightsRejectedByBudget ?? 0;
        this.localLightSelectionTime = material?.localLightSelectionTime ?? 0;
        this.absoluteMaximumLocalLights = material?.absoluteMaximumLocalLights ?? 0;
        this.effectiveLocalLightBudget = material?.effectiveLocalLightBudget ?? 0;
        this.geometryResources = material?.geometryResources ?? 0;
        this.geometryUploads = material?.geometryUploads ?? 0;
        this.customShaderCompiles = material?.customShaderCompiles ?? 0;
        this.customShaderDraws = material?.customShaderDraws ?? 0;
        this.customUniformUploads = material?.customUniformUploads ?? 0;
        this.customGeometryUploads = material?.customGeometryUploads ?? 0;
        this.geometryGpuBytes = material?.geometryGpuBytes ?? 0;
        this.modelAssets = material?.modelAssets ?? 0;
        this.modelInstances = material?.modelInstances ?? 0;
        this.modelPrimitives = material?.modelPrimitives ?? 0;
        this.modelTriangles = material?.modelTriangles ?? 0;
        this.terrainCount = material?.terrainCount ?? 0;
        this.terrainTriangles = material?.terrainTriangles ?? 0;
        this.terrainGeometryBuilds = material?.terrainGeometryBuilds ?? 0;
        this.terrainGeometryBuildBytes = material?.terrainGeometryBuildBytes ?? 0;
        this.terrainGpuUploads = material?.terrainGpuUploads ?? 0;
        this.terrainGpuUploadBytes = material?.terrainGpuUploadBytes ?? 0;
        this.visibleTerrainChunks = material?.visibleTerrainChunks ?? 0;
        this.culledTerrainChunks = material?.culledTerrainChunks ?? 0;
        this.textLabels = material?.textLabels ?? 0;
        this.visibleTextLabels = material?.visibleTextLabels ?? 0;
        this.renderedTextInstances = material?.renderedTextInstances ?? 0;
        this.textDrawCalls = material?.textDrawCalls ?? 0;
        this.textRasterizations = material?.textRasterizations ?? 0;
        this.textTextureUploads = material?.textTextureUploads ?? 0;
        this.sharedTextTextures = material?.sharedTextTextures ?? 0;
        this.jointPaletteUploads = material?.jointPaletteUploads ?? 0;
        this.jointPaletteUploadBytes = material?.jointPaletteUploadBytes ?? 0;
        this.skinnedDrawCalls = material?.skinnedDrawCalls ?? 0;
        this.skinnedShadowDrawCalls = shadow?.skinnedDrawCalls ?? 0;
        this.visibleInstanceUploads = material?.visibleInstanceUploads ?? 0;
        this.visibleInstanceUploadBytes = material?.visibleInstanceUploadBytes ?? 0;
        this.totalRenderables = material?.totalRenderables ?? 0;
        this.visibilityCandidates = material?.visibilityCandidates ?? 0;
        this.spatialCandidates = material?.spatialCandidates ?? 0;
        this.bruteForceCandidates = material?.bruteForceCandidates ?? 0;
        this.frustumTested = material?.frustumTested ?? 0;
        this.frustumRejected = material?.frustumRejected ?? 0;
        this.renderDistanceRejected = material?.renderDistanceRejected ?? 0;
        this.explicitlyHiddenRejected = material?.explicitlyHiddenRejected ?? 0;
        this.visibleRenderables = material?.visibleRenderables ?? 0;
        this.visibleInstances = material?.visibleInstances ?? 0;
        this.culledInstances = material?.culledInstances ?? 0;
        this.visibilityCpuTime = material?.visibilityCpuTime ?? 0;
        this.spatialQueryCpuTime = material?.spatialQueryCpuTime ?? 0;
        this.spatialIndexEntries = material?.spatialIndexEntries ?? 0;
        this.spatialIndexUpdates = material?.spatialIndexUpdates ?? 0;
        this.spatialIndexRebuilds = material?.spatialIndexRebuilds ?? 0;
        this.dirtyBounds = material?.dirtyBounds ?? 0;
        this.animatedBounds = material?.animatedBounds ?? 0;
        this.visibilityReused = material?.visibilityReused ?? 0;
        this.visibilitySpatialPath = material?.spatialPath ?? 0;
        this.lodEvaluations = material?.lodEvaluations ?? 0;
        this.lodSwitches = material?.lodSwitches ?? 0;
        this.lodReused = material?.lodReused ?? 0;
        this.shadowVisibilityCandidates = shadow?.candidates ?? 0;
        this.shadowFrustumRejected = shadow?.frustumRejected ?? 0;
        this.shadowVisibleCasters = shadow?.visibleCasters ?? 0;
        this.shadowSpatialCandidates = shadow?.spatialCandidates ?? 0;
        this.shadowSpatialQueryTime = shadow?.spatialQueryTime ?? 0;
        this.shadowVisibilityReused = shadow?.visibilityReused ?? 0;
        this.shadowInstanceUploadBytes = shadow?.instanceUploadBytes ?? 0;
        this.spriteCount = material?.spriteCount ?? 0;
        this.visibleSprites = material?.visibleSprites ?? 0;
        this.culledSprites = material?.culledSprites ?? 0;
        this.spriteBatches = material?.spriteBatches ?? 0;
        this.spriteDrawCalls = material?.spriteDrawCalls ?? 0;
        this.spriteInstanceUploads = material?.spriteInstanceUploads ?? 0;
        this.spriteInstanceUploadBytes = material?.spriteInstanceUploadBytes ?? 0;
        this.spriteSorts = material?.spriteSorts ?? 0;
        this.visibleParticleEmitters = material?.visibleParticleEmitters ?? 0;
        this.culledParticleEmitters = material?.culledParticleEmitters ?? 0;
        this.renderedParticles = material?.renderedParticles ?? 0;
        this.particleInstanceUploads = material?.particleInstanceUploads ?? 0;
        this.particleInstanceUploadBytes = material?.particleInstanceUploadBytes ?? 0;
        this.particleDrawCalls = material?.particleDrawCalls ?? 0;
        this.decalCount = material?.decalCount ?? 0;
        this.visibleDecals = material?.visibleDecals ?? 0;
        this.decalBatches = material?.decalBatches ?? 0;
        this.decalDrawCalls = material?.decalDrawCalls ?? 0;
        this.effectInstanceUploads = material?.effectInstanceUploads ?? 0;
        this.effectInstanceUploadBytes = material?.effectInstanceUploadBytes ?? 0;
        this.effectShaderCompiles = material?.effectShaderCompiles ?? 0;
        this.directionalFrameChanges = material?.directionalFrameChanges ?? this.directionalFrameChanges;
        this.postProcessingActive = Boolean(post?.postProcessingActive);
        this.postPasses = post?.postPasses ?? 0;
        this.fullscreenDraws = post?.fullscreenDraws ?? 0;
        this.postFramebufferBinds = post?.framebufferBinds ?? 0;
        this.renderTargetAllocations = post?.renderTargetAllocations ?? 0;
        this.renderTargetResizes = post?.renderTargetResizes ?? 0;
        this.renderTargetReuses = post?.renderTargetReuses ?? 0;
        this.renderTargetBytes = post?.renderTargetBytes ?? 0;
        this.sceneTargetBytes = post?.sceneTargetBytes ?? 0;
        this.bloomPasses = post?.bloomPasses ?? 0;
        this.bloomLevels = post?.bloomLevels ?? 0;
        this.bloomTargetBytes = post?.bloomTargetBytes ?? 0;
        this.postShaderCompiles = post?.postShaderCompiles ?? 0;
        this.postShaderCompilesThisFrame = post?.postShaderCompilesThisFrame ?? 0;
        this.targetResolves = post?.targetResolves ?? 0;
        this.offscreenCameraRenders = post?.offscreenCameraRenders ?? 0;
        this.totalOffscreenCameraRenders = post?.totalOffscreenCameraRenders ?? 0;
    }

    recordAnimation(metrics) {
        this.activeAnimationPlayers = metrics?.activePlayers ?? 0;
        this.sampledAnimationChannels = metrics?.sampledChannels ?? 0;
        this.animationSamplingTime = metrics?.samplingTime ?? 0;
        this.animationHierarchyUpdates = metrics?.hierarchyUpdates ?? 0;
        this.jointPalettesUpdated = metrics?.jointPalettesUpdated ?? 0;
    }

    recordEffects(metrics) {
        this.activeParticleEmitters = metrics?.activeEmitters ?? 0;
        this.activeParticles = metrics?.activeParticles ?? 0;
        this.particlesSpawned = metrics?.spawnedParticles ?? 0;
        this.particlesExpired = metrics?.expiredParticles ?? 0;
        this.particlesSimulated = metrics?.simulatedParticles ?? 0;
        this.particleSimulationTime = metrics?.simulationTime ?? 0;
        this.animatedSprites = metrics?.animatedSprites ?? 0;
        this.directionalFrameChanges = metrics?.directionalFrameChanges ?? 0;
    }

    recordTweens(metrics) {
        this.activeTweens = metrics?.activeTweens ?? 0;
        this.tweenUpdates = metrics?.tweenUpdates ?? 0;
        this.completedTweens = metrics?.completedTweens ?? 0;
        this.tweenUpdateTime = metrics?.tweenUpdateMs ?? 0;
    }

    recordRaycasts(metrics) {
        this.raycasts = metrics?.raycasts ?? 0;
        this.raycastBroadPhaseCandidates = metrics?.broadPhaseCandidates ?? 0;
        this.raycastBoundsTests = metrics?.boundsTests ?? 0;
        this.raycastTriangleTests = metrics?.triangleTests ?? 0;
        this.raycastExactHits = metrics?.exactHits ?? 0;
        this.raycastHits = metrics?.hits ?? 0;
        this.raycastTime = metrics?.raycastMilliseconds ?? 0;
    }

    get fps() {
        if (this.frameSamples === 0) return 0;
        const last = (this.frameIndex - 1 + SAMPLE_COUNT) % SAMPLE_COUNT;
        const interval = this.frameIntervals[last];
        return interval > 0 ? 1000 / interval : 0;
    }

    get averageFps() {
        if (this.frameSamples === 0) return 0;
        let total = 0;
        for (let index = 0; index < this.frameSamples; index++) total += this.frameIntervals[index];
        return total > 0 ? 1000 / (total / this.frameSamples) : 0;
    }

    get averageRenderTime() {
        if (this.renderSamples === 0) return 0;
        let total = 0;
        for (let index = 0; index < this.renderSamples; index++) total += this.renderTimes[index];
        return total / this.renderSamples;
    }

    reset() {
        this.frameIndex = 0;
        this.frameSamples = 0;
        this.renderIndex = 0;
        this.renderSamples = 0;
        this.lastFrameTime = -1;
        this.drawCalls = 0;
        this.instances = 0;
        this.shadowPasses = 0;
        this.shadowDrawCalls = 0;
        this.shadowTriangles = 0;
        this.shadowRenderTime = 0;
        this.shadowCasters = 0;
        this.shadowMapsUpdated = 0;
        this.materialCount = 0;
        this.materialPrograms = 0;
        this.materialShaderCompiles = 0;
        this.materialProgramSwitches = 0;
        this.materialSwitches = 0;
        this.textureSwitches = 0;
        this.pbrPrograms = 0;
        this.pbrDrawCalls = 0;
        this.environmentResources = 0;
        this.environmentPreprocesses = 0;
        this.environmentPreprocessTime = 0;
        this.environmentBackgroundDrawCalls = 0;
        this.environmentIblDrawCalls = 0;
        this.environmentTextureSwitches = 0;
        this.totalLocalLights = 0;
        this.enabledPointLights = 0;
        this.enabledSpotLights = 0;
        this.selectedLocalLights = 0;
        this.selectedPointLights = 0;
        this.selectedSpotLights = 0;
        this.selectedLocalLightReferences = 0;
        this.candidateLocalLightReferences = 0;
        this.localLightSelectionEvaluations = 0;
        this.localLightListRebuilds = 0;
        this.localLightGpuUploads = 0;
        this.localLightDrawCalls = 0;
        this.localLightsRejectedByRange = 0;
        this.localLightsRejectedByCone = 0;
        this.localLightsRejectedByBudget = 0;
        this.localLightSelectionTime = 0;
        this.absoluteMaximumLocalLights = 0;
        this.effectiveLocalLightBudget = 0;
        this.geometryResources = 0;
        this.geometryUploads = 0;
        this.customShaderCompiles = 0;
        this.customShaderDraws = 0;
        this.customUniformUploads = 0;
        this.customGeometryUploads = 0;
        this.geometryGpuBytes = 0;
        this.modelAssets = 0;
        this.modelInstances = 0;
        this.modelPrimitives = 0;
        this.modelTriangles = 0;
        this.terrainCount = 0;
        this.terrainTriangles = 0;
        this.terrainGeometryBuilds = 0;
        this.terrainGeometryBuildBytes = 0;
        this.terrainGpuUploads = 0;
        this.terrainGpuUploadBytes = 0;
        this.visibleTerrainChunks = 0;
        this.culledTerrainChunks = 0;
        this.textLabels = 0;
        this.visibleTextLabels = 0;
        this.renderedTextInstances = 0;
        this.textDrawCalls = 0;
        this.textRasterizations = 0;
        this.textTextureUploads = 0;
        this.sharedTextTextures = 0;
        this.activeAnimationPlayers = 0;
        this.sampledAnimationChannels = 0;
        this.animationSamplingTime = 0;
        this.animationHierarchyUpdates = 0;
        this.jointPalettesUpdated = 0;
        this.activeParticleEmitters = 0;
        this.activeParticles = 0;
        this.particlesSpawned = 0;
        this.particlesExpired = 0;
        this.particlesSimulated = 0;
        this.particleSimulationTime = 0;
        this.animatedSprites = 0;
        this.directionalFrameChanges = 0;
        this.activeTweens = 0;
        this.tweenUpdates = 0;
        this.completedTweens = 0;
        this.tweenUpdateTime = 0;
        this.raycasts = 0;
        this.raycastBroadPhaseCandidates = 0;
        this.raycastBoundsTests = 0;
        this.raycastTriangleTests = 0;
        this.raycastExactHits = 0;
        this.raycastHits = 0;
        this.raycastTime = 0;
        this.spriteCount = 0;
        this.visibleSprites = 0;
        this.culledSprites = 0;
        this.spriteBatches = 0;
        this.spriteDrawCalls = 0;
        this.spriteInstanceUploads = 0;
        this.spriteInstanceUploadBytes = 0;
        this.spriteSorts = 0;
        this.visibleParticleEmitters = 0;
        this.culledParticleEmitters = 0;
        this.renderedParticles = 0;
        this.particleInstanceUploads = 0;
        this.particleInstanceUploadBytes = 0;
        this.particleDrawCalls = 0;
        this.decalCount = 0;
        this.visibleDecals = 0;
        this.decalBatches = 0;
        this.decalDrawCalls = 0;
        this.effectInstanceUploads = 0;
        this.effectInstanceUploadBytes = 0;
        this.effectShaderCompiles = 0;
        this.jointPaletteUploads = 0;
        this.jointPaletteUploadBytes = 0;
        this.skinnedDrawCalls = 0;
        this.skinnedShadowDrawCalls = 0;
        this.visibleInstanceUploads = 0;
        this.visibleInstanceUploadBytes = 0;
        this.totalRenderables = 0;
        this.visibilityCandidates = 0;
        this.spatialCandidates = 0;
        this.bruteForceCandidates = 0;
        this.frustumTested = 0;
        this.frustumRejected = 0;
        this.renderDistanceRejected = 0;
        this.explicitlyHiddenRejected = 0;
        this.visibleRenderables = 0;
        this.visibleInstances = 0;
        this.culledInstances = 0;
        this.visibilityCpuTime = 0;
        this.spatialQueryCpuTime = 0;
        this.spatialIndexEntries = 0;
        this.spatialIndexUpdates = 0;
        this.spatialIndexRebuilds = 0;
        this.dirtyBounds = 0;
        this.animatedBounds = 0;
        this.visibilityReused = 0;
        this.visibilitySpatialPath = 0;
        this.lodEvaluations = 0;
        this.lodSwitches = 0;
        this.lodReused = 0;
        this.shadowVisibilityCandidates = 0;
        this.shadowFrustumRejected = 0;
        this.shadowVisibleCasters = 0;
        this.shadowSpatialCandidates = 0;
        this.shadowSpatialQueryTime = 0;
        this.shadowVisibilityReused = 0;
        this.shadowInstanceUploadBytes = 0;
        this.postProcessingActive = false;
        this.postPasses = 0;
        this.fullscreenDraws = 0;
        this.postFramebufferBinds = 0;
        this.renderTargetAllocations = 0;
        this.renderTargetResizes = 0;
        this.renderTargetReuses = 0;
        this.renderTargetBytes = 0;
        this.sceneTargetBytes = 0;
        this.bloomPasses = 0;
        this.bloomLevels = 0;
        this.bloomTargetBytes = 0;
        this.postShaderCompiles = 0;
        this.postShaderCompilesThisFrame = 0;
        this.targetResolves = 0;
        this.offscreenCameraRenders = 0;
        this.totalOffscreenCameraRenders = 0;
    }
}
