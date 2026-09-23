import {INSTANCE_STRIDE} from '../../engine/InstanceGroup.js';
import {LocalLightType} from '../../lights/LightStore.js';

export const MAX_LOCAL_LIGHTS = 8;

const HALF_CUBE_DIAGONAL = 0.5;

const now = () => globalThis.performance?.now?.() ?? Date.now();

const createResult = () => ({
    ids: new Int32Array(MAX_LOCAL_LIGHTS),
    count: 0,
    pointCount: 0,
    spotCount: 0,
    identityKey: '',
    dataKey: '',
    revision: 0,
    positionRange: new Float32Array(MAX_LOCAL_LIGHTS * 4),
    colorIntensity: new Float32Array(MAX_LOCAL_LIGHTS * 4),
    directionOuter: new Float32Array(MAX_LOCAL_LIGHTS * 4),
    innerCos: new Float32Array(MAX_LOCAL_LIGHTS)
});

const createCache = () => ({
    storeVersion: -1,
    budget: -1,
    x: Number.NaN,
    y: Number.NaN,
    z: Number.NaN,
    radius: Number.NaN,
    sourceVersion: -1,
    result: createResult()
});

export class LocalLightSelector {
    constructor() {
        this.objectCaches = new Map();
        this.groupCaches = new WeakMap();
        this.groupBounds = new WeakMap();
        this.modelCaches = new WeakMap();
        this.effectCaches = new WeakMap();
        this.scratchIds = new Int32Array(MAX_LOCAL_LIGHTS);
        this.scratchScores = new Float64Array(MAX_LOCAL_LIGHTS);
        this.lastStoreVersion = -1;
        this.lastBudget = -1;
        this.currentStoreVersion = -1;
        this.currentBudget = MAX_LOCAL_LIGHTS;
        this.lastScene = null;
        this.requiresRefresh = true;
        this.lastIdentityChanged = false;
        this.metrics = {
            totalLights: 0,
            enabledPointLights: 0,
            enabledSpotLights: 0,
            selectedLights: 0,
            selectedPointLights: 0,
            selectedSpotLights: 0,
            selectedLightReferences: 0,
            candidateLightReferences: 0,
            selectionEvaluations: 0,
            listRebuilds: 0,
            gpuUploads: 0,
            localLightDraws: 0,
            rejectedByRange: 0,
            rejectedByCone: 0,
            rejectedByBudget: 0,
            selectionCpuTime: 0
        };
    }

    beginFrame(scene, budget) {
        const sceneChanged = scene !== this.lastScene;
        if (sceneChanged) {
            // Object and light IDs are local to their stores and can repeat across scenes.
            // Never let matching revisions and bounds reuse another scene's packed data.
            this.objectCaches.clear();
            this.groupCaches = new WeakMap();
            this.groupBounds = new WeakMap();
            this.modelCaches = new WeakMap();
            this.effectCaches = new WeakMap();
        }
        const metrics = this.metrics;
        metrics.totalLights = scene.localLightIds.size;
        metrics.enabledPointLights = 0;
        metrics.enabledSpotLights = 0;
        metrics.selectedLights = 0;
        metrics.selectedPointLights = 0;
        metrics.selectedSpotLights = 0;
        metrics.selectedLightReferences = 0;
        metrics.candidateLightReferences = 0;
        metrics.selectionEvaluations = 0;
        metrics.listRebuilds = 0;
        metrics.gpuUploads = 0;
        metrics.localLightDraws = 0;
        metrics.rejectedByRange = 0;
        metrics.rejectedByCone = 0;
        metrics.rejectedByBudget = 0;
        metrics.selectionCpuTime = 0;
        for (const id of scene.localLightIds) {
            const light = scene.lights?.resourceForId(id);
            if (!light?.enabled || light.range <= 0 || light.intensity <= 0) continue;
            if (light.type === LocalLightType.POINT) metrics.enabledPointLights++;
            else metrics.enabledSpotLights++;
        }
        const storeVersion = scene.lights?.version ?? 0;
        this.requiresRefresh = sceneChanged || storeVersion !== this.lastStoreVersion ||
            budget !== this.lastBudget;
        this.currentStoreVersion = storeVersion;
        this.currentBudget = Math.max(0, Math.min(MAX_LOCAL_LIGHTS, Math.trunc(budget)));
        this.lastIdentityChanged = false;
    }

    finishFrame(scene) {
        this.lastScene = scene;
        this.lastStoreVersion = this.currentStoreVersion;
        this.lastBudget = this.currentBudget;
        this.requiresRefresh = false;
    }

