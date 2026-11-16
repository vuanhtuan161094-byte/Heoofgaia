# P3 QA Evidence Contract

## Local baseline (16/11/2026)

- P2 full 31/31 PASS (Chromium JS, save V0.1/V0.2, replay và mobile).
- P2 advanced 12/12 PASS (hàng trước/hàng sau, khắc chế, 3 tuyến sát thương, burn DOT, seek replay).
- P3 functional 74/74 PASS (24 đội hình áp dụng, upgrade tier, chi phí, 24 trận từ runtime thực, replay không chi thưởng lần hai, mobile).
- P3 balance 360 deterministic scenarios PASS (3 power bands, 5 stages, 24 presets). Detailed stats in `docs/P3_BALANCE.md`.

## GitHub exact SHA gate

CI must run 5 QA scripts and output:
- `qa/smoke-result.json`, `qa/QA_P2.json`, `qa/QA_P2_ADVANCED.json`, `qa/qa-p3.json`, `qa/balance-probe.json`.
- `qa/smoke-1280x720.png`, `qa/p3-formation-1280x720.png`, `qa/p3-mobile-390.png` and P2 screenshot files.
- `qa/commit-sha.txt`, `qa/index-sha256.txt` for source identity.

Do not mark these as official GitHub PASS until a run on the resulting branch SHA has `conclusion=success` and artifacts. Device physical and visual art approval remain separate.
