# Current checkpoint — Ngọa Long Rebuild V1

**Updated:** 2026-11-17
**Product direction:** Ngọa Long classic inspired, original Mưu Định Tam Quốc. Chiến Loạn/hybrid docs and CL-P0–P6 releases are historical compatibility evidence only.
**Product source of truth:** [`NGOA_LONG_REBUILD_SPEC_V1.md`](NGOA_LONG_REBUILD_SPEC_V1.md), owner [Issue #4](https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/4).

## Repository baseline

- Repository: `vuanhtuan161094-byte/Heoofgaia`.
- Protected integration branch: `main-ngoalong`.
- Latest fetched HEAD at task intake: `66fb0fcfdde782dd803db4e6dd6a3ecee198d388` (`docs(ngoa-long): checkpoint official Ngọa Long-first roadmap and safe baseline`).
- Baseline GitHub Actions: run [44001013453](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44001013453), SUCCESS on the baseline SHA. This verifies the prior R01/full-regression workflow only; it is not evidence for new R02 work.
- Working branch for this task: `codex/ngoa-long-rebuild-v1`, created directly from fetched `origin/main-ngoalong`. No merge/reset/force-push was used. Any eventual PR must target `main-ngoalong`; do not self-merge.
- One distributable offline file: `index.html`, reproducibly assembled by `tools/build_ngoa_long_mode.py`.

## Product and save invariants

- Core: city/progression, formation 3×3 with up to five owned generals, 24 tactical presets, morale/skills/status, physical/tactic/magic damage, counterplay, campaign battles, one-time settlement and immutable replay.
- Keep Save key `muu_dinh_tam_quoc_v1`, schema v5, v1–v4 migration, JSON import/export, current P2/P3 journal, `p3PresetId`, `p3TroopTier`, original assets, and all legacy CL save data.
- All unverified formulas/odds/stats are SIMULATED. No proprietary references, images, UI or audio are included.

## Milestone status

| Gate | Status | Evidence |
|---|---|---|
| Source reconciliation | DONE | Latest `main-ngoalong` HEAD, `AGENTS.md`, V1 spec, REV, checkpoint, related code/docs and Issue #4 reconciled on `codex/ngoa-long-rebuild-v1`. |
| NL-R01 command hub | BASELINE PASS | Baseline exact-SHA Actions 44001013453; new-branch Chromium also verifies routes and live combat startup. This is not R02 acceptance. |
| NL-R02 gameplay loop | LOCAL PASS · CI PENDING | Chromium 29/29, including five-unit combat, skill animation, one-time settlement, troop losses, upgrade, stage 2, reload/replay, insufficient-supply/loss paths and v1–v4 migration. Existing regression suite passes locally; acceptance waits for exact-commit GitHub Actions and its playable artifact. |
| NL-R03 content | NOT STARTED | Opens only after R02 technical acceptance. |
| NL-R04 art/release | NOT STARTED | Opens only after R03. Owner visual approval and physical device play remain separate human gates. |

## Required release evidence

For each milestone, run syntax/static, focused functional tests, Chromium at 1280×720 and 390×844, existing regressions, and GitHub Actions on the exact source SHA. Local R02 evidence currently includes `qa/NL_R02.json`, `qa/NL_REBUILD_01.json`, `qa/nl-r02-desktop-battle.png`, and `qa/nl-r02-mobile-hub.png`; these are local working-tree evidence until included in a successful CI artifact. Publish the offline HTML artifact only after that exact-SHA workflow succeeds. Mark physical-device play and owner art acceptance PENDING until personally performed.

## Historical checkpoint

The previous CL-P6 milestone log is preserved at [`archive/CURRENT_CHECKPOINT_CL_P6_2026-11-17.md`](archive/CURRENT_CHECKPOINT_CL_P6_2026-11-17.md). It describes an earlier product direction and must not be used as an active roadmap.
