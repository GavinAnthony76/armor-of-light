# Replit integration handoff: levels branch

ChatGPT owns level layouts/encounters. Replit owns the overall game and integration, combat, movement, weapons/upgrades, animation, splash/story and music. Preserve this boundary.

Core Level 1 design: src/core/desert-demo.ts. Registration is the final STAGES[0] assignment in src/core/levels.ts. It takes the existing land metadata/art and supplies authored ground, one-way platforms, props, placed collectibles, teaching signs, encounter waves and checkpoint locations. No combat engine replacement.

Level-specific scenery: renderer.ts adds architectural parallax, drifting cloud wisps, cloth banners and the post-boss beacon. The shared renderer needs a reviewed merge with current upstream. No newly generated assets or unrelated engine dependencies.

Demo packaging adapters: main.ts defaults to a single-land demo unless ?campaign is present; WebPlatform accepts a separate save key; UI has an optional demoLand argument for a one-land menu and completion copy, plus a section objective. These are demo-only integration choices, not instructions to overwrite your current splash/story/save code. When bringing this geometry into the full game, keep your own entry flow, migrate/reset incompatible old Level 1 run indices, and preserve settings/campaign progression.

Review and test before merging; do not merge competing Replit weapon implementations over the approved hammer/combat foundation. See LEVEL1_DEMO.md and raw validation logs. New mechanics such as moving platforms, wind forces and traps are deferred for coordination, not silently added.
