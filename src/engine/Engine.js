import {BackendName} from '../constants.js';
import {FrameProfiler} from '../profiler/FrameProfiler.js';
import {MaterialStore} from '../materials/MaterialStore.js';
import {AdaptiveResolutionController} from '../quality/AdaptiveResolutionController.js';
import {RenderQualitySettings} from '../quality/RenderQualitySettings.js';
import {createBackend} from '../renderer/BackendFactory.js';
import {TextureStore} from '../textures/TextureStore.js';
import {EnvironmentStore} from '../environments/EnvironmentStore.js';
import {LightStore} from '../lights/LightStore.js';
import {GeometryStore} from '../geometry/GeometryStore.js';
import {ModelStore} from '../models/ModelStore.js';
import {LodStore} from '../visibility/LodStore.js';
import {PostProcessingSettings} from '../post/PostProcessingSettings.js';
import {RenderTargetStore} from '../renderTargets/RenderTargetStore.js';
import {SceneManager} from './SceneManager.js';
import {AudioSystem} from '../audio/AudioSystem.js';

export class Engine {
    constructor(bridge, {audioContextFactory = undefined} = {}) {
        this.bridge = bridge;
        this.audioContextFactory = audioContextFactory;
        /** @type {AudioSystem | null} */
        this.audio = null;
        this.textures = new TextureStore(textureId => {
            this.invalidate();
            this.scenes?.invalidateTextureShadows(textureId);
        });
        this.materials = new MaterialStore(
            this.textures,
            () => this.invalidate(),
            materialId => this.scenes?.invalidateMaterialShadows(materialId)
        );
        this.environments = new EnvironmentStore(this.textures, () => this.invalidate());
        this.lights = new LightStore(() => this.invalidate());
        this.geometry = new GeometryStore((resource, boundsChanged, positionsChanged) => {
            for (const scene of this.scenes.scenes.values()) scene.invalidateGeometry(resource, boundsChanged, positionsChanged);
            this.invalidate();
        });
        this.models = new ModelStore(this.geometry, this.materials, this.textures, () => this.invalidate());
        this.lods = new LodStore(this.models, () => this.invalidate());
        this.scenes = new SceneManager(
            this.textures,
            this.materials,
            this.environments,
            this.lights,
            this.models,
            this.lods
        );
        this.profiler = new FrameProfiler();
        this.quality = new RenderQualitySettings();
        this.post = new PostProcessingSettings(() => this.invalidate());
        this.renderTargets = new RenderTargetStore(this.textures, () => this.invalidate());
        this.adaptiveResolution = new AdaptiveResolutionController();
        this.backend = null;
        /** @type {string} */
        this.requestedBackend = BackendName.AUTO;
        this.initialized = false;
        // palette clicks may redraw without starting simulation
        this.projectRunning = false;
        this.runtimePaused = bridge.runtimePaused === true;
        this.generation = 0;
        this.runGeneration = 0;
        this.lastError = '';
        this.lastScene = null;
    }

    /** @param {string} [requestedBackend] */
    initialize(requestedBackend = BackendName.AUTO) {
        if (this.initialized) return;
        this.requestedBackend = requestedBackend;
        this.backend = createBackend(
            this.bridge.renderer,
            requestedBackend,
            (milliseconds, drawCalls, instances, shadow, material, post) =>
                this.profiler.recordRender(milliseconds, drawCalls, instances, shadow, material, post),
            this.quality.snapshot(),
            this.post,
            this.renderTargets
        );
        this.initialized = true;
        this.#syncScene();
        this.bridge.requestRedraw();
    }

    ensureAudio() {
        return this.audio ??= new AudioSystem(this, this.audioContextFactory);
    }

    reset() {
        this.generation++;
        this.scenes.clear();
        this.audio?.reset();
        this.lods.clear();
        this.models.clear();
        this.environments.clear();
        this.materials.clear();
        this.renderTargets.clear();
        this.lights.clear();
        this.textures.clear();
        this.post.reset(this.quality.preset);
        this.geometry.clear();
        this.profiler.reset();
        this.adaptiveResolution.reset();
        this.lastScene = null;
        if (this.backend) {
            this.backend.setScene(null);
            this.backend.resetRenderTargets();
        }
        this.bridge.requestRedraw();
    }

    dispose() {
        this.generation++;
        if (this.backend) this.backend.dispose();
        this.backend = null;
        this.initialized = false;
        this.lastScene = null;
        this.scenes.clear();
        this.audio?.dispose();
        this.audio = null;
        this.lods.clear();
        this.models.clear();
        this.environments.clear();
        this.materials.clear();
        this.renderTargets.clear();
        this.lights.clear();
        this.textures.clear();
        this.post.reset(this.quality.preset);
        this.geometry.clear();
        this.profiler.reset();
        this.adaptiveResolution.reset();
    }

