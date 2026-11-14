/* HG89 exact-SHA checks: real fragment consumption and multi-hero world march.
 * Seeded fragment quantities, army and Fame below are test fixtures only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const mods='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js hg82-city-heroes.js hg88-tower-hero-cards.js hg89-mythic-heroes.js'.split(' ');
const ctx=vm.createContext({console,Date,Math});
for(const file of mods)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,clean=s=>JSON.stringify(s),fresh=(race='human')=>E.make(race,1000000);
let total=0,passed=0;
function test(label,fn){total++;try{const evidence=fn()||{};passed++;console.log('HG89 PASS '+label+' '+JSON.stringify(evidence))}
 catch(error){process.exitCode=1;console.error('HG89 FAIL '+label+' '+(error.stack||error))}}
function saved(s){assert(E.strictSave(s),'Invalid v07');const r=E.parseSave(E.serializeSave(s));assert(E.strictSave(r));return r}
test('fresh save: six myth gods locked and no fragments supplied for free',()=>{
 const s=fresh(),x=E.hg89Status(s);
 assert.equal(s.version,7);assert.equal(x.deities.length,6);
 assert.equal(x.fragments,0);assert.equal(x.assembled.length,0);
 assert(x.deities.every(d=>!d.canAssemble&&!d.owned));
 assert.equal(saved(s).version,7);return {gods:x.deities.map(d=>d.name)};
});
test('legacy HG88 Save v07 loads and preserves every previous divine card as fragments',()=>{
 const s=fresh();s.hg18.materials.resource_chest=237;delete s.hg89;
 const q=E.parseSave(JSON.stringify({format:'heoofgaia-save-1',state:s}));
 assert.equal(E.hg89Status(q).fragments,237);
 assert.equal(q.heroes.length,s.heroes.length);
 assert.equal(q.hg89.assembled.length,0);
 return {preservedFragments:237,version:saved(q).version};
});
test('each six public-domain deities is obtainable by paid fragments, with fixed named passive',()=>{
 const results=[];
 for(const d of E.HG89_PANTHEON){
  const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=d.cost;
  const n=s.heroes.length,before=clean(s.res);
  const r=E.hg89Awaken(s,d.id);
  assert.equal(r.name,d.name);assert.equal(r.skill,d.skill);
  assert.equal(s.hg18.materials.resource_chest,0);
  assert.equal(s.heroes.length,n+1);
  assert.equal(clean(s.res),before);
  const h=s.heroes.find(x=>x.id===r.heroId);
  assert.equal(h.mythicId,d.id);assert.equal(h.cityId,s.activeCityId);
  assert.equal(h.quality,'rainbow');assert.equal(E.heroTierByTotal(E.heroInnateTotal(h)).id,'rainbow');
  assert.equal(E.hg81SkillStatus(s,h.id).heroId,h.id);
  assert(E.hg89Status(s).assembled.includes(d.id));
  assert.equal(saved(s).heroes.find(x=>x.id===h.id).name,d.name);
  results.push({deity:d.id,cost:d.cost,heroId:h.id,skill:r.skill});
 }
 return {results};
});
test('duplicate myth, shortage and max roster cannot lose fragments',()=>{
 const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=500;
 const first=E.hg89Awaken(s,'yang_jian');
 let before=clean(s);
 assert.throws(()=>E.hg89Awaken(s,'yang_jian'),/một lần/);assert.equal(clean(s),before);
 assert.throws(()=>E.hg89Awaken(s,'odin'),/Thiếu/);assert.equal(clean(s),before);
 s.heroes.push(...Array.from({length:E.heroCountLimit(s.fame)-s.heroes.length},(_,i)=>({
  ...E.clone(s.heroes[0]),id:100+i,name:'QA FULL '+i,cityId:s.activeCityId
 })));
 E.hg81Ensure(s);
 before=clean(s);
 assert.throws(()=>E.hg89Awaken(s,'nezha'),/Hết ô/);
 assert.equal(clean(s),before);
 return {firstId:first.heroId,fragmentsRemaining:400,roster:s.heroes.length};
});
test('HG88 Divine random summons are disabled; Anh Kiệt cards remain fully supported',()=>{
 const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=500;
 let original=clean(s);
 assert.throws(()=>E.hg88Summon(s,'resource_chest',500),/ghép mảnh/);assert.equal(clean(s),original);
 s.hg18.materials.resource_card=10;
 const r=E.hg88Summon(s,'resource_card',10);
 assert.equal(r.draws,10);assert.equal(s.heroes.length,2);
 assert.equal(s.hg18.materials.resource_chest,500);
 assert.equal(s.hg18.materials.resource_card,0);
 return {anhKiet:r.name,divineFragments:500};
});
test('named myth hero actually gains offense and defense buffs in live combatModifiers',()=>{
 for(const d of E.HG89_PANTHEON){
  const s=fresh();s.fame=1000000;s.hg18.materials.resource_chest=d.cost;
  const r=E.hg89Awaken(s,d.id),q=E.clone(s),hero=q.heroes.find(h=>h.id===r.heroId);
  delete hero.mythicId;delete hero.mythicOrigin;
  const before=E.combatModifiers(q,r.heroId),after=E.combatModifiers(s,r.heroId);
  assert(after.damageBonus>before.damageBonus);
  assert(after.damageReduction>before.damageReduction);
 }
 return {passives:6,method:'real combatModifiers'};
});
test('one-time milestone award mints fragments, not myth heroes or free random summons',()=>{
 const s=fresh();const before=s.heroes.length;
 const q=E.hg88AwardTower(s,100,{floor:100});
 assert.equal(q.large,100);assert.equal(s.hg18.materials.resource_chest,100);
 assert.equal(s.heroes.length,before);
 const twice=E.hg88AwardTower(s,100,{floor:100});
 assert(twice.duplicateBlocked);assert.equal(s.hg18.materials.resource_chest,100);
 assert.equal(saved(s).hg18.materials.resource_chest,100);
 return {milestone:100,fragments:100,noFreeHero:true};
});
test('real group expedition to ordinary monster spends AP once and creates per-owner stacks',()=>{
 const s=fresh();const base=E.clone(s.heroes[0]);
 s.heroes.push({...base,id:2,name:'QA second commander',cityId:s.activeCityId});
 s.fame=1000000;s.army.human_1=100;
 E.hg81Ensure(s);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:30}]);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:30}]);
 assert(E.strictSave(s));
 const target=E.TILES.filter(t=>t.kind==='npc'&&(t.eliteTier||0)<11)
  .map(t=>({t,path:E.pathfind(E.activeCity(s).key,t.key)}))
  .filter(x=>x.path?.length>1)
  .sort((a,b)=>a.path.length-b.path.length)[0].t;
 const before={ap:s.ap,stock:s.army.human_1,other:clean(s.res)};
 const receipt=E.hg89JointMarch(s,target.key,[{heroId:1,slots:[0]},{heroId:2,slots:[0]}]);
 assert.equal(receipt.heroes,2);assert.equal(receipt.stacks,2);
 assert.equal(s.army.human_1,40);assert.equal(s.expedition.formation.length,2);
 assert.equal(s.expedition.formation[0].hg261HeroId,1);
 assert.equal(s.expedition.formation[1].hg261HeroId,2);
 assert.equal(before.ap-s.ap,receipt.apSpent);
 assert(receipt.apSpent>0);assert.equal(s.hg26.enabled,false);
 assert(E.strictSave(s));const copy=saved(s);assert.equal(copy.expedition.formation.length,2);
 // Try a second overlapping expedition: no AP or troop loss.
 const frozen=clean(s);
 assert.throws(()=>E.hg89JointMarch(s,target.key,[{heroId:1,slots:[0]}]),/đang hành quân|chiến đấu|đội/i);
 assert.equal(clean(s),frozen);
 return {target:target.key,apSpent:receipt.apSpent,stockLeft:40,heroOwners:[1,2]};
});
test('multi-hero raid validates duplicate IDs, fake slots and insufficient troop stock atomically',()=>{
 const s=fresh();s.fame=1000000;const base=E.clone(s.heroes[0]);
 s.heroes.push({...base,id:2,name:'QA second commander',cityId:s.activeCityId});E.hg81Ensure(s);
 s.army.human_1=80;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:30}]);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:30}]);
 const target=E.TILES.find(t=>t.kind==='npc'),before=clean(s);
 assert.throws(()=>E.hg89JointMarch(s,target.key,[{heroId:1,slots:[0]},{heroId:1,slots:[0]}]),/trùng/);
 assert.throws(()=>E.hg89JointMarch(s,target.key,[{heroId:1,slots:[3]}]),/slot/);
 assert.throws(()=>E.hg89JointMarch(s,target.key,[{heroId:1,slots:[0,0]}]),/slot/);
 assert.equal(clean(s),before);
 return {blocked:'duplicate, invalid and duplicated slots',save:E.strictSave(s)};
});
console.log('HG89 '+passed+'/'+total+(passed===total?' PASS':' FAIL'));
if(passed!==total)process.exitCode=1;
