'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const srcPath='data/ngoalong/group02_wiki/wiki_dungeons_extracted.json';
const srcBytes=fs.readFileSync(path.join(ROOT,srcPath));
const src=JSON.parse(srcBytes.toString('utf8'));
const report=read('data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json');
const importer=require('../tools/nl_campaign_extract_import_v1.js');
const binder=require('../tools/nl_campaign_binding_backlog_v1.js');
const S=require('../data/ngoalong/modules/campaign/nl_campaign_shards_v1.js');
const dir='data/ngoalong/modules/campaign/source_shards/';
const result=importer.build(src,{},12);
const coverage=importer.audit(result,report);
const refTroops=[
 ...read('data/ngoalong/references/combat_troops_mobile_v1.json').units,
 ...read('data/ngoalong/references/combat_troops_wiki_supplement_v1.json').units
];
test('pinned Git blob, VNG Mobile edition and exact source row counts',()=>{
 const sha=crypto.createHash('sha1')
   .update('blob '+srcBytes.length+'\0').update(srcBytes).digest('hex');
 assert.equal(sha,'7318568320612ccd4c3c31bd762010609347c893');
 assert.equal(src.edition,'CURRENT_VNG_MOBILE');
 assert.equal(src.classicParity,'UNKNOWN');
 assert.equal(coverage.maps,249);
 assert.equal(coverage.npcs,4903);
 assert.equal(coverage.sourceRosterComplete,170);
 assert.equal(coverage.sourceRosterIncomplete,79);
 assert.equal(coverage.fullyEnumeratedFormations,4806);
 assert.equal(coverage.numericSoldierContradictions,344);
});
test('all 21 committed Wiki shards and index are byte-reproducible',()=>{
 assert.equal(result.shards.length,21);
 assert.equal(fs.readFileSync(path.join(ROOT,dir+'manifest.json'),'utf8'),
   JSON.stringify(result.manifest,null,2)+'\n');
 assert.equal(fs.readFileSync(path.join(ROOT,dir+'coverage.json'),'utf8'),
   JSON.stringify(coverage,null,2)+'\n');
 for(const item of result.shards)
   assert.equal(fs.readFileSync(path.join(ROOT,dir+item.filename),'utf8'),
     JSON.stringify(item.body)+'\n','stale Wiki shard '+item.filename);
});
test('catalogue reassembles all 249 maps / 4903 unique NPC IDs without fake combat IDs',()=>{
 const joined=S.assembleShards(result.manifest,result.shards.map(x=>x.body));
 assert.equal(joined.maps.length,249);
 assert.equal(joined.maps.reduce((v,m)=>v+m.npcs.length,0),4903);
 assert.equal(joined.maps.filter(m=>m.readyForIntegration).length,0);
 for(const m of joined.maps){
   assert.equal(m.sourceEdition,'CURRENT_VNG_MOBILE');
   assert.equal(m.readyForIntegration,false);
   assert.equal(m.order,null,'map chronological order is not a Wiki map ID');
   for(const n of m.npcs)for(const u of n.formation){
     assert.equal(u.heroId,null);
     assert.equal(u.troopId,null);
     assert.equal(u.skill.skillId,null);
   }
 }
});
test('raw Khúc Dương NPC formation, source slot, skills and Boss are preserved',()=>{
 const m=result.shards[0].body.maps[0];
 assert.equal(m.name,'Khúc Dương');
 assert.deepEqual(m.npcs.map(n=>n.wikiAiId),[75,77,81,82,83]);
 assert.equal(m.npcs[0].formation[0].wikiSlot,5);
 assert.equal(m.npcs[0].formation[0].formationSlot,4);
 assert.equal(m.npcs[0].formation[0].skill.label,'Thiết Bích');
 assert.equal(m.npcs[1].boss,true);
 assert.equal(m.npcs[4].boss,false);
 assert.equal(m.npcs[0].sourceUrl.includes('map=1&ai=75'),true);
});
test('source conflicts stay visible and missing unit soldiers are not inferred',()=>{
 const all=result.shards.flatMap(s=>s.body.maps.flatMap(m=>m.npcs));
 const mismatches=all.filter(n=>n.soldierConsistency==='SOURCE_MISMATCH');
 const missingUnits=all.reduce((sum,n)=>sum+n.formation.filter(u=>u.soldiers==null).length,0);
 assert.equal(mismatches.length,344);
 assert.equal(missingUnits,17850);
 assert.ok(mismatches.every(n=>n.blockers.includes('SOURCE_SOLDIER_CONTRADICTION')));
 assert.equal(all.length,4903);
});
test('crosswalk covers real troop/skill identities but grants no runtime authority',()=>{
 const generated=binder.make(src,refTroops);
 assert.deepEqual(generated,read('data/ngoalong/modules/campaign/wiki_binding_backlog_v1.json'));
 assert.equal(generated.counts.uniqueWikiTroopIds,346);
 assert.equal(generated.counts.uniqueSkillNamespaceLabels,1972);
 assert.equal(generated.counts.npcExclusiveSkillOccurrences,3595);
 assert.equal(generated.counts.troopIdsWithOneNameCandidate,302);
 assert.equal(generated.counts.troopIdsWithAmbiguousNameCandidates,9);
 assert.ok(generated.troopCrosswalk.every(x=>x.approvedRuntimeTroopId===null));
 assert.ok(generated.skillCrosswalk.every(x=>x.approvedRuntimeSkillId===null));
});
test('invalid 3x3 positions and source soldier totals are never silently repaired',()=>{
 const fake=JSON.parse(JSON.stringify(src.maps[0]));
 fake.npcs[0].unitsObserved[0].slot=10;
 const wrapped={edition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
   runtimeAuthority:false,maps:[fake]};
 assert.throws(()=>importer.toBlueprint(wrapped),/out of bounds Wiki slot/);
 const fake2=JSON.parse(JSON.stringify(src.maps[0]));
 fake2.npcs[0].totalSoldiers+=11;
 const invalid={edition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
   runtimeAuthority:false,maps:[fake2]};
 assert.throws(()=>importer.toBlueprint(invalid),/source soldier flag differs/);
});
