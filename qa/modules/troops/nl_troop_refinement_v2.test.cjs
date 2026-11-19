"use strict";
const assert=require("node:assert/strict");
const pack=require("../../../data/ngoalong/modules/troops/mechanic_refinement_v2.json");
const sim=require("../../../data/ngoalong/modules/troops/troop_mechanic_rules_v2.cjs").create(pack);
let n=0;function test(label,fn){fn();console.log("PASS "+(++n)+" "+label);}
test("137 missing profiles split 78 anchored / 59 quarantined",()=>{
 assert.equal(pack.records.length,137);assert.equal(sim.audit().sourceAnchored,78);assert.equal(sim.audit().blockedWithoutMechanic,59);
});
test("all 78 sourced-line traits are project-only simulated preview, not live",()=>{
 for(const x of pack.records.filter(x=>x.projectOriginalSandbox)){assert.ok(x.source.descriptionLine>0);assert.equal(x.runtime.livePlayable,false);assert.ok(sim.eligible(x.id));}
});
test("all 59 no-source rows are rejected, including missing mechanics and NPC",()=>{
 for(const x of pack.records.filter(x=>!x.projectOriginalSandbox)){assert.equal(x.source.descriptionLine,null);assert.equal(x.sourceMechanics.length,0);assert.equal(sim.eligible(x.id),false);assert.throws(()=>sim.preview({id:x.id}));}
});
test("all 78 project preview handlers run without mutating source inputs",()=>{
 for(const x of pack.records.filter(x=>x.projectOriginalSandbox)){
  const actor={id:"a",stats:{attack:100,physical:100,tactic:80,magic:100},family:x.family,slot:0};
  const target={id:"b",stats:{defense:50},family:"cavalry",slot:0};
  const before=JSON.stringify([actor,target]);
  const r=sim.preview({id:x.id,actor,target,attackLane:"magic",incomingDamage:50,roll:.01});
  assert.ok(r.events.some(y=>y.kind==="damage-preview")&&r.liveGameEffect===false);
  assert.equal(JSON.stringify([actor,target]),before);
 }
});
test("row and line target patterns can strike more than one target",()=>{
 const row=pack.records.find(x=>x.appearanceName==="Thủy Sách Sĩ");
 const line=pack.records.find(x=>x.appearanceName==="Phong Hành");
 const a={id:"a",stats:{attack:80,magic:90},family:"strategist",slot:0},
 t={id:"b",stats:{defense:40},family:"infantry",slot:0},
 enemies=[{id:"c",slot:1,stats:{defense:40}},{id:"d",slot:3,stats:{defense:40}}];
 assert.equal(sim.preview({id:row.id,actor:a,target:t,enemies}).events.filter(x=>x.kind==="damage-preview").length,2);
 assert.equal(sim.preview({id:line.id,actor:a,target:t,enemies}).events.filter(x=>x.kind==="damage-preview").length,2);
});
test("Băng Nỏ source 50 morale, Xích Cung burn source duration unknown",()=>{
 const src=pack.records.find(x=>x.appearanceName==="Băng Nỏ");
 const burn=pack.records.find(x=>x.appearanceName==="Xích Cung");
 assert.equal(src.sourceMechanics.find(x=>x.sourceTag==="self_morale_gain").sourceNumericFact,50);
 assert.equal(burn.sourceMechanics.find(x=>x.sourceTag==="burn").sourceDurationTurns,null);
 const a={id:"a",stats:{attack:100},family:"archer"},b={id:"b",stats:{defense:50},family:"infantry"};
 assert.ok(sim.preview({id:burn.id,actor:a,target:b}).events.some(x=>x.kind==="burn-preview"&&x.wikiDuration==="UNKNOWN"));
});
test("no unnamed Wiki evolution, recruitability or live activation in this pack",()=>{
 assert.ok(pack.records.every(x=>x.runtime.wikiReferenceOnly&&!x.runtime.autoImport&&!x.runtime.livePlayable&&x.unresolved.sourceExactChildEvolution&&x.unresolved.recruitability));
});
console.log("NL TROOP 137 REFINEMENT "+n+"/"+n+" PASS");