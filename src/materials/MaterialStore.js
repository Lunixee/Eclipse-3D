import {CustomShaderStore, createCustomUniforms, setCustomUniform} from './CustomShaderStore.js';

export const MaterialType = Object.freeze({
    UNLIT: 'unlit',
    BASIC_LIT: 'basic-lit',
    PBR: 'pbr',
    CUSTOM: 'custom'
});

export const AlphaMode = Object.freeze({
    OPAQUE: 'opaque',
    CUTOUT: 'cutout',
    BLEND: 'blend'
});

export const PbrMap = Object.freeze({
    NORMAL: 'normal',
    METALLIC: 'metallic',
    ROUGHNESS: 'roughness',
    METALLIC_ROUGHNESS: 'metallic-roughness',
    EMISSIVE: 'emissive',
    AO: 'ambient-occlusion'
});

export const PBR_MAP_PROPERTIES = Object.freeze({
    [PbrMap.NORMAL]: 'normalTextureId',
    [PbrMap.METALLIC]: 'metallicTextureId',
    [PbrMap.ROUGHNESS]: 'roughnessTextureId',
    [PbrMap.METALLIC_ROUGHNESS]: 'metallicRoughnessTextureId',
    [PbrMap.EMISSIVE]: 'emissiveTextureId',
    [PbrMap.AO]: 'aoTextureId'
});

export const PBR_TEXTURE_PROPERTIES = Object.freeze([
    'textureId',
    'normalTextureId',
    'metallicTextureId',
    'roughnessTextureId',
    'metallicRoughnessTextureId',
    'emissiveTextureId',
    'aoTextureId'
]);

const MATERIAL_TYPES = new Set(Object.values(MaterialType));
const ALPHA_MODES = new Set(Object.values(AlphaMode));

const finite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

const boolean = value => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    const normalized = String(value).trim().toLowerCase();
    if (['true', 'on', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'off', 'no', '0'].includes(normalized)) return false;
    throw new Error(`Expected true or false, received "${value}"`);
};

const color = (value, label) => {
    const supported = Array.isArray(value) || ArrayBuffer.isView(value);
    const length = supported ? /** @type {{length: number}} */ (value).length : 0;
    if (!supported || length < 3) {
        throw new Error(`${label} must contain RGB values`);
    }
    const result = new Float32Array(3);
    for (let index = 0; index < 3; index++) {
        result[index] = Math.min(1, Math.max(0, finite(value[index], label)));
    }
    return result;
};

export class MaterialResource {
    constructor(id, name, type, internal = false) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.internal = internal;
        this.references = 0;
        this.baseColor = new Float32Array([1, 1, 1]);
        this.opacity = 1;
        this.textureId = -1;
        this.emissiveColor = new Float32Array([0, 0, 0]);
        this.emissiveIntensity = 0;
        this.metallic = 0;
        this.roughness = 0.5;
        this.normalScale = 1;
        this.aoStrength = 1;
        this.normalTextureId = -1;
        this.metallicTextureId = -1;
        this.roughnessTextureId = -1;
        this.metallicRoughnessTextureId = -1;
        this.emissiveTextureId = -1;
        this.aoTextureId = -1;
        this.doubleSided = false;
        this.side = 'front';
        this.blendMode = 'normal';
        this.renderOrder = 0;
        this.polygonOffsetFactor = 0;
        this.polygonOffsetUnits = 0;
        this.environmentIntensity = 1;
        this.environmentRotation = 0;
        this.customShader = null;
        this.customUniforms = null;
        this.depthTest = true;
        this.depthWrite = true;
        this.alphaMode = AlphaMode.OPAQUE;
        this.alphaCutoff = 0.5;
        this.variantVersion = 1;
        this.uniformVersion = 1;
        this.stateVersion = 1;
        this.disposed = false;
    }
}

