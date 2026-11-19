'use strict';
/* CHAT06: convert sourced Wiki blueprint to small shards without authoring fake NPCs. */
const C=require('./nl_campaign_core_v1.js');
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
function unit(u){return {
 wikiSlot:u.wikiSlot,formationSlot:u.formationSlot,name:u.name,
 level:u.level,soldiers:u.soldiers,troopName:u.troopName,
 troopWikiId:u.troopWikiId,skill:copy(u.skill),
 heroId:u.heroId,troopId:u.troopId,bindingStatus:u.bindingStatus,
 sourceUrl:u.sourceUrl,fieldProvenance:copy(u.fieldProvenance)
};}
function mapRow(m){return {
 id:m.id,wikiMapId:m.wikiMapId,name:m.name,mapLevel:m.mapLevel,
 faction:m.faction,dungeonType:m.dungeonType,cityLevelRequired:m.cityLevelRequired,
 sourceEdition:m.sourceEdition,sourceUrl:m.sourceUrl,
 fieldProvenance:copy(m.fieldProvenance),
 order:m.order,previousMapId:m.previousMapId,wikiVersion:m.wikiVersion,
 advertisedNpcCount:m.advertisedNpcCount,npcListComplete:m.npcListComplete,
 bossIds:copy(m.bossIds),rewards:copy(m.rewards),mapRules:copy(m.mapRules),
 blockers:copy(m.blockers),readyForIntegration:m.readyForIntegration,
 npcs:m.npcs.map(n=>({
   id:n.id,wikiAiId:n.wikiAiId,mapId:n.mapId,order:n.order,name:n.name,
   level:n.level,kind:n.kind,boss:n.boss,
   totalSoldiersRaw:n.totalSoldiersRaw,
   observedUnitSoldierSum:n.observedUnitSoldierSum,
   unitSoldierDiscrepancy:n.unitSoldierDiscrepancy,
   soldierConsistency:n.soldierConsistency,
   firstMoverObserved:n.firstMoverObserved,
   stageExtraSkills:copy(n.stageExtraSkills),
   wikiNpcLordSkills:copy(n.wikiNpcLordSkills),
   wikiNpcPassiveSkills:copy(n.wikiNpcPassiveSkills),
   wikiNpcStageSkills:copy(n.wikiNpcStageSkills),
   reward:copy(n.reward),sourceVersion:n.sourceVersion,
   fieldProvenance:copy(n.fieldProvenance),
   sourceUrl:n.sourceUrl,formation:n.formation.map(unit),
   readyForIntegration:n.readyForIntegration,blockers:copy(n.blockers)
 }))
};}
function build(source,approvals={},size=12){
 if(!Number.isInteger(size)||size<1||size>50)throw Error('shardSize must be 1..50');
 const compiled=C.validateCatalogue(C.compileWikiDungeons(source,approvals));
 const maps=compiled.maps.map(mapRow),mapLocator={},shards=[];
 for(let start=0;start<maps.length;start+=size){
   const filename='shard-'+String(shards.length+1).padStart(3,'0')+'.json';
   const piece=maps.slice(start,start+size);
   for(const m of piece){
     if(mapLocator[m.id])throw Error('duplicate map id');
     mapLocator[m.id]={shard:filename,name:m.name,wikiMapId:m.wikiMapId,
       cityLevelRequired:m.cityLevelRequired,npcCount:m.npcs.length,
       readyForIntegration:m.readyForIntegration,blockers:copy(m.blockers),
       sourceUrl:m.sourceUrl};
   }
   shards.push({filename,body:{
     schemaVersion:1,kind:'NGOALONG_CAMPAIGN_SHARD',
     sourceEdition:compiled.sourceEdition,classicWebgameParity:'UNKNOWN',
     runtimeAuthority:false,runtimeEnabled:false,maps:piece
   }});
 }
 return {manifest:{
   schemaVersion:1,kind:'NGOALONG_CAMPAIGN_SHARD_INDEX',
   sourceEdition:compiled.sourceEdition,classicWebgameParity:'UNKNOWN',
   runtimeEnabled:false,source:compiled.sourceUrl,
   counts:compiled.counts,shardSize:size,shardCount:shards.length,
   mapLocator
 },shards};
}
function loadShard(manifest,shard){
 if(!manifest||manifest.kind!=='NGOALONG_CAMPAIGN_SHARD_INDEX'||
   !shard||shard.kind!=='NGOALONG_CAMPAIGN_SHARD'||
   shard.sourceEdition!==manifest.sourceEdition ||
   shard.classicWebgameParity!=='UNKNOWN' ||
   shard.runtimeEnabled!==false)throw Error('invalid shard version');
 for(const map of shard.maps){
   const pointer=manifest.mapLocator[map.id];
   if(!pointer||pointer.wikiMapId!==map.wikiMapId||
     pointer.npcCount!==map.npcs.length ||
     pointer.readyForIntegration!==map.readyForIntegration)throw Error('shard map index mismatch');
 }
 return C.validateCatalogue({
   kind:'NGOALONG_CAMPAIGN_CATALOGUE',
   sourceEdition:manifest.sourceEdition,
   classicWebgameParity:'UNKNOWN',runtimeEnabled:false,
   maps:copy(shard.maps)
 });
}
function assembleShards(manifest, documents, allowPartial=false){
 if(!Array.isArray(documents)||!documents.length)throw Error('no campaign shards');
 const seen=new Set(),maps=[];
 for(const shard of documents){
   const subset=loadShard(manifest,shard);
   for(const map of subset.maps){
     if(seen.has(map.id))throw Error('duplicate map loaded');
     seen.add(map.id);
     maps.push(map);
   }
 }
 if(!allowPartial&&seen.size!==Object.keys(manifest.mapLocator).length)
   throw Error('missing map shards for full campaign');
 return C.validateCatalogue({
   kind:'NGOALONG_CAMPAIGN_CATALOGUE',
   sourceEdition:manifest.sourceEdition,
   classicWebgameParity:'UNKNOWN',runtimeEnabled:false,maps
 });
}
module.exports=Object.freeze({build,loadShard,assembleShards,mapRow});
