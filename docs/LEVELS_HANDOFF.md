# Replit integration handoff: levels branch

Ownership has changed: the user reassigned all level design to the primary Replit
engineer, including the remaining six lands and mini-bosses. The former separate
ChatGPT ownership boundary is superseded. See CAMPAIGN_EXPEDITION.md for the
current chest, guardian-weapon and vertical campaign design. The notes below
describe the historical Archive integration, not a restriction on future design.

Core Level 1 design: src/core/desert-demo.ts. Registration is the final STAGES[0] assignment in src/core/levels.ts. It takes the existing land metadata/art and supplies authored ground, one-way platforms, props, placed collectibles, teaching signs, encounter waves and checkpoint locations. No combat engine replacement.

Level-specific scenery: renderer.ts adds architectural parallax, drifting cloud wisps, cloth banners and the post-boss beacon. The shared renderer needs a reviewed merge with current upstream. No newly generated assets or unrelated engine dependencies.

Demo packaging adapters: main.ts defaults to a single-land demo unless ?campaign is present; WebPlatform accepts a separate save key; UI has an optional demoLand argument for a one-land menu and completion copy, plus a section objective. These are demo-only integration choices, not instructions to overwrite your current splash/story/save code. When bringing this geometry into the full game, keep your own entry flow, migrate/reset incompatible old Level 1 run indices, and preserve settings/campaign progression.

Review and test before merging; do not merge competing Replit weapon implementations over the approved hammer/combat foundation. See LEVEL1_DEMO.md and raw validation logs. New mechanics such as moving platforms, wind forces and traps are deferred for coordination, not silently added.

## Current revision
The first draft is superseded by ARCHIVE_REVISION.md: mandatory underground room, named keeper, explicit seal acquisition, return shaft and item-gated surface exit. Four new image-generated assets are documented in ENVIRONMENT_ASSETS.md. The lower room requires the small shared World/StageDef voidY contract; the original enemy fall limit otherwise deletes underground enemies. Stage/main/save/UI progression additions need a reviewed integration, while player/attack/weapon/animation/audio contracts remain intact. Do not use old LEVEL1_DEMO.md metrics as the current revision's results; use ARCHIVE_TESTS.txt and ARCHIVE_BUILD.txt.
