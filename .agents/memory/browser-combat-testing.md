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
