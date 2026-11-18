/* Inline by tools/build_ngoa_long_mode.py after legacy combat, before QA exports.
 * Group 07 additive live integration. Source classifications: SIMULATED.
 * Legacy six IDs and CL/Save/receipt logic remain authoritative and unchanged. */
const NL_EFFECT_V1_CATALOG=__NL_EFFECT_V1_CATALOG__;
const NL_EFFECT_BRIDGE_V1=window.NLCombatEffectBridgeV1.create(
  NL_EFFECT_V1_CATALOG,NL_GAME_DATA.statusEffects
);
const NL_EXTRA_EFFECTS_V1=new Set(NL_EFFECT_BRIDGE_V1.additionalIds);
// Original, explicitly authored trial: Cao Cao's already-existing strategic
// skill grants focus to allies; no new turns, awards or Wiki formula.
if(P2_SKILLS.cao)P2_SKILLS.cao={...P2_SKILLS.cao,applyAlly:"focus"};
const nlG07LegacyStatus=p2Status;
p2Status=function(unit,kind,turns,...rest){
  if(!unit||!battle||battle.mode==='cltq'||!NL_EXTRA_EFFECTS_V1.has(kind))
    return nlG07LegacyStatus(unit,kind,turns,...rest);
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
  const hit=nlG07LegacyHit(attacker,target,kind,mult*outgoing*incoming,opts);
  if(hit?.amount>0&&Array.isArray(target.effects)&&NL_EFFECT_BRIDGE_V1.consumeShield(target))
    return {...hit,amount:0,nlEffectBlock:"ironwall"};
  return hit;
};
if(window.__P2_ENABLE_QA__&&window.__P2_QA__){
  Object.assign(window.__P2_QA__,{
    p2Hit,p2Status,p2Cleanse,roundEnd:p2BuffRound,
    nlEffectBridge:NL_EFFECT_BRIDGE_V1,
    nlEffectCatalog:NL_EFFECT_V1_CATALOG
  });
}
// Additional sleep/fear control requires separate owner-action event wiring;
// do not forge skip events or change turn counters without replay parity.
