# HG-14.5 | Grid, HP and receipt-driven PvE effects

Both grid and HP are ON by default. Separate accessible buttons toggle each and persist preferences independently of the canonical v07 gameplay save. Invalid settings revert to ON.

The 12-by-9 tactical grid uses the exact battleProjection for painting, pointer mapping and cell centers. A small marker shows each canonical unit foot-cell. When avoiding sprite overlap offsets the visual character, a faint connector reveals the difference instead of changing coordinates. Hiding the grid still allows a selected movement preview. Hiding HP retains unit names and quantities.

Real battle.lastEvents with positive recorded damage drive arrows for ranged stacks, slashes for melee, impact rings, exact negative damage labels, exact casualties, and a death marker only when the engine recorded death=true. All effects expire within 960ms and never change combat state, stats, AI or save schema.

QA: 108 inverse-coordinate cells, real NPC turn and receipt equality, Chromium toggles with deterministic pixel restoration, cold Save/Reload, and 960x540 landscape. The actual 600ms combat canvas is captured separately so damage popup screenshots cannot be missed by a later browser frame.

Visual quality remains OWNER_VISUAL_PENDING. Final victory returns to the map immediately, and large 7v7 layout and physical Android devices require further validation.