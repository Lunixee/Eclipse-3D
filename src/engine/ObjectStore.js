import {ObjectKind} from '../constants.js';
import {DEFAULT_DIRECTIONAL_SHADOW} from './shadows.js';

const INITIAL_CAPACITY = 64;
const VECTOR_SIZE = 3;
const COLOR_SIZE = 4;

export class ObjectStore {
    /**
     * @param {number} [capacity]
     * @param {((id: number, removed: boolean) => void) | null} [onSpatialChange]
     */
    constructor(capacity = INITIAL_CAPACITY, onSpatialChange = null) {
        this.capacity = Math.max(INITIAL_CAPACITY, capacity);
        this.onSpatialChange = onSpatialChange;
        this.nextId = 0;
        this.count = 0;
        this.freeIds = [];
        this.names = new Map();
        this.namesById = new Array(this.capacity);
        this.kinds = new Uint8Array(this.capacity);
        this.alive = new Uint8Array(this.capacity);
        this.visible = new Uint8Array(this.capacity);
        this.frustumCulling = new Uint8Array(this.capacity);
        this.denseIds = new Int32Array(this.capacity);
        this.denseIndex = new Int32Array(this.capacity);
        this.denseIndex.fill(-1);
        this.position = new Float32Array(this.capacity * VECTOR_SIZE);
        this.rotation = new Float32Array(this.capacity * VECTOR_SIZE);
        this.scale = new Float32Array(this.capacity * VECTOR_SIZE);
        this.color = new Float32Array(this.capacity * COLOR_SIZE);
        this.camera = new Float32Array(this.capacity * VECTOR_SIZE);
        this.intensity = new Float32Array(this.capacity);
        this.materialIds = new Int32Array(this.capacity);
        this.castsShadow = new Uint8Array(this.capacity);
        this.receivesShadow = new Uint8Array(this.capacity);
        this.shadowMapSize = new Uint16Array(this.capacity);
        this.shadowBias = new Float32Array(this.capacity);
        this.shadowNormalBias = new Float32Array(this.capacity);
        this.shadowDistance = new Float32Array(this.capacity);
        this.shadowNear = new Float32Array(this.capacity);
        this.shadowFar = new Float32Array(this.capacity);
        this.shadowBounds = new Float32Array(this.capacity);
        this.shadowFilter = new Uint8Array(this.capacity);
        this.version = 0;
        this.instanceVersion = 0;
        this.shadowVersion = 0;
        this.cameraVersion = 0;
    }

    create(name, kind) {
        if (this.names.has(name)) throw new Error(`A resource named "${name}" already exists`);
        const id = this.freeIds.length > 0 ? this.freeIds.pop() : this.nextId++;
        if (id >= this.capacity) this.#grow();
        this.names.set(name, id);
        this.namesById[id] = name;
        this.kinds[id] = kind;
        this.alive[id] = 1;
        this.visible[id] = 1;
        this.frustumCulling[id] = 1;
        this.denseIndex[id] = this.count;
        this.denseIds[this.count++] = id;

        const vectorOffset = id * VECTOR_SIZE;
        this.position.fill(0, vectorOffset, vectorOffset + VECTOR_SIZE);
        this.rotation.fill(0, vectorOffset, vectorOffset + VECTOR_SIZE);
        this.scale.fill(1, vectorOffset, vectorOffset + VECTOR_SIZE);
        const colorOffset = id * COLOR_SIZE;
        this.color.set([0.2, 0.55, 0.95, 1], colorOffset);
        this.camera.set([60, 0.1, 1000], vectorOffset);
        this.intensity[id] = 1;
        this.materialIds[id] = 0;
        this.castsShadow[id] = kind === ObjectKind.CUBE || kind === ObjectKind.DIRECTIONAL_LIGHT ? 1 : 0;
        this.receivesShadow[id] = kind === ObjectKind.CUBE ? 1 : 0;
        this.shadowMapSize[id] = DEFAULT_DIRECTIONAL_SHADOW.mapSize;
        this.shadowBias[id] = DEFAULT_DIRECTIONAL_SHADOW.bias;
        this.shadowNormalBias[id] = DEFAULT_DIRECTIONAL_SHADOW.normalBias;
        this.shadowDistance[id] = DEFAULT_DIRECTIONAL_SHADOW.distance;
        this.shadowNear[id] = DEFAULT_DIRECTIONAL_SHADOW.near;
        this.shadowFar[id] = DEFAULT_DIRECTIONAL_SHADOW.far;
        this.shadowBounds[id] = DEFAULT_DIRECTIONAL_SHADOW.bounds;
        this.shadowFilter[id] = DEFAULT_DIRECTIONAL_SHADOW.filter;

        if (kind === ObjectKind.CAMERA) {
            this.position[vectorOffset + 2] = 6;
            this.cameraVersion++;
        }
        if (kind === ObjectKind.DIRECTIONAL_LIGHT) {
            this.rotation[vectorOffset] = 0.7;
            this.rotation[vectorOffset + 1] = -0.7;
            this.color.set([1, 1, 1, 1], colorOffset);
        }
        this.version++;
        if (kind === ObjectKind.CUBE) this.instanceVersion++;
        if (kind === ObjectKind.CUBE || kind === ObjectKind.DIRECTIONAL_LIGHT) this.shadowVersion++;
        if (kind === ObjectKind.CUBE) this.onSpatialChange?.(id, false);
        return id;
    }

