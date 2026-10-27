---
name: Level-design ownership
description: Division of responsibility between this work and the creator's separate level-design branch.
---

The user has ChatGPT working on level design on a separate branch to merge later.
Do not independently do level design as well unless the user asks.
Remain the primary engineer and architect: if incoming ChatGPT work is not
compatible, make the necessary changes before accepting it.

**Why:** The user assigned this division of work to avoid duplicate level design,
then explicitly retained primary engineering/architecture responsibility here.

**How to apply:** Focus on combat, traversal mechanics, weapon systems, upgrades,
animation, opening/story presentation, audio and integration. Do not change
authored terrain, layouts, waves, encounter placement or encounter health tuning
as an independent design effort without a new request. Compatibility fixes to
incoming work are authorized before acceptance. Review combat, traversal,
weapons/rewards, saves, rendering, controls and build behavior rather than blindly
merging. Preserve the level designer's intent while fixing integration problems,
and keep loot/integration policies separate from level data where practical.

When integrating designer demos, preserve the full campaign's entry flow and
save namespace unless the creator explicitly requests demo-only packaging.
Invalidate only incompatible in-progress land attempts when authored checkpoint,
collectible or reward identities change; preserve campaign records and settings.

**Why:** The incoming demo's packaging is an integration choice, not a replacement
for the approved game flow. Numeric indices from old geometry can look valid
while referring to unrelated new checkpoints, collectibles or rewards.

**How to apply:** Treat authored layout identity as part of the run-save contract.
Re-test both weapons against actual spawned enemies while declining the other
weapon: a shared pending-loot limit must not remove rank-III opportunities.

When syncing an integration that contains a merge commit, preserve a reference
to the verified final tree and compare the resolved result against it.

**Why:** The task-completion sync can replay the incoming feature commit while
omitting compatibility fixes recorded only in the integration merge commit.
Merely resolving the listed conflicts can therefore lose fixes in other files.

**How to apply:** Carry forward all verified compatibility fixes and tests during
conflict resolution, regenerate build outputs, and compare the complete staged
tree with the preserved integration snapshot before continuing the sync.
