# Audio

[Reference index](index.md) · [Conventions and lifecycle](../concepts.md)

- [Assets and source playback](#assets-and-source-playback)

## Assets and source playback

Load a complete browser-decodable URL/data-URI audio buffer or a sound from the current Scratch target. Embedded Scratch sounds reuse Scratch’s decoded sound-bank buffer where available. Create a named positional or global source from a ready asset. Sources retain assets; delete sources before assets.

Play/restart, pause, resume and stop are explicit actions. Loop and volume/rate are per-source settings; playback rate changes pitch and duration together. Positional sources use distance/cone attenuation and follow the active camera listener. Source position/direction and object attachments are separate from visual geometry. Setting explicit source position detaches it from an object.

Browser autoplay policy may leave audio `blocked`; run `unlockAudio` from an accepted user gesture and retry playback. Green Flag starts shared simulation but does not silently restart old voices. Stop All holds offsets; runtime Pause resumes only the voices it interrupted when unpaused. Playing from a stopped palette stack does not wake simulation.

Asset reports expose loading/ready/error state, duration, channels, sample rate, users and error text. Source reports expose playback state, numeric controls/offset, mode, asset and attachment. Listener reporters read the named camera basis without creating audio work. One lazy engine audio context/cache is shared. No occlusion, reverb, routing buses, streaming, doppler or completion hats are supplied. See [Physics & Audio example](../../examples/physics-audio/README.md).

### loadAudioURL

![load audio asset [ASSET] from URL or data URI [URL]](../assets/blocks/loadAudioURL.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |
| <code>URL</code> | string; <code>data:audio/wav;base64,</code> | — |

### loadAudioSound

![load audio asset [ASSET] from this sprite sound [SOUND]](../assets/blocks/loadAudioSound.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |
| <code>SOUND</code> | string; <code>sound</code> | — |

### unlockAudio

![unlock 3D audio](../assets/blocks/unlockAudio.svg)

**Command.** See the group guide above.

### createAudioSource

![create [MODE] audio source [NAME] asset [ASSET]](../assets/blocks/createAudioSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>ASSET</code> | string; <code>sound</code> | — |
| <code>MODE</code> | string; <code>positional</code> | <code>positional</code>, <code>global</code> |

### setAudioNumber

![set audio source [NAME] [PROPERTY] [VALUE]](../assets/blocks/setAudioNumber.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>volume</code> | <code>volume</code>, <code>rate</code>, <code>refDistance</code>, <code>maxDistance</code>, <code>rolloff</code>, <code>coneInner</code>, <code>coneOuter</code>, <code>coneGain</code> |
| <code>VALUE</code> | number; <code>1</code> | — |

### setAudioLoop

![set audio source [NAME] loop [ENABLED]](../assets/blocks/setAudioLoop.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>ENABLED</code> | string; <code>on</code> | <code>on</code>, <code>off</code> |

### setAudioVector

![set audio source [NAME] [PROPERTY] x [X] y [Y] z [Z]](../assets/blocks/setAudioVector.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>position</code> | <code>position</code>, <code>direction</code> |
| <code>X</code> | number; <code>0</code> | — |
| <code>Y</code> | number; <code>0</code> | — |
| <code>Z</code> | number; <code>0</code> | — |

### attachAudioSource

![attach audio source [NAME] to object [OBJECT]](../assets/blocks/attachAudioSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>OBJECT</code> | string; <code>cube</code> | — |

### controlAudioSource

![[ACTION] audio source [NAME]](../assets/blocks/controlAudioSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>ACTION</code> | string; <code>play</code> | <code>play</code>, <code>pause</code>, <code>resume</code>, <code>stop</code> |

### audioAssetExists

![audio asset [ASSET] exists?](../assets/blocks/audioAssetExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |

### audioAssetState

![audio asset [ASSET] state](../assets/blocks/audioAssetState.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |

### audioAssetNumber

![audio asset [ASSET] [PROPERTY] number](../assets/blocks/audioAssetNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |
| <code>PROPERTY</code> | string; <code>duration seconds</code> | <code>duration seconds</code>, <code>channels</code>, <code>sample rate hz</code>, <code>users</code> |

### audioAssetText

![audio asset [ASSET] [PROPERTY] text](../assets/blocks/audioAssetText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |
| <code>PROPERTY</code> | string; <code>state</code> | <code>state</code>, <code>error</code> |

### audioSourceExists

![audio source [SOURCE] exists?](../assets/blocks/audioSourceExists.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SOURCE</code> | string; <code>source</code> | — |

### audioSourceState

![audio source [NAME] state](../assets/blocks/audioSourceState.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |

### audioSourceNumber

![audio source [NAME] [PROPERTY]](../assets/blocks/audioSourceNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>time</code> | <code>time</code>, <code>duration</code>, <code>volume</code>, <code>rate</code>, <code>refDistance</code>, <code>maxDistance</code>, <code>rolloff</code>, <code>coneInner</code>, <code>coneOuter</code>, <code>coneGain</code> |

### audioSourceText

![audio source [SOURCE] [PROPERTY] text](../assets/blocks/audioSourceText.svg)

**Returns text.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SOURCE</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>mode</code> | <code>mode</code>, <code>object</code>, <code>asset</code>, <code>error</code> |

### audioSourceBoolean

![audio source [SOURCE] [PROPERTY] ?](../assets/blocks/audioSourceBoolean.svg)

**Returns boolean.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SOURCE</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>looping</code> | <code>looping</code>, <code>attached</code> |

### audioSpatialNumber

![audio source [SOURCE] [PROPERTY] number](../assets/blocks/audioSpatialNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>SOURCE</code> | string; <code>source</code> | — |
| <code>PROPERTY</code> | string; <code>position x</code> | <code>position x</code>, <code>position y</code>, <code>position z</code>, <code>direction x</code>, <code>direction y</code>, <code>direction z</code> |

### audioListenerNumber

![camera [CAMERA] listener [PROPERTY] number](../assets/blocks/audioListenerNumber.svg)

**Returns number.** Selectors and units are listed below; the family guide explains which retained state is read.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>CAMERA</code> | string; <code>main</code> | — |
| <code>PROPERTY</code> | string; <code>position x</code> | <code>position x</code>, <code>position y</code>, <code>position z</code>, <code>forward x</code>, <code>forward y</code>, <code>forward z</code>, <code>up x</code>, <code>up y</code>, <code>up z</code> |

### deleteAudioSource

![delete audio source [NAME]](../assets/blocks/deleteAudioSource.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>NAME</code> | string; <code>source</code> | — |

### deleteAudioAsset

![delete audio asset [ASSET]](../assets/blocks/deleteAudioAsset.svg)

**Command.** See the group guide above.

| Argument | Input / default | Accepted menu choices |
| --- | --- | --- |
| <code>ASSET</code> | string; <code>sound</code> | — |
