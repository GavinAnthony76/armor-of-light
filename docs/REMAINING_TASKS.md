# Remaining project tasks

Snapshot of the seven open project tasks on **October 28, 2026**. “Draft” means
the task is proposed and has not yet started. The project task list remains the
live source of status; this document is a copy of the task titles, descriptions
and dependencies at the time of writing.

## Task #17 — Catch sound fallback failures in Safari and Firefox

**Status:** Draft
**Depends on:** Task #16

Extend the automated codec and fallback checks from `tests/approved-sfx-browser.py`
to desktop Safari/WebKit and Firefox. Decode the actual OGG/WAV exports, force
unsupported/corrupt preferred codecs, verify immediate synthesis and later WAV
playback, and test the offline single-file edition. Keep this separate from the
existing real-phone combat/audio testing task; this is repeatable cross-browser
regression coverage, not hardware listening. Relevant files:
`src/production/samples.ts`, `tests/approved-sfx-browser.py`,
`tests/single-file.mjs`, `docs/APPROVED_STARTER_SFX.md`.

## Task #18 — Add fuller gate and victory recordings

**Status:** Draft
**Depends on:** Task #16

Obtain user-approved fuller gate, guardian-defeat and victory recordings for the
existing gate, bossDown and clear Sfx keys. The starter gate-open and boss-down
drafts are too short to replace the current melodic envelopes and were
intentionally left unused; the synthesized cues remain functional. Review
actual recordings for event fit, ownership, transients, tail length, mix and
codec alternatives before updating the production manifest. Preserve adaptive
synthesized music and immediate fallback; do not invent new events. Relevant
files: `docs/APPROVED_STARTER_SFX.md`, `docs/PRODUCTION_ASSET_INTEGRATION.md`,
`src/audio/audio.ts`, `public/assets/production/asset-manifest.json`.

## Task #24 — Catch painted scenery failures in offline browser play

**Status:** Draft
**Depends on:** Task #19

Add a real-browser offline smoke test for the self-contained output generated
by `tests/single-file.mjs`. Existing `tests/verify-bundles.mjs` validate
embedded references, while `tests/painted-lands-browser.py` checks the running
web build. Open `dist-single/armor-of-light.html` with networking blocked, enter
all six new painted lands and their lower rooms, and verify visible scenery,
correct decoded dimensions/alpha, no sidecar requests and playable missing-art
fallback. Use `generated-artifacts` for screenshots/results; do not change
gameplay or broaden into the separate audio compatibility task.

## Task #29 — Check long scenery sessions in Safari and Firefox

**Status:** Draft
**Depends on:** Task #23

Run the sustained seven-land, single-page scenery journey in Firefox and
desktop Safari/WebKit, focusing on decoded-image eviction recovery and same-room
frame pacing rather than combat. Extend `tests/scenery-journey-browser.py` with
engine selection while preserving the 96 MiB cache ceiling and 80 MiB
active-scene target. Record engine/version and distinguish WebKit emulation
from desktop Safari. See `docs/SCENERY_RESIDENCY.md` for methodology and
generated report locations; existing combat cross-browser checks do not
establish sustained scenery residency.

## Task #30 — Confirm scenery stays smooth on lower-memory devices

**Status:** Draft
**Depends on:** Task #23

Measure sustained seven-land scenery residency and frame pacing on lower-memory
physical devices, separate from combat/audio phone testing. The logical
decoded-byte diagnostics in `src/production/assets.ts` do not prove
browser/GPU backing stores are released after eviction. Use
`tests/scenery-journey-browser.py` and `docs/SCENERY_RESIDENCY.md` as the
repeatable room/restart schedule, collect browser-process memory and visible
pacing before and after pressure, and document device/browser details. Preserve
96 MiB cache and 80 MiB active-scene budgets; do not claim emulation is
real-device evidence.

## Task #31 — Preview replacement guardian art before accepting it

**Status:** Draft
**Depends on:** Task #26

Add a development-only calibration preview for replacement guardian paintings.
Show the source cutout with band/pivot and material-rectangle overlays, alongside
animated move/windup/active/recover previews in both directions. Read the
optional metadata from `src/production/types.ts` and
`src/production/enemy-presentation.ts`, and export validated manifest settings
without changing gameplay or creating artwork. Relevant files:
`src/render/painted-enemy.ts`, `src/production/manifest.ts`,
`public/assets/production/asset-manifest.json`,
`docs/PAINTED_ENEMY_BODIES.md`. This would make calibration possible without
repeatedly editing JSON and restarting a scene.

## Task #32 — Avoid stale paintings when reloading an art pack

**Status:** Draft
**Depends on:** Task #26

`ProductionAssets.install` currently replaces the manifest without invalidating
already decoded or failed image entries. Reinstalling a pack that changes an
image source under the same ID can therefore retain the old painting or a prior
missing-file result until page reload. Define and test safe reinstall semantics
in `src/production/assets.ts`: invalidate changed source/dimensions and pending
work, preserve unchanged resident assets, clear relevant failed entries, and
keep decoded-byte accounting and per-image material validation correct. Cover
changed same-ID sources, failure followed by repaired source, in-flight
replacements and unchanged images in `tests/production.ts`. Normal first-load
behavior and procedural fallback must remain unchanged.

## Repository follow-up

Implementation, measured browser results, runner limitations and remaining
recording/physical-device requirements for this snapshot are tracked in
[PRODUCTION_FOLLOWUPS.md](PRODUCTION_FOLLOWUPS.md). The table there distinguishes
implemented work from pending evidence; the original external task descriptions
above are retained for comparison.
