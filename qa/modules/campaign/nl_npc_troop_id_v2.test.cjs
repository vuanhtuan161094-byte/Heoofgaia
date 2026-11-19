'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const X=require('../../../data/ngoalong/modules/campaign/nl_campaign_troop_id_crosswalk_v2.js');
const base=path.resolve(__dirname,'../../../data/ngoalong/modules/campaign');
const read=f=>JSON.parse(fs.readFileSync(path.join(base,f),'utf8'));
function fixture(){
 const registry={kind:'NL06_CROSS_CHAT_REFERENCE_SNAPSHOT_V1',
  authority:'REFERENCE_ONLY',runtimeEnabled:false,sourceHeads:{troops:{sha:'troops-sha'}},
  counts:{wikiTroops:3},wikiTroops:[
   {id:'t15',name:'Thuẫn Binh',family:'infantry',tier:1},
   {id:'ta',name:'Ngân Thương',family:'spear',tier:2},
   {id:'tb',name:'Ngân Thương',family:'spear',tier:4}]};
 const npc=(id,units)=>({id,mapId:'wiki-map-1',formation:units.map(([number,name],i)=>({
   wikiSlot:i+1,formationSlot:i,troopWikiId:number,troopName:name}))});
 const one=npc('wiki-m1-ai1',[[15,'Thuẫn Binh'],[29,'Ngân Thương'],[350,'Viêm Chùy Kỵ']]);
 const two=npc('wiki-m1-ai2',[[15,'Thuẫn Binh'],[142,'Ngân Thương']]);
 const shard={kind:'NGOALONG_CAMPAIGN_SHARD',sourceEdition:'CURRENT_VNG_MOBILE',
  classicWebgameParity:'UNKNOWN',runtimeAuthority:false,runtimeEnabled:false,
  maps:[{id:'wiki-map-1',wikiMapId:1,npcs:[one,two]}]};
 const manifest={kind:'NGOALONG_CAMPAIGN_SHARD_INDEX',sourceEdition:'CURRENT_VNG_MOBILE',
  classicWebgameParity:'UNKNOWN',runtimeEnabled:false,
  mapLocator:{'wiki-map-1':{wikiMapId:1,npcCount:2}},
  counts:{maps:1,npcRows:2}};
 const sourceShards=[{path:'data/ngoalong/modules/campaign/source_shards/shard-001.json',sha:'source-sha'}];
 return {registry,manifest,shards:[shard],sourceShards};
}
function run(f){
 const batch=X.sourcePairs(f.manifest,f.shards);
 batch.sourceShards=f.sourceShards;
 return X.reconcile([batch],f.registry,{manifestBlobSha:'manifest-sha',campaignHead:'campaign-sha'});
}
test('numeric identity is extracted with direct source slot provenance',()=>{
 const f=fixture(),batch=X.sourcePairs(f.manifest,f.shards);
 assert.equal(batch.maps,1);assert.equal(batch.npcs,2);assert.equal(batch.unitSlots,5);
 assert.equal(batch.missingId,0);assert.equal(batch.pairs.length,4);
 assert.equal(batch.pairs.find(x=>x.wikiTroopId===15).count,2);
});
test('source-consistent id and unique CHAT02 name is candidate, not playable',()=>{
 const r=run(fixture()),x=r.records.find(x=>x.wikiTroopId===15);
 assert.equal(x.catalogueStatus,'EXACT_UNIQUE_NAME_CANDIDATE');
 assert.deepEqual(x.chat02CandidateIds,['t15']);
 assert.equal(x.sourceIdNameConsistency,'CONSISTENT');
 assert.equal(x.numericIdIndependentlyVerified,false);
 assert.equal(x.approvedRuntimeTroopId,null);
 assert.equal(r.counts.runtimePlayableBindings,0);
 assert.equal(X.resolve(r,15,'Thuẫn Binh').runtimeTroopId,null);
 assert.equal(X.resolve(r,15,'Wrong').status,'UNRESOLVED_SOURCE_ID_OR_NAME');
});
test('duplicate CHAT02 name and two different Wiki numeric IDs remain ambiguous',()=>{
 const r=run(fixture());
 for(const id of [29,142]){
  const x=r.records.find(x=>x.wikiTroopId===id);
  assert.equal(x.catalogueStatus,'CHAT02_NAME_AMBIGUOUS');
  assert.equal(x.chat02CandidateIds.length,2);
  assert.equal(x.otherNumericIdsSameName.length,1);
 }
 assert.equal(r.counts.ambiguousCatalogueMatches,2);
});
test('NPC troop not found in CHAT02 remains a source-only gap',()=>{
 const r=run(fixture()),x=r.records.find(x=>x.wikiTroopId===350);
 assert.equal(x.catalogueStatus,'NOT_IN_CHAT02_CATALOGUE');
 assert.deepEqual(x.chat02CandidateIds,[]);
 assert.equal(r.counts.missingCatalogueNames,1);
});
test('same numeric ID pointing to different names is flagged and blocked',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[1].formation[0].troopName='Mạo Danh';
 const r=run(f),x=r.records.find(x=>x.wikiTroopId===15);
 assert.equal(x.sourceIdNameConsistency,'CONFLICT');
 assert.equal(x.catalogueStatus,'SOURCE_ID_NAME_CONFLICT');
 assert.equal(r.counts.sourceIdNameConflicts,1);
});
test('missing numeric ID and missing troop label remain unknown, never guessed',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[0].formation[0].troopWikiId=null;
 f.shards[0].maps[0].npcs[0].formation[1].troopName='';
 const r=run(f);
 assert.equal(r.counts.missingNumericIds,1);
 assert.equal(r.counts.missingTroopNames,1);
 assert.equal(r.counts.runtimePlayableBindings,0);
});
test('duplicate position, incomplete source and runtime-enabled source fail closed',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[0].formation[1].wikiSlot=1;
 assert.throws(()=>X.sourcePairs(f.manifest,f.shards),/invalid 3x3 slot/);
 f.shards[0].maps[0].npcs[0].formation[1].wikiSlot=2;
 f.manifest.mapLocator['wiki-map-2']={wikiMapId:2,npcCount:1};
 assert.throws(()=>X.sourcePairs(f.manifest,f.shards),/incomplete source shard coverage/);
 delete f.manifest.mapLocator['wiki-map-2'];
 f.shards[0].runtimeEnabled=true;
 assert.throws(()=>X.sourcePairs(f.manifest,f.shards),/untrusted source shard/);
});
test('all 21 source shards deterministically reproduce the committed 346-ID crosswalk',()=>{
 const pins=read('troop_id_source_pins_v2.json');
 const manifest=read('source_shards/manifest.json');
 const sourceShards=pins.sourceShards.map(x=>x.path);
 assert.equal(sourceShards.length,21);
 const shards=sourceShards.map(x=>read('source_shards/'+path.basename(x)));
 const batch=X.sourcePairs(manifest,shards);
 batch.sourceShards=pins.sourceShards;
 const actual=X.reconcile([batch],read('crosschat_dependencies_v1.json'),
  {campaignHead:pins.campaignHead,manifestBlobSha:pins.manifestBlobSha});
 const expected=read('npc_numeric_troop_crosswalk_v2.json');
 assert.deepEqual(actual,expected);
 assert.equal(actual.counts.maps,249);
 assert.equal(actual.counts.npcs,4903);
 assert.equal(actual.counts.unitSlots,23914);
 assert.equal(actual.counts.distinctNumericIds,346);
 assert.equal(actual.counts.exactUniqueCatalogueNameCandidates,302);
 assert.equal(actual.counts.ambiguousCatalogueMatches,9);
 assert.equal(actual.counts.missingCatalogueNames,35);
 assert.equal(actual.counts.runtimePlayableBindings,0);
});
