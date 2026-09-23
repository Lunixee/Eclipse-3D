import {isExecutableBlock} from './blockNavigation.js';
import {API_EXPANSION_FAMILY_OPCODES} from './apiExpansionBlocks.js';

// Serialized opcodes and argument schemas remain registered. Only palette visibility changes.
export const BLOCK_CONSOLIDATIONS = [
    {family: 'Post color factors', oldOpcodes: ['setPostBrightness', 'setPostContrast', 'setPostSaturation'], canonicalOpcodes: ['setPostColorFactor'], reason: 'Three dimensionless numeric color factors share one command.'},
    {family: 'Bloom factors', oldOpcodes: ['setBloomIntensity', 'setBloomThreshold'], canonicalOpcodes: ['setBloomFactor'], reason: 'Numeric intensity and luminance threshold; quality remains separate.'},
    {family: 'Vignette factors', oldOpcodes: ['setVignetteIntensity', 'setVignetteRadius', 'setVignetteSoftness'], canonicalOpcodes: ['setVignetteFactor'], reason: 'Three numeric vignette controls share one command.'},
    {family: 'PBR factors', oldOpcodes: ['setPbrMetallic', 'setPbrRoughness', 'setPbrNormalStrength', 'setPbrAoStrength'], canonicalOpcodes: ['setPbrFactor'], reason: 'Numeric factors share material lookup; colors, textures and toggles remain separate.'},
    {family: 'Material creation', oldOpcodes: ['createPbrMaterial'], canonicalOpcodes: ['createMaterial'], reason: 'Existing material type menu already includes PBR.'},
    {family: 'Camera clip planes', oldOpcodes: ['setCameraNearClip', 'setCameraFarClip'], canonicalOpcodes: ['setCameraClip'], reason: 'Both distances use the same validated projection update.'},
    {family: 'Texture dimensions', oldOpcodes: ['textureWidth', 'textureHeight'], canonicalOpcodes: ['textureDimension'], reason: 'Width/height are numeric dimensions of the same named texture.'},
    {family: 'Target dimensions', oldOpcodes: ['renderTargetWidth', 'renderTargetHeight'], canonicalOpcodes: ['renderTargetDimension'], reason: 'Width/height are numeric dimensions of the same named render target.'},
    {family: 'Internal render dimensions', oldOpcodes: ['internalRenderWidth', 'internalRenderHeight'], canonicalOpcodes: ['internalRenderDimension'], reason: 'Both report allocated render pixels; pixel count remains distinct.'},
    {family: 'Typed ray results', oldOpcodes: ['rayHitValue'], canonicalOpcodes: ['rayHitNumber', 'rayHitText'], reason: 'Separate numeric and text fields; hit/miss remains a Boolean block.'}
];

export const canonicalFamilyOpcodes = () => new Set([
    ...BLOCK_CONSOLIDATIONS.flatMap(family => family.canonicalOpcodes), ...API_EXPANSION_FAMILY_OPCODES
]);

const menu = items => ({acceptReporters: true, items});
export const BLOCK_SURFACE_MENUS = {
    postColorFactor: menu(['brightness', 'contrast', 'saturation']),
    bloomFactor: menu(['intensity', 'threshold']),
    vignetteFactor: menu(['intensity', 'radius', 'softness']),
    pbrFactor: menu(['metallic', 'roughness', 'normal strength', 'AO strength']),
    cameraClipPlane: menu(['near', 'far']),
    dimension: menu(['width', 'height']),
    rayNumberField: menu(['distance', 'x', 'y', 'z', 'normal x', 'normal y', 'normal z', 'triangle', 'primitive', 'geometry ID']),
    rayTextField: menu(['object', 'kind', 'node', 'precision', 'material'])
};