export class MaterialStore {
    /**
     * @param {import('../textures/TextureStore.js').TextureStore | null} [textures]
     * @param {(() => void) | null} [onChange]
     * @param {((materialId: number) => void) | null} [onShadowChange]
     */
    constructor(textures = null, onChange = null, onShadowChange = null) {
        this.textures = textures;
        this.onChange = onChange;
        this.onShadowChange = onShadowChange;
        this.resources = new Map();
        this.resourcesById = [];
        this.legacyByTexture = new Map();
        this.nextId = 0;
        this.version = 1;
        this.batchVersion = 1;
        this.customShaders = null;
        this.defaultMaterial = this.#create('default', MaterialType.BASIC_LIT, true, true);
    }

    create(name, type) {
        if (this.#type(type) === MaterialType.CUSTOM) throw new Error('Use createCustom to select a custom shader definition');
        this.#assertNameAvailable(name);
        const material = this.#create(name, this.#type(type), false, true);
        this.#changed();
        return material;
    }

    get shaders() {
        this.customShaders ??= new CustomShaderStore(this.onChange);
        return this.customShaders;
    }

    createCustom(name, shaderName) {
        this.#assertNameAvailable(name);
        const definition = this.shaders.require(shaderName);
        const material = this.#create(name, MaterialType.CUSTOM, false, true);
        material.customShader = definition;
        material.customUniforms = createCustomUniforms(definition);
        definition.references++;
        this.#changed();
        return material;
    }

    setUniform(name, uniform, value) {
        const material = this.require(name);
        if (!setCustomUniform(material, uniform, value, this.textures)) return;
        material.uniformVersion++;
        this.#changed();
    }

    setSide(name, value) {
        if (!['front', 'back', 'double'].includes(value)) throw new Error('Material side must be front, back or double');
        const material = this.require(name);
        if (material.side === value) return;
        material.side = value;
        material.doubleSided = value === 'double';
        material.stateVersion++;
        this.#changed(material.references > 0);
    }

    setBlendMode(name, value) {
        if (!['opaque', 'normal', 'additive'].includes(value)) throw new Error('Blend mode must be opaque, normal or additive');
        const material = this.require(name);
        const mode = value === 'opaque' ? AlphaMode.OPAQUE : AlphaMode.BLEND;
        const blend = value === 'opaque' ? 'normal' : value;
        if (material.blendMode === blend && material.alphaMode === mode && material.depthWrite === (mode === AlphaMode.OPAQUE)) return;
        material.blendMode = blend;
        material.stateVersion++;
        this.setAlphaMode(name, mode);
        this.setDepthWrite(name, mode === AlphaMode.OPAQUE);
        this.#changed(material.references > 0);
    }

    setRenderNumber(name, property, value) {
        const material = this.require(name);
        const number = finite(value, property);
        if (!['renderOrder', 'polygonOffsetFactor', 'polygonOffsetUnits'].includes(property)) throw new Error(`Unknown render property "${property}"`);
        if (Math.abs(number) > 1000000 || (property === 'renderOrder' && !Number.isInteger(number))) throw new Error('Render order must be an integer; render values must be within +/-1000000');
        if (material[property] === number) return;
        material[property] = number;
        material.stateVersion++;
        this.#changed(material.references > 0);
    }

    setEnvironmentFactor(name, property, value) {
        const material = this.#requirePbr(name);
        let number = finite(value, property);
        if (property === 'intensity') {
            if (number < 0 || number > 100) throw new Error('Environment intensity must be in 0..100');
            property = 'environmentIntensity';
        } else if (property === 'rotation') {
            number = ((number % 360) + 360) % 360 * Math.PI / 180;
            property = 'environmentRotation';
        } else throw new Error('Environment factor must be intensity or rotation');
        if (material[property] === number) return;
        material[property] = number;
        material.uniformVersion++;
        this.#changed();
    }

    clone(sourceName, name) {
        this.#assertNameAvailable(name);
        const source = this.require(sourceName);
        const material = this.#create(name, source.type, false, true);
        material.baseColor.set(source.baseColor);
        material.opacity = source.opacity;
        material.emissiveColor.set(source.emissiveColor);
        material.emissiveIntensity = source.emissiveIntensity;
        material.metallic = source.metallic;
        material.roughness = source.roughness;
        material.normalScale = source.normalScale;
        material.aoStrength = source.aoStrength;
        material.doubleSided = source.doubleSided;
        material.depthTest = source.depthTest;
        material.depthWrite = source.depthWrite;
        material.alphaMode = source.alphaMode;
        material.alphaCutoff = source.alphaCutoff;
        for (const property of ['side', 'blendMode', 'renderOrder', 'polygonOffsetFactor', 'polygonOffsetUnits', 'environmentIntensity', 'environmentRotation']) material[property] = source[property];
        if (source.customShader) {
            material.customShader = source.customShader;
            source.customShader.references++;
            material.customUniforms = source.customUniforms.map(field => ({...field, value: field.value instanceof Float32Array ? field.value.slice() : field.value}));
            for (const field of material.customUniforms) if (field.type === 'sampler2D' && field.value >= 0) this.textures?.retain(field.value);
        }
        for (const property of PBR_TEXTURE_PROPERTIES) {
            const textureId = source[property];
            if (textureId < 0) continue;
            this.textures?.retain(textureId);
            material[property] = textureId;
        }
        material.variantVersion++;
        material.uniformVersion++;
        material.stateVersion++;
        this.#changed();
        return material;
    }

    require(name) {
        const material = this.resources.get(name);
        if (!material) throw new Error(`Unknown material "${name}"`);
        return material;
    }

    has(name) {
        return this.resources.has(name);
    }

    resourceForId(id) {
        return this.resourcesById[id] ?? null;
    }

    retain(id) {
        const material = this.resourceForId(id);
        if (!material) throw new Error(`Unknown material ID ${id}`);
        material.references++;
    }

    release(id) {
        const material = this.resourceForId(id);
        if (!material) return;
        material.references = Math.max(0, material.references - 1);
        if (material.internal && material !== this.defaultMaterial && material.references === 0) {
            this.#dispose(material);
        }
    }

    delete(name) {
        const material = this.require(name);
        if (material === this.defaultMaterial) throw new Error('The default material cannot be deleted');
        if (material.references > 0) {
            throw new Error(`Material "${name}" is still used by ${material.references} resource(s)`);
        }
        this.resources.delete(name);
        this.#dispose(material);
    }

    legacyForTexture(textureId) {
        if (textureId < 0) return this.defaultMaterial;
        const existing = this.legacyByTexture.get(textureId);
        if (existing && !existing.disposed) return existing;
        const texture = this.textures?.resourceForId(textureId);
        if (!texture) throw new Error(`Unknown texture ID ${textureId}`);
        const material = this.#create(`texture ${texture.name} (compatibility)`, MaterialType.BASIC_LIT, true, false);
        this.textures?.retain(textureId);
        material.textureId = textureId;
        material.variantVersion++;
        this.legacyByTexture.set(textureId, material);
        this.#changed();
        return material;
    }

    setBaseColor(name, value) {
        const material = this.require(name);
        const next = color(value, 'Base color');
        if (material.baseColor[0] === next[0] && material.baseColor[1] === next[1] &&
            material.baseColor[2] === next[2]) return;
        material.baseColor.set(next);
        material.uniformVersion++;
        this.#changed();
    }

    setOpacity(name, value) {
        const material = this.require(name);
        const next = Math.min(1, Math.max(0, finite(value, 'Opacity')));
        if (material.opacity === next) return;
        material.opacity = next;
        material.uniformVersion++;
        this.#changed();
        if (material.alphaMode === AlphaMode.CUTOUT) this.#shadowChanged(material);
    }

    setTexture(name, textureId) {
        const material = this.require(name);
        if (material.customShader) throw new Error('Custom material textures must be assigned to a declared sampler uniform');
        const changed = this.#setTextureReference(
            material,
            'textureId',
            textureId,
            material.type !== MaterialType.PBR
        );
        if (!changed) return;
        if (material.alphaMode === AlphaMode.CUTOUT) this.#shadowChanged(material);
    }

