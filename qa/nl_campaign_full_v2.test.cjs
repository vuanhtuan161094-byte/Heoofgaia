'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../data/ngoalong/modules/campaign/nl_campaign_core_v1.js');
const S=require('../data/ngoalong/modules/campaign/nl_campaign_shards_v1.js');
const A=require('../data/ngoalong/modules/campaign/nl_campaign_battle_adapter_v1.js');
const early=require('../data/ngoalong/modules/campaign/starter_wiki_reference_v1.json');
function fixture(){
 const u=(name,skill,slot)=>({wikiSlot:slot,name,level:1,soldiers:200,troopWikiId:'10',
   troopName:'Bộ',skillName:skill,skillSourceType:'NPC_UNIT_ACTIVE',skillNamespace:'WIKI_HERO_ACTIVE'});
 const npc=(id,order,name,unit)=>({wikiAiId:id,order,name,kind:'BOSS',level:1,totalSoldiers:200,
   unitSoldierDiscrepancy:0,unitSoldierConsistencyStatus:'MATCH',observedUnitSoldierSum:200,
   formationComplete:true,formationUnits:[unit]});
 const source={sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',runtimeAuthority:false,
   source:'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban',
   maps:[{wikiMapId:1,name:'Khúc Dương',cityLevelRequired:20,mapLevel:10,
     advertisedNpcCount:2,npcListComplete:true,mapWideBattleRulesObserved:[],
     npcs:[npc(77,1,'Cao Thăng',u('Cao Thăng','Thiết Bích',5)),
           npc(81,2,'Trương Yên',u('Trương Yên','Đạp Phá',6))]}]};
 const binding=(name,skill)=>({reviewed:true,wikiGeneralName:name,wikiTroopId:'10',
   wikiActiveSkillName:skill,heroId:'h',troopId:'t',skillId:'s',skillOrigin:'HERO_ACTIVE'});
 const approvals={registries:{heroes:['h'],troops:['t'],skills:['s'],effects:[]},
   units:{'1/77/5':binding('Cao Thăng','Thiết Bích'),'1/81/6':binding('Trương Yên','Đạp Phá')},
   npcs:{'wiki-m1-ai77':{stageSkillsReviewed:true,rewardReviewed:true,firstClearReward:{silver:3}},
         'wiki-m1-ai81':{stageSkillsReviewed:true,rewardReviewed:true,firstClearReward:null}},
   maps:{'wiki-map-1':{order:1,versionReviewed:true,edition:'CURRENT_VNG_MOBILE',
     progressionReviewed:true,mapRulesReviewed:true,mapRuleBindings:[],
     rewardReviewed:true,firstClearReward:{silver:10}}}};
 return {source,approvals};
}
function resolver(){return {
 resolveUnit:p=>({...p,reviewed:true,stats:{attack:100,defense:30,hp:200},statsSource:'SIMULATED'}),
 resolveEffect:id=>({id,reviewed:true})};
}
test('real Wiki starter catalogue: 10 maps and seven selected-unit snapshots, zero false playable claims',()=>{
 assert.equal(early.kind,'NGOALONG_CAMPAIGN_VERIFIED_EARLY_REFERENCE');
 assert.equal(early.maps.length,10);
 assert.equal(early.coverage.indexedNpcRows,5);
 assert.equal(early.coverage.detailedSingleUnitSnapshots,7);
 assert.equal(early.coverage.playableMapCount,0);
 assert.deepEqual(early.maps[0].npcs.map(x=>x.name),
   ['Bùi Nguyên Thiệu','Cao Thăng','Trương Yên','Ba Tài','Trương Bảo']);
 assert.deepEqual(early.maps[0].npcs.map(x=>x.order),[1,2,3,4,5]);
 assert.deepEqual(early.maps[0].npcs.map(x=>x.totalSoldiers),[200,200,200,420,100]);
 assert.equal(early.maps[0].npcs[1].boss,true);
 assert.equal(early.maps[0].npcs[4].boss,false);
 assert.equal(early.maps[0].partialDetailSnapshots[0].fullEnemyTeamVerified,false);
});
test('sharding indexes source maps without turning unapproved units playable',()=>{
 const {source}=fixture(), result=S.build(source);
 assert.equal(result.manifest.counts.maps,1);
 assert.equal(result.manifest.counts.npcRows,2);
 assert.equal(result.manifest.counts.mapsReadyForIntegration,0);
 assert.equal(result.shards[0].body.maps[0].npcs[0].formation[0].heroId,null);
 const loaded=S.loadShard(result.manifest,result.shards[0].body);
 const view=A.inspect(loaded,C.makeState(),'wiki-map-1',20);
 assert.equal(view.ready,false);
 assert.equal(view.npcs[0].canFight,false);
 assert.equal(view.npcs[0].formation.length,9);
 assert.equal(view.npcs[0].formation[4].skillLabel,'Thiết Bích');
 assert.equal(view.npcs[1].formation[5].skillLabel,'Đạp Phá');
});
test('approved two-NPC sequence calls actual registry and preserves source slot and skill provenance',()=>{
 const {source,approvals}=fixture(),pack=S.loadShard(
   S.build(source,approvals).manifest,S.build(source,approvals).shards[0].body);
 const view=A.inspect(pack,C.makeState(),'wiki-map-1',20);
 assert.equal(view.ready,true);
 assert.equal(view.npcs[0].canFight,true);
 assert.equal(view.npcs[1].canFight,false);
 assert.throws(()=>A.prepare(pack,C.makeState(),
   {mapId:'wiki-map-1',npcId:'wiki-m1-ai81',battleId:'b2',cityLevel:20},resolver()),/previous NPC/);
 const start=A.prepare(pack,C.makeState(),
   {mapId:'wiki-map-1',npcId:'wiki-m1-ai77',battleId:'b1',cityLevel:20},resolver());
 assert.equal(start.battle.enemyUnits[0].slot,4);
 assert.equal(start.battle.enemyUnits[0].skillId,'s');
 assert.equal(start.battle.enemyUnits[0].soldiers,200);
 assert.equal(start.battle.disallowDirectReward,true);
 assert.equal(start.battle.boss,true);
 assert.equal(start.battle.enemyUnits[0].statsSource,'SIMULATED');
});
test('unapproved combat resolution is rejected rather than inventing troop statistics',()=>{
 const {source,approvals}=fixture(),pack=C.compileWikiDungeons(source,approvals);
 assert.throws(()=>A.prepare(pack,C.makeState(),
   {mapId:'wiki-map-1',npcId:'wiki-m1-ai77',battleId:'b1',cityLevel:20},
   {...resolver(),resolveUnit:p=>({...p,reviewed:false,stats:{attack:100}})}),/profile mismatch/);
});
test('two authentic victories settle NPCs and grant once-only map reward; duplicate replay grants none',()=>{
 const {source,approvals}=fixture(),pack=C.compileWikiDungeons(source,approvals);
 let state=C.makeState(),applied=0;
 const authority={
 verifyReport:(report,pending)=>report.check==='trusted'&&report.battleId===pending.battleId,
 atomicCommit:payload=>{applied++;return payload}
 };
 const begin=(id,battleId)=>A.prepare(pack,state,{mapId:'wiki-map-1',
   npcId:id,battleId,cityLevel:20},resolver());
 const finish=(current,battleId)=>A.settle(pack,current,
   {battleId,result:'WIN',check:'trusted'},authority);
 const first=begin('wiki-m1-ai77','b1');
 assert.throws(()=>A.settle(pack,first.state,
   {battleId:'b1',result:'WIN',check:'forged'},authority),/not authoritative/);
 let committed=finish(first.state,'b1');
 assert.equal(committed.receiptInstructions.length,1);
 state=committed.after;
 const second=begin('wiki-m1-ai81','b2');
 committed=finish(second.state,'b2');
 assert.equal(committed.receiptInstructions.length,1);
 assert.equal(committed.receiptInstructions[0].target,'MAP_FIRST_CLEAR');
 state=committed.after;
 assert.equal(applied,2);
 assert.equal(A.inspect(pack,state,'wiki-map-1',20).npcs.every(n=>n.cleared),true);
 const replay=begin('wiki-m1-ai77','b3');
 committed=finish(replay.state,'b3');
 assert.equal(committed.receiptInstructions.length,0);
 assert.equal(committed.after.grantedFirstClearKeys.length,2);
 assert.equal(applied,3);
});
test('invalid source scope and source soldier discrepancy do not become playable',()=>{
 const {source,approvals}=fixture();
 source.maps[0].npcs[0].unitSoldierConsistencyStatus='SOURCE_MISMATCH';
 source.maps[0].npcs[0].unitSoldierDiscrepancy=40;
 const result=S.build(source,approvals);
 assert.equal(result.manifest.counts.sourceSoldierContradictions,1);
 assert.equal(result.manifest.counts.mapsReadyForIntegration,0);
 assert.equal(result.shards[0].body.maps[0].npcs[0].totalSoldiersRaw,200);
 assert.equal(result.shards[0].body.maps[0].npcs[0].unitSoldierDiscrepancy,40);
});

test('early maps and selected NPC snapshots reproduce exactly from immutable Wiki sources',()=>{
 const earlySource=require('../data/ngoalong/group02_wiki/early_campaign_10.json');
 const npcSource=require('../data/ngoalong/group02_wiki/npc_details.json');
 const rebuilder=require('../tools/nl_campaign_starter_import_v1.js');
 assert.deepEqual(rebuilder.build(earlySource,npcSource),early);
});
