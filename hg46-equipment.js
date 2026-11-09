/* HG46 — real, conservative equipment ownership and build planner.
 * Preserve one canonical inventory, three actual gear slots and Save v07.
 * No new persistent fields, resources, items, loot, combat receipts or HTML.
 */
(function(root){
 'use strict';
 const E=root.HOG_ENGINE;
 if(!E?.hg31Status||!E?.hg408HeroQuality||!E?.enhanceHG18||E.V!==7)
  throw Error('HG46 needs complete HG31/HG408 Save v07 engine');
 const original={equip:E.equipItem,unequip:E.unequipItem,enhance:E.enhanceHG18};
 const SLOTS=['weapon','armor','charm'];
 const WEIGHTS=Object.freeze({
  balanced:Object.freeze({atk:1,def:1,spd:.7,int:.45,dmg:220,defense:220}),
  attack:Object.freeze({atk:1.65,def:.48,spd:.8,int:.45,dmg:360,defense:100}),
  defense:Object.freeze({atk:.55,def:1.65,spd:.55,int:.5,dmg:90,defense:430})
 });
 function owned(s,uid){
  for(const [hero,slots] of Object.entries(s.equipment||{}))
   for(const [slot,v] of Object.entries(slots||{}))
    if(v===uid)return {heroId:Number(hero),slot};
  return null;
 }
 function guard(s,id){
  if(!s?.heroes?.some(h=>h.id===id))throw Error('Không tìm thấy tướng nhận trang bị');
  if(s.battle||s.march)throw Error('Không thể thay trang bị khi giao tranh hoặc hành quân');
  if(E.heroAway?.(s,id)||E.hg20HeroRole?.(s,id)?.status!=='home')
   throw Error('Tướng phải trở về thành mới được thay trang bị');
  const hunt=s.hg26;
  if(hunt?.enabled&&(hunt.config?.heroId===id||hunt.config?.team?.includes(id)||
     hunt.joint?.team?.some(x=>x.heroId===id)))
   throw Error('Tắt đội săn Boss tự động trước khi thay đồ cho tướng');
  return s.heroes.find(h=>h.id===id);
 }
 function canUse(s,uid,id){
  const row=s.inventory.find(i=>i.uid===uid),owner=owned(s,uid);
  if(!row||!E.ITEMS[row.itemId])return {allowed:false,reason:'Vật phẩm không tồn tại'};
  if(owner&&owner.heroId!==id)return {allowed:false,owner:owner.heroId,reason:'Đang do tướng khác sử dụng. Tháo từ hồ sơ chủ sở hữu trước.'};
  try{guard(s,id)}catch(err){return {allowed:false,reason:err.message}}
  return {allowed:true,owner:owner?.heroId||null,reason:''};
 }
 function equip(s,uid,id=s.activeHero){
  const ability=canUse(s,uid,id);
  if(!ability.allowed)throw Error(ability.reason);
  const row=s.inventory.find(i=>i.uid===uid),def=E.ITEMS[row.itemId];
  if(s.equipment[id]?.[def.slot]===uid)return uid;
  const previous=Object.assign({},s.equipment[id]||{});
  const existing=previous[def.slot];
  const trial=E.clone(s);trial.equipment[id][def.slot]=uid;
  if(!E.strictSave(trial))throw Error('Đổi trang bị làm Save v07 không hợp lệ');
  const result=original.equip(s,uid,id);
  if(existing&&existing!==uid)E.note(s,'Trang bị cũ đã về túi: '+(E.ITEMS[s.inventory.find(x=>x.uid===existing)?.itemId]?.name||'trang bị')+'.');
  return result;
 }
 function unequip(s,slot,id=s.activeHero){
  guard(s,id);return original.unequip(s,slot,id);
 }
 function enhance(s,uid){
  const owner=owned(s,uid);
  if(owner)guard(s,owner.heroId);
  if(s.battle||s.march)throw Error('Không thể cường hóa khi giao tranh hoặc hành quân');
  return original.enhance(s,uid);
 }
 function gearStats(row){
  const def=row&&E.ITEMS[row.itemId],lv=row?.enhance||0;
  if(!def)return null;
  const out={};
  for(const k of ['atk','def','spd'])
   out[k]=(def[k]||0)+Math.ceil((def[k]||0)*lv*.08);
  out.int=0;
  out.enhance=lv;out.slot=def.slot;out.set=def.set||null;
  return out;
 }
 function gearKind(row){
  const id=E.ITEMS[row?.itemId]?.set;
  if(id==='star')return 'star';
  if(id==='dragon')return 'dragon';
  if(id==='astral')return 'astral';
  if(id==='sentinel')return 'sentinel';
  return 'common';
 }
 function sets(s,id){
  const counts=E.hg18SetCounts(s,id);
  return {...E.HG18_SETS,...E.HG31_SETS}?
   Object.entries({...E.HG18_SETS,...E.HG31_SETS}).map(([key,set])=>({
    id:key,name:set.name,count:counts[key]||0,
    two:JSON.stringify(set.two),three:JSON.stringify(set.three),note:set.note||'Kích hoạt bộ khi đủ 2/3 và 3/3 món'
   })):[];
 }
 function metrics(s,id,mode){
  const stats=E.heroStats(s,id),mod=E.combatModifiers(s,id);
  if(!stats||!mod)return {score:0,stats,mod};
  const weight=WEIGHTS[mode]||WEIGHTS.balanced;
  const dmg=(mod.damageBonus||0)+.5*((mod.meleeDamage||0)+(mod.rangedDamage||0));
  const score=stats.atk*weight.atk+stats.def*weight.def+
   stats.spd*weight.spd+stats.int*weight.int+
   dmg*weight.dmg+(mod.damageReduction||0)*weight.defense;
  return {score:Math.round(score*100)/100,stats,mod};
 }
 function itemScore(row,mode){
  const st=gearStats(row),def=E.ITEMS[row.itemId],w=WEIGHTS[mode]||WEIGHTS.balanced;
  if(!st)return 0;
  return st.atk*w.atk+st.def*w.def+st.spd*w.spd+
   ((def.damageBonus||0)+.5*((def.meleeDamage||0)+(def.rangedDamage||0)))*w.dmg+
   (def.damageReduction||0)*w.defense;
 }
 function candidates(s,id,slot,mode){
  const usable=s.inventory.filter(i=>E.ITEMS[i.itemId]?.slot===slot&&
   (!owned(s,i.uid)||owned(s,i.uid).heroId===id));
  usable.sort((a,b)=>itemScore(b,mode)-itemScore(a,mode)||a.uid-b.uid);
  const setFirst=new Map();
  for(const i of usable)if(E.ITEMS[i.itemId].set&&!setFirst.has(E.ITEMS[i.itemId].set))
   setFirst.set(E.ITEMS[i.itemId].set,i.uid);
  const current=s.equipment[id]?.[slot];
  const uniq=[null,current,...usable.slice(0,5).map(x=>x.uid),...setFirst.values()];
  return [...new Set(uniq)].filter(x=>x==null||usable.some(y=>y.uid===x)).slice(0,12);
 }
 function suggest(s,id=s.activeHero,mode='balanced'){
  if(!WEIGHTS[mode])throw Error('Kiểu tối ưu trang bị không hợp lệ');
  const current=metrics(s,id,mode),initial={...s.equipment?.[id]||{}};
  try{guard(s,id)}catch(err){return {allowed:false,reason:err.message,mode,score:current.score,gain:0,slots:initial,changed:0}}
  const options=Object.fromEntries(SLOTS.map(slot=>[slot,candidates(s,id,slot,mode)]));
  const trial=E.clone(s),equipSet=trial.equipment[id]||{};
  let best={score:current.score,slots:initial,changed:0};
  for(const weapon of options.weapon)for(const armor of options.armor)for(const charm of options.charm){
   const choice={weapon,armor,charm};
   for(const slot of SLOTS){if(choice[slot]==null)delete equipSet[slot];else equipSet[slot]=choice[slot]}
   const measured=metrics(trial,id,mode);
   const changed=SLOTS.filter(k=>(choice[k]||null)!==(initial[k]||null)).length;
   if(measured.score>best.score+.005||
    (Math.abs(measured.score-best.score)<.005&&changed<best.changed))
    best={score:measured.score,slots:{...equipSet},changed};
  }
  return {allowed:true,mode,score:current.score,targetScore:best.score,
   gain:Math.round((best.score-current.score)*100)/100,changed:best.changed,
   slots:best.slots,sets:sets(s,id)};
 }
 function autoEquip(s,id=s.activeHero,mode='balanced'){
  guard(s,id);
  const proposal=suggest(s,id,mode);
  if(!proposal.allowed)throw Error(proposal.reason);
  if(proposal.changed===0||proposal.gain<=0)return {...proposal,applied:false};
  const trial=E.clone(s);trial.equipment[id]={...proposal.slots};
  if(!E.strictSave(trial))throw Error('Gợi ý trang bị không đạt kiểm tra Save v07');
  const oldOwner={...s.equipment[id]};
  // Atomic swap of the target hero's 3 slot IDs only. No other hero's loadout,
  // inventory instance, receipt, gold or resources are ever touched.
  s.equipment[id]={...proposal.slots};
  E.note(s,'HG46: '+s.heroes.find(h=>h.id===id).name+' chọn bộ '+(
   mode==='attack'?'Công':mode==='defense'?'Thủ':'Cân bằng')+
   '; thay '+proposal.changed+' ô trang bị có sẵn, không tiêu hao đồ.');
  return {...proposal,applied:true,previous:oldOwner};
 }
 function nextEnhance(s,uid){
  const i=s.inventory.find(x=>x.uid===uid);if(!i)return null;
  const lv=i.enhance||0;
  return {level:lv,max:10,stones:lv<10?2+2*lv:0,
   gold:lv<10?250*(lv+1):0,
   possible:lv<10&&(s.hg18?.materials?.enhance_stone||0)>=2+2*lv&&
    s.res.gold>=250*(lv+1)};
 }
 Object.assign(E,{equipItem:equip,unequipItem:unequip,enhanceHG18:enhance,
  hg46Owner:owned,hg46CanUse:canUse,hg46Stats:gearStats,hg46Kind:gearKind,
  hg46Sets:sets,hg46Metrics:metrics,hg46Suggest:suggest,
  hg46AutoEquip:autoEquip,hg46NextEnhance:nextEnhance});
 root.HOG_HG46=Object.freeze({version:1,saveVersion:7,slotCount:3,builds:Object.keys(WEIGHTS)});
})(typeof globalThis!=='undefined'?globalThis:this);
