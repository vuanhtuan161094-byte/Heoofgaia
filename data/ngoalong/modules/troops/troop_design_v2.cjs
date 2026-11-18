"use strict";
// Pure, side-effect-free design adapter. Does not load or mutate game Save/combat.
const invariant=(ok,message)=>{if(!ok)throw new Error(message);};
const path=require("node:path");
function getDesignData(root=path.resolve(__dirname,"../../../..")){
  return {
    wiki:(()=>{const i=require(path.join(root,"data/ngoalong/modules/troops/catalogue_wiki_v1.json"));return {...i,records:i.recordShards.flatMap(p=>require(path.join(root,p)).records)};})(),
    project:require(path.join(root,"data/ngoalong/modules/troops/project_playable_v1.json")),
    evolution:require(path.join(root,"data/ngoalong/modules/troops/evolution_contract_v1.json"))
  };
}
function findProjectUnit(data,id){
  const key=String(id||"");
  return data.project.units.find(u=>u.id===key||u.legacyId===key)||null;
}
function describeTroop(data,id){
  const source=data.wiki.records.find(u=>u.id===id);
  if(source)return {kind:"WIKI_REFERENCE",id:source.id,combat:source.combat,art:source.art,provenance:source.provenance,active:false};
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
module.exports={getDesignData,findProjectUnit,describeTroop,tierStatProfile,evolutionOptions,nextTierDesignQuote,resolveWikiStatusTags};
if(require.main===module){
  const d=getDesignData();
  process.stdout.write(JSON.stringify({wikiRows:d.wiki.records.length,projectUnits:d.project.units.length,wikiNamedEdges:d.evolution.sourceNamedEdges.length,designOnly:true})+"\n");
}