    selectObject(scene, id) {
        let cache = this.objectCaches.get(id);
        if (!cache) {
            cache = createCache();
            this.objectCaches.set(id, cache);
        }
        const offset = id * 3;
        const scale = scene.objects.scale;
        const radius = Math.hypot(scale[offset], scale[offset + 1], scale[offset + 2]) * HALF_CUBE_DIAGONAL;
        return this.#select(
            scene,
            cache,
            scene.objects.position[offset],
            scene.objects.position[offset + 1],
            scene.objects.position[offset + 2],
            radius,
            0
        );
    }

    selectGroup(scene, group, start = 0, count = group.count) {
        let caches = this.groupCaches.get(group);
        if (!caches) {
            caches = new Map();
            this.groupCaches.set(group, caches);
        }
        const key = `${start}:${count}`;
        let cache = caches.get(key);
        if (!cache) {
            cache = createCache();
            caches.set(key, cache);
        }
        const bounds = this.#groupBounds(group, start, count);
        return this.#select(scene, cache, bounds.x, bounds.y, bounds.z, bounds.radius, group.version);
    }

    selectModelItem(scene, instance, itemIndex) {
        let caches = this.modelCaches.get(instance);
        if (!caches) {
            caches = new Map();
            this.modelCaches.set(instance, caches);
        }
        let cache = caches.get(itemIndex);
        if (!cache) {
            cache = createCache();
            caches.set(itemIndex, cache);
        }
        const item = instance.activeRenderItems[itemIndex];
        return this.#select(
            scene,
            cache,
            item.center[0],
            item.center[1],
            item.center[2],
            item.radius,
            instance.version
        );
    }

    selectEffect(scene, effect) {
        let cache = this.effectCaches.get(effect);
        if (!cache) {
            cache = createCache();
            this.effectCaches.set(effect, cache);
        }
        const bounds = effect.bounds;
        return this.#select(
            scene,
            cache,
            bounds.center[0],
            bounds.center[1],
            bounds.center[2],
            bounds.radius,
            effect.boundsVersion
        );
    }

    recordDraw(result) {
        this.#recordSelected(result);
        this.metrics.selectedLightReferences += result.count;
        this.metrics.localLightDraws++;
    }

    clear() {
        this.objectCaches.clear();
        this.groupCaches = new WeakMap();
        this.groupBounds = new WeakMap();
        this.modelCaches = new WeakMap();
        this.effectCaches = new WeakMap();
        this.lastScene = null;
        this.lastStoreVersion = -1;
        this.lastBudget = -1;
        this.requiresRefresh = true;
    }

    #select(scene, cache, x, y, z, radius, sourceVersion) {
        this.lastIdentityChanged = false;
        if (cache.storeVersion === this.currentStoreVersion && cache.budget === this.currentBudget &&
            cache.sourceVersion === sourceVersion && cache.x === x && cache.y === y && cache.z === z &&
            cache.radius === radius) {
            this.#recordSelected(cache.result);
            return cache.result;
        }

        const started = now();
        const budget = this.currentBudget;
        const ids = this.scratchIds;
        const scores = this.scratchScores;
        let selectedCount = 0;
        let qualifiedCount = 0;
        for (const id of scene.localLightIds) {
            const light = scene.lights?.resourceForId(id);
            if (!light?.enabled || light.range <= 0 || light.intensity <= 0) continue;
            this.metrics.selectionEvaluations++;
            const dx = x - light.position[0];
            const dy = y - light.position[1];
            const dz = z - light.position[2];
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            const distance = Math.sqrt(distanceSquared);
            if (distance > light.range + radius) {
                this.metrics.rejectedByRange++;
                continue;
            }
            if (!this.#spotIntersects(light, dx, dy, dz, distance, radius)) {
                this.metrics.rejectedByCone++;
                continue;
            }
            qualifiedCount++;
            if (budget === 0) continue;
            const nearestDistance = Math.max(distance - radius, 0.05);
            const normalizedDistance = Math.min(nearestDistance / light.range, 1);
            const cutoff = Math.max(1 - normalizedDistance ** 4, 0) ** 2;
            const brightness = Math.max(light.color[0], light.color[1], light.color[2]) * light.intensity;
            const score = brightness * cutoff / (nearestDistance * nearestDistance + 0.01);
            let insertAt = selectedCount;
            while (insertAt > 0 && (score > scores[insertAt - 1] ||
                (score === scores[insertAt - 1] && id < ids[insertAt - 1]))) insertAt--;
            if (insertAt >= budget) continue;
            const end = Math.min(selectedCount, budget - 1);
            for (let index = end; index > insertAt; index--) {
                ids[index] = ids[index - 1];
                scores[index] = scores[index - 1];
            }
            ids[insertAt] = id;
            scores[insertAt] = score;
            if (selectedCount < budget) selectedCount++;
        }
        this.metrics.candidateLightReferences += qualifiedCount;
        this.metrics.rejectedByBudget += Math.max(0, qualifiedCount - selectedCount);

        // Light order does not affect the sum. Sorting the bounded result by stable ID lets
        // nearby resources with the same selected set remain in one instanced batch.
        for (let index = 1; index < selectedCount; index++) {
            const id = ids[index];
            let previous = index - 1;
            while (previous >= 0 && ids[previous] > id) {
                ids[previous + 1] = ids[previous];
                previous--;
            }
            ids[previous + 1] = id;
        }

        const result = cache.result;
        let identityChanged = result.count !== selectedCount;
        if (!identityChanged) {
            for (let index = 0; index < selectedCount; index++) {
                if (result.ids[index] !== ids[index]) {
                    identityChanged = true;
                    break;
                }
            }
        }
        let identityKey = '';
        let dataKey = '';
        for (let index = 0; index < selectedCount; index++) {
            const light = scene.lights.resourceForId(ids[index]);
            identityKey += index === 0 ? String(ids[index]) : `,${ids[index]}`;
            dataKey += `${ids[index]}:${light.revision};`;
        }
        const dataChanged = identityChanged || result.dataKey !== dataKey;
        if (dataChanged) {
            result.count = selectedCount;
            result.ids.set(ids.subarray(0, selectedCount));
            result.identityKey = identityKey;
            result.dataKey = dataKey;
            this.#pack(scene, result);
            result.revision++;
            this.metrics.listRebuilds++;
        }
        cache.storeVersion = this.currentStoreVersion;
        cache.budget = budget;
        cache.sourceVersion = sourceVersion;
        cache.x = x;
        cache.y = y;
        cache.z = z;
        cache.radius = radius;
        this.lastIdentityChanged = identityChanged;
        this.metrics.selectionCpuTime += now() - started;
        this.#recordSelected(result);
        return result;
    }

    #pack(scene, result) {
        let pointCount = 0;
        let spotCount = 0;
        for (let index = 0; index < result.count; index++) {
            const light = scene.lights.resourceForId(result.ids[index]);
            const offset = index * 4;
            result.positionRange[offset] = light.position[0];
            result.positionRange[offset + 1] = light.position[1];
            result.positionRange[offset + 2] = light.position[2];
            result.positionRange[offset + 3] = light.range;
            result.colorIntensity[offset] = light.color[0];
            result.colorIntensity[offset + 1] = light.color[1];
            result.colorIntensity[offset + 2] = light.color[2];
            result.colorIntensity[offset + 3] = light.intensity;
            if (light.type === LocalLightType.SPOT) {
                result.directionOuter[offset] = light.direction[0];
                result.directionOuter[offset + 1] = light.direction[1];
                result.directionOuter[offset + 2] = light.direction[2];
                result.directionOuter[offset + 3] = light.outerCos;
                result.innerCos[index] = light.innerCos;
                spotCount++;
            } else {
                result.directionOuter[offset] = 0;
                result.directionOuter[offset + 1] = 0;
                result.directionOuter[offset + 2] = 0;
                result.directionOuter[offset + 3] = -2;
                result.innerCos[index] = -2;
                pointCount++;
            }
        }
        result.pointCount = pointCount;
        result.spotCount = spotCount;
    }

    #recordSelected(result) {
        this.metrics.selectedLights = Math.max(this.metrics.selectedLights, result.count);
        this.metrics.selectedPointLights = Math.max(this.metrics.selectedPointLights, result.pointCount);
        this.metrics.selectedSpotLights = Math.max(this.metrics.selectedSpotLights, result.spotCount);
    }

    #spotIntersects(light, dx, dy, dz, distance, radius) {
        if (light.type !== LocalLightType.SPOT || distance <= radius || distance < 1e-8) return true;
        const inverseDistance = 1 / distance;
        const cosine = (dx * light.direction[0] + dy * light.direction[1] + dz * light.direction[2]) *
            inverseDistance;
        const margin = Math.asin(Math.min(radius * inverseDistance, 1));
        const threshold = Math.cos(Math.min(light.outerAngle * Math.PI / 180 + margin, Math.PI));
        return cosine >= threshold;
    }

    #groupBounds(group, start, count) {
        let cache = this.groupBounds.get(group);
        if (!cache) {
            cache = new Map();
            this.groupBounds.set(group, cache);
        }
        const key = `${start}:${count}`;
        const cached = cache.get(key);
        if (cached?.version === group.version) return cached;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        const end = Math.min(group.count, start + count);
        for (let index = start; index < end; index++) {
            const offset = index * INSTANCE_STRIDE;
            const halfX = Math.abs(group.data[offset + 6]) * 0.5;
            const halfY = Math.abs(group.data[offset + 7]) * 0.5;
            const halfZ = Math.abs(group.data[offset + 8]) * 0.5;
            minX = Math.min(minX, group.data[offset] - halfX);
            minY = Math.min(minY, group.data[offset + 1] - halfY);
            minZ = Math.min(minZ, group.data[offset + 2] - halfZ);
            maxX = Math.max(maxX, group.data[offset] + halfX);
            maxY = Math.max(maxY, group.data[offset + 1] + halfY);
            maxZ = Math.max(maxZ, group.data[offset + 2] + halfZ);
        }
        const x = (minX + maxX) * 0.5;
        const y = (minY + maxY) * 0.5;
        const z = (minZ + maxZ) * 0.5;
        const bounds = {
            version: group.version,
            x,
            y,
            z,
            radius: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) * 0.5
        };
        cache.set(key, bounds);
        return bounds;
    }
}
