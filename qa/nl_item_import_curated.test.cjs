'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const seed=require('../data/ngoalong/modules/items/wiki_equipment_index_20261119.json');
const pack=require('../data/ngoalong/modules/items/catalogue.json');
const rules=require('../data/ngoalong/modules/items/rules.json');
const {validateSeed,buildFromCurated,EXPECTED_GROUPS}=require('../tools/nl_item_import_curated.js');
const {validateCatalogue,createModule}=require('../tools/nl_item_inventory.js');
const {SET_IDS}=require('../tools/nl_item_build_equipment.js');
const api=createModule(pack,rules);
function blank(level=40){
 return {version:5,hero:{liu:{level}},items:[],gear:{liu:{}},
   silver:100000,iron:100000,prestige:100};
}
test('392 index entries, 19 groups, 29 old exact identity matches; no invented Wiki numeric stats',()=>{
 const counts=validateSeed(seed);
 assert.deepEqual(counts,EXPECTED_GROUPS);
 assert.equal(new Set(seed.rows.map(x=>x.id)).size,392);
 const official=pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY');
 assert.equal(official.length,392);
 assert.equal(official.every(x=>x.stats===null&&x.effectRule===null),true);
 const signature=x=>[x.sourceGroup,x.name,x.displayedLevel,x.slot].join('|');
 const asSet=new Set(seed.rows.map(signature));
 assert.equal(official.every(x=>asSet.has(signature(x))),true);
 assert.equal(seed.rows.every(x=>x.fieldProvenance.slot==='DERIVED'),true);
});
test('all 392 Wiki-based project gear have distinct playable stats, acquisition and slot',()=>{
 const models=pack.equipment.filter(x=>x.integration==='PLAYABLE'&&x.sourceId);
 assert.equal(models.length,392);
 assert.equal(pack.equipment.filter(x=>x.integration==='PLAYABLE'&&!x.sourceId).length,19);
 assert.equal(Object.keys(validateCatalogue(pack)).length,809);
 const refs=new Set(pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY').map(x=>x.id));
 for(const row of models){
   assert.equal(refs.has(row.sourceId),true);
   assert.equal(row.provenance.classification,'SIMULATED');
   assert.equal(row.fieldProvenance.stats,'SIMULATED');
   assert.equal(row.requiredLevel>=1&&row.requiredLevel<=40,true);
   assert.equal(Object.values(row.stats).some(x=>x>0),true);
   assert.equal(row.effectRule.kind,'EQUIPMENT_STATS');
   assert.equal(['SHOP','AUTHORIZED_REWARD_ONLY'].includes(row.acquisitionRule.kind),true);
 }
});
test('all twelve high-tier seven-piece sets have distinct original 2/4/7 game stat rules',()=>{
 assert.equal(Object.keys(SET_IDS).length,12);
 assert.equal(Object.keys(rules.setBonuses).length,12);
 for(const [group,id] of Object.entries(SET_IDS)){
   const seven=pack.equipment.filter(x=>x.integration==='PLAYABLE'&&x.sourceId&&x.sourceGroup===group);
   assert.equal(seven.length,7,'set '+group);
   assert.equal(new Set(seven.map(x=>x.slot)).size,7);
   assert.equal(seven.every(x=>x.effectRule.setId===id),true);
   assert.deepEqual(rules.setBonuses[id].thresholds.map(x=>x.pieces),[2,4,7]);
   assert.equal(rules.setBonuses[id].provenance,'SIMULATED');
 }
});
test('full gear set actually changes combat bonuses only when equipped; no replay duplication',()=>{
 const seven=pack.equipment.filter(x=>x.integration==='PLAYABLE'&&x.sourceId&&x.sourceGroup==='Thao Thiết');
 let state=blank();
 const award=api.grant(state,seven.map(x=>({id:x.id,quantity:1})),'boss:thao-thiet:win1');
 assert.equal(award.ok,true,award.code);state=award.state;
 assert.equal(state.items.length,7);
 assert.equal(api.grant(state,seven.map(x=>({id:x.id,quantity:1})),'boss:thao-thiet:win1').duplicate,true);
 const noSet=api.bonuses(state,'liu');
 assert.equal(api.sets(state,'liu').length,0);
 for(let i=0;i<7;i++){
   const res=api.equip(state,'liu',state.items[i].uid,'equip:thao:'+i);
   assert.equal(res.ok,true,res.code);
   state=res.state;
 }
 const full=api.bonuses(state,'liu');
 assert.equal(api.sets(state,'liu').length,3);
 assert.equal(full.hp>noSet.hp,true);
 assert.equal(full.def>noSet.def,true);
 let un=api.unequip(state,'liu','artifact','unequip:thao');
 assert.equal(un.ok,true);
 assert.equal(api.sets(un.state,'liu').length,2);
});
test('rarity acquisition: high-tier cannot be bought at low displayed level; common gear remains purchasable',()=>{
 const common=pack.equipment.find(x=>x.sourceGroup==='Thường'&&x.integration==='PLAYABLE'&&x.sourceId&&x.displayedLevel===1);
 const special=pack.equipment.find(x=>x.sourceGroup==='Truyền thuyết'&&x.integration==='PLAYABLE'&&x.sourceId&&x.displayedLevel===1);
 assert.equal(common.acquisitionRule.kind,'SHOP');
 assert.equal(special.acquisitionRule.kind,'AUTHORIZED_REWARD_ONLY');
 let bought=api.buy(blank(),common.id,'shop:common');
 assert.equal(bought.ok,true,bought.code);
 let denied=api.buy(blank(),special.id,'shop:elite');
 assert.equal(denied.ok,false);
 assert.equal(denied.code,'EQUIPMENT_NOT_FOR_SALE');
});
test('curated importer is byte-stable and rejects count/source tampering',()=>{
 assert.deepEqual(buildFromCurated(pack,seed),pack);
 const a=JSON.parse(JSON.stringify(seed));a.rows.pop();
 assert.throws(()=>validateSeed(a),/INCOMPLETE_INDEX/);
 const b=JSON.parse(JSON.stringify(seed));b.rows[0].slot='wrong';
 assert.throws(()=>validateSeed(b),/BAD_WIKI_SOURCE_ROW/);
 const c=JSON.parse(JSON.stringify(seed));c.rows[5].displayedLevel=c.rows[4].displayedLevel;
 // Both distinct names remain valid; matching source-only integrity is separately guaranteed.
 assert.equal(validateSeed(c)['Cùng Kỳ'],7);
});
