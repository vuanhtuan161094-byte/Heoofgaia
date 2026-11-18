"use strict";
/**
 * Canonical read-only Chat01 handoff. Joins:
 * - Wiki 364 names + 55 versioned skill descriptors,
 * - 82 cross-faction guide snapshot rows (67 unique candidates),
 * - historical Sep 2024 balance corrections.
 * It intentionally does NOT mutate index.html, alpha_content, Save or combat.
 */
const {loadCatalogue}=require("../../../../tools/nl_hero_catalogue.js");
const {loadGuide}=require("./guide_stats_adapter_v1.js");
const {getSnapshotForReview}=require("./balance_release_overlay_v1.js");
const VERSION="NL_HERO_BATCH_V2_20261119";
function invariant(v,m){if(!v)throw new Error("NL_HERO_BUNDLE: "+m);}
function assembleHeroes(){
 const catalog=loadCatalogue(),guide=loadGuide();
 invariant(catalog.profiles.length===364&&catalog.wikiStageSkills.length===55,"source catalogue coverage changed");
 invariant(guide.audit.rowCount===82&&guide.candidates.length===67,"guide batch coverage changed");
 const guideById=new Map(guide.candidates.map(c=>[c.heroId,c]));
 const skillsById=new Map(catalog.skillDescriptors.map(s=>[s.heroId,s]));
 const facts=catalog.profiles.map(hero=>{
  const skill=skillsById.get(hero.id),base=guideById.get(hero.id)||null;
  invariant(skill&&skill.runtimeImport===false,"invalid Chat05 skill link: "+hero.id);
  return {
   heroId:hero.id,
   wikiIndex:{name:hero.name,faction:hero.faction,listedGrade:hero.grade.listed,edition:hero.edition,sourceUrl:hero.source.url},
   historicalGuide:base,
   datedSkillVersions:skill.stageSkills,
   currentAwakeningStage:null,
   currentDetailedStats:null,
   currentEquippedSkillId:null,
   sourceReadyDomains:{
    listIdentity:true,baseGuideStats:base!==null,hasAnyDatedStageSkill:skill.stageSkills.length>0,
    currentStage:false,combatFormula:false,verifiedVersionedEquippedSkill:false
   },
   runtimeStatus:"REFERENCE_ONLY",
   runtimeImport:false
  };
 });
 const historicalPatch=getSnapshotForReview("Quan Vũ");
 invariant(historicalPatch.original.length===1&&historicalPatch.revised.length===1,"Quan Vũ historical evidence absent");
 const corrected=historicalPatch.revised[0];
 invariant(corrected.events[0].coefficientPct===300&&corrected.events[2].physicalAttackBonusPct===29000&&corrected.events[2].physicalAttackBonusPctPerCounter===1000,"dated skill patch unexpectedly changed");
 const boundGuideCount=facts.filter(x=>x.historicalGuide!==null).length;
 const publishedSkillCount=facts.filter(x=>x.sourceReadyDomains.hasAnyDatedStageSkill).length;
 return {
  contract:VERSION,
  catalogSnapshot:"VNG_WIKI_MOBILE_CURRENT",
  guideSnapshot:"VNG_MOBILE_GUIDE_20260930",
  total:364,
  byHero:facts,
  releases:{historicalQuanVuOrange:historicalPatch,unmappedGuideNames:guide.audit.unresolvedNameCases},
  coverage:{
   indexedHeroes:364,
   guideSourceRows:82,
   guideMatchedRecords:guide.audit.exactNameMatchedRecords,
   uniqueWikiCandidatesWithGuideStats:boundGuideCount,
   indexedHeroesWithDatedSkill:publishedSkillCount,
   sourcedVersionedSkills:catalog.wikiStageSkills.length,
   directHistoricalPatches:3,
   currentPlayablesImported:0
  },
  exclusions:{runtimeWrites:true,saveWrites:true,combatWrites:true,formulaGuessing:true},
  integrationOwner:"CHAT_08",
  combatResolverOwner:"CHAT_05"
 };
}
function getHeroForIntegration(bundle,heroId){
 invariant(typeof heroId==="string"&&heroId.length>0,"missing heroId");
 const found=bundle.byHero.find(h=>h.heroId===heroId);
 return found||null;
}
if(require.main===module){
 const x=assembleHeroes();
 console.log(JSON.stringify({contract:x.contract,coverage:x.coverage,owners:{combat:x.combatResolverOwner,integration:x.integrationOwner}},null,2));
}
module.exports={assembleHeroes,getHeroForIntegration,VERSION};
