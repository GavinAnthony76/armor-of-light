# Physical lower-memory scenery evidence (#30)

Status: pending a physical device session. Browser viewport sizes, synthetic
pressure textures, and logical decoded-byte diagnostics are not device evidence.
No physical device was connected during this revision.

Use the room/restart/pressure order in `SCENERY_RESIDENCY.md`. Keep the same
shipping pack, 96 MiB cache ceiling, 80 MiB active-scene target, and one page.
Record device model, physical RAM, OS build, browser/version, power/thermal state,
viewport/orientation, game commit, pack version, and instrument/version. Begin
with other browser tabs closed; record any remaining background workload.

1. Record idle browser-process memory and a fresh surface room. Use the platform's
   browser/process profiler (Safari Web Inspector/Instruments on Apple hardware,
   or Chrome/Android browser process profiling on Android). Note exactly which
   browser/content/GPU processes and metrics are included. RSS, private memory
   and GPU allocations are different metrics; do not sum shared mappings as
   independent allocations or infer backing-store release from JS heap alone.
2. Run three seven-land sweeps: surface → upper → lower → surface; use the real
   pause-menu restart; lower → upper → surface. Record frame intervals and
   renderer duration after warm-up, memory at each land, and visible stutters.
3. Apply the existing seven distinct 2048-square test textures through the QA
   harness, without reducing the shipping budget. Observe actual evictions.
4. Run both seven-land recovery sweeps. Record the same-room before/after pacing,
   logical cache diagnostics and process/GPU measurements. Continue observing
   after a short idle period to distinguish delayed cleanup from retained growth.
5. Capture a short device recording plus profiler trace covering pressure and
   recovery. Repeat the warm recovery once if apparent growth needs explanation.

Report the range and drift of matched-room p95 values, worst stalls, maximum
logical residency, reload/eviction counts, process memory at baseline/warm/
pressure/recovery/idle, and any thermal throttling or OS tab termination. A
browser restart or page reload invalidates the single-session comparison; retain
it as a failed run rather than combining separate sessions. Do not claim a
universal locked 60 FPS or immediate GPU memory release from a passing logical
cache test. Attach raw traces and device details before closing #30.
