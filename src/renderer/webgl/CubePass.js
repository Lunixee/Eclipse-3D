import {ObjectKind} from '../../constants.js';
import {createMat4, safeAspect} from '../../math/mat4.js';
import {INSTANCE_STRIDE} from '../../engine/InstanceGroup.js';
import {GeometryStore} from '../../geometry/GeometryStore.js';
import {composeEulerTrs} from '../../models/modelMath.js';
import {AlphaMode, MaterialType, PBR_TEXTURE_PROPERTIES} from '../../materials/MaterialStore.js';
import {MaterialProgramCache, materialShaderKey} from './MaterialProgramCache.js';
import {
    EnvironmentPass,
    IRRADIANCE_UNIT,
    PREFILTERED_UNIT
} from './EnvironmentPass.js';
import {ShadowPass} from './ShadowPass.js';
import {TextureCache} from './TextureCache.js';
import {LocalLightSelector, MAX_LOCAL_LIGHTS} from './LocalLightSelector.js';
import {bindGeometryIndexBuffer, GeometryGpuCache} from './GeometryGpuCache.js';
import {JointPaletteCache, JOINT_PALETTE_TEXTURE_UNIT} from './JointPaletteCache.js';
import {EffectPass} from './EffectPass.js';

const DEGREES_TO_RADIANS = Math.PI / 180;
const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
const RENDER_INSTANCE_STRIDE = 21;
const INSTANCE_BYTE_STRIDE = RENDER_INSTANCE_STRIDE * FLOAT_SIZE;
const PBR_SAMPLERS = Object.freeze([
    'uBaseColorTexture',
    'uNormalTexture',
    'uMetallicTexture',
    'uRoughnessTexture',
    'uMetallicRoughnessTexture',
    'uEmissiveTexture',
    'uAoTexture'
]);
const PBR_COLOR_ROLES = new Set([0, 5]);
const MAX_TEXTURE_UNITS_USED = JOINT_PALETTE_TEXTURE_UNIT + 1;
const LOCAL_LIGHT_GROUP_CHUNK_SIZE = 256;

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aModel0;
layout(location = 3) in vec4 aModel1;
layout(location = 4) in vec4 aModel2;
layout(location = 5) in vec4 aModel3;
layout(location = 6) in vec4 aInstanceColor;
layout(location = 7) in vec2 aUv;
layout(location = 8) in float aReceiveShadow;
layout(location = 9) in vec4 aTangent;
layout(location = 10) in vec4 aVertexColor;

uniform mat4 uViewProjection;
uniform vec2 uUvOffset;
uniform vec2 uUvRepeat;
uniform float uUvRotation;
out vec3 vNormal;
out vec4 vColor;
out vec2 vUv;
out vec2 vRawUv;
out vec3 vWorldPosition;
out vec4 vTangent;
flat out float vReceiveShadow;

void main() {
    mat4 model = mat4(aModel0, aModel1, aModel2, aModel3);
    vec3 worldPosition = (model * vec4(aPosition, 1.0)).xyz;
    mat3 linear = mat3(model);
    vec3 scaleSquared = max(vec3(
        dot(linear[0], linear[0]),
        dot(linear[1], linear[1]),
        dot(linear[2], linear[2])
    ), vec3(1e-8));
    vNormal = normalize(linear * (aNormal / scaleSquared));
    vColor = aInstanceColor * aVertexColor;
    float orientation = determinant(linear) < 0.0 ? -1.0 : 1.0;
    vTangent = vec4(normalize(linear * aTangent.xyz), aTangent.w * orientation);
    vWorldPosition = worldPosition;
    vReceiveShadow = aReceiveShadow;
    vRawUv = aUv;
    vec2 centeredUv = aUv - vec2(0.5);
    float uvSine = sin(uUvRotation);
    float uvCosine = cos(uUvRotation);
    vUv = mat2(uvCosine, uvSine, -uvSine, uvCosine) * centeredUv * uUvRepeat + uUvOffset + vec2(0.5);
    gl_Position = uViewProjection * vec4(worldPosition, 1.0);
}`;

const SKINNED_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aModel0;
layout(location = 3) in vec4 aModel1;
layout(location = 4) in vec4 aModel2;
layout(location = 5) in vec4 aModel3;
layout(location = 6) in vec4 aInstanceColor;
layout(location = 7) in vec2 aUv;
layout(location = 8) in float aReceiveShadow;
layout(location = 9) in vec4 aTangent;
layout(location = 10) in vec4 aVertexColor;
layout(location = 11) in vec4 aJoints;
layout(location = 12) in vec4 aWeights;

uniform mat4 uViewProjection;
uniform sampler2D uJointPalette;
uniform vec2 uUvOffset;
uniform vec2 uUvRepeat;
uniform float uUvRotation;
out vec3 vNormal;
out vec4 vColor;
out vec2 vUv;
out vec2 vRawUv;
out vec3 vWorldPosition;
out vec4 vTangent;
flat out float vReceiveShadow;

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
    vec3 skinnedPosition = (skin * vec4(aPosition, 1.0)).xyz;
    mat3 skinLinear = mat3(skin);
    float skinDeterminant = determinant(skinLinear);
    vec3 skinnedNormal = abs(skinDeterminant) > 1e-8 ? transpose(inverse(skinLinear)) * aNormal : aNormal;
    vec3 skinnedTangent = skinLinear * aTangent.xyz;
    mat4 model = mat4(aModel0, aModel1, aModel2, aModel3);
    vec3 worldPosition = (model * vec4(skinnedPosition, 1.0)).xyz;
    mat3 linear = mat3(model);
    vec3 scaleSquared = max(vec3(
        dot(linear[0], linear[0]),
        dot(linear[1], linear[1]),
        dot(linear[2], linear[2])
    ), vec3(1e-8));
    vNormal = normalize(linear * (skinnedNormal / scaleSquared));
    vColor = aInstanceColor * aVertexColor;
    float orientation = determinant(linear) < 0.0 ? -1.0 : 1.0;
    vTangent = vec4(normalize(linear * skinnedTangent), aTangent.w * orientation);
    vWorldPosition = worldPosition;
    vReceiveShadow = aReceiveShadow;
    vRawUv = aUv;
    vec2 centeredUv = aUv - vec2(0.5);
    float uvSine = sin(uUvRotation);
    float uvCosine = cos(uUvRotation);
    vUv = mat2(uvCosine, uvSine, -uvSine, uvCosine) * centeredUv * uUvRepeat + uUvOffset + vec2(0.5);
    gl_Position = uViewProjection * vec4(worldPosition, 1.0);
}`;

