import {BillboardMode} from './EffectStore.js';

const normalize = (out, x, y, z, fallback) => {
    const length = Math.hypot(x, y, z);
    if (length > 1e-8 && Number.isFinite(length)) {
        out[0] = x / length;
        out[1] = y / length;
        out[2] = z / length;
    } else {
        out.set(fallback);
    }
};

const cross = (out, left, right) => {
    const x = left[1] * right[2] - left[2] * right[1];
    const y = left[2] * right[0] - left[0] * right[2];
    const z = left[0] * right[1] - left[1] * right[0];
    out.set([x, y, z]);
};

/**
 * CPU reference for the basis derived by the effect vertex shader. Rendering remains
 * shader-derived; this function exists for deterministic validation,
 * editor previews, and future public tooling.
 */
export const computeBillboardBasis = (
    outRight,
    outUp,
    mode,
    position,
    cameraPosition,
    cameraRight,
    cameraUp,
    fixedRight,
    fixedUp
) => {
    const forward = new Float32Array(3);
    const scratch = new Float32Array(3);
    if (mode === BillboardMode.FIXED) {
        normalize(outRight, fixedRight[0], fixedRight[1], fixedRight[2], cameraRight);
        normalize(outUp, fixedUp[0], fixedUp[1], fixedUp[2], cameraUp);
        return;
    }
    if (mode === BillboardMode.SCREEN_ALIGNED) {
        normalize(outRight, cameraRight[0], cameraRight[1], cameraRight[2], [1, 0, 0]);
        normalize(outUp, cameraUp[0], cameraUp[1], cameraUp[2], [0, 1, 0]);
        return;
    }
    if (mode === BillboardMode.Y_AXIS) {
        const fallbackForward = [-cameraRight[2], 0, cameraRight[0]];
        normalize(
            forward,
            cameraPosition[0] - position[0],
            0,
            cameraPosition[2] - position[2],
            fallbackForward
        );
        cross(scratch, [0, 1, 0], forward);
        normalize(outRight, scratch[0], scratch[1], scratch[2], cameraRight);
        outUp.set([0, 1, 0]);
        return;
    }
    const fallbackForward = new Float32Array(3);
    cross(fallbackForward, cameraRight, cameraUp);
    normalize(
        forward,
        cameraPosition[0] - position[0],
        cameraPosition[1] - position[1],
        cameraPosition[2] - position[2],
        [-fallbackForward[0], -fallbackForward[1], -fallbackForward[2]]
    );
    cross(scratch, [0, 1, 0], forward);
    normalize(outRight, scratch[0], scratch[1], scratch[2], cameraRight);
    cross(scratch, forward, outRight);
    normalize(outUp, scratch[0], scratch[1], scratch[2], cameraUp);
};
