const imageResult = image => ({
    kind: 'image',
    image,
    width: image.width || image.naturalWidth,
    height: image.height || image.naturalHeight
});

const errorMessage = error => error instanceof Error ? error.message : String(error);

const costumeMimeType = dataFormat => {
    const format = String(dataFormat || 'png').toLowerCase();
    if (format === 'svg') return 'image/svg+xml';
    if (format === 'jpg') return 'image/jpeg';
    return `image/${format}`;
};

/**
 * @param {Array<object> | null} [attempts]
 * @param {AbortSignal} [signal]
 */
export const decodeImageBlob = async (blob, attempts = null, signal) => {
    const record = attempt => attempts?.push(attempt);
    if (signal?.aborted) throw new DOMException('Texture load aborted', 'AbortError');
    if (!blob || !blob.type?.startsWith('image/')) {
        record({decoder: 'validation', result: 'rejected', mimeType: blob?.type || ''});
        throw new Error('Texture source is not an image');
    }
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(blob, {colorSpaceConversion: 'none', premultiplyAlpha: 'none'});
            record({decoder: 'createImageBitmap(options)', result: 'decoded', width: bitmap.width, height: bitmap.height});
            return imageResult(bitmap);
        } catch (error) {
            record({decoder: 'createImageBitmap(options)', result: 'failed', error: errorMessage(error)});
            try {
                const bitmap = await createImageBitmap(blob);
                record({decoder: 'createImageBitmap', result: 'decoded', width: bitmap.width, height: bitmap.height});
                return imageResult(bitmap);
            } catch (fallbackError) {
                record({decoder: 'createImageBitmap', result: 'failed', error: errorMessage(fallbackError)});
                // Some Chromium builds reject SVG and other valid browser image formats here.
                // The image element decoder supports a wider set of those formats.
            }
        }
    }
    if (signal?.aborted) throw new DOMException('Texture load aborted', 'AbortError');
    if (typeof Image !== 'function') {
        record({decoder: 'HTMLImageElement', result: 'unavailable'});
        throw new Error('This runtime cannot decode images');
    }
    const objectURL = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.decoding = 'async';
        await new Promise((resolve, reject) => {
            let settled = false;
            const finish = error => {
                if (settled) return;
                settled = true;
                signal?.removeEventListener('abort', abort);
                image.onload = image.onerror = null;
                if (error) {
                    image.removeAttribute('src');
                    reject(error);
                } else resolve(undefined);
            };
            const abort = () => finish(new DOMException('Texture load aborted', 'AbortError'));
            image.onload = () => {
                if (settled) return;
                record({
                    decoder: 'HTMLImageElement',
                    result: 'decoded',
                    width: image.naturalWidth || image.width,
                    height: image.naturalHeight || image.height,
                    objectURLUsed: true
                });
                finish(null);
            };
            image.onerror = () => {
                if (settled) return;
                record({decoder: 'HTMLImageElement', result: 'failed', objectURLUsed: true});
                finish(new Error('The image could not be decoded'));
            };
            signal?.addEventListener('abort', abort, {once: true});
            try {
                if (signal?.aborted) abort();
                else image.src = objectURL;
            } catch (error) {
                finish(error);
            }
        });
        return imageResult(image);
    } finally {
        URL.revokeObjectURL(objectURL);
        record({decoder: 'object URL', result: 'revoked after decode settled'});
    }
};

export const loadImageURL = async (Scratch, source, signal, decode = decodeImageBlob) => {
    const url = String(source).trim();
    if (!url) throw new Error('Texture source cannot be empty');
    if (!url.startsWith('data:')) {
        if (typeof Scratch.canFetch === 'function' && !await Scratch.canFetch(url)) {
            throw new Error(`TurboWarp blocked texture URL "${url}"`);
        }
    } else if (!url.startsWith('data:image/')) {
        throw new Error('Texture data URI must contain an image');
    }
    const fetcher = Scratch.fetch ?? fetch;
    const response = await fetcher(url, {signal});
    if (!response.ok) throw new Error(`Texture request failed with HTTP ${response.status}`);
    return decode(await response.blob(), null, signal);
};

export const getCostumeSource = (Scratch, target, costumeName, decode = decodeImageBlob) => {
    const costumes = typeof target?.getCostumes === 'function' ? target.getCostumes() : target?.sprite?.costumes;
    const costume = costumes?.find(item => item.name === costumeName);
    if (!costume) throw new Error(`Unknown costume "${costumeName}"`);
    const asset = costume.asset;
    if (!asset) throw new Error(`Costume "${costumeName}" has no loaded asset`);
    const key = `costume:${costume.assetId ?? asset.assetId ?? costume.md5ext ?? costumeName}`;
    return {
        key,
        load: async signal => {
            if (signal.aborted) throw new DOMException('Texture load aborted', 'AbortError');
            const contentType = asset.assetType?.contentType || costumeMimeType(costume.dataFormat);
            if (asset.data !== undefined && asset.data !== null) {
                return decode(new Blob([asset.data], {type: contentType}), null, signal);
            }
            if (typeof asset.encodeDataURI !== 'function') {
                throw new Error(`Costume "${costumeName}" cannot be read in this runtime`);
            }
            return loadImageURL(Scratch, asset.encodeDataURI(), signal, decode);
        }
    };
};

export const chooseLocalImageFile = () => new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
        reject(new Error('Local file selection is unavailable in this runtime'));
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
        const file = input.files?.[0];
        if (file) resolve(file);
        else reject(new Error('No texture file was selected'));
    };
    input.oncancel = () => reject(new Error('Texture file selection was cancelled'));
    input.click();
});

export const getLocalFileSource = (file, decode = decodeImageBlob) => ({
    key: `file:${file.name}:${file.size}:${file.lastModified}`,
    load: signal => {
        if (signal.aborted) throw new DOMException('Texture load aborted', 'AbortError');
        return decode(file, null, signal);
    }
});
