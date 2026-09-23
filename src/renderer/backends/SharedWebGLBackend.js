import {BackendName} from '../../constants.js';
import {calculateRenderDimensions} from '../../quality/renderDimensions.js';
import {CubePass} from '../webgl/CubePass.js';
import {GLStateGuard} from '../webgl/GLStateGuard.js';
import {PostProcessPipeline} from '../webgl/PostProcessPipeline.js';
import {RenderTarget} from '../webgl/RenderTarget.js';
import {RenderTargetManager} from '../webgl/RenderTargetManager.js';
import {createStageDrawable, destroyStageDrawable, setStageDrawableVisible} from './scratchDrawable.js';

const requiredRendererInternals = renderer => (
    renderer &&
    renderer.gl instanceof WebGL2RenderingContext &&
    renderer.exports?.Skin &&
    Array.isArray(renderer._allSkins) &&
    Number.isInteger(renderer._nextSkinId)
);

export class SharedWebGLBackend {
    static supported(renderer) {
        return requiredRendererInternals(renderer);
    }

    /**
     * @param {any} renderer
     * @param {Function} onFrame
     * @param {any} quality
     * @param {import('../../post/PostProcessingSettings.js').PostProcessingSettings | null} [postSettings]
     * @param {import('../../renderTargets/RenderTargetStore.js').RenderTargetStore | null} [renderTargets]
     */
    constructor(renderer, onFrame, quality, postSettings = null, renderTargets = null) {
        if (!SharedWebGLBackend.supported(renderer)) {
            throw new Error('The shared WebGL 2 backend is not supported by this scratch-render build');
        }
        this.name = BackendName.SHARED;
        this.renderer = renderer;
        this.gl = renderer.gl;
        this.onFrame = onFrame;
        if (quality.antialias !== 'off') {
            throw new Error('Native antialiasing is unavailable for the shared WebGL render target');
        }
        this.quality = quality;
        this.postSettings = postSettings;
        this.renderTargetStore = renderTargets;
        this.antialiasMode = 'off';
        this.internalWidth = 0;
        this.internalHeight = 0;
        this.effectivePixelRatio = 1;
        this.guard = new GLStateGuard(this.gl);
        this.pending = true;
        this.scene = null;
        this.lost = false;
        this.disposed = false;
        this.nativeSize = renderer.getNativeSize();
        this.handleContextLost = event => {
            event.preventDefault();
            this.lost = true;
        };
        this.handleContextRestored = () => {
            // scratch-render does not currently rebuild its own resources. Recreating only
            // Turbo3D's resources would leave the host renderer in an undefined state.
            this.lost = true;
        };

        const state = this.#captureHostState();
        try {
            this.pass = new CubePass(this.gl);
            this.pass.setQuality(quality);
            this.targetManager = new RenderTargetManager(this.gl, renderTargets);
            this.pipeline = new PostProcessPipeline(this.gl, this.pass, this.targetManager);
            this.pass.setRenderTargetResolver(id => this.targetManager.getExternalTexture(id));
            this.target = new RenderTarget(this.gl);
            this.skinId = this.#installSkin();
            this.stageDrawable = createStageDrawable(renderer, this.skinId);
            this.drawableId = this.stageDrawable.drawableId;
        } finally {
            this.guard.restore(state);
        }
        renderer.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        renderer.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    }

    setScene(scene) {
        this.scene = scene;
        setStageDrawableVisible(this.renderer, this.stageDrawable, Boolean(scene));
        const state = this.#captureHostState();
        try {
            if (scene) {
                this.pass.setTextureStore(scene.textures);
                this.pass.invalidateInstances();
            } else {
                this.pass.releaseSceneResources();
            }
        } finally {
            this.guard.restore(state);
        }
        this.invalidate();
    }

    setQuality(quality) {
        if (quality.antialias !== 'off') {
            throw new Error('Native antialiasing is unavailable for the shared WebGL render target');
        }
        this.quality = quality;
        const state = this.#captureHostState();
        try {
            this.pass.setQuality(quality);
        } finally {
            this.guard.restore(state);
        }
        this.invalidate();
    }

    invalidate() {
        if (this.disposed) return;
        this.pending = true;
        this.renderer.dirty = true;
    }

