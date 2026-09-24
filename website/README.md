# Eclipse 3D website

The landing page is `website/index.html`. It is plain semantic HTML, one CSS file and a small deferred script. There are no runtime dependencies, remote fonts, analytics, canvas effects or framework build steps. FAQ disclosures use native HTML.

## Preview

Open `website/index.html` directly in a browser. Styling, images, documentation and example links use relative paths. Keep this folder inside the repository so those links work. The **Download extension** button uses the configured GitHub Releases URL.

For an HTTP preview, run from the repository root:

```sh
python -m http.server 8040 --bind 127.0.0.1
```

Open <http://localhost:8040/website/>. This is optional; no server is needed to view the page. The existing `npm run dev` also serves `http://localhost:8000/website/index.html`, and rebuilds the extension first.

Users download `eclipse3d.js` from a release's **Assets** list, then choose **Add Extension → Custom Extension → File**, select the downloaded JS file, and enable **Run extension without sandbox**. `eclipse3d.min.js` is an alternative with the same API. If a release only offers `dist.zip`, users extract it first. Eclipse 3D requires unsandboxed execution, so the website uses manual File loading.

## Static publishing build (no deployment)

```sh
node website/build.mjs
```

This replaces **only** `artifacts/website/` with a self-contained static site. It copies the current extension bundles, existing HTML docs, public documents and the examples named in `examples/manifest.json`. Example generators and the historical `first-person-katana` directory are excluded. Run `npm run build` and `npm run build:min` first if bundles are missing or need refreshing; the website build deliberately does not modify them.

The output still includes `dist/eclipse3d.js` and the other bundles alongside the site. Public download controls direct users to GitHub Releases; they do not link to those hosted bundles. Visitors do not need the repository or its folder layout.

The generated `artifacts/website/index.html` is the publishing entry point. It works at a domain root or a GitHub Pages project subpath. A `.nojekyll` file is included. When deployment is explicitly requested later, upload the **contents of this artifact directory** with a Pages workflow. Do not publish `website/` alone: its sibling documentation and downloads are needed. No Pages workflow or deployment configuration is added now.

The public source repository includes everything needed to preview and assemble this site.

## Final public URLs

The repository and release-page URLs are configured at the top of `website/site.js`. Keep the existing values when rebuilding; their formats are:

| Value | Final destination |
| --- | --- |
| `publicLinks.source` | `https://github.com/OWNER/REPOSITORY` |
| `publicLinks.releases` | `https://github.com/OWNER/REPOSITORY/releases` |

If either value is empty, its link falls back to the project information on the page. The download button and other release links share `publicLinks.releases`; no release tag is hardcoded. Keep the development status and release copy in `index.html` consistent with published releases.

With JavaScript disabled, the documentation, examples, FAQ and manual loading instructions remain available. Source/release navigation retains its on-page fallback.

## Assets and content

- `assets/eclipse-icon.svg` is copied unchanged from `assets/branding/eclipse-icon.svg`.
- `assets/knife-arena.jpg` is an unchanged real TurboWarp capture from `examples/first-person-katana/screenshots/knife-01-idle.jpg` (1132 × 685). It shows the earlier integrated KnifeFPS rig in Sky Court; it is not a new capture of the public local-import flow. The public demo uses the same arena and optionally loads a separately obtained model when I is pressed.
- The downloadable project is **`examples/first-person-knife/first-person-knife.sb3`**, the public version. The historical project with an embedded paid rig is never linked or bundled.
- The screenshot shows KnifeFPS from Low Poly FPS Starter Kit by RGS_Dev. The site links to the current demo's asset credits and explicitly explains that the purchased model is excluded. No model file is copied into the website assets.
- Engine capability claims come from the current README, model-import guide, compatibility guide and public example documentation. The distinction from Simple 3D and Extra 3D describes Eclipse's approach without comparative performance claims.

The visual design uses solid graphite surfaces, off-white text and the existing pale-cyan accent. A quiet dotted background, a small flat crescent/cube diagram and monospace annotations give it a project-specific identity. There are no gradients, glows, shadows, glass surfaces or animated effects.

The page reads in project/README order: introduction and metadata, about, knife example, reference links, setup, FAQ and project information. Source, docs, examples, releases and license are exposed in the compact header. Rules and columns provide structure without an enclosing card. The example has a plain caption, requirements, controls, download and setup links.

Headings use a local Trebuchet/Segoe UI stack; prose uses the system sans-serif; metadata, labels and controls use a local monospace stack. The title is 46 px on desktop and 39 px on mobile. Mobile wraps navigation and stacks the example rather than adding a menu. The original JavaScript, build script, relative links and export integration are preserved. Keyboard focus, a skip link, native disclosures, reduced-motion handling and forced-color fallbacks remain included.
