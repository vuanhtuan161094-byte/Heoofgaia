"""Prepare original HG33 8x5 action atlases for all non-legacy animated troops.
Original PNGs remain editable/source-of-truth. Runtime WebPs are offline-safe encodings.
"""
from __future__ import annotations
from datetime import date
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib
import json
import re
import subprocess
import sys
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
SOURCE_DIR = ROOT / "assets/original/hg33/troops"
RUNTIME_DIR = ROOT / "assets/generated/hg33/animation/runtime"
MANIFEST_PATH = ROOT / "assets/generated/hg33/animation/troop-atlas-manifest.json"
JS_PATH = ROOT / "art-hg33-troop-atlases.js"
RACES = ("human", "elf", "orc", "undead")
RETAINED = {
    "human_3": {"kind": "existing-authored-atlas", "name": "Archer", "actions": ["idle", "walk", "draw", "release", "hit", "death"], "source": "HG14.3"},
    "undead_1": {"kind": "existing-preserved-animation", "name": "Skeleton Warrior", "actions": ["idle", "walk", "attack", "hit", "death"], "source": "HG22.1"},
}
ACTION_DEFS = {
    "idle": {"row": 0, "durationMs": 960, "loop": True, "minimumAdjacentMae": 0.004},
    "walk": {"row": 1, "durationMs": 640, "loop": True, "minimumAdjacentMae": 0.008},
    "attack": {"row": 2, "durationMs": 650, "loop": False, "minimumAdjacentMae": 0.012},
    "hit": {"row": 3, "durationMs": 560, "loop": False, "minimumAdjacentMae": 0.008},
    "death": {"row": 4, "durationMs": 1200, "loop": False, "minimumAdjacentMae": 0.008},
}
COLUMNS, ROWS = 8, 5
ATLAS_SIZE = (1536, 1024)
FRAME_SIZE = (192, 204)
ALPHA_MATTE_UNITS = {"human_8", "undead_7", "undead_10"}
ALPHA_MATTE_PROFILE = {
    "method": "per-frame border-connected neutral matte removal",
    "version": 1,
    "candidate": "alpha 1..159, saturation <= 0.15, brightness > 125",
    "connectivity": 4,
    "effect": "sets connected matte alpha to 0; retains RGB and all other pixels",
}

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def catalog_names() -> dict[str, tuple[str, str]]:
    text = (ROOT / "data.js").read_text(encoding="utf-8")
    names: dict[str, tuple[str, str]] = {}
    for race in RACES:
        match = re.search(rf"(?m)^\s*{race}:\s*\x60([^\x60]*)\x60", text)
        if not match:
            raise ValueError(f"Missing {race} unit catalog in data.js")
        rows = [row.strip() for row in match.group(1).splitlines() if row.strip()]
        for tier, row in enumerate(rows, 1):
            names[f"{race}_{tier}"] = (row.split("|", 1)[0].strip(), race)
    if len(names) != 40:
        raise ValueError(f"Expected 40 catalog troops, found {len(names)}")
    return names

def image_file(unit_id: str) -> Path:
    if unit_id == "human_4":
        return SOURCE_DIR / "human-vanguard-atlas.png"
    race, tier = unit_id.split("_")
    return SOURCE_DIR / f"{race}-{tier}-atlas.png"

