"""Register the original HG28 Human Spear Militia master for battle rendering.

The generated 1064x1479 RGBA master remains untouched. This tool creates a
foot-registered transparent PNG and a compact WebP runtime copy, then records
source, processing, animation and hash metadata beside those derivatives.
"""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "assets/generated/hg28/battle"
SOURCE = FOLDER / "human-spear-militia-master.png"
PNG = FOLDER / "human-spear-militia.png"
WEBP = FOLDER / "human-spear-militia.webp"
PROMPT = (
    "Create an original premium fantasy strategy-game unit sprite: a single Human "
    "Spear Militia infantryman, full body, centered, standing in a disciplined ready "
    "stance, three-quarter view facing left. He wears practical layered dark teal "
    "cloth, charcoal leather and weathered steel scale armor with restrained "
    "aged-bronze trim; a simple crested helmet, readable face, round shield on his "
    "back and a long iron-tipped spear held diagonally. Keep a believable low-rank "
    "militia silhouette and clear spear tip, distinct from an elite knight. Rich "
    "painterly 3D-rendered game character with crisp materials, strong readable shape "
    "at small UI size, refined lighting, muted woodland colors. Match only the broad "
    "premium dark-teal/bronze fantasy material richness of the style reference; do not "
    "copy any creatures, armor motifs, costume shapes, or composition from it. Exactly "
    "one character, isolated cutout, true transparent background, full boots visible, "
    "feet aligned near bottom edge, no ground shadow, no scenery, no text, no symbols, "
    "no watermark, no second weapon, no duplicate limbs."
)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def main() -> None:
    FOLDER.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        source = source.convert("RGBA")
        if source.getchannel("A").getextrema() != (0, 255):
            raise ValueError("The source master must contain transparent and opaque pixels")
        bbox = source.getchannel("A").point(
            lambda value: 255 if value >= 8 else 0
        ).getbbox()
        if not bbox:
            raise ValueError("The source master has no visible subject")
        left, top, right, bottom = bbox
        pad = 8
        crop = source.crop(
            (max(0, left - pad), max(0, top - pad),
             min(source.width, right + pad), min(source.height, bottom + pad))
        )
        height = 476
        width = max(1, round(crop.width * height / crop.height))
        if width > 488:
            width = 488
            height = max(1, round(crop.height * width / crop.width))
        art = crop.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        canvas.alpha_composite(art, ((512 - width) // 2, 506 - height))
        canvas.save(PNG, format="PNG", optimize=True)
        canvas.save(
            WEBP, format="WEBP", quality=94, alpha_quality=100, method=6, exact=True
        )
    with Image.open(PNG) as check:
        if check.size != (512, 512) or check.mode != "RGBA":
            raise AssertionError("Registered PNG must be 512x512 RGBA")
        if check.getchannel("A").getextrema() != (0, 255):
            raise AssertionError("Registered PNG lost transparency")
        visible = check.getchannel("A").point(
            lambda value: 255 if value >= 8 else 0
        ).getbbox()
    with Image.open(WEBP) as check:
        if check.size != (512, 512) or check.convert("RGBA").getchannel("A").getextrema() != (0, 255):
            raise AssertionError("Runtime WebP failed dimensions/alpha QA")

    asset = {
        "asset_id": "hg28-human-spear-militia",
        "name": "Human Spear Militia",
        "unit_id": "human_1",
        "status": "RECREATED",
        "source_route": "built-in image_gen",
        "source_license": "independent project art; no third-party game art supplied as source input",
        "reference_role": "user-supplied image used only for broad palette/material direction",
        "source_master": SOURCE.relative_to(ROOT).as_posix(),
        "source_sha256": digest(SOURCE),
        "source_dimensions": list(Image.open(SOURCE).size),
        "source_image_id": SOURCE.stem,
        "transparent_registered_png": PNG.relative_to(ROOT).as_posix(),
        "png_sha256": digest(PNG),
        "runtime_path": WEBP.relative_to(ROOT).as_posix(),
        "runtime_sha256": digest(WEBP),
        "runtime_dimensions": [512, 512],
        "runtime_bytes": WEBP.stat().st_size,
        "alpha": "true RGBA transparency; alpha>=8 silhouette trimmed and feet registered",
        "alpha_bbox_threshold8": list(visible),
        "pivot": [0.5, 0.988],
        "image_id": "hg28-battle-human-spear-militia",
        "prompt": PROMPT,
        "animation_status": (
            "one generated master still; the existing event-linked Idle/Walk/Attack/"
            "Hit/Death transform renderer animates movement without changing gameplay; "
            "no per-action frame clips are claimed"
        ),
    }
    manifest = {
        "schema": "HG28-SingleBattleTroop-v1",
        "created_by": "tools/prepare_hg28_spear_militia.py",
        "art_direction": "original practical Human infantry in dark teal, steel and aged bronze",
        "assets": [asset],
    }
    path = FOLDER / "asset-manifest.json"
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Spear Militia: {asset['runtime_bytes']} bytes WebP, "
        f"SHA256 {asset['runtime_sha256']}"
    )
    print(f"Manifest: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
