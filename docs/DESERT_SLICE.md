# Desert Ruins — complete first-land playtest

Built from the merged GitHub main, including its double jump, authored traversal
terrain and mobile-first controls. The superseded combat-slice branch is not
merged. This is a web gameplay slice, not a native iOS binary.

## Start to finish

1. Enter through the illustrated splash. That trusted gesture unlocks Web Audio.
2. Begin the journey. Read the first-land story panels, skip into play, or go Back.
   Existing Continue saves resume directly without repeating the chapter.
3. Traverse the approved ruins with dash, double jump and wall jump. The existing
   first fight provides earned Sunblade rewards.
4. Three existing second-encounter enemies physically drop Dawn Sling copies
   (`e1w0s0`, `e1w1s0`, `e1w1s1`). Collect them to forge ranks I, II and III before
   the guardian. Loot policy is independent of authored level data.
5. Defeat the Dune Warden and reach the exit for the existing results, score,
   watchfires and campaign unlock. Other lands remain playable, but their content
   has not received this first-land presentation pass.

Level layouts, enemies/waves and encounter design are owned by the creator's
separate ChatGPT branch. This work leaves the approved level data unchanged.
Future level changes should coordinate stable reward source identities rather than
silently adding encounters for loot.

## Combat

| Action | Keyboard | Standard gamepad | Touch |
|---|---|---|---|
| Light | J / X | X | Strike |
| Heavy | I | RT | Heavy |
| Shield / parry | K / C / Shift | B / RB | Shield |
| Dash | L / V | LB | Dash |
| Jump / double jump | Space / W / Z | A | Jump |
| Deliberate pickup | E | Y | Pick up |
| Swap hammer / alternate | Q | LT | Swap |

RT is now Heavy, not a second shield binding. Existing B/RB shield bindings remain.

Light–light–light chains a three-beat sequence. Light–light–heavy commits to an
empowered finish. Early follow-up presses queue one action; recent presses near
recovery boundaries are retained briefly. Active damage frames cannot be skipped
by a defensive cancel. Inputs during impact pauses are retained; inventory
interactions are intentionally NOT queued through those pauses.

Heavy guard pressure briefly staggers a shielded foe. Actual damaging hits build
a short-lived streak; being hit or waiting too long clears it. Selected heavy or
third-strike kills get a 0.3-second cinematic slowdown, with a three-second
simulation cooldown. Reduced Motion disables this slowdown and large flashes.

## Dawn Sling and earned upgrades

The sling shoots real, finite, collision-tested lightstones. It is not a long melee
hitbox. A modest aim assist selects a forward foe; jumping/positioning still matter.
Solid traversal walls block shots. There is no ammunition purchase or grind.

- Rank I: one lightstone and the basic physical sling.
- Rank II: two-stone fan, forged details, runes, brighter trails.
- Rank III: three-stone fan, crown structure, gold/cyan lightstone effects.
- Heavy volleys pierce two enemies; a fan can damage each target only once, avoiding
  point-blank shotgun damage that would trivialize the guardian.

Sunblade remains available. Picking a different alternate exchanges the old weapon
onto the ground; the permanent hammer is never lost. Retry and Continue preserve
rank/equipment and pending drops; Restart/new land reset them. First-land sling
saves cannot migrate equipment to another land.

## Validation and remaining release work

The deterministic first-land suite covers chains, buffered impact-pause input,
ranged collision, solid-wall blocking, ranks, rewards, save scoping, retry cleanup
and finishers. Existing seven-land/campaign, weapon, audio, adapter, input,
traversal and layout checks remain required, along with builds and bundle checks.

Browser verification must include normal splash/story, music signal after gesture,
touch Heavy, a complete first-land run, pickups/upgrades, Continue/retry/restart,
pause/resume and small portrait/landscape layouts.

Completed verification for this slice:

- Existing suites: 311 core checks, 262 weapon checks, 70 combined campaign
  simulations, plus action/audio/input/adapter/traversal/layout checks.
- New first-land suite: 50 checks. Production, standalone and bundle checks pass.
- Browser: opening/story and pause/menu flow; positive music RMS after a trusted
  gesture; real keyboard and trusted touch light–light–heavy; heavy-kill slowdown
  and recovery; physical earned sling I/II/III; actual three-stone fan; retry
  projectile/input cleanup; hammer swap; reload/Continue; Restart reset.
- Natural browser runtime, accelerated autoplay: first land reached `clear`,
  showed results and unlocked the next land. No forced finish callback.
- Touch emulation: 390×844, 844×390 and 320×568 fit the viewport. This is not
  physical-device validation.

Opt-in `?debug&qa` fixtures now anchor at the existing level start, not a hardcoded
point that can intersect newer terrain. Their First-land reward selector spawns
normal low-HP foes with real source identities; kill and deliberately collect
the physical drops to test upgrades. Normal play does not show these controls.

Automated playthroughs do not establish fun or native-device performance. Hardware
audio, sustained play on actual phones, native implementation, asset-rights audit,
security scan and App Store submission remain separate release gates.
