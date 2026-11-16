#!/usr/bin/env python3
"""Create the offline CL-P5 map derivative and embed it into index.html."""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "p5"
SOURCE = ASSET_DIR / "cl-p5-region-map-source.png"
OUTPUT = ASSET_DIR / "cl-p5-region-map.webp"
INDEX = ROOT / "index.html"
START = "// CL-P5_REGION_MAP_START"
END = "// CL-P5_REGION_MAP_END"
PROMPT = (
    "Create a polished original background painting for an offline Three Kingdoms-inspired strategy game called Mưu Định Tam Quốc. "
    "Landscape 3:2 composition, richly detailed but calm painterly 2.5D/isometric regional map at dawn: layered jade green mountains around a broad river valley, forests, pale stone ridges, rice terraces, faint existing mountain passes only as natural geography, distant hazy peaks, warm parchment-gold light and deep teal shadows. "
    "Top-down oblique view, designed to sit behind independently interactive HTML map markers and route overlays: keep the center and lower-middle landscape relatively low-contrast and uncluttered so labels can be read. "
    "Show geography only as a scenic painted region, not a functional game map. Absolutely no text, calligraphy, symbols, flags, borders, route lines, paths, dotted lines, buildings, settlement icons, people, soldiers, UI, frame, logos or watermarks. "
    "Preserve clean realistic landscape silhouettes without tiny focal clutter. Original image, not resembling any specific existing game's map or screenshot."
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing original generated map source: {SOURCE}")
    with Image.open(SOURCE) as im:
        source_dimensions = list(im.size)
        im.convert("RGB").save(OUTPUT, format="WEBP", quality=86, method=6)

    payload = base64.b64encode(OUTPUT.read_bytes()).decode("ascii")
    block = [START, "const CL_P5_REGION_MAP = [", '  "data:image/webp;base64,",']
    block.extend(f'  "{payload[i:i + 100]}",' for i in range(0, len(payload), 100))
    block += ['].join("");', END]

    html = INDEX.read_text(encoding="utf-8")
    if START in html and END in html:
        before, remainder = html.split(START, 1)
        _, after = remainder.split(END, 1)
        html = before + "\n".join(block) + after
    else:
        marker = "const p4PortraitMap={"
        if marker not in html:
            raise SystemExit("Could not find the CL-P5 asset insertion point in index.html")
        html = html.replace(marker, "\n".join(block) + "\n" + marker, 1)
    INDEX.write_text(html, encoding="utf-8", newline="")

    with Image.open(OUTPUT) as im:
        packed_dimensions = list(im.size)
    manifest = {
        "milestone": "CL-P5",
        "assetId": "cl-p5-region-map",
        "status": "RECREATED",
        "sourceType": "ChatGPT built-in image generation; original scenic background, not extracted from reference game",
        "promptVersion": "p5-region-map-v1",
        "prompt": PROMPT,
        "providerCost": "unknown",
        "createdAt": "2026-11-17",
        "image_created": True,
        "file_exported": True,
        "asset_qc_pass": False,
        "integrated_in_game": False,
        "source": {"path": SOURCE.name, "sha256": sha256(SOURCE), "bytes": SOURCE.stat().st_size, "dimensions": source_dimensions},
        "packed": {"path": OUTPUT.name, "sha256": sha256(OUTPUT), "bytes": OUTPUT.stat().st_size, "dimensions": packed_dimensions, "format": "WebP"},
        "conversion": {"format": "WebP", "quality": 86, "method": 6, "pillow": PILLOW_VERSION},
        "composition": "Single painted scenic background, no game labels/nodes/routes/UI; controls and territory state remain separate DOM/SVG elements",
    }
    (ASSET_DIR / "cl-p5-region-map-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"sourceSha256": manifest["source"]["sha256"], "packedSha256": manifest["packed"]["sha256"], "packedBytes": manifest["packed"]["bytes"], "dimensions": packed_dimensions}))


if __name__ == "__main__":
    main()
