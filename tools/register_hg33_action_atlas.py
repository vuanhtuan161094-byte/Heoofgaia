#!/usr/bin/env python3
"""Register an editable 8x5 HG33 action atlas and write provenance/QA metadata."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets/generated/hg33/animation/additional-atlas-manifest.json"
ACTIONS = (("idle", 0, 960, True), ("walk", 1, 640, True), ("attack", 2, 650, False), ("hit", 3, 560, False), ("death", 4, 1200, False))
CELL_W, CELL_H, COLS, ROWS = 192, 204, 8, 5


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold().replace("đ", "d"))
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def matte_cleanup(source: Image.Image) -> Image.Image:
    """Remove only near-white connected backdrop pixels, independently per cell."""
    from collections import deque

    image = source.convert("RGBA")
    pixels = image.load()
    # A narrow neutral-white key follows only backdrop components connected to
    # cell edges. Enclosed bright armor, eyes and weapon highlights are retained.
    for row in range(ROWS):
        for col in range(COLS):
            x0, y0 = col * CELL_W, row * CELL_H
            w, h = CELL_W, CELL_H
            mask = bytearray(w * h)
            seen = bytearray(w * h)
            seeds = deque()

            def candidate(x: int, y: int) -> bool:
                r, g, b, a = pixels[x0 + x, y0 + y]
                return a > 8 and min(r, g, b) >= 226 and max(r, g, b) - min(r, g, b) <= 42

            for x in range(w):
                for y in (0, h - 1):
                    i = y * w + x
                    if candidate(x, y):
                        mask[i] = 1
                        if not seen[i]:
                            seen[i] = 1
                            seeds.append((x, y))
            for y in range(h):
                for x in (0, w - 1):
                    i = y * w + x
                    if candidate(x, y):
                        mask[i] = 1
                        if not seen[i]:
                            seen[i] = 1
                            seeds.append((x, y))
            while seeds:
                x, y = seeds.popleft()
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    i = ny * w + nx
                    if not seen[i] and candidate(nx, ny):
                        seen[i] = 1
                        mask[i] = 1
                        seeds.append((nx, ny))
            for y in range(h):
                for x in range(w):
                    if mask[y * w + x]:
                        r, g, b, _ = pixels[x0 + x, y0 + y]
                        # Keep the generated RGB for a clean transparent edge.
                        pixels[x0 + x, y0 + y] = (r, g, b, 0)
    return image


def cell_metrics(image: Image.Image, col: int, row: int) -> dict:
    crop = image.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H)).convert("RGBA")
    alpha = crop.getchannel("A")
    amin, amax = alpha.getextrema()
    # Frame hash intentionally covers RGBA so every edit is auditable.
    return {
        "rect": [col * CELL_W, row * CELL_H, CELL_W, CELL_H],
        "sha256Rgba": sha(crop.tobytes()),
        "visiblePixelsAlpha8": sum(1 for value in alpha.getdata() if value > 8),
        "alphaBounds": list(alpha.getbbox() or (0, 0, 0, 0)),
        "edgeAlpha8": max(max(alpha.crop((0, 0, CELL_W, 1)).getdata()), max(alpha.crop((0, CELL_H - 1, CELL_W, CELL_H)).getdata()), max(alpha.crop((0, 0, 1, CELL_H)).getdata()), max(alpha.crop((CELL_W - 1, 0, CELL_W, CELL_H)).getdata())),
        "alphaExtrema": [amin, amax],
    }


def frame_motion(image: Image.Image, row: int) -> list[float]:
    from PIL import ImageChops, ImageStat
    frames = [image.crop((i * CELL_W, row * CELL_H, (i + 1) * CELL_W, (row + 1) * CELL_H)).convert("RGBA") for i in range(COLS)]
    scores = []
    for a, b in zip(frames, frames[1:]):
        diff = ImageChops.difference(a, b)
        scores.append(round(sum(ImageStat.Stat(diff).mean) / (4 * 255), 5))
    return scores


def contact_sheet(image: Image.Image, target: Path, label: str) -> None:
    cell_w, cell_h, gap, header = 192, 216, 5, 28
    sheet = Image.new("RGB", (cell_w * COLS + gap * (COLS + 1), (cell_h + header) * ROWS + gap * (ROWS + 1)), "#151c27")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for action, row, _, _ in ACTIONS:
        draw.text((gap, gap + row * (cell_h + header)), f"{action.upper()} · {label}", font=font, fill="#e8d29c")
        for col in range(COLS):
            frame = image.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H)).convert("RGBA")
            preview = Image.new("RGBA", (cell_w, cell_h), "#273346")
            preview.alpha_composite(frame, ((cell_w - CELL_W) // 2, cell_h - CELL_H))
            sheet.paste(preview.convert("RGB"), (gap + col * (cell_w + gap), gap + header + row * (cell_h + header)))
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--id", required=True, help="stable slug")
    parser.add_argument("--kind", choices=("core", "boss", "reward"), required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--unit-id")
    parser.add_argument("--boss-name")
    parser.add_argument("--render-width", type=int, default=146)
    parser.add_argument("--prompt-base64", help="UTF-8 art prompt as base64")
    parser.add_argument("--generation-id", default="")
    parser.add_argument("--remove-white-matte", action="store_true", help="save an alpha-clean processed PNG while preserving the raw generated source")
    args = parser.parse_args()

    from base64 import b64decode
    raw_source = args.image.resolve()
    try:
        source_rel = raw_source.relative_to(ROOT)
    except ValueError:
        raise SystemExit("source image must first be copied into assets/original/hg33/action-atlases")
    source_bytes = raw_source.read_bytes()
    source = Image.open(raw_source).convert("RGBA")
    if source.size != (CELL_W * COLS, CELL_H * ROWS + 4):
        raise SystemExit(f"expected {CELL_W*COLS}x{CELL_H*ROWS+4} atlas, got {source.width}x{source.height}")

    processed = matte_cleanup(source) if args.remove_white_matte else source.copy()
    processed_rel = source_rel
    processed_sha = sha(processed.tobytes())
    if args.remove_white_matte:
        processed_rel = Path("assets/generated/hg33/animation/source") / f"{normalize(args.id)}.png"
        processed_abs = ROOT / processed_rel
        processed_abs.parent.mkdir(parents=True, exist_ok=True)
        processed.save(processed_abs, "PNG", optimize=True)
        processed_bytes = processed_abs.read_bytes()
    else:
        processed_bytes = source_bytes

    corner_alpha = [processed.getpixel(p)[3] for p in ((0, 0), (CELL_W-1, 0), (0, CELL_H-1), (CELL_W-1, CELL_H-1))]
    if max(corner_alpha) > 32:
        raise SystemExit(f"opaque atlas corner; alpha cleanup required (corners={corner_alpha})")

    def pixel_signature(img: Image.Image, row: int) -> list[float]:
        # Alpha-mask motion makes differences robust to minor compression/noise.
        scores = []
        for col in range(COLS - 1):
            a = img.crop((col*CELL_W,row*CELL_H,(col+1)*CELL_W,(row+1)*CELL_H)).convert("RGBA")
            b = img.crop(((col+1)*CELL_W,row*CELL_H,(col+2)*CELL_W,(row+1)*CELL_H)).convert("RGBA")
            from PIL import ImageChops, ImageStat
            d = ImageChops.difference(a, b)
            scores.append(round(sum(ImageStat.Stat(d).mean)/(4*255),5))
        return scores

    actions = {}
    for action, row, duration, loop in ACTIONS:
        frames = []
        for col in range(COLS):
            m = cell_metrics(processed, col, row)
            m["index"] = col
            frames.append(m)
        motion = pixel_signature(processed, row)
        if sum(value > 0.003 for value in motion) < 2:
            raise SystemExit(f"{action}: fewer than 3 visibly distinct frames; refuse to call this an animation")
        actions[action] = {"row": row, "durationMs": duration, "loop": loop, "count": COLS, "minimumAdjacentMae": min(motion), "adjacentMeanAbsoluteError": motion, "frames": frames}

    existing_data = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"assets": []}
    old_row = next((r for r in existing_data.get("assets", []) if r.get("id") == args.id), {})
    prompt = b64decode(args.prompt_base64).decode("utf-8") if args.prompt_base64 else old_row.get("prompt", "")
    slug = normalize(args.id)
    runtime_rel = Path("assets/generated/hg33/animation/runtime") / f"{slug}.webp"
    sheet_rel = Path("docs/evidence/hg33/atlas-review") / f"{slug}-contact.png"
    boss_name = args.boss_name or (args.name if args.kind == "boss" else "")
    boss_key = normalize(boss_name).replace("-", " ") if boss_name else ""
    row_data = {
        "id": args.id, "kind": args.kind, "name": args.name,
        "unitId": args.unit_id or None, "bossName": boss_name or None, "bossNameKey": boss_key or None,
        "imageId": f"hg33-atlas-{slug}", "atlasDimensions": [CELL_W*COLS, CELL_H*ROWS+4], "frameDimensions": [CELL_W,CELL_H],
        "columns": COLS,"rows": ROWS,"fps": 8,"pivot": 0.985,"renderWidth": args.render_width,"enemyFacing":"left",
        "actionArtKind":"independently-authored-frames","assetStatus":"RECREATED","originalStatus":"recreated-original-project-art",
        "generationTool":"OpenAI built-in image_gen","artistRoute":"OpenAI built-in image_gen","creationMethod":"New project-authored image-generation atlas; no external game art or model used.",
        "generationId":args.generation_id or old_row.get("generationId", ""),"prompt":prompt,"sourcePath":source_rel.as_posix(),"sourceSha256":sha(source_bytes),"sourceBytes":len(source_bytes),
        "processedPath":processed_rel.as_posix(),"processedSha256":sha(processed_bytes),"processedBytes":len(processed_bytes),"processedSha256Rgba":processed_sha,
        "processing": "near-white connected-matte removal per frame; raw source preserved" if args.remove_white_matte else "none",
        "runtimePath":runtime_rel.as_posix(),"runtimeSha256":"","runtimeBytes":0,"contactSheet":sheet_rel.as_posix(),"actions":actions,
        "quality":{"dimensionsPass":True,"rgbaSource":True,"alphaExtrema":list(processed.getchannel("A").getextrema()),"backgroundCornerAlpha":max(corner_alpha),"backgroundCornerAlphas":corner_alpha,"humanReview":"PENDING_CHROMIUM"},
        "sourceLicense":"Newly generated project art; no third-party art input.","createdAt":datetime.now(timezone.utc).isoformat(timespec="seconds")
    }
    contact_sheet(processed, ROOT / sheet_rel, args.name)
    data = existing_data if existing_data else {"schema":"HG33-AdditionalActionAtlases-v1","assets":[]}
    if data.get("schema") != "HG33-AdditionalActionAtlases-v1":
        raise SystemExit("bad additional-atlas manifest schema")
    data["assets"] = [r for r in data.get("assets",[]) if r.get("id") != args.id]
    data["assets"].append(row_data)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"id":args.id,"sourceSha256":row_data["sourceSha256"],"processedPath":row_data["processedPath"],"processedSha256":row_data["processedSha256"],"runtimePath":runtime_rel.as_posix(),"contactSheet":sheet_rel.as_posix(),"cornerAlpha":corner_alpha,"motion":{k:v["adjacentMeanAbsoluteError"] for k,v in actions.items()}},ensure_ascii=False))


if __name__ == "__main__":
    main()
