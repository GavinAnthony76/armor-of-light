# Painted combat: desktop engine verification

## Outcome — 2026-10-28

| Engine | Built web (`dist/`) | Self-contained offline (`file://`) |
|---|---|---|
| Chromium 152.0.7977.64 | Passed | Passed |
| Firefox 157.0 (Playwright patched desktop build) | Passed | Passed |
| WebKit 27.2 (Playwright Linux WPE build) | **Blocked before page creation** | **Blocked before page creation** |
| macOS Safari application | Not available; not tested | Not available; not tested |

**This is not Safari approval.** The WebKit browser process starts, but creating
a page terminates it with:

```text
Could not create EGL display: no supported platform available. Aborting...
BrowserContext.new_page: Target page, context or browser has been closed
```

Required libraries were installed through the project system-package setup.
The upstream WPE launcher replaces `LD_LIBRARY_PATH`, losing Nix dependencies;
the test runner supplies a generated launcher that preserves them without
modifying the downloaded browser. Software Mesa/EGL configuration still fails
before rendering. CPU/compositing environment alternatives also failed.
No WebKit decoding, pixels, warnings, residency or offline behavior can be
inferred from that startup. Use a supported desktop WebKit runner and macOS
Safari for the remaining approval, not Chromium screenshots or a user-agent
override.

No physical phone, mobile Safari, audio-fallback, audibility, scenery journey,
sling or combat-balance certification is included. No game rendering, combat,
physics, timing, attack definitions or asset bytes were changed by this work.

## What passed in Firefox and Chromium

Each engine ran the following independently on the **production web build** and
the actual self-contained HTML opened directly from disk, not the Vite source
server or an HTTP-hosted substitute for offline delivery.

- **360 sampled poses per edition** across six painted actors, both facings,
  phase-two timings and 5%, 50%, 95% progress. Covers move, spawn, stagger, hurt,
  dying, and windup/active/recover for every calibrated attack ID, including
  both lurker attacks, both sentinel thrusts and all three Warden actions.
- **Decoded alpha:** all six delivered PNGs contain transparent and opaque
  pixels, with zero nonzero hidden RGB in fully transparent pixels. This pack
  ships PNG bodies, not WebP bodies. Separately, the actual shipped
  `eliam-head` alpha WebP decoded with 18,699 transparent and 30,453 visible
  pixels in both editions/engines. This checks real decoding, not a support
  flag or file header.
- **Warden arms:** both texture draws follow real canvas clips and are followed
  by restore; native arm/fist shapes remain. Contact sheets show no square
  texture spill across sweep, slam and summon poses.
- **Seams:** contrasting cream/dark contact sheets include head/torso/leg
  articulation, damage and attack states. Reviewed Firefox Warden web and husk
  offline sheets against Chromium: no engine-specific detached body regions,
  opaque rectangular backgrounds or arm-texture leakage were visible. These
  are sampled visual checks, not an exhaustive pixel-perfect seam guarantee.
- **Damage brightness:** each of six body-only renders increases actual opaque
  pixel brightness by more than 20%; accepting a canvas filter property alone
  would not pass.
- **Exact-state warning layering:** nine damaging attack windups retain solid
  gold/red cue pixels relative to the original procedural rendering, including
  while the body flashes. Translucent glow is intentionally excluded from
  equality comparisons because it composites over different body silhouettes.
  `summon` deals zero damage and correctly has no attack warning. Unmapped
  exact attack IDs select full procedural fallback, never an idle painting.
- **Real missing file:** the isolated fixture points the Warden source at a
  genuinely absent file. The web host returns 404; the offline file is absent
  on disk. Complete fallback equals the original procedural actor, retaining
  the red warning. 120 draw/preload attempts produce **one image source
  assignment and one diagnostic**, not repeated reloads.
- **Reduced motion:** both browser media preference and game setting are
  enabled. The same pose/warning/brightness checks still pass; a held
  simulation pose is stable and changed stride/animation state still changes
  its rendered pose. Reduced motion does not freeze combat animation.
- **Image residency:** test-only rendering cache is 6,488,064 decoded bytes
  (six 512-square PNG bodies plus the WebP probe). The actual game renderer
  with all six enemies is 72,572,928–72,720,384 decoded bytes (69.21–69.35 MiB),
  below the 80 MiB calibration threshold. State changes and reduced motion
  leave cache diagnostics unchanged and trigger no new body loads.
  This measures the application's decoded-image accounting, not total browser
  RSS, GPU memory or physical-phone performance.
- **Offline isolation:** normal offline rendering makes **zero HTTP(S) requests**.
  The deliberately broken fixture is separate from that assertion.
- No application `pageerror` events occurred in the successful checks.

### Firefox local-file event limitation

Firefox reports the failed local image through `image.onerror` but emits
neither Playwright `request` nor `requestfailed` for that missing local file.
Chromium emits both. Consequently “zero requestfailed events” cannot mean
success or “no retry.” The test observes the native image source setter
without replacing it, requires exactly one assignment, checks the resulting
asset failure diagnostic and compares the complete fallback pixels. Web runs
additionally require exactly one actual request and an independently confirmed
HTTP 404. No browser route interception or fake image loader is used.

## Reproduction and evidence

```sh
# Python Playwright version is pinned in requirements-test.txt.
python3 -m playwright install firefox webkit
npm run build
npm run build:single
npm run test:enemy-engines

# Targeted successful desktop matrix:
python3 tests/painted-enemies-engines.py --engines chromium firefox

# Browser startup details when investigating the blocked engine:
DEBUG=pw:browser python3 tests/painted-enemies-engines.py --engines webkit
```

The runner builds a test-only IIFE using the existing esbuild installation.
It imports the actual production renderer, scene bindings, enemy definitions
and image loader, and uses the shipped edition's manifest. Its isolated
transparent canvases permit controlled pixel comparisons; it also captures
the running edition's own full-game renderer/cache with all six enemies and
samples state changes in that renderer. Fixtures never ship with the app.
The short-lived loopback static host is shut down after the check; it is not
another development workflow.

The default three-engine command intentionally exits **1** on this runner:
Chromium and Firefox pass, WebKit fails before page creation. It does not
silently skip an unavailable engine or label the overall matrix green.
Missing builds also fail rather than silently omitting offline checks.

Generated evidence is ignored under
`generated-artifacts/painted-enemy-engines/`:

- `results.json`: per-engine version/status, successful edition measurements,
  missing-file source assignments/events and failures.
- `<engine>-<edition>-<kind>.png`: complete contrasting-background contact
  sheets, including Warden sweep/slam/summon. Prefer these over the on-page
  gallery screenshot, which can be clipped by the game's fixed viewport.
- `<engine>-<edition>-game.png`, `-reduced.png`, `-missing.png`: game,
  reduced-motion and actual missing-file evidence.
- `run.log`: browser diagnostic launch output, including the EGL failure;
  `final-run.log`: concise last full-matrix outcome.

Related successful checks: `npm run build`, `npm run build:single`,
`npm run typecheck`, `npm run test:enemies`,
`npm run test:enemy-silhouettes`, and `npm run test:bundles`.
The original `tests/painted-enemies-browser.py` Chromium/Vite baseline is
retained unchanged; this runner extends its coverage without requiring
source imports from an offline file.
