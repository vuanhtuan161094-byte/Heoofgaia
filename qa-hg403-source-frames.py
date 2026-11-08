"""HG40.3 AF40 — actual authored source-frame validation, never a still-frame
transform, and a readable visual-contact receipt for the eight T9/T10 troops.

Recovers 178 unregistered source action rows from 38 EXISTING original HG33 PNG
atlases. Does not claim that adjacent-frame difference alone proves art quality.
"""
from __future__ import annotations
from collections import Counter
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
COVER = ROOT / "assets/animations/hg28/coverage.json"
MANIFEST = ROOT / "assets/generated/hg33/animation/troop-atlas-manifest.json"
REPORT = ROOT / "docs/qa/hg403/source-animation-200.json"
EVIDENCE = ROOT / "docs/evidence/hg403/source-animation"
ACTIONS = ("idle", "walk", "attack", "hit", "death")
W, H = 192, 204
assert REPORT.parent.is_dir() or REPORT.parent.mkdir(parents=True) is None
EVIDENCE.mkdir(parents=True, exist_ok=True)

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def rgba_frame(sheet: Image.Image, row: int, col: int) -> Image.Image:
    return sheet.crop((col*W, row*H, (col+1)*W, (row+1)*H))

def alpha_bbox(frame):
    alpha = frame.getchannel("A")
    return alpha.point(lambda a: 255 if a >= 3 else 0).getbbox()

def human_contact(sheet_by_id, races):
    outputs = []
    for race in races:
        c = Image.new("RGB", (1010, 560), (17, 35, 41))
        d = ImageDraw.Draw(c)
        d.text((18, 12), race.upper()+" T9-T10 | original source action poses", fill=(232, 219, 174))
        for row, tier in enumerate((9, 10)):
            unit = race+"_"+str(tier)
            sheet = sheet_by_id[unit]
            d.text((18, 58+row*240), unit, fill=(222, 225, 213))
            for col, action in enumerate(ACTIONS):
                frame = rgba_frame(sheet, col, 4).convert("RGBA")
                x, y = 83+col*184, 78+row*240
                panel = Image.new("RGBA",(W,H),(33,49,54,255))
                panel.alpha_composite(frame)
                c.paste(panel.convert("RGB"),(x,y))
                d.text((x+8,y+H+5),action,fill=(173,221,190))
        out = EVIDENCE/(race+"-t9-t10-five-source-actions.png")
        c.save(out, optimize=True)
        outputs.append({"path":str(out.relative_to(ROOT)),"sha256":digest(out.read_bytes()),"bytes":out.stat().st_size})
    return outputs

