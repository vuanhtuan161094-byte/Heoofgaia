// === NL-ITEMS-V1 — canonical Group08 integration candidate ===
// This source is injected into the game's existing closure before BOOT.
// Sources: Group04 inventory engine/UI + catalogue/rules; project formulas SIMULATED.
// Do not mark release READY until Chromium/save/replay/exact-SHA gates pass.
const NL_ITEM_CATALOGUE = window.NLItemBalanceV1.apply(__NL_ITEMS_CATALOGUE__);
// Balance B2 changes only 667 project-origin item rules, not Wiki reference rows.
window.NLItemBalanceV1.economicAudit(NL_ITEM_CATALOGUE);
const NL_ITEM_RULES = __NL_ITEMS_RULES__;
// UI-only access to upgrade costs; authoritative mechanics remain in engine.js.
NL_ITEM_CATALOGUE.rules=NL_ITEM_RULES;
const NL_ITEM_GROUP_RULES = __NL_ITEM_GROUP_RULES__;
const nlItemConsumableApi=window.NLItemConsumables.createModule(NL_ITEM_CATALOGUE,NL_ITEM_GROUP_RULES);
const nlItemWarehouseView={mode:'bag',category:'all',search:'',page:0};
const nlItemApi = window.NLItemInventory.createModule(NL_ITEM_CATALOGUE, NL_ITEM_RULES);
const nlItemModels = NL_ITEM_CATALOGUE.equipment.filter(x => x.integration === 'PLAYABLE');
if (nlItemModels.length !== 411 ||
    NL_ITEM_CATALOGUE.equipment.filter(x => x.integration === 'REFERENCE_ONLY').length !== 392) {
  throw new Error('NL_ITEMS_411_OR_392_COVERAGE_MISMATCH');
}
for (const item of nlItemModels) {
  // Old 19 IDs and stats stay byte-for-byte equivalent to their R03 pack.
  if (EQUIPMENT[item.id] && NL_GAME_DATA.equipment.projectItems.some(p=>p.id===item.id)) continue;
  EQUIPMENT[item.id] = {
    name:item.name,slot:item.slot,rarity:item.rarity,
    ...item.stats,
    icon:'', cost:item.acquisitionRule?.shopCost || {silver:0,iron:0,prestige:0},
    sourceId:item.sourceId||null,provenance:item.provenance
  };
}
function nlItemHydrate(){
  if (!game || !Array.isArray(game.items) || !game.gear || typeof game.gear!=='object')
    throw new Error('NL_ITEMS_INCOMPATIBLE_SAVE');
  if (!game.nlItemsV1) {
    // Legacy saves had no item receipt ledger. Never retro-award cleared stages.
    game.nlItemsV1 = {
      stacks:{},receipts:{},serial:0,actionNonce:0,
      rewardBaseline:Array.isArray(game.cleared)?game.cleared.slice():[],
      pendingAwards:{}
    };
  }
  const state = game.nlItemsV1;
  if (!state.stacks || typeof state.stacks!=='object' ||
      !state.receipts || typeof state.receipts!=='object' ||
      !Number.isSafeInteger(state.serial) || state.serial<0) {
    throw new Error('NL_ITEMS_CORRUPT_LEDGER');
  }
  if (!Number.isSafeInteger(state.actionNonce) || state.actionNonce<0) state.actionNonce=0;
  if (!Array.isArray(state.rewardBaseline)) state.rewardBaseline=Array.isArray(game.cleared)?game.cleared.slice():[];
  if (!state.pendingAwards || typeof state.pendingAwards!=='object') state.pendingAwards={};
  // Repair colliding old UID serials lazily; do NOT modify existing UIDs.
  const used = new Set(game.items.map(x=>String(x.uid)));
  while (used.has('nli-'+(state.serial+1))) state.serial++;
  return state;
}
const nlItemPriorFresh=fresh;
fresh=function(){
  const state=nlItemPriorFresh();
  state.nlItemsV1={stacks:{},receipts:{},serial:0,actionNonce:0,rewardBaseline:[],pendingAwards:{}};
  return state;
};
const nlItemPriorHydrate=hydrateExtension;
hydrateExtension=function(){
  nlItemPriorHydrate();
  nlItemHydrate();
};
nlItemHydrate();

