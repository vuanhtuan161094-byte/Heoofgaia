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
 // For Human, both the racial modifier and the 10-piece universal bonus
 // are damageReduction. Combine them; object literal duplicate keys overwrite.
 if(special==='damageReduction')bonuses.ten.damageReduction+=(n===1?.025:.04);
 const tenNote=special==='damageReduction'?
  Math.round(bonuses.ten.damageReduction*1e3)/10+'% giảm sát thương tổng':
  Math.round(bonuses.ten[special]*1e3)/10+'% '+r.tag+' và +'+n+'% giảm sát thương';
 SETS[race+'_'+tier]=Object.freeze({
  name:r.base+' · '+t.name,race,tier,max:10,icon:r.icon,
  source:tier==='rare'?'Quái thường, Elite, Boss và Tháp có thưởng':'Elite hiếm, Boss T11+ và Tháp có thưởng',
  milestones:Object.freeze(bonuses),
  note:'3 món: '+Math.round(bonuses.three[special]*1e3)/10+'% · 6 món: +'+Math.round(bonuses.six[special]*1e3)/10+
   '% · 10 món: +'+tenNote
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
  const racial={human:[0,3,0],elf:[0,0,2],orc:[3,0,0],undead:[1,1,1]}[race];
  E.ITEMS[id]={id,name:r.base+' '+SLOT_NAMES[slot]+' · '+t.name,
   slot,icon,atk:Math.round((5+(index%3)*2+racial[0])*n),
   def:Math.round((4+((index+1)%3)*2+racial[1])*n),spd:Math.round((1+index%2+racial[2])*n),
   int:0,set:race+'_'+tier,race,tier,cost:0,level:10,shop:false,hg47:true};
  ITEM_IDS.push(id);
 }
}

/* Deterministic local SVG glyphs: 10 silhouettes, race-coloured frames, divine glow.
 * No remote asset, extra HTML entry, image crop or asynchronous render dependency.
 */
