"use strict";
const assert=require("node:assert/strict");
const combat=require("../../../data/ngoalong/modules/troops/troop_combat_v2.js").create(
 require("../../../data/ngoalong/modules/troops/project_playable_v1.json"),
 require("../../../data/ngoalong/modules/troops/evolution_contract_v1.json"));
const units=require("../../../data/ngoalong/modules/troops/project_playable_v1.json").units;
let n=0;const test=(label,fn)=>{fn();console.log("PASS "+(++n)+" "+label);};
test("25 executable ORIGINAL/SIMULATED identities",()=>assert.equal(combat.projectTroopCount,25));
test("no Wiki unit playable",()=>assert.throws(()=>combat.createBattle({A:[{id:"x",troopId:"nlwm-infantry-t1-thuan-binh",slot:0}],B:[{id:"y",troopId:"spear",slot:0}]},1)));
test("reject slot conflicts, 6 members and broken input",()=>{
 assert.throws(()=>combat.createBattle({A:[{id:"a",slot:0,troopId:"infantry"},{id:"b",slot:0,troopId:"archer"}],B:[{id:"e",slot:0,troopId:"spear"}]},1));
 assert.throws(()=>combat.createBattle({A:Array.from({length:6},(_,i)=>({id:"a"+i,slot:i,troopId:"infantry"})),B:[{id:"e",slot:0,troopId:"spear"}]},1));
});
test("seed, replay and caller state immutable",()=>{
 const b=combat.createBattle({A:[{id:"a",slot:0,troopId:"infantry"}],B:[{id:"b",slot:0,troopId:"spear"}]},5);
 assert.deepEqual(combat.stepBattle(b),combat.stepBattle(b));assert.equal(b.events.length,0);
 assert.equal(combat.familyMultiplier("infantry","spear"),1.22);assert.equal(combat.familyMultiplier("spear","infantry"),0.82);
});
test("all 25 ability handlers trigger, including defense reactions",()=>{
 for(const x of units){
  const k=x.legacyId,passive=["bulwark","spearwall"].includes(k),cavalry=["spear","spearwall","phalanx"].includes(k);
  const a=[{id:"hero",troopId:k,slot:passive?1:0},{id:"ally",troopId:"infantry",slot:passive?0:1,hp:500}];
  const b=[{id:"foe",troopId:cavalry?"cavalry":"infantry",slot:0,guard:200},{id:"foe2",troopId:"support",slot:1}];
  let s=combat.createBattle({A:a,B:b},5),triggered=false;
  for(let i=0;i<15&&!s.finished;i++){
    const r=combat.stepBattle(s);s=r.state;
    if(r.events.some(e=>e.type==="trait-proc"&&e.actorId==="hero"&&e.mechanic===x.combatBehavior.mechanic))triggered=true;
  }
  assert.ok(triggered,k+" has no executable ability");
 }
});
test("upgrade spends exactly once; rejects insufficient funds",()=>{
 const b=combat.createRosterState({resources:{silver:9000,grain:9000,iron:9000},barracksLevel:2,units:[{id:"h",troopId:"infantry",tier:1}]});
 const a=combat.evolveRoster(b,"r1","h","bulwark");assert.ok(a.applied&&a.state.units[0].troopId==="nlp-bulwark");
 const twice=combat.evolveRoster(a.state,"r1","h","bulwark");assert.ok(twice.idempotent);assert.deepEqual(twice.state.resources,a.state.resources);
 assert.equal(combat.trainTier(a.state,"r2","h").state.units[0].tier,2);assert.equal(b.units[0].troopId,"infantry");
 const poor=combat.createRosterState({resources:{silver:0,grain:0,iron:0},barracksLevel:2,units:[{id:"h",troopId:"infantry",tier:1}]});
 assert.throws(()=>combat.evolveRoster(poor,"r2","h","bulwark"));
});
test("complete simulated battle, no settlement/Save edits",()=>{
 const b=combat.createBattle({A:[{id:"a",troopId:"rain-volley",slot:0}],B:[{id:"b",troopId:"infantry",slot:0}]},7);
 const end=combat.runBattle(b);assert.equal(end.finished,true);assert.equal(end.settlement,null);assert.equal(b.finished,false);
});

test("rear targeting, row splash and two-hit damage execution",()=>{
 const a=combat.createBattle({A:[{id:"hero",troopId:"archer",slot:0}],B:[{id:"front",troopId:"infantry",slot:0},{id:"rear",troopId:"infantry",slot:8}]},1);
 assert.equal(combat.chooseTarget(a,a.units[0]).id,"rear");
 const row=combat.createBattle({A:[{id:"hero",troopId:"rain-volley",slot:0}],B:[{id:"front",troopId:"infantry",slot:0},{id:"next",troopId:"infantry",slot:1}]},1);
 assert.ok(combat.stepBattle(row).events.filter(x=>x.type==="damage").length>=2);
 const double=combat.createBattle({A:[{id:"hero",troopId:"volley",slot:0}],B:[{id:"foe",troopId:"infantry",slot:0}]},1);
 assert.equal(combat.stepBattle(double).events.filter(x=>x.type==="damage"&&x.actorId==="hero").length,2);
});
test("morale, healing, burn and guard produce actual state changes",()=>{
 const m=combat.createBattle({A:[{id:"hero",troopId:"rally",slot:0},{id:"ally",troopId:"infantry",slot:1}],B:[{id:"foe",troopId:"infantry",slot:0}]},1);
 assert.equal(combat.stepBattle(m).state.units.find(x=>x.id==="ally").morale,62);
 const h=combat.createBattle({A:[{id:"hero",troopId:"medic",slot:0},{id:"ally",troopId:"infantry",slot:1,hp:200}],B:[{id:"foe",troopId:"infantry",slot:0}]},1);
 assert.ok(combat.stepBattle(h).state.units.find(x=>x.id==="ally").hp>200);
 const w=combat.createBattle({A:[{id:"hero",troopId:"ward-bearer",slot:0}],B:[{id:"foe",troopId:"infantry",slot:0}]},1);
 assert.ok(combat.stepBattle(w).state.units.find(x=>x.id==="hero").guard>0);
 const burn=combat.createBattle({A:[{id:"hero",troopId:"ember",slot:0}],B:[{id:"foe",troopId:"infantry",slot:0}]},1);
 assert.ok(combat.stepBattle(burn).events.some(x=>x.statusId==="troop-original-burn"));
});
test("receipt ID reuse for a different operation is rejected",()=>{
 const s=combat.createRosterState({barracksLevel:2,resources:{silver:5000,grain:5000,iron:5000},units:[{id:"h",troopId:"infantry",tier:1}]});
 const after=combat.evolveRoster(s,"x1","h","bulwark").state;
 assert.throws(()=>combat.evolveRoster(after,"x1","h","crusher"));
 assert.throws(()=>combat.trainTier(after,"x1","h"));
});

console.log("NL TROOP EXECUTABLE "+n+"/"+n+" PASS");
