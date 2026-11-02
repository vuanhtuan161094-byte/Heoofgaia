# HG-07 Windows baseline acceptance â€” 2026-11-02

Candidate source: the standalone copy of `vuanhtuan161094-byte/tutiennhandoi` branch `feature/heoofgaia-hg07-20261102` at `b32737422ca866f08de8d94021b397eb22c8f017`. All 20 copied project files matched source SHA-256 values before the Windows portability patch to `qa-browser.py` and the addition of `qa-file-browser.py`.

## Results

| Gate | Result | Evidence |
|---|---|---|
| JavaScript parse | PASS, 8/8 files | `node --check <file>` |
| Engine QA | PASS, 37/37 | `node qa-engine.cjs` |
| Offline bundle | PASS, 123,427 characters | `.venv\Scripts\python.exe build_offline.py` |
| Browser UI and interactions | PASS, 31/31; 0 page errors | `.venv\Scripts\python.exe qa-browser.py`; `QA-RC1-RESULTS.json` |
| Actual `file://` launch and persistence | PASS, 9/9; 0 page errors | `.venv\Scripts\python.exe qa-file-browser.py`; `file-launch-persistence.json` |

`qa-browser.py` uses the installed Chrome/Edge executable and a test-only storage shim for broad interactions. `qa-file-browser.py` launches the actual offline HTML in a fresh temporary Chrome profile, saves the selected Elf realm to the legacy v06 key, reloads, closes the browser process, reopens the same temporary profile, and verifies restoration again.

## Runtime screenshots

The PNG captures in `docs/evidence/hg07-baseline/` were produced by Playwright from the standalone HG-07 source in Chrome. The 1280Ã—720 file-launch capture is viewport-sized; desktop and mobile full-page captures are also included. They show the reconstructed prototype only and are not images of the original commercial game. Some Unicode/emoji resource icons appear as missing-glyph boxes on this Windows font stack; record this as an HG-11 visual-quality issue.

## Limits

- Browser and local file persistence were exercised on Windows Chrome. Android physical device testing remains unperformed.
- No original 2009 SWF/client/server was accessed or verified. The 40-unit table and hero capacity remain community-documented inputs; this PASS proves the prototype's implementation and compatibility checks only.
- New private GitHub repository creation/push is separately BLOCKED pending `gh auth login --web`; local E: source is not represented as already published.
