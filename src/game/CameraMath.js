import {createMat4, multiply, perspective, safeAspect, viewFromEuler} from '../math/mat4.js';
import {invertMatrix} from '../models/modelMath.js';

const DEGREES_TO_RADIANS = Math.PI / 180;
const EPSILON = 1e-8;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const normalize3 = vector => {
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (!(length > EPSILON)) {
        vector.fill(0);
        return false;
    }
    vector[0] /= length;
    vector[1] /= length;
    vector[2] /= length;
    for (let axis = 0; axis < 3; axis++) if (Math.abs(vector[axis]) < EPSILON) vector[axis] = 0;
    return true;
};

const unproject = (out, matrix, x, y, z) => {
    const tx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const ty = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const tz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const tw = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    if (!Number.isFinite(tw) || Math.abs(tw) < EPSILON) {
        out.fill(0);
        return false;
    }
    out[0] = tx / tw;
    out[1] = ty / tw;
    out[2] = tz / tw;
    return Number.isFinite(out[0]) && Number.isFinite(out[1]) && Number.isFinite(out[2]);
};

/**
 * Cached perspective-camera matrices shared by rendering and gameplay queries.
 * The cache key deliberately excludes render scale and post settings: Scratch
 * stage coordinates describe the logical viewport, not an internal pixel grid.
 */
export class CameraMatrixCache {
    constructor() {
        this.projection = createMat4();
        this.view = createMat4();
        this.viewProjection = createMat4();
        this.inverseViewProjection = createMat4();
        this.right = new Float32Array(3);
        this.up = new Float32Array(3);
        this.forward = new Float32Array(3);
        this.position = new Float32Array(3);
        this.parameters = new Float64Array(10);
        this.parameters.fill(NaN);
        this.cameraId = -1;
        this.valid = false;
        this.recomputes = 0;
        this.nearScratch = new Float32Array(3);
        this.farScratch = new Float32Array(3);
    }

    update(objects, cameraId, width, height) {
        if (!objects?.alive?.[cameraId]) throw new Error('The active camera no longer exists');
        const offset = cameraId * 3;
        const aspect = safeAspect(finite(width, 1), finite(height, 1));
        const fov = finite(objects.camera[offset], 60);
        const near = finite(objects.camera[offset + 1], 0.1);
        const far = finite(objects.camera[offset + 2], 1000);
        const parameters = this.parameters;
        const changed = this.cameraId !== cameraId ||
            parameters[0] !== objects.position[offset] ||
            parameters[1] !== objects.position[offset + 1] ||
            parameters[2] !== objects.position[offset + 2] ||
            parameters[3] !== objects.rotation[offset] ||
            parameters[4] !== objects.rotation[offset + 1] ||
            parameters[5] !== objects.rotation[offset + 2] ||
            parameters[6] !== fov || parameters[7] !== near || parameters[8] !== far || parameters[9] !== aspect;
        if (!changed) return this;
        if (!(fov > 0 && fov < 180)) throw new Error('Camera field of view must be between 0 and 180 degrees');
        if (!(near > 0 && far > near)) throw new Error('Camera clip planes require 0 < near < far');
        this.cameraId = cameraId;
        parameters[0] = this.position[0] = objects.position[offset];
        parameters[1] = this.position[1] = objects.position[offset + 1];
        parameters[2] = this.position[2] = objects.position[offset + 2];
        parameters[3] = objects.rotation[offset];
        parameters[4] = objects.rotation[offset + 1];
        parameters[5] = objects.rotation[offset + 2];
        parameters[6] = fov;
        parameters[7] = near;
        parameters[8] = far;
        parameters[9] = aspect;
        perspective(this.projection, fov * DEGREES_TO_RADIANS, aspect, near, far);
        viewFromEuler(this.view, objects.position, objects.rotation, offset);
        multiply(this.viewProjection, this.projection, this.view);
        this.valid = invertMatrix(this.inverseViewProjection, this.viewProjection);
        this.right[0] = this.view[0];
        this.right[1] = this.view[4];
        this.right[2] = this.view[8];
        this.up[0] = this.view[1];
        this.up[1] = this.view[5];
        this.up[2] = this.view[9];
        this.forward[0] = -this.view[2];
        this.forward[1] = -this.view[6];
        this.forward[2] = -this.view[10];
        normalize3(this.right);
        normalize3(this.up);
        normalize3(this.forward);
        this.recomputes++;
        return this;
    }

