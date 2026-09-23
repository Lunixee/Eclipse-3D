const COLOR_FORMATS = Object.freeze({
    rgba8: Object.freeze({internalFormat: 'RGBA8', format: 'RGBA', type: 'UNSIGNED_BYTE', bytes: 4}),
    rgba16f: Object.freeze({internalFormat: 'RGBA16F', format: 'RGBA', type: 'HALF_FLOAT', bytes: 8})
});

const integerDimension = value => Math.max(1, Math.round(Number(value) || 1));

export class RenderTarget {
    constructor(gl, options = {}) {
        this.gl = gl;
        this.label = options.label ?? 'render target';
        this.colorFormat = options.colorFormat ?? 'rgba8';
        this.depthMode = options.depth ?? 'renderbuffer';
        this.filter = options.filter ?? 'linear';
        const format = COLOR_FORMATS[this.colorFormat];
        if (!format) throw new Error(`Unsupported render-target color format "${this.colorFormat}"`);
        if (!['renderbuffer', 'texture', false].includes(this.depthMode)) {
            throw new Error(`Unsupported render-target depth mode "${this.depthMode}"`);
        }
        if (this.colorFormat === 'rgba16f' && !gl.getExtension('EXT_color_buffer_float')) {
            throw new Error('RGBA16F render targets require EXT_color_buffer_float');
        }

        const maximumSamples = Number(gl.getParameter(gl.MAX_SAMPLES)) || 0;
        this.samples = Math.max(0, Math.min(maximumSamples, Math.round(Number(options.samples) || 0)));
        if (this.samples === 1) this.samples = 0;
        if (this.samples > 0 && this.depthMode === 'texture') {
            throw new Error('Multisampled depth textures require an explicit resolve policy');
        }
        this.framebuffer = gl.createFramebuffer();
        this.textureFramebuffer = this.samples > 0 ? gl.createFramebuffer() : this.framebuffer;
        this.texture = gl.createTexture();
        this.colorBuffer = this.samples > 0 ? gl.createRenderbuffer() : null;
        this.depth = this.depthMode === 'renderbuffer' ? gl.createRenderbuffer() : null;
        this.depthTexture = this.depthMode === 'texture' ? gl.createTexture() : null;
        this.width = 0;
        this.height = 0;
        this.version = 0;
        this.disposed = false;
        if (!this.framebuffer || !this.textureFramebuffer || !this.texture ||
            (this.samples > 0 && !this.colorBuffer) ||
            (this.depthMode === 'renderbuffer' && !this.depth) ||
            (this.depthMode === 'texture' && !this.depthTexture)) {
            this.dispose();
            throw new Error(`Unable to allocate ${this.label}`);
        }
    }

