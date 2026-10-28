# Replacement painting calibration (#31)

Run `npm run dev`, then open `/tests/guardian-calibration.html` on that development
server. It is not a production build entry point and refuses production mode.
The tool never mounts the game or edits its installed manifest.

Choose any of the 24 painted actors and an exact existing attack. The source
canvas overlays source-pixel body bands, the fixed (256,448) pivot, and effective
material rectangles. Eight live previews show move/windup/active/recover in both
directions using the real renderer, original gear/warnings and actual attack
phase durations. Pause animation and scrub progress for a stable inspection.
The serpent uses its live neck/jaw material presentation rather than a humanoid
cutout. No AI artwork or new combat definitions are generated here.

Use the numeric band/material controls to preview changes immediately. Advanced
`enemyPresentation` JSON is also available; edit it and Apply. For local replacement art,
choose a destination under `assets/production/`, then select a 512-square PNG or
WebP. Local files stay in the browser; their blob URLs never enter the export. New
files clear provenance/license fields, which must describe the replacement
before exporting; old artwork declarations are not silently inherited.
The decoded size, full manifest/clip contract, band ordering, material rectangle
bounds and actual material alpha must validate before export. Editing inputs
invalidates approval until Apply succeeds again. Invalid edits leave Export
disabled. A missing file leaves the procedural fallback in the runtime.

Export downloads an image-settings patch and shows the same JSON for review.
Merge that image entry into the production manifest after visual approval and
copy the approved image to its source path separately. Existing immutable pivot,
scale and body-only contracts stay enforced. A source/dimension change will now
invalidate its old decoded cache entry on reinstall; unchanged sources stay warm.
Same-path file-byte replacement still requires a new versioned source path (the
browser's HTTP cache cannot infer changed content from an unchanged manifest).

Checks: `npm run test:calibration`, `npm run test:calibration-browser` (ENGINE may
be chromium/firefox/webkit), and the existing painted-enemy and material suites.
Evidence is written only to ignored `generated-artifacts/guardian-calibration/`.
