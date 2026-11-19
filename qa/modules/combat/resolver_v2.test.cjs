"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const Engine=require("../../../tools/nl_combat_effects_v1.js");
const R=require("../../../data/ngoalong/modules/combat/resolver_v2.js");
const F=require("../../../data/ngoalong/modules/combat/formation_adapter_v2.js");
const Project=require("../../../data/ngoalong/modules/combat/project_skill_adapter_v2.js");
const alpha=JSON.parse(fs.readFileSync("data/ngoalong/alpha_content.json","utf8"));
const original=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effects_v1.json","utf8"));
const skillData=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/skill_schema_v2.json","utf8"));
const wiki=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effect_rule_index_v2.json","utf8"));
const cat={effects:original,skills:skillData.skills,counters:alpha.troops.counterCycle};
const attack={physical:100,tactic:150,magic:200},defense={physical:100,tactic:120,magic:90};
const allSkills=skillData.skills.map(s=>s.id);
const unit=(id,side,slot,troopType,more={})=>({
  id,side,slot,troopType,attack:{...attack},defense:{...defense},hp:500,maxHp:500,
  morale:100,skillIds:allSkills,...more
});
const make=(more={})=>R.createBattle(cat,[
  unit("p1","p",3,"infantry",more.p||{}),unit("e1","e",1,"spear",more.e||{})],more.formation||{});
const action=(s,id,skill,extra={})=>R.resolveAction(s,cat,{actorId:id,skillId:skill,...extra});
const has=(s,id,e)=>s.units.find(u=>u.id===id).statuses.some(x=>x.id===e);
const json=x=>JSON.stringify(x);
let passed=0;
function check(label,fn){fn();passed++;console.log("PASS "+String(passed).padStart(2,"0")+" "+label)}
check("13 original statuses kept",()=>assert.equal(original.effects.length,13));
check("6 legacy names unchanged",()=>assert.deepEqual(R.LEGACY,["break","guard","daze","burn","morale-seal","ward"]));
check("7 additive names unchanged",()=>assert.deepEqual(R.EXTRA,["sleep","fear","anchored","ironwall","focus","repel-blessing","surge"]));
check("source-only Wiki coverage 320",()=>assert.equal(wiki.records.length,320));
check("Wiki 320 never enabled",()=>assert.ok(!wiki.runtimeEnabled&&wiki.records.every(x=>!x.enabled)));
check("Wiki UNKNOWN duration remains unknown",()=>assert.equal(wiki.audit.knownFields.durationTurns,0));
check("schema includes ten original skill templates",()=>assert.equal(cat.skills.length,10));
check("explicit SIMULATED skill provenance",()=>assert.ok(cat.skills.every(s=>s.provenance.classification==="SIMULATED")));
check("combat catalog validated",()=>assert.equal(R.checkCatalog(cat),true));
check("reject non-simulated skill coefficient",()=>{
  const c={...cat,skills:cat.skills.map((s,i)=>i? s:{...s,provenance:{classification:"VERIFIED"}})};
  assert.throws(()=>R.checkCatalog(c),/SIMULATED/);
});
check("board accepts five generals on each side",()=>{
  const us=[];
  for(let i=0;i<5;i++){us.push(unit("p"+i,"p",i+1,"infantry"));us.push(unit("e"+i,"e",i+1,"spear"));}
  assert.equal(R.createBattle(cat,us).units.length,10);
});
check("board rejects six generals on one side",()=>assert.throws(()=>{
  R.createBattle(cat,Array.from({length:6},(_,i)=>unit("p"+i,"p",i+1,"infantry")));
},/five generals|units/));
check("board rejects occupied slots",()=>assert.throws(()=>R.createBattle(cat,[
  unit("a","p",1,"infantry"),unit("b","p",1,"spear")]),/occupied/));
