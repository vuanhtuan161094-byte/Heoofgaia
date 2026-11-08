/* HG40.4 fast balance audit — actual core outcomes, four races, 40 unit IDs,
   real NPC camp/Boss/Tower targets. NO fake victories, no arbitrary strength
   balancing. Reports only gross imbalances for owner review.
   Benchmarks are controlled roster fixtures, NOT organic economic progression.
*/
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console});
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js'.split(' ');
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,races=['human','elf','orc','undead'];
const scenarios=[],flags=[],errors=[],targetByStars={};
for(const camp of E.NPC_CAMPS_2009||[])if(!targetByStars[camp.stars])targetByStars[camp.stars]=camp;
const boss=E.TILES.find(x=>x.kind==='npc'&&x.privateBoss);
assert(boss,'Private-world boss source missing');
function execute(s,kind,beforeStock,unitId,cap=70){
 const battle=s.battle;assert(battle&&battle.hg40?.v===1,kind+' must be HG40 canonical engine');
 assert(battle.allies.length>=1&&battle.enemies.length>=1);
 let n=0,turns=0,outcome='pending',dealt=0,lost=0,notes=0;
 while(s.battle&&n<cap){
  const b=s.battle,before=b.turn;
  const event=E.battleActCore(s,'attack',{stableTargets:true});
  n++;turns=n;dealt+=event.dealt||0;lost+=event.lost||0;
  assert(Number.isFinite(dealt)&&Number.isFinite(lost)&&dealt>=0&&lost>=0,'bad finite damage receipt');
  notes+=(b.hg40?.lastSkills||[]).filter(x=>x.turn===before).length;
  if(event.type!=='continue')outcome=event.type;
 }
 assert(!s.battle||n<70,kind+' exceeded 70-round core limit');
 assert(['win','lose','timeout'].includes(outcome),kind+' unresolved '+outcome);
 const initial=battle.allies.reduce((sum,u)=>sum+u.initial,0),
       survivors=battle.allies.reduce((sum,u)=>sum+Math.max(0,u.count),0),
       casualties=initial-survivors;
 assert(casualties>=0&&survivors<=initial,kind+' minted soldiers');
 if(kind==='tower' || kind==='tower-3x2'){
  assert.equal(s.army[unitId],beforeStock,'Tower projected soldiers cannot mutate garrison');
 }else{
  assert((s.army[unitId]||0)<=beforeStock,'NPC/Boss battle minted unit inventory');
 }
 assert.equal(s.version,7,'Save v07 version changed');
 assert(E.strictSave(s),'Save v07 invalid after '+kind);
 return {outcome,turns,initial,survivors,lossPct:+(initial?100*casualties/initial:0).toFixed(2),
   dealt,lost,skillNotes:notes,save:7,stacks:battle.allies.length,enemies:battle.enemies.length};
}
function npcScenario(race,tier,ratio,target,kind='npc'){
 const unit=C.units[race][tier-1],s=E.make(race,1000000);
 s.heroes[0].level=Math.min(100,tier*10);
 const legal=Math.floor(E.heroLimit(s.heroes[0].level)/E.unitValue(unit));
 assert(legal>=1,'No hero command capacity '+unit.id);
 const count=Math.max(1,Math.min(legal,Math.floor(legal*ratio)));
 s.army[unit.id]=count;
 E.setFormation(s,[{unitId:unit.id,count}]);
 s.battle=E.makeBattle(s,target.key);
 assert.equal(s.battle.allies.length,1,'Single-unit roster required');
 const result=execute(s,kind,count,unit.id);
 return {kind,race,tier,unitId:unit.id,ratio,heroLevel:s.heroes[0].level,
  encounter:kind==='boss'?'real-world-Boss-T13':'real-NPC-'+target.stars+'star',
  troops:count,...result};
}
function towerScenario(race,tier,ratio,floor,threeHero=false){
 const unit=C.units[race][tier-1],s=E.make(race,1000000);
 const level=Math.min(100,tier*10);
 s.hg20.tower.floor=floor;
 // Rank grows only as a controlled fixture. No premium stat seeding.
 s.hg20.tower.rank=Math.min(100,Math.max(1,Math.round(floor*1.8)));
 const initialHero=JSON.parse(JSON.stringify(s.heroes[0]));
 if(threeHero)for(let id=2;id<=3;id++)
  s.heroes.push({...JSON.parse(JSON.stringify(initialHero)),id,name:race+' benchmark hero '+id});
 const heroes=threeHero?[1,2,3]:[1];
 const limit=Math.floor(E.heroLimit(level)/E.unitValue(unit));
 const per=Math.max(1,Math.floor(limit*ratio/(threeHero?2:1)));
 let total=per*(threeHero?6:1);
 s.army[unit.id]=total;
 for(const id of heroes){
  s.heroes.find(h=>h.id===id).level=level;
  E.hg20SetHeroPlan(s,id,threeHero?[{unitId:unit.id,count:per},{unitId:unit.id,count:per}]:[{unitId:unit.id,count:per}]);
 }
 E.hg20ChooseTowerTeam(s,heroes);
 if(threeHero)E.hg21SetTowerPicks(s,heroes.map(heroId=>({heroId,slots:[0,1]})));
 const ready=E.hg21TowerReadiness(s);assert(ready.ready,JSON.stringify(ready));
 const entry=E.hg21TowerEnter(s);
 assert.equal(entry.stacks,threeHero?6:1);assert.equal(entry.heroes,heroes.length);
 const result=execute(s,threeHero?'tower-3x2':'tower',total,unit.id);
 return {kind:threeHero?'tower-3x2':'tower',race,tier,unitId:unit.id,
  floor,ratio,rank:s.hg20.tower.rank,heroLevel:level,heroes:heroes.length,
  legalCommandCapacity:limit,rosterTotal:total,...result};
}
function record(call,details){
 try{const r=call();scenarios.push(r);return r;}
 catch(error){errors.push({details,error:String(error.stack||error)});return null;}
}
for(const race of races){
 for(let tier=1;tier<=10;tier++){
  const realNpc=targetByStars[Math.min(tier,9)];
  assert(realNpc,'Real NPC not found for tier '+tier);
  for(const ratio of [.25,.60,.95])
   record(()=>npcScenario(race,tier,ratio,realNpc),{kind:'npc',race,tier,ratio});
 }
}
for(const race of races){
 for(const ratio of [.4,.7,.95])
  record(()=>npcScenario(race,10,ratio,boss,'boss'),{kind:'boss',race,ratio});
 for(const [tier,floor] of [[1,1],[5,15],[10,35]])
  for(const ratio of [.45,.85])
   record(()=>towerScenario(race,tier,ratio,floor),{kind:'tower',race,tier,floor,ratio});
 record(()=>towerScenario(race,10,.65,35,true),{kind:'tower-3x2',race});
}
const expected=120+12+24+4;
assert.equal(scenarios.length+errors.length,expected,'scenario matrix size mismatch');
const count=(arr,k,v)=>arr.filter(x=>x[k]===v).length;
const mean=(rows,key)=>+(rows.reduce((n,r)=>n+r[key],0)/Math.max(1,rows.length)).toFixed(2);
const allGroups=[],highlights=[];
for(const kind of ['npc','boss','tower','tower-3x2']){
 const filtered=scenarios.filter(x=>x.kind===kind);
 const keys=[...new Set(filtered.map(x=>kind==='npc'?x.tier:kind==='boss'?'boss':kind==='tower'?x.floor:'tower-3x2'))];
 for(const key of keys){
  const cells=races.map(race=>{
   const rows=filtered.filter(x=>x.race===race&&(kind==='npc'?x.tier===key:kind==='boss'?true:kind==='tower'?x.floor===key:true));
   return {race,tests:rows.length,wins:count(rows,'outcome','win'),losses:count(rows,'outcome','lose'),
    timeouts:count(rows,'outcome','timeout'),winPct:+(100*count(rows,'outcome','win')/Math.max(1,rows.length)).toFixed(1),
    avgLossPct:mean(rows,'lossPct'),avgTurns:mean(rows,'turns'),avgDealt:mean(rows,'dealt')};
  });
  const wins=cells.map(x=>x.winPct),losses=cells.map(x=>x.avgLossPct);
  const winGap=Math.max(...wins)-Math.min(...wins),casualtyGap=Math.max(...losses)-Math.min(...losses);
  // Only detect obvious faction disparity within the SAME encounter and
  // troop tier; boss T13 must not be compared with NPC T9 or Tower floor 35.
  const gross=winGap>=67||(winGap>=34&&casualtyGap>=45);
  const note={kind,key,cells,winGap,casualtyGap,flag:gross?'SEVERE_FACTION_GAP':'NO_LARGE_GAP'};
  allGroups.push(note);
  if(gross)flags.push({kind,key,winGap,casualtyGap});
 }
}
const report={
 schema:'HG40.4-Quick-Canonical-Balance-v1',
 status:errors.length?'FAIL':'PASS',
 ownerIntent:'Fast audit; only correct egregious faction disparities, preserve powerful combat pacing',
 benchmark:'Controlled synthetic legal command-cap rosters; original canonical E.makeBattle/E.hg21TowerEnter/E.battleActCore; no mocked damage or rewards',
 limitations:['T10 NPC uses real 9-star camp because 10-star camp is unavailable; treat T10 Boss T13 as a separate stronger category.',
  'Tower tests contain rank/level fixtures and are not proof of organic multi-month progression.',
  'Each per-race NPC tier has only three samples: flags identify gross gaps, not statistical significance.',
  'No 40x40 duel matrix or monetization balancing is claimed.'],
 totalExpected:expected,totalCompleted:scenarios.length,errors,
 totalUnits:[...new Set(scenarios.filter(s=>s.kind==='npc').map(s=>s.unitId))].length,
 races,sourceSaveVersion:E.V,
 groups:allGroups,severeFlags:flags,scenarios,
 summary:{npc:count(scenarios,'kind','npc'),worldBoss:count(scenarios,'kind','boss'),
   tower:count(scenarios,'kind','tower'),tower3x2:count(scenarios,'kind','tower-3x2'),
   alerts:flags.length}
};
const out=path.join(__dirname,'docs/qa/hg40/balance-quick-40x4-boss-tower.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const g of allGroups)console.log('HG40.4 '+g.kind+' '+g.key+' winGap='+g.winGap+
  'pp casualtyGap='+g.casualtyGap+'pp '+(g.flag==='SEVERE_FACTION_GAP'?'REVIEW':'OK')+
  ' | '+g.cells.map(x=>x.race+':'+x.wins+'/'+x.tests+' '+x.avgLossPct+'%loss').join(' '));
for(const x of errors)console.error('HG40.4 ERROR '+JSON.stringify(x));
console.log('HG40.4 '+scenarios.length+'/'+expected+' canonical combat simulations, '+flags.length+' potential severe faction gaps, '+errors.length+' errors');
if(errors.length)process.exitCode=1;
