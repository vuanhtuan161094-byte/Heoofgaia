"use strict";
const assert=require("node:assert/strict");
const {loadCatalogue}=require("../tools/nl_hero_catalogue.js");
const {loadRules,mainCityUnlocks,abilityForStage,auditDevelopment}=require("../tools/nl_hero_progression.js");
const c=loadCatalogue();
const rules=loadRules();
let tested=0;
function check(name,fn){fn();tested++;console.log("PASS NL_HERO_PROGRESS: "+name);}
check("Orange awakening opens at main city 300",()=>{
 assert.equal(mainCityUnlocks(299,rules).orangeSystemAvailable,false);
 assert.equal(mainCityUnlocks(300,rules).orangeSystemAvailable,true);
});
check("Gold awakening opens at main city 380",()=>{
 assert.equal(mainCityUnlocks(379,rules).goldSystemAvailable,false);
 assert.equal(mainCityUnlocks(380,rules).goldSystemAvailable,true);
});
check("Destiny opens at main city 400",()=>{
 assert.equal(mainCityUnlocks(399,rules).destinySystemAvailable,false);
 assert.equal(mainCityUnlocks(400,rules).destinySystemAvailable,true);
});
check("invalid city levels rejected",()=>{
 assert.throws(()=>mainCityUnlocks(-1,rules),/invalid main city level/);
 assert.throws(()=>mainCityUnlocks(3.5,rules),/invalid main city level/);
});
check("individual hero awakening never becomes automatic",()=>{
 assert.equal(mainCityUnlocks(999,rules).individualAwakeningEligibility,"UNKNOWN");
 assert.equal(mainCityUnlocks(999,rules).verifiedActualStage,null);
});
check("Wiki Gold material list is verified, costs remain UNKNOWN",()=>{
 assert.deepEqual(rules.awakeningMaterials.GOLD,["Quỳnh Tương","Xích Quả","Hoàng Trung Lý"]);
 assert.equal(rules.destiny.actualCosts,null);
 assert.equal(rules.destiny.allDestinyChoicesKnown,false);
});
check("Quan Vũ Gold denied before Lv380",()=>{
 const h=c.profiles.find(x=>x.name==="Quan Vũ");
 assert.equal(abilityForStage(h.id,"GOLD",c,379).status,"SYSTEM_LOCKED");
});
check("Quan Vũ Gold yields source descriptor, not executable skill",()=>{
 const h=c.profiles.find(x=>x.name==="Quan Vũ");
 const a=abilityForStage(h.id,"GOLD",c,380);
 assert.equal(a.status,"REFERENCE_ONLY_NEEDS_AWAKENING_AND_CHAT_05");
 assert.equal(a.ability.skillName,"Uy Chấn Muôn Phương");
 assert.equal(a.executable,false);
});
check("Viên Thiệu Gold version conflict cannot be automatically resolved",()=>{
 const h=c.profiles.find(x=>x.name==="Viên Thiệu");
 const a=abilityForStage(h.id,"GOLD",c,400);
 assert.equal(a.status,"VERSION_AMBIGUOUS");
 assert.deepEqual(a.sourceVersions,["2025-12-12","2026-06-07"]);
});
check("no inferred skill for never researched general",()=>{
 const h=c.profiles.find(x=>x.name==="Lạc Tiến");
 assert.equal(abilityForStage(h.id,"GOLD",c,400).status,"SOURCE_SKILL_UNKNOWN");
});
check("unknown stage not silently equated to an awakening",()=>{
 assert.equal(abilityForStage("wiki-mobile-hero-048","WHITE",c,400).status,"UNKNOWN_STAGE");
});
check("no game runtime or Save is touched by development audit",()=>{
 const a=auditDevelopment(c,400);
 assert.equal(a.heroProfiles,364);assert.equal(a.verifiedStageAbilities,55);
 assert.equal(a.playableFromWiki,0);
 assert.equal(a.mutateRuntime,false);
});
console.log("NL_HERO_PROGRESS "+tested+"/"+tested+" PASS");
