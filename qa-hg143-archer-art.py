"""HG14.3: real source-based Archer atlas/frame-alpha and consistency QA."""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json
ROOT=Path(__file__).resolve().parent
D=ROOT/"assets/generated/hg143/animation"
OUT=ROOT/"docs/evidence/hg143";OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/"docs/qa/hg143";QA.mkdir(parents=True,exist_ok=True)
img=Image.open(D/"human-archer-atlas.png").convert("RGBA")
meta=json.loads((D/"human-archer-atlas.json").read_text("utf8"))
names=["idle","walk","draw","release","hit","death"]
checks=[]
def check(title,ok):
 ok=bool(ok);checks.append({"title":title,"passed":ok})
 print(("PASS " if ok else "FAIL ")+title,flush=True)
def sha(data):
 return hashlib.sha256(data).hexdigest()
check("RGBA atlas is 2048x1536 and has exactly 48 frames",
      img.size==(2048,1536) and meta["total_frames"]==48)
check("Source Archer PNG identity matches atlas manifest",
      sha((ROOT/meta["source"]).read_bytes())==meta["source_sha256"])
check("Generated atlas PNG SHA-256 matches manifest",
      sha((D/"human-archer-atlas.png").read_bytes())==meta["atlas_sha256"])
check("All clips use one foot pivot",meta["pivot"]==[.485,.87])
allHashes=set();transparent=0
sheet=Image.new("RGB",(1216,978),(28,38,48));draw=ImageDraw.Draw(sheet)
for row,action in enumerate(names):
 clip=meta["clips"][action];hashes=[]
 check(f"{action} has 8 registered 256px frames",clip["row"]==row and clip["count"]==8 and len(clip["frames"])==8)
 for col in range(8):
  crop=img.crop((col*256,row*256,(col+1)*256,(row+1)*256))
  checksum=sha(crop.tobytes());hashes.append(checksum);allHashes.add(checksum)
  separate=Image.open(D/"frames"/f"human-archer-{action}-{col:02}.png").convert("RGBA")
  check(f"{action}[{col}] independent PNG equals atlas frame and JSON",
        separate.tobytes()==crop.tobytes() and checksum==meta["frame_hashes"][action][col])
  transparent+=int(crop.getchannel("A").getextrema()==(0,255))
  thumb=crop.resize((148,148),Image.Resampling.LANCZOS)
  sheet.paste(thumb,(col*152+2,row*163+13),thumb)
 draw.text((7,row*163+2),action.upper(),fill=(238,214,167))
 check(f"{action} contains eight different authored poses",len(set(hashes))==8)
check("Entire atlas has 48 unique raster poses",len(allHashes)==48)
check("All 48 poses have transparent background and opaque subject",transparent==48)
sheet.save(OUT/"human-archer-48-frame-contact.png",optimize=True)
result={"passed":sum(c["passed"] for c in checks),"total":len(checks),
"status":"PASS" if all(c["passed"] for c in checks) else "FAIL",
"checks":checks,"source":meta["source"],"art_source":meta["art_source"],
"atlas_sha256":meta["atlas_sha256"]}
(QA/"archer-art-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(f"HG14.3 ART QA {result['passed']}/{result['total']} PASS",flush=True)
raise SystemExit(0 if result["status"]=="PASS" else 1)
