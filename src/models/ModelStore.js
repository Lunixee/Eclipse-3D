import {MaterialType, PbrMap} from '../materials/MaterialStore.js';
import {decodeImageBlob} from '../textures/browserTextureSources.js';
import {parseGltf} from './GltfParser.js';
import {identityMatrix} from './modelMath.js';

const errorMessage = error => error instanceof Error ? error.message : String(error);

const FILTERS = Object.freeze({
    9728: 'nearest',
    9729: 'linear',
    9984: 'nearest-mipmap-nearest',
    9985: 'linear-mipmap-nearest',
    9986: 'nearest-mipmap-linear',
    9987: 'linear-mipmap-linear'
});

const WRAPS = Object.freeze({33071: 'clamp', 33648: 'mirror', 10497: 'repeat'});

export class ModelAsset {
    constructor(id, name, key) {
        this.id = id;
        this.name = name;
        this.key = key;
        this.state = 'loading';
        this.error = '';
        this.references = 0;
        this.nodes = [];
        this.nodeOrder = [];
        this.skins = [];
        this.animations = [];
        this.morphTargetCount = 0;
        this.primitives = [];
        this.geometryIds = [];
        this.materialIds = [];
        this.textureIds = [];
        this.sceneCount = 0;
        /** @type {AbortController | null} */
        this.controller = new AbortController();
        this.promise = null;
        this.disposed = false;
        this.cpuBytes = 0;
    }
}

export class ModelStore {
    /**
     * @param {import('../geometry/GeometryStore.js').GeometryStore} geometry
     * @param {import('../materials/MaterialStore.js').MaterialStore} materials
     * @param {import('../textures/TextureStore.js').TextureStore} textures
     * @param {(() => void) | null} [onChange]
     */
    constructor(geometry, materials, textures, onChange = null) {
        this.geometry = geometry;
        this.materials = materials;
        this.textures = textures;
        this.onChange = onChange;
        this.resources = new Map();
        this.resourcesById = [];
        this.nextId = 0;
        this.version = 1;
    }

