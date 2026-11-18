"""NL data schema, provenance, reference-graph and unlock progression gate."""
from __future__ import annotations

import copy
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from ngoalong_data import DataPackError, load_pack, validate_pack  # noqa: E402


checks: list[tuple[str, bool]] = []


def check(name: str, condition: bool) -> None:
    checks.append((name, bool(condition)))
    print(("PASS " if condition else "FAIL ") + name, flush=True)


def rejected(pack: dict) -> bool:
    try:
        validate_pack(pack)
    except DataPackError:
        return True
    return False


def run() -> int:
    pack = load_pack(ROOT)
    check("pack is versioned and explicitly separates current Mobile Wiki from classic parity", pack["schemaVersion"] == 1 and pack["gameVersionScope"] == {"target": "Mưu Định Tam Quốc standalone alpha", "classicWebgameParity": "UNKNOWN", "currentWikiIsMobile": True})
    check("all unknown troop stats remain null and generic categories have provenance", all(t["stats"] and all(value is None for value in t["stats"].values()) and t["provenance"].get("classification") in {"VERIFIED", "SIMULATED"} for t in pack["troops"]["profiles"]))
    wiki_groups = pack["troops"]["wikiGroupAudit"]
    check("current Wiki troop audit records all eight filters with VERIFIED labels and project-owned Alpha scope", wiki_groups["displayedEntryCount"] == 73 and wiki_groups["fieldProvenance"] == {"sourceId": "VERIFIED", "checkedAt": "VERIFIED", "displayedEntryCount": "VERIFIED", "note": "DERIVED"} and all(group["fieldProvenance"] == {"id": "DERIVED", "label": "VERIFIED", "alphaInScope": "SIMULATED"} for group in wiki_groups["groups"]) and {group["id"] for group in wiki_groups["groups"] if group["alphaInScope"]} == {"infantry", "spear", "cavalry", "archer", "strategist"} and {group["id"] for group in wiki_groups["groups"] if not group["alphaInScope"]} == {"ship-small", "ship-medium", "ship-large"})
    out_of_scope_troop = copy.deepcopy(pack)
    next(group for group in out_of_scope_troop["troops"]["wikiGroupAudit"]["groups"] if group["id"] == "ship-small")["alphaInScope"] = True
    check("validator rejects an out-of-scope ship category promoted into the five-group Alpha", rejected(out_of_scope_troop))
    mismatched_wiki_label = copy.deepcopy(pack)
    mismatched_wiki_label["troops"]["profiles"][0]["wikiGroup"] = "Thương Binh"
    check("validator rejects a playable troop label that disagrees with the source-group audit", rejected(mismatched_wiki_label))
    misclassified_scope = copy.deepcopy(pack)
    misclassified_scope["troops"]["wikiGroupAudit"]["groups"][0]["fieldProvenance"]["alphaInScope"] = "VERIFIED"
    check("validator rejects project Alpha scope mislabeled as a Wiki-verified fact", rejected(misclassified_scope))
    check("hero schema is ready while unimported hero fields stay explicitly UNKNOWN", not pack["heroes"]["profiles"] and pack["heroes"]["catalogueCoverage"] == "NOT_IMPORTED_IN_ALPHA" and all(pack["heroes"]["schema"]["fieldProvenance"][field] == "UNKNOWN" for field in ("level", "stats", "skillIds")))
    roster = pack["heroes"]["projectRoster"]
    check("existing runtime hero roster is data-driven with simulated per-field provenance, separate from Wiki profiles", len(roster) == 14 and not pack["heroes"]["profiles"] and all(hero["provenance"]["classification"] == "SIMULATED" and all(value == "SIMULATED" for value in hero["fieldProvenance"].values()) for hero in roster))
    hero_skills = pack["skills"]["heroById"]
    check("each existing project hero has a validated simulated combat descriptor in the shared skill catalog", set(hero_skills) == {hero["id"] for hero in roster} and all(skill["provenance"]["classification"] == "SIMULATED" for skill in hero_skills.values()))
    formations = pack["formations"]
    check("six data-driven formation families and four plans preserve all 24 Save IDs", len(formations["families"]) == 6 and len(formations["plans"]) == 4 and len({f["id"]+"-"+p["key"] for f in formations["families"] for p in formations["plans"]}) == 24 and all(len(p["slots"]) == 5 and len(set(p["slots"])) == 5 for p in formations["plans"]))
    check("current Wiki counter direction is data-backed while both project multipliers are explicit", len(pack["troops"]["counterCycle"]) == 3 and all(e["multiplier"] == 1.22 and e["disadvantageMultiplier"] == 0.82 and e["provenance"]["appliedFormula"] == "SIMULATED project multiplier" for e in pack["troops"]["counterCycle"]))
    check("evolution branches resolve to catalog troop categories and have unique IDs", len({b["id"] for b in pack["evolution"]["branches"]}) == len(pack["evolution"]["branches"]) and all(b["outputTroopId"] in {t["id"] for t in pack["troops"]["profiles"]} for b in pack["evolution"]["branches"]))
    check("V1 playable troop catalog closes at 25 base/evolved definitions with branch choices across five core classes", len(pack["troops"]["profiles"]) + len(pack["evolution"]["branches"]) == 25 and all(sum(branch["category"] == kind for branch in pack["evolution"]["branches"]) >= 2 for kind in ("infantry", "spear", "cavalry", "archer", "strategist")))
    check("first 20 Alpha stages contain structured 3x3 NPC unit records", all(len(pack["campaign"]["npcs"][i]["units"]) == 5 and all(isinstance(u["formationSlot"], int) and u["heroId"] is None and u["stats"] is None and u["soldiers"] is None for u in pack["campaign"]["npcs"][i]["units"]) for i in range(20)))
    check("all Alpha map unlocks, NPC references and settlement reward records are sequential", len(pack["campaign"]["maps"]) >= 20 and all(e["stage"] == i + 1 and e["rewards"] for i, e in enumerate(pack["campaign"]["encounters"])))
    chapters = pack["campaign"]["chapters"]
    check("multi-NPC chapters partition all campaign encounters without changing stage IDs",
          len(chapters) == 8 and all(len(chapter["encounterIds"]) >= 2 for chapter in chapters)
          and [id for chapter in chapters for id in chapter["encounterIds"]]
          == [encounter["id"] for encounter in pack["campaign"]["encounters"]])
    chapter_bosses = [next(encounter for encounter in pack["campaign"]["encounters"] if encounter["id"] == chapter["encounterIds"][-1]) for chapter in chapters]
    check("each of eight chapter finales is a distinct simulated boss encounter and stage 28 ends the campaign", len(chapter_bosses) == 8 and all(encounter["boss"] and encounter["bossProvenance"]["classification"] == "SIMULATED" for encounter in chapter_bosses) and pack["campaign"]["encounters"][-1] == chapter_bosses[-1])
    bad_chapter = copy.deepcopy(pack)
    bad_chapter["campaign"]["chapters"][0]["encounterIds"][1] = bad_chapter["campaign"]["chapters"][0]["encounterIds"][0]
    check("validator rejects duplicate chapter NPC encounter", rejected(bad_chapter))
    check("status catalog contains the existing common combat effects", {"break", "guard", "daze", "burn", "morale-seal"}.issubset(pack["statusEffects"]["effects"]))
    burn = pack["statusEffects"]["effects"]["burn"]
    check("status timing and stack layers are catalog-driven with simulated provenance", all(effect["stackingPolicy"] in {"refresh-longer", "add-stack"} and effect["expirePhase"] in {"round-end", "owner-action"} and all(effect["fieldProvenance"][key] == "SIMULATED" for key in ("stackingPolicy", "expirePhase", "removeAfterOwnAction")) for effect in pack["statusEffects"]["effects"].values()) and burn["roundEndDamageFraction"] == .045 and burn["stackLimit"] == 3 and burn["stackModifiers"] == {"roundEndDamageFraction": .005} and all(burn["fieldProvenance"][key] == "SIMULATED" for key in ("stackLimit", "stackModifiers")))
    status_catalog = pack["statusEffects"]["effects"]
    check("status polarity, cleansing policy and immunity policy are explicit project rules", all(effect["polarity"] in {"beneficial", "harmful", "neutral"} and effect["dispelPolicy"] in {"removable", "unremovable"} and effect["fieldProvenance"]["polarity"] == effect["fieldProvenance"]["dispelPolicy"] == "SIMULATED" for effect in status_catalog.values()) and status_catalog["ward"]["dispelPolicy"] == "unremovable" and status_catalog["ward"]["immunityPolarity"] == "harmful" and status_catalog["ward"]["fieldProvenance"]["immunityPolarity"] == "SIMULATED" and hero_skills["liu"]["cleanseNegative"] == 1 and hero_skills["liu"]["applyAlly"] == "ward")
    check("seven Wiki slots stay separate from original project equipment and research catalogs", len(pack["equipment"]["wikiSlots"]) == 7 and len(pack["equipment"]["projectItems"]) == 19 and len(pack["research"]["systemIds"]) == len(pack["research"]["catalog"]) == 8 and all(item["provenance"]["classification"] == "SIMULATED" for item in pack["equipment"]["projectItems"] + pack["research"]["catalog"]))
    check("Save v5 and legacy CL compatibility are explicit", pack["compatibility"]["saveSchema"] == 5 and pack["compatibility"]["cltq"] == "left in existing runtime")

    broken_ref = copy.deepcopy(pack)
    broken_ref["campaign"]["npcs"][0]["units"][0]["troopId"] = "missing-troop"
    check("validator rejects NPCs with dangling troop references", rejected(broken_ref))
    broken_recommendation = copy.deepcopy(pack)
    broken_recommendation["campaign"]["encounters"][4]["recommendedPreparation"]["recommendedPreset"] = "nonexistent-preset"
    check("validator rejects a dangling recommended formation preset", rejected(broken_recommendation))
    broken_choice = copy.deepcopy(pack)
    broken_choice["campaign"]["encounters"][24]["qaExpectations"]["sameSeedFormationChoice"]["lowerLossPreset"] = "nonexistent-preset"
    check("validator rejects a dangling same-seed formation choice preset", rejected(broken_choice))
    bad_slot = copy.deepcopy(pack)
    bad_slot["campaign"]["npcs"][0]["units"][1]["formationSlot"] = bad_slot["campaign"]["npcs"][0]["units"][0]["formationSlot"]
    check("validator rejects duplicate 3x3 positions", rejected(bad_slot))
    bad_unlock = copy.deepcopy(pack)
    bad_unlock["campaign"]["maps"][1]["unlockAfterStage"] = 0
    check("validator rejects broken map unlock progression", rejected(bad_unlock))
    cycle = copy.deepcopy(pack)
    cycle["evolution"]["branches"][0]["evolvesFrom"] = [cycle["evolution"]["branches"][0]["id"]]
    check("validator rejects cyclic troop evolution references", rejected(cycle))
    unknown = copy.deepcopy(pack)
    unknown["troops"]["profiles"][0]["stats"]["physicalAttack"] = 1
    check("validator rejects invented values on fields marked UNKNOWN", rejected(unknown))
    invalid_plan = copy.deepcopy(pack)
    invalid_plan["formations"]["plans"][0]["slots"][1] = 2
    check("validator rejects overlapping formation deployment slots", rejected(invalid_plan))
    invalid_hero_schema = copy.deepcopy(pack)
    invalid_hero_schema["heroes"]["schema"].pop("stats")
    check("validator rejects incomplete future hero catalog schemas", rejected(invalid_hero_schema))
    invalid_roster = copy.deepcopy(pack)
    invalid_roster["heroes"]["projectRoster"][0]["fieldProvenance"]["atk"] = "VERIFIED"
    check("validator rejects unsupported hero stats provenance", rejected(invalid_roster))
    missing_hero_skill = copy.deepcopy(pack)
    missing_hero_skill["skills"]["heroById"].pop(roster[0]["id"])
    check("validator rejects a missing per-hero combat skill descriptor", rejected(missing_hero_skill))
    invalid_status_policy = copy.deepcopy(pack)
    invalid_status_policy["statusEffects"]["effects"]["burn"]["stackingPolicy"] = "invented-stack"
    check("validator rejects unknown status lifecycle policies", rejected(invalid_status_policy))
    invalid_stack_limit = copy.deepcopy(pack)
    invalid_stack_limit["statusEffects"]["effects"]["burn"]["stackLimit"] = 100
    check("validator rejects unbounded status stacks", rejected(invalid_stack_limit))
    invalid_dispel_policy = copy.deepcopy(pack)
    invalid_dispel_policy["statusEffects"]["effects"]["ward"]["dispelPolicy"] = "sometimes"
    check("validator rejects unknown cleanse/immunity lifecycle policy", rejected(invalid_dispel_policy))
    invalid_cleanse = copy.deepcopy(pack)
    invalid_cleanse["skills"]["heroById"]["liu"]["cleanseNegative"] = 0
    check("validator rejects invalid data-driven cleanse counts", rejected(invalid_cleanse))

    failed = [name for name, passed in checks if not passed]
    report = {
        "milestone": "NL-DATA-P1-P3",
        "schemaVersion": pack["schemaVersion"],
        "sourceScope": pack["gameVersionScope"],
        "counts": {
            "troops": len(pack["troops"]["profiles"]),
            "evolutions": len(pack["evolution"]["branches"]),
            "statuses": len(pack["statusEffects"]["effects"]),
            "maps": len(pack["campaign"]["maps"]),
            "npcs": len(pack["campaign"]["npcs"]),
            "stages": len(pack["campaign"]["encounters"]),
        },
        "sourceSha256": hashlib.sha256((ROOT / "data/ngoalong/alpha_content.json").read_bytes()).hexdigest(),
        "passed": len(checks) - len(failed),
        "total": len(checks),
        "failed": failed,
    }
    (ROOT / "qa" / "NL_DATA.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"NL data QA: {len(checks) - len(failed)}/{len(checks)} passed; failed={failed}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(run())
