const AXES = 3;

export const createBounds = () => ({
    minimum: new Float32Array(AXES),
    maximum: new Float32Array(AXES),
    center: new Float32Array(AXES),
    radius: 0,
    valid: false
});

export const resetBounds = bounds => {
    bounds.minimum.fill(Infinity);
    bounds.maximum.fill(-Infinity);
    bounds.center.fill(0);
    bounds.radius = 0;
    bounds.valid = false;
    return bounds;
};

export const finalizeBounds = bounds => {
    for (let axis = 0; axis < AXES; axis++) {
        const minimum = bounds.minimum[axis];
        const maximum = bounds.maximum[axis];
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) {
            return resetBounds(bounds);
        }
        bounds.center[axis] = (minimum + maximum) * 0.5;
    }
    const x = (bounds.maximum[0] - bounds.minimum[0]) * 0.5;
    const y = (bounds.maximum[1] - bounds.minimum[1]) * 0.5;
    const z = (bounds.maximum[2] - bounds.minimum[2]) * 0.5;
    bounds.radius = Math.hypot(x, y, z);
    bounds.valid = Number.isFinite(bounds.radius);
    return bounds.valid ? bounds : resetBounds(bounds);
};

export const setBounds = (bounds, minimum, maximum) => {
    for (let axis = 0; axis < AXES; axis++) {
        const low = Number(minimum[axis]);
        const high = Number(maximum[axis]);
        if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
            throw new Error('Bounds must contain finite ordered minimum and maximum values');
        }
        bounds.minimum[axis] = low;
        bounds.maximum[axis] = high;
    }
    return finalizeBounds(bounds);
};

export const copyBounds = (out, source) => {
    out.minimum.set(source.minimum);
    out.maximum.set(source.maximum);
    out.center.set(source.center);
    out.radius = source.radius;
    out.valid = source.valid !== false;
    return out;
};

export const includePoint = (bounds, x, y, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new Error('Bounds points must be finite');
    }
    bounds.minimum[0] = Math.min(bounds.minimum[0], x);
    bounds.minimum[1] = Math.min(bounds.minimum[1], y);
    bounds.minimum[2] = Math.min(bounds.minimum[2], z);
    bounds.maximum[0] = Math.max(bounds.maximum[0], x);
    bounds.maximum[1] = Math.max(bounds.maximum[1], y);
    bounds.maximum[2] = Math.max(bounds.maximum[2], z);
    bounds.valid = true;
    return bounds;
};

export const includeBounds = (out, source) => {
    if (!source?.valid) return out;
    includePoint(out, source.minimum[0], source.minimum[1], source.minimum[2]);
    includePoint(out, source.maximum[0], source.maximum[1], source.maximum[2]);
    return out;
};

export const includeTransformedAabb = (out, minimum, maximum, matrix, minimumOffset = 0, maximumOffset = minimumOffset) => {
    const centerX = (minimum[minimumOffset] + maximum[maximumOffset]) * 0.5;
    const centerY = (minimum[minimumOffset + 1] + maximum[maximumOffset + 1]) * 0.5;
    const centerZ = (minimum[minimumOffset + 2] + maximum[maximumOffset + 2]) * 0.5;
    const extentX = (maximum[maximumOffset] - minimum[minimumOffset]) * 0.5;
    const extentY = (maximum[maximumOffset + 1] - minimum[minimumOffset + 1]) * 0.5;
    const extentZ = (maximum[maximumOffset + 2] - minimum[minimumOffset + 2]) * 0.5;
    const worldX = matrix[0] * centerX + matrix[4] * centerY + matrix[8] * centerZ + matrix[12];
    const worldY = matrix[1] * centerX + matrix[5] * centerY + matrix[9] * centerZ + matrix[13];
    const worldZ = matrix[2] * centerX + matrix[6] * centerY + matrix[10] * centerZ + matrix[14];
    const worldExtentX = Math.abs(matrix[0]) * extentX + Math.abs(matrix[4]) * extentY +
        Math.abs(matrix[8]) * extentZ;
    const worldExtentY = Math.abs(matrix[1]) * extentX + Math.abs(matrix[5]) * extentY +
        Math.abs(matrix[9]) * extentZ;
    const worldExtentZ = Math.abs(matrix[2]) * extentX + Math.abs(matrix[6]) * extentY +
        Math.abs(matrix[10]) * extentZ;
    includePoint(out, worldX - worldExtentX, worldY - worldExtentY, worldZ - worldExtentZ);
    includePoint(out, worldX + worldExtentX, worldY + worldExtentY, worldZ + worldExtentZ);
    return out;
};

