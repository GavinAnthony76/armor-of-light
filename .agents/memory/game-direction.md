---
name: Approved game and run-local weapons
description: User direction for preserving the original game and keeping weapons tied to land attempts.
---

Use the approved upstream original game as the foundation; enhance it rather than rebuilding its gameplay or replacing its visual identity.

The approved `dev/weapon-discovery` implementation has been reconciled into GitHub main. GitHub main is now the shared source of truth, superseding experimental branches and the independent Replit weapon implementation.

**Why:** The user selected that implementation as better. A later merge mixed the competing systems and broke the build; the user then asked to synchronize from repaired main so there is one consistent game.

**How to apply:** Fetch and inspect current origin/main before synchronization and enhancement stages; confirm the preview uses the intended gameplay build. Merge completed, verified work into main and push it there, leaving main checked out for the preview. Keep safety backups, but do not leave approved work only on a feature branch. Never merge back the superseded weapon implementation merely to retain prior work.

**Why:** The user explicitly corrected the branch mismatch: “you're supposed to merge all the work into main.” The approved enhancements and incoming level work must become one main build, not separate final deliverables.

**Why:** The user rejected the earlier implementation because it looked and acted nothing like the original. Ninja Gaiden NES is a reference for responsive combat, intense pacing, and movement—not a request to replace the game's art.

**How to apply:** Preserve approved combat and the signature burning hammer while adding focused enhancements.

Alternate weapons and upgrades reset on fresh land attempts, but checkpoint retries and Continue retain them.

**Why:** The user wants weapons unique to levels so players revisit a level to enjoy that weapon and its upgrades again.

**How to apply:** Do not introduce permanent cross-land alternate equipment progression without a new user decision.

Develop one complete land as the reviewable testbed before expanding the rest.
The user wants God of War-style combo/impact depth, Ninja-like responsive dashing
and jumping, an opening/story/music flow, selective killing-blow slowdown and
visually impressive weapon upgrades, including a sling.

**Why:** The user explicitly asked to fully develop one level from the merged main, and previously said they will check each stage when prompted.

**How to apply:** Preserve the approved main gameplay identity, finish and verify the first-land systems/presentation flow, then pause for play feedback. Level design belongs to the creator's separate branch; do not expand or redesign lands unless asked. Do not equate automated checks or browser emulation with native iPhone testing or App Store readiness.

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
