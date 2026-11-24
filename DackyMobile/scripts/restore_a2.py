#!/usr/bin/env python3
"""Restore A2 research inputs from manually exported private Drive documents.
No network, no executable data, no repo publication. Unknown compression stays HOLD.
"""
import base64, hashlib, json, re, sys
from pathlib import Path
from extract_a1 import TABLES, COMMIT

PRIVATE = Path(__file__).resolve().parents[1] / "input-private"
OUT = PRIVATE / "legacy_table_cache"
SRC = PRIVATE / "a2-exports"
ALLOWED = set(TABLES)
EXTS = {"frm", "MYI", "MYD"}
MAX = 32 * 1024 * 1024

def blob_sha(b):
    return hashlib.sha1(f"blob {len(b)}\0".encode() + b).hexdigest()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    result = {"source_commit": COMMIT, "restored": {}, "hold": {}, "documents": [], "normalized": []}
    paths = sorted([*SRC.glob("*.txt"), *SRC.glob("*.json")])
    for p in paths:
        try:
            doc = json.loads(p.read_text(encoding="utf-8-sig"))
            if doc.get("source_commit") != COMMIT:
                raise ValueError("source pin mismatch")
            result["documents"].append(p.name)
            if doc.get("table") == "famousgeneraliteminfo" and "records" in doc:
                if len(doc["records"]) != 540 or len(doc.get("columns", [])) != 20:
                    raise ValueError("roster shape mismatch")
                dest = PRIVATE / "famousgeneraliteminfo.research.json"
                dest.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
                result["normalized"].append({"table": "famousgeneraliteminfo", "rows": 540, "status": "LEGACY_RESEARCH_NOT_MOBILE_VERIFIED"})
                continue
            for t in doc["tables"]:
                name = t["table"]
                if name not in ALLOWED or not re.fullmatch(r"[A-Za-z0-9_-]+", name):
                    continue
                for f in t["files"]:
                    ext = f["ext"]
                    if ext not in EXTS:
                        continue
                    k = name + "." + ext
                    try:
                        if "b64" not in f:
                            raise ValueError("compressed staging format not yet verified; use pinned source or validated decoder")
                        b = base64.b64decode(f["b64"], validate=True)
                        if len(b) > MAX or ("size" in f and len(b) != f["size"]):
                            raise ValueError("size mismatch or limit")
                        if blob_sha(b) != f["sha"]:
                            raise ValueError("Git blob SHA mismatch")
                        target = OUT / k
                        if target.exists() and target.read_bytes() != b:
                            raise ValueError("conflicting existing file")
                        target.write_bytes(b)
                        result["restored"][k] = {"bytes": len(b), "sha": f["sha"]}
                        result["hold"].pop(k, None)
                    except Exception as e:
                        if k not in result["restored"]:
                            result["hold"][k] = str(e)
        except Exception as e:
            result["hold"][p.name] = str(e)
    (PRIVATE / "a2_restore_manifest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Documents:", len(result["documents"]), "verified blobs:", len(result["restored"]), "hold:", len(result["hold"]))
    return 0 if result["restored"] or result["normalized"] else 1

if __name__ == "__main__":
    sys.exit(main())
