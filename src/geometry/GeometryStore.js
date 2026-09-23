import {createCubeVertexData} from './cube.js';
import {boundsFromPositions, copyBounds, jointInfluenceBounds, morphPositionBounds} from '../visibility/Bounds.js';
import {applyCustomBounds, customGeometryData, equalArray} from './customGeometryData.js';

export const GEOMETRY_VERTEX_STRIDE = 16;
export const SKIN_VERTEX_STRIDE = 8;

const finiteArray = (value, size, label) => {
    if (!(value instanceof Float32Array) || value.length % size !== 0) {
        throw new Error(`${label} must be a Float32Array with ${size} components per vertex`);
    }
    for (const number of value) if (!Number.isFinite(number)) throw new Error(`${label} must contain finite values`);
};

const packVertices = (positions, normals, tangents, uvs, colors) => {
    const vertexCount = positions.length / 3;
    const packed = new Float32Array(vertexCount * GEOMETRY_VERTEX_STRIDE);
    for (let vertex = 0; vertex < vertexCount; vertex++) {
        const output = vertex * GEOMETRY_VERTEX_STRIDE;
        packed.set(positions.subarray(vertex * 3, vertex * 3 + 3), output);
        packed.set(normals.subarray(vertex * 3, vertex * 3 + 3), output + 3);
        if (tangents) packed.set(tangents.subarray(vertex * 4, vertex * 4 + 4), output + 6);
        else packed.set([1, 0, 0, 0], output + 6);
        if (uvs) packed.set(uvs.subarray(vertex * 2, vertex * 2 + 2), output + 10);
        if (colors) packed.set(colors.subarray(vertex * 4, vertex * 4 + 4), output + 12);
        else packed.set([1, 1, 1, 1], output + 12);
    }
    return packed;
};

const packSkinVertices = (joints, weights, vertexCount) => {
    if (!joints && !weights) return null;
    finiteArray(joints, 4, 'Joint indices');
    finiteArray(weights, 4, 'Joint weights');
    if (joints.length / 4 !== vertexCount || weights.length / 4 !== vertexCount) {
        throw new Error('Geometry skin attribute count does not match positions');
    }
    const packed = new Float32Array(vertexCount * SKIN_VERTEX_STRIDE);
    for (let vertex = 0; vertex < vertexCount; vertex++) {
        packed.set(joints.subarray(vertex * 4, vertex * 4 + 4), vertex * SKIN_VERTEX_STRIDE);
        packed.set(weights.subarray(vertex * 4, vertex * 4 + 4), vertex * SKIN_VERTEX_STRIDE + 4);
    }
    return packed;
};

export class GeometryResource {
    constructor(id, key, data) {
        const {
            positions,
            normals,
            tangents = null,
            uvs = null,
            colors = null,
            joints = null,
            weights = null,
            indices = null,
            morphTargets = []
        } = data;
        finiteArray(positions, 3, 'Positions');
        finiteArray(normals, 3, 'Normals');
        const vertexCount = positions.length / 3;
        if (normals.length / 3 !== vertexCount) throw new Error('Geometry normal count does not match positions');
        if (tangents) {
            finiteArray(tangents, 4, 'Tangents');
            if (tangents.length / 4 !== vertexCount) throw new Error('Geometry tangent count does not match positions');
        }
        if (uvs) {
            finiteArray(uvs, 2, 'Texture coordinates');
            if (uvs.length / 2 !== vertexCount) throw new Error('Geometry UV count does not match positions');
        }
        if (colors) {
            finiteArray(colors, 4, 'Vertex colors');
            if (colors.length / 4 !== vertexCount) throw new Error('Geometry color count does not match positions');
        }
        if (indices && !(indices instanceof Uint32Array)) throw new Error('Geometry indices must be Uint32Array');
        if (indices) {
            for (const index of indices) if (index >= vertexCount) throw new Error('Geometry index is outside the vertex range');
        }
        this.id = id;
        this.key = key;
        this.vertices = packVertices(positions, normals, tangents, uvs, colors);
        this.skinVertices = packSkinVertices(joints, weights, vertexCount);
        this.morphTargets = morphTargets;
        this.indices = indices ? indices.slice() : null;
        this.vertexCount = vertexCount;
        this.indexCount = indices?.length ?? 0;
        this.triangleCount = (indices?.length ?? vertexCount) / 3;
        this.bounds = boundsFromPositions(positions);
        this.jointInfluenceBounds = jointInfluenceBounds(positions, joints, weights);
        this.morphPositionBounds = morphPositionBounds(morphTargets);
        this.references = 0;
        this.disposed = false;
        this.dynamic = false;
        this.version = 1;
        this.vertexVersion = 1;
        this.indexVersion = 1;
        this.positionVersion = 1;
        this.boundsVersion = 1;
        this.custom = false;
    }
}

