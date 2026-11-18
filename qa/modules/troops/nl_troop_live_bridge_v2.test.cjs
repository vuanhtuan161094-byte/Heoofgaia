"use strict";
const assert=require("node:assert/strict");
const contract=require("../../../data/ngoalong/modules/troops/live_integration_contract_v2.json");
const project=require("../../../data/ngoalong/modules/troops/project_playable_v1.json");
const evolution=require("../../../data/ngoalong/modules/troops/evolution_contract_v1.json");
const bridge=require("../../../data/ngoalong/modules/troops/troop_live_bridge_v2.js").create(contract,project,evolution);
let n=0;function test(name,fn){fn();console.log("PASS "+(++n)+" "+name);}
test("25 project identities, 7 bases and 18 R03 branches",()=>{const a=bridge.audit();assert.equal(a.project,25);assert.equal(a.base,7);assert.equal(a.r03,18);});
test("source Wiki IDs cannot become active",()=>{assert.equal(bridge.lookup("nlwm-infantry-t1-thuan-binh"),null);assert.equal(bridge.resolveLive({actor:{id:"n",team:"e",troop:"nlwm-test"},battle:{mode:"campaign"}}).allowed,false);});
test("legacy/cltq not affected",()=>assert.equal(bridge.resolveLive({actor:{id:"h",team:"p",troop:"infantry"},battle:{mode:"cltq"}}).allowed,false));
test("R03 selected branch resolves via actor or game state",()=>{
const a=bridge.resolveLive({actor:{id:"h",team:"p",troop:"infantry"},game:{nlr03:{evolutions:{h:"bulwark"}}},battle:{mode:"campaign"}});
assert.equal(a.unit.legacyId,"bulwark");
});
test("no double effect from R03 existing burn descriptors",()=>{
const r=bridge.plan({actor:{id:"h",team:"p",troop:"strategist",r03Branch:"ember"},battle:{mode:"campaign"},phase:"AFTER_BASIC_HIT",battleId:"b",actionId:"1"});assert.equal(r.intent,null);
});
test("additive proposal is immutable and not applied",()=>{
const a={id:"h",team:"p",troop:"infantry",r03Branch:"bulwark"},b={mode:"campaign"},g={},src=JSON.stringify([a,b,g]);
const p=bridge.plan({actor:a,battle:b,game:g,phase:"BEFORE_INCOMING_HIT",battleId:"a",actionId:"1",target:{id:"e"}});
assert.equal(p.intent.operation,"damage_redirect_fraction");assert.equal(p.intent.apply,false);assert.equal(p.intent.save,false);assert.equal(p.intent.settle,false);
assert.equal(JSON.stringify([a,b,g]),src);
});
test("wrong phase yields no effect",()=>{
const x=bridge.plan({actor:{id:"h",team:"p",troop:"infantry",r03Branch:"bulwark"},battle:{mode:"campaign"},phase:"AFTER_HIT"});assert.equal(x.intent,null);
});
test("all R03 source property overlaps have hook mapping",()=>{
for(const x of contract.records)if(x.currentRuntime.fieldsRead.length)assert.ok(x.currentRuntime.hookSites.length>0,x.projectId);
});
test("same action produces stable dedupe key",()=>{
const x={actor:{id:"h",team:"p",troop:"infantry",r03Branch:"bulwark"},battle:{mode:"campaign"},battleId:"b",actionId:"a",phase:"BEFORE_INCOMING_HIT",target:{id:"e"}};
assert.deepEqual(bridge.plan(x),bridge.plan(x));
});
console.log("NL LIVE BRIDGE "+n+"/"+n+" PASS");