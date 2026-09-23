import {decodeImageBlob} from '../textures/browserTextureSources.js';
import {modelSelectionCancelled} from './LocalModelPicker.js';

const MAX_MODEL_BYTES = 256 * 1024 * 1024;

const responseBytes = async response => {
    if (!response.ok) throw new Error(`Model request failed with HTTP ${response.status}`);
    const declared = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > MAX_MODEL_BYTES) throw new Error('Model source exceeds the 256 MiB safety limit');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_MODEL_BYTES) throw new Error('Model source exceeds the 256 MiB safety limit');
    return bytes;
};

const checkFetchPermission = async (Scratch, url) => {
    if (url.startsWith('data:')) return;
    if (typeof Scratch.canFetch === 'function' && !await Scratch.canFetch(url)) {
        throw new Error(`TurboWarp blocked model URL "${url}"`);
    }
};

export const createUrlModelSource = (Scratch, source) => {
    const requestedUrl = String(source).trim();
    if (!requestedUrl) throw new Error('Model URL cannot be empty');
    const url = requestedUrl.startsWith('data:') ? requestedUrl :
        new URL(requestedUrl, globalThis.document?.baseURI ?? globalThis.location?.href).href;
    const baseUrl = url.startsWith('data:') ? '' : new URL('.', url).href;
    const fetcher = Scratch.fetch ?? fetch;
    const fetchBytes = async (target, signal) => {
        await checkFetchPermission(Scratch, target);
        return responseBytes(await fetcher(target, {signal}));
    };
    return {
        key: `url:${url}`,
        baseUrl,
        load: signal => fetchBytes(url, signal),
        resolveBytes: (relative, signal) => fetchBytes(new URL(relative, baseUrl).href, signal),
        resolveImage: async (relative, mimeType, signal) => {
            const target = new URL(relative, baseUrl).href;
            await checkFetchPermission(Scratch, target);
            const response = await fetcher(target, {signal});
            if (!response.ok) throw new Error(`Model image request failed with HTTP ${response.status}`);
            return decodeImageBlob(await response.blob(), null, signal);
        }
    };
};

let fileSelectionId = 0;

export const createFileModelSource = file => ({
    // metadata isn't an identity: two different files can share a name, size and timestamp
    key: `local-model:${++fileSelectionId}`,
    baseUrl: '',
    selfContained: true,
    load: signal => new Promise((resolve, reject) => {
        if (signal.aborted) { reject(modelSelectionCancelled()); return; }
        if (!/\.(glb|gltf)$/i.test(file.name)) { reject(new Error('Choose a .glb or .gltf model file')); return; }
        if (file.size > MAX_MODEL_BYTES) { reject(new Error('Model source exceeds the 256 MiB safety limit')); return; }
        const reader = new FileReader();
        const finish = error => {
            signal.removeEventListener('abort', abort);
            reader.onload = reader.onerror = reader.onabort = null;
            if (error) reject(error);
            else resolve(new Uint8Array(/** @type {ArrayBuffer} */ (reader.result)));
        };
        const abort = () => { reader.abort(); finish(modelSelectionCancelled()); };
        signal.addEventListener('abort', abort, {once: true});
        reader.onload = () => finish(null);
        reader.onerror = () => finish(new Error(`Could not read model file: ${reader.error?.message ?? 'read failed'}`));
        reader.onabort = () => finish(modelSelectionCancelled());
        try { reader.readAsArrayBuffer(file); } catch (error) { finish(error); }
    }),
    resolveBytes: async () => {
        throw new Error('External files referenced by a local .gltf cannot be selected automatically; use GLB');
    },
    resolveImage: async () => {
        throw new Error('External images referenced by a local .gltf cannot be selected automatically; use GLB');
    }
});
