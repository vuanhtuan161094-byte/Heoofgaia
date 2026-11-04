/* HG17 New Game -> Second Castle. No QA seed, no resource/Fame/army/building
 * mutation. Only real E.make, commands and elapsed game time (1x/60x).
 * All game state mutations are owned by canonical engine actions.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console});
for(const name of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
const now=1_000_000,START_GOLD=8000,START_WOOD=900;
const receipt={scenario:'HG17 unseeded New Game to second Castle',version:7,mode:'ENGINE REAL ACTIONS - SIMULATED ELAPSED TIME',factions:[],steps:[],failure:null,passed:false};
function action(title,fn){
 const out=fn();
 if(!E.strictSave(s))throw Error('Invalid Save v07 after '+title);
 receipt.steps.push({title,fame:s.fame,ownedCities:s.cities.length,army:Object.values(s.army).reduce((a,b)=>a+b,0),resources:{...s.res},time:s.lastTick});
 return out;
}
function advance(seconds){
 assert(seconds>0);const next=s.lastTick+(seconds+2)*1000/s.speed;
 E.tick(s,next);
}
function finishJob(key){
 const q=s[key];assert(q,'Expected queued '+key);
 advance(q.remaining+1);
 assert.equal(s[key],null,'Not completed '+key);
}
function resolveBattle(maxTurns=70){
 assert(s.battle,'Battle absent after marching');
 let out;for(let i=0;i<maxTurns&&s.battle;i++)out=E.battleAct(s,'attack');
 assert(out,'No battle result');
 if(out.type==='continue')throw Error('Battle did not resolve: '+JSON.stringify(s.battle?.lastActOrder||[]));
 return out;
}
function dispatch(key){
 const started=E.startMarch(s,key);
 assert(started&&started.total>0);
 advance(started.remaining+1);
 assert(s.battle&&s.battle.target===key,'March arrival missing '+key);
 return resolveBattle();
}
let s=E.make('human',now);
try{
 assert.equal(s.fame,5);
 assert.equal(s.res.gold,START_GOLD);assert.equal(s.res.wood,START_WOOD);
 assert.equal(s.cities.length,1);assert.equal(s.army.human_1,16);
 assert.equal(s.buildingQueue,null);assert.equal(s.researchQueue,null);
 assert(E.strictSave(s));
 receipt.steps.push({title:'Original New Game, no QA grants',fame:s.fame,ownedCities:s.cities.length,res:{...s.res}});
 action('Buy and finish Market Lv1',()=>{E.upgrade(s,'market');finishJob('buildingQueue');assert.equal(s.buildings.market,1)});
 action('Research and finish Forestry 1',()=>{E.learn(s,'forestry');finishJob('researchQueue');assert.equal(s.spells.forestry,1)});
 action('Train 24 new Spear Militia from genuine New Game stock',()=>{E.recruit(s,'human_1',24);assert.equal(s.training.length,1);advance(s.training[0].remaining+1);assert.equal(s.army.human_1,40);assert.equal(s.training.length,0)});
 const first=E.TILES.filter(t=>t.kind==='mine'&&t.level===1&&E.pathfind('3,4',t.key))
  .sort((a,b)=>E.pathTravelCost(E.pathfind('3,4',a.key))-E.pathTravelCost(E.pathfind('3,4',b.key)))[0];
 assert(first,'No level-1 beginner mine reachable');
 const earnedMine=action('March and capture level-1 mine from real rookie army',()=>{
  const out=dispatch(first.key);assert.equal(out.type,'win','Rookie battle lost: '+out.type);
  assert(s.mines.some(m=>m.key===first.key));
  return {mine:first.key};
 });
 if(s.stationedHeroes.some(g=>g.key===first.key)){
  action('Recall hero and survivors after claiming the mine',()=>{
   const eta=E.recallHero(s,1);
   if(typeof eta==='number')advance(eta+1);
   assert(!s.expedition&&!s.march&&!s.stationedHeroes.some(g=>g.key===first.key));
  });
 }
 const beforeProgress=s.fame;
 const builders=['hall','warehouse','magicTower','barracks','tavern','heroTower','arena','market','bazaar','stables','blacksmith'];
 const research=['mining','refining','polishing','forestry','storing','construction','manufacturing','bootcamp','scouting'];
 let iterations=0,construction=0,studies=0,recruitment=0,simulatedSeconds=0;
 while(s.fame<5800&&iterations++<420){
  let did=false;
  // Take the single most affordable eligible upgrade, prioritizing City Hall,
  // store, magic and troop buildings over peripheral content.
  for(const key of builders){
   if((s.buildings[key]||0)>=8)continue;
   const cost=E.buildCost(s,key);
   if(!E.canAfford(s,cost))continue;
   try{
    E.upgrade(s,key);finishJob('buildingQueue');construction++;did=true;
    assert(E.strictSave(s),'Build invalid '+key);
    break;
   }catch(e){if(s.buildingQueue)throw e}
  }
  if(!did)for(const key of research){
   const level=s.spells[key]||0;if(level>=Math.min(4,s.buildings.magicTower))continue;
   if(!E.canAfford(s,E.spellCost(s,key)))continue;
   try{E.learn(s,key);finishJob('researchQueue');studies++;did=true;break}
   catch(e){if(s.researchQueue)throw e}
  }
  if(!did){
   const qty=Math.min(20,Math.max(1,Math.floor(s.res.sulfur/4)));
   try{if(qty>=5){E.recruit(s,'human_1',qty);advance(s.training[0].remaining+1);recruitment+=qty;did=true}}
   catch(e){if(s.training.length)throw e}
  }
  if(iterations%7===0){s=E.parseSave(E.serializeSave(s));assert(E.strictSave(s))}
  if(!did||iterations%5===0){const duration=3600*6;advance(duration);simulatedSeconds+=duration}
  if(s.fame>=5800)break;
 }
 receipt.progression={iterations,construction,studies,recruitment,simulatedGameHours:simulatedSeconds/3600,startingFame:5,mineFame:beforeProgress,endingFame:s.fame};
 assert(s.fame>=5800,'Progression Fame gate locked: '+JSON.stringify(receipt.progression));
 assert(E.cityLimit(s.fame)>=2);
 if(s.army.human_1<35){
  action('Train enough soldiers to challenge a nearby neutral city',()=>{
   const needed=35-s.army.human_1;
   E.recruit(s,'human_1',needed);advance(s.training[0].remaining+1);
  });
 }
 const targets=E.TILES.filter(t=>t.kind==='castle'&&t.key!=='3,4'&&!t.aiOwner&&t.level<=2&&E.pathfind('3,4',t.key))
  .sort((a,b)=>E.pathTravelCost(E.pathfind('3,4',a.key))-E.pathTravelCost(E.pathfind('3,4',b.key)));
 assert(targets.length,'No reachable neutral beginner city');
 const target=targets[0];
 action('Attack unowned neutral castle with real trained units',()=>{
  const win=dispatch(target.key);assert.equal(win.type,'win','Failed 2nd castle siege: '+win.type);
  assert(E.cityForKey(s,target.key),'No settlement created after real castle victory');
  assert.equal(s.cities.length,2);
  assert(E.strictSave(E.parseSave(E.serializeSave(s))));
 });
 const owned=E.cityForKey(s,target.key);
 assert(Object.values(owned.local.res).every(v=>v===0),'New castle should start with its game-designed empty treasury');
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.cities.length,2);
 assert(E.cityForKey(saved,target.key));
 const snapshot=JSON.stringify(saved);E.tick(saved,saved.lastTick);assert.equal(JSON.stringify(saved),snapshot);
 receipt.conquest={key:target.key,race:target.race,owned:2,strictSave:true};
 receipt.passed=true;console.log('HG17 ORGANIC NEW GAME PASS '+JSON.stringify({progression:receipt.progression,conquest:receipt.conquest}));
}catch(err){
 receipt.failure=String(err.stack||err);console.error('HG17 ORGANIC NEW GAME FAIL '+receipt.failure);process.exitCode=1;
}finally{
 const dir=path.join(__dirname,'docs','qa','hg17');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'organic-newgame-receipt.json'),JSON.stringify(receipt,null,2));
}