export class GeometryStore {
    /** @param {((resource: GeometryResource, boundsChanged: boolean, positionsChanged: boolean) => void) | null} [onCustomChange] */
    constructor(onCustomChange = null) {
        this.onCustomChange = onCustomChange;
        this.resources = new Map();
        this.resourcesById = [];
        this.nextId = 0;
        this.version = 1;
        this.cube = this.#createCube();
        this.cube.references = 1;
        this.quad = null;
    }

    create(key, data) {
        const normalized = String(key);
        const existing = this.resources.get(normalized);
        if (existing) return existing;
        const resource = new GeometryResource(this.nextId++, normalized, data);
        this.resources.set(normalized, resource);
        this.resourcesById[resource.id] = resource;
        this.version++;
        return resource;
    }

    createDynamic(key, data) {
        const normalized = String(key);
        const existing = this.resources.get(normalized);
        if (existing) {
            if (!existing.dynamic) throw new Error(`Geometry "${key}" already exists as an immutable resource`);
            return existing;
        }
        const resource = this.create(normalized, data);
        resource.dynamic = true;
        return resource;
    }

    createCustom(name, data, usage = 'static') {
        if (!String(name).trim()) throw new Error('Geometry name cannot be empty');
        if (!['static', 'dynamic'].includes(usage)) throw new Error('Geometry usage must be static or dynamic');
        const key = `custom:${name}`;
        if (this.resources.has(key)) throw new Error(`Geometry "${name}" already exists`);
        const resource = new GeometryResource(this.nextId, key, customGeometryData(data));
        applyCustomBounds(resource, data);
        resource.custom = true;
        resource.dynamic = usage === 'dynamic';
        resource.references = 1; // The name owns a reference independently of model assets.
        this.nextId++;
        this.resources.set(key, resource);
        this.resourcesById[resource.id] = resource;
        this.version++;
        return resource;
    }

    requireCustom(name) {
        const resource = this.resources.get(`custom:${name}`);
        if (!resource) throw new Error(`Unknown custom geometry "${name}"`);
        return resource;
    }

    deleteCustom(name) {
        const resource = this.requireCustom(name);
        if (resource.references > 1) throw new Error(`Geometry "${name}" is still used by ${resource.references - 1} resource(s)`);
        this.release(resource.id);
    }

    updateCustom(name, data) {
        const resource = this.requireCustom(name);
        if (!resource.dynamic) throw new Error(`Geometry "${name}" is immutable; create it as dynamic to update it`);
        const next = new GeometryResource(-1, resource.key, customGeometryData(data));
        applyCustomBounds(next, data);
        const verticesChanged = !equalArray(resource.vertices, next.vertices);
        const indicesChanged = !equalArray(resource.indices, next.indices);
        const boundsChanged = !equalArray(resource.bounds.minimum, next.bounds.minimum) ||
            !equalArray(resource.bounds.maximum, next.bounds.maximum);
        if (!verticesChanged && !indicesChanged && !boundsChanged) return resource;
        let positionsChanged = indicesChanged || resource.vertexCount !== next.vertexCount;
        if (!positionsChanged && verticesChanged) {
            for (let i = 0; i < resource.vertices.length; i += GEOMETRY_VERTEX_STRIDE) {
                if (resource.vertices[i] !== next.vertices[i] || resource.vertices[i + 1] !== next.vertices[i + 1] ||
                    resource.vertices[i + 2] !== next.vertices[i + 2]) { positionsChanged = true; break; }
            }
        }
        if (verticesChanged) {
            if (resource.vertices.length === next.vertices.length) resource.vertices.set(next.vertices);
            else resource.vertices = next.vertices;
            resource.vertexVersion++;
        }
        if (indicesChanged) {
            if (resource.indices && next.indices && resource.indices.length === next.indices.length) resource.indices.set(next.indices);
            else resource.indices = next.indices;
            resource.indexVersion++;
        }
        resource.vertexCount = next.vertexCount;
        resource.indexCount = next.indexCount;
        resource.triangleCount = next.triangleCount;
        if (positionsChanged) resource.positionVersion++;
        if (boundsChanged) { copyBounds(resource.bounds, next.bounds); resource.boundsVersion++; }
        resource.version++;
        this.version++;
        this.onCustomChange?.(resource, boundsChanged, positionsChanged);
        return resource;
    }

