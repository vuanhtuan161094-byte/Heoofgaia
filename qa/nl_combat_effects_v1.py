#!/usr/bin/env python3
"""Focused, standalone combat-effect QA; no integration or runtime mutation.

Run: python qa/nl_combat_effects_v1.py
Requires: Node.js; uses only Node built-ins and repository JSON/JS files.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE_TESTS = r"""
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const E = require("./tools/nl_combat_effects_v1.js");
const C = JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effects_v1.json", "utf8"));
const W = JSON.parse(fs.readFileSync("data/ngoalong/references/effects_wiki_mobile_v1.json", "utf8"));
const B = JSON.parse(fs.readFileSync("data/ngoalong/references/troop_effect_bridge_wiki_v1.json", "utf8"));
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log("PASS " + String(checks).padStart(2, "0") + " " + label);
}
function battle() {
  return E.newBattle(C, [
    {id:"a",side:"left",hp:100,maxHp:100,morale:20},
    {id:"b",side:"right",hp:100,maxHp:100,morale:10}
  ]);
}
function apply(s, id, target="b", more={}) {
  return E.applyStatus(s, C, {targetId:target,statusId:id,...more});
}
function effect(s, id, target="b") {
  return s.units.find(u=>u.id===target).statuses.find(x=>x.id===id);
}
const serialized = s => JSON.stringify(s);
check("valid original catalog", () => assert.equal(E.validateCatalog(C),true));
check("thirteen project authored statuses", () => assert.equal(C.effects.length,13));
check("no Wiki status automatically enabled", () => {
  assert.equal(C.autoImport,false);
  assert.equal(C.sourcePolicy.wikiStatus,"REFERENCE_ONLY_NEVER_ENABLE_AS_RUNTIME");
  assert.ok(C.effects.every(x => x.provenance.classification==="SIMULATED"));
});
check("fresh battle state", () => {
  const s=battle();assert.equal(s.units.length,2);assert.equal(s.round,1);
});
check("state immutability during application", () => {
  const s=battle(),before=serialized(s);apply(s,"burn");assert.equal(serialized(s),before);
});
check("three burns cap at three stacks", () => {
  let s=battle();for(let i=0;i<5;i++)s=apply(s,"burn").state;assert.equal(effect(s,"burn").stacks,3);
});
check("burn round one deterministic", () => {
  let s=battle();for(let i=0;i<3;i++)s=apply(s,"burn").state;
  s=E.endRound(s,C).state;assert.equal(s.units[1].hp,90);
});
check("burn expires after second round", () => {
  let s=battle();for(let i=0;i<3;i++)s=apply(s,"burn").state;
  s=E.endRound(s,C).state;s=E.endRound(s,C).state;
  assert.equal(s.units[1].hp,80);assert.equal(effect(s,"burn"),undefined);
});
check("beneficial guard may coexist with harmful break", () => {
  let s=apply(battle(),"break").state;s=apply(s,"guard").state;
  assert.ok(effect(s,"break"));assert.ok(effect(s,"guard"));
});
check("harmful status is blocked by active ward", () => {
  let s=apply(battle(),"ward").state;
  const r=apply(s,"break");assert.equal(r.accepted,false);
  assert.equal(r.events[0].reason,"ward");assert.equal(effect(r.state,"break"),undefined);
});
check("ward does not block beneficial", () => {
  let s=apply(battle(),"ward").state;assert.equal(apply(s,"guard").accepted,true);
});
check("generic dispel removes removable beneficial", () => {
  let s=apply(battle(),"ward").state;s=apply(s,"guard").state;
  const r=E.dispel(s,C,{targetId:"b",scope:"beneficial"});
  assert.deepEqual(r.removed,["guard"]);assert.ok(effect(r.state,"ward"));
});
check("unremovable ward cannot be purged by 'all'", () => {
  let s=apply(battle(),"ward").state;
  const r=E.dispel(s,C,{targetId:"b",scope:"all"});
  assert.deepEqual(r.removed,[]);assert.ok(effect(r.state,"ward"));
});
check("repel-blessing blocks new beneficial", () => {
  const s=apply(battle(),"repel-blessing").state;
  assert.equal(apply(s,"guard").accepted,false);
});
check("removing repel-blessing restores ability to buff", () => {
  let s=apply(battle(),"repel-blessing").state;
  s=E.dispel(s,C,{targetId:"b",scope:"harmful"}).state;
  assert.equal(apply(s,"guard").accepted,true);
});
check("ironwall intercepts exactly one hit", () => {
  const s=apply(battle(),"ironwall").state,r=E.damage(s,C,{targetId:"b",amount:22});
  assert.equal(r.damage,0);assert.equal(r.state.units[1].hp,100);
  assert.equal(effect(r.state,"ironwall"),undefined);
});
check("next damage after shield is not intercepted", () => {
  let s=apply(battle(),"ironwall").state;
  s=E.damage(s,C,{targetId:"b",amount:22}).state;
  const r=E.damage(s,C,{targetId:"b",amount:22});
  assert.equal(r.damage,22);assert.equal(r.state.units[1].hp,78);
});
check("sleep skips one owner action", () => {
  const s=apply(battle(),"sleep").state,r=E.startAction(s,C,{targetId:"b"});
  assert.equal(r.canAct,false);assert.equal(effect(r.state,"sleep"),undefined);
});
check("fear breaks on positive damage", () => {
  const s=apply(battle(),"fear").state,r=E.damage(s,C,{targetId:"b",amount:3});
  assert.equal(effect(r.state,"fear"),undefined);
});
check("zero damage does not remove sleep", () => {
  const s=apply(battle(),"sleep").state,r=E.damage(s,C,{targetId:"b",amount:0});
  assert.ok(effect(r.state,"sleep"));
});
check("anchored prevents damage-based sleep break", () => {
  let s=apply(battle(),"sleep").state;s=apply(s,"anchored").state;
  const r=E.damage(s,C,{targetId:"b",amount:4});
  assert.ok(effect(r.state,"sleep"));
});
check("anchored is not removed by general dispel", () => {
  let s=apply(battle(),"anchored").state;
  s=E.dispel(s,C,{targetId:"b",scope:"all"}).state;
  assert.ok(effect(s,"anchored"));
});
check("morale seal prevents gains", () => {
  const s=apply(battle(),"morale-seal").state;
  const r=E.morale(s,C,{targetId:"b",delta:30});
  assert.equal(r.applied,0);assert.equal(r.state.units[1].morale,10);
});
check("morale seal still permits losses", () => {
  const s=apply(battle(),"morale-seal").state;
  const r=E.morale(s,C,{targetId:"b",delta:-7});
  assert.equal(r.applied,-7);assert.equal(r.state.units[1].morale,3);
});
check("morale cap is original design", () => {
  const r=E.morale(battle(),C,{targetId:"b",delta:500});
  assert.equal(r.state.units[1].morale,C.moraleCap);
});
check("focus capped at three and modifies outgoing", () => {
  let s=battle();for(let i=0;i<5;i++)s=apply(s,"focus").state;
  assert.equal(effect(s,"focus").stacks,3);
  assert.ok(E.modifiers(s,C,"b").outgoingDamageMultiplier > 1.25);
});
check("surge refresh never stacks", () => {
  let s=apply(battle(),"surge").state;s=apply(s,"surge").state;
  assert.equal(effect(s,"surge").stacks,1);
});
check("incoming defense modifiers compose deterministically", () => {
  let s=apply(battle(),"break").state;s=apply(s,"guard").state;
  assert.ok(Math.abs(E.modifiers(s,C,"b").incomingDamageMultiplier-1.22*.85)<1e-12);
});
check("external proc failure leaves state identical", () => {
  const s=battle(),r=apply(s,"daze","b",{chance:0.3,roll:0.8});
  assert.equal(r.accepted,false);assert.equal(serialized(r.state),serialized(s));
});
check("external proc success applies control", () => {
  const s=battle(),r=apply(s,"daze","b",{chance:0.3,roll:0.1});
  assert.equal(r.accepted,true);assert.ok(effect(r.state,"daze"));
});
check("no implicit RNG is accepted when chance is supplied", () => {
  assert.throws(()=>apply(battle(),"daze","b",{chance:0.2}),/external roll/);
});
check("out-of-range supplied proc is rejected", () => {
  assert.throws(()=>apply(battle(),"daze","b",{chance:1.1,roll:0.5}),/external roll/);
});
check("unknown effect ID is rejected", () => {
  assert.throws(()=>apply(battle(),"nonexistent"),/unknown status/);
});
check("zero maximum removal keeps all statuses", () => {
  const s=apply(battle(),"burn").state,r=E.dispel(s,C,{targetId:"b",scope:"harmful",maxRemove:0});
  assert.equal(r.removed.length,0);assert.ok(effect(r.state,"burn"));
});
check("cleanse ordering deterministic and limited", () => {
  let s=apply(battle(),"burn").state;s=apply(s,"break").state;
  const r=E.dispel(s,C,{targetId:"b",scope:"harmful",maxRemove:1});
  assert.deepEqual(r.removed,["burn"]);assert.ok(effect(r.state,"break"));
});
check("same sequence yields identical event log and state", () => {
  function run(){
    let s=apply(battle(),"burn").state;let a=E.endRound(s,C);
    return serialized(a);
  }
  assert.equal(run(),run());
});
check("Wiki data parsed for 320 effect records", () => {
  const audit=E.auditWikiSources(W,B);
  assert.equal(audit.sourceOnly,true);assert.equal(audit.effectCount,320);
});
check("Wiki bridge reads 372 troop profiles and 501 events", () => {
  const audit=E.auditWikiSources(W,B);
  assert.equal(audit.troopProfiles,372);assert.equal(audit.observations,501);
});
check("unknown Wiki mappings never auto-authorize combat", () => {
  const audit=E.auditWikiSources(W,B);
  assert.equal(audit.statusLinked,115);assert.equal(audit.statusAmbiguous,2);assert.equal(audit.statusUnknown,39);
});
check("reject mismatched Wiki edition", () => {
  assert.throws(()=>E.auditWikiSources({...W,edition:"CLASSIC_WEBGAME"},B),/edition mismatch/);
});
check("reject auto-enabled Wiki events", () => {
  const broken={...B,events:B.events.map((e,i)=>i===0?{...e,runtimeEnabled:true}:e)};
  assert.throws(()=>E.auditWikiSources(W,broken),/unsafe Wiki bridge event/);
});
console.log("RESULT " + checks + "/" + checks + " PASS");
""".strip()

result = subprocess.run(
    ["node", "-e", NODE_TESTS],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    check=False,
)
print(result.stdout, end="")
if result.returncode:
    print(result.stderr, file=sys.stderr)
    raise SystemExit(result.returncode)
