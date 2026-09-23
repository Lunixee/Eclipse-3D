export const JOINT_PALETTE_TEXTURE_UNIT = 10;

export class JointPaletteCache {
    constructor(gl) {
        this.gl = gl;
        this.entries = new Map();
        this.used = new Set();
        this.maxJoints = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        this.uploads = 0;
        this.uploadBytes = 0;
    }

    beginFrame() {
        this.used.clear();
    }

    bind(item, unit = JOINT_PALETTE_TEXTURE_UNIT) {
        const owner = item.paletteOwner ?? item;
        const palette = owner.jointPalette;
        if (!palette || palette.length === 0 || palette.length % 16 !== 0) throw new Error('Invalid joint palette');
        const jointCount = palette.length / 16;
        const gl = this.gl;
        if (jointCount > this.maxJoints) {
            throw new Error(`Skin has ${jointCount} joints, above this WebGL2 device's palette limit`);
        }
        let entry = this.entries.get(owner);
        if (!entry) {
            const texture = gl.createTexture();
            if (!texture) throw new Error('Could not allocate a joint palette texture');
            entry = {texture, version: -1, jointCount};
            this.entries.set(owner, entry);
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, jointCount, 0, gl.RGBA, gl.FLOAT, null);
        } else {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        }
        if (entry.version !== owner.paletteVersion) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, jointCount, gl.RGBA, gl.FLOAT, palette);
            entry.version = owner.paletteVersion;
            this.uploads++;
            this.uploadBytes += palette.byteLength;
        }
        this.used.add(owner);
        return entry.texture;
    }

    sweep() {
        for (const [item, entry] of this.entries) {
            if (this.used.has(item)) continue;
            this.gl.deleteTexture(entry.texture);
            this.entries.delete(item);
        }
    }

    dispose() {
        for (const entry of this.entries.values()) this.gl.deleteTexture(entry.texture);
        this.entries.clear();
        this.used.clear();
    }
}
