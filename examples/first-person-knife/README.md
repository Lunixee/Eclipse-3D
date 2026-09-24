# First-Person Knife Demo

Explore a bright arena, with or without an optional animated arm/knife rig. The editable Scratch scripts demonstrate camera-relative models, animation crossfades, movement FOV, short-range ray hits, physics targets, particles, lighting, shadows and audio.

## Optional viewmodel

The arm/knife model is **not included**. It is a separately purchased third-party asset from **Low Poly FPS Starter Kit v1.1**, by **RGS_Dev**: [asset source](https://rgsdev.itch.io/low-poly-fps-starter-kit).

The demo is fully playable without the arms/knife model. If you own the asset, press **I** while playing to select your legally obtained **KnifeFPS.glb**. The paid pack is not part of Eclipse 3D. Its original files must not be redistributed with this project.

## Run

1. Open [first-person-knife.sb3](first-person-knife.sb3) in the TurboWarp web editor. See [local model importing](../../docs/model-import.md#portability) for Desktop and packaged-host caveats.
2. Approve the embedded Eclipse 3D custom extension.
3. Click Green Flag to start playing. No file picker opens automatically.
4. Click the stage to enable audio.

The HUD shows an optional-viewmodel note until a rig is loaded. Press **I**, then **Choose model file** to import it. Cancel leaves gameplay running; press **I** to retry. A successful import hides the note and selects the current movement or attack animation. Stop closes the prompt. Green Flag rebuilds the scene without a rig, so select the file again if you want the arms. The model stays in runtime memory and is not embedded when the project is saved.

| Control | Action |
| --- | --- |
| WASD | Walk |
| Arrow keys | Look |
| Shift / Q | Sprint |
| C / Control | Crouch; slide while sprinting |
| Space | Jump; slide-jump |
| F / click | Attack |
| R | Reset player and targets |
| 1–4 / 0 | Scene views / return to play |
| I | Load the optional KnifeFPS.glb viewmodel; retry after cancellation or failure |

Attacks use the rig's animation clock when loaded, or project time without it, with the same contact window and one hit per swing. Movement, melee hits, physics impulses, particles and audio work in either mode. The controller includes jump buffering, coyote time, crouching, sliding and movement-dependent FOV. Physics targets use Eclipse's translation-only box/sphere physics. Look input uses arrow keys; there is no pointer lock.

For a first edit, open the **MOVE PLAYER** custom block definition and change the walking value assigned to `target speed`. Click Green Flag and compare walking with sprinting.

See [asset credits](ASSET_CREDITS.md) for the included scenery and sounds, and [local model importing](../../docs/model-import.md) for importer behavior.
