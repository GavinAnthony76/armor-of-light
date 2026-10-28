# Skip scenery that is completely covered

Starting commit: `286a3d4ab7568cc2726ad05e594d39accb5bd532` (latest shared
`main` when fetched). Work branch: `fix/integration-followups`.
Baseline `npm test` including posttests and `npm run build` passed before edits.

The renderer previously drew the complete legacy background before painting an
opaque production sky or lower room over it. A local Firefox 157 profile of
120 warm frames at 1280×720 placed garden legacy background drawing at 24.78 ms
per frame, out of 42.33 ms total. This is avoidable drawing work, not evidence
that the legacy background is leaking memory.

The renderer now skips that hidden background only when an actual resident
background image has fully opaque decoded pixels, its depth/opacity is exactly
one, and its drawing bounds cover the viewport. Layer bounds are shared with
the drawing path. Cold, transparent, unreadable, fading or incompletely covering
images retain the complete original background. Alpha is inspected once per
decoded image object; reinstall and eviction recovery naturally receive a fresh
inspection. Pixel buffers are temporary; the cache retains only a boolean in
a WeakMap. No texture copies or new resident canvases are retained.

Parallax layers, weather, atmosphere, terrain, foreground, enemies, Eliam and his
hammer continue to draw. No combat, campaign, save or menu code changed. Existing
96 MiB decoded-image and 80 MiB active-scene limits remain unchanged; these
counters do not establish physical GPU/process memory release.

## Verification

- Full unit/posttest, art and title suites passed, as did typechecking,
  production/YouTube entry builds, standalone generation and 181 bundle checks.
- Production tests now include 13 opacity/culling checks (99 total production
  assertions): cold fallback, aspect ratios, reduced motion, alpha, depth fades,
  missing edges, foreground rejection, source replacement and unreadable pixels.
- Firefox exact framebuffer comparisons passed for all seven lands at desktop,
  390×844 portrait and 844×390 landscape sizes, at upper/surface/transition/lower
  depths: 84 comparisons, zero differing channels. 63 cases skipped hidden
  backgrounds; 21 retained the legacy background at each land's actual fade
  interval. The test forces the old
  rendering path for the reference without changing scenery or gameplay data.
- Initial separate 120-frame profiles measured total mean render time from
  26.20 to 18.54 ms in desert upper and 42.33 to 19.87 ms in garden upper.
  P95 changed from 31 to 24 ms and 51 to 33 ms respectively. These short local
  software-rendered Firefox measurements are directional evidence, not a
  physical-phone performance guarantee or a long-session acceptance result.

Run `ENGINE=firefox npm run test:background-occlusion` for exact comparisons.
Run `ENGINE=firefox python3 tests/scenery-profile-browser.py`, then repeat with
`FORCE_LEGACY_BACKGROUND=1`, for diagnostic method timings on the same tree.
Method wrappers add measurement overhead; their nested times must not be summed.
The browser workflow also runs exact comparisons in Chromium and WebKit.
Raw JSON and screenshots live under ignored `generated-artifacts/` outputs.

The unchanged sustained scenery test remains the acceptance check for progressive
slowdown and eviction recovery. Previous Chromium post-pressure and local Firefox
pacing failures remain historical evidence; this optimization alone does not
close #29 or establish #30. Fuller approved recordings (#18) and real-device
memory/audio evidence still require their respective inputs and measurements.

The new isolated local Firefox 157 soak failed after 147 room samples and 396.10
seconds, before the pressure phase: River surface mean-of-samples render p95
42.0 → 76.67 ms exceeded the unchanged tolerance. All three normal sweeps held
38 loads and 73.33 MiB warm residency. This retained failure is separate from
the short profile improvement; stable logical memory does not establish its
cause or certify smoothness. No repeat soak was used to replace that result.

Hosted [run 40768673034](https://github.com/GavinAnthony76/armor-of-light/actions/runs/40768673034)
on runtime commit `d0e497e` passed sound, offline scenery and calibration in all
three engines at the time of this note; long-session and framebuffer job results
were still pending. The follow-up only strengthens the framebuffer fixture to
sample each land's distinct transition depth and makes captures use the compared
canvas. It changes no runtime code. PR #13 remains draft pending those results.
