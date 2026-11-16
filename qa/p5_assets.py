"""CL-P5 scenic map source, optimized derivative, and embedded-byte checks."""
from __future__ import annotations

import base64
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "p5"
SOURCE = ASSETS / "cl-p5-region-map-source.png"
PACKED = ASSETS / "cl-p5-region-map.webp"
INDEX = ROOT / "index.html"
OUT = ROOT / "qa" / "CL_P5_ASSETS.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    checks: list[dict] = []

    def check(name: str, passed: bool, evidence: dict | None = None) -> None:
        checks.append({"name": name, "pass": bool(passed), "evidence": evidence or {}})
        print(("PASS" if passed else "FAIL") + " " + name, flush=True)

    src_bytes, packed_bytes = SOURCE.read_bytes(), PACKED.read_bytes()
    with Image.open(SOURCE) as image:
        source_dims, source_mode = list(image.size), image.mode
    with Image.open(PACKED) as image:
        packed_dims, packed_format = list(image.size), image.format
    check("original source is a 1536x1024 opaque image", source_dims == [1536, 1024] and source_mode == "RGB", {"dimensions": source_dims, "mode": source_mode, "sha256": sha256(src_bytes)})
    check("optimized map derivative is 1536x1024 WebP under 350 KB", packed_dims == [1536, 1024] and packed_format == "WEBP" and len(packed_bytes) < 350_000, {"dimensions": packed_dims, "format": packed_format, "bytes": len(packed_bytes), "sha256": sha256(packed_bytes)})

    html = INDEX.read_text(encoding="utf-8")
    match = re.search(r"const CL_P5_REGION_MAP = \[\s*(.*?)\s*\]\.join\(\"\"\);", html, re.S)
    embedded = b""
    if match:
        segments = json.loads("[" + match.group(1).rstrip().rstrip(",") + "]")
        data_url = "".join(segments)
        prefix = "data:image/webp;base64,"
        if data_url.startswith(prefix):
            embedded = base64.b64decode(data_url[len(prefix):], validate=True)
    check("embedded offline bytes match the committed WebP exactly", bool(embedded) and embedded == packed_bytes, {"embeddedBytes": len(embedded), "packedBytes": len(packed_bytes), "embeddedSha256": sha256(embedded) if embedded else None})

    manifest = json.loads((ASSETS / "cl-p5-region-map-manifest.json").read_text(encoding="utf-8"))
    expected_manifest = manifest.get("status") == "RECREATED" and manifest.get("image_created") is True and manifest.get("file_exported") is True and manifest.get("source", {}).get("sha256") == sha256(src_bytes) and manifest.get("packed", {}).get("sha256") == sha256(packed_bytes) and manifest.get("promptVersion") == "p5-region-map-v1"
    check("provenance manifest hashes and source route are complete", expected_manifest, {"status": manifest.get("status"), "provider": manifest.get("sourceType"), "promptVersion": manifest.get("promptVersion")})

    result = {"milestone": "CL-P5", "checksPassed": sum(row["pass"] for row in checks), "checksTotal": len(checks), "checks": checks}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CL-P5 ART EXACT-SOURCE GATE {result['checksPassed']}/{result['checksTotal']}", flush=True)
    if result["checksPassed"] != result["checksTotal"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
