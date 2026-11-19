"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const R=require("../../../data/ngoalong/modules/combat/resolver_v2.js");
const AI=require("../../../data/ngoalong/modules/combat/tactical_ai_v2.js");
const D=require("../../../data/ngoalong/modules/combat/pve_director_v2.js");
const F=require("../../../data/ngoalong/modules/combat/formation_adapter_v2.js");
const pack=JSON.parse(fs.readFileSync("data/ngoalong/alpha_content.json","utf8"));
const effects=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effects_v1.json","utf8"));
const skills=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/skill_schema_v2.json","utf8"));
const compiled=D.compile(pack),cat=D.catalog(pack,effects,skills);
const player=(id,slot,troop)=>({id,side:"p",slot,troopType:troop,
  attack:{physical:210,tactic:215,magic:235},
  defense:{physical:100,tactic:110,magic:100},
  hp:800,maxHp:800,morale:100,speed:80,
  skillIds:["mdtq-basic-strike","mdtq-herbal-rescue","mdtq-morale-break",
    "mdtq-ironwall-order","mdtq-sleep-hex","mdtq-warlord-rally"]});
const players=[
  player("liu","3","infantry"),player("guan","6","spear"),
  player("zhao","9","cavalry"),player("zhuge","4","strategist"),
  player("xun","7","support")
].map(u=>({...u,slot:Number(u.slot)}));
const setup=stage=>{
  const generated=D.createEnemies(pack,compiled,stage);
  return {generated,state:R.createBattle(cat,[...players,...generated.units],
    F.formPair(F.compile(pack.formations),"fish-dieu",generated.plan.presetId))};
};
let passed=0;
function check(label,fn){fn();passed++;console.log("PASS "+passed+" "+label)}
check("28 stage plans compile from exact alpha encounter records",()=>{
  assert.equal(compiled.plans.length,28);
  assert.deepEqual(compiled.plans.map(x=>x.stage),Array.from({length:28},(_,i)=>i+1));
  assert.ok(compiled.plans.every(x=>x.source==="none"||x.provenance.classification==="SIMULATED"));
});
check("exactly eight distinct source boss stages and patterns",()=>{
  assert.deepEqual(compiled.bossStages,[2,5,8,12,16,20,24,28]);
  assert.equal(new Set(compiled.plans.filter(x=>x.boss).map(x=>x.bossIdentity)).size,8);
});
check("all 28 NPCs preserve original IDs, troop identities and 3x3 slots",()=>{
  for(const p of compiled.plans){
    const native=pack.campaign.encounters.find(x=>x.stage===p.stage);
    const roster=pack.campaign.npcs.find(x=>x.id===p.npcId);
    const generated=D.createEnemies(pack,compiled,p.stage);
    assert.equal(generated.units.length,native.activeCount);
    assert.deepEqual(generated.units.map(u=>u.id),
      roster.units.slice(0,native.activeCount).map(u=>u.id));
    assert.deepEqual(generated.units.map(u=>u.troopType),
      roster.units.slice(0,native.activeCount).map(u=>u.troopId));
    assert.deepEqual(generated.units.map(u=>u.slot),
      native.deploymentSlots.slice(0,native.activeCount).map(x=>x+1));
    assert.equal(new Set(generated.units.map(u=>u.slot)).size,generated.units.length);
  }
});
check("NPC stats use only source project scaling and are positive",()=>{
  for(const plan of compiled.plans){
    const roster=D.createEnemies(pack,compiled,plan.stage).units;
    for(const u of roster){
      assert.ok(u.hp>0&&u.maxHp===u.hp);
      assert.ok(Object.values(u.attack).every(n=>n>0));
      assert.ok(Object.values(u.defense).every(n=>n>0));
      assert.equal(u.provenance.classification,"SIMULATED");
    }
  }
});
check("project NPC spear maps to infantry combat descriptor, never support healer",()=>{
  const roster=D.createEnemies(pack,compiled,5).units;
  const spear=roster.find(u=>u.troopType==="spear");
  assert.ok(spear.skillIds.includes("project-enemy-infantry"));
  assert.ok(!spear.skillIds.includes("project-enemy-support"));
});
check("boss stage 2 vanguard receives shield wall skill",()=>{
  const s=setup(2);
  assert.ok(s.generated.units[0].skillIds.includes("mdtq-pve-wall"));
  const rng=D.makeSeededRoll(314);
  const p=D.chooseNpc(s.state,cat,s.generated.plan,s.generated.units[0].id,rng.roll);
  assert.equal(p.command.skillId,"mdtq-pve-wall");
  assert.equal(p.tacticalPhase,"opening");
});
check("boss stage 5 keeps real NPC and sim-only morale seal override",()=>{
  const s=setup(5);
  assert.equal(s.generated.plan.bossIdentity,"morale-lock");
  assert.equal(s.generated.units.length,4);
  assert.ok(s.generated.units[2].skillIds.includes("project-override-campaign-sima-seal"));
  assert.ok(s.generated.unsupportedMechanics.some(x=>x.type==="morale-seal"));
});
check("boss stage 8 protects tactical rear instead of inventing NPC",()=>{
  const s=setup(8);
  assert.equal(s.generated.plan.bossIdentity,"protected-rear");
  assert.ok(s.generated.units[0].skillIds.includes("mdtq-pve-wall"));
  assert.ok(s.generated.units[3].skillIds.includes("mdtq-pve-rear-ambush"));
});
check("boss stage 12 can rally and heal when formation weakens",()=>{
  const s=setup(12);
  assert.ok(s.generated.units[0].skillIds.includes("mdtq-pve-rally"));
  assert.ok(s.generated.units[4].skillIds.includes("mdtq-pve-first-aid"));
});
check("boss stage 16 has two different coordinated strike options",()=>{
  const g=D.createEnemies(pack,compiled,16);
  assert.ok(g.units[1].skillIds.includes("mdtq-pve-line-break"));
  assert.ok(g.units[3].skillIds.includes("mdtq-pve-rear-ambush"));
});
check("boss stage 20 has shield core, flanker and healer",()=>{
  const g=D.createEnemies(pack,compiled,20);
  assert.ok(g.units[0].skillIds.includes("mdtq-pve-wall"));
  assert.ok(g.units[2].skillIds.includes("mdtq-pve-rear-ambush"));
  assert.ok(g.units[4].skillIds.includes("mdtq-pve-first-aid"));
});
check("boss stage 24 assigns five different tactical specializations",()=>{
  const g=D.createEnemies(pack,compiled,24);
  assert.equal(g.units.length,5);
  assert.equal(new Set(g.units.map(u=>u.skillIds.at(-1))).size,5);
});
check("final stage 28 source drum starts at 100 morale",()=>{
  const g=D.createEnemies(pack,compiled,28);
  assert.equal(g.plan.bossIdentity,"final-war-drum");
  assert.equal(g.units.find(x=>x.troopType==="drum").morale,100);
});
check("stage 25 legacy guards remain native-owner pending",()=>{
  const g=D.createEnemies(pack,compiled,25);
  assert.ok(g.unsupportedMechanics.some(x=>x.reason==="native-legacy-clock-owner-required"));
  assert.ok(g.units.slice(0,2).every(x=>x.legacyEffects.some(e=>e.kind==="guard")));
});
check("stage 26 project strategist starts at 100 morale",()=>{
  const g=D.createEnemies(pack,compiled,26);
  assert.equal(g.units.find(x=>x.troopType==="strategist").morale,100);
});
check("stage 27 adjusts cavalry speed and enables back-row targeting",()=>{
  const g=D.createEnemies(pack,compiled,27),source=pack.campaign.statProfiles["campaign-npc-scaling-v1"];
  const cav=g.units.find(x=>x.troopType==="cavalry");
  const index=g.units.findIndex(u=>u.id===cav.id);
  const expected=source.base.speed+source.growth.speed*27+
    source.deploymentBonus.speed*index+18;
  assert.equal(cav.speed,expected);
  assert.ok(g.units.filter(x=>x.troopType==="cavalry").every(x=>
    x.skillIds.includes("mdtq-pve-rear-ambush")));
  const s=setup(27);
  assert.equal(D.profileFor(s.state,g.plan,cav).profile,"rear-hunter");
});
check("boss changes opening to pressure after round 2",()=>{
  const s=setup(5);
  assert.equal(D.phase(s.state,s.generated.plan),"opening");
  s.state.round=3;
  assert.equal(D.phase(s.state,s.generated.plan),"pressure");
});
check("boss becomes desperate at 35 percent party health",()=>{
  const s=setup(24),state=s.state;
  for(const unit of state.units)if(unit.side==="e")unit.hp=Math.floor(unit.maxHp*.3);
  assert.equal(D.phase(state,s.generated.plan),"desperate");
  const choice=D.profileFor(state,s.generated.plan,state.units.find(u=>u.side==="e"&&
    !["support","drum"].includes(u.troopType)));
  assert.equal(choice.profile,"boss-desperate");
});
check("wounded support switches to emergency medical AI phase",()=>{
  const s=setup(12);s.state.round=4;
  for(const u of s.state.units)if(u.side==="e")u.hp=Math.floor(u.maxHp*.25);
  const healer=s.state.units.find(u=>u.side==="e"&&u.troopType==="drum");
  assert.ok(healer);
  assert.equal(D.profileFor(s.state,s.generated.plan,healer).profile,"medic");
});
check("seeded NPC choice is deterministic with equal state",()=>{
  const s=setup(5),actor=s.generated.units[2].id;
  const a=D.chooseNpc(s.state,cat,s.generated.plan,actor,D.makeSeededRoll(77).roll);
  const b=D.chooseNpc(s.state,cat,s.generated.plan,actor,D.makeSeededRoll(77).roll);
  assert.deepEqual(a,b);
});
check("boss action choice does not mutate original 5v5 combat state",()=>{
  const s=setup(8),before=JSON.stringify(s.state);
  D.chooseNpc(s.state,cat,s.generated.plan,s.generated.units[0].id,D.makeSeededRoll(5).roll);
  assert.equal(JSON.stringify(s.state),before);
});
check("bad campaign stage is refused",()=>{
  assert.throws(()=>D.createEnemies(pack,compiled,999),/unknown campaign stage/);
});
check("project boss catalog includes only simulated approved skills",()=>{
  assert.equal(D.PvESkills.length,7);
  assert.ok(D.PvESkills.every(s=>s.provenance.classification==="SIMULATED"));
  assert.equal(R.checkCatalog(cat),true);
});

