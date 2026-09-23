import {Scene} from './Scene.js';

export class SceneManager {
    /**
     * @param {import('../textures/TextureStore.js').TextureStore | null} [textures]
     * @param {import('../materials/MaterialStore.js').MaterialStore | null} [materials]
     * @param {import('../environments/EnvironmentStore.js').EnvironmentStore | null} [environments]
     * @param {import('../lights/LightStore.js').LightStore | null} [lights]
     * @param {import('../models/ModelStore.js').ModelStore | null} [models]
     * @param {import('../visibility/LodStore.js').LodStore | null} [lods]
     */
    constructor(textures = null, materials = null, environments = null, lights = null, models = null, lods = null) {
        this.textures = textures;
        this.materials = materials;
        this.environments = environments;
        this.lights = lights;
        this.models = models;
        this.lods = lods;
        this.scenes = new Map();
        this.activeName = '';
    }

    create(name) {
        if (this.scenes.has(name)) throw new Error(`Scene "${name}" already exists`);
        const scene = new Scene(name, this.textures, this.materials, this.environments, this.lights, this.models, this.lods);
        this.scenes.set(name, scene);
        if (!this.activeName) this.activeName = name;
        return scene;
    }

    get active() {
        return this.scenes.get(this.activeName) ?? null;
    }

    requireActive() {
        const scene = this.active;
        if (!scene) throw new Error('Create a scene before adding 3D resources');
        return scene;
    }

    setActive(name) {
        if (!this.scenes.has(name)) throw new Error(`Unknown scene "${name}"`);
        if (name === this.activeName) return;
        this.active?.audio?.pauseAll();
        this.active?.physics?.resetClock();
        this.activeName = name;
        this.active?.physics?.resetClock();
    }

    delete(name) {
        const scene = this.scenes.get(name);
        if (!scene) return false;
        scene.dispose();
        this.scenes.delete(name);
        // Selecting a replacement is explicit, as with deleting an active camera.
        if (this.activeName === name) this.activeName = '';
        return true;
    }

    invalidateMaterialShadows(materialId) {
        for (const scene of this.scenes.values()) scene.invalidateMaterialShadows(materialId);
    }

    invalidateTextureShadows(textureId) {
        for (const scene of this.scenes.values()) scene.invalidateTextureShadows(textureId);
    }

    stopAllTweens() {
        for (const scene of this.scenes.values()) scene.tweens.clear();
    }

    clear() {
        for (const scene of this.scenes.values()) scene.dispose();
        this.scenes.clear();
        this.activeName = '';
    }
}
