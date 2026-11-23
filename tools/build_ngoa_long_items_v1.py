#!/usr/bin/env python3
"""Deterministic Group08 equipment integration into canonical offline HTML.

Consumes Group04 catalogue, rules, pure engine and UI. Does not copy source
pixels, VNG formulas or network resources. In-place build after R02/R03/R04.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DATA = ROOT / "data/ngoalong/modules/inventory"
TOOLS = ROOT / "tools"
BEGIN = "// === NL-ITEMS-INJECTED-BY-BUILDER ==="
END = "// === END-NL-ITEMS-INJECTED-BY-BUILDER ==="
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"


def payload() -> str:
    catalogue = json.loads((DATA / "catalogue.json").read_text(encoding="utf-8"))
    rules = json.loads((DATA / "rules.json").read_text(encoding="utf-8"))
    from nl_classic_phase_a3_items import project_a3
    catalogue, rules = project_a3(catalogue, rules)
    playable = [e for e in catalogue["equipment"] if e["integration"] == "PLAYABLE"]
    reference = [e for e in catalogue["equipment"] if e["integration"] == "REFERENCE_ONLY"]
    if len(playable) != 411 or len(reference) != 392 or len(catalogue["items"]) != 1343:
        raise ValueError("Group04 inventory content count drift")
    source_ids = {x["id"] for x in reference}
    if len(source_ids) != 392:
        raise ValueError("Group04 source IDs not unique")
    if len({x["id"] for x in playable}) != 411:
        raise ValueError("Group04 gameplay IDs not unique")
    item_playables = [x for x in catalogue["items"] if x["integration"] == "PLAYABLE"]
    item_refs = [x for x in catalogue["items"] if x["integration"] == "REFERENCE_ONLY"]
    if len(item_playables) != 669 or len(item_refs) != 674:
        raise ValueError("Item model 669/674 coverage mismatch")
    refids = {x["id"] for x in item_refs}
    if len(refids) != 674:
        raise ValueError("Duplicate source item IDs")
    for x in item_playables:
        if x["provenance"]["classification"] != "SIMULATED":
            raise ValueError("Non-project active item effect")
        if x.get("sourceId") and x["sourceId"] not in refids:
            raise ValueError("Unresolved item sourceId: " + x["id"])
    for model in playable:
        if model["provenance"]["classification"] != "SIMULATED":
            raise ValueError(f"Non-original active model: {model['id']}")
        if model.get("sourceId") and model["sourceId"] not in source_ids:
            raise ValueError(f"Unresolved reference: {model['id']}")

    def js_json(value: object) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

    engine = (DATA / "engine.js").read_text(encoding="utf-8")
    ui = (DATA / "ui.js").read_text(encoding="utf-8")
    balance_engine = (DATA / "balance_v1.js").read_text(encoding="utf-8")
    item_engine = (DATA / "consumables_engine.js").read_text(encoding="utf-8")
    item_ui = (DATA / "consumables_ui.js").read_text(encoding="utf-8")
    item_group_rules = json.loads((DATA / "item_groups_v1.json").read_text(encoding="utf-8"))
    if item_group_rules.get("declaredTotal") != 674:
        raise ValueError("Source item group coverage mismatch")
    bridge = (TOOLS / "nl_item_integration_v1.js").read_text(encoding="utf-8")
    # Install A2 after all inventory, Hero207, R03, city and research owners.
    classic_a2 = (TOOLS / "nl_classic_phase_a2.js").read_text(encoding="utf-8")
    classic_a3 = (TOOLS / "nl_classic_phase_a3.js").read_text(encoding="utf-8")
    classic_b1 = (TOOLS / "nl_classic_phase_b1.js").read_text(encoding="utf-8")
    if classic_b1.count("// === NL-CLASSIC-B1-V1:") != 1 or "</script" in classic_b1.lower():
        raise ValueError("Invalid Phase B1 tactical advisor module")
    if classic_a3.count("// === NL-CLASSIC-A3-V1:") != 1 or "</script" in classic_a3.lower():
        raise ValueError("Invalid Phase A3 module")
    if classic_a2.count("// === NL-CLASSIC-A2-V1:") != 1 or "</script" in classic_a2.lower():
        raise ValueError("Invalid A2 module")
    if bridge.count("__NL_ITEMS_CATALOGUE__") != 1 or bridge.count("__NL_ITEMS_RULES__") != 1 or bridge.count("__NL_ITEM_GROUP_RULES__") != 1:
        raise ValueError("Bridge JSON placeholders out of sync")
    bridge = bridge.replace("__NL_ITEMS_CATALOGUE__", js_json(catalogue)).replace(
        "__NL_ITEMS_RULES__", js_json(rules)).replace(
        "__NL_ITEM_GROUP_RULES__", js_json(item_group_rules))
    if "</script" in (engine + ui + balance_engine + item_engine + item_ui + bridge).lower():
        raise ValueError("Unexpected script terminator in injected inline source")
    return "\n".join([BEGIN, engine.rstrip(), ui.rstrip(), balance_engine.rstrip(), item_engine.rstrip(), item_ui.rstrip(), bridge.rstrip(), classic_a2.rstrip(), classic_a3.rstrip(), classic_b1.rstrip(), END])


def render(html: str, insertion: str) -> str:
    if html.count(BOOT) != 1:
        raise ValueError(f"Canonical bootstrap marker mismatch: {html.count(BOOT)}")
    if html.count(BEGIN) != html.count(END) or html.count(BEGIN) > 1:
        raise ValueError("Unbalanced item block")
    if BEGIN not in html:
        return html.replace(BOOT, insertion + "\n" + BOOT, 1)
    start = html.index(BEGIN)
    stop = html.index(END, start) + len(END)
    return html[:start] + insertion + html[stop:]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    before = INDEX.read_text(encoding="utf-8")
    after = render(before, payload())
    changed = before != after
    if changed and args.check:
        raise SystemExit("NL Items canonical HTML is missing or differs from source")
    if changed:
        INDEX.write_text(after, encoding="utf-8", newline="")
    print(
        "NL_ITEMS: source gear 392, playable gear 411; source items 674, playable items 669, "
        f"sha256={hashlib.sha256(after.encode('utf-8')).hexdigest()} "
        f"changed={changed} check={args.check}"
    )


if __name__ == "__main__":
    main()
