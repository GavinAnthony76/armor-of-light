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
