"""Validate and receipt the original HG33 Human Vanguard 8x5 action atlas."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/original/hg33/troops/human-vanguard-atlas.png"
OUT = ROOT / "assets/generated/hg33/animation/human-vanguard-atlas.json"
ACTIONS = ("idle", "walk", "attack", "hit", "death")
COLUMNS, ROWS = 8, 5
CLIPS = {
    "idle": {"duration_ms": 960, "loop": True},
    "walk": {"duration_ms": 640, "loop": True},
    "attack": {"duration_ms": 650, "loop": False},
    "hit": {"duration_ms": 560, "loop": False},
    "death": {"duration_ms": 1200, "loop": False},
}
MIN_FRAME_MAE = {"idle": 0.015, "walk": 0.025, "attack": 0.05, "hit": 0.03, "death": 0.03}
SOURCE_SHA256 = "2efa78c02a5eb647ff876a3ba35d10a083b90d642ff236255d549a1bc053a252"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build() -> dict:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    source_bytes = SOURCE.read_bytes()
    source_hash = sha256(source_bytes)
    if source_hash != SOURCE_SHA256:
        raise ValueError(f"Unexpected Human Vanguard source hash: {source_hash}")
    image = Image.open(SOURCE).convert("RGBA")
    if image.size != (1536, 1024):
        raise ValueError(f"Expected 1536x1024 source atlas, got {image.size}")
    if image.getchannel("A").getextrema()[0] != 0 or image.getchannel("A").getextrema()[1] < 240:
        raise ValueError("Source atlas must preserve real transparent alpha")
    frame_w, frame_h = image.width // COLUMNS, image.height // ROWS
    actions = {}
    for row, action in enumerate(ACTIONS):
        frames = []
        frame_images = []
        for column in range(COLUMNS):
            frame = image.crop((column * frame_w, row * frame_h,
                                (column + 1) * frame_w, (row + 1) * frame_h))
            alpha = frame.getchannel("A")
            if alpha.getbbox() is None:
                raise ValueError(f"Transparent/empty frame: {action}/{column:02d}")
            frame_images.append(frame)
            frames.append({"index": column, "rect": [column * frame_w, row * frame_h,
                                                           frame_w, frame_h],
                           "sha256_rgba": sha256(frame.tobytes())})
        if len({f["sha256_rgba"] for f in frames}) != COLUMNS:
            raise ValueError(f"Repeated source frames in {action}")
        differences = [sum(ImageStat.Stat(ImageChops.difference(frame_images[i], frame_images[i - 1])).mean)
                       / (4 * 255) for i in range(1, COLUMNS)]
        minimum = min(differences)
        if minimum < MIN_FRAME_MAE[action]:
            raise ValueError(f"{action} frame sequence is too static: min adjacent MAE={minimum:.5f}")
        actions[action] = {
            "row": row, **CLIPS[action], "count": COLUMNS,
            "minimum_adjacent_rgba_mae": round(minimum, 5),
            "frames": frames,
        }
    manifest = {
        "schema": "HG33-OriginalActionAtlas-v1",
        "assetId": "human-vanguard-8x5",
        "unitId": "human_4",
        "name": "Human Vanguard / Heavy Soldier",
        "sourcePath": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": source_hash,
        "runtimeImageId": "unit-human-vanguard-atlas",
        "runtimeUse": "Canvas source rectangles; frame animation follows actual battleVisualState actions",
        "originalStatus": "verified-original-imagegen",
        "creationMethod": "Original fantasy character and 40 action poses generated specifically for this project; no third-party game art or reference model used.",
        "generationTool": "built-in image_gen",
        "sourcePrompt": "One original mature Human Vanguard swordsman, transparent 8 columns by 5 rows. Rows: idle breathing/weight shifts; walk alternating strides; attack anticipation/strike/recovery; hit recoil/regain; death stagger/collapse/terminal prone. Same armor-blue/brass identity, fixed 3/4 camera, aligned feet, no backgrounds or text.",
        "atlasDimensions": [image.width, image.height],
        "frameDimensions": [frame_w, frame_h],
        "columns": COLUMNS,
        "rows": ROWS,
        "pivot": [0.5, 0.985],
        "fps": 8,
        "actions": actions,
        "runtimeFrameCount": COLUMNS * ROWS,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"HG33 Human Vanguard: 5x8 unique transparent frames verified; source SHA256 {source_hash}")
    return manifest


if __name__ == "__main__":
    build()
