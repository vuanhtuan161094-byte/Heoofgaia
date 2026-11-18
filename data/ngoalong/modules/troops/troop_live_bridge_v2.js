/* Muu Dinh Tam Quoc — Chat02 V2, read-only bridge for Chat08.
   The live game alone owns HP, statuses, action order, replay, Save and receipts.
   This adapter NEVER calls the standalone stepBattle and NEVER mutates live state.
*/
(function(root,factory){
"use strict";
const api=factory();
if(typeof module==="object"&&module.exports)module.exports=api;
if(root)root.NLTroopLiveContractV2=api;
})(typeof window!=="undefined"?window:null,function(){
"use strict";
const copy=x=>JSON.parse(JSON.stringify(x));
const must=(b,m)=>{if(!b)throw Error("NL_TROOP_LIVE_V2: "+m);};
function create(contract,project,evolution){
must(contract?.schemaVersion===2&&contract.records?.length===25,"contract missing");
must(project?.units?.length===25&&evolution?.projectEdges?.length===18,"project definitions missing");
const idMap=new Map(contract.records.map(x=>[x.projectId,x]));
const legacyMap=new Map(contract.records.map(x=>[x.legacyId,x]));
must(idMap.size===25&&legacyMap.size===25,"ID collision");
must(contract.records.every(x=>x.provenance==="SIMULATED"&&!x.safety.wikiImport&&x.safety.mainHitIsAuthoritative),"unsafe source");
function lookup(id){
  if(typeof id!=="string"||id.startsWith("nlwm-"))return null;
  const value=idMap.get(id)||legacyMap.get(id);
  return value?copy(value):null;
}
function resolveLive({actor,battle,game}={}){
  if(!actor||!battle||battle.mode!=="campaign"||!["p","e"].includes(actor.team))return {allowed:false,reason:"NON_CAMPAIGN"};
  if(typeof actor.troop!=="string"||actor.troop.startsWith("nlwm-"))return {allowed:false,reason:"UNKNOWN_OR_WIKI_TROOP"};
  const assigned=actor.team==="p"?(actor.r03Branch||game?.nlr03?.evolutions?.[actor.id]||null):null;
  if(assigned){
    const u=lookup(assigned);
    if(!u||u.currentRuntime.r03BranchId!==assigned)return {allowed:false,reason:"INVALID_R03_BRANCH"};
    return {allowed:true,unit:u,source:"EXISTING_R03"};
  }
  const u=lookup(actor.troop);
  if(!u||u.currentRuntime.r03BranchId!==null)return {allowed:false,reason:"UNSUPPORTED_BASE"};
  return {allowed:true,unit:u,source:"EXISTING_R02"};
}
function plan(input={}){
 const result=resolveLive(input);
 if(!result.allowed)return {allowed:false,reason:result.reason,unapplied:true,intent:null};
 const u=result.unit;
 if(!u.proposedAddon)return {allowed:true,reason:"NO_NEW_TRAIT_WHILE_R03_ACTIVE",unitId:u.projectId,unapplied:true,intent:null};
 const p=u.proposedAddon,phase=input.phase;
 if(phase!==p.phase)return {allowed:true,reason:"PHASE_MISMATCH",unitId:u.projectId,unapplied:true,intent:null};
 must(typeof input.battleId==="string"&&input.battleId,"stable battleId required");
 must(typeof input.actionId==="string"&&input.actionId,"stable actionId required");
 must(typeof input.actor.id==="string"&&input.actor.id,"stable actor ID required");
 const targetId=input.target?.id||null;
 return {allowed:true,reason:"UNAPPLIED_ADDITIVE_INTENT",unitId:u.projectId,unapplied:true,intent:{
    id:[input.battleId,input.actionId,input.actor.id,targetId||"-",u.projectId,phase].join(":"),
    phase,actorId:input.actor.id,targetId,projectTroopId:u.projectId,
    mechanic:u.behavior.mechanic,operation:p.effectIntent,value:u.behavior.value,lane:u.behavior.lane,
    classification:"SIMULATED",producer:"CHAT02",consumer:"CHAT08",
    alreadyImplementedFields:u.currentRuntime.fieldsRead,
    status:"PENDING_CHAT08",apply:false,settle:false,save:false,receipt:false,needsDedupe:true
 }};
}
function audit(){
return Object.freeze({
 project:contract.records.length,
 base:contract.records.filter(x=>!x.currentRuntime.r03BranchId).length,
 r03:contract.records.filter(x=>!!x.currentRuntime.r03BranchId).length,
 addonProposals:contract.records.filter(x=>!!x.proposedAddon).length,
 sourceWikiImported:0,liveIntegrated:false,
 standaloneStepBattleEnabled:false,mainHitAuthoritative:true
});
}
return Object.freeze({lookup,resolveLive,plan,audit,mutatesState:false,liveIntegrated:false});
}
return Object.freeze({create});
});