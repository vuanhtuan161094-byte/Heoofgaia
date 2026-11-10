/* HG47: 10 real hero gear slots, 4 racial sets, earned fragments and divine crafting.
 * Save v07 stays v07; all items live in canonical inventory/equipment.
 * No bonus from UI-only fields, free Boss victory, or offline-invented receipts.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg46CanUse||!E?.hg31Status||!E?.hg29Ensure||E.V!==7)throw Error('HG47 requires HG46/HG31 and strict Save v07');
const prior={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 battleAct:E.battleAct,heroStats:E.heroStats,combatModifiers:E.combatModifiers,
 equip:E.equipItem,unequip:E.unequipItem,stats:E.hg46Stats,kind:E.hg46Kind,
 sets:E.hg46Sets,metrics:E.hg46Metrics};
const SLOTS=Object.freeze([
 ['weapon','Vũ khí','⚔'],['armor','Giáp thân','🛡'],['helm','Mũ','👑'],
 ['gloves','Găng','🥊'],['boots','Giày','🥾'],['belt','Đai','🪢'],
 ['necklace','Dây chuyền','📿'],['ring','Nhẫn','💍'],['charm','Ấn','🔮'],
 ['relic','Thánh vật','✦']].map(a=>Object.freeze(a)));
const RACES=Object.freeze({
 human:{name:'Nhân Tộc',icon:'⚜',base:'Vương Triều',stat:'damageReduction',tag:'Hộ Vệ'},
 elf:{name:'Tinh Linh',icon:'🍃',base:'Nguyệt Lâm',stat:'rangedDamage',tag:'Thần Tiễn'},
 orc:{name:'Thú Tộc',icon:'🐺',base:'Chiến Huyết',stat:'meleeDamage',tag:'Cuồng Chiến'},
 undead:{name:'Vong Linh',icon:'☠',base:'Hồn Giới',stat:'damageBonus',tag:'Hắc Thuật'}
});
const TIERS=Object.freeze({
 rare:{name:'Cổ vật',icon:'◆',fragmentCount:8,gold:3000,
  cost:Object.freeze({gear:5,hunter:3}),oddsLabel:'Quái 1–3★: 60%; Elite: luôn rơi 1–2 mảnh đúng mục tiêu',multi:1},
 divine:{name:'Thần khí',icon:'✺',fragmentCount:12,gold:18000,
  cost:Object.freeze({abyss:3,tower:6,hero:2,bossToken:1,towerToken:1}),
  oddsLabel:'Boss T11+: 2 mảnh; Tháp có thưởng: 2 mảnh, Elite: 5% được 1 mảnh',multi:2}
});
const KEYS=['atk','def','spd','int','damageBonus','meleeDamage','rangedDamage','damageReduction'];
const AFFIXES=Object.freeze({
 atk:['⚔ Công',3,7],def:['🛡 Thủ',3,7],spd:['➤ Tốc',1,3],int:['✧ Trí',1,3],
 damageBonus:['⚡ Sát thương',.008,.017],meleeDamage:['⚔ Cận chiến',.012,.024],
 rangedDamage:['🏹 Tầm xa',.012,.024],damageReduction:['🛡 Giảm sát thương',.008,.016]
});
const SETS={};
for(const [race,r] of Object.entries(RACES))for(const [tier,t] of Object.entries(TIERS)){
 const n=t.multi, special=r.stat;
 const bonuses={
  three:{[special]:n===1?.012:.022},
  six:{[special]:n===1?.018:.028},
  ten:{[special]:n===1?.025:.04,damageReduction:.01*n}
 };
 SETS[race+'_'+tier]=Object.freeze({
  name:r.base+' · '+t.name,race,tier,max:10,icon:r.icon,
  source:tier==='rare'?'Quái thường, Elite, Boss và Tháp có thưởng':'Elite hiếm, Boss T11+ và Tháp có thưởng',
  milestones:Object.freeze(bonuses),
  note:'3 món: '+Math.round(bonuses.three[special]*1e3)/10+'% · 6 món: +'+Math.round(bonuses.six[special]*1e3)/10+
   '% · 10 món: +'+Math.round(bonuses.ten[special]*1e3)/10+'% '+r.tag+' và +'+n+'% giảm sát thương'
 });
}
const ITEM_IDS=[];
const SLOT_NAMES={
 weapon:'Chiến Khí',armor:'Chiến Bào',helm:'Vương Miện',gloves:'Chiến Thủ',
 boots:'Chiến Ngoa',belt:'Huyết Đai',necklace:'Linh Liên',ring:'Hồn Nhẫn',
 charm:'Pháp Ấn',relic:'Thần Vật'
};
function itemId(race,tier,slot){return 'hg47_'+race+'_'+tier+'_'+slot}
for(const [race,r] of Object.entries(RACES))for(const [tier,t] of Object.entries(TIERS)){
 for(const [index,[slot,,icon]]of SLOTS.entries()){
  const id=itemId(race,tier,slot),n=t.multi;
  if(E.ITEMS[id])throw Error('HG47 duplicate '+id);
  E.ITEMS[id]={id,name:r.base+' '+SLOT_NAMES[slot]+' · '+t.name,
   slot,icon,atk:Math.round((5+(index%3)*2)*n),
   def:Math.round((4+((index+1)%3)*2)*n),spd:Math.round((1+index%2)*n),
   int:0,set:race+'_'+tier,race,tier,cost:0,level:10,shop:false,hg47:true};
  ITEM_IDS.push(id);
 }
}
const ids=new Set(ITEM_IDS), int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const blank=()=>Object.fromEntries(ITEM_IDS.map(k=>[k,0]));
function ensure(s){
 if(!s.hg47)s.hg47={v:1,fragments:blank(),focus:{rare:'weapon',divine:'weapon'},
  worldSeen:s.hg18?.victories||0,towerSeen:s.hg20?.tower?.victories||0,
  crafted:0,last:null,history:[]};
 return s.hg47;
}
function valid(s){
 const x=s?.hg47;if(!x||x.v!==1||!x.fragments||Array.isArray(x.fragments)||!x.focus)return false;
 if(Object.keys(x.fragments).length!==ITEM_IDS.length||!ITEM_IDS.every(k=>int(x.fragments[k])))return false;
 if(!Object.keys(TIERS).every(k=>SLOTS.some(([slot])=>slot===x.focus[k])))return false;
 if(!['worldSeen','towerSeen','crafted'].every(k=>int(x[k])))return false;
 if(x.worldSeen>(s.hg18?.victories||0)||x.towerSeen>(s.hg20?.tower?.victories||0))return false;
 const receipt=q=>q&&ids.has(q.itemId)&&['world','tower'].includes(q.channel)&&
  int(q.ordinal)&&q.ordinal>0&&int(q.count,5)&&q.count>0&&typeof q.target==='string'&&q.target.length<=80;
 if(!Array.isArray(x.history)||x.history.length>20||(x.last!==null&&!receipt(x.last))||!x.history.every(receipt))return false;
 if(s.inventory?.some(row=>E.ITEMS[row.itemId]?.hg47&&(!int(row.uid,1e9)||row.uid===0)))return false;
 for(const [heroId,worn] of Object.entries(s.equipment||{})){
  const hero=s.heroes?.find(h=>String(h.id)===heroId);if(!hero)return false;
  if(Object.keys(worn).some(slot=>!SLOTS.some(s=>s[0]===slot)))return false;
  for(const [slot,uid] of Object.entries(worn)){
   const row=s.inventory.find(i=>i.uid===uid),def=row&&E.ITEMS[row.itemId];
   if(!def||def.slot!==slot||(def.race&&def.race!==(hero.race||s.race)))return false;
  }
 }
 const worn=Object.values(s.equipment||{}).flatMap(o=>Object.values(o||{}));
 return new Set(worn).size===worn.length;
}
function hash(s){
 let v=2166136261;for(let i=0;i<s.length;i++)v=Math.imul(v^s.charCodeAt(i),16777619);
 return v>>>0;
}
function affixes(row){
 const def=E.ITEMS[row?.itemId];if(!def?.hg47)return [];
 const seed=hash(def.id+':'+row.uid),amount=def.tier==='divine'?2:1;
 const choices=def.tier==='divine'?
  ['atk','def','spd','int','damageBonus','meleeDamage','rangedDamage','damageReduction']:
  ['atk','def','spd','int','meleeDamage','rangedDamage'];
 return Array.from({length:amount},(_,i)=>{
  const key=choices[(seed+i*5+(seed>>>8))%choices.length],meta=AFFIXES[key];
  const range=meta[2]-meta[1],roll=((seed>>>((i*7)%24))&255)/255;
  const value=key==='atk'||key==='def'||key==='spd'||key==='int'?
   Math.round((meta[1]+range*roll)*(def.tier==='divine'?1.7:1)):
   Math.round((meta[1]+range*roll)*(def.tier==='divine'?1.3:1)*1000)/1000;
  return {key,value,label:meta[0]+' +'+(key.includes('Damage')||key==='damageBonus'||key==='damageReduction'?Math.round(value*1000)/10+'%':value)};
 });
}
function worn(s,id){return Object.values(s.equipment?.[id]||{}).map(uid=>s.inventory.find(i=>i.uid===uid)).filter(Boolean)}
function counts(s,id){const count={};for(const row of worn(s,id)){const key=E.ITEMS[row.itemId]?.set;if(key)count[key]=(count[key]||0)+1}return count}
function heroStats(s,id=s.activeHero){
 const v=prior.heroStats(s,id);if(!v)return v;
 for(const row of worn(s,id))for(const a of affixes(row))if(['atk','def','spd','int'].includes(a.key))v[a.key]+=a.value;
 return v;
}
function combatModifiers(s,id=s.activeHero){
 const v=prior.combatModifiers(s,id),count=counts(s,id);
 for(const row of worn(s,id))for(const a of affixes(row))if(['damageBonus','meleeDamage','rangedDamage','damageReduction'].includes(a.key))v[a.key]=(v[a.key]||0)+a.value;
 for(const [key,n] of Object.entries(count)){
  if(!SETS[key])continue;
  for(const [level,bonus] of Object.entries(SETS[key].milestones))if(n>=Number(level))
   for(const [stat,value] of Object.entries(bonus))v[stat]=(v[stat]||0)+value;
 }
 for(const k of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])v[k]=Math.min(k==='damageReduction'?.20:.25,Math.max(0,v[k]||0));
 return v;
}
function equip(s,uid,id=s.activeHero){
 const row=s.inventory.find(x=>x.uid===uid),def=row&&E.ITEMS[row.itemId],hero=s.heroes.find(x=>x.id===id);
 if(!def||!hero)throw Error('Không tìm thấy tướng hoặc vật phẩm');
 if(def.race&&def.race!==(hero.race||s.race))throw Error('Trang bị dành riêng cho '+RACES[def.race].name);
 return prior.equip(s,uid,id);
}
function unequip(s,slot,id=s.activeHero){
 if(!SLOTS.some(([key])=>key===slot))throw Error('Ô trang bị không hợp lệ');
 if(['weapon','armor','charm'].includes(slot))return prior.unequip(s,slot,id);
 const uid=s.equipment?.[id]?.[slot];if(!uid)return false;
 const status=E.hg46CanUse(s,uid,id);if(!status.allowed)throw Error(status.reason);
 delete s.equipment[id][slot];E.note(s,'Đã tháo '+(E.ITEMS[s.inventory.find(x=>x.uid===uid)?.itemId]?.name||'trang bị')+'.');
 return true;
}
function statuses(s,race=s.race,tier='rare'){
 ensure(s);
 if(!RACES[race]||!TIERS[tier])throw Error('Chủng tộc hoặc phẩm trang bị không hợp lệ');
 const t=TIERS[tier],gate=tier==='divine'?(s.hg31.bossWins>=1&&s.hg31.paidTowerWins>=3):true;
 return SLOTS.map(([slot,name,icon])=>{
  const id=itemId(race,tier,slot),have=s.hg47.fragments[id],need=t.fragmentCount;
  const materials={...t.cost},missing={fragments:Math.max(0,need-have),
   gold:Math.max(0,t.gold-s.res.gold)};
  for(const [key,n] of Object.entries(t.cost)){
   const owned=key==='bossToken'?s.hg27.boss:key==='towerToken'?s.hg27.tower:s.hg29.shards[key];
   missing[key]=Math.max(0,n-owned);
  }
  return {id,race,tier,slot,name,icon,have,need,cost:t.gold,materials,missing,
   gated:!gate,canCraft:race===s.race&&gate&&Object.values(missing).every(n=>n===0)&&
    s.inventory.length<2000&&!busy(s),focused:s.hg47.focus[tier]===slot};
 });
}
function busy(s){return !!(s.battle||s.march||s.expedition||s.parallelMarches?.length||s.hg26?.enabled)}
function focus(s,tier,slot){
 ensure(s);
 if(!TIERS[tier]||!SLOTS.some(a=>a[0]===slot))throw Error('Mục tiêu farm không hợp lệ');
 if(busy(s))throw Error('Dừng chiến đấu, hành quân hoặc săn Boss trước khi đổi mục tiêu');
 s.hg47.focus[tier]=slot;E.note(s,'HG47: theo đuổi mảnh '+TIERS[tier].name+' ô '+slot+'.');
 return {tier,slot,id:itemId(s.race,tier,slot)};
}
function craft(s,id){
 ensure(s);
 if(!ids.has(id))throw Error('Công thức trang bị không hợp lệ');
 const def=E.ITEMS[id],row=statuses(s,def.race,def.tier).find(x=>x.id===id);
 if(!row?.canCraft)throw Error('Chưa đủ mảnh, nguyên liệu thật, mốc Boss/Tháp, vàng hoặc túi đã đầy');
 const t=TIERS[def.tier];
 // All checks precede the first mutation: no half-paid forge transaction.
 if(!E.ITEMS[id]||s.inventory.length>=2000)throw Error('Không còn chỗ chứa trang bị');
 E.spend(s,{gold:t.gold});
 s.hg47.fragments[id]-=t.fragmentCount;
 for(const [key,n] of Object.entries(t.cost)){
  if(key==='bossToken')s.hg27.boss-=n;
  else if(key==='towerToken')s.hg27.tower-=n;
  else s.hg29.shards[key]-=n;
 }
 const item=E.addItem(s,id,'HG47 ghép mảnh kiếm qua chiến đấu');
 s.hg47.crafted++;
 E.note(s,'HG47: ghép đúng '+def.name+' #'+item.uid+' (đã trừ vàng và vật phẩm).');
 return {uid:item.uid,itemId:id,version:s.version};
}
function grant(s,channel,tier,source,ordinal,target,count){
 const x=ensure(s),id=itemId(s.race,tier,x.focus[tier]);
 if(!ids.has(id))return;
 const actual=Math.min(count,1e9-x.fragments[id]);
 if(actual<1)return;
 x.fragments[id]+=actual;
 const receipt={channel,itemId:id,target:String(target),ordinal,count:actual};
 x.last=receipt;x.history.unshift(receipt);x.history.length=Math.min(x.history.length,20);
 E.note(s,'HG47 '+source+': +'+actual+' mảnh '+E.ITEMS[id].name+' (đang theo đuổi).');
}
function battleAct(s,action,opts){
 const b=s.battle?{kind:s.battle.kind,target:String(s.battle.target||''),
  level:s.battle.level||0,floor:s.battle.hg21Tower?.floor||0}:null;
 const result=prior.battleAct(s,action,opts);
 if(!b||result?.type!=='win')return result;
 const x=ensure(s);
 if(b.kind==='tower'){
  const ordinal=s.hg20?.tower?.victories||0;
  if(ordinal>x.towerSeen){x.towerSeen=ordinal;
   if(result.claimed){
    grant(s,'tower','rare','Tháp',ordinal,'floor-'+b.floor,1);
    grant(s,'tower','divine','Tháp có thưởng',ordinal,'floor-'+b.floor,2);
   }
  }
 }else{
  const ordinal=s.hg18?.victories||0;if(ordinal<=x.worldSeen)return result;
  x.worldSeen=ordinal;
  const tile=E.getTile(b.target),elite=tile?.eliteTier||0;
  const hashRoll=hash(b.target+':'+ordinal+':'+s.race)%100;
  if(b.kind==='npc'&&elite>=11){
   grant(s,'world','rare','Boss T11+',ordinal,b.target,2);
   grant(s,'world','divine','Boss T11+',ordinal,b.target,elite>=13?3:2);
  }else if(b.kind==='npc'&&(tile?.level||b.level)>=4){
   grant(s,'world','rare','Quái Elite',ordinal,b.target,1+(hashRoll%2));
   if(hashRoll<5)grant(s,'world','divine','Elite hiếm',ordinal,b.target,1);
  }else if(b.kind==='npc'&&hashRoll<60){
   grant(s,'world','rare','Quái thường',ordinal,b.target,1);
  }else if(b.kind==='treasure'){
   grant(s,'world','rare','Kho báu',ordinal,b.target,1);
  }
 }
 return result;
}
function sets(s,id){
 return [...prior.sets(s,id),...Object.entries(SETS).filter(([,set])=>set.race===(s.heroes.find(h=>h.id===id)?.race||s.race)).map(([key,set])=>({
  id:key,name:set.name,count:counts(s,id)[key]||0,max:10,
  note:set.note,source:set.source,milestones:[3,6,10]
 }))];
}
function gearStats(row){
 const base=prior.stats(row);if(!base)return base;
 for(const a of affixes(row))if(['atk','def','spd','int'].includes(a.key))base[a.key]=(base[a.key]||0)+a.value;
 return base;
}
function gearKind(row){const def=E.ITEMS[row?.itemId];return def?.hg47?def.tier:prior.kind(row)}
function suggest(s,id=s.activeHero,mode='balanced'){
 const start=prior.metrics(s,id,mode),initial={...s.equipment?.[id]||{}};
 if(!['balanced','attack','defense'].includes(mode))throw Error('Kiểu trang bị không hợp lệ');
 const hero=s.heroes.find(h=>h.id===id);if(!hero)return {allowed:false,reason:'Không tìm thấy tướng',gain:0};
 const locked=Object.values(s.equipment||{}).filter(Boolean).flatMap(o=>Object.values(o)).filter(uid=>
  !Object.values(initial).includes(uid));
 if(busy(s)||E.heroAway?.(s,id)||E.hg20HeroRole?.(s,id)?.status!=='home')
  return {allowed:false,reason:'Tướng đang bận',gain:0,score:start.score,changed:0,slots:initial};
 const trial=E.clone(s),bySlot=Object.fromEntries(SLOTS.map(([slot])=>[slot,s.inventory.filter(row=>{
  const def=E.ITEMS[row.itemId];return def?.slot===slot&&!locked.includes(row.uid)&&
   (!def.race||def.race===(hero.race||s.race));
 }).sort((a,b)=>((b.enhance||0)-(a.enhance||0))||
  (E.ITEMS[b.itemId].atk+E.ITEMS[b.itemId].def)-(E.ITEMS[a.itemId].atk+E.ITEMS[a.itemId].def)).slice(0,18)]));
 let score=start.score,slots={...initial};
 // Bounded deterministic coordinate ascent: 10 slots, 2 sweeps, no 12^10 search.
 for(let pass=0;pass<3;pass++){
  let changed=false;
  for(const [slot] of SLOTS){
   const current=slots[slot]||null,candidates=[null,current,...bySlot[slot].map(i=>i.uid)];
   let next=current,best=score;
   for(const uid of new Set(candidates)){
    if(uid==null)delete trial.equipment[id][slot];
    else trial.equipment[id][slot]=uid;
    const value=prior.metrics(trial,id,mode).score;
    if(value>best+.005){best=value;next=uid}
   }
   if(next==null)delete trial.equipment[id][slot];else trial.equipment[id][slot]=next;
   if(next!==current){changed=true;slots={...trial.equipment[id]};score=best}
  }
  if(!changed)break;
 }
 const n=SLOTS.filter(([slot])=>(initial[slot]||null)!==(slots[slot]||null)).length;
 return {allowed:true,score:start.score,targetScore:score,gain:Math.round((score-start.score)*100)/100,
  changed:n,slots,mode,sets:sets(s,id)};
}
function autoEquip(s,id=s.activeHero,mode='balanced'){
 const q=suggest(s,id,mode);if(!q.allowed)throw Error(q.reason);
 if(!q.changed||q.gain<=0)return {...q,applied:false};
 const trial=E.clone(s);trial.equipment[id]={...q.slots};
 if(!E.strictSave(trial))throw Error('Bộ tự chọn không hợp lệ với Save v07');
 s.equipment[id]={...q.slots};
 E.note(s,'HG47: chọn tự động '+q.changed+' ô từ kho không có chủ; không tạo trang bị.');
 return {...q,applied:true};
}
function make(...args){return ensure(prior.make(...args))}
function parse(raw){const s=prior.parse(raw);ensure(s);if(!valid(s)||!prior.strict(s))throw Error('Save HG47 không hợp lệ');return s}
function strict(s){return prior.strict(s)&&valid(s)}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG47 không hợp lệ');return prior.serialize(s)}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,heroStats,combatModifiers,equipItem:equip,unequipItem:unequip,
 hg46Stats:gearStats,hg46Kind:gearKind,hg46Sets:sets,hg46Suggest:suggest,hg46AutoEquip:autoEquip,
 hg47Ensure:ensure,hg47Valid:valid,hg47Affixes:affixes,hg47Status:statuses,
 hg47SetFocus:focus,hg47Craft:craft,hg47ItemId:itemId,hg47SetCounts:counts,
 HG47_SLOTS:SLOTS,HG47_RACES:RACES,HG47_TIERS:TIERS,HG47_SETS:Object.freeze(SETS)});
root.HOG_HG47=Object.freeze({version:1,saveVersion:7,slotCount:10,gearCount:ITEM_IDS.length,setCount:Object.keys(SETS).length});
})(typeof globalThis!=='undefined'?globalThis:this);
