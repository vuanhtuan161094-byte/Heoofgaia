#!/usr/bin/env python3
"""Deterministically register the generated scout attack-contact keyframe."""
from __future__ import annotations

import hashlib
import argparse
from io import BytesIO
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "r04"
SOURCE = ASSETS / "r04-original-bulwark-scout-attack-contact-v1-raw.png"
OUTPUT = ASSETS / "r04-original-bulwark-scout-attack-contact-v1.png"
CANVAS = (768, 640)
CONTENT_BOX = (40, 42, 728, 628)
EXPECTED_PILLOW = "11.3.0"


def registered_image() -> Image.Image:
    if PILLOW_VERSION != EXPECTED_PILLOW:
        raise RuntimeError(f"Use Pillow {EXPECTED_PILLOW} for the R04 registered pixel contract; found {PILLOW_VERSION}")
    with Image.open(SOURCE) as source:
        rgba = source.convert("RGBA")
        alpha = rgba.getchannel("A")
        bounds = alpha.getbbox()
        if bounds is None:
            raise ValueError("Attack keyframe has no visible pixels")
        sprite = rgba.crop(bounds)
        max_width = CONTENT_BOX[2] - CONTENT_BOX[0]
        max_height = CONTENT_BOX[3] - CONTENT_BOX[1]
        scale = min(max_width / sprite.width, max_height / sprite.height)
        size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
        sprite = sprite.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        left = (CANVAS[0] - sprite.width) // 2
        top = CONTENT_BOX[3] - sprite.height
        canvas.alpha_composite(sprite, (left, top))
        return canvas


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare regenerated pixels with the canonical registered PNG without rewriting it")
    args = parser.parse_args()
    image = registered_image()
    if args.check:
        with Image.open(OUTPUT) as canonical:
            canonical = canonical.convert("RGBA")
            if image.size != canonical.size or image.tobytes() != canonical.tobytes():
                raise SystemExit("R04 regenerated pixels differ from the canonical registered keyframe")
        data = OUTPUT.read_bytes()
        print(f"R04 registered pixels reproducible; canonical {OUTPUT.name} sha256={hashlib.sha256(data).hexdigest()}")
    else:
        image.save(OUTPUT, format="PNG", optimize=False, compress_level=9)
        data = OUTPUT.read_bytes()
        print(f"registered {OUTPUT.name} {len(data)} bytes sha256={hashlib.sha256(data).hexdigest()}")
