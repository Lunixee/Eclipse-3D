import {composeTrs, identityMatrix} from './modelMath.js';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const MAX_SOURCE_BYTES = 256 * 1024 * 1024;
const COMPONENTS = Object.freeze({SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16});
const COMPONENT_TYPES = Object.freeze({
    5120: {ArrayType: Int8Array, bytes: 1, integer: true, signed: true},
    5121: {ArrayType: Uint8Array, bytes: 1, integer: true, signed: false},
    5122: {ArrayType: Int16Array, bytes: 2, integer: true, signed: true},
    5123: {ArrayType: Uint16Array, bytes: 2, integer: true, signed: false},
    5125: {ArrayType: Uint32Array, bytes: 4, integer: true, signed: false},
    5126: {ArrayType: Float32Array, bytes: 4, integer: false, signed: true}
});
const SUPPORTED_REQUIRED_EXTENSIONS = new Set(['KHR_materials_unlit', 'KHR_texture_transform']);

const asUint8Array = value => {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error('Model source must be an ArrayBuffer or typed array');
};

const checkedIndex = (array, index, label) => {
    if (!Number.isInteger(index) || index < 0 || index >= array.length) throw new Error(`${label} index ${index} is out of range`);
    return array[index];
};

const decodeDataUri = uri => {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(uri);
    if (!match) throw new Error('Malformed data URI');
    const payload = match[3];
    if (match[2]) {
        if (typeof globalThis.atob !== 'function') throw new Error('Base64 decoding is unavailable');
        const binary = globalThis.atob(payload);
        const data = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) data[index] = binary.charCodeAt(index);
        return {bytes: data, mimeType: match[1] || 'application/octet-stream'};
    }
    return {bytes: new TextEncoder().encode(decodeURIComponent(payload)), mimeType: match[1] || 'text/plain'};
};

const parseContainer = source => {
    const bytes = asUint8Array(source);
    if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Model source exceeds the 256 MiB safety limit');
    if (bytes.byteLength >= 12 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === GLB_MAGIC) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (view.getUint32(4, true) !== 2) throw new Error('Only GLB version 2 is supported');
        const declaredLength = view.getUint32(8, true);
        if (declaredLength !== bytes.byteLength) throw new Error('GLB declared length does not match the source');
        let offset = 12;
        let jsonBytes = null;
        let binaryChunk = null;
        while (offset < bytes.byteLength) {
            if (offset + 8 > bytes.byteLength) throw new Error('GLB chunk header is truncated');
            const length = view.getUint32(offset, true);
            const type = view.getUint32(offset + 4, true);
            offset += 8;
            if (offset + length > bytes.byteLength) throw new Error('GLB chunk extends beyond the file');
            const chunk = bytes.subarray(offset, offset + length);
            if (type === JSON_CHUNK && !jsonBytes) jsonBytes = chunk;
            else if (type === BIN_CHUNK && !binaryChunk) binaryChunk = chunk;
            offset += length;
        }
        if (!jsonBytes) throw new Error('GLB is missing its JSON chunk');
        let text = new TextDecoder().decode(jsonBytes);
        while (text.length > 0 && text.charCodeAt(text.length - 1) === 0) text = text.slice(0, -1);
        text = text.trimEnd();
        return {json: JSON.parse(text), binaryChunk};
    }
    const text = new TextDecoder().decode(bytes).replace(/^\uFEFF/, '');
    return {json: JSON.parse(text), binaryChunk: null};
};

const readComponent = (view, offset, componentType) => {
    switch (componentType) {
    case 5120: return view.getInt8(offset);
    case 5121: return view.getUint8(offset);
    case 5122: return view.getInt16(offset, true);
    case 5123: return view.getUint16(offset, true);
    case 5125: return view.getUint32(offset, true);
    case 5126: return view.getFloat32(offset, true);
    default: throw new Error(`Unsupported accessor component type ${componentType}`);
    }
};

const normalizedComponent = (value, componentType) => {
    if (componentType === 5120) return Math.max(value / 127, -1);
    if (componentType === 5121) return value / 255;
    if (componentType === 5122) return Math.max(value / 32767, -1);
    if (componentType === 5123) return value / 65535;
    if (componentType === 5125) return value / 4294967295;
    return value;
};

