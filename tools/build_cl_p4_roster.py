#!/usr/bin/env python3
"""Convert CL-P4 generated roster art to offline WebP and embed in index.html."""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "p4"
SOURCES = {
    "atlas": "cl-p4-roster-atlas-source.png",
    "commander22": "cl-p4-commander-22-source.png",
    "commander23": "cl-p4-commander-23-source.png",
}
OUTPUTS = {
    "atlas": "cl-p4-roster-atlas.webp",
    "commander22": "cl-p4-commander-22.webp",
    "commander23": "cl-p4-commander-23.webp",
}
START = "// CL-P4_ROSTER_ASSETS_START"
END = "// CL-P4_ROSTER_ASSETS_END"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    rows = {}
    for key, source_name in SOURCES.items():
        source = ASSET_DIR / source_name
        output = ASSET_DIR / OUTPUTS[key]
        if not source.is_file():
            raise SystemExit(f"Missing original artwork: {source}")
        with Image.open(source) as image:
            image.convert("RGB").save(output, format="WEBP", quality=86, method=6)
        rows[key] = {
            "source": source_name,
            "sourceSha256": sha256(source),
            "sourceBytes": source.stat().st_size,
            "webp": OUTPUTS[key],
            "webpSha256": sha256(output),
            "webpBytes": output.stat().st_size,
            "dimensions": list(Image.open(output).size),
        }

    block = [START, "const CL_P4_ROSTER_ASSETS = {"]
    for key, output_name in OUTPUTS.items():
        payload = base64.b64encode((ASSET_DIR / output_name).read_bytes()).decode("ascii")
        block.append(f"  {key}: [\n    \"data:image/webp;base64,\",")
        block.extend(f'    "{payload[i:i + 100]}",' for i in range(0, len(payload), 100))
        block.append('  ].join(""),')
    block += ["};", END]
    index_path = ROOT / "index.html"
    html = index_path.read_text(encoding="utf-8")
    if START in html and END in html:
        before, remainder = html.split(START, 1)
        _, after = remainder.split(END, 1)
        html = before + "\n".join(block) + after
    else:
        marker = "const p4PortraitMap={"
        if marker not in html:
            raise SystemExit("Could not find the P4 portrait-map insertion point in index.html")
        html = html.replace(marker, "\n".join(block) + "\n" + marker, 1)
    index_path.write_text(html, encoding="utf-8", newline="")

    manifest = {
        "milestone": "CL-P4",
        "sourceType": "Built-in image generation; original project art, not extracted reference-game assets",
        "conversion": {"format": "WebP", "quality": 86, "method": 6, "pillow": PILLOW_VERSION},
        "atlasLayout": "5x5; cells 0-19 distinct; cells 20-21 duplicated or unused; 22-24 blank",
        "assets": rows,
    }
    (ASSET_DIR / "cl-p4-roster-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    for key, row in rows.items():
        print(f"{key}: {row['webp']} {row['webpBytes']} bytes sha256={row['webpSha256']}")
    print(f"Embedded three CL-P4 assets into {index_path.name}; Pillow {PILLOW_VERSION}")


if __name__ == "__main__":
    main()
