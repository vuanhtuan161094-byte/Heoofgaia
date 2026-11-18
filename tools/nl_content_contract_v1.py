#!/usr/bin/env python3
"""Compile a provenance-aware NL content catalogue without enabling Mobile Wiki content.

One source of IDs for integration: project runtime stays authoritative; Wiki is
read-only research until individual mechanics/design/QA are approved.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "runtime": "data/ngoalong/alpha_content.json",
    "troops_main": "data/ngoalong/references/combat_troops_mobile_v1.json",
    "troops_extra": "data/ngoalong/references/combat_troops_wiki_supplement_v1.json",
    "troop_mechanics": "data/ngoalong/references/troop_mechanics_wiki_v1.json",
    "effects": "data/ngoalong/references/effects_wiki_mobile_v1.json",
    "effect_bridge": "data/ngoalong/references/troop_effect_bridge_wiki_v1.json",
    "heroes": "data/ngoalong/group02_wiki/heroes.json",
    "equipment": "data/ngoalong/group02_wiki/equipment.json",
    "dungeon_report": "data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json",
}
CONTRACT = "data/ngoalong/integration/content_contract_v1.json"
MOBILE = "VNG_WIKI_MOBILE_CURRENT"


class ContentContractError(ValueError):
    pass


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ContentContractError(message)


def load_sources(root: Path = ROOT) -> dict:
    data = {}
    for key, rel in FILES.items():
        path = root / rel
        require(path.is_file(), f"missing {rel}")
        data[key] = json.loads(path.read_text(encoding="utf-8"))
    return data


def unique(rows: list, category: str, id_key: str = "id") -> dict:
    require(isinstance(rows, list), f"{category} must be a list")
    result = {}
    for i, row in enumerate(rows):
        require(isinstance(row, dict), f"{category}[{i}] not an object")
        identifier = row.get(id_key)
        require(isinstance(identifier, str) and bool(identifier), f"{category}[{i}] missing {id_key}")
        require(identifier not in result, f"{category}: duplicate {id_key} {identifier}")
        result[identifier] = row
    return result


def compile_content(packs: dict) -> dict:
    """Fail closed on broken source relations. Never produce playable Wiki definitions."""
    for key in FILES:
        require(key in packs and isinstance(packs[key], dict), f"missing source {key}")
    runtime = packs["runtime"]
    require(runtime.get("schemaVersion") == 1, "unexpected active game catalogue schema")
    require(runtime.get("gameVersionScope", {}).get("classicWebgameParity") == "UNKNOWN",
            "Mobile/classic parity must not be silently asserted")

    main = packs["troops_main"]
    extra = packs["troops_extra"]
    troops = unique(main.get("units"), "Wiki core troops")
    for ident, item in unique(extra.get("units"), "Wiki supplement troops").items():
        require(ident not in troops, f"duplicate troop across Wiki sources: {ident}")
        troops[ident] = item

    statuses = unique(packs["effects"].get("records"), "Wiki status effects")
    heroes = unique(packs["heroes"].get("heroes"), "Wiki heroes")
    equipment = unique(packs["equipment"].get("equipment"), "Wiki equipment")
    mechanisms = packs["troop_mechanics"].get("records")
    require(isinstance(mechanisms, list), "missing per-troop mechanics")
    require(len(mechanisms) == len(troops), "missing one or more per-troop mechanics records")
    mechanics_by_id = unique(mechanisms, "Wiki troop mechanics", "unitId")
    require(set(mechanics_by_id) == set(troops), "troop mechanics not joined one-to-one to all Wiki troops")
    bridge = packs["effect_bridge"].get("events")
    linked = unique(bridge, "Wiki troop-effect events")
    require(all(event.get("unitId") in troops for event in linked.values()),
            "effect bridge references unknown troop ID")
    for event in linked.values():
        effect_id = event.get("canonicalEffectId")
        if effect_id is not None:
            require(effect_id in statuses, f"unknown effect reference {effect_id}")
        require(event.get("runtimeEnabled") is False, "unreviewed effect event enabled in runtime")

    for ident, unit in troops.items():
        source = unit.get("source") or {}
        require(source.get("url", "").startswith("https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung"),
                f"troop {ident} has no official source URL")
        require(bool(unit.get("fieldProvenance")), f"troop {ident} missing field-level provenance")
        if ident in main.get("previousNineAudit", {}).get("mappedRecords", []):
            pass  # Existing nine are a historical crosswalk, not playable Wiki units.
        # Main and supplementary sources use different explicit read-only marker schemas.
        flags = unit.get("integration", unit.get("gameplay", {}))
        require(flags.get("referenceOnly") is True, f"troop {ident} unexpectedly active")
        require(unit.get("evolution", {}).get("mobileEdgeStatus", "UNKNOWN") != "VERIFIED"
                or bool(unit.get("evolution", {}).get("mobileVerifiedEdgeSourceIds")),
                f"troop {ident} claims a verified named edge without source")
    for ident, effect in statuses.items():
        require(effect.get("useInRuntime") is False, f"Wiki effect {ident} enabled")
        require(effect.get("source", {}).get("url", "").startswith("https://ngoalong.vnggames.com/"),
                f"Wiki effect {ident} missing source")
    for category, mapping in (("hero", heroes), ("equipment", equipment)):
        for ident, row in mapping.items():
            require(row.get("integration") == "REFERENCE_ONLY", f"Wiki {category} {ident} enabled")
            require(bool(row.get("fieldStatus")) and bool(row.get("sourceIds")),
                    f"Wiki {category} {ident} lacks provenance")

    project_heroes = unique(runtime["heroes"]["projectRoster"], "runtime heroes")
    project_troops = unique(runtime["troops"]["profiles"], "runtime troop families")
    project_equipment = unique(runtime["equipment"]["projectItems"], "runtime equipment")
    project_tech = unique(runtime["research"]["catalog"], "runtime research")
    project_skill = runtime["skills"]["heroById"]
    require(isinstance(project_skill, dict) and set(project_skill) == set(project_heroes),
            "runtime hero skill IDs do not match project roster")
    project_effect = runtime["statusEffects"]["effects"]
    require(isinstance(project_effect, dict) and bool(project_effect), "runtime effects missing")
    runtime_maps = unique(runtime["campaign"]["maps"], "runtime maps")
    runtime_npcs = unique(runtime["campaign"]["npcs"], "runtime NPCs")
    runtime_encounters = unique(runtime["campaign"]["encounters"], "runtime encounters")
    for record in runtime_encounters.values():
        require(record.get("npcId") in runtime_npcs and record.get("mapId") in runtime_maps,
                f"runtime encounter {record.get('id')} references unknown NPC or map")
    for row in runtime_npcs.values():
        units = row.get("units", [])
        require(isinstance(units, list) and 1 <= len(units) <= 5,
                f"runtime NPC {row.get('id')} has invalid team size")
        require(all(u.get("troopId") in project_troops for u in units),
                f"runtime NPC {row.get('id')} references missing troop family")

    dungeon = packs["dungeon_report"]
    n_maps = dungeon.get("mapCount")
    n_npcs = dungeon.get("npcDetailCount")
    n_formed = dungeon.get("fullNpcFormationCount")
    n_missing = dungeon.get("npcFormationsMissing")
    require(all(type(v) is int and v >= 0 for v in (n_maps, n_npcs, n_formed, n_missing)),
            "invalid Wiki dungeon summary numbers")
    require(n_formed + n_missing == n_npcs, "Wiki dungeon formation coverage contradictory")
    require(dungeon.get("mapNpcRosterCompleteCount", 0)
            + dungeon.get("mapNpcRosterIncompleteCount", 0) == n_maps,
            "Wiki dungeon roster coverage contradictory")
    require(dungeon.get("fullyGameplayReadyMaps", 0) <= n_maps, "invalid playable-map claim")
    require(dungeon.get("classicWebgameParity") == "UNKNOWN", "unverified Mobile/classic dungeon parity")

    def reference_rows(items: dict, name_key: str = "name") -> list[dict]:
        return [
            {"id": key, "name": item.get(name_key),
             "sourceEdition": "VNG_WIKI_MOBILE_CURRENT",
             "authority": "REFERENCE_ONLY", "runtimeEnabled": False}
            for key, item in sorted(items.items())
        ]

    # No game balance, hidden formula, numeric NPC stats or named evolution edge
    # is synthesized by this compiler.
    result = {
        "schemaVersion": 1,
        "product": "MuuDinhTamQuoc",
        "sourceEdition": "VNG_WIKI_MOBILE_CURRENT",
        "classicParity": "UNKNOWN",
        "runtimeAuthority": FILES["runtime"],
        "sourceFiles": FILES,
        "runtimeIds": {
            "troops": sorted(project_troops),
            "playableTroops": sorted(set(project_troops) | set(unique(runtime["evolution"]["branches"], "runtime troop evolutions"))),
            "heroes": sorted(project_heroes),
            "skills": sorted(project_skill),
            "effects": sorted(project_effect),
            "equipment": sorted(project_equipment),
            "research": sorted(project_tech),
            "maps": sorted(runtime_maps),
            "npcs": sorted(runtime_npcs),
            "encounters": sorted(runtime_encounters),
        },
        "references": {
            "troops": reference_rows(troops),
            "effects": reference_rows(statuses, "wikiName"),
            "heroes": reference_rows(heroes),
            "equipment": reference_rows(equipment),
        },
        "coverage": {
            "runtimePlayableTroops": len(project_troops) + len(unique(runtime["evolution"]["branches"], "runtime troop evolutions")),
            "troops": len(troops),
            "troopMechanicProfiles": len(mechanics_by_id),
            "troopEffectEvents": len(linked),
            "troopEffectResolvedReferences": sum(
                1 for event in linked.values() if event.get("canonicalEffectId")),
            "effects": len(statuses),
            "heroes": len(heroes),
            "equipment": len(equipment),
            "wikiMaps": n_maps,
            "wikiNpcDetailRows": n_npcs,
            "wikiNpcFormationsRecorded": n_formed,
            "wikiNpcFormationsMissing": n_missing,
            "wikiNpcSoldierConflicts": dungeon.get("soldierTotalContradictions"),
            "wikiReadyMapsReported": dungeon.get("fullyGameplayReadyMaps"),
        },
        "gates": {
            "catalogueRelationsVerified": True,
            "wikiRecordsPlayable": False,
            "wikiToRuntimeLinksApproved": 0,
            "bulkWikiActivationAllowed": False,
            "reason": "Source-only Mobile records; incomplete named evolution, skill formulas, NPC reconciliation and design approval.",
        },
    }
    return result


def compile_from_disk(root: Path = ROOT) -> dict:
    result = compile_content(load_sources(root))
    schema = json.loads((root / CONTRACT).read_text(encoding="utf-8"))
    require(schema.get("schemaVersion") == 1, "contract metadata version mismatch")
    require(schema.get("referenceStatuses") == ["REFERENCE_ONLY", "DESIGN_READY", "PLAYABLE"],
            "unexpected promotion state machine")
    require(schema.get("runtimeSaveSchema") == 5, "Save migration policy changed")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Wiki/domain joins; emit read-only normalized NL content index.")
    parser.add_argument("--out", type=Path, help="Optional path for deterministic JSON index artifact")
    args = parser.parse_args()
    result = compile_from_disk()
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "SOURCE_REFERENCES_VALIDATED_NOT_GAMEPLAY_READY",
        "runtime": {key: len(rows) for key, rows in result["runtimeIds"].items()},
        "coverage": result["coverage"],
        "bulkWikiActivationAllowed": result["gates"]["bulkWikiActivationAllowed"],
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