    setMetallic(name, value) {
        const material = this.#requirePbr(name);
        const next = Math.min(1, Math.max(0, finite(value, 'Metallic')));
        if (material.metallic === next) return;
        material.metallic = next;
        material.uniformVersion++;
        this.#changed();
    }

    setRoughness(name, value) {
        const material = this.#requirePbr(name);
        const next = Math.min(1, Math.max(0.04, finite(value, 'Roughness')));
        if (material.roughness === next) return;
        material.roughness = next;
        material.uniformVersion++;
        this.#changed();
    }

    setNormalScale(name, value) {
        const material = this.#requirePbr(name);
        const next = Math.min(8, Math.max(0, finite(value, 'Normal strength')));
        if (material.normalScale === next) return;
        material.normalScale = next;
        material.uniformVersion++;
        this.#changed();
    }

    setAoStrength(name, value) {
        const material = this.#requirePbr(name);
        const next = Math.min(1, Math.max(0, finite(value, 'AO strength')));
        if (material.aoStrength === next) return;
        material.aoStrength = next;
        material.uniformVersion++;
        this.#changed();
    }

    setPbrMapTexture(name, map, textureId) {
        const material = this.#requirePbr(name);
        const role = String(map).trim().toLowerCase();
        const property = PBR_MAP_PROPERTIES[role];
        if (!property) throw new Error(`Unknown PBR texture role "${map}"`);
        this.#setTextureReference(material, property, textureId, role === PbrMap.NORMAL);
    }

