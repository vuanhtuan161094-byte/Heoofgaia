'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { createModule, validateCatalogue } = require('../data/ngoalong/modules/inventory/engine.js');
const pack = require('../data/ngoalong/modules/inventory/catalogue.json');
const rules = require('../data/ngoalong/modules/inventory/rules.json');
const inventory = createModule(pack, rules);
const fresh = () => ({
  version: 5, hero: { liu: { level: 20 }, guan: { level: 15 } },
  items: [], gear: { liu: {}, guan: {} }, silver: 500000, iron: 500000, prestige: 100
});
const done = (result) => { assert.equal(result.ok, true, result.code); return result.state; };
const rejected = (result, code, old) => {
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
  assert.deepEqual(result.state, old, 'failed command must not mutate input');
};

test('01 catalogue: project 19 + Wiki-inspired 392 playable + Wiki 392 reference; items 2 original + 4 reference', () => {
  assert.equal(pack.equipment.filter(x => x.integration === 'PLAYABLE').length, 411);
  assert.equal(pack.equipment.filter(x => x.integration === 'REFERENCE_ONLY').length, 392);
  assert.equal(pack.items.filter(x => x.integration === 'PLAYABLE').length, 669);
  assert.equal(pack.items.filter(x => x.integration === 'REFERENCE_ONLY').length, 674);
  assert.equal(pack.wikiIndexCounts.equipmentIndex, 392);
  assert.equal(pack.wikiIndexCounts.itemIndex, 674);
  assert.equal(Object.keys(validateCatalogue(pack)).length, 2146);
  assert.equal(pack.equipment.find(x => x.id === 'b_sword').stats.atk, 11);
  assert.equal(pack.equipment.find(x => x.id === 'wiki-mobile-equip02-1').stats, null);
});
test('02 receipt settlement is all-or-nothing, duplicate-safe and collision-resistant', () => {
  const start = fresh();
  const grant = inventory.grant(start, [{id:'b_sword',quantity:2},{id:'mdt-tem-tiep-te',quantity:3}], 'battle:1');
  const s = done(grant);
  assert.equal(start.items.length, 0);
  assert.equal(s.items.length, 2);
  assert.notEqual(s.items[0].uid, s.items[1].uid);
  assert.equal(s.nlItemsV1.stacks['mdt-tem-tiep-te'], 3);
  const repeat = inventory.grant(s, [{id:'b_sword',quantity:2},{id:'mdt-tem-tiep-te',quantity:3}], 'battle:1');
  assert.equal(repeat.duplicate, true);
  assert.strictEqual(repeat.state, s);
  rejected(inventory.grant(s, [{id:'b_sword',quantity:1}], 'battle:1'), 'RECEIPT_CONFLICT', s);
  rejected(inventory.grant(s, [{id:'missing',quantity:1}], 'battle:2'), 'UNKNOWN_ITEM', s);
  rejected(inventory.grant(s, [{id:'b_sword',quantity:1},{id:'wiki-mobile-equip02-1',quantity:1}], 'battle:3'), 'REFERENCE_ONLY', s);
});
test('03 equip, replace, unequip, hero ownership and battle bonus are consistent', () => {
  let s=done(inventory.grant(fresh(),[{id:'b_sword',quantity:1},{id:'g_sword',quantity:1},{id:'b_horse',quantity:1}],'drop:1'));
  const sword=s.items.find(x=>x.base==='b_sword').uid, strong=s.items.find(x=>x.base==='g_sword').uid, horse=s.items.find(x=>x.base==='b_horse').uid;
  s=done(inventory.equip(s,'liu',sword,'equip:1'));
  assert.equal(inventory.bonuses(s,'liu').atk,11);
  assert.equal(inventory.bonuses(s,'liu').weaponAtk,11);
  rejected(inventory.equip(s,'guan',sword,'equip:2'),'EQUIPPED_BY_OTHER_HERO',s);
  s=done(inventory.equip(s,'liu',strong,'equip:3'));
  assert.equal(s.items.length,3);
  assert.equal(inventory.bonuses(s,'liu').weaponAtk,29);
  s=done(inventory.equip(s,'liu',horse,'equip:4'));
  assert.equal(inventory.bonuses(s,'liu').horseAtk,7);
  assert.equal(inventory.bonuses(s,'liu').atk,36);
  s=done(inventory.unequip(s,'liu','weapon','unequip:1'));
  assert.equal(inventory.bonuses(s,'liu').weaponAtk,0);
  assert.equal(s.items.length,3);
  rejected(inventory.unequip(s,'liu','weapon','unequip:2'),'SLOT_EMPTY',s);
  rejected(inventory.equip(s,'unowned',sword,'equip:5'),'HERO_NOT_FOUND',s);
});
test('04 reinforcement keeps existing R03 cost/stats and never charges twice', () => {
  let s=done(inventory.grant(fresh(),[{id:'b_sword',quantity:1}],'drop:1'));
  const uid=s.items[0].uid;
  s=done(inventory.equip(s,'liu',uid,'equip:1'));
  const before=s.silver, beforeIron=s.iron;
  const first=inventory.reinforce(s,uid,'upgrade:1');
  s=done(first);
  assert.equal(s.silver,before-350);
  assert.equal(s.iron,beforeIron-105);
  assert.equal(s.items[0].lv,2);
  assert.equal(inventory.bonuses(s,'liu').atk,13);
  assert.equal(inventory.reinforce(s,uid,'upgrade:1').duplicate,true);
  rejected(inventory.reinforce({...s,silver:0},uid,'upgrade:2'),'INSUFFICIENT_RESOURCES',{...s,silver:0});
});
test('05 project refinement consumes real materials and changes calculated stats', () => {
  let s=done(inventory.grant(fresh(),[{id:'b_sword',quantity:1},{id:'mdt-tinh-khoang',quantity:6}],'drop:1'));
  const uid=s.items[0].uid;
  s=done(inventory.equip(s,'liu',uid,'equip:1'));
  s=done(inventory.refine(s,uid,'refine:1'));
  assert.equal(s.items[0].refineLv,1);
  assert.equal(s.nlItemsV1.stacks['mdt-tinh-khoang'],4);
  assert.equal(s.silver,499400);
  assert.equal(inventory.bonuses(s,'liu').weaponAtk,12);
  s=done(inventory.refine(s,uid,'refine:2'));
  s=done(inventory.refine(s,uid,'refine:3'));
  rejected(inventory.refine(s,uid,'refine:4'),'REFINE_MAX',s);
});
test('06 consumables are explicit resource transactions with receipts', () => {
  let s=done(inventory.grant(fresh(),[{id:'mdt-tem-tiep-te',quantity:1}],'drop:1'));
  const before=s.iron;
  s=done(inventory.use(s,'mdt-tem-tiep-te','use:1'));
  assert.equal(s.iron,before+200);
  assert.equal(s.nlItemsV1.stacks['mdt-tem-tiep-te'],undefined);
  assert.equal(inventory.use(s,'mdt-tem-tiep-te','use:1').duplicate,true);
  rejected(inventory.use(s,'mdt-tem-tiep-te','use:2'),'OUT_OF_STOCK',s);
  rejected(inventory.use(s,'wiki-mobile-item02-1','use:3'),'REFERENCE_ONLY',s);
});
test('07 capacity and invalid input cannot create duplicates or lose resources', () => {
  let s=fresh();
  rejected(inventory.grant(s,[{id:'b_sword',quantity:201}],'drop:big'),'EQUIPMENT_CAPACITY',s);
  rejected(inventory.grant(s,[{id:'mdt-tem-tiep-te',quantity:1000}],'drop:big'),'BAD_GRANT_QTY',s);
  rejected(inventory.grant(s,[{id:'b_sword',quantity:1}],''),'RECEIPT_REQUIRED',s);
  s=done(inventory.grant(s,[{id:'mdt-tem-tiep-te',quantity:999}],'drop:stack'));
  rejected(inventory.grant(s,[{id:'mdt-tem-tiep-te',quantity:1}],'drop:more'),'STACK_CAPACITY',s);
  let bad=fresh();
  bad.items=[{uid:'dup',base:'b_sword',lv:1},{uid:'dup',base:'b_sword',lv:1}];
  rejected(inventory.grant(bad,[{id:'b_sword',quantity:1}],'drop:bad'),'DUPLICATE_INSTANCE_UID',bad);
});
test('08 legacy Save v5 shape, seven-slot alias and unknown Wiki stats stay safe', () => {
  let s=fresh();
  s.items=[{uid:'legacy-uid',base:'b_banner',lv:1}];
  s.gear.liu={banner:'legacy-uid'};
  assert.equal(inventory.bonuses(s,'liu').hp,115);
  assert.equal(s.version,5);
  s=done(inventory.unequip(s,'liu','banner','un:legacy'));
  assert.equal(s.items[0].base,'b_banner');
  assert.equal(pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY').every(x=>x.stats===null && x.effectRule===null),true);
  assert.equal(pack.items.filter(x=>x.integration==='REFERENCE_ONLY').every(x=>x.effectRule===null),true);
});

test('09 all 29 coded equipment templates have concrete original combat stats and source provenance', () => {
  const models=pack.equipment.filter(x=>x.id.startsWith('mdt-equip02-'));
  assert.equal(models.length,29);
  assert.equal(new Set(models.map(x=>x.id)).size,29);
  for(const row of models){
    assert.equal(row.integration,'PLAYABLE');
    assert.equal(row.provenance.classification,'SIMULATED');
    assert.equal(row.fieldProvenance.name,'VERIFIED');
    assert.equal(row.fieldProvenance.stats,'SIMULATED');
    assert.equal(Object.values(row.stats).some(v=>v>0),true);
    assert.equal(['weapon','armor','horse','book','cloak','shield','artifact'].includes(row.slot),true);
    assert.equal(row.requiredLevel>=1 && row.requiredLevel<=40,true);
  }
});
test('10 actual shop debits coin/iron atomically and does not sell reward-only relics',()=>{
  const original=fresh();
  let s=done(inventory.buy(original,'mdt-equip02-1','shop:001'));
  assert.equal(s.items.length,1);
  assert.equal(s.items[0].base,'mdt-equip02-1');
  assert.equal(s.silver,original.silver-920);
  assert.equal(s.iron,original.iron-154);
  assert.equal(inventory.buy(s,'mdt-equip02-1','shop:001').duplicate,true);
  rejected(inventory.buy(s,'mdt-equip02-23','shop:rare'),'EQUIPMENT_NOT_FOR_SALE',s);
  rejected(inventory.buy(s,'wiki-mobile-equip02-1','shop:wiki'),'REFERENCE_ONLY',s);
  const broke={...s,silver:0};
  rejected(inventory.buy(broke,'mdt-equip02-2','shop:no-money'),'INSUFFICIENT_RESOURCES',broke);
});
test('11 seven high-tier Cung Ky items equip to seven different real slots with level gate',()=>{
  const ids=Array.from({length:7},(_,i)=>'mdt-equip02-'+(23+i));
  const all=ids.map(id=>({id,quantity:1}));
  let s=done(inventory.grant(fresh(),all,'boss:1'));
  rejected(inventory.equip(s,'liu',s.items[0].uid,'equip:locked'),'HERO_LEVEL_REQUIRED',s);
  s.hero.liu.level=40;
  const ownedUids=s.items.map(x=>x.uid);
  for(let i=0;i<ownedUids.length;i++)s=done(inventory.equip(s,'liu',ownedUids[i],'equip:ck-'+i));
  assert.equal(Object.keys(s.gear.liu).length,7);
  assert.equal(new Set(Object.values(s.gear.liu)).size,7);
  assert.equal(inventory.sets(s,'liu').length,3);
  const bonus=inventory.bonuses(s,'liu');
  assert.equal(bonus.weaponAtk,275);
  assert.equal(bonus.atk>275,true);
  assert.equal(bonus.def>0 && bonus.int>0 && bonus.hp>0 && bonus.tdef>0 && bonus.mdef>0,true);
  const before=inventory.sets(s,'liu').length;
  s=done(inventory.unequip(s,'liu','artifact','unequip:ck'));
  assert.equal(inventory.sets(s,'liu').length,before-1);
});
test('12 new equipment reinforcement and reload retain UID, level, stats and no extra receipt',()=>{
  let s=done(inventory.buy(fresh(),'mdt-equip02-5','shop:new'));
  const uid=s.items[0].uid;
  s=done(inventory.equip(s,'liu',uid,'equip:new'));
  const atk=inventory.bonuses(s,'liu').atk;
  s=done(inventory.reinforce(s,uid,'reinforce:new'));
  assert.equal(inventory.bonuses(s,'liu').atk>atk,true);
  const saved=JSON.parse(JSON.stringify(s));
  assert.equal(saved.nlItemsV1.receipts['reinforce:new']!==undefined,true);
  assert.equal(inventory.reinforce(saved,uid,'reinforce:new').duplicate,true);
  assert.equal(saved.items[0].lv,2);
  assert.equal(saved.version,5);
});

test('A9 workshop + engraving discount uses the same quote and debit',()=>{
  let s=done(inventory.grant(fresh(),[{id:'b_sword',quantity:1}],'a9:grant'));
  s.nlCity={levels:{nl_city_workshop:3,nl_city_engraving:2}};
  const quote=inventory.reinforcementCost(1,s);
  assert.equal(quote.silver,322);
  const result=inventory.reinforce(s,s.items[0].uid,'a9:reinforce');
  assert.equal(result.ok,true,result.code);
  assert.equal(result.state.silver,s.silver-quote.silver);
  assert.equal(result.state.iron,s.iron-quote.iron);
});
test('A9 warehouse adds five actual equipment slots per level',()=>{
  let s=fresh();s.nlCity={levels:{nl_city_warehouse:1}};
  s.items=Array.from({length:200},(_,i)=>({uid:'a9-'+i,base:'b_sword',lv:1}));
  s=done(inventory.grant(s,[{id:'b_sword',quantity:5}],'a9:expand'));
  assert.equal(s.items.length,205);
  rejected(inventory.grant(s,[{id:'b_sword',quantity:1}],'a9:full'),'EQUIPMENT_CAPACITY',s);
});
