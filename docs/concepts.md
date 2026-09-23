# Scene concepts and conventions

## Coordinates and indices

World coordinates are right-handed: +X right, +Y up, and an unrotated camera/resource looks along -Z. Positions and dimensions use world units; choose a consistent scale for your project. Public Euler angles and FOV are degrees. Scale components multiply geometry dimensions. Local movement uses the current normalized right/up/forward basis.

Stage conversion uses logical Scratch stage coordinates, centered on the stage with +Y up. It is independent of physical render pixels, DPR and render scale. Use projection/picking blocks to move between stage and world; do not equate one world unit to one screen pixel.

Public instance, frame, model metadata, skin, joint, clip and terrain-grid indices are one-based. The older `setModelNodePosition` command deliberately retains its **zero-based NODE** argument; subtract 1 from a metadata node index when using that command. Geometry JSON indices are also zero-based. An absent indexed reference commonly returns 0 or empty text. The registered menu labels describe property-specific units. `animationProgress` is a 0–1 fraction; the property labeled animation progress % is percent.

Color pickers take sRGB hex colors. PBR lighting uses linear values internally; custom `color` uniforms are linear RGB after hex conversion. Raw vector uniforms do not perform sRGB conversion. Texture color-space controls distinguish color images from linear data maps. Opacity usually uses percent where the block says `%`; effect alpha-mode cutoff is a 0–1 threshold. Effect-tint brightness is percent, while the numeric brightness family uses a factor.

## Names and ownership

Names select retained resources. Use nonempty, deliberate names and do not repeatedly create the same name in a frame loop. Shared asset names differ from scene instance names. Choose the correct namespace in a block: a material setter does not address an object unless its signature explicitly says so.

| Owner | Resources |
| --- | --- |
| Engine | Scenes, shared geometry/model assets, textures, materials, environments, LOD definitions, targets, decoded audio/cache |
| Scene | Cameras, cube/groups, model instances, local-light instances, effects, terrain, text, tweens, optional physics world and audio sources |
| Instance | Root transform, visibility/tint, model pose/playback, LOD selection |

Shared consumers hold references. Delete scene instances before model assets, then release geometry/materials/textures once their borrowers are gone. Deleting a scene releases its own consumers; it does not arbitrarily delete shared assets still used by another scene. Existence probes are useful when a project intentionally allows optional resources.

## Lifecycle

| Action/state | Rendering | Simulation | Audio |
| --- | --- | --- | --- |
| Extension loaded, no Green Flag | Explicit static edits may redraw | Stopped | No automatic playback |
| Green Flag | Normal presentation | Active scene advances once per update | Explicit play/resume remains required |
| Runtime Pause | Static redraw may occur if something changes | Frozen, no catch-up on resume | Interrupted voices held; eligible voices resume on unpause |
| Stop All | Last image remains | Frozen, timing debt cleared | Voices held; a later explicit play/resume is required |
| Clicked palette/manual stack | Static commands still work | Does not authorize simulation | Cannot wake stopped playback |
| Extra camera/target render | Another view of retained state | Does not advance time again | No extra audio update loop |

Green Flag’s `PROJECT_START` event authorizes simulation. `PROJECT_RUN_START` can mean a manually clicked stack and does not. Only the active scene simulates. Switching scenes pauses old-scene sources. After a pause/stop, elapsed wall time is not replayed as a large simulation step.

`resetEngine` releases logical project resources and clears the output while retaining a usable backend. It is suitable at the beginning of repeatable setup. `disposeEngine` also tears down the backend and owned audio context; initialize again before rendering. Renderer replacement preserves CPU scene definitions and optional subsystem ownership. Command-generated target contents must be replayed after GPU recreation.

## State queries and errors

Typed property families read a fixed allowlist of retained state. They do not expose arbitrary object paths, create missing resources or start optional systems. Numbers remain finite; text stays text; Boolean blocks return true/false. Missing/invalid resources typically return `0`, `""` or `false` and record a diagnostic. Load-state reporters explicitly distinguish `missing` from `loading`, `ready` and `error`. Existence probes are quiet and return false for absent names.

Commands validate before publishing changes. Clear the last error, execute one suspect operation, then read the last error to isolate failures. For asynchronous loads also read the resource state/error, because a failure does not create a ready resource.

## Retained work

Static resources stay allocated and cached. Transform/material/source edits mark their relevant state dirty; the next update/render performs the required work. Shader source/schema changes differ from uniform edits. Texture changes differ from camera movement. Creating, deleting or resizing a resource may allocate; ordinary state reporters should not.

[Visual reference](reference/index.md) · [Performance](performance.md)
