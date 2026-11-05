"""Capture real, local file:// HG28 visual evidence at both contract sizes.

Usage: python qa-hg28-visual-chrome.py --phase before|after
This only drives visible game navigation; no state is seeded or injected.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
TABS = ["map", "city", "army", "heroes", "magic", "relics", "tasks", "tower", "reports", "sources"]
SIZES = [(1280, 720), (960, 540)]
LABELS = ["World", "City", "Army", "Heroes", "Magic", "Relics", "Tasks", "Tower", "Reports", "Sources"]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def git_head() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["before", "after"], required=True)
    args = parser.parse_args()
    output_root = ROOT / "docs" / "evidence" / "hg28" / args.phase
    output_root.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    captures: list[dict] = []

    with sync_playwright() as playwright:
        launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]}
        chrome = os.environ.get("HOG_CHROME_PATH")
        if chrome:
            launch["executable_path"] = chrome
        browser = playwright.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        page.set_default_timeout(10000)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: errors.append("console: " + message.text) if message.type == "error" else None)
        page.goto(GAME.as_uri(), wait_until="load")
        page.locator('[data-action="start"]').click()
        assert page.evaluate("!!window.HOG_APP_DEBUG && HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())")

        for width, height in SIZES:
            page.set_viewport_size({"width": width, "height": height})
            page.wait_for_timeout(120)
            folder = output_root / f"{width}x{height}"
            folder.mkdir(parents=True, exist_ok=True)
            for ordinal, (tab, label) in enumerate(zip(TABS, LABELS), start=1):
                nav = page.locator(f'[data-action="tab"][data-tab="{tab}"]').first
                assert nav.count() == 1, f"Missing {label} navigation control"
                nav.click()
                page.wait_for_timeout(120)
                geometry = page.evaluate("""() => ({
                  width: innerWidth, height: innerHeight,
                  documentWidth: document.documentElement.scrollWidth,
                  documentHeight: document.documentElement.scrollHeight,
                  activeTab: document.querySelector('[data-action=tab].active')?.dataset.tab || null,
                  modalOpen: !document.querySelector('#game-modal')?.hidden,
                  contentWidth: (() => {const body=document.querySelector('#game-modal-body');return body?{client:body.clientWidth,scroll:body.scrollWidth,horizontalOverflow:body.scrollWidth>body.clientWidth+1}:null})(),
                  uiOverlap: (() => {const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};const overlap=(a,b)=>!!a&&!!b&&Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);const win=box('.game-window');return {navigation:overlap(box('#nav'),win),saveControls:overlap(box('.sidebar .buttons'),win)}})(),
                  canvases: [...document.querySelectorAll('canvas')].map(c => ({id:c.id,width:c.width,height:c.height,boxWidth:Math.round(c.getBoundingClientRect().width),boxHeight:Math.round(c.getBoundingClientRect().height)}))
                })""")
                assert geometry["activeTab"] == tab, f"{label} tab did not open: {geometry}"
                assert geometry["width"] == width and geometry["height"] == height
                assert not geometry["uiOverlap"]["navigation"], f"{label} modal overlaps navigation at {width}x{height}"
                assert not geometry["uiOverlap"]["saveControls"], f"{label} modal overlaps Save controls at {width}x{height}"
                assert geometry["contentWidth"] and not geometry["contentWidth"]["horizontalOverflow"], f"{label} content overflows horizontally at {width}x{height}: {geometry['contentWidth']}"
                file = folder / f"{ordinal:02d}-{tab}.png"
                page.screenshot(path=str(file), animations="disabled")
                captures.append({
                    "screen": label,
                    "tab": tab,
                    "viewport": f"{width}x{height}",
                    "path": file.relative_to(ROOT).as_posix(),
                    "sha256": sha256(file),
                    "geometry": geometry,
                })

        browser.close()

    receipt = {
        "phase": args.phase.upper(),
        "sourceCommit": git_head(),
        "html": GAME.name,
        "htmlSha256": sha256(GAME),
        "browser": "Playwright Chromium, local file://",
        "sizes": [f"{width}x{height}" for width, height in SIZES],
        "screenshots": captures,
        "pageErrors": errors,
        "pass": len(captures) == 20 and not errors,
    }
    receipt_path = ROOT / "docs" / "qa" / "hg28" / f"visual-chrome-{args.phase}.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"HG28 {args.phase.upper()}: {len(captures)}/20 real Chromium screenshots; {len(errors)} page/console errors")
    print(f"HTML SHA-256 {receipt['htmlSha256']} · source {receipt['sourceCommit']}")
    print(f"Receipt: {receipt_path.relative_to(ROOT).as_posix()}")
    if not receipt["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