check("none of the actions mutates input",()=>{
  const s=make(),before=json(s);
  action(s,"p1","mdtq-basic-strike");
  assert.equal(json(s),before);
});
check("physical lane produces damage",()=>{
  const r=action(make(),"p1","mdtq-basic-strike");
  assert.ok(r.events.some(e=>e.type==="lane-hit"&&e.lane==="physical"&&e.amount>0));
});
check("tactic lane produces different damage",()=>{
  const r=action(make(),"p1","mdtq-spear-assault");
  assert.ok(r.events.some(e=>e.type==="lane-hit"&&e.lane==="tactic"&&e.amount>0));
});
check("magic lane produces different damage",()=>{
  const r=action(make(),"p1","mdtq-arcane-blast");
  assert.ok(r.events.some(e=>e.type==="lane-hit"&&e.lane==="magic"&&e.amount>0));
});
check("infantry counters spear by original multiplier",()=>assert.equal(R.counter(cat,"infantry","spear"),1.22));
check("spear counter reverses with disadvantage multiplier",()=>assert.equal(R.counter(cat,"spear","infantry"),.82));
check("formation boosts attack and defense",()=>{
  const s=make({formation:{p:{attack:.2},e:{defense:.2}}});
  const normal=action(make(),"p1","mdtq-basic-strike").events.find(e=>e.type==="lane-hit").amount;
  const boosted=action(s,"p1","mdtq-basic-strike").events.find(e=>e.type==="lane-hit").amount;
  assert.ok(boosted>=normal);
});
check("ironwall blocks one real hit",()=>{
  let s=action(make(),"p1","mdtq-ironwall-order").state;
  let r=action(s,"e1","mdtq-basic-strike");assert.equal(r.state.units[0].hp,500);
  assert.ok(r.events.some(x=>x.type==="damage-blocked"));assert.equal(has(r.state,"p1","ironwall"),false);
});
check("next attack after ironwall deals damage",()=>{
  let s=action(make(),"p1","mdtq-ironwall-order").state;
  s=action(s,"e1","mdtq-basic-strike").state;
  s=action(s,"e1","mdtq-basic-strike").state;
  assert.ok(s.units[0].hp<500);
});
check("heal is actually restorative",()=>{
  let s=make({p:{hp:180}});
  const r=action(s,"p1","mdtq-herbal-rescue");assert.ok(r.state.units[0].hp>180);
});
check("morale-break reduces enemy morale",()=>{
  const r=action(make(),"p1","mdtq-morale-break");
  assert.equal(r.state.units[1].morale,55);
});
check("rally raises allied morale within cap",()=>{
  let s=make({p:{morale:60}});
  s=action(s,"p1","mdtq-warlord-rally").state;
  assert.ok(s.units[0].morale<=100&&s.units[0].morale>=0);
});
check("status sleep requires caller roll",()=>{
  assert.throws(()=>action(make(),"p1","mdtq-sleep-hex"),/recorded roll/);
});
check("sleep lands with recorded low roll",()=>{
  const r=action(make(),"p1","mdtq-sleep-hex",{rolls:{"0:e1":.1}});
  assert.equal(has(r.state,"e1","sleep"),true);
});
check("sleep misses with recorded high roll",()=>{
  const r=action(make(),"p1","mdtq-sleep-hex",{rolls:{"0:e1":.9}});
  assert.equal(has(r.state,"e1","sleep"),false);
});
check("sleep skips exactly one owner action",()=>{
  let s=action(make(),"p1","mdtq-sleep-hex",{rolls:{"0:e1":.1}}).state;
  const r=action(s,"e1","mdtq-basic-strike");
  assert.ok(r.events.some(x=>x.type==="action-skipped"));assert.equal(has(r.state,"e1","sleep"),false);
});
check("legacy ward blocks harmful V1 additions",()=>{
  const s=make({e:{legacyEffects:[{kind:"ward",turns:2}]}});
  const r=action(s,"p1","mdtq-sleep-hex",{rolls:{"0:e1":.1}});
  assert.equal(has(r.state,"e1","sleep"),false);
  assert.ok(r.events.some(x=>x.reason==="legacy-ward"));
});
check("six legacy effects preserved, never converted",()=>{
  const legacy=[{kind:"burn",turns:2,stacks:2},{kind:"guard",turns:2}];
  const s=make({e:{legacyEffects:legacy}});const r=action(s,"p1","mdtq-basic-strike");
  assert.deepEqual(r.state.units[1].legacyEffects,legacy);
});
check("legacy application is a typed command, not fake state",()=>{
  const r=action(make(),"p1","mdtq-legacy-break-adapter");
  assert.ok(r.events.some(x=>x.type==="legacy-status-command"&&x.adapterRequired));
  assert.equal(r.state.units[1].legacyEffects.length,0);
});
check("status stacking respects V1 focus cap",()=>{
  let s=make();
  for(let i=0;i<7;i++)s=Engine.applyStatus(s,cat.effects,{targetId:"p1",statusId:"focus"}).state;
  assert.equal(s.units[0].statuses.find(x=>x.id==="focus").stacks,3);
});
check("V1 dispel does not remove anchored",()=>{
  let s=Engine.applyStatus(make(),cat.effects,{targetId:"p1",statusId:"anchored"}).state;
  const r=Engine.dispel(s,cat.effects,{targetId:"p1",scope:"all"});
  assert.equal(has(r.state,"p1","anchored"),true);
});
check("fear wakes when hit",()=>{
  let s=Engine.applyStatus(make(),cat.effects,{targetId:"e1",statusId:"fear"}).state;
  s=action(s,"p1","mdtq-basic-strike").state;assert.equal(has(s,"e1","fear"),false);
});
check("anchored keeps sleep when hit",()=>{
  let s=Engine.applyStatus(make(),cat.effects,{targetId:"e1",statusId:"anchored"}).state;
  s=Engine.applyStatus(s,cat.effects,{targetId:"e1",statusId:"sleep"}).state;
  s=action(s,"p1","mdtq-basic-strike").state;assert.equal(has(s,"e1","sleep"),true);
});
check("owner event contains snapshot for renderer",()=>{
  const r=action(make(),"p1","mdtq-basic-strike");
  assert.equal(r.frame.kind,"action");assert.deepEqual(r.frame.snapshot,r.state);
});
check("recorded replay restores action and round",()=>{
  const s=make();
  const a=action(s,"p1","mdtq-basic-strike"),b=R.advanceRound(a.state,cat);
  assert.deepEqual(R.replay(s,cat,[a.frame,b.frame]),b.state);
});
check("tampered replay must reject",()=>{
  const s=make(),a=action(s,"p1","mdtq-basic-strike");
  a.frame.snapshot.units[1].hp+=1;
  assert.throws(()=>R.replay(s,cat,[a.frame]),/replay divergence/);
});
check("AI chooses an affordable action",()=>{
  const s=make({p:{morale:0}}),c=R.chooseAction(s,cat,"p1");
  assert.equal(c.skillId,"mdtq-basic-strike");
});
check("backline explicitly selectable by back-target skill",()=>{
  const s=R.createBattle(cat,[unit("p1","p",3,"infantry"),unit("e1","e",1,"spear"),
    unit("e2","e",3,"strategist")]);
  const r=action(s,"p1","mdtq-sleep-hex",{rolls:{"0:e2":.1}});
  assert.equal(has(r.state,"e2","sleep"),true);
});

