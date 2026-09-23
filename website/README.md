# Eclipse 3D website

The landing page is `website/index.html`. It is plain semantic HTML, one CSS file and a small deferred script. There are no runtime dependencies, remote fonts, analytics, canvas effects or framework build steps. FAQ disclosures use native HTML.

## Preview

Open `website/index.html` directly in a browser. All styling, images, navigation and downloads use relative paths. Keep this folder inside the repository so links to the existing docs, examples and extension bundle work. Under `file://`, **Open in TurboWarp** leads to the manual file-loading instructions; the editor cannot fetch local disk URLs.

For an HTTP preview, run from the repository root:

```sh
python -m http.server 8040 --bind 127.0.0.1
```

Open <http://localhost:8040/website/>. This is optional; no server is needed to view the page. The existing `npm run dev` also serves `http://localhost:8000/website/index.html`, and rebuilds the extension first.

On HTTP/HTTPS the primary button uses TurboWarp's documented [`extension` URL parameter](https://docs.turbowarp.org/url-parameters) with the actual extension link resolved against the page. It keeps GitHub Pages project subpaths intact and does not guess a hostname. TurboWarp still requests extension approval. Local browser network restrictions can require the file-loading fallback shown on the page.

## Static publishing build (no deployment)

```sh
node website/build.mjs
```

This replaces **only** `artifacts/website/` with a self-contained static site. It copies the current extension bundles, existing HTML docs, public documents and the examples named in `examples/manifest.json`. The historical `first-person-katana` directory is excluded. Run `npm run build` and `npm run build:min` first if bundles are missing or need refreshing; the website build deliberately does not modify them.

The generated `artifacts/website/index.html` is the publishing entry point. It works at a domain root or a GitHub Pages project subpath. A `.nojekyll` file is included. When deployment is explicitly requested later, upload the **contents of this artifact directory** with a Pages workflow. Do not publish `website/` alone: its sibling documentation and downloads are needed. No Pages workflow or deployment configuration is added now.

The existing source export script also includes this website and the changelog, so the exported source can preview and assemble the same site.

## Final public URLs

Set the two values at the top of `website/site.js`:

| Value | Final destination |
| --- | --- |
| `publicLinks.source` | `https://github.com/OWNER/REPOSITORY` |
| `publicLinks.releases` | `https://github.com/OWNER/REPOSITORY/releases` |

These are deliberately empty because this checkout has no configured Git remote. Until supplied, source navigation leads to the project information on this page and both destinations are visibly marked “URL coming soon.” No fake GitHub links are shipped. The deployed site origin is automatically derived; no extension URL needs hardcoding. Once a real public release exists, update the development status and release copy in `index.html`. No canonical URL or social-preview URL is guessed.

With JavaScript disabled, the complete page remains available, including docs, downloads, FAQ and manual editor instructions. Source/release navigation retains its on-page fallback.

## Assets and content

- `assets/eclipse-icon.svg` is copied unchanged from `assets/branding/eclipse-icon.svg`.
- `assets/knife-arena.jpg` is an unchanged real TurboWarp capture from `examples/first-person-katana/screenshots/knife-01-idle.jpg` (1132 × 685). It shows the earlier integrated KnifeFPS rig in Sky Court; it is not a new capture of the public local-import flow. The public demo uses the same arena and optionally loads a separately obtained model when I is pressed.
- The downloadable project is **`examples/first-person-knife/first-person-knife.sb3`**, the public version. The historical project with an embedded paid rig is never linked or bundled.
- The screenshot shows KnifeFPS from Low Poly FPS Starter Kit by RGS_Dev. The site links to the current demo's asset credits and explicitly explains that the purchased model is excluded. No model file is copied into the website assets.
- Engine capability claims come from the current README, model-import guide, compatibility guide and public example documentation. The distinction from Simple 3D and Extra 3D describes Eclipse's approach without comparative performance claims.

The visual design uses solid graphite surfaces, off-white text and the existing pale-cyan accent. A quiet dotted background, a small flat crescent/cube diagram and monospace annotations give it a project-specific identity. There are no gradients, glows, shadows, glass surfaces or animated effects.

The page reads in project/README order: introduction and metadata, about, knife example, reference links, setup, FAQ and project information. Source, docs, examples, releases and license are exposed in the compact header. Rules and columns provide structure without an enclosing card. The example has a plain caption, requirements, controls, download and project-source links.

Headings use a local Trebuchet/Segoe UI stack; prose uses the system sans-serif; metadata, labels and controls use a local monospace stack. The title is 46 px on desktop and 39 px on mobile. Mobile wraps navigation and stacks the example rather than adding a menu. The original JavaScript, build script, relative links and export integration are preserved. Keyboard focus, a skip link, native disclosures, reduced-motion handling and forced-color fallbacks remain included.
