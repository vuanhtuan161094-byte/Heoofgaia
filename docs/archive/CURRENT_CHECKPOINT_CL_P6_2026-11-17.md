# CURRENT OWNER DIRECTION — 17/11/2026: NGỌA LONG FIRST
- **Latest owner decision overrides all CL/hybrid language below:** make an original game inspired primarily by **Ngọa Long**, focused on 3×3/5-hero formation, 24 presets, morale, skill tactics, troop progression, city growth and stage-based turn battles. Source of truth: `docs/NGOA_LONG_REBUILD_SPEC_V1.md`.
- The previous CL-P6 release is historical technical baseline, not the target gameplay. Safe baseline Git SHA `172c0ef2192cf5aee8a0054337b1af9f5684f533`, Actions `43999433891` SUCCESS.
- **NL-REBUILD-01:** source `tools/build_ngoa_long_mode.py` assembles the **Quân Cơ Phủ** dashboard into the *single canonical* offline `index.html` as a deterministic GitHub Actions build step, before Chromium regression and artifact publication. Focused QA `qa/ngoa_long_mode.py` tests the 3×3 display, actual navigation/battle and 1280/390 viewports.
- A successful source-file commit does **not** mean completed Ngọa Long remake. Need exact-SHA CI SUCCESS on newest build, manual owner gameplay/art approval, physical-device validation and further NL-R02..R05.
- Save schema v5 and existing CL content remain intact during transition; no Hero operations/merge/force push.

---

# CURRENT PRODUCT DIRECTION OVERRIDE — 17/11/2026
- Owner withdrew Ngọa Long-first feature plan and selected **Chiến Loạn Tam Quốc (2025)** as gameplay reference. Keep game brand **Mưu Định Tam Quốc** as an original implementation; original screenshots/assets cannot be copied.
- Product requirements and acceptance are in [CHIEN_LOAN_MASTER_SPEC.md](CHIEN_LOAN_MASTER_SPEC.md) and [CLTQ_REFERENCE_MATRIX.md](CLTQ_REFERENCE_MATRIX.md). Agent Codex authorization remains scoped to `main-ngoalong`; Hero isolation unchanged.
- Older P2/P3/P4.1 results below are **legacy-system baselines**. CL gates are separately recorded in this current section and the CL reference matrix.
- CL-P0–P6 are implemented and released. CL-P6 exact-source-SHA GitHub Actions passed and produced the playable/evidence artifacts.
- Current owner acceptance for new CL gameplay: **PENDING**; retain exact-SHA CI and device/visual gates.

## CL-P6 release — 2026-11-17

- Current remote game-code release: CL-P6 commit `71cf5a6ae35a35f0e470e2f160c2b409557c1224` passed full GitHub Actions exact-SHA run [43934332430](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43934332430); published `muu-dinh-tam-quoc-cl-p6-playable` and `muu-dinh-tam-quoc-cl-qa-evidence`. CL-P5 at `54c1b8591de76ac83f38ee0330f7343e4f4917cc` and prior milestones remain in Actions history.
- CL-P6 working tree adds deterministic NPC diplomacy, season/weather movement and battle modifiers, an independent second army, siege engines, Lạc Thành's Cửu Đỉnh and a persistent repeatable PvE tier ladder. Enemy scaling caps at +180%; a paid once-per-battle super command is recorded as a battle event and replay snapshot.
- Focused local evidence: `python qa/cl_p6.py` **30/30** in Chromium at 1280×720 and 390×844, including simultaneous marches, actual second-army siege, one-time capture/casualty receipts, paid wonder construction, PvE victory/reward and loss/tier persistence, skill cost/effect/replay state, and reload. `python work/check_inline_syntax.py` and `python qa/smoke.py` **7/7** pass. Full exact-SHA Actions passed; its workflow also passed legacy CL regressions, asset rebuild, sprite animation checks, and real Chromium video capture.
- The Save key and schema v5 are preserved; P6 persists under `cltq.p6` and loads existing v1–v5 saves with defaults. Reference rules and balance values are documented as simulated offline systems in `P6_SYSTEMS_DESIGN.md`.
- Remaining gates: physical Windows/Android play, owner's visual and balance acceptance, action clips for the remaining troop classes, wiring the new infantry walk loop to live map marches, new licensed audio, and video generation. Existing P4.1 Chromium-rendered video is not a replacement for those gaps.

