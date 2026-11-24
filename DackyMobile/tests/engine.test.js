import test from 'node:test';
import assert from 'node:assert/strict';
import { activeQuest, advance, armyPower, createNewGame, doAction, heroPower, migrateSave, productionPerHour, questProgress, storageCapacity, unlockedChapter } from '../src/engine.js';
import { HEROES, HERO_QUALITY_MULTIPLIERS, HERO_SKILLS, IMMORTAL_MOUNTAINS, ITEMS, QUESTS, TECHNOLOGIES, TROOPS, WORLD_NODES } from '../src/catalog.js';

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

test('new-player tutorial unlocks only after its seven gameplay milestones', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  assert.equal(state.tutorialStep,0);
  state=doAction(state,{type:'upgrade',buildingId:'lumber'},now+1);
  assert.equal(state.tutorialStep,0);
  state=advance(state,state.queues.construction.finishAt+1).state;
  assert.equal(state.tutorialStep,1);
  state=doAction(state,{type:'research',techId:'tech-01'},state.lastTickAt+1);
  state=advance(state,state.queues.research.finishAt+1).state;
  assert.equal(state.tutorialStep,2);
  state=doAction(state,{type:'upgrade',buildingId:'altar'},state.lastTickAt+1);
  state=advance(state,state.queues.construction.finishAt+1).state;
  assert.equal(state.tutorialStep,3);
  state=doAction(state,{type:'recruit',heroId:'hero-02'},state.lastTickAt+1);
  assert.equal(state.tutorialStep,4);
  state=doAction(state,{type:'equip',heroId:'hero-01',itemId:'item-01'},state.lastTickAt+1);
  assert.equal(state.tutorialStep,5);
  state=doAction(state,{type:'train',troopId:'troop-01',count:1},state.lastTickAt+1);
  state=advance(state,state.queues.training.finishAt+1).state;
  assert.equal(state.tutorialStep,6);
  const count=state.army['troop-01'];
  state=doAction(state,{type:'march',nodeId:'node-001',troopId:'troop-01',count},state.lastTickAt+1);
  state=advance(state,state.queues.march.finishAt+1).state;
  assert.equal(state.stats.victories,1);
  assert.equal(state.tutorialStep,7);
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

test('troop lanes and matchup counters change the army battle profile', () => {
  assert.ok(TROOPS.every(t=>['front','rear','siege'].includes(t.lane)&&t.range>=1&&t.range<=6));
  assert.equal(TROOPS.find(t=>t.role==='xạ thủ').lane,'rear');
  assert.equal(TROOPS.find(t=>t.role==='công thành').lane,'siege');
  const now=1_800_000_000_000;
  const matchup=t=>{
    let state=createNewGame('Triều Ca',now);
    state.army={[t]:20_000};
    state=doAction(state,{type:'march',nodeId:'node-011',troopId:t,count:10_000},now+1);
    return advance(state,state.queues.march.finishAt+1).state.reports[0].matchup;
  };
  const cavalry=matchup('troop-10');
  const siege=matchup('troop-15');
  assert.equal(cavalry.ownCounterAdvantage,100);
  assert.equal(cavalry.enemyCounterAdvantage,0);
  assert.equal(siege.ownCounterAdvantage,0);
  assert.ok(siege.enemyCounterAdvantage>0);
});

test('immortal affinity advances through training and PvE and elemental bonds reinforce combat', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  const hero=state.heroes[0],baseline=heroPower(hero,state);
  state=doAction(state,{type:'trainHero',heroId:hero.id},now+1);
  assert.equal(state.heroes[0].affinity,3);
  state.heroes[0].affinity=100;
  assert.ok(heroPower(state.heroes[0],state)>baseline);
  state.heroes[0].affinity=98;
  state.heroes.push({id:'hero-07',level:3,xp:0,assigned:true,equipment:{weapon:null,armor:null,artifact:null},skillLevel:1,affinity:100});
  state.army={'troop-10':100_000};
  state=doAction(state,{type:'march',nodeId:'node-011',troopId:'troop-10',count:50_000},now+2);
  state=advance(state,state.queues.march.finishAt+1).state;
  assert.equal(state.heroes[0].affinity,100);
  const sameElement=state.reports[0].skillBonuses.elementResonance;
  const mixed=createNewGame('Triều Ca',now);
  mixed.heroes[0].affinity=100;
  mixed.heroes.push({id:'hero-02',level:3,xp:0,assigned:true,equipment:{weapon:null,armor:null,artifact:null},skillLevel:1,affinity:100});
  mixed.army={'troop-10':100_000};
  const order=doAction(mixed,{type:'march',nodeId:'node-011',troopId:'troop-10',count:50_000},now+2);
  const mixedResult=advance(order,order.queues.march.finishAt+1).state.reports[0];
  assert.ok(sameElement>0.049);
  assert.equal(mixedResult.skillBonuses.elementResonance,0);
  let maxed=createNewGame('Triều Ca',now);
  maxed.heroes[0].level=60;maxed.heroes[0].affinity=97;maxed.levels.storehouse=4;maxed.resources.food=10_000;maxed.resources.gold=10_000;
  maxed=doAction(maxed,{type:'trainHero',heroId:'hero-01'},now+3);
  assert.equal(maxed.heroes[0].level,60);
  assert.equal(maxed.heroes[0].affinity,100);
  assert.throws(()=>doAction(maxed,{type:'trainHero',heroId:'hero-01'},now+4),/linh căn tối đa/);
});

