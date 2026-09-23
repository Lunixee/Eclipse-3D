import {BillboardMode, EffectAlphaMode, EffectLighting} from '../effects/EffectStore.js';

const MAX_RASTER_DIMENSION = 2048;
const SAFE_FONTS = new Map([
    ['sans-serif', 'sans-serif'],
    ['serif', 'serif'],
    ['monospace', 'monospace'],
    ['system-ui', 'system-ui'],
    ['arial', 'Arial, sans-serif'],
    ['verdana', 'Verdana, sans-serif'],
    ['georgia', 'Georgia, serif'],
    ['times new roman', '"Times New Roman", serif'],
    ['courier new', '"Courier New", monospace']
]);

let nextStoreId = 1;

const finite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be finite`);
    return number;
};

const rgba = (value, fallback) => {
    const source = value ?? fallback;
    if (!Array.isArray(source) && !(ArrayBuffer.isView(source) && 'length' in source)) {
        throw new Error('Text color must contain RGBA bytes');
    }
    const channels = /** @type {ArrayLike<number>} */ (source);
    if (channels.length !== 4) throw new Error('Text color must contain four RGBA bytes');
    return Array.from(channels, channel => Math.max(0, Math.min(255, Math.round(Number(channel) || 0))));
};

const safeFont = value => {
    const normalized = String(value || 'sans-serif').trim().toLowerCase();
    const font = SAFE_FONTS.get(normalized);
    if (!font) throw new Error(`Unsupported text font "${value}"`);
    return {key: normalized, css: font};
};

const alignment = value => {
    const normalized = String(value || 'center').trim().toLowerCase();
    if (!['left', 'center', 'right'].includes(normalized)) throw new Error(`Unknown text alignment "${value}"`);
    return normalized;
};

const colorCss = color => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;

export const rasterizeTextCanvas = definition => {
    const Canvas = globalThis.OffscreenCanvas;
    const canvas = Canvas ? new Canvas(1, 1) : globalThis.document?.createElement?.('canvas');
    if (!canvas) throw new Error('Canvas text rasterization is unavailable in this environment');
    const pixelFontSize = definition.fontSize * definition.resolution;
    let context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('Could not create a 2D canvas context for 3D text');
    context.font = `${pixelFontSize}px ${definition.fontCss}`;
    const measured = context.measureText(definition.text);
    const padding = Math.max(2, Math.ceil(pixelFontSize * 0.2));
    const width = Math.max(1, Math.min(MAX_RASTER_DIMENSION, Math.ceil(measured.width) + padding * 2));
    const height = Math.max(1, Math.min(MAX_RASTER_DIMENSION, Math.ceil(pixelFontSize * 1.4) + padding * 2));
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('Could not resize the 2D canvas context for 3D text');
    context.clearRect(0, 0, width, height);
    if (definition.background[3] > 0) {
        context.fillStyle = colorCss(definition.background);
        context.fillRect(0, 0, width, height);
    }
    context.font = `${pixelFontSize}px ${definition.fontCss}`;
    context.textAlign = definition.alignment;
    context.textBaseline = 'middle';
    context.fillStyle = colorCss(definition.color);
    const x = definition.alignment === 'left' ? padding : definition.alignment === 'right' ? width - padding : width * 0.5;
    context.fillText(definition.text, x, height * 0.5, Math.max(1, width - padding * 2));
    const pixels = context.getImageData(0, 0, width, height).data;
    return {width, height, pixels};
};

const definitionKey = definition => [
    definition.text,
    definition.fontKey,
    definition.fontSize,
    definition.resolution,
    definition.alignment,
    definition.color.join(','),
    definition.background.join(',')
].join('\u0001');

const normalizeDefinition = options => {
    const font = safeFont(options.fontFamily ?? options.fontKey);
    const fontSize = Math.max(4, Math.min(512, finite(options.fontSize ?? 64, 'Text font size')));
    const resolution = Math.max(0.5, Math.min(4, finite(options.resolution ?? 1, 'Text resolution')));
    return {
        text: String(options.text ?? ''),
        fontKey: font.key,
        fontCss: font.css,
        fontSize,
        resolution,
        alignment: alignment(options.alignment),
        color: rgba(options.color, [255, 255, 255, 255]),
        background: rgba(options.background, [0, 0, 0, 0])
    };
};

export class TextStore {
    constructor(textures, effects, rasterizer = rasterizeTextCanvas) {
        this.id = nextStoreId++;
        this.textures = textures;
        this.effects = effects;
        this.rasterizer = rasterizer;
        this.labels = new Map();
        this.cache = new Map();
        this.nextTextureId = 1;
        this.rasterizations = 0;
    }

    create(name, text, options = {}) {
        if (!this.textures) throw new Error('Texture resources are unavailable');
        if (!name) throw new Error('3D text name cannot be empty');
        if (this.labels.has(name) || this.effects.resources.has(name)) throw new Error(`A resource named "${name}" already exists`);
        const definition = normalizeDefinition({...options, text});
        const entry = this.#acquire(definition);
        let effect;
        try {
            effect = this.effects.createSprite(name, entry.texture.id);
            effect.semanticKind = 'text';
            effect.setAlphaMode(EffectAlphaMode.BLEND);
            effect.setLighting(EffectLighting.UNLIT);
            effect.setDepth(true, false);
            effect.setBillboardMode(options.billboardMode ?? BillboardMode.FULL);
            const worldHeight = Math.max(1e-4, finite(options.worldHeight ?? 1, 'Text world height'));
            const worldWidth = options.worldWidth === undefined ? worldHeight * entry.width / entry.height :
                Math.max(1e-4, finite(options.worldWidth, 'Text world width'));
            effect.setSize(worldWidth, worldHeight);
        } catch (error) {
            if (effect) this.effects.delete(name);
            this.#release(entry.key);
            throw error;
        }
        const label = {
            name,
            effect,
            definition,
            key: entry.key,
            textureId: entry.texture.id,
            autoWidth: options.worldWidth === undefined
        };
        this.labels.set(name, label);
        return label;
    }

    require(name) {
        const label = this.labels.get(name);
        if (!label) throw new Error(`Unknown 3D text "${name}"`);
        return label;
    }

    setText(name, text) {
        const label = this.require(name);
        return this.#replace(label, {...label.definition, text: String(text)});
    }

    setStyle(name, options) {
        const label = this.require(name);
        return this.#replace(label, normalizeDefinition({...label.definition, ...options, text: label.definition.text}));
    }

    setSize(name, width, height) {
        const label = this.require(name);
        label.effect.setSize(width, height);
        label.autoWidth = false;
    }

    delete(name) {
        const label = this.labels.get(name);
        if (!label) return false;
        this.labels.delete(name);
        this.effects.delete(name);
        this.#release(label.key);
        return true;
    }

    clear() {
        for (const name of [...this.labels.keys()]) this.delete(name);
    }

    get sharedTextureCount() {
        return this.cache.size;
    }

    #replace(label, definition) {
        const normalized = normalizeDefinition(definition);
        const key = definitionKey(normalized);
        if (key === label.key) return false;
        const entry = this.#acquire(normalized);
        const previousKey = label.key;
        label.effect.setTexture(entry.texture.id);
        label.definition = normalized;
        label.key = entry.key;
        label.textureId = entry.texture.id;
        if (label.autoWidth) label.effect.setSize(label.effect.size[1] * entry.width / entry.height, label.effect.size[1]);
        this.#release(previousKey);
        return true;
    }

    #acquire(definition) {
        const key = definitionKey(definition);
        let entry = this.cache.get(key);
        if (entry) {
            entry.users++;
            return entry;
        }
        const raster = this.rasterizer(definition);
        const width = Math.floor(Number(raster.width));
        const height = Math.floor(Number(raster.height));
        if (!(width > 0 && height > 0 && width <= MAX_RASTER_DIMENSION && height <= MAX_RASTER_DIMENSION)) {
            throw new Error(`3D text raster dimensions exceed ${MAX_RASTER_DIMENSION}px`);
        }
        const textureName = `@text:${this.id}:${this.nextTextureId++}`;
        const texture = this.textures.createPixels(textureName, `text:${this.id}:${key}`, width, height, raster.pixels, 'text-raster');
        entry = {key, texture, width, height, users: 1};
        this.cache.set(key, entry);
        this.rasterizations++;
        return entry;
    }

    #release(key) {
        const entry = this.cache.get(key);
        if (!entry) return;
        entry.users--;
        if (entry.users > 0) return;
        this.cache.delete(key);
        this.textures.delete(entry.texture.name);
    }
}

export {MAX_RASTER_DIMENSION, SAFE_FONTS};