def measure_action(image: Image.Image, row: int) -> tuple[list[dict], float]:
    frames, hashes, diffs, visible_hashes = [], [], [], []
    previous_visible = False
    for column in range(COLUMNS):
        frame = image.crop((column * FRAME_SIZE[0], row * FRAME_SIZE[1],
                            (column + 1) * FRAME_SIZE[0], (row + 1) * FRAME_SIZE[1]))
        alpha = frame.getchannel("A")
        visible = alpha.point(lambda value: 255 if value >= 3 else 0).getbbox() is not None
        if not visible and row != 4:
            raise ValueError(f"Empty non-death atlas cell at row {row}, column {column}")
        digest = sha256(frame.tobytes())
        hashes.append(digest)
        if visible:
            visible_hashes.append(digest)
        frames.append({"index": column, "visible": visible,
                       "rect": [column * FRAME_SIZE[0], row * FRAME_SIZE[1], FRAME_SIZE[0], FRAME_SIZE[1]],
                       "sha256Rgba": digest})
        if column and (previous_visible or visible):
            prev = image.crop(((column - 1) * FRAME_SIZE[0], row * FRAME_SIZE[1],
                               column * FRAME_SIZE[0], (row + 1) * FRAME_SIZE[1]))
            diff = ImageChops.difference(frame, prev)
            diffs.append(sum(ImageStat.Stat(diff).mean) / (4 * 255))
        previous_visible = visible
    if row == 4:
        if len(set(visible_hashes)) < 4:
            raise ValueError("Death row must contain at least four distinct visible poses")
    elif len(set(hashes)) != COLUMNS:
        raise ValueError(f"Repeated source frames in row {row}")
    return frames, min(diffs)

def remove_border_matte(image: Image.Image) -> tuple[Image.Image, int, float, float]:
    """Remove only low-alpha neutral pixels connected to each cell's edge."""
    image = image.copy().convert("RGBA")
    pixels = bytearray(image.tobytes())
    before = bytearray(pixels[3::4])
    removed = 0
    for frame_y in range(ROWS):
        for frame_x in range(COLUMNS):
            width, height = FRAME_SIZE
            offset_x, offset_y = frame_x * width, frame_y * height
            count = width * height
            candidate = bytearray(count)
            for y in range(height):
                base = ((offset_y + y) * ATLAS_SIZE[0] + offset_x) * 4
                local = y * width
                for x in range(width):
                    index = base + x * 4
                    red, green, blue, alpha = pixels[index:index + 4]
                    high, low = max(red, green, blue), min(red, green, blue)
                    brightness = (red * 299 + green * 587 + blue * 114) / 1000
                    if (0 < alpha <= 159 and high > 0
                            and (high - low) / high <= 0.15
                            and brightness > 125):
                        candidate[local + x] = 1

            reached = bytearray(count)
            queue = deque()
            for x in range(width):
                for y in (0, height - 1):
                    pos = y * width + x
                    if candidate[pos] and not reached[pos]:
                        reached[pos] = 1
                        queue.append(pos)
            for y in range(height):
                for x in (0, width - 1):
                    pos = y * width + x
                    if candidate[pos] and not reached[pos]:
                        reached[pos] = 1
                        queue.append(pos)
            while queue:
                pos = queue.popleft()
                x, y = pos % width, pos // width
                for neighbor in ((pos - 1) if x else -1,
                                 (pos + 1) if x < width - 1 else -1,
                                 (pos - width) if y else -1,
                                 (pos + width) if y < height - 1 else -1):
                    if neighbor >= 0 and candidate[neighbor] and not reached[neighbor]:
                        reached[neighbor] = 1
                        queue.append(neighbor)
            for pos, should_remove in enumerate(reached):
                if should_remove:
                    x, y = pos % width, pos // width
                    index = ((offset_y + y) * ATLAS_SIZE[0] + offset_x + x) * 4 + 3
                    if pixels[index]:
                        pixels[index] = 0
                        removed += 1

    image.frombytes(bytes(pixels))
    def frame_border_ratio(alpha: bytes) -> float:
        visible = total = 0
        for frame_y in range(ROWS):
            for frame_x in range(COLUMNS):
                ox, oy = frame_x * FRAME_SIZE[0], frame_y * FRAME_SIZE[1]
                for x in range(FRAME_SIZE[0]):
                    for y in (0, FRAME_SIZE[1] - 1):
                        visible += alpha[(oy + y) * ATLAS_SIZE[0] + ox + x] > 32
                        total += 1
                for y in range(1, FRAME_SIZE[1] - 1):
                    for x in (0, FRAME_SIZE[0] - 1):
                        visible += alpha[(oy + y) * ATLAS_SIZE[0] + ox + x] > 32
                        total += 1
        return visible / total
    before_ratio = frame_border_ratio(bytes(before))
    after_ratio = frame_border_ratio(bytes(pixels[3::4]))
    return image, removed, before_ratio, after_ratio
