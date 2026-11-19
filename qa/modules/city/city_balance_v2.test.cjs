'use strict';
/* node --test qa/modules/city/city_balance_v2.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const cat=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/modules/city/catalog_v1.json'),'utf8'));
const research=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/alpha_content.json'),'utf8')).research;
const {createEngine}=require('../../../tools/nl_city_engine.js');
const {budget,simulate}=require('../../../tools/nl_city_balance_sim.js');
const fresh=()=>({version:5,silver:10000000,grain:10000000,iron:10000000,prestige:10000000,techSpent:0,
 buildings:{market:5,farm:5,academy:5,barracks:5},
 technology:Object.fromEntries(research.systemIds.map(id=>[id,0]))});
const engine=createEngine(cat,research);
test('budget excludes free initial hall; counts 187 paid upgrades with affordable-tier progression',()=>{
 const b=budget(cat,research);
 assert.equal(b.upgrades,187);
 assert.deepEqual(b.resources,{silver:702948,grain:189525,iron:170719,prestige:0});
 assert.ok(b.buildHours>20&&b.buildHours<25);
 for(const x of cat.buildings){
   let prev=0;
   for(let lvl=x.id==='nl_city_hall'?2:1;lvl<=x.levelCap;lvl++){
     const cost=engine.nextCost(x,lvl);
     assert.ok(cost.silver>prev,x.id+' level '+lvl);prev=cost.silver;
   }
 }
});
test('passive output accrues into 120-minute stock, not wallet; no unlimited offline resources',()=>{
 const g=fresh();engine.ensure(g,1000000);
 for(const id of ['nl_city_residence','nl_city_mill','nl_city_ironworks'])g.nlCity.levels[id]=1;
 const before=[g.silver,g.grain,g.iron];
 engine.advance(g,1000000+10*86400000);
 assert.deepEqual([g.silver,g.grain,g.iron],before);
 assert.equal(g.nlCity.stock.nl_city_residence,600);
 assert.equal(g.nlCity.stock.nl_city_mill,1800);
 assert.equal(g.nlCity.stock.nl_city_ironworks,360);
 engine.advance(g,g.nlCity.lastAt);
 assert.equal(g.nlCity.stock.nl_city_residence,600);
});
test('dedicated treasury/granary/depot unlock extra escrow while preserving 6-hour cap',()=>{
 const g=fresh();engine.ensure(g,1000000);
 Object.assign(g.nlCity.levels,{nl_city_residence:1,nl_city_mill:1,nl_city_ironworks:1,
 nl_city_treasury:1,nl_city_granary:2,nl_city_depot:4});
 engine.advance(g,1000000+10*86400000);
 const view=engine.view(g,g.nlCity.lastAt).buildings;
 assert.equal(view.find(b=>b.id==='nl_city_residence').capacity,3100);
 assert.equal(view.find(b=>b.id==='nl_city_mill').capacity,5400);
 assert.equal(view.find(b=>b.id==='nl_city_ironworks').capacity,1080);
 assert.equal(g.nlCity.stock.nl_city_residence,1800);
 assert.equal(g.nlCity.stock.nl_city_mill,5400);
 assert.equal(g.nlCity.stock.nl_city_ironworks,1080);
});
test('mint bonus +6% keeps identical output under 600 small ticks vs one big tick',()=>{
 const a=fresh(),b=fresh();engine.ensure(a,1000000);engine.ensure(b,1000000);
 for(const g of [a,b])Object.assign(g.nlCity.levels,{nl_city_residence:6,nl_city_mint:6,nl_city_treasury:2});
 engine.advance(a,1600000);
 for(let ms=1001000;ms<=1600000;ms+=1000)engine.advance(b,ms);
 assert.equal(a.nlCity.stock.nl_city_residence,b.nlCity.stock.nl_city_residence);
 assert.equal(a.nlCity.productionBonusRemainder.nl_city_residence,b.nlCity.productionBonusRemainder.nl_city_residence);
 assert.ok(a.nlCity.stock.nl_city_residence>300);
});
test('daily tax quota starts at four, plus state office level and resets on next UTC day',()=>{
 const g=fresh();engine.ensure(g,1000000);
 Object.assign(g.nlCity.levels,{nl_city_tax_office:1,nl_city_state_office:2});
 for(let i=0;i<6;i++){
  const r=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',
   actionId:'tax-'+i,now:1000000+i*600000});
  assert.equal(r.ok,true);assert.equal(r.dailyLimit,6);
 }
 const denied=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',actionId:'tax-denied',
 now:1000000+6*600000});
 assert.equal(denied.code,'DAILY_LIMIT');
 const after=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',actionId:'tax-day2',
 now:1000000+86400000});
 assert.equal(after.ok,true);assert.equal(after.dailyUsed,1);
 const save=JSON.parse(JSON.stringify(g));
 assert.equal(save.nlCity.dailyUsage['nl_city_tax_office|tax'].used,1);
});
test('hunt bonuses, bounded silver multipliers, lighthouse time and port daily slots are real',()=>{
 const g=fresh();engine.ensure(g,1000000);
 Object.assign(g.nlCity.levels,{nl_city_hunting:6,nl_city_residence:6,nl_city_tax_office:6,
 nl_city_bank:6,nl_city_trade_society:6,nl_city_cargo_port:6,
 nl_city_naval_port:1,nl_city_lighthouse:6});
 const bonus=engine.bonuses(g,1000000);
 assert.equal(bonus.taxCollectionBonus,0.25);
 assert.equal(bonus.tradeRevenueMultiplierBonus,0.25);
 const hunt=engine.act(g,{kind:'operate',id:'nl_city_hunting',operationId:'hunt',
  actionId:'hunt',now:1000000});
 assert.equal(hunt.ok,true);assert.ok(hunt.job.reward.silver>Math.round(220*1.75));
 Object.assign(g.nlCity.warehouse,{goods:200,permits:200});
 const at=2000000,sea=engine.act(g,{kind:'operate',id:'nl_city_cargo_port',
 operationId:'sea_trade',actionId:'sea1',now:at});
 assert.equal(sea.ok,true);
 assert.equal(sea.job.finishAt-at,1584000);
 assert.equal(sea.dailyLimit,3);
});
test('plain buy/sell routes are lossy at every level and cannot exploit silver loops',()=>{
 for(let lvl=1;lvl<=6;lvl++){
  const factor=1+0.15*(lvl-1);
  for(const [inCost,outCredit] of [[330,230],[350,300],[300,220]])
   assert.ok(Math.round(inCost*factor)>Math.round(outCredit*factor));
 }
 const g=fresh();engine.ensure(g,1000000);g.nlCity.levels.nl_city_bank=6;
 const issue=engine.act(g,{kind:'operate',id:'nl_city_bank',operationId:'issue_notes',
 actionId:'issue',now:1000000});
 const redeem=engine.act(g,{kind:'operate',id:'nl_city_bank',operationId:'redeem_notes',
 actionId:'redeem',now:1000000});
 assert.equal(issue.ok,true);assert.equal(redeem.ok,true);
 assert.ok(redeem.credit.silver<issue.debit.silver);
});
test('30-day passive-only snapshots prove stock investment matters but city alone cannot buy everything',()=>{
 const beginner=simulate(cat,research,{days:30,harvestsPerDay:2});
 const stored=simulate(cat,research,{days:30,harvestsPerDay:2,
  levels:{nl_city_treasury:1,nl_city_granary:2,nl_city_depot:4}});
 const developed=simulate(cat,research,{days:30,harvestsPerDay:2,
  levels:{nl_city_residence:6,nl_city_mill:5,nl_city_ironworks:5,
  nl_city_treasury:1,nl_city_granary:2,nl_city_depot:4,nl_city_mint:1}});
 assert.deepEqual(beginner.gross,{silver:36000,grain:108000,iron:21600});
 assert.deepEqual(stored.gross,{silver:108000,grain:324000,iron:64800});
 assert.deepEqual(developed.gross,{silver:366000,grain:756000,iron:151200});
 const paid=budget(cat,research).resources;
 assert.ok(developed.gross.iron<paid.iron);
 assert.ok(developed.gross.silver<paid.silver);
});

test('rollback clock cannot refill yesterday quota; existing receipt remains retry-safe',()=>{
 const g=fresh();engine.ensure(g,1000000);g.nlCity.levels.nl_city_tax_office=1;
 const first=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',
  actionId:'tax-clock',now:1000000});
 assert.equal(first.ok,true);
 const ahead=86400000+1000000;engine.advance(g,ahead);
 const silver=g.silver;
 const back=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',
  actionId:'tax-rollback',now:1000000});
 assert.equal(back.code,'CLOCK_ROLLBACK');assert.equal(g.silver,silver);
 const retried=engine.act(g,{kind:'operate',id:'nl_city_tax_office',operationId:'tax',
  actionId:'tax-clock',now:1000000});
 assert.equal(retried.duplicate,true);
});
test('warehouse soft cap denies new tokens without debiting inputs; old v1 city saves hydrate',()=>{
 const g=fresh();engine.ensure(g,1000000);
 g.nlCity.levels.nl_city_shop=1;g.nlCity.levels.nl_city_workshop=1;
 delete g.nlCity.dailyUsage;delete g.nlCity.productionBonusRemainder;
 const migrated=JSON.parse(JSON.stringify(g));engine.ensure(migrated,1000000);
 assert.deepEqual(migrated.nlCity.dailyUsage,{});
 assert.deepEqual(migrated.nlCity.productionBonusRemainder,{});
 const limit=cat.policy.balance.localWarehouseSoftCeiling;
 migrated.nlCity.warehouse.parts=limit;
 const oldSilver=migrated.silver;
 const rejected=engine.act(migrated,{kind:'operate',id:'nl_city_shop',
  operationId:'buy_parts',actionId:'warehouse-full',now:1000000});
 assert.equal(rejected.code,'INSUFFICIENT_RESOURCES_OR_OVERFLOW');
 assert.equal(migrated.silver,oldSilver);
 migrated.nlCity.warehouse.parts=0;
 migrated.nlCity.warehouse.goods=limit;
 const oldIron=migrated.iron;
 const forging=engine.act(migrated,{kind:'operate',id:'nl_city_workshop',
  operationId:'forge_goods',actionId:'forge-full',now:1000000});
 assert.equal(forging.code,'RESOURCE_OVERFLOW');
 assert.equal(migrated.iron,oldIron);
});