const nlItemPriorStats=equipmentStats;
equipmentStats=function(heroId){
  // Single authority: never stack R03 equipmentStats and Group04 bonuses.
  return nlItemApi.bonuses(game,heroId);
};
if(window.__NL_R03_QA__) window.__NL_R03_QA__.equipmentStats=equipmentStats;

const nlItemSelected={heroId:null,tab:'all',search:'',shop:false,page:0};
function nlItemHeroId(){
  const roster=(game.roster||[]).filter(id=>game.hero?.[id]);
  if (!roster.includes(nlItemSelected.heroId)) nlItemSelected.heroId=roster[0]||null;
  return nlItemSelected.heroId;
}
const nlItemPriorRenderEquipment=renderEquipment;
renderEquipment=function(){
  // Legacy pane stays present (19 existing IDs, QA/data-buy selectors intact).
  // The legacy renderer is the 19-item shop; 392 new gear are exposed by the
  // paginated Group04 panel, not duplicated in the old mobile grid.
  const originalIds=new Set(NL_GAME_DATA.equipment.projectItems.map(x=>x.id));
  // The legacy renderer also resolves every owned gear instance to its
  // EQUIPMENT definition (including .icon). Never hide an owned new-model
  // definition while it renders, or Save/reload/mobile will throw.
  const ownedIds=new Set((game.items||[]).map(item=>item.base));
  const hidden=Object.entries(EQUIPMENT).filter(([id])=>
    !originalIds.has(id) && !ownedIds.has(id));
  for(const [id] of hidden)delete EQUIPMENT[id];
  let previous;
  try{previous=nlItemPriorRenderEquipment();}
  finally{for(const [id,row] of hidden)EQUIPMENT[id]=row;}
  const heroId=nlItemHeroId();
  if(!heroId) return previous;
  const selector='<label class="nli-owner-switch">Chọn võ tướng <select data-nli-hero>'+
    (game.roster||[]).filter(id=>game.hero?.[id]).map(id=>
      '<option value="'+esc(id)+'" '+(id===heroId?'selected':'')+'>'+
        esc(HEROES[id]?.name||id)+'</option>').join('')+'</select></label>';
  const pending=Object.entries(nlItemHydrate().pendingAwards).map(([stage,drop])=>
    '<div class="nli-pending">Ải '+esc(stage)+' · Chờ nhận '+esc(EQUIPMENT[drop.id]?.name||drop.id)+
    ' <button data-nli-pending="'+esc(stage)+'">Nhận thưởng</button></div>').join('');
  return previous+'<div data-nl-item-bridge="1">'+selector+pending+
    window.NLItemEquipmentUI.makeView(NL_ITEM_CATALOGUE,nlItemApi,game,heroId,nlItemSelected)+
    '</div><div data-nl-consumables-bridge="1">'+
    window.NLItemConsumablesUI.view(NL_ITEM_CATALOGUE,nlItemConsumableApi,game,nlItemWarehouseView)+
    '</div>';
};
function nlItemApply(result,meta){
  if (!result.ok) {
    if(typeof toast==='function') toast('Trang bị: '+(result.code||'Không thể thực hiện'));
    return false;
  }
  if (result.duplicate) return false;
  Object.assign(game,result.state); // preserve authoritative game object identity
  if (meta?.actionNonce!=null) game.nlItemsV1.actionNonce=meta.actionNonce;
  if (typeof save==='function') save();
  if (typeof render==='function' && !meta?.noRender) render();
  return true;
}
function nlItemAction(action,arg){
  const nonce=nlItemHydrate().actionNonce+1;
  const receipt='nli:ui:'+nonce;
  const heroId=nlItemHeroId();
  const result=action==='buy'?nlItemApi.buy(game,arg.id,receipt):
    action==='equip'?nlItemApi.equip(game,heroId,arg.uid,receipt):
    action==='unequip'?nlItemApi.unequip(game,heroId,arg.slot,receipt):
    action==='reinforce'?nlItemApi.reinforce(game,arg.uid,receipt):
    action==='refine'?nlItemApi.refine(game,arg.uid,receipt):
    {ok:false,code:'UNSUPPORTED_ACTION'};
  return nlItemApply(result,{actionNonce:nonce});
}
function nlItemLootForStage(stage){
  return window.NLItemBalanceV1.select(NL_ITEM_CATALOGUE,stage).entries[0]?.id||null;
}
function nlItemGiveCampaignReward(stage){
  const m=nlItemHydrate();
  if(!Number.isSafeInteger(stage)||stage<1||stage>STAGES.length ||
     m.rewardBaseline.includes(stage)||m.receipts['nli:stage:'+stage])return false;
  const award=window.NLItemBalanceV1.select(NL_ITEM_CATALOGUE,stage);
  const receipt='nli:stage:'+stage;
  const entries=award.entries;
  const result=nlItemApi.grant(game,entries,receipt);
  if(!result.ok){
    if(['EQUIPMENT_CAPACITY','STACK_CAPACITY','STACK_KIND_CAPACITY'].includes(result.code)){
      m.pendingAwards[stage]={id:entries[0].id,entries,receipt};
      if(typeof save==='function')save();
    }
    return false;
  }
  Object.assign(game,result.state);
  delete game.nlItemsV1.pendingAwards[stage];
  if(typeof save==='function')save();
  return true;
}
function nlItemClaimPending(stage){
  const m=nlItemHydrate();
  const record=m.pendingAwards[stage];
  if(!record)return false;
  const result=nlItemApi.grant(game,record.entries||[{id:record.id,quantity:1}],record.receipt);
  if(!result.ok)return false;
  Object.assign(game,result.state);
  delete game.nlItemsV1.pendingAwards[stage];
  if(typeof save==='function')save();
  if(typeof render==='function')render();
  return true;
}
// Hook the actual settled battle report; never mint gear from replay, animation
// frames, losses, or stage previews. Receipt ID has only one interpretation.
const nlItemPriorStoreReport=p2StoreReport;
p2StoreReport=function(rewards,loot){
  nlItemPriorStoreReport(rewards,loot);
  if (!battle || battle.mode!=='campaign' || battle.won!==true ||
      battle.replay || !battle.report) return;
  nlItemGiveCampaignReward(Number(battle.stage));
};
// The canonical render() may skip the already-open equipment panel.
 // Refresh only its owned DOM after item-local navigation; do not rely on
 // unrelated game-wide rendering to repaint this fragment.
