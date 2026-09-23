const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const RENDER_QUALITY_PRESETS = Object.freeze({
    potato: Object.freeze({renderScale: 50, maxPixelRatio: 1, antialias: 'off', renderDistance: 75, textureQuality: 'potato', shadowQuality: 'off', environmentQuality: 'potato', localLightLimit: 2}),
    low: Object.freeze({renderScale: 75, maxPixelRatio: 1, antialias: 'off', renderDistance: 150, textureQuality: 'low', shadowQuality: 'low', environmentQuality: 'low', localLightLimit: 4}),
    medium: Object.freeze({renderScale: 100, maxPixelRatio: 1.5, antialias: 'off', renderDistance: 300, textureQuality: 'medium', shadowQuality: 'medium', environmentQuality: 'medium', localLightLimit: 6}),
    high: Object.freeze({renderScale: 100, maxPixelRatio: 2, antialias: 'off', renderDistance: 600, textureQuality: 'high', shadowQuality: 'high', environmentQuality: 'high', localLightLimit: 8}),
    ultra: Object.freeze({renderScale: 125, maxPixelRatio: 2, antialias: 'off', renderDistance: 0, textureQuality: 'ultra', shadowQuality: 'ultra', environmentQuality: 'ultra', localLightLimit: 8})
});

export const TEXTURE_QUALITY_PRESETS = Object.freeze({
    custom: Object.freeze({mipmaps: true, maxAnisotropy: Number.POSITIVE_INFINITY}),
    potato: Object.freeze({mipmaps: false, maxAnisotropy: 1}),
    low: Object.freeze({mipmaps: true, maxAnisotropy: 2}),
    medium: Object.freeze({mipmaps: true, maxAnisotropy: 4}),
    high: Object.freeze({mipmaps: true, maxAnisotropy: 8}),
    ultra: Object.freeze({mipmaps: true, maxAnisotropy: 16})
});

export const ENVIRONMENT_QUALITY_PRESETS = Object.freeze({
    custom: Object.freeze({diffuseWidth: 16, specularWidth: 128, diffuseSamples: 32, specularSamples: 48}),
    potato: Object.freeze({diffuseWidth: 8, specularWidth: 32, diffuseSamples: 8, specularSamples: 12}),
    low: Object.freeze({diffuseWidth: 16, specularWidth: 64, diffuseSamples: 16, specularSamples: 24}),
    medium: Object.freeze({diffuseWidth: 16, specularWidth: 128, diffuseSamples: 32, specularSamples: 48}),
    high: Object.freeze({diffuseWidth: 32, specularWidth: 256, diffuseSamples: 48, specularSamples: 64}),
    ultra: Object.freeze({diffuseWidth: 32, specularWidth: 256, diffuseSamples: 64, specularSamples: 96})
});

const requireChoice = (value, choices, label) => {
    const normalized = String(value).trim().toLowerCase();
    if (!choices.includes(normalized)) throw new Error(`Unknown ${label} "${value}"`);
    return normalized;
};

const requireFinite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

export class RenderQualitySettings {
    constructor() {
        // These are the pre-quality-controls engine defaults. Presets are opt-in so an
        // existing project does not silently gain shadows or lose render resolution.
        this.preset = 'custom';
        this.renderScale = 100;
        this.adaptiveScale = 100;
        this.maxPixelRatio = 0;
        this.antialias = 'off';
        this.renderDistance = 0;
        this.textureQuality = 'custom';
        this.shadowQuality = null;
        this.environmentQuality = 'custom';
        this.localLightLimit = 8;
        this.adaptiveEnabled = false;
        this.adaptiveTargetFps = 60;
        this.adaptiveMinimumScale = 50;
        this.adaptiveMaximumScale = 100;
        this.adaptiveResponseFrames = 30;
        this.revision = 1;
    }

    applyPreset(value) {
        const preset = requireChoice(value, Object.keys(RENDER_QUALITY_PRESETS), 'render quality');
        Object.assign(this, RENDER_QUALITY_PRESETS[preset]);
        this.preset = preset;
        this.adaptiveScale = clamp(this.renderScale, this.adaptiveMinimumScale, this.adaptiveMaximumScale);
        this.revision++;
    }

