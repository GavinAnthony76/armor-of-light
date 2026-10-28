# Eliam painted body animation pack

This handoff supplies a four-frame-per-state body-only overlay atlas and the
merge fragment `generated-artifacts/eliam-manifest.json`. It does not edit the
active manifest or any `lands` entries; merge only `images`, `clips`, and
`actors.eliam` when the separately owned desert work is integrated.

## Source and provenance

- Reference: supplied Armor of Light game-asset-bible image and the README in
  the uploaded HD-illustrations archive. Its included Eliam key art is static
  concept material, not a game-ready animation atlas.
- Raster source: generated painted pose references in ignored
  `generated-artifacts/eliam-body-*-clean.png`, generated with the media
  generation skill. The runtime base cutout and atlas are reproducible from
  these generated rasters.
- License: AI-generated artwork; verify rights to the supplied reference and
  generation service terms before public release.
- No gameplay or physics changed. `src/render/hero.ts` only exports its existing
  pose type and a read-only pose snapshot helper used by offline sampling.

## Atlas contract

`public/assets/production/characters/eliam/eliam-body-atlas.png` is a
4096 × 3584 transparent sRGB PNG: 56 untrimmed 512 × 512 cells, eight columns,
row-major. Each cell keeps anchor `(256,448)`, scale `0.25`, and the visible
silhouette fitted close to Eliam's existing 30 × 64 world-unit box. Atlas cells
are in pairs per row: idle/run, block/hurt, dead/jump-rise, jump-fall/dash,
light-1/light-2, light-3/heavy, air/air-heavy. Every clip references four
consecutive distinct sampled frames; attacks use four phase samples across the
current hammer swing duration. Decoded size is 56 MiB; use with no more than
~24 MiB additional active-scene artwork to stay under the 80 MiB scene target.

## Pose-driven construction

`sample-eliam-poses.ts` builds representative Players and samples the exact
read-only `sampleHeroPose()` exported from the existing `poseFor` implementation
in `src/render/hero.ts`. The offline Canvas renderer segments the transparent
painted source into head, torso, and two upper/lower leg patches. It transforms
those patches around the sampled hip, knee, foot, neck and head points using
the same local joint formulas, retaining the stable feet anchor. A very small
secondary breathing offset keeps held poses visibly alive in four-frame clips.
The base art's arm regions are cut out; arms, hands, shield, weapons, cape,
trails and other procedural layers remain untouched in the game renderer.

The hammer light-1, light-2 and light-3 clips each have four live sampled attack
phases and are mapped independently. Hammer heavy, air and air-heavy have their
own four-frame maps. Other weapon attacks intentionally fall back to the
existing procedural presentation until separately calibrated; no missing
attack state substitutes idle artwork. Idle/run/block/hurt/dead/jump-rise/
jump-fall/dash all have four-frame overlays.

## Rebuild

Run `bash scripts/build-eliam-painted-pack.sh` from the repository root.
The tracked generator uses ImageMagick, the project's existing `tsx` dev dependency and headless
Chromium. It rebuilds the base transparent cutout, samples the read-only pose
helper, applies offline Canvas joint transforms, and writes the delivery atlas.
The pose JSON and original generated sources remain ignored intermediates.
