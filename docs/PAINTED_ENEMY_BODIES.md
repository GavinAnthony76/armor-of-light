# Painted enemy and Dune Warden bodies

## Delivery and scope

The five shared enemy archetypes (husk, wisp, caster, lurker and sentinel)
and all seven guardians now use body-only painting recreated from the
user-approved Complete Game Asset Showcase / Game Asset Bible direction.
These shared enemy bodies appear wherever their archetypes occur, including
mini-bosses with no mini-specific exact-state binding.
The Tide Serpent, Thorn Sentinel, Storm Watcher, Iron Colossus, Keeper of
Shadows and Hollow King each have a distinct calibrated source. Named minis
still inherit shared archetype art rather than unique portraits.

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

This choice keeps all twelve body textures at **12 MiB decoded total** instead of
multiplying the already large hero atlas by every enemy/action. The installed
pack is audited by **current scene**, not by summing future lands/guardians.
The conservative bound includes all hero poses/materials, shared enemies,
the current guardian and all land layers/depth bands/props/surfaces/effects:
71.7 MiB for desert and 64.0 MiB for each other currently installed land.
A Chromium stress scene retaining all twelve body sources measured **75.5 MiB**
resident with no issues, below the 80 MiB scene target.
No future guardians are preloaded and no state transition needs another image.

Body replacement skips only the corresponding procedural body/armor.
Procedural claws, caster arms/orb, spear/shield, Warden arm poses, trails,
contact shadow and gold/red warning/parry cues remain. The Warden's original
arm capsules and fists receive clipped stone from the same resident body
texture; their coordinates and arcs are unchanged. Spawn and death alpha stay
in the original renderer. Damage brightness affects paintings, not warnings.
Missing/not-yet-loaded body sources always draw the entire original actor.
An unmapped action never borrows a move/idle portrait.

The six-guardian source master is calibrated by
`scripts/prepare-painted-guardians.mjs`; like the first master it stays ignored.
Low-confidence background-removal alpha is removed before resampling, and
transparent delivery RGB is normalized. Every humanoid guardian uses scale 0.5,
the stable foot pivot and original body box. The original moving capes draw
behind the new bodies; sword arms, greatswords and Colossus arm capsules/fists
keep their original coordinates, arcs and warning rims.

The serpent deliberately does **not** use humanoid cutout articulation. Its
calibrated source provides a painted scale material inside the original live
tapered neck polygon and opening jaw path. Neck/head position, Bézier samples,
fins, eyes and water churn retain their original geometry; no portrait is
positioned at a fictitious serpent foot pivot. This also preserves the existing
head hurtbox and bite/lunge presentation. Missing material draws the full original.

### Replacement painting calibration

Each image may supply `enemyPresentation` in the production manifest. It is
presentation-only; it does not relax the 512×512 source cell, (256,448) anchor,
uniform scale or exact-state clip contract. Existing packs may omit it entirely;
the original per-archetype band and material defaults remain in effect.

```json
{
  "bands": { "top": 48, "neck": 140, "hip": 328, "legTop": 328, "foot": 448 },
  "samples": { "colossusStone": [200, 116, 100, 100] }
}
```

`bands` is an optional complete set of source-pixel Y boundaries. `hip` is the
torso pivot; `legTop` is the leg split (separate for low quadrupeds). The renderer
adds the existing two-pixel seam overlap. Boundaries must be finite, ordered,
inside the source, and leave room for the overlap. Band changes affect cutout
cropping and articulation only, not actor position or size.

`samples` is an optional partial map of `[x,y,width,height]` integer source
rectangles. Supported roles are `serpentScales`, `serpentHead`, and
`colossusStone`; omitted roles retain their original rectangles. Rectangles
must have positive area and fit inside the source. On first use, actual decoded
pixels are checked: scales and stone require at least 95% mean alpha coverage.
The head is a shaped overlay with intentional clear corners, so it requires
50% rather than near-total coverage. Fully transparent, mostly empty or
unreadable samples retain the complete procedural actor and report one issue.
Results are cached per decoded image, role and rectangle; no per-frame pixel
readback or extra body image is needed. The Colossus arm uses the selected clip's
resident image, so a replacement binding cannot accidentally sample an old pack.

Calibrate by editing the manifest and replacing the PNG only; no renderer edits
are needed. Keep the existing weapons, warning geometry and combat timing.
`npm run test:enemies` compares explicit and omitted metadata in every live
state, checks custom crops, rejects malformed/transparent samples, and verifies
the original hitboxes, arm/weapon endpoints, timing and missing-file fallback.

## Exact attack mapping

| Actor | Original attack IDs |
|---|---|
| husk | `huskSwing` |
| wisp | `wispDash` |
| caster | `casterOrb` |
| lurker | `lurkerLeap`, `lurkerSnap` |
| sentinel | `thrust1`, `thrust2` |
| boss.warden | `sweep`, `slam`, `summon` |
| boss.serpent | `spit`, `tail`, `bite` |
| boss.thorn | `thrust1`, `thrust2`, `tail`, `summon` |
| boss.watcher | `casterOrb`, `tail`, `kingWave`, `kingDash` |
| boss.colossus | `sweep`, `slam` |
| boss.keeper | `kingDash`, `combo1`, `combo2`, `combo3`, `kingWave`, `summon` |
| boss.king | `combo1`, `combo2`, `combo3`, `kingDash`, `kingWave`, `kingLeap`, `summon` |

These include chained thrust/combo states, the Watcher's ranged `kingDash`
substitution and the King's phase-two `summon`, not just the first cycle entry.

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
  13.1 MiB with the expanded scenery, below the 20 MiB target.
- `BASE=https://<development-domain> python3 tests/painted-enemies-browser.py`
  checks actual painted bodies in all states, warnings, phone-sized portrait/
  landscape, reduced motion, a real 404 body-file fallback without reload
  churn (including each of the six new guardian files), decoded residency and
  offline startup with zero network sidecars. Each guardian is also captured
  individually at portrait/landscape sizes, not only in a crowded stress fixture.
  Evidence stays in `generated-artifacts/painted-enemy-qa/`.
- Core campaign, weapon, action, traversal and save tests remain unchanged.
  Browser fixture enemies are test-only and never enter normal gameplay.

The built web and offline editions were subsequently checked in Firefox and
Chromium using `tests/painted-enemies-engines.py`. See
[the desktop engine report](PAINTED_ENEMY_ENGINE_QA.md) for the measured results,
reproduction commands and the blocked WebKit run. Safari is **not** certified:
the available Linux WebKit process cannot render a page on this runner.
Physical phones are not certified by these desktop checks.
This pack does not modify sling animation, balancing, audio or level scenery.
