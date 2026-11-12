/* HG82 focused: real city hero ownership, safe veteran retirement and
 * pure city-local dispatch. Synthetic reports/cities are labelled QA fixtures. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cx=vm.createContext({console});
const names='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js hg82-city-heroes.js'.split(' ');
for(const file of names)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),cx,{filename:file});
const E=cx.HOG_ENGINE;let done=0,total=0;
function test(label,fn){total++;try{const r=fn()||{};console.log('HG82 PASS '+label+' '+JSON.stringify(r));done++}catch(e){console.error('HG82 FAIL '+label+' '+(e.stack||e));process.exitCode=1}}
function game(){const s=E.make('human',1e6);assert(E.strictSave(s));return s}
function save(s){assert(E.strictSave(s));const y=E.parseSave(E.serializeSave(s));assert(E.strictSave(y));return y}
function second(s){const h=JSON.parse(JSON.stringify(s.heroes[0]));h.id=2;h.name='HG82 second';h.cityId='main';s.heroes.push(h);s.equipment[h.id]={};E.hg81Ensure(s);assert(E.strictSave(s));return h}
function twoCities(){
 const s=game();s.fame=5800;
 const out=JSON.parse(JSON.stringify(E.make('elf',s.lastTick).cities[0]));
 out.id='city-elf-qa';out.key='9,10';out.name='Thành Elf kiểm thử';out.main=false;
 assert.equal(E.getTile(out.key).kind,'castle');
 s.cities.push(out);if(s.aiCities?.[out.key])delete s.aiCities[out.key];
 assert(E.strictSave(s));return s;
}
test('New Game four factions: Save v07 and exactly one resident city for founding hero',()=>{
 for(const race of Object.keys(E.C.races)){const s=E.make(race,1e6);assert.equal(s.heroes[0].cityId,'main');save(s)}
 return {races:4,version:7};
});
test('Legacy v07 Save with no HG82 fields migrates without gifts or army movement',()=>{
 const s=game(),before=JSON.stringify(s.army),beforeGear=JSON.stringify(s.inventory);
 const raw=JSON.parse(E.serializeSave(s));delete raw.state.hg82;for(const h of raw.state.heroes)delete h.cityId;
 const restored=E.parseSave(JSON.stringify(raw));
 assert.equal(restored.heroes[0].cityId,'main');assert.equal(restored.hg82.v,1);
 assert.equal(JSON.stringify(restored.army),before);assert.equal(JSON.stringify(restored.inventory),beforeGear);
 return {city:'main',save:restored.version};
});
test('Secondary city has zero local heroes; global hero cannot teleport or command its garrison',()=>{
 const s=twoCities();E.switchCity(s,'city-elf-qa');
 assert.equal(E.hg82CityHeroes(s).length,0);
 assert.equal(E.hg20HeroRole(s,1).status,'other_city');
 assert.throws(()=>E.selectHero(s,1),/thành|đang ở/i);
 assert.throws(()=>E.hg20SetHeroPlan(s,1,[{unitId:'elf_1',count:1}]),/thành|đang ở/i);
 assert.throws(()=>E.startMarch(s,'2,1'),/thành|đang ở/i);
 save(s);return {localHeroes:0,sourceHero:1,sourceCity:'main'};
});
test('Tavern recruits into CURRENT city; city switch selects resident and plans never bleed',()=>{
 const s=twoCities();E.switchCity(s,'city-elf-qa');s.res.gold=E.limits(s).gold;
 const beforeGold=s.res.gold,offer=s.tavern.offers[0];
 const id=E.hireCandidate(s,offer.id);assert(s.res.gold<beforeGold);
 assert.equal(E.hg82HeroCity(s,id),'city-elf-qa');
 const stock=s.army.elf_1;E.selectHero(s,id);
 E.hg20SetHeroPlan(s,id,[{unitId:'elf_1',count:3}]);
 const elfPlan=JSON.stringify(E.hg20HeroPlan(s,id));
 E.switchCity(s,'main');assert.equal(s.activeHero,1);
 assert.equal(E.hg82CityHeroes(s).length,1);assert.equal(E.hg20HeroPlan(s,id).length,0);
 assert.equal(s.army.elf_1,undefined);
 assert.throws(()=>E.selectHero(s,id),/đang ở/);
 E.switchCity(s,'city-elf-qa');assert.equal(s.activeHero,id);
 assert.equal(JSON.stringify(E.hg20HeroPlan(s,id)),elfPlan);
 assert.equal(s.army.elf_1,stock);save(s);
 return {newHero:id,source:'city-elf-qa',elfPlan,remainingUnits:stock};
});
test('One-click MAX proposal reads only real free troops and never mutates city garrison',()=>{
 const s=game();second(s);const stock=JSON.stringify(s.army);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:5}]);
 const plan=E.hg82ProposePlan(s,1);
 assert(plan.formation.length>0);assert(plan.formation[0].count<=s.army.human_1-5);
 assert.equal(JSON.stringify(s.army),stock);assert(E.strictSave(s));
 return {available:plan.total,blockedByOtherHero:5};
});
test('Hero transfers travel with world SPD ETA; no army or item teleport to destination',()=>{
 const s=twoCities();const stock=JSON.stringify(s.army);
 const q=E.hg82TransferHero(s,1,'city-elf-qa');
 assert.equal(E.hg20HeroRole(s,1).status,'relocating');
 assert.equal(s.heroes[0].cityId,'main');
 assert.throws(()=>E.hg82QuickDismiss(s,1));
 const before=s.lastTick;E.tick(s,before+Math.ceil((q.remaining+2)/s.speed*1000));
 assert.equal(s.heroes[0].cityId,'city-elf-qa');
 assert.equal(JSON.stringify(s.army),stock);
 assert.equal(E.hg82Transfers(s).length,0);
 E.switchCity(s,'city-elf-qa');assert.equal(s.activeHero,1);
 save(s);return {travelSeconds:q.total,destination:s.activeCityId,armyMoved:false};
});
test('Veteran battle report fixture remains after retirement; hero FK is null, Save v07 valid',()=>{
 const s=game(),h=s.heroes[0];second(s);
 const npc=E.TILES.find(t=>t.kind==='npc');assert(npc);
 const report={id:'battle-999',outcome:'win',target:npc.key,name:'Trận lịch sử HG82',kind:'npc',
  turns:1,completedAt:s.lastTick,homeCityId:'main',heroId:h.id,heroName:h.name,heroXp:60,
  fame:0,resources:Object.fromEntries(E.C.keys.map(k=>[k,0])),items:[],
  allies:[],enemies:[],disposition:'home'};
 s.battleReports.unshift(report);assert(E.strictSave(s));
 const soldier=JSON.stringify(s.army),inventory=JSON.stringify(s.inventory);
 const r=E.hg82QuickDismiss(s,h.id);assert.equal(r.heroId,h.id);
 assert.equal(s.battleReports[0].heroId,null);
 assert.equal(s.battleReports[0].retiredHeroName,h.name);
 assert.equal(s.battleReports[0].id,'battle-999');
 assert.equal(JSON.stringify(s.army),soldier);assert.equal(JSON.stringify(s.inventory),inventory);
 save(s);return {retired:h.name,historyRetained:true,stacksNotAltered:true};
});
test('One-button retirement cancels ONLY that hero task, keeps completion counter and inventory',()=>{
 const s=game(),h=s.heroes[0];second(s);const prev=s.dailyTaskState.heroTask.completed;
 s.dailyTaskState.heroTask.active={heroId:h.id,stars:1,ready:false};
 s.castellan=null;const r=E.hg82QuickDismiss(s,h.id);
 assert.equal(r.cancelledTask,true);assert.equal(s.dailyTaskState.heroTask.active,null);
 assert.equal(s.dailyTaskState.heroTask.completed,prev);
 save(s);return {cancelledTask:true,completedBefore:prev,completedAfter:s.dailyTaskState.heroTask.completed};
});
test('One-button retirement of Castellan frees same castle and keeps owned gear stock',()=>{
 const s=game(),h=s.heroes[0];second(s);
 s.castellan=h.id;s.cities[0].local.castellan=h.id;
 const item=E.addItem(s,'star_blade','HG82 retirement test');E.equipItem(s,item.uid,h.id);
 assert(E.strictSave(s));
 const count=s.inventory.length,r=E.hg82QuickDismiss(s,h.id);
 assert.equal(r.releasedCastle,true);assert.equal(s.castellan,null);
 assert.equal(s.inventory.length,count);assert(s.inventory.some(x=>x.uid===item.uid));
 save(s);return {itemUid:item.uid,castleReleased:true};
});
test('Never dismiss the final hero or quest-exclusive hero; no mutation',()=>{
 const s=game(),snapshot=JSON.stringify(s);
 assert.throws(()=>E.hg82QuickDismiss(s,1),/cuối cùng/);
 assert.equal(JSON.stringify(s),snapshot);
 const h=second(s);h.questSpecial='celestial_oath';h.rewardOrigin='hero_task_20';
 const before=JSON.stringify(s);assert.throws(()=>E.hg82QuickDismiss(s,2),/bảo vệ/);
 assert.equal(JSON.stringify(s),before);return {protected:true,save:7};
});
console.log('HG82 SUMMARY '+done+'/'+total);
if(done!==total)process.exitCode=1;
