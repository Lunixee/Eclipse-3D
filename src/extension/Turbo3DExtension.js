import {BackendName, BLOCK_API_VERSION, ENGINE_VERSION, EXTENSION_ID} from '../constants.js';
import {EXTENSION_NAME, EXTENSION_COLORS, MENU_ICON_URI} from './branding.js';
import {openPublicLink, PALETTE_BUTTONS} from './publicLinks.js';
import {Engine} from '../engine/Engine.js';
import {MaterialType} from '../materials/MaterialStore.js';
import {
    chooseLocalImageFile,
    getCostumeSource,
    getLocalFileSource,
    loadImageURL
} from '../textures/browserTextureSources.js';
import {clamp, finiteNumber, normalizeName, positiveInteger} from '../util/number.js';
import {createBlockRegistry} from './blocks/blockRegistry.js';
import {BLOCK_SURFACE_MENUS} from './blocks/blockSurface.js';
import {CUSTOM_RENDERING_MENUS} from './blocks/customRenderingBlocks.js';
import {PHYSICS_AUDIO_MENUS} from './blocks/physicsAudioBlocks.js';
import {API_EXPANSION_MENUS, API_FAMILY_BY_OPCODE} from './blocks/apiExpansionBlocks.js';
import {apiNumber, runPropertyFamily} from './blocks/propertyFamilies.js';
import {createScratchSoundSource, createUrlAudioSource} from '../audio/browserAudioSources.js';
import {
    createFileModelSource,
    createUrlModelSource
} from '../models/browserModelSources.js';
import {chooseLocalModelFile, modelSelectionCancelled} from '../models/LocalModelPicker.js';
import {TweenProperty} from '../game/TweenStore.js';
import {
    angleBetween3,
    clamp as clampVectorValue,
    cross3,
    direction3,
    distance3,
    dot3,
    lerp,
    normalizeVector,
    vectorLength
} from '../game/vectorMath.js';

const POST_COLOR_FACTORS = {
    brightness: {method: 'setPostBrightness', fallback: 1},
    contrast: {method: 'setPostContrast', fallback: 1},
    saturation: {method: 'setPostSaturation', fallback: 1}
};
const BLOOM_FACTORS = {
    intensity: {method: 'setBloomIntensity', fallback: 0.8},
    threshold: {method: 'setBloomThreshold', fallback: 0.8}
};
const VIGNETTE_FACTORS = {
    intensity: {method: 'setVignetteIntensity', fallback: 0},
    radius: {method: 'setVignetteRadius', fallback: 0.75},
    softness: {method: 'setVignetteSoftness', fallback: 0.35}
};
const PBR_FACTORS = {
    metallic: {method: 'setMetallic', fallback: 0},
    roughness: {method: 'setRoughness', fallback: 0.5},
    'normal strength': {method: 'setNormalScale', fallback: 1},
    'ao strength': {method: 'setAoStrength', fallback: 1}
};

const DEGREES_TO_RADIANS = Math.PI / 180;
// Retain legacy coercion/fallbacks while rejecting finite JS numbers which
// would become Infinity when written to renderer-owned float32 state.
const transformNumber = (value, fallback = 0) => apiNumber(finiteNumber(value, fallback));

const parseToggle = value => {
    const normalized = String(value).toLowerCase();
    if (normalized === 'on' || normalized === 'true' || normalized === '1') return true;
    if (normalized === 'off' || normalized === 'false' || normalized === '0') return false;
    throw new Error(`Expected on or off, received "${value}"`);
};

const resolveAssetClip = (asset, reference) => {
    const text = String(reference).trim();
    const named = asset.animations.find(clip => clip.name === text);
    if (named) return named;
    const index = Number(text);
    if (Number.isInteger(index) && index >= 1 && index <= asset.animations.length) return asset.animations[index - 1];
    throw new Error(`Unknown animation "${reference}" on model "${asset.name}"`);
};

const parseColor = value => {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(value));
    if (!match) throw new Error(`Invalid color "${value}"`);
    const color = Number.parseInt(match[1], 16);
    return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
};

const srgbChannelToLinear = value => value <= 0.04045 ?
    value / 12.92 :
    ((value + 0.055) / 1.055) ** 2.4;

const parseLinearColor = value => parseColor(value).map(srgbChannelToLinear);

const parseColorBytes = value => {
    const color = parseColor(value);
    return [Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255), 255];
};

export class Turbo3DExtension {
    constructor(Scratch, bridge) {
        this.Scratch = Scratch;
        this.bridge = bridge;
        this.engine = new Engine(bridge);
        /** @type {AbortController | null} */
        this.modelImport = null;
        this.worldStageResult = {x: 0, y: 0, ndcX: 0, ndcY: 0, ndcZ: 0, depth: 0, inFront: false, visible: false};
        this.stageRayResult = {origin: new Float32Array(3), direction: new Float32Array(3), valid: false};
        this.vectorResult = new Float32Array(3);
        this.defaultStageSize = new Float32Array([480, 360]);
    }

    createPhysicsBox(args) {
        this.#command(() => this.engine.activeScene.ensurePhysics().create(this.#name(args.NAME, 'body'), 'box', String(args.TYPE), args.WIDTH, args.HEIGHT, args.DEPTH));
    }

