/* HG40.5 - player requested troop-training acceleration 100x.
 * Direct real engine checks; no mock train completes or fake resources.
 * Save v07 kept. Old HG39 paid training is rescaled exactly once.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console});
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js'.split(' ');
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,checks=[];
function test(name,run){const evidence=run();checks.push({name,pass:true,evidence});console.log('HG40.5 PASS '+name)}
function roundtrip(s){assert(E.strictSave(s),'Source Save v07 invalid');const restored=E.parseSave(E.serializeSave(s));assert(E.strictSave(restored),'Reload Save v07 invalid');return restored}
test('40 canonical troop IDs use 5000x new recruit speed; 50x legacy divisor is NOT compounded twice',()=>{
 const ids=[];
 assert.equal(E.HG39_CONFIG.recruitSpeedMultiplier,5000);
 assert.equal(E.HG39_CONFIG.minimumRecruitGameSeconds,1);
 for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,1e6);
  assert.equal(s.version,7);
  assert.equal(s.hgRecruit100.version,1,'New games must carry the new queue migration marker');
  for(const u of C.units[race]){
   for(const count of [1,10,100,1000]){
    const old=Math.max(1,Math.ceil(u.timeSec*count/50)),
          expected=Math.max(1,Math.ceil(u.timeSec*count/5000)),
          actual=E.recruitDuration(s,u,count);
    assert.equal(actual,expected,u.id+' x'+count);
    assert(actual<=old,u.id+' cannot become slower');
    if(old>=100)assert(actual<=Math.ceil(old/100)+1,u.id+' must honor ~100x speedup');
   }
   ids.push(u.id);
  }
 }
 assert.equal(new Set(ids).size,40);
 return {coreUnits:ids.length,cases:160,oldSpeed:50,newSpeed:5000};
});
test('Old v07 paid 50x queues migrate /100 exactly once with progress, count, gold and ETA preserved',()=>{
 const s=E.make('human',1e6);
 s.speed=1;
 const original={id:s.serial++,unitId:'human_1',count:5000,total:12000,remaining:6600};
 s.training=[{...original}];
 s.cities.find(c=>c.id===s.activeCityId).local.training=[{...original}];
 const paid=JSON.stringify(s.res),initialArmy=s.army.human_1,serial=s.serial;
 delete s.hgRecruit100;
 const loaded=E.parseSave(JSON.stringify(s));
 assert.equal(loaded.version,7);
 assert.equal(loaded.training[0].total,120);
 assert.equal(loaded.training[0].remaining,66);
 assert.equal(loaded.training[0].count,5000);
 assert.equal(loaded.training[0].id,original.id);
 assert.equal(loaded.cities.find(c=>c.id===loaded.activeCityId).local.training[0].remaining,66);
 assert.equal(JSON.stringify(loaded.res),paid);
 assert.equal(loaded.army.human_1,initialArmy);
 assert.equal(loaded.serial,serial);
 assert.equal(loaded.hgRecruit100.version,1);
 const reloaded=roundtrip(loaded);
 assert.equal(reloaded.training[0].remaining,66,'Reload must not accelerate second time');
 assert.equal(reloaded.training[0].total,120);
 E.tick(reloaded,reloaded.lastTick+66*1000+100);
 assert.equal(reloaded.army.human_1,initialArmy+5000);
 assert.equal(reloaded.training.length,0);
 assert(E.strictSave(reloaded));
 return {oldSeconds:12000,newSeconds:120,remainingBefore:6600,remainingAfter:66,save:7,unitsDelivered:5000};
});
test('Old pre-HG39 v07 saves get old /50 then new /100, not 5000x twice',()=>{
 const s=E.make('elf',1e6);
 const queue={id:s.serial++,unitId:'elf_1',count:100,total:50000,remaining:25000};
 s.training=[{...queue}];delete s.hg39;delete s.hgRecruit100;
 const loaded=E.parseSave(JSON.stringify(s));
 assert.equal(loaded.hg39.version,1);
 assert.equal(loaded.hgRecruit100.version,1);
 assert.equal(loaded.training[0].total,10);
 assert.equal(loaded.training[0].remaining,5);
 const cold=roundtrip(loaded);
 assert.equal(cold.training[0].total,10);
 assert.equal(cold.training[0].remaining,5);
 return {preHG39:50000,postHG39:1000,postHG405:10,remaining:5};
});
test('Already-minimal queue retains one game-second duration and half-complete fraction',()=>{
 const s=E.make('orc',1e6);const q={id:s.serial++,unitId:'orc_1',count:1,total:1,remaining:0.5};
 s.training=[q];delete s.hgRecruit100;
 const loaded=E.parseSave(JSON.stringify(s));
 assert.equal(loaded.training[0].total,1);
 assert.equal(loaded.training[0].remaining,0.5);
 return {minGameSec:1,remaining:0.5};
});
test('All inactive city queues migrate once; zero training work is not re-created',()=>{
 const s=E.make('undead',1e6);
 s.training=[{id:s.serial++,unitId:'undead_1',count:8,total:2000,remaining:1000}];
 s.cities.push({local:{training:[
  {id:1009,unitId:'elf_1',count:10,total:3000,remaining:750},
  {id:1010,unitId:'elf_2',count:2,total:100,remaining:0}
 ]}});
 delete s.hgRecruit100;
 E.ensure05(s);
 assert.equal(s.training[0].total,20);
 assert.equal(s.training[0].remaining,10);
 const q=s.cities[1].local.training;
 assert.equal(q[0].total,30);
 assert.equal(q[0].remaining,7.5);
 assert.equal(q[1].total,1);
 assert.equal(q[1].remaining,0);
 E.ensure05(s);
 assert.equal(s.training[0].total,20);
 assert.equal(q[0].total,30);
 return {citiesWithTraining:2,replayedMigration:false};
});
test('New paid recruitment still charges once, decrements exactly one queue and survives v07 Save',()=>{
 for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,1e6),u=C.units[race][0];
  for(const resource of E.C.keys)s.res[resource]=E.limits(s)[resource];
  s.speed=1;
  const count=100,base=s.army[u.id];
  const goldBefore=s.res.gold,spent=E.recruit(s,u.id,count);
  assert.equal(s.res.gold,goldBefore-spent.gold);
  assert.equal(s.army[u.id],base);
  assert.equal(s.training.at(-1).total,E.recruitDuration(s,u,count));
  const reloaded=roundtrip(s);
  const eta=reloaded.training[0].remaining;
  E.tick(reloaded,reloaded.lastTick+Math.ceil(eta+1)*1000);
  assert.equal(reloaded.training.length,0);
  assert.equal(reloaded.army[u.id],base+count);
  assert.equal(reloaded.res.gold,s.res.gold+E.rate(reloaded).gold*(Math.ceil(eta+1)/3600) > 0,true);
  assert(E.strictSave(reloaded));
 }
 return {races:4,paidExactlyOnce:true,armyMintedBeforeCompletion:false,saveVersion:7};
});
const receipt={schema:'HG40.5-Training-100x-v1',status:'PASS',
 count:checks.length,checks,saveVersion:E.V,unitCount:40,previousMultiplier:50,appliedMultiplier:5000,
 caveat:'The one-game-second queue minimum limits effective acceleration for already-short tasks.'};
const dest=path.join(__dirname,'docs/qa/hg405-training-100x.json');
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify(receipt,null,2)+'\n');
console.log('HG40.5 100x TRAINING '+checks.length+'/'+checks.length+' PASS (40 units, paid queues, multicity, Save v07)');
