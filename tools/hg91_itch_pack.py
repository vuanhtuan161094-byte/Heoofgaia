"""HG91: produce the ONE verified itch.io staging ZIP, never upload publicly."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,re

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/"Play-Heoofgaia-HG11.html"
INDEX=ROOT/"index.html"
OUT=ROOT/"dist"/"itch"
OUT.mkdir(parents=True,exist_ok=True)
data=HTML.read_bytes()
source=INDEX.read_text(encoding="utf-8")
entries=re.findall(r'<script\s+src="([^"]+[.]js)"></script>',source)
assert len(entries)>=46 and len(set(entries))==len(entries),("module list",len(entries))
assert len(data)<200_000_000,("itch single-file limit",len(data))
assert data.count(b"<script>\n")==len(entries),("missing embedded JS",data.count(b"<script>\n"),len(entries))
assert b"<script src=" not in data and b'<link rel="stylesheet" href=' not in data
assert b"hg91-language" in data and b"HOG_HG91_I18N" in data
path=OUT/"hg91-itch-html5.zip"
with ZipFile(path,"w",compression=ZIP_DEFLATED,compresslevel=8) as z:
    z.writestr("index.html",data)
with ZipFile(path) as z:
    assert z.namelist()==["index.html"]
    assert z.testzip() is None and z.getinfo("index.html").file_size==len(data)
manifest={"status":"STAGING_ONLY_OWNER_APPROVAL_PENDING",
    "htmlSha256":hashlib.sha256(data).hexdigest(),
    "zipSha256":hashlib.sha256(path.read_bytes()).hexdigest(),
    "htmlBytes":len(data),"zipBytes":path.stat().st_size,
    "files":["index.html"],"embeddedModules":len(entries),
    "sourceGame":"Play-Heoofgaia-HG11.html","save":"v07",
    "rightsClearance":"PENDING","physicalMobileQA":"PENDING",
    "liveItchEmbedQA":"PENDING"}
(OUT/"hg91-stage-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("HG91 itch HTML5 STAGING ONLY",json.dumps(manifest),flush=True)
