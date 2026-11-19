# MƯU ĐỊNH TAM QUỐC — PREMERGE REVIEW | 19/11/2026

**Trạng thái: PREMERGE CANDIDATE, NOT MERGED, NOT RELEASE / OWNER ACCEPTED.**

## Chính xác HEAD và giới hạn

- GitHub repo: `vuanhtuan161094-byte/Heoofgaia`
- PR chính: #10 `feature/nl-codex-cloud-v1-finish`, gốc `e33e36255d62ea51af7f48386b8d3c56c6448369` (OPEN / DRAFT). Không ghi vào PR #10 hoặc tự merge.
- Review task branch: `feature/nl-integration-review-20261119`; source copied by immutable blob SHA through git tree commits, **not** by merging unrelated branch histories.
- **230 changed paths** compared with baseline PR #10 at commit after seven-group aggregation (source-only components plus runtime integration).
- Preserve canonical single `index.html` generator; no second game; no Codex Cloud.

## Nguồn ghép và phạm vi

| Group | Nguồn được chọn | File ghép | Runtime state |
|---|---|---:|---|
| Chat01 — Võ tướng | `feature/nl-v2-heroes @ 9ceb039a9a13baa0892282089966ce16fff3ef09` | 62 | Reference Wiki 364, 207 simulated designs; provenance only |
| Chat02 — Binh chủng | `feature/nl-mcv2-02-troops @ f6e3f419b449` | 36 | Specialist catalogue / ID bridge staged; **not** asserted to be bound live |
| Chat03 — Công trình | `feature/nl-v2-city @ d9bb84987260` | 14 | Engine / economy / UI module staged; **not** asserted to be bound live |
| Chat04/08 — Vật phẩm | `feature/nl-mcv2-08-items-integration` (copied blob SHA snapshot around `20cfa59f` / `a67472f`) | 25 | 411 project equipment templates and Group04 item engine, integrated by canonical item builder |
| Chat05 — Chiến đấu | `feature/nl-mcv2-05-combat @ adfd0a16c465d4fedcf13ce8c95707f87e4c6de2` | 13 | Deterministic standalone V2 source; **not** wired to legacy resolver yet |
| Chat06 — Phó bản/NPC | `feature/nl-v2-campaign @ 4c903f4a3c05` | 71 | Stage/NPC evidence / adapter source staged; **not** installed in canonical 28-stage runtime |
| Chat08 — Hero207 runtime | `feature/nl-mcv2-08-heroes207-a-20261119 @ 5ebd99d44535d0a2945a8587bb6e8e90a87bdfda` | 7 | Live 207 recruited heroes / skill subset / Save v5 and UI, canonical builder |

**Chat07 Art** `feature/nl-v2-art`: NOT STAGED; graphics/art approval is pending. Do not silently port or distribute unapproved sprites.

## File conflict resolution

Only specialist-branch changed-path overlap was `.github/workflows/ngoalong-qa.yml` between Hero207 and Items08. Review branch **explicitly composes** the workflow: hero+item canonical build, Chat01/02/03/05/06 Node QA, dedicated Hero207 Chromium + Item Chromium, combined Hero207×Items Save/equipment/browser test, and all previous regression/full jobs. Workflow file from neither source branch is blindly overwritten.

Do not automatically enable pure-source Chat02/03/05/06 modules inside runtime. Those need Chat08's dedicated adapters and validation of references, reconciliation of troop/skill IDs, 28-stage campaigns, replay stability and budget.

## Provenance/identity invariants

- **207 backlog heroes** are project-authored `SIMULATED` design; outside-China classic edition sources do NOT establish Mobile 2026 coefficients. Three historical names still need source proof: Dương Cổ, Vô Khâu Kiệm, Nghiêm Dư.
- **14 original** runtime heroes unchanged; **207 new** recruited via 28-stage unlocks; no auto free recruits; Save key `muu_dinh_tam_quoc_v1`, schema 5 and 3×3/5 deployed remain.
- **364 Wiki hero entries** are **reference-only**, not equivalent to 364 playable heroes.
- 411 project equipment templates and 674 Wiki item references are different data classes; only project `SIMULATED` mechanics executable.
- Chat05 Combat V2 and Chat06 NPC source evidence have different status from live legacy engine. **Source staging is not live integration**.

## QA / Release gates

1. Cross-module code/tests on exact staging SHA: `node qa/nl_heroes207_runtime_v1.test.cjs`; Node tests of heroes, troops, city, combat, NPC and items.
2. Canonical generator: `python tools/build_ngoa_long_mode.py`, R03, R04, Item builder; deterministic `--check` sources.
3. Chromium actual Heroes207 recruiting, equipment purchase/equip from Item08, shared Save v5 reload, UI 1280×720 and 390px; `qa/nl_premerge_hero207_items.py`.
4. Baseline NL-R02/R03, economy, legacy CL and Save/replay/first-clear receipts intact; real 28-stage PvE balance before acceptance.
5. GitHub Actions exact SHA `quick` and `game` full jobs; until both pass, **NOT MERGE-READY**. Physical Windows/Android and art approvals remain owner-only.
6. Require Chat00/08 to review the source snapshot, stage branch, green QA and merge into PR #10 only after explicit review. PR #10 remains Draft.

### Previously completed isolated gates (NOT equivalent to composite PASS)
- Hero207 focused Chromium + Node on `5ebd99d44535d0a2945a8587bb6e8e90a87bdfda`, SUCCESS: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44470719303.
- Items08 focused QA `8b44542c919413ef7630e7680f45ec914cfa65e2`, SUCCESS: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44459068529.
- PR #10 baseline `e33e36255d62ea51af7f48386b8d3c56c6448369` had its own green workflow; that cannot be inherited by candidate.

**Candidate composite Actions:** https://github.com/vuanhtuan161094-byte/Heoofgaia/actions?query=branch%3Afeature%2Fnl-integration-review-20261119. Status must be read from exact SHA; this document does not claim a green composite run.
