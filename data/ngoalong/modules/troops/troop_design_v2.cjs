"use strict";
// Pure, side-effect-free design adapter. Does not load or mutate game Save/combat.
const invariant=(ok,message)=>{if(!ok)throw new Error(message);};
const path=require("node:path");
function getDesignData(root=path.resolve(__dirname,"../../../..")){
  return {
    wiki:(()=>{const i=require(path.join(root,"data/ngoalong/modules/troops/catalogue_wiki_v1.json"));return {...i,records:i.recordShards.flatMap(p=>require(path.join(root,p)).records)};})(),
    project:require(path.join(root,"data/ngoalong/modules/troops/project_playable_v1.json")),
    evolution:require(path.join(root,"data/ngoalong/modules/troops/evolution_contract_v1.json")),
    refinement:require(path.join(root,"data/ngoalong/modules/troops/mechanic_refinement_v2.json")),
    sourceReview59:require(path.join(root,"data/ngoalong/modules/troops/missing_59_source_review_v3.json")),
    balanceV4:require(path.join(root,"data/ngoalong/modules/troops/troop_balance_candidates_v4.json"))
  };
}
function findProjectUnit(data,id){
  const key=String(id||"");
  return data.project.units.find(u=>u.id===key||u.legacyId===key)||null;
}
function describeTroop(data,id){
  const source=data.wiki.records.find(u=>u.id===id);
  if(source){const hint=data.refinement?.records.find(x=>x.id===source.id)||null;
    const sourceReview59=data.sourceReview59?.records.find(x=>x.wikiAppearanceId===source.id)||null;
    const originalCandidate=data.balanceV4?.candidates.find(x=>x.sourceWikiAppearanceId===source.id)||null;
    return {kind:"WIKI_REFERENCE",id:source.id,combat:source.combat,art:source.art,provenance:source.provenance,refinement:hint,sourceReview59,
      originalCandidate:originalCandidate?{projectId:originalCandidate.projectId,scope:originalCandidate.projectScope,projectAbilities:originalCandidate.projectAbilities,provenance:"SIMULATED"}:null,
      active:false,liveImportAllowed:false};
  }
  const u=findProjectUnit(data,id);
  if(!u)return null;
  return {kind:"PROJECT_DESIGN",id:u.id,combat:u.combatBehavior,art:u.art,provenance:u.provenance,active:false};
}
function tierStatProfile(data,id,tier){
  const u=findProjectUnit(data,id);
  invariant(u,"Unknown project troop");
  invariant(Number.isInteger(tier)&&tier>=1&&tier<=7,"Design tier outside 1..7");
  const factor=1+0.12*(tier-1);
  const stats=Object.fromEntries(Object.entries(u.stats).map(([k,v])=>[k,k==="morale"?v:Math.round(v*factor)]));
  return {troopId:u.id,tier,stats,factor,classification:"SIMULATED",runtimeWired:false};
}
function evolutionOptions(data,sourceId,context={}){
  const u=findProjectUnit(data,sourceId);
  invariant(u,"Unknown project troop");
  const lvl=Number(context.barracksLevel||0);
  const resources=context.resources||{};
  return data.evolution.projectEdges.filter(e=>e.from===u.id).map(e=>{
    const to=findProjectUnit(data,e.to);
    const cost=to.unlock.resourceCost;
    const enough=Object.entries(cost).every(([key,value])=>Number(resources[key]||0)>=value);
    return {from:e.from,to:e.to,classification:"SIMULATED",cost:{...cost},requiresBarracksLevel:to.unlock.barracksLevel,canAfford:enough,eligible:enough&&lvl>=to.unlock.barracksLevel,gameSaveMutated:false};
  });
}
function nextTierDesignQuote(data,id,tier,context={}){
  invariant(findProjectUnit(data,id),"Unknown project troop");
  invariant(Number.isInteger(tier)&&tier>=1&&tier<7,"No design tier after 7");
  const policy=data.evolution.projectTierPolicy;
  const price=Object.fromEntries(Object.entries(policy.costPerUpgradeBase).map(([key,value])=>[key,Math.round(value*Math.pow(policy.costGrowthFactor,tier-1))]));
  const barracksOk=Number(context.barracksLevel||0)>=policy.unlockBarracksLevel;
  const affordable=Object.entries(price).every(([k,v])=>Number((context.resources||{})[k]||0)>=v);
  return {troopId:findProjectUnit(data,id).id,fromTier:tier,toTier:tier+1,cost:price,eligible:barracksOk&&affordable,withinExistingRuntimeCap:tier+1<=policy.existingRuntimeCap,runtimeEnabled:false,classification:"SIMULATED",mutatesSave:false};
}
function resolveWikiStatusTags(data,id){
  const unit=data.wiki.records.find(u=>u.id===id);
  if(!unit)return [];
  return unit.combat.requiredStatusTags.map(tag=>({tag,runtimeEffectId:null,autoImport:false,sourceStatusUnresolved:true}));
}
function wikiGapStatus(data,id){
  const source=data.wiki.records.find(x=>x.id===id);
  if(!source)return null;
  const gap=data.refinement?.records.find(x=>x.id===id)||null;
  const review=data.sourceReview59?.records.find(x=>x.wikiAppearanceId===id)||null;
  return {sourceId:id,originalCoverage:source.combat.coverage,sourceLine:gap?.source.descriptionLine||null,
    refinementStatus:gap?.evidenceStatus||"PREVIOUSLY_STRUCTURED_SOURCE",
    prototypeId:gap?.projectOriginalSandbox?.id||null,
    sourceReview59:review?{status:review.evidenceStatus,sourceFactLine:review.source.exactFactLine,
      projectPrototypeId:review.projectPrototypeId,unitSpecificRecovered:review.independentCombatProfileReady,
      sourceMechanics:review.sourcedMechanics}:null,
    autoImport:false,livePlayable:false};
}
function wikiGapAudit(data){
 const rows=data.refinement?.records||[];
 return {totalSourceAppearances:data.wiki.records.length,previousStructured:data.wiki.records.filter(x=>x.combat.coverage==="STRUCTURED_FROM_VISIBLE_WIKI").length,
 sourceAnchoredQualitative:rows.filter(x=>x.projectOriginalSandbox).length,missingUsableMechanic:rows.filter(x=>!x.projectOriginalSandbox).length,
 newlySourceRecovered:(data.sourceReview59?.records||[]).filter(x=>x.independentCombatProfileReady).length,
 stillUnresolvedSpecific:data.sourceReview59?.review.remainingWithoutUnitSpecificMechanic??null,
 newlyLiveImported:0};
}
function originalBalanceStatus(data,id){
 const x=data.balanceV4?.candidates.find(x=>x.projectId===id||x.sourceWikiAppearanceId===id);
 if(!x)return null;
 return {projectId:x.projectId,sourceWikiAppearanceId:x.sourceWikiAppearanceId,name:x.name,
  projectScope:x.projectScope,sourceSkillFormulaStatus:x.sourceSkillFormulaStatus,
  projectAbilities:x.projectAbilities,projectStats:x.projectStats,provenance:"SIMULATED",
  liveIntegrated:false,autoImportWiki:false};
}
function originalBalanceAudit(data){
 const rows=data.balanceV4?.candidates||[];
 return {candidates:rows.length,withNumericProbabilities:rows.filter(x=>x.projectAbilities.every(a=>a.procChance>=0&&a.procChance<=1)).length,
  normalLandCandidates:rows.filter(x=>x.projectScope==="LAND_CANDIDATE").length,
  restrictedCandidates:rows.filter(x=>x.projectScope!=="LAND_CANDIDATE").length,
  wikiSourceRecordsPromoted:0,runtimeIntegrated:false};
}
module.exports={getDesignData,findProjectUnit,describeTroop,tierStatProfile,evolutionOptions,nextTierDesignQuote,resolveWikiStatusTags,wikiGapStatus,wikiGapAudit,originalBalanceStatus,originalBalanceAudit};
if(require.main===module){
  const d=getDesignData();
  process.stdout.write(JSON.stringify({wikiRows:d.wiki.records.length,projectUnits:d.project.units.length,wikiNamedEdges:d.evolution.sourceNamedEdges.length,designOnly:true})+"\n");
}
