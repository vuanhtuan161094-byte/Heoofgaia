'use strict';
/* NL item Group04: project-owned playable equipment generated from reviewed
 * Mobile Wiki reference labels. Derived slot classifications are never
 * misrepresented as VERIFIED; no Wiki numeric stat/formula is imported.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.NLItemEquipmentBuilder=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SLOTS=['weapon','armor','horse','book','cloak','shield','artifact'];
  const SOURCE='https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi';
  const SET_IDS = Object.freeze({
    'Cùng Kỳ':'mdt-cung-ky','Thao Thiết':'mdt-thao-thiet',
    'Xi Vưu':'mdt-xi-vuu','Hình Thiên':'mdt-hinh-thien',
    'Viêm Đế':'mdt-viem-de','Nữ Oa':'mdt-nu-oa','Phục Hi':'mdt-phuc-hi',
    'Hiên Viên':'mdt-hien-vien','Hỗn Độn':'mdt-hon-don',
    'Bàn Cổ':'mdt-ban-co','Diệt Thế':'mdt-diet-the',
    'Thần Hoàng':'mdt-than-hoang'
  });
  function valid(n){return Number.isSafeInteger(n) && n>=1 && n<=9999}
  function statsFor(slot,displayedLevel){
    if(!SLOTS.includes(slot)||!valid(displayedLevel)) throw new Error('INVALID_EQUIPMENT_SLOT_OR_LEVEL');
    const p=7+Math.round(displayedLevel*.65+Math.pow(displayedLevel/25,1.4));
    const stats={atk:0,def:0,int:0,hp:0,tdef:0,mdef:0};
    if(slot==='weapon') stats.atk=p;
    if(slot==='armor'){stats.def=Math.round(p*.85);stats.hp=p*3}
    if(slot==='horse'){stats.atk=Math.round(p*.55);stats.hp=p}
    if(slot==='book') stats.int=Math.round(p*1.1);
    if(slot==='cloak') stats.tdef=Math.round(p*.9);
    if(slot==='shield') stats.mdef=Math.round(p*.9);
    if(slot==='artifact') stats.hp=p*6;
    return stats;
  }
  function playableFromWiki(reference){
    if(!reference || reference.integration!=='REFERENCE_ONLY' ||
      !(['wiki-mobile-equip02-','wiki-index-eq-'].some(prefix=>String(reference.id||'').startsWith(prefix))) ||
      !SLOTS.includes(reference.slot) || !valid(reference.displayedLevel) ||
      !reference.name || reference.stats!==null) throw new Error('REFERENCE_NOT_APPROVED_FOR_PROJECT_MODEL');
    const level=reference.displayedLevel;
    const upper=level>=190;
    const rarity=upper?'Thần thoại':level>=70?'Truyền kỳ':level>=30?'Sử thi':level>=10?'Hiếm':'Thường';
    // The original project gives common/war gear a purchase path; rare Wiki
    // names at even level 1 remain reward-only, not suspiciously cheap shop gear.
    const buyable = ['Thường','Chiến'].includes(reference.sourceGroup);
    const cost = buyable?{
      silver: Math.round((800+level*120) * (reference.sourceGroup==='Chiến'?2:1)),
      iron: Math.round((140+level*14) * (reference.sourceGroup==='Chiến'?2:1)),
      prestige:0
    }:null;
    const setId=SET_IDS[reference.sourceGroup]||null;
    return {
      id:'mdt-'+(reference.sourceRecordId||reference.id),
      name:reference.name,category:'equipment',integration:'PLAYABLE',
      sourceEdition:'PROJECT_ORIGINAL_FROM_MOBILE_INDEX',
      sourceGroup:reference.sourceGroup,sourceId:reference.id,
      sourceUrl:SOURCE,displayedLevel:level,requiredLevel:Math.max(1,Math.min(40,Math.ceil(level/10))),
      slot:reference.slot,rarity,stats:statsFor(reference.slot,level),
      effectRule:{kind:'EQUIPMENT_STATS',setId},
      acquisitionRule:cost?{kind:'SHOP',shopCost:cost}:{kind:'AUTHORIZED_REWARD_ONLY',shopCost:null,dropRate:null},
      enhancementRule:{kind:'REINFORCEMENT',ruleId:'project-r03-v1'},
      fieldProvenance:{name:'VERIFIED',displayedLevel:'VERIFIED',slot:reference.fieldProvenance?.slot||'DERIVED',
        requiredLevel:'SIMULATED',rarity:'SIMULATED',stats:'SIMULATED',
        effectRule:'SIMULATED',acquisitionRule:'SIMULATED',enhancementRule:'SIMULATED'},
      provenance:{classification:'SIMULATED',sourceId:'project-items-v2',inspiredBy:reference.id}
    };
  }
  function augment(pack){
    const base=JSON.parse(JSON.stringify(pack));
    // The complete 392-model catalogue is governed by nl_item_import_curated.js.
    // Avoid moving or deleting its 363 additional stable definitions.
    if (base.projectGearExpansion?.sourceRecords === 392) return base;
    const samples=base.equipment.filter(x=>x.integration==='REFERENCE_ONLY' &&
      String(x.id).startsWith('wiki-mobile-equip02-'));
    if(samples.length!==29)throw new Error('EXPECTED_29_REVIEWED_EQUIPMENT');
    base.equipment=base.equipment.filter(x=>!String(x.id).startsWith('mdt-equip02-'));
    const ids=new Set(base.equipment.map(x=>x.id));
    for(const source of samples){
      const model=playableFromWiki(source);
      if(ids.has(model.id))throw new Error('DUPLICATE_PROJECT_ID');
      base.equipment.push(model);ids.add(model.id);
    }
    base.projectGearExpansion={
      status:'PLAYABLE_MODULE_ONLY',sourceRecords:samples.length,
      projectModels:samples.length,projectFormula:'SIMULATED',
      wikiStatsCopied:false,wikiIndexFullyImported:false,
      noRuntimeIntegrationClaim:true
    };
    return base;
  }
  return {SLOTS,SET_IDS,statsFor,playableFromWiki,augment};
});
if(typeof require==='function' && require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const file=path.join(__dirname,'../data/ngoalong/modules/items/catalogue.json');
 const data=JSON.parse(fs.readFileSync(file,'utf8')),text=JSON.stringify(module.exports.augment(data),null,2)+'\n';
 const args=process.argv.slice(2);
 if(args.includes('--write')){fs.writeFileSync(file,text);console.log('WROTE 29 project equipment models')}
 else if(args.includes('--check')){
  if(text!==fs.readFileSync(file,'utf8')){console.error('CATALOGUE_STALE');process.exitCode=1}
  else console.log('EQUIPMENT_29_SYNC_OK');
 }else console.log('Usage: node tools/nl_item_build_equipment.js --check | --write');
}
