/* HG73: prestige gear balance and crystalline item/combat aura.
 * All tiers are derived from EXISTING canonical item IDs, earned crafting,
 * UID and enhancement levels. No new loot, currency, persistent fields or
 * Save migration. Art is lightweight authored CSS/Canvas, not fake sprites.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(E?.V!==7||!E?.HG47_SLOTS||!E?.hg46Stats||!E?.heroStats||!E?.combatModifiers||!E?.hg71SpecialStatus)
 throw Error('HG73 requires canonical v07 equipment and quest-hero runtime');
const prior={stats:E.hg46Stats,hero:E.heroStats,combat:E.combatModifiers};
const TIERS=Object.freeze({
 common:Object.freeze({label:'Thường',order:1,mult:1,floor:0,accent:'#9dafbd',glow:'#a5bdc7'}),
 fine:Object.freeze({label:'Tinh phẩm',order:2,mult:1.45,floor:14,accent:'#82d5b0',glow:'#6eebc7'}),
 rare:Object.freeze({label:'Hiếm',order:3,mult:1.85,floor:30,accent:'#63a9ff',glow:'#76bfff'}),
 epic:Object.freeze({label:'Sử thi',order:4,mult:2.15,floor:46,accent:'#bc94fa',glow:'#b58aff'}),
 legendary:Object.freeze({label:'Huyền thoại',order:5,mult:2.45,floor:82,accent:'#ffb86c',glow:'#ffd080'}),
 platinum:Object.freeze({label:'Bạch kim',order:6,mult:2.8,floor:118,accent:'#a4e5f4',glow:'#e7fbff'}),
 rainbow:Object.freeze({label:'Cầu vồng',order:7,mult:3.2,floor:164,accent:'#a9eeef',glow:'#e6f7ff'}),
 divine:Object.freeze({label:'Thần khí',order:8,mult:3.8,floor:270,accent:'#d7f8ff',glow:'#f0ffff'})
});
const PRIMARY=Object.freeze({weapon:'atk',armor:'def',helm:'def',gloves:'atk',boots:'spd',
 belt:'def',necklace:'int',ring:'atk',charm:'int',relic:'atk'});
function kind(row){
 const item=E.ITEMS[row?.itemId];if(!item)return null;
 if(item.hg47&&item.tier==='divine'||item.towerExclusive)return 'divine';
 if(item.set==='star')return (row.enhance||0)>=8?'rainbow':'platinum';
 if(item.hg83)return 'legendary';
 if(item.hg87)return 'epic';
 if(item.set==='dragon')return 'legendary';
 if(item.set==='astral')return 'epic';
 if(item.hg47||item.tier==='rare')return 'rare';
 if(item.set==='sentinel')return 'fine';
 return 'common';
}
function grade(row){const key=kind(row);return key?{id:key,...TIERS[key]}:null}
// Real deterministic extra affixes are derived from item UID + itemId,
// with no reroll cost, stored field, random seed or phantom loot.
const AFFIX_KEYS=Object.freeze(['atk','def','spd','int','damageBonus','damageReduction','meleeDamage','rangedDamage']);
const AFFIX_NAMES=Object.freeze({atk:'⚔ Công',def:'🛡 Thủ',spd:'➤ Tốc',int:'✧ Trí',
 damageBonus:'⚡ Toàn lực',damageReduction:'◈ Hộ thân',
 meleeDamage:'⚔ Cận chiến',rangedDamage:'🏹 Tầm xa'});
function hash(str){
 let n=2166136261;for(let i=0;i<str.length;i++)n=Math.imul(n^str.charCodeAt(i),16777619);
 return n>>>0;
}
function extraAffixes(row){
 const g=grade(row);if(!g||g.order<3)return [];
 const base=E.hg47Affixes?.(row)||[],need=(g.order>=7?4:g.order>=5?3:2)-base.length;
 if(need<=0)return [];
 const used=new Set(base.map(a=>a.key)),out=[];
 for(let i=0;i<need;i++){
  const seed=hash(row.itemId+'|'+row.uid+'|'+i+'|HG73');
  // Loop over circular key order instead of accepting repeated attributes.
  let chosen=null;for(let j=0;j<AFFIX_KEYS.length;j++){
   const k=AFFIX_KEYS[(seed+j)%AFFIX_KEYS.length];if(!used.has(k)){chosen=k;break;}
  }
  if(!chosen)break;
  used.add(chosen);
  const isPercent=['damageBonus','damageReduction','meleeDamage','rangedDamage'].includes(chosen);
  const value=isPercent?Math.round((.005+g.order*.0015+(seed%4)*.001)*1000)/1000:
   chosen==='spd'?Math.max(1,Math.round(g.floor*.018+seed%3)):
   chosen==='int'?Math.max(1,Math.round(g.floor*.033+seed%5)):
   Math.max(1,Math.round(g.floor*.06+seed%5));
  out.push({key:chosen,value,label:AFFIX_NAMES[chosen]+' +'+
   (isPercent?Math.round(value*1000)/10+'%':value),origin:'HG73 canonical UID'});
 }
 return out;
}
function affixes(row){return [...(E.hg47Affixes?.(row)||[]),...extraAffixes(row)]}
function gains(row){
 const def=E.ITEMS[row?.itemId],g=grade(row),original=prior.stats(row);
 if(!def||!g||!original)return null;
 const primary=PRIMARY[def.slot]||'atk',bonus={};
 for(const k of ['atk','def','spd','int']){
  const current=Number(original[k]||0);
  // SPD is a speed attribute, not a damage-scale number. A high-tier
  // pair of boots must not mint extreme map-travel speed; combat turn order ignores SPD.
  const slotFloor=g.floor*(k==='spd'?.13:k==='int'?.66:1);
  const min=k===primary?slotFloor*(1+Math.min(10,Math.max(0,row.enhance||0))*.045):0;
  const total=Math.round(Math.max(current*g.mult,min,current));
  bonus[k]=Math.max(0,total-current);
 }
 for(const affix of extraAffixes(row))if(Object.hasOwn(bonus,affix.key))bonus[affix.key]+=affix.value;
 return bonus;
}
function stats(row){
 const base=prior.stats(row);if(!base)return base;
 const plus=gains(row);
 for(const k of ['atk','def','spd','int'])base[k]=(base[k]||0)+plus[k];
 return base;
}
function equipped(s,id){
 return Object.values(s.equipment?.[id]||{}).map(uid=>(s.inventory||[]).find(i=>i.uid===uid)).filter(Boolean);
}
function hero(s,id=s.activeHero){
 const h=prior.hero(s,id);if(!h)return h;
 // The pre-HG73 pipeline already contains the raw item, enhance and
 // real HG47 UID-affixes. Only add the prestige DELTA, never raw twice.
 for(const row of equipped(s,id))for(const [k,n] of Object.entries(gains(row)||{}))
  h[k]=Math.round((h[k]+n)*1000)/1000;
 return h;
}
function modifiers(s,id=s.activeHero){
 const v=prior.combat(s,id);
 if(!v)return v;
 let offensive=0,defensive=0;
 for(const row of equipped(s,id)){
  const g=grade(row),slot=E.ITEMS[row.itemId]?.slot;
  for(const affix of extraAffixes(row))if(['damageBonus','damageReduction','meleeDamage','rangedDamage'].includes(affix.key))
   v[affix.key]=(v[affix.key]||0)+affix.value;
  if(!g||g.order<5)continue;
  offensive+=Math.min(.014,(g.order-4)*.0035);
  if(['armor','helm','belt','charm','relic'].includes(slot))
   defensive+=Math.min(.012,(g.order-4)*.0027);
 }
 // Proven modifiers from old sets / affixes stay in the old pipeline.
 // Small prestige effects have separate hard ceilings to prevent ten
 // God-tier pieces from making any Boss untouchable.
 v.damageBonus=Math.min(.32,Math.max(0,(v.damageBonus||0)+offensive));
 v.damageReduction=Math.min(.24,Math.max(0,(v.damageReduction||0)+defensive));
 for(const key of ['meleeDamage','rangedDamage'])v[key]=Math.min(.30,Math.max(0,v[key]||0));
 return v;
}
function auraForHero(s,id){
 let best=null;
 for(const row of equipped(s,id)){
  const g=grade(row);
  if(g&&g.order>=5&&(!best||g.order>best.order))best=g;
 }
 return best?{tier:best.id,label:best.label,color:best.accent,glow:best.glow,order:best.order}:null;
}
function inspect(row){
 const g=grade(row);if(!g)return null;
 const newStats=stats(row),oldStats=prior.stats(row),delta=gains(row);
 return {id:g.id,label:g.label,order:g.order,accent:g.accent,
  oldStats,newStats,delta,affixes:affixes(row),enhance:row.enhance||0,
  promotion:g.id==='rainbow'?'Tinh Không +8 trở lên':'',
  sparkle:g.order>=5,source:row.origin||''};
}
Object.assign(E,{hg73Grade:grade,hg73Kind:kind,hg73Affixes:affixes,
 hg73StatGains:gains,hg73Inspect:inspect,
 hg73AuraForHero:auraForHero,hg46Stats:stats,heroStats:hero,combatModifiers:modifiers,
 HG73_TIERS:TIERS});
root.HOG_HG73=Object.freeze({version:1,saveVersion:7,tiers:8,
 source:'canonical inventory only',rarityIsDerived:true});
})(typeof globalThis!=='undefined'?globalThis:this);

/* HG87 Equipment Completion — forty earned EPIC items, four racial 10-piece sets,
 * real compare & UID protection, and all-or-nothing safe batch salvage.
 * No new save version, invented victory, free rewards or extra currencies.
 * hg87Locked/hg87Favorite are optional booleans ON canonical inventory UIDs;
 * historic Save v07 reads without them and future saved UIDs retain flags.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.HG47_SLOTS||!E?.hg73Grade||!E?.hg46Metrics||!E?.hg46Owner||
 !E?.hg29Ensure||!E?.salvageHG18||E.V!==7)
 throw Error('HG87 requires HG29, HG47, HG73 and canonical Save v07');
const prior={salvage:E.salvageHG18,strict:E.strictSave,parse:E.parseSave,
 serialize:E.serializeSave,modifiers:E.combatModifiers};
const RACES=Object.freeze({
 human:{title:'Bạch Ngân',name:'Thánh Vệ Vương Đô',focus:'damageReduction'},
 elf:{title:'Lam Nguyệt',name:'Tâm Nguyệt Chi Lâm',focus:'rangedDamage'},
 orc:{title:'Huyết Nham',name:'Cuồng Thú Phá Thành',focus:'meleeDamage'},
 undead:{title:'Hồn Hỏa',name:'Vương Miện Vong Linh',focus:'damageBonus'}
});
const SLOT_TITLES=Object.freeze({
 weapon:'Chiến Kiếm',armor:'Chiến Giáp',helm:'Hộ Miện',gloves:'Thiết Thủ',
 boots:'Thần Ngoa',belt:'Hộ Đai',necklace:'Linh Liên',ring:'Pháp Giới',
 charm:'Ma Ấn',relic:'Bảo Vật'
});
const ITEMS=[],SETS={};
const forId=(race,slot)=>'hg87_'+race+'_'+slot;
for(const [race,r] of Object.entries(RACES)){
 SETS['hg87_'+race]=Object.freeze({race,name:r.name,max:10,focus:r.focus,
  note:'3 món: +1,2% sở trường · 6 món: +2,2% · 10 món: +3,8% và +0,8% giảm sát thương',
  source:'Chiến lợi phẩm Elite và Tháp có thưởng'});
 E.HG47_SLOTS.forEach(([slot,label,icon],index)=>{
  const id=forId(race,slot),isDef=['armor','helm','belt'].includes(slot),
    isAtk=['weapon','gloves','ring','relic'].includes(slot);
  if(E.ITEMS[id])throw Error('Trùng trang bị HG87: '+id);
  const atk=13+(index%3)*3+(isAtk?9:0)+(race==='orc'?4:0),
    def=12+((index+1)%3)*3+(isDef?9:0)+(race==='human'?4:0),
    spd=2+(index%3)+(race==='elf'?2:0);
  E.ITEMS[id]={id,slot,icon,name:r.title+' '+SLOT_TITLES[slot],race,
   set:'hg87_'+race,atk,def,spd,int:0,shop:false,cost:0,level:10,hg87:true};
  ITEMS.push(Object.freeze({id,race,slot,order:index,
   cost:Object.freeze({gold:6500+index*600,gear:5+index%3,hunter:3+Math.floor(index/4),
    tower:1+Math.floor(index/5)})}));
 });
}
const BY_ID=Object.freeze(Object.fromEntries(ITEMS.map(q=>[q.id,q])));
const isIdle=s=>!s.battle&&!s.march&&!s.expedition&&!(s.parallelMarches?.length)&&!s.hg26?.enabled;
const owned=(s,uid)=>E.hg46Owner(s,uid);
const find=(s,uid)=>s.inventory?.find(x=>x.uid===uid)||null;
function flags(s,uid){
 const row=find(s,uid);
 if(!row)throw Error('Không tìm thấy UID trang bị');
 return {locked:row.hg87Locked===true,favorite:row.hg87Favorite===true};
}
function mark(s,uid,field,on){
 if(!['locked','favorite'].includes(field)||typeof on!=='boolean')throw Error('Dấu bảo vệ không hợp lệ');
 const row=find(s,uid);
 if(!row)throw Error('Không tìm thấy UID trang bị');
 const key=field==='locked'?'hg87Locked':'hg87Favorite',old=row[key];
 if(on)row[key]=true;else delete row[key];
 if(!E.strictSave(s)){
  if(old===undefined)delete row[key];else row[key]=old;
  throw Error('Dấu bảo vệ không đạt Save v07');
 }
 return {uid,field,enabled:on};
}
function strict(s){
 if(!prior.strict(s))return false;
 return (s.inventory||[]).every(row=>
  (row.hg87Locked===undefined||typeof row.hg87Locked==='boolean')&&
  (row.hg87Favorite===undefined||typeof row.hg87Favorite==='boolean'));
}
function parse(text){
 const s=prior.parse(text);
 if(!strict(s))throw Error('Save HG87 có dấu bảo vệ không hợp lệ');
 return s;
}
function serialize(s){
 if(!strict(s))throw Error('Save HG87 không hợp lệ');
 return prior.serialize(s);
}
function compare(s,uid,heroId=s.activeHero,mode='balanced'){
 const row=find(s,uid),hero=s.heroes.find(h=>h.id===heroId);
 if(!row||!hero||!E.ITEMS[row.itemId])throw Error('Không tìm thấy tướng hoặc trang bị');
 const def=E.ITEMS[row.itemId],slot=def.slot,oldUid=s.equipment?.[heroId]?.[slot]||null,
  oldItem=find(s,oldUid),holder=owned(s,uid);
 if(holder&&holder.heroId!==heroId)return {allowed:false,reason:'Món đồ đang do tướng khác sử dụng',uid,oldUid};
 if(def.race&&def.race!==(hero.race||s.race))
  return {allowed:false,reason:'Trang bị chỉ dành cho chủng tộc '+def.race,uid,oldUid};
 const before=E.hg46Metrics(s,heroId,mode),trial=E.clone(s);
 trial.equipment[heroId]={...(trial.equipment?.[heroId]||{}),[slot]:uid};
 if(!E.strictSave(trial))throw Error('So sánh trang bị không đạt Save v07');
 const after=E.hg46Metrics(trial,heroId,mode);
 const delta={};
 for(const k of ['atk','def','spd','int'])
  delta[k]=Math.round(((after.stats[k]||0)-(before.stats[k]||0))*100)/100;
 const mods={};
 for(const k of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])
  mods[k]=Math.round(((after.mod[k]||0)-(before.mod[k]||0))*10000)/10000;
 return {allowed:true,uid,slot,heroId,oldUid,
  oldName:oldItem?E.ITEMS[oldItem.itemId].name:'Ô trống',
  delta,modifiers:mods,scoreBefore:before.score,scoreAfter:after.score,
  gain:Math.round((after.score-before.score)*100)/100,mode};
}
function setProgress(s,heroId=s.activeHero){
 const hero=s.heroes.find(h=>h.id===heroId);
 if(!hero)return [];
 const race=hero.race||s.race,set=SETS['hg87_'+race];
 if(!set)return [];
 let count=0;
 for(const uid of Object.values(s.equipment?.[heroId]||{})){
  const item=find(s,uid);
  if(item&&E.ITEMS[item.itemId]?.set==='hg87_'+race)count++;
 }
 return [{id:'hg87_'+race,name:set.name,count,max:10,note:set.note,source:set.source}];
}
function modifiers(s,heroId=s.activeHero){
 const out=prior.modifiers(s,heroId),set=setProgress(s,heroId)[0];
 if(!out||!set||set.count<3)return out;
 const key=SETS[set.id].focus;
 const bonus=set.count>=10?.038:set.count>=6?.022:.012;
 const cap=key==='damageReduction'?.24:key==='damageBonus'?.32:.30;
 out[key]=Math.min(cap,Math.max(0,(out[key]||0)+bonus));
 if(set.count>=10)
  out.damageReduction=Math.min(.24,Math.max(0,(out.damageReduction||0)+.008));
 return out;
}
function catalogue(s,race=s.race){
 if(!RACES[race])throw Error('Chủng tộc không tồn tại');
 const unlocked=(s.hg31?.paidTowerWins||0)>=1;
 return ITEMS.filter(q=>q.race===race).map(q=>{
  const missing={};
  for(const [k,n] of Object.entries(q.cost))
   missing[k]=Math.max(0,n-(k==='gold'?(s.res?.gold||0):(s.hg29?.shards?.[k]||0)));
  return {...q,name:E.ITEMS[q.id].name,missing,unlocked,
   canCraft:race===s.race&&unlocked&&isIdle(s)&&s.inventory.length<2000&&
    Object.values(missing).every(n=>n===0)};
 });
}
function craft(s,id){
 const q=BY_ID[id];
 if(!q||q.race!==s.race)throw Error('Công thức trang bị không hợp lệ');
 const status=catalogue(s,q.race).find(x=>x.id===id);
 if(!status?.canCraft)throw Error('Chưa thắng Tháp có thưởng, thiếu nguyên liệu hoặc tướng đang chiến đấu');
 const trial=E.clone(s);
 E.spend(trial,{gold:q.cost.gold});
 for(const k of ['gear','hunter','tower'])trial.hg29.shards[k]-=q.cost[k];
 const item=E.addItem(trial,id,'HG87 ghép đồ sử thi từ nguyên liệu thật');
 E.note(trial,'HG87 đã rèn '+E.ITEMS[id].name+' #'+item.uid+'; nguyên liệu và vàng đã trừ một lần.');
 if(!E.strictSave(trial))throw Error('Dừng giao dịch: Save v07 không hợp lệ');
 Object.assign(s,trial);
 return {uid:item.uid,itemId:id,cost:q.cost,version:s.version};
}
function salvage(s,uid){
 const row=find(s,uid);
 if(!row)throw Error('Không tồn tại vật phẩm');
 if(row.hg87Locked||row.hg87Favorite)throw Error('Vật phẩm đã khóa hoặc yêu thích; bỏ dấu trước khi phân giải');
 return prior.salvage(s,uid);
}
const THRESHOLD=Object.freeze({common:1,fine:2,rare:3});
function batchPreview(s,tier='fine',limit=50){
 if(!THRESHOLD[tier]||!Number.isSafeInteger(limit)||limit<1||limit>50)
  throw Error('Lọc phân giải không hợp lệ');
 const candidates=s.inventory.filter(row=>{
  const grade=E.hg73Grade(row),owner=owned(s,row.uid);
  return grade&&grade.order<=THRESHOLD[tier]&&!owner&&!row.hg87Locked&&!row.hg87Favorite&&
   (row.enhance||0)===0;
 }).sort((a,b)=>E.hg73Grade(a).order-E.hg73Grade(b).order||a.uid-b.uid);
 const eligible=candidates.slice(0,limit),uids=eligible.map(x=>x.uid);
 const stones=eligible.reduce((n,row)=>n+(E.hg46SalvagePreview(s,row.uid)?.stones||0),0);
 const shards=eligible.reduce((n,row)=>n+(E.hg46SalvagePreview(s,row.uid)?.astralShards||0),0);
 const capacity=(s.hg18?.materials?.enhance_stone||0)+stones<=1000000&&
  (s.hg18?.materials?.astral_shard||0)+shards<=1000000;
 const skips={locked:s.inventory.filter(x=>x.hg87Locked===true).length,
  favorite:s.inventory.filter(x=>x.hg87Favorite===true).length,
  equipped:s.inventory.filter(x=>!!owned(s,x.uid)).length,
  enhanced:s.inventory.filter(x=>(x.enhance||0)>0).length};
 return {tier,limit,count:uids.length,uids,stones,shards,capacity,
  canRun:isIdle(s)&&capacity&&uids.length>0,skips};
}
function batch(s,tier='fine'){
 const quote=batchPreview(s,tier,50);
 if(!quote.canRun)throw Error('Không có món phù hợp, đang xuất chinh hoặc kho đá đã đầy');
 const trial=E.clone(s);
 for(const uid of quote.uids)salvage(trial,uid);
 if(!E.strictSave(trial))throw Error('Giao dịch phân giải bị chặn vì Save v07 không hợp lệ');
 Object.assign(s,trial);
 return {count:quote.count,stones:quote.stones,shards:quote.shards,uids:quote.uids};
}
Object.assign(E,{strictSave:strict,valid:strict,parseSave:parse,serializeSave:serialize,
 combatModifiers:modifiers,salvageHG18:salvage,
 hg87Flag:flags,hg87Mark:mark,hg87Compare:compare,
 hg87SetProgress:setProgress,hg87Catalogue:catalogue,hg87Craft:craft,
 hg87BatchPreview:batchPreview,hg87BatchSalvage:batch,hg87ItemId:forId,
 HG87_SETS:Object.freeze(SETS),HG87_ITEMS:Object.freeze(ITEMS)});
root.HOG_HG87=Object.freeze({version:1,saveVersion:7,renderSource:'HG86 WebP',
 gearCount:ITEMS.length,sets:Object.keys(SETS).length,batchMax:50});
})(typeof globalThis!=='undefined'?globalThis:this);