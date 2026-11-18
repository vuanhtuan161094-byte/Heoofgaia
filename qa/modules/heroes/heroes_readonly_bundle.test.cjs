"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const bundle=require("../../../data/ngoalong/modules/heroes/heroes_readonly_bundle_v2.js");
const patch=require("../../../data/ngoalong/modules/heroes/balance_release_overlay_v1.js");
const dir=path.resolve(__dirname,"../../../data/ngoalong/modules/heroes");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const old=read("wiki_orange_skills_2024_v1.json");
const notice=read("wiki_skill_overrides_20240903_v1.json");
const snapshot=bundle.assembleHeroes();
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log("PASS NL_HERO_BUNDLE: "+name)};
check("14 source-only original changes and 55 skill facts remain independent",()=>{
 assert.equal(snapshot.coverage.sourcedVersionedSkills,55);
 assert.equal(snapshot.coverage.directHistoricalPatches,3);
 assert.equal(snapshot.contract,"NL_HERO_BATCH_V2_20261119");
});
check("82 guide rows resolve to 67 eligible name candidates, never runtime",()=>{
 assert.equal(snapshot.coverage.guideSourceRows,82);
 assert.equal(snapshot.coverage.guideMatchedRecords,72);
 assert.equal(snapshot.coverage.uniqueWikiCandidatesWithGuideStats,67);
 assert.equal(snapshot.coverage.currentPlayablesImported,0);
});
check("exact 364 Wiki profiles, no overwritten current stage",()=>{
 assert.equal(snapshot.byHero.length,364);
 assert(snapshot.byHero.every(h=>h.runtimeImport===false && h.currentEquippedSkillId===null && h.currentAwakeningStage===null));
});
check("Chat 05 receives dated skills and Chat 08 receives separate older stats",()=>{
 const q=snapshot.byHero.find(h=>h.wikiIndex.name==="Quan Vũ");
 assert(q&&q.historicalGuide&&q.datedSkillVersions.length>=2);
 assert.equal(q.historicalGuide.baseAttributes.martial,97);
 assert.equal(q.sourceReadyDomains.currentStage,false);
});
check("skill patch baseline is valid and immutable",()=>{
 assert.deepEqual(patch.validateBalancePack(notice,old),{direct:3,sourceOnly:19});
 const plain=JSON.stringify(old);
 const x=patch.buildRevisedOrange(old,notice);
 assert.equal(JSON.stringify(old),plain);
 const oldQ=old.skills.find(h=>h.name==="Quan Vũ");
 const newQ=x.skills.find(h=>h.name==="Quan Vũ");
 assert.equal(oldQ.events[0].coefficientPct,500);
 assert.equal(newQ.events[0].coefficientPct,300);
});
check("Quang Vu Nghia Tuyet bonus was updated exactly",()=>{
 const h=snapshot.releases.historicalQuanVuOrange.revised[0];
 assert.equal(h.events[2].physicalAttackBonusPct,29000);
 assert.equal(h.events[2].physicalAttackBonusPctPerCounter,1000);
 assert.equal(h.sourceVersionOverrides.revisedOn,"2024-09-03");
});
check("other 19 dated changes are not inserted into unrelated source skills",()=>{
 assert.equal(notice.versionedUnboundFacts.length,19);
 const d=notice.versionedUnboundFacts.find(x=>x.name==="Đại Kiều"&&x.field==="roleName");
 assert.equal(d.to,"Quân sư");
 const q=snapshot.byHero.find(x=>x.wikiIndex.name==="Đại Kiều");
 assert(q && q.currentDetailedStats===null);
});
check("patch cannot be applied to wrong skill ID",()=>{
 const bad=structuredClone(notice);bad.directSkillOverlays[0].skillId="wiki-orange-01-20240102";
 assert.throws(()=>patch.validateBalancePack(bad,old),/NL_HERO_BALANCE/);
});
check("patch cannot overwrite data when old value mismatches expected",()=>{
 const bad=structuredClone(notice);bad.directSkillOverlays[0].previous=1234;
 assert.throws(()=>patch.validateBalancePack(bad,old),/NL_HERO_BALANCE/);
});
check("patch cannot claim game runtime permission",()=>{
 const bad=structuredClone(notice);bad.runtimeEligible=true;
 assert.throws(()=>patch.validateBalancePack(bad,old),/NL_HERO_BALANCE/);
});
check("patch source URL is strictly checked",()=>{
 const bad=structuredClone(notice);bad.sourceUrl="https://example.test";
 assert.throws(()=>patch.validateBalancePack(bad,old),/NL_HERO_BALANCE/);
});
check("combat and integration ownership remain separated",()=>{
 assert.equal(snapshot.combatResolverOwner,"CHAT_05");
 assert.equal(snapshot.integrationOwner,"CHAT_08");
 assert(snapshot.exclusions.runtimeWrites&&snapshot.exclusions.saveWrites&&snapshot.exclusions.combatWrites);
});
check("lookups are by Wiki ID, unknown IDs do not fallback to same name",()=>{
 assert.equal(bundle.getHeroForIntegration(snapshot,"not-an-id"),null);
 assert.equal(bundle.getHeroForIntegration(snapshot,"wiki-mobile-hero-048").wikiIndex.name,"Quan Vũ");
});
console.log("NL_HERO_BUNDLE "+checks+"/"+checks+" PASS");
