import {ModelInstance} from '../models/ModelInstance.js';
import {identityMatrix} from '../models/modelMath.js';

const MAX_SEGMENTS = 256;
const EPSILON = 1e-8;
let nextStoreId = 1;

const positive = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be positive and finite`);
    return number;
};

const segments = (value, label) => {
    const number = Math.floor(Number(value));
    if (!Number.isFinite(number) || number < 1 || number > MAX_SEGMENTS) {
        throw new Error(`${label} must be an integer from 1 to ${MAX_SEGMENTS}`);
    }
    return number;
};

const createMeshArrays = (width, depth, segmentsX, segmentsZ, heights) => {
    const columns = segmentsX + 1;
    const rows = segmentsZ + 1;
    const positions = new Float32Array(columns * rows * 3);
    const normals = new Float32Array(columns * rows * 3);
    const uvs = new Float32Array(columns * rows * 2);
    const indices = new Uint32Array(segmentsX * segmentsZ * 6);
    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < columns; x++) {
            const vertex = z * columns + x;
            positions[vertex * 3] = x / segmentsX * width - width * 0.5;
            positions[vertex * 3 + 1] = heights[vertex];
            positions[vertex * 3 + 2] = z / segmentsZ * depth - depth * 0.5;
            uvs[vertex * 2] = x / segmentsX;
            uvs[vertex * 2 + 1] = z / segmentsZ;
        }
    }
    let output = 0;
    for (let z = 0; z < segmentsZ; z++) {
        for (let x = 0; x < segmentsX; x++) {
            const a = z * columns + x;
            const b = a + 1;
            const c = a + columns;
            const d = c + 1;
            indices.set([a, c, b, b, c, d], output);
            output += 6;
        }
    }
    return {positions, normals, uvs, indices};
};

const updateNormals = mesh => {
    const {positions, normals, indices} = mesh;
    normals.fill(0);
    for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index] * 3;
        const b = indices[index + 1] * 3;
        const c = indices[index + 2] * 3;
        const edge1X = positions[b] - positions[a];
        const edge1Y = positions[b + 1] - positions[a + 1];
        const edge1Z = positions[b + 2] - positions[a + 2];
        const edge2X = positions[c] - positions[a];
        const edge2Y = positions[c + 1] - positions[a + 1];
        const edge2Z = positions[c + 2] - positions[a + 2];
        const nx = edge1Y * edge2Z - edge1Z * edge2Y;
        const ny = edge1Z * edge2X - edge1X * edge2Z;
        const nz = edge1X * edge2Y - edge1Y * edge2X;
        for (const offset of [a, b, c]) {
            normals[offset] += nx;
            normals[offset + 1] += ny;
            normals[offset + 2] += nz;
        }
    }
    for (let index = 0; index < normals.length; index += 3) {
        const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]);
        if (length > EPSILON) {
            normals[index] /= length;
            normals[index + 1] /= length;
            normals[index + 2] /= length;
        } else {
            normals[index] = 0;
            normals[index + 1] = 1;
            normals[index + 2] = 0;
        }
    }
};

const createTerrainAsset = (name, geometry, materialId) => /** @type {import('../models/ModelStore.js').ModelAsset} */ (
    /** @type {unknown} */ ({
    id: -1,
    name: `@terrain:${name}`,
    nodes: [{
        name,
        parent: -1,
        localMatrix: identityMatrix(),
        baseTranslation: new Float32Array(3),
        baseRotation: new Float32Array([0, 0, 0, 1]),
        baseScale: new Float32Array([1, 1, 1]),
        matrixAuthored: true
    }],
    nodeOrder: [0],
    skins: [],
    animations: [],
    primitives: [{
        geometryId: geometry.id,
        materialId,
        nodeIndex: 0,
        skinIndex: -1,
        morphTargetCount: 0,
        defaultMorphWeights: null,
        bounds: geometry.bounds,
        jointInfluenceBounds: null,
        morphPositionBounds: [],
        triangleCount: geometry.triangleCount
    }],
        geometryIds: [geometry.id]
    })
);

export class Terrain extends ModelInstance {
    constructor(store, name, width, depth, segmentsX, segmentsZ, onChange) {
        const resolvedWidth = positive(width, 'Terrain width');
        const resolvedDepth = positive(depth, 'Terrain depth');
        const resolvedSegmentsX = segments(segmentsX, 'Terrain X segments');
        const resolvedSegmentsZ = segments(segmentsZ, 'Terrain Z segments');
        const heights = new Float32Array((resolvedSegmentsX + 1) * (resolvedSegmentsZ + 1));
        const mesh = createMeshArrays(resolvedWidth, resolvedDepth, resolvedSegmentsX, resolvedSegmentsZ, heights);
        updateNormals(mesh);
        const geometry = store.geometry.createDynamic(`@terrain:${store.id}:${name}`, mesh);
        const materialId = store.materials.defaultMaterial.id;
        super(name, createTerrainAsset(name, geometry, materialId), onChange);
        this.store = store;
        this.width = resolvedWidth;
        this.depth = resolvedDepth;
        this.segmentsX = resolvedSegmentsX;
        this.segmentsZ = resolvedSegmentsZ;
        this.heights = heights;
        this.mesh = mesh;
        this.geometry = geometry;
        this.baseMaterialId = materialId;
        this.dirty = false;
        this.disposed = false;
        this.logicalEdits = 0;
        this.geometryBuilds = 1;
        this.normalResult = new Float32Array([0, 1, 0]);
        this.sampleResult = {x: 0, z: 0, fractionX: 0, fractionZ: 0};
        store.geometry.retain(geometry.id);
        store.materials.retain(materialId);
    }

    setHeight(gridX, gridZ, height) {
        const x = Math.floor(Number(gridX));
        const z = Math.floor(Number(gridZ));
        const value = Number(height);
        if (!Number.isInteger(x) || x < 0 || x > this.segmentsX ||
            !Number.isInteger(z) || z < 0 || z > this.segmentsZ) {
            throw new Error('Terrain height coordinates are outside the vertex grid');
        }
        if (!Number.isFinite(value)) throw new Error('Terrain height must be finite');
        const index = z * (this.segmentsX + 1) + x;
        if (this.heights[index] === value) return;
        this.heights[index] = value;
        this.logicalEdits++;
        this.#markDirty();
    }

    setFlat(height = 0) {
        const value = Number(height);
        if (!Number.isFinite(value)) throw new Error('Terrain height must be finite');
        let changed = false;
        for (let index = 0; index < this.heights.length; index++) {
            if (this.heights[index] === value) continue;
            this.heights[index] = value;
            changed = true;
        }
        if (changed) {
            this.logicalEdits++;
            this.#markDirty();
        }
    }

    generateHills(amplitude = 1, frequency = 1, seed = 1) {
        const resolvedAmplitude = Number(amplitude);
        const resolvedFrequency = Number(frequency);
        const resolvedSeed = Number(seed);
        if (![resolvedAmplitude, resolvedFrequency, resolvedSeed].every(Number.isFinite)) {
            throw new Error('Terrain hill parameters must be finite');
        }
        const columns = this.segmentsX + 1;
        for (let z = 0; z <= this.segmentsZ; z++) {
            for (let x = 0; x <= this.segmentsX; x++) {
                const u = x / this.segmentsX;
                const v = z / this.segmentsZ;
                this.heights[z * columns + x] = resolvedAmplitude * 0.5 * (
                    Math.sin((u * resolvedFrequency + resolvedSeed * 0.137) * Math.PI * 2) +
                    Math.cos((v * resolvedFrequency - resolvedSeed * 0.173) * Math.PI * 2)
                );
            }
        }
        this.logicalEdits++;
        this.#markDirty();
    }

    flushGeometry() {
        if (!this.dirty || this.disposed) return false;
        for (let index = 0; index < this.heights.length; index++) this.mesh.positions[index * 3 + 1] = this.heights[index];
        updateNormals(this.mesh);
        this.store.geometry.updateDynamic(this.geometry.id, this.mesh);
        this.refreshGeometryBounds();
        this.geometryBuilds++;
        this.dirty = false;
        return true;
    }

    setRotation(x, y, z) {
        if (Math.abs(Number(x)) > EPSILON || Math.abs(Number(z)) > EPSILON) {
            throw new Error('Heightfield terrain supports yaw rotation only');
        }
        super.setRotation(0, y, 0);
    }

    setScale(x, y, z) {
        if (![x, y, z].every(value => Number.isFinite(Number(value)) && Math.abs(Number(value)) > EPSILON)) {
            throw new Error('Terrain scale components must be finite and non-zero');
        }
        super.setScale(x, y, z);
    }

    heightAtWorld(worldX, worldZ) {
        const sample = this.#sampleCoordinates(worldX, worldZ);
        const height = /** @type {number} */ (this.#interpolatedComponent(this.heights, 1, sample));
        return this.position[1] + height * this.scale[1];
    }

    normalAtWorld(worldX, worldZ) {
        this.flushGeometry();
        const sample = this.#sampleCoordinates(worldX, worldZ);
        const normal = /** @type {Float32Array} */ (
            this.#interpolatedComponent(this.mesh.normals, 3, sample, this.normalResult)
        );
        const sine = Math.sin(this.rotation[1]);
        const cosine = Math.cos(this.rotation[1]);
        const nx = normal[0] / this.scale[0];
        const ny = normal[1] / this.scale[1];
        const nz = normal[2] / this.scale[2];
        const worldNormalX = cosine * nx + sine * nz;
        const worldNormalY = ny;
        const worldNormalZ = -sine * nx + cosine * nz;
        const length = Math.hypot(worldNormalX, worldNormalY, worldNormalZ) || 1;
        this.normalResult[0] = worldNormalX / length;
        this.normalResult[1] = worldNormalY / length;
        this.normalResult[2] = worldNormalZ / length;
        return this.normalResult;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        if (this.materialOverrideId >= 0) this.store.materials.release(this.materialOverrideId);
        this.store.materials.release(this.baseMaterialId);
        this.store.geometry.release(this.geometry.id);
    }

    #sampleCoordinates(worldX, worldZ) {
        const dx = Number(worldX) - this.position[0];
        const dz = Number(worldZ) - this.position[2];
        if (!Number.isFinite(dx) || !Number.isFinite(dz)) throw new Error('Terrain query coordinates must be finite');
        const sine = Math.sin(this.rotation[1]);
        const cosine = Math.cos(this.rotation[1]);
        const localX = (cosine * dx - sine * dz) / this.scale[0];
        const localZ = (sine * dx + cosine * dz) / this.scale[2];
        const gridX = (localX / this.width + 0.5) * this.segmentsX;
        const gridZ = (localZ / this.depth + 0.5) * this.segmentsZ;
        if (gridX < -EPSILON || gridX > this.segmentsX + EPSILON ||
            gridZ < -EPSILON || gridZ > this.segmentsZ + EPSILON) {
            throw new Error('World point lies outside the terrain heightfield');
        }
        const x = Math.min(this.segmentsX - 1, Math.max(0, Math.floor(gridX)));
        const z = Math.min(this.segmentsZ - 1, Math.max(0, Math.floor(gridZ)));
        const result = this.sampleResult;
        result.x = x;
        result.z = z;
        result.fractionX = Math.max(0, Math.min(1, gridX - x));
        result.fractionZ = Math.max(0, Math.min(1, gridZ - z));
        return result;
    }

    /**
     * @param {Float32Array} values
     * @param {number} components
     * @param {{x: number, z: number, fractionX: number, fractionZ: number}} sample
     * @param {Float32Array | null} [out]
     * @returns {number | Float32Array}
     */
    #interpolatedComponent(values, components, sample, out = null) {
        const columns = this.segmentsX + 1;
        const a = (sample.z * columns + sample.x) * components;
        const b = a + components;
        const c = a + columns * components;
        const d = c + components;
        const firstTriangle = sample.fractionX + sample.fractionZ <= 1;
        const output = out ?? 0;
        if (components === 1) {
            if (firstTriangle) return values[a] * (1 - sample.fractionX - sample.fractionZ) +
                values[b] * sample.fractionX + values[c] * sample.fractionZ;
            return values[b] * (1 - sample.fractionZ) + values[c] * (1 - sample.fractionX) +
                values[d] * (sample.fractionX + sample.fractionZ - 1);
        }
        for (let component = 0; component < components; component++) {
            output[component] = firstTriangle ?
                values[a + component] * (1 - sample.fractionX - sample.fractionZ) +
                    values[b + component] * sample.fractionX + values[c + component] * sample.fractionZ :
                values[b + component] * (1 - sample.fractionZ) + values[c + component] * (1 - sample.fractionX) +
                    values[d + component] * (sample.fractionX + sample.fractionZ - 1);
        }
        return output;
    }

    #markDirty() {
        if (this.dirty) return;
        this.dirty = true;
        this.store.markDirty(this);
    }
}

export class TerrainStore {
    constructor(geometry, materials, onChange = null) {
        this.id = nextStoreId++;
        this.geometry = geometry;
        this.materials = materials;
        this.onChange = onChange;
        this.resources = new Map();
        this.dirty = new Set();
        this.geometryBuilds = 0;
        this.geometryBuildBytes = 0;
        this.flushMetrics = {builds: 0, bytes: 0};
    }

    create(name, width, depth, segmentsX, segmentsZ, onTerrainChange) {
        if (!this.geometry) throw new Error('Terrain geometry resources are unavailable');
        if (!name) throw new Error('Terrain name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Terrain "${name}" already exists`);
        const terrain = new Terrain(this, name, width, depth, segmentsX, segmentsZ, onTerrainChange);
        this.resources.set(name, terrain);
        this.geometryBuilds++;
        this.geometryBuildBytes += terrain.geometry.vertices.byteLength + terrain.geometry.indices.byteLength;
        this.onChange?.(terrain, false);
        return terrain;
    }

    require(name) {
        const terrain = this.resources.get(name);
        if (!terrain) throw new Error(`Unknown terrain "${name}"`);
        return terrain;
    }

    markDirty(terrain) {
        this.dirty.add(terrain);
        this.onChange?.(terrain, false, true);
    }

    flushDirty() {
        let builds = 0;
        let bytes = 0;
        for (const terrain of this.dirty) {
            if (!terrain.flushGeometry()) continue;
            builds++;
            bytes += terrain.geometry.vertices.byteLength;
        }
        this.dirty.clear();
        this.geometryBuilds += builds;
        this.geometryBuildBytes += bytes;
        this.flushMetrics.builds = builds;
        this.flushMetrics.bytes = bytes;
        return this.flushMetrics;
    }

    setMaterial(name, materialId) {
        const terrain = this.require(name);
        if (terrain.materialOverrideId === materialId) return;
        this.materials.retain(materialId);
        if (terrain.materialOverrideId >= 0) this.materials.release(terrain.materialOverrideId);
        terrain.setMaterialOverride(materialId);
    }

    delete(name) {
        const terrain = this.resources.get(name);
        if (!terrain) return false;
        this.dirty.delete(terrain);
        this.resources.delete(name);
        terrain.dispose();
        this.onChange?.(terrain, true);
        return true;
    }

    clear() {
        for (const terrain of this.resources.values()) terrain.dispose();
        this.resources.clear();
        this.dirty.clear();
    }

    get triangleCount() {
        let count = 0;
        for (const terrain of this.resources.values()) count += terrain.geometry.triangleCount;
        return count;
    }
}