function nlItemRefreshEquipmentPanel(){
  const bridge=document.querySelector('[data-nl-item-bridge]');
  const current=bridge?.querySelector('.nli-panel');
  const heroId=nlItemHeroId();
  if(!current||!heroId)return;
  const template=document.createElement('template');
  template.innerHTML=window.NLItemEquipmentUI.makeView(
    NL_ITEM_CATALOGUE,nlItemApi,game,heroId,nlItemSelected);
  const updated=template.content.querySelector('.nli-panel');
  if(updated)current.replaceWith(updated);
}
document.addEventListener('click',function(ev){
  const control=ev.target.closest?.('[data-nli-action],[data-nli-tab],[data-nli-shop],[data-nli-page],[data-nli-pending]');
  if(!control || !control.closest('.nli-panel'))return;
  ev.preventDefault();ev.stopPropagation();
  if(control.hasAttribute('data-nli-pending')) {
    nlItemClaimPending(control.getAttribute('data-nli-pending'));return;
  }
  if(control.hasAttribute('data-nli-tab')){
    nlItemSelected.tab=control.getAttribute('data-nli-tab');nlItemSelected.page=0;nlItemRefreshEquipmentPanel();return;
  }
  if(control.hasAttribute('data-nli-shop')){
    nlItemSelected.shop=control.getAttribute('data-nli-shop')==='1';nlItemSelected.page=0;nlItemRefreshEquipmentPanel();return;
  }
  if(control.hasAttribute('data-nli-page')){
    nlItemSelected.page=Math.max(0,Number(control.getAttribute('data-nli-page'))||0);
    nlItemRefreshEquipmentPanel();return;
  }
  const action=control.getAttribute('data-nli-action');
  nlItemAction(action,{
    id:control.getAttribute('data-item'),
    uid:control.getAttribute('data-uid'),
    slot:control.getAttribute('data-slot')
  });
},true);
document.addEventListener('change',function(ev){
  if(!ev.target.matches?.('[data-nli-hero]'))return;
  nlItemSelected.heroId=ev.target.value;render();
},true);
document.addEventListener('input',function(ev){
  if(!ev.target.matches?.('[data-nli-search]') ||
    !ev.target.closest('[data-nl-item-bridge]'))return;
  nlItemSelected.search=ev.target.value;
  nlItemSelected.page=0;
  // Search updates only the equipment panel, avoiding loss of game scene state.
  const position=ev.target.selectionStart;
  nlItemRefreshEquipmentPanel();
  const el=document.querySelector('[data-nl-item-bridge] [data-nli-search]');
  if(el){el.focus();el.setSelectionRange(position,position);}
},true);
// Group04 consumable UI uses the SAME Save v5 receipt ledger as equipment.
function nlItemRefreshWarehousePanel(){
  const bridge=document.querySelector('[data-nl-consumables-bridge]');
  const current=bridge?.querySelector('.nli-items-panel');
  if(!current)return;
  const template=document.createElement('template');
  template.innerHTML=window.NLItemConsumablesUI.view(
    NL_ITEM_CATALOGUE,nlItemConsumableApi,game,nlItemWarehouseView);
  const updated=template.content.querySelector('.nli-items-panel');
  if(updated)current.replaceWith(updated);
}
document.addEventListener('click',function(ev){
  const control=ev.target.closest?.('[data-nli-item-action],[data-nli-item-mode],[data-nli-item-category],[data-nli-item-page]');
  if(!control||!control.closest('[data-nl-consumables-bridge]'))return;
  ev.preventDefault();ev.stopPropagation();
  if(control.hasAttribute('data-nli-item-mode')){
    nlItemWarehouseView.mode=control.getAttribute('data-nli-item-mode');
    nlItemWarehouseView.page=0;nlItemRefreshWarehousePanel();return;
  }
  if(control.hasAttribute('data-nli-item-category')){
    nlItemWarehouseView.category=control.getAttribute('data-nli-item-category');
    nlItemWarehouseView.page=0;render();return;
  }
  if(control.hasAttribute('data-nli-item-page')){
    nlItemWarehouseView.page=Math.max(0,Number(control.getAttribute('data-nli-item-page'))||0);
    nlItemRefreshWarehousePanel();return;
  }
  const action=control.getAttribute('data-nli-item-action');
  const id=control.getAttribute('data-nli-item-id');
  const nonce=nlItemHydrate().actionNonce+1,receipt='nli:ui:'+nonce;
  const result=action==='use'?nlItemConsumableApi.use(game,id,receipt,nlItemHeroId()):
    action==='process'?nlItemConsumableApi.process(game,id,receipt):
    {ok:false,code:'UNKNOWN_ITEM_ACTION'};
  nlItemApply(result,{actionNonce:nonce});
},true);
document.addEventListener('input',function(ev){
  if(!ev.target.matches?.('[data-nli-item-search]')||
     !ev.target.closest('[data-nl-consumables-bridge]'))return;
  nlItemWarehouseView.search=ev.target.value;
  nlItemWarehouseView.page=0;
  const cursor=ev.target.selectionStart;
  nlItemRefreshWarehousePanel();
  const field=document.querySelector('[data-nl-consumables-bridge] [data-nli-item-search]');
  if(field){field.focus();field.setSelectionRange(cursor,cursor)}
},true);
if(window.__P2_ENABLE_QA__){
  window.__NL_ITEM_QA__={
    getCounts:()=>({playable:nlItemModels.length,
      references:NL_ITEM_CATALOGUE.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length}),
    getItemCounts:()=>({
      playable:NL_ITEM_CATALOGUE.items.filter(x=>x.integration==='PLAYABLE').length,
      references:NL_ITEM_CATALOGUE.items.filter(x=>x.integration==='REFERENCE_ONLY').length
    }),
    useItem:(id,heroId)=>{
      const nonce=nlItemHydrate().actionNonce+1;
      const result=nlItemConsumableApi.use(game,id,'nli:ui:'+nonce,heroId||nlItemHeroId());
      nlItemApply(result,{actionNonce:nonce,noRender:true});
      return result;
    },
    bonus:heroId=>nlItemApi.bonuses(game,heroId),
    sets:heroId=>nlItemApi.sets(game,heroId),
    selectLoot:nlItemLootForStage,
    settleStage:nlItemGiveCampaignReward,
    claim:nlItemClaimPending,
    state:()=>structuredClone(game.nlItemsV1)
  };
}
// === end NL-ITEMS-V1 ===