def main() -> dict:
    subprocess.check_call([sys.executable, str(TOOLS / "prepare_hg33_human_vanguard.py")])
    names = catalog_names()
    expected = set(names) - set(RETAINED)
    if len(expected) != 38:
        raise ValueError(f"Expected 38 atlas-backed units, found {len(expected)}")
    missing = [unit_id for unit_id in sorted(expected) if not image_file(unit_id).is_file()]
    if missing:
        raise FileNotFoundError("Missing atlas PNGs: " + ", ".join(missing))
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    existing_by_unit = {}
    if MANIFEST_PATH.is_file():
        try:
            existing_by_unit = {item['unitId']: item for item in json.loads(MANIFEST_PATH.read_text(encoding='utf-8')).get('assets', [])}
        except (OSError, ValueError, KeyError):
            existing_by_unit = {}
    assets = []
    for unit_id in sorted(expected, key=lambda value: (RACES.index(value.split("_")[0]), int(value.split("_")[1]))):
        name, race = names[unit_id]
        source = image_file(unit_id)
        source_bytes = source.read_bytes()
        image = Image.open(source).convert("RGBA")
        if image.size != ATLAS_SIZE:
            raise ValueError(f"{unit_id}: expected atlas {ATLAS_SIZE}, got {image.size}")
        alpha_processing = None
        if unit_id in ALPHA_MATTE_UNITS:
            image, removed_pixels, border_alpha_before, border_alpha_after = remove_border_matte(image)
            alpha_processing = {
                **ALPHA_MATTE_PROFILE,
                "removedPixels": removed_pixels,
                "alphaOver32BeforeRatio": round(border_alpha_before, 6),
                "alphaOver32AfterRatio": round(border_alpha_after, 6),
            }
        alpha = image.getchannel("A")
        amin, amax = alpha.getextrema()
        corners = [image.getpixel(point)[3] for point in ((0, 0), (1535, 0), (0, 1023), (1535, 1023))]
        if amax < 240 or max(corners) > 64:
            raise ValueError(f"{unit_id}: not cleanly transparent (alpha={amin}..{amax}, corners={corners})")
        actions = {}
        for action, config in ACTION_DEFS.items():
            frames, minimum = measure_action(image, config["row"])
            if minimum < config["minimumAdjacentMae"]:
                raise ValueError(f"{unit_id}/{action}: too static, min adjacent MAE={minimum:.5f}")
            actions[action] = {**config, "count": COLUMNS,
                               "minimumAdjacentMae": round(minimum, 5), "frames": frames}

        slug = unit_id.replace("_", "-")
        image_id = "unit-human-vanguard-atlas" if unit_id == "human_4" else f"unit-hg33-{slug}-atlas"
        runtime_name = "human-vanguard.webp" if unit_id == "human_4" else f"{slug}-atlas.webp"
        runtime = RUNTIME_DIR / runtime_name
        previous = existing_by_unit.get(unit_id, {})
        if (previous.get("sourceSha256") == sha256(source_bytes)
                and (previous.get("alphaProcessing") or {}).get("version") == (alpha_processing or {}).get("version")
                and previous.get("runtimePath") == runtime.relative_to(ROOT).as_posix()
                and runtime.is_file()):
            runtime_bytes = runtime.read_bytes()
            if sha256(runtime_bytes) != previous.get("runtimeSha256"):
                image.save(runtime, "WEBP", quality=92, method=6)
                runtime_bytes = runtime.read_bytes()
        else:
            image.save(runtime, "WEBP", quality=92, method=6)
            runtime_bytes = runtime.read_bytes()
        tier = int(unit_id.split("_")[1])
        render_width = 112 + min(18, (tier - 1) * 2)
        pivot = 0.92 if unit_id in {"undead_2", "undead_4", "undead_6", "undead_8", "undead_10"} else 0.985
        assets.append({
            "unitId": unit_id, "name": name, "race": race, "tier": tier,
            "imageId": image_id, "sourcePath": source.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source_bytes), "sourceBytes": len(source_bytes),
            "alphaProcessing": alpha_processing,
            "runtimePath": runtime.relative_to(ROOT).as_posix(),
            "runtimeSha256": sha256(runtime_bytes), "runtimeBytes": len(runtime_bytes),
            "atlasDimensions": list(ATLAS_SIZE), "frameDimensions": list(FRAME_SIZE),
            "columns": COLUMNS, "rows": ROWS, "frameCount": COLUMNS * ROWS,
            "fps": 8, "pivot": pivot, "renderWidth": render_width,
            "generationTool": "built-in image_gen",
            "artistRoute": "built-in image_gen",
            "actionArtKind": "independently-authored-frames",
            "assetStatus": "RECREATED",
            "sourceFormat": "Editable RGBA PNG 8x5 raster atlas with frame rectangles and hashes in this manifest.",
            "thirdPartySource": "none",
            "creationMethod": "Original project-commissioned fantasy unit art and action poses; no game-client art, third-party character sheets, or external models used.",
            "promptSummary": f"Unique {race} faction unit {name}, same identity across an 8x5 transparent atlas: idle, species-appropriate walk, signature attack, hit recoil and death; polished painterly fantasy strategy-game rendering.",
            "actions": actions,
        })

    manifest = {
        "schema": "HG33-OriginalTroopAnimationAtlases-v1",
        "createdDate": date.today().isoformat(), "unitCount": len(names),
        "atlasCount": len(assets), "frameCount": sum(item["frameCount"] for item in assets),
        "nativePreserved": RETAINED, "assets": assets,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    js_units = {
        item["unitId"]: {
            "name": item["name"], "race": item["race"], "tier": item["tier"],
            "imageId": item["imageId"], "atlasWidth": ATLAS_SIZE[0], "atlasHeight": ATLAS_SIZE[1],
            "frameWidth": FRAME_SIZE[0], "frameHeight": FRAME_SIZE[1], "columns": COLUMNS,
            "rows": ROWS, "fps": item["fps"], "pivot": item["pivot"],
            "renderWidth": item["renderWidth"], "actions": {
                key: {k: v for k, v in item["actions"][key].items() if k != "frames"}
                for key in ACTION_DEFS
            },
        } for item in assets
    }
    js = """/* HG33 original troop atlas index; generated from the source atlas manifest. */
(function(root){
'use strict';
const units=Object.freeze(%s);
const retained=Object.freeze(%s);
root.HOG_HG33_TROOP_ATLASES=Object.freeze({
 units, retained,
 hasUnit(id){return Object.prototype.hasOwnProperty.call(units,id)||Object.prototype.hasOwnProperty.call(retained,id)},
 profile(id){const u=units[id];return u?{size:u.renderWidth,pivot:u.pivot}:null}
});
})(typeof globalThis!=='undefined'?globalThis:this);
""" % (json.dumps(js_units, ensure_ascii=False, separators=(",", ":")),
       json.dumps(RETAINED, ensure_ascii=False, separators=(",", ":")))
    JS_PATH.write_text(js, encoding="utf-8", newline="\n")
    print(f"HG33 atlas QA PASS: {len(assets)} units, {len(assets)*40} frame cells, {sum(x['runtimeBytes'] for x in assets):,} runtime bytes")
    return manifest

if __name__ == "__main__":
    main()
