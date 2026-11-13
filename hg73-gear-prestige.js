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
