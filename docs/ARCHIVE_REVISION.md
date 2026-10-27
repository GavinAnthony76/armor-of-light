# Level 1 revision: required archive loop and new art

Parent branch commit: 7b2c3b43ed42650ba770baec40e01e24ebb0715f. This supersedes the first left-to-right demo. Work remains on levels; main is not changed.

## Playable route
From the caravan court, follow ARCHIVE ↓ and descend from the surface at y=450 to the archive at y=900. Continue through the lower room and optional upper ledges. The Archive Keeper is a mandatory sealed encounter using the approved sentinel's attacks/animation with a 12 HP base pool (difficulty-scaled). It must actually be defeated. The keeper leaves a visible Beacon Seal. Walking over it does nothing: E / gamepad Y / touch INTERACT deliberately takes it. Climb the separate eastern shaft, return to surface elevation, and explicitly open the seal gate. The gate cannot be jumped, dashed or climbed past without the item. Opening it establishes a checkpoint beyond the door. Continue toward the crossing, beacon stair, final Dune Warden and ending.

The seal action takes priority over nearby weapon pickup, preventing one press from also equipping a weapon. Level progression is separate from equipment, survives retry/Continue, and resets on fresh attempts. Checkpoint coordinates are validated. The demo save key is v2 to avoid reusing the old layout's checkpoints; campaign saves remain separate. Old full-campaign Level 1 runs still require integration migration before main adoption.

## New environment art
Four generated, versioned WebP assets in public/assets: desert-sky-v2.webp, desert-aqueduct-v2.webp (true alpha), desert-archive-v2.webp and desert-stone-v2.webp. Combined compressed size is about 874 KiB. Original files are retained separately; the old desert illustration is not overwritten.

The renderer draws the sky at a .035 camera factor, aqueduct at .28, edge foreground at 1.12 and archive at .12, with independently drifting cloud wisps, moving shafts of light, dust and cloth. The background crossfades as Eliam descends. Masonry is cached into one repeat pattern and reused for ground/platforms; the archive uses cooler colors. Low-detail procedural desert props are suppressed in this land. Terrain landing lips remain clear. No rain, moving-platform physics or new combat animations are claimed.

## Shared-engine integration points
Replit owns combat/movement/weapons/animation/story/music/integration. These additions require coordination: StageDef.voidY and World.voidY make the player, enemies and projectiles support lower rooms; previously the enemy's hardcoded y>700 removal deleted the keeper immediately. The default is unchanged in other lands. Stage has level-only progression/interactions and a level-state journal; main/save/UI serialize and present it. The autopilot gains only level-interaction pulses for tests. No attack definitions, player physics/timings, parry windows, weapon tuning, or animation code are replaced. Review these shared files rather than copying them over Replit's version.

## Checks and limits
ARCHIVE_TESTS.txt contains the full rule, combat, campaign, weapons, save, audio/host/input/traversal/layout suite plus dedicated route and progression checks. The new progression cases cover the live keeper remaining alive at depth, deliberate seal pickup, held-input rejection, no simultaneous weapon pickup, gate collision/opening, retry/Continue, invalid save fields, fresh reset, underground floor safety, and prevention of above-gate bypass. Earlier browser review caught both a vanished keeper and pit shading covering the cave art; both were corrected before delivery. Static, standalone and bundle checks are recorded in ARCHIVE_BUILD.txt.

Browser review uses Chromium with phone-size iframe viewports and explicit QA fixtures for visual inspection. QA fixtures are opt-in and not ordinary play. Accelerated autoplay is separate from human play. Physical iPhone/Safari, multi-finger combat feel and actual YouTube hosting remain unverified. Do not present simulation success as physical-device verification.
