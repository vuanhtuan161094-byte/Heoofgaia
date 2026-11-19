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
      const scoped=items.filter(x=>x.sourceCategory===category);
      const band=scoped.filter(x=>x.balanceTier===chapter+1);
      const choices=band.length?band:scoped;
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
  // B2: enforce a bounded seven-tier economy across every authored item.
  // Source records are not modified; no official Wiki odds/recipes are inferred.
  function apply(pack){
    validate(pack);
    const groups=Object.keys(CONFIG.categoryWeights);
    const byGroup=Object.fromEntries(groups.map(g=>[g,sourceRows(pack)
      .filter(x=>x.sourceCategory===g).map(x=>x.id).sort()]));
    const ranks=new Map();
    for(const g of groups){
      const ids=byGroup[g];
      ids.forEach((id,i)=>ranks.set(id,Math.min(7,1+Math.floor(i*7/ids.length))));
    }
    const items=pack.items.map(row=>{
      if(row.integration!=='PLAYABLE'||!row.sourceId||!ranks.has(row.id))return row;
      const tier=ranks.get(row.id),group=row.sourceCategory;
      const copy={...row,effectRule:{...row.effectRule},
        fieldProvenance:{...row.fieldProvenance,effectRule:'SIMULATED'},
        balanceTier:tier,balanceVersion:'mdt-item-economy-b2'};
      let effect;
      if(group==='Rương'||group==='Túi Phúc'){
        const chest=group==='Rương';
        effect={kind:'OPEN_BUNDLE',resources:{
          silver:(chest?100:70)+(chest?65:40)*tier,
          iron:(chest?12:8)+(chest?9:6)*tier
        },stacks:{'mdt-tinh-khoang':tier>=6?2:1}};
      }else if(group==='Vật Liệu'||group==='Ấn Thạch'){
        const stone=group==='Ấn Thạch';
        effect={kind:'CRAFT_REAGENT',needPieces:(stone?2:3)+(tier>=6?1:0),
          silverCost:(stone?160:100)+(stone?90:70)*tier,
          output:'mdt-tinh-khoang',outputQuantity:1};
      }else if(group==='Tài Nguyên'||group==='Danh Phẩm'){
        const res=group==='Danh Phẩm'?'prestige':row.effectRule.resource;
        const unit=res==='prestige'?2+tier:res==='iron'?20+11*tier:
          res==='grain'?90+45*tier:100+55*tier;
        effect={kind:'GRANT_RESOURCE',resource:res,amount:unit};
      }else if(group==='Bí Tịch'){
        effect={kind:'TRAIN_HERO_XP',amount:75+35*tier};
      }else throw Error('UNSUPPORTED_BALANCE_GROUP');
      copy.effectRule=effect;
      return copy;
    });
    return {...pack,items};
  }
  function economicAudit(pack){
    const balanced=apply(pack);
    const rows=balanced.items.filter(x=>x.balanceVersion==='mdt-item-economy-b2');
    const byTier=Object.fromEntries(Array.from({length:7},(_,i)=>[i+1,0]));
    for(const row of rows){
      byTier[row.balanceTier]++;
      const r=row.effectRule;
      if(r.kind==='CRAFT_REAGENT'&&
        (r.outputQuantity!==1||r.needPieces<2||r.silverCost<=0))
          throw Error('UNBALANCED_RECIPE');
      if(r.kind==='OPEN_BUNDLE'&&(r.resources.silver>600||r.resources.iron>90||
          r.stacks['mdt-tinh-khoang']>2))throw Error('UNBOUNDED_CHEST');
      if(r.kind==='GRANT_RESOURCE'&&(r.amount<=0||r.amount>500))throw Error('UNBOUNDED_RESOURCE');
      if(r.kind==='TRAIN_HERO_XP'&&(r.amount<=0||r.amount>350))throw Error('UNBOUNDED_XP');
    }
    if(rows.length!==667)throw Error('PROJECT_ITEM_COVERAGE');
    return {count:rows.length,byTier,recipeMaterial:'mdt-tinh-khoang',
      noFreeCraft:true,referenceRowsUntouched:true};
  }
  function eligibleIds(pack){
    const gear=new Set(pack.equipment.filter(x=>x.integration==='PLAYABLE').map(x=>x.id));
    const items=new Set(sourceRows(pack).map(x=>x.id));
    return {equipment:gear,items};
  }
  return {CONFIG,validate,select,eligibleIds,apply,economicAudit};
});
