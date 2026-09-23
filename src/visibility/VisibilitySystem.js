import {ObjectKind} from '../constants.js';
import {INSTANCE_STRIDE} from '../engine/InstanceGroup.js';
import {composeEulerTrs} from '../models/modelMath.js';
import {
    boundsIntersectsDistance,
    copyBounds,
    createBounds,
    setBounds,
    transformBounds
} from './Bounds.js';
import {Frustum} from './Frustum.js';
import {LooseSpatialGrid} from './LooseSpatialGrid.js';

export const SMALL_SCENE_VISIBILITY_THRESHOLD = 128;
export const VISIBILITY_GRID_CELL_SIZE = 32;

const now = () => typeof performance === 'object' ? performance.now() : 0;

const matrixChanged = (current, previous) => {
    for (let index = 0; index < 16; index++) if (current[index] !== previous[index]) return true;
    return false;
};

const entry = (kind, owner, itemIndex = -1) => ({
    kind,
    owner,
    itemIndex,
    slot: -1,
    bounds: createBounds(),
    visible: false,
    frustumCulling: true,
    cameraStamp: 0,
    shadowStamp: 0,
    cameraProcessedStamp: 0,
    shadowProcessedStamp: 0,
    queryStamp: 0,
    gridCells: [],
    gridOversized: false,
    gridMinimumX: NaN,
    gridMinimumY: NaN,
    gridMinimumZ: NaN,
    gridMaximumX: NaN,
    gridMaximumY: NaN,
    gridMaximumZ: NaN
});

export class VisibilitySystem {
    constructor(scene, cellSize = VISIBILITY_GRID_CELL_SIZE, smallSceneThreshold = SMALL_SCENE_VISIBILITY_THRESHOLD) {
        this.scene = scene;
        this.smallSceneThreshold = smallSceneThreshold;
        this.grid = new LooseSpatialGrid(cellSize);
        this.cameraFrustum = new Frustum();
        this.shadowFrustum = new Frustum();
        this.entries = [];
        this.freeEntrySlots = [];
        this.objectEntries = [];
        this.groupEntries = new Map();
        this.modelEntries = new Map();
        this.terrainEntries = new Map();
        this.effectEntries = new Map();
        this.alwaysCandidates = new Set();
        this.dirtyObjects = new Set();
        this.dirtyGroups = new Set();
        this.dirtyModels = new Set();
        this.dirtyTerrains = new Set();
        this.dirtyEffects = new Set();
        this.candidates = [];
        this.matrixScratch = new Float32Array(16);
        this.positionScratch = new Float32Array(3);
        this.rotationScratch = new Float32Array(3);
        this.scaleScratch = new Float32Array(3);
        this.cameraMatrix = new Float32Array(16);
        this.shadowMatrix = new Float32Array(16);
        this.cameraMatrix.fill(NaN);
        this.shadowMatrix.fill(NaN);
        this.cameraPosition = new Float32Array([NaN, NaN, NaN]);
        this.cameraRenderDistance = NaN;
        this.cameraFrustumEnabled = true;
        this.cameraContentVersion = -1;
        this.shadowContentVersion = -1;
        this.contentVersion = 1;
        this.cameraStamp = 0;
        this.shadowStamp = 0;
        this.entryCount = 0;
        this.visibleEntryCount = 0;
        this.lastDirtyBounds = 0;
        this.lastAnimatedBounds = 0;
        this.cameraMetrics = this.#createCameraMetrics();
        this.shadowMetrics = this.#createShadowMetrics();
        this.rayQueryMetrics = {candidates: this.candidates, spatialPath: 0, milliseconds: 0};
        this.cubeBounds = setBounds(
            createBounds(),
            new Float32Array([-0.5, -0.5, -0.5]),
            new Float32Array([0.5, 0.5, 0.5])
        );
    }

    markObject(id, removed = false) {
        if (removed) this.#removeObject(id);
        else this.dirtyObjects.add(id);
    }

    markGroup(group, instanceIndex = -1) {
        let record = this.groupEntries.get(group);
        if (!record) {
            record = {
                entries: new Array(group.count),
                dirty: new Uint8Array(group.count),
                dirtyIndices: [],
                allDirty: false
            };
            this.groupEntries.set(group, record);
        }
        if (instanceIndex < 0) {
            record.allDirty = true;
            record.dirty.fill(0);
            record.dirtyIndices.length = 0;
        } else if (!record.allDirty && !record.dirty[instanceIndex]) {
            record.dirty[instanceIndex] = 1;
            record.dirtyIndices.push(instanceIndex);
        }
        this.dirtyGroups.add(group);
    }

