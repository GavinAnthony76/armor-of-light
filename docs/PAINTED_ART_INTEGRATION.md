# Painted Eliam and living scenery

The user authorized recreating missing production art from the supplied Game
Asset Bible direction on 2026-10-27, and clarified that environmental animation
while standing still is a key goal. The uploaded HD ZIP remains a concept
reference, not a source of animation-ready sprites.

## Delivered presentation

- Eliam uses a body-only painted animation, selected by live state and combo
  phase through the production manifest. See ELIAM_PAINTED_PACK.md for cells,
  pose sampling and export notes. Procedural hands, shield, weapons, cloth,
  trails and fallback remain active. Initial overlay calibration revealed the
  old helmet/plume protruding around the painted face. The assembled pack
  therefore selects the supported `replace` mode for the calibrated body only,
  hiding procedural legs/torso/head once the image is ready. Missing/unloaded
  files still draw the complete original body. This is presentation-only, not
  a new rig or altered combat pose.
- Desert sunset, transparent aqueduct, underground archive and masonry are
  packaged through `public/assets/production/asset-manifest.json`. New paintings
  are generated reconstructions, not falsely labeled external artist exports.
  Source art follows the uploaded dark-ink, warm-lit painted fantasy reference.
- Delivery scenery is cropped (not stretched) from generated 1024-square
  source paintings to 1024 × 640. The source is not upscaled to claim additional
  detail. Midground retains real alpha, including arch gaps.
- Sky, midground and restrained near decoration have independent parallax
  rates (.035/.28/.85); archive .12. The architecture stays rigid. Surface
  imagery ends before world-foot Y=720; the archive appears over 500–700 and
  covers the floor at Y=900. Depth selection is not tied to screen aspect.
- A separately painted transparent palm prop bends subtly about a measured
  source base `(256,508)` at four surface locations; its trunk stays rooted.
  Decorative prop sway is validated, bounded and disabled by reduced motion.
- Added clouds, wing-flapping distant birds, drifting dust, garden/river
  fireflies, water ripples and archive shafts move on presentation time even
  with a stationary player. Plants sway about their root rather than moving
  their floor position. Desert braziers flicker and shed rising sparks.
  Settled weapon discoveries gently bob with orbiting glints.
- Decorative scenery is behind terrain, actors and warning telegraphs.
  Ground textures use the existing clipping path: no painted walkable ledges
  or collision changes. Neither animation nor image frames create events.
- Reduced motion freezes added decorative clocks, plant sway, drop glints,
  chest decoration and ambient scenery; it suppresses weather animation.
  Combat poses and warning telegraphs remain live.

## Rebuild and verification

Source generation intermediates and browser screenshots live under ignored
`generated-artifacts/`. Runtime delivery PNG/WebP files are intentionally small
and committed separately from rendering/test infrastructure. Do not commit
high-resolution source paintings.

`scripts/assemble-painted-pack.mjs` merges exported hero metadata from
`generated-artifacts/eliam-manifest.json` without replacing unrelated audio.
The committed runtime manifest is sufficient to run/build the game; source
intermediates are not required by normal builds.

Run:

```
npm test
npm run test:art
npm run build
npm run build:single
npm run test:bundles
BASE=https://<development-preview-host> python3 tests/production-art-browser.py
```

Browser checks include 1280×720 desktop, 390×844 portrait, 844×390 landscape,
image decoding/dimensions/alpha, lower archive, reduced motion and missing-body
fallback. This is browser emulation, not a claim of real-phone certification.
The existing real-phone testing task remains separate.

## Verification outcome

- Full gameplay regression suite passed, including 57 production-loader checks.
- 216 environment/reduced-motion checks and 55 installed-pack checks passed.
- TypeScript, static build, offline single-file build and 17 bundle checks passed.
- Chromium checked desktop, portrait and landscape, all shipped source sizes,
  alpha, distinct animation frames, the archive and missing-body fallback.
- The complete production image pack decodes to 64.75 MiB, below the 80 MiB
  scene target. The offline single HTML is approximately 10.6 MiB, below 20 MiB.
- Visual inspection prompted body-only replacement to avoid the old helmet
  protruding through the new painted character. Gear, cloth and warnings remain
  procedural and the missing-image test retains the original complete hero.

