/* HG81: paid troop conversions, Tavern rarity, safe dismissal, origin
 * fusion, talent training, increased EXP and consumed x2 cards. Save v07.
 * QA fixtures below are isolated, never imported into the playable game. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js'.split(' ');
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),cx,{filename:file});
const E=cx.HOG_ENGINE;
let passed=0,total=0;
function test(name,fn){total++;try{const out=fn()||{};console.log('HG81 PASS '+name+' '+JSON.stringify(out));passed++}catch(e){process.exitCode=1;console.error('HG81 FAIL '+name+' '+(e.stack||e))}}
function create(){const s=E.make('human',1_000_000);assert.equal(s.version,7);assert(E.strictSave(s));return s}
function save(s){assert(E.strictSave(s));const d=E.parseSave(E.serializeSave(s));assert(E.strictSave(d));return d}
function addHero(s,id){const h=JSON.parse(JSON.stringify(s.heroes[0]));h.id=id;h.name='QA '+id;s.heroes.push(h);s.equipment[id]={};E.hg81Ensure(s);assert(E.strictSave(s));return h}
test('New and legacy v07 saves migrate only HG81 ledger with no gear or army gifts',()=>{
 const s=create();assert.equal(s.hg81.v,1);assert.equal(s.hg81.cards,0);
 assert.deepEqual(Object.keys(s.hg81.skills),[]);
 const count=s.inventory.length,army={...s.army},copy=save(s);
 assert.equal(copy.inventory.length,count);assert.equal(JSON.stringify(copy.army),JSON.stringify(army));
 return {save:7,heroes:copy.heroes.length,items:count};
});
test('All Tavern offer pools contain 10% platinum and 10% rainbow, no Origin roll',()=>{
 const pools={};
 for(const level of [1,3,6,10]){
  const chance=E.heroQualityChances(level);
  assert.equal(chance.reduce((a,b)=>a+b,0),100);
  assert.equal(chance[5],10);assert.equal(chance[6],10);
  pools[level]=Array.from(chance);
 }
 const s=create();s.buildings.tavern=10;
 let rainbow=0,platinum=0;
 for(let i=0;i<180;i++){
  E.refreshTavern(s);
  for(const x of s.tavern.offers){const total=x.atk+x.def+x.spd+x.int;
   assert.equal(E.heroTierByTotal(total).id,x.quality);
   rainbow+=x.quality==='rainbow';platinum+=x.quality==='platinum';
  }
 }
 assert(rainbow>50&&platinum>50,{rainbow,platinum});
 assert(E.strictSave(s));return {pools,rainbow,platinum};
});
test('Real-cost repeated four-race conversion yields eight guards from 12 T1',()=>{
 const results=[];
 for(const race of Object.keys(E.C.races)){
  const s=E.make(race,1_000_000);s.hg30.stage=1;s.hg30.npcWins=2;s.hg30.paidTowerWins=1;
  s.hg20.tower.floor=11;s.army[race+'_1']=180;
  s.hg29.shards.wild=100;s.hg27.marks=100;s.hg27.tower=100;s.res.gold+=100000;
  const before={gold:s.res.gold,wild:s.hg29.shards.wild,marks:s.hg27.marks,
   t1:s.army[race+'_1'],guard:s.army[race+'_quest_guard']||0};
  const r=E.hg30Convert(s,'guard',3);
  assert.equal(r.batches,3);assert.equal(r.toCount,24);
  assert.equal(s.army[race+'_1'],before.t1-36);
  assert.equal(s.army[race+'_quest_guard'],before.guard+24);
  assert.equal(s.res.gold,before.gold-9000);assert.equal(s.hg29.shards.wild,before.wild-18);
  assert.equal(s.hg27.marks,before.marks-36);
  assert(E.strictSave(s));results.push({race,guard:24,spentGold:9000});
 }
 return results;
});
test('Insufficient conversion resources never deduct currency or alter armies',()=>{
 const s=create(),before=JSON.stringify(s);assert.throws(()=>E.hg30Convert(s,'guard',10));
 assert.equal(JSON.stringify(s),before);return {untouched:true};
});
test('XP card is purchased with gold; charges only paid wins, never other activities',()=>{
 const s=create(),initial=s.res.gold,E0=s.heroes[0].xp;
 const bought=E.hg81BuyXpCard(s);assert.equal(bought.cards,1);assert.equal(s.res.gold,initial-12000);
 E.hg81ActivateXpCard(s);assert.equal(s.hg81.activeUses,8);assert.equal(s.hg81.cards,0);
 E.grantHeroExperience(s,1,100,'luyện trong thành');
 assert.equal(s.hg81.activeUses,8);
 const receipt=E.grantHeroExperience(s,1,1000,'thắng trận 4★');
 assert(receipt.gained>2000);assert.equal(receipt.cardApplied,true);
 assert.equal(s.hg81.activeUses,7);assert(s.heroes[0].xp>E0);
 save(s);return {charges:7,gained:receipt.gained,paid:12000};
});
test('Tower regular rewarded floors and NPC both have meaningful XP multiplier',()=>{
 const s=create(),source={kind:'npc',level:4};
 assert.equal(E.battleExperienceReward(source).baseXp,3000);
 const r=E.grantHeroExperience(s,1,1000,'vượt Bí Cảnh tầng 1');
 assert(r.gained>=3000);assert.equal(r.hg81Factor,3);
 assert(E.strictSave(s));return {npc4:3000,towerBaseMultiplier:3};
});
test('Four branch talents are earned through real XP, spent once, saved and preserved on rebirth',()=>{
 const s=create();s.hg81.credits[1]=5;
 for(const skill of ['infantry','archery','flying','elite']){
  const out=E.hg81SkillUp(s,1,skill);assert.equal(out.level,1);
 }
 assert.equal(E.hg81SkillStatus(s,1).available,1);
 const source=save(s);assert.equal(E.hg81SkillStatus(source,1).used,4);
 source.heroes[0].level=100;source.heroes[0].xp=0;source.hg81.credits[1]=22;
 source.hg18.materials.rebirth_core=1;source.res.gold+=12000;
 E.rebirthHG18Hero(source,1);
 assert.equal(source.heroes[0].level,1);assert.equal(source.heroes[0].rebirth,1);
 assert.equal(source.hg81.credits[1],24);assert.equal(E.hg81SkillStatus(source,1).used,4);
 save(source);return {skillBranches:4,creditsAfterRebirth:24};
});
test('One-click unequip/army removal keeps exact item UIDs, stock and v07',()=>{
 const s=create();const h=addHero(s,2);
 const gear=E.addItem(s,'star_blade','HG81 test inventory original');
 E.equipItem(s,gear.uid,2);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:5}]);
 const state=JSON.stringify(s.inventory),army=JSON.stringify(s.army);
 const r=E.hg81StripHero(s,2,'all');
 assert.equal(r.gear,1);assert.equal(r.troops,5);
 assert.equal(JSON.stringify(s.inventory),state);assert.equal(JSON.stringify(s.army),army);
 assert.equal(Object.keys(s.equipment[2]).length,0);
 assert.equal(E.hg20HeroPlan(s,2).length,0);
 assert(E.strictSave(s));
 // After demobilization, even a hero WITH spent talent credits must be
 // removable via the real canonical dismissal; the HG81 ledger cannot orphan.
 s.hg81.credits[2]=1;
 E.hg81SkillUp(s,2,'infantry');
 assert.equal(E.hg81SkillStatus(s,2).used,1);
 const dismissed=E.hg408DismissHero(s,2);
 assert.equal(dismissed.heroId,2);assert(!s.heroes.some(h=>h.id===2));
 assert(!Object.prototype.hasOwnProperty.call(s.hg81.credits,'2'));
 assert(!Object.prototype.hasOwnProperty.call(s.hg81.skills,'2'));
 assert.equal(JSON.stringify(s.inventory),state);assert.equal(JSON.stringify(s.army),army);
 save(s);
 return {uid:gear.uid,returnedGear:r.gear,freedArmy:r.troops,heroDismissed:2};
});
test('Fusion fails without both true level-100 CS5 rarities without mutating state',()=>{
 const s=create();addHero(s,2);const before=JSON.stringify(s);
 assert.throws(()=>E.hg81Fuse(s,1,2));assert.equal(JSON.stringify(s),before);
 return {losses:0,originMinted:0};
});
test('Fusion consumes exactly one eligible hero, retains inventory and creates stronger Origin',()=>{
 const s=create();const p=addHero(s,2),r=s.heroes[0];
 for(const [h,id,score] of [[r,'rainbow',92],[p,'platinum',85]]){
  h.level=100;h.rebirth=5;h.heroRank=5;h.xp=0;
  h.hg18Base={atk:score,def:score,spd:score,int:score};
  for(const k of ['atk','def','spd','int'])h[k]=score;
  h.qualityModel=3;h.quality=id;h.qualityScore=score*4;
  s.hg81.credits[h.id]=29;
 }
 assert.equal(E.hg408HeroQuality(r),'rainbow');assert.equal(E.hg408HeroQuality(p),'platinum');
 const gear=E.addItem(s,'star_blade','HG81 fusion item');
 E.equipItem(s,gear.uid,p.id);
 const stock=JSON.stringify(s.army),inventory=JSON.stringify(s.inventory);
 const x=E.hg81Fuse(s,r.id,p.id);
 assert.equal(x.id,r.id);assert.equal(s.heroes.length,1);
 assert.equal(E.hg408HeroQuality(s.heroes[0]),'origin');
 assert.equal(s.heroes[0].fusionOrigin,true);
 assert.equal(JSON.stringify(s.army),stock);
 assert.equal(JSON.stringify(s.inventory),inventory);
 assert.equal(s.heroes[0].level,100);assert.equal(s.heroes[0].rebirth,5);
 const q=save(s);assert.equal(q.heroes[0].fusionOrigin,true);
 return {id:x.id,originStats:E.heroStats(s,x.id).atk,inventoryUid:gear.uid,donorRemoved:true};
});
console.log('HG81 SUMMARY '+passed+'/'+total);
if(passed!==total)process.exitCode=1;