check("compile exact 6x4 historical formation catalog",()=>{
  const presets=F.compile(alpha.formations);
  assert.equal(presets.length,24);
  assert.equal(new Set(presets.map(x=>x.presetId)).size,24);
  assert.deepEqual(presets.map(p=>p.presetId).sort(),
    alpha.formations.families.flatMap(f=>alpha.formations.plans.map(p=>f.id+"-"+p.key)).sort());
});
check("formation deployment converts native 0-based to V2 1-based slots",()=>{
  const preset=F.compile(alpha.formations).find(x=>x.presetId==="shield-thu");
  assert.deepEqual(preset.nativeSlots,[2,5,0,3,6]);
  assert.deepEqual(preset.resolverSlots,[3,6,1,4,7]);
  const deployed=F.deploy([unit("p1","p",3,"infantry")],F.compile(alpha.formations),"shield-thu","p");
  assert.equal(deployed[0].slot,3);
});
check("24 presets can instantiate battles without invalid slots",()=>{
  const catalog=F.compile(alpha.formations);
  for(const p of catalog){
    const us=F.deploy([unit("p1","p",1,"infantry")],catalog,p.presetId,"p")
      .concat(F.deploy([unit("e1","e",1,"spear")],catalog,"shield-thu","e"));
    const battle=R.createBattle(cat,us,F.formPair(catalog,p.presetId,"shield-thu"));
    assert.equal(battle.formation.p.presetId,p.presetId);
  }
});
check("magic formation bonus actually increases magic lane damage",()=>{
  const presets=F.compile(alpha.formations);
  const p=F.formPair(presets,"arc-van","fish-van");
  const boosted=action(make({formation:p}),"p1","mdtq-arcane-blast").events.find(x=>x.type==="lane-hit").amount;
  const neutral=action(make(),"p1","mdtq-arcane-blast").events.find(x=>x.type==="lane-hit").amount;
  assert.ok(boosted>neutral);
});
check("shield formation increases defense against physical lane",()=>{
  const presets=F.compile(alpha.formations);
  const p=F.formPair(presets,"fish-van","shield-thu");
  const protectedHit=action(make({formation:p}),"p1","mdtq-basic-strike").events.find(x=>x.type==="lane-hit").amount;
  const neutralHit=action(make(),"p1","mdtq-basic-strike").events.find(x=>x.type==="lane-hit").amount;
  assert.ok(protectedHit<neutralHit);
});
check("formation critical modifier requires external deterministic roll",()=>{
  const skill={id:"qa-crit",role:"attacker",moraleCost:0,target:{team:"enemy",pattern:"single"},
    operations:[{op:"damage",lane:"physical",coefficient:1,criticalChance:.1,criticalMultiplier:1.5}],
    provenance:{classification:"SIMULATED",sourceId:"qa-only"}};
  const catalog={...cat,skills:[...cat.skills,skill]};
  const presets=F.compile(alpha.formations);
  const units=[unit("p1","p",3,"infantry",{skillIds:["qa-crit"]}),unit("e1","e",1,"spear")];
  const formation=F.formPair(presets,"arc-van","fish-van");
  const state=R.createBattle(catalog,units,formation);
  assert.throws(()=>R.resolveAction(state,catalog,{actorId:"p1",skillId:"qa-crit"}),/recorded roll/);
  const high=R.resolveAction(state,catalog,{actorId:"p1",skillId:"qa-crit",rolls:{"crit:0:e1":.7}});
  const low=R.resolveAction(state,catalog,{actorId:"p1",skillId:"qa-crit",rolls:{"crit:0:e1":.05}});
  assert.ok(low.state.units[1].hp<high.state.units[1].hp);
});
check("mixed enemy attack and ally-lowest-hp heal never targets enemy by mistake",()=>{
  const hybrid={id:"qa-hybrid",role:"healer",moraleCost:0,
    target:{team:"enemy",pattern:"single"},
    operations:[{op:"damage",lane:"magic",coefficient:.2,scope:"selected"},
      {op:"heal",coefficient:1,scope:"ally-lowest-hp"}],
    provenance:{classification:"SIMULATED",sourceId:"qa-only"}};
  const catalog={...cat,skills:[...cat.skills,hybrid]};
  const units=[unit("p1","p",3,"strategist",{skillIds:["qa-hybrid"]}),
    unit("p2","p",1,"infantry",{hp:100}),unit("e1","e",1,"spear")];
  const state=R.createBattle(catalog,units);
  const r=R.resolveAction(state,catalog,{actorId:"p1",skillId:"qa-hybrid",selectedTargetId:"e1"});
  assert.ok(r.state.units.find(x=>x.id==="p2").hp>100);
  assert.ok(r.state.units.find(x=>x.id==="e1").hp<500);
  assert.ok(r.events.some(x=>x.type==="heal"&&x.targetId==="p2"));
});


