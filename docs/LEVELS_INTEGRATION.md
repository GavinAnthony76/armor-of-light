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
