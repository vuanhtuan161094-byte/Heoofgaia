#!/usr/bin/env python3
"""Deterministically embed manifest-verified R04 portrait PNGs in canonical HTML."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
JS = ROOT / "tools" / "ngoa_long_r04.js"
ASSET_DIR = ROOT / "assets" / "r04"
MANIFEST = ASSET_DIR / "r04-original-visual-pilot-v1.json"
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"
BEGIN = "// === NL-R04 — original visual pilot ==="
END = "// === end NL-R04 ==="
EXPECTED = {"scout", "tactician"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def png_header(data: bytes) -> tuple[int, int, int, int]:
    if len(data) < 33 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("R04 registered asset is not a valid PNG")
    width, height = struct.unpack(">II", data[16:24])
    bit_depth, color_type, compression, filtering, interlace = data[24:29]
    if compression != 0 or filtering != 0 or interlace not in (0, 1):
        raise ValueError("R04 PNG has an unsupported encoding")
    return width, height, bit_depth, color_type


def build(source_html: str) -> str:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("status") != "RECREATED" or manifest.get("animationStatus") != "TWO_POSE_SCOUT_DIRECTIONAL_PILOT":
        raise ValueError("R04 manifest must preserve generated-art and limited two-pose status")
    if manifest.get("canvas") != {"width": 512, "height": 640, "format": "RGBA PNG"}:
        raise ValueError("R04 canvas contract mismatch")
    characters = {item.get("id"): item for item in manifest.get("characters", [])}
    if set(characters) != EXPECTED:
        raise ValueError("R04 manifest must contain the two contracted pilot identities")
    encoded = {}
    for cid, character in characters.items():
        raw = (ASSET_DIR / character["rawMaster"]).read_bytes()
        registered = (ASSET_DIR / character["registeredMaster"]).read_bytes()
        if sha(raw) != character["rawSha256"] or sha(registered) != character["registeredSha256"]:
            raise ValueError(f"R04 {cid} source/registered hash mismatch")
        width, height, depth, color_type = png_header(registered)
        if (width, height, depth, color_type) != (512, 640, 8, 6):
            raise ValueError(f"R04 {cid} must be 512x640 8-bit RGBA PNG")
        encoded[cid] = base64.b64encode(registered).decode("ascii")
    poses = manifest.get("poseFrames", [])
    if len(poses) != 1 or poses[0].get("id") != "scout-attack-contact" or poses[0].get("characterId") != "scout":
        raise ValueError("R04 pilot requires exactly one explicitly scoped scout contact pose")
    pose = poses[0]
    if pose.get("registrationTool") != "tools/register_nl_r04_attack.py" or pose.get("registrationPillow") != "11.3.0":
        raise ValueError("R04 key pose registration provenance must pin its reproducible source toolchain")
    pose_raw = (ASSET_DIR / pose["rawMaster"]).read_bytes()
    pose_registered = (ASSET_DIR / pose["registeredMaster"]).read_bytes()
    if sha(pose_raw) != pose["rawSha256"] or sha(pose_registered) != pose["registeredSha256"]:
        raise ValueError("R04 scout contact pose source/registered hash mismatch")
    width, height, depth, color_type = png_header(pose_registered)
    if (width, height, depth, color_type) != (768, 640, 8, 6):
        raise ValueError("R04 scout contact pose must be 768x640 8-bit RGBA PNG")
    encoded["scoutAttack"] = base64.b64encode(pose_registered).decode("ascii")
    if source_html.count(BOOT) != 1:
        raise ValueError("Canonical index must contain exactly one bootstrap")
    if source_html.count(BEGIN) != source_html.count(END) or source_html.count(BEGIN) > 1:
        raise ValueError("R04 markers must be absent or balanced once")
    patch = JS.read_text(encoding="utf-8")
    for key, data in encoded.items():
        patch = patch.replace(f"__R04_{key.upper()}_PNG_BASE64__", data)
    if "__R04_" in patch:
        raise ValueError("Unresolved R04 image placeholder")
    if BEGIN in source_html:
        start = source_html.index(BEGIN)
        finish = source_html.index(END, start) + len(END)
        return source_html[:start] + patch.rstrip() + source_html[finish:]
    return source_html.replace(BOOT, patch.rstrip() + "\n" + BOOT, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify the canonical embedded HTML")
    args = parser.parse_args()
    original = INDEX.read_text(encoding="utf-8")
    expected = build(original)
    if args.check:
        if original != expected:
            raise SystemExit("R04 embedded HTML differs from its hashed PNG sources")
        print("R04 asset/index build reproducible")
        return
    if original != expected:
        INDEX.write_text(expected, encoding="utf-8", newline="")
    print("R04 embedded two manifest-verified portrait masters and the event-gated scout pose into index.html")


if __name__ == "__main__":
    main()
