# HG-07 — Acceptance report (2026-11-02)

## Tests executed on actual local candidate

- Node: `node qa-engine.cjs` → **37/37 PASS** (includes 6 new hero command-capacity tests).
- Chromium via Playwright: `python qa-browser.py` → **31/31 PASS**, 0 unhandled JS page errors.
- Source syntax: `node --check` on 8 JS source files → PASS.
- `python build_offline.py` regenerated self-contained `Play-Heoofgaia-HG07.html` → PASS.

## Evidence scope

The Chromium test uses a storage shim with page.set_content() due to file:// restrictions. It verifies rendered interactions, not physical Android browser storage, local file boot or persistent browser profiles. Screenshots have been generated locally and are included in the downloadable ZIP, not the GitHub code-only branch.

## Confirmed rule

Hero base point capacity levels 1–100 is transcribed from https://heroesofgaia.fandom.com/wiki/Heroes (community Wiki, not verified from official server). Unit points use `gold + 5*(wood+ore) + 10*(sulfur+crystal)` from https://heroesofgaia.wikidot.com/game-units. Not yet implemented: Arena rank bonus, guild bonus, items, orc race passive.

## Save compatibility

HG07 is an additive rule layer; `s.version` remains 6, save key remains `heoofgaia_hg_only_v06`. Existing over-cap saved formations can still load; the next march is rejected until player reduces troop allocation. Tests assert no AP or march state mutation on rejected launch.

## Open blockers for 'identical to original'

No original SWF/client has been verified, and original server behaviors, MMO, assets/animations, PvP, and accurate high-tier prerequisite trees are unavailable. This candidate must **not** be called a 1:1 clone.
