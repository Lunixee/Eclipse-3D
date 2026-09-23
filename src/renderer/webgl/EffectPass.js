import {
    BillboardMode,
    EffectAlphaMode,
    EffectKind,
    EffectLighting
} from '../../effects/EffectStore.js';
import {bindGeometryIndexBuffer} from './GeometryGpuCache.js';
import {LOCAL_LIGHT_GLSL} from './LocalLightShader.js';
import {createProgram} from './shader.js';

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
const INSTANCE_STRIDE = 24;
const INSTANCE_BYTE_STRIDE = INSTANCE_STRIDE * FLOAT_SIZE;

const MODE_INDEX = Object.freeze({
    [BillboardMode.FULL]: 0,
    [BillboardMode.Y_AXIS]: 1,
    [BillboardMode.FIXED]: 2,
    [BillboardMode.SCREEN_ALIGNED]: 3
});

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec4 aPositionRoll;
layout(location = 3) in vec4 aSizePivot;
layout(location = 4) in vec4 aRightBrightness;
layout(location = 5) in vec4 aUpOffset;
layout(location = 6) in vec4 aColor;
layout(location = 7) in vec2 aUv;
layout(location = 8) in vec4 aFrameUv;

uniform mat4 uViewProjection;
uniform vec3 uCameraPosition;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform int uBillboardMode;
uniform vec2 uUvOffset;
uniform vec2 uUvRepeat;
uniform float uUvRotation;

out vec2 vUv;
out vec4 vColor;
out vec3 vNormal;
out vec3 vWorldPosition;
out float vBrightness;

vec3 safeNormalize(vec3 value, vec3 fallbackValue) {
    float lengthSquared = dot(value, value);
    return lengthSquared > 1e-10 ? value * inversesqrt(lengthSquared) : fallbackValue;
}

void main() {
    vec3 anchor = aPositionRoll.xyz;
    vec3 right;
    vec3 up;
    if (uBillboardMode == 0) {
        vec3 forward = safeNormalize(uCameraPosition - anchor, -cross(uCameraRight, uCameraUp));
        right = safeNormalize(cross(vec3(0.0, 1.0, 0.0), forward), uCameraRight);
        up = safeNormalize(cross(forward, right), uCameraUp);
    } else if (uBillboardMode == 1) {
        vec3 forward = safeNormalize(vec3(uCameraPosition.x - anchor.x, 0.0, uCameraPosition.z - anchor.z),
            -cross(uCameraRight, vec3(0.0, 1.0, 0.0)));
        right = safeNormalize(cross(vec3(0.0, 1.0, 0.0), forward), uCameraRight);
        up = vec3(0.0, 1.0, 0.0);
    } else if (uBillboardMode == 2) {
        right = safeNormalize(aRightBrightness.xyz, vec3(1.0, 0.0, 0.0));
        up = safeNormalize(aUpOffset.xyz, vec3(0.0, 1.0, 0.0));
    } else {
        right = uCameraRight;
        up = uCameraUp;
    }
    float sine = sin(aPositionRoll.w);
    float cosine = cos(aPositionRoll.w);
    vec3 rolledRight = right * cosine + up * sine;
    vec3 rolledUp = up * cosine - right * sine;
    vec2 local = (aPosition.xy + vec2(0.5) - aSizePivot.zw) * aSizePivot.xy;
    vec3 normal = safeNormalize(cross(rolledRight, rolledUp), vec3(0.0, 0.0, 1.0));
    vec3 worldPosition = anchor + normal * aUpOffset.w + rolledRight * local.x + rolledUp * local.y;
    vec2 frameUv = aFrameUv.xy + aUv * aFrameUv.zw;
    vec2 centeredUv = frameUv - vec2(0.5);
    float uvSine = sin(uUvRotation);
    float uvCosine = cos(uUvRotation);
    vUv = mat2(uvCosine, uvSine, -uvSine, uvCosine) * centeredUv * uUvRepeat + uUvOffset + vec2(0.5);
    vColor = aColor;
    vNormal = normal;
    vWorldPosition = worldPosition;
    vBrightness = aRightBrightness.w;
    gl_Position = uViewProjection * vec4(worldPosition, 1.0);
}`;

const fragmentShader = (lit, alphaMode, localLights) => {
    const cutout = alphaMode === EffectAlphaMode.CUTOUT;
    const preserveAlpha = alphaMode === EffectAlphaMode.BLEND || alphaMode === EffectAlphaMode.ADDITIVE;
    return `#version 300 es
