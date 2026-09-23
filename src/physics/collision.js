// Translation-only narrow phase. Normal points from B toward A (A's escape
// direction). One representative point, not a rigid-body contact manifold.
export const CONTACT_EPSILON = 1e-5;

export const collide = (a, b, out) => {
    if (a.shape === 'box' && b.shape === 'box') return boxes(a, b, out);
    if (a.shape === 'sphere' && b.shape === 'sphere') {
        const x = a.position[0] - b.position[0];
        const y = a.position[1] - b.position[1];
        const z = a.position[2] - b.position[2];
        const distance = Math.hypot(x, y, z);
        const depth = a.size[0] + b.size[0] - distance;
        if (depth < -CONTACT_EPSILON) return false;
        out.nx = distance > 1e-12 ? x / distance : 1;
        out.ny = distance > 1e-12 ? y / distance : 0;
        out.nz = distance > 1e-12 ? z / distance : 0;
        out.depth = Math.max(0, depth);
        out.px = a.position[0] - out.nx * a.size[0];
        out.py = a.position[1] - out.ny * a.size[0];
        out.pz = a.position[2] - out.nz * a.size[0];
        return true;
    }
    if (a.shape === 'sphere') return sphereBox(a, b, out);
    if (!sphereBox(b, a, out)) return false;
    out.nx = -out.nx;
    out.ny = -out.ny;
    out.nz = -out.nz;
    return true;
};

const boxes = (a, b, out) => {
    let depth = Infinity;
    let normalAxis = 0;
    let normalSign = 1;
    for (let axis = 0; axis < 3; axis++) {
        const difference = a.position[axis] - b.position[axis];
        const overlap = a.size[axis] + b.size[axis] - Math.abs(difference);
        if (overlap < -CONTACT_EPSILON) return false;
        if (overlap < depth) {
            depth = overlap;
            normalAxis = axis;
            normalSign = difference >= 0 ? 1 : -1;
        }
    }
    out.nx = normalAxis === 0 ? normalSign : 0;
    out.ny = normalAxis === 1 ? normalSign : 0;
    out.nz = normalAxis === 2 ? normalSign : 0;
    out.depth = Math.max(0, depth);
    out.px = midpoint(a, b, 0);
    out.py = midpoint(a, b, 1);
    out.pz = midpoint(a, b, 2);
    return true;
};

const midpoint = (a, b, axis) => (Math.max(a.position[axis] - a.size[axis], b.position[axis] - b.size[axis]) +
    Math.min(a.position[axis] + a.size[axis], b.position[axis] + b.size[axis])) * 0.5;

const sphereBox = (sphere, box, out) => {
    const x = sphere.position[0];
    const y = sphere.position[1];
    const z = sphere.position[2];
    out.px = Math.max(box.position[0] - box.size[0], Math.min(box.position[0] + box.size[0], x));
    out.py = Math.max(box.position[1] - box.size[1], Math.min(box.position[1] + box.size[1], y));
    out.pz = Math.max(box.position[2] - box.size[2], Math.min(box.position[2] + box.size[2], z));
    const dx = x - out.px;
    const dy = y - out.py;
    const dz = z - out.pz;
    const distance = Math.hypot(dx, dy, dz);
    if (distance > sphere.size[0] + CONTACT_EPSILON) return false;
    if (distance > 1e-12) {
        out.nx = dx / distance;
        out.ny = dy / distance;
        out.nz = dz / distance;
        out.depth = Math.max(0, sphere.size[0] - distance);
        return true;
    }
    // Center inside/on box: push to the nearest face, including containment.
    let nearest = Infinity;
    let normalAxis = 0;
    let sign = 1;
    for (let axis = 0; axis < 3; axis++) {
        const difference = sphere.position[axis] - box.position[axis];
        const gap = box.size[axis] - Math.abs(difference);
        if (gap < nearest) { nearest = gap; normalAxis = axis; sign = difference >= 0 ? 1 : -1; }
    }
    out.nx = normalAxis === 0 ? sign : 0;
    out.ny = normalAxis === 1 ? sign : 0;
    out.nz = normalAxis === 2 ? sign : 0;
    out.px = x + out.nx * nearest;
    out.py = y + out.ny * nearest;
    out.pz = z + out.nz * nearest;
    out.depth = sphere.size[0] + nearest;
    return true;
};
