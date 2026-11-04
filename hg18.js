/* HG18: offline expansions. The Fandom documents equipment, daily quests
 * and tier-11/12 DEMON enemies; rebirth, sets, crafting, enhancement, weekly
 * quests and reward-only allied units below are ORIGINAL offline game rules.
 * Keep Save v07 and the original 40 recruitable troop definitions intact.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E||E.V!==7||!E.ensure10)throw Error('HG18 requires the HG10 v07 runtime');
const raw={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,valid:E.valid,
 tick:E.tick,battleAct:E.battleAct,heroStats:E.heroStats,combatModifiers:E.combatModifiers,
 buyItem:E.buyItem,hire:E.hire,hireCandidate:E.hireCandidate};
const RACES=['human','elf','orc','undead'],PACK=['copper_blade','iron_armor','ash_bow','traveler_cloak','quartz_ring','old_talisman'];
const MATERIALS=Object.freeze({
 resource_card:{name:'Thẻ tài nguyên nhỏ',icon:'💰'},
 resource_chest:{name:'Thẻ tài nguyên lớn',icon:'📦'},
 gear_pack:{name:'Rương trang bị phổ thông',icon:'🎒'},
 set_chest:{name:'Hòm bộ Vệ Binh',icon:'🛡'},
 enhance_stone:{name:'Đá cường hóa',icon:'💎'},
 hero_reset:{name:'Thẻ tẩy điểm tướng',icon:'🔄'},
 rank_emblem:{name:'Ấn nâng bậc tướng',icon:'🔱'},
 rebirth_core:{name:'Lõi chuyển sinh',icon:'🌟'},
 astral_shard:{name:'Mảnh tinh vân hiếm',icon:'✨'}
});
const SETS=Object.freeze({
 sentinel:{name:'Vệ Binh Gaia',two:{damageReduction:.025},three:{damageBonus:.035}},
 astral:{name:'Tinh Vân Cổ Đại',two:{damageBonus:.035},three:{damageBonus:.035,damageReduction:.05}}
});
const EXTRA_GEAR=[
 ['sentinel_sword','Kiếm Vệ Binh','weapon','⚔',9,2,0,'sentinel'],
 ['sentinel_plate','Giáp Vệ Binh','armor','🛡',0,13,0,'sentinel'],
 ['sentinel_seal','Ấn Vệ Binh','charm','🔰',3,5,2,'sentinel'],
 ['astral_sword','Tinh Vân Thần Kiếm','weapon','⚔',24,6,3,'astral'],
 ['astral_plate','Tinh Vân Hộ Giáp','armor','🛡',4,27,1,'astral'],
 ['astral_seal','Tinh Vân Thánh Ấn','charm','💠',9,11,5,'astral']
];
for(const [id,name,slot,icon,atk,def,spd,set] of EXTRA_GEAR){
 if(E.ITEMS[id])throw Error('Duplicate HG18 gear '+id);
 E.ITEMS[id]={id,name,slot,icon,atk,def,spd,int:0,cost:0,level:10,shop:false,set};
}
// Reward-only allied units. NPC Demon T11/12 are enemies; these four are
// modeled quest-only allies with real nonzero command values, NOT source T11.
C.rewardUnits=Object.freeze(Object.fromEntries(RACES.map((race,i)=>[race,Object.freeze([Object.freeze({
 id:race+'_quest_guard',race,tier:8,
 name:['Thần Vệ Gaia','Nguyệt Vệ Tinh Linh','Chiến Vệ Cuồng Phong','U Minh Hộ Vệ'][i],
 type:i===1?'Ranged':'Melee',hp:240+i*12,atk:85+i*2,def:71+i*2,
 spd:7.6+i*.15,load:75,cost:{gold:900,wood:40,ore:40,sulfur:15,crystal:15},timeSec:0,rewardOnly:true
})])])));
const TASKS=Object.freeze({
 daily:Object.freeze([
  {id:'daily_build',name:'Thợ xây lãnh địa',metric:'builds',need:1,reward:{resource_card:1}},
  {id:'daily_recruit',name:'Đội quân mới',metric:'trained',need:10,reward:{enhance_stone:2}},
  {id:'daily_npc',name:'Dẹp loạn',metric:'npcWins',need:1,reward:{gear_pack:1}},
  {id:'daily_mine',name:'Chinh phục mỏ',metric:'mineWins',need:1,reward:{astral_shard:1}}
 ]),
 weekly:Object.freeze([
  {id:'weekly_build',name:'Kiến thiết bền vững',metric:'builds',need:8,reward:{resource_chest:2}},
  {id:'weekly_army',name:'Quân đoàn trưởng thành',metric:'trained',need:50,reward:{set_chest:1,enhance_stone:5}},
  {id:'weekly_npc',name:'Thợ săn thế giới',metric:'npcWins',need:5,reward:{rank_emblem:1,hero_reset:1}},
  {id:'weekly_boss',name:'Diệt vương ma giới',metric:'eliteWins',need:1,reward:{rebirth_core:1,astral_shard:3,specialSoldier:1}}
 ])
});
function assert(x,msg){if(!x)throw Error(msg)}
function dayKey(now){return new Date(now).toISOString().slice(0,10)}
function weekKey(now){const d=new Date(now),w=d.getUTCDay(),offset=(w+6)%7;
 d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().slice(0,10)}
function period(key){return {key,counts:{builds:0,trained:0,npcWins:0,mineWins:0,eliteWins:0},claimed:[]}}
function ensure(s){
 if(!s||!Array.isArray(s.heroes))throw Error('Không có dữ liệu vương quốc');
 if(!s.hg18)s.hg18={version:1,materials:Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,0])),
   day:period(dayKey(s.lastTick)),week:period(weekKey(s.lastTick)),victories:0,packSeq:0,setSeq:0,craftSeq:0};
 const x=s.hg18;if(x.version!==1||!x.materials||!x.day||!x.week)throw Error('Dữ liệu phát triển HG18 không hợp lệ');
 for(const k of Object.keys(MATERIALS))if(x.materials[k]===undefined)x.materials[k]=0;
 for(const h of s.heroes){
  if(h.rebirth===undefined)h.rebirth=0;
  if(h.heroRank===undefined)h.heroRank=1;
  if(!h.hg18Base)h.hg18Base=Object.fromEntries(['atk','def','spd','int'].map(k=>[k,h[k]-(h.spentAttributePoints?.[k]||0)]));
 }
 return s;
}
function sync(s){ensure(s);const x=s.hg18,d=dayKey(s.lastTick),w=weekKey(s.lastTick);
 if(x.day.key!==d)x.day=period(d);
 if(x.week.key!==w)x.week=period(w);
 return x;
}
function valid(s){
 const x=s?.hg18;if(!x||x.version!==1||!x.materials||!x.day||!x.week)return false;
 const integer=(v,limit=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=limit;
 if(Object.keys(x.materials).some(k=>!MATERIALS[k])||Object.keys(MATERIALS).some(k=>!integer(x.materials[k],1e6)))return false;
 if(!['victories','packSeq','setSeq','craftSeq'].every(k=>integer(x[k])))return false;
 for(const [k,p] of [['day',x.day],['week',x.week]]){
  if(!p||typeof p.key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.key)||!p.counts||typeof p.counts!=='object'||Array.isArray(p.counts)||!Array.isArray(p.claimed))return false;
  if(Object.keys(p.counts).some(k=>!['builds','trained','npcWins','mineWins','eliteWins'].includes(k))||
     ['builds','trained','npcWins','mineWins','eliteWins'].some(key=>!integer(p.counts[key],1e9)))return false;
  const known=TASKS[k==='day'?'daily':'weekly'].map(t=>t.id);
  if(new Set(p.claimed).size!==p.claimed.length||p.claimed.some(id=>!known.includes(id)))return false;
 }
 if(!Array.isArray(s.inventory)||s.inventory.some(i=>!E.ITEMS[i?.itemId]||!integer(i.enhance||0,10)))return false;
 for(const h of s.heroes){
  const rebirth=h.rebirth??0,rank=h.heroRank??1;
  const base=h.hg18Base||Object.fromEntries(['atk','def','spd','int'].map(k=>[k,h[k]-(h.spentAttributePoints?.[k]||0)]));
  if(!integer(rebirth,5)||!integer(rank,5)||rank<1||['atk','def','spd','int'].some(k=>!Number.isFinite(base[k])||base[k]<0||base[k]>1e5))return false;
 }
 return true;
}
function track(s,metric,n){
 sync(s);if(!Number.isSafeInteger(n)||n<1||n>1e6)throw Error('Số lượng tiến độ không hợp lệ');
 for(const p of [s.hg18.day,s.hg18.week])p.counts[metric]=Math.min(1e9,p.counts[metric]+n);
}
function taskBoard(s,cycle){return s.hg18[cycle==='daily'?'day':'week']}
function tasks(s,cycle){sync(s);assert(TASKS[cycle],'Chu kỳ nhiệm vụ không hợp lệ');
 const p=taskBoard(s,cycle);return TASKS[cycle].map(t=>({...t,progress:Math.min(t.need,p.counts[t.metric]),
  claimed:p.claimed.includes(t.id),ready:p.counts[t.metric]>=t.need}));
}
function addMaterial(s,id,n){ensure(s);assert(MATERIALS[id],'Vật phẩm nguyên liệu không tồn tại');assert(Number.isSafeInteger(n)&&n>0&&n<=1e6,'Số nguyên liệu không hợp lệ');
 assert(s.hg18.materials[id]+n<=1e6,'Túi nguyên liệu đầy');s.hg18.materials[id]+=n;
}
function grantSpecial(s,n){
 assert(Number.isSafeInteger(n)&&n>0&&n<=100,'Số lính thưởng không hợp lệ');
 const unit=C.rewardUnits[s.race][0];s.army[unit.id]=(s.army[unit.id]||0)+n;
 assert(s.army[unit.id]<=1e8,'Giới hạn quân thưởng');
 return unit.id;
}
function claimTask(s,cycle,id){
 sync(s);const t=TASKS[cycle]?.find(q=>q.id===id);assert(t,'Nhiệm vụ không tồn tại');
 const p=taskBoard(s,cycle);assert(!p.claimed.includes(id),'Đã nhận thưởng chu kỳ này');assert(p.counts[t.metric]>=t.need,'Nhiệm vụ chưa đủ tiến độ');
 for(const [k,n] of Object.entries(t.reward))if(k!=='specialSoldier')assert(s.hg18.materials[k]+n<=1e6,'Túi nguyên liệu đầy');
 if(t.reward.specialSoldier)assert((s.army[C.rewardUnits[s.race][0].id]||0)+t.reward.specialSoldier<=1e8,'Quân vượt giới hạn');
 for(const [k,n] of Object.entries(t.reward))k==='specialSoldier'?grantSpecial(s,n):addMaterial(s,k,n);
 p.claimed.push(id);E.note(s,'Hoàn thành '+t.name+'; thưởng đã vào túi đồ'+(t.reward.specialSoldier?' và quân đặc biệt':'')+'.');
 return t.reward;
}
const CARDS=Object.freeze({
 resource_card:{gold:600,wood:80,ore:80,sulfur:20,crystal:20},
 resource_chest:{gold:2400,wood:300,ore:300,sulfur:100,crystal:100}
});
function openPack(s,id){
 sync(s);assert(s.hg18.materials[id]>=1,'Không có thẻ hoặc rương này');
 assert(CARDS[id]||id==='gear_pack'||id==='set_chest','Vật phẩm này không thể mở trực tiếp');
 if(CARDS[id]){
  const reward=CARDS[id],limit=E.limits(s);
  for(const k of C.keys)assert(s.res[k]+reward[k]<=limit[k]+1e-7,'Kho '+C.resource[k].label+' không đủ chỗ');
  s.hg18.materials[id]--;E.add(s,reward);E.note(s,'Dùng '+MATERIALS[id].name+' nhận tài nguyên.');return reward;
 }
 assert(s.inventory.length<2000,'Túi trang bị đầy');
 const itemId=id==='gear_pack'?PACK[s.hg18.packSeq++%PACK.length]:
 ['sentinel_sword','sentinel_plate','sentinel_seal'][s.hg18.setSeq++%3];
 s.hg18.materials[id]--;const gear=E.addItem(s,itemId,'HG18 mission chest');
 E.note(s,'Mở rương nhận '+E.ITEMS[itemId].name);return gear;
}
function craft(s,id){
 sync(s);assert(id==='astral','Công thức ghép không hợp lệ');
 assert(s.hg18.materials.astral_shard>=8,'Cần 8 mảnh Tinh Vân');
 assert(s.inventory.length<2000,'Túi trang bị đầy');
 const item=['astral_sword','astral_plate','astral_seal'][s.hg18.craftSeq++%3];
 s.hg18.materials.astral_shard-=8;return E.addItem(s,item,'Ghép 8 mảnh hiếm · HG18');
}
// Salvage is the sustainable overflow sink for 2,000 equipment inventory slots.
// Once dismantled, equipped objects can never be regenerated from the same UID.
function salvage(s,uid){
 sync(s);assert(!s.march&&!s.battle,'Không thể phân giải trong khi xuất chinh');
 const row=s.inventory.find(i=>i.uid===uid);assert(row,'Trang bị không tồn tại');
 assert(!Object.values(s.equipment).some(slots=>Object.values(slots).includes(uid)),'Hãy tháo trang bị trước khi phân giải');
 const gear=E.ITEMS[row.itemId],stones=1+Math.floor((row.enhance||0)/2),shards=gear.set==='astral'?3:0;
 assert(s.hg18.materials.enhance_stone+stones<=1e6,'Kho đá cường hóa đầy');
 assert(s.hg18.materials.astral_shard+shards<=1e6,'Kho mảnh Tinh Vân đầy');
 s.inventory=s.inventory.filter(i=>i.uid!==uid);
 addMaterial(s,'enhance_stone',stones);
 if(shards)addMaterial(s,'astral_shard',shards);
 E.note(s,'Phân giải '+gear.name+' nhận '+stones+' đá cường hóa'+(shards?', '+shards+' mảnh tinh vân':'')+'.');
 return {stones,shards};
}
function enhance(s,uid){
 sync(s);assert(!s.march&&!s.battle&&!E.heroAway?.(s,s.activeHero),'Không thể cường hóa khi tướng đang xuất chinh');
 const i=s.inventory.find(q=>q.uid===uid);assert(i,'Trang bị không tồn tại');
 const lv=i.enhance||0;assert(lv<10,'Đã đạt cường hóa +10');
 const stones=2+2*lv,gold=250*(lv+1);
 assert(s.hg18.materials.enhance_stone>=stones,'Thiếu đá cường hóa');
 assert(E.canAfford(s,{gold}),'Thiếu vàng cường hóa');
 E.spend(s,{gold});s.hg18.materials.enhance_stone-=stones;i.enhance=lv+1;
 E.note(s,E.ITEMS[i.itemId].name+' cường hóa thành công lên +'+i.enhance+' (không RNG).');
 return i.enhance;
}
function rankHero(s,id){
 sync(s);const h=s.heroes.find(x=>x.id===id);assert(h,'Tướng không tồn tại');
 assert(!s.march&&!s.battle&&!E.heroAway?.(s,id),'Tướng đang xuất chinh');
 assert(h.heroRank<5,'Bậc tối đa 5');
 assert(h.level>=h.heroRank*20,'Cần tướng cấp '+(h.heroRank*20)+' để nâng bậc');
 assert(s.hg18.materials.rank_emblem>=1,'Thiếu Ấn nâng bậc');
 s.hg18.materials.rank_emblem--;h.heroRank++;E.note(s,h.name+' nâng bậc '+h.heroRank+'.');return h.heroRank;
}
function resetHero(s,id){
 sync(s);const h=s.heroes.find(x=>x.id===id);assert(h,'Tướng không tồn tại');
 assert(!s.march&&!s.battle&&!E.heroAway?.(s,id),'Tướng đang xuất chinh');
 assert(s.hg18.materials.hero_reset>=1,'Thiếu thẻ tẩy điểm');
 const spent=h.spentAttributePoints||{},n=Object.values(spent).reduce((sum,v)=>sum+v,0);
 assert(n>0,'Tướng chưa phân phối điểm');for(const key of ['atk','def','spd','int'])assert(h[key]>=(spent[key]||0),'Điểm tướng không nhất quán');
 s.hg18.materials.hero_reset--;for(const key of ['atk','def','spd','int']){h[key]-=spent[key]||0;h.spentAttributePoints[key]=0}
 h.statPoints+=n;E.note(s,h.name+' tẩy và hoàn trả '+n+' điểm phân phối.');return n;
}
function rebirthHero(s,id){
 sync(s);const h=s.heroes.find(x=>x.id===id);assert(h,'Tướng không tồn tại');
 assert(!s.march&&!s.battle&&!E.heroAway?.(s,id)&&s.castellan!==id,'Tháo chức Castellan hoặc gọi tướng về trước');
 assert(h.level===100,'Chỉ chuyển sinh tại cấp 100');
 assert(h.rebirth<5,'Đã đạt 5 lần chuyển sinh');
 const price=5000*(h.rebirth+1);
 assert(s.hg18.materials.rebirth_core>=1,'Thiếu Lõi chuyển sinh');
 assert(E.canAfford(s,{gold:price}),'Thiếu vàng chuyển sinh');
 E.spend(s,{gold:price});s.hg18.materials.rebirth_core--;
 h.rebirth++;h.level=1;h.xp=0;h.statPoints=0;
 for(const k of ['atk','def','spd','int']){h[k]=h.hg18Base[k];h.spentAttributePoints[k]=0}
 E.note(s,h.name+' chuyển sinh lần '+h.rebirth+'; về cấp 1, giữ trang bị và bậc, được +4% chỉ số/lần.');return h.rebirth;
}
function equipped(s,id){
 return Object.values(s.equipment?.[id]||{}).map(uid=>s.inventory.find(q=>q.uid===uid)).filter(Boolean);
}
function setCounts(s,id){const rows=equipped(s,id),counts={};
 for(const row of rows){const set=E.ITEMS[row.itemId]?.set;if(set)counts[set]=(counts[set]||0)+1}
 return counts;
}
function heroStats(s,id=s.activeHero){
 ensure(s);const value=raw.heroStats(s,id);if(!value)return null;
 const h=s.heroes.find(q=>q.id===id);if(!h)return value;
 for(const row of equipped(s,id)){
  const gear=E.ITEMS[row.itemId],lv=row.enhance||0;
  for(const k of ['atk','def','spd'])value[k]+=Math.ceil((gear[k]||0)*lv*.08);
 }
 const multiplier=1+.02*(h.heroRank-1)+.04*h.rebirth;
 for(const k of ['atk','def','spd','int'])value[k]=Math.round(value[k]*multiplier*1000)/1000;
 return value;
}
function combatModifiers(s,id=s.activeHero){
 ensure(s);const v=raw.combatModifiers(s,id);
 for(const row of equipped(s,id)){
  const gear=E.ITEMS[row.itemId];for(const k of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])
   v[k]+=(gear[k]||0)*(row.enhance||0)*.05;
 }
 const counts=setCounts(s,id);
 for(const [set,count] of Object.entries(counts)){
  if(!SETS[set])continue;
  for(const [key,n]of Object.entries(SETS[set].two))if(count>=2)v[key]+=n;
  for(const [key,n]of Object.entries(SETS[set].three))if(count>=3)v[key]+=n;
 }
 for(const k of Object.keys(v))v[k]=Math.min(k==='damageReduction'?.20:.25,Math.max(0,v[k]));
 return v;
}
function capture(s){return (s.cities||[]).map(c=>{
 const local=c.id===s.activeCityId?s:c.local;
 return {id:c.id,build:local.buildingQueue?.id??null,training:(local.training||[]).map(q=>({id:q.id,count:q.count}))};
})}
function tick(s,...args){
 sync(s);const previous=capture(s);
 const result=raw.tick(s,...args);sync(s);const after=capture(s);
 for(const before of previous){
  const next=after.find(x=>x.id===before.id);if(!next)continue;
  if(before.build!==null&&before.build!==next.build)track(s,'builds',1);
  const survivors=new Set(next.training.map(q=>q.id));
  const trained=before.training.filter(q=>!survivors.has(q.id)).reduce((a,q)=>a+q.count,0);
  if(trained)track(s,'trained',trained);
 }
 return result;
}
function battleAct(s,action,opts){
 sync(s);const battle=s.battle?{target:s.battle.target,kind:s.battle.kind,level:s.battle.level}:null;
 const result=raw.battleAct(s,action,opts);
 if(!battle||result?.type!=='win')return result;
 const tile=E.getTile(battle.target);
 if(battle.kind==='mine')track(s,'mineWins',1);
 if(battle.kind==='npc'){
  track(s,'npcWins',1);
  if((tile?.eliteTier||0)>=11)track(s,'eliteWins',1);
 }
 if(battle.kind==='treasure'&&battle.level>=9)track(s,'eliteWins',1);
 s.hg18.victories++;
 const high=(tile?.eliteTier||0)>=11||battle.kind==='treasure'&&battle.level>=9;
 const eligible=high||(battle.kind==='npc'&&battle.level>=4);
 if(eligible){
  // A fixed hash keyed by victory ordinal/coordinate prevents rerolling by
  // reloading before a drop. High-tier bosses guarantee one shard.
  const n=battle.target.split(',').map(Number).reduce((a,b)=>a*31+b,7),roll=(n+s.hg18.victories*97)%100;
  if(high||roll<12){const n=high?2:1;if(s.hg18.materials.astral_shard+n<=1e6){addMaterial(s,'astral_shard',n);E.note(s,'Nhận '+n+' mảnh Tinh Vân hiếm.');}else E.note(s,'Túi mảnh Tinh Vân đầy; không nhận thêm mảnh từ trận này.');}
  if(high){if(s.hg18.materials.enhance_stone+2<=1e6)addMaterial(s,'enhance_stone',2);else E.note(s,'Túi đá cường hóa đầy; không nhận thêm đá từ trận này.');}
 }
 return result;
}
function make(...args){return ensure(raw.make(...args))}
function parse(text){const s=raw.parse(text);ensure(s);assert(valid(s),'Save HG18 mở rộng không hợp lệ');return s}
function strict(s){return raw.strict(s)&&valid(s)}
function serialize(s){ensure(s);assert(strict(s),'Save HG18 không hợp lệ');return raw.serialize(s)}
function buyItem(s,id){assert(E.ITEMS[id]?.shop!==false,'Vật phẩm bộ hiếm không bán trong Bazaar');assert(s.inventory.length<2000,'Túi trang bị đầy');return raw.buyItem(s,id)}
function hire(s,...args){const out=raw.hire(s,...args);ensure(s);return out}
function hireCandidate(s,...args){const out=raw.hireCandidate(s,...args);ensure(s);return out}
E.make=make;E.parseSave=parse;E.strictSave=strict;E.valid=strict;E.serializeSave=serialize;E.tick=tick;E.battleAct=battleAct;
E.heroStats=heroStats;E.combatModifiers=combatModifiers;E.buyItem=buyItem;
E.hire=hire;E.hireCandidate=hireCandidate;
Object.assign(E,{HG18_MATERIALS:MATERIALS,HG18_SETS:SETS,HG18_TASKS:TASKS,ensure18:ensure,sync18:sync,
 hg18Tasks:tasks,claimHG18Task:claimTask,openHG18Pack:openPack,craftHG18:craft,enhanceHG18:enhance,salvageHG18:salvage,
 rankHG18Hero:rankHero,resetHG18Hero:resetHero,rebirthHG18Hero:rebirthHero,
 hg18SetCounts:setCounts,hg18HeroStats:heroStats});
root.HOG_HG18={version:1,status:'offline-expansion-modeled',materials:MATERIALS};
})(typeof globalThis!=='undefined'?globalThis:this);
