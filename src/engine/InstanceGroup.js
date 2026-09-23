const INSTANCE_STRIDE = 14;

export class InstanceGroup {
    /** @param {((affectsShadow: boolean, boundsChanged: boolean, instanceIndex: number) => void) | null} [onChange] */
    constructor(name, count, onChange = null) {
        this.name = name;
        this.count = count;
        this.onChange = onChange;
        this.materialId = 0;
        this.visible = true;
        this.frustumCulling = true;
        this.castsShadow = true;
        this.receivesShadow = true;
        this.data = new Float32Array(count * INSTANCE_STRIDE);
        this.version = 1;
        for (let index = 0; index < count; index++) {
            const offset = index * INSTANCE_STRIDE;
            this.data[offset + 6] = 1;
            this.data[offset + 7] = 1;
            this.data[offset + 8] = 1;
            this.data[offset + 9] = 0.2;
            this.data[offset + 10] = 0.55;
            this.data[offset + 11] = 0.95;
            this.data[offset + 12] = 1;
            this.data[offset + 13] = 1;
        }
    }

    setPosition(index, x, y, z) {
        this.#checkIndex(index);
        const offset = index * INSTANCE_STRIDE;
        this.data[offset] = x;
        this.data[offset + 1] = y;
        this.data[offset + 2] = z;
        this.#changed(this.visible && this.castsShadow, true, index);
    }

    setGrid(spacing) {
        const side = Math.ceil(Math.sqrt(this.count));
        const center = (side - 1) * spacing * 0.5;
        for (let index = 0; index < this.count; index++) {
            const offset = index * INSTANCE_STRIDE;
            this.data[offset] = (index % side) * spacing - center;
            this.data[offset + 2] = Math.floor(index / side) * spacing - center;
        }
        this.#changed(this.visible && this.castsShadow, true);
    }

    // Existing instance layout already supports all three TRS vectors. Validate
    // the complete command before writing or notifying its one spatial entry.
    setTransform(index, property, x, y, z) {
        this.#checkIndex(index);
        const component = this.#transformOffset(property);
        x = Math.fround(Number(x)); y = Math.fround(Number(y)); z = Math.fround(Number(z));
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error('Instance transform must be finite float32');
        const offset = index * INSTANCE_STRIDE + component;
        if (this.data[offset] === x && this.data[offset + 1] === y && this.data[offset + 2] === z) return;
        this.data[offset] = x; this.data[offset + 1] = y; this.data[offset + 2] = z;
        this.#changed(this.visible && this.castsShadow, true, index);
    }

    transformComponent(index, property, axis) {
        this.#checkIndex(index);
        if (!Number.isInteger(axis) || axis < 0 || axis > 2) throw new Error('Unknown transform axis');
        return this.data[index * INSTANCE_STRIDE + this.#transformOffset(property) + axis];
    }

    setTint(index, red, green, blue, alpha = 1) {
        this.#checkIndex(index);
        const values = [red, green, blue, alpha].map(value => Math.fround(Number(value)));
        if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
            throw new Error('Instance tint channels must be finite values in 0..1');
        }
        const offset = index * INSTANCE_STRIDE + 9;
        if (values.every((value, component) => this.data[offset + component] === value)) return;
        const alphaChanged = this.data[offset + 3] !== values[3];
        this.data.set(values, offset);
        // Tint changes compact instance data but never its spatial bounds. Alpha
        // can affect a cutout shadow, so conservatively invalidate active casters.
        this.#changed(alphaChanged && this.visible && this.castsShadow, false, index);
    }

    tintComponent(index, component) {
        this.#checkIndex(index);
        if (!Number.isInteger(component) || component < 0 || component > 3) throw new Error('Unknown tint channel');
        return this.data[index * INSTANCE_STRIDE + 9 + component];
    }

    #transformOffset(property) {
        if (property === 'position') return 0;
        if (property === 'rotation') return 3;
        if (property === 'scale') return 6;
        throw new Error('Unknown instance transform property');
    }

    setMaterial(materialId) {
        if (this.materialId === materialId) return;
        this.materialId = materialId;
        this.#changed(false);
    }

    setVisible(visible) {
        const next = Boolean(visible);
        if (this.visible === next) return;
        const affectsShadow = this.castsShadow;
        this.visible = next;
        this.#changed(affectsShadow, true);
    }

    setCastsShadow(castsShadow) {
        const next = Boolean(castsShadow);
        if (this.castsShadow === next) return;
        const affectsShadow = this.visible;
        this.castsShadow = next;
        this.#changed(affectsShadow);
    }

    setFrustumCulling(enabled) {
        const next = Boolean(enabled);
        if (this.frustumCulling === next) return;
        this.frustumCulling = next;
        this.#changed(false, true);
    }

    setReceivesShadow(receivesShadow) {
        const next = Boolean(receivesShadow);
        if (this.receivesShadow === next) return;
        this.receivesShadow = next;
        for (let index = 0; index < this.count; index++) {
            this.data[index * INSTANCE_STRIDE + 13] = next ? 1 : 0;
        }
        this.#changed(false);
    }

    #checkIndex(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.count) {
            throw new Error(`Instance index ${index} is outside 0-${this.count - 1}`);
        }
    }

    #changed(affectsShadow = true, boundsChanged = false, instanceIndex = -1) {
        this.version++;
        if (this.onChange) this.onChange(affectsShadow, boundsChanged, instanceIndex);
    }
}

export {INSTANCE_STRIDE};
