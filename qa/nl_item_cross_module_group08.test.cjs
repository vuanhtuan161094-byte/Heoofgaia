'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pack=require('../data/ngoalong/modules/inventory/catalogue.json');
const gearRules=require('../data/ngoalong/modules/inventory/rules.json');
const itemRules=require('../data/ngoalong/modules/inventory/item_groups_v1.json');
const {createModule:createEquipment}=require('../data/ngoalong/modules/inventory/equipment_engine.js');
const {createModule:createConsumables}=require('../data/ngoalong/modules/inventory/consumables_engine.js');
const gear=createEquipment(pack,gearRules);
const items=createConsumables(pack,itemRules);
const newState=()=>({
 version:5,hero:{liu:{level:40,xp:0}},roster:['liu'],
 items:[],gear:{liu:{}},silver:1000000,iron:1000000,grain:50000,prestige:100,
 nlItemsV1:{stacks:{},receipts:{},serial:0,actionNonce:0}
});
const owned=fn=>{const a=fn;if(!a.ok)throw Error(a.code);return a.state};
test('01 one victory receipt can grant rare gear and chest; opening two chests supplies actual refine reagents',()=>{
 const chest=pack.items.find(x=>x.category==='consumable'&&x.sourceCategory==='Rương'&&x.integration==='PLAYABLE');
 const rare=pack.equipment.find(x=>x.id==='mdt-equip02-23');
 assert.ok(chest);assert.ok(rare);
 let state=newState();
 const payout=[{id:rare.id,quantity:1},{id:chest.id,quantity:2}];
 state=owned(gear.grant(state,payout,'stage:28:once'));
 assert.equal(state.items.length,1);
 assert.equal(state.nlItemsV1.stacks[chest.id],2);
 assert.equal(gear.grant(state,payout,'stage:28:once').duplicate,true);
 state=owned(gear.equip(state,'liu',state.items[0].uid,'equip:28'));
 const uid=state.items[0].uid;
 const before=gear.bonuses(state,'liu');
 state=owned(items.use(state,chest.id,'open:28:01'));
 state=owned(items.use(state,chest.id,'open:28:02'));
 assert.equal(state.nlItemsV1.stacks['mdt-tinh-khoang']>=2,true);
 const silver=state.silver;
 state=owned(gear.refine(state,uid,'refine:28'));
 const after=gear.bonuses(state,'liu');
 assert.equal(state.silver,silver-600);
 assert.equal(after.weaponAtk>before.weaponAtk,true);
 assert.equal(state.items.find(x=>x.uid===uid).refineLv,1);
 const json=JSON.stringify(state),restore=JSON.parse(json);
 assert.equal(gear.refine(restore,uid,'refine:28').duplicate,true);
 assert.equal(JSON.stringify(restore),json);
});
test('02 same receipt IDs cannot execute incompatible operations across modules',()=>{
 const chest=pack.items.find(x=>x.sourceCategory==='Rương'&&x.integration==='PLAYABLE');
 let state=newState();
 state=owned(gear.grant(state,[{id:chest.id,quantity:1}],'receipt:shared'));
 const failed=items.use(state,chest.id,'receipt:shared');
 assert.equal(failed.ok,false);
 assert.equal(failed.code,'RECEIPT_CONFLICT');
 assert.equal(failed.state,state);
 assert.equal(state.nlItemsV1.stacks[chest.id],1);
});
test('03 consumable and gear source-only entries cannot be granted or consumed',()=>{
 const item=pack.items.find(x=>x.integration==='REFERENCE_ONLY');
 const equipment=pack.equipment.find(x=>x.integration==='REFERENCE_ONLY');
 const before=newState();
 const wrongItem=gear.grant(before,[{id:item.id,quantity:1}],'source:blocked');
 const wrongGear=gear.grant(before,[{id:equipment.id,quantity:1}],'source:blocked-gear');
 const wrongUse=items.use(before,item.id,'source:blocked-use');
 assert.equal(wrongItem.ok,false);assert.equal(wrongItem.code,'REFERENCE_ONLY');
 assert.equal(wrongGear.ok,false);assert.equal(wrongGear.code,'REFERENCE_ONLY');
 assert.equal(wrongUse.ok,false);assert.equal(wrongUse.code,'REFERENCE_ONLY');
 assert.deepEqual(before,newState());
});