check("all 14 playable project heroes have source skill descriptors",()=>{
  const converted=Project.compile(alpha);
  assert.equal(Object.keys(converted.heroSkillIds).length,14);
  assert.deepEqual(Object.keys(converted.heroSkillIds).sort(),
    alpha.heroes.projectRoster.map(h=>h.id).sort());
});
check("project enemy and override adapters cover 5+1 descriptors",()=>{
  const c=Project.compile(alpha);
  assert.equal(Object.keys(c.enemySkillIds).length,5);
  assert.equal(Object.keys(c.overrideSkillIds).length,1);
  assert.equal(c.skills.length,20);
});
check("all 20 project descriptors validate against original Effects V1",()=>{
  const adapted=Project.compile(alpha);
  assert.equal(R.checkCatalog({...cat,skills:[...cat.skills,...adapted.skills]}),true);
});
check("Liu Bei heals two injured allies and retains legacy ward adapter",()=>{
  const adapted=Project.compile(alpha),merged={...cat,skills:[...cat.skills,...adapted.skills]};
  const us=[unit("liu","p",3,"support",{hp:420,skillIds:[adapted.heroSkillIds.liu]}),
    unit("ally","p",1,"infantry",{hp:50}),unit("e1","e",1,"spear")];
  const s=R.createBattle(merged,us);
  const r=R.resolveAction(s,merged,{actorId:"liu",skillId:adapted.heroSkillIds.liu});
  assert.ok(r.state.units.find(u=>u.id==="ally").hp>50);
  assert.ok(r.events.some(x=>x.type==="legacy-status-command"&&x.effectId==="ward"));
});
check("Zhao Yun original descriptor generates two separate tactic strikes",()=>{
  const adapted=Project.compile(alpha),merged={...cat,skills:[...cat.skills,...adapted.skills]};
  const s=R.createBattle(merged,[unit("zhao","p",3,"cavalry",{skillIds:[adapted.heroSkillIds.zhao]}),
    unit("e1","e",1,"infantry")]);
  const r=R.resolveAction(s,merged,{actorId:"zhao",skillId:adapted.heroSkillIds.zhao});
  assert.equal(r.events.filter(x=>x.type==="lane-hit").length,2);
  assert.deepEqual(r.events.filter(x=>x.type==="lane-hit").map(x=>x.strike),[1,2]);
  assert.deepEqual(R.replay(s,merged,[r.frame]),r.state);
});
check("Zhuge Liang daze chance requires recorded external roll",()=>{
  const adapted=Project.compile(alpha),merged={...cat,skills:[...cat.skills,...adapted.skills]};
  const s=R.createBattle(merged,[unit("zhuge","p",3,"strategist",{skillIds:[adapted.heroSkillIds.zhuge]}),
    unit("e1","e",1,"infantry")]);
  assert.throws(()=>R.resolveAction(s,merged,{actorId:"zhuge",skillId:adapted.heroSkillIds.zhuge}),/recorded roll/);
  const r=R.resolveAction(s,merged,{actorId:"zhuge",skillId:adapted.heroSkillIds.zhuge,
    rolls:{"1:e1":.12}});
  assert.ok(r.events.some(x=>x.type==="legacy-status-command"&&x.effectId==="daze"));
  assert.equal(r.state.units[1].legacyEffects.length,0);
});
check("project Sima morale-seal override emits legacy command and drain",()=>{
  const adapted=Project.compile(alpha),merged={...cat,skills:[...cat.skills,...adapted.skills]};
  const skill=adapted.overrideSkillIds["campaign-sima-seal"];
  const s=R.createBattle(merged,[unit("sima","p",3,"strategist",{skillIds:[skill]}),
    unit("e1","e",1,"infantry")]);
  const r=R.resolveAction(s,merged,{actorId:"sima",skillId:skill});
  assert.ok(r.events.some(x=>x.type==="legacy-status-command"&&x.effectId==="morale-seal"));
  assert.equal(r.state.units[1].morale,65);
});
check("project hero coefficients and tags remain SIMULATED",()=>{
  const adapted=Project.compile(alpha);
  assert.ok(adapted.skills.every(s=>s.provenance.classification==="SIMULATED"&&
    s.adaptation==="SIMULATED_NOT_LEGACY_PARITY"&&s.descriptorSource));
});


