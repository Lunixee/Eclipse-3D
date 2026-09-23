const EPSILON = 1e-12;

export const vectorLength = (x, y, z) => Math.hypot(Number(x) || 0, Number(y) || 0, Number(z) || 0);

export const distance3 = (ax, ay, az, bx, by, bz) => Math.hypot(
    (Number(bx) || 0) - (Number(ax) || 0),
    (Number(by) || 0) - (Number(ay) || 0),
    (Number(bz) || 0) - (Number(az) || 0)
);

export const dot3 = (ax, ay, az, bx, by, bz) =>
    (Number(ax) || 0) * (Number(bx) || 0) +
    (Number(ay) || 0) * (Number(by) || 0) +
    (Number(az) || 0) * (Number(bz) || 0);

export const normalizeVector = (out, x, y, z) => {
    const nx = Number(x) || 0;
    const ny = Number(y) || 0;
    const nz = Number(z) || 0;
    const length = Math.hypot(nx, ny, nz);
    if (!(length > EPSILON)) {
        out.fill(0);
        return false;
    }
    out[0] = nx / length;
    out[1] = ny / length;
    out[2] = nz / length;
    return true;
};

export const direction3 = (out, ax, ay, az, bx, by, bz) => normalizeVector(
    out,
    (Number(bx) || 0) - (Number(ax) || 0),
    (Number(by) || 0) - (Number(ay) || 0),
    (Number(bz) || 0) - (Number(az) || 0)
);

export const cross3 = (out, ax, ay, az, bx, by, bz) => {
    const a0 = Number(ax) || 0;
    const a1 = Number(ay) || 0;
    const a2 = Number(az) || 0;
    const b0 = Number(bx) || 0;
    const b1 = Number(by) || 0;
    const b2 = Number(bz) || 0;
    out[0] = a1 * b2 - a2 * b1;
    out[1] = a2 * b0 - a0 * b2;
    out[2] = a0 * b1 - a1 * b0;
    return out;
};

export const angleBetween3 = (ax, ay, az, bx, by, bz) => {
    const aLength = vectorLength(ax, ay, az);
    const bLength = vectorLength(bx, by, bz);
    if (!(aLength > EPSILON && bLength > EPSILON)) return 0;
    const cosine = Math.max(-1, Math.min(1, dot3(ax, ay, az, bx, by, bz) / (aLength * bLength)));
    return Math.acos(cosine) * 180 / Math.PI;
};

export const lerp = (start, end, amount) => {
    const t = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return (Number(start) || 0) + ((Number(end) || 0) - (Number(start) || 0)) * t;
};

export const clamp = (value, minimum, maximum) => {
    let low = Number(minimum) || 0;
    let high = Number(maximum) || 0;
    if (low > high) [low, high] = [high, low];
    return Math.max(low, Math.min(high, Number(value) || 0));
};

