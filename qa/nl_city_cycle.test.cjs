/* Run once: node qa/nl_city_cycle.test.cjs */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createEngine}=require('../tools/nl_city_engine.js');
const ROOT=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(ROOT,'data/ngoalong/modules/city/catalog_v1.json'),'utf8'));
const research=JSON.parse(fs.readFileSync(path.join(ROOT,'data/ngoalong/alpha_content.json'),'utf8')).research;
const e=createEngine(c,research);
let now=1000000,n=0;
const pass=(label,fn)=>{fn();n++;console.log('PASS '+label);};
const fresh=()=>({version:5,silver:12000,grain:6000,iron:3000,prestige:2000,techSpent:0,
 buildings:{academy:3,barracks:2,market:1,farm:1},
 technology:Object.fromEntries(research.systemIds.map(id=>[id,0]))});
const g=fresh();
const act=(kind,id,actionId,t=now)=>e.act(g,{kind,id,actionId,now:t});
pass('paid construction starts exactly one job',()=>{
  const silver=g.silver,r=act('build','nl_city_ironworks','b1');
  assert.equal(r.ok,true);assert.equal(g.silver,silver-r.debit.silver);
  assert.equal(g.nlCity.levels.nl_city_ironworks,0);
  assert.equal(act('build','nl_city_ironworks','b1').duplicate,true);
  assert.equal(g.silver,silver-r.debit.silver);
});
pass('construction timer completes once',()=>{
  now+=30000;e.advance(g,now);
  assert.equal(g.nlCity.levels.nl_city_ironworks,1);
});
pass('production accrues to capped escrow, not game currencies',()=>{
  const before=g.iron;now+=600000;e.advance(g,now);
  assert.equal(g.nlCity.stock.nl_city_ironworks,30);
  assert.equal(g.iron,before);
  e.advance(g,now);e.advance(g,now-1000);
  assert.equal(g.nlCity.stock.nl_city_ironworks,30);
});
pass('harvest settles exactly once under duplicate receipt',()=>{
  const iron=g.iron;
  assert.equal(act('harvest','nl_city_ironworks','h1').credit.iron,30);
  assert.equal(g.iron,iron+30);
  assert.equal(act('harvest','nl_city_ironworks','h1').duplicate,true);
  assert.equal(g.iron,iron+30);
  assert.equal(act('harvest','nl_city_ironworks','h2').code,'EMPTY_STOCK');
});
pass('upgrade costs once and blocks concurrent construction',()=>{
  const iron=g.iron,r=act('build','nl_city_ironworks','b2');
  assert.equal(r.targetLevel,2);assert.equal(g.iron,iron-r.debit.iron);
  assert.equal(act('build','nl_city_mill','busy').code,'CONSTRUCTION_BUSY');
  now+=60000;e.advance(g,now);
  assert.equal(g.nlCity.levels.nl_city_ironworks,2);
});
pass('existing 8 research IDs, price and Academy gate reused',()=>{
  const first=act('research','commerce','r1');
  assert.deepEqual(first.debit,{silver:550,iron:130,prestige:0});
  assert.equal(g.technology.commerce,1);
  assert.equal(act('research','commerce','r1').duplicate,true);
  const second=act('research','commerce','r2');
  assert.equal(second.targetLevel,2);assert.equal(second.debit.prestige,60);
  assert.equal(g.techSpent,60);
});
pass('Save v5 roundtrip keeps persistent intent ledger',()=>{
  const loaded=JSON.parse(JSON.stringify(g)),iron=loaded.iron;
  assert.equal(e.act(loaded,{kind:'harvest',id:'nl_city_ironworks',actionId:'h1',now}).duplicate,true);
  assert.equal(loaded.iron,iron);assert.equal(loaded.version,5);
});
pass('offline cap and no repeat time mint',()=>{
  const iron=g.iron;e.advance(g,now+10*86400000);
  assert.equal(g.iron,iron);assert.ok(g.nlCity.stock.nl_city_ironworks<=e.view(g,g.nlCity.lastAt).buildings.find(b=>b.id==='nl_city_ironworks').capacity);
});
pass('depot bonus is exposed without changing game.buildings',()=>{
  const at=g.nlCity.lastAt,legacy=JSON.stringify(g.buildings);
  const b=act('build','nl_city_depot','b3',at);
  assert.equal(b.ok,true);e.advance(g,b.job.finishAt);
  assert.equal(e.bonuses(g,b.job.finishAt).reserveCapacityFlat,60);
  assert.equal(JSON.stringify(g.buildings),legacy);
});
pass('resource shortage cannot underflow balances',()=>{
  const poor=fresh();poor.silver=0;
  assert.equal(e.act(poor,{kind:'build',id:'nl_city_mill',actionId:'poor',now}).code,'INSUFFICIENT_RESOURCES');
  assert.equal(poor.silver,0);assert.equal(e.act(poor,{kind:'harvest',id:'nl_city_mill',actionId:'',now}).code,'INVALID_INTENT');
});
console.log('NL CITY '+n+'/'+n+' PASS');
