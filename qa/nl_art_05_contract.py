#!/usr/bin/env python3
"""NL ART focused asset inventory & independent viewer QA, without game mutations."""
from __future__ import annotations
import argparse
import hashlib
import json
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"assets/ngoalong/nl05_art"
DATA=BASE/"inventory.json"
HTML=BASE/"preview.html"
PREVIEW_PATHS=[
 "assets/r04/r04-original-bulwark-scout-v1-master.png",
 "assets/r04/r04-original-bulwark-scout-attack-contact-v1.png",
 "assets/r04/r04-original-field-tactician-v1-master.png",
 "assets/p5/cl-p5-infantry-scout-v1/cl-p5-infantry-scout-atlas.webp",
]

def static_checks():
 d=json.loads(DATA.read_text(encoding="utf-8"))
 src=HTML.read_text(encoding="utf-8")
 files=d["assetFiles"]
 assert len(files)==d["counts"]["totalTrackedGraphics"]
 assert len(files)==len({f["path"] for f in files})
 for row in files:
  path=ROOT/row["path"]
  assert path.is_file(),f"Missing: {path}"
  data=path.read_bytes()
  assert len(data)==row["bytes"],f"size {path}"
  gitsha=hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()
  assert gitsha==row["gitBlobSha"],f"SHA {path}"
 for path in PREVIEW_PATHS:
  assert "../../"+path.removeprefix("assets/") in src, f"Preview not using {path}"
 assert "SIMULATED PREVIEW" in src
 assert "localStorage" not in src
 assert "fetch(" not in src
 print(f"PASS NL ART STATIC: {len(files)} asset files, hashes, preview source mapping, no Save API")

def browser_checks():
 from playwright.sync_api import sync_playwright
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
  for width,height in ((1280,720),(390,844)):
   page=browser.new_page(viewport={"width":width,"height":height})
   errors=[]
   page.on("pageerror",lambda e:errors.append(str(e)))
   page.goto(HTML.resolve().as_uri(),wait_until="load")
   for im in ("scoutIdle","scoutContact","tacticianIdle"):
    assert page.locator("#"+im).evaluate("e=>e.complete && e.naturalWidth>0"), im
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"),"Horizontal overflow"
   page.locator("#contact").click()
   assert page.locator("#scoutContact").is_visible()
   page.wait_for_timeout(410)
   assert page.locator("#scoutIdle").is_visible()
   assert not page.locator("#scoutContact").is_visible()
   page.locator("#action").select_option("walk")
   page.locator("#direction").select_option("left")
   assert "walk/left" in page.locator("#frameStatus").inner_text()
   assert not errors,errors
   out=Path(tempfile.gettempdir())/f"nl-art-05-preview-{width}.png"
   page.screenshot(path=str(out),full_page=True)
   print(f"PASS NL ART CHROMIUM {width}x{height}, local screenshot {out}")
   page.close()
  browser.close()

if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--browser",action="store_true")
 args=parser.parse_args()
 static_checks()
 if args.browser:browser_checks()
