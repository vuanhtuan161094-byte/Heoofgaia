# HG47 — Equipment 10 slots, 4 races, earned fragments (2026-11-10)

## Non-negotiable architecture
- Continue the single existing feature/hog1-research-to-playable-20261102 branch and ONE Play-Heoofgaia-HG11.html offline build.
- Save version remains v07. The 3 existing slots are not migrated or removed. Seven new slots: helm, gloves, boots, belt, necklace, ring, relic.
- All physical equipment is created through the canonical E.addItem inventory and equipped by UID. No second inventory, simulated rewards from UI, free gold, victory or Boss/Tower currency.
- The hg47 save section adds 80 item-specific fragment counters, two targeted slots, last-seen battle ordinals and bounded receipts. Legacy Save v07 without hg47 loads a ZERO new fragment wallet, never retrospective rewards.
- All 10 equipment slots are uniquely owned; reject duplicates, invalid slot mapping and race-incompatible gear. Old equipment and saved UIDs are left untouched.

## Full item and set matrix
- Slots: weapon (weapon), armor (armor), helm, gloves, boots, belt, necklace, ring, charm and relic.
- Races: Human/Vuong Trieu, Elf/Nguyet Lam, Orc/Chien Huyet and Undead/Hon Gioi.
- Rarities: rare/Co Vat and divine/Than Khi. Exactly 4 races x 2 rarities x 10 slots = 80 item IDs and 8 race-specific 10-piece sets.
- Per-piece racial main stat differentiation: Human +3 DEF (rare), Elf +2 SPD, Orc +3 ATK, Undead +1 each ATK/DEF/SPD. Divine doubles these increments and roughly doubles baseline item stats.
- Three-piece set: rare +1.2%, divine +2.2% to its race-specific modifier.
- Six-piece set adds rare +1.8%, divine +2.8%.
- Ten-piece set adds rare +2.5% (plus 1% mitigation), divine +4% (plus 2% mitigation).
- Race-specific modifier: Human damageReduction, Elf rangedDamage, Orc meleeDamage, Undead damageBonus. These are real combatModifiers and respect combat cap 25% damage and 20% mitigation.
- Every rare gear UID has one deterministic substat, every divine gear UID has two; pool ATK, DEF, SPD, INT, damageBonus, meleeDamage, rangedDamage, damageReduction. UID-affixes are stable across Save/Load and reflected in actual heroStats or combatModifiers.

## Actual battle drop sources
- Target one tier and one slot using the Forge selection; changing focus creates no rewards and existing fragments do not transfer to another item.
- NPC 1–3 stars: 60% wins drop 1 rare fragment.
- NPC elite 4–10 stars: guaranteed 1–2 rare fragments; 5% wins also drop 1 divine fragment.
- Real NPC Boss T11+: guaranteed 2 rare and 2 divine targeted fragments; T13 gives 3 divine.
- Treasure victory: 1 rare fragment.
- Claimed Tower win: guaranteed 1 rare and 2 divine fragments.
- No rewards for ongoing battles, defeats, or Tower practice wins where claimed is false.
- Drop seed is deterministic from battle target, victory ordinal and race. No random reload reroll.
- HG29 and HG27 original Boss/Tower earned resources remain authoritative; HG47 does not fabricate their tokens.

## Deterministic crafting
- Rare chosen item: 8 targeted shards + 5 HG29 gear shards + 3 HG29 hunter badges + 3000 gold.
- Divine chosen item: 12 targeted shards + 3 Boss abyss cores + 6 Tower runes + 2 hero shards + 1 HG27 Boss token + 1 HG27 Tower token + 18000 gold.
- Divine also requires at least 1 genuine T11+ Boss win and 3 reward-eligible Tower wins registered by HG31. Materials alone do not unlock.
- Preflight checks every wallet, progress gate, combat lock, and inventory limit before spending; one successful craft produces one real UID and deducts exactly the paid quantities.
- Salvage rates: 4 stones for rare, 12 for divine before enhanced level refund, no free Boss/Tower tokens.
- Quality/rarity equipment is a separate concern from existing seven hero recruitment qualities, which must not be recalculated from worn gear.

## UI and acceptance
- Hero profile renders 10 compact slots, correct UID owner, upgrade level, substat lines, set progression 3/6/10 and a bounded ten-slot optimizer. Responsive 1280x720, 960x540, 844x390, 768x260 and 412x915.
- Forge shows 4 races, two rarity options, ten target slot recipes, owned and missing fragments, paid currency, set effects, and explicit focus/craft actions.
- Node QA: qa-hg47-10slot.cjs plus pre-existing HG46/HG46-B/HG29/HG31 regression.
- Chromium QA: qa-hg47-ui-chrome.py plus updated qa-hg46-equipment-chrome.py.
- Workflow: .github/workflows/hg47-ten-slot.yml; must build only Play-Heoofgaia-HG11.html and attach evidence.
- No PASS claim until actual Actions job logs, playable HTML artifact, Save cold reload, 5-view Chromium and real New Game farming are verified.
