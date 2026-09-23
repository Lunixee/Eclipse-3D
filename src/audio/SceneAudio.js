import {basisFromEuler} from '../game/CameraMath.js';

const number = (value, label, min, max) => {
    const result = Number(value);
    if (!Number.isFinite(result) || result < min || result > max) throw new Error(`${label} requires ${min}..${max}`);
    return result;
};
const parameters = {
    volume: [0, 4], rate: [0.01, 16], refDistance: [0.001, 1e6], maxDistance: [0.001, 1e6],
    rolloff: [0, 100], coneInner: [0, 360], coneOuter: [0, 360], coneGain: [0, 1]
};

/** Non-owning object attachments; sources retain decoded asset resources. */
export class SceneAudio {
    constructor(scene, system) {
        this.scene = scene;
        this.system = system;
        this.resources = new Map();
        this.attachments = new Map();
        this.dirty = new Set();
        this.playing = new Set();
        this.positionalPlaying = 0;
        this.basis = {right: new Float32Array(3), up: new Float32Array(3), forward: new Float32Array(3)};
        this.disposed = false;
    }

    create(name, assetName, positional = true) {
        if (this.disposed) throw new Error('Scene audio is disposed');
        if (!name || this.resources.has(name)) throw new Error(`Audio source name "${name}" is empty or already used`);
        const asset = this.system.require(assetName);
        const source = new AudioSource(this, name, asset, Boolean(positional));
        asset.references++;
        this.resources.set(name, source);
        return source;
    }

    require(name) {
        const source = this.resources.get(name);
        if (!source) throw new Error(`Unknown audio source "${name}"`);
        return source;
    }

    attach(name, object) {
        const source = this.require(name);
        if (object) this.scene.requireAttachmentTarget(object);
        this.#detach(source);
        source.object = object;
        if (object) {
            let sources = this.attachments.get(object);
            if (!sources) { sources = new Set(); this.attachments.set(object, sources); }
            sources.add(source);
            this.dirty.add(source);
        }
    }

    #detach(source) {
        const sources = this.attachments.get(source.object);
        if (sources) {
            sources.delete(source);
            if (!sources.size) this.attachments.delete(source.object);
        }
        source.object = '';
    }

    markAttached(name, removed = false) {
        const sources = this.attachments.get(name);
        if (!sources) return;
        for (const source of sources) {
            if (removed) {
                // Scene notifies before deleting target, preserving last position.
                this.#readAttachment(source);
                source.stop();
                source.object = '';
                this.dirty.delete(source);
            } else this.dirty.add(source);
        }
        if (removed) this.attachments.delete(name);
    }

    #readAttachment(source) {
        if (!source.object) return;
        const transform = this.scene.attachmentTransform(source.object);
        const p = transform.position, offset = transform.offset;
        source.position[0] = p[offset]; source.position[1] = p[offset + 1]; source.position[2] = p[offset + 2];
        basisFromEuler(transform.rotation, offset, this.basis);
        source.direction.set(this.basis.forward);
    }

    update() {
        for (const source of this.dirty) {
            this.#readAttachment(source);
            if (source.playing) source.updateSpatial();
        }
        this.dirty.clear();
    }

    prepare(source) {
        this.#readAttachment(source);
        source.updateSpatial();
        this.dirty.delete(source);
        if (source.positional) this.system.updateListener(this.scene);
    }

    addPlaying(source) {
        if (this.playing.has(source)) return;
        this.playing.add(source);
        if (source.positional) this.positionalPlaying++;
    }

    removePlaying(source) {
        if (!this.playing.delete(source)) return;
        if (source.positional) this.positionalPlaying--;
    }

    pauseAll() {
        // Include voices already held by the host pause so Stop All or a scene
        // switch cancels their pending automatic resume as well.
        for (const source of this.resources.values()) source.pause();
    }

    delete(name) {
        const source = this.resources.get(name);
        if (!source) return false;
        source.dispose();
        this.#detach(source);
        this.dirty.delete(source);
        this.resources.delete(name);
        source.asset.references--;
        return true;
    }

    dispose() {
        if (this.disposed) return;
        for (const name of this.resources.keys()) this.delete(name);
        this.system.sceneStores.delete(this);
        if (this.scene.audio === this) this.scene.audio = null;
        this.disposed = true;
    }
}

