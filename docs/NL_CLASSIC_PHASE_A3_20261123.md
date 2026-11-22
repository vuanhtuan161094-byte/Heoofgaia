# A3 — Classic WEB item economy and 30/60-minute accelerated QA

Source: project-original SIMULATED economy, not official VNG pricing.

- Canonical runtime projects all 411 playable gear shop prices to Bạc + Lương. 1 historic pricing unit of Sắt becomes 4 Bạc + 0.5 Lương (rounded up).
- Source `catalogue.json` and `rules.json` are kept unchanged. This is a runtime economic policy, not a data provenance rewrite.
- Shared Group04 engine quotes reinforcement with the same Bạc/Lương values shown in its UI. Refinement still consumes Bạc + Tinh khoáng; no Sắt.
- Old 19-gear shop uses the same project item ID quote. Existing UID, equipment stats and `game.iron` balances remain intact in Save v5.
- No automatic conversion/grant of legacy iron. No free bonus for old Save imports. Transaction ledger retains immutable receipt semantics.
- Chromium QA covers 411 prices, 392 reference rows, purchase, affordability, duplicate receipts, reinforcement, refinement, v5 state, 30/60 accelerated minutes across three formations.
- The old `qa/nl_onboarding_30min.py` no longer buys a random 1,800-Bạc fifth hero; after beating chapter 4 it attempts named Mã Siêu using the same rendered tavern rules, never a fake direct Save grant.
- Known scope boundary: other legacy uses of Sắt (non-equipment) remain for a later explicit economy migration; no silent item-data or Save rewrite.

## Stage 5/9/10 same-seed balance reconciliation (23 Nov 2026)
- Named Hoàng Trung recruit replaces the prior random fifth hero.
- 30-minute gate: power 1.15 wins; 1.3 remains winnable with sharply increased troop casualties; 1.9 loses. This retains meaningful difficulty and does not mislabel 1.3 a loss.
- All 3 profiles in 60-minute seed sweeps could win Stage 9 at 0.8 (1.0 loses) and Stage 10 at 0.7 (0.9 loses). Project-authored simulated native encounter powers have been set to 0.8/0.7 for those two stages. No VNG gameplay formula is claimed.
- Keep same-seed monotonic attrition QA; 30/60 onboarding now run as separately visible steps. Do not deploy Pages unless both pass.
