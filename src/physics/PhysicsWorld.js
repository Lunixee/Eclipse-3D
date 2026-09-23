import {LooseSpatialGrid} from '../visibility/LooseSpatialGrid.js';
import {collide, CONTACT_EPSILON} from './collision.js';

const STEP = 1 / 60;
const MAX_STEPS = 6;
const MAX_CONTACTS = 8192;
const LIMIT = 1e6;
const finite = (value, label, minimum = -LIMIT, maximum = LIMIT) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
        throw new Error(`${label} must be finite in ${minimum}..${maximum}`);
    }
    return number;
};
const vector = (out, x, y, z, label) => {
    x = finite(x, label); y = finite(y, label); z = finite(z, label);
    out[0] = x; out[1] = y; out[2] = z;
};
const contactRecord = () => ({a: null, b: null, nx: 0, ny: 0, nz: 0, px: 0, py: 0, pz: 0,
    depth: 0, current: false, entered: false, exited: false, eventTick: 0, step: -1, finalStep: -1});

/** Optional scene-local gameplay physics. Shapes use world dimensions and
 * translate only. Nothing in this module reads mesh geometry or a renderer. */
export class PhysicsWorld {
    constructor(scene) {
        this.scene = scene;
        this.resources = new Map();
        this.attachments = new Map();
        this.attachmentDirty = new Set();
        this.grid = new LooseSpatialGrid(4);
        this.gravity = new Float64Array([0, -9.81, 0]);
        this.movers = new Set();
        this.dirty = new Set();
        this.work = new Set();
        this.writeback = new Set();
        this.contacts = new Set();
        this.transitions = new Set();
        this.solver = new Set();
        this.pool = [];
        this.allocatedContacts = 0;
        this.candidates = [];
        this.scratch = contactRecord();
        this.nextId = 1;
        this.stepId = 0;
        this.tickId = 0;
        this.accumulator = 0;
        this.writing = false;
        this.disposed = false;
        this.metrics = {steps: 0, integrated: 0, candidates: 0, narrowTests: 0, gridUpdates: 0,
            droppedTime: 0, contactOverflows: 0, changed: false};
    }

    create(name, shape = 'box', type = 'static', x = 1, y = 1, z = 1) {
        if (this.disposed) throw new Error('Physics world is disposed');
        if (!name || this.resources.has(name)) throw new Error(`Physics body name "${name}" is empty or already used`);
        if (shape !== 'box' && shape !== 'sphere') throw new Error('Physics shape must be box or sphere');
        if (!['static', 'kinematic', 'dynamic'].includes(type)) throw new Error('Unknown physics body type');
        x = finite(x, 'Collider size', 1e-4, 10000);
        y = finite(y, 'Collider size', 1e-4, 10000);
        z = finite(z, 'Collider size', 1e-4, 10000);
        const body = {id: this.nextId++, name, shape, type, position: new Float64Array(3),
            velocity: new Float64Array(3), size: new Float64Array(shape === 'box' ? [x / 2, y / 2, z / 2] : [x, x, x]),
            offset: new Float64Array(3), objectPosition: new Float64Array(3).fill(NaN), object: '', mass: 1, inverseMass: type === 'dynamic' ? 1 : 0,
            restitution: 0, friction: 0.5, gravityScale: 1, trigger: false, layer: 1, mask: 0xffffffff,
            sleeping: false, sleepTime: 0, alive: true,
            bounds: {minimum: new Float64Array(3), maximum: new Float64Array(3), valid: false}, gridCells: [],
            contacts: new Map()};
        this.resources.set(name, body);
        this.dirty.add(body);
        if (type === 'dynamic') this.movers.add(body);
        return body;
    }

    require(name) {
        const body = this.resources.get(name);
        if (!body) throw new Error(`Unknown physics body "${name}"`);
        return body;
    }

    setPosition(name, x, y, z) {
        const body = this.require(name);
        x = finite(x, 'Position'); y = finite(y, 'Position'); z = finite(z, 'Position');
        if (body.position[0] === x && body.position[1] === y && body.position[2] === z) return;
        vector(body.position, x, y, z, 'Position');
        this.#dirty(body);
        this.#write(body);
    }

