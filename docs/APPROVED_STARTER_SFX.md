# Approved starter sound integration

The user selected **“Use suitable starter effects”**. This approves a suitable
subset of the supplied starter effects, not its music loops or all recordings.
No external recordings were supplied. These are synthesized starter recordings,
not final acoustic recordings or a completed sound-design pass.

## Source and ownership

Source: `attached_assets/armor-of-light-production-starter_1793154727448.zip`,
pack version 0.1.0, `audio/sfx/*.wav`. The archive README calls these original
synthesized WAVs. Its inventory declares: “Original assets generated for the
owner; no third-party game art copied.” This is the supplier's ownership
declaration, not an independent legal certification.

Re-export with:

```
python3 scripts/export-starter-sfx.py attached_assets/armor-of-light-production-starter_1793154727448.zip
```

The script prints original-file SHA-256s and exports only the nine selected
sources. It does not overwrite the production manifest or artwork.
Delivery is mono 48 kHz 16-bit PCM WAV plus OGG Vorbis quality 5, preferred
OGG then WAV for Safari/other codec fallback. The original masters are only
22,050 Hz 16-bit PCM: upsampling conforms delivery format but adds no detail.
No normalization, added synthesis, pitch shifting or artificial silence.
The original pack remains the source master; no 24-bit master was supplied.

## Actual waveform audit and mix

All 23 original one-shots were measured: no full-scale clipping, onset under
0.2 ms at −60 dBFS, peaks between −9.46 and −5.07 dBFS. The nine chosen files
have quiet tails, no long leading silence and stay below −3 dBFS after conversion
and browser decoding. No claim of human listening or physical-phone verification
is made. Selection uses waveform characteristics, source identity and existing
event semantics; final listening on hardware belongs to the existing phone test.

Original measurements (before conversion):

| Existing event | Source WAV | Seconds | Peak dBFS | Gain | Voices |
|---|---|---:|---:|---:|---:|
| swing | swing | .130 | −9.23 | .55 | 2 |
| hit | hit | .130 | −8.67 | .95 | 3 |
| hitHeavy | hammer-impact | .430 | −6.95 | .90 | 2 |
| block | block | .130 | −8.88 | .65 | 2 |
| parry | parry | .130 | −7.11 | .85 | 2 |
| jump | jump | .130 | −8.32 | .28 | 2 |
| land | land | .130 | −8.51 | .80 hard / .379 soft | 2 |
| splash | splash | .130 | −9.14 | .55 | 2 |
| click | menu-select | .130 | −9.30 | .35 | 1 |

Hits and parries are above repeated movement/swing cues. The heavy impact's
longer decay distinguishes it from the short hit. The `land` multiplier retains
the original soft:hard gain ratio (.18:.38); no landing event or timing changed.
The existing 30 ms identical-event throttle and 24-source global cap remain.
All samples use the SFX/master buses and existing compressor and mute controls.
`warn` and `warnRed` remain synthesized, unaffected by sample voice caps;
no sample is substituted for an unmatched telegraph.

## Exclusions

- `heavy-hit`: redundant shorter impact; use the longer hammer-impact for the
  existing general heavy-hit event, not a new hammer-specific event.
- `enemy-hurt`: not the player's `hurt`; do not change semantic ownership.
- `enemy-death`: retain the existing melodic `kill` cue rather than substitute
  the much shorter generic effect.
- `reflection`: no dedicated reflection SFX key; do not map it to `clang`
  indiscriminately (that event also covers other blocked clashes).
- `dash`, `step-stone`, `step-grass`, `step-water`, `checkpoint`, `fire-crackle`:
  no matching existing SFX event. Do not invent triggers or ambience.
- `pickup`, `heal`, `boss-down`, `gate-open`: retain current pitch-varying or
  longer melodic cues; these short drafts do not replace their full envelopes.
- All seven draft music loops excluded. Adaptive music remains synthesized.
- All other existing keys, including sling, retain immediate synthesis.

## Runtime and verification

Pack cost: 190,548 bytes including both codecs; selected decoded PCM buffers
are comfortably below 1 MiB and the existing 32 MiB cap.
Cold events synthesize immediately while a source decodes; decoding does not
replay that event later. Codec failures try WAV next; total failure reports
diagnostics once and continues synthesis. A full voice cap suppresses that
sample event rather than bypassing the cap with another synthesized voice.

- `npm test`: existing game, audio lifecycle and production regression checks.
- `npm run test:approved-sfx`: shipped mappings, WAV format, peak/onset/tail,
  budgets and codec headers.
- `BASE=https://<development-domain> python3 tests/approved-sfx-browser.py`:
  actual Chromium decoding of all 18 exports, offline Web Audio rendering of
  the SFX bus and deliberately rejected OGG falling through to WAV.
- `npm run build`, `npm run build:single`, `npm run test:bundles`:
  web/host/offline inclusion.

These checks are not Safari, Firefox, speaker-quality or real-phone listening
certification. No combat, attack windows, level layouts or score were changed.
The headless runner reported a live AudioContext as running without advancing
its clock; offline rendering avoids mistaking missing runner audio hardware for
a game fault.
