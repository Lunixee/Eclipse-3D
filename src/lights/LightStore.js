export const LocalLightType = Object.freeze({
    POINT: 'point',
    SPOT: 'spot'
});

export const MAX_LOCAL_LIGHT_INTENSITY = 1000;
export const MAX_LOCAL_LIGHT_RANGE = 100_000;
export const MAX_SPOT_ANGLE = 89.9;

const requireFinite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

const requireFiniteFloat = (value, label) => {
    const number = Math.fround(requireFinite(value, label));
    if (!Number.isFinite(number)) throw new Error(`${label} exceeds the WebGL float range`);
    return number;
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

class LocalLightResource {
    /**
     * @param {LightStore} store
     * @param {number} id
     * @param {string} name
     * @param {string} type
     * @param {object} owner
     */
    constructor(store, id, name, type, owner) {
        this.store = store;
        this.id = id;
        this.name = name;
        this.type = type;
        this.owner = owner;
        this.enabled = true;
        this.position = new Float32Array(3);
        this.direction = new Float32Array([0, -1, 0]);
        this.color = new Float32Array([1, 1, 1]);
        this.intensity = 1;
        this.range = 10;
        this.innerAngle = 20;
        this.outerAngle = 30;
        this.innerCos = Math.cos(this.innerAngle * Math.PI / 180);
        this.outerCos = Math.cos(this.outerAngle * Math.PI / 180);
        this.revision = 1;
        this.disposed = false;
    }

    setPosition(x, y, z) {
        const nextX = requireFiniteFloat(x, 'Light x');
        const nextY = requireFiniteFloat(y, 'Light y');
        const nextZ = requireFiniteFloat(z, 'Light z');
        if (this.position[0] === nextX && this.position[1] === nextY && this.position[2] === nextZ) return;
        this.position[0] = nextX;
        this.position[1] = nextY;
        this.position[2] = nextZ;
        this.#changed();
    }

    setColor(color) {
        if (!color || color.length < 3) throw new Error('Light color must contain three finite values');
        const red = Math.fround(clamp(requireFinite(color[0], 'Light red'), 0, 1));
        const green = Math.fround(clamp(requireFinite(color[1], 'Light green'), 0, 1));
        const blue = Math.fround(clamp(requireFinite(color[2], 'Light blue'), 0, 1));
        if (this.color[0] === red && this.color[1] === green && this.color[2] === blue) return;
        this.color[0] = red;
        this.color[1] = green;
        this.color[2] = blue;
        this.#changed();
    }

    setIntensity(value) {
        const next = clamp(requireFinite(value, 'Light intensity'), 0, MAX_LOCAL_LIGHT_INTENSITY);
        if (this.intensity === next) return;
        this.intensity = next;
        this.#changed();
    }

    setRange(value) {
        const number = requireFinite(value, 'Light range');
        if (number < 0) throw new Error('Light range must be non-negative');
        const next = Math.min(number, MAX_LOCAL_LIGHT_RANGE);
        if (this.range === next) return;
        this.range = next;
        this.#changed();
    }

    setEnabled(value) {
        const next = Boolean(value);
        if (this.enabled === next) return;
        this.enabled = next;
        this.#changed();
    }

    setDirection(x, y, z) {
        if (this.type !== LocalLightType.SPOT) throw new Error(`Light "${this.name}" is not a spot light`);
        const nextX = requireFinite(x, 'Spot direction x');
        const nextY = requireFinite(y, 'Spot direction y');
        const nextZ = requireFinite(z, 'Spot direction z');
        const length = Math.hypot(nextX, nextY, nextZ);
        if (length < 1e-8) throw new Error('Spot direction must not be zero length');
        const inverse = 1 / length;
        const normalizedX = Math.fround(nextX * inverse);
        const normalizedY = Math.fround(nextY * inverse);
        const normalizedZ = Math.fround(nextZ * inverse);
        if (this.direction[0] === normalizedX && this.direction[1] === normalizedY &&
            this.direction[2] === normalizedZ) return;
        this.direction[0] = normalizedX;
        this.direction[1] = normalizedY;
        this.direction[2] = normalizedZ;
        this.#changed();
    }

    pointToward(x, y, z) {
        this.setDirection(
            requireFinite(x, 'Target x') - this.position[0],
            requireFinite(y, 'Target y') - this.position[1],
            requireFinite(z, 'Target z') - this.position[2]
        );
    }

    setInnerAngle(value) {
        if (this.type !== LocalLightType.SPOT) throw new Error(`Light "${this.name}" is not a spot light`);
        const next = Math.min(clamp(requireFinite(value, 'Spot inner angle'), 0, MAX_SPOT_ANGLE), this.outerAngle);
        if (this.innerAngle === next) return;
        this.innerAngle = next;
        this.#updateCones();
    }

    setOuterAngle(value) {
        if (this.type !== LocalLightType.SPOT) throw new Error(`Light "${this.name}" is not a spot light`);
        const next = Math.max(clamp(requireFinite(value, 'Spot outer angle'), 0, MAX_SPOT_ANGLE), this.innerAngle);
        if (this.outerAngle === next) return;
        this.outerAngle = next;
        this.#updateCones();
    }

    #updateCones() {
        this.innerCos = Math.cos(this.innerAngle * Math.PI / 180);
        this.outerCos = Math.cos(this.outerAngle * Math.PI / 180);
        this.#changed();
    }

    #changed() {
        if (this.disposed) throw new Error(`Light "${this.name}" has been disposed`);
        this.revision++;
        this.store.changed(this);
    }
}

