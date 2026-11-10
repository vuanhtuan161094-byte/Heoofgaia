/* HG50-C real Win/Save v07 regression. The only reward authority is legacy Boss PvE.
 * Fixture may allocate strong real units, never injects a victory or loot.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js'.split(' ');
const ctx=vm.createContext({console});for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,out=[];
function check(label,fn){
 try{let details=fn()||{};out.push({label,pass:true,details});console.log('HG50-C REPLAY PASS '+label+' '+JSON.stringify(details));}
 catch(e){out.push({label,pass:false,error:String(e.stack||e)});process.exitCode=1;console.error('HG50-C REPLAY FAIL '+label+' '+String(e.stack||e));}
}
const game=()=>E.make('human',1000000);
function reload(s){assert(E.strictSave(s));const o=E.parseSave(E.serializeSave(s));assert(E.strictSave(o));return o;}
function bossWin(tier,prior=[]){
 let s=game();s.hg50.completed=prior.slice();s.hg50.unlocked=prior.length+1;
 const h=s.heroes[0];h.level=100;h.atk=tier===11?240000:400000;h.def=h.atk;h.spd=tier===11?100:120;
 const count=tier===11?500:800;s.army.human_10=count;s.ap=900;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count}]);
 const stage=E.hg50Status(s).stages.find(q=>q.tier===tier);assert(stage);
 const before=JSON.stringify(s.hg50c);
 E.startMarch(s,stage.target);
 let ticks=0;while(s.march&&ticks++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle&&s.battle.target===stage.target,'real Boss encounter not open');
 let result,turns=0;while(s.battle&&turns++<110)result=E.battleAct(s,'attack');
 assert.equal(result?.type,'win');assert(E.strictSave(s));return {s,result,turns,before,stage};
}
check('four races initialize valid read-only daily and weekly replay ledger',()=>{
 for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,1000000),before=JSON.stringify(s),q=E.hg50ReplayStatus(s);
  assert.equal(q.v,1);assert.equal(q.today.length,0);assert.equal(q.thisWeek.length,0);
  assert.equal(q.economicBonus,0);assert.equal(q.total[11],0);
  E.hg50Status(s);E.hg50ReplayStatus(s);
  assert.equal(JSON.stringify(s),before,'Status read must not mutate Save');
  assert(E.strictSave(s));reload(s);
 }
 return {races:4,rewardPolicy:'existing-only',readOnly:true};
});
for(const [tier,prior] of [[11,[]],[12,[11]],[13,[11,12]]])
check('one authentic route T'+tier+' win writes one daily/weekly mark and ONE legacy HG409 reward',()=>{
 let {s,result,turns,stage}=bossWin(tier,prior);
 assert.equal(result.hg50Stage,tier);
 const replay=E.hg50ReplayStatus(s);
 assert.equal(replay.today.join(','),String(tier));
 assert.equal(replay.thisWeek.join(','),String(tier));
 assert.equal(replay.total[tier],1);
 assert.equal(s.hg409.rewards.length,1);
 assert.equal(s.hg409.rewards[0].target,stage.target);
 assert.equal(replay.economicBonus,0);
 s=reload(s);assert.equal(E.hg50ReplayStatus(s).total[tier],1);
 assert.equal(s.hg409.rewards.length,1);
 return {target:stage.target,turns,replayDay:replay.day,week:replay.week,oldBossReceipt:1,newEconomicBonus:0};
});
check('real completed-route T11 replay earns regular Boss reward once but NO second HG50 route unlock',()=>{
 let {s,result,stage}=bossWin(11,[11,12,13]);
 assert.equal(result.hg50Stage,undefined);
 assert.equal(s.hg50.unlocked,4);assert.equal(s.hg50.completed.join(','),'11,12,13');
 assert.equal(s.hg409.rewards.length,1);
 assert.equal(s.hg50c.today.length,1);assert.equal(s.hg50c.total[11],1);
 assert.equal(E.hg50Status(s).replay.economicBonus,0);
 const before=JSON.stringify(s.hg50c),receipts=s.hg409.rewards.length;
 assert.throws(()=>E.battleAct(s,'attack'),'cannot settle same battle twice');
 assert.equal(JSON.stringify(s.hg50c),before);
 assert.equal(s.hg409.rewards.length,receipts);
 s=reload(s);assert.equal(s.hg50c.total[11],1);
 return {target:stage.target,completedStages:3,questSecondPayout:0,replayTotals:1};
});
check('outside canonical target pays original Boss but never writes HG50-C replay marks',()=>{
 const s=game(),other=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11&&t.key!=='18,92');
 assert(other);
 const h=s.heroes[0];h.level=100;h.atk=240000;h.def=240000;h.spd=100;
 s.army.human_10=500;s.ap=900;E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);
 E.startMarch(s,other.key);let ticks=0;
 while(s.march&&ticks++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);
 let result,n=0;while(s.battle&&n++<110)result=E.battleAct(s,'attack');
 assert.equal(result?.type,'win');assert.equal(result.hg50Stage,undefined);
 assert.equal(s.hg50.completed.length,0);assert.equal(s.hg50c.today.length,0);
 assert.equal(s.hg409.rewards.length,1);assert(E.strictSave(s));
 return {target:other.key,normalBossReward:1,routeWins:0,replayWins:0};
});
check('UTC daily reset is projected without mutable UI; previous week remains until Monday',()=>{
 let {s}=bossWin(11);
 const oldDay=s.hg50c.day,oldWeek=s.hg50c.week,previous=JSON.stringify(s.hg50c);
 s.lastTick+=86400000;
 const x=E.hg50ReplayStatus(s);
 assert.notEqual(x.day,oldDay);assert.equal(x.today.length,0);
 assert.equal(x.week,oldWeek);assert.equal(x.thisWeek.length,1);
 assert.equal(JSON.stringify(s.hg50c),previous,'Read-only UTC rollover must not touch stored ledger');
 s=reload(s);assert.equal(E.hg50ReplayStatus(s).today.length,0);
 s.lastTick+=7*86400000;const y=E.hg50ReplayStatus(s);
 assert.equal(y.thisWeek.length,0);assert.equal(y.today.length,0);
 return {initialDay:oldDay,nextDay:x.day,nextWeek:y.week,readOnly:true};
});
check('historical v07 migrates without retroactive replay wins',()=>{
 const s=game(),raw=JSON.parse(E.serializeSave(s));delete raw.state.hg50c;
 const next=E.parseSave(JSON.stringify(raw));
 assert.equal(next.hg50c.v,1);assert.equal(next.hg50c.today.length,0);
 assert.equal(next.hg50c.total[11],0);assert(E.strictSave(next));
 return {save:next.version,retroactive:false};
});
check('forged timestamps, noncanonical tiers, negative counts are rejected, without changing valid Save',()=>{
 let s=game();let violations=[
  q=>q.today=[13,13],q=>q.thisWeek=[14],
  q=>q.total[11]=-1,q=>q.total[12]=100000001,
  q=>q.extraGold=1,q=>q.day='yesterday'];
 for(const mutate of violations){
  const x=E.clone(s);mutate(x.hg50c);assert.equal(E.strictSave(x),false);
 }
 assert(E.strictSave(s));assert.equal(s.hg50c.today.length,0);
 return {invalidRejected:violations.length};
});
const report={gate:'HG50-C no-extra-payout real Boss replay strict Save v07',passed:out.filter(x=>x.pass).length,total:out.length,results:out};
const file=path.join(__dirname,'docs/qa/hg50/replay-engine.json');
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log('HG50-C REPLAY SUMMARY '+report.passed+'/'+report.total);
if(report.passed!==report.total)process.exitCode=1;
