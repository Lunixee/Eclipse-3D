import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import JSZip from '@turbowarp/jszip';
import {EXAMPLES, RAY_WORKFLOW, command} from './examples/projects.mjs';
import {makeTone} from './examples/assets.mjs';
import {byOpcode, defaults, info, menuItems} from './docs/metadata.mjs';
import {blockAST, greenFlagAST, waitAST, foreverAST, renderSVG} from './docs/render-blocks.mjs';
import {htmlPage} from './generate-docs.mjs';

const md5 = data => createHash('md5').update(data).digest('hex');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const backdrop = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#152239"/></svg>');
const tone = makeTone();
const date = new Date('2000-01-01T00:00:00.000Z');
export const workflowAST = steps => steps.map(step => step.forever ? foreverAST(workflowAST(step.forever)) :
    'wait' in step ? waitAST(step.wait) : blockAST(step.opcode, step.args));

export function projectFor(example, extensionSource) {
    const blocks = {}, variables = {}, comments = {}; let serial = 0;
    const id = () => `e${++serial}`;
    const variableIds = new Map();
    for (const [name, value] of Object.entries(example.variables)) { const key = `data_${variableIds.size}`;variableIds.set(name,key);variables[key] = [name,value]; }
    const add = (opcode, parent, shadow = false) => {
        const key = id(); blocks[key] = {opcode,next:null,parent,inputs:{},fields:{},shadow,topLevel:false}; return key;
    };
    const input = (owner, name, arg, value) => {
        let fallback;
        if (arg.menu) {
            const key = add(`turbo3d_menu_${arg.menu}`, owner, true);
            const choice = typeof value === 'object' ? defaults(byOpcode.get(blocks[owner].opcode.slice(8)))[name] : value;
            assert.ok(menuItems(arg.menu).some(item => String(item.value) === String(choice)), `Invalid menu choice ${arg.menu}: ${choice}`);
            blocks[key].fields[arg.menu] = [String(choice),null]; fallback = key;
        } else fallback = [arg.type === 'number' || arg.type === 'angle' ? 4 : arg.type === 'color' ? 9 : 10, typeof value === 'object' ? '' : String(value)];
        if (value && typeof value === 'object' && value.variable) {
            assert.ok(variableIds.has(value.variable), `Missing data variable ${value.variable}`);
            const reporter = add('data_variable',owner); blocks[reporter].fields.VARIABLE = [value.variable,variableIds.get(value.variable)];
            blocks[owner].inputs[name] = [3,reporter,fallback];
        } else blocks[owner].inputs[name] = [1,fallback];
    };
    const sequence = (steps,parent) => {
        let first = null, previous = null;
        for (const step of steps) {
            const opcode = step.forever ? 'control_forever' : 'wait' in step ? 'control_wait' : `turbo3d_${step.opcode}`;
            const key = add(opcode, previous ?? parent); first ??= key;
            if (previous) blocks[previous].next = key;
            if (step.forever) blocks[key].inputs.SUBSTACK = [2,sequence(step.forever,key)];
            else if ('wait' in step) blocks[key].inputs.DURATION = [1,[5,String(step.wait)]];
            else {
                const definition = byOpcode.get(step.opcode); assert.equal(definition?.blockType,'command',step.opcode);
                for (const name of Object.keys(step.args)) assert.ok(name in (definition.arguments??{}),`${step.opcode}.${name}`);
                const values = {...defaults(definition),...step.args};
                for (const [name,arg] of Object.entries(definition.arguments??{})) input(key,name,arg,values[name]);
            }
            previous = key;
        }
        return first;
    };
    const flag = add('event_whenflagclicked',null); Object.assign(blocks[flag],{topLevel:true,x:48,y:64});
    blocks[flag].next = sequence(example.steps,flag);
    comments.intro = {blockId:flag,x:580,y:64,width:320,height:160,minimized:false,text:`${example.title}\n\n${example.purpose}\n\n${example.learn}`};
    blocks[flag].comment = 'intro';
    if (example.sound) {
        const click = add('event_whenstageclicked',null); Object.assign(blocks[click],{topLevel:true,x:700,y:280});
        blocks[click].next = sequence([command('unlockAudio'),command('controlAudioSource',{NAME:'pulse',ACTION:'resume'})],click);
    }
    return {targets:[{isStage:true,name:'Stage',variables,lists:{},broadcasts:{},blocks,comments,currentCostume:0,
        costumes:[{name:'Eclipse backdrop',bitmapResolution:1,dataFormat:'svg',assetId:md5(backdrop),md5ext:`${md5(backdrop)}.svg`,rotationCenterX:240,rotationCenterY:180}],
        sounds:example.sound?[{name:'Soft pulse',assetId:md5(tone),dataFormat:'wav',format:'',rate:16000,sampleCount:16000,md5ext:`${md5(tone)}.wav`}]:[],
        volume:100,layerOrder:0,tempo:60,videoTransparency:50,videoState:'on',textToSpeechLanguage:null}],
        monitors:[],extensions:['turbo3d'],extensionURLs:{turbo3d:`data:application/javascript;base64,${Buffer.from(extensionSource).toString('base64')}`},
        meta:{semver:'3.0.0',vm:'3.13.0',agent:'Eclipse 3D release example / API v19'}};
}

