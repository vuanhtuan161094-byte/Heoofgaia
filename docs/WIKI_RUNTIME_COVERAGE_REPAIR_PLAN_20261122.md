# Mưu Định Tam Quốc — Wiki ↔ runtime gap and repair plan (2026-11-22)

**Scope:** `feature/nl-web-review-20261122`. This is an engineering audit and repair plan, **not** a declaration that all Wiki entries are implemented, nor acceptance of V1.0. No merge, no Codex Cloud, no Save v5 schema/key change.

## Version boundary

- **Primary gameplay reference:** the historical **Ngọa Long webgame** (the desired experience: city map → heroes/formation → staged NPC battle → reward, within discrete non-scrolling game windows). Historical screenshot reference: https://gamek.vn/game-online/cam-nhan-webgame-ngoa-long-sau-ngay-dau-ra-mat-20111201121826805.chn
- **Current data reference:** https://ngoalong.vnggames.com/ngoa-long-wiki (**Ngọa Long Mobile, not automatically identical to the classic browser game**). Specific pages:
  - Binh chủng https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung
  - Trang bị https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi
  - Phó bản https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map=1
  - Thống soái https://ngoalong.vnggames.com/ngoa-long-wiki/thong-soai
  - Quý tử https://ngoalong.vnggames.com/ngoa-long-wiki/quy-tu
- **Provenance** must distinguish `VERIFIED_CLASSIC`, `VERIFIED_MOBILE`, `DERIVED`, `SIMULATED`, and `UNKNOWN`. Project rules and original artwork remain distinct from VNG protected assets/code. Unknown Wiki values are not made up and labeled verified.

## Verified source and runtime census

These counts describe *different populations*. A reference row is **not** an executable gameplay record.

| Domain | Source/index evidence | Current runtime or contract | Unfinished engineering |
|---|---|---|---|
| Heroes | Wiki historical/mobile catalogues are source/reference; identities and skill stage data are not completely verified | `alpha_content.json`: 14 original plus 207 additional stage-gated, **SIMULATED** hero designs | Audit tactical skill effect percentages, acquisition, awakened skills, faction identity; each changed ability needs native combat+Save QA |
| Troops | 372 prior collected Wiki rows include repeats/variants/categories, **not 372 independent combat identities**; 44 exceptional numeric IDs not approved | 7 project base identities + 18 evolution branches; only selected native intents integrated, **0 verified Wiki identities playable** | Approve troop-ID crosswalks separately; port remaining proposed traits as native one-time effects; no double hit/morale |
| Campaign / NPC | `catalogue_source_index_v1.json`: **249 Wiki Mobile maps, 4,903 NPC details**, 170 maps with complete roster lists, 79 incomplete, 97 with unverified formation conditions | **8 chapters, 28 native project stages**; `approved_bindings_v1.json` currently maps=0, NPCs=0, units=0, **0 source map fully game-ready** | Approve batches of numeric NPC/troop/skill mappings; use clearly marked same-map `SIMULATED` replacements if owners permit; preserve old stages and reward receipts |
| City / economy | Mobile & Chinese systems not automatically transferable to classic | **7 legacy building routes + 31 additional project buildings**; one shared Save state | Verify individual production, build cost, unlock and which consuming module applies each effect once |
| Items/equipment | `item_groups_v1.json` declares **674 Wiki Mobile item references** | Project inventory/equipment catalogues and original `SIMULATED` effects exist; these are **not a 1:1 import** | Trace Wiki item identity and acquisition; QA enhancement, consumption, reward receipts, Save reload, mobile UI |
| Effects/skills | Wiki describes additional skills, skill stages, troop/passive and morale mechanisms | **13 original project effect definitions**, legacy combat statuses and partial native V2 rules | Add supported effect semantics to the single native resolver without creating an extra event or reward owner |
| Research/advanced | Wiki has Elite Commanders, Quý Tử and Chinese-server-only advanced mechanics | **8 project research lines** | Treat edition-specific late game as deferred unless explicitly approved; do not claim parity |
| Art/UI | Classic 2011 city/building, map, roster, battle and inventory references | Fixed-window UI V2 on review branch; 14 screen x 2 viewports QA; original sprites remain partly incomplete | Prioritize actual city map as landing page, compare gameplay screenshots, verify all subwindows and input controls; do not copy VNG art |

### Exact automated evidence
Run `python qa/nl_wiki_runtime_gap.py --out qa/wiki-runtime-gap.json` after checking out this branch. The Web Review workflow saves the generated JSON and screenshot evidence at the exact workflow SHA. The gate verifies Save v5 and immutable project roster/encounter relationships; it does **not** grant VERIFIED provenance to previously unverified rows.

## Release-oriented repair sequence

1. **P0 usability:** fix first-screen City map, ensure every function/subwindow fits 1280×720 and 390×844 without page scroll, and **prove buttons and selections work**, not merely that screenshots are nonblank.
2. **P0 core correctness:** native Combat P2 remains the single authority for HP, morale, rewards and replay. Run Stage 5 seeded onboarding and 28-stage Boss/formation regressions; fix deterministic balance without changing expected values to conceal defects.
3. **P0 source linkage:** approve the troop and NPC IDs before importing any Wiki map as executable. A project-only cloned NPC must be tagged `SIMULATED`, never `VERIFIED_MOBILE`.
4. **P1 breadth:** real skills/hero effects, building consumers, crafting/reinforcement and source-linked campaign rewards. Ship in testable batches, each with in-game UI and Save v5 QA.
5. **P1 visual fidelity:** side-by-side screenshot review with historic Ngọa Long references for City, Formation, Campaign, Heroes, Battle, Equipment; original 2D artwork, no code/asset copying.
6. **P2 advanced Mobile-only systems:** Quý Tử, commander specializations, China-only research require edition-specific design review; defer rather than pretending full parity.

## QA status discipline

- A passing 28-screenshot UI test proves **only visual navigation/no document overflow/no page error on tested screens**.
- Passing canonical gameplay tests proves gameplay **before UI overlay**. Critical controls must also be exercised in the V2 overlay browser.
- The original `ngoalong-qa.yml` full release gate (including 30/60-minute onboarding) remains independent. Passing the Web Review workflow alone does **not** mean full V1.0 release PASS.
- GitHub Pages publishing requires repository **Settings → Pages → Build and deployment → Source: GitHub Actions**; do not assert a live Pages link until a deployment returns a verified URL.
- Original 14+207 heroes and 28 playable stages are project gameplay, not proof that the Mobile Wiki has been fully implemented.
