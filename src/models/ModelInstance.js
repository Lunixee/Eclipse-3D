import {blendAnimationValue, sampleAnimationSampler} from './AnimationSampler.js';
import {composeEulerTrs, composeTrs, identityMatrix, invertMatrix, multiplyMatrices} from './modelMath.js';
import {
    createBounds,
    finalizeBounds,
    includeBounds,
    includeTransformedAabb,
    resetBounds,
    transformBounds
} from '../visibility/Bounds.js';

const TRANSLATION = 1;
const ROTATION = 2;
const SCALE = 4;
const MAX_ANIMATION_STEP = 0.1;

const copyBasePose = (target, nodes, property) => {
    const components = property === 'baseRotation' ? 4 : 3;
    for (let node = 0; node < nodes.length; node++) target.set(nodes[node][property], node * components);
};

const copyMaskedPose = (target, base, mask, bit, components) => {
    for (let node = 0; node < mask.length; node++) {
        if (mask[node] & bit) target.set(base.subarray(node * components, node * components + components), node * components);
    }
};

export class ModelInstance {
    /**
     * @param {string} name
     * @param {import('./ModelStore.js').ModelAsset} asset
     * @param {((affectsShadow: boolean, boundsChanged: boolean) => void) | null} [onChange]
     * @param {(() => void) | null} [onRootTransform]
     */
    constructor(name, asset, onChange = null, onRootTransform = null) {
        this.name = name;
        this.asset = asset;
        this.onChange = onChange;
        this.onRootTransform = onRootTransform;
        this.lodGroup = null;
        this.lodEnabled = true;
        this.lodHysteresis = 1;
        this.forcedLodLevel = -1;
        this.currentLodLevel = 0;
        this.lodInstances = new Map();
        this.activeLodInstance = null;
        this.lodSwitches = 0;
        this.position = new Float32Array(3);
        this.rotation = new Float32Array(3);
        this.scale = new Float32Array([1, 1, 1]);
        this.color = new Float32Array([1, 1, 1, 1]);
        this.visible = true;
        this.frustumCulling = true;
        this.castsShadow = true;
        this.receivesShadow = true;
        this.materialOverrideId = -1;
        const nodeCount = asset.nodes.length;
        const animated = asset.animations.length > 0;
        this.baseTranslations = new Float32Array(animated ? nodeCount * 3 : 0);
        this.baseRotations = new Float32Array(animated ? nodeCount * 4 : 0);
        this.baseScales = new Float32Array(animated ? nodeCount * 3 : 0);
        if (animated) {
            copyBasePose(this.baseTranslations, asset.nodes, 'baseTranslation');
            copyBasePose(this.baseRotations, asset.nodes, 'baseRotation');
            copyBasePose(this.baseScales, asset.nodes, 'baseScale');
        }
        this.translations = new Float32Array(this.baseTranslations);
        this.rotations = new Float32Array(this.baseRotations);
        this.scales = new Float32Array(this.baseScales);
        this.nodeMatrices = asset.nodes.map(node => new Float32Array(node.localMatrix));
        this.worldMatrices = asset.nodes.map(() => identityMatrix());
        this.rootMatrix = identityMatrix();
        this.inverseMeshScratch = identityMatrix();
        this.paletteScratch = identityMatrix();
        this.boundsMatrixScratch = identityMatrix();
        this.jointBoundsMatrixScratch = identityMatrix();
        this.bounds = createBounds();
        this.boundsVersion = 0;
        this.nodeDirty = new Uint8Array(nodeCount);
        this.worldDirty = new Uint8Array(nodeCount);
        this.nodeDirty.fill(1);
        this.skinPaletteStates = new Map();
        this.renderItems = asset.primitives.map((primitive, primitiveIndex) => {
            const paletteKey = `${primitive.nodeIndex}:${primitive.skinIndex}`;
            let paletteOwner = null;
            if (primitive.skinIndex >= 0) {
                paletteOwner = this.skinPaletteStates.get(paletteKey);
                if (!paletteOwner) {
                    paletteOwner = {
                        meshNodeIndex: primitive.nodeIndex,
                        skinIndex: primitive.skinIndex,
                        jointPalette: new Float32Array(asset.skins[primitive.skinIndex].joints.length * 16),
                        paletteVersion: 0,
                        boundsDirty: true
                    };
                    this.skinPaletteStates.set(paletteKey, paletteOwner);
                }
            }
            return {
                primitive,
                matrix: identityMatrix(),
                bounds: createBounds(),
                center: new Float32Array(3),
                radius: 0,
                conservativeRadius: primitive.bounds.radius,
                skinIndex: primitive.skinIndex,
                paletteOwner,
                jointPalette: paletteOwner?.jointPalette ?? null,
                get paletteVersion() { return paletteOwner?.paletteVersion ?? 0; },
                skinBatchKey: primitive.skinIndex >= 0 ? `${name}:${primitiveIndex}` : ''
            };
        });
        /** @type {{clipIndex: number, time: number, playing: boolean, paused: boolean,
         * looping: boolean, finished: boolean, speed: number, transition: null | {
         * sourceClipIndex: number, sourceTime: number, sourceLooping: boolean,
         * elapsed: number, duration: number}}} */
        this.player = {
            clipIndex: -1,
            time: 0,
            playing: false,
            paused: false,
            looping: true,
            finished: false,
            speed: 1,
            transition: null
        };
        this.previousTargetMask = new Uint8Array(animated ? nodeCount : 0);
        this.blendMask = new Uint8Array(animated ? nodeCount : 0);
        this.sourceTranslations = new Float32Array(this.baseTranslations);
        this.sourceRotations = new Float32Array(this.baseRotations);
        this.sourceScales = new Float32Array(this.baseScales);
        this.destinationTranslations = new Float32Array(this.baseTranslations);
        this.destinationRotations = new Float32Array(this.baseRotations);
        this.destinationScales = new Float32Array(this.baseScales);
        this.sampleScratch = new Float32Array(animated ? 4 : 0);
        this.version = 1;
        this.poseVersion = 1;
        this.lastSampledChannels = 0;
        this.lastHierarchyUpdates = 0;
        this.lastPaletteUpdates = 0;
        this.lastBoundsUpdates = 0;
        this.lastSamplingTime = 0;
        this.#updateWorldMatrices(true);
    }

