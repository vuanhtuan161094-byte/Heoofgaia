#!/usr/bin/env python3
"""Deterministically rebuild HG33 additional atlas WebP derivatives and browser index."""
from pathlib import Path
import hashlib, json, re, unicodedata
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"assets/generated/hg33/animation/additional-atlas-manifest.json"
JS_OUT=ROOT/"art-hg33-additional-atlases.js"
def sha(data): return hashlib.sha256(data).hexdigest()
def write_js(rows):
    payload=[{k:r[k] for k in ("id","kind","name","unitId","bossNameKey","imageId","atlasDimensions","frameDimensions","columns","rows","fps","pivot","renderWidth","enemyFacing","actions")} for r in rows]
    encoded=json.dumps(payload,ensure_ascii=False,separators=(",",":"))
    js=f"""/* Generated from assets/generated/hg33/animation/additional-atlas-manifest.json. */
(function(root){{
'use strict';
const rows={encoded};
const byUnit=Object.create(null),byBoss=Object.create(null);
for(const row of rows){{if(row.unitId)byUnit[row.unitId]=row;if(row.bossNameKey)byBoss[row.bossNameKey]=row;}}
const base=root.HOG_HG33_TROOP_ATLASES||{{units:{{}},retained:{{}},hasUnit(id){{return !!this.units[id]||!!this.retained[id]}},profile(){{return null}}}};
function normalizeName(value){{return String(value||'').replace(/\\s*[·•].*$/,'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}}
const merged=Object.freeze({{
 ...base, additional:Object.freeze(rows), additionalByUnit:Object.freeze(byUnit), additionalByBoss:Object.freeze(byBoss),
 resolve(unitId,actorName=''){{return byUnit[unitId]||base.units?.[unitId]||byBoss[normalizeName(actorName)]||null;}},
 hasUnit(id){{return !!byUnit[id]||base.hasUnit(id);}},
 hasActor(id,name=''){{return !!this.resolve(id,name);}},
 profile(id,name=''){{const d=this.resolve(id,name);return d?{{size:d.renderWidth,pivot:d.pivot,boss:d.kind==='boss'}}:base.profile(id);}}
}});
root.HOG_HG33_TROOP_ATLASES=merged;
}})(typeof globalThis!=='undefined'?globalThis:this);
"""
    JS_OUT.write_text(js,encoding="utf-8")
def main():
    if not MANIFEST.exists():
        return
    data=json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("schema")!="HG33-AdditionalActionAtlases-v1": raise SystemExit("bad additional-atlas manifest schema")
    for row in data.get("assets",[]):
        source=ROOT/row["sourcePath"]; raw=source.read_bytes()
        if sha(raw)!=row["sourceSha256"]: raise SystemExit(f"source hash mismatch: {row['sourcePath']}")
        processed=ROOT/row.get("processedPath",row["sourcePath"])
        prepared=processed.read_bytes()
        expected=row.get("processedSha256")
        if expected and sha(prepared)!=expected: raise SystemExit(f"processed source hash mismatch: {processed.relative_to(ROOT)}")
        image=Image.open(processed).convert("RGBA")
        if list(image.size)!=row["atlasDimensions"]: raise SystemExit(f"atlas dimension mismatch: {row['sourcePath']}")
        corners=[image.getpixel(p)[3] for p in ((0,0),(191,0),(0,203),(191,203))]
        if max(corners)>32: raise SystemExit(f"opaque atlas corner: {row['id']} {corners}")
        runtime=ROOT/row["runtimePath"];runtime.parent.mkdir(parents=True,exist_ok=True)
        cached=False
        if runtime.exists() and runtime.stat().st_size>1024:
            runtime_raw=runtime.read_bytes()
            if row.get("runtimeSha256") and sha(runtime_raw)==row["runtimeSha256"] and row.get("runtimeSourceSha256",row.get("processedSha256",row["sourceSha256"]))==sha(prepared):
                try:
                    with Image.open(runtime) as cached_image:
                        cached_image.verify()
                    cached=True
                except Exception:
                    cached=False
        if not cached:
            image.save(runtime,"WEBP",quality=90,method=4)
            runtime_raw=runtime.read_bytes()
        row["runtimeSha256"]=sha(runtime_raw);row["runtimeBytes"]=len(runtime_raw);row["runtimeSourceSha256"]=sha(prepared)
        MANIFEST.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(f"HG33 atlas ready: {row['id']} ({len(runtime_raw)} bytes)",flush=True)
    write_js(data.get("assets",[]))
    print(f"HG33 additional atlases prepared: {len(data.get('assets',[]))} actors")

if __name__=="__main__":
    main()
