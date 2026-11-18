/* Inline by tools/build_ngoa_long_mode.py after legacy combat, before QA exports.
 * Group 07 additive live integration. Source classifications: SIMULATED.
 * Legacy six IDs and CL/Save/receipt logic remain authoritative and unchanged. */
const NL_EFFECT_V1_CATALOG=__NL_EFFECT_V1_CATALOG__;
const NL_EFFECT_BRIDGE_V1=window.NLCombatEffectBridgeV1.create(
  NL_EFFECT_V1_CATALOG,NL_GAME_DATA.statusEffects
);
const NL_EXTRA_EFFECTS_V1=new Set(NL_EFFECT_BRIDGE_V1.additionalIds);
// Original, explicitly authored trial: Cao Cao's existing strategic
// skill grants focus, but the JSON-derived skill catalog remains untouched.
const nlG07LegacySkill=p2Skill;
p2Skill=function(actor){
  const descriptor=nlG07LegacySkill(actor);
  if(battle?.mode==="campaign"&&actor?.id==="cao"&&actor.team==="p")
    return {...descriptor,applyAlly:"focus"};
  return descriptor;
};
const nlG07LegacyStatus=p2Status;
p2Status=function(unit,kind,turns,...rest){
  if(!unit||!battle||battle.mode==='cltq')
    return nlG07LegacyStatus(unit,kind,turns,...rest);
  if(!NL_EXTRA_EFFECTS_V1.has(kind)){
    const legacy=NL_GAME_DATA.statusEffects.effects[kind];
    if(legacy?.polarity==="beneficial"&&Array.isArray(unit.effects)&&
       unit.effects.some(effect=>effect.kind==="repel-blessing"&&effect.nlEffectV1===true))
      return false;
    return nlG07LegacyStatus(unit,kind,turns,...rest);
  }
  return NL_EFFECT_BRIDGE_V1.apply(unit,kind).accepted;
};
const nlG07LegacyCleanse=p2Cleanse;
p2Cleanse=function(unit,scope="harmful",maxRemove=1,...rest){
  if(!unit||!battle||battle.mode==='cltq'||!Array.isArray(unit.effects))
    return nlG07LegacyCleanse(unit,scope,maxRemove,...rest);
  const extra=unit.effects.filter(x=>x.nlEffectV1===true);
  if(!extra.length)return nlG07LegacyCleanse(unit,scope,maxRemove,...rest);
  unit.effects=unit.effects.filter(x=>x.nlEffectV1!==true);
  let removed;
  try{removed=nlG07LegacyCleanse(unit,scope,maxRemove,...rest);}
  finally{unit.effects.push(...extra);}
  const previous=Array.isArray(removed)?removed:[];
  const remaining=Math.max(0,maxRemove-previous.length);
  const additional=NL_EFFECT_BRIDGE_V1.dispel(unit,scope,remaining);
  return previous.concat(additional.removed);
};
const nlG07LegacyRound=p2BuffRound;
p2BuffRound=function(...args){
  if(!battle||battle.mode==='cltq')return nlG07LegacyRound(...args);
  const units=[...(battle.p||[]),...(battle.e||[])];
  const held=units.map(u=>[u,Array.isArray(u.effects)?u.effects.filter(x=>x.nlEffectV1===true):[]]);
  for(const [unit,effects] of held)if(effects.length)
    unit.effects=unit.effects.filter(x=>x.nlEffectV1!==true);
  let result;
  try{result=nlG07LegacyRound(...args);}
  finally{for(const [unit,effects] of held)if(effects.length)unit.effects.push(...effects);}
  for(const [unit,effects] of held)if(effects.length)NL_EFFECT_BRIDGE_V1.endRound(unit);
  return result;
};
const nlG07LegacyHit=p2Hit;
p2Hit=function(attacker,target,kind,mult=1,opts={}){
  if(!battle||battle.mode==='cltq'||!attacker||!target)
    return nlG07LegacyHit(attacker,target,kind,mult,opts);
  const outgoing=Array.isArray(attacker.effects)?
    NL_EFFECT_BRIDGE_V1.modifiers(attacker).outgoingDamageMultiplier:1;
  const incoming=Array.isArray(target.effects)?
    NL_EFFECT_BRIDGE_V1.modifiers(target).incomingDamageMultiplier:1;
  const adjusted=mult*outgoing*incoming;
  if(Array.isArray(target.effects)&&target.effects.some(e=>e.kind==="ironwall"&&e.nlEffectV1===true)){
    // Native p2Hit mutates HP before returning. Use a proxy to consume the
    // same RNG and compute the hit without touching authoritative target HP.
    const proxy={...target,effects:structuredClone(target.effects)};
    const probe=nlG07LegacyHit(attacker,proxy,kind,adjusted,opts);
    if(probe.amount>0&&NL_EFFECT_BRIDGE_V1.consumeShield(target))
      return {...probe,amount:0,number:"-0",nlEffectBlock:"ironwall"};
    return probe;
  }
  const hit=nlG07LegacyHit(attacker,target,kind,adjusted,opts);
  if(hit?.amount>0&&Array.isArray(target.effects)){
    const wakeups=NL_EFFECT_BRIDGE_V1.onDamage(target,hit.amount);
    if(wakeups.length)hit.nlWakeups=wakeups;
  }
  return hit;
};
// Implement actual V1 control on the original authoritative turn/event path.
const nlG07LegacyPerform=p2Perform;
p2Perform=function(actor){
  if(!battle||battle.mode==="cltq"||!actor||actor.hp<=0)
    return nlG07LegacyPerform(actor);
  const gate=NL_EFFECT_BRIDGE_V1.startAction(actor);
  if(gate.canAct)return nlG07LegacyPerform(actor);
  actor.actions++;battle.turns++;
  actor.effects=actor.effects.filter(e=>!p2StatusSpec(e.kind)?.removeAfterOwnAction);
  const event={
    round:battle.round,actorTeam:actor.team,actorSlot:actor.slot,actor:actor.name,
    mode:"stunned",kind:"physical",skill:null,
    description:actor.name+" bị khống chế, bỏ qua một lượt hành động.",
    hits:[],cleansed:[],nlEffects:gate.events,state:p2Snapshot()
  };
  battle.events.push(event);battle.log=event.description;
  p2ApplyFrame(event);
  return event;
};
if(window.__P2_ENABLE_QA__&&window.__P2_QA__){
  Object.assign(window.__P2_QA__,{
    p2Hit,p2Status,p2Cleanse,roundEnd:p2BuffRound,perform:p2Perform,
    nlEffectBridge:NL_EFFECT_BRIDGE_V1,
    nlEffectCatalog:NL_EFFECT_V1_CATALOG
  });
}
// Additional sleep/fear control requires separate owner-action event wiring;
// do not forge skip events or change turn counters without replay parity.
