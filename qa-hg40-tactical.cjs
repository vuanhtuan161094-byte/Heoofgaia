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
test('400 distinct unit/target/defense situations preserve tactical receipts and troop conservation',()=>{
 let scenarios=0;
 for(const race of ['human','elf','orc','undead'])for(let tier=1;tier<=10;tier++){
  for(let variant=0;variant<10;variant++){
   const {s,b,u}=scenario(race,tier),count=variant+2;
   b.allies[0].count=count;b.allies[0].initial=count;
   b.allies[0].pool=count*b.allies[0].hp;s.army[u.id]=count;
   b.enemies[0].def=variant*15;b.enemies[0].x=2+variant%3;
   b.enemies[1].x=5+variant%2;
   for(let i=0;i<3;i++){
    const result=E.battleActCore(s,'attack',{stableTargets:true});
    assert.equal(result.type,'continue',u.id+' v'+variant);
    const events=b.lastEvents,ids=new Set([...b.allies,...b.enemies].map(x=>x.id));
    assert(events.length<=ids.size,'one canonical event per actor');
    assert.equal(new Set(events.map(x=>x.actorId)).size,events.length);
    assert(events.every(x=>['attack','advance','defend','focus','retreat','move'].includes(x.order)));
    assert.equal(s.army[u.id],count,'skill may not mint troops');
    assert(b.hg40.statuses.every(x=>x.kind!=='dot'||(Number.isSafeInteger(x.ticks)&&x.ticks>=1&&x.ticks<=2)));
   }
   scenarios++;
  }
 }
 assert.equal(scenarios,400);
 console.log('HG40 real turn matrix 400/400 scenarios PASS');
});

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

test('HG40 shield expires after two subsequent resolved rounds',()=>{
 const {s,b}=scenario('human',8);
 E.battleActCore(s,'attack',{stableTargets:true});
 const shield=b.hg40.shields.p0;
 assert(shield?.amount>0,'Priest must create a real shield');
 assert.equal(shield.until,3,'starts at turn 1, active until turn 3');
 E.battleActCore(s,'attack',{stableTargets:true});
 assert(b.hg40.shields.p0?.amount>0,'shield remains on subsequent turn');
 E.battleActCore(s,'attack',{stableTargets:true});
 assert.equal(b.hg40.shields.p0,undefined,'shield must expire, not be permanent');
});
test('HG40 stun hits exactly the next action, not both current and next',()=>{
 const {s,b}=scenario('orc',5);
 b.enemies[0].atk=5;b.enemies[1].atk=0;
 E.battleActCore(s,'attack',{stableTargets:true});
 assert.equal(b.lastEvents.find(x=>x.actorId==='e0')?.order,'attack',
  'low-SPD target still acts in placement round');
 E.battleActCore(s,'attack',{stableTargets:true});
 assert.equal(b.lastEvents.find(x=>x.actorId==='e0')?.order,'defend',
  'target skips the next action exactly once');
 E.battleActCore(s,'attack',{stableTargets:true});
 assert.equal(b.lastEvents.find(x=>x.actorId==='e0')?.order,'attack',
  'target regains agency after one blocked action');
});
test('HG40 shield owner isolation in 3x2 roster',()=>{
 const {s,b}=scenario('human',10);
 const outsider={...b.allies[0],id:'p1',heroId:2,x:1,y:5};
 b.allies[0].heroId=1;b.allies.push(outsider);
 E.hg40AfterHit(s,b,b.allies[0],b.enemies[0],
  {applied:100,casualties:0},{path:[]},()=>({applied:0,casualties:0}));
 assert(b.hg40.shields.p0?.amount>0,'original owner protected');
 assert.equal(b.hg40.shields.p1,undefined,'second hero must not receive first hero shield');
});
test('HG40 shared DEF-penetration ceiling is 25% or Boss 15%',()=>{
 const {s,b}=scenario('orc',10);
 const target=b.enemies[0],actor=b.allies[0];
 b.hg40.hits.p0=2; b.enemies[0].def=200;
 b.hg40.statuses.push({target:target.id,kind:'defdown',value:.18,source:'1',until:9});
 const normal=E.hg40PlanStrike(s,b,actor,target,{path:[]});
 const combined=1-(1-normal.defPenalty)*(1-normal.pierce);
 assert(combined>.25,'exercises former stacking overflow');
 assert.equal(normal.defCap,.25);
 const privateBoss=E.TILES.find(x=>x.privateBoss);assert(privateBoss);
 b.target=privateBoss.key;
 const againstBoss=E.hg40PlanStrike(s,b,actor,target,{path:[]});
 assert.equal(againstBoss.defCap,.15);
});
test('HG40 skill presentation labels passives and localized statuses',()=>{
 const {s,b}=scenario('human',1);
 assert(E.hg40SkillText(b,b.allies[0]).includes('Nội tại'));
 b.hg40.statuses.push({target:'p0',kind:'slow',value:1,source:'enemy',
  starts:2,until:3});
 assert(!E.hg40StatusText(b,b.allies[0]).includes('Chậm'),'not yet applied');
 b.turn=2;
 assert(E.hg40StatusText(b,b.allies[0]).includes('Chậm'),'localized next-turn status');
});
test('HG40 splash applies exactly one independent casualty receipt',()=>{
 const {s,b}=scenario('orc',7);
 b.enemies[1].hp=100;b.enemies[1].count=2;b.enemies[1].initial=2;
 b.enemies[1].pool=200;
 E.battleActCore(s,'attack',{stableTargets:true});
 const splash=b.hg40.events.filter(x=>x.order==='skill');
 assert.equal(splash.length,1);
 assert(splash[0].damage>0);
 assert(splash[0].casualties>=0);
 assert.equal(splash[0].damage,200-b.enemies[1].pool);
});

console.log('HG40 focused '+cases+'/'+cases+' PASS');
