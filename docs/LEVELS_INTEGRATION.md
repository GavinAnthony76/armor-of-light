# Consolidation into main

Historical merge report: the enemy-equipment reward table below is superseded
by the chest/guardian policy in CAMPAIGN_EXPEDITION.md. Those old reward identities
remain only for legacy save/isolated regression compatibility, not production loot.

The current integration keeps the latest upstream Archive layout/artwork, Keeper,
mandatory Beacon Seal pickup and gate, together with the approved ordered combos,
dash/jump controls, impacts, opening/story/music, heavy touch control and sling.
Superseded experimental combat branches are not merged.

Archive runs use a distinct layout identity. Save snapshots include both weapon
journals and Archive objective/checkpoint state. Same-map legacy Archive saves
without a revision tag migrate after validating their objective/checkpoint
contract; incompatible older surface-map attempts reset without losing campaign
records or settings.

Reward integration uses existing foes only:

| Source | Reward |
|---|---|
| e0w0s0 | Sunblade |
| e0w1s0 | Sunblade |
| e0w1s1 | Dawn Sling |
| e1w0s0 | Dawn Sling plus the Keeper's Sunblade copy |
| e2w0s0 | Dawn Sling |

Thus both alternatives can reach rank III before the Warden even when the other
is declined. The Keeper bonus has a distinct physical drop identity but shares
the enemy's issued-source ledger, preventing repeat rewards after reload. Its
underground position and pending bonus drop are retained by save validation.

The authored route, required Archive interactions, both reward paths, campaign,
combat-feel and bundle suites must pass before pushing the consolidated main.
The touch interaction control is also enabled for Seal/gate actions without
nearby weapon loot, with objective-first prompts matching engine priority.

# Desert Ruins integration

The authored first land from `origin/levels` is integrated with the approved
combat/presentation slice on `integration/desert-levels`, not directly on main.
The terrain, platforms, encounter waves, checkpoints and enemy stats are
unchanged from the incoming design.

## Preserved behavior

- Full seven-land menus, progression, opening, chapter intros and music remain
  the default. The branch's demo-only entry flow and separate save slot are not
  used, as permitted by its integration handoff.
- Approved combo continuity, heavy attacks, double jumps, dashes, Dawn Sling,
  mobile controls and weapon exchange remain in place.
- Existing campaign records and settings use the same web/YouTube storage.
- An in-progress Desert Ruins run from the previous geometry starts fresh:
  checkpoint, collectible and earned-source indices cannot safely be mapped.
  Best scores, unlocked lands and settings are retained. Runs in unchanged
  lands are retained. New Desert runs carry an authored layout revision.
- Both Sunblade and Dawn Sling have three actual enemy-source opportunities
  before the guardian. Declining Sling copies cannot block a Sunblade upgrade:
  pending-copy limits apply per weapon, not across both weapons.
- Checkpoint retry and Continue retain equipment, pending drops and consumed
  sources. Fresh replay/restart and entering another land reset equipment.

## Backups

- `backup/pre-levels-integration-20261027`: approved pre-integration slice.
- `backup/incoming-levels-20261027`: untouched incoming branch.

The old competing weapon implementation was not merged.

## Verification

- `npm test`: full campaign, both difficulties, alternate-loadout campaign runs,
  combat feel, traversal, audio lifecycle, host adapters, mobile layouts,
  incoming route tests and authored reward/save/reset integration.
- `npm run build`: TypeScript, production bundle and matching web/YouTube entries.
- `npm run build:single` and `npm run test:bundles`: self-contained edition and
  bundle references.
- Browser validation uses `tests/e2e.py`; local output goes to the ignored
  `generated-artifacts/levels-browser.log`.
- Phone-sized portrait/landscape render checks are browser emulation, not
  physical-device or native app verification. YouTube adapter tests use a
  local SDK mock, not a live YouTube hosting session.

Incoming raw test/build logs describe the designer's original demo, not the
integrated campaign. Use the commands above for current results.
