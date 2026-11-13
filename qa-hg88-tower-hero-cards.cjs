/* HG88 Tower reset and special hero card QA: real v07, no phantom items.
 * Every special balance fixture is explicitly labeled and only lives here.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const mods='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js hg82-city-heroes.js hg88-tower-hero-cards.js'.split(' ');
const ctx=vm.createContext({console,Date,Math});
for(const f of mods)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE;
let passed=0;
function test(label,fn){try{const info=fn()||{};passed++;console.log('HG88 PASS '+label+' '+JSON.stringify(info))}
 catch(e){process.exitCode=1;console.error('HG88 FAIL '+label+' '+(e.stack||e))}}
const fresh=()=>E.make('human',1000000);
const save=s=>{assert(E.strictSave(s));const q=E.parseSave(E.serializeSave(s));assert(E.strictSave(q));return q};
test('new game has no free summon, Tower high-water or free hero cards',()=>{
 const s=fresh();
 assert.equal(s.hg88.totalDrawn,0);assert.deepEqual([...s.hg88.milestones],[]);
 assert.equal(s.hg18.materials.resource_card,0);
 assert.equal(s.hg18.materials.resource_chest,0);
 assert.equal(E.hg88TowerStatus(s).highest,0);
 assert.equal(E.hg88TowerStatus(s).resetsUsed,0);
 assert.equal(save(s).version,7);
 return {v07:true,roster:s.heroes.length};
});
test('historical Save v07 without HG88 and Tower reset ledger migrates, no grants',()=>{
 const s=fresh();s.hg20.tower.floor=22;const old=E.clone(s);
 delete old.hg88;delete old.hg20.tower.hg88;
 const baseline={gold:old.res.gold,heroes:old.heroes.length,inventory:old.inventory.length,essence:old.hg20.tower.essence};
 const q=E.parseSave(JSON.stringify({format:'heoofgaia-save-1',exportedAt:'2026-11-01T00:00:00.000Z',state:old}));
 assert.equal(q.hg20.tower.hg88.highest,21);
 assert.equal(q.hg88.totalDrawn,0);
 assert.equal(q.res.gold,baseline.gold);assert.equal(q.heroes.length,baseline.heroes);
 assert.equal(q.inventory.length,baseline.inventory);assert.equal(q.hg20.tower.essence,baseline.essence);
 return {migratedHighest:21,noFreeGrants:true,save:save(q).version};
});
test('special hero card batches 1,10,100,200,500 create exactly one real hero per paid batch',()=>{
 const out=[];
 for(const draws of [1,10,100,200,500]){
  const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=600;
  const before=E.clone({gold:s.res.gold,materials:s.hg18.materials,heroes:s.heroes.length,inventory:s.inventory.length});
  const r=E.hg88Summon(s,'resource_chest',draws);
  assert.equal(s.heroes.length,before.heroes+1);
  assert.equal(s.hg18.materials.resource_chest,600-draws);
  assert.equal(r.cardsLeft,600-draws);
  assert.equal(s.hg88.totalDrawn,draws);
  assert.equal(s.hg88.summons,1);
  assert.equal(s.inventory.length,before.inventory);
  assert.equal(s.res.gold,before.gold);
  const hero=s.heroes.find(h=>h.id===r.heroId);
  assert(hero?.cardSpecial&&hero.rewardOrigin==='hg88_card_resource_chest');
  assert.equal(hero.quality,E.heroTierByTotal(E.heroInnateTotal(hero)).id);
  if(draws>=200)assert.equal(r.quality,'rainbow');
  else if(draws===100)assert(['platinum','rainbow'].includes(r.quality));
  assert(E.hg81SkillStatus(s,r.heroId).heroId===r.heroId);
  const loaded=save(s),afterHero=loaded.heroes.find(h=>h.id===r.heroId);
  assert(afterHero&&afterHero.cardSpecial&&afterHero.id===hero.id);
  out.push({draws,quality:r.quality,score:r.total,hero:r.heroId});
 }
 return {batches:out};
});
test('both card types are consumed at exact rate; shortage and roster full are atomic',()=>{
 const s=fresh();
 s.hg18.materials.resource_card=10;
 let before=JSON.stringify(s);
 assert.throws(()=>E.hg88Summon(s,'resource_card',100),/Không đủ/);
 assert.equal(JSON.stringify(s),before);
 let r=E.hg88Summon(s,'resource_card',10);
 assert.equal(s.hg18.materials.resource_card,0);
 assert.equal(r.draws,10);
 before=JSON.stringify(s);
 s.hg18.materials.resource_card=1;
 before=JSON.stringify(s);
 assert.throws(()=>E.hg88Summon(s,'resource_card',1),/Đủ.*tướng|ô tướng/);
 assert.equal(JSON.stringify(s),before);
 return {roster:s.heroes.length,cap:E.heroCountLimit(s.fame),noFreeCards:true};
});
test('special card hero passives are real combat modifiers, not only an icon',()=>{
 const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=500;
 const r=E.hg88Summon(s,'resource_chest',500);
 const hero=s.heroes.find(h=>h.id===r.heroId);
 const before=E.clone(s);before.heroes.find(h=>h.id===r.heroId).cardSpecial=false;
 const a=E.combatModifiers(before,r.heroId),b=E.combatModifiers(s,r.heroId);
 assert(b.damageBonus>a.damageBonus+0.1);
 assert(b.damageReduction>a.damageReduction+0.08);
 assert(hero.cardTier===500);
 return {attackBefore:a.damageBonus,attackAfter:b.damageBonus,defenseAfter:b.damageReduction};
});
test('one Tower reset per day keeps high-water, essence, roster, inventory and claims',()=>{
 const s=fresh();s.hg20.tower.floor=41;s.hg20.tower.hg88.highest=40;
 s.hg20.tower.essence=35;s.hg20.tower.claims=2;
 const before={heroes:s.heroes.length,inventory:s.inventory.length,essence:35,claims:2};
 const result=E.hg88ResetTower(s);
 assert.equal(result.from,41);assert.equal(result.to,1);assert.equal(result.highest,40);
 assert.equal(s.hg20.tower.hg88.highest,40);
 assert.equal(s.hg20.tower.claims,before.claims);
 assert.equal(s.hg20.tower.essence,before.essence);
 assert.equal(s.heroes.length,before.heroes);assert.equal(s.inventory.length,before.inventory);
 const old=save(s);assert.equal(old.hg20.tower.floor,1);
 old.hg20.tower.floor=2;
 assert.throws(()=>E.hg88ResetTower(old),/hôm nay/);
 assert.equal(old.hg20.tower.floor,2);
 return {highest:40,resetsUsed:1,save:old.version};
});
test('first-clear milestones 100 200 500 issue real cards and Crown relics exactly once',()=>{
 const s=fresh(),before=s.inventory.length,proof=[];
 for(const floor of [10,25,100,200,500]){
  const report={floor};
  const q=E.hg88AwardTower(s,floor,report);
  assert.equal(report.heroCards,q);
  assert(s.hg88.milestones.includes(floor));
  if([100,200,500].includes(floor)){
   assert.equal(q.large,floor);
   assert.equal(q.items.length,1);
   assert(E.ITEMS[s.inventory.find(x=>x.uid===q.items[0].uid)?.itemId].hg83);
  }
  const frozen=JSON.stringify({inventory:s.inventory,materials:s.hg18.materials,milestones:s.hg88.milestones});
  const again=E.hg88AwardTower(s,floor,{floor});
  assert(again.duplicateBlocked);
  assert.equal(JSON.stringify({inventory:s.inventory,materials:s.hg18.materials,milestones:s.hg88.milestones}),frozen);
  proof.push({floor,large:q.large,small:q.small,item:q.items.length});
 }
 assert.equal(s.inventory.length,before+3);
 assert.equal(save(s).hg88.milestones.length,5);
 return {proof,cards:s.hg18.materials.resource_chest,inventory:3};
});
test('reset ledger rejects invalid fields and no interrupted battle can reset',()=>{
 const s=fresh();s.hg20.tower.floor=2;s.hg20.tower.hg88.highest=1;
 let q=E.clone(s);q.hg88.milestones=[100,100];assert.equal(E.strictSave(q),false);
 q=E.clone(s);q.hg20.tower.hg88.resetsUsed=3;assert.equal(E.strictSave(q),false);
 q=E.clone(s);q.hg88.totalDrawn=-1;assert.equal(E.strictSave(q),false);
 const team=E.clone(s);E.hg20SetHeroPlan(team,team.activeHero,[{unitId:'human_1',count:16}]);
 E.hg20ChooseTowerTeam(team,[team.activeHero]);E.hg21TowerEnter(team);
 const floor=team.hg20.tower.floor;
 assert.throws(()=>E.hg88ResetTower(team),/chiến đấu|hành quân/);
 assert.equal(team.hg20.tower.floor,floor);
 return {blocked:true,version:team.version};
});
console.log('HG88 '+passed+'/8 '+(process.exitCode?'FAIL':'PASS'));
if(passed!==8)process.exitCode=1;