    pbrMapTextureId(name, map) {
        const material = this.#requirePbr(name);
        const role = String(map).trim().toLowerCase();
        const property = PBR_MAP_PROPERTIES[role];
        if (!property) throw new Error(`Unknown PBR texture role "${map}"`);
        return material[property];
    }

    setEmissiveColor(name, value) {
        const material = this.require(name);
        const next = color(value, 'Emissive color');
        if (material.emissiveColor[0] === next[0] && material.emissiveColor[1] === next[1] &&
            material.emissiveColor[2] === next[2]) return;
        material.emissiveColor.set(next);
        material.uniformVersion++;
        this.#changed();
    }

    setEmissiveIntensity(name, value) {
        const material = this.require(name);
        const next = Math.min(100, Math.max(0, finite(value, 'Emissive intensity')));
        if (material.emissiveIntensity === next) return;
        material.emissiveIntensity = next;
        material.uniformVersion++;
        this.#changed();
    }

    setDoubleSided(name, value) {
        this.setSide(name, boolean(value) ? 'double' : 'front');
    }

    setDepthTest(name, value) {
        const material = this.require(name);
        const next = boolean(value);
        if (material.depthTest === next) return;
        material.depthTest = next;
        material.stateVersion++;
        this.#changed(material.references > 0);
    }

    setDepthWrite(name, value) {
        const material = this.require(name);
        const next = boolean(value);
        if (material.depthWrite === next) return;
        material.depthWrite = next;
        material.stateVersion++;
        this.#changed(material.references > 0);
    }

    setAlphaMode(name, value) {
        const normalized = String(value).trim().toLowerCase();
        const nextMode = normalized === 'transparent' ? AlphaMode.BLEND : normalized;
        if (!ALPHA_MODES.has(/** @type {"opaque" | "cutout" | "blend"} */ (nextMode))) {
            throw new Error(`Unknown alpha mode "${value}"`);
        }
        const material = this.require(name);
        if (material.alphaMode === nextMode) return;
        if (material.customShader && nextMode === AlphaMode.CUTOUT) throw new Error('Custom shaders implement discard themselves; use opaque or blend mode');
        material.alphaMode = /** @type {"opaque" | "cutout" | "blend"} */ (nextMode);
        material.variantVersion++;
        this.#changed(material.references > 0);
        this.#shadowChanged(material);
    }

