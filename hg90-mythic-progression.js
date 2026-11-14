/* HG90 — real mythology bonds, divine relics and summonable mythic troops.
 * This is original offline gameplay, not 2009 source rates. Exactly one
 * canonical Save v07 roster, army, inventory and combat reward ledger.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E?.hg89Awaken||!E?.hg89JointMarch||!E?.hg21TowerEnter||
 !E?.HG89_PANTHEON||!E?.hg88TowerStatus||!E?.HG47_SLOTS||E.V!==7)
 throw Error('HG90 needs Pantheon HG89, 3×2 combat, 10-slot equipment, Save v07');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 mods:E.combatModifiers,battle:E.battleAct,equip:E.equipItem};
const PANTHEON=E.HG89_PANTHEON;
const BONUSES=Object.freeze([
 Object.freeze({id:'fengshen',name:'Phong Thần Song Kiệt',pair:['yang_jian','nezha'],
  text:'Dương Tiễn + Na Tra · sát thương +8%, giảm sát thương nhận +4%',
  damageBonus:.08,damageReduction:.04}),
 Object.freeze({id:'olympus',name:'Thánh Chiến Olympus',pair:['zeus','athena'],
  text:'Zeus + Athena · sát thương tầm xa +10%, chống chịu +6%',
  rangedDamage:.10,damageReduction:.06}),
 Object.freeze({id:'heavenly',name:'Đại Náo Thiên Cung',pair:['yang_jian','sun_wukong'],
  text:'Dương Tiễn + Tôn Ngộ Không · sát thương cận chiến +12%',
  meleeDamage:.12}),
 Object.freeze({id:'godkings',name:'Thiên Đình Thần Vương',pair:['zeus','odin'],
  text:'Zeus + Odin · sát thương +10% và giảm sát thương nhận +3%',
  damageBonus:.10,damageReduction:.03})
]);
const MYTH_ARMY=Object.freeze({
 human:Object.freeze({id:'human_hg90_celestial',name:'Lôi Vệ Thiên Đình',icon:'⚡',type:'Melee'}),
 elf:Object.freeze({id:'elf_hg90_celestial',name:'Nguyệt Linh Thần Xạ',icon:'🏹',type:'Ranged'}),
 orc:Object.freeze({id:'orc_hg90_celestial',name:'Lôi Thú Phong Thần',icon:'🐉',type:'Melee'}),
 undead:Object.freeze({id:'undead_hg90_celestial',name:'U Minh Thần Sứ',icon:'🦇',type:'Ranged'})
});
const DIVINE=Object.freeze(PANTHEON.map((d,i)=>Object.freeze({
 id:'hg90_relic_'+d.id,deityId:d.id,name:{
 yang_jian:'Tam Tiêm Lưỡng Nhận Đao',nezha:'Hỏa Tiêm Thương',zeus:'Lôi Đình Quyền Trượng',
 athena:'Thánh Thuẫn Aegis',sun_wukong:'Như Ý Kim Cô Bổng',odin:'Thần Thương Gungnir'
 }[d.id],
 cost:25+Math.floor(i/2)*10,shards:12+4*i,gold:4500+500*i,
 slot:'relic',icon:d.icon
})));
const BY_RELIC=Object.freeze(Object.fromEntries(DIVINE.map(x=>[x.id,x])));
const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const copy=o=>JSON.parse(JSON.stringify(o));
// The existing frozen catalog is extended exactly once before Save loading.
// Never add a fake item or unit instance during a UI refresh.
for(const [race,d] of Object.entries(MYTH_ARMY)){
 const source=C.rewardUnits?.[race]?.find(x=>x.id===race+'_tower_sovereign');
 if(!source||C.rewardUnits[race].some(x=>x.id===d.id))
  throw Error('HG90 myth unit catalogue mismatch: '+race);
}
C.rewardUnits=Object.freeze(Object.fromEntries(Object.entries(C.rewardUnits).map(([race,rows])=>{
 const base=rows.find(x=>x.id===race+'_tower_sovereign'),d=MYTH_ARMY[race];
 return [race,Object.freeze([...rows,Object.freeze({...base,...d,race,
  tier:11,hp:Math.round(base.hp*1.52),atk:Math.round(base.atk*1.4),
  def:Math.round(base.def*1.35),spd:Math.round(base.spd*1.05*100)/100,
  load:250,rewardOnly:true,towerExclusive:false,
  cost:Object.freeze({...base.cost}),timeSec:0})])];
})));
for(const [i,r] of DIVINE.entries()){
 if(E.ITEMS[r.id])throw Error('HG90 divine relic duplicate '+r.id);
 E.ITEMS[r.id]={id:r.id,name:r.name+' · Thần khí '+PANTHEON[i].name,
  slot:'relic',icon:r.icon,atk:80+17*i,def:62+12*i,spd:12+i*2,int:35+i*5,
  cost:0,level:10,shop:false,hg90Deity:r.deityId,
  damageBonus:.04,damageReduction:.02};
}
const fresh=()=>({v:1,shards:0,forged:[],troopsSummoned:0,
 towerWins:0,bossWins:0,last:null});
function ensure(s){if(!s.hg90)s.hg90=fresh();return s.hg90}
function valid(s){
 const q=s?.hg90;
 if(!q||q.v!==1||!int(q.shards,1000000)||
  !Array.isArray(q.forged)||q.forged.length>DIVINE.length||
  new Set(q.forged).size!==q.forged.length||
  q.forged.some(id=>!BY_RELIC[id])||
  !int(q.troopsSummoned)||!int(q.towerWins)||!int(q.bossWins)||
  !(q.last===null||q.last&&typeof q.last==='object'&&
    ['troop','relic','tower','boss'].includes(q.last.type)&&int(q.last.count,1e6)))return false;
 for(const [id,slots] of Object.entries(s.equipment||{})){
  const hero=s.heroes.find(h=>String(h.id)===id);
  for(const uid of Object.values(slots||{})){
   const item=s.inventory.find(x=>x.uid===uid),deity=E.ITEMS[item?.itemId]?.hg90Deity;
   if(deity&&(!hero||hero.mythicId!==deity))return false;
  }
 }
 return true;
}
function strict(s){return old.strict(s)&&valid(s)}
function make(...args){const s=old.make(...args);ensure(s);return s}
function parse(text){const s=old.parse(text);ensure(s);if(!strict(s))throw Error('HG90 Save v07 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save v07 Thần khí / Thần binh không hợp lệ');return old.serialize(s)}
function activeTeam(s){
 const battle=s.battle;
 if(!battle)return [];
 const ids=battle.hg261Joint?.team||battle.hg21Tower?.team;
 return Array.isArray(ids)?ids:[];
}
function activeBonds(s){
 const selected=activeTeam(s);
 if(selected.length<2)return [];
 const gods=new Map(selected.map(id=>{
  const hero=s.heroes.find(h=>h.id===id);
  return [hero?.mythicId,id];
 }).filter(([key])=>!!key));
 return BONUSES.filter(b=>b.pair.every(key=>gods.has(key)));
}
function mods(s,id=s.activeHero){
 const v=old.mods(s,id),hero=s.heroes.find(h=>h.id===id);
 if(!v||!hero)return v;
 const equipped=Object.values(s.equipment?.[id]||{}).map(uid=>s.inventory.find(r=>r.uid===uid))
  .find(r=>E.ITEMS[r?.itemId]?.hg90Deity===hero.mythicId);
 if(equipped){
  v.damageBonus=(v.damageBonus||0)+.05;
  v.damageReduction=(v.damageReduction||0)+.02;
 }
 for(const b of activeBonds(s)){
  if(!activeTeam(s).includes(id))continue;
  for(const k of ['damageBonus','damageReduction','meleeDamage','rangedDamage'])
   v[k]=(v[k]||0)+(b[k]||0);
 }
 for(const k of ['damageBonus','damageReduction','meleeDamage','rangedDamage'])
  v[k]=Math.min(k==='damageReduction'?.4:.5,Math.max(0,v[k]||0));
 return v;
}
function equip(s,uid,id=s.activeHero){
 const row=s.inventory.find(r=>r.uid===uid),spec=E.ITEMS[row?.itemId],hero=s.heroes.find(h=>h.id===id);
 if(spec?.hg90Deity&&hero?.mythicId!==spec.hg90Deity)
  throw Error('Thần khí '+spec.name+' chỉ có thể trang bị cho vị thần tương ứng');
 return old.equip(s,uid,id);
}
function status(s){
 const q=ensure(s),fragments=s.hg18.materials.resource_chest||0,validIdle=
  !s.march&&!s.battle&&!s.expedition&&!s.parallelMarches?.length&&!s.hg26?.enabled;
 return {shards:q.shards,troopsSummoned:q.troopsSummoned,towerWins:q.towerWins,
  bossWins:q.bossWins,bonds:BONUSES.map(x=>({...x,owned:x.pair.every(key=>s.heroes.some(h=>h.mythicId===key)),
   active:activeBonds(s).some(b=>b.id===x.id)})),
  army:{...MYTH_ARMY[s.race],owned:s.army[MYTH_ARMY[s.race].id]||0,cost:100,receive:60,
   available:q.shards>=100&&validIdle&&(s.army[MYTH_ARMY[s.race].id]||0)<=1e9-60},
  relics:DIVINE.map(r=>{const h=s.heroes.find(x=>x.mythicId===r.deityId),owned=q.forged.includes(r.id);
   return {...r,heroId:h?.id||null,owned,available:!owned&&!!h&&validIdle&&
    fragments>=r.cost&&q.shards>=r.shards&&s.res.gold>=r.gold&&s.inventory.length<2000};})};
}
function summonTroops(s){
 const q=ensure(s),d=MYTH_ARMY[s.race],n=s.army[d.id]||0;
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length||s.hg26?.enabled)
  throw Error('Cần hoàn tất hành quân và chiến đấu trước khi triệu hồi Thần Binh');
 if(q.shards<100)throw Error('Thiếu mảnh Thần Binh: cần 100 mảnh');
 if(n>1e9-60||q.troopsSummoned>1e9-60)throw Error('Đã đạt giới hạn quân an toàn');
 const t=copy(s);t.hg90.shards-=100;t.hg90.troopsSummoned+=60;t.army[d.id]=n+60;
 t.hg90.last={type:'troop',count:60};
 if(!strict(t))throw Error('Không thể triệu hồi: Save v07 không hợp lệ, chưa trừ mảnh');
 Object.assign(s,t);
 E.note(s,'🐉 Triệu hồi 60 '+d.name+' tại '+E.activeCity(s).name+' bằng 100 mảnh Thần Binh.');
 return {unitId:d.id,units:60,shardsLeft:s.hg90.shards,army:s.army[d.id]};
}
function forge(s,id){
 const spec=BY_RELIC[id];if(!spec)throw Error('Công thức Thần Khí không tồn tại');
 const q=status(s),row=q.relics.find(r=>r.id===id);
 if(!row?.available){
  if(row?.owned)throw Error('Thần khí này đã rèn, chỉ sở hữu một bản');
  if(!row?.heroId)throw Error('Cần thức tỉnh thần tương ứng trước');
  throw Error('Thiếu mảnh/vàng, túi đầy hoặc tướng đang chiến đấu');
 }
 const t=copy(s);
 t.hg18.materials.resource_chest-=spec.cost;t.hg90.shards-=spec.shards;
 E.spend(t,{gold:spec.gold});
 const item=E.addItem(t,id,'HG90 rèn Thần khí riêng '+spec.deityId+' bằng mảnh và vàng thật');
 t.hg90.forged.push(id);t.hg90.last={type:'relic',count:1};
 if(!strict(t))throw Error('Lỗi kiểm tra Thần khí v07; chưa trừ nguyên liệu');
 Object.assign(s,t);
 E.note(s,'✦ Rèn '+E.ITEMS[id].name+' #'+item.uid+' cho '+spec.deityId+'.');
 return {uid:item.uid,itemId:id,cost:spec.cost,shards:spec.shards,gold:spec.gold};
}
function battleAct(s,cmd,options){
 const b=s.battle,kind=b?.kind,tier=b?.kind==='npc'?E.getTile(b.target)?.eliteTier:0;
 const floor=b?.hg21Tower?.floor;
 const result=old.battle(s,cmd,options);
 if(result?.type!=='win'||!b||!((kind==='tower'&&result.claimed)||
   (kind==='npc'&&tier>=11)))return result;
 const q=ensure(s);
 const amount=kind==='tower'?Math.min(80,6+Math.floor((floor||1)/4)):
  Math.min(80,18+Math.max(0,tier-11)*10);
 const actual=Math.max(0,Math.min(amount,1000000-q.shards));
 q.shards+=actual;
 if(kind==='tower')q.towerWins++;else q.bossWins++;
 q.last={type:kind==='tower'?'tower':'boss',count:actual};
 if(actual)E.note(s,'✨ Nhận '+actual+' mảnh Thần Binh từ chiến thắng '+
  (kind==='tower'?'Bí Cảnh tầng '+floor:'Boss cấp '+tier)+'.');
 result.hg90TroopShards=actual;
 return result;
}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,combatModifiers:mods,equipItem:equip,hg90Status:status,hg90Forge:forge,
 hg90SummonTroops:summonTroops,hg90ActiveBonds:activeBonds,HG90_BONDS:BONUSES,
 HG90_MYTH_UNITS:MYTH_ARMY,HG90_DIVINE_RELICS:DIVINE});
root.HOG_HG90=Object.freeze({version:1,save:7,bonds:BONUSES.length,relics:DIVINE.length,
 troopTypes:4,troopReceipt:60,troopCost:100,towerReset:'full_rewards'});
})(typeof globalThis!=='undefined'?globalThis:this);