    removeGroup(group) {
        const record = this.groupEntries.get(group);
        if (!record) return;
        for (const value of record.entries) if (value) this.#removeEntry(value);
        this.groupEntries.delete(group);
        this.dirtyGroups.delete(group);
    }

    markModel(model) {
        this.dirtyModels.add(model);
    }

    removeModel(model) {
        this.dirtyModels.delete(model);
        const value = this.modelEntries.get(model);
        if (!value) return;
        this.#removeEntry(value);
        this.modelEntries.delete(model);
    }

    markTerrain(terrain) {
        this.dirtyTerrains.add(terrain);
    }

    removeTerrain(terrain) {
        this.dirtyTerrains.delete(terrain);
        const value = this.terrainEntries.get(terrain);
        if (!value) return;
        this.#removeEntry(value);
        this.terrainEntries.delete(terrain);
    }

    markEffect(effect, removed = false) {
        if (removed) return this.removeEffect(effect);
        this.dirtyEffects.add(effect);
    }

    removeEffect(effect) {
        this.dirtyEffects.delete(effect);
        const value = this.effectEntries.get(effect);
        if (!value) return;
        this.#removeEntry(value);
        this.effectEntries.delete(effect);
    }

    sync() {
        this.scene.flushTerrainGeometry?.();
        let dirtyBounds = 0;
        let animatedBounds = 0;
        for (const id of this.dirtyObjects) {
            if (!this.scene.objects.alive[id] || this.scene.objects.kinds[id] !== ObjectKind.CUBE) {
                this.#removeObject(id);
                continue;
            }
            let value = this.objectEntries[id];
            if (!value) {
                value = entry('object', id);
                this.objectEntries[id] = value;
                this.#addEntry(value);
            }
            const offset = id * 3;
            this.#composeFromData(
                this.scene.objects.position,
                offset,
                this.scene.objects.rotation,
                offset,
                this.scene.objects.scale,
                offset
            );
            transformBounds(value.bounds, this.#geometryCubeBounds(), this.matrixScratch);
            value.visible = Boolean(this.scene.objects.visible[id]);
            value.frustumCulling = Boolean(this.scene.objects.frustumCulling[id]);
            this.#updateEntry(value);
            dirtyBounds++;
        }
        this.dirtyObjects.clear();
        for (const group of this.dirtyGroups) {
            const record = this.groupEntries.get(group);
            if (!record) continue;
            if (record.allDirty) {
                for (let index = 0; index < group.count; index++) {
                    this.#syncGroupIndex(group, record, index);
                    dirtyBounds++;
                }
            } else {
                for (const index of record.dirtyIndices) {
                    this.#syncGroupIndex(group, record, index);
                    record.dirty[index] = 0;
                    dirtyBounds++;
                }
            }
            record.allDirty = false;
            record.dirtyIndices.length = 0;
        }
        this.dirtyGroups.clear();
        for (const model of this.dirtyModels) {
            let value = this.modelEntries.get(model);
            if (!value) {
                value = entry('model', model);
                this.modelEntries.set(model, value);
                this.#addEntry(value);
            }
            copyBounds(value.bounds, model.activeBounds);
            value.visible = model.visible;
            value.frustumCulling = model.frustumCulling;
            this.#updateEntry(value);
            dirtyBounds++;
            if (model.skinPaletteStates.size > 0 && model.lastBoundsUpdates > 0) animatedBounds += model.lastBoundsUpdates;
        }
        this.dirtyModels.clear();
        for (const terrain of this.dirtyTerrains) {
            let value = this.terrainEntries.get(terrain);
            if (!value) {
                value = entry('terrain', terrain);
                this.terrainEntries.set(terrain, value);
                this.#addEntry(value);
            }
            copyBounds(value.bounds, terrain.activeBounds);
            value.visible = terrain.visible;
            value.frustumCulling = terrain.frustumCulling;
            this.#updateEntry(value);
            dirtyBounds++;
        }
        this.dirtyTerrains.clear();
        for (const effect of this.dirtyEffects) {
            if (effect.disposed) {
                this.removeEffect(effect);
                continue;
            }
            let value = this.effectEntries.get(effect);
            if (!value) {
                value = entry('effect', effect);
                this.effectEntries.set(effect, value);
                this.#addEntry(value);
            }
            copyBounds(value.bounds, effect.bounds);
            value.visible = effect.visible;
            value.frustumCulling = effect.frustumCulling;
            this.#updateEntry(value);
            dirtyBounds++;
        }
        this.dirtyEffects.clear();
        this.lastDirtyBounds = dirtyBounds;
        this.lastAnimatedBounds = animatedBounds;
        return dirtyBounds;
    }

