# REV — Research, Engineering, Verification

REV is this repository's recorded review process for the offline HTML game. Apply it to the current owner direction in [`NGOA_LONG_REBUILD_SPEC_V1.md`](NGOA_LONG_REBUILD_SPEC_V1.md); do not use historical CL-P0–P6 or hybrid phase language as active requirements.

## R — Research and requirements

1. Fetch and record latest `main-ngoalong` HEAD before changing code. Read `AGENTS.md`, this document, `CURRENT_CHECKPOINT.md`, the master spec, relevant design/source/test, and GitHub Issue #4.
2. Research official Ngọa Long references through `NL_REFERENCE_MATRIX.md`. Mark facts VERIFIED, adaptations DERIVED, project-owned numbers SIMULATED, and unsupported details UNKNOWN. Do not copy protected source, UI, art, audio, text passages or formulas.
3. Define input → authoritative state → combat event → receipt → save → UI. Keep Hero and unrelated repositories isolated.

## E — Engineering

4. Work in a small playable vertical slice and preserve existing behavior/data. Keep one offline distributable `index.html`; `tools/build_ngoa_long_mode.py` must reproduce its R01 dashboard without changing gameplay state.
5. Preserve localStorage key `muu_dinh_tam_quoc_v1`, schema v5 and v1–v4 migrations, JSON import/export, campaign progress, P2 event journal/replay, `p3PresetId`, `p3TroopTier`, assets/provenance, and CL legacy save data. New state must hydrate safely without destroying old fields.
6. Settlement has one authority: validate battle id/state, settle cost and outcomes once, persist a receipt/report, then render. Replay only reads immutable snapshots. No reward/cost duplication on fast click, reload, loss, or replay.
7. Keep each active phase separate and gated: R02 gameplay → R03 content/progression → R04 art/release. Never skip a failed or untested gate to start a later one.

## V — Verification gates

8. **V0** syntax/static and reproducible build; **V1** focused mechanics/failure tests; **V2** real Chromium interaction at desktop 1280×720 and mobile 390×844, including save reload, animation evidence and replay; **V3** full GitHub Actions PASS on the exact commit SHA and playable artifact; **V4** physical Windows/Android play; **V5** owner visual/art acceptance. V4/V5 require human evidence and cannot be inferred from CI.
9. Run existing P2/P3/P4/P4.1 and relevant CL compatibility regressions. Do not delete, skip, weaken or rewrite unrelated coverage merely to green the pipeline.
10. Screenshots/video must come from the running game and identify the source SHA; no mockups or reconstructed results. File-save testing in an isolated Playwright shim must be labeled as such, separate from a real `file://` device check.
11. Only claim gates with captured evidence. Use PENDING when no test or human review has happened; use BLOCKED only for a known blocker.

## Branch and delivery rules

- The protected destination is `main-ngoalong`. A task branch, when required by the environment, must derive from its fetched HEAD; an optional PR targets only `main-ngoalong` and is never self-merged.
- Never modify Hero/default branch, reset, force-push, or delete player data/assets. Publish a playable artifact only when the full exact-SHA workflow is successful.
- Every milestone report includes WHAT CHANGED, TEST RESULTS, PENDING/BLOCKED items, exact SHA/Actions URL, runtime evidence, known risks, and next steps.