precision highp float;
in vec2 vUv;
in vec4 vColor;
in vec3 vNormal;
in vec3 vWorldPosition;
in float vBrightness;
uniform sampler2D uTexture;
uniform bool uTextureIsSrgb;
uniform float uAlphaCutoff;
${lit ? `uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
${localLights ? LOCAL_LIGHT_GLSL : ''}` : ''}
out vec4 outputColor;

vec3 srgbToLinear(vec3 value) {
    bvec3 cutoff = lessThanEqual(value, vec3(0.04045));
    return mix(pow((value + 0.055) / 1.055, vec3(2.4)), value / 12.92, cutoff);
}

void main() {
    vec4 surface = texture(uTexture, vUv);
    if (uTextureIsSrgb) surface.rgb = srgbToLinear(surface.rgb);
    vec4 base = surface * vColor;
    ${cutout ? 'if (base.a < uAlphaCutoff) discard;' : ''}
    vec3 rgb = base.rgb * vBrightness;
    ${lit ? `vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    float diffuse = max(dot(normal, normalize(-uLightDirection)), 0.0);
    vec3 lightValue = uAmbientColor * uAmbientIntensity + uLightColor * uLightIntensity * diffuse;
    ${localLights ? `for (int index = 0; index < MAX_LOCAL_LIGHTS; index++) {
        if (index >= uLocalLightCount) break;
        vec3 localDirection;
        vec3 radiance = localLightRadiance(index, vWorldPosition, localDirection);
        lightValue += radiance * max(dot(normal, localDirection), 0.0);
    }` : ''}
    rgb *= lightValue;` : ''}
    outputColor = vec4(rgb, ${preserveAlpha ? 'base.a' : '1.0'});
}`;
};

const UNIFORMS = [
    'uViewProjection',
    'uCameraPosition',
    'uCameraRight',
    'uCameraUp',
    'uBillboardMode',
    'uTexture',
    'uTextureIsSrgb',
    'uAlphaCutoff',
    'uUvOffset',
    'uUvRepeat',
    'uUvRotation',
    'uLightDirection',
    'uLightColor',
    'uLightIntensity',
    'uAmbientColor',
    'uAmbientIntensity',
    'uLocalLightCount',
    'uLocalLightPositionRange[0]',
    'uLocalLightColorIntensity[0]',
    'uLocalLightDirectionOuter[0]',
    'uLocalLightInnerCos[0]'
];

const isTransparent = effect => effect.alphaMode === EffectAlphaMode.BLEND ||
    effect.alphaMode === EffectAlphaMode.ADDITIVE;

const lerp = (start, end, amount) => start + (end - start) * amount;

export class EffectPass {
    constructor(gl, geometryCache, textureCache, geometryStore, compiler = createProgram) {
        this.gl = gl;
        this.geometryCache = geometryCache;
        this.textureCache = textureCache;
        this.geometryStore = geometryStore;
        this.fallbackGeometry = geometryStore;
        this.compiler = compiler;
        this.instanceBuffer = null;
        this.instanceData = new Float32Array(0);
        this.vertexArray = null;
        this.vertexArrayResource = null;
        this.programs = new Map();
        this.compileCount = 0;
        this.batchMap = new Map();
        this.batchPool = [];
        this.batches = [];
        this.uploadedVersion = -1;
        this.uploadedVisibilityStamp = -1;
        this.lastCameraPosition = new Float32Array([NaN, NaN, NaN]);
        this.instanceCount = 0;
        this.uploadCount = 0;
        this.lastUploadCount = 0;
        this.lastUploadBytes = 0;
        this.stats = {
            spriteCount: 0,
            visibleSprites: 0,
            culledSprites: 0,
            spriteBatches: 0,
            spriteDrawCalls: 0,
            spriteInstanceUploads: 0,
            spriteInstanceUploadBytes: 0,
            spriteSorts: 0,
            particleEmitters: 0,
            visibleParticleEmitters: 0,
            culledParticleEmitters: 0,
            renderedParticles: 0,
            particleInstanceUploads: 0,
            particleInstanceUploadBytes: 0,
            particleDrawCalls: 0,
            decalCount: 0,
            visibleDecals: 0,
            culledDecals: 0,
            decalBatches: 0,
            decalDrawCalls: 0,
            effectInstanceUploads: 0,
            effectInstanceUploadBytes: 0,
            effectBatches: 0,
            effectDrawCalls: 0,
            effectShaderCompiles: 0,
            directionalFrameChanges: 0,
            textLabels: 0,
            visibleTextLabels: 0,
            renderedTextInstances: 0,
            textDrawCalls: 0,
            textInstanceUploadBytes: 0
        };
    }

    prepare(scene, cameraPosition, localLightSelector, emptyLightSelection) {
        this.geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
        const effects = scene.effects;
        const stats = this.stats;
        this.lastUploadCount = 0;
        this.lastUploadBytes = 0;
        stats.textLabels = scene.texts?.labels.size ?? 0;
        stats.visibleTextLabels = 0;
        stats.renderedTextInstances = 0;
        stats.spriteCount = effects.sprites.size - stats.textLabels;
        stats.visibleSprites = 0;
        stats.culledSprites = 0;
        stats.spriteSorts = 0;
        stats.particleEmitters = effects.emitters.size;
        stats.visibleParticleEmitters = 0;
        stats.culledParticleEmitters = 0;
        stats.renderedParticles = 0;
        stats.decalCount = effects.decals.size;
        stats.visibleDecals = 0;
        stats.culledDecals = 0;
        stats.directionalFrameChanges = 0;
        if (effects.resources.size === 0) {
            this.instanceCount = 0;
            this.batches.length = 0;
            this.uploadedVersion = effects.renderVersion;
            this.uploadedVisibilityStamp = scene.visibility.cameraStamp;
            this.lastCameraPosition.set(cameraPosition);
            return;
        }
        stats.directionalFrameChanges = effects.updateDirectional(cameraPosition[0], cameraPosition[2]);

        let visibilityChanged = this.uploadedVisibilityStamp < 0;
        let transparentVisible = false;
        for (const effect of effects.resources.values()) {
            const visible = effect.visible && scene.visibility.effectVisible(effect);
            if (effect._rendererVisible !== visible) visibilityChanged = true;
            effect._rendererVisible = visible;
            if (effect.kind === EffectKind.SPRITE) {
                if (effect.semanticKind === 'text') {
                    if (visible) stats.visibleTextLabels++;
                } else if (visible) stats.visibleSprites++;
                else stats.culledSprites++;
            } else if (effect.kind === EffectKind.DECAL) {
                if (visible && !effect.expired) stats.visibleDecals++;
                else stats.culledDecals++;
            } else {
                if (visible) stats.visibleParticleEmitters++;
                else stats.culledParticleEmitters++;
                if (visible) stats.renderedParticles += effect.activeCount;
            }
            if (visible && isTransparent(effect)) transparentVisible = true;
        }
        const cameraMoved = cameraPosition[0] !== this.lastCameraPosition[0] ||
            cameraPosition[1] !== this.lastCameraPosition[1] || cameraPosition[2] !== this.lastCameraPosition[2];
        const needsUpload = effects.renderVersion !== this.uploadedVersion || visibilityChanged ||
            localLightSelector.requiresRefresh || (transparentVisible && cameraMoved);
        this.uploadedVisibilityStamp = scene.visibility.cameraStamp;
        if (!needsUpload) return;

        this.batchMap.clear();
        this.batches.length = 0;
        let requiredInstances = 0;
        for (const sprite of effects.sprites.values()) {
            if (!sprite._rendererVisible) continue;
            const selection = sprite.lighting === EffectLighting.LIT ?
                localLightSelector.selectEffect(scene, sprite) : emptyLightSelection;
            this.#addItem(sprite, selection).items.push(sprite);
            requiredInstances++;
        }
        for (const decal of effects.decals.values()) {
            if (!decal._rendererVisible || decal.expired) continue;
            const selection = decal.lighting === EffectLighting.LIT ?
                localLightSelector.selectEffect(scene, decal) : emptyLightSelection;
            this.#addItem(decal, selection).items.push(decal);
            requiredInstances++;
        }
        for (const emitter of effects.emitters.values()) {
            if (!emitter._rendererVisible || emitter.activeCount === 0) continue;
            const selection = emitter.lighting === EffectLighting.LIT ?
                localLightSelector.selectEffect(scene, emitter) : emptyLightSelection;
            this.#addItem(emitter, selection).emitters.push(emitter);
            requiredInstances += emitter.activeCount;
        }
        for (const batch of this.batches) {
            batch.sortDistance = 0;
            if (!batch.transparent) continue;
            for (const item of batch.items) {
                batch.sortDistance = Math.max(batch.sortDistance, this.#distanceSquared(item.position, cameraPosition));
            }
            for (const emitter of batch.emitters) {
                batch.sortDistance = Math.max(batch.sortDistance,
                    this.#distanceSquared(emitter.position, cameraPosition));
            }
        }
        this.batches.sort((left, right) => {
            if (left.transparent !== right.transparent) return left.transparent ? 1 : -1;
            if (left.transparent && left.sortDistance !== right.sortDistance) {
                return right.sortDistance - left.sortDistance;
            }
            return left.sortKey.localeCompare(right.sortKey);
        });
        this.#ensureData(requiredInstances * INSTANCE_STRIDE);
        let offset = 0;
        for (const batch of this.batches) {
            batch.offset = offset;
            if (batch.transparent) {
                for (const item of batch.items) item._sortDistance = this.#distanceSquared(item.position, cameraPosition);
                batch.items.sort((left, right) => right._sortDistance - left._sortDistance || left.name.localeCompare(right.name));
                batch.emitters.sort((left, right) =>
                    this.#distanceSquared(right.position, cameraPosition) - this.#distanceSquared(left.position, cameraPosition) ||
                    left.name.localeCompare(right.name));
                if (batch.items.length + batch.emitters.length > 1) stats.spriteSorts++;
            }
            for (const item of batch.items) {
                this.#writeVisual(offset * INSTANCE_STRIDE, item, item.renderedFrame);
                offset++;
            }
            for (const emitter of batch.emitters) {
                for (let index = 0; index < emitter.activeCount; index++) {
                    this.#writeParticle(offset * INSTANCE_STRIDE, emitter, index);
                    offset++;
                }
            }
            batch.count = offset - batch.offset;
        }
        const length = requiredInstances * INSTANCE_STRIDE;
        this.instanceCount = requiredInstances;
        if (length > 0) {
            const gl = this.gl;
            if (!this.instanceBuffer) {
                this.instanceBuffer = gl.createBuffer();
                if (!this.instanceBuffer) throw new Error('Could not allocate the effect instance buffer');
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, length), gl.DYNAMIC_DRAW);
            this.uploadCount++;
            this.lastUploadCount = 1;
            this.lastUploadBytes = length * FLOAT_SIZE;
        }
        this.uploadedVersion = effects.renderVersion;
        this.lastCameraPosition.set(cameraPosition);
    }

    render(scene, frame) {
        const stats = this.stats;
        stats.spriteDrawCalls = 0;
        stats.particleDrawCalls = 0;
        stats.decalDrawCalls = 0;
        stats.textDrawCalls = 0;
        stats.spriteBatches = 0;
        stats.decalBatches = 0;
        stats.effectBatches = this.batches.length;
        stats.effectDrawCalls = 0;
        stats.effectInstanceUploads = this.lastUploadCount;
        stats.effectInstanceUploadBytes = this.lastUploadBytes;
        stats.spriteInstanceUploads = this.lastUploadCount && stats.visibleSprites > 0 ? 1 : 0;
        stats.spriteInstanceUploadBytes = stats.spriteInstanceUploads * stats.visibleSprites * INSTANCE_STRIDE * FLOAT_SIZE;
        stats.renderedTextInstances = stats.visibleTextLabels;
        stats.textInstanceUploadBytes = this.lastUploadCount && stats.visibleTextLabels > 0 ?
            stats.visibleTextLabels * INSTANCE_STRIDE * FLOAT_SIZE : 0;
        stats.particleInstanceUploads = this.lastUploadCount && stats.renderedParticles > 0 ? 1 : 0;
        stats.particleInstanceUploadBytes = stats.particleInstanceUploads * stats.renderedParticles * INSTANCE_STRIDE * FLOAT_SIZE;
        stats.effectShaderCompiles = this.compileCount;
        if (this.instanceCount === 0) return 0;
        const geometryResource = this.geometryStore.getQuad();
        const geometry = this.geometryCache.get(geometryResource);
        const gl = this.gl;
        gl.bindVertexArray(this.#vertexArrayFor(geometry));
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        let currentProgram = null;
        let currentTexture = null;
        let currentDepthTest = true;
        let currentDepthWrite = true;
        let currentBlend = '';
        let currentPolygonOffset = false;
        for (const batch of this.batches) {
            if (batch.count === 0) continue;
            const textureResource = scene.textures?.resourceForId(batch.textureId);
            const texture = this.textureCache.get(textureResource);
            if (!texture) continue;
            const program = this.#program(batch.lit, batch.alphaMode, batch.lightSelection.count > 0);
            if (program.program !== currentProgram) {
                currentProgram = program.program;
                gl.useProgram(program.program);
                this.#frameUniforms(program.locations, scene, frame);
            }
            const locations = program.locations;
            this.#uniform1i(locations.uBillboardMode, MODE_INDEX[batch.billboardMode]);
            this.#uniform1f(locations.uAlphaCutoff, batch.alphaCutoff);
            if (texture !== currentTexture) {
                gl.activeTexture(gl.TEXTURE0 + frame.textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                currentTexture = texture;
            }
            this.#uniform1i(locations.uTexture, frame.textureUnit);
            this.#uniform1i(locations.uTextureIsSrgb, textureResource.settings.colorSpace === 'srgb' ? 1 : 0);
            this.#uniform2f(locations.uUvOffset, textureResource.uv[0], textureResource.uv[1]);
            this.#uniform2f(locations.uUvRepeat, textureResource.uv[2], textureResource.uv[3]);
            this.#uniform1f(locations.uUvRotation, textureResource.uv[4]);
            if (batch.lightSelection.count > 0) {
                this.#bindLocalLights(locations, batch.lightSelection);
                frame.localLightSelector.recordDraw(batch.lightSelection);
            }
            if (batch.depthTest !== currentDepthTest) {
                batch.depthTest ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
                currentDepthTest = batch.depthTest;
            }
            if (batch.depthWrite !== currentDepthWrite) {
                gl.depthMask(batch.depthWrite);
                currentDepthWrite = batch.depthWrite;
            }
            if (batch.alphaMode !== currentBlend) {
                if (batch.alphaMode === EffectAlphaMode.BLEND) {
                    gl.enable(gl.BLEND);
                    gl.blendEquation(gl.FUNC_ADD);
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                } else if (batch.alphaMode === EffectAlphaMode.ADDITIVE) {
                    gl.enable(gl.BLEND);
                    gl.blendEquation(gl.FUNC_ADD);
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
                } else {
                    gl.disable(gl.BLEND);
                }
                currentBlend = batch.alphaMode;
            }
            if (batch.decal !== currentPolygonOffset) {
                if (batch.decal) {
                    gl.enable(gl.POLYGON_OFFSET_FILL);
                    gl.polygonOffset(-1, -1);
                } else {
                    gl.disable(gl.POLYGON_OFFSET_FILL);
                }
                currentPolygonOffset = batch.decal;
            }
            this.#bindInstanceRange(batch.offset);
            gl.drawElementsInstanced(gl.TRIANGLES, geometry.indexCount, gl.UNSIGNED_INT, 0, batch.count);
            stats.effectDrawCalls++;
            if (batch.hasSprite) {
                stats.spriteDrawCalls++;
                stats.spriteBatches++;
            }
            if (batch.hasText) stats.textDrawCalls++;
            if (batch.hasParticles) stats.particleDrawCalls++;
            if (batch.decal) {
                stats.decalDrawCalls++;
                stats.decalBatches++;
            }
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        stats.effectShaderCompiles = this.compileCount;
        return stats.effectDrawCalls;
    }

    invalidate() {
        this.uploadedVersion = -1;
        this.uploadedVisibilityStamp = -1;
    }

    releaseSceneResources() {
        this.invalidate();
        this.instanceCount = 0;
        this.batches.length = 0;
        this.batchMap.clear();
        this.lastUploadCount = 0;
        this.lastUploadBytes = 0;
    }

    releaseGeometry(resource) {
        if (this.vertexArrayResource !== resource || !this.vertexArray) return;
        this.gl.deleteVertexArray(this.vertexArray);
        this.vertexArray = null;
        this.vertexArrayResource = null;
    }

    dispose() {
        if (this.vertexArray) this.gl.deleteVertexArray(this.vertexArray);
        for (const entry of this.programs.values()) this.gl.deleteProgram(entry.program);
        this.programs.clear();
        if (this.instanceBuffer) this.gl.deleteBuffer(this.instanceBuffer);
        this.instanceBuffer = null;
        this.vertexArray = null;
        this.vertexArrayResource = null;
    }

    #addItem(effect, lightSelection) {
        const decal = effect.kind === EffectKind.DECAL;
        const key = [
            effect.textureId,
            effect.kind === EffectKind.PARTICLE_EMITTER ? 'particles' : 'sprite',
            effect.billboardMode,
            effect.lighting,
            effect.alphaMode,
            effect.alphaCutoff,
            effect.depthTest ? 1 : 0,
            effect.depthWrite ? 1 : 0,
            decal ? 1 : 0,
            lightSelection.identityKey
        ].join('|');
        let batch = this.batchMap.get(key);
        if (batch) {
            batch.hasSprite ||= effect.kind === EffectKind.SPRITE && effect.semanticKind !== 'text';
            batch.hasText ||= effect.semanticKind === 'text';
            batch.hasParticles ||= effect.kind === EffectKind.PARTICLE_EMITTER;
            return batch;
        }
        batch = this.batchPool[this.batches.length];
        if (!batch) {
            batch = {items: [], emitters: []};
            this.batchPool.push(batch);
        }
        batch.items.length = 0;
        batch.emitters.length = 0;
        batch.textureId = effect.textureId;
        batch.billboardMode = effect.billboardMode;
        batch.lit = effect.lighting === EffectLighting.LIT;
        batch.alphaMode = effect.alphaMode;
        batch.alphaCutoff = effect.alphaCutoff;
        batch.depthTest = effect.depthTest;
        batch.depthWrite = effect.depthWrite;
        batch.decal = decal;
        batch.transparent = isTransparent(effect);
        batch.lightSelection = lightSelection;
        batch.hasSprite = effect.kind === EffectKind.SPRITE && effect.semanticKind !== 'text';
        batch.hasText = effect.semanticKind === 'text';
        batch.hasParticles = effect.kind === EffectKind.PARTICLE_EMITTER;
        batch.count = 0;
        batch.offset = 0;
        batch.sortDistance = 0;
        batch.sortKey = `${batch.transparent ? 1 : 0}|${decal ? 1 : 0}|${key}`;
        this.batchMap.set(key, batch);
        this.batches.push(batch);
        return batch;
    }

    #writeVisual(offset, effect, frame) {
        const output = this.instanceData;
        output[offset] = effect.position[0];
        output[offset + 1] = effect.position[1];
        output[offset + 2] = effect.position[2];
        output[offset + 3] = effect.roll;
        output[offset + 4] = effect.size[0];
        output[offset + 5] = effect.size[1];
        output[offset + 6] = effect.pivot[0];
        output[offset + 7] = effect.pivot[1];
        output.set(effect.right, offset + 8);
        output[offset + 11] = effect.brightness;
        output.set(effect.up, offset + 12);
        output[offset + 15] = effect.kind === EffectKind.DECAL ? effect.surfaceOffset : 0;
        output.set(effect.tint, offset + 16);
        this.#writeFrame(offset + 20, effect, frame);
    }

    #writeParticle(offset, emitter, index) {
        const particles = emitter.particles;
        const life = particles.lifetime[index];
        const amount = life > 0 ? Math.min(particles.age[index] / life, 1) : 1;
        const size = lerp(emitter.sizeRange[0], emitter.sizeRange[1], amount);
        const output = this.instanceData;
        output[offset] = emitter.position[0] + particles.positionX[index];
        output[offset + 1] = emitter.position[1] + particles.positionY[index];
        output[offset + 2] = emitter.position[2] + particles.positionZ[index];
        output[offset + 3] = emitter.roll + particles.rotation[index];
        output[offset + 4] = emitter.size[0] * size;
        output[offset + 5] = emitter.size[1] * size;
        output[offset + 6] = emitter.pivot[0];
        output[offset + 7] = emitter.pivot[1];
        output.set(emitter.right, offset + 8);
        output[offset + 11] = emitter.brightness;
        output.set(emitter.up, offset + 12);
        output[offset + 15] = 0;
        output[offset + 16] = emitter.tint[0] * lerp(emitter.startColor[0], emitter.endColor[0], amount);
        output[offset + 17] = emitter.tint[1] * lerp(emitter.startColor[1], emitter.endColor[1], amount);
        output[offset + 18] = emitter.tint[2] * lerp(emitter.startColor[2], emitter.endColor[2], amount);
        output[offset + 19] = emitter.tint[3] * lerp(emitter.startColor[3], emitter.endColor[3], amount) *
            lerp(emitter.alphaRange[0], emitter.alphaRange[1], amount);
        const totalFrames = emitter.sheetColumns * emitter.sheetRows;
        const frame = totalFrames > 1 && emitter.particleFrameRate > 0 ?
            (emitter.frame + Math.floor(particles.age[index] * emitter.particleFrameRate)) % totalFrames :
            emitter.frame;
        this.#writeFrame(offset + 20, emitter, frame);
    }

    #writeFrame(offset, effect, frame) {
        const column = frame % effect.sheetColumns;
        const row = Math.floor(frame / effect.sheetColumns);
        this.instanceData[offset] = column / effect.sheetColumns;
        this.instanceData[offset + 1] = (effect.sheetRows - row - 1) / effect.sheetRows;
        this.instanceData[offset + 2] = 1 / effect.sheetColumns;
        this.instanceData[offset + 3] = 1 / effect.sheetRows;
    }

    #ensureData(length) {
        if (this.instanceData.length >= length) return;
        this.instanceData = new Float32Array(Math.max(length, this.instanceData.length * 2, 64 * INSTANCE_STRIDE));
    }

    #vertexArrayFor(geometry) {
        if (this.vertexArray && this.vertexArrayResource === geometry.resource) return this.vertexArray;
        if (this.vertexArray) this.gl.deleteVertexArray(this.vertexArray);
        const gl = this.gl;
        const vertexArray = gl.createVertexArray();
        if (!vertexArray) throw new Error('Could not allocate the effect vertex array');
        gl.bindVertexArray(vertexArray);
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, geometry.stride, 0);
        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 2, gl.FLOAT, false, geometry.stride, 10 * FLOAT_SIZE);
        bindGeometryIndexBuffer(gl, geometry);
        this.#bindInstanceRange(0);
        gl.bindVertexArray(null);
        this.vertexArray = vertexArray;
        this.vertexArrayResource = geometry.resource;
        return vertexArray;
    }

    #bindInstanceRange(baseInstance) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        this.#instanceAttribute(2, 4, 0, baseInstance);
        this.#instanceAttribute(3, 4, 4, baseInstance);
        this.#instanceAttribute(4, 4, 8, baseInstance);
        this.#instanceAttribute(5, 4, 12, baseInstance);
        this.#instanceAttribute(6, 4, 16, baseInstance);
        this.#instanceAttribute(8, 4, 20, baseInstance);
    }

    #instanceAttribute(location, size, offset, baseInstance) {
        const gl = this.gl;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
            location,
            size,
            gl.FLOAT,
            false,
            INSTANCE_BYTE_STRIDE,
            baseInstance * INSTANCE_BYTE_STRIDE + offset * FLOAT_SIZE
        );
        gl.vertexAttribDivisor(location, 1);
    }

    #program(lit, alphaMode, localLights) {
        const key = `${lit ? 1 : 0}|${alphaMode}|${localLights ? 1 : 0}`;
        let entry = this.programs.get(key);
        if (entry) return entry;
        const program = this.compiler(this.gl, VERTEX_SHADER, fragmentShader(lit, alphaMode, localLights));
        const locations = {};
        for (const name of UNIFORMS) locations[name] = this.gl.getUniformLocation(program, name);
        entry = {program, locations};
        this.programs.set(key, entry);
        this.compileCount++;
        return entry;
    }

    #frameUniforms(locations, scene, frame) {
        this.#uniformMatrix4fv(locations.uViewProjection, frame.viewProjection);
        this.#uniform3fv(locations.uCameraPosition, frame.cameraPosition);
        this.#uniform3fv(locations.uCameraRight, frame.cameraRight);
        this.#uniform3fv(locations.uCameraUp, frame.cameraUp);
        this.#uniform3fv(locations.uLightDirection, frame.lightDirection);
        this.#uniform3fv(locations.uLightColor, frame.lightColor);
        this.#uniform1f(locations.uLightIntensity, frame.lightIntensity);
        this.#uniform3fv(locations.uAmbientColor, scene.ambientColor);
        this.#uniform1f(locations.uAmbientIntensity, scene.ambientIntensity);
    }

    #bindLocalLights(locations, selection) {
        const gl = this.gl;
        this.#uniform1i(locations.uLocalLightCount, selection.count);
        if (locations['uLocalLightPositionRange[0]'] !== null) {
            gl.uniform4fv(locations['uLocalLightPositionRange[0]'], selection.positionRange);
            gl.uniform4fv(locations['uLocalLightColorIntensity[0]'], selection.colorIntensity);
            gl.uniform4fv(locations['uLocalLightDirectionOuter[0]'], selection.directionOuter);
            gl.uniform1fv(locations['uLocalLightInnerCos[0]'], selection.innerCos);
        }
    }

    #distanceSquared(position, camera) {
        const x = position[0] - camera[0];
        const y = position[1] - camera[1];
        const z = position[2] - camera[2];
        return x * x + y * y + z * z;
    }

    #uniform1i(location, value) {
        if (location !== null) this.gl.uniform1i(location, value);
    }

    #uniform1f(location, value) {
        if (location !== null) this.gl.uniform1f(location, value);
    }

    #uniform2f(location, x, y) {
        if (location !== null) this.gl.uniform2f(location, x, y);
    }

    #uniform3fv(location, value) {
        if (location !== null) this.gl.uniform3fv(location, value);
    }

    #uniformMatrix4fv(location, value) {
        if (location !== null) this.gl.uniformMatrix4fv(location, false, value);
    }
}

export {INSTANCE_STRIDE as EFFECT_INSTANCE_STRIDE};
