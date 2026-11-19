# CHAT02 — Wiki 137 mechanic-gap triage (2026-11-19)

Live source: https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung (8 categories); source reference files remain frozen/read-only.

- Original 372 Wiki appearances: 235 already structured source mechanic profiles, **78 source-description-anchored qualitative** profiles, **59 lacking usable mechanic descriptions**. The 78 are NOT 78 verified formulas or recruitable troops. Numeric values remain UNKNOWN unless explicitly present in source. 59 records remain in quarantine with no executable candidate.
- `mechanic_refinement_v2.json`: all 137 rows with exact family, tier, Wiki ID, checked description-line anchors for the 78, source-derived trait-to-intent mapping, per-field provenance, explicit source facts where checked, unknown flags and anti-import gates. No copyrighted paragraphs copied.
- `troop_mechanic_rules_v2.cjs`: **78 original SIMULATED combat-preview profiles**, pure deterministic `preview` engine, with targeting, lane-specific damage, defense mitigation, counter, critical, morale, burn, and defense-down; these are experimental project-original mechanics, NOT direct VNG executable formulas. Wiki IDs do not become project recruitable IDs; prototype IDs prefixed `nlp-proto-`.
- `qa/modules/troops/nl_troop_refinement_v2.test.cjs`: validates counts, mechanics, source provenance, 59 quarantined, no source-body guessed numbers, no state mutation. Run `node qa/modules/troops/nl_troop_refinement_v2.test.cjs`.
- Chat08 owns `tools/nl_*`, generator, Save v5, `index.html` and live combat. Only it may integrate any candidate, after choosing valid gameplay scope, provenance and canonical target/action contract; no mass Wiki promotion, no duplicate status/damage application.
- No confirmed individual named parent-child Wiki edges added, no NPC recruitability assumed, no asset copying, no merge. This is a **coding/normalization batch**, not an integrated campaign release.
