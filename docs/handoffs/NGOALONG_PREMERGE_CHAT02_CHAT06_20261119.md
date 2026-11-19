# MƯU ĐỊNH TAM QUỐC — PRE-MERGE CHAT02 + CHAT06 — 2026-11-19

## Scope and Git truth
- Repo: `vuanhtuan161094-byte/Heoofgaia`
- Staging branch: `integration/nl-chat02-chat06-premerge-20261119`
- Baseline of staging: PR #10 branch `feature/nl-codex-cloud-v1-finish`, commit `e33e36255d62ea51af7f48386b8d3c56c6448369`.
- CHAT02 selected head: `f6e3f419b44936e7d1e479afe0cb3eb3e761aa05`.
- CHAT06 selected head: `4c903f4a3c057bc63b633a2526a5285c0d3fa8a2`.
- Staging collection commit (before this report): `c026316c0b49e12d37831d3cc69f86d2c97829a1`.
- PR #10 stays DRAFT and not merged; no Codex Cloud; NO integration to main/default branch. This file is a staging report, not authorization to merge.

## Exact snapshot inventory and source preservation
- CHAT02: **36 added** paths (data/ngoalong/modules/troops/** and qa/modules/troops/**).
- CHAT06: **71 added** paths (campaign data/shards/evidence, campaign QA/docs/tools).
- Source file sets have **zero overlapping paths**, so staging uses the exact original Git blob SHA per path.
- Stage commit adds **107 paths**, ~42,517,034 bytes, preserving all **199** existing source files in PR head.
- Verified tree has **306 blobs** and 107 additions, no modifications/deletions, no blob SHA mismatch.
- Critical source references (`source_shards/*`, `npc_numeric_troop_crosswalk_v2.json`) were copied byte-for-byte and are NOT rewritten.

## Gate: source truth vs simulated project design
- CHAT02 44-ID exception triage: 9 ambiguous (duplicate names) + 35 absent in CHAT02 catalogue, including 11 with `Rương` labels.
- CHAT06 source evidence review: 0 independently verified numeric-ID-to-CHAT02 runtime identities; 0 mappings approved.
- CHAT02 35 `SIMULATED` troop designs and CHAT06 same-dungeon donor algorithm are **project design**, not VNG Wiki source facts.
- New NPC design must stay source-isolated and `runtimeEnabled=false`; forbid mapping `troopWikiId` to `troopId` automatically, or copying fabricated Wiki AI IDs, original rewards or skill proofs.
- Existing `approved_bindings_v1.json` has empty approved registries, no approved NPC/unit connections; leave it untouched.
- CHAT08 is the *single integration authority*. Runtime, generator, Save v5/replay/receipts may only change after explicit review and exact-SHA QA.

## Unresolved merge prerequisites
- [ ] Run **all Node tests** in qa/modules/troops and qa/modules/campaign on a full checkout, including `nl_campaign_peer_fallback_v1.test.cjs`.
- [ ] Run `node data/ngoalong/modules/campaign/nl_campaign_peer_fallback_v1.js` on all 21 source shards and review its generated preview counts/roles/donor links; generated JSON is not included in this stage.
- [ ] Review outdated *provenance snapshot* refs: `crosschat_dependencies_v1.json` pins CHAT02 `6f3b014...`; `troop_id_source_pins_v2.json` retains an earlier CHAT02 head. Preserve historical evidence, but regenerate an explicit integration snapshot if CHAT08 consumes current module HEADs. Do not rewrite evidentiary SHA as if it originally described a newer source.
- [ ] Verify CHAT01/03/04/05/07 sources and select each canonical branch; several old branches are alternatives, not additive merge inputs.
- [ ] Resolve potential **CHAT08 and GROUP07 shared-file overlap**: `.github/workflows/ngoalong-qa.yml`, `tools/build_ngoa_long_mode.py`, `data/ngoalong/alpha_content.json` (runtime/generator ownership).
- [ ] Run end-to-end Chromium gameplay, NPC progression, combat, Save v5/replay/receipt regression and exact-SHA GitHub Actions on final integration commit.
- [ ] Owner acceptance before promoting Draft PR #10 or merging into base.

## QA status at staging
- Git source tree and blob integrity: **PASS** (107/107 source SHA, zero changed baseline paths).
- CHAT02 source triage: previous GitHub readback and JavaScript isolate assertions passed.
- CHAT06 same-dungeon generator: previous 5/5 committed test-script assertions passed in isolated JavaScript harness; **not** full Node execution.
- GitHub Actions on staging collection commit: **0 runs**; status pending with no actual contexts. Do not claim CI success.
- Full Node, 21-shard CLI, Chromium, Save/replay/receipts and cross-branch gameplay integration: **PENDING**.

## Recommended controlled merge order
1. Freeze source HEADs for CHAT01/02/03/04/05/06/07 with file ownership and diff manifests; avoid alternate older branch duplication.
2. Combine source-only modules first (this CHAT02/CHAT06 stage is ready for broader staging), execute unit tests, review 249 maps and 44 ID gates.
3. Apply CHAT08 runtime wiring as a single owner, resolving workflow and generator collisions explicitly.
4. Run one canonical web review and exact-SHA CI; obtain owner approval. Keep PR #10 Draft and do not merge until then.

## No automatic cleanup
Preserve task branches and Draft PR until final integration has passed; deleting a source branch now would remove auditability. Prune only after the owner has accepted the integrated SHA.