const readAccessor = (gltf, buffers, accessorIndex, forceFloat = true) => {
    const accessor = checkedIndex(gltf.accessors ?? [], accessorIndex, 'Accessor');
    const component = COMPONENT_TYPES[accessor.componentType];
    const componentCount = COMPONENTS[accessor.type];
    if (!component || !componentCount) throw new Error(`Accessor ${accessorIndex} has an unsupported format`);
    if (!Number.isInteger(accessor.count) || accessor.count < 0) throw new Error(`Accessor ${accessorIndex} has an invalid count`);
    const output = forceFloat ? new Float32Array(accessor.count * componentCount) : new component.ArrayType(accessor.count * componentCount);
    if (accessor.bufferView !== undefined) {
        const bufferView = checkedIndex(gltf.bufferViews ?? [], accessor.bufferView, 'Buffer view');
        const buffer = checkedIndex(buffers, bufferView.buffer, 'Buffer');
        const elementBytes = component.bytes * componentCount;
        const stride = bufferView.byteStride ?? elementBytes;
        if (stride < elementBytes || stride % component.bytes !== 0) throw new Error(`Accessor ${accessorIndex} has an invalid byte stride`);
        const baseOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        const finalByte = accessor.count === 0 ? baseOffset : baseOffset + (accessor.count - 1) * stride + elementBytes;
        const viewEnd = (bufferView.byteOffset ?? 0) + bufferView.byteLength;
        if (baseOffset < (bufferView.byteOffset ?? 0) || finalByte > viewEnd || finalByte > buffer.byteLength) {
            throw new Error(`Accessor ${accessorIndex} reads outside its buffer view`);
        }
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        for (let element = 0; element < accessor.count; element++) {
            const source = baseOffset + element * stride;
            for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) {
                let value = readComponent(view, source + componentIndex * component.bytes, accessor.componentType);
                if (forceFloat && accessor.normalized) value = normalizedComponent(value, accessor.componentType);
                output[element * componentCount + componentIndex] = value;
            }
        }
    }
    if (accessor.sparse) {
        const sparse = accessor.sparse;
        if (!Number.isInteger(sparse.count) || sparse.count < 0 || sparse.count > accessor.count) {
            throw new Error(`Accessor ${accessorIndex} has an invalid sparse count`);
        }
        const indicesInfo = COMPONENT_TYPES[sparse.indices.componentType];
        if (![5121, 5123, 5125].includes(sparse.indices.componentType)) {
            throw new Error(`Accessor ${accessorIndex} has an invalid sparse index type`);
        }
        const indexView = checkedIndex(gltf.bufferViews ?? [], sparse.indices.bufferView, 'Sparse index buffer view');
        const indexBuffer = checkedIndex(buffers, indexView.buffer, 'Buffer');
        const valueView = checkedIndex(gltf.bufferViews ?? [], sparse.values.bufferView, 'Sparse value buffer view');
        const valueBuffer = checkedIndex(buffers, valueView.buffer, 'Buffer');
        const indexOffset = (indexView.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
        const valueOffset = (valueView.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
        const indexEnd = indexOffset + sparse.count * indicesInfo.bytes;
        const valueEnd = valueOffset + sparse.count * componentCount * component.bytes;
        if (indexEnd > (indexView.byteOffset ?? 0) + indexView.byteLength || indexEnd > indexBuffer.byteLength ||
            valueEnd > (valueView.byteOffset ?? 0) + valueView.byteLength || valueEnd > valueBuffer.byteLength) {
            throw new Error(`Accessor ${accessorIndex} sparse data is out of bounds`);
        }
        const indexData = new DataView(indexBuffer.buffer, indexBuffer.byteOffset, indexBuffer.byteLength);
        const valueData = new DataView(valueBuffer.buffer, valueBuffer.byteOffset, valueBuffer.byteLength);
        for (let sparseIndex = 0; sparseIndex < sparse.count; sparseIndex++) {
            const targetIndex = readComponent(indexData, indexOffset + sparseIndex * indicesInfo.bytes, sparse.indices.componentType);
            if (targetIndex >= accessor.count) throw new Error(`Accessor ${accessorIndex} sparse index is out of range`);
            for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) {
                let value = readComponent(
                    valueData,
                    valueOffset + (sparseIndex * componentCount + componentIndex) * component.bytes,
                    accessor.componentType
                );
                if (forceFloat && accessor.normalized) value = normalizedComponent(value, accessor.componentType);
                output[targetIndex * componentCount + componentIndex] = value;
            }
        }
    }
    return output;
};

