'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const index=require('../data/ngoalong/modules/inventory/wiki_items_index_20261119.json');
const pack=require('../data/ngoalong/modules/inventory/catalogue.json');
const groups=require('../data/ngoalong/modules/inventory/item_groups_v1.json');
const {build}=require('../data/ngoalong/modules/inventory/index_builder.js');
const {createModule,validatePack}=require('../data/ngoalong/modules/inventory/consumables_engine.js');
const COUNT=Object.values(index.extractedCounts).reduce((a,b)=>a+b,0);
test('real Wiki source IDs never derive from sequential position, and 674 is target not verified coverage',()=>{
 assert.equal(index.declaredCount,674);
 assert.equal(index.extractedCount,COUNT);
 assert.equal(index.rows.length,COUNT);
 assert.equal(index.isIndexComplete,COUNT===674);
 assert.equal(new Set(index.rows.map(x=>x.id)).size,COUNT);
 assert.equal(index.rows.every(x=>/^wiki-item-index-[a-f0-9]{16}(?:-[2-9]\d*)?$/.test(x.id)),true);
 assert.equal(index.rows.every(x=>x.integration==='REFERENCE_ONLY'&&x.stats===null&&x.effectRule===null),true);
 assert.equal(index.missingCounts['Tài Nguyên']+index.extractedCounts['Tài Nguyên'],82);
});
test('actual live Wiki snapshot imports reproducibly, all refs/active project models remain distinct',()=>{
 const reimport=build(pack,index,groups);
 assert.deepEqual(reimport,pack);
 assert.equal(pack.projectItemsExpansion.transcribed,COUNT);
 assert.equal(pack.projectItemsExpansion.unresolved,674-COUNT);
 const ignored=index.rows.filter(x=>groups.modelRules[x.sourceCategory].category==='reference').length;
 assert.equal(pack.projectItemsExpansion.playableProjectModels,COUNT-ignored);
 assert.equal(pack.items.filter(x=>x.integration==='REFERENCE_ONLY').length,COUNT);
 assert.equal(pack.items.filter(x=>x.integration==='PLAYABLE').length,COUNT-ignored+2);
 assert.equal(Object.keys(validatePack(pack,groups)).length,COUNT*2-ignored+2);
});
test('all Wiki-backed active items can be instantiated in the same authoritative Save v5 item ledger',()=>{
 const original={
   version:5,hero:{liu:{level:1,xp:0}},items:[],gear:{liu:{}},
   silver:100000,iron:10000,grain:10000,prestige:1000,
   nlItemsV1:{stacks:{},receipts:{},serial:0}
 };
 const act=pack.items.filter(x=>x.integration==='PLAYABLE'&&x.sourceIndexId);
 assert.equal(act.length,COUNT-index.rows.filter(x=>groups.modelRules[x.sourceCategory].category==='reference').length);
 const engine=createModule(pack,groups);
 for(const row of act.slice(0,15)){
   const grant=original.nlItemsV1.stacks;
   grant[row.id]=4;
   const detail=engine.inspect(row.id);
   assert.equal(detail.found,true);
   assert.equal(detail.provenance,'SIMULATED');
 }
 const reference=pack.items.find(x=>x.integration==='REFERENCE_ONLY');
 const rejected=engine.use(original,reference.id,'invalid:ref');
 assert.equal(rejected.ok,false);
 assert.equal(rejected.code,'REFERENCE_ONLY');
});
