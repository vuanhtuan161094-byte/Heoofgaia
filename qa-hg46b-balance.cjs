/* HG46-B offline reward economy and early/mid/late gearing audit.
 * All modeled odds come from live exported tables, all fixture items are
 * explicitly labeled as such; no fabricated victory or state mutation
 * results are presented as organic PvE proof.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js'.split(' ');
const sandbox=vm.createContext({console});
for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,script),'utf8'),sandbox,{filename:script});
const E=sandbox.HOG_ENGINE,results=[],model={saveVersion:7,source:'real published in-game pool tables',modelOnly:true};
function check(name,fn){
 try{const info=fn()||{};results.push({name,status:'PASS',info});console.log('HG46-B PASS '+name+' '+JSON.stringify(info))}
 catch(e){results.push({name,status:'FAIL',reason:String(e.stack||e)});console.error('HG46-B FAIL '+name+' '+String(e.stack||e));process.exitCode=1}
}
const newGame=()=>E.make('human',1000000);
const save=s=>{assert(E.strictSave(s));const out=E.parseSave(E.serializeSave(s));assert(E.strictSave(out));return out};
const round=n=>Math.round(n*1e4)/1e4;
check('HG29 six sources are normalized; no synthetic rewards or over-100% drops',()=>{
 const sources={};
 for(const [id,pool] of Object.entries(E.HG29_TABLES)){
  const total=pool.roll.reduce((n,e)=>n+e[3],0);
  assert.equal(total,10000,id);
  assert(pool.guaranteed.every(r=>Object.hasOwn(E.HG29_ITEMS,r[0])));
  assert(pool.roll.every(r=>r[0]==='none'||Object.hasOwn(E.HG29_ITEMS,r[0])));
  const e=E.hg29Expected(id);
  sources[id]={noDropPercent:pool.roll.find(row=>row[0]==='none')[3]/100,
   guaranteed:pool.guaranteed,expected:Object.fromEntries(Object.entries(e).filter(([,n])=>n>0).map(([key,n])=>[key,round(n)]))};
 }
 assert.equal(sources.npc_low.noDropPercent,15);
 assert.equal(sources.npc_elite.noDropPercent,3);
 assert.equal(sources.tower.expected.tower,1);
 assert.equal(E.hg29Expected('tower',5).tower,2);
 model.sources=sources;return sources;
});
check('HG46-B source-correct four-set progression is reachable with zero free inventory',()=>{
 const state=newGame();assert.equal(state.inventory.length,0);
 assert(Object.values(state.hg29.shards).every(x=>x===0));
 assert(Object.values(state.hg31.fragments).every(x=>x===0));
 const dragon=E.hg31Catalogue(state).filter(x=>x.set==='dragon');
 const star=E.hg31Catalogue(state).filter(x=>x.set==='star');
 assert(dragon.every(x=>!x.unlocked&&!x.canCraft));
 assert(star.every(x=>!x.unlocked&&!x.canCraft));
 state.hg31.bossWins=1; // explicitly a gate fixture, NOT an earned victory
 const opened=E.hg31Catalogue(state).filter(x=>x.set==='dragon');
 assert(opened.every(x=>x.unlocked&&!x.canCraft));
 assert(opened.every(x=>x.need.bossToken===1));
 assert(star.every(x=>x.need.bossToken===0));
 assert(opened.every(x=>x.need.fragments===6));
 assert(star.every(x=>x.need.fragments===9));
 assert(E.strictSave(state));
 model.stages=[
  {stage:'early',sources:['Bazaar','daily task','NPC 1-3★'],
   gear:'ordinary and 3-slot basic',floor:1,bossNeeded:0},
  {stage:'middle',sources:['elite NPC 4-10★','paid Tower','HG27 victory exchange'],
   gear:'Sentinel and Astral',paidTowerFor3SentinelViaHG27:6,
   note:'6 claimed victories at 5/day cap is at least two calendar claim days'},
  {stage:'late',sources:['actual Boss T11-T13','paid Tower floor 21+'],
   dragon:'6 targeted fragments/item from T11/T12, 3 items = 18 focused Boss wins before extras',
   star:'9 targeted fragments/item; 4 Hero fragments/item; no Boss tokens',
   minimumStarPaidClaimsFromHeroExpected:60,
   expectedStarClaimDaysAt5PerDay:12,
   note:'60/12 are expectations based on a 20% Hero-shard roll; NOT guaranteed unlock or win times'}
 ];
 return {sets:4,noFreeItems:true,dragonUnlockedByBoss:true,starRequiresBossTokens:false};
});
check('Enhancement +10 retains steep but reachable earned materials and exact cost',()=>{
 const stone=E.HG29_RECIPES.find(x=>x.id==='stone');
 assert.equal(stone.output.id,'enhance_stone');
 assert.equal(stone.output.count,6);
 assert.equal(stone.cost.wild,6);assert.equal(stone.cost.gear,4);
 const costs=Array.from({length:10},(_,level)=>({
  to:level+1,stones:2+2*level,gold:250*(level+1),
  craftEquivalent:Math.ceil((2+2*level)/stone.output.count)}));
 const stones=costs.reduce((n,r)=>n+r.stones,0),gold=costs.reduce((n,r)=>n+r.gold,0);
 assert.equal(stones,110);assert.equal(gold,13750);
 const singleCrafts=Math.ceil(stones/stone.output.count);
 const setCrafts=Math.ceil(stones*3/stone.output.count);
 assert.equal(singleCrafts,19);assert.equal(setCrafts,55);
 model.enhance={steps:costs,totalPerItem:{stones,gold,fullCrafts:singleCrafts,
  wild:singleCrafts*stone.cost.wild,gear:singleCrafts*stone.cost.gear},
  threeItems:{stones:stones*3,gold:gold*3,fullCrafts:setCrafts,
   wild:setCrafts*stone.cost.wild,gear:setCrafts*stone.cost.gear},
  allMaterialsMustBeActuallyEarned:true};
 return model.enhance;
});
check('Actual HG29 fragment recipe spends 6 wild + 4 gear for 6 stones, no currency injection',()=>{
 const s=newGame();
 s.hg29.shards.wild=6;s.hg29.shards.gear=4; // explicit wallet fixture
 const start=s.hg18.materials.enhance_stone;
 const out=E.hg29Craft(s,'stone');
 assert.equal(out.output.count,6);
 assert.equal(s.hg29.shards.wild,0);assert.equal(s.hg29.shards.gear,0);
 assert.equal(s.hg18.materials.enhance_stone,start+6);
 assert.equal(save(s).hg18.materials.enhance_stone,start+6);
 return {spent:{wild:6,gear:4},earnedStones:6,save:7};
});
check('Four real set effects activate at 2/3 and 3/3, stats rise through milestones',()=>{
 const sets={
  sentinel:['sentinel_sword','sentinel_plate','sentinel_seal'],
  astral:['astral_sword','astral_plate','astral_seal'],
  dragon:['dragon_blade','dragon_plate','dragon_seal'],
  star:['star_blade','star_plate','star_seal']
 };
 const values={};
 for(const [set,ids] of Object.entries(sets)){
  const s=newGame(),hero=s.activeHero,initial=E.heroStats(s,hero);
  const first=E.addItem(s,ids[0],'HG46-B explicit set test fixture');
  E.equipItem(s,first.uid,hero);
  assert.equal(E.hg18SetCounts(s,hero)[set],1);
  const second=E.addItem(s,ids[1],'HG46-B explicit set test fixture');
  E.equipItem(s,second.uid,hero);
  const two=E.combatModifiers(s,hero);
  const third=E.addItem(s,ids[2],'HG46-B explicit set test fixture');
  E.equipItem(s,third.uid,hero);
  const three=E.combatModifiers(s,hero),stats=E.heroStats(s,hero);
  assert.equal(E.hg18SetCounts(s,hero)[set],3);
  assert(stats.atk+stats.def>initial.atk+initial.def);
  assert(Object.values(three).every(v=>Number.isFinite(v)&&v>=0&&v<=.4));
  if(set==='sentinel'){assert(two.damageReduction>=.025);assert(three.damageBonus>=.035)}
  if(set==='astral'){assert(two.damageBonus>=.035);assert(three.damageReduction>=.05)}
  if(set==='dragon'){assert(two.meleeDamage>=.065);assert(three.damageReduction>=.065)}
  if(set==='star'){assert(two.damageBonus>=.08);assert(three.damageReduction>=.085)}
  const restored=save(s);
  assert.equal(E.hg18SetCounts(restored,hero)[set],3);
  values[set]={two,three,stats:{atk:stats.atk,def:stats.def,spd:stats.spd},save:restored.version};
 }
 assert(values.sentinel.stats.atk<values.astral.stats.atk);
 assert(values.astral.stats.atk<values.dragon.stats.atk);
 assert(values.dragon.stats.atk<values.star.stats.atk);
 model.sets=values;return values;
});
check('Real legendary Star forge consumes only Tower/Hero shards, not Boss currency',()=>{
 const s=newGame();
 s.hg31.paidTowerWins=3;s.hg20.tower.floor=21;
 s.hg31.fragments.star_plate=9;s.hg29.shards.tower=12;s.hg29.shards.hero=4;
 s.res.gold=E.limits(s).gold;
 // Fixture is intentionally constructed to represent only available
 // Tower-side resources; none is ever passed off as actual battle earnings.
 s.hg27.boss=0;
 const item=E.hg31Catalogue(s).find(x=>x.id==='star_plate');
 assert(item.canCraft&&item.unlocked);
 const gold=s.res.gold,receipt=E.hg31Craft(s,'star_plate');
 assert.equal(s.res.gold,gold-item.price);assert.equal(s.hg27.boss,0);
 assert.equal(s.hg31.fragments.star_plate,0);
 assert.equal(s.hg29.shards.tower,0);assert.equal(s.hg29.shards.hero,0);
 assert(save(s).inventory.some(x=>x.uid===receipt.uid));
 return {uid:receipt.uid,spendGold:item.price,usedBoss:0,v07:7};
});
check('HG46-B salvage respects four equipment tier values without free Boss/Tower tokens',()=>{
 const rates={sentinel:3,astral:5,dragon:8,star:10};
 const report={};
 for(const [set,expected] of Object.entries(rates)){
  const id={sentinel:'sentinel_seal',astral:'astral_seal',dragon:'dragon_seal',star:'star_seal'}[set];
  const s=newGame(),it=E.addItem(s,id,'HG46-B explicit salvage fixture'),before=s.hg18.materials.enhance_stone,
   boss=s.hg27.boss,tower=s.hg27.tower,abyss=s.hg29.shards.abyss;
  const displayed=E.hg46SalvagePreview(s,it.uid);
  assert.equal(displayed.stones,expected);assert.equal(displayed.owner,null);
  const result=E.salvageHG18(s,it.uid);
  assert.equal(result.stones,expected);assert.equal(s.hg18.materials.enhance_stone,before+expected);
  assert.equal(s.hg27.boss,boss);assert.equal(s.hg27.tower,tower);assert.equal(s.hg29.shards.abyss,abyss);
  assert.throws(()=>E.salvageHG18(s,it.uid),/không tồn tại/);
  assert(E.strictSave(s));report[set]={stones:expected,astralReturned:result.shards};
 }
 return report;
});
check('Actual strict v07 load keeps zero retroactive gear-fragment rewards',()=>{
 const s=newGame(),before=E.clone(s);
 const doc=JSON.parse(E.serializeSave(s));
 delete doc.state.hg29;delete doc.state.hg31;
 const loaded=E.parseSave(JSON.stringify(doc));
 assert(E.strictSave(loaded));
 assert(Object.values(loaded.hg29.shards).every(x=>x===0));
 assert(Object.values(loaded.hg31.fragments).every(x=>x===0));
 assert.deepEqual(JSON.parse(JSON.stringify(loaded.res)),JSON.parse(JSON.stringify(before.res)));
 return {save:loaded.version,walletsZero:true,retroactive:false};
});
model.tests=results;model.total=results.length;model.passed=results.filter(x=>x.status==='PASS').length;
const dir=path.join(__dirname,'docs','qa','hg46b');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'progression-balance.json'),JSON.stringify(model,null,2)+'\n','utf8');
console.log('HG46-B SUMMARY '+model.passed+'/'+model.total);
if(model.passed!==model.total)process.exitCode=1;
