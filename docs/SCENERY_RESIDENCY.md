# Sustained seven-land scenery check

Run against the running development workflow (Playwright and Chromium required):

```sh
BASE="https://$REPLIT_DEV_DOMAIN" npm run test:scenery-journey
```

`SWEEPS` defaults to 3 (minimum 3); `FRAMES` defaults to 90 (minimum 60).
`VIEWPORT` can be `desktop` (1280×720), `portrait` (390×844), or
`landscape` (844×390). Reports and the final screenshot go to the ignored
`generated-artifacts/scenery-journey/<viewport>/` directory.

## What this verifies

- One browser context and **one page navigation** for the entire run.
- All seven lands, in campaign order, three times. Each visit positions the
  player at surface, upper, lower and surface locations, then uses the real
  pause-menu Restart button and revisits lower, upper and surface locations.
- Physics is paused at each test location to isolate scenery from combat and
  accidental deaths. The real animation loop, renderer, decorative animation,
  level creation and UI handlers are retained. This is a scenery soak, not an
  end-to-end traversal or combat test.
- Every render is checked for the unchanged **96 MiB decoded-cache ceiling**
  and **80 MiB active-scene target**. Normal travel additionally keeps total
  cached residency within 80 MiB. Images required for that room must be resident
  and pending loads must settle before timing.
- Diagnostics distinguish first loads, reloads, evictions, pending images,
  failed images, visible bytes and peak cache residency. Failed requests,
  HTTP errors, page errors and asset issues all fail the run.
- After the first full sweep, later warm sweeps must have identical cache
  residency and no additional image loads.
- Real renderer duration and wall-clock frame intervals are sampled after
  15 warm-up frames in each room. Reports contain sample counts, median, p95,
  maximum and counts above 50 ms. Same-land/same-room p95 timings are compared
  between warm sweeps and again after eviction recovery. A regression exceeding
  both 50% and the noise allowance (2 ms render / 8 ms interval) fails.

## Why there is a separate pressure phase

The installed art catalog fits below the cache ceiling. Repeated travel alone
does not prove that eviction and re-decoding work. The test therefore serves
seven distinct, test-only 2048×2048 PNGs through browser request interception,
preloads them through the real asset manager and requires actual evictions.
It does **not** reduce the production budget, replace paintings or change
shipping manifest files.

Two more full seven-land recovery sweeps must reload evicted scenery
successfully, preserve frame pacing, and stabilize with no further loads in
the second recovery sweep. Pressure textures are not marked visible; they
consume cache residency, not the active-scene allowance.

## Limits of this evidence

Decoded bytes are the asset manager's `width × height × 4` accounting for
resident images, **not** browser-process RSS, GPU memory or proof that a browser
immediately releases all evicted backing stores. Render time measures the
JavaScript renderer call; it does not include asynchronous GPU work. Frame
intervals include scheduling and runner noise. Relative stability is not a
universal 60 FPS claim.

Chromium browser emulation does not certify physical phones or desktop Safari.
Audio, combat balance, guardian painting and offline/missing-pack fallbacks
are outside this test.

## Recorded run — 2026-10-28

Chromium 152.0.7977.64, desktop 1280×720, development preview, `SWEEPS=3`
and `FRAMES=60`. Total elapsed time: **308.86 seconds**.

| Check | Result |
| --- | --- |
| Navigation / restarts | One page navigation, 35 real pause-menu restarts |
| Coverage | 217 room samples; 17,606 real rendered frames |
| Normal warm residency | 73.33 MiB; 38 loads after the first sweep, unchanged in sweeps two and three |
| Maximum active-scene residency | 62.70 MiB (target: 80 MiB) |
| Maximum cache residency under pressure | 95.98 MiB (ceiling: 96 MiB) |
| Eviction recovery | 38 evictions, 27 successful reloads; no additional loads in the second recovery sweep |
| Image failures / asset issues / page errors | Zero |
| Matched-room pacing checks | All 84 comparisons passed, including post-pressure recovery |

Normal-travel room render p95 values ranged from **7.7–18.7 ms**; room
frame-interval p95 values ranged from **16.8–24.7 ms**. Recovery values ranged
from **7.7–19.4 ms** and **16.8–24.1 ms**, respectively. Across timed samples
there were zero render calls over 50 ms and one frame interval over 50 ms
(53 ms). Median room p95 render times were 13.4 ms before pressure and 13.7 ms
during recovery. There was no progressive slowdown within the stated
same-room tolerances; this is not a claim of a locked 60 FPS on every frame.

The final cache still contained one 16 MiB test pressure texture, which explains
why post-pressure total residency can exceed normal-travel residency without
violating either the cache ceiling or the visible-scene target.

Also passed: `npm test`, `npm run build`, `npm run typecheck`,
`node --import tsx tests/painted-lands.ts`, and Python syntax compilation.
The final lower-room scene was visually checked in the running preview.
