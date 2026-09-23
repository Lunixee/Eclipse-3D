const normalizeDimension = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return Math.max(1, Math.min(16_384, Math.round(number)));
};

export class RenderTargetDefinition {
    constructor(id, name, width, height, textureId) {
        this.id = id;
        this.name = name;
        this.width = width;
        this.height = height;
        this.textureId = textureId;
        this.version = 1;
    }
}

export class RenderTargetStore {
    /**
     * @param {import('../textures/TextureStore.js').TextureStore} textures
     * @param {(() => void) | null} [onChange]
     */
    constructor(textures, onChange = null) {
        this.textures = textures;
        this.onChange = onChange;
        this.resources = new Map();
        this.resourcesById = [];
        this.nextId = 0;
        this.version = 1;
    }

    create(name, width, height) {
        if (!name) throw new Error('Render target name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Render target "${name}" already exists`);
        const targetWidth = normalizeDimension(width, 'Render target width');
        const targetHeight = normalizeDimension(height, 'Render target height');
        const id = this.nextId++;
        const texture = this.textures.createExternal(name, 'render-target', id, targetWidth, targetHeight);
        const resource = new RenderTargetDefinition(id, name, targetWidth, targetHeight, texture.id);
        this.resources.set(name, resource);
        this.resourcesById[id] = resource;
        this.#changed();
        return resource;
    }

    require(name) {
        const resource = this.resources.get(name);
        if (!resource) throw new Error(`Unknown render target "${name}"`);
        return resource;
    }

    resourceForId(id) {
        return this.resourcesById[id] ?? null;
    }

    has(name) {
        return this.resources.has(name);
    }

    resize(name, width, height) {
        const resource = this.require(name);
        const targetWidth = normalizeDimension(width, 'Render target width');
        const targetHeight = normalizeDimension(height, 'Render target height');
        if (resource.width === targetWidth && resource.height === targetHeight) return false;
        resource.width = targetWidth;
        resource.height = targetHeight;
        resource.version++;
        this.textures.updateExternalDimensions(resource.textureId, targetWidth, targetHeight);
        this.#changed();
        return true;
    }

    delete(name) {
        const resource = this.require(name);
        this.textures.deleteExternal(name, 'render-target', resource.id);
        this.resources.delete(name);
        this.resourcesById[resource.id] = null;
        this.#changed();
    }

    clear() {
        for (const resource of this.resources.values()) {
            this.textures.deleteExternal(resource.name, 'render-target', resource.id);
        }
        this.resources.clear();
        this.resourcesById.length = 0;
        this.nextId = 0;
        this.#changed();
    }

    #changed() {
        this.version++;
        this.onChange?.();
    }
}

export {normalizeDimension as normalizeRenderTargetDimension};
