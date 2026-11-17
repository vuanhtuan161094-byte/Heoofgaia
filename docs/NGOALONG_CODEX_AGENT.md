# NGỌA LONG — DEDICATED CODEX AGENT / ARCHIVAL CONTRACT

> **CURRENT OWNER DIRECTIVE — GitHub Issue #4 (2026-11-17):** The official [Ngọa Long VNG Wiki](https://ngoalong.vnggames.com/ngoa-long-wiki) is the required gameplay research reference; `NGOA_LONG_REBUILD_SPEC_V1.md` remains the product contract. Execute NL-WIKI-01 research, then NL-R02 and NL-R03 as original, playable vertical slices. Do not use Chiến Loạn or Loạn Tam Quốc as the current gameplay target. The roadmap, game loop, and product pivots below are archival; retain only compatible safeguards: Hero/repository isolation, Save schema v5, one reproducible offline `index.html`, no proprietary assets/code/UI/formulas, no merge/force-push/reset, and REV exact-SHA/Chromium evidence. Research current Mobile separately from classic webgame and mark Wiki coverage honestly.

This file preserves earlier planning notes for history. If an older gameplay direction in this file or `AGENTS.md` conflicts with the latest owner Issue #4, follow Issue #4; retain compatible repository safeguards from `AGENTS.md` and `docs/REV_PROTOCOL.md`. The game has not been fully implemented by this notice.

**Owner authorization:** 2026-11-16 — Codex may execute the complete Ngọa Long project only. This authorization supersedes the earlier "no Codex" instruction **only on this project's branch**.
**Repo:** `vuanhtuan161094-byte/Heoofgaia` · **isolated game branch:** `main-ngoalong` · **baseline verified before intake:** `8f8e9c705375d6307ca30771b953db1a5409c699`.
**Agent identity:** `NgoaLong-Codex`. This is a *project-scoped agent instruction*, not a claim that a remote Codex runtime has started.

## 1. Hard isolation and ownership
1. Before each work session: fetch latest HEAD SHA for `main-ngoalong`, read `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/CURRENT_CHECKPOINT.md`, this file, relevant source and QA. Never assume the baseline SHA remains latest.
2. The only source/release of this game is `index.html` on `main-ngoalong`. Preserve existing V0.6 P4.1 functionality and validated tests, original P4/P4.1 assets and manifests. Do not create divergent playable HTMLs.
3. **Forbidden:** edit, merge, create PR against, reset, force-push or manipulate the Hero branch `feature/hog1-research-to-playable-20261102`, Hero Save v07, any Tông Môn Bá Đạo/CMP repo, or the repo default branch. Do not read/write other projects as task dependencies.
4. No merge/force push. Use expected-SHA compare-and-swap protections when available. If Codex environment requires a task branch, it must branch exclusively from `main-ngoalong`; PR base must be `main-ngoalong`, and owner performs merge after approval. Do not automatically switch to another repository.
5. Do not run paid cloud services, production deployment, public multiplayer servers, external purchases, or destructive actions without owner approval.
6. Codex may research public references and implement *original* mechanics; **no reuse of proprietary game code, textures, soundtrack, screen captures or trademarks as game assets**.

## 2. Real Ngọa Long references (research before implementing)
Distinguish **Ngọa Long VNG classic** from **Tân Ngọa Long** and other games. Confirm current page availability, version, and exact mechanic evidence:
- Official Ngọa Long VNG Google Play: https://play.google.com/store/apps/details?id=vn.zalo.ngoalongmb — descriptions of võ tướng/huyễn tướng, chiêu mộ, trang bị, xây thành/phó bản, công thành, chiến trường, kế sách and PvP.
- Official App Store: https://apps.apple.com/vn/app/ng%E1%BB%8Da-long-vng/id1058728157 — city lord, recruit/train/equip generals, formation and combat.
- Official binh chủng wiki: https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung — separate infantry/spear/cavalry/archer/scholar and naval classifications and counterplay.
- Official wiki: https://ngoalong.vnggames.com/ngoa-long-wiki/quy-tu — specialized general-training systems; research optional endgame only.
- Official introductory general training (video): https://www.youtube.com/watch?v=nKxo-WE_g90 .
For every researched mechanic create and maintain `docs/NL_REFERENCE_MATRIX.md`: source URL, accessed date, game version, OBSERVED/DERIVED/SIMULATED/UNKNOWN, proposed ORIGINAL implementation, acceptance test and IP risk. The published descriptions do *not* establish precise combat formulas; all new numbers must be marked SIMULATED and playtested. Do not blindly import the original game's 13 formations/12 slots if it would break our current 3×3 tactical system.

## 2A. Secondary reference explicitly identified by the owner — Loạn Tam Quốc (2018)
The owner identified the **2018 Vietnamese webgame Loạn Tam Quốc** as the game they remembered, **not** Loạn Thế Tam Quốc or Chiến Loạn Tam Quốc. Treat this as a second gameplay inspiration alongside classic Ngọa Long, not as permission to clone.