    prepareCamera(viewProjection, x, y, z, renderDistance, frustumEnabled = true) {
        this.sync();
        const changed = this.cameraContentVersion !== this.contentVersion ||
            this.cameraPosition[0] !== x || this.cameraPosition[1] !== y || this.cameraPosition[2] !== z ||
            this.cameraRenderDistance !== renderDistance || this.cameraFrustumEnabled !== frustumEnabled ||
            matrixChanged(viewProjection, this.cameraMatrix);
        if (!changed) {
            this.cameraMetrics.visibilityReused = 1;
            this.cameraMetrics.visibilityCpuTime = 0;
            this.cameraMetrics.spatialQueryCpuTime = 0;
            this.cameraMetrics.dirtyBounds = 0;
            this.cameraMetrics.animatedBounds = 0;
            return this.cameraMetrics;
        }
        const started = now();
        this.cameraMatrix.set(viewProjection);
        this.cameraPosition[0] = x;
        this.cameraPosition[1] = y;
        this.cameraPosition[2] = z;
        this.cameraRenderDistance = renderDistance;
        this.cameraFrustumEnabled = Boolean(frustumEnabled);
        this.cameraContentVersion = this.contentVersion;
        this.cameraFrustum.setFromMatrix(viewProjection);
        const metrics = this.#resetCameraMetrics();
        const stamp = ++this.cameraStamp;
        if (this.cameraFrustumEnabled && this.visibleEntryCount >= this.smallSceneThreshold) {
            this.grid.query(this.cameraFrustum, this.candidates);
            metrics.spatialPath = 1;
            metrics.spatialCandidates = this.candidates.length;
            metrics.spatialQueryCpuTime = this.grid.lastQueryTime;
            for (const value of this.candidates) this.#testCameraEntry(value, stamp, x, y, z, renderDistance, metrics);
            for (const value of this.alwaysCandidates) {
                this.#testCameraEntry(value, stamp, x, y, z, renderDistance, metrics);
            }
        } else {
            metrics.spatialCandidates = this.visibleEntryCount;
            for (const value of this.entries) {
                if (value?.visible) this.#testCameraEntry(value, stamp, x, y, z, renderDistance, metrics);
            }
        }
        metrics.visibleRenderables = metrics.visibleInstances;
        metrics.culledInstances = this.visibleEntryCount - metrics.visibleInstances;
        metrics.visibilityCpuTime = started ? now() - started : 0;
        return metrics;
    }

    prepareShadow(viewProjection) {
        this.sync();
        const changed = this.shadowContentVersion !== this.contentVersion || matrixChanged(viewProjection, this.shadowMatrix);
        if (!changed) {
            this.shadowMetrics.visibilityReused = 1;
            this.shadowMetrics.spatialQueryCpuTime = 0;
            return this.shadowMetrics;
        }
        this.shadowMatrix.set(viewProjection);
        this.shadowContentVersion = this.contentVersion;
        this.shadowFrustum.setFromMatrix(viewProjection);
        const metrics = this.#resetShadowMetrics();
        const stamp = ++this.shadowStamp;
        if (this.visibleEntryCount >= this.smallSceneThreshold) {
            this.grid.query(this.shadowFrustum, this.candidates);
            metrics.spatialPath = 1;
            metrics.spatialCandidates = this.candidates.length;
            metrics.spatialQueryCpuTime = this.grid.lastQueryTime;
            for (const value of this.candidates) this.#testShadowEntry(value, stamp, metrics);
            for (const value of this.alwaysCandidates) this.#testShadowEntry(value, stamp, metrics);
        } else {
            metrics.spatialCandidates = this.visibleEntryCount;
            for (const value of this.entries) if (value?.visible) this.#testShadowEntry(value, stamp, metrics);
        }
        return metrics;
    }

    queryRay(origin, direction, maximumDistance, output = this.candidates) {
        this.sync();
        output.length = 0;
        const metrics = this.rayQueryMetrics;
        metrics.candidates = output;
        if (this.visibleEntryCount >= this.smallSceneThreshold) {
            this.grid.queryRay(origin, direction, maximumDistance, output);
            const stamp = this.grid.queryStamp;
            for (const value of this.alwaysCandidates) {
                if (!value.visible || value.queryStamp === stamp) continue;
                value.queryStamp = stamp;
                output.push(value);
            }
            metrics.spatialPath = 1;
            metrics.milliseconds = this.grid.lastRayQueryTime;
            return metrics;
        }
        for (const value of this.entries) if (value?.visible) output.push(value);
        metrics.spatialPath = 0;
        metrics.milliseconds = 0;
        return metrics;
    }

