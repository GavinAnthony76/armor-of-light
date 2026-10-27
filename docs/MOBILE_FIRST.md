# Mobile-first interface pass

Continues PR #9 (`764ca2d973c122cc372397f03b639968892c1657`) after physical-phone screenshots exposed oversized menus, clipped landscape results and an awkward six-button row. The previous frame-sizing fix alone was insufficient.

- Separate movement and four-button combat thumb clusters. Larger primary strike/jump controls; shield/dash above them. Landscape fills the viewport; the camera places the ground line above the movement pad. Portrait uses a dedicated handheld control area. Physics and combat timings are unchanged.
- Pickup is contextual and visually separated from combat; swap sits beside the compact weapon chip and appears only with an alternate equipped. No new input binding, auto-pickup, or auto-equip behavior.
- Results, pause, help and chapter sheets have independently scrolling content and fixed action rails. Landscape results use two columns and three actions in a row; portrait stacks them. The old layered touch-layout CSS was removed and consolidated into src/mobile.css.
- HUD is smaller; guardian health is above the action controls rather than beneath them.

Verification: full npm test passed (311 original/layout rules, existing campaign/save checks, 9 action checks, 262 weapon checks including 28 alternate campaign runs, 13 audio mock checks, 6 YouTube SDK mock checks, 11 input mapping checks, 20 traversal checks, 87 responsive camera checks). Static and standalone builds and all 15 bundle checks passed. Raw logs: MOBILE_FIRST_TESTS.txt and MOBILE_FIRST_BUILD.txt.

Browser review used real iframe viewports via the development-only tests/mobile-review.html and UI fixtures imported from the production UI class. Inspected landscape 926×428, short landscape 667×320, portrait 390×844 and short portrait 320×480. Results actions stayed inside their viewports; in short portrait, content scrolled from 0 to 171 while all actions remained pinned. Tapping Next land dispatched the fixture handler. Chapter actions stayed visible in 667×320; actual land entry, thumb-cluster appearance, and contextual pickup/swap bounds were inspected. Fixtures do not replace the game or modify player saves.

Limits: these are Chromium browser viewport checks, not physical iPhone/Safari or multi-finger combat-feel verification. Actual YouTube hosting was not tested. Browser safe-area values and browser/app chrome transitions still require device verification. The surrounding ChatGPT Share/Edit site controls are host UI outside the game.