    setVelocity(name, x, y, z) {
        const body = this.require(name);
        if (body.type === 'static') throw new Error('Static bodies have no velocity; use a kinematic body');
        vector(body.velocity, x, y, z, 'Velocity');
        this.#wake(body);
        if (body.type === 'kinematic') {
            if (x || y || z) this.movers.add(body);
            else this.movers.delete(body);
        }
    }

    setGravity(x, y, z) {
        vector(this.gravity, x, y, z, 'Gravity');
        for (const body of this.resources.values()) this.#wake(body);
    }

    setNumber(name, property, value) {
        const body = this.require(name);
        if (property === 'mass') {
            body.mass = finite(value, 'Mass', 1e-4, LIMIT);
            body.inverseMass = body.type === 'dynamic' ? 1 / body.mass : 0;
        } else if (property === 'restitution' || property === 'friction') {
            body[property] = finite(value, property, 0, 1);
        } else if (property === 'gravityScale') body.gravityScale = finite(value, property, -100, 100);
        else throw new Error(`Unknown physics number "${property}"`);
        this.#dirty(body);
    }

    setFilter(name, layer, mask) {
        const body = this.require(name);
        layer = finite(layer, 'Layer bits', 0, 0xffffffff);
        mask = finite(mask, 'Mask bits', 0, 0xffffffff);
        if (!Number.isInteger(layer) || !Number.isInteger(mask)) throw new Error('Collision bits must be unsigned integers');
        body.layer = layer >>> 0; body.mask = mask >>> 0;
        this.#dirty(body);
    }

    setTrigger(name, enabled) {
        const body = this.require(name);
        if (body.trigger === Boolean(enabled)) return;
        body.trigger = Boolean(enabled);
        this.#dirty(body);
    }

    attach(name, object, x = 0, y = 0, z = 0) {
        const body = this.require(name);
        if (object) this.scene.requireAttachmentTarget(object);
        const previous = this.attachments.get(object);
        if (object && previous && previous !== body) throw new Error(`Object "${object}" already has a physics body`);
        x = finite(x, 'Offset'); y = finite(y, 'Offset'); z = finite(z, 'Offset');
        if (object) {
            const transform = this.scene.attachmentTransform(object);
            finite(transform.position[transform.offset] + x, 'Attached position');
            finite(transform.position[transform.offset + 1] + y, 'Attached position');
            finite(transform.position[transform.offset + 2] + z, 'Attached position');
        }
        if (body.object) this.attachments.delete(body.object);
        body.object = object;
        body.objectPosition.fill(NaN);
        vector(body.offset, x, y, z, 'Offset');
        if (object) {
            this.attachments.set(object, body);
            this.attachmentDirty.add(body);
            this.syncAttachments();
        }
    }

    markAttached(name, removed = false) {
        const body = this.attachments.get(name);
        if (!body || this.writing) return;
        if (removed) { this.delete(body.name); return; }
        this.attachmentDirty.add(body);
    }

    syncAttachments() {
        for (const body of this.attachmentDirty) {
            if (!body.alive || !body.object) continue;
            const transform = this.scene.attachmentTransform(body.object);
            const p = transform.position, offset = transform.offset;
            // Validate the whole input before altering a retained body. A bad
            // external transform fails this update until the project corrects it.
            finite(p[offset] + body.offset[0], 'Attached position');
            finite(p[offset + 1] + body.offset[1], 'Attached position');
            finite(p[offset + 2] + body.offset[2], 'Attached position');
            let changed = false;
            for (let axis = 0; axis < 3; axis++) {
                if (body.objectPosition[axis] === p[offset + axis]) continue;
                body.objectPosition[axis] = p[offset + axis];
                body.position[axis] = p[offset + axis] + body.offset[axis];
                changed = true;
            }
            if (changed) this.#dirty(body);
        }
        this.attachmentDirty.clear();
    }

