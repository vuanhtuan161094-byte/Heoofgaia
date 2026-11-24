import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createNewGame, doAction, migrateSave, productionPerHour, questProgress, storageCapacity } from '../src/engine.js';
import { HEROES, IMMORTAL_MOUNTAINS, ITEMS, QUESTS, WORLD_NODES } from '../src/catalog.js';

test('new save has a bounded, offline-first settlement', () => {
  const now = 1_800_000_000_000;
  const state = createNewGame('Tây Kỳ',now);
  const result = advance(state,now+10*60*60*1000);
  assert.equal(result.offlineCapped,true);
  assert.equal(result.elapsedSeconds,8*60*60);
  assert.ok(result.state.resources.food>=0);
  assert.ok(result.state.resources.food<=storageCapacity(result.state));
  assert.ok(productionPerHour(result.state).food>0);
});

test('construction and training are queued and settle once', () => {
  const base=1_800_000_000_000;
  let state=createNewGame('Triều Ca',base);
  state=doAction(state,{type:'upgrade',buildingId:'lumber'},base+1);
  assert.equal(state.levels.lumber,0);
  const buildDone=state.queues.construction.finishAt;
  state=advance(state,buildDone+2).state;
  assert.equal(state.levels.lumber,1);
  assert.equal(state.queues.construction,null);
  state=doAction(state,{type:'train',troopId:'troop-01',count:5},buildDone+3);
  const trainDone=state.queues.training.finishAt;
  state=advance(state,trainDone+1).state;
  assert.equal(state.army['troop-01'],23);
  state=advance(state,trainDone+10).state;
  assert.equal(state.army['troop-01'],23);
});

test('recruitment, gear, campaign battle and save migration stay connected', () => {
  const base=1_800_000_000_000;
  let state=createNewGame('Triều Ca',base);
  state.levels.altar=1;
  state=doAction(state,{type:'recruit',heroId:'hero-02'},base+1);
  assert.equal(state.heroes.length,2);
  state=doAction(state,{type:'equip',heroId:'hero-01',itemId:'item-01'},base+2);
  assert.equal(state.heroes[0].equipment.weapon,'item-01');
  state=doAction(state,{type:'march',nodeId:'node-001',troopId:'troop-01',count:8},base+3);
  const arrival=state.queues.march.finishAt;
  state=advance(state,arrival+1).state;
  assert.equal(state.stats.battles,1);
  assert.equal(state.reports.length,1);
  const totalReturned=Object.values(state.army).reduce((n,x)=>n+x,0)+Object.values(state.wounded).reduce((n,x)=>n+x,0);
  assert.ok(totalReturned<=18);
  state=advance(state,arrival+5_000).state;
  assert.equal(state.stats.battles,1);
  const imported=migrateSave(JSON.parse(JSON.stringify(state)),arrival+6_000);
  assert.equal(imported.version,1);
  assert.equal(imported.reports.length,1);
});

test('unaffordable actions do not create negative resources', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.resources.food=0;
  assert.throws(()=>doAction(state,{type:'train',troopId:'troop-01',count:10},now+1),/Tài nguyên chưa đủ/);
  assert.equal(state.resources.food,0);
});

test('captured NPC cities become productive offline settlements', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.army['troop-01']=5000;
  const before=productionPerHour(state).food;
  state=doAction(state,{type:'march',nodeId:'node-001',troopId:'troop-01',count:1200},now+1);
  const arrival=state.queues.march.finishAt;
  state=advance(state,arrival+1).state;
  assert.equal(state.stats.citiesCaptured,1);
  assert.equal(state.cities.length,2);
  assert.ok(state.population>180);
  assert.ok(productionPerHour(state).food>=before+25);
});