Evidence available for research (recheck original publication date and source before using):
- Thanh Niên, 10 November 2018: https://thanhnien.vn/webgame-chien-thuat-loan-tam-quoc-sap-ra-mat-tai-viet-nam-1851143706.htm — city and country construction, military formations, player-controlled soldiers.
- Gameplay review: https://kenhgamevn.com/game-online/trai-nghiem-webgame-loan-tam-quoc-game-chien-thuat-the-tuong-co-ban-hinh-anh-kha-on-voi-nen-game-web/ — a general represents a visible troop unit; individual soldiers participate in combat with visible health; capture nearby strongholds.
- Gameplay review: https://2game.vn/choi-thu-webgame-loan-tam-quoc-game-slg-dau-tu-chin-chu-ve-ki-nang-va-hieu-ung-cua-cac-tuong-linh-post202806.html — advancing across map territories; generals cast combat skills.
- Owner-recalled interaction: selecting a commanded army and clicking a target city orders travel/attack. Label this **USER-RECOLLECTION** until independently verified, and implement as an original intuitive control without pretending a verified exact clone.

**Required original hybrid design:**
1. Retain Ngọa Long-inspired 3×3 formation, tactical roles, morale, progression, 24 presets and P2/P3 deterministic systems.
2. Add **general + visible associated troop detachment** model: a general commands an actual contingent of sprites; troop numbers affect battle, soldiers can attack, be wounded, die or retreat, and there is consistent outcome reconciliation. No decorative copy/pasted troops standing inert. Use LOD/instancing where feasible and performance limits on mobile.
3. On map, select owned commander/army, click valid reachable city/fort/farm/mine target, preview travel time/resource cost, commit march, visibly route/arrive, auto-start or manually confirm attack, fight genuine garrison, capture and persist ownership. Permit reinforce, garrison, defend, retreat, and supply/recovery in subsequent slices. Every step must have authoritative state and test evidence.
4. Battles should show moving soldiers, hit/contact VFX on moving units, tactical positioning, action feedback and damage; resolve exactly once via existing combat receipts. Keep simulated combat separate from view and avoid rewarding replay.
5. Phase integration: P5 = prototype actual commander+troop battle and one conquerable node using existing systems; P6 = scalable world march and full city conquest, pathfinding, multi-army logistics; P7–P9 = deeper army roles/art/animations/performance. Preserve same single HTML and Save migration.
6. Record both references independently under `docs/NL_REFERENCE_MATRIX.md`. Never copy Loạn Tam Quốc sprites/UI/graphics/code/sounds/screenshots. All artwork must be original or licensed with provenance.

## 3. Product identity and golden gameplay loop
Game title stays **Mưu Định Tam Quốc** (Ngọa Long-inspired; NOT VNG official).
Golden loop: **thành trì → sản xuất/thu hoạch → nâng cấp & khoa kỹ → chiêu mộ/luyện quân → chọn tướng, trang bị, trận hình → chiến đấu thật → thưởng một lần → hồi quân → phó bản/chiếm đất → trở về thành và lưu**.
The first release is *genuinely playable*, offline HTML desktop/Android-browser first. Every clickable control must change authoritative game state or navigate to functional content; avoid fake buttons, fake online PvP, placeholder titles, text-only simulacra, or invented QA PASS.
Preserve Save key `muu_dinh_tam_quoc_v1` and v1/v2/v3 migration, `p3TroopTier`, `p3PresetId`, P3 24 presets, P2 morale and exactly-once battle receipt; revisions require backward-compatible migration tests.

## 4. Roadmap — execute vertically, do NOT mark milestones DONE prematurely
### P5: Launch-worthy single-player vertical slice — FIRST priority
- Fix dead controls, UI overflow, broken save flows, invalid rewards; audit V0.6.
- Fully playable newcomer onboarding/tutorial and 30–45 minute campaign: 1 central city, real buildings and upgrade gates, at least 3 meaningful recruitment/build choices, 5+ consecutive encounters with boss, battle result + recovery, 24 preset selection, equipment usage and battle replay.
- Make save import/export, corrupted saves, migration, refresh, failed fights, exactly-once rewards deterministic and secure from inadvertent duplication.
- Deliver screenshots and native Chromium video of ACTUAL gameplay (not slideshow/mockup), clear desktop 1280×720 and mobile 390px QA.

### P6: Conquerable world & Three Kingdoms campaign
- Province/city/fortress/farm/mine/road nodes, fog of war, NPC garrisons, siege and garrison cycles; every map node has a concrete click action/locked reason. Chunked world instead of all-at-once massive DOM.
- Supply lines, logistics, casualties, march and terrain/weather, quests, bosses and recapture. A player must complete `scout → assault → capture → garrison → produce → defend → reload` with persistence and no resource duplication.
- Design extensible large-scale map and *eventual* multiplayer architecture without claiming real online opponents.