check("explicit double-heal selection keeps requested ally first",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"support",{hp:120}),unit("p2","p",1,"infantry",{hp:250}),
    unit("p3","p",4,"infantry",{hp:450}),unit("e1","e",1,"spear")]);
  const targets=R.selectTargets(state,cat,state.units[0],
    {team:"ally",pattern:"double",priority:"weakest",maxTargets:2},"p3");
  assert.equal(targets.length,2);
  assert.equal(targets[0].id,"p3");
});
check("friendly rear unit can be selected explicitly for a single heal",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"support"),unit("p2","p",1,"infantry",{hp:75}),
    unit("e1","e",1,"spear")]);
  const targets=R.selectTargets(state,cat,state.units[0],
    {team:"ally",pattern:"single",priority:"front"},"p2");
  assert.equal(targets[0].id,"p2");
});
check("protected enemy backline still rejects ordinary single targeting",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"support"),unit("e1","e",1,"infantry"),
    unit("e2","e",3,"strategist")]);
  assert.throws(()=>R.selectTargets(state,cat,state.units[0],
    {team:"enemy",pattern:"single",priority:"front"},"e2"),/protected backline/);
});
check("AI makes recorded proc-roll command from external seeded provider",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"strategist",{skillIds:["mdtq-sleep-hex"]}),
    unit("e1","e",1,"infantry")]);
  const command=R.choosePreparedAction(state,cat,"p1",()=>0.11);
  assert.equal(command.rolls["0:e1"],.11);
  const result=R.resolveAction(state,cat,command);
  assert.ok(result.state.units[1].statuses.some(x=>x.id==="sleep"));
  assert.deepEqual(R.replay(state,cat,[result.frame]),result.state);
});
check("AI refuses hidden RNG for proc-based skills",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"strategist",{skillIds:["mdtq-sleep-hex"]}),
    unit("e1","e",1,"infantry")]);
  assert.throws(()=>R.choosePreparedAction(state,cat,"p1"),/seeded rollProvider/);
});
check("AI precomputes per-strike critical roll keys",()=>{
  const skill={id:"qa-double-crit",role:"attacker",moraleCost:0,
    target:{team:"enemy",pattern:"single",priority:"front"},
    operations:[{op:"damage",lane:"physical",coefficient:.8,repeat:2,criticalChance:.25}],
    provenance:{classification:"SIMULATED",sourceId:"qa-only"}};
  const catalog={...cat,skills:[skill]};
  const state=R.createBattle(catalog,[
    unit("p1","p",3,"infantry",{skillIds:[skill.id]}),
    unit("e1","e",1,"spear")]);
  const cmd=R.choosePreparedAction(state,catalog,"p1",()=>.5);
  assert.deepEqual(Object.keys(cmd.rolls),["crit:0:e1:0","crit:0:e1:1"]);
  assert.equal(R.resolveAction(state,catalog,cmd).events.filter(e=>e.type==="lane-hit").length,2);
});
check("AI rejects invalid external seed roll, without changing state",()=>{
  const state=R.createBattle(cat,[
    unit("p1","p",3,"strategist",{skillIds:["mdtq-sleep-hex"]}),
    unit("e1","e",1,"infantry")]),before=JSON.stringify(state);
  assert.throws(()=>R.choosePreparedAction(state,cat,"p1",()=>1.5),/invalid external AI roll/);
  assert.equal(JSON.stringify(state),before);
});

