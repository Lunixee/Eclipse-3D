# Scene

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Engine and scene lifecycle](#engine-and-scene-lifecycle)

## Engine and scene lifecycle

Initialize once with `automatic`, create a named scene, then create a camera and choose it. Scene creation establishes logical state; initialization connects the renderer to the Scratch stage. Names identify retained resources, so initialize a repeatable Green Flag script with `resetEngine` before recreating names. A scene owns its cameras, objects, effects, terrain, physics and source instances; model assets, geometry, materials, textures and decoded audio are shared by the engine.

`setActiveScene` changes which scene renders and simulates. It pauses audio in the old scene. Background opacity controls compositing over the Scratch backdrop. Scene text queries return the current name, active camera, environment or colors; numeric queries return the selected retained count or value in the menu. `sceneExists` and `engineInitialized` are quiet Boolean probes.

`renderOneFrame` requests static presentation; it does not start simulation. Green Flag authorizes simulation, Pause freezes it, and Stop All leaves the last image while stopping time. Manually clicking a stack can edit that image without waking animation, physics, particles or audio. `deleteScene` releases its consumers; `resetEngine` clears project resources while retaining the usable renderer; `disposeEngine` also tears down the backend and owned audio context. Reinitialize after disposal. See [lifecycle](../concepts.md#lifecycle).

### initializeEngine

![initialize 3D engine using [BACKEND]](../assets/blocks/initializeEngine.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>BACKEND</code> | string; <code>auto</code> | automatic (<code>auto</code>), shared WebGL 2 (prototype) (<code>shared-webgl2</code>), separate canvas (<code>separate-canvas</code>) |

### createScene

![create 3D scene [SCENE]](../assets/blocks/createScene.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SCENE</code> | string; <code>world</code> | — |

### setActiveScene

![set active 3D scene [SCENE]](../assets/blocks/setActiveScene.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SCENE</code> | string; <code>world</code> | — |

### setSceneBackground

![set scene background [COLOR] opacity [OPACITY] %](../assets/blocks/setSceneBackground.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>COLOR</code> | color; <code>#000000</code> | — |
| <code>OPACITY</code> | number; <code>100</code> | — |

### sceneExists

![3D scene [SCENE] exists?](../assets/blocks/sceneExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SCENE</code> | string; <code>world</code> | — |

### sceneText

![scene [PROPERTY] text](../assets/blocks/sceneText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>name</code> | <code>name</code>, <code>active camera</code>, <code>environment</code>, <code>background color</code>, <code>ambient color</code> |

### sceneNumber

![scene [PROPERTY] number](../assets/blocks/sceneNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>PROPERTY</code> | string; <code>background opacity %</code> | <code>background opacity %</code>, <code>ambient intensity</code>, <code>render resources</code>, <code>instance groups</code>, <code>model instances</code>, <code>effects</code>, <code>local lights</code>, <code>physics bodies</code>, <code>audio sources</code> |

### engineInitialized

![3D engine initialized?](../assets/blocks/engineInitialized.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

### renderOneFrame

![render one 3D frame](../assets/blocks/renderOneFrame.svg)

**Command.** See the group guide above.

### deleteScene

![delete 3D scene [SCENE]](../assets/blocks/deleteScene.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SCENE</code> | string; <code>world</code> | — |

### resetEngine

![reset 3D engine](../assets/blocks/resetEngine.svg)

**Command.** See the group guide above.

### disposeEngine

![dispose 3D engine](../assets/blocks/disposeEngine.svg)

**Command.** See the group guide above.