export class CubePass {
    constructor(gl) {
        if (!(gl instanceof WebGL2RenderingContext)) {
            throw new Error('The prototype renderer requires WebGL 2');
        }
        this.gl = gl;
        this.programCache = new MaterialProgramCache(gl, VERTEX_SHADER, SKINNED_VERTEX_SHADER);
        this.instanceBuffer = gl.createBuffer();
        this.geometryCache = new GeometryGpuCache(gl);
        this.vertexArrays = new Map();
        this.skinnedVertexArrays = new Map();
        this.jointPaletteCache = new JointPaletteCache(gl);
        this.fallbackGeometry = new GeometryStore();
        this.instanceData = new Float32Array(0);
        this.instanceCount = 0;
        this.instanceUploadCount = 0;
        this.batches = [];
        this.batchByMaterial = new Map();
        this.uploadedVersion = -1;
        this.uploadedMaterialBatchVersion = -1;
        this.uploadedVisibilityStamp = -1;
        this.uploadedScene = null;
        // Exact logical identities in traversal order, independent of material sorting.
        // Camera queries can change without changing the data in the resident buffer.
        this.visibleInstanceKeys = [];
        this.visibleInstanceMaterialIds = [];
        this.instanceBatchBuildCount = 0;
        this.renderDistance = 0;
        this.lastInstanceUploadBytes = 0;
        this.lastInstanceUploads = 0;
        this.localLightLimit = MAX_LOCAL_LIGHTS;
        this.localLightSelector = new LocalLightSelector();
        this.emptyLightSelection = Object.freeze({count: 0, identityKey: '', dataKey: ''});
        this.textureCache = new TextureCache(gl);
        this.effectPass = new EffectPass(gl, this.geometryCache, this.textureCache, this.fallbackGeometry);
        this.projection = createMat4();
        this.view = createMat4();
        this.viewProjection = createMat4();
        this.matrixScratch = createMat4();
        this.cameraRotation = new Float32Array(9);
        this.effectCameraPosition = new Float32Array(3);
        this.lightDirection = new Float32Array([0.4, -0.8, -0.5]);
        this.lightColor = new Float32Array([1, 1, 1]);
        this.lightIntensity = 1;
        this.effectFrame = {
            viewProjection: this.viewProjection,
            cameraPosition: this.effectCameraPosition,
            cameraRight: this.cameraRotation.subarray(0, 3),
            cameraUp: this.cameraRotation.subarray(3, 6),
            lightDirection: this.lightDirection,
            lightColor: this.lightColor,
            lightIntensity: this.lightIntensity,
            textureUnit: 0,
            localLightSelector: this.localLightSelector
        };
        this.mapUvTransforms = new Float32Array(7 * 4);
        this.mapUvRotations = new Float32Array(7);
        this.assignedMapUnits = new Int32Array(7);
        this.boundTextureIds = new Int32Array(MAX_TEXTURE_UNITS_USED);
        this.boundTextureObjects = new Array(MAX_TEXTURE_UNITS_USED).fill(null);
        this.validatedTextureObjects = new Map();
        this.customTextureBinder = null;
        this.materialStats = {
            materialCount: 0,
            activePrograms: 0,
            shaderCompiles: 0,
            customShaderCompiles: 0,
            customShaderDraws: 0,
            customUniformUploads: 0,
            customGeometryUploads: 0,
            programSwitches: 0,
            materialSwitches: 0,
            textureSwitches: 0,
            pbrPrograms: 0,
            pbrDrawCalls: 0,
            environmentResources: 0,
            environmentPreprocesses: 0,
            environmentPreprocessTime: 0,
            environmentBackgroundDrawCalls: 0,
            environmentIblDrawCalls: 0,
            environmentTextureSwitches: 0,
            totalLocalLights: 0,
            enabledPointLights: 0,
            enabledSpotLights: 0,
            selectedLocalLights: 0,
            selectedPointLights: 0,
            selectedSpotLights: 0,
            selectedLocalLightReferences: 0,
            candidateLocalLightReferences: 0,
            localLightSelectionEvaluations: 0,
            localLightListRebuilds: 0,
            localLightGpuUploads: 0,
            localLightDrawCalls: 0,
            localLightsRejectedByRange: 0,
            localLightsRejectedByCone: 0,
            localLightsRejectedByBudget: 0,
            localLightSelectionTime: 0,
            absoluteMaximumLocalLights: MAX_LOCAL_LIGHTS,
            effectiveLocalLightBudget: MAX_LOCAL_LIGHTS,
            geometryResources: 0,
            geometryUploads: 0,
            geometryGpuBytes: 0,
            modelAssets: 0,
            modelInstances: 0,
            modelPrimitives: 0,
            modelTriangles: 0,
            jointPaletteUploads: 0,
            jointPaletteUploadBytes: 0,
            skinnedDrawCalls: 0,
            visibleInstanceUploads: 0,
            visibleInstanceUploadBytes: 0,
            totalRenderables: 0,
            visibilityCandidates: 0,
            spatialCandidates: 0,
            bruteForceCandidates: 0,
            frustumTested: 0,
            frustumRejected: 0,
            renderDistanceRejected: 0,
            explicitlyHiddenRejected: 0,
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
            spatialPath: 0,
            lodEvaluations: 0,
            lodSwitches: 0,
            lodReused: 0,
            terrainCount: 0,
            terrainTriangles: 0,
            terrainGeometryBuilds: 0,
            terrainGeometryBuildBytes: 0,
            terrainGpuUploads: 0,
            terrainGpuUploadBytes: 0,
            visibleTerrainChunks: 0,
            culledTerrainChunks: 0,
            textLabels: 0,
            visibleTextLabels: 0,
            renderedTextInstances: 0,
            textDrawCalls: 0,
            textRasterizations: 0,
            textTextureUploads: 0,
            sharedTextTextures: 0
        };
        this.shadowPass = new ShadowPass(gl, this.geometryCache, this.textureCache, this.fallbackGeometry, this.jointPaletteCache);
        this.environmentPass = new EnvironmentPass(gl, this.textureCache);
        this.shadowStats = this.shadowPass.metrics;
    }

    setTextureStore(store) {
        this.textureCache.setStore(store);
    }

    setRenderTargetResolver(resolver) {
        this.textureCache.setExternalResolver(resolver);
    }

    setQuality(quality) {
        if (this.renderDistance !== quality.renderDistance) this.uploadedVersion = -1;
        this.renderDistance = quality.renderDistance;
        this.textureCache.setQuality(quality.textureLimits);
        this.environmentPass.setQuality(quality.environmentLimits);
        this.localLightLimit = quality.localLightLimit ?? MAX_LOCAL_LIGHTS;
    }

    invalidateInstances() {
        this.uploadedVersion = -1;
        this.uploadedVisibilityStamp = -1;
        this.shadowPass.invalidate();
        this.effectPass.invalidate();
    }

    releaseSceneResources() {
        this.textureCache.setStore(null);
        this.uploadedVersion = -1;
        this.uploadedVisibilityStamp = -1;
        this.uploadedMaterialBatchVersion = -1;
        this.uploadedScene = null;
        this.visibleInstanceKeys.length = 0;
        this.visibleInstanceMaterialIds.length = 0;
        this.instanceCount = 0;
        this.lastInstanceUploads = 0;
        this.lastInstanceUploadBytes = 0;
        this.batches.length = 0;
        this.batchByMaterial.clear();
        this.shadowPass.releaseTarget();
        this.environmentPass.clear();
        this.localLightSelector.clear();
        this.jointPaletteCache.beginFrame();
        this.jointPaletteCache.sweep();
        this.effectPass.releaseSceneResources();
        this.#sweepGeometryResources();
        this.programCache.custom?.sweep();
    }

    warmMaterial(material, localLights = false) {
        return this.programCache.warm(material, localLights).key;
    }

    releaseUnusedResources() {
        this.#sweepGeometryResources();
        this.programCache.custom?.sweep();
        this.textureCache.sweep();
    }

