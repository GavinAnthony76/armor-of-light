# Mobile viewport correction

Starting GitHub main: 35ce2ffab9a65f76d4e070640a394d18b9ae637f (merged traversal pass).

The reported landscape screenshot showed a fixed-height scene constrained by the desktop maximum camera width, leaving broad side margins and excessive space before touch controls. Touch now fills the safe viewport width and all available height above a 76 CSS pixel landscape dock (164 in portrait). Landscape camera framing keeps Eliam larger; portrait adds vertical scenery and uses a narrower horizontal camera. The ground line and high-jump follow use the visible camera height. Background illustration aspect ratios are preserved. Equipment HUD is compact in landscape, prompts stay above the dock, and safe-area offsets remain respected. Combat, physics, timing and terrain data are unchanged.

Validation: full npm test passed, including 82 added responsive camera checks over eight viewport/safe-area combinations, all existing combat, campaign, weapons, save, audio and input checks. Static, standalone and bundle builds passed (see raw logs).

Browser review used tests/mobile-review.html with real iframe viewport dimensions and the existing ?touch input mode: 926×428 landscape, 390×844 portrait, 667×320 landscape, including resizing the same running game and pause/resume. Menus, HUD, player and controls were inspected. Portrait control bounding rectangles were verified inside the viewport; small landscape control bounds were also inspected. Physical iPhone/Safari, real safe-area environment values, browser chrome transitions and actual YouTube hosting were not verified. Safe-area cases were covered numerically. The browser jump-control verification was interrupted by an environment disconnection; no claim of physical touch/combat-feel verification is made.

Review harness is a development-only Vite page and is not included in the production entry points. This change is presented on a separate GitHub branch for review; the preview is updated independently.
