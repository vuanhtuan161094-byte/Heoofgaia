/* Group 07 - live campaign adapter for the approved, ORIGINAL combat-effect V1.
 * Six old project statuses keep their existing engine, coefficients and clock.
 * The new seven statuses use NLCombatEffectsV1 and the actual battle units.
 * No Wiki effects, Save schema changes, rewards, or asynchronous side effects. */
(function(root,factory){
  "use strict";
  const engine=typeof module==="object"&&module.exports?require("./nl_combat_effects_v1.js"):root.NLCombatEffectsV1;
  const api=factory(engine);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NLCombatEffectBridgeV1=api;
})(typeof window!=="undefined"?window:null,function(E){
  "use strict";
  const LEGACY=Object.freeze(["break","guard","daze","burn","morale-seal","ward"]);
  function requireValid(ok,why){if(!ok)throw new Error("NL_EFFECT_BRIDGE_V1: "+why);}
  function create(catalog,legacyCatalog){
    requireValid(E&&typeof E.newBattle==="function","engine missing");
    E.validateCatalog(catalog);
    const old=legacyCatalog&&legacyCatalog.effects;
    requireValid(old&&typeof old==="object","legacy status catalog required");
    const byId=new Map(catalog.effects.map(e=>[e.id,e]));
    for(const id of LEGACY)requireValid(old[id]&&byId.has(id),"missing old/new six-status contract: "+id);
    const extra=new Set(catalog.effects.map(e=>e.id).filter(id=>!LEGACY.includes(id)));
    requireValid(extra.size===7,"expected seven additive statuses");
    const discrepancies=[
      {id:"break",kind:"incomingDefenseMultiplier / incomingDamageMultiplier",legacy:old.break.incomingDefenseMultiplier,v1:byId.get("break").modifiers.incomingDamageMultiplier},
      {id:"guard",kind:"incomingDefenseMultiplier / incomingDamageMultiplier",legacy:old.guard.incomingDefenseMultiplier,v1:byId.get("guard").modifiers.incomingDamageMultiplier},
      {id:"daze",kind:"probabilistic legacy skip / deterministic V1 skip",legacy:old.daze.skipActionChance,v1:byId.get("daze").control},
      {id:"burn",kind:"legacy round-end damage / V1 per-stack damage",legacy:old.burn.roundEndDamageFraction,v1:byId.get("burn").burnFraction}
    ];
    function isExtra(effect){return !!effect&&extra.has(effect.kind)&&effect.nlEffectV1===true;}
    function current(unit){
      requireValid(unit&&Array.isArray(unit.effects),"actual battle unit required");
      const hp=Math.max(0,Math.floor(unit.hp||0)), maxHp=Math.max(1,Math.floor(unit.maxHp||1));
      const morale=Math.max(0,Math.min(catalog.moraleCap,Math.floor(unit.morale||0)));
      const statuses=unit.effects.filter(isExtra).map((x,i)=>({
        id:x.kind,stacks:Math.max(1,Math.floor(x.stacks||1)),
        remaining:Math.max(1,Math.floor(x.turns||1)),
        charges:x.charges===undefined?null:x.charges,order:i+1
      }));
      return {schemaVersion:1,round:1,sequence:statuses.length,units:[
        {id:"live",side:String(unit.team||""),hp:Math.min(hp,maxHp),maxHp,morale,statuses}
      ]};
    }
    function sync(unit,state){
      const keep=unit.effects.filter(e=>!isExtra(e));
      const v1=state.units[0].statuses.map(x=>({
        kind:x.id,turns:x.remaining,stacks:x.stacks,charges:x.charges,
        nlEffectV1:true
      }));
      unit.effects=keep.concat(v1);
      return v1;
    }
    function apply(unit,id,options={}){
      requireValid(extra.has(id),"six legacy/unknown statuses must NOT be replaced: "+id);
      const policy=byId.get(id);
      if(policy.polarity==="harmful"&&unit.effects.some(x=>x.kind==="ward"&&x.nlEffectV1!==true))
        return {state:current(unit),accepted:false,events:[{type:"status-blocked",targetId:"live",statusId:id,reason:"legacy-ward"}]};
      const r=E.applyStatus(current(unit),catalog,{
        targetId:"live",statusId:id,
        ...(options.chance===undefined?{}:{chance:options.chance,roll:options.roll})
      });
      if(r.accepted)sync(unit,r.state);
      return r;
    }
    function dispel(unit,scope="harmful",maxRemove=Number.MAX_SAFE_INTEGER){
      const r=E.dispel(current(unit),catalog,{targetId:"live",scope,maxRemove});
      sync(unit,r.state);
      return r;
    }
    function modifiers(unit){return E.modifiers(current(unit),catalog,"live");}
    function consumeShield(unit){
      if(!unit.effects.some(x=>isExtra(x)&&x.kind==="ironwall"))return false;
      const s=current(unit);
      const r=E.damage(s,catalog,{targetId:"live",amount:Math.max(1,s.units[0].maxHp)});
      if(!r.events.some(x=>x.type==="damage-blocked"))return false;
      sync(unit,r.state);
      return true;
    }
    function onDamage(unit,amount){
      if(!unit||!Array.isArray(unit.effects)||!Number.isFinite(amount)||amount<=0||
         !unit.effects.some(x=>isExtra(x)&&(x.kind==="sleep"||x.kind==="fear")))return [];
      // The historical p2Hit already settled HP. The V1 engine owns only
      // wake-up semantics; sync() deliberately never writes HP back.
      const r=E.damage(current(unit),catalog,{targetId:"live",amount:Math.max(1,Math.floor(amount))});
      sync(unit,r.state);
      return r.events.filter(x=>x.type==="status-broken-by-damage");
    }
    function endRound(unit){
      if(!unit||!Array.isArray(unit.effects)||!unit.effects.some(isExtra))return [];
      const r=E.endRound(current(unit),catalog);sync(unit,r.state);return r.events;
    }
    function startAction(unit){
      if(!unit||!Array.isArray(unit.effects)||!unit.effects.some(isExtra))return {canAct:true,events:[]};
      const r=E.startAction(current(unit),catalog,{targetId:"live"});sync(unit,r.state);
      return {canAct:r.canAct,events:r.events};
    }
    return Object.freeze({
      legacyIds:LEGACY,additionalIds:Object.freeze([...extra]),
      legacyDifferences:Object.freeze(discrepancies),
      apply,dispel,modifiers,consumeShield,onDamage,endRound,startAction
    });
  }
  return Object.freeze({create});
});
