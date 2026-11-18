'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const pack=require('../data/ngoalong/modules/items/catalogue.json');
const {validateCatalogue}=require('../tools/nl_item_inventory.js');
const {buildFullCatalogue}=require('../tools/nl_item_full_equipment.js');
const known=pack.equipment.filter(x=>x.integration==='REFERENCE_ONLY');
function makeSnapshot(){
  const rows=known.map((ref,i)=>({
    id:'wiki-index-eq-existing-'+i,name:ref.name,
    integration:'REFERENCE_ONLY',category:'equipment',
    slot:ref.slot,sourceGroup:ref.sourceGroup,displayedLevel:ref.displayedLevel,
    rarity:null,stats:null,effectRule:null,enhancementRule:null,
    acquisitionRule:null,
    fieldProvenance:{slot:'VERIFIED',name:'VERIFIED',displayedLevel:'VERIFIED'},
    provenance:{classification:'VERIFIED',sourceId:'VNG_WIKI_MOBILE_INDEX'}
  }));
  for(let i=rows.length;i<392;i++)rows.push({
    id:'wiki-index-eq-new-'+i,name:'Original Test Slot '+i,
    category:'equipment',integration:'REFERENCE_ONLY',
    slot:['weapon','armor','horse','book','cloak','shield','artifact'][i%7],
    sourceGroup:'Thượng Cổ',displayedLevel:20+i,
    rarity:null,stats:null,effectRule:null,enhancementRule:null,
    acquisitionRule:null,
    fieldProvenance:{slot:'VERIFIED',name:'VERIFIED',displayedLevel:'VERIFIED'},
    provenance:{classification:'VERIFIED',sourceId:'VNG_WIKI_MOBILE_INDEX'}
  });
  return {domains:{equipment:{extracted:392,
    slotAudit:{method:'PUBLIC_WIKI_FILTERED_BUTTONS',verifiedRows:392},
    rows}}};
}
test('full builder safely converts 392 verified source records into 392 distinct playable PROJECT models',()=>{
  const result=buildFullCatalogue(pack,makeSnapshot());
  assert.equal(result.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length,392);
  assert.equal(result.equipment.filter(x=>x.integration==='PLAYABLE').length,411);
  assert.equal(result.projectGearExpansion.additions,363);
  assert.equal(Object.keys(validateCatalogue(result)).length,803);
  assert.equal(result.equipment.find(x=>x.id==='mdt-wiki-index-eq-new-391').provenance.classification,'SIMULATED');
  assert.equal(result.equipment.find(x=>x.id==='mdt-wiki-index-eq-new-391').fieldProvenance.stats,'SIMULATED');
});
test('full builder fails closed without seven-filter verification or missing slots',()=>{
  const bad=makeSnapshot();
  delete bad.domains.equipment.slotAudit;
  assert.throws(()=>buildFullCatalogue(pack,bad),/WIKI_392_VERIFIED_FILTER_SNAPSHOT_REQUIRED/);
  const missing=makeSnapshot();
  missing.domains.equipment.rows[100].slot=null;
  assert.throws(()=>buildFullCatalogue(pack,missing),/UNVERIFIED_INDEX_ROW/);
});
test('full builder rejects incomplete source instead of claiming all equipment playable',()=>{
  const short=makeSnapshot();
  short.domains.equipment.rows.pop();
  assert.throws(()=>buildFullCatalogue(pack,short),/WIKI_392_VERIFIED_FILTER_SNAPSHOT_REQUIRED/);
});
