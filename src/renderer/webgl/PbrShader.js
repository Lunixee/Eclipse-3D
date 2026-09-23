import {LOCAL_LIGHT_GLSL} from './LocalLightShader.js';

const COLOR_FUNCTIONS = `
vec3 srgbToLinear(vec3 value) {
    bvec3 cutoff = lessThanEqual(value, vec3(0.04045));
    vec3 low = value / 12.92;
    vec3 high = pow((value + 0.055) / 1.055, vec3(2.4));
    return mix(high, low, cutoff);
}

vec3 linearToSrgb(vec3 value) {
    value = max(value, vec3(0.0));
    bvec3 cutoff = lessThanEqual(value, vec3(0.0031308));
    vec3 low = value * 12.92;
    vec3 high = 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055;
    return mix(high, low, cutoff);
}`;

const SHADOW_FUNCTION = `
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
}`;

export const createPbrFragmentShader = (normalMapped, cutout, localLights = false, blended = false) => `#version 300 es
precision highp float;
in vec4 vColor;
in vec2 vRawUv;
in vec3 vNormal;
in vec3 vWorldPosition;
in vec4 vTangent;
flat in float vReceiveShadow;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform vec3 uEmissiveColor;
uniform float uEmissiveIntensity;
uniform float uAlphaCutoff;
uniform float uMetallic;
uniform float uRoughness;
uniform float uNormalScale;
uniform float uAoStrength;
uniform vec3 uCameraPosition;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform bool uEnvironmentEnabled;
uniform sampler2D uEnvironmentIrradiance;
uniform sampler2D uEnvironmentPrefiltered;
uniform float uEnvironmentIntensity;
uniform float uEnvironmentRotation;
uniform float uEnvironmentMaxLod;
uniform int uMapFlags;
uniform int uColorSpaceFlags;
uniform sampler2D uBaseColorTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uMetallicTexture;
uniform sampler2D uRoughnessTexture;
uniform sampler2D uMetallicRoughnessTexture;
uniform sampler2D uEmissiveTexture;
uniform sampler2D uAoTexture;
uniform vec4 uMapUvTransform[7];
uniform float uMapUvRotation[7];
uniform bool uShadowsEnabled;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec2 uShadowTexelSize;
uniform float uShadowBias;
uniform float uShadowNormalBias;
uniform int uShadowFilter;
${localLights ? LOCAL_LIGHT_GLSL : ''}
${COLOR_FUNCTIONS}
out vec4 outputColor;

bool hasMap(int bit) {
    return (uMapFlags & (1 << bit)) != 0;
}

vec2 mapUv(int index) {
    vec2 centered = vRawUv - vec2(0.5);
    float sine = sin(uMapUvRotation[index]);
    float cosine = cos(uMapUvRotation[index]);
    return mat2(cosine, sine, -sine, cosine) * centered * uMapUvTransform[index].zw +
        uMapUvTransform[index].xy + vec2(0.5);
}

float distributionGGX(float normalDotHalf, float roughness) {
    float alpha = roughness * roughness;
    float alphaSquared = alpha * alpha;
    float denominator = normalDotHalf * normalDotHalf * (alphaSquared - 1.0) + 1.0;
    return alphaSquared / max(3.14159265 * denominator * denominator, 1e-6);
}

float smithVisibility(float normalDotDirection, float roughness) {
    float alpha = roughness * roughness;
    float alphaSquared = alpha * alpha;
    return 2.0 * normalDotDirection / max(
        normalDotDirection + sqrt(alphaSquared + (1.0 - alphaSquared) * normalDotDirection * normalDotDirection),
        1e-5
    );
}

vec3 fresnelSchlick(float viewDotHalf, vec3 reflectance) {
    float factor = pow(clamp(1.0 - viewDotHalf, 0.0, 1.0), 5.0);
    return reflectance + (1.0 - reflectance) * factor;
}

vec3 evaluateDirectLight(
    vec3 normal,
    vec3 viewDirection,
    vec3 baseColor,
    float metallic,
    float roughness,
    vec3 reflectance,
    vec3 lightDirection,
    vec3 radiance
) {
    vec3 halfVector = viewDirection + lightDirection;
    float halfLengthSquared = dot(halfVector, halfVector);
    vec3 halfDirection = halfLengthSquared > 1e-8 ? halfVector * inversesqrt(halfLengthSquared) : normal;
    float normalDotLight = max(dot(normal, lightDirection), 0.0);
    float normalDotView = max(dot(normal, viewDirection), 1e-4);
    float normalDotHalf = max(dot(normal, halfDirection), 0.0);
    float viewDotHalf = max(dot(viewDirection, halfDirection), 0.0);
    vec3 fresnel = fresnelSchlick(viewDotHalf, reflectance);
    float distribution = distributionGGX(normalDotHalf, roughness);
    float geometry = smithVisibility(normalDotView, roughness) * smithVisibility(normalDotLight, roughness);
    vec3 specular = distribution * geometry * fresnel / max(4.0 * normalDotView * normalDotLight, 1e-5);
    vec3 diffuse = (1.0 - fresnel) * (1.0 - metallic) * baseColor / 3.14159265;
    return (diffuse + specular) * radiance * normalDotLight;
}

vec2 environmentUv(vec3 direction) {
    float sine = sin(uEnvironmentRotation);
    float cosine = cos(uEnvironmentRotation);
    direction.xz = mat2(cosine, -sine, sine, cosine) * direction.xz;
    direction = normalize(direction);
    return vec2(
        atan(direction.z, direction.x) / (2.0 * 3.14159265) + 0.5,
        asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265 + 0.5
    );
}

vec3 fresnelSchlickRoughness(float normalDotView, vec3 reflectance, float roughness) {
    return reflectance + (max(vec3(1.0 - roughness), reflectance) - reflectance) *
        pow(clamp(1.0 - normalDotView, 0.0, 1.0), 5.0);
}

vec2 environmentBrdf(float normalDotView, float roughness) {
    vec4 first = vec4(-1.0, -0.0275, -0.572, 0.022) * roughness +
        vec4(1.0, 0.0425, 1.04, -0.04);
    float factor = min(first.x * first.x, exp2(-9.28 * normalDotView)) * first.x + first.y;
    return vec2(-1.04, 1.04) * factor + first.zw;
}

${SHADOW_FUNCTION}

${normalMapped ? `vec3 mappedNormal(vec3 baseNormal) {
    vec2 uv = mapUv(1);
    vec3 tangentNormal = texture(uNormalTexture, uv).xyz * 2.0 - 1.0;
    tangentNormal.xy *= uNormalScale;
    if (abs(vTangent.w) > 0.5) {
        vec3 tangent = normalize(vTangent.xyz - baseNormal * dot(baseNormal, vTangent.xyz));
        vec3 bitangent = cross(baseNormal, tangent) * vTangent.w;
        return normalize(mat3(tangent, bitangent, baseNormal) * tangentNormal);
    }
    vec3 dp1 = dFdx(vWorldPosition);
    vec3 dp2 = dFdy(vWorldPosition);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    float determinant = duv1.x * duv2.y - duv1.y * duv2.x;
    float uvDerivativeScale = max(dot(duv1, duv1), dot(duv2, duv2));
    if (uvDerivativeScale <= 0.0 || abs(determinant) <= uvDerivativeScale * 1e-5) return baseNormal;
    vec3 tangent = dp1 * duv2.y - dp2 * duv1.y;
    tangent -= baseNormal * dot(baseNormal, tangent);
    float tangentLengthSquared = dot(tangent, tangent);
    if (tangentLengthSquared <= 1e-20) return baseNormal;
    float handedness = determinant < 0.0 ? -1.0 : 1.0;
    tangent *= inversesqrt(tangentLengthSquared) * handedness;
    vec3 bitangent = cross(baseNormal, tangent) * handedness;
    return normalize(mat3(tangent, bitangent, baseNormal) * tangentNormal);
}` : ''}

void main() {
    vec4 baseSample = vec4(1.0);
    if (hasMap(0)) {
        baseSample = texture(uBaseColorTexture, mapUv(0));
        if ((uColorSpaceFlags & 1) != 0) baseSample.rgb = srgbToLinear(baseSample.rgb);
    }
    vec4 base = vec4(baseSample.rgb * srgbToLinear(vColor.rgb) * uBaseColor, baseSample.a * vColor.a);
    float alpha = base.a * uOpacity;
    ${cutout ? 'if (alpha < uAlphaCutoff) discard;' : ''}

    float metallic = uMetallic;
    float roughness = uRoughness;
    if (hasMap(4)) {
        vec4 packed = texture(uMetallicRoughnessTexture, mapUv(4));
        roughness *= packed.g;
        metallic *= packed.b;
    }
    if (hasMap(2)) metallic *= texture(uMetallicTexture, mapUv(2)).r;
    if (hasMap(3)) roughness *= texture(uRoughnessTexture, mapUv(3)).r;
    metallic = clamp(metallic, 0.0, 1.0);
    roughness = clamp(roughness, 0.04, 1.0);

    vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    ${normalMapped ? 'if (hasMap(1)) normal = mappedNormal(normal);' : ''}
    vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
    vec3 lightDirection = normalize(-uLightDirection);
    float normalDotView = max(dot(normal, viewDirection), 1e-4);
    vec3 reflectance = mix(vec3(0.04), base.rgb, metallic);
    float visibility = uShadowsEnabled && vReceiveShadow > 0.5 ? shadowVisibility(normal) : 1.0;
    vec3 direct = evaluateDirectLight(
        normal,
        viewDirection,
        base.rgb,
        metallic,
        roughness,
        reflectance,
        lightDirection,
        uLightColor * uLightIntensity
    ) * visibility;
    ${localLights ? `for (int index = 0; index < MAX_LOCAL_LIGHTS; index++) {
        if (index >= uLocalLightCount) break;
        vec3 localDirection;
        vec3 radiance = localLightRadiance(index, vWorldPosition, localDirection);
        direct += evaluateDirectLight(
            normal,
            viewDirection,
            base.rgb,
            metallic,
            roughness,
            reflectance,
            localDirection,
            radiance
        );
    }` : ''}

    float ambientOcclusion = 1.0;
    if (hasMap(6)) ambientOcclusion = mix(1.0, texture(uAoTexture, mapUv(6)).r, uAoStrength);
    vec3 ambient;
    if (uEnvironmentEnabled) {
        vec3 irradiance = texture(uEnvironmentIrradiance, environmentUv(normal)).rgb;
        vec3 environmentFresnel = fresnelSchlickRoughness(normalDotView, reflectance, roughness);
        vec3 environmentDiffuse = (1.0 - environmentFresnel) * (1.0 - metallic) * base.rgb * irradiance;
        vec3 reflection = reflect(-viewDirection, normal);
        vec3 prefiltered = textureLod(
            uEnvironmentPrefiltered,
            environmentUv(reflection),
            roughness * uEnvironmentMaxLod
        ).rgb;
        vec2 brdf = environmentBrdf(normalDotView, roughness);
        vec3 environmentSpecular = prefiltered * (reflectance * brdf.x + brdf.y);
        ambient = (environmentDiffuse + environmentSpecular) * uEnvironmentIntensity * ambientOcclusion;
    } else {
        ambient = base.rgb * (1.0 - metallic) * uAmbientColor * uAmbientIntensity * ambientOcclusion;
    }
    vec3 emissive = uEmissiveColor * uEmissiveIntensity;
    if (hasMap(5)) {
        vec3 emissiveSample = texture(uEmissiveTexture, mapUv(5)).rgb;
        if ((uColorSpaceFlags & (1 << 5)) != 0) emissiveSample = srgbToLinear(emissiveSample);
        emissive *= emissiveSample;
    }
    outputColor = vec4(linearToSrgb(direct + ambient + emissive), ${blended ? 'alpha' : '1.0'});
}`;
