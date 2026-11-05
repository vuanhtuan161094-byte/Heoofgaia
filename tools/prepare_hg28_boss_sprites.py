"""Prepare three original HG28 tactical boss cutouts from their generated masters.

The original generated PNGs remain unchanged. This exports foot-registered 512px
transparent masters and small WebP runtime copies for the offline game.
"""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "assets/generated/hg28/bosses"
SPRITES = (
    {
        "key": "azrael",
        "name": "Azrael",
        "image_id": "hg28-boss-azrael",
        "glow": "#82e8e8",
        "prompt": (
            "Original full-body undead lich king; layered charcoal robes, tarnished "
            "bronze armor, narrow crown, icy teal eyes, ornate blue-crystal staff. "
            "Premium dark-fantasy painted 3D-rendered game sprite, three-quarter "
            "view facing left, true transparent background, single subject, no "
            "text/UI/watermark. User image used only as a style reference; no exact "
            "character design or ornaments copied."
        ),
    },
    {
        "key": "cyclops-tyrant",
        "name": "Cyclop Tyrant",
        "image_id": "hg28-boss-cyclops-tyrant",
        "glow": "#74d9cf",
        "prompt": (
            "Original full-body Cyclops Tyrant; huge one-eyed brute with exactly "
            "one visible central eye, dark iron and aged-bronze plates, teal runes, "
            "heavy stone maul. Premium dark-fantasy painted 3D-rendered game sprite, "
            "three-quarter view, true transparent background, single subject, no "
            "text/UI/watermark. User image used only as a style reference; no exact "
            "character design or ornaments copied."
        ),
    },
    {
        "key": "demonlord-samurai",
        "name": "Demonlord Samurai",
        "image_id": "hg28-boss-demonlord-samurai",
        "glow": "#9fe2df",
        "prompt": (
            "Original full-body Demonlord Samurai; horned demon mask, dark lacquered "
            "armor with aged-bronze plates, restrained crimson cloth, teal spectral "
            "seams and one curved katana. Premium dark-fantasy painted 3D-rendered "
            "game sprite, three-quarter view facing left, true transparent background, "
            "single subject, no text/UI/watermark. User image used only as a style "
            "reference; no exact character design or ornaments copied."
        ),
    },
)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def export_sprite(spec: dict) -> dict:
    raw_path = FOLDER / f"{spec['key']}-master.png"
    sprite_path = FOLDER / f"{spec['key']}.png"
    webp_path = FOLDER / f"{spec['key']}.webp"
    with Image.open(raw_path) as source:
        source = source.convert("RGBA")
        if source.getchannel("A").getextrema() != (0, 255):
            raise ValueError(f"{raw_path.name} must preserve full transparency and opaque pixels")
        alpha = source.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
        if not bbox:
            raise ValueError(f"{raw_path.name} has no visible silhouette")
        pad = 12
        left, top, right, bottom = bbox
        left, top = max(0, left - pad), max(0, top - pad)
        right, bottom = min(source.width, right + pad), min(source.height, bottom + pad)
        crop = source.crop((left, top, right, bottom))
        target_height = 476
        target_width = max(1, round(crop.width * target_height / crop.height))
        if target_width > 488:
            target_width = 488
            target_height = max(1, round(crop.height * target_width / crop.width))
        registered = crop.resize(
            (target_width, target_height), Image.Resampling.LANCZOS
        )
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        x = (512 - target_width) // 2
        y = 506 - target_height
        canvas.alpha_composite(registered, (x, y))
        canvas.save(sprite_path, format="PNG", optimize=True)
        canvas.save(
            webp_path,
            format="WEBP",
            quality=94,
            alpha_quality=100,
            method=6,
            exact=True,
        )
    with Image.open(webp_path) as runtime:
        runtime = runtime.convert("RGBA")
        if runtime.size != (512, 512) or runtime.getchannel("A").getextrema() != (0, 255):
            raise AssertionError(f"Runtime WebP failed dimensions/alpha QA: {webp_path.name}")
    return {
        "asset_id": f"hg28-boss-{spec['key']}",
        "name": spec["name"],
        "status": "RECREATED",
        "source_route": "built-in image_gen",
        "source_license": "original AI-generated project art; no third-party game asset used",
        "reference_role": "user-supplied image used only for broad style guidance",
        "source_master": raw_path.relative_to(ROOT).as_posix(),
        "source_sha256": digest(raw_path),
        "source_dimensions": [1254, 1254],
        "transparent_registered_png": sprite_path.relative_to(ROOT).as_posix(),
        "png_sha256": digest(sprite_path),
        "runtime_path": webp_path.relative_to(ROOT).as_posix(),
        "runtime_sha256": digest(webp_path),
        "runtime_dimensions": [512, 512],
        "runtime_bytes": webp_path.stat().st_size,
        "alpha": "true RGBA transparency; silhouette trimmed at alpha>=8 and foot registered",
        "pivot": [0.5, 0.988],
        "image_id": spec["image_id"],
        "glow": spec["glow"],
        "prompt_summary": spec["prompt"],
        "animation_status": (
            "master still; existing battle-state transform provides Idle/Walk/Attack/"
            "Hit/Death motion; full per-action frame clips remain unavailable without "
            "real action footage"
        ),
    }


def main() -> None:
    assets = [export_sprite(spec) for spec in SPRITES]
    manifest = {
        "schema": "HG28-BossSprites-v1",
        "created_by": "tools/prepare_hg28_boss_sprites.py",
        "art_direction": "original dark teal/bronze dark-fantasy cutout masters",
        "assets": assets,
    }
    path = FOLDER / "asset-manifest.json"
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    for asset in assets:
        print(
            f"{asset['name']}: {asset['runtime_bytes']} bytes WebP, "
            f"SHA256 {asset['runtime_sha256']}"
        )
    print(f"Manifest: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
