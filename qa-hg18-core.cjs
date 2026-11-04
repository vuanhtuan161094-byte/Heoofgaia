/* HG18 foundation-first deterministic tests.
 * Source-backed: the 40 recruitable units and T11/12 demon monsters.
 * Original model: daily/weekly cards, rare sets, enhancement, hero rank/rebirth.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context,{filename:file});
const E=context.HOG_ENGINE,C=context.HOG_CATALOG;
let pass=0,fail=0;const checks=[];
function test(name,fn){try{const data=fn();pass++;checks.push({name,status:'PASS',data:data||null});console.log('PASS '+name+(data?' '+JSON.stringify(data):''));}
 catch(err){fail++;checks.push({name,status:'FAIL',error:String(err.stack||err)});console.error('FAIL '+name+': '+(err.stack||err));}}
const starter=(race='human')=>E.make(race,1_000_000);
const save=s=>{assert(E.strictSave(s),'Invalid state before save');return E.parseSave(E.serializeSave(s))};
const advance=(s,sec)=>E.tick(s,s.lastTick+(sec+2)*1000/s.speed);
const counts=s=>s.hg18;
test('Catalog retains 40 original recruitable faction units plus exactly 4 quest-only guard types',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(C.units).map(([k,v])=>[k,v.length])),{human:10,elf:10,orc:10,undead:10});
 for(const race of ['human','elf','orc','undead']){const unit=C.rewardUnits[race][0],s=starter(race);
  assert(unit.rewardOnly&&unit.tier===8&&E.getUnit(s,unit.id)?.id===unit.id);
  assert(E.unitValue(unit)>0,'Reward soldier must cost real command points');
  assert.throws(()=>E.recruit(s,unit.id,1),/chỉ nhận qua nhiệm vụ/);
  assert(E.strictSave(s));
 }
 return {historical:40,modeledRewardOnly:4};
});
test('Four 9-10 star boss camps use Fandom demon T11/T12 unit stat templates',()=>{
 const camps=E.TILES.filter(t=>t.eliteTier>=11);
 assert.equal(camps.length,4);assert.equal(camps.filter(t=>t.eliteTier===11).length,2);assert.equal(camps.filter(t=>t.eliteTier===12).length,2);
 const s=starter();s.heroes[0].level=100;s.army.human_10=10;s.formation=[{unitId:'human_10',count:10}];
 for(const camp of camps){assert(E.pathfind('3,4',camp.key),'Boss must be reachable');
  const b=E.makeBattle(s,camp.key);assert(b.enemies.some(u=>u.hp===(camp.eliteTier===11?800:1101)));
  assert(b.enemies.every(u=>u.atk>=230&&u.def>=155));
 }
 return {bosses:camps.map(t=>({key:t.key,tier:t.eliteTier}))};
});
test('Existing legacy v07 save migrates safely, supplies no free cards and preserves all wealth',()=>{
 const s=starter(),plain=E.clone(s),before={...plain.res};
 delete plain.hg18;for(const h of plain.heroes){delete h.rebirth;delete h.heroRank;delete h.hg18Base}
 const loaded=E.parseSave(JSON.stringify(plain));
 assert.equal(loaded.hg18.version,1);assert.equal(loaded.heroes[0].heroRank,1);assert.equal(loaded.heroes[0].rebirth,0);
 assert(Object.values(loaded.hg18.materials).every(v=>v===0));
 assert.equal(JSON.stringify(loaded.res),JSON.stringify(before));assert(E.strictSave(loaded));
 return {schema:loaded.version,materials:'zero',startingResources:'unchanged'};
});
test('Real paid construction and training grant exact-once daily and weekly quest progress',()=>{
 const s=starter(),base={...s.res};
 E.upgrade(s,'market');assert.equal(E.hg18Tasks(s,'daily')[0].progress,0);
 advance(s,s.buildingQueue.remaining+1);
 assert.equal(s.buildings.market,1);assert.equal(E.hg18Tasks(s,'daily')[0].progress,1);
 assert.equal(E.hg18Tasks(s,'weekly')[0].progress,1);
 E.recruit(s,'human_1',10);assert.equal(E.hg18Tasks(s,'daily')[1].progress,0);
 advance(s,s.training[0].remaining+1);
 assert.equal(E.hg18Tasks(s,'daily')[1].progress,10);
 assert.equal(E.hg18Tasks(s,'weekly')[1].progress,10);
 assert.equal(s.army.human_1,26);
 assert.equal(JSON.stringify(s.res)!==JSON.stringify(base),true);
 const before=JSON.stringify(s);E.tick(s,s.lastTick);assert.equal(JSON.stringify(s),before,'Repeated tick must not re-award counters');
 const copy=save(s);
 assert.equal(E.hg18Tasks(copy,'daily')[0].progress,1);assert.equal(E.hg18Tasks(copy,'daily')[1].progress,10);
 return {builds:1,trained:10,schema:copy.version};
});
test('Exact-once daily task payouts, resource cards are warehouse-atomic and consumed once',()=>{
 const s=starter();E.upgrade(s,'market');advance(s,s.buildingQueue.remaining+1);
 const quest=E.hg18Tasks(s,'daily').find(q=>q.id==='daily_build');assert(quest.ready&&!quest.claimed);
 const reward=E.claimHG18Task(s,'daily','daily_build');assert.equal(reward.resource_card,1);
 assert.equal(s.hg18.materials.resource_card,1);
 assert.throws(()=>E.claimHG18Task(s,'daily','daily_build'),/Đã nhận/);
 const lim=E.limits(s);s.res.gold=lim.gold;
 const snapshot=JSON.stringify(s);assert.throws(()=>E.openHG18Pack(s,'resource_card'),/Kho/);
 assert.equal(JSON.stringify(s),snapshot,'Failed pack must not debit');
 for(const k of C.keys)s.res[k]=0;
 const got=E.openHG18Pack(s,'resource_card');
 assert.equal(got.gold,600);assert.equal(s.res.gold,600);assert.equal(s.hg18.materials.resource_card,0);
 assert(E.strictSave(save(s)));
 return {gold:600,cardUsedOnce:true};
});
test('Weekly completion payout is claim-only, and only quest claims can grant the special soldier',()=>{
 const s=starter();const unit=C.rewardUnits.human[0],initial=s.army[unit.id]||0;
 s.hg18.week.counts.eliteWins=1; // endgame test fixture; no cheating in organic QA
 assert(E.hg18Tasks(s,'weekly').find(x=>x.id==='weekly_boss').ready);
 assert.equal(s.army[unit.id]||0,initial);
 const reward=E.claimHG18Task(s,'weekly','weekly_boss');
 assert.equal(reward.specialSoldier,1);assert.equal(s.army[unit.id],initial+1);
 assert.equal(s.hg18.materials.rebirth_core,1);assert.equal(s.hg18.materials.astral_shard,3);
 assert.throws(()=>E.claimHG18Task(s,'weekly','weekly_boss'),/Đã nhận/);
 assert.throws(()=>E.recruit(s,unit.id,1),/chỉ nhận qua nhiệm vụ/);
 E.setFormation(s,[{unitId:unit.id,count:1}]);assert.equal(s.formation[0].count,1);
 assert(E.strictSave(save(s)));
 return {unitId:unit.id,owned:s.army[unit.id],commandCost:E.unitValue(unit)};
});
test('Gear pack sequence, 3-piece ordinary set and 3-piece rare crafted set are deterministic',()=>{
 const s=starter();s.hg18.materials.gear_pack=2;s.hg18.materials.set_chest=3;s.hg18.materials.astral_shard=24;
 const common1=E.openHG18Pack(s,'gear_pack'),common2=E.openHG18Pack(s,'gear_pack');
 assert.equal(common1.itemId,'copper_blade');assert.equal(common2.itemId,'iron_armor');
 const commonSet=Array.from({length:3},()=>E.openHG18Pack(s,'set_chest'));
 assert.deepEqual(commonSet.map(i=>i.itemId),['sentinel_sword','sentinel_plate','sentinel_seal']);
 for(const i of commonSet)E.equipItem(s,i.uid);
 assert.equal(E.hg18SetCounts(s,1).sentinel,3);
 assert(E.combatModifiers(s).damageReduction>=.025);
 const rareSet=Array.from({length:3},()=>E.craftHG18(s,'astral'));
 assert.deepEqual(rareSet.map(i=>i.itemId),['astral_sword','astral_plate','astral_seal']);
 assert.equal(s.hg18.materials.astral_shard,0);
 for(const i of rareSet)E.equipItem(s,i.uid);
 assert.equal(E.hg18SetCounts(s,1).astral,3);
 const mods=E.combatModifiers(s);assert(mods.damageBonus>=.07&&mods.damageReduction>=.05);
 assert.throws(()=>E.craftHG18(s,'astral'),/Cần 8 mảnh/);
 assert.throws(()=>E.buyItem(s,'astral_sword'),/không bán/);
 const parsed=save(s);assert.equal(parsed.hg18.craftSeq,3);assert.equal(E.hg18SetCounts(parsed,1).astral,3);
 return {common:commonSet.map(i=>i.itemId),crafted:rareSet.map(i=>i.itemId),mods};
});
test('Equipment +1..+10 spends exact stones/gold, improves real Hero stats and survives Save',()=>{
 const s=starter();s.hg18.materials.enhance_stone=110;s.res.gold=E.limits(s).gold;
 const gear=E.addItem(s,'sentinel_sword','focus test');E.equipItem(s,gear.uid);
 const raw=E.heroStats(s).atk,baseGold=s.res.gold;
 let cost=0;for(let lv=0;lv<10;lv++){const expected=2+2*lv;cost+=250*(lv+1);
  assert.equal(E.enhanceHG18(s,gear.uid),lv+1);
  assert.equal(s.hg18.materials.enhance_stone,110-(lv+1)*(lv+2));
  assert.equal(gear.enhance,lv+1);
 }
 assert.equal(s.res.gold,baseGold-cost);assert(E.heroStats(s).atk>raw);
 assert.throws(()=>E.enhanceHG18(s,gear.uid),/cường hóa \+10/);
 const loaded=save(s);assert.equal(loaded.inventory.find(i=>i.uid===gear.uid).enhance,10);
 return {enhance:10,stonesConsumed:110,goldConsumed:cost,attackIncrease:E.heroStats(s).atk-raw};
});
test('Hero rank needs real levels; reset returns spent points once and rebirth 100 resets level while retaining growth',()=>{
 const s=starter(),h=s.heroes[0];
 s.hg18.materials.rank_emblem=1;s.hg18.materials.hero_reset=1;s.hg18.materials.rebirth_core=1;
 assert.throws(()=>E.rankHG18Hero(s,h.id),/cấp 20/);
 h.level=20;h.statPoints=3;
 const baseAtk=h.atk;E.allocateHeroPoint(s,h.id,'atk');E.allocateHeroPoint(s,h.id,'def');
 assert.equal(h.statPoints,1);
 const returned=E.resetHG18Hero(s,h.id);assert.equal(returned,2);assert.equal(h.atk,baseAtk);
 assert.equal(h.statPoints,3);assert.throws(()=>E.resetHG18Hero(s,h.id),/Thiếu thẻ|chưa phân phối/);
 assert.equal(E.rankHG18Hero(s,h.id),2);
 assert(E.heroStats(s).atk>h.atk);
 h.level=100;h.statPoints=99;const beforeRebirth={...h.hg18Base},beforeGold=s.res.gold;
 assert.equal(E.rebirthHG18Hero(s,h.id),1);
 assert.equal(h.level,1);assert.equal(h.xp,0);assert.equal(h.statPoints,0);
 assert.equal(h.heroRank,2);assert.equal(h.rebirth,1);
 assert.equal(h.atk,beforeRebirth.atk);assert.equal(s.res.gold,beforeGold-5000);
 assert(E.heroStats(s).atk>h.atk);assert.throws(()=>E.rebirthHG18Hero(s,h.id),/cấp 100/);
 const after=save(s);assert.equal(after.heroes[0].rebirth,1);assert.equal(after.heroes[0].heroRank,2);
 return {rebirth:1,rank:2,level:1,resetReturned:returned};
});
test('Endgame boss victory creates exact-once shard and weekly progress without battle reward replay',()=>{
 const s=starter();const tile=E.TILES.find(t=>t.eliteTier===11),unit=E.getUnit(s,'human_10');
 s.heroes[0].level=100;s.army[unit.id]=800;s.formation=[{unitId:unit.id,count:800}];
 const b=E.makeBattle(s,tile.key);s.battle=b;
 // Not a no-cheat scenario: 800 Archangels are a deliberately synthetic
 // fixture. Combat executes real stats against actual HG18 T11 defenders.
 let result;for(let i=0;i<70&&s.battle;i++)result=E.battleAct(s,'attack');
 assert.equal(result.type,'win','Hero100 endgame battle should finish');
 assert.equal(E.hg18Tasks(s,'weekly').find(x=>x.id==='weekly_boss').progress,1);
 assert.equal(s.hg18.materials.astral_shard,2);assert.equal(s.hg18.materials.enhance_stone,2);
 assert.equal(s.hg18.victories,1);
 const copy=save(s);assert.equal(copy.hg18.victories,1);assert.equal(copy.hg18.materials.astral_shard,2);
 return {target:tile.key,turns:b.turn-1,shards:2,stones:2};
});
test('UTC day/week reset is deterministic; credits and old claims never carry into new period',()=>{
 const s=starter();s.hg18.day.counts.npcWins=3;s.hg18.week.counts.npcWins=7;
 s.hg18.day.claimed.push('daily_npc');s.hg18.week.claimed.push('weekly_npc');
 const beforeWeek=s.hg18.week.key;const beforeDay=s.hg18.day.key;
 E.tick(s,s.lastTick+9*86400000);
 assert.notEqual(s.hg18.day.key,beforeDay);assert.notEqual(s.hg18.week.key,beforeWeek);
 assert.equal(s.hg18.day.counts.npcWins,0);assert.equal(s.hg18.week.counts.npcWins,0);
 assert.equal(s.hg18.day.claimed.length,0);assert.equal(s.hg18.week.claimed.length,0);
 const loaded=save(s);assert.equal(loaded.hg18.day.key,s.hg18.day.key);
 return {day:s.hg18.day.key,week:s.hg18.week.key};
});
test('Corrupted HG18 material, over-enhanced item, invalid rank and duplicate task claim are rejected',()=>{
 const s=starter();const tests=[
  v=>v.hg18.materials.astral_shard=-1,
  v=>v.hg18.day.claimed=['daily_npc','daily_npc'],
  v=>v.heroes[0].heroRank=6,
  v=>v.heroes[0].rebirth=-1,
  v=>{v.inventory.push({uid:123456,itemId:'copper_blade',enhance:11})}
 ];
 for(const fn of tests){const copy=E.clone(s);fn(copy);assert.equal(E.strictSave(copy),false);assert.throws(()=>E.parseSave(JSON.stringify(copy)));}
 return {corruptionsRejected:tests.length};
});
test('All 40 classic units have an actually playable training route at maximum legal research/buildings',()=>{
 let trained=0;const unavailable=[];
 for(const race of ['human','elf','orc','undead'])for(const troop of C.units[race]){
  const s=starter(race);
  for(const key of Object.keys(s.buildings))s.buildings[key]=10;
  for(const key of Object.keys(C.spells))s.spells[key]=10;
  for(const key of C.keys)s.res[key]=E.limits(s)[key];
  const gate=E.troopPrerequisites(s,troop);
  if(!gate.available){unavailable.push({unit:troop.id,unmet:gate.unmet});continue;}
  const before=s.army[troop.id]||0,beforeRes={...s.res},cost=E.recruitCost(s,troop,1);
  E.recruit(s,troop.id,1);
  for(const key of C.keys)assert(Math.abs(s.res[key]-(beforeRes[key]-cost[key]))<1e-5,troop.id+' cost '+key);
  advance(s,s.training[0].remaining+1);
  assert.equal(s.army[troop.id],before+1);
  assert.equal(s.training.length,0);assert(E.strictSave(save(s)));
  trained++;
 }
 assert.deepEqual(unavailable,[],'Original player catalog must remain reachable by actual construction/research gates');
 assert.equal(trained,40);
 return {trained,unavailable};
});
test('2,000-equipment PvE loot cap does not corrupt save; salvage frees slots with deterministic materials',()=>{
 const s=starter();const first=E.addItem(s,'iron_armor','salvage QA');
 E.equipItem(s,first.uid);assert.throws(()=>E.salvageHG18(s,first.uid),/tháo/);
 E.unequipItem(s,'armor');
 const earned=E.salvageHG18(s,first.uid);assert.equal(earned.stones,1);
 assert(!s.inventory.some(i=>i.uid===first.uid));assert.equal(s.hg18.materials.enhance_stone,1);
 assert.throws(()=>E.salvageHG18(s,first.uid),/không tồn tại/);
 while(s.inventory.length<2000)E.addItem(s,'copper_blade','capacity fixture');
 assert(E.strictSave(s),'2,000 items must be valid');
 const beforeGold=s.res.gold;
 assert.throws(()=>E.buyItem(s,'copper_blade'),/Túi trang bị đầy/);
 assert.equal(s.res.gold,beforeGold);
 s.army.human_1=40;
 const t=E.TILES.find(q=>q.kind==='npc'&&q.level===1);
 const b=E.makeBattle(s,t.key);
 s.battle=b;
 for(const e of b.enemies){e.hp=1;e.count=1;e.pool=1;e.atk=0;e.def=0;}
 for(const a of b.allies){a.x=9;a.y=2;a.range=11;}
 let result;for(let i=0;i<10&&s.battle;i++)result=E.battleAct(s,'attack');
 assert.equal(result.type,'win');
 assert.equal(s.inventory.length,2000,'No PvE item can exceed the hard inventory cap');
 assert(E.strictSave(save(s)));
 const uid=s.inventory[0].uid;E.salvageHG18(s,uid);
 assert.equal(s.inventory.length,1999);
 return {bagLimit:2000,salvageStones:earned.stones,save:'valid'};
});
test('Rare shard/stone bags at cap cannot turn a won boss encounter into an invalid Save',()=>{
 const s=starter();s.hg18.materials.astral_shard=1e6;s.hg18.materials.enhance_stone=1e6;
 const target=E.TILES.find(t=>t.eliteTier===11),u=E.getUnit(s,'human_10');
 s.heroes[0].level=100;s.army[u.id]=800;s.formation=[{unitId:u.id,count:800}];
 const b=E.makeBattle(s,target.key);s.battle=b;
 let result;for(let i=0;i<70&&s.battle;i++)result=E.battleAct(s,'attack');
 assert.equal(result.type,'win');
 assert.equal(s.hg18.materials.astral_shard,1e6);assert.equal(s.hg18.materials.enhance_stone,1e6);
 assert.equal(s.hg18.week.counts.eliteWins,1);assert(E.strictSave(save(s)));
 return {lootBag:'full',combat:'win',save:'valid'};
});
test('Seven daily production cycles retain five bounded resources without one-call multi-day offline exploit',()=>{
 const stats=[];
 for(const race of ['human','elf','orc','undead']){
  const s=starter(race);s.speed=1;
  const start={...s.res},rate={...E.rate(s)},limits={...E.limits(s)};
  for(let day=1;day<=7;day++){
   advance(s,86400);
   for(const key of C.keys){
    const want=Math.min(limits[key],start[key]+rate[key]*24*day);
    assert(Math.abs(s.res[key]-want)<.01,race+' day '+day+' '+key);
   }
   assert(E.strictSave(s));
  }
  const once=JSON.stringify(s);E.tick(s,s.lastTick);assert.equal(JSON.stringify(s),once);
  stats.push({race,final:{...s.res}});
 }
 return {days:7,races:stats.map(r=>r.race),sample:stats[0].final};
});
const dir=path.join(__dirname,'docs','qa','hg18');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'core-progression.json'),JSON.stringify({phase:'HG18',passed:pass,failed:fail,checks},null,2));
console.log('HG18 CORE '+pass+'/'+(pass+fail)+' PASS');
if(fail)process.exitCode=1;