    tick(now) {
        if (this.simulationPaused) {
            // Bitmap rendering normally flushes here; static palette mutations
            // and restored contexts must still reach the host while frozen.
            if (this.backend?.name === BackendName.BITMAP && this.backend.pending) this.backend.flush();
            return;
        }
        if (!Number.isFinite(now) || now < 0) return;
        const interval = this.profiler.recordTick(now);
        const nextScale = this.adaptiveResolution.sample(interval, this.quality);
        if (nextScale !== null && this.quality.setAdaptiveScale(nextScale)) this.#applyQuality(false);
        if (!this.initialized || !this.backend) return;
        const scene = this.scenes.active;
        this.profiler.recordRaycasts(scene?.raycaster.metrics ?? null);
        scene?.raycaster.resetMetrics();
        const tweens = scene?.updateTweens(interval / 1000) ?? null;
        const animation = scene?.updateAnimations(interval / 1000) ?? null;
        const effects = scene?.updateEffects(interval / 1000) ?? null;
        let physics = null;
        // Optional subsystem failures stay diagnostic; a bad attachment or host
        // audio device must not tear down the Scratch runtime/render loop.
        try { physics = scene?.physics?.update(interval / 1000) ?? null; }
        catch (error) { scene?.physics?.resetClock(); this.setError(error); }
        try { this.audio?.update(scene); }
        catch (error) { this.setError(error); }
        this.profiler.recordTweens(tweens);
        this.profiler.recordAnimation(animation);
        this.profiler.recordEffects(effects);
        if (tweens?.changed || animation?.changed || effects?.changed || physics?.changed) this.invalidate();
        this.#syncScene();
        if (this.backend.name === BackendName.BITMAP) this.backend.flush();
    }

    handleStopAll() {
        this.runGeneration++;
        this.projectRunning = false;
        this.scenes.stopAllTweens();
        for (const scene of this.scenes.scenes.values()) scene.physics?.resetClock();
        this.audio?.pauseAll();
        this.profiler.reset();
        this.invalidate();
    }

    get simulationPaused() {
        return !this.projectRunning || this.runtimePaused;
    }

    handleProjectRunStart(restart = false) {
        if (restart) this.runGeneration++;
        if (!this.projectRunning || restart) {
            this.profiler.reset();
            this.adaptiveResolution.reset();
            for (const scene of this.scenes.scenes.values()) scene.physics?.resetClock();
        }
        this.projectRunning = true;
    }

    handleRuntimePause(paused) {
        if (this.runtimePaused === paused) return;
        this.runtimePaused = paused;
        this.profiler.reset();
        this.adaptiveResolution.reset();
        for (const scene of this.scenes.scenes.values()) scene.physics?.resetClock();
        if (paused) this.audio?.pauseForRuntime();
        else if (this.projectRunning) this.audio?.resumeFromRuntime();
    }

    handleRuntimeDisposed() {
        this.handleStopAll();
        this.reset();
    }

    invalidate() {
        if (!this.backend) return;
        this.backend.invalidate();
        this.bridge.requestRedraw();
    }

    renderOneFrame() {
        if (!this.backend) throw new Error('Initialize the 3D engine first');
        this.#syncScene();
        this.backend.invalidate();
        this.backend.flush();
        this.bridge.requestRedraw();
    }

    warmMaterial(name) {
        if (!this.backend) throw new Error('Initialize the 3D engine first');
        return this.backend.warmMaterial(
            this.materials.require(name),
            (this.scenes.active?.enabledLocalLightCount ?? 0) > 0
        );
    }

    releaseUnusedResources() {
        this.backend?.releaseUnusedResources();
    }

    createScene(name) {
        const scene = this.scenes.create(name);
        if (this.quality.shadowQuality !== null) scene.setShadowQuality(this.quality.shadowQuality);
        this.#syncScene();
        this.invalidate();
        return scene;
    }

    setActiveScene(name) {
        this.scenes.setActive(name);
        this.#syncScene();
        this.invalidate();
    }

    deleteScene(name) {
        if (!this.scenes.delete(name)) return false;
        this.#syncScene();
        this.releaseUnusedResources();
        this.invalidate();
        return true;
    }

    get activeScene() {
        return this.scenes.requireActive();
    }

    setError(error) {
        this.lastError = error instanceof Error ? error.message : String(error);
    }

    clearError() {
        this.lastError = '';
    }

    setRenderQuality(value) {
        const previousAntialias = this.quality.antialias;
        this.quality.applyPreset(value);
        this.post.applyRenderQuality(this.quality.preset);
        this.#applyQuality(previousAntialias !== this.quality.antialias, true);
    }

    setPostProcessing(enabled) { this.post.setEnabled(enabled); }

    setBloom(enabled) { this.post.setBloomEnabled(enabled); }

