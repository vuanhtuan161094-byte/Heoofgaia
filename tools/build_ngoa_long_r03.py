#!/usr/bin/env python3
"""Reproducibly compile NL-R03 gameplay into the canonical offline HTML."""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SOURCE = ROOT / "tools" / "ngoa_long_r03.js"
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"
BEGIN = "// === NL-R03 — original troop lineages and tactical challenge encounters ==="
END = "// === end NL-R03 ==="


def build(source: str, patch: str) -> str:
    if source.count(BOOT) != 1:
        raise ValueError(f"Expected one runtime bootstrap, found {source.count(BOOT)}")
    if patch.count(BEGIN) != 1 or patch.count(END) != 1:
        raise ValueError("R03 source markers must each occur exactly once")
    if source.count(BEGIN) != source.count(END):
        raise ValueError("R03 source markers are unbalanced")
    if source.count(BEGIN) == 0:
        return source.replace(BOOT, patch.rstrip() + "\n" + BOOT, 1)
    start = source.index(BEGIN)
    finish = source.index(END, start) + len(END)
    if source.find(BEGIN, start + len(BEGIN)) >= 0:
        raise ValueError("Unexpected duplicate R03 block")
    return source[:start] + patch.rstrip() + source[finish:]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify the compiled index without writing")
    args = parser.parse_args()
    original = INDEX.read_text(encoding="utf-8")
    patch = SOURCE.read_text(encoding="utf-8")
    # The WEB Phase A research adapter must run AFTER the final R03 research
    # definitions, otherwise R03's late patch silently restores silver/iron.
    classic_late = (ROOT / "tools/nl_classic_phase_a_research_late.js").read_text(encoding="utf-8")
    if classic_late.count("// === NL-CLASSIC-A-RESEARCH-LATE:") != 1 or "</script>" in classic_late.lower():
        raise ValueError("Invalid late classic research adapter")
    if patch.count(END) != 1:
        raise ValueError("Cannot place research adapter within R03 marker")
    patch = patch.replace(END, classic_late.rstrip() + "\n" + END, 1)
    assembled = build(original, patch)
    if args.check and assembled == original:
        print("NL-R03 patch ready")
        return
    if not args.check and assembled != original:
        INDEX.write_text(assembled, encoding="utf-8", newline="")
    digest = hashlib.sha256(assembled.encode("utf-8")).hexdigest()
    print(f"NL-R03: bytes={len(assembled.encode('utf-8'))} sha256={digest} applied={assembled != original} dry_run={args.check}")
    if args.check and assembled != original:
        raise SystemExit("Canonical index is missing or differs from the R03 source patch")


if __name__ == "__main__":
    main()