    deleteScene(args) { this.#command(() => this.engine.deleteScene(this.#name(args.SCENE, 'scene'))); }
    sceneExists(args) { return this.engine.scenes.scenes.has(normalizeName(args.SCENE)); }
    resourceExists(args) { return Boolean(this.engine.scenes.active?.resourceKind(normalizeName(args.RESOURCE))); }

    resourceKind(args) {
        return this.#report(() => {
            const name = this.#name(args.RESOURCE, 'resource');
            const kind = this.engine.activeScene.resourceKind(name);
            if (!kind) throw new Error(`Unknown resource "${name}"`);
            return kind;
        }, '');
    }

    setResourceVisible(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceVisible(this.#name(args.RESOURCE, 'resource'), parseToggle(args.ENABLED));
            this.engine.invalidate();
        });
    }

    resourceVisible(args) {
        return this.#report(() => this.engine.activeScene.resourceVisible(this.#name(args.RESOURCE, 'resource')), false);
    }

    resourceTransform(args) {
        return this.#report(() => {
            const property = this.#transformProperty(args.PROPERTY);
            const value = this.engine.activeScene.resourceTransformComponent(this.#name(args.RESOURCE, 'resource'), property, this.#axisIndex(args.AXIS));
            if (!Number.isFinite(value)) throw new Error('Resource transform is not finite');
            return property === 'rotation' ? value / DEGREES_TO_RADIANS : value;
        }, 0);
    }

    rotateResourceBy(args) {
        this.#command(() => {
            const scene = this.engine.activeScene, name = this.#name(args.RESOURCE, 'resource');
            const rotation = [0, 1, 2].map(axis => scene.resourceTransformComponent(name, 'rotation', axis));
            scene.setResourceRotation(name,
                apiNumber(rotation[0] + apiNumber(args.X) * DEGREES_TO_RADIANS),
                apiNumber(rotation[1] + apiNumber(args.Y) * DEGREES_TO_RADIANS),
                apiNumber(rotation[2] + apiNumber(args.Z) * DEGREES_TO_RADIANS));
            this.engine.invalidate();
        });
    }

    setInstanceTransform(args) {
        this.#command(() => {
            const property = this.#transformProperty(args.PROPERTY);
            const factor = property === 'rotation' ? DEGREES_TO_RADIANS : 1;
            const x = apiNumber(args.X), y = apiNumber(args.Y), z = apiNumber(args.Z);
            this.#instanceGroup(args.GROUP).setTransform(Math.floor(apiNumber(args.INDEX)) - 1, property, x * factor, y * factor, z * factor);
            this.engine.invalidate();
        });
    }

    instanceTransform(args) {
        return this.#report(() => {
            const property = this.#transformProperty(args.PROPERTY);
            const value = this.#instanceGroup(args.GROUP).transformComponent(Math.floor(apiNumber(args.INDEX)) - 1, property, this.#axisIndex(args.AXIS));
            if (!Number.isFinite(value)) throw new Error('Instance transform is not finite');
            return property === 'rotation' ? value / DEGREES_TO_RADIANS : value;
        }, 0);
    }

    lookObjectAt(args) {
        this.#command(() => {
            this.engine.activeScene.lookResourceAt(this.#name(args.RESOURCE, 'resource'), apiNumber(args.X), apiNumber(args.Y), apiNumber(args.Z));
            this.engine.invalidate();
        });
    }

    distanceBetweenResources(args) {
        return this.#report(() => {
            const scene = this.engine.activeScene;
            const from = this.#name(args.FROM, 'resource'), to = this.#name(args.TO, 'resource');
            const x = scene.resourceTransformComponent(from, 'position', 0) - scene.resourceTransformComponent(to, 'position', 0);
            const y = scene.resourceTransformComponent(from, 'position', 1) - scene.resourceTransformComponent(to, 'position', 1);
            const z = scene.resourceTransformComponent(from, 'position', 2) - scene.resourceTransformComponent(to, 'position', 2);
            const result = Math.hypot(x, y, z);
            if (!Number.isFinite(result)) throw new Error('Resource distance is not finite');
            return result;
        }, 0);
    }

    setSceneBackground(args) {
        this.#command(() => {
            this.engine.activeScene.setBackground(parseColor(args.COLOR), clamp(apiNumber(args.OPACITY), 0, 100) / 100);
            this.engine.invalidate();
        });
    }

    setResourceTint(args) {
        this.#command(() => {
            const color = parseColor(args.COLOR);
            this.engine.activeScene.setResourceTint(
                this.#name(args.RESOURCE, 'resource'), color[0], color[1], color[2],
                clamp(apiNumber(args.OPACITY), 0, 100) / 100
            );
            this.engine.invalidate();
        });
    }

    setInstanceTint(args) {
        this.#command(() => {
            const color = parseColor(args.COLOR);
            this.#instanceGroup(args.GROUP).setTint(
                Math.floor(apiNumber(args.INDEX)) - 1, color[0], color[1], color[2],
                clamp(apiNumber(args.OPACITY), 0, 100) / 100
            );
            this.engine.invalidate();
        });
    }

    resourceTint(args) {
        return this.#report(() => this.engine.activeScene.resourceTintComponent(
            this.#name(args.RESOURCE, 'resource'), this.#colorIndex(args.COMPONENT)
        ) * (String(args.COMPONENT).trim().toLowerCase() === 'alpha' ? 100 : 255), 0);
    }

    instanceTint(args) {
        return this.#report(() => this.#instanceGroup(args.GROUP).tintComponent(
            Math.floor(apiNumber(args.INDEX)) - 1, this.#colorIndex(args.COMPONENT)
        ) * (String(args.COMPONENT).trim().toLowerCase() === 'alpha' ? 100 : 255), 0);
    }

    transformResourceCoordinate(args) {
        return this.#report(() => {
            const result = this.engine.activeScene.transformResourceCoordinates(
                this.#name(args.RESOURCE, 'resource'), args.DIRECTION, args.KIND,
                apiNumber(args.X), apiNumber(args.Y), apiNumber(args.Z)
            );
            const value = result[this.#axisIndex(args.AXIS)];
            if (!Number.isFinite(value)) throw new Error('Transformed coordinate is not finite');
            return value;
        }, 0);
    }

    moveResourceByCamera(args) {
        this.#command(() => {
            this.engine.activeScene.moveResourceRelativeToCamera(
                this.#name(args.RESOURCE, 'resource'), this.#name(args.CAMERA, 'camera'),
                args.AXIS, apiNumber(args.DISTANCE)
            );
            this.engine.invalidate();
        });
    }

    pointAheadOfCamera(args) {
        return this.#report(() => {
            const result = this.engine.activeScene.pointFromCamera(
                this.#name(args.CAMERA, 'camera'), apiNumber(args.DISTANCE)
            );
            return result[this.#axisIndex(args.AXIS)];
        }, 0);
    }

    copyResourceTransform(args) {
        this.#command(() => {
            this.engine.activeScene.copyResourceTransform(
                this.#name(args.FROM, 'source resource'), this.#name(args.TO, 'destination resource'), args.PROPERTY
            );
            this.engine.invalidate();
        });
    }

    setMaterialEmissiveIntensity(args) {
        this.#command(() => this.engine.materials.setEmissiveIntensity(
            this.#name(args.MATERIAL, 'material'), apiNumber(args.INTENSITY)
        ));
    }

    setTextureFilter(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'), String(args.FILTER), String(args.VALUE)
        ));
    }

    setTextureWrap(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'), String(args.AXIS).trim().toLowerCase() === 'u' ? 'wrap-u' :
                String(args.AXIS).trim().toLowerCase() === 'v' ? 'wrap-v' : (() => { throw new Error('Texture wrap axis must be u or v'); })(),
            String(args.VALUE)
        ));
    }

    setTextureBooleanOption(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'), String(args.OPTION), parseToggle(args.ENABLED)
        ));
    }

    setTextureAnisotropy(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'), 'anisotropy', apiNumber(args.VALUE)
        ));
    }

    setTextureColorSpace(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'), 'color-space', String(args.SPACE)
        ));
    }

    modelNodeText(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            const index = this.#oneBasedIndex(args.INDEX, asset.nodes.length, 'model node');
            const node = asset.nodes[index];
            const property = String(args.PROPERTY).trim().toLowerCase();
            if (property === 'name') return node.name ?? '';
            if (property === 'parent') return node.parent < 0 ? '' : asset.nodes[node.parent]?.name ?? '';
            if (property === 'children') return asset.nodes.flatMap((candidate, child) => candidate.parent === index ? [child + 1] : []).join(',');
            throw new Error(`Unknown model node text property "${args.PROPERTY}"`);
        }, '');
    }

    modelNodeNumber(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            const index = this.#oneBasedIndex(args.INDEX, asset.nodes.length, 'model node');
            const node = asset.nodes[index];
            const property = String(args.PROPERTY).trim().toLowerCase();
            const values = {
                'parent index': node.parent + 1,
                'child count': asset.nodes.reduce((count, candidate) => count + (candidate.parent === index ? 1 : 0), 0),
                'mesh index': Number.isInteger(node.mesh) ? node.mesh + 1 : 0,
                'skin index': Number.isInteger(node.skin) ? node.skin + 1 : 0,
                'translation x': node.baseTranslation?.[0] ?? 0,
                'translation y': node.baseTranslation?.[1] ?? 0,
                'translation z': node.baseTranslation?.[2] ?? 0
            };
            if (!Object.hasOwn(values, property)) throw new Error(`Unknown model node numeric property "${args.PROPERTY}"`);
            return values[property];
        }, 0);
    }

    modelSkinText(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            return asset.skins[this.#oneBasedIndex(args.INDEX, asset.skins.length, 'model skin')].name ?? '';
        }, '');
    }

    modelSkinNumber(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            const skin = asset.skins[this.#oneBasedIndex(args.INDEX, asset.skins.length, 'model skin')];
            const property = String(args.PROPERTY).trim().toLowerCase();
            if (property === 'joints') return skin.joints.length;
            if (property === 'skeleton node') return (skin.skeleton ?? -1) + 1;
            if (property === 'joint node') {
                const joint = this.#oneBasedIndex(args.JOINT, skin.joints.length, 'skin joint');
                return skin.joints[joint] + 1;
            }
            throw new Error(`Unknown model skin numeric property "${args.PROPERTY}"`);
        }, 0);
    }

    modelAnimationText(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            return asset.animations[this.#oneBasedIndex(args.INDEX, asset.animations.length, 'model animation')].name ?? '';
        }, '');
    }

    modelAnimationNumber(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            const clip = asset.animations[this.#oneBasedIndex(args.INDEX, asset.animations.length, 'model animation')];
            const property = String(args.PROPERTY).trim().toLowerCase();
            const values = {
                'duration seconds': clip.duration, 'start seconds': clip.startTime, 'end seconds': clip.endTime,
                channels: clip.channels.length, samplers: clip.samplerCount
            };
            if (!Object.hasOwn(values, property)) throw new Error(`Unknown model animation numeric property "${args.PROPERTY}"`);
            return values[property];
        }, 0);
    }

    lodLevelText(args) {
        return this.#report(() => {
            const group = this.engine.lods.require(this.#name(args.GROUP, 'LOD group'));
            return group.levels[this.#oneBasedIndex(args.LEVEL, group.levels.length, 'LOD level')].asset.name;
        }, '');
    }

    lodLevelNumber(args) {
        return this.#report(() => {
            const group = this.engine.lods.require(this.#name(args.GROUP, 'LOD group'));
            return group.levels[this.#oneBasedIndex(args.LEVEL, group.levels.length, 'LOD level')].threshold;
        }, 0);
    }

    customGeometryExists(args) {
        const name = normalizeName(args.GEOMETRY);
        return Boolean(name && this.engine.geometry.resources.has(`custom:${name}`));
    }
    customShaderExists(args) { return Boolean(this.engine.materials.customShaders?.resources.has(normalizeName(args.SHADER))); }

    customUniformText(args) {
        return this.#report(() => {
            const field = this.#customUniform(args.MATERIAL, args.UNIFORM);
            const property = String(args.PROPERTY).trim().toLowerCase();
            if (property === 'type') return field.type;
            if (property === 'sampler texture') {
                if (field.type !== 'sampler2D') throw new Error(`Uniform "${field.name}" is not a sampler`);
                return field.value < 0 ? '' : this.engine.textures.resourceForId(field.value)?.name ?? '';
            }
            throw new Error(`Unknown custom uniform text property "${args.PROPERTY}"`);
        }, '');
    }

    customUniformNumber(args) {
        return this.#report(() => {
            const field = this.#customUniform(args.MATERIAL, args.UNIFORM);
            if (field.type === 'sampler2D') throw new Error(`Uniform "${field.name}" is a sampler`);
            const component = this.#oneBasedIndex(args.COMPONENT, field.size, 'uniform component');
            return field.size === 1 ? field.value : field.value[component];
        }, 0);
    }

    setCustomUniformVector(args) {
        this.#command(() => {
            const materialName = this.#name(args.MATERIAL, 'material');
            const field = this.#customUniform(materialName, args.UNIFORM);
            if (field.type === 'sampler2D' || field.size === 1) throw new Error('Select a declared vector or color uniform');
            this.engine.materials.setUniform(materialName, field.name,
                [args.X, args.Y, args.Z, args.W].slice(0, field.size).map(apiNumber));
        });
    }

    spriteDirectionalFrame(args) {
        return this.#report(() => {
            const effect = this.engine.activeScene.effects.require(this.#name(args.RESOURCE, 'sprite'), 'sprite');
            const index = this.#oneBasedIndex(args.DIRECTION, 8, 'sprite direction');
            return effect.directionalFrames[index] + 1;
        }, 0);
    }

    setParticleSpread(args) {
        this.#command(() => {
            const effect = this.engine.activeScene.effects.require(this.#name(args.RESOURCE, 'particle emitter'), 'particle-emitter');
            const values = [args.X, args.Y, args.Z].map(apiNumber);
            effect.setVelocity(effect.velocity[0], effect.velocity[1], effect.velocity[2], ...values);
            this.engine.invalidate();
        });
    }

    terrainExists(args) { return this.engine.scenes.active?.terrains.resources.has(normalizeName(args.TERRAIN)) ?? false; }

    terrainGridHeight(args) {
        return this.#report(() => {
            const terrain = this.engine.activeScene.terrains.require(this.#name(args.TERRAIN, 'terrain'));
            const x = this.#oneBasedIndex(args.X, terrain.segmentsX + 1, 'terrain X');
            const z = this.#oneBasedIndex(args.Z, terrain.segmentsZ + 1, 'terrain Z');
            return terrain.heights[z * (terrain.segmentsX + 1) + x];
        }, 0);
    }

    physicsBodyExists(args) {
        return this.engine.scenes.active?.physics?.resources.has(normalizeName(args.BODY)) ?? false;
    }

    audioAssetExists(args) { return this.engine.audio?.assets.has(normalizeName(args.ASSET)) ?? false; }
    audioSourceExists(args) {
        return this.engine.scenes.active?.audio?.resources.has(normalizeName(args.SOURCE)) ?? false;
    }

    sceneText(args) { return this.#apiProperty('sceneText', '', args.PROPERTY); }
    sceneNumber(args) { return this.#apiProperty('sceneNumber', '', args.PROPERTY); }
    cameraNumber(args) { return this.#apiProperty('cameraNumber', args.CAMERA, args.PROPERTY); }
    materialNumber(args) { return this.#apiProperty('materialNumber', args.MATERIAL, args.PROPERTY); }
    materialText(args) { return this.#apiProperty('materialText', args.MATERIAL, args.PROPERTY); }
    materialBoolean(args) { return this.#apiProperty('materialBoolean', args.MATERIAL, args.PROPERTY); }
    textureNumber(args) { return this.#apiProperty('textureNumber', args.TEXTURE, args.PROPERTY); }
    textureText(args) { return this.#apiProperty('textureText', args.TEXTURE, args.PROPERTY); }
    textureBoolean(args) { return this.#apiProperty('textureBoolean', args.TEXTURE, args.PROPERTY); }
    instanceGroupNumber(args) { return this.#apiProperty('instanceGroupNumber', args.GROUP, args.PROPERTY); }
    directionalLightNumber(args) { return this.#apiProperty('directionalLightNumber', args.LIGHT, args.PROPERTY); }
    directionalLightText(args) { return this.#apiProperty('directionalLightText', args.LIGHT, args.PROPERTY); }
    directionalLightBoolean(args) { return this.#apiProperty('directionalLightBoolean', args.LIGHT, args.PROPERTY); }
    localLightText(args) { return this.#apiProperty('localLightText', args.LIGHT, args.PROPERTY); }
    spotLightNumber(args) { return this.#apiProperty('spotLightNumber', args.LIGHT, args.PROPERTY); }
    environmentText(args) { return this.#apiProperty('environmentText', args.ENVIRONMENT, args.PROPERTY); }
    modelInfoNumber(args) { return this.#apiProperty('modelInfoNumber', args.MODEL, args.PROPERTY); }
    modelInstanceText(args) { return this.#apiProperty('modelInstanceText', args.INSTANCE, args.PROPERTY); }
    modelInstanceNumber(args) { return this.#apiProperty('modelInstanceNumber', args.INSTANCE, args.PROPERTY); }
    modelInstanceBoolean(args) { return this.#apiProperty('modelInstanceBoolean', args.INSTANCE, args.PROPERTY); }
    effectNumber(args) { return this.#apiProperty('effectNumber', args.RESOURCE, args.PROPERTY); }
    setEffectNumber(args) { return this.#apiProperty('setEffectNumber', args.RESOURCE, args.PROPERTY, args.VALUE); }
    effectText(args) { return this.#apiProperty('effectText', args.RESOURCE, args.PROPERTY); }
    effectBoolean(args) { return this.#apiProperty('effectBoolean', args.RESOURCE, args.PROPERTY); }
    particleNumber(args) { return this.#apiProperty('particleNumber', args.RESOURCE, args.PROPERTY); }
    particleText(args) { return this.#apiProperty('particleText', args.RESOURCE, args.PROPERTY); }
    particleBoolean(args) { return this.#apiProperty('particleBoolean', args.RESOURCE, args.PROPERTY); }
    decalNumber(args) { return this.#apiProperty('decalNumber', args.RESOURCE, args.PROPERTY); }
    decalBoolean(args) { return this.#apiProperty('decalBoolean', args.RESOURCE, args.PROPERTY); }
    postNumber(args) { return this.#apiProperty('postNumber', '', args.PROPERTY); }
    postBoolean(args) { return this.#apiProperty('postBoolean', '', args.PROPERTY); }
    qualityNumber(args) { return this.#apiProperty('qualityNumber', '', args.PROPERTY); }
    terrainNumber(args) { return this.#apiProperty('terrainNumber', args.TERRAIN, args.PROPERTY); }
    terrainBoolean(args) { return this.#apiProperty('terrainBoolean', args.TERRAIN, args.PROPERTY); }
    textContent(args) { return this.#apiProperty('textContent', args.TEXT, args.PROPERTY); }
    textNumber(args) { return this.#apiProperty('textNumber', args.TEXT, args.PROPERTY); }
    textBoolean(args) { return this.#apiProperty('textBoolean', args.TEXT, args.PROPERTY); }
    customGeometryNumber(args) { return this.#apiProperty('customGeometryNumber', args.GEOMETRY, args.PROPERTY); }
    customGeometryBoolean(args) { return this.#apiProperty('customGeometryBoolean', args.GEOMETRY, args.PROPERTY); }
    customGeometryText(args) { return this.#apiProperty('customGeometryText', args.GEOMETRY, args.PROPERTY); }
    customShaderNumber(args) { return this.#apiProperty('customShaderNumber', args.SHADER, args.PROPERTY); }
    physicsBodyText(args) { return this.#apiProperty('physicsBodyText', args.BODY, args.PROPERTY); }
    physicsBodyBoolean(args) { return this.#apiProperty('physicsBodyBoolean', args.BODY, args.PROPERTY); }
    physicsBodyMeasure(args) { return this.#apiProperty('physicsBodyMeasure', args.BODY, args.PROPERTY); }
    physicsWorldNumber(args) { return this.#apiProperty('physicsWorldNumber', '', args.PROPERTY); }
    audioSourceText(args) { return this.#apiProperty('audioSourceText', args.SOURCE, args.PROPERTY); }
    audioSourceBoolean(args) { return this.#apiProperty('audioSourceBoolean', args.SOURCE, args.PROPERTY); }
    audioSpatialNumber(args) { return this.#apiProperty('audioSpatialNumber', args.SOURCE, args.PROPERTY); }
    audioAssetNumber(args) { return this.#apiProperty('audioAssetNumber', args.ASSET, args.PROPERTY); }
    audioAssetText(args) { return this.#apiProperty('audioAssetText', args.ASSET, args.PROPERTY); }
    audioListenerNumber(args) { return this.#apiProperty('audioListenerNumber', args.CAMERA, args.PROPERTY); }
    tweenNumber(args) { return this.#apiProperty('tweenNumber', args.NAME, args.PROPERTY); }
    tweenBoolean(args) { return this.#apiProperty('tweenBoolean', args.NAME, args.PROPERTY); }

    #apiProperty(opcode, name, property, value = undefined) {
        const family = API_FAMILY_BY_OPCODE.get(opcode);
        if (!family) throw new Error(`Unknown public API family "${opcode}"`);
        const action = () => runPropertyFamily(this.engine, family, name, property, value);
        if (family.type === 'command') return this.#command(action);
        return this.#report(action, family.type === 'number' ? 0 : family.type === 'boolean' ? false : '');
    }

    #transformProperty(value) {
        const property = String(value).trim().toLowerCase();
        if (!['position', 'rotation', 'scale'].includes(property)) throw new Error('Unknown transform property');
        return property;
    }

    #instanceGroup(value) {
        const name = this.#name(value, 'instance group');
        const group = this.engine.activeScene.instanceGroups.get(name);
        if (!group) throw new Error(`Unknown instance group "${name}"`);
        return group;
    }

    createPhysicsSphere(args) {
        this.#command(() => this.engine.activeScene.ensurePhysics().create(this.#name(args.NAME, 'body'), 'sphere', String(args.TYPE), args.RADIUS));
    }

    setPhysicsVector(args) {
        this.#command(() => {
            const world = this.#physics(), name = this.#name(args.NAME, 'body');
            if (args.PROPERTY === 'position') {
                world.setPosition(name, args.X, args.Y, args.Z);
                if (world.require(name).object) this.engine.invalidate();
            } else if (args.PROPERTY === 'velocity') world.setVelocity(name, args.X, args.Y, args.Z);
            else throw new Error('Unknown physics vector property');
        });
    }

    setPhysicsGravity(args) { this.#command(() => this.engine.activeScene.ensurePhysics().setGravity(args.X, args.Y, args.Z)); }
    setPhysicsNumber(args) { this.#command(() => this.#physics().setNumber(this.#name(args.NAME, 'body'), String(args.PROPERTY), args.VALUE)); }
    setPhysicsTrigger(args) { this.#command(() => this.#physics().setTrigger(this.#name(args.NAME, 'body'), parseToggle(args.ENABLED))); }
    setPhysicsFilter(args) { this.#command(() => this.#physics().setFilter(this.#name(args.NAME, 'body'), args.LAYER, args.MASK)); }
    attachPhysicsBody(args) { this.#command(() => this.#physics().attach(this.#name(args.NAME, 'body'), String(args.OBJECT).trim(), args.X, args.Y, args.Z)); }
    deletePhysicsBody(args) { this.#command(() => this.engine.activeScene.physics?.delete(this.#name(args.NAME, 'body'))); }
    physicsTouching(args) { return this.#report(() => this.#physics().touching(this.#name(args.NAME, 'body'), String(args.OTHER).trim(), String(args.STATE)), false); }
    physicsContactCount(args) { return this.#report(() => this.#physics().contactCount(this.#name(args.NAME, 'body'), String(args.STATE)), 0); }

    physicsContactName(args) {
        return this.#report(() => {
            const world = this.#physics(), name = this.#name(args.NAME, 'body');
            const contact = world.contactAt(name, Number(args.INDEX), String(args.STATE));
            return contact ? (contact.a === world.require(name) ? contact.b : contact.a).name : '';
        }, '');
    }

    physicsContactNumber(args) {
        return this.#report(() => {
            const world = this.#physics(), name = this.#name(args.NAME, 'body');
            const contact = world.contactAt(name, Number(args.INDEX), String(args.STATE));
            if (!contact) return 0;
            const fields = {'normal x': 'nx', 'normal y': 'ny', 'normal z': 'nz', 'point x': 'px', 'point y': 'py', 'point z': 'pz', penetration: 'depth'};
            const field = fields[String(args.FIELD)];
            if (!field) throw new Error('Unknown contact numeric field');
            return contact[field] * (field.startsWith('n') && contact.a !== world.require(name) ? -1 : 1);
        }, 0);
    }

    physicsBodyNumber(args) {
        return this.#report(() => {
            const body = this.#physics().require(this.#name(args.NAME, 'body')), field = String(args.FIELD);
            if (field === 'x' || field === 'y' || field === 'z') return body.position['xyz'.indexOf(field)];
            if (/^velocity [xyz]$/.test(field)) return body.velocity['xyz'.indexOf(field.slice(-1))];
            if (!['mass', 'restitution', 'friction', 'gravityScale'].includes(field)) throw new Error('Unknown body numeric field');
            return body[field];
        }, 0);
    }

    physicsBodySleeping(args) { return this.#report(() => this.#physics().require(this.#name(args.NAME, 'body')).sleeping, false); }
    physicsMetric(args) { return this.#report(() => this.#optionalMetric(this.engine.scenes.active?.physics?.metrics, args.METRIC, PHYSICS_AUDIO_MENUS.physicsMetric), 0); }

    loadAudioURL(args) {
        return this.#asyncCommand(async () => {
            const audio = this.engine.ensureAudio();
            await audio.waitUntilReady(audio.load(this.#name(args.ASSET, 'audio asset'), createUrlAudioSource(this.Scratch, args.URL)));
        });
    }

    loadAudioSound(args, util) {
        return this.#asyncCommand(async () => {
            const descriptor = createScratchSoundSource(util?.target, args.SOUND);
            const audio = this.engine.ensureAudio();
            await audio.waitUntilReady(audio.load(this.#name(args.ASSET, 'audio asset'), descriptor));
        });
    }

    createAudioSource(args) {
        this.#command(() => {
            if (!['positional', 'global'].includes(String(args.MODE))) throw new Error('Unknown audio source mode');
            this.engine.ensureAudio().forScene(this.engine.activeScene).create(this.#name(args.NAME, 'audio source'), this.#name(args.ASSET, 'audio asset'), args.MODE === 'positional');
        });
    }

    controlAudioSource(args) {
        this.#command(() => {
            const action = String(args.ACTION);
            if (!['play', 'pause', 'resume', 'stop'].includes(action)) throw new Error('Unknown audio action');
            this.#audioSource(args.NAME)[action]();
        });
    }

    setAudioNumber(args) { this.#command(() => this.#audioSource(args.NAME).setNumber(String(args.PROPERTY), args.VALUE)); }
    setAudioLoop(args) { this.#command(() => this.#audioSource(args.NAME).setLoop(parseToggle(args.ENABLED))); }

    setAudioVector(args) {
        this.#command(() => {
            const source = this.#audioSource(args.NAME);
            if (args.PROPERTY === 'position') source.setPosition(args.X, args.Y, args.Z);
            else if (args.PROPERTY === 'direction') source.setDirection(args.X, args.Y, args.Z);
            else throw new Error('Unknown audio vector property');
        });
    }

    attachAudioSource(args) { this.#command(() => this.#audioSource(args.NAME).store.attach(this.#name(args.NAME, 'audio source'), String(args.OBJECT).trim())); }
    deleteAudioSource(args) { this.#command(() => this.engine.activeScene.audio?.delete(this.#name(args.NAME, 'audio source'))); }
    deleteAudioAsset(args) { this.#command(() => this.engine.audio?.delete(this.#name(args.ASSET, 'audio asset'))); }
    audioSourceState(args) { return this.#report(() => this.#audioSource(args.NAME).state, ''); }

    audioSourceNumber(args) {
        return this.#report(() => {
            if (!PHYSICS_AUDIO_MENUS.audioReadNumber.items.includes(String(args.PROPERTY))) throw new Error('Unknown audio numeric property');
            return this.#audioSource(args.NAME)[String(args.PROPERTY)];
        }, 0);
    }

    audioAssetState(args) { return this.#report(() => this.engine.audio?.require(this.#name(args.ASSET, 'audio asset')).state ?? '', ''); }
    unlockAudio() { this.#command(() => this.engine.ensureAudio().unlock()); }
    audioMetric(args) { return this.#report(() => this.#optionalMetric(this.engine.audio?.metrics, args.METRIC, PHYSICS_AUDIO_MENUS.audioMetric), 0); }

    #optionalMetric(metrics, field, menu) {
        if (!menu.items.includes(String(field))) throw new Error('Unknown subsystem metric');
        return metrics?.[String(field)] ?? 0;
    }

    #physics() {
        const world = this.engine.activeScene.physics;
        if (!world) throw new Error('Create a physics body first');
        return world;
    }

    #audioSource(name) {
        const audio = this.engine.activeScene.audio;
        if (!audio) throw new Error('Create an audio source first');
        return audio.require(this.#name(name, 'audio source'));
    }

    setPostColorFactor(args) { this.#numericSetting(this.engine, args, POST_COLOR_FACTORS); }

    createCustomGeometry(args) {
        this.#command(() => this.engine.geometry.createCustom(this.#name(args.GEOMETRY, 'geometry'), JSON.parse(String(args.DATA)), String(args.USAGE)));
    }

    updateCustomGeometry(args) {
        this.#command(() => this.engine.geometry.updateCustom(this.#name(args.GEOMETRY, 'geometry'), JSON.parse(String(args.DATA))));
    }

    deleteCustomGeometry(args) {
        this.#command(() => {
            this.engine.geometry.deleteCustom(this.#name(args.GEOMETRY, 'geometry'));
            this.engine.releaseUnusedResources();
        });
    }

    createGeometryModel(args) {
        this.#command(() => this.engine.models.createFromGeometry(this.#name(args.MODEL, 'model'), this.#name(args.GEOMETRY, 'geometry'), this.#name(args.MATERIAL, 'material')));
    }

    createCustomShader(args) {
        this.#command(() => this.engine.materials.shaders.create(this.#name(args.SHADER, 'shader'), String(args.VERTEX), String(args.FRAGMENT), JSON.parse(String(args.UNIFORMS))));
    }

    deleteCustomShader(args) {
        this.#command(() => {
            this.engine.materials.shaders.delete(this.#name(args.SHADER, 'shader'));
            this.engine.releaseUnusedResources();
        });
    }

    createCustomMaterial(args) {
        this.#command(() => this.engine.materials.createCustom(this.#name(args.MATERIAL, 'material'), this.#name(args.SHADER, 'shader')));
    }

    setCustomUniform(args) {
        this.#command(() => {
            const name = this.#name(args.MATERIAL, 'material');
            const field = this.engine.materials.require(name).customUniforms?.find(field => field.name === String(args.UNIFORM));
            if (!field || field.type === 'sampler2D') throw new Error('Select a declared numeric/color uniform; textures use the sampler block');
            const text = String(args.VALUE);
            const value = field.type === 'color' && text.startsWith('#') ? parseLinearColor(text) : field.size === 1 ? Number(text) : JSON.parse(text);
            this.engine.materials.setUniform(name, String(args.UNIFORM), value);
        });
    }

    setCustomSampler(args) {
        this.#command(() => {
            const name = this.#name(args.MATERIAL, 'material');
            const field = this.engine.materials.require(name).customUniforms?.find(field => field.name === String(args.UNIFORM));
            if (field?.type !== 'sampler2D') throw new Error('Select a declared sampler2D uniform');
            this.engine.materials.setUniform(name, String(args.UNIFORM), String(args.TEXTURE).trim());
        });
    }

    setMaterialSide(args) { this.#command(() => this.engine.materials.setSide(this.#name(args.MATERIAL, 'material'), String(args.SIDE))); }

    setMaterialBlendMode(args) { this.#command(() => this.engine.materials.setBlendMode(this.#name(args.MATERIAL, 'material'), String(args.MODE))); }

    setMaterialRenderNumber(args) { this.#command(() => this.engine.materials.setRenderNumber(this.#name(args.MATERIAL, 'material'), String(args.PROPERTY), args.VALUE)); }

    setMaterialEnvironmentFactor(args) { this.#command(() => this.engine.materials.setEnvironmentFactor(this.#name(args.MATERIAL, 'material'), String(args.PROPERTY), args.VALUE)); }

    customRenderingMetric(args) {
        const properties = {'shader compiles': 'customShaderCompiles', 'shader draws': 'customShaderDraws', 'uniform uploads': 'customUniformUploads', 'geometry uploads': 'customGeometryUploads'};
        return this.engine.profiler[properties[String(args.METRIC)]] ?? 0;
    }

    setBloomFactor(args) { this.#numericSetting(this.engine, args, BLOOM_FACTORS); }

    setVignetteFactor(args) { this.#numericSetting(this.engine, args, VIGNETTE_FACTORS); }

    setPbrFactor(args) {
        this.#command(() => {
            const setting = this.#setting(PBR_FACTORS, args.PROPERTY);
            this.engine.materials[setting.method](this.#name(args.MATERIAL, 'material'), finiteNumber(args.VALUE, setting.fallback));
        });
    }

    setCameraClip(args) {
        const plane = String(args.PLANE).trim().toLowerCase();
        if (plane !== 'near' && plane !== 'far') {
            this.#command(() => { throw new Error(`Unknown camera clip plane "${args.PLANE}"`); });
            return;
        }
        this.#setCameraProjectionComponent(args, plane, finiteNumber(args.DISTANCE, plane === 'far' ? 1000 : 0.1));
    }

    textureDimension(args) {
        return this.#report(() => this.engine.textures.require(this.#name(args.TEXTURE, 'texture'))[this.#dimension(args.DIMENSION)], 0);
    }

    renderTargetDimension(args) {
        return this.#report(() => this.engine.renderTargets.require(this.#name(args.TARGET, 'render target'))[this.#dimension(args.DIMENSION)], 0);
    }

    internalRenderDimension(args) {
        return this.#report(() => this.engine.renderMetrics[this.#dimension(args.DIMENSION)], 0);
    }

    rayHitNumber(args) { return this.#typedRayField(args.FIELD, 'rayNumberField', 0); }

    rayHitText(args) { return this.#typedRayField(args.FIELD, 'rayTextField', ''); }

    #typedRayField(field, menu, fallback) {
        return this.#report(() => {
            const value = String(field).trim().toLowerCase();
            if (!BLOCK_SURFACE_MENUS[menu].items.some(item => item.toLowerCase() === value)) {
                throw new Error('Unknown ray result field "' + field + '"');
            }
            return this.#rayHitField(value);
        }, fallback);
    }

    #dimension(value) {
        const dimension = String(value).trim().toLowerCase();
        if (dimension !== 'width' && dimension !== 'height') throw new Error('Unknown dimension "' + value + '"');
        return dimension;
    }

    #setting(settings, property) {
        const key = String(property).trim().toLowerCase();
        if (!Object.hasOwn(settings, key)) throw new Error('Unknown numeric property "' + property + '"');
        return settings[key];
    }

    #numericSetting(owner, args, settings) {
        this.#command(() => {
            const setting = this.#setting(settings, args.PROPERTY);
            owner[setting.method](finiteNumber(args.VALUE, setting.fallback));
        });
    }

    openDocumentation() { openPublicLink('documentation'); }
    openExampleProject() { openPublicLink('exampleProject'); }
    openWebsite() { openPublicLink('website'); }

    getInfo() {
        return {
            id: EXTENSION_ID,
            name: EXTENSION_NAME,
            color1: EXTENSION_COLORS.primary,
            color2: EXTENSION_COLORS.secondary,
            color3: EXTENSION_COLORS.tertiary,
            menuIconURI: MENU_ICON_URI,
            blocks: [...PALETTE_BUTTONS.map(button => ({blockType: this.Scratch.BlockType.BUTTON, ...button})),
                '---', ...createBlockRegistry(this.Scratch)],
            menus: {
                ...BLOCK_SURFACE_MENUS,
                ...CUSTOM_RENDERING_MENUS,
                ...PHYSICS_AUDIO_MENUS,
                ...API_EXPANSION_MENUS,
                backend: {
                    acceptReporters: true,
                    items: [
                        {text: 'automatic', value: BackendName.AUTO},
                        {text: 'shared WebGL 2 (prototype)', value: BackendName.SHARED},
                        {text: 'separate canvas', value: BackendName.BITMAP}
                    ]
                },
                texturePreset: {
                    acceptReporters: true,
                    items: ['solid', 'checker']
                },
                textureOption: {
                    acceptReporters: true,
                    items: [
                        'min-filter',
                        'mag-filter',
                        'wrap-u',
                        'wrap-v',
                        'mipmaps',
                        'anisotropy',
                        'color-space',
                        'flip-y'
                    ]
                },
                onOff: {
                    acceptReporters: true,
                    items: ['on', 'off']
                },
                shadowQuality: {
                    acceptReporters: true,
                    items: ['off', 'low', 'medium', 'high', 'ultra', 'custom']
                },
                shadowFilter: {
                    acceptReporters: true,
                    items: ['hard', 'pcf-4', 'pcf-9']
                },
                renderQuality: {
                    acceptReporters: true,
                    items: ['potato', 'low', 'medium', 'high', 'ultra']
                },
                antialias: {
                    acceptReporters: true,
                    items: ['off', 'native']
                },
                pixelRatio: {
                    acceptReporters: true,
                    items: ['automatic', '1', '1.5', '2']
                },
                textureQuality: {
                    acceptReporters: true,
                    items: ['potato', 'low', 'medium', 'high', 'ultra', 'custom']
                },
                environmentQuality: {
                    acceptReporters: true,
                    items: ['potato', 'low', 'medium', 'high', 'ultra', 'custom']
                },
                localLightAxis: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z']
                },
                materialType: {
                    acceptReporters: true,
                    items: ['unlit', 'basic-lit', 'pbr']
                },
                pbrMap: {
                    acceptReporters: true,
                    items: ['normal', 'metallic', 'roughness', 'metallic-roughness', 'emissive', 'ambient-occlusion']
                },
                alphaMode: {
                    acceptReporters: true,
                    items: ['opaque', 'cutout', 'blend']
                },
                billboardMode: {
                    acceptReporters: true,
                    items: ['full', 'y-axis', 'fixed', 'screen-aligned']
                },
                spritePivot: {
                    acceptReporters: true,
                    items: ['center', 'bottom-center', 'top-center']
                },
                effectAlphaMode: {
                    acceptReporters: true,
                    items: ['opaque', 'cutout', 'blend', 'additive']
                },
                effectLighting: {
                    acceptReporters: true,
                    items: ['unlit', 'lit']
                },
                particleSpawnShape: {
                    acceptReporters: true,
                    items: ['point', 'box', 'sphere']
                },
                bloomQuality: {
                    acceptReporters: true,
                    items: ['low', 'medium', 'high', 'ultra']
                },
                raycastBackface: {
                    acceptReporters: true,
                    items: ['both', 'front', 'back']
                },
                raycastResultField: {
                    acceptReporters: true,
                    items: [
                        'object', 'kind', 'node', 'precision', 'distance',
                        'x', 'y', 'z', 'normal x', 'normal y', 'normal z',
                        'triangle', 'primitive', 'geometry ID', 'material'
                    ]
                },
                coordinateValue: {
                    acceptReporters: true,
                    items: ['stage x', 'stage y', 'depth', 'NDC x', 'NDC y', 'NDC z']
                },
                vectorAxis: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z']
                },
                basisAxis: {
                    acceptReporters: true,
                    items: ['forward', 'right', 'up']
                },
                cameraRotationAxis: {
                    acceptReporters: true,
                    items: ['yaw', 'pitch']
                },
                tweenEasing: {
                    acceptReporters: true,
                    items: ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'smoothstep']
                },
                textFont: {
                    acceptReporters: true,
                    items: ['sans-serif', 'serif', 'monospace', 'system-ui', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New']
                },
                textAlignment: {
                    acceptReporters: true,
                    items: ['left', 'center', 'right']
                }
            }
        };
    }

    initializeEngine(args) {
        this.#command(() => this.engine.initialize(String(args.BACKEND)));
    }

    resetEngine() {
        this.modelImport?.abort();
        this.#command(() => this.engine.reset());
    }

    disposeEngine() {
        this.modelImport?.abort();
        this.#command(() => this.engine.dispose());
    }

    renderOneFrame() {
        this.#command(() => this.engine.renderOneFrame());
    }

    engineInitialized() {
        return this.engine.initialized;
    }

    rendererBackend() {
        return this.engine.backend?.name ?? '';
    }

    currentFps() {
        return this.engine.profiler.fps;
    }

    averageFps() {
        return this.engine.profiler.averageFps;
    }

    drawCalls() {
        return this.engine.profiler.drawCalls;
    }

    setRenderQuality(args) {
        this.#command(() => this.engine.setRenderQuality(String(args.QUALITY)));
    }

    renderQuality() {
        return this.engine.quality.preset;
    }

    setRenderResolutionScale(args) {
        this.#command(() => this.engine.setRenderScale(finiteNumber(args.PERCENT, 100)));
    }

    renderResolutionScale() {
        return this.engine.quality.effectiveRenderScale;
    }

    setMaxPixelRatio(args) {
        this.#command(() => this.engine.setMaxPixelRatio(args.RATIO));
    }

    maxPixelRatio() {
        return this.engine.quality.maxPixelRatio || 'automatic';
    }

    setAntialiasing(args) {
        this.#command(() => this.engine.setAntialias(String(args.MODE)));
    }

    antialiasing() {
        return this.engine.renderMetrics.antialias;
    }

    setRenderDistance(args) {
        this.#command(() => this.engine.setRenderDistance(finiteNumber(args.DISTANCE)));
    }

    renderDistance() {
        return this.engine.quality.renderDistance;
    }

    setFrustumCulling(args) {
        this.#command(() => {
            this.engine.activeScene.setFrustumCulling(parseToggle(args.ENABLED));
            this.engine.invalidate();
        });
    }

    frustumCullingEnabled() {
        return this.#report(() => this.engine.activeScene.frustumCullingEnabled, false);
    }

    setGlobalTextureQuality(args) {
        this.#command(() => this.engine.setTextureQuality(String(args.QUALITY)));
    }

    globalTextureQuality() {
        return this.engine.quality.textureQuality;
    }

    setGlobalEnvironmentQuality(args) {
        this.#command(() => this.engine.setEnvironmentQuality(String(args.QUALITY)));
    }

    globalEnvironmentQuality() {
        return this.engine.quality.environmentQuality;
    }

    setMaximumLocalLights(args) {
        this.#command(() => this.engine.setLocalLightLimit(finiteNumber(args.COUNT, 8)));
    }

    maximumLocalLights() {
        return this.engine.quality.localLightLimit;
    }

    internalRenderWidth() { return this.internalRenderDimension({DIMENSION: 'width'}); }

    internalRenderHeight() { return this.internalRenderDimension({DIMENSION: 'height'}); }

    effectivePixelRatio() {
        return this.engine.renderMetrics.effectivePixelRatio;
    }

    internalRenderPixels() {
        const metrics = this.engine.renderMetrics;
        return metrics.width * metrics.height;
    }

    setAdaptiveResolution(args) {
        this.#command(() => this.engine.setAdaptiveResolution(parseToggle(args.ENABLED)));
    }

    adaptiveResolutionEnabled() {
        return this.engine.quality.adaptiveEnabled;
    }

    setAdaptiveTargetFps(args) {
        this.#command(() => this.engine.setAdaptiveTargetFps(finiteNumber(args.FPS, 60)));
    }

    adaptiveTargetFps() {
        return this.engine.quality.adaptiveTargetFps;
    }

    setAdaptiveScaleRange(args) {
        this.#command(() => this.engine.setAdaptiveScaleRange(
            finiteNumber(args.MINIMUM, 50),
            finiteNumber(args.MAXIMUM, 100)
        ));
    }

    setPostProcessing(args) { this.#command(() => this.engine.setPostProcessing(parseToggle(args.ENABLED))); }

    setBloom(args) { this.#command(() => this.engine.setBloom(parseToggle(args.ENABLED))); }

    setBloomIntensity(args) { return this.setBloomFactor({PROPERTY: 'intensity', VALUE: args.VALUE}); }

    setBloomThreshold(args) { return this.setBloomFactor({PROPERTY: 'threshold', VALUE: args.VALUE}); }

    setBloomQuality(args) { this.#command(() => this.engine.setBloomQuality(args.QUALITY)); }

    setPostBrightness(args) { return this.setPostColorFactor({PROPERTY: 'brightness', VALUE: args.VALUE}); }

    setPostContrast(args) { return this.setPostColorFactor({PROPERTY: 'contrast', VALUE: args.VALUE}); }

    setPostSaturation(args) { return this.setPostColorFactor({PROPERTY: 'saturation', VALUE: args.VALUE}); }

    setVignetteIntensity(args) { return this.setVignetteFactor({PROPERTY: 'intensity', VALUE: args.VALUE}); }

    setVignetteRadius(args) { return this.setVignetteFactor({PROPERTY: 'radius', VALUE: args.VALUE}); }

    setVignetteSoftness(args) { return this.setVignetteFactor({PROPERTY: 'softness', VALUE: args.VALUE}); }

    setFxaa(args) { this.#command(() => this.engine.setFxaa(parseToggle(args.ENABLED))); }

    resetPostProcessing() { this.#command(() => this.engine.resetPostProcessing()); }

    postProcessingEnabled() { return this.engine.post.enabled; }

    bloomEnabled() { return this.engine.post.bloomEnabled; }

    bloomIntensity() { return this.engine.post.bloomIntensity; }

    postProcessingPassCount() { return this.engine.profiler.postPasses; }

    postFullscreenDraws() { return this.engine.profiler.fullscreenDraws; }

    renderTargetAllocations() { return this.engine.profiler.renderTargetAllocations; }

    renderTargetResizes() { return this.engine.profiler.renderTargetResizes; }

    renderTargetBytes() { return this.engine.profiler.renderTargetBytes; }

    bloomPasses() { return this.engine.profiler.bloomPasses; }

    postShaderCompiles() { return this.engine.profiler.postShaderCompiles; }

    offscreenCameraRenders() { return this.engine.profiler.offscreenCameraRenders; }

    createRenderTarget(args) {
        this.#command(() => this.engine.createRenderTarget(
            this.#name(args.TARGET, 'render target'),
            positiveInteger(args.WIDTH, 1),
            positiveInteger(args.HEIGHT, 1)
        ));
    }

    deleteRenderTarget(args) {
        this.#command(() => this.engine.deleteRenderTarget(this.#name(args.TARGET, 'render target')));
    }

    resizeRenderTarget(args) {
        this.#command(() => this.engine.resizeRenderTarget(
            this.#name(args.TARGET, 'render target'),
            positiveInteger(args.WIDTH, 1),
            positiveInteger(args.HEIGHT, 1)
        ));
    }

    renderSceneToRenderTarget(args) {
        this.#command(() => this.engine.renderSceneToTarget(this.#name(args.TARGET, 'render target')));
    }

    renderCameraToRenderTarget(args) {
        this.#command(() => this.engine.renderSceneToTarget(
            this.#name(args.TARGET, 'render target'),
            this.#name(args.CAMERA, 'camera')
        ));
    }

    clearRenderTarget(args) {
        this.#command(() => this.engine.clearRenderTarget(this.#name(args.TARGET, 'render target')));
    }

    renderTargetExists(args) {
        const name = normalizeName(args.TARGET);
        return Boolean(name && this.engine.renderTargets.has(name));
    }

    renderTargetWidth(args) { return this.renderTargetDimension({TARGET: args.TARGET, DIMENSION: 'width'}); }

    renderTargetHeight(args) { return this.renderTargetDimension({TARGET: args.TARGET, DIMENSION: 'height'}); }

    createScene(args) {
        this.#command(() => this.engine.createScene(this.#name(args.SCENE, 'scene')));
    }

    setActiveScene(args) {
        this.#command(() => this.engine.setActiveScene(this.#name(args.SCENE, 'scene')));
    }

    createCamera(args) {
        this.#command(() => {
            const fov = clamp(finiteNumber(args.FOV, 60), 1, 179);
            this.engine.activeScene.createCamera(this.#name(args.NAME, 'camera'), fov);
            this.engine.invalidate();
        });
    }

    setActiveCamera(args) {
        this.#command(() => {
            this.engine.activeScene.setActiveCamera(this.#name(args.NAME, 'camera'));
            this.engine.invalidate();
        });
    }

    createCube(args) {
        this.#command(() => {
            this.engine.activeScene.createCube(this.#name(args.NAME, 'object'));
            this.engine.invalidate();
        });
    }

    loadModelFromSource(args) {
        return this.#asyncCommand(async () => {
            const name = this.#name(args.MODEL, 'model');
            const asset = this.engine.models.load(name, createUrlModelSource(this.Scratch, args.SOURCE));
            await this.engine.models.waitUntilReady(asset);
            this.engine.invalidate();
        });
    }

    loadModelFromFile(args) {
        return this.importModelFile(args);
    }

    importModelFile(args) {
        return this.#asyncCommand(async isCurrent => {
            const name = this.#name(args.MODEL, 'model');
            if (this.modelImport) throw new Error('A model import is already open. Finish or cancel it first.');
            if (this.engine.models.has(name)) throw new Error(`Model "${name}" already exists. Delete its instances and asset before importing again.`);
            const controller = new AbortController();
            this.modelImport = controller;
            const runtime = this.Scratch.vm?.runtime;
            const events = ['PROJECT_STOP_ALL', 'PROJECT_LOADED', 'RUNTIME_DISPOSED'];
            const stop = () => controller.abort();
            for (const event of events) runtime?.on(event, stop);
            let asset = null;
            let abortImport;
            try {
                const file = await chooseLocalModelFile(this.Scratch, controller.signal);
                if (!isCurrent() || controller.signal.aborted) return;
                asset = this.engine.models.load(name, createFileModelSource(file));
                const cancelled = new Promise((_, reject) => {
                    abortImport = () => {
                        if (!asset.disposed) this.engine.models.delete(name);
                        reject(modelSelectionCancelled());
                    };
                    controller.signal.addEventListener('abort', abortImport, {once: true});
                });
                await Promise.race([this.engine.models.waitUntilReady(asset), cancelled]);
                if (isCurrent()) this.engine.invalidate();
            } catch (error) {
                if (asset && !asset.disposed) this.engine.models.delete(name);
                throw error;
            } finally {
                if (abortImport) controller.signal.removeEventListener('abort', abortImport);
                for (const event of events) runtime?.off(event, stop);
                this.modelImport = null;
            }
        });
    }

    deleteModelAsset(args) {
        this.#command(() => this.engine.models.delete(this.#name(args.MODEL, 'model')));
    }

    createModelInstance(args) {
        this.#command(() => {
            this.engine.activeScene.createModelInstance(
                this.#name(args.NAME, 'model instance'),
                this.#name(args.MODEL, 'model')
            );
            this.engine.invalidate();
        });
    }

    createModelInstances(args) {
        this.#command(() => {
            const prefix = this.#name(args.PREFIX, 'model instance prefix');
            const model = this.#name(args.MODEL, 'model');
            const count = positiveInteger(args.COUNT, 10, 10_000);
            for (let index = 1; index <= count; index++) {
                this.engine.activeScene.createModelInstance(`${prefix}${index}`, model);
            }
            this.engine.invalidate();
        });
    }

    setModelNodePosition(args) {
        this.#command(() => {
            const instance = this.engine.activeScene.modelInstances.get(this.#name(args.NAME, 'model instance'));
            if (!instance) throw new Error(`Unknown model instance "${args.NAME}"`);
            instance.setNodePosition(
                Math.trunc(finiteNumber(args.NODE)),
                transformNumber(args.X),
                transformNumber(args.Y),
                transformNumber(args.Z)
            );
            this.engine.invalidate();
        });
    }

    playAnimation(args) {
        this.#command(() => {
            this.#modelInstance(args.INSTANCE).play(args.CLIP, parseToggle(args.LOOPING));
            this.engine.invalidate();
        });
    }

    pauseAnimation(args) {
        this.#command(() => this.#modelInstance(args.INSTANCE).pause());
    }

    resumeAnimation(args) {
        this.#command(() => this.#modelInstance(args.INSTANCE).resume());
    }

    stopAnimation(args) {
        this.#command(() => this.#modelInstance(args.INSTANCE).stop());
    }

    resetModelPose(args) {
        this.#command(() => {
            this.#modelInstance(args.INSTANCE).resetPose();
            this.engine.invalidate();
        });
    }

    setAnimationTime(args) {
        this.#command(() => {
            this.#modelInstance(args.INSTANCE).seek(finiteNumber(args.SECONDS));
            this.engine.invalidate();
        });
    }

    setAnimationSpeed(args) {
        this.#command(() => this.#modelInstance(args.INSTANCE).setSpeed(finiteNumber(args.SPEED, 1)));
    }

    setAnimationLooping(args) {
        this.#command(() => this.#modelInstance(args.INSTANCE).setLooping(parseToggle(args.LOOPING)));
    }

    crossfadeAnimation(args) {
        this.#command(() => {
            this.#modelInstance(args.INSTANCE).crossfade(args.CLIP, Math.max(0, finiteNumber(args.SECONDS)));
            this.engine.invalidate();
        });
    }

    animationCount(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).animations.length, 0);
    }

    animationName(args) {
        return this.#report(() => {
            const asset = this.engine.models.require(this.#name(args.MODEL, 'model'));
            const index = Math.trunc(finiteNumber(args.INDEX, 1)) - 1;
            if (index < 0 || index >= asset.animations.length) throw new Error(`Animation index ${index + 1} is out of range`);
            return asset.animations[index].name;
        }, '');
    }

    animationDuration(args) {
        return this.#report(() => resolveAssetClip(
            this.engine.models.require(this.#name(args.MODEL, 'model')),
            args.CLIP
        ).duration, 0);
    }

    currentAnimation(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).currentClip?.name ?? '', '');
    }

    animationTime(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).player.time, 0);
    }

    animationProgress(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).progress, 0);
    }

    animationPlaying(args) {
        return this.#report(() => {
            const player = this.#modelInstance(args.INSTANCE).player;
            return player.playing && !player.paused;
        }, false);
    }

    animationPaused(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).player.paused, false);
    }

    animationFinished(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).player.finished, false);
    }

    animationSpeed(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).player.speed, 0);
    }

    setResourceFrustumCulling(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceFrustumCulling(
                this.#name(args.RESOURCE, 'resource'),
                parseToggle(args.ENABLED)
            );
            this.engine.invalidate();
        });
    }

    resourceFrustumCullingEnabled(args) {
        return this.#report(() => this.engine.activeScene.resourceFrustumCulling(
            this.#name(args.RESOURCE, 'resource')
        ), false);
    }

    createLodGroup(args) {
        this.#command(() => this.engine.lods.create(this.#name(args.GROUP, 'LOD group')));
    }

    deleteLodGroup(args) {
        this.#command(() => this.engine.lods.delete(this.#name(args.GROUP, 'LOD group')));
    }

    addLodLevel(args) {
        this.#command(() => this.engine.lods.addLevel(
            this.#name(args.GROUP, 'LOD group'),
            this.#name(args.MODEL, 'model'),
            finiteNumber(args.DISTANCE)
        ));
    }

    assignModelLodGroup(args) {
        this.#command(() => {
            this.engine.activeScene.assignLodGroup(
                this.#name(args.INSTANCE, 'model instance'),
                this.#name(args.GROUP, 'LOD group')
            );
            this.engine.invalidate();
        });
    }

    clearModelLodGroup(args) {
        this.#command(() => {
            this.engine.activeScene.clearLodGroup(this.#name(args.INSTANCE, 'model instance'));
            this.engine.invalidate();
        });
    }

    setModelLodEnabled(args) {
        this.#command(() => {
            this.engine.activeScene.setLodEnabled(
                this.#name(args.INSTANCE, 'model instance'),
                parseToggle(args.ENABLED)
            );
            this.engine.invalidate();
        });
    }

    setModelLodHysteresis(args) {
        this.#command(() => {
            this.engine.activeScene.setLodHysteresis(
                this.#name(args.INSTANCE, 'model instance'),
                finiteNumber(args.DISTANCE)
            );
            this.engine.invalidate();
        });
    }

    forceModelLodLevel(args) {
        this.#command(() => {
            const text = String(args.LEVEL).trim().toLowerCase();
            const level = text === 'auto' ? 'auto' : finiteNumber(args.LEVEL);
            this.engine.activeScene.setForcedLodLevel(this.#name(args.INSTANCE, 'model instance'), level);
            this.engine.invalidate();
        });
    }

    currentModelLodLevel(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).currentLodLevel + 1, 0);
    }

    modelLodGroup(args) {
        return this.#report(() => this.#modelInstance(args.INSTANCE).lodGroup?.name ?? '', '');
    }

    lodGroupLevelCount(args) {
        return this.#report(() => this.engine.lods.require(
            this.#name(args.GROUP, 'LOD group')
        ).levels.length, 0);
    }

    lodGroupExists(args) {
        const name = normalizeName(args.GROUP);
        return Boolean(name && this.engine.lods.has(name));
    }

    modelExists(args) {
        const name = normalizeName(args.MODEL);
        return Boolean(name && this.engine.models.has(name));
    }

    modelState(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).state, 'missing');
    }

    modelError(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).error, '');
    }

    modelNodeCount(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).nodes.length, 0);
    }

    modelPrimitiveCount(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).primitives.length, 0);
    }

    modelTriangleCount(args) {
        return this.#report(() => this.engine.models.require(this.#name(args.MODEL, 'model')).primitives.reduce(
            (total, primitive) => total + primitive.triangleCount,
            0
        ), 0);
    }

    modelAssetCount() {
        return this.engine.models.count;
    }

    loadedGeometryCount() {
        return Math.max(0, this.engine.geometry.count - 1);
    }

    geometryGpuBytes() {
        return this.engine.profiler.geometryGpuBytes;
    }

    geometryUploads() {
        return this.engine.profiler.geometryUploads;
    }

    spriteCount() { return this.engine.profiler.spriteCount; }

    visibleSpriteCount() { return this.engine.profiler.visibleSprites; }

    spriteDrawCalls() { return this.engine.profiler.spriteDrawCalls; }

    spriteInstanceUploadBytes() { return this.engine.profiler.spriteInstanceUploadBytes; }

    directionalFrameChanges() { return this.engine.profiler.directionalFrameChanges; }

    activeParticleEmitters() { return this.engine.profiler.activeParticleEmitters; }

    totalActiveParticles() { return this.engine.profiler.activeParticles; }

    particlesSpawned() { return this.engine.profiler.particlesSpawned; }

    particlesExpired() { return this.engine.profiler.particlesExpired; }

    particleSimulationTime() { return this.engine.profiler.particleSimulationTime; }

    visibleParticleEmitters() { return this.engine.profiler.visibleParticleEmitters; }

    culledParticleEmitters() { return this.engine.profiler.culledParticleEmitters; }

    particleInstanceUploadBytes() { return this.engine.profiler.particleInstanceUploadBytes; }

    particleDrawCalls() { return this.engine.profiler.particleDrawCalls; }

    decalCount() { return this.engine.profiler.decalCount; }

    visibleDecalCount() { return this.engine.profiler.visibleDecals; }

    decalDrawCalls() { return this.engine.profiler.decalDrawCalls; }

    activeAnimationPlayers() {
        return this.engine.profiler.activeAnimationPlayers;
    }

    sampledAnimationChannels() {
        return this.engine.profiler.sampledAnimationChannels;
    }

    animationSamplingTime() {
        return this.engine.profiler.animationSamplingTime;
    }

    jointPaletteUploads() {
        return this.engine.profiler.jointPaletteUploads;
    }

    jointPaletteUploadBytes() {
        return this.engine.profiler.jointPaletteUploadBytes;
    }

    skinnedDrawCalls() {
        return this.engine.profiler.skinnedDrawCalls;
    }

    skinnedShadowDrawCalls() {
        return this.engine.profiler.skinnedShadowDrawCalls;
    }

    totalRenderables() { return this.engine.profiler.totalRenderables; }

    visibilityCandidates() { return this.engine.profiler.visibilityCandidates; }

    spatialCandidates() { return this.engine.profiler.spatialCandidates; }

    frustumTests() { return this.engine.profiler.frustumTested; }

    frustumRejected() { return this.engine.profiler.frustumRejected; }

    renderDistanceRejected() { return this.engine.profiler.renderDistanceRejected; }

    visibleRenderables() { return this.engine.profiler.visibleRenderables; }

    visibleInstances() { return this.engine.profiler.visibleInstances; }

    culledInstances() { return this.engine.profiler.culledInstances; }

    visibilityCpuTime() { return this.engine.profiler.visibilityCpuTime; }

    spatialQueryCpuTime() { return this.engine.profiler.spatialQueryCpuTime; }

    spatialIndexEntries() { return this.engine.profiler.spatialIndexEntries; }

    spatialIndexUpdates() { return this.engine.profiler.spatialIndexUpdates; }

    spatialIndexRebuilds() { return this.engine.profiler.spatialIndexRebuilds; }

    dirtyBounds() { return this.engine.profiler.dirtyBounds; }

    animatedBounds() { return this.engine.profiler.animatedBounds; }

    visibleInstanceUploadBytes() { return this.engine.profiler.visibleInstanceUploadBytes; }

    lodEvaluations() { return this.engine.profiler.lodEvaluations; }

    lodSwitches() { return this.engine.profiler.lodSwitches; }

    lodLevelInstanceCount(args) {
        return this.#report(() => {
            const level = Math.trunc(finiteNumber(args.LEVEL, 1)) - 1;
            if (level < 0 || level >= this.engine.activeScene.lodMetrics.levelCounts.length) {
                throw new Error('LOD level must be from 1 to 16');
            }
            return this.engine.activeScene.lodMetrics.levelCounts[level];
        }, 0);
    }

    shadowVisibilityCandidates() { return this.engine.profiler.shadowVisibilityCandidates; }

    shadowFrustumRejected() { return this.engine.profiler.shadowFrustumRejected; }

    shadowVisibleCasters() { return this.engine.profiler.shadowVisibleCasters; }

    createDirectionalLight(args) {
        this.#command(() => {
            const intensity = Math.max(0, finiteNumber(args.INTENSITY, 1));
            this.engine.activeScene.createDirectionalLight(this.#name(args.NAME, 'light'), intensity);
            this.engine.invalidate();
        });
    }

    setDirectionalLight(args) {
        this.#command(() => {
            this.engine.activeScene.setDirectionalLight(
                this.#name(args.LIGHT, 'light'),
                parseLinearColor(args.COLOR),
                Math.max(0, finiteNumber(args.INTENSITY, 1))
            );
            this.engine.invalidate();
        });
    }

    setAmbientLight(args) {
        this.#command(() => {
            this.engine.activeScene.setAmbientLight(
                parseLinearColor(args.COLOR),
                Math.max(0, finiteNumber(args.INTENSITY, 0.03))
            );
            this.engine.invalidate();
        });
    }

    createPointLight(args) {
        this.#command(() => this.engine.activeScene.createPointLight(this.#name(args.NAME, 'light')));
    }

    createSpotLight(args) {
        this.#command(() => this.engine.activeScene.createSpotLight(this.#name(args.NAME, 'light')));
    }

    deleteLocalLight(args) {
        this.#command(() => this.engine.activeScene.deleteLocalLight(this.#name(args.LIGHT, 'light')));
    }

    setLocalLightPosition(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setPosition(finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z)));
    }

    setLocalLightColor(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setColor(parseLinearColor(args.COLOR)));
    }

    setLocalLightIntensity(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setIntensity(finiteNumber(args.INTENSITY, 1)));
    }

    setLocalLightRange(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setRange(finiteNumber(args.RANGE, 10)));
    }

    setLocalLightEnabled(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setEnabled(parseToggle(args.ENABLED)));
    }

    setSpotLightDirection(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setDirection(finiteNumber(args.X), finiteNumber(args.Y, -1), finiteNumber(args.Z)));
    }

    pointSpotLightToward(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).pointToward(finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z)));
    }

    setSpotLightInnerAngle(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setInnerAngle(finiteNumber(args.DEGREES, 20)));
    }

    setSpotLightOuterAngle(args) {
        this.#command(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).setOuterAngle(finiteNumber(args.DEGREES, 30)));
    }

    localLightExists(args) {
        const name = normalizeName(args.LIGHT);
        return Boolean(name && this.engine.lights.has(name));
    }

    localLightType(args) {
        return this.#report(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).type, '');
    }

    localLightPosition(args) {
        return this.#report(() => {
            const light = this.engine.activeScene.requireLocalLight(this.#name(args.LIGHT, 'light'));
            const axis = String(args.AXIS).trim().toLowerCase();
            const index = {x: 0, y: 1, z: 2}[axis];
            if (index === undefined) throw new Error(`Unknown position component "${args.AXIS}"`);
            return light.position[index];
        }, 0);
    }

    localLightIntensity(args) {
        return this.#report(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).intensity, 0);
    }

    localLightRange(args) {
        return this.#report(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).range, 0);
    }

    localLightEnabled(args) {
        return this.#report(() => this.engine.activeScene.requireLocalLight(
            this.#name(args.LIGHT, 'light')
        ).enabled, false);
    }

    activeLocalLightCount() {
        return this.#report(() => this.engine.activeScene.enabledLocalLightCount, 0);
    }

    selectedLocalLightCount() {
        return this.engine.profiler.selectedLocalLights;
    }

    localLightListRebuilds() {
        return this.engine.profiler.localLightListRebuilds;
    }

    localLightGpuUploads() {
        return this.engine.profiler.localLightGpuUploads;
    }

    localLightDrawCalls() {
        return this.engine.profiler.localLightDrawCalls;
    }

    localLightSelectionTime() {
        return this.engine.profiler.localLightSelectionTime;
    }

    createCubeInstances(args) {
        this.#command(() => {
            const count = positiveInteger(args.COUNT, 1000, 100_000);
            const spacing = Math.max(0, finiteNumber(args.SPACING, 1.5));
            this.engine.activeScene.createCubeInstances(this.#name(args.GROUP, 'instance group'), count, spacing);
            this.engine.invalidate();
        });
    }

    createSprite(args) {
        this.#command(() => {
            this.engine.activeScene.createSprite(
                this.#name(args.NAME, 'sprite'),
                this.#name(args.TEXTURE, 'texture')
            );
            this.engine.invalidate();
        });
    }

    createParticleEmitter(args) {
        this.#command(() => {
            this.engine.activeScene.createParticleEmitter(
                this.#name(args.NAME, 'particle emitter'),
                this.#name(args.TEXTURE, 'texture'),
                positiveInteger(args.MAXIMUM, 1000, 1000000)
            );
            this.engine.invalidate();
        });
    }

    createDecal(args) {
        this.#command(() => {
            this.engine.activeScene.createDecal(
                this.#name(args.NAME, 'decal'),
                this.#name(args.TEXTURE, 'texture')
            );
            this.engine.invalidate();
        });
    }

    effectKind(args) {
        return this.#report(() => this.#effect(args.NAME).kind, '');
    }

    effectExists(args) {
        const name = normalizeName(args.NAME);
        return Boolean(name && this.engine.scenes.active?.effects.resources.has(name));
    }

    setEffectVisible(args) {
        this.#effectCommand(args.NAME, effect => effect.setVisible(parseToggle(args.VISIBLE)));
    }

    effectVisible(args) {
        return this.#report(() => this.#effect(args.NAME).visible, false);
    }

    setSpriteBillboardMode(args) {
        this.#effectCommand(args.NAME, effect => effect.setBillboardMode(args.MODE));
    }

    spriteBillboardMode(args) {
        return this.#report(() => this.#effect(args.NAME, 'sprite').billboardMode, '');
    }

    setEffectSize(args) {
        this.#effectCommand(args.NAME, effect => effect.setSize(
            finiteNumber(args.WIDTH, 1),
            finiteNumber(args.HEIGHT, 1)
        ));
    }

    setSpritePivot(args) {
        this.#effectCommand(args.NAME, effect => effect.setNamedPivot(args.PIVOT));
    }

    setSpriteCustomPivot(args) {
        this.#effectCommand(args.NAME, effect => effect.setPivot(
            finiteNumber(args.X, 0.5),
            finiteNumber(args.Y, 0.5)
        ));
    }

    setEffectTint(args) {
        this.#effectCommand(args.NAME, effect => {
            const [red, green, blue] = parseColor(args.COLOR);
            effect.setTint(red, green, blue, Math.max(0, finiteNumber(args.OPACITY, 100)) / 100);
            effect.setBrightness(Math.max(0, finiteNumber(args.BRIGHTNESS, 100)) / 100);
        });
    }

    setEffectAlphaMode(args) {
        this.#effectCommand(args.NAME, effect => {
            effect.setAlphaMode(args.MODE);
            effect.setAlphaCutoff(finiteNumber(args.CUTOFF, 0.5));
        });
    }

    setEffectLighting(args) {
        this.#effectCommand(args.NAME, effect => effect.setLighting(args.MODE));
    }

    setEffectDepth(args) {
        this.#effectCommand(args.NAME, effect => effect.setDepth(
            parseToggle(args.TEST),
            parseToggle(args.WRITE)
        ));
    }

    setSpriteSheet(args) {
        this.#effectCommand(args.NAME, effect => effect.setSheet(args.COLUMNS, args.ROWS));
    }

    setSpriteFrame(args) {
        this.#effectCommand(args.NAME, effect => effect.setFrame(finiteNumber(args.FRAME, 1) - 1));
    }

    playSpriteFrames(args) {
        this.#effectCommand(args.NAME, effect => effect.playFrames(
            finiteNumber(args.FIRST, 1) - 1,
            finiteNumber(args.LAST, 1) - 1,
            finiteNumber(args.FPS, 8),
            parseToggle(args.LOOPING)
        ));
    }

    pauseSpriteFrames(args) {
        this.#effectCommand(args.NAME, effect => effect.pauseFrames());
    }

    resumeSpriteFrames(args) {
        this.#effectCommand(args.NAME, effect => effect.resumeFrames());
    }

    stopSpriteFrames(args) {
        this.#effectCommand(args.NAME, effect => effect.stopFrames(parseToggle(args.RESET)));
    }

    setSpriteDirectionalViews(args) {
        this.#effectCommand(args.NAME, effect => effect.setDirectional(
            finiteNumber(args.COUNT),
            finiteNumber(args.ANGLE) * DEGREES_TO_RADIANS
        ));
    }

    setSpriteDirectionalFrame(args) {
        this.#effectCommand(args.NAME, effect => effect.setDirectionalFrame(
            finiteNumber(args.DIRECTION, 1),
            finiteNumber(args.FRAME, 1) - 1
        ));
    }

    spriteCurrentFrame(args) {
        return this.#report(() => this.#effect(args.NAME).renderedFrame + 1, 0);
    }

    setParticleEmissionRate(args) {
        this.#effectCommand(args.NAME, effect => effect.setEmissionRate(finiteNumber(args.RATE)));
    }

    setParticleMaximum(args) {
        this.#effectCommand(args.NAME, effect => effect.setMaximumParticles(
            positiveInteger(args.MAXIMUM, 1000, 1000000)
        ));
    }

    setParticleSpawnShape(args) {
        this.#effectCommand(args.NAME, effect => effect.setSpawnShape(
            args.SHAPE,
            finiteNumber(args.X),
            finiteNumber(args.Y),
            finiteNumber(args.Z)
        ));
    }

    setParticleVelocity(args) {
        this.#effectCommand(args.NAME, effect => {
            const spread = finiteNumber(args.SPREAD);
            effect.setVelocity(
                finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z),
                spread, spread, spread
            );
        });
    }

    setParticleAcceleration(args) {
        this.#effectCommand(args.NAME, effect => effect.setAcceleration(
            finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z)
        ));
    }

    setParticleLifetime(args) {
        this.#effectCommand(args.NAME, effect => effect.setLifetime(
            finiteNumber(args.MINIMUM, 1), finiteNumber(args.MAXIMUM, 1)
        ));
    }

    setParticleSizeOverLife(args) {
        this.#effectCommand(args.NAME, effect => effect.setSizeOverLife(
            finiteNumber(args.START, 1), finiteNumber(args.END)
        ));
    }

    setParticleAlphaOverLife(args) {
        this.#effectCommand(args.NAME, effect => effect.setAlphaOverLife(
            finiteNumber(args.START, 100) / 100,
            finiteNumber(args.END) / 100
        ));
    }

    setParticleColorOverLife(args) {
        this.#effectCommand(args.NAME, effect => effect.setColorOverLife(
            parseColor(args.START),
            parseColor(args.END)
        ));
    }

    setParticleRotation(args) {
        this.#effectCommand(args.NAME, effect => effect.setRotationRange(
            finiteNumber(args.MINIMUM) * DEGREES_TO_RADIANS,
            finiteNumber(args.MAXIMUM) * DEGREES_TO_RADIANS,
            finiteNumber(args.ANGULARMINIMUM) * DEGREES_TO_RADIANS,
            finiteNumber(args.ANGULARMAXIMUM) * DEGREES_TO_RADIANS
        ));
    }

    setParticleFrameRate(args) {
        this.#effectCommand(args.NAME, effect => effect.setParticleFrameRate(finiteNumber(args.FPS)));
    }

    setParticleSeed(args) {
        this.#effectCommand(args.NAME, effect => effect.setSeed(finiteNumber(args.SEED, 1)));
    }

    startParticleEmitter(args) {
        this.#effectCommand(args.NAME, effect => effect.start());
    }

    stopParticleEmitter(args) {
        this.#effectCommand(args.NAME, effect => effect.stop());
    }

    pauseParticleEmitter(args) {
        this.#effectCommand(args.NAME, effect => effect.pause());
    }

    resumeParticleEmitter(args) {
        this.#effectCommand(args.NAME, effect => effect.resume());
    }

    clearParticleEmitter(args) {
        this.#effectCommand(args.NAME, effect => effect.clear());
    }

    burstParticles(args) {
        this.#effectCommand(args.NAME, effect => effect.burst(finiteNumber(args.COUNT)));
    }

    activeParticleCount(args) {
        return this.#report(() => this.#effect(args.NAME, 'particle-emitter').activeCount, 0);
    }

    particleEmitterEmitting(args) {
        return this.#report(() => this.#effect(args.NAME, 'particle-emitter').emitting, false);
    }

    particleEmitterPaused(args) {
        return this.#report(() => this.#effect(args.NAME, 'particle-emitter').paused, false);
    }

    setDecalNormal(args) {
        this.#effectCommand(args.NAME, effect => effect.setNormal(
            finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z)
        ));
    }

    setDecalOffset(args) {
        this.#effectCommand(args.NAME, effect => effect.setSurfaceOffset(finiteNumber(args.OFFSET, 0.01)));
    }

    setDecalLifetime(args) {
        this.#effectCommand(args.NAME, effect => effect.setLifetime(finiteNumber(args.SECONDS)));
    }

    deleteResource(args) {
        this.#command(() => {
            const name = this.#name(args.NAME, 'resource');
            if (!this.engine.activeScene.deleteResource(name)) throw new Error(`Unknown 3D resource "${name}"`);
            this.engine.invalidate();
        });
    }

    setPosition(args) {
        this.#command(() => {
            this.engine.activeScene.setResourcePosition(
                this.#name(args.NAME, 'object'),
                transformNumber(args.X),
                transformNumber(args.Y),
                transformNumber(args.Z)
            );
            this.engine.invalidate();
        });
    }

    setRotation(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceRotation(
                this.#name(args.NAME, 'object'),
                apiNumber(finiteNumber(args.X) * DEGREES_TO_RADIANS),
                apiNumber(finiteNumber(args.Y) * DEGREES_TO_RADIANS),
                apiNumber(finiteNumber(args.Z) * DEGREES_TO_RADIANS)
            );
            this.engine.invalidate();
        });
    }

    setScale(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceScale(
                this.#name(args.NAME, 'object'),
                transformNumber(args.X, 1),
                transformNumber(args.Y, 1),
                transformNumber(args.Z, 1)
            );
            this.engine.invalidate();
        });
    }

    setMaterialColor(args) {
        this.#command(() => {
            const objects = this.engine.activeScene.objects;
            const id = objects.requireId(this.#name(args.NAME, 'object'));
            const [red, green, blue] = parseColor(args.COLOR);
            objects.setColor(id, red, green, blue, 1);
            this.engine.invalidate();
        });
    }

    setInstancePosition(args) {
        this.#command(() => {
            const groupName = this.#name(args.GROUP, 'instance group');
            const group = this.engine.activeScene.instanceGroups.get(groupName);
            if (!group) throw new Error(`Unknown instance group "${groupName}"`);
            const index = Math.floor(finiteNumber(args.INDEX, 1)) - 1;
            group.setPosition(index, transformNumber(args.X), transformNumber(args.Y), transformNumber(args.Z));
            this.engine.invalidate();
        });
    }

    setShadowsEnabled(args) {
        this.#command(() => {
            this.engine.activeScene.setShadowsEnabled(parseToggle(args.ENABLED));
            this.engine.markRenderQualityCustom();
            this.engine.invalidate();
        });
    }

    setShadowQuality(args) {
        this.#command(() => {
            this.engine.activeScene.setShadowQuality(String(args.QUALITY));
            this.engine.markRenderQualityCustom();
            this.engine.invalidate();
        });
    }

    setLightCastsShadows(args) {
        this.#command(() => {
            this.engine.activeScene.setLightCastsShadow(
                this.#name(args.LIGHT, 'light'),
                parseToggle(args.ENABLED)
            );
            this.engine.invalidate();
        });
    }

    setResourceCastsShadows(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceCastsShadow(
                this.#name(args.RESOURCE, 'resource'),
                parseToggle(args.ENABLED)
            );
            this.engine.invalidate();
        });
    }

    setResourceReceivesShadows(args) {
        this.#command(() => {
            this.engine.activeScene.setResourceReceivesShadow(
                this.#name(args.RESOURCE, 'resource'),
                parseToggle(args.ENABLED)
            );
            this.engine.invalidate();
        });
    }

    setShadowMapSize(args) {
        this.#setLightShadowSetting(args, 'mapSize', args.SIZE);
    }

    setShadowBias(args) {
        this.#setLightShadowSetting(args, 'bias', args.VALUE);
    }

    setShadowNormalBias(args) {
        this.#setLightShadowSetting(args, 'normalBias', args.VALUE);
    }

    setShadowFilter(args) {
        this.#setLightShadowSetting(args, 'filter', args.FILTER);
    }

    setShadowDistance(args) {
        this.#setLightShadowSetting(args, 'distance', args.VALUE);
    }

    setShadowCameraNear(args) {
        this.#setLightShadowSetting(args, 'near', args.VALUE);
    }

    setShadowCameraFar(args) {
        this.#setLightShadowSetting(args, 'far', args.VALUE);
    }

    setShadowBounds(args) {
        this.#setLightShadowSetting(args, 'bounds', args.VALUE);
    }

    shadowsEnabled() {
        return this.#report(() => this.engine.activeScene.shadowsEnabled, false);
    }

    shadowQuality() {
        return this.#report(() => this.engine.activeScene.shadowsEnabled
            ? this.engine.activeScene.shadowQuality
            : 'off', 'off');
    }

    shadowMapSize(args) {
        return this.#report(() => this.engine.activeScene.shadowMapSizeOf(
            this.#name(args.LIGHT, 'light')
        ), 0);
    }

    shadowRenderTime() {
        return this.engine.profiler.shadowRenderTime;
    }

    shadowDrawCalls() {
        return this.engine.profiler.shadowDrawCalls;
    }

    shadowTriangles() {
        return this.engine.profiler.shadowTriangles;
    }

    shadowCasters() {
        return this.engine.profiler.shadowCasters;
    }

    shadowMapsUpdated() {
        return this.engine.profiler.shadowMapsUpdated;
    }

    createMaterial(args) {
        this.#command(() => this.engine.materials.create(
            this.#name(args.MATERIAL, 'material'),
            String(args.TYPE)
        ));
    }

    createPbrMaterial(args) { return this.createMaterial({MATERIAL: args.MATERIAL, TYPE: 'pbr'}); }

    cloneMaterial(args) {
        this.#command(() => this.engine.materials.clone(
            this.#name(args.SOURCE, 'material'),
            this.#name(args.MATERIAL, 'material')
        ));
    }

    deleteMaterial(args) {
        this.#command(() => this.engine.materials.delete(this.#name(args.MATERIAL, 'material')));
    }

    setResourceMaterial(args) {
        this.#command(() => {
            const material = this.engine.materials.require(this.#name(args.MATERIAL, 'material'));
            this.engine.activeScene.setResourceMaterial(this.#name(args.RESOURCE, 'resource'), material.id);
            this.engine.invalidate();
        });
    }

    setMaterialBaseColor(args) {
        this.#command(() => {
            const name = this.#name(args.MATERIAL, 'material');
            const material = this.engine.materials.require(name);
            this.engine.materials.setBaseColor(
                name,
                material.type === MaterialType.PBR ? parseLinearColor(args.COLOR) : parseColor(args.COLOR)
            );
        });
    }

    setMaterialOpacity(args) {
        this.#command(() => this.engine.materials.setOpacity(
            this.#name(args.MATERIAL, 'material'),
            finiteNumber(args.OPACITY, 100) / 100
        ));
    }

    setMaterialTexture(args) {
        this.#command(() => {
            const textureName = normalizeName(args.TEXTURE);
            const textureId = textureName ? this.engine.textures.require(textureName).id : -1;
            this.engine.materials.setTexture(this.#name(args.MATERIAL, 'material'), textureId);
        });
    }

    setPbrMetallic(args) { return this.setPbrFactor({MATERIAL: args.MATERIAL, PROPERTY: 'metallic', VALUE: args.VALUE}); }

    setPbrRoughness(args) { return this.setPbrFactor({MATERIAL: args.MATERIAL, PROPERTY: 'roughness', VALUE: args.VALUE}); }

    setPbrMapTexture(args) {
        this.#command(() => {
            const textureName = normalizeName(args.TEXTURE);
            const textureId = textureName ? this.engine.textures.require(textureName).id : -1;
            this.engine.materials.setPbrMapTexture(
                this.#name(args.MATERIAL, 'material'),
                String(args.MAP),
                textureId
            );
        });
    }

    removePbrMapTexture(args) {
        this.#command(() => this.engine.materials.setPbrMapTexture(
            this.#name(args.MATERIAL, 'material'),
            String(args.MAP),
            -1
        ));
    }

    setPbrNormalStrength(args) { return this.setPbrFactor({MATERIAL: args.MATERIAL, PROPERTY: 'normal strength', VALUE: args.VALUE}); }

    setPbrAoStrength(args) { return this.setPbrFactor({MATERIAL: args.MATERIAL, PROPERTY: 'ao strength', VALUE: args.VALUE}); }

    pbrMetallic(args) {
        return this.#report(() => this.engine.materials.require(
            this.#name(args.MATERIAL, 'material')
        ).metallic, 0);
    }

    pbrRoughness(args) {
        return this.#report(() => this.engine.materials.require(
            this.#name(args.MATERIAL, 'material')
        ).roughness, 0);
    }

    warmMaterialShader(args) {
        this.#command(() => this.engine.warmMaterial(this.#name(args.MATERIAL, 'material')));
    }

    setMaterialEmissive(args) {
        this.#command(() => {
            const name = this.#name(args.MATERIAL, 'material');
            const material = this.engine.materials.require(name);
            this.engine.materials.setEmissiveColor(
                name,
                material.type === MaterialType.PBR ? parseLinearColor(args.COLOR) : parseColor(args.COLOR)
            );
            this.engine.materials.setEmissiveIntensity(name, finiteNumber(args.INTENSITY));
        });
    }

    setMaterialDoubleSided(args) {
        this.#command(() => this.engine.materials.setDoubleSided(
            this.#name(args.MATERIAL, 'material'),
            parseToggle(args.ENABLED)
        ));
    }

    setMaterialDepthTest(args) {
        this.#command(() => this.engine.materials.setDepthTest(
            this.#name(args.MATERIAL, 'material'),
            parseToggle(args.ENABLED)
        ));
    }

    setMaterialDepthWrite(args) {
        this.#command(() => this.engine.materials.setDepthWrite(
            this.#name(args.MATERIAL, 'material'),
            parseToggle(args.ENABLED)
        ));
    }

    setMaterialAlphaMode(args) {
        this.#command(() => this.engine.materials.setAlphaMode(
            this.#name(args.MATERIAL, 'material'),
            String(args.MODE)
        ));
    }

    setMaterialAlphaCutoff(args) {
        this.#command(() => this.engine.materials.setAlphaCutoff(
            this.#name(args.MATERIAL, 'material'),
            finiteNumber(args.CUTOFF, 50) / 100
        ));
    }

    materialExists(args) {
        const name = normalizeName(args.MATERIAL);
        return Boolean(name && this.engine.materials.has(name));
    }

    materialOfResource(args) {
        return this.#report(() => this.engine.activeScene.materialNameOf(
            this.#name(args.RESOURCE, 'resource')
        ), '');
    }

    materialType(args) {
        return this.#report(() => this.engine.materials.require(
            this.#name(args.MATERIAL, 'material')
        ).type, '');
    }

    materialUsers(args) {
        return this.#report(() => this.engine.materials.require(
            this.#name(args.MATERIAL, 'material')
        ).references, 0);
    }

    materialCount() {
        return this.engine.materials.count;
    }

    materialPrograms() {
        return this.engine.profiler.materialPrograms;
    }

    materialShaderCompiles() {
        return this.engine.profiler.materialShaderCompiles;
    }

    materialProgramSwitches() {
        return this.engine.profiler.materialProgramSwitches;
    }

    materialSwitches() {
        return this.engine.profiler.materialSwitches;
    }

    textureSwitches() {
        return this.engine.profiler.textureSwitches;
    }

    pbrPrograms() {
        return this.engine.profiler.pbrPrograms;
    }

    pbrDrawCalls() {
        return this.engine.profiler.pbrDrawCalls;
    }

    createSolidEnvironment(args) {
        this.#command(() => this.engine.environments.createSolid(
            this.#name(args.ENVIRONMENT, 'environment'),
            parseColorBytes(args.COLOR)
        ));
    }

    createEnvironmentFromTexture(args) {
        this.#command(() => {
            const texture = this.engine.textures.require(this.#name(args.TEXTURE, 'texture'));
            this.engine.environments.createFromTexture(
                this.#name(args.ENVIRONMENT, 'environment'),
                texture.id
            );
        });
    }

    setEnvironmentTexture(args) {
        this.#command(() => {
            const texture = this.engine.textures.require(this.#name(args.TEXTURE, 'texture'));
            this.engine.environments.replaceTexture(
                this.#name(args.ENVIRONMENT, 'environment'),
                texture.id
            );
        });
    }

    deleteEnvironment(args) {
        this.#command(() => this.engine.environments.delete(this.#name(args.ENVIRONMENT, 'environment')));
    }

    setSceneEnvironment(args) {
        this.#command(() => {
            const environment = this.engine.environments.require(this.#name(args.ENVIRONMENT, 'environment'));
            this.engine.activeScene.setEnvironment(environment.id);
            this.engine.invalidate();
        });
    }

    clearSceneEnvironment() {
        this.#command(() => {
            this.engine.activeScene.clearEnvironment();
            this.engine.invalidate();
        });
    }

    setEnvironmentIntensity(args) {
        this.#command(() => this.engine.environments.setIntensity(
            this.#name(args.ENVIRONMENT, 'environment'),
            finiteNumber(args.INTENSITY, 1)
        ));
    }

    setEnvironmentRotation(args) {
        this.#command(() => this.engine.environments.setRotation(
            this.#name(args.ENVIRONMENT, 'environment'),
            finiteNumber(args.ROTATION) * DEGREES_TO_RADIANS
        ));
    }

    setEnvironmentBackground(args) {
        this.#command(() => this.engine.environments.setBackgroundEnabled(
            this.#name(args.ENVIRONMENT, 'environment'),
            parseToggle(args.ENABLED)
        ));
    }

    environmentExists(args) {
        const name = normalizeName(args.ENVIRONMENT);
        return Boolean(name && this.engine.environments.has(name));
    }

    environmentState(args) {
        return this.#report(() => {
            const environment = this.engine.environments.require(this.#name(args.ENVIRONMENT, 'environment'));
            return this.engine.textures.resourceForId(environment.sourceTextureId)?.state ?? 'missing';
        }, 'missing');
    }

    activeEnvironment() {
        return this.#report(() => this.engine.activeScene.environment?.name ?? '', '');
    }

    environmentUsers(args) {
        return this.#report(() => this.engine.environments.require(
            this.#name(args.ENVIRONMENT, 'environment')
        ).references, 0);
    }

    environmentIntensity(args) {
        return this.#report(() => this.engine.environments.require(
            this.#name(args.ENVIRONMENT, 'environment')
        ).intensity, 0);
    }

    environmentRotation(args) {
        return this.#report(() => this.engine.environments.require(
            this.#name(args.ENVIRONMENT, 'environment')
        ).rotation / DEGREES_TO_RADIANS, 0);
    }

    environmentBackgroundEnabled(args) {
        return this.#report(() => this.engine.environments.require(
            this.#name(args.ENVIRONMENT, 'environment')
        ).backgroundEnabled, false);
    }

    environmentPreprocessTime() {
        return this.engine.profiler.environmentPreprocessTime;
    }

    environmentPreprocesses() {
        return this.engine.profiler.environmentPreprocesses;
    }

    environmentResources() {
        return this.engine.profiler.environmentResources;
    }

    environmentIblDrawCalls() {
        return this.engine.profiler.environmentIblDrawCalls;
    }

    environmentBackgroundDrawCalls() {
        return this.engine.profiler.environmentBackgroundDrawCalls;
    }

    createGeneratedTexture(args) {
        this.#command(() => {
            this.engine.textures.createGenerated(
                this.#name(args.TEXTURE, 'texture'),
                String(args.PRESET),
                parseColorBytes(args.PRIMARY),
                parseColorBytes(args.SECONDARY),
                positiveInteger(args.SIZE, 64, 1024)
            );
        });
    }

    loadTextureFromSource(args) {
        return this.#asyncCommand(async () => {
            const name = this.#name(args.TEXTURE, 'texture');
            const source = String(args.SOURCE).trim();
            const resource = this.engine.textures.load(
                name,
                `url:${source}`,
                signal => loadImageURL(this.Scratch, source, signal)
            );
            await this.engine.textures.waitUntilReady(resource);
        });
    }

    loadTextureFromCostume(args, util) {
        return this.#asyncCommand(async () => {
            const name = this.#name(args.TEXTURE, 'texture');
            const costumeName = this.#name(args.COSTUME, 'costume');
            const source = getCostumeSource(this.Scratch, util.target, costumeName);
            const resource = this.engine.textures.load(name, source.key, source.load);
            await this.engine.textures.waitUntilReady(resource);
        });
    }

    loadTextureFromFile(args) {
        return this.#asyncCommand(async isCurrent => {
            const name = this.#name(args.TEXTURE, 'texture');
            const file = await chooseLocalImageFile();
            if (!isCurrent()) return;
            const source = getLocalFileSource(file);
            const resource = this.engine.textures.load(name, source.key, source.load);
            await this.engine.textures.waitUntilReady(resource);
        });
    }

    deleteTexture(args) {
        this.#command(() => this.engine.textures.delete(this.#name(args.TEXTURE, 'texture')));
    }

    setResourceTexture(args) {
        this.#command(() => {
            const resourceName = this.#name(args.RESOURCE, 'resource');
            const textureName = normalizeName(args.TEXTURE);
            const textureId = textureName ? this.engine.textures.require(textureName).id : -1;
            this.engine.activeScene.setResourceTexture(resourceName, textureId);
            this.engine.invalidate();
        });
    }

    setTextureOption(args) {
        this.#command(() => this.engine.textures.setOption(
            this.#name(args.TEXTURE, 'texture'),
            String(args.OPTION),
            args.VALUE
        ));
    }

    setTextureUV(args) {
        this.#command(() => this.engine.textures.setUV(
            this.#name(args.TEXTURE, 'texture'),
            finiteNumber(args.OFFSET_X),
            finiteNumber(args.OFFSET_Y),
            finiteNumber(args.REPEAT_X, 1),
            finiteNumber(args.REPEAT_Y, 1),
            finiteNumber(args.ROTATION) * DEGREES_TO_RADIANS
        ));
    }

    textureExists(args) {
        const name = normalizeName(args.TEXTURE);
        return Boolean(name && this.engine.textures.has(name));
    }

    textureState(args) {
        return this.#report(() => this.engine.textures.require(this.#name(args.TEXTURE, 'texture')).state, 'missing');
    }

    textureError(args) {
        return this.#report(() => this.engine.textures.require(this.#name(args.TEXTURE, 'texture')).error, '');
    }

    textureWidth(args) { return this.textureDimension({TEXTURE: args.TEXTURE, DIMENSION: 'width'}); }

    textureHeight(args) { return this.textureDimension({TEXTURE: args.TEXTURE, DIMENSION: 'height'}); }

    textureUsers(args) {
        return this.#report(() => this.engine.textures.require(this.#name(args.TEXTURE, 'texture')).references, 0);
    }

    setRaycastBackface(args) {
        this.#command(() => this.engine.activeScene.raycaster.setBackfacePolicy(args.POLICY));
    }

    castWorldRay(args) {
        this.#command(() => this.engine.activeScene.raycaster.cast(
            finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z),
            finiteNumber(args.DX), finiteNumber(args.DY), finiteNumber(args.DZ),
            Math.max(0, finiteNumber(args.DISTANCE, 1000)), String(args.FILTER ?? 'all')
        ));
    }

    castStageRay(args) {
        this.#command(() => {
            const size = this.#stageSize();
            this.engine.activeScene.raycaster.castFromCamera(
                finiteNumber(args.X), finiteNumber(args.Y), size[0], size[1],
                this.#cameraName(args.CAMERA), Math.max(0, finiteNumber(args.DISTANCE, 1000)),
                String(args.FILTER ?? 'all')
            );
        });
    }

    castCameraForwardRay(args) {
        this.#command(() => {
            const size = this.#stageSize();
            this.engine.activeScene.raycaster.castFromCamera(
                0, 0, size[0], size[1], this.#cameraName(args.CAMERA),
                Math.max(0, finiteNumber(args.DISTANCE, 1000)), String(args.FILTER ?? 'all')
            );
        });
    }

    rayHit() { return this.engine.scenes.active?.raycaster.result.hit ?? false; }

    rayHitValue(args) { return this.#report(() => this.#rayHitField(args.FIELD), 0); }

    #rayHitField(field) {
        const hit = this.engine.activeScene.raycaster.result;
        switch (String(field).trim().toLowerCase()) {
        case 'object': return hit.name;
        case 'kind': return hit.kind;
        case 'node': return hit.nodeName;
        case 'precision': return hit.precision;
        case 'distance': return hit.distance;
        case 'x': return hit.x;
        case 'y': return hit.y;
        case 'z': return hit.z;
        case 'normal x': return hit.normalX;
        case 'normal y': return hit.normalY;
        case 'normal z': return hit.normalZ;
        case 'triangle': return hit.triangleIndex < 0 ? 0 : hit.triangleIndex + 1;
        case 'primitive': return hit.primitiveIndex < 0 ? 0 : hit.primitiveIndex + 1;
        case 'geometry id': return hit.geometryId;
        case 'material': return hit.materialName;
        default: throw new Error(`Unknown ray result field "${field}"`);
        }
    }

    raycastCount() { return this.engine.profiler.raycasts; }
    raycastBroadPhaseCandidates() { return this.engine.profiler.raycastBroadPhaseCandidates; }
    raycastBoundsTests() { return this.engine.profiler.raycastBoundsTests; }
    raycastTriangleTests() { return this.engine.profiler.raycastTriangleTests; }
    raycastHits() { return this.engine.profiler.raycastHits; }
    raycastTime() { return this.engine.profiler.raycastTime; }

    worldToStageValue(args) {
        return this.#report(() => {
            const result = this.#worldToStage(args);
            switch (String(args.VALUE).trim().toLowerCase()) {
            case 'stage x': return result.x;
            case 'stage y': return result.y;
            case 'depth': return result.depth;
            case 'ndc x': return result.ndcX;
            case 'ndc y': return result.ndcY;
            case 'ndc z': return result.ndcZ;
            default: throw new Error(`Unknown coordinate value "${args.VALUE}"`);
            }
        }, 0);
    }

    worldPointInFront(args) { return this.#report(() => this.#worldToStage(args).inFront, false); }
    worldPointVisible(args) { return this.#report(() => this.#worldToStage(args).visible, false); }

    stageRayDirection(args) {
        return this.#report(() => {
            const scene = this.engine.activeScene;
            const size = this.#stageSize();
            const cameraId = scene.requireCamera(this.#cameraName(args.CAMERA));
            scene.cameraMatrices(cameraId, size[0], size[1]).stageToRay(
                finiteNumber(args.X), finiteNumber(args.Y), size[0], size[1], this.stageRayResult
            );
            return this.stageRayResult.direction[this.#axisIndex(args.AXIS)];
        }, 0);
    }

    lookCameraAt(args) {
        this.#command(() => {
            this.engine.activeScene.lookResourceAt(
                this.#cameraName(args.CAMERA), finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z)
            );
            this.engine.invalidate();
        });
    }

    setCameraFov(args) { this.#setCameraProjectionComponent(args, 'fov', finiteNumber(args.FOV, 60)); }
    changeCameraFov(args) { this.#setCameraProjectionComponent(args, 'fov-delta', finiteNumber(args.AMOUNT)); }
    setCameraNearClip(args) { return this.setCameraClip({CAMERA: args.CAMERA, PLANE: 'near', DISTANCE: args.DISTANCE}); }
    setCameraFarClip(args) { return this.setCameraClip({CAMERA: args.CAMERA, PLANE: 'far', DISTANCE: args.DISTANCE}); }

    moveCameraLocal(args) {
        this.#command(() => {
            this.engine.activeScene.moveResourceLocal(
                this.#cameraName(args.CAMERA), String(args.BASIS), finiteNumber(args.DISTANCE)
            );
            this.engine.invalidate();
        });
    }

    rotateCamera(args) {
        this.#command(() => {
            const scene = this.engine.activeScene;
            const id = scene.requireCamera(this.#cameraName(args.CAMERA));
            const offset = id * 3;
            const rotation = scene.objects.rotation;
            const amount = finiteNumber(args.DEGREES) * DEGREES_TO_RADIANS;
            const axis = String(args.AXIS).trim().toLowerCase();
            if (axis !== 'yaw' && axis !== 'pitch') throw new Error(`Unknown camera rotation axis "${args.AXIS}"`);
            scene.setResourceRotation(
                scene.objects.namesById[id],
                apiNumber(rotation[offset] + (axis === 'pitch' ? amount : 0)),
                apiNumber(rotation[offset + 1] + (axis === 'yaw' ? amount : 0)),
                apiNumber(rotation[offset + 2])
            );
            this.engine.invalidate();
        });
    }

    cameraBasisComponent(args) {
        return this.#report(() => this.engine.activeScene.resourceBasis(
            this.#cameraName(args.CAMERA)
        )[String(args.BASIS).trim().toLowerCase()][this.#axisIndex(args.AXIS)], 0);
    }

    moveObjectLocal(args) {
        this.#command(() => {
            this.engine.activeScene.moveResourceLocal(
                this.#name(args.NAME, 'resource'), String(args.BASIS), finiteNumber(args.DISTANCE)
            );
            this.engine.invalidate();
        });
    }

    objectBasisComponent(args) {
        return this.#report(() => this.engine.activeScene.resourceBasis(
            this.#name(args.NAME, 'resource')
        )[String(args.BASIS).trim().toLowerCase()][this.#axisIndex(args.AXIS)], 0);
    }

    distance3D(args) {
        return distance3(args.AX, args.AY, args.AZ, args.BX, args.BY, args.BZ);
    }

    vectorLength3D(args) { return vectorLength(args.X, args.Y, args.Z); }
    dotProduct3D(args) { return dot3(args.AX, args.AY, args.AZ, args.BX, args.BY, args.BZ); }

    crossProduct3D(args) {
        cross3(this.vectorResult, args.AX, args.AY, args.AZ, args.BX, args.BY, args.BZ);
        return this.vectorResult[this.#axisIndex(args.AXIS)];
    }

    vectorNormalizedComponent(args) {
        normalizeVector(this.vectorResult, args.X, args.Y, args.Z);
        return this.vectorResult[this.#axisIndex(args.AXIS)];
    }

    directionComponent3D(args) {
        direction3(this.vectorResult, args.AX, args.AY, args.AZ, args.BX, args.BY, args.BZ);
        return this.vectorResult[this.#axisIndex(args.AXIS)];
    }

    angleBetweenVectors(args) {
        return angleBetween3(args.AX, args.AY, args.AZ, args.BX, args.BY, args.BZ);
    }

    lerpNumber(args) { return lerp(args.START, args.END, args.AMOUNT); }
    clampNumber(args) { return clampVectorValue(args.VALUE, args.MINIMUM, args.MAXIMUM); }

    tweenResourcePosition(args) {
        this.#startTween(args.NAME, TweenProperty.POSITION, [args.X, args.Y, args.Z], args);
    }

    tweenResourceRotation(args) {
        this.#startTween(args.NAME, TweenProperty.ROTATION, [
            finiteNumber(args.X) * DEGREES_TO_RADIANS,
            finiteNumber(args.Y) * DEGREES_TO_RADIANS,
            finiteNumber(args.Z) * DEGREES_TO_RADIANS
        ], args);
    }

    tweenResourceScale(args) {
        this.#startTween(args.NAME, TweenProperty.SCALE, [args.X, args.Y, args.Z], args);
    }

    tweenCameraFov(args) {
        this.#command(() => {
            this.engine.activeScene.tweens.start(
                this.#cameraName(args.CAMERA), TweenProperty.FOV, [finiteNumber(args.FOV, 60)],
                finiteNumber(args.SECONDS), String(args.EASING)
            );
            this.engine.invalidate();
        });
    }

    pauseTween(args) { this.#tweenCommand(args.NAME, tweens => tweens.pause(this.#name(args.NAME, 'tween target'))); }
    resumeTween(args) { this.#tweenCommand(args.NAME, tweens => tweens.resume(this.#name(args.NAME, 'tween target'))); }
    stopTween(args) { this.#tweenCommand(args.NAME, tweens => tweens.stop(this.#name(args.NAME, 'tween target'))); }
    tweenActive(args) { return this.#report(() => this.engine.activeScene.tweens.active(this.#name(args.NAME, 'tween target')), false); }
    activeTweens() { return this.engine.profiler.activeTweens; }
    tweenUpdates() { return this.engine.profiler.tweenUpdates; }
    completedTweens() { return this.engine.profiler.completedTweens; }
    tweenUpdateTime() { return this.engine.profiler.tweenUpdateTime; }

    createTerrain(args) {
        this.#command(() => {
            this.engine.activeScene.createTerrain(
                this.#name(args.NAME, 'terrain'),
                finiteNumber(args.WIDTH, 20), finiteNumber(args.DEPTH, 20),
                positiveInteger(args.X_SEGMENTS, 16, 256), positiveInteger(args.Z_SEGMENTS, 16, 256)
            );
            this.engine.invalidate();
        });
    }

    deleteTerrain(args) { this.#deleteTypedResource(args.NAME, 'terrain', name => this.engine.activeScene.terrains.resources.has(name)); }

    setTerrainHeight(args) {
        this.#command(() => {
            this.engine.activeScene.terrains.require(this.#name(args.NAME, 'terrain')).setHeight(
                finiteNumber(args.X), finiteNumber(args.Z), finiteNumber(args.HEIGHT)
            );
            this.engine.invalidate();
        });
    }

    setTerrainFlat(args) {
        this.#command(() => {
            this.engine.activeScene.terrains.require(this.#name(args.NAME, 'terrain')).setFlat(finiteNumber(args.HEIGHT));
            this.engine.invalidate();
        });
    }

    generateTerrainHills(args) {
        this.#command(() => {
            this.engine.activeScene.terrains.require(this.#name(args.NAME, 'terrain')).generateHills(
                finiteNumber(args.AMPLITUDE, 2), finiteNumber(args.FREQUENCY, 2), finiteNumber(args.SEED, 1)
            );
            this.engine.invalidate();
        });
    }

    setTerrainMaterial(args) {
        this.#command(() => {
            const material = this.engine.materials.require(this.#name(args.MATERIAL, 'material'));
            this.engine.activeScene.terrains.setMaterial(this.#name(args.NAME, 'terrain'), material.id);
            this.engine.invalidate();
        });
    }

    terrainHeightAt(args) {
        return this.#report(() => this.engine.activeScene.terrains.require(
            this.#name(args.NAME, 'terrain')
        ).heightAtWorld(finiteNumber(args.X), finiteNumber(args.Z)), 0);
    }

    terrainNormalAt(args) {
        return this.#report(() => this.engine.activeScene.terrains.require(
            this.#name(args.NAME, 'terrain')
        ).normalAtWorld(finiteNumber(args.X), finiteNumber(args.Z))[this.#axisIndex(args.AXIS)], 0);
    }

    terrainCount() { return this.engine.profiler.terrainCount; }
    terrainTriangles() { return this.engine.profiler.terrainTriangles; }
    terrainGeometryBuilds() { return this.engine.profiler.terrainGeometryBuilds; }
    terrainGpuUploads() { return this.engine.profiler.terrainGpuUploads; }
    terrainGpuUploadBytes() { return this.engine.profiler.terrainGpuUploadBytes; }
    visibleTerrainChunks() { return this.engine.profiler.visibleTerrainChunks; }
    culledTerrainChunks() { return this.engine.profiler.culledTerrainChunks; }

    create3DText(args) {
        this.#command(() => {
            this.engine.activeScene.createText(this.#name(args.NAME, '3D text'), String(args.TEXT ?? ''), {
                fontFamily: String(args.FONT),
                fontSize: finiteNumber(args.FONT_SIZE, 64),
                resolution: finiteNumber(args.RESOLUTION, 1),
                worldHeight: finiteNumber(args.HEIGHT, 1),
                billboardMode: String(args.MODE)
            });
            this.engine.invalidate();
        });
    }

    set3DText(args) { this.#textCommand(args.NAME, (texts, name) => texts.setText(name, String(args.TEXT ?? ''))); }
    set3DTextPosition(args) {
        this.#textEffectCommand(args.NAME, effect => effect.setPosition(
            apiNumber(args.X), apiNumber(args.Y), apiNumber(args.Z)
        ));
    }
    set3DTextSize(args) { this.#textCommand(args.NAME, (texts, name) => texts.setSize(name, args.WIDTH, args.HEIGHT)); }
    set3DTextBillboard(args) { this.#textEffectCommand(args.NAME, effect => effect.setBillboardMode(args.MODE)); }
    set3DTextPivot(args) { this.#textEffectCommand(args.NAME, effect => effect.setNamedPivot(args.PIVOT)); }
    set3DTextColor(args) { this.#textCommand(args.NAME, (texts, name) => texts.setStyle(name, {color: parseColorBytes(args.COLOR)})); }
    set3DTextFont(args) { this.#textCommand(args.NAME, (texts, name) => texts.setStyle(name, {fontFamily: String(args.FONT), fontSize: finiteNumber(args.SIZE, 64)})); }
    set3DTextAlignment(args) { this.#textCommand(args.NAME, (texts, name) => texts.setStyle(name, {alignment: String(args.ALIGNMENT)})); }
    set3DTextResolution(args) { this.#textCommand(args.NAME, (texts, name) => texts.setStyle(name, {resolution: finiteNumber(args.RESOLUTION, 1)})); }

    set3DTextBackground(args) {
        this.#textCommand(args.NAME, (texts, name) => {
            const background = parseColorBytes(args.COLOR);
            background[3] = Math.round(clamp(finiteNumber(args.OPACITY, 0), 0, 100) * 2.55);
            texts.setStyle(name, {background});
        });
    }

    delete3DText(args) { this.#deleteTypedResource(args.NAME, '3D text', name => this.engine.activeScene.texts.labels.has(name)); }
    textLabelCount() { return this.engine.profiler.textLabels; }
    textRasterizations() { return this.engine.profiler.textRasterizations; }
    textTextureUploads() { return this.engine.profiler.textTextureUploads; }
    sharedTextTextures() { return this.engine.profiler.sharedTextTextures; }
    renderedTextInstances() { return this.engine.profiler.renderedTextInstances; }
    textDrawCalls() { return this.engine.profiler.textDrawCalls; }

    lastError() {
        return this.engine.lastError;
    }

    clearError() {
        this.engine.clearError();
    }

    version() {
        return `${ENGINE_VERSION} (block API ${BLOCK_API_VERSION})`;
    }

    #command(action) {
        try {
            action();
            this.engine.clearError();
        } catch (error) {
            this.engine.setError(error);
        }
    }

    async #asyncCommand(action) {
        const generation = this.engine.generation;
        const runGeneration = this.engine.runGeneration;
        const isCurrent = () => this.engine.generation === generation && this.engine.runGeneration === runGeneration;
        try {
            await action(isCurrent);
            if (isCurrent()) this.engine.clearError();
        } catch (error) {
            // don't let an old load replace the new project's error
            if (isCurrent()) this.engine.setError(error);
        }
    }

    #report(action, fallback) {
        try {
            return action();
        } catch (error) {
            this.engine.setError(error);
            return fallback;
        }
    }

    #setLightShadowSetting(args, setting, value) {
        this.#command(() => {
            this.engine.activeScene.setLightShadowSetting(
                this.#name(args.LIGHT, 'light'),
                setting,
                value
            );
            this.engine.markRenderQualityCustom();
            this.engine.invalidate();
        });
    }

    /** @param {unknown} value @param {string | null} [kind] */
    #effect(value, kind = null) {
        const name = this.#name(value, 'effect resource');
        return this.engine.activeScene.effects.require(name, kind);
    }

    #effectCommand(value, action) {
        this.#command(() => {
            action(this.#effect(value));
            this.engine.invalidate();
        });
    }

    #name(value, type) {
        const name = normalizeName(value);
        if (!name) throw new Error(`${type} name cannot be empty`);
        return name;
    }

    #modelInstance(value) {
        const name = this.#name(value, 'model instance');
        const instance = this.engine.activeScene.modelInstances.get(name);
        if (!instance) throw new Error(`Unknown model instance "${name}"`);
        return instance;
    }

    #stageSize() {
        const size = this.bridge?.renderer?.getNativeSize?.();
        return size && typeof size.length === 'number' && size.length >= 2 ? size : this.defaultStageSize;
    }

    #cameraName(value) {
        const requested = normalizeName(value);
        if (requested) return requested;
        const scene = this.engine.activeScene;
        if (scene.activeCameraId === null) throw new Error('Create and activate a camera first');
        return scene.objects.namesById[scene.activeCameraId];
    }

    #axisIndex(value) {
        const axis = String(value).trim().toLowerCase();
        if (axis === 'x') return 0;
        if (axis === 'y') return 1;
        if (axis === 'z') return 2;
        throw new Error(`Unknown vector axis "${value}"`);
    }

    #colorIndex(value) {
        const component = String(value).trim().toLowerCase();
        const index = ['red', 'green', 'blue', 'alpha'].indexOf(component);
        if (index < 0) throw new Error(`Unknown color component "${value}"`);
        return index;
    }

    #oneBasedIndex(value, count, label) {
        const oneBased = Math.floor(apiNumber(value));
        if (oneBased < 1 || oneBased > count) throw new Error(`${label} index must be from 1 to ${count}`);
        return oneBased - 1;
    }

    #customUniform(materialValue, uniformValue) {
        const material = this.engine.materials.require(this.#name(materialValue, 'material'));
        const name = String(uniformValue).trim();
        const field = material.customUniforms?.find(candidate => candidate.name === name);
        if (!field) throw new Error(`Unknown custom uniform "${name}" on material "${material.name}"`);
        return field;
    }

    #worldToStage(args) {
        const scene = this.engine.activeScene;
        const size = this.#stageSize();
        const cameraId = scene.requireCamera(this.#cameraName(args.CAMERA));
        return scene.cameraMatrices(cameraId, size[0], size[1]).worldToStage(
            finiteNumber(args.X), finiteNumber(args.Y), finiteNumber(args.Z), size[0], size[1], this.worldStageResult
        );
    }

    #setCameraProjectionComponent(args, component, value) {
        this.#command(() => {
            if (!['fov', 'fov-delta', 'near', 'far'].includes(component)) throw new Error('Unknown camera projection component "' + component + '"');
            const scene = this.engine.activeScene;
            const name = this.#cameraName(args.CAMERA);
            const id = scene.requireCamera(name);
            const offset = id * 3;
            const camera = scene.objects.camera;
            const fov = component === 'fov' ? value : component === 'fov-delta' ? camera[offset] + value : camera[offset];
            const near = component === 'near' ? value : camera[offset + 1];
            const far = component === 'far' ? value : camera[offset + 2];
            scene.setCameraProjection(name, fov, near, far);
            this.engine.invalidate();
        });
    }

    #startTween(value, property, destination, args) {
        this.#command(() => {
            const values = destination.map(item => transformNumber(item));
            this.engine.activeScene.tweens.start(
                this.#name(value, 'tween target'), property, values,
                finiteNumber(args.SECONDS), String(args.EASING)
            );
            this.engine.invalidate();
        });
    }

    #tweenCommand(value, action) {
        this.#command(() => {
            void value;
            action(this.engine.activeScene.tweens);
            this.engine.invalidate();
        });
    }

    #deleteTypedResource(value, type, predicate) {
        this.#command(() => {
            const name = this.#name(value, type);
            if (!predicate(name)) throw new Error(`Unknown ${type} "${name}"`);
            this.engine.activeScene.deleteResource(name);
            this.engine.invalidate();
        });
    }

    #textCommand(value, action) {
        this.#command(() => {
            const texts = this.engine.activeScene.texts;
            const name = this.#name(value, '3D text');
            texts.require(name);
            action(texts, name);
            this.engine.invalidate();
        });
    }

    #textEffectCommand(value, action) {
        this.#textCommand(value, (texts, name) => action(texts.require(name).effect));
    }
}
