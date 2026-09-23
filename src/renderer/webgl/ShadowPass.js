import {ObjectKind} from '../../constants.js';
import {INSTANCE_STRIDE} from '../../engine/InstanceGroup.js';
import {AlphaMode} from '../../materials/MaterialStore.js';
import {createMat4, lookAt, multiply, orthographic} from '../../math/mat4.js';
import {composeEulerTrs} from '../../models/modelMath.js';
import {bindGeometryIndexBuffer} from './GeometryGpuCache.js';
import {createProgram} from './shader.js';
import {JOINT_PALETTE_TEXTURE_UNIT} from './JointPaletteCache.js';

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
const SHADOW_INSTANCE_STRIDE = 17;
const SHADOW_INSTANCE_BYTE_STRIDE = SHADOW_INSTANCE_STRIDE * FLOAT_SIZE;

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec4 aModel0;
layout(location = 3) in vec4 aModel1;
layout(location = 4) in vec4 aModel2;
layout(location = 5) in vec4 aModel3;
layout(location = 7) in vec2 aUv;
layout(location = 8) in float aInstanceAlpha;
uniform mat4 uLightViewProjection;
uniform vec2 uUvOffset;
uniform vec2 uUvRepeat;
uniform float uUvRotation;
out vec2 vUv;
flat out float vInstanceAlpha;

void main() {
    mat4 model = mat4(aModel0, aModel1, aModel2, aModel3);
    vec3 worldPosition = (model * vec4(aPosition, 1.0)).xyz;
    vec2 centeredUv = aUv - vec2(0.5);
    float uvSine = sin(uUvRotation);
    float uvCosine = cos(uUvRotation);
    vUv = mat2(uvCosine, uvSine, -uvSine, uvCosine) * centeredUv * uUvRepeat + uUvOffset + vec2(0.5);
    vInstanceAlpha = aInstanceAlpha;
    gl_Position = uLightViewProjection * vec4(worldPosition, 1.0);
}`;

const SKINNED_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec4 aModel0;
layout(location = 3) in vec4 aModel1;
layout(location = 4) in vec4 aModel2;
layout(location = 5) in vec4 aModel3;
layout(location = 7) in vec2 aUv;
layout(location = 8) in float aInstanceAlpha;
layout(location = 11) in vec4 aJoints;
layout(location = 12) in vec4 aWeights;
uniform mat4 uLightViewProjection;
uniform sampler2D uJointPalette;
uniform vec2 uUvOffset;
uniform vec2 uUvRepeat;
uniform float uUvRotation;
out vec2 vUv;
flat out float vInstanceAlpha;

mat4 jointMatrix(float joint) {
    int row = int(joint + 0.5);
    return mat4(
        texelFetch(uJointPalette, ivec2(0, row), 0),
        texelFetch(uJointPalette, ivec2(1, row), 0),
        texelFetch(uJointPalette, ivec2(2, row), 0),
        texelFetch(uJointPalette, ivec2(3, row), 0)
    );
}

void main() {
    mat4 skin = jointMatrix(aJoints.x) * aWeights.x +
        jointMatrix(aJoints.y) * aWeights.y +
        jointMatrix(aJoints.z) * aWeights.z +
        jointMatrix(aJoints.w) * aWeights.w;
    mat4 model = mat4(aModel0, aModel1, aModel2, aModel3);
    vec3 worldPosition = (model * skin * vec4(aPosition, 1.0)).xyz;
    vec2 centeredUv = aUv - vec2(0.5);
    float uvSine = sin(uUvRotation);
    float uvCosine = cos(uUvRotation);
    vUv = mat2(uvCosine, uvSine, -uvSine, uvCosine) * centeredUv * uUvRepeat + uUvOffset + vec2(0.5);
    vInstanceAlpha = aInstanceAlpha;
    gl_Position = uLightViewProjection * vec4(worldPosition, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
void main() {}
`;

export const CUTOUT_SHADOW_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 vUv;
flat in float vInstanceAlpha;
uniform sampler2D uTexture;
uniform bool uTextured;
uniform float uOpacity;
uniform float uAlphaCutoff;