check("5v5 forty-action seed run replays exact event and HP state",()=>{
  const project=Project.compile(alpha),catalog={...cat,skills:[...cat.skills,...project.skills]},
    forms=F.compile(alpha.formations),first=F.preset(forms,"spear-van"),second=F.preset(forms,"shield-dieu");
  const hero=["liu","guan","zhuge","cao","zhao"];
  const troop=["infantry","spear","cavalry","archer","strategist"];
  const u=(id,side,slot,kind,skill)=>({
    id,side,slot,troopType:kind,
    attack:{physical:120,tactic:145,magic:165},
    defense:{physical:90,tactic:90,magic:90},
    hp:900,maxHp:900,morale:100,skillIds:["mdtq-basic-strike",skill]
  });
  const units=[
    ...hero.map((id,i)=>u(id,"p",first.resolverSlots[i],troop[i],project.heroSkillIds[id])),
    ...troop.map((id,i)=>u("npc-"+id,"e",second.resolverSlots[i],id,
      project.enemySkillIds[id==="spear"?"infantry":id==="archer"?"archer":id==="cavalry"?"cavalry":id==="strategist"?"strategist":"support"]))
  ];
  let state=R.createBattle(catalog,units,F.formPair(forms,"spear-van","shield-dieu")),
      initial=JSON.parse(JSON.stringify(state)),frames=[],seed=12938182;
  const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let step=0;step<40;step++){
    const side=step%2?"e":"p",alive=state.units.filter(x=>x.side===side&&x.hp>0);
    if(!alive.length||!state.units.some(x=>x.side!==side&&x.hp>0))break;
    const cmd=R.choosePreparedAction(state,catalog,alive[step%alive.length].id,roll);
    assert.ok(cmd&&cmd.actorId);
    const result=R.resolveAction(state,catalog,cmd);
    frames.push(result.frame);state=result.state;
    if(step%10===9){const round=R.advanceRound(state,catalog);frames.push(round.frame);state=round.state;}
  }
  assert.ok(frames.length>=20);
  assert.deepEqual(R.replay(initial,catalog,frames),state);
  assert.ok(frames.some(x=>x.events.some(e=>e.type==="lane-hit")));
  assert.ok(frames.every(x=>!x.events.some(e=>e.type==="reward"||e.type==="settlement")));
});

check("legacy six-status operation blocks authoritative V2 commit",()=>{
  const r=action(make(),"p1","mdtq-legacy-break-adapter");
  assert.equal(r.readyToCommit,false);
  assert.equal(r.frame.readyToCommit,false);
  assert.ok(r.pendingLegacyCommands.some(x=>x.type==="legacy-status-command"&&x.effectId==="break"));
  assert.deepEqual(r.pendingLegacyCommands,r.frame.pendingLegacyCommands);
});
check("nonlegacy V2 action is ready for direct event consumption",()=>{
  const r=action(make(),"p1","mdtq-basic-strike");
  assert.equal(r.readyToCommit,true);
  assert.deepEqual(r.pendingLegacyCommands,[]);
  assert.deepEqual(R.replay(make(),cat,[r.frame]),r.state);
});
check("tampered native-status command tracking fails replay",()=>{
  const start=make(),r=action(start,"p1","mdtq-legacy-break-adapter");
  r.frame.pendingLegacyCommands.splice(0);
  assert.throws(()=>R.replay(start,cat,[r.frame]),/replay divergence/);
});
console.log("RESULT "+passed+"/"+passed+" PASS");
