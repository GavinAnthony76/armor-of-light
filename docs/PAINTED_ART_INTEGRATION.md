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
