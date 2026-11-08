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


test('HG40 Dryad root blocks all next-turn hex movement without throwing',()=>{
 const {s,b}=scenario('elf',6);
 b.enemies[0].x=10;b.enemies[1].x=11;
 b.turn=2;
 b.hg40.statuses.push({target:'p0',kind:'root',value:1,source:'enemy',starts:2,until:2});
 const before={x:b.allies[0].x,y:b.allies[0].y};
 assert.equal(E.battleMovePreview(b,'p0').steps,0,'root blocks all cells');
 assert.equal(E.hg40MoveModifier(b,b.allies[0]),-100);
 const result=E.battleActCore(s,'attack',{stableTargets:true});
 assert.equal(result.type,'continue');
 assert.deepEqual({x:b.allies[0].x,y:b.allies[0].y},before,
  'rooted actor must not move to the target');
});
test('HG40 slow never prevents the mandatory one-hex Boss movement',()=>{
 const {s,b}=scenario('elf',6);
 b.turn=2;
 b.hg40.statuses.push({target:'p0',kind:'slow',value:1,source:'enemy',starts:2,until:2});
 assert.equal(E.battleMovePreview(b,'p0').steps,1,'slow allows at least one cell');
});


test('40/40 independently asserted skill activation and passive contracts',()=>{
 let verified=0;
 const passiveDefense=new Set(['guard','rangedGuard','meleeGuard','firstGuard']);
 const offensive=new Set(['charge','thirdBonus','thirdPierce','judgment',
  'rage','wounded','antiMelee','antiRanged']);
 const application=new Map([
  ['mark','mark'],['slow','slow'],['root','root'],['dash','dash'],
  ['atkdown','atkdown'],['defdown','defdown'],['stun','stun'],
  ['dot','dot'],['killBuff','buff']
 ]);
 for(const race of ['human','elf','orc','undead'])for(let tier=1;tier<=10;tier++){
  const {s,b,u}=scenario(race,tier),actor=b.allies[0],target=b.enemies[0];
  const trait=E.HG40_TRAITS[u.id],kind=trait.kind;
  target.unitId='human_3';target.range=kind==='antiRanged'||kind==='rangedGuard'?9:1;
  let triggered=false;
  if(passiveDefense.has(kind)){
   const incoming=E.hg40PlanStrike(s,b,target,actor,{path:[]});
   triggered=incoming.reduction>=trait.a-1e-9;
  }else if(offensive.has(kind)){
   if(kind==='rage'){actor.count=5;actor.pool=5*actor.hp;}
   if(kind==='wounded')target.pool-=1;
   if(kind==='thirdBonus'||kind==='thirdPierce')b.hg40.hits.p0=2;
   const outgoing=E.hg40PlanStrike(s,b,actor,target,
    {path:kind==='charge'?[{x:2,y:4}]:[]});
   triggered=kind==='thirdPierce'?outgoing.pierce>=trait.a-1e-9:
    outgoing.bonus>= (kind==='judgment'?trait.b:trait.a)-1e-9;
  }else{
   if(kind==='heal'||kind==='lifesteal'){actor.pool=Math.floor(actor.count*actor.hp*.7);}
   if(kind==='cleanse')b.hg40.statuses.push(
    {target:'p0',kind:'slow',value:1,source:'enemy',starts:1,until:4});
   if(kind==='multiShield'){
    b.allies.push({...actor,id:'p1',x:1,y:5,pool:actor.pool});
   }
   const before=actor.pool;
   const hit={applied:500,casualties:kind==='killBuff'?1:0};
   const extra=E.hg40AfterHit(s,b,actor,target,hit,{path:[]},
    (other,amount)=>({applied:amount,casualties:0}));
   if(application.has(kind)){
    triggered=b.hg40.statuses.some(x=>x.kind===application.get(kind)&&
      x.target===(kind==='dash'||kind==='killBuff'?'p0':'e0'));
   }else if(kind==='heal'||kind==='lifesteal')triggered=actor.pool>before;
   else if(kind==='shield'||kind==='multiShield')
    triggered=(b.hg40.shields.p0?.amount||0)>0;
   else if(kind==='cleanse')triggered=!b.hg40.statuses.some(x=>x.kind==='slow'&&x.target==='p0');
   else if(kind==='splash'||kind==='splashSlow')
    triggered=extra>0&&b.hg40.events.some(x=>x.targetId==='e1'&&x.damage>0);
   else throw Error('Missing HG40 independent effect oracle: '+u.id+' '+kind);
   if(kind==='multiShield')triggered=triggered&&(b.hg40.shields.p1?.amount||0)>0;
   if(kind==='splashSlow')triggered=triggered&&b.hg40.statuses.some(x=>x.kind==='slow'&&x.target==='e1');
   if(kind==='dot')triggered=triggered&&b.hg40.statuses.some(x=>x.kind==='dot'&&x.ticks===2);
  }
  assert(triggered,u.id+' '+trait.name+' must demonstrate its distinct effect');
  verified++;
 }
 assert.equal(verified,40);
 console.log('HG40 individual skill oracles 40/40 PASS');
});


