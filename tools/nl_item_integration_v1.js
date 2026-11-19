// === NL-ITEMS-V1 — canonical Group08 integration candidate ===
// This source is injected into the game's existing closure before BOOT.
// Sources: Group04 inventory engine/UI + catalogue/rules; project formulas SIMULATED.
// Do not mark release READY until Chromium/save/replay/exact-SHA gates pass.
const NL_ITEM_CATALOGUE = __NL_ITEMS_CATALOGUE__;
const NL_ITEM_RULES = __NL_ITEMS_RULES__;
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

const nlItemSelected={heroId:null,tab:'all',search:'',shop:false};
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
  const hidden=Object.entries(EQUIPMENT).filter(([id])=>!originalIds.has(id));
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
  // Publisher Wiki provides no per-stage drop probability. Original project award:
  // chapter-end encounters use high-tier, other stages use common/war progression.
  const boss=stage%4===0;
  const list=nlItemModels.filter(x=>x.sourceId&&
    (boss ? x.sourceGroup==='Thần Hoàng'||x.sourceGroup==='Diệt Thế'
          :x.sourceGroup==='Thường'||x.sourceGroup==='Chiến'));
  if(!list.length) return null;
  return list[(stage*17+3)%list.length].id;
}
function nlItemGiveCampaignReward(stage){
  const m=nlItemHydrate();
  if(!Number.isSafeInteger(stage)||stage<1||stage>STAGES.length ||
     m.rewardBaseline.includes(stage)||m.receipts['nli:stage:'+stage])return false;
  const itemId=nlItemLootForStage(stage);
  if(!itemId)return false;
  const receipt='nli:stage:'+stage;
  const result=nlItemApi.grant(game,[{id:itemId,quantity:1}],receipt);
  if(!result.ok){
    if(result.code==='EQUIPMENT_CAPACITY') {
      m.pendingAwards[stage]={id:itemId,receipt};
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
  const result=nlItemApi.grant(game,[{id:record.id,quantity:1}],record.receipt);
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
document.addEventListener('click',function(ev){
  const control=ev.target.closest?.('[data-nli-action],[data-nli-tab],[data-nli-shop],[data-nli-pending]');
  if(!control || !control.closest('[data-nl-item-bridge]'))return;
  ev.preventDefault();ev.stopPropagation();
  if(control.hasAttribute('data-nli-pending')) {
    nlItemClaimPending(control.getAttribute('data-nli-pending'));return;
  }
  if(control.hasAttribute('data-nli-tab')){
    nlItemSelected.tab=control.getAttribute('data-nli-tab');render();return;
  }
  if(control.hasAttribute('data-nli-shop')){
    nlItemSelected.shop=control.getAttribute('data-nli-shop')==='1';render();return;
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
  // Avoid loss of caret while filtering.
  const position=ev.target.selectionStart;
  render();
  const el=document.querySelector('[data-nl-item-bridge] [data-nli-search]');
  if(el){el.focus();el.setSelectionRange(position,position);}
},true);
if(window.__P2_ENABLE_QA__){
  window.__NL_ITEM_QA__={
    getCounts:()=>({playable:nlItemModels.length,
      references:NL_ITEM_CATALOGUE.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length}),
    bonus:heroId=>nlItemApi.bonuses(game,heroId),
    sets:heroId=>nlItemApi.sets(game,heroId),
    selectLoot:nlItemLootForStage,
    settleStage:nlItemGiveCampaignReward,
    claim:nlItemClaimPending,
    state:()=>structuredClone(game.nlItemsV1)
  };
}
// === end NL-ITEMS-V1 ===
