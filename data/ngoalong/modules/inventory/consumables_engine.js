/* Muu Dinh Tam Quoc - Group04 item actions, no DOM/save/global dependency.
 * Source names/groups are Wiki references. Effects/recipes are original game rules.
 * Uses the same nlItemsV1 receipt ledger as Group04's equipment engine.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NLItemConsumables=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const RESOURCE=new Set(['silver','iron','grain','prestige']);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const safe=n=>Number.isSafeInteger(n)&&n>=0;
  const goodId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
  const copy=o=>JSON.parse(JSON.stringify(o));
  const error=code=>{const e=new Error(code);e.code=code;throw e};
  const requireOk=(ok,code)=>{if(!ok)error(code)};
  function validatePack(pack,config){
    requireOk(pack&&Array.isArray(pack.items),'BAD_CATALOGUE');
    requireOk(config&&safe(config.limits?.stacksKinds)&&
      safe(config.limits?.quantityEach)&&safe(config.limits?.receipts),'BAD_CONFIG');
    const lookup=Object.create(null);
    for(const row of pack.items){
      requireOk(row&&goodId(row.id)&&!own(lookup,row.id),'INVALID_OR_DUPLICATE_ITEM_ID');
      requireOk(row.integration==='PLAYABLE'||row.integration==='REFERENCE_ONLY','BAD_INTEGRATION');
      requireOk(row.provenance?.classification==='VERIFIED' ||
        row.provenance?.classification==='SIMULATED','BAD_PROVENANCE');
      if(row.integration==='REFERENCE_ONLY'){
        requireOk(row.effectRule==null,'REFERENCE_EFFECT_FORBIDDEN');
      }else{
        requireOk(row.provenance.classification==='SIMULATED','ACTIVE_NOT_PROJECT_ORIGINAL');
        requireOk(row.category==='consumable'||row.category==='material','BAD_PLAYABLE_KIND');
        if(row.category==='consumable')requireOk(row.effectRule&&
          ['GRANT_RESOURCE','OPEN_BUNDLE','TRAIN_HERO_XP'].includes(row.effectRule.kind),'BAD_CONSUMABLE_RULE');
        else requireOk(row.effectRule?.kind==='CRAFT_REAGENT'||
          row.effectRule?.kind==='REFINEMENT_REAGENT','BAD_MATERIAL_RULE');
      }
      lookup[row.id]=row;
    }
    return lookup;
  }
  function createModule(pack,config){
    const items=validatePack(pack,config),limit=config.limits;
    function get(id){
      requireOk(goodId(id)&&own(items,id),'UNKNOWN_ITEM');
      const row=items[id];
      requireOk(row.integration==='PLAYABLE','REFERENCE_ONLY');
      return row;
    }
    function execute(state,action,id,args,receipt,body){
      try{
        requireOk(state&&typeof state==='object'&&goodId(receipt),'RECEIPT_REQUIRED');
        const next=copy(state),m=next.nlItemsV1;
        requireOk(m&&typeof m.stacks==='object'&&!Array.isArray(m.stacks)&&
          typeof m.receipts==='object'&&!Array.isArray(m.receipts)&&
          safe(m.serial),'CORRUPT_ITEM_LEDGER');
        const fingerprint=JSON.stringify([action,id,args]);
        if(own(m.receipts,receipt)){
          requireOk(m.receipts[receipt]===fingerprint,'RECEIPT_CONFLICT');
          return {ok:true,duplicate:true,state,code:'ALREADY_SETTLED'};
        }
        requireOk(Object.keys(m.receipts).length<limit.receipts,'RECEIPT_LIMIT');
        const detail=body(next,m);
        m.receipts[receipt]=fingerprint;
        return {ok:true,duplicate:false,state:next,detail};
      }catch(e){
        return {ok:false,duplicate:false,state,code:e.code||'INVALID_OPERATION'};
      }
    }
    function debitStack(m,id,qty){
      requireOk(goodId(id)&&safe(qty)&&qty>=1,'INVALID_STACK_COST');
      const prior=m.stacks[id];
      requireOk(safe(prior)&&prior>=qty,'NOT_ENOUGH_ITEMS');
      if(prior===qty)delete m.stacks[id];else m.stacks[id]=prior-qty;
    }
    function addStack(m,id,qty){
      requireOk(safe(qty)&&qty>0,'INVALID_GRANT_QUANTITY');
      get(id);
      const current=m.stacks[id]||0;
      requireOk(safe(current),'CORRUPT_STACK');
      requireOk(current+qty<=limit.quantityEach,'STACK_CAPACITY');
      const keys=new Set(Object.keys(m.stacks).filter(k=>m.stacks[k]>0));
      keys.add(id);
      requireOk(keys.size<=limit.stacksKinds,'STACK_KIND_CAPACITY');
      m.stacks[id]=current+qty;
    }
    function addResource(next,name,qty){
      requireOk(RESOURCE.has(name)&&safe(qty),'INVALID_RESOURCE_REWARD');
      const old=next[name]||0;
      requireOk(safe(old)&&Number.isSafeInteger(old+qty),'RESOURCE_OVERFLOW');
      next[name]=old+qty;
    }
    function use(state,id,receipt,heroId=null){
      return execute(state,'USE_ITEM',id,heroId,receipt,(next,m)=>{
        const row=get(id),rule=row.effectRule;
        requireOk(row.category==='consumable','MATERIAL_MUST_BE_PROCESSED');
        requireOk(rule&&rule.kind,'NO_ACTION_RULE');
        if(rule.kind==='TRAIN_HERO_XP'){
          requireOk(goodId(heroId)&&next.hero?.[heroId],'HERO_REQUIRED');
          const hero=next.hero[heroId];
          requireOk(safe(hero.level)&&hero.level>=1&&hero.level<40&&safe(hero.xp||0),
            'HERO_LEVEL_INVALID');
        }
        if(rule.kind==='OPEN_BUNDLE'){
          requireOk(rule.resources&&typeof rule.resources==='object'&&
            rule.stacks&&typeof rule.stacks==='object','INVALID_BUNDLE');
          for(const [res,qty] of Object.entries(rule.resources))
            requireOk(RESOURCE.has(res)&&safe(qty),'INVALID_BUNDLE_RESOURCE');
          for(const [item,qty] of Object.entries(rule.stacks)){
            requireOk(goodId(item)&&safe(qty)&&qty>0&&item!==id,'INVALID_BUNDLE_ITEM');
            get(item);
          }
        }
        debitStack(m,id,1);
        if(rule.kind==='GRANT_RESOURCE')addResource(next,rule.resource,rule.amount);
        else if(rule.kind==='OPEN_BUNDLE'){
          for(const [res,qty] of Object.entries(rule.resources))addResource(next,res,qty);
          for(const [item,qty] of Object.entries(rule.stacks))addStack(m,item,qty);
        }else if(rule.kind==='TRAIN_HERO_XP'){
          const hero=next.hero[heroId];
          requireOk(safe(rule.amount)&&rule.amount>=1,'BAD_HERO_XP');
          hero.xp=(hero.xp||0)+rule.amount;
          while(hero.level<40&&hero.xp>=hero.level*90){
            hero.xp-=hero.level*90;
            hero.level++;
          }
        }else error('UNSUPPORTED_ACTION');
        return {used:id,action:rule.kind,heroId};
      });
    }
    function process(state,id,receipt){
      return execute(state,'PROCESS_MATERIAL',id,null,receipt,(next,m)=>{
        const row=get(id),rule=row.effectRule;
        requireOk(row.category==='material'&&rule?.kind==='CRAFT_REAGENT',
          'NOT_PROCESSABLE');
        requireOk(goodId(rule.output)&&rule.output!==id&&
          safe(rule.needPieces)&&rule.needPieces>0&&
          safe(rule.silverCost)&&safe(rule.outputQuantity)&&rule.outputQuantity>0,
          'INVALID_RECIPE');
        const output=get(rule.output);
        requireOk(output.category==='material','BAD_RECIPE_OUTPUT');
        requireOk(safe(next.silver||0)&&next.silver>=rule.silverCost,'INSUFFICIENT_RESOURCES');
        debitStack(m,id,rule.needPieces);
        next.silver-=rule.silverCost;
        addStack(m,rule.output,rule.outputQuantity);
        return {processed:id,inputCount:rule.needPieces,output:rule.output,
          outputCount:rule.outputQuantity,silver:rule.silverCost};
      });
    }
    function inspect(id){
      const row=items[id];
      if(!row)return {found:false};
      return {found:true,playable:row.integration==='PLAYABLE',
        category:row.category,sourceGroup:row.sourceGroup||null,
        effect:row.integration==='PLAYABLE'?copy(row.effectRule):null,
        provenance:row.provenance.classification};
    }
    return {use,process,inspect,validate:()=>validatePack(pack,config)};
  }
  return {createModule,validatePack};
});
