'use strict';
/**
 * CHAT06 — deterministic full 249-map evidence audit.
 * Usage: node --max-old-space-size=2048 tools/nl_campaign_evidence_v5.js [--check]
 * Never edits or grants runtime identities, enemy statistics or Save.
 */
const fs=require('node:fs'),path=require('node:path');
const E=require('../data/ngoalong/modules/campaign/nl_campaign_evidence_v5.js');
const ROOT=path.resolve(__dirname,'..');
const ROOT_C='data/ngoalong/modules/campaign/';
const SRC='data/ngoalong/group02_wiki/';
const PREFIX=ROOT_C+'source_shards/';
const BATCH=ROOT_C+'evidence_batches/';
const INDEX=ROOT_C+'source_reconciliation_index_v5.json';
function read(p){return JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));}
function main(argv) {
 const check=argv.includes('--check');
 const manifest=read(PREFIX+'manifest.json');
 if(manifest.shardCount!==21 || manifest.counts.maps!==249 ||
    manifest.counts.npcRows!==4903||manifest.sourceEdition!=='CURRENT_VNG_MOBILE')
   throw Error('NL06 V5: source manifest has changed');
 const extra={
  patch:read(SRC+'dungeon_patch_history.json'),
  early:read(SRC+'early_campaign_10.json'),
  details:read(SRC+'npc_details.json'),
  indexed:read(SRC+'maps_npcs.json')
 };
 const batches=[];
 for(let i=0;i<3;i++) {
  const first=i*7+1;
  const shards=Array.from({length:7},(_,k)=>read(PREFIX+'shard-'+
    String(first+k).padStart(3,'0')+'.json'));
  const data=E.compileBatch(manifest,shards,extra);
  const pathname=BATCH+'batch-'+String(i+1).padStart(3,'0')+'.json';
  const content=JSON.stringify(data)+'\n';
  const destination=path.join(ROOT,pathname);
  if(check) {
   if(!fs.existsSync(destination)||
     fs.readFileSync(destination,'utf8')!==content)
     throw Error('NL06 V5: stale batch '+pathname);
  } else fs.writeFileSync(destination,content,'utf8');
  batches.push(data);
 }
 const merged=E.mergeBatches(manifest,batches,extra);
 if(merged.counts.maps!==249||merged.counts.npcRows!==4903||
  merged.counts.observedUnitRows!==23914||
  merged.counts.missingUnitSoldiers!==17850||
  merged.counts.sourceSoldierDiscrepancies!==344||
  merged.counts.nonExhaustiveFormations!==97||
  merged.counts.actualBackfills!==0||
  merged.counts.gameplayReady!==0||
  merged.unmatchedHistoricalEvents.length+
    merged.counts.historicalMapMatches!==extra.patch.events.length)
  throw Error('NL06 V5: critical source counts drifted; review Group02 before accepting');
 const index=E.makeIndex(merged),target=path.join(ROOT,INDEX);
 const content=JSON.stringify(index,null,2)+'\n';
 if(check) {
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)
   throw Error('NL06 V5: stale 249-map source index');
 } else fs.writeFileSync(target,content,'utf8');
 console.log(JSON.stringify({check,maps:merged.counts.maps,
  npcs:merged.counts.npcRows,missingSoldiers:merged.counts.missingUnitSoldiers,
  numericConflicts:merged.counts.sourceSoldierDiscrepancies,
  missingFormations:merged.counts.nonExhaustiveFormations,
  historicalMatches:merged.counts.historicalMapMatches,
  zeroRemainderAmbiguities:merged.counts.zeroRemainderAmbiguities,
  gameplayReady:0}));
 return index.counts;
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(err){console.error(err.stack||String(err));process.exitCode=1}
}
module.exports={main};
