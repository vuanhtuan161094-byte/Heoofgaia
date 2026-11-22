# Mưu Định Tam Quốc — Giai đoạn A: classic WEB core economy & recruiting

**Implementation date:** 22/11/2026. **Scope:** branch `feature/nl-web-review-20261122`, one generated `index.html`, no merge, no Codex Cloud. This is Phase A V1, **not full classic parity**.

## Findings & changes

| Feature | Previously | After Phase A V1 | Provenance |
|---|---|---|---|
| HUD | Đồng / Lương / Gỗ / Sắt / Uy danh / Ngọc | Bạc / Lương / Uy danh / Chiến công / Quân lệnh | Legacy 2011/2012 naming verified; quantities SIMULATED |
| Save | `muu_dinh_tam_quoc_v1`, v5 with CL resource fields | Same Save key/schema; `game.nlClassicA` additive state, iron/wood/gems **preserved**, not converted or deleted | PROJECT runtime |
| Recruit (14 originals) | Weighted random 1,800 silver button | Explicit 3 channels: unlocked campaign, renown thresholds, tavern talks; deterministic named targets, no random draw | Channel concepts VERIFIED in historical web + Mobile sources; exact gates and prices SIMULATED |
| Recruit (207 supplementals) | Separate live stage-gated adapter | Existing 207 adapter left unmodified (separate 28-stage/Save v5 ownership) | SIMULATED project hero data |
| Taxes | No direct classic town hall tax ledger | 12 daily grants, silver+renown, exact tax receipt, no duplicate ID | Historic web 2012 12 free tax actions reported; gains SIMULATED |
| Research | Old silver/iron/prestige cost | Silver + simulated merit, rebound after R03 catalog; existing combat bonus consumer preserved | SIMULATED costs and modifiers |
| Quân lệnh | Not represented as classic currency | Additive 60-cap order pool, 1 per campaign/tower/arena launch, +1 each 30 minutes; NO order on invalid launch/replay | SIMULATED cap/regeneration (not official) |
| Campaign | Native P2 reward/replay owner | Native first-clear result gives separate once-only project merit receipt; no new damage engine and no extra loot | SIMULATED project balancing |

## Sources (edition specific)
- Ngọa Long **WEB 2012** community handbook covering Hội đàm, Uy danh, 12 tax uses, chiến công: https://f.gvn.co/threads/ngoa-long-bach-khoa-toan-thu-tat-tan-tat-ve-ngoa-long.917851/
- Historic original web VNG advice identifying Bạc, Chiến công, Uy danh, Quân lệnh: https://ngoalong.zing.vn/tin-tuc/huong-dan/thu-thach-con-duong-len-140-doi-voi-nuoc-ngo-vip-thap.html
- **Mobile 2015** 3-route recruitment confirmation (not proof of parity with WEB): https://gamek.vn/game-online/thong-linh-ngoa-long-mobile-voi-he-thong-vo-tuong-20150827164808156.chn
- **Current Mobile Wiki** reference only: https://ngoalong.vnggames.com/ngoa-long-wiki

## Runtime ownership and compatibility invariants
- Preserve `muu_dinh_tam_quoc_v1` and schema 5; no deletion/conversion of `game.wood`, `game.iron`, `game.gems` because old construction, CL side systems and inventory still consume them. HUD policy is UI only; **further economy normalization is pending**.
- Existing original 14 hero identifiers are never changed. Every recruit checks explicit unlock conditions, money, duplicate ownership and dialogue daily limit before a single debit/grant/receipt. The original `freeRecruit` grant is mapped to a deterministic Zhao Yun tutorial voucher; no random draw.
- Existing 207 staged recruits remain under `nlHero207Recruit`/CHAT08; do not duplicate or auto-award them in the new path.
- `finishBattle` remains the only HP/grain/loot/clear authority; `nlClassicA` only records **new** first-clear merit once per stage; no retroactive grants for already cleared stages and no replay grants.
- Taxes grant silver and prestige once per click with a day+ordinal unique receipt; 12/day. Local time can be changed by device owner: **offline client cannot prevent all clock manipulation**, and this must not be described as server-secure economy.
- New Quân lệnh applies to the core `beginBattle` wrapper, never outside P2; Save tests must confirm no charge on invalid attempt and no double charge.

## Follow-up debts (not hidden)
- Convert legacy city / item costs that still demand `iron` and `wood` to edition-appropriate economics through **per-consumer** migrations; do **not** delete legacy balances abruptly.
- Complete detailed town-hall/patrol/population/happiness effect consumers, trade market, and production ceilings; current 12-tax simulation is first playable slice only.
- Make historical named generals unlock mapping evidence-driven, faction-aware and better matched to the actual 28 NPC identities; current 14-hero gates are **SIMULATED**, not canonical Ngọa Long.
- Fix 207 supplemental recruitment consistency with the 3-channel model while preserving current Save/receipt behavior; no blanket remap of 207 source IDs.
- UI should move tax/hero recruit to first accessible window and keep 3x3/5 officers unchanged.
- Full 30/60-minute, long-run multi-seed economy validation + owner mobile approval remain distinct release gates.

## QA gates
- Node syntax for classic module, canonical source build and check, Save v5.
- New Chromium `qa/nl_classic_phase_a_browser.py`: desktop/mobile names, 3 channels, tax cap, spend once, Save/reload, old inventory retained, technology merit.
- Existing `qa/nl_native_pve_a1_browser.py`, `qa/nl_premerge_hero207_items.py`, `qa/nl_item_integration.py`, and 28 screenshot gate are **not disabled**.
- GitHub Actions exact SHA PASS required prior to Pages update; failing run means **NOT READY**.
