import {createProgram} from './shader.js';
import {FULLSCREEN_VERTEX_SHADER} from './FullscreenTriangle.js';

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

const BLOOM_DOWNSAMPLE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uThreshold;
uniform bool uSourceIsSrgb;
out vec4 outputColor;
${COLOR_FUNCTIONS}

void main() {
    vec2 offset = uTexelSize * 0.5;
    vec3 sample0 = texture(uSource, vUv + vec2(-offset.x, -offset.y)).rgb;
    vec3 sample1 = texture(uSource, vUv + vec2( offset.x, -offset.y)).rgb;
    vec3 sample2 = texture(uSource, vUv + vec2(-offset.x,  offset.y)).rgb;
    vec3 sample3 = texture(uSource, vUv + vec2( offset.x,  offset.y)).rgb;
    if (uSourceIsSrgb) {
        sample0 = srgbToLinear(sample0);
        sample1 = srgbToLinear(sample1);
        sample2 = srgbToLinear(sample2);
        sample3 = srgbToLinear(sample3);
    }
    vec3 color = (sample0 + sample1 + sample2 + sample3) * 0.25;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float contribution = max(luminance - uThreshold, 0.0) / max(luminance, 1e-5);
    outputColor = vec4(color * contribution, 1.0);
}`;

const BLOOM_BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uDirection;
out vec4 outputColor;

void main() {
    vec3 color = texture(uSource, vUv).rgb * 0.227027;
    color += texture(uSource, vUv + uDirection * 1.384615).rgb * 0.316216;
    color += texture(uSource, vUv - uDirection * 1.384615).rgb * 0.316216;
    color += texture(uSource, vUv + uDirection * 3.230769).rgb * 0.070270;
    color += texture(uSource, vUv - uDirection * 3.230769).rgb * 0.070270;
    outputColor = vec4(color, 1.0);
}`;

const FINAL_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uResolution;
uniform vec2 uInverseResolution;
uniform int uBloomLevels;
uniform float uBloomIntensity;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uVignetteIntensity;
uniform float uVignetteRadius;
uniform float uVignetteSoftness;
uniform bool uFxaa;
out vec4 outputColor;
${COLOR_FUNCTIONS}

float luma(vec3 value) {
    return dot(value, vec3(0.299, 0.587, 0.114));
}

vec4 sceneSample(vec2 uv) {
    vec4 center = texture(uScene, uv);
    if (!uFxaa) return center;
    vec3 north = texture(uScene, uv + vec2(0.0, uInverseResolution.y)).rgb;
    vec3 south = texture(uScene, uv - vec2(0.0, uInverseResolution.y)).rgb;
    vec3 east = texture(uScene, uv + vec2(uInverseResolution.x, 0.0)).rgb;
    vec3 west = texture(uScene, uv - vec2(uInverseResolution.x, 0.0)).rgb;
    float centerLuma = luma(center.rgb);
    float minimumLuma = min(centerLuma, min(min(luma(north), luma(south)), min(luma(east), luma(west))));
    float maximumLuma = max(centerLuma, max(max(luma(north), luma(south)), max(luma(east), luma(west))));
    if (maximumLuma - minimumLuma < max(0.0312, maximumLuma * 0.125)) return center;
    vec2 gradient = vec2(luma(west) - luma(east), luma(south) - luma(north));
    float magnitude = max(abs(gradient.x), abs(gradient.y));
    vec2 direction = magnitude > 1e-5 ? gradient / magnitude * uInverseResolution : vec2(0.0);
    vec3 filtered = (texture(uScene, uv - direction * 0.5).rgb +
        texture(uScene, uv + direction * 0.5).rgb) * 0.5;
    return vec4(mix(center.rgb, filtered, 0.75), center.a);
}

