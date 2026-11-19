/* Muu Dinh Tam Quoc | Tactical AI V2 — PROJECT_ORIGINAL / SIMULATED.
 * Pure score-and-select policy. Never changes battle state, Save or RNG seed.
 * Evaluates only legal skill/target pairs using Combat Resolver V2 geometry.
 * All weights are local project balance choices, NOT VNG Wiki facts.
 */
(function(root,factory){
  "use strict";
  const resolver=typeof module==="object"&&module.exports
    ?require("./resolver_v2.js"):root&&root.NLCombatResolverV2;
  const api=factory(resolver);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NLTacticalAIV2=api;
})(typeof window!=="undefined"?window:null,function(R){
  "use strict";
  const fail=s=>{throw Error("NL_TACTICAL_AI_V2: "+s);};
  const alive=u=>u.hp>0;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const TYPES=["physical","tactic","magic"];
  const WEIGHTS=Object.freeze({
    balanced:{damage:1,heal:1.2,morale:1,control:1,counter:1,protect:1.1,rear:1},
    "morale-siege":{damage:.75,heal:.7,morale:2.6,control:1.25,counter:1,protect:.7,rear:1},
    "counter-offense":{damage:1.3,heal:.7,morale:.75,control:.8,counter:2.8,protect:.8,rear:1},
    "rear-hunter":{damage:1.15,heal:.65,morale:.9,control:1.45,counter:1.15,protect:.65,rear:2.5},
    "rear-guard":{damage:.7,heal:1.6,morale:1,control:1.05,counter:1,protect:2.3,rear:1},
    medic:{damage:.55,heal:2.6,morale:1.1,control:.8,counter:.75,protect:1.5,rear:1},
    "boss-guard":{damage:.75,heal:1.1,morale:.9,control:1.2,counter:1,protect:2.7,rear:1},
    "boss-pressure":{damage:1.35,heal:.7,morale:1.5,control:1.3,counter:1.35,protect:.85,rear:1.2},
    "boss-desperate":{damage:1.7,heal:1.4,morale:1.35,control:1,counter:1.5,protect:1.2,rear:1.35},
    "boss-support":{damage:.65,heal:1.9,morale:1.9,control:.9,counter:.8,protect:1.8,rear:1}
  });
  function depth(u){
    const col=(u.slot-1)%3;
    return u.side==="p"?2-col:col;
  }
  function estimateDamage(state,cat,actor,target,op){
    const atk=actor.attack[op.lane],def=target.defense[op.lane];
    if(!Number.isFinite(atk)||!Number.isFinite(def))fail("invalid damage stats");
    const formation=state.formation;
    const offensive=op.lane==="magic"?formation[actor.side].magic:formation[actor.side].attack;
    const counter=R.counter(cat,actor.troopType,target.troopType);
    const crit=clamp((op.criticalChance||0)+formation[actor.side].crit,0,1);
    const raw=Math.max(1,Math.floor(atk*(1+offensive)*op.coefficient*counter/
      (1+def*(1+formation[target.side].defense)*(1-(op.pierce||0))/100)));
    const strikeCount=op.repeat||1;
    const shield=(target.statuses||[]).some(s=>s.id==="ironwall")?1:0;
    return {expected:raw*(strikeCount-shield)*(1+crit*((op.criticalMultiplier||1.5)-1)),
      counter,shield,raw,strikeCount};
  }
  function isControlled(u){
    return (u.statuses||[]).some(s=>["sleep","fear"].includes(s.id))||
      (u.legacyEffects||[]).some(s=>s.kind==="daze");
  }
  function threat(unit,cat){
    const relevant=cat.skills.filter(s=>(unit.skillIds||[]).includes(s.id));
    const healer=relevant.some(s=>s.role==="healer");
    const controller=relevant.some(s=>s.role==="controller"||s.role==="morale-breaker");
    const dangerous=relevant.some(s=>s.operations.some(op=>op.op==="damage"&&
      op.coefficient>=1.6));
    return healer?1.55:controller?1.4:dangerous?1.3:
      unit.troopType==="strategist"||unit.troopType==="drum"?1.2:1;
  }
  function allTargets(state,actor,scope,selected){
    if(scope==="self")return [actor];
    if(scope==="selected")return selected;
    if(scope==="all-allies")return state.units.filter(u=>alive(u)&&u.side===actor.side);
    if(scope==="all-enemies")return state.units.filter(u=>alive(u)&&u.side!==actor.side);
    if(scope==="ally-lowest-hp"){
      return state.units.filter(u=>alive(u)&&u.side===actor.side)
        .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.slot-b.slot||a.id.localeCompare(b.id)).slice(0,1);
    }
    fail("unknown operation scope "+scope);
  }
  function evaluate(state,cat,actor,skill,selected,policy,config){
    const allies=state.units.filter(u=>alive(u)&&u.side===actor.side);
    const opponents=state.units.filter(u=>alive(u)&&u.side!==actor.side);
    let score=0;
    const contributions={damage:0,heal:0,morale:0,control:0,protect:0,dispel:0,focus:0};
    const add=(key,value)=>{score+=value;contributions[key]+=value;};
    for(const op of skill.operations){
      const dest=allTargets(state,actor,op.scope||"selected",selected);
      for(const target of dest){
        const relation=target.side===actor.side;
        const missing=target.maxHp-target.hp;
        if(op.op==="damage"&&!relation){
          const hit=estimateDamage(state,cat,actor,target,op);
          if(hit.expected<=0){
            add("damage",-9*config.damage); // one-charge ironwall consumes a single strike
            continue;
          }
          const fraction=Math.min(target.hp,hit.expected)/target.maxHp;
          let value=100*fraction*config.damage*threat(target,cat);
          if(hit.counter>1.01)value+=11*(hit.counter-1)*config.counter*10;
          else if(hit.counter<.99)value-=8*config.counter;
          if(hit.expected>=target.hp&&target.hp>0)value+=27*config.damage;
          if(depth(target)>=2)value+=5*config.rear;
          if(target.id===policy.focusTargetId)value+=13*config.damage;
          if(target.statuses?.some(s=>s.id==="sleep")&&hit.expected>0)value-=11;
          add("damage",value);
        }else if(op.op==="heal"&&relation){
          const amount=Math.min(missing,Math.max(1,Math.floor(actor.attack.magic*op.coefficient)));
          let value=100*(amount/target.maxHp)*config.heal;
          if(missing&&target.hp/target.maxHp<.35)value+=27*config.heal;
          if(depth(target)>=2&&missing)value+=8*config.protect;
          add("heal",value);
        }else if(op.op==="morale"){
          const actual=op.delta>=0?Math.min(op.delta,100-target.morale):
            Math.min(-op.delta,target.morale);
          if(actual<=0)continue;
          let value=(actual/100)*37*config.morale;
          if(op.delta<0&&!relation){
            const unlocked=cat.skills.some(s=>(target.skillIds||[]).includes(s.id)&&
              target.morale>=s.moraleCost&&target.morale-actual<s.moraleCost&&s.moraleCost>0);
            if(unlocked)value+=23*config.morale;
            if(target.morale>=75)value+=10*config.morale;
          }
          if(op.delta>0&&relation){
            const unlock=cat.skills.some(s=>(target.skillIds||[]).includes(s.id)&&
              target.morale<s.moraleCost&&target.morale+actual>=s.moraleCost);
            if(unlock)value+=18*config.morale;
            if(target.troopType==="drum")value+=7*config.protect;
          }
          add("morale",value);
        }else if(op.op==="status"){
          if(["sleep","fear","daze"].includes(op.effectId)&&!relation){
            if(isControlled(target)||(target.legacyEffects||[]).some(s=>s.kind==="ward")||
               (target.statuses||[]).some(s=>s.id==="anchored"&&op.effectId==="fear"))continue;
            let control=31*config.control*threat(target,cat)*
              (op.chance===undefined?1:op.chance);
            if(depth(target)>=2)control+=8*config.rear; // protect own rear by disabling rear threats
            if(target.id===policy.focusTargetId)control+=6*config.control;
            add("control",control);
          }else if(["ironwall","guard","ward","repel-blessing","anchored"].includes(op.effectId)&&relation){
            const already=(target.statuses||[]).some(s=>s.id===op.effectId)||
              (target.legacyEffects||[]).some(s=>s.kind===op.effectId);
            if(!already)add("protect",(13+23*(1-target.hp/target.maxHp)+
              (depth(target)<1?9:0))*config.protect);
          }else if(["focus","surge"].includes(op.effectId)&&relation){
            const stacks=(target.statuses||[]).find(s=>s.id===op.effectId)?.stacks||0;
            if(stacks<3)add("protect",(10+7*(3-stacks)/3)*config.protect);
          }else if(["break","burn","morale-seal"].includes(op.effectId)&&!relation){
            const has=(target.legacyEffects||[]).some(s=>s.kind===op.effectId);
            if(!has)add("control",14*config.control);
          }
        }else if(op.op==="dispel"){
          const polarity=op.polarity;
          const count=(target.statuses||[]).filter(s=>{
            const def=cat.effects.effects.find(e=>e.id===s.id);
            const removable=def?.dispel?.removable!==false;
            return removable&&(polarity==="all"||def?.polarity===polarity);
          }).length;
          const oldCount=(target.legacyEffects||[]).filter(s=>
            polarity==="all"||(polarity==="harmful"&&["break","daze","burn","morale-seal"].includes(s.kind))||
              (polarity==="beneficial"&&["guard","ward"].includes(s.kind))).length;
          const eligible=Math.min(op.maxRemove,count+oldCount);
          if(eligible)add("dispel",eligible*22*(relation?config.protect:config.control));
        }
      }
    }
    if(score===0&&skill.moraleCost>0)score-=12;
    score-=skill.moraleCost*.12;
    if(policy.phase==="desperate"){
      if(skill.role==="attacker"||skill.role==="morale-breaker")score*=1.13;
      if(skill.role==="healer"&&allies.some(u=>u.hp/u.maxHp<.4))score*=1.22;
    }
    if(policy.phase==="opening"&&skill.role==="support")score*=1.18;
    if(policy.phase==="hold"&&["defender","healer"].includes(skill.role))score*=1.2;
    return {score:Math.round(score*1000)/1000,contributions};
  }
  function candidates(state,cat,actor,skill){
    if(skill.target.team==="self"||["all","lowest-hp","highest-morale"].includes(skill.target.pattern))
      return [{targetId:null,targets:R.selectTargets(state,cat,actor,skill.target)}];
    const own=skill.target.team==="ally";
    const units=state.units.filter(u=>alive(u)&&(own?u.side===actor.side:u.side!==actor.side))
      .sort((a,b)=>a.slot-b.slot||a.id.localeCompare(b.id));
    const result=[];
    for(const u of units){
      let selected;
      try{selected=R.selectTargets(state,cat,actor,skill.target,u.id);}
      catch(e){
        if(/protected backline/.test(String(e)))continue;
        throw e;
      }
      if(selected.length)result.push({targetId:u.id,targets:selected});
    }
    return result;
  }
  function choose(state,cat,actorId,policy={}){
    if(!R||typeof R.selectTargets!=="function")fail("resolver V2 required");
    R.checkCatalog(cat);
    const actor=state.units.find(u=>u.id===actorId&&alive(u));
    if(!actor)fail("actor dead/missing");
    const profile=policy.profile||"balanced",config=WEIGHTS[profile];
    if(!config)fail("unknown profile "+profile);
    const skills=cat.skills.filter(s=>(actor.skillIds||[]).includes(s.id)&&
      s.moraleCost<=actor.morale);
    const possibilities=[];
    for(const skill of skills){
      for(const c of candidates(state,cat,actor,skill)){
        if(!c.targets.length)continue;
        const estimate=evaluate(state,cat,actor,skill,c.targets,policy,config);
        const cmd={actorId,skillId:skill.id};
        if(c.targetId!==null)cmd.selectedTargetId=c.targetId;
        possibilities.push({command:cmd,estimate,sortId:skill.id+"|"+(c.targetId||"")});
      }
    }
    possibilities.sort((a,b)=>b.estimate.score-a.estimate.score||
      a.sortId.localeCompare(b.sortId));
    if(!possibilities.length)return null;
    const winner=possibilities[0];
    return {command:winner.command,decision:{
      policy:profile,phase:policy.phase||"pressure",
      score:winner.estimate.score,
      contributions:winner.estimate.contributions,
      considered:possibilities.length,
      top:possibilities.slice(0,3).map(x=>({
        skillId:x.command.skillId,targetId:x.command.selectedTargetId||null,
        score:x.estimate.score
      })),
      provenance:"SIMULATED"
    }};
  }
  function prepare(state,cat,actorId,policy={},rollProvider){
    const result=choose(state,cat,actorId,policy);
    if(!result)return null;
    const required=R.potentialRollKeys(state,cat,result.command);
    if(required.length&&typeof rollProvider!=="function")
      fail("seeded rollProvider required for AI proc");
    if(required.length){
      const rolls=Object.create(null);
      for(const key of required){
        const value=rollProvider(key);
        if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>=1)
          fail("invalid external roll "+key);
        rolls[key]=value;
      }
      result.command.rolls=rolls;
    }
    return result;
  }
  return Object.freeze({WEIGHTS,choose,prepare,estimateDamage});
});
