// Assemble a static publishing directory. This does not deploy anything.
import {cp, mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const website = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(website);
const output = path.resolve(root, 'artifacts', 'website');
const publicDocuments = [
    'LICENSE', 'README.md', 'CHANGELOG.md', 'THIRD_PARTY_LICENSES.md',
    'ARCHITECTURE.md', 'BLOCKS.md', 'COMPATIBILITY.md',
    'CUSTOM_RENDERING.md', 'PERFORMANCE.md', 'PHYSICS_AUDIO.md', 'RENDERER_BACKENDS.md'
];
const manifest = JSON.parse(await readFile(path.join(root, 'examples/manifest.json'), 'utf8'));
const exampleDirectories = manifest.examples.map(({id}) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id === 'first-person-katana') {
        throw new Error(`Not a public example directory: ${id}`);
    }
    return `examples/${id}`;
});
const siteFiles = ['index.html', 'styles.css', 'site.js', 'assets'];
const repositoryFiles = [
    ...publicDocuments, 'docs', 'assets/branding', 'scripts/examples',
    'examples/index.html', 'examples/index.md', 'examples/manifest.json',
    ...exampleDirectories, 'dist/turbo3d.js', 'dist/turbo3d.js.map', 'dist/turbo3d.min.js'
];

// Preflight before replacing the fixed, generated output directory.
for (const file of repositoryFiles) await stat(path.join(root, file));
for (const file of siteFiles) await stat(path.join(website, file));
if (output !== path.join(root, 'artifacts', 'website') || !output.startsWith(root + path.sep)) {
    throw new Error('Website output must stay inside this repository’s artifacts directory.');
}
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of siteFiles) await cp(path.join(website, file), path.join(output, file), {recursive: true});
for (const file of repositoryFiles) await cp(path.join(root, file), path.join(output, file), {
    recursive: true,
    filter: source => !['visual-qa.md', 'visual-qa.html', 'validate-project.mjs'].includes(path.basename(source))
});
// The development changelog includes internal QA history. Ship the public notes.
const publicChangelog = path.join(root, 'scripts/public/CHANGELOG.md');
if (await stat(publicChangelog).then(() => true, () => false)) {
    await cp(publicChangelog, path.join(output, 'CHANGELOG.md'));
}

// The source page sits one level below the repository; the published page is
// at the artifact root. Adjust only explicit parent-relative HTML links.
const html = await readFile(path.join(output, 'index.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), html.replaceAll('href="../', 'href="./'));
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`Static website ready: ${output}`);
console.log('Nothing was deployed. Review website/README.md before publishing.');