    warmMaterial(material, localLights = false) {
        if (this.disposed || this.lost) throw new Error('The renderer backend is unavailable');
        const state = this.#captureHostState();
        try {
            return this.pass.warmMaterial(material, localLights);
        } finally {
            this.guard.restore(state);
        }
    }

    releaseUnusedResources() {
        if (this.disposed || this.lost) return;
        const state = this.#captureHostState();
        try { this.pass.releaseUnusedResources(); } finally { this.guard.restore(state); }
    }

    renderToTarget(definition, cameraId = null) {
        if (this.disposed || this.lost || !this.scene) throw new Error('The renderer backend is unavailable');
        const state = this.#captureHostState();
        try {
            const texture = this.pipeline.renderToTarget(this.scene, definition, cameraId);
            this.invalidate();
            return texture;
        } finally {
            this.guard.restore(state);
        }
    }

    clearRenderTarget(definition, color = [0, 0, 0, 0]) {
        if (this.disposed || this.lost) throw new Error('The renderer backend is unavailable');
        const state = this.#captureHostState();
        try {
            this.pipeline.clearTarget(definition, color);
            this.invalidate();
        } finally {
            this.guard.restore(state);
        }
    }

    resetRenderTargets() {
        const state = this.#captureHostState();
        try {
            this.pipeline.resetResources();
        } finally {
            this.guard.restore(state);
        }
    }

    syncRenderTargets() {
        const state = this.#captureHostState();
        try {
            this.targetManager.sweepUsers();
        } finally {
            this.guard.restore(state);
        }
    }

    flush() {
        if (this.disposed || this.lost || !this.scene) return;
        const dimensions = calculateRenderDimensions(this.renderer, this.quality);
        const {width, height} = dimensions;
        this.internalWidth = width;
        this.internalHeight = height;
        this.effectivePixelRatio = dimensions.effectivePixelRatio;
        const nativeSize = this.renderer.getNativeSize();
        const nativeSizeChanged = nativeSize[0] !== this.nativeSize[0] || nativeSize[1] !== this.nativeSize[1];
        if (!this.pending && !nativeSizeChanged && width === this.target.width && height === this.target.height) return;

        const start = performance.now();
        const state = this.#captureHostState();
        let drawCalls = 0;
        try {
            const resized = this.target.resize(width, height);
            if (resized || nativeSizeChanged) this.#updateSkinMetrics();
            drawCalls = this.pipeline.render(
                this.scene,
                this.target.framebuffer,
                width,
                height,
                this.postSettings?.snapshot() ?? {active: false},
                {samples: 0}
            );
            this.pending = false;
        } finally {
            this.guard.restore(state);
        }
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
        this.renderer.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
        this.renderer.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
        const state = this.#captureHostState();
        try {
            destroyStageDrawable(this.renderer, this.stageDrawable);
            this.pipeline.dispose();
            this.targetManager.dispose();
            this.pass.dispose();
            this.target.dispose();
        } finally {
            this.guard.restore(state);
        }
    }

    #captureHostState() {
        if (typeof this.renderer._doExitDrawRegion === 'function') this.renderer._doExitDrawRegion();
        return this.guard.capture();
    }

    #installSkin() {
        const renderer = this.renderer;
        const Skin = renderer.exports.Skin;
        const backend = this;
        const skinId = renderer._nextSkinId++;
        const skin = new class Turbo3DTextureSkin extends Skin {
            constructor(id, owner) {
                super(id, owner);
            }

            get size() {
                return backend.nativeSize;
            }

            getTexture() {
                backend.flush();
                return backend.target.texture;
            }

            useNearest() {
                return false;
            }

            dispose() {
                super.dispose();
            }
        }(skinId, renderer);
        renderer._allSkins[skinId] = skin;
        this.skin = skin;
        this.#updateSkinMetrics();
        return skinId;
    }

    #updateSkinMetrics() {
        this.nativeSize = this.renderer.getNativeSize();
        if (!this.skin) return;
        this.skin._rotationCenter[0] = this.nativeSize[0] / 2;
        this.skin._rotationCenter[1] = this.nativeSize[1] / 2;
    }
}
