/* CHAT08 A1 — Translate CHAT02/05 tactics into the ONE native P2 battle.
 * Pure decisions: never executes a second resolver, RNG, Save or reward settlement.
 * All additional combat coefficients are PROJECT SIMULATED (not VNG formulas).
 */
(function(root,make) {
  "use strict";
  const api=make();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else if(root)root.NLNativePvEAdapterV2=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const fail=m=>{throw Error("NL_NATIVE_PVE_A1: "+m);};
  const SKILLS=Object.freeze({
    "mdtq-pve-wall":{tag:"Thiết Bích",kind:"physical",pattern:"single",
      mult:1.04,applyAlly:"guard"},
    "mdtq-pve-line-break":{tag:"Phá Trận",kind:"physical",pattern:"column",
      mult:1.14,pierce:.20,apply:"break",applyChance:.45},
    "mdtq-pve-rear-ambush":{tag:"Tập Kích Hậu Quân",kind:"tactic",pattern:"back",
      mult:1.22,pierce:.12},
    "mdtq-pve-first-aid":{tag:"Quân Y Cấp Cứu",kind:"magic",pattern:"heal",
      mult:1.12,healCount:1,cleanseNegative:1,applyAlly:"ward"},
    "mdtq-pve-rally":{tag:"Hiệu Lệnh",kind:"tactic",pattern:"single",
      mult:1.03,bonusMorale:15,applyAlly:"focus"},
    "mdtq-pve-morale-siege":{tag:"Loạn Tâm",kind:"tactic",pattern:"single",
      mult:1.02,drainMorale:22}
  });
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  function create({pack,director,troopBridge}={}){
    if(!pack||!director||!troopBridge)fail("missing validated input contracts");
    const compiled=director.compile(pack);
    if(compiled.plans.length!==28||compiled.bossStages.length!==8||
       troopBridge.audit().project!==25)fail("campaign/troop count changed");
    const plans=new Map(compiled.plans.map(p=>[p.stage,p]));
    const counter=new Map(pack.troops.counterCycle.map(c=>[c.attacker+"|"+c.defender,c]));
    function plan(stage){return plans.get(stage)||null;}
    function phase(battle){
      if(!battle||battle.mode!=="campaign")return "inactive";
      const alive=(battle.e||[]).filter(u=>u.hp>0);
      if(!alive.length)return "defeated";
      const hp=(battle.e||[]).reduce((s,u)=>s+Math.max(0,u.hp),0);
      const max=(battle.e||[]).reduce((s,u)=>s+(u.maxHp||1),0);
      if(hp/Math.max(1,max)<=.38||alive.length<=Math.floor(battle.e.length/2))
        return "desperate";
      return battle.round<=2?"opening":"pressure";
    }
    function profile(battle,actor){
      const p=plan(battle?.stage);
      if(!p)return {phase:"inactive",profile:"balanced",boss:false};
      const ph=phase(battle);
      let role=p.boss?(ph==="opening"?p.opening:ph==="desperate"?p.desperate:p.pressure):p.selectedProfile;
      if(actor?.troop==="drum"||actor?.type==="support")role=ph==="desperate"?"medic":"boss-support";
      if(actor?.type==="strategist"&&p.bossIdentity==="morale-lock")role="morale-siege";
      if(actor?.type==="cavalry"&&battle.stage===27)role="rear-hunter";
      return {phase:ph,profile:role,boss:p.boss,bossIdentity:p.bossIdentity};
    }
    function bossSkill(battle,actor,existing){
      if(!battle||battle.mode!=="campaign"||!actor||actor.team!=="e"||
        actor.hp<=0||actor.troop==="drum"||actor.skillId||actor.skillKey||
        (battle.stage>=25&&battle.r03Encounter))return null;
      const b=director.BOSS_BOOK[battle.stage];
      if(!b)return null;
      const index=battle.e.indexOf(actor);
      if(index<0)return null;
      const ids=b.special[index]||[];
      const ph=phase(battle);
      const preferred=ph==="desperate"?[...ids].reverse():ids;
      const id=preferred.find(k=>SKILLS[k]);
      if(!id)return null;
      const descriptor={...SKILLS[id]};
      return {id,descriptor,phase:ph,stage:battle.stage,
        source:"CHAT05_PROJECT_SIMULATED",boss:b.identity,
        previous:existing?.tag||null};
    }
    function pickTarget({battle,attacker,mode,baseline,opponents}={}){
      if(!battle||battle.mode!=="campaign"||!attacker||
        attacker.team!=="e"||!baseline||!opponents?.length)
        return {target:baseline,profile:"legacy",phase:"inactive",candidates:[]};
      const policy=profile(battle,attacker);
      // 25-28 have frozen R03 mechanics, target legality and same-seed
      // A/B formation fixtures. Never rebalance their live hit path here.
      if(battle.stage>=25&&battle.r03Encounter)
        return {target:baseline,...policy,candidates:[],
          source:"NATIVE_R03_LATE_CAMPAIGN_PRESERVED"};
      // Native P3/R03 may rewrite mode to back. Restrict all candidates to
      // the exact target depth returned by that authoritative legality pass.
      const legal=opponents.filter(u=>u.hp>0&&u.slot%3===baseline.slot%3);
      if(!legal.length)return {target:baseline,...policy,candidates:[]};
      const focus=battle.nlA1Focus||null;
      const scored=legal.map(u=>{
        const ratio=clamp(u.hp/Math.max(1,u.maxHp),0,1);
        const adv=counter.get(attacker.troop+"|"+u.troop)?.multiplier||1;
        // A reversed counter edge is a disadvantage, not a neutral matchup.
        // The multiplier itself is PROJECT_SIMULATED; only the troop-cycle
        // ordering is grounded in classic 2011 sources.
        const reverse=counter.get(u.troop+"|"+attacker.troop);
        const disadvantage=reverse?(reverse.disadvantageMultiplier||.82):1;
        const advantage=adv>1?adv:disadvantage;
        const caster=u.type==="strategist"||u.troop==="drum"||u.type==="support";
        const rowDistance=Math.abs(Math.floor(u.slot/3)-Math.floor(attacker.slot/3));
        // Small bounded matchup preference on every native Boss target decision.
        // 1.22/0.82 are project coefficients, not claimed official formulas.
        let score=-rowDistance*2+(1-ratio)*9+(caster?4:0)+(advantage-1)*18;
        if(focus===u.id)score+=11;
        // At 100 morale a cast is imminent (classic 2011 evidence). A Boss
        // makes this existing legal target more urgent; no new morale mutation.
        if(policy.boss&&u.morale>=100)score+=caster?30:12;
        if(policy.boss&&u.morale>=75&&u.morale<100&&caster)score+=9;
        if(policy.profile==="morale-siege")score+=(u.morale>=100?45:u.morale>=70?18:0)+(caster?9:0);
        if(policy.profile==="counter-offense")score+=(advantage-1)*95;
        if(policy.profile==="rear-hunter")score+=(caster?18:0)+(1-ratio)*12;
        if(policy.profile==="boss-guard")score+=(u.atk||0)*.01;
        if(policy.profile==="boss-pressure"||policy.profile==="boss-desperate")score+=(1-ratio)*35;
        if(policy.profile==="boss-support"||policy.profile==="medic")score+=(u.morale>=100?10:0);
        return {id:u.id,slot:u.slot,score:Number(score.toFixed(3)),ratio,advantage};
      }).sort((a,b)=>b.score-a.score||a.slot-b.slot||String(a.id).localeCompare(String(b.id)));
      const target=legal.find(u=>u.id===scored[0].id)||baseline;
      return {target,...policy,candidates:scored,source:"CHAT05_NATIVE_AI_V2"};
    }
    function troopOf(actor,battle,game){
      const resolved=troopBridge.resolveLive({actor,battle,game});
      return resolved.allowed?resolved.unit:null;
    }
    // One narrow additive passive through native p2Hit (no extra hit,
    // no damage helper, no second morale gain): first BASIC hit only.
    function bonusForBasicHit({battle,actor,game,action,hitIndex=0}={}){
      if(!battle||battle.mode!=="campaign"||
         (battle.stage>=25&&battle.r03Encounter)||!actor||!action||
         action.actorId!==actor.id||action.team!==actor.team||
         !action.normal||actor.actions!==0||hitIndex!==0)return null;
      const u=troopOf(actor,battle,game),p=u?.proposedAddon;
      if(!p||p.phase!=="BEFORE_FIRST_BASIC_ATTACK"||
        !["charge_bonus","opening_damage_bonus"].includes(p.effectIntent))return null;
      const bonus=u.behavior.value;
      if(typeof bonus!=="number"||bonus<=0||bonus>.2)fail("invalid bounded troop bonus");
      return {projectTroopId:u.projectId,multiplier:1+bonus,
        kind:p.effectIntent,classification:"SIMULATED"};
    }
    function coverage(){return Object.freeze({stages:plans.size,bosses:compiled.bossStages.slice(),
      projectTroops:troopBridge.audit().project,
      classicB1:{moraleSkillThreshold:100,reverseCounterFixed:true,
        bossCastThreatTargeting:true,legalDepthPreserved:true,
        noAdditionalMoraleOrHit:true,source:"CLASSIC_WEB_2011_AND_PROJECT_SIMULATED"},
      nativeSingleAuthority:true,dualResolver:false,
      bossSkillCandidates:Object.keys(SKILLS).length,
      activeTroopPassives:["charge_bonus","opening_damage_bonus"],
      extraMoraleGrants:0,extraRewardWrites:0,source:"SIMULATED"});}
    return Object.freeze({plan,phase,profile,bossSkill,pickTarget,troopOf,
      bonusForBasicHit,coverage});
  }
  return Object.freeze({create,SKILLS});
});
