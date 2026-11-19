"use strict";
/* Chat02 pure deterministic 3x3 trial combat for PROJECT ORIGINAL troop profiles.
   Main battle/Save/reward authoritative implementation is owned by Chat08. */
const fail=m=>{throw Error("MDT_TROOP_V4: "+m);};
const copy=o=>JSON.parse(JSON.stringify(o));
const cap=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const roll=(seed,actionId,tag)=>hash(seed+"|"+actionId+"|"+tag)/4294967296;
function create(pack){
 if(pack?.schemaVersion!==4||pack.candidates?.length!==137)fail("V4 pack missing");
 const byId=new Map(pack.candidates.map(c=>[c.projectId,c]));
 if(byId.size!==137)fail("candidate ID collision");
 function profile(id){return byId.get(id)?copy(byId.get(id)):null;}
 function createBattle({A=[],B=[],mode="land_sandbox",seed="trial-1"}={}){
  if(!["land_sandbox","naval_sandbox"].includes(mode))fail("unknown battle mode");
  if(!Array.isArray(A)||!Array.isArray(B)||!A.length||!B.length||A.length>5||B.length>5)fail("team size 1..5");
  const ids=new Set();
  function sideRows(rows,team){
   const slots=new Set();
   return rows.map(x=>{
    const p=byId.get(x?.troopId);
    if(!p||!x.troopId.startsWith("mdt-candidate-"))fail("unregistered project troop; Wiki ID blocked");
    if((mode==="naval_sandbox")!==p.family.startsWith("ship"))fail("land/naval mixed");
    if(!x.id||ids.has(x.id))fail("duplicate instance ID");
    ids.add(x.id);
    if(!Number.isInteger(x.slot)||x.slot<0||x.slot>8||slots.has(x.slot))fail("invalid 3x3 slot");
    slots.add(x.slot);
    const s=p.projectStats, hp=x.hp??s.hp, maxHp=x.maxHp??s.hp;
    if(!(maxHp>0&&hp>0&&hp<=maxHp))fail("invalid HP");
    return {id:x.id,team,slot:x.slot,troopId:p.projectId,family:p.family,
     hp,maxHp,attack:x.attack??s.attack,defense:x.defense??s.defense,
     speed:Math.round((x.speed??s.speed)*(p.projectAbilities.some(a=>a.tag==="speed")?1.12:1)),
     morale:x.morale??s.initialMorale,actions:0,buffs:[]};
   });
  }
  const a=sideRows(A,"A"),b=sideRows(B,"B");
  const initiativeOrder=a.concat(b).sort((x,y)=>y.speed-x.speed||x.team.localeCompare(y.team)||x.slot-y.slot).map(x=>x.id);
  return {version:4,seed,mode,A:a,B:b,initiativeOrder,
   actionIds:[],events:[],winner:null,rewards:null,saveTouched:false,source:"SIMULATED"};
 }
 function step(state,{actorId,targetId,actionId,lane="physical"}={}){
  if(state?.version!==4||state.source!=="SIMULATED")fail("trial battle required");
  if(!actionId||typeof actionId!=="string")fail("actionId required");
  if(state.actionIds.includes(actionId))return {state:copy(state),events:[],duplicate:true};
  if(!["physical","magic","tactic"].includes(lane))fail("invalid damage lane");
  const next=copy(state),units=next.A.concat(next.B);
  const actor=units.find(u=>u.id===actorId),target=units.find(u=>u.id===targetId);
  if(!actor||!target||actor.team===target.team||actor.hp<=0||target.hp<=0)fail("living opposing actors required");
  const src=byId.get(actor.troopId),dst=byId.get(target.troopId);
  const skills=Object.fromEntries(src.projectAbilities.map(s=>[s.tag,s]));
  const targetSkills=Object.fromEntries(dst.projectAbilities.map(s=>[s.tag,s]));
  const has=t=>Boolean(skills[t]), hasTarget=t=>Boolean(targetSkills[t]);
  const cfg=t=>pack.templates[t];
  const evt=[];
  const trigger=(t,forTarget="")=>has(t)&&roll(next.seed,actionId,t+forTarget)<skills[t].procChance;
  const active=(u,key)=>u.buffs.find(b=>b.key===key);
  function setBuff(u,key,duration,maxStacks=1,other={}){
   const existing=active(u,key);
   if(existing){existing.stacks=cap(existing.stacks+1,1,maxStacks);existing.remaining=Math.max(existing.remaining,duration);}
   else u.buffs.push({key,remaining:duration,stacks:1,...other});
   evt.push({type:"buff",unitId:u.id,key,stacks:active(u,key).stacks,durationTurns:duration});
  }
  const stunnedAtTurnStart=Boolean(active(actor,"stun"));
  const tick=[];
  for(const b of actor.buffs){
   if(b.key==="burn"){
    const damage=Math.min(actor.hp,Math.max(1,Math.round(actor.maxHp*.04*b.stacks)));
    actor.hp-=damage;evt.push({type:"dot",targetId:actor.id,amount:damage,origin:"PROJECT_ORIGINAL"});
   }
   b.remaining-=1;
   if(b.remaining>0)tick.push(b);else evt.push({type:"buff_expired",unitId:actor.id,key:b.key});
  }
  actor.buffs=tick;
  if(actor.hp<=0||stunnedAtTurnStart){
   evt.push({type:"skip",unitId:actor.id,reason:actor.hp<=0?"burn":"stun"});
  }else{
   let boost=1;
   for(const [t,c] of [["attack",.12],["balanced",.05],["basic_attack",lane==="physical"?.10:0],
    ["physical_attack",lane==="physical"?.14:0],["magic_attack",lane==="magic"?.12:0],
    ["tactic_attack",lane==="tactic"?.10:0],["first_charge",actor.actions===0?.28:0]]){
     if(has(t))boost*=1+c;
   }
   if(has("counter_cavalry")&&target.family==="cavalry")boost*=1.22;
   const cycles={infantry:"spear",spear:"cavalry",cavalry:"infantry","ship-small":"ship-large",
    "ship-medium":"ship-small","ship-large":"ship-medium"};
   if(cycles[actor.family]===target.family)boost*=1.22;
   if(trigger("critical")){boost*=1.5;evt.push({type:"critical",chance:.18});}
   const enemy=units.filter(x=>x.team!==actor.team&&x.hp>0);
   const multi=has("row_target")?"row":has("line_target")?"column":null;
   const victims=multi?[target,...enemy.filter(x=>x.id!==target.id&&(
    multi==="row"?Math.floor(x.slot/3)===Math.floor(target.slot/3):x.slot%3===target.slot%3))]:[target];
   let total=0;
   for(const [idx,v] of victims.entries()){
    const enemyP=byId.get(v.troopId);
    const tags=new Set(enemyP.projectAbilities.map(x=>x.tag));
    const block=active(v,"kien_thu")?.stacks||0;
    const fort=active(v,"fortify")?.stacks||0;
    const debuff=active(v,"defense_down")?.stacks||0;
    let defense=v.defense*(1+block*.08+fort*.12+(tags.has("balanced")?.06:0))*(1-debuff*.12);
    if(has("pierce"))defense*=.76;
    let dmg=(16+actor.attack*.44-defense*.18)*boost*(idx===0?1:.72);
    if(tags.has("defense")&&lane==="physical")dmg*=.92;
    if(tags.has("magic_defense")&&lane==="magic")dmg*=.90;
    if(tags.has("tactic_defense")&&lane==="tactic")dmg*=.90;
    if(tags.has("weak_to_magic")&&lane==="magic")dmg*=1.15;
    if(tags.has("low_defense")&&lane==="physical")dmg*=1.12;
    if(tags.has("naval_guard"))dmg*=.86;
    if(active(v,"aegis"))dmg*=.7;
    const amount=Math.min(v.hp,cap(Math.round(dmg),1,Math.ceil(v.maxHp*.45)));
    v.hp-=amount;total+=amount;
    evt.push({type:"damage",actorId:actor.id,targetId:v.id,amount,lane});
    const ct=tags.has("counterattack")?"counterattack":tags.has("thorns")?"thorns":
       tags.has("low_counterattack")?"low_counterattack":null;
    if(ct&&v.hp>0&&roll(next.seed,actionId,"counter:"+v.id)<cfg(ct).chance){
      const retaliate=Math.min(actor.hp,Math.max(1,Math.round(v.attack*cfg(ct).retaliationPct/100)));
      actor.hp-=retaliate;evt.push({type:"counter",actorId:v.id,targetId:actor.id,amount:retaliate});
    }
   }
   if(trigger("double_strike")&&target.hp>0){
    const extra=Math.min(target.hp,Math.max(1,Math.round(actor.attack*.45)));
    target.hp-=extra;total+=extra;evt.push({type:"extra_hit",targetId:target.id,amount:extra});
   }
   if(trigger("burn")&&target.hp>0)setBuff(target,"burn",2,2);
   if(trigger("physical_defense_down")&&target.hp>0)setBuff(target,"defense_down",2,2);
   if(trigger("stun")&&target.hp>0)setBuff(target,"stun",1,1);
   if(trigger("fortify"))setBuff(actor,"fortify",2,2);
   if(trigger("aegis"))setBuff(actor,"aegis",2,2);
   if(trigger("kien_thu"))setBuff(actor,"kien_thu",2,3);
   if(trigger("morale_protection"))setBuff(actor,"morale_protection",2,1);
   if(trigger("morale_drain")&&!active(target,"morale_protection")){
    target.morale=cap(target.morale-18,0,100);evt.push({type:"morale_loss",targetId:target.id,amount:18});
   }
   if(trigger("heal")){
    const value=Math.min(actor.maxHp-actor.hp,Math.round(actor.maxHp*.08));
    actor.hp+=value;evt.push({type:"heal",targetId:actor.id,amount:value});
   }
   if(trigger("lifesteal")){
    const value=Math.min(actor.maxHp-actor.hp,Math.round(total*.24));
    actor.hp+=value;evt.push({type:"lifesteal",targetId:actor.id,amount:value});
   }
   if(has("self_morale_gain")){
    actor.morale=cap(actor.morale+50,0,100);evt.push({type:"morale_gain",targetId:actor.id,amount:50});
   }
   if(has("no_enemy_morale_gain"))evt.push({type:"morale_denied",targetId:target.id,amount:0});
   else if(!active(target,"morale_protection")){
    const gain=has("limited_enemy_morale_gain")?10:5;
    target.morale=cap(target.morale+gain,0,100);
   }
  }
  actor.actions++;
  next.actionIds.push(actionId);
  next.events.push({actionId,actorId,targetId,events:copy(evt)});
  if(next.A.every(u=>u.hp===0))next.winner="B";
  else if(next.B.every(u=>u.hp===0))next.winner="A";
  return {state:next,events:evt,duplicate:false};
 }
 function audit(){return {profiles:byId.size,projectOnly:true,liveIntegrated:false,
  hasSaveMutation:false,hasRewards:false,sourceWikiIdAllowed:false};}
 return Object.freeze({profile,createBattle,step,audit,liveIntegrated:false});
}
module.exports={create};