const generateNormals = (positions, indices) => {
    const normals = new Float32Array(positions.length);
    const count = indices?.length ?? positions.length / 3;
    for (let index = 0; index < count; index += 3) {
        const a = indices ? indices[index] : index;
        const b = indices ? indices[index + 1] : index + 1;
        const c = indices ? indices[index + 2] : index + 2;
        const ax = positions[b * 3] - positions[a * 3];
        const ay = positions[b * 3 + 1] - positions[a * 3 + 1];
        const az = positions[b * 3 + 2] - positions[a * 3 + 2];
        const bx = positions[c * 3] - positions[a * 3];
        const by = positions[c * 3 + 1] - positions[a * 3 + 1];
        const bz = positions[c * 3 + 2] - positions[a * 3 + 2];
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        for (const vertex of [a, b, c]) {
            normals[vertex * 3] += nx;
            normals[vertex * 3 + 1] += ny;
            normals[vertex * 3 + 2] += nz;
        }
    }
    for (let index = 0; index < normals.length; index += 3) {
        const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1;
        normals[index] /= length;
        normals[index + 1] /= length;
        normals[index + 2] /= length;
    }
    return normals;
};

const primitiveIndices = (mode, source, vertexCount) => {
    if (mode === undefined || mode === 4) return source;
    const base = source ?? Uint32Array.from({length: vertexCount}, (_, index) => index);
    if (mode === 5) {
        const output = new Uint32Array(Math.max(0, base.length - 2) * 3);
        let cursor = 0;
        for (let index = 2; index < base.length; index++) {
            if (index & 1) output.set([base[index - 1], base[index - 2], base[index]], cursor);
            else output.set([base[index - 2], base[index - 1], base[index]], cursor);
            cursor += 3;
        }
        return output;
    }
    if (mode === 6) {
        const output = new Uint32Array(Math.max(0, base.length - 2) * 3);
        for (let index = 2; index < base.length; index++) output.set([base[0], base[index - 1], base[index]], (index - 2) * 3);
        return output;
    }
    throw new Error(`Primitive mode ${mode} is unsupported; use triangles, triangle strip, or triangle fan`);
};

const nodeDescriptor = (node, index) => {
    if (node.matrix !== undefined) {
        if (!Array.isArray(node.matrix) || node.matrix.length !== 16 || node.matrix.some(value => !Number.isFinite(value))) {
            throw new Error('Node matrix must contain 16 finite values');
        }
        return {
            index,
            name: node.name || `node ${index}`,
            parent: -1,
            children: [...(node.children ?? [])],
            mesh: node.mesh ?? -1,
            skin: node.skin ?? -1,
            matrixAuthored: true,
            baseTranslation: new Float32Array([node.matrix[12], node.matrix[13], node.matrix[14]]),
            baseRotation: new Float32Array([0, 0, 0, 1]),
            baseScale: new Float32Array([1, 1, 1]),
            localMatrix: new Float32Array(node.matrix)
        };
    }
    const translation = node.translation ?? [0, 0, 0];
    const rotation = node.rotation ?? [0, 0, 0, 1];
    const scale = node.scale ?? [1, 1, 1];
    if (translation.length !== 3 || rotation.length !== 4 || scale.length !== 3 ||
        [...translation, ...rotation, ...scale].some(value => !Number.isFinite(value))) {
        throw new Error('Node TRS values are invalid');
    }
    const length = Math.hypot(...rotation) || 1;
    const normalizedRotation = rotation.map(value => value / length);
    return {
        index,
        name: node.name || `node ${index}`,
        parent: -1,
        children: [...(node.children ?? [])],
        mesh: node.mesh ?? -1,
        skin: node.skin ?? -1,
        matrixAuthored: false,
        baseTranslation: new Float32Array(translation),
        baseRotation: new Float32Array(normalizedRotation),
        baseScale: new Float32Array(scale),
        localMatrix: composeTrs(identityMatrix(), translation, normalizedRotation, scale)
    };
};

