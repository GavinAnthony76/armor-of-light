# Armor of Light — Seven-Land Art, Audio, and Narrative Production Bible

## Non-negotiable baseline
This is a **TypeScript/Vite Canvas 2D game**, not a Unity project. Preserve approved combat, timing, weapon physics, camera, routes, chests, bosses and persistence. Visual/audio changes must be additive, reversible, mobile-conscious, and verified with existing tests. No gameplay rewrites as part of an art pass.

## Story premise
Eliam, a repairer from Emberfall, follows seven extinguished watchfires after his sister Mara leads six children and other refugees away from a threatened settlement. Joram's ember-bearing hammer is a tool of restoration, not a supernatural substitute for faith. Each restored watchfire exposes how the Hollow King's promise of safety through isolation has harmed neighboring lands. Eliam's resolve develops from finding Mara to reopening roads for everyone.

**Thematic spine:** Courage is care enacted; a wall protects only when it does not imprison; light shared is not light lost. Distinguish original fiction from the biblical passages that inspire each chapter.

## Chapter pipeline
| # | Land | Narrative objective | Environmental motif | Set-piece | Guardian |
|---|---|---|---|---|---|
| 1 | Desert Ruins | Follow Mara's ribbon and restore the first beacon | Buried sandstone aqueduct and sunken archive | Return shaft and seal | Dune Warden |
| 2 | Flooded Paths | Trace the six children's crossing | Broken causeways, bell tower, rain and reed banks | Raise crossing from water | Tide Serpent |
| 3 | Garden Gates | Reopen an exclusionary gate | Cypress canopy, roots, fountains | Restore well and counterweight | Thorn Sentinel |
| 4 | Mountain of Promise | Carry a beacon through the storm | Layered cliffs and observatory | Storm ridge / underground route | Storm Watcher |
| 5 | Valley of Courage | Find the road beneath fear | Vast giant silhouettes, forges | Forge crown and valley pass | Iron Colossus |
| 6 | City of the Watch | Rescue those trapped at the breach | Multi-plane city walls, lamp-lit windows | Lower passage and breached gate | Keeper of Shadows |
| 7 | River of Life | Return the seven fires to the people | Bright riverbanks, ruined final citadel | Seven lights rekindled | Hollow King |

Preserve named mini-bosses in docs/CAMPAIGN_EXPEDITION.md. The story is being expanded in src/story.ts; chapter introductions must remain skippable and accessible.

## Visual art system
**Target look:** hand-painted high-definition 2D fantasy biblical adventure with readable dark ink silhouettes, warm rim lighting, restrained brush textures and layered atmospheric perspective. Not photorealism, chibi or flat vector placeholders. No cross-contamination of Unity or Sanctuary project art.

**Working coordinate scale:** existing game world pixels; match the renderer's coordinates before cutting assets. Source illustrations at 2x–4x displayed resolution with transparent padding; optimize actual deliverables into WebP/PNG. Keep character foreground effects visually readable at reduced phone size. Preserve original hitbox centers and sockets.

### Asset manifest, priority order
1. Eliam **visual overlay** / dynamic rendered character enhancement: standing silhouette, armor values, cloak, shield, hammer attachment. Avoid replacing procedural joint poses before explicit frame mapping and validation.
2. Seven backgrounds: each separate sky, distant structures, middle distance, foreground silhouettes; at least 3 distinct parallax speeds. Existing src/render/world.ts falls back to generated layers when art is missing.
3. Seven ground and platform tile families: sand/stone, wet masonry, moss/root, slate/snow, rust/iron, brick/plaster, bright stone/river.
4. Enemy overlays: husk, wisp, caster, sentinel, lurker, and guardian identities.
5. Unique bosses, mini-boss silhouettes and portraits. Boss telegraphs must remain clearly visible.
6. Burning hammer: ember core, swing trail, projectile reflection, parry burst, charged contact, rank upgrades.
7. Landmark props: gates, shrines, archive shelf, bell, well, torches, chests, ladders, rubble and distinct scenery.
8. Menus, item glyphs, chapter illustrations and unobtrusive in-game story discoverables.

### Proposed folder convention
```text
public/assets/production/
  characters/eliam/
  enemies/
  bosses/
  weapons/
  world/desert/{sky,far,mid,foreground,tiles,props}/
  world/flood/
  world/garden/
  world/mountain/
  world/valley/
  world/city/
  world/river/
  ui/
  narrative/
  audio/{sfx,ambience,music}/
```

Asset names: lowercase kebab-case with descriptive prefixes and version suffixes only when replacing. Keep an asset-manifest.json recording intended layer, width/height, anchor, authoring source/license and actual in-game use. Generated concepts do **not** count as finished game assets until integrated and visually tested.

## Sound direction
Retain src/audio/audio.ts synthetic fallback and music intensity switching. Introduce recorded samples selectively by event (swing, impact, parry, reflection, step, land, splash, pickup, checkpoint, gate, boss-down) with concurrency limits and per-bus gain. Use OGG with MP3 fallback where browser support warrants; verify on Safari/iOS. Music must be unlocked by user gesture and respect host mute and reduce-motion/preferences.

Land motifs:
- Desert: low frame drums, plucked strings, dry wind, reverberant stone
- Flood: rain, water percussion, distant bells
- Garden: organic plucks, soft woods, fluttering leaves
- Mountain: low horns and gusts, airy tremolo
- Valley: heavy percussion, iron ring
- City: tense pulses, bells and distant crowds
- River: flowing arpeggios resolving toward warm sustained harmonies

Make combat SFX transient enough to hear telegraphs. Do not normalize every sample to full amplitude.

## Integration acceptance gates
- Compare game input/physics/combos before and after; no changes to core/player, stage timing, enemy behavior or camera unless an evidenced rendering bug requires it.
- Check 16:9 desktop, narrow phone portrait, phone landscape, and reduced motion.
- No visual art may obscure interactive hazards, jump landings or warning colors.
- Minimize overdraw; lazy-load future lands and cache images. Handle loading failures with existing procedural fallback.
- Verify normal web build, embedded single HTML edition and alternate YouTube host. If binary art increases single-file size substantially, report it and keep a budget.
- Story remains optional/skippable with keyboard focus and no forced long waits.
- Run npm test, npm run build, npm run build:single and npm run test:bundles; report results, not predictions.
- Preserve original code/content on main as a fallback through Git history; make focused commits for each feature.

## Work order for downstream integration
1. Verify source HEAD and screenshot current visual state.
2. Produce one Eliam/hammer overlay and a single desert 3-layer scene, test proportions and performance.
3. Extend coherent style to the remaining six lands rather than inventing unrelated artistic styles.
4. Upgrade effects + sampled audio with safe fallback.
5. Integrate narrative discoveries into authored locations only after verifying current traversal and persistence.
6. Run tests and physical-device review; record what remains unverified.
