# B3 — Binh chủng, trận pháp và kỹ năng (23/11/2026)

## SOURCE SCOPE: do not silently claim classic parity
- Ngọa Long WEB 2011 historic catalogue: **5 initial + 10 first-transfers + 40 second-transfers = 55**. Source: https://www.lequ.com/wly/201102/11807.html ; https://web.17173.com/content/2011-06-01/20110601093832311.shtml
- Classic WEB has **10 historical formations**; source https://www.lequ.com/wly/201105/14246.html and https://games.sina.com.cn/w/n/2011-08-30/0949526399.shtml .
- This original project currently maintains **25 project troop IDs (7 bases + 18 evolutions)** and **6 project formation families × 4 tactical variations = 24 presets**; these are NOT 55 official troop types or 10 original formations.
- All coefficients/skills not verified against period source remain `PROJECT_SIMULATED`. Current Mobile Wiki is not automatically a historical WEB source.

## B3 code (one native P2, no Cloud)
- Inject `tools/nl_classic_phase_b3.js` after legacy P2/R03/native A1, B2, Items, B1.
- Preserve immutable 25 troop reference IDs, actual R03 evolution and 24 p3PresetIds, with accessible Barracks catalog and current Formation modifier preview. No new Save fields/rolls.
- Read-only catalogue of exactly 221 descriptors: 14 original heroes + 207 project Hero207; present deployed general skills on Heroes screen.
- The existing 18 R03 branches preserve their implemented stat/crit/pierce/morale/skill/target abilities.
- Add strictly bounded **native p2Hit** single-pass cavalry defense for two branch identities `phalanx` (-20% incoming physical/tactic) and `spearwall` (-18% incoming physical/tactic). Only player team, campaign stages 1–24; no second hit, status, reward, morale writer or Save migration. This is a project simulated supplement, not an original VNG mechanic.
- Other proposed special mechanics such as redirect, second bolt and retaliatory hits are **PENDING**; cannot claim they run natively until tested and owner-approved. The B3 catalogue explicitly labels this.

## QA gates
- Static: 25 unique project IDs, 18 evolution branches, 24 Save-compatible formation presets, 221 distinct project skill descriptors; no Wiki numeric imports; no duplicate runtime solver.
- Browser: selecting a 25-troop catalogue card, switching all 24 presets, changing a branch and confirming one native damage multiplier, skill panel, Save-v5, no JS errors.
- Existing Combat/Save-v5, A3 economy, B2 11/11, 30/60 accelerated onboarding, 14+14 screenshots, exact-SHA Pages deployment.
- B3 adds coverage and confirmed bounded effects, **does not certify that all 25 proposed traits have native behavior** or fully reproduce classic WEB content.