export async function archiveFor(example, source) {
    const project = projectFor(example,source), zip = new JSZip();
    zip.file('project.json',JSON.stringify(project),{date}); zip.file(`${md5(backdrop)}.svg`,backdrop,{date});
    if (example.sound) zip.file(`${md5(tone)}.wav`,tone,{date});
    return {project,bytes:await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}})};
}

export async function buildExamples({check=false,packageHtml=false}={}) {
    const source = await readFile('dist/eclipse3d.js'), rows = [], outputs = new Map();
    for (const example of EXAMPLES) {
        const {bytes,project} = await archiveFor(example,source);
        outputs.set(`examples/${example.id}/${example.id}.sb3`,bytes);
        const stack = renderSVG([[greenFlagAST(),...workflowAST(example.steps)]],`${example.title}: complete Green Flag setup and update script`);
        outputs.set(`docs/assets/workflows/${example.id}.svg`,stack);
        const screenshotPresent = await access(`examples/${example.id}/screenshot.png`).then(()=>true,()=>false);
        const readme = [`# ${example.title}`, '', example.purpose, '',
            screenshotPresent ? `![${example.expected}](screenshot.png)` : '', '',
            `## Run`, '', `1. Open [${example.id}.sb3](${example.id}.sb3) in TurboWarp Desktop or the TurboWarp web editor.`,
            '2. Approve the embedded custom extension when prompted. It is the self-contained Eclipse 3D build; the compatibility ID is `turbo3d`.',
            '3. Click Green Flag. Stop All preserves the image and freezes simulation. Click Green Flag again to reset the example.', '',
            'The project embeds its extension and assets. No development server or benchmark harness is required. A host may require explicit approval for unsandboxed data-URL extensions. See [loading instructions](../../docs/getting-started.md).', '',
            '## Observe and change', '', example.expected, '', example.learn, '',
            `## Script`, '', `![Complete ${example.title} script](../../docs/assets/workflows/${example.id}.svg)`, '',
            'The script visual and SB3 are generated from the same maintained example definition. Orange data reporters refer to embedded project variables; they are not placeholders for network downloads.', '',
            '[All examples](../index.md) · [Block reference](../../docs/reference/index.md) · [Source definitions](../../scripts/examples/projects.mjs)', ''
        ].join('\n');
        outputs.set(`examples/${example.id}/README.md`,readme);
        outputs.set(`examples/${example.id}/README.html`,htmlPage(readme,`examples/${example.id}/README.md`));
        rows.push({id:example.id,title:example.title,project:`examples/${example.id}/${example.id}.sb3`,screenshot:`examples/${example.id}/screenshot.png`,screenshotStatus:screenshotPresent?'included':'not included',
            bytes:bytes.length,sha256:sha256(bytes),extensionSha256:sha256(source),blocks:Object.keys(project.targets[0].blocks).length,snapshotSeconds:example.snapshotSeconds});
        if (packageHtml) {
            const require = createRequire(import.meta.url), Packager = require('@turbowarp/packager');
            const loaded = await Packager.loadProject(bytes), packager = new Packager.Packager();
            packager.project=loaded;packager.options.target='html';packager.options.autoplay=false;
            packager.options.extensions=loaded.analysis.extensions;packager.options.bakeExtensions=true;packager.options.app.windowTitle=`Eclipse 3D · ${example.title}`;
            const packaged=await packager.package();assert.equal(packaged.type,'text/html');
            await mkdir('artifacts/examples',{recursive:true});await writeFile(`artifacts/examples/${example.id}.html`,packaged.data);
            await writeFile(`artifacts/examples/${example.id}.project.json`,JSON.stringify(project,null,2));
        }
    }
    execFileSync(process.execPath, ['examples/first-person-knife/source/build-project.mjs', ...(check ? ['--check'] : [])], {stdio:'inherit'});
    const knifeBytes = await readFile('examples/first-person-knife/first-person-knife.sb3');
    rows.push({id:'first-person-knife', title:'First-Person Knife Demo', project:'examples/first-person-knife/first-person-knife.sb3', bytes:knifeBytes.length, sha256:sha256(knifeBytes), extensionSha256:sha256(source), optionalExternalAsset:'KnifeFPS.glb (separately purchased; demo is playable without it)', screenshotStatus:'not included'});
    for (const name of ['README','ASSET_CREDITS']) outputs.set('examples/first-person-knife/'+name+'.html', htmlPage(await readFile('examples/first-person-knife/'+name+'.md','utf8'), 'examples/first-person-knife/'+name+'.md'));
    if (packageHtml) {
        const require = createRequire(import.meta.url), Packager = require('@turbowarp/packager');
        const loaded = await Packager.loadProject(knifeBytes), packager = new Packager.Packager();
        packager.project=loaded; packager.options.target='html'; packager.options.autoplay=false;
        packager.options.extensions=loaded.analysis.extensions; packager.options.bakeExtensions=true;
        packager.options.app.windowTitle='First-Person Knife Demo';
        const packaged=await packager.package(); await mkdir('artifacts/examples',{recursive:true});
        await writeFile('artifacts/examples/first-person-knife.html',packaged.data);
    }
    outputs.set('docs/assets/workflows/raycasting.svg',renderSVG(RAY_WORKFLOW.map(step=>[blockAST(step.opcode,step.args)]),'Cast one camera ray, then inspect its Boolean, object and distance reporters'));
    const index = ['# Eclipse 3D examples','','Seven small teaching projects and a complete first-person knife demo. Each embeds Eclipse 3D. The knife demo is playable without a rig; owners can optionally load their separately purchased rig at runtime.','',
        '| Example | What it demonstrates |','| --- | --- |','| [First-Person Knife Demo](first-person-knife/README.md) | Movement, animation, combat and local model importing; purchased rig optional. |',...EXAMPLES.map(ex=>`| [${ex.title}](${ex.id}/README.md) | ${ex.purpose} |`),'',
        '## Rebuild','','Run `npm run build`, then `npm run examples`. Use `npm run examples:package` for standalone HTML exports under `artifacts/examples/`. Screenshots are real runtime captures and are refreshed only after visual changes.','',
        'Generated SB3 files embed the exact development bundle. Regenerate them after any production edit. The project definitions and original model/audio assets are maintained under `scripts/examples/`; no benchmark fixture scripts are imported.',''].join('\n');
    outputs.set('examples/index.md',index);outputs.set('examples/index.html',htmlPage(index,'examples/index.md'));
    outputs.set('examples/manifest.json',JSON.stringify({apiVersion:19,compatibilityId:info.id,publicName:info.name,examples:rows},null,2)+'\n');
    for (const [filename,contents] of outputs) {
        if(check)assert.deepEqual(await readFile(filename),Buffer.from(contents),`${filename}: stale; run npm run examples`);
        else {
            const previous=await readFile(filename).catch(error=>{if(error.code!=='ENOENT')throw error;});
            if(!previous?.equals(Buffer.from(contents))){await mkdir(path.dirname(filename),{recursive:true});await writeFile(filename,contents);}
        }
    }
    console.log(`Examples ${check?'verified':'generated'}: ${rows.length} focused SB3 projects and workflow SVGs${packageHtml?', with standalone HTML exports':''}.`);
    return outputs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildExamples({check:process.argv.includes('--check'),packageHtml:process.argv.includes('--package')});
