#!/usr/bin/env python3
"""Read the public VNG Wiki index into GitHub Actions job logs for source QA.

This does NOT claim game effect formulas; it prints gzip+base64 page text to an
ephemeral CI log after confirming the source's advertised total of 674.
"""
from __future__ import annotations

import base64
import gzip
import json
import re
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

URL = "https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham"
MARKER = "Tổng 674 vật phẩm"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            "--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1440, "height": 980})
        page.goto(URL, wait_until="domcontentloaded", timeout=50000)
        page.wait_for_timeout(2000)
        candidates = []
        for frame in page.frames:
            try:
                body = frame.locator("body").inner_text(timeout=10000)
                candidates.append(body)
                # textContent includes hidden/collapsed accordion item labels.
                raw = frame.locator('body').text_content(timeout=10000)
                if raw:
                    candidates.append(raw)
            except Exception:
                pass
        valid = sorted(
            (x for x in candidates if MARKER in x),
            key=len, reverse=True
        )
        print('NL_WIKI_ITEMS_674_FRAME_LENGTHS=' + repr([len(x) for x in candidates]), flush=True)
        if not valid:
            raise RuntimeError(
                "WIKI_674_MARKER_NOT_VISIBLE; frame lengths=" +
                repr([len(x) for x in candidates])
            )
        ROOT_CATEGORIES = [
            "Rương", "Vật Liệu", "Tài Nguyên", "Túi Phúc",
            "Ấn Thạch", "Danh Phẩm", "Bí Tịch", "Truyền Thừa Lệnh",
            "Lệnh", "Chìa Khóa", "Khác"
        ]
        snapshots = {}
        failures = []
        for cat in ROOT_CATEGORIES:
            try:
                control = page.get_by_text(cat, exact=True)
                if not control.count():
                    failures.append("MISSING_CATEGORY_" + cat)
                    continue
                control.last.click(timeout=2500)
                page.wait_for_timeout(150)
                overview = page.locator("body").inner_text(timeout=10000)
                # The public accordion renders '+\\nlabel\\ncount' headings.
                subgroups = re.findall(
                    r"(?m)^\+\s*\n\s*([^\n]+?)\s*\n\s*(\d+)\s*$",
                    overview
                )
                expanded = []
                for name, declared in subgroups:
                    name = name.strip()
                    if name in ROOT_CATEGORIES:
                        continue
                    try:
                        part = page.get_by_text(name, exact=True)
                        if part.count():
                            part.last.click(timeout=900)
                            page.wait_for_timeout(40)
                            expanded.append(name)
                    except Exception as exc:
                        failures.append("SUBGROUP_" + cat + ":" + name +
                                        ":" + type(exc).__name__)
                body = page.locator("body").inner_text(timeout=10000)
                snapshots[cat] = {"body": body, "expandedSubgroups": expanded,
                    "headingsFound": subgroups}
                print("NL_WIKI_EXPAND " + cat + " len=" + str(len(body)) +
                      " subgroups=" + str(len(expanded)), flush=True)
            except Exception as exc:
                failures.append(cat + ":" + repr(exc)[:140])
        print("NL_WIKI_EXPAND_ERRORS=" + str(len(failures)), flush=True)
        payload = {
            "url": URL,
            "checkedAt": datetime.now(timezone.utc).isoformat(),
            "edition": "VNG_WIKI_MOBILE_CURRENT",
            "rawBodyText": valid[0],
            "categorySnapshots": snapshots,
            "expandFailures": failures,
            "bodyLength": len(valid[0]),
        }
        print("NL_WIKI_ITEMS_674_LENGTH=" + str(len(valid[0])), flush=True)
        encoded = base64.b64encode(
            gzip.compress(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        ).decode("ascii")
        print("NL_WIKI_ITEMS_674_GZIP_B64_BEGIN", flush=True)
        for offset in range(0, len(encoded), 120):
            print(encoded[offset:offset + 120], flush=True)
        print("NL_WIKI_ITEMS_674_GZIP_B64_END", flush=True)
        browser.close()


if __name__ == "__main__":
    main()
