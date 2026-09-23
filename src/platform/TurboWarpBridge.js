const RuntimeEvent = Object.freeze({
    AFTER_EXECUTE: 'AFTER_EXECUTE',
    PROJECT_START: 'PROJECT_START',
    PROJECT_STOP_ALL: 'PROJECT_STOP_ALL',
    RUNTIME_PAUSED: 'RUNTIME_PAUSED',
    RUNTIME_UNPAUSED: 'RUNTIME_UNPAUSED',
    PROJECT_LOADED: 'PROJECT_LOADED',
    RUNTIME_DISPOSED: 'RUNTIME_DISPOSED',
    STAGE_SIZE_CHANGED: 'STAGE_SIZE_CHANGED'
});

export class TurboWarpBridge {
    constructor(Scratch, callbacks) {
        if (!Scratch.extensions?.unsandboxed) {
            throw new Error('Eclipse 3D must run without the extension sandbox');
        }
        if (!Scratch.vm?.runtime?.renderer) {
            throw new Error('Eclipse 3D could not access the TurboWarp renderer');
        }
        this.Scratch = Scratch;
        this.vm = Scratch.vm;
        this.runtime = Scratch.vm.runtime;
        this.renderer = this.runtime.renderer;
        this.callbacks = callbacks;
        // the pause addon may already be active when this extension loads
        this.runtimePaused = this.runtime.ioDevices?.clock?._paused === true;
        this.listeners = [
            [RuntimeEvent.AFTER_EXECUTE, () => callbacks.afterExecute(performance.now())],
            // PROJECT_RUN_START also fires on palette clicks; only green flag starts simulation
            [RuntimeEvent.PROJECT_START, () => callbacks.projectRunStart(true)],
            [RuntimeEvent.PROJECT_STOP_ALL, () => callbacks.stopAll()],
            [RuntimeEvent.RUNTIME_PAUSED, () => {
                this.runtimePaused = true;
                callbacks.runtimePaused?.(true);
            }],
            [RuntimeEvent.RUNTIME_UNPAUSED, () => {
                this.runtimePaused = false;
                callbacks.runtimePaused?.(false);
            }],
            [RuntimeEvent.PROJECT_LOADED, () => callbacks.projectLoaded?.()],
            [RuntimeEvent.RUNTIME_DISPOSED, () => callbacks.runtimeDisposed()],
            [RuntimeEvent.STAGE_SIZE_CHANGED, () => callbacks.stageSizeChanged()]
        ];
        for (const [event, listener] of this.listeners) this.runtime.on(event, listener);
    }

    requestRedraw() {
        this.renderer.dirty = true;
        if (typeof this.runtime.requestRedraw === 'function') this.runtime.requestRedraw();
    }

    dispose() {
        for (const [event, listener] of this.listeners) this.runtime.off(event, listener);
        this.listeners.length = 0;
    }
}