test('active immortal skills cast by round and apply damage, protection and healing', () => {
  const now=1_800_000_000_000;
  const createHero=id=>({id,level:1,xp:0,assigned:true,equipment:{weapon:null,armor:null,artifact:null},skillLevel:1,affinity:0});
  const battle=heroIds=>{
    let state=createNewGame('Triều Ca',now);
    state.heroes=[...heroIds.map(createHero)];
    state.army={'troop-01':1};
    state=doAction(state,{type:'march',nodeId:'node-011',troopId:'troop-01',count:1},now+1);
    return advance(state,state.queues.march.finishAt+1).state.reports[0];
  };
  assert.equal(HERO_SKILLS.length,4);
  assert.equal(new Set(HERO_SKILLS.map(skill=>skill.id)).size,4);
  const windFormation=battle(['hero-01','hero-02','hero-03']);
  assert.ok(windFormation.rounds[0].activeSkills.includes('Huyền Thủy Kết Giới'));
  assert.ok(windFormation.rounds[0].activeSkills.includes('Phong Lôi Tiên Kích'));
  assert.ok(windFormation.rounds[0].shieldedDamage>0);
  assert.ok(windFormation.rounds[0].skillDamage>0);
  assert.ok(windFormation.rounds.some(round=>round.activeSkills.includes('Liệt Hỏa Thiên Hàng')&&round.skillDamage>0));
  assert.ok(windFormation.skillBonuses.attack>0&&windFormation.skillBonuses.defense>0&&windFormation.skillBonuses.opening>0);
  assert.ok(windFormation.skillBonuses.activePowerBonus>0);
  const healingFormation=battle(['hero-01','hero-02','hero-04']);
  const healingRound=healingFormation.rounds.find(round=>round.activeSkills.includes('Thất Tinh Hồi Khí'));
  assert.ok(healingRound,'formation healing should cast on round three');
  assert.ok(healingRound.skillHealing>0);
  assert.ok(healingFormation.skillBonuses.formation>0);
});

test('hero quality and five-element counters affect power and campaign damage', () => {
  const now=1_800_000_000_000;
  const state=createNewGame('Triều Ca',now);
  for(const [quality,multiplier] of Object.entries(HERO_QUALITY_MULTIPLIERS)){
    const def=HEROES.find(hero=>hero.quality===quality);
    const save={id:def.id,level:1,skillLevel:1,affinity:0,equipment:{}};
    const base=def.attack+def.defense+def.wisdom*0.72;
    assert.equal(heroPower(save,state),Math.round(base*multiplier*1.14*1.035));
  }
  assert.ok(HERO_QUALITY_MULTIPLIERS['Thiên']>HERO_QUALITY_MULTIPLIERS['Địa']);
  const target=WORLD_NODES.find(node=>node.chapter===1&&node.enemy.element==='fire');
  assert.ok(target,'campaign nodes expose NPC elemental affinity');
  const fight=heroId=>{
    let battle=createNewGame('Triều Ca',now);
    battle.heroes=[{id:heroId,level:1,xp:0,assigned:true,equipment:{weapon:null,armor:null,artifact:null},skillLevel:1,affinity:0}];
    battle.army={'troop-01':100};
    battle=doAction(battle,{type:'march',nodeId:target.id,troopId:'troop-01',count:100},now+1);
    return advance(battle,battle.queues.march.finishAt+1).state.reports[0];
  };
  const favored=fight('hero-01');
  const countered=fight('hero-03');
  assert.equal(favored.enemyElement,'fire');
  assert.ok(favored.matchup.heroElementAdvantage>0);
  assert.ok(favored.rounds[0].elementDamage>0);
  assert.ok(countered.matchup.heroElementAdvantage<0);
  assert.ok(countered.rounds[0].elementDamage<0);
});

