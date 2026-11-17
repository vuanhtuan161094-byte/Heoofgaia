"""Load and validate the owned, provenance-tagged Ngọa Long Alpha data pack."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PACK_RELATIVE_PATH = Path("data/ngoalong/alpha_content.json")
CLASSIFICATIONS = {"VERIFIED", "DERIVED", "SIMULATED", "UNKNOWN"}
MECHANIC_TYPES = {
    "initial-status",
    "start-morale",
    "stat-adjustment",
    "target-back-row",
    "morale-seal",
}


class DataPackError(ValueError):
    """Raised when a data pack contains an incomplete or dangling reference."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise DataPackError(message)


def _provenance(value: Any, source_ids: set[str], path: str) -> None:
    _require(isinstance(value, dict), f"{path}: provenance must be an object")
    classification = value.get("classification")
    _require(classification in CLASSIFICATIONS, f"{path}: invalid provenance classification {classification!r}")
    source_id = value.get("sourceId")
    _require(source_id in source_ids, f"{path}: unknown provenance source {source_id!r}")


def _assert_acyclic(nodes: set[str], edges: list[tuple[str, str]], label: str) -> None:
    outgoing: dict[str, list[str]] = {node: [] for node in nodes}
    for parent, child in edges:
        _require(parent in nodes, f"{label}: unknown evolution parent {parent!r}")
        _require(child in nodes, f"{label}: unknown evolution node {child!r}")
        outgoing[parent].append(child)
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        _require(node not in visiting, f"{label}: cycle detected at {node!r}")
        if node in visited:
            return
        visiting.add(node)
        for child in outgoing[node]:
            visit(child)
        visiting.remove(node)
        visited.add(node)

    for node in nodes:
        visit(node)


