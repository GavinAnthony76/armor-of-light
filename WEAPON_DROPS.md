# Optional weapon drops

Starting `origin/main`: `cdaa9b116c95becf37dfc3bd6461f93602c98dbd`.
Feature branch: `replit/weapon-drops`. No merge or public deployment.

## Playing

- The Burning Hammer remains permanent. Each land offers its own alternate weapon.
- Weapons launch from defeated enemies, bounce, settle, and recover from unsafe falls.
- Walk past to decline. Press **E**, tap **Pick up**, or press gamepad **D-pad up** to collect nearby.
- Swap with **Q**, touch **Swap**, or **D-pad down**.
- Repeated copies upgrade ranks I–III, with guard detailing, size, glow, reach, and tempo improvements.
- Checkpoint retry and Continue retain equipment and pending rewards. Fresh attempts and new lands reset them.
- A saved source ledger prevents the same encounter enemy issuing another weapon after retry/reload.
- Different alternates replace the optional slot; they do not eject a farmable replacement item. The hammer is never removed.

## Verification

Baseline tests and production build passed before edits.

- Original suite: 290 checks, campaign/save checks, and 9 action checks pass.
- Added weapon checks cover physics, safe placement, optional pickup, ranks, swapping, checkpoint/Continue, migration, reward-source deduplication, and alternate clears of all seven lands.
- 82 production-browser checks pass: desktop, seven-land progression, touch portrait/landscape, Continue/reset, audio lifecycle, and a local YouTube SDK stub.
- Production and self-contained single-file builds pass; the single-file HTML opens and starts gameplay.
- Original hammer-only bots clear all seven lands on both difficulties with three seeds.
- Controlled gameplay frames and a seven-weapon idle/active-pose sheet were visually inspected. These deterministic fixtures do not substitute for a human assessment of combat feel.

Commands:

```sh
npm test
npm run build
npm run build:single
# Install requirements-test.txt and a Chromium browser for browser checks.
# Start the built preview on port 4174, then:
CHECK_YOUTUBE_ENTRY=1 python3 tests/e2e.py
```

The build emits both `index.html` and `youtube.html` with current relative asset paths.
The procedural soundtrack was preserved; browser unlock, mute, focus suspension, and resume paths pass.

## Limits

Phone checks use Chromium emulation, not physical devices. Safari, real controllers, physical-device audio, and the actual YouTube-hosted runtime remain unverified. YouTube testing used a local SDK stub, not an actual submission or hosted session.
Screenshots are generated QA output, excluded from Git, and supplied separately.
