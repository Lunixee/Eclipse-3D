import {MAX_LOCAL_LIGHTS} from './LocalLightSelector.js';

export const LOCAL_LIGHT_GLSL = `
#define MAX_LOCAL_LIGHTS ${MAX_LOCAL_LIGHTS}
uniform int uLocalLightCount;
uniform vec4 uLocalLightPositionRange[MAX_LOCAL_LIGHTS];
uniform vec4 uLocalLightColorIntensity[MAX_LOCAL_LIGHTS];
uniform vec4 uLocalLightDirectionOuter[MAX_LOCAL_LIGHTS];
uniform float uLocalLightInnerCos[MAX_LOCAL_LIGHTS];

vec3 localLightRadiance(int index, vec3 worldPosition, out vec3 lightDirection) {
    vec3 toLight = uLocalLightPositionRange[index].xyz - worldPosition;
    float distanceSquared = dot(toLight, toLight);
    float distanceToLight = sqrt(distanceSquared);
    float range = uLocalLightPositionRange[index].w;
    lightDirection = distanceToLight > 1e-5 ? toLight / distanceToLight : vec3(0.0, 1.0, 0.0);
    if (range <= 0.0 || distanceToLight >= range) return vec3(0.0);
    float normalizedDistance = distanceToLight / range;
    float cutoff = max(1.0 - pow(normalizedDistance, 4.0), 0.0);
    float attenuation = cutoff * cutoff / max(distanceSquared, 0.01);
    float outerCos = uLocalLightDirectionOuter[index].w;
    if (outerCos > -1.0) {
        float coneCos = dot(-lightDirection, normalize(uLocalLightDirectionOuter[index].xyz));
        attenuation *= smoothstep(outerCos, uLocalLightInnerCos[index], coneCos);
    }
    return uLocalLightColorIntensity[index].rgb * uLocalLightColorIntensity[index].w * attenuation;
}`;
