# Sprites, Particles, Decals & Text

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Sprites and shared effect controls](#sprites-and-shared-effect-controls)
- [Particles](#particles)
- [Decals](#decals)
- [Text](#text)

## Sprites and shared effect controls

Sprites are world-space textured quads. Create the texture first, then the sprite. Size uses world units; custom pivots use normalized quad coordinates. Full, Y-axis, fixed and screen-aligned billboard modes choose how the quad faces the camera. Camera motion is handled by shared shader inputs rather than rebuilding per-sprite geometry.

The shared effect controls also apply to particles and decals where supported: visible, dimensions, tint, opacity, alpha mode, lighting and depth. The effect alpha-mode cutoff is a 0–1 threshold; material alpha-cutoff blocks use percent. `setEffectTint` brightness uses percent, while `setEffectNumber` brightness is the raw factor. Unlit effects are the default; lit effects use the existing lightweight light selection.

Atlas columns/rows define cells. Frame, first/last frame and directional-view indices are one-based. Play/pause/resume/stop controls update frame state in simulation, while directional mapping chooses among configured views. Frame queries distinguish requested/current rendered frame and selected directional frame. Cutout effects normally write depth; blended/additive effects normally do not. Transparent quads are not general order-independent transparency.

Effect kind/text/number/Boolean families expose retained resource state, not an image readback. Delete effects through the shared resource deletion block. The generic quad and named texture are shared, so transform or camera edits should not create a new texture.

### createSprite

![create sprite [NAME] using texture [TEXTURE]](../assets/blocks/createSprite.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>TEXTURE</code> | string; <code>image</code> | — |

### setEffectVisible

![set effect [NAME] visible [VISIBLE]](../assets/blocks/setEffectVisible.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>VISIBLE</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setEffectSize

![set effect [NAME] width [WIDTH] height [HEIGHT]](../assets/blocks/setEffectSize.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>WIDTH</code> | number; <code>2</code> | — |
| <code>HEIGHT</code> | number; <code>2</code> | — |

### setEffectTint

![set effect [NAME] tint [COLOR] opacity [OPACITY] brightness [BRIGHTNESS]](../assets/blocks/setEffectTint.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |
| <code>OPACITY</code> | number; <code>100</code> | — |
| <code>BRIGHTNESS</code> | number; <code>100</code> | — |

### setEffectAlphaMode

![set effect [NAME] alpha [MODE] cutoff [CUTOFF]](../assets/blocks/setEffectAlphaMode.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>MODE</code> | string; <code>blend</code> | <code>opaque</code>, <code>cutout</code>, <code>blend</code>, <code>additive</code> |
| <code>CUTOFF</code> | number; <code>0.5</code> | — |

### setEffectLighting

![set effect [NAME] lighting [MODE]](../assets/blocks/setEffectLighting.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>MODE</code> | string; <code>unlit</code> | <code>unlit</code>, <code>lit</code> |

### setEffectDepth

![set effect [NAME] depth test [TEST] write [WRITE]](../assets/blocks/setEffectDepth.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>TEST</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |
| <code>WRITE</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### setEffectNumber

![set effect [RESOURCE] [PROPERTY] to [VALUE]](../assets/blocks/setEffectNumber.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>sprite</code> | — |
| <code>PROPERTY</code> | string; <code>opacity %</code> | <code>opacity %</code>, <code>brightness</code> |
| <code>VALUE</code> | number; <code>1</code> | — |

### effectKind

![effect kind of [NAME]](../assets/blocks/effectKind.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### effectExists

![effect [NAME] exists?](../assets/blocks/effectExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### effectVisible

![effect [NAME] visible?](../assets/blocks/effectVisible.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### effectNumber

![effect [RESOURCE] [PROPERTY] number](../assets/blocks/effectNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>sprite</code> | — |
| <code>PROPERTY</code> | string; <code>width</code> | <code>width</code>, <code>height</code>, <code>pivot x</code>, <code>pivot y</code>, <code>opacity %</code>, <code>brightness</code>, <code>alpha cutoff %</code>, <code>sheet columns</code>, <code>sheet rows</code>, <code>frame</code>, <code>rendered frame</code>, <code>animation first frame</code>, <code>animation last frame</code>, <code>animation fps</code>, <code>animation time</code>, <code>directional views</code>, <code>facing degrees</code>, <code>roll degrees</code> |

### effectText

![effect [RESOURCE] [PROPERTY] text](../assets/blocks/effectText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>sprite</code> | — |
| <code>PROPERTY</code> | string; <code>alpha mode</code> | <code>alpha mode</code>, <code>lighting</code>, <code>texture</code>, <code>billboard mode</code> |

### effectBoolean

![effect [RESOURCE] [PROPERTY] ?](../assets/blocks/effectBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>sprite</code> | — |
| <code>PROPERTY</code> | string; <code>depth test</code> | <code>depth test</code>, <code>depth write</code>, <code>frame animation playing</code>, <code>frame animation paused</code>, <code>frame animation looping</code>, <code>frustum culling</code> |

### setSpriteBillboardMode

![set sprite [NAME] facing [MODE]](../assets/blocks/setSpriteBillboardMode.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>MODE</code> | string; <code>full</code> | <code>full</code>, <code>y-axis</code>, <code>fixed</code>, <code>screen-aligned</code> |

### spriteBillboardMode

![billboard mode of sprite [NAME]](../assets/blocks/spriteBillboardMode.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### setSpritePivot

![set sprite [NAME] pivot [PIVOT]](../assets/blocks/setSpritePivot.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>PIVOT</code> | string; <code>center</code> | <code>center</code>, <code>bottom-center</code>, <code>top-center</code> |

### setSpriteCustomPivot

![set sprite [NAME] custom pivot x [X] y [Y]](../assets/blocks/setSpriteCustomPivot.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>X</code> | number; <code>0.5</code> | — |
| <code>Y</code> | number; <code>0.5</code> | — |

### setSpriteSheet

![set sprite [NAME] sheet columns [COLUMNS] rows [ROWS]](../assets/blocks/setSpriteSheet.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>COLUMNS</code> | number; <code>4</code> | — |
| <code>ROWS</code> | number; <code>2</code> | — |

### setSpriteFrame

![set sprite [NAME] frame [FRAME]](../assets/blocks/setSpriteFrame.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>FRAME</code> | number; <code>1</code> | — |

### playSpriteFrames

![play sprite [NAME] frames [FIRST] to [LAST] at [FPS] FPS looping [LOOPING]](../assets/blocks/playSpriteFrames.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>FIRST</code> | number; <code>1</code> | — |
| <code>LAST</code> | number; <code>8</code> | — |
| <code>FPS</code> | number; <code>8</code> | — |
| <code>LOOPING</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### pauseSpriteFrames

![pause sprite animation [NAME]](../assets/blocks/pauseSpriteFrames.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### resumeSpriteFrames

![resume sprite animation [NAME]](../assets/blocks/resumeSpriteFrames.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### stopSpriteFrames

![stop sprite animation [NAME] reset [RESET]](../assets/blocks/stopSpriteFrames.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>RESET</code> | string; <code>off</code> | <code>on</code>, <code>off</code> |

### setSpriteDirectionalViews

![set sprite [NAME] directional views [COUNT] facing [ANGLE]](../assets/blocks/setSpriteDirectionalViews.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>COUNT</code> | number; <code>8</code> | — |
| <code>ANGLE</code> | angle; <code>0</code> | — |

### setSpriteDirectionalFrame

![map sprite [NAME] direction [DIRECTION] to frame [FRAME]](../assets/blocks/setSpriteDirectionalFrame.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |
| <code>DIRECTION</code> | number; <code>1</code> | — |
| <code>FRAME</code> | number; <code>1</code> | — |

### spriteCurrentFrame

![current frame of sprite [NAME]](../assets/blocks/spriteCurrentFrame.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>sprite</code> | — |

### spriteDirectionalFrame

![sprite [RESOURCE] direction [DIRECTION] frame](../assets/blocks/spriteDirectionalFrame.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>sprite</code> | — |
| <code>DIRECTION</code> | number; <code>1</code> | — |

## Particles

Create an emitter with an existing texture and an explicit particle capacity. Configure emission rate in particles/second, point/box/sphere spawn extents, velocity in world units/second, acceleration in units/second² and lifetime in seconds. Velocity spread can be set uniformly or per axis. Set a seed before emission for repeatable random sequences.

Size, color and alpha interpolate from start to end over each particle lifetime. Rotation uses degrees and angular speed degrees/second; sprite-sheet FPS controls particle frame animation. `burstParticles` spawns an immediate bounded count; continuous emission must be started explicitly. Increasing capacity reserves storage and is not a substitute for controlling lifetime/rate.

Stopping emission lets existing particles age out; pausing freezes the emitter; clearing removes active particles. Global Pause/Stop freezes shared simulation regardless of emitter flags. Numeric/text/Boolean reporters inspect configuration and active/emitting/paused state. Offscreen particles continue simulation, while instance packing/draws can be culled.

Particles are CPU simulated in dense typed storage and GPU instanced. There is no GPU simulation, collision, physics coupling or per-particle named object API. Reuse an emitter rather than recreate it every frame. Large capacities and blended screen coverage have separate CPU and GPU costs. See [Particles example](../../examples/particles/README.md).

### createParticleEmitter

![create particle emitter [NAME] texture [TEXTURE] maximum [MAXIMUM]](../assets/blocks/createParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>TEXTURE</code> | string; <code>image</code> | — |
| <code>MAXIMUM</code> | number; <code>1000</code> | — |

### setParticleEmissionRate

![set emitter [NAME] rate [RATE] per second](../assets/blocks/setParticleEmissionRate.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>RATE</code> | number; <code>100</code> | — |

### setParticleMaximum

![set emitter [NAME] maximum particles [MAXIMUM]](../assets/blocks/setParticleMaximum.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>MAXIMUM</code> | number; <code>1000</code> | — |

### setParticleSpawnShape

![set emitter [NAME] shape [SHAPE] extents x [X] y [Y] z [Z]](../assets/blocks/setParticleSpawnShape.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>SHAPE</code> | string; <code>point</code> | <code>point</code>, <code>box</code>, <code>sphere</code> |
| <code>X</code> | number; <code>1</code> | — |
| <code>Y</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>1</code> | — |

### setParticleVelocity

![set emitter [NAME] velocity x [X] y [Y] z [Z] spread [SPREAD]](../assets/blocks/setParticleVelocity.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>3</code> | — |
| <code>Z</code> | number; <code>0</code> | — |
| <code>SPREAD</code> | number; <code>1</code> | — |

### setParticleAcceleration

![set emitter [NAME] acceleration x [X] y [Y] z [Z]](../assets/blocks/setParticleAcceleration.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>-4</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setParticleLifetime

![set emitter [NAME] lifetime [MINIMUM] to [MAXIMUM] seconds](../assets/blocks/setParticleLifetime.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>MINIMUM</code> | number; <code>1</code> | — |
| <code>MAXIMUM</code> | number; <code>2</code> | — |

### setParticleSizeOverLife

![set emitter [NAME] size [START] to [END]](../assets/blocks/setParticleSizeOverLife.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>START</code> | number; <code>0.5</code> | — |
| <code>END</code> | number; <code>0</code> | — |

### setParticleAlphaOverLife

![set emitter [NAME] alpha [START] to [END] %](../assets/blocks/setParticleAlphaOverLife.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>START</code> | number; <code>100</code> | — |
| <code>END</code> | number; <code>0</code> | — |

### setParticleColorOverLife

![set emitter [NAME] color [START] to [END]](../assets/blocks/setParticleColorOverLife.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>START</code> | color; <code>#ffffff</code> | — |
| <code>END</code> | color; <code>#ff8000</code> | — |

### setParticleRotation

![set emitter [NAME] rotation [MINIMUM] to [MAXIMUM] angular speed [ANGULARMINIMUM] to [ANGULARMAXIMUM]](../assets/blocks/setParticleRotation.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>MINIMUM</code> | angle; <code>0</code> | — |
| <code>MAXIMUM</code> | angle; <code>360</code> | — |
| <code>ANGULARMINIMUM</code> | number; <code>-90</code> | — |
| <code>ANGULARMAXIMUM</code> | number; <code>90</code> | — |

### setParticleFrameRate

![set emitter [NAME] sprite-sheet FPS [FPS]](../assets/blocks/setParticleFrameRate.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>FPS</code> | number; <code>0</code> | — |

### setParticleSeed

![set emitter [NAME] random seed [SEED]](../assets/blocks/setParticleSeed.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |
| <code>SEED</code> | number; <code>1</code> | — |

### setParticleSpread

![set emitter [RESOURCE] spread x [X] y [Y] z [Z]](../assets/blocks/setParticleSpread.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>particles</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### startParticleEmitter

![start emitter [NAME]](../assets/blocks/startParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### stopParticleEmitter

![stop emitter [NAME]](../assets/blocks/stopParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### pauseParticleEmitter

![pause emitter [NAME]](../assets/blocks/pauseParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### resumeParticleEmitter

![resume emitter [NAME]](../assets/blocks/resumeParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### clearParticleEmitter

![clear emitter [NAME]](../assets/blocks/clearParticleEmitter.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### burstParticles

![burst [COUNT] particles from [NAME]](../assets/blocks/burstParticles.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>COUNT</code> | number; <code>100</code> | — |
| <code>NAME</code> | string; <code>particles</code> | — |

### activeParticleCount

![active particles in [NAME]](../assets/blocks/activeParticleCount.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### particleEmitterEmitting

![emitter [NAME] emitting?](../assets/blocks/particleEmitterEmitting.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### particleEmitterPaused

![emitter [NAME] paused?](../assets/blocks/particleEmitterPaused.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>particles</code> | — |

### particleNumber

![emitter [RESOURCE] [PROPERTY] number](../assets/blocks/particleNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>particles</code> | — |
| <code>PROPERTY</code> | string; <code>capacity</code> | <code>capacity</code>, <code>emission rate</code>, <code>minimum lifetime</code>, <code>maximum lifetime</code>, <code>spread x</code>, <code>spread y</code>, <code>spread z</code>, <code>spawn extent x</code>, <code>spawn extent y</code>, <code>spawn extent z</code>, <code>velocity x</code>, <code>velocity y</code>, <code>velocity z</code>, <code>acceleration x</code>, <code>acceleration y</code>, <code>acceleration z</code>, <code>start size</code>, <code>end size</code>, <code>start alpha %</code>, <code>end alpha %</code>, <code>minimum rotation degrees</code>, <code>maximum rotation degrees</code>, <code>minimum angular speed degrees</code>, <code>maximum angular speed degrees</code>, <code>particle frame rate</code>, <code>active particles</code> |

### particleText

![emitter [RESOURCE] [PROPERTY] text](../assets/blocks/particleText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>particles</code> | — |
| <code>PROPERTY</code> | string; <code>spawn shape</code> | <code>spawn shape</code>, <code>start color</code>, <code>end color</code> |

### particleBoolean

![emitter [RESOURCE] [PROPERTY] ?](../assets/blocks/particleBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>particles</code> | — |
| <code>PROPERTY</code> | string; <code>emitting</code> | <code>emitting</code>, <code>paused</code> |

## Decals

A decal is a textured surface-oriented quad, not a projector that clips onto arbitrary meshes. Position it, choose a normal and apply a small surface offset to avoid z-fighting. Width/height, tint, depth and alpha use the shared effect controls. Keep the supplied normal nonzero.

Lifetime and age use seconds. Expiry is retained state; the Boolean reporter indicates an expired decal. A decal follows simulation timing and does not keep aging while paused/stopped. It does not automatically follow a moving mesh unless the project updates its transform. Delete it through the resource deletion block.

### createDecal

![create surface decal [NAME] using texture [TEXTURE]](../assets/blocks/createDecal.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>decal</code> | — |
| <code>TEXTURE</code> | string; <code>image</code> | — |

### setDecalNormal

![set decal [NAME] normal x [X] y [Y] z [Z]](../assets/blocks/setDecalNormal.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>decal</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>1</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### setDecalOffset

![set decal [NAME] surface offset [OFFSET]](../assets/blocks/setDecalOffset.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>decal</code> | — |
| <code>OFFSET</code> | number; <code>0.01</code> | — |

### setDecalLifetime

![set decal [NAME] lifetime [SECONDS] seconds (0 persistent)](../assets/blocks/setDecalLifetime.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>decal</code> | — |
| <code>SECONDS</code> | number; <code>0</code> | — |

### decalNumber

![decal [RESOURCE] [PROPERTY] number](../assets/blocks/decalNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>decal</code> | — |
| <code>PROPERTY</code> | string; <code>surface offset</code> | <code>surface offset</code>, <code>lifetime</code>, <code>age</code>, <code>normal x</code>, <code>normal y</code>, <code>normal z</code> |

### decalBoolean

![decal [RESOURCE] [PROPERTY] ?](../assets/blocks/decalBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>RESOURCE</code> | string; <code>decal</code> | — |
| <code>PROPERTY</code> | string; <code>expired</code> | <code>expired</code> |

## Text

Create a named text label with content, a supported safe font, raster font size in pixels, resolution multiplier, world height and billboard mode. Text is rasterized signage on a quad, not extruded geometry. Set world position, size/pivot, color, alignment and optional background with text-specific controls.

Identical content/style definitions share a retained texture. Editing content/font/color/background/resolution can rerasterize; camera movement and label transforms do not. Automatic width preserves the raster aspect ratio. `textNumber` reports pixel font size/resolution or world dimensions, `textContent` returns text/font/alignment, and the Boolean family reports automatic width.

Unicode availability depends on the browser/system font fallback. Do not assume every platform has identical emoji/CJK appearance. Very high raster resolution consumes texture memory without adding geometry detail. Delete the text label with `delete3DText` to release its shared raster reference.

### create3DText

![create 3D text [NAME] text [TEXT] font [FONT] size [FONT_SIZE] resolution [RESOLUTION] height [HEIGHT] facing [MODE]](../assets/blocks/create3DText.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>TEXT</code> | string; <code>Hello 3D</code> | — |
| <code>FONT</code> | string; <code>sans-serif</code> | <code>sans-serif</code>, <code>serif</code>, <code>monospace</code>, <code>system-ui</code>, <code>Arial</code>, <code>Verdana</code>, <code>Georgia</code>, <code>Times New Roman</code>, <code>Courier New</code> |
| <code>FONT_SIZE</code> | number; <code>64</code> | — |
| <code>RESOLUTION</code> | number; <code>1</code> | — |
| <code>HEIGHT</code> | number; <code>1</code> | — |
| <code>MODE</code> | string; <code>full</code> | <code>full</code>, <code>y-axis</code>, <code>fixed</code>, <code>screen-aligned</code> |

### set3DText

![set 3D text [NAME] to [TEXT]](../assets/blocks/set3DText.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>TEXT</code> | string; <code>Updated</code> | — |

### set3DTextPosition

![set 3D text [NAME] position [X] [Y] [Z]](../assets/blocks/set3DTextPosition.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>2</code> | — |
| <code>Z</code> | number; <code>-5</code> | — |

### set3DTextSize

![set 3D text [NAME] width [WIDTH] height [HEIGHT]](../assets/blocks/set3DTextSize.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>WIDTH</code> | number; <code>3</code> | — |
| <code>HEIGHT</code> | number; <code>1</code> | — |

### set3DTextBillboard

![set 3D text [NAME] facing [MODE]](../assets/blocks/set3DTextBillboard.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>MODE</code> | string; <code>full</code> | <code>full</code>, <code>y-axis</code>, <code>fixed</code>, <code>screen-aligned</code> |

### set3DTextPivot

![set 3D text [NAME] pivot [PIVOT]](../assets/blocks/set3DTextPivot.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>PIVOT</code> | string; <code>center</code> | <code>center</code>, <code>bottom-center</code>, <code>top-center</code> |

### set3DTextColor

![set 3D text [NAME] color [COLOR]](../assets/blocks/set3DTextColor.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>COLOR</code> | color; <code>#ffffff</code> | — |

### set3DTextFont

![set 3D text [NAME] font [FONT] size [SIZE]](../assets/blocks/set3DTextFont.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>FONT</code> | string; <code>sans-serif</code> | <code>sans-serif</code>, <code>serif</code>, <code>monospace</code>, <code>system-ui</code>, <code>Arial</code>, <code>Verdana</code>, <code>Georgia</code>, <code>Times New Roman</code>, <code>Courier New</code> |
| <code>SIZE</code> | number; <code>64</code> | — |

### set3DTextAlignment

![set 3D text [NAME] alignment [ALIGNMENT]](../assets/blocks/set3DTextAlignment.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>ALIGNMENT</code> | string; <code>center</code> | <code>left</code>, <code>center</code>, <code>right</code> |

### set3DTextBackground

![set 3D text [NAME] background [COLOR] opacity [OPACITY] %](../assets/blocks/set3DTextBackground.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>COLOR</code> | color; <code>#000000</code> | — |
| <code>OPACITY</code> | number; <code>0</code> | — |

### set3DTextResolution

![set 3D text [NAME] resolution [RESOLUTION]](../assets/blocks/set3DTextResolution.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
| <code>RESOLUTION</code> | number; <code>1</code> | — |

### textContent

![3D text [TEXT] [PROPERTY] text](../assets/blocks/textContent.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXT</code> | string; <code>label</code> | — |
| <code>PROPERTY</code> | string; <code>text</code> | <code>text</code>, <code>font</code>, <code>alignment</code> |

### textNumber

![3D text [TEXT] [PROPERTY] number](../assets/blocks/textNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXT</code> | string; <code>label</code> | — |
| <code>PROPERTY</code> | string; <code>font size pixels</code> | <code>font size pixels</code>, <code>resolution</code>, <code>world width</code>, <code>world height</code> |

### textBoolean

![3D text [TEXT] [PROPERTY] ?](../assets/blocks/textBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>TEXT</code> | string; <code>label</code> | — |
| <code>PROPERTY</code> | string; <code>automatic width</code> | <code>automatic width</code> |

### delete3DText

![delete 3D text [NAME]](../assets/blocks/delete3DText.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>label</code> | — |
