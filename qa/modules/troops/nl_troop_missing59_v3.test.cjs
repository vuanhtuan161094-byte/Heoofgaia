"use strict";
const assert=require("node:assert/strict");
const source=require("../../../data/ngoalong/modules/troops/missing_59_source_review_v3.json");
const engine=require("../../../data/ngoalong/modules/troops/missing_59_rules_v3.cjs").create(source);
let tests=0;const test=(name,fn)=>{fn();console.log("PASS "+(++tests)+" "+name);};
test("59 distinct original missing Wiki appearance IDs audited",()=>{
 assert.equal(source.records.length,59);
 assert.equal(new Set(source.records.map(x=>x.wikiAppearanceId)).size,59);
 assert.equal(source.review.total,59);
});
test("exactly 1 source-specific, 1 qualitative, 1 family-only, 56 other",()=>{
 const counts=source.review.evidenceClassCounts;
 assert.equal(counts.TROOP_SPECIFIC_MECHANIC_RECOVERED,1);
 assert.equal(counts.QUALITATIVE_PROFILE_RECOVERED,1);
 assert.equal(counts.FAMILY_RELATION_ONLY,1);
 assert.equal(source.review.remainingWithoutUnitSpecificMechanic,57);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),59);
});
test("Thần Võ Kích source line 490 and Kiên Thủ source index",()=>{
 const x=source.records.find(x=>x.name==="Thần Võ Kích");
 assert.equal(x.source.exactFactLine,490);
 assert.equal(x.evidenceStatus,"TROOP_SPECIFIC_MECHANIC_RECOVERED");
 const op=x.sourcedMechanics.find(x=>x.operation==="apply_kien_thu");
 assert.equal(op.sourceDuration,2);
 assert.equal(op.effectIndexLink.effectWikiId,"nlwe-153-kien-thu");
 assert.equal(op.effectIndexLink.distinguishFrom,"nlwe-154-kien-thu-2");
 assert.equal(op.sourceValue,null);
});
test("read-only NPC preview preserves unknown numeric strength and chance",()=>{
 const x=source.records.find(x=>x.name==="Thần Võ Kích");
 const before=JSON.stringify(source);
 const result=engine.plan(x.wikiAppearanceId);
 assert.equal(result.allowed,true);assert.equal(result.context,"NPC_ONLY");
 assert.equal(result.intents.length,3);
 assert.ok(result.intents.every(x=>x.apply===false));
 assert.ok(result.intents.some(x=>x.operation==="self_morale_gain_unaffected"&&x.durationTurns===2&&x.chance===null));
 assert.ok(result.intents.some(x=>x.operation==="apply_kien_thu"&&x.defenseBonusPct===null&&x.runtimeEffectId===null));
 assert.equal(JSON.stringify(source),before);
});
test("Đột Mạo qualitative and NAVAL_ONLY, not a land battle unit",()=>{
 const x=source.records.find(x=>x.name==="Đột Mạo");
 assert.equal(x.source.exactFactLine,2151);
 const p=engine.plan(x.wikiAppearanceId);
 assert.equal(p.context,"NAVAL_ONLY");
 assert.equal(p.intents[0].sourceStatValues,null);
 assert.equal(p.mayImportTo3x3,false);
});
test("generic Thương is family-level only; no character ability fabricated",()=>{
 const x=source.records.find(x=>x.family==="spear"&&x.name==="Thương");
 assert.equal(x.evidenceStatus,"FAMILY_RELATION_ONLY");
 assert.equal(x.sourcedMechanics[0].target,"cavalry");
 assert.equal(engine.eligible(x.wikiAppearanceId),false);
 assert.equal(engine.plan(x.wikiAppearanceId).intents.length,0);
});
test("57 without specific mechanics remain blocked for standalone project trials",()=>{
 const blocked=source.records.filter(x=>!x.independentCombatProfileReady);
 assert.equal(blocked.length,57);
 for(const x of blocked){
  assert.equal(engine.eligible(x.wikiAppearanceId),false);
  assert.equal(engine.plan(x.wikiAppearanceId).allowed,false);
 }
});
test("multi-occurrence Lữ Bố never borrowed mechanics from boss or neighbor",()=>{
 const x=source.records.filter(x=>x.name==="Lữ Bố");
 assert.equal(x.length,5);
 assert.equal(new Set(x.map(y=>y.wikiAppearanceId)).size,5);
 assert.ok(x.every(y=>y.sourcedMechanics.length===0&&!engine.eligible(y.wikiAppearanceId)));
});
test("all source records preserve unknowns and forbid live import",()=>{
 assert.ok(source.records.every(x=>!x.livePlayable&&x.constraints.damageFormulaUnknown&&x.constraints.probabilityUnknown&&x.constraints.recruitableUnknown));
 assert.equal(engine.audit().actualRuntimeImported,0);
 assert.equal(engine.liveIntegrated,false);
});
console.log("NL MISSING59 VERIFIED "+tests+"/"+tests+" PASS");