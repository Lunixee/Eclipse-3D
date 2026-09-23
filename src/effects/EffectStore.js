import {createBounds, setBounds} from '../visibility/Bounds.js';

const TAU = Math.PI * 2;
const MAX_PARTICLES = 1000000;
const MAX_FRAME_DIMENSION = 4096;
const MAX_DELTA_SECONDS = 0.1;

export const EffectKind = Object.freeze({
    SPRITE: 'sprite',
    PARTICLE_EMITTER: 'particle-emitter',
    DECAL: 'decal'
});

export const BillboardMode = Object.freeze({
    FULL: 'full',
    Y_AXIS: 'y-axis',
    FIXED: 'fixed',
    SCREEN_ALIGNED: 'screen-aligned'
});

export const EffectAlphaMode = Object.freeze({
    OPAQUE: 'opaque',
    CUTOUT: 'cutout',
    BLEND: 'blend',
    ADDITIVE: 'additive'
});

export const EffectLighting = Object.freeze({
    UNLIT: 'unlit',
    LIT: 'lit'
});

export const ParticleSpawnShape = Object.freeze({
    POINT: 'point',
    BOX: 'box',
    SPHERE: 'sphere'
});

const BILLBOARD_MODES = new Set(Object.values(BillboardMode));
const ALPHA_MODES = new Set(Object.values(EffectAlphaMode));
const LIGHTING_MODES = new Set(Object.values(EffectLighting));
const SPAWN_SHAPES = new Set(Object.values(ParticleSpawnShape));

const now = () => globalThis.performance?.now?.() ?? 0;

