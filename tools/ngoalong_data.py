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
    group_audit = troops.get("wikiGroupAudit", {})
    _require(group_audit.get("sourceId") in source_ids, "troops.wikiGroupAudit needs a registered source")
    _require(group_audit.get("checkedAt") and isinstance(group_audit.get("displayedEntryCount"), int) and group_audit["displayedEntryCount"] > 0, "troops.wikiGroupAudit needs a dated page count")
    audit_field_provenance = group_audit.get("fieldProvenance", {})
    _require(audit_field_provenance == {"sourceId": "VERIFIED", "checkedAt": "VERIFIED", "displayedEntryCount": "VERIFIED", "note": "DERIVED"}, "troops.wikiGroupAudit fields need explicit per-field provenance")
    audited_groups = group_audit.get("groups", [])
    group_ids = {group.get("id") for group in audited_groups if isinstance(group, dict)}
    _require(len(group_ids) == len(audited_groups) and len(group_ids) == 8, "troops.wikiGroupAudit must preserve the eight visible Wiki group filters")
    _require(all(isinstance(group.get("label"), str) and group["label"] and isinstance(group.get("alphaInScope"), bool) for group in audited_groups), "troops.wikiGroupAudit groups need a label and explicit Alpha scope")
    _require(all(group.get("fieldProvenance") == {"id": "DERIVED", "label": "VERIFIED", "alphaInScope": "SIMULATED"} for group in audited_groups), "troops.wikiGroupAudit group fields need source-vs-project provenance")
    audited_alpha_groups = {group["id"] for group in audited_groups if group["alphaInScope"]}
    _require(audited_alpha_groups == {"infantry", "spear", "cavalry", "archer", "strategist"}, "Alpha troop scope differs from the five researched core groups")
    profiles_by_id = {item["id"]: item for item in troop_profiles}
    _require(all(group_id in profiles_by_id and profiles_by_id[group_id].get("wikiGroup") == next(group["label"] for group in audited_groups if group["id"] == group_id) for group_id in audited_alpha_groups), "Alpha troop profiles do not match audited Wiki group labels")
    _require(not (group_ids - audited_alpha_groups) & troop_ids, "out-of-scope Wiki groups must not enter the Alpha troop catalog")
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
    _require(len(troop_profiles) + len(branches) == 25,
             "Ngọa Long V1 needs exactly 25 playable base/evolved troop definitions")
    branch_categories = {category: [branch for branch in branches if branch.get("category") == category]
                         for category in ("infantry", "spear", "cavalry", "archer", "strategist", "support")}
    _require(all(len(branch_categories[key]) >= 2 for key in ("infantry", "spear", "cavalry", "archer", "strategist")),
             "each core troop class needs multiple actual evolution branches")
    _provenance(evolution.get("cost", {}).get("provenance"), source_ids, "evolution.cost")

    statuses = pack.get("statusEffects", {}).get("effects", {})
    _require(statuses, "statusEffects.effects must be non-empty")
    _provenance(pack["statusEffects"].get("provenance"), source_ids, "statusEffects")
    for effect_id, effect in statuses.items():
        _require(isinstance(effect.get("duration"), int) and effect["duration"] > 0, f"status effect {effect_id!r} needs a positive duration")
        _require(effect.get("polarity") in {"beneficial", "harmful", "neutral"}, f"status effect {effect_id!r} needs an explicit polarity")
        _require(effect.get("dispelPolicy") in {"removable", "unremovable"}, f"status effect {effect_id!r} needs an explicit dispelPolicy")
        if "immunityPolarity" in effect:
            _require(effect["immunityPolarity"] in {"beneficial", "harmful", "neutral"}, f"status effect {effect_id!r} has invalid immunity polarity")
        _provenance(effect.get("provenance"), source_ids, f"statusEffects.effects.{effect_id}")
        field_provenance = effect.get("fieldProvenance", {})
        _require(all(field_provenance.get(key) in CLASSIFICATIONS for key in effect if key not in {"provenance", "fieldProvenance"}), f"status effect {effect_id!r} has an unclassified field")
        _require(effect.get("stackingPolicy") in {"refresh-longer", "replace-duration", "add-stack"}, f"status effect {effect_id!r} has unsupported stackingPolicy")
        if effect["stackingPolicy"] == "add-stack":
            _require(isinstance(effect.get("stackLimit"), int) and 1 < effect["stackLimit"] <= 99, f"status effect {effect_id!r} needs a bounded stackLimit")
            stack_modifiers = effect.get("stackModifiers", {})
            allowed_stack_fields = {"outgoingDamageMultiplier", "incomingDefenseMultiplier", "moraleGainMultiplier", "skipActionChance", "roundEndDamageFraction"}
            _require(isinstance(stack_modifiers, dict) and set(stack_modifiers).issubset(allowed_stack_fields) and all(field in effect and isinstance(value, (int, float)) and not isinstance(value, bool) for field, value in stack_modifiers.items()), f"status effect {effect_id!r} has invalid stackModifiers")
        else:
            _require("stackLimit" not in effect and "stackModifiers" not in effect, f"status effect {effect_id!r} has stack metadata without add-stack policy")
        _require(effect.get("expirePhase") in {"round-end", "owner-action"} and isinstance(effect.get("removeAfterOwnAction"), bool), f"status effect {effect_id!r} has invalid lifecycle metadata")
        _require(effect["removeAfterOwnAction"] == (effect["expirePhase"] == "owner-action"), f"status effect {effect_id!r} lifecycle flags conflict")
        if "roundEndDamageFraction" in effect:
            _require(effect["expirePhase"] == "round-end" and isinstance(effect["roundEndDamageFraction"], (int, float)) and effect["roundEndDamageFraction"] > 0, f"status effect {effect_id!r} has invalid round-end damage")

    skills = pack.get("skills", {})
    _provenance(skills.get("provenance"), source_ids, "skills")
    for combat_type, skill in skills.get("enemyByCombatType", {}).items():
        _require(combat_type in troop_ids, f"skill references unknown combat type {combat_type!r}")
        _validate_skill(skill, statuses, f"skills.enemyByCombatType.{combat_type}")
        _provenance(skill.get("provenance"), source_ids, f"skills.enemyByCombatType.{combat_type}")
    for skill_id, skill in skills.get("overrides", {}).items():
        _validate_skill(skill, statuses, f"skills.overrides.{skill_id}")
        _provenance(skill.get("provenance"), source_ids, f"skills.overrides.{skill_id}")
    hero_ids_for_skills = {hero.get("id") for hero in pack.get("heroes", {}).get("projectRoster", [])}
    hero_skills = skills.get("heroById", {})
    _require(isinstance(hero_skills, dict) and set(hero_skills) == hero_ids_for_skills, "hero combat skill catalog must bind every project roster hero exactly once")
    for hero_id, skill in hero_skills.items():
        path = f"skills.heroById.{hero_id}"
        _validate_skill(skill, statuses, path)
        _provenance(skill.get("provenance"), source_ids, path)
        _require(skill["provenance"].get("classification") == "SIMULATED", f"{path} must remain an original simulated project descriptor")
        if "healCount" in skill:
            _require(isinstance(skill["healCount"], int) and skill["healCount"] > 0, f"{path}.healCount must be positive")
        for field in ("pierce", "crit", "bonusMorale", "drainMorale", "applyChance"):
            if field in skill:
                _require(isinstance(skill[field], (int, float)), f"{path}.{field} must be numeric")

    heroes = pack.get("heroes", {})
    _provenance(heroes.get("provenance"), source_ids, "heroes")
    _require(isinstance(heroes.get("profiles"), list), "heroes.profiles must be an array")
    _require(heroes.get("catalogueCoverage") in {"NOT_IMPORTED_IN_ALPHA", "PARTIAL", "COMPLETE"}, "heroes catalogue coverage must be explicit")
    _require(heroes.get("runtimeBinding") == "existing project HEROES registry", "hero runtime binding must make legacy ownership explicit")
    hero_schema = heroes.get("schema", {})
    _require({"id", "category", "level", "stats", "skillIds", "fieldProvenance"}.issubset(hero_schema), "heroes schema is incomplete")
    _require(all(hero_schema["fieldProvenance"].get(field) == "UNKNOWN" for field in ("level", "stats", "skillIds")), "unimported hero fields must remain explicitly UNKNOWN")
    project_roster = heroes.get("projectRoster", [])
    _require(isinstance(project_roster, list), "heroes.projectRoster must be an array")
    runtime_hero_ids: set[str] = set()
    for index, hero in enumerate(project_roster):
        path = f"heroes.projectRoster[{index}]"
        _require(isinstance(hero.get("id"), str) and hero["id"] not in runtime_hero_ids, f"{path} has duplicate/invalid ID")
        runtime_hero_ids.add(hero["id"])
        _require(hero.get("type") in {"infantry", "cavalry", "archer", "strategist", "support"}, f"{path} has invalid combat type")
        _require(all(isinstance(hero.get(field), str) and hero[field] for field in ("name", "role", "rarity", "icon", "skill", "skillDesc")), f"{path} has incomplete runtime text fields")
        _require(all(isinstance(hero.get(field), int) and 0 <= hero[field] <= 100 for field in ("lead", "atk", "def", "int", "agi")), f"{path} has invalid simulated stats")
        _provenance(hero.get("provenance"), source_ids, path)
        _require(hero["provenance"].get("classification") == "SIMULATED", f"{path} must remain project-authored SIMULATED data")
        _require(set(hero.get("fieldProvenance", {})) == set(hero) - {"provenance", "fieldProvenance"} and all(value == "SIMULATED" for value in hero["fieldProvenance"].values()), f"{path} needs per-field SIMULATED provenance")
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
        recommendation = encounter.get("recommendedPreparation")
        if recommendation:
            _provenance(recommendation.get("provenance"), source_ids, f"{path}.recommendedPreparation")
            _require(1 <= recommendation.get("minimumGenerals", 0) <= 5, f"{path} has invalid recommended general count")
            _require(1 <= recommendation.get("averageHeroLevel", 0) <= 40, f"{path} has invalid recommended average hero level")
            recommended_preset = recommendation.get("recommendedPreset")
            if recommended_preset is not None:
                _require(recommended_preset in {family_id + "-" + plan_id for family_id in family_ids for plan_id in plan_ids}, f"{path} recommends an unknown formation preset")
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
        formation_choice = encounter.get("qaExpectations", {}).get("sameSeedFormationChoice")
        if formation_choice:
            _provenance(formation_choice.get("provenance"), source_ids, f"{path}.qaExpectations.sameSeedFormationChoice")
            preset_ids = {family_id + "-" + plan_id for family_id in family_ids for plan_id in plan_ids}
            _require(isinstance(formation_choice.get("seed"), int) and formation_choice.get("lowerLossPreset") in preset_ids and formation_choice.get("higherLossPreset") in preset_ids and formation_choice["lowerLossPreset"] != formation_choice["higherLossPreset"], f"{path} has invalid same-seed formation choice expectations")
            _require(isinstance(formation_choice.get("minimumCasualtyGap"), int) and formation_choice["minimumCasualtyGap"] > 0, f"{path} has invalid minimum formation casualty gap")
    _require(encounter_stages == set(range(1, len(encounters) + 1)), "campaign stages must be contiguous and sequential")
    chapters = campaign.get("chapters", [])
    _require(len(chapters) >= 2, "campaign needs multiple multi-NPC chapters")
    chapter_ids: set[str] = set()
    valid_encounter_ids = {entry["id"] for entry in encounters}
    route: list[str] = []
    for chapter_index, chapter in enumerate(chapters):
        path = f"campaign.chapters[{chapter_index}]"
        _provenance(chapter.get("provenance"), source_ids, path)
        chapter_id = chapter.get("id")
        _require(isinstance(chapter_id, str) and chapter_id and chapter_id not in chapter_ids, f"{path} has a missing/duplicate ID")
        chapter_ids.add(chapter_id)
        _require(isinstance(chapter.get("name"), str) and chapter["name"], f"{path} needs a name")
        ids = chapter.get("encounterIds")
        _require(isinstance(ids, list) and len(ids) >= 2, f"{path} must group at least two NPC battles")
        _require(all(isinstance(key, str) and key in valid_encounter_ids for key in ids), f"{path} references an unknown encounter")
        route.extend(ids)
        chapter_encounters = [entry for entry in encounters if entry["id"] in set(ids)]
        _require(all(isinstance(entry.get("boss"), bool) for entry in chapter_encounters),
                 f"{path} must label its boss encounter")
        _require([entry["id"] for entry in chapter_encounters if entry["boss"]] == [ids[-1]],
                 f"{path} needs exactly one final boss at the end of its route")
        _require(bool(chapter_encounters[-1].get("bossRule")) and chapter_encounters[-1].get("bossProvenance", {}).get("classification") == "SIMULATED",
                 f"{path} final boss needs a simulated combat rule")
    _require(route == [entry["id"] for entry in encounters],
             "chapter NPC route must cover every existing encounter once and in the original Save order")

    equipment = pack.get("equipment", {})
    _provenance(equipment.get("provenance"), source_ids, "equipment")
    wiki_slots = equipment.get("wikiSlots", [])
    wiki_slot_ids = {slot.get("id") for slot in wiki_slots if isinstance(slot, dict)}
    _require(len(wiki_slot_ids) == len(wiki_slots) and wiki_slot_ids, "equipment Wiki slot IDs must be unique")
    for index, slot in enumerate(wiki_slots):
        _provenance(slot.get("provenance"), source_ids, f"equipment.wikiSlots[{index}]")
    slot_aliases = equipment.get("legacySlotAliases", {})
    _require(all(target in wiki_slot_ids for target in slot_aliases.values()), "equipment legacy slot alias targets an unknown Wiki slot")
    project_items = equipment.get("projectItems", [])
    item_ids = {item.get("id") for item in project_items if isinstance(item, dict)}
    _require(len(item_ids) == len(project_items) and item_ids, "equipment project item IDs must be unique and non-empty")
    for index, item in enumerate(project_items):
        path = f"equipment.projectItems[{index}]"
        _provenance(item.get("provenance"), source_ids, path)
        _require(item.get("slot") in wiki_slot_ids or item.get("slot") in slot_aliases, f"{path} references an unknown or unmapped slot")
        _require(item.get("rarity") in {"Thường", "Hiếm", "Truyền kỳ"}, f"{path} has an unsupported project rarity")
        stats = item.get("stats", {})
        _require(set(stats) == {"atk", "def", "int", "hp", "tdef", "mdef"} and all(isinstance(value, (int, float)) and value >= 0 for value in stats.values()), f"{path} has invalid project stats")
        cost = item.get("cost", {})
        _require(set(cost) == {"silver", "iron", "prestige"} and all(isinstance(value, int) and value >= 0 for value in cost.values()), f"{path} has invalid purchase cost")
        _require(all(item.get("fieldProvenance", {}).get(field) == "SIMULATED" for field in ("name", "icon", "slot", "rarity", "stats", "cost")), f"{path} must label project-authored fields SIMULATED")
    equipment_progression = equipment.get("progression", {})
    _provenance(equipment_progression.get("provenance"), source_ids, "equipment.progression")
    reinforcement = equipment_progression.get("reinforcement", {})
    _provenance(reinforcement.get("provenance"), source_ids, "equipment.progression.reinforcement")
    _require(isinstance(reinforcement.get("maxLevel"), int) and reinforcement["maxLevel"] >= 1, "equipment reinforcement maxLevel must be positive")
    _require(isinstance(reinforcement.get("statBonusPerLevel"), (int, float)) and reinforcement["statBonusPerLevel"] >= 0, "equipment reinforcement bonus is invalid")
    reinforcement_cost = reinforcement.get("cost", {})
    _require(all(isinstance(reinforcement_cost.get(key), (int, float)) and reinforcement_cost[key] >= 0 for key in ("silverBase", "silverLevelExponent", "ironBase", "ironLevelExponent")), "equipment reinforcement cost formula is invalid")

    research = pack.get("research", {})
    _provenance(research.get("provenance"), source_ids, "research")
    system_ids = research.get("systemIds", [])
    catalog = research.get("catalog", [])
    catalog_ids = {tech.get("id") for tech in catalog if isinstance(tech, dict)}
    _require(len(system_ids) == len(set(system_ids)) and len(catalog_ids) == len(catalog) and catalog_ids == set(system_ids), "research catalog must preserve every unique legacy Save ID exactly once")
    supported_effects = {"atkMultiplierBonus", "catkMultiplierBonus", "defMultiplierBonus", "matkMultiplierBonus", "hpMultiplierBonus", "grainProductionMultiplierBonus", "silverProductionMultiplierBonus", "startingMoraleFlat", "reserveCapacityFlat"}
    for index, tech in enumerate(catalog):
        path = f"research.catalog[{index}]"
        _provenance(tech.get("provenance"), source_ids, path)
        _require(isinstance(tech.get("maxLevel"), int) and tech["maxLevel"] > 0, f"{path} maxLevel must be positive")
        _require(tech.get("effects"), f"{path} needs at least one data-defined gameplay effect")
        for effect in tech["effects"]:
            _require(effect.get("target") in supported_effects and isinstance(effect.get("valuePerLevel"), (int, float)), f"{path} has an unsupported research effect")
    research_progression = research.get("progression", {})
    _provenance(research_progression.get("provenance"), source_ids, "research.progression")
    _require(isinstance(research_progression.get("academyLevelsPerTechLevel"), int) and research_progression["academyLevelsPerTechLevel"] > 0, "research academy gate is invalid")
    for resource, formula in research_progression.get("cost", {}).items():
        _require(resource in {"silver", "iron", "prestige"} and all(isinstance(formula.get(key), (int, float)) and formula[key] >= 0 for key in ("base", "nextLevelExponent")), f"research cost formula for {resource} is invalid")

    training = heroes.get("training", {})
    _provenance(training.get("provenance"), source_ids, "heroes.training")
    _require(all(isinstance(training.get(key), int) and training[key] > 0 for key in ("silverCost", "baseXp", "academyXpPerLevel", "maxLevel", "xpRequiredPerHeroLevel")), "hero training progression config is incomplete")
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
    if "cleanseNegative" in skill:
        _require(skill.get("pattern") == "heal" and isinstance(skill["cleanseNegative"], int) and skill["cleanseNegative"] > 0, f"{path}.cleanseNegative must be a positive count on a healing skill")


def load_pack(root: Path | str) -> dict[str, Any]:
    root = Path(root)
    with (root / PACK_RELATIVE_PATH).open(encoding="utf-8") as handle:
        pack = json.load(handle)
    return validate_pack(pack)


def runtime_pack(pack: dict[str, Any]) -> dict[str, Any]:
    """Return the same validated pack for offline embedding and browser provenance QA."""
    return pack
