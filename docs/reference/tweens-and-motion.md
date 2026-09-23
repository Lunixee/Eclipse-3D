# Tweens & Motion

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Local and camera-relative motion](#local-and-camera-relative-motion)
- [Tweens](#tweens)

## Local and camera-relative motion

Move an object in its own right/up/forward basis, or along a chosen camera basis while preserving the object’s orientation. Object-basis reporters return normalized components. Positive forward follows the resource’s forward direction, which is -Z before rotation.

Local movement edits logical root transforms and invalidates the affected retained state. It is not a velocity or a character controller: use a time-scaled distance in a running script, a tween for a duration, or physics velocity when collision response is required. Body attachments follow the established manual-teleport contract.

### moveObjectLocal

![move [NAME] [BASIS] by [DISTANCE]](../assets/blocks/moveObjectLocal.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>BASIS</code> | string; <code>forward</code> | <code>forward</code>, <code>right</code>, <code>up</code> |
| <code>DISTANCE</code> | number; <code>1</code> | — |

### objectBasisComponent

![[NAME] [BASIS] [AXIS]](../assets/blocks/objectBasisComponent.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>BASIS</code> | string; <code>forward</code> | <code>forward</code>, <code>right</code>, <code>up</code> |
| <code>AXIS</code> | string; <code>z</code> | <code>x</code>, <code>y</code>, <code>z</code> |

### moveResourceByCamera

![move [RESOURCE] by camera [CAMERA] [AXIS] [DISTANCE]](../assets/blocks/moveResourceByCamera.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>cube</code> | — |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>AXIS</code> | string; <code>forward</code> | <code>forward</code>, <code>right</code>, <code>up</code> |
| <code>DISTANCE</code> | number; <code>1</code> | — |

## Tweens

Tween root position, Euler rotation, scale or camera FOV over seconds with the selected easing. One active tween exists per resource/property; starting another replaces it. Rotation follows the shortest Euler path. A zero duration applies the final value immediately after validation.

Pause/resume retains progress; stop cancels the selected tween. Active/paused flags and progress-percent reporters describe retained tween state, not elapsed wall time while paused. Tweens run once per authorized active-scene update and freeze with shared Pause/Stop. Extra renders do not advance them. Resource deletion releases its tweens; direct edits and physics attachments should be coordinated so two systems do not fight over the same position.

### tweenResourcePosition

![tween [NAME] position to [X] [Y] [Z] over [SECONDS] seconds [EASING]](../assets/blocks/tweenResourcePosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>-5</code> | — |
| <code>SECONDS</code> | number; <code>1</code> | — |
| <code>EASING</code> | string; <code>ease-in-out</code> | <code>linear</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code>, <code>smoothstep</code> |

### tweenResourceRotation

![tween [NAME] rotation to [X] [Y] [Z] degrees over [SECONDS] seconds [EASING]](../assets/blocks/tweenResourceRotation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | angle; <code>0</code> | — |
| <code>Y</code> | angle; <code>90</code> | — |
| <code>Z</code> | angle; <code>0</code> | — |
| <code>SECONDS</code> | number; <code>1</code> | — |
| <code>EASING</code> | string; <code>ease-in-out</code> | <code>linear</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code>, <code>smoothstep</code> |

### tweenResourceScale

![tween [NAME] scale to [X] [Y] [Z] over [SECONDS] seconds [EASING]](../assets/blocks/tweenResourceScale.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>1</code> | — |
| <code>SECONDS</code> | number; <code>1</code> | — |
| <code>EASING</code> | string; <code>ease-in-out</code> | <code>linear</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code>, <code>smoothstep</code> |

### tweenCameraFov

![tween camera [CAMERA] FOV to [FOV] over [SECONDS] seconds [EASING]](../assets/blocks/tweenCameraFov.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>FOV</code> | number; <code>75</code> | — |
| <code>SECONDS</code> | number; <code>1</code> | — |
| <code>EASING</code> | string; <code>ease-in-out</code> | <code>linear</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code>, <code>smoothstep</code> |

### pauseTween

![pause tweens on [NAME]](../assets/blocks/pauseTween.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

### resumeTween

![resume tweens on [NAME]](../assets/blocks/resumeTween.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

### stopTween

![stop tweens on [NAME]](../assets/blocks/stopTween.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

### tweenActive

![[NAME] has active tween?](../assets/blocks/tweenActive.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>cube</code> | — |

### tweenNumber

![tween on [NAME] [PROPERTY] number](../assets/blocks/tweenNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>main</code> | — |
| <code>PROPERTY</code> | string; <code>position progress %</code> | <code>position progress %</code>, <code>rotation progress %</code>, <code>scale progress %</code>, <code>fov progress %</code> |

### tweenBoolean

![tween on [NAME] [PROPERTY] ?](../assets/blocks/tweenBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>main</code> | — |
| <code>PROPERTY</code> | string; <code>position paused</code> | <code>position paused</code>, <code>rotation paused</code>, <code>scale paused</code>, <code>fov paused</code> |