    updateDynamic(id, data) {
        const resource = this.resourceForId(id);
        if (!resource || resource.disposed) throw new Error(`Unknown geometry ID ${id}`);
        if (!resource.dynamic) throw new Error(`Geometry "${resource.key}" is immutable`);
        const updated = new GeometryResource(-1, resource.key, data);
        if (updated.vertexCount !== resource.vertexCount || updated.indexCount !== resource.indexCount) {
            throw new Error('Dynamic geometry updates must preserve vertex and index counts');
        }
        if (Boolean(updated.indices) !== Boolean(resource.indices)) {
            throw new Error('Dynamic geometry updates must preserve indexed topology');
        }
        if (resource.indices) {
            for (let index = 0; index < resource.indices.length; index++) {
                if (updated.indices[index] !== resource.indices[index]) {
                    throw new Error('Dynamic geometry updates must preserve index topology');
                }
            }
        }
        if (Boolean(updated.skinVertices) !== Boolean(resource.skinVertices)) {
            throw new Error('Dynamic geometry updates must preserve skin attributes');
        }
        resource.vertices = updated.vertices;
        resource.skinVertices = updated.skinVertices;
        resource.morphTargets = updated.morphTargets;
        resource.jointInfluenceBounds = updated.jointInfluenceBounds;
        resource.morphPositionBounds = updated.morphPositionBounds;
        copyBounds(resource.bounds, updated.bounds);
        resource.version++;
        resource.vertexVersion++;
        resource.positionVersion++;
        resource.boundsVersion++;
        this.version++;
        return resource;
    }

    resourceForId(id) {
        return this.resourcesById[id] ?? null;
    }

    retain(id) {
        const resource = this.resourceForId(id);
        if (!resource) throw new Error(`Unknown geometry ID ${id}`);
        resource.references++;
    }

    release(id) {
        const resource = this.resourceForId(id);
        if (!resource || resource === this.cube) return;
        resource.references = Math.max(0, resource.references - 1);
        if (resource.references === 0) this.#dispose(resource);
    }

    clear() {
        for (const resource of this.resources.values()) {
            if (resource !== this.cube) resource.disposed = true;
        }
        this.resources.clear();
        this.resourcesById.length = 0;
        this.nextId = 0;
        this.cube = this.#createCube();
        this.cube.references = 1;
        this.quad = null;
        this.version++;
    }

    getQuad() {
        if (this.quad && !this.quad.disposed) return this.quad;
        this.quad = this.create('builtin:effect-quad', {
            positions: new Float32Array([
                -0.5, -0.5, 0,
                0.5, -0.5, 0,
                0.5, 0.5, 0,
                -0.5, 0.5, 0
            ]),
            normals: new Float32Array([
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1
            ]),
            uvs: new Float32Array([
                0, 0,
                1, 0,
                1, 1,
                0, 1
            ]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3])
        });
        // allocate the shared effect quad only when a scene needs it
        this.quad.references = Math.max(1, this.quad.references);
        return this.quad;
    }

    get count() {
        let count = 0;
        for (const resource of this.resourcesById) if (resource) count++;
        return count;
    }

    #dispose(resource) {
        resource.disposed = true;
        this.resources.delete(resource.key);
        this.resourcesById[resource.id] = null;
        this.version++;
    }

    #createCube() {
        const source = createCubeVertexData();
        const positions = new Float32Array(36 * 3);
        const normals = new Float32Array(36 * 3);
        const uvs = new Float32Array(36 * 2);
        for (let vertex = 0; vertex < 36; vertex++) {
            const input = vertex * 8;
            positions.set(source.subarray(input, input + 3), vertex * 3);
            normals.set(source.subarray(input + 3, input + 6), vertex * 3);
            uvs.set(source.subarray(input + 6, input + 8), vertex * 2);
        }
        return this.create('builtin:cube', {positions, normals, uvs});
    }
}
