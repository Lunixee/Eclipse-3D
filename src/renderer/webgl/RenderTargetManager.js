import {RenderTarget} from './RenderTarget.js';

const configurationKey = options => [
    options.colorFormat ?? 'rgba8',
    options.depth ?? 'renderbuffer',
    options.filter ?? 'linear',
    Math.max(0, Math.round(Number(options.samples) || 0))
].join(':');

export class RenderTargetManager {
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {import('../../renderTargets/RenderTargetStore.js').RenderTargetStore | null} [store]
     */
    constructor(gl, store = null) {
        this.gl = gl;
        this.store = store;
        this.internal = new Map();
        this.users = new Map();
        this.totalAllocations = 0;
        this.totalResizes = 0;
        this.totalReuses = 0;
        this.totalResolves = 0;
        this.frameAllocations = 0;
        this.frameResizes = 0;
        this.frameReuses = 0;
        this.frameResolves = 0;
    }

    /** @param {import('../../renderTargets/RenderTargetStore.js').RenderTargetStore | null} store */
    setStore(store) {
        this.store = store;
        this.sweepUsers();
    }

    beginFrame() {
        this.sweepUsers();
        this.frameAllocations = 0;
        this.frameResizes = 0;
        this.frameReuses = 0;
        this.frameResolves = 0;
    }

    getInternal(key, width, height, options = {}) {
        const configKey = configurationKey(options);
        let entry = this.internal.get(key);
        if (entry && entry.configKey !== configKey) {
            entry.target.dispose();
            this.internal.delete(key);
            entry = null;
        }
        if (!entry) {
            const target = new RenderTarget(this.gl, {...options, label: options.label ?? `internal target ${key}`});
            entry = {target, configKey, category: options.category ?? 'post'};
            this.internal.set(key, entry);
            this.#allocated();
        }
        try {
            this.#resize(entry.target, width, height);
        } catch (error) {
            entry.target.dispose();
            this.internal.delete(key);
            throw error;
        }
        return entry.target;
    }

    releaseInternal(prefix = '') {
        for (const [key, entry] of this.internal) {
            if (prefix && !key.startsWith(prefix)) continue;
            entry.target.dispose();
            this.internal.delete(key);
        }
    }

    getExternalTexture(targetId) {
        const definition = this.store?.resourceForId(targetId);
        if (!definition) return null;
        return this.#ensureUser(definition).front.texture;
    }

    renderUser(definition, render) {
        const entry = this.#ensureUser(definition);
        render(entry.back.framebuffer, definition.width, definition.height);
        if (entry.back.resolve()) this.#resolved();
        const previous = entry.front;
        entry.front = entry.back;
        entry.back = previous;
        entry.completed = true;
        return entry.front.texture;
    }

    resolve(target) {
        if (target.resolve()) this.#resolved();
    }

    clearUser(definition, color = [0, 0, 0, 0]) {
        const entry = this.#ensureUser(definition);
        entry.front.clear(color);
        entry.back.clear(color);
        entry.completed = true;
    }

    sweepUsers() {
        for (const [id, entry] of this.users) {
            if (this.store?.resourceForId(id) === entry.definition) continue;
            entry.front.dispose();
            entry.back.dispose();
            this.users.delete(id);
        }
    }

    metrics() {
        let targetBytes = 0;
        let sceneTargetBytes = 0;
        let bloomTargetBytes = 0;
        let postTargetBytes = 0;
        for (const [key, entry] of this.internal) {
            const bytes = entry.target.estimatedBytes;
            targetBytes += bytes;
            if (key === 'scene') sceneTargetBytes += bytes;
            else if (entry.category === 'bloom') bloomTargetBytes += bytes;
            else postTargetBytes += bytes;
        }
        for (const entry of this.users.values()) {
            targetBytes += entry.front.estimatedBytes + entry.back.estimatedBytes;
        }
        return {
            renderTargetAllocations: this.frameAllocations,
            renderTargetResizes: this.frameResizes,
            renderTargetReuses: this.frameReuses,
            targetResolves: this.frameResolves,
            totalRenderTargetAllocations: this.totalAllocations,
            totalRenderTargetResizes: this.totalResizes,
            totalRenderTargetReuses: this.totalReuses,
            totalTargetResolves: this.totalResolves,
            renderTargetBytes: targetBytes,
            sceneTargetBytes,
            bloomTargetBytes,
            postTargetBytes,
            internalRenderTargets: this.internal.size,
            userRenderTargets: this.users.size,
            physicalRenderTargets: this.internal.size + this.users.size * 2
        };
    }

    resetResources() {
        this.releaseInternal();
        for (const entry of this.users.values()) {
            entry.front.dispose();
            entry.back.dispose();
        }
        this.users.clear();
        this.totalAllocations = 0;
        this.totalResizes = 0;
        this.totalReuses = 0;
        this.totalResolves = 0;
        this.frameAllocations = 0;
        this.frameResizes = 0;
        this.frameReuses = 0;
        this.frameResolves = 0;
    }

    dispose() {
        for (const entry of this.internal.values()) entry.target.dispose();
        this.internal.clear();
        for (const entry of this.users.values()) {
            entry.front.dispose();
            entry.back.dispose();
        }
        this.users.clear();
        this.store = null;
    }

    #ensureUser(definition) {
        let entry = this.users.get(definition.id);
        if (!entry || entry.definition !== definition) {
            if (entry) {
                entry.front.dispose();
                entry.back.dispose();
            }
            const options = {depth: 'renderbuffer', colorFormat: 'rgba8', filter: 'linear', samples: 0};
            let front = null;
            let back = null;
            try {
                front = new RenderTarget(this.gl, {...options, label: `render target ${definition.name} front`});
                back = new RenderTarget(this.gl, {...options, label: `render target ${definition.name} back`});
            } catch (error) {
                front?.dispose();
                back?.dispose();
                throw error;
            }
            entry = {definition, front, back, completed: false};
            this.users.set(definition.id, entry);
            this.#allocated();
            this.#allocated();
        }
        let frontChanged;
        let backChanged;
        try {
            frontChanged = this.#resize(entry.front, definition.width, definition.height);
            backChanged = this.#resize(entry.back, definition.width, definition.height);
        } catch (error) {
            entry.front.dispose();
            entry.back.dispose();
            this.users.delete(definition.id);
            throw error;
        }
        if (!entry.completed || frontChanged || backChanged) {
            // Both sides start defined. During feedback, the scene samples front while back is attached for writing.
            entry.front.clear();
            entry.back.clear();
            entry.completed = true;
        }
        return entry;
    }

    #resize(target, width, height) {
        const firstAllocation = target.version === 0;
        if (!target.resize(width, height)) {
            this.frameReuses++;
            this.totalReuses++;
            return false;
        }
        if (!firstAllocation) {
            this.frameResizes++;
            this.totalResizes++;
        }
        return true;
    }

    #allocated() {
        this.frameAllocations++;
        this.totalAllocations++;
    }

    #resolved() {
        this.frameResolves++;
        this.totalResolves++;
    }
}
