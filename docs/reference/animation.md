# Animation

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Clips, playback, blending and pose](#clips-playback-blending-and-pose)

## Clips, playback, blending and pose

Inspect a ready asset for clips by one-based index; names may be imported or generated. Duration/start/end are seconds and channel/sampler reports describe source metadata. Play a clip on a model instance, not on the shared asset. Different instances can play and blend independently.

Seek with time in seconds, choose playback speed and looping, or crossfade into another clip over a duration. Crossfades blend two clips; they are not an arbitrary animation graph. Pause retains the current pose/time for later resume. Stop ends playback; reset-pose explicitly restores the model pose. Use the separate playing, paused and finished flags rather than inferring state from time alone.

`animationProgress` returns a 0–1 fraction; the model-instance number family explicitly labeled animation progress % returns 0–100. Sampling and skinning advance once per authorized engine update, including when several cameras render the same update. Green Flag/Pause/Stop lifecycle rules still apply. GPU joint palettes are uploaded for changed poses; static paused poses reuse them. Rendered morph targets and arbitrary skinned LOD swaps are outside this contract.

### animationCount

![animation count of model [MODEL]](../assets/blocks/animationCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>robot</code> | — |

### animationName

![animation name [INDEX] of model [MODEL]](../assets/blocks/animationName.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>MODEL</code> | string; <code>robot</code> | — |

### animationDuration

![animation duration [CLIP] of model [MODEL]](../assets/blocks/animationDuration.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CLIP</code> | string; <code>1</code> | — |
| <code>MODEL</code> | string; <code>robot</code> | — |

### modelAnimationText

![model [MODEL] animation [INDEX] name](../assets/blocks/modelAnimationText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |

### modelAnimationNumber

![model [MODEL] animation [INDEX] [PROPERTY]](../assets/blocks/modelAnimationNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>MODEL</code> | string; <code>model</code> | — |
| <code>INDEX</code> | number; <code>1</code> | — |
| <code>PROPERTY</code> | string; <code>duration seconds</code> | <code>duration seconds</code>, <code>start seconds</code>, <code>end seconds</code>, <code>channels</code>, <code>samplers</code> |

### playAnimation

![play animation [CLIP] on model instance [INSTANCE] looping [LOOPING]](../assets/blocks/playAnimation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CLIP</code> | string; <code>1</code> | — |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>LOOPING</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setAnimationTime

![set animation time of [INSTANCE] to [SECONDS] seconds](../assets/blocks/setAnimationTime.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>SECONDS</code> | number; <code>0</code> | — |

### setAnimationSpeed

![set animation speed of [INSTANCE] to [SPEED]](../assets/blocks/setAnimationSpeed.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>SPEED</code> | number; <code>1</code> | — |

### setAnimationLooping

![set animation looping of [INSTANCE] to [LOOPING]](../assets/blocks/setAnimationLooping.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>LOOPING</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### crossfadeAnimation

![crossfade [INSTANCE] to animation [CLIP] over [SECONDS] seconds](../assets/blocks/crossfadeAnimation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
| <code>CLIP</code> | string; <code>2</code> | — |
| <code>SECONDS</code> | number; <code>0.25</code> | — |

### pauseAnimation

![pause animation on [INSTANCE]](../assets/blocks/pauseAnimation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### resumeAnimation

![resume animation on [INSTANCE]](../assets/blocks/resumeAnimation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### stopAnimation

![stop animation on [INSTANCE]](../assets/blocks/stopAnimation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### resetModelPose

![reset pose of model instance [INSTANCE]](../assets/blocks/resetModelPose.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### currentAnimation

![current animation of [INSTANCE]](../assets/blocks/currentAnimation.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationTime

![animation time of [INSTANCE]](../assets/blocks/animationTime.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationProgress

![animation progress of [INSTANCE]](../assets/blocks/animationProgress.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationPlaying

![animation playing on [INSTANCE]?](../assets/blocks/animationPlaying.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationPaused

![animation paused on [INSTANCE]?](../assets/blocks/animationPaused.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationFinished

![animation finished on [INSTANCE]?](../assets/blocks/animationFinished.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |

### animationSpeed

![animation speed of [INSTANCE]](../assets/blocks/animationSpeed.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>INSTANCE</code> | string; <code>robot1</code> | — |