const normalizeWeights = (weights, vertexCount) => {
    if (!weights) return null;
    if (weights.length !== vertexCount * 4) throw new Error('WEIGHTS_0 accessor must be VEC4');
    for (let vertex = 0; vertex < vertexCount; vertex++) {
        const offset = vertex * 4;
        let sum = 0;
        for (let component = 0; component < 4; component++) {
            const value = weights[offset + component];
            if (!Number.isFinite(value) || value < 0) throw new Error('Skin weights must be finite and non-negative');
            sum += value;
        }
        if (sum <= 1e-8) {
            weights[offset] = 1;
            weights[offset + 1] = 0;
            weights[offset + 2] = 0;
            weights[offset + 3] = 0;
        } else {
            const inverse = 1 / sum;
            for (let component = 0; component < 4; component++) weights[offset + component] *= inverse;
        }
    }
    return weights;
};

const animationDescriptors = (gltf, buffers, nodes, meshMorphCounts) => (gltf.animations ?? []).map((animation, clipIndex) => {
    const samplers = (animation.samplers ?? []).map((sampler, samplerIndex) => {
        if (!['STEP', 'LINEAR', 'CUBICSPLINE'].includes(sampler.interpolation ?? 'LINEAR')) {
            throw new Error(`Animation ${clipIndex} sampler ${samplerIndex} has an unsupported interpolation mode`);
        }
        const inputAccessor = checkedIndex(gltf.accessors ?? [], sampler.input, 'Animation input accessor');
        if (inputAccessor.componentType !== 5126 || inputAccessor.type !== 'SCALAR') {
            throw new Error(`Animation ${clipIndex} sampler ${samplerIndex} input must be a floating-point SCALAR accessor`);
        }
        const input = readAccessor(gltf, buffers, sampler.input, true);
        for (let key = 0; key < input.length; key++) {
            if (!Number.isFinite(input[key])) throw new Error(`Animation ${clipIndex} sampler ${samplerIndex} has a non-finite key time`);
            if (key > 0 && input[key] <= input[key - 1]) {
                throw new Error(`Animation ${clipIndex} sampler ${samplerIndex} key times must be strictly increasing`);
            }
        }
        return {
            index: samplerIndex,
            input,
            outputAccessorIndex: sampler.output,
            interpolation: sampler.interpolation ?? 'LINEAR'
        };
    });
    const targetKeys = new Set();
    const channels = (animation.channels ?? []).map((channel, channelIndex) => {
        const sampler = checkedIndex(samplers, channel.sampler, 'Animation sampler');
        const nodeIndex = channel.target?.node;
        const node = checkedIndex(nodes, nodeIndex, 'Animation target node');
        const path = channel.target?.path;
        if (!['translation', 'rotation', 'scale', 'weights'].includes(path)) {
            throw new Error(`Animation ${clipIndex} channel ${channelIndex} targets unsupported path "${path}"`);
        }
        if (node.matrixAuthored && path !== 'weights') {
            throw new Error(`Animation ${clipIndex} targets matrix-authored node ${nodeIndex}; animated nodes must use TRS`);
        }
        const targetKey = `${nodeIndex}:${path}`;
        if (targetKeys.has(targetKey)) throw new Error(`Animation ${clipIndex} has duplicate channels for node ${nodeIndex} ${path}`);
        targetKeys.add(targetKey);
        const outputAccessor = checkedIndex(gltf.accessors ?? [], sampler.outputAccessorIndex, 'Animation output accessor');
        let components;
        if (path === 'translation' || path === 'scale') {
            if (outputAccessor.type !== 'VEC3' || outputAccessor.componentType !== 5126) {
                throw new Error(`Animation ${clipIndex} ${path} output must be floating-point VEC3`);
            }
            components = 3;
        } else if (path === 'rotation') {
            if (outputAccessor.type !== 'VEC4' || outputAccessor.componentType !== 5126) {
                throw new Error(`Animation ${clipIndex} rotation output must be floating-point VEC4`);
            }
            components = 4;
        } else {
            if (outputAccessor.type !== 'SCALAR' || outputAccessor.componentType !== 5126) {
                throw new Error(`Animation ${clipIndex} weights output must be floating-point SCALAR`);
            }
            const morphCount = meshMorphCounts[node.mesh] ?? 0;
            if (morphCount === 0) throw new Error(`Animation ${clipIndex} weights target node ${nodeIndex} has no morph targets`);
            components = morphCount;
        }
        const output = readAccessor(gltf, buffers, sampler.outputAccessorIndex, true);
        const multiplier = sampler.interpolation === 'CUBICSPLINE' ? 3 : 1;
        if (output.length !== sampler.input.length * components * multiplier) {
            throw new Error(`Animation ${clipIndex} channel ${channelIndex} output size does not match its keyframes`);
        }
        if (output.some(value => !Number.isFinite(value))) throw new Error(`Animation ${clipIndex} channel ${channelIndex} output is non-finite`);
        return {
            index: channelIndex,
            samplerIndex: channel.sampler,
            nodeIndex,
            path,
            components,
            sampler: {
                input: sampler.input,
                output,
                components,
                interpolation: sampler.interpolation,
                rotation: path === 'rotation'
            }
        };
    });
    let startTime = Infinity;
    let endTime = -Infinity;
    for (const sampler of samplers) {
        if (sampler.input.length === 0) continue;
        startTime = Math.min(startTime, sampler.input[0]);
        endTime = Math.max(endTime, sampler.input[sampler.input.length - 1]);
    }
    if (!Number.isFinite(startTime)) startTime = endTime = 0;
    const targetMask = new Uint8Array(nodes.length);
    for (const channel of channels) {
        if (channel.path === 'translation') targetMask[channel.nodeIndex] |= 1;
        else if (channel.path === 'rotation') targetMask[channel.nodeIndex] |= 2;
        else if (channel.path === 'scale') targetMask[channel.nodeIndex] |= 4;
        else targetMask[channel.nodeIndex] |= 8;
    }
    return {
        index: clipIndex,
        name: animation.name || `Animation ${clipIndex}`,
        channels,
        samplers: samplers.map(sampler => ({
            index: sampler.index,
            input: sampler.input,
            outputAccessorIndex: sampler.outputAccessorIndex,
            interpolation: sampler.interpolation
        })),
        samplerCount: samplers.length,
        startTime,
        endTime,
        duration: Math.max(0, endTime - startTime),
        targetMask
    };
});

