import {Turbo3DExtension} from './extension/Turbo3DExtension.js';
import {TurboWarpBridge} from './platform/TurboWarpBridge.js';

const scratchApi = globalThis['Scratch'];
if (!scratchApi) throw new Error('Eclipse 3D must be loaded as a TurboWarp custom extension');
if (!scratchApi.extensions?.unsandboxed) throw new Error('Eclipse 3D must run without the extension sandbox');

let extension;
const bridge = new TurboWarpBridge(scratchApi, {
    afterExecute: now => extension?.engine.tick(now),
    projectRunStart: restart => extension?.engine.handleProjectRunStart(restart),
    runtimePaused: paused => extension?.engine.handleRuntimePause(paused),
    projectLoaded: () => extension?.engine.handleStopAll(),
    stopAll: () => extension?.engine.handleStopAll(),
    runtimeDisposed: () => extension?.engine.handleRuntimeDisposed(),
    stageSizeChanged: () => extension?.engine.invalidate()
});
extension = new Turbo3DExtension(scratchApi, bridge);
scratchApi.extensions.register(extension);
