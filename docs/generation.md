# Maintaining the documentation

The visual reference is generated offline from `Turbo3DExtension.getInfo()`, using the static navigation map. Curated prose lives in `scripts/docs/group-guides.mjs`; generated signatures, menus and counts are not manually transcribed. Every visible opcode has one reference entry, one SVG and one manifest record. Hidden compatibility aliases are excluded from public coverage.

## Commands

```sh
npm ci
npm run docs
npm run docs:check
```

Edit the Markdown chapters or example READMEs, then run `npm run docs` to update their HTML. This command also regenerates the block reference and SVGs from the source metadata. `npm run docs:check` verifies that the generated files match their inputs. Neither command changes the committed SB3 projects. Open those projects in TurboWarp to edit their blocks.

## How block visuals work

`@turbowarp/scratchblocks` 3.6.7 supplies Scratch 3 shapes, inputs, dropdown arrows and script layout. A small adapter builds its syntax tree directly from the registered metadata. This avoids interpreting JSON/GLSL defaults as scratchblocks source syntax. The adapter inserts the actual Eclipse icon, palette and menu display labels, keeping serialized menu values in the argument table.

Roboto Latin 500 from pinned `@fontsource/roboto` 5.3.0 is shaped with fontkit 2.0.4 and converted to SVG glyph paths. SVGs therefore render without an installed font, external stylesheet, runtime JavaScript or internet access. Accessible titles/labels and a text syntax representation remain in the manifest. Shared glyph definitions within each SVG reduce repetition. Runtime scene screenshots are separate browser captures.

`docs/reference/manifest.json` records signature, shape, arguments, result type, section/group, asset path, syntax and SHA-256 for each of 560 visuals. Regeneration checks compare exact output bytes and require every documented group to have prose and every visible opcode to occur exactly once.

Static Markdown embeds SVGs for GitHub readers. Generated HTML adds responsive light/dark presentation and horizontal scrolling for long block signatures. The text syntax in the manifest can be used in TurboWarp-compatible scratchblocks/extended-Markdown contexts, while SVGs remain the authoritative portable rendering. Runtime host theme fonts/metrics can differ slightly from the documented pinned font.

## Source layout and licensing

- `scripts/generate-docs.mjs`: documentation generation and consistency checks.
- `scripts/docs/`: metadata adapter, renderer and curated family descriptions.
- `docs/*.md`: authored chapters; reference Markdown/HTML and block SVGs are generated.
- `examples/`: editable SB3 projects, setup documentation, screenshots and redistributable assets.
- `assets/branding/`: Eclipse SVG artwork.
- `website/build.mjs`: assembles the static site from the existing docs, examples and extension bundles. See the [website guide](../website/README.md).

See [third-party licenses](../THIRD_PARTY_LICENSES.md) for scratchblocks, fontkit, Roboto and the supporting documentation tools. No documentation dependency is imported by production `src/entry.js`.
