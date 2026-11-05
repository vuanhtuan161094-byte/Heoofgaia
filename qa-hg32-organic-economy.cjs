/* HG32: strict organic New Game -> earned tokens -> first Guard. NO injected state.
 * Every mutation via actual E.make/E.recruit/E.tick/E.startMarch/E.battleAct/
 * E.hg21TowerEnter/E.hg30ClaimTrial/E.hg30Convert/E.hg20SetHeroPlan.
 * No QA inventory, no set level, no forced wins; elapsed time is simulated explicitly.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js'.split(' ');
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;const receipt={
 scope:'HG32 organic rookie-to-Guard and endgame budget feasibility',
 mode:'NO_SEED: E.make + real game commands + E.tick accelerated elapsed time',
 save:7,pool:'human',steps:[],passed:false,blocked:null,metrics:{},
 analysis:{},errors:[]};
let s=E.make('human',1_000_000),gameSeconds=0,worldWins=0,towerWins=0,trainJobs=0;
function valid(when){assert(E.strictSave(s),'invalid Save after '+when);}
function wait(seconds){assert(Number.isFinite(seconds)&&seconds>0,'bad wait');
 const before=s.lastTick;E.tick(s,before+(seconds+2)*1000/s.speed);
 gameSeconds+=seconds+2;valid('tick');}
function safeSave(label){s=E.parseSave(E.serializeSave(s));valid('cold '+label);}
function record(label,other={}){receipt.steps.push({label,days:+(gameSeconds/86400).toFixed(3),
 npcWins:s.hg30.npcWins,bossWins:s.hg30.bossWins,paidTower:s.hg30.paidTowerWins,
 towerFloor:s.hg20.tower.floor,trial:s.hg30.stage,marks:s.hg27.marks,
 towerTokens:s.hg27.tower,wild:s.hg29.shards.wild,
 base:s.army.human_1||0,guard:s.army.human_quest_guard||0,
 gold:Math.floor(s.res.gold),...other});valid(label);}
function finishReturn(){for(let k=0;k<10;k++){
 if(s.march&&s.march.phase==='return'){wait(s.march.remaining+3);continue;}
 if(s.expedition?.phase==='returning'){wait(s.expedition.remaining+3);continue;}
 if(s.stationedHeroes?.some(x=>x.heroId===1)){
  const eta=E.recallHero(s,1);
  if(typeof eta==='number')wait(eta+3);continue;}
 break;
}
 assert(!s.march&&!s.expedition&&!s.stationedHeroes?.some(x=>x.heroId===1),'hero did not return');
}
function payAndTrain(count){if(count<=0)return;
 const unit=E.getUnit(s,'human_1'),cost=E.recruitCost(s,unit,count);
 for(let i=0;!E.canAfford(s,cost)&&i<60;i++)wait(86400);
 assert(E.canAfford(s,cost),'not enough natural stock to recruit: '+JSON.stringify({cost,res:s.res}));
 E.recruit(s,'human_1',count);trainJobs++;
 const job=s.training[s.training.length-1];wait(job.remaining+3);
 assert(!s.training.length,'training not delivered');
}
function homePlan(max=40){
 finishReturn();
 // Existing army is allocated using canonical plan (never edit formation directly).
 const available=s.army.human_1||0;
 assert(available>=1,'all starter soldiers lost');
 const count=Math.min(max,available,Math.floor(E.heroLimit(s.heroes[0].level)/E.unitValue(E.getUnit(s,'human_1'))));
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count}]);
 return count;
}
function fightBattle(){let result;let turns=0;
 while(s.battle&&turns++<70)result=E.battleAct(s,'attack');
 assert(result&&result.type==='win','organic battle not won: '+JSON.stringify({result,turns}));
 return {result,turns};}
function lowNpc(){
 finishReturn();
 if(s.ap<15)for(let i=0;i<72&&s.ap<15;i++)wait(3600);
 if((s.army.human_1||0)<22)payAndTrain(40-(s.army.human_1||0));
 homePlan();
 const house=E.getTile(E.activeCity(s).key);
 const targets=E.TILES.filter(t=>t.kind==='npc'&&t.level===1&&!t.privateBoss&&E.pathfind(house.key,t.key))
  .sort((a,b)=>E.pathTravelCost(E.pathfind(house.key,a.key))-E.pathTravelCost(E.pathfind(house.key,b.key)));
 let lastError=null;
 for(const tile of targets.slice(0,8)){
  try{
   const result=E.startMarch(s,tile.key);
   assert(s.march||s.battle,'did not dispatch '+tile.key);
   if(s.march)wait(s.march.remaining+3);
   assert(s.battle,'no NPC encounter on arrival '+tile.key);
   const win=fightBattle();worldWins++;
   finishReturn();return {target:tile.key,turns:win.turns};
  }catch(e){if(s.march||s.battle||s.expedition)throw e;lastError=e;}
 }
 throw Error('cannot reach any organic beginner NPC: '+lastError);
}
function tower(){
 finishReturn();homePlan();
 // A real tactical projection: no expense beyond the per-day paid claim.
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const battle=fightBattle();assert(battle.result.claimed,'tower winning floor not paid');
 towerWins++;
 return {floor:battle.result.floor,turns:battle.turns};
}
try{
 valid('newgame');assert.equal(s.hg30.stage,0);assert.equal(s.hg29.shards.wild,0);
 assert.equal(s.hg27.marks,0);assert.equal(s.hg20.tower.floor,1);
 record('actual zero-token new game',{res:{...s.res}});
 payAndTrain(24);
 record('trained 24 T1 from natural starting resources');
 const n1=lowNpc(),n2=lowNpc();
 record('two real world NPC wins',{npcTargets:[n1.target,n2.target]});
 const t1=tower();record('one real paid Tower clear',{floor:t1.floor});
 assert.equal(s.hg30.npcWins,2);assert.equal(s.hg30.paidTowerWins,1);
 finishReturn();E.hg30ClaimTrial(s);assert.equal(s.hg30.stage,1);
 record('opened HG30 trial only after actual wins');
 tower();tower();record('real Tower floor 3 cleared');
 assert(s.hg20.tower.floor>=4);
 let grind=0;const need=()=>s.hg27.marks>=12&&s.hg29.shards.wild>=6;
 while(!need()&&grind++<70){lowNpc();if(grind%10===0){safeSave('grind '+grind);record('grind checkpoint');}}
 assert(need(),'organic grind stalled before Guard: '+JSON.stringify({
  marks:s.hg27.marks,wild:s.hg29.shards.wild,grind}));
 finishReturn();
 // Reserve only deployed soldiers; keep at least 12 genuinely unassigned T1.
 const stock=s.army.human_1||0;
 if(stock<24)payAndTrain(24-stock);
 const safeCount=Math.min(12,(s.army.human_1||0)-12);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:safeCount}]);
 assert(E.hg30Recipe(s,'guard').canConvert,'natural HG30 Guard recipe still locked: '+JSON.stringify(E.hg30Recipe(s,'guard')));
 const before={gold:s.res.gold,stock:s.army.human_1,wild:s.hg29.shards.wild,marks:s.hg27.marks,tower:s.hg27.tower};
 const out=E.hg30Convert(s,'guard');
 assert.equal(out.toUnit,'human_quest_guard');assert.equal(s.hg30.stage,2);
 assert.equal(s.army.human_1,before.stock-12);assert.equal(s.army.human_quest_guard,1);
 assert.equal(s.res.gold,before.gold-3000);assert.equal(s.hg29.shards.wild,before.wild-6);
 assert.equal(s.hg27.marks,before.marks-12);assert.equal(s.hg27.tower,before.tower-3);
 safeSave('organic guard');
 record('organic Guard conversion fully paid',{npcsFought:worldWins,towerWins,grindAfterTrial:grind});
 receipt.metrics={elapsedGameDays:+(gameSeconds/86400).toFixed(3),worldWins,towerWins,
  goldEnd:Math.floor(s.res.gold),firstGuard:1,remainingWild:s.hg29.shards.wild,trainingJobs:trainJobs};
 // Derived BUDGET lower bounds, NOT claims of observed organic play.
 const sovereign=E.HG30_RECIPES.sovereign;
 const star=E.HG31_GEAR.filter(g=>g.set==='star');
 const starFragments=star.reduce((a,g)=>a+g.need.fragments,0);
 const starTowerShards=star.reduce((a,g)=>a+g.need.tower,0);
 const minPaidForRunes=n=>{let wins=0,balance=0;while(balance<n){wins++;balance+=wins%5===0?2:1;}return wins};
 const minPaidForStarFragments=minPaidForRunes(starFragments);
 const minPaidForStarTowerShards=minPaidForRunes(starTowerShards);
 receipt.analysis={
  mode:'LOWER BOUNDS — exact guaranteed drop math, not predicted real completion',
  paidTowerPerDay:5,
  towerWinsToFloor21:20,
  earliestCalendarDaysToFloor21:Math.ceil(20/5),
  starThreePieceFocusedShards:starFragments,
  starThreePieceTowerHG29Runes:starTowerShards,
  earliestPaidClearsForStarGearShards:minPaidForStarFragments,
  earliestPaidClearsForStarTowerRunes:minPaidForStarTowerShards,
  earliestCalendarDaysFromNewGameForStarThreePiece:Math.ceil(Math.max(20,minPaidForStarFragments,minPaidForStarTowerShards)/5),
  additionalHeroShards:star.reduce((a,g)=>a+(g.need.hero||0),0),
  additionalBossSeals:star.reduce((a,g)=>a+(g.need.bossToken||0),0),
  sovereignHG29TowerRunes:sovereign.fragments.tower,
  excludes:'probabilistic hero/hunter drops, army progression, resources, and exact Tower survival difficulty'
 };
 receipt.passed=true;
 console.log('HG32 ORGANIC PASS '+JSON.stringify({metrics:receipt.metrics,analysis:receipt.analysis}));
}catch(e){receipt.blocked=String(e.stack||e);receipt.errors.push(receipt.blocked);process.exitCode=1;
 console.error('HG32 ORGANIC FAIL '+receipt.blocked)}
finally{
 fs.mkdirSync(path.join(__dirname,'docs','qa','hg32'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'docs','qa','hg32','organic-audit.json'),JSON.stringify(receipt,null,2));
}
