# Phase 2 — production asset handoff

The initial infrastructure commit contained no replacement artwork or recordings.
The user subsequently authorized recreating necessary assets from the approved
showcase, and the manifest now includes the first painted visual pass. See
PAINTED_VISUAL_PASS.md. The existing game remains the complete per-asset fallback.
Read ART_AUDIO_STORY_PRODUCTION.md for approved direction and story.

## Integration boundaries

- No changes to `src/core`, combat windows, movement, collision shapes, routes,
  checkpoints, weapons, upgrade rules or saved data.
- Production loading is asynchronous and does not delay input or a sound event.
  Failed files, invalid manifests, unsupported codecs and oversized assets report
  diagnostics and retain existing presentation. Reload after updating a pack.
- Images decode on demand for visible actors, current-land layers/props/tiles,
  and active effects. Normal web requests do not preload future lands; the
  offline single HTML necessarily transfers the entire embedded pack upfront.
- Cached images have a 96 MiB decoded-RGBA ceiling with LRU eviction of nonvisible
  assets. Over-budget current scenes fall back instead of repeatedly reloading
  visible textures. Keep an active scene **under 80 MiB** to leave cache headroom.
  This is not a total browser/GPU RAM guarantee.
- Sampled SFX have a 32 MiB decoded-buffer ceiling, 24 simultaneous voices globally
  and 1–8 voices per event. All go through the existing SFX and host/master buses.
- Existing synthesized adaptive music and its battle intensity are unchanged.
  This contract loads **SFX**, not external music stems or narration. Long-form
  recorded music/voice needs a separately approved streaming/mixing integration.

## File locations and identities

Runtime manifest: `public/assets/production/asset-manifest.json`.
Paths in JSON start with `assets/production/` (omit `public/`). Paths must be
same-origin, lowercase, and contain no traversal, query strings or external URLs.

```
public/assets/production/
  characters/eliam/
  enemies/{husk,wisp,caster,sentinel,lurker}/
  bosses/{warden,serpent,thorn,watcher,colossus,keeper,king}/
  weapons/
  effects/
  world/{desert,flood,garden,mountain,valley,city,river}/
    {sky,far,mid,foreground,tiles,props}/
  ui/
  narrative/
  audio/{sfx,ambience,music}/
```

Use names such as `eliam-body-run-atlas.png`, `warden-sweep-atlas.webp`,
`desert-far-aqueduct.webp`, `hammer-impact-heavy.ogg`. Only add `-v2` etc. when
replacing an approved export. Keep source PSD/Krita/Spine files externally;
record their reference and license/ownership in `source` and `license`.
No engine or DCC-specific project files are consumed.

## Exact image specifications

Author source paintings at 2x–4x world resolution. These are the **optimized
delivery** defaults; transparent PNG RGBA or alpha WebP, sRGB, no matte.
Use lossless exports where compression harms ink silhouettes/alpha.

| Asset | Source dimensions | Display/anchor contract |
|---|---|---|
| Eliam body animation cell | 512 × 512 px | Scale 0.25 world units/source px; feet at **(256,448)**; full cell spans 128 × 128 world units |
| Normal enemy / mini-boss body cell | 512 × 512 px | Scale 0.25; feet at (256,448); match original enemy dimensions below |
| Large guardian cell | 512 × 512 px | Scale 0.5; feet at (256,448); cell spans 256 × 256 world units |
| Wide guardian attack cell | 1024 × 512 px | Scale 0.5; feet at **(512,448)**; wider transparent margins for original attack reach |
| Sky / far / mid layer | 2048 × 1024 px each | Uniform scaling by declared world `height`; never independently stretch width/height |
| Near decorative silhouettes | 2048 × 512 px | Transparent, horizontally seamless when repeating; opacity at most 0.35 |
| Ground tile | 128 × 128 px | Scale 0.5 = 64 × 64 world units; anchor (0,0); seamless |
| Platform texture | 128 × 64 px | Scale 0.5 = 64 × 32 world units; clipped to actual platform height, not stretched |
| Small prop | 256 × 256 px | Usually scale 0.25; feet/base at (128,224); manifest may specify a measured alternate |
| Large prop | 512 × 512 px | Usually scale 0.25; base at (256,448); never create fake walkable surfaces |
| Contact / parry / ember FX cell | 256 × 256 px | Normally scale 0.25, center at (128,128); choose world size deliberately |
| Menu/story illustration | Up to 2048 px per side | PNG/WebP accepted by catalog; UI placement remains an approval-specific integration |

Maximum file dimension: **4096 px** in either axis. Prefer atlases no larger
than 2048 × 2048. A 2048-square RGBA image costs 16 MiB decoded regardless of
its download size. Example: eight 512-square frames fit a 2048 × 1024 atlas
(8 MiB); eight wide boss frames fit 4096 × 1024 (16 MiB).

