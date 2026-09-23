export const DEFAULT_CUSTOM_VERTEX = 'out vec4 color;\nvoid main() { color = t3d_vertexColor * t3d_instanceColor; gl_Position = t3d_clipPosition(t3d_position); }';
export const DEFAULT_CUSTOM_FRAGMENT = 'in vec4 color;\nout vec4 outputColor;\nvoid main() { outputColor = vec4(color.rgb * tint, color.a * t3d_opacity); }';
export const DEFAULT_CUSTOM_GEOMETRY = '{"positions":[-1,-1,0,1,-1,0,0,1,0]}';

const menu = items => ({acceptReporters: true, items});
export const CUSTOM_RENDERING_MENUS = {
    geometryUsage: menu(['static', 'dynamic']),
    materialSide: menu(['front', 'back', 'double']),
    materialBlend: menu(['opaque', 'normal', 'additive']),
    materialRenderNumber: menu(['renderOrder', 'polygonOffsetFactor', 'polygonOffsetUnits']),
    materialEnvironmentFactor: menu(['intensity', 'rotation']),
    customRenderingMetric: menu(['shader compiles', 'shader draws', 'uniform uploads', 'geometry uploads'])
};

export const customRenderingBlocks = Scratch => {
    const string = (defaultValue, menu) => ({type: Scratch.ArgumentType.STRING, defaultValue, ...(menu ? {menu} : {})});
    const number = defaultValue => ({type: Scratch.ArgumentType.NUMBER, defaultValue});
    const command = (opcode, text, args) => ({opcode, text, blockType: Scratch.BlockType.COMMAND, arguments: args});
    return [
        '---',
        command('createCustomGeometry', 'create [USAGE] geometry [GEOMETRY] data JSON [DATA]', {USAGE: string('static', 'geometryUsage'), GEOMETRY: string('triangle'), DATA: string(DEFAULT_CUSTOM_GEOMETRY)}),
        command('updateCustomGeometry', 'replace dynamic geometry [GEOMETRY] data JSON [DATA]', {GEOMETRY: string('triangle'), DATA: string(DEFAULT_CUSTOM_GEOMETRY)}),
        command('deleteCustomGeometry', 'delete custom geometry [GEOMETRY]', {GEOMETRY: string('triangle')}),
        command('createGeometryModel', 'create model [MODEL] from geometry [GEOMETRY] material [MATERIAL]', {MODEL: string('mesh'), GEOMETRY: string('triangle'), MATERIAL: string('default')}),
        command('createCustomShader', 'create shader [SHADER] vertex [VERTEX] fragment [FRAGMENT] uniforms JSON [UNIFORMS]', {SHADER: string('custom'), VERTEX: string(DEFAULT_CUSTOM_VERTEX), FRAGMENT: string(DEFAULT_CUSTOM_FRAGMENT), UNIFORMS: string('{"tint":"color"}')}),
        command('deleteCustomShader', 'delete custom shader [SHADER]', {SHADER: string('custom')}),
        command('createCustomMaterial', 'create material [MATERIAL] with custom shader [SHADER]', {MATERIAL: string('custom material'), SHADER: string('custom')}),
        command('setCustomUniform', 'set custom material [MATERIAL] uniform [UNIFORM] value [VALUE]', {MATERIAL: string('custom material'), UNIFORM: string('tint'), VALUE: string('[1,1,1]')}),
        command('setCustomSampler', 'set custom material [MATERIAL] sampler [UNIFORM] texture [TEXTURE]', {MATERIAL: string('custom material'), UNIFORM: string('image'), TEXTURE: string('texture')}),
        command('setMaterialSide', 'set material [MATERIAL] side [SIDE]', {MATERIAL: string('material'), SIDE: string('front', 'materialSide')}),
        command('setMaterialBlendMode', 'set material [MATERIAL] blend [MODE]', {MATERIAL: string('material'), MODE: string('opaque', 'materialBlend')}),
        command('setMaterialRenderNumber', 'set material [MATERIAL] render [PROPERTY] [VALUE]', {MATERIAL: string('material'), PROPERTY: string('renderOrder', 'materialRenderNumber'), VALUE: number(0)}),
        command('setMaterialEnvironmentFactor', 'set PBR material [MATERIAL] environment [PROPERTY] [VALUE]', {MATERIAL: string('material'), PROPERTY: string('intensity', 'materialEnvironmentFactor'), VALUE: number(1)}),
        {opcode: 'customRenderingMetric', text: 'custom rendering [METRIC]', blockType: Scratch.BlockType.REPORTER, arguments: {METRIC: string('shader draws', 'customRenderingMetric')}}
    ];
};
