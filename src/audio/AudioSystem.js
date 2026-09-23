import {basisFromEuler} from '../game/CameraMath.js';
import {SceneAudio} from './SceneAudio.js';

export const createAudioContext = () => {
    if (typeof globalThis.AudioContext !== 'function') throw new Error('Web Audio is unavailable in this runtime');
    return new globalThis.AudioContext();
};

const now = () => globalThis.performance?.now?.() ?? Date.now();
const decodedBuffer = value => value && Number.isFinite(value.duration) && value.duration >= 0 &&
    Number.isInteger(value.numberOfChannels) && value.numberOfChannels > 0 &&
    Number.isInteger(value.length) && value.length > 0;

/** Engine-owned decoded data and one lazy context; no renderer or timers.
 * Source descriptors provide a stable key and load(signal) -> bytes or an existing decoded buffer. */
export class AudioSystem {
    constructor(engine, contextFactory = createAudioContext) {
        this.engine = engine;
        this.contextFactory = contextFactory;
        /** @type {AudioContext | null} */
        this.context = null;
        this.assets = new Map();
        this.cache = new Map();
        this.sceneStores = new Set();
        this.nextId = 1;
        this.disposed = false;
        this.error = '';
        this.listenerScene = null;
        this.listenerCamera = null;
        this.listenerVersion = -1;
        this.listenerValues = new Float64Array(9).fill(NaN);
        this.basis = {right: new Float32Array(3), up: new Float32Array(3), forward: new Float32Array(3)};
        this.metrics = {contexts: 0, decodes: 0, bufferReuses: 0, assetLoads: 0,
            loadMilliseconds: 0, decodeMilliseconds: 0, voices: 0, listenerUpdates: 0, sourceUpdates: 0};
    }

    ensureContext() {
        if (this.disposed) throw new Error('Audio system is disposed');
        if (!this.context) {
            this.context = this.contextFactory();
            this.metrics.contexts++;
        }
        if (this.context.state === 'closed') throw new Error('Audio context is closed; reset the audio system');
        return this.context;
    }

    unlock() {
        const context = this.ensureContext();
        if (context.state === 'running') { this.error = ''; return; }
        // Do not await: autoplay-blocked resume promises can stay pending. A
        // source reports blocked until the browser actually runs this context.
        try {
            const pending = context.resume();
            pending.catch(error => {
                if (this.context === context && !this.disposed) this.error = String(error?.message ?? error);
            });
        } catch (error) { this.error = String(error instanceof Error ? error.message : error); }
    }

    load(name, source) {
        if (this.disposed) throw new Error('Audio system is disposed');
        if (!name || this.assets.has(name)) throw new Error(`Audio asset name "${name}" is empty or already used`);
        if (!source?.key || typeof source.load !== 'function') throw new Error('Invalid audio source descriptor');
        let entry = this.cache.get(source.key);
        if (!entry) {
            entry = {key: source.key, owners: 0, state: 'loading', error: '', buffer: null,
                controller: new AbortController(), dead: false, promise: null};
            this.cache.set(source.key, entry);
            entry.promise = this.#decode(entry, source);
            // Errors remain on the resource and its rejecting wait promise.
            entry.promise.catch(() => {});
        }
        entry.owners++;
        const asset = {id: this.nextId++, name, entry, references: 0, alive: true,
            get state() { return entry.state; }, get error() { return entry.error; }};
        this.assets.set(name, asset);
        return asset;
    }

