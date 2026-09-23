const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const BLOOM_QUALITY_NAMES = Object.freeze({
    potato: 1,
    low: 1,
    medium: 2,
    high: 3,
    ultra: 4
});

const finite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

const toggle = value => Boolean(value);

export class PostProcessingSettings {
    /** @param {(() => void) | null} [onChange] */
    constructor(onChange = null) {
        this.onChange = onChange;
        this.renderQuality = 'custom';
        this.enabled = false;
        this.bloomEnabled = false;
        this.bloomIntensity = 0.8;
        this.bloomThreshold = 0.8;
        this.bloomQuality = 2;
        this.bloomQualityCustom = false;
        this.brightness = 1;
        this.contrast = 1;
        this.saturation = 1;
        this.vignetteIntensity = 0;
        this.vignetteRadius = 0.75;
        this.vignetteSoftness = 0.35;
        this.fxaaEnabled = false;
        this.revision = 1;
    }

    setEnabled(value) {
        this.#set('enabled', toggle(value));
    }

    setBloomEnabled(value) {
        this.#set('bloomEnabled', toggle(value));
    }

    setBloomIntensity(value) {
        this.#set('bloomIntensity', clamp(finite(value, 'Bloom intensity'), 0, 8));
    }

    setBloomThreshold(value) {
        this.#set('bloomThreshold', clamp(finite(value, 'Bloom threshold'), 0, 1));
    }

    setBloomQuality(value) {
        const normalized = String(value).trim().toLowerCase();
        const named = BLOOM_QUALITY_NAMES[normalized];
        const quality = named ?? Math.round(finite(value, 'Bloom quality'));
        this.bloomQualityCustom = true;
        this.#set('bloomQuality', Math.round(clamp(quality, 1, 4)));
    }

    setBrightness(value) {
        this.#set('brightness', clamp(finite(value, 'Brightness'), 0, 8));
    }

    setContrast(value) {
        this.#set('contrast', clamp(finite(value, 'Contrast'), 0, 4));
    }

    setSaturation(value) {
        this.#set('saturation', clamp(finite(value, 'Saturation'), 0, 4));
    }

    setVignetteIntensity(value) {
        this.#set('vignetteIntensity', clamp(finite(value, 'Vignette intensity'), 0, 1));
    }

    setVignetteRadius(value) {
        this.#set('vignetteRadius', clamp(finite(value, 'Vignette radius'), 0, 2));
    }

    setVignetteSoftness(value) {
        this.#set('vignetteSoftness', clamp(finite(value, 'Vignette softness'), 0.001, 2));
    }

    setFxaaEnabled(value) {
        this.#set('fxaaEnabled', toggle(value));
    }

    applyRenderQuality(name) {
        const normalized = String(name).trim().toLowerCase();
        this.renderQuality = normalized;
        if (this.bloomQualityCustom || BLOOM_QUALITY_NAMES[normalized] === undefined) return;
        this.#set('bloomQuality', BLOOM_QUALITY_NAMES[normalized]);
    }

    reset(renderQuality = this.renderQuality) {
        const previousRevision = this.revision;
        this.renderQuality = String(renderQuality).trim().toLowerCase();
        this.enabled = false;
        this.bloomEnabled = false;
        this.bloomIntensity = 0.8;
        this.bloomThreshold = 0.8;
        this.bloomQualityCustom = false;
        this.bloomQuality = BLOOM_QUALITY_NAMES[this.renderQuality] ?? 2;
        this.brightness = 1;
        this.contrast = 1;
        this.saturation = 1;
        this.vignetteIntensity = 0;
        this.vignetteRadius = 0.75;
        this.vignetteSoftness = 0.35;
        this.fxaaEnabled = false;
        this.revision = previousRevision + 1;
        this.onChange?.();
    }

    get active() {
        if (!this.enabled) return false;
        return (this.bloomEnabled && this.bloomIntensity > 0) ||
            Math.abs(this.brightness - 1) > 1e-6 ||
            Math.abs(this.contrast - 1) > 1e-6 ||
            Math.abs(this.saturation - 1) > 1e-6 ||
            this.vignetteIntensity > 0 ||
            this.fxaaEnabled;
    }

    snapshot() {
        return Object.freeze({
            enabled: this.enabled,
            active: this.active,
            bloomEnabled: this.bloomEnabled,
            bloomIntensity: this.bloomIntensity,
            bloomThreshold: this.bloomThreshold,
            bloomQuality: this.bloomQuality,
            brightness: this.brightness,
            contrast: this.contrast,
            saturation: this.saturation,
            vignetteIntensity: this.vignetteIntensity,
            vignetteRadius: this.vignetteRadius,
            vignetteSoftness: this.vignetteSoftness,
            fxaaEnabled: this.fxaaEnabled,
            revision: this.revision
        });
    }

    #set(property, value) {
        if (this[property] === value) return;
        this[property] = value;
        this.revision++;
        this.onChange?.();
    }
}

export {BLOOM_QUALITY_NAMES};