All frames use an identical untrimmed cell, stable foot pivot, row-major order.
No atlas rotation, trimming, per-frame scale changes, baked camera motion,
auto-cropping, background color or contact shadows inside the body silhouette.
Allow transparent edge padding; use 2–4 px color bleed if your export tools
produce edge halos, without changing cell dimensions/pivot.

### Current body boxes (world units, not permission to resize gameplay)

Eliam: **30 × 64**. Normal enemies: wisp 34×34, husk 40×74, caster 40×82,
lurker 56×46, sentinel 48×92. Mini-bosses retain their archetype's box.
Guardians: warden/colossus 120×200; serpent 70×70; thorn/keeper/king 64×128;
watcher 64×144. Fit silhouettes to these existing dimensions; transparent canvas
padding is not character height. Ground origin is `(actor.x, actor.y)` at feet,
positive Y points down, artwork faces right, and left-facing rendering mirrors
about the foot pivot. Flying enemies use their existing body-bottom origin.

## Animation mapping and rig safety

The current skeleton, cloth, hands, shield, held weapon, rank glow and swing
trails remain active for Eliam. Deliver **body-only** enhancements, excluding
held weapons, shield, arms and cloak that the rig already draws. Match the
existing hips/shoulders and original hand articulation; do not reposition a
weapon visually to fake different reach. Optional `sockets` records are
calibration metadata, not a way to move combat sockets.

Start with `mode: "overlay"`. A specific clip may opt into `"replace"` only
after pose mapping is approved. Eliam replacement skips the procedural legs,
torso and head only; held gear and cloth are retained. Enemy replacement paints
the mapped actor, but **procedural warning telegraphs remain on top**.
Missing/unloaded mappings always use the original animation; an idle portrait
is never substituted for an attack.

### Eliam state keys

- `idle`, `run`, `jump-rise`, `jump-fall`, `dash`, `block`, `hurt`, `dead`.
- `attack.<weapon>.light-1`, `.light-2`, `.light-3`, `.heavy`, `.air`, `.air-heavy`.
- Weapon identities: `hammer`, `sunblade`, `tide`, `thorn`, `storm`, `iron`,
  `watch`, `river`, `sling`. Only provide actions that actually exist for a weapon.
- Suggested delivery: idle 6–8 frames at 8–12 fps; run 8–12 at 12–18 fps;
  rise/fall 3–4 each; block 4–6; hurt 3–4; death 6–8; each attack 6–10 frames.
  Dash can use 3–4 frames. These are art sampling densities, **not new durations**.
- Attack frames are fitted to **the current weapon's `player.swing.dur`**;
  dash uses the existing 0.14-second action. Windup/contact/recovery frames must
  match existing contact windows. Frames cannot trigger damage, footsteps,
  projectiles, sounds or extra attacks.
- Movement state clocks follow simulation pose time, not wall-clock timers.
  Attack frames follow `player.t`, including existing hitstop.

### Enemy / boss / mini-boss keys

Actor IDs: `husk`, `wisp`, `caster`, `sentinel`, `lurker`;
`boss.warden`, `boss.serpent`, `boss.thorn`, `boss.watcher`,
`boss.colossus`, `boss.keeper`, `boss.king`.
Mini IDs are `mini.` plus the lowercase hyphenated in-game name, for example
`mini.marshjaw` and `mini.the-bellwarden`. Use the names in CAMPAIGN_EXPEDITION.md.
An absent mini-specific clip can use its unchanged archetype's exact-state clip.

Map `spawn`, `move`, `stagger`, `hurt`, `dying`, plus
`windup.<attack-id>`, `active.<attack-id>`, `recover.<attack-id>`.
Attack IDs come from the actual actor's `enemy.attack.id`, never renamed to
fit animation files. Windup duration includes difficulty and guardian phase
scaling; active/recovery use the actual attack definition. Spawn fade is 0.5 s;
dying fade is 0.6 s. Do not bake gold/red warnings into artwork or extend the
silhouette into warning/health-label space.

FX bindings use particle kinds: `spark`, `dust`, `wisp`, `smoke`, `ring`,
`drop`, `ember`, `flash`, `shard`, `impact`. Supply 4–8 frames per effect.
Playback fits existing particle lifetime; effects do not create gameplay events.
Reduced motion freezes decorative FX/prop frames and added parallax, not combat
pose telegraphs. Effects use source-over alpha, so provide a suitable transparent
export rather than relying on a black background/additive blend.

## Environment placement

Layer speeds are explicit, e.g. sky 0.02, far 0.10, mid 0.28, foreground 0.85.
At least three distinct rates are available without changing camera tracking.
`speedY` independently controls vertical parallax (0–1); `repeatX` requires
horizontal seamlessness. `cover` uniformly enlarges/crops to fill a viewport.
Optional `depth: [minY,maxY]` selects scenery by Eliam's world-foot Y, independent
of phone aspect ratio; `fadeY: 80` crossfades over 80 world units at the bounds.
Use depth ranges for archive/lower rooms so sky art does not cover underground
fallback scenes. Layers outside the range do not load until approached.
Keep significant landmarks in world-space props, not a background focal point
that disappears when a narrow phone crops the scene.