## CL-P5 original infantry animation slice — 2026-11-17

- The original `cl-p5-infantry-scout-v1` has a transparent master and five directional 4×4 action sheets: idle, walk, attack, hurt and death. The reproducible lossless atlas contains 80 frames at 100×144 and is embedded offline in `index.html`; the exact source sheets, prompt log, contact sheet and manifest are retained under `assets/p5/cl-p5-infantry-scout-v1/`.
- Live battle now draws infantry idle, attack, hurt and death frames from the CL-P5 atlas. Actual attack/hit events drive attack and flinch; a damage event that reduces an infantry unit to 0 HP starts the fall clip. Other troop classes continue to use the byte-preserved P4.1 atlas. Walk frames are packed and tested but the world-map march token still uses its existing marker.
- Local gates: atlas rebuild and byte comparison; `python qa/cl_p5_infantry.py` **48/48** in Chromium at 1280×720 and 390×844; `python work/check_inline_syntax.py` PASS. Browser screenshots include the live battle and fallen infantry. This is a one-unit visual slice, not full P5 acceptance.
- The new source SHA and exact-SHA Actions result are pending until the animation slice is committed and pushed; no release artifact is claimed for this change before the exact-SHA run passes.
- Remaining P5 gates: all other troop-class action clips, live march walk animation, skill/city/hero prop art, owner visual review, physical Windows/Android play and performance, licensed new audio, and video generation.

## CL-P6 exact-SHA result

- Verified branch game-code SHA: `71cf5a6ae35a35f0e470e2f160c2b409557c1224`; complete workflow [43934332430](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43934332430) returned **SUCCESS** on that exact SHA. Playable artifact: `muu-dinh-tam-quoc-cl-p6-playable`; evidence artifact: `muu-dinh-tam-quoc-cl-qa-evidence`.

## CL-P3 release / pre-P4-CI snapshot — 2026-11-17

- Latest remote P3 SHA: `7a43cc650d77bbceef800994e6491d5694f2a8ec`. GitHub Actions run [43915734348](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43915734348) completed **SUCCESS** on that exact SHA. Published artifact: `muu-dinh-tam-quoc-cl-p3-playable`; Actions evidence artifact: `muu-dinh-tam-quoc-cl-qa-evidence`.
- CL-P4 local code adds 25 recruitable generals to the existing 24 (49 total), seven alignments, 25 individual tactical skills, actual +6% faction synergy at three same-faction commanders, 5v5 named NPC squads, five chapters/15 encounters, terrain labels, sequential unlocks, first-clear rewards and loss/retry handling. Enemy scaling is measured across 360 seeded actual-engine battles; beginner/mid/veteran profiles have non-increasing win bands and the final stage has a 25% aggregate win rate.
- CL-P4 portrait art adds 22 new generated historical portraits to eight existing illustrated portraits. The extra fantasy-alignment heroes retain original project icons. Three packed WebPs and their PNG sources are in `assets/p4/`; `tools/build_cl_p4_roster.py` embeds reproducibly from those files and manifest hashes.
- At this historical P4 checkpoint, P4 exact-SHA Actions and artifact had not yet completed; the later P4 exact-SHA release is recorded below.
- P4 Chromium screenshots: `qa/cl-p4-roster-desktop.png`, `qa/cl-p4-campaign-desktop.png`, `qa/cl-p4-battle-desktop.png`, `qa/cl-p4-boss-battle.png`, `qa/cl-p4-campaign-mobile-390x844.png`.
- Exact SHA for P4 will be entered after its commit and reported only after that exact-SHA workflow succeeds. Physical Windows/Android, owner balance review, and owner visual approval remain pending.

## CL-P4 exact-SHA release and CL-P5 local visual slice — 2026-11-17

