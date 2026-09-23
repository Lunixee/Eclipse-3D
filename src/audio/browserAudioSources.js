const MAX_BYTES = 64 * 1024 * 1024;

const decodeDataURL = url => {
    const comma = url.indexOf(',');
    if (comma < 0) throw new Error('Invalid audio data URL');
    const metadata = url.slice(5, comma);
    const payload = url.slice(comma + 1);
    if (metadata.split(';').includes('base64')) {
        if (payload.length > Math.ceil(MAX_BYTES / 3) * 4 + 4) throw new Error('Audio exceeds 64 MiB');
        const binary = globalThis.atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }
    const text = decodeURIComponent(payload);
    const bytes = new TextEncoder().encode(text);
    if (bytes.byteLength > MAX_BYTES) throw new Error('Audio exceeds 64 MiB');
    return bytes;
};

const toBytes = async data => {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (typeof data?.arrayBuffer === 'function') return new Uint8Array(await data.arrayBuffer());
    throw new Error('Scratch sound has no usable embedded audio data');
};

export const createUrlAudioSource = (Scratch, source) => {
    const requested = String(source).trim();
    if (!requested) throw new Error('Audio URL cannot be empty');
    const url = requested.startsWith('data:') ? requested :
        new URL(requested, globalThis.document?.baseURI ?? globalThis.location?.href).href;
    return {
        key: `url:${url}`,
        load: async signal => {
            if (signal.aborted) throw new Error('Audio load was cancelled');
            if (url.startsWith('data:')) return {bytes: decodeDataURL(url)};
            if (!url.startsWith('data:') && typeof Scratch.canFetch === 'function' && !await Scratch.canFetch(url)) {
                throw new Error('TurboWarp blocked the audio URL');
            }
            if (signal.aborted) throw new Error('Audio load was cancelled');
            const response = await (Scratch.fetch ?? fetch)(url, {signal});
            if (!response.ok) throw new Error(`Audio request failed with HTTP ${response.status}`);
            if (Number(response.headers?.get?.('content-length')) > MAX_BYTES) throw new Error('Audio exceeds 64 MiB');
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength > MAX_BYTES) throw new Error('Audio exceeds 64 MiB');
            return {bytes};
        }
    };
};

// Packager releases sound.asset after Scratch has decoded it into soundBank.
// Reuse that buffer when available; editor-like hosts retain asset bytes as a fallback.
export const createScratchSoundSource = (target, name) => {
    const sounds = target?.getSounds?.() ?? [];
    const requested = String(name);
    const sound = sounds.find(item => item.name === requested);
    const key = sound?.asset?.assetId ?? sound?.assetId ?? sound?.md5 ?? sound?.md5ext ?? sound?.soundId ??
        `${target?.id ?? 'target'}:${requested}`;
    return {key: `scratch:${key}`, load: async signal => {
        if (signal.aborted) throw new Error('Audio load was cancelled');
        if (!sound) throw new Error(`Scratch sound "${requested}" was not found on this target`);
        const player = sound.soundId ? target?.sprite?.soundBank?.getSoundPlayer?.(sound.soundId) : null;
        if (player?.buffer) return {decodedBuffer: player.buffer};
        if (sound.asset?.data == null) {
            throw new Error(`Scratch sound "${requested}" has no decoded buffer or embedded audio asset`);
        }
        const bytes = await toBytes(sound.asset.data);
        if (signal.aborted) throw new Error('Audio load was cancelled');
        return {bytes};
    }};
};
