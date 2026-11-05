/* HG32 independent full organic route from New Game to T11 Boss, Tower, Sovereign, Dragon gear.
 * NO direct state grants: only E.make, E.upgrade, E.learn, E.recruit,
 * E.appoint, E.setFormation, E.startMarch, E.battleAct,
 * E.claimHG18Task, E.rebirthHG18Hero, E.tick.
 * Time acceleration is explicit; no unit/HP/level/gold/material mutations.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js','hg24-private-automation.js','hg26-boss-autohunt.js','hg261-joint-boss.js','hg27-farm-exchange.js','hg29-loot.js','hg30-troop-ascension.js','hg31-legendary-gear.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,s=E.make('human',1_000_000);
const steps=[],meta={mode:'organic actions with accelerated elapsed game time',seeded:false,status:'PENDING',stages:steps,error:null};
let simulatedHours=0,waits=0,builds=0,studies=0,recruits=0,battles=0,minesCaptured=0,xpBattles=0;
function strict(label){assert(E.strictSave(s),'Save validation failed: '+label)}
function receipt(name,details={}){steps.push({name,heroLevel:s.heroes[0].level,armyT10:s.army.human_10||0,gold:Math.floor(s.res.gold),fame:s.fame,simulatedHours, ...details});console.log('HG32 '+name+' '+JSON.stringify(details));strict(name)}
function advance(seconds){assert(seconds>0);E.tick(s,s.lastTick+(seconds+1)*1000/s.speed);simulatedHours+=seconds/3600;strict('tick')}
function waitResources(cost,label){
 for(let i=0;i<180;i++){
  const limits=E.limits(s);
  for(const k of C.keys)if(cost[k]>limits[k]+.0001)throw Error(label+' exceeds store capacity '+k+' cost '+cost[k]+' cap '+limits[k]);
  if(E.canAfford(s,cost))return;
  advance(24*3600);waits++;
 }
 throw Error('Resource economy cannot fund '+label+': '+JSON.stringify({cost,res:s.res,limits:E.limits(s),rate:E.rate(s)}));
}
let stackDepth=0;
function ensureCapacity(cost,label){
 if(stackDepth++>35)throw Error('Warehouse recursion failed '+label);
 try{
  while(C.keys.some(k=>(cost[k]||0)>E.limits(s)[k]+.0001)){
   const warehouse=s.buildings.warehouse||0;
   if(warehouse>=10)throw Error('Warehouse max prevents '+label+' '+JSON.stringify({cost,limit:E.limits(s)}));
   if(warehouse>=s.buildings.hall)buildTo('hall',warehouse+1);
   buildTo('warehouse',warehouse+1);
  }
 }finally{stackDepth--}
}
function buildTo(key,target){
 for(let guard=0;(s.buildings[key]||0)<target&&guard<25;guard++){
  const next=(s.buildings[key]||0)+1;
  if(key!=='hall'&&s.buildings.hall<next)buildTo('hall',next);
  if(s.buildingQueue)advance(s.buildingQueue.remaining+2);
  const cost=E.buildCost(s,key);
  ensureCapacity(cost,'build '+key+' Lv'+next);
  waitResources(cost,'build '+key+' Lv'+next);
  E.upgrade(s,key);builds++;
  assert(s.buildingQueue,'Building never queued '+key);
  advance(s.buildingQueue.remaining+2);
  assert.equal(s.buildings[key],next,'Building level not completed '+key);
  if(builds%10===0)receipt('construction_progress',{key,next,builds});
 }
 assert.equal(s.buildings[key],target,'Unreachable build '+key+' level '+target);
}
function learnTo(id,target){
 for(let lv=s.spells[id]||0;lv<target;lv++){
  if(s.buildings.magicTower<lv+1)buildTo('magicTower',lv+1);
  if(s.researchQueue)advance(s.researchQueue.remaining+2);
  const cost=E.spellCost(s,id);
  ensureCapacity(cost,'spell '+id+' Lv'+(lv+1));
  waitResources(cost,'spell '+id+' Lv'+(lv+1));
  E.learn(s,id);studies++;
  assert(s.researchQueue,'Research never queued '+id);
  advance(s.researchQueue.remaining+2);
  assert.equal(s.spells[id],lv+1,'Spell did not complete '+id);
 }
}
function train(id,count){
 const u=E.getUnit(s,id);assert(u&&!u.rewardOnly);
 const cost=E.recruitCost(s,u,count);
 ensureCapacity(cost,'recruit '+id+' x'+count);
 waitResources(cost,'recruit '+id+' x'+count);
 const before=s.army[id]||0;
 E.recruit(s,id,count);recruits+=count;
 const job=s.training.at(-1);assert(job,'Training not queued');
 advance(job.remaining+2);
 assert.equal(s.army[id],before+count,'Training did not deliver '+id);
}
function recallIfNeeded(){
 if(s.march&&s.march.phase==='return')advance(s.march.remaining+2);
 if(s.stationedHeroes?.some(q=>q.heroId===1)){
  const result=E.recallHero(s,1);
  if(typeof result==='number')advance(result+2);
 }
 strict('hero returned');
}
function dispatchAndWin(targetKey){
 recallIfNeeded();
 // AP is authoritative; in repeated organic PvE, wait for normal hourly regen.
 for(let w=0;s.ap<8&&w<200;w++)advance(3600);
 assert(s.ap>=8,'AP recovery stalled during long-form endgame grind');
 E.startMarch(s,targetKey);
 assert(s.march,'No paid march');
 advance(s.march.remaining+2);
 assert(s.battle&&s.battle.target===targetKey,'March did not enter combat');
 let result;
 for(let i=0;i<70&&s.battle;i++)result=E.battleAct(s,'attack');
 assert(result&&result.type!=='continue','Battle unresolved');
 battles++;
 strict('battle '+targetKey+' '+result.type);
 return result.type;
}
try{
 assert(s.heroes[0].level===1&&!s.army.human_10&&Object.values(s.hg18.materials).every(v=>v===0));
 E.appoint(s,1); // real Castellan work grants activity XP
 receipt('fresh_new_game',{resources:s.res,starterArmy:s.army.human_1});
 // Invest in the existing production loop rather than passively waiting six
 // months. Mine sites are discovered from the canonical map, fought over by
 // paid rookie troops, and stationed/returned using real expedition actions.
 train('human_1',24);
 E.appoint(s,1); // release the Castellan for five real beginner mine battles
 const mineCandidates=E.TILES.filter(t=>t.kind==='mine'&&t.level===1&&
    E.pathfind('3,4',t.key))
   .sort((a,b)=>E.pathTravelCost(E.pathfind('3,4',a.key))-
       E.pathTravelCost(E.pathfind('3,4',b.key)));
 const foundKinds=new Set(),starterMines=mineCandidates.filter(t=>{
  if(foundKinds.has(t.value))return false;
  foundKinds.add(t.value);return true;
 }).slice(0,5);
 assert(starterMines.length>=3,'Not enough distinct reachable beginner production mines');
 for(const mine of starterMines){
  if((s.army.human_1||0)<30)train('human_1',40-(s.army.human_1||0));
  const outcome=dispatchAndWin(mine.key);
  assert.equal(outcome,'win','Starter troops could not earn '+mine.value+' mine');
  recallIfNeeded();
  assert(s.mines.some(m=>m.key===mine.key),'Mine absent after real victory');
  minesCaptured++;
  receipt('production_mine_capture',{resource:mine.value,key:mine.key,rate:E.rate(s)[mine.value]});
 }
 E.appoint(s,1); // resume Castellan XP from paid building and research
 receipt('self_funded_mine_economy',{minesCaptured,rates:E.rate(s)});
 buildTo('hall',10);buildTo('barracks',10);buildTo('stables',9);buildTo('blacksmith',10);buildTo('magicTower',9);buildTo('heroTower',9);
 learnTo('manufacturing',9);learnTo('bootcamp',9);learnTo('scouting',3);
 assert(E.troopPrerequisites(s,E.getUnit(s,'human_10')).available,'T10 gates still locked');
 receipt('unlocked_human_t10',{builds,studies,warehouse:s.buildings.warehouse,heroLevel:s.heroes[0].level});
 // Paid construction/research grants XP to the Castellan. Remove the role for battle.
 E.appoint(s,1);
 // Prioritize a whole endgame detachment paid exclusively through warehouse/production.
 const unit=E.getUnit(s,'human_10'),commandLimit=E.heroLimit(s.heroes[0].level);
 const targetCount=Math.min(90,Math.floor(commandLimit/E.unitValue(unit)));
 assert(targetCount>=70,'Paid construction did not grow Hero capacity enough for 9-star raid: '+targetCount);
 for(let i=0;i<targetCount;i+=5)train(unit.id,Math.min(5,targetCount-i));
 receipt('recruited_pure_t10',{targetCount,points:targetCount*E.unitValue(unit),commandLimit});
 const stackCount=Math.min(7,targetCount),whole=Math.floor(targetCount/stackCount),rest=targetCount%stackCount;
 E.setFormation(s,Array.from({length:stackCount},(_,i)=>({unitId:unit.id,count:whole+(i<rest?1:0)})));
 const boss=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11&&E.pathfind('3,4',t.key));
 assert(boss,'No reachable real modeled tier-11 Demon');
 const bossOutcome=dispatchAndWin(boss.key);
 receipt('first_paid_boss',{boss:boss.key,outcome:bossOutcome,heroLevel:s.heroes[0].level});
 assert.equal(bossOutcome,'win','Organic elite army failed tier-11 boss balance: '+JSON.stringify({targetCount,level:s.heroes[0].level}));
 const earnedCoreBefore=s.hg18.materials.rebirth_core;
 assert(E.hg18Tasks(s,'weekly').find(q=>q.id==='weekly_boss').ready,'Real Boss did not credit weekly quest');
 E.claimHG18Task(s,'weekly','weekly_boss');
 assert.equal(s.hg18.materials.rebirth_core,earnedCoreBefore+1,'Weekly claim failed to grant rebirth core');
 receipt('earned_boss_rebirth_core',{core:s.hg18.materials.rebirth_core,guard:s.army.human_quest_guard||0});
 recallIfNeeded();
 // All subsequent XP must come from actual repeated world victories, no grant XP.
 const xpTarget=E.TILES.find(t=>t.kind==='npc'&&t.level===8&&E.pathfind('3,4',t.key));
 assert(xpTarget,'No reachable 8-star NPC for experience farming');
 const initialLv=s.heroes[0].level;
 xpBattles=0;
 for(;s.heroes[0].level<100&&xpBattles<1700;xpBattles++){
  const outcome=dispatchAndWin(xpTarget.key);
  if(outcome!=='win')throw Error('Late-game paid army lost 8-star XP fight at iteration '+xpBattles);
  if(xpBattles%100===0)receipt('experience_farming',{xpBattles,heroLevel:s.heroes[0].level,army:s.army.human_10||0});
 }
 assert.equal(s.heroes[0].level,100,'Long-form organic XP progression stalled; only Lv'+s.heroes[0].level+' after '+xpBattles+' wins');
 assert(xpBattles<=350,'HG18.2 XP progression still requires '+xpBattles+' repeated 8-star fights (target <=350)');
 receipt('organic_level_100',{xpBattles,fromLevel:initialLv});
 recallIfNeeded();

 // HG32 addition: test AFTER organic buildings, research, T10, first real T11,
 // and natural Lv100 grind. No state mutation outside canonical engine calls.
 const hg32={startLevel:s.heroes[0].level,firstBossAlreadyWon:true,lowNpcForWild:0,
  towerPaid:0,bossPostGuard:0,guardConverted:false,sovereignConverted:false,dragonCrafted:false,
  started:simulatedHours};
 function party(){
  recallIfNeeded();
  // Real paid upkeep: replenish battle casualties with the production economy,
  // NOT state.army mutation, QA seed or synthetic funds.
  let usable=s.army.human_10||0;
  if(usable<50){
   const before=usable;
   while(usable<50){
    const order=Math.min(5,50-usable);
    train('human_10',order);
    usable=s.army.human_10||0;
   }
   hg32.militaryRefits=(hg32.militaryRefits||0)+1;
   hg32.recruitedExtraT10=(hg32.recruitedExtraT10||0)+(usable-before);
  }
  assert(usable>=30,'Organic T10 replenishment still failed '+usable);
  const count=Math.min(usable,75);
  const a=Math.ceil(count/2),b=count-a;
  E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:a},{unitId:'human_10',count:b}]);
  E.hg20ChooseTowerTeam(s,[1]);
 }
 function paidTower(){
  recallIfNeeded();party();
  if(s.hg20.tower.claims>=5){
   // Daily claims use actual UTC wall calendar, not 60x simulated production
   // time. Temporarily select 1x via the public game action, then run one
   // actual modeled 24h elapsed day. No reward/quota counter mutation.
   const previousSpeed=s.speed;
   E.setSpeed(s,1);
   advance(86400);
   E.setSpeed(s,previousSpeed);
   hg32.dailyResets=(hg32.dailyResets||0)+1;
  }
  const start=s.hg20.tower.floor;
  E.hg21TowerEnter(s);
  let o,i=0;
  while(s.battle&&i++<70)o=E.battleAct(s,'attack');
  assert.equal(o?.type,'win','organic Tower combat failed at '+start);
  assert(o.claimed,'Tower victory exhausted reward unexpectedly at '+start);
  hg32.towerPaid++;
  strict('HG32 paid tower floor '+start);
 }
 const low=E.TILES.filter(t=>t.kind==='npc'&&t.level===1&&E.pathfind('3,4',t.key))
  .sort((a,b)=>E.pathTravelCost(E.pathfind('3,4',a.key))-E.pathTravelCost(E.pathfind('3,4',b.key)))[0];
 assert(low,'No reachable low NPC for fragment grind');
 while((s.hg29.shards.wild||0)<6&&hg32.lowNpcForWild<50){
  party();assert.equal(dispatchAndWin(low.key),'win');
  hg32.lowNpcForWild++;
 }
 assert(s.hg29.shards.wild>=6,'HG29 low-star shards unreachable after '+hg32.lowNpcForWild);
 while(s.hg20.tower.floor<4)paidTower();
 assert(s.hg30.npcWins>=2&&s.hg30.paidTowerWins>=1,'HG30 trial did not credit real wins');
 recallIfNeeded();E.hg30ClaimTrial(s);assert.equal(s.hg30.stage,1);
 const available=s.army.human_1||0;
 if(available<12)train('human_1',12-available);
 // T10 party is reserved; T1 is intentionally left unassigned.
 assert(s.hg27.marks>=12&&s.hg27.tower>=3,'Natural token shortage for HG30 Guard');
 const guard=E.hg30Convert(s,'guard');
 assert.equal(guard.toUnit,'human_quest_guard');hg32.guardConverted=true;
 receipt('hg32_fully_organic_guard',{lowNpcForWild:hg32.lowNpcForWild,
   bossBeforeGuard:s.hg30.bossWins,paidTower:s.hg30.paidTowerWins,stage:s.hg30.stage});
 for(let i=0;i<8;i++){
  party();
  assert.equal(dispatchAndWin(boss.key),'win','Paid T11 fight failed after Guard at '+i);
  hg32.bossPostGuard++;
 }
 assert(s.hg31.fragments.dragon_blade>=6,'Real boss wins not paying selected Long Hồn shards');
 while(s.hg20.tower.floor<11)paidTower();
 assert.equal(s.army.human_tower_sovereign||0,0,
  'Tower 10 must not mint sovereign before earning HG30 conversion quest');
 assert(s.hg30.bossWins-s.hg30.bossAfterGuard>=1);
 assert(s.hg30.paidTowerWins-s.hg30.towerAfterGuard>=2);
 assert(s.hg29.shards.tower>=12,'10 paid Tower wins did not accumulate 12 guaranteed HG29 tower runes');
 recallIfNeeded();
 // No hidden injection: all T1, Guard, Boss seals, hunter/hero/abyss and tower
 // fragments were earned through previous real wins from the original New Game.
 const sovereignPreview=E.hg30Recipe(s,'sovereign');
 assert(sovereignPreview.canConvert,'HG32 Sovereign not organic-fundable: '+JSON.stringify({
  recipe:sovereignPreview,HG29:s.hg29.shards,HG27:s.hg27,Gold:s.res.gold}));
 const out=E.hg30Convert(s,'sovereign');
 assert.equal(out.toUnit,'human_tower_sovereign');hg32.sovereignConverted=true;
 const forge=E.hg31Catalogue(s).find(x=>x.id==='dragon_blade');
 assert(forge.canCraft,'HG32 Long Hồn Sword not organic-fundable: '+JSON.stringify({
  recipe:forge,HG29:s.hg29.shards,HG27:s.hg27,Gold:s.res.gold}));
 const item=E.hg31Craft(s,'dragon_blade');
 assert.equal(item.itemId,'dragon_blade');hg32.dragonCrafted=true;
 let persisted=E.parseSave(E.serializeSave(s));
 assert.equal(persisted.hg30.stage,3);
 assert.equal(persisted.army.human_tower_sovereign,1);
 assert(persisted.inventory.some(x=>x.itemId==='dragon_blade'));
 assert(E.strictSave(persisted));
 hg32.endGameHours=simulatedHours;
 hg32.gameDays=+(simulatedHours/24).toFixed(2);
 hg32.endTower=s.hg20.tower.floor;hg32.npcWins=s.hg30.npcWins;
 hg32.BossWins=s.hg30.bossWins;hg32.heroLevel=s.heroes[0].level;
 hg32.T10Left=s.army.human_10;
 receipt('hg32_organic_boss_tower_sovereign_and_dragon',{...hg32});
 meta.hg32=hg32;

 // Ensure rebirth Gold comes from production, not synthetic grants.
 waitResources({gold:5000},'rebirth gold');
 assert(s.hg18.materials.rebirth_core>=1,'Rebirth core lost through time progression');
 E.rebirthHG18Hero(s,1);
 assert(s.heroes[0].level===1&&s.heroes[0].rebirth===1&&s.hg18.materials.rebirth_core===0);
 const saved=E.parseSave(E.serializeSave(s));
 assert(saved.heroes[0].rebirth===1&&saved.heroes[0].level===1);
 receipt('organic_rebirth_v07_reload',{xpBattles,totalBattles:battles,builds,studies,recruits,waits});
 meta.status='PASS';
}catch(err){meta.status='FAIL';meta.error=String(err.stack||err);console.error('HG32 FULL ORGANIC FAIL '+meta.error);process.exitCode=1;}
finally{
 meta.summary={builds,studies,recruits,waits,battles,minesCaptured,simulatedHours,experienceGrindBattles:xpBattles,finalHeroLevel:s.heroes[0].level,rebirth:s.heroes[0].rebirth,rebirthCore:s.hg18?.materials.rebirth_core};
 fs.mkdirSync(path.join(__dirname,'docs','qa','hg32'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'docs','qa','hg32','organic-full-endgame.json'),JSON.stringify(meta,null,2));
 console.log('HG32 ENDGAME '+meta.status+' '+JSON.stringify(meta.summary));
}
