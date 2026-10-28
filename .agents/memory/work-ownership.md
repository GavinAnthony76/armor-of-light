---
name: Game production ownership
description: ChatGPT owns levels and environments; Replit owns combat, presentation and integration.
---

The current handoff assigns ChatGPT level layouts, encounter design and environment
work. Replit owns combat, movement, weapons/upgrades, character animation,
splash/story, music and integration, and remains the primary engineer.

**Why:** The user's latest production handoff explicitly states this ownership split.

**How to apply:** Integrate the level designer's work rather than independently
redesigning levels unless asked. Preserve the approved combat feel. Review combat, traversal,
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
