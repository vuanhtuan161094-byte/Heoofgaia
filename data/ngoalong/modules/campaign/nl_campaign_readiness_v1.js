'use strict';
/*
 * CHAT06 V4 — rank *source-structural* map candidates without promoting Wiki
 * mobile content to playable combat. Read only committed campaign shards.
 */
function hasInteger(v){return Number.isInteger(v)&&v>=0}
function unitsOf(n){return Array.isArray(n.formation)?n.formation:[]}
function analyzeNpc(n){
 const reasons=[];
 const units=unitsOf(n);
 const slots=units.map(u=>u.wikiSlot);
 if(!hasInteger(n.order)||n.order<1)reasons.push('NPC_ORDER_UNKNOWN');
 if(!hasInteger(n.totalSoldiersRaw))reasons.push('NPC_TOTAL_SOLDIERS_UNKNOWN');
 if(!units.length||units.length>5)reasons.push('TEAM_SIZE_INVALID');
 if(slots.some(s=>!Number.isInteger(s)||s<1||s>9)||
    new Set(slots).size!==slots.length)reasons.push('SLOT_3X3_INVALID');
 if(units.some(u=>u.formationSlot!==u.wikiSlot-1))reasons.push('SLOT_ORIENTATION_UNREVIEWED');
 if(units.some(u=>!hasInteger(u.soldiers)))reasons.push('UNIT_SOLDIERS_UNKNOWN');
 if(n.soldierConsistency==='SOURCE_MISMATCH')reasons.push('SOLDIER_SUM_CONTRADICTION');
 if(n.soldierConsistency!=='MATCH')reasons.push('SOLDIER_SUM_NOT_PROVEN');
 if(n.blockers?.includes('FORMATION_NOT_EXHAUSTIVE'))reasons.push('FORMATION_NOT_EXHAUSTIVE');
 if(units.some(u=>!u.name))reasons.push('UNIT_IDENTITY_UNKNOWN');
 const skillLabelsMissing=units.filter(u=>!u.skill?.label).length;
 const troopIdsMissing=units.filter(u=>u.troopWikiId==null).length;
 if(skillLabelsMissing)reasons.push('SKILL_LABELS_MISSING');
 if(troopIdsMissing)reasons.push('WIKI_TROOP_IDS_MISSING');
 // Source structural status is narrower than mechanics and version approval.
 const sourceStructuralReady=!reasons.some(r=>[
  'NPC_ORDER_UNKNOWN','NPC_TOTAL_SOLDIERS_UNKNOWN','TEAM_SIZE_INVALID',
  'SLOT_3X3_INVALID','SLOT_ORIENTATION_UNREVIEWED','UNIT_SOLDIERS_UNKNOWN',
  'SOLDIER_SUM_CONTRADICTION','SOLDIER_SUM_NOT_PROVEN',
  'FORMATION_NOT_EXHAUSTIVE','UNIT_IDENTITY_UNKNOWN'
 ].includes(r));
 return {id:n.id,order:n.order,boss:n.boss===true,
   unitCount:units.length,sourceStructuralReady,
   missingUnitSoldiers:units.filter(u=>!hasInteger(u.soldiers)).length,
   missingSkillLabels:skillLabelsMissing,missingTroopIds:troopIdsMissing,
   blockers:reasons};
}
function analyzeMap(map){
 const npcs=(Array.isArray(map.npcs)?map.npcs:[]).map(analyzeNpc);
 const issues=[];
 const orders=npcs.map(n=>n.order);
 if(!map.npcListComplete||map.advertisedNpcCount!==npcs.length)
   issues.push('ROSTER_NOT_EXHAUSTIVE');
 if(!npcs.length||orders.some((v,i)=>v!==i+1))
   issues.push('NPC_BATTLE_ORDER_NOT_VERIFIED');
 if(!hasInteger(map.cityLevelRequired))issues.push('MAP_UNLOCK_LEVEL_UNKNOWN');
 if(npcs.some(n=>!n.sourceStructuralReady))issues.push('NPC_SOURCE_STRUCTURE_INCOMPLETE');
 const sourceStructuralReady=issues.length===0;
 return {id:map.id,wikiMapId:map.wikiMapId,name:map.name,
  sourceEdition:map.sourceEdition,sourceUrl:map.sourceUrl,
  cityLevelRequired:map.cityLevelRequired,
  npcCount:npcs.length,bossCount:npcs.filter(n=>n.boss).length,
  allNpcSourceStructureReady:sourceStructuralReady,
  gameplayReady:map.readyForIntegration===true,
  sourceBlockers:issues,
  unverifiedMechanics:['COMBAT_HERO_TROOP_SKILL_CROSSWALK',
    'DUNGEON_AND_NPC_EXCLUSIVE_SKILLS','MAP_REWARD_AND_UNLOCK_AUTHORITY',
    'SAVE_V5_RECEIPTS_AND_REPLAY','MOBILE_CLASSIC_PARITY'],
  missingUnitSoldiers:npcs.reduce((sum,n)=>sum+n.missingUnitSoldiers,0),
  missingSkillLabels:npcs.reduce((sum,n)=>sum+n.missingSkillLabels,0),
  missingTroopIds:npcs.reduce((sum,n)=>sum+n.missingTroopIds,0),
  npcRows:npcs};
}
function compareCandidate(a,b) {
 return Number(b.allNpcSourceStructureReady)-Number(a.allNpcSourceStructureReady) ||
   Number(a.missingUnitSoldiers)-Number(b.missingUnitSoldiers) ||
   Number(a.missingTroopIds)-Number(b.missingTroopIds) ||
   Number(a.missingSkillLabels)-Number(b.missingSkillLabels) ||
   Number(a.npcCount)-Number(b.npcCount) ||
   Number(a.wikiMapId)-Number(b.wikiMapId);
}
function produce(manifest,shards){
 if(manifest?.kind!=='NGOALONG_CAMPAIGN_SHARD_INDEX'||
    manifest.sourceEdition!=='CURRENT_VNG_MOBILE'||
    manifest.classicWebgameParity!=='UNKNOWN'||
    manifest.runtimeEnabled!==false)throw Error('source scope not accepted');
 if(!Array.isArray(shards)||!shards.length)throw Error('no source shards');
 const expected=new Set(Object.keys(manifest.mapLocator||{})),found=new Set(),maps=[];
 for(const shard of shards) {
  if(shard?.kind!=='NGOALONG_CAMPAIGN_SHARD'||
      shard.sourceEdition!==manifest.sourceEdition||
      shard.runtimeEnabled!==false)throw Error('invalid source shard');
  for(const map of shard.maps||[]){
    if(!expected.has(map.id)||found.has(map.id))throw Error('unknown or duplicate map '+map.id);
    const pointer=manifest.mapLocator[map.id];
    if(pointer.wikiMapId!==map.wikiMapId||pointer.npcCount!==map.npcs?.length)
      throw Error('map index does not match source '+map.id);
    found.add(map.id); maps.push(analyzeMap(map));
  }
 }
 if(found.size!==expected.size)throw Error('missing source shard maps');
 const ordered=maps.sort(compareCandidate);
 return {
   schemaVersion:1,kind:'NGOALONG_CAMPAIGN_SOURCE_READINESS',
   sourceEdition:manifest.sourceEdition,classicParity:'UNKNOWN',
   runtimeEnabled:false,authority:'REFERENCE_ONLY',
   sourceManifest:'data/ngoalong/modules/campaign/source_shards/manifest.json',
   counts:{
     sourceMaps:maps.length,
     sourceNpcRows:maps.reduce((v,m)=>v+m.npcCount,0),
     sourceStructurallyCompleteMaps:maps.filter(m=>m.allNpcSourceStructureReady).length,
     playableMaps:maps.filter(m=>m.gameplayReady).length,
     missingUnitSoldiers:maps.reduce((v,m)=>v+m.missingUnitSoldiers,0),
     missingSkillLabels:maps.reduce((v,m)=>v+m.missingSkillLabels,0),
     missingTroopIds:maps.reduce((v,m)=>v+m.missingTroopIds,0)
   },
   candidates:ordered.map(({npcRows,...map})=>({
     ...map,
     npcBlockers:npcRows.filter(n=>n.blockers.length).map(n=>({
       id:n.id,order:n.order,sourceStructuralReady:n.sourceStructuralReady,
       blockers:n.blockers
     }))
   }))
 };
}
module.exports={analyzeNpc,analyzeMap,produce};
