import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import JSZip from '@turbowarp/jszip';
import {byOpcode, defaults, menuItems} from '../../../scripts/docs/metadata.mjs';
import {buildKnifeGame} from './knife-game.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const projectPath = path.join(root, 'first-person-knife.sb3');
const date = new Date('2000-01-01T00:00:00.000Z');
const md5 = data => createHash('md5').update(data).digest('hex');

const R = build => ({reporter: true, build});

const ext = (opcode, args = {}) => ({kind: 'ext', opcode, args});
const wait = seconds => ({kind: 'wait', seconds});
const setVar = (name, value) => ({kind: 'setVar', name, value});
const changeVar = (name, value) => ({kind: 'changeVar', name, value});
const ifThen = (condition, body) => ({kind: 'if', condition, body});
const ifElse = (condition, body, otherwise) => ({kind: 'ifElse', condition, body, otherwise});
const repeat = (times, body) => ({kind: 'repeat', times, body});
const forever = body => ({kind: 'forever', body});
const broadcast = (name, waitForCompletion = false) => ({kind: 'broadcast', name, waitForCompletion});

class ProjectBuilder {
    constructor(initialVariables, broadcasts) {
        this.blocks = {};
        this.comments = {};
        this.serial = 0;
        this.variables = {};
        this.variableIds = new Map();
        for (const [name, value] of Object.entries(initialVariables)) {
            const id = `var_${this.variableIds.size + 1}`;
            this.variableIds.set(name, id);
            this.variables[id] = [name, value];
        }
        this.broadcasts = {};
        this.broadcastIds = new Map();
        for (const name of broadcasts) {
            const id = `broadcast_${this.broadcastIds.size + 1}`;
            this.broadcastIds.set(name, id);
            this.broadcasts[id] = name;
        }
    }

    id() { return `k${++this.serial}`; }

    add(opcode, parent = null, options = {}) {
        const id = this.id();
        this.blocks[id] = {opcode, next: null, parent, inputs: {}, fields: {}, shadow: Boolean(options.shadow), topLevel: Boolean(options.topLevel)};
        if (options.topLevel) Object.assign(this.blocks[id], {x: options.x, y: options.y});
        return id;
    }

    literal(value, type = 'string') {
        if (type === 'color') return [9, String(value)];
        if (type === 'number' || type === 'angle') return [4, String(value)];
        return [10, String(value)];
    }

    standardInput(owner, name, value, type = 'number') {
        if (value?.reporter) {
            const child = value.build(this, owner);
            this.blocks[owner].inputs[name] = [3, child, this.literal(type === 'string' ? '' : 0, type)];
        } else {
            this.blocks[owner].inputs[name] = [1, this.literal(value, type)];
        }
    }

    conditionInput(owner, name, value) {
        assert.ok(value?.reporter, `${name} requires a reporter`);
        this.blocks[owner].inputs[name] = [2, value.build(this, owner)];
    }

    extensionInput(owner, name, argument, value, fallbackValue) {
        if (argument.menu) {
            const menu = this.add(`turbo3d_menu_${argument.menu}`, owner, {shadow: true});
            const choice = value?.reporter ? fallbackValue : value;
            assert.ok(menuItems(argument.menu).some(item => String(item.value) === String(choice)),
                `Invalid ${argument.menu} choice ${choice}`);
            this.blocks[menu].fields[argument.menu] = [String(choice), null];
            this.blocks[owner].inputs[name] = value?.reporter ? [3, value.build(this, owner), menu] : [1, menu];
            return;
        }
        const type = argument.type === 'number' || argument.type === 'angle' ? argument.type :
            argument.type === 'color' ? 'color' : 'string';
        this.blocks[owner].inputs[name] = value?.reporter ?
            [3, value.build(this, owner), this.literal(fallbackValue, type)] : [1, this.literal(value, type)];
    }

