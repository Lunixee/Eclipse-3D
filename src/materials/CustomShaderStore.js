export const CUSTOM_UNIFORM_TYPES = Object.freeze({float: 1, int: 1, vec2: 2, vec3: 3, vec4: 4, color: 3, sampler2D: 1});
export const CUSTOM_SAMPLER_LIMIT = 8;
// Keep the directional shadow (1) and environment (8/9) bindings intact when
// alternating ordinary/custom draws. Unit 10 is already guarded for skinning.
const SAMPLER_UNITS = [0, 2, 3, 4, 5, 6, 7, 10];
let nextSortId = 1;

const shaderSource = (source, stage) => {
    if (typeof source !== 'string' || !source.trim()) throw new Error(`${stage} shader source cannot be empty`);
    if (source.length > 262144) throw new Error(`${stage} shader source exceeds 256 KiB`);
    if (/^\s*#\s*version\b/m.test(source)) throw new Error('Supply GLSL ES 3 shader bodies without a #version directive');
    return source;
};

// Logical source definitions survive renderer replacement. Only materials retain
// them; GPU programs are owned exclusively by MaterialProgramCache.
export class CustomShaderStore {
    /** @param {(() => void) | null} [onChange] */
    constructor(onChange = null) {
        this.resources = new Map();
        this.onChange = onChange;
    }

    create(name, vertex, fragment, uniforms = {}) {
        if (!String(name).trim()) throw new Error('Shader name cannot be empty');
        if (this.resources.has(name)) throw new Error(`Shader "${name}" already exists`);
        const vertexSource = shaderSource(vertex, 'Vertex');
        const fragmentSource = shaderSource(fragment, 'Fragment');
        if (!uniforms || typeof uniforms !== 'object' || Array.isArray(uniforms)) throw new Error('Uniform schema must be an object mapping names to types');
        const names = Object.keys(uniforms).sort();
        if (names.length > 64) throw new Error('A custom shader supports at most 64 uniforms');
        let samplers = 0;
        const schema = names.map(name => {
            const type = uniforms[name];
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || name.startsWith('gl_') || name.startsWith('t3d_') || name.includes('__')) {
                throw new Error(`Invalid or reserved uniform name "${name}"`);
            }
            if (!Object.hasOwn(CUSTOM_UNIFORM_TYPES, type)) throw new Error(`Unsupported uniform type "${type}"`);
            const unit = type === 'sampler2D' ? SAMPLER_UNITS[samplers++] : -1;
            return Object.freeze({name, type, size: CUSTOM_UNIFORM_TYPES[type], unit});
        });
        if (samplers > CUSTOM_SAMPLER_LIMIT) throw new Error(`Custom shaders support at most ${CUSTOM_SAMPLER_LIMIT} samplers`);
        const definition = {
            sortId: nextSortId++,
            name, vertexSource, fragmentSource, schema: Object.freeze(schema), references: 0, disposed: false,
            key: JSON.stringify(['turbo3d-custom-v1', vertexSource, fragmentSource, schema])
        };
        this.resources.set(name, definition);
        this.onChange?.();
        return definition;
    }

    require(name) {
        const definition = this.resources.get(name);
        if (!definition) throw new Error(`Unknown custom shader "${name}"`);
        return definition;
    }

    delete(name) {
        const definition = this.require(name);
        if (definition.references) throw new Error(`Shader "${name}" is still used by ${definition.references} material(s)`);
        definition.disposed = true;
        this.resources.delete(name);
        this.onChange?.();
    }

    clear() {
        for (const definition of this.resources.values()) definition.disposed = true;
        this.resources.clear();
    }
}

export const createCustomUniforms = definition => definition.schema.map(field => ({
    ...field,
    value: field.type === 'sampler2D' ? -1 : field.size === 1 ? 0 : new Float32Array(field.size).fill(field.type === 'color' ? 1 : 0),
    version: 1
}));

export const setCustomUniform = (material, name, value, textures) => {
    const uniform = material.customUniforms?.find(field => field.name === name);
    if (!uniform) throw new Error(`Unknown custom uniform "${name}" on material "${material.name}"`);
    if (uniform.type === 'sampler2D') {
        const id = value === '' || value === null ? -1 : textures.require(value).id;
        if (uniform.value === id) return false;
        if (id >= 0) textures.retain(id);
        if (uniform.value >= 0) textures.release(uniform.value);
        uniform.value = id;
    } else if (uniform.size === 1) {
        const number = Number(value);
        if (!Number.isFinite(number) || (uniform.type === 'int' && (!Number.isInteger(number) || number < -2147483648 || number > 2147483647))) {
            throw new Error(`Uniform "${name}" requires a finite ${uniform.type}`);
        }
        const next = uniform.type === 'int' ? number : Math.fround(number);
        if (!Number.isFinite(next)) throw new Error(`Uniform "${name}" exceeds float32 range`);
        if (uniform.value === next) return false;
        uniform.value = next;
    } else {
        if ((!Array.isArray(value) && !(value instanceof Float32Array)) || value.length !== uniform.size) {
            throw new Error(`Uniform "${name}" requires ${uniform.size} components`);
        }
        let changed = false;
        for (let i = 0; i < uniform.size; i++) {
            const number = value[i];
            if (!Number.isFinite(number) || !Number.isFinite(Math.fround(number))) throw new Error(`Uniform "${name}" requires finite float32 values`);
            if (uniform.type === 'color' && (number < 0 || number > 1)) throw new Error('Color uniforms require linear RGB in 0..1');
            changed ||= uniform.value[i] !== Math.fround(number);
        }
        if (!changed) return false;
        uniform.value.set(value);
    }
    uniform.version++;
    return true;
};
