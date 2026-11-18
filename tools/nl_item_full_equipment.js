'use strict';
/* Final offline build phase for verified 392-row VNG Mobile equipment INDEX.
 * Requires a real captured Wiki snapshot (all seven filter tabs verified).
 * Creates distinct PROJECT-ORIGINAL gameplay stats, never VNG mechanics.
 */
const fs=require('node:fs'),path=require('node:path');
const { playableFromWiki }=require('./nl_item_build_equipment.js');
const EXPECTED=392;
const SLOTS=new Set(['weapon','armor','horse','book','cloak','shield','artifact']);
const copy=v=>JSON.parse(JSON.stringify(v));
const signature=x=>x.name.normalize('NFC')+'|'+x.displayedLevel+'|'+x.slot;
function buildFullCatalogue(original,snapshot){
  const index=snapshot?.domains?.equipment;
  if(!index||index.extracted!==EXPECTED||index.rows?.length!==EXPECTED||
    index.slotAudit?.method!=='PUBLIC_WIKI_FILTERED_BUTTONS'||
    index.slotAudit.verifiedRows!==EXPECTED)throw new Error('WIKI_392_VERIFIED_FILTER_SNAPSHOT_REQUIRED');
  if(!original || !Array.isArray(original.equipment))throw new Error('MISSING_CATALOGUE');
  const pack=copy(original),reference=pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY');
  const projects=pack.equipment.filter(x=>x.integration==='PLAYABLE');
  const existing=new Map(),claimed=new Set();
  for(const row of reference){
    if(row.category!=='equipment')continue;
    const key=signature(row);
    if(!existing.has(key))existing.set(key,[]);
    existing.get(key).push(row);
  }
  const ids=new Set(pack.equipment.map(x=>x.id));
  const names=new Set();
  let additions=0;
  for(const row of index.rows){
    if(!row||row.integration!=='REFERENCE_ONLY'||row.provenance?.classification!=='VERIFIED'||
      !SLOTS.has(row.slot)||row.fieldProvenance?.slot!=='VERIFIED'||
      !row.name||!Number.isSafeInteger(row.displayedLevel)||row.displayedLevel<1||
      !String(row.id).startsWith('wiki-index-eq-'))throw new Error('UNVERIFIED_INDEX_ROW');
    if(names.has(row.id))throw new Error('INDEX_DUPLICATE_ID');
    names.add(row.id);
    const match=(existing.get(signature(row))||[]).find(x=>!claimed.has(x.id));
    if(match){
      claimed.add(match.id);
      continue;
    }
    if(ids.has(row.id))throw new Error('REFERENCE_ID_COLLISION');
    const newRef={...copy(row),category:'equipment',sourceRecordId:row.id,
      fieldProvenance:{...row.fieldProvenance,requiredLevel:'UNKNOWN',rarity:'UNKNOWN',
        stats:'UNKNOWN',effectRule:'UNKNOWN',acquisitionRule:'UNKNOWN',
        enhancementRule:'UNKNOWN'},
      provenance:{...row.provenance,classification:'VERIFIED'}};
    const live=playableFromWiki(newRef);
    if(ids.has(live.id))throw new Error('PROJECT_ID_COLLISION');
    pack.equipment.push(newRef,live);
    ids.add(newRef.id);ids.add(live.id);
    additions++;
  }
  const numReference=pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length;
  const numPlayable=pack.equipment.filter(x=>x.integration==='PLAYABLE').length;
  if(numReference!==EXPECTED||numPlayable!==EXPECTED+19){
    throw new Error('FULL_BUILD_COUNT_MISMATCH_'+numReference+'_'+numPlayable);
  }
  pack.wikiIndexCounts.equipmentRecorded=EXPECTED;
  pack.projectGearExpansion={
    status:'392_PROJECT_GEAR_MODELS_READY_IN_MODULE',sourceRecords:EXPECTED,
    projectModels:EXPECTED,projectFormula:'SIMULATED',
    wikiStatsCopied:false,noRuntimeIntegrationClaim:true,
    sourceEvidence:'PUBLIC_WIKI_FILTERED_BUTTONS',
    additions,existingProjectOriginals:19,sourceEdition:'VNG_WIKI_MOBILE_CURRENT',
    classicParity:'UNKNOWN'
  };
  return pack;
}
if(require.main===module){
  const file=path.join(__dirname,'../data/ngoalong/modules/items/catalogue.json');
  const snapshotFile=path.join(__dirname,'../data/ngoalong/modules/items/wiki_index_snapshot.json');
  const argv=process.argv.slice(2);
  if(!fs.existsSync(snapshotFile))throw new Error('RUN_nl_item_wiki_index.js_--write_FIRST');
  const catalogue=JSON.parse(fs.readFileSync(file,'utf8'));
  const snapshot=JSON.parse(fs.readFileSync(snapshotFile,'utf8'));
  const output=JSON.stringify(buildFullCatalogue(catalogue,snapshot),null,2)+'\n';
  if(argv.includes('--write')){
    fs.writeFileSync(file,output,'utf8');
    console.log('WROTE verified 392 project equipment models');
  }else if(argv.includes('--check')){
    if(fs.readFileSync(file,'utf8')!==output)throw new Error('FULL_CATALOGUE_NOT_BUILT');
    console.log('FULL_392_SYNC_OK');
  }else console.log('Usage: node tools/nl_item_full_equipment.js --write|--check');
}
module.exports={buildFullCatalogue};