const textureInfo = (gltf, info, role) => {
    if (!info) return null;
    const texture = checkedIndex(gltf.textures ?? [], info.index, 'Texture');
    const transform = info.extensions?.KHR_texture_transform;
    const texCoord = transform?.texCoord ?? info.texCoord ?? 0;
    if (texCoord !== 0) throw new Error('TEXCOORD_1 material sampling is not implemented yet');
    return {
        textureIndex: info.index,
        imageIndex: texture.source,
        samplerIndex: texture.sampler,
        texCoord,
        role,
        offset: transform?.offset ?? [0, 0],
        scale: transform?.scale ?? [1, 1],
        rotation: transform?.rotation ?? 0,
        strength: info.scale ?? info.strength ?? 1
    };
};

const materialDescriptors = gltf => (gltf.materials ?? []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const alphaMode = material.alphaMode ?? 'OPAQUE';
    return {
        name: material.name || `material ${index}`,
        unlit: Boolean(material.extensions?.KHR_materials_unlit),
        baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1],
        metallicFactor: pbr.metallicFactor ?? 1,
        roughnessFactor: pbr.roughnessFactor ?? 1,
        emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
        alphaMode,
        alphaCutoff: material.alphaCutoff ?? 0.5,
        doubleSided: Boolean(material.doubleSided),
        textures: {
            baseColor: textureInfo(gltf, pbr.baseColorTexture, 'color'),
            metallicRoughness: textureInfo(gltf, pbr.metallicRoughnessTexture, 'data'),
            normal: textureInfo(gltf, material.normalTexture, 'data'),
            occlusion: textureInfo(gltf, material.occlusionTexture, 'data'),
            emissive: textureInfo(gltf, material.emissiveTexture, 'color')
        }
    };
});

