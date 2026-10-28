---
name: Scenery residency evidence
description: Separate normal long-session stability from controlled eviction recovery and physical memory claims.
---

Keep normal multi-land travel and controlled cache-pressure recovery as separate
checks, retaining the production ceiling in both.

**Why:** The installed art catalog can fit below the cache limit, so an otherwise
long and successful journey may never exercise eviction. Lowering the limit
would test a different budget, while marking pressure textures visible would
test an artificial oversized active scene instead.

**How to apply:** Use test-only pressure images, then revisit real rooms and
require clean reloads followed by stable warm residency. Compare timings for
the same land and room, and distinguish logical decoded-cache accounting from
browser/GPU process memory or real-device performance.
