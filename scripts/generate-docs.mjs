import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {marked} from 'marked';
import {Turbo3DExtension} from '../src/extension/Turbo3DExtension.js';
import {scratchBlockTypes} from './block-inventory.mjs';
import {info, blocks, byOpcode, sections, slug, menuItems, defaults, familyTypes} from './docs/metadata.mjs';
import {blockAST, renderSVG, syntaxFor} from './docs/render-blocks.mjs';
import {GROUP_GUIDES} from './docs/group-guides.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const code = value => `<code>${escape(typeof value === 'string' ? value : JSON.stringify(value)).replaceAll('\n', '<br>')}</code>`;
const markdownCell = text => String(text).replaceAll('|', '&#124;');
export function htmlPage(markdown, relativePath) {
    const relativeDocs = path.posix.relative(path.posix.dirname(relativePath), 'docs');
    const prefix = relativeDocs ? relativeDocs + '/' : '';
    const title = markdown.match(/^# (.+)$/m)?.[1] ?? 'Eclipse 3D';
    const body = marked(markdown).replace(/(href=")([^"#?]+)\.md(#[^"]*)?"/g, (all, attr, href, anchor = '') => {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), href));
        return /^(docs|examples)\//.test(target) && !target.startsWith('examples/packager/') ? `${attr}${href}.html${anchor}"` : all;
    })
        .replace(/<h([123])>(.*?)<\/h\1>/g, (_all, level, text) => `<h${level} id="${slug(text.replace(/<[^>]*>/g, ''))}">${text}</h${level}>`);
    return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Eclipse 3D</title><link rel="icon" href="${prefix}../assets/branding/eclipse-icon.svg"><link rel="stylesheet" href="${prefix}site.css"></head><body><header><img src="${prefix}../assets/branding/eclipse-icon.svg" alt=""><a href="${prefix}index.html">Eclipse 3D<small>WebGL 2 for TurboWarp. API v19.</small></a></header><main><nav aria-label="Documentation"><a href="${prefix}index.html">Overview</a><a href="${prefix}getting-started.html">Quick start</a><a href="${prefix}reference/index.html">Block reference</a><a href="${prefix}workflows.html">Workflows</a><a href="${prefix}../examples/index.html">Examples</a><a href="${prefix}compatibility.html">Compatibility</a></nav>${body}<footer>Eclipse 3D was formerly Turbo3D. Compatibility ID: <code>turbo3d</code>. Generated reference: API v19. <a href="${prefix}generation.html">Sources and reproduction</a>.</footer></main></body></html>\n`;
}

export async function documentationOutputs() {
    const outputs = new Map(), covered = [], reference = [];
    const probe = new Turbo3DExtension(scratchBlockTypes, {});
    assert.equal(blocks.length, 560);
    for (const section of sections) {
        const filename = `docs/reference/${slug(section.name)}.md`;
        const lines = [`# ${section.name}`, '', '[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)', '',
            ...section.groups.map(group => `- [${group.name}](#${slug(group.name)})`), ''];
        for (const group of section.groups) {
            const guide = GROUP_GUIDES[group.opcodes[0]];
            assert.ok(guide?.length >= 2, `Missing curated guide: ${group.name}`);
            lines.push(`## ${group.name}`, '', ...guide.flatMap(paragraph => [paragraph, '']));
            for (const opcode of group.opcodes) {
                const block = byOpcode.get(opcode);
                assert.ok(block && !covered.includes(opcode), `Invalid or duplicate reference ${opcode}`);
                covered.push(opcode);
                const ast = blockAST(opcode);
                const imagePath = `docs/assets/blocks/${opcode}.svg`;
                const svg = renderSVG([[ast]], `${block.text} — ${opcode}`);
                outputs.set(imagePath, svg);
                const resultType = block.blockType === 'command' ? 'command' : familyTypes.get(opcode) ?? typeof probe[opcode](defaults(block));
                assert.ok(['command', 'number', 'string', 'boolean'].includes(resultType), `${opcode}: unsupported result type`);
                lines.push(`### ${opcode}`, '', `![${escape(block.text)}](../assets/blocks/${opcode}.svg)`, '',
                    resultType === 'command' ? '**Command.** See the group guide above.' : `**Returns ${resultType === 'string' ? 'text' : resultType}.** Selectors and units are listed below; the family guide explains which retained state is read.`, '');
                if (Object.keys(block.arguments ?? {}).length) {
                    lines.push('| Argument | Input / default | Accepted menu choices |', '| --- | --- | --- |');
                    for (const [name, arg] of Object.entries(block.arguments)) {
                        const items = arg.menu ? menuItems(arg.menu).map(item => item.text === String(item.value) ? code(item.value) : `${escape(item.text)} (${code(item.value)})`).join(', ') : '—';
                        lines.push(`| ${code(name)} | ${arg.type}; ${markdownCell(code(defaults(block)[name]))} | ${markdownCell(items)} |`);
                    }
                    lines.push('');
                }
                reference.push({opcode, section: section.name, group: group.name, page: filename, anchor: opcode.toLowerCase(), image: imagePath,
                    signature: block.text, shape: block.blockType, resultType, arguments: block.arguments ?? {}, syntax: syntaxFor(ast),
                    svgSha256: createHash('sha256').update(svg).digest('hex')});
            }
        }
        outputs.set(filename, lines.join('\n'));
    }
    assert.equal(covered.length, 560);
    assert.deepEqual(new Set(covered), new Set(blocks.map(block => block.opcode)));
    assert.equal(Object.keys(GROUP_GUIDES).length, sections.reduce((sum, section) => sum + section.groups.length, 0));
    outputs.set('docs/reference/index.md', [
        '# Visual block reference', '', 'API v19 · **560 visible executable blocks** · 16 sections · 44 documented groups.', '',
        'Each visual is generated from the current production signature, default arguments, menu labels, block shape, icon and Eclipse palette. The explanations are curated by related family; argument tables list every menu choice. Horizontal scrolling preserves readable block size in the HTML edition. Long JSON/GLSL inputs are fully preserved in the tables and machine-readable manifest.', '',
        'Read [conventions and lifecycle](../concepts.md) first. Commands report failures through the last-error reporter. Numeric/text/Boolean property families return typed fallbacks on missing or invalid resources; load-state reporters use `missing` where documented. Existence reporters are quiet. Hidden legacy aliases remain loadable but are excluded from this public reference; see the [compatibility inventory](../../BLOCKS.md).', '',
        '| Section | Visible blocks | Subgroups |', '| --- | ---: | ---: |',
        ...sections.map(section => `| [${section.name}](${slug(section.name)}.md) | ${section.groups.reduce((sum, g) => sum + g.opcodes.length, 0)} | ${section.groups.length} |`), '',
        '## Find an opcode', '', ...reference.map(row => `- [${row.opcode}](${path.basename(row.page)}#${row.anchor}) — ${row.group}`), ''
    ].join('\n'));
    outputs.set('docs/reference/manifest.json', JSON.stringify({apiVersion: 19, publicName: info.name, compatibilityId: info.id, visible: covered.length,
        generator: {scratchblocks: '3.6.7', font: 'Roboto Latin 500 / @fontsource/roboto 5.3.0', fontOutlines: true}, blocks: reference}, null, 2) + '\n');
    // Hand-authored chapters and generated reference share one static HTML presentation.
    for (const entry of await readdir('docs', {withFileTypes: true})) if (entry.isFile() && entry.name.endsWith('.md')) {
        const filename = `docs/${entry.name}`; outputs.set(filename, await readFile(filename, 'utf8'));
    }
    for (const [filename, contents] of [...outputs]) if (filename.endsWith('.md')) outputs.set(filename.replace(/\.md$/, '.html'), htmlPage(contents, filename));
    return outputs;
}

export async function generateDocs(check = false) {
    const outputs = await documentationOutputs();
    for (const [filename, contents] of outputs) {
        if (check) assert.equal(await readFile(filename, 'utf8'), contents, `${filename}: generated content is stale; run npm run docs`);
        else if (await readFile(filename, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; }) !== contents) {
            await mkdir(path.dirname(filename), {recursive: true}); await writeFile(filename, contents);
        }
    }
    return outputs;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const outputs = await generateDocs(process.argv.includes('--check'));
    console.log(`Documentation ${process.argv.includes('--check') ? 'verified' : 'generated'}: 560 visible blocks, 44 curated groups, ${outputs.size} files.`);
}
