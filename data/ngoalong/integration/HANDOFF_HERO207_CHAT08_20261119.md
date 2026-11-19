# CHAT 08 / CHAT 01 — HERO207 INTEGRATION HANDOFF (19/11/2026)

## Authority, exact scope
- Repo: `vuanhtuan161094-byte/Heoofgaia`.
- Integration baseline: `feature/nl-codex-cloud-v1-finish` at `e33e36255d62ea51af7f48386b8d3c56c6448369`.
- Dedicated non-merged task branch: `feature/nl-mcv2-08-heroes207-a-20261119`; no Codex Cloud or direct writing to shared PR #10 branch.
- Upstream research: `feature/nl-v2-heroes` at `a60de51aed162cd2c3cda4e5785f37c225f2add9`, plus separately recorded foreign source V8 on hero branch at `9ceb039a9a13baa0892282089966ce16fff3ef09`.
- Existing 14 project heroes, skills, their IDs, gear and old free tavern recruitment pool unchanged; Save key `muu_dinh_tam_quoc_v1`, schema v5 preserved.

## Engineering
1. `data/ngoalong/alpha_content.json`: add `heroes.hero207Roster` (207 SIMULATED candidate profiles), `skills.hero207ById` (207 native existing-engine patterns/statuses), `heroes.hero207Unlocks` (207 stage gates 1–28, costs), source-bound `heroes.hero207ResearchContext`. Legacy 14 `heroes.projectRoster` and `skills.heroById` unchanged. Wiki 364 `heroes.profiles` remains empty/UNKNOWN; do not misrepresent as verified Mobile stats.
2. `tools/nl_heroes207_runtime_v1.js`: binds recruited candidates into live `HEROES` and `P2_SKILLS`, not the original 14's free recruitment pool; appends to authoritative `game.roster` and `game.hero`, Save/rehydration, stage-gated paid once-only recruitment, UI within existing Heroes tab and command hub. No automatic recruitment. Keeps 3×3 9 formation slots and max-five deployment ownership.
3. `tools/build_ngoa_long_mode.py`: inject runtime module into canonical generated single-file HTML by deterministic marker; responsive 390px selection styles. Does not create a second game.
4. `data/ngoalong/integration/heroes207_runtime_manifest_v1.json`: 207 source IDs and cross-edition provenance. Historical Chinese source only informs user-authorized project design; every computed stat/skill remains `SIMULATED`.
5. Hand-tuned **Kha Ngô** to a water-magic strategist and **Lâu Ban** to a front-line defender using the newly dated Lequ 2011 research, but their actual runtime coefficients/names are still ORIGINAL SIMULATED, not copied as VNG Mobile rules.

## Implementation boundaries
- Native engine supports `single/row/column/all/heal`, `physical/tactic/magic`, `break/guard/daze/burn` status subset and morale; V7 proposals with unimplemented custom buff/stack/passive/cooldown effects are **NOT full fidelity**. Chat 05 owns richer rules.
- These 207 recruitable SIMULATED candidates do not imply that 207 Mobile VNG heroes are recruitable, and do not imply Wiki skill parity.
- Source research V8 contains new historic Lequ leads for Kha Ngô/Lâu Ban/Dương Nghi/Đinh Nguyên/Tỏa Nô, 2026 current Mobile role still UNKNOWN. Dương Cổ, Vô Khâu Kiệm, Nghiêm Dư remain without individual Ngọa Long skill/source proof.
- Existing 28-stage project campaign is kept unchanged; recruiting stages are an additive distribution across them. No 207 additional phó bản were invented.
- This branch has no merge, no force push, no changes to Hero game or other domain owners.

## QA / release claim
- Real GitHub Actions run `44469763432` on exact SHA `031d1fe2b7002cda3f00db9dc6b84b70a51420ea`: quick CI **SUCCESS**, includes Node Hero207 recruitment, canonical generator, prior progression, combat, legacy regression. This result applies **ONLY** to that SHA, not automatically to subsequent commits.
- V8 mock harness read GitHub files and passed 223/223 manual checks (stage 1 and 28 unlocks, 207 independent recruits, Save-state rehydrate, no duplicate, 14 originals, battle descriptor registration), not Chromium.
- Added `qa/nl_heroes207_browser.py` to verify desktop/mobile Chromium, actual Heroes selection, paid one-time recruitment, Save v5 reload and battle-unit binding on a later exact SHA; see GitHub Actions on task branch for latest result.
- Quick workflow uploads `muu-dinh-tam-quoc-hero207-playable-candidate` **only after successful focused QA**. It is a test candidate, not a release/owner acceptance; full 90-minute CI, physical device QA and owner art/playtest remain PENDING.
- For real integration into PR #10, Chat 08 reviews the task branch and resolves concurrent changes. **No automatic merge**.
