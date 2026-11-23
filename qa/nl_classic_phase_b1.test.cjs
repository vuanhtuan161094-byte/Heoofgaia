"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const pack=require("../data/ngoalong/alpha_content.json");
const director=require("../data/ngoalong/modules/combat/pve_director_v2.js");
const troopBridge=require("../data/ngoalong/modules/troops/troop_live_bridge_v2.js");
const contract=require("../data/ngoalong/modules/troops/live_integration_contract_v2.json");
const project=require("../data/ngoalong/modules/troops/project_playable_v1.json");
const evolution=require("../data/ngoalong/modules/troops/evolution_contract_v1.json");
const adapter=require("../data/ngoalong/integration/native_pve_adapter_v2.js");
const native=adapter.create({pack,director,troopBridge:troopBridge.create(contract,project,evolution)});
const unit=(id,slot,troop,team,more={})=>({id,slot,troop,type:troop,team,
  hp:800,maxHp:800,morale:0,atk:100,...more});
function scene(stage=5){
 const p=[unit('front',2,'infantry','p'),
          unit('drum',5,'drum','p',{type:'support',morale:100}),
          unit('archer',8,'archer','p',{morale:15})];
 const e=[unit('boss',2,'infantry','e'),unit('guard',5,'cavalry','e')];
 return {mode:'campaign',stage,round:3,p,e};
}
test("B1: 2011 classic 100-morale Boss threat stays within native legal depth",()=>{
 const b=scene(),before=JSON.stringify(b);
 const choice=native.pickTarget({battle:b,attacker:b.e[0],mode:'front',
  baseline:b.p[0],opponents:b.p});
 assert.equal(choice.target.id,'drum');
 assert.ok(choice.candidates.every(u=>u.slot%3===b.p[0].slot%3));
 assert.equal(JSON.stringify(b),before,"policy must be pure; P2 mutates once");
 assert.deepEqual(choice,native.pickTarget({battle:b,attacker:b.e[0],
  mode:'front',baseline:b.p[0],opponents:b.p}));
});
test("B1: reversed infantry-versus-cavalry counter reports disadvantage, not 1.0",()=>{
 const b=scene(5);
 b.p=[unit('horse',2,'cavalry','p'),unit('spear',5,'spear','p')];
 const choice=native.pickTarget({battle:b,attacker:b.e[0],
  mode:'front',baseline:b.p[0],opponents:b.p});
 const byId=Object.fromEntries(choice.candidates.map(c=>[c.id,c]));
 assert.equal(byId.horse.advantage,.82);
 assert.equal(byId.spear.advantage,1.22);
 assert.equal(choice.target.id,'spear');
});
test("B1: Stage25-28 frozen late R03 never receive a new target path",()=>{
 const b=scene(28);b.r03Encounter={id:'late'};const baseline=b.p[0];
 const old=JSON.stringify(b);
 const picked=native.pickTarget({battle:b,attacker:b.e[0],mode:'front',
  baseline,opponents:b.p});
 assert.equal(picked.target,baseline);
 assert.equal(picked.source,'NATIVE_R03_LATE_CAMPAIGN_PRESERVED');
 assert.equal(JSON.stringify(b),old);
});
test("B1: 28/8/25 remains unchanged, no new damage/morale/reward owner",()=>{
 const x=native.coverage();
 assert.equal(x.stages,28);assert.equal(x.bosses.length,8);
 assert.equal(x.projectTroops,25);
 assert.equal(x.classicB1.moraleSkillThreshold,100);
 assert.equal(x.extraMoraleGrants,0);assert.equal(x.extraRewardWrites,0);
 assert.equal(x.classicB1.noAdditionalMoraleOrHit,true);
});