    async #decode(entry, source) {
        try {
            const loadStarted = now();
            let loaded;
            try { loaded = await source.load(entry.controller.signal); } finally {
                this.metrics.assetLoads++;
                this.metrics.loadMilliseconds += now() - loadStarted;
            }
            this.#live(entry);
            if (decodedBuffer(loaded?.decodedBuffer)) {
                entry.buffer = loaded.decodedBuffer;
                entry.state = 'ready';
                this.metrics.bufferReuses++;
                return;
            }
            const bytes = loaded?.bytes ?? loaded;
            if (!(bytes instanceof Uint8Array) || !bytes.byteLength || bytes.byteLength > 64 * 1024 * 1024) {
                throw new Error('Audio data must contain 1 byte to 64 MiB');
            }
            const context = this.ensureContext();
            this.metrics.decodes++;
            // decodeAudioData detaches input; never detach a Scratch-owned asset.
            const decodeStarted = now();
            let buffer;
            try { buffer = await context.decodeAudioData(new Uint8Array(bytes).buffer); } finally {
                this.metrics.decodeMilliseconds += now() - decodeStarted;
            }
            this.#live(entry);
            entry.buffer = buffer;
            entry.state = 'ready';
            // The settled promise must not retain decoded data after deletion.
            return;
        } catch (error) {
            if (!entry.dead) {
                entry.state = 'error'; entry.error = error instanceof Error ? error.message : String(error);
            }
            throw error;
        }
    }

    #live(entry) {
        if (this.disposed || entry.dead || this.cache.get(entry.key) !== entry) throw new Error('Audio load was cancelled');
    }

    async waitUntilReady(asset) {
        await asset.entry.promise;
        if (!asset.alive) throw new Error('Audio asset was deleted');
        return asset;
    }

    require(name) {
        const asset = this.assets.get(name);
        if (!asset) throw new Error(`Unknown audio asset "${name}"`);
        return asset;
    }

    delete(name) {
        const asset = this.assets.get(name);
        if (!asset) return false;
        if (asset.references) throw new Error(`Audio asset "${name}" is still used by ${asset.references} sources`);
        asset.alive = false;
        this.assets.delete(name);
        const entry = asset.entry;
        if (--entry.owners === 0) {
            entry.dead = true;
            entry.controller.abort();
            entry.buffer = null;
            this.cache.delete(entry.key);
        }
        return true;
    }

    forScene(scene) {
        if (this.disposed) throw new Error('Audio system is disposed');
        if (!scene.audio) {
            scene.audio = new SceneAudio(scene, this);
            this.sceneStores.add(scene.audio);
        }
        return scene.audio;
    }

    update(scene) {
        const store = scene?.audio;
        if (!store?.playing.size || this.engine.simulationPaused) return;
        store.update();
        if (store.positionalPlaying) this.updateListener(scene);
    }

    updateListener(scene) {
        const context = this.context;
        if (!context) return;
        const objects = scene.objects, id = scene.activeCameraId;
        if (scene === this.listenerScene && id === this.listenerCamera && objects.cameraVersion === this.listenerVersion) return;
        const offset = id === null ? 0 : id * 3;
        if (id !== null) basisFromEuler(objects.rotation, offset, this.basis);
        const f = this.basis.forward, u = this.basis.up, v = this.listenerValues;
        const x = id === null ? 0 : objects.position[offset];
        const y = id === null ? 0 : objects.position[offset + 1];
        const z = id === null ? 0 : objects.position[offset + 2];
        const fx = id === null ? 0 : f[0], fy = id === null ? 0 : f[1], fz = id === null ? -1 : f[2];
        const ux = id === null ? 0 : u[0], uy = id === null ? 1 : u[1], uz = id === null ? 0 : u[2];
        if (v[0] === x && v[1] === y && v[2] === z && v[3] === fx && v[4] === fy && v[5] === fz &&
            v[6] === ux && v[7] === uy && v[8] === uz) return;
        const listener = context.listener;
        if (listener.positionX) {
            listener.positionX.value = x; listener.positionY.value = y; listener.positionZ.value = z;
            listener.forwardX.value = fx; listener.forwardY.value = fy; listener.forwardZ.value = fz;
            listener.upX.value = ux; listener.upY.value = uy; listener.upZ.value = uz;
        } else {
            listener.setPosition(x, y, z);
            listener.setOrientation(fx, fy, fz, ux, uy, uz);
        }
        // Publish the version only after every host write succeeds. A transient
        // Web Audio failure must remain retryable on the next engine update.
        this.listenerScene = scene; this.listenerCamera = id; this.listenerVersion = objects.cameraVersion;
        v[0] = x; v[1] = y; v[2] = z; v[3] = fx; v[4] = fy; v[5] = fz; v[6] = ux; v[7] = uy; v[8] = uz;
        this.metrics.listenerUpdates++;
    }

    pauseAll() { for (const store of this.sceneStores) store.pauseAll(); }

    pauseForRuntime() {
        for (const store of this.sceneStores) {
            for (const source of store.playing) {
                source.pause();
                source.runtimePaused = true;
            }
        }
    }

    resumeFromRuntime() {
        for (const store of this.sceneStores) {
            for (const source of store.resources.values()) {
                if (!source.runtimePaused) continue;
                source.runtimePaused = false;
                if (store.scene !== this.engine.scenes.active) continue;
                try { source.resume(); }
                catch (error) { this.engine.setError(error); }
            }
        }
    }

    reset() {
        for (const store of this.sceneStores) store.dispose();
        for (const name of this.assets.keys()) this.delete(name);
        this.listenerScene = this.listenerCamera = null;
        this.listenerVersion = -1;
        this.listenerValues.fill(NaN);
        this.error = '';
    }

    dispose() {
        if (this.disposed) return;
        this.reset();
        this.disposed = true;
        const context = this.context;
        this.context = null;
        if (context && context.state !== 'closed') {
            try { context.close().catch(() => {}); } catch { /* Already closed by host. */ }
        }
    }
}
