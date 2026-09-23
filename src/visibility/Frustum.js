const PLANE_COUNT = 6;
const PLANE_STRIDE = 4;

const setPlane = (planes, index, x, y, z, distance) => {
    const length = Math.hypot(x, y, z);
    const offset = index * PLANE_STRIDE;
    if (!(length > 1e-12) || !Number.isFinite(length)) {
        planes[offset] = 0;
        planes[offset + 1] = 0;
        planes[offset + 2] = 0;
        planes[offset + 3] = Infinity;
        return;
    }
    const inverse = 1 / length;
    planes[offset] = x * inverse;
    planes[offset + 1] = y * inverse;
    planes[offset + 2] = z * inverse;
    planes[offset + 3] = distance * inverse;
};

export class Frustum {
    constructor() {
        this.planes = new Float32Array(PLANE_COUNT * PLANE_STRIDE);
        this.version = 0;
    }

    setFromMatrix(matrix) {
        if (!matrix || matrix.length < 16) throw new Error('A 4x4 view-projection matrix is required');
        setPlane(this.planes, 0, matrix[3] + matrix[0], matrix[7] + matrix[4], matrix[11] + matrix[8], matrix[15] + matrix[12]);
        setPlane(this.planes, 1, matrix[3] - matrix[0], matrix[7] - matrix[4], matrix[11] - matrix[8], matrix[15] - matrix[12]);
        setPlane(this.planes, 2, matrix[3] + matrix[1], matrix[7] + matrix[5], matrix[11] + matrix[9], matrix[15] + matrix[13]);
        setPlane(this.planes, 3, matrix[3] - matrix[1], matrix[7] - matrix[5], matrix[11] - matrix[9], matrix[15] - matrix[13]);
        setPlane(this.planes, 4, matrix[3] + matrix[2], matrix[7] + matrix[6], matrix[11] + matrix[10], matrix[15] + matrix[14]);
        setPlane(this.planes, 5, matrix[3] - matrix[2], matrix[7] - matrix[6], matrix[11] - matrix[10], matrix[15] - matrix[14]);
        this.version++;
        return this;
    }

    intersectsSphere(center, radius) {
        const safeRadius = Math.max(0, Number(radius) || 0);
        for (let plane = 0; plane < PLANE_COUNT; plane++) {
            const offset = plane * PLANE_STRIDE;
            if (this.planes[offset] * center[0] + this.planes[offset + 1] * center[1] +
                this.planes[offset + 2] * center[2] + this.planes[offset + 3] < -safeRadius) return false;
        }
        return true;
    }

    intersectsAabb(minimum, maximum) {
        for (let plane = 0; plane < PLANE_COUNT; plane++) {
            const offset = plane * PLANE_STRIDE;
            const x = this.planes[offset] >= 0 ? maximum[0] : minimum[0];
            const y = this.planes[offset + 1] >= 0 ? maximum[1] : minimum[1];
            const z = this.planes[offset + 2] >= 0 ? maximum[2] : minimum[2];
            if (this.planes[offset] * x + this.planes[offset + 1] * y +
                this.planes[offset + 2] * z + this.planes[offset + 3] < 0) return false;
        }
        return true;
    }

    intersectsBounds(bounds) {
        if (!bounds?.valid) return true;
        return this.intersectsSphere(bounds.center, bounds.radius) &&
            this.intersectsAabb(bounds.minimum, bounds.maximum);
    }
}