const finite = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number`);
    return number;
};

const nonNegative = (value, label) => {
    const number = finite(value, label);
    if (number < 0) throw new Error(`${label} must not be negative`);
    return number;
};

const positive = (value, label) => {
    const number = finite(value, label);
    if (number <= 0) throw new Error(`${label} must be greater than zero`);
    return number;
};

const positiveInteger = (value, label, maximum = Number.MAX_SAFE_INTEGER) => {
    const number = Math.floor(finite(value, label));
    if (number < 1 || number > maximum) {
        throw new Error(`${label} must be an integer from 1 to ${maximum}`);
    }
    return number;
};

const enumValue = (value, allowed, label) => {
    const normalized = String(value).trim().toLowerCase();
    if (!allowed.has(normalized)) throw new Error(`Unknown ${label} "${value}"`);
    return normalized;
};

const booleanValue = value => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    const normalized = String(value).trim().toLowerCase();
    if (['on', 'true', 'yes', '1'].includes(normalized)) return true;
    if (['off', 'false', 'no', '0'].includes(normalized)) return false;
    throw new Error(`Expected true or false, received "${value}"`);
};

const colorInto = (target, red, green, blue, alpha = target[3]) => {
    const values = [red, green, blue, alpha].map((value, index) => finite(value, `Color channel ${index + 1}`));
    for (let index = 0; index < 4; index++) target[index] = Math.max(0, values[index]);
};

const setEulerBasis = (resource, x, y, z) => {
    const sx = Math.sin(x);
    const cx = Math.cos(x);
    const sy = Math.sin(y);
    const cy = Math.cos(y);
    const sz = Math.sin(z);
    const cz = Math.cos(z);
    resource.right[0] = cy * cz;
    resource.right[1] = cy * sz;
    resource.right[2] = -sy;
    resource.up[0] = sx * sy * cz - cx * sz;
    resource.up[1] = sx * sy * sz + cx * cz;
    resource.up[2] = sx * cy;
};

const normalize3 = (out, x, y, z, label) => {
    const length = Math.hypot(x, y, z);
    if (!Number.isFinite(length) || length < 1e-8) throw new Error(`${label} must be a non-zero finite vector`);
    out[0] = x / length;
    out[1] = y / length;
    out[2] = z / length;
};

const wrapAngle = angle => {
    const wrapped = angle % TAU;
    return wrapped < 0 ? wrapped + TAU : wrapped;
};

class VisualEffect {
    constructor(store, name, kind, textureId, defaults = {}) {
        this.store = store;
        this.name = name;
        this.kind = kind;
        this.textureId = textureId;
        this.position = new Float32Array(3);
        this.rotation = new Float32Array(3);
        this.size = new Float32Array(defaults.size ?? [1, 1]);
        this.pivot = new Float32Array(defaults.pivot ?? [0.5, 0.5]);
        this.right = new Float32Array([1, 0, 0]);
        this.up = new Float32Array([0, 1, 0]);
        this.tint = new Float32Array([1, 1, 1, 1]);
        this.billboardMode = defaults.billboardMode ?? BillboardMode.FULL;
        this.alphaMode = defaults.alphaMode ?? EffectAlphaMode.BLEND;
        this.lighting = defaults.lighting ?? EffectLighting.UNLIT;
        this.alphaCutoff = 0.5;
        this.brightness = 1;
        this.roll = 0;
        this.depthTest = true;
        this.depthWrite = this.alphaMode === EffectAlphaMode.OPAQUE || this.alphaMode === EffectAlphaMode.CUTOUT;
        this.visible = true;
        this.frustumCulling = true;
        this.sheetColumns = 1;
        this.sheetRows = 1;
        this.frame = 0;
        this.directionalCount = 0;
        this.directionalFrames = new Int32Array(8);
        for (let index = 0; index < 8; index++) this.directionalFrames[index] = index;
        this.facingAngle = 0;
        this.directionalFrame = 0;
        this.animationFirstFrame = 0;
        this.animationLastFrame = 0;
        this.animationFps = 0;
        this.animationTime = 0;
        this.animationLoop = true;
        this.animationPlaying = false;
        this.animationPaused = false;
        this.version = 1;
        this.boundsVersion = 1;
        this.bounds = createBounds();
        this.disposed = false;
        this._rendererVisible = undefined;
        this._sortDistance = 0;
        store.textures?.retain(textureId);
        this.updateBounds();
    }

    setPosition(x, y, z) {
        const values = [finite(x, 'X'), finite(y, 'Y'), finite(z, 'Z')];
        if (values.every((value, index) => value === this.position[index])) return;
        this.position.set(values);
        this.updateBounds();
        this.touch(true);
    }

    setRotation(x, y, z) {
        const values = [finite(x, 'X rotation'), finite(y, 'Y rotation'), finite(z, 'Z rotation')];
        if (values.every((value, index) => value === this.rotation[index])) return;
        this.rotation.set(values);
        this.roll = values[2];
        setEulerBasis(this, values[0], values[1], 0);
        this.touch(false);
    }

    setSize(width, height) {
        const values = [positive(width, 'Width'), positive(height, 'Height')];
        if (values[0] === this.size[0] && values[1] === this.size[1]) return;
        this.size.set(values);
        this.updateBounds();
        this.touch(true);
    }

    setPivot(x, y) {
        const values = [finite(x, 'Pivot X'), finite(y, 'Pivot Y')];
        if (values[0] === this.pivot[0] && values[1] === this.pivot[1]) return;
        this.pivot.set(values);
        this.updateBounds();
        this.touch(true);
    }

    setNamedPivot(name) {
        const normalized = String(name).trim().toLowerCase();
        if (normalized === 'center') return this.setPivot(0.5, 0.5);
        if (normalized === 'bottom-center' || normalized === 'bottom') return this.setPivot(0.5, 0);
        if (normalized === 'top-center' || normalized === 'top') return this.setPivot(0.5, 1);
        throw new Error(`Unknown sprite pivot "${name}"`);
    }

    setBillboardMode(mode) {
        const normalized = enumValue(mode, BILLBOARD_MODES, 'billboard mode');
        if (normalized === this.billboardMode) return;
        this.billboardMode = normalized;
        this.touch(false);
    }

    setRoll(radians) {
        const value = finite(radians, 'Sprite roll');
        if (value === this.roll) return;
        this.roll = value;
        this.touch(false);
    }

    setTexture(textureId) {
        if (textureId === this.textureId) return;
        this.store.textures?.retain(textureId);
        this.store.textures?.release(this.textureId);
        this.textureId = textureId;
        this.touch(false);
    }

    setTint(red, green, blue, alpha = this.tint[3]) {
        const previous = Array.from(this.tint);
        colorInto(this.tint, red, green, blue, alpha);
        if (previous.every((value, index) => value === this.tint[index])) return;
        this.touch(false);
    }

    setOpacity(opacity) {
        const value = Math.max(0, finite(opacity, 'Opacity'));
        if (value === this.tint[3]) return;
        this.tint[3] = value;
        this.touch(false);
    }

    setBrightness(brightness) {
        const value = nonNegative(brightness, 'Brightness');
        if (value === this.brightness) return;
        this.brightness = value;
        this.touch(false);
    }

    setAlphaMode(mode) {
        const normalized = enumValue(mode, ALPHA_MODES, 'effect alpha mode');
        if (normalized === this.alphaMode) return;
        const usedDefaultDepthWrite = this.depthWrite ===
            (this.alphaMode === EffectAlphaMode.OPAQUE || this.alphaMode === EffectAlphaMode.CUTOUT);
        this.alphaMode = normalized;
        if (usedDefaultDepthWrite) {
            this.depthWrite = normalized === EffectAlphaMode.OPAQUE || normalized === EffectAlphaMode.CUTOUT;
        }
        this.touch(false);
    }

    setAlphaCutoff(value) {
        const cutoff = Math.max(0, Math.min(1, finite(value, 'Alpha cutoff')));
        if (cutoff === this.alphaCutoff) return;
        this.alphaCutoff = cutoff;
        this.touch(false);
    }

    setLighting(mode) {
        const normalized = enumValue(mode, LIGHTING_MODES, 'effect lighting mode');
        if (normalized === this.lighting) return;
        this.lighting = normalized;
        this.touch(false);
    }

    setDepth(test, write) {
        const nextTest = booleanValue(test);
        const nextWrite = booleanValue(write);
        if (nextTest === this.depthTest && nextWrite === this.depthWrite) return;
        this.depthTest = nextTest;
        this.depthWrite = nextWrite;
        this.touch(false);
    }

    setVisible(visible) {
        const next = booleanValue(visible);
        if (next === this.visible) return;
        this.visible = next;
        this.touch(true);
    }

    setFrustumCulling(enabled) {
        const next = booleanValue(enabled);
        if (next === this.frustumCulling) return;
        this.frustumCulling = next;
        this.touch(true);
    }

    setSheet(columns, rows) {
        const nextColumns = positiveInteger(columns, 'Sprite-sheet columns', MAX_FRAME_DIMENSION);
        const nextRows = positiveInteger(rows, 'Sprite-sheet rows', MAX_FRAME_DIMENSION);
        if (nextColumns === this.sheetColumns && nextRows === this.sheetRows) return;
        this.sheetColumns = nextColumns;
        this.sheetRows = nextRows;
        const maximum = nextColumns * nextRows - 1;
        this.frame = Math.min(this.frame, maximum);
        this.directionalFrame = Math.min(this.directionalFrame, maximum);
        for (let index = 0; index < this.directionalFrames.length; index++) {
            this.directionalFrames[index] = Math.min(this.directionalFrames[index], maximum);
        }
        this.animationFirstFrame = Math.min(this.animationFirstFrame, maximum);
        this.animationLastFrame = Math.min(this.animationLastFrame, maximum);
        this.touch(false);
    }

    setFrame(frame) {
        const maximum = this.sheetColumns * this.sheetRows - 1;
        const next = Math.max(0, Math.min(maximum, Math.floor(finite(frame, 'Sprite frame'))));
        if (next === this.frame) return;
        this.frame = next;
        this.touch(false);
    }

    setDirectional(count, facingAngleRadians = this.facingAngle) {
        const next = Math.floor(finite(count, 'Directional view count'));
        if (next !== 0 && next !== 4 && next !== 8) throw new Error('Directional view count must be 0, 4, or 8');
        const angle = finite(facingAngleRadians, 'Directional facing angle');
        if (next === this.directionalCount && angle === this.facingAngle) return;
        this.directionalCount = next;
        this.facingAngle = angle;
        if (next === 0) this.directionalFrame = this.frame;
        this.store.directionalEffects[next > 0 ? 'add' : 'delete'](this);
        this.touch(false);
    }

    setDirectionalFrame(directionIndex, frame) {
        const index = Math.floor(finite(directionIndex, 'Direction index'));
        if (index < 1 || index > 8) throw new Error('Direction index must be from 1 to 8');
        const maximum = this.sheetColumns * this.sheetRows - 1;
        const value = Math.max(0, Math.min(maximum, Math.floor(finite(frame, 'Sprite frame'))));
        if (this.directionalFrames[index - 1] === value) return;
        this.directionalFrames[index - 1] = value;
        this.touch(false);
    }

    playFrames(firstFrame, lastFrame, framesPerSecond, loop = true) {
        const maximum = this.sheetColumns * this.sheetRows - 1;
        const first = Math.max(0, Math.min(maximum, Math.floor(finite(firstFrame, 'First frame'))));
        const last = Math.max(0, Math.min(maximum, Math.floor(finite(lastFrame, 'Last frame'))));
        if (last < first) throw new Error('Last sprite frame must not be before the first frame');
        this.animationFirstFrame = first;
        this.animationLastFrame = last;
        this.animationFps = positive(framesPerSecond, 'Frame rate');
        this.animationTime = 0;
        this.animationLoop = booleanValue(loop);
        this.animationPlaying = true;
        this.animationPaused = false;
        this.setFrame(first);
    }

    pauseFrames() {
        if (!this.animationPlaying || this.animationPaused) return;
        this.animationPaused = true;
        this.touch(false);
    }

    resumeFrames() {
        if (!this.animationPlaying || !this.animationPaused) return;
        this.animationPaused = false;
        this.touch(false);
    }

    stopFrames(reset = false) {
        if (!this.animationPlaying && !this.animationPaused && !reset) return;
        this.animationPlaying = false;
        this.animationPaused = false;
        this.animationTime = 0;
        if (reset) this.setFrame(this.animationFirstFrame);
        else this.touch(false);
    }

    advanceFrames(deltaSeconds) {
        if (!this.animationPlaying || this.animationPaused || !(deltaSeconds > 0)) return false;
        const count = this.animationLastFrame - this.animationFirstFrame + 1;
        if (count <= 0) return false;
        this.animationTime += deltaSeconds;
        const elapsedFrames = Math.floor(this.animationTime * this.animationFps);
        let offset = elapsedFrames;
        if (this.animationLoop) offset %= count;
        else if (offset >= count) {
            offset = count - 1;
            this.animationPlaying = false;
        }
        const nextFrame = this.animationFirstFrame + offset;
        if (nextFrame === this.frame) return false;
        this.frame = nextFrame;
        this.touch(false);
        return true;
    }

    updateDirectional(cameraX, cameraZ) {
        if (this.directionalCount === 0) return false;
        const angle = Math.atan2(cameraX - this.position[0], cameraZ - this.position[2]);
        const sector = TAU / this.directionalCount;
        const index = Math.floor(wrapAngle(angle - this.facingAngle + sector * 0.5) / sector) % this.directionalCount;
        const next = this.directionalFrames[index];
        if (next === this.directionalFrame) return false;
        this.directionalFrame = next;
        this.touch(false);
        return true;
    }

    get renderedFrame() {
        return this.directionalCount > 0 ? this.directionalFrame : this.frame;
    }

    updateBounds(extraRadius = 0) {
        const extentX = Math.max(Math.abs(this.pivot[0]), Math.abs(1 - this.pivot[0])) * this.size[0];
        const extentY = Math.max(Math.abs(this.pivot[1]), Math.abs(1 - this.pivot[1])) * this.size[1];
        const radius = Math.hypot(extentX, extentY) + extraRadius;
        setBounds(
            this.bounds,
            [this.position[0] - radius, this.position[1] - radius, this.position[2] - radius],
            [this.position[0] + radius, this.position[1] + radius, this.position[2] + radius]
        );
    }

    touch(boundsChanged) {
        this.version++;
        if (boundsChanged) this.boundsVersion++;
        this.store.changed(this, boundsChanged);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.store.textures?.release(this.textureId);
        this.store.directionalEffects.delete(this);
    }
}

export class SpriteEffect extends VisualEffect {
    constructor(store, name, textureId) {
        super(store, name, EffectKind.SPRITE, textureId);
    }
}

export class DecalEffect extends VisualEffect {
    constructor(store, name, textureId) {
        super(store, name, EffectKind.DECAL, textureId, {
            billboardMode: BillboardMode.FIXED,
            alphaMode: EffectAlphaMode.BLEND
        });
        this.normal = new Float32Array([0, 1, 0]);
        this.surfaceOffset = 0.01;
        this.lifetime = 0;
        this.age = 0;
        this.expired = false;
        this.setNormal(0, 1, 0);
        this.depthWrite = false;
    }

    setNormal(x, y, z) {
        normalize3(this.normal, finite(x, 'Normal X'), finite(y, 'Normal Y'), finite(z, 'Normal Z'), 'Decal normal');
        const referenceX = Math.abs(this.normal[1]) > 0.98 ? 1 : 0;
        const referenceY = Math.abs(this.normal[1]) > 0.98 ? 0 : 1;
        let rightX = referenceY * this.normal[2];
        let rightY = -referenceX * this.normal[2];
        let rightZ = referenceX * this.normal[1] - referenceY * this.normal[0];
        const rightLength = Math.hypot(rightX, rightY, rightZ) || 1;
        rightX /= rightLength;
        rightY /= rightLength;
        rightZ /= rightLength;
        this.right.set([rightX, rightY, rightZ]);
        this.up.set([
            this.normal[1] * rightZ - this.normal[2] * rightY,
            this.normal[2] * rightX - this.normal[0] * rightZ,
            this.normal[0] * rightY - this.normal[1] * rightX
        ]);
        this.updateBounds(this.surfaceOffset);
        this.touch(true);
    }

    updateBounds(extraRadius = this.surfaceOffset ?? 0) {
        super.updateBounds(extraRadius);
    }

    setSurfaceOffset(value) {
        const offset = nonNegative(value, 'Decal surface offset');
        if (offset === this.surfaceOffset) return;
        this.surfaceOffset = offset;
        this.updateBounds(offset);
        this.touch(true);
    }

    setLifetime(seconds) {
        const value = nonNegative(seconds, 'Decal lifetime');
        if (value === this.lifetime) return;
        this.lifetime = value;
        this.age = 0;
        this.expired = false;
        this.touch(false);
    }

    advanceLifetime(deltaSeconds) {
        if (!(this.lifetime > 0) || this.expired || !(deltaSeconds > 0)) return false;
        this.age += deltaSeconds;
        if (this.age < this.lifetime) return false;
        this.expired = true;
        this.visible = false;
        this.touch(true);
        return true;
    }
}

class ParticleArrays {
    constructor(capacity) {
        this.capacity = capacity;
        this.positionX = new Float32Array(capacity);
        this.positionY = new Float32Array(capacity);
        this.positionZ = new Float32Array(capacity);
        this.velocityX = new Float32Array(capacity);
        this.velocityY = new Float32Array(capacity);
        this.velocityZ = new Float32Array(capacity);
        this.age = new Float32Array(capacity);
        this.lifetime = new Float32Array(capacity);
        this.rotation = new Float32Array(capacity);
        this.angularVelocity = new Float32Array(capacity);
    }

    copyFrom(previous, count) {
        for (const key of Object.keys(this)) {
            if (key === 'capacity') continue;
            this[key].set(previous[key].subarray(0, count));
        }
    }

    copyParticle(target, source) {
        for (const key of Object.keys(this)) {
            if (key === 'capacity') continue;
            this[key][target] = this[key][source];
        }
    }
}

export class ParticleEmitter extends VisualEffect {
    constructor(store, name, textureId, maximumParticles = 1000) {
        super(store, name, EffectKind.PARTICLE_EMITTER, textureId, {billboardMode: BillboardMode.FULL});
        this.maximumParticles = positiveInteger(maximumParticles, 'Maximum particles', MAX_PARTICLES);
        this.particles = new ParticleArrays(this.maximumParticles);
        this.activeCount = 0;
        this.emissionRate = 10;
        this.emissionAccumulator = 0;
        this.emitting = false;
        this.paused = false;
        /** @type {string} */
        this.spawnShape = ParticleSpawnShape.POINT;
        this.spawnExtents = new Float32Array(3);
        this.velocity = new Float32Array([0, 1, 0]);
        this.velocitySpread = new Float32Array(3);
        this.acceleration = new Float32Array(3);
        this.lifetimeRange = new Float32Array([1, 1]);
        this.sizeRange = new Float32Array([1, 0]);
        this.alphaRange = new Float32Array([1, 0]);
        this.startColor = new Float32Array([1, 1, 1, 1]);
        this.endColor = new Float32Array([1, 1, 1, 0]);
        this.rotationRange = new Float32Array(2);
        this.angularVelocityRange = new Float32Array(2);
        this.particleFrameRate = 0;
        this.randomState = 1;
        this.lastSpawned = 0;
        this.lastExpired = 0;
        this.lastSimulationTime = 0;
        this.lastSimulated = 0;
        this.particleShadows = false;
        this.updateEmitterBounds();
    }

    setMaximumParticles(value) {
        const maximum = positiveInteger(value, 'Maximum particles', MAX_PARTICLES);
        if (maximum === this.maximumParticles) return;
        const replacement = new ParticleArrays(maximum);
        const retained = Math.min(this.activeCount, maximum);
        replacement.copyFrom(this.particles, retained);
        this.maximumParticles = maximum;
        this.particles = replacement;
        this.activeCount = retained;
        this.touch(false);
    }

    setEmissionRate(value) {
        this.emissionRate = nonNegative(value, 'Particle emission rate');
        this.touch(false);
    }

    setSpawnShape(shape, x = 0, y = 0, z = 0) {
        this.spawnShape = enumValue(shape, SPAWN_SHAPES, 'particle spawn shape');
        this.spawnExtents.set([
            nonNegative(x, 'Spawn extent X'),
            nonNegative(y, 'Spawn extent Y'),
            nonNegative(z, 'Spawn extent Z')
        ]);
        this.updateEmitterBounds();
        this.touch(true);
    }

    setVelocity(x, y, z, spreadX = 0, spreadY = 0, spreadZ = 0) {
        this.velocity.set([finite(x, 'Velocity X'), finite(y, 'Velocity Y'), finite(z, 'Velocity Z')]);
        this.velocitySpread.set([
            nonNegative(spreadX, 'Velocity spread X'),
            nonNegative(spreadY, 'Velocity spread Y'),
            nonNegative(spreadZ, 'Velocity spread Z')
        ]);
        this.updateEmitterBounds();
        this.touch(true);
    }

    setAcceleration(x, y, z) {
        this.acceleration.set([finite(x, 'Acceleration X'), finite(y, 'Acceleration Y'), finite(z, 'Acceleration Z')]);
        this.updateEmitterBounds();
        this.touch(true);
    }

    setLifetime(minimum, maximum = minimum) {
        const low = positive(minimum, 'Minimum particle lifetime');
        const high = positive(maximum, 'Maximum particle lifetime');
        if (high < low) throw new Error('Maximum particle lifetime must not be below the minimum');
        this.lifetimeRange.set([low, high]);
        this.updateEmitterBounds();
        this.touch(true);
    }

    setSizeOverLife(start, end) {
        this.sizeRange.set([nonNegative(start, 'Start size'), nonNegative(end, 'End size')]);
        this.updateEmitterBounds();
        this.touch(true);
    }

    setAlphaOverLife(start, end) {
        this.alphaRange.set([
            Math.max(0, finite(start, 'Start alpha')),
            Math.max(0, finite(end, 'End alpha'))
        ]);
        this.touch(false);
    }

    setColorOverLife(start, end) {
        const startChannels = /** @type {ArrayLike<number>} */ (start);
        const endChannels = /** @type {ArrayLike<number>} */ (end);
        if ((!Array.isArray(start) && !ArrayBuffer.isView(start)) || startChannels.length < 3 ||
            (!Array.isArray(end) && !ArrayBuffer.isView(end)) || endChannels.length < 3) {
            throw new Error('Particle colors must contain at least three channels');
        }
        colorInto(this.startColor, startChannels[0], startChannels[1], startChannels[2], startChannels[3] ?? 1);
        colorInto(this.endColor, endChannels[0], endChannels[1], endChannels[2], endChannels[3] ?? 1);
        this.touch(false);
    }

    setRotationRange(minimum, maximum, angularMinimum = 0, angularMaximum = 0) {
        const values = [minimum, maximum, angularMinimum, angularMaximum]
            .map((value, index) => finite(value, `Particle rotation value ${index + 1}`));
        if (values[1] < values[0] || values[3] < values[2]) throw new Error('Particle rotation ranges are reversed');
        this.rotationRange.set(values.slice(0, 2));
        this.angularVelocityRange.set(values.slice(2));
        this.touch(false);
    }

    setSeed(value) {
        const seed = Math.trunc(finite(value, 'Particle seed')) >>> 0;
        this.randomState = seed || 1;
    }

    setParticleFrameRate(value) {
        this.particleFrameRate = nonNegative(value, 'Particle frame rate');
        this.touch(false);
    }

    start() {
        if (this.emitting && !this.paused) return;
        this.emitting = true;
        this.paused = false;
        this.touch(false);
    }

    stop() {
        if (!this.emitting) return;
        this.emitting = false;
        this.touch(false);
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        this.touch(false);
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.touch(false);
    }

    clear() {
        if (this.activeCount === 0 && this.emissionAccumulator === 0) return;
        this.activeCount = 0;
        this.emissionAccumulator = 0;
        this.touch(false);
    }

    burst(count) {
        const requested = Math.max(0, Math.floor(finite(count, 'Burst count')));
        const spawned = this.#spawnMany(requested);
        if (spawned > 0) this.touch(false);
        return spawned;
    }

    advanceParticles(deltaSeconds) {
        this.lastSpawned = 0;
        this.lastExpired = 0;
        this.lastSimulationTime = 0;
        this.lastSimulated = 0;
        if (this.paused || !(deltaSeconds > 0) || (this.activeCount === 0 && !this.emitting)) return false;
        const started = now();
        const delta = Math.min(deltaSeconds, MAX_DELTA_SECONDS);
        if (this.emitting && this.emissionRate > 0) {
            this.emissionAccumulator += this.emissionRate * delta;
            const requested = Math.floor(this.emissionAccumulator);
            if (requested > 0) {
                this.lastSpawned = this.#spawnMany(requested);
                this.emissionAccumulator -= requested;
            }
        }
        const particles = this.particles;
        let index = 0;
        while (index < this.activeCount) {
            const age = particles.age[index] + delta;
            if (age >= particles.lifetime[index]) {
                const last = --this.activeCount;
                if (index !== last) particles.copyParticle(index, last);
                this.lastExpired++;
                continue;
            }
            particles.age[index] = age;
            particles.velocityX[index] += this.acceleration[0] * delta;
            particles.velocityY[index] += this.acceleration[1] * delta;
            particles.velocityZ[index] += this.acceleration[2] * delta;
            particles.positionX[index] += particles.velocityX[index] * delta;
            particles.positionY[index] += particles.velocityY[index] * delta;
            particles.positionZ[index] += particles.velocityZ[index] * delta;
            particles.rotation[index] += particles.angularVelocity[index] * delta;
            index++;
        }
        this.lastSimulated = this.activeCount;
        this.lastSimulationTime = now() - started;
        if (this.activeCount > 0 || this.lastSpawned > 0 || this.lastExpired > 0) {
            // Offscreen emitters keep deterministic CPU time/state, but their
            // particles are not in the compact GPU buffer. A later visibility
            // change repacks current state, so dirtying every visible effect now
            // would only turn culling into unrelated upload work.
            if (this._rendererVisible !== false) {
                this.touch(false);
                return true;
            }
            this.version++;
        }
        return false;
    }

    updateEmitterBounds() {
        const lifetime = this.lifetimeRange?.[1] ?? 1;
        let radiusSquared = 0;
        for (let axis = 0; axis < 3; axis++) {
            const spawn = this.spawnExtents?.[axis] ?? 0;
            const speed = Math.abs(this.velocity?.[axis] ?? 0) + (this.velocitySpread?.[axis] ?? 0);
            const acceleration = Math.abs(this.acceleration?.[axis] ?? 0);
            const extent = spawn + speed * lifetime + acceleration * lifetime * lifetime * 0.5;
            radiusSquared += extent * extent;
        }
        const particleRadius = Math.max(this.sizeRange?.[0] ?? 1, this.sizeRange?.[1] ?? 0) *
            Math.max(this.size?.[0] ?? 1, this.size?.[1] ?? 1) * Math.SQRT1_2;
        super.updateBounds(Math.sqrt(radiusSquared) + particleRadius);
    }

    updateBounds() {
        this.updateEmitterBounds();
    }

    #spawnMany(requested) {
        const count = Math.min(requested, this.maximumParticles - this.activeCount);
        for (let index = 0; index < count; index++) this.#spawnOne(this.activeCount++);
        return count;
    }

    #spawnOne(index) {
        const particles = this.particles;
        let x = 0;
        let y = 0;
        let z = 0;
        if (this.spawnShape === ParticleSpawnShape.BOX) {
            x = this.#signedRandom() * this.spawnExtents[0];
            y = this.#signedRandom() * this.spawnExtents[1];
            z = this.#signedRandom() * this.spawnExtents[2];
        } else if (this.spawnShape === ParticleSpawnShape.SPHERE) {
            let lengthSquared = 0;
            do {
                x = this.#signedRandom();
                y = this.#signedRandom();
                z = this.#signedRandom();
                lengthSquared = x * x + y * y + z * z;
            } while (lengthSquared > 1 || lengthSquared < 1e-8);
            const scale = this.spawnExtents[0];
            x *= scale;
            y *= scale;
            z *= scale;
        }
        particles.positionX[index] = x;
        particles.positionY[index] = y;
        particles.positionZ[index] = z;
        particles.velocityX[index] = this.velocity[0] + this.#signedRandom() * this.velocitySpread[0];
        particles.velocityY[index] = this.velocity[1] + this.#signedRandom() * this.velocitySpread[1];
        particles.velocityZ[index] = this.velocity[2] + this.#signedRandom() * this.velocitySpread[2];
        particles.age[index] = 0;
        particles.lifetime[index] = this.#range(this.lifetimeRange);
        particles.rotation[index] = this.#range(this.rotationRange);
        particles.angularVelocity[index] = this.#range(this.angularVelocityRange);
    }

    #range(range) {
        return range[0] + (range[1] - range[0]) * this.#random();
    }

    #signedRandom() {
        return this.#random() * 2 - 1;
    }

    #random() {
        let value = this.randomState >>> 0;
        value ^= value << 13;
        value ^= value >>> 17;
        value ^= value << 5;
        this.randomState = value >>> 0 || 1;
        return this.randomState / 4294967296;
    }
}

export class EffectStore {
    /**
     * @param {import('../textures/TextureStore.js').TextureStore | null} textures
     * @param {(() => void) | null} [onChange]
     * @param {((effect: VisualEffect, removed: boolean) => void) | null} [onBoundsChange]
     */
    constructor(textures, onChange = null, onBoundsChange = null) {
        this.textures = textures;
        this.onChange = onChange;
        this.onBoundsChange = onBoundsChange;
        this.resources = new Map();
        this.sprites = new Map();
        this.emitters = new Map();
        this.decals = new Map();
        this.directionalEffects = new Set();
        this.version = 1;
        this.renderVersion = 1;
        this.metrics = {
            activeEmitters: 0,
            activeParticles: 0,
            spawnedParticles: 0,
            expiredParticles: 0,
            simulatedParticles: 0,
            simulationTime: 0,
            animatedSprites: 0,
            directionalFrameChanges: 0,
            changed: false
        };
    }

    createSprite(name, textureId) {
        this.#assertName(name);
        this.#assertTexture(textureId);
        return this.#add(new SpriteEffect(this, name, textureId), this.sprites);
    }

    createEmitter(name, textureId, maximumParticles = 1000) {
        this.#assertName(name);
        this.#assertTexture(textureId);
        return this.#add(new ParticleEmitter(this, name, textureId, maximumParticles), this.emitters);
    }

    createDecal(name, textureId) {
        this.#assertName(name);
        this.#assertTexture(textureId);
        return this.#add(new DecalEffect(this, name, textureId), this.decals);
    }

    require(name, kind = null) {
        const resource = this.resources.get(name);
        if (!resource) throw new Error(`Unknown effect resource "${name}"`);
        if (kind && resource.kind !== kind) throw new Error(`Resource "${name}" is not a ${kind}`);
        return resource;
    }

    delete(name) {
        const resource = this.resources.get(name);
        if (!resource) return false;
        resource.dispose();
        this.resources.delete(name);
        this.#mapFor(resource.kind).delete(name);
        this.version++;
        this.renderVersion++;
        if (this.onBoundsChange) this.onBoundsChange(resource, true);
        if (this.onChange) this.onChange();
        return true;
    }

    changed(resource, boundsChanged) {
        this.version++;
        this.renderVersion++;
        if (boundsChanged && this.onBoundsChange) this.onBoundsChange(resource, false);
        if (this.onChange) this.onChange();
    }

    update(deltaSeconds) {
        const delta = Math.min(Math.max(Number(deltaSeconds) || 0, 0), MAX_DELTA_SECONDS);
        const metrics = this.metrics;
        metrics.activeEmitters = 0;
        metrics.activeParticles = 0;
        metrics.spawnedParticles = 0;
        metrics.expiredParticles = 0;
        metrics.simulatedParticles = 0;
        metrics.simulationTime = 0;
        metrics.animatedSprites = 0;
        metrics.directionalFrameChanges = 0;
        metrics.changed = false;
        for (const sprite of this.sprites.values()) {
            if (sprite.animationPlaying && !sprite.animationPaused) metrics.animatedSprites++;
            metrics.changed = sprite.advanceFrames(delta) || metrics.changed;
        }
        for (const emitter of this.emitters.values()) {
            if ((emitter.emitting || emitter.activeCount > 0) && !emitter.paused) metrics.activeEmitters++;
            metrics.changed = emitter.advanceParticles(delta) || metrics.changed;
            metrics.activeParticles += emitter.activeCount;
            metrics.spawnedParticles += emitter.lastSpawned;
            metrics.expiredParticles += emitter.lastExpired;
            metrics.simulatedParticles += emitter.lastSimulated;
            metrics.simulationTime += emitter.lastSimulationTime;
        }
        for (const decal of this.decals.values()) metrics.changed = decal.advanceLifetime(delta) || metrics.changed;
        return metrics;
    }

    updateDirectional(cameraX, cameraZ) {
        let changes = 0;
        for (const effect of this.directionalEffects) if (effect.updateDirectional(cameraX, cameraZ)) changes++;
        this.metrics.directionalFrameChanges += changes;
        return changes;
    }

    clear() {
        for (const resource of this.resources.values()) resource.dispose();
        this.resources.clear();
        this.sprites.clear();
        this.emitters.clear();
        this.decals.clear();
        this.directionalEffects.clear();
        this.version++;
        this.renderVersion++;
    }

    #add(resource, target) {
        this.resources.set(resource.name, resource);
        target.set(resource.name, resource);
        this.version++;
        this.renderVersion++;
        if (this.onBoundsChange) this.onBoundsChange(resource, false);
        if (this.onChange) this.onChange();
        return resource;
    }

    #assertName(name) {
        if (!name) throw new Error('Effect resource name cannot be empty');
        if (this.resources.has(name)) throw new Error(`An effect resource named "${name}" already exists`);
    }

    #assertTexture(textureId) {
        if (!this.textures?.resourceForId(textureId)) throw new Error(`Unknown texture ID ${textureId}`);
    }

    #mapFor(kind) {
        if (kind === EffectKind.SPRITE) return this.sprites;
        if (kind === EffectKind.PARTICLE_EMITTER) return this.emitters;
        return this.decals;
    }
}

export {MAX_DELTA_SECONDS as MAX_EFFECT_DELTA_SECONDS, MAX_PARTICLES};
