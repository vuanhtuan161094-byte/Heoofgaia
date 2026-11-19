'use strict';
/* Node focused contract test for Chat 08 City UI renderer. No Chromium claims. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const catalog=read('data/ngoalong/modules/city/catalog_v1.json');
const alpha=read('data/ngoalong/alpha_content.json');
const {createEngine}=require('../../../tools/nl_city_engine.js');
const {createPanel,stylesheet}=require('../../../data/ngoalong/modules/city/city_panel_v1.js');
const makeGame=()=>({version:5,silver:200000,grain:200000,iron:200000,prestige:200000,
  buildings:{market:2,farm:1,academy:5,barracks:3,walls:2,lumberyard:1,mine:1},
  technology:Object.fromEntries(alpha.research.systemIds.map(id=>[id,0])),techSpent:0});
function fixture(){
 const game=makeGame(),engine=createEngine(catalog,alpha.research);
 let now=1000000,saved=0,legacyCalls=[],messages=[];
 const panel=createPanel({catalog,research:alpha.research,engine,getGame:()=>game,save:()=>saved++,
   now:()=>now,openLegacy:id=>legacyCalls.push(id),onResult:r=>messages.push(r)});
 return {game,engine,panel,get now(){return now},set now(n){now=n},get saved(){return saved},legacyCalls,messages};
}
const intent=(f,kind,id,op='')=>({kind,id,operationId:op,
  actionId:['city-ui',((f.game.nlCity&&f.game.nlCity.seq)||0)+1,kind,id,op].join(':')});
test('complete 38/38 city selector, 8 technology options and responsive stylesheet',()=>{
 const f=fixture(),html=f.panel.render();
 assert.deepEqual(f.panel.coverage,{cityBuildings:31,legacyBuildings:7,techs:8});
 for(const b of [...catalog.buildings,...catalog.legacy])assert.ok(html.includes('data-nl-city-id="'+b.id+'"'),b.id);
 for(const t of alpha.research.catalog)assert.ok(html.includes('data-nl-city-id="'+t.id+'"'),t.id);
 assert.ok(stylesheet.includes('@media(max-width:760px)'));
});
test('open any module facility or native legacy building from the 38-building panel',()=>{
 const f=fixture();
 for(const b of [...catalog.buildings,...catalog.legacy]){
   assert.equal(f.panel.select(b.id).ok,true);
   assert.ok(f.panel.render().includes('data-nl-city-detail="'+b.id+'"'));
 }
 assert.equal(f.panel.handle({kind:'navigateLegacy',id:'academy'}).ok,true);
 assert.deepEqual(f.legacyCalls,['academy']);
 assert.equal(f.panel.handle({kind:'navigateLegacy',id:'nl_city_hall'}).ok,false);
});
test('paid city construction completes and displayed crop is harvested from real economy',()=>{
 const f=fixture(),g=f.game;
 assert.equal(f.panel.select('nl_city_mill').ok,true);
 const old=g.silver,building=f.panel.handle(intent(f,'build','nl_city_mill'));
 assert.equal(building.ok,true);assert.equal(f.saved,1);
 assert.equal(g.silver,old-building.debit.silver);
 f.now=building.job.finishAt;
 assert.equal(f.panel.render().includes('Cấp 1/5'),true);
 f.now+=120000;
 const before=g.grain,harvest=f.panel.handle(intent(f,'harvest','nl_city_mill'));
 assert.equal(harvest.ok,true);assert.ok(g.grain>before);
 assert.equal(f.saved,2);
 const previous=g.grain;
 assert.equal(f.panel.handle({...intent(f,'harvest','nl_city_mill'),actionId:harvest.actionId}).duplicate,true);
 assert.equal(g.grain,previous);assert.equal(f.saved,2);
});
test('timed workshop goods use actual debit, complete, claim and Save once per event',()=>{
 const f=fixture(),g=f.game;
 const b=f.panel.handle(intent(f,'build','nl_city_workshop'));assert.equal(b.ok,true);
 f.now=b.job.finishAt;f.panel.render();
 const payload=intent(f,'operate','nl_city_workshop','forge_goods');
 const oldIron=g.iron;
 const op=f.panel.handle(payload);
 assert.equal(op.ok,true);assert.equal(g.iron,oldIron-op.debit.iron);
 assert.equal(f.panel.handle(payload).duplicate,true);
 const before=f.saved;
 f.now=op.job.finishAt;f.panel.render();
 const claim=f.panel.handle(intent(f,'collect','nl_city_workshop','forge_goods'));
 assert.equal(claim.ok,true);assert.equal(g.nlCity.warehouse.goods,2);
 assert.equal(f.saved,before+1);
});
test('native legacy market handles buying grain without reimplementing building levels',()=>{
 const f=fixture(),g=f.game,oldMarket=g.buildings.market;
 const b=f.panel.handle(intent(f,'operate','market','buy_grain'));
 assert.equal(b.ok,true);assert.equal(g.buildings.market,oldMarket);
 assert.ok(g.nlCity.receiptIndex[b.actionId]);
 assert.ok(f.panel.render().includes('data-nl-city-id="market"'));
});
test('existing 8 research IDs use original cost, academy and Save authority',()=>{
 const f=fixture(),g=f.game;
 const silver=g.silver;
 const r=f.panel.handle(intent(f,'research','arms'));
 assert.equal(r.ok,true);assert.equal(g.technology.arms,1);
 assert.equal(g.silver,silver-550);
 assert.equal(f.saved,1);
});
test('stale or malformed actions cannot trigger new transactions after render',()=>{
 const f=fixture();
 f.panel.render();
 const stale=intent(f,'research','arms');
 const once=f.panel.handle(stale);assert.equal(once.ok,true);
 const again=f.panel.handle(stale);assert.equal(again.duplicate,true);
 assert.equal(f.panel.handle({...stale,actionId:'city-ui:0:research:arms:'}).code,'STALE_UI_ACTION_ID');
 assert.equal(f.panel.handle({kind:'research',id:'arbitrary',actionId:'city-ui:2:research:arbitrary:'}).code,'UNKNOWN_RESEARCH');
});
test('event delegation calls engine once for a double-clicked rendered button',()=>{
 const f=fixture();
 let listener=null,removed=false;
 const root={
   innerHTML:'',
   addEventListener(type,fn){assert.equal(type,'click');listener=fn;},
   removeEventListener(type,fn){removed=listener===fn;},
   contains(node){return node.owner===this;}
 };
 const unbind=f.panel.bind(root);
 assert.ok(listener);assert.ok(root.innerHTML.includes('data-nl-city-panel="1"'));
 const button={
   owner:root,disabled:false,
   getAttribute(k){return {
     'data-nl-city-kind':'research','data-nl-city-id':'arms',
     'data-nl-city-operation':'','data-nl-city-action-id':'city-ui:1:research:arms:'
   }[k]||'';}
 };
 const target={closest(){return button;}};
 listener({target});
 assert.equal(f.game.technology.arms,1);assert.equal(f.saved,1);
 listener({target}); // the removed, stale HTML button has the exact same intent ID
 assert.equal(f.game.technology.arms,1);assert.equal(f.saved,1);
 unbind();assert.equal(removed,true);
});
test('missing legacy callback must reject native navigation rather than fake a control',()=>{
 const engine=createEngine(catalog,alpha.research),g=makeGame();
 const p=createPanel({catalog,research:alpha.research,engine,getGame:()=>g,save:()=>{},now:()=>1000000});
 assert.equal(p.handle({kind:'navigateLegacy',id:'barracks'}).code,'LEGACY_HANDLER_REQUIRED');
});
