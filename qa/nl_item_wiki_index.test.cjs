'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { parseIndex, TARGET, SLOT_FILTERS, assignFilteredSlots } = require('../tools/nl_item_wiki_index.js');
function wikiFixture(domain, total) {
  const equipment=domain==='equipment';
  const heading=equipment? 'Tổng '+total+' trang bị':'Tổng '+total+' vật phẩm';
  const lines=Array.from({length:total},(_,i)=>
    (equipment?'Kiếm Thử ': 'Túi Thử ')+(i+1)+' Cấp '+(i+1));
  return [heading,'+Thử nghiệm '+total,...lines,'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG'].join('\n');
}
test('Wiki equipment index parser accepts exactly 392 visible records without live effects',()=>{
  const a=parseIndex(wikiFixture('equipment',TARGET.equipment),'equipment');
  assert.equal(a.extracted,392);
  assert.equal(new Set(a.rows.map(x=>x.id)).size,392);
  assert.equal(a.rows.every(x=>x.integration==='REFERENCE_ONLY'&&x.stats===null&&x.effectRule===null),true);
  assert.equal(a.rows[0].displayedLevel,1);
});
test('Wiki item index parser accepts 674 and refuses changed/missing rows',()=>{
  const a=parseIndex(wikiFixture('items',TARGET.items),'items');
  assert.equal(a.extracted,674);
  assert.equal(a.rows[0].requiredLevel,null);
  assert.throws(()=>parseIndex(wikiFixture('items',673),'items'),/SOURCE_COUNT_CHANGED/);
  assert.throws(()=>parseIndex('Tổng 674 vật phẩm\nTên Cấp 1','items'),/INCOMPLETE_PARSE/);
});

test('Wiki seven equipment filter views assign each of 392 index rows to one grounded slot',()=>{
  const index=parseIndex(wikiFixture('equipment',392),'equipment');
  const views={};
  SLOT_FILTERS.forEach(([slot],group)=>{
    const entries=index.rows.filter((_,i)=>i%7===group);
    views[slot]=['Tổng '+entries.length+' trang bị',
      ...entries.map(x=>x.name+' Cấp '+x.displayedLevel)].join('\n');
  });
  const resolved=assignFilteredSlots(index,views);
  assert.equal(resolved.rows.every(x=>x.slot&&x.fieldProvenance.slot==='VERIFIED'),true);
  assert.equal(Object.values(resolved.slotAudit.slotCounts).reduce((a,b)=>a+b,0),392);
  const bad={...views,weapon:'Tổng 0 trang bị'};
  assert.throws(()=>assignFilteredSlots(parseIndex(wikiFixture('equipment',392),'equipment'),bad),/FILTER_DID_NOT_APPLY/);
});
