# HG-14.2 — Battlefield visual layout review against Heroes of Gaia 2009

## Owner review of HG-14.1: VISUAL FAIL

The owner supplied real 1280×720 and 960×540 game captures. The centered 2:1 diamond looked like a **floating tabletop** on a grassy clearing and packed the troops into its far top/bottom corners. Although the mathematical inverse, click handling and saves passed, **the battlefield composition was not acceptable**. The old 2:1 platform has been removed; no `OWNER VISUAL PASS` is implied.

## Original Heroes of Gaia / Castle of Heroes evidence

- GameGami historical project gallery: https://www.gamegami.com/index.php/projects/heroes-of-gaia (real battle screenshot with full-bleed grass/stone terrain, hero/skill and command overlays).
- Chinese 2009 illustrated combat: https://webgame.yzz.cn/yiqipingyouxi/200903/480.shtml (兵种 appear as troop stacks on a natural field, not on a permanently drawn tile platform).
- Chinese 2009 battle review: https://news.sfacg.com/Files/2009-6-9/7b77c6c3-c4a3-4e85-9d2b-c590e8241e1d.shtml (one visible unit represents a stack; positions advance in combat).
- Japanese late-2009 title press: https://mmoinfo.net/news/press/castleofhero/2009/091030.shtml (unit movement and battle scenes shown on continuous illustrated backgrounds).

These references guide **layout and visual composition**, not copying source artwork or claiming exact historical rules.

## Implemented design

1. **No floating stage or permanent grid.** The original illustrated meadow is now the full playable surface. A very subtle color grade keeps distant ground continuous, without a rhombus border, raised platform, or grid lines.
2. The underlying **12×9 square logical grid, hit-testing and pathfinding are unchanged**. Renderer `battleProjection` is now an almost-horizontal left-to-right axis and a deeper front-to-back axis: `origin=(.08w,.35h)`, `col=(.07w,.004h)`, `row=(.0045w,.061h)`.
3. Two armies are spaced across the whole scene. In a typical first NPC encounter, the ally at `(1,0)` renders in the **left** part, while foes at `(10,2)` / `(10,5)` render toward the **right** with enough vertical separation.
4. Unit foot anchors and click targets share `point(x+.5,y+.5)`. Depth order sorts by screen Y. Animation from HG-14 Batch 1 remains intact.
5. **Movement highlighting only:** reachable positions are drawn as faint green cells only when entering destination mode; no lines are drawn during normal combat.

## QA acceptance contract

- Full baseline engine, browser flow and Save/Reload compatibility.
- Projection inverse checks for all 108 cells at multiple viewport ratios and visible spacing tests for both armies.
- Actual Chromium screenshot at 1280×720 and 960×540, with checks for a continuous image-backed meadow, two separated troop groups and hidden grid at rest.
- Keep verdict `OWNER_VISUAL_PENDING` until the owner has inspected real screenshots; numerical CI PASS alone cannot certify aesthetics.

## Remaining / next batch

After visual approval, proceed with HG-14.3 Human Archer frame-by-frame animation; do not substitute single-master warps for true authored pose frames.
