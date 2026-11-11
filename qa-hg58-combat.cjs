/* HG58 focused code acceptance: real HP receipts, owner-bound Tower
 * damage, unknown-NPC hex motion, actual skill MP and strict Save v07.
 * Synthetic HP/no-ATK enemies prolong the canonical battle for QA only.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console});
const sources='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js painter.js'.split(' ');
for(const file of sources)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,P=ctx.HOG_PAINTER;let passed=0;const checks=[];
function check(name,run){try{const value=run()||{};passed++;checks.push({name,pass:true,value});console.log('HG58 PASS '+name+' '+JSON.stringify(value))}
 catch(e){checks.push({name,pass:false,error:e.stack||String(e)});console.error('HG58 FAIL '+name+' '+(e.stack||e));process.exitCode=1}}
function fakeActor(id,side,x,y,pool=100){return {id,side,unitId:null,name:'NPC not in atlas',hp:100,
 atk:10,def:10,count:1,initial:1,pool,range:1,spd:4,x,y}}
check('Unillustrated Tower monster moves smoothly on true hex route, not teleport',()=>{
 const enemy=fakeActor('e0','enemy',9,4),ally=fakeActor('p0','player',1,4);
 const event={actorId:'e0',from:{x:10,y:4},to:{x:9,y:4},path:[{x:9,y:4}],
  targetId:null,damage:0,death:false,order:'attack'};
 const b={turn:2,allies:[ally],enemies:[enemy],lastEvents:[event]};
 P.battleTimelinePrime(b,1000,true);
 const step=P.battleVisualSchedule([event]).steps[0],now=1000+step.moveMs*.37,
  visual=P.battleVisualState(b,enemy,now,now);
 assert(visual&&visual.action==='walk'&&visual.x<10&&visual.x>9,JSON.stringify(visual));
 assert.equal(P.animatedUnitId(null,enemy.name),false);
 const cam={center:(x,y)=>({x:x*33,y:y*21})},point=P.battleVisualPoint(cam,visual,enemy);
 assert(point.x>9*33&&point.x<10*33);
 return {movementMs:step.moveMs,interpX:visual.x,renderX:point.x};
});
check('Per-hit target HP is reconstructed before and after actual impact',()=>{
 const enemy=fakeActor('e0','enemy',8,3,65),ally=fakeActor('p0','player',4,3);
 const event={actorId:'p0',from:{x:4,y:3},to:{x:4,y:3},path:[],
  targetId:'e0',targetAt:{x:8,y:3},poolBefore:100,poolAfter:65,shieldAbsorbed:0,
  damage:35,death:false,order:'attack',casualties:0};
 const b={turn:2,allies:[ally],enemies:[enemy],lastEvents:[event]};
 P.battleTimelinePrime(b,1000,true);
 const impact=1000+P.battleVisualSchedule([event]).steps[0].impactAt,
  before=P.battleVisualPool(b,enemy,impact-1),after=P.battleVisualPool(b,enemy,impact+1);
 assert.equal(before,100);assert.equal(after,65);
 assert.equal(P.battleVisualState(b,enemy,impact-1,impact-1).pool,100);
 return {before,after,actualAuthoritativePool:enemy.pool};
});
check('Zero-HP-loss shield absorption is explicitly labeled by real VFX receipt',()=>{
 const enemy=fakeActor('e0','enemy',8,3,100),ally=fakeActor('p0','player',4,3);
 const event={actorId:'p0',from:{x:4,y:3},to:{x:4,y:3},path:[],
  targetId:'e0',targetAt:{x:8,y:3},poolBefore:100,poolAfter:100,
  shieldAbsorbed:45,damage:0,death:false,order:'attack',casualties:0};
 const b={turn:2,allies:[ally],enemies:[enemy],lastEvents:[event]};
 P.battleTimelinePrime(b,1000,true);
 const impact=1000+P.battleVisualSchedule([event]).steps[0].impactAt;
 const camera={radius:21,center:(x,y)=>({x:20*x,y:20*y})},
  layout=[ally,enemy].map(u=>({id:u.id,u,x:u.x*20,y:u.y*20,
   baseX:u.x*20,baseY:u.y*20,size:32}));
 const effects=P.battleFxPlan(b,camera,impact+5,layout);
 assert.equal(effects.length,1);assert.equal(effects[0].damage,0);
 assert.equal(effects[0].absorbed,45);
 return {effects:effects.length,absorbed:effects[0].absorbed};
});
check('Three real owners in six Tower stacks all deal positive actual HP damage',()=>{
 const s=E.make('human',1e6),base=JSON.parse(JSON.stringify(s.heroes[0]));
 for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'HG58 commander '+id});
 s.army.human_1=24;
 for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[
  {unitId:'human_1',count:4},{unitId:'human_1',count:4}]);
 E.hg20ChooseTowerTeam(s,[1,2,3]);
 E.hg21SetTowerPicks(s,[1,2,3].map(heroId=>({heroId,slots:[0,1]})));
 E.hg21TowerEnter(s);const b=s.battle;
 assert.deepEqual(Array.from(b.allies,u=>u.heroId),[1,1,2,2,3,3]);
 for(const u of b.enemies){u.hp=100000;u.pool=u.hp*u.count;u.atk=0;u.def=0;}
 assert(E.strictSave(s));
 const totals=new Map([[1,0],[2,0],[3,0]]);let rounds=0,receipts=0;
 for(;rounds<17&&s.battle;rounds++){
  E.battleAct(s,'attack');assert(E.strictSave(s));
  for(const e of b.lastEvents||[]){
   const owner=b.allies.find(u=>u.id===e.actorId)?.heroId;
   if(owner&&e.damage>0){
    assert(e.poolBefore>e.poolAfter,'dealt damage must reduce actual target HP');
    assert(e.targetAt&&Number.isSafeInteger(e.targetAt.x));
    totals.set(owner,totals.get(owner)+e.damage);receipts++;
   }
  }
  if([...totals.values()].every(x=>x>0))break;
 }
 assert([...totals.values()].every(x=>x>0),'owners missing actual damage: '+JSON.stringify([...totals]));
 assert.equal(s.army.human_1,24,'Tower projection must preserve real army');
 const cold=E.parseSave(E.serializeSave(s));assert(E.strictSave(cold));
 return {rounds:rounds+1,realHPDamageByHero:Object.fromEntries(totals),receipts,
  SaveVersion:cold.version,realGarrison:s.army.human_1};
});
check('Real 40-unit special MP starts full, spends 100, restores 25 each actor turn',()=>{
 const s=E.make('human',1e6),actor=fakeActor('p0','player',1,4),
  target=fakeActor('e0','enemy',2,4);
 actor.unitId='human_2';actor.name='Human Scout';
 const b={turn:1,kind:'tower',target:E.TILES.find(x=>x.kind==='npc').key,
  allies:[actor],enemies:[target],history:[]};
 E.hg40PrepareBattle(s,b);
 assert.equal(E.hg40SkillReadiness(b,actor).mp,100);
 E.hg40BeforeAction(s,b,actor);
 E.hg40AfterHit(s,b,actor,target,{applied:20,casualties:0},{path:[]},
   ()=>({applied:0,casualties:0}));
 const cast=E.hg40SkillReadiness(b,actor);
 assert.equal(cast.mp,0);
 assert(b.hg40.lastSkills.some(x=>x.actorId==='p0'&&x.skill==='Dò điểm yếu'));
 b.turn=2;E.hg40BeforeAction(s,b,actor);
 assert.equal(E.hg40SkillReadiness(b,actor).mp,25);
 return {initial:100,afterCast:0,afterNextTurn:25,
   skill:b.hg40.lastSkills[0].skill,sourceActor:b.hg40.lastSkills[0].actorId};
});
const receipt={suite:'HG58 movement, 3x2 true HP, MP and truthful shield VFX',
 passed,total:checks.length,checks};
fs.mkdirSync(path.join(__dirname,'docs/qa/hg58'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg58/engine.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('HG58 ENGINE '+passed+'/'+checks.length);if(passed!==checks.length)process.exitCode=1;
