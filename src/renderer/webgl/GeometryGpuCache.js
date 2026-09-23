import {GEOMETRY_VERTEX_STRIDE, SKIN_VERTEX_STRIDE} from '../../geometry/GeometryStore.js';

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

export const bindGeometryIndexBuffer = (gl, geometry) => {
    if (geometry.indexBuffer) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
};

const uploadIndices = (gl, buffer, data, usage, sameSize = false) => {
    const vao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    gl.bindVertexArray(null);
    const defaultIndex = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
    try {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        if (sameSize) gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, data);
        else gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
    } finally {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, defaultIndex);
        gl.bindVertexArray(vao);
    }
};

export class GeometryGpuCache {
    constructor(gl) {
        this.gl = gl;
        this.entries = new Map();
        this.uploads = 0;
        this.deletes = 0;
        this.gpuBytes = 0;
        this.dynamicUploads = 0;
        this.dynamicUploadBytes = 0;
        this.customUploads = 0;
    }

    get(resource) {
        if (resource.disposed) throw new Error('Cannot upload disposed geometry');
        let entry = this.entries.get(resource);
        if (entry) {
            if (entry.version !== (resource.version ?? 1)) this.#updateDynamic(entry, resource);
            return entry;
        }
        const gl = this.gl;
        const vertexBuffer = gl.createBuffer();
        const skinBuffer = resource.skinVertices ? gl.createBuffer() : null;
        const indexBuffer = resource.indices ? gl.createBuffer() : null;
        if (!vertexBuffer || (resource.skinVertices && !skinBuffer) || (resource.indices && !indexBuffer)) {
            if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
            if (skinBuffer) gl.deleteBuffer(skinBuffer);
            if (indexBuffer) gl.deleteBuffer(indexBuffer);
            throw new Error('Could not allocate geometry buffers');
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, resource.vertices, resource.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        if (skinBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, skinBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, resource.skinVertices, resource.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }
        if (indexBuffer) {
            // WebGL types a buffer from its first binding target, so an index buffer
            // cannot be initialized through COPY_WRITE_BUFFER and later used as an
            // element buffer. Bind the default VAO to keep lazy uploads from changing
            // a render-pass VAO, then let each pass attach the buffer explicitly.
            uploadIndices(gl, indexBuffer, resource.indices, resource.custom && resource.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }
        entry = {
            resource,
            vertexBuffer,
            skinBuffer,
            indexBuffer,
            vertexCount: resource.vertexCount,
            indexCount: resource.indexCount,
            triangleCount: resource.triangleCount,
            version: resource.version ?? 1,
            vertexVersion: resource.vertexVersion ?? 1,
            indexVersion: resource.indexVersion ?? 1,
            vertexBytes: resource.vertices.byteLength,
            skinBytes: resource.skinVertices?.byteLength ?? 0,
            indexBytes: resource.indices?.byteLength ?? 0,
            stride: GEOMETRY_VERTEX_STRIDE * FLOAT_SIZE,
            skinStride: SKIN_VERTEX_STRIDE * FLOAT_SIZE
        };
        this.entries.set(resource, entry);
        this.uploads++;
        if (resource.custom) this.customUploads++;
        this.gpuBytes += resource.vertices.byteLength + (resource.skinVertices?.byteLength ?? 0) + (resource.indices?.byteLength ?? 0);
        return entry;
    }

    sweep() {
        const disposed = [];
        for (const [resource, entry] of this.entries) {
            if (!resource.disposed) continue;
            this.#delete(entry);
            this.entries.delete(resource);
            disposed.push(resource);
        }
        return disposed;
    }

    dispose() {
        for (const entry of this.entries.values()) this.#delete(entry);
        this.entries.clear();
        this.gpuBytes = 0;
    }

    #delete(entry) {
        this.gl.deleteBuffer(entry.vertexBuffer);
        if (entry.skinBuffer) this.gl.deleteBuffer(entry.skinBuffer);
        if (entry.indexBuffer) this.gl.deleteBuffer(entry.indexBuffer);
        this.deletes++;
        this.gpuBytes -= entry.vertexBytes + entry.skinBytes + entry.indexBytes;
    }

    #updateDynamic(entry, resource) {
        if (!resource.dynamic) throw new Error(`Immutable geometry "${resource.key ?? resource.id}" changed after upload`);
        const gl = this.gl;
        // Allocate the only possible new sibling before mutating resident streams,
        // so a failed indexed transition leaves the old entry and byte count intact.
        if (resource.indices && !entry.indexBuffer) {
            const buffer = gl.createBuffer();
            if (!buffer) throw new Error('Could not allocate geometry index buffer');
            entry.indexBuffer = buffer;
        }
        let bytes = 0;
        const previousBytes = entry.vertexBytes + entry.skinBytes + entry.indexBytes;
        if (entry.vertexVersion !== resource.vertexVersion || !resource.custom) {
            gl.bindBuffer(gl.ARRAY_BUFFER, entry.vertexBuffer);
            if (resource.custom && entry.vertexBytes === resource.vertices.byteLength) gl.bufferSubData(gl.ARRAY_BUFFER, 0, resource.vertices);
            else gl.bufferData(gl.ARRAY_BUFFER, resource.vertices, gl.DYNAMIC_DRAW);
            entry.vertexBytes = resource.vertices.byteLength;
            bytes += entry.vertexBytes;
            if (entry.skinBuffer && resource.skinVertices) {
                gl.bindBuffer(gl.ARRAY_BUFFER, entry.skinBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, resource.skinVertices, gl.DYNAMIC_DRAW);
                entry.skinBytes = resource.skinVertices.byteLength;
                bytes += entry.skinBytes;
            }
            entry.vertexVersion = resource.vertexVersion;
        }
        if (entry.indexVersion !== (resource.indexVersion ?? 1)) {
            if (resource.indices) {
                uploadIndices(gl, entry.indexBuffer, resource.indices, gl.DYNAMIC_DRAW, entry.indexBytes === resource.indices.byteLength);
                entry.indexBytes = resource.indices.byteLength;
                bytes += entry.indexBytes;
            }
            // Retain an existing index allocation through non-indexed replacements;
            // VAOs can keep the same handle and submission uses indexCount.
            entry.indexVersion = resource.indexVersion ?? 1;
        }
        entry.vertexCount = resource.vertexCount;
        entry.indexCount = resource.indexCount;
        entry.triangleCount = resource.triangleCount;
        entry.version = resource.version;
        this.gpuBytes += entry.vertexBytes + entry.skinBytes + entry.indexBytes - previousBytes;
        if (!bytes) return;
        this.uploads++;
        if (resource.custom) this.customUploads++;
        this.dynamicUploads++;
        this.dynamicUploadBytes += bytes;
    }
}
