import {isExecutableBlock} from '../src/extension/blocks/blockNavigation.js';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Turbo3DExtension} from '../src/extension/Turbo3DExtension.js';
import {BLOCK_CONSOLIDATIONS, blockSurfaceDiagnostics, canonicalFamilyOpcodes} from '../src/extension/blocks/blockSurface.js';
import {BLOCK_API_VERSION} from '../src/constants.js';

export const scratchBlockTypes = {
    BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', LABEL: 'label', BUTTON: 'button'},
    ArgumentType: {STRING: 'string', NUMBER: 'number', ANGLE: 'angle', COLOR: 'color'}
};

export const renderBlockInventory = () => {
    const {blocks, menus} = new Turbo3DExtension(scratchBlockTypes, {}).getInfo();
    const summary = blockSurfaceDiagnostics(blocks);
    const aliases = new Map(BLOCK_CONSOLIDATIONS.flatMap(family => family.oldOpcodes.map(opcode => [opcode, family])));
    const combined = canonicalFamilyOpcodes();
    const lines = [
        '<!-- block-inventory:start -->',
        '## Complete registered block inventory', '',
        `Generated from production registration with \`node scripts/block-inventory.mjs --write\`; API version ${BLOCK_API_VERSION} preserves existing serialized blocks and menus.`, '',
        `Original discovery: ${summary.discovered}. Current registration: ${summary.registered}. Visible palette: ${summary.palette} (${summary.canonicalIndependent} independent entries plus ${summary.canonicalCombined} canonical family blocks). Retained hidden legacy aliases: ${summary.legacyAliases}; other hidden/internal: ${summary.hidden}; removed: 0; unresolved: ${summary.unresolved}.`, '',
        'Every registered block is an independent command/reporter, a canonical property family, or a retained compatibility alias. The three palette buttons are UI controls without serialized opcodes and are excluded from these totals.', '',
        'Canonical family blocks are marked “family” below. Legacy opcodes keep their original argument names, types, menus and defaults; they execute in loaded projects but are omitted from the palette. The numeric/text ray reporters have separate menus and stable return types. Existing mixed `rayHitValue` behavior remains only for compatibility.', '',
        '### Consolidation families', '',
        '| Family | Preferred opcode(s) | Legacy opcode(s) | Reason |',
        '| --- | --- | --- | --- |'
    ];
    for (const family of BLOCK_CONSOLIDATIONS) lines.push(`| ${family.family} | ${family.canonicalOpcodes.map(op => '`' + op + '`').join(', ')} | ${family.oldOpcodes.map(op => '`' + op + '`').join(', ')} | ${family.reason} |`);
    lines.push('', '### Every registered block', '', '| Opcode | Type / disposition | Text |', '| --- | --- | --- |');
    for (const block of blocks) {
        if (!isExecutableBlock(block)) continue;
        const disposition = aliases.has(block.opcode) ? 'LEGACY-COMPATIBILITY-ALIAS' : combined.has(block.opcode) ? 'CANONICAL-FAMILY' : 'CANONICAL-INDEPENDENT';
        lines.push(`| \`${block.opcode}\` | ${block.blockType} / ${disposition} | ${String(block.text).replaceAll('|', '\\|')} |`);
    }
    lines.push('', '### Registered menus', '', '| Menu | Values | Reporter inputs |', '| --- | --- | --- |');
    for (const [name, menu] of Object.entries(menus)) {
        const items = Array.isArray(menu.items) ? menu.items.map(item => typeof item === 'string' ? item : item.value).join(', ') : `dynamic: ${menu.items}`;
        lines.push(`| \`${name}\` | ${items.replaceAll('|', '\\|')} | ${Boolean(menu.acceptReporters)} |`);
    }
    lines.push('', '<!-- block-inventory:end -->');
    return lines.join('\n');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const current = await readFile('BLOCKS.md', 'utf8');
    const inventory = renderBlockInventory();
    const next = current.includes('<!-- block-inventory:start -->') ?
        current.replace(/<!-- block-inventory:start -->[\s\S]*<!-- block-inventory:end -->/, inventory) :
        current.trimEnd() + '\n\n' + inventory + '\n';
    if (process.argv.includes('--write')) await writeFile('BLOCKS.md', next);
    else if (current !== next) throw new Error('BLOCKS.md inventory is stale; run node scripts/block-inventory.mjs --write');
    console.log(JSON.stringify(blockSurfaceDiagnostics(new Turbo3DExtension(scratchBlockTypes, {}).getInfo().blocks), null, 2));
}
