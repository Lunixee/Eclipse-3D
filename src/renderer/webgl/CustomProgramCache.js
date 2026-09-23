import {createProgram} from './shader.js';

const BUILT_INS = `
uniform mat4 t3d_view;
uniform mat4 t3d_projection;
uniform mat4 t3d_viewProjection;
uniform vec3 t3d_cameraPosition;
uniform vec2 t3d_targetSize;
uniform float t3d_opacity;
`;

const ATTRIBUTES = `
layout(location=0) in vec3 t3d_position;
layout(location=1) in vec3 t3d_normal;
layout(location=2) in vec4 t3d_model0;
layout(location=3) in vec4 t3d_model1;
layout(location=4) in vec4 t3d_model2;
layout(location=5) in vec4 t3d_model3;
layout(location=6) in vec4 t3d_instanceColor;
layout(location=7) in vec2 t3d_uv;
layout(location=9) in vec4 t3d_tangent;
layout(location=10) in vec4 t3d_vertexColor;
mat4 t3d_modelMatrix() { return mat4(t3d_model0, t3d_model1, t3d_model2, t3d_model3); }
vec4 t3d_clipPosition(vec3 position) { return t3d_viewProjection * t3d_modelMatrix() * vec4(position, 1.0); }
`;

const BUILT_IN_NAMES = ['t3d_view', 't3d_projection', 't3d_viewProjection', 't3d_cameraPosition', 't3d_targetSize', 't3d_opacity'];
const ATTRIBUTE_NAMES = new Set(['t3d_position', 't3d_normal', 't3d_model0', 't3d_model1', 't3d_model2', 't3d_model3', 't3d_instanceColor', 't3d_uv', 't3d_tangent', 't3d_vertexColor']);

export const customShaderSources = definition => {
    const uniforms = definition.schema.map(field => `uniform ${field.type === 'color' ? 'vec3' : field.type} ${field.name};`).join('\n');
    const prefix = `#version 300 es\nprecision highp float;\nprecision highp int;\n${BUILT_INS}\n${uniforms}\n`;
    return [prefix + ATTRIBUTES + '\n#line 1\n' + definition.vertexSource, prefix + '\n#line 1\n' + definition.fragmentSource];
};

export class CustomProgramCache {
    constructor(gl, compiler = createProgram) {
        this.gl = gl;
        this.compiler = compiler;
        this.entries = new Map();
        this.compileCount = 0;
        this.uniformUploads = 0;
    }

    get(material, skinned = false) {
        if (skinned) throw new Error('Custom shader contract v1 does not support skinned geometry');
        const definition = material.customShader;
        if (!definition || definition.disposed) throw new Error('Custom shader definition is unavailable');
        let entry = this.entries.get(definition.key);
        if (!entry) {
            entry = {key: definition.key, owners: new Set(), program: null, error: '', locations: {}, fields: [], material: null, opacity: NaN};
            this.entries.set(definition.key, entry);
            const gl = this.gl;
            try {
                const [vertex, fragment] = customShaderSources(definition);
                this.compileCount++;
                entry.program = this.compiler(gl, vertex, fragment);
                const allowed = new Set([...BUILT_IN_NAMES, ...definition.schema.map(field => field.name)]);
                for (let i = 0; i < gl.getProgramParameter(entry.program, gl.ACTIVE_UNIFORMS); i++) {
                    const field = gl.getActiveUniform(entry.program, i);
                    if (!allowed.has(field.name) || field.size !== 1) throw new Error(`Uniform "${field.name}" must be declared in the typed schema; arrays are unsupported`);
                }
                for (let i = 0; i < gl.getProgramParameter(entry.program, gl.ACTIVE_ATTRIBUTES); i++) {
                    const field = gl.getActiveAttrib(entry.program, i);
                    if (!ATTRIBUTE_NAMES.has(field.name)) throw new Error(`Unsupported vertex attribute "${field.name}"`);
                }
                for (const name of BUILT_IN_NAMES) entry.locations[name] = gl.getUniformLocation(entry.program, name);
                entry.fields = definition.schema.map(field => ({...field, location: gl.getUniformLocation(entry.program, field.name), version: -1}));
            } catch (error) {
                if (entry.program) gl.deleteProgram(entry.program);
                entry.program = null;
                entry.error = error instanceof Error ? error.message : String(error);
            }
        }
        entry.owners.add(definition);
        if (entry.error) throw new Error(`Custom shader "${definition.name}" failed: ${entry.error}`);
        return entry;
    }

    bindFrame(entry, view, projection, viewProjection, cameraPosition, width, height) {
        const gl = this.gl, locations = entry.locations;
        if (locations.t3d_view !== null) gl.uniformMatrix4fv(locations.t3d_view, false, view);
        if (locations.t3d_projection !== null) gl.uniformMatrix4fv(locations.t3d_projection, false, projection);
        if (locations.t3d_viewProjection !== null) gl.uniformMatrix4fv(locations.t3d_viewProjection, false, viewProjection);
        if (locations.t3d_cameraPosition !== null) gl.uniform3fv(locations.t3d_cameraPosition, cameraPosition);
        if (locations.t3d_targetSize !== null) gl.uniform2f(locations.t3d_targetSize, width, height);
    }

    bindMaterial(entry, material, bindTexture) {
        const gl = this.gl;
        const switched = entry.material !== material;
        if (entry.opacity !== material.opacity && entry.locations.t3d_opacity !== null) {
            gl.uniform1f(entry.locations.t3d_opacity, material.opacity);
            entry.opacity = material.opacity;
        }
        for (let i = 0; i < entry.fields.length; i++) {
            const field = entry.fields[i], uniform = material.customUniforms[i];
            if (field.location === null) continue;
            if (field.type === 'sampler2D') bindTexture(uniform.value, field.unit);
            if (!switched && field.version === uniform.version) continue;
            if (field.type === 'sampler2D') gl.uniform1i(field.location, field.unit);
            else if (field.type === 'int') gl.uniform1i(field.location, uniform.value);
            else if (field.type === 'float') gl.uniform1f(field.location, uniform.value);
            else if (field.size === 2) gl.uniform2fv(field.location, uniform.value);
            else if (field.size === 3) gl.uniform3fv(field.location, uniform.value);
            else gl.uniform4fv(field.location, uniform.value);
            field.version = uniform.version;
            this.uniformUploads++;
        }
        entry.material = material;
    }

    sweep() {
        for (const [key, entry] of this.entries) {
            if (entry.material?.disposed) entry.material = null;
            for (const owner of entry.owners) if (owner.disposed) entry.owners.delete(owner);
            if (entry.owners.size) continue;
            if (entry.program) this.gl.deleteProgram(entry.program);
            this.entries.delete(key);
        }
    }

    dispose() {
        for (const entry of this.entries.values()) if (entry.program) this.gl.deleteProgram(entry.program);
        this.entries.clear();
    }
}