    setBloomIntensity(value) { this.post.setBloomIntensity(value); }

    setBloomThreshold(value) { this.post.setBloomThreshold(value); }

    setBloomQuality(value) { this.post.setBloomQuality(value); }

    setPostBrightness(value) { this.post.setBrightness(value); }

    setPostContrast(value) { this.post.setContrast(value); }

    setPostSaturation(value) { this.post.setSaturation(value); }

    setVignetteIntensity(value) { this.post.setVignetteIntensity(value); }

    setVignetteRadius(value) { this.post.setVignetteRadius(value); }

    setVignetteSoftness(value) { this.post.setVignetteSoftness(value); }

    setFxaa(enabled) { this.post.setFxaaEnabled(enabled); }

    resetPostProcessing() { this.post.reset(this.quality.preset); }

    createRenderTarget(name, width, height) {
        return this.renderTargets.create(name, width, height);
    }

    deleteRenderTarget(name) {
        this.renderTargets.delete(name);
        this.backend?.syncRenderTargets();
    }

    resizeRenderTarget(name, width, height) {
        return this.renderTargets.resize(name, width, height);
    }

    clearRenderTarget(name) {
        if (!this.backend) throw new Error('Initialize the 3D engine first');
        this.backend.clearRenderTarget(this.renderTargets.require(name));
    }

    renderSceneToTarget(name, cameraName = '') {
        if (!this.backend) throw new Error('Initialize the 3D engine first');
        const scene = this.activeScene;
        const cameraId = cameraName ? scene.requireCamera(cameraName) : null;
        this.backend.renderToTarget(this.renderTargets.require(name), cameraId);
        this.bridge.requestRedraw();
    }

    setRenderScale(value) {
        this.quality.setRenderScale(value);
        this.#applyQuality(false);
    }

    setMaxPixelRatio(value) {
        this.quality.setMaxPixelRatio(value);
        this.#applyQuality(false);
    }

    setAntialias(value) {
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'native' && this.backend?.name === BackendName.SHARED) {
            throw new Error('Native antialiasing is unavailable for the shared WebGL render target');
        }
        const previous = this.quality.antialias;
        this.quality.setAntialias(normalized);
        this.#applyQuality(previous !== this.quality.antialias);
    }

    setRenderDistance(value) {
        this.quality.setRenderDistance(value);
        this.#applyQuality(false);
    }

    setTextureQuality(value) {
        this.quality.setTextureQuality(value);
        this.#applyQuality(false);
    }

    setEnvironmentQuality(value) {
        this.quality.setEnvironmentQuality(value);
        this.#applyQuality(false);
    }

    setLocalLightLimit(value) {
        this.quality.setLocalLightLimit(value);
        this.#applyQuality(false);
    }

    setAdaptiveResolution(enabled) {
        this.quality.setAdaptiveEnabled(enabled);
        this.adaptiveResolution.reset();
        this.#applyQuality(false);
    }

    setAdaptiveTargetFps(value) {
        this.quality.setAdaptiveTargetFps(value);
        this.adaptiveResolution.reset();
    }

    setAdaptiveScaleRange(minimum, maximum) {
        this.quality.setAdaptiveRange(minimum, maximum);
        this.adaptiveResolution.reset();
        this.#applyQuality(false);
    }

    markRenderQualityCustom() {
        this.quality.markCustom();
    }

    get renderMetrics() {
        return {
            width: this.backend?.internalWidth ?? 0,
            height: this.backend?.internalHeight ?? 0,
            effectivePixelRatio: this.backend?.effectivePixelRatio ?? 0,
            antialias: this.backend?.antialiasMode ?? this.quality.antialias
        };
    }

    #syncScene() {
        if (!this.backend) return;
        const scene = this.scenes.active;
        if (scene === this.lastScene) return;
        this.lastScene = scene;
        this.backend.setScene(scene);
    }

    #applyQuality(recreateBackend, applyShadows = false) {
        if (applyShadows && this.quality.shadowQuality !== null) {
            for (const scene of this.scenes.scenes.values()) scene.setShadowQuality(this.quality.shadowQuality);
        }
        if (!this.backend) return;
        if (recreateBackend) {
            const replacement = createBackend(
                this.bridge.renderer,
                this.requestedBackend,
                (milliseconds, drawCalls, instances, shadow, material, post) =>
                    this.profiler.recordRender(milliseconds, drawCalls, instances, shadow, material, post),
                this.quality.snapshot(),
                this.post,
                this.renderTargets
            );
            replacement.setScene(this.scenes.active);
            const previous = this.backend;
            this.backend = replacement;
            this.lastScene = this.scenes.active;
            previous.dispose();
        } else {
            this.backend.setQuality(this.quality.snapshot());
        }
        this.invalidate();
    }
}
