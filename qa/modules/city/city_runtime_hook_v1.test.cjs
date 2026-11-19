'use strict';
/* Chat 03 integration contract — runnable Node:test (without mock claims for Chromium).
 * Run: node --test qa/modules/city/city_runtime_hook_v1.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/alpha_content.json'),'utf8'));
const cat=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/modules/city/catalog_v1.json'),'utf8'));
const engineApi=require('../../../tools/nl_city_engine.js');
const panelApi=require('../../../data/ngoalong/modules/city/city_panel_v1.js');
const {createIntegration,SLOT_ID}=require('../../../data/ngoalong/modules/city/city_runtime_hook_v1.js');
function fixture(){
 const game={version:5,silver:100000,grain:100000,iron:100000,prestige:100000,techSpent:0,
 buildings:{market:1,farm:1,barracks:2,academy:4,walls:1,lumberyard:1,mine:1},
 technology:Object.fromEntries(pack.research.systemIds.map(id=>[id,0]))};
 let now=1000000, element=null, saveCount=0, listener=null, unregister=0, nativeRenders=0,nativeTicks=0;
 const findRoot=()=>element;
 const integration=createIntegration({catalog:cat,research:pack.research,engineApi,panelApi,getGame:()=>game,
 save:()=>saveCount++,now:()=>now,findRoot,openLegacy:()=>{}});
 const makeRoot=()=>({
    innerHTML:'',
    addEventListener(t,fn){assert.equal(t,'click');listener=fn;},
    removeEventListener(t){assert.equal(t,'click');unregister++;},
    contains(node){return node.root===this;}
 });
 const renderCity=integration.wrapRenderCity(()=>'<section id="native-city">Original buildings</section>');
 const render=integration.wrapRender(()=>{nativeRenders++;return element?renderCity():'<div>non-city</div>';});
 const tick=integration.wrapTick(()=>{nativeTicks++;return 'tick';});
 return {integration,game,render,renderCity,tick,makeRoot,setRoot:el=>{element=el;},
  setTime:t=>{now=t;},get saved(){return saveCount;},get renders(){return nativeRenders;},
  get ticks(){return nativeTicks;},get listener(){return listener;},get unregistered(){return unregister;}};
}
test('integrator guarantees 31 city+7 existing+8 research identifiers',()=>{
 const f=fixture();
 assert.deepEqual(f.integration.coverage,{cityBuildings:31,legacyBuildings:7,techs:8});
 assert.equal(SLOT_ID,'nl-city-panel-root');
});
test('native city HTML preserved, one insertion, no duplicate slots',()=>{
 const f=fixture(),a=f.renderCity();
 assert.ok(a.includes('id="native-city"'));assert.ok(a.includes('id="nl-city-panel-root"'));
 assert.equal((a.match(/id="nl-city-panel-root"/g)||[]).length,1);
 assert.throws(()=>f.integration.appendCity(a),/DUPLICATE/);
});
test('render binding survives changing tabs and stale nodes without leaked listeners',()=>{
 const f=fixture(),a=f.makeRoot(),b=f.makeRoot();
 f.setRoot(a);f.render();
 assert.equal(f.integration.mounted,true);
 assert.ok(a.innerHTML.includes('data-nl-city-panel="1"'));
 f.render();assert.equal(f.unregistered,0); // idempotent same DOM root
 f.setRoot(null);f.render();assert.equal(f.integration.mounted,false);
 assert.equal(f.unregistered,1);
 f.setRoot(b);f.render();assert.equal(f.integration.mounted,true);
 assert.ok(b.innerHTML.includes('nlcity-grid'));
 f.integration.uninstall();assert.equal(f.unregistered,2);
});
test('existing one-second tick advances city only once, no duplicate ledger entries',()=>{
 const f=fixture();f.integration.advance();
 f.game.nlCity.levels.nl_city_ironworks=1;
 f.setTime(1060000);f.tick();
 const stock=f.game.nlCity.stock.nl_city_ironworks;
 assert.equal(stock,3);f.tick();assert.equal(f.game.nlCity.stock.nl_city_ironworks,stock);
 assert.equal(f.game.nlCity.receipts.length,0);assert.equal(f.ticks,2);
});
test('panel click routes to real economic action, preserves Save v5 and duplicate receipt',()=>{
 const f=fixture(),element=f.makeRoot();
 f.setRoot(element);f.render();
 const game=f.game,iron=game.iron;
 const target={
   root:element,disabled:false,
   getAttribute:name=>({
    'data-nl-city-kind':'build','data-nl-city-id':'nl_city_ironworks',
    'data-nl-city-operation':'','data-nl-city-action-id':'city-ui:1:build:nl_city_ironworks:'
   }[name]||'')
 };
 f.listener({target:{closest:()=>target}});
 assert.ok(game.iron<iron);
 assert.equal(f.saved,1);
 const snapshot=JSON.stringify(game);
 f.listener({target:{closest:()=>target}});
 assert.equal(JSON.stringify(game),snapshot);
 assert.equal(f.saved,1);
 assert.equal(game.version,5);
 const copy=JSON.parse(JSON.stringify(game));
 assert.equal(copy.nlCity.receiptIndex['city-ui:1:build:nl_city_ironworks:'].ok,true);
});
test('existing legacy market and research remain same live game state',()=>{
 const f=fixture(),g=f.game;
 const gBefore=JSON.stringify(g.buildings);
 const market=f.integration.panel.handle({kind:'operate',id:'market',operationId:'buy_grain',
  actionId:'city-ui:1:operate:market:buy_grain'});
 assert.equal(market.ok,true);
 assert.equal(JSON.stringify(g.buildings),gBefore);
 assert.equal(f.saved,1);
 const tech=f.integration.panel.handle({kind:'research',id:'harvest',
  actionId:'city-ui:2:research:harvest:'});
 assert.equal(tech.ok,true);
 assert.equal(g.technology.harvest,1);
 assert.equal(f.saved,2);
});
test('invalid/fake extension and prototype action IDs never perform a debit',()=>{
 const f=fixture();f.integration.advance();
 const prior=f.game.silver;
 assert.equal(f.integration.engine.act(f.game,{kind:'build',id:'nl_city_mill',actionId:'constructor',now:1000000}).code,'INVALID_INTENT');
 assert.equal(f.game.silver,prior);
 assert.throws(()=>createIntegration({catalog:cat,research:pack.research,getGame:()=>f.game,save:()=>{},findRoot:()=>null}),/DEPENDENCIES/);
});
