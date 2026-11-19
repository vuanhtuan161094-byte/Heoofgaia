"use strict";
/* 137 Wiki-source gaps -> original, deterministic trial-only combat actions.
   Never call from campaign. No Save/receipt/reward/state writes, no auto Wiki roster. */
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const requireRule=(ok,message)=>{if(!ok)throw Error("NL_TROOP_REFINEMENT: "+message);};
const copy=x=>JSON.parse(JSON.stringify(x));
function create(refinement){
 requireRule(refinement&&refinement.schemaVersion===2&&refinement.records.length===137,"bad refinement pack");
 const byId=new Map(refinement.records.map(x=>[x.id,x]));
 const byProto=new Map(refinement.records.filter(x=>x.projectOriginalSandbox).map(x=>[x.projectOriginalSandbox.id,x]));
 requireRule(byId.size===137&&byProto.size===78,"missing or duplicated identity");
 function get(id){const x=byId.get(id)||byProto.get(id);return x?copy(x):null;}
 function eligible(id){const x=get(id);return !!(x&&x.source.descriptionLine&&x.projectOriginalSandbox&&!x.runtime.livePlayable);}
 function preview({id,actor,target,enemies=[],incomingDamage=0,attackLane="physical",roll=0.5}={}){
  const x=get(id);
  requireRule(x&&eligible(id),"source is not eligible for a project-original sandbox");
  requireRule(actor&&target&&actor.id&&target.id&&actor.stats&&target.stats,"actor/target stats required");
  requireRule(["physical","magic","tactic"].includes(attackLane),"unsupported lane");
  requireRule(Number.isFinite(roll)&&roll>=0&&roll<1,"deterministic roll in [0,1) required");
  requireRule(Number.isFinite(incomingDamage)&&incomingDamage>=0,"incoming damage invalid");
  const rules=new Set(x.sourceTraits);
  const events=[], power=Number(actor.stats[attackLane]||actor.stats.attack||0);
  const defense=Number(target.stats.defense||0);
  requireRule(Number.isFinite(power)&&power>=0&&Number.isFinite(defense)&&defense>=0,"stats must be nonnegative");
  let multiplier=1;
  if(rules.has("balanced"))multiplier*=1.05;
  if(rules.has("attack"))multiplier*=1.12;
  if(rules.has("basic_attack")&&attackLane==="physical")multiplier*=1.10;
  if(rules.has("physical_attack")&&attackLane==="physical")multiplier*=1.14;
  if(rules.has("magic_attack")&&attackLane==="magic")multiplier*=1.12;
  if(rules.has("tactic_attack")&&attackLane==="tactic")multiplier*=1.10;
  if(rules.has("counter_cavalry")&&target.family==="cavalry")multiplier*=1.25;
  if(rules.has("critical")&&roll<0.12){multiplier*=1.5;events.push({kind:"critical",simulatedChance:0.12});}
  const row=rules.has("row_target"),line=rules.has("line_target");
  const selected=(row||line)?[target,...enemies.filter(y=>y.id!==target.id&&
    Number.isInteger(y.slot)&&Number.isInteger(target.slot)&&
    (row?Math.floor(y.slot/3)===Math.floor(target.slot/3):y.slot%3===target.slot%3))]:[target];
  for(const t of selected){
   const value=Math.max(1,Math.round((15+power*.42-Number(t.stats?.defense||0)*.16)*multiplier));
   events.push({kind:"damage-preview",targetId:t.id,amount:value,lane:attackLane,classification:"SIMULATED",applied:false});
  }
  if(rules.has("burn"))events.push({kind:"burn-preview",targetId:target.id,rounds:2,maxHpFractionPerRound:.04,classification:"SIMULATED",applied:false,wikiDuration:"UNKNOWN"});
  if(rules.has("physical_defense_down"))events.push({kind:"defense-down-preview",targetId:target.id,fraction:.10,rounds:2,classification:"SIMULATED",applied:false,wikiFraction:"UNKNOWN"});
  if(rules.has("self_morale_gain"))events.push({kind:"morale-preview",targetId:actor.id,amount:50,applied:false,classification:"VERIFIED_WIKI_AMOUNT_FOR_THIS_TROOP"});
  if(rules.has("no_enemy_morale_gain"))events.push({kind:"enemy-morale-suppression-preview",targetId:target.id,amount:0,applied:false});
  if(rules.has("limited_enemy_morale_gain"))events.push({kind:"enemy-morale-selector-preview",selector:"single_enemy_only",applied:false});
  let mitigated=incomingDamage;
  if(rules.has("defense")&&attackLane==="physical")mitigated*=.90;
  if(rules.has("magic_defense")&&attackLane==="magic")mitigated*=.90;
  if(rules.has("tactic_defense")&&attackLane==="tactic")mitigated*=.90;
  if(rules.has("weak_to_magic")&&attackLane==="magic")mitigated*=1.15;
  if(rules.has("low_defense")&&attackLane==="physical")mitigated*=1.12;
  if(incomingDamage>0){
   events.push({kind:"incoming-damage-preview",actorId:actor.id,amount:Math.max(0,Math.round(mitigated)),classification:"SIMULATED",applied:false});
   if(rules.has("counterattack")&&roll<.12)events.push({kind:"counter-preview",targetId:target.id,amount:Math.max(1,Math.round(power*.12)),classification:"SIMULATED",applied:false});
  }
  return {id:x.projectOriginalSandbox.id,sourceWikiId:x.id,classification:"SIMULATED",liveGameEffect:false,actorMutation:false,targetMutation:false,sourceLine:x.source.descriptionLine,events};
 }
 function audit(){return {total:byId.size,sourceAnchored:byProto.size,blockedWithoutMechanic:byId.size-byProto.size,livePlayable:0,sourceVerifiedNumericRatioUnknown:true};}
 return Object.freeze({get,eligible,preview,audit,mutatesState:false,liveIntegrated:false});
}
module.exports={create};