'use strict';
/* Normalize all actually visible Wiki index item rows into two separate records:
 * - Wiki REFERENCE_ONLY name/group/level
 * - project-original PLAYABLE economy action where a group is supportable.
 * An index total is NEVER filled with invented missing item names.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NLItemIndexBuilder=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const assert=(b,msg)=>{if(!b)throw new Error(msg)};
 const safe=x=>Number.isSafeInteger(x)&&x>=0;
 function modeledResource(name,defaultResource){
   if(/uy danh|danh vọng|công trạng|chiến tích|vinh dự/i.test(name))return 'prestige';
   if(/sắt|thiết|quặng|đồng|kim loại/i.test(name))return 'iron';
   if(/lúa|lương|lương thực|thóc|gạo/i.test(name))return 'grain';
   return defaultResource;
 }
 function projectModel(source,config,refId){
   const group=source.sourceCategory,policy=config.modelRules[group];
   if(!policy||policy.category==='reference')return null;
   const sourceLevel=Math.max(1,Math.min(500,source.displayedLevel||1));
   const scale=1+Math.floor(sourceLevel/50);
   let effect=null;
   if(policy.effectKind==='OPEN_BUNDLE'){
      effect={kind:'OPEN_BUNDLE',resources:{
        silver:Math.round(policy.baseSilver*scale),
        iron:Math.round(policy.baseIron*scale)
      },stacks:{'mdt-tinh-khoang':Math.min(6,Math.max(1,policy.baseMaterial+Math.floor(sourceLevel/100)))}};
   }else if(policy.effectKind==='GRANT_RESOURCE'){
      const res=modeledResource(source.name,policy.defaultResource);
      effect={kind:'GRANT_RESOURCE',resource:res,amount:
        Math.round(policy.baseAmount*scale*(res==='prestige'?0.1:1))||1};
   }else if(policy.effectKind==='TRAIN_HERO_XP'){
      effect={kind:'TRAIN_HERO_XP',amount:policy.baseAmount+sourceLevel*2};
   }else if(policy.effectKind==='CRAFT_REAGENT'){
      effect={kind:'CRAFT_REAGENT',needPieces:policy.needPieces,
        silverCost:policy.silverCost*scale,output:policy.output,
        outputQuantity:policy.outputQuantity+Math.min(2,Math.floor(sourceLevel/200))};
   }else throw Error('UNKNOWN_PROJECT_ITEM_RULE');
   return {
     id:'mdt-'+source.id,
     name:source.name,sourceIndexId:source.id,sourceId:refId,
     category:policy.category,sourceCategory:group,sourceGroup:source.sourceGroup,
     sourceEdition:'PROJECT_ORIGINAL_FROM_MOBILE_INDEX',displayedLevel:source.displayedLevel,
     requiredLevel:1,rarity:null,slot:null,stats:null,
     integration:'PLAYABLE',effectRule:effect,
     acquisitionRule:{kind:'AUTHORIZED_REWARD_ONLY',dropRate:null},
     enhancementRule:null,
     fieldProvenance:{name:'VERIFIED',displayedLevel:source.fieldProvenance.displayedLevel,
       sourceCategory:'VERIFIED',sourceGroup:'VERIFIED',category:'SIMULATED',
       effectRule:'SIMULATED',acquisitionRule:'SIMULATED',requiredLevel:'SIMULATED'},
     provenance:{classification:'SIMULATED',sourceId:'mdt-items-674-v2',
       inspiredBy:refId}
   };
 }
 function build(pack,index,config){
   assert(pack&&Array.isArray(pack.items),'BAD_PACK');
   assert(index?.declaredCount===674&&Array.isArray(index.rows)&&
      index.extractedCount===index.rows.length&&index.rows.length>=100,
      'SOURCE_COVERAGE_TOO_SMALL');
   assert(config?.declaredTotal===674,'BAD_MODEL_RULES');
   for(const [group,count] of Object.entries(config.sourceCounts||{}))
      assert(index.categoryCounts[group]===count,'CATEGORY_SCHEMA_CHANGED');
   const next=copy(pack),known=new Map(),ids=new Set();
   for(const row of next.items){
     assert(!ids.has(row.id),'DUPLICATE_PREEXISTING');
     ids.add(row.id);
     if(row.integration==='REFERENCE_ONLY'){
       const key=[row.sourceGroup,row.name,row.displayedLevel??''].join('|');
       if(!known.has(key))known.set(key,[]);
       known.get(key).push(row);
     }
   }
   // When building twice, keep full existing pack intact.
   const oldModels=new Set(next.items.filter(x=>x.provenance?.sourceId==='mdt-items-674-v2')
     .map(x=>x.sourceIndexId));
   let createdRefs=0,createdModels=0,linkedOld=0,unsupported=0;
   for(const row of index.rows){
     assert(row&&row.integration==='REFERENCE_ONLY'&&row.provenance?.classification==='VERIFIED'&&
        row.effectRule===null&&row.stats===null,'INVALID_WIKI_REFERENCE');
     const k=[row.sourceGroup,row.name,row.displayedLevel??''].join('|');
     const matches=known.get(k)||[];
     const prior=matches.shift();
     let refId=prior?.id||row.id;
     if(prior){
       linkedOld++;
     }else{
       assert(!ids.has(row.id),'REFERENCE_ID_COLLISION');
       next.items.push(copy(row));createdRefs++;ids.add(row.id);
     }
     const model=projectModel(row,config,refId);
     if(!model){unsupported++;continue}
     if(oldModels.has(row.id))continue;
     assert(!ids.has(model.id),'MODEL_ID_COLLISION');
     next.items.push(model);ids.add(model.id);createdModels++;
   }
   const visibleCount=index.rows.length;
   const refs=next.items.filter(x=>x.integration==='REFERENCE_ONLY').length;
   const playableByIndex=next.items.filter(x=>
     x.integration==='PLAYABLE'&&x.provenance?.sourceId==='mdt-items-674-v2').length;
   assert(refs===visibleCount,'REFERENCE_COVERAGE_MISMATCH');
   assert(playableByIndex===visibleCount-unsupported,'PROJECT_MODEL_COVERAGE_MISMATCH');
   next.wikiIndexCounts.itemIndex=674;
   next.wikiIndexCounts.itemRecorded=visibleCount;
   next.projectItemsExpansion={
     sourceEdition:'VNG_WIKI_MOBILE_CURRENT',declared:674,
     transcribed:visibleCount,unresolved:674-visibleCount,
     records:refs,playableProjectModels:playableByIndex,
     unsupportedReferenceOnly:unsupported,
     sourceEffectAuthority:false,projectEffects:'SIMULATED',
     existingReferenceMatched:next.items.filter(x=>x.integration==='REFERENCE_ONLY' && /^wiki-mobile-item02-/.test(x.id)).length,
     runtimeIntegration:false
   };
   return next;
 }
 return {build,projectModel,modeledResource};
});
