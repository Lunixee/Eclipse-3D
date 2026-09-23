const now = () => typeof performance === 'object' ? performance.now() : 0;

export class LooseSpatialGrid {
    constructor(cellSize = 32, maximumCellsPerEntry = 64) {
        if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error('Spatial cell size must be positive and finite');
        this.cellSize = cellSize;
        this.maximumCellsPerEntry = maximumCellsPerEntry;
        this.cells = new Map();
        this.entries = new Set();
        this.oversized = new Set();
        this.queryStamp = 0;
        this.updates = 0;
        this.rebuilds = 0;
        this.queries = 0;
        this.lastQueryTime = 0;
        this.lastRayQueryTime = 0;
        this.lastRayCells = 0;
        this.queryMinimum = new Float32Array(3);
        this.queryMaximum = new Float32Array(3);
    }

    update(entry) {
        if (!Array.isArray(entry.gridCells)) entry.gridCells = [];
        if (!entry.bounds?.valid) {
            this.remove(entry);
            return;
        }
        const minimumX = Math.floor(entry.bounds.minimum[0] / this.cellSize);
        const minimumY = Math.floor(entry.bounds.minimum[1] / this.cellSize);
        const minimumZ = Math.floor(entry.bounds.minimum[2] / this.cellSize);
        const maximumX = Math.floor(entry.bounds.maximum[0] / this.cellSize);
        const maximumY = Math.floor(entry.bounds.maximum[1] / this.cellSize);
        const maximumZ = Math.floor(entry.bounds.maximum[2] / this.cellSize);
        const cellCount = (maximumX - minimumX + 1) * (maximumY - minimumY + 1) *
            (maximumZ - minimumZ + 1);
        const oversized = !Number.isFinite(cellCount) || cellCount > this.maximumCellsPerEntry;
        if (this.entries.has(entry) && entry.gridOversized === oversized &&
            entry.gridMinimumX === minimumX && entry.gridMinimumY === minimumY &&
            entry.gridMinimumZ === minimumZ && entry.gridMaximumX === maximumX &&
            entry.gridMaximumY === maximumY && entry.gridMaximumZ === maximumZ) {
            this.updates++;
            return;
        }
        this.remove(entry, false);
        this.entries.add(entry);
        entry.gridMinimumX = minimumX;
        entry.gridMinimumY = minimumY;
        entry.gridMinimumZ = minimumZ;
        entry.gridMaximumX = maximumX;
        entry.gridMaximumY = maximumY;
        entry.gridMaximumZ = maximumZ;
        if (oversized) {
            this.oversized.add(entry);
            entry.gridOversized = true;
            this.updates++;
            return;
        }
        entry.gridOversized = false;
        for (let z = minimumZ; z <= maximumZ; z++) {
            for (let y = minimumY; y <= maximumY; y++) {
                for (let x = minimumX; x <= maximumX; x++) {
                    const key = `${x},${y},${z}`;
                    let cell = this.cells.get(key);
                    if (!cell) {
                        cell = {x, y, z, entries: new Set()};
                        this.cells.set(key, cell);
                    }
                    cell.entries.add(entry);
                    entry.gridCells.push(key);
                }
            }
        }
        this.updates++;
    }

    remove(entry, countUpdate = true) {
        if (!Array.isArray(entry.gridCells)) entry.gridCells = [];
        if (entry.gridOversized) this.oversized.delete(entry);
        for (const key of entry.gridCells) {
            const cell = this.cells.get(key);
            if (!cell) continue;
            cell.entries.delete(entry);
            if (cell.entries.size === 0) this.cells.delete(key);
        }
        const existed = this.entries.delete(entry);
        entry.gridCells.length = 0;
        entry.gridOversized = false;
        entry.gridMinimumX = NaN;
        entry.gridMinimumY = NaN;
        entry.gridMinimumZ = NaN;
        entry.gridMaximumX = NaN;
        entry.gridMaximumY = NaN;
        entry.gridMaximumZ = NaN;
        if (countUpdate && existed) this.updates++;
    }

    query(frustum, output) {
        const started = now();
        output.length = 0;
        const stamp = ++this.queryStamp;
        const size = this.cellSize;
        const minimum = this.queryMinimum;
        const maximum = this.queryMaximum;
        for (const cell of this.cells.values()) {
            minimum[0] = cell.x * size;
            minimum[1] = cell.y * size;
            minimum[2] = cell.z * size;
            maximum[0] = minimum[0] + size;
            maximum[1] = minimum[1] + size;
            maximum[2] = minimum[2] + size;
            if (!frustum.intersectsAabb(minimum, maximum)) continue;
            for (const entry of cell.entries) {
                if (entry.queryStamp === stamp) continue;
                entry.queryStamp = stamp;
                output.push(entry);
            }
        }
        for (const entry of this.oversized) {
            if (entry.queryStamp === stamp) continue;
            entry.queryStamp = stamp;
            output.push(entry);
        }
        this.queries++;
        this.lastQueryTime = started ? now() - started : 0;
        return output;
    }

