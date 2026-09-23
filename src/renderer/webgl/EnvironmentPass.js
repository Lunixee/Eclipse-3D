import {createProgram} from './shader.js';
import {FULLSCREEN_VERTEX_SHADER} from './FullscreenTriangle.js';
import {ENVIRONMENT_QUALITY_PRESETS} from '../../quality/RenderQualitySettings.js';

const SOURCE_UNIT = 0;
export const IRRADIANCE_UNIT = 8;
export const PREFILTERED_UNIT = 9;
export const ENVIRONMENT_TEXTURE_UNITS = 10;
const MAX_SAMPLES = Math.max(...Object.values(ENVIRONMENT_QUALITY_PRESETS)
    .map(preset => Math.max(preset.diffuseSamples, preset.specularSamples)));

const COLOR_FUNCTIONS = `
vec3 srgbToLinear(vec3 value) {
    bvec3 cutoff = lessThanEqual(value, vec3(0.04045));
    return mix(pow((value + 0.055) / 1.055, vec3(2.4)), value / 12.92, cutoff);
}

vec3 linearToSrgb(vec3 value) {
    value = max(value, vec3(0.0));
    bvec3 cutoff = lessThanEqual(value, vec3(0.0031308));
    return mix(1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055, value * 12.92, cutoff);
}`;

const PREPROCESS_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform bool uSourceIsSrgb;
uniform int uMode;
uniform int uSampleCount;
uniform float uRoughness;
out vec4 outputColor;
${COLOR_FUNCTIONS}

const float PI = 3.141592653589793;

vec3 uvToDirection(vec2 uv) {
    float longitude = (uv.x - 0.5) * 2.0 * PI;
    float latitude = (uv.y - 0.5) * PI;
    float latitudeCosine = cos(latitude);
    return vec3(latitudeCosine * cos(longitude), sin(latitude), latitudeCosine * sin(longitude));
}

vec2 directionToUv(vec3 direction) {
    direction = normalize(direction);
    return vec2(atan(direction.z, direction.x) / (2.0 * PI) + 0.5, asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5);
}

vec3 sourceColor(vec3 direction) {
    vec3 color = textureLod(uSource, directionToUv(direction), 0.0).rgb;
    return uSourceIsSrgb ? srgbToLinear(color) : color;
}

vec2 samplePoint(int index, int count) {
    float value = float(index);
    return vec2((value + 0.5) / float(count), fract(value * 0.61803398875));
}

mat3 tangentBasis(vec3 normal) {
    vec3 up = abs(normal.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(up, normal));
    return mat3(tangent, cross(normal, tangent), normal);
}

vec3 cosineHemisphere(vec2 point) {
    float radius = sqrt(point.x);
    float angle = 2.0 * PI * point.y;
    return vec3(radius * cos(angle), radius * sin(angle), sqrt(max(0.0, 1.0 - point.x)));
}

vec3 importanceGgx(vec2 point, float roughness) {
    float alpha = roughness * roughness;
    float alphaSquared = alpha * alpha;
    float angle = 2.0 * PI * point.y;
    float cosine = sqrt((1.0 - point.x) / max(1.0 + (alphaSquared - 1.0) * point.x, 1e-5));
    float sine = sqrt(max(0.0, 1.0 - cosine * cosine));
    return vec3(cos(angle) * sine, sin(angle) * sine, cosine);
}

void main() {
    vec3 normal = uvToDirection(vUv);
    mat3 basis = tangentBasis(normal);
    vec3 total = vec3(0.0);
    float weight = 0.0;
    if (uMode == 0) {
        for (int index = 0; index < ${MAX_SAMPLES}; index++) {
            if (index >= uSampleCount) break;
            vec3 direction = basis * cosineHemisphere(samplePoint(index, uSampleCount));
            total += sourceColor(direction);
        }
        outputColor = vec4(total / float(uSampleCount), 1.0);
        return;
    }
    if (uRoughness <= 0.001) {
        outputColor = vec4(sourceColor(normal), 1.0);
        return;
    }
    for (int index = 0; index < ${MAX_SAMPLES}; index++) {
        if (index >= uSampleCount) break;
        vec3 halfDirection = normalize(basis * importanceGgx(samplePoint(index, uSampleCount), uRoughness));
        vec3 direction = reflect(-normal, halfDirection);
        float normalDotDirection = max(dot(normal, direction), 0.0);
        if (normalDotDirection > 0.0) {
            total += sourceColor(direction) * normalDotDirection;
            weight += normalDotDirection;
        }
    }
    outputColor = vec4(total / max(weight, 1e-5), 1.0);
}`;

const BACKGROUND_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uEnvironment;
uniform float uRotation;
uniform float uIntensity;
uniform float uFieldOfView;
uniform float uAspect;
uniform mat3 uCameraRotation;
out vec4 outputColor;
${COLOR_FUNCTIONS}

const float PI = 3.141592653589793;

vec2 directionToUv(vec3 direction) {
    float sine = sin(uRotation);
    float cosine = cos(uRotation);
    direction.xz = mat2(cosine, -sine, sine, cosine) * direction.xz;
    direction = normalize(direction);
    return vec2(atan(direction.z, direction.x) / (2.0 * PI) + 0.5, asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5);
}

void main() {
    vec2 clip = vUv * 2.0 - 1.0;
    float tangent = tan(uFieldOfView * 0.5);
    vec3 cameraDirection = normalize(vec3(clip.x * tangent * uAspect, clip.y * tangent, -1.0));
    vec3 worldDirection = uCameraRotation * cameraDirection;
    vec3 linearColor = textureLod(uEnvironment, directionToUv(worldDirection), 0.0).rgb * uIntensity;
    outputColor = vec4(linearToSrgb(linearColor), 1.0);
}`;

