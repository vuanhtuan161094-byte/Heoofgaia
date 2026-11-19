# CHAT 00/08 — Preflight hợp nhất Mưu Định Tam Quốc
Ngày kiểm tra: 2026-11-19. Trạng thái: **PREPARED / NO MERGE / NO PR HEAD CHANGE**.

## 1. Điểm xuất phát bất biến
- PR #10: `feature/nl-codex-cloud-v1-finish` at `e33e36255d62ea51af7f48386b8d3c56c6448369`; **Draft, unmerged**. Base `codex/nl-wiki-01-r02-20261117`.
- Items: `feature/nl-mcv2-08-items-integration` at `20cfa59f7acffd4e4ddbd3dc0f2d5d019cf3b343` before preflight commit.
- Heroes207: `feature/nl-mcv2-08-heroes207-a-20261119` at `5ebd99d44535d0a2945a8587bb6e8e90a87bdfda`.
- Troops: `feature/nl-mcv2-02-troops` at `f6e3f419b44936e7d1e479afe0cb3eb3e761aa05`.
- Combat: `feature/nl-mcv2-05-combat` at `adfd0a16c465d4fedcf13ce8c95707f87e4c6de2`.
- City: `feature/nl-v2-city` (HEAD must be refreshed at integration time).
- Campaign: `feature/nl-v2-campaign` (diverged from PR base; HEAD must be refreshed).
- Heroes data: `feature/nl-v2-heroes` (diverged from PR base; HEAD must be refreshed).
- Art: `feature/nl-v2-art` (HEAD must be refreshed; Owner visual approval pending).
- Older effects bridge: `feature/nl-group07-effects-v1-20261118` (diverged; overlaps shared workflow and `tools/build_ngoa_long_mode.py` with Heroes207). Treat as independent integration input, NOT merge blindly.

## 2. QA reality: separate run conclusion from game job
Full-run: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44475667055 on Items SHA `20cfa59f7acffd4e4ddbd3dc0f2d5d019cf3b343`.
- Historical full **game job SUCCESS**; focused job **CANCELLED**; overall workflow **CANCELLED**. Do not label the entire run green or claim multi-branch QA.
- Last focused Items exact-SHA SUCCESS: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44459068529 at `8b44542c919413ef7630e7680f45ec914cfa65e2`: 27/27 Node, 20/20 Chromium; Save v5/reload/replay receipts PASS.
- PR #10 HEAD `e33e3625` predates both. No source of truth claim until common integration build.

## 3. Collision matrix and integration order
| Branch/domain | File overlaps and action |
| --- | --- |
| Items ↔ Heroes207 | Both modify `.github/workflows/ngoalong-qa.yml`. Manually compose *both* item and hero focused/full regression gates. Heroes207 also edits `data/ngoalong/alpha_content.json`, `tools/build_ngoa_long_mode.py`; preserve canonical build and ensure Items injection executes after it, not overwritten. |
| Heroes207 ↔ older Effects bridge | Shared workflow and `tools/build_ngoa_long_mode.py`; avoid importing obsolete build override. Review effects contract before enabling. |
| Troops / Combat / City | Module/QA mostly confined to domain paths relative to PR branch; no shared path collision with Items, but cross-domain runtime wiring still untested. |
| Campaign / Heroes research | Branches diverged from older PR ancestors; **do not mechanically merge full branch** without enumerating commits and resolving source provenance, Wiki-only vs SIMULATED. Port only validated modules/fixtures under ownership contract. |
| Art | Candidate source art is not automatically accepted playable asset. Keep event-only and Owner visual approval explicit. |

**Sequence (no branch deletions):**
1. Freeze source SHA snapshot and obtain current CHAT 00 permission to integrate on a dedicated candidate branch (NOT default branch or PR head until approved).
2. Establish baseline from `feature/nl-codex-cloud-v1-finish`. Apply **Heroes207 runtime changes first**, preserving `alpha_content` and `build_ngoa_long_mode.py`.
3. Integrate **Items** runtime, catalogue, UI and build injection, carefully combining workflow YAML (never replace whole workflow from one branch).
4. Port domain modules 02/05/03/06 and hero research contracts one batch at a time. Resolve NPC/troop/skill/item IDs and provenance before enabling actual runtime references.
5. Check 07 art event mapping, smoke tests and asset QC without assuming approval.
6. Run canonical generator once; inspect output `index.html` and source SHA. Node tests; 390px Chromium/mobile; Save v5 old/new/replay; full 28-stage staged rewards; full `game` CI. Record exact SHA and artifact digest.
7. Only after all passes and explicit Owner approval, update PR #10 integration head and request review. Keep Draft until approval; **never merge automatically**.

## 4. Release blockers
- Items and Heroes207 **not yet combined**.
- Full combined-game CI **not yet executed**.
- Cross-chat numerical NPC IDs, live troop/combat and campaign interoperability need their own qualified smoke/regression.
- Android/Windows physical Owner QA and art approval pending.
- PR #10 remains on old commit and cannot be treated as fully integrated.

## 5. Ownership
CHAT 00 alone edits `docs/operations/NL_MULTI_CHAT_V2.md`; CHAT 08 owns `data/ngoalong/integration/**`, runtime, generator, shared workflow. This preflight is a handoff, **not a request to merge now**. No Codex Cloud, no force push, no default-branch modifications.