    resize(width, height) {
        const targetWidth = integerDimension(width);
        const targetHeight = integerDimension(height);
        if (targetWidth === this.width && targetHeight === this.height) return false;
        if (this.disposed) throw new Error(`${this.label} has been disposed`);
        const gl = this.gl;
        const format = COLOR_FORMATS[this.colorFormat];
        const state = this.#captureBindings();
        try {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter === 'nearest' ? gl.NEAREST : gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filter === 'nearest' ? gl.NEAREST : gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl[format.internalFormat], targetWidth, targetHeight, 0,
                gl[format.format], gl[format.type], null);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            if (this.samples === 0) this.#allocateDepth(targetWidth, targetHeight, false);
            this.#requireComplete('texture framebuffer');

            if (this.samples > 0) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
                gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorBuffer);
                gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl[format.internalFormat],
                    targetWidth, targetHeight);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorBuffer);
                this.#allocateDepth(targetWidth, targetHeight, true);
                this.#requireComplete('multisample framebuffer');
            }
        } catch (error) {
            // Attachment storage can already have changed when completeness fails.
            // Retire the whole target instead of exposing mismatched dimensions or
            // allowing a manager to cache a partially rebuilt framebuffer.
            this.dispose();
            throw error;
        } finally {
            this.#restoreBindings(state);
        }
        this.width = targetWidth;
        this.height = targetHeight;
        this.version++;
        return true;
    }

    resolve() {
        if (this.samples === 0) return false;
        const gl = this.gl;
        const state = this.#captureBindings();
        try {
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.textureFramebuffer);
            gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height,
                gl.COLOR_BUFFER_BIT, gl.NEAREST);
        } finally {
            this.#restoreBindings(state);
        }
        return true;
    }

    clear(color = [0, 0, 0, 0], depth = 1) {
        const gl = this.gl;
        const state = this.#captureBindings();
        const viewport = gl.getParameter(gl.VIEWPORT);
        const scissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);
        const colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
        const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
        const clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
        const clearDepth = gl.getParameter(gl.DEPTH_CLEAR_VALUE);
        try {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.viewport(0, 0, this.width, this.height);
            gl.disable(gl.SCISSOR_TEST);
            gl.colorMask(true, true, true, true);
            gl.depthMask(true);
            gl.clearColor(color[0], color[1], color[2], color[3]);
            gl.clearDepth(depth);
            gl.clear(gl.COLOR_BUFFER_BIT | (this.depthMode ? gl.DEPTH_BUFFER_BIT : 0));
            this.resolve();
        } finally {
            gl.viewport(...viewport);
            if (scissorEnabled) gl.enable(gl.SCISSOR_TEST);
            else gl.disable(gl.SCISSOR_TEST);
            gl.colorMask(...colorMask);
            gl.depthMask(depthMask);
            gl.clearColor(...clearColor);
            gl.clearDepth(clearDepth);
            this.#restoreBindings(state);
        }
    }

    get estimatedBytes() {
        if (this.width === 0 || this.height === 0) return 0;
        const pixels = this.width * this.height;
        const colorBytes = COLOR_FORMATS[this.colorFormat].bytes;
        const depthBytes = this.depthMode ? 4 : 0;
        const resolved = pixels * (colorBytes + (this.samples === 0 ? depthBytes : 0));
        const multisample = this.samples > 0 ? pixels * this.samples * (colorBytes + depthBytes) : 0;
        return resolved + multisample;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        const gl = this.gl;
        if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
        if (this.textureFramebuffer && this.textureFramebuffer !== this.framebuffer) {
            gl.deleteFramebuffer(this.textureFramebuffer);
        }
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.depthTexture) gl.deleteTexture(this.depthTexture);
        if (this.colorBuffer) gl.deleteRenderbuffer(this.colorBuffer);
        if (this.depth) gl.deleteRenderbuffer(this.depth);
        this.framebuffer = null;
        this.textureFramebuffer = null;
        this.texture = null;
        this.depthTexture = null;
        this.colorBuffer = null;
        this.depth = null;
        this.width = 0;
        this.height = 0;
    }

    #allocateDepth(width, height, multisample) {
        const gl = this.gl;
        if (!this.depthMode) return;
        if (this.depthMode === 'texture') {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0,
                gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
            return;
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
        if (multisample) {
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, width, height);
        } else {
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
        }
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    }

    #requireComplete(part) {
        const gl = this.gl;
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`${this.label} ${part} is incomplete (0x${status.toString(16)})`);
        }
    }

    #captureBindings() {
        const gl = this.gl;
        const activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        const activeTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
        gl.activeTexture(gl.TEXTURE0);
        const texture0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
        gl.activeTexture(activeTexture);
        return {
            activeTexture,
            activeTextureBinding,
            texture0,
            drawFramebuffer: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
            readFramebuffer: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
            renderbuffer: gl.getParameter(gl.RENDERBUFFER_BINDING)
        };
    }

    #restoreBindings(state) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, state.drawFramebuffer);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, state.readFramebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, state.renderbuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, state.texture0);
        gl.activeTexture(state.activeTexture);
        gl.bindTexture(gl.TEXTURE_2D, state.activeTextureBinding);
    }
}

export {COLOR_FORMATS as RENDER_TARGET_COLOR_FORMATS};