    // Collision worlds use their own grid. Small volume queries visit only
    // intersecting cells; huge volumes scan entries once, never billions of cells.
    queryAabb(minimum, maximum, output) {
        output.length = 0;
        const stamp = ++this.queryStamp;
        const size = this.cellSize;
        const x0 = Math.floor(minimum[0] / size), x1 = Math.floor(maximum[0] / size);
        const y0 = Math.floor(minimum[1] / size), y1 = Math.floor(maximum[1] / size);
        const z0 = Math.floor(minimum[2] / size), z1 = Math.floor(maximum[2] / size);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 4096) {
            for (const entry of this.entries) this.#addAabbCandidate(entry, minimum, maximum, stamp, output);
        } else {
            for (let z = z0; z <= z1; z++) {
                for (let y = y0; y <= y1; y++) {
                    for (let x = x0; x <= x1; x++) {
                        const cell = this.cells.get(`${x},${y},${z}`);
                        if (cell) for (const entry of cell.entries) this.#addAabbCandidate(entry, minimum, maximum, stamp, output);
                    }
                }
            }
            for (const entry of this.oversized) this.#addAabbCandidate(entry, minimum, maximum, stamp, output);
        }
        this.queries++;
        return output;
    }

    #addAabbCandidate(entry, minimum, maximum, stamp, output) {
        if (entry.queryStamp === stamp) return;
        entry.queryStamp = stamp;
        const bounds = entry.bounds;
        for (let axis = 0; axis < 3; axis++) {
            if (bounds.maximum[axis] < minimum[axis] || bounds.minimum[axis] > maximum[axis]) return;
        }
        output.push(entry);
    }

    queryRay(origin, direction, maximumDistance, output) {
        const started = now();
        output.length = 0;
        const stamp = ++this.queryStamp;
        const size = this.cellSize;
        const limit = Math.max(0, Number(maximumDistance) || 0);
        let cellX = Math.floor(origin[0] / size);
        let cellY = Math.floor(origin[1] / size);
        let cellZ = Math.floor(origin[2] / size);
        const stepX = direction[0] > 0 ? 1 : direction[0] < 0 ? -1 : 0;
        const stepY = direction[1] > 0 ? 1 : direction[1] < 0 ? -1 : 0;
        const stepZ = direction[2] > 0 ? 1 : direction[2] < 0 ? -1 : 0;
        const nextBoundary = (cell, step) => (cell + (step > 0 ? 1 : 0)) * size;
        let maximumX = stepX ? (nextBoundary(cellX, stepX) - origin[0]) / direction[0] : Infinity;
        let maximumY = stepY ? (nextBoundary(cellY, stepY) - origin[1]) / direction[1] : Infinity;
        let maximumZ = stepZ ? (nextBoundary(cellZ, stepZ) - origin[2]) / direction[2] : Infinity;
        const deltaX = stepX ? size / Math.abs(direction[0]) : Infinity;
        const deltaY = stepY ? size / Math.abs(direction[1]) : Infinity;
        const deltaZ = stepZ ? size / Math.abs(direction[2]) : Infinity;
        let distance = 0;
        let visited = 0;
        const addCell = (x, y, z) => {
            const cell = this.cells.get(`${x},${y},${z}`);
            if (!cell) return;
            for (const entry of cell.entries) {
                if (entry.queryStamp === stamp) continue;
                entry.queryStamp = stamp;
                output.push(entry);
            }
        };
        while (distance <= limit) {
            // Neighbor cells make the traversal conservative for rays lying
            // exactly on a grid face or edge, without degrading sparse queries
            // into a scan of every indexed cell.
            for (let z = cellZ - 1; z <= cellZ + 1; z++) {
                for (let y = cellY - 1; y <= cellY + 1; y++) {
                    for (let x = cellX - 1; x <= cellX + 1; x++) addCell(x, y, z);
                }
            }
            visited++;
            const next = Math.min(maximumX, maximumY, maximumZ);
            if (!Number.isFinite(next) || next > limit) break;
            distance = Math.max(distance, next);
            const epsilon = 1e-10;
            if (maximumX <= next + epsilon) {
                cellX += stepX;
                maximumX += deltaX;
            }
            if (maximumY <= next + epsilon) {
                cellY += stepY;
                maximumY += deltaY;
            }
            if (maximumZ <= next + epsilon) {
                cellZ += stepZ;
                maximumZ += deltaZ;
            }
        }
        for (const entry of this.oversized) {
            if (entry.queryStamp === stamp) continue;
            entry.queryStamp = stamp;
            output.push(entry);
        }
        this.queries++;
        this.lastRayCells = visited;
        this.lastRayQueryTime = started ? now() - started : 0;
        return output;
    }

    clear() {
        for (const entry of this.entries) {
            if (!Array.isArray(entry.gridCells)) entry.gridCells = [];
            entry.gridCells.length = 0;
            entry.gridOversized = false;
            entry.gridMinimumX = NaN;
            entry.gridMinimumY = NaN;
            entry.gridMinimumZ = NaN;
            entry.gridMaximumX = NaN;
            entry.gridMaximumY = NaN;
            entry.gridMaximumZ = NaN;
        }
        this.cells.clear();
        this.entries.clear();
        this.oversized.clear();
        this.rebuilds++;
    }
}
