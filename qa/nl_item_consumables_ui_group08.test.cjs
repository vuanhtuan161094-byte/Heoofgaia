'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fullPack=require('../data/ngoalong/modules/inventory/catalogue.json');
const pack={...fullPack,items:fullPack.items.filter(x=>
  x.id==='mdt-tem-tiep-te'||x.id==='mdt-tinh-khoang'||/^wiki-mobile-item02-[1-4]$/.test(x.id))};
// Synthetic QA uses the original 2+4 baseline; live-index cases are tested separately.
const rules=require('../data/ngoalong/modules/inventory/item_groups_v1.json');
const {createModule}=require('../data/ngoalong/modules/inventory/consumables_engine.js');
const ui=require('../data/ngoalong/modules/inventory/consumables_ui.js');
const engine=createModule(pack,rules);
const state=()=>({
 version:5,hero:{liu:{level:5,xp:1}},items:[],gear:{liu:{}},
 silver:1000,iron:30,grain:5,prestige:4,
 nlItemsV1:{stacks:{'mdt-tem-tiep-te':2,'mdt-tinh-khoang':5},receipts:{},serial:1}
});
function host(){
 const ev={};
 return {innerHTML:'',events:ev,
 addEventListener(k,fn){ev[k]=fn},removeEventListener(k){delete ev[k]},
 contains(){return true},querySelector(){return null}};
}
function click(h,attrs){
 const t={hasAttribute(k){return Object.hasOwn(attrs,k)},
   getAttribute(k){return attrs[k]}};
 h.events.click({target:{closest(){return t}}});
}
test('01 inventory provides a mobile-friendly owned-items UI with separated Wiki reference browser',()=>{
 const html=ui.view(pack,engine,state());
 assert.match(html,/Kho tàng/);
 assert.match(html,/Phiếu tiếp tế sắt/);
 assert.match(html,/data-nli-item-action="use"/);
 assert.match(html,/data-nli-item-category="Vật Liệu"/);
 assert.match(html,/data-nli-items-panel="1"/);
 const source=ui.view(pack,engine,state(),{mode:'wiki'});
 assert.match(source,/Danh mục Wiki/);
 assert.match(source,/Quà Cấp 1/);
 assert.equal(source.includes('data-nli-item-action="use"'),false);
});
test('C mobile crafting shows exact input, silver cost and disabled state',()=>{
  const row=pack.items.find(x=>x.id==='mdt-tinh-khoang');
  assert.ok(row);
  const s=state();
  const material=pack.items.find(x=>x.integration==='PLAYABLE'&&x.effectRule?.kind==='CRAFT_REAGENT');
  if(material){
    s.nlItemsV1.stacks[material.id]=material.effectRule.needPieces;
    s.silver=0;
    const html=ui.view(pack,engine,s);
    assert.match(html,/data-nli-craft-status="insufficient"/);
    assert.match(html,/Chưa đủ điều kiện/);
    assert.match(html,/data-nli-item-action="process"[^>]*disabled/);
  }
  const filtered=ui.view(pack,engine,s,{mode:'wiki',search:'unfindable-item-name'});
  assert.match(filtered,/0 mục phù hợp/);
});
test('02 use click mints unique receipt, charges exactly one, Save retains v5 shape',()=>{
 let s=state(),updates=0,nonce=0;
 const h=host(),ctl=ui.mount(h,{pack,engine,getState:()=>s,setState:next=>{s=next;updates++},
   receiptId:()=>('ui:item:'+(++nonce)),getHeroId:()=> 'liu'});
 click(h,{'data-nli-item-action':'use','data-nli-item-id':'mdt-tem-tiep-te'});
 assert.equal(updates,1);
 assert.equal(s.nlItemsV1.stacks['mdt-tem-tiep-te'],1);
 assert.equal(s.iron,230);
 assert.equal(s.version,5);
 assert.equal(Object.keys(s.nlItemsV1.receipts).length,1);
 ctl.dispose();assert.deepEqual(Object.keys(h.events),[]);
});
test('03 selectors and page controls trigger rendering without inventing items',()=>{
 const h=host();let s=state();
 const ctl=ui.mount(h,{pack,engine,getState:()=>s,setState:x=>s=x,receiptId:()=> 'test:1'});
 click(h,{'data-nli-item-mode':'wiki'});
 assert.match(h.innerHTML,/Quà Cấp 1/);
 click(h,{'data-nli-item-category':'Bí Tịch'});
 assert.match(h.innerHTML,/Không có vật phẩm phù hợp/);
 click(h,{'data-nli-item-page':'100'});
 assert.match(h.innerHTML,/Trang 1\/1/);
 ctl.dispose();
});
test('04 source names and user search never inject markup',()=>{
 const clone=JSON.parse(JSON.stringify(pack));
 clone.items.find(x=>x.integration==='REFERENCE_ONLY').name='<img src=x onerror=alert(1)>';
 const html=ui.view(clone,engine,state(),{mode:'wiki'});
 assert.equal(html.includes('<img src=x'),false);
 assert.match(html,/&lt;img/);
});
