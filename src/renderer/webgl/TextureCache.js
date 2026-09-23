const MIN_FILTER = Object.freeze({
    nearest: 'NEAREST',
    linear: 'LINEAR',
    'nearest-mipmap-nearest': 'NEAREST_MIPMAP_NEAREST',
    'linear-mipmap-nearest': 'LINEAR_MIPMAP_NEAREST',
    'nearest-mipmap-linear': 'NEAREST_MIPMAP_LINEAR',
    'linear-mipmap-linear': 'LINEAR_MIPMAP_LINEAR'
});
const MAG_FILTER = Object.freeze({nearest: 'NEAREST', linear: 'LINEAR'});
const WRAP = Object.freeze({clamp: 'CLAMP_TO_EDGE', repeat: 'REPEAT', mirror: 'MIRRORED_REPEAT'});

export class TextureCache {
    constructor(gl) {
        this.gl = gl;
        this.store = null;
        this.entries = new Map();
        this.uploadCount = 0;
        this.textUploadCount = 0;
        this.deleteCount = 0;
        this.anisotropy = gl.getExtension('EXT_texture_filter_anisotropic') ||
            gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
        this.maxAnisotropy = this.anisotropy
            ? gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
            : 1;
        this.qualityMipmaps = true;
        this.qualityMaxAnisotropy = 16;
        this.qualityVersion = 1;
        this.externalResolver = null;
    }

    setQuality(limits) {
        if (this.qualityMipmaps === limits.mipmaps &&
            this.qualityMaxAnisotropy === limits.maxAnisotropy) return;
        this.qualityMipmaps = limits.mipmaps;
        this.qualityMaxAnisotropy = limits.maxAnisotropy;
        this.qualityVersion++;
    }

    setStore(store) {
        if (store === this.store) return;
        this.clear();
        this.store = store;
    }

    setExternalResolver(resolver) {
        this.externalResolver = resolver;
    }

    get(resource) {
        if (!resource || resource.disposed || resource.state !== 'ready') return null;
        if (resource.source.kind === 'render-target') {
            const texture = this.externalResolver?.(resource.source.externalId) ?? null;
            if (texture) this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            return texture;
        }
        let entry = this.entries.get(resource.id);
        if (!entry) {
            const texture = this.gl.createTexture();
            if (!texture) throw new Error(`Could not allocate GPU texture "${resource.name}"`);
            entry = {
                resource,
                texture,
                uploadKey: '',
                settingsVersion: -1,
                qualityVersion: -1
            };
            this.entries.set(resource.id, entry);
        }
        const settings = resource.settings;
        const uploadKey = `${resource.source.version}:${settings.flipY}`;
        this.gl.bindTexture(this.gl.TEXTURE_2D, entry.texture);
        if (entry.uploadKey !== uploadKey) {
            this.#upload(resource);
            entry.uploadKey = uploadKey;
            entry.settingsVersion = -1;
        }
        if (entry.settingsVersion !== resource.settingsVersion || entry.qualityVersion !== this.qualityVersion) {
            this.#applySettings(resource);
            entry.settingsVersion = resource.settingsVersion;
            entry.qualityVersion = this.qualityVersion;
        }
        return entry.texture;
    }

    sweep() {
        if (!this.store) {
            this.clear();
            return;
        }
        for (const [id, entry] of this.entries) {
            if (this.store.resourceForId(id) === entry.resource) continue;
            this.gl.deleteTexture(entry.texture);
            this.deleteCount++;
            this.entries.delete(id);
        }
    }

    clear() {
        for (const entry of this.entries.values()) {
            this.gl.deleteTexture(entry.texture);
            this.deleteCount++;
        }
        this.entries.clear();
    }

    dispose() {
        this.clear();
        this.store = null;
        this.externalResolver = null;
    }

    #upload(resource) {
        const gl = this.gl;
        const source = resource.source;
        const previousFlipY = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
        try {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, resource.settings.flipY);
            if (source.kind === 'pixels') {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA8,
                    source.width,
                    source.height,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    source.image
                );
            } else {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA8,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    source.image
                );
            }
            this.uploadCount++;
            if (source.semanticKind === 'text-raster') this.textUploadCount++;
        } finally {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, previousFlipY);
        }
    }

    #applySettings(resource) {
        const gl = this.gl;
        const settings = resource.settings;
        const mipmaps = settings.mipmaps && this.qualityMipmaps;
        const minFilter = mipmaps
            ? MIN_FILTER[settings.minFilter]
            : (settings.minFilter.startsWith('nearest') ? 'NEAREST' : 'LINEAR');
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[minFilter]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[MAG_FILTER[settings.magFilter]]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[WRAP[settings.wrapU]]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[WRAP[settings.wrapV]]);
        if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
        if (this.anisotropy) {
            gl.texParameterf(
                gl.TEXTURE_2D,
                this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(this.maxAnisotropy, this.qualityMaxAnisotropy, settings.anisotropy)
            );
        }
    }
}
