'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../data/ngoalong/modules/campaign/nl_campaign_evidence_v5.js');
const root=path.resolve(__dirname,'..');
const unit=(slot,soldiers=100)=>({wikiSlot:slot,formationSlot:slot-1,
 name:'Đội '+slot,troopWikiId:'10',troopName:'Bộ',soldiers,
 skill:{label:'Thiết Bích',skillId:null}});
const npc=(ai=77)=>({id:'wiki-m1-ai'+ai,wikiAiId:ai,name:'Cao Thăng',
 order:1,kind:'BOSS',boss:true,sourceUrl:'https://example.org',
 totalSoldiersRaw:100,soldierConsistency:'MATCH',
 formation:[unit(5)],blockers:[],readyForIntegration:false});
const map=()=>({id:'wiki-map-1',wikiMapId:1,name:'Khúc Dương',
 cityLevelRequired:20,mapLevel:10,npcListComplete:true,
 advertisedNpcCount:1,sourceUrl:'https://example.org',
 blockers:[],npcs:[npc()]});
const manifest=()=>({kind:'NGOALONG_CAMPAIGN_SHARD_INDEX',
 sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',
 runtimeEnabled:false,counts:{maps:1,npcRows:1,sourceSoldierContradictions:0},
 mapLocator:{'wiki-map-1':{wikiMapId:1,name:'Khúc Dương',npcCount:1}}});
const shard=m=>({kind:'NGOALONG_CAMPAIGN_SHARD',
 sourceEdition:'CURRENT_VNG_MOBILE',runtimeEnabled:false,maps:[m]});
test('Wiki source NPC remains reference-only even with complete 3x3 slot data',()=>{
 const n=npc(),r=E.npcAudit(n);
 assert.equal(r.blockers.length,0);
 assert.equal(r.runtimeApproved,false);
 assert.equal(r.arithmeticCandidate,null);
 assert.equal(r.missingUnitSoldierSlots.length,0);
});
test('unknown soldiers with zero remainder are never invented as zero troops',()=>{
 const n=npc();n.formation[0].soldiers=null;
 n.soldierConsistency='UNKNOWN';n.totalSoldiersRaw=0;
 const r=E.npcAudit(n);
 assert.equal(r.zeroRemainderAmbiguous,true);
 assert.equal(r.arithmeticCandidate,null);
 assert.ok(r.blockers.includes('ZERO_REMAINDER_WITH_MISSING_UNIT_SOLDIERS'));
 assert.equal(n.formation[0].soldiers,null);
});
test('positive one-slot residual is an unapproved candidate, not a source edit',()=>{
 const n=npc();n.formation.push(unit(6,null));
 n.totalSoldiersRaw=160;n.soldierConsistency='UNKNOWN';
 const r=E.npcAudit(n);
 assert.equal(r.arithmeticCandidate.proposedSoldiers,60);
 assert.equal(r.arithmeticCandidate.classification,'DERIVED_ARITHMETIC_ONLY');
 assert.equal(r.arithmeticCandidate.usedInGameplay,false);
 assert.equal(n.formation[1].soldiers,null);
});
test('contradictory NPC soldier sum prohibits algebraic candidate',()=>{
 const n=npc();n.formation[0].soldiers=null;
 n.soldierConsistency='SOURCE_MISMATCH';
 assert.equal(E.npcAudit(n).arithmeticCandidate,null);
 assert.ok(E.npcAudit(n).blockers.includes('SOLDIER_SUM_MISMATCH'));
});
test('independent selected-unit snapshot: agreement and conflict are kept, not patched',()=>{
 const n=npc();
 const r=E.npcAudit(n,{selected:{id:'m1-ai77',npcName:'Cao Thăng',
  scope:'ONE_VISIBLE_SELECTED_UNIT_NOT_FULL_TEAM',
  selectedUnit:{slot:5,name:'Đội 5',soldiers:100,
   troopName:'Bộ',skillName:'Thiết Bích'}}});
 assert.equal(r.snapshot.agreementCount,5);
 assert.equal(r.snapshot.conflictCount,0);
 assert.equal(r.snapshot.autoBackfilled,false);
 const conflict=E.npcAudit(n,{selected:{id:'m1-ai77',npcName:'Cao Thăng',
   selectedUnit:{slot:5,name:'Đội 5',soldiers:999}}});
 assert.equal(conflict.snapshot.conflictCount,1);
 assert.equal(n.formation[0].soldiers,100);
});
test('historical patch matches only unique map title and no mechanics are applied',()=>{
 const m=manifest();
 const evt={id:'EVT-1',mapName:'Khúc Dương',npcName:'Cao Thăng',
  publishedDate:'2024-01-02',operation:'NPC_UNIT_CHANGED',
  sourceUrl:'https://example.org'};
 const ext={patch:{classicWebgameParity:'UNKNOWN',events:[evt]}};
 const s=E.sources(m,ext);
 const row=E.auditMap(map(),{manifest:m,evidence:s});
 assert.equal(row.sourceHistoricalEvents.length,1);
 assert.equal(row.sourceHistoricalEvents[0].wikiAiId,77);
 assert.equal(row.sourceHistoricalEvents[0].mechanicsStatus,'NOT_AUTO_APPLIED');
 assert.equal(row.autoRepairedCount,0);
 const dup=manifest();dup.mapLocator['wiki-map-2']={wikiMapId:2,name:'Khúc Dương',npcCount:1};
 const ambiguous=E.sources(dup,ext);
 assert.equal(ambiguous.unmatchedPatch[0].reason,'MAP_TITLE_AMBIGUOUS');
});
test('duplicate/missing map, unreviewed edition, gameplay enable are rejected',()=>{
 const m=manifest(),s=shard(map()),b=E.compileBatch(m,[s]);
 assert.throws(()=>E.compileBatch({...m,runtimeEnabled:true},[s]),/edition/);
 assert.throws(()=>E.compileBatch(m,[s,s]),/duplicate/);
 assert.throws(()=>E.mergeBatches({...m,mapLocator:{...m.mapLocator,
  'wiki-map-2':{wikiMapId:2,name:'Map 2',npcCount:1}}},[b]),/incomplete/);
 const report=E.mergeBatches(m,[b]),index=E.makeIndex(report);
 assert.equal(index.counts.maps,1);
 assert.equal(index.maps[0].gameplayReady,false);
 assert.equal(index.counts.actualBackfills,0);
 assert.throws(()=>E.makeIndex({...report,gameplayEnabled:true}),/unsafe/);
});
test('committed 249-map evidence batches and index agree exactly',()=>{
 const prefix='data/ngoalong/modules/campaign/';
 const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const manifest=get(prefix+'source_shards/manifest.json');
 const patch=get('data/ngoalong/group02_wiki/dungeon_patch_history.json');
 const batches=[1,2,3].map(i=>get(prefix+'evidence_batches/batch-'+
  String(i).padStart(3,'0')+'.json'));
 const report=E.mergeBatches(manifest,batches,{patch});
 const index=E.makeIndex(report);
 assert.equal(index.counts.maps,249);
 assert.equal(index.counts.npcRows,4903);
 assert.equal(index.counts.observedUnitRows,23914);
 assert.equal(index.counts.missingUnitSoldiers,17850);
 assert.equal(index.counts.sourceSoldierDiscrepancies,344);
 assert.equal(index.counts.nonExhaustiveFormations,97);
 assert.equal(index.counts.zeroRemainderAmbiguities,3);
 assert.equal(index.counts.arithmeticReviewCandidates,0);
 assert.equal(index.counts.actualBackfills,0);
 assert.equal(index.counts.gameplayReady,0);
 assert.equal(report.unmatchedHistoricalEvents.length,11);
 assert.equal(index.counts.historicalMapMatches,59);
 assert.equal(index.counts.corroboratedSelectedUnitFacts,32);
 assert.equal(index.counts.conflictingSelectedUnitFacts,0);
 assert.equal(JSON.stringify(index,null,2)+'\n',
  fs.readFileSync(path.join(root,prefix+'source_reconciliation_index_v5.json'),'utf8'));
});

