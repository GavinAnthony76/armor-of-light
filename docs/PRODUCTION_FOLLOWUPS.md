# Production follow-ups — October 28, 2026

Starting source: `d33f190b9bb9b672a6551517ec121eca7593c7d0` (`main`, Copy remaining
project tasks into docs). Work branch: `fix/production-followups`. No repository
AGENTS.md was present. The baseline passed `npm test`, `test:art`, `test:title`,
`build`, `build:single` and `test:bundles` before the implementation changes.

The hero/main-menu painting and animation are intentionally deferred. The
possible Castlevania NES combat direction is a future design decision; this
revision changes no attack definition, weapon statistics, input binding,
movement, hitbox, warning window, enemy encounter or campaign layout.

## Task disposition

| Task | Implementation and evidence | Remaining requirement |
| --- | --- | --- |
| #17 Sound fallback | Shared engine selection, actual shipped codec audits, cold synth/later WAV render checks, corrupt/unsupported/stalled/all-failed sources, built web and offline editions; bounded decoder deadline | Chromium/WebKit hosted codec suites passed; stock Firefox decoded all exports but the first job incorrectly gated on a live audio device; follow-up separates that check. Actual Safari/hardware audio remain unverified |
| #18 Fuller recordings | Exact event-envelope inventory and approval/provenance/listening handoff in `RECORDING_REVIEW.md` | Actual new masters and owner approval; synthesized cues retained |
| #24 Offline scenery | Actual file:// self-contained edition with networking disabled, all six painted lands × surface/lower, decoded dimensions/alpha, final-framebuffer differences, playable missing-art fallback | Browser evidence is desktop Firefox, not physical phones |
| #29 Sustained scenery | Same seven-land, one-page schedule can run in Chromium/Firefox/WebKit; reports include engine/version; unavailable engines fail explicitly | Hosted Chromium and Firefox full soaks passed; hosted WebKit result pending. Local Firefox large-viewport pacing failure retained below |
| #30 Physical memory/pacing | Reproducible instrumentation and evidence handoff in `PHYSICAL_SCENERY_QA.md` | Physical lower-memory device, process/GPU measurements and traces; not simulated here |
| #31 Calibration | Development-only source/band/pivot/material overlays; 24 actors, eight mirrored motion previews, exact attack durations, local file inspection and validated settings export | Visual acceptance of any future replacement remains a separate owner decision |
| #32 Pack reinstall | Source/dimension identity snapshots, immediate cancellation of replaced/removed loads, safe late callbacks, accurate byte accounting, failed-source repair and unchanged-cache preservation | Same URL/dimensions do not detect changed file bytes; use versioned source paths |

`REMAINING_TASKS.md` retains the original external-task snapshot. This report
records repository implementation status, not automatic closure of that external
project task list.

## Actual local checks

- Full `npm test` (including enemy posttests), `npm run test:art`, and
  `npm run test:title` passed. Focused production checks subsequently passed
  **86** assertions (73 baseline plus 13 reinstall/decode-deadline regressions).
  Calibration validation/immutability adds nine checks; embedded-map resolution
  adds four. Existing combat-feel,
  campaign, weapon, action, traversal, save and title placement suites passed.
- `npm run typecheck`, `npm run build`, `npm run build:single`, and
  `npm run test:bundles` passed; **181** bundle/reference checks. Standalone
  remains about 14.3 MiB, below the existing 20 MiB target. Web and YouTube entry
  points build; actual GitHub Pages and YouTube host execution was not tested.
- Firefox **157.0**, Playwright **1.64.1**: web AND offline sound editions each
  decoded all **18** real OGG/WAV exports. Four forced codec-failure scenarios
  each rendered immediate synthesized output and the correct later event,
  including WAV after a stalled preferred decoder and synthesis after total
  failure. No delayed replay, request storm or offline sidecar requests.