During integration with the current main branch, its painted joint-part
fallbacks, enemy/weapon textures, ember effects, six-land surface bindings and
approved sampled audio were retained. The combined catalog is about 73.3 MiB
decoded; the desert uses this task's depth-aware layered paintings, with the
main-branch source art still available in the catalog. The export audit accepts
both PNG animation atlases and WebP painted parts, and checks the combined
80 MiB budget rather than the earlier still-art-only budget.

## Remaining six lands

Flooded Paths, Garden Gates, Mountain of Promise, Valley of Courage, City of the
Watch and River of Life now each have three independent painted exports: a
distant vista, an alpha-cut nearer architectural layer and a lower-room interior.
The nearer layer is reused at restrained opacity for the third parallax plane,
not flattened into the vista. These are authorized AI-generated reconstructions
of the supplied Asset Bible / Complete Game Asset Showcase direction, not
claimed artist-delivered exports. Image-level source and rights notes are in
the manifest.

`scripts/assemble-painted-lands.mjs` extracts the three panoramic strips from
ignored source sheets, removes magenta from the midground before downsampling,
and exports real-alpha WebP. The optimized delivery is **512 × 170 per painting**,
uniformly scaled/cropped at runtime. This intentionally trades source detail
for the existing combined-catalog budget; high-resolution masters are not shipped.
There are 18 new images; no extra decorative particles or gameplay changes.
The entire installed catalog is **79.27 MiB decoded**, with normal per-land
browser checks around 57–64.3 MiB resident. The self-contained HTML is about
**11.83 MiB**, below the 20 MiB delivery target.

All layers select by player-foot world Y, not viewport height. Surface art ends
180 units above each lower floor; nearer layers end 240 units above it. Lower
interiors start 400 units above their floor and fade in over 180 units:

| Land | Lower floor Y | Lower painting begins Y | Surface ends Y |
| --- | ---: | ---: | ---: |
| Flooded Paths | 900 | 500 | 720 |
| Garden Gates | 900 | 500 | 720 |
| Mountain of Promise | 1020 | 620 | 840 |
| Valley of Courage | 1050 | 650 | 870 |
| City of the Watch | 960 | 560 | 780 |
| River of Life | 960 | 560 | 780 |

The existing non-desert renderer drew an opaque full-screen water/pit fill in
front of all lower-room backgrounds. Only that fill now fades to 18% as a
**decoded** lower painting fades in. Ground blocks, platform edges, water-gap
hazard graphics, props, actors, warnings and controls remain at their original
opacity/order. A missing/unloaded painting retains the complete opaque fallback.
Desert rendering is unchanged. Terrain, routes, hazards and physics are not
modified. Existing atmospheric animation still runs; no new motion clock is
introduced, and added parallax still freezes for reduced motion.

Verification:

```
npm test
npm run test:art
npm run build
npm run build:single
npm run test:bundles
BASE=https://<development-preview-host> python3 tests/painted-lands-browser.py
```

All passed. New checks cover every land's surface, upper and lower depth bands,
transition coverage, reduced-motion parallax, exact export dimensions and the
catalog budget. Chromium covered all six lands at 1280×720, 390×844 and 844×390,
both surface/lower routes, real decoded alpha and chroma removal, no future-land
requests, missing-pack input/physics fallback and final-framebuffer visibility
of each lower painting (not just successful image loading).
Screenshots/results stay under ignored `generated-artifacts/painted-lands-review`.
The test-only `/tests/painted-lands-review.html?land=1&room=lower&touch` fixture
shows a live scene; land IDs 1–6 select these lands, `room=surface` selects the
upper route, and `reduce` freezes added motion. It is not a production build entry.
This is desktop browser emulation, not Safari/Firefox or physical-phone certification.

### Integration with painted enemies

The merged enemy pack is retained alongside all six scenery packs. Two legacy,
unbound desert catalog entries (`desert-ruins-painted` and
`desert-pillars-painted`) were retired from the manifest; their source files
remain available and neither was used by the current renderer. This avoids
counting superseded desert paintings against the combined decoded audit.
With the painted enemy bodies included, the combined catalog is **79.77 MiB**
decoded and the offline HTML is about **12.53 MiB**. These supersede the
scenery-only integration figures above. Both enemy and scenery regression
suites remain in `test:art`.
