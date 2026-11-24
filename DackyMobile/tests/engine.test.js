import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, armyPower, createNewGame, doAction, heroPower, migrateSave, productionPerHour, questProgress, storageCapacity } from '../src/engine.js';
import { HEROES, IMMORTAL_MOUNTAINS, ITEMS, QUESTS, TECHNOLOGIES, TROOPS, WORLD_NODES } from '../src/catalog.js';

test('new save has a bounded, offline-first settlement', () => {
  const now = 1_800_000_000_000;
  const state = createNewGame('Tây Kỳ',now);
  const result = advance(state,now+10*60*60*1000);
  assert.equal(result.offlineCapped,true);
  assert.equal(result.elapsedSeconds,8*60*60);
  assert.ok(result.state.resources.food>=0);
  assert.ok(result.state.resources.food<=storageCapacity(result.state));
  assert.ok(productionPerHour(result.state).food>0);
  assert.equal(state.taxPolicy,'balanced');
});

test('tax policy balances gold income, morale and population growth', () => {
  const now=1_800_000_000_000;
  const state=createNewGame('Triều Ca',now);
  const balancedGold=productionPerHour(state).gold;
  const heavy=doAction(state,{type:'setTaxPolicy',policy:'heavy'},now+1);
  assert.ok(productionPerHour(heavy).gold>balancedGold);
  const heavyRest=advance(heavy,now+8*60*60*1000).state;
  assert.ok(heavyRest.morale<state.morale);
  const relief=doAction(state,{type:'setTaxPolicy',policy:'relief'},now+1);
  assert.ok(productionPerHour(relief).gold<balancedGold);
  const reliefRest=advance(relief,now+8*60*60*1000).state;
  assert.ok(reliefRest.morale>state.morale);
  assert.ok(reliefRest.population>state.population);
  assert.throws(()=>doAction(state,{type:'setTaxPolicy',policy:'free-money'},now+1),/chính sách thuế/);
});

test('completed academy research changes the linked economy', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.levels.academy=1;
  const goldBefore=productionPerHour(state).gold;
  state=doAction(state,{type:'research',techId:'tech-05'},now+1);
  const finish=state.queues.research.finishAt;
  state=advance(state,finish+1).state;
  assert.equal(state.technologies['tech-05'],1);
  assert.ok(productionPerHour(state).gold>goldBefore);
  assert.equal(state.queues.research,null);
  assert.equal(TECHNOLOGIES.length,19);
  for(const [techId,resource] of [['tech-01','food'],['tech-02','timber'],['tech-03','stone'],['tech-04','iron'],['tech-07','food']]){
    const isolated=createNewGame('Triều Ca',now);
    const before=productionPerHour(isolated)[resource];
    isolated.technologies[techId]=1;
    assert.ok(productionPerHour(isolated)[resource]>before,`${techId} must improve ${resource}`);
  }
});