- Firefox audio needed executor-only in-process media/null-backend preferences
  and sandbox environment flags described in `APPROVED_STARTER_SFX.md`. Its live
  AudioContext stayed suspended; the report explicitly marks live unlock as
  **not verified**. Actual PCM/synth graph measurements use OfflineAudioContext.
  This is codec evidence, not stock-process sandbox or hardware listening proof.
- Firefox offline scenery: **12** rooms, actual dimensions/alpha, visible final
  pixels and **six** playable missing-embedded-entry cases passed with networking blocked
  and zero sidecar requests. Captured all surface/lower views and fallbacks.
- Firefox calibration: all **24** actors, both directions and attack phases,
  invalid bounds/transparent material rejection, actual local source selection,
  wrong-size source rejection, exported settings and 390-pixel portrait layout
  passed. Source overlay/pose contact sheet was visually inspected.
- Local Firefox sustained scenery: an HMR-interrupted run and a contaminated
  timing run were rejected. The final isolated executor run also failed after
  147 samples / 649.41 seconds: garden upper-room renderer p95 70.5 → 117.0 ms,
  above the unchanged limit. All three normal sweeps held 38 loads / 73.33 MiB;
  the assertion stopped that local run before pressure/recovery. This is a real
  retained local failure, not a claim of universal smoothness or a phone result.
- Hosted run [40716903611](https://github.com/GavinAnthony76/armor-of-light/actions/runs/40716903611),
  immutable runtime source `6a548e3`: Chromium passed all browser suites and the
  full **217-room / 17,463-frame** soak. Stock Firefox passed offline scenery,
  calibration and the **217-room / 17,511-frame** soak. Each achieved **38**
  evictions and **27** successful reloads with no additional loads in recovery
  two. Same-room pacing thresholds passed on those hosted runners.
- The first hosted Firefox sound step decoded all 18 exports and rendered its
  four web fallback scenarios, then failed an over-broad live-unlock assertion
  (`suspended` without an audio device). The follow-up test makes that separate
  hardware criterion opt-in with `REQUIRE_LIVE_AUDIO=1`; it still records the
  live-context outcome. Both editions must still pass actual PCM/codec graph
  assertions. Hosted Chromium/WebKit sound suites passed. The follow-up CI and
  hosted WebKit full-soak result are still pending at this commit.
- WebKit **27.2 / build 2370** was downloaded but could not launch: required GTK4,
  Graphene, AVIF, Enchant, Manette, Secret, Hyphen and GLES libraries are absent.
  The attempted dependency install failed in this executor. Reports mark it
  unavailable and return nonzero. Chromium's available download endpoints
  returned truncated archives. Neither engine is claimed passed locally.

Reports, screenshots and raw logs are ignored outputs under
`generated-artifacts/approved-sfx/`, `painted-lands-offline/`,
`guardian-calibration/`, and `scenery-journey/`. The new `Production browser
regressions` GitHub workflow runs all three engines on a dependency-equipped
Ubuntu runner and uploads those outputs even on failure. See the hosted results above; a passing Chromium job does not stand in for the
other engines. Actual Safari, physical-device and target-host execution remain
separate from those loopback/file:// CI runs.

## Using and reviewing the changes

`npm ci`, then `npm run dev`; open `/tests/guardian-calibration.html` for the
calibration tool. See `GUARDIAN_CALIBRATION.md` for its export/acceptance process.
The tool is not included in production entry points. Existing painted-enemy
rendering, gear, warnings, source contracts and production material validation
remain the source of truth. An absent embedded-map entry now resolves to an empty local data payload, so
missing images/audio fail locally without file or network sidecars. Normal play
still uses complete procedural fallback
when a source is missing or not ready.

The image manager's issues list remains historical diagnostic evidence across
reinstalls; `failed` is the current failure count. Changed/repaired entries clear
current failure suppression, not history. Only `src/assets.ts`, `src/production/assets.ts` and
`src/production/samples.ts` change the game runtime in this pass; other code is
browser QA and authoring infrastructure. Budgets remain 96 MiB cache, 80 MiB
active scene and 32 MiB decoded SFX. Logical accounting does not certify backing
store release; #30 remains open for real-device evidence.
