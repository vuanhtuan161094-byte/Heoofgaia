'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../data/ngoalong/modules/campaign/nl_campaign_readiness_v1.js');
function npc(id,order,soldiers){
 return {id:'wiki-m1-ai'+id,order,boss:order===2,
 totalSoldiersRaw:100,soldierConsistency:soldiers===100?'MATCH':'UNKNOWN',
 formation:[{wikiSlot:5,formationSlot:4,name:'General',troopWikiId:'10',
 soldiers,skill:{label:'Tactic'}}],blockers:[]};
}
function map(){return {id:'wiki-map-1',wikiMapId:1,name:'Khuc Duong',
 sourceEdition:'CURRENT_VNG_MOBILE',cityLevelRequired:20,
 advertisedNpcCount:2,npcListComplete:true,readyForIntegration:false,
 npcs:[npc(77,1,100),npc(81,2,100)]};}
function bundle(mapRow){
 return {manifest:{kind:'NGOALONG_CAMPAIGN_SHARD_INDEX',
 sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',
 runtimeEnabled:false,mapLocator:{'wiki-map-1':{wikiMapId:1,npcCount:2}}},
 shards:[{kind:'NGOALONG_CAMPAIGN_SHARD',sourceEdition:'CURRENT_VNG_MOBILE',
 runtimeEnabled:false,maps:[mapRow]}]};
}
test('source complete is still not playable',()=>{
 const b=bundle(map()),r=R.produce(b.manifest,b.shards);
 assert.equal(r.counts.sourceStructurallyCompleteMaps,1);
 assert.equal(r.counts.playableMaps,0);
 assert.equal(r.candidates[0].bossCount,1);
});
test('unknown army count blocks without synthetic replacement',()=>{
 const x=map();x.npcs[0].formation[0].soldiers=null;
 x.npcs[0].soldierConsistency='UNKNOWN';
 const b=bundle(x),r=R.produce(b.manifest,b.shards);
 assert.equal(r.counts.sourceStructurallyCompleteMaps,0);
 assert.equal(r.counts.missingUnitSoldiers,1);
});
test('wrong 3x3 slot, order and mismatched totals block',()=>{
 const x=map();x.npcs[0].formation[0].formationSlot=8;
 x.npcs[1].order=3;x.npcs[1].soldierConsistency='SOURCE_MISMATCH';
 const b=bundle(x),r=R.produce(b.manifest,b.shards);
 assert.equal(r.counts.sourceStructurallyCompleteMaps,0);
 assert.ok(r.candidates[0].sourceBlockers.includes('NPC_BATTLE_ORDER_NOT_VERIFIED'));
});
test('source version and duplicate map fail closed',()=>{
 const b=bundle(map());
 assert.throws(()=>R.produce({...b.manifest,classicWebgameParity:'VERIFIED'},b.shards),/scope/);
 assert.throws(()=>R.produce(b.manifest,[...b.shards,...b.shards]),/duplicate/);
});
