import {AlphaMode, MaterialType} from '../../materials/MaterialStore.js';
import {createProgram} from './shader.js';
import {createPbrFragmentShader} from './PbrShader.js';
import {LOCAL_LIGHT_GLSL} from './LocalLightShader.js';
import {CustomProgramCache} from './CustomProgramCache.js';

export const materialShaderKey = (material, localLights = false, skinned = false) => {
    if (material.customShader) return `custom|${material.customShader.sortId}`;
    const key = material.type === MaterialType.PBR ? [
        material.type,
        material.normalTextureId >= 0 ? 'normal' : 'flat',
        material.alphaMode
    ] : [material.type, material.textureId >= 0 ? 'texture' : 'solid', material.alphaMode];
    if (localLights && (material.type === MaterialType.PBR || material.type === MaterialType.BASIC_LIT)) {
        key.push('local');
    }
    if (skinned) {
        if (!localLights || (material.type !== MaterialType.PBR && material.type !== MaterialType.BASIC_LIT)) key.push('global');
        key.push('skin');
    }
    return key.join('|');
};

export const createMaterialFragmentShader = key => {
    const [type, textureMode, alphaMode, lightMode = 'global'] = String(key).split('|');
    const localLights = lightMode === 'local';
    if (!['global', 'local'].includes(lightMode)) throw new Error(`Invalid local-light variant "${lightMode}"`);
    if (type === MaterialType.PBR) {
        if (!['flat', 'normal'].includes(textureMode)) throw new Error(`Invalid PBR normal variant "${textureMode}"`);
        if (![AlphaMode.OPAQUE, AlphaMode.CUTOUT, AlphaMode.BLEND].includes(/** @type {"opaque" | "cutout" | "blend"} */ (alphaMode))) {
            throw new Error(`Invalid material alpha variant "${alphaMode}"`);
        }
        return createPbrFragmentShader(
            textureMode === 'normal',
            alphaMode === AlphaMode.CUTOUT,
            localLights,
            alphaMode === AlphaMode.BLEND
        );
    }
    const lit = type === MaterialType.BASIC_LIT;
    const textured = textureMode === 'texture';
    const cutout = alphaMode === AlphaMode.CUTOUT;
    const blended = alphaMode === AlphaMode.BLEND;
    if (!lit && type !== MaterialType.UNLIT) throw new Error(`Invalid material shader type "${type}"`);
    if (!['texture', 'solid'].includes(textureMode)) throw new Error(`Invalid texture variant "${textureMode}"`);
    if (![AlphaMode.OPAQUE, AlphaMode.CUTOUT, AlphaMode.BLEND].includes(/** @type {"opaque" | "cutout" | "blend"} */ (alphaMode))) {
        throw new Error(`Invalid material alpha variant "${alphaMode}"`);
    }

    const litDeclarations = lit ? `
in vec3 vNormal;
in vec3 vWorldPosition;
flat in float vReceiveShadow;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform bool uShadowsEnabled;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec2 uShadowTexelSize;
uniform float uShadowBias;
uniform float uShadowNormalBias;
uniform int uShadowFilter;
${localLights ? LOCAL_LIGHT_GLSL : ''}

float shadowVisibility(vec3 normal) {
    vec4 projected = uShadowMatrix * vec4(vWorldPosition + normal * uShadowNormalBias, 1.0);
    vec3 coordinate = projected.xyz / projected.w * 0.5 + 0.5;
    if (coordinate.x <= 0.0 || coordinate.x >= 1.0 || coordinate.y <= 0.0 || coordinate.y >= 1.0 ||
        coordinate.z <= 0.0 || coordinate.z >= 1.0) return 1.0;
    float comparison = coordinate.z - uShadowBias;
    if (uShadowFilter == 0) return step(comparison, texture(uShadowMap, coordinate.xy).r);
    float visibility = 0.0;
    if (uShadowFilter == 1) {
        visibility += step(comparison, texture(uShadowMap, coordinate.xy + vec2(-0.5, -0.5) * uShadowTexelSize).r);
        visibility += step(comparison, texture(uShadowMap, coordinate.xy + vec2(0.5, -0.5) * uShadowTexelSize).r);
        visibility += step(comparison, texture(uShadowMap, coordinate.xy + vec2(-0.5, 0.5) * uShadowTexelSize).r);
        visibility += step(comparison, texture(uShadowMap, coordinate.xy + vec2(0.5, 0.5) * uShadowTexelSize).r);
        return visibility * 0.25;
    }
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            visibility += step(comparison, texture(
                uShadowMap,
                coordinate.xy + vec2(float(x), float(y)) * uShadowTexelSize
            ).r);
        }
    }
    return visibility / 9.0;
}` : '';

    const surface = textured ? 'texture(uTexture, vUv)' : 'vec4(1.0)';
    const colorDecode = textured ? `
    if (uTextureIsSrgb) surface.rgb = srgbToLinear(surface.rgb);` : '';
    const lighting = lit ? `
    vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    float diffuse = max(dot(normal, normalize(-uLightDirection)), 0.0);
    float visibility = uShadowsEnabled && vReceiveShadow > 0.5 ? shadowVisibility(normal) : 1.0;
    vec3 lightValue = vec3(0.18) + uLightColor * diffuse * uLightIntensity * visibility;
    ${localLights ? `for (int index = 0; index < MAX_LOCAL_LIGHTS; index++) {
        if (index >= uLocalLightCount) break;
        vec3 localDirection;
        vec3 radiance = localLightRadiance(index, vWorldPosition, localDirection);
        lightValue += radiance * max(dot(normal, localDirection), 0.0);
    }` : ''}
    vec3 rgb = base.rgb * lightValue + uEmissiveColor * uEmissiveIntensity;` : `
    vec3 rgb = base.rgb + uEmissiveColor * uEmissiveIntensity;`;
    const cutoff = cutout ? `
    if (alpha < uAlphaCutoff) discard;` : '';

    return `#version 300 es
precision highp float;
in vec4 vColor;
in vec2 vUv;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform vec3 uEmissiveColor;
uniform float uEmissiveIntensity;
uniform float uAlphaCutoff;
${textured ? 'uniform sampler2D uTexture;' : ''}
${textured ? 'uniform bool uTextureIsSrgb;' : ''}
${litDeclarations}
${textured ? `vec3 srgbToLinear(vec3 value) {
    bvec3 cutoff = lessThanEqual(value, vec3(0.04045));
    return mix(pow((value + 0.055) / 1.055, vec3(2.4)), value / 12.92, cutoff);
}` : ''}
out vec4 outputColor;

void main() {
    vec4 surface = ${surface};${colorDecode}
    vec4 base = vec4(surface.rgb * vColor.rgb * uBaseColor, surface.a * vColor.a);
    float alpha = base.a * uOpacity;${cutoff}${lighting}
    outputColor = vec4(rgb, ${blended ? 'alpha' : '1.0'});
}`;
};

