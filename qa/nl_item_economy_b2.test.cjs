'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pack=require('../data/ngoalong/modules/inventory/catalogue.json');
const balance=require('../data/ngoalong/modules/inventory/balance_v1.js');
const {createModule:inventory}=require('../data/ngoalong/modules/inventory/engine.js');
const {createModule:consumables}=require('../data/ngoalong/modules/inventory/consumables_engine.js');
const gearRules=require('../data/ngoalong/modules/inventory/rules.json');
const itemRules=require('../data/ngoalong/modules/inventory/item_groups_v1.json');
const adjusted=balance.apply(pack),gear=inventory(adjusted,gearRules);
const items=consumables(adjusted,itemRules);
const state=()=>({version:5,hero:{liu:{level:10,xp:0}},roster:['liu'],
  silver:100000,iron:100000,grain:0,prestige:0,items:[],gear:{liu:{}},
  nlItemsV1:{stacks:{},receipts:{},serial:0,actionNonce:0,rewardBaseline:[],pendingAwards:{}}});
const copy=o=>JSON.parse(JSON.stringify(o));
test('B2 667 project models in seven tiers, two legacy active, 674 Wiki references immutable',()=>{
  const audit=balance.economicAudit(pack);
  assert.equal(audit.count,667);
  assert.equal(Object.values(audit.byTier).reduce((a,b)=>a+b,0),667);
  assert.equal(adjusted.items.filter(x=>x.integration==='PLAYABLE').length,669);
  assert.equal(adjusted.items.filter(x=>x.integration==='REFERENCE_ONLY').length,674);
  const before=pack.items.filter(x=>x.integration==='REFERENCE_ONLY');
  assert.deepEqual(adjusted.items.filter(x=>x.integration==='REFERENCE_ONLY'),before);
  const project=pack.items.filter(x=>x.integration==='PLAYABLE'&&!x.sourceId);
  for(const item of project)assert.deepEqual(adjusted.items.find(x=>x.id===item.id),item);
  assert.deepEqual(balance.apply(adjusted),adjusted);
});
test('B2 bounded economy effects all seven categories; late tier no weaker than early tier',()=>{
  const byGroup=Object.groupBy(adjusted.items.filter(x=>x.balanceTier),x=>x.sourceCategory);
  assert.equal(Object.keys(byGroup).length,7);
  for(const rows of Object.values(byGroup)){
    assert.ok(rows.length>0);
    const low=rows.find(x=>x.balanceTier===Math.min(...rows.map(y=>y.balanceTier)));
    const high=rows.find(x=>x.balanceTier===Math.max(...rows.map(y=>y.balanceTier)));
    const amount=x=>x.effectRule.amount??x.effectRule.resources?.silver??x.effectRule.silverCost;
    assert.ok(amount(high)>=amount(low));
    for(const row of rows){
      assert.equal(row.provenance.classification,'SIMULATED');
      assert.equal(row.acquisitionRule.dropRate,null);
    }
  }
});
test('B2 28 stages reward bounded, source tier appropriate and every supported category reachable',()=>{
  const all=new Map([...adjusted.items,...adjusted.equipment].map(x=>[x.id,x]));
  const obtained=new Set();
  let total=0;
  for(let stage=1;stage<=28;stage++){
    const award=balance.select(adjusted,stage);
    assert.deepEqual(award,balance.select(adjusted,stage));
    assert.ok(award.entries.length<=4);
    const ids=new Set();
    for(const e of award.entries){
      assert.ok(e.quantity>=1&&e.quantity<=2);
      assert.ok(all.get(e.id)?.integration==='PLAYABLE');
      ids.add(e.id);total+=e.quantity;
      const row=all.get(e.id);
      if(row.balanceTier)assert.ok(row.balanceTier>=Math.max(1,award.chapter));
      if(row.sourceCategory)obtained.add(row.sourceCategory);
    }
  }
  assert.equal(obtained.size,7);
  assert.ok(total<=28*6);
});
test('B2 28 first-clears are finite: replay receipt cannot mint more goods',()=>{
  let s=state();
  for(let stage=1;stage<=28;stage++){
    const grant=balance.select(adjusted,stage);
    const rid='stage:'+stage;
    const first=gear.grant(s,grant.entries,rid);
    assert.equal(first.ok,true,first.code);
    s=first.state;
    const duplicate=gear.grant(s,grant.entries,rid);
    assert.equal(duplicate.ok,true);
    assert.equal(duplicate.duplicate,true);
    assert.strictEqual(duplicate.state,s);
  }
  assert.equal(s.items.length,28);
  assert.equal(Object.keys(s.nlItemsV1.receipts).length,28);
  assert.equal(s.version,5);
});
test('B2 recipe consumes real input + silver and failed/duplicate crafting is immutable',()=>{
  const material=adjusted.items.find(x=>x.sourceCategory==='Vật Liệu'&&x.balanceTier===7);
  assert.ok(material);
  let s=state(),r=material.effectRule;
  s.nlItemsV1.stacks[material.id]=r.needPieces;
  const out=items.process(s,material.id,'craft:one');
  assert.equal(out.ok,true,out.code);
  assert.equal(out.state.silver,s.silver-r.silverCost);
  assert.equal(out.state.nlItemsV1.stacks['mdt-tinh-khoang'],1);
  assert.equal(out.state.nlItemsV1.stacks[material.id],undefined);
  const retry=items.process(out.state,material.id,'craft:one');
  assert.equal(retry.duplicate,true);
  const noInput=items.process(out.state,material.id,'craft:two');
  assert.equal(noInput.ok,false);
  assert.deepEqual(noInput.state,out.state);
});
test('B2 no resource duplication by failed chest use or receipt collision',()=>{
  const chest=adjusted.items.find(x=>x.sourceCategory==='Rương'&&x.balanceTier===7);
  let s=state();s.nlItemsV1.stacks[chest.id]=1;
  s.nlItemsV1.stacks['mdt-tinh-khoang']=999;
  const pre=copy(s);
  const failed=items.use(s,chest.id,'overflow:1');
  assert.equal(failed.ok,false);
  assert.deepEqual(failed.state,pre);
  assert.deepEqual(s,pre);
  delete s.nlItemsV1.stacks['mdt-tinh-khoang'];
  const done=items.use(s,chest.id,'use:one');
  assert.equal(done.ok,true,done.code);
  const conflict=items.use(done.state,chest.id,'use:one','liu');
  assert.equal(conflict.code,'RECEIPT_CONFLICT');
  assert.deepEqual(conflict.state,done.state);
});

test('B2 late-game refine has a material and silver premium; early-game price stays legacy',()=>{
  const high=adjusted.equipment.find(x=>x.integration==='PLAYABLE'&&
    x.sourceId&&['Diệt Thế','Thần Hoàng'].includes(x.sourceGroup));
  const early=adjusted.equipment.find(x=>x.integration==='PLAYABLE'&&
    x.sourceId&&['Thường','Chiến'].includes(x.sourceGroup));
  assert.ok(high,'late-game item missing');
  assert.ok(early,'early-game item missing');
  function priced(row){
    let s=state();
    s.nlItemsV1.stacks['mdt-tinh-khoang']=12;
    s=gear.grant(s,[{id:row.id,quantity:1}],'award:'+row.id).state;
    const uid=s.items[0].uid;
    const result=gear.refine(s,uid,'refine:'+row.id);
    assert.equal(result.ok,true,result.code);
    return {silver:s.silver-result.state.silver,
      material:s.nlItemsV1.stacks['mdt-tinh-khoang']-result.state.nlItemsV1.stacks['mdt-tinh-khoang']};
  }
  assert.deepEqual(priced(early),{silver:600,material:2});
  assert.deepEqual(priced(high),{silver:1200,material:4});
});
