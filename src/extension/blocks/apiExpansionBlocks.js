import {propertyFamily, familyBlocks, familyMenus} from './propertyFamilies.js';
import {MaterialType, PBR_MAP_PROPERTIES} from '../../materials/MaterialStore.js';

const degrees = value => value * 180 / Math.PI;
const named = (argument, defaultValue) => ({argument, defaultValue});
const required = (value, kind, name) => {
    if (!value) throw new Error(`Unknown ${kind} "${name}"`);
    return value;
};
const material = (engine, name) => engine.materials.require(name);
const texture = (engine, name) => engine.textures.require(name);
const effect = (engine, name) => engine.activeScene.effects.require(name);
const body = (engine, name) => required(engine.activeScene.physics?.resources.get(name), 'physics body', name);
const source = (engine, name) => required(engine.activeScene.audio?.resources.get(name), 'audio source', name);
const model = (engine, name) => required(engine.activeScene.modelInstances.get(name), 'model instance', name);
const textureName = (engine, id) => engine.textures.resourceForId(id)?.name ?? '';
const pbr = (resource, value) => {
    if (resource.type !== 'pbr') throw new Error('This property requires a PBR material');
    return value;
};
const linearToSrgb = value => value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
const colorText = (value, linear = true) => `#${[0, 1, 2].map(index => Math.round(
    Math.min(1, Math.max(0, linear ? linearToSrgb(value[index]) : value[index])) * 255
).toString(16).padStart(2, '0')).join('')}`;
const directionalLight = (engine, name) => {
    const scene = engine.activeScene;
    const id = scene.objects.requireId(name);
    if (scene.resourceKind(name) !== 'directional light') throw new Error(`Resource "${name}" is not a directional light`);
    return {scene, objects: scene.objects, id};
};
const localLight = (engine, name) => engine.activeScene.requireLocalLight(name);
const group = (engine, name) => required(engine.activeScene.instanceGroups.get(name), 'instance group', name);
const customShader = (engine, name) => required(engine.materials.customShaders?.resources.get(name), 'custom shader', name);
const audioAsset = (engine, name) => required(engine.audio?.assets.get(name), 'audio asset', name);
const tweenRecord = (owner, property) => required(
    owner.store.records.get(`${owner.name}\u0000${property}`), `${property} tween`, owner.name
);
const pbrTexture = (materialResource, engine, property) => textureName(
    engine,
    pbr(materialResource, materialResource[PBR_MAP_PROPERTIES[property]])
);