- CL-P4 commit `243a0d382957abc04bfc5d0a82616824143e9137` passed the full exact-SHA GitHub Actions run [43923305781](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43923305781). It published `muu-dinh-tam-quoc-cl-p4-playable` and `muu-dinh-tam-quoc-cl-qa-evidence`. All 23 CL-P4 Chromium checks, 360 seeded campaign battles, legacy P2/P3 gates, art checks and P4.1 video/animation checks passed.
- CL-P5 adds an original generated 1536×1024 region painting as a single scenic background. Its 2.74 MB RGB PNG is preserved; the 286,152-byte WebP is embedded offline and registered in `assets/p5/cl-p5-region-map-manifest.json`. The 10 province controls, 18 roads, click selection and paid route preview remain live over the image.
- Local CL-P5 results: source/packed/embedded-byte gate **4/4**; actual Chromium visual and click checks **9/9**, desktop 1280×720 and mobile 390×844, no JS exceptions. Screenshots: `qa/cl-p5-map-desktop.png`, `qa/cl-p5-map-mobile-390x844.png`.
- Local image inspection: RGB, 1536×1024, no alpha; packed WebP 286,152 bytes. Browser payload remains under 350 KB. The scene is not a layered map. No video-generation route is available; existing sprite-first P4.1 frames and real Chromium video capture remain the evidence. Full CL-specific walk/hurt/death frame sets and new licensed audio are not complete.
- At this historical P5 design checkpoint, P5 exact-SHA Actions and artifact were still pending; the later P5 exact-SHA release is recorded in the current section above. Physical Windows/Android review and owner visual approval remain pending.

## CL-P0/P1/P2 release and CL-P3 implementation checkpoint — 2026-11-16

- Base read from `main-ngoalong`: `39111d435f0aa6d059240dc36a81fc9be9d46225`. P1/P2 release SHA `934775fc020f48d2a84894ce921f50a945d8e9de` passed exact-SHA Actions run 43909024419; the later P3 release SHA/run are recorded in the section above.
- P1/P2 source commit: `934775fc020f48d2a84894ce921f50a945d8e9de`; exact-SHA Actions run [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419) **SUCCESS**; playable artifact `muu-dinh-tam-quoc-cl-p1-p2-playable` and CI evidence were published.
- P1/P2 provides five independent commanders, troop-count-linked battle units/damage, casualty and recovery receipts, the 10-node map, route/ETA/food, marching, NPC siege, capture, harvest-once, garrison, defense, pause/reload/retreat/retry.
- Local CL-P3 adds schema v5 migration, nine city upgrades, lumberyard/wood, connected province production, garrison grain upkeep, supply shortage/recovery, wall defense, offline cap and economy receipts. It preserves the canonical offline `index.html`, old save key, legacy 3×3 formation, combat/replay pipeline and original art. No changes to Hero, merge or force-push.
- P3 local Chromium at that checkpoint: `qa/cl_p3_economy.py` 31/31; P1/P2 43/43; P2 31/31 + 12/12; legacy P3 74/74 + balance; P4 source 4/4 + visual 14/14; P4.1 animation 18/18; smoke 7/7. Exact-SHA P3 Actions and playable artifact passed later at SHA `7a43cc650d77bbceef800994e6491d5694f2a8ec`, run 43915734348.
- The 30-minute economy QA advances 30 one-minute transactions by test clock; it does not replace a real human 30–45-minute play session. Mobile Chromium was tested at 390×844; physical Windows/Android review and owner visual acceptance remain pending.
- Remaining roadmap as of that historical checkpoint: CL-P4 character roster and chapter balance; CL-P5 visuals/device QA; CL-P6 diplomacy, seasons/weather, siege machines, multiple armies and PvE endgame. No server PvP is claimed. See the current checkpoint and `CLTQ_GAP_AUDIT.md` for updated status.

---

# Mưu Định Tam Quốc — checkpoint P3 ngày 16/11/2026

