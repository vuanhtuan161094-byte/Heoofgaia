'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const rules=require('../data/ngoalong/modules/inventory/item_groups_v1.json');
const fullPack=require('../data/ngoalong/modules/inventory/catalogue.json');
const pack={...fullPack,items:fullPack.items.filter(x=>
  x.id==='mdt-tem-tiep-te'||x.id==='mdt-tinh-khoang'||/^wiki-mobile-item02-[1-4]$/.test(x.id))};
// Synthetic QA uses the original 2+4 baseline; live-index cases are tested separately.
const {build}=require('../data/ngoalong/modules/inventory/index_builder.js');
const {createModule,validatePack}=require('../data/ngoalong/modules/inventory/consumables_engine.js');
const categories=rules.sourceCounts;
function fixture(){
 const rows=[];
 const prior=pack.items.filter(x=>x.integration==='REFERENCE_ONLY');
 for(const p of prior){
   rows.push({id:'wiki-item-index-'+String(rows.length+1).padStart(4,'0'),
     name:p.name,sourceGroup:p.sourceGroup,sourceCategory:'Rương',
     displayedLevel:p.displayedLevel,integration:'REFERENCE_ONLY',
     stats:null,effectRule:null,acquisitionRule:null,
     fieldProvenance:{displayedLevel:'VERIFIED'},
     provenance:{classification:'VERIFIED'}});
 }
 for(const [group,count] of Object.entries(categories)){
   const expected=(group==='Rương'?count-4:
      ['Truyền Thừa Lệnh','Lệnh','Chìa Khóa','Khác'].includes(group)?0:count);
   for(let i=0;i<expected;i++){
     rows.push({id:'wiki-item-index-'+String(rows.length+1).padStart(4,'0'),
       name:'Nội dung '+group+' '+i,sourceGroup:group,sourceCategory:group,
       displayedLevel:(i%20)+1,integration:'REFERENCE_ONLY',
       stats:null,effectRule:null,acquisitionRule:null,
       fieldProvenance:{displayedLevel:'VERIFIED'},
       provenance:{classification:'VERIFIED'}});
   }
 }
 return {declaredCount:674,extractedCount:rows.length,categoryCounts:categories,rows};
}
const sample=fixture();
const built=build(pack,sample,rules);
const api=createModule(built,rules);
const original=()=>({version:5,hero:{liu:{level:1,xp:0}},
 items:[],gear:{liu:{}},silver:25000,iron:200,grain:100,
 prestige:100,nlItemsV1:{stacks:{},receipts:{},serial:0}});
const get=(group,kind)=>built.items.find(x=>x.sourceCategory===group&&x.integration==='PLAYABLE'&&
 (!kind||x.effectRule.kind===kind));
