#!/usr/bin/env python3
"""Reproducibly register R04 original pilot masters and embed them in canonical HTML."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
JS = ROOT / "tools" / "ngoa_long_r04.js"
ASSET_DIR = ROOT / "assets" / "r04"
CANVAS = (512, 640)
SAFE_MARGIN = (28, 34)
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"
BEGIN = "// === NL-R04 — original visual pilot ==="
END = "// === end NL-R04 ==="
ASSETS = {
    "scout": ("r04-original-bulwark-scout-v1-raw-master.png", "r04-original-bulwark-scout-v1-master.png", "Trinh sát biên cảnh", "r03-bulwark"),
    "tactician": ("r04-original-field-tactician-v1-raw-master.png", "r04-original-field-tactician-v1-master.png", "Nữ quân sư tiền tuyến", "r03-ember"),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def register(raw: bytes) -> tuple[bytes, dict]:
    from io import BytesIO
    source = Image.open(BytesIO(raw)).convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("R04 master has no opaque pixels")
    crop = source.crop(bbox)
    max_w = CANVAS[0] - SAFE_MARGIN[0] * 2
    max_h = CANVAS[1] - SAFE_MARGIN[1] * 2
    scale = min(max_w / crop.width, max_h / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    left = (CANVAS[0] - size[0]) // 2
    top = CANVAS[1] - SAFE_MARGIN[1] - size[1]
    out.alpha_composite(crop, (left, top))
    stream = BytesIO()
    out.save(stream, format="PNG", optimize=False, compress_level=9)
    result = stream.getvalue()
    out_alpha = out.getchannel("A")
    meta = {
        "sourceDimensions": list(source.size),
        "sourceAlphaBounds": list(bbox),
        "canvas": list(CANVAS),
        "registeredAlphaBounds": list(out_alpha.getbbox()),
        "registeredOpaquePixelCount": sum(1 for value in out_alpha.getdata() if value > 0),
        "transparentPixelCount": sum(1 for value in out_alpha.getdata() if value == 0),
        "pivot": {"x": 0.5, "y": 1.0},
    }
    return result, meta


def build(source_html: str) -> tuple[str, dict]:
    if source_html.count(BOOT) != 1:
        raise ValueError("Canonical index must contain exactly one bootstrap")
    if source_html.count(BEGIN) != source_html.count(END) or source_html.count(BEGIN) > 1:
        raise ValueError("R04 markers must be absent or balanced once")
    records = {}
    encoded = {}
    manifest = {
        "assetPack": "r04-original-visual-pilot-v1",
        "status": "RECREATED",
        "route": "OpenAI image_gen original character generation/editing; no external game assets used",
        "classification": "SIMULATED project art, not an official Ngọa Long asset",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1], "format": "RGBA PNG"},
        "displayTargetCssPixels": {"width": 56, "height": 70},
        "animationStatus": "STATIC_MASTER_ONLY",
        "characters": [],
    }
    for key, (raw_name, registered_name, label, encounter) in ASSETS.items():
        raw_path = ASSET_DIR / raw_name
        raw = raw_path.read_bytes()
        registered, details = register(raw)
        registered_path = ASSET_DIR / registered_name
        records[registered_path] = registered
        encoded[key] = base64.b64encode(registered).decode("ascii")
        manifest["characters"].append({
            "id": key,
            "label": label,
            "encounterId": encounter,
            "promptRef": f"generation_prompts.md#{key}",
            "identity": "Original fictional character; not a historical or VNG character",
            "rawMaster": raw_name,
            "rawSha256": sha(raw),
            "registeredMaster": registered_name,
            "registeredSha256": sha(registered),
            **details,
        })
    patch = JS.read_text(encoding="utf-8")
    for key, data in encoded.items():
        patch = patch.replace(f"__R04_{key.upper()}_PNG_BASE64__", data)
    if "__R04_" in patch:
        raise ValueError("Unresolved R04 image placeholder")
    if BEGIN in source_html:
        start = source_html.index(BEGIN)
        finish = source_html.index(END, start) + len(END)
        source_html = source_html[:start] + patch.rstrip() + source_html[finish:]
    else:
        source_html = source_html.replace(BOOT, patch.rstrip() + "\n" + BOOT, 1)
    manifest_path = ASSET_DIR / "r04-original-visual-pilot-v1.json"
    records[manifest_path] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return source_html, records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    html, files = build(INDEX.read_text(encoding="utf-8"))
    mismatches = []
    for path, expected in files.items():
        if not path.exists() or path.read_bytes() != expected:
            mismatches.append(str(path.relative_to(ROOT)))
            if not args.check:
                path.write_bytes(expected)
    if args.check:
        expected_index = html
        if INDEX.read_text(encoding="utf-8") != expected_index:
            mismatches.append("index.html")
        if mismatches:
            raise SystemExit("R04 build differs: " + ", ".join(mismatches))
        print("R04 asset/index build reproducible")
        return
    if INDEX.read_text(encoding="utf-8") != html:
        INDEX.write_text(html, encoding="utf-8", newline="")
    print(f"R04 registered {len(ASSETS)} original masters and embedded them into index.html")


if __name__ == "__main__":
    main()
