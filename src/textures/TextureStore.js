/**
 * @typedef {object} TextureSettings
 * @property {string} minFilter
 * @property {string} magFilter
 * @property {string} wrapU
 * @property {string} wrapV
 * @property {boolean} mipmaps
 * @property {number} anisotropy
 * @property {string} colorSpace
 * @property {boolean} flipY
 */

/** @type {Readonly<TextureSettings>} */
const DEFAULT_SETTINGS = Object.freeze({
    minFilter: 'linear-mipmap-linear',
    magFilter: 'linear',
    wrapU: 'repeat',
    wrapV: 'repeat',
    mipmaps: true,
    anisotropy: 1,
    colorSpace: 'srgb',
    flipY: true
});

const MIN_FILTERS = new Set([
    'nearest',
    'linear',
    'nearest-mipmap-nearest',
    'linear-mipmap-nearest',
    'nearest-mipmap-linear',
    'linear-mipmap-linear'
]);
const MAG_FILTERS = new Set(['nearest', 'linear']);
const WRAPS = new Set(['clamp', 'repeat', 'mirror']);
const COLOR_SPACES = new Set(['srgb', 'linear']);

const closeSource = source => {
    if (source.image?.close) source.image.close();
    source.image = null;
};

const errorMessage = error => error instanceof Error ? error.message : String(error);

const createSource = (key, state = 'loading') => ({
    key,
    state,
    error: '',
    width: 0,
    height: 0,
    kind: '',
    image: null,
    version: 0,
    resourceCount: 0,
    controller: state === 'loading' ? new AbortController() : null,
    promise: null,
    disposed: false
});

export class TextureResource {
    constructor(id, name, source) {
        this.id = id;
        this.name = name;
        this.source = source;
        this.references = 0;
        /** @type {TextureSettings} */
        this.settings = {...DEFAULT_SETTINGS};
        this.settingsVersion = 1;
        this.uv = new Float32Array([0, 0, 1, 1, 0]);
        this.disposed = false;
    }

    get state() {
        return this.source.state;
    }

    get error() {
        return this.source.error;
    }

    get width() {
        return this.source.width;
    }

    get height() {
        return this.source.height;
    }
}

export class TextureStore {
    /** @param {((textureId: number | null) => void) | null} [onChange] */
    constructor(onChange = null) {
        this.onChange = onChange;
        this.resources = new Map();
        this.resourcesById = [];
        this.sources = new Map();
        this.nextId = 0;
        this.version = 1;
    }

    createGenerated(name, preset, primary, secondary, size) {
        this.#assertNameAvailable(name);
        const dimension = Math.max(1, Math.min(1024, Math.floor(Number(size) || 1)));
        const texturePreset = String(preset).toLowerCase();
        if (texturePreset !== 'solid' && texturePreset !== 'checker') {
            throw new Error(`Unknown generated texture preset "${preset}"`);
        }
        const first = this.#rgba(primary);
        const second = this.#rgba(secondary);
        const key = `generated:${texturePreset}:${dimension}:${first.join(',')}:${second.join(',')}`;
        let source = this.sources.get(key);
        if (!source) {
            source = createSource(key, 'ready');
            source.kind = 'pixels';
            source.width = dimension;
            source.height = dimension;
            source.image = this.#generatePixels(texturePreset, dimension, first, second);
            source.version = 1;
            source.promise = Promise.resolve(source);
            this.sources.set(key, source);
        }
        const resource = this.#createResource(name, source);
        resource.settings.flipY = false;
        return resource;
    }

