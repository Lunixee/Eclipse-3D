import {readFile, writeFile} from 'node:fs/promises';
import {openSync} from 'fontkit';

const font = openSync('node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff');
const text = (value,x,y,size,fill) => {
    const run=font.layout(value),scale=size/font.unitsPerEm;let cursor=x;
    const paths=run.glyphs.map((glyph,index)=>{const p=run.positions[index];const shape=`<path d="${glyph.path.toSVG()}" transform="translate(${(cursor+p.xOffset*scale).toFixed(3)} ${(y-p.yOffset*scale).toFixed(3)}) scale(${scale} ${-scale})"/>`;cursor+=p.xAdvance*scale;return shape;});
    return `<g aria-label="${value}" fill="${fill}">${paths.join('')}</g>`;
};
const icon=(await readFile('assets/branding/eclipse-block.svg','utf8')).replace(/<svg[^>]*>|<\/svg>/g,'');
const art=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" role="img" aria-label="Eclipse 3D. 3D scenes in TurboWarp. Scenes, models, animation, physics and audio. API v19, compatible with existing Turbo3D projects."><title>Eclipse 3D: 3D scenes in TurboWarp</title><rect width="1200" height="400" rx="16" fill="#152239"/><g transform="translate(120 -12) scale(.86)"><path d="M900 70 1100 185 900 300 700 185Z M700 185v140l200 115V300 M1100 185v140L900 440" fill="none" stroke="#485B8C" stroke-width="1.5"/><g opacity=".5" fill="none" stroke="#485B8C"><path d="M820 116 1020 230v140M740 162 940 276v140M780 231l200-115M860 277l200-115"/></g></g><g transform="translate(62 48) scale(1.4)">${icon}</g>${text('Eclipse 3D',174,111,62,'#ffffff')}${text('3D scenes in TurboWarp.',68,190,30,'#A8DADC')}<path d="M68 232H636" stroke="#485B8C" stroke-width=".8"/>${text('SCENES / MODELS / ANIMATION / PHYSICS / AUDIO',68,277,17,'#D6E0F2')}${text('API v19  /  compatible with existing Turbo3D projects',68,324,17,'#A8DADC')}${text('WebGL 2',68,356,15,'#D6E0F2')}</svg>\n`;
await writeFile('assets/branding/eclipse-hero.svg',art);
console.log('Release hero generated from maintained vector geometry and pinned font outlines.');
