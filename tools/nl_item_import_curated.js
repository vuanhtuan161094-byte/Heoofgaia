'use strict';
// Convert the 392 reviewed PUBLIC WIKI INDEX names into original playable project
// equipment. No proprietary Wiki stat/bonus/cost/drop formula is imported.
// Source displayed levels and groups are VERIFIED; slot mapping is DERIVED.
// This importer intentionally does NOT claim the seven filtered views were
// executed. A separate strict browser crawler remains available.
const fs = require('node:fs');
const path = require('node:path');
const { playableFromWiki, SET_IDS } = require('./nl_item_build_equipment.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const EXPECTED_GROUPS={
  'Cùng Kỳ':7,'Thao Thiết':7,'Xi Vưu':7,'Hình Thiên':7,'Viêm Đế':7,
  'Nữ Oa':7,'Phục Hi':7,'Hiên Viên':7,'Hỗn Độn':7,'Bàn Cổ':7,
  'Diệt Thế':7,'Thần Hoàng':7,'Thái Sơ':38,'Thượng Cổ':37,
  'Truyền thuyết':40,'Sử Thi':49,'Thần':51,'Chiến':48,'Thường':45
};
const STATS=['weapon','armor','horse','book','cloak','shield','artifact'];
function key(x){return [x.sourceGroup,x.name,x.displayedLevel,x.slot].join('\u001f');}
function assert(b,reason){if(!b)throw new Error(reason);}
function validateSeed(seed){
  assert(seed?.runtimeAuthority===false && seed.edition==='VNG_WIKI_MOBILE_CURRENT',
    'UNTRUSTED_SEED');
  assert(seed.declaredIndexCount===392 && seed.capturedIndexCount===392 &&
    Array.isArray(seed.rows) && seed.rows.length===392,'INCOMPLETE_INDEX');
  const counts={},uids=new Set(),identities=new Set();
  for(const row of seed.rows){
    assert(row && /^wiki-index-eq-\d{4}$/.test(row.id) && !uids.has(row.id),
      'BAD_SOURCE_ID');
    uids.add(row.id);
    assert(typeof row.name==='string' && row.name.length>=2 &&
      Number.isSafeInteger(row.displayedLevel) && row.displayedLevel>=1 &&
      EXPECTED_GROUPS[row.sourceGroup] && STATS.includes(row.slot) &&
      row.integration==='REFERENCE_ONLY' && row.stats===null &&
      row.effectRule===null && row.provenance?.classification==='VERIFIED' &&
      row.fieldProvenance?.slot==='DERIVED','BAD_WIKI_SOURCE_ROW');
    const signature=key(row);
    assert(!identities.has(signature),'DUPLICATE_SOURCE_SIGNATURE');
    identities.add(signature);
    counts[row.sourceGroup]=(counts[row.sourceGroup]||0)+1;
  }
  assert(Object.keys(counts).length===Object.keys(EXPECTED_GROUPS).length,'BAD_GROUP_COUNT');
  for(const [group,expected] of Object.entries(EXPECTED_GROUPS))
    assert(counts[group]===expected && seed.groupCounts[group]===expected,
      'GROUP_COUNT_MISMATCH_'+group);
  for(const [name] of Object.entries(SET_IDS))
    assert(counts[name]===7,'HIGH_TIER_SET_NOT_SEVEN_'+name);
  return counts;
}
function buildFromCurated(pack,seed){
  validateSeed(seed);
  assert(pack && Array.isArray(pack.equipment) && Array.isArray(pack.items),'BAD_CATALOGUE');
  const next=copy(pack);
  const ids=new Set(next.equipment.map(x=>x.id));
  assert(ids.size===next.equipment.length,'DUPLICATE_EXISTING_ITEM_ID');
  const ref=next.equipment.filter(x=>x.integration==='REFERENCE_ONLY');
  const active=next.equipment.filter(x=>x.integration==='PLAYABLE');
  const originals=active.filter(x=>!x.id.startsWith('mdt-'));
  assert(originals.length===19,'LEGACY_19_NOT_PRESERVED');
  const refsByKey=new Map();
  for(const row of ref){
    const sig=key(row);
    assert(!refsByKey.has(sig),'DUPLICATE_EXISTING_REFERENCE');
    refsByKey.set(sig,row);
  }
  const newRefs=[];
  const projectBySource=new Map(active.filter(x=>x.sourceId)
    .map(x=>[x.sourceId,x]));
  let matchedLegacy=0;
  for(const source of seed.rows){
    const sig=key(source), existing=refsByKey.get(sig);
    if(existing){
      assert(existing.integration==='REFERENCE_ONLY' && existing.stats===null,
        'EXISTING_REFERENCE_ACTIVE');
      assert(projectBySource.has(existing.id),'EXISTING_SOURCE_NOT_PLAYABLE');
      matchedLegacy++;
      continue;
    }
    assert(!ids.has(source.id),'SOURCE_ID_COLLISION');
    const reference={...copy(source),sourceRecordId:source.id};
    // Playable stats are project-original; the reference retains nulls.
    const playable=playableFromWiki(reference);
    assert(!ids.has(playable.id),'PLAYABLE_ID_COLLISION');
    next.equipment.push(reference,playable);
    ids.add(reference.id);ids.add(playable.id);
    newRefs.push(reference);
  }
  assert(matchedLegacy>=29 && matchedLegacy<=392,'EXPECTED_AT_LEAST_29_EARLIER_MATCHES');
  assert(matchedLegacy+newRefs.length===392,'EXPECTED_EXACT_392_SOURCE_MATCHES');
  assert(next.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length===392 &&
    next.equipment.filter(x=>x.integration==='PLAYABLE').length===411,'WRONG_FINAL_COUNTS');
  next.wikiIndexCounts.equipmentRecorded=392;
  next.projectGearExpansion={
    status:'392_PROJECT_MODELS_MODULE_READY_NOT_RUNTIME',
    sourceRecords:392,projectModels:392,legacyProjectGear:19,
    projectFormula:'SIMULATED',wikiStatsCopied:false,
    acquisitionRatesFromWiki:false,originalBalanceOnly:true,
    inferredSlotSource:'DERIVED_FROM_WIKI_GROUP_ORDER',
    sourceEvidence:'PUBLIC_WIKI_INDEX_TRANSCRIPTION_20261119',
    existingWikiMatches:29,newlyAdded:363,
    noRuntimeIntegrationClaim:true
  };
  return next;
}
if(require.main===module){
  const base=path.join(__dirname,'../data/ngoalong/modules/items/');
  const sourceFile=path.join(base,'wiki_equipment_index_20261119.json');
  const catalogueFile=path.join(base,'catalogue.json');
  const pack=JSON.parse(fs.readFileSync(catalogueFile,'utf8'));
  const seed=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  const text=JSON.stringify(buildFromCurated(pack,seed),null,2)+'\n';
  if(process.argv.includes('--write')){
    fs.writeFileSync(catalogueFile,text,'utf8');
    console.log('392 source gear models written as original project equipment');
  }else if(process.argv.includes('--check')){
    if(text!==fs.readFileSync(catalogueFile,'utf8'))throw Error('CURATED_CATALOGUE_STALE');
    console.log('WIKI_392_PROJECT_MODEL_SYNC_PASS');
  }else console.log('Usage: node tools/nl_item_import_curated.js --write|--check');
}
module.exports={EXPECTED_GROUPS,validateSeed,buildFromCurated};
