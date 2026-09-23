// Documentation tooling only. No imports from this file enter the extension bundle.
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {openSync} from 'fontkit';
import scratchblocks from '../../node_modules/@turbowarp/scratchblocks/index.js';
import {extensions} from '../../node_modules/@turbowarp/scratchblocks/syntax/index.js';
import {IconView, LabelView} from '../../node_modules/@turbowarp/scratchblocks/scratch3/blocks.js';
import {info, byOpcode, defaults, menuItems} from './metadata.mjs';

const font = openSync('node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff');
const fontScale = 16 / font.unitsPerEm;
const {window} = new JSDOM();
window.HTMLCanvasElement.prototype.getContext = () => ({measureText: value => ({width: font.layout(value).advanceWidth * fontScale})});
const sb = scratchblocks(window);
// An explicitly registered extension category gets scratchblocks' normal icon separator.
extensions.eclipse = true;
const originalIcons = IconView.icons;
Object.defineProperty(IconView, 'icons', {get: () => ({...originalIcons, eclipseBlock: {width: 40, height: 40}})});
LabelView.measure = value => ({width: Math.ceil(font.layout(value).advanceWidth * fontScale)});
const NS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const element = (name, attributes = {}) => {
    const node = window.document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
};

export function blockAST(opcode, values = {}) {
    const block = byOpcode.get(opcode);
    if (!block) throw new Error(`Not a visible block: ${opcode}`);
    const args = {...defaults(block), ...values};
    for (const key of Object.keys(values)) if (!Object.hasOwn(block.arguments ?? {}, key)) throw new Error(`${opcode}: unknown argument ${key}`);
    const children = [];
    for (const token of block.text.split(/(\[[A-Z][A-Z0-9_]*\])/g).filter(Boolean)) {
        if (!/^\[[A-Z][A-Z0-9_]*\]$/.test(token)) {
            for (const word of token.trim().split(/\s+/).filter(Boolean)) children.push(new sb.Label(word));
            continue;
        }
        const key = token.slice(1, -1), arg = block.arguments[key], value = args[key];
        if (value && typeof value === 'object' && value.variable) {
            children.push(new sb.Block({shape: 'reporter', category: 'variables'}, [new sb.Label(value.variable)])); continue;
        }
        if (value && typeof value === 'object' && value.opcode) { children.push(blockAST(value.opcode, value.args)); continue; }
        let shape = arg.type === 'number' || arg.type === 'angle' ? 'number' : arg.type === 'color' ? 'color' : 'string';
        let text = String(value).replace(/\r?\n/g, ' \\n ');
        if (arg.menu) {
            shape = info.menus[arg.menu].acceptReporters ? 'number-dropdown' : 'dropdown';
            text = String(menuItems(arg.menu).find(item => String(item.value) === text)?.text ?? text);
        }
        children.push(new sb.Input(shape, text));
    }
    return new sb.Block({shape: block.blockType === 'command' ? 'stack' : block.blockType === 'Boolean' ? 'boolean' : 'reporter', category: 'eclipse', color: info.color1}, children);
}

export const greenFlagAST = () => sb.parse('when green flag clicked').scripts[0].blocks[0];
export const waitAST = seconds => sb.parse(`wait (${seconds}) seconds`).scripts[0].blocks[0];
export const repeatAST = (count, children) => new sb.Block({shape: 'c-block', category: 'control'}, [new sb.Label('repeat'), new sb.Input('number', String(count)), new sb.Script(children)]);
export const foreverAST = children => new sb.Block({shape: 'c-block', category: 'control'}, [new sb.Label('forever'), new sb.Script(children)]);

// Keep signatures readable as text, even though glyph outlines make images font-independent.
export const syntaxFor = block => block.stringify(`#485B8C ${block.isReporter ? 'reporter' : block.isBoolean ? 'boolean' : 'stack'}`);
export function renderSVG(stacks, title) {
    const doc = new sb.Document(stacks.map(stack => new sb.Script(stack)));
    const view = sb.newView(doc, {style: 'scratch3', scale: 1});
    const svg = view.render();
    const defs = svg.querySelector('defs');
    const iconSource = new window.DOMParser().parseFromString(readFileSync('assets/branding/eclipse-block.svg', 'utf8'), 'image/svg+xml').documentElement;
    const icon = element('g', {id: 'sb3-eclipseBlock', transform: 'scale(.625)'});
    for (const node of [...iconSource.children]) icon.appendChild(node.cloneNode(true));
    defs.appendChild(icon);
    const style = element('style');
    style.textContent = `.sb3-extension{fill:${info.color1};stroke:${info.color3}}.sb3-extension-alt{fill:${info.color2}}.sb3-extension-dark{fill:${info.color3}}.sb3-input-number,.sb3-input-string{fill:#fff;stroke:${info.color3}}.sb3-input-color{stroke:#fff}.sb3-control{fill:#FFAB19;stroke:#CF8B17}.sb3-events{fill:#FFBF00;stroke:#CC9900}.sb3-operators{fill:#59C059;stroke:#389438}.sb3-variables{fill:#FF8C1A;stroke:#DB6E00}`;
    defs.appendChild(style);
    for (const node of svg.querySelectorAll('[stroke="rgba(0, 0, 0, 0.2)"]')) node.setAttribute('stroke', info.color3);
    for (const node of svg.querySelectorAll('.sb3-input-number-dropdown')) {
        node.setAttribute('fill', info.color2); node.setAttribute('stroke', info.color3);
    }
    // Font outlines preserve actual Unicode text in aria-label, with no external font load.
    for (const text of svg.querySelectorAll('text')) {
        const value = text.textContent;
        const g = element('g', {'aria-label': value, fill: /literal-(number|string)(\s|$)/.test(text.getAttribute('class')) ? '#575E75' : '#FFFFFF'});
        for (const attr of ['transform', 'x', 'y']) if (text.hasAttribute(attr)) g.setAttribute(attr, text.getAttribute(attr));
        const run = font.layout(value);
        let x = Number(text.getAttribute('x') ?? 0), y = Number(text.getAttribute('y') ?? 0);
        for (let i = 0; i < run.glyphs.length; i++) {
            const glyph = run.glyphs[i], position = run.positions[i], id = `glyph-${glyph.id}`;
            if (!defs.querySelector(`#${id}`)) defs.appendChild(element('path', {id, d: glyph.path.toSVG()}));
            const use = element('use', {transform: `translate(${(x + position.xOffset * fontScale).toFixed(3)} ${(y - position.yOffset * fontScale).toFixed(3)}) scale(${fontScale} ${-fontScale})`});
            use.setAttribute('href', `#${id}`);
            g.appendChild(use); x += position.xAdvance * fontScale; y -= position.yAdvance * fontScale;
        }
        text.replaceWith(g);
    }
    // scratchblocks defines all built-in icons. Retain only referenced definitions.
    const needed = new Set();
    const visit = node => {
        for (const use of node.querySelectorAll('use')) {
            const id = (use.getAttributeNS(XLINK, 'href') ?? use.getAttribute('href') ?? '').slice(1);
            if (!id || needed.has(id)) continue;
            needed.add(id); const def = defs.querySelector(`[id="${id}"]`); if (def) visit(def);
        }
    };
    for (const child of svg.children) if (child !== defs) visit(child);
    for (const child of [...defs.children]) if (child.id && !needed.has(child.id)) child.remove();
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', title);
    const titleNode = element('title'); titleNode.textContent = title; svg.prepend(titleNode);
    return new window.XMLSerializer().serializeToString(svg) + '\n';
}
