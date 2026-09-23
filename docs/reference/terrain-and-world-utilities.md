# Terrain & World Utilities

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Terrain construction, edits and queries](#terrain-construction-edits-and-queries)
- [Vectors and coordinates](#vectors-and-coordinates)

## Terrain construction, edits and queries

Terrain is a finite indexed heightfield with width/depth in world units and X/Z segment counts. Set one grid height, flatten it, or generate seeded hills; assign a normal named material for lighting/textures. Grid sample indices are one-based. Segment counts describe cells, so the vertex grid has one more sample along each axis.

World height/normal reporters sample the same two-triangle cells used by rendering; grid-height reports a stored local sample. Numeric reports expose dimensions/segments and edit/build counts; dirty indicates pending geometry synchronization. Batch several height edits before the next render/update sync to avoid unnecessary rebuilds.

Translation, nonzero scale and yaw are supported. Pitch/roll, caves, streaming and infinite terrain are not. Changed vertex data uploads once while unchanged terrain uploads nothing. Terrain is independently culled and supports visual ray queries, but it is not automatically a gameplay physics collider. Delete terrain through its own deletion block.

### createTerrain

![create terrain [NAME] width [WIDTH] depth [DEPTH] segments [X_SEGMENTS] by [Z_SEGMENTS]](../assets/blocks/createTerrain.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>WIDTH</code> | number; <code>20</code> | — |
| <code>DEPTH</code> | number; <code>20</code> | — |
| <code>X_SEGMENTS</code> | number; <code>16</code> | — |
| <code>Z_SEGMENTS</code> | number; <code>16</code> | — |

### setTerrainHeight

![set terrain [NAME] grid x [X] z [Z] height [HEIGHT]](../assets/blocks/setTerrainHeight.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |
| <code>HEIGHT</code> | number; <code>1</code> | — |

### setTerrainFlat

![set terrain [NAME] flat height [HEIGHT]](../assets/blocks/setTerrainFlat.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>HEIGHT</code> | number; <code>0</code> | — |

### generateTerrainHills

![generate terrain [NAME] hills amplitude [AMPLITUDE] frequency [FREQUENCY] seed [SEED]](../assets/blocks/generateTerrainHills.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>AMPLITUDE</code> | number; <code>2</code> | — |
| <code>FREQUENCY</code> | number; <code>2</code> | — |
| <code>SEED</code> | number; <code>1</code> | — |

### setTerrainMaterial

![set terrain [NAME] material [MATERIAL]](../assets/blocks/setTerrainMaterial.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>MATERIAL</code> | string; <code>surface</code> | — |

### terrainHeightAt

![terrain [NAME] height at world x [X] z [Z]](../assets/blocks/terrainHeightAt.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### terrainNormalAt

![terrain [NAME] normal [AXIS] at world x [X] z [Z]](../assets/blocks/terrainNormalAt.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |
| <code>AXIS</code> | string; <code>y</code> | <code>x</code>, <code>y</code>, <code>z</code> |
| <code>X</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### terrainExists

![terrain [TERRAIN] exists?](../assets/blocks/terrainExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TERRAIN</code> | string; <code>ground</code> | — |

### terrainGridHeight

![terrain [TERRAIN] grid x [X] z [Z] height](../assets/blocks/terrainGridHeight.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TERRAIN</code> | string; <code>ground</code> | — |
| <code>X</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>1</code> | — |

### terrainNumber

![terrain [TERRAIN] [PROPERTY] number](../assets/blocks/terrainNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TERRAIN</code> | string; <code>ground</code> | — |
| <code>PROPERTY</code> | string; <code>width</code> | <code>width</code>, <code>depth</code>, <code>x segments</code>, <code>z segments</code>, <code>logical edits</code>, <code>geometry builds</code> |

### terrainBoolean

![terrain [TERRAIN] [PROPERTY] ?](../assets/blocks/terrainBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TERRAIN</code> | string; <code>ground</code> | — |
| <code>PROPERTY</code> | string; <code>dirty</code> | <code>dirty</code> |

### deleteTerrain

![delete terrain [NAME]](../assets/blocks/deleteTerrain.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>ground</code> | — |

## Vectors and coordinates

Vector helpers return scalar distance, length, dot product, angle in degrees, or a selected cross/normalized/direction component. Reconstruct a vector with X/Y/Z reporter calls where required. Linear interpolation uses an amount/factor; clamp constrains a scalar. Resource distance reads named roots, not closest surface distance.

Coordinate conversion applies a resource transform or its inverse. A point includes translation; a direction does not. Choose the output component explicitly. Normalize directions when their length matters. Degenerate/invalid vectors use the handler’s finite fallback/diagnostic policy rather than producing nonfinite renderer state. These CPU math queries do not cast a ray or allocate optional subsystems.

### distance3D

![3D distance from [AX] [AY] [AZ] to [BX] [BY] [BZ]](../assets/blocks/distance3D.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AX</code> | number; <code>0</code> | — |
| <code>AY</code> | number; <code>0</code> | — |
| <code>AZ</code> | number; <code>0</code> | — |
| <code>BX</code> | number; <code>1</code> | — |
| <code>BY</code> | number; <code>1</code> | — |
| <code>BZ</code> | number; <code>1</code> | — |

### vectorLength3D

![length of vector [X] [Y] [Z]](../assets/blocks/vectorLength3D.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### dotProduct3D

![dot [AX] [AY] [AZ] with [BX] [BY] [BZ]](../assets/blocks/dotProduct3D.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AX</code> | number; <code>1</code> | — |
| <code>AY</code> | number; <code>0</code> | — |
| <code>AZ</code> | number; <code>0</code> | — |
| <code>BX</code> | number; <code>0</code> | — |
| <code>BY</code> | number; <code>1</code> | — |
| <code>BZ</code> | number; <code>0</code> | — |

### crossProduct3D

![cross [AX] [AY] [AZ] with [BX] [BY] [BZ] component [AXIS]](../assets/blocks/crossProduct3D.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AX</code> | number; <code>1</code> | — |
| <code>AY</code> | number; <code>0</code> | — |
| <code>AZ</code> | number; <code>0</code> | — |
| <code>BX</code> | number; <code>0</code> | — |
| <code>BY</code> | number; <code>1</code> | — |
| <code>BZ</code> | number; <code>0</code> | — |
| <code>AXIS</code> | string; <code>z</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### vectorNormalizedComponent

![normalized [X] [Y] [Z] component [AXIS]](../assets/blocks/vectorNormalizedComponent.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### directionComponent3D

![direction from [AX] [AY] [AZ] to [BX] [BY] [BZ] component [AXIS]](../assets/blocks/directionComponent3D.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AX</code> | number; <code>0</code> | — |
| <code>AY</code> | number; <code>0</code> | — |
| <code>AZ</code> | number; <code>0</code> | — |
| <code>BX</code> | number; <code>1</code> | — |
| <code>BY</code> | number; <code>0</code> | — |
| <code>BZ</code> | number; <code>0</code> | — |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### angleBetweenVectors

![angle between [AX] [AY] [AZ] and [BX] [BY] [BZ]](../assets/blocks/angleBetweenVectors.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>AX</code> | number; <code>1</code> | — |
| <code>AY</code> | number; <code>0</code> | — |
| <code>AZ</code> | number; <code>0</code> | — |
| <code>BX</code> | number; <code>0</code> | — |
| <code>BY</code> | number; <code>1</code> | — |
| <code>BZ</code> | number; <code>0</code> | — |

### lerpNumber

![lerp [START] to [END] by [AMOUNT]](../assets/blocks/lerpNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>START</code> | number; <code>0</code> | — |
| <code>END</code> | number; <code>10</code> | — |
| <code>AMOUNT</code> | number; <code>0.5</code> | — |

### clampNumber

![clamp [VALUE] between [MINIMUM] and [MAXIMUM]](../assets/blocks/clampNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>VALUE</code> | number; <code>5</code> | — |
| <code>MINIMUM</code> | number; <code>0</code> | — |
| <code>MAXIMUM</code> | number; <code>10</code> | — |

### distanceBetweenResources

![distance from 3D resource [FROM] to [TO]](../assets/blocks/distanceBetweenResources.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>FROM</code> | string; <code>cube</code> | — |
| <code>TO</code> | string; <code>main</code> | — |

### transformResourceCoordinate

![[DIRECTION] [KIND] by [RESOURCE] x [X] y [Y] z [Z] get [AXIS]](../assets/blocks/transformResourceCoordinate.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>DIRECTION</code> | string; <code>local to world</code> | <code>local to world</code>, <code>world to local</code> |
| <code>KIND</code> | string; <code>point</code> | <code>point</code>, <code>direction</code> |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |
