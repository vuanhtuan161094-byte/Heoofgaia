#!/usr/bin/env python3
"""Command-line gate for the provenance-tagged Alpha content pack."""
from pathlib import Path

from ngoalong_data import load_pack


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    pack = load_pack(ROOT)
    print(
        "NL data pack valid: "
        f"{len(pack['troops']['profiles'])} troop profiles, "
        f"{len(pack['evolution']['branches'])} evolutions, "
        f"{len(pack['statusEffects']['effects'])} statuses, "
        f"{len(pack['campaign']['maps'])} maps, "
        f"{len(pack['campaign']['npcs'])} NPCs, "
        f"{len(pack['campaign']['encounters'])} stages; save schema v{pack['compatibility']['saveSchema']}"
    )


if __name__ == "__main__":
    main()
