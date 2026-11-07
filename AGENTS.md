# AGENTS.md — Hẻoofgaia AI Engineering Contract

## OWNER OVERRIDE — HG37 ONE PLAYABLE RELEASE & BUGFIX FREEZE · 07/11/2026
- Current owner priority: **NO feature expansion.** Protect and merge Windows-local original Open Field V2 into the existing GitHub branch and **ONE** standalone \`Play-Heoofgaia-HG11.html\` release. Fix current UI/gameplay and harden tests.
- Codex must read \`docs/CODEX_EXECUTE_HG37_ONE_GAME_MERGE_FIX_20261107.md\` before changing code. It supersedes older HG28/HG33 roadmaps where they conflict with freeze.
- Known current RED CI #444 at \`4b612267\`: 1280×720 city rail clips 1/13 construction buttons after adding benefit brief; fix real layout, **never weaken QA**.
- **Windows-local files are not on remote GitHub:** safeguard \`E:\Heoofgaia\` local changes and Open Field V2 image bytes before pulling/merging; no destructive git reset/clean or user Save loss. Do not claim V2 integrated until source committed and CI browser screen verifies it.
- Single repo, single existing branch \`feature/hog1-research-to-playable-20261102\`, single root HTML, Save v07 exactly-once, normal 3×2 tower/boss ownership and genuine resource debits. Keep the latest exact HEAD CI green before announcing final playable release.


## OWNER OVERRIDE — HG33 TRUE HEX + ALL-ORIGINAL COMBAT ART · 06/11/2026
- Owner **explicitly delegated HG33 to Codex**: replace rectangular battle topology with **pointy-top odd-r true hex** and produce original sprites + five meaningful animations for 40 core troops, every inventoried Boss and 8 bonus soldiers. This supersedes contrary future-art/grid instructions in HG28 and the older Codex restriction **within HG33 scope only**.
- **Mandatory executable contract:** `docs/HG33_HEX_ORIGINAL_ART_MASTER_20261106.md`; **Codex start prompt:** `docs/CODEX_EXECUTE_HG33_20261106.md`. Read both completely before editing combat.
- Baseline verification: 06/11/2026 `faf17771f28bcdf34be759b97427bc64b1529948` / CI #383 SUCCESS 88/88. This is a *historical baseline*, never substitute for checking current remote HEAD.
- Do **not** confuse hex drawing with actual six-neighbor movement. Keep canonical **12×9** IDs and Save v07 compatibility initially; hex distance/path/AI must match the painted geometry. Original means **new editable sources and genuinely articulated action frames**, not internet-sourced legacy sprites, rigid still transforms, or invented asset coverage.
- Keep **one existing branch, one original repo, one playable HTML**, preserve 3×2 Boss/Tower authority, offline portability, and protected HG29–HG32 economy. Any code/art readiness is PARTIAL unless accepted by real Chromium, coverage audit and latest integrated CI.


**One game only:** Heroes of Gaia / Castle of Heroes / 英雄之城 (approx. 2009–2010). No import of gameplay systems from Call of Gods, Thánh Chiến, War of Legends or Đắc Kỷ.

## OWNER OVERRIDE — HG28 CODEX DELEGATION · 05/11/2026
- Owner explicitly **delegated HG28 graphics/UI/UX implementation to Codex**. This narrowly supersedes the older “direct ChatGPT only / no Codex” clause **for HG28**. Other scope remains unchanged.
- Mandatory handoff: `docs/HG28_CODEX_VISUAL_OVERHAUL_20261105.md`. Visual-first coding, not mockups; capture real Chromium before/after screenshots and iterate.
- Keep one repo, one existing branch `feature/hog1-research-to-playable-20261102`, one `Play-Heoofgaia-HG11.html`, preserve Save v07 and HG29–31.
- Prior HG31 source workflow green; newest checkpoint-only workflow #41948299888 failed at HG18.1 Tower climb button being disabled. Reproduce and fix for a clean full CI on new HEAD; never claim latest green from older SHA.


## OWNER CURRENT CONTRACT — 04/11/2026 (OVERRIDES CONTRADICTORY OLDER NOTES)
- **One repo, one branch, one HTML:** `vuanhtuan161094-byte/Heoofgaia`, `feature/hog1-research-to-playable-20261102` (also current default branch), `Play-Heoofgaia-HG11.html` (historical file suffix). See `docs/PROJECT_SINGLE_SOURCE_OF_TRUTH.md`. Old HG07/HG08/HG10 HTML files are not current release tracks.
- Repo has been verified as public; *private* in current gameplay requests denotes the private/offline PvE balance **not** a repository permission claim. Do not promise a public repo cannot be discovered.
- **Owner selected direct ChatGPT coding, not Codex.** Don't hand gameplay/art tasks to Codex without an explicit change of instruction. No duplicate game branches or merges to another project's main.
- **Gameplay lock:** Tower and real HG26.1 multi-hero Boss battles each allow max **3 heroes × 2 owner-bound stacks**. All three take part **simultaneously in ONE real Boss fight** (not round-robin). Apply each hero's stats, spells and equipment only to that hero's stacks. Tower is projection; real Boss runs cost real AP/troops and produce real casualties/rewards.
- Keep **Save v07** and authoritative exactly-once settlement. HG24 formations and HG26 auto-hunt are opt-in and may never mint armies/loot. One HTML offline distribution, integrated CI/Chromium green before release claim.
- Source Heroes of Gaia/Fandom is a reference, not a demand for pixel-identical HoG 2009. Private fantasy modes may be intentionally generous, provided sourced mechanics and custom variants are clearly distinguished.
- A separate sprite collaborator may be editing in this same branch: **re-fetch HEAD before any commit, use expected SHA, never overwrite concurrent work**. HG22.1 Skeleton is currently 5 actions/50 frames; 40 unit identities have distinct artwork but most do not have equivalent animation.
- This section takes priority over 2026-11-02 historical scope/visibility/Codex statements in the remainder of AGENTS.md.

## Owner intent
Deliver a complete, enjoyable, visually faithful reconstruction of the original game. Act decisively; research, code, QA, fix, commit, and push without repeatedly interrupting the owner for ordinary design choices. Never conflate simulation with source-verified behavior. Continue substantial progress in each execution session and keep a checkpoint for the next one. Do not claim background work will occur without an active tool/agent.

## Repository and machine isolation
- The intended standalone repository is `vuanhtuan161094-byte/Heoofgaia`, **private by default**. Do not claim it exists until verified on GitHub.
- Canonical local path Windows: `E:\Heoofgaia`. Do not write to C:\Users\Admin\Documents\Codex or the Tu Tiên Nhàn Rỗi repo except to read previous HG files when bootstrapping.
- If E: is absent, document a blocker. Do not silently use C: or request elevated privileges.
- Never force push or delete another project's data. Do not merge into the other project's main branch.

## First steps every session
1. `git status`, branch name, git remote and exact `HEAD` SHA; check Codex owns the working tree; read this contract + `docs/CURRENT_HG_CHECKPOINT.md` + `docs/ROADMAP-MASTER.md`.
2. Run `node qa-engine.cjs`; `python build_offline.py`; `python qa-browser.py` when available, and inspect actual screenshots.
3. Trace source-verified values to `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md`. Mark features OBSERVED, DERIVED, SIMULATED, MISSING or CONFLICT. Never fabricate original numbers.
4. Implement one testable vertical slice and run associated regression + browser tests; fix red tests before claiming completion.
5. Commit and push cleanly to the standalone repo; update `docs/CURRENT_HG_CHECKPOINT.md` with SHA, test run commands, PASS/FAIL/BLOCKED, screenshot paths and next task.

## Engineering principles
- Maintain canonical data catalogs for four races and 40 troop types. Isolate combat, economy, world, heroes, buildings, UI, and save authority. Replace older HG04–HG07 wrapper stack incrementally with tested modules, not a risky total rewrite.
- Game state mutation is authoritative; UI displays state and does not invent outcomes. Deterministic clock, queue and transaction receipts; no save duplication or negative resource counts.
- Source version/region is part of evidence; beta 2009 mechanics and late 2010 expansions may differ. Do not add rules just because another game has them.
- Continue with a local offline single-player build even while implementing optional network/server mode. No live credentials or server required for local play.
- Screenshot references may inform layout and animation; code and distributed assets must have attributable provenance and appropriate permissions. Privately supplied owned asset rights differ from other publishers' rights. Use independently made high-fidelity replacements when permission cannot be established. Never represent unlicensed historical assets as redistributable.
- Performance target: Windows 10, 8 GB RAM, Chrome/Edge; avoid large per-frame allocations, heavy CI and background build processes. Preserve portable HTML/offline path.

## Evidence-based QA and release gates
- **G0:** Node JS syntax, catalog schema, unit tests.
- **G1:** old-version save migrations, exact-once economy, training, movement and battle ledger.
- **G2:** real Chromium rendering at 1280×720 desktop and mobile landscape; actual screenshot capture with no JavaScript errors.
- **G3:** Python offline builder reproducibility and file existence. Test physical file:// Windows/Android only when physical machines are available.
- **G4:** source-to-build comparability, combat deterministic fixtures, data provenance audit and regression.
- **G5:** release packaging and user acceptance. Mark unavailable evidence BLOCKED, never PASS.

Feature progress != feature complete. No 1:1 claim without documented gameplay and visual parity. No automatic background tasks or delivery promises.
