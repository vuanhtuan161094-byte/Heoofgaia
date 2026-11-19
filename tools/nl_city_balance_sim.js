'use strict';
/* Deterministic gross city-passive model; existing campaign/legacy economy omitted.
 * Scenario levels are pre-granted without paying the construction cost.
 * Not an actual prediction of player progression, XP or online behavior. */
const {createEngine}=require('./nl_city_engine.js');
const PRODUCERS=['nl_city_residence','nl_city_mill','nl_city_ironworks'];
function budget(catalog,research) {
 const e=createEngine(catalog,research),total={silver:0,grain:0,iron:0,prestige:0};
 const bands={early:{silver:0,grain:0,iron:0,prestige:0},mid:{silver:0,grain:0,iron:0,prestige:0},
 late:{silver:0,grain:0,iron:0,prestige:0}};
 let upgrades=0,totalSeconds=0;
 const g={silver:0,grain:0,iron:0,prestige:0,buildings:{market:5,academy:5,barracks:5,farm:5},
  technology:{}};
 e.ensure(g,0);g.nlCity.levels.nl_city_hall=12;
 for(const b of catalog.buildings){
  const tier=(b.unlock?.hallLevel||0)>=6?'late':(b.unlock?.hallLevel||0)>=3?'mid':'early';
  const first=b.id==='nl_city_hall'?2:1; // hall 1 is the free initial city
  for(let target=first;target<=b.levelCap;target++){
   const cost=e.nextCost(b,target);
   for(const [key,val] of Object.entries(cost)){total[key]+=val;bands[tier][key]+=val;}
   g.nlCity.levels[b.id]=target-1;
   const view=e.view(g,0).buildings.find(x=>x.id===b.id);
   if(!view.nextSeconds||view.nextSeconds<1)throw Error('INVALID_CITY_BUILD_TIME:'+b.id);
   totalSeconds+=view.nextSeconds;upgrades++;
  }
  if(b.id==='nl_city_hall')g.nlCity.levels.nl_city_hall=12;
 }
 return {upgrades,resources:total,byTier:bands,buildHours:Math.round(totalSeconds/360)/10,
  caveat:'No raw resources or waiting/mission income included'};
}
function simulate(catalog,research,opts){
 if(!opts||!Number.isInteger(opts.days)||opts.days<1||opts.days>365||
  !Number.isInteger(opts.harvestsPerDay)||opts.harvestsPerDay<1||opts.harvestsPerDay>24)
   throw Error('INVALID_CITY_BALANCE_SCENARIO');
 const e=createEngine(catalog,research),g={version:5,silver:0,grain:0,iron:0,prestige:0,
 buildings:{academy:5,barracks:5,farm:5,market:5},technology:{},techSpent:0};
 e.ensure(g,0);
 for(const id of PRODUCERS)g.nlCity.levels[id]=opts.levels?.[id]||1;
 for(const [id,lv] of Object.entries(opts.levels||{}))
  if(!PRODUCERS.includes(id))g.nlCity.levels[id]=lv;
 const slots=opts.days*opts.harvestsPerDay;
 for(let i=1;i<=slots;i++){
   const at=Math.round(i*86400000/opts.harvestsPerDay);
   e.advance(g,at);
   for(const id of PRODUCERS){
     if(!g.nlCity.stock[id])continue;
     const r=e.act(g,{kind:'harvest',id,actionId:'balance-'+i+'-'+id,now:at});
     if(!r.ok)throw Error('CITY_PASSIVE_SETTLEMENT_FAILED '+r.code);
   }
 }
 return {days:opts.days,harvestsPerDay:opts.harvestsPerDay,
 producerLevels:Object.fromEntries(PRODUCERS.map(id=>[id,g.nlCity.levels[id]])),
 facilityLevels:opts.levels||{},gross:{silver:g.silver,grain:g.grain,iron:g.iron},harvestWindows:slots,
 scope:'GROSS_PASSIVE_ONLY_PREGRANTED_LEVELS_EXCLUDES_LEGACY_AND_CAMPAIGN_INCOME'};
}
module.exports={budget,simulate};