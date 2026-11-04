# HG19 — Lightweight troop art and icon integration

Date: 2026-11-04. Source: art-pack.js, painter.js, app.js, index.html, build_offline.py.

## Implemented
- All forty original recruitable unit IDs receive unique lightweight generated SVG drawings. The 33 previously emblem-only identities now have specific artwork drawn in battle and shown on recruitment cards. This is procedural vector illustration, not 33 individually painted PNG masters.
- Existing higher-detail visuals remain preferred: Human Archer 48 layered raster frames, Human Heavy Soldier 57 rig frames, other HG11 static PNGs and Human Spear Militia's SVG.
- Five basic presentation states reuse the HG14 motionPose engine: Idle sway, interpolated Walk, Attack lunge, Hit recoil and Death collapse. No separate hand-painted frames were generated for the new vector art.
- 67 UI icons cover races, resources, nav, buildings, HG18 materials, equipment and six optional visual-only elemental motifs. The elemental motifs do not implement or imply new combat mechanics.
- The game UI replaces emoji in resource displays, race selection, navigation, troop recruitment cards, equipment lists and HG18 material displays. Some legacy UI glyphs and canvas annotations remain.
- All generated SVG art is inlined as data URIs, cached and supported by offline HTML. No new network dependency.

## Non-goals and QA
- No gameplay, reward, stats, economy or save schema changes.
- Unrecognized NPCs and still-loading vector images retain the previous combat fallback.
- Source and integration check: node qa-hg19-art.cjs.
- Real browser decode and contact sheet: python qa-hg19-art-chrome.py.
- Existing battle, New Game and Save/Reload suites remain the gameplay acceptance gates.
- Owner visual approval remains PENDING. Generated SVG work is a fast coverage baseline, not final premium concept art.
