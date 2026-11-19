'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const C = require('../data/ngoalong/modules/campaign/nl_campaign_core_v1.js');
function fixture() {
  const rawUnit = {wikiSlot:5,name:'Generic Guard',level:3,soldiers:200,
    troopWikiId:'T10',troopName:'Bộ',skillName:'Thiết Bích',
    skillSourceType:'NPC_UNIT_ACTIVE',skillNamespace:'WIKI_HERO_ACTIVE',
    skillVersion:'CURRENT_WIKI_UNDATED',fieldProvenance:{wikiSlot:{classification:'VERIFIED'}}};
  function npc(ai, order, boss) {
    return {wikiAiId:ai,order,name:'NPC '+ai,kind:boss?'BOSS':'Thường',level:3,
      totalSoldiers:200,observedUnitSoldierSum:200,
      unitSoldierDiscrepancy:0,unitSoldierConsistencyStatus:'MATCH',
      formationComplete:true,formationUnits:[{...rawUnit}],
      sourceUrl:'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map=1&ai='+ai};
  }
  const blueprint = {sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',
    runtimeAuthority:false,source:'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban',
    maps:[{wikiMapId:1,name:'Test Map',mapLevel:10,cityLevelRequired:20,dungeonType:null,
      historicalVersionStatus:'CURRENT_WIKI_SNAPSHOT_PATCH_LEDGER_SEPARATE',
      advertisedNpcCount:2,npcListComplete:true,
      mapWideBattleRulesObserved:[],npcs:[npc(75,1,false),npc(77,2,true)]}]};
  const unitLink = {reviewed:true, wikiGeneralName:'Generic Guard',
    wikiTroopId:'T10',wikiActiveSkillName:'Thiết Bích',heroId:'h1',
    troopId:'t1',skillId:'s1',skillOrigin:'HERO_ACTIVE'};
  const approvals = {
    registries:{heroes:['h1'],troops:['t1'],skills:['s1'],effects:[]},
    units:{'1/75/5':unitLink,'1/77/5':unitLink},
    npcs:{'wiki-m1-ai75':{stageSkillsReviewed:true,rewardReviewed:true,
      firstClearReward:{silver:2},stageExtraSkills:[]},
      'wiki-m1-ai77':{stageSkillsReviewed:true,rewardReviewed:true,
      firstClearReward:null,stageExtraSkills:[]}},
    maps:{'wiki-map-1':{order:1,previousMapId:null,progressionReviewed:true,
      edition:'CURRENT_VNG_MOBILE',versionReviewed:true,mapRulesReviewed:true,
      mapRuleBindings:[],rewardReviewed:true,firstClearReward:{silver:10}}}
  };
  return {blueprint,approvals};
}
test('catalogue fails closed with zero approvals', () => {
  const {blueprint} = fixture();
  const pack = C.compileWikiDungeons(blueprint);
  assert.equal(pack.counts.maps, 1);
  assert.equal(pack.counts.mapsReadyForIntegration, 0);
  assert.equal(pack.counts.npcsReadyForIntegration, 0);
  assert.equal(pack.maps[0].npcs[0].formation[0].heroId, null);
  assert.equal(pack.maps[0].classicWebgameParity, 'UNKNOWN');
});
test('fully reviewed two-NPC dungeon retains order/Boss/3x3/skills and unlocks', () => {
  const {blueprint,approvals} = fixture();
  const pack = C.validateCatalogue(C.compileWikiDungeons(blueprint,approvals));
  const map = pack.maps[0];
  assert.equal(pack.counts.mapsReadyForIntegration, 1);
  assert.deepEqual(map.npcs.map(n=>n.order),[1,2]);
  assert.deepEqual(map.bossIds,['wiki-m1-ai77']);
  assert.equal(map.npcs[0].formation[0].formationSlot,4);
  assert.equal(map.npcs[0].formation[0].skill.origin,'HERO_ACTIVE');
  let s=C.makeState();
  assert.equal(C.canEnterMap(pack,s,map,19), false);
  assert.equal(C.canEnterMap(pack,s,map,20), true);
  assert.throws(()=>C.beginEncounter(pack,s,{mapId:map.id,npcId:'wiki-m1-ai77',
    battleId:'b2',cityLevel:20}),/previous NPC/);
  s=C.beginEncounter(pack,s,{mapId:map.id,npcId:'wiki-m1-ai75',
    battleId:'b1',cityLevel:20}).state;
  let result=C.settleEncounter(pack,s,{battleId:'b1',result:'WIN',combatVerified:true});
  assert.equal(result.rewardInstructions.length,1);
  assert.equal(result.rewardInstructions[0].rewards.silver,2);
  assert.equal(result.nextNpcId,'wiki-m1-ai77');
  s=C.beginEncounter(pack,result.state,{mapId:map.id,npcId:'wiki-m1-ai77',
    battleId:'b2',cityLevel:20}).state;
  result=C.settleEncounter(pack,s,{battleId:'b2',result:'WIN',combatVerified:true});
  assert.equal(result.mapCleared,true);
  assert.equal(result.rewardInstructions.length,1);
  assert.equal(result.rewardInstructions[0].target,'MAP_FIRST_CLEAR');
  assert.equal(result.rewardInstructions[0].rewards.silver,10);
  assert.throws(()=>C.settleEncounter(pack,result.state,
    {battleId:'b2',result:'WIN',combatVerified:true}),/authoritative combat/);
  s=C.beginEncounter(pack,result.state,{mapId:map.id,npcId:'wiki-m1-ai77',
    battleId:'b3',cityLevel:20}).state;
  result=C.settleEncounter(pack,s,{battleId:'b3',result:'WIN',combatVerified:true});
  assert.equal(result.rewardInstructions.length,0);
  assert.equal(result.mapCleared,true);
  assert.equal(result.state.grantedFirstClearKeys.length,2);
});
test('loss never grants rewards, battle ID and verification mandatory', () => {
  const {blueprint,approvals}=fixture();
  const pack=C.compileWikiDungeons(blueprint,approvals);
  let state=C.beginEncounter(pack,C.makeState(),{mapId:'wiki-map-1',
    npcId:'wiki-m1-ai75',battleId:'l1',cityLevel:20}).state;
  assert.throws(()=>C.settleEncounter(pack,state,{battleId:'l1',result:'WIN'}),/authoritative/);
  const settled=C.settleEncounter(pack,state,{battleId:'l1',result:'LOSE',combatVerified:true});
  assert.equal(settled.rewardInstructions.length,0);
  assert.equal(settled.state.clearedNpcIds.length,0);
  assert.throws(()=>C.beginEncounter(pack,settled.state,{mapId:'wiki-map-1',
    npcId:'wiki-m1-ai75',battleId:'l1',cityLevel:20}),/already settled/);
});
test('source soldier contradictions, unknown formation, wrong identity and NPC-only skill block', () => {
  const {blueprint,approvals}=fixture();
  blueprint.maps[0].npcs[0].unitSoldierDiscrepancy = 20;
  blueprint.maps[0].npcs[0].unitSoldierConsistencyStatus='SOURCE_MISMATCH';
  blueprint.maps[0].npcs[1].formationComplete=false;
  blueprint.maps[0].npcs[1].formationUnits[0].skillNamespace='NPC_EXCLUSIVE_LABEL';
  const pack=C.compileWikiDungeons(blueprint,approvals);
  assert.equal(pack.counts.sourceSoldierContradictions,1);
  assert.ok(pack.maps[0].npcs[0].blockers.includes('SOURCE_SOLDIER_CONTRADICTION'));
  assert.ok(pack.maps[0].npcs[1].blockers.includes('NPC_SPECIFIC_SKILL_NOT_REVIEWED'));
  assert.ok(pack.maps[0].npcs[1].blockers.includes('FORMATION_NOT_EXHAUSTIVE'));
  assert.equal(pack.counts.mapsReadyForIntegration,0);
  assert.equal(pack.maps[0].npcs[0].totalSoldiersRaw,200);
  assert.equal(pack.maps[0].npcs[0].unitSoldierDiscrepancy,20);
});
test('separate map-wide rules require effect binding and prohibit hero skill cross-use', () => {
  const {blueprint,approvals}=fixture();
  blueprint.maps[0].mapWideBattleRulesObserved=[{skillSourceType:'DUNGEON_WIDE_RULE',
    effectType:'khống chế',modifier:'-50%',sourceUrl:'https://ngoalong.vnggames.com'}];
  let pack=C.compileWikiDungeons(blueprint,approvals);
  assert.equal(pack.counts.mapsReadyForIntegration,0);
  approvals.registries.effects.push('effect1');
  approvals.maps['wiki-map-1'].mapRuleBindings=[
    {origin:'MAP_WIDE',sourceEffectType:'khống chế',effectId:'effect1'}];
  pack=C.compileWikiDungeons(blueprint,approvals);
  assert.equal(pack.counts.mapsReadyForIntegration,1);
  assert.equal(pack.maps[0].mapRules[0].runtimeEffectId,'effect1');
  assert.equal(pack.maps[0].npcs[0].formation[0].skill.origin,'HERO_ACTIVE');
});
test('duplicate slots/AI and unapproved mobile version are rejected or blocked', () => {
  const {blueprint,approvals}=fixture();
  blueprint.maps[0].npcs[0].formationUnits.push({...blueprint.maps[0].npcs[0].formationUnits[0]});
  let pack=C.compileWikiDungeons(blueprint,approvals);
  assert.ok(pack.maps[0].npcs[0].blockers.includes('DUPLICATE_FORMATION_SLOTS'));
  assert.throws(()=>C.validateCatalogue(pack),/invalid NPC 3x3/);
  blueprint.maps[0].npcs[0].formationUnits.pop();
  delete approvals.maps['wiki-map-1'].versionReviewed;
  pack=C.compileWikiDungeons(blueprint,approvals);
  assert.equal(pack.counts.mapsReadyForIntegration,0);
  blueprint.maps[0].npcs.push({...blueprint.maps[0].npcs[1]});
  assert.throws(()=>C.compileWikiDungeons(blueprint,approvals),/duplicate Wiki NPC/);
});
