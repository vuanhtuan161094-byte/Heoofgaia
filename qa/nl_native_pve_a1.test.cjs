"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const pack=require("../data/ngoalong/alpha_content.json");
const director=require("../data/ngoalong/modules/combat/pve_director_v2.js");
const bridge=require("../data/ngoalong/modules/troops/troop_live_bridge_v2.js");
const contract=require("../data/ngoalong/modules/troops/live_integration_contract_v2.json");
const project=require("../data/ngoalong/modules/troops/project_playable_v1.json");
const evolution=require("../data/ngoalong/modules/troops/evolution_contract_v1.json");
const policy=require("../data/ngoalong/integration/native_pve_adapter_v2.js");
const troops=bridge.create(contract,project,evolution);
const a1=policy.create({pack,director,troopBridge:troops});
const npc=(id,i,troop="infantry",team="e")=>({id,team,type:troop,troop,
  slot:i,hp:100,maxHp:100,morale:60,actions:0,atk:130});
const scene=(stage=2,round=1)=>({mode:"campaign",stage,round,
  p:[npc("p1",2,"infantry","p"),npc("p2",5,"strategist","p")],
  e:[npc("e1",2),npc("e2",4,"strategist"),npc("e3",5,"cavalry")]});
test("28 native stages and exactly eight authored boss identities",()=>{
 const x=a1.coverage();
 assert.equal(x.stages,28);
 assert.deepEqual(x.bosses,[2,5,8,12,16,20,24,28]);
 assert.equal(x.projectTroops,25);
 assert.equal(x.nativeSingleAuthority,true);
 assert.equal(x.dualResolver,false);
 assert.equal(x.extraMoraleGrants,0);
 assert.equal(x.extraRewardWrites,0);
 for(let stage=1;stage<=28;stage++){
   const plan=a1.plan(stage);
   assert.equal(plan.stage,stage);
   assert.equal(Boolean(plan.boss),x.bosses.includes(stage));
 }
});
test("opening, pressure, and desperate have native HP/round parity",()=>{
 const b=scene(24);
 assert.equal(a1.phase(b),"opening");
 b.round=3;assert.equal(a1.phase(b),"pressure");
 b.e[0].hp=1;b.e[1].hp=1;b.e[2].hp=1;
 assert.equal(a1.phase(b),"desperate");
 b.e[0].hp=0;b.e[1].hp=0;
 assert.equal(a1.phase(b),"desperate");
});
test("Boss skills translate only to supported native descriptors",()=>{
 const stageKeys=Object.keys(policy.SKILLS);
 assert.equal(stageKeys.length,6);
 for(const stage of a1.coverage().bosses){
   const b=director.BOSS_BOOK[stage];
   for(const [idx,skills] of Object.entries(b.special)){
     for(const id of skills){
       if(!policy.SKILLS[id])continue;
       const s=scene(stage,3),n=Number(idx);
       while(s.e.length<=n)s.e.push(npc("e"+(s.e.length+1),s.e.length));
       const unit=s.e[n],before=JSON.stringify(s);
       const result=a1.bossSkill(s,unit,{tag:"legacy"});
       assert.ok(result,stage+" "+id);
       assert.equal(result.stage,stage);
       assert.ok(["physical","tactic","magic"].includes(result.descriptor.kind));
       assert.ok(["single","row","column","back","heal","all"].includes(result.descriptor.pattern));
       assert.equal(JSON.stringify(s),before);
       break;
     }
   }
 }
});
test("stage 5 existing morale seal and drum branch always stay authoritative",()=>{
 const b=scene(5,3),unit=b.e[1];
 unit.skillId="campaign-sima-seal";
 assert.equal(a1.bossSkill(b,unit,{}),null);
 delete unit.skillId;unit.troop="drum";
 assert.equal(a1.bossSkill(b,unit,{}),null);
});
test("target policy never bypasses native legal depth and never mutates battle",()=>{
 const b=scene(5,3);
 const attacker=b.e[0],original=b.p[0];
 b.p.push(npc("p3",8,"strategist","p"));
 b.p[1].morale=125;b.p[0].morale=10;b.p[2].morale=115;
 const before=JSON.stringify(b);
 const choice=a1.pickTarget({battle:b,attacker,mode:"front",baseline:original,opponents:b.p});
 assert.equal(choice.target.slot%3,original.slot%3);
 assert.ok(choice.candidates.every(x=>x.slot%3===original.slot%3));
 assert.equal(JSON.stringify(b),before);
 const same=a1.pickTarget({battle:b,attacker,mode:"front",baseline:original,opponents:b.p});
 assert.deepEqual(choice,same);
});
test("R03 troop identity is resolved without importing any Wiki numeric ID",()=>{
 const b=scene(),a=b.p[0],game={nlr03:{evolutions:{p1:"swift-wing"}}};
 a.r03Branch="swift-wing";
 const u=a1.troopOf(a,b,game);
 assert.equal(u.projectId,"nlp-swift-wing");
 assert.equal(troops.lookup("nlwm-184"),null);
 assert.equal(a1.coverage().projectTroops,25);
});
test("only first BASIC cavalry charge adds its bounded multiplier, never another hit",()=>{
 const b=scene(),a=b.e[2],ctx={actorId:a.id,team:"e",normal:true,hitCount:0};
 const plus=a1.bonusForBasicHit({battle:b,actor:a,action:ctx,game:{},hitIndex:0});
 assert.equal(plus.projectTroopId,"nlp-cavalry");
 assert.equal(plus.multiplier,1.16);
 assert.equal(a1.bonusForBasicHit({battle:b,actor:a,action:ctx,game:{},hitIndex:1}),null);
 assert.equal(a1.bonusForBasicHit({battle:b,actor:a,action:{...ctx,normal:false},game:{},hitIndex:0}),null);
 a.actions=1;
 assert.equal(a1.bonusForBasicHit({battle:b,actor:a,action:ctx,game:{},hitIndex:0}),null);
});
test("non-campaign uses untouched old engine targeting, skill and settlement",()=>{
 const b=scene();b.mode="cltq";
 const original=b.p[0],e=b.e[0],snapshot=JSON.stringify(b);
 assert.equal(a1.bossSkill(b,e,{}),null);
 assert.equal(a1.bonusForBasicHit({battle:b,actor:e,action:{actorId:e.id,team:"e",normal:true},game:{}}),null);
 assert.equal(a1.pickTarget({battle:b,attacker:e,mode:"front",baseline:original,opponents:b.p}).target,original);
 assert.equal(JSON.stringify(b),snapshot);
});