def validate_pack(pack: dict[str, Any]) -> dict[str, Any]:
    _require(pack.get("schemaVersion") == 1, "unsupported data pack schemaVersion")
    source_registry = pack.get("sourceRegistry")
    _require(isinstance(source_registry, list) and source_registry, "sourceRegistry must be a non-empty array")
    source_ids = {source.get("id") for source in source_registry if isinstance(source, dict)}
    _require(len(source_ids) == len(source_registry) and None not in source_ids, "sourceRegistry IDs must be unique and non-empty")
    for index, source in enumerate(source_registry):
        _require(source.get("classification") in CLASSIFICATIONS, f"sourceRegistry[{index}] has invalid classification")
        _require(bool(source.get("version")), f"sourceRegistry[{index}] is missing a version/date")
        if source.get("id") != "project-alpha":
            _require(isinstance(source.get("url"), str) and source["url"].startswith("https://ngoalong.vnggames.com/ngoa-long-wiki"), f"sourceRegistry[{index}] must use the official Wiki URL")

    scope = pack.get("gameVersionScope", {})
    _require(scope.get("currentWikiIsMobile") is True, "current Wiki version scope must remain explicit")
    _require(scope.get("classicWebgameParity") == "UNKNOWN", "classic webgame parity must remain UNKNOWN")

    troops = pack.get("troops", {})
    troop_profiles = troops.get("profiles", [])
    troop_ids = {item.get("id") for item in troop_profiles if isinstance(item, dict)}
    _require(troop_ids and len(troop_ids) == len(troop_profiles), "troop profile IDs must be unique")
    for index, troop in enumerate(troop_profiles):
        path = f"troops.profiles[{index}]"
        _provenance(troop.get("provenance"), source_ids, path)
        stats = troop.get("stats")
        _require(isinstance(stats, dict), f"{path}.stats must be an object")
        if troop.get("fieldProvenance", {}).get("stats") == "UNKNOWN":
            _require(all(value is None for value in stats.values()), f"{path}: unknown stats must be null")
        for parent in troop.get("evolvesFrom", []):
            _require(parent in troop_ids, f"{path}: unknown evolvesFrom troop {parent!r}")
    counter_cycle = troops.get("counterCycle", [])
    _require(len(counter_cycle) == 3, "the current project counter cycle must have exactly three edges")
    counter_edges = set()
    for index, edge in enumerate(counter_cycle):
        _require(edge.get("attacker") in troop_ids and edge.get("defender") in troop_ids, f"troops.counterCycle[{index}] references unknown troop")
        _require(edge.get("attacker") != edge.get("defender"), f"troops.counterCycle[{index}] is a self-edge")
        _require(isinstance(edge.get("multiplier"), (int, float)) and edge["multiplier"] > 0, f"troops.counterCycle[{index}] has invalid simulated multiplier")
        _require(isinstance(edge.get("disadvantageMultiplier"), (int, float)) and 0 < edge["disadvantageMultiplier"] <= 1, f"troops.counterCycle[{index}] has invalid reverse multiplier")
        _provenance(edge.get("provenance"), source_ids, f"troops.counterCycle[{index}]")
        counter_edges.add((edge["attacker"], edge["defender"]))
    _require(counter_edges == {("infantry", "spear"), ("spear", "cavalry"), ("cavalry", "infantry")}, "counter cycle differs from the documented current-Wiki relation")

    evolution = pack.get("evolution", {})
    branches = evolution.get("branches", [])
    branch_ids = {branch.get("id") for branch in branches if isinstance(branch, dict)}
    _require(branch_ids and len(branch_ids) == len(branches), "evolution branch IDs must be unique")
    nodes = set(troop_ids) | branch_ids
    edges: list[tuple[str, str]] = []
    for index, branch in enumerate(branches):
        path = f"evolution.branches[{index}]"
        _require(branch.get("category") in troop_ids, f"{path} references an unknown troop category")
        _require(branch.get("outputTroopId", branch.get("troop", branch.get("category"))) in troop_ids, f"{path} outputs an unknown troop")
        _require(isinstance(branch.get("tier"), int) and branch["tier"] > 0, f"{path} needs a positive project evolution tier")
        _provenance(branch.get("provenance"), source_ids, path)
        for parent in branch.get("evolvesFrom", [branch["category"]]):
            edges.append((parent, branch["id"]))
    _assert_acyclic(nodes, edges, "evolution graph")
    _provenance(evolution.get("cost", {}).get("provenance"), source_ids, "evolution.cost")

    statuses = pack.get("statusEffects", {}).get("effects", {})
    _require(statuses, "statusEffects.effects must be non-empty")
    _provenance(pack["statusEffects"].get("provenance"), source_ids, "statusEffects")
    for effect_id, effect in statuses.items():
        _require(isinstance(effect.get("duration"), int) and effect["duration"] > 0, f"status effect {effect_id!r} needs a positive duration")
        _provenance(effect.get("provenance"), source_ids, f"statusEffects.effects.{effect_id}")
        field_provenance = effect.get("fieldProvenance", {})
        _require(all(field_provenance.get(key) in CLASSIFICATIONS for key in effect if key not in {"provenance", "fieldProvenance"}), f"status effect {effect_id!r} has an unclassified field")

    skills = pack.get("skills", {})
    _provenance(skills.get("provenance"), source_ids, "skills")
    for combat_type, skill in skills.get("enemyByCombatType", {}).items():
        _require(combat_type in troop_ids, f"skill references unknown combat type {combat_type!r}")
        _validate_skill(skill, statuses, f"skills.enemyByCombatType.{combat_type}")
        _provenance(skill.get("provenance"), source_ids, f"skills.enemyByCombatType.{combat_type}")
    for skill_id, skill in skills.get("overrides", {}).items():
        _validate_skill(skill, statuses, f"skills.overrides.{skill_id}")
        _provenance(skill.get("provenance"), source_ids, f"skills.overrides.{skill_id}")

    heroes = pack.get("heroes", {})
    _provenance(heroes.get("provenance"), source_ids, "heroes")
    _require(isinstance(heroes.get("profiles"), list), "heroes.profiles must be an array")
    _require(heroes.get("catalogueCoverage") in {"NOT_IMPORTED_IN_ALPHA", "PARTIAL", "COMPLETE"}, "heroes catalogue coverage must be explicit")
    _require(heroes.get("runtimeBinding") == "existing project HEROES registry", "hero runtime binding must make legacy ownership explicit")
    hero_schema = heroes.get("schema", {})
    _require({"id", "category", "level", "stats", "skillIds", "fieldProvenance"}.issubset(hero_schema), "heroes schema is incomplete")
    _require(all(hero_schema["fieldProvenance"].get(field) == "UNKNOWN" for field in ("level", "stats", "skillIds")), "unimported hero fields must remain explicitly UNKNOWN")
    hero_ids: set[str] = set()
    for index, hero in enumerate(heroes["profiles"]):
        _require(isinstance(hero.get("id"), str) and hero["id"] not in hero_ids, f"heroes.profiles[{index}] has duplicate/invalid ID")
        hero_ids.add(hero["id"])
        _provenance(hero.get("provenance"), source_ids, f"heroes.profiles[{index}]")

    formations = pack.get("formations", {})
    _provenance(formations.get("provenance"), source_ids, "formations")
    families = formations.get("families", [])
    plans = formations.get("plans", [])
    family_ids = {family.get("id") for family in families if isinstance(family, dict)}
    plan_ids = {plan.get("key") for plan in plans if isinstance(plan, dict)}
    _require(len(family_ids) == 6 and len(families) == len(family_ids), "formation catalog must retain six unique legacy families")
    _require(len(plan_ids) == 4 and len(plans) == len(plan_ids), "formation catalog must contain four unique tactical plans")
    _require(family_ids == {"spear", "shield", "arc", "fish", "goose", "turtle"}, "formation family IDs must preserve the current Save-compatible IDs")
    _require(plan_ids == {"van", "dieu", "thu", "kich"}, "formation plan IDs must preserve the current Save-compatible IDs")
    for index, family in enumerate(families):
        _provenance(family.get("provenance"), source_ids, f"formations.families[{index}]")
        modifiers = family.get("combatModifiers", {})
        _require(set(modifiers) == {"atk", "def", "int", "crit"} and all(isinstance(value, (int, float)) for value in modifiers.values()), f"formations.families[{index}] has invalid combat modifiers")
    for index, plan in enumerate(plans):
        _provenance(plan.get("provenance"), source_ids, f"formations.plans[{index}]")
        slots = plan.get("slots", [])
        _require(len(slots) == 5 and len(set(slots)) == 5 and all(isinstance(slot, int) and 0 <= slot <= 8 for slot in slots), f"formations.plans[{index}] must place five unique generals on a 3x3 board")
        _require(plan.get("style") in {"pressure", "counter", "protect", "finish"}, f"formations.plans[{index}] has unsupported AI style")
    _require(len(family_ids) * len(plan_ids) == 24, "formation catalog must build exactly 24 legacy preset combinations")

    campaign = pack.get("campaign", {})
    templates = campaign.get("npcUnitTemplates", [])
    template_ids = {template.get("id") for template in templates if isinstance(template, dict)}
    _require(len(template_ids) == len(templates) and len(template_ids) >= 5, "NPC unit template IDs must be unique and include five roles")
    for index, template in enumerate(templates):
        _provenance(template.get("provenance"), source_ids, f"campaign.npcUnitTemplates[{index}]")
    maps = campaign.get("maps", [])
    npcs = campaign.get("npcs", [])
    encounters = campaign.get("encounters", [])
    map_by_id = {item.get("id"): item for item in maps}
    npc_by_id = {item.get("id"): item for item in npcs}
    _require(len(map_by_id) == len(maps) and len(npc_by_id) == len(npcs), "campaign map and NPC IDs must be unique")
    _require(len(encounters) >= 20, "Alpha needs structured encounters for at least 20 stages")
    troop_names = troop_ids
    override_skills = set(skills.get("overrides", {}))
    encounter_stages: set[int] = set()
    for index, game_map in enumerate(maps):
        _provenance(game_map.get("provenance"), source_ids, f"campaign.maps[{index}]")
        _require(game_map.get("stage") == index + 1, f"campaign.maps[{index}] has an invalid stage index")
    for index, npc in enumerate(npcs):
        path = f"campaign.npcs[{index}]"
        _provenance(npc.get("provenance"), source_ids, path)
        _require(npc.get("mapId") in map_by_id, f"{path} references an unknown map")
        _require(npc.get("statProfileId") in campaign.get("statProfiles", {}), f"{path} references an unknown stat profile")
        units = npc.get("units", [])
        _require(0 < len(units) <= 5, f"{path} must contain one to five unit records")
        used_slots: set[int] = set()
        for unit_index, unit in enumerate(units):
            unit_path = f"{path}.units[{unit_index}]"
            _provenance(unit.get("provenance"), source_ids, unit_path)
            _require(unit.get("profileId") in template_ids, f"{unit_path} references an unknown unit template")
            _require(unit.get("troopId") in troop_names, f"{unit_path} references an unknown troop")
            _require(unit.get("skillId") is None or unit.get("skillId") in override_skills, f"{unit_path} references an unknown skill")
            _require(unit.get("heroId") is None, f"{unit_path}: imported NPC heroes are not authorized in this Alpha pack")
            _require(isinstance(unit.get("formationSlot"), int) and 0 <= unit["formationSlot"] <= 8, f"{unit_path} has an invalid 3x3 slot")
            _require(unit["formationSlot"] not in used_slots, f"{unit_path} duplicates a formation slot")
            used_slots.add(unit["formationSlot"])
            _require(unit.get("stats") is None and unit.get("soldiers") is None and unit.get("level") is None, f"{unit_path}: unsourced unit stats, soldier count and level must remain null")
            field_provenance = unit.get("fieldProvenance", {})
            _require(all(field_provenance.get(key) == "UNKNOWN" for key in ("stats", "soldiers", "level")), f"{unit_path}: missing UNKNOWN labels for unsourced fields")
            _require(all(effect in statuses for effect in unit.get("statusEffects", [])), f"{unit_path} references an unknown status effect")
        _require(0 < npc.get("activeCount", 0) <= len(units), f"{path} activeCount must fit its unit list")
    for index, encounter in enumerate(encounters):
        path = f"campaign.encounters[{index}]"
        _provenance(encounter.get("provenance"), source_ids, path)
        stage = encounter.get("stage")
        _require(isinstance(stage, int) and stage > 0 and stage not in encounter_stages, f"{path} has duplicate/invalid stage")
        encounter_stages.add(stage)
        _require(encounter.get("mapId") in map_by_id, f"{path} references an unknown map")
        _require(encounter.get("npcId") in npc_by_id, f"{path} references an unknown NPC")
        _require(map_by_id[encounter["mapId"]].get("unlockAfterStage") == stage - 1, f"{path} map unlock order is not sequential")
        _require(npc_by_id[encounter["npcId"]].get("mapId") == encounter["mapId"], f"{path} NPC belongs to another map")
        _require(npc_by_id[encounter["npcId"]].get("activeCount") == encounter.get("activeCount"), f"{path} activeCount differs from NPC")
        rewards = encounter.get("rewards", {})
        _require(rewards and all(isinstance(v, int) and v >= 0 for v in rewards.values()), f"{path} has invalid rewards")
        _require(isinstance(encounter.get("enemyPower"), (int, float)) and encounter["enemyPower"] > 0, f"{path} has invalid project power")
        for mechanic in encounter.get("mechanics", []):
            _require(mechanic.get("type") in MECHANIC_TYPES, f"{path} uses unsupported mechanic {mechanic.get('type')!r}")
            if mechanic.get("statusId"):
                _require(mechanic["statusId"] in statuses, f"{path} mechanic references unknown status")
            if mechanic.get("targetUnitId"):
                _require(any(unit.get("id") == mechanic["targetUnitId"] for unit in npc_by_id[encounter["npcId"]]["units"]), f"{path} mechanic references unknown unit")
        puzzle = encounter.get("qaExpectations", {}).get("sameSeedFormationPuzzle")
        if puzzle:
            _provenance(puzzle.get("provenance"), source_ids, f"{path}.qaExpectations.sameSeedFormationPuzzle")
            preset_ids = {family_id + "-" + plan_id for family_id in family_ids for plan_id in plan_ids}
            _require(isinstance(puzzle.get("seed"), int) and puzzle.get("losingPreset") in preset_ids and puzzle.get("winningPreset") in preset_ids and puzzle["losingPreset"] != puzzle["winningPreset"], f"{path} has invalid same-seed formation puzzle expectations")
    _require(encounter_stages == set(range(1, len(encounters) + 1)), "campaign stages must be contiguous and sequential")

    _provenance(pack.get("equipment", {}).get("provenance"), source_ids, "equipment")
    for index, slot in enumerate(pack.get("equipment", {}).get("wikiSlots", [])):
        _provenance(slot.get("provenance"), source_ids, f"equipment.wikiSlots[{index}]")
    _provenance(pack.get("research", {}).get("provenance"), source_ids, "research")
    _provenance(pack.get("compatibility", {}).get("provenance"), source_ids, "compatibility")
    _require(pack.get("compatibility", {}).get("saveSchema") == 5, "the Save schema must remain v5")
    return pack


def _validate_skill(skill: dict[str, Any], statuses: dict[str, Any], path: str) -> None:
    _require(skill.get("pattern") in {"single", "double", "row", "column", "all", "back", "heal"}, f"{path} has unsupported skill pattern")
    _require(skill.get("kind") in {"physical", "tactic", "magic"}, f"{path} has unsupported damage lane")
    _require(isinstance(skill.get("mult"), (int, float)) and skill["mult"] > 0, f"{path} has invalid simulated multiplier")
    for field in ("apply", "applyAlly"):
        if skill.get(field):
            _require(skill[field] in statuses, f"{path}.{field} references an unknown status")


def load_pack(root: Path | str) -> dict[str, Any]:
    root = Path(root)
    with (root / PACK_RELATIVE_PATH).open(encoding="utf-8") as handle:
        pack = json.load(handle)
    return validate_pack(pack)


def runtime_pack(pack: dict[str, Any]) -> dict[str, Any]:
    """Return the same validated pack for offline embedding and browser provenance QA."""
    return pack
