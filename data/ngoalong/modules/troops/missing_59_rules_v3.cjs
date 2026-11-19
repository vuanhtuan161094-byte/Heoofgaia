"use strict";
/* Chat02 read-only evidence planner. No executable wiki runtime skills.
 * Two studied troop profiles get project-original preview intents, not activation.
 * Does not access battle engine, Save, RNG, reward or campaign globals.
 */
const fail=m=>{throw Error("NL_MISSING59_V3: "+m);};
const copy=x=>JSON.parse(JSON.stringify(x));
function create(data){
 if(data?.schemaVersion!==3||data.records?.length!==59)fail("59-row evidence review required");
 const refs=new Map(data.records.map(x=>[x.wikiAppearanceId,x]));
 const previewable=data.records.filter(x=>x.independentCombatProfileReady);
 if(refs.size!==59||previewable.length!==2||data.review.remainingWithoutUnitSpecificMechanic!==57)fail("source identity/status mismatch");
 function lookup(id){
  const x=refs.get(id);return x?copy(x):null;
 }
 function eligible(id){
  const x=refs.get(id);return !!(x&&x.independentCombatProfileReady&&!x.livePlayable);
 }
 function plan(id){
  const x=refs.get(id);
  if(!x)return {allowed:false,reason:"UNKNOWN_ID",intents:[],mutated:false};
  if(!eligible(id))return {allowed:false,reason:x.evidenceStatus,intents:[],mutated:false};
  if(x.evidenceStatus==="TROOP_SPECIFIC_MECHANIC_RECOVERED"){
   const keyed=Object.fromEntries(x.sourcedMechanics.map(t=>[t.operation,t]));
   const defense=keyed.apply_kien_thu,morale=keyed.self_morale_gain_unaffected;
   if(!defense||!morale||defense.sourceDuration!==2||morale.sourceDuration!==2)fail("missing explicit source fact");
   return {allowed:true,sourceId:x.wikiAppearanceId,context:"NPC_ONLY",classification:"SOURCE_DERIVED_PROJECT_PREVIEW",
    intents:[
     {type:"ability-descriptor",operation:"qualitative_magic_offense",sourceStrength:null,classification:"VERIFIED_QUALITATIVE",apply:false},
     {type:"status-intent",operation:"self_morale_gain_unaffected",target:"self",durationTurns:2,startTurnHint:"NEXT_TURN",
       startTurnHintProvenance:"DERIVED",trigger:null,chance:null,magnitude:null,apply:false,classification:"VERIFIED_SOURCE_DURATION"},
     {type:"status-intent",operation:"apply_kien_thu",target:"self",durationTurns:2,
       wikiEffectId:"nlwe-153-kien-thu",wikiEffectVariant2:"nlwe-154-kien-thu-2",
       wikiEffectLinkProvenance:"DERIVED_EXACT_NAME_LINK",stacking:"ACCUMULATIVE",defenseBonusPct:null,
       runtimeEffectId:null,trigger:null,chance:null,apply:false,classification:"VERIFIED_SOURCE_DURATION_DERIVED_LINK"}
    ],mutated:false,livePlayable:false,maySettle:false,mayImportTo3x3:false};
  }
  if(x.evidenceStatus==="QUALITATIVE_PROFILE_RECOVERED"){
   return {allowed:true,sourceId:x.wikiAppearanceId,context:"NAVAL_ONLY",classification:"PROJECT_SIMULATED_PREVIEW",
    intents:[{type:"trait-descriptor",operation:"balanced_capability",sourceStatValues:null,sourceDamageFormula:null,
      projectStatGrowth:null,sourceProvenance:"VERIFIED_QUALITATIVE",apply:false}],
    mutated:false,livePlayable:false,maySettle:false,mayImportTo3x3:false};
  }
  fail("unrecognized eligible profile");
 }
 function audit(){
  return {records:refs.size,sourceSpecificRecovered:data.review.specificStructuredRecovered,
   qualitativeRecovered:data.review.qualitativeRecovered,familyRelationOnly:data.review.familyOnlyRelation,
   sourceUnresolved:data.review.remainingWithoutUnitSpecificMechanic,
   demoCandidates:previewable.length,actualRuntimeImported:0,unknownUnverifiedFormulas:true};
 }
 return Object.freeze({lookup,eligible,plan,audit,liveIntegrated:false,mutatesState:false});
}
module.exports={create};