check("PvE basic attack recharges simulated morale and does not mint rewards",()=>{
  const s=setup(2),npc=s.generated.units[0],state=s.state;
  const before=state.units.find(u=>u.id===npc.id).morale;
  const skill="mdtq-pve-basic-charge";
  assert.ok(npc.skillIds.includes(skill));
  const hit=R.resolveAction(state,cat,{actorId:npc.id,skillId:skill});
  assert.equal(hit.state.units.find(u=>u.id===npc.id).morale,Math.min(100,before+25));
  assert.equal(hit.readyToCommit,true);
  assert.ok(!hit.events.some(e=>e.type==="reward"||e.type==="receipt"));
});
check("boss tactics recharge for later skill uses rather than one-time casting only",()=>{
  const result=D.simulate(pack,compiled,24,players,cat,{maxRounds:8,seed:882331});
  const npc=result.decisions.filter(d=>d.side==="e");
  assert.ok(npc.length>12);
  assert.ok(npc.some(d=>d.skillId==="mdtq-pve-basic-charge"));
  assert.ok(npc.some(d=>d.skillId!=="mdtq-pve-basic-charge"));
  assert.equal(result.replayParity,true);
});
check("all 28 stage module simulations replay parity in one round",()=>{
  for(let stage=1;stage<=28;stage++){
    const result=D.simulate(pack,compiled,stage,players,cat,{maxRounds:1,seed:1024+stage});
    assert.equal(result.stage,stage);
    assert.equal(result.replayParity,true);
    assert.equal(result.authoritative,false);
    assert.equal(result.rewardSettlement,false);
    assert.ok(result.frames.length>0);
  }
});
check("all eight boss scenarios execute multi-round simulated battle with event parity",()=>{
  for(const stage of compiled.bossStages){
    const result=D.simulate(pack,compiled,stage,players,cat,{maxRounds:4,seed:99000+stage});
    assert.ok(result.decisions.length>=10);
    assert.equal(result.replayParity,true);
    assert.ok(result.decisions.some(x=>x.side==="e"));
    assert.ok(result.decisions.some(x=>x.phase==="opening"));
    assert.ok(["timeout","player-win","enemy-win","draw"].includes(result.outcome));
  }
});
check("same seed creates identical boss decisions and final HP",()=>{
  const a=D.simulate(pack,compiled,28,players,cat,{maxRounds:5,seed:556677});
  const b=D.simulate(pack,compiled,28,players,cat,{maxRounds:5,seed:556677});
  assert.deepEqual(a.decisions,b.decisions);
  assert.deepEqual(a.final,b.final);
  assert.deepEqual(a.rng,b.rng);
});
check("source alpha campaign is never mutated by project director",()=>{
  const source=JSON.stringify(pack);
  const g=D.createEnemies(pack,compiled,5);
  const out=D.simulate(pack,compiled,2,players,cat,{maxRounds:2,seed:999});
  assert.equal(JSON.stringify(pack),source);
  assert.equal(out.rewardSettlement,false);
  assert.equal(g.plan.sourceMechanics[0].type,"morale-seal");
});
check("legacy command remains explicitly non-authoritative in PvE report",()=>{
  const result=D.simulate(pack,compiled,5,players,cat,{maxRounds:5,seed:999});
  assert.equal(result.authoritative,false);
  assert.ok(result.unsupportedMechanics.some(x=>x.type==="morale-seal"));
  assert.ok(result.frames.every(f=>f.kind==="round-end"||
    f.readyToCommit===!f.pendingLegacyCommands.length));
});
console.log("PVE TACTICS "+passed+"/"+passed+" PASS");