    extensionBlock(opcode, args, parent) {
        const definition = byOpcode.get(opcode);
        assert.ok(definition, `Unknown Eclipse opcode ${opcode}`);
        const id = this.add(`turbo3d_${opcode}`, parent);
        const values = {...defaults(definition), ...args};
        for (const name of Object.keys(args)) assert.ok(name in (definition.arguments ?? {}), `${opcode}.${name}`);
        for (const [name, argument] of Object.entries(definition.arguments ?? {})) {
            this.extensionInput(id, name, argument, values[name], defaults(definition)[name]);
        }
        return id;
    }

    variableReporter(name, parent) {
        assert.ok(this.variableIds.has(name), `Unknown variable ${name}`);
        const id = this.add('data_variable', parent);
        this.blocks[id].fields.VARIABLE = [name, this.variableIds.get(name)];
        return id;
    }

    standardReporter(opcode, inputs, fields, parent, inputTypes = {}) {
        const id = this.add(opcode, parent);
        Object.assign(this.blocks[id].fields, fields);
        for (const [name, value] of Object.entries(inputs)) this.standardInput(id, name, value, inputTypes[name] ?? 'number');
        return id;
    }

    sequence(steps, parent) {
        let first = null;
        let previous = null;
        for (const step of steps) {
            const blockParent = previous ?? parent;
            let id;
            if (step.kind === 'ext') id = this.extensionBlock(step.opcode, step.args, blockParent);
            else if (step.kind === 'call') {
                id = this.add('procedures_call', blockParent);
                this.blocks[id].mutation = {tagName: 'mutation', children: [], proccode: step.name, argumentids: '[]', warp: 'true'};
            }
            else if (step.kind === 'wait') {
                id = this.add('control_wait', blockParent);
                this.standardInput(id, 'DURATION', step.seconds);
            } else if (step.kind === 'setVar' || step.kind === 'changeVar') {
                assert.ok(this.variableIds.has(step.name), `Unknown variable ${step.name}`);
                id = this.add(step.kind === 'setVar' ? 'data_setvariableto' : 'data_changevariableby', blockParent);
                this.blocks[id].fields.VARIABLE = [step.name, this.variableIds.get(step.name)];
                this.standardInput(id, 'VALUE', step.value, step.kind === 'setVar' ? 'string' : 'number');
            } else if (step.kind === 'if' || step.kind === 'ifElse') {
                id = this.add(step.kind === 'if' ? 'control_if' : 'control_if_else', blockParent);
                this.conditionInput(id, 'CONDITION', step.condition);
                this.blocks[id].inputs.SUBSTACK = [2, this.sequence(step.body, id)];
                if (step.kind === 'ifElse') this.blocks[id].inputs.SUBSTACK2 = [2, this.sequence(step.otherwise, id)];
            } else if (step.kind === 'repeatUntil' || step.kind === 'waitUntil') {
                id = this.add(step.kind === 'repeatUntil' ? 'control_repeat_until' : 'control_wait_until', blockParent);
                this.conditionInput(id, 'CONDITION', step.condition);
                if (step.body) this.blocks[id].inputs.SUBSTACK = [2, this.sequence(step.body, id)];
            } else if (step.kind === 'costume') {
                id = this.add('looks_switchcostumeto', blockParent);
                const menu = this.add('looks_costume', id, {shadow: true});
                this.blocks[menu].fields.COSTUME = [step.name, null];
                this.blocks[id].inputs.COSTUME = [1, menu];
            } else if (step.kind === 'say') {
                id = this.add('looks_say', blockParent);
                this.standardInput(id, 'MESSAGE', step.message, 'string');
            } else if (step.kind === 'repeat') {
                id = this.add('control_repeat', blockParent);
                this.standardInput(id, 'TIMES', step.times);
                this.blocks[id].inputs.SUBSTACK = [2, this.sequence(step.body, id)];
            } else if (step.kind === 'forever') {
                id = this.add('control_forever', blockParent);
                this.blocks[id].inputs.SUBSTACK = [2, this.sequence(step.body, id)];
            } else if (step.kind === 'broadcast') {
                const broadcastId = this.broadcastIds.get(step.name);
                assert.ok(broadcastId, `Unknown broadcast ${step.name}`);
                id = this.add(step.waitForCompletion ? 'event_broadcastandwait' : 'event_broadcast', blockParent);
                this.blocks[id].inputs.BROADCAST_INPUT = [1, [11, step.name, broadcastId]];
            } else throw new Error(`Unknown command kind ${step.kind}`);
            first ??= id;
            if (previous) this.blocks[previous].next = id;
            previous = id;
        }
        return first;
    }

