# Camera

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Camera selection and projection](#camera-selection-and-projection)
- [Camera movement and basis](#camera-movement-and-basis)

## Camera selection and projection

A perspective camera is a scene resource with a name, vertical field of view, near plane and far plane. Create it before selecting it or changing projection. Move it with the shared position/rotation blocks in Models & Objects. `lookCameraAt` aims its forward axis at a world point; coincident targets preserve a valid orientation.

FOV uses degrees (clamped to 1–179). Near/far clipping uses positive world-space distance; keep far greater than near. An unnecessarily large far/near ratio wastes depth precision and can worsen z-fighting. `cameraNumber` reports the selected FOV or clipping distance, rather than a matrix. Selecting a camera also selects the positional-audio listener. Projection changes invalidate the view without rebuilding geometry.

### createCamera

![create camera [NAME] field of view [FOV]](../assets/blocks/createCamera.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>main</code> | — |
| <code>FOV</code> | number; <code>60</code> | — |

### setActiveCamera

![set active camera [NAME]](../assets/blocks/setActiveCamera.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>main</code> | — |

### lookCameraAt

![point camera [CAMERA] at world [X] [Y] [Z]](../assets/blocks/lookCameraAt.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setCameraFov

![set camera [CAMERA] FOV [FOV]](../assets/blocks/setCameraFov.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>FOV</code> | number; <code>60</code> | — |

### changeCameraFov

![change camera [CAMERA] FOV by [AMOUNT]](../assets/blocks/changeCameraFov.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>AMOUNT</code> | number; <code>5</code> | — |

### setCameraClip

![set camera [CAMERA] [PLANE] clip [DISTANCE]](../assets/blocks/setCameraClip.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>PLANE</code> | string; <code>near</code> | <code>near</code>, <code>far</code> |
| <code>DISTANCE</code> | number; <code>0.1</code> | — |

### cameraNumber

![camera [CAMERA] [PROPERTY] number](../assets/blocks/cameraNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>PROPERTY</code> | string; <code>fov degrees</code> | <code>fov degrees</code>, <code>near clip</code>, <code>far clip</code> |

## Camera movement and basis

Local camera movement uses its current right, up and forward basis; positive forward moves along the viewing direction. Rotation inputs are degrees. Use the axis menus on basis and point-ahead reporters to assemble a vector without JSON parsing. `pointAheadOfCamera` returns one world coordinate at the supplied distance, including the camera position.

Basis vectors are normalized. Keep world translation separate from local motion when implementing orbit or fly controls. These are command-driven edits and cached CPU queries: they do not cast rays or render a frame on their own. Stage/world projection helpers are in Raycasting & Picking.

### moveCameraLocal

![move camera [CAMERA] [BASIS] by [DISTANCE]](../assets/blocks/moveCameraLocal.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>BASIS</code> | string; <code>forward</code> | <code>forward</code>, <code>right</code>, <code>up</code> |
| <code>DISTANCE</code> | number; <code>1</code> | — |

### rotateCamera

![rotate camera [CAMERA] [AXIS] by [DEGREES] degrees](../assets/blocks/rotateCamera.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>AXIS</code> | string; <code>yaw</code> | <code>yaw</code>, <code>pitch</code> |
| <code>DEGREES</code> | number; <code>5</code> | — |

### cameraBasisComponent

![camera [CAMERA] [BASIS] [AXIS]](../assets/blocks/cameraBasisComponent.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>BASIS</code> | string; <code>forward</code> | <code>forward</code>, <code>right</code>, <code>up</code> |
| <code>AXIS</code> | string; <code>z</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### pointAheadOfCamera

![point [DISTANCE] ahead of camera [CAMERA] [AXIS]](../assets/blocks/pointAheadOfCamera.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>DISTANCE</code> | number; <code>1</code> | — |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>AXIS</code> | string; <code>x</code> | <code>x</code>, <code>y</code>, <code>z</code> |
