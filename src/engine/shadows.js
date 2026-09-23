export const DEFAULT_DIRECTIONAL_SHADOW = Object.freeze({
    mapSize: 1024,
    bias: 0.0015,
    normalBias: 0.02,
    distance: 40,
    near: 1,
    far: 100,
    bounds: 25,
    filter: 1
});

export const SHADOW_QUALITY_PRESETS = Object.freeze({
    low: Object.freeze({...DEFAULT_DIRECTIONAL_SHADOW, mapSize: 512, filter: 0}),
    medium: Object.freeze({...DEFAULT_DIRECTIONAL_SHADOW}),
    high: Object.freeze({...DEFAULT_DIRECTIONAL_SHADOW, mapSize: 2048, filter: 1}),
    ultra: Object.freeze({...DEFAULT_DIRECTIONAL_SHADOW, mapSize: 2048, filter: 2})
});

export const SHADOW_QUALITIES = new Set(['off', 'low', 'medium', 'high', 'ultra', 'custom']);

const finite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

export const normalizeShadowMapSize = value => {
    const size = Math.min(4096, Math.max(128, finite(value, 'Shadow map size')));
    return 2 ** Math.round(Math.log2(size));
};

export const normalizeShadowSetting = (setting, value) => {
    switch (setting) {
    case 'mapSize':
        return normalizeShadowMapSize(value);
    case 'bias':
        return Math.min(0.05, Math.max(-0.05, finite(value, 'Shadow bias')));
    case 'normalBias':
        return Math.min(1, Math.max(0, finite(value, 'Shadow normal bias')));
    case 'distance':
        return Math.min(10_000, Math.max(0.1, finite(value, 'Shadow distance')));
    case 'near':
        return Math.min(9_999, Math.max(0.01, finite(value, 'Shadow camera near plane')));
    case 'far':
        return Math.min(10_000, Math.max(0.02, finite(value, 'Shadow camera far plane')));
    case 'bounds':
        return Math.min(10_000, Math.max(0.1, finite(value, 'Shadow camera bounds')));
    case 'filter':
        if (typeof value === 'string') {
            const filter = {'hard': 0, 'pcf-4': 1, 'pcf-9': 2}[value.trim().toLowerCase()];
            if (filter !== undefined) return filter;
        }
        return Math.min(2, Math.max(0, Math.round(finite(value, 'Shadow filter'))));
    default:
        throw new Error(`Unknown shadow setting "${setting}"`);
    }
};
