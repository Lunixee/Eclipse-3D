import {BackendName} from '../../constants.js';
import {calculateRenderDimensions} from '../../quality/renderDimensions.js';
import {CubePass} from '../webgl/CubePass.js';
import {PostProcessPipeline} from '../webgl/PostProcessPipeline.js';
import {RenderTargetManager} from '../webgl/RenderTargetManager.js';
import {createStageDrawable, destroyStageDrawable, setStageDrawableVisible} from './scratchDrawable.js';

export class SeparateCanvasBackend {
    static supported() {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2'));
    }

    /**
     * @param {any} renderer
     * @param {Function} onFrame
     * @param {any} quality
     * @param {import('../../post/PostProcessingSettings.js').PostProcessingSettings | null} [postSettings]
     * @param {import('../../renderTargets/RenderTargetStore.js').RenderTargetStore | null} [renderTargets]
     */
    constructor(renderer, onFrame, quality, postSettings = null, renderTargets = null) {
        this.name = BackendName.BITMAP;
        this.renderer = renderer;
        this.onFrame = onFrame;
        this.quality = quality;
        this.postSettings = postSettings;
        this.renderTargetStore = renderTargets;
        this.requestedAntialias = quality.antialias;
        this.internalWidth = 0;
        this.internalHeight = 0;
        this.effectivePixelRatio = 1;
        this.costumeResolution = 1;
        this.canvas = document.createElement('canvas');
        // TurboWarp's BitmapSkin can upload a non-reusable canvas directly instead of
        // first copying it through ImageData on the CPU.
        Object.defineProperty(this.canvas, 'reusable', {value: false, configurable: true});
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            antialias: quality.antialias === 'native',
            depth: true,
            powerPreference: 'high-performance',
            premultipliedAlpha: true
        });
        if (!this.gl) throw new Error('WebGL 2 is not available');
        this.antialiasMode = this.gl.getContextAttributes()?.antialias ? 'native' : 'off';
        this.pass = new CubePass(this.gl);
        this.targetManager = new RenderTargetManager(this.gl, renderTargets);
        this.pipeline = new PostProcessPipeline(this.gl, this.pass, this.targetManager);
        this.pass.setRenderTargetResolver(id => this.targetManager.getExternalTexture(id));
        this.scene = null;
        this.pending = true;
        this.disposed = false;
        this.lost = false;
        this.handleContextLost = event => {
            event.preventDefault();
            this.lost = true;
        };
        this.handleContextRestored = () => {
            this.lost = false;
            // Context loss already discarded the old GPU objects; deleting their stale
            // handles against the restored context can itself raise WebGL errors.
            this.pass = new CubePass(this.gl);
            this.targetManager = new RenderTargetManager(this.gl, this.renderTargetStore);
            this.pipeline = new PostProcessPipeline(this.gl, this.pass, this.targetManager);
            this.pass.setRenderTargetResolver(id => this.targetManager.getExternalTexture(id));
            this.pass.setTextureStore(this.scene?.textures ?? null);
            this.pass.setQuality(this.quality);
            this.pending = true;
        };
        this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
        this.#resize();
        this.pass.setQuality(quality);
        this.skinId = renderer.createBitmapSkin(this.canvas, this.#costumeResolution());
        this.stageDrawable = createStageDrawable(renderer, this.skinId);
        this.drawableId = this.stageDrawable.drawableId;
    }

    setScene(scene) {
        this.scene = scene;
        // A removed active scene must not leave the previous bitmap visible.
        setStageDrawableVisible(this.renderer, this.stageDrawable, Boolean(scene));
        if (scene) {
            this.pass.setTextureStore(scene.textures);
            this.pass.invalidateInstances();
        } else {
            this.pass.releaseSceneResources();
        }
        this.invalidate();
    }

    setQuality(quality) {
        if (quality.antialias !== this.requestedAntialias) {
            throw new Error('Changing native antialiasing requires recreating the renderer backend');
        }
        this.quality = quality;
        this.pass.setQuality(quality);
        this.invalidate();
    }

    invalidate() {
        if (this.disposed) return;
        this.pending = true;
    }

    warmMaterial(material, localLights = false) {
        if (this.disposed || this.lost) throw new Error('The renderer backend is unavailable');
        return this.pass.warmMaterial(material, localLights);
    }

    releaseUnusedResources() {
        if (!this.disposed && !this.lost) this.pass.releaseUnusedResources();
    }

    renderToTarget(definition, cameraId = null) {
        if (this.disposed || this.lost || !this.scene) throw new Error('The renderer backend is unavailable');
        const texture = this.pipeline.renderToTarget(this.scene, definition, cameraId);
        this.invalidate();
        return texture;
    }

    clearRenderTarget(definition, color = [0, 0, 0, 0]) {
        if (this.disposed || this.lost) throw new Error('The renderer backend is unavailable');
        this.pipeline.clearTarget(definition, color);
        this.invalidate();
    }

    resetRenderTargets() {
        this.pipeline.resetResources();
    }

    syncRenderTargets() {
        this.targetManager.sweepUsers();
    }

    flush() {
        if (this.disposed || this.lost || !this.scene) return;
        const start = performance.now();
        this.#resize();
        if (!this.pending) return;
        // Native loss precedes the asynchronous lost event. Check only dirty
        // frames, so that gap cannot render/upload a lost source into Scratch.
        if (this.gl.isContextLost()) return;
        const requestedSamples = this.requestedAntialias === 'native'
            ? Math.min(4, Number(this.gl.getParameter(this.gl.MAX_SAMPLES)) || 0)
            : 0;
        const drawCalls = this.pipeline.render(
            this.scene,
            null,
            this.canvas.width,
            this.canvas.height,
            this.postSettings?.snapshot() ?? {active: false},
            {samples: requestedSamples}
        );
        // A GPU reset may also occur during submission. Keep the host bitmap
        // and dirty flag intact until our restored handler rebuilds the caches.
        if (this.gl.isContextLost()) return;
        this.renderer.updateBitmapSkin(this.skinId, this.canvas, this.#costumeResolution());
        this.renderer.dirty = true;
        this.pending = false;
        this.onFrame(
            performance.now() - start,
            drawCalls,
            this.pass.instanceCount,
            this.pass.shadowStats,
            this.pass.materialStats,
            this.pipeline.metrics
        );
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
        this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
        destroyStageDrawable(this.renderer, this.stageDrawable);
        this.pipeline.dispose();
        this.targetManager.dispose();
        this.pass.dispose();
    }

    #resize() {
        const dimensions = calculateRenderDimensions(this.renderer, this.quality);
        const {width, height} = dimensions;
        this.internalWidth = width;
        this.internalHeight = height;
        this.effectivePixelRatio = dimensions.effectivePixelRatio;
        const nativeSize = this.renderer.getNativeSize();
        const costumeResolution = nativeSize[0] > 0 ? width / nativeSize[0] : 1;
        const metricsChanged = costumeResolution !== this.costumeResolution;
        this.costumeResolution = costumeResolution;
        if (this.canvas.width === width && this.canvas.height === height) {
            if (metricsChanged) this.pending = true;
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.pending = true;
    }

    #costumeResolution() {
        return this.costumeResolution;
    }
}
