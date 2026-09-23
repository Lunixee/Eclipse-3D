# Reproducing the documentation and examples

The visual reference is generated offline from `Turbo3DExtension.getInfo()`, using the static navigation map. Curated prose lives in `scripts/docs/group-guides.mjs`; generated signatures, menus and counts are not manually transcribed. Every visible opcode has one reference entry, one SVG and one manifest record. Hidden compatibility aliases are excluded from public coverage.

## Commands

```sh
npm ci
npm run assets:brand
npm run assets:release
npm run build
npm run docs
npm run examples
npm run docs:check
npm run examples:check
```

`npm run examples:package` additionally exports standalone HTML under `artifacts/examples/`. It uses the installed Packager and may need its normal scaffolding resources on first use; the documentation renderer itself has no network requests. Generated SB3 files contain the exact current extension bundle and their own data assets. Rebuild examples after production edits so the embedded source matches.

## How block visuals work

`@turbowarp/scratchblocks` 3.6.7 supplies Scratch 3 shapes, inputs, dropdown arrows and script layout. A small adapter builds its syntax tree directly from the registered metadata. This avoids interpreting JSON/GLSL defaults as scratchblocks source syntax. The adapter inserts the actual Eclipse icon, palette and menu display labels, keeping serialized menu values in the argument table.

Roboto Latin 500 from pinned `@fontsource/roboto` 5.3.0 is shaped with fontkit 2.0.4 and converted to SVG glyph paths. SVGs therefore render without an installed font, external stylesheet, runtime JavaScript or internet access. Accessible titles/labels and a text syntax representation remain in the manifest. Shared glyph definitions within each SVG reduce repetition. Runtime scene screenshots are separate browser captures.

`docs/reference/manifest.json` records signature, shape, arguments, result type, section/group, asset path, syntax and SHA-256 for each of 560 visuals. Regeneration checks compare exact output bytes. Curated descriptions explain behavior by compact family; tests require every approved group to have prose and every visible opcode to occur exactly once.

Static Markdown embeds SVGs for GitHub readers. Generated HTML adds responsive light/dark presentation and horizontal scrolling for long block signatures. The text syntax in the manifest can be used in TurboWarp-compatible scratchblocks/extended-Markdown contexts, while SVGs remain the authoritative portable rendering. Runtime host theme fonts/metrics can differ slightly from the documented pinned font.

## Source layout and licensing

- `assets/branding/`: maintained SVG icon sources; `scripts/build-brand-assets.mjs` embeds them statically.
- `scripts/docs/`: metadata adapter, renderer and curated family descriptions.
- `docs/*.md`: authored chapters; reference Markdown/HTML and SVGs are generated.
- `scripts/examples/`: original teaching project definitions and small GLB/WAV/SVG asset generators.
- `scripts/build-examples.mjs`: standard Scratch project graphs, reproducible ZIPs, workflow stacks and optional Packager exports.

See [third-party licenses](../THIRD_PARTY_LICENSES.md) for scratchblocks, fontkit, Roboto and the supporting documentation tools. No documentation dependency is imported by production `src/entry.js`.

## Knife example

`npm run examples` also rebuilds First-Person Knife from `examples/first-person-knife/source/`. Its generator never reads the purchased rig. The project can optionally select it at runtime. `npm run knife:check` checks that the SB3 matches the maintained generator and current extension bundle.
