// === NL-CLASSIC-A3-V1: one WEB equipment economy; Save v5 is immutable ===
// All rates SIMULATED. Old 19-gear shop and the full Group04 catalogue now
// use the exact same quotation for any shared item ID.
function nlA3ConvertFee(cost){
 const out={...cost},n=out.iron||0;delete out.iron;
 if(n){out.silver=(out.silver||0)+4*n;out.grain=(out.grain||0)+Math.ceil(n/2);}
 return out;
}
const nlA3ShopOld=shopCost;
shopCost=function(id){
 const x=NL_ITEM_CATALOGUE.equipment.find(e=>e.id===id&&e.integration==='PLAYABLE');
 return x?.acquisitionRule?.shopCost?{...x.acquisitionRule.shopCost}:nlA3ConvertFee(nlA3ShopOld(id));
};
reinforce=function(uid){
 const it=game.items.find(item=>String(item.uid)===String(uid));
 if(!it)return;
 if(it.lv>=12)return toast('Trang bị đã tối đa +12.');
 const cost=nlItemApi.reinforcementCost(it.lv);
 if(!payment(cost))return toast('Thiếu Bạc hoặc Lương để cường hóa.');
 it.lv++;
 log('Cường hóa '+EQUIPMENT[it.base].name+' lên +'+it.lv+' (PROJECT_SIMULATED).');
 save();toast('Cường hóa thành công +'+it.lv);render();
};
if(window.__P2_ENABLE_QA__)window.__NL_A3_QA__=Object.freeze({
 version:'classic-a3-silver-grain-v1',
 prices:()=>NL_ITEM_CATALOGUE.equipment.filter(x=>x.integration==='PLAYABLE')
   .map(x=>({id:x.id,kind:x.acquisitionRule?.kind,cost:x.acquisitionRule?.shopCost||null})),
 legacyPrice:id=>shopCost(id),
 reinforceCost:level=>nlItemApi.reinforcementCost(level),
 dryBuy:(s,id,receipt)=>nlItemApi.buy(s,id,receipt),
 dryReinforce:(s,uid,receipt)=>nlItemApi.reinforce(s,uid,receipt),
 dryRefine:(s,uid,receipt)=>nlItemApi.refine(s,uid,receipt),
 source:NL_ITEM_RULES.classicA3,
 references:NL_ITEM_CATALOGUE.equipment.filter(x=>x.integration==='REFERENCE_ONLY').length
});
// === end NL-CLASSIC-A3-V1 ===
