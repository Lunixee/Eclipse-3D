const clamp01 = value => Math.max(0, Math.min(1, value));

export const normalizeQuaternion = (out, offset = 0) => {
    const length = Math.hypot(out[offset], out[offset + 1], out[offset + 2], out[offset + 3]);
    if (!Number.isFinite(length) || length < 1e-8) {
        out[offset] = 0;
        out[offset + 1] = 0;
        out[offset + 2] = 0;
        out[offset + 3] = 1;
        return out;
    }
    const inverse = 1 / length;
    out[offset] *= inverse;
    out[offset + 1] *= inverse;
    out[offset + 2] *= inverse;
    out[offset + 3] *= inverse;
    return out;
};

export const interpolateQuaternion = (out, outputOffset, left, leftOffset, right, rightOffset, amount) => {
    let dot = 0;
    for (let component = 0; component < 4; component++) dot += left[leftOffset + component] * right[rightOffset + component];
    const sign = dot < 0 ? -1 : 1;
    dot = Math.min(1, Math.abs(dot));
    const t = clamp01(amount);
    let leftWeight = 1 - t;
    let rightWeight = t * sign;
    if (dot < 0.9995) {
        const angle = Math.acos(dot);
        const inverseSine = 1 / Math.sin(angle);
        leftWeight = Math.sin((1 - t) * angle) * inverseSine;
        rightWeight = Math.sin(t * angle) * inverseSine * sign;
    }
    for (let component = 0; component < 4; component++) {
        out[outputOffset + component] = left[leftOffset + component] * leftWeight + right[rightOffset + component] * rightWeight;
    }
    return normalizeQuaternion(out, outputOffset);
};

const keyframeInterval = (times, time) => {
    if (times.length <= 1 || time <= times[0]) return 0;
    const last = times.length - 1;
    if (time >= times[last]) return last;
    let low = 0;
    let high = last;
    while (high - low > 1) {
        const middle = (low + high) >> 1;
        if (time < times[middle]) high = middle;
        else low = middle;
    }
    return low;
};

export const sampleAnimationSampler = (sampler, time, out, outputOffset = 0) => {
    const {input, output, components, interpolation, rotation} = sampler;
    if (input.length === 0) return out;
    const leftKey = keyframeInterval(input, time);
    const lastKey = input.length - 1;
    if (leftKey === lastKey || time <= input[0]) {
        const key = time <= input[0] ? 0 : lastKey;
        const sourceOffset = interpolation === 'CUBICSPLINE' ? (key * 3 + 1) * components : key * components;
        out.set(output.subarray(sourceOffset, sourceOffset + components), outputOffset);
        if (rotation) normalizeQuaternion(out, outputOffset);
        return out;
    }
    const rightKey = leftKey + 1;
    const leftTime = input[leftKey];
    const rightTime = input[rightKey];
    if (interpolation === 'STEP') {
        const sourceOffset = leftKey * components;
        out.set(output.subarray(sourceOffset, sourceOffset + components), outputOffset);
        if (rotation) normalizeQuaternion(out, outputOffset);
        return out;
    }
    const delta = rightTime - leftTime;
    const amount = delta > 0 ? clamp01((time - leftTime) / delta) : 0;
    if (interpolation === 'LINEAR') {
        const leftOffset = leftKey * components;
        const rightOffset = rightKey * components;
        if (rotation) return interpolateQuaternion(out, outputOffset, output, leftOffset, output, rightOffset, amount);
        for (let component = 0; component < components; component++) {
            const left = output[leftOffset + component];
            out[outputOffset + component] = left + (output[rightOffset + component] - left) * amount;
        }
        return out;
    }
    const leftValue = (leftKey * 3 + 1) * components;
    const leftTangent = (leftKey * 3 + 2) * components;
    const rightTangent = rightKey * 3 * components;
    const rightValue = (rightKey * 3 + 1) * components;
    const t2 = amount * amount;
    const t3 = t2 * amount;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + amount;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    for (let component = 0; component < components; component++) {
        out[outputOffset + component] = h00 * output[leftValue + component] +
            h10 * delta * output[leftTangent + component] +
            h01 * output[rightValue + component] +
            h11 * delta * output[rightTangent + component];
    }
    if (rotation) normalizeQuaternion(out, outputOffset);
    return out;
};

export const blendAnimationValue = (out, offset, left, right, components, amount, rotation = false) => {
    if (rotation) return interpolateQuaternion(out, offset, left, offset, right, offset, amount);
    for (let component = 0; component < components; component++) {
        const index = offset + component;
        out[index] = left[index] + (right[index] - left[index]) * amount;
    }
    return out;
};
