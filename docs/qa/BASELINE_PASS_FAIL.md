# Pre-change baseline — 2026-11-02

## Repository state at baseline

- Local project: `E:\Heoofgaia` (exists; contains `.git`).
- Branch: `feature/heoofgaia-hg08-20261102` at test start.
- HEAD before any HOG1 work: `fb9ae1056b0a40765a98ce1ef28e32b5c0cdcd8a`.
- Working tree was clean before the baseline command. No remote was configured.
- This is the current cumulative HG-07–HG-09 candidate baseline, not a claim that this SHA is the original HG-07 source checkpoint `b32737422ca866f08de8d94021b397eb22c8f017`.

## Runtime and outputs

- Node: `v24.19.0`.
- Python: `3.12.10` from `.venv`.
- `node qa-engine.cjs`: **PASS 79/79**.
- `node --check` on 9 root JavaScript source files: **PASS 9/9**.
- `.venv\Scripts\python.exe build_offline.py`: **PASS**; generated `Play-Heoofgaia-HG08.html`, 152,097 characters, 158,806 bytes; SHA-256 `818C4993FDD8CDE21127580B49310692C6A355409310E011EDC9EBD2383E88A1`.
- `.venv\Scripts\python.exe qa-browser.py`: **PASS 71/71**, 0 page exceptions.
- `.venv\Scripts\python.exe qa-file-browser.py`: **PASS 12/12**, actual Chromium `file://` launch and persistence across a new browser process.

## Evidence files

Command stdout and exit codes are preserved under [`baseline-20261102`](baseline-20261102/): `node-engine.stdout.txt`, `offline-build.stdout.txt`, `browser.stdout.txt`, `file-browser.stdout.txt`, per-command `.exit.txt`, runtime versions, JavaScript syntax logs, and offline HTML hash. The Chromium suites refreshed real runtime screenshots under `docs/evidence/hg08/` and `docs/evidence/hg09/`. They show the reconstruction only; no original-client comparison was possible.

## Limits

- Regression proves current local behavior only. It does not verify original server behavior, the original SWF, regional parity, Android hardware, or visual 1:1 fidelity.
- GitHub repository `vuanhtuan161094-byte/Heoofgaia` did not appear in the authenticated repository listing; `get_repo` returned HTTP 404. This can mean absent or inaccessible. No `gh` executable or local remote exists. Private repository creation/push is still blocked.
- HG-07-specific assertions are included in the 79 current tests. The historical standalone HG-07-only count was 37/37 Node and 31/31 browser in `docs/QA-HG07-BASELINE.md`; this run does not relabel the current cumulative suite as that historical test profile.