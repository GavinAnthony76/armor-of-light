# Supplied production starter: technical assessment

The user identified the supplied **Armor of Light — Game Asset Bible PNG**
as the visual direction: detailed painted fantasy characters, readable ink
silhouettes, a burning hammer and rich seven-land environments.

The separately supplied production starter ZIP is not equivalent finished art.
Its README explicitly describes procedural vector/raster starter illustrations,
static character poses, silhouette enemies and synthesized draft audio.
The Eliam idle PNG and desert middle-distance PNG were inspected directly:
the former is a simplified cartoon and the latter flat silhouette scenery.
Do not represent them as matching the reference board's rendering quality.

## Inventory

- 35 environmental PNGs: seven lands × sky/far/mid/foreground/tile.
  Backgrounds are 1536×768; tiles 256×256.
- 13 Eliam pose PNGs, 256×256, nominal foot anchor (128,232).
  There are two run poses and two attack poses, not complete animation cycles
  or three validated combo animations.
- 13 enemy/guardian PNGs, unanimated, 256×256.
- Five weapon/effect PNGs and 13 UI PNGs.
- 23 one-shot effect WAVs and seven eight-second draft music loops.
  The supplied metadata identifies mono PCM at 22,050 Hz; no listening/mix
  approval or Safari certification has been performed.
- README plus a version `0.1.0` inventory manifest: 111 archive entries total.

## Compatibility

The ZIP's `asset-manifest.json` is an **inventory**, not the runtime version-1
schema documented in PRODUCTION_ASSET_INTEGRATION.md. Never overwrite the
active runtime manifest with it. The safe loader will reject it and retain
the original presentation.

An opt-in prototype could map individual images to measured world-scale pivots,
use scenery layers and map selected WAVs to existing SFX events. Do not use
isolated poses to replace full responsive attack animation. Do not replace the
adaptive synthesized score with the draft loops by default. UI icons need
separate visual approval.

No files from this archive were installed into the active game. Keep the
infrastructure commit separate. Ask whether the user wants a clearly marked
prototype preview or reference-only treatment before integrating this pack.
Final assets still need the approved reference style, complete pose/timing
mapping and per-asset visual/device testing.