test('save import normalizes malformed inventory and retains named cities', () => {
  const imported=migrateSave({
    version:1,profile:{name:'  Tây Kỳ  '},resources:{food:-100,unknown:999},levels:{citadel:500},
    technologies:{},heroes:[null,{id:'not-a-hero',level:999}],items:['not-an-item'],army:{alien:100},
    settings:{sound:'yes',autosave:0},world:{captures:['not-a-node'],treaties:[],scouted:[]}
  },1_800_000_000_000);
  assert.equal(imported.profile.name,'Tây Kỳ');
  assert.equal(imported.resources.food,0);
  assert.equal(imported.resources.unknown,undefined);
  assert.equal(imported.levels.citadel,30);
  assert.deepEqual(imported.heroes,[]);
  assert.deepEqual(imported.army,{});
  assert.deepEqual(imported.world.captures,[]);
  assert.equal(imported.cities[0].isCapital,true);
  assert.equal(imported.settings.sound,false);
  assert.equal(imported.settings.autosave,true);
});

test('NPC alliance improves market fees and all world labels are unique', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.levels.embassy=1;
  const amountBefore=state.resources.gold;
  state=doAction(state,{type:'guild'},now+1);
  assert.equal(state.world.guildLevel,1);
  assert.ok(state.resources.gold<amountBefore);
  assert.equal(new Set(WORLD_NODES.map(node=>node.name)).size,120);
});

test('combined army orders accept multiple troop roles and settle each stack', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.army['troop-02']=20;
  state.army['troop-10']=20;
  state=doAction(state,{type:'march',nodeId:'node-001',troops:{'troop-02':8,'troop-10':7}},now+1);
  assert.deepEqual(state.queues.march.troops,{'troop-02':8,'troop-10':7});
  assert.equal(state.army['troop-02'],12);
  assert.equal(state.army['troop-10'],13);
  state=advance(state,state.queues.march.finishAt+1).state;
  const total=Object.values(state.army).reduce((n,x)=>n+x,0)+Object.values(state.wounded).reduce((n,x)=>n+x,0);
  assert.ok(total<=58);
});


test('final boss is gated and a first victory records the campaign ending', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  assert.throws(()=>doAction(state,{type:'march',nodeId:'node-120',troopId:'troop-01',count:1},now+1),/20 trận thắng và 7 danh thành/);
  state.stats.victories=20;
  state.stats.citiesCaptured=7;
  state.world.captures=WORLD_NODES.filter(n=>n.kind==='Danh thành').slice(0,7).map(n=>n.id);
  state.army['troop-01']=6000;
  state=doAction(state,{type:'march',nodeId:'node-120',troopId:'troop-01',count:5000},now+2);
  const arrival=state.queues.march.finishAt;
  state=advance(state,arrival+1).state;
  assert.equal(state.world.campaignComplete,true);
  assert.equal(state.stats.bossesDefeated,1);
  assert.equal(state.world.storyStage,24);
  assert.equal(state.reports[0].campaignEnding,true);
  assert.equal(questProgress(state,QUESTS.at(-1)),1);
  state=doAction(state,{type:'march',nodeId:'node-120',troopId:'troop-01',count:500},arrival+2);
  state=advance(state,state.queues.march.finishAt+1).state;
  assert.equal(state.stats.bossesDefeated,1);
  assert.equal(state.reports[0].campaignEnding,false);
});



test('full simulated catalogs expose the requested runtime coverage', () => {
  for(const [rows,count] of [[HEROES,540],[ITEMS,2155],[QUESTS,1158],[IMMORTAL_MOUNTAINS,624]]){
    assert.equal(rows.length,count);
    assert.equal(new Set(rows.map(row=>row.id)).size,count);
    assert.ok(rows.every(row=>row.evidence==='SIMULATED'));
  }
});

test('generated consumables apply their recorded effect and Tiên Sơn challenges settle', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.items.push('item-0022');
  const foodBefore=state.resources.food;
  state=doAction(state,{type:'useItem',itemId:'item-0022'},now+1);
  assert.ok(Math.abs(state.resources.food-(foodBefore+223))<0.01);
  state.heroes[0].level=60;
  state=doAction(state,{type:'duel',mode:'mountain',mountainId:'mountain-001'},now+2);
  assert.equal(state.stats.duels,1);
  assert.equal(state.world.mountainWins.includes('mountain-001'),true);
  assert.match(state.reports[0].target,/Tiên Sơn 1/);
});
