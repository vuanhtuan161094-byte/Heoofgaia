/* HG57: ACTUAL two-phase combat + hex movement + visual receipt scheduler.
 * No invented wins/Save fields. The same real v07 game stack drives all tests.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sources='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js'.split(' ');
const ctx=vm.createContext({console});
for(const file of sources)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
vm.runInContext(fs.readFileSync(path.join(__dirname,'painter.js'),'utf8'),ctx,{filename:'painter.js'});
const E=ctx.HOG_ENGINE,P=ctx.HOG_PAINTER,cases=[];
function check(label,fn){try{const value=fn()||{};cases.push({label,pass:true,value});
 console.log('HG57 PASS '+label+' '+JSON.stringify(value));}
 catch(error){cases.push({label,pass:false,error:String(error.stack||error)});
 console.error('HG57 FAIL '+label+' '+String(error.stack||error));process.exitCode=1;}}
function fresh(){
 let s=E.make('human',1e6);s.army.human_1=16;s.army.human_3=4;s.ap=900;
 // Small real mixed formation within the regular commander cap.
 E.hg20SetHeroPlan(s,s.activeHero,[{unitId:'human_1',count:8},{unitId:'human_3',count:2}]);
 const tile=E.TILES.find(t=>t.kind==='npc'&&t.level===1&&(t.eliteTier||0)<11);
 assert(tile,'No real world NPC found');
 E.startMarch(s,tile.key);let i=0;
 while(s.march&&i++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle,'real battle did not open');assert(E.strictSave(s));
 return s;
}
check('melee speed budgets exactly 1 below SPD7 and 2 at SPD7; ranged 1',()=>{
 const s=fresh(),b=s.battle,u=b.allies.find(x=>x.range===1),r=b.allies.find(x=>x.range>1);
 assert(u&&r);u.spd=6;r.spd=10;
 const slow=E.battleMovePreview(b,u.id).steps;
 u.spd=7;const fast=E.battleMovePreview(b,u.id).steps;
 const archer=E.battleMovePreview(b,r.id).steps;
 assert.equal(slow,1);assert.equal(fast,2);assert.equal(archer,1);
 assert(E.strictSave(s));return {slow,fast,archer,hex:E.battleHex.layout,board:E.BATTLE_GRID};
});
check('real one-round actions ALL player then ALL enemy; Save and rewards remain canonical',()=>{
 const s=fresh(),b=s.battle;const previousRewards=s.hg409.rewards.length,
  previousGold=s.res.gold;
 const out=E.battleAct(s,'attack',{stableTargets:true});
 assert(['continue','win','lose'].includes(out.type),out.type);
 assert.equal(out.order.join(','),b.lastActOrder.join(','));
 const sides=b.lastEvents.map(e=>e.actorId[0]);
 assert(sides.length>=3,'expected at least two players and one enemy action');
 assert(sides.includes('p')&&sides.includes('e'),JSON.stringify(sides));
 const firstE=sides.indexOf('e');
 assert(sides.slice(0,firstE).every(x=>x==='p'));
 assert(sides.slice(firstE).every(x=>x==='e'));
 const moves=b.lastEvents.filter(x=>x.path?.length>0);
 assert(moves.every(e=>e.path.length<=3));
 assert(E.strictSave(s));
 if(out.type==='continue')assert.equal(s.hg409.rewards.length,previousRewards);
 return {type:out.type,sides:sides.join(''),actors:b.lastEvents.length,
   moved:moves.length,rewardReceipts:s.hg409.rewards.length,initialGold:previousGold};
});
check('receipt VFX never overlaps actors or alternating sides, hero UI API available',()=>{
 const events=[
  {actorId:'p0',order:'attack',path:[{x:2,y:2}],damage:7},
  {actorId:'p1',order:'attack',path:[],damage:9},
  {actorId:'e0',order:'attack',path:[{x:8,y:3},{x:7,y:3}],damage:4},
  {actorId:'e1',order:'defend',path:[],damage:0}];
 const p=P.battleVisualSchedule(events);
 assert.equal(p.steps.length,4);
 for(let i=1;i<p.steps.length;i++)
  assert(p.steps[i].start>=p.steps[i-1].animationEnd,'visual actors overlap');
 assert(p.steps[2].start-p.steps[1].animationEnd>=250,'no clear phase separation');
 assert(p.duration>p.steps[3].animationEnd);
 assert.equal(typeof P.battleVisualPhase,'function');
 return {duration:p.duration,steps:p.steps.map(x=>[x.start,x.animationEnd]),
  separation:p.steps[2].start-p.steps[1].animationEnd};
});
check('16-Boss receipts adapt pacing without sharing attack frames',()=>{
 const events=[...Array(6)].map((_,i)=>({actorId:'p'+i,order:'attack',path:[],damage:5}))
  .concat([...Array(16)].map((_,i)=>({actorId:'e'+i,order:'attack',path:[],damage:4})));
 const seq=P.battleVisualSchedule(events);
 assert(seq.duration>=6000&&seq.duration<=13000,'unreasonable dense pacing '+seq.duration);
 for(let i=1;i<seq.steps.length;i++)assert(seq.steps[i].start>=seq.steps[i-1].animationEnd);
 assert(seq.steps[6].start-seq.steps[5].animationEnd>=200);
 return {actors:events.length,durationMs:seq.duration,sideGap:seq.steps[6].start-seq.steps[5].animationEnd};
});
check('preexisting Save v07 keeps strict battle receipts and no extra hero actors',()=>{
 let s=fresh(),b=s.battle,ids=[...b.allies,...b.enemies].map(x=>x.id);
 assert.equal(ids.length,b.allies.length+b.enemies.length);
 assert(b.hg409EnemyCommander?.name);
 s=E.parseSave(E.serializeSave(s));assert(E.strictSave(s));
 assert.equal(s.battle.allies.length,2);
 assert.equal(s.battle.enemies.length,b.enemies.length);
 assert(s.battle.hg409EnemyCommander?.name);
 return {version:s.version,allies:s.battle.allies.length,enemies:s.battle.enemies.length,
  realEnemyCommander:s.battle.hg409EnemyCommander.name};
});
const report={suite:'HG57 two-phase combat, hex move budget and sequential animation',
 passed:cases.filter(x=>x.pass).length,total:cases.length,cases};
const output=path.join(__dirname,'docs/qa/hg57/engine-combat.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('HG57 ENGINE '+report.passed+'/'+report.total);
if(report.passed!==report.total)process.exitCode=1;
