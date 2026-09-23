import {Turbo3DExtension} from '../../src/extension/Turbo3DExtension.js';
import {scratchBlockTypes} from '../block-inventory.mjs';
import {isExecutableBlock, BLOCK_SECTIONS} from '../../src/extension/blocks/blockNavigation.js';
import {API_FAMILIES} from '../../src/extension/blocks/apiExpansionBlocks.js';

export const info = new Turbo3DExtension(scratchBlockTypes, {}).getInfo();
export const blocks = info.blocks.filter(block => isExecutableBlock(block) && !block.hideFromPalette);
export const byOpcode = new Map(blocks.map(block => [block.opcode, block]));
export const sections = BLOCK_SECTIONS;
export const slug = text => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const menuItems = name => {
    const menu = info.menus[name];
    if (!menu) throw new Error(`Unknown menu ${name}`);
    const items = Array.isArray(menu) ? menu : menu.items;
    if (!Array.isArray(items)) throw new Error(`Dynamic menu needs a documentation adapter: ${name}`);
    return items.map(item => typeof item === 'object' ? item : {text: String(item), value: item});
};
export const defaults = block => Object.fromEntries(Object.entries(block.arguments ?? {}).map(([name, arg]) =>
    [name, arg.defaultValue ?? (arg.menu ? menuItems(arg.menu)[0].value : '')]));
export const familyTypes = new Map(API_FAMILIES.map(family => [family.opcode, family.type]));
