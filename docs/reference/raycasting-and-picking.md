# Raycasting & Picking

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Ray queries and typed results](#ray-queries-and-typed-results)
- [Stage/world projection](#stage-world-projection)

## Ray queries and typed results

Cast a world ray from an origin/direction, a ray through a logical stage point, or the camera’s forward ray. Choose maximum distance/filter and backface policy. Only the cast command performs a query; reporters read the stable last-hit record and do not recast.

Read `rayHit` before numeric/text fields. Number fields include distance/position/normal and indices; text fields include object/kind/material/precision. No hit yields typed false/zero/empty values. Static mesh/cube/terrain tests can be exact; skinned meshes deliberately report conservative current-pose bounds precision. Shader-deformed geometry is tested at its undeformed CPU positions.

Queries use bounds/spatial candidates and shared lazy acceleration for immutable geometry. They do not upload, render, compile shaders or rebuild the entire index merely because the camera moved. Invisible physics-only bodies are outside this visual ray API. Cast only when input/gameplay requires it.

### setRaycastBackface

![set raycast backfaces [POLICY]](../assets/blocks/setRaycastBackface.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>POLICY</code> | string; <code>both</code> | <code>both</code>, <code>front</code>, <code>back</code> |

### castWorldRay

![cast ray from [X] [Y] [Z] direction [DX] [DY] [DZ] distance [DISTANCE] filter [FILTER]](../assets/blocks/castWorldRay.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |
| <code>DX</code> | number; <code>0</code> | — |
| <code>DY</code> | number; <code>0</code> | — |
| <code>DZ</code> | number; <code>-1</code> | — |
| <code>DISTANCE</code> | number; <code>1000</code> | — |
| <code>FILTER</code> | string; <code>all</code> | — |

### castStageRay

![pick from camera [CAMERA] at stage x [X] y [Y] distance [DISTANCE] filter [FILTER]](../assets/blocks/castStageRay.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>DISTANCE</code> | number; <code>1000</code> | — |
| <code>FILTER</code> | string; <code>all</code> | — |

### castCameraForwardRay

![cast camera [CAMERA] forward ray distance [DISTANCE] filter [FILTER]](../assets/blocks/castCameraForwardRay.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>DISTANCE</code> | number; <code>1000</code> | — |
| <code>FILTER</code> | string; <code>all</code> | — |

### rayHit

![ray hit?](../assets/blocks/rayHit.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### rayHitNumber

![ray hit [FIELD] number](../assets/blocks/rayHitNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>FIELD</code> | string; <code>distance</code> | <code>distance</code>, <code>x</code>, <code>y</code>, <code>z</code>, <code>normal x</code>, <code>normal y</code>, <code>normal z</code>, <code>triangle</code>, <code>primitive</code>, <code>geometry ID</code> |

### rayHitText

![ray hit [FIELD] text](../assets/blocks/rayHitText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>FIELD</code> | string; <code>object</code> | <code>object</code>, <code>kind</code>, <code>node</code>, <code>precision</code>, <code>material</code> |

## Stage/world projection

Project a world point into logical Scratch stage coordinates using the named camera, or query whether it is in front/visible. Logical stage coordinates remain independent of DPR, internal render scale, post processing and render-target dimensions.

Use stage-ray direction components with a camera origin for interaction. World-to-stage numeric components are meaningful only when the point is in front and within the intended projection; check the Boolean reporters before positioning UI markers. These helpers inspect cached camera matrices and do not perform geometry picking. Resource coordinate conversion, for points versus directions, is in World Utilities.

### worldToStageValue

![world [X] [Y] [Z] from camera [CAMERA] as [VALUE]](../assets/blocks/worldToStageValue.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>-5</code> | — |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>VALUE</code> | string; <code>stage x</code> | <code>stage x</code>, <code>stage y</code>, <code>depth</code>, <code>NDC x</code>, <code>NDC y</code>, <code>NDC z</code> |

### worldPointInFront

![world [X] [Y] [Z] in front of camera [CAMERA]?](../assets/blocks/worldPointInFront.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>-5</code> | — |
| <code>CAMERA</code> | string; <code>main</code> | — |

### worldPointVisible

![world [X] [Y] [Z] visible by camera [CAMERA]?](../assets/blocks/worldPointVisible.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>-5</code> | — |
| <code>CAMERA</code> | string; <code>main</code> | — |

### stageRayDirection

![camera [CAMERA] stage x [X] y [Y] ray direction [AXIS]](../assets/blocks/stageRayDirection.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>AXIS</code> | string; <code>z</code> | <code>x</code>, <code>y</code>, <code>z</code> |
