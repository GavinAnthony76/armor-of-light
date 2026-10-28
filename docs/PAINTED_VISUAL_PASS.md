# Painted visual integration

The user authorized enhancing or recreating necessary files from the supplied
Complete Game Asset Showcase to get the visual upgrade into the actual game.
This supersedes the earlier no-generation restriction for this visual pass.

## Active upgrades

- Painted bearded Eliam head, engraved torso, thigh/shin and forearm armor, boots,
  cream cape with crimson lining, and a painted burning hammer head.
- These are **articulated texture parts**, not a full-body still image. Original
  rig joints, combo curves, shield/weapon positions, cape simulation and dash/
  jump/attack timing continue to move the art every frame.
- Dark painted breastplate details for armored sentinels and selected humanoid
  guardians, without replacing their silhouettes, weapons or attack warnings.
- Recreated painted desert scenery, a separately masked parallax tower layer,
  and two decorative world-space pillars behind the playable geometry.
- Seven palette-specific seamless stone materials clipped to existing ground and
  platforms. Their readable collision edges and narrow progression gates remain.
- A four-phase painted flame atlas follows existing ember size, rotation,
  lifetime and motion. No new combat events or particles are spawned.

The other six lands retain their existing high-resolution background paintings
with new terrain materials; they do not yet have newly painted independent
parallax scenes. This is a playable visual upgrade, not a claim that every item
in the showcase has been recreated.

## Files and constraints

- Active data: `public/assets/production/asset-manifest.json`.
- Optimized WebP exports are bundled for web and the offline single-file build.
- Original generated masters and masks stay in ignored `generated-artifacts/`,
  not Git. `scripts/prepare-painted-assets.mjs` rebuilds optimized exports from
  those local masters using ImageMagick, but is not a runtime/build dependency.
- Hero texture hooks: `src/render/painted-rig.ts`. Source aspect ratios are
  preserved; each missing piece falls back independently.
- Desert background visibility is gated by player depth, preserving original
  underground archives and sky-route presentations.
- All extra layers are behind terrain and actors, not over gameplay/controls.
- Audio is unchanged by this visual commit. Gameplay, physics, level geometry,
  weapons, upgrades, checkpoints and save data are unchanged.

## Verification

`npm test` includes the actual optimized-file dimensions/alpha/budgets and
articulated hero pose/fallback checks, alongside all existing game tests.
Also run `npm run build`, `npm run build:single`, `npm run test:bundles`.
Inspect desktop and portrait/landscape gameplay, all seven lands, archive/sky
depths, a missing-image fallback and offline single-file startup.
