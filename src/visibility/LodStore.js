export const MAX_LOD_LEVELS = 16;

class LodGroup {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.levels = [];
        this.references = 0;
        this.version = 1;
    }
}

export class LodStore {
    /**
     * @param {import('../models/ModelStore.js').ModelStore} models
     * @param {(() => void) | null} [onChange]
     */
    constructor(models, onChange = null) {
        this.models = models;
        this.onChange = onChange;
        this.groups = new Map();
        this.groupsById = [];
        this.nextId = 0;
        this.version = 1;
    }

    create(name) {
        const normalized = String(name).trim();
        if (!normalized) throw new Error('LOD group name cannot be empty');
        if (this.groups.has(normalized)) throw new Error(`LOD group "${normalized}" already exists`);
        const group = new LodGroup(this.nextId++, normalized);
        this.groups.set(normalized, group);
        this.groupsById[group.id] = group;
        this.#changed();
        return group;
    }

    require(name) {
        const normalized = String(name).trim();
        const group = this.groups.get(normalized);
        if (!group) throw new Error(`Unknown LOD group "${normalized}"`);
        return group;
    }

    has(name) {
        return this.groups.has(String(name).trim());
    }

    addLevel(groupName, modelName, threshold) {
        const group = this.require(groupName);
        if (group.references > 0) throw new Error(`LOD group "${group.name}" cannot change while assigned to instances`);
        if (group.levels.length >= MAX_LOD_LEVELS) throw new Error(`LOD groups support at most ${MAX_LOD_LEVELS} levels`);
        const distance = Number(threshold);
        if (!Number.isFinite(distance) || distance < 0) throw new Error('LOD threshold must be finite and non-negative');
        if (group.levels.length === 0 && distance !== 0) throw new Error('The first LOD threshold must be 0');
        const previous = group.levels.at(-1);
        if (previous && distance <= previous.threshold) {
            throw new Error('LOD thresholds must be added in strictly increasing order');
        }
        const asset = this.models.require(String(modelName).trim());
        if (asset.state !== 'ready') throw new Error(`Model "${asset.name}" is not ready`);
        if (asset.animations.length > 0 || asset.skins.length > 0 ||
            asset.primitives.some(primitive => primitive.skinIndex >= 0)) {
            throw new Error('LOD levels must use static unskinned model assets');
        }
        if (group.levels.some(level => level.assetId === asset.id)) {
            throw new Error(`Model "${asset.name}" already exists in LOD group "${group.name}"`);
        }
        this.models.retain(asset.id);
        group.levels.push({assetId: asset.id, asset, threshold: distance});
        group.version++;
        this.#changed();
        return group.levels.length - 1;
    }

    delete(name) {
        const group = this.require(name);
        if (group.references > 0) {
            throw new Error(`LOD group "${group.name}" is still used by ${group.references} instance(s)`);
        }
        this.groups.delete(group.name);
        this.groupsById[group.id] = null;
        for (const level of group.levels) this.models.release(level.assetId);
        group.levels.length = 0;
        this.#changed();
    }

    retain(id) {
        const group = this.groupsById[id];
        if (!group) throw new Error(`Unknown LOD group ID ${id}`);
        group.references++;
    }

    release(id) {
        const group = this.groupsById[id];
        if (group) group.references = Math.max(0, group.references - 1);
    }

    clear() {
        for (const group of this.groups.values()) {
            for (const level of group.levels) this.models.release(level.assetId);
            group.levels.length = 0;
            group.references = 0;
        }
        this.groups.clear();
        this.groupsById.length = 0;
        this.nextId = 0;
        this.#changed();
    }

    get count() {
        return this.groups.size;
    }

    #changed() {
        this.version++;
        this.onChange?.();
    }
}