test('seven selected Wiki skill facts are exact, non-playable, and reproducible',()=>{
 const src='data/ngoalong/group02_wiki/';
 const modulePath='data/ngoalong/modules/campaign/';
 const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const build=require('../tools/nl_campaign_verified_facts_v5.js').build;
 const original=get(modulePath+'verified_secondary_wiki_facts_v5.json');
 const generated=build(get(src+'npc_details.json'),get(src+'maps_npcs.json'),
   get(modulePath+'evidence_batches/batch-001.json'));
 assert.deepEqual(generated,original);
 assert.equal(generated.counts.npcSnapshots,7);
 assert.equal(generated.counts.skillFacts,4);
 assert.equal(generated.counts.verifiedFieldComparisons,32);
 assert.equal(generated.counts.gameplaySkillBindings,0);
 assert.ok(generated.facts.every(x=>x.autoAppliedToGame===false&&
   x.approvedCombatSkillId===null&&x.fullNpcFormationVerified===false));
 assert.equal(generated.facts[0].selectedUnitCombatFact.skillAttackPercent,35);
});

test('repair queue for every 249-map Wiki record is reproducible and never grants gameplay',()=>{
 const base='data/ngoalong/modules/campaign/';
 const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const index=get(base+'source_reconciliation_index_v5.json');
 const queue=get(base+'source_repair_queue_v5.json');
 const make=require('../tools/nl_campaign_repair_queue_v5.js').make;
 assert.deepEqual(make(index),queue);
 assert.equal(queue.maps.length,249);
 assert.equal(queue.counts.P0,8);
 assert.equal(queue.counts.P1,2);
 assert.equal(queue.maps.every(m=>m.sourceDataApprovedForCombat===false),true);
 assert.equal(queue.maps.find(m=>m.wikiMapId===1).missingUnitSoldiers,1);
 assert.equal(queue.maps.find(m=>m.wikiMapId===2).missingUnitSoldiers,3);
 assert.equal(queue.gameplayEnabled,false);
});
