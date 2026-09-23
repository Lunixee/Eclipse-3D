import {setBounds} from '../visibility/Bounds.js';

const floats = (value, components, count, label) => {
    if (!Array.isArray(value) && !(value instanceof Float32Array)) throw new Error(`${label} must be an array`);
    if (!value.length || value.length % components || (count && value.length !== count * components)) {
        throw new Error(`${label} must contain ${components} finite components per vertex`);
    }
    for (const number of value) if (!Number.isFinite(number) || !Number.isFinite(Math.fround(number))) {
        throw new Error(`${label} must contain finite float32 values`);
    }
    return value instanceof Float32Array ? value : new Float32Array(value);
};

// Validation/packing occurs at a command boundary. No project arrays or JSON are
// read during rendering, and the published resource never aliases caller data.
export const customGeometryData = data => {
    if (!data || typeof data !== 'object') throw new Error('Geometry data must be an object');
    const positions = floats(data.positions, 3, 0, 'Positions');
    const count = positions.length / 3;
    let indices = null;
    if (data.indices !== undefined && data.indices !== null) {
        if (!Array.isArray(data.indices) && !(data.indices instanceof Uint32Array)) throw new Error('Indices must be an array');
        if (!data.indices.length || data.indices.length % 3) throw new Error('Indices must describe complete triangles');
        for (const index of data.indices) if (!Number.isInteger(index) || index < 0 || index >= count) {
            throw new Error('Geometry index is outside the vertex range');
        }
        indices = data.indices instanceof Uint32Array ? data.indices : new Uint32Array(data.indices);
    } else if (count % 3) throw new Error('Non-indexed positions must describe complete triangles');
    const normals = data.normals ? floats(data.normals, 3, count, 'Normals') : generateNormals(positions, indices);
    return {
        positions, normals, indices,
        uvs: data.uvs ? floats(data.uvs, 2, count, 'UVs') : null,
        colors: data.colors ? floats(data.colors, 4, count, 'Colors') : null,
        tangents: data.tangents ? floats(data.tangents, 4, count, 'Tangents') : null
    };
};

export const applyCustomBounds = (resource, data) => {
    if (!data.bounds) return;
    const {minimum, maximum} = data.bounds;
    if (!minimum || !maximum || minimum.length !== 3 || maximum.length !== 3) throw new Error('Bounds require minimum and maximum vec3 arrays');
    for (let axis = 0; axis < 3; axis++) {
        if (minimum[axis] > resource.bounds.minimum[axis] || maximum[axis] < resource.bounds.maximum[axis]) {
            throw new Error('Custom bounds must enclose all positions');
        }
    }
    setBounds(resource.bounds, minimum, maximum);
    if (!resource.bounds.valid) throw new Error('Custom bounds exceed float32 range');
};

const generateNormals = (positions, indices) => {
    const normals = new Float32Array(positions.length);
    const count = indices ? indices.length : positions.length / 3;
    for (let i = 0; i < count; i += 3) {
        const a = (indices ? indices[i] : i) * 3;
        const b = (indices ? indices[i + 1] : i + 1) * 3;
        const c = (indices ? indices[i + 2] : i + 2) * 3;
        const x = positions[b] - positions[a], y = positions[b + 1] - positions[a + 1], z = positions[b + 2] - positions[a + 2];
        const u = positions[c] - positions[a], v = positions[c + 1] - positions[a + 1], w = positions[c + 2] - positions[a + 2];
        const nx = y * w - z * v, ny = z * u - x * w, nz = x * v - y * u;
        for (let j = 0; j < 3; j++) {
            const offset = j === 0 ? a : j === 1 ? b : c;
            normals[offset] += nx; normals[offset + 1] += ny; normals[offset + 2] += nz;
        }
    }
    for (let i = 0; i < normals.length; i += 3) {
        const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
        if (length > 0) {
            normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length;
        } else normals[i + 1] = 1;
    }
    return normals;
};

export const equalArray = (a, b) => {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
};
