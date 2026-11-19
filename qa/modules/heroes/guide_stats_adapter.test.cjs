"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const adapter=require("../../../data/ngoalong/modules/heroes/guide_stats_adapter_v1.js");
const base=path.resolve(__dirname,"../../../data/ngoalong/modules/heroes");
const guide=JSON.parse(fs.readFileSync(path.join(base,"guide_thuc_ngo_20260930_v1.json"),"utf8"));
const index=JSON.parse(fs.readFileSync(path.join(base,"wiki_catalogue_v1.json"),"utf8"));
const rows=adapter.buildCandidates(guide,index);
let pass=0;
function check(name,fn){fn();pass++;console.log("PASS NL_HERO_GUIDE: "+name);}
function mutate(fn){
 const copy=structuredClone(guide);fn(copy);
 assert.throws(()=>adapter.validateGuidePack(copy,index),/NL_HERO_GUIDE/);
}
check("all 82 Thuc/Ngo source rows accounted for",()=>{
 assert.equal(rows.audit.rowCount,82);
 assert.deepEqual(rows.audit.counts,{THUC:{RENOWN:20,TRIAL_TOWER:21},NGO:{RENOWN:20,TRIAL_TOWER:21}});
});
check("72 name matches resolve to 67 unique Wiki index candidates",()=>{
 assert.equal(rows.audit.exactNameMatchedRecords,72);
 assert.equal(rows.audit.uniquelyNamedCandidateHeroes,67);
 assert.equal(rows.candidates.length,67);
 assert.equal(new Set(rows.candidates.map(x=>x.heroId)).size,67);
});
check("five repeated tower heroes have identical source facts",()=>{
 assert.equal(rows.audit.crossRealmDuplicates.length,5);
 assert(rows.audit.crossRealmDuplicates.every(x=>x.rows.length===2));
});
check("ten uncertain names are preserved without auto aliases",()=>{
 assert.equal(rows.audit.unresolvedNameCases.length,10);
 const unresolved=rows.audit.unresolvedNameCases.map(x=>x.name);
 assert(unresolved.includes("Tôn Can")&&unresolved.includes("Tưởng Uyễn")&&unresolved.includes("Tôn Quyền"));
 assert(unresolved.includes("Trương Hoành")&&unresolved.includes("Cổ Ung"));
});
check("duplicate historical name Trương Hoành stays unresolved",()=>{
 const r=rows.audit.unresolvedNameCases.find(x=>x.name==="Trương Hoành");
 assert.equal(r.status,"AMBIGUOUS_SAME_NAME");
 assert.deepEqual(r.candidates,["wiki-mobile-hero-104","wiki-mobile-hero-351"]);
});
check("all 67 candidates preserve separate Wiki source and runtime status",()=>{
 for(const x of rows.candidates){
  assert.equal(x.runtimeEligible,false);
  assert.equal(x.readiness,"REFERENCE_ONLY");
  assert.equal(x.mobileWikiEvolvedGradeStats,null);
  assert.equal(x.runtimeStats,null);
  assert.equal(x.skillFormula,null);
 }
 assert.equal(rows.audit.gameplayEligible,0);
});
check("Quan Vũ source base Chỉ Huy/Võ/Trí and growth are exact",()=>{
 const x=rows.candidates.find(x=>x.heroId==="wiki-mobile-hero-048");
 assert.deepEqual(x.baseAttributes,{leadership:93,martial:97,intelligence:77});
 assert.deepEqual(x.rebirthGrowth,{leadership:2.2,martial:2.7,intelligence:2.1});
 assert.equal(x.normalSkillName,"Yến Nguyệt");
 assert.deepEqual(x.acquisitionTerms,{kind:"TRIAL_TOWER",minFloor:78,soulCost:100000});
});
check("Quan Vũ tower conditions source-only no actual grant",()=>{
 const q=rows.candidates.find(x=>x.heroId==="wiki-mobile-hero-048");
 const below=adapter.checkRecruitment(q,{towerFloor:77,heroSouls:100000});
 const enough=adapter.checkRecruitment(q,{towerFloor:78,heroSouls:100000});
 assert.equal(below.meetsPublishedTerms,false);
 assert.equal(enough.meetsPublishedTerms,true);
 assert.equal(enough.grantHero,false);
 assert.equal(enough.spendHeroSouls,0);
 assert.equal(enough.currentVersionEligibility,"UNKNOWN");
});
check("Giản Ung renown/silver thresholds return quote without receipt",()=>{
 const x=rows.candidates.find(x=>x.heroId==="wiki-mobile-hero-042");
 assert.equal(x.acquisitionTerms.requiredRenown,10000);
 assert.equal(x.acquisitionTerms.recruitFeeSilver,5000);
 const enough=adapter.checkRecruitment(x,{renown:10000,silver:5000});
 const less=adapter.checkRecruitment(x,{renown:9999,silver:5000});
 assert.equal(less.meetsPublishedTerms,false);
 assert.equal(enough.meetsPublishedTerms,true);
 assert.equal(enough.spendSilver,0);
 assert.equal(enough.receipt,null);
});
check("rebirth arithmetic is explicitly simulated preview only",()=>{
 const x=rows.candidates.find(x=>x.heroId==="wiki-mobile-hero-048");
 const r=adapter.projectPreviewRebirthStats(x,2);
 assert.deepEqual(r.previewAttributes,{leadership:97.4,martial:102.4,intelligence:81.2});
 assert.equal(r.formulaAuthority,"SIMULATED_PROJECT_LINEAR_PREVIEW");
 assert.equal(r.appliesToRuntime,false);
});
check("negative: wrong source publication date blocked",()=>mutate(x=>{x.records[0].publicationDate="2027-01-01";}));
check("negative: duplicate ID blocked",()=>mutate(x=>{x.records[1].guideRecordId=x.records[0].guideRecordId;}));
check("negative: mutated candidateWikiHeroId cannot become canonical silently",()=>mutate(x=>{x.records[0].identityLink.canonicalWikiHeroId="wiki-mobile-hero-001";}));
check("negative: out of bounds baseline attribute blocked",()=>mutate(x=>{x.records[0].attributes.leadership=9999;}));
check("negative: invalid nonpositive tower cost blocked",()=>mutate(x=>{x.records[21].acquisition.soulCost=-100;}));
check("negative: conflicting shared tower source blocked",()=>{
 mutate(x=>{x.records[43].attributes.martial=99;});
});
check("negative: fake alias resolution blocked",()=>mutate(x=>{x.records[9].identityLink.candidateWikiIds=["wiki-mobile-hero-001"];x.records[9].identityLink.status="NAME_MATCH_SINGLE";}));
check("negative: no invented resource underflow or negative preview",()=>{
 const q=rows.candidates.find(x=>x.heroId==="wiki-mobile-hero-048");
 assert.throws(()=>adapter.checkRecruitment(q,{towerFloor:-1,heroSouls:20}),/NL_HERO_GUIDE/);
 assert.throws(()=>adapter.projectPreviewRebirthStats(q,-1),/NL_HERO_GUIDE/);
});
console.log("NL_HERO_GUIDE "+pass+"/"+pass+" PASS (read-only, no Chromium/Save/CI)");