const canonicalDefinitions = Scratch => {
    const string = (defaultValue, menu) => ({type: Scratch.ArgumentType.STRING, defaultValue, ...(menu ? {menu} : {})});
    const number = defaultValue => ({type: Scratch.ArgumentType.NUMBER, defaultValue});
    const command = (opcode, text, args) => ({opcode, text, blockType: Scratch.BlockType.COMMAND, arguments: args});
    const reporter = (opcode, text, args) => ({opcode, text, blockType: Scratch.BlockType.REPORTER, arguments: args});
    return [
        command('setPostColorFactor', 'set post [PROPERTY] factor [VALUE]', {PROPERTY: string('brightness', 'postColorFactor'), VALUE: number(1)}),
        command('setBloomFactor', 'set bloom [PROPERTY] [VALUE]', {PROPERTY: string('intensity', 'bloomFactor'), VALUE: number(0.8)}),
        command('setVignetteFactor', 'set vignette [PROPERTY] [VALUE]', {PROPERTY: string('intensity', 'vignetteFactor'), VALUE: number(0)}),
        command('setPbrFactor', 'set PBR material [MATERIAL] [PROPERTY] [VALUE]', {MATERIAL: string('material'), PROPERTY: string('metallic', 'pbrFactor'), VALUE: number(0)}),
        command('setCameraClip', 'set camera [CAMERA] [PLANE] clip [DISTANCE]', {CAMERA: string('main'), PLANE: string('near', 'cameraClipPlane'), DISTANCE: number(0.1)}),
        reporter('textureDimension', 'texture [TEXTURE] [DIMENSION]', {TEXTURE: string('texture'), DIMENSION: string('width', 'dimension')}),
        reporter('renderTargetDimension', 'render target [TARGET] [DIMENSION]', {TARGET: string('target'), DIMENSION: string('width', 'dimension')}),
        reporter('internalRenderDimension', 'internal render [DIMENSION]', {DIMENSION: string('width', 'dimension')}),
        reporter('rayHitNumber', 'ray hit [FIELD] number', {FIELD: string('distance', 'rayNumberField')}),
        reporter('rayHitText', 'ray hit [FIELD] text', {FIELD: string('object', 'rayTextField')})
    ];
};

export const consolidateBlockPalette = (blocks, Scratch) => {
    const additions = new Map(canonicalDefinitions(Scratch).map(block => [block.opcode, block]));
    const aliases = new Map(BLOCK_CONSOLIDATIONS.flatMap(family => family.oldOpcodes.map(opcode => [opcode, family])));
    const result = [];
    for (const block of blocks) {
        const family = typeof block === 'string' ? null : aliases.get(block.opcode);
        if (family) {
            for (const opcode of family.canonicalOpcodes) {
                if (additions.has(opcode)) result.push(additions.get(opcode));
                additions.delete(opcode);
            }
            result.push({...block, hideFromPalette: true});
        } else result.push(block);
    }
    return result;
};

export const blockSurfaceDiagnostics = blocks => {
    const registered = blocks.filter(block => isExecutableBlock(block));
    const combined = canonicalFamilyOpcodes();
    const aliases = new Set(BLOCK_CONSOLIDATIONS.flatMap(family => family.oldOpcodes));
    const hidden = registered.filter(block => block.hideFromPalette && !aliases.has(block.opcode)).length;
    return {
        discovered: 426,
        registered: registered.length,
        palette: registered.filter(block => !block.hideFromPalette).length,
        canonicalIndependent: registered.filter(block => !block.hideFromPalette && !combined.has(block.opcode)).length,
        canonicalCombined: combined.size,
        oldBlocksAbsorbed: aliases.size,
        legacyAliases: registered.filter(block => aliases.has(block.opcode)).length,
        hidden, safelyRemoved: 0,
        unresolved: [...aliases, ...combined].filter(opcode => !registered.some(block => block.opcode === opcode)).length,
        families: BLOCK_CONSOLIDATIONS.map(family => ({...family, compatibility: 'Original opcode and argument schema retained with hideFromPalette; thin adapter.'}))
    };
};
