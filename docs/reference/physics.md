# Physics

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Bodies, attachments and world settings](#bodies-attachments-and-world-settings)
- [Contacts](#contacts)

## Bodies, attachments and world settings

Each named body is one world-axis box or sphere. Choose static, kinematic or dynamic; boxes take full width/height/depth and spheres a radius. Collision dimensions are world units and do not inherit visual rotation/scale. Physics exists only when first needed in a scene.

Vector properties set position/velocity; gravity is a world acceleration. Dynamic bodies use mass, restitution, friction, gravity scale and sleep state. Kinematic bodies integrate explicit velocity without gravity; static bodies reject velocity. Triggers record contacts without physical response. Collision filters require both bodies’ layer/mask tests to pass.

Attach a body to a cube or model-instance root with a world offset. Simulation writes back the object position once per update; manual object movement teleports the body while retaining velocity. Mesh scale, bones, instance-group members, effects and terrain are not collider attachments. Deleting an object deletes its body; deleting the body leaves the object visible.

The solver uses fixed 1/60-second steps, at most six per update and a 0.1-second input clamp. Only the active scene simulates. There is no angular dynamics, CCD, mesh collision, joints or advanced stacking guarantee. Fast/small bodies may tunnel. Reports expose dimensions, mass/motion, sleeping, flags, filters, attachment and gravity. See the [physics/audio contract](../../PHYSICS_AUDIO.md).

### createPhysicsBox

![create [TYPE] physics box [NAME] width [WIDTH] height [HEIGHT] depth [DEPTH]](../assets/blocks/createPhysicsBox.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>TYPE</code> | string; <code>static</code> | <code>static</code>, <code>kinematic</code>, <code>dynamic</code> |
| <code>WIDTH</code> | number; <code>1</code> | — |
| <code>HEIGHT</code> | number; <code>1</code> | — |
| <code>DEPTH</code> | number; <code>1</code> | — |

### createPhysicsSphere

![create [TYPE] physics sphere [NAME] radius [RADIUS]](../assets/blocks/createPhysicsSphere.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>TYPE</code> | string; <code>dynamic</code> | <code>static</code>, <code>kinematic</code>, <code>dynamic</code> |
| <code>RADIUS</code> | number; <code>0.5</code> | — |

### setPhysicsGravity

![set physics gravity x [X] y [Y] z [Z]](../assets/blocks/setPhysicsGravity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>-9.81</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setPhysicsVector

![set physics body [NAME] [PROPERTY] x [X] y [Y] z [Z]](../assets/blocks/setPhysicsVector.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>PROPERTY</code> | string; <code>velocity</code> | <code>position</code>, <code>velocity</code> |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setPhysicsNumber

![set physics body [NAME] [PROPERTY] [VALUE]](../assets/blocks/setPhysicsNumber.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>PROPERTY</code> | string; <code>mass</code> | <code>mass</code>, <code>restitution</code>, <code>friction</code>, <code>gravityScale</code> |
| <code>VALUE</code> | number; <code>1</code> | — |

### setPhysicsTrigger

![set physics body [NAME] trigger [ENABLED]](../assets/blocks/setPhysicsTrigger.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setPhysicsFilter

![set physics body [NAME] layer bits [LAYER] mask bits [MASK]](../assets/blocks/setPhysicsFilter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>LAYER</code> | number; <code>1</code> | — |
| <code>MASK</code> | number; <code>4294967295</code> | — |

### attachPhysicsBody

![attach physics body [NAME] to object [OBJECT] offset x [X] y [Y] z [Z]](../assets/blocks/attachPhysicsBody.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>OBJECT</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### physicsBodyExists

![physics body [BODY] exists?](../assets/blocks/physicsBodyExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>BODY</code> | string; <code>body</code> | — |

### physicsBodyNumber

![physics body [NAME] [FIELD]](../assets/blocks/physicsBodyNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>FIELD</code> | string; <code>velocity y</code> | <code>x</code>, <code>y</code>, <code>z</code>, <code>velocity x</code>, <code>velocity y</code>, <code>velocity z</code>, <code>mass</code>, <code>restitution</code>, <code>friction</code>, <code>gravityScale</code> |

### physicsBodySleeping

![physics body [NAME] sleeping?](../assets/blocks/physicsBodySleeping.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |

### physicsBodyText

![physics body [BODY] [PROPERTY] text](../assets/blocks/physicsBodyText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>BODY</code> | string; <code>body</code> | — |
| <code>PROPERTY</code> | string; <code>type</code> | <code>type</code>, <code>shape</code>, <code>object</code> |

### physicsBodyBoolean

![physics body [BODY] [PROPERTY] ?](../assets/blocks/physicsBodyBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>BODY</code> | string; <code>body</code> | — |
| <code>PROPERTY</code> | string; <code>trigger</code> | <code>trigger</code>, <code>attached</code> |

### physicsBodyMeasure

![physics body [BODY] [PROPERTY] number](../assets/blocks/physicsBodyMeasure.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>BODY</code> | string; <code>body</code> | — |
| <code>PROPERTY</code> | string; <code>width</code> | <code>width</code>, <code>height</code>, <code>depth</code>, <code>radius</code>, <code>offset x</code>, <code>offset y</code>, <code>offset z</code>, <code>layer bits</code>, <code>mask bits</code> |

### physicsWorldNumber

![physics world [PROPERTY] number](../assets/blocks/physicsWorldNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>gravity x</code> | <code>gravity x</code>, <code>gravity y</code>, <code>gravity z</code> |

### deletePhysicsBody

![delete physics body [NAME]](../assets/blocks/deletePhysicsBody.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |

## Contacts

Contact queries operate on physics bodies, including invisible colliders. `current` describes retained overlaps; `entered` and `exited` describe transitions aggregated over the latest positive-delta engine update. Consume transitions in gameplay updates rather than expecting them to persist forever.

Count contacts first, then use one-based indices to read the other body name or a numeric contact component. The normal for the queried body is its escape direction; points are representative contact points, not full manifolds. Trigger contacts are queryable without impulses. No result is a typed false/zero/empty fallback. The bounded contact pool can overflow in dense scenes; monitor the physics metric before relying on every pair being recorded.

### physicsTouching

![physics body [NAME] [STATE] touching [OTHER] ?](../assets/blocks/physicsTouching.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>STATE</code> | string; <code>current</code> | <code>current</code>, <code>entered</code>, <code>exited</code> |
| <code>OTHER</code> | string; <code></code> | — |

### physicsContactCount

![physics body [NAME] [STATE] contact count](../assets/blocks/physicsContactCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>STATE</code> | string; <code>current</code> | <code>current</code>, <code>entered</code>, <code>exited</code> |

### physicsContactName

![physics body [NAME] [STATE] contact [INDEX] name](../assets/blocks/physicsContactName.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>STATE</code> | string; <code>current</code> | <code>current</code>, <code>entered</code>, <code>exited</code> |
| <code>INDEX</code> | number; <code>1</code> | — |

### physicsContactNumber

![physics body [NAME] [STATE] contact [INDEX] [FIELD]](../assets/blocks/physicsContactNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>body</code> | — |
| <code>STATE</code> | string; <code>current</code> | <code>current</code>, <code>entered</code>, <code>exited</code> |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>FIELD</code> | string; <code>normal y</code> | <code>normal x</code>, <code>normal y</code>, <code>normal z</code>, <code>point x</code>, <code>point y</code>, <code>point z</code>, <code>penetration</code> |
