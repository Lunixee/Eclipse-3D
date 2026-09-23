# Host and backend compatibility

See [API and host requirements](docs/compatibility.md), [renderer backend contracts](RENDERER_BACKENDS.md) and [local model importing](docs/model-import.md).

The default backend requires WebGL 2, Scratch bitmap-skin methods and drawable layer access. Shared WebGL additionally uses renderer.exports.Skin, _allSkins, _nextSkinId, _layerGroups and _doExitDrawRegion. These private host interfaces can change; use the default separate-canvas backend unless shared-context rendering is needed.