    hat(kind, steps, x, y, comment, broadcastName = '') {
        const opcode = kind === 'flag' ? 'event_whenflagclicked' :
            kind === 'stageClick' ? 'event_whenstageclicked' :
                kind === 'spriteClick' ? 'event_whenthisspriteclicked' :
                    kind === 'key' ? 'event_whenkeypressed' : 'event_whenbroadcastreceived';
        const id = this.add(opcode, null, {topLevel: true, x, y});
        if (kind === 'receive') {
            const broadcastId = this.broadcastIds.get(broadcastName);
            this.blocks[id].fields.BROADCAST_OPTION = [broadcastName, broadcastId];
        } else if (kind === 'key') {
            this.blocks[id].fields.KEY_OPTION = [broadcastName, null];
        }
        this.blocks[id].next = this.sequence(steps, id);
        const commentId = `comment_${Object.keys(this.comments).length + 1}`;
        this.comments[commentId] = {blockId: id, x: x + 330, y, width: 320, height: 150, minimized: false, text: comment};
        this.blocks[id].comment = commentId;
        return id;
    }

    validate() {
        for (const [id, block] of Object.entries(this.blocks)) {
            if (block.parent !== null) assert.ok(this.blocks[block.parent], `${id} has missing parent ${block.parent}`);
            if (block.next !== null) assert.ok(this.blocks[block.next], `${id} has missing next ${block.next}`);
        }
    }
}

const variable = name => R((builder, parent) => builder.variableReporter(name, parent));
const extensionReporter = (opcode, args = {}) => R((builder, parent) => builder.extensionBlock(opcode, args, parent));
const arithmetic = (opcode, left, right) => R((builder, parent) =>
    builder.standardReporter(opcode, {NUM1: left, NUM2: right}, {}, parent));
const binary = (opcode, left, right, leftType = 'number', rightType = 'number') => R((builder, parent) =>
    builder.standardReporter(opcode, {OPERAND1: left, OPERAND2: right}, {}, parent, {OPERAND1: leftType, OPERAND2: rightType}));
const add = (left, right) => arithmetic('operator_add', left, right);
const subtract = (left, right) => arithmetic('operator_subtract', left, right);
const multiply = (left, right) => arithmetic('operator_multiply', left, right);
const equals = (left, right) => binary('operator_equals', left, right, 'string', 'string');
const lessThan = (left, right) => binary('operator_lt', left, right);
const greaterThan = (left, right) => binary('operator_gt', left, right);
const and = (left, right) => binary('operator_and', left, right);
const or = (left, right) => binary('operator_or', left, right);
const math = (operator, value) => R((builder, parent) =>
    builder.standardReporter('operator_mathop', {NUM: value}, {OPERATOR: [operator, null]}, parent));
const timer = R((builder, parent) => builder.add('sensing_timer', parent));
const mouseDown = R((builder, parent) => builder.add('sensing_mousedown', parent));
const keyPressed = key => R((builder, parent) => {
    const id = builder.add('sensing_keypressed', parent);
    const menu = builder.add('sensing_keyoptions', id, {shadow: true});
    builder.blocks[menu].fields.KEY_OPTION = [key, null];
    builder.blocks[id].inputs.KEY_OPTION = [1, menu];
    return id;
});

