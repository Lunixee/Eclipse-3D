const TAU = Math.PI * 2;

const finiteInRange = (value, label, minimum, maximum) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return Math.min(maximum, Math.max(minimum, number));
};

const normalizeRotation = radians => {
    const value = Number(radians);
    if (!Number.isFinite(value)) throw new Error('Environment rotation must be a finite number');
    return ((value % TAU) + TAU) % TAU;
};

export class EnvironmentResource {
    constructor(id, name, sourceTextureId, ownsSourceTexture, ownedTextureName = '') {
        this.id = id;
        this.name = name;
        this.sourceTextureId = sourceTextureId;
        this.ownsSourceTexture = ownsSourceTexture;
        this.ownedTextureName = ownedTextureName;
        this.intensity = 1;
        this.rotation = 0;
        this.backgroundEnabled = false;
        this.references = 0;
        this.version = 1;
        this.preprocessVersion = 1;
        this.disposed = false;
    }
}

export class EnvironmentStore {
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

    createFromTexture(name, textureId) {
        this.#assertNameAvailable(name);
        const texture = this.textures.resourceForId(textureId);
        if (!texture) throw new Error(`Unknown texture ID ${textureId}`);
        this.textures.retain(textureId);
        return this.#createResource(name, textureId, false);
    }

    createSolid(name, color) {
        this.#assertNameAvailable(name);
        const hiddenName = this.#availableOwnedTextureName();
        const texture = this.textures.createGenerated(hiddenName, 'solid', color, color, 1);
        this.textures.retain(texture.id);
        try {
            return this.#createResource(name, texture.id, true, hiddenName);
        } catch (error) {
            this.textures.release(texture.id);
            this.textures.delete(hiddenName);
            throw error;
        }
    }

    replaceTexture(name, textureId) {
        const resource = this.require(name);
        const texture = this.textures.resourceForId(textureId);
        if (!texture) throw new Error(`Unknown texture ID ${textureId}`);
        if (resource.sourceTextureId === textureId) return;
        this.textures.retain(textureId);
        this.#releaseSource(resource);
        resource.sourceTextureId = textureId;
        resource.ownsSourceTexture = false;
        resource.ownedTextureName = '';
        resource.version++;
        resource.preprocessVersion++;
        this.#changed();
    }

    setIntensity(name, value) {
        const resource = this.require(name);
        const intensity = finiteInRange(value, 'Environment intensity', 0, 100);
        if (resource.intensity === intensity) return;
        resource.intensity = intensity;
        resource.version++;
        this.#changed();
    }

    setRotation(name, radians) {
        const resource = this.require(name);
        const rotation = normalizeRotation(radians);
        if (resource.rotation === rotation) return;
        resource.rotation = rotation;
        resource.version++;
        this.#changed();
    }

    setBackgroundEnabled(name, enabled) {
        const resource = this.require(name);
        const next = Boolean(enabled);
        if (resource.backgroundEnabled === next) return;
        resource.backgroundEnabled = next;
        resource.version++;
        this.#changed();
    }

    require(name) {
        const resource = this.resources.get(name);
        if (!resource) throw new Error(`Unknown environment "${name}"`);
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
        if (!resource) throw new Error(`Unknown environment ID ${id}`);
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
        if (resource.references > 0) {
            throw new Error(`Environment "${name}" is still used by ${resource.references} scene(s)`);
        }
        this.resources.delete(name);
        this.resourcesById[resource.id] = null;
        resource.disposed = true;
        this.#releaseSource(resource);
        this.#changed();
    }

    clear() {
        for (const resource of this.resources.values()) {
            resource.disposed = true;
            this.#releaseSource(resource);
        }
        this.resources.clear();
        this.resourcesById.length = 0;
        this.nextId = 0;
        this.#changed();
    }

    #createResource(name, textureId, ownsSourceTexture, ownedTextureName = '') {
        const resource = new EnvironmentResource(
            this.nextId++,
            name,
            textureId,
            ownsSourceTexture,
            ownedTextureName
        );
        this.resources.set(name, resource);
        this.resourcesById[resource.id] = resource;
        this.#changed();
        return resource;
    }

    #releaseSource(resource) {
        const textureId = resource.sourceTextureId;
        const ownedTextureName = resource.ownsSourceTexture ? resource.ownedTextureName : '';
        this.textures.release(textureId);
        if (ownedTextureName && this.textures.has(ownedTextureName)) this.textures.delete(ownedTextureName);
    }

    #assertNameAvailable(name) {
        if (!name) throw new Error('Environment name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Environment "${name}" already exists`);
    }

    #availableOwnedTextureName() {
        let suffix = this.nextId;
        let name = `__turbo3d_environment_${suffix}`;
        while (this.textures.has(name)) name = `__turbo3d_environment_${++suffix}`;
        return name;
    }

    #changed() {
        this.version++;
        if (this.onChange) this.onChange();
    }
}
