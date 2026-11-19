"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const E=require("../../../tools/nl_combat_effects_v1.js");
const R=require("../../../data/ngoalong/modules/combat/resolver_v2.js");
const AI=require("../../../data/ngoalong/modules/combat/tactical_ai_v2.js");
const alpha=JSON.parse(fs.readFileSync("data/ngoalong/alpha_content.json","utf8"));
const effects=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effects_v1.json","utf8"));
const skills=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/skill_schema_v2.json","utf8")).skills;
const cat={effects,skills,counters:alpha.troops.counterCycle};
const base={attack:{physical:150,tactic:145,magic:165},
  defense:{physical:110,tactic:100,magic:100},hp:500,maxHp:500,morale:100};
function u(id,side,slot,type,ids,rest={}){
  return {...JSON.parse(JSON.stringify(base)),id,side,slot,troopType:type,skillIds:ids,...rest};
}
function make(playerSkills,foes,playerRest={}){
  return R.createBattle(cat,[u("p1","p",3,"infantry",playerSkills,playerRest),...foes]);
}
const opponent=(id="e1",slot=1,type="spear",rest={})=>u(id,"e",slot,type,
  ["mdtq-basic-strike","mdtq-spear-assault"],rest);
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+passed+" "+name)}
check("morale siege drains enemy that can cast an expensive skill",()=>{
  const s=make(["mdtq-basic-strike","mdtq-morale-break"],[opponent()]);
  const r=AI.choose(s,cat,"p1",{profile:"morale-siege"});
  assert.equal(r.command.skillId,"mdtq-morale-break");
  assert.ok(r.decision.contributions.morale>0);
});
check("morale siege does not waste cost when enemy morale is already zero",()=>{
  const s=make(["mdtq-basic-strike","mdtq-morale-break"],[opponent("e1",1,"spear",{morale:0})]);
  const r=AI.choose(s,cat,"p1",{profile:"morale-siege"});
  assert.equal(r.command.skillId,"mdtq-basic-strike");
});
check("counter policy prioritizes spear target for infantry attacker",()=>{
  const s=make(["mdtq-basic-strike"],[
    opponent("e-cav",1,"cavalry"),opponent("e-spear",4,"spear")]);
  const r=AI.choose(s,cat,"p1",{profile:"counter-offense"});
  assert.equal(r.command.selectedTargetId,"e-spear");
});
check("enemy shield diverts damage AI to beneficial dispel",()=>{
  let s=make(["mdtq-basic-strike","mdtq-dispel-ward"],[opponent()]);
  s=E.applyStatus(s,effects,{targetId:"e1",statusId:"ironwall"}).state;
  const r=AI.choose(s,cat,"p1",{profile:"balanced"});
  assert.equal(r.command.skillId,"mdtq-dispel-ward");
});
check("wounded allies trigger healing rather than basic attack",()=>{
  const s=R.createBattle(cat,[
    u("p1","p",3,"support",["mdtq-basic-strike","mdtq-herbal-rescue"]),
    u("p2","p",1,"infantry",["mdtq-basic-strike"],{hp:75}),opponent()
  ]);
  const r=AI.choose(s,cat,"p1",{profile:"medic"});
  assert.equal(r.command.skillId,"mdtq-herbal-rescue");
});
check("full-health allies do not draw a useless heal",()=>{
  const s=R.createBattle(cat,[
    u("p1","p",3,"support",["mdtq-basic-strike","mdtq-herbal-rescue"]),
    u("p2","p",1,"infantry",["mdtq-basic-strike"]),opponent()
  ]);
  const r=AI.choose(s,cat,"p1",{profile:"medic"});
  assert.equal(r.command.skillId,"mdtq-basic-strike");
});
check("rear guard protects low-health frontline with ironwall",()=>{
  const s=make(["mdtq-basic-strike","mdtq-ironwall-order"],[opponent()],
    {hp:110,maxHp:500,morale:75});
  const r=AI.choose(s,cat,"p1",{profile:"boss-guard",phase:"hold"});
  assert.equal(r.command.skillId,"mdtq-ironwall-order");
});
check("AI does not attempt to reapply a blocked shield",()=>{
  let s=make(["mdtq-basic-strike","mdtq-ironwall-order"],[opponent()],
    {hp:110,maxHp:500,morale:75});
  s=E.applyStatus(s,effects,{targetId:"p1",statusId:"ironwall"}).state;
  const r=AI.choose(s,cat,"p1",{profile:"boss-guard",phase:"hold"});
  assert.equal(r.command.skillId,"mdtq-basic-strike");
});
check("backline controller can reach strategist behind vanguard",()=>{
  const s=make(["mdtq-basic-strike","mdtq-sleep-hex"],[
    opponent("e1",1,"infantry"),opponent("e2",3,"strategist",{hp:400})]);
  const r=AI.choose(s,cat,"p1",{profile:"rear-hunter"});
  assert.equal(r.command.skillId,"mdtq-sleep-hex");
  assert.equal(r.command.selectedTargetId,"e2");
});
check("ordinary melee never jumps over enemy frontline",()=>{
  const s=make(["mdtq-basic-strike"],[
    opponent("e1",1,"infantry",{hp:500}),
    opponent("e2",3,"strategist",{hp:30})]);
  const r=AI.choose(s,cat,"p1",{profile:"rear-hunter",focusTargetId:"e2"});
  assert.equal(r.command.selectedTargetId,"e1");
});
check("low morale makes expensive skills ineligible",()=>{
  const s=make(["mdtq-basic-strike","mdtq-morale-break"],[opponent()],
    {morale:25});
  assert.equal(AI.choose(s,cat,"p1",{profile:"morale-siege"}).command.skillId,"mdtq-basic-strike");
});
check("score selection does not mutate source state",()=>{
  const s=make(["mdtq-basic-strike","mdtq-morale-break"],[opponent()]);
  const before=JSON.stringify(s);
  AI.choose(s,cat,"p1",{profile:"morale-siege"});
  assert.equal(JSON.stringify(s),before);
});
check("same tactical state produces deterministic decision",()=>{
  const s=make(["mdtq-basic-strike","mdtq-morale-break"],[opponent()]);
  assert.deepEqual(AI.choose(s,cat,"p1",{profile:"morale-siege"}),
    AI.choose(s,cat,"p1",{profile:"morale-siege"}));
});
check("chance skill without caller seeded RNG is refused",()=>{
  const s=make(["mdtq-sleep-hex"],[opponent()]);
  assert.throws(()=>AI.prepare(s,cat,"p1",{profile:"rear-hunter"}),/rollProvider/);
});
check("chance skill records external RNG, action and replay",()=>{
  const s=make(["mdtq-sleep-hex"],[opponent()]);
  const p=AI.prepare(s,cat,"p1",{profile:"rear-hunter"},()=>.1);
  assert.equal(p.command.rolls["0:e1"],.1);
  const act=R.resolveAction(s,cat,p.command);
  assert.deepEqual(R.replay(s,cat,[act.frame]),act.state);
});
check("invalid profile is rejected rather than silently selecting default",()=>{
  const s=make(["mdtq-basic-strike"],[opponent()]);
  assert.throws(()=>AI.choose(s,cat,"p1",{profile:"unknown"}),/unknown profile/);
});
check("invalid external roll is rejected without state mutation",()=>{
  const s=make(["mdtq-sleep-hex"],[opponent()]),before=JSON.stringify(s);
  assert.throws(()=>AI.prepare(s,cat,"p1",{},()=>-1),/invalid external roll/);
  assert.equal(JSON.stringify(s),before);
});
check("target focus influences otherwise equal legal frontliners",()=>{
  const s=make(["mdtq-basic-strike"],[
    opponent("e1",1,"infantry"),opponent("e2",4,"infantry")]);
  assert.equal(AI.choose(s,cat,"p1",{focusTargetId:"e2"}).command.selectedTargetId,"e2");
});
console.log("TACTICAL AI "+passed+"/"+passed+" PASS");
