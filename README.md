# Current campaign development milestone

All seven lands now have playable routes. The six later lands have distinct
vertical elevation profiles, optional secret trails, two named elite mini-bosses
and gated crossings each, plus their final guardian. Treasure chests contain
equipment, forging upgrades, score items, healing and heart-capacity relics.
Ordinary enemies no longer drop equipment; guardian weapons carry into the next
land after being claimed. Opened chests and earned progression survive Continue.

See [CAMPAIGN_EXPEDITION.md](docs/CAMPAIGN_EXPEDITION.md) for design, controls,
reward/persistence rules and honest release limitations. This web campaign is not
a signed native build or an App Store-ready certification.

# Armor of Light — Weapon Discovery development preview

Built on the approved **v1.2.0 Keeper of the Ember** baseline, commit `2d37439ae961b06310493866089b58bfe1923be0`. Development branch: `dev/weapon-discovery`. The approved `armor-of-light` branch is preserved.

Eliam, all seven lands, the original combat engine, parries/reflection, defensive cancels, dash, wall movement, jump cancels and the signature flaming hammer remain. Hammer swing definitions and authored poses are unchanged. The flame renderer is extracted into the shared weapon renderer without replacing its design.

## Play and controls

`npm ci` then `npm run dev`, or serve `dist/` on any static host, including a GitHub Pages subdirectory. `dist/youtube.html` is the YouTube entry. `npm run build:single` generates `dist-single/armor-of-light.html`, with embedded art and JavaScript, for direct opening.

| Action | Keyboard | Standard controller | Touch |
|---|---|---|---|
| Move | A/D or arrows | Stick / D-pad | Left pad |
| Jump | Space/W/Z | A | Jump |
| Strike | J/X | X | Strike |
| Shield/parry | K/C/Shift | B/RB/RT | Shield |
| Dash | L/V | LB | Dash |
| Pick up | E | Y | Pick up |
| Swap | Q | LT | Swap |

Weapons physically launch from eligible defeated foes, fall and bounce onto walkable ground. Walking over them never equips them. A fresh interaction press after entering range deliberately equips or upgrades. The Ember Hammer is always one slot; the second holds one alternate.

Each land offers Sunblade, Tide Spear, Thorn Glaive, Storm Sabre, Iron Maul, Watch Twinblades, or River Greatsword. Their tempo, reach, impact and contact shape differ. Additional earned copies forge ranks II and III (+9%/+18% damage relative to rank I) with added collars, fins and crown/runes. Extra max-rank copies stay unconsumed and later redundant drops are suppressed. Upgrades have no currency cost or automatic pickup.

**Retry and Continue preserve equipment, ranks, issued reward IDs and unclaimed drops. Restart or a new land resets the alternate.** Rewards from a retried enemy cannot be issued twice. Rewards behind a sealed checkpoint recover onto reachable ground. The game explains these rules in chapter introductions, help and pause.

## Review and checks

`npm test`: original regression suite, 42 hammer campaign runs, weapon/drop/save tests, 28 alternate campaign runs, audio lifecycle, standard controller/touch/keyboard mappings, and local YouTube SDK mock.

`npm run build && npm run build:single && npm run test:bundles`: type checking, static/YouTube builds, standalone bundling and asset-reference checks.

See [validation](docs/VALIDATION.md), [raw results](docs/validation-results.txt), and [implementation notes](docs/DEVELOPMENT.md). Screenshot evidence is in `docs/evidence/`.

For explicit development inspection only: `qa.html` has viewport fixtures, and `weapon-gallery.html` shows actual equipped/dropped silhouettes and rank differences. Fixtures require `?debug&qa`; ordinary play does not enable them.

Physical-device verification and actual GitHub Pages/YouTube host acceptance remain separate from local/browser checks.