    render(scene, framebuffer, width, height, textureUnit = 0, shadowTextureUnit = 1, cameraOverride = null) {
        const gl = this.gl;
        this.jointPaletteCache.beginFrame();
        this.textureCache.setStore(scene.textures);
        const camera = this.#findCamera(scene, cameraOverride);
        const cameraOffset = camera * 3;
        const objects = scene.objects;
        const cameraParameters = objects.camera;
        const fieldOfView = cameraParameters[cameraOffset] * DEGREES_TO_RADIANS;
        const aspect = safeAspect(width, height);
        const cameraMatrices = scene.cameraMatrices(camera, width, height);
        this.projection.set(cameraMatrices.projection);
        this.view.set(cameraMatrices.view);
        this.viewProjection.set(cameraMatrices.viewProjection);
        this.#updateCameraRotation();
        scene.updateLods(
            objects.position[cameraOffset],
            objects.position[cameraOffset + 1],
            objects.position[cameraOffset + 2]
        );
        scene.visibility.prepareCamera(
            this.viewProjection,
            objects.position[cameraOffset],
            objects.position[cameraOffset + 1],
            objects.position[cameraOffset + 2],
            this.renderDistance,
            scene.frustumCullingEnabled
        );
        this.effectCameraPosition[0] = objects.position[cameraOffset];
        this.effectCameraPosition[1] = objects.position[cameraOffset + 1];
        this.effectCameraPosition[2] = objects.position[cameraOffset + 2];
        this.localLightSelector.beginFrame(scene, this.localLightLimit);
        if (this.localLightSelector.requiresRefresh && this.#refreshLocalLightSelections(scene)) {
            this.uploadedVersion = -1;
        }
        this.#uploadInstances(scene);
        this.effectPass.prepare(scene, this.effectCameraPosition, this.localLightSelector, this.emptyLightSelection);
        this.localLightSelector.finishFrame(scene);
        const lightId = this.#updateLight(scene);
        this.effectFrame.lightIntensity = this.lightIntensity;
        this.effectFrame.textureUnit = textureUnit;
        this.shadowStats = this.shadowPass.render(scene, lightId, textureUnit);
        const environmentEntry = this.environmentPass.prepare(
            scene,
            Boolean(scene.environment?.backgroundEnabled || this.#hasPbrBatch(scene))
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.depthMask(true);
        gl.depthFunc(gl.LEQUAL);
        gl.colorMask(true, true, true, true);
        gl.clearColor(scene.background[0], scene.background[1], scene.background[2], scene.background[3]);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const backgroundDrawCalls = this.environmentPass.renderBackground(
            environmentEntry,
            scene.environment,
            {fieldOfView, rotation: this.cameraRotation},
            aspect
        );
        if (backgroundDrawCalls > 0) {
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            gl.frontFace(gl.CCW);
            gl.depthMask(true);
            gl.depthFunc(gl.LEQUAL);
        }
        this.textureCache.sweep();
        this.#resetMaterialStats(scene);
        const shadowsActive = this.shadowPass.active && this.shadowPass.texture !== null;
        gl.activeTexture(gl.TEXTURE0 + shadowTextureUnit);
        gl.bindTexture(gl.TEXTURE_2D, shadowsActive ? this.shadowPass.texture : null);
        this.boundTextureIds.fill(-2);
        this.boundTextureIds[shadowTextureUnit] = -3;
        this.boundTextureObjects.fill(null);
        this.boundTextureObjects[shadowTextureUnit] = shadowsActive ? this.shadowPass.texture : null;
        this.validatedTextureObjects.clear();
        let drawCalls = 0;
        let currentProgram = null;
        let currentMaterial = -1;
        let currentCull = true;
        let currentDepthTest = true;
        let currentDepthWrite = true;
        let currentBlend = 'opaque';
        let currentFace = Number(gl.BACK);
        let currentOffsetFactor = 0;
        let currentOffsetUnits = 0;
        let currentGeometry = '';
        for (const batch of this.batches) {
            const material = scene.materials.resourceForId(batch.materialId) ?? scene.materials.defaultMaterial;
            const usesLocalLights = this.#materialUsesLocalLights(material) && batch.lightSelection.count > 0;
            const entry = this.programCache.get(material, usesLocalLights, Boolean(batch.skinnedItem));
            const locations = entry.locations;
            const custom = Boolean(material.customShader);
            if (entry.program !== currentProgram) {
                currentProgram = entry.program;
                gl.useProgram(entry.program);
                this.materialStats.programSwitches++;
                currentMaterial = -1;
                if (custom) this.programCache.custom.bindFrame(entry, this.view, this.projection, this.viewProjection,
                    this.effectCameraPosition, width, height);
                else this.#setFrameUniforms(
                    locations,
                    scene,
                    lightId,
                    cameraOffset,
                    shadowsActive,
                    environmentEntry,
                    textureUnit,
                    shadowTextureUnit
                );
            }
            if (custom) {
                if (material.id !== currentMaterial) this.materialStats.materialSwitches++;
                currentMaterial = material.id;
                this.customTextureBinder ??= (id, unit) => this.#bindTexture(this.textureCache.store?.resourceForId(id), unit);
                this.programCache.custom.bindMaterial(entry, material, this.customTextureBinder);
            } else if (material.id !== currentMaterial) {
                currentMaterial = material.id;
                this.materialStats.materialSwitches++;
                this.#setMaterialUniforms(locations, material);
                if (material.type === MaterialType.PBR) {
                    this.#uniform1f(locations.uEnvironmentIntensity, environmentEntry ? scene.environment.intensity * material.environmentIntensity : 0);
                    this.#uniform1f(locations.uEnvironmentRotation, environmentEntry ? scene.environment.rotation + material.environmentRotation : 0);
                    this.#bindPbrTextures(locations, scene, material, textureUnit, shadowTextureUnit);
                } else {
                    this.#bindLegacyTexture(locations, scene, material, textureUnit);
                }
            }
            if (usesLocalLights) {
                this.#bindLocalLights(locations, batch.lightSelection, entry);
                this.localLightSelector.recordDraw(batch.lightSelection);
            }
            if (batch.skinnedItem) {
                this.jointPaletteCache.bind(batch.skinnedItem);
                this.#uniform1i(locations.uJointPalette, JOINT_PALETTE_TEXTURE_UNIT);
            }
            const cull = !material.doubleSided;
            if (cull !== currentCull) {
                cull ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
                currentCull = cull;
            }
            const face = material.side === 'back' ? gl.FRONT : gl.BACK;
            if (face !== currentFace) { gl.cullFace(face); currentFace = face; }
            if (material.depthTest !== currentDepthTest) {
                material.depthTest ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
                currentDepthTest = material.depthTest;
            }
            if (material.depthWrite !== currentDepthWrite) {
                gl.depthMask(material.depthWrite);
                currentDepthWrite = material.depthWrite;
            }
            const blend = material.alphaMode === AlphaMode.BLEND ? material.blendMode : 'opaque';
            if (blend !== currentBlend) {
                if (blend !== 'opaque') {
                    gl.enable(gl.BLEND);
                    gl.blendEquation(gl.FUNC_ADD);
                    const destination = blend === 'additive' ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA;
                    gl.blendFuncSeparate(gl.SRC_ALPHA, destination, gl.ONE, destination);
                } else {
                    gl.disable(gl.BLEND);
                }
                currentBlend = blend;
            }
            if (material.polygonOffsetFactor !== currentOffsetFactor || material.polygonOffsetUnits !== currentOffsetUnits) {
                currentOffsetFactor = material.polygonOffsetFactor;
                currentOffsetUnits = material.polygonOffsetUnits;
                if (currentOffsetFactor || currentOffsetUnits) {
                    gl.enable(gl.POLYGON_OFFSET_FILL);
                    gl.polygonOffset(currentOffsetFactor, currentOffsetUnits);
                } else gl.disable(gl.POLYGON_OFFSET_FILL);
            }
            const geometryKey = `${batch.geometryId}:${batch.skinnedItem ? 1 : 0}`;
            if (geometryKey !== currentGeometry) {
                const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
                const resource = geometryStore.resourceForId(batch.geometryId);
                if (!resource) continue;
                const geometry = this.geometryCache.get(resource);
                gl.bindVertexArray(this.#vertexArrayFor(geometry, Boolean(batch.skinnedItem)));
                currentGeometry = geometryKey;
            }
            const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
            const resource = geometryStore.resourceForId(batch.geometryId);
            const geometry = resource ? this.geometryCache.get(resource) : null;
            if (!geometry) continue;
            this.#bindInstanceRange(batch.offset);
            if (geometry.indexCount > 0) {
                gl.drawElementsInstanced(gl.TRIANGLES, geometry.indexCount, gl.UNSIGNED_INT, 0, batch.count);
            } else {
                gl.drawArraysInstanced(gl.TRIANGLES, 0, geometry.vertexCount, batch.count);
            }
            drawCalls++;
            if (custom) this.materialStats.customShaderDraws++;
            if (batch.skinnedItem) this.materialStats.skinnedDrawCalls++;
            if (material.type === MaterialType.PBR) this.materialStats.pbrDrawCalls++;
            if (material.type === MaterialType.PBR && environmentEntry) this.environmentPass.metrics.iblDrawCalls++;
        }
        drawCalls += this.effectPass.render(scene, this.effectFrame);
        this.materialStats.activePrograms = this.programCache.size;
        this.materialStats.shaderCompiles = this.programCache.compileCount;
        this.materialStats.customShaderCompiles = this.programCache.custom?.compileCount ?? 0;
        this.materialStats.customUniformUploads = this.programCache.custom?.uniformUploads ?? 0;
        this.materialStats.customGeometryUploads = this.geometryCache.customUploads;
        this.materialStats.pbrPrograms = this.programCache.pbrSize;
        this.#copyEnvironmentStats();
        this.#copyLocalLightStats();
        this.#sweepGeometryResources();
        this.programCache.custom?.sweep();
        this.jointPaletteCache.sweep();
        this.#copyGeometryStats(scene);
        this.#copyEffectStats(scene);
        return drawCalls + this.shadowStats.drawCalls + backgroundDrawCalls;
    }

    #sweepGeometryResources() {
        const gl = this.gl;
        for (const resource of this.geometryCache.sweep()) {
            const vertexArray = this.vertexArrays.get(resource);
            if (vertexArray) gl.deleteVertexArray(vertexArray);
            this.vertexArrays.delete(resource);
            const skinnedVertexArray = this.skinnedVertexArrays.get(resource);
            if (skinnedVertexArray) gl.deleteVertexArray(skinnedVertexArray);
            this.skinnedVertexArrays.delete(resource);
            this.shadowPass.releaseGeometry(resource);
            this.effectPass.releaseGeometry(resource);
        }
    }

    dispose() {
        const gl = this.gl;
        this.shadowPass.dispose();
        this.environmentPass.dispose();
        this.effectPass.dispose();
        gl.deleteBuffer(this.instanceBuffer);
        for (const vertexArray of this.vertexArrays.values()) gl.deleteVertexArray(vertexArray);
        this.vertexArrays.clear();
        for (const vertexArray of this.skinnedVertexArrays.values()) gl.deleteVertexArray(vertexArray);
        this.skinnedVertexArrays.clear();
        this.jointPaletteCache.dispose();
        this.geometryCache.dispose();
        this.programCache.dispose();
        this.textureCache.dispose();
        this.uploadedScene = null;
        this.visibleInstanceKeys.length = 0;
        this.visibleInstanceMaterialIds.length = 0;
    }

    #vertexArrayFor(geometry, skinned = false) {
        const cache = skinned ? this.skinnedVertexArrays : this.vertexArrays;
        const cached = cache.get(geometry.resource);
        if (cached) {
            // A dynamic resource may acquire indices after its VAO was created.
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
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, geometry.stride, 3 * FLOAT_SIZE);
        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 2, gl.FLOAT, false, geometry.stride, 10 * FLOAT_SIZE);
        gl.enableVertexAttribArray(9);
        gl.vertexAttribPointer(9, 4, gl.FLOAT, false, geometry.stride, 6 * FLOAT_SIZE);
        gl.enableVertexAttribArray(10);
        gl.vertexAttribPointer(10, 4, gl.FLOAT, false, geometry.stride, 12 * FLOAT_SIZE);
        if (skinned) {
            if (!geometry.skinBuffer) throw new Error('Skinned draw is missing joint vertex data');
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
        this.#instanceAttribute(6, 4, 16);
        this.#instanceAttribute(8, 1, 20);
        gl.bindVertexArray(null);
        cache.set(geometry.resource, vertexArray);
        return vertexArray;
    }