const createOutputTexture = (gl, width, levels) => {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate an environment texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (let level = 0; level < levels; level++) {
        const levelWidth = Math.max(1, width >> level);
        gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA8, levelWidth, Math.max(1, levelWidth >> 1), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
};

export class EnvironmentPass {
    constructor(gl, textureCache) {
        this.gl = gl;
        this.textureCache = textureCache;
        this.preprocessProgram = null;
        this.backgroundProgram = null;
        this.vertexArray = null;
        this.framebuffer = null;
        this.entries = new Map();
        this.quality = ENVIRONMENT_QUALITY_PRESETS.custom;
        this.qualityVersion = 1;
        this.preprocessCount = 0;
        this.deleteCount = 0;
        this.metrics = {
            activeEnvironment: 0,
            resources: 0,
            preprocesses: 0,
            preprocessCpuTime: 0,
            backgroundDrawCalls: 0,
            iblDrawCalls: 0,
            textureSwitches: 0
        };
        this.preprocessLocations = null;
        this.backgroundLocations = null;
    }

    setQuality(limits) {
        if (this.quality.diffuseWidth === limits.diffuseWidth &&
            this.quality.specularWidth === limits.specularWidth &&
            this.quality.diffuseSamples === limits.diffuseSamples &&
            this.quality.specularSamples === limits.specularSamples) return;
        this.quality = limits;
        this.qualityVersion++;
    }

    prepare(scene, required = true) {
        this.#resetFrameMetrics();
        this.#sweep(scene.environments);
        const environment = scene.environment;
        if (!required || !environment || environment.disposed || environment.intensity <= 0) return null;
        const source = scene.textures?.resourceForId(environment.sourceTextureId);
        if (!source || source.disposed || source.state !== 'ready') return null;
        const key = [
            environment.preprocessVersion,
            source.source.version,
            source.settings.colorSpace,
            source.settings.flipY ? 1 : 0,
            this.qualityVersion
        ].join('|');
        let entry = this.entries.get(environment.id);
        if (!entry || entry.key !== key) {
            if (entry) this.#deleteEntry(entry);
            entry = this.#preprocess(environment, source, key);
            this.entries.set(environment.id, entry);
        }
        this.metrics.activeEnvironment = 1;
        this.metrics.resources = this.entries.size;
        return entry;
    }

    renderBackground(entry, environment, camera, aspect) {
        if (!entry || !environment.backgroundEnabled) return 0;
        this.#ensureBackgroundResources();
        const gl = this.gl;
        const locations = this.backgroundLocations;
        if (!this.backgroundProgram || !locations) throw new Error('Environment background resources are unavailable');
        gl.bindVertexArray(this.vertexArray);
        gl.useProgram(this.backgroundProgram);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.activeTexture(gl.TEXTURE0 + PREFILTERED_UNIT);
        gl.bindTexture(gl.TEXTURE_2D, entry.prefiltered);
        gl.uniform1i(locations.uEnvironment, PREFILTERED_UNIT);
        gl.uniform1f(locations.uRotation, environment.rotation);
        gl.uniform1f(locations.uIntensity, environment.intensity);
        gl.uniform1f(locations.uFieldOfView, camera.fieldOfView);
        gl.uniform1f(locations.uAspect, aspect);
        gl.uniformMatrix3fv(locations.uCameraRotation, false, camera.rotation);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.metrics.backgroundDrawCalls = 1;
        this.metrics.textureSwitches++;
        return 1;
    }

    clear() {
        for (const entry of this.entries.values()) this.#deleteEntry(entry);
        this.entries.clear();
        this.metrics.resources = 0;
    }

    dispose() {
        this.clear();
        const gl = this.gl;
        if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
        if (this.vertexArray) gl.deleteVertexArray(this.vertexArray);
        if (this.preprocessProgram) gl.deleteProgram(this.preprocessProgram);
        if (this.backgroundProgram) gl.deleteProgram(this.backgroundProgram);
    }

    #preprocess(environment, source, key) {
        const gl = this.gl;
        this.#ensurePreprocessResources();
        const locations = this.preprocessLocations;
        if (!this.preprocessProgram || !locations) throw new Error('Environment preprocessing resources are unavailable');
        const start = performance.now();
        const diffuseLevels = 1;
        const specularLevels = Math.floor(Math.log2(this.quality.specularWidth)) + 1;
        const irradiance = createOutputTexture(gl, this.quality.diffuseWidth, diffuseLevels);
        let prefiltered = null;
        try {
            prefiltered = createOutputTexture(gl, this.quality.specularWidth, specularLevels);
            gl.activeTexture(gl.TEXTURE0 + SOURCE_UNIT);
            const sourceTexture = this.textureCache.get(source);
            if (!sourceTexture) throw new Error(`Environment source texture "${source.name}" is not ready`);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.bindVertexArray(this.vertexArray);
            gl.useProgram(this.preprocessProgram);
            gl.disable(gl.SCISSOR_TEST);
            gl.disable(gl.BLEND);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.STENCIL_TEST);
            gl.depthMask(false);
            gl.colorMask(true, true, true, true);
            gl.uniform1i(locations.uSource, SOURCE_UNIT);
            gl.uniform1i(locations.uSourceIsSrgb, source.settings.colorSpace === 'srgb' ? 1 : 0);
            this.#renderTarget(irradiance, 0, this.quality.diffuseWidth, 0, this.quality.diffuseSamples, 1);
            for (let level = 0; level < specularLevels; level++) {
                const width = Math.max(1, this.quality.specularWidth >> level);
                const roughness = specularLevels > 1 ? level / (specularLevels - 1) : 0;
                this.#renderTarget(prefiltered, level, width, 1, this.quality.specularSamples, roughness);
            }
        } catch (error) {
            gl.deleteTexture(irradiance);
            if (prefiltered) gl.deleteTexture(prefiltered);
            throw error;
        } finally {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        this.preprocessCount++;
        this.metrics.preprocesses = 1;
        this.metrics.preprocessCpuTime = performance.now() - start;
        return {
            resource: environment,
            key,
            irradiance,
            prefiltered,
            specularLevels
        };
    }

    #renderTarget(texture, level, width, mode, samples, roughness) {
        const gl = this.gl;
        const locations = this.preprocessLocations;
        if (!locations) throw new Error('Environment preprocessing resources are unavailable');
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, level);
        gl.viewport(0, 0, width, Math.max(1, width >> 1));
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Environment preprocessing framebuffer is incomplete');
        }
        gl.uniform1i(locations.uMode, mode);
        gl.uniform1i(locations.uSampleCount, samples);
        gl.uniform1f(locations.uRoughness, roughness);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    #sweep(store) {
        for (const [id, entry] of this.entries) {
            if (store?.resourceForId(id) === entry.resource) continue;
            this.#deleteEntry(entry);
            this.entries.delete(id);
        }
    }

    #deleteEntry(entry) {
        this.gl.deleteTexture(entry.irradiance);
        this.gl.deleteTexture(entry.prefiltered);
        this.deleteCount += 2;
    }

    #resetFrameMetrics() {
        this.metrics.activeEnvironment = 0;
        this.metrics.resources = this.entries.size;
        this.metrics.preprocesses = 0;
        this.metrics.preprocessCpuTime = 0;
        this.metrics.backgroundDrawCalls = 0;
        this.metrics.iblDrawCalls = 0;
        this.metrics.textureSwitches = 0;
    }

    #ensurePreprocessResources() {
        if (this.preprocessProgram) return;
        const gl = this.gl;
        const program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, PREPROCESS_FRAGMENT_SHADER);
        const vertexArray = gl.createVertexArray();
        const framebuffer = gl.createFramebuffer();
        if (!vertexArray || !framebuffer) {
            gl.deleteProgram(program);
            if (vertexArray) gl.deleteVertexArray(vertexArray);
            if (framebuffer) gl.deleteFramebuffer(framebuffer);
            throw new Error('Unable to allocate environment preprocessing resources');
        }
        this.preprocessProgram = program;
        this.vertexArray = vertexArray;
        this.framebuffer = framebuffer;
        this.preprocessLocations = this.#locations(this.preprocessProgram, [
            'uSource', 'uSourceIsSrgb', 'uMode', 'uSampleCount', 'uRoughness'
        ]);
    }

    #ensureBackgroundResources() {
        this.#ensurePreprocessResources();
        if (this.backgroundProgram) return;
        this.backgroundProgram = createProgram(this.gl, FULLSCREEN_VERTEX_SHADER, BACKGROUND_FRAGMENT_SHADER);
        this.backgroundLocations = this.#locations(this.backgroundProgram, [
            'uEnvironment', 'uRotation', 'uIntensity', 'uFieldOfView', 'uAspect', 'uCameraRotation'
        ]);
    }

    #locations(program, names) {
        const locations = {};
        for (const name of names) locations[name] = this.gl.getUniformLocation(program, name);
        return locations;
    }
}