export const parseGltf = async (source, options = {}) => {
    const {json: gltf, binaryChunk} = parseContainer(source);
    if (!gltf || typeof gltf !== 'object' || !String(gltf.asset?.version ?? '').startsWith('2')) {
        throw new Error('Only glTF 2.0 assets are supported');
    }
    if (options.selfContained) {
        for (const resource of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
            if (resource.uri !== undefined && !String(resource.uri).startsWith('data:')) {
                throw new Error('This model references external buffers or images. Export a GLB with embedded resources or a self-contained .gltf with data URIs.');
            }
        }
    }
    for (const extension of gltf.extensionsRequired ?? []) {
        if (!SUPPORTED_REQUIRED_EXTENSIONS.has(extension)) throw new Error(`Required glTF extension "${extension}" is unsupported`);
    }
    const buffers = [];
    for (let index = 0; index < (gltf.buffers ?? []).length; index++) {
        const descriptor = gltf.buffers[index];
        let bytes;
        if (descriptor.uri) {
            bytes = descriptor.uri.startsWith('data:') ? decodeDataUri(descriptor.uri).bytes :
                asUint8Array(await options.resolveBytes?.(descriptor.uri));
        } else {
            if (index !== 0 || !binaryChunk) throw new Error(`Buffer ${index} has no URI or GLB binary chunk`);
            bytes = binaryChunk;
        }
        if (bytes.byteLength < descriptor.byteLength) throw new Error(`Buffer ${index} is shorter than declared`);
        buffers.push(bytes);
    }
    const geometries = [];
    const meshMorphCounts = (gltf.meshes ?? []).map((mesh, meshIndex) => {
        const counts = (mesh.primitives ?? []).map(primitive => primitive.targets?.length ?? 0);
        const count = counts[0] ?? 0;
        if (counts.some(value => value !== count)) throw new Error(`Mesh ${meshIndex} primitives have inconsistent morph target counts`);
        if (mesh.weights !== undefined && (!Array.isArray(mesh.weights) || mesh.weights.length !== count ||
            mesh.weights.some(value => !Number.isFinite(value)))) {
            throw new Error(`Mesh ${meshIndex} has invalid default morph weights`);
        }
        return count;
    });
    const meshPrimitives = (gltf.meshes ?? []).map((mesh, meshIndex) => (mesh.primitives ?? []).map((primitive, primitiveIndex) => {
        if (primitive.attributes?.POSITION === undefined) throw new Error(`Mesh ${meshIndex} primitive ${primitiveIndex} has no POSITION accessor`);
        const positions = readAccessor(gltf, buffers, primitive.attributes.POSITION, true);
        if (positions.length % 3 !== 0) throw new Error('POSITION accessor must be VEC3');
        const vertexCount = positions.length / 3;
        let indices = null;
        if (primitive.indices !== undefined) {
            const indexAccessor = checkedIndex(gltf.accessors ?? [], primitive.indices, 'Accessor');
            if (indexAccessor.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indexAccessor.componentType)) {
                throw new Error(`Mesh ${meshIndex} primitive ${primitiveIndex} has an invalid index accessor`);
            }
            indices = Uint32Array.from(readAccessor(gltf, buffers, primitive.indices, false));
        }
        indices = primitiveIndices(primitive.mode, indices, vertexCount);
        const normals = primitive.attributes.NORMAL === undefined ? generateNormals(positions, indices) :
            readAccessor(gltf, buffers, primitive.attributes.NORMAL, true);
        const tangents = primitive.attributes.TANGENT === undefined ? null :
            readAccessor(gltf, buffers, primitive.attributes.TANGENT, true);
        const uvs = primitive.attributes.TEXCOORD_0 === undefined ? null :
            readAccessor(gltf, buffers, primitive.attributes.TEXCOORD_0, true);
        const uv1 = primitive.attributes.TEXCOORD_1 === undefined ? null :
            readAccessor(gltf, buffers, primitive.attributes.TEXCOORD_1, true);
        if (primitive.attributes.JOINTS_1 !== undefined || primitive.attributes.WEIGHTS_1 !== undefined) {
            throw new Error('JOINTS_1 / WEIGHTS_1 eight-influence skinning is not implemented');
        }
        const hasJoints = primitive.attributes.JOINTS_0 !== undefined;
        const hasWeights = primitive.attributes.WEIGHTS_0 !== undefined;
        if (hasJoints !== hasWeights) throw new Error('Skinned geometry must provide both JOINTS_0 and WEIGHTS_0');
        let joints = null;
        let weights = null;
        if (hasJoints) {
            const jointAccessor = checkedIndex(gltf.accessors ?? [], primitive.attributes.JOINTS_0, 'JOINTS_0 accessor');
            if (jointAccessor.type !== 'VEC4' || ![5121, 5123].includes(jointAccessor.componentType) || jointAccessor.normalized) {
                throw new Error('JOINTS_0 must be a non-normalized unsigned byte or unsigned short VEC4 accessor');
            }
            const weightAccessor = checkedIndex(gltf.accessors ?? [], primitive.attributes.WEIGHTS_0, 'WEIGHTS_0 accessor');
            const validWeights = weightAccessor.type === 'VEC4' && (
                weightAccessor.componentType === 5126 ||
                ([5121, 5123].includes(weightAccessor.componentType) && weightAccessor.normalized)
            );
            if (!validWeights) throw new Error('WEIGHTS_0 must be a float or normalized unsigned integer VEC4 accessor');
            joints = Float32Array.from(readAccessor(gltf, buffers, primitive.attributes.JOINTS_0, false));
            weights = normalizeWeights(readAccessor(gltf, buffers, primitive.attributes.WEIGHTS_0, true), vertexCount);
            if (joints.length !== vertexCount * 4) throw new Error('JOINTS_0 accessor must be VEC4');
        }
        let colors = primitive.attributes.COLOR_0 === undefined ? null :
            readAccessor(gltf, buffers, primitive.attributes.COLOR_0, true);
        if (colors && colors.length === vertexCount * 3) {
            const rgba = new Float32Array(vertexCount * 4);
            for (let vertex = 0; vertex < vertexCount; vertex++) {
                rgba.set(colors.subarray(vertex * 3, vertex * 3 + 3), vertex * 4);
                rgba[vertex * 4 + 3] = 1;
            }
            colors = rgba;
        }
        if (colors && colors.length !== vertexCount * 4) throw new Error('COLOR_0 accessor must be VEC3 or VEC4');
        const morphTargets = (primitive.targets ?? []).map((target, targetIndex) => {
            const descriptor = {};
            for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
                if (target[semantic] === undefined) continue;
                const accessor = checkedIndex(gltf.accessors ?? [], target[semantic], `Morph target ${targetIndex} ${semantic} accessor`);
                if (accessor.componentType !== 5126 || accessor.type !== 'VEC3' || accessor.count !== vertexCount) {
                    throw new Error(`Morph target ${targetIndex} ${semantic} must be a floating-point VEC3 matching the vertex count`);
                }
                descriptor[semantic.toLowerCase()] = readAccessor(gltf, buffers, target[semantic], true);
            }
            return descriptor;
        });
        const geometryIndex = geometries.length;
        geometries.push({
            key: `mesh:${meshIndex}:primitive:${primitiveIndex}`,
            positions,
            normals,
            tangents,
            uvs,
            uv1,
            colors,
            joints,
            weights,
            indices,
            morphTargets
        });
        return {
            geometryIndex,
            materialIndex: primitive.material ?? -1,
            morphTargetCount: morphTargets.length,
            defaultMorphWeights: new Float32Array(mesh.weights ?? new Array(morphTargets.length).fill(0))
        };
    }));
    const nodes = (gltf.nodes ?? []).map(nodeDescriptor);
    for (const node of nodes) {
        for (const childIndex of node.children) {
            const child = checkedIndex(nodes, childIndex, 'Child node');
            if (child.parent >= 0) throw new Error(`Node ${childIndex} has more than one parent`);
            child.parent = node.index;
        }
        if (node.mesh >= 0) checkedIndex(meshPrimitives, node.mesh, 'Mesh');
    }
    const skins = (gltf.skins ?? []).map((skin, skinIndex) => {
        if (!Array.isArray(skin.joints) || skin.joints.length === 0) throw new Error(`Skin ${skinIndex} must contain joints`);
        const uniqueJoints = new Set();
        for (const joint of skin.joints) {
            checkedIndex(nodes, joint, `Skin ${skinIndex} joint`);
            if (uniqueJoints.has(joint)) throw new Error(`Skin ${skinIndex} contains duplicate joint ${joint}`);
            uniqueJoints.add(joint);
        }
        if (skin.skeleton !== undefined) checkedIndex(nodes, skin.skeleton, `Skin ${skinIndex} skeleton`);
        let inverseBindMatrices = new Float32Array(skin.joints.length * 16);
        if (skin.inverseBindMatrices === undefined) {
            for (let joint = 0; joint < skin.joints.length; joint++) inverseBindMatrices.set(identityMatrix(), joint * 16);
        } else {
            const accessor = checkedIndex(gltf.accessors ?? [], skin.inverseBindMatrices, `Skin ${skinIndex} inverse bind accessor`);
            if (accessor.componentType !== 5126 || accessor.type !== 'MAT4' || accessor.count !== skin.joints.length) {
                throw new Error(`Skin ${skinIndex} inverse bind matrices must be floating-point MAT4 values matching its joints`);
            }
            inverseBindMatrices = readAccessor(gltf, buffers, skin.inverseBindMatrices, true);
            if (inverseBindMatrices.some(value => !Number.isFinite(value))) throw new Error(`Skin ${skinIndex} inverse bind matrices are non-finite`);
        }
        return {
            index: skinIndex,
            name: skin.name || `skin ${skinIndex}`,
            joints: Uint32Array.from(skin.joints),
            skeleton: skin.skeleton ?? -1,
            inverseBindMatrices
        };
    });
    for (const node of nodes) {
        if (node.skin >= 0) {
            checkedIndex(skins, node.skin, 'Skin');
            if (node.mesh < 0) throw new Error(`Node ${node.index} has a skin but no mesh`);
        }
    }
    const sceneIndex = gltf.scene ?? 0;
    const scene = checkedIndex(gltf.scenes ?? [{nodes: nodes.filter(node => node.parent < 0).map(node => node.index)}], sceneIndex, 'Scene');
    const active = new Set();
    const visited = new Set();
    const nodeOrder = [];
    const visit = index => {
        if (active.has(index)) throw new Error('Model node hierarchy contains a cycle');
        if (visited.has(index)) return;
        active.add(index);
        const node = checkedIndex(nodes, index, 'Scene node');
        visited.add(index);
        nodeOrder.push(index);
        for (const child of node.children) visit(child);
        active.delete(index);
    };
    for (const root of scene.nodes ?? []) visit(root);
    const sceneNodeOrder = [...nodeOrder];
    for (const node of nodes) if (node.parent < 0) visit(node.index);
    for (const node of nodes) visit(node.index);
    const primitives = [];
    for (const nodeIndex of sceneNodeOrder) {
        const node = nodes[nodeIndex];
        if (node.mesh < 0) continue;
        for (const primitive of meshPrimitives[node.mesh]) {
            const geometry = geometries[primitive.geometryIndex];
            if (node.skin >= 0 && !geometry.joints) throw new Error(`Skinned node ${nodeIndex} primitive is missing JOINTS_0 / WEIGHTS_0`);
            if (node.skin < 0 && geometry.joints) throw new Error(`Primitive with JOINTS_0 / WEIGHTS_0 is used by unskinned node ${nodeIndex}`);
            if (node.skin >= 0) {
                const jointCount = skins[node.skin].joints.length;
                for (const joint of geometry.joints) {
                    if (!Number.isInteger(joint) || joint < 0 || joint >= jointCount) {
                        throw new Error(`Skinned node ${nodeIndex} references joint palette index ${joint} outside skin ${node.skin}`);
                    }
                }
            }
            primitives.push({...primitive, nodeIndex, skinIndex: node.skin});
        }
    }
    const animations = animationDescriptors(gltf, buffers, nodes, meshMorphCounts);
    const images = (gltf.images ?? []).map((image, index) => {
        if (image.uri) {
            if (image.uri.startsWith('data:')) {
                const decoded = decodeDataUri(image.uri);
                return {index, mimeType: image.mimeType || decoded.mimeType, bytes: decoded.bytes, uri: ''};
            }
            return {index, mimeType: image.mimeType || '', bytes: null, uri: image.uri};
        }
        const view = checkedIndex(gltf.bufferViews ?? [], image.bufferView, 'Image buffer view');
        const buffer = checkedIndex(buffers, view.buffer, 'Buffer');
        const offset = view.byteOffset ?? 0;
        if (offset + view.byteLength > buffer.byteLength) throw new Error(`Image ${index} buffer view is out of bounds`);
        return {index, mimeType: image.mimeType || '', bytes: buffer.slice(offset, offset + view.byteLength), uri: ''};
    });
    return {
        generator: gltf.asset.generator ?? '',
        nodes,
        nodeOrder,
        primitives,
        skins,
        animations,
        geometries,
        morphTargetCount: geometries.reduce((sum, geometry) => sum + geometry.morphTargets.length, 0),
        materials: materialDescriptors(gltf),
        images,
        samplers: gltf.samplers ?? [],
        sceneCount: (gltf.scenes ?? []).length || 1,
        sourceJson: gltf
    };
};

export {decodeDataUri};