    worldToStage(x, y, z, stageWidth, stageHeight, out = {}) {
        const matrix = this.viewProjection;
        const worldX = finite(x);
        const worldY = finite(y);
        const worldZ = finite(z);
        const clipX = matrix[0] * worldX + matrix[4] * worldY + matrix[8] * worldZ + matrix[12];
        const clipY = matrix[1] * worldX + matrix[5] * worldY + matrix[9] * worldZ + matrix[13];
        const clipZ = matrix[2] * worldX + matrix[6] * worldY + matrix[10] * worldZ + matrix[14];
        const clipW = matrix[3] * worldX + matrix[7] * worldY + matrix[11] * worldZ + matrix[15];
        const invertibleW = Number.isFinite(clipW) && Math.abs(clipW) > EPSILON;
        const ndcX = invertibleW ? clipX / clipW : 0;
        const ndcY = invertibleW ? clipY / clipW : 0;
        const ndcZ = invertibleW ? clipZ / clipW : 0;
        const width = Math.max(1, finite(stageWidth, 480));
        const height = Math.max(1, finite(stageHeight, 360));
        out.x = ndcX * width * 0.5;
        out.y = ndcY * height * 0.5;
        out.ndcX = ndcX;
        out.ndcY = ndcY;
        out.ndcZ = ndcZ;
        out.depth = Math.hypot(worldX - this.position[0], worldY - this.position[1], worldZ - this.position[2]);
        out.inFront = invertibleW && clipW > 0;
        out.visible = out.inFront && ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1 &&
            ndcZ >= -1 && ndcZ <= 1;
        return out;
    }

    stageToRay(stageX, stageY, stageWidth, stageHeight, out = {}) {
        const width = Math.max(1, finite(stageWidth, 480));
        const height = Math.max(1, finite(stageHeight, 360));
        const ndcX = finite(stageX) * 2 / width;
        const ndcY = finite(stageY) * 2 / height;
        const origin = out.origin instanceof Float32Array ? out.origin : new Float32Array(3);
        const direction = out.direction instanceof Float32Array ? out.direction : new Float32Array(3);
        origin.set(this.position);
        const valid = this.valid && unproject(this.nearScratch, this.inverseViewProjection, ndcX, ndcY, -1) &&
            unproject(this.farScratch, this.inverseViewProjection, ndcX, ndcY, 1);
        if (!valid) {
            direction.fill(0);
            out.valid = false;
        } else {
            direction[0] = this.farScratch[0] - origin[0];
            direction[1] = this.farScratch[1] - origin[1];
            direction[2] = this.farScratch[2] - origin[2];
            out.valid = normalize3(direction);
        }
        out.origin = origin;
        out.direction = direction;
        return out;
    }
}

export const basisFromEuler = (rotation, offset = 0, out = {}) => {
    const right = out.right instanceof Float32Array ? out.right : new Float32Array(3);
    const up = out.up instanceof Float32Array ? out.up : new Float32Array(3);
    const forward = out.forward instanceof Float32Array ? out.forward : new Float32Array(3);
    const sx = Math.sin(rotation[offset]);
    const cx = Math.cos(rotation[offset]);
    const sy = Math.sin(rotation[offset + 1]);
    const cy = Math.cos(rotation[offset + 1]);
    const sz = Math.sin(rotation[offset + 2]);
    const cz = Math.cos(rotation[offset + 2]);
    right[0] = cy * cz;
    right[1] = cy * sz;
    right[2] = -sy;
    up[0] = sx * sy * cz - cx * sz;
    up[1] = sx * sy * sz + cx * cz;
    up[2] = sx * cy;
    forward[0] = -(cx * sy * cz + sx * sz);
    forward[1] = -(cx * sy * sz - sx * cz);
    forward[2] = -cx * cy;
    normalize3(right);
    normalize3(up);
    normalize3(forward);
    out.right = right;
    out.up = up;
    out.forward = forward;
    return out;
};

/**
 * @param {ArrayLike<number>} position
 * @param {ArrayLike<number>} target
 * @param {ArrayLike<number> | null} [currentRotation]
 * @param {Float32Array} [out]
 */
export const lookAtEuler = (position, target, currentRotation = null, out = new Float32Array(3)) => {
    const dx = finite(target[0]) - finite(position[0]);
    const dy = finite(target[1]) - finite(position[1]);
    const dz = finite(target[2]) - finite(position[2]);
    const length = Math.hypot(dx, dy, dz);
    if (!(length > EPSILON)) {
        if (currentRotation) out.set(currentRotation);
        else out.fill(0);
        return false;
    }
    const normalizedY = Math.max(-1, Math.min(1, dy / length));
    out[0] = Math.asin(normalizedY);
    const horizontal = Math.hypot(dx, dz);
    out[1] = horizontal > EPSILON ? Math.atan2(-dx, -dz) : finite(currentRotation?.[1]);
    // Look-at has an intentionally stable horizon: it never introduces roll.
    out[2] = 0;
    return true;
};
