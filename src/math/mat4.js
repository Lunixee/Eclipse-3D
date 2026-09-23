const EPSILON = 1e-8;

export const createMat4 = () => new Float32Array(16);

export const identity = out => {
    out.fill(0);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
};

export const perspective = (out, fieldOfViewRadians, aspect, near, far) => {
    const f = 1 / Math.tan(fieldOfViewRadians / 2);
    const rangeInverse = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * rangeInverse;
    out[11] = -1;
    out[14] = 2 * far * near * rangeInverse;
    return out;
};

export const orthographic = (out, left, right, bottom, top, near, far) => {
    const width = 1 / (left - right);
    const height = 1 / (bottom - top);
    const depth = 1 / (near - far);
    out.fill(0);
    out[0] = -2 * width;
    out[5] = -2 * height;
    out[10] = 2 * depth;
    out[12] = (left + right) * width;
    out[13] = (top + bottom) * height;
    out[14] = (far + near) * depth;
    out[15] = 1;
    return out;
};

export const lookAt = (out, eye, center, up) => {
    let zx = eye[0] - center[0];
    let zy = eye[1] - center[1];
    let zz = eye[2] - center[2];
    let length = Math.hypot(zx, zy, zz) || 1;
    zx /= length;
    zy /= length;
    zz /= length;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    length = Math.hypot(xx, xy, xz) || 1;
    xx /= length;
    xy /= length;
    xz /= length;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx;
    out[1] = yx;
    out[2] = zx;
    out[3] = 0;
    out[4] = xy;
    out[5] = yy;
    out[6] = zy;
    out[7] = 0;
    out[8] = xz;
    out[9] = yz;
    out[10] = zz;
    out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
};

export const viewFromEuler = (out, position, rotation, offset = 0) => {
    const sx = Math.sin(rotation[offset]);
    const cx = Math.cos(rotation[offset]);
    const sy = Math.sin(rotation[offset + 1]);
    const cy = Math.cos(rotation[offset + 1]);
    const sz = Math.sin(rotation[offset + 2]);
    const cz = Math.cos(rotation[offset + 2]);

    const r00 = cy * cz;
    const r01 = sx * sy * cz - cx * sz;
    const r02 = cx * sy * cz + sx * sz;
    const r10 = cy * sz;
    const r11 = sx * sy * sz + cx * cz;
    const r12 = cx * sy * sz - sx * cz;
    const r20 = -sy;
    const r21 = sx * cy;
    const r22 = cx * cy;

    out[0] = r00;
    out[1] = r01;
    out[2] = r02;
    out[3] = 0;
    out[4] = r10;
    out[5] = r11;
    out[6] = r12;
    out[7] = 0;
    out[8] = r20;
    out[9] = r21;
    out[10] = r22;
    out[11] = 0;
    out[12] = -(r00 * position[offset] + r10 * position[offset + 1] + r20 * position[offset + 2]);
    out[13] = -(r01 * position[offset] + r11 * position[offset + 1] + r21 * position[offset + 2]);
    out[14] = -(r02 * position[offset] + r12 * position[offset + 1] + r22 * position[offset + 2]);
    out[15] = 1;
    return out;
};

export const multiply = (out, left, right) => {
    for (let column = 0; column < 4; column++) {
        const offset = column * 4;
        const x = right[offset];
        const y = right[offset + 1];
        const z = right[offset + 2];
        const w = right[offset + 3];
        out[offset] = left[0] * x + left[4] * y + left[8] * z + left[12] * w;
        out[offset + 1] = left[1] * x + left[5] * y + left[9] * z + left[13] * w;
        out[offset + 2] = left[2] * x + left[6] * y + left[10] * z + left[14] * w;
        out[offset + 3] = left[3] * x + left[7] * y + left[11] * z + left[15] * w;
    }
    return out;
};

export const safeAspect = (width, height) => height > EPSILON ? width / height : 1;
