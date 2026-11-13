/* HG85: 4000 special units per paid conversion, unchanged inputs, strict Save v07.
 * Manual wallet and quest counters below are named QA FIXTURES, not game rewards.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js'.split(' ');
const ctx=vm.createContext({console,Date,Math});
for(const p of files)vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});
const E=ctx.HOG_ENGINE;let pass=0;
function check(name,run){try{let v=run()||{};pass++;console.log('HG85 PASS '+name+' '+JSON.stringify(v));}catch(e){process.exitCode=1;console.error('HG85 FAIL '+name+' '+(e.stack||e))}}
const load=s=>{assert(E.strictSave(s));const x=E.parseSave(E.serializeSave(s));assert(E.strictSave(x));return x;};
function rich(race){
 const s=E.make(race,1000000);s.res.gold=500000;
 s.hg20.tower.floor=25;
 for(const k in s.hg29.shards)s.hg29.shards[k]=2000;
 for(const k of ['marks','boss','tower'])s.hg27[k]=2000;
 s.hg30.stage=1;s.hg30.npcWins=2;s.hg30.paidTowerWins=1;
 s.army[race+'_1']=300;
 return s;
}
check('HG27 all four races exchange 12 normal troops for exactly 4000 Guards at original cost',()=>{
 const proof=[];
 for(const race of ['human','elf','orc','undead']){
  const s=rich(race),before={...s.res},q={...s.hg27},source=s.army[race+'_1'];
  const recipe=E.HG27_RECIPES.find(x=>x.id==='guard');
  assert.equal(recipe.troops,12);assert.equal(recipe.gold,3000);assert.equal(recipe.need.marks,12);assert.equal(recipe.need.tower,3);
  const x=E.hg27Exchange(s,'guard');
  assert.equal(x.output.count,4000);assert.equal(s.army[race+'_quest_guard'],4000);
  assert.equal(s.army[race+'_1'],source-12);
  assert.equal(s.res.gold,before.gold-3000);
  assert.equal(s.hg27.marks,q.marks-12);assert.equal(s.hg27.tower,q.tower-3);
  const restored=load(s);assert.equal(restored.army[race+'_quest_guard'],4000);
  proof.push({race,out:x.output.count,save:restored.version});
 }
 return {proof};
});
check('HG30 both quest conversions pay 4000 at unchanged gold/shard/token prices',()=>{
 const proof=[];
 for(const race of ['human','elf','orc','undead']){
  const s=rich(race);const guard=E.HG30_RECIPES.guard,king=E.HG30_RECIPES.sovereign;
  assert.equal(guard.fromCount,12);assert.equal(guard.gold,3000);assert.equal(guard.fragments.wild,6);
  assert.equal(guard.tokens.marks,12);assert.equal(guard.tokens.tower,3);
  assert.equal(king.fromCount,2);assert.equal(king.gold,20000);
  assert.equal(king.fragments.abyss,4);assert.equal(king.fragments.hunter,8);assert.equal(king.fragments.hero,4);
  assert.equal(king.fragments.tower,12);assert.equal(king.tokens.boss,2);assert.equal(king.tokens.tower,4);
  const startGold=s.res.gold,q={...s.hg27},shards={...s.hg29.shards};
  const first=E.hg30Convert(s,'guard');
  assert.equal(first.toCount,4000);assert.equal(s.hg30.stage,2);
  assert.equal(s.res.gold,startGold-3000);
  assert.equal(s.hg27.marks,q.marks-12);assert.equal(s.hg29.shards.wild,shards.wild-6);
  s.hg30.npcWins=3;s.hg30.bossWins=1;s.hg30.paidTowerWins=3;
  const second=E.hg30Convert(s,'sovereign');
  assert.equal(second.toCount,4000);assert.equal(s.hg30.stage,3);
  assert.equal(s.army[race+'_quest_guard'],3998);assert.equal(s.army[race+'_tower_sovereign'],4000);
  assert.equal(s.res.gold,startGold-3000-20000);
  assert.equal(s.hg27.boss,q.boss-2);
  assert.equal(s.hg29.shards.abyss,shards.abyss-4);
  const restored=load(s);assert.equal(restored.army[race+'_tower_sovereign'],4000);
  assert.equal(restored.hg30.receipts.length,2);
  proof.push({race,guard:4000,sovereign:4000});
 }
 return {proof};
});
check('HG30 max conversion is 10 actual paid batches = 40000 troops, never free',()=>{
 const s=rich('human');s.hg30.stage=3;
 s.army.human_1=120;
 const before={gold:s.res.gold,marks:s.hg27.marks,wild:s.hg29.shards.wild,army:s.army.human_1};
 const quote=E.hg30Recipe(s,'guard');assert.equal(quote.maxBatches,10);
 const result=E.hg30Convert(s,'guard',10);
 assert.equal(result.toCount,40000);assert.equal(s.army.human_quest_guard,40000);
 assert.equal(s.army.human_1,0);assert.equal(s.res.gold,before.gold-30000);
 assert.equal(s.hg27.marks,before.marks-120);assert.equal(s.hg29.shards.wild,before.wild-60);
 const copy=load(s);assert.equal(copy.hg30.receipts[0].toCount,40000);
 return {batches:10,guards:result.toCount,save:copy.version};
});
check('Rejected conversions spend nothing and do not exceed army 100m cap',()=>{
 const s=rich('human');s.hg30.stage=3;
 s.army.human_quest_guard=100000000-3999;
 let gold=s.res.gold;
 assert.equal(E.hg30Recipe(s,'guard').maxBatches,0);
 assert.throws(()=>E.hg30Convert(s,'guard'),/Số mẻ|chưa đủ/i);
 assert.equal(s.res.gold,gold);
 assert.equal(E.hg27Catalogue(s).find(x=>x.id==='guard').canExchange,false);
 assert.throws(()=>E.hg27Exchange(s,'guard'),/Thiếu/i);
 assert.equal(s.army.human_quest_guard,100000000-3999);
 load(s);return {cap:100000000,rejected:true};
});
check('Historic Save v07 receipt with old 8/4 troop counts remains readable',()=>{
 const s=rich('human');
 s.hg30.receipts=[{id:'guard',race:'human',ordinal:1,fromUnit:'human_1',toUnit:'human_quest_guard',
 fromCount:12,toCount:8,batches:1,gold:3000,stage:2}];
 const out=load(s);assert.equal(out.hg30.receipts[0].toCount,8);
 return {oldReceipts:true,version:out.version};
});
console.log('HG85 '+pass+'/5 '+(process.exitCode?'FAIL':'PASS'));
if(pass!==5)process.exitCode=1;