const pos = (name, x, y, z) => ext('setPosition', {NAME: name, X: x, Y: y, Z: z});
const rot = (name, x, y, z) => ext('setRotation', {NAME: name, X: x, Y: y, Z: z});
const scale = (name, x, y, z) => ext('setScale', {NAME: name, X: x, Y: y, Z: z});
const material = (name, color, type = 'pbr') => [
    ext('createMaterial', {MATERIAL: name, TYPE: type}),
    ext('setMaterialBaseColor', {MATERIAL: name, COLOR: color})
];
const cube = (name, p, s, materialName) => [
    ext('createCube', {NAME: name}), pos(name, ...p), scale(name, ...s),
    ext('setResourceMaterial', {RESOURCE: name, MATERIAL: materialName})
];
const model = (name, asset, p, s, rotation = [0, 0, 0]) => [
    ext('createModelInstance', {NAME: name, MODEL: asset}), pos(name, ...p), scale(name, ...s), rot(name, ...rotation)
];

const pointAhead = (distance, axis) => extensionReporter('pointAheadOfCamera', {DISTANCE: distance, CAMERA: 'main', AXIS: axis});
const cameraBasis = (basis, axis) => extensionReporter('cameraBasisComponent', {CAMERA: 'main', BASIS: basis, AXIS: axis});
const resourceValue = (resource, property, axis) => extensionReporter('resourceTransform', {RESOURCE: resource, PROPERTY: property, AXIS: axis});
const rayText = field => extensionReporter('rayHitText', {FIELD: field});
const rayNumber = field => extensionReporter('rayHitNumber', {FIELD: field});

const {builder, hudBuilder} = await buildKnifeGame({ProjectBuilder, ext, wait, setVar, changeVar, ifThen, ifElse,
    repeat, forever, broadcast, variable, extensionReporter, add, subtract, multiply, equals, lessThan,
    greaterThan, and, or, math, timer, mouseDown, keyPressed, pos, rot, scale, material, cube, model,
    pointAhead, cameraBasis, resourceValue, rayText, rayNumber, arithmetic}, root);

builder.validate();
hudBuilder.validate();

