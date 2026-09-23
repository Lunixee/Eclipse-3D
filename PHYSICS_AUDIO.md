# gameplay physics and Web Audio contract

adds optional translation-only gameplay physics and optional positional/global Web Audio. The implementation is intentionally smaller than an industrial rigid-body engine: it supports world-axis boxes and spheres, but not rotation dynamics, mesh collision, capsules, joints, CCD, character controllers, or advanced stacking. Physics has no renderer dependency, and neither subsystem owns a timer or animation frame loop.

## Physics ownership and body model

Each scene creates its `PhysicsWorld` only when the first physics command needs it. A named body is also its single collider and may be `static`, `kinematic`, or `dynamic`. Boxes use explicit full width/height/depth; spheres use an explicit radius. Dimensions and optional attachment offsets are world units and do not inherit mesh rotation, scale, animation, or geometry bounds. Invisible collision-only bodies need no renderable.

Dynamic bodies have finite mass and inverse mass, velocity, gravity scale, restitution, friction, and sleeping state. Static and kinematic bodies have infinite solver mass. Static bodies may be teleported but reject velocity. Kinematic bodies integrate explicitly assigned velocity without gravity; script teleports do not infer a surface velocity. The solver applies translation correction, normal impulses, low-speed restitution suppression, and bounded tangent friction. There is no angular inertia or torque.

Collision filtering is symmetric: `(A.layer & B.mask) != 0` and `(B.layer & A.mask) != 0` must both hold. Triggers/sensors record overlaps but never apply physical response. Box/box, sphere/sphere, and sphere/box tests include containment. Contact points are representative points rather than manifolds, and the normal returned for a queried body is its escape direction.

Contact states are `current`, `entered`, and `exited`. Indexed results are one-based. Enter/exit transitions aggregate across the engine update and remain available for one positive-delta update; current contacts remain retained while unchanged or asleep. Contact records are pooled with a hard capacity of 8,192 pairs. Overflow increments `contactOverflows`; immediate response still runs, but query/solver fidelity can be reduced under that pressure.

The physics broad phase is a dedicated 4-unit loose spatial grid, separate from renderer visibility. Dirty bodies update only their collision entries. Small AABB queries visit intersecting cells and deduplicate candidates; queries spanning more than 4,096 cells scan entries once. This makes representative sparse scenes dramatically cheaper than testing every pair, but no worst-case subquadratic claim is made for large overlapping or oversized scenes.

## Physics timing and attachments

Physics consumes the existing engine tick after tweens, animation, and effects. It uses semi-implicit fixed 1/60-second steps, up to six substeps per update, accepts at most 0.1 seconds of input time, and drops excess time. Rendering—including extra cameras and render targets—never advances physics. Only the active scene simulates.

Stop All and runtime pause freeze physics state and clear only fractional timing debt. TurboWarp emits `PROJECT_START` after the implicit Stop All in a Green Flag action; this event authorizes a session and establishes a fresh origin. `PROJECT_RUN_START` can also mean a clicked palette stack and is ignored. Runtime unpause establishes a fresh origin without authorizing a stopped session. The first tick after start/resume has zero delta, so paused/stopped wall time cannot become catch-up time. Repeated stop/start does not register listeners or advance more than once per engine tick. Projects start with shared simulation stopped; explicit static edits and render-target draws cannot wake physics.

A body can attach to one cube or model-instance root; an object can own at most one body. Manual object position changes teleport the body while retaining velocity. Dynamic/kinematic simulation writes the resulting position through ordinary object setters once per update. Object deletion deletes its attached body. Deleting the body leaves the visible object intact. Instance-group members, terrain, effects, bones, and animated child nodes are not attachment targets.

Coordinates, velocities, and offsets are bounded to +/-1,000,000; collider sizes are 0.0001..10,000. Rotation, scale, visibility, animated deformation, and renderer recreation do not change collider shapes. Fast or small bodies can tunnel because CCD/sweeps are not implemented. Existing visual ray queries do not include invisible physics bodies.

## Audio ownership and playback

One engine-owned `AudioSystem` lazily owns at most one browser `AudioContext` and a decoded-buffer cache. Merely loading Eclipse 3D, creating scenes, or creating the CPU audio store does not create a context. A byte load that needs decoding, play, or explicit unlock creates it. Packager/Desktop Scratch sounds reuse the buffer already decoded in Scratch's sound bank, so loading one does not create a second context or perform a redundant decode. Named assets sharing the same URL/data-URI/Scratch asset identity share one load/buffer entry. Sources retain assets, and in-use assets cannot be deleted.

Audio assets are complete browser-decodable buffers with encoded input limited to 64 MiB. Remote URLs follow `Scratch.canFetch`/`Scratch.fetch`; data URIs decode directly without a runtime fetch. Embedded Scratch sounds prefer the target sound bank's decoded player buffer and fall back to embedded `Uint8Array`, `ArrayBuffer`, typed-view, or Blob-like data when a host retains it. Input bytes are copied before `decodeAudioData`. Loads, reset, deletion, and name reuse are identity-fenced so stale async completion cannot republish deleted data, and failed loads settle in `error` rather than remaining `loading`.

Positional and global sources support play/restart, pause, resume, stop, loop, volume, playback rate (pitch and duration together), explicit position/direction, object attachment, inverse distance attenuation, reference/max distance, rolloff, and directional cone controls. Positional routing is persistent gain -> HRTF panner -> destination; global routing is gain -> destination. Only a one-use `AudioBufferSourceNode` is replaced for each play/resume. Native audio time tracks offsets, loop wrapping, and rate changes.

The listener follows the active camera position, forward direction, and up direction. With no camera it uses origin, -Z forward, and +Y up. Playing positional sources update listener/attached transforms only after relevant root/camera changes. Attached orientation follows the root; attachment does not target bones. Explicit source position detaches the source. Deleting an attached object captures its last root position, stops and detaches the source, and leaves the named source available. Deleting a source never deletes its visible object.

Runtime pause also captures offsets and stops ephemeral voices, marking only those interrupted voices for automatic continuation on runtime unpause. Explicit source pause/stop/deletion, scene switching and Stop All clear that marker. Audio play/resume while shared simulation is stopped or paused is rejected using the existing diagnostic wording; it cannot start the engine clock. The native context can remain running while voices are held, but source offsets and audible playback do not advance. No new audio context, independent timer or global listener is introduced.

Renderer replacement preserves bodies, sources, decoded buffers, and live nodes. Project reset releases scene consumers, aborts loads, and clears assets/cache while reusing an already-created context. Final engine disposal also closes the context. Occlusion, reverb, mixer buses/sends, doppler, streaming media elements, resampling codecs, and playback-completion hats are deferred.

## Block surface

API version 18 adds 31 canonical blocks while preserving every frozen schema and all blocks.

Physics (16): `createPhysicsBox`, `createPhysicsSphere`, `setPhysicsVector`, `setPhysicsGravity`, `setPhysicsNumber`, `setPhysicsTrigger`, `setPhysicsFilter`, `attachPhysicsBody`, `deletePhysicsBody`, `physicsTouching`, `physicsContactCount`, `physicsContactName`, `physicsContactNumber`, `physicsBodyNumber`, `physicsBodySleeping`, and `physicsMetric`.

Audio (15): `loadAudioURL`, `loadAudioSound`, `createAudioSource`, `controlAudioSource`, `setAudioNumber`, `setAudioLoop`, `setAudioVector`, `attachAudioSource`, `deleteAudioSource`, `deleteAudioAsset`, `audioSourceState`, `audioSourceNumber`, `audioAssetState`, `unlockAudio`, and `audioMetric`.