const UNIFORMS = [
    'uViewProjection',
    'uBaseColor',
    'uOpacity',
    'uEmissiveColor',
    'uEmissiveIntensity',
    'uAlphaCutoff',
    'uTexture',
    'uTextureIsSrgb',
    'uUvOffset',
    'uUvRepeat',
    'uUvRotation',
    'uLightDirection',
    'uLightColor',
    'uLightIntensity',
    'uShadowsEnabled',
    'uShadowMap',
    'uShadowMatrix',
    'uShadowTexelSize',
    'uShadowBias',
    'uShadowNormalBias',
    'uShadowFilter',
    'uMetallic',
    'uRoughness',
    'uNormalScale',
    'uAoStrength',
    'uCameraPosition',
    'uAmbientColor',
    'uAmbientIntensity',
    'uEnvironmentEnabled',
    'uEnvironmentIrradiance',
    'uEnvironmentPrefiltered',
    'uEnvironmentIntensity',
    'uEnvironmentRotation',
    'uEnvironmentMaxLod',
    'uMapFlags',
    'uColorSpaceFlags',
    'uBaseColorTexture',
    'uNormalTexture',
    'uMetallicTexture',
    'uRoughnessTexture',
    'uMetallicRoughnessTexture',
    'uEmissiveTexture',
    'uAoTexture',
    'uMapUvTransform[0]',
    'uMapUvRotation[0]',
    'uLocalLightCount',
    'uLocalLightPositionRange[0]',
    'uLocalLightColorIntensity[0]',
    'uLocalLightDirectionOuter[0]',
    'uLocalLightInnerCos[0]',
    'uJointPalette'
];

export class MaterialProgramCache {
    constructor(gl, vertexShader, skinnedVertexShader = vertexShader, compiler = createProgram) {
        if (typeof skinnedVertexShader === 'function') {
            compiler = skinnedVertexShader;
            skinnedVertexShader = vertexShader;
        }
        this.gl = gl;
        this.vertexShader = vertexShader;
        this.skinnedVertexShader = skinnedVertexShader;
        this.compiler = compiler;
        this.entries = new Map();
        this.compileCount = 0;
        this.custom = null;
    }

    get(material, localLights = false, skinned = false) {
        if (material.customShader) {
            this.custom ??= new CustomProgramCache(this.gl, this.compiler);
            return this.custom.get(material, skinned);
        }
        const key = materialShaderKey(material, localLights, skinned);
        let entry = this.entries.get(key);
        if (entry) return entry;
        let program;
        try {
            program = this.compiler(this.gl, skinned ? this.skinnedVertexShader : this.vertexShader, createMaterialFragmentShader(key));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Material shader variant "${key}" failed: ${message}`);
        }
        const locations = {};
        for (const name of UNIFORMS) locations[name] = this.gl.getUniformLocation(program, name);
        entry = {key, program, locations};
        this.entries.set(key, entry);
        this.compileCount++;
        return entry;
    }

    warm(material, localLights = false, skinned = false) {
        return this.get(material, localLights, skinned);
    }

    dispose() {
        for (const entry of this.entries.values()) this.gl.deleteProgram(entry.program);
        this.entries.clear();
        this.custom?.dispose();
    }

    get size() {
        return this.entries.size;
    }

    get pbrSize() {
        let count = 0;
        for (const key of this.entries.keys()) {
            if (key.startsWith(`${MaterialType.PBR}|`)) count++;
        }
        return count;
    }
}