void main() {
    float alpha = vInstanceAlpha * uOpacity;
    if (uTextured) alpha *= texture(uTexture, vUv).a;
    if (alpha < uAlphaCutoff) discard;
}
`;

export class ShadowPass {
    /** @param {import('./JointPaletteCache.js').JointPaletteCache | null} jointPaletteCache */
    constructor(gl, geometryCache, textureCache, fallbackGeometry, jointPaletteCache = null) {
        this.gl = gl;
        this.geometryCache = geometryCache;
        this.fallbackGeometry = fallbackGeometry;
        this.textureCache = textureCache;
        this.jointPaletteCache = jointPaletteCache;
        this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        this.cutoutProgram = createProgram(gl, VERTEX_SHADER, CUTOUT_SHADOW_FRAGMENT_SHADER);
        this.skinnedProgram = createProgram(gl, SKINNED_VERTEX_SHADER, FRAGMENT_SHADER);
        this.skinnedCutoutProgram = createProgram(gl, SKINNED_VERTEX_SHADER, CUTOUT_SHADOW_FRAGMENT_SHADER);
        this.vertexArrays = new Map();
        this.skinnedVertexArrays = new Map();
        this.instanceBuffer = gl.createBuffer();
        this.instanceData = new Float32Array(0);
        this.casterCount = 0;
        this.batches = [];
        this.batchByMaterial = new Map();
        this.framebuffer = null;
        this.texture = null;
        this.mapSize = 0;
        this.active = false;
        this.lastScene = null;
        this.lastVersion = -1;
        this.lastLightId = -1;
        this.projection = createMat4();
        this.view = createMat4();
        this.viewProjection = createMat4();
        this.matrixScratch = createMat4();
        this.eye = new Float32Array(3);
        this.center = new Float32Array(3);
        this.up = new Float32Array([0, 1, 0]);
        this.metrics = {
            passes: 0,
            drawCalls: 0,
            triangles: 0,
            cpuTime: 0,
            casters: 0,
            mapUpdates: 0,
            skinnedDrawCalls: 0,
            candidates: 0,
            frustumRejected: 0,
            visibleCasters: 0,
            spatialCandidates: 0,
            spatialQueryTime: 0,
            visibilityReused: 0,
            instanceUploadBytes: 0
        };
        this.viewProjectionLocation = gl.getUniformLocation(this.program, 'uLightViewProjection');
        this.skinnedViewProjectionLocation = gl.getUniformLocation(this.skinnedProgram, 'uLightViewProjection');
        this.skinnedPaletteLocation = gl.getUniformLocation(this.skinnedProgram, 'uJointPalette');
        this.cutoutLocations = {
            viewProjection: gl.getUniformLocation(this.cutoutProgram, 'uLightViewProjection'),
            texture: gl.getUniformLocation(this.cutoutProgram, 'uTexture'),
            textured: gl.getUniformLocation(this.cutoutProgram, 'uTextured'),
            opacity: gl.getUniformLocation(this.cutoutProgram, 'uOpacity'),
            alphaCutoff: gl.getUniformLocation(this.cutoutProgram, 'uAlphaCutoff'),
            uvOffset: gl.getUniformLocation(this.cutoutProgram, 'uUvOffset'),
            uvRepeat: gl.getUniformLocation(this.cutoutProgram, 'uUvRepeat'),
            uvRotation: gl.getUniformLocation(this.cutoutProgram, 'uUvRotation')
        };
        this.skinnedCutoutLocations = {
            viewProjection: gl.getUniformLocation(this.skinnedCutoutProgram, 'uLightViewProjection'),
            jointPalette: gl.getUniformLocation(this.skinnedCutoutProgram, 'uJointPalette'),
            texture: gl.getUniformLocation(this.skinnedCutoutProgram, 'uTexture'),
            textured: gl.getUniformLocation(this.skinnedCutoutProgram, 'uTextured'),
            opacity: gl.getUniformLocation(this.skinnedCutoutProgram, 'uOpacity'),
            alphaCutoff: gl.getUniformLocation(this.skinnedCutoutProgram, 'uAlphaCutoff'),
            uvOffset: gl.getUniformLocation(this.skinnedCutoutProgram, 'uUvOffset'),
            uvRepeat: gl.getUniformLocation(this.skinnedCutoutProgram, 'uUvRepeat'),
            uvRotation: gl.getUniformLocation(this.skinnedCutoutProgram, 'uUvRotation')
        };
    }

    render(scene, lightId, textureUnit = 0) {
        this.#resetMetrics();
        const objects = scene.objects;
        if (!scene.shadowsEnabled || lightId < 0 || !objects.castsShadow[lightId]) {
            this.active = false;
            return this.metrics;
        }

        const mapSize = objects.shadowMapSize[lightId];
        this.#ensureTarget(mapSize);
        this.active = true;
        if (this.lastScene === scene && this.lastVersion === scene.shadowRenderVersion &&
            this.lastLightId === lightId) {
            this.metrics.casters = this.casterCount;
            this.metrics.visibleCasters = this.casterCount;
            this.metrics.visibilityReused = 1;
            return this.metrics;
        }

        const start = performance.now();
        this.#updateMatrix(scene, lightId);
        const visibility = scene.visibility.prepareShadow(this.viewProjection);
        this.metrics.candidates = visibility.shadowCandidates;
        this.metrics.frustumRejected = visibility.shadowFrustumRejected;
        this.metrics.visibleCasters = visibility.shadowVisible;
        this.metrics.spatialCandidates = visibility.spatialCandidates;
        this.metrics.spatialQueryTime = visibility.spatialQueryCpuTime;
        this.metrics.visibilityReused = visibility.visibilityReused;
        this.#uploadCasters(scene);

        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, mapSize, mapSize);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.colorMask(false, false, false, false);
        gl.depthMask(true);
        gl.depthFunc(gl.LEQUAL);
        gl.clearDepth(1);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        if (this.casterCount > 0) {
            let currentProgram = null;
            let currentTexture = -2;
            let currentGeometry = '';
            for (const batch of this.batches) {
                const skinned = Boolean(batch.skinnedItem);
                const geometryKey = `${batch.geometryId}:${skinned ? 1 : 0}`;
                if (geometryKey !== currentGeometry) {
                    const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
                    const resource = geometryStore?.resourceForId(batch.geometryId);
                    if (!resource) continue;
                    gl.bindVertexArray(this.#vertexArrayFor(this.geometryCache.get(resource), skinned));
                    currentGeometry = geometryKey;
                }
                if (batch.cutout) {
                    const material = scene.materials.resourceForId(batch.materialId) ?? scene.materials.defaultMaterial;
                    const program = skinned ? this.skinnedCutoutProgram : this.cutoutProgram;
                    const locations = skinned ? this.skinnedCutoutLocations : this.cutoutLocations;
                    if (currentProgram !== program) {
                        currentProgram = program;
                        gl.useProgram(program);
                        gl.uniformMatrix4fv(locations.viewProjection, false, this.viewProjection);
                        gl.uniform1i(locations.texture, textureUnit);
                    }
                    gl.uniform1f(locations.opacity, material.opacity);
                    gl.uniform1f(locations.alphaCutoff, material.alphaCutoff);
                    const resource = scene.textures?.resourceForId(material.textureId);
                    const textured = Boolean(resource && resource.state === 'ready');
                    gl.uniform1i(locations.textured, textured ? 1 : 0);
                    if (textured) {
                        if (material.textureId !== currentTexture) {
                            gl.activeTexture(gl.TEXTURE0 + textureUnit);
                            gl.bindTexture(gl.TEXTURE_2D, this.textureCache.get(resource));
                            currentTexture = material.textureId;
                        }
                        gl.uniform2f(locations.uvOffset, resource.uv[0], resource.uv[1]);
                        gl.uniform2f(locations.uvRepeat, resource.uv[2], resource.uv[3]);
                        gl.uniform1f(locations.uvRotation, resource.uv[4]);
                    } else {
                        gl.uniform2f(locations.uvOffset, 0, 0);
                        gl.uniform2f(locations.uvRepeat, 1, 1);
                        gl.uniform1f(locations.uvRotation, 0);
                    }
                } else {
                    const program = skinned ? this.skinnedProgram : this.program;
                    if (currentProgram !== program) {
                        currentProgram = program;
                        gl.useProgram(program);
                        gl.uniformMatrix4fv(
                            skinned ? this.skinnedViewProjectionLocation : this.viewProjectionLocation,
                            false,
                            this.viewProjection
                        );
                    }
                }
                if (skinned) {
                    if (!this.jointPaletteCache) throw new Error('Joint palette cache is unavailable');
                    this.jointPaletteCache.bind(batch.skinnedItem);
                    const location = batch.cutout ? this.skinnedCutoutLocations.jointPalette : this.skinnedPaletteLocation;
                    gl.uniform1i(location, JOINT_PALETTE_TEXTURE_UNIT);
                }
                this.#bindInstanceRange(batch.offset);
                const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
                const geometry = this.geometryCache.get(geometryStore.resourceForId(batch.geometryId));
                if (geometry.indexCount > 0) {
                    gl.drawElementsInstanced(gl.TRIANGLES, geometry.indexCount, gl.UNSIGNED_INT, 0, batch.count);
                } else {
                    gl.drawArraysInstanced(gl.TRIANGLES, 0, geometry.vertexCount, batch.count);
                }
                this.metrics.drawCalls++;
                if (skinned) this.metrics.skinnedDrawCalls++;
                this.metrics.triangles += geometry.triangleCount * batch.count;
            }
        }

        this.lastScene = scene;
        this.lastVersion = scene.shadowRenderVersion;
        this.lastLightId = lightId;
        this.metrics.passes = 1;
        this.metrics.mapUpdates = 1;
        this.metrics.casters = this.casterCount;
        this.metrics.cpuTime = performance.now() - start;
        return this.metrics;
    }

    invalidate() {
        this.lastVersion = -1;
        this.lastScene = null;
    }

    releaseTarget() {
        this.#deleteTarget();
        this.active = false;
        this.casterCount = 0;
        this.batches.length = 0;
        this.batchByMaterial.clear();
        this.invalidate();
        this.#resetMetrics();
    }

    releaseGeometry(resource) {
        const vertexArray = this.vertexArrays.get(resource);
        if (vertexArray) this.gl.deleteVertexArray(vertexArray);
        this.vertexArrays.delete(resource);
        const skinnedVertexArray = this.skinnedVertexArrays.get(resource);
        if (skinnedVertexArray) this.gl.deleteVertexArray(skinnedVertexArray);
        this.skinnedVertexArrays.delete(resource);
    }

    dispose() {
        const gl = this.gl;
        this.releaseTarget();
        gl.deleteBuffer(this.instanceBuffer);
        for (const vertexArray of this.vertexArrays.values()) gl.deleteVertexArray(vertexArray);
        this.vertexArrays.clear();
        for (const vertexArray of this.skinnedVertexArrays.values()) gl.deleteVertexArray(vertexArray);
        this.skinnedVertexArrays.clear();
        gl.deleteProgram(this.program);
        gl.deleteProgram(this.cutoutProgram);
        gl.deleteProgram(this.skinnedProgram);
        gl.deleteProgram(this.skinnedCutoutProgram);
    }

    #resetMetrics() {
        this.metrics.passes = 0;
        this.metrics.drawCalls = 0;
        this.metrics.triangles = 0;
        this.metrics.cpuTime = 0;
        this.metrics.casters = 0;
        this.metrics.mapUpdates = 0;
        this.metrics.skinnedDrawCalls = 0;
        this.metrics.candidates = 0;
        this.metrics.frustumRejected = 0;
        this.metrics.visibleCasters = 0;
        this.metrics.spatialCandidates = 0;
        this.metrics.spatialQueryTime = 0;
        this.metrics.visibilityReused = 0;
        this.metrics.instanceUploadBytes = 0;
    }

    #ensureTarget(size) {
        if (this.framebuffer && this.mapSize === size) return;
        const gl = this.gl;
        this.#deleteTarget();
        this.texture = gl.createTexture();
        this.framebuffer = gl.createFramebuffer();
        if (!this.texture || !this.framebuffer) {
            this.#deleteTarget();
            throw new Error('Could not allocate the directional shadow map');
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.DEPTH_COMPONENT24,
            size,
            size,
            0,
            gl.DEPTH_COMPONENT,
            gl.UNSIGNED_INT,
            null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.texture, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            this.#deleteTarget();
            throw new Error('Directional shadow framebuffer is incomplete');
        }
        this.mapSize = size;
        this.invalidate();
    }

    #deleteTarget() {
        if (this.texture) this.gl.deleteTexture(this.texture);
        if (this.framebuffer) this.gl.deleteFramebuffer(this.framebuffer);
        this.texture = null;
        this.framebuffer = null;
        this.mapSize = 0;
    }

    #updateMatrix(scene, lightId) {
        const objects = scene.objects;
        const offset = lightId * 3;
        const pitch = objects.rotation[offset];
        const yaw = objects.rotation[offset + 1];
        const directionX = Math.sin(yaw) * Math.cos(pitch);
        const directionY = -Math.sin(pitch);
        const directionZ = -Math.cos(yaw) * Math.cos(pitch);
        const distance = objects.shadowDistance[lightId];
        this.center[0] = objects.position[offset];
        this.center[1] = objects.position[offset + 1];
        this.center[2] = objects.position[offset + 2];
        this.eye[0] = this.center[0] - directionX * distance;
        this.eye[1] = this.center[1] - directionY * distance;
        this.eye[2] = this.center[2] - directionZ * distance;
        this.up[0] = 0;
        if (Math.abs(directionY) > 0.98) {
            this.up[1] = 0;
            this.up[2] = 1;
        } else {
            this.up[1] = 1;
            this.up[2] = 0;
        }
        lookAt(this.view, this.eye, this.center, this.up);
        const bounds = objects.shadowBounds[lightId];
        orthographic(
            this.projection,
            -bounds,
            bounds,
            -bounds,
            bounds,
            objects.shadowNear[lightId],
            objects.shadowFar[lightId]
        );
        multiply(this.viewProjection, this.projection, this.view);
    }

    #uploadCasters(scene) {
        this.batches.length = 0;
        this.batchByMaterial.clear();
        const objects = scene.objects;
        const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
        const cubeGeometryId = geometryStore.cube.id;
        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] === ObjectKind.CUBE && objects.visible[id] && objects.castsShadow[id]) {
                if (!scene.visibility.objectVisible(id, true)) continue;
                if (this.#castsOpaqueShadow(scene, objects.materialIds[id])) {
                    this.#countBatch(scene, cubeGeometryId, objects.materialIds[id], 1);
                }
            }
        }
        for (const group of scene.instanceGroups.values()) {
            if (group.visible && group.castsShadow && this.#castsOpaqueShadow(scene, group.materialId)) {
                const count = this.#visibleGroupCount(scene, group);
                if (count > 0) this.#countBatch(scene, cubeGeometryId, group.materialId, count);
            }
        }
        for (const model of scene.modelInstances.values()) {
            if (!model.visible || !model.castsShadow || !scene.visibility.modelVisible(model, true)) continue;
            model.updateMatrices();
            for (const item of model.activeRenderItems) {
                if (!scene.visibility.shadowIntersectsItem(item)) continue;
                const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                if (this.#castsOpaqueShadow(scene, materialId)) {
                    this.#countBatch(scene, item.primitive.geometryId, materialId, 1, item.skinIndex >= 0 ? item : null);
                }
            }
        }
        for (const terrain of scene.terrains.resources.values()) {
            if (!terrain.visible || !terrain.castsShadow || !scene.visibility.terrainVisible(terrain, true)) continue;
            terrain.updateMatrices();
            for (const item of terrain.activeRenderItems) {
                if (!scene.visibility.shadowIntersectsItem(item)) continue;
                const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                if (this.#castsOpaqueShadow(scene, materialId)) {
                    this.#countBatch(scene, item.primitive.geometryId, materialId, 1);
                }
            }
        }
        this.batches.sort((left, right) =>
            Number(left.cutout) - Number(right.cutout) || left.textureId - right.textureId ||
            left.materialId - right.materialId || left.geometryId - right.geometryId ||
            String(left.skinnedItem?.skinBatchKey ?? '').localeCompare(String(right.skinnedItem?.skinBatchKey ?? ''))
        );
        let count = 0;
        for (const batch of this.batches) {
            batch.offset = count;
            batch.writeOffset = count * SHADOW_INSTANCE_STRIDE;
            count += batch.count;
        }
        const requiredLength = count * SHADOW_INSTANCE_STRIDE;
        if (this.instanceData.length < requiredLength) {
            this.instanceData = new Float32Array(Math.max(
                requiredLength,
                this.instanceData.length * 2,
                64 * SHADOW_INSTANCE_STRIDE
            ));
        }

        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id] || !objects.castsShadow[id]) continue;
            if (!scene.visibility.objectVisible(id, true)) continue;
            if (!this.#castsOpaqueShadow(scene, objects.materialIds[id])) continue;
            const batch = this.#batchFor(scene, cubeGeometryId, objects.materialIds[id]);
            const outputOffset = batch.writeOffset;
            const vectorOffset = id * 3;
            this.#writeTrs(
                outputOffset,
                objects.position,
                vectorOffset,
                objects.rotation,
                vectorOffset,
                objects.scale,
                vectorOffset,
                objects.color[id * 4 + 3]
            );
            batch.writeOffset += SHADOW_INSTANCE_STRIDE;
        }
        for (const group of scene.instanceGroups.values()) {
            if (!group.visible || !group.castsShadow) continue;
            if (!this.#castsOpaqueShadow(scene, group.materialId)) continue;
            if (this.#visibleGroupCount(scene, group) === 0) continue;
            const batch = this.#batchFor(scene, cubeGeometryId, group.materialId);
            for (let index = 0; index < group.count; index++) {
                if (!scene.visibility.groupInstanceVisible(group, index, true)) continue;
                const sourceOffset = index * INSTANCE_STRIDE;
                const outputOffset = batch.writeOffset;
                this.#writeTrs(
                    outputOffset,
                    group.data,
                    sourceOffset,
                    group.data,
                    sourceOffset + 3,
                    group.data,
                    sourceOffset + 6,
                    group.data[sourceOffset + 12]
                );
                batch.writeOffset += SHADOW_INSTANCE_STRIDE;
            }
        }
        for (const model of scene.modelInstances.values()) {
            if (!model.visible || !model.castsShadow || !scene.visibility.modelVisible(model, true)) continue;
            for (const item of model.activeRenderItems) {
                if (!scene.visibility.shadowIntersectsItem(item)) continue;
                const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                if (!this.#castsOpaqueShadow(scene, materialId)) continue;
                const batch = this.#batchFor(
                    scene,
                    item.primitive.geometryId,
                    materialId,
                    false,
                    item.skinIndex >= 0 ? item : null
                );
                this.instanceData.set(item.matrix, batch.writeOffset);
                this.instanceData[batch.writeOffset + 16] = model.color[3];
                batch.writeOffset += SHADOW_INSTANCE_STRIDE;
            }
        }
        for (const terrain of scene.terrains.resources.values()) {
            if (!terrain.visible || !terrain.castsShadow || !scene.visibility.terrainVisible(terrain, true)) continue;
            for (const item of terrain.activeRenderItems) {
                if (!scene.visibility.shadowIntersectsItem(item)) continue;
                const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                if (!this.#castsOpaqueShadow(scene, materialId)) continue;
                const batch = this.#batchFor(scene, item.primitive.geometryId, materialId);
                this.instanceData.set(item.matrix, batch.writeOffset);
                this.instanceData[batch.writeOffset + 16] = terrain.color[3];
                batch.writeOffset += SHADOW_INSTANCE_STRIDE;
            }
        }

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, requiredLength), gl.DYNAMIC_DRAW);
        this.casterCount = count;
        this.metrics.visibleCasters = count;
        this.metrics.instanceUploadBytes = requiredLength * Float32Array.BYTES_PER_ELEMENT;
    }

    #visibleGroupCount(scene, group) {
        let count = 0;
        for (let index = 0; index < group.count; index++) {
            if (scene.visibility.groupInstanceVisible(group, index, true)) count++;
        }
        return count;
    }

    /** @param {{skinBatchKey: string} | null} skinnedItem */
    #countBatch(scene, geometryId, materialId, count, skinnedItem = null) {
        const batch = this.#batchFor(scene, geometryId, materialId, true, skinnedItem);
        batch.count += count;
    }

    #castsOpaqueShadow(scene, materialId) {
        const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
        return !material.customShader && material.alphaMode !== AlphaMode.BLEND;
    }

    /** @param {{skinBatchKey: string} | null} skinnedItem */
    #batchFor(scene, geometryId, materialId, create = false, skinnedItem = null) {
        const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
        const key = `${geometryId}:${material.alphaMode === AlphaMode.CUTOUT ? material.id : -1}:${skinnedItem?.skinBatchKey ?? ''}`;
        let batch = this.batchByMaterial.get(key);
        if (!batch && create) {
            batch = {
                geometryId,
                materialId: material.id,
                textureId: material.textureId,
                cutout: material.alphaMode === AlphaMode.CUTOUT,
                skinnedItem,
                count: 0,
                offset: 0,
                writeOffset: 0
            };
            this.batchByMaterial.set(key, batch);
            this.batches.push(batch);
        }
        if (!batch) throw new Error(`Missing shadow batch for material ${material.id}`);
        return batch;
    }

    #bindInstanceRange(instanceOffset) {
        const gl = this.gl;
        const byteOffset = instanceOffset * SHADOW_INSTANCE_BYTE_STRIDE;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, SHADOW_INSTANCE_BYTE_STRIDE, byteOffset);
        gl.vertexAttribPointer(3, 4, gl.FLOAT, false, SHADOW_INSTANCE_BYTE_STRIDE, byteOffset + 4 * FLOAT_SIZE);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, false, SHADOW_INSTANCE_BYTE_STRIDE, byteOffset + 8 * FLOAT_SIZE);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, false, SHADOW_INSTANCE_BYTE_STRIDE, byteOffset + 12 * FLOAT_SIZE);
        gl.vertexAttribPointer(8, 1, gl.FLOAT, false, SHADOW_INSTANCE_BYTE_STRIDE, byteOffset + 16 * FLOAT_SIZE);
    }

    #vertexArrayFor(geometry, skinned = false) {
        const cache = skinned ? this.skinnedVertexArrays : this.vertexArrays;
        const cached = cache.get(geometry.resource);
        if (cached) {
            if (geometry.resource.custom) {
                this.gl.bindVertexArray(cached);
                bindGeometryIndexBuffer(this.gl, geometry);
            }
            return cached;
        }
        const gl = this.gl;
        const vertexArray = gl.createVertexArray();
        gl.bindVertexArray(vertexArray);
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, geometry.stride, 0);
        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 2, gl.FLOAT, false, geometry.stride, 10 * FLOAT_SIZE);
        if (skinned) {
            if (!geometry.skinBuffer) throw new Error('Skinned shadow draw is missing joint vertex data');
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.skinBuffer);
            gl.enableVertexAttribArray(11);
            gl.vertexAttribPointer(11, 4, gl.FLOAT, false, geometry.skinStride, 0);
            gl.enableVertexAttribArray(12);
            gl.vertexAttribPointer(12, 4, gl.FLOAT, false, geometry.skinStride, 4 * FLOAT_SIZE);
        }
        bindGeometryIndexBuffer(gl, geometry);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        this.#instanceAttribute(2, 4, 0);
        this.#instanceAttribute(3, 4, 4);
        this.#instanceAttribute(4, 4, 8);
        this.#instanceAttribute(5, 4, 12);
        this.#instanceAttribute(8, 1, 16);
        gl.bindVertexArray(null);
        cache.set(geometry.resource, vertexArray);
        return vertexArray;
    }

    #writeTrs(outputOffset, position, positionOffset, rotation, rotationOffset, scale, scaleOffset, alpha) {
        composeEulerTrs(
            this.matrixScratch,
            position.subarray(positionOffset, positionOffset + 3),
            rotation.subarray(rotationOffset, rotationOffset + 3),
            scale.subarray(scaleOffset, scaleOffset + 3)
        );
        this.instanceData.set(this.matrixScratch, outputOffset);
        this.instanceData[outputOffset + 16] = alpha;
    }

    #instanceAttribute(location, size, floatOffset) {
        const gl = this.gl;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
            location,
            size,
            gl.FLOAT,
            false,
            SHADOW_INSTANCE_BYTE_STRIDE,
            floatOffset * FLOAT_SIZE
        );
        gl.vertexAttribDivisor(location, 1);
    }
}
