/* HG20 focused private gameplay smoke; fixture-only assertions are labeled.
 * Four natural New Games must afford real basic recruits, assign real soldier
 * pools, clear reward-capped tower floors and survive v07 serialization.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
for(const p of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
let pass=0;const checks=[];
function check(name,fn){try{const data=fn();pass++;checks.push({name,pass:true,data});console.log('HG20 PASS '+name+' '+JSON.stringify(data||{}));}catch(e){checks.push({name,pass:false,error:e.stack});console.error('HG20 FAIL '+name+' '+e.stack);process.exitCode=1;}}
const serial=s=>E.parseSave(E.serializeSave(s));
for(const race of Object.keys(C.races)){
 check(race+' fresh castle, real payment, tower daily rewards and v07 roundtrip',()=>{
  const s=E.make(race,1_000_000),u=C.units[race][0];
  assert.equal(s.version,7);assert(s.res.gold>=25000,'Private start must be generous');
  assert.equal(C.units[race].length,10);assert(C.rewardUnits[race].some(x=>x.towerExclusive));
  const wage=E.recruitCost(s,u,45),before=s.res.gold;E.recruit(s,u.id,45);
  assert(s.res.gold<before,'Paid troop training did not charge gold');
  E.tick(s,s.lastTick+(E.recruitDuration(s,u,45)+2)*1000/s.speed);
  assert.equal(s.army[u.id],61);
  E.hg20SetHeroPlan(s,1,[{unitId:u.id,count:61}]);
  assert(E.hg20HeroRole(s,1).army[0].count===61);
  E.hg20ChooseTowerTeam(s,[1]);
  const floors=[];
  for(let n=0;n<6;n++)floors.push(E.hg20TowerClimb(s));
  assert.equal(floors[0].outcome,'win','Starter troops should win introductory tower');
  const successes=floors.filter(x=>x.outcome==='win');
  assert(successes.length>=5,'Private tower should allow at least 5 reward climbs with paid 61 rookies');
  assert.equal(s.hg20.tower.claims,5,'5 wins/day reward cap');
  assert.equal(floors[5].rewardEssence,0,'6th successful floor must not pay rewards');
  assert(s.hg20.tower.essence>0);
  const beforeRank=s.hg20.tower.rank;
  E.hg20TowerUpgrade(s);assert.equal(s.hg20.tower.rank,beforeRank+1);
  assert(E.strictSave(s),'Private-state v07 invalid');
  const loaded=serial(s);assert.equal(loaded.hg20.tower.claims,5);
  assert.equal(loaded.hg20.tower.rank,1);
  E.tick(loaded,loaded.lastTick+86400000);assert.equal(E.hg20TowerStatus(loaded).claims,0);
  return {race,first:successes[0].floor,nextFloor:s.hg20.tower.floor,paidWage:wage.gold,limit:5};
 });
}
check('Concurrent hero plans reserve unique soldiers, and select toggles active formation',()=>{
 const s=E.make('human',1000000),h1=s.heroes[0];
 // Second hero is a controlled fixture solely for allocation isolation;
 // Tavern recruitment with Fame limits is separately exercised by HG08.
 const h2={...h1,id:999,name:'Hộ Vệ Thứ Hai'};s.heroes.push(h2);
 E.hg20SetHeroPlan(s,h1.id,[{unitId:'human_1',count:9}]);
 E.hg20SetHeroPlan(s,h2.id,[{unitId:'human_1',count:7}]);
 assert.throws(()=>E.hg20SetHeroPlan(s,h2.id,[{unitId:'human_1',count:8}]),/không đủ/i);
 assert.equal(s.hg20.plans['main:999'][0].count,7);
 E.selectHero(s,999);assert.equal(s.formation[0].count,7);
 E.selectHero(s,1);assert.equal(s.formation[0].count,9);
 E.hg20ChooseTowerTeam(s,[1,999]);
 assert(E.hg20TowerPower(s).power>0);
 assert(E.strictSave(s));
 return {hero1:9,hero2:7,total:16,team:s.hg20.tower.team};
});
check('Special reward unit cannot be bought and has nonzero command value',()=>{
 const s=E.make('orc',1000000),u=C.rewardUnits.orc.find(x=>x.towerExclusive);
 assert(u&&u.rewardOnly);assert(E.unitValue(u)>0);
 assert.throws(()=>E.recruit(s,u.id,1),/chỉ nhận qua nhiệm vụ/);
 return {id:u.id,power:E.unitValue(u)};
});
check('Mystic city exists as a real capturable world castle, not an icon-only unlock',()=>{
 const s=E.make('human',1_000_000),city=E.hg20CastleStatus(s),tile=E.getTile(city.worldCityKey);
 assert(tile&&tile.kind==='castle'&&tile.aiOwner);
 assert.equal(tile.value,'Thành Huyền Tích');
 assert(E.pathfind('3,4',tile.key));
 assert(!city.worldCityOwned);
 return {key:tile.key,name:tile.value};
});
check('Floor-25 collection yields real equipable gear and Save-preserved floor scaling (high-floor setup fixture)',()=>{
 const s=E.make('human',1_000_000);
 s.hg20.tower.floor=25;s.hg20.tower.rank=20; // declared high-floor fixture; no organic progression claim.
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);
 E.hg20ChooseTowerTeam(s,[1]);
 // Ensure the fixture army genuinely meets the calculated tower threshold.
 const power=E.hg20TowerPower(s);assert(power.power>E.hg20TowerStatus(s).enemyPower);
 const r=E.hg20TowerClimb(s);
 assert.equal(r.outcome,'win');assert(r.itemUid>0,'No actual inventory equipment');
 const item=s.inventory.find(i=>i.uid===r.itemUid);assert(item);
 assert(E.ITEMS[item.itemId].towerExclusive&&item.towerFloor===25);
 const base=E.heroStats(s,1).atk;
 E.equipItem(s,item.uid,1);
 assert(E.heroStats(s,1).atk>base,'Equipping tower gear must improve hero');
 assert(E.strictSave(s));
 const loaded=serial(s);assert.equal(loaded.inventory.find(x=>x.uid===item.uid).towerFloor,25);
 assert.equal(loaded.hg20.tower.floor,26);
 return {item:item.itemId,level:item.towerFloor,powerDelta:E.heroStats(loaded,1).atk-base};
});
check('Legacy v07 save loads without minting free gold or units',()=>{
 const prev=vm.createContext({console});for(const p of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),prev,{filename:p});
 const legacy=prev.HOG_ENGINE.make('human',1000000),gold=legacy.res.gold;
 const loaded=E.parseSave(prev.HOG_ENGINE.serializeSave(legacy));
 assert.equal(loaded.res.gold,gold);assert.equal(loaded.hg20.tower.floor,1);
 assert(E.strictSave(loaded));
 return {gold,save:loaded.version};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg20'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg20/core.json'),JSON.stringify({passed:pass,total:checks.length,checks},null,2));
console.log('HG20 private gameplay '+pass+'/'+checks.length+(pass===checks.length?' PASS':' FAIL'));
