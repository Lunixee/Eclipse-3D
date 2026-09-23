import {BackendName} from '../constants.js';
import {SeparateCanvasBackend} from './backends/SeparateCanvasBackend.js';
import {SharedWebGLBackend} from './backends/SharedWebGLBackend.js';

export const createBackend = (renderer, requested, onFrame, quality, postSettings, renderTargets) => {
    if (requested === BackendName.SHARED) {
        return new SharedWebGLBackend(renderer, onFrame, quality, postSettings, renderTargets);
    }
    return new SeparateCanvasBackend(renderer, onFrame, quality, postSettings, renderTargets);
};