export const transformBounds = (out, source, matrix, padding = 0) => {
    const expansion = Number(padding);
    if (!source?.valid || !Number.isFinite(expansion) || expansion < 0) {
        if (!Number.isFinite(expansion) || expansion < 0) throw new Error('Bounds padding must be finite and non-negative');
        return resetBounds(out);
    }
    resetBounds(out);
    includeTransformedAabb(out, source.minimum, source.maximum, matrix);
    if (expansion > 0) {
        for (let axis = 0; axis < AXES; axis++) {
            out.minimum[axis] -= expansion;
            out.maximum[axis] += expansion;
        }
    }
    return finalizeBounds(out);
};

export const boundsFromPositions = positions => {
    if (!(positions instanceof Float32Array) || positions.length === 0 || positions.length % 3 !== 0) {
        throw new Error('Geometry positions must be a non-empty Float32Array with three components per vertex');
    }
    const bounds = resetBounds(createBounds());
    for (let index = 0; index < positions.length; index += 3) {
        includePoint(bounds, positions[index], positions[index + 1], positions[index + 2]);
    }
    return finalizeBounds(bounds);
};

export const boundsIntersectsDistance = (bounds, x, y, z, distance) => {
    if (!bounds?.valid) return true;
    const limit = Number(distance);
    if (!Number.isFinite(limit) || limit <= 0) return true;
    let squared = 0;
    for (let axis = 0; axis < AXES; axis++) {
        const value = axis === 0 ? x : axis === 1 ? y : z;
        if (value < bounds.minimum[axis]) squared += (bounds.minimum[axis] - value) ** 2;
        else if (value > bounds.maximum[axis]) squared += (value - bounds.maximum[axis]) ** 2;
    }
    return squared <= limit * limit;
};

export const jointInfluenceBounds = (positions, joints, weights) => {
    if (!joints || !weights) return null;
    const vertexCount = positions.length / 3;
    if (joints.length !== vertexCount * 4 || weights.length !== vertexCount * 4) {
        throw new Error('Joint influence data must contain four entries per geometry vertex');
    }
    let count = 0;
    for (let index = 0; index < joints.length; index++) {
        if (weights[index] > 0) count = Math.max(count, Math.floor(joints[index]) + 1);
    }
    const minimum = new Float32Array(count * 3);
    const maximum = new Float32Array(count * 3);
    const active = new Uint8Array(count);
    minimum.fill(Infinity);
    maximum.fill(-Infinity);
    for (let vertex = 0; vertex < vertexCount; vertex++) {
        const positionOffset = vertex * 3;
        const influenceOffset = vertex * 4;
        for (let influence = 0; influence < 4; influence++) {
            if (!(weights[influenceOffset + influence] > 0)) continue;
            const joint = Math.floor(joints[influenceOffset + influence]);
            const offset = joint * 3;
            active[joint] = 1;
            for (let axis = 0; axis < 3; axis++) {
                const value = positions[positionOffset + axis];
                minimum[offset + axis] = Math.min(minimum[offset + axis], value);
                maximum[offset + axis] = Math.max(maximum[offset + axis], value);
            }
        }
    }
    return {minimum, maximum, active, count};
};

export const morphPositionBounds = morphTargets => morphTargets.map(target => {
    const positions = target.position ?? target.POSITION;
    return positions ? boundsFromPositions(positions) : null;
});
