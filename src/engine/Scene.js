import {ObjectKind} from '../constants.js';
import {AlphaMode, MaterialStore, MaterialType} from '../materials/MaterialStore.js';
import {InstanceGroup} from './InstanceGroup.js';
import {ModelInstance} from '../models/ModelInstance.js';
import {ObjectStore} from './ObjectStore.js';
import {VisibilitySystem} from '../visibility/VisibilitySystem.js';
import {EffectKind, EffectStore} from '../effects/EffectStore.js';
import {basisFromEuler, CameraMatrixCache, lookAtEuler} from '../game/CameraMath.js';
import {TweenProperty, TweenStore} from '../game/TweenStore.js';
import {Raycaster} from '../game/Raycaster.js';
import {TerrainStore} from '../terrain/TerrainStore.js';
import {TextStore} from '../text/TextStore.js';
import {PhysicsWorld} from '../physics/PhysicsWorld.js';
import {composeEulerTrs, identityMatrix, invertMatrix, transformPoint} from '../models/modelMath.js';
import {
    DEFAULT_DIRECTIONAL_SHADOW,
    normalizeShadowSetting,
    SHADOW_QUALITIES,
    SHADOW_QUALITY_PRESETS
} from './shadows.js';

const requireFloat32Vector = (x, y, z, label) => {
    if (!Number.isFinite(Math.fround(x)) || !Number.isFinite(Math.fround(y)) || !Number.isFinite(Math.fround(z))) {
        throw new Error(`${label} exceeds the WebGL float32 range`);
    }
};

export class Scene {
    /**
     * @param {string} name
     * @param {import('../textures/TextureStore.js').TextureStore | null} [textures]
     * @param {MaterialStore | null} [materials]
     * @param {import('../environments/EnvironmentStore.js').EnvironmentStore | null} [environments]
     * @param {import('../lights/LightStore.js').LightStore | null} [lights]
     * @param {import('../models/ModelStore.js').ModelStore | null} [models]
     * @param {import('../visibility/LodStore.js').LodStore | null} [lods]
     */
    constructor(name, textures = null, materials = null, environments = null, lights = null, models = null, lods = null) {
        this.name = name;
        this.textures = textures;
        this.materials = materials ?? new MaterialStore(
            textures,
            null,
            materialId => this.invalidateMaterialShadows(materialId)
        );
        this.ownsMaterials = materials === null;
        this.environments = environments;
        this.lights = lights;
        this.models = models;
        this.lods = lods;
        this.localLightIds = new Set();
        this.environmentId = -1;
        /** @type {PhysicsWorld | null} */
        this.physics = null;
        /** @type {import('../audio/SceneAudio.js').SceneAudio | null} */
        this.audio = null;
        this.objects = new ObjectStore(undefined, (id, removed) => {
            this.visibility?.markObject(id, removed);
            if (this.physics || this.audio) this.notifyAttachment(this.objects.namesById[id], removed);
        });
        this.instanceGroups = new Map();
        this.modelInstances = new Map();
        this.lodModelInstances = new Set();
        this.visibility = new VisibilitySystem(this);
        this.terrains = new TerrainStore(this.models?.geometry ?? null, this.materials);
        this.effects = new EffectStore(
            this.textures,
            () => {
                this.version++;
            },
            (effect, removed) => this.visibility.markEffect(effect, removed)
        );
        this.texts = new TextStore(this.textures, this.effects);
        this.cameraMatrixCaches = new Map();
        this.basisScratch = {
            right: new Float32Array(3),
            up: new Float32Array(3),
            forward: new Float32Array(3)
        };
        this.lookAtScratch = new Float32Array(3);
        this.lookAtTargetScratch = new Float32Array(3);
        this.lookAtPositionScratch = new Float32Array(3);
        this.lookAtRotationScratch = new Float32Array(3);
        this.resourceTransformScratch = {
            position: this.objects.position,
            rotation: this.objects.rotation,
            scale: this.objects.scale,
            offset: 0
        };
        this.apiMatrixScratch = identityMatrix();
        this.apiInverseMatrixScratch = identityMatrix();
        this.apiVectorScratch = new Float32Array(3);
        this.tweens = new TweenStore(this);
        this.raycaster = new Raycaster(this);
        this.frustumCullingEnabled = true;
        this.lodVersion = 1;
        this.lastLodVersion = -1;
        this.lastLodCamera = new Float32Array([NaN, NaN, NaN]);
        this.lodMetrics = {evaluations: 0, switches: 0, levelCounts: new Int32Array(16), reused: 0};
        this.activeCameraId = null;
        this.background = new Float32Array([0.03, 0.04, 0.07, 1]);
        this.ambientColor = new Float32Array([1, 1, 1]);
        this.ambientIntensity = 0.03;
        this.shadowsEnabled = false;
        this.shadowQuality = 'off';
        this.shadowDefaults = {...DEFAULT_DIRECTIONAL_SHADOW};
        this.instanceVersion = 1;
        this.shadowVersion = 1;
        this.version = 1;
    }

    ensurePhysics() {
        return this.physics ??= new PhysicsWorld(this);
    }

    requireAttachmentTarget(name) {
        if (this.modelInstances.has(name)) return;
        const id = this.objects.idFor(name);
        if (id !== undefined && this.objects.kinds[id] === ObjectKind.CUBE) return;
        throw new Error(`Attachment target "${name}" must be a cube or model instance`);
    }

    // Reusable descriptor; callers must not retain it across another query.
    attachmentTransform(name) {
        this.requireAttachmentTarget(name);
        return this.#resourceTransform(name);
    }

    notifyAttachment(name, removed = false) {
        this.physics?.markAttached(name, removed);
        this.audio?.markAttached(name, removed);
    }

    createCube(name) {
        this.#assertResourceNameAvailable(name);
        const id = this.objects.create(name, ObjectKind.CUBE);
        this.materials.retain(this.materials.defaultMaterial.id);
        this.version++;
        return id;
    }

