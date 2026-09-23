const MAX_UPDATE_STEP = 0.1;
const TWO_PI = Math.PI * 2;

export const TweenProperty = Object.freeze({
    POSITION: 'position',
    ROTATION: 'rotation',
    SCALE: 'scale',
    FOV: 'fov'
});

const now = () => typeof performance === 'object' ? performance.now() : 0;

const ease = (name, value) => {
    const t = Math.max(0, Math.min(1, value));
    switch (String(name).trim().toLowerCase()) {
    case 'ease-in': return t * t;
    case 'ease-out': return 1 - (1 - t) * (1 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    case 'smoothstep': return t * t * (3 - 2 * t);
    default: return t;
    }
};

const shortestAngleDelta = (from, to) => {
    let delta = (to - from) % TWO_PI;
    if (delta > Math.PI) delta -= TWO_PI;
    else if (delta < -Math.PI) delta += TWO_PI;
    return delta;
};

const createRecord = () => ({
    key: '',
    targetName: '',
    property: '',
    easing: 'linear',
    elapsed: 0,
    duration: 0,
    paused: false,
    components: 0,
    start: new Float64Array(3),
    delta: new Float64Array(3),
    value: new Float64Array(3)
});

/** Scene-owned tweens. They advance only from Engine.tick, never from a render pass. */
export class TweenStore {
    constructor(scene) {
        this.scene = scene;
        this.records = new Map();
        this.pool = [];
        this.metrics = {activeTweens: 0, tweenUpdates: 0, completedTweens: 0, tweenUpdateMs: 0, changed: false};
    }

    start(targetName, property, destination, seconds, easing = 'linear') {
        const name = String(targetName);
        const normalizedProperty = String(property).toLowerCase();
        const current = this.scene.tweenValues(name, normalizedProperty);
        const components = normalizedProperty === TweenProperty.FOV ? 1 : 3;
        if (!current || current.length < components) throw new Error(`Resource "${name}" cannot tween ${normalizedProperty}`);
        const duration = Number(seconds);
        if (!Number.isFinite(duration)) throw new Error('Tween duration must be finite');
        // A rejected replacement must leave the current trajectory and clock intact.
        for (let index = 0; index < components; index++) {
            if (!Number.isFinite(Number(destination[index]))) throw new Error('Tween destination values must be finite');
        }
        const key = `${name}\u0000${normalizedProperty}`;
        let record = this.records.get(key);
        if (!record) record = this.pool.pop() ?? createRecord();
        record.key = key;
        record.targetName = name;
        record.property = normalizedProperty;
        record.easing = String(easing).trim().toLowerCase();
        record.elapsed = 0;
        record.duration = Math.max(0, duration);
        record.paused = false;
        record.components = components;
        for (let index = 0; index < components; index++) {
            const target = Number(destination[index]);
            record.start[index] = current[index];
            record.delta[index] = normalizedProperty === TweenProperty.ROTATION ?
                shortestAngleDelta(current[index], target) : target - current[index];
        }
        this.records.set(key, record);
        if (record.duration === 0) {
            this.#apply(record, 1);
            this.#finish(record);
            this.metrics.completedTweens++;
            this.metrics.changed = true;
        }
        this.metrics.activeTweens = this.records.size;
        return record;
    }

    update(deltaSeconds) {
        const metrics = this.metrics;
        metrics.tweenUpdates = 0;
        metrics.completedTweens = 0;
        metrics.tweenUpdateMs = 0;
        metrics.changed = false;
        const delta = Math.max(0, Math.min(MAX_UPDATE_STEP, Number(deltaSeconds) || 0));
        if (delta === 0 || this.records.size === 0) {
            metrics.activeTweens = this.records.size;
            return metrics;
        }
        const started = now();
        for (const record of this.records.values()) {
            if (record.paused) continue;
            record.elapsed = Math.min(record.duration, record.elapsed + delta);
            const complete = record.duration - record.elapsed <= 1e-10;
            if (complete) record.elapsed = record.duration;
            this.#apply(record, complete ? 1 : ease(record.easing, record.elapsed / record.duration));
            metrics.tweenUpdates++;
            metrics.changed = true;
            if (complete) {
                this.#finish(record);
                metrics.completedTweens++;
            }
        }
        metrics.activeTweens = this.records.size;
        metrics.tweenUpdateMs = started ? now() - started : 0;
        return metrics;
    }

    pause(targetName) {
        let changed = false;
        for (const record of this.records.values()) {
            if (record.targetName !== String(targetName) || record.paused) continue;
            record.paused = true;
            changed = true;
        }
        return changed;
    }

    resume(targetName) {
        let changed = false;
        for (const record of this.records.values()) {
            if (record.targetName !== String(targetName) || !record.paused) continue;
            record.paused = false;
            changed = true;
        }
        return changed;
    }

    stop(targetName) {
        const name = String(targetName);
        let stopped = 0;
        for (const record of this.records.values()) {
            if (record.targetName !== name) continue;
            this.#finish(record);
            stopped++;
        }
        this.metrics.activeTweens = this.records.size;
        return stopped;
    }

    active(targetName) {
        const name = String(targetName);
        for (const record of this.records.values()) if (record.targetName === name) return true;
        return false;
    }

    clear() {
        for (const record of this.records.values()) this.pool.push(record);
        this.records.clear();
        this.metrics.activeTweens = 0;
        this.metrics.tweenUpdates = 0;
        this.metrics.completedTweens = 0;
        this.metrics.tweenUpdateMs = 0;
        this.metrics.changed = false;
    }

    #apply(record, amount) {
        for (let index = 0; index < record.components; index++) {
            record.value[index] = record.start[index] + record.delta[index] * amount;
        }
        this.scene.applyTweenValues(record.targetName, record.property, record.value);
    }

    #finish(record) {
        this.records.delete(record.key);
        this.pool.push(record);
    }
}