### P7: Epic generals and tactics
- Expand toward 30+ obtained/balanced generals with original/clear-license portraits, genuine unique battle effects, progression, relationships and meaningful recruitment.
- Branching infantry/spear/cavalry/archer/scholar/naval/siege/support troop lines. Preserve current 24 P3 presets and migrate their effects. Add hero synergy, ambush, feint, fire attack, morale break, decoy, counterattack, support heal, and field-command tactics **only as functional systems**.
- Aim toward 36 **original** stratagems after comprehensive tests. Avoid copying proprietary skill/formation names, formulas or illustrations verbatim.
- Craft/upgrade equipment with transparent sinks and no infinite resources. Balance weak/normal/strong scenarios and multiple seeds.

### P8: Kingdom-scale economy, AI politics & late game
- Buildings, tax, farms/mines/markets, research, populations, upkeep, long-run resource balance and capped offline gains. Real NPC factions with readable diplomacy/consequences and faction strategy turns.
- Fortress wars, elite bosses, campaign endings and repeatable PvE. PvP/guild/auction systems only when truly backed by an authorized server; otherwise mark future scope, do not counterfeit player interaction.
- Long-run economy and replay tests prove progress is achievable without softlocks/paywalls.

### P9: Professional art, animation, audio and release
- Original licensed/provenance-tracked isometric cities, world tiles, generals and tactical armies. Sprite-first **2D frame-by-frame, NO rig**. Real Idle/Walk/Attack/Hit/Fall directional clips, VFX with alpha/glow and impact following moving targets; no ugly rectangular halos.
- Full Vietnamese localization and optionally English, responsive desktop/mobile controls, accessible readability, sound settings and license-cleared audio. Target low-end Android performance; measure boot/render/memory/battle FPS and browser warnings.
- Ship single canonical offline artifact `index.html` from SUCCESS exact-SHA GitHub workflow; provide README/controls/changelog, screenshot, video, export/import. No public deployment without approval.

### P10: Optional "bá đạo" systems — after core quality gates
- **Long Hồn / Thiên Mệnh**: rare, counterable faction-wide tactics earned through campaign, never a raw unchecked x5 multiplier.
- **Danh Tướng Liên Kích**: hero bond combos with transparent prerequisite positions and morale cost.
- **Thiên Thời–Địa Lợi**: weather/season/terrain influencing ranged, cavalry, fire and naval lanes.
- **Binh Thư Đại Trận**: procedurally varied fortress defense/puzzles with deterministic seeds and replay.
- **Sử Thi Tam Quốc**: multi-path historical-inspired campaigns, alternate decisions, kingdom diplomacy and meaningful consequences.
- **Quân Đoàn Viễn Chinh**: multi-battle persistent logistics and recovery decisions.
Feature proposals require design contract, benefit vs cost, counterplay and measurable acceptance. Favor balanced depth and legibility over unbounded power creep.

## 5. Mandatory REV protocol, workflow and CI proof
**R** Research/authentic source/provenance; **E** one end-to-end vertical slice using one authoritative state, true cost/receipt, save & UI; **V** V0 syntax/static → V1 deterministic units, P2 31+12, P3 74+360 balance, P4/P4.1 regression → V2 real Chromium 1280×720 and 390px click/visual/reload → V3 GitHub Actions successful on exact current SHA with playable video/artifact → V4 user physical-device QA → V5 OWNER ART ACCEPTED. V4/V5 remain PENDING unless actual evidence.
- Retain `qa/smoke.py`, `qa/p2_full.py`, `qa/p2_advanced.py`, `qa/p3.py`, `qa/p3_balance.py`, `qa/p4_assets.py`, `qa/p4_art.py`, `qa/p41_animation.py`, `qa/p41_video.py` or explicitly document safe replacements.
- Build thin testable game systems; avoid manually tweaking large minified HTML without tests. Ensure index.html embedded assets match manifest hashes.
- Do not call deterministic scenario execution counts "win rates" or 12fps sampled rendered video a live realtime benchmark.
- Each milestone records a small `docs/NL_RELEASE_LOG.md` entry with exact source SHA, changed files, tests/Actions link, screenshots/video, observed bugs, next steps and owner gates. Never report background or future tasks as executed.
- End every delivery with **DONE / TESTED / PENDING / BLOCKED** and **2–3 next practical choices**.

## 6. Work order and stopping rules
1. First do audit + source matrix + P5 slice. Never implement P6–P10 before P5 critical loop passes or an explicitly isolated dependency justifies it.
2. Deliver bounded commits/PRs each with a playable build; do not rewrite/overhaul the whole game in one giant unreviewed patch.
3. If assets cannot be legally sourced or graphics cannot be produced, use an original legal temporary placeholder with accurate label, not copied VNG content.
4. If quality/permissions prevent implementation, mark BLOCKED with exact reason and provide verifiable next task. Never claim "whole game done" from documents or CI alone.
5. This instruction belongs *only* to NgoaLong-Codex; no cross-project agent delegation is authorized.
