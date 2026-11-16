# P4 Art Provenance — Source vs Embedded Assets

Date: 2026-11-16. Generated with ChatGPT image generation for Mưu Định Tam Quốc. These assets are newly generated original illustrations based on broad Three Kingdoms themes, **not** asset extraction from the original Ngọa Long or VNG. Prompt/source route: image generation within owner conversation, followed by Pillow crops + WebP compression; no third-party copyrighted game packages imported. This record does not assert that all visual elements are legally exclusive. Redistribution should respect platform output terms and applicable rights.

| Asset | Generated PNG SHA256 (source) | Packed WebP SHA256 | Packed bytes |
|---|---|---|---:|
| Fortress city background | `ab303621f87c51f3baa7162514d6292070b110d75293f695ad0f784b5a5cecb0` | `1184c4c5b494ea1567da3b360ad0eb3e4e007f1fc272fc752c5f5d8b9fadc047` | 200338 |
| 8 hero portrait master sheet | `c44bb500fd64a4cc50302f855fd663278e1526211bdbe72654fbf3f985ad126a` | `eb7f95f1632f3712b6a6873c67487e32786033abf4804b514a1fd3b5ecf29d19` | 57870 |
| 4 troop types × 8 directional poses | `fff90b524ce7683a1f08686459f1cf7fc9a151b31457e707e14569923fee9c49` | `e6bae2052b123f70a1b3a24f62d41462a7146788ea38b318dbac55c33eda6525` | 340856 |
| 9-cell light VFX master | `de4e7f9dbc20b6c84189009688a629641cc19052ac7a405a78beef21c2948f6d` | `b876ca2172af9ca8cc20cf38a879e1004829e2834be55b081cda526c7a6a2705` | 326540 |

Packed artwork is **embedded once into the canonical index.html** as data URLs. One HTML, offline; no CDN/network dependency. Original PNG masters plus derivation evidence are in the separately delivered P4 source ZIP. GitHub also stores four **actual WebP binary files** under `assets/p4/`, exactly equal to the base64-packed versions in index.html; `qa/p4_assets.py` verifies every SHA in CI. Source PNG masters remain outside GitHub in the P4 backup ZIP; the four optimized **WebP** sprites/artwork are committed on the same branch.

## Actual QA and scope
- Gameplay state **unaltered**: visual art only, battle event effects read-only, no rewards or extra damage. Existing P2/P3 deterministic tests still run.
- 7 building hotspots, 8 artwork portraits, 4 troop classes, skill/drum VFX; mobile 390 px.
- The generated troop sheet consists of *distinct poses* (Idle & Attack) and directions, **not authored continuous walk/cast/death animation**. No rig. Portraits 8/24; quality gate remains OWNER_VISUAL_PENDING.
- Known issues: possible colored fringe in alpha at 1×, VFX cell bleed, crowd readability; target follow-up P4.1.
- Evidence: `qa/p4-art-report.json` and `qa/p4-*.png` published from exact-SHA GitHub Actions.

## CL-P4 roster portraits — 2026-11-17

CL-P4 adds twenty-two newly generated historical-character portraits: twenty different generals in a 5×5 atlas plus Hoàng Nguyệt Anh and Giả Hủ in two single portraits. The legacy portrait sheet already covered eight more figures, giving 30 distinct illustrated historical characters. Three additional playable original commanders (Hắc Vũ, Lăng Vân, Vân Khê) carry original fantasy alignments and use the project's existing icon treatment pending a later portrait pass. The 5×5 source sheet contains twenty distinct used cells; two duplicate cells and three empty cells are not mapped into the roster.

The source PNGs are committed alongside their offline WebP derivatives under `assets/p4/`. `tools/build_cl_p4_roster.py` converts and embeds the three WebPs into the canonical `index.html`; `assets/p4/cl-p4-roster-manifest.json` records source and packed SHA256 hashes, dimensions and Pillow version. `qa/p4_assets.py` verifies all three source → WebP → embedded-byte chains. These generated depictions are stylized original artwork, not documented likenesses of the named historical people, and no source image from Chiến Loạn Tam Quốc or Ngọa Long was used.

Local Chromium check: `qa/cl_p4.py` loads the three generated assets offline and checks the 49-hero roster renders 30 unique portrait elements. Owner review and physical-device image review remain pending.
