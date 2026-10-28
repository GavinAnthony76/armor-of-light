---
name: Painted export transparency
description: ImageMagick extent can silently flatten an otherwise valid alpha mask.
---

When preparing transparent scenery with ImageMagick, explicitly set the
background to `none` before extent operations, even when cropping to a smaller
canvas. Audit the final decoded WebP, not just the intermediate alpha mask.

**Why:** An apparently correct keyed arch mask became opaque white during
extent/export under the workspace ImageMagick version. Successful decoding and
correct dimensions did not catch the lost transparency.

**How to apply:** Check both clear pixels and opaque artwork in the delivery
image, and inspect final composited scene pixels. Loading a lower-room image
successfully also does not prove it is visible: full-screen water/void fills
can cover it without reporting any asset error.
