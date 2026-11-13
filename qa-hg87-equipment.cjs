/* HG87: canonical equipment progression + UID protection + safe bulk salvage.
 * Fixtures explicitly mint test items/rewards; game does not grant them freely.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;let pass=0;
const fresh=(race='human')=>E.make(race,1000000);
const save=s=>{assert(E.strictSave(s));const loaded=E.parseSave(E.serializeSave(s));assert(E.strictSave(loaded));return loaded;};
function check(label,fn){try{const out=fn()||{};console.log('HG87 PASS '+label+' '+JSON.stringify(out));pass++}
 catch(error){console.error('HG87 FAIL '+label+' '+String(error.stack||error));process.exitCode=1}}
check('40 earned epic items and four complete racial 10-slot sets with zero starter freebies',()=>{
 assert.equal(E.HG87_ITEMS.length,40);assert.equal(Object.keys(E.HG87_SETS).length,4);
 for(const race of ['human','elf','orc','undead']){
  const s=fresh(race),recipes=E.hg87Catalogue(s);
  assert.equal(recipes.length,10);assert.equal(s.inventory.length,0);
  assert(recipes.every(x=>!x.canCraft&&!x.unlocked));
  assert.equal(new Set(recipes.map(x=>x.slot)).size,10);
  for(const x of recipes){assert.equal(E.hg73Kind({itemId:x.id,uid:999,enhance:0}),'epic');}
  save(s);
 }
 return {newItems:40,sets:4,save:7};
});
check('Epic forge requires paid Tower success and debits gold plus three earned shards exactly once',()=>{
 const s=fresh(),id=E.hg87ItemId('human','weapon'),start=JSON.stringify(s);
 assert.throws(()=>E.hg87Craft(s,id),/Tháp|thiếu/);
 assert.equal(JSON.stringify(s),start,'locked recipe never changes any state');
 // Explicit QA fixture representing previously earned loot, NOT a game reward.
 s.hg31.paidTowerWins=1;s.res.gold=100000;
 for(const k of ['gear','hunter','tower'])s.hg29.shards[k]=100;
 const q=E.hg87Catalogue(s).find(q=>q.id===id);
 assert(q.canCraft);assert.equal(q.cost.gold,6500);
 const prior={gold:s.res.gold,shards:{...s.hg29.shards},uid:s.nextItemId};
 const a=E.hg87Craft(s,id),row=s.inventory.find(x=>x.uid===a.uid);
 assert(row&&row.itemId===id&&row.uid===a.uid);
 assert.equal(s.res.gold,prior.gold-q.cost.gold);
 for(const k of ['gear','hunter','tower'])assert.equal(s.hg29.shards[k],prior.shards[k]-q.cost[k]);
 assert.equal(E.hg73Kind(row),'epic');
 const r=save(s);assert.equal(r.inventory.filter(x=>x.uid===a.uid).length,1);
 return {uid:a.uid,gold:q.cost.gold,shards:q.cost,version:r.version};
});
check('Lock and favorite flags follow canonical UID through cold Save and single salvage is refused',()=>{
 const s=fresh(),a=E.addItem(s,'sentinel_sword','HG87 test fixture'),b=E.addItem(s,'copper_blade','HG87 test fixture');
 assert(E.hg87Mark(s,a.uid,'locked',true).enabled);
 assert(E.hg87Mark(s,b.uid,'favorite',true).enabled);
 assert.throws(()=>E.salvageHG18(s,a.uid),/khóa|yêu thích/);
 assert.throws(()=>E.salvageHG18(s,b.uid),/khóa|yêu thích/);
 let r=save(s);assert.deepEqual(JSON.parse(JSON.stringify(E.hg87Flag(r,a.uid))),{locked:true,favorite:false});
 assert.deepEqual(JSON.parse(JSON.stringify(E.hg87Flag(r,b.uid))),{locked:false,favorite:true});
 E.hg87Mark(r,a.uid,'locked',false);assert.equal(E.hg87Flag(r,a.uid).locked,false);
 const reward=E.salvageHG18(r,a.uid);assert.equal(reward.stones,3);
 assert(r.inventory.some(x=>x.uid===b.uid));
 r=save(r);return {protected:r.inventory.length,stones:reward.stones,save:r.version};
});
check('Bulk salvage respects own gear, locked, favorite, enhanced, rare tiers, UID and exact payout',()=>{
 const s=fresh();
 const a=E.addItem(s,'copper_blade','HG87 loose QA'),b=E.addItem(s,'iron_armor','HG87 loose QA');
 const locked=E.addItem(s,'sentinel_sword','HG87 locked QA');
 const loved=E.addItem(s,'copper_blade','HG87 loved QA');
 const worn=E.addItem(s,'sentinel_plate','HG87 equipped QA');
 const enhanced=E.addItem(s,'copper_blade','HG87 upgraded QA');enhanced.enhance=2;
 const rare=E.addItem(s,'hg47_human_divine_weapon','HG87 premium QA');
 E.hg87Mark(s,locked.uid,'locked',true);E.hg87Mark(s,loved.uid,'favorite',true);
 E.equipItem(s,worn.uid,1);
 const quote=E.hg87BatchPreview(s,'fine');
 assert.equal(quote.count,2);assert.equal(quote.stones,2);
 assert.deepEqual(JSON.parse(JSON.stringify(quote.uids)),[a.uid,b.uid]);
 assert.equal(quote.skips.locked,1);assert.equal(quote.skips.favorite,1);
 const before={money:s.res.gold,stones:s.hg18.materials.enhance_stone,items:s.inventory.length};
 const receipt=E.hg87BatchSalvage(s,'fine');
 assert.equal(receipt.count,2);assert.equal(s.hg18.materials.enhance_stone,before.stones+2);
 assert.equal(s.res.gold,before.money);assert.equal(s.inventory.length,before.items-2);
 for(const kept of [locked,loved,worn,enhanced,rare])assert(s.inventory.some(x=>x.uid===kept.uid));
 assert.equal(s.equipment[1].armor,worn.uid);
 const r=save(s);return {count:receipt.count,stones:receipt.stones,kept:r.inventory.length,version:r.version};
});
check('50-piece bulk cap and material-overflow guard are atomic',()=>{
 const s=fresh();for(let i=0;i<53;i++)E.addItem(s,'copper_blade','HG87 fixture');
 let q=E.hg87BatchPreview(s,'fine');assert.equal(q.count,50);
 s.hg18.materials.enhance_stone=999999;
 const before=JSON.stringify(s),no=E.hg87BatchPreview(s,'fine');
 assert.equal(no.capacity,false);
 assert.throws(()=>E.hg87BatchSalvage(s,'fine'),/đầy|phù hợp/);
 assert.equal(JSON.stringify(s),before);
 s.hg18.materials.enhance_stone=0;
 const out=E.hg87BatchSalvage(s,'fine');assert.equal(out.count,50);
 assert.equal(s.inventory.length,3);assert.equal(s.hg18.materials.enhance_stone,50);
 save(s);return {limit:50,remaining:3,payment:50};
});
check('Actual comparison shows complete hero ATK/DEF/SPD/INT and score without modifying gear',()=>{
 const s=fresh();const old=E.addItem(s,'copper_blade','QA original'),item=E.addItem(s,'hg87_human_weapon','QA upgrade');
 E.equipItem(s,old.uid,1);
 const state=JSON.stringify(s),before=E.hg46Metrics(s,1,'balanced');
 const c=E.hg87Compare(s,item.uid,1,'balanced');
 assert(c.allowed);assert(c.delta.atk>0);assert(c.gain>0);assert.equal(c.oldUid,old.uid);
 assert.equal(JSON.stringify(s),state,'comparison must not mutate original Save');
 E.equipItem(s,item.uid,1);
 const after=E.hg46Metrics(s,1,'balanced');
 assert.equal(c.gain,Math.round((after.score-before.score)*100)/100);
 assert.equal(c.delta.atk,Math.round((after.stats.atk-before.stats.atk)*100)/100);
 const again=E.hg87Compare(s,item.uid,1);assert.equal(again.gain,0);
 save(s);return {gain:c.gain,atk:c.delta.atk,save:s.version};
});
check('Matching set milestones at 3/6/10 affect actual modifiers within combat caps',()=>{
 const s=fresh(),rows=E.HG47_SLOTS.map(([slot])=>E.addItem(s,E.hg87ItemId('human',slot),'HG87 explicit QA'));
 const baseline=E.combatModifiers(s,1).damageReduction||0,stages=[];
 rows.forEach((row,i)=>{
  E.equipItem(s,row.uid,1);
  if([3,6,10].includes(i+1)){
   const set=E.hg87SetProgress(s,1)[0],mod=E.combatModifiers(s,1);
   assert.equal(set.count,i+1);
   assert(mod.damageReduction<=.24+1e-9&&mod.damageBonus<=.32+1e-9);
   stages.push({count:set.count,damageReduction:mod.damageReduction});
  }
 });
 assert(stages[0].damageReduction>baseline);
 assert(stages[1].damageReduction>=stages[0].damageReduction);
 assert(stages[2].damageReduction>=stages[1].damageReduction);
 const r=save(s);assert.equal(E.hg87SetProgress(r,1)[0].count,10);
 return {stages,version:r.version};
});
check('Foreign-race Epic cannot be equipped; invalid UID or protection flags never pass strict save',()=>{
 const s=fresh(),foreign=E.addItem(s,E.hg87ItemId('elf','weapon'),'QA foreign');
 const before=JSON.stringify(s);assert.throws(()=>E.equipItem(s,foreign.uid,1),/riêng/);
 assert.equal(JSON.stringify(s),before);
 const cmp=E.hg87Compare(s,foreign.uid,1);assert.equal(cmp.allowed,false);
 foreign.hg87Locked='yes';assert.equal(E.strictSave(s),false);
 delete foreign.hg87Locked;assert(E.strictSave(s));save(s);
 return {blocked:true,uid:foreign.uid};
});
console.log('HG87 '+pass+'/8 '+(process.exitCode?'FAIL':'PASS'));
if(pass!==8)process.exitCode=1;