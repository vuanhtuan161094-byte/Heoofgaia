# HG-14.1 — Isometric Battlefield Fix

**Current work:** 2:1 symmetrical visual camera + floor, no gameplay change.

## Root cause

Old `battleProjection` used unequal skew factors: column=(.057w,.018h), row=(-.023w,.054h). This displays each logical square as a non-symmetric parallelogram. The foot anchor was `(x+.5,y+.76)` in rendering and hit tests. The background was a separate near-horizontal meadow, so the two perspectives were visually inconsistent.

## Implementation

- Logical grid remains **12×9 square cells**, movement and combat mechanics unmodified.
- Camera uses `halfW=min(.034w,.069h)`, `halfH=halfW/2`, `col=(halfW,halfH)`, `row=(-halfW,halfH)`.
- The origin centers the entire diamond: `x=w/2-(cols-rows)*halfW/2`, `y=.205h`.
- A unit's foot and pointer/hit reference are both projected from **(x+.5,y+.5)**. Unit draw order uses **x+y**.
- The original illustrated meadow stays as a backdrop; a grass/earth-toned isometric battle floor, rim, shadows and subdued 108-cell grid are painted in front. It is intentional code-created scene geometry, not a new generated background asset.
- Unit size adapts by depth and previously integrated sprite motion is preserved.

## QA

- Engine projection test at three canvas sizes and center-inverse of all 108 cells.
- Updated viewport integration test and real Chromium click target mapping, save/reload and portrait/landscape view.
- Chromium checks 2:1 symmetry, boundaries and centering, all foot pivots, backdrop and floor colors.
- Real battle screenshots in `HG09-combat-viewport-Chrome-evidence` CI artifact (desktop 1280×720, mobile 960×540).
- No `OWNER VISUAL PASS` claimed until owner reviews actual screenshots.

## Out of scope

No new Archer frame-by-frame asset, no changes to unit stats, combat AI, rewards, save schema or downloaded copyrighted art.
