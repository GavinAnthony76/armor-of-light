# Seven-land exploration campaign

The primary engineer now owns level design. Preserve the approved combo/dash/jump
feel; do not substitute the former experimental combat systems.

## Playable structure

The Desert Ruins retain their mandatory Archive, Keeper, Seal and return shaft.
Chests now supply the Sling, hammer forging, relics, provisions and treasure.
The other six lands use authored elevation profiles, optional high trails and
dead ends, two mandatory mini-boss seals, road encounters and a final guardian.
The camera follows upper and lower routes in all lands. The main route is
continuous except authored jumpable water/chasm gaps.

| Land | First mini-boss / room | Second mini-boss / room | Guardian / reward |
|---|---|---|---|
| Desert Ruins | Archive Keeper / Sunken Archive | Beacon Seal gate | Dune Warden / Sunblade |
| Flooded Paths | Marshjaw / Sunken Pump | Bellwarden / Bell-Tower Crossing | Tide Serpent / Tide Spear |
| Garden Gates | Briar Duelist / Canopy Sanctuary | Rootmaw / Root Crypt | Thorn Sentinel / Thorn Glaive |
| Mountain of Promise | Gale Harrier / Wind Belfry | Glass Seer / Buried Observatory | Storm Watcher / Storm Sabre |
| Valley of Courage | Cinder Brute / Cinder Works | Iron Oathkeeper / Furnace Crown | Iron Colossus / Iron Maul |
| City of the Watch | Night Scribe / Watch Spire | Grave Hound / Underwall Reliquary | Keeper of Shadows / Watch Twinblades |
| River of Life | Spring Oathkeeper / Deep Spring | Dawn Revenant / Dawn Sanctuary | Hollow King / River Greatsword |

The twelve later-land mini-bosses now have distinct painted body sources with
simulation-driven cutout motion, named identity, difficulty-scaled elite health
and name/health plates. Their original archetype AI movesets, articulated gear
and warning cues are unchanged. The Desert Archive Keeper remains a separate
seal-guardian encounter. See PAINTED_ENEMY_BODIES.md for the exact live-name
bindings and artwork verification.

## Chests and rewards

- Opening requires a fresh Interact press in range; no walking-over auto-collection.
- Hidden caches become discoverable at close range, not globally revealed.
- Weapon caches reveal a physical weapon: pick it up deliberately or leave it.
- Forges upgrade the equipped weapon, including the signature hammer, to rank III.
  A forge at maximum rank gives 750 score instead.
- Treasure awards banked score. Provisions refill hearts and award score.
- Relics award score and add one heart capacity, capped at three extra per attempt.
- Ordinary enemies and mini-bosses no longer drop equipment.
- Final guardians leave physical weapon rewards. Claim the reward before the exit.
  It becomes saved campaign equipment for the following land; later forging of an
  earned guardian weapon is retained. The hammer remains available by swapping.
- Replaying a land resets its chests and local relic bonuses. It does not erase
  earned guardian weapons. Best scores, rather than cumulative treasure farming,
  determine campaign records.

## Persistence and compatibility

Chest identities, relic capacity, checkpoint banked score, gate state and pending
equipment survive Retry/Continue. Failed-fight score rolls back while already
opened treasure remains banked, preventing reload duplication.

The redesigned six lands have new layout identities; incompatible old attempts
restart only that land. Campaign records, settings and earned guardian equipment
are preserved. The Archive's geometry identity is unchanged.

Normal startup is the full campaign. The single-land edition is explicitly
opt-in with `?demo`. When no campaign save exists, the previous demo save is
imported without deleting it; established campaign data is never overwritten.

Core content: src/core/campaign-levels.ts. Exploration: src/core/exploration.ts.
Save/carry: src/save.ts and src/main.ts. Presentation: src/render/journey.ts.
The legacy enemy-loot regression fixtures are explicitly non-expedition fixtures;
they are not the new production reward policy.

## Release status

This is a playable web campaign development milestone, not App Store certification.
Release still requires hands-on combat/difficulty and route review, real iPhone
and Android testing, native hosting/build work on replit.com, interruption/audio
and performance testing, privacy/support URLs, security review, signed builds,
TestFlight, store listing assets and final review disclosures. No native binary
or App Store submission is produced by this web campaign pass.
