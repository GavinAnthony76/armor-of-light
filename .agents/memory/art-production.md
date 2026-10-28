---
name: Phase 2 art direction and ownership
description: External art ownership and the user's approved visual target for the production pass.
---

During Phase 2, preserve the existing game's combat engine and character physics.
The original infrastructure request reserved asset creation for ChatGPT. For
the visual integration pass, the user subsequently authorized enhancing or
recreating necessary files from the references to achieve the visual upgrade.
Do not let incomplete reference exports block presentation work.

The user's latest visual reference is the Armor of Light Complete Game Asset
Showcase PNG, updating the earlier Game Asset Bible. They described it as
"what we should have and the visual direction we are going": detailed painted
fantasy characters, strong readable silhouettes, burning hammer and rich environments.

**Why:** The user said, "if you need to make enhancements or recreate the necessary
file based on its reference then do so. I just need the visual upgrade."

**How to apply:** Preserve the existing fallback, use read-only presentation
bindings, and commit integration infrastructure separately from asset changes.
Adapt or recreate art to match the approved reference; do not replace responsive
rig animation with a full-body still image. A board is not a ready animation sheet.
Test before merging or publishing.

The opening and main menu must match the painted, animated quality of the levels,
not retain the older still-image presentation.

**Why:** The user explicitly asked for the main screen to be redone to match the
new animated quality of the levels.

**How to apply:** Keep the approved visual direction consistent in menus as well
as gameplay, preserving the existing start/continue, saved progress and settings.

Use shared, articulated body cutouts for the enemy visual pass rather than
duplicating every action into full-size atlases. Preserve original limb poses,
gear, warnings and exact-state fallback.

**Why:** The detailed hero animation already consumes most of the mobile
scene's decoded-image headroom. Small downloads do not make large atlases cheap
to decode; shared cutouts allow painted motion without reducing calibration.

**How to apply:** Keep body-only articulation tied to simulation state and
actual attack-phase durations. Recheck active-scene residency before adding
guardian packs; do not trade away warning readability or original attack reach.

Use current-land residency, not whole-pack decoded size, as the scene budget
when adding more guardians or scenery. Include all hero pose/material sources,
shared enemies, the current guardian and the current land's visible resources;
keep browser stress checks as a separate measurement.

**Why:** Future guardians and future lands are demand-loaded, so summing the
whole campaign falsely treats mutually exclusive resources as one live scene.

**How to apply:** Preserve the under-80-MiB active-scene target and cache headroom.
Do not weaken it merely because the total campaign pack has grown.

Preserve the serpent's original live neck and jaw geometry when painting it;
use clipped material rather than humanoid foot-pivot articulation.

**Why:** Its head moves independently of its base and defines the combat hurtbox;
a rigid full-body replacement could visually contradict the live collision.

**How to apply:** Keep fins, head position, opening jaw and warnings procedural,
and verify identical geometry with and without the painted material.

Judge transparent-art cleanliness from decoded pixels and contrasting-background
composites as well as direct previews. Prefer normalized RGBA PNG body cutouts
if lossless-alpha WebP direct previews disagree with browser canvas rendering.

**Why:** Direct lossless WebP previews displayed large colored panels where
the decoded alpha was zero, while browser canvas and flattened composites were
clean. PNG re-exports removed that ambiguity without changing the silhouettes.

**How to apply:** Check actual pixel alpha, hidden RGB, calibrated bounds and
reviewed masks; an alpha-support flag alone cannot establish clean cutouts.

The user clarified: "the key goal is more animation in the scenes. the
backgrounds the items the environment its all still. i need it moving
appropriately."

**Why:** The visual upgrade must include appropriate environmental motion, not
only higher-resolution still paintings.

**How to apply:** Ensure scenery has independent idle-time movement, while
solid terrain stays fixed, gameplay remains readable, and reduced motion is
respected.
