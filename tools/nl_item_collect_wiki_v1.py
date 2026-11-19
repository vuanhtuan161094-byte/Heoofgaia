#!/usr/bin/env python3
"""Read the public VNG Wiki index into GitHub Actions job logs for source QA.

This does NOT claim game effect formulas; it prints gzip+base64 page text to an
ephemeral CI log after confirming the source's advertised total of 674.
"""
from __future__ import annotations

import base64
import gzip
import json
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
            except Exception:
                pass
        valid = sorted(
            (x for x in candidates if MARKER in x),
            key=len, reverse=True
        )
        if not valid:
            raise RuntimeError(
                "WIKI_674_MARKER_NOT_VISIBLE; frame lengths=" +
                repr([len(x) for x in candidates])
            )
        payload = {
            "url": URL,
            "checkedAt": datetime.now(timezone.utc).isoformat(),
            "edition": "VNG_WIKI_MOBILE_CURRENT",
            "rawBodyText": valid[0],
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
