'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pack=require('../data/ngoalong/modules/inventory/catalogue.json');
const balance=require('../data/ngoalong/modules/inventory/balance_v1.js');
test('674 source and 669 simulated playable model remain separate',()=>{
  const v=balance.validate(pack);
  assert.deepEqual([v.gear,v.items,v.groups],[411,669,7]);
  assert.equal(pack.items.filter(x=>x.integration==='REFERENCE_ONLY').length,674);
  assert.equal(pack.items.filter(x=>x.integration==='PLAYABLE'&&x.provenance?.classification!=='SIMULATED').length,0);
});
test('all 28 campaign stages have deterministic legal gear and materials; bosses additionally have chest',()=>{
  const all=new Map([...pack.equipment,...pack.items].map(x=>[x.id,x]));
  for(let stage=1;stage<=28;stage++){
    const a=balance.select(pack,stage),b=balance.select(pack,stage);
    assert.deepEqual(a,b,'stage '+stage);
    assert.equal(a.entries.length,stage%4===0?4:3,'stage '+stage);
    assert.equal(a.entries[0].quantity,1);
    assert.equal(a.entries[1].quantity,2);
    for(const e of a.entries){
      assert.equal(all.get(e.id)?.integration,'PLAYABLE',e.id);
      assert.equal(all.get(e.id)?.provenance?.classification,'SIMULATED',e.id);
    }
    assert.equal(all.get(a.entries[1].id).sourceCategory,'Vật Liệu');
    const categories=Object.keys(balance.CONFIG.categoryWeights);
    assert.equal(all.get(a.entries[2].id).sourceCategory,categories[(stage-1)%7]);
    if(stage%4===0)assert.equal(all.get(a.entries[3].id).sourceCategory,'Rương');
    if(stage>1)assert.ok(a.chapter>=1&&a.chapter<=7);
  }
});
test('no out-of-range or bad-seed awards',()=>{
  for(const stage of [0,29,-1,1.5,NaN])assert.throws(()=>balance.select(pack,stage));
  assert.throws(()=>balance.select(pack,1,-1));
});