const backdrop = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#15121a"/><stop offset="1" stop-color="#251822"/></linearGradient></defs><rect width="480" height="360" fill="url(#g)"/></svg>');
const hud = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><style>text{font-family:Arial,sans-serif;fill:#f5f7f6;font-size:8px;letter-spacing:.55px}</style><rect x="12" y="12" width="190" height="35" rx="3" fill="#123948" fill-opacity=".8"/><text x="22" y="27" style="font-size:12px;font-weight:700;letter-spacing:1.3px">ECLIPSE / SKY COURT</text><text x="22" y="39" style="font-size:7px;fill:#c5dfdf">KNIFE MOVEMENT TRAINING</text><rect x="12" y="322" width="456" height="26" rx="3" fill="#123948" fill-opacity=".78"/><text x="20" y="333">WASD MOVE   ARROWS LOOK   SHIFT SPRINT   C CROUCH / SLIDE</text><text x="20" y="343">SPACE JUMP   F / CLICK ATTACK   I RIG   R RESET   1-4 VIEWS   0 PLAY</text><path d="M236 180h8 M240 176v8" stroke="#234b56" stroke-width="2.5"/><path d="M236 180h8 M240 176v8" stroke="#fff" stroke-width="1"/></svg>');
const backdropId = md5(backdrop);
const note = (title, detail) => Buffer.from(hud.toString().replace('</svg>',
    `<rect x="214" y="12" width="254" height="35" rx="3" fill="#123948" fill-opacity=".88"/><text x="224" y="26" style="font-size:8px;font-weight:700">${title}</text><text x="224" y="39" style="font-size:7px">${detail}</text></svg>`));
const hudCostumes = [
    ['Knife HUD', hud],
    ['Optional viewmodel', note('OPTIONAL VIEWMODEL NOT LOADED', 'Press I for KnifeFPS.glb, or keep playing without arms.')],
    ['Loading viewmodel', note('OPTIONAL VIEWMODEL', 'Select KnifeFPS.glb, or cancel to keep playing.')]
];

const soundFiles = [
    ['Knife Whoosh', 'assets/audio/knife-whoosh.wav', 22050],
    ['Wood Impact', 'assets/audio/wood-impact.wav', 22050],
    ['Dojo Ambience', 'assets/audio/dojo-ambient.wav', 22050]
];
const sounds = [];
const soundBytes = new Map();
for (const [name, filename, rate] of soundFiles) {
    const bytes = await readFile(path.join(root, filename));
    const assetId = md5(bytes);
    const sampleCount = (bytes.length - 44) / 2;
    sounds.push({name, assetId, dataFormat: 'wav', format: '', rate, sampleCount, md5ext: `${assetId}.wav`});
    soundBytes.set(`${assetId}.wav`, bytes);
}

builder.comments.assetCredits = {blockId:null,x:40,y:2400,width:420,height:230,minimized:true,text:'Scenery credits: CC0 - Crate by plaggy, https://sketchfab.com/3d-models/cc0-crate-780b9a0a21c047bc97c404b0e1925763 (CC BY 4.0; textures resized and packed as GLB). Shield and war hammer: Amos, PSX weapon pack (CC0). Wood Floor: Dimitrios Savva / Poly Haven (CC0; resized). Arena textures, geometry and synthesized audio: Eclipse 3D contributors (MIT). KnifeFPS.glb is not included: select your purchased Low Poly FPS Starter Kit v1.1 asset by RGS_Dev at runtime.'};
const project = {
    targets: [
        {isStage: true, name: 'Stage', variables: builder.variables, lists: {}, broadcasts: builder.broadcasts,
            blocks: builder.blocks, comments: builder.comments, currentCostume: 0,
            costumes: [{name: 'Dojo backdrop', bitmapResolution: 1, dataFormat: 'svg', assetId: backdropId,
                md5ext: `${backdropId}.svg`, rotationCenterX: 240, rotationCenterY: 180}],
            sounds, volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null},
        {isStage: false, name: 'HUD', variables: {}, lists: {}, broadcasts: {}, blocks: hudBuilder.blocks, comments: hudBuilder.comments, currentCostume: 1,
            costumes: hudCostumes.map(([name, bytes]) => ({name, bitmapResolution: 1, dataFormat: 'svg', assetId: md5(bytes),
                md5ext: `${md5(bytes)}.svg`, rotationCenterX: 240, rotationCenterY: 180})),
            sounds: [], volume: 100, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90,
            draggable: false, rotationStyle: "don't rotate"}
    ],
    monitors: [], extensions: ['turbo3d'],
    extensionURLs: {turbo3d: `data:application/javascript;base64,${(await readFile(path.resolve(root, '../../dist/turbo3d.js'))).toString('base64')}`},
    meta: {semver: '3.0.0', vm: '3.13.0', agent: 'First-Person Knife Demo / Eclipse 3D API v19'}
};

const zip = new JSZip();
zip.file('project.json', JSON.stringify(project), {date});
zip.file(`${backdropId}.svg`, backdrop, {date});
for (const [, bytes] of hudCostumes) zip.file(`${md5(bytes)}.svg`, bytes, {date});
for (const [name, bytes] of soundBytes) zip.file(name, bytes, {date});
const archive = await zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: {level: 9}});
await mkdir(root, {recursive: true});
if (process.argv.includes('--check')) assert.deepEqual(await readFile(projectPath), archive, 'Knife project is stale; run npm run knife');
else await writeFile(projectPath, archive);
const allBlocks = [...Object.values(builder.blocks), ...Object.values(hudBuilder.blocks)];
console.log(`Built ${projectPath} (${archive.length} bytes, ${allBlocks.length} blocks)`);