    setRenderScale(value) {
        this.renderScale = clamp(requireFinite(value, 'Render scale'), 25, 200);
        this.adaptiveScale = clamp(this.renderScale, this.adaptiveMinimumScale, this.adaptiveMaximumScale);
        this.#customize();
    }

    setMaxPixelRatio(value) {
        if (String(value).trim().toLowerCase() === 'automatic') {
            this.maxPixelRatio = 0;
        } else {
            this.maxPixelRatio = clamp(requireFinite(value, 'Maximum pixel ratio'), 0.5, 4);
        }
        this.#customize();
    }

    setAntialias(value) {
        this.antialias = requireChoice(value, ['off', 'native'], 'antialiasing mode');
        this.#customize();
    }

    setRenderDistance(value) {
        this.renderDistance = clamp(requireFinite(value, 'Render distance'), 0, 100_000);
        this.#customize();
    }

    setTextureQuality(value) {
        this.textureQuality = requireChoice(value, Object.keys(TEXTURE_QUALITY_PRESETS), 'texture quality');
        this.#customize();
    }

    setEnvironmentQuality(value) {
        this.environmentQuality = requireChoice(
            value,
            Object.keys(ENVIRONMENT_QUALITY_PRESETS),
            'environment quality'
        );
        this.#customize();
    }

    setLocalLightLimit(value) {
        this.localLightLimit = Math.round(clamp(requireFinite(value, 'Local-light limit'), 0, 8));
        this.#customize();
    }

    setAdaptiveEnabled(value) {
        this.adaptiveEnabled = Boolean(value);
        this.adaptiveScale = clamp(this.renderScale, this.adaptiveMinimumScale, this.adaptiveMaximumScale);
        this.revision++;
    }

    setAdaptiveTargetFps(value) {
        this.adaptiveTargetFps = clamp(requireFinite(value, 'Adaptive target FPS'), 10, 240);
        this.revision++;
    }

    setAdaptiveRange(minimum, maximum) {
        const min = clamp(requireFinite(minimum, 'Minimum adaptive scale'), 25, 200);
        const max = clamp(requireFinite(maximum, 'Maximum adaptive scale'), 25, 200);
        if (min > max) throw new Error('Minimum adaptive scale must not exceed the maximum');
        this.adaptiveMinimumScale = min;
        this.adaptiveMaximumScale = max;
        this.adaptiveScale = clamp(this.adaptiveScale, min, max);
        this.revision++;
    }

    setAdaptiveScale(value) {
        const next = clamp(value, this.adaptiveMinimumScale, this.adaptiveMaximumScale);
        if (next === this.adaptiveScale) return false;
        this.adaptiveScale = next;
        this.revision++;
        return true;
    }

    markCustom() {
        if (this.preset === 'custom' && this.shadowQuality === null) return;
        this.preset = 'custom';
        this.shadowQuality = null;
        this.revision++;
    }

    get effectiveRenderScale() {
        return this.adaptiveEnabled ? this.adaptiveScale : this.renderScale;
    }

    get textureLimits() {
        return TEXTURE_QUALITY_PRESETS[this.textureQuality];
    }

    get environmentLimits() {
        return ENVIRONMENT_QUALITY_PRESETS[this.environmentQuality];
    }

    snapshot() {
        return Object.freeze({
            preset: this.preset,
            renderScale: this.renderScale,
            effectiveRenderScale: this.effectiveRenderScale,
            maxPixelRatio: this.maxPixelRatio,
            antialias: this.antialias,
            renderDistance: this.renderDistance,
            textureQuality: this.textureQuality,
            textureLimits: this.textureLimits,
            shadowQuality: this.shadowQuality,
            environmentQuality: this.environmentQuality,
            environmentLimits: this.environmentLimits,
            localLightLimit: this.localLightLimit,
            adaptiveEnabled: this.adaptiveEnabled,
            adaptiveTargetFps: this.adaptiveTargetFps,
            adaptiveMinimumScale: this.adaptiveMinimumScale,
            adaptiveMaximumScale: this.adaptiveMaximumScale,
            revision: this.revision
        });
    }

    #customize() {
        this.preset = 'custom';
        this.revision++;
    }
}
