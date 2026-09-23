# Importing GLB and glTF models

Use **import 3D model file as [MODEL]** in **Models & Objects → Model assets and instances** to open the local import prompt. Click **Choose model file** to open the file picker, or drop a file on the prompt. The command waits while Eclipse reads and registers the model. Create instances with the normal model blocks after `modelState` reports `ready`.

GLB is the preferred local format. The picker accepts one .glb or .gltf file, up to 256 MiB. GLB is read directly as an ArrayBuffer through FileReader, without converting it to base64. The normal glTF parser, model store, texture decoder and shared geometry system own the imported resources.

## Which files work?

- GLB v2 with embedded buffers and textures.
- Self-contained glTF 2.0 JSON with data-URI buffers and images.
- All normal Eclipse format limits still apply: see [limitations](limitations.md).

A browser-selected file does not grant access to neighboring .bin or image files. Eclipse rejects any external buffer/image reference in a local model, including network URLs. Export a GLB with embedded resources or embed the resources as data URIs. For hosted multi-file glTF, use the existing URL loader with reachable dependencies and appropriate CORS permissions.

## Cancel, errors and retry

Cancel, Escape, or clicking outside the prompt settles the command. Native picker cancellation also settles it on browsers that support the cancel event. On older browsers, the stage prompt remains available with an explicit Cancel button. No arbitrary timeout interrupts a slow file selection.

Read **last error** after the command to distinguish cancellation or parse failure. Failed local imports release partial resources and leave the name available for retry; `modelState` is `missing`. Successful imports clear the error. Only one local model picker is open at a time.

Existing names are rejected without changing their assets or instances. To replace a model, delete its instances and LOD references, delete the asset, then import again. Multiple named imports are independent; multiple instances of one named asset share its geometry and textures.

Stop All, project reload, reset and disposal cancel active selection or import and remove temporary handlers and UI. Completed models follow normal retained-resource lifecycle rules.

## Portability

Selected files stay in memory for the current runtime session. Selecting a file does not embed it in the SB3. After reopening the project, select the file again.

The picker works in browser-based TurboWarp hosts and Packager HTML when the wrapper permits file selection. The Choose button supplies the browser-required user gesture. Local-file importing in TurboWarp Desktop and `file://` hosts has not been independently verified.

For URL or embedded-data workflows, use **load glTF model [MODEL] from [SOURCE]** (`loadModelFromSource`) with a URL or data URI. The existing `loadModelFromFile` block remains supported and uses the same picker. No Files extension is required.

See [First-Person Knife](../examples/first-person-knife/README.md) for a complete project with cancellation and retry handling.