coverage = json.loads(COVER.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
by_id={a["unitId"]:a for a in manifest["assets"]}
assert len(coverage["units"])==40 and len(by_id)==38
assert coverage["newSourceClips"]==178 and coverage["sourceTotalClips"]==200

# Re-check the actual bytes and 8 RGBA frame cells for EVERY authored HG33
# original action, including the 12 already counted in the previous 22.
from tools.prepare_hg33_troop_atlases import remove_border_matte
sheets={}
frames_inspected=0
authored_rows=0
recovered=0
units=[]
for u in coverage["units"]:
    key=u["id"]
    if key not in by_id:
        assert all(u["actions"][a] for a in ACTIONS), key+" retained original animation missing"
        continue
    asset=by_id[key]
    assert asset["generationTool"]=="built-in image_gen" and asset["actionArtKind"]=="independently-authored-frames",key
    origin=ROOT/asset["sourcePath"]
    data=origin.read_bytes()
    assert digest(data)==asset["sourceSha256"],key+" source PNG bytes changed"
    assert len(data)==asset["sourceBytes"],key+" source length changed"
    sheet=Image.open(origin).convert("RGBA")
    assert sheet.size==(1536,1024),key+" source dimensions"
    assert sheet.getpixel((0,0))[3]<=64,key+" source background not alpha"
    if asset.get("alphaProcessing"):
        sheet,_,_,_=remove_border_matte(sheet)
    sheets[key]=sheet
    unit={"unitId":key,"race":u["race"],"tier":u["tier"],"actionMetrics":[]}
    for row,action in enumerate(ACTIONS):
        clip=u["actions"][action]
        assert clip and clip["kind"]=="source-frames",key+"/"+action
        source=asset["actions"][action]
        assert source["row"]==row and len(source["frames"])==8
        if clip.get("authoring")=="HG33-original-image-gen-atlas":
            assert clip["source"]==asset["sourcePath"] and clip["row"]==row
            assert clip["sourceSha256"]==asset["sourceSha256"]
            assert clip["evidence"]=="assets/generated/hg33/animation/troop-atlas-manifest.json"
            assert clip["frames"]==8
            recovered+=1
        images=[rgba_frame(sheet,row,col) for col in range(8)]
        hashes=[digest(frame.tobytes()) for frame in images]
        for col,frame in enumerate(images):
            assert hashes[col]==source["frames"][col]["sha256Rgba"],key+"/"+action+" inconsistent raw source-frame SHA"
        distinct=len(set(hashes))
        if action=="death":
            assert len({h for h,fr in zip(hashes,images) if alpha_bbox(fr)})>=4,key+"/death poses"
        else:
            assert distinct==8,key+"/"+action+" must have eight distinct source poses"
            assert all(alpha_bbox(frame) for frame in images),key+"/"+action+" blank source frame"
        adjacent=[]
        for col in range(1,8):
            difference=ImageChops.difference(images[col],images[col-1])
            adjacent.append(sum(ImageStat.Stat(difference).mean)/(4*255))
        assert abs(min(adjacent)-source["minimumAdjacentMae"])<=0.00002,key+"/"+action+" adjacent MAE source mismatch"
        assert min(adjacent)>=0.004,key+"/"+action+" movement too static"
        bboxes=[alpha_bbox(frame) for frame in images]
        foot=[box[3] for box in bboxes if box]
        unit["actionMetrics"].append({"action":action,"frameCount":8,"uniqueFrames":distinct,
            "minimumAdjacentMae":round(min(adjacent),5),
            "verticalFootRangePx":max(foot)-min(foot) if foot else None})
        frames_inspected+=8;authored_rows+=1
    units.append(unit)

assert authored_rows==190,(authored_rows,190)
assert recovered==178,(recovered,178)
assert frames_inspected==1520,(frames_inspected,1520)
assert len(sheets)==38
assert all(u["status"]=="FULL_VERIFIED" for u in coverage["units"])
assert sum(sum(bool(u["actions"][a]) for a in ACTIONS) for u in coverage["units"])==200
high_tier=[u for u in coverage["units"] if u["tier"]>=9]
assert len(high_tier)==8 and all(u["id"] in sheets for u in high_tier)
contacts=human_contact(sheets,("human","elf","orc","undead"))
receipt={
    "schema":"HG40.3-AF40-SourceAnimation-40x5-v1",
    "status":"PASS",
    "registeredActionClips":200,
    "newlyRecoveredFromExistingHG33Atlases":recovered,
    "preExistingRegisteredActionClips":22,
    "verifiedHg33OriginalAtlasFiles":len(sheets),
    "verifiedHg33OriginalActionRows":authored_rows,
    "verifiedHg33OriginalFrameCells":frames_inspected,
    "highTierUnitCount":len(high_tier),
    "highTierOriginalAtlasCount":8,
    "highTierSourceContactSheets":contacts,
    "actionSourceKinds":Counter(clip["authoring"] if "authoring" in clip else "prior-source"
      for u in coverage["units"] for clip in u["actions"].values()),
    "units":units,
    "scopeNote":"Frame-provenance, RGBA geometry, SHA and adjacent-pose integrity PASS. Does NOT assert 178 were newly painted this session. Does NOT certify artist-grade motion, physical foot locking, consistency or Android rendering.",
}
receipt["actionSourceKinds"]=dict(receipt["actionSourceKinds"])
REPORT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("HG40.3 AF40 SOURCE PASS: 40/40 troops, 200/200 authored action clips, 178 recovered from 38 pre-existing original HG33 PNG atlases",flush=True)
print("HG40.3 AF40 inspected 190 HG33 source action rows and 1,520 individual RGBA frame cells; high-tier source 8/8",flush=True)
