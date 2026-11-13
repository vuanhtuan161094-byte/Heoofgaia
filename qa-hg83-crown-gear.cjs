/* HG83 executable QA: 40 genuine catalog items, paid crafting, UID equipment and Save v07.
 * Injected inventory/resources in this script are TEST FIXTURES, never gameplay rewards.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Date,Math});
const modules='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
for(const file of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
let passed=0;
function check(name,fn){try{const result=fn()||{};passed++;console.log('HG83 PASS '+name+' '+JSON.stringify(result));}
 catch(err){console.error('HG83 FAIL '+name+' '+(err.stack||err));process.exitCode=1;}}
const fresh=(race='human')=>E.make(race,1000000);
const roundtrip=s=>{assert(E.strictSave(s));const t=E.parseSave(E.serializeSave(s));assert(E.strictSave(t));return t;};
check('Four racial 10-slot legendary catalogs and zero starter freebies',()=>{
 assert.equal(E.HG83_RECIPES.length,40);assert.equal(Object.keys(E.HG83_SETS).length,4);
 assert.equal(new Set(E.HG83_RECIPES.map(x=>x.id)).size,40);
 for(const race of ['human','elf','orc','undead']){
  const s=fresh(race),recipes=E.hg83Catalogue(s);
  assert.equal(recipes.length,10);assert(recipes.every(q=>!q.canCraft&&!q.unlocked));
  assert.equal(new Set(recipes.map(q=>q.slot)).size,10);
  assert.equal(s.inventory.length,0);assert.equal(s.version,7);roundtrip(s);
 }
 return {races:4,newItems:40,sets:4,save:7};
});
check('Locked forge cannot create item, spend gold or mutate a fresh game',()=>{
 const s=fresh(),before=JSON.stringify(s),id=E.hg83ItemId('human','weapon');
 assert.throws(()=>E.hg83Craft(s,id),/Chưa thắng|thiếu|đang/);
 assert.equal(JSON.stringify(s),before);return {blocked:true};
});
check('Paid Crown Relic uses actual Boss/Tower shards, gold and canonical UID',()=>{
 const s=fresh(),id=E.hg83ItemId('human','weapon');
 // Explicit QA fixture represents a player who already earned Boss/Tower rewards.
 s.hg31.bossWins=1;s.hg31.paidTowerWins=1;s.res.gold=250000;
 for(const key of ['gear','hunter','abyss','tower','hero'])s.hg29.shards[key]=100;
 s.hg27.boss=5;s.hg27.tower=5;
 const recipe=E.hg83Catalogue(s).find(x=>x.id===id);
 assert(recipe.canCraft,'QA fixture should satisfy all unlock/payment predicates');
 const previous={gold:s.res.gold,boss:s.hg27.boss,tower:s.hg27.tower,
  items:s.inventory.length,shards:{...s.hg29.shards}};
 const result=E.hg83Craft(s,id),item=s.inventory.find(x=>x.uid===result.uid);
 assert(item&&item.itemId===id);assert.equal(s.inventory.length,previous.items+1);
 assert.equal(s.res.gold,previous.gold-recipe.gold);
 assert.equal(s.hg27.boss,previous.boss-recipe.need.bossToken);
 assert.equal(s.hg27.tower,previous.tower-recipe.need.towerToken);
 for(const key of ['gear','hunter','abyss','tower','hero'])
  assert.equal(s.hg29.shards[key],previous.shards[key]-recipe.need[key]);
 assert.equal(E.hg73Kind(item),'legendary');assert(E.hg46Stats(item).atk>=E.ITEMS[id].atk);
 const restored=roundtrip(s);assert(restored.inventory.some(x=>x.uid===result.uid));
 return {uid:result.uid,realDebits:true,version:restored.version};
});
check('Wearing three matching items activates real defensive set effect and no fake loot',()=>{
 const s=fresh(),ids=['armor','helm','belt'].map(slot=>E.hg83ItemId('human',slot));
 const rows=ids.map(id=>E.addItem(s,id,'HG83 explicit unit test fixture'));
 const base=E.combatModifiers(s,1).damageReduction||0;
 for(const row of rows)E.equipItem(s,row.uid,1);
 assert.equal(E.hg83SetProgress(s,1)[0].count,3);
 const enhanced=E.combatModifiers(s,1).damageReduction||0;
 assert(enhanced>=base+.019,'Set should add 2% race defensive bonus');
 assert.equal(s.inventory.length,3);
 roundtrip(s);return {base,enhanced,equipped:3};
});
check('Other-race relic does not bypass racial equipment ownership',()=>{
 const s=fresh('human'),row=E.addItem(s,E.hg83ItemId('orc','weapon'),'HG83 foreign test fixture');
 const before=JSON.stringify(s);
 assert.throws(()=>E.equipItem(s,row.uid,1),/riêng/);
 assert.equal(JSON.stringify(s),before);roundtrip(s);
 return {foreignUid:row.uid,blocked:true};
});
console.log('HG83 '+passed+'/5 focused unit gates '+(process.exitCode?'FAIL':'PASS'));
