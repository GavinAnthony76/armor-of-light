"""Export only the approved starter subset. Requires ffmpeg; no new synthesis.

Usage: python3 scripts/export-starter-sfx.py path/to/production-starter.zip
The manifest is maintained separately so this never overwrites approved artwork.
"""
import array
import hashlib
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import wave
import zipfile

SELECTED = (
    "swing", "hit", "hammer-impact", "block", "parry",
    "jump", "land", "splash", "menu-select",
)
DESTINATION = Path(__file__).resolve().parents[1] / "public/assets/production/audio/sfx"


def export(archive):
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as pack, tempfile.TemporaryDirectory() as tmp:
        for name in SELECTED:
            raw = pack.read(f"audio/sfx/{name}.wav")
            with wave.open(io.BytesIO(raw)) as audio:
                assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (1, 2, 22050)
                frames = array.array("h", audio.readframes(audio.getnframes()))
                if sys.byteorder != "little":
                    frames.byteswap()
                assert max(map(abs, frames)) < 32768 * 0.708, "Peak exceeds -3 dBFS"
            source = Path(tmp) / f"{name}.wav"
            source.write_bytes(raw)
            # Upsampling conforms delivery format; it does not add source detail.
            wav = DESTINATION / f"{name}.wav"
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(source), "-map_metadata", "-1",
                "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(wav),
            ], check=True)
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(wav), "-map_metadata", "-1",
                "-c:a", "libvorbis", "-q:a", "5", str(DESTINATION / f"{name}.ogg"),
            ], check=True)
            print(name, "source sha256", hashlib.sha256(raw).hexdigest())


if __name__ == "__main__":
    export(sys.argv[1])