    #wake(body) {
        if (!body.alive || body.type !== 'dynamic') return;
        body.sleeping = false;
        body.sleepTime = 0;
        this.movers.add(body);
    }

    #dirty(body) {
        this.dirty.add(body);
        this.#wake(body);
        for (const contact of body.contacts.values()) {
            if (contact.current && !contact.a.trigger && !contact.b.trigger) {
                this.#wake(contact.a === body ? contact.b : contact.a);
            }
        }
    }

    update(deltaSeconds) {
        const m = this.metrics;
        m.steps = m.integrated = m.candidates = m.narrowTests = m.gridUpdates = m.contactOverflows = 0;
        m.droppedTime = 0; m.changed = false;
        if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || !this.resources.size) return m;
        this.tickId++;
        for (const contact of this.transitions) {
            if (contact.eventTick >= this.tickId) continue;
            contact.entered = contact.exited = false;
            this.transitions.delete(contact);
            if (!contact.current) this.#releaseContact(contact);
        }
        this.syncAttachments();
        const accepted = Math.min(deltaSeconds, STEP * MAX_STEPS);
        m.droppedTime = deltaSeconds - accepted;
        this.accumulator += accepted;
        while (this.accumulator + 1e-12 >= STEP && m.steps < MAX_STEPS) {
            this.accumulator = Math.max(0, this.accumulator - STEP);
            this.#step();
            m.steps++;
        }
        for (const body of this.writeback) this.#write(body);
        this.writeback.clear();
        return m;
    }

    #step() {
        this.stepId++;
        this.work.clear();
        for (const body of this.dirty) this.work.add(body);
        this.dirty.clear();
        for (const body of this.movers) {
            if (body.type === 'dynamic') {
                for (let axis = 0; axis < 3; axis++) body.velocity[axis] += this.gravity[axis] * body.gravityScale * STEP;
            }
            let moved = false;
            for (let axis = 0; axis < 3; axis++) {
                const next = Math.max(-LIMIT, Math.min(LIMIT, body.position[axis] + body.velocity[axis] * STEP));
                if (next !== body.position[axis]) moved = true;
                body.position[axis] = next;
                body.velocity[axis] = Math.max(-LIMIT, Math.min(LIMIT, body.velocity[axis]));
            }
            this.metrics.integrated++;
            if (moved) { this.work.add(body); this.writeback.add(body); }
        }
        for (const body of this.work) this.#index(body);
        this.solver.clear();
        for (const body of this.work) {
            // Retained neighbors must be tested even after moving far away.
            for (const contact of body.contacts.values()) this.#test(body, contact.a === body ? contact.b : contact.a);
            this.grid.queryAabb(body.bounds.minimum, body.bounds.maximum, this.candidates);
            for (const other of this.candidates) {
                if (other === body || (this.work.has(other) && other.id < body.id)) continue;
                this.metrics.candidates++;
                this.#test(body, other);
            }
        }
        // A small translation solver; no angular inertia, warm starting or
        // advanced stacking guarantee. Re-test after positional corrections.
        for (let iteration = 0; iteration < 4; iteration++) {
            for (const contact of this.solver) {
                this.metrics.narrowTests++;
                if (collide(contact.a, contact.b, this.scratch)) this.#resolve(contact.a, contact.b, this.scratch);
            }
        }
        for (const body of this.work) this.#refreshContacts(body);
        for (const body of this.writeback) this.#refreshContacts(body);
        for (const body of this.dirty) this.#index(body);
        // Keep correction-dirty records for next step's neighbor discovery.
        for (const body of this.movers) {
            if (body.type !== 'dynamic') continue;
            let supported = this.gravity[0] * body.gravityScale === 0 && this.gravity[1] * body.gravityScale === 0 &&
                this.gravity[2] * body.gravityScale === 0;
            for (const contact of body.contacts.values()) {
                if (!contact.current || contact.a.trigger || contact.b.trigger) continue;
                const other = contact.a === body ? contact.b : contact.a;
                if (other.type === 'static' || other.sleeping ||
                    (other.type === 'kinematic' && !this.movers.has(other))) supported = true;
            }
            if (supported && Math.hypot(body.velocity[0], body.velocity[1], body.velocity[2]) < 0.03) body.sleepTime += STEP;
            else body.sleepTime = 0;
            if (body.sleepTime >= 0.5) {
                body.sleeping = true;
                body.velocity.fill(0);
                this.movers.delete(body);
            }
        }
    }

    #index(body) {
        for (let axis = 0; axis < 3; axis++) {
            body.bounds.minimum[axis] = body.position[axis] - body.size[axis] - CONTACT_EPSILON;
            body.bounds.maximum[axis] = body.position[axis] + body.size[axis] + CONTACT_EPSILON;
        }
        body.bounds.valid = true;
        this.grid.update(body);
        this.metrics.gridUpdates++;
    }

    #test(a, b) {
        let contact = a.contacts.get(b.id);
        if (contact?.step === this.stepId) return;
        if (contact) contact.step = this.stepId;
        const filtered = !a.alive || !b.alive || !(a.layer & b.mask) || !(b.layer & a.mask);
        this.metrics.narrowTests++;
        if (filtered || !collide(a, b, this.scratch)) {
            if (contact?.current) this.#exit(contact, this.tickId);
            return;
        }
        if (!contact) {
            contact = this.pool.pop();
            if (!contact && this.allocatedContacts < MAX_CONTACTS) { contact = contactRecord(); this.allocatedContacts++; }
            if (!contact) {
                this.metrics.contactOverflows++;
                if (!a.trigger && !b.trigger) this.#resolve(a, b, this.scratch);
                return;
            }
            contact.a = a; contact.b = b;
            contact.current = contact.entered = contact.exited = false;
            this.contacts.add(contact);
            a.contacts.set(b.id, contact); b.contacts.set(a.id, contact);
        }
        // Stored orientation is always contact.a -> escape from contact.b.
        const sign = contact.a === a ? 1 : -1;
        contact.nx = this.scratch.nx * sign; contact.ny = this.scratch.ny * sign; contact.nz = this.scratch.nz * sign;
        contact.px = this.scratch.px; contact.py = this.scratch.py; contact.pz = this.scratch.pz;
        contact.depth = this.scratch.depth; contact.step = this.stepId;
        if (!contact.current) {
            contact.entered = true; contact.current = true; contact.eventTick = this.tickId;
            this.transitions.add(contact);
        }
        if (!a.trigger && !b.trigger) {
            if (a.sleeping && (this.movers.has(b) || this.work.has(b))) this.#wake(a);
            if (b.sleeping && (this.movers.has(a) || this.work.has(a))) this.#wake(b);
            if (a.inverseMass + b.inverseMass > 0) this.solver.add(contact);
        }
    }

    #resolve(a, b, c) {
        const ia = a.inverseMass, ib = b.inverseMass, sum = ia + ib;
        if (!sum) return;
        const nx = c.nx, ny = c.ny, nz = c.nz;
        const correction = Math.max(0, c.depth - 1e-6) / sum;
        if (correction > 0) {
            if (ia) this.#translate(a, nx * correction * ia, ny * correction * ia, nz * correction * ia);
            if (ib) this.#translate(b, -nx * correction * ib, -ny * correction * ib, -nz * correction * ib);
        }
        const vx = a.velocity[0] - b.velocity[0], vy = a.velocity[1] - b.velocity[1], vz = a.velocity[2] - b.velocity[2];
        const normalSpeed = vx * nx + vy * ny + vz * nz;
        if (normalSpeed >= 0) return;
        const bounce = normalSpeed < -0.5 ? Math.max(a.restitution, b.restitution) : 0;
        const impulse = -(1 + bounce) * normalSpeed / sum;
        let tx = vx - nx * normalSpeed, ty = vy - ny * normalSpeed, tz = vz - nz * normalSpeed;
        const tangentSpeed = Math.hypot(tx, ty, tz);
        const friction = tangentSpeed > 1e-12 ? Math.min(tangentSpeed / sum, impulse * Math.sqrt(a.friction * b.friction)) / tangentSpeed : 0;
        tx = nx * impulse - tx * friction; ty = ny * impulse - ty * friction; tz = nz * impulse - tz * friction;
        if (ia) { a.velocity[0] += tx * ia; a.velocity[1] += ty * ia; a.velocity[2] += tz * ia; }
        if (ib) { b.velocity[0] -= tx * ib; b.velocity[1] -= ty * ib; b.velocity[2] -= tz * ib; }
    }

    #translate(body, x, y, z) {
        body.position[0] += x; body.position[1] += y; body.position[2] += z;
        this.dirty.add(body);
        this.writeback.add(body);
    }

    #write(body) {
        if (!body.alive || !body.object) return;
        const transform = this.scene.attachmentTransform(body.object);
        const x = Math.fround(body.position[0] - body.offset[0]);
        const y = Math.fround(body.position[1] - body.offset[1]);
        const z = Math.fround(body.position[2] - body.offset[2]);
        const p = transform.position, offset = transform.offset;
        if (p[offset] === x && p[offset + 1] === y && p[offset + 2] === z) return;
        this.writing = true;
        try { this.scene.setResourcePosition(body.object, x, y, z); }
        finally { this.writing = false; }
        body.objectPosition[0] = x; body.objectPosition[1] = y; body.objectPosition[2] = z;
        this.metrics.changed = true;
    }

    #refreshContacts(body) {
        for (const contact of body.contacts.values()) {
            if (!contact.current || contact.finalStep === this.stepId) continue;
            contact.finalStep = this.stepId;
            this.metrics.narrowTests++;
            if (!collide(contact.a, contact.b, this.scratch)) this.#exit(contact, this.tickId);
            else {
                contact.nx = this.scratch.nx; contact.ny = this.scratch.ny; contact.nz = this.scratch.nz;
                contact.px = this.scratch.px; contact.py = this.scratch.py; contact.pz = this.scratch.pz;
                contact.depth = this.scratch.depth;
            }
        }
    }

    #exit(contact, eventTick) {
        contact.current = false; contact.exited = true; contact.eventTick = eventTick;
        this.transitions.add(contact);
    }

    #releaseContact(contact) {
        contact.a.contacts.delete(contact.b.id);
        contact.b.contacts.delete(contact.a.id);
        this.contacts.delete(contact);
        this.solver.delete(contact);
        contact.a = contact.b = null;
        this.pool.push(contact);
    }

    touching(name, other = '', state = 'current') {
        return this.contactCount(name, state, other) > 0;
    }

    contactCount(name, state = 'current', other = '') {
        if (!['current', 'entered', 'exited'].includes(state)) throw new Error('Unknown contact state');
        const body = this.require(name);
        let count = 0;
        for (const contact of body.contacts.values()) {
            if (contact[state] && (!other || (contact.a === body ? contact.b : contact.a).name === other)) count++;
        }
        return count;
    }

    contactAt(name, index = 1, state = 'current') {
        if (!['current', 'entered', 'exited'].includes(state)) throw new Error('Unknown contact state');
        if (!Number.isInteger(Number(index)) || index < 1) return null;
        for (const contact of this.require(name).contacts.values()) if (contact[state] && --index === 0) return contact;
        return null;
    }

    delete(name) {
        const body = this.resources.get(name);
        if (!body) return false;
        body.alive = false;
        this.resources.delete(name);
        if (body.object) this.attachments.delete(body.object);
        this.attachmentDirty.delete(body); this.dirty.delete(body); this.work.delete(body);
        this.writeback.delete(body); this.movers.delete(body); this.grid.remove(body);
        for (const contact of body.contacts.values()) {
            this.#wake(contact.a === body ? contact.b : contact.a);
            if (contact.current) this.#exit(contact, this.tickId + 1);
        }
        body.object = '';
        if (!this.resources.size) {
            for (const contact of this.contacts) this.#releaseContact(contact);
            this.transitions.clear();
        }
        return true;
    }

    resetClock() { this.accumulator = 0; }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        for (const body of this.resources.values()) { body.alive = false; body.contacts.clear(); body.object = ''; }
        this.resources.clear(); this.attachments.clear(); this.attachmentDirty.clear();
        this.movers.clear(); this.dirty.clear(); this.work.clear(); this.writeback.clear();
        this.contacts.clear(); this.transitions.clear(); this.solver.clear(); this.pool.length = 0;
        this.candidates.length = 0; this.grid.clear(); this.resetClock();
    }
}
