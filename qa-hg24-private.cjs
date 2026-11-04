/* HG24 focused offline acceptance: safe cached templates, real paid queues,
 * Boss hero/route dispatch and repeatable private EXP sources.
 * Synthetic attrition/mines/extra heroes explicitly identified in receipts.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js','hg24-private-automation.js'];
function runtime(names=files){const ctx=vm.createContext({console});for(const f of names)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});return ctx.HOG_ENGINE;}
const E=runtime(),receipts=[];let passed=0;
function check(name,fn){try{const evidence=fn()||{};passed++;receipts.push({name,pass:true,evidence});console.log('HG24 PASS '+name+' '+JSON.stringify(evidence))}
catch(e){process.exitCode=1;receipts.push({name,pass:false,error:e.stack||String(e)});console.error('HG24 FAIL '+name+' '+(e.stack||String(e)))}}
const round=s=>E.parseSave(E.serializeSave(s));
for(const race of ['human','elf','orc','undead']){
 check(race+' private: paid troop template, Save v07 and legacy behavior',()=>{
  const s=E.make(race,1000000),id=race+'_1',value=s.res.gold;
  E.hg20SetHeroPlan(s,1,[{unitId:id,count:12}]);
  const t=E.hg24SaveTemplate(s,1);assert.equal(t.groups[0].count,12);
  assert.equal(E.hg24Status(s).drillsLeft,5);assert.equal(s.version,7);
  assert.equal(s.army[id],16);assert.equal(s.res.gold,value);
  const reloaded=round(s);
  assert.equal(reloaded.hg24.templates['main:1'].groups[0].count,12);
  assert(E.strictSave(reloaded));
  return {race,saved:12,startingArmy:16};
 });
}
check('No duplicate soldier allocation across two hero templates (controlled second-hero fixture)',()=>{
 const s=E.make('human',1000000),h=JSON.parse(JSON.stringify(s.heroes[0]));
 s.heroes.push({...h,id:2,name:'Tướng B'});
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:9}]);E.hg24SaveTemplate(s,1);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:7}]);
 s.army.human_1=15; // fixture: one real unit lost in a preceding world battle
 const r=E.hg24Replenish(s,1);
 assert.equal(r.total,8);assert.equal(E.hg20HeroPlan(s,2)[0].count,7);
 assert.equal(E.hg20HeroPlan(s,1)[0].count,8);
 assert.equal(s.army.human_1,15);
 E.hg24SetAuto(s,1,true,false);
 s.army.human_1=16;E.tick(s,s.lastTick+1000);
 assert.equal(E.hg20HeroPlan(s,1)[0].count,9);
 assert.equal(E.hg20HeroPlan(s,2)[0].count,7);
 assert(E.strictSave(round(s)));
 return {reservedByHero1:9,reservedByHero2:7,army:16};
});
check('Auto-restock queues real paid recruitment only with explicit opt-in',()=>{
 const s=E.make('human',1000000),id='human_1';
 E.recruit(s,id,25);let t=s.training[0];E.tick(s,s.lastTick+(t.remaining+2)*1000/s.speed);
 assert.equal(s.army[id],41);
 E.hg20SetHeroPlan(s,1,[{unitId:id,count:40}]);
 E.hg24SaveTemplate(s,1);E.hg24SetAuto(s,1,true,true);
 // Fixture models a preceding battlefield casualty without faking recruitment.
 s.army[id]=8;const before=s.res.gold;E.tick(s,s.lastTick+1000);
 assert.equal(s.training.length,1,'Must queue a real recruit job, not mint units');
 const queued=s.training[0];assert.equal(queued.count,32);
 assert(s.res.gold<before,'Training expense was not charged');
 assert.equal(s.army[id],8);
 E.tick(s,s.lastTick+(queued.remaining+2)*1000/s.speed);
 assert.equal(s.army[id],40);assert.equal(E.hg20HeroPlan(s,1)[0].count,40);
 assert.equal(s.training.length,0);assert(E.strictSave(s));
 return {queued:32,retrained:32,chargedGold:before-s.res.gold,army:s.army[id]};
});
check('Auto training disabled never queues a soldier or pays resources',()=>{
 const s=E.make('elf',1000000);
 E.hg20SetHeroPlan(s,1,[{unitId:'elf_1',count:12}]);
 E.hg24SaveTemplate(s,1);E.hg24SetAuto(s,1,true,false);
 s.army.elf_1=4;const gold=s.res.gold;
 E.tick(s,s.lastTick+1000);
 assert.equal(s.training.length,0);assert.equal(s.res.gold,gold);
 assert.equal(E.hg20HeroPlan(s,1)[0].count,4);
 return {stock:4,queued:0};
});
check('Hero-specific Boss scouting and one-click dispatch use actual AP and army receipts',()=>{
 const s=E.make('human',1000000),boss=E.hg24RecommendBoss(s).find(x=>x.privateBoss);
 assert(boss&&boss.recommended&&E.getTile(boss.key)?.privateBoss);
 const before=s.ap,started=E.hg24DispatchBoss(s,boss.key);
 assert.equal(started.launched,true);assert.equal(started.heroId,s.expedition.heroId);
 assert.equal(s.expedition.army.human_1,16);assert.equal(s.army.human_1,0);
 assert.equal(s.march.target,boss.key);assert(s.ap<before);
 assert(E.strictSave(round(s)));
 return {hero:started.heroId,boss:boss.key,apSpent:before-s.ap,army:16};
});
check('Private resource-paid hero drill grants EXP once and enforces daily limit',()=>{
 const s=E.make('undead',1000000),before={...s.res};
 const first=E.hg24Drill(s,1);
 assert(first.gained>0&&first.level>1);
 assert(s.res.gold<before.gold&&s.res.crystal<before.crystal);
 assert.equal(E.hg24Status(s,1).drillsLeft,4);
 s.hg24.daily.drills=5;assert.throws(()=>E.hg24Drill(s,1),/5 lượt/);
 assert(E.strictSave(round(s)));
 return {gained:first.gained,level:first.level,paidGold:before.gold-s.res.gold};
});
check('Daily mine harvest requires an actually owned mine and pays only once (ownership fixture)',()=>{
 const s=E.make('orc',1000000);
 assert.throws(()=>E.hg24Harvest(s,1),/mỏ/);
 const mine=E.TILES.find(t=>t.kind==='mine'&&t.level===1);
 s.mines.push({key:mine.key,res:mine.value,level:mine.level,cityId:'main'});
 const before=s.res.gold,r=E.hg24Harvest(s,1);
 assert.equal(r.mines,1);assert(r.exp>0&&s.res.gold>before);
 assert.throws(()=>E.hg24Harvest(s,1),/nhận/);
 assert(E.strictSave(round(s)));
 return {mine:mine.key,exp:r.exp,goldAdded:s.res.gold-before};
});
check('HG21 tower 3 heroes x 2 slots and ownership remain unchanged with HG24',()=>{
 const s=E.make('human',1000000);
 const base=JSON.parse(JSON.stringify(s.heroes[0]));
 for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'Chiến Tướng '+id});
 const army=16;
 for(const [id,a,b] of [[1,2,2],[2,2,2],[3,2,2]]){
  E.hg20SetHeroPlan(s,id,[{unitId:'human_1',count:a},{unitId:'human_1',count:b}]);
  E.hg24SaveTemplate(s,id);
 }
 E.hg20ChooseTowerTeam(s,[1,2,3]);
 E.hg21SetTowerPicks(s,[1,2,3].map(heroId=>({heroId,slots:[0,1]})));
 const r=E.hg21TowerEnter(s);
 assert.equal(r.stacks,6);
 assert.deepEqual(Array.from(s.battle.allies,u=>u.heroId),[1,1,2,2,3,3]);
 assert.equal(s.army.human_1,army);
 assert(E.strictSave(round(s)));
 return {stacks:r.stacks,heroOwners:[1,2,3],unchangedArmy:army};
});
check('HG21 legacy Save v07 loads with no HG24 freebies',()=>{
 const prior=runtime(files.slice(0,-1));
 const baseline=prior.make('human',1000000),gold=baseline.res.gold;
 prior.hg20SetHeroPlan(baseline,1,[{unitId:'human_1',count:8}]);
 const loaded=E.parseSave(prior.serializeSave(baseline));
 assert.equal(loaded.version,7);assert.equal(loaded.res.gold,gold);
 assert.equal(loaded.hg24.daily.drills,0);assert.equal(loaded.hg24.daily.harvest,false);
 assert(E.strictSave(loaded));
 return {version:loaded.version,gold,preservedArmy:loaded.army.human_1};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg24'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg24/private-automation.json'),JSON.stringify({passed,total:receipts.length,receipts},null,2));
console.log('HG24 AUTOMATION '+passed+'/'+receipts.length+(passed===receipts.length?' PASS':' FAIL'));
