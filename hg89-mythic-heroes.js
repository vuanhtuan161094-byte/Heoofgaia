/* HG89 — Pantheon of legendary myth heroes, earned from divine fragments.
 * Historical Save v07 resource_chest becomes "Mảnh Thần Tướng", never
 * converted into resources or an instant random hero. Existing HG88 heroes
 * remain playable; only NEW divine summons require actual fragment assembly.
 * Deities below are public-domain mythological characters; art is original.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg88Summon||!E?.hg89JointMarch||!E?.HG18_MATERIALS||
 !E?.hg40AfterHit||!E?.hg81SkillStatus||!E?.heroCountLimit||E.V!==7)
 throw Error('HG89 requires HG88, HG261, HG40, HG81 and canonical Save v07');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 summon:E.hg88Summon,mods:E.combatModifiers,after:E.hg40AfterHit};
const PANTHEON=Object.freeze([
 Object.freeze({id:'yang_jian',name:'Dương Tiễn',myth:'Phong Thần',title:'Nhị Lang Hiển Thánh Chân Quân',
  cost:100,icon:'👁',element:'Thiên Nhãn',role:'Phá giáp / công thủ',
  skill:'Thiên Nhãn Phá Quân',cooldown:4,mult:.30,targets:1,radius:0,
  atk:.11,def:.09,melee:.04,ranged:0}),
 Object.freeze({id:'nezha',name:'Na Tra',myth:'Phong Thần',title:'Tam Đàn Hải Hội Đại Thần',
  cost:120,icon:'🔥',element:'Phong Hỏa',role:'Cận chiến / đánh lan',
  skill:'Phong Hỏa Luân',cooldown:3,mult:.31,targets:2,radius:2,
  atk:.10,def:.035,melee:.15,ranged:0}),
 Object.freeze({id:'zeus',name:'Zeus',myth:'Hy Lạp',title:'Chúa Tể Olympus',
  cost:200,icon:'⚡',element:'Thần Lôi',role:'Bạo kích / Lôi AoE',
  skill:'Lôi Đình Olympus',cooldown:4,mult:.48,targets:2,radius:3,
  atk:.16,def:.025,melee:0,ranged:.12}),
 Object.freeze({id:'athena',name:'Athena',myth:'Hy Lạp',title:'Thần Nữ Trí Tuệ',
  cost:150,icon:'🛡',element:'Thánh Khiên',role:'Chống chịu / xạ thủ',
  skill:'Thánh Quang Hộ Giới',cooldown:4,mult:.18,targets:1,radius:0,
  atk:.05,def:.17,melee:0,ranged:.10}),
 Object.freeze({id:'sun_wukong',name:'Tôn Ngộ Không',myth:'Tây Du',title:'Tề Thiên Đại Thánh',
  cost:250,icon:'🐒',element:'Cân Đẩu Vân',role:'Cận chiến / liên kích',
  skill:'Như Ý Kim Cô Bổng',cooldown:3,mult:.40,targets:1,radius:0,
  atk:.13,def:.055,melee:.18,ranged:0}),
 Object.freeze({id:'odin',name:'Odin',myth:'Bắc Âu',title:'Thần Vương Asgard',
  cost:500,icon:'🌌',element:'Gungnir',role:'Đánh xa / xuyên phá',
  skill:'Gungnir Định Mệnh',cooldown:5,mult:.58,targets:2,radius:2,
  atk:.18,def:.10,melee:0,ranged:.16})
]);
const BY_ID=Object.freeze(Object.fromEntries(PANTHEON.map(x=>[x.id,x])));
const REWARD_KEY='resource_chest'; // existing v07 material, never delete
const cap=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
function ensure(s){
 if(!s.hg89)s.hg89={v:1,assembled:[],last:null};
 return s.hg89;
}
function valid(s){
 const q=s?.hg89;
 if(!q||q.v!==1||!Array.isArray(q.assembled)||q.assembled.length>PANTHEON.length||
  new Set(q.assembled).size!==q.assembled.length||
  q.assembled.some(id=>!BY_ID[id])||!(q.last===null||
  q.last&&BY_ID[q.last.deityId]&&cap(q.last.heroId)))return false;
 const actual=new Set();
 for(const h of s.heroes||[]){
  if(!h.mythicId)continue;
  if(!BY_ID[h.mythicId]||h.mythicOrigin!=='hg89_fragments'||
   actual.has(h.mythicId)||!q.assembled.includes(h.mythicId)||
   h.cardSpecial||h.fusionOrigin||h.questSpecial)return false;
  actual.add(h.mythicId);
 }
 return true;
}
function strict(s){return old.strict(s)&&valid(s)}
function make(...a){const s=old.make(...a);ensure(s);return s}
function parse(x){const s=old.parse(x);ensure(s);if(!strict(s))throw Error('Save HG89 thần tướng không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Không thể lưu Thần Tướng: Save v07 sai');return old.serialize(s)}
function status(s){
 const q=ensure(s),shards=s.hg18?.materials?.[REWARD_KEY]||0;
 const capHeroes=Math.min(8,E.heroCountLimit(s.fame));
 return {fragments:shards,cap:capHeroes,roster:s.heroes.length,
  assembled:q.assembled.slice(),last:q.last,deities:PANTHEON.map(d=>({
   ...d,owned:q.assembled.includes(d.id),
   heroId:s.heroes.find(h=>h.mythicId===d.id)?.id||null,
   missing:Math.max(0,d.cost-shards),
   canAssemble:!q.assembled.includes(d.id)&&shards>=d.cost&&s.heroes.length<capHeroes&&
    !s.battle&&!s.march&&!s.expedition&&!s.parallelMarches?.length&&!s.hg26?.enabled}))};
}
function awaken(s,deityId){
 const d=BY_ID[deityId];
 if(!d)throw Error('Không tồn tại thần tướng trong thần điện');
 const check=status(s),target=check.deities.find(x=>x.id===deityId);
 if(!target?.canAssemble){
  if(target?.owned)throw Error(d.name+' chỉ có thể thức tỉnh một lần');
  if(check.fragments<d.cost)throw Error('Thiếu '+(d.cost-check.fragments)+' mảnh Thần Tướng để thức tỉnh '+d.name);
  if(check.roster>=check.cap)throw Error('Hết ô tướng theo Danh Vọng, chưa trừ mảnh');
  throw Error('Các đội còn đang hành quân, chiến đấu hoặc tự săn Boss');
 }
 const trial=E.clone(s),q=ensure(trial);
 const seed=(q.assembled.length+1)*7919+d.cost*13+trial.heroes.length*31;
 const total=370+seed%10;
 const stats={atk:Math.floor(total/4),def:Math.floor(total/4),
  spd:Math.floor(total/4),int:Math.floor(total/4)};
 ['atk','def','spd','int'].slice(0,total%4).forEach(k=>stats[k]++);
 const local=trial.heroes.find(h=>h.cityId===trial.activeCityId)||trial.heroes[0];
 if(!local)throw Error('Không có dữ liệu tướng gốc');
 const h=E.clone(local),id=Math.max(0,...trial.heroes.map(x=>x.id))+1;
 for(const k of ['questSpecial','fusionOrigin','fusionSource','cardSpecial','cardTier',
  'rewardOrigin','mythicId','mythicOrigin'])delete h[k];
 Object.assign(h,{id,name:d.name,cityId:trial.activeCityId,race:trial.race,level:1,xp:0,
  ...stats,hg18Base:{...stats},qualityModel:3,qualityScore:total,quality:'rainbow',
  heroRank:1,rebirth:0,statPoints:0,spentAttributePoints:{atk:0,def:0,spd:0,int:0},
  equippedSpells:[],mythicId:d.id,mythicOrigin:'hg89_fragments'});
 trial.heroes.push(h);
 trial.equipment[id]={};
 E.hg82ActivateLocal?.(trial,id);
 trial.hg18.materials[REWARD_KEY]-=d.cost;
 q.assembled.push(d.id);
 q.last={deityId:d.id,heroId:id};
 E.note(trial,'🌟 THỨC TỈNH '+d.name+' ('+d.title+') bằng '+d.cost+
  ' mảnh Thần Tướng thật. Kỹ năng: '+d.skill+'.');
 if(!E.strictSave(trial))throw Error('Không thể thức tỉnh: Save v07 không hợp lệ, chưa trừ mảnh');
 for(const key of Object.keys(s))if(!own(trial,key))delete s[key];
 Object.assign(s,trial);
 return {heroId:id,deityId:d.id,name:d.name,skill:d.skill,cost:d.cost,
  fragmentsLeft:s.hg18.materials[REWARD_KEY],quality:h.quality};
}
function summon(s,type,draws=1){
 if(type==='resource_chest')throw Error('Thần Tướng không mở ngẫu nhiên: mảnh được ghép trong Thần Điện Phong Thần');
 return old.summon(s,type,draws); // preserve Anh Kiệt card and historical HG88 heroes
}
function modifiers(s,id=s.activeHero){
 const value=old.mods(s,id),hero=s.heroes.find(h=>h.id===id),d=BY_ID[hero?.mythicId];
 if(!value||!d||hero.mythicOrigin!=='hg89_fragments')return value;
 const plus=(key,n,max)=>Math.min(max,Math.max(0,(value[key]||0)+n));
 return {...value,damageBonus:plus('damageBonus',d.atk,.5),
  damageReduction:plus('damageReduction',d.def,.4),
  meleeDamage:plus('meleeDamage',d.melee,.5),
  rangedDamage:plus('rangedDamage',d.ranged,.5)};
}
function afterHit(s,b,actor,target,hit,trace,deal){
 const prior=old.after(s,b,actor,target,hit,trace,deal);
 if(actor?.side!=='player'||!b?.hg40?.v||!(hit?.applied>0))return prior;
 const h=s.heroes.find(h=>h.id===(actor.heroId??s.expedition?.heroId??s.activeHero));
 const d=BY_ID[h?.mythicId];
 if(!d||h.mythicOrigin!=='hg89_fragments')return prior;
 const cooldown=b.hg40.cd,key=actor.id+':hg89:'+d.id;
 if((cooldown[key]||0)>b.turn)return prior;
 const other=(b.enemies||[]).filter(e=>e.pool>0&&e.id!==target.id&&
   E.battleHex.distance(e,target)<=d.radius)
   .sort((a,c)=>E.battleHex.distance(a,target)-E.battleHex.distance(c,target)||
    a.id.localeCompare(c.id));
 const targets=other.length&&d.targets>1?other.slice(0,d.targets):
  (target.pool>0?[target]:other.slice(0,1));
 let total=0;
 for(const enemy of targets){
  const amount=Math.max(1,Math.floor(hit.applied*d.mult));
  const result=deal(enemy,amount);
  if(!result?.applied)continue;
  total+=result.applied;
  b.hg40.events.push({actorId:actor.id,targetId:enemy.id,from:{x:actor.x,y:actor.y},
   to:{x:actor.x,y:actor.y},path:[],damage:result.applied,
   casualties:result.casualties||0,death:enemy.pool<=0,order:'skill',skill:d.skill});
 }
 if(total>0){
  cooldown[key]=b.turn+d.cooldown;
  b.hg40.lastSkills.push({turn:b.turn,skill:d.skill,
   detail:d.name+' thi triển '+d.skill+' · '+total+' sát thương thật',
   actorId:actor.id,side:'player'});
  b.hg40.lastSkills=b.hg40.lastSkills.slice(-15);
 }
 return prior+total;
}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 combatModifiers:modifiers,hg40AfterHit:afterHit,hg88Summon:summon,
 hg89Status:status,hg89Awaken:awaken,hg89Valid:valid,HG89_PANTHEON:PANTHEON});
root.HOG_HG89=Object.freeze({version:1,save:7,deities:PANTHEON.length,
 method:'earned_fragments_assemble_once',jointExpedition:'up_to_3_heroes_2_stacks_each'});
})(typeof globalThis!=='undefined'?globalThis:this);
