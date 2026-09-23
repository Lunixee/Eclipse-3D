# Performance and measurement

Eclipse 3D retains shared resources and updates dirty state. Compatible geometry/material instances batch together; static bounds, visibility results, skinning data, shader programs and environment preprocessing are reused where their contracts allow. Optional physics/audio/custom caches are created on demand. Toolbox labels, branding and generated documentation add no render-loop work.

## Budget the right work

- **CPU:** scene edits, animation channels, active particles, physics candidates/contacts, visibility and command-driven raycasts.
- **GPU:** shaded pixels, transparency/overdraw, material features, shadow maps/filtering, local lights and post passes.
- **Memory/bandwidth:** texture dimensions/mipmaps, geometry, instance uploads, skin palettes and double-buffered render targets.
- **First-use work:** asset decode, uploads, shader compilation, environment preprocessing and initial target allocation.

Create resources during setup and reuse them. Keep geometry/materials shared when state permits batching. Use whole dynamic geometry replacement only when required. Warm representative material variants before measuring steady frames. Avoid repeated text raster edits, target resize and resource recreation in gameplay loops.

Only cast rays when gameplay needs a new result. Offscreen particles may still simulate. Physics uses an independent collision broad phase, and its box/sphere scope is deliberately bounded. Enabling optional features can add real work; a low draw count alone does not prove a cheap scene.

## Equivalent-quality comparisons

Use the [metrics reporters](reference/metrics-profiling-and-debug.md) to measure your project.

Match scene geometry, visible instances, resolution, DPR, antialiasing, material/lighting quality, shadows, LOD, post effects and adaptive behavior. State backend, browser/GPU, warmup and sample duration. Compare paired CPU frame distributions and raw p95/p99/max/outliers, not FPS alone. Capped host frame pacing can hide CPU headroom; GPU timer data can be noisy or unavailable. CPU headroom, visual equivalence, frame pacing and GPU time are separate findings.

Do not call one engine a universal winner from one scenario. Do not reduce render scale or effects silently to improve a result. Keep configuration and measured source versions with your own results.

## Reading metrics

The [Metrics, Profiling & Debug reference](reference/metrics-profiling-and-debug.md) separates eleven families. Read counters after relevant updates/renders, keep cumulative renderer-lifetime activity separate from last-render counters, and record warmup/recreation events. A quiet query does not force work to make a counter nonzero.

Use actual output dimensions and effective pixel ratio to confirm resolution. Use upload/compile counters to find avoidable first-use or mutation work. Use visibility candidates/tests/rejects to diagnose culling, and use contact overflow to identify a physics pressure limit. A build/integrity gate cannot establish frame pacing, audible output or visual equivalence.
