"use strict";
/**
 * A1/A2/A3: Complete identity/source audit for the selected backlogs.
 * Source layers: Mobile dated facts, classic historical baseline, NPC encounter name,
 * unique identity link. Zero runtime writes or unproven playable/NPC-only promotion.
 */
const fs=require("node:fs"),path=require("node:path");
const dirname=__dirname;
function read(p){return JSON.parse(fs.readFileSync(path.join(dirname,p),"utf8"))}
function guard(value,msg){if(!value)throw Error("A123_AUDIT_V5: "+msg)}
function byId(list){return new Map(list.map(x=>[x.heroId,x]))}
function groupBy(arr,key){const m=new Map();for(const r of arr){const k=key(r);const q=m.get(k)||[];q.push(r);m.set(k,q)}return m}
const SKILL_MECHANICS=new Set(["DATED_STAGE_SKILL_BALANCE","PURPLE_SPECIAL_WEAPON_BALANCE","GUIDE_SKILL_MORALE"]);
const FACT_TYPES=new Set(["DATED_STAGE_SKILL_BALANCE","PURPLE_SPECIAL_WEAPON_BALANCE","GUIDE_COMBAT_ROLE_AND_PROGRESSION","GUIDE_PROGRESSION_RECOMMENDATION","GUIDE_SKILL_MORALE","NPC_CAMPAIGN_APPEARANCE"]);
function validateFacts(facts,base){
 guard(facts.schemaVersion===1&&facts.count===12&&facts.records.length===12,"12 dated source facts");
 const names=byId(base.entries),ids=new Set();
 for(const x of facts.records){
  guard(!ids.has(x.factId),"duplicate source fact");ids.add(x.factId);
  const h=names.get(x.heroId);
  guard(h&&h.name===x.name&&h.faction===x.faction,"broken hero identity "+x.name);
  guard(FACT_TYPES.has(x.facet),"unreviewed source facet "+x.facet);
  const sr=facts.sources[x.group];
  guard(sr&&x.sourceUrl===sr.url&&x.sourceDate===sr.date,"source URL/date drift "+x.factId);
  guard(x.gameplayImport===false&&x.currentRuntimeApplicable===null,"unapproved gameplay binding "+x.factId);
 }
 return facts.records;
}
function createV5({
 base=read("hero_source_evidence_matrix_v4.json"),
 factPack=read("a123_mobile_sourced_facts_v5.json"),
 wei=read("a1_wei_18_reconciliation_v5.json"),
 npcDetails=null,maps=null
}={}){
 guard(base.schemaVersion===4&&base.total===364&&base.entries.length===364,"V4 expected input");
 guard(base.audit.mobileDetailWithRecruitment===142&&base.audit.withAnyDatedHistoricalSource===155,"source baseline changed");
 guard(wei.rows.length===18&&wei.statusTotals.classicNameExact===12,"A1 baseline changed");
 const facts=validateFacts(factPack,base),mapped=groupBy(facts,f=>f.heroId);
 const names=groupBy(base.entries,x=>x.name),identities=byId(base.entries);
 const a1=wei.rows.map(w=>{
  const entry=identities.get(w.heroId),observations=mapped.get(w.heroId)||[];
  guard(entry&&entry.faction==="Ngụy"&&entry.name===w.wikiName,"A1 wrong hero");
  return {
   ...w,
   newMobileFactIds:observations.map(x=>x.factId),
   mobileSkillMechanicFound:observations.some(x=>SKILL_MECHANICS.has(x.facet)),
   historicExactLinkCount:entry.evidenceLanes.classicBase2012_2013.length,
   currentMobileStatsFullyVerified:false,individualAwakeningCostVerified:false,
   researchState:observations.length?"PARTIAL_MOBILE_FACTS":"HISTORIC_OR_UNKNOWN",
   runtimeEligible:false
  };
 });
 const originalQuan=base.entries.filter(x=>x.faction==="Quần"&&!x.hasPublishedMobileDetail);
 const a2=originalQuan.map(h=>{
  const ff=mapped.get(h.heroId)||[],facets=ff.map(x=>x.facet),skillFacts=ff.filter(x=>SKILL_MECHANICS.has(x.facet));
  return {
   heroId:h.heroId,name:h.name,indexGrade:h.wikiListedGrade,
   before:"MOBILE_DETAILS_NOT_SOURCED",
   after:skillFacts.length?"PARTIAL_MOBILE_SKILL_FACT":
         facets.includes("GUIDE_PROGRESSION_RECOMMENDATION")?"MOBILE_GUIDE_CONTEXT_ONLY":
         facets.includes("NPC_CAMPAIGN_APPEARANCE")?"NPC_APPEARANCE_CONTEXT_ONLY":"STILL_MOBILE_UNKNOWN",
   sourceFactIds:ff.map(x=>x.factId),
   sourcedStageNames:skillFacts.map(x=>x.data.stage).filter(Boolean),
   skillNamesVerified:skillFacts.length>0&&skillFacts.every(x=>typeof x.data.skillName==='string'),
   combatRoleVerified:false,
   currentFullSkillMechanics:false,
   baseAttributes:null,rebirthFormula:null,individualAwakeningMaterials:null,
   recruitmentMethod:null,playable:false,needsResearch:true
  };
 });
 for(const x of wei.rows){
  guard(x.noAutoPromote===true,"Wei alias/source promotion forbidden");
  guard(x.sourceValidation?.nativeMobileBaseAttributes===null&&x.sourceValidation?.nativeMobileAwakeningCosts===null,"unproven Wei current fields");
  if(x.sourceValidation.reviewAlias)guard(x.sourceValidation.reviewAlias.confirmedMobileId===false&&x.sourceValidation.reviewAlias.resolvedForRuntime===false,"alias falsely resolved");
 }
 guard(a1.length===18&&a2.length===125,"A1/A2 expected backlog counts");
 let npc=Array.isArray(npcDetails)?npcDetails:null;
 let mapList=Array.isArray(maps)?maps:null;
 if(npc===null){
  const details=JSON.parse(fs.readFileSync(path.join(dirname,"../../group02_wiki/npc_details.json"),"utf8"));
  guard(Array.isArray(details.npcDetails),"missing source NPC details");
  npc=details.npcDetails;
 }
 if(mapList===null){
  const sourceMaps=JSON.parse(fs.readFileSync(path.join(dirname,"../../group02_wiki/maps_npcs.json"),"utf8"));
  guard(Array.isArray(sourceMaps.maps),"missing source NPC maps");
  mapList=sourceMaps.maps.flatMap(m=>m.npcs.map(n=>({name:n.name,mapId:m.mapQueryId,mapName:m.name,kind:n.kind})));
 }
 const npcByName=groupBy(npc,d=>d.npcName),mapByName=groupBy(mapList,n=>n.name);
 const neutral=base.entries.filter(x=>x.faction==="Trung lập");
 const a3=neutral.map(h=>{
  const recruit=h.evidenceLanes.mobile2022Recruitment||[];
  const directNpc=npcByName.get(h.name)||[];
  const campaign=mapByName.get(h.name)||[];
  const exactNameEntries=names.get(h.name)||[];
  const bossOnlyUnique=directNpc.length>0&&exactNameEntries.length===1;
  const ambiguousMap=campaign.length>0&&exactNameEntries.length>1;
  const kind=recruit.length?"RECRUITMENT_PUBLISHED":
   bossOnlyUnique?"BOSS_ENCOUNTER_NAME_MATCH_ONLY":
   ambiguousMap?"BOSS_NAME_AMBIGUOUS_MULTIPLE_ROSTER_ENTRIES":"UNKNOWN_ROLE";
  const evidence=[
   ...directNpc.map(x=>({
    sourceKind:"VNG_WIKI_NPC_BOSS_DETAIL",npcName:x.npcName,
    mapId:x.mapQueryId,aiId:x.aiQueryId,sourceUrl:`https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?ai=${x.aiQueryId}&map=${x.mapQueryId}&side=vn`,
    encounterType:x.encounterType,
    level:x.level,totalSoldiers:x.totalSoldiers,
    selectedUnitIsBoss:x.selectedUnit?.name===x.npcName,
    selectedBossSkill:x.selectedUnit?.name===x.npcName?x.selectedUnit?.skillName:null,
    sourceScope:x.sourceDepth||"NPC_ENCOUNTER_ONLY",
    identityLink:"SAME_EXACT_NAME_NOT_PROVEN_SAME_ENTITY"
   })),
   ...campaign.map(x=>({
    sourceKind:"REFERENCE_MAP_NPC_APPEARANCE",mapId:x.mapId,mapName:x.mapName,
    npcName:x.name,kind:x.kind,sourceRef:"data/ngoalong/group02_wiki/maps_npcs.json",
    matchingWikiHeroIds:exactNameEntries.map(e=>e.heroId),
    identityLink:"AMBIGUOUS_DUPLICATE_HERO_NAME_DO_NOT_MERGE"
   }))
  ];
  return {
   heroId:h.heroId,name:h.name,wikiFaction:"Trung lập",
   wikiRosterListed:true,hasRecruitEvidence:recruit.length>0,
   recruitmentSourceFactIds:recruit.map(x=>x.factId),
   classification:kind,bossAppearanceEvidence:evidence,
   currentRecruitEligibility:recruit.length?"GUIDE_DESCRIBED_METHOD_CURRENT_PARITY_UNVERIFIED":"UNKNOWN",
   samePersonAsNpcConfirmed:false,
   npcOnlyConfirmed:false,playable:false,
   skillFullyKnown:false,baseStatsFullyKnown:false,individualAwakeningCostKnown:false
  };
 });
 guard(a3.length===73,"73 neutral roster index records required");
 const a2Status=Object.fromEntries([...new Set(a2.map(x=>x.after))].map(s=>[s,a2.filter(x=>x.after===s).length]));
 const a3Status=Object.fromEntries([...new Set(a3.map(x=>x.classification))].map(s=>[s,a3.filter(x=>x.classification===s).length]));
 const sourceFactCovered=new Set(facts.map(x=>x.heroId));
 const V4SourceCovered=new Set(base.entries.filter(x=>x.hasAnyHistoricalDetail).map(x=>x.heroId));
 const union=new Set([...V4SourceCovered,...sourceFactCovered,...a3.filter(x=>x.bossAppearanceEvidence.some(e=>e.sourceKind==="VNG_WIKI_NPC_BOSS_DETAIL")).map(x=>x.heroId)]);
 const newMobileMechanics=[...new Set(facts.filter(f=>SKILL_MECHANICS.has(f.facet)&&!identities.get(f.heroId).hasPublishedMobileDetail).map(x=>x.heroId))];
 const mobileGuideOnly=a2.filter(x=>x.after==="MOBILE_GUIDE_CONTEXT_ONLY").length;
 const newNeutralNpcNameMatch=a3.filter(x=>x.classification==="BOSS_ENCOUNTER_NAME_MATCH_ONLY").length;
 const outputs={
  schemaVersion:5,checkedAt:"2026-11-19",sourceEdition:"CROSS_EDITION_SOURCE_AUDIT",
  sourceAuthority:"RESEARCH_ONLY",runtimeImport:false,
  counts:{
   indexedHeroes:364,priorMobileDetails:142,
   newMobileMechanicsOnly:newMobileMechanics.length,
   publishedMobileSourceProfiles:142+newMobileMechanics.length,
   guideRecommendationsWithoutMechanics:mobileGuideOnly,
   neutralNpcBossNameMatches:newNeutralNpcNameMatch,
   totalWithAnySourceLane:union.size,
   heroOrGuideSourceProfiles:base.audit.withAnyDatedHistoricalSource+new Set(
    facts.filter(f=>f.facet!=="NPC_CAMPAIGN_APPEARANCE"&&!V4SourceCovered.has(f.heroId)).map(x=>x.heroId)
   ).size,
   npcContextOnlyNameMatches:union.size-(
    base.audit.withAnyDatedHistoricalSource+new Set(facts.filter(f=>f.facet!=="NPC_CAMPAIGN_APPEARANCE"&&!V4SourceCovered.has(f.heroId)).map(x=>x.heroId)).size
   ),
   totalIndexOnlyAcrossSourceLanes:364-union.size,
   playableNewHeroes:0
  },
  a1:{total:a1.length,rows:a1,originalUnresolvedNames:wei.aliasSpecificNotes},
  a2:{total:a2.length,rows:a2,byStatus:a2Status},
  a3:{total:a3.length,rows:a3,byStatus:a3Status},
  sharedRules:{
   noAutomaticAliasMerging:true,
   noCrossEditionStatImport:true,
   noNpcEncounterEqualsUnrecruitableAssumption:true,
   noAutomaticNewHeroRuntime:true
  }
 };
 guard(outputs.counts.newMobileMechanicsOnly===3,"new mobile mechanics expected 3 heroes");
 guard(union.size===160,"deduped cross-source fact union expected 160");
 guard(outputs.counts.heroOrGuideSourceProfiles===157&&outputs.counts.npcContextOnlyNameMatches===3,"edition source distinction lost");
 guard(a3Status.RECRUITMENT_PUBLISHED===1&&a3Status.BOSS_ENCOUNTER_NAME_MATCH_ONLY===2
   &&a3Status.BOSS_NAME_AMBIGUOUS_MULTIPLE_ROSTER_ENTRIES===1
   &&a3Status.UNKNOWN_ROLE===69,"neutral role triage changed "+JSON.stringify(a3Status));
 guard(a2Status.PARTIAL_MOBILE_SKILL_FACT===2&&a2Status.MOBILE_GUIDE_CONTEXT_ONLY===1
   &&a2Status.NPC_APPEARANCE_CONTEXT_ONLY===1&&a2Status.STILL_MOBILE_UNKNOWN===121,"Quan source triage changed "+JSON.stringify(a2Status));
 guard(outputs.a3.rows.every(x=>!x.playable&&!x.npcOnlyConfirmed&&!x.samePersonAsNpcConfirmed),"identity contract broken");
 return outputs;
}
if(require.main===module){
 const x=createV5();
 fs.writeFileSync(path.join(dirname,"a123_hero_research_audit_v5.json"),JSON.stringify(x,null,2)+"\n");
 console.log(JSON.stringify({counts:x.counts,a2:x.a2.byStatus,a3:x.a3.byStatus},null,2));
}
module.exports={createV5,validateFacts,SKILL_MECHANICS};
