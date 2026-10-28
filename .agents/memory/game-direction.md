---
name: Approved combat and campaign rewards
description: Preserve approved combat while building the full exploration campaign and earned guardian-weapon progression.
---

Use the approved upstream original game as the foundation; enhance it rather than rebuilding its gameplay or replacing its visual identity.

The approved `dev/weapon-discovery` implementation has been reconciled into GitHub main. GitHub main is now the shared source of truth, superseding experimental branches and the independent Replit weapon implementation.

**Why:** The user selected that implementation as better. A later merge mixed the competing systems and broke the build; the user then asked to synchronize from repaired main so there is one consistent game.

**How to apply:** Fetch and inspect current origin/main before synchronization and enhancement stages; confirm the preview uses the intended gameplay build. Merge completed, verified work into main and push it there, leaving main checked out for the preview. Keep safety backups, but do not leave approved work only on a feature branch. Never merge back the superseded weapon implementation merely to retain prior work.

**Why:** The user explicitly corrected the branch mismatch: “you're supposed to merge all the work into main.” The approved enhancements and incoming level work must become one main build, not separate final deliverables.

**Why:** The user rejected the earlier implementation because it looked and acted nothing like the original. Ninja Gaiden NES is a reference for responsive combat, intense pacing, and movement—not a request to replace the game's art.

**How to apply:** Preserve approved combat and the signature burning hammer while adding focused enhancements.

Main bosses leave weapon rewards that are used and upgraded in the following land.
Chests replace ordinary enemy equipment drops and contain hidden weapons,
upgrades, valuable score items and other useful rewards.

**Why:** The user explicitly changed the former run-local equipment direction while requesting a full exploration campaign.

**How to apply:** Preserve earned guardian weapons across the campaign. Retry and
Continue must retain opened chests, discoveries, equipment and gate progress without
duplicating treasure. Fresh land attempts reset local chest exploration, not earned boss unlocks.

Develop all seven lands; the user has now requested the remaining six and mini-bosses.
The user wants God of War-style combo/impact depth, Ninja-like responsive dashing
and jumping, an opening/story/music flow, selective killing-blow slowdown and
visually impressive weapon upgrades, including a sling.

**Why:** The user expanded the former one-land testbed scope to a full game, retaining staged play feedback.

**How to apply:** Preserve the approved main gameplay identity while building the
campaign's side-scrolling vertical routes, optional wrong turns, hidden chests and
mini-boss progression gates. Request play feedback at meaningful stages. Do not
equate automated checks or browser emulation with native iPhone testing or App Store readiness.

Combat review must assess combo continuity against live targets, jump/dash
control and convincing hit impact—not merely whether action buttons fire.

**Why:** The user identified these three feel problems after a functionally passing gameplay slice.

**How to apply:** Check actual chained contacts and movement transitions with trusted input, then leave room for the creator's play feedback. Passing state-machine or campaign tests is not evidence that combat feels right.

The revised combo continuity, jump/dash control and hit-impact feel is the
approved combat baseline.

**Why:** The user explicitly rated the revised combat “Much better.”

**How to apply:** Preserve this feel through graphics changes and incoming
level-design integration. Do not silently replace it with another branch's
combat behavior; seek play feedback for material retuning.
