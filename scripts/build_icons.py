"""Build placeholder app icons for Spacer Clone.

This is a pure-Python script (no Pillow / network) that writes
``build/icon.png`` and ``build/icon.ico``. Replace the geometry
function with a real design once a brand mark is decided.
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

SIZE = 256
BG = (31, 59, 90, 255)        # #1f3b5a
ACCENT = (58, 111, 165, 255)   # #3a6fa5
FG = (255, 255, 255, 255)


def make_pixels() -> bytes:
    raw = bytearray()
    for y in range(SIZE):
        raw.append(0)  # filter byte (None)
        for x in range(SIZE):
            t = y / SIZE
            r = int(BG[0] * (1 - t * 0.3) + ACCENT[0] * (t * 0.3))
            g = int(BG[1] * (1 - t * 0.3) + ACCENT[1] * (t * 0.3))
            b = int(BG[2] * (1 - t * 0.3) + ACCENT[2] * (t * 0.3))
            pixel = (r, g, b, 255)
            if y < 8:
                pixel = ACCENT
            cx = SIZE // 2
            cy = SIZE // 2
            if 60 <= x <= 196 and 60 <= y <= 196:
                if (60 <= x <= 70) or (186 <= x <= 196) or (60 <= y <= 70) or (186 <= y <= 196):
                    pixel = FG
                if abs((x - cx) - (y - cy)) <= 5 and 70 < x < 186:
                    pixel = (255, 255, 255, 220)
                if 96 <= y < 120 and 100 <= x <= 156:
                    pixel = FG
                if 124 <= y < 148 and 100 <= x <= 156:
                    pixel = FG
                if 100 <= x < 116 and 96 <= y <= 148:
                    pixel = FG
                if 140 <= x < 156 and 96 <= y <= 148:
                    pixel = FG
            raw.extend(pixel)
    return bytes(raw)


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    length = struct.pack(">I", len(data))
    crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    return length + chunk_type + data + crc


def write_png(path: Path) -> None:
    pixels = make_pixels()
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    idat = zlib.compress(pixels, 9)
    out = sig + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", idat) + png_chunk(b"IEND", b"")
    path.write_bytes(out)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def write_ico(png_path: Path, ico_path: Path) -> None:
    png_bytes = png_path.read_bytes()
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack(
        "<BBBBHHII",
        0,
        0,
        0,
        0,
        1,
        32,
        len(png_bytes),
        6 + 16,
    )
    ico_path.write_bytes(header + entry + png_bytes)
    print(f"wrote {ico_path} ({ico_path.stat().st_size} bytes)")


def main() -> None:
    target_dir = Path("build")
    target_dir.mkdir(parents=True, exist_ok=True)
    png_path = target_dir / "icon.png"
    ico_path = target_dir / "icon.ico"
    write_png(png_path)
    write_ico(png_path, ico_path)


if __name__ == "__main__":
    main()