const copy=x=>JSON.parse(JSON.stringify(x));
test('01 index 674 declared / 667 visible preserves four old refs and 2 authored projects',()=>{
 assert.equal(sample.rows.length,667);
 assert.equal(built.projectItemsExpansion.transcribed,667);
 assert.equal(built.projectItemsExpansion.unresolved,7);
 assert.equal(built.items.filter(x=>x.integration==='REFERENCE_ONLY').length,667);
 assert.equal(built.items.filter(x=>x.integration==='PLAYABLE').length,669);
 assert.equal(built.items.find(x=>x.id==='mdt-tem-tiep-te').effectRule.amount,200);
 assert.equal(built.items.find(x=>x.id==='mdt-tinh-khoang').integration,'PLAYABLE');
 assert.equal(Object.keys(validatePack(built,rules)).length,1336);
 assert.deepEqual(build(built,sample,rules),built);
});
test('02 model all 7 supported categories with distinct project action types, preserve null Wiki effects',()=>{
 const expected={'Rương':'OPEN_BUNDLE','Vật Liệu':'CRAFT_REAGENT',
   'Tài Nguyên':'GRANT_RESOURCE','Túi Phúc':'OPEN_BUNDLE',
   'Ấn Thạch':'CRAFT_REAGENT','Danh Phẩm':'GRANT_RESOURCE',
   'Bí Tịch':'TRAIN_HERO_XP'};
 for(const [group,kind] of Object.entries(expected)){
   const item=get(group,kind);
   assert.ok(item,group);
   assert.equal(item.provenance.classification,'SIMULATED');
   assert.equal(item.fieldProvenance.effectRule,'SIMULATED');
   assert.equal(item.sourceId.startsWith('wiki-'),true);
   assert.equal(item.effectRule.kind,kind);
 }
 assert.equal(built.items.filter(x=>x.integration==='REFERENCE_ONLY')
   .every(x=>x.effectRule===null),true);
});
test('03 chest opening spends exactly one and grants resources plus stack material once',()=>{
 const chest=get('Rương','OPEN_BUNDLE');
 let s=original();s.nlItemsV1.stacks[chest.id]=2;
 const first=api.use(s,chest.id,'chest:one');
 assert.equal(first.ok,true,first.code);
 assert.equal(first.state.nlItemsV1.stacks[chest.id],1);
 assert.equal(first.state.nlItemsV1.stacks['mdt-tinh-khoang']>=1,true);
 assert.equal(first.state.silver>s.silver,true);
 assert.equal(first.state.iron>s.iron,true);
 const repeated=api.use(first.state,chest.id,'chest:one');
 assert.equal(repeated.duplicate,true);
 assert.strictEqual(repeated.state,first.state);
 const conflict=api.use(first.state,chest.id,'chest:one','liu');
 assert.equal(conflict.ok,false);
 assert.equal(conflict.code,'RECEIPT_CONFLICT');
 assert.deepEqual(conflict.state,first.state);
});
test('04 processing real 3 material units costs silver and returns refinement reagent',()=>{
 const mat=get('Vật Liệu','CRAFT_REAGENT');
 let s=original();s.nlItemsV1.stacks[mat.id]=mat.effectRule.needPieces;
 const out=api.process(s,mat.id,'craft:one');
 assert.equal(out.ok,true,out.code);
 assert.equal(out.state.nlItemsV1.stacks[mat.id],undefined);
 assert.equal(out.state.silver,s.silver-mat.effectRule.silverCost);
 assert.equal(out.state.nlItemsV1.stacks['mdt-tinh-khoang'],
   mat.effectRule.outputQuantity);
 assert.equal(api.process(out.state,mat.id,'craft:one').duplicate,true);
});
test('05 failing recipes/items preserve exact immutable state and receipts',()=>{
 const chest=get('Rương','OPEN_BUNDLE'),mat=get('Vật Liệu','CRAFT_REAGENT');
 const s=original();s.nlItemsV1.stacks[chest.id]=1;
 let bad=api.process(s,mat.id,'craft:none');
 assert.equal(bad.ok,false);assert.equal(bad.code,'NOT_ENOUGH_ITEMS');
 assert.deepEqual(bad.state,s);
 const full=copy(s);full.nlItemsV1.stacks['mdt-tinh-khoang']=999;
 bad=api.use(full,chest.id,'chest:overflow');
 assert.equal(bad.ok,false);assert.equal(bad.code,'STACK_CAPACITY');
 assert.deepEqual(bad.state,full);
 const wiki=built.items.find(x=>x.integration==='REFERENCE_ONLY');
 bad=api.use(s,wiki.id,'wiki:blocked');
 assert.equal(bad.code,'REFERENCE_ONLY');
});
test('06 resource item redeems, manual trains hero and gift redeems prestige',()=>{
 const res=get('Tài Nguyên'),book=get('Bí Tịch'),gift=get('Danh Phẩm');
 let s=original();
 for(const id of [res.id,book.id,gift.id])s.nlItemsV1.stacks[id]=1;
 const oldSilver=s.silver,oldXP=s.hero.liu.xp,oldPrestige=s.prestige;
 s=api.use(s,res.id,'resource:one').state;
 assert.equal(s.silver>oldSilver,true);
 s=api.use(s,book.id,'manual:one','liu').state;
 assert.equal(s.hero.liu.xp!==oldXP||s.hero.liu.level>1,true);
 s=api.use(s,gift.id,'gift:one').state;
 assert.equal(s.prestige>oldPrestige,true);
});
test('07 original Save v5 receipt ledger and equipment IDs survive consumable actions',()=>{
 const src=original();
 src.items=[{uid:'old-42',base:'b_sword',lv:6}];
 src.gear.liu.weapon='old-42';
 src.nlItemsV1.receipts['nli:stage:2']='original-stage-receipt';
 const chest=get('Rương');
 src.nlItemsV1.stacks[chest.id]=1;
 const out=api.use(src,chest.id,'chest:v5');
 assert.equal(out.ok,true);
 assert.equal(out.state.version,5);
 assert.deepEqual(out.state.items,src.items);
 assert.deepEqual(out.state.gear,src.gear);
 assert.equal(out.state.nlItemsV1.receipts['nli:stage:2'],'original-stage-receipt');
});
test('08 reject malformed index, source count changes and unsupported model actions',()=>{
 const bad=copy(sample);bad.declaredCount=673;
 assert.throws(()=>build(pack,bad,rules),/SOURCE_COVERAGE_TOO_SMALL/);
 const malformed=copy(built);
 malformed.items.find(x=>x.integration==='REFERENCE_ONLY').effectRule={kind:'GRANT_RESOURCE'};
 assert.throws(()=>validatePack(malformed,rules),/REFERENCE_EFFECT_FORBIDDEN/);
});