test('specialized research improves troops, heroes, healing, scouting and combat', () => {
  const now=1_800_000_000_000;
  const base=createNewGame('Triều Ca',now);
  const cavalry=TROOPS.find(t=>t.role==='kỵ binh').id;
  const archers=TROOPS.find(t=>t.role==='xạ thủ').id;
  const cavalryState=structuredClone(base);
  cavalryState.army={[cavalry]:100};
  const cavalryPower=armyPower(cavalryState);
  cavalryState.technologies['tech-12']=10;
  assert.ok(armyPower(cavalryState)>cavalryPower);
  const archerState=structuredClone(base);
  archerState.army={[archers]:100};
  const archerPower=armyPower(archerState);
  archerState.technologies['tech-13']=10;
  assert.ok(armyPower(archerState)>archerPower);
  const generalArmy=structuredClone(cavalryState);
  generalArmy.technologies['tech-12']=0;const noGeneral=armyPower(generalArmy);
  generalArmy.technologies['tech-10']=10;
  assert.ok(armyPower(generalArmy)>noGeneral);
  const heroBaseline=heroPower(base.heroes[0],base);
  const heroResearch=structuredClone(base);
  heroResearch.technologies['tech-17']=10;
  assert.ok(heroPower(base.heroes[0],heroResearch)>heroBaseline);

  const makeBattle=(techId,level=0)=>{
    let state=structuredClone(base);
    state.army={'troop-01':1000,'troop-10':100};
    if(techId)state.technologies[techId]=level;
    state=doAction(state,{type:'march',nodeId:'node-001',troops:{'troop-01':500,'troop-10':100}},now+1);
    return advance(state,state.queues.march.finishAt+1).state.reports[0];
  };
  const unresearched=makeBattle(null);
  assert.ok(makeBattle('tech-11',10).rounds[0].enemyDamage<unresearched.rounds[0].enemyDamage);
  assert.ok(makeBattle('tech-15',10).ownPower>unresearched.ownPower);

  const heal=(level)=>{
    const state=structuredClone(base);
    state.resources.food=5000;state.resources.gold=5000;
    state.wounded={'troop-01':100};state.technologies['tech-14']=level;
    const before=state.resources.food;
    const result=doAction(state,{type:'heal'},now+1);
    return before-result.resources.food;
  };
  assert.ok(heal(10)<heal(0));
  const scout=(level)=>{
    const state=structuredClone(base);
    state.technologies['tech-18']=level;
    const before=state.resources.gold;
    const result=doAction(state,{type:'scout',nodeId:'node-001'},now+1);
    return before-result.resources.gold;
  };
  assert.ok(scout(10)<scout(0));

  const trained=(level)=>{
    const state=structuredClone(base);
    state.technologies['tech-09']=level;
    return doAction(state,{type:'train',troopId:'troop-01',count:1},now+1).queues.training.finishAt;
  };
  assert.ok(trained(10)<trained(0));

  const population=(level)=>{
    const state=structuredClone(base);state.technologies['tech-06']=level;
    return advance(state,now+60*60*1000).state.population;
  };
  assert.ok(population(10)>population(0));
  const construction=(level)=>{
    const state=structuredClone(base);state.technologies['tech-08']=level;
    return doAction(state,{type:'upgrade',buildingId:'lumber'},now+1).queues.construction.finishAt;
  };
  assert.ok(construction(10)<construction(0));
  const researchSpeed=(level)=>{
    const state=structuredClone(base);state.levels.academy=1;state.technologies['tech-08']=level;
    return doAction(state,{type:'research',techId:'tech-05'},now+1).queues.research.finishAt;
  };
  assert.ok(researchSpeed(10)<researchSpeed(0));
  const march=(level)=>{
    const state=structuredClone(base);state.army={'troop-01':1000};state.technologies['tech-16']=level;
    return doAction(state,{type:'march',nodeId:'node-001',troopId:'troop-01',count:500},now+1).queues.march.finishAt;
  };
  assert.ok(march(10)<march(0));
  const trade=(level)=>{
    const state=structuredClone(base);state.technologies['tech-19']=level;
    return doAction(state,{type:'trade',from:'food',to:'gold',amount:1000},now+1).resources.gold;
  };
  assert.ok(trade(10)>trade(0));
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
  assert.ok(state.reports[0].heroSkills.includes('Hỏa Phù Liệt Trận'));
  assert.ok(state.reports[0].skillBonuses.attack>0);
  assert.ok(state.reports[0].rounds[0].ownDamage>0);
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
  const goldBefore=state.resources.gold,foodBefore=state.resources.food;
  state=doAction(state,{type:'buyItem',itemId:'item-0022'},now+1);
  assert.equal(state.items.filter(id=>id==='item-0022').length,1);
  assert.equal(state.stats.itemPurchases,1);
  assert.ok(Math.abs(state.resources.gold-(goldBefore-360))<0.01);
  assert.ok(Math.abs(state.resources.food-(foodBefore-180))<0.01);
  const foodAfterPurchase=state.resources.food;
  state=doAction(state,{type:'useItem',itemId:'item-0022'},now+2);
  assert.ok(Math.abs(state.resources.food-(foodAfterPurchase+223))<0.01);
  state.heroes[0].level=60;
  state=doAction(state,{type:'duel',mode:'mountain',mountainId:'mountain-001'},now+2);
  assert.equal(state.stats.duels,1);
  assert.equal(state.world.mountainWins.includes('mountain-001'),true);
  assert.match(state.reports[0].target,/Tiên Sơn 1/);
  assert.deepEqual(state.reports[0].heroSkills,['Hỏa Phù Liệt Trận']);
});

test('hero experience items trigger level and skill advancement', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.heroes[0].xp=300;
  state=doAction(state,{type:'useItem',itemId:'item-14'},now+1);
  assert.equal(state.heroes[0].level,4);
  assert.equal(state.heroes[0].skillLevel,2);
  assert.equal(state.heroes[0].xp,14);
});

test('NPC consumable merchant enforces inventory and affordability limits', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.resources.gold=0;
  assert.throws(()=>doAction(state,{type:'buyItem',itemId:'item-0022'},now+1),/Tài nguyên chưa đủ/);
  state=createNewGame('Triều Ca',now);
  state.items=Array(500).fill('item-13');
  assert.throws(()=>doAction(state,{type:'buyItem',itemId:'item-0022'},now+1),/Túi đồ đã đầy/);
  assert.throws(()=>doAction(createNewGame('Triều Ca',now),{type:'buyItem',itemId:'item-01'},now+1),/không bán vật phẩm/);
});
