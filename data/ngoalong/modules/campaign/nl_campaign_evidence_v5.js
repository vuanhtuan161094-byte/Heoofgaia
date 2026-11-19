'use strict';
/**
 * CHAT06 V5 — source-only evidence reconciliation across all Wiki dungeon shards.
 * No invented soldiers, identity binding, rewards, version parity or runtime edits.
 * The source audit has zero authority to enable a battle.
 */
const cp=x=>x==null?x:JSON.parse(JSON.stringify(x));
const valid=v=>Number.isSafeInteger(v)&&v>=0;
const norm=x=>typeof x==='string'?x.normalize('NFC').toLocaleLowerCase('vi').trim()
  .replace(/[\s–—-]+/g,' '):'';
const scope=(manifest)=>{
 if(!manifest||manifest.kind!=='NGOALONG_CAMPAIGN_SHARD_INDEX'||
   manifest.sourceEdition!=='CURRENT_VNG_MOBILE'||
   manifest.classicWebgameParity!=='UNKNOWN'||manifest.runtimeEnabled!==false)
   throw Error('NL06 V5: invalid source edition or runtime approval');
};
const sum=(xs,predicate)=>xs.reduce((a,x)=>a+(predicate(x)?1:0),0);
function sources(manifest,extra={}){
 scope(manifest);
 const maps=Object.entries(manifest.mapLocator||{});
 const byName=new Map();
 for(const [id,x] of maps){
  const key=norm(x.name);
  if(!byName.has(key))byName.set(key,[]);
  byName.get(key).push(id);
 }
 const patch=extra.patch||{events:[]},early=extra.early||{maps:[]},
   detail=extra.details||{npcDetails:[]},indexed=extra.indexed||{maps:[]};
 if(patch.classicWebgameParity&&patch.classicWebgameParity!=='UNKNOWN')
   throw Error('NL06 V5: patch edition mismatch');
 if(early.classicParity&&early.classicParity!=='UNKNOWN')
   throw Error('NL06 V5: early edition mismatch');
 if(detail.classicParity&&detail.classicParity!=='UNKNOWN')
   throw Error('NL06 V5: NPC snapshot edition mismatch');
 if(indexed.classicParity&&indexed.classicParity!=='UNKNOWN')
   throw Error('NL06 V5: index edition mismatch');
 const patchByMap=new Map(),unmatchedPatch=[];
 for(const evt of patch.events||[]){
  const ids=byName.get(norm(evt.mapName))||[];
  if(ids.length!==1){unmatchedPatch.push({
   id:evt.id,mapName:evt.mapName||null,
   reason:ids.length===0?'MAP_TITLE_NOT_FOUND':'MAP_TITLE_AMBIGUOUS',
   sourceUrl:evt.sourceUrl
  });continue;}
  const key=ids[0];
  if(!patchByMap.has(key))patchByMap.set(key,[]);
  patchByMap.get(key).push({
   id:evt.id,releaseId:evt.releaseId,publishedDate:evt.publishedDate,
   operation:evt.operation,component:evt.component,mapName:evt.mapName,
   npcName:evt.npcName,slot1Based:evt.slot1Based,
   previousValue:evt.previousValue??null,
   currentFromPatch:evt.currentFromPatch??null,
   sourceUrl:evt.sourceUrl,identityStatus:'MAP_TITLE_EXACT_UNIQUE',
   mechanicsStatus:'NOT_AUTO_APPLIED'
  });
 }
 const earlyById=new Map((early.maps||[]).filter(x=>valid(x.wikiMapQueryId))
  .map(x=>['wiki-map-'+x.wikiMapQueryId,x]));
 const detailById=new Map((detail.npcDetails||[]).filter(x=>
   valid(x.mapQueryId)&&valid(x.aiQueryId))
   .map(x=>['wiki-m'+x.mapQueryId+'-ai'+x.aiQueryId,x]));
 const indexedById=new Map((indexed.maps||[]).filter(x=>valid(x.mapQueryId))
   .map(x=>['wiki-map-'+x.mapQueryId,x]));
 return {patchByMap,unmatchedPatch,earlyById,detailById,indexedById};
}
function npcAudit(n,context={}){
 if(!n||typeof n.id!=='string'||!Array.isArray(n.formation))
   throw Error('NL06 V5: invalid NPC row');
 const slots=n.formation.map(u=>u.wikiSlot),unknown=n.formation
   .filter(u=>!valid(u.soldiers)).map(u=>u.wikiSlot);
 const troopUnknown=n.formation.filter(u=>u.troopWikiId==null).map(u=>u.wikiSlot);
 const skillUnknown=n.formation.filter(u=>!u.skill?.label).map(u=>u.wikiSlot);
 const missingIdentity=n.formation.filter(u=>!u.name).map(u=>u.wikiSlot);
 const known=n.formation.filter(u=>valid(u.soldiers));
 const sumKnown=known.reduce((s,u)=>s+u.soldiers,0);
 const exhaustive=!n.blockers?.includes('FORMATION_NOT_EXHAUSTIVE')&&
   n.formation.length>0&&n.formation.length<=5;
 const consistentKnown=unknown.length===0 && valid(n.totalSoldiersRaw) &&
   sumKnown===n.totalSoldiersRaw;
 const residual=valid(n.totalSoldiersRaw)?n.totalSoldiersRaw-sumKnown:null;
 const zeroRemainderAmbiguous=unknown.length===1&&exhaustive&&
   residual===0&&n.soldierConsistency!=='SOURCE_MISMATCH';
 const arithmeticCandidate=unknown.length===1&&exhaustive&&
   valid(n.totalSoldiersRaw)&&residual>0&&
   n.soldierConsistency!=='SOURCE_MISMATCH'
   ? {
     wikiSlot:unknown[0],
     proposedSoldiers:n.totalSoldiersRaw-sumKnown,
     classification:'DERIVED_ARITHMETIC_ONLY',
     status:'NEEDS_INDEPENDENT_WIKI_CONFIRMATION',
     usedInGameplay:false
   }:null;
 let snapshot=null;
 if(context.selected){
  const s=context.selected,slot=s.selectedUnit?.slot;
  const u=n.formation.find(x=>x.wikiSlot===slot);
  const checks=[];
  const compare=(field,source,observed)=>{
    if(source==null)return;
    const result=observed==null?'CURRENT_FIELD_MISSING':
      typeof source==='string'&&typeof observed==='string'
      ? norm(source)===norm(observed)?'AGREE':'CONFLICT'
      : source===observed?'AGREE':'CONFLICT';
    checks.push({field,source,observed:observed??null,result});
  };
  compare('npcName',s.npcName,n.name);
  if(u){
   compare('unitName',s.selectedUnit?.name,u.name);
   compare('soldiers',s.selectedUnit?.soldiers,u.soldiers);
   compare('troopName',s.selectedUnit?.troopName,u.troopName);
   compare('skillLabel',s.selectedUnit?.skillName,u.skill?.label);
  }
  snapshot={
   sourceId:s.id,sourceScope:s.scope||'ONE_SELECTED_UNIT_ONLY',
   wikiSlot:slot??null,unitSlotPresent:Boolean(u),
   checks,
   agreementCount:sum(checks,x=>x.result==='AGREE'),
   conflictCount:sum(checks,x=>x.result==='CONFLICT'),
   unknownCount:sum(checks,x=>x.result==='CURRENT_FIELD_MISSING'),
   autoBackfilled:false
  };
 }
 const reasons=[];
 if(!exhaustive)reasons.push('FORMATION_NOT_EXHAUSTIVE');
 if(unknown.length)reasons.push('UNIT_SOLDIERS_UNKNOWN');
 if(zeroRemainderAmbiguous)reasons.push('ZERO_REMAINDER_WITH_MISSING_UNIT_SOLDIERS');
 if(troopUnknown.length)reasons.push('WIKI_TROOP_IDS_UNKNOWN');
 if(skillUnknown.length)reasons.push('SKILL_LABELS_UNKNOWN');
 if(missingIdentity.length)reasons.push('UNIT_NAMES_UNKNOWN');
 if(n.soldierConsistency==='SOURCE_MISMATCH'||(unknown.length===0&&!consistentKnown))
   reasons.push('SOLDIER_SUM_MISMATCH');
 if(n.soldierConsistency==='UNKNOWN'&&!unknown.length)
   reasons.push('SOLDIER_SUM_NOT_VALIDATED');
 if(slots.some(x=>!valid(x)||x<1||x>9)||new Set(slots).size!==slots.length)
   reasons.push('FORMATION_SLOT_INVALID');
 if(!valid(n.order)||n.order<1)reasons.push('NPC_BATTLE_ORDER_UNKNOWN');
 return {
  id:n.id,wikiAiId:n.wikiAiId,name:n.name,order:n.order,kind:n.kind,
  boss:n.boss,sourceUrl:n.sourceUrl,
  observedUnitCount:n.formation.length,
  missingUnitSoldierSlots:unknown,
  missingTroopIdSlots:troopUnknown,missingSkillLabelSlots:skillUnknown,
  missingUnitIdentitySlots:missingIdentity,
  rawTotalSoldiers:n.totalSoldiersRaw,knownUnitSum:sumKnown,
  sourceSoldierConsistency:n.soldierConsistency,
  sourceFormationExhaustive:exhaustive,
  arithmeticCandidate,zeroRemainderAmbiguous,snapshot,blockers:reasons,
  runtimeApproved:false
 };
}
function indexedChecks(m,indexed){
 if(!indexed)return null;
 const checks=[];
 const compare=(field,other,current)=>{
  if(other==null)return;
  checks.push({field,other,current:current??null,status:current==null?'MISSING':
    norm(other)===norm(current)?'AGREE':'CONFLICT'});
 };
 compare('mapName',indexed.name,m.name);
 compare('cityLevel',indexed.cityLevelUnlock,m.cityLevelRequired);
 compare('mapLevel',indexed.mapLevel,m.mapLevel);
 compare('npcCount',indexed.totalNpcs,m.npcs.length);
 for(const ix of indexed.npcs||[]){
  const candidate=m.npcs.find(n=>n.order===ix.order);
  if(!candidate){checks.push({field:'npcOrder',order:ix.order,status:'NOT_FOUND'});continue;}
  const byName=m.npcs.filter(n=>norm(n.name)===norm(ix.name));
  const isUnique=byName.length===1;
  checks.push({field:'npcIdentity',order:ix.order,sourceName:ix.name,
    currentName:candidate.name,status:!isUnique?'AMBIGUOUS_OR_ABSENT':
     candidate.id===byName[0].id?'AGREE':'CONFLICT'});
  if(isUnique&&candidate.id===byName[0].id){
   compare('npc'+ix.order+'.soldiers',ix.soldiers,candidate.totalSoldiersRaw);
   compare('npc'+ix.order+'.level',ix.level,candidate.level);
  }
 }
 return {sourceId:indexed.sourceId,needsLiveBrowserConfirmation:
   indexed.needsLiveBrowserConfirmation===true,
   checks,autoBackfilled:false};
}
function auditMap(map,ctx){
 const pointer=ctx.manifest.mapLocator[map.id];
 if(!pointer||pointer.wikiMapId!==map.wikiMapId||
    pointer.npcCount!==map.npcs.length)throw Error('NL06 V5: source locator mismatch');
 const evts=ctx.evidence.patchByMap.get(map.id)||[];
 const npcRows=map.npcs.map(n=>npcAudit(n,{selected:ctx.evidence.detailById.get(n.id)}));
 const patches=evts.map(evt=>{
  if(!evt.npcName)return evt;
  const candidates=map.npcs.filter(n=>norm(n.name)===norm(evt.npcName));
  return {...evt,wikiAiId:candidates.length===1?candidates[0].wikiAiId:null,
    identityStatus:candidates.length===1?'MAP_AND_NPC_TITLE_EXACT_UNIQUE':
      candidates.length===0?'NPC_NOT_IN_CURRENT_ROSTER':'NPC_TITLE_AMBIGUOUS'};
 });
 const early=ctx.evidence.earlyById.get(map.id);
 const independent=[];
 if(early){
  independent.push({source:'early_campaign_10.json',
    mapIdAgrees:early.wikiMapQueryId===map.wikiMapId,
    mapNameAgrees:norm(early.name)===norm(map.name),
    cityLevelAgrees:early.cityLevelRequired===map.cityLevelRequired,
    advertisedNpcCountAgrees:early.npcCountAdvertised===map.advertisedNpcCount,
    selectedNpcIdentityChecks:(early.npcList||[]).map(x=>{
     const n=map.npcs.find(z=>z.wikiAiId===x.aiId);
     return {aiId:x.aiId,order:x.order,matched:Boolean(n),
       nameAgrees:Boolean(n&&norm(n.name)===norm(x.name)),
       soldierTotalAgrees:n&&valid(x.soldiers)?n.totalSoldiersRaw===x.soldiers:null}
    }),
    autoBackfilled:false});
 }
 const secondary=indexedChecks(map,ctx.evidence.indexedById.get(map.id));
 if(secondary)independent.push({source:'maps_npcs.json',...secondary});
 const stats={
  npcRows:npcRows.length,
  observedUnitRows:npcRows.reduce((s,n)=>s+n.observedUnitCount,0),
  missingUnitSoldiers:npcRows.reduce((s,n)=>s+n.missingUnitSoldierSlots.length,0),
  missingTroopIds:npcRows.reduce((s,n)=>s+n.missingTroopIdSlots.length,0),
  missingSkillLabels:npcRows.reduce((s,n)=>s+n.missingSkillLabelSlots.length,0),
  soldierDiscrepancies:sum(npcRows,n=>n.sourceSoldierConsistency==='SOURCE_MISMATCH'),
  nonExhaustiveFormations:sum(npcRows,n=>!n.sourceFormationExhaustive),
  arithmeticCandidates:sum(npcRows,n=>n.arithmeticCandidate!==null),
  zeroRemainderAmbiguities:sum(npcRows,n=>n.zeroRemainderAmbiguous===true),
  corroboratedSnapshotFacts:npcRows.reduce((s,n)=>s+(n.snapshot?.agreementCount||0),0),
  conflictingSnapshotFacts:npcRows.reduce((s,n)=>s+(n.snapshot?.conflictCount||0),0)
 };
 return {
  id:map.id,wikiMapId:map.wikiMapId,name:map.name,mapLevel:map.mapLevel,
  cityLevelRequired:map.cityLevelRequired,sourceUrl:map.sourceUrl,
  sourceEdition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
  npcRosterComplete:map.npcListComplete,
  advertisedNpcCount:map.advertisedNpcCount,
  stats,
  mapSourceBlockers:cp(map.blockers),
  sourceHistoricalEvents:patches,
  independentEvidence:independent,
  npcs:npcRows,
  runtimeAuthority:false,autoRepairedCount:0
 };
}
function compileBatch(manifest,shards,extra={}){
 scope(manifest);
 const evidence=sources(manifest,extra);
 const visited=new Set(),maps=[];
 for(const shard of shards){
  if(shard.kind!=='NGOALONG_CAMPAIGN_SHARD'||
     shard.sourceEdition!==manifest.sourceEdition||shard.runtimeEnabled!==false)
     throw Error('NL06 V5: invalid shard');
  for(const map of shard.maps){
   if(visited.has(map.id))throw Error('NL06 V5: duplicate map');
   visited.add(map.id);
   maps.push(auditMap(map,{manifest,evidence}));
  }
 }
 return {schemaVersion:1,kind:'NGOALONG_CAMPAIGN_EVIDENCE_BATCH',
  sourceEdition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
  runtimeAuthority:false,maps};
}
function mergeBatches(manifest,batches,extra={}){
 scope(manifest);
 const expected=new Set(Object.keys(manifest.mapLocator));
 const seen=new Set(),maps=[];
 for(const batch of batches){
  if(batch.kind!=='NGOALONG_CAMPAIGN_EVIDENCE_BATCH'||
   batch.sourceEdition!==manifest.sourceEdition||batch.runtimeAuthority!==false)
   throw Error('NL06 V5: invalid evidence batch');
  for(const m of batch.maps){
   if(!expected.has(m.id)||seen.has(m.id))throw Error('NL06 V5: unknown/duplicate map');
   seen.add(m.id);maps.push(m);
  }
 }
 if(seen.size!==expected.size)throw Error('NL06 V5: incomplete 249-map evidence');
 const counts={maps:maps.length,
  npcRows:maps.reduce((a,m)=>a+m.stats.npcRows,0),
  observedUnitRows:maps.reduce((a,m)=>a+m.stats.observedUnitRows,0),
  rosterComplete:sum(maps,m=>m.npcRosterComplete),
  missingUnitSoldiers:maps.reduce((a,m)=>a+m.stats.missingUnitSoldiers,0),
  missingTroopIds:maps.reduce((a,m)=>a+m.stats.missingTroopIds,0),
  missingSkillLabels:maps.reduce((a,m)=>a+m.stats.missingSkillLabels,0),
  sourceSoldierDiscrepancies:maps.reduce((a,m)=>a+m.stats.soldierDiscrepancies,0),
  nonExhaustiveFormations:maps.reduce((a,m)=>a+m.stats.nonExhaustiveFormations,0),
  arithmeticReviewCandidates:maps.reduce((a,m)=>a+m.stats.arithmeticCandidates,0),
  zeroRemainderAmbiguities:maps.reduce((a,m)=>a+m.stats.zeroRemainderAmbiguities,0),
  historicalMapMatches:maps.reduce((a,m)=>a+m.sourceHistoricalEvents.length,0),
  corroboratedSelectedUnitFacts:maps.reduce((a,m)=>a+m.stats.corroboratedSnapshotFacts,0),
  conflictingSelectedUnitFacts:maps.reduce((a,m)=>a+m.stats.conflictingSnapshotFacts,0),
  actualBackfills:0,gameplayReady:0
 };
 if(counts.maps!==manifest.counts.maps||
   counts.npcRows!==manifest.counts.npcRows||
   counts.sourceSoldierDiscrepancies!==manifest.counts.sourceSoldierContradictions)
   throw Error('NL06 V5: source count drift');
 maps.sort((a,b)=>a.wikiMapId-b.wikiMapId);
 const unmatched=sources(manifest,extra).unmatchedPatch;
 return {schemaVersion:1,kind:'NGOALONG_CAMPAIGN_EVIDENCE_AUDIT_V5',
  scope:'WIKI_CURRENT_MOBILE_REFERENCE_ONLY',
  classicParity:'UNKNOWN',runtimeAuthority:false,gameplayEnabled:false,
  manifestSource:'data/ngoalong/modules/campaign/source_shards/manifest.json',
  reportPolicy:'CANDIDATES_ARE_NOT_VERIFIED_FACTS_AND_NEVER_MUTATE_SOURCE',
  counts,unmatchedHistoricalEvents:unmatched,
  maps};
}
function makeIndex(report) {
 if(report?.kind!=='NGOALONG_CAMPAIGN_EVIDENCE_AUDIT_V5'||
    report.counts?.actualBackfills!==0||report.gameplayEnabled!==false)
   throw Error('NL06 V5: unsafe report for reference index');
 return {
  schemaVersion:1,kind:report.kind,scope:report.scope,
  classicParity:report.classicParity,gameplayEnabled:false,runtimeAuthority:false,
  sourceAuditBatches:[1,2,3].map(i=>
    'data/ngoalong/modules/campaign/evidence_batches/batch-'+
     String(i).padStart(3,'0')+'.json'),
  reportPolicy:report.reportPolicy,counts:report.counts,
  unmatchedHistoricalEvents:report.unmatchedHistoricalEvents,
  maps:report.maps.map(m=>({
   id:m.id,wikiMapId:m.wikiMapId,name:m.name,
   sourceUrl:m.sourceUrl,cityLevelRequired:m.cityLevelRequired,
   npcCount:m.stats.npcRows,rosterComplete:m.npcRosterComplete,
   missingUnitSoldiers:m.stats.missingUnitSoldiers,
   missingTroopIds:m.stats.missingTroopIds,
   missingSkillLabels:m.stats.missingSkillLabels,
   soldierDiscrepancies:m.stats.soldierDiscrepancies,
   nonExhaustiveFormations:m.stats.nonExhaustiveFormations,
   arithmeticReviewCandidates:m.stats.arithmeticCandidates,
   zeroRemainderAmbiguities:m.stats.zeroRemainderAmbiguities,
   corroboratedSelectedUnitFacts:m.stats.corroboratedSnapshotFacts,
   conflictingSelectedUnitFacts:m.stats.conflictingSnapshotFacts,
   historicalEvents:m.sourceHistoricalEvents.map(e=>({
    eventId:e.id,releaseId:e.releaseId,mapStatus:e.identityStatus,
    npcAiId:e.wikiAiId??null,sourceUrl:e.sourceUrl,
    operation:e.operation,publishedDate:e.publishedDate
   })),
   independentEvidence:m.independentEvidence.map(e=>({
    source:e.source,mapNameAgrees:e.mapNameAgrees??null,
    cityLevelAgrees:e.cityLevelAgrees??null,sourceId:e.sourceId??null,
    autoBackfilled:false
   })),
   gameplayReady:false,
   nextStep:m.stats.missingUnitSoldiers||m.stats.nonExhaustiveFormations||
     m.stats.soldierDiscrepancies?
    'VERIFY_MISSING_OR_CONTRADICTORY_SOURCE':
    'BIND_APPROVED_COMBAT_IDS_AND_MECHANICS'
  }))
 };
}

module.exports=Object.freeze({norm,sources,npcAudit,auditMap,compileBatch,mergeBatches,makeIndex});
