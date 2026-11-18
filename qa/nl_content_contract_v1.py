#!/usr/bin/env python3
"""NL V1 content contract: authentic dataset joins, strict opt-in, mutation safety."""
from __future__ import annotations

import copy
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from nl_content_contract_v1 import (  # noqa: E402
    ContentContractError, compile_content, compile_from_disk, load_sources,
)

passed = 0


def check(label: str, ok: bool) -> None:
    global passed
    print(("PASS " if ok else "FAIL ") + label, flush=True)
    if not ok:
        raise AssertionError(label)
    passed += 1


def rejects(packs: dict) -> bool:
    try:
        compile_content(packs)
    except ContentContractError:
        return True
    return False


def main() -> int:
    packs = load_sources()
    previous = json.dumps(packs, ensure_ascii=False, sort_keys=True)
    catalogue = compile_from_disk()
    coverage = catalogue["coverage"]
    check("all Wiki troop references have one mechanical profile",
          coverage["troops"] == coverage["troopMechanicProfiles"])
    check("effect bridge only uses known troops/effects",
          coverage["troopEffectEvents"] >= coverage["troopEffectResolvedReferences"])
    check("Mobile Wiki records cannot become playable automatically",
          all(not row["runtimeEnabled"] for entries in catalogue["references"].values() for row in entries)
          and catalogue["gates"]["bulkWikiActivationAllowed"] is False)
    check("all runtime gameplay categories share a stable ID index",
          all(catalogue["runtimeIds"][key] for key in ("troops", "playableTroops", "heroes", "skills", "effects", "equipment", "research", "maps", "npcs", "encounters")))
    check("compiled playable troop catalogue resolves all 25 base and evolved gameplay identities",
          coverage.get("runtimePlayableTroops") == 25 and len(catalogue["runtimeIds"]["playableTroops"]) == 25)
    check("project content and references remain separate",
          set(catalogue["runtimeIds"]["troops"]).isdisjoint(
              row["id"] for row in catalogue["references"]["troops"]))
    check("source catalogue compilation does not mutate references or active game",
          json.dumps(packs, ensure_ascii=False, sort_keys=True) == previous)
    check("dungeon totals and incomplete teams are preserved without fabricating NPC stats",
          coverage["wikiNpcFormationsRecorded"] + coverage["wikiNpcFormationsMissing"] == coverage["wikiNpcDetailRows"]
          and catalogue["gates"]["wikiToRuntimeLinksApproved"] == 0)

    invalid = copy.deepcopy(packs)
    invalid["troops_extra"]["units"][0]["id"] = invalid["troops_main"]["units"][0]["id"]
    check("cross-source duplicate IDs fail", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["troop_mechanics"]["records"][0]["unitId"] = "missing-troop"
    check("orphan mechanics fail", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["effect_bridge"]["events"][0]["canonicalEffectId"] = "missing-effect"
    check("orphan effect edges fail", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["effect_bridge"]["events"][0]["runtimeEnabled"] = True
    check("unsafe Wiki effect activation fails", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["heroes"]["heroes"][0]["integration"] = "PLAYABLE"
    check("unapproved Wiki hero activation fails", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["dungeon_report"]["fullNpcFormationCount"] += 1
    check("mismatched dungeon sums fail", rejects(invalid))
    invalid = copy.deepcopy(packs)
    invalid["runtime"]["campaign"]["encounters"][0]["npcId"] = "__absent__"
    check("broken live encounter links fail", rejects(invalid))
    with tempfile.TemporaryDirectory() as temp:
        path = Path(temp) / "content_index_v1.json"
        output = json.dumps(catalogue, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        path.write_text(output, encoding="utf-8")
        check("compiled index round-trips deterministically",
              json.loads(path.read_text(encoding="utf-8")) == catalogue)
    print(json.dumps({"status": "PASS", "checks": passed, "wikiRecordsPlayable": False}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