// Each family has one resource namespace and one result type. These are CPU
// reads of existing state, not a renderer snapshot or a per-frame observer.
export const API_FAMILIES = [
    propertyFamily('sceneText', 'string', 'scene [PROPERTY] text', null, engine => engine.activeScene, {
        name: scene => scene.name,
        'active camera': scene => scene.activeCameraId === null ? '' : scene.objects.namesById[scene.activeCameraId],
        environment: scene => scene.environment?.name ?? '',
        'background color': scene => colorText(scene.background, false),
        'ambient color': scene => colorText(scene.ambientColor)
    }),
    propertyFamily('sceneNumber', 'number', 'scene [PROPERTY] number', null, engine => engine.activeScene, {
        'background opacity %': scene => scene.background[3] * 100,
        'ambient intensity': scene => scene.ambientIntensity,
        'render resources': scene => scene.objects.count + scene.instanceGroups.size + scene.modelInstances.size +
            scene.terrains.resources.size + scene.effects.resources.size,
        'instance groups': scene => scene.instanceGroups.size,
        'model instances': scene => scene.modelInstances.size,
        effects: scene => scene.effects.resources.size,
        'local lights': scene => scene.localLightIds.size,
        'physics bodies': scene => scene.physics?.resources.size ?? 0,
        'audio sources': scene => scene.audio?.resources.size ?? 0
    }),
    propertyFamily('cameraNumber', 'number', 'camera [CAMERA] [PROPERTY] number', named('CAMERA', 'main'),
        (engine, name) => ({scene: engine.activeScene, id: engine.activeScene.requireCamera(name)}), {
            'fov degrees': ({scene, id}) => scene.objects.camera[id * 3],
            'near clip': ({scene, id}) => scene.objects.camera[id * 3 + 1],
            'far clip': ({scene, id}) => scene.objects.camera[id * 3 + 2]
        }),
    propertyFamily('materialNumber', 'number', 'material [MATERIAL] [PROPERTY] number', named('MATERIAL', 'material'), material, {
        'opacity %': m => m.opacity * 100,
        'alpha cutoff %': m => m.alphaCutoff * 100,
        'emissive intensity': m => m.emissiveIntensity,
        'normal strength': m => pbr(m, m.normalScale),
        'ao strength': m => pbr(m, m.aoStrength),
        'render order': m => m.renderOrder,
        'polygon offset factor': m => m.polygonOffsetFactor,
        'polygon offset units': m => m.polygonOffsetUnits,
        'environment intensity': m => pbr(m, m.environmentIntensity),
        'environment rotation degrees': m => pbr(m, degrees(m.environmentRotation))
    }),
    propertyFamily('materialText', 'string', 'material [MATERIAL] [PROPERTY] text', named('MATERIAL', 'material'), material, {
        side: m => m.side,
        'alpha mode': m => m.alphaMode,
        blend: m => m.alphaMode === 'blend' ? m.blendMode : 'opaque',
        shader: m => m.customShader?.name ?? '',
        'base color': m => colorText(m.baseColor, m.type === MaterialType.PBR),
        'emissive color': m => colorText(m.emissiveColor, m.type === MaterialType.PBR),
        'base texture': (m, engine) => textureName(engine, m.textureId),
        'normal texture': (m, engine) => pbrTexture(m, engine, 'normal'),
        'metallic texture': (m, engine) => pbrTexture(m, engine, 'metallic'),
        'roughness texture': (m, engine) => pbrTexture(m, engine, 'roughness'),
        'metallic roughness texture': (m, engine) => pbrTexture(m, engine, 'metallic-roughness'),
        'emissive texture': (m, engine) => pbrTexture(m, engine, 'emissive'),
        'ambient occlusion texture': (m, engine) => pbrTexture(m, engine, 'ambient-occlusion')
    }),
    propertyFamily('materialBoolean', 'boolean', 'material [MATERIAL] [PROPERTY] ?', named('MATERIAL', 'material'), material, {
        'depth test': m => m.depthTest,
        'depth write': m => m.depthWrite,
        'double sided': m => m.doubleSided
    }),
    propertyFamily('textureNumber', 'number', 'texture [TEXTURE] [PROPERTY] number', named('TEXTURE', 'texture'), texture, {
        anisotropy: t => t.settings.anisotropy,
        'offset u': t => t.uv[0], 'offset v': t => t.uv[1],
        'repeat u': t => t.uv[2], 'repeat v': t => t.uv[3],
        'rotation degrees': t => degrees(t.uv[4])
    }),
    propertyFamily('textureText', 'string', 'texture [TEXTURE] [PROPERTY] text', named('TEXTURE', 'texture'), texture, {
        'min filter': t => t.settings.minFilter, 'mag filter': t => t.settings.magFilter,
        'wrap u': t => t.settings.wrapU, 'wrap v': t => t.settings.wrapV,
        'color space': t => t.settings.colorSpace
    }),
    propertyFamily('textureBoolean', 'boolean', 'texture [TEXTURE] [PROPERTY] ?', named('TEXTURE', 'texture'), texture, {
        mipmaps: t => t.settings.mipmaps, 'flip y': t => t.settings.flipY
    }),
    propertyFamily('instanceGroupNumber', 'number', 'instance group [GROUP] [PROPERTY] number', named('GROUP', 'cubes'), group, {
        members: value => value.count
    }),
    propertyFamily('directionalLightNumber', 'number', 'directional light [LIGHT] [PROPERTY] number', named('LIGHT', 'sun'),
        directionalLight, {
            intensity: ({objects, id}) => objects.intensity[id],
            'shadow map size': ({objects, id}) => objects.shadowMapSize[id],
            'shadow bias': ({objects, id}) => objects.shadowBias[id],
            'shadow normal bias': ({objects, id}) => objects.shadowNormalBias[id],
            'shadow distance': ({objects, id}) => objects.shadowDistance[id],
            'shadow near': ({objects, id}) => objects.shadowNear[id],
            'shadow far': ({objects, id}) => objects.shadowFar[id],
            'shadow bounds': ({objects, id}) => objects.shadowBounds[id]
        }),
    propertyFamily('directionalLightText', 'string', 'directional light [LIGHT] [PROPERTY] text', named('LIGHT', 'sun'),
        directionalLight, {
            color: ({objects, id}) => colorText(objects.color.subarray(id * 4, id * 4 + 3)),
            'shadow filter': ({objects, id}) => ['hard', 'pcf-4', 'pcf-9'][objects.shadowFilter[id]] ?? ''
        }),
    propertyFamily('directionalLightBoolean', 'boolean', 'directional light [LIGHT] [PROPERTY] ?', named('LIGHT', 'sun'),
        directionalLight, {
            'casts shadows': ({objects, id}) => Boolean(objects.castsShadow[id])
        }),
    propertyFamily('localLightText', 'string', 'local light [LIGHT] [PROPERTY] text', named('LIGHT', 'lamp'), localLight, {
        color: light => colorText(light.color)
    }),
    propertyFamily('spotLightNumber', 'number', 'spot light [LIGHT] [PROPERTY] number', named('LIGHT', 'spot'), (engine, name) => {
        const light = engine.activeScene.requireLocalLight(name);
        if (light.type !== 'spot') throw new Error('This property requires a spot light');
        return light;
    }, {
        'inner angle degrees': l => l.innerAngle, 'outer angle degrees': l => l.outerAngle,
        'direction x': l => l.direction[0], 'direction y': l => l.direction[1], 'direction z': l => l.direction[2]
    }),
    propertyFamily('environmentText', 'string', 'environment [ENVIRONMENT] [PROPERTY] text', named('ENVIRONMENT', 'environment'),
        (engine, name) => engine.environments.require(name), {
            'source texture': (environment, engine) => textureName(engine, environment.sourceTextureId),
            error: (environment, engine) => engine.textures.resourceForId(environment.sourceTextureId)?.error ?? ''
        }),
    propertyFamily('modelInfoNumber', 'number', 'model asset [MODEL] [PROPERTY] number', named('MODEL', 'model'),
        (engine, name) => engine.models.require(name), {
            skins: m => m.skins.length, 'morph targets (metadata only)': m => m.morphTargetCount,
            nodes: m => m.nodes.length, animations: m => m.animations.length, primitives: m => m.primitives.length,
            scenes: m => m.sceneCount, users: m => m.references, 'cpu bytes': m => m.cpuBytes
        }),
    propertyFamily('modelInstanceText', 'string', 'model instance [INSTANCE] [PROPERTY] text', named('INSTANCE', 'model1'), model, {
        'base asset': m => m.asset.name, 'active lod asset': m => m.activeRenderAsset.name,
        'current animation': m => m.currentClip?.name ?? '', 'lod group': m => m.lodGroup?.name ?? ''
    }),
    propertyFamily('modelInstanceNumber', 'number', 'model instance [INSTANCE] [PROPERTY] number', named('INSTANCE', 'model1'), model, {
        'selected animation': m => m.player.clipIndex + 1,
        'animation progress %': m => m.progress * 100,
        'transition progress %': m => m.player.transition ?
            (m.player.transition.duration > 0 ? m.player.transition.elapsed / m.player.transition.duration * 100 : 100) : 0,
        'lod hysteresis': m => m.lodHysteresis,
        'forced lod level': m => m.forcedLodLevel + 1,
        'active lod level': m => m.currentLodLevel + 1
    }),
    propertyFamily('modelInstanceBoolean', 'boolean', 'model instance [INSTANCE] [PROPERTY] ?', named('INSTANCE', 'model1'), model, {
        'animation looping': m => m.player.looping, 'lod enabled': m => m.lodEnabled,
        'lod assigned': m => m.lodGroup !== null, 'transition active': m => m.player.transition !== null
    }),
    propertyFamily('effectNumber', 'number', 'effect [RESOURCE] [PROPERTY] number', named('RESOURCE', 'sprite'), effect, {
        width: e => e.size[0], height: e => e.size[1],
        'pivot x': e => e.pivot[0], 'pivot y': e => e.pivot[1],
        'opacity %': e => e.tint[3] * 100, brightness: e => e.brightness,
        'alpha cutoff %': e => e.alphaCutoff * 100,
        'sheet columns': e => e.sheetColumns, 'sheet rows': e => e.sheetRows,
        'frame': e => e.frame + 1, 'rendered frame': e => e.renderedFrame + 1,
        'animation first frame': e => e.animationFirstFrame + 1,
        'animation last frame': e => e.animationLastFrame + 1,
        'animation fps': e => e.animationFps, 'animation time': e => e.animationTime,
        'directional views': e => e.directionalCount, 'facing degrees': e => degrees(e.facingAngle),
        'roll degrees': e => degrees(e.roll)
    }),
    propertyFamily('setEffectNumber', 'command', 'set effect [RESOURCE] [PROPERTY] to [VALUE]', named('RESOURCE', 'sprite'), effect, {
        'opacity %': (e, engine, value) => { e.setOpacity(value / 100); engine.invalidate(); },
        brightness: (e, engine, value) => { e.setBrightness(value); engine.invalidate(); }
    }),
    propertyFamily('effectText', 'string', 'effect [RESOURCE] [PROPERTY] text', named('RESOURCE', 'sprite'), effect, {
        'alpha mode': e => e.alphaMode, lighting: e => e.lighting,
        texture: (e, engine) => textureName(engine, e.textureId), 'billboard mode': e => e.billboardMode
    }),
    propertyFamily('effectBoolean', 'boolean', 'effect [RESOURCE] [PROPERTY] ?', named('RESOURCE', 'sprite'), effect, {
        'depth test': e => e.depthTest, 'depth write': e => e.depthWrite,
        'frame animation playing': e => e.animationPlaying,
        'frame animation paused': e => e.animationPaused,
        'frame animation looping': e => e.animationLoop,
        'frustum culling': e => e.frustumCulling
    }),
    propertyFamily('particleNumber', 'number', 'emitter [RESOURCE] [PROPERTY] number', named('RESOURCE', 'particles'),
        (engine, name) => engine.activeScene.effects.require(name, 'particle-emitter'), {
            capacity: e => e.maximumParticles, 'emission rate': e => e.emissionRate,
            'minimum lifetime': e => e.lifetimeRange[0], 'maximum lifetime': e => e.lifetimeRange[1],
            'spread x': e => e.velocitySpread[0], 'spread y': e => e.velocitySpread[1], 'spread z': e => e.velocitySpread[2],
            'spawn extent x': e => e.spawnExtents[0], 'spawn extent y': e => e.spawnExtents[1],
            'spawn extent z': e => e.spawnExtents[2],
            'velocity x': e => e.velocity[0], 'velocity y': e => e.velocity[1], 'velocity z': e => e.velocity[2],
            'acceleration x': e => e.acceleration[0], 'acceleration y': e => e.acceleration[1],
            'acceleration z': e => e.acceleration[2],
            'start size': e => e.sizeRange[0], 'end size': e => e.sizeRange[1],
            'start alpha %': e => e.alphaRange[0] * 100, 'end alpha %': e => e.alphaRange[1] * 100,
            'minimum rotation degrees': e => degrees(e.rotationRange[0]),
            'maximum rotation degrees': e => degrees(e.rotationRange[1]),
            'minimum angular speed degrees': e => degrees(e.angularVelocityRange[0]),
            'maximum angular speed degrees': e => degrees(e.angularVelocityRange[1]),
            'particle frame rate': e => e.particleFrameRate, 'active particles': e => e.activeCount
        }),
    propertyFamily('particleText', 'string', 'emitter [RESOURCE] [PROPERTY] text', named('RESOURCE', 'particles'),
        (engine, name) => engine.activeScene.effects.require(name, 'particle-emitter'), {
            'spawn shape': e => e.spawnShape,
            'start color': e => colorText(e.startColor, false), 'end color': e => colorText(e.endColor, false)
        }),
    propertyFamily('particleBoolean', 'boolean', 'emitter [RESOURCE] [PROPERTY] ?', named('RESOURCE', 'particles'),
        (engine, name) => engine.activeScene.effects.require(name, 'particle-emitter'), {
            emitting: e => e.emitting, paused: e => e.paused
        }),
    propertyFamily('decalNumber', 'number', 'decal [RESOURCE] [PROPERTY] number', named('RESOURCE', 'decal'),
        (engine, name) => engine.activeScene.effects.require(name, 'decal'), {
            'surface offset': e => e.surfaceOffset, lifetime: e => e.lifetime, age: e => e.age,
            'normal x': e => e.normal[0], 'normal y': e => e.normal[1], 'normal z': e => e.normal[2]
        }),
    propertyFamily('decalBoolean', 'boolean', 'decal [RESOURCE] [PROPERTY] ?', named('RESOURCE', 'decal'),
        (engine, name) => engine.activeScene.effects.require(name, 'decal'), {
            expired: e => e.expired
        }),
    propertyFamily('postNumber', 'number', 'post [PROPERTY] number', null, engine => engine.post, {
        brightness: p => p.brightness, contrast: p => p.contrast, saturation: p => p.saturation,
        'bloom threshold': p => p.bloomThreshold, 'bloom quality level': p => p.bloomQuality,
        'vignette intensity': p => p.vignetteIntensity, 'vignette radius': p => p.vignetteRadius,
        'vignette softness': p => p.vignetteSoftness
    }),
    propertyFamily('postBoolean', 'boolean', 'post [PROPERTY] ?', null, engine => engine.post, {
        active: p => p.active, fxaa: p => p.fxaaEnabled
    }),
    propertyFamily('qualityNumber', 'number', 'quality [PROPERTY] number', null, engine => engine.quality, {
        'adaptive minimum scale %': q => q.adaptiveMinimumScale,
        'adaptive maximum scale %': q => q.adaptiveMaximumScale,
        'adaptive current scale %': q => q.adaptiveScale
    }),
    propertyFamily('terrainNumber', 'number', 'terrain [TERRAIN] [PROPERTY] number', named('TERRAIN', 'ground'),
        (engine, name) => engine.activeScene.terrains.require(name), {
            width: t => t.width, depth: t => t.depth,
            'x segments': t => t.segmentsX, 'z segments': t => t.segmentsZ,
            'logical edits': t => t.logicalEdits, 'geometry builds': t => t.geometryBuilds
        }),
    propertyFamily('terrainBoolean', 'boolean', 'terrain [TERRAIN] [PROPERTY] ?', named('TERRAIN', 'ground'),
        (engine, name) => engine.activeScene.terrains.require(name), {
            dirty: t => t.dirty
        }),
    propertyFamily('textContent', 'string', '3D text [TEXT] [PROPERTY] text', named('TEXT', 'label'),
        (engine, name) => engine.activeScene.texts.require(name), {
            text: t => t.definition.text, font: t => t.definition.fontKey, alignment: t => t.definition.alignment
        }),
    propertyFamily('textNumber', 'number', '3D text [TEXT] [PROPERTY] number', named('TEXT', 'label'),
        (engine, name) => engine.activeScene.texts.require(name), {
            'font size pixels': t => t.definition.fontSize, resolution: t => t.definition.resolution,
            'world width': t => t.effect.size[0], 'world height': t => t.effect.size[1]
        }),
    propertyFamily('textBoolean', 'boolean', '3D text [TEXT] [PROPERTY] ?', named('TEXT', 'label'),
        (engine, name) => engine.activeScene.texts.require(name), {
            'automatic width': t => t.autoWidth
        }),
    propertyFamily('customGeometryNumber', 'number', 'custom geometry [GEOMETRY] [PROPERTY] number', named('GEOMETRY', 'triangle'),
        (engine, name) => engine.geometry.requireCustom(name), {
            vertices: g => g.vertexCount, indices: g => g.indexCount, triangles: g => g.triangleCount,
            'vertex bytes': g => g.vertices.byteLength, 'index bytes': g => g.indices?.byteLength ?? 0,
            users: g => Math.max(0, g.references - 1),
            'minimum x': g => g.bounds.minimum[0], 'minimum y': g => g.bounds.minimum[1],
            'minimum z': g => g.bounds.minimum[2], 'maximum x': g => g.bounds.maximum[0],
            'maximum y': g => g.bounds.maximum[1], 'maximum z': g => g.bounds.maximum[2]
        }),
    propertyFamily('customGeometryBoolean', 'boolean', 'custom geometry [GEOMETRY] [PROPERTY] ?', named('GEOMETRY', 'triangle'),
        (engine, name) => engine.geometry.requireCustom(name), {
            dynamic: g => g.dynamic
        }),
    propertyFamily('customGeometryText', 'string', 'custom geometry [GEOMETRY] [PROPERTY] text', named('GEOMETRY', 'triangle'),
        (engine, name) => engine.geometry.requireCustom(name), {
            usage: g => g.dynamic ? 'dynamic' : 'static'
        }),
    propertyFamily('customShaderNumber', 'number', 'custom shader [SHADER] [PROPERTY] number', named('SHADER', 'custom'),
        customShader, {
            uniforms: definition => definition.schema.length,
            users: definition => definition.references
        }),
    propertyFamily('physicsBodyText', 'string', 'physics body [BODY] [PROPERTY] text', named('BODY', 'body'), body, {
        type: b => b.type, shape: b => b.shape, object: b => b.object
    }),
    propertyFamily('physicsBodyBoolean', 'boolean', 'physics body [BODY] [PROPERTY] ?', named('BODY', 'body'), body, {
        trigger: b => b.trigger, attached: b => Boolean(b.object)
    }),
    propertyFamily('physicsBodyMeasure', 'number', 'physics body [BODY] [PROPERTY] number', named('BODY', 'body'), body, {
        width: b => b.shape === 'box' ? b.size[0] * 2 : 0,
        height: b => b.shape === 'box' ? b.size[1] * 2 : 0,
        depth: b => b.shape === 'box' ? b.size[2] * 2 : 0,
        radius: b => b.shape === 'sphere' ? b.size[0] : 0,
        'offset x': b => b.offset[0], 'offset y': b => b.offset[1], 'offset z': b => b.offset[2],
        'layer bits': b => b.layer, 'mask bits': b => b.mask
    }),
    propertyFamily('physicsWorldNumber', 'number', 'physics world [PROPERTY] number', null,
        engine => required(engine.activeScene.physics, 'physics world', 'active scene'), {
            'gravity x': world => world.gravity[0], 'gravity y': world => world.gravity[1],
            'gravity z': world => world.gravity[2]
        }),
    propertyFamily('audioSourceText', 'string', 'audio source [SOURCE] [PROPERTY] text', named('SOURCE', 'source'), source, {
        mode: s => s.positional ? 'positional' : 'global', object: s => s.object,
        asset: s => s.asset.name, error: s => s.asset.error
    }),
    propertyFamily('audioSourceBoolean', 'boolean', 'audio source [SOURCE] [PROPERTY] ?', named('SOURCE', 'source'), source, {
        looping: s => s.loop, attached: s => Boolean(s.object)
    }),
    propertyFamily('audioSpatialNumber', 'number', 'audio source [SOURCE] [PROPERTY] number', named('SOURCE', 'source'), source, {
        'position x': s => s.position[0], 'position y': s => s.position[1], 'position z': s => s.position[2],
        'direction x': s => s.direction[0], 'direction y': s => s.direction[1], 'direction z': s => s.direction[2]
    }),
    propertyFamily('audioAssetNumber', 'number', 'audio asset [ASSET] [PROPERTY] number', named('ASSET', 'sound'), audioAsset, {
        'duration seconds': asset => asset.entry.buffer?.duration ?? 0,
        channels: asset => asset.entry.buffer?.numberOfChannels ?? 0,
        'sample rate hz': asset => asset.entry.buffer?.sampleRate ?? 0,
        users: asset => asset.references
    }),
    propertyFamily('audioAssetText', 'string', 'audio asset [ASSET] [PROPERTY] text', named('ASSET', 'sound'), audioAsset, {
        state: asset => asset.state, error: asset => asset.error
    }),
    propertyFamily('audioListenerNumber', 'number', 'camera [CAMERA] listener [PROPERTY] number', named('CAMERA', 'main'),
        (engine, name) => {
            const scene = engine.activeScene;
            const id = scene.requireCamera(name), offset = id * 3;
            return {scene, offset, basis: scene.resourceBasis(name)};
        }, {
            'position x': ({scene, offset}) => scene.objects.position[offset],
            'position y': ({scene, offset}) => scene.objects.position[offset + 1],
            'position z': ({scene, offset}) => scene.objects.position[offset + 2],
            'forward x': ({basis}) => basis.forward[0], 'forward y': ({basis}) => basis.forward[1],
            'forward z': ({basis}) => basis.forward[2], 'up x': ({basis}) => basis.up[0],
            'up y': ({basis}) => basis.up[1], 'up z': ({basis}) => basis.up[2]
        }),
    propertyFamily('tweenNumber', 'number', 'tween on [NAME] [PROPERTY] number', named('NAME', 'main'),
        (engine, name) => ({store: engine.activeScene.tweens, name}), {
            'position progress %': owner => {
                const record = tweenRecord(owner, 'position'); return record.duration ? record.elapsed / record.duration * 100 : 100;
            },
            'rotation progress %': owner => {
                const record = tweenRecord(owner, 'rotation'); return record.duration ? record.elapsed / record.duration * 100 : 100;
            },
            'scale progress %': owner => {
                const record = tweenRecord(owner, 'scale'); return record.duration ? record.elapsed / record.duration * 100 : 100;
            },
            'fov progress %': owner => {
                const record = tweenRecord(owner, 'fov'); return record.duration ? record.elapsed / record.duration * 100 : 100;
            }
        }),
    propertyFamily('tweenBoolean', 'boolean', 'tween on [NAME] [PROPERTY] ?', named('NAME', 'main'),
        (engine, name) => ({store: engine.activeScene.tweens, name}), {
            'position paused': owner => tweenRecord(owner, 'position').paused,
            'rotation paused': owner => tweenRecord(owner, 'rotation').paused,
            'scale paused': owner => tweenRecord(owner, 'scale').paused,
            'fov paused': owner => tweenRecord(owner, 'fov').paused
        })
];

