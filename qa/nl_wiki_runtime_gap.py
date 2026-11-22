#!/usr/bin/env python3
"""Source-vs-runtime Wiki coverage audit; never promotes Wiki rows to gameplay."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str) -> dict:
    with (ROOT / relative).open(encoding="utf-8") as handle:
        return json.load(handle)


def audit() -> dict:
    alpha = load("data/ngoalong/alpha_content.json")
    troop = load("data/ngoalong/modules/troops/project_playable_v1.json")
    troop_contract = load("data/ngoalong/modules/troops/live_integration_contract_v2.json")
    campaign_source = load("data/ngoalong/modules/campaign/catalogue_source_index_v1.json")
    bindings = load("data/ngoalong/modules/campaign/approved_bindings_v1.json")
    city = load("data/ngoalong/modules/city/catalog_v1.json")
    hero_manifest = load("data/ngoalong/integration/heroes207_runtime_manifest_v1.json")
    items = load("data/ngoalong/modules/inventory/item_groups_v1.json")
    effects = load("data/ngoalong/modules/combat/effects_v1.json")

    assert alpha["compatibility"]["saveSchema"] == 5, "Save schema changed"
    assert alpha["compatibility"]["saveKey"] == "muu_dinh_tam_quoc_v1", "Save key changed"
    assert len(alpha["campaign"]["maps"]) == len(alpha["campaign"]["npcs"]) == len(alpha["campaign"]["encounters"]), "Canonical 28-stage shape diverged"
    assert len(troop["units"]) == troop_contract["projectIdentityCount"], "Troop catalogue contract diverged"
    assert len(hero_manifest["heroes"]) == len(alpha["heroes"]["hero207Roster"]), "Hero 207 manifest diverged"

    units = troop["units"]
    source_counts = {
        "wikiMobileMaps": campaign_source["mapCount"],
        "wikiMobileNpcDetails": campaign_source["npcDetailCount"],
        "wikiMobileCompleteRosters": campaign_source["rosterComplete"],
        "wikiMobileIncompleteRosters": campaign_source["rosterIncomplete"],
        "wikiMobileUnverifiedNpcFormations": campaign_source["unverifiedNpcFormations"],
        "wikiMobileReadyPlayableMaps": campaign_source["fullyGameplayReadyMaps"],
        "wikiMobileItemReferencesDeclared": items["declaredTotal"],
    }
    runtime_counts = {
        "originalPlayableHeroes": len(alpha["heroes"]["projectRoster"]),
        "supplementalProjectHeroes": len(alpha["heroes"]["hero207Roster"]),
        "baseProjectTroops": len(alpha["troops"]["profiles"]),
        "projectEvolutionBranches": len(alpha["evolution"]["branches"]),
        "projectTroopIdentityDesigns": len(units),
        "troopDesignsWithPendingIntentMappings": sum(
            str(u.get("combatBehavior", {}).get("runtimeMapping", "")).startswith("PENDING")
            for u in units
        ),
        "projectChapters": len(alpha["campaign"]["chapters"]),
        "projectPlayableStages": len(alpha["campaign"]["maps"]),
        "projectPlayableEncounters": len(alpha["campaign"]["encounters"]),
        "wikiApprovedMapBindings": len(bindings["maps"]),
        "wikiApprovedNpcBindings": len(bindings["npcs"]),
        "wikiApprovedUnitBindings": len(bindings["units"]),
        "legacyBuildings": len(city["legacy"]),
        "projectAdditionalBuildings": len(city["buildings"]),
        "projectResearchLines": len(alpha["research"]["catalog"]),
        "projectCombatEffectDefinitions": len(effects["effects"]),
    }
    blockers = [
        {
            "id": "WIKI-MAP-BINDING",
            "priority": "P0",
            "status": "SOURCE_ONLY",
            "evidence": f"{source_counts['wikiMobileMaps']} Wiki maps and {source_counts['wikiMobileNpcDetails']} NPC details; 0 approved runtime mappings",
            "action": "Audit numeric soldier/skill IDs, approve crosswalks and integrate stage batches without replacing 28 existing project stages",
        },
        {
            "id": "TROOP-TRAITS",
            "priority": "P0",
            "status": "PARTIAL_NATIVE_INTEGRATION",
            "evidence": f"{len(units)} project identities; {runtime_counts['troopDesignsWithPendingIntentMappings']} design intents marked PENDING; 0 Wiki identities proven playable",
            "action": "Port only supported trait intents into native P2 with one hit/morale/receipt owner, then compare behavior with current Wiki by edition",
        },
        {
            "id": "HERO-SKILLS",
            "priority": "P1",
            "status": "PROJECT_SIMULATED",
            "evidence": f"{len(hero_manifest['heroes'])} supplemental heroes carry simulated stats/skills, not verified Mobile formula parity",
            "action": "Prioritize skills for visible 28-stage hero roster; track verified names separately from simulated gameplay rules",
        },
        {
            "id": "CITY-CROSS-MODULE",
            "priority": "P1",
            "status": "INTEGRATION_REVIEW",
            "evidence": f"{len(city['buildings'])} project additional buildings plus {len(city['legacy'])} legacy",
            "action": "Check each building's effect consumer, cost receipt, expiry, and Save v5 exactly once",
        },
        {
            "id": "WIKI-ITEMS",
            "priority": "P1",
            "status": "MIXED_REFERENCE_AND_PROJECT_RULES",
            "evidence": f"{items['declaredTotal']} Wiki item reference rows; project effects are simulated and require separate source linkage",
            "action": "Trace each project reward/item/equipment use, acquisition, crafting, economy and replay once-only receipts",
        },
        {
            "id": "VISUAL-FIDELITY",
            "priority": "P0",
            "status": "REVIEW_REQUIRED",
            "evidence": "Classic 2011 city-map, formation, dungeon and battle are distinct from current VNG Mobile Wiki",
            "action": "QA all 14 screens and every subwindow, make City map initial window; owner screenshot comparison and original art acceptance",
        },
    ]
    return {
        "schemaVersion": 1,
        "sourceEdition": "VNG_MOBILE_CURRENT_REFERENCE_ONLY",
        "classicWebgameParity": "NOT_ASSERTED",
        "runtimeAuthority": "alpha_content.json and canonical generator",
        "saveKey": alpha["compatibility"]["saveKey"],
        "saveSchema": 5,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceCounts": source_counts,
        "runtimeCounts": runtime_counts,
        "troopSourceContractStatus": troop_contract.get("status"),
        "wikiIdentityPlayable": troop_contract.get("importedWikiPlayable", 0),
        "blockers": blockers,
        "noAutomaticWikiPromotion": True,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="qa/wiki-runtime-gap.json")
    args = ap.parse_args()
    result = audit()
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wiki/runtime coverage:", result["runtimeCounts"], flush=True)
    print(f"Audit saved: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
