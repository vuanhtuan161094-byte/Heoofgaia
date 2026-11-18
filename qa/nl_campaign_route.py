#!/usr/bin/env python3
"""Focused NL04 gate: chapter selection, NPC preview, no Save/receipt writes."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
JAVASCRIPT = r"""
const assert = require('node:assert/strict');
const fs = require('node:fs');
const route = require(process.argv[1]);
const pack = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const original = JSON.stringify(pack);
const first = route.derive(pack, [], 1);
assert.equal(first.totalStages, pack.campaign.encounters.length);
assert.equal(first.chapters.length, pack.campaign.chapters.length);
assert.equal(first.chapters.flatMap(c => c.nodes).length, first.totalStages);
assert.equal(pack.campaign.chapters.filter(ch => pack.campaign.encounters.find(e => e.id === ch.encounterIds.at(-1))?.boss === true).length, 8);
assert.ok(pack.campaign.encounters.at(-1).boss && pack.campaign.encounters.at(-1).bossProvenance.classification === 'SIMULATED');
assert.equal(first.selected.stage, 1);
assert.equal(first.selected.accessible, true);
assert.equal(first.chapters.flatMap(c => c.nodes).filter(n => n.accessible).length, 1);
assert.ok(first.selected.units.length > 0 && first.selected.units.length <= 5);
assert.ok(first.selected.units.every(u => u.slot >= 0 && u.slot < 9));
assert.ok(route.render(first).includes('data-nl04-stage="1"'));
const afterWin = route.derive(pack, [1], 2);
assert.equal(afterWin.chapters.flatMap(c => c.nodes).find(n => n.stage === 2).accessible, true);
assert.equal(route.derive(pack, [1,1], 2).nextStage, 2);
assert.equal(JSON.stringify(pack), original, 'Read-only derive mutated source pack');
const invalid = structuredClone(pack);
invalid.campaign.chapters[0].encounterIds.push(invalid.campaign.chapters[0].encounterIds[0]);
assert.throws(() => route.derive(invalid, [], 1), /reused across chapters/);
const missingNpc = structuredClone(pack);
missingNpc.campaign.encounters[0].npcId = '__unknown__';
assert.throws(() => route.derive(missingNpc, [], 1), /Missing NPC/);
const brokenSlot = structuredClone(pack);
const battleNpc = brokenSlot.campaign.npcs.find(n => n.id === brokenSlot.campaign.encounters[0].npcId);
const battleCount = battleNpc.activeCount;
brokenSlot.campaign.encounters[0].deploymentSlots = Array(battleCount).fill(1);
assert.throws(() => route.derive(brokenSlot, [], 1), /duplicate deployed slot/);
console.log('NL04 focused PASS: chapter route, unlock, 3x3, duplicate receipt-independent preview, invalid refs/slots, source immutability');
console.log(JSON.stringify({chapters:first.chapters.length, encounters:first.totalStages,
    completeNpcRecords:first.completeNpcRecords, withDropTables:first.withDropTables}));
"""


def main() -> int:
    module = ROOT / "tools" / "nl_campaign_route_v1.js"
    pack = ROOT / "data" / "ngoalong" / "alpha_content.json"
    for path in (module, pack):
        if not path.is_file():
            raise SystemExit(f"NL04 missing source: {path}")
    result = subprocess.run(["node", "-e", JAVASCRIPT, str(module), str(pack)],
                            cwd=ROOT, text=True, capture_output=True, check=False)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, file=sys.stderr, end="")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
