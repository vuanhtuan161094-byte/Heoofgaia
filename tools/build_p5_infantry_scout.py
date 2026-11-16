#!/usr/bin/env python3
"""Build and optionally embed the original CL-P5 infantry scout sprite atlas."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "p5" / "cl-p5-infantry-scout-v1"
QA_DIR = ROOT / "qa"
INDEX = ROOT / "index.html"
ATLAS = ASSET_DIR / "cl-p5-infantry-scout-atlas.webp"
CONTACT = QA_DIR / "p5-infantry-scout-contact.png"
MANIFEST = ASSET_DIR / "cl-p5-infantry-scout-manifest.json"
START = "// CL-P5_INFANTRY_SCOUT_ATLAS_START"
END = "// CL-P5_INFANTRY_SCOUT_ATLAS_END"
FRAME_W, FRAME_H, GRID = 100, 144, 4
DIRECTIONS = ["front", "right", "back", "left"]
ACTIONS = ["idle", "walk", "attack", "hurt", "death"]
SOURCE_FILES = {action: ASSET_DIR / f"{action}-4x4-sheet.png" for action in ACTIONS}
MASTER = ASSET_DIR / "cl-p5-infantry-scout-master.png"
REJECTED_SOURCES = {
    "attack-4x4-sheet-before-v2.png": "Two profile thrust tips crossed cell boundaries.",
    "attack-4x4-sheet-cleanup-rejected.png": "Detached fragments were reduced, but thrust margins still failed review.",
    "hurt-4x4-sheet-source-rejected.png": "Checkerboard/noise background was visible in the alpha cutout.",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell_box(width: int, height: int, row: int, col: int) -> tuple[int, int, int, int]:
    return (
        round(col * width / GRID),
        round(row * height / GRID),
        round((col + 1) * width / GRID),
        round((row + 1) * height / GRID),
    )


def extract_clean_cell(source: Image.Image, row: int, col: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    box = cell_box(source.width, source.height, row, col)
    frame = source.crop(box).convert("RGBA")
    alpha = frame.getchannel("A").point(lambda value: value if value >= 8 else 0)

    # Keep the soft edge near opaque character pixels; discard transparent color specks.
    core = alpha.point(lambda value: 255 if value >= 128 else 0)
    edge_guard = core.filter(ImageFilter.MaxFilter(9))
    alpha = ImageChops.multiply(alpha, edge_guard)
    frame.putalpha(alpha)

    content = alpha.point(lambda value: 255 if value >= 32 else 0)
    bounds = content.getbbox()
    if bounds is None:
        raise ValueError(f"No foreground sprite in row {row}, column {col}")
    return frame.crop(bounds), bounds


def embed_atlas(payload: str) -> None:
    html = INDEX.read_text(encoding="utf-8")
    block = [START, "const CL_P5_INFANTRY_SCOUT_ATLAS = [", '  "data:image/webp;base64,",']
    block.extend(f'  "{payload[i:i + 100]}",' for i in range(0, len(payload), 100))
    block.extend(["].join(\"\");", END])
    replacement = "\n".join(block)

    if START in html and END in html:
        before, remainder = html.split(START, 1)
        _, after = remainder.split(END, 1)
        html = before + replacement + after
    else:
        marker = "const CL_P5_INFANTRY_SCOUT_ANIM={"
        if marker not in html:
            raise SystemExit("Could not find CL-P5 infantry atlas insertion point in index.html")
        html = html.replace(marker, replacement + "\n" + marker, 1)
    INDEX.write_text(html, encoding="utf-8", newline="")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--embed", action="store_true", help="embed the packed WebP in canonical index.html")
    parser.add_argument("--asset-qc-pass", action="store_true", help="record that visual and Chromium asset gates passed")
    parser.add_argument("--scale", type=float, default=0.95, help="maximum ratio of source cell to the 100x144 frame")
    args = parser.parse_args()

    if not MASTER.is_file():
        raise SystemExit(f"Missing identity master: {MASTER}")
    for path in SOURCE_FILES.values():
        if not path.is_file():
            raise SystemExit(f"Missing source sheet: {path}")

    prepared: dict[str, list[list[tuple[Image.Image, tuple[int, int, int, int]]]]] = {}
    source_dimensions: dict[str, list[int]] = {}
    bboxes: list[tuple[int, int]] = []
    for action, path in SOURCE_FILES.items():
        with Image.open(path) as im:
            im = im.convert("RGBA")
            if abs(im.width - im.height) > 1 or im.width < GRID * 250:
                raise ValueError(f"Unexpected sprite sheet geometry for {path.name}: {im.size}")
            source_dimensions[action] = list(im.size)
            rows = []
            for direction in range(GRID):
                frames = []
                for frame_index in range(GRID):
                    sprite, bounds = extract_clean_cell(im, direction, frame_index)
                    bboxes.append((sprite.width, sprite.height))
                    frames.append((sprite, bounds))
                rows.append(frames)
            prepared[action] = rows

    max_w = max(width for width, _ in bboxes)
    max_h = max(height for _, height in bboxes)
    scale = min((FRAME_W - 6) / max_w, (FRAME_H - 8) / max_h) * args.scale
    atlas = Image.new("RGBA", (GRID * FRAME_W, len(ACTIONS) * GRID * FRAME_H), (0, 0, 0, 0))
    contact = Image.new("RGBA", atlas.size, (19, 34, 31, 255))
    frame_report = []

    for action_index, action in enumerate(ACTIONS):
        for direction_index, frames in enumerate(prepared[action]):
            for frame_index, (sprite, bounds) in enumerate(frames):
                size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
                scaled = sprite.resize(size, Image.Resampling.LANCZOS)
                x = (FRAME_W - scaled.width) // 2
                y = FRAME_H - 4 - scaled.height
                cell = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
                cell.alpha_composite(scaled, (x, y))
                atlas_x, atlas_y = frame_index * FRAME_W, (action_index * GRID + direction_index) * FRAME_H
                atlas.alpha_composite(cell, (atlas_x, atlas_y))
                checker = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
                checker.alpha_composite(cell)
                contact.alpha_composite(checker, (atlas_x, atlas_y))
                frame_report.append({
                    "action": action,
                    "direction": DIRECTIONS[direction_index],
                    "frame": frame_index,
                    "sourceCellBounds": list(bounds),
                    "trimmedSize": list(sprite.size),
                    "packedRect": [atlas_x, atlas_y, FRAME_W, FRAME_H],
                })

    ATLAS.parent.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS, format="WEBP", lossless=True, method=6)
    contact.convert("RGB").save(CONTACT, format="PNG", optimize=True)
    if args.embed:
        embed_atlas(base64.b64encode(ATLAS.read_bytes()).decode("ascii"))

    sources = [{
        "path": path.name,
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "dimensions": source_dimensions[action],
    } for action, path in SOURCE_FILES.items()]
    rejected_sources = []
    for name, reason in REJECTED_SOURCES.items():
        path = ASSET_DIR / name
        if path.is_file():
            with Image.open(path) as im:
                dimensions = list(im.size)
            rejected_sources.append({
                "path": name,
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
                "dimensions": dimensions,
                "rejectionReason": reason,
            })
    manifest = {
        "assetId": "cl-p5-infantry-scout-v1",
        "milestone": "CL-P5",
        "status": "RECREATED",
        "provider": "built-in image_gen",
        "providerCost": "unknown",
        "createdAt": "2026-11-17",
        "promptLog": "PROMPTS.md",
        "master": {"path": MASTER.name, "sha256": sha256(MASTER), "bytes": MASTER.stat().st_size},
        "sourceSheets": sources,
        "rejectedSources": rejected_sources,
        "conversion": {
            "tool": f"Pillow {PILLOW_VERSION}",
            "cellTrim": "alpha >= 32 after alpha<8 removal and a 4px guard around opaque pixels",
            "registration": "global scale; horizontal center; ground line y=140",
            "scale": round(scale, 6),
        },
        "atlas": {
            "path": ATLAS.name,
            "sha256": sha256(ATLAS),
            "bytes": ATLAS.stat().st_size,
            "dimensions": list(atlas.size),
            "format": "lossless WebP",
            "cell": [FRAME_W, FRAME_H],
            "columns": GRID,
            "rows": len(ACTIONS) * GRID,
            "rowOrder": [f"{action}/{direction}" for action in ACTIONS for direction in DIRECTIONS],
            "fps": {"idle": 4, "walk": 8, "attack": 10, "hurt": 8, "death": 6},
            "pivot": [50, 140],
        },
        "image_created": True,
        "file_exported": True,
        "asset_qc_pass": bool(args.asset_qc_pass),
        "integrated_in_game": bool(args.embed),
        "integrationScope": {
            "liveActions": ["idle", "attack", "hurt", "death"],
            "availableForFutureUse": ["walk"],
            "liveBattleUnit": "infantry",
            "fallbackUnits": ["cavalry", "archer", "strategist"],
        },
        "automatedChecks": {
            "sheetCells": len(frame_report),
            "allCellsHaveForeground": True,
            "frameReport": frame_report,
        },
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "atlas": ATLAS.name,
        "sha256": manifest["atlas"]["sha256"],
        "bytes": manifest["atlas"]["bytes"],
        "dimensions": manifest["atlas"]["dimensions"],
        "frames": len(frame_report),
        "scale": round(scale, 6),
        "embedded": args.embed,
        "contact": str(CONTACT.relative_to(ROOT)),
    }))


if __name__ == "__main__":
    main()
