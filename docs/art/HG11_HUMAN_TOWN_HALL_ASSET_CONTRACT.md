# HG-11 asset contract — Human Town Hall

Date: 2026-11-03. Status before generation: `DRAFT / NOT INTEGRATED`.

## Identity and purpose

- Runtime building key: `hall`; faction: Human; screen: existing City / building-detail panel.
- Create one independently-authored Town Hall object, separate from the flattened city illustration and from the Human Barracks sprite.
- Show the selected building next to its real current level, costs, prerequisite state and actual build/upgrade action. Keep the existing construction transaction and v07 save queue unchanged.
- The image is static architecture (`animationFrames: 0`). It must not be called animated or used to represent any troop.

## Visual and technical contract

- One complete medieval administration keep: taller and more ceremonial than the broad low Barracks. Ivory limestone, dark timber, terracotta-red roofs and restrained royal blue/gold trim coordinate with the existing project Human Barracks asset. A central high hall, one legible arched gate, and compact attached wings form a single footprint.
- Modern polished painterly 2.5D finish, shallow elevated three-quarter view, readable at 180–220 CSS pixels wide. Use the project's art as a style reference only; do not copy a commercial game asset.
- A single centered object on a true transparent square canvas; no landscape, city backdrop, floor plane, separate props, characters, text, letters, logos or watermarks. Preserve the generated master. Runtime export target 512×512 RGBA, bottom-center ground anchor `[256, 488]`.
- Rights/source state: `RECREATED` if generated; no historical or third-party commercial art as generation input. Record prompt, source route, image ID if reported, file dimensions, alpha bounds, SHA-256, runtime bytes, offline build SHA and real browser receipts.

## Acceptance gates

1. Inspect the generated master for a single Town Hall silhouette, transparent background, color/anatomy artifacts and distinction from Barracks; reject if unsuitable.
2. Export a centered 512×512 RGBA runtime file and scan alpha bounds, edge contamination and hash.
3. Integrate only into the real Human Town Hall detail. The existing canvas hotspot must select `hall`; actual construction/upgrade, resource deduction, queue completion and v07 Save/Reload continue to work.
4. Add Node structural checks, focused actual Chromium test (including a Save/Reload queue), integrated and `file://` regression, and real screenshots. Compare only with owned project style / documented original references; do not claim original-client parity.
5. Rebuild offline twice and verify identical bytes/SHA. Update asset provenance, current checkpoint and roadmap, commit and push to the isolated feature branch.

## Explicit limitations

This asset adds one isolated detail preview. It does not separate the city scene into layers, prove source-client Town Hall appearance, or provide a Town Hall animation. Other 11 Human building identities and the remaining races stay separate follow-up work.
