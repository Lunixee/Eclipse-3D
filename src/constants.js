export const ENGINE_VERSION = '0.1.0-alpha.1';
export const BLOCK_API_VERSION = 19;
export const EXTENSION_ID = 'turbo3d';

export const ObjectKind = Object.freeze({
    CUBE: 1,
    CAMERA: 2,
    DIRECTIONAL_LIGHT: 3
});

export const BackendName = Object.freeze({
    AUTO: 'auto',
    SHARED: 'shared-webgl2',
    BITMAP: 'separate-canvas'
});