void main() {
    vec4 scene = sceneSample(vUv);
    vec3 color = srgbToLinear(scene.rgb);
    vec3 bloom = vec3(0.0);
    if (uBloomLevels > 0) bloom += texture(uBloom0, vUv).rgb;
    if (uBloomLevels > 1) bloom += texture(uBloom1, vUv).rgb * 0.8;
    if (uBloomLevels > 2) bloom += texture(uBloom2, vUv).rgb * 0.6;
    if (uBloomLevels > 3) bloom += texture(uBloom3, vUv).rgb * 0.4;
    color += bloom * uBloomIntensity / max(float(uBloomLevels), 1.0);
    color *= uBrightness;
    color = (color - vec3(0.18)) * uContrast + vec3(0.18);
    float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(gray), color, uSaturation);
    float minimumDimension = max(min(uResolution.x, uResolution.y), 1.0);
    float edgeDistance = length((vUv - vec2(0.5)) * uResolution / minimumDimension) * 2.0;
    float vignette = smoothstep(uVignetteRadius, uVignetteRadius + uVignetteSoftness, edgeDistance);
    color *= 1.0 - vignette * uVignetteIntensity;
    outputColor = vec4(linearToSrgb(color), scene.a);
}`;

const locations = (gl, program, names) => Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));

export class PostProcessPipeline {
    constructor(gl, scenePass, targets) {
        this.gl = gl;
        this.scenePass = scenePass;
        this.targets = targets;
        this.vertexArray = null;
        this.downsampleProgram = null;
        this.blurProgram = null;
        this.finalProgram = null;
        this.downsampleLocations = null;
        this.blurLocations = null;
        this.finalLocations = null;
        this.compileCount = 0;
        this.allocatedBloomLevels = 0;
        this.pendingOffscreenRenders = 0;
        this.totalOffscreenRenders = 0;
        this.metrics = this.#emptyMetrics();
    }

    render(scene, framebuffer, width, height, settings, options = {}) {
        this.targets.beginFrame();
        const compileStart = this.compileCount;
        const offscreenRenders = this.pendingOffscreenRenders;
        this.pendingOffscreenRenders = 0;
        if (!settings.active) {
            const drawCalls = this.scenePass.render(scene, framebuffer, width, height,
                options.textureUnit ?? 0, options.shadowTextureUnit ?? 1, options.cameraId ?? null);
            this.metrics = {
                ...this.#emptyMetrics(),
                ...this.targets.metrics(),
                postShaderCompiles: this.compileCount,
                postShaderCompilesThisFrame: this.compileCount - compileStart,
                offscreenCameraRenders: offscreenRenders,
                totalOffscreenCameraRenders: this.totalOffscreenRenders
            };
            return drawCalls;
        }

        const sceneTarget = this.targets.getInternal('scene', width, height, {
            label: 'post-processing scene target',
            category: 'scene',
            depth: 'renderbuffer',
            colorFormat: 'rgba8',
            samples: options.samples ?? 0
        });
        let drawCalls = this.scenePass.render(scene, sceneTarget.framebuffer, width, height,
            options.textureUnit ?? 0, options.shadowTextureUnit ?? 1, options.cameraId ?? null);
        this.targets.resolve(sceneTarget);
        let postPasses = 0;
        let framebufferBinds = 1;
        const bloomTextures = [];
        let bloomPasses = 0;
        if (settings.bloomEnabled && settings.bloomIntensity > 0) {
            this.#ensureBloomPrograms();
            const levels = Math.max(1, Math.min(4, Math.round(settings.bloomQuality)));
            if (levels !== this.allocatedBloomLevels) {
                for (let level = levels; level < this.allocatedBloomLevels; level++) {
                    this.targets.releaseInternal(`bloom:${level}:`);
                }
                this.allocatedBloomLevels = levels;
            }
            const initialDivisor = levels === 1 ? 4 : 2;
            let source = sceneTarget.texture;
            let sourceWidth = width;
            let sourceHeight = height;
            for (let level = 0; level < levels; level++) {
                const divisor = level === 0 ? initialDivisor : 2;
                const levelWidth = Math.max(1, Math.round(sourceWidth / divisor));
                const levelHeight = Math.max(1, Math.round(sourceHeight / divisor));
                const bloom = this.targets.getInternal(`bloom:${level}:color`, levelWidth, levelHeight, {
                    label: `bloom level ${level}`,
                    category: 'bloom',
                    depth: false,
                    colorFormat: 'rgba8'
                });
                const scratch = this.targets.getInternal(`bloom:${level}:scratch`, levelWidth, levelHeight, {
                    label: `bloom scratch ${level}`,
                    category: 'bloom',
                    depth: false,
                    colorFormat: 'rgba8'
                });
                this.#downsample(source, sourceWidth, sourceHeight, bloom, level === 0 ? settings.bloomThreshold : 0, level === 0);
                this.#blur(bloom.texture, scratch, 1 / levelWidth, 0, settings.bloomQuality);
                this.#blur(scratch.texture, bloom, 0, 1 / levelHeight, settings.bloomQuality);
                bloomTextures.push(bloom.texture);
                source = bloom.texture;
                sourceWidth = levelWidth;
                sourceHeight = levelHeight;
                postPasses += 3;
                bloomPasses += 3;
                framebufferBinds += 3;
            }
        }
        this.#final(sceneTarget.texture, bloomTextures, framebuffer, width, height, settings);
        postPasses++;
        framebufferBinds++;
        drawCalls += postPasses;
        const targetMetrics = this.targets.metrics();
        this.metrics = {
            postProcessingActive: true,
            postPasses,
            fullscreenDraws: postPasses,
            framebufferBinds,
            bloomPasses,
            bloomLevels: bloomTextures.length,
            postShaderCompiles: this.compileCount,
            postShaderCompilesThisFrame: this.compileCount - compileStart,
            offscreenCameraRenders: offscreenRenders,
            totalOffscreenCameraRenders: this.totalOffscreenRenders,
            antialiasSamples: sceneTarget.samples,
            ...targetMetrics
        };
        return drawCalls;
    }

    renderToTarget(scene, definition, cameraId = null) {
        this.targets.beginFrame();
        const texture = this.targets.renderUser(definition, (framebuffer, width, height) => {
            this.scenePass.render(scene, framebuffer, width, height, 0, 1, cameraId);
        });
        this.pendingOffscreenRenders++;
        this.totalOffscreenRenders++;
        this.metrics = {
            ...this.metrics,
            ...this.targets.metrics(),
            offscreenCameraRenders: this.pendingOffscreenRenders,
            totalOffscreenCameraRenders: this.totalOffscreenRenders
        };
        return texture;
    }

    clearTarget(definition, color = [0, 0, 0, 0]) {
        this.targets.beginFrame();
        this.targets.clearUser(definition, color);
        this.metrics = {...this.metrics, ...this.targets.metrics()};
    }

    resetResources() {
        this.targets.resetResources();
        this.allocatedBloomLevels = 0;
        this.pendingOffscreenRenders = 0;
        this.totalOffscreenRenders = 0;
        this.metrics = this.#emptyMetrics();
    }

    dispose() {
        const gl = this.gl;
        if (this.downsampleProgram) gl.deleteProgram(this.downsampleProgram);
        if (this.blurProgram) gl.deleteProgram(this.blurProgram);
        if (this.finalProgram) gl.deleteProgram(this.finalProgram);
        if (this.vertexArray) gl.deleteVertexArray(this.vertexArray);
        this.downsampleProgram = null;
        this.blurProgram = null;
        this.finalProgram = null;
        this.vertexArray = null;
    }

    #downsample(source, sourceWidth, sourceHeight, target, threshold, sourceIsSrgb) {
        const gl = this.gl;
        if (!this.downsampleLocations) throw new Error('Bloom downsample program is unavailable');
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        this.#fullscreenState(target.width, target.height);
        gl.useProgram(this.downsampleProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.uniform1i(this.downsampleLocations.uSource, 0);
        gl.uniform2f(this.downsampleLocations.uTexelSize, 1 / sourceWidth, 1 / sourceHeight);
        gl.uniform1f(this.downsampleLocations.uThreshold, threshold);
        gl.uniform1i(this.downsampleLocations.uSourceIsSrgb, sourceIsSrgb ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    #blur(source, target, x, y, radius) {
        const gl = this.gl;
        if (!this.blurLocations) throw new Error('Bloom blur program is unavailable');
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        this.#fullscreenState(target.width, target.height);
        gl.useProgram(this.blurProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.uniform1i(this.blurLocations.uSource, 0);
        const scale = 0.75 + Math.max(1, Math.min(4, radius)) * 0.25;
        gl.uniform2f(this.blurLocations.uDirection, x * scale, y * scale);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    #final(sceneTexture, bloomTextures, framebuffer, width, height, settings) {
        this.#ensureFinalProgram();
        const gl = this.gl;
        if (!this.finalLocations) throw new Error('Post-processing final program is unavailable');
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        this.#fullscreenState(width, height);
        gl.useProgram(this.finalProgram);
        const textures = [sceneTexture, ...(bloomTextures.length ? bloomTextures : [sceneTexture])];
        while (textures.length < 5) textures.push(textures[textures.length - 1]);
        for (let index = 0; index < 5; index++) {
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        }
        gl.uniform1i(this.finalLocations.uScene, 0);
        gl.uniform1i(this.finalLocations.uBloom0, 1);
        gl.uniform1i(this.finalLocations.uBloom1, 2);
        gl.uniform1i(this.finalLocations.uBloom2, 3);
        gl.uniform1i(this.finalLocations.uBloom3, 4);
        gl.uniform2f(this.finalLocations.uResolution, width, height);
        gl.uniform2f(this.finalLocations.uInverseResolution, 1 / width, 1 / height);
        gl.uniform1i(this.finalLocations.uBloomLevels, bloomTextures.length);
        gl.uniform1f(this.finalLocations.uBloomIntensity, settings.bloomIntensity);
        gl.uniform1f(this.finalLocations.uBrightness, settings.brightness);
        gl.uniform1f(this.finalLocations.uContrast, settings.contrast);
        gl.uniform1f(this.finalLocations.uSaturation, settings.saturation);
        gl.uniform1f(this.finalLocations.uVignetteIntensity, settings.vignetteIntensity);
        gl.uniform1f(this.finalLocations.uVignetteRadius, settings.vignetteRadius);
        gl.uniform1f(this.finalLocations.uVignetteSoftness, settings.vignetteSoftness);
        gl.uniform1i(this.finalLocations.uFxaa, settings.fxaaEnabled ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    #fullscreenState(width, height) {
        const gl = this.gl;
        gl.viewport(0, 0, width, height);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.STENCIL_TEST);
        gl.colorMask(true, true, true, true);
        gl.bindVertexArray(this.#vertexArray());
    }

    #vertexArray() {
        if (!this.vertexArray) this.vertexArray = this.gl.createVertexArray();
        if (!this.vertexArray) throw new Error('Unable to allocate the post-processing fullscreen vertex array');
        return this.vertexArray;
    }

    #ensureBloomPrograms() {
        if (!this.downsampleProgram) {
            this.downsampleProgram = createProgram(this.gl, FULLSCREEN_VERTEX_SHADER, BLOOM_DOWNSAMPLE_FRAGMENT_SHADER);
            this.downsampleLocations = locations(this.gl, this.downsampleProgram,
                ['uSource', 'uTexelSize', 'uThreshold', 'uSourceIsSrgb']);
            this.compileCount++;
        }
        if (!this.blurProgram) {
            this.blurProgram = createProgram(this.gl, FULLSCREEN_VERTEX_SHADER, BLOOM_BLUR_FRAGMENT_SHADER);
            this.blurLocations = locations(this.gl, this.blurProgram, ['uSource', 'uDirection']);
            this.compileCount++;
        }
    }

    #ensureFinalProgram() {
        if (this.finalProgram) return;
        this.finalProgram = createProgram(this.gl, FULLSCREEN_VERTEX_SHADER, FINAL_FRAGMENT_SHADER);
        this.finalLocations = locations(this.gl, this.finalProgram, [
            'uScene', 'uBloom0', 'uBloom1', 'uBloom2', 'uBloom3', 'uResolution', 'uInverseResolution',
            'uBloomLevels', 'uBloomIntensity', 'uBrightness', 'uContrast', 'uSaturation',
            'uVignetteIntensity', 'uVignetteRadius', 'uVignetteSoftness', 'uFxaa'
        ]);
        this.compileCount++;
    }

    #emptyMetrics() {
        return {
            postProcessingActive: false,
            postPasses: 0,
            fullscreenDraws: 0,
            framebufferBinds: 0,
            bloomPasses: 0,
            bloomLevels: 0,
            postShaderCompiles: this.compileCount,
            postShaderCompilesThisFrame: 0,
            offscreenCameraRenders: 0,
            totalOffscreenCameraRenders: this.totalOffscreenRenders,
            antialiasSamples: 0
        };
    }
}

export {
    BLOOM_DOWNSAMPLE_FRAGMENT_SHADER,
    BLOOM_BLUR_FRAGMENT_SHADER,
    FINAL_FRAGMENT_SHADER,
    FULLSCREEN_VERTEX_SHADER
};
