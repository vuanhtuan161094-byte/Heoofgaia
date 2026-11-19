'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const pack=require('../data/ngoalong/modules/inventory/catalogue.json');
const rules=require('../data/ngoalong/modules/inventory/rules.json');
const inv=require('../data/ngoalong/modules/inventory/engine.js').createModule(pack,rules);
const ui=require('../data/ngoalong/modules/inventory/ui.js');
const fresh=()=>({
  version:5,hero:{liu:{level:40}},items:[],gear:{liu:{}},
  silver:100000,iron:20000,prestige:100
});
function fakeHost(){
 const handlers={};
 return {handlers,innerHTML:'',addEventListener(k,f){handlers[k]=f},
  removeEventListener(k){delete handlers[k]},contains(){return true},
  querySelector(){return null}};
}
function click(host, attrs){
 const item={hasAttribute(n){return Object.hasOwn(attrs,n)},
  getAttribute(n){return attrs[n]}};
 host.handlers.click({target:{closest(){return item}}});
}
test('A equipment panel shows 7 real slots, core stat lanes and both old/new shop gear',()=>{
 let state=fresh(),out=ui.makeView(pack,inv,state,'liu');
 assert.equal((out.match(/class="nli-slot"/g)||[]).length,7);
 assert.match(out,/Trang bị · Kho chiến cụ/);
 const shop=ui.makeView(pack,inv,state,'liu',{shop:true});
 assert.match(shop,/Thiết Kiếm/);
 assert.match(shop,/Ngân Kiếm/);
 assert.match(shop,/Thanh Cương Kiếm/);
 assert.match(shop,/Vật công/);
 assert.equal((shop.match(/data-nli-action="buy"/g)||[]).length>=20,true);
});
test('C mobile shop pagination and search restrict visible cards without changing catalogue',()=>{
  const compact={...pack,rules};
  const full=ui.makeView(compact,inv,fresh(),'liu',{shop:true});
  assert.equal((full.match(/data-nli-action="buy"/g)||[]).length,30);
  assert.match(full,/data-nli-page="1"/);
  assert.match(full,/data-nli-result-count=/);
  const next=ui.makeView(compact,inv,fresh(),'liu',{shop:true,page:1});
  assert.match(next,/Trang 2\//);
  const filtered=ui.makeView(compact,inv,fresh(),'liu',{shop:true,search:'Thanh Cương Kiếm'});
  assert.match(filtered,/Thanh Cương Kiếm/);
  assert.doesNotMatch(filtered,/Ngân Kiếm/);
  const empty=ui.makeView(compact,inv,fresh(),'liu',{search:'khong-co-vat-pham'});
  assert.match(empty,/Không có trang bị phù hợp/);
  assert.match(full,/data-nli-shop="0"/);
});
test('C upgrade display accurately reports costs and affordability',()=>{
  let state=fresh();
  state=inv.buy(state,'mdt-equip02-1','buy:test').state;
  const markup=ui.makeView({...pack,rules},inv,state,'liu');
  assert.match(markup,/Cường hóa · 350 bạc \/ 105 sắt/);
  assert.match(markup,/Tinh luyện · 600 bạc \/ 2 tinh khoáng/);
  assert.match(markup,/Chưa đủ điều kiện tinh luyện/);
  assert.match(markup,/data-nli-action="refine"[^>]*disabled/);
});
test('B mount uses durable receipt contract, mutates state once for buy/equip',()=>{
 let state=fresh(),serial=0,updates=0,host=fakeHost();
 const app=ui.mount(host,{pack,inventory:inv,heroId:'liu',getState:()=>state,
  setState:s=>{updates++;state=s},receiptId:()=>('ui:'+ ++serial)});
 click(host,{'data-nli-action':'buy','data-item':'mdt-equip02-1'});
 assert.equal(state.items.length,1);
 assert.equal(updates,1);
 assert.equal(state.silver,100000-920);
 assert.equal(state.iron,20000-154);
 const uid=state.items[0].uid;
 click(host,{'data-nli-action':'equip','data-uid':uid});
 assert.equal(state.gear.liu.weapon,uid);
 assert.equal(inv.bonuses(state,'liu').weaponAtk,8);
 click(host,{'data-nli-action':'reinforce','data-uid':uid});
 assert.equal(state.items[0].lv,2);
 click(host,{'data-nli-action':'unequip','data-uid':uid,'data-slot':'weapon'});
 assert.equal(state.gear.liu.weapon,undefined);
 app.dispose();
 assert.equal(Object.keys(host.handlers).length,0);
});
test('C preview displays activated set bonuses and escaped names',()=>{
 let state=fresh();
 const rows=Array.from({length:2},(_,i)=>({id:'mdt-equip02-'+(23+i),quantity:1}));
 state=inv.grant(state,rows,'one-time:1').state;
 state=inv.equip(state,'liu',state.items[0].uid,'wear:1').state;
 state=inv.equip(state,'liu',state.items[1].uid,'wear:2').state;
 assert.match(ui.makeView(pack,inv,state,'liu'),/Bộ kích hoạt/);
 const clone=JSON.parse(JSON.stringify(pack));
 clone.equipment[0].name='<svg onload=alert(1)>';
 const html=ui.makeView(clone,inv,state,'liu',{shop:true});
 assert.equal(html.includes('<svg onload'),false);
});