    objectVisible(id, shadow = false) {
        const value = this.objectEntries[id];
        return !value || (shadow ? value.shadowStamp === this.shadowStamp : value.cameraStamp === this.cameraStamp);
    }

    groupInstanceVisible(group, index, shadow = false) {
        const value = this.groupEntries.get(group)?.entries[index];
        return !value || (shadow ? value.shadowStamp === this.shadowStamp : value.cameraStamp === this.cameraStamp);
    }

    modelVisible(model, shadow = false) {
        const value = this.modelEntries.get(model);
        return !value || (shadow ? value.shadowStamp === this.shadowStamp : value.cameraStamp === this.cameraStamp);
    }

    terrainVisible(terrain, shadow = false) {
        const value = this.terrainEntries.get(terrain);
        return !value || (shadow ? value.shadowStamp === this.shadowStamp : value.cameraStamp === this.cameraStamp);
    }

    effectVisible(effect, shadow = false) {
        const value = this.effectEntries.get(effect);
        return !value || (shadow ? value.shadowStamp === this.shadowStamp : value.cameraStamp === this.cameraStamp);
    }

    cameraIntersectsItem(model, item) {
        if (!model.frustumCulling && !(this.cameraRenderDistance > 0)) return true;
        if (!boundsIntersectsDistance(
            item.bounds,
            this.cameraPosition[0],
            this.cameraPosition[1],
            this.cameraPosition[2],
            this.cameraRenderDistance
        )) return false;
        return !this.cameraFrustumEnabled || !model.frustumCulling || this.cameraFrustum.intersectsBounds(item.bounds);
    }

    shadowIntersectsItem(item) {
        return this.shadowFrustum.intersectsBounds(item.bounds);
    }

    clear() {
        this.grid.clear();
        this.entries.length = 0;
        this.freeEntrySlots.length = 0;
        this.objectEntries.length = 0;
        this.groupEntries.clear();
        this.modelEntries.clear();
        this.terrainEntries.clear();
        this.effectEntries.clear();
        this.alwaysCandidates.clear();
        this.dirtyObjects.clear();
        this.dirtyGroups.clear();
        this.dirtyModels.clear();
        this.dirtyTerrains.clear();
        this.dirtyEffects.clear();
        this.candidates.length = 0;
        this.entryCount = 0;
        this.visibleEntryCount = 0;
        this.contentVersion++;
    }

