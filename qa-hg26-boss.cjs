/* HG26 focused acceptance. Real AP, real tactical rounds, actual return and
 * paid recovery. Strong heroes, losses and Arena upgrades are marked fixtures.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js',
 'hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js',
 'hg21-tower-tactical.js','hg24-private-automation.js','hg26-boss-autohunt.js'];
function runtime(items=files){const ctx=vm.createContext({console});
 for(const name of items)vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name});
 return ctx.HOG_ENGINE;}
const E=runtime(),details=[];let passed=0;
function check(name,fn){try{const receipt=fn()||{};passed++;details.push({name,pass:true,receipt});console.log('HG26 PASS '+name+' '+JSON.stringify(receipt))}
 catch(e){details.push({name,pass:false,error:String(e.stack||e)});console.error('HG26 FAIL '+name+' '+(e.stack||e));process.exitCode=1}}
function save(s){assert(E.strictSave(s),'save not strict');return E.parseSave(E.serializeSave(s))}
const boss=s=>E.hg24RecommendBoss(s).filter(x=>!x.privateBoss).sort((a,b)=>a.stars-b.stars||a.distance-b.distance)[0];
function config(target,extras={}){return {target,heroId:null,maxRuns:2,keepAP:0,minUnits:1,minCoverage:50,
 maxLossPercent:30,autoHeal:true,autoRecruit:false,stopOnLoss:true,...extras}}
function travel(s){
 assert(s.march?.remaining>0,'no genuine travel');
 const elapsed=Math.ceil((s.march.remaining+2)/s.speed*1000);
 E.tick(s,s.lastTick+elapsed);
}
function enter(s){const go=E.hg26Step(s);assert.equal(go.type,'dispatched');travel(s);
 const e=E.hg26Step(s);assert.equal(e.type,'battle_open');
 assert(s.battle?.enemies?.length>0);return go;}
function fight(s,max=70){let out={type:'continue'},i=0;
 while(s.battle&&i<max){out=E.hg26Step(s);i++}
 assert(!s.battle,'combat did not terminate');
 return {out,turns:i};}
for(const race of ['human','elf','orc','undead']){
 check(race+' New Game: default OFF; Save v07 exact migration, no free resources',()=>{
  const s=E.make(race,1000000),before=s.res.gold,b=E.hg26Status(s);
  assert.equal(b.enabled,false);assert.equal(b.runs,0);
  const restored=save(s);
  assert.equal(restored.res.gold,before);assert.equal(restored.version,7);
  assert.equal(E.hg26Step(restored).type,'off');
  return {race,save:restored.version,mode:b.enabled};
 });
}
check('Start, AP charged once, army leaves garrison once, Save/Reload during march',()=>{
 const s=E.make('human',1000000),pick=boss(s),a=s.ap,army=s.army.human_1;
 assert(pick&&pick.key);
 E.hg26Start(s,config(pick.key,{maxRuns:2,minUnits:16,minCoverage:100}));
 assert.equal(E.hg26Status(s).phase,'ready');
 const go=E.hg26Step(s);
 assert.equal(go.type,'dispatched');assert(s.ap<a);assert.equal(s.army.human_1,0);
 assert.equal(s.expedition.army.human_1,army);assert.equal(E.hg26Status(s).runs,0);
 const retained=save(s),charged=s.ap;
 assert.equal(E.hg26Step(retained).type,'travel');
 assert.equal(retained.ap,charged);assert.equal(retained.expedition.army.human_1,army);
 return {apSpent:a-charged,armyDispatched:army,phase:retained.hg26.phase};
});
check('Auto-engage requires real trip; battle incurs real turns and stops after a defeat',()=>{
 const s=E.make('human',1000000),pick=boss(s),before={gold:s.res.gold,loot:s.inventory.length};
 E.hg26Start(s,config(pick.key,{maxRuns:2,minUnits:16}));
 enter(s);
 const through=save(s),{out,turns}=fight(through);
 assert(turns>=1&&turns<=70);assert(['win','lose','timeout'].includes(out.type));
 assert.equal(through.hg26.runs,1);
 assert.equal(through.hg26.wins+through.hg26.losses,1);
 assert.equal(through.hg26.last.outcome,out.type);
 assert(through.hg26.last.reportId,'canonical battle report is required');
 assert(through.hg26.phase==='returning');
 if(out.type!=='win')assert.equal(through.hg26.wins,0);
 // Any actual loot is canonical, not a separate automatic-battle grant.
 assert(E.strictSave(through));
 return {outcome:out.type,turns,report:through.hg26.last.reportId};
});
check('Synthetic powerful commander: genuine tactical win, real reward once and no replay after Save',()=>{
 const s=E.make('human',1000000),target=boss(s);
 s.heroes[0].atk=200000;s.heroes[0].def=200000;s.heroes[0].spd=100; // fixture, not New Game progression
 E.hg26Start(s,config(target.key,{maxRuns:1,autoHeal:false,minUnits:16,maxLossPercent:100}));
 enter(s);
 const beforeWins=s.hg24.bossWins,receipts=s.battleReports.length;
 const {out,turns}=fight(s);
 assert.equal(out.type,'win');
 assert.equal(s.hg26.runs,1);assert.equal(s.hg26.wins,1);
 assert.equal(s.hg24.bossWins,beforeWins+1);
 assert.equal(s.battleReports.length,receipts+1);
 assert.equal(s.hg26.last.reportId,s.battleReports[0].id);
 const returned=save(s);
 const wins=s.hg24.bossWins,reportCount=s.battleReports.length,ap=s.ap;
 assert.equal(E.hg26Step(returned).type,'returning');
 travel(returned);assert(!returned.march&&!returned.expedition,'real trip home should finish');
 assert.equal(E.hg26Step(returned).type,'home');
 assert.equal(E.hg26Step(returned).type,'stopped');
 assert.equal(returned.hg26.enabled,false);
 assert.equal(returned.hg24.bossWins,wins);assert.equal(returned.battleReports.length,reportCount);
 assert.equal(E.hg26Step(returned).type,'off');assert.equal(returned.ap,ap);
 assert(E.strictSave(save(returned)));
 return {winner:true,turns,report:returned.hg26.last.reportId,totalRewards:wins};
});
check('Safety policy blocks dispatch when AP reserve cannot be respected',()=>{
 const s=E.make('human',1000000),target=boss(s),before=s.army.human_1;
 assert.throws(()=>E.hg26Start(s,config(target.key,{keepAP:999})),/AP/);
 assert.equal(s.march,null);assert.equal(s.army.human_1,before);assert.equal(s.hg26.enabled,false);
 return {safety:'AP reserve',troops:before};
});
check('Max casualty stop after return; no second dispatch, no second charge (fixture)',()=>{
 const s=E.make('human',1000000),target=boss(s);
 E.hg26Start(s,config(target.key,{maxRuns:3,maxLossPercent:20,autoHeal:false}));
 s.hg26.phase='recovery';s.hg26.runs=1;s.hg26.wins=1;
 s.hg26.last={outcome:'win',heroId:1,unitsDeparted:16,unitsSurvived:10,lossPercent:38,turns:7};
 const before=s.ap,beforeArmy=s.army.human_1;
 const out=E.hg26Step(s);
 assert.equal(out.type,'stopped');assert(/Tổn thất/.test(s.hg26.reason));
 assert.equal(s.ap,before);assert.equal(s.army.human_1,beforeArmy);
 assert(E.strictSave(s));
 return {loss:38,max:20,dispatchesAfterReturn:0};
});
check('Auto-heal queues real Arena treatment and waits until completion (fixture)',()=>{
 const s=E.make('human',1000000),target=boss(s);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);
 E.hg24SaveTemplate(s,1);
 E.hg26Start(s,config(target.key,{maxRuns:2,maxLossPercent:100,autoHeal:true,autoRecruit:false}));
 s.hg26.phase='recovery';s.hg26.runs=1;s.hg26.wins=1;
 s.hg26.last={outcome:'win',heroId:1,unitsDeparted:16,unitsSurvived:11,lossPercent:31,turns:7};
 s.buildings.arena=1;s.army.human_1=11;s.wounded.human_1=5;
 const before=s.res.gold;
 const step=E.hg26Step(s);assert.equal(step.type,'heal_queued');
 assert(s.arenaQueue?.count===5);assert.equal(s.wounded.human_1,0);
 assert(s.res.gold<before);assert.equal(s.army.human_1,11);
 assert.equal(E.hg26Step(s).type,'healing');
 const reloaded=save(s);const queued=reloaded.arenaQueue;
 E.tick(reloaded,reloaded.lastTick+Math.ceil((queued.remaining+2)/reloaded.speed*1000));
 assert(!reloaded.arenaQueue);assert.equal(reloaded.army.human_1,16);
 const next=E.hg26Step(reloaded);
 assert.equal(next.type,'refilled');assert.equal(reloaded.hg26.phase,'ready');
 assert.equal(E.hg20HeroPlan(reloaded,1)[0].count,16);
 return {healed:5,goldCharged:before-reloaded.res.gold,awaited:true};
});
check('Explicit stop stops bot transitions but does not cancel an active real expedition',()=>{
 const s=E.make('orc',1000000),target=boss(s);
 E.hg26Start(s,config(target.key));const first=E.hg26Step(s);
 assert.equal(first.type,'dispatched');const path=s.march.path.slice();
 E.hg26Stop(s,'Tạm ngừng');
 assert.equal(s.hg26.enabled,false);assert.deepEqual(Array.from(s.march.path),Array.from(path));
 assert(s.expedition?.army.orc_1>0);assert.equal(E.hg26Step(s).type,'off');
 assert(E.strictSave(save(s)));
 return {phase:s.hg26.phase,tripStillExists:true};
});
check('Old HG24 save without hg26 migrates without extra troop, EXP, or gold',()=>{
 const before=runtime(files.slice(0,-1)),legacy=before.make('human',1000000),gold=legacy.res.gold;
 const loaded=E.parseSave(before.serializeSave(legacy));
 assert.equal(loaded.res.gold,gold);assert.equal(loaded.version,7);
 assert.equal(loaded.hg26.enabled,false);assert.equal(loaded.hg26.runs,0);
 assert.equal(loaded.heroes[0].xp,legacy.heroes[0].xp);
 return {version:loaded.version,gold,winCount:loaded.hg26.wins};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg26'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg26/autohunt.json'),JSON.stringify({passed,total:details.length,details},null,2));
console.log('HG26 AUTOHUNT '+passed+'/'+details.length+(passed===details.length?' PASS':' FAIL'));
