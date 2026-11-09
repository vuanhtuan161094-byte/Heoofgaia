/* HG40.9 — purple 100/100/100/100 enemy commander, CS1–CS10 and paid PvE rewards.
 * Applies once to NEW encounters; already-running v07 battles are left untouched.
 * No extra stack, no fake player hero, no rewards for a defeat or unpaid tower.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg40PrepareBattle||!E?.hg31Status||!E?.hg408DismissHero||E.V!==7)
 throw Error('HG40.9 requires HG40 + HG40.8 + Save v07');
const old={prepare:E.hg40PrepareBattle,battleAct:E.battleAct,make:E.make,parse:E.parseSave,strict:E.strictSave};
const MAX=1e6;
const ints=n=>Number.isSafeInteger(n)&&n>=0;
const clone=v=>JSON.parse(JSON.stringify(v));
function ensure(s){
 if(!s.hg409)s.hg409={v:1,rewards:[]};
 return s.hg409;
}
function valid(s){
 const q=s.hg409;if(q===undefined)return true;
 if(!q||q.v!==1||!Array.isArray(q.rewards)||q.rewards.length>20)return false;
 return q.rewards.every(x=>x&&['npc','boss','tower','treasure'].includes(x.kind)&&
  Number.isSafeInteger(x.cs)&&x.cs>=1&&x.cs<=10&&typeof x.target==='string'&&x.target.length<=50&&
  x.quality==='purple'&&Object.entries(x.resources||{}).every(([k,v])=>
   E.C.keys.includes(k)&&ints(v))&&Object.entries(x.materials||{}).every(([k,v])=>
   !!E.HG18_MATERIALS[k]&&ints(v)));
}
function category(kind,target='',floor=1,level=1){
 const tile=E.getTile(target);
 if(kind==='tower')return {kind:'tower',cs:Math.min(10,1+Math.floor((Math.max(1,floor)-1)/10)),boss:floor%10===0,level:floor};
 if(kind!=='npc'&&kind!=='treasure')return null;
 const tier=tile?.eliteTier||0;
 const boss=tier>=11||kind==='treasure'&&level>=9;
 const cs=tier>=13?10:tier===12?9:tier===11?8:
  Math.max(1,Math.min(10,Number(level)||Number(tile?.level)||1));
 return {kind:boss?'boss':kind,cs,boss,level:Math.max(1,Number(level)||Number(tile?.level)||1),tier};
}
function preview(kind,target='',floor=1,level=1){
 const meta=category(kind,target,floor,level);if(!meta)return null;
 const {cs,boss}=meta;
 const named=boss?(meta.kind==='tower'?'Chúa Tể Bí Cảnh':'Ma Vương Tái Sinh'):'Chiến Tướng Hắc Tinh';
 const commander={name:named,level:100,rank:5,rebirth:cs,quality:'purple',
  atk:100,def:100,spd:100,int:100};
 // Enemy unit multiplier from a real max-stat purple commander.
 // Numbers are fixed and bounded. Existing 40-skill AI remains the authority.
 const boost={
  hp:Math.round((1.25+cs*.12)*(boss?1.28:1)*100)/100,
  atk:Math.round((1.20+cs*.09)*(boss?1.20:1)*100)/100,
  def:Math.round((1.10+cs*.075)*(boss?1.16:1)*100)/100,
  spd:Math.round((.07+cs*.025)*100)/100
 };
 let resources,materials={};
 if(meta.kind==='boss'){
  resources={gold:20000+6000*cs,wood:750+180*cs,ore:750+180*cs,
   sulfur:260+90*cs,crystal:260+90*cs};
  materials={resource_chest:1,enhance_stone:1+Math.floor(cs/4)};
  if(cs>=9)materials.gear_pack=1;
 }else if(meta.kind==='tower'){
  resources={gold:1800+1250*cs,wood:180+65*cs,ore:180+65*cs,
   sulfur:55+25*cs,crystal:55+25*cs};
  if(cs>=3)materials.enhance_stone=1;
  if(cs>=5)materials.resource_card=1;
 }else{
  resources={gold:500+650*cs,wood:50+48*cs,ore:50+48*cs,
   sulfur:15+18*cs,crystal:15+18*cs};
  if(cs>=5)materials.resource_card=1;
  if(cs>=8)materials.enhance_stone=1;
 }
 return {...meta,commander,boost,resources,materials};
}
function prepare(s,b){
 const result=old.prepare(s,b);
 // Never alter old mid-battle Saves. This hook is reached only at battle creation.
 if(!result||result.hg409EnemyCommander)return result;
 const floor=result.hg21Tower?.floor||1;
 const p=preview(result.kind,result.target,floor,result.level);
 if(!p)return result;
 const commander={...p.commander,cs:p.cs,boost:{...p.boost}};
 for(const u of result.enemies){
  const oldHp=u.hp,ratio=Math.min(1,Math.max(0,u.pool/(Math.max(1,u.count)*oldHp)));
  u.hp=Math.max(1,Math.round(oldHp*p.boost.hp));
  u.atk=Math.max(1,Math.round(u.atk*p.boost.atk));
  u.def=Math.max(0,Math.round(u.def*p.boost.def));
  u.spd=Math.round((u.spd+p.boost.spd)*100)/100;
  u.pool=Math.min(u.count*u.hp,Math.max(1,Math.ceil(u.count*u.hp*ratio)));
  u.count=Math.ceil(u.pool/u.hp);
 }
 result.hg409EnemyCommander=commander;
 result.history.unshift('☠ '+commander.name+' · TÍM · Lv100 · Bậc 5 · CS'+p.cs+
  ' chỉ huy toàn bộ '+result.enemies.length+' đội địch (HP ×'+p.boost.hp+', ATK ×'+p.boost.atk+', DEF ×'+p.boost.def+').');
 return result;
}
function battleAct(s,action,options){
 const b=s.battle;
 const marker=b?.hg409EnemyCommander?{
  target:b.target,kind:b.kind,level:b.level,floor:b.hg21Tower?.floor||1,
  commander:clone(b.hg409EnemyCommander)}:null;
 const out=old.battleAct(s,action,options);
 if(!marker||out?.type!=='win'||marker.kind==='tower'&&!out.claimed)return out;
 const p=preview(marker.kind,marker.target,marker.floor,marker.level);
 if(!p)return out;
 const before=Object.fromEntries(E.C.keys.map(k=>[k,s.res[k]||0]));
 E.add(s,p.resources);
 const resources=Object.fromEntries(E.C.keys.map(k=>[k,Math.max(0,Math.round((s.res[k]||0)-before[k]))]));
 const materials={};const bag=s.hg18?.materials;
 if(bag){
  for(const [id,amount] of Object.entries(p.materials)){
   const actual=Math.max(0,Math.min(amount,MAX-(bag[id]||0)));
   if(actual){bag[id]=(bag[id]||0)+actual;materials[id]=actual;}
  }
 }
 const receipt={kind:p.kind,target:String(marker.target),cs:p.cs,quality:'purple',resources,materials};
 const q=ensure(s);q.rewards.unshift(receipt);q.rewards.length=Math.min(q.rewards.length,20);
 const resourceText=E.C.keys.filter(k=>resources[k]>0).map(k=>'+'+resources[k]+' '+k).join(', ');
 const itemText=Object.entries(materials).map(([id,n])=>'+'+n+' '+E.HG18_MATERIALS[id].name).join(', ');
 E.note(s,'HG40.9 Thắng CS'+p.cs+' ('+p.kind+'): '+[resourceText,itemText].filter(Boolean).join('; ')+'. Đã vào kho; không cần nhận lại.');
 return {...out,hg409Reward:receipt};
}
function make(...args){const s=old.make(...args);ensure(s);return s}
function parse(...args){const s=old.parse(...args);ensure(s);return s}
function strict(s){return old.strict(s)&&valid(s)}
Object.assign(E,{make,parseSave:parse,strictSave:strict,valid:strict,battleAct,
 hg40PrepareBattle:prepare,hg409Preview:preview,hg409RewardHistory:s=>ensure(s).rewards.slice(),
 hg409Valid:valid});
root.HOG_HG409=Object.freeze({version:1,save:7,purpleStats:100,rebirthMax:10});
})(typeof globalThis!=='undefined'?globalThis:this);
