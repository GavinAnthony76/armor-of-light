# Armor of Light — approved gameplay baseline

Version: 1.2.0, Keeper of the Ember. Source preserved from the deployed Site commit b788d41fc7ff9fd08d1ac7b813ee8fdbe1132c62.

User assessment: combat rated 9 to 9.2 out of 10. Preserve this version as the base for future work.

## Follow-up work

1. Investigate music that is inaudible for the user. Reproduce audio unlock, volume and pause/resume behavior on the actual browser/device before changing the soundtrack.
2. Fix phone viewport/rendering: portrait and landscape crop or omit portions of the screen. Verify dynamic viewport dimensions, safe areas, canvas layout and touch controls on physical phones.
3. Extend the current combat with a simpler God of War inspired combo system while retaining responsiveness, defensive cancels and parries. This is a future enhancement, not part of this snapshot.

No gameplay, music or viewport fixes are applied in this baseline commit.

## Run

Use npm ci, then npm run dev. npm test runs the existing rule, campaign and action checks. npm run build produces the static edition in dist/. The checked-in dist/ preserves the playable build matching this baseline.

Characters, guardians and dialogue are fictional. Artwork and procedural music assets are included; no credentials, dependency folders or Sites hosting identity are included.
