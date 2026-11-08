# HG40 — Tactical Combat V3 · Implementation contract · 2026-11-08

Baseline: HG39 at d869b1d9066e5243340bca8aaf256e5736b2e93f; same branch feature/hog1-research-to-playable-20261102; sole playable Play-Heoofgaia-HG11.html; state.version = 7.

## Locked design choices

- 40 original unit IDs with original HP/ATK/DEF/SPD, one deterministic auto-activated trait per unit. Exact percentages, cooldowns and names are the immutable HG40_TRAITS data in hg40-tactical.js. No manual skill button or random proc.
- Role mechanics: C attacks X, X attacks H, H attacks T = +12%; T receives 10% less from C. New outgoing HG40 bonuses cap at +65%; mitigation including existing equipment and guard cannot exceed 65%; one splash target per hit, max 45% of primary actual HP loss.
- Shields store HP absorption, not soldiers; maximum 25% of living stack HP. Healing is capped at current living soldier capacity, never resurrects. DoT runs on two subsequent resolved turns only, not the placement turn, and cannot trigger another attack or skill.
- Each stack has one action per tactical turn; manual focus is authoritative, then sticky target preference. Skill cooldown uses battle.turn, not world speed x1/x60. Draw all skill status from authentic battle.hg40 state.
- Boss classification: privateBoss, eliteTier >= 11, or every tenth Tower floor. Hard stun/root becomes a soft outgoing-damage reduction or movement slow. No chain stun locks.
- HG40 enemy multipliers HP/ATK/DEF: NPC 1–3 [1,1,1]; 4–6 [1.20,1.10,1.05]; 7–10 [1.40,1.18,1.10]; T11–12 [1.60,1.25,1.15]; private T13 [1.30,1.15,1.10] on top of existing private Boss boost exactly once; existing AI garrisons [1,1,1].
- Tower floor multipliers: 1–10 [1,1,1]; 11–25 [1.15,1.07,1.05]; 26–50 [1.25,1.12,1.08]; 51+ [1.35,1.18,1.12]. Existing 5 rewarded wins/day preserved.

## Shared authority and save safety

- engine.js remains the single core battleActCore; direct, secondary and DoT casualties go through one applyBattleDamage function; HG21 Tower and HG26.1 Boss invoke the same core. No custom reward path or free troops.
- A battle created after HG40 deployment gets optional battle.hg40 v1. A v07 Save already midbattle without this object continues exact HG39 tactical rules; no retroactive enemy stats or status. New-battle modifier application is idempotent.
- Battle.hg40 contains only temporary skill cooldown/hit counters, statuses, shields, turn receipts and debug notes. It is destroyed together with battle on win/loss/timeout. Permanent soldiers and materials remain canonical v07 state.
- Never modify 40 base unit stats, change a user's saved real garrison or change 3 commanders × 2 combat slots for Boss/Tower. Ordinary march can still use existing 7 formation slots.
- The offline artifact must rebuild deterministically twice, be file:// playable and remain the only root HTML release. GitHub Actions must PASS on the precise code HEAD with existing regression coverage.

## Exact 40 traits from the machine-readable source

Human: human_1 Giữ hàng; 2 Dò điểm yếu; 3 Tập trung bắn; 4 Giáp nặng; 5 Bổ nhào; 6 Tịnh tâm; 7 Xung phong; 8 Thánh thuẫn; 9 Phán quyết; 10 Thiên thuẫn.
Elf: elf_1 Đột kích; 2 Thoắt ẩn; 3 Kiên cố; 4 Tiễn ràng buộc; 5 Bứt tốc; 6 Rễ trói; 7 Thanh tẩy; 8 Song tiễn; 9 Long tức; 10 Hộ rừng.
Orc: orc_1 Cuồng nộ; 2 Săn đuổi; 3 Phá giáp; 4 Cắn xé; 5 Đập choáng; 6 Tập kích; 7 Sét lan; 8 Đá chấn; 9 Áp đảo; 10 Xé phòng ngự.
Undead: undead_1 Xương cứng; 2 Mờ ảo; 3 Ôn dịch; 4 Xuyên ảnh; 5 Huyết thực; 6 Nguyền khí; 7 Hắc xung; 8 Vua nguyền; 9 Hơi thở mục; 10 Hồn tiêu.

## Acceptance checklist

1. G0: One branch, one HTML, deterministic rebuild twice, v07 migration and baseline regression.
2. G1: 40/40 traits registered and executed in the shared battle core; mandatory separate 40-trait smoke and targeted status tests.
3. G2: Real damage receipts, cooldown, stun immunity, shield, healing, 2 DoT ticks and casualty ledger. No overkill receipts or phantom armies.
4. G3: T1/T4/T7/T10 organic simulation by faction; Boss power increases without breaking no-cheat New Game.
5. G4: Tower and Boss 3×2 owner-controlled bonuses, isolated Tower casualties, single-win rewards.
6. G5: Desktop 1280×720, compact landscape 960×540, mobile portraits, battle HUD, accessibility and no canvas reset.
7. G6: Full CI PASS on final SHA, real device playtest separately labelled PENDING.

Design values are original game balancing proposals, not claims about the original Heroes of Gaia client/server. Full long-term game balance must be verified with live playtime; automated CI success is not a guarantee of bug-free game.
## HG40.1 focused repair notes (implementation)

- Shield receipts expire after two subsequent combat turns, with a live-soldier HP cap; combat effects cannot create permanent shields.
- Stun, root, slow and dash activate only from the subsequent turn, preventing low-SPD units losing a placement-round action plus another action next turn.
- Combined defense reduction and penetration share 25% (ordinary) / 15% (Boss) cap rather than multiplying beyond design.
- Save version 7 and old midcombat battle behavior are unchanged; no new persisted top-level keys.
- The targeted tests are independent from 400 broad synthetic scenarios and assert expiry, owner isolation, stun timing, splash receipts and localized combat statuses.
