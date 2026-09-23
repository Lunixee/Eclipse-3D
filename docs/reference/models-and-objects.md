# Models & Objects

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Primitive and instance creation](#primitive-and-instance-creation)
- [Shared resource and instance transforms](#shared-resource-and-instance-transforms)
- [Model assets and instances](#model-assets-and-instances)
- [Visibility and LOD](#visibility-and-lod)

## Primitive and instance creation

Create one retained unit cube for individually named objects, or a cube instance group for many copies that share geometry and material. The bulk block lays out the requested count using its spacing; edit members with one-based instance indices. COUNT is capacity/work, not a per-frame emission rate.

Instances reduce draw submission when geometry/material/state are compatible. Creating thousands of separately named resources does not provide the same editing or batching contract as an instance group. Set up once; animate transforms instead of recreating geometry each frame. Delete a cube or an entire group with `deleteResource`.

### createCube

![create cube [NAME]](../assets/blocks/createCube.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

### createCubeInstances

![create instance group [GROUP] with [COUNT] cubes spacing [SPACING]](../assets/blocks/createCubeInstances.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>COUNT</code> | number; <code>1000</code> | — |
| <code>SPACING</code> | number; <code>1.5</code> | — |

## Shared resource and instance transforms

Shared transforms address a named resource in the active scene. Positions use world units, rotations use Euler degrees and scales are multiplicative components. Cameras and ordinary objects share these controls; model root transforms are separate from imported child-node transforms. `rotateResourceBy` adds angles; `copyResourceTransform` copies the selected transform or all TRS components. `lookObjectAt` aims the resource forward axis.

For packed cube groups, INDEX starts at 1. `setInstanceTransform` changes a member position, rotation or scale, and the matching reporter returns one component. `setInstancePosition` is the direct position form. Visibility affects rendering; it does not delete data or stop an attached physics body. Tint multiplies the material: RGB reporters use 0–255, alpha uses percent. Resource and member tint have distinct storage.

Existence is a quiet Boolean probe; kind is a namespace description; transform/tint reporters are numeric. Queries do not allocate geometry or issue GPU uploads. Valid edits mark only affected retained state dirty. Invalid or non-float32-representable final transforms are rejected before partial mutation. Deleting a root removes its attached physics body; attached audio stops/detaches. Delete instances before their shared model assets.

### setPosition

![set [NAME] position x [X] y [Y] z [Z]](../assets/blocks/setPosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setRotation

![set [NAME] rotation x [X] y [Y] z [Z]](../assets/blocks/setRotation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | angle; <code>0</code> | — |
| <code>Y</code> | angle; <code>0</code> | — |
| <code>Z</code> | angle; <code>0</code> | — |

### setScale

![set [NAME] scale x [X] y [Y] z [Z]](../assets/blocks/setScale.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>1</code> | — |

### rotateResourceBy

![rotate 3D resource [RESOURCE] by x [X] y [Y] z [Z] degrees](../assets/blocks/rotateResourceBy.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setInstancePosition

![set instance [INDEX] of [GROUP] position x [X] y [Y] z [Z]](../assets/blocks/setInstancePosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setInstanceTransform

![set instance [INDEX] of [GROUP] [PROPERTY] x [X] y [Y] z [Z] (rotation in degrees)](../assets/blocks/setInstanceTransform.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>PROPERTY</code> | string; <code>position</code> | <code>position</code>, <code>rotation</code>, <code>scale</code> |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### lookObjectAt

![point 3D resource [RESOURCE] toward x [X] y [Y] z [Z]](../assets/blocks/lookObjectAt.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### copyResourceTransform

![copy [PROPERTY] from [FROM] to [TO]](../assets/blocks/copyResourceTransform.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>all</code> | <code>position</code>, <code>rotation</code>, <code>scale</code>, <code>all</code> |
| <code>FROM</code> | string; <code>cube</code> | — |
| <code>TO</code> | string; <code>model1</code> | — |

### setResourceVisible

![set 3D resource [RESOURCE] visible [ENABLED]](../assets/blocks/setResourceVisible.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setResourceTint

![set 3D resource [RESOURCE] tint [COLOR] opacity [OPACITY] %](../assets/blocks/setResourceTint.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |
| <code>OPACITY</code> | number; <code>100</code> | — |

### setInstanceTint

![set instance [INDEX] of [GROUP] tint [COLOR] opacity [OPACITY] %](../assets/blocks/setInstanceTint.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |
| <code>OPACITY</code> | number; <code>100</code> | — |

### resourceExists

![3D resource [RESOURCE] exists?](../assets/blocks/resourceExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |

### resourceKind

![3D resource [RESOURCE] kind](../assets/blocks/resourceKind.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |

### resourceVisible

![3D resource [RESOURCE] visible?](../assets/blocks/resourceVisible.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |

### resourceTransform

![3D resource [RESOURCE] [PROPERTY] [AXIS] (rotation in degrees)](../assets/blocks/resourceTransform.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>PROPERTY</code> | string; <code>position</code> | <code>position</code>, <code>rotation</code>, <code>scale</code> |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### instanceTransform

![instance [INDEX] of [GROUP] [PROPERTY] [AXIS] (rotation in degrees)](../assets/blocks/instanceTransform.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>PROPERTY</code> | string; <code>position</code> | <code>position</code>, <code>rotation</code>, <code>scale</code> |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### resourceTint

![3D resource [RESOURCE] tint [COMPONENT] (RGB 0-255, alpha %)](../assets/blocks/resourceTint.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>COMPONENT</code> | string; <code>red</code> | <code>red</code>, <code>green</code>, <code>blue</code>, <code>alpha</code> |

### instanceTint

![instance [INDEX] of [GROUP] tint [COMPONENT] (RGB 0-255, alpha %)](../assets/blocks/instanceTint.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>COMPONENT</code> | string; <code>red</code> | <code>red</code>, <code>green</code>, <code>blue</code>, <code>alpha</code> |

### instanceGroupNumber

![instance group [GROUP] [PROPERTY] number](../assets/blocks/instanceGroupNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>cubes</code> | — |
| <code>PROPERTY</code> | string; <code>members</code> | <code>members</code> |

### deleteResource

![delete 3D resource [NAME]](../assets/blocks/deleteResource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

## Model assets and instances

Use importModelFile to select or drop a local GLB or self-contained glTF. Cancel and failed imports leave the name reusable; inspect lastError and modelState before retrying. Local selection does not embed the file in the SB3. The URL/data-URI loader and older local-file block remain supported. See [local importing](../model-import.md). Source loads yield until the asset settles. Check `modelState` (`loading`, `ready`, `error`, or `missing`) and `modelError` before creating instances. A local glTF file cannot automatically read neighboring files; embed dependencies or use a permitted URL. Network loads obey the host permission/CORS policy.

A model asset is shared immutable source data; a model instance owns root transform, node pose and animation playback. Bulk creation produces named instances using PREFIX plus one-based suffixes. `setModelNodePosition` edits an instance node, not the shared asset. Imported animation may subsequently drive that node. Asset node/skin/animation reporters describe imported metadata; they do not sample or render a pose.

Metadata node, skin, joint, animation and LOD indices are one-based; absent references report 0 or empty text. The legacy set-node-position command retains its zero-based NODE argument (default 0), so subtract 1 when converting a metadata index. It rejects matrix-authored nodes and instances with an assigned LOD group. Node children text is a comma-separated list of one-based indices. Morph target counts are metadata only: morph deformation is not rendered. Primitive/triangle/CPU-byte counts describe the asset, not current visible draws. Instance reporters distinguish base asset from active LOD asset and playback state.

Delete scene instances before deleting their asset; release LOD references too. Loading, deletion, reset and name reuse are fenced against stale asynchronous completion. No Draco/Meshopt decoder, arbitrary material extensions, imported cameras/lights or rendered morph targets are supplied. See [format limitations](../limitations.md).

### loadModelFromSource

![load glTF model [MODEL] from [SOURCE]](../assets/blocks/loadModelFromSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |
| <code>SOURCE</code> | string; <code>https://example.com/model.glb</code> | — |

### importModelFile

![import 3D model file as [MODEL]](../assets/blocks/importModelFile.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |

### loadModelFromFile

![load glTF model [MODEL] from local file](../assets/blocks/loadModelFromFile.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### createModelInstance

![create model instance [NAME] from [MODEL]](../assets/blocks/createModelInstance.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>robot1</code> | — |
| <code>MODEL</code> | string; <code>robot</code> | — |

### createModelInstances

![create [COUNT] instances of model [MODEL] named [PREFIX]](../assets/blocks/createModelInstances.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>COUNT</code> | number; <code>10</code> | — |
| <code>MODEL</code> | string; <code>robot</code> | — |
| <code>PREFIX</code> | string; <code>robot</code> | — |

### setModelNodePosition

![set node [NODE] of model instance [NAME] position x [X] y [Y] z [Z]](../assets/blocks/setModelNodePosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NODE</code> | number; <code>0</code> | — |
| <code>NAME</code> | string; <code>robot1</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### modelExists

![model [MODEL] exists?](../assets/blocks/modelExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelState

![state of model [MODEL]](../assets/blocks/modelState.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelError

![error of model [MODEL]](../assets/blocks/modelError.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelNodeCount

![node count of model [MODEL]](../assets/blocks/modelNodeCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelPrimitiveCount

![primitive count of model [MODEL]](../assets/blocks/modelPrimitiveCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelTriangleCount

![triangle count of model [MODEL]](../assets/blocks/modelTriangleCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelNodeText

![model [MODEL] node [INDEX] [PROPERTY] text](../assets/blocks/modelNodeText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>PROPERTY</code> | string; <code>name</code> | <code>name</code>, <code>parent</code>, <code>children</code> |

### modelNodeNumber

![model [MODEL] node [INDEX] [PROPERTY] number](../assets/blocks/modelNodeNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>PROPERTY</code> | string; <code>parent index</code> | <code>parent index</code>, <code>child count</code>, <code>mesh index</code>, <code>skin index</code>, <code>translation x</code>, <code>translation y</code>, <code>translation z</code> |

### modelSkinText

![model [MODEL] skin [INDEX] name](../assets/blocks/modelSkinText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |

### modelSkinNumber

![model [MODEL] skin [INDEX] [PROPERTY] joint [JOINT]](../assets/blocks/modelSkinNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>PROPERTY</code> | string; <code>joints</code> | <code>joints</code>, <code>skeleton node</code>, <code>joint node</code> |
| <code>JOINT</code> | number; <code>1</code> | — |

### modelInfoNumber

![model asset [MODEL] [PROPERTY] number](../assets/blocks/modelInfoNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>PROPERTY</code> | string; <code>skins</code> | <code>skins</code>, <code>morph targets (metadata only)</code>, <code>nodes</code>, <code>animations</code>, <code>primitives</code>, <code>scenes</code>, <code>users</code>, <code>cpu bytes</code> |

### modelInstanceText

![model instance [INSTANCE] [PROPERTY] text](../assets/blocks/modelInstanceText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>model1</code> | — |
| <code>PROPERTY</code> | string; <code>base asset</code> | <code>base asset</code>, <code>active lod asset</code>, <code>current animation</code>, <code>lod group</code> |

### modelInstanceNumber

![model instance [INSTANCE] [PROPERTY] number](../assets/blocks/modelInstanceNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>model1</code> | — |
| <code>PROPERTY</code> | string; <code>selected animation</code> | <code>selected animation</code>, <code>animation progress %</code>, <code>transition progress %</code>, <code>lod hysteresis</code>, <code>forced lod level</code>, <code>active lod level</code> |

### modelInstanceBoolean

![model instance [INSTANCE] [PROPERTY] ?](../assets/blocks/modelInstanceBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>model1</code> | — |
| <code>PROPERTY</code> | string; <code>animation looping</code> | <code>animation looping</code>, <code>lod enabled</code>, <code>lod assigned</code>, <code>transition active</code> |

### deleteModelAsset

![delete model asset [MODEL]](../assets/blocks/deleteModelAsset.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

## Visibility and LOD

Frustum culling is per-resource plus global policy. Disabling it keeps that resource out of ordinary frustum rejection, but does not disable every other visibility rule. Use visibility counters to distinguish candidates, tested bounds and accepted instances.

Build an LOD group from ready static assets, beginning at distance zero and adding strictly increasing thresholds. Assign it to a matching model instance, then choose automatic selection, a forced one-based level or an instance hysteresis distance. Hysteresis is measured in world units and reduces oscillation at thresholds. Level reporters return the asset name and threshold; current-level reporters describe selected retained state.

LOD swaps render assets while preserving the instance root. Arbitrary skinned asset swaps are unsupported. Clear assignments before deleting a referenced group or asset. LOD and visibility reuse retained bounds/spatial state; they do not justify changing image quality during a benchmark comparison without reporting that difference.

### setResourceFrustumCulling

![set frustum culling of [RESOURCE] [ENABLED]](../assets/blocks/setResourceFrustumCulling.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>robot1</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### resourceFrustumCullingEnabled

![frustum culling of [RESOURCE] enabled?](../assets/blocks/resourceFrustumCullingEnabled.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>robot1</code> | — |

### createLodGroup

![create LOD group [GROUP]](../assets/blocks/createLodGroup.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>robot lod</code> | — |

### addLodLevel

![add model [MODEL] to LOD group [GROUP] at distance [DISTANCE]](../assets/blocks/addLodLevel.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot low</code> | — |
| <code>GROUP</code> | string; <code>robot lod</code> | — |
| <code>DISTANCE</code> | number; <code>30</code> | — |

### assignModelLodGroup

![set LOD group of model instance [INSTANCE] to [GROUP]](../assets/blocks/assignModelLodGroup.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>GROUP</code> | string; <code>robot lod</code> | — |

### clearModelLodGroup

![clear LOD group of model instance [INSTANCE]](../assets/blocks/clearModelLodGroup.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### setModelLodEnabled

![set LOD of model instance [INSTANCE] [ENABLED]](../assets/blocks/setModelLodEnabled.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setModelLodHysteresis

![set LOD hysteresis of [INSTANCE] to [DISTANCE]](../assets/blocks/setModelLodHysteresis.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>DISTANCE</code> | number; <code>1</code> | — |

### forceModelLodLevel

![force LOD level of [INSTANCE] to [LEVEL]](../assets/blocks/forceModelLodLevel.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>LEVEL</code> | string; <code>auto</code> | — |

### modelLodGroup

![LOD group of [INSTANCE]](../assets/blocks/modelLodGroup.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### currentModelLodLevel

![current LOD level of [INSTANCE]](../assets/blocks/currentModelLodLevel.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### lodLevelText

![LOD group [GROUP] level [LEVEL] model](../assets/blocks/lodLevelText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>lod</code> | — |
| <code>LEVEL</code> | number; <code>1</code> | — |

### lodLevelNumber

![LOD group [GROUP] level [LEVEL] threshold](../assets/blocks/lodLevelNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>lod</code> | — |
| <code>LEVEL</code> | number; <code>1</code> | — |

### lodGroupLevelCount

![level count of LOD group [GROUP]](../assets/blocks/lodGroupLevelCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>robot lod</code> | — |

### lodGroupExists

![LOD group [GROUP] exists?](../assets/blocks/lodGroupExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>robot lod</code> | — |

### deleteLodGroup

![delete LOD group [GROUP]](../assets/blocks/deleteLodGroup.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GROUP</code> | string; <code>robot lod</code> | — |