    createCamera(name, fieldOfView = 60, near = 0.1, far = 1000) {
        this.#assertResourceNameAvailable(name);
        const id = this.objects.create(name, ObjectKind.CAMERA);
        this.objects.setCameraProjection(id, fieldOfView, near, far);
        this.activeCameraId = id;
        this.version++;
        return id;
    }

    requireCamera(name) {
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CAMERA) throw new Error(`Resource "${name}" is not a camera`);
        return id;
    }

    setActiveCamera(name) {
        const id = this.requireCamera(name);
        if (this.activeCameraId === id) return;
        this.activeCameraId = id;
        this.version++;
    }

    setCameraProjection(name, fieldOfView, near = null, far = null) {
        const id = this.requireCamera(name);
        const offset = id * 3;
        this.objects.setCameraProjection(
            id,
            fieldOfView ?? this.objects.camera[offset],
            near ?? this.objects.camera[offset + 1],
            far ?? this.objects.camera[offset + 2]
        );
    }

    cameraMatrices(cameraId, width, height) {
        const id = cameraId ?? this.activeCameraId;
        if (id === null || id === undefined) throw new Error('Create and activate a camera before using camera utilities');
        let cache = this.cameraMatrixCaches.get(id);
        if (!cache) {
            cache = new CameraMatrixCache();
            this.cameraMatrixCaches.set(id, cache);
        }
        return cache.update(this.objects, id, width, height);
    }

    createDirectionalLight(name, intensity = 1) {
        this.#assertResourceNameAvailable(name);
        const id = this.objects.create(name, ObjectKind.DIRECTIONAL_LIGHT);
        this.objects.intensity[id] = intensity;
        this.#applyShadowSettings(id, this.shadowDefaults);
        this.version++;
        return id;
    }

    setDirectionalLight(name, color, intensity) {
        const id = this.#requireDirectionalLight(name);
        if (color.length < 3 || color.some(value => !Number.isFinite(value))) {
            throw new Error('Directional-light color must contain three finite values');
        }
        if (!Number.isFinite(intensity) || intensity < 0) {
            throw new Error('Light intensity must be a non-negative finite number');
        }
        this.objects.setColor(id, color[0], color[1], color[2], 1);
        this.objects.setIntensity(id, intensity);
    }

    setAmbientLight(color, intensity) {
        const nextIntensity = Number(intensity);
        if (!Number.isFinite(nextIntensity) || nextIntensity < 0) {
            throw new Error('Ambient intensity must be a non-negative finite number');
        }
        if (color.length < 3 || color.some(value => !Number.isFinite(value))) {
            throw new Error('Ambient color must contain three finite values');
        }
        this.ambientColor.set(color);
        this.ambientIntensity = Math.min(nextIntensity, 1000);
        this.version++;
    }

    setBackground(color, opacity = 1) {
        const values = [color?.[0], color?.[1], color?.[2], opacity].map(Number);
        if (values.some(value => !Number.isFinite(value)) || values.some(value => value < 0 || value > 1)) {
            throw new Error('Scene background channels must be finite values in 0..1');
        }
        if (values.every((value, component) => this.background[component] === Math.fround(value))) return;
        this.background.set(values);
        this.version++;
    }

    createPointLight(name) {
        if (!this.lights) throw new Error('Local-light resources are unavailable');
        const light = this.lights.createPoint(name, this);
        this.localLightIds.add(light.id);
        this.version++;
        return light;
    }

    createSpotLight(name) {
        if (!this.lights) throw new Error('Local-light resources are unavailable');
        const light = this.lights.createSpot(name, this);
        this.localLightIds.add(light.id);
        this.version++;
        return light;
    }

    requireLocalLight(name) {
        if (!this.lights) throw new Error('Local-light resources are unavailable');
        return this.lights.require(name, this);
    }

    deleteLocalLight(name) {
        const light = this.requireLocalLight(name);
        this.localLightIds.delete(light.id);
        this.lights?.delete(name, this);
        this.version++;
    }

    get enabledLocalLightCount() {
        if (!this.lights) return 0;
        let count = 0;
        for (const id of this.localLightIds) {
            const light = this.lights.resourceForId(id);
            if (light?.enabled && light.range > 0 && light.intensity > 0) count++;
        }
        return count;
    }

    setEnvironment(environmentId) {
        if (!this.environments) throw new Error('Environment resources are unavailable');
        if (environmentId === this.environmentId) return;
        if (environmentId >= 0 && !this.environments.resourceForId(environmentId)) {
            throw new Error(`Unknown environment ID ${environmentId}`);
        }
        this.environments.retain(environmentId);
        this.environments.release(this.environmentId);
        this.environmentId = environmentId;
        this.version++;
    }

    clearEnvironment() {
        if (this.environmentId < 0) return;
        this.environments?.release(this.environmentId);
        this.environmentId = -1;
        this.version++;
    }

    get environment() {
        return this.environments?.resourceForId(this.environmentId) ?? null;
    }

    createCubeInstances(name, count, spacing = 1.5) {
        this.#assertResourceNameAvailable(name);
        const group = new InstanceGroup(name, count, (affectsShadow, boundsChanged, instanceIndex) => {
            this.version++;
            this.instanceVersion++;
            if (affectsShadow) this.shadowVersion++;
            if (boundsChanged) this.visibility.markGroup(group, instanceIndex);
        });
        group.setGrid(spacing);
        this.materials.retain(this.materials.defaultMaterial.id);
        this.instanceGroups.set(name, group);
        this.visibility.markGroup(group);
        this.version++;
        this.instanceVersion++;
        this.shadowVersion++;
        return group;
    }

    createModelInstance(name, modelName) {
        if (!this.models) throw new Error('Model resources are unavailable');
        this.#assertResourceNameAvailable(name);
        const asset = this.models.require(modelName);
        this.models.retain(asset.id);
        const instance = new ModelInstance(name, asset, (affectsShadow, boundsChanged) => {
            this.version++;
            this.instanceVersion++;
            if (affectsShadow) this.shadowVersion++;
            if (boundsChanged) {
                this.visibility.markModel(instance);
                this.lodVersion++;
            }
        }, () => {
            if (this.physics || this.audio) this.notifyAttachment(name);
        });
        this.modelInstances.set(name, instance);
        this.visibility.markModel(instance);
        this.version++;
        this.instanceVersion++;
        this.shadowVersion++;
        return instance;
    }

    createTerrain(name, width, depth, segmentsX, segmentsZ) {
        this.#assertResourceNameAvailable(name);
        let terrain;
        terrain = this.terrains.create(name, width, depth, segmentsX, segmentsZ,
            (affectsShadow, boundsChanged) => {
                this.version++;
                this.instanceVersion++;
                if (affectsShadow) this.shadowVersion++;
                if (boundsChanged) this.visibility.markTerrain(terrain);
            });
        this.visibility.markTerrain(terrain);
        this.version++;
        this.instanceVersion++;
        this.shadowVersion++;
        return terrain;
    }

    flushTerrainGeometry() {
        return this.terrains.flushDirty();
    }

    createSprite(name, textureName) {
        this.#assertResourceNameAvailable(name);
        const texture = this.textures?.require(textureName);
        if (!texture) throw new Error('Texture resources are unavailable');
        return this.effects.createSprite(name, texture.id);
    }

    createParticleEmitter(name, textureName, maximumParticles = 1000) {
        this.#assertResourceNameAvailable(name);
        const texture = this.textures?.require(textureName);
        if (!texture) throw new Error('Texture resources are unavailable');
        return this.effects.createEmitter(name, texture.id, maximumParticles);
    }

    createDecal(name, textureName) {
        this.#assertResourceNameAvailable(name);
        const texture = this.textures?.require(textureName);
        if (!texture) throw new Error('Texture resources are unavailable');
        return this.effects.createDecal(name, texture.id);
    }

    createText(name, text, options = {}) {
        this.#assertResourceNameAvailable(name);
        return this.texts.create(name, text, options);
    }

    deleteResource(name) {
        if (this.physics || this.audio) this.notifyAttachment(name, true);
        this.tweens.stop(name);
        if (this.texts.delete(name)) return true;
        const terrain = this.terrains.resources.get(name);
        if (terrain) {
            this.visibility.removeTerrain(terrain);
            const affectedShadow = terrain.visible && terrain.castsShadow;
            this.terrains.delete(name);
            this.version++;
            this.instanceVersion++;
            if (affectedShadow) this.shadowVersion++;
            return true;
        }
        if (this.effects.delete(name)) return true;
        const model = this.modelInstances.get(name);
        if (model) {
            this.visibility.removeModel(model);
            if (model.lodGroup) {
                this.lods?.release(model.lodGroup.id);
                this.lodModelInstances.delete(model);
            }
            if (model.materialOverrideId >= 0) this.materials.release(model.materialOverrideId);
            this.models?.release(model.asset.id);
            this.modelInstances.delete(name);
            this.version++;
            this.instanceVersion++;
            if (model.visible && model.castsShadow) this.shadowVersion++;
            return true;
        }
        const group = this.instanceGroups.get(name);
        if (group) {
            this.visibility.removeGroup(group);
            const affectedShadow = group.visible && group.castsShadow;
            this.materials.release(group.materialId);
            this.instanceGroups.delete(name);
            this.version++;
            this.instanceVersion++;
            if (affectedShadow) this.shadowVersion++;
            return true;
        }
        const id = this.objects.idFor(name);
        if (id !== undefined && this.objects.kinds[id] === ObjectKind.CUBE) {
            this.materials.release(this.objects.materialIds[id]);
        }
        if (id === this.activeCameraId) this.activeCameraId = null;
        const deleted = this.objects.delete(name);
        if (deleted) this.cameraMatrixCaches.delete(id);
        if (deleted) this.version++;
        return deleted;
    }

    setResourceTexture(name, textureId) {
        if (this.texts.labels.has(name)) throw new Error(`3D text "${name}" owns a cached raster texture; use the text style blocks`);
        const effect = this.effects.resources.get(name);
        if (effect) return effect.setTexture(textureId);
        const group = this.instanceGroups.get(name);
        const model = this.modelInstances.get(name);
        const terrain = this.terrains.resources.get(name);
        if (!group && !model && !terrain) {
            const id = this.objects.requireId(name);
            if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot use a texture`);
        }
        this.setResourceMaterial(name, this.materials.legacyForTexture(textureId).id);
    }

    setResourceMaterial(name, materialId) {
        if (this.effects.resources.has(name)) {
            throw new Error(`Effect resource "${name}" uses its texture, tint, lighting, and alpha settings directly`);
        }
        const material = this.materials.resourceForId(materialId);
        if (!material) throw new Error(`Unknown material ID ${materialId}`);
        const group = this.instanceGroups.get(name);
        if (group) {
            if (group.materialId === materialId) return;
            this.materials.retain(materialId);
            this.materials.release(group.materialId);
            group.setMaterial(materialId);
            if (group.visible && group.castsShadow) this.shadowVersion++;
            return;
        }
        const terrain = this.terrains.resources.get(name);
        if (terrain) {
            this.terrains.setMaterial(name, materialId);
            return;
        }
        const model = this.modelInstances.get(name);
        if (model) {
            if (model.materialOverrideId === materialId) return;
            if (material.customShader && model.asset.skins.length > 0) throw new Error('Custom shader contract v1 does not support skinned models');
            this.materials.retain(materialId);
            if (model.materialOverrideId >= 0) this.materials.release(model.materialOverrideId);
            model.setMaterialOverride(materialId);
            return;
        }
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot use a material`);
        const previous = this.objects.materialIds[id];
        if (previous === materialId) return;
        this.materials.retain(materialId);
        this.materials.release(previous);
        this.objects.setMaterial(id, materialId);
        this.version++;
        if (this.objects.visible[id] && this.objects.castsShadow[id]) this.shadowVersion++;
    }

    materialNameOf(name) {
        if (this.effects.resources.has(name)) return '';
        const group = this.instanceGroups.get(name);
        let materialId;
        if (group) {
            materialId = group.materialId;
        } else if (this.terrains.resources.has(name)) {
            const terrain = this.terrains.require(name);
            materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : terrain.baseMaterialId;
        } else if (this.modelInstances.has(name)) {
            const model = this.modelInstances.get(name);
            if (model.materialOverrideId < 0) return '';
            materialId = model.materialOverrideId;
        } else {
            const id = this.objects.requireId(name);
            if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot use a material`);
            materialId = this.objects.materialIds[id];
        }
        return this.materials.resourceForId(materialId)?.name ?? '';
    }

    setShadowsEnabled(enabled) {
        const next = Boolean(enabled);
        if (next && this.shadowQuality === 'off') this.setShadowQuality('medium');
        if (this.shadowsEnabled === next) return;
        this.shadowsEnabled = next;
        this.version++;
    }

    setShadowQuality(quality) {
        const normalized = String(quality).toLowerCase();
        if (!SHADOW_QUALITIES.has(normalized)) throw new Error(`Unknown shadow quality "${quality}"`);
        if (normalized === 'off') {
            this.shadowQuality = 'off';
            this.shadowsEnabled = false;
            this.version++;
            return;
        }
        this.shadowQuality = normalized;
        this.shadowsEnabled = true;
        const preset = SHADOW_QUALITY_PRESETS[normalized];
        if (preset) {
            Object.assign(this.shadowDefaults, preset);
            for (let denseIndex = 0; denseIndex < this.objects.count; denseIndex++) {
                const id = this.objects.denseIds[denseIndex];
                if (this.objects.kinds[id] === ObjectKind.DIRECTIONAL_LIGHT) this.#applyShadowSettings(id, preset);
            }
        }
        this.version++;
    }

    setLightCastsShadow(name, castsShadow) {
        this.objects.setCastsShadow(this.#requireDirectionalLight(name), castsShadow);
    }

    setResourceCastsShadow(name, castsShadow) {
        if (this.effects.resources.has(name)) {
            if (castsShadow) {
                throw new Error('Sprites, particles, and decals do not cast shadow maps');
            }
            return;
        }
        const group = this.instanceGroups.get(name);
        if (group) {
            group.setCastsShadow(castsShadow);
            return;
        }
        const terrain = this.terrains.resources.get(name);
        if (terrain) {
            terrain.setCastsShadow(castsShadow);
            return;
        }
        const model = this.modelInstances.get(name);
        if (model) {
            model.setCastsShadow(castsShadow);
            return;
        }
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot cast shadows`);
        this.objects.setCastsShadow(id, castsShadow);
    }

    setResourceReceivesShadow(name, receivesShadow) {
        if (this.effects.resources.has(name)) {
            if (receivesShadow) {
                throw new Error('Sprites, particles, and decals do not sample shadow maps');
            }
            return;
        }
        const group = this.instanceGroups.get(name);
        if (group) {
            group.setReceivesShadow(receivesShadow);
            return;
        }
        const terrain = this.terrains.resources.get(name);
        if (terrain) {
            terrain.setReceivesShadow(receivesShadow);
            return;
        }
        const model = this.modelInstances.get(name);
        if (model) {
            model.setReceivesShadow(receivesShadow);
            return;
        }
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot receive shadows`);
        this.objects.setReceivesShadow(id, receivesShadow);
    }

    setFrustumCulling(enabled) {
        const next = Boolean(enabled);
        if (this.frustumCullingEnabled === next) return;
        this.frustumCullingEnabled = next;
        this.version++;
        this.instanceVersion++;
    }

    setResourceFrustumCulling(name, enabled) {
        const effect = this.effects.resources.get(name);
        if (effect) return effect.setFrustumCulling(enabled);
        const group = this.instanceGroups.get(name);
        if (group) return group.setFrustumCulling(enabled);
        const terrain = this.terrains.resources.get(name);
        if (terrain) return terrain.setFrustumCulling(enabled);
        const model = this.modelInstances.get(name);
        if (model) return model.setFrustumCulling(enabled);
        this.objects.setFrustumCulling(this.objects.requireId(name), enabled);
    }

    assignLodGroup(instanceName, groupName) {
        if (!this.lods) throw new Error('LOD resources are unavailable');
        const model = this.modelInstances.get(instanceName);
        if (!model) throw new Error(`Unknown model instance "${instanceName}"`);
        const group = this.lods.require(groupName);
        if (model.lodGroup === group) return;
        const previous = model.lodGroup;
        model.assignLodGroup(group);
        if (previous) this.lods.release(previous.id);
        this.lods.retain(group.id);
        this.lodModelInstances.add(model);
        this.lodVersion++;
        this.version++;
        this.instanceVersion++;
    }

    clearLodGroup(instanceName) {
        const model = this.modelInstances.get(instanceName);
        if (!model) throw new Error(`Unknown model instance "${instanceName}"`);
        const group = model.lodGroup;
        if (!group) return;
        model.clearLodGroup();
        this.lods?.release(group.id);
        this.lodModelInstances.delete(model);
        this.lodVersion++;
        this.version++;
        this.instanceVersion++;
    }

    setLodEnabled(instanceName, enabled) {
        const model = this.modelInstances.get(instanceName);
        if (!model) throw new Error(`Unknown model instance "${instanceName}"`);
        model.setLodEnabled(enabled);
        this.lodVersion++;
        this.version++;
        this.instanceVersion++;
    }

    setLodHysteresis(instanceName, value) {
        const model = this.modelInstances.get(instanceName);
        if (!model) throw new Error(`Unknown model instance "${instanceName}"`);
        model.setLodHysteresis(value);
        this.lodVersion++;
    }

    setForcedLodLevel(instanceName, value) {
        const model = this.modelInstances.get(instanceName);
        if (!model) throw new Error(`Unknown model instance "${instanceName}"`);
        model.setForcedLodLevel(value);
        this.lodVersion++;
        this.version++;
        this.instanceVersion++;
    }

    updateLods(cameraX, cameraY, cameraZ) {
        const metrics = this.lodMetrics;
        metrics.levelCounts.fill(0);
        metrics.evaluations = 0;
        metrics.switches = 0;
        metrics.reused = 0;
        if (this.lastLodVersion === this.lodVersion && this.lastLodCamera[0] === cameraX &&
            this.lastLodCamera[1] === cameraY && this.lastLodCamera[2] === cameraZ) {
            metrics.reused = 1;
            for (const model of this.lodModelInstances) metrics.levelCounts[model.currentLodLevel]++;
            return metrics;
        }
        for (const model of this.lodModelInstances) {
            metrics.evaluations++;
            if (model.evaluateLod(cameraX, cameraY, cameraZ)) metrics.switches++;
            metrics.levelCounts[model.currentLodLevel]++;
        }
        this.lastLodCamera[0] = cameraX;
        this.lastLodCamera[1] = cameraY;
        this.lastLodCamera[2] = cameraZ;
        this.lastLodVersion = this.lodVersion;
        return metrics;
    }

    resourceFrustumCulling(name) {
        const effect = this.effects.resources.get(name);
        if (effect) return effect.frustumCulling;
        const group = this.instanceGroups.get(name);
        if (group) return group.frustumCulling;
        const terrain = this.terrains.resources.get(name);
        if (terrain) return terrain.frustumCulling;
        const model = this.modelInstances.get(name);
        if (model) return model.frustumCulling;
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" cannot use frustum culling`);
        return Boolean(this.objects.frustumCulling[id]);
    }

    setLightShadowSetting(name, setting, value) {
        const id = this.#requireDirectionalLight(name);
        const normalized = normalizeShadowSetting(setting, value);
        if (setting === 'near' && normalized >= this.objects.shadowFar[id]) {
            throw new Error('Shadow camera near plane must be less than its far plane');
        }
        if (setting === 'far' && normalized <= this.objects.shadowNear[id]) {
            throw new Error('Shadow camera far plane must be greater than its near plane');
        }
        this.objects.setShadowSetting(id, setting, normalized);
        this.shadowDefaults[setting] = normalized;
        if (this.shadowQuality !== 'off') this.shadowQuality = 'custom';
    }

    shadowMapSizeOf(name) {
        return this.objects.shadowMapSize[this.#requireDirectionalLight(name)];
    }

    invalidateMaterialShadows(materialId) {
        if (this.#hasShadowCaster(material => material.id === materialId)) this.shadowVersion++;
    }

    invalidateGeometry(resource, boundsChanged, positionsChanged) {
        // Only geometry commands visit this dependency path. Cached frames and
        // uniform/camera changes never scan the scene for geometry consumers.
        for (const model of this.modelInstances.values()) {
            let activeChanged = false;
            if (model.asset.geometryIds.includes(resource.id)) {
                if (boundsChanged) model.refreshGeometryBounds(false, !model.activeLodInstance);
                activeChanged = !model.activeLodInstance;
            }
            for (const lod of model.lodInstances.values()) {
                if (!lod.asset.geometryIds.includes(resource.id)) continue;
                if (boundsChanged) lod.refreshGeometryBounds(false);
                if (model.activeLodInstance === lod) {
                    activeChanged = true;
                    if (boundsChanged) {
                        this.visibility.markModel(model);
                        this.instanceVersion++;
                        this.version++;
                    }
                }
            }
            if (activeChanged && positionsChanged && model.visible && model.castsShadow) {
                for (const item of model.activeRenderItems) {
                    if (item.primitive.geometryId !== resource.id) continue;
                    const material = this.materials.resourceForId(model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId);
                    if (material && material.type !== MaterialType.CUSTOM && material.alphaMode !== AlphaMode.BLEND) {
                        this.shadowVersion++;
                        break;
                    }
                }
            }
        }
    }

    invalidateTextureShadows(textureId) {
        if (this.#hasShadowCaster(material => material.alphaMode === AlphaMode.CUTOUT &&
            (textureId === null || material.textureId === textureId))) this.shadowVersion++;
    }

    updateAnimations(deltaSeconds) {
        const metrics = {
            activePlayers: 0,
            sampledChannels: 0,
            samplingTime: 0,
            hierarchyUpdates: 0,
            jointPalettesUpdated: 0,
            changed: false
        };
        for (const model of this.modelInstances.values()) {
            if (model.player.playing && !model.player.paused) metrics.activePlayers++;
            if (!model.advance(deltaSeconds)) continue;
            metrics.changed = true;
            metrics.sampledChannels += model.lastSampledChannels;
            metrics.samplingTime += model.lastSamplingTime;
            metrics.hierarchyUpdates += model.lastHierarchyUpdates;
            metrics.jointPalettesUpdated += model.lastPaletteUpdates;
        }
        return metrics;
    }

    updateEffects(deltaSeconds) {
        return this.effects.update(deltaSeconds);
    }

    updateTweens(deltaSeconds) {
        return this.tweens.update(deltaSeconds);
    }

    dispose() {
        this.physics?.dispose();
        this.physics = null;
        this.audio?.dispose();
        this.audio = null;
        this.environments?.release(this.environmentId);
        this.environmentId = -1;
        for (let denseIndex = 0; denseIndex < this.objects.count; denseIndex++) {
            const id = this.objects.denseIds[denseIndex];
            if (this.objects.kinds[id] === ObjectKind.CUBE) this.materials.release(this.objects.materialIds[id]);
        }
        for (const group of this.instanceGroups.values()) this.materials.release(group.materialId);
        this.instanceGroups.clear();
        // Drop released ownership so repeated disposal cannot release another scene's share.
        for (const name of this.objects.names.keys()) this.objects.delete(name);
        this.activeCameraId = null;
        for (const model of this.modelInstances.values()) {
            if (model.materialOverrideId >= 0) this.materials.release(model.materialOverrideId);
            if (model.lodGroup) this.lods?.release(model.lodGroup.id);
            this.models?.release(model.asset.id);
        }
        this.texts.clear();
        this.effects.clear();
        this.tweens.clear();
        this.cameraMatrixCaches.clear();
        this.terrains.clear();
        this.modelInstances.clear();
        this.lodModelInstances.clear();
        this.visibility.clear();
        if (this.lights) {
            for (const id of this.localLightIds) this.lights.deleteById(id, this);
        }
        this.localLightIds.clear();
        if (this.ownsMaterials) this.materials.clear();
    }

    get renderVersion() {
        return this.version + this.objects.version;
    }

    get instanceRenderVersion() {
        return this.instanceVersion + this.objects.instanceVersion;
    }

    get shadowRenderVersion() {
        return this.shadowVersion + this.objects.shadowVersion;
    }

    #hasShadowCaster(predicate) {
        const objects = this.objects;
        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id] || !objects.castsShadow[id]) continue;
            const material = this.materials.resourceForId(objects.materialIds[id]) ?? this.materials.defaultMaterial;
            if (predicate(material)) return true;
        }
        for (const group of this.instanceGroups.values()) {
            if (!group.visible || !group.castsShadow) continue;
            const material = this.materials.resourceForId(group.materialId) ?? this.materials.defaultMaterial;
            if (predicate(material)) return true;
        }
        for (const model of this.modelInstances.values()) {
            if (!model.visible || !model.castsShadow) continue;
            if (model.materialOverrideId >= 0) {
                const material = this.materials.resourceForId(model.materialOverrideId) ?? this.materials.defaultMaterial;
                if (predicate(material)) return true;
                continue;
            }
            for (const item of model.activeRenderItems) {
                const material = this.materials.resourceForId(item.primitive.materialId) ?? this.materials.defaultMaterial;
                if (predicate(material)) return true;
            }
        }
        for (const terrain of this.terrains.resources.values()) {
            if (!terrain.visible || !terrain.castsShadow) continue;
            const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : terrain.baseMaterialId;
            const material = this.materials.resourceForId(materialId) ?? this.materials.defaultMaterial;
            if (predicate(material)) return true;
        }
        return false;
    }

    setResourcePosition(name, x, y, z) {
        const effect = this.effects.resources.get(name);
        if (effect) return effect.setPosition(x, y, z);
        const terrain = this.terrains.resources.get(name);
        if (terrain) return terrain.setPosition(x, y, z);
        const model = this.modelInstances.get(name);
        if (model) return model.setPosition(x, y, z);
        this.objects.setPosition(this.objects.requireId(name), x, y, z);
    }

    // Scene render-resource namespace. Local lights and physics/audio have
    // their own namespaces and must be queried through their typed APIs.
    resourceKind(name) {
        if (this.texts.labels.has(name)) return 'text';
        const effect = this.effects.resources.get(name);
        if (effect) return effect.kind;
        if (this.terrains.resources.has(name)) return 'terrain';
        if (this.modelInstances.has(name)) return 'model';
        if (this.instanceGroups.has(name)) return 'instance group';
        const id = this.objects.idFor(name);
        if (id === undefined) return '';
        const kind = this.objects.kinds[id];
        return kind === ObjectKind.CUBE ? 'cube' : kind === ObjectKind.CAMERA ? 'camera' : 'directional light';
    }

    resourceVisible(name) {
        const resource = this.#visualResource(name);
        return typeof resource === 'number' ? Boolean(this.objects.visible[resource]) : resource.visible;
    }

    setResourceVisible(name, visible) {
        const resource = this.#visualResource(name);
        if (typeof resource === 'number') this.objects.setVisible(resource, visible);
        else resource.setVisible(visible);
    }

    setResourceTint(name, red, green, blue, alpha = 1) {
        const values = [red, green, blue, alpha].map(value => Math.fround(Number(value)));
        if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
            throw new Error('Resource tint channels must be finite values in 0..1');
        }
        const effect = this.effects.resources.get(name);
        if (effect) return effect.setTint(...values);
        const group = this.instanceGroups.get(name);
        if (group) throw new Error(`Instance group "${name}" has per-member tint; select a member`);
        const model = this.modelInstances.get(name) ?? this.terrains.resources.get(name);
        if (model) return model.setColor(...values);
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" has no visual tint`);
        const offset = id * 4;
        if (values.every((value, component) => this.objects.color[offset + component] === value)) return;
        const beforeAlpha = this.objects.color[offset + 3];
        this.objects.setColor(id, ...values);
        if (beforeAlpha !== this.objects.color[offset + 3] && this.objects.visible[id] && this.objects.castsShadow[id]) {
            const material = this.materials.resourceForId(this.objects.materialIds[id]);
            if (material?.alphaMode === AlphaMode.CUTOUT) this.shadowVersion++;
        }
    }

    resourceTintComponent(name, component) {
        if (!Number.isInteger(component) || component < 0 || component > 3) throw new Error('Unknown tint channel');
        const effect = this.effects.resources.get(name);
        if (effect) return effect.tint[component];
        const model = this.modelInstances.get(name) ?? this.terrains.resources.get(name);
        if (model) return model.color[component];
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" has no visual tint`);
        return this.objects.color[id * 4 + component];
    }

    resourceTransformComponent(name, property, axis) {
        if (!['position', 'rotation', 'scale'].includes(property)) throw new Error('Unknown transform property');
        if (!Number.isInteger(axis) || axis < 0 || axis > 2) throw new Error('Unknown transform axis');
        const effect = this.effects.resources.get(name);
        if (property === 'scale' && effect && (effect.kind === EffectKind.PARTICLE_EMITTER || axis === 2)) {
            throw new Error('Effects use width/height; emitters use particle size and spawn shape');
        }
        const transform = this.#resourceTransform(name);
        return transform[property][transform.offset + axis];
    }

    #visualResource(name) {
        const resource = this.effects.resources.get(name) ?? this.terrains.resources.get(name) ??
            this.modelInstances.get(name) ?? this.instanceGroups.get(name);
        if (resource) return resource;
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.CUBE) throw new Error(`Resource "${name}" has no visual visibility flag`);
        return id;
    }

    setResourceRotation(name, x, y, z) {
        const effect = this.effects.resources.get(name);
        if (effect) return effect.setRotation(x, y, z);
        const terrain = this.terrains.resources.get(name);
        if (terrain) return terrain.setRotation(x, y, z);
        const model = this.modelInstances.get(name);
        if (model) return model.setRotation(x, y, z);
        this.objects.setRotation(this.objects.requireId(name), x, y, z);
    }

    setResourceScale(name, x, y, z) {
        if (this.texts.labels.has(name)) {
            if (!Number.isFinite(Number(z))) throw new Error('Z scale must be a finite number');
            return this.texts.setSize(name, x, y);
        }
        const effect = this.effects.resources.get(name);
        if (effect) {
            if (effect.kind === EffectKind.PARTICLE_EMITTER) {
                throw new Error(`Particle emitter "${name}" does not use a generic scale; configure its particle size and spawn shape`);
            }
            if (!Number.isFinite(Number(z))) throw new Error('Z scale must be a finite number');
            return effect.setSize(x, y);
        }
        const terrain = this.terrains.resources.get(name);
        if (terrain) return terrain.setScale(x, y, z);
        const model = this.modelInstances.get(name);
        if (model) return model.setScale(x, y, z);
        this.objects.setScale(this.objects.requireId(name), x, y, z);
    }

    resourceBasis(name) {
        const transform = this.#resourceTransform(name);
        return basisFromEuler(transform.rotation, transform.offset, this.basisScratch);
    }

    moveResourceLocal(name, axis, distance) {
        const transform = this.#resourceTransform(name);
        const basis = basisFromEuler(transform.rotation, transform.offset, this.basisScratch);
        const vector = basis[String(axis).trim().toLowerCase()];
        if (!vector) throw new Error(`Unknown local movement axis "${axis}"`);
        const amount = Number(distance);
        if (!Number.isFinite(amount)) throw new Error('Movement distance must be finite');
        const x = transform.position[transform.offset] + vector[0] * amount;
        const y = transform.position[transform.offset + 1] + vector[1] * amount;
        const z = transform.position[transform.offset + 2] + vector[2] * amount;
        requireFloat32Vector(x, y, z, 'Movement result');
        this.setResourcePosition(name, x, y, z);
    }

    lookResourceAt(name, x, y, z) {
        const transform = this.#resourceTransform(name);
        for (let axis = 0; axis < 3; axis++) {
            this.lookAtPositionScratch[axis] = transform.position[transform.offset + axis];
            this.lookAtRotationScratch[axis] = transform.rotation[transform.offset + axis];
        }
        this.lookAtTargetScratch[0] = Number(x);
        this.lookAtTargetScratch[1] = Number(y);
        this.lookAtTargetScratch[2] = Number(z);
        if (!lookAtEuler(
            this.lookAtPositionScratch,
            this.lookAtTargetScratch,
            this.lookAtRotationScratch,
            this.lookAtScratch
        )) return false;
        this.setResourceRotation(name, this.lookAtScratch[0], this.lookAtScratch[1], this.lookAtScratch[2]);
        return true;
    }

    transformResourceCoordinates(name, direction, kind, x, y, z) {
        const transform = this.#rootTrsTransform(name);
        const values = [x, y, z].map(Number);
        if (values.some(value => !Number.isFinite(value))) throw new Error('Coordinates must be finite');
        composeEulerTrs(
            this.apiMatrixScratch,
            transform.position,
            transform.rotation,
            transform.scale,
            transform.offset,
            transform.offset,
            transform.offset
        );
        const normalizedDirection = String(direction).trim().toLowerCase();
        let matrix = this.apiMatrixScratch;
        if (normalizedDirection === 'world to local') {
            if (!invertMatrix(this.apiInverseMatrixScratch, matrix)) throw new Error(`Resource "${name}" has a singular transform`);
            matrix = this.apiInverseMatrixScratch;
        } else if (normalizedDirection !== 'local to world') {
            throw new Error(`Unknown coordinate direction "${direction}"`);
        }
        const normalizedKind = String(kind).trim().toLowerCase();
        if (normalizedKind === 'point') return transformPoint(this.apiVectorScratch, matrix, values);
        if (normalizedKind !== 'direction') throw new Error(`Unknown coordinate kind "${kind}"`);
        this.apiVectorScratch[0] = matrix[0] * values[0] + matrix[4] * values[1] + matrix[8] * values[2];
        this.apiVectorScratch[1] = matrix[1] * values[0] + matrix[5] * values[1] + matrix[9] * values[2];
        this.apiVectorScratch[2] = matrix[2] * values[0] + matrix[6] * values[1] + matrix[10] * values[2];
        return this.apiVectorScratch;
    }

    moveResourceRelativeToCamera(name, cameraName, axis, distance) {
        if (this.instanceGroups.has(name)) throw new Error(`Instance group "${name}" has no root transform`);
        const target = this.#resourceTransform(name);
        const cameraId = this.requireCamera(cameraName);
        const basis = basisFromEuler(this.objects.rotation, cameraId * 3, this.basisScratch);
        const vector = basis[String(axis).trim().toLowerCase()];
        if (!vector) throw new Error(`Unknown camera-relative axis "${axis}"`);
        const amount = Number(distance);
        if (!Number.isFinite(amount)) throw new Error('Movement distance must be finite');
        const x = target.position[target.offset] + vector[0] * amount;
        const y = target.position[target.offset + 1] + vector[1] * amount;
        const z = target.position[target.offset + 2] + vector[2] * amount;
        requireFloat32Vector(x, y, z, 'Camera-relative movement result');
        this.setResourcePosition(name, x, y, z);
    }

    pointFromCamera(cameraName, distance) {
        const id = this.requireCamera(cameraName);
        const amount = Number(distance);
        if (!Number.isFinite(amount)) throw new Error('Camera distance must be finite');
        const offset = id * 3;
        const basis = basisFromEuler(this.objects.rotation, offset, this.basisScratch);
        this.apiVectorScratch[0] = this.objects.position[offset] + basis.forward[0] * amount;
        this.apiVectorScratch[1] = this.objects.position[offset + 1] + basis.forward[1] * amount;
        this.apiVectorScratch[2] = this.objects.position[offset + 2] + basis.forward[2] * amount;
        return this.apiVectorScratch;
    }

    copyResourceTransform(sourceName, destinationName, property) {
        const source = this.#rootTrsTransform(sourceName);
        // #resourceTransform returns one reusable descriptor. Snapshot the
        // source before validating the destination so the second lookup cannot
        // redirect these reads to the destination itself.
        const position = [source.position[source.offset], source.position[source.offset + 1], source.position[source.offset + 2]];
        const rotation = [source.rotation[source.offset], source.rotation[source.offset + 1], source.rotation[source.offset + 2]];
        const scale = [source.scale[source.offset], source.scale[source.offset + 1], source.scale[source.offset + 2]];
        this.#rootTrsTransform(destinationName);
        const normalized = String(property).trim().toLowerCase();
        if (!['position', 'rotation', 'scale', 'all'].includes(normalized)) throw new Error(`Unknown transform property "${property}"`);
        if (normalized === 'position' || normalized === 'all') this.setResourcePosition(destinationName, ...position);
        if (normalized === 'rotation' || normalized === 'all') this.setResourceRotation(destinationName, ...rotation);
        if (normalized === 'scale' || normalized === 'all') this.setResourceScale(destinationName, ...scale);
    }

    tweenValues(name, property) {
        if (property === TweenProperty.FOV) {
            const id = this.requireCamera(name);
            return this.objects.camera.subarray(id * 3, id * 3 + 1);
        }
        const transform = this.#resourceTransform(name);
        const values = transform[property];
        return values?.subarray(transform.offset, transform.offset + 3) ?? null;
    }

    applyTweenValues(name, property, values) {
        if (property === TweenProperty.FOV) {
            const id = this.requireCamera(name);
            const offset = id * 3;
            this.objects.setCameraProjection(id, values[0], this.objects.camera[offset + 1], this.objects.camera[offset + 2]);
            return;
        }
        if (property === TweenProperty.POSITION) this.setResourcePosition(name, values[0], values[1], values[2]);
        else if (property === TweenProperty.ROTATION) this.setResourceRotation(name, values[0], values[1], values[2]);
        else if (property === TweenProperty.SCALE) this.setResourceScale(name, values[0], values[1], values[2]);
        else throw new Error(`Unknown tween property "${property}"`);
    }

    #requireDirectionalLight(name) {
        const id = this.objects.requireId(name);
        if (this.objects.kinds[id] !== ObjectKind.DIRECTIONAL_LIGHT) {
            throw new Error(`Object "${name}" is not a directional light`);
        }
        return id;
    }

    #assertResourceNameAvailable(name) {
        if (!name) throw new Error('Resource name cannot be empty');
        if (this.instanceGroups.has(name) || this.modelInstances.has(name) || this.terrains.resources.has(name) ||
            this.effects.resources.has(name) ||
            this.objects.idFor(name) !== undefined) {
            throw new Error(`A resource named "${name}" already exists`);
        }
    }

    #resourceTransform(name) {
        const transform = this.resourceTransformScratch;
        const effect = this.effects.resources.get(name);
        if (effect) {
            transform.position = effect.position;
            transform.rotation = effect.rotation;
            transform.scale = effect.size;
            transform.offset = 0;
            return transform;
        }
        const model = this.modelInstances.get(name);
        if (model) {
            transform.position = model.position;
            transform.rotation = model.rotation;
            transform.scale = model.scale;
            transform.offset = 0;
            return transform;
        }
        const terrain = this.terrains.resources.get(name);
        if (terrain) {
            transform.position = terrain.position;
            transform.rotation = terrain.rotation;
            transform.scale = terrain.scale;
            transform.offset = 0;
            return transform;
        }
        const id = this.objects.requireId(name);
        transform.position = this.objects.position;
        transform.rotation = this.objects.rotation;
        transform.scale = this.objects.scale;
        transform.offset = id * 3;
        return transform;
    }

    #rootTrsTransform(name) {
        if (this.instanceGroups.has(name)) throw new Error(`Instance group "${name}" has no root transform`);
        if (this.effects.resources.has(name)) {
            throw new Error(`Effect "${name}" uses billboard, decal, or particle space instead of a root TRS`);
        }
        return this.#resourceTransform(name);
    }

    #applyShadowSettings(id, settings) {
        for (const [setting, value] of Object.entries(settings)) {
            this.objects.setShadowSetting(id, setting, value);
        }
    }
}
