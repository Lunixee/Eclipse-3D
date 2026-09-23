export const identityMatrix = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export const multiplyMatrices = (out, left, right, outputOffset = 0, rightOffset = 0) => {
    for (let column = 0; column < 4; column++) {
        const offset = column * 4 + outputOffset;
        const input = column * 4 + rightOffset;
        const x = right[input];
        const y = right[input + 1];
        const z = right[input + 2];
        const w = right[input + 3];
        out[offset] = left[0] * x + left[4] * y + left[8] * z + left[12] * w;
        out[offset + 1] = left[1] * x + left[5] * y + left[9] * z + left[13] * w;
        out[offset + 2] = left[2] * x + left[6] * y + left[10] * z + left[14] * w;
        out[offset + 3] = left[3] * x + left[7] * y + left[11] * z + left[15] * w;
    }
    return out;
};

export const invertMatrix = (out, matrix) => {
    const a00 = matrix[0];
    const a01 = matrix[1];
    const a02 = matrix[2];
    const a03 = matrix[3];
    const a10 = matrix[4];
    const a11 = matrix[5];
    const a12 = matrix[6];
    const a13 = matrix[7];
    const a20 = matrix[8];
    const a21 = matrix[9];
    const a22 = matrix[10];
    const a23 = matrix[11];
    const a30 = matrix[12];
    const a31 = matrix[13];
    const a32 = matrix[14];
    const a33 = matrix[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return false;
    const inverse = 1 / determinant;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inverse;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inverse;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inverse;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inverse;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inverse;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inverse;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inverse;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inverse;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inverse;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inverse;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inverse;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inverse;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inverse;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inverse;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inverse;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inverse;
    return true;
};

export const composeTrs = (out, translation, rotation, scale, translationOffset = 0, rotationOffset = 0, scaleOffset = 0) => {
    const x = rotation[rotationOffset];
    const y = rotation[rotationOffset + 1];
    const z = rotation[rotationOffset + 2];
    const w = rotation[rotationOffset + 3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    out[0] = (1 - yy - zz) * scale[scaleOffset];
    out[1] = (xy + wz) * scale[scaleOffset];
    out[2] = (xz - wy) * scale[scaleOffset];
    out[3] = 0;
    out[4] = (xy - wz) * scale[scaleOffset + 1];
    out[5] = (1 - xx - zz) * scale[scaleOffset + 1];
    out[6] = (yz + wx) * scale[scaleOffset + 1];
    out[7] = 0;
    out[8] = (xz + wy) * scale[scaleOffset + 2];
    out[9] = (yz - wx) * scale[scaleOffset + 2];
    out[10] = (1 - xx - yy) * scale[scaleOffset + 2];
    out[11] = 0;
    out[12] = translation[translationOffset];
    out[13] = translation[translationOffset + 1];
    out[14] = translation[translationOffset + 2];
    out[15] = 1;
    return out;
};

export const composeEulerTrs = (
    out,
    position,
    rotation,
    scale,
    positionOffset = 0,
    rotationOffset = 0,
    scaleOffset = 0
) => {
    const hx = rotation[rotationOffset] * 0.5;
    const hy = rotation[rotationOffset + 1] * 0.5;
    const hz = rotation[rotationOffset + 2] * 0.5;
    const sx = Math.sin(hx);
    const cx = Math.cos(hx);
    const sy = Math.sin(hy);
    const cy = Math.cos(hy);
    const sz = Math.sin(hz);
    const cz = Math.cos(hz);
    const x = sx * cy * cz + cx * sy * sz;
    const y = cx * sy * cz - sx * cy * sz;
    const z = cx * cy * sz + sx * sy * cz;
    const w = cx * cy * cz - sx * sy * sz;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const scaleX = scale[scaleOffset];
    const scaleY = scale[scaleOffset + 1];
    const scaleZ = scale[scaleOffset + 2];
    out[0] = (1 - yy - zz) * scaleX;
    out[1] = (xy + wz) * scaleX;
    out[2] = (xz - wy) * scaleX;
    out[3] = 0;
    out[4] = (xy - wz) * scaleY;
    out[5] = (1 - xx - zz) * scaleY;
    out[6] = (yz + wx) * scaleY;
    out[7] = 0;
    out[8] = (xz + wy) * scaleZ;
    out[9] = (yz - wx) * scaleZ;
    out[10] = (1 - xx - yy) * scaleZ;
    out[11] = 0;
    out[12] = position[positionOffset];
    out[13] = position[positionOffset + 1];
    out[14] = position[positionOffset + 2];
    out[15] = 1;
    return out;
};

export const transformPoint = (out, matrix, point) => {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    return out;
};
