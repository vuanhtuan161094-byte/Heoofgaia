/* HG40 deterministic tactical core focused tests. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx=vm.createContext({console});
const files=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js',
 'hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js',
 'hg20-world-bosses.js','hg21-tower-tactical.js',
 'hg24-private-automation.js','hg26-boss-autohunt.js','hg261-joint-boss.js',
 'hg27-farm-exchange.js','hg29-loot.js','hg30-troop-ascension.js',
 'hg31-legendary-gear.js','hg40-tactical.js'];
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
let cases=0;
function test(name,fn){fn();cases++;console.log('PASS '+name);}
const npctile=E.NPC_CAMPS_2009.find(x=>x.level===1)||E.NPC_CAMPS_2009[0];
function scenario(race,tier,oldBattle=false){
 const s=E.make(race,1000000),u=C.units[race][tier-1];
 s.army[u.id]=12;
 const ally={id:'p0',unitId:u.id,name:u.name,side:'player',hp:u.hp,atk:u.atk,def:u.def,spd:u.spd,
  range:E.unitTacticalRange(u),count:12,initial:12,pool:u.hp*12,slot:0,x:1,y:4};
 const enemy=(id,x,y)=>({id,unitId:null,name:'Durable enemy',side:'enemy',hp:100000,atk:0,def:30,spd:1,
  range:1,count:1000,initial:1000,pool:100000000,x,y});
 const b={target:npctile.key,kind:'npc',level:1,name:'Focused test',turn:1,order:'attack',orders:{},
  focused:null,selected:'p0',autoUntil:1000000,allies:[ally],enemies:[enemy('e0',2,4),enemy('e1',3,4)],
  woundedByUnit:{},history:[],moveTargets:{}};
 if(!oldBattle)E.hg40PrepareBattle(s,b);
 s.battle=b;return {s,b,u};
}
test('40 catalog troop IDs have unique deterministic role traits',()=>{
 assert.equal(Object.keys(E.HG40_TRAITS).length,40);
 for(const [race,list] of Object.entries(C.units))for(const u of list){
  const t=E.HG40_TRAITS[u.id];assert(t&&t.unitId===u.id, u.id);
  assert(['T','C','X','H'].includes(t.role),u.id);assert(t.name.length>=3);
 }
});
for(const race of ['human','elf','orc','undead']){
 test(race+' 10 combat unit profiles execute through shared core',()=>{
  for(let tier=1;tier<=10;tier++){
   const {s,b,u}=scenario(race,tier),stock=s.army[u.id];
   for(let i=0;i<4;i++){
    const result=E.battleActCore(s,'attack',{stableTargets:true});
    assert.equal(result.type,'continue',u.id);
    assert.equal(s.army[u.id],stock,'No phantom troops: '+u.id);
    assert(b.lastEvents.every(x=>Number.isFinite(x.damage)&&x.damage>=0),u.id);
   }
   assert.equal(b.hg40.v,1);assert.equal(b.turn,5);
  }
 });
}
test('a legacy midbattle save is not upgraded to HG40 in-place',()=>{
 const {s,b}=scenario('human',1,true);
 assert.equal(b.hg40,undefined);
 E.battleActCore(s,'attack');
 assert.equal(b.hg40,undefined);
});
test('two DoT ticks cannot be repeated on the same resolved combat turn',()=>{
 const {s,b}=scenario('orc',4);
 E.battleActCore(s,'attack');
 assert.equal(b.hg40.statuses.filter(x=>x.kind==='dot').length,1);
 assert.equal(b.hg40.statuses.find(x=>x.kind==='dot').ticks,2);
 E.battleActCore(s,'attack');
 assert.equal(b.hg40.statuses.find(x=>x.kind==='dot').ticks,1);
 E.battleActCore(s,'attack');
 assert(!b.hg40.statuses.some(x=>x.kind==='dot'));
});
test('Boss cannot be hard-stunned by Ogre, receives soft damage penalty',()=>{
 const {s,b}=scenario('orc',5);
 const boss=E.TILES.find(x=>x.privateBoss);assert(boss);
 b.target=boss.key;E.battleActCore(s,'attack');
 assert(b.hg40.statuses.some(x=>x.kind==='damageDown'));
 assert(!b.hg40.statuses.some(x=>x.kind==='stun'));
});
test('enemy strength factor is applied once to a new tactical battle',()=>{
 const s=E.make('human',1000000);
 const tile=E.NPC_CAMPS_2009.find(x=>x.level>=4);
 if(!tile)return;
 const b=E.makeBattle(s,tile.key),h=b.enemies[0].hp;
 assert.equal(b.hg40?.v,1);E.hg40PrepareBattle(s,b);
 assert.equal(b.enemies[0].hp,h);
});
test('canonical world expedition can save/reload v07 during HG40 battle',()=>{
 const s=E.make('human',1000000);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:10}]);
 const target=E.NPC_CAMPS_2009.find(x=>E.pathfind('3,4',x.key));assert(target);
 E.startMarch(s,target.key);
 E.tick(s,1000000+3600000);
 assert.equal(s.battle?.hg40?.v,1);
 assert(E.strictSave(s));
 const loaded=E.parseSave(E.serializeSave(s));
 assert.equal(loaded.version,7);assert.equal(loaded.battle.hg40.v,1);
});
console.log('HG40 focused '+cases+'/'+cases+' PASS');
