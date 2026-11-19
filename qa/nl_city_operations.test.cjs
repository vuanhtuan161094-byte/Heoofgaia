'use strict';
/* All 31 city facilities / legacy Chợ: exhaustive operation, cap and source smoke.
 * run node qa/nl_city_operations.test.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createEngine}=require('../tools/nl_city_engine.js');
const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/modules/city/catalog_v1.json'),'utf8'));
const alpha=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/alpha_content.json'),'utf8'));
const e=createEngine(c,alpha.research);
const currencies=['silver','grain','iron','prestige'];
let tests=0, operations=0, levels=0;
function check(label,fn){fn();tests++;console.log('PASS '+label);}
function game(){
 const g={version:5,silver:100000000,grain:100000000,iron:100000000,prestige:100000000,
  techSpent:0,buildings:{market:5,academy:5,barracks:5,farm:5,walls:1,lumberyard:1},
  technology:Object.fromEntries(alpha.research.systemIds.map(id=>[id,0]))};
 e.ensure(g,1000000);
 g.nlCity.levels.nl_city_hall=12;
 for(const name of c.localResources)g.nlCity.warehouse[name]=1000000;
 return g;
}
check('all 31 buildings can reach level cap through paid sequential upgrades',()=>{
 for(const b of c.buildings){
  const g=game(),s=g.nlCity;
  if(b.id==='nl_city_hall')s.levels.nl_city_hall=1;
  let now=1000000;
  const startLevel=s.levels[b.id];
  for(let target=startLevel+1;target<=b.levelCap;target++){
    const before=Object.fromEntries(currencies.map(k=>[k,g[k]]));
    const out=e.act(g,{kind:'build',id:b.id,actionId:'cap-'+b.id+'-'+target,now});
    assert.equal(out.ok,true,'build '+b.id+' '+target);
    assert.equal(out.targetLevel,target);
    assert.ok(Object.entries(out.debit).some(([k,v])=>v>0&&g[k]===before[k]-v));
    assert.equal(s.levels[b.id],target-1);
    now=out.job.finishAt;e.advance(g,now);
    assert.equal(s.levels[b.id],target,'complete '+b.id+' '+target);
    levels++;
  }
  const saved=Object.fromEntries(currencies.map(k=>[k,g[k]]));
  assert.equal(e.act(g,{kind:'build',id:b.id,actionId:'capover-'+b.id,now}).code,'MAX_LEVEL',b.id);
  assert.deepEqual(Object.fromEntries(currencies.map(k=>[k,g[k]])),saved);
 }
});
check('every new and legacy market operation debits, finishes, settles only once',()=>{
 const all=[...c.buildings,...c.legacy.filter(b=>b.actions&&b.actions.length)];
 for(const building of all){
  for(const action of building.actions||[]){
   const g=game();g.nlCity.levels[building.id]=Math.min(building.levelCap||5,3);
   const id=building.id;
   let now=1000000;
   const initial=JSON.parse(JSON.stringify(g));
   const a=e.act(g,{kind:'operate',id,operationId:action.id,actionId:'act-'+id+'-'+action.id,now});
   assert.equal(a.ok,true,'operate '+id+':'+action.id);
   assert.equal(a.operationId,action.id);
   const r=e.act(g,{kind:'operate',id,operationId:action.id,actionId:'act-'+id+'-'+action.id,now});
   assert.equal(r.duplicate,true,'duplicate '+id+':'+action.id);
   assert.ok(JSON.stringify(g)!==JSON.stringify(initial));
   if(a.job){
    assert.equal(e.act(g,{kind:'collect',id,actionId:'early-'+id,now}).code,'OPERATION_NOT_READY');
    now=a.job.finishAt;e.advance(g,now);
    const credit=e.act(g,{kind:'collect',id,actionId:'claim-'+id+'-'+action.id,now});
    assert.equal(credit.ok,true,'collect '+id+':'+action.id);
    const settled=JSON.stringify(g);
    e.advance(g,now);
    assert.equal(e.act(g,{kind:'collect',id,actionId:'claim-'+id+'-'+action.id,now}).duplicate,true);
    assert.equal(JSON.stringify(g),settled);
   } else assert.ok(a.credit,'instant '+id+':'+action.id);
   const snapshot=JSON.parse(JSON.stringify(g));
   assert.equal(snapshot.version,5);
   assert.equal(snapshot.nlCity.receiptIndex['act-'+id+'-'+action.id].ok,true);
   operations++;
  }
 }
});
check('no free duplicated tax or hunting rewards with new intent in same cooldown',()=>{
 for(const [id,op] of [['nl_city_tax_office','tax'],['nl_city_hunting','hunt'],['nl_city_hall','edict']]){
  const g=game();g.nlCity.levels[id]=1;
  const start=e.act(g,{kind:'operate',id,operationId:op,actionId:'first-'+id,now:1000000});
  assert.equal(start.ok,true);
  const repeated=e.act(g,{kind:'operate',id,operationId:op,actionId:'second-'+id,now:1000000});
  assert.ok(['OPERATION_PENDING','OPERATION_COOLDOWN'].includes(repeated.code));
 }
});
check('passive production remains capped escrow and never duplicates real credit',()=>{
 const g=game();g.nlCity.levels.nl_city_residence=1;g.nlCity.lastAt=1000000;
 const silver=g.silver;
 e.advance(g,1000000+2*86400000);
 assert.equal(g.silver,silver);
 assert.ok(g.nlCity.stock.nl_city_residence<=c.buildings.find(x=>x.id==='nl_city_residence').production.capacityPerLevel);
 const stock=g.nlCity.stock.nl_city_residence;
 assert.ok(stock>0);
 const out=e.act(g,{kind:'harvest',id:'nl_city_residence',actionId:'home-harvest',now:g.nlCity.lastAt});
 assert.equal(out.credit.silver,stock);
 assert.equal(g.silver,silver+stock);
 e.advance(g,g.nlCity.lastAt);
 assert.equal(e.act(g,{kind:'harvest',id:'nl_city_residence',actionId:'home-harvest',now:g.nlCity.lastAt}).duplicate,true);
 assert.equal(g.silver,silver+stock);
});
check('unknown facility, missing local materials, wrong item operation safely fail',()=>{
 const g=game();const now=1000000;
 assert.equal(e.act(g,{kind:'build',id:'nl_city_not_real',actionId:'unknown',now}).code,'UNKNOWN_BUILDING');
 assert.equal(e.act(g,{kind:'operate',id:'nl_city_shop',operationId:'unsupported',actionId:'bad',now}).code,'BUILDING_NOT_CONSTRUCTED');
 g.nlCity.levels.nl_city_shop=1;
 assert.equal(e.act(g,{kind:'operate',id:'nl_city_shop',operationId:'unsupported',actionId:'bad2',now}).code,'UNKNOWN_OPERATION');
 g.nlCity.warehouse.parts=0;
 assert.equal(e.act(g,{kind:'operate',id:'nl_city_shop',operationId:'sell_parts',actionId:'bad3',now}).code,'INSUFFICIENT_RESOURCES_OR_OVERFLOW');
 assert.equal(g.nlCity.warehouse.parts,0);
});
console.log('NL CITY OPERATIONS '+tests+'/'+tests+' PASS; exercised '+levels+' paid level upgrades and '+operations+' operation variants');