export class AudioSource {
    constructor(store, name, asset, positional) {
        this.store = store;
        this.name = name;
        this.asset = asset;
        this.positional = positional;
        this.object = '';
        this.position = new Float64Array(3);
        this.direction = new Float64Array([0, 0, -1]);
        this.lastSpatial = new Float64Array(6).fill(NaN);
        this.volume = 1; this.rate = 1; this.loop = false;
        this.refDistance = 1; this.maxDistance = 10000; this.rolloff = 1;
        this.coneInner = 360; this.coneOuter = 360; this.coneGain = 0;
        this.offset = 0;
        this.startedAt = 0;
        this.playing = false;
        this.paused = false;
        this.runtimePaused = false;
        this.disposed = false;
        /** @type {AudioBufferSourceNode | null} */
        this.voice = null;
        /** @type {GainNode | null} */
        this.gain = null;
        /** @type {PannerNode | null} */
        this.panner = null;
    }

    get state() {
        if (this.disposed) return 'deleted';
        if (this.asset.state !== 'ready') return this.asset.state;
        if (this.playing) return this.store.system.context?.state === 'running' ? 'playing' : 'blocked';
        return this.paused ? 'paused' : 'stopped';
    }

    get duration() { return this.asset.entry.buffer?.duration ?? 0; }

    get time() {
        const context = this.store.system.context;
        const elapsed = this.playing && context ? Math.max(0, context.currentTime - this.startedAt) * this.rate : 0;
        const time = this.offset + elapsed;
        return this.loop && this.duration > 0 ? time % this.duration : Math.min(time, this.duration);
    }

    play(restart = true) {
        if (this.disposed) throw new Error('Audio source is deleted');
        const system = this.store.system;
        if (system.engine.simulationPaused) throw new Error('Audio is paused by Stop All; start the project before playing');
        if (system.engine.scenes.active !== this.store.scene) throw new Error('Audio can play only in the active scene');
        if (!restart && this.playing) { system.unlock(); return; }
        const buffer = this.asset.entry.buffer;
        if (!buffer) throw new Error(`Audio asset "${this.asset.name}" is ${this.asset.state}`);
        const context = system.ensureContext();
        this.runtimePaused = false;
        this.#capture();
        this.#endVoice();
        if (restart || this.offset >= buffer.duration) this.offset = 0;
        this.#nodes(context);
        this.store.prepare(this);
        system.unlock();
        let voice;
        try {
            voice = context.createBufferSource();
            voice.buffer = buffer;
            voice.loop = this.loop;
            voice.playbackRate.value = this.rate;
            voice.connect(this.gain);
            voice.onended = () => {
                if (this.voice !== voice) return;
                this.#endVoice();
                this.offset = 0; this.paused = false;
            };
            this.voice = voice;
            this.startedAt = context.currentTime;
            voice.start(0, this.offset);
            this.playing = true; this.paused = false;
            this.store.addPlaying(this);
            system.metrics.voices++;
        } catch (error) {
            if (this.voice === voice) this.#endVoice();
            else if (voice) { voice.onended = null; voice.disconnect(); }
            throw error;
        }
    }

    resume() { this.play(false); }

    pause() {
        this.runtimePaused = false;
        if (!this.playing) return;
        this.#capture();
        this.#endVoice();
        this.paused = true;
    }

    stop() {
        this.runtimePaused = false;
        this.#endVoice();
        this.offset = 0; this.paused = false;
    }