    createPixels(name, key, width, height, pixels, semanticKind = '') {
        this.#assertNameAvailable(name);
        const resolvedWidth = Math.floor(Number(width));
        const resolvedHeight = Math.floor(Number(height));
        if (!Number.isFinite(resolvedWidth) || !Number.isFinite(resolvedHeight) ||
            resolvedWidth < 1 || resolvedHeight < 1 || resolvedWidth > 4096 || resolvedHeight > 4096) {
            throw new Error('Pixel texture dimensions must be integers from 1 to 4096');
        }
        if (!ArrayBuffer.isView(pixels) || pixels.byteLength !== resolvedWidth * resolvedHeight * 4) {
            throw new Error('Pixel texture data must contain exactly four bytes per pixel');
        }
        const sourceKey = `pixels:${String(key)}`;
        let source = this.sources.get(sourceKey);
        if (!source) {
            source = createSource(sourceKey, 'ready');
            source.kind = 'pixels';
            source.semanticKind = String(semanticKind);
            source.width = resolvedWidth;
            source.height = resolvedHeight;
            source.image = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength).slice();
            source.version = 1;
            source.promise = Promise.resolve(source);
            this.sources.set(sourceKey, source);
        } else if (source.width !== resolvedWidth || source.height !== resolvedHeight) {
            throw new Error(`Cached pixel source "${key}" has conflicting dimensions`);
        }
        const resource = this.#createResource(name, source);
        resource.settings.minFilter = 'linear-mipmap-linear';
        resource.settings.magFilter = 'linear';
        resource.settings.wrapU = 'clamp';
        resource.settings.wrapV = 'clamp';
        resource.settings.mipmaps = true;
        resource.settings.flipY = false;
        return resource;
    }

    createExternal(name, kind, externalId, width, height) {
        this.#assertNameAvailable(name);
        /** @type {any} */
        const source = createSource(`external:${kind}:${externalId}`, 'ready');
        source.kind = kind;
        source.externalId = externalId;
        source.width = width;
        source.height = height;
        source.version = 1;
        source.promise = Promise.resolve(source);
        this.sources.set(source.key, source);
        const resource = this.#createResource(name, source);
        resource.settings.minFilter = 'linear';
        resource.settings.magFilter = 'linear';
        resource.settings.wrapU = 'clamp';
        resource.settings.wrapV = 'clamp';
        resource.settings.mipmaps = false;
        resource.settings.flipY = false;
        return resource;
    }

    updateExternalDimensions(id, width, height) {
        const resource = this.resourceForId(id);
        if (!resource || resource.source.kind !== 'render-target') {
            throw new Error(`Unknown render-target texture ID ${id}`);
        }
        resource.source.width = width;
        resource.source.height = height;
        resource.source.version++;
        this.#changed(id);
    }

    load(name, key, loader) {
        this.#assertNameAvailable(name);
        let source = this.sources.get(key);
        if (!source) {
            source = createSource(key);
            this.sources.set(key, source);
            source.promise = Promise.resolve()
                .then(() => loader(source.controller.signal))
                .then(image => {
                    if (source.disposed) {
                        if (image?.image?.close) image.image.close();
                        return source;
                    }
                    if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
                        image.width < 1 || image.height < 1 || image.width > 0x7fffffff || image.height > 0x7fffffff) {
                        image?.image?.close?.();
                        throw new Error('Texture decoder returned invalid image dimensions');
                    }
                    source.kind = image.kind;
                    source.image = image.image;
                    source.width = image.width;
                    source.height = image.height;
                    source.state = 'ready';
                    source.version++;
                    source.controller = null;
                    this.#changed(null);
                    return source;
                })
                .catch(error => {
                    if (source.disposed) return source;
                    source.state = 'error';
                    source.error = errorMessage(error);
                    source.controller = null;
                    this.#changed(null);
                    return source;
                });
        }
        return this.#createResource(name, source);
    }

    async waitUntilReady(resource) {
        await resource.source.promise;
        if (resource.disposed) throw new Error(`Texture "${resource.name}" was deleted while loading`);
        if (resource.state === 'error') throw new Error(resource.error);
        return resource;
    }

    require(name) {
        const resource = this.resources.get(name);
        if (!resource) throw new Error(`Unknown texture "${name}"`);
        return resource;
    }

    resourceForId(id) {
        return this.resourcesById[id] ?? null;
    }

    has(name) {
        return this.resources.has(name);
    }

    retain(id) {
        if (id < 0) return;
        const resource = this.resourceForId(id);
        if (!resource) throw new Error(`Unknown texture ID ${id}`);
        resource.references++;
    }

    release(id) {
        if (id < 0) return;
        const resource = this.resourceForId(id);
        if (!resource) return;
        resource.references = Math.max(0, resource.references - 1);
    }

    delete(name) {
        const resource = this.require(name);
        if (resource.source.kind === 'render-target') {
            throw new Error(`Texture "${name}" is a render target; use delete render target`);
        }
        this.#deleteResource(resource);
    }

    deleteExternal(name, kind, externalId) {
        const resource = this.require(name);
        if (resource.source.kind !== kind || resource.source.externalId !== externalId) {
            throw new Error(`Texture "${name}" is not the expected ${kind}`);
        }
        this.#deleteResource(resource);
    }

    #deleteResource(resource) {
        if (resource.references > 0) {
            throw new Error(`Texture "${resource.name}" is still used by ${resource.references} resource(s)`);
        }
        this.resources.delete(resource.name);
        this.resourcesById[resource.id] = null;
        resource.disposed = true;
        const source = resource.source;
        source.resourceCount--;
        if (source.resourceCount === 0) this.#disposeSource(source);
        this.#changed(resource.id);
    }

    setOption(name, option, value) {
        const resource = this.require(name);
        if (resource.source.kind === 'render-target') {
            throw new Error('Render-target textures use fixed linear, clamp, non-mipmapped sampling');
        }
        let property;
        let next;
        switch (option) {
        case 'min-filter':
            property = 'minFilter';
            next = this.#enumValue(value, MIN_FILTERS, 'minification filter');
            break;
        case 'mag-filter':
            property = 'magFilter';
            next = this.#enumValue(value, MAG_FILTERS, 'magnification filter');
            break;
        case 'wrap-u':
            property = 'wrapU';
            next = this.#enumValue(value, WRAPS, 'U wrapping mode');
            break;
        case 'wrap-v':
            property = 'wrapV';
            next = this.#enumValue(value, WRAPS, 'V wrapping mode');
            break;
        case 'mipmaps':
            property = 'mipmaps';
            next = this.#booleanValue(value);
            break;
        case 'anisotropy': {
            const anisotropy = Number(value);
            if (!Number.isFinite(anisotropy) || anisotropy < 1) throw new Error('Anisotropy must be at least 1');
            property = 'anisotropy';
            next = anisotropy;
            break;
        }
        case 'color-space':
            property = 'colorSpace';
            next = this.#enumValue(value, COLOR_SPACES, 'color space');
            break;
        case 'flip-y':
            property = 'flipY';
            next = this.#booleanValue(value);
            break;
        default:
            throw new Error(`Unknown texture option "${option}"`);
        }
        if (resource.settings[property] === next) return;
        resource.settings[property] = next;
        resource.settingsVersion++;
        this.#changed(resource.id);
    }

    setUV(name, offsetX, offsetY, repeatX, repeatY, rotationRadians) {
        const resource = this.require(name);
        const values = [offsetX, offsetY, repeatX, repeatY, rotationRadians].map(Number);
        if (values.some(value => !Number.isFinite(value))) throw new Error('Texture UV values must be finite numbers');
        // UV storage is float32; compare the representation actually sent to the shader.
        if (values.every((value, index) => resource.uv[index] === Math.fround(value))) return;
        resource.uv.set(values);
        resource.settingsVersion++;
        this.#changed(resource.id);
    }

    clear() {
        for (const resource of this.resources.values()) resource.disposed = true;
        for (const source of this.sources.values()) this.#disposeSource(source);
        this.resources.clear();
        this.resourcesById.length = 0;
        this.sources.clear();
        this.nextId = 0;
        this.#changed(null);
    }

    #createResource(name, source) {
        const resource = new TextureResource(this.nextId++, name, source);
        source.resourceCount++;
        this.resources.set(name, resource);
        this.resourcesById[resource.id] = resource;
        this.#changed(resource.id);
        return resource;
    }

    #assertNameAvailable(name) {
        if (!name) throw new Error('Texture name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Texture "${name}" already exists`);
    }

    #disposeSource(source) {
        source.disposed = true;
        if (source.controller) source.controller.abort();
        closeSource(source);
        this.sources.delete(source.key);
    }

    #changed(textureId = null) {
        this.version++;
        if (this.onChange) this.onChange(textureId);
    }

    #enumValue(value, allowed, label) {
        const normalized = String(value).toLowerCase();
        if (!allowed.has(normalized)) throw new Error(`Unknown ${label} "${value}"`);
        return normalized;
    }

    #booleanValue(value) {
        if (value === true || value === 1) return true;
        const normalized = String(value).toLowerCase();
        if (normalized === 'true' || normalized === 'on' || normalized === 'yes' || normalized === '1') return true;
        if (normalized === 'false' || normalized === 'off' || normalized === 'no' || normalized === '0') return false;
        throw new Error(`Expected true or false, received "${value}"`);
    }

    /** @param {ArrayLike<number>} value */
    #rgba(value) {
        if (!Array.isArray(value) && !ArrayBuffer.isView(value)) throw new Error('Generated texture color is invalid');
        const channels = /** @type {ArrayLike<number>} */ (value);
        if (channels.length !== 4) throw new Error('Generated texture color must contain RGBA values');
        return Array.from(channels, channel => Math.max(0, Math.min(255, Math.round(Number(channel) || 0))));
    }

    #generatePixels(preset, size, primary, secondary) {
        const data = new Uint8Array(size * size * 4);
        const cellSize = Math.max(1, Math.floor(size / 8));
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const color = preset === 'checker' && ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) & 1)
                    ? secondary
                    : primary;
                data.set(color, (y * size + x) * 4);
            }
        }
        return data;
    }
}

export {DEFAULT_SETTINGS};
