/* HG16-G4 deterministic core gameplay stress: combat first, then production and marching.
 * Runs with only the repository's shipped JS: node qa-hg16-g4-stress.cjs
 * Runtime caps are test limits, not original Heroes of Gaia 2009 rules.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
const checks=[];let failures=0,encounters=0,fullBattles=0,sevenBySeven=0;
const races=['human','elf','orc','undead'],npc=E.TILES.find(t=>t.kind==='npc'),symbols=['gold','wood','ore','sulfur','crystal'];
function check(label,run){
 try{const details=run();checks.push({label,status:'PASS',...(details||{})});console.log('PASS '+label,details?JSON.stringify(details):'');}
 catch(e){failures++;checks.push({label,status:'FAIL',error:e.stack||String(e)});console.error('FAIL '+label+': '+(e.stack||e));}
}
function roundState(race='human'){return E.make(race,1_000_000)}
function stableBattle(b){return b?{turn:b.turn,allies:b.allies,enemies:b.enemies,lastEvents:b.lastEvents,lastMoves:b.lastMoves,orders:b.orders,woundedByUnit:b.woundedByUnit}:null}
function validPools(b){
 for(const u of [...(b?.allies||[]),...(b?.enemies||[])]){
  assert(Number.isFinite(u.pool)&&u.pool>=0&&Number.isSafeInteger(u.count)&&u.count>=0);
  assert(Number.isFinite(u.hp)&&u.hp>0&&Number.isFinite(u.atk)&&u.atk>=0&&Number.isFinite(u.def)&&u.def>=0);
  assert.equal(u.count,Math.ceil(u.pool/u.hp),u.id+' HP/count drift');
 }
}
check('P0 overkill receipts report actual HP lost (damage, VFX, battle report)',()=>{
 const s=roundState();s.heroes[0].level=100;s.army.human_1=10000;E.setFormation(s,[{unitId:'human_1',count:10000}]);
 const b=E.makeBattle(s,npc.key);const p=b.allies[0];Object.assign(p,{x:9,y:4,spd:99});
 b.enemies=[{id:'e0',side:'enemy',name:'One-hit sentinel',unitId:null,
  count:1,initial:1,hp:250,atk:0,def:0,spd:1,pool:250,range:1,x:10,y:4}];s.battle=b;
 const result=E.battleAct(s,'attack');assert.equal(result.type,'win');
 assert.equal(result.dealt,250);assert.equal(result.lost,0);
 const evt=b.lastEvents.find(e=>e.actorId===p.id);assert.equal(evt.damage,250);assert.equal(evt.casualties,1);
 assert.equal(s.battleReports[0].enemies[0].lost,1);
 assert(E.strictSave(E.parseSave(E.serializeSave(s))));
 return {rawAttack:'over 250',applied:250,reportCount:s.battleReports.length};
});
check('P0 1000 seeded complete encounters across all 40 units and actual 1..100000 troops',()=>{
 const counts=[1,2,9,100,1000,10000,100000],heroMax=E.heroLimit(100);
 for(let i=0;i<1000;i++){
  const race=races[i%4],unit=C.units[race][Math.floor(i/4)%10],s=roundState(race);
  s.heroes[0].level=100;s.heroes[0].atk=8+(i*13)%120;s.heroes[0].def=0;
  const affordable=Math.floor(heroMax/E.unitValue(unit)),count=Math.max(1,Math.min(100000,affordable,counts[(i*13+Math.floor(i/40))%7]));
  s.army[unit.id]=count;E.setFormation(s,[{unitId:unit.id,count}]);
  const b=E.makeBattle(s,npc.key),p=b.allies[0];Object.assign(p,{x:9,y:4,spd:99});
  const defense=(i*7)%250,base=Math.max(unit.atk*.3,unit.atk*unit.atk/(unit.atk+defense));
  const expected=Math.max(1,Math.floor(count*base*(1+s.heroes[0].atk/100)));
  const hp=Math.max(2,expected*2);
  b.enemies=[{id:'e0',side:'enemy',name:'Deterministic sentinel',unitId:null,count:1,initial:1,
   hp,atk:0,def:defense,spd:1,pool:hp,range:1,x:10,y:4}];s.battle=b;
  const original=E.clone(s),first=E.battleAct(s,'attack');
  assert.equal(first.type,'continue',race+' '+unit.id+' first turn');
  assert.equal(first.dealt,expected,race+' '+unit.id+' oracle');
  assert.equal(first.lost,0);
  const continued=i%25===0?E.parseSave(E.serializeSave(s)):s;
  const finished=E.battleAct(continued,'attack');
  assert.equal(finished.type,'win');
  assert.equal(finished.dealt,expected);
  assert.equal(first.dealt+finished.dealt,hp);
  assert.equal(continued.army[unit.id],count,'No phantom casualty against zero ATK');
  assert.equal(continued.battleReports.length,1,'Exactly one victory report');
  if(i%25===0){
   const mirror=E.parseSave(E.serializeSave(original));
   E.battleAct(mirror,'attack');const same=E.battleAct(mirror,'attack');
   assert.deepEqual([same.type,same.dealt,same.lost,mirror.army[unit.id]],
     [finished.type,finished.dealt,finished.lost,continued.army[unit.id]]);
   assert(E.strictSave(E.parseSave(E.serializeSave(continued))));
  }
  encounters++;fullBattles++;
 }
 return {fullBattles,unitCatalog:40,largeGroupMax:100000,checkpointReloadEvery:25};
});
check('P0 7v7 mixed tactical 4-race scenarios have no negative armies, duplicate positions or invalid saves',()=>{
 for(const race of races)for(let trial=0;trial<8;trial++){
  const s=roundState(race);s.heroes[0].level=100;s.heroes[0].atk=10+trial;s.heroes[0].def=8+trial;
  const groups=[];
  for(let i=0;i<7;i++){const u=C.units[race][i],n=10+trial*4+i*3;s.army[u.id]=n;groups.push({unitId:u.id,count:n});}
  E.setFormation(s,groups);const b=E.makeBattle(s,npc.key);
  assert.equal(b.allies.length,7);
  const enemyRace=races[(races.indexOf(race)+1+trial%3)%4];
  b.enemies=Array.from({length:7},(_,i)=>{const u=C.units[enemyRace][i];const n=12+trial*3+i;
   return {id:'e'+i,side:'enemy',unitId:u.id,name:u.name,range:E.unitTacticalRange(u),count:n,initial:n,
    hp:u.hp,atk:u.atk,def:u.def,spd:u.spd,pool:n*u.hp,x:10,y:i+1};});
  s.battle=b;
  let rounds=0,last;
  while(s.battle&&rounds++<30){
   last=E.battleAct(s,'attack');
   validPools(b);
   const live=[...b.allies,...b.enemies].filter(u=>u.pool>0);
   const occupied=new Set(live.map(u=>u.x+','+u.y));
   assert.equal(occupied.size,live.length,'Two living groups overlap');
   assert(b.lastEvents.length<=14);
   assert(b.lastEvents.every(e=>e.damage>=0&&Number.isFinite(e.damage)&&e.casualties>=0));
   assert(E.strictSave(s),'Invalid 7v7 combat state');
   if(rounds===3&&s.battle){const clone=E.parseSave(E.serializeSave(s));assert.equal(JSON.stringify(stableBattle(clone.battle)),JSON.stringify(stableBattle(s.battle)));}
  }
  assert(last&&['win','lose','timeout','continue'].includes(last.type));
  assert(rounds<31,'7v7 tactical stalemate not resolved within 30 turns');
  for(const u of C.units[race])assert(Number.isSafeInteger(s.army[u.id])&&s.army[u.id]>=0,'Negative army count');
  assert(E.strictSave(E.parseSave(E.serializeSave(s))));
  sevenBySeven++;
 }
 return {matches:sevenBySeven,allyGroups:7,enemyGroups:7,maxTurns:30};
});
check('P0 production five resources across 6 independent cities / 30 offline days stays bounded and replay-safe',()=>{
 const s=roundState();s.fame=1_000_000;s.speed=1;
 const original=['9,10','16,5','23,8','5,13','12,12'];
 for(const key of original){
  const tile=E.getTile(key),seed=E.make(tile.race,s.lastTick);
  const c=E.clone(seed.cities[0]);c.id='qa-'+key.replace(',','-');c.key=key;c.name='QA '+key;c.main=false;c.sourceStatus='QA_STRESS';
  s.cities.push(c);
 }
 const mines=E.TILES.filter(t=>t.kind==='mine').slice(0,5);
 assert.equal(mines.length,5);
 for(let i=0;i<mines.length;i++)s.mines.push({key:mines[i].key,res:mines[i].value,level:mines[i].level,cityId:s.cities[i].id});
 const expected=new Map();
 for(const city of s.cities){
  E.switchCity(s,city.id);s.res={gold:0,wood:0,ore:0,sulfur:0,crystal:0};s.buildings.warehouse=10;
  expected.set(city.id,{hourly:{...E.rate(s)},limits:{...E.limits(s)},initial:{...s.res}});
 }
 E.switchCity(s,'main');E.syncCityState(s);
 let loaded=E.parseSave(E.serializeSave(s)),now=loaded.lastTick;
 for(let day=1;day<=30;day++){
  now+=86_400_000;E.tick(loaded,now);
  if(day%5===0)loaded=E.parseSave(E.serializeSave(loaded));
  assert.equal(loaded.cities.length,6);
  for(const city of loaded.cities){
   const stats=expected.get(city.id);
   for(const k of symbols){
    const want=Math.min(stats.limits[k],stats.initial[k]+stats.hourly[k]*24*day);
    assert(Math.abs(city.local.res[k]-want)<1e-5,`${city.id} day${day} ${k}: ${city.local.res[k]} != ${want}`);
    assert(city.local.res[k]>=0&&city.local.res[k]<=stats.limits[k]+1e-5);
   }
  }
  assert(Array.isArray(loaded.log)&&loaded.log.length<=100,'Global log must stay capped at day '+day+': '+loaded.log.length);
  assert(loaded.log.every(line=>typeof line==='string'&&line.length<=500),'Log item limit at day '+day);
  const ownedKeys=new Set(loaded.cities.map(c=>c.key));
  assert.equal(ownedKeys.size,6);
  assert.equal(Object.keys(loaded.aiCities).length,36,'AI ownership must not duplicate');
  if(!E.strictSave(loaded)){
   const trial=change=>{const x=E.clone(loaded);change(x);return E.strictSave(x)};
   const fresh=E.make('human',loaded.lastTick);
   const diagnostic={
    day,now:loaded.lastTick,active:loaded.activeCityId,ap:loaded.ap,apMax:loaded.apMax,
    logLength:loaded.log.length,logLargest:Math.max(...loaded.log.map(x=>x?.length||0)),badLogs:loaded.log.filter(x=>typeof x!=='string'||x.length>500).slice(0,3),
    aiCount:Object.keys(loaded.aiCities).length,aiLevels:Object.values(loaded.aiCities).reduce((o,a)=>(o[a.level]=(o[a.level]||0)+1,o),{}),
    cities:loaded.cities.map(c=>({id:c.id,race:c.race,res:c.local.res,warehouse:c.local.buildings.warehouse,tavernRound:c.local.tavern.round})),
    noMines:trial(x=>{x.mines=[]}),freshAI:trial(x=>{x.aiCities=E.clone(fresh.aiCities)}),
    noLog:trial(x=>{x.log=[]}),freshDaily:trial(x=>{x.dailyTaskState=E.clone(fresh.dailyTaskState);x.china2009DailyTaskState=E.clone(fresh.china2009DailyTaskState)}),
    freshTaverns:trial(x=>{for(const c of x.cities){c.local.tavern=E.clone(E.make(c.race,x.lastTick).tavern)}x.tavern=E.clone(x.cities.find(c=>c.id===x.activeCityId).local.tavern)}),
    singleCity:trial(x=>{x.cities=[x.cities.find(c=>c.main)]}),
   };
   throw Error('P0 invalid production v07 snapshot: '+JSON.stringify(diagnostic));
  }
 }
 const before=JSON.stringify(loaded);E.tick(loaded,now);assert.equal(JSON.stringify(loaded),before);
 return {days:30,ownedCities:6,aiCities:36,resources:5,offlineCapHours:24,snapshots:6};
});
check('P0 warehouse caps and market/source consumption never create negative or duplicated resources',()=>{
 const s=roundState();s.speed=1;
 const beforeBuild={...s.res};
 const cost=E.buildCost(s,'market');E.upgrade(s,'market');
 for(const k of symbols)assert(Math.abs(s.res[k]-(beforeBuild[k]-cost[k]))<1e-6,'Build cost not deducted exactly: '+k);
 assert(s.buildingQueue);
 const done=s.lastTick+(s.buildingQueue.remaining+1)*1000;
 E.tick(s,done);assert.equal(s.buildings.market,1);assert.equal(s.buildingQueue,null);
 const oldGold=s.res.gold,oldWood=s.res.wood;
 E.sell(s,'wood',10);assert.equal(s.res.wood,oldWood-10);assert.equal(s.res.gold,oldGold+20);
 const snapshot=E.parseSave(E.serializeSave(s));const res={...snapshot.res};E.tick(snapshot,done);
 assert.equal(JSON.stringify(snapshot.res),JSON.stringify(res));
 snapshot.res.gold=E.limits(snapshot).gold;
 const before=JSON.stringify(snapshot);
 assert.throws(()=>E.sell(snapshot,'wood',1),/Kho vàng/);
 assert.equal(JSON.stringify(snapshot),before);
 for(const k of symbols){snapshot.res[k]=E.limits(snapshot)[k]-1;E.add(snapshot,{[k]:1000});assert(snapshot.res[k]<=E.limits(snapshot)[k]+1e-7);}
 assert(E.strictSave(E.parseSave(E.serializeSave(snapshot))));
 return {market:'atomic',warehouse:'clamped',save:'valid'};
});
check('P0 60 world-castle routes are deterministic, legal and have stable world ETA',()=>{
 const home='3,4',sites=E.TILES.filter(t=>t.kind==='castle');assert.equal(sites.length,60);
 const seen=new Set();
 for(const tile of sites){
  const p=E.pathfind(home,tile.key);assert(p&&p.length>=1);assert.equal(p[0],home);assert.equal(p.at(-1),tile.key);
  assert.deepEqual(E.pathfind(home,tile.key),p,'Nondeterministic Dijkstra route');
  for(let i=1;i<p.length;i++){
   const a=E.getTile(p[i-1]),b=E.getTile(p[i]);
   assert.equal(Math.abs(a.x-b.x)+Math.abs(a.y-b.y),1);
   assert.notEqual(b.terrain,'water');
  }
  if(p.length>1){
   const e1=E.marchDuration(10,p,.8),e2=E.marchDuration(10,p,1.1);
   assert(e1>=e2&&e1>=40&&Number.isSafeInteger(e1));
   seen.add(tile.key);
  }
 }
 return {reachableCastles:seen.size,totalCastles:sites.length};
});
const out={phase:'HG16-G4',generatedAt:new Date().toISOString(),checks,failed:failures,passed:checks.length-failures,
 seededCompletedEncounters:fullBattles,sevenBySevenMatches:sevenBySeven};
const folder=path.join(__dirname,'docs','qa','hg16');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'g4-stress-receipt.json'),JSON.stringify(out,null,2));
console.log('HG16-G4 CORE STRESS '+out.passed+'/'+checks.length+' PASS; '+fullBattles+' seeded encounters; '+sevenBySeven+' 7v7 battles');
if(failures)process.exitCode=1;
