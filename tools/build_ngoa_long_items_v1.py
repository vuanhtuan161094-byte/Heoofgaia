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
    classic_b3 = (TOOLS / "nl_classic_phase_b3.js").read_text(encoding="utf-8")
    # Classic B4 source-authored 55/10 WEB content and ORIGINAL generated backdrop.
    # All new effects are bounded modifications of the native P2 authoritative action.
    from base64 import b64encode
    web_b4 = json.loads((ROOT / "data/ngoalong/modules/troops/classic_web55_v1.json").read_text(encoding="utf-8"))
    b4 = (TOOLS / "nl_classic_web_b4.js").read_text(encoding="utf-8")
    b4_css = (TOOLS / "nl_classic_web_b4.css").read_text(encoding="utf-8")
    b4_art = (ROOT / "assets/ngoalong/original/battle_courtyard_b4.webp").read_bytes()
    if len(web_b4["troops"])!=55 or len(web_b4["formations"])!=10:
        raise ValueError("B4 historic content drift")
    if b4.count("// === NL-CLASSIC-WEB-B4-V1:")!=1 or b4.count("__NL_B4_DATA__")!=1 or b4.count("__NL_B4_IMAGE_BASE64__")!=1 or b4.count("__NL_B4_CSS__")!=1:
        raise ValueError("B4 source markers drift")
    if not b4_art.startswith(b"RIFF") or b"WEBP" not in b4_art[:16] or len(b4_art)>160000:
        raise ValueError("B4 original artwork missing or oversized")
    if "</script" in (b4+b4_css).lower() or "</style" in b4_css.lower():
        raise ValueError("Unsafe B4 embedded source")
    b4 = b4.replace("__NL_B4_DATA__", js_json(web_b4)).replace(
         "__NL_B4_IMAGE_BASE64__", b64encode(b4_art).decode("ascii")).replace(
         "__NL_B4_CSS__", js_json(b4_css))
    if classic_b3.count("// === NL-CLASSIC-B3-V1:") != 1 or "</script" in classic_b3.lower():
        raise ValueError("Invalid B3 gameplay integration")
    project_troops = json.loads((ROOT / "data/ngoalong/modules/troops/project_playable_v1.json").read_text(encoding="utf-8"))
    if len(project_troops["units"]) != 25:
        raise ValueError("B3 25 troop identity count changed")
    classic_b3 = classic_b3.replace("__NL_B3_UNITS__", js_json(project_troops["units"]))
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
    world_a4 = (TOOLS / "nl_classic_world_a4.js").read_text(encoding="utf-8")
    if world_a4.count("// === NL-CLASSIC-WORLD-A4-V1:") != 1 or "</script" in world_a4.lower():
        raise ValueError("Invalid A4 world module")
    advanced = (TOOLS / "nl_classic_advanced_a5_a9.js").read_text(encoding="utf-8")
    if advanced.count("// === NL-CLASSIC-A5-A9-V1:") != 1 or "</script" in advanced.lower():
        raise ValueError("Invalid A5–A9 module")
    from nl_content_c_projection import build as build_c
    content_c = build_c(ROOT)
    tier4 = json.loads((ROOT / "data/ngoalong/modules/troops/classic_web_tier4_v1.json").read_text(encoding="utf-8"))["troops"]
    c_runtime = (TOOLS / "nl_content_c_runtime.js").read_text(encoding="utf-8")
    if len(tier4)!=40 or len({t["id"] for t in tier4})!=40 or c_runtime.count("__NL_CONTENT_C_DATA__")!=1 or c_runtime.count("__NL_CONTENT_C_TIER4__")!=1 or "</script" in c_runtime.lower():
        raise ValueError("Invalid Content C bundle")
    c_runtime = c_runtime.replace("__NL_CONTENT_C_DATA__",js_json(content_c)).replace("__NL_CONTENT_C_TIER4__",js_json(tier4))
    # D2: original R06 frame sheets, embedded in the existing native renderer.
    art_dir = ROOT / "assets/ngoalong/troops_r06"
    art_manifest = json.loads((art_dir / "manifest.json").read_text(encoding="utf-8"))
    assert len(art_manifest["units"]) == 18 and art_manifest["celCount"] == 360
    art_sheets = {u["id"]: b64encode((art_dir / u["file"]).read_bytes()).decode("ascii") for u in art_manifest["units"]}
    assert len(art_sheets) == 18
    art_fx = b64encode((art_dir / "vfx_troops.svg").read_bytes()).decode("ascii")
    art_d2 = (TOOLS / "nl_art_d2.js").read_text(encoding="utf-8")
    assert art_d2.count("__NL_D2_SHEETS__") == 1 and art_d2.count("__NL_D2_FX__") == 1 and "</script" not in art_d2.lower()
    # D4: reuse original transparent, directional raster atlases. No new dependencies.
    raster_dir = ROOT / "assets/p41"
    scout_dir = ROOT / "assets/p5/cl-p5-infantry-scout-v1"
    p41_manifest = json.loads((raster_dir / "troops_manifest.json").read_text(encoding="utf-8"))
    p5_manifest = json.loads((scout_dir / "cl-p5-infantry-scout-manifest.json").read_text(encoding="utf-8"))
    assert p41_manifest["frameCount"] == 288 and len(p5_manifest["atlas"]["rowOrder"]) == 20
    def raster_pack(path, expected):
        raw = path.read_bytes()
        assert raw[:4] == b"RIFF" and raw[8:12] == b"WEBP" and hashlib.sha256(raw).hexdigest() == expected
        return b64encode(raw).decode("ascii")
    raster_d4 = {"p41":raster_pack(raster_dir / "troops_p41.webp", p41_manifest["atlasSha256"]),
                 "p5":raster_pack(scout_dir / "cl-p5-infantry-scout-atlas.webp", p5_manifest["atlas"]["sha256"]),
                 "p41Units":p41_manifest["units"],"p5Rows":p5_manifest["atlas"]["rowOrder"]}
    assert art_d2.count("__NL_D4_RASTER__") == 1
    art_d2 = art_d2.replace("__NL_D2_SHEETS__", js_json(art_sheets)).replace("__NL_D2_FX__", js_json(art_fx)).replace("__NL_D4_RASTER__", js_json(raster_d4))
    return "\n".join([BEGIN, engine.rstrip(), ui.rstrip(), balance_engine.rstrip(), item_engine.rstrip(), item_ui.rstrip(), bridge.rstrip(), classic_a2.rstrip(), classic_a3.rstrip(), classic_b1.rstrip(), classic_b3.rstrip(), b4.rstrip(), world_a4.rstrip(), advanced.rstrip(), c_runtime.rstrip(), art_d2.rstrip(), END])


def render(html: str, insertion: str) -> str:
    from nl_content_c_native import apply_c_native
    html = apply_c_native(html)
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
