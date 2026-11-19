"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const audit=require("../../../data/ngoalong/modules/heroes/a123_hero_research_audit_builder_v5.js");
const root=path.resolve(__dirname,"../../../data/ngoalong/modules/heroes");
const wikiRoot=path.resolve(__dirname,"../../../data/ngoalong/group02_wiki");
const get=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const base=get(path.join(root,"hero_source_evidence_matrix_v4.json"));
const factPack=get(path.join(root,"a123_mobile_sourced_facts_v5.json"));
const wei=get(path.join(root,"a1_wei_18_reconciliation_v5.json"));
const npcs=get(path.join(wikiRoot,"npc_details.json")).npcDetails;
const maps=get(path.join(wikiRoot,"maps_npcs.json")).maps.flatMap(m=>m.npcs.map(n=>({name:n.name,mapId:m.mapQueryId,mapName:m.name,kind:n.kind})));
const payload={base,factPack,wei,npcDetails:npcs,maps};
const data=audit.createV5(payload);
let pass=0;
function test(name,fn){fn();pass++;console.log("PASS A123_V5: "+name)}
test("364 roster IDs remain on source V4 baseline",()=>assert.equal(data.counts.indexedHeroes,364));
test("A1 all 18 Wei IDs explicitly audited",()=>{
 assert.equal(data.a1.total,18);
 assert.equal(new Set(data.a1.rows.map(x=>x.heroId)).size,18);
 assert(data.a1.rows.every(x=>x.currentMobileStatsFullyVerified===false&&x.individualAwakeningCostVerified===false&&!x.runtimeEligible));
});
test("A1 evidence split 12 historic matches / 3 alias / 3 no source",()=>{
 assert.equal(data.a1.rows.filter(x=>x.status==="EXACT_NAME_ARCHIVAL_FACTS").length,12);
 assert.equal(data.a1.rows.filter(x=>x.status==="ALIAS_REVIEW").length,3);
 assert.equal(data.a1.rows.filter(x=>x.status==="NOT_FOUND").length,3);
});
test("A1 alias candidates cannot become exact Mobile IDs",()=>{
 const aliases=data.a1.rows.filter(x=>x.sourceValidation.reviewAlias);
 assert.deepEqual(aliases.map(x=>x.wikiName),["Hách Chiêu","Hí Chí Tài","Lạc Tiến"]);
 assert(aliases.every(x=>x.sourceValidation.reviewAlias.resolvedForRuntime===false&&x.sourceValidation.reviewAlias.confirmedMobileId===false));
});
test("A1 three no-data heroes stay unknown, not fabricated",()=>{
 assert.deepEqual(data.a1.rows.filter(x=>x.status==="NOT_FOUND").map(x=>x.wikiName),["Lý Điển","Vương Song","Nghiêm Chính"]);
});
test("A1 Cao Pi newly sourced Purple weapon and 2026 Strategy role",()=>{
 const x=data.a1.rows.find(x=>x.wikiName==="Tào Phi");
 assert.equal(x.newMobileFactIds.length,2);
 assert.equal(x.mobileSkillMechanicFound,true);
 assert.equal(x.currentMobileStatsFullyVerified,false);
});
test("A2 all 125 Que/Quan prior Mobile gaps audited",()=>{
 assert.equal(data.a2.total,125);
 assert.equal(new Set(data.a2.rows.map(x=>x.heroId)).size,125);
 assert(data.a2.rows.every(x=>x.baseAttributes===null&&x.individualAwakeningMaterials===null&&x.playable===false));
});
test("A2 stage patch data is partial for Wen Yang and Zhang Ning",()=>{
 assert.deepEqual(data.a2.rows.filter(x=>x.after==="PARTIAL_MOBILE_SKILL_FACT").map(x=>x.name).sort(),["Trương Ninh","Văn Ương"].sort());
 const w=data.a2.rows.find(x=>x.name==="Văn Ương");
 assert.deepEqual(w.sourcedStageNames,["RED","PURPLE"]);
 assert.equal(w.combatRoleVerified,false);
});
test("A2 recommendation for Gia Cát Đản is not combat stats",()=>{
 const x=data.a2.rows.find(x=>x.name==="Gia Cát Đản");
 assert.equal(x.after,"MOBILE_GUIDE_CONTEXT_ONLY");assert.equal(x.baseAttributes,null);assert.equal(x.currentFullSkillMechanics,false);
});
test("A2 Mã Đằng is NPC context only, not hero recruit proof",()=>{
 const x=data.a2.rows.find(x=>x.name==="Mã Đằng");
 assert.equal(x.after,"NPC_APPEARANCE_CONTEXT_ONLY");assert.equal(x.recruitmentMethod,null);
});
test("A2 remains 121 entirely unchanged Mobile gaps",()=>{
 assert.equal(data.a2.byStatus.STILL_MOBILE_UNKNOWN,121);
 assert.equal(data.a2.byStatus.PARTIAL_MOBILE_SKILL_FACT,2);
 assert.equal(data.a2.byStatus.MOBILE_GUIDE_CONTEXT_ONLY,1);
 assert.equal(data.a2.byStatus.NPC_APPEARANCE_CONTEXT_ONLY,1);
});
test("A3 all 73 neutral roster rows audited exactly once",()=>{
 assert.equal(data.a3.total,73);
 assert.equal(new Set(data.a3.rows.map(x=>x.heroId)).size,73);
 assert(data.a3.rows.every(x=>!x.playable&&!x.npcOnlyConfirmed&&!x.samePersonAsNpcConfirmed));
});
test("A3 Hứa Cống recruit evidence does not prove current eligibility",()=>{
 const x=data.a3.rows.find(x=>x.name==="Hứa Cống");
 assert.equal(x.classification,"RECRUITMENT_PUBLISHED");
 assert.equal(x.hasRecruitEvidence,true);
 assert.equal(x.currentRecruitEligibility,"GUIDE_DESCRIBED_METHOD_CURRENT_PARITY_UNVERIFIED");
});
test("A3 two unique Boss encounters are only name matches",()=>{
 const boss=data.a3.rows.filter(x=>x.classification==="BOSS_ENCOUNTER_NAME_MATCH_ONLY");
 assert.deepEqual(boss.map(x=>x.name).sort(),["Cao Thăng","Quản Hợi"].sort());
 assert(boss.every(x=>x.bossAppearanceEvidence.length>=1));
});
test("A3 Cao Thăng boss selected unit Thiết Bích only, not transferable",()=>{
 const c=data.a3.rows.find(x=>x.name==="Cao Thăng");
 const e=c.bossAppearanceEvidence.find(x=>x.sourceKind==="VNG_WIKI_NPC_BOSS_DETAIL");
 assert.equal(e.selectedUnitIsBoss,true);assert.equal(e.selectedBossSkill,"Thiết Bích");assert.equal(c.skillFullyKnown,false);
});
test("A3 Quản Hợi does not inherit another NPC unit ability",()=>{
 const x=data.a3.rows.find(x=>x.name==="Quản Hợi");
 const e=x.bossAppearanceEvidence.find(x=>x.sourceKind==="VNG_WIKI_NPC_BOSS_DETAIL");
 assert.equal(e.selectedUnitIsBoss,false);assert.equal(e.selectedBossSkill,null);
});
test("A3 duplicated Trương Hoành never linked to one of two roster IDs",()=>{
 const x=data.a3.rows.find(x=>x.name==="Trương Hoành");
 assert.equal(x.classification,"BOSS_NAME_AMBIGUOUS_MULTIPLE_ROSTER_ENTRIES");
 assert.equal(x.bossAppearanceEvidence[0].matchingWikiHeroIds.length,2);
 assert.equal(x.samePersonAsNpcConfirmed,false);
});
test("A3 69 neutral heroes still no recruit or boss role evidence",()=>{
 assert.equal(data.a3.byStatus.UNKNOWN_ROLE,69);
 assert.equal(data.a3.byStatus.RECRUITMENT_PUBLISHED,1);
 assert.equal(data.a3.byStatus.BOSS_ENCOUNTER_NAME_MATCH_ONLY,2);
 assert.equal(data.a3.byStatus.BOSS_NAME_AMBIGUOUS_MULTIPLE_ROSTER_ENTRIES,1);
});
test("date-locked 12 published source facts and 3 new mechanics-only heroes",()=>{
 assert.equal(audit.validateFacts(factPack,base).length,12);
 assert.equal(data.counts.newMobileMechanicsOnly,3);
 assert.equal(data.counts.publishedMobileSourceProfiles,145);
});
test("scope-accurate counts: 157 hero/guide facts, plus 3 NPC context names",()=>{
 assert.equal(data.counts.heroOrGuideSourceProfiles,157);
 assert.equal(data.counts.npcContextOnlyNameMatches,3);
 assert.equal(data.counts.totalWithAnySourceLane,160);
 assert.equal(data.counts.totalIndexOnlyAcrossSourceLanes,204);
});
test("negative: wrong dated source rejected",()=>{
 const bad=structuredClone(factPack);bad.records[0].sourceDate="2024-01-01";
 assert.throws(()=>audit.createV5({...payload,factPack:bad}),/source URL\/date drift/);
});
test("negative: invented hero mapping rejected",()=>{
 const bad=structuredClone(factPack);bad.records[0].heroId="wiki-mobile-hero-999";
 assert.throws(()=>audit.createV5({...payload,factPack:bad}),/broken hero identity/);
});
test("negative: fake runtime skill activation rejected",()=>{
 const bad=structuredClone(factPack);bad.records[0].gameplayImport=true;
 assert.throws(()=>audit.createV5({...payload,factPack:bad}),/unapproved gameplay binding/);
});
test("negative: A1 alias autoclear forbidden",()=>{
 const bad=structuredClone(wei);bad.rows.find(x=>x.sourceValidation.reviewAlias).sourceValidation.reviewAlias.confirmedMobileId=true;
 assert.throws(()=>audit.createV5({...payload,wei:bad}),/alias falsely resolved/);
});
test("new composite snapshot is deterministic byte-for-byte",()=>{
 const saved=fs.readFileSync(path.join(root,"a123_hero_research_audit_v5.json"),"utf8");
 assert.equal(saved,JSON.stringify(data,null,2)+"\n");
});
console.log("A123_V5 "+pass+"/"+pass+" PASS — source-only, no native game/runtime");