export const API_FAMILY_BY_OPCODE = new Map(API_FAMILIES.map(family => [family.opcode, family]));
export const API_EXPANSION_FAMILY_OPCODES = [
    ...API_FAMILY_BY_OPCODE.keys(),
    'resourceTransform', 'rotateResourceBy', 'setInstanceTransform', 'instanceTransform', 'setResourceTint', 'resourceTint',
    'setInstanceTint', 'instanceTint', 'transformResourceCoordinate', 'setTextureFilter', 'setTextureWrap',
    'setTextureBooleanOption', 'modelNodeText', 'modelNodeNumber', 'modelSkinNumber', 'modelAnimationNumber',
    'lodLevelText', 'lodLevelNumber', 'customUniformText', 'customUniformNumber'
];
export const API_EXPANSION_MENUS = {
    ...familyMenus(API_FAMILIES),
    resourceTransformProperty: {acceptReporters: true, items: ['position', 'rotation', 'scale']},
    resourceTransformCopyProperty: {acceptReporters: true, items: ['position', 'rotation', 'scale', 'all']},
    colorComponent: {acceptReporters: true, items: ['red', 'green', 'blue', 'alpha']},
    coordinateDirection: {acceptReporters: true, items: ['local to world', 'world to local']},
    coordinateKind: {acceptReporters: true, items: ['point', 'direction']},
    cameraMoveAxis: {acceptReporters: true, items: ['forward', 'right', 'up']},
    textureFilterKind: {acceptReporters: true, items: ['min-filter', 'mag-filter']},
    textureFilterValue: {acceptReporters: true, items: [
        'nearest', 'linear', 'nearest-mipmap-nearest', 'linear-mipmap-nearest',
        'nearest-mipmap-linear', 'linear-mipmap-linear'
    ]},
    textureWrapAxis: {acceptReporters: true, items: ['u', 'v']},
    textureWrapValue: {acceptReporters: true, items: ['clamp', 'repeat', 'mirror']},
    textureBooleanOption: {acceptReporters: true, items: ['mipmaps', 'flip-y']},
    textureColorSpace: {acceptReporters: true, items: ['srgb', 'linear']},
    modelNodeTextProperty: {acceptReporters: true, items: ['name', 'parent', 'children']},
    modelNodeNumberProperty: {acceptReporters: true, items: [
        'parent index', 'child count', 'mesh index', 'skin index', 'translation x', 'translation y', 'translation z'
    ]},
    modelSkinNumberProperty: {acceptReporters: true, items: ['joints', 'skeleton node', 'joint node']},
    modelAnimationNumberProperty: {acceptReporters: true, items: [
        'duration seconds', 'start seconds', 'end seconds', 'channels', 'samplers'
    ]},
    customUniformTextProperty: {acceptReporters: true, items: ['type', 'sampler texture']}
};