    #instanceAttribute(location, size, floatOffset, baseInstance = 0) {
        const gl = this.gl;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
            location,
            size,
            gl.FLOAT,
            false,
            INSTANCE_BYTE_STRIDE,
            baseInstance * INSTANCE_BYTE_STRIDE + floatOffset * FLOAT_SIZE
        );
        gl.vertexAttribDivisor(location, 1);
    }

    #bindInstanceRange(baseInstance) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        this.#instanceAttribute(2, 4, 0, baseInstance);
        this.#instanceAttribute(3, 4, 4, baseInstance);
        this.#instanceAttribute(4, 4, 8, baseInstance);
        this.#instanceAttribute(5, 4, 12, baseInstance);
        this.#instanceAttribute(6, 4, 16, baseInstance);
        this.#instanceAttribute(8, 1, 20, baseInstance);
    }

    #uploadInstances(scene) {
        const version = scene.instanceRenderVersion;
        const materialBatchVersion = scene.materials.batchVersion;
        const visibility = scene.visibility;
        const visibilityChanged = this.uploadedVisibilityStamp !== visibility.cameraStamp;
        this.lastInstanceUploadBytes = 0;
        this.lastInstanceUploads = 0;
        let reuseBatchPlan = false;
        if (scene === this.uploadedScene && materialBatchVersion === this.uploadedMaterialBatchVersion) {
            const unchanged = version === this.uploadedVersion;
            if (unchanged && !visibilityChanged) return;
            // Bounds changes can change local-light selections, even with the
            // same camera-visible identities. Keep the established selector path
            // for those scenes; zero-light scenes need no topology rebuild.
            const lights = this.localLightSelector.metrics;
            if (unchanged || lights.enabledPointLights + lights.enabledSpotLights === 0) {
                reuseBatchPlan = this.#sameVisibleInstances(scene);
            }
            if (unchanged && reuseBatchPlan) {
                this.uploadedVisibilityStamp = visibility.cameraStamp;
                return;
            }
        }
        let count = reuseBatchPlan ? this.instanceCount : 0;
        const objects = scene.objects;
        const geometryStore = scene.models?.geometry ?? this.fallbackGeometry;
        const cubeGeometryId = geometryStore.cube.id;
        if (!reuseBatchPlan) {
            this.instanceBatchBuildCount++;
            this.batches.length = 0;
            this.batchByMaterial.clear();
            for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
                const id = objects.denseIds[denseIndex];
                if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id]) continue;
                if (!visibility.objectVisible(id)) continue;
                const selection = this.#localLightSelectionForObject(scene, id, objects.materialIds[id]);
                this.#countBatch(scene, cubeGeometryId, objects.materialIds[id], 1, selection);
                this.visibleInstanceKeys[count] = visibility.objectEntries[id];
                this.visibleInstanceMaterialIds[count] = objects.materialIds[id];
                count++;
            }
            for (const group of scene.instanceGroups.values()) {
                if (!group.visible) continue;
                const chunked = this.#usesChunkedLocalSelection(scene, group);
                const chunkSize = chunked ? LOCAL_LIGHT_GROUP_CHUNK_SIZE : group.count;
                for (let start = 0; start < group.count; start += chunkSize) {
                    const rangeCount = Math.min(chunkSize, group.count - start);
                    const visibleCount = this.#visibleGroupCount(visibility, group, start, rangeCount, count);
                    if (visibleCount === 0) continue;
                    const selection = this.#localLightSelectionForGroup(scene, group, start, rangeCount);
                    this.#countBatch(scene, cubeGeometryId, group.materialId, visibleCount, selection);
                    count += visibleCount;
                }
            }
            for (const model of scene.modelInstances.values()) {
                if (!model.visible || !visibility.modelVisible(model)) continue;
                model.updateMatrices();
                const renderItems = model.activeRenderItems;
                for (let itemIndex = 0; itemIndex < renderItems.length; itemIndex++) {
                    const item = renderItems[itemIndex];
                    if (!visibility.cameraIntersectsItem(model, item)) continue;
                    const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                    const selection = this.#localLightSelectionForModel(scene, model, itemIndex, materialId);
                    this.#countBatch(scene, item.primitive.geometryId, materialId, 1, selection,
                        item.skinIndex >= 0 ? item : null);
                    this.visibleInstanceKeys[count] = item;
                    this.visibleInstanceMaterialIds[count] = materialId;
                    count++;
                }
            }
            for (const terrain of scene.terrains.resources.values()) {
                if (!terrain.visible || !visibility.terrainVisible(terrain)) continue;
                terrain.updateMatrices();
                for (let itemIndex = 0; itemIndex < terrain.activeRenderItems.length; itemIndex++) {
                    const item = terrain.activeRenderItems[itemIndex];
                    if (!visibility.cameraIntersectsItem(terrain, item)) continue;
                    const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                    const selection = this.#localLightSelectionForModel(scene, terrain, itemIndex, materialId);
                    this.#countBatch(scene, item.primitive.geometryId, materialId, 1, selection);
                    this.visibleInstanceKeys[count] = item;
                    this.visibleInstanceMaterialIds[count] = materialId;
                    count++;
                }
            }
            this.visibleInstanceKeys.length = count;
            this.visibleInstanceMaterialIds.length = count;
            this.batches.sort((left, right) => left.queue - right.queue || left.renderOrder - right.renderOrder || left.sortKey.localeCompare(right.sortKey));
        }
        const requiredLength = count * RENDER_INSTANCE_STRIDE;
        if (this.instanceData.length < requiredLength) {
            this.instanceData = new Float32Array(Math.max(
                requiredLength,
                this.instanceData.length * 2,
                64 * RENDER_INSTANCE_STRIDE
            ));
        }

        let instanceOffset = 0;
        for (const batch of this.batches) {
            batch.offset = instanceOffset;
            batch.writeOffset = instanceOffset * RENDER_INSTANCE_STRIDE;
            instanceOffset += batch.count;
        }
        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id]) continue;
            if (!visibility.objectVisible(id)) continue;
            const vectorOffset = id * 3;
            const selection = this.#localLightSelectionForObject(scene, id, objects.materialIds[id]);
            const batch = this.batchByMaterial.get(this.#batchKey(cubeGeometryId, objects.materialIds[id], selection));
            const outputOffset = batch.writeOffset;
            const colorOffset = id * 4;
            this.#writeTrsInstance(
                outputOffset,
                objects.position,
                vectorOffset,
                objects.rotation,
                vectorOffset,
                objects.scale,
                vectorOffset,
                objects.color,
                colorOffset,
                objects.receivesShadow[id]
            );
            batch.writeOffset += RENDER_INSTANCE_STRIDE;
        }
        for (const group of scene.instanceGroups.values()) {
            if (!group.visible) continue;
            const chunked = this.#usesChunkedLocalSelection(scene, group);
            const chunkSize = chunked ? LOCAL_LIGHT_GROUP_CHUNK_SIZE : group.count;
            for (let start = 0; start < group.count; start += chunkSize) {
                const rangeCount = Math.min(chunkSize, group.count - start);
                const selection = this.#localLightSelectionForGroup(scene, group, start, rangeCount);
                const batch = this.batchByMaterial.get(this.#batchKey(cubeGeometryId, group.materialId, selection));
                if (!batch) continue;
                this.#writeGroupRange(
                    visibility,
                    group,
                    start,
                    rangeCount,
                    batch
                );
            }
        }
        for (const model of scene.modelInstances.values()) {
            if (!model.visible || !visibility.modelVisible(model)) continue;
            const renderItems = model.activeRenderItems;
            for (let itemIndex = 0; itemIndex < renderItems.length; itemIndex++) {
                const item = renderItems[itemIndex];
                if (!visibility.cameraIntersectsItem(model, item)) continue;
                const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                const selection = this.#localLightSelectionForModel(scene, model, itemIndex, materialId);
                const batch = this.batchByMaterial.get(this.#batchKey(
                    item.primitive.geometryId,
                    materialId,
                    selection,
                    item.skinIndex >= 0 ? item : null
                ));
                const outputOffset = batch.writeOffset;
                this.instanceData.set(item.matrix, outputOffset);
                this.instanceData.set(model.color, outputOffset + 16);
                this.instanceData[outputOffset + 20] = model.receivesShadow ? 1 : 0;
                batch.writeOffset += RENDER_INSTANCE_STRIDE;
            }
        }
        for (const terrain of scene.terrains.resources.values()) {
            if (!terrain.visible || !visibility.terrainVisible(terrain)) continue;
            for (let itemIndex = 0; itemIndex < terrain.activeRenderItems.length; itemIndex++) {
                const item = terrain.activeRenderItems[itemIndex];
                if (!visibility.cameraIntersectsItem(terrain, item)) continue;
                const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                const selection = this.#localLightSelectionForModel(scene, terrain, itemIndex, materialId);
                const batch = this.batchByMaterial.get(this.#batchKey(item.primitive.geometryId, materialId, selection));
                const outputOffset = batch.writeOffset;
                this.instanceData.set(item.matrix, outputOffset);
                this.instanceData.set(terrain.color, outputOffset + 16);
                this.instanceData[outputOffset + 20] = terrain.receivesShadow ? 1 : 0;
                batch.writeOffset += RENDER_INSTANCE_STRIDE;
            }
        }

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, requiredLength), gl.DYNAMIC_DRAW);
        this.instanceUploadCount++;
        this.lastInstanceUploads = 1;
        this.lastInstanceUploadBytes = requiredLength * FLOAT_SIZE;
        this.instanceCount = count;
        this.uploadedVersion = version;
        this.uploadedMaterialBatchVersion = materialBatchVersion;
        this.uploadedVisibilityStamp = visibility.cameraStamp;
        this.uploadedScene = scene;
    }

    // Compare actual identities, not just counts or a probabilistic hash. In
    // particular, aggregate model visibility is insufficient: the camera can
    // reveal another primitive of the same still-visible model.
    #sameVisibleInstances(scene) {
        const visibility = scene.visibility;
        const keys = this.visibleInstanceKeys;
        const materialIds = this.visibleInstanceMaterialIds;
        const objects = scene.objects;
        let count = 0;
        for (let index = 0; index < objects.count; index++) {
            const id = objects.denseIds[index];
            if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id] || !visibility.objectVisible(id)) continue;
            if (keys[count] !== visibility.objectEntries[id] || materialIds[count] !== objects.materialIds[id]) return false;
            count++;
        }
        for (const group of scene.instanceGroups.values()) {
            if (!group.visible) continue;
            const entries = visibility.groupEntries.get(group).entries;
            for (let index = 0; index < group.count; index++) {
                if (!visibility.groupInstanceVisible(group, index)) continue;
                if (keys[count] !== entries[index] || materialIds[count] !== group.materialId) return false;
                count++;
            }
        }
        for (const model of scene.modelInstances.values()) {
            if (!model.visible || !visibility.modelVisible(model)) continue;
            for (const item of model.activeRenderItems) {
                if (!visibility.cameraIntersectsItem(model, item)) continue;
                const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                if (keys[count] !== item || materialIds[count] !== materialId) return false;
                count++;
            }
        }
        for (const terrain of scene.terrains.resources.values()) {
            if (!terrain.visible || !visibility.terrainVisible(terrain)) continue;
            for (const item of terrain.activeRenderItems) {
                if (!visibility.cameraIntersectsItem(terrain, item)) continue;
                const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                if (keys[count] !== item || materialIds[count] !== materialId) return false;
                count++;
            }
        }
        return count === keys.length;
    }

    #visibleGroupCount(visibility, group, start, count, outputOffset) {
        let visible = 0;
        const end = start + count;
        const entries = visibility.groupEntries.get(group).entries;
        for (let index = start; index < end; index++) {
            if (visibility.groupInstanceVisible(group, index)) {
                this.visibleInstanceKeys[outputOffset + visible] = entries[index];
                this.visibleInstanceMaterialIds[outputOffset + visible] = group.materialId;
                visible++;
            }
        }
        return visible;
    }

    #writeGroupRange(visibility, group, start, count, batch) {
        const firstOffset = start * INSTANCE_STRIDE;
        const endOffset = (start + count) * INSTANCE_STRIDE;
        for (let inputOffset = firstOffset; inputOffset < endOffset; inputOffset += INSTANCE_STRIDE) {
            if (!visibility.groupInstanceVisible(group, inputOffset / INSTANCE_STRIDE)) continue;
            this.#writeTrsInstance(
                batch.writeOffset,
                group.data,
                inputOffset,
                group.data,
                inputOffset + 3,
                group.data,
                inputOffset + 6,
                group.data,
                inputOffset + 9,
                group.data[inputOffset + 13]
            );
            batch.writeOffset += RENDER_INSTANCE_STRIDE;
        }
    }

    #writeTrsInstance(outputOffset, position, positionOffset, rotation, rotationOffset, scale, scaleOffset, color, colorOffset, receivesShadow) {
        composeEulerTrs(
            this.matrixScratch,
            position, rotation, scale, positionOffset, rotationOffset, scaleOffset
        );
        this.instanceData.set(this.matrixScratch, outputOffset);
        this.instanceData[outputOffset + 16] = color[colorOffset];
        this.instanceData[outputOffset + 17] = color[colorOffset + 1];
        this.instanceData[outputOffset + 18] = color[colorOffset + 2];
        this.instanceData[outputOffset + 19] = color[colorOffset + 3];
        this.instanceData[outputOffset + 20] = receivesShadow;
    }

    /** @param {{skinBatchKey: string} | null} skinnedItem */
    #countBatch(scene, geometryId, materialId, count, lightSelection, skinnedItem = null) {
        const batchKey = this.#batchKey(geometryId, materialId, lightSelection, skinnedItem);
        let batch = this.batchByMaterial.get(batchKey);
        if (!batch) {
            const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
            const state = `${material.doubleSided ? 1 : 0}|${material.depthTest ? 1 : 0}|${material.depthWrite ? 1 : 0}`;
            const texture = (material.type === MaterialType.PBR ? PBR_TEXTURE_PROPERTIES : ['textureId'])
                .map(property => String(material[property]).padStart(10, '0'))
                .join('|');
            const id = String(material.id).padStart(10, '0');
            batch = {
                geometryId,
                materialId: material.id,
                lightSelection,
                skinnedItem,
                count: 0,
                offset: 0,
                writeOffset: 0,
                queue: material.alphaMode === AlphaMode.BLEND ? 1 : 0,
                renderOrder: material.renderOrder,
                sortKey: `${material.alphaMode === AlphaMode.BLEND ? 1 : 0}|${materialShaderKey(
                    material,
                    lightSelection.count > 0,
                    Boolean(skinnedItem)
                )}|${state}|${texture}|${lightSelection.identityKey}|${id}|${geometryId}|${skinnedItem?.skinBatchKey ?? ''}`
            };
            this.batchByMaterial.set(batchKey, batch);
            this.batches.push(batch);
        }
        batch.count += count;
    }

    /** @param {{skinBatchKey: string} | null} skinnedItem */
    #batchKey(geometryId, materialId, selection, skinnedItem = null) {
        return `${geometryId}|${materialId}|${selection.identityKey}|${skinnedItem?.skinBatchKey ?? ''}`;
    }

    #materialUsesLocalLights(material) {
        return material.type === MaterialType.PBR || material.type === MaterialType.BASIC_LIT;
    }

    #localLightSelectionForObject(scene, id, materialId) {
        const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
        return this.#materialUsesLocalLights(material) &&
            this.localLightSelector.metrics.enabledPointLights + this.localLightSelector.metrics.enabledSpotLights > 0 ?
            this.localLightSelector.selectObject(scene, id) : this.emptyLightSelection;
    }

    #localLightSelectionForGroup(scene, group, start = 0, count = group.count) {
        const material = scene.materials.resourceForId(group.materialId) ?? scene.materials.defaultMaterial;
        return this.#materialUsesLocalLights(material) &&
            this.localLightSelector.metrics.enabledPointLights + this.localLightSelector.metrics.enabledSpotLights > 0 ?
            this.localLightSelector.selectGroup(scene, group, start, count) : this.emptyLightSelection;
    }

    #localLightSelectionForModel(scene, model, itemIndex, materialId) {
        const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
        return this.#materialUsesLocalLights(material) &&
            this.localLightSelector.metrics.enabledPointLights + this.localLightSelector.metrics.enabledSpotLights > 0 ?
            this.localLightSelector.selectModelItem(scene, model, itemIndex) : this.emptyLightSelection;
    }

    #usesChunkedLocalSelection(scene, group) {
        const material = scene.materials.resourceForId(group.materialId) ?? scene.materials.defaultMaterial;
        return this.#materialUsesLocalLights(material) &&
            this.localLightSelector.metrics.enabledPointLights + this.localLightSelector.metrics.enabledSpotLights > 0 &&
            group.count > LOCAL_LIGHT_GROUP_CHUNK_SIZE;
    }

    #refreshLocalLightSelections(scene) {
        const enabledLights = this.localLightSelector.metrics.enabledPointLights +
            this.localLightSelector.metrics.enabledSpotLights;
        if (enabledLights === 0 && !this.batches.some(batch => batch.lightSelection.count > 0)) return false;
        let changed = false;
        const objects = scene.objects;
        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] !== ObjectKind.CUBE || !objects.visible[id]) continue;
            if (!scene.visibility.objectVisible(id)) continue;
            const material = scene.materials.resourceForId(objects.materialIds[id]) ?? scene.materials.defaultMaterial;
            if (!this.#materialUsesLocalLights(material)) continue;
            this.localLightSelector.selectObject(scene, id);
            changed ||= this.localLightSelector.lastIdentityChanged;
        }
        for (const group of scene.instanceGroups.values()) {
            if (!group.visible) continue;
            const material = scene.materials.resourceForId(group.materialId) ?? scene.materials.defaultMaterial;
            if (!this.#materialUsesLocalLights(material)) continue;
            const chunked = this.#usesChunkedLocalSelection(scene, group);
            const chunkSize = chunked ? LOCAL_LIGHT_GROUP_CHUNK_SIZE : group.count;
            for (let start = 0; start < group.count; start += chunkSize) {
                const count = Math.min(chunkSize, group.count - start);
                if (this.#visibleGroupCount(scene.visibility, group, start, count) === 0) continue;
                this.localLightSelector.selectGroup(scene, group, start, count);
                changed ||= this.localLightSelector.lastIdentityChanged;
            }
        }
        for (const model of scene.modelInstances.values()) {
            if (!model.visible || !scene.visibility.modelVisible(model)) continue;
            const renderItems = model.activeRenderItems;
            for (let itemIndex = 0; itemIndex < renderItems.length; itemIndex++) {
                const item = renderItems[itemIndex];
                if (!scene.visibility.cameraIntersectsItem(model, item)) continue;
                const materialId = model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId;
                const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
                if (!this.#materialUsesLocalLights(material)) continue;
                this.localLightSelector.selectModelItem(scene, model, itemIndex);
                changed ||= this.localLightSelector.lastIdentityChanged;
            }
        }
        for (const terrain of scene.terrains.resources.values()) {
            if (!terrain.visible || !scene.visibility.terrainVisible(terrain)) continue;
            for (let itemIndex = 0; itemIndex < terrain.activeRenderItems.length; itemIndex++) {
                const item = terrain.activeRenderItems[itemIndex];
                if (!scene.visibility.cameraIntersectsItem(terrain, item)) continue;
                const materialId = terrain.materialOverrideId >= 0 ? terrain.materialOverrideId : item.primitive.materialId;
                const material = scene.materials.resourceForId(materialId) ?? scene.materials.defaultMaterial;
                if (!this.#materialUsesLocalLights(material)) continue;
                this.localLightSelector.selectModelItem(scene, terrain, itemIndex);
                changed ||= this.localLightSelector.lastIdentityChanged;
            }
        }
        return changed;
    }

    #hasPbrBatch(scene) {
        for (const batch of this.batches) {
            const material = scene.materials.resourceForId(batch.materialId) ?? scene.materials.defaultMaterial;
            if (material.type === MaterialType.PBR) return true;
        }
        return false;
    }

    #resetMaterialStats(scene) {
        this.materialStats.materialCount = scene.materials.count;
        this.materialStats.activePrograms = this.programCache.size;
        this.materialStats.shaderCompiles = this.programCache.compileCount;
        this.materialStats.programSwitches = 0;
        this.materialStats.materialSwitches = 0;
        this.materialStats.textureSwitches = 0;
        this.materialStats.pbrPrograms = this.programCache.pbrSize;
        this.materialStats.pbrDrawCalls = 0;
        this.materialStats.skinnedDrawCalls = 0;
        this.materialStats.customShaderDraws = 0;
        this.materialStats.jointPaletteUploads = this.jointPaletteCache.uploads;
        this.materialStats.jointPaletteUploadBytes = this.jointPaletteCache.uploadBytes;
        this.materialStats.visibleInstanceUploads = this.lastInstanceUploads;
        this.materialStats.visibleInstanceUploadBytes = this.lastInstanceUploadBytes;
        this.#copyGeometryStats(scene);
        this.#copyEnvironmentStats();
        this.#copyLocalLightStats();
        this.#copyVisibilityStats(scene);
    }

    #setFrameUniforms(locations, scene, lightId, cameraOffset, shadowsActive, environmentEntry, textureUnit, shadowTextureUnit) {
        const gl = this.gl;
        this.#uniformMatrix4fv(locations.uViewProjection, this.viewProjection);
        this.#uniform3f(
            locations.uCameraPosition,
            scene.objects.position[cameraOffset],
            scene.objects.position[cameraOffset + 1],
            scene.objects.position[cameraOffset + 2]
        );
        this.#uniform3fv(locations.uLightDirection, this.lightDirection);
        this.#uniform3fv(locations.uLightColor, this.lightColor);
        this.#uniform1f(locations.uLightIntensity, this.lightIntensity);
        this.#uniform3fv(locations.uAmbientColor, scene.ambientColor);
        this.#uniform1f(locations.uAmbientIntensity, scene.ambientIntensity);
        this.#uniform1i(locations.uTexture, textureUnit);
        this.#uniform1i(locations.uShadowsEnabled, shadowsActive ? 1 : 0);
        this.#uniform1i(locations.uShadowMap, shadowTextureUnit);
        this.#bindEnvironment(locations, scene.environment, environmentEntry);
        this.#uniformMatrix4fv(locations.uShadowMatrix, this.shadowPass.viewProjection);
        if (shadowsActive) {
            const objects = scene.objects;
            const mapSize = objects.shadowMapSize[lightId];
            this.#uniform2f(locations.uShadowTexelSize, 1 / mapSize, 1 / mapSize);
            this.#uniform1f(locations.uShadowBias, objects.shadowBias[lightId]);
            this.#uniform1f(locations.uShadowNormalBias, objects.shadowNormalBias[lightId]);
            this.#uniform1i(locations.uShadowFilter, objects.shadowFilter[lightId]);
        } else {
            this.#uniform2f(locations.uShadowTexelSize, 1, 1);
            this.#uniform1f(locations.uShadowBias, 0);
            this.#uniform1f(locations.uShadowNormalBias, 0);
            this.#uniform1i(locations.uShadowFilter, 0);
        }
        gl.activeTexture(gl.TEXTURE0 + shadowTextureUnit);
        gl.bindTexture(gl.TEXTURE_2D, shadowsActive ? this.shadowPass.texture : null);
    }

    #bindEnvironment(locations, environment, entry) {
        if (locations.uEnvironmentEnabled === null) return;
        const gl = this.gl;
        const active = Boolean(environment && entry);
        this.#uniform1i(locations.uEnvironmentEnabled, active ? 1 : 0);
        this.#uniform1f(locations.uEnvironmentIntensity, active ? environment.intensity : 0);
        this.#uniform1f(locations.uEnvironmentRotation, active ? environment.rotation : 0);
        this.#uniform1f(locations.uEnvironmentMaxLod, active ? entry.specularLevels - 1 : 0);
        this.#uniform1i(locations.uEnvironmentIrradiance, IRRADIANCE_UNIT);
        this.#uniform1i(locations.uEnvironmentPrefiltered, PREFILTERED_UNIT);
        const irradiance = active ? entry.irradiance : null;
        const prefiltered = active ? entry.prefiltered : null;
        if (this.boundTextureObjects[IRRADIANCE_UNIT] !== irradiance) {
            gl.activeTexture(gl.TEXTURE0 + IRRADIANCE_UNIT);
            gl.bindTexture(gl.TEXTURE_2D, irradiance);
            this.boundTextureObjects[IRRADIANCE_UNIT] = irradiance;
            this.materialStats.textureSwitches++;
            this.environmentPass.metrics.textureSwitches++;
        }
        if (this.boundTextureObjects[PREFILTERED_UNIT] !== prefiltered) {
            gl.activeTexture(gl.TEXTURE0 + PREFILTERED_UNIT);
            gl.bindTexture(gl.TEXTURE_2D, prefiltered);
            this.boundTextureObjects[PREFILTERED_UNIT] = prefiltered;
            this.materialStats.textureSwitches++;
            this.environmentPass.metrics.textureSwitches++;
        }
    }

    #setMaterialUniforms(locations, material) {
        this.#uniform3fv(locations.uBaseColor, material.baseColor);
        this.#uniform1f(locations.uOpacity, material.opacity);
        this.#uniform3fv(locations.uEmissiveColor, material.emissiveColor);
        this.#uniform1f(locations.uEmissiveIntensity, material.emissiveIntensity);
        this.#uniform1f(locations.uAlphaCutoff, material.alphaCutoff);
        this.#uniform1f(locations.uMetallic, material.metallic);
        this.#uniform1f(locations.uRoughness, material.roughness);
        this.#uniform1f(locations.uNormalScale, material.normalScale);
        this.#uniform1f(locations.uAoStrength, material.aoStrength);
    }

    #bindLocalLights(locations, selection, entry) {
        if (locations.uLocalLightCount === null || entry.localLightDataKey === selection.dataKey) return;
        this.#uniform1i(locations.uLocalLightCount, selection.count);
        this.#uniform4fv(locations['uLocalLightPositionRange[0]'], selection.positionRange);
        this.#uniform4fv(locations['uLocalLightColorIntensity[0]'], selection.colorIntensity);
        this.#uniform4fv(locations['uLocalLightDirectionOuter[0]'], selection.directionOuter);
        this.#uniform1fv(locations['uLocalLightInnerCos[0]'], selection.innerCos);
        entry.localLightDataKey = selection.dataKey;
        this.localLightSelector.metrics.gpuUploads++;
    }

    #bindLegacyTexture(locations, scene, material, textureUnit) {
        const resource = scene.textures?.resourceForId(material.textureId);
        const texture = this.#bindTexture(resource, textureUnit);
        this.#uniform1i(locations.uTexture, textureUnit);
        this.#uniform1i(locations.uTextureIsSrgb, texture && resource.settings.colorSpace === 'srgb' ? 1 : 0);
        if (texture) {
            this.#uniform2f(locations.uUvOffset, resource.uv[0], resource.uv[1]);
            this.#uniform2f(locations.uUvRepeat, resource.uv[2], resource.uv[3]);
            this.#uniform1f(locations.uUvRotation, resource.uv[4]);
        } else {
            this.#uniform2f(locations.uUvOffset, 0, 0);
            this.#uniform2f(locations.uUvRepeat, 1, 1);
            this.#uniform1f(locations.uUvRotation, 0);
        }
    }

    #bindPbrTextures(locations, scene, material, firstTextureUnit, shadowTextureUnit) {
        let mapFlags = 0;
        let colorSpaceFlags = 0;
        const assignedUnits = this.assignedMapUnits;
        for (let role = 0; role < PBR_TEXTURE_PROPERTIES.length; role++) {
            const textureId = material[PBR_TEXTURE_PROPERTIES[role]];
            let duplicateRole = -1;
            if (textureId >= 0) {
                for (let previous = 0; previous < role; previous++) {
                    if (material[PBR_TEXTURE_PROPERTIES[previous]] === textureId) {
                        duplicateRole = previous;
                        break;
                    }
                }
            }
            const unit = duplicateRole >= 0 ? assignedUnits[duplicateRole] :
                this.#materialTextureUnit(role, firstTextureUnit, shadowTextureUnit);
            assignedUnits[role] = unit;
            const resource = scene.textures?.resourceForId(textureId);
            const texture = duplicateRole >= 0 ? this.boundTextureObjects[unit] : this.#bindTexture(resource, unit);
            this.#uniform1i(locations[PBR_SAMPLERS[role]], unit);
            const transformOffset = role * 4;
            if (texture) {
                mapFlags |= 1 << role;
                if (PBR_COLOR_ROLES.has(role) && resource.settings.colorSpace === 'srgb') {
                    colorSpaceFlags |= 1 << role;
                }
                this.mapUvTransforms[transformOffset] = resource.uv[0];
                this.mapUvTransforms[transformOffset + 1] = resource.uv[1];
                this.mapUvTransforms[transformOffset + 2] = resource.uv[2];
                this.mapUvTransforms[transformOffset + 3] = resource.uv[3];
                this.mapUvRotations[role] = resource.uv[4];
            } else {
                this.mapUvTransforms[transformOffset] = 0;
                this.mapUvTransforms[transformOffset + 1] = 0;
                this.mapUvTransforms[transformOffset + 2] = 1;
                this.mapUvTransforms[transformOffset + 3] = 1;
                this.mapUvRotations[role] = 0;
            }
        }
        this.#uniform1i(locations.uMapFlags, mapFlags);
        this.#uniform1i(locations.uColorSpaceFlags, colorSpaceFlags);
        this.#uniform4fv(locations['uMapUvTransform[0]'], this.mapUvTransforms);
        this.#uniform1fv(locations['uMapUvRotation[0]'], this.mapUvRotations);
    }

    #bindTexture(resource, unit) {
        const gl = this.gl;
        if (!resource || resource.disposed || resource.state !== 'ready') {
            if (this.boundTextureIds[unit] !== -1) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, null);
                this.boundTextureIds[unit] = -1;
                this.boundTextureObjects[unit] = null;
                this.materialStats.textureSwitches++;
            }
            return null;
        }
        let texture = this.validatedTextureObjects.get(resource.id);
        if (texture === undefined) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            texture = this.textureCache.get(resource);
            this.validatedTextureObjects.set(resource.id, texture);
            this.boundTextureIds[unit] = texture ? resource.id : -1;
            this.boundTextureObjects[unit] = texture;
            this.materialStats.textureSwitches++;
            return texture;
        }
        if (this.boundTextureIds[unit] !== resource.id) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            this.boundTextureIds[unit] = resource.id;
            this.boundTextureObjects[unit] = texture;
            this.materialStats.textureSwitches++;
        }
        return texture;
    }

    #materialTextureUnit(slot, firstTextureUnit, shadowTextureUnit) {
        const unit = firstTextureUnit + slot;
        return unit >= shadowTextureUnit ? unit + 1 : unit;
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

    #uniform3f(location, x, y, z) {
        if (location !== null) this.gl.uniform3f(location, x, y, z);
    }

    #uniform3fv(location, value) {
        if (location !== null) this.gl.uniform3fv(location, value);
    }

    #uniform4fv(location, value) {
        if (location !== null) this.gl.uniform4fv(location, value);
    }

    #uniform1fv(location, value) {
        if (location !== null) this.gl.uniform1fv(location, value);
    }

    #uniformMatrix4fv(location, value) {
        if (location !== null) this.gl.uniformMatrix4fv(location, false, value);
    }

    #updateCameraRotation() {
        const view = this.view;
        const rotation = this.cameraRotation;
        rotation[0] = view[0];
        rotation[1] = view[4];
        rotation[2] = view[8];
        rotation[3] = view[1];
        rotation[4] = view[5];
        rotation[5] = view[9];
        rotation[6] = view[2];
        rotation[7] = view[6];
        rotation[8] = view[10];
    }

    #copyEnvironmentStats() {
        const metrics = this.environmentPass.metrics;
        this.materialStats.environmentResources = metrics.resources;
        this.materialStats.environmentPreprocesses = metrics.preprocesses;
        this.materialStats.environmentPreprocessTime = metrics.preprocessCpuTime;
        this.materialStats.environmentBackgroundDrawCalls = metrics.backgroundDrawCalls;
        this.materialStats.environmentIblDrawCalls = metrics.iblDrawCalls;
        this.materialStats.environmentTextureSwitches = metrics.textureSwitches;
    }

    #copyLocalLightStats() {
        const metrics = this.localLightSelector.metrics;
        this.materialStats.totalLocalLights = metrics.totalLights;
        this.materialStats.enabledPointLights = metrics.enabledPointLights;
        this.materialStats.enabledSpotLights = metrics.enabledSpotLights;
        this.materialStats.selectedLocalLights = metrics.selectedLights;
        this.materialStats.selectedPointLights = metrics.selectedPointLights;
        this.materialStats.selectedSpotLights = metrics.selectedSpotLights;
        this.materialStats.selectedLocalLightReferences = metrics.selectedLightReferences;
        this.materialStats.candidateLocalLightReferences = metrics.candidateLightReferences;
        this.materialStats.localLightSelectionEvaluations = metrics.selectionEvaluations;
        this.materialStats.localLightListRebuilds = metrics.listRebuilds;
        this.materialStats.localLightGpuUploads = metrics.gpuUploads;
        this.materialStats.localLightDrawCalls = metrics.localLightDraws;
        this.materialStats.localLightsRejectedByRange = metrics.rejectedByRange;
        this.materialStats.localLightsRejectedByCone = metrics.rejectedByCone;
        this.materialStats.localLightsRejectedByBudget = metrics.rejectedByBudget;
        this.materialStats.localLightSelectionTime = metrics.selectionCpuTime;
        this.materialStats.absoluteMaximumLocalLights = MAX_LOCAL_LIGHTS;
        this.materialStats.effectiveLocalLightBudget = this.localLightLimit;
    }

    #copyGeometryStats(scene) {
        this.materialStats.geometryResources = this.geometryCache.entries.size;
        this.materialStats.geometryUploads = this.geometryCache.uploads;
        this.materialStats.geometryGpuBytes = this.geometryCache.gpuBytes;
        this.materialStats.jointPaletteUploads = this.jointPaletteCache.uploads;
        this.materialStats.jointPaletteUploadBytes = this.jointPaletteCache.uploadBytes;
        this.materialStats.modelAssets = scene.models?.count ?? 0;
        this.materialStats.modelInstances = scene.modelInstances.size;
        this.materialStats.modelPrimitives = 0;
        this.materialStats.modelTriangles = 0;
        for (const model of scene.modelInstances.values()) {
            this.materialStats.modelPrimitives += model.activeRenderItems.length;
            for (const item of model.activeRenderItems) this.materialStats.modelTriangles += item.primitive.triangleCount;
        }
        this.materialStats.terrainCount = scene.terrains.resources.size;
        this.materialStats.terrainTriangles = scene.terrains.triangleCount;
        this.materialStats.terrainGeometryBuilds = scene.terrains.geometryBuilds;
        this.materialStats.terrainGeometryBuildBytes = scene.terrains.geometryBuildBytes;
        this.materialStats.terrainGpuUploads = this.geometryCache.dynamicUploads;
        this.materialStats.terrainGpuUploadBytes = this.geometryCache.dynamicUploadBytes;
        this.materialStats.visibleTerrainChunks = 0;
        for (const terrain of scene.terrains.resources.values()) {
            if (terrain.visible && scene.visibility.terrainVisible(terrain)) this.materialStats.visibleTerrainChunks++;
        }
        this.materialStats.culledTerrainChunks = scene.terrains.resources.size - this.materialStats.visibleTerrainChunks;
    }

    #copyEffectStats(scene) {
        Object.assign(this.materialStats, this.effectPass.stats);
        this.materialStats.textRasterizations = scene.texts?.rasterizations ?? 0;
        this.materialStats.textTextureUploads = this.textureCache.textUploadCount;
        this.materialStats.sharedTextTextures = scene.texts?.sharedTextureCount ?? 0;
    }

    #copyVisibilityStats(scene) {
        const metrics = scene.visibility.cameraMetrics;
        this.materialStats.totalRenderables = metrics.totalRenderables;
        this.materialStats.visibilityCandidates = metrics.visibilityCandidates;
        this.materialStats.spatialCandidates = metrics.spatialCandidates;
        this.materialStats.bruteForceCandidates = metrics.bruteForceCandidates;
        this.materialStats.frustumTested = metrics.frustumTested;
        this.materialStats.frustumRejected = metrics.frustumRejected;
        this.materialStats.renderDistanceRejected = metrics.renderDistanceRejected;
        this.materialStats.explicitlyHiddenRejected = metrics.hiddenRejected;
        this.materialStats.visibleRenderables = metrics.visibleRenderables;
        this.materialStats.visibleInstances = this.instanceCount;
        this.materialStats.culledInstances = metrics.culledInstances;
        this.materialStats.visibilityCpuTime = metrics.visibilityCpuTime;
        this.materialStats.spatialQueryCpuTime = metrics.spatialQueryCpuTime;
        this.materialStats.spatialIndexEntries = metrics.spatialIndexEntries;
        this.materialStats.spatialIndexUpdates = metrics.spatialIndexUpdates;
        this.materialStats.spatialIndexRebuilds = metrics.spatialIndexRebuilds;
        this.materialStats.dirtyBounds = metrics.dirtyBounds;
        this.materialStats.animatedBounds = metrics.animatedBounds;
        this.materialStats.visibilityReused = metrics.visibilityReused;
        this.materialStats.spatialPath = metrics.spatialPath;
        this.materialStats.lodEvaluations = scene.lodMetrics.evaluations;
        this.materialStats.lodSwitches = scene.lodMetrics.switches;
        this.materialStats.lodReused = scene.lodMetrics.reused;
    }

    #findCamera(scene, cameraOverride = null) {
        if (cameraOverride !== null) {
            const id = Number(cameraOverride);
            if (Number.isInteger(id) && scene.objects.alive[id] && scene.objects.kinds[id] === ObjectKind.CAMERA) {
                return id;
            }
            throw new Error(`Unknown camera ID ${cameraOverride}`);
        }
        const active = scene.activeCameraId;
        if (active !== null && scene.objects.alive[active]) return active;
        throw new Error('Create a camera before rendering the scene');
    }

    #updateLight(scene) {
        const objects = scene.objects;
        for (let denseIndex = 0; denseIndex < objects.count; denseIndex++) {
            const id = objects.denseIds[denseIndex];
            if (objects.kinds[id] !== ObjectKind.DIRECTIONAL_LIGHT) continue;
            const offset = id * 3;
            const rotation = objects.rotation;
            const pitch = rotation[offset];
            const yaw = rotation[offset + 1];
            const colorOffset = id * 4;
            this.lightDirection[0] = Math.sin(yaw) * Math.cos(pitch);
            this.lightDirection[1] = -Math.sin(pitch);
            this.lightDirection[2] = -Math.cos(yaw) * Math.cos(pitch);
            this.lightColor[0] = objects.color[colorOffset];
            this.lightColor[1] = objects.color[colorOffset + 1];
            this.lightColor[2] = objects.color[colorOffset + 2];
            this.lightIntensity = objects.intensity[id];
            return id;
        }
        this.lightDirection[0] = 0.4;
        this.lightDirection[1] = -0.8;
        this.lightDirection[2] = -0.5;
        this.lightColor.fill(1);
        this.lightIntensity = 1;
        return -1;
    }
}
