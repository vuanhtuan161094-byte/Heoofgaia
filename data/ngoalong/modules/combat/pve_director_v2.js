/* Muu Dinh Tam Quoc | PvE Tactical Director V2 — SIMULATED project game design.
 * Reads actual 28 project-alpha encounters/NPC rosters. Does NOT overwrite them.
 * Eight boss formations have stage-specific skills, phases and cooperation rules.
 * This standalone director is not a Save/receipt/Chromium authority.
 */
(function(root,factory){
  "use strict";
  const useModule=typeof module==="object"&&module.exports;
  const R=useModule?require("./resolver_v2.js"):root&&root.NLCombatResolverV2;
  const AI=useModule?require("./tactical_ai_v2.js"):root&&root.NLTacticalAIV2;
  const Projects=useModule?require("./project_skill_adapter_v2.js"):root&&root.NLProjectSkillAdapterV2;
  const F=useModule?require("./formation_adapter_v2.js"):root&&root.NLCombatFormationV2;
  const api=factory(R,AI,Projects,F);
  if(useModule)module.exports=api;
  if(root)root.NLPvETacticsV2=api;
})(typeof window!=="undefined"?window:null,function(R,AI,Projects,F){
  "use strict";
  const fail=s=>{throw Error("NL_PVE_V2: "+s);};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const good=n=>typeof n==="number"&&Number.isFinite(n);
  const alive=u=>u.hp>0;
  // Original authored project behaviors; NONE are claimed as Wiki/classic formulas.
  const BOSS_BOOK=Object.freeze({
    2:{name:"Tiền quân thủ trận",identity:"shield-wall",presetId:"shield-thu",
      opening:"boss-guard",pressure:"counter-offense",desperate:"boss-desperate",
      special:{0:["mdtq-pve-wall"],1:["mdtq-pve-line-break"]}},
    5:{name:"Khóa quân tâm",identity:"morale-lock",presetId:"spear-dieu",
      opening:"morale-siege",pressure:"morale-siege",desperate:"boss-desperate",
      special:{1:["mdtq-pve-morale-siege"],2:["mdtq-pve-morale-siege","project-override-campaign-sima-seal"]}},
    8:{name:"Bảo vệ hậu quân mưu sĩ",identity:"protected-rear",presetId:"shield-thu",
      opening:"boss-guard",pressure:"rear-hunter",desperate:"boss-desperate",
      special:{0:["mdtq-pve-wall"],3:["mdtq-pve-rear-ambush"]}},
    12:{name:"Trỗi dậy khi mất máu",identity:"last-stand-rally",presetId:"fish-dieu",
      opening:"boss-support",pressure:"boss-pressure",desperate:"boss-desperate",
      special:{0:["mdtq-pve-rally"],4:["mdtq-pve-first-aid","mdtq-pve-rally"]}},
    16:{name:"Hai mũi giáp công",identity:"dual-flank",presetId:"goose-kich",
      opening:"counter-offense",pressure:"rear-hunter",desperate:"boss-desperate",
      special:{1:["mdtq-pve-line-break"],3:["mdtq-pve-rear-ambush"]}},
    20:{name:"Thiết vệ và khinh kỵ",identity:"armored-core",presetId:"turtle-thu",
      opening:"boss-guard",pressure:"counter-offense",desperate:"boss-desperate",
      special:{0:["mdtq-pve-wall"],2:["mdtq-pve-rear-ambush"],4:["mdtq-pve-first-aid"]}},
    24:{name:"Ngũ tướng tinh nhuệ",identity:"elite-five",presetId:"arc-dieu",
      opening:"boss-support",pressure:"boss-pressure",desperate:"boss-desperate",
      special:{0:["mdtq-pve-wall"],1:["mdtq-pve-morale-siege"],2:["mdtq-pve-line-break"],
        3:["mdtq-pve-rear-ambush"],4:["mdtq-pve-first-aid"]}},
    28:{name:"Tổng công bằng sĩ khí",identity:"final-war-drum",presetId:"goose-kich",
      opening:"boss-support",pressure:"morale-siege",desperate:"boss-desperate",
      special:{0:["mdtq-pve-rally"],1:["mdtq-pve-morale-siege"],2:["mdtq-pve-rear-ambush"],
        3:["mdtq-pve-line-break"],4:["mdtq-pve-first-aid"]}}
  });
  const PvESkills=Object.freeze([
    // PvE-only original basic action. The Mobile Wiki describes morale gain
    // on normal attacks, but the +25 value here is a SIMULATED standalone rule;
    // Chat 08 must compare P2 native morale before enabling to avoid double gain.
    {id:"mdtq-pve-basic-charge",role:"attacker",moraleCost:0,
      target:{team:"enemy",pattern:"single",priority:"front"},
      operations:[{op:"damage",lane:"physical",coefficient:1},
        {op:"morale",delta:25,scope:"self"}]},
    {id:"mdtq-pve-wall",role:"defender",moraleCost:40,target:{team:"self",pattern:"single"},
      operations:[{op:"status",effectId:"ironwall",scope:"self"},
        {op:"morale",delta:8,scope:"all-allies"}]},
    {id:"mdtq-pve-morale-siege",role:"morale-breaker",moraleCost:50,
      target:{team:"enemy",pattern:"highest-morale"},
      operations:[{op:"damage",lane:"tactic",coefficient:.65},
        {op:"morale",delta:-35}]},
    {id:"mdtq-pve-rear-ambush",role:"attacker",moraleCost:55,
      target:{team:"enemy",pattern:"back",priority:"back"},
      operations:[{op:"damage",lane:"tactic",coefficient:1.45,pierce:.2}]},
    {id:"mdtq-pve-first-aid",role:"healer",moraleCost:40,
      target:{team:"ally",pattern:"lowest-hp"},
      operations:[{op:"heal",coefficient:1.25},
        {op:"dispel",polarity:"harmful",maxRemove:1}]},
    {id:"mdtq-pve-line-break",role:"attacker",moraleCost:50,
      target:{team:"enemy",pattern:"column",priority:"counter"},
      operations:[{op:"damage",lane:"physical",coefficient:1.2,pierce:.28}]},
    {id:"mdtq-pve-rally",role:"support",moraleCost:45,
      target:{team:"self",pattern:"single"},
      operations:[{op:"morale",delta:22,scope:"all-allies"},
        {op:"status",effectId:"focus",scope:"all-allies"}]}
  ].map(s=>Object.freeze({...s,
    provenance:{classification:"SIMULATED",sourceId:"mdtq-pve-tactics-v2"}})));
  function compile(pack){
    if(!R||!AI||!Projects||!F)fail("combat module dependencies missing");
    const encounters=pack?.campaign?.encounters,npcs=pack?.campaign?.npcs;
    if(!Array.isArray(encounters)||!Array.isArray(npcs)||!pack.campaign.statProfiles)
      fail("source campaign pack required");
    const plans=[],seen=new Set(),sourceNPCs=new Map(npcs.map(n=>[n.id,n]));
    for(const e of encounters){
      if(!Number.isSafeInteger(e.stage)||seen.has(e.stage)||e.activeCount<1||
         e.activeCount>5)fail("duplicate/invalid encounter stage");
      seen.add(e.stage);
      const npc=sourceNPCs.get(e.npcId);
      if(!npc||npc.mapId!==e.mapId||!Array.isArray(npc.units)||
         npc.units.length<e.activeCount)fail("missing matching NPC roster "+e.stage);
      const slots=e.deploymentSlots?.slice(0,e.activeCount);
      if(!slots||slots.length!==e.activeCount||new Set(slots).size!==slots.length||
         slots.some(x=>!Number.isSafeInteger(x)||x<0||x>8))
        fail("invalid native 0..8 formation slots");
      if(e.provenance?.classification!=="SIMULATED"||
         npc.provenance?.classification!=="SIMULATED")fail("project source classification");
      const boss=BOSS_BOOK[e.stage]||null;
      if(!!e.boss!==!!boss)fail("boss registry mismatch stage "+e.stage);
      const types=npc.units.slice(0,e.activeCount).map(u=>u.troopId);
      const profile=types.includes("support")||types.includes("drum")?
        "boss-support":types.includes("strategist")?"rear-hunter":
        types.includes("cavalry")?"counter-offense":"balanced";
      plans.push({
        id:e.id,stage:e.stage,npcId:e.npcId,mapId:e.mapId,boss:!!boss,
        bossIdentity:boss?.identity||null,bossName:boss?.name||null,
        nativeSlots:[...slots],resolverSlots:slots.map(s=>s+1),
        troops:types,activeCount:e.activeCount,
        sourceTactic:e.tactic||null,
        sourceMechanics:copy(e.mechanics||[]),
        selectedProfile:profile,
        presetId:boss?.presetId||"fish-dieu",
        opening:boss?.opening||profile,pressure:boss?.pressure||profile,
        desperate:boss?.desperate||"boss-desperate",
        provenance:{classification:"SIMULATED",sourceId:"project-alpha",
          authoredTactics:"mdtq-pve-tactics-v2"}
      });
    }
    plans.sort((a,b)=>a.stage-b.stage);
    return {schemaVersion:2,provenance:"SIMULATED",source:"alpha_content.json",
      plans,bossStages:plans.filter(x=>x.boss).map(x=>x.stage)};
  }
  function getPlan(compiled,stage){
    const plan=compiled.plans.find(x=>x.stage===stage);
    if(!plan)fail("unknown campaign stage "+stage);
    return plan;
  }
  function catalog(pack,effectCatalog,skillCatalog){
    if(!effectCatalog||!skillCatalog?.skills)fail("existing effect and skill catalog required");
    const converted=Projects.compile(pack);
    const result={effects:effectCatalog,
      skills:[...skillCatalog.skills,...converted.skills,...PvESkills],
      counters:pack.troops.counterCycle};
    R.checkCatalog(result);
    return result;
  }
  function statProjection(source,stage,index,boss){
    const base=source.base,grow=source.growth,deploy=source.deploymentBonus;
    const bossHp=boss?source.bossBonus.hp:0,
      bossAtk=boss?source.bossBonus.atk:0,
      bossDef=boss?source.bossBonus.def:0;
    const hp=base.hp+grow.hp*stage+deploy.hp*index+bossHp;
    const atk=base.atk+grow.atk*stage+deploy.atk*index+bossAtk;
    const matk=base.matk+grow.matk*stage;
    const def=base.def+grow.def*stage+bossDef;
    if(![hp,atk,matk,def].every(good))fail("invalid project stat profile");
    return {
      hp:Math.max(1,Math.round(hp)),
      attack:{physical:Math.round(atk),tactic:Math.round(atk*source.derived.catkFromAtk),
        magic:Math.round(matk)},
      defense:{physical:Math.round(def),tactic:Math.round(def*source.derived.tdefFromDef),
        magic:Math.round(def*source.derived.mdefFromDef)},
      speed:Math.round(base.speed+grow.speed*stage+deploy.speed*index)
    };
  }
  function createEnemies(pack,compiled,stage){
    const plan=getPlan(compiled,stage),e=pack.campaign.encounters.find(x=>x.stage===stage);
    const sourceNpc=pack.campaign.npcs.find(x=>x.id===plan.npcId);
    const scaling=pack.campaign.statProfiles[sourceNpc.statProfileId];
    if(!scaling||scaling.provenance?.classification!=="SIMULATED")
      fail("missing project NPC stat scaling");
    const converted=Projects.compile(pack),book=BOSS_BOOK[stage]||null;
    const units=sourceNpc.units.slice(0,e.activeCount).map((source,i)=>{
      const troop=source.troopId,stats=statProjection(scaling,stage,i,plan.boss);
      // Project's source registry has five enemy archetypes, not a spear or
      // drum archetype. The following mapping is original SIMULATED policy:
      // spear -> infantry assault, drum -> support. Unknown troops fail closed.
      const roleMap={spear:"infantry",drum:"support"};
      const enemySkill=converted.enemySkillIds[roleMap[troop]||troop];
      if(!enemySkill)fail("unmapped NPC troop "+troop);
      const extras=[...(book?.special[i]||[])];
      if(stage===27&&troop==="cavalry")
        extras.push("mdtq-pve-rear-ambush"); // stage-27 source marks rear-row targeting
      return {
        id:source.id,side:"e",slot:plan.resolverSlots[i],troopType:troop,
        attack:stats.attack,defense:stats.defense,
        hp:stats.hp,maxHp:stats.hp,
        morale:plan.boss?scaling.morale.boss:scaling.morale.normal,
        speed:stats.speed,
        skillIds:["mdtq-pve-basic-charge",enemySkill,...extras],
        legacyEffects:[],
        provenance:{classification:"SIMULATED",sourceId:"project-alpha",
          formula:"mdtq-pve-v2-project-stat-projection"}
      };
    });
    const unsupported=[];
    for(const mechanic of plan.sourceMechanics){
      if(mechanic.type==="start-morale"&&mechanic.target==="enemy"){
        for(const u of units)if(u.troopType===mechanic.troopId)
          u.morale=Math.max(0,Math.min(100,mechanic.value));
      }else if(mechanic.type==="stat-adjustment"&&mechanic.target==="enemy"&&
        mechanic.stat==="speed"&&good(mechanic.add)){
        for(const u of units)if(u.troopType===mechanic.troopId)u.speed+=mechanic.add;
      }else if(mechanic.type==="target-back-row"&&mechanic.target==="enemy"&&
        mechanic.troopId==="cavalry"&&stage===27){
        // The backline skill is added above to cavalry units. No hidden RNG.
      }else if(mechanic.type==="initial-status"&&mechanic.target==="enemy"){
        if(R.LEGACY.includes(mechanic.statusId)){
          for(const i of mechanic.unitIndices||[]){
            if(units[i])units[i].legacyEffects.push({kind:mechanic.statusId,turns:mechanic.duration});
          }
          unsupported.push({type:mechanic.type,reason:"native-legacy-clock-owner-required"});
        }else unsupported.push({type:mechanic.type,reason:"status-init-requires-native-owner"});
      }else unsupported.push({type:mechanic.type,reason:"requires-campaign-owner-parity"});
    }
    return {plan,units,unsupportedMechanics:unsupported};
  }
  function phase(state,plan){
    const enemies=state.units.filter(x=>x.side==="e");
    const aliveEnemies=enemies.filter(alive);
    if(!aliveEnemies.length)return "defeated";
    const maxHp=enemies.reduce((sum,u)=>sum+u.maxHp,0);
    const health=aliveEnemies.reduce((sum,u)=>sum+u.hp,0)/Math.max(1,maxHp);
    if(health<=.38||aliveEnemies.length<=Math.floor(enemies.length/2))
      return "desperate";
    if(state.round<=2)return "opening";
    return "pressure";
  }
  function profileFor(state,plan,actor){
    const stagePhase=phase(state,plan);
    const hpRatio=actor.hp/actor.maxHp;
    let profile=stagePhase==="opening"?plan.opening:
      stagePhase==="desperate"?plan.desperate:plan.pressure;
    if(plan.stage===27&&actor.troopType==="cavalry")profile="rear-hunter";
    else if(actor.troopType==="support"||actor.troopType==="drum")
      profile=stagePhase==="desperate"?"medic":"boss-support";
    else if(actor.troopType==="strategist"&&stagePhase!=="desperate")
      profile=plan.bossIdentity==="morale-lock"?"morale-siege":"rear-hunter";
    else if(hpRatio<.35&&actor.skillIds.includes("mdtq-pve-wall"))
      profile="boss-guard";
    else if(actor.troopType==="cavalry"&&stagePhase==="pressure")
      profile="counter-offense";
    return {profile,phase:stagePhase};
  }
  function chooseNpc(state,cat,plan,actorId,rollProvider,options={}){
    const actor=state.units.find(u=>u.id===actorId&&u.side==="e"&&alive(u));
    if(!actor)fail("active NPC actor required");
    const policy={...profileFor(state,plan,actor)};
    if(options.focusTargetId)policy.focusTargetId=options.focusTargetId;
    const decision=AI.prepare(state,cat,actorId,policy,rollProvider);
    return decision?{...decision,stage:plan.stage,boss:plan.boss,
      tacticalPhase:policy.phase,provenance:"SIMULATED"}:null;
  }
  function makeSeededRoll(seed){
    if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)fail("seed out of range");
    let current=seed>>>0,used=0;
    const roll=key=>{
      if(typeof key!=="string"||!key)fail("roll key required");
      current=(Math.imul(current,1664525)+1013904223)>>>0;
      used++;
      return current/4294967296;
    };
    return Object.freeze({roll,getState:()=>({seed:current,used})});
  }
  function simulate(pack,compiled,stage,playerUnits,cat,opts={}){
    const generated=createEnemies(pack,compiled,stage);
    const plan=generated.plan;
    if(!Array.isArray(playerUnits)||playerUnits.length<1||playerUnits.length>5)
      fail("1..5 player units required");
    const players=copy(playerUnits);
    if(players.some(x=>x.side!=="p"))fail("player side must be p");
    const preset=F.compile(pack.formations),formation=F.formPair(preset,
      opts.playerPresetId||"fish-dieu",plan.presetId);
    const initial=R.createBattle(cat,players.concat(generated.units),formation);
    let state=initial,frames=[],decisions=[],pending=[],
      lastPlayerTarget=null,lastNpcTarget=null;
    const rng=makeSeededRoll(opts.seed??(100000+stage));
    const rounds=Math.max(1,Math.min(30,opts.maxRounds||12));
    for(let roundIndex=0;roundIndex<rounds;roundIndex++){
      const playersNow=state.units.filter(u=>u.side==="p"&&alive(u));
      const enemiesNow=state.units.filter(u=>u.side==="e"&&alive(u));
      if(!playersNow.length||!enemiesNow.length)break;
      const bySpeed=(a,b)=>(b.speed||0)-(a.speed||0)||a.slot-b.slot||a.id.localeCompare(b.id);
      const p=playersNow.sort(bySpeed),e=enemiesNow.sort(bySpeed);
      const queue=[];
      for(let k=0;k<Math.max(p.length,e.length);k++){
        if(p[k])queue.push(p[k].id);
        if(e[k])queue.push(e[k].id);
      }
      for(const id of queue){
        const actor=state.units.find(u=>u.id===id);
        if(!actor||!alive(actor)||!state.units.some(u=>u.side!==actor.side&&alive(u)))continue;
        const enemyTurn=actor.side==="e",policy=enemyTurn?null:
          {profile:actor.troopType==="support"||actor.troopType==="drum"?"medic":
            actor.troopType==="cavalry"?"counter-offense":"balanced"};
        const picked=enemyTurn?
          chooseNpc(state,cat,plan,id,rng.roll,{focusTargetId:lastNpcTarget}):
          AI.prepare(state,cat,id,{...policy,focusTargetId:lastPlayerTarget},rng.roll);
        if(!picked)continue;
        const resolved=R.resolveAction(state,cat,picked.command);
        state=resolved.state;frames.push(resolved.frame);
        if(resolved.pendingLegacyCommands?.length)
          pending.push(...resolved.pendingLegacyCommands.map(c=>({turn:state.turn,...copy(c)})));
        const lastDamage=resolved.events.filter(ev=>ev.type==="lane-hit"&&ev.amount>0).at(-1);
        if(lastDamage){
          if(enemyTurn)lastNpcTarget=lastDamage.targetId;
          else lastPlayerTarget=lastDamage.targetId;
        }
        decisions.push({turn:state.turn,actorId:id,side:actor.side,
          skillId:picked.command.skillId,targetId:picked.command.selectedTargetId||null,
          phase:picked.tacticalPhase||"player",profile:picked.decision.policy,
          score:picked.decision.score});
      }
      const tick=R.advanceRound(state,cat);
      state=tick.state;frames.push(tick.frame);
    }
    const replayed=R.replay(initial,cat,frames);
    if(JSON.stringify(replayed)!==JSON.stringify(state))fail("module deterministic replay divergence");
    const playerAlive=state.units.some(u=>u.side==="p"&&alive(u));
    const enemyAlive=state.units.some(u=>u.side==="e"&&alive(u));
    return {
      stage,sourceId:plan.id,boss:plan.boss,bossIdentity:plan.bossIdentity,
      initial,final:state,frames,decisions,
      outcome:!enemyAlive&&playerAlive?"player-win":
        !playerAlive&&enemyAlive?"enemy-win":!playerAlive&&!enemyAlive?"draw":"timeout",
      replayParity:true,authoritative:false,
      status:"MODULE_SIMULATION_NOT_LIVE",
      nativePending:pending,unsupportedMechanics:generated.unsupportedMechanics,
      rng:rng.getState(),provenance:"SIMULATED",rewardSettlement:false
    };
  }
  return Object.freeze({BOSS_BOOK,PvESkills,compile,getPlan,catalog,
    createEnemies,phase,profileFor,chooseNpc,makeSeededRoll,simulate});
});
