---
name: Approved game and run-local weapons
description: User direction for preserving the original game and keeping weapons tied to land attempts.
---

Use the approved upstream original game as the foundation; enhance it rather than rebuilding its gameplay or replacing its visual identity.

The approved `dev/weapon-discovery` implementation has been reconciled into GitHub main. GitHub main is now the shared source of truth, superseding experimental branches and the independent Replit weapon implementation.

**Why:** The user selected that implementation as better. A later merge mixed the competing systems and broke the build; the user then asked to synchronize from repaired main so there is one consistent game.

**How to apply:** Fetch and inspect current origin/main before synchronization, preserve local work, and verify the approved repair ancestry. Never merge back the superseded weapon implementation merely to retain prior work. Put any necessary Replit integration fixes on a separate integration branch for a PR, not directly on main.

**Why:** The user rejected the earlier implementation because it looked and acted nothing like the original. Ninja Gaiden NES is a reference for responsive combat, intense pacing, and movement—not a request to replace the game's art.

**How to apply:** Preserve approved combat and the signature burning hammer while adding focused enhancements.

Alternate weapons and upgrades reset on fresh land attempts, but checkpoint retries and Continue retain them.

**Why:** The user wants weapons unique to levels so players revisit a level to enjoy that weapon and its upgrades again.

**How to apply:** Do not introduce permanent cross-land alternate equipment progression without a new user decision.
