/* HG50-C Economy Gate: source-to-sink audit, no simulated bonus payouts.
 * Baseline/warehouse and troop costs are read from the real v07 engine.
 * High-tier QA inventories and game wins are NOT granted by this module.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js'.split(' ');
const ctx=vm.createContext({console});
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
const sourceSHA=process.env.GITHUB_SHA||'local';
const classes=['human','elf','orc','undead'],tiers=[11,12,13],checks=[];
function check(label,fn){
 try{const v=fn();checks.push({label,pass:true,detail:v||null});console.log('HG50-C ECON PASS '+label+' '+JSON.stringify(v));}
 catch(e){checks.push({label,pass:false,error:String(e.stack||e)});process.exitCode=1;console.error('HG50-C ECON FAIL '+label+' '+String(e.stack||e));}
}
const make=race=>E.make(race,1e6);
const itemCost=(a,k)=>Math.max(0,Math.floor(a?.[k]||0));
const status=E.hg50Status(make('human')),rows=[],totals={gold:0,wood:0,ore:0,sulfur:0,crystal:0};
check('canonical route 3 real enemy targets and derived Boss commander rewards',()=>{
 assert.deepEqual(Array.from(status.stages,x=>x.tier),tiers);
 assert.deepEqual(Array.from(status.stages,x=>x.target),['18,92','29,86','99,81']);
 for(const stage of status.stages){
  const tile=E.getTile(stage.target),p=E.hg409Preview('npc',stage.target),layout=E.hg410EncounterPreview('npc',stage.target);
  assert.equal(tile.eliteTier,stage.tier);assert.equal(p.kind,'boss');
  assert.equal(p.boss,true);assert.equal(layout.stacks,16);
  for(const k of E.C.keys){
   assert(Number.isSafeInteger(p.resources[k])&&p.resources[k]>0);
   totals[k]+=p.resources[k];
  }
  assert(p.materials.enhance_stone>0&&p.materials.astral_shard>0);
 }
 assert.equal(totals.gold,2020000);
 return {bossCount:3,totalGrossGold:totals.gold,eachGross:status.stages.map(x=>E.hg409Preview('npc',x.target).resources.gold)};
});
check('four races x three tiers: real AP and unit replacement quotes, cap-aware payout',()=>{
 for(const race of classes)for(const stage of status.stages){
  const s=make(race),tile=E.getTile(stage.target),p=E.hg409Preview('npc',tile.key);
  const limits=E.limits(s),before={...s.res},u=E.getUnit(s,race+'_10');
  assert(u&&u.tier===10,'high tier troop source absent: '+race);
  assert.strictEqual(typeof E.recruitCost,'function');
  const perUnit=E.recruitCost(s,u,1),apCost=E.hg182MarchCost(s,tile.key);
  assert(Number.isFinite(apCost)&&apCost>0&&apCost<=s.apMax);
  assert(perUnit.gold>0,'invalid paid recruitment');
  for(const k of E.C.keys)assert(Number.isFinite(perUnit[k]||0)&&perUnit[k]>=0);
  E.add(s,p.resources);
  const earned=Object.fromEntries(E.C.keys.map(k=>[k,Math.max(0,Math.round(s.res[k]-before[k]))]));
  const maxGain=Object.fromEntries(E.C.keys.map(k=>[k,Math.max(0,Math.round(Math.min(p.resources[k],limits[k]-before[k])))]));
  assert.deepEqual(earned,maxGain,'payout must respect authoritative storage cap');
  const saturated=make(race);
  for(const k of E.C.keys)saturated.res[k]=E.limits(saturated)[k];
  const fullStock={...saturated.res};E.add(saturated,p.resources);
  for(const k of E.C.keys)assert.equal(saturated.res[k],fullStock[k],'full warehouse payout exceeds cap');
  rows.push({race,tier:stage.tier,target:tile.key,cs:p.cs,apCost,
   source:p.resources,actualStartingStockGain:earned,startingStock:before,storageLimit:limits,
   tier10Unit:u.id,tier10ReplacementPerUnit:perUnit,
   replacementGoldFor100:itemCost(perUnit,'gold')*100,
   noFictiveCReward:true});
 }
 assert.equal(rows.length,12);
 return {raceCount:classes.length,caseCount:rows.length,
  maxActualBaselineGold:Math.max(...rows.map(x=>x.actualStartingStockGain.gold)),
  sample:rows.find(x=>x.race==='human'&&x.tier===11)};
});
check('HG29/HG31/HG47 and HG27 sources already reward each real Boss win, no new economy grant justified',()=>{
 const s=make('human');
 assert(E.HG29_TABLES?.npc_boss?.guaranteed?.some(x=>x[0]==='abyss'));
 assert(E.HG47_TIERS?.rare?.fragmentCount===8);
 assert(E.HG47_TIERS?.divine?.fragmentCount===12);
 assert(E.HG47_TIERS.divine.cost.bossToken===1);
 assert(E.HG27_TOKENS.boss);
 assert(E.HG29_RECIPES.length>0);
 assert(E.hg50Status(s).completed.length===0);
 return {hg29GuaranteedAbyss:E.HG29_TABLES.npc_boss.guaranteed[0][1],
  hg47RareNeed:E.HG47_TIERS.rare.fragmentCount,
  hg47DivineNeed:E.HG47_TIERS.divine.fragmentCount,
  hg27BossToken:'real-win only',additionalHG50Reward:0};
});
check('final accounting gate blocks independent HG50-C reward multiplier before cost/loss ROI evidence',()=>{
 // We do not call arbitrary 1000x Hero QA fixtures "balanced real player".
 // Full endgame economy cannot be certified from money drops without measured
 // affordability, battle casualties, healing and real troop replacement.
 assert(rows.some(x=>x.source.gold>100000));
 assert(rows.every(x=>x.noFictiveCReward));
 assert(totals.gold>rows[0].storageLimit.gold);
 return {status:'NO_EXTRA_CURRENCY',reason:'unbounded repeatable PvE rewards + existing warehouse cap; live losses and attainable endgame build remain unmeasured',
  bossGrossGoldSum:totals.gold,firstWarehouseGoldLimit:rows[0].storageLimit.gold};
});
const report={gate:'HG50-C real economy source-versus-sink audit',
 source_sha:sourceSHA,save_version:7,passed:checks.filter(x=>x.pass).length,total:checks.length,
 checks,rows,threeBossGrossResources:totals,
 recommendation:{additionalCurrencyPerExpedition:0,additionalFragmentsPerExpedition:0,
  existingBossLootAuthoritative:true,allowReplayOnlyThroughExistingRealBossEngine:true,
  noDoubleClaim:true,capPremiumSourceBeforeAnyExtraPayout:true}};
const out=path.join(__dirname,'docs/qa/hg50/economy-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('HG50-C ECONOMY',report.passed+'/'+report.total,report.passed===report.total?'PASS':'FAIL');
if(report.passed!==report.total)process.exitCode=1;