test('HG40 mutual DoT wipe cannot grant NPC or Boss victory rewards',()=>{
 for(const mode of ['npc','boss']){
  const {s,b,u}=scenario('orc',4);
  if(mode==='boss'){
   const tile=E.TILES.find(x=>x.privateBoss);assert(tile);
   b.target=tile.key;
  }
  b.enemies=[b.enemies[0]];
  for(const actor of [b.allies[0],b.enemies[0]]){
   actor.hp=10;actor.pool=1;actor.count=1;actor.initial=1;actor.atk=0;
  }
  s.army[u.id]=1;
  const enemy=b.enemies[0],ally=b.allies[0],gold=s.res.gold,fame=s.fame;
  const cleared=s.cleared.slice();
  b.hg40.statuses=[
   {target:ally.id,kind:'dot',value:10,source:'enemy',
    starts:b.turn,until:b.turn,ticks:1,nextTick:b.turn},
   {target:enemy.id,kind:'dot',value:10,source:'player',
    starts:b.turn,until:b.turn,ticks:1,nextTick:b.turn}
  ];
  const outcome=E.battleActCore(s,'attack',{stableTargets:true});
  assert.equal(outcome.type,'lose',mode+' must not reward a mutual wipe');
  assert.equal(s.battle,null,'fight must resolve exactly once');
  assert.equal(s.version,7,'save version must stay stable');
  assert.equal(s.res.gold,gold,'mutual wipe must not mint gold');
  assert.equal(s.fame,fame,'mutual wipe must not mint fame');
  assert.deepEqual(s.cleared,cleared,'mutual wipe must not clear camp');
  assert.equal(s.army[u.id],0,'last soldier casualty is still canonical');
 }
});


test('27/27 logged HG40 reactive skills trigger through actual battleActCore turns',()=>{
 const passive=new Set(['guard','rangedGuard','meleeGuard','firstGuard',
  'thirdBonus','thirdPierce','rage','wounded','antiMelee','antiRanged']);
 let covered=0;
 for(const race of ['human','elf','orc','undead'])for(let tier=1;tier<=10;tier++){
  const {s,b,u}=scenario(race,tier),t=E.HG40_TRAITS[u.id];
  if(passive.has(t.kind))continue;
  const actor=b.allies[0],enemy=b.enemies[0];
  if(t.kind==='heal'||t.kind==='lifesteal')actor.pool=actor.hp*5;
  if(t.kind==='cleanse')b.hg40.statuses.push({target:'p0',
   kind:'slow',value:1,source:'enemy',starts:1,until:4});
  if(t.kind==='multiShield')b.allies.push({...actor,id:'p1',x:1,y:5});
  if(t.kind==='charge'){
   actor.x=0;enemy.x=4;b.enemies[1].x=5;
   enemy.range=9;b.enemies[1].range=9;
  }
  if(t.kind==='killBuff'){
   enemy.hp=10;enemy.count=3;enemy.initial=3;enemy.pool=30;
  }
  let executed=0;
  while(s.battle&&executed<8){
   const result=E.battleActCore(s,'attack',{stableTargets:true});
   executed++;
   assert(['continue','win','lose','timeout'].includes(result.type));
   if(result.type!=='continue')break;
  }
  assert(b.hg40.lastSkills.some(row=>row.skill===t.name),
   u.id+' '+t.name+' has no activation note after '+executed+' actual rounds');
  covered++;
 }
 assert.equal(covered,27,'passive/reactive inventory changed; audit coverage');
});

console.log('HG40 focused '+cases+'/'+cases+' PASS');