    #geometryCubeBounds() {
        return this.scene.models?.geometry?.cube?.bounds ?? this.cubeBounds;
    }

    #composeFromData(position, positionOffset, rotation, rotationOffset, scale, scaleOffset) {
        for (let axis = 0; axis < 3; axis++) {
            this.positionScratch[axis] = position[positionOffset + axis];
            this.rotationScratch[axis] = rotation[rotationOffset + axis];
            this.scaleScratch[axis] = scale[scaleOffset + axis];
        }
        composeEulerTrs(this.matrixScratch, this.positionScratch, this.rotationScratch, this.scaleScratch);
    }

    #syncGroupIndex(group, record, index) {
        let value = record.entries[index];
        if (!value) {
            value = entry('group', group, index);
            record.entries[index] = value;
            this.#addEntry(value);
        }
        const offset = index * INSTANCE_STRIDE;
        this.#composeFromData(group.data, offset, group.data, offset + 3, group.data, offset + 6);
        transformBounds(value.bounds, this.#geometryCubeBounds(), this.matrixScratch);
        value.visible = group.visible;
        value.frustumCulling = group.frustumCulling;
        this.#updateEntry(value);
    }

    #addEntry(value) {
        const slot = this.freeEntrySlots.length > 0 ? this.freeEntrySlots.pop() : this.entries.length;
        value.slot = slot;
        this.entries[slot] = value;
        this.entryCount++;
    }

    #removeObject(id) {
        const value = this.objectEntries[id];
        if (!value) return;
        this.#removeEntry(value);
        this.objectEntries[id] = null;
        this.dirtyObjects.delete(id);
    }

    #removeEntry(value) {
        if (value.visible) this.visibleEntryCount--;
        this.grid.remove(value);
        this.alwaysCandidates.delete(value);
        this.entries[value.slot] = null;
        this.freeEntrySlots.push(value.slot);
        value.visible = false;
        this.entryCount--;
        this.contentVersion++;
    }

    #updateEntry(value) {
        const wasVisible = value._indexedVisible ?? false;
        if (wasVisible !== value.visible) this.visibleEntryCount += value.visible ? 1 : -1;
        value._indexedVisible = value.visible;
        this.alwaysCandidates.delete(value);
        if (!value.visible) this.grid.remove(value);
        else if (!value.bounds.valid) {
            this.grid.remove(value);
            this.alwaysCandidates.add(value);
        } else {
            this.grid.update(value);
            if (!value.frustumCulling) this.alwaysCandidates.add(value);
        }
        this.contentVersion++;
    }

    #testCameraEntry(value, stamp, x, y, z, renderDistance, metrics) {
        if (!value.visible || value.cameraProcessedStamp === stamp) return;
        value.cameraProcessedStamp = stamp;
        metrics.visibilityCandidates++;
        if (!boundsIntersectsDistance(value.bounds, x, y, z, renderDistance)) {
            metrics.renderDistanceRejected++;
            return;
        }
        if (this.cameraFrustumEnabled && value.frustumCulling) {
            metrics.frustumTested++;
            if (!this.cameraFrustum.intersectsBounds(value.bounds)) {
                metrics.frustumRejected++;
                return;
            }
        }
        value.cameraStamp = stamp;
        metrics.visibleInstances++;
    }

    #testShadowEntry(value, stamp, metrics) {
        if (!value.visible || value.kind === 'effect' || value.shadowProcessedStamp === stamp) return;
        value.shadowProcessedStamp = stamp;
        metrics.shadowCandidates++;
        if (!this.shadowFrustum.intersectsBounds(value.bounds)) {
            metrics.shadowFrustumRejected++;
            return;
        }
        value.shadowStamp = stamp;
        metrics.shadowVisible++;
    }

    #createCameraMetrics() {
        return {
            totalRenderables: 0,
            bruteForceCandidates: 0,
            visibilityCandidates: 0,
            spatialCandidates: 0,
            frustumTested: 0,
            frustumRejected: 0,
            renderDistanceRejected: 0,
            hiddenRejected: 0,
            visibleRenderables: 0,
            visibleInstances: 0,
            culledInstances: 0,
            visibilityCpuTime: 0,
            spatialQueryCpuTime: 0,
            spatialIndexEntries: 0,
            spatialIndexUpdates: 0,
            spatialIndexRebuilds: 0,
            dirtyBounds: 0,
            animatedBounds: 0,
            visibilityReused: 0,
            spatialPath: 0
        };
    }

    #resetCameraMetrics() {
        const metrics = this.cameraMetrics;
        metrics.totalRenderables = this.entryCount;
        metrics.bruteForceCandidates = this.visibleEntryCount;
        metrics.visibilityCandidates = 0;
        metrics.spatialCandidates = 0;
        metrics.frustumTested = 0;
        metrics.frustumRejected = 0;
        metrics.renderDistanceRejected = 0;
        metrics.hiddenRejected = this.entryCount - this.visibleEntryCount;
        metrics.visibleRenderables = 0;
        metrics.visibleInstances = 0;
        metrics.culledInstances = 0;
        metrics.visibilityCpuTime = 0;
        metrics.spatialQueryCpuTime = 0;
        metrics.spatialIndexEntries = this.grid.entries.size;
        metrics.spatialIndexUpdates = this.grid.updates;
        metrics.spatialIndexRebuilds = this.grid.rebuilds;
        metrics.dirtyBounds = this.lastDirtyBounds;
        metrics.animatedBounds = this.lastAnimatedBounds;
        metrics.visibilityReused = 0;
        metrics.spatialPath = 0;
        return metrics;
    }

    #createShadowMetrics() {
        return {
            shadowCandidates: 0,
            shadowFrustumRejected: 0,
            shadowVisible: 0,
            spatialCandidates: 0,
            spatialQueryCpuTime: 0,
            visibilityReused: 0,
            spatialPath: 0
        };
    }

    #resetShadowMetrics() {
        const metrics = this.shadowMetrics;
        metrics.shadowCandidates = 0;
        metrics.shadowFrustumRejected = 0;
        metrics.shadowVisible = 0;
        metrics.spatialCandidates = 0;
        metrics.spatialQueryCpuTime = 0;
        metrics.visibilityReused = 0;
        metrics.spatialPath = 0;
        return metrics;
    }
}
