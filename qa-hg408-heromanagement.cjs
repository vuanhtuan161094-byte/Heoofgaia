/* HG40.8 authoritative engine/Save v07 tests. Explicit fixtures are not gameplay grants. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js'.split(' ');
const ctx=vm.createContext({console});
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
const evidence=[];
function test(name,fn){
 try{const data=fn()||{};evidence.push({name,status:'PASS',data});console.log('HG40.8 PASS '+name+' '+JSON.stringify(data))}
 catch(e){evidence.push({name,status:'FAIL',error:String(e.stack||e)});process.exitCode=1;console.error('HG40.8 FAIL '+name+' '+String(e.stack||e))}
}
function newGame(race='human'){const s=E.make(race,Date.now());assert.equal(s.version,7);assert(E.strictSave(s));return s}
function hero2(s){const hero=JSON.parse(JSON.stringify(s.heroes[0]));hero.id=2;hero.name='QA thứ hai';hero.quality='purple';s.heroes.push(hero);s.equipment[2]={};assert(E.strictSave(s));return hero}
function save(s){assert(E.strictSave(s));const copy=E.parseSave(E.serializeSave(s));assert(E.strictSave(copy));return copy}
function json(x){return JSON.stringify(x)}
test('New Game all four races has stable quality and strict v07 Save',()=>{
 const report=[];
 for(const race of ['human','elf','orc','undead']){
  const s=newGame(race),h=s.heroes[0];assert(['white','blue','yellow','green','purple'].includes(h.quality));
  const before=h.quality;h.statPoints=1;E.allocateHeroPoint(s,h.id,'atk');assert.equal(E.hg408HeroQuality(h),before);
  const loaded=save(s);assert.equal(loaded.heroes[0].quality,before);
  report.push({race,quality:before,version:loaded.version});
 }
 return report;
});
test('Legacy v07 save without quality migrates only quality; no gold, item or army edit',()=>{
 const s=newGame();hero2(s);delete s.heroes[0].quality;delete s.heroes[1].quality;
 const before={gold:json(s.res),army:json(s.army),inventory:json(s.inventory),heroes:s.heroes.length};
 const loaded=E.parseSave(JSON.stringify(s));
 assert(['white','blue','yellow','green','purple'].includes(loaded.heroes[0].quality));
 assert.equal(loaded.heroes[1].quality,'purple'===loaded.heroes[1].quality?'purple':E.hg408HeroQuality(loaded.heroes[1]));
 assert.equal(json(loaded.res),before.gold);assert.equal(json(loaded.army),before.army);assert.equal(json(loaded.inventory),before.inventory);
 assert.equal(loaded.heroes.length,before.heroes);assert(E.strictSave(loaded));return {save:loaded.version,quality:loaded.heroes.map(h=>h.quality)};
});
test('Valid dismissal releases tower, HG20 plan, HG24 template and gear without altering inventory/troops/resources',()=>{
 const s=newGame(),h=hero2(s);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:3}]);
 E.hg20ChooseTowerTeam(s,[2]);
 const uid=s.nextItem++,itemId=Object.keys(E.ITEMS)[0];
 s.inventory.push({uid,itemId,origin:'HG408 explicit QA fixture'});E.equipItem(s,uid,2);
 const before={res:json(s.res),army:json(s.army),inventory:json(s.inventory),heroCap:E.heroCountLimit(s.fame),count:s.heroes.length};
 const chk=E.hg408DismissCheck(s,2);assert(chk.allowed,chk.reasons.join('; '));
 const result=E.hg408DismissHero(s,2);
 assert.equal(s.heroes.length,before.count-1);assert(!s.heroes.some(x=>x.id===2));
 assert.equal(json(s.res),before.res);assert.equal(json(s.army),before.army);assert.equal(json(s.inventory),before.inventory);
 assert(!Object.hasOwn(s.equipment,'2'));assert.equal(Object.keys(s.hg20.plans).filter(x=>x.endsWith(':2')).length,0);
 assert(!s.hg20.tower.team.includes(2));assert.equal(E.hg408DanglingRefs(s,2).length,0);
 const loaded=save(s);assert.equal(loaded.heroes.length,1);assert(loaded.inventory.some(x=>x.uid===uid));
 return {...result,capacityBefore:before.heroCap,remaining:loaded.heroes.length};
});
test('Dismissal refuses last hero and Castellan, no mutation',()=>{
 const s=newGame();assert(!E.hg408DismissCheck(s,1).allowed);assert.throws(()=>E.hg408DismissHero(s,1));
 hero2(s);E.appoint(s,2);
 const before=json(s);assert(E.hg408DismissCheck(s,2).reasons.some(x=>x.includes('Castellan')));
 assert.throws(()=>E.hg408DismissHero(s,2));assert.equal(json(s),before);return {castellan:s.castellan};
});
test('Dismissal refuses any battle/march or stationed hero without modifying Save',()=>{
 const s=newGame();hero2(s);s.stationedHeroes.push({heroId:2,key:'5,5',homeKey:'3,4',homeCityId:'main',army:{},formation:[]});
 const before=json(s);assert(!E.hg408DismissCheck(s,2).allowed);assert.throws(()=>E.hg408DismissHero(s,2));assert.equal(json(s),before);
 s.stationedHeroes=[];s.march={phase:'outbound',heroId:1};
 assert(!E.hg408DismissCheck(s,2).allowed);
 s.march=null;s.battle={kind:'npc'};
 assert(!E.hg408DismissCheck(s,2).allowed);
 return {guard:'stationed, march, battle'};
});
test('Dismissal refuses active Boss hunt, including team member; stopped hunt may release',()=>{
 const s=newGame();hero2(s);s.hg26.enabled=true;s.hg26.phase='ready';s.hg26.config.heroId=2;s.hg26.config.target='1,1';
 assert(!E.hg408DismissCheck(s,2).allowed);
 s.hg26.enabled=false;s.hg26.phase='halted';s.hg26.config.target=null;
 const r=E.hg408DismissHero(s,2);assert.equal(r.heroId,2);assert.equal(s.hg26.config.heroId,null);assert(E.strictSave(s));
 return {huntHeroCleared:s.hg26.config.heroId,save:s.version};
});
test('Selected hero is replaced, does not resurrect old formation via HG20 compatibility migration',()=>{
 const s=newGame();hero2(s);E.selectHero(s,2);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:4}]);
 assert.equal(s.activeHero,2);const result=E.hg408DismissHero(s,2);
 assert.equal(result.activeHero,1);assert.equal(s.formation.length,0);
 const loaded=save(s);assert.equal(loaded.activeHero,1);
 assert(!Object.keys(loaded.hg20.plans).some(x=>x.endsWith(':2')));return {replacement:loaded.activeHero};
});
test('Ongoing hero task and missing/duplicated gear block atomic dismissal',()=>{
 const s=newGame();hero2(s);
 s.dailyTaskState.heroTask.active={heroId:2,stars:1,ready:false};
 assert(!E.hg408DismissCheck(s,2).allowed);
 s.dailyTaskState.heroTask.active=null;
 s.equipment[2].weapon=1234567;
 const before=json(s);assert.throws(()=>E.hg408DismissHero(s,2));assert.equal(json(s),before);
 delete s.equipment[2].weapon;
 const uid=s.nextItem++,itemId=Object.keys(E.ITEMS)[0];
 s.inventory.push({uid,itemId,origin:'HG408 test'});
 s.equipment[1].weapon=uid;s.equipment[2].weapon=uid;
 assert(!E.hg408DismissCheck(s,2).allowed);return {protected:'task and inventory integrity'};
});
test('Unrecognized persistent heroId reference blocks operation and leaves state unchanged',()=>{
 const s=newGame();hero2(s);s.futureSystem={heroId:2,critical:'do-not-delete'};
 const before=json(s);assert.throws(()=>E.hg408DismissHero(s,2),/tham chiếu/);assert.equal(json(s),before);
 return {blocked:true};
});
const root=path.join(__dirname,'docs','qa','hg408');fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(path.join(root,'hero-engine.json'),JSON.stringify({suite:'HG40.8 hero management',tests:evidence,passed:evidence.filter(x=>x.status==='PASS').length,total:evidence.length},null,2)+'\n');
console.log('HG40.8 SUMMARY '+evidence.filter(x=>x.status==='PASS').length+'/'+evidence.length);