test('weapon, armor and artifact bonuses change their matching combat effects', () => {
  const now=1_800_000_000_000;
  const battle=withGear=>{
    let state=createNewGame('Triều Ca',now);
    if(withGear){
      state.items=['item-01','item-04','item-07'];
      for(const [index,itemId] of state.items.entries())state=doAction(state,{type:'equip',heroId:'hero-01',itemId},now+index+1);
    }
    state.army={'troop-01':1};
    state=doAction(state,{type:'march',nodeId:'node-001',troopId:'troop-01',count:1},now+5);
    return advance(state,state.queues.march.finishAt+1).state.reports[0];
  };
  const unarmed=battle(false),equipped=battle(true);
  assert.equal(unarmed.skillBonuses.equipmentAttack,0);
  assert.equal(unarmed.skillBonuses.equipmentDefense,0);
  assert.equal(unarmed.skillBonuses.artifactSkillBonus,0);
  assert.ok(equipped.skillBonuses.equipmentAttack>0);
  assert.ok(equipped.skillBonuses.equipmentDefense>0);
  assert.ok(equipped.skillBonuses.artifactSkillBonus>0);
  assert.ok(equipped.skillBonuses.activePowerBonus>unarmed.skillBonuses.activePowerBonus);
  const unarmedFire=unarmed.rounds.find(round=>round.activeSkills.includes('Liệt Hỏa Thiên Hàng'));
  const equippedFire=equipped.rounds.find(round=>round.activeSkills.includes('Liệt Hỏa Thiên Hàng'));
  assert.ok(equippedFire.skillDamage>unarmedFire.skillDamage);
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

test('satellite cities upgrade through the construction queue and add production per level', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.cities.push({id:'node-001',nodeId:'node-001',name:'Thanh Khâu Quan',level:1,population:80,isCapital:false});
  const before=productionPerHour(state);
  state=doAction(state,{type:'upgradeCity',cityId:'node-001'},now+1);
  assert.equal(state.queues.construction.cityId,'node-001');
  assert.equal(state.queues.construction.level,2);
  assert.equal(migrateSave(state,now+2).queues.construction.cityId,'node-001');
  state=advance(state,state.queues.construction.finishAt+1).state;
  assert.equal(state.cities.find(city=>city.id==='node-001').level,2);
  assert.equal(state.stats.upgrades,1);
  assert.ok(productionPerHour(state).food>=before.food+25);
  assert.ok(productionPerHour(state).timber>=before.timber+18);
  assert.throws(()=>doAction(state,{type:'upgradeCity',cityId:'capital'},state.lastTickAt+1),/Không tìm thấy thành phụ/);
  const locked=structuredClone(state);locked.levels.citadel=1;
  assert.throws(()=>doAction(locked,{type:'upgradeCity',cityId:'node-001'},state.lastTickAt+1),/Cần Tử Vi Thành cấp 3/);
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

test('eight-chapter world catalog is balanced and chapters unlock through field victories', () => {
  const chapters=Array.from({length:8},(_,i)=>WORLD_NODES.filter(node=>node.chapter===i+1));
  assert.ok(chapters.every(rows=>rows.length===15));
  assert.equal(WORLD_NODES.filter(node=>node.kind==='Danh thành').length,75);
  assert.equal(WORLD_NODES.filter(node=>node.kind==='Dã địa').length,30);
  assert.equal(WORLD_NODES.filter(node=>node.kind==='Tiên sơn').length,14);
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state.army['troop-01']=5000;
  assert.equal(unlockedChapter(state),1);
  assert.throws(()=>doAction(state,{type:'march',nodeId:'node-016',troopId:'troop-01',count:100},now+1),/chương 1 để mở chương 2/);
  state=doAction(state,{type:'march',nodeId:'node-011',troopId:'troop-01',count:3000},now+2);
  state=advance(state,state.queues.march.finishAt+1).state;
  assert.equal(state.world.storyStage,3);
  assert.equal(unlockedChapter(state),2);
  state.army['troop-01']=5000;
  state=doAction(state,{type:'march',nodeId:'node-016',troopId:'troop-01',count:3000},state.lastTickAt+1);
  assert.equal(state.queues.march.nodeId,'node-016');
});

test('NPC world nodes expose distinct formations and scouting persists battle intelligence', () => {
  assert.ok(WORLD_NODES.every(node=>node.enemy?.commander&&node.enemy?.tactic?.id&&node.enemy?.formation?.length>=3));
  assert.ok(WORLD_NODES.every(node=>['fire','water','wood','metal','earth'].includes(node.enemy.element)));
  assert.equal(new Set(WORLD_NODES.map(node=>node.enemy.element)).size,5);
  assert.ok(new Set(WORLD_NODES.map(node=>node.enemy.tactic.id)).size>=4);
  assert.ok(WORLD_NODES.every(node=>node.enemy.formation.every(row=>TROOPS.some(t=>t.id===row.unitId)&&row.count>0)));
  for(const node of WORLD_NODES){
    const preferredTier=Math.ceil(node.chapter*7/8);
    for(const row of node.enemy.formation){
      const troop=TROOPS.find(unit=>unit.id===row.unitId);
      const lowestRoleTier=Math.min(...TROOPS.filter(unit=>unit.role===troop.role).map(unit=>unit.tier));
      assert.ok(troop.tier<=preferredTier||troop.tier===lowestRoleTier,`${node.id} should not field an unnecessarily high tier`);
    }
  }
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  state=doAction(state,{type:'scout',nodeId:'node-011'},now+1);
  assert.ok(state.world.scouted.includes('node-011'));
  assert.ok(state.notifications[0].includes(WORLD_NODES[10].enemy.commander));
  state.army={'troop-01':100_000,'troop-10':100_000,'troop-23':100_000};
  state=doAction(state,{type:'march',nodeId:'node-011',troops:{'troop-01':10_000,'troop-10':10_000,'troop-23':10_000}},now+2);
  state=advance(state,state.queues.march.finishAt+1).state;
  const battle=state.reports[0];
  assert.equal(battle.enemyCommander,WORLD_NODES[10].enemy.commander);
  assert.equal(battle.enemyElement,WORLD_NODES[10].enemy.element);
  assert.equal(battle.enemyTactic,WORLD_NODES[10].enemy.tactic.name);
  assert.equal(battle.enemyFormation.length,3);
  assert.ok(Object.keys(battle.enemyCasualties).length>0);
  assert.ok(battle.rounds.every(round=>round.enemyMorale>=0&&round.enemyMorale<=100));
});

test('main campaign has eight regional objectives and locks claims behind chapter progress', () => {
  const mainQuests=QUESTS.filter(q=>q.mainStory);
  assert.equal(mainQuests.length,9);
  assert.deepEqual(mainQuests.map(q=>q.chapter),[1,2,3,4,5,6,7,8,8]);
  const now=1_800_000_000_000;
  let locked=createNewGame('Triều Ca',now);
  const chapterTwo=mainQuests.find(q=>q.chapter===2);
  locked.world.chapterProgress['2'].fieldWins=1;
  assert.throws(()=>doAction(locked,{type:'claimQuest',questId:chapterTwo.id},now+1),/Cần mở chương 2/);
  let state=createNewGame('Triều Ca',now);
  const chapterOne=mainQuests.find(q=>q.chapter===1);
  assert.equal(activeQuest(state).id,chapterOne.id);
  state.army['troop-01']=100_000;
  state=doAction(state,{type:'march',nodeId:'node-011',troopId:'troop-01',count:50_000},now+2);
  state=advance(state,state.queues.march.finishAt+1).state;
  assert.equal(questProgress(state,chapterOne),1);
  assert.equal(unlockedChapter(state),2);
  state=doAction(state,{type:'claimQuest',questId:chapterOne.id},state.lastTickAt+1);
  assert.equal(activeQuest(state).id,chapterTwo.id);
});


test('final boss is gated and a first victory records the campaign ending', () => {
  const now=1_800_000_000_000;
  let state=createNewGame('Triều Ca',now);
  assert.throws(()=>doAction(state,{type:'march',nodeId:'node-120',troopId:'troop-01',count:1},now+1),/20 trận thắng và 7 danh thành/);
  state.stats.victories=20;
  state.stats.citiesCaptured=7;
  state.world.storyStage=21;
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
