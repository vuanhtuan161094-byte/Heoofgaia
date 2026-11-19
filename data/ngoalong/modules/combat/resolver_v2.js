/* Muu Dinh Tam Quoc | Combat resolver V2, PROJECT_ORIGINAL / SIMULATED.
 * Standalone deterministic domain module. NOT wired into generator or Save.
 * 6 legacy statuses belong to live p2 engine; 7 new statuses use EffectsV1.
 * Visuals and replay consume events; neither can author battle state.
 */
(function(root,make){
  "use strict";
  const effects=typeof module==="object"&&module.exports
    ?require("../../../../tools/nl_combat_effects_v1.js"):root&&root.NLCombatEffectsV1;
  const api=make(effects);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NLCombatResolverV2=api;
})(typeof window!=="undefined"?window:null,function(E){
  "use strict";
  const LANES=["physical","tactic","magic"];
  const OPS=["damage","heal","morale","status","dispel"];
  const LEGACY=["break","guard","daze","burn","morale-seal","ward"];
  const EXTRA=["sleep","fear","anchored","ironwall","focus","repel-blessing","surge"];
  const PATTERNS=["single","back","lowest-hp","highest-morale","row","column","all","double"];
  const SCOPES=["selected","self","all-allies","all-enemies","ally-lowest-hp"];
  const copy=x=>JSON.parse(JSON.stringify(x));
  const fail=s=>{throw new Error("NL_COMBAT_V2: "+s);};
  const num=x=>typeof x==="number"&&Number.isFinite(x);
  const integer=x=>Number.isSafeInteger(x);
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const effectDefinition=(cat,id)=>cat.effects.effects.find(e=>e.id===id);
  const pos=s=>({row:Math.floor((s-1)/3),column:(s-1)%3});
  function depth(u){
    const col=pos(u.slot).column;
    return u.side==="p"?2-col:col; // p front column 3, e front column 1
  }
  function checkCatalog(cat){
    if(!E||typeof E.applyStatus!=="function")fail("Effects V1 dependency missing");
    if(!cat||!cat.effects||!Array.isArray(cat.skills))fail("catalog requires effects and skills");
    E.validateCatalog(cat.effects);
    const ids=new Set(cat.effects.effects.map(e=>e.id));
    if(!LEGACY.every(id=>ids.has(id))||!EXTRA.every(id=>ids.has(id)))
      fail("six legacy and seven additive effects required");
    const seen=new Set();
    for(const s of cat.skills){
      if(!s||typeof s.id!=="string"||!s.id||seen.has(s.id))fail("duplicate/invalid skill");
      seen.add(s.id);
      if(s.provenance?.classification!=="SIMULATED")fail("skills must declare SIMULATED");
      if(typeof s.role!=="string"||!s.role)fail("skill role");
      if(!s.target||!["enemy","ally","self"].includes(s.target.team)||
         !PATTERNS.includes(s.target.pattern))fail("skill target");
      if(s.target.maxTargets!==undefined&&(!integer(s.target.maxTargets)||
         s.target.maxTargets<1||s.target.maxTargets>5))fail("target maxTargets 1..5");
      if(!integer(s.moraleCost)||s.moraleCost<0||s.moraleCost>cat.effects.moraleCap)fail("morale cost");
      if(!Array.isArray(s.operations)||!s.operations.length)fail("skill operations");
      for(const op of s.operations){
        if(!OPS.includes(op.op)||!SCOPES.includes(op.scope||"selected"))fail("unknown operation/scope");
        if(["damage","heal"].includes(op.op)&&(!num(op.coefficient)||op.coefficient<=0||op.coefficient>20))
          fail("damage/heal coefficient");
        if(op.op==="damage"&&(!LANES.includes(op.lane)||op.pierce!==undefined&&(!num(op.pierce)||op.pierce<0||op.pierce>1)))fail("damage lane/pierce");
        if(op.repeat!==undefined&&
           (op.op!=="damage"||!integer(op.repeat)||op.repeat<1||op.repeat>4))fail("repeat supports 1..4 damage only");
        if(op.op==="morale"&&(!integer(op.delta)||Math.abs(op.delta)>cat.effects.moraleCap))fail("morale delta");
        if(op.op==="status"&&(!ids.has(op.effectId)||LEGACY.includes(op.effectId)&&op.legacyAdapter!==true))fail("status needs valid id/legacyAdapter");
        if(op.op==="dispel"&&(!["beneficial","harmful","all"].includes(op.polarity)||
          !integer(op.maxRemove)||op.maxRemove<0))fail("dispel scope/count");
        if(op.chance!==undefined&&(!num(op.chance)||op.chance<0||op.chance>1))fail("invalid chance");
        if(op.criticalChance!==undefined&&(!num(op.criticalChance)||op.criticalChance<0||op.criticalChance>1))fail("critical chance");
      }
    }
    for(const c of cat.counters||[]){
      if(typeof c.attacker!=="string"||typeof c.defender!=="string"||
         !num(c.multiplier)||c.multiplier<=0||!num(c.disadvantageMultiplier)||c.disadvantageMultiplier<=0)
        fail("invalid counter");
    }
    return true;
  }
  function checkUnits(units,cap){
    if(!Array.isArray(units)||!units.length||units.length>10)fail("1..10 units required");
    const keys=new Set(),slots={p:new Set(),e:new Set()},counts={p:0,e:0};
    for(const u of units){
      if(!u||typeof u.id!=="string"||!u.id||keys.has(u.id))fail("duplicate/invalid unit id");
      keys.add(u.id);
      if(!["p","e"].includes(u.side)||!integer(u.slot)||u.slot<1||u.slot>9||
         slots[u.side].has(u.slot))fail("invalid/occupied 3x3 slot");
      slots[u.side].add(u.slot);counts[u.side]++;
      if(!integer(u.maxHp)||u.maxHp<1||!integer(u.hp)||u.hp<0||u.hp>u.maxHp||
         !integer(u.morale)||u.morale<0||u.morale>cap)fail("hp/morale");
      for(const lane of LANES)if(!num(u.attack?.[lane])||u.attack[lane]<0||
          !num(u.defense?.[lane])||u.defense[lane]<0)fail("missing lane stats "+lane);
      if(typeof u.troopType!=="string"||!u.troopType)fail("troopType required");
      if(u.legacyEffects!==undefined&&!Array.isArray(u.legacyEffects))fail("legacyEffects");
      if(u.skillIds!==undefined&&!Array.isArray(u.skillIds))fail("skillIds");
    }
    if(counts.p>5||counts.e>5)fail("max five generals each side");
    return true;
  }
  function createBattle(cat,units,formation={}){
    checkCatalog(cat);checkUnits(units,cat.effects.moraleCap);
    const bonuses={};
    for(const side of ["p","e"]){
      const f=formation[side]||{};
      for(const key of ["attack","defense","magic","crit"]){
        const v=f[key]===undefined?0:f[key];
        if(!num(v)||v<-.5||v>1)fail("formation "+side+" "+key);
      }
      bonuses[side]={attack:f.attack||0,defense:f.defense||0,
        magic:f.magic||0,crit:f.crit||0,
        presetId:typeof f.presetId==="string"?f.presetId:null,
        planStyle:["pressure","counter","protect","finish"].includes(f.planStyle)?f.planStyle:null};
    }
    return {schemaVersion:2,round:1,turn:0,sequence:0,formation:bonuses,
      units:copy(units).map(u=>({...u,statuses:[],legacyEffects:u.legacyEffects||[],skillIds:u.skillIds||[] }))};
  }
  const alive=u=>u.hp>0;
  function unit(state,id){const u=state.units.find(u=>u.id===id);if(!u)fail("unknown unit "+id);return u;}
  function targetScore(actor,u,priority,cat){
    const hpRatio=u.hp/u.maxHp;
    if(priority==="weakest")return hpRatio*1000;
    if(priority==="highest-morale")return -u.morale*100+depth(u);
    if(priority==="back")return -depth(u)*100+hpRatio;
    if(priority==="counter")return -counter(cat,actor.troopType,u.troopType)*1000+depth(u);
    return depth(u)*100+hpRatio; // guard front by default
  }
  function counter(cat,from,to){
    for(const c of cat.counters||[]){
      if(c.attacker===from&&c.defender===to)return c.multiplier;
      if(c.attacker===to&&c.defender===from)return c.disadvantageMultiplier;
    }
    return 1;
  }
  function select(state,cat,actor,target,chosen){
    if(target.team==="self")return [actor];
    let candidates=state.units.filter(u=>alive(u)&&(target.team==="enemy"?u.side!==actor.side:u.side===actor.side));
    if(!candidates.length)return [];
    const priority=target.priority|| (target.pattern==="back"?"back":"front");
    candidates.sort((a,b)=>targetScore(actor,a,priority,cat)-targetScore(actor,b,priority,cat)||
      a.slot-b.slot||a.id.localeCompare(b.id));
    if(target.pattern==="all")return candidates.slice(0,target.maxTargets||candidates.length);
    let anchor=candidates[0];
    if(chosen!==undefined){
      const selected=candidates.find(x=>x.id===chosen);
      if(!selected)fail("selected target not in eligible team");
      if(target.team==="enemy"&&target.pattern==="single"&&!target.ignoreFront&&
         priority==="front"&&depth(selected)>depth(anchor))
        fail("protected backline: use ignoreFront/target back");
      anchor=selected;
    }
    if(target.pattern==="lowest-hp"){
      anchor=candidates.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.slot-b.slot)[0];
    } else if(target.pattern==="highest-morale"){
      anchor=candidates.slice().sort((a,b)=>b.morale-a.morale||a.slot-b.slot)[0];
    }
    if(target.pattern==="double"){
      const other=candidates.filter(x=>x.id!==anchor.id);
      return [anchor,...other].slice(0,target.maxTargets||2);
    }
    if(target.pattern==="row"||target.pattern==="column"){
      const axis=target.pattern;
      return candidates.filter(x=>pos(x.slot)[axis]===pos(anchor.slot)[axis])
        .slice(0,target.maxTargets||candidates.length);
    }
    return [anchor];
  }
  function destinations(state,cat,actor,skill,op,selected,chosen){
    const scope=op.scope||"selected";
    if(scope==="selected")return selected.map(x=>unit(state,x.id)).filter(alive);
    if(scope==="self")return [actor];
    if(scope==="all-allies")return state.units.filter(u=>u.side===actor.side&&alive(u));
    if(scope==="all-enemies")return state.units.filter(u=>u.side!==actor.side&&alive(u));
    // Never reuse a selected enemy ID as the anchor for an ally-only scope.
    return select(state,cat,actor,{team:"ally",pattern:"lowest-hp"});
  }
  function rollOf(cmd,key){
    const value=Object.prototype.hasOwnProperty.call(cmd.rolls||{},key)?cmd.rolls[key]:undefined;
    if(!num(value)||value<0||value>=1)fail("external recorded roll required: "+key);
    return value;
  }
  function proc(cmd,chance,key){
    if(chance===undefined||chance===1)return true;
    if(chance===0)return false;
    return rollOf(cmd,key)<chance;
  }
  // Seeded RNG belongs to the authoritative battle caller. AI only requests
  // roll keys and records explicit values in its command; never Math.random.
  function potentialRollKeys(state,cat,command){
    checkCatalog(cat);
    const actor=unit(state,command.actorId),skill=cat.skills.find(x=>x.id===command.skillId);
    if(!skill||!actor.skillIds.includes(skill.id))fail("AI skill not equipped");
    const selected=select(state,cat,actor,skill.target,command.selectedTargetId);
    const keys=[];
    for(let i=0;i<skill.operations.length;i++){
      const op=skill.operations[i],scope=op.scope||"selected";
      const possible=scope==="ally-lowest-hp"?
        state.units.filter(u=>u.side===actor.side&&alive(u)):
        destinations(state,cat,actor,skill,op,selected,command.selectedTargetId);
      for(const t of possible){
        const k=i+":"+t.id;
        if(op.chance>0&&op.chance<1)keys.push(k);
        if(op.op==="damage"&&op.criticalChance!==undefined){
          const chance=clamp(op.criticalChance+state.formation[actor.side].crit,0,1);
          if(chance>0&&chance<1)
            for(let strike=0;strike<(op.repeat||1);strike++)
              keys.push("crit:"+(op.repeat>1?k+":"+strike:k));
        }
      }
    }
    return [...new Set(keys)];
  }
  function choosePreparedAction(state,cat,actorId,rollProvider){
    const command=chooseAction(state,cat,actorId);
    if(!command)return null;
    const required=potentialRollKeys(state,cat,command);
    if(required.length&&typeof rollProvider!=="function")
      fail("AI requires authoritative seeded rollProvider");
    if(required.length){
      const rolls=Object.create(null);
      for(const key of required){
        const roll=rollProvider(key);
        if(!num(roll)||roll<0||roll>=1)fail("invalid external AI roll "+key);
        rolls[key]=roll;
      }
      command.rolls=rolls;
    }
    return command;
  }
  function resolveAction(original,cat,cmd){
    checkCatalog(cat);
    const state=copy(original);
    const actor=unit(state,cmd.actorId);
    if(!alive(actor))fail("dead actor");
    const skill=cat.skills.find(x=>x.id===cmd.skillId);
    if(!skill||!actor.skillIds.includes(skill.id))fail("skill not equipped");
    const events=[];
    const gate=E.startAction(state,cat.effects,{targetId:actor.id});
    let next=gate.state;events.push(...gate.events.map(e=>({...e,phase:"owner-action"})));
    next.turn++;
    if(!gate.canAct){
      events.push({type:"action-skipped",actorId:actor.id,skillId:skill.id});
      return finish(next,cmd,events);
    }
    const self=unit(next,actor.id);
    if(self.legacyEffects.some(x=>x.kind==="daze"))
      fail("legacy daze gate must run in authoritative p2 engine");
    if(self.morale<skill.moraleCost)fail("insufficient morale");
    if(skill.moraleCost){
      const spent=E.morale(next,cat.effects,{targetId:self.id,delta:-skill.moraleCost});
      next=spent.state;events.push(...spent.events);
    }
    const primary=select(next,cat,unit(next,self.id),skill.target,cmd.selectedTargetId);
    events.push({type:"skill-start",actorId:self.id,skillId:skill.id,role:skill.role,targetIds:primary.map(u=>u.id)});
    for(let i=0;i<skill.operations.length;i++){
      const op=skill.operations[i],a=unit(next,self.id);
      const targets=destinations(next,cat,a,skill,op,primary,cmd.selectedTargetId);
      for(const ref of targets){
        const target=unit(next,ref.id),key=i+":"+target.id;
        if(!alive(target))continue;
        if(op.chance!==undefined&&!proc(cmd,op.chance,key)) {
          events.push({type:"operation-missed",actorId:a.id,targetId:target.id,op:op.op,index:i,roll:cmd.rolls?.[key]??null});
          continue;
        }
        if(op.op==="damage"){
          const repeat=op.repeat||1;
          for(let strike=0;strike<repeat;strike++){
          const strikeKey=repeat===1?key:key+":"+strike;
          const baseAttack=a.attack[op.lane]*
            (1+(op.lane==="magic"?next.formation[a.side].magic:next.formation[a.side].attack));
          const baseDef=target.defense[op.lane]*(1+next.formation[target.side].defense)*(1-(op.pierce||0));
          const advantage=counter(cat,a.troopType,target.troopType);
          let raw=Math.max(1,Math.floor(baseAttack*op.coefficient*advantage/(1+baseDef/100)));
          const critChance=op.criticalChance===undefined?undefined:
            clamp(op.criticalChance+next.formation[a.side].crit,0,1);
          if(critChance!==undefined&&proc(cmd,critChance,"crit:"+strikeKey)){
            raw=Math.floor(raw*(op.criticalMultiplier||1.5));
            events.push({type:"critical",actorId:a.id,targetId:target.id,index:i});
          }
          const hit=E.damage(next,cat.effects,{sourceId:a.id,targetId:target.id,amount:raw});
          next=hit.state;
          events.push({type:"lane-hit",actorId:a.id,targetId:target.id,lane:op.lane,
            amount:hit.damage,counter:advantage,raw,formula:"SIMULATED",index:i,
            strike:repeat>1?strike+1:undefined},...hit.events);
          }

        }else if(op.op==="heal"){
          const t=unit(next,target.id),amount=Math.max(1,Math.floor(a.attack.magic*op.coefficient));
          const healed=Math.min(t.maxHp-t.hp,amount);t.hp+=healed;
          events.push({type:"heal",actorId:a.id,targetId:t.id,amount:healed,remainingHp:t.hp,index:i});
        }else if(op.op==="morale"){
          // Legacy morale-seal remains an opaque authoritative status; no override here.
          if(target.legacyEffects.some(x=>x.kind==="morale-seal")&&op.delta>0){
            events.push({type:"legacy-morale-blocked",targetId:target.id,delta:op.delta,index:i});
          }else{
            const r=E.morale(next,cat.effects,{targetId:target.id,delta:op.delta});
            next=r.state;events.push(...r.events);
          }
        }else if(op.op==="status"){
          const definition=effectDefinition(cat,op.effectId);
          if(definition.polarity==="harmful"&&target.legacyEffects.some(x=>x.kind==="ward")){
            events.push({type:"status-blocked",targetId:target.id,statusId:op.effectId,reason:"legacy-ward",index:i});
          }else if(definition.polarity==="beneficial"&&target.statuses.some(x=>x.id==="repel-blessing")){
            events.push({type:"status-blocked",targetId:target.id,statusId:op.effectId,reason:"repel-blessing",index:i});
          }else if(LEGACY.includes(op.effectId)){
            events.push({type:"legacy-status-command",targetId:target.id,effectId:op.effectId,
              adapterRequired:true,index:i});
          }else{
            const r=E.applyStatus(next,cat.effects,{targetId:target.id,statusId:op.effectId});
            next=r.state;events.push(...r.events.map(e=>({...e,index:i})));
          }
        }else if(op.op==="dispel"){
          const r=E.dispel(next,cat.effects,{targetId:target.id,scope:op.polarity,maxRemove:op.maxRemove});
          next=r.state;events.push(...r.events.map(e=>({...e,index:i})));
          const remaining=Math.max(0,op.maxRemove-r.removed.length);
          if(target.legacyEffects.length&&remaining>0)events.push({type:"legacy-dispel-command",targetId:target.id,
            polarity:op.polarity,remaining,adapterRequired:true,index:i});
        }
      }
    }
    return finish(next,cmd,events);
  }
  function finish(state,command,events){
    // A V2 frame is not authoritative while any native-six operation is pending.
    // Chat 08 must commit these commands in the existing P2 action/receipt path,
    // then record the final authoritative snapshot. Never silently fake success.
    const pendingLegacyCommands=events.filter(x=>x.adapterRequired===true).map(copy);
    const readyToCommit=pendingLegacyCommands.length===0;
    const frame={kind:"action",command:copy(command),events:copy(events),
      snapshot:copy(state),pendingLegacyCommands:copy(pendingLegacyCommands),readyToCommit};
    return {state,events,frame,pendingLegacyCommands,readyToCommit};
  }
  function advanceRound(original,cat){
    checkCatalog(cat);
    const r=E.endRound(original,cat.effects);
    return {state:r.state,events:r.events,frame:{kind:"round-end",events:copy(r.events),snapshot:copy(r.state)}};
  }
  function replay(initial,cat,frames){
    let current=copy(initial);
    for(const f of frames){
      if(!f||!["round-end","action"].includes(f.kind))fail("invalid replay frame");
      const r=f.kind==="round-end"?advanceRound(current,cat):resolveAction(current,cat,f.command);
      if(JSON.stringify(r.events)!==JSON.stringify(f.events)||
         JSON.stringify(r.state)!==JSON.stringify(f.snapshot)||
         (f.kind==="action"&&(
           JSON.stringify(r.pendingLegacyCommands)!==JSON.stringify(f.pendingLegacyCommands)||
           r.readyToCommit!==f.readyToCommit)))fail("replay divergence");
      current=r.state;
    }
    return current;
  }
  function chooseAction(state,cat,actorId){
    checkCatalog(cat);
    const a=unit(state,actorId);
    if(!alive(a))fail("dead AI unit");
    const available=cat.skills.filter(s=>a.skillIds.includes(s.id)&&s.moraleCost<=a.morale);
    if(!available.length)return null;
    const opponents=state.units.filter(u=>u.side!==a.side&&alive(u));
    if(!opponents.length)return null;
    const allies=state.units.filter(u=>u.side===a.side&&alive(u));
    const urgency=allies.reduce((s,u)=>s+(1-u.hp/u.maxHp),0);
    const pick=available.map(s=>{
      let score=0;
      for(const op of s.operations){
        const weight=op.op==="damage"?3*(op.coefficient||1)*Math.min(op.scope==="all-enemies"?opponents.length:1,5):
          op.op==="heal"?2.5*(op.coefficient||1)*urgency:
          op.op==="dispel"?2.2:op.op==="status"?2:op.delta<0?1.5:1.2;
        score+=weight;
      }
      if(s.role==="healer"&&urgency>1)score*=1.5;
      if(s.role==="morale-breaker"&&opponents.some(u=>u.morale>=70))score*=1.4;
      return {skill:s,score};
    }).sort((a,b)=>b.score-a.score||a.skill.id.localeCompare(b.skill.id))[0];
    const targets=select(state,cat,a,pick.skill.target);
    return {actorId,skillId:pick.skill.id,selectedTargetId:targets[0]?.id};
  }
  return Object.freeze({LANES,LEGACY,EXTRA,checkCatalog,createBattle,selectTargets:select,
    resolveAction,advanceRound,replay,chooseAction,choosePreparedAction,potentialRollKeys,counter});
});