    #capture() {
        this.offset = this.time;
        this.startedAt = this.store.system.context?.currentTime ?? 0;
    }

    #endVoice() {
        const voice = this.voice;
        this.voice = null;
        this.playing = false;
        this.store.removePlaying(this);
        if (!voice) return;
        voice.onended = null;
        try { voice.stop(); } catch { /* start failed or node already ended. */ }
        voice.disconnect();
    }

    #nodes(context) {
        if (this.gain) return;
        let gain = null, panner = null;
        try {
            gain = context.createGain();
            gain.gain.value = this.volume;
            if (this.positional) {
                panner = context.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = this.refDistance; panner.maxDistance = this.maxDistance;
                panner.rolloffFactor = this.rolloff;
                panner.coneInnerAngle = this.coneInner; panner.coneOuterAngle = this.coneOuter;
                panner.coneOuterGain = this.coneGain;
                gain.connect(panner); panner.connect(context.destination);
            } else gain.connect(context.destination);
            this.gain = gain; this.panner = panner;
        } catch (error) {
            gain?.disconnect(); panner?.disconnect();
            throw error;
        }
    }

    setNumber(property, value) {
        const range = parameters[property];
        if (!range) throw new Error(`Unknown audio number "${property}"`);
        value = number(value, property, range[0], range[1]);
        if (property === 'refDistance' && value > this.maxDistance || property === 'maxDistance' && value < this.refDistance) {
            throw new Error('Audio distance requires refDistance <= maxDistance');
        }
        if (property === 'coneInner' && value > this.coneOuter || property === 'coneOuter' && value < this.coneInner) {
            throw new Error('Audio cone requires inner <= outer');
        }
        if (this[property] === value) return;
        if (property === 'rate') this.#capture();
        this[property] = value;
        if (property === 'volume' && this.gain) this.gain.gain.value = value;
        else if (property === 'rate' && this.voice) this.voice.playbackRate.value = value;
        else if (this.panner) {
            const fields = {refDistance: 'refDistance', maxDistance: 'maxDistance', rolloff: 'rolloffFactor',
                coneInner: 'coneInnerAngle', coneOuter: 'coneOuterAngle', coneGain: 'coneOuterGain'};
            if (fields[property]) this.panner[fields[property]] = value;
        }
    }

    setLoop(value) {
        this.#capture();
        this.loop = Boolean(value);
        if (this.voice) this.voice.loop = this.loop;
    }

    setPosition(x, y, z) {
        x = number(x, 'Position', -1e6, 1e6); y = number(y, 'Position', -1e6, 1e6); z = number(z, 'Position', -1e6, 1e6);
        this.store.attach(this.name, '');
        this.position[0] = x; this.position[1] = y; this.position[2] = z;
        this.store.dirty.add(this);
    }

    setDirection(x, y, z) {
        x = number(x, 'Direction', -1e6, 1e6); y = number(y, 'Direction', -1e6, 1e6); z = number(z, 'Direction', -1e6, 1e6);
        const length = Math.hypot(x, y, z);
        if (length < 1e-12) throw new Error('Audio direction must be nonzero');
        this.direction[0] = x / length; this.direction[1] = y / length; this.direction[2] = z / length;
        this.store.dirty.add(this);
    }

    updateSpatial() {
        const node = this.panner;
        if (!node) return;
        const p = this.position, d = this.direction, last = this.lastSpatial;
        if (p[0] === last[0] && p[1] === last[1] && p[2] === last[2] && d[0] === last[3] && d[1] === last[4] && d[2] === last[5]) return;
        if (node.positionX) {
            node.positionX.value = p[0]; node.positionY.value = p[1]; node.positionZ.value = p[2];
            node.orientationX.value = d[0]; node.orientationY.value = d[1]; node.orientationZ.value = d[2];
        } else {
            node.setPosition(p[0], p[1], p[2]); node.setOrientation(d[0], d[1], d[2]);
        }
        last[0] = p[0]; last[1] = p[1]; last[2] = p[2]; last[3] = d[0]; last[4] = d[1]; last[5] = d[2];
        this.store.system.metrics.sourceUpdates++;
    }

    dispose() {
        if (this.disposed) return;
        this.stop(); this.gain?.disconnect(); this.panner?.disconnect();
        this.gain = this.panner = null;
        this.disposed = true;
    }
}