    setPosition(x, y, z) {
        this.#finite([x, y, z], 'Model position');
        this.position.set([x, y, z]);
        this.#changed(this.visible && this.castsShadow, false, true);
        this.onRootTransform?.();
        if (this.activeLodInstance) {
            this.activeLodInstance.setPosition(x, y, z);
            this.lastBoundsUpdates = this.activeLodInstance.lastBoundsUpdates;
        }
    }

    setRotation(x, y, z) {
        this.#finite([x, y, z], 'Model rotation');
        this.rotation.set([x, y, z]);
        this.#changed(this.visible && this.castsShadow, false, true);
        this.onRootTransform?.();
        if (this.activeLodInstance) {
            this.activeLodInstance.setRotation(x, y, z);
            this.lastBoundsUpdates = this.activeLodInstance.lastBoundsUpdates;
        }
    }

    setScale(x, y, z) {
        this.#finite([x, y, z], 'Model scale');
        this.scale.set([x, y, z]);
        this.#changed(this.visible && this.castsShadow, false, true);
        this.onRootTransform?.();
        if (this.activeLodInstance) {
            this.activeLodInstance.setScale(x, y, z);
            this.lastBoundsUpdates = this.activeLodInstance.lastBoundsUpdates;
        }
    }

    setColor(red, green, blue, alpha = 1) {
        const values = [red, green, blue, alpha].map(value => Math.fround(Number(value)));
        if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
            throw new Error('Model tint channels must be finite values in 0..1');
        }
        if (values.every((value, component) => this.color[component] === value)) return;
        const alphaChanged = this.color[3] !== values[3];
        this.color.set(values);
        // Color is instance data. It cannot change bounds, but alpha participates
        // in ordinary cutout rendering/shadows when this model is a caster.
        this.#changed(alphaChanged && this.visible && this.castsShadow, false);
    }

    setVisible(value) {
        const next = Boolean(value);
        if (next === this.visible) return;
        this.visible = next;
        this.#changed(this.castsShadow, false, false, true);
    }

    setCastsShadow(value) {
        const next = Boolean(value);
        if (next === this.castsShadow) return;
        this.castsShadow = next;
        this.#changed(this.visible, false);
    }

    setFrustumCulling(value) {
        const next = Boolean(value);
        if (next === this.frustumCulling) return;
        this.frustumCulling = next;
        this.#changed(false, false, false, true);
    }

    setReceivesShadow(value) {
        const next = Boolean(value);
        if (next === this.receivesShadow) return;
        this.receivesShadow = next;
        this.#changed(false, false);
    }

    setMaterialOverride(materialId) {
        if (this.materialOverrideId === materialId) return;
        this.materialOverrideId = materialId;
        this.#changed(this.visible && this.castsShadow, false);
    }

    setNodePosition(nodeIndex, x, y, z) {
        if (this.lodGroup) throw new Error('Model node edits are unavailable while an LOD group is assigned');
        const node = this.asset.nodes[nodeIndex];
        if (!node) throw new Error(`Model node index ${nodeIndex} is out of range`);
        if (node.matrixAuthored) throw new Error(`Model node ${nodeIndex} uses an authored matrix and cannot be edited as TRS`);
        this.#finite([x, y, z], 'Node position');
        if (this.isAnimated) {
            this.translations.set([x, y, z], nodeIndex * 3);
            this.#composeNode(nodeIndex);
        } else {
            this.nodeMatrices[nodeIndex][12] = x;
            this.nodeMatrices[nodeIndex][13] = y;
            this.nodeMatrices[nodeIndex][14] = z;
        }
        this.nodeDirty[nodeIndex] = 1;
        this.#changed(this.visible && this.castsShadow, true);
    }

    resolveClip(reference) {
        const text = String(reference).trim();
        const named = this.asset.animations.find(clip => clip.name === text);
        if (named) return named;
        const index = Number(text);
        if (Number.isInteger(index) && index >= 1 && index <= this.asset.animations.length) {
            return this.asset.animations[index - 1];
        }
        throw new Error(`Unknown animation "${reference}" on model "${this.asset.name}"`);
    }

    play(reference, looping = this.player.looping) {
        const clip = this.resolveClip(reference);
        this.player.clipIndex = clip.index;
        this.player.time = 0;
        this.player.playing = true;
        this.player.paused = false;
        this.player.looping = Boolean(looping);
        this.player.finished = false;
        this.player.transition = null;
        this.#evaluatePose();
    }

    pause() {
        if (this.player.clipIndex < 0 || !this.player.playing) return;
        this.player.paused = true;
    }

    resume() {
        if (this.player.clipIndex < 0 || this.player.finished) return;
        this.player.playing = true;
        this.player.paused = false;
    }

    stop() {
        this.player.playing = false;
        this.player.paused = false;
        this.player.transition = null;
    }

    resetPose() {
        this.player.clipIndex = -1;
        this.player.time = 0;
        this.player.playing = false;
        this.player.paused = false;
        this.player.finished = false;
        this.player.transition = null;
        if (this.isAnimated) {
            this.translations.set(this.baseTranslations);
            this.rotations.set(this.baseRotations);
            this.scales.set(this.baseScales);
        }
        this.previousTargetMask.fill(0);
        for (let node = 0; node < this.asset.nodes.length; node++) this.nodeMatrices[node].set(this.asset.nodes[node].localMatrix);
        this.nodeDirty.fill(1);
        this.#changed(this.visible && this.castsShadow, true);
    }

    seek(seconds) {
        if (this.player.clipIndex < 0) throw new Error(`Model instance "${this.name}" has no selected animation`);
        const clip = this.asset.animations[this.player.clipIndex];
        const time = Number(seconds);
        if (!Number.isFinite(time)) throw new Error('Animation time must be finite');
        this.player.time = Math.max(0, Math.min(clip.duration, time));
        this.player.finished = false;
        this.player.transition = null;
        this.#evaluatePose();
    }

    setSpeed(speed) {
        const value = Number(speed);
        if (!Number.isFinite(value)) throw new Error('Animation speed must be finite');
        this.player.speed = value;
    }

    setLooping(looping) {
        this.player.looping = Boolean(looping);
    }

    crossfade(reference, seconds) {
        const destination = this.resolveClip(reference);
        const duration = Number(seconds);
        if (!Number.isFinite(duration) || duration < 0) throw new Error('Crossfade duration must be a finite non-negative number');
        if (this.player.clipIndex < 0 || duration === 0) {
            this.play(destination.index + 1, this.player.looping);
            return;
        }
        this.player.transition = {
            sourceClipIndex: this.player.clipIndex,
            sourceTime: this.player.time,
            sourceLooping: this.player.looping,
            elapsed: 0,
            duration
        };
        this.player.clipIndex = destination.index;
        this.player.time = 0;
        this.player.playing = true;
        this.player.paused = false;
        this.player.finished = false;
        this.#evaluatePose();
    }

    advance(deltaSeconds) {
        if (!this.player.playing || this.player.paused || this.player.clipIndex < 0) {
            this.lastSampledChannels = 0;
            this.lastHierarchyUpdates = 0;
            this.lastPaletteUpdates = 0;
            this.lastBoundsUpdates = 0;
            this.lastSamplingTime = 0;
            return false;
        }
        const delta = Math.max(-MAX_ANIMATION_STEP, Math.min(MAX_ANIMATION_STEP, Number(deltaSeconds) || 0)) * this.player.speed;
        if (delta === 0) return false;
        const clip = this.asset.animations[this.player.clipIndex];
        this.player.time = this.#advanceTime(clip, this.player.time, delta, this.player.looping, true);
        const transition = this.player.transition;
        if (transition) {
            const source = this.asset.animations[transition.sourceClipIndex];
            transition.sourceTime = this.#advanceTime(source, transition.sourceTime, delta, transition.sourceLooping, false);
            transition.elapsed = Math.min(transition.duration, transition.elapsed + Math.abs(delta / (this.player.speed || 1)));
            if (transition.duration - transition.elapsed < 1e-8) transition.elapsed = transition.duration;
        }
        this.#evaluatePose();
        if (transition && transition.elapsed >= transition.duration) this.player.transition = null;
        return true;
    }

    updateMatrices() {
        return this.activeRenderItems;
    }

    refreshGeometryBounds(affectsShadow = true, notify = true) {
        resetBounds(this.bounds);
        let updated = 0;
        for (const item of this.renderItems) {
            transformBounds(item.bounds, item.primitive.bounds, item.matrix);
            item.center.set(item.bounds.center);
            item.radius = item.bounds.radius;
            item.conservativeRadius = item.bounds.radius;
            includeBounds(this.bounds, item.bounds);
            updated++;
        }
        finalizeBounds(this.bounds);
        this.lastBoundsUpdates = updated;
        this.boundsVersion++;
        this.version++;
        if (notify) this.onChange?.(affectsShadow && this.visible && this.castsShadow, true);
    }

    assignLodGroup(group) {
        if (this.isAnimated || this.asset.skins.length > 0) {
            throw new Error('Model LOD is supported only for static unskinned instances');
        }
        if (!group || group.levels.length === 0) throw new Error('LOD group must contain at least one level');
        if (group.levels[0].assetId !== this.asset.id) {
            throw new Error(`LOD group "${group.name}" level 1 must use model "${this.asset.name}"`);
        }
        if (this.lodGroup !== group) {
            this.activeLodInstance = null;
            this.lodInstances.clear();
        }
        this.lodGroup = group;
        this.lodEnabled = true;
        this.forcedLodLevel = -1;
        this.#activateLodLevel(0);
    }

    clearLodGroup() {
        if (!this.lodGroup) return;
        this.lodGroup = null;
        this.lodEnabled = true;
        this.forcedLodLevel = -1;
        this.#activateLodLevel(0);
        this.lodInstances.clear();
    }

    setLodEnabled(enabled) {
        const next = Boolean(enabled);
        if (this.lodEnabled === next) return;
        this.lodEnabled = next;
        if (!next) this.#activateLodLevel(0);
        else this.version++;
    }

    setLodHysteresis(value) {
        const next = Number(value);
        if (!Number.isFinite(next) || next < 0) throw new Error('LOD hysteresis must be finite and non-negative');
        this.lodHysteresis = Math.min(next, 100_000);
    }

    setForcedLodLevel(value) {
        if (!this.lodGroup) throw new Error(`Model instance "${this.name}" has no LOD group`);
        const text = String(value).trim().toLowerCase();
        if (text === 'auto') {
            this.forcedLodLevel = -1;
            this.version++;
            return;
        }
        const oneBased = Number(text);
        if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > this.lodGroup.levels.length) {
            throw new Error(`LOD level must be auto or an index from 1 to ${this.lodGroup.levels.length}`);
        }
        this.forcedLodLevel = oneBased - 1;
        this.#activateLodLevel(this.forcedLodLevel);
    }

    evaluateLod(cameraX, cameraY, cameraZ) {
        const group = this.lodGroup;
        if (!group) return false;
        let target = this.currentLodLevel;
        if (!this.lodEnabled) target = 0;
        else if (this.forcedLodLevel >= 0) target = this.forcedLodLevel;
        else {
            const distance = Math.hypot(
                this.position[0] - cameraX,
                this.position[1] - cameraY,
                this.position[2] - cameraZ
            );
            while (target + 1 < group.levels.length &&
                distance >= group.levels[target + 1].threshold + this.lodHysteresis) target++;
            while (target > 0 && distance < group.levels[target].threshold - this.lodHysteresis) target--;
        }
        return this.#activateLodLevel(target);
    }

    get activeRenderItems() {
        return this.activeLodInstance?.renderItems ?? this.renderItems;
    }

    get activeBounds() {
        return this.activeLodInstance?.bounds ?? this.bounds;
    }

    get activeRenderAsset() {
        return this.activeLodInstance?.asset ?? this.asset;
    }

    get currentClip() {
        return this.player.clipIndex >= 0 ? this.asset.animations[this.player.clipIndex] : null;
    }

    get progress() {
        const clip = this.currentClip;
        return clip && clip.duration > 0 ? this.player.time / clip.duration : 0;
    }

    get isAnimated() {
        return this.asset.animations.length > 0;
    }

    #advanceTime(clip, time, delta, looping, primary) {
        if (clip.duration <= 0) {
            if (primary && !looping) {
                this.player.playing = false;
                this.player.finished = true;
            }
            return 0;
        }
        const next = time + delta;
        if (looping) return ((next % clip.duration) + clip.duration) % clip.duration;
        const reachedEnd = delta >= 0 && next >= clip.duration - 1e-8;
        const reachedStart = delta < 0 && next <= 1e-8;
        const clamped = reachedEnd ? clip.duration : reachedStart ? 0 : Math.max(0, Math.min(clip.duration, next));
        if (primary && (reachedEnd || reachedStart)) {
            this.player.playing = false;
            this.player.finished = true;
        }
        return clamped;
    }

    #evaluatePose() {
        const started = typeof performance === 'object' ? performance.now() : 0;
        const clip = this.asset.animations[this.player.clipIndex];
        const transition = this.player.transition;
        this.lastSampledChannels = 0;
        if (transition) {
            const source = this.asset.animations[transition.sourceClipIndex];
            for (let node = 0; node < this.blendMask.length; node++) this.blendMask[node] = source.targetMask[node] | clip.targetMask[node];
            this.#resetPoseBuffers(this.sourceTranslations, this.sourceRotations, this.sourceScales, this.blendMask);
            this.#resetPoseBuffers(this.destinationTranslations, this.destinationRotations, this.destinationScales, this.blendMask);
            this.#sampleClip(source, transition.sourceTime, this.sourceTranslations, this.sourceRotations, this.sourceScales);
            this.#sampleClip(clip, this.player.time, this.destinationTranslations, this.destinationRotations, this.destinationScales);
            const amount = transition.duration > 0 ? Math.min(1, transition.elapsed / transition.duration) : 1;
            for (let node = 0; node < this.blendMask.length; node++) {
                const mask = this.blendMask[node];
                if (mask & TRANSLATION) blendAnimationValue(
                    this.translations, node * 3, this.sourceTranslations, this.destinationTranslations, 3, amount
                );
                if (mask & ROTATION) blendAnimationValue(
                    this.rotations, node * 4, this.sourceRotations, this.destinationRotations, 4, amount, true
                );
                if (mask & SCALE) blendAnimationValue(
                    this.scales, node * 3, this.sourceScales, this.destinationScales, 3, amount
                );
                if (mask & 7) {
                    this.#composeNode(node);
                    this.nodeDirty[node] = 1;
                }
                this.previousTargetMask[node] = mask;
            }
        } else {
            for (let node = 0; node < this.previousTargetMask.length; node++) {
                const mask = this.previousTargetMask[node] | clip.targetMask[node];
                if (mask & TRANSLATION) this.translations.set(this.baseTranslations.subarray(node * 3, node * 3 + 3), node * 3);
                if (mask & ROTATION) this.rotations.set(this.baseRotations.subarray(node * 4, node * 4 + 4), node * 4);
                if (mask & SCALE) this.scales.set(this.baseScales.subarray(node * 3, node * 3 + 3), node * 3);
            }
            this.#sampleClip(clip, this.player.time, this.translations, this.rotations, this.scales);
            for (let node = 0; node < this.previousTargetMask.length; node++) {
                const mask = this.previousTargetMask[node] | clip.targetMask[node];
                if (mask & 7) {
                    this.#composeNode(node);
                    this.nodeDirty[node] = 1;
                }
                this.previousTargetMask[node] = clip.targetMask[node];
            }
        }
        this.lastSamplingTime = started ? performance.now() - started : 0;
        this.#changed(this.visible && this.castsShadow, true);
    }

    #sampleClip(clip, relativeTime, translations, rotations, scales) {
        const sampleTime = clip.startTime + Math.max(0, Math.min(clip.duration, relativeTime));
        for (const channel of clip.channels) {
            if (channel.path === 'weights') continue;
            const target = channel.path === 'translation' ? translations : channel.path === 'rotation' ? rotations : scales;
            const offset = channel.nodeIndex * channel.components;
            sampleAnimationSampler(channel.sampler, sampleTime, target, offset);
            this.lastSampledChannels++;
        }
    }

    #resetPoseBuffers(translations, rotations, scales, mask) {
        copyMaskedPose(translations, this.baseTranslations, mask, TRANSLATION, 3);
        copyMaskedPose(rotations, this.baseRotations, mask, ROTATION, 4);
        copyMaskedPose(scales, this.baseScales, mask, SCALE, 3);
    }

    #composeNode(nodeIndex) {
        const node = this.asset.nodes[nodeIndex];
        if (node.matrixAuthored) return;
        composeTrs(
            this.nodeMatrices[nodeIndex],
            this.translations, this.rotations, this.scales,
            nodeIndex * 3, nodeIndex * 4, nodeIndex * 3
        );
    }

    #updateWorldMatrices(poseChanged, rootChanged = false) {
        if (rootChanged || this.version === 1) composeEulerTrs(this.rootMatrix, this.position, this.rotation, this.scale);
        let hierarchyUpdates = 0;
        for (const nodeIndex of this.asset.nodeOrder) {
            const node = this.asset.nodes[nodeIndex];
            const dirty = rootChanged || this.nodeDirty[nodeIndex] || (node.parent >= 0 && this.worldDirty[node.parent]);
            this.worldDirty[nodeIndex] = dirty ? 1 : 0;
            if (!dirty) continue;
            const parentMatrix = node.parent >= 0 ? this.worldMatrices[node.parent] : this.rootMatrix;
            multiplyMatrices(this.worldMatrices[nodeIndex], parentMatrix, this.nodeMatrices[nodeIndex]);
            hierarchyUpdates++;
        }
        this.lastHierarchyUpdates = hierarchyUpdates;
        this.lastPaletteUpdates = 0;
        this.lastBoundsUpdates = 0;
        if (poseChanged) {
            for (const palette of this.skinPaletteStates.values()) {
                const skin = this.asset.skins[palette.skinIndex];
                if (!this.worldDirty[palette.meshNodeIndex] && !skin.joints.some(joint => this.worldDirty[joint])) continue;
                this.#updatePalette(palette);
            }
        }
        for (const item of this.renderItems) {
            const matrixChanged = rootChanged || this.worldDirty[item.primitive.nodeIndex];
            if (matrixChanged) item.matrix.set(this.worldMatrices[item.primitive.nodeIndex]);
            if (!matrixChanged && !item.paletteOwner?.boundsDirty) continue;
            if (item.paletteOwner) this.#updateSkinnedItemBounds(item);
            else transformBounds(item.bounds, item.primitive.bounds, item.matrix);
            item.center.set(item.bounds.center);
            item.radius = item.bounds.radius;
            item.conservativeRadius = item.bounds.radius;
            this.lastBoundsUpdates++;
        }
        for (const palette of this.skinPaletteStates.values()) palette.boundsDirty = false;
        if (this.lastBoundsUpdates > 0 || !this.bounds.valid) {
            resetBounds(this.bounds);
            for (const item of this.renderItems) includeBounds(this.bounds, item.bounds);
            finalizeBounds(this.bounds);
            this.boundsVersion++;
        }
        this.nodeDirty.fill(0);
        this.worldDirty.fill(0);
    }

    #updateSkinnedItemBounds(item) {
        const influenceBounds = item.primitive.jointInfluenceBounds;
        const palette = item.jointPalette;
        if (!influenceBounds || !palette) {
            transformBounds(item.bounds, item.primitive.bounds, item.matrix);
            return;
        }
        resetBounds(item.bounds);
        const jointCount = Math.min(influenceBounds.count, palette.length / 16);
        for (let joint = 0; joint < jointCount; joint++) {
            if (!influenceBounds.active[joint]) continue;
            const paletteOffset = joint * 16;
            for (let component = 0; component < 16; component++) {
                this.jointBoundsMatrixScratch[component] = palette[paletteOffset + component];
            }
            multiplyMatrices(
                this.boundsMatrixScratch,
                item.matrix,
                this.jointBoundsMatrixScratch
            );
            includeTransformedAabb(
                item.bounds,
                influenceBounds.minimum,
                influenceBounds.maximum,
                this.boundsMatrixScratch,
                joint * 3
            );
        }
        if (item.bounds.valid) finalizeBounds(item.bounds);
        else transformBounds(item.bounds, item.primitive.bounds, item.matrix);
    }

    #updatePalette(state) {
        const skin = this.asset.skins[state.skinIndex];
        const palette = state.jointPalette;
        const invertible = invertMatrix(this.inverseMeshScratch, this.worldMatrices[state.meshNodeIndex]);
        for (let joint = 0; joint < skin.joints.length; joint++) {
            const offset = joint * 16;
            if (!invertible) {
                for (let component = 0; component < 16; component++) {
                    palette[offset + component] = skin.inverseBindMatrices[offset + component];
                }
                continue;
            }
            multiplyMatrices(this.paletteScratch, this.inverseMeshScratch, this.worldMatrices[skin.joints[joint]]);
            multiplyMatrices(palette, this.paletteScratch, skin.inverseBindMatrices, offset, offset);
        }
        state.paletteVersion++;
        state.boundsDirty = true;
        this.lastPaletteUpdates++;
    }

    #activateLodLevel(index) {
        const group = this.lodGroup;
        const target = group ? index : 0;
        if (target === this.currentLodLevel && (target === 0 || this.activeLodInstance)) return false;
        if (!group || target === 0) {
            this.activeLodInstance = null;
        } else {
            const asset = group.levels[target]?.asset;
            if (!asset) throw new Error(`LOD level ${target + 1} is unavailable`);
            let instance = this.lodInstances.get(asset.id);
            if (!instance) {
                instance = new ModelInstance(`${this.name}@lod:${target + 1}`, asset);
                this.lodInstances.set(asset.id, instance);
            }
            instance.setPosition(this.position[0], this.position[1], this.position[2]);
            instance.setRotation(this.rotation[0], this.rotation[1], this.rotation[2]);
            instance.setScale(this.scale[0], this.scale[1], this.scale[2]);
            this.activeLodInstance = instance;
            this.lastBoundsUpdates = instance.lastBoundsUpdates;
        }
        const changed = this.currentLodLevel !== target;
        this.currentLodLevel = target;
        if (changed) this.lodSwitches++;
        this.version++;
        this.onChange?.(this.visible && this.castsShadow, true);
        return changed;
    }

    #changed(affectsShadow, poseChanged, rootChanged = false, visibilityChanged = false) {
        this.version++;
        if (poseChanged) this.poseVersion++;
        if (poseChanged || rootChanged) this.#updateWorldMatrices(poseChanged, rootChanged);
        this.onChange?.(affectsShadow, poseChanged || rootChanged || visibilityChanged);
    }

    #finite(values, label) {
        if (values.some(value => !Number.isFinite(Number(value)))) throw new Error(`${label} must be finite`);
    }
}
