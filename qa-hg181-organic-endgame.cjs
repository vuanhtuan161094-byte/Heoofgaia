/* HG18.1 organic endgame economy and combat playthrough.
 * NO direct state grants: only E.make, E.upgrade, E.learn, E.recruit,
 * E.appoint, E.setFormation, E.startMarch, E.battleAct,
 * E.claimHG18Task, E.rebirthHG18Hero, E.tick.
 * Time acceleration is explicit; no unit/HP/level/gold/material mutations.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,s=E.make('human',1_000_000);
const steps=[],meta={mode:'organic actions with accelerated elapsed game time',seeded:false,status:'PENDING',stages:steps,error:null};
let simulatedHours=0,waits=0,builds=0,studies=0,recruits=0,battles=0,minesCaptured=0,xpBattles=0;
function strict(label){assert(E.strictSave(s),'Save validation failed: '+label)}
function receipt(name,details={}){steps.push({name,heroLevel:s.heroes[0].level,armyT10:s.army.human_10||0,gold:Math.floor(s.res.gold),fame:s.fame,simulatedHours, ...details});console.log('HG181 '+name+' '+JSON.stringify(details));strict(name)}
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
 // Ensure rebirth Gold comes from production, not synthetic grants.
 waitResources({gold:5000},'rebirth gold');
 assert(s.hg18.materials.rebirth_core>=1,'Rebirth core lost through time progression');
 E.rebirthHG18Hero(s,1);
 assert(s.heroes[0].level===1&&s.heroes[0].rebirth===1&&s.hg18.materials.rebirth_core===0);
 const saved=E.parseSave(E.serializeSave(s));
 assert(saved.heroes[0].rebirth===1&&saved.heroes[0].level===1);
 receipt('organic_rebirth_v07_reload',{xpBattles,totalBattles:battles,builds,studies,recruits,waits});
 meta.status='PASS';
}catch(err){meta.status='FAIL';meta.error=String(err.stack||err);console.error('HG181 ENDGAME FAIL '+meta.error);process.exitCode=1;}
finally{
 meta.summary={builds,studies,recruits,waits,battles,minesCaptured,simulatedHours,experienceGrindBattles:xpBattles,finalHeroLevel:s.heroes[0].level,rebirth:s.heroes[0].rebirth,rebirthCore:s.hg18?.materials.rebirth_core};
 fs.mkdirSync(path.join(__dirname,'docs','qa','hg181'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'docs','qa','hg181','organic-endgame.json'),JSON.stringify(meta,null,2));
 console.log('HG181 ENDGAME '+meta.status+' '+JSON.stringify(meta.summary));
}
