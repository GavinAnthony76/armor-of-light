# Validation and limitations

## Starting point

Approved v1.2.0 GitHub baseline: `2d37439ae961b06310493866089b58bfe1923be0`.
Verified exact starting tree: `4056d316eebfdd2a2dfa9c9af83a8898ded7c276`.
Baseline before editing: 290 checks, 42 simulated campaign completions, campaign/save checks, nine action checks; production build passed.

## Development checks

- Original regression suite retained: hammer hitboxes/timing, parry windows, reflection, movement, defensive cancels and all seven lands.
- 222 weapon assertions, including eligible actual encounter deaths in every land, actual death-position launch, fall/bounce, landing recovery from gaps and bounds, walking past/standing over drops, stale/held/repeated interaction, pickup identity, ranks I–III, max rank, swaps, conservative slot exchanges, checkpoint retries, unclaimed drops, repeated reloads, source replay/farming suppression, old-save migration, corruption rejection and rank save roundtrip.
- 28 complete simulated alternate-loadout runs: all seven lands at ranks I and III on both difficulties. These are in addition to the 42 hammer runs, not claims of human playtesting.
- 13 mock Web Audio lifecycle checks; 11 keyboard/touch/standard-gamepad mapping checks; six YouTube adapter checks with a local SDK mock; 15 build/reference checks.
- Static build regenerates its YouTube entry with current hashes. Self-contained build bundles shared/dynamic modules and embeds all artwork.

## Browser observations

Chrome cloud browser, managed preview, actual canvas rendering and actual UI inputs:

- Enemy defeated with ordinary strike creates a physical weapon; hammer remains equipped while standing in range; explicit E equips Sunblade; another earned copy plus E forges rank II. Screenshots use an opt-in fixture foe with reduced HP, rather than claiming a full unassisted run.
- Actual touch Strike, Pick up and Swap actions work. Swap restores the flaming hammer while keeping the alternate.
- All weapon silhouettes and all three rank designs reviewed in the shared renderer's equipped-character gallery, including spear, maul and two separate twinblades.
- Portrait 390×844, landscape 844×390 and small portrait 320×568 inspected. The small-phone control rectangles all lie inside the viewport; rotation between phone sizes preserves the running land. Full world height is letterboxed; portrait necessarily has smaller world figures and unused vertical room.
- Audio context running after interaction. Live music analyser observed RMS approximately 0.005–0.062 with music enabled; RMS 0.0000 after muting; output returned after unmute/resume. Pause reported a suspended AudioContext. This proves a signal in this browser, not audible hardware output on the user's phone.
- Self-contained HTML loaded with embedded art; normal chapter entry and Continue restored the alternate beside the hammer. Tested over HTTP in the browser, not by opening file:// on a physical device.
- Browser extension metadata errors occurred in Chrome's extension origin; no game-origin error was observed in these checks. Existing Python Playwright e2e script was not run because browser QA used the supported CUA surface.

## Diagnosis and remaining host verification

The soundtrack is preserved. Changes address low relative music level, resume of interrupted contexts, resuming after background timer throttling, and music reverb bypassing its mute/volume bus. The original user's inaudible-music symptom cannot be conclusively attributed to one cause without that device.

No physical phone, Bluetooth/headphone, controller or notched-device safe-area test has been performed. Layout uses visual viewport changes and safe-area insets, but simulated phone dimensions do not certify those devices. Actual YouTube hosting/SDK acceptance and an actual GitHub Pages deployment have not been tested; local SDK and subpath/static bundle checks are separate.

The newer Replit ZIP containing active artifacts/armor-of-light/original-source was unavailable. None of its archived replacement code was used. Requested land-specific progression was implemented in this repository's existing engine.
