# ART 05 — Ngọa Long / visual pilot handoff (18/11/2026)

## Scope correction — classic Ngọa Long stationary battle (2026-11-18)

Owner confirmed the game should remain **simple and recognisable**. Unlike map-marching tactical games, the classic battle representation is fixed formations of troop stacks executing actions in place. **Walk/Run, map movement and four-direction locomotion are not acceptance requirements for Ngọa Long combat art.** The CL-P5 walk atlas remains a preserved regression/legacy asset, not a new NL production target.

For the single R04 scout pilot, prioritise **Idle → Attack/Thrust → Hit → Skill/FX → Fall/Disappear**, with left/right facing only where battlefield orientation needs it. Reuse the existing original R04 identity and spear; do not change silhouette or armor to create a fake new character. One clear contact pose and one clear skill effect at actual game scale are more valuable than dozens of synthetic frames. An animation may use a few discrete cel images (no bones, no rig); do not claim a flip, CSS motion, or cross-fade creates independently authored artwork. Perform only lightweight asset checks (identity, clipping/alpha, weapon integrity, event read-only), then seek owner visual review. The older four-direction turnaround plan below is retained as history, **superseded for initial delivery by this scoped acceptance rule**.


**Function:** Art & VFX. User prompt calls this group 05; the newer Chat 00 master calls the same function **06 ART** and reserves `assets/ngoalong/`, `qa/nl_art_*.py`. This work follows the functional **ART** ownership and does not edit the Progression group's files. Chat 00 should reconcile the group numbering.

**Starting exact HEAD:** `ef7c5957adc1e22f51c2f4535d6eff66c9274a25`. Source tree `d8a5ed205431928c3abd16cc36e319038679ee29`. Machine-readable file-by-file Git object inventory: [inventory.json](inventory.json). The classifications below are VERIFIED for repository existence and derived from source manifests; they do not mean owner-approved visuals.

| Asset | Classification | Actual scope |
| --- | --- | --- |
| `assets/p4` | CL legacy | City, eight initial portraits, twenty-two later character portrait sources/derivatives, troop stills, 9-cell legacy VFX |
| `assets/p41/troops_p41.webp` | CL composited | 288 frames packed across four unit classes, four directions, three actions, six frames; based on **two source poses and per-frame 2D compositing**. Not independently hand-painted sequences. |
| `assets/p5/cl-p5-infantry-scout-v1/` | CL legacy animation | 80 packed frame cells for five actions × four directions × four frames. Walk is packed but not yet attached to live map marching; three explicitly rejected sources are retained. |
| `assets/p5/cl-p5-region-map*` | CL legacy environment | One background with independent live UI hotspots; not modular layered map. |
| `assets/r04/` | NL pilot, owner PENDING | Original male scout idle/contact plus female tactician idle: six PNGs, three raw + three registered. The two-pose scout is a **battle callout illustration only**, not a full battlefield animation actor. |
| New NL VFX | UNKNOWN / missing | Earlier P4 legacy effects exist, but independently approved NL skill VFX RGBA sprites/atlases have not been verified. |

## QA-only preview

Open [preview.html](preview.html) **from a full repository checkout** to view the current R04 original sprites and compare with the CL-P5 four-direction/five-action animation atlas. All images resolve by relative paths to already tracked source assets. The viewer is **not another game build**.

- Scout physical contact control replays the **two actual distinct R04 PNG pose assets** with a 320ms reset, but emits a clearly labeled **SIMULATED PREVIEW** event, not an authoritative battle event.
- CL-P5 inspector samples existing discrete atlas image cells; it does not fake independent frames via rotation/rigging.
- VFX charge/release/contact/fade indicators are a **pipeline placeholder only**, not a produced skill effect.
- Read-only viewer: no localStorage, no Save, no gameplay engine calls, no writes to the canonical HTML. Existing live R04 integration at `tools/ngoa_long_r04.js` is unchanged.

## One-sample production pipeline — original design, SIMULATED

1. Keep or improve **one** original master identity; 3–3.5-head sharp-eyed chibi, energy-eye glow with visible pupils, clean high-contrast silhouette, non-matching weapon vs armor hues, true transparent RGBA and documented provenance/license.
2. Approve front/right/back/left character turnaround independently (no mirror-as-direction). Record grip/weapon anchors, one fixed foot pivot, and source-space proportions.
3. Draw distinct key poses, then real discrete Idle/Walk/Attack/Hit/Fall frame sequences for each direction. Packing can be automated; frame *content* must not be reduced to CSS bob/rig. Keep rejected sources for traceability, check edge clipping and alpha fringes.
4. Produce a **separate** transparent VFX sprite source with identifiable light silhouette and charged/released/traveled/contact/fade keyframes, color/readability at mobile scale, and target anchor. Do not reuse protected game icons or official art.
5. Chat 07 integration contract: read-only adapter for actual `p2ApplyFrame(ev)` data and authoritative attacker/target; select sprite states and phase times, cancel on overlapping events, never mutate HP, morale, damage, loot, Save or replay. If actor/target/timing unknown, do not invent effects.
6. Focused QA: source hashes, alpha and pivot invariants, four directions and five actions independently visible, event contact timing, no bleed/clipping, Chromium desktop **1280×720** and mobile **390px**. Full game QA and owner approval only at integration/release gates.

**Stop gate:** current pilot does not justify bulk production of dozens of heroes or skills. Complete and visually approve one full four-direction animated character and one distinct alpha VFX first.

## Wiki pages actually read (18/11/2026)

- https://ngoalong.vnggames.com/ngoa-long-wiki — **VERIFIED Mobile** wiki identity/catalogue; classic-web parity UNKNOWN.
- https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung — **VERIFIED** troop families and visible records; only typography-free concept classification used, not artwork/assets.
- https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung — **VERIFIED** benefit/harm/control/neutral groups and visible effect examples; not a license to copy VFX/icon/skill text. Specific effect pixels/parameters UNKNOWN.

## Evidence and controls

- GitHub file paths/bytes/blob IDs: exact HEAD manifest **VERIFIED**; existing QA reports are historical evidence not rerun here.
- The preview and inspection CLI: delivered as **new isolated QA tooling**, not integrated game behavior.
- No gameplay/Save/formula, existing asset byte, shared generator, global workflow, branch merge or Hero change.
- Focused validation: `python qa/nl_art_05_contract.py`; with browser `python qa/nl_art_05_contract.py --browser` from checked-out repo. Browser artifacts are local only; keep screenshot results separate from GitHub exact-SHA Actions.
- **PENDING:** owner visual approval, complete NL animations, real NL skill VFX, full integration QA, real device QA.

**Handoff choices:** A — use the existing scout identity and produce four-direction turnaround; B — replace only the scout visual identity before animating; C — first establish a single independent alpha spear-strike VFX. A is the efficient path if the original scout visual is accepted.