    setAlphaCutoff(name, value) {
        const material = this.require(name);
        const next = Math.min(1, Math.max(0, finite(value, 'Alpha cutoff')));
        if (material.alphaCutoff === next) return;
        material.alphaCutoff = next;
        material.uniformVersion++;
        this.#changed();
        if (material.alphaMode === AlphaMode.CUTOUT) this.#shadowChanged(material);
    }

    clear() {
        for (const material of this.resourcesById) {
            if (!material) continue;
            this.#releaseTextures(material);
            material.disposed = true;
        }
        this.resources.clear();
        this.resourcesById.length = 0;
        this.legacyByTexture.clear();
        this.customShaders?.clear();
        this.nextId = 0;
        this.defaultMaterial = this.#create('default', MaterialType.BASIC_LIT, true, true);
        this.#changed();
    }

    get count() {
        let count = 0;
        for (const material of this.resourcesById) if (material) count++;
        return count;
    }

    #create(name, type, internal, named) {
        const material = new MaterialResource(this.nextId++, name, this.#type(type), internal);
        this.resourcesById[material.id] = material;
        if (named) this.resources.set(name, material);
        return material;
    }

    #dispose(material) {
        this.#releaseTextures(material);
        material.disposed = true;
        this.resourcesById[material.id] = null;
        if (material.textureId >= 0 && this.legacyByTexture.get(material.textureId) === material) {
            this.legacyByTexture.delete(material.textureId);
        }
        this.#changed();
    }

    #releaseTextures(material) {
        for (const property of PBR_TEXTURE_PROPERTIES) {
            if (material[property] >= 0) this.textures?.release(material[property]);
        }
        if (material.customShader) {
            material.customShader.references--;
            for (const field of material.customUniforms) if (field.type === 'sampler2D' && field.value >= 0) this.textures?.release(field.value);
        }
    }

    #assertNameAvailable(name) {
        if (!name) throw new Error('Material name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Material "${name}" already exists`);
    }

    #type(value) {
        const normalized = String(value).trim().toLowerCase();
        if (!MATERIAL_TYPES.has(/** @type {"unlit" | "basic-lit" | "pbr" | "custom"} */ (normalized))) {
            throw new Error(`Unknown material type "${value}"`);
        }
        return /** @type {"unlit" | "basic-lit" | "pbr" | "custom"} */ (normalized);
    }

    #requirePbr(name) {
        const material = this.require(name);
        if (material.type !== MaterialType.PBR) throw new Error(`Material "${name}" is not PBR`);
        return material;
    }

    #setTextureReference(material, property, textureId, affectsVariant) {
        const nextId = Number(textureId);
        if (!Number.isInteger(nextId) || nextId < -1) throw new Error(`Invalid texture ID ${textureId}`);
        if (material[property] === nextId) return false;
        if (nextId >= 0) {
            if (!this.textures?.resourceForId(nextId)) throw new Error(`Unknown texture ID ${nextId}`);
            this.textures.retain(nextId);
        }
        const previousId = material[property];
        if (previousId >= 0) this.textures?.release(previousId);
        material[property] = nextId;
        if (affectsVariant && (previousId >= 0) !== (nextId >= 0)) material.variantVersion++;
        material.uniformVersion++;
        this.#changed(material.references > 0);
        return true;
    }

    #changed(affectsBatch = false) {
        this.version++;
        if (affectsBatch) this.batchVersion++;
        if (this.onChange) this.onChange();
    }

    #shadowChanged(material) {
        if (material.customShader) return;
        if (material.references > 0 && this.onShadowChange) this.onShadowChange(material.id);
    }
}
