# HG91 — itch.io release readiness · 14/11/2026

## Authority and boundaries

- Source: `vuanhtuan161094-byte/Heoofgaia`, branch `feature/hog1-research-to-playable-20261102`. One game; no Codex, no merge, no public push to itch.io.
- Canonical engine build: `Play-Heoofgaia-HG11.html`, `Save v07`. ZIP packaging copies the **same bytes** to a single root `index.html` during CI only. It does not add a second playable game to the repository.
- Supported UI language selector: Vietnamese (primary), English, Simplified Chinese, Japanese, Korean, Thai. `hg56-ui.js` contains 77 reviewed core-interface labels per language; full story, technical skill text, dynamic logs and endgame descriptions **are not fully translated**. Gameplay text falls back to Vietnamese, not fabricated machine translations.
- Preference storage: `heoofgaia_hg91_ui_locale` and `heoofgaia_hg91_click_sound` outside Save v07. No impact on combat RNG, economy, hero data or Save checksum.

## A — Restricted/private beta gates

- [x] Deterministic itch.io HTML5 ZIP build design: one `index.html`, offline embedded assets only, CI verifies SHA and size.
- [x] Chrome local-HTTP emulation test designed for reload, six locales and Save v07.
- [ ] Focused HG91 Chromium staging SUCCESS on exact code SHA (verify Actions).
- [ ] Integrated monolithic QA SUCCESS on same SHA. Latest previous failure: HG39 test's legacy 12-soldier assumptions and a drawer already open.
- [ ] Third-party asset provenance and redistributable use cleared, including game-icons.net CC BY attribution and MIT notice copies.
- [ ] Check live itch.io sandbox/origin, JSON export/download and Save reload. Local-HTTP test does **not** prove live itch.io.
- [ ] Owner preview with restricted visibility and physical Windows/Android testing.
- [ ] Owner expressly approves public release; **never auto-public**.

## B — Early Access storefront / onboarding

- [x] Six-language settings entry, five-step in-game newcomer guide, backup warning for itch.io origin separation and opt-in, original synthesized button SFX.
- [x] English/Vietnamese store-description draft: `HG91_ITCH_STORE_COPY.md`.
- [ ] Get authentic Chromium cover/screenshot selections and owner approval; do not replace real UI screenshots with illustrations.
- [ ] Optional original menu music/SFX (rights verified, default mute and accessible control).
- [ ] Run at least five new-player sessions with no developer fixture injection; diagnose any user-blocking softlocks.
- [ ] Confirm input, fullscreen, touch and persistent storage in actual itch.io page.

## C — v1.0 exit criteria (NOT COMPLETE)

- [ ] Localize 100% of menus, tooltip prose, onboarding, skills, quests, item descriptions, reports and accessibility labels in any language claimed as fully supported. Add per-locale coverage gate based on enumerated source strings.
- [ ] Full endgame playthrough, tower replay reward integrity, 3-hero single-Boss ownership, unique hero retirement and city transfers.
- [ ] Balance all 40 troop units, six mythic heroes and equipment endgame progression using real earned playthrough telemetry, not seeded declarations.
- [ ] Physical Android performance, memory, battery and save persistence; physical Windows Chrome/Edge QA.
- [ ] Accessibility (reduced motion, font scaling, tab order, color-blind contrast) and secure offline-only/HTTPS dependency check.
- [ ] Legal/brand review of resemblance to Heroes of Gaia; do not imply publisher affiliation or reuse unlicensed source artwork.
- [ ] Release v1.0 only when all acceptance gates and public disclosure are satisfied.

## Platform configuration recommended

- Game type: HTML Game; launch in fullscreen; free / voluntary donations for browser Early Access.
- Upload `hg91-itch-html5.zip` only from SUCCESS run. ZIP root has `index.html`; no second HTML or network dependency.
- Mark Mobile Friendly only after actual mobile validation.
- Accurate AI disclosure required for generated art/text in itch.io product metadata.
- Source: https://itch.io/docs/creators/html5 and https://itch.io/docs/creators/quality-guidelines

## Non-waivable legal gate

The code uses independently generated scenes but also contains licensed third-party sprites and CC BY icons. Existing `docs/ASSET-PROVENANCE.md` has historical entries and is NOT a release-ready whole-bundle rights clearance. A release-specific manifest must trace **every embedded runtime asset** and its license/required notices. Keep project Restricted until cleared. This is engineering release guidance, not a legal determination.
