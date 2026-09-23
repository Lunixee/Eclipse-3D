# Geometry

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Custom geometry and model binding](#custom-geometry-and-model-binding)

## Custom geometry and model binding

Geometry JSON contains flat `positions` xyz and optionally zero-based `indices`, `normals` xyz, `uvs` xy, `colors` rgba and `tangents` xyzw. Each attribute must describe the same vertex count and every triangle must be complete. Missing normals are generated, UVs default to zero and colors to white. Optional minimum/maximum bounds must conservatively enclose the positions.

Choose `static` for immutable geometry; choose `dynamic` only when whole-definition replacement is needed. Updates validate transactionally. Equal-sized buffers are reused; changed vertex and index streams upload independently. There is no partial-range or arbitrary-layout API. Conservative padded bounds are required for shader displacement because CPU picking tests the undeformed positions.

Create a model asset from the geometry and an existing material, then use normal model instances. Reports expose counts, bytes, bounds, usage and borrowers. Delete instances, then model assets, then geometry. A named geometry owns a reference in addition to its consumers; the public users property excludes that ownership reference. See [custom rendering contract](../../CUSTOM_RENDERING.md).

### createCustomGeometry

![create [USAGE] geometry [GEOMETRY] data JSON [DATA]](../assets/blocks/createCustomGeometry.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>USAGE</code> | string; <code>static</code> | <code>static</code>, <code>dynamic</code> |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>DATA</code> | string; <code>{&quot;positions&quot;:[-1,-1,0,1,-1,0,0,1,0]}</code> | — |

### updateCustomGeometry

![replace dynamic geometry [GEOMETRY] data JSON [DATA]](../assets/blocks/updateCustomGeometry.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>DATA</code> | string; <code>{&quot;positions&quot;:[-1,-1,0,1,-1,0,0,1,0]}</code> | — |

### createGeometryModel

![create model [MODEL] from geometry [GEOMETRY] material [MATERIAL]](../assets/blocks/createGeometryModel.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>mesh</code> | — |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>MATERIAL</code> | string; <code>default</code> | — |

### customGeometryExists

![custom geometry [GEOMETRY] exists?](../assets/blocks/customGeometryExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |

### customGeometryNumber

![custom geometry [GEOMETRY] [PROPERTY] number](../assets/blocks/customGeometryNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>PROPERTY</code> | string; <code>vertices</code> | <code>vertices</code>, <code>indices</code>, <code>triangles</code>, <code>vertex bytes</code>, <code>index bytes</code>, <code>users</code>, <code>minimum x</code>, <code>minimum y</code>, <code>minimum z</code>, <code>maximum x</code>, <code>maximum y</code>, <code>maximum z</code> |

### customGeometryBoolean

![custom geometry [GEOMETRY] [PROPERTY] ?](../assets/blocks/customGeometryBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>PROPERTY</code> | string; <code>dynamic</code> | <code>dynamic</code> |

### customGeometryText

![custom geometry [GEOMETRY] [PROPERTY] text](../assets/blocks/customGeometryText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
| <code>PROPERTY</code> | string; <code>usage</code> | <code>usage</code> |

### deleteCustomGeometry

![delete custom geometry [GEOMETRY]](../assets/blocks/deleteCustomGeometry.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>GEOMETRY</code> | string; <code>triangle</code> | — |