export class LightStore {
    /** @param {((resource: LocalLightResource | null) => void) | null} [onChange] */
    constructor(onChange = null) {
        this.onChange = onChange;
        this.resources = new Map();
        this.byId = new Map();
        this.nextId = 0;
        this.version = 1;
    }

    /** @param {string} name @param {object} owner */
    createPoint(name, owner) {
        return this.#create(name, LocalLightType.POINT, owner);
    }

    /** @param {string} name @param {object} owner */
    createSpot(name, owner) {
        return this.#create(name, LocalLightType.SPOT, owner);
    }

    /** @param {string} name @param {object | null} [owner] */
    require(name, owner = null) {
        const resource = this.resources.get(name);
        if (!resource || resource.disposed) throw new Error(`Unknown local light "${name}"`);
        if (owner !== null && resource.owner !== owner) throw new Error(`Light "${name}" belongs to another scene`);
        return resource;
    }

    resourceForId(id) {
        return this.byId.get(id) ?? null;
    }

    has(name) {
        return this.resources.has(name);
    }

    /** @param {string} name @param {object | null} [owner] */
    delete(name, owner = null) {
        const resource = this.require(name, owner);
        this.#disposeResource(resource);
    }

    /** @param {number} id @param {object | null} [owner] */
    deleteById(id, owner = null) {
        const resource = this.byId.get(id);
        if (!resource) return false;
        if (owner !== null && resource.owner !== owner) throw new Error(`Light "${resource.name}" belongs to another scene`);
        this.#disposeResource(resource);
        return true;
    }

    changed(resource) {
        if (!this.byId.has(resource.id)) return;
        this.version++;
        this.onChange?.(resource);
    }

    clear() {
        if (this.resources.size === 0) return;
        for (const resource of this.resources.values()) resource.disposed = true;
        this.resources.clear();
        this.byId.clear();
        this.version++;
        this.onChange?.(null);
    }

    get count() {
        return this.resources.size;
    }

    #create(name, type, owner) {
        if (this.resources.has(name)) throw new Error(`A local light named "${name}" already exists`);
        const resource = new LocalLightResource(this, this.nextId++, name, type, owner);
        this.resources.set(name, resource);
        this.byId.set(resource.id, resource);
        this.version++;
        this.onChange?.(resource);
        return resource;
    }

    #disposeResource(resource) {
        this.resources.delete(resource.name);
        this.byId.delete(resource.id);
        resource.disposed = true;
        this.version++;
        this.onChange?.(resource);
    }
}
