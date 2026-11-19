/* CHAT04 project-original PvE item economy (not official VNG drop rates).
 * Deterministic stage awards; never mutates Save or grants directly.
 * Preserve old equipment costs and R03 reinforcement prices.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NLItemBalanceV1=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const VERSION='mdt-item-economy-v3';
  const STAGES_PER_CHAPTER=4;
  const CONFIG=Object.freeze({
    version:VERSION,provenance:'SIMULATED',maxStage:28,
    rarityByChapter:[
      ['Thường','Chiến'],['Thường','Chiến'],['Chiến','Thao Thiết'],
      ['Chiến','Xi Vưu','Hình Thiên'],['Viêm Đế','Nữ Oa','Phục Hy'],
      ['Hiên Viên','Hỗn Độn','Bàn Cổ'],['Diệt Thế','Thần Hoàng']
    ],
    categoryWeights:{'Rương':25,'Vật Liệu':40,'Tài Nguyên':18,'Túi Phúc':7,'Ấn Thạch':6,'Danh Phẩm':3,'Bí Tịch':1},
    // Ordinary stage: 1 equipment + 2 materials. Boss: +1 chest.
    materialsPerStage:2, bossChestQuantity:1,
    shopPriceInvariant:'CATALOGUE_AND_R03_UNCHANGED',
    craftingInvariant:'CATALOGUE_FORMULAS_UNCHANGED',
    replayPolicy:'NO_DUPLICATE_STAGE_RECEIPT'
  });
  const hash=(n,k)=>(((n*1103515245+12345)>>>0)+k*2654435761)>>>0;
  function sourceRows(pack){
    return (pack.items||[]).filter(x=>x.integration==='PLAYABLE'&&x.sourceId);
  }
  function validate(pack){
    if(!pack||!Array.isArray(pack.equipment)||!Array.isArray(pack.items))throw Error('BAD_PACK');
    if(pack.equipment.filter(x=>x.integration==='PLAYABLE').length!==411)throw Error('GEAR_COVERAGE');
    if(pack.items.filter(x=>x.integration==='PLAYABLE').length!==669)throw Error('ITEM_COVERAGE');
    const eligible=sourceRows(pack);
    const groups=Object.keys(CONFIG.categoryWeights);
    for(const category of groups)if(!eligible.some(x=>x.sourceCategory===category))throw Error('EMPTY_CATEGORY_'+category);
    return {gear:411,items:669,groups:groups.length,eligible:eligible.length};
  }
  function select(pack,stage,seed=0){
    if(!Number.isInteger(stage)||stage<1||stage>28)throw Error('STAGE_OUT_OF_RANGE');
    if(!Number.isSafeInteger(seed)||seed<0)throw Error('INVALID_SEED');
    const chapter=Math.floor((stage-1)/STAGES_PER_CHAPTER);
    const boss=stage%STAGES_PER_CHAPTER===0;
    const pool=pack.equipment.filter(x=>x.integration==='PLAYABLE'&&x.sourceId&&
      CONFIG.rarityByChapter[chapter].includes(x.sourceGroup));
    if(!pool.length)throw Error('NO_STAGE_EQUIPMENT');
    const gear=pool[hash(stage+seed,11)%pool.length];
    const items=sourceRows(pack);
    function choose(category,salt){
      const choices=items.filter(x=>x.sourceCategory===category);
      if(!choices.length)throw Error('EMPTY_CATEGORY_'+category);
      return choices[hash(stage+seed,salt)%choices.length];
    }
    const material=choose('Vật Liệu',17);
    const categories=Object.keys(CONFIG.categoryWeights);
    // Rotate seven categories across 28 first-clear stages; all categories
    // have a non-zero, deterministic campaign acquisition route.
    const rotatingCategory=categories[(stage-1)%categories.length];
    const extra=choose(rotatingCategory,37);
    const entries=[{id:gear.id,quantity:1},{id:material.id,quantity:CONFIG.materialsPerStage},
      {id:extra.id,quantity:1}];
    if(boss)entries.push({id:choose('Rương',29).id,quantity:CONFIG.bossChestQuantity});
    return {stage,chapter:chapter+1,boss,entries,provenance:'SIMULATED',version:VERSION};
  }
  function eligibleIds(pack){
    const gear=new Set(pack.equipment.filter(x=>x.integration==='PLAYABLE').map(x=>x.id));
    const items=new Set(sourceRows(pack).map(x=>x.id));
    return {equipment:gear,items};
  }
  return {CONFIG,validate,select,eligibleIds};
});
