# Painted enemy and Dune Warden bodies

## Delivery and scope

The five shared enemy archetypes (husk, wisp, caster, lurker and sentinel)
and the Dune Warden now use body-only cutout animation recreated from the
user-approved Complete Game Asset Showcase / Game Asset Bible direction.
These shared enemy bodies appear wherever their archetypes occur, including
mini-bosses with no mini-specific exact-state binding.
The other six guardians retain their complete original presentation; this
first pack does not claim new unique artwork for those guardians or named minis.

The generated source is an **armless body sheet**, not a finished animation
sheet. `scripts/prepare-painted-enemies.mjs` calibrates six lossless RGBA PNG
cells from the ignored local master. PNG delivery avoids inconsistent direct
preview decoding seen with the first lossless-alpha WebP exports; both
contrasting-background composites and browser canvas showed clean silhouettes.
Fully transparent pixels are normalized to black RGB. Source ownership/provenance
is recorded with each manifest image. The master is not required to build or
run the game. Do not put the master or browser evidence into Git.

## Calibration and movement

Each untrimmed cell is 512 square, foot pivot (256,448), normal scale 0.25,
Warden scale 0.5. Source aspect ratio is preserved while fitting the existing
body dimensions. Grounded actors draw at their original feet; the flying wisp
uses its actual **center-based** core origin, offset by half its body height
only in presentation. Facing mirrors around that same original actor origin.

Clips opt into `bodyMotion`, an additive manifest field. The painting is split
into head, torso and separate leg regions, with small overlap to avoid seams.
Those parts articulate from existing simulation time/stride and state progress;
this is not a standing portrait substituted during attacks. Wisp motion uses
breathing and attack lean, and the low lurker silhouette uses its own hip band.
`frames: [0]` identifies the shared **source texture**, not a static pose.
Atlas-based clips without `bodyMotion` continue using the unchanged frame path.

This choice keeps all six body textures at **6 MiB decoded total** instead of
multiplying the already large hero atlas by every enemy/action. The installed
pack remains below the 80 MiB conservative whole-pack audit. A desktop test
with all six bodies in view measured about 69.4 MiB resident with no issues.
No future guardians are preloaded and no state transition needs another image.

Body replacement skips only the corresponding procedural body/armor.
Procedural claws, caster arms/orb, spear/shield, Warden arm poses, trails,
contact shadow and gold/red warning/parry cues remain. The Warden's original
arm capsules and fists receive clipped stone from the same resident body
texture; their coordinates and arcs are unchanged. Spawn and death alpha stay
in the original renderer. Damage brightness affects paintings, not warnings.
Missing/not-yet-loaded body sources always draw the entire original actor.
An unmapped action never borrows a move/idle portrait.

## Exact attack mapping

| Actor | Original attack IDs |
|---|---|
| husk | `huskSwing` |
| wisp | `wispDash` |
| caster | `casterOrb` |
| lurker | `lurkerLeap`, `lurkerSnap` |
| sentinel | `thrust1`, `thrust2` |
| boss.warden | `sweep`, `slam`, `summon` |

Each has distinct exact `windup.<id>`, `active.<id>`, `recover.<id>` bindings,
plus `spawn`, `move`, `stagger`, `hurt` and `dying`.
Windup fits `attack.windup * difficulty.windup * (phase >= 2 ? .85 : 1)`;
active fits `attack.active`; recovery fits `attack.recover * (phase >= 2 ? .8 : 1)`.
The latter is the actual core transition threshold, not the unscaled base
recovery duration. Hurt fits 0.26 s; stagger uses `staggerDur`. Spawn/death
fade fit the existing 0.5/0.6 s renderer fades. The original spawn-rise effect
still uses 0.6 s; state lifetime/removal is not shortened.
Hitstop and pause hold simulation pose time; reduced motion does not freeze
combat poses. None of these visual functions can change an attack, hitbox,
phase, timer, movement, collision, sound or damage.

## Verification

- `npm test` includes the installed-art audit and enemy checks through
  `posttest`; `npm run test:enemies` runs the focused checks.
- `npm run test:enemy-silhouettes` decodes actual delivery pixels, checks the
  foot/body envelope, transparent border/hidden RGB, disconnected marks,
  silhouette occupancy and agreement with reviewed alpha-mask fingerprints.
  Contrasting-background contact sheets are generated for visual inspection.
- `npm run test:art` includes animation, pack and enemy coverage.
- `npm run build`, `npm run build:single`, `npm run test:bundles` verify web,
  YouTube-host entrypoints and the offline edition. The single HTML is about
  11.9 MiB, below the 20 MiB target.
- `BASE=https://<development-domain> python3 tests/painted-enemies-browser.py`
  checks actual painted bodies in all states, warnings, phone-sized portrait/
  landscape, reduced motion, a real 404 body-file fallback without reload
  churn, decoded residency and offline startup with zero network sidecars.
  Evidence stays in `generated-artifacts/painted-enemy-qa/`.
- Core campaign, weapon, action, traversal and save tests remain unchanged.
  Browser fixture enemies are test-only and never enter normal gameplay.

Physical phones and Safari/Firefox are not certified by Chromium screenshots.
This pack does not modify sling animation, balancing, audio or level scenery.
