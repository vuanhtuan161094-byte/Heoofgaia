/* HG31 - original targeted high-tier gear, earned Boss/Tower shards and real set bonuses.
 * One canonical inventory and Save v07. Neither the loot rates nor set values claim HoG 2009 provenance.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg30Status||!E?.hg29Ensure||!E?.hg18SetCounts||!E?.combatModifiers)
 throw Error('HG31 requires HG18, HG21, HG29 and HG30');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 battleAct:E.battleAct,combatModifiers:E.combatModifiers};
const MAX=1000000000;
const SETS=Object.freeze({
 dragon:Object.freeze({name:'Long Hồn',source:'Boss Ma Giới T11–T13',icon:'🐉',color:'#e6a55c',
   two:Object.freeze({meleeDamage:.065,rangedDamage:.065}),three:Object.freeze({damageReduction:.065}),
   note:'2 món: +6,5% sát thương. 3 món: +6,5% giảm sát thương.'}),
 star:Object.freeze({name:'Tinh Không',source:'Tháp Bí Cảnh có thưởng',icon:'🌌',color:'#b1b5ff',
   two:Object.freeze({damageBonus:.08}),three:Object.freeze({damageReduction:.085}),
   note:'2 món: +8% sát thương. 3 món: +8,5% giảm sát thương.'})
});
const GEAR=Object.freeze([
 {id:'dragon_blade',set:'dragon',name:'Long Hồn Chiến Kiếm',slot:'weapon',icon:'⚔',atk:42,def:9,spd:3,price:15000,minFloor:0,need:{fragments:6,abyss:4,hunter:3,bossToken:1}},
 {id:'dragon_plate',set:'dragon',name:'Long Hồn Thần Giáp',slot:'armor',icon:'🛡',atk:6,def:49,spd:2,price:15000,minFloor:0,need:{fragments:6,abyss:4,hunter:3,bossToken:1}},
 {id:'dragon_seal',set:'dragon',name:'Long Hồn Pháp Ấn',slot:'charm',icon:'💠',atk:15,def:22,spd:6,price:15000,minFloor:0,need:{fragments:6,abyss:4,hunter:3,bossToken:1}},
 {id:'star_blade',set:'star',name:'Tinh Không Thần Kiếm',slot:'weapon',icon:'⚔',atk:64,def:13,spd:5,price:24000,minFloor:21,need:{fragments:9,tower:12,hero:4,bossToken:0}},
 {id:'star_plate',set:'star',name:'Tinh Không Thánh Giáp',slot:'armor',icon:'🛡',atk:12,def:68,spd:3,price:24000,minFloor:21,need:{fragments:9,tower:12,hero:4,bossToken:0}},
 {id:'star_seal',set:'star',name:'Tinh Không Thiên Ấn',slot:'charm',icon:'🔮',atk:22,def:31,spd:9,price:24000,minFloor:21,need:{fragments:9,tower:12,hero:4,bossToken:0}}
]);
const IDS=GEAR.map(r=>r.id),BY_ID=Object.fromEntries(GEAR.map(r=>[r.id,r]));
for(const gear of GEAR){
 if(E.ITEMS[gear.id])throw Error('HG31 duplicate item '+gear.id);
 E.ITEMS[gear.id]={id:gear.id,name:gear.name,slot:gear.slot,icon:gear.icon,atk:gear.atk,
  def:gear.def,spd:gear.spd,int:0,cost:0,level:1,shop:false,set:gear.set,hg31:true};
}
const iok=(n,m=MAX)=>Number.isSafeInteger(n)&&n>=0&&n<=m;
function ensure(s){
 if(!s.hg31)s.hg31={v:1,bossFocus:'dragon_blade',towerFocus:'star_blade',
  fragments:Object.fromEntries(IDS.map(id=>[id,0])),worldSeen:s.hg18?.victories||0,
  towerSeen:s.hg20?.tower?.victories||0,bossWins:0,paidTowerWins:0,crafted:0,
  last:null,history:[]};
 return s.hg31;
}
function valid(s){
 const h=s?.hg31;if(!h||h.v!==1||!h.fragments||Array.isArray(h.fragments)||
 !BY_ID[h.bossFocus]||BY_ID[h.bossFocus].set!=='dragon'||
 !BY_ID[h.towerFocus]||BY_ID[h.towerFocus].set!=='star'||
 Object.keys(h.fragments).length!==IDS.length||!IDS.every(id=>iok(h.fragments[id]))||
 !['worldSeen','towerSeen','bossWins','paidTowerWins','crafted'].every(k=>iok(h[k]))||
 h.worldSeen>(s.hg18?.victories||0)||h.towerSeen>(s.hg20?.tower?.victories||0)||
 !Array.isArray(h.history)||h.history.length>20)return false;
 const receipt=r=>r&&['boss','tower'].includes(r.source)&&BY_ID[r.id]&&
  (r.source==='boss'?BY_ID[r.id].set==='dragon':BY_ID[r.id].set==='star')&&
  iok(r.count,3)&&r.count>0&&iok(r.ordinal)&&r.ordinal>0&&
  typeof r.target==='string'&&r.target.length<=48;
 return (h.last===null||receipt(h.last))&&h.history.every(receipt);
}
function idle(s){return !s.battle&&!s.march&&!s.expedition&&
 (!s.parallelMarches||s.parallelMarches.length===0)&&!s.hg26?.enabled;}
function setFocus(s,id){
 const gear=BY_ID[id];if(!gear)throw Error('Không tồn tại mục tiêu trang bị HG31');
 if(!idle(s))throw Error('Phải dừng hành quân / tự săn trước khi đổi mục tiêu farm');
 const h=ensure(s),key=gear.set==='dragon'?'bossFocus':'towerFocus';
 h[key]=id;E.note(s,'HG31: ưu tiên farm '+gear.name+' từ '+SETS[gear.set].source+'.');
 return {source:gear.set,id,fragments:h.fragments[id]};
}
function grant(s,source,target,id,count,ordinal){
 const h=ensure(s),actual=Math.min(count,MAX-h.fragments[id]);
 if(actual<=0){E.note(s,'Kho mảnh '+BY_ID[id].name+' đầy.');return null;}
 h.fragments[id]+=actual;
 const receipt={source,id,count:actual,ordinal,target:String(target)};
 h.last=receipt;h.history.unshift(receipt);if(h.history.length>20)h.history.length=20;
 E.note(s,'HG31: +'+actual+' mảnh '+BY_ID[id].name+' từ '+(source==='boss'?'Boss':'Tháp có thưởng')+'.');
 return receipt;
}
function battleAct(s,action,options){
 const h=ensure(s),b=s.battle?{kind:s.battle.kind,target:s.battle.target,
  floor:s.battle.hg21Tower?.floor||0}:null;
 const out=old.battleAct(s,action,options);
 if(!b||out?.type!=='win')return out;
 if(b.kind==='tower'){
  const n=s.hg20?.tower?.victories||0;
  if(n>h.towerSeen){h.towerSeen=n;
   if(out.claimed) {h.paidTowerWins++;grant(s,'tower','floor-'+b.floor,h.towerFocus,b.floor>=25&&b.floor%5===0?3:b.floor%5===0?2:1,n);}
  }
 }else{
  const n=s.hg18?.victories||0;
  if(n>h.worldSeen){h.worldSeen=n;
   const tile=E.getTile(b.target);
   if(b.kind==='npc'&&(tile?.eliteTier||0)>=11){
    h.bossWins++;grant(s,'boss',b.target,h.bossFocus,tile.eliteTier>=13?3:tile.eliteTier>=12?2:1,n);
   }
  }
 }
 return out;
}
function catalogue(s){
 const h=ensure(s),floor=s.hg20?.tower?.floor||1;
 return GEAR.map(g=>{
  const n=g.need,have=h.fragments[g.id],hg29=s.hg29.shards,hg27=s.hg27;
  // HG46-B: a T11+ Boss item must not require unrelated Tower floors.
  // Star is the high-end Tower set and has NO mandatory Boss token: each set
  // can be finished from its documented actual combat source plus HG29 shards.
  const unlocked=g.set==='dragon'?h.bossWins>=1:
   floor>=g.minFloor&&h.paidTowerWins>=3;
  const missing={
   focused:Math.max(0,n.fragments-have),
   abyss:Math.max(0,(n.abyss||0)-(hg29.abyss||0)),
   hunter:Math.max(0,(n.hunter||0)-(hg29.hunter||0)),
   tower:Math.max(0,(n.tower||0)-(hg29.tower||0)),
   hero:Math.max(0,(n.hero||0)-(hg29.hero||0)),
   boss:Math.max(0,(n.bossToken||0)-(hg27.boss||0)),
   gold:Math.max(0,g.price-s.res.gold)
  };
  const enough=Object.values(missing).every(v=>v===0);
  const sourceWins=g.set==='dragon'?missing.focused:
   // A paid tower win guarantees one focused fragment and one HG29 rune.
   // Every fifth claimed floor gives two of each. Unfocused fragments are
   // not earned by this target; changing focus is deliberate, never retro.
   Math.max(missing.focused,missing.tower);
  return {...g,have,focus:g.id===(g.set==='dragon'?h.bossFocus:h.towerFocus),
   unlocked,enough,missing,sourceWins,sourceDays:g.set==='star'?Math.ceil(sourceWins/5):null,
   canCraft:unlocked&&enough&&idle(s)&&s.inventory.length<2000,
   unlockLabel:g.set==='dragon'?'Thắng Boss T11 trở lên':
    'Vượt Tháp '+(g.minFloor-1)+' và có 3 trận Tháp nhận thưởng',
   source:SETS[g.set].source};
 });
}
function craft(s,id){
 const g=catalogue(s).find(x=>x.id===id);if(!g)throw Error('Không có công thức HG31');
 if(!g.canCraft)throw Error('Chưa đạt mốc Boss/Tháp, thiếu mảnh HG31/HG29, Ấn Boss, vàng hoặc túi đầy');
 const n=g.need,h=ensure(s);
 // Validate canonical output & all costs before the first mutation.
 if(!E.ITEMS[id]||s.inventory.length>=2000)throw Error('Kho trang bị không sẵn sàng');
 E.spend(s,{gold:g.price});
 h.fragments[id]-=n.fragments;
 for(const [key,c]of Object.entries({abyss:n.abyss||0,hunter:n.hunter||0,tower:n.tower||0,hero:n.hero||0}))
  if(c)s.hg29.shards[key]-=c;
 s.hg27.boss-=n.bossToken;
 const item=E.addItem(s,id,'HG31 ghép đúng món từ Boss/Tháp');
 h.crafted++;
 E.note(s,'HG31: ghép '+g.name+' #'+item.uid+'. Đã tiêu hao đúng mảnh mục tiêu, nguyên liệu và vàng.');
 return {itemId:id,uid:item.uid,crafted:h.crafted};
}
function combatModifiers(s,heroId=s.activeHero){
 const out=old.combatModifiers(s,heroId);
 const count=E.hg18SetCounts(s,heroId);
 for(const [id,set] of Object.entries(SETS)){
  const n=count[id]||0;
  if(n>=2)for(const [key,value]of Object.entries(set.two))out[key]=(out[key]||0)+value;
  if(n>=3)for(const [key,value]of Object.entries(set.three))out[key]=(out[key]||0)+value;
 }
 for(const key of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])
  out[key]=Math.max(0,Math.min(key==='damageReduction'?.20:.25,out[key]||0));
 return out;
}
function status(s){
 const h=ensure(s);return {focus:{boss:h.bossFocus,tower:h.towerFocus},
  sets:SETS,recipes:catalogue(s),fragments:{...h.fragments},
  bossWins:h.bossWins,towerWins:h.paidTowerWins,crafted:h.crafted,last:h.last,
  setCounts:E.hg18SetCounts(s,s.activeHero)};
}
function iconHTML(id,size=64){
 const g=BY_ID[id];if(!g)return '';
 const px=Math.max(24,Math.min(128,Number(size)||64));
 const light=g.set==='dragon'?'#ffe1a1':'#d9d7ff';
 const accent=g.set==='dragon'?'#aa4a27':'#4b54ac';
 const frame='<rect x="4" y="4" width="120" height="120" rx="16" fill="#142932" stroke="'+light+'" stroke-width="2"/><circle cx="64" cy="60" r="45" fill="'+accent+'" opacity=".24"/>';
 let shape;
 if(g.slot==='weapon')shape='<path d="M59 18 L69 18 L72 75 L66 86 L61 75 Z" fill="'+light+'" stroke="'+accent+'" stroke-width="3"/><path d="M41 73 L87 73 L87 83 L41 83 Z" fill="'+light+'" stroke="'+accent+'" stroke-width="3"/><path d="M60 84 L68 84 L68 110 L60 110 Z" fill="'+accent+'"/><circle cx="64" cy="43" r="5" fill="'+accent+'"/>';
 else if(g.slot==='armor')shape='<path d="M39 25 L55 19 L64 30 L73 19 L89 25 L104 54 L90 66 L85 105 L43 105 L38 66 L24 54 Z" fill="'+light+'" stroke="'+accent+'" stroke-width="4"/><path d="M47 39 L81 39 L75 88 L53 88 Z" fill="'+accent+'" opacity=".6"/><path d="M64 47 L73 61 L64 75 L55 61 Z" fill="'+light+'"/>';
 else shape='<path d="M64 15 L96 45 L84 92 L64 113 L44 92 L32 45 Z" fill="'+accent+'" stroke="'+light+'" stroke-width="4"/><path d="M64 28 L82 49 L76 78 L64 93 L52 78 L46 49 Z" fill="'+light+'"/><circle cx="64" cy="60" r="11" fill="'+accent+'"/>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'+frame+shape+'</svg>';
 return '<img class="hg31-icon" data-hg31-art="'+id+'" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+
  '" width="'+px+'" height="'+px+'" alt="" loading="lazy">';
}
function make(...args){const s=old.make(...args);ensure(s);return s;}
function parse(v){const s=old.parse(v);ensure(s);if(!strict(s))throw Error('Save HG31 không hợp lệ');return s;}
function strict(s){return old.strict(s)&&valid(s);}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG31 không hợp lệ');return old.serialize(s);}
Object.assign(E,{make,parseSave:parse,strictSave:strict,valid:strict,serializeSave:serialize,
 battleAct,combatModifiers,hg31Ensure:ensure,hg31Valid:valid,hg31Status:status,
 hg31SetFocus:setFocus,hg31Craft:craft,hg31Catalogue:catalogue,hg31IconHTML:iconHTML,
 HG31_GEAR:GEAR,HG31_SETS:SETS});
root.HOG_HG31=Object.freeze({version:1,saveVersion:7,source:'original-earned-boss-tower'});
})(typeof globalThis!=='undefined'?globalThis:this);