    delete(name) {
        const id = this.names.get(name);
        if (id === undefined) return false;
        const denseIndex = this.denseIndex[id];
        const lastIndex = this.count - 1;
        const lastId = this.denseIds[lastIndex];
        this.denseIds[denseIndex] = lastId;
        this.denseIndex[lastId] = denseIndex;
        this.count = lastIndex;
        const kind = this.kinds[id];
        const affectedShadow = this.#affectsShadowTransform(id);
        if (kind === ObjectKind.CUBE) this.onSpatialChange?.(id, true);
        this.denseIndex[id] = -1;
        this.alive[id] = 0;
        this.kinds[id] = 0;
        this.names.delete(name);
        this.namesById[id] = undefined;
        this.freeIds.push(id);
        this.version++;
        if (kind === ObjectKind.CUBE) this.instanceVersion++;
        if (kind === ObjectKind.CAMERA) this.cameraVersion++;
        if (affectedShadow) this.shadowVersion++;
        return true;
    }

    idFor(name) {
        return this.names.get(name);
    }

    requireId(name) {
        const id = this.names.get(name);
        if (id === undefined) throw new Error(`Unknown object "${name}"`);
        return id;
    }

    setPosition(id, x, y, z) {
        const offset = id * VECTOR_SIZE;
        this.position[offset] = x;
        this.position[offset + 1] = y;
        this.position[offset + 2] = z;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
        if (this.kinds[id] === ObjectKind.CUBE) this.onSpatialChange?.(id, false);
        if (this.kinds[id] === ObjectKind.CAMERA) this.cameraVersion++;
        if (this.#affectsShadowTransform(id)) this.shadowVersion++;
    }

    setRotation(id, xRadians, yRadians, zRadians) {
        const offset = id * VECTOR_SIZE;
        this.rotation[offset] = xRadians;
        this.rotation[offset + 1] = yRadians;
        this.rotation[offset + 2] = zRadians;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
        if (this.kinds[id] === ObjectKind.CUBE) this.onSpatialChange?.(id, false);
        if (this.kinds[id] === ObjectKind.CAMERA) this.cameraVersion++;
        if (this.#affectsShadowTransform(id)) this.shadowVersion++;
    }

    setScale(id, x, y, z) {
        const offset = id * VECTOR_SIZE;
        this.scale[offset] = x;
        this.scale[offset + 1] = y;
        this.scale[offset + 2] = z;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
        if (this.kinds[id] === ObjectKind.CUBE) this.onSpatialChange?.(id, false);
        if (this.#affectsShadowTransform(id)) this.shadowVersion++;
    }

    setCameraProjection(id, fieldOfView, near, far) {
        if (this.kinds[id] !== ObjectKind.CAMERA) throw new Error(`Object "${this.namesById[id]}" is not a camera`);
        const nextFov = Number(fieldOfView);
        const nextNear = Number(near);
        const nextFar = Number(far);
        if (!Number.isFinite(nextFov) || !(nextFov > 0 && nextFov < 180)) {
            throw new Error('Camera field of view must be between 0 and 180 degrees');
        }
        if (!Number.isFinite(nextNear) || !Number.isFinite(nextFar) || !(nextNear > 0 && nextFar > nextNear)) {
            throw new Error('Camera clip planes require 0 < near < far');
        }
        const offset = id * VECTOR_SIZE;
        if (this.camera[offset] === nextFov && this.camera[offset + 1] === nextNear && this.camera[offset + 2] === nextFar) return;
        this.camera[offset] = nextFov;
        this.camera[offset + 1] = nextNear;
        this.camera[offset + 2] = nextFar;
        this.cameraVersion++;
        this.version++;
    }

    setColor(id, red, green, blue, alpha = 1) {
        const offset = id * COLOR_SIZE;
        this.color[offset] = red;
        this.color[offset + 1] = green;
        this.color[offset + 2] = blue;
        this.color[offset + 3] = alpha;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
    }

    setIntensity(id, intensity) {
        if (!Number.isFinite(intensity) || intensity < 0) {
            throw new Error('Light intensity must be a non-negative finite number');
        }
        const next = Math.min(intensity, 1000);
        if (this.intensity[id] === next) return;
        this.intensity[id] = next;
        this.version++;
    }

    setMaterial(id, materialId) {
        if (this.materialIds[id] === materialId) return;
        this.materialIds[id] = materialId;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
    }

    setVisible(id, visible) {
        const next = visible ? 1 : 0;
        if (this.visible[id] === next) return;
        this.visible[id] = next;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
        if (this.kinds[id] === ObjectKind.CUBE) this.onSpatialChange?.(id, false);
        if (this.kinds[id] === ObjectKind.CUBE && this.castsShadow[id]) this.shadowVersion++;
    }

    setFrustumCulling(id, enabled) {
        if (this.kinds[id] !== ObjectKind.CUBE) throw new Error(`Object "${this.namesById[id]}" cannot use frustum culling`);
        const next = enabled ? 1 : 0;
        if (this.frustumCulling[id] === next) return;
        this.frustumCulling[id] = next;
        this.instanceVersion++;
        this.version++;
        this.onSpatialChange?.(id, false);
    }

    setCastsShadow(id, castsShadow) {
        const next = castsShadow ? 1 : 0;
        if (this.castsShadow[id] === next) return;
        this.castsShadow[id] = next;
        this.version++;
        const kind = this.kinds[id];
        if (kind === ObjectKind.DIRECTIONAL_LIGHT ||
            (kind === ObjectKind.CUBE && this.visible[id])) this.shadowVersion++;
    }

    setReceivesShadow(id, receivesShadow) {
        const next = receivesShadow ? 1 : 0;
        if (this.receivesShadow[id] === next) return;
        this.receivesShadow[id] = next;
        this.version++;
        if (this.kinds[id] === ObjectKind.CUBE) this.instanceVersion++;
    }

    setShadowSetting(id, setting, value) {
        if (this.kinds[id] !== ObjectKind.DIRECTIONAL_LIGHT) {
            throw new Error(`Object "${this.namesById[id]}" is not a directional light`);
        }
        const arrays = {
            mapSize: this.shadowMapSize,
            bias: this.shadowBias,
            normalBias: this.shadowNormalBias,
            distance: this.shadowDistance,
            near: this.shadowNear,
            far: this.shadowFar,
            bounds: this.shadowBounds,
            filter: this.shadowFilter
        };
        const target = arrays[setting];
        if (!target) throw new Error(`Unknown shadow setting "${setting}"`);
        if (target[id] === value) return;
        target[id] = value;
        this.version++;
        if (setting === 'mapSize' || setting === 'distance' || setting === 'near' ||
            setting === 'far' || setting === 'bounds') this.shadowVersion++;
    }

    #grow() {
        const oldCapacity = this.capacity;
        this.capacity *= 2;
        const copy = (source, elementsPerObject = 1) => {
            const next = new source.constructor(this.capacity * elementsPerObject);
            next.set(source);
            return next;
        };
        this.kinds = copy(this.kinds);
        this.alive = copy(this.alive);
        this.visible = copy(this.visible);
        this.frustumCulling = copy(this.frustumCulling);
        this.denseIds = copy(this.denseIds);
        const denseIndex = new Int32Array(this.capacity);
        denseIndex.fill(-1);
        denseIndex.set(this.denseIndex);
        this.denseIndex = denseIndex;
        this.position = copy(this.position, VECTOR_SIZE);
        this.rotation = copy(this.rotation, VECTOR_SIZE);
        this.scale = copy(this.scale, VECTOR_SIZE);
        this.color = copy(this.color, COLOR_SIZE);
        this.camera = copy(this.camera, VECTOR_SIZE);
        this.intensity = copy(this.intensity);
        this.materialIds = copy(this.materialIds);
        this.castsShadow = copy(this.castsShadow);
        this.receivesShadow = copy(this.receivesShadow);
        this.shadowMapSize = copy(this.shadowMapSize);
        this.shadowBias = copy(this.shadowBias);
        this.shadowNormalBias = copy(this.shadowNormalBias);
        this.shadowDistance = copy(this.shadowDistance);
        this.shadowNear = copy(this.shadowNear);
        this.shadowFar = copy(this.shadowFar);
        this.shadowBounds = copy(this.shadowBounds);
        this.shadowFilter = copy(this.shadowFilter);
        this.namesById.length = this.capacity;
        this.denseIndex.fill(-1, oldCapacity);
    }

    #affectsShadowTransform(id) {
        const kind = this.kinds[id];
        return (kind === ObjectKind.CUBE && this.visible[id] && this.castsShadow[id]) ||
            (kind === ObjectKind.DIRECTIONAL_LIGHT && this.castsShadow[id]);
    }
}
