/* HG90 — exact-SHA full reset rewards, six divine gear, myth troops, true
 * 3x2 participant bonds and secondary city identity/army ownership.
 * Seeded resources/army/cities below are QA fixtures, not user rewards.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const modules='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js hg82-city-heroes.js hg88-tower-hero-cards.js hg89-mythic-heroes.js hg90-mythic-progression.js'.split(' ');
const cx=vm.createContext({console,Date,Math});
for(const name of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),cx,{filename:name});
const E=cx.HOG_ENGINE;let count=0,passed=0;
function test(label,fn){
 count++;try{const v=fn()||{};passed++;console.log('HG90 PASS '+label+' '+JSON.stringify(v))}
 catch(err){process.exitCode=1;console.error('HG90 FAIL '+label+' '+(err.stack||err))}
}
const fresh=(race='human')=>E.make(race,1000000);
const save=s=>{assert(E.strictSave(s),'Save not valid');const v=E.parseSave(E.serializeSave(s));assert(E.strictSave(v));return v};
const digest=s=>JSON.stringify(s);
function secondary(s){
 const c=E.clone(E.make('elf',s.lastTick).cities[0]);
 c.id='city-elf-hg90';c.key='9,10';c.name='Thành Tinh Linh';c.main=false;
 s.cities.push(c);if(s.aiCities?.[c.key])delete s.aiCities[c.key];
 assert(E.strictSave(s));return c;
}
test('new game 4 races retains Save v07 and includes four REAL T11 troop ids, 0 fragments',()=>{
 const out=[];
 for(const race of ['human','elf','orc','undead']){
  const s=fresh(race),p=E.hg90Status(s),u=E.getUnit(s,p.army.id);
  assert.equal(p.shards,0);assert(u&&u.tier===11&&u.rewardOnly);
  assert.equal(p.army.owned,0);
  assert.equal(save(s).version,7);
  out.push(u.id);
 }
 return {races:out};
});
test('HG89/legacy Save without HG90 migrates with zero gifts and keeps hero/army/fragments',()=>{
 const s=fresh();s.hg18.materials.resource_chest=123;
 const raw=JSON.parse(E.serializeSave(s)),army=digest(s.army),heroes=s.heroes.length;
 delete raw.state.hg90;
 const migrated=E.parseSave(JSON.stringify(raw));
 assert.equal(migrated.hg90.shards,0);
 assert.equal(migrated.heroes.length,heroes);
 assert.equal(digest(migrated.army),army);
 assert.equal(migrated.hg18.materials.resource_chest,123);
 return {v07:save(migrated).version,oldDivineFragments:123};
});
test('true win Tower floor 1 -> daily reset -> same full gold/EXP/essence plus new troop shards',()=>{
 const s=fresh();s.army.human_1=61;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:61}]);
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnableEndurance(s);
 function win(){
  E.hg21TowerEnter(s);let out={type:'continue'};
  for(let i=0;i<70&&s.battle;i++)out=E.battleAct(s,'attack');
  assert.equal(out.type,'win');assert.equal(s.battle,null);return out;
 }
 const first=win(),before={gold:s.res.gold,essence:s.hg20.tower.essence,
  xp:s.heroes.find(h=>h.id===1).xp,shards:s.hg90.shards};
 assert(first.claimed&&!first.replay);
 assert.equal(first.hg90TroopShards,6);
 E.hg88ResetTower(s);
 const repeat=win();
 assert(repeat.claimed&&repeat.replay&&!repeat.firstClear);
 assert.equal(repeat.rewardGold,first.rewardGold);
 assert.equal(repeat.rewardEssence,first.rewardEssence);
 assert.equal(repeat.heroXp,first.heroXp);
 assert.equal(repeat.hg90TroopShards,first.hg90TroopShards);
 assert.equal(s.hg90.shards,before.shards+6);
 assert.equal(s.hg20.tower.essence,before.essence+repeat.rewardEssence);
 assert.equal(s.hg20.tower.hg88.highest,1);
 assert.equal(s.hg90.towerWins,2);
 assert(save(s).hg90.shards===12);
 return {firstGold:first.rewardGold,repeatGold:repeat.rewardGold,
  expEach:repeat.heroXp,troopShards:12,replay:repeat.replay};
});
test('full 100/200/500 Tower fragment/Crown jackpot on replay; achievements deduplicated',()=>{
 const s=fresh();
 for(const floor of [10,25,100,200,500]){
  const a=E.hg88AwardTower(s,floor,{floor,firstClear:true});
  const before={small:s.hg18.materials.resource_card,large:s.hg18.materials.resource_chest,
   inventory:s.inventory.length,achievements:s.hg88.milestones.length};
  const b=E.hg88AwardTower(s,floor,{floor,replay:true});
  assert.equal(a.large,b.large);
  assert.equal(a.small,b.small);
  assert.equal(a.items.length,b.items.length);
  assert.equal(s.hg18.materials.resource_card,before.small+a.small);
  assert.equal(s.hg18.materials.resource_chest,before.large+a.large);
  assert.equal(s.inventory.length,before.inventory+a.items.length);
  assert.equal(s.hg88.milestones.length,before.achievements);
 }
 assert.equal(save(s).version,7);
 return {fragmentBalance:s.hg18.materials.resource_chest,achievements:s.hg88.milestones.length};
});
test('mythic troop 100 shards -> exactly 60 REAL deployed units per race; shortage atomic',()=>{
 const out=[];
 for(const race of ['human','elf','orc','undead']){
  const s=fresh(race),unit=E.HG90_MYTH_UNITS[race].id,stock=s.army[unit]||0;
  const before=digest(s);
  assert.throws(()=>E.hg90SummonTroops(s),/Thiếu/);assert.equal(digest(s),before);
  s.hg90.shards=100;
  const r=E.hg90SummonTroops(s);
  assert.equal(r.units,60);assert.equal(s.army[unit],stock+60);
  assert.equal(s.hg90.shards,0);
  assert(E.getUnit(s,unit).atk>100);
  assert.equal(save(s).army[unit],60);
  out.push({race,unit,army:r.army});
 }
 return {out};
});
test('six mythic deity-only relics forge against real gold and shards and cannot transfer to other hero',()=>{
 const s=fresh();s.fame=1000000;
 s.hg18.materials.resource_chest=400;s.hg90.shards=60;
 s.res.gold=E.limits(s).gold;
 const d=E.hg89Awaken(s,'yang_jian');const n=s.inventory.length,beforeGold=s.res.gold;
 const q=E.hg90Forge(s,'hg90_relic_yang_jian');
 assert.equal(s.inventory.length,n+1);assert.equal(s.res.gold,beforeGold-q.gold);
 assert.equal(s.hg90.forged.length,1);assert.equal(s.hg90.shards,60-q.shards);
 assert.throws(()=>E.equipItem(s,q.uid,1),/chỉ có thể trang bị/);
 const before=digest(s);
 assert.throws(()=>E.hg90Forge(s,'hg90_relic_yang_jian'),/đã rèn/);
 assert.equal(digest(s),before);
 // At level 100, the special relic can be equipped by its rightful owner.
 const owner=s.heroes.find(h=>h.id===d.heroId);owner.level=100;
 E.equipItem(s,q.uid,d.heroId);
 assert.equal(s.equipment[d.heroId].relic,q.uid);
 assert.equal(save(s).equipment[d.heroId].relic,q.uid);
 return {deity:d.name,item:qid(q),goldSpent:q.gold,shardsSpent:q.shards};
});
function qid(q){return q.itemId}
test('two named myth heroes activate bond ONLY when both actually on same 3x2 combat team',()=>{
 const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=400;
 const a=E.hg89Awaken(s,'yang_jian'),b=E.hg89Awaken(s,'nezha');
 const u=s.race+'_1';s.army[u]=120;
 E.hg20SetHeroPlan(s,a.heroId,[{unitId:u,count:30}]);
 E.hg20SetHeroPlan(s,b.heroId,[{unitId:u,count:30}]);
 assert.equal(E.hg90ActiveBonds(s).length,0);
 const base=E.combatModifiers(s,a.heroId).damageBonus;
 const target=E.TILES.find(t=>t.kind==='npc'&&E.pathfind(E.activeCity(s).key,t.key)?.length>1);
 E.hg89JointMarch(s,target.key,[{heroId:a.heroId,slots:[0]},{heroId:b.heroId,slots:[0]}]);
 E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
 assert(s.battle?.hg261Joint);
 const active=E.hg90ActiveBonds(s);
 assert(active.some(x=>x.id==='fengshen'));
 assert(E.combatModifiers(s,a.heroId).damageBonus>base);
 assert(save(s).battle.hg261Joint);
 return {bond:active[0].name,team:s.battle.hg261Joint.team};
});
test('secondary city can awaken correct local-race God, command and summon its own mythic troops',()=>{
 const s=fresh(),c=secondary(s);
 s.fame=1000000;
 E.switchCity(s,c.id);
 assert.equal(E.hg82CityHeroes(s).length,0);
 s.hg18.materials.resource_chest=150;
 const hero=E.hg89Awaken(s,'yang_jian');
 const h=s.heroes.find(x=>x.id===hero.heroId);
 assert.equal(h.cityId,c.id);assert.equal(h.race,'elf');
 assert.equal(s.activeHero,h.id);
 assert.equal(E.hg20HeroRole(s,h.id).status,'home');
 E.hg20SetHeroPlan(s,h.id,[{unitId:'elf_1',count:5}]);
 s.hg90.shards=100;
 E.hg90SummonTroops(s);
 assert.equal(s.army.elf_hg90_celestial,60);
 const plan=digest(E.hg20HeroPlan(s,h.id));
 E.switchCity(s,'main');
 assert.equal(s.activeHero,1);
 assert.equal(s.army.elf_hg90_celestial,undefined);
 assert.equal(E.hg20HeroRole(s,h.id).status,'other_city');
 E.switchCity(s,c.id);
 assert.equal(s.activeHero,h.id);
 assert.equal(s.army.elf_hg90_celestial,60);
 assert.equal(digest(E.hg20HeroPlan(s,h.id)),plan);
 assert.equal(save(s).activeHero,h.id);
 return {city:c.id,race:h.race,heroId:h.id,mythArmy:60,plan};
});
test('transferring selected hero from main selects a REAL alternative local commander',()=>{
 const s=fresh(),c=secondary(s);
 const other=E.clone(s.heroes[0]);other.id=2;other.name='Dự bị Main';
 other.cityId='main';s.heroes.push(other);s.equipment[2]={};
 E.hg81Ensure(s);s.activeHero=1;
 const sent=E.hg82TransferHero(s,1,c.id);
 assert.equal(s.activeHero,2);
 assert.equal(E.hg20HeroRole(s,1).status,'relocating');
 assert.equal(E.hg20HeroRole(s,2).status,'home');
 E.tick(s,s.lastTick+Math.ceil((sent.remaining+2)/s.speed*1000));
 assert.equal(s.heroes.find(h=>h.id===1).cityId,c.id);
 assert.equal(s.activeHero,2);
 E.switchCity(s,c.id);
 assert.equal(s.activeHero,1);
 assert.equal(save(s).activeHero,1);
 return {transferred:1,sourceCommander:2,destination:c.id};
});
test('assembled deity cannot be irreversibly dismissed in main or secondary city',()=>{
 const s=fresh(),c=secondary(s);
 s.fame=1000000;E.switchCity(s,c.id);s.hg18.materials.resource_chest=150;
 const h=E.hg89Awaken(s,'yang_jian'),old=digest(s);
 assert.equal(E.hg408DismissCheck(s,h.heroId).allowed,false);
 assert.throws(()=>E.hg82QuickDismiss(s,h.heroId),/độc bản/);
 assert.throws(()=>E.hg408DismissHero(s,h.heroId),/Thần Tướng/);
 assert.equal(digest(s),old);
 assert.equal(save(s).heroes.find(x=>x.id===h.heroId).mythicId,'yang_jian');
 return {heroId:h.heroId,city:c.id,fragmentLoss:0};
});
console.log('HG90 '+passed+'/'+count+(passed===count?' PASS':' FAIL'));
if(passed!==count)process.exitCode=1;