    load(name, source) {
        if (!name) throw new Error('Model name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Model "${name}" already exists`);
        const asset = new ModelAsset(this.nextId++, name, source.key);
        this.resources.set(name, asset);
        this.resourcesById[asset.id] = asset;
        asset.promise = this.#load(asset, source);
        this.#changed();
        return asset;
    }

    createFromGeometry(name, geometryName, materialName = 'default') {
        if (!String(name).trim()) throw new Error('Model name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Model "${name}" already exists`);
        const geometry = this.geometry.requireCustom(geometryName);
        const material = this.materials.require(materialName);
        const asset = new ModelAsset(this.nextId++, name, `@geometry:${geometry.id}`);
        asset.nodes = [{name, parent: -1, localMatrix: identityMatrix(), baseTranslation: new Float32Array(3),
            baseRotation: new Float32Array([0, 0, 0, 1]), baseScale: new Float32Array([1, 1, 1]), matrixAuthored: true}];
        asset.nodeOrder = [0];
        asset.primitives = [{geometryId: geometry.id, materialId: material.id, nodeIndex: 0, skinIndex: -1,
            morphTargetCount: 0, defaultMorphWeights: null, bounds: geometry.bounds, jointInfluenceBounds: null,
            morphPositionBounds: [], get triangleCount() { return geometry.triangleCount; }}];
        asset.geometryIds = [geometry.id];
        this.geometry.retain(geometry.id);
        this.materials.retain(material.id);
        // materialIds lists asset-created materials to delete, not borrowed named materials.
        asset.state = 'ready';
        asset.controller = null;
        asset.sceneCount = 1;
        Object.defineProperty(asset, 'cpuBytes', {get: () => geometry.vertices.byteLength + (geometry.indices?.byteLength ?? 0)});
        this.resources.set(name, asset);
        this.resourcesById[asset.id] = asset;
        this.#changed();
        return asset;
    }

    async waitUntilReady(asset) {
        await asset.promise;
        if (asset.disposed) throw new Error(`Model "${asset.name}" was deleted while loading`);
        if (asset.state === 'error') throw new Error(asset.error);
        return asset;
    }

    require(name) {
        const asset = this.resources.get(name);
        if (!asset) throw new Error(`Unknown model "${name}"`);
        return asset;
    }

    resourceForId(id) {
        return this.resourcesById[id] ?? null;
    }

    has(name) {
        return this.resources.has(name);
    }

    retain(id) {
        const asset = this.resourceForId(id);
        if (!asset) throw new Error(`Unknown model ID ${id}`);
        if (asset.state !== 'ready') throw new Error(`Model "${asset.name}" is not ready`);
        asset.references++;
    }

    release(id) {
        const asset = this.resourceForId(id);
        if (asset) asset.references = Math.max(0, asset.references - 1);
    }

    delete(name) {
        const asset = this.require(name);
        if (asset.references > 0) throw new Error(`Model "${name}" is still used by ${asset.references} instance(s)`);
        this.resources.delete(name);
        this.resourcesById[asset.id] = null;
        this.#dispose(asset);
        this.#changed();
    }

    clear() {
        for (const asset of this.resources.values()) this.#dispose(asset);
        this.resources.clear();
        this.resourcesById.length = 0;
        this.nextId = 0;
        this.#changed();
    }

    get count() {
        return this.resources.size;
    }

    async #load(asset, source) {
        try {
            const bytes = await source.load(asset.controller.signal);
            if (asset.disposed) return asset;
            const parsed = await parseGltf(bytes, {
                selfContained: source.selfContained === true,
                resolveBytes: uri => source.resolveBytes(uri, asset.controller.signal)
            });
            if (asset.disposed) return asset;
            const textureCache = new Map();
            const textureFor = async info => {
                if (!info) return -1;
                const cacheKey = [
                    info.imageIndex,
                    info.samplerIndex ?? -1,
                    info.role,
                    info.offset.join(','),
                    info.scale.join(','),
                    info.rotation
                ].join(':');
                if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
                const image = parsed.images[info.imageIndex];
                if (!image) throw new Error(`Texture ${info.textureIndex} references an invalid image`);
                const sampler = info.samplerIndex === undefined ? {} : parsed.samplers[info.samplerIndex];
                if (info.samplerIndex !== undefined && !sampler) throw new Error(`Texture ${info.textureIndex} references an invalid sampler`);
                const resourceName = `@model:${asset.id}:texture:${asset.textureIds.length}`;
                const sourceKey = image.bytes ?
                    `${asset.key}:embedded-image:${image.index}` :
                    `${asset.key}:image:${image.uri}`;
                const resource = this.textures.load(resourceName, sourceKey, async signal => {
                    if (image.bytes) return decodeImageBlob(new Blob([image.bytes], {type: image.mimeType || 'application/octet-stream'}), null, signal);
                    return source.resolveImage(image.uri, image.mimeType, signal);
                });
                // Record ownership before yielding so failure/reset can release partial imports.
                asset.textureIds.push(resource.id);
                await this.textures.waitUntilReady(resource);
                if (asset.disposed) throw new Error('Model load was aborted');
                this.textures.setOption(resourceName, 'flip-y', false);
                this.textures.setOption(resourceName, 'color-space', info.role === 'color' ? 'srgb' : 'linear');
                this.textures.setOption(resourceName, 'wrap-u', WRAPS[sampler.wrapS ?? 10497] ?? 'repeat');
                this.textures.setOption(resourceName, 'wrap-v', WRAPS[sampler.wrapT ?? 10497] ?? 'repeat');
                this.textures.setOption(resourceName, 'mag-filter', FILTERS[sampler.magFilter ?? 9729] ?? 'linear');
                const minimumFilter = sampler.minFilter ?? 9729;
                this.textures.setOption(resourceName, 'min-filter', FILTERS[minimumFilter] ?? 'linear');
                this.textures.setOption(resourceName, 'mipmaps', minimumFilter >= 9984);
                const cosine = Math.cos(info.rotation);
                const sine = Math.sin(info.rotation);
                const halfX = info.scale[0] * 0.5;
                const halfY = info.scale[1] * 0.5;
                this.textures.setUV(
                    resourceName,
                    info.offset[0] + cosine * halfX - sine * halfY - 0.5,
                    info.offset[1] + sine * halfX + cosine * halfY - 0.5,
                    info.scale[0],
                    info.scale[1],
                    info.rotation
                );
                textureCache.set(cacheKey, resource.id);
                return resource.id;
            };
            for (let index = 0; index < parsed.materials.length; index++) {
                const descriptor = parsed.materials[index];
                const name = `@model:${asset.id}:material:${index}`;
                const material = this.materials.create(name, descriptor.unlit ? MaterialType.UNLIT : MaterialType.PBR);
                asset.materialIds.push(material.id);
                this.materials.setBaseColor(name, descriptor.baseColorFactor.slice(0, 3));
                this.materials.setOpacity(name, descriptor.baseColorFactor[3] ?? 1);
                this.materials.setDoubleSided(name, descriptor.doubleSided);
                if (descriptor.alphaMode === 'MASK') {
                    this.materials.setAlphaMode(name, 'cutout');
                    this.materials.setAlphaCutoff(name, descriptor.alphaCutoff);
                }
                if (descriptor.alphaMode === 'BLEND') {
                    this.materials.setAlphaMode(name, 'blend');
                    this.materials.setDepthWrite(name, false);
                }
                if (!descriptor.unlit) {
                    this.materials.setMetallic(name, descriptor.metallicFactor);
                    this.materials.setRoughness(name, descriptor.roughnessFactor);
                }
                this.materials.setEmissiveColor(name, descriptor.emissiveFactor);
                this.materials.setEmissiveIntensity(name, descriptor.emissiveFactor.some(value => value > 0) ? 1 : 0);
                const baseColorId = await textureFor(descriptor.textures.baseColor);
                if (asset.disposed) return asset;
                if (baseColorId >= 0) this.materials.setTexture(name, baseColorId);
                if (!descriptor.unlit) {
                    const combinedId = await textureFor(descriptor.textures.metallicRoughness);
                    if (asset.disposed) return asset;
                    if (combinedId >= 0) this.materials.setPbrMapTexture(name, PbrMap.METALLIC_ROUGHNESS, combinedId);
                    const normalId = await textureFor(descriptor.textures.normal);
                    if (asset.disposed) return asset;
                    if (normalId >= 0) {
                        this.materials.setPbrMapTexture(name, PbrMap.NORMAL, normalId);
                        this.materials.setNormalScale(name, descriptor.textures.normal.strength);
                    }
                    const aoId = await textureFor(descriptor.textures.occlusion);
                    if (asset.disposed) return asset;
                    if (aoId >= 0) {
                        this.materials.setPbrMapTexture(name, PbrMap.AO, aoId);
                        this.materials.setAoStrength(name, descriptor.textures.occlusion.strength);
                    }
                    const emissiveId = await textureFor(descriptor.textures.emissive);
                    if (asset.disposed) return asset;
                    if (emissiveId >= 0) this.materials.setPbrMapTexture(name, PbrMap.EMISSIVE, emissiveId);
                }
            }
            for (const descriptor of parsed.geometries) {
                const geometry = this.geometry.create(`${asset.key}:${descriptor.key}`, descriptor);
                this.geometry.retain(geometry.id);
                asset.geometryIds.push(geometry.id);
                asset.cpuBytes += geometry.vertices.byteLength + (geometry.skinVertices?.byteLength ?? 0) +
                    (geometry.indices?.byteLength ?? 0);
            }
            const fallbackMaterialId = this.materials.defaultMaterial.id;
            asset.nodes = parsed.nodes;
            asset.nodeOrder = parsed.nodeOrder;
            asset.skins = parsed.skins;
            asset.animations = parsed.animations;
            asset.morphTargetCount = parsed.morphTargetCount;
            const immutableArrays = new Set();
            for (const skin of asset.skins) immutableArrays.add(skin.inverseBindMatrices);
            for (const clip of asset.animations) {
                for (const sampler of clip.samplers) immutableArrays.add(sampler.input);
                for (const channel of clip.channels) immutableArrays.add(channel.sampler.output);
            }
            for (const descriptor of parsed.geometries) {
                for (const target of descriptor.morphTargets) {
                    for (const values of Object.values(target)) immutableArrays.add(values);
                }
            }
            for (const values of immutableArrays) asset.cpuBytes += values.byteLength;
            asset.primitives = parsed.primitives.map(primitive => {
                const geometry = this.geometry.resourceForId(asset.geometryIds[primitive.geometryIndex]);
                return {
                    geometryId: geometry.id,
                    materialId: primitive.materialIndex < 0 ? fallbackMaterialId : asset.materialIds[primitive.materialIndex],
                    nodeIndex: primitive.nodeIndex,
                    skinIndex: primitive.skinIndex,
                    morphTargetCount: primitive.morphTargetCount,
                    defaultMorphWeights: primitive.defaultMorphWeights,
                    bounds: geometry.bounds,
                    jointInfluenceBounds: geometry.jointInfluenceBounds,
                    morphPositionBounds: geometry.morphPositionBounds,
                    triangleCount: geometry.triangleCount
                };
            });
            for (const materialId of new Set(asset.primitives.map(primitive => primitive.materialId))) {
                this.materials.retain(materialId);
            }
            asset.sceneCount = parsed.sceneCount;
            asset.state = 'ready';
            asset.controller = null;
            this.#changed();
            return asset;
        } catch (error) {
            this.#releaseResources(asset);
            if (asset.disposed) return asset;
            asset.state = 'error';
            asset.error = errorMessage(error);
            asset.controller = null;
            this.#changed();
            return asset;
        }
    }

    #dispose(asset) {
        if (asset.disposed) return;
        asset.disposed = true;
        asset.controller?.abort();
        asset.controller = null;
        this.#releaseResources(asset);
    }

    #releaseResources(asset) {
        for (const materialId of new Set(asset.primitives.map(primitive => primitive.materialId))) {
            this.materials.release(materialId);
        }
        for (const materialId of asset.materialIds) {
            const material = this.materials.resourceForId(materialId);
            if (material && material.references === 0) this.materials.delete(material.name);
        }
        for (const textureId of asset.textureIds) {
            const texture = this.textures.resourceForId(textureId);
            if (texture && texture.references === 0) this.textures.delete(texture.name);
        }
        for (const geometryId of asset.geometryIds) this.geometry.release(geometryId);
        asset.primitives.length = 0;
        asset.materialIds.length = 0;
        asset.textureIds.length = 0;
        asset.geometryIds.length = 0;
        asset.nodes.length = 0;
        asset.nodeOrder.length = 0;
        asset.skins.length = 0;
        asset.animations.length = 0;
        asset.morphTargetCount = 0;
    }

    #changed() {
        this.version++;
        this.onChange?.();
    }
}