- GitHub: `vuanhtuan161094-byte/Heoofgaia`, nhánh canonical **main-ngoalong**, game `index.html` V0.4 P3.
- Baseline P2 HEAD: `50fe6a62bae2a2c8699ca927f96aaccdebea610f`; nhánh Hero HEAD trước khi làm P3: `54e6c2391cd11e7351466b9497141fc57c59a71d`.
- Đã mã hóa: P3 AI chọn mục tiêu, ma trận khắc chế, nâng cấp quân 1–4 tốn tài nguyên thực, 24 đội hình bố trí/tactic, smoothing độ khó ải 13–20.
- **Local QA**: P2 31/31, P2 advanced 12/12, P3 74/74, P3 deterministic balance 360/360 kịch bản thực thi và các điều kiện monotonic/ải 16/ải 24 PASS.
- **GitHub CI exact SHA**: SUCCESS tại mã nguồn P3 commit `3db3976b91de9863491528dc571206c4cdd0d9b4`, run `43825429382`, bao gồm 7+31+12+74 bài QA, 360 trận kịch bản, và artifact Chromium. Link: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43825429382. Bất kỳ commit tiếp theo cũng cần CI PASS trên SHA mới.
- Windows/Android vật lý, file:// thực tế và owner mỹ thuật: **PENDING**. Chưa đưa game thành online multiplayer.
- QA phải xác nhận game Hero HEAD không đổi và nhánh Ngọa Long không chứa code Hero cũ.

NEXT at that historical checkpoint: GitHub Actions exact-SHA and review; the current work has since released CL-P4 and started the P5 visuals slice.

## P4 artwork integration — 16/11/2026
- Baseline P3 HEAD: `54a05e7ad2c700241fbc751e74cc19e53a9014ab`; branch: main-ngoalong; Hero branch tuyệt đối không ghi.
- Canonical game: index.html V0.5 P4, giữ Save v3 và P3 AI, formation, economy, replay.
- P4 source code SHA256: `53f5c9482d95313ff544a2129bd522de9920be0e019639c2b8098b196fdc3daf`.
- Asset source SHA và WebP derivative: xem docs/P4_ASSET_PROVENANCE.md.
- Local PASS: 7 smoke + 31 P2 + 12 P2 advanced + 74 P3 + 14 P4 visual + 360 balance scenarios.
- CI exact-SHA: PENDING trước khi GitHub Actions trở lại thành công trên commit P4. Tải playable ONLY khi run SUCCESS.
- Known quality debt: portrait sheet mới có 8/24 hero, sprite Idle/Attack chỉ là trạng thái tĩnh được nội suy chứ không phải hoàn chỉnh full frame-by-frame animation; VFX sheet còn bleed vùng ảnh, chưa đẹp như game gốc. Owner visual PENDING; thiết bị thật PENDING.
- P4 QA screenshots là Chromium runtime thật; không phải mockup của image generator.

## P4 embedded-asset exact-source gate
- Từng WebP derivative của City / 8 Portraits / 4 Troops / Skill VFX được commit tại `assets/p4/` và dùng cùng binary trong HTML offline.
- CI chạy `qa/p4_assets.py` để so sánh bốn SHA256. Mỗi lần thay artwork cần tái nhúng HTML và cập nhật asset file; không thay một phía.
- Những PNG master ImageGen đầy đủ nằm trong P4 backup ZIP, chưa nằm trên GitHub; không nhận là đã có lịch sử gốc trong repo.
- CI exact SHA cho commit này: PENDING đến khi Actions hoàn tất.

## P4.1 sprite animation / VFX production — 16/11/2026
- P4 base Git SHA `769cbf9e088f8e5d861253bc8e66abce5c1eae86`, target commit P4.1 theo HEAD mới của `main-ngoalong`.
- 288 exported sprite PNG frames, 4 unit classes × 4 direction × 3 actions × 6 frames, packed 800×5184 WebP. Generator deterministic `tools/build_p41_atlas.py`; source atlas SHA256 `ac77ab05bf120d253b8812dca0821b52d8b427d6a1d5b363519c55eb99f8b79f`.
- P4.1 HTML canonical retains P2/P3 mechanics and Save v3. Source is original project AI-generated pose master plus authored 2D compositing; not rig/independently hand-drawn.
- Local CHECKED: 18/18 P4.1, 7/7 smoke, 31/31 P2 full, 12/12 P2 advanced, 74/74 P3, 14/14 P4, 4/4 P4 asset, 360 P3 balance scenario executions.
- Local Chromium video: `qa/p41-combat-1280x720.mp4`, 52 actual rendered viewport frames at 12fps; visual time deliberately sampled from four real combat events (including a skill), not a full-speed live FPS recording.
- GitHub exact-SHA: CHECK action `NgoaLong P4.1 complete QA` on final commit, don't accept previous SHA; playable artifact only if full PASS. Owner visual + physical Windows/Android still PENDING.