export const apiExpansionBlocks = Scratch => {
    const s = (defaultValue, menu) => ({type: Scratch.ArgumentType.STRING, defaultValue, ...(menu ? {menu} : {})});
    const n = defaultValue => ({type: Scratch.ArgumentType.NUMBER, defaultValue});
    const b = (opcode, text, args, type = 'COMMAND') => ({opcode, text, arguments: args, blockType: Scratch.BlockType[type]});
    const resource = () => ({RESOURCE: s('cube')});
    const transform = () => ({PROPERTY: s('position', 'resourceTransformProperty')});
    const xyz = () => ({X: n(0), Y: n(0), Z: n(0)});
    return [
        '---',
        b('deleteScene', 'delete 3D scene [SCENE]', {SCENE: s('world')}),
        b('sceneExists', '3D scene [SCENE] exists?', {SCENE: s('world')}, 'BOOLEAN'),
        b('resourceExists', '3D resource [RESOURCE] exists?', resource(), 'BOOLEAN'),
        b('resourceKind', '3D resource [RESOURCE] kind', resource(), 'REPORTER'),
        b('setResourceVisible', 'set 3D resource [RESOURCE] visible [ENABLED]', {...resource(), ENABLED: s('on', 'onOff')}),
        b('resourceVisible', '3D resource [RESOURCE] visible?', resource(), 'BOOLEAN'),
        b('resourceTransform', '3D resource [RESOURCE] [PROPERTY] [AXIS] (rotation in degrees)', {...resource(), ...transform(), AXIS: s('x', 'vectorAxis')}, 'REPORTER'),
        b('rotateResourceBy', 'rotate 3D resource [RESOURCE] by x [X] y [Y] z [Z] degrees', {...resource(), ...xyz()}),
        b('setInstanceTransform', 'set instance [INDEX] of [GROUP] [PROPERTY] x [X] y [Y] z [Z] (rotation in degrees)', {INDEX: n(1), GROUP: s('cubes'), ...transform(), ...xyz()}),
        b('instanceTransform', 'instance [INDEX] of [GROUP] [PROPERTY] [AXIS] (rotation in degrees)', {INDEX: n(1), GROUP: s('cubes'), ...transform(), AXIS: s('x', 'vectorAxis')}, 'REPORTER'),
        b('lookObjectAt', 'point 3D resource [RESOURCE] toward x [X] y [Y] z [Z]', {...resource(), ...xyz()}),
        b('distanceBetweenResources', 'distance from 3D resource [FROM] to [TO]', {FROM: s('cube'), TO: s('main')}, 'REPORTER'),
        b('setSceneBackground', 'set scene background [COLOR] opacity [OPACITY] %', {
            COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#000000'}, OPACITY: n(100)
        }),
        b('setResourceTint', 'set 3D resource [RESOURCE] tint [COLOR] opacity [OPACITY] %', {
            ...resource(), COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}, OPACITY: n(100)
        }),
        b('resourceTint', '3D resource [RESOURCE] tint [COMPONENT] (RGB 0-255, alpha %)', {
            ...resource(), COMPONENT: s('red', 'colorComponent')
        }, 'REPORTER'),
        b('setInstanceTint', 'set instance [INDEX] of [GROUP] tint [COLOR] opacity [OPACITY] %', {
            INDEX: n(1), GROUP: s('cubes'), COLOR: {type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff'}, OPACITY: n(100)
        }),
        b('instanceTint', 'instance [INDEX] of [GROUP] tint [COMPONENT] (RGB 0-255, alpha %)', {
            INDEX: n(1), GROUP: s('cubes'), COMPONENT: s('red', 'colorComponent')
        }, 'REPORTER'),
        b('transformResourceCoordinate', '[DIRECTION] [KIND] by [RESOURCE] x [X] y [Y] z [Z] get [AXIS]', {
            DIRECTION: s('local to world', 'coordinateDirection'), KIND: s('point', 'coordinateKind'),
            ...resource(), ...xyz(), AXIS: s('x', 'vectorAxis')
        }, 'REPORTER'),
        b('moveResourceByCamera', 'move [RESOURCE] by camera [CAMERA] [AXIS] [DISTANCE]', {
            ...resource(), CAMERA: s('main'), AXIS: s('forward', 'cameraMoveAxis'), DISTANCE: n(1)
        }),
        b('pointAheadOfCamera', 'point [DISTANCE] ahead of camera [CAMERA] [AXIS]', {
            DISTANCE: n(1), CAMERA: s('main'), AXIS: s('x', 'vectorAxis')
        }, 'REPORTER'),
        b('copyResourceTransform', 'copy [PROPERTY] from [FROM] to [TO]', {
            PROPERTY: s('all', 'resourceTransformCopyProperty'), FROM: s('cube'), TO: s('model1')
        }),
        b('setMaterialEmissiveIntensity', 'set material [MATERIAL] emissive intensity [INTENSITY]', {
            MATERIAL: s('material'), INTENSITY: n(1)
        }),
        b('setTextureFilter', 'set texture [TEXTURE] [FILTER] [VALUE]', {
            TEXTURE: s('texture'), FILTER: s('min-filter', 'textureFilterKind'), VALUE: s('linear', 'textureFilterValue')
        }),
        b('setTextureWrap', 'set texture [TEXTURE] wrap [AXIS] [VALUE]', {
            TEXTURE: s('texture'), AXIS: s('u', 'textureWrapAxis'), VALUE: s('repeat', 'textureWrapValue')
        }),
        b('setTextureBooleanOption', 'set texture [TEXTURE] [OPTION] [ENABLED]', {
            TEXTURE: s('texture'), OPTION: s('mipmaps', 'textureBooleanOption'), ENABLED: s('on', 'onOff')
        }),
        b('setTextureAnisotropy', 'set texture [TEXTURE] anisotropy [VALUE]', {TEXTURE: s('texture'), VALUE: n(1)}),
        b('setTextureColorSpace', 'set texture [TEXTURE] color space [SPACE]', {
            TEXTURE: s('texture'), SPACE: s('srgb', 'textureColorSpace')
        }),
        b('modelNodeText', 'model [MODEL] node [INDEX] [PROPERTY] text', {
            MODEL: s('model'), INDEX: n(1), PROPERTY: s('name', 'modelNodeTextProperty')
        }, 'REPORTER'),
        b('modelNodeNumber', 'model [MODEL] node [INDEX] [PROPERTY] number', {
            MODEL: s('model'), INDEX: n(1), PROPERTY: s('parent index', 'modelNodeNumberProperty')
        }, 'REPORTER'),
        b('modelSkinText', 'model [MODEL] skin [INDEX] name', {MODEL: s('model'), INDEX: n(1)}, 'REPORTER'),
        b('modelSkinNumber', 'model [MODEL] skin [INDEX] [PROPERTY] joint [JOINT]', {
            MODEL: s('model'), INDEX: n(1), PROPERTY: s('joints', 'modelSkinNumberProperty'), JOINT: n(1)
        }, 'REPORTER'),
        b('modelAnimationText', 'model [MODEL] animation [INDEX] name', {MODEL: s('model'), INDEX: n(1)}, 'REPORTER'),
        b('modelAnimationNumber', 'model [MODEL] animation [INDEX] [PROPERTY]', {
            MODEL: s('model'), INDEX: n(1), PROPERTY: s('duration seconds', 'modelAnimationNumberProperty')
        }, 'REPORTER'),
        b('lodLevelText', 'LOD group [GROUP] level [LEVEL] model', {GROUP: s('lod'), LEVEL: n(1)}, 'REPORTER'),
        b('lodLevelNumber', 'LOD group [GROUP] level [LEVEL] threshold', {GROUP: s('lod'), LEVEL: n(1)}, 'REPORTER'),
        b('customGeometryExists', 'custom geometry [GEOMETRY] exists?', {GEOMETRY: s('triangle')}, 'BOOLEAN'),
        b('customShaderExists', 'custom shader [SHADER] exists?', {SHADER: s('custom')}, 'BOOLEAN'),
        b('customUniformText', 'custom material [MATERIAL] uniform [UNIFORM] [PROPERTY] text', {
            MATERIAL: s('custom material'), UNIFORM: s('tint'), PROPERTY: s('type', 'customUniformTextProperty')
        }, 'REPORTER'),
        b('customUniformNumber', 'custom material [MATERIAL] uniform [UNIFORM] component [COMPONENT]', {
            MATERIAL: s('custom material'), UNIFORM: s('tint'), COMPONENT: n(1)
        }, 'REPORTER'),
        b('setCustomUniformVector', 'set custom material [MATERIAL] vector [UNIFORM] x [X] y [Y] z [Z] w [W]', {
            MATERIAL: s('custom material'), UNIFORM: s('tint'), X: n(1), Y: n(1), Z: n(1), W: n(1)
        }),
        b('spriteDirectionalFrame', 'sprite [RESOURCE] direction [DIRECTION] frame', {
            RESOURCE: s('sprite'), DIRECTION: n(1)
        }, 'REPORTER'),
        b('setParticleSpread', 'set emitter [RESOURCE] spread x [X] y [Y] z [Z]', {
            RESOURCE: s('particles'), ...xyz()
        }),
        b('terrainExists', 'terrain [TERRAIN] exists?', {TERRAIN: s('ground')}, 'BOOLEAN'),
        b('terrainGridHeight', 'terrain [TERRAIN] grid x [X] z [Z] height', {
            TERRAIN: s('ground'), X: n(1), Z: n(1)
        }, 'REPORTER'),
        b('physicsBodyExists', 'physics body [BODY] exists?', {BODY: s('body')}, 'BOOLEAN'),
        b('audioAssetExists', 'audio asset [ASSET] exists?', {ASSET: s('sound')}, 'BOOLEAN'),
        b('audioSourceExists', 'audio source [SOURCE] exists?', {SOURCE: s('source')}, 'BOOLEAN'),
        ...familyBlocks(Scratch, API_FAMILIES)
    ];
};
