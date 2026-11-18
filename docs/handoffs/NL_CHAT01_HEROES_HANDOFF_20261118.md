# Mưu Định Tam Quốc — Chat 01 / Heroes V2 handoff (2026-11-18)

## Authority, boundary, source
- Repo: `vuanhtuan161094-byte/Heoofgaia`
- Source branch: `feature/nl-codex-cloud-v1-finish`; verified fork point `a88b8449714ad48531f7c9e7e081ccac43edee92`.
- Specialist branch: `feature/nl-v2-heroes` (not merged).
- Official source for this batch: https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong, checked 2026-11-18. **Mobile current edition**, **classic parity UNKNOWN**.
- User authority: no Codex Cloud. No edits to index.html, alpha_content.json, generator, Save, .github CI, or other specialist modules. No art production.
- AGENTS.md / REV_PROTOCOL.md / NL_DATA_DRIVEN_V2.md / current content contract read before changing data.

## Delivered
1. `data/ngoalong/modules/heroes/wiki_catalogue_v1.json` — 364 index records with stable Wiki-list ordinal IDs, exact name, faction, listed grade, source URL, field provenance, REFERENCE_ONLY status, and unresolved-name audit. Counts: Ngụy 40, Thục 38, Ngô 39, Quần 174, Trung lập 73. Distinct normalized names 363; the exact-name collision is **Trương Hoành** (Ngô `wiki-mobile-hero-104`; Trung lập `wiki-mobile-hero-351`). Keep both; do not auto-deduplicate.
2. `data/ngoalong/modules/heroes/hero_development_contract_v1.json` — model for identity/variants, stats/level/EXP/training/awakening/evolution, source rules, readiness, and legacy authority.
3. `data/ngoalong/modules/heroes/detail_patches_v1.json` — empty, edition- and field-version-gated detail input for large future batches. No fabricated details.
4. `data/ngoalong/modules/heroes/skills_handoff_v1.json` — 364 Chat 05 skill bundles; source-backed identity, but **skill mechanics remain UNKNOWN**, null descriptors. No runtime import.
5. `tools/nl_hero_catalogue.js` — CommonJS bulk loader, source/duplicate validation, materialization of UNKNOWN fields, evidence-only patch overlay, project-roster cross-check and skill-descriptor export. Pure data-only: it never creates a second battle engine.
6. `qa/nl_hero_catalogue.test.cjs` — 18 focused tests including five negative/patch checks.

## Coverage and release decisions
| Domain | Verified index data | Missing |
| --- | --- | --- |
| Index identities | 364/364 | Detailed hero-page identity IDs, special variant links |
| Name, faction, listed grade | 364/364 | Current post-upgrade grade per character |
| Existing 50 reference profiles | 50/50 matched by name/faction/grade | 50 missing source combat details |
| Role, troops, stats, acquisition | 0/364 complete | Per-hero versioned details |
| Normal/active/passive skills | 0/364 complete | Skill definitions, levels, targets, duration, probability, exact edition |
| Training/EXP/awaken/evolution | UNKNOWN for Wiki roster | Source-supported progression formula and edges |
| DESIGN_READY — new Wiki roster | **0/364** | Role + exact source-backed skill facts |
| PLAYABLE — new Wiki roster | **0/364** | Original project stats/formulas, runtime mapping, focused battle QA |
| Existing project roster | **14/14** unchanged, SIMULATED | Not eligible to claim Wiki parity |

**Important:** 364 is the number of list entries (and our independently numbered records), **not** proof of 364 distinct historical individuals, complete hero skill sheets, or 364 playable characters. One exact-name collision is confirmed. `Thái Văn Cơ` / `Thái Diễm` and `Tuân Úc` / `Tuân Vực` are *possible* naming aliases only; no automatic link authorized.

Project runtime has 14 independent SIMULATED heroes; 10 names overlap the Mobile Wiki index. The remaining four runtime names are Lưu Bị, Tào Tháo, Tôn Quyền, Tuân Úc. Do not transplant project stats/skills to Wiki hero IDs merely because names match, nor silently replace `Tuân Úc` with `Tuân Vực`.

## QA evidence
- **18/18 focused JS checks PASS**, evaluating the committed module and committed QA source in a V8 isolate with a read-only filesystem shim containing fetched exact GitHub file contents. This verifies logic and schema but **is not a local Node runtime, Chromium, GitHub Actions, Save/replay, or release claim**.
- Reproduction from repo with Node: `node qa/nl_hero_catalogue.test.cjs`; summary: `node tools/nl_hero_catalogue.js --check`; skill snapshot regeneration: `node tools/nl_hero_catalogue.js --export-skills`. These are suggestions for Chat 08, not claims that native Node runs were performed.
- New Wiki roster intentionally remains REFERENCE_ONLY; Save key/schema and index.html untouched.

## Interface for other chats
- Chat 05: read `skills_handoff_v1.json`; fill distinct NORMAL/ACTIVE/PASSIVE descriptors only after verifying **hero + version + skill type + targets/effects** from dated source pages. Own combat events/resolvers and compatibility with existing statuses; do not patch this chat's engine scope.
- Chat 02: resolve `troopIds` by explicit cross-references only; do not infer troop types from general history or grade.
- Chat 08: load `tools/nl_hero_catalogue.js` export `loadCatalogue()`; consult `profiles`, `readiness`, `skillDescriptors`. Integrate only source-confirmed DESIGN_READY records with your own project rules and approved combat/save mappings. No auto-integration; test/approval remain Chat 08 authority.
- Chat 00: treat INDEX_COMPLETE and MODULE_CODE_READY as completed work in this branch, **not** full HERO_WIKI_DETAIL_COMPLETE or 364 PLAYABLE.

## Next large-batch ingestion
1. For each detailed hero record source, append to `detail_patches_v1.json` keyed by `heroId`, every fact separately `{value, classification:"VERIFIED", sourceUrl, checkedAt, edition:"VNG_WIKI_MOBILE_CURRENT"}`. A generic index page is insufficient evidence for role/skill/stats.
2. Validate conflicts, genuine base/variant relationships, source-edition changes, and proper duplicate-name handling. Preserve UNKNOWN, do not infer formulas or apply Quý Tử mechanics to generals.
3. Only mark DESIGN_READY when both role and source-backed skill facts are present. PLAYABLE requires Chat 05/08 runtime bindings and focused evidence (including Save/replay); owner approval remains separate.