function iconHTML(id,size=52){
 const item=E.ITEMS[id];if(!item?.hg47)return '';
 const color={human:'#ebce80',elf:'#7cdbb2',orc:'#ed9275',undead:'#baabea'}[item.race];
 const glow=item.tier==='divine'?'#f6d779':color;
 const shapes={
  weapon:'<path d="M47 13h10l-3 51-6 9-6-9zM29 65h46v8H29zM45 73h14v23H45z"/>',
  armor:'<path d="M26 25 39 15 52 25 65 15 78 25 84 52 73 60 70 93H34L31 60 20 52z"/><path d="M42 40h20v35H42z" fill="#11212c"/>',
  helm:'<path d="M22 43 28 22 40 39 52 14 64 39 77 22 82 43 77 79 52 92 27 79z"/><path d="M30 50h44v12H30z" fill="#14252f"/>',
  gloves:'<path d="M25 70 21 36 29 29 36 52V24l8-5 6 30V20l8-3 6 32V26l9 2 5 35-13 26H41z"/>',
  boots:'<path d="M34 17h30v42l13 10 9 20-7 7H25l-9-11 15-16z"/><path d="M33 56h32v8H33z" fill="#132734"/>',
  belt:'<path d="M12 37h80v32H12z"/><rect x="38" y="30" width="28" height="46" rx="3" fill="#1d313c"/><path d="M43 35h18v36H43z"/>',
  necklace:'<path d="M23 22q-2 38 29 49 31-11 29-49" fill="none"/><path d="M52 54 68 73 52 97 36 73z"/>',
  ring:'<ellipse cx="52" cy="63" rx="24" ry="30" fill="none"/><path d="M52 11 68 29 52 48 36 29z"/>',
  charm:'<path d="M52 12 81 33 72 82 52 98 32 82 23 33z"/><path d="M52 27 66 51 52 76 38 51z" fill="#1c313b"/>',
  relic:'<path d="M52 8 79 35 73 78 52 101 31 78 25 35z"/><path d="M52 17v72M31 38h42M34 78h36" fill="none"/>'
 };
 const px=Math.max(24,Math.min(112,Number(size)||52)),body=shapes[item.slot];
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 108">'+
  '<defs><radialGradient id="bg"><stop stop-color="'+glow+'" stop-opacity=".25"/><stop offset="1" stop-color="#0d1b2a"/></radialGradient>'+
  '<filter id="g"><feGaussianBlur stdDeviation="1.3"/></filter></defs>'+
  '<rect x="4" y="4" width="96" height="100" rx="13" fill="url(#bg)" stroke="'+color+'" stroke-width="'+(item.tier==='divine'?3:1.5)+'"/>'+
  (item.tier==='divine'?'<circle cx="52" cy="54" r="43" stroke="'+glow+'" stroke-width="2" opacity=".75" fill="none" filter="url(#g)"/>':'')+
  '<g fill="'+color+'" stroke="'+glow+'" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round">'+body+'</g>'+
  (item.tier==='divine'?'<path d="M52 4l5 8-5 8-5-8z" fill="#fff4bc"/>':'')+'</svg>';
 return '<img class="hg47-art hg47-art-'+item.tier+'" src="data:image/svg+xml;charset=utf-8,'+
  encodeURIComponent(svg)+'" width="'+px+'" height="'+px+'" alt="" loading="lazy">';
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
  for(const [level,bonus] of Object.entries(SETS[key].milestones))if(n>=({three:3,six:6,ten:10})[level])
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
 if(!['balanced','attack','defense'].includes(mode))throw Error('Kiểu trang bị không hợp lệ');
 const hero=s.heroes.find(h=>h.id===id);
 if(!hero)return {allowed:false,reason:'Không tìm thấy tướng',gain:0};
 const start=prior.metrics(s,id,mode),initial={...s.equipment?.[id]||{}};
 if(busy(s)||E.heroAway?.(s,id)||E.hg20HeroRole?.(s,id)?.status!=='home')
  return {allowed:false,reason:'Tướng đang bận',gain:0,score:start.score,changed:0,slots:initial};
 // Work only with canonical owned objects. Never borrow another hero's UID.
 const forbidden=new Set(Object.entries(s.equipment||{}).filter(([owner])=>Number(owner)!==id)
  .flatMap(([,items])=>Object.values(items||{})));
 const race=hero.race||s.race;
 const weights={
  balanced:{atk:1,def:1,spd:.7,int:.45,damageBonus:220,meleeDamage:110,rangedDamage:110,damageReduction:220},
  attack:{atk:1.65,def:.48,spd:.8,int:.45,damageBonus:360,meleeDamage:180,rangedDamage:180,damageReduction:100},
  defense:{atk:.55,def:1.65,spd:.55,int:.5,damageBonus:90,meleeDamage:45,rangedDamage:45,damageReduction:430}
 }[mode];
 const itemValue=row=>{
  if(!row)return 0;
  const def=E.ITEMS[row.itemId],st=E.hg46Stats(row),value=st.atk*weights.atk+
   st.def*weights.def+st.spd*weights.spd+(st.int||0)*weights.int;
  let bonus=0;for(const key of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])
   bonus+=(def[key]||0)*weights[key];
  // Affixes on a given UID affect combat and should influence candidate ordering.
  for(const aff of affixes(row))if(weights[aff.key]&&
   !['atk','def','spd','int'].includes(aff.key))bonus+=aff.value*weights[aff.key];
  return value+bonus;
 };
 const bySlot=Object.fromEntries(SLOTS.map(([slot])=>[slot,[]]));
 const bySet=new Map();
 for(const row of s.inventory){
  const def=E.ITEMS[row.itemId];
  if(!def||!bySlot[def.slot]||forbidden.has(row.uid)||
     (def.race&&def.race!==race))continue;
  bySlot[def.slot].push(row);
  if(def.set){
   if(!bySet.has(def.set))bySet.set(def.set,new Map());
   const group=bySet.get(def.set),priorItem=group.get(def.slot);
   if(!priorItem||itemValue(row)>itemValue(priorItem))group.set(def.slot,row);
  }
 }
 // Keep an affordable candidate budget regardless of the 2,000-slot inventory.
 // A best-per-set item is always represented even when weaker than top singles.
 for(const [slot] of SLOTS){
  const all=bySlot[slot].sort((a,b)=>itemValue(b)-itemValue(a)||a.uid-b.uid);
  const favorites=[...bySet.values()].map(m=>m.get(slot)).filter(Boolean);
  bySlot[slot]=[...new Map([...all.slice(0,6),...favorites].map(row=>[row.uid,row])).values()].slice(0,14);
 }
 const trial=E.clone(s);
 function evaluate(choice){
  trial.equipment[id]={...choice};
  return prior.metrics(trial,id,mode).score;
 }
 let best={score:start.score,slots:initial,changed:0};
 function consider(choice,score=evaluate(choice)){
  const changed=SLOTS.filter(([slot])=>(choice[slot]||null)!==(initial[slot]||null)).length;
  if(score>best.score+.005||(Math.abs(score-best.score)<.005&&changed<best.changed))
   best={score,slots:{...choice},changed};
 }
 // Start with actual complete set milestones, not only single-slot hill-climbing.
 // Without this, a 3/6/10-piece bonus can be missed when every first swap loses
 // some raw ATK/DEF but the completed combination is stronger.
 for(const [setId,group] of bySet){
  const levels=SETS[setId]?[3,6,10]:[2,3];
  const options=[...group.entries()].map(([slot,row])=>{
   const current=s.inventory.find(x=>x.uid===initial[slot]);
   return {slot,row,delta:itemValue(row)-itemValue(current)};
  }).sort((a,b)=>b.delta-a.delta||a.slot.localeCompare(b.slot));
  for(const n of levels){
   if(options.length<n)continue;
   const candidate={...initial};
   for(const {slot,row} of options.slice(0,n))candidate[slot]=row.uid;
   consider(candidate);
  }
 }
 // At most two bounded passes, starting from the current configuration and
 // from the strongest *whole-set* seed. No exponential 10-slot search.
 function refine(seed){
  const choice={...seed};let score=evaluate(choice);
  for(let pass=0;pass<2;pass++){
   let updated=false;
   for(const [slot] of SLOTS){
    const before=choice[slot]||null;
    let selected=before,selectedScore=score;
    for(const uid of new Set([null,before,...bySlot[slot].map(row=>row.uid)])){
     if(uid===before)continue;
     if(uid===null)delete choice[slot];else choice[slot]=uid;
     const candidateScore=evaluate(choice);
     if(candidateScore>selectedScore+.005){selected=uid;selectedScore=candidateScore}
    }
    if(selected===null)delete choice[slot];else choice[slot]=selected;
    if(selected!==before){score=selectedScore;updated=true}
   }
   if(!updated)break;
  }
  consider(choice,score);
 }
 refine(initial);
 if(Object.keys(best.slots).some(slot=>best.slots[slot]!==initial[slot]))refine(best.slots);
 return {allowed:true,score:start.score,targetScore:best.score,
  gain:Math.round((best.score-start.score)*100)/100,
  changed:best.changed,slots:best.slots,mode,sets:sets(s,id)};
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
function make(...args){const s=prior.make(...args);ensure(s);return s}
function parse(raw){const s=prior.parse(raw);ensure(s);if(!valid(s)||!prior.strict(s))throw Error('Save HG47 không hợp lệ');return s}
function strict(s){return prior.strict(s)&&valid(s)}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG47 không hợp lệ');return prior.serialize(s)}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,heroStats,combatModifiers,equipItem:equip,unequipItem:unequip,
 hg46Stats:gearStats,hg46Kind:gearKind,hg46Sets:sets,hg46Suggest:suggest,hg46AutoEquip:autoEquip,
 hg47IconHTML:iconHTML,hg47Ensure:ensure,hg47Valid:valid,hg47Affixes:affixes,hg47Status:statuses,
 hg47SetFocus:focus,hg47Craft:craft,hg47ItemId:itemId,hg47SetCounts:counts,
 HG47_SLOTS:SLOTS,HG47_RACES:RACES,HG47_TIERS:TIERS,HG47_SETS:Object.freeze(SETS)});
root.HOG_HG47=Object.freeze({version:1,saveVersion:7,slotCount:10,gearCount:ITEM_IDS.length,setCount:Object.keys(SETS).length});
})(typeof globalThis!=='undefined'?globalThis:this);
