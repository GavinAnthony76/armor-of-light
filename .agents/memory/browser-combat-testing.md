---
name: Timed combat browser tests
description: Avoid false combo failures caused by browser action latency rather than game input.
---

Verify fast combos with a local batched script and frame traces. On mobile
emulation, use trusted low-level touchscreen taps (precompute button centers), not
separate locator-tap calls or remote actions spaced by screenshots.

**Why:** Locator tap completion added roughly an entire light-swing duration
between inputs in observed tests. Frame traces showed correctly received presses
only after the previous attack had already finished, falsely suggesting chaining
was broken. Low-level trusted taps verified the intended light–light–heavy chain.

**How to apply:** Record input-consumption/attack state around the actual frames.
Keep keyboard/touch press intervals inside the buffer/recovery windows, and
distinguish an observation gap from a game defect. Anchor opt-in QA foes in an
existing safe start area rather than changing terrain to accommodate fixtures.
Do not call emulation or synthetic audio meters physical-device verification.

For automated sampled-audio routing checks, use browser OfflineAudioContext
rendering when the headless runner's live audio clock does not advance.

**Why:** A headless live context reported `running` while its clock stalled,
producing a silent analyser despite successfully decoded buffers. A running
state alone is not proof that the runner has working audio output hardware.

**How to apply:** Verify real codec decoding and the rendered graph offline;
keep device audibility and speaker mix assessment in real-hardware testing.

Do not infer missing local-image retries from browser network events alone.
Firefox's desktop file loader may report image failure without emitting the
request/requestfailed events observed in Chromium.

**Why:** Desktop offline testing observed one genuine missing-image failure
with no network events in Firefox. An assertion about those events produced
a false test failure despite correct fallback.

**How to apply:** Observe native image source assignments and the resulting
decode-failure diagnostics as well as the actual procedural fallback; use real
HTTP status checks for web editions. Browser process startup is also not proof
of rendered WebKit coverage: page creation can fail later at EGL initialization.

Only use browser artifacts tied to the current run as evidence.

**Why:** An older screenshot remained in an artifact directory and appeared to
contradict a fresh failing assertion. Its timestamp showed it came from a prior run.

**How to apply:** Enable captures explicitly, use a run-specific output directory,
and verify timestamps before interpreting screenshots or reports.
