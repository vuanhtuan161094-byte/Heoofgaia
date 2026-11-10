"""HG55: lossless PNG -> WebP only for 22 explicitly allowed embedded images.

Does not change source files, dimensions, RGBA pixels, Save v07, or legacy
byte-exact provenance assets. The original PNGs stay canonical in Git.
"""
from base64 import b64decode,b64encode
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import json
import os
import re
from PIL import Image

OPTIMIZABLE_IDS=frozenset({
    "hg28-world-meadow","hg28-world-creatures",
    "hg28-world-tree-broadleaf","hg28-world-tree-pine",
    "hg28-troop-human_9","hg28-troop-human_10",
    "hg28-troop-elf_9","hg28-troop-elf_10",
    "hg28-troop-orc_9","hg28-troop-orc_10",
    "hg28-troop-undead_9","hg28-troop-undead_10",
    "city-art-human","city-art-elf","city-art-orc","city-art-undead",
    "unit-orc-imp","unit-elf-centaur","unit-human-archer",
    "unit-human-archer-atlas","unit-undead-skeleton",
    "battlefield-human-meadow"
})
# The 12 HG28 landmark PNGs and two HG11 building PNGs are intentionally NOT
# converted: qa-engine.cjs checks their byte-identical inlined provenance.
_TAG=re.compile(r'(<img\b[^>]*?\bid="(?P<id>[^"]+)"[^>]*?\bsrc=")data:image/png;base64,(?P<data>[A-Za-z0-9+/=]+)(")')

def optimize_html(html,report_path):
    original_bytes=len(html.encode("utf-8"))
    seen=set()
    records=[]
    disabled=os.environ.get("HG55_DISABLE_EMBED_OPT")=="1"
    def replace(match):
        image_id=match.group("id")
        if image_id not in OPTIMIZABLE_IDS or disabled:
            return match.group(0)
        if image_id in seen:
            raise ValueError("duplicate image ID: "+image_id)
        seen.add(image_id)
        source=b64decode(match.group("data"),validate=True)
        with Image.open(BytesIO(source)) as pic:
            rgba=pic.convert("RGBA")
            dimensions=rgba.size
            converted=BytesIO()
            rgba.save(converted,format="WEBP",lossless=True,method=4)
            encoded=converted.getvalue()
        with Image.open(BytesIO(encoded)) as check:
            decoded=check.convert("RGBA")
        # WebP can canonicalize hidden RGB under completely transparent pixels.
        # Require exact alpha and identical visible results on black/white.
        assert decoded.size==dimensions, image_id+" dimensions mismatch"
        assert decoded.getchannel("A").tobytes()==rgba.getchannel("A").tobytes(), image_id+" alpha mismatch"
        for matte_color in ((0,0,0,255),(255,255,255,255)):
            matte=Image.new("RGBA",dimensions,matte_color)
            expected=Image.alpha_composite(matte,rgba).tobytes()
            actual=Image.alpha_composite(matte,decoded).tobytes()
            assert expected==actual, image_id+" visible-pixel mismatch"
        if len(encoded)>=len(source):
            raise ValueError("lossless recompression did not shrink "+image_id)
        records.append({
            "id":image_id,"width":dimensions[0],"height":dimensions[1],
            "source_png_sha256":sha256(source).hexdigest(),
            "embedded_webp_sha256":sha256(encoded).hexdigest(),
            "source_bytes":len(source),"webp_bytes":len(encoded),
            "alpha_exact_and_composites_identical":True
        })
        return match.group(1)+"data:image/webp;base64,"+b64encode(encoded).decode("ascii")+match.group(4)
    optimized=_TAG.sub(replace,html)
    if not disabled and seen!=OPTIMIZABLE_IDS:
        raise ValueError("HG55 missing PNG sources: "+str(sorted(OPTIMIZABLE_IDS-seen)))
    optimized_bytes=len(optimized.encode("utf-8"))
    report={
        "stage":"HG55-lossless-inline-image-optimization",
        "mode":"disabled" if disabled else "webp-lossless",
        "source_asset_files_modified":False,
        "save_version":7,"original_html_bytes":original_bytes,
        "optimized_html_bytes":optimized_bytes,
        "saved_html_bytes":original_bytes-optimized_bytes,
        "verified_image_count":len(records),
        "all_visible_pixels_identical":all(i["alpha_exact_and_composites_identical"] for i in records),
        "images":records
    }
    path=Path(report_path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("HG55_IMAGE_PACK",report["mode"],"images",len(records),
          "before",original_bytes,"after",optimized_bytes,
          "saved",report["saved_html_bytes"],flush=True)
    return optimized
