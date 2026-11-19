"use strict";
const assert=require("node:assert/strict");
const content=require("../../../data/ngoalong/modules/troops/troop_balance_candidates_v4.json");
const e=require("../../../data/ngoalong/modules/troops/troop_balance_v4.cjs").create(content);
let n=0;function test(s,f){f();console.log("PASS "+(++n)+" "+s);}
const unit=id=>content.candidates.find(x=>x.sourceWikiAppearanceId===id);
const battle=(x,y,mode="land_sandbox")=>e.createBattle({A:[{id:"a",troopId:x.projectId,slot:0}],B:[{id:"b",troopId:y.projectId,slot:1}],mode,seed:"T"});
test("137 original project candidates all have exact chances and values",()=>{
 assert.equal(content.candidates.length,137);assert.equal(e.audit().profiles,137);
 assert.equal(content.candidates.filter(x=>x.projectAbilityOrigin==="DERIVED_THEME_WITH_SIMULATED_VALUES").length,78);
 assert.ok(content.candidates.every(x=>x.projectAbilities.length&&x.projectAbilities.every(a=>a.procChance>=0&&a.procChance<=1&&a.durationTurns>=0)));
});
test("all 137 candidates produce executable combat damage without mutating caller state",()=>{
 for(const c of content.candidates){
  const other=content.candidates.find(y=>y.family===c.family&&y.projectId!==c.projectId)||c;
  const mode=c.family.startsWith("ship")?"naval_sandbox":"land_sandbox";
  const state=battle(c,other,mode),before=JSON.stringify(state);
  const result=e.step(state,{actorId:"a",targetId:"b",actionId:"attack",lane:"magic"});
  assert.ok(result.events.some(x=>x.type==="damage"),c.projectId);
  assert.equal(JSON.stringify(state),before);
 }
});
test("deterministic replay and idempotent action IDs",()=>{
 const p=unit("nlwm-archer-t4-xich-cung"),q=unit("nlwm-infantry-t3-giap-bo");
 const s=battle(p,q),a=e.step(s,{actorId:"a",targetId:"b",actionId:"one"});
 const b=e.step(s,{actorId:"a",targetId:"b",actionId:"one"});
 assert.deepEqual(a,b);
 const repeated=e.step(a.state,{actorId:"a",targetId:"b",actionId:"one"});
 assert.equal(repeated.duplicate,true);assert.equal(repeated.events.length,0);
});
test("Kiên Thủ original +8% / three stacks / two turns, source duration preserved",()=>{
 const v=unit("nlwm-extra-spear-t0-08-than-vo-kich"),a=v.projectAbilities.find(x=>x.tag==="kien_thu");
 assert.equal(a.params.defenseBonusPct,8);assert.equal(a.params.maxStacks,3);
 assert.equal(a.durationTurns,2);assert.equal(a.sourceDurationTurns,2);
});
test("Băng Nỏ 50 morale exact Wiki value, Xích Cung burn is 30% project balance",()=>{
 const v=unit("nlwm-archer-t6-bang-no"),gain=v.projectAbilities.find(x=>x.tag==="self_morale_gain");
 assert.equal(gain.wikiNumber.value,50);
 const x=unit("nlwm-archer-t4-xich-cung"),b=x.projectAbilities.find(x=>x.tag==="burn");
 assert.equal(b.procChance,.30);assert.equal(b.params.hpPerTurnPct,4);assert.equal(b.durationTurns,2);
});
test("all unknown-source records carry PROJECT_ORIGINAL skill origin",()=>{
 const v=unit("nlwm-extra-infantry-t0-03-be-ngan");
 assert.equal(v.projectAbilityOrigin,"PROJECT_ORIGINAL");
 assert.equal(v.sourceSkillFormulaStatus,"UNKNOWN");
 assert.equal(v.projectScope,"NPC_OR_SPECIAL_SANDBOX_ONLY");
});
test("Wiki IDs, slot collision, 6-unit teams, naval-land mixing rejected",()=>{
 const p=unit("nlwm-archer-t2-hoa-cung"),n=unit("nlwm-extra-ship-medium-t0-01-dot-mao");
 assert.throws(()=>e.createBattle({A:[{id:"a",troopId:p.sourceWikiAppearanceId,slot:0}],B:[{id:"b",troopId:p.projectId,slot:0}]}));
 assert.throws(()=>e.createBattle({A:[{id:"a",troopId:p.projectId,slot:0},{id:"a2",troopId:p.projectId,slot:0}],B:[{id:"b",troopId:p.projectId,slot:1}]}));
 assert.throws(()=>e.createBattle({A:[{id:"a",troopId:p.projectId,slot:0}],B:[{id:"b",troopId:n.projectId,slot:1}]}));
 assert.throws(()=>e.createBattle({A:Array.from({length:6},(_,i)=>({id:"a"+i,troopId:p.projectId,slot:i})),B:[{id:"b",troopId:p.projectId,slot:1}]}));
});

test("stun skips the next enemy action and then expires",()=>{
 const attacker=unit("nlwm-extra-infantry-t0-08-hon-don"),defender=unit("nlwm-infantry-t3-giap-bo");
 const clone=JSON.parse(JSON.stringify(content));
 clone.candidates.find(x=>x.projectId===attacker.projectId).projectAbilities.find(x=>x.tag==="stun").procChance=1;
 const game=require("../../../data/ngoalong/modules/troops/troop_balance_v4.cjs").create(clone);
 let state=game.createBattle({A:[{id:"a",troopId:attacker.projectId,slot:0}],B:[{id:"b",troopId:defender.projectId,slot:1}]});
 state=game.step(state,{actorId:"a",targetId:"b",actionId:"stun"}).state;
 assert.ok(state.B[0].buffs.some(x=>x.key==="stun"));
 const r=game.step(state,{actorId:"b",targetId:"a",actionId:"next"});
 assert.ok(r.events.some(x=>x.type==="skip"&&x.reason==="stun"));
 assert.ok(!r.events.some(x=>x.type==="damage"));
 assert.ok(!r.state.B[0].buffs.some(x=>x.key==="stun"));
});
test("Mãnh Chiến original speed skill increases initiative by 12%",()=>{
 const swift=unit("nlwm-extra-cavalry-t0-07-manh-chien");
 const other=content.candidates.find(x=>x.family==="cavalry"&&x.projectId!==swift.projectId);
 const state=e.createBattle({A:[{id:"fast",troopId:swift.projectId,slot:0,speed:100}],B:[{id:"slow",troopId:other.projectId,slot:0,speed:104}]});
 assert.equal(state.A[0].speed,112);
 assert.equal(state.initiativeOrder[0],"fast");
});
test("Kiên Thủ 8% chosen as simulated, critical and counter percentages explicit",()=>{
 assert.equal(content.templates.kien_thu.defenseBonusPct,8);
 assert.equal(content.templates.critical.chance,.18);
 assert.equal(content.templates.counterattack.chance,.28);
 assert.equal(content.templates.physical_defense_down.reductionPct,12);
});

console.log("NL BALANCE V4 "+n+"/"+n+" PASS");