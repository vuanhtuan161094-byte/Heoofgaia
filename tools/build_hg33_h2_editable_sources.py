#!/usr/bin/env python3
"""Package six HG33 H2 pilots as layered OpenRaster animation sources.

Each ORA keeps the project's original 8x5 atlas as its composite and exposes
the 40 existing source frames as individual editable PNG layers grouped by
action. This is frame-layer editability, not a skeletal/anatomical character
rig; the manifest records that distinction explicitly.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/original/hg33/layered-source"
CORE_MANIFEST = ROOT / "assets/generated/hg33/animation/troop-atlas-manifest.json"
EXTRA_MANIFEST = ROOT / "assets/generated/hg33/animation/additional-atlas-manifest.json"
OUT_MANIFEST = OUT / "h2-editable-frame-sources.json"
REPORT = ROOT / "docs/qa/hg33/H2-editable-source-check.json"
ACTIONS = ("idle", "walk", "attack", "hit", "death")
PILOTS = (
    {"key": "human-melee-heavy-soldier", "unitId": "human_4", "role": "human melee"},
    {"key": "elf-ranged-archer", "unitId": "elf_4", "role": "elf ranged"},
    {"key": "orc-brute-ogre", "unitId": "orc_5", "role": "orc brute"},
    {"key": "undead-skeleton-warrior", "unitId": "undead_1", "role": "undead"},
    {"key": "winged-dragon-green-dragon", "unitId": "elf_9", "role": "winged / dragon"},
    {"key": "named-boss-azrael", "bossName": "Azrael", "role": "named Boss"},
)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def find_assets() -> dict[str, dict]:
    core = load_json(CORE_MANIFEST)
    extra = load_json(EXTRA_MANIFEST)
    assets = {row["unitId"]: {**row, "_sourceManifest": "troop-atlas-manifest.json"}
              for row in core["assets"]}
    for row in extra["assets"]:
        if row.get("unitId"):
            assets[row["unitId"]] = {**row, "_sourceManifest": "additional-atlas-manifest.json"}
        if row.get("kind") == "boss":
            assets[f"boss:{row['bossName']}"] = {**row, "_sourceManifest": "additional-atlas-manifest.json"}
    return assets


def layer_png(frame: Image.Image) -> bytes:
    out = BytesIO()
    frame.save(out, format="PNG", optimize=True)
    return out.getvalue()


def zip_info(name: str, compression: int) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = compression
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    return info


def make_ora(pilot: dict, asset: dict) -> tuple[bytes, dict]:
    source_path = ROOT / asset["sourcePath"]
    source_bytes = source_path.read_bytes()
    if sha(source_bytes) != asset["sourceSha256"]:
        raise ValueError(f"source SHA-256 mismatch: {asset['sourcePath']}")
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
    width, height = asset["atlasDimensions"]
    frame_width, frame_height = asset["frameDimensions"]
    columns, rows = asset["columns"], asset["rows"]
    if list(source.size) != [width, height] or (columns, rows) != (8, 5):
        raise ValueError(f"unexpected atlas size/grid: {asset['sourcePath']}")
    if set(asset["actions"]) != set(ACTIONS):
        raise ValueError(f"five action rows missing: {asset['sourcePath']}")

    composite = Image.new("RGBA", source.size, (0, 0, 0, 0))
    coverage = Image.new("L", source.size, 0)
    coverage_draw = ImageDraw.Draw(coverage)
    groups: list[tuple[str, list[tuple[str, int, int, bytes]]]] = []
    support_layers: list[tuple[str, int, int, bytes]] = []
    frame_hashes = {}
    frame_count = 0
    for action in ACTIONS:
        clip = asset["actions"][action]
        frames = clip.get("frames", [])
        if clip.get("count") != 8 or len(frames) != 8:
            raise ValueError(f"expected 8 {action} frames: {asset['sourcePath']}")
        if len({frame.get("sha256Rgba") for frame in frames}) != 8:
            raise ValueError(f"repeated {action} frames: {asset['sourcePath']}")
        layers = []
        for frame in frames:
            index = frame["index"]
            x, y, w, h = frame["rect"]
            if index not in range(8) or (w, h) != (frame_width, frame_height):
                raise ValueError(f"invalid frame rectangle: {asset['sourcePath']} {action}/{index}")
            pixels = source.crop((x, y, x + w, y + h))
            if sha(pixels.tobytes()) != frame["sha256Rgba"]:
                raise ValueError(f"frame pixels differ from source manifest: {asset['sourcePath']} {action}/{index}")
            composite.paste(pixels, (x, y))
            coverage_draw.rectangle((x, y, x + w - 1, y + h - 1), fill=255)
            data = layer_png(pixels)
            name = f"data/{action}-{index + 1:02d}.png"
            layers.append((name, x, y, data))
            frame_hashes[name] = frame["sha256Rgba"]
            frame_count += 1
        groups.append((action, layers))
    outside_frames = ImageChops.invert(coverage)
    residue_alpha = ImageChops.multiply(source.getchannel("A"), outside_frames)
    residue = source.copy()
    residue.putalpha(residue_alpha)
    residue_bounds = residue_alpha.getbbox()
    if residue_bounds:
        x, y, x2, y2 = residue_bounds
        residue = residue.crop(residue_bounds)
        composite.paste(residue, (x, y))
        support_layers.append(("data/atlas-edge-residue.png", x, y, layer_png(residue)))
    source_alpha = source.getchannel("A")
    for channel in range(4):
        difference = ImageChops.difference(source.getchannel(channel), composite.getchannel(channel))
        if channel < 3:
            difference = ImageChops.multiply(difference, source_alpha)
        if difference.getbbox():
            raise ValueError(f"40 frame layers do not reconstruct visible source pixels: {asset['sourcePath']}")

    image_name = str(pilot.get("unitId") or pilot.get("bossName"))
    image = ET.Element("image", {
        "version": "0.0.1", "w": str(width), "h": str(height),
        "name": f"HG33 {image_name} editable frame source",
    })
    root_stack = ET.SubElement(image, "stack", {
        "name": "Five action rows", "opacity": "1.0", "visibility": "visible",
        "composite-op": "svg:src-over",
    })
    for action, layers in groups:
        group = ET.SubElement(root_stack, "stack", {
            "name": action.title(), "opacity": "1.0", "visibility": "visible",
            "composite-op": "svg:src-over",
        })
        for filename, x, y, _ in reversed(layers):
            ET.SubElement(group, "layer", {
                "name": filename.removeprefix("data/").removesuffix(".png").replace("-", " "),
                "src": filename, "x": str(x), "y": str(y), "opacity": "1.0",
                "visibility": "visible", "composite-op": "svg:src-over",
            })
    for filename, x, y, _ in support_layers:
        ET.SubElement(root_stack, "layer", {
            "name": "Source edge pixels outside action frames", "src": filename,
            "x": str(x), "y": str(y), "opacity": "1.0", "visibility": "visible",
            "composite-op": "svg:src-over",
        })
    stack_xml = ET.tostring(image, encoding="utf-8", xml_declaration=True)
    thumbnail = source.copy()
    thumbnail.thumbnail((256, 256), Image.Resampling.LANCZOS)
    thumb_bytes = layer_png(thumbnail)

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(zip_info("mimetype", zipfile.ZIP_STORED), b"image/openraster")
        archive.writestr(zip_info("stack.xml", zipfile.ZIP_DEFLATED), stack_xml)
        archive.writestr(zip_info("mergedimage.png", zipfile.ZIP_DEFLATED), source_bytes)
        archive.writestr(zip_info("Thumbnails/thumbnail.png", zipfile.ZIP_DEFLATED), thumb_bytes)
        for _, layers in groups:
            for filename, _, _, data in layers:
                archive.writestr(zip_info(filename, zipfile.ZIP_DEFLATED), data)
        for filename, _, _, data in support_layers:
            archive.writestr(zip_info(filename, zipfile.ZIP_DEFLATED), data)
    ora = buffer.getvalue()

    provenance = {
        **pilot,
        "name": asset.get("name") or asset.get("bossName"),
        "oraPath": f"assets/original/hg33/layered-source/{pilot['key']}.ora",
        "oraSha256": sha(ora), "oraBytes": len(ora),
        "sourceAtlas": asset["sourcePath"], "sourceAtlasSha256": asset["sourceSha256"],
        "sourceManifest": f"assets/generated/hg33/animation/{asset['_sourceManifest']}",
        "sourcePrompt": asset.get("prompt") or asset.get("promptSummary"),
        "artistRoute": asset.get("artistRoute") or asset.get("artist_route") or asset.get("generationTool"),
        "creationMethod": asset.get("creationMethod") or asset.get("creation_method"),
        "sourceLicense": asset.get("sourceLicense") or "Project-generated original raster source; no third-party source listed in atlas manifest.",
        "animationActions": {action: 8 for action in ACTIONS},
        "editableLayers": frame_count,
        "supportLayers": len(support_layers),
        "visibleSourceEdgePixels": sum(1 for alpha in residue_alpha.getdata() if alpha > 0),
        "layerModel": "40 independently editable source frames grouped by action; frame pixels and merged atlas are exact-source derived.",
        "rigStatus": "No anatomical/body-part layers or skeletal rig; each complete animation frame is independently editable.",
        "framePixelHashes": frame_hashes,
    }
    return ora, provenance


def verify_ora(path: Path, asset: dict, entry: dict) -> None:
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        if not infos or infos[0].filename != "mimetype" or infos[0].compress_type != zipfile.ZIP_STORED:
            raise ValueError(f"OpenRaster mimetype must be first and uncompressed: {entry['oraPath']}")
        if archive.read("mimetype") != b"image/openraster":
            raise ValueError(f"invalid OpenRaster mimetype: {entry['oraPath']}")
        root = ET.fromstring(archive.read("stack.xml"))
        if (root.tag != "image" or root.attrib.get("w") != "1536" or
                root.attrib.get("h") != "1024"):
            raise ValueError(f"invalid OpenRaster dimensions: {entry['oraPath']}")
        root_stack = root.find("stack")
        if root_stack is None:
            raise ValueError(f"missing OpenRaster root stack: {entry['oraPath']}")
        groups = {node.attrib.get("name", "").lower(): node for node in root_stack.findall("stack")}
        if set(groups) != set(ACTIONS):
            raise ValueError(f"OpenRaster action groups differ: {entry['oraPath']}")
        referenced = set()
        layer_count = 0
        for action in ACTIONS:
            layers = groups[action].findall("layer")
            if len(layers) != 8:
                raise ValueError(f"expected eight editable {action} layers: {entry['oraPath']}")
            for layer in layers:
                name = layer.attrib["src"]
                referenced.add(name)
                layer_count += 1
                payload = archive.read(name)
                with Image.open(BytesIO(payload)) as frame:
                    pixels = frame.convert("RGBA")
                if list(pixels.size) != asset["frameDimensions"]:
                    raise ValueError(f"bad frame layer dimensions: {entry['oraPath']} {name}")
                if sha(pixels.tobytes()) != entry["framePixelHashes"][name]:
                    raise ValueError(f"frame layer hash mismatch: {entry['oraPath']} {name}")
        edge_layers = root_stack.findall("layer")
        for layer in edge_layers:
            name = layer.attrib["src"]
            referenced.add(name)
            with Image.open(BytesIO(archive.read(name))) as support:
                support.verify()
        data_files = {name for name in archive.namelist() if name.startswith("data/")}
        if layer_count != 40 or data_files != referenced:
            raise ValueError(f"OpenRaster frame/data layer census failed: {entry['oraPath']}")
        source = (ROOT / asset["sourcePath"]).read_bytes()
        if sha(archive.read("mergedimage.png")) != sha(source):
            raise ValueError(f"OpenRaster composite differs from source atlas: {entry['oraPath']}")
        with Image.open(BytesIO(archive.read("Thumbnails/thumbnail.png"))) as thumb:
            if max(thumb.size) > 256:
                raise ValueError(f"OpenRaster thumbnail exceeds 256px: {entry['oraPath']}")


def verify_ora_equivalent(actual_path: Path, expected_bytes: bytes, entry: dict) -> None:
    """Compare the editable document independent of ZIP/PNG compressor versions.

    Pillow/zlib can encode the same PNG pixels into different compressed bytes on
    Windows and Linux. Validate the actual image pixels and exact layer stack
    instead of requiring a cross-platform byte-identical compressed container.
    The manifest still pins the hash of the committed ORA file itself.
    """
    with zipfile.ZipFile(actual_path, "r") as actual, zipfile.ZipFile(BytesIO(expected_bytes), "r") as expected:
        actual_names = [info.filename for info in actual.infolist()]
        expected_names = [info.filename for info in expected.infolist()]
        if actual_names != expected_names or len(set(actual_names)) != len(actual_names):
            raise ValueError(f"OpenRaster members differ from source: {entry['oraPath']}")
        for name in expected_names:
            actual_payload = actual.read(name)
            expected_payload = expected.read(name)
            if name.lower().endswith(".png"):
                with Image.open(BytesIO(actual_payload)) as actual_image, Image.open(BytesIO(expected_payload)) as expected_image:
                    actual_rgba = actual_image.convert("RGBA")
                    expected_rgba = expected_image.convert("RGBA")
                    if actual_rgba.size != expected_rgba.size or actual_rgba.tobytes() != expected_rgba.tobytes():
                        raise ValueError(f"OpenRaster image pixels differ from source: {entry['oraPath']} {name}")
            elif actual_payload != expected_payload:
                raise ValueError(f"OpenRaster metadata differs from source: {entry['oraPath']} {name}")


def main() -> None:
    check = "--check" in sys.argv[1:]
    assets = find_assets()
    stored_manifest = load_json(OUT_MANIFEST) if check and OUT_MANIFEST.exists() else None
    stored_entries = {row["key"]: row for row in (stored_manifest or {}).get("actors", [])}
    entries = []
    for pilot in PILOTS:
        lookup = pilot.get("unitId") or f"boss:{pilot['bossName']}"
        if lookup not in assets:
            raise ValueError(f"pilot source missing: {lookup}")
        ora, entry = make_ora(pilot, assets[lookup])
        out_path = ROOT / entry["oraPath"]
        if check:
            stored = stored_entries.get(entry["key"])
            if not out_path.exists() or stored is None:
                raise ValueError(f"editable ORA or manifest entry missing: {entry['oraPath']}")
            actual_bytes = out_path.read_bytes()
            if len(actual_bytes) != stored.get("oraBytes") or sha(actual_bytes) != stored.get("oraSha256"):
                raise ValueError(f"committed editable ORA hash differs from its manifest: {entry['oraPath']}")
            verify_ora_equivalent(out_path, ora, entry)
            entry["oraSha256"] = stored["oraSha256"]
            entry["oraBytes"] = stored["oraBytes"]
        else:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(ora)
            entry["oraSha256"] = sha(ora)
            entry["oraBytes"] = len(ora)
        verify_ora(out_path, assets[lookup], entry)
        entries.append(entry)
    manifest = {
        "schema": "HG33-H2-EditableFrameLayerSources-v1",
        "status": "FRAME_LAYER_SOURCES_COMPLETE; ANATOMICAL_RIGS_NOT_PRESENT",
        "requiredDistinctActors": 6,
        "actionNames": list(ACTIONS),
        "framesPerAction": 8,
        "sourceEditability": "OpenRaster with 40 independent PNG frame layers, grouped in five editable action stacks.",
        "limitation": "Layers are complete-frame layers; character anatomy is not separated into a skeletal/body-part rig.",
        "actors": entries,
    }
    encoded = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if check:
        if not OUT_MANIFEST.exists() or OUT_MANIFEST.read_text(encoding="utf-8") != encoded:
            raise ValueError("H2 editable-source manifest differs from rebuilt sources")
        contact_path = ROOT / "docs/evidence/hg33/H2-editable-sources/h2-pilot-atlas-review.png"
        report = {
            "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "result": "PASS",
            "schema": "HG33-H2-EditableFrameLayerSources-v1",
            "actors": len(entries), "actionStacks": len(entries) * len(ACTIONS),
            "independentFrameLayers": len(entries) * 40,
            "sourceAtlasesAndOraHashesVerified": True,
            "visibleFramePixelsMatchSource": True,
            "oraLayerTreesAndImagesDecoded": True,
            "anatomicalRigs": False,
            "contactSheet": {
                "path": str(contact_path.relative_to(ROOT)).replace("\\", "/"),
                "sha256": sha(contact_path.read_bytes()) if contact_path.exists() else None,
            },
            "assets": [{"key": row["key"], "name": row["name"], "sourceAtlas": row["sourceAtlas"],
                        "sourceAtlasSha256": row["sourceAtlasSha256"], "oraPath": row["oraPath"],
                        "oraSha256": row["oraSha256"], "editableLayers": row["editableLayers"],
                        "supportLayers": row["supportLayers"], "framePixelHashes": len(row["framePixelHashes"])}
                       for row in entries],
        }
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        OUT_MANIFEST.write_text(encoded, encoding="utf-8")
    mode = "verified" if check else "built"
    print(f"HG33 H2 editable frame layers {mode}: {len(entries)} actors, {len(entries) * 5} action stacks, {len(entries) * 40} independent frames")


if __name__ == "__main__":
    main()