Both decorative layer planes are deliberately **behind collision terrain,
actors, chests, projectiles, warnings, HUD and touch controls**. Foreground means
near parallax, not permission to hide gameplay. Props are world-coordinate
decoration only. Surface textures clip inside existing rectangles, preserve the
top 4 world pixels of ledge definition and 3-pixel side margins, do not fill gaps,
and skip narrow gates. Platform fill heights match the existing renderer.
No production field creates a platform, wall, hazard, ladder or interactable.

## Audio exports

- Authoring master: WAV, PCM 24-bit, 48 kHz. Delivery: **48 kHz 16-bit WAV**,
  OGG Vorbis and/or MP3 (128–192 kbps). Mono combat/UI samples; stereo only where
  spatial content needs it. List preferred OGG then MP3/WAV fallback in `sources`.
- Trim leading silence to at most 10 ms; avoid clipped transients and cut tails.
  Target peaks at or below −3 dBFS, with natural variation; do not normalize
  every cue to full amplitude. Existing master compressor/mute still applies.
- Typical swing/contact/parry 0.05–0.5 s; jump/land/pickup 0.1–0.7 s;
  gate/guardian cues 0.5–3 s. Runtime ceiling: **10 s and 4 MiB encoded per source**.
- Every failed codec is tried in order. Until decoding succeeds, the event plays
  its original synthesized sound immediately; decoded audio is not replayed late.
- Supported SFX event keys: `swing`, `hit`, `hitHeavy`, `kill`, `block`, `parry`,
  `clang`, `hurt`, `jump`, `land`, `warn`, `warnRed`, `shoot`, `boom`, `pickup`,
  `heal`, `splash`, `wave`, `roar`, `bossDown`, `clear`, `click`, `death`,
  `respawn`, `gate`, `sling`. Camel-case keys match existing engine events;
  filenames remain kebab-case. No new step/checkpoint/story event is invented.
- `gain` is 0–1 before the existing SFX bus; choose `voices` 1–8 (usually 2–3;
  warnings 1). Audio context unlock remains user-gesture-only.

## Minimal manifest example (illustrative filenames, NOT shipped art)

```json
{
  "version": 1,
  "images": {
    "eliam-run": {
      "src": "assets/production/characters/eliam/eliam-body-run-atlas.png",
      "width": 2048, "height": 1024,
      "frame": {"width": 512, "height": 512, "columns": 4, "count": 8},
      "anchor": [256,448], "scale": 0.25,
      "source": "approved source reference", "license": "verified ownership"
    },
    "desert-sky": {
      "src": "assets/production/world/desert/sky/desert-sky.webp",
      "width": 2048, "height": 1024, "anchor": [0,0], "scale": 0.5,
      "source": "approved source reference", "license": "verified ownership"
    }
  },
  "clips": {
    "eliam-run": {"image":"eliam-run","frames":[0,1,2,3,4,5,6,7],"fps":14,"loop":true,"mode":"overlay"}
  },
  "actors": {"eliam":{"states":{"run":"eliam-run"}}},
  "effects": {},
  "lands": {
    "desert": {
      "layers":[{"image":"desert-sky","plane":"background","height":720,"speedX":0.02,"speedY":0,"cover":true}],
      "props":[]
    }
  },
  "audio": {
    "hitHeavy": {
      "sources":["assets/production/audio/sfx/hammer-impact-heavy.ogg","assets/production/audio/sfx/hammer-impact-heavy.mp3"],
      "gain":0.55,"voices":2
    }
  }
}
```

Optional per-land `surfaces`: `{"ground":"image-id","platform":"image-id"}`.
Optional animated prop:
`{"image":"torch-atlas","clip":"torch-burn","x":1200,"y":450,"facing":1}`.
Optional particle binding: `"effects":{"impact":"hammer-contact"}`.

## Approval and verification

1. Supply actual approved exports, exact dimensions, pivots, source/license and
   clip/contact-frame notes. Add one Eliam overlay and the desert scene first.
2. Edit the manifest, refresh, inspect browser warnings; with `?debug`,
   `__aol.productionAssets.diagnostics()` reports residency and failed assets.
3. Check 16:9 desktop, 390px portrait, 844px landscape and reduced motion.
   Review feet, frame cropping, original hand/weapon alignment, warnings,
   platforms, landings, chest interactions and UI visibility.
4. Test with missing files, malformed dimensions and unsupported sound codecs.
5. Run `npm test`, `npm run build`, `npm run build:single`,
   `npm run test:bundles`. The single HTML embeds production JSON, PNG/WebP and
   WAV/OGG/MP3 recursively; it must not fetch sidecars, even offline. Builds warn
   above a **20 MiB single-HTML delivery target**. Base64 increases binary size
   by roughly one third; account for existing fallback art too.
6. Only commit an approved art/audio pack after its own visual/device tests,
   separately from this infrastructure commit. Safari codec behavior,
   real-phone performance and final artwork readability cannot be certified
   before the actual assets arrive.
