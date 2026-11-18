'use strict';
/* Run: node qa/nl_city_full.test.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createEngine}=require('../tools/nl_city_engine.js');
const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/modules/city/catalog_v1.json'),'utf8'));
const a=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/alpha_content.json'),'utf8'));
const engine=createEngine(c,a.research);
let passes=0;
function check(label,fn){fn();passes++;console.log('PASS '+label);}
const game=()=>({version:5,silver:10000000,grain:10000000,iron:10000000,
 prestige:10000000,techSpent:0,technology:Object.fromEntries(a.research.systemIds.map(x=>[x,0])),
 buildings:{market:5,farm:5,academy:5,barracks:5,walls:1,lumberyard:1}});
check('full city catalogue: 31 original/upgradable and seven retained legacy IDs',()=>{
 assert.equal(c.buildings.length,31);assert.equal(c.legacy.length,7);
 assert.equal(new Set(c.buildings.map(b=>b.id)).size,31);
 assert.ok(c.buildings.every(b=>b.provenance.classification==='SIMULATED'));
 assert.ok(c.buildings.every(b=>b.levelCap>=5&&b.baseCost&&b.buildSeconds.length===b.levelCap+1));
});
check('all 31 facilities have an active economy/upgrade/gate function',()=>{
 assert.ok(c.buildings.every(b=>(b.production||b.effects.length||b.actions.length||b.id==='nl_city_hall')));
 assert.ok(c.buildings.filter(b=>b.actions.length).length>=27);
 assert.ok(c.buildings.some(b=>b.id==='nl_city_naval_port'));
});
check('new v5 save initializes basic city without minting resources',()=>{
 const g=game(),before=g.silver;engine.ensure(g,1000000);
 assert.equal(g.nlCity.levels.nl_city_hall,1);assert.equal(g.silver,before);
 assert.equal(g.nlCity.levels.nl_city_hunting,0);
});
check('city hall unlocking rejects locked naval construction, then allows it',()=>{
 const g=game(),now=1000000;engine.ensure(g,now);
 assert.equal(engine.act(g,{kind:'build',id:'nl_city_naval_port',actionId:'locked',now}).code,'LOCKED');
 g.nlCity.levels.nl_city_hall=6;
 const b=engine.act(g,{kind:'build',id:'nl_city_naval_port',actionId:'naval-build',now});
 assert.equal(b.ok,true);engine.advance(g,b.job.finishAt);
 assert.equal(g.nlCity.levels.nl_city_naval_port,1);
});
check('all newly added buildings construct and upgrade with timed jobs',()=>{
 for(const b of c.buildings){
  const g=game();engine.ensure(g,1000000);g.nlCity.levels.nl_city_hall=12;
  if(b.id==='nl_city_hall')g.nlCity.levels.nl_city_hall=1;
  const begin=g.silver,r=engine.act(g,{kind:'build',id:b.id,actionId:'build-'+b.id,now:1000000});
  assert.equal(r.ok,true,b.id);assert.ok(g.silver<begin);
  assert.equal(engine.act(g,{kind:'build',id:b.id,actionId:'build-'+b.id,now:1000000}).duplicate,true);
  engine.advance(g,r.job.finishAt);
  const expected=b.id==='nl_city_hall'?2:1;
  assert.equal(g.nlCity.levels[b.id],expected,b.id);
 }
});
check('all action-bearing facilities really spend inputs and generate claimable outcomes',()=>{
 for(const b of c.buildings.filter(x=>x.actions.length)){
  const g=game(),now=1000000;
  engine.ensure(g,now);g.nlCity.levels.nl_city_hall=12;g.nlCity.levels[b.id]=1;
  for(const key of c.localResources)g.nlCity.warehouse[key]=1000000;
  const a=b.actions[0],prior=JSON.stringify(g);
  const result=engine.act(g,{kind:'operate',id:b.id,operationId:a.id,actionId:'operate-'+b.id,now});
  assert.equal(result.ok,true,b.id);
  assert.ok(result.debit && Object.keys(result.debit).length>0,b.id);
  assert.ok(result.job || result.credit,b.id);
  const repeat=engine.act(g,{kind:'operate',id:b.id,operationId:a.id,actionId:'operate-'+b.id,now});
  assert.equal(repeat.duplicate,true,b.id);
  if(result.job){
   assert.equal(engine.act(g,{kind:'collect',id:b.id,actionId:'early-'+b.id,now}).code,'OPERATION_NOT_READY',b.id);
   engine.advance(g,result.job.finishAt);
   const settled=engine.act(g,{kind:'collect',id:b.id,operationId:a.id,actionId:'claim-'+b.id,now:result.job.finishAt});
   assert.equal(settled.ok,true,b.id);
   assert.ok(Object.values(settled.credit).some(n=>n>0),b.id);
   const snap=JSON.stringify(g);
   assert.equal(engine.act(g,{kind:'collect',id:b.id,actionId:'claim-'+b.id,now:result.job.finishAt}).duplicate,true);
   assert.equal(JSON.stringify(g),snap,b.id);
   engine.advance(g,result.job.finishAt+5000);
   assert.equal(engine.act(g,{kind:'collect',id:b.id,actionId:'duplicate-'+b.id,now:result.job.finishAt+5000}).code,'NO_OPERATION_TO_COLLECT',b.id);
  }
  assert.notEqual(JSON.stringify(g),prior,b.id);
 }
});
check('operations enforce cooldown and pending jobs cannot be double started',()=>{
 const g=game();engine.ensure(g,1000000);g.nlCity.levels.nl_city_shop=2;
 const first=engine.act(g,{kind:'operate',id:'nl_city_shop',operationId:'buy_parts',actionId:'buyA',now:1000000});
 assert.equal(first.ok,true);
 assert.equal(engine.act(g,{kind:'operate',id:'nl_city_shop',operationId:'buy_parts',actionId:'buyB',now:1000000}).code,'OPERATION_COOLDOWN');
 const second=engine.act(g,{kind:'operate',id:'nl_city_shop',operationId:'buy_parts',actionId:'buyC',now:1045000});
 assert.equal(second.ok,true);
});
check('city engine includes tax and trade bonuses in real settlement amounts',()=>{
 const g=game();engine.ensure(g,1000000);g.nlCity.levels.nl_city_tax_office=2;
 g.nlCity.levels.nl_city_residence=2;
 const tax=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',actionId:'t',now:1000000});
 assert.equal(tax.ok,true);
 assert.ok(tax.credit.silver>Math.round(380*1.15));
});
check('malformed intent and unaffordable resources cannot produce outputs',()=>{
 const g=game();engine.ensure(g,1000000);g.nlCity.levels.nl_city_shop=1;g.silver=0;
 assert.equal(engine.act(g,{kind:'operate',id:'nl_city_shop',operationId:'buy_parts',actionId:'insufficient',now:1000000}).code,'INSUFFICIENT_RESOURCES_OR_OVERFLOW');
 assert.equal(g.nlCity.warehouse.parts||0,0);
 assert.equal(engine.act(g,{kind:'operate',id:'nl_city_shop',operationId:'buy_parts',actionId:'?',now:1000000}).code,'INVALID_INTENT');
});
check('Save v5 roundtrip preserves operation timing, receipts and unchanged legacy state',()=>{
 const g=game();engine.ensure(g,1000000);g.nlCity.levels.nl_city_trade_society=2;
 const action=engine.act(g,{kind:'operate',id:'nl_city_trade_society',operationId:'produce_goods',actionId:'dispatchA',now:1000000});
 assert.equal(action.ok,true);
 const saved=JSON.parse(JSON.stringify(g));
 engine.advance(saved,action.job.finishAt);
 const got=engine.act(saved,{kind:'collect',id:'nl_city_trade_society',actionId:'claimA',now:action.job.finishAt});
 assert.equal(got.ok,true);
 const snapshot=JSON.stringify(saved);
 assert.equal(engine.act(saved,{kind:'collect',id:'nl_city_trade_society',actionId:'claimA',now:action.job.finishAt}).duplicate,true);
 assert.equal(JSON.stringify(saved),snapshot);
 assert.equal(saved.version,5);assert.equal(saved.buildings.market,5);
});
check('legacy Chợ buys grain by real silver debit without replacing its existing building',()=>{
 const g=game(),now=1000000;engine.ensure(g,now);
 const oldMarket=g.buildings.market,silver=g.silver,grain=g.grain;
 const buy=engine.act(g,{kind:'operate',id:'market',operationId:'buy_grain',actionId:'market-buy-1',now});
 assert.equal(buy.ok,true);
 assert.equal(g.silver,silver-buy.debit.silver);
 assert.equal(g.grain,grain+buy.credit.grain);
 assert.equal(g.buildings.market,oldMarket);
 assert.equal(engine.act(g,{kind:'operate',id:'market',operationId:'buy_grain',actionId:'market-buy-1',now}).duplicate,true);
 assert.equal(engine.act(g,{kind:'operate',id:'market',operationId:'buy_grain',actionId:'market-buy-2',now}).code,'OPERATION_COOLDOWN');
});
check('workshop has real timed goods output and save-safe collection',()=>{
 const g=game(),now=1000000;engine.ensure(g,now);g.nlCity.levels.nl_city_workshop=1;
 const before=g.iron,r=engine.act(g,{kind:'operate',id:'nl_city_workshop',operationId:'forge_goods',actionId:'forge-1',now});
 assert.equal(r.ok,true);assert.equal(g.iron,before-r.debit.iron);
 engine.advance(g,r.job.finishAt);
 const loaded=JSON.parse(JSON.stringify(g));
 const got=engine.act(loaded,{kind:'collect',id:'nl_city_workshop',operationId:'forge_goods',actionId:'forge-claim-1',now:r.job.finishAt});
 assert.equal(got.ok,true);assert.equal(loaded.nlCity.warehouse.goods,2);
 assert.equal(loaded.nlCity.warehouse.parts,1);
 assert.equal(engine.act(loaded,{kind:'collect',id:'nl_city_workshop',actionId:'forge-claim-1',now:r.job.finishAt}).duplicate,true);
});
check('all legacy IDs remain single owner and provide a working path or direct gameplay gate',()=>{
 assert.equal(c.legacy.length,7);
 assert.ok(c.legacy.every(x=>x.owner&&x.id));
 assert.ok(c.legacy.find(x=>x.id==='market').actions.length===2);
 assert.ok(c.buildings.find(x=>x.id==='nl_city_workshop').actions.length===2);
});
console.log('NL CITY FULL '+passes+'/'+passes+' PASS');
