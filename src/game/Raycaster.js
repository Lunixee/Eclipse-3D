import {INSTANCE_STRIDE} from '../engine/InstanceGroup.js';
import {EffectKind, BillboardMode} from '../effects/EffectStore.js';
import {GEOMETRY_VERTEX_STRIDE} from '../geometry/GeometryStore.js';
import {composeEulerTrs, identityMatrix, invertMatrix} from '../models/modelMath.js';
import {basisFromEuler} from './CameraMath.js';

const EPSILON = 1e-8;
const LEAF_TRIANGLES = 8;

export const RaycastBackface = Object.freeze({BOTH: 'both', FRONT: 'front', BACK: 'back'});

const now = () => typeof performance === 'object' ? performance.now() : 0;

const normalizeDirection = (out, x, y, z) => {
    const length = Math.hypot(x, y, z);
    if (!(length > EPSILON) || !Number.isFinite(length)) {
        out.fill(0);
        return false;
    }
    out[0] = x / length;
    out[1] = y / length;
    out[2] = z / length;
    return true;
};

const transformPoint = (out, matrix, point) => {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
};

const transformVector = (out, matrix, vector) => {
    const x = vector[0];
    const y = vector[1];
    const z = vector[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
};

const transformNormal = (out, inverseMatrix, normal) => normalizeDirection(
    out,
    inverseMatrix[0] * normal[0] + inverseMatrix[1] * normal[1] + inverseMatrix[2] * normal[2],
    inverseMatrix[4] * normal[0] + inverseMatrix[5] * normal[1] + inverseMatrix[6] * normal[2],
    inverseMatrix[8] * normal[0] + inverseMatrix[9] * normal[1] + inverseMatrix[10] * normal[2]
);

const setMatrixFromInstance = (out, data, offset) =>
    composeEulerTrs(out, data, data, data, offset, offset + 3, offset + 6);

const triangleVertexIndex = (resource, triangle, corner) => resource.indices ?
    resource.indices[triangle * 3 + corner] : triangle * 3 + corner;

const positionComponent = (resource, vertex, axis) => resource.vertices[vertex * GEOMETRY_VERTEX_STRIDE + axis];

const quickSelect = (order, left, right, target, centroids, axis) => {
    while (left < right) {
        const pivotValue = centroids[order[(left + right) >> 1] * 3 + axis];
        let low = left;
        let high = right;
        while (low <= high) {
            while (centroids[order[low] * 3 + axis] < pivotValue) low++;
            while (centroids[order[high] * 3 + axis] > pivotValue) high--;
            if (low <= high) {
                const temporary = order[low];
                order[low] = order[high];
                order[high] = temporary;
                low++;
                high--;
            }
        }
        if (target <= high) right = high;
        else if (target >= low) left = low;
        else return;
    }
};

const buildGeometryAcceleration = resource => {
    const count = Math.floor(resource.triangleCount);
    const order = new Uint32Array(count);
    const minimum = new Float32Array(count * 3);
    const maximum = new Float32Array(count * 3);
    const centroids = new Float32Array(count * 3);
    for (let triangle = 0; triangle < count; triangle++) {
        order[triangle] = triangle;
        const a = triangleVertexIndex(resource, triangle, 0);
        const b = triangleVertexIndex(resource, triangle, 1);
        const c = triangleVertexIndex(resource, triangle, 2);
        for (let axis = 0; axis < 3; axis++) {
            const av = positionComponent(resource, a, axis);
            const bv = positionComponent(resource, b, axis);
            const cv = positionComponent(resource, c, axis);
            minimum[triangle * 3 + axis] = Math.min(av, bv, cv);
            maximum[triangle * 3 + axis] = Math.max(av, bv, cv);
            centroids[triangle * 3 + axis] = (av + bv + cv) / 3;
        }
    }
    const nodes = [];
    const build = (start, triangleCount) => {
        const index = nodes.length;
        const node = {
            minimum: new Float32Array([Infinity, Infinity, Infinity]),
            maximum: new Float32Array([-Infinity, -Infinity, -Infinity]),
            left: -1,
            right: -1,
            start,
            count: triangleCount
        };
        nodes.push(node);
        const centroidMinimum = [Infinity, Infinity, Infinity];
        const centroidMaximum = [-Infinity, -Infinity, -Infinity];
        for (let offset = start; offset < start + triangleCount; offset++) {
            const triangle = order[offset];
            for (let axis = 0; axis < 3; axis++) {
                node.minimum[axis] = Math.min(node.minimum[axis], minimum[triangle * 3 + axis]);
                node.maximum[axis] = Math.max(node.maximum[axis], maximum[triangle * 3 + axis]);
                centroidMinimum[axis] = Math.min(centroidMinimum[axis], centroids[triangle * 3 + axis]);
                centroidMaximum[axis] = Math.max(centroidMaximum[axis], centroids[triangle * 3 + axis]);
            }
        }
        if (triangleCount <= LEAF_TRIANGLES) return index;
        let axis = 0;
        if (centroidMaximum[1] - centroidMinimum[1] > centroidMaximum[axis] - centroidMinimum[axis]) axis = 1;
        if (centroidMaximum[2] - centroidMinimum[2] > centroidMaximum[axis] - centroidMinimum[axis]) axis = 2;
        if (!(centroidMaximum[axis] - centroidMinimum[axis] > EPSILON)) return index;
        const leftCount = triangleCount >> 1;
        quickSelect(order, start, start + triangleCount - 1, start + leftCount, centroids, axis);
        node.count = 0;
        node.left = build(start, leftCount);
        node.right = build(start + leftCount, triangleCount - leftCount);
        return index;
    };
    if (count > 0) build(0, count);
    return {resource, version: resource.positionVersion ?? resource.version ?? 1, order, nodes};
};

const createResult = () => ({
    hit: false,
    distance: 0,
    name: '',
    kind: '',
    nodeName: '',
    x: 0,
    y: 0,
    z: 0,
    normalX: 0,
    normalY: 0,
    normalZ: 0,
    triangleIndex: -1,
    primitiveIndex: -1,
    geometryId: -1,
    materialName: '',
    precision: 'none'
});

export class Raycaster {
    constructor(scene) {
        this.scene = scene;
        /** @type {'both' | 'front' | 'back'} */
        this.backface = RaycastBackface.BOTH;
        this.result = createResult();
        this.origin = new Float32Array(3);
        this.direction = new Float32Array(3);
        this.localOrigin = new Float32Array(3);
        this.localDirection = new Float32Array(3);
        this.localNormal = new Float32Array(3);
        this.geometricNormal = new Float32Array(3);
        this.worldNormal = new Float32Array(3);
        this.hitPoint = new Float32Array(3);
        this.matrix = identityMatrix();
        this.inverseMatrix = identityMatrix();
        this.spriteRight = new Float32Array(3);
        this.spriteUp = new Float32Array(3);
        this.spriteNormal = new Float32Array(3);
        this.cameraBasis = {
            right: new Float32Array(3),
            up: new Float32Array(3),
            forward: new Float32Array(3)
        };
        this.cameraPosition = new Float32Array(3);
        this.candidates = [];
        this.stack = [];
        this.geometryAcceleration = new WeakMap();
        this.accelerationBuilds = 0;
        this.triangleHit = {t: 0, u: 0, v: 0};
        this.geometryHit = {t: 0, triangleIndex: -1, normal: this.worldNormal};
        this.aabbHit = {t: 0, normalX: 0, normalY: 0, normalZ: 0};
        this.descriptor = {name: '', kind: ''};
        this.cameraRay = {origin: this.origin, direction: this.direction, valid: false};
        this.filterMode = 'all';
        this.filterValue = '';
        this.metrics = this.#newMetrics();
    }

    setBackfacePolicy(policy) {
        const normalized = String(policy).trim().toLowerCase();
        if (!['both', 'front', 'back'].includes(normalized)) throw new Error(`Unknown ray backface policy "${policy}"`);
        this.backface = /** @type {'both' | 'front' | 'back'} */ (normalized);
    }

    cast(originX, originY, originZ, directionX, directionY, directionZ, maximumDistance = 1000, filter = 'all') {
        const started = now();
        this.#resetResult();
        this.metrics.raycasts++;
        this.origin[0] = Number(originX) || 0;
        this.origin[1] = Number(originY) || 0;
        this.origin[2] = Number(originZ) || 0;
        const maximum = Number(maximumDistance);
        const limit = Number.isFinite(maximum) ? Math.max(0, maximum) : 1000;
        this.#setFilter(filter);
        if (!normalizeDirection(this.direction, Number(directionX), Number(directionY), Number(directionZ))) {
            this.metrics.raycastMilliseconds += started ? now() - started : 0;
            return this.result;
        }
        const query = this.scene.visibility.queryRay(this.origin, this.direction, limit, this.candidates);
        this.metrics.spatialPath = Math.max(this.metrics.spatialPath, query.spatialPath);
        this.metrics.broadPhaseCandidates += this.candidates.length;
        let nearest = limit;
        for (const candidate of this.candidates) {
            const descriptor = this.#descriptor(candidate);
            if (!descriptor || !this.#filterAllows(descriptor.name, descriptor.kind)) continue;
            this.metrics.boundsTests++;
            if (!this.#intersectBounds(candidate.bounds, this.origin, this.direction, nearest)) continue;
            const distance = this.#intersectCandidate(candidate, descriptor, nearest);
            if (distance >= 0 && distance <= nearest) nearest = distance;
        }
        this.metrics.raycastMilliseconds += started ? now() - started : 0;
        if (this.result.hit) this.metrics.hits++;
        return this.result;
    }

    castFromCamera(stageX, stageY, stageWidth, stageHeight, cameraName = '', maximumDistance = 1000, filter = 'all') {
        const cameraId = cameraName ? this.scene.requireCamera(cameraName) : this.scene.activeCameraId;
        if (cameraId === null) throw new Error('Create and activate a camera before picking');
        const ray = this.scene.cameraMatrices(cameraId, stageWidth, stageHeight).stageToRay(
            stageX,
            stageY,
            stageWidth,
            stageHeight,
            this.cameraRay
        );
        if (!ray.valid) return this.cast(0, 0, 0, 0, 0, 0, maximumDistance, filter);
        return this.cast(
            ray.origin[0], ray.origin[1], ray.origin[2],
            ray.direction[0], ray.direction[1], ray.direction[2],
            maximumDistance, filter
        );
    }

    resetMetrics() {
        const metrics = this.metrics;
        metrics.raycasts = 0;
        metrics.broadPhaseCandidates = 0;
        metrics.boundsTests = 0;
        metrics.triangleTests = 0;
        metrics.exactHits = 0;
        metrics.hits = 0;
        metrics.raycastMilliseconds = 0;
        metrics.spatialPath = 0;
    }

    #setFilter(filter) {
        const normalized = String(filter ?? 'all').trim().toLowerCase();
        if (!normalized || normalized === 'all') {
            this.filterMode = 'all';
            this.filterValue = '';
        } else if (normalized.startsWith('name:')) {
            this.filterMode = 'name';
            this.filterValue = normalized.slice(5).trim();
        } else if (normalized.startsWith('type:')) {
            this.filterMode = 'type';
            this.filterValue = normalized.slice(5).trim();
        } else {
            this.filterMode = 'name';
            this.filterValue = normalized;
        }
    }

    #filterAllows(name, kind) {
        if (this.filterMode === 'all') return true;
        if (this.filterMode === 'name') return name.toLowerCase() === this.filterValue;
        return kind === this.filterValue || (this.filterValue === 'cube' && kind === 'cube-instance');
    }

    #descriptor(candidate) {
        const descriptor = this.descriptor;
        if (candidate.kind === 'object') {
            descriptor.name = this.scene.objects.namesById[candidate.owner];
            descriptor.kind = 'cube';
            return descriptor;
        }
        if (candidate.kind === 'group') {
            descriptor.name = candidate.owner.name;
            descriptor.kind = 'cube-instance';
            return descriptor;
        }
        if (candidate.kind === 'model' || candidate.kind === 'terrain') {
            descriptor.name = candidate.owner.name;
            descriptor.kind = candidate.kind;
            return descriptor;
        }
        if (candidate.kind === 'effect') {
            const effect = candidate.owner;
            descriptor.name = effect.name;
            descriptor.kind = effect.semanticKind === 'text' ? 'text' : effect.kind;
            return descriptor;
        }
        return null;
    }

    #intersectCandidate(candidate, descriptor, maximum) {
        if (candidate.kind === 'object') {
            const id = candidate.owner;
            const offset = id * 3;
            composeEulerTrs(
                this.matrix,
                this.scene.objects.position,
                this.scene.objects.rotation,
                this.scene.objects.scale,
                offset,
                offset,
                offset
            );
            return this.#intersectCube(this.matrix, descriptor, maximum, this.scene.objects.materialIds[id]);
        }
        if (candidate.kind === 'group') {
            const group = candidate.owner;
            setMatrixFromInstance(this.matrix, group.data, candidate.itemIndex * INSTANCE_STRIDE);
            return this.#intersectCube(this.matrix, descriptor, maximum, group.materialId, candidate.itemIndex);
        }
        if (candidate.kind === 'model' || candidate.kind === 'terrain') {
            return this.#intersectModel(candidate.owner, descriptor, maximum);
        }
        if (candidate.kind === 'effect') return this.#intersectEffect(candidate.owner, descriptor, maximum);
        return -1;
    }

    #intersectCube(matrix, descriptor, maximum, materialId, primitiveIndex = -1) {
        if (!invertMatrix(this.inverseMatrix, matrix)) return -1;
        transformPoint(this.localOrigin, this.inverseMatrix, this.origin);
        transformVector(this.localDirection, this.inverseMatrix, this.direction);
        if (!this.#intersectAabbValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
            this.localOrigin, this.localDirection, maximum)) return -1;
        this.localNormal[0] = this.aabbHit.normalX;
        this.localNormal[1] = this.aabbHit.normalY;
        this.localNormal[2] = this.aabbHit.normalZ;
        transformNormal(this.worldNormal, this.inverseMatrix, this.localNormal);
        if (!this.#backfaceAllowed(this.worldNormal)) return -1;
        this.metrics.exactHits++;
        this.#recordHit(this.aabbHit.t, descriptor, {
            normal: this.worldNormal,
            primitiveIndex,
            geometryId: this.scene.models?.geometry?.cube?.id ?? -1,
            materialId,
            precision: 'primitive'
        });
        return this.aabbHit.t;
    }

    #intersectModel(model, descriptor, maximum) {
        let nearest = maximum;
        let found = -1;
        const items = model.activeRenderItems;
        for (let primitiveIndex = 0; primitiveIndex < items.length; primitiveIndex++) {
            const item = items[primitiveIndex];
            this.metrics.boundsTests++;
            if (!this.#intersectBounds(item.bounds, this.origin, this.direction, nearest)) continue;
            if (item.skinIndex >= 0) {
                const distance = this.aabbHit.t;
                this.worldNormal[0] = this.aabbHit.normalX;
                this.worldNormal[1] = this.aabbHit.normalY;
                this.worldNormal[2] = this.aabbHit.normalZ;
                this.#recordHit(distance, descriptor, {
                    normal: this.worldNormal,
                    primitiveIndex,
                    geometryId: item.primitive.geometryId,
                    materialId: model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId,
                    nodeName: model.activeRenderAsset.nodes[item.primitive.nodeIndex]?.name ?? '',
                    precision: 'bounds'
                });
                nearest = distance;
                found = distance;
                continue;
            }
            const resource = this.scene.models?.geometry?.resourceForId(item.primitive.geometryId);
            if (!resource || !invertMatrix(this.inverseMatrix, item.matrix)) continue;
            transformPoint(this.localOrigin, this.inverseMatrix, this.origin);
            transformVector(this.localDirection, this.inverseMatrix, this.direction);
            const hit = this.#intersectGeometry(resource, nearest);
            if (!hit) continue;
            this.#recordHit(hit.t, descriptor, {
                normal: hit.normal,
                triangleIndex: hit.triangleIndex,
                primitiveIndex,
                geometryId: resource.id,
                materialId: model.materialOverrideId >= 0 ? model.materialOverrideId : item.primitive.materialId,
                nodeName: model.activeRenderAsset.nodes[item.primitive.nodeIndex]?.name ?? '',
                precision: 'triangle'
            });
            nearest = hit.t;
            found = hit.t;
        }
        return found;
    }

    #intersectGeometry(resource, maximum) {
        let acceleration = this.geometryAcceleration.get(resource);
        if (!acceleration || acceleration.version !== (resource.positionVersion ?? resource.version ?? 1)) {
            acceleration = buildGeometryAcceleration(resource);
            this.geometryAcceleration.set(resource, acceleration);
            this.accelerationBuilds++;
        }
        if (acceleration.nodes.length === 0) return null;
        this.stack.length = 0;
        this.stack.push(0);
        let nearest = maximum;
        let triangleIndex = -1;
        let hitU = 0;
        let hitV = 0;
        while (this.stack.length > 0) {
            const node = acceleration.nodes[this.stack.pop()];
            this.metrics.boundsTests++;
            if (!this.#intersectAabbValues(
                node.minimum[0], node.minimum[1], node.minimum[2],
                node.maximum[0], node.maximum[1], node.maximum[2],
                this.localOrigin, this.localDirection, nearest
            )) continue;
            if (node.count === 0) {
                this.stack.push(node.left, node.right);
                continue;
            }
            for (let offset = node.start; offset < node.start + node.count; offset++) {
                const triangle = acceleration.order[offset];
                this.metrics.triangleTests++;
                if (!this.#intersectTriangle(resource, triangle, nearest)) continue;
                if (!this.#triangleBackfaceAllowed(resource, triangle)) continue;
                nearest = this.triangleHit.t;
                triangleIndex = triangle;
                hitU = this.triangleHit.u;
                hitV = this.triangleHit.v;
            }
        }
        if (triangleIndex < 0) return null;
        const a = triangleVertexIndex(resource, triangleIndex, 0);
        const b = triangleVertexIndex(resource, triangleIndex, 1);
        const c = triangleVertexIndex(resource, triangleIndex, 2);
        const ax = positionComponent(resource, a, 0);
        const ay = positionComponent(resource, a, 1);
        const az = positionComponent(resource, a, 2);
        const bx = positionComponent(resource, b, 0);
        const by = positionComponent(resource, b, 1);
        const bz = positionComponent(resource, b, 2);
        const cx = positionComponent(resource, c, 0);
        const cy = positionComponent(resource, c, 1);
        const cz = positionComponent(resource, c, 2);
        this.geometricNormal[0] = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
        this.geometricNormal[1] = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        this.geometricNormal[2] = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        transformNormal(this.worldNormal, this.inverseMatrix, this.geometricNormal);
        if (!this.#backfaceAllowed(this.worldNormal)) return null;
        const weightA = 1 - hitU - hitV;
        const normalOffsetA = a * GEOMETRY_VERTEX_STRIDE + 3;
        const normalOffsetB = b * GEOMETRY_VERTEX_STRIDE + 3;
        const normalOffsetC = c * GEOMETRY_VERTEX_STRIDE + 3;
        this.localNormal[0] = resource.vertices[normalOffsetA] * weightA +
            resource.vertices[normalOffsetB] * hitU + resource.vertices[normalOffsetC] * hitV;
        this.localNormal[1] = resource.vertices[normalOffsetA + 1] * weightA +
            resource.vertices[normalOffsetB + 1] * hitU + resource.vertices[normalOffsetC + 1] * hitV;
        this.localNormal[2] = resource.vertices[normalOffsetA + 2] * weightA +
            resource.vertices[normalOffsetB + 2] * hitU + resource.vertices[normalOffsetC + 2] * hitV;
        if (!transformNormal(this.worldNormal, this.inverseMatrix, this.localNormal)) {
            transformNormal(this.worldNormal, this.inverseMatrix, this.geometricNormal);
        }
        this.metrics.exactHits++;
        this.geometryHit.t = nearest;
        this.geometryHit.triangleIndex = triangleIndex;
        return this.geometryHit;
    }

    #triangleBackfaceAllowed(resource, triangle) {
        if (this.backface === RaycastBackface.BOTH) return true;
        const a = triangleVertexIndex(resource, triangle, 0);
        const b = triangleVertexIndex(resource, triangle, 1);
        const c = triangleVertexIndex(resource, triangle, 2);
        const ax = positionComponent(resource, a, 0);
        const ay = positionComponent(resource, a, 1);
        const az = positionComponent(resource, a, 2);
        const edge1X = positionComponent(resource, b, 0) - ax;
        const edge1Y = positionComponent(resource, b, 1) - ay;
        const edge1Z = positionComponent(resource, b, 2) - az;
        const edge2X = positionComponent(resource, c, 0) - ax;
        const edge2Y = positionComponent(resource, c, 1) - ay;
        const edge2Z = positionComponent(resource, c, 2) - az;
        this.geometricNormal[0] = edge1Y * edge2Z - edge1Z * edge2Y;
        this.geometricNormal[1] = edge1Z * edge2X - edge1X * edge2Z;
        this.geometricNormal[2] = edge1X * edge2Y - edge1Y * edge2X;
        transformNormal(this.worldNormal, this.inverseMatrix, this.geometricNormal);
        return this.#backfaceAllowed(this.worldNormal);
    }

    #intersectTriangle(resource, triangle, maximum) {
        const a = triangleVertexIndex(resource, triangle, 0);
        const b = triangleVertexIndex(resource, triangle, 1);
        const c = triangleVertexIndex(resource, triangle, 2);
        const ax = positionComponent(resource, a, 0);
        const ay = positionComponent(resource, a, 1);
        const az = positionComponent(resource, a, 2);
        const edge1X = positionComponent(resource, b, 0) - ax;
        const edge1Y = positionComponent(resource, b, 1) - ay;
        const edge1Z = positionComponent(resource, b, 2) - az;
        const edge2X = positionComponent(resource, c, 0) - ax;
        const edge2Y = positionComponent(resource, c, 1) - ay;
        const edge2Z = positionComponent(resource, c, 2) - az;
        const px = this.localDirection[1] * edge2Z - this.localDirection[2] * edge2Y;
        const py = this.localDirection[2] * edge2X - this.localDirection[0] * edge2Z;
        const pz = this.localDirection[0] * edge2Y - this.localDirection[1] * edge2X;
        const determinant = edge1X * px + edge1Y * py + edge1Z * pz;
        if (Math.abs(determinant) < EPSILON) return false;
        const inverse = 1 / determinant;
        const tx = this.localOrigin[0] - ax;
        const ty = this.localOrigin[1] - ay;
        const tz = this.localOrigin[2] - az;
        const u = (tx * px + ty * py + tz * pz) * inverse;
        if (u < -EPSILON || u > 1 + EPSILON) return false;
        const qx = ty * edge1Z - tz * edge1Y;
        const qy = tz * edge1X - tx * edge1Z;
        const qz = tx * edge1Y - ty * edge1X;
        const v = (this.localDirection[0] * qx + this.localDirection[1] * qy + this.localDirection[2] * qz) * inverse;
        if (v < -EPSILON || u + v > 1 + EPSILON) return false;
        const distance = (edge2X * qx + edge2Y * qy + edge2Z * qz) * inverse;
        if (distance < EPSILON || distance > maximum) return false;
        this.triangleHit.t = distance;
        this.triangleHit.u = u;
        this.triangleHit.v = v;
        return true;
    }

    #intersectEffect(effect, descriptor, maximum) {
        if (effect.kind === EffectKind.PARTICLE_EMITTER) {
            this.worldNormal[0] = this.aabbHit.normalX;
            this.worldNormal[1] = this.aabbHit.normalY;
            this.worldNormal[2] = this.aabbHit.normalZ;
            this.#recordHit(this.aabbHit.t, descriptor, {normal: this.worldNormal, precision: 'bounds'});
            return this.aabbHit.t;
        }
        const objects = this.scene.objects;
        const camera = this.scene.activeCameraId;
        if (camera === null) return -1;
        const cameraOffset = camera * 3;
        basisFromEuler(objects.rotation, cameraOffset, this.cameraBasis);
        this.cameraPosition[0] = objects.position[cameraOffset];
        this.cameraPosition[1] = objects.position[cameraOffset + 1];
        this.cameraPosition[2] = objects.position[cameraOffset + 2];
        this.#billboardBasis(effect, this.cameraPosition, this.cameraBasis.right, this.cameraBasis.up);
        this.spriteNormal[0] = this.spriteRight[1] * this.spriteUp[2] - this.spriteRight[2] * this.spriteUp[1];
        this.spriteNormal[1] = this.spriteRight[2] * this.spriteUp[0] - this.spriteRight[0] * this.spriteUp[2];
        this.spriteNormal[2] = this.spriteRight[0] * this.spriteUp[1] - this.spriteRight[1] * this.spriteUp[0];
        normalizeDirection(this.spriteNormal, this.spriteNormal[0], this.spriteNormal[1], this.spriteNormal[2]);
        const offset = effect.surfaceOffset ?? 0;
        const planeX = effect.position[0] + this.spriteNormal[0] * offset;
        const planeY = effect.position[1] + this.spriteNormal[1] * offset;
        const planeZ = effect.position[2] + this.spriteNormal[2] * offset;
        const denominator = this.direction[0] * this.spriteNormal[0] + this.direction[1] * this.spriteNormal[1] +
            this.direction[2] * this.spriteNormal[2];
        if (Math.abs(denominator) < EPSILON) return -1;
        const distance = ((planeX - this.origin[0]) * this.spriteNormal[0] +
            (planeY - this.origin[1]) * this.spriteNormal[1] +
            (planeZ - this.origin[2]) * this.spriteNormal[2]) / denominator;
        if (distance < EPSILON || distance > maximum) return -1;
        this.hitPoint[0] = this.origin[0] + this.direction[0] * distance - planeX;
        this.hitPoint[1] = this.origin[1] + this.direction[1] * distance - planeY;
        this.hitPoint[2] = this.origin[2] + this.direction[2] * distance - planeZ;
        const localX = this.hitPoint[0] * this.spriteRight[0] + this.hitPoint[1] * this.spriteRight[1] + this.hitPoint[2] * this.spriteRight[2];
        const localY = this.hitPoint[0] * this.spriteUp[0] + this.hitPoint[1] * this.spriteUp[1] + this.hitPoint[2] * this.spriteUp[2];
        if (localX < -effect.pivot[0] * effect.size[0] - EPSILON ||
            localX > (1 - effect.pivot[0]) * effect.size[0] + EPSILON ||
            localY < -effect.pivot[1] * effect.size[1] - EPSILON ||
            localY > (1 - effect.pivot[1]) * effect.size[1] + EPSILON) return -1;
        if (denominator > 0) {
            this.worldNormal[0] = -this.spriteNormal[0];
            this.worldNormal[1] = -this.spriteNormal[1];
            this.worldNormal[2] = -this.spriteNormal[2];
        } else this.worldNormal.set(this.spriteNormal);
        if (!this.#backfaceAllowed(this.spriteNormal)) return -1;
        this.metrics.exactHits++;
        this.#recordHit(distance, descriptor, {normal: this.worldNormal, precision: 'sprite-plane'});
        return distance;
    }

    #billboardBasis(effect, cameraPosition, cameraRight, cameraUp) {
        if (effect.billboardMode === BillboardMode.FIXED) {
            normalizeDirection(this.spriteRight, effect.right[0], effect.right[1], effect.right[2]);
            normalizeDirection(this.spriteUp, effect.up[0], effect.up[1], effect.up[2]);
        } else if (effect.billboardMode === BillboardMode.SCREEN_ALIGNED) {
            this.spriteRight.set(cameraRight);
            this.spriteUp.set(cameraUp);
        } else {
            let forwardX = cameraPosition[0] - effect.position[0];
            let forwardY = effect.billboardMode === BillboardMode.Y_AXIS ? 0 : cameraPosition[1] - effect.position[1];
            let forwardZ = cameraPosition[2] - effect.position[2];
            const length = Math.hypot(forwardX, forwardY, forwardZ);
            if (length > EPSILON) {
                forwardX /= length;
                forwardY /= length;
                forwardZ /= length;
            } else {
                forwardX = -cameraRight[2];
                forwardY = 0;
                forwardZ = cameraRight[0];
            }
            normalizeDirection(this.spriteRight, forwardZ, 0, -forwardX);
            if (effect.billboardMode === BillboardMode.Y_AXIS) {
                this.spriteUp[0] = 0;
                this.spriteUp[1] = 1;
                this.spriteUp[2] = 0;
            }
            else normalizeDirection(
                this.spriteUp,
                forwardY * this.spriteRight[2] - forwardZ * this.spriteRight[1],
                forwardZ * this.spriteRight[0] - forwardX * this.spriteRight[2],
                forwardX * this.spriteRight[1] - forwardY * this.spriteRight[0]
            );
        }
        const sine = Math.sin(effect.roll);
        const cosine = Math.cos(effect.roll);
        const rx = this.spriteRight[0];
        const ry = this.spriteRight[1];
        const rz = this.spriteRight[2];
        const ux = this.spriteUp[0];
        const uy = this.spriteUp[1];
        const uz = this.spriteUp[2];
        this.spriteRight[0] = rx * cosine + ux * sine;
        this.spriteRight[1] = ry * cosine + uy * sine;
        this.spriteRight[2] = rz * cosine + uz * sine;
        this.spriteUp[0] = ux * cosine - rx * sine;
        this.spriteUp[1] = uy * cosine - ry * sine;
        this.spriteUp[2] = uz * cosine - rz * sine;
    }

    #intersectBounds(bounds, origin, direction, maximum) {
        if (!bounds?.valid) return false;
        return this.#intersectAabbValues(
            bounds.minimum[0], bounds.minimum[1], bounds.minimum[2],
            bounds.maximum[0], bounds.maximum[1], bounds.maximum[2],
            origin, direction, maximum
        );
    }

    #intersectAabbValues(minimumX, minimumY, minimumZ, maximumX, maximumY, maximumZ, origin, direction, maximum) {
        let near = -Infinity;
        let far = Infinity;
        let nearAxis = -1;
        let nearSign = 0;
        let farAxis = -1;
        let farSign = 0;
        for (let axis = 0; axis < 3; axis++) {
            const minimum = axis === 0 ? minimumX : axis === 1 ? minimumY : minimumZ;
            const upper = axis === 0 ? maximumX : axis === 1 ? maximumY : maximumZ;
            if (Math.abs(direction[axis]) < EPSILON) {
                if (origin[axis] < minimum || origin[axis] > upper) return false;
                continue;
            }
            let first = (minimum - origin[axis]) / direction[axis];
            let second = (upper - origin[axis]) / direction[axis];
            let firstSign = -1;
            let secondSign = 1;
            if (first > second) {
                const firstValue = first;
                first = second;
                second = firstValue;
                const signValue = firstSign;
                firstSign = secondSign;
                secondSign = signValue;
            }
            if (first > near) {
                near = first;
                nearAxis = axis;
                nearSign = firstSign;
            }
            if (second < far) {
                far = second;
                farAxis = axis;
                farSign = secondSign;
            }
            if (near > far) return false;
        }
        if (far < 0 || near > maximum) return false;
        const useNear = near >= 0;
        const distance = useNear ? near : far;
        if (distance < 0 || distance > maximum) return false;
        const axis = useNear ? nearAxis : farAxis;
        const sign = useNear ? nearSign : farSign;
        this.aabbHit.t = distance;
        this.aabbHit.normalX = axis === 0 ? sign : 0;
        this.aabbHit.normalY = axis === 1 ? sign : 0;
        this.aabbHit.normalZ = axis === 2 ? sign : 0;
        return true;
    }

    #backfaceAllowed(normal) {
        if (this.backface === RaycastBackface.BOTH) return true;
        const facing = this.direction[0] * normal[0] + this.direction[1] * normal[1] + this.direction[2] * normal[2];
        return this.backface === RaycastBackface.FRONT ? facing < 0 : facing > 0;
    }

    #recordHit(distance, descriptor, details) {
        const result = this.result;
        result.hit = true;
        result.distance = distance;
        result.name = descriptor.name;
        result.kind = descriptor.kind;
        result.nodeName = details.nodeName ?? '';
        result.x = this.origin[0] + this.direction[0] * distance;
        result.y = this.origin[1] + this.direction[1] * distance;
        result.z = this.origin[2] + this.direction[2] * distance;
        result.normalX = details.normal?.[0] ?? 0;
        result.normalY = details.normal?.[1] ?? 0;
        result.normalZ = details.normal?.[2] ?? 0;
        result.triangleIndex = details.triangleIndex ?? -1;
        result.primitiveIndex = details.primitiveIndex ?? -1;
        result.geometryId = details.geometryId ?? -1;
        result.materialName = details.materialId >= 0 ? this.scene.materials.resourceForId(details.materialId)?.name ?? '' : '';
        result.precision = details.precision;
    }

    #resetResult() {
        const result = this.result;
        result.hit = false;
        result.distance = 0;
        result.name = '';
        result.kind = '';
        result.nodeName = '';
        result.x = 0;
        result.y = 0;
        result.z = 0;
        result.normalX = 0;
        result.normalY = 0;
        result.normalZ = 0;
        result.triangleIndex = -1;
        result.primitiveIndex = -1;
        result.geometryId = -1;
        result.materialName = '';
        result.precision = 'none';
    }

    #newMetrics() {
        return {
            raycasts: 0,
            broadPhaseCandidates: 0,
            boundsTests: 0,
            triangleTests: 0,
            exactHits: 0,
            hits: 0,
            raycastMilliseconds: 0,
            spatialPath: 0
        };
    }
}
