import {mkdir} from 'node:fs/promises';
import process from 'node:process';
import {build} from 'esbuild';

const minify = process.argv.includes('--minify');
await mkdir('dist', {recursive: true});

await build({
    entryPoints: ['src/entry.js'],
    outfile: minify ? 'dist/eclipse3d.min.js' : 'dist/eclipse3d.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100', 'firefox100', 'safari15'],
    minify,
    sourcemap: minify ? false : 'linked',
    legalComments: 'none',
    banner: {js: '/* Eclipse 3D 0.1.0-alpha.1 | compatibility ID: turbo3d | MIT */'},
    logLevel: 'info'
});
