/* HG40 Tactical V3 — deterministic 40-unit traits, one canonical HG09 combat.
 * Skill and role metadata is original balancing, not historic 2009 source data.
 * Existing v07 mid-combat Saves with no hg40 field continue with HG39 rules.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.battleActCore||!E?.battleHex)throw Error('HG40 requires canonical HG39 combat');
const R={
 human:[
 ['T','Giữ hàng','guard',.09,.17,0],['C','Dò điểm yếu','mark',.12,2,4],
 ['X','Tập trung bắn','thirdBonus',.24,0,0],['T','Giáp nặng','rangedGuard',.22,0,0],
 ['C','Bổ nhào','charge',.28,0,3],['H','Tịnh tâm','heal',.10,2,4],
 ['C','Xung phong','charge',.34,0,3],['H','Thánh thuẫn','shield',.15,1,4],
 ['C','Phán quyết','judgment',.35,.24,3],['H','Thiên thuẫn','multiShield',.13,2,4]],
 elf:[
 ['C','Đột kích','antiMelee',.12,.18,0],['C','Thoắt ẩn','firstGuard',.38,0,0],
 ['T','Kiên cố','meleeGuard',.25,0,0],['X','Tiễn ràng buộc','slow',1,2,3],
 ['C','Bứt tốc','dash',1,0,3],['H','Rễ trói','root',1,1,4],
 ['H','Thanh tẩy','cleanse',.12,1,3],['X','Song tiễn','splash',.45,0,3],
 ['T','Long tức','splash',.45,0,3],['H','Hộ rừng','multiShield',.17,2,4]],
 orc:[
 ['C','Cuồng nộ','rage',.16,0,0],['C','Săn đuổi','wounded',.22,0,0],
 ['X','Phá giáp','defdown',.15,2,3],['C','Cắn xé','dot',.10,2,3],
 ['T','Đập choáng','stun',.18,1,5],['C','Tập kích','antiRanged',.25,0,0],
 ['C','Sét lan','splash',.45,0,3],['X','Đá chấn','splashSlow',.38,1,3],
 ['C','Áp đảo','killBuff',.20,2,0],['C','Xé phòng ngự','thirdPierce',.25,.15,0]],
 undead:[
 ['T','Xương cứng','rangedGuard',.16,0,0],['T','Mờ ảo','firstGuard',.40,0,0],
 ['T','Ôn dịch','atkdown',.15,2,3],['C','Xuyên ảnh','thirdPierce',.22,.15,0],
 ['C','Huyết thực','lifesteal',.18,0,3],['X','Nguyền khí','dot',.12,2,4],
 ['C','Hắc xung','charge',.28,0,3],['H','Vua nguyền','atkdown',.22,2,4],
 ['C','Hơi thở mục','splash',.45,0,3],['C','Hồn tiêu','defdown',.18,2,4]]
};
const TRAITS=Object.freeze(Object.fromEntries(Object.entries(R).flatMap(([race,list])=>
 list.map((row,i)=>[race+'_'+(i+1),Object.freeze({unitId:race+'_'+(i+1),role:row[0],
 name:row[1],kind:row[2],a:row[3],b:row[4],cd:row[5]})]))));
if(Object.keys(TRAITS).length!==40)throw Error('HG40 requires exactly 40 traits');
const round=n=>Math.max(0,Math.floor(Number.isFinite(n)?n:0));
const alive=u=>!!u&&u.pool>0&&u.count>0;
function stateOf(b){return b?.hg40?.v===1?b.hg40:null}
function owner(s,u){return u.side==='player'?String(u.heroId??s.expedition?.heroId??s.activeHero):'enemy'}
function sameOwner(s,a,u){return a.side===u.side&&owner(s,a)===owner(s,u)}
function boss(s,b,u){
 if(u.side==='player')return false;
 const tile=E.getTile(b.target);
 return !!(tile?.privateBoss||(tile?.eliteTier||0)>=11||
  b.hg21Tower&&(b.hg21Tower.floor||0)%10===0);
}
function scaleFor(s,b){
 if(b.kind==='tower'){
  const floor=b.hg21Tower?.floor||1;
  return floor<=10?[1,1,1]:floor<=25?[1.15,1.07,1.05]:
   floor<=50?[1.25,1.12,1.08]:[1.35,1.18,1.12];
 }
 const tile=E.getTile(b.target),tier=tile?.eliteTier||0,lv=b.level||1;
 if(b.kind==='castle')return [1,1,1];
 if(tier>=13)return [1.30,1.15,1.10];
 if(tier>=11)return [1.60,1.25,1.15];
 if(lv>=7)return [1.40,1.18,1.10];
 if(lv>=4)return [1.20,1.10,1.05];
 return [1,1,1];
}
function prepare(s,b){
 if(!b||b.hg40)return b;
 const multipliers=scaleFor(s,b);
 const h={v:1,mode:'hg40',multipliers,cd:{},hits:{},flags:{},shields:{},
  statuses:[],stunImmune:{},events:[],lastSkills:[],turnApplied:0};
 for(const u of b.enemies){
  // Do not multiply the persistent garrison or side-owned real troop data.
  const ratio=u.hp>0?Math.min(1,u.pool/(u.hp*Math.max(1,u.count))):1;
  u.hp=Math.max(1,Math.round(u.hp*multipliers[0]));
  u.atk=Math.max(0,Math.round(u.atk*multipliers[1]));
  u.def=Math.max(0,Math.round(u.def*multipliers[2]));
  u.pool=Math.max(1,Math.min(u.count*u.hp,Math.ceil(u.count*u.hp*ratio)));
  u.count=Math.ceil(u.pool/u.hp);
 }
 b.hg40=h;
 b.history.unshift('HG40: đặc tính quân tự kích hoạt, kháng Boss và sức mạnh địch áp một lần.');
 return b;
}
function getStatus(b,u,kind){
 const h=stateOf(b);if(!h)return null;
 return h.statuses.filter(x=>x.target===u.id&&x.kind===kind&&x.until>=b.turn)
  .sort((x,y)=>y.value-x.value||x.source.localeCompare(y.source))[0]||null;
}
function addStatus(s,b,u,kind,value,duration,source,extra={}){
 const h=stateOf(b);if(!h||!alive(u))return false;
 const harmful=!['buff','mark'].includes(kind);
 if(harmful){
  const existing=h.statuses.filter(x=>x.target===u.id&&x.kind!==kind&&x.until>=b.turn&&
   !['buff','mark'].includes(x.kind));
  if(existing.length>=3)return false;
 }
 const before=h.statuses.findIndex(x=>x.target===u.id&&x.kind===kind);
 const item={target:u.id,kind,value,source:String(source),until:b.turn+duration,...extra};
 if(kind==='dot'){item.nextTick=b.turn+1;item.ticks=duration;}
 if(before>=0){
  const prev=h.statuses[before];if(prev.value>value)item.value=prev.value;
  item.until=Math.max(prev.until,item.until);
  if(kind==='dot'&&prev.value>value)item.ticks=prev.ticks;
  h.statuses[before]=item;
 }else h.statuses.push(item);
 return true;
}
function ready(b,actor,t){const h=stateOf(b);return !!h&&b.turn>=(h.cd[actor.id+':'+t.kind]||1)}
function commit(b,u,t){if(t.cd>0)stateOf(b).cd[u.id+':'+t.kind]=b.turn+t.cd}
function note(b,spec,message){
 const h=stateOf(b);if(!h)return;
 h.lastSkills.push({turn:b.turn,skill:spec.name,detail:message});
 h.lastSkills=h.lastSkills.slice(-15);
}
function currentShield(b,u){return stateOf(b)?.shields[u.id]?.amount||0}
function addShield(b,u,pct){
 const h=stateOf(b);if(!h||!alive(u))return 0;
 const cap=Math.ceil(u.count*u.hp*.25),old=currentShield(b,u);
 const actual=Math.max(0,Math.min(cap-old,Math.ceil(u.count*u.hp*pct)));
 if(actual){h.shields[u.id]={amount:old+actual};}
 return actual;
}
function absorb(b,target,incoming){
 const h=stateOf(b);if(!h)return {remaining:incoming,absorbed:0};
 const shield=currentShield(b,target),absorbed=Math.min(shield,incoming);
 if(absorbed)h.shields[target.id].amount-=absorbed;
 return {remaining:incoming-absorbed,absorbed};
}
function alliesOf(s,b,actor){
 return (actor.side==='player'?b.allies:b.enemies).filter(u=>alive(u)&&sameOwner(s,actor,u));
}
function chooseAlly(s,b,actor,mode){
 const rows=alliesOf(s,b,actor);
 if(mode==='heal')return rows.filter(u=>u.pool<u.count*u.hp)
  .sort((a,c)=>(c.count*c.hp-c.pool)-(a.count*a.hp-a.pool)||a.id.localeCompare(c.id))[0]||null;
 if(mode==='cleanse')return rows.filter(u=>b.hg40.statuses.some(st=>st.target===u.id&&st.until>=b.turn&&
  !['mark','buff'].includes(st.kind)))
  .sort((a,c)=>a.id.localeCompare(c.id))[0]||null;
 const inRange=rows.filter(u=>E.battleHex.distance(u,actor)<=2);
 return inRange.sort((a,c)=>(currentShield(b,a)/(a.count*a.hp))-(currentShield(b,c)/(c.count*c.hp))||a.id.localeCompare(c.id))[0]||null;
}
function beforeAction(s,b,u){
 if(!stateOf(b))return false;
 const stun=getStatus(b,u,'stun');
 return !!stun;
}
function movement(b,u){
 if(!stateOf(b))return 0;
 const slow=getStatus(b,u,'slow')?1:0,rooted=getStatus(b,u,'root')?1:0;
 const dash=getStatus(b,u,'dash')?1:0;
 return Math.max(-2,Math.min(1,dash-slow-rooted));
}
function plan(s,b,actor,target,trace){
 const h=stateOf(b);if(!h)return null;
 const own=TRAITS[actor.unitId],other=TRAITS[target.unitId],t=own;
 const step=trace?.path?.length||0,close=E.battleHex.distance(actor,target)===1;
 let bonus=0,pierce=0,reduction=0,kind=null;
 const fav=t?.role==='C'&&other?.role==='X'||t?.role==='X'&&other?.role==='H'||
  t?.role==='H'&&other?.role==='T';
 if(fav)bonus+=.12;
 if(other?.role==='T'&&t?.role==='C')reduction+=.10;
 if(other){
  if(other.kind==='guard'){
   const nearby=alliesOf(s,b,target).some(u=>u.id!==target.id&&E.battleHex.distance(u,target)===1);
   reduction+=nearby?other.b:other.a;
  }
  if(other.kind==='rangedGuard'&&actor.range>1)reduction+=other.a;
  if(other.kind==='meleeGuard'&&actor.range===1)reduction+=other.a;
  if(other.kind==='firstGuard'&&!h.flags[target.id+':first']){
   reduction+=other.a;h.flags[target.id+':first']=true;
   note(b,other,'Giảm sát thương đòn đầu');
  }
 }
 if(getStatus(b,actor,'atkdown')){}
 const debuff=getStatus(b,actor,'damageDown')||getStatus(b,actor,'atkdown');
 const defdown=getStatus(b,target,'defdown');
 const marked=getStatus(b,target,'mark');
 if(marked&&marked.source===owner(s,actor))bonus+=marked.value;
 const empowered=getStatus(b,actor,'buff');if(empowered)bonus+=empowered.value;
 if(t){
  switch(t.kind){
   case 'rage':if(actor.pool<actor.initial*actor.hp*.5)bonus+=t.a;break;
   case 'wounded':if(target.pool<target.initial*target.hp)bonus+=t.a;break;
   case 'antiMelee':if(target.range===1)bonus+=(alliesOf(s,b,actor)
    .some(u=>u.id!==actor.id&&E.battleHex.distance(u,target)===1)?t.b:t.a);break;
   case 'antiRanged':if(close&&target.range>1)bonus+=t.a;break;
   case 'thirdBonus':if(((h.hits[actor.id]||0)+1)%3===0)bonus+=t.a;break;
   case 'thirdPierce':if(((h.hits[actor.id]||0)+1)%3===0)
    pierce=boss(s,b,target)?Math.min(.15,t.b):t.a;break;
   case 'charge':if(step>0&&ready(b,actor,t))bonus+=t.a;break;
   case 'judgment':if(ready(b,actor,t))bonus+=boss(s,b,target)?t.a:t.b;break;
  }
  kind=t.kind;
 }
 return {bonus:Math.min(.65,bonus),pierce:Math.min(.25,pierce),
  reduction:Math.min(.65,reduction),atkPenalty:debuff?.value||0,
  defPenalty:defdown?.value||0,skill:t,kind,marked:!!marked};
}
function afterHit(s,b,actor,target,hit,trace,deal){
 const h=stateOf(b),t=TRAITS[actor.unitId];
 if(!h||!t||!hit.applied)return 0;
 h.hits[actor.id]=(h.hits[actor.id]||0)+1;
 const cd=ready(b,actor,t),kind=t.kind,move=trace?.path?.length||0;
 let extra=0,used=false;
 function apply(kind,value,turns=2){used=addStatus(s,b,target,kind,value,turns,owner(s,actor))}
 function secondary(multiplier,slow=false){
  const pool=(actor.side==='player'?b.enemies:b.allies);
  const other=pool.filter(u=>u.id!==target.id&&alive(u)&&E.battleHex.distance(u,target)<=1)
   .sort((a,c)=>a.id.localeCompare(c.id))[0];
  if(!other)return;
  const amount=Math.floor(hit.applied*multiplier);
  if(amount<=0)return;
  const result=deal(other,amount);extra+=result.applied;
  h.events.push({actorId:actor.id,targetId:other.id,from:{x:actor.x,y:actor.y},
   to:{x:actor.x,y:actor.y},path:[],damage:result.applied,
   casualties:result.casualties,death:other.pool<=0,order:'skill',skill:t.name});
  if(slow)addStatus(s,b,other,'slow',1,1,owner(s,actor));
  used=true;
 }
 if(cd){
  if(kind==='mark')apply('mark',t.a,t.b);
  else if(kind==='defdown')apply('defdown',boss(s,b,target)?Math.min(t.a,t.a===.18?.10:.15):t.a,t.b);
  else if(kind==='atkdown')apply('atkdown',t.a,t.b);
  else if(kind==='slow')apply('slow',1,t.b);
  else if(kind==='root')apply(boss(s,b,target)?'slow':'root',1,t.b);
  else if(kind==='dot')apply('dot',Math.max(1,Math.floor(hit.applied*t.a)),t.b);
  else if(kind==='stun'){
   if(boss(s,b,target))apply('damageDown',t.a,1);
   else if((h.stunImmune[target.id]||0)<b.turn){
    apply('stun',1,1);h.stunImmune[target.id]=b.turn+4;
   }
  }else if(kind==='heal'){
   const u=chooseAlly(s,b,actor,'heal');
   if(u){
    const before=u.pool;
    u.pool=Math.min(u.count*u.hp,u.pool+Math.ceil(u.count*u.hp*t.a));
    used=u.pool>before;
   }
  }else if(kind==='shield'||kind==='multiShield'){
   const allies=alliesOf(s,b,actor).filter(u=>E.battleHex.distance(u,actor)<=2)
    .sort((a,c)=>(currentShield(b,a)/(a.count*a.hp))-(currentShield(b,c)/(c.count*c.hp))||a.id.localeCompare(c.id))
    .slice(0,kind==='multiShield'?2:1);
   for(const u of allies)if(addShield(b,u,t.a)>0)used=true;
  }else if(kind==='cleanse'){
   const chosen=chooseAlly(s,b,actor,'cleanse');
   if(chosen){
    const ix=h.statuses.findIndex(x=>x.target===chosen.id&&x.until>=b.turn&&!['mark','buff'].includes(x.kind));
    if(ix>=0){h.statuses.splice(ix,1);used=true;}
   }else{
    const u=chooseAlly(s,b,actor,'shield');if(u&&addShield(b,u,t.a)>0)used=true;
   }
  }else if(kind==='splash'||kind==='splashSlow')secondary(t.a,kind==='splashSlow');
  else if(kind==='lifesteal'){
   const gain=Math.min(Math.ceil(hit.applied*t.a),actor.count*actor.hp-actor.pool);
   if(gain>0){actor.pool+=gain;used=true;}
  }else if(kind==='dash'){
   addStatus(s,b,actor,'dash',1,1,owner(s,actor));used=true;
  }else if(kind==='charge')used=move>0;
  else if(kind==='judgment')used=true;
 }
 if(kind==='killBuff'&&hit.casualties>0){
  addStatus(s,b,actor,'buff',t.a,t.b,owner(s,actor));used=true;
 }
 if(kind==='thirdBonus'&&h.hits[actor.id]%3===0)used=true;
 if(kind==='thirdPierce'&&h.hits[actor.id]%3===0)used=true;
 if(used){
  commit(b,actor,t);note(b,t,actor.name+' kích hoạt '+t.name);
 }
 return extra;
}
function endTurn(s,b,turn,deal){
 const h=stateOf(b);if(!h||h.turnApplied>=turn)return {dealt:0,lost:0};
 let dealt=0,lost=0;
 for(const effect of h.statuses){
  if(effect.kind!=='dot')continue;
  if(effect.nextTick>turn||effect.ticks===0)continue;
  const target=[...b.allies,...b.enemies].find(u=>u.id===effect.target);
  if(alive(target)){
   const result=deal(target,effect.value);if(target.side==='player')lost+=result.applied;else dealt+=result.applied;
   h.events.push({actorId:target.id,targetId:target.id,from:{x:target.x,y:target.y},
    to:{x:target.x,y:target.y},path:[],damage:result.applied,
    casualties:result.casualties,death:target.pool<=0,order:'dot',skill:'DoT'});
  }
  effect.ticks--;effect.nextTick=turn+1;
 }
 h.statuses=h.statuses.filter(x=>(x.kind==='dot'&&x.ticks>0)||x.until>turn);
 h.turnApplied=turn;
 return {dealt,lost};
}
function statusText(b,u){
 const h=stateOf(b);if(!h||!u)return '';
 const list=h.statuses.filter(x=>x.target===u.id&&x.until>=b.turn).map(x=>x.kind);
 if(currentShield(b,u))list.unshift('Khiên '+currentShield(b,u));
 return list.slice(0,3).join(' · ');
}
function skillText(b,u){
 const t=TRAITS[u?.unitId];if(!t)return '';
 const h=stateOf(b),until=h?.cd[u.id+':'+t.kind]||0;
 return t.name+(until>b.turn?' · CD '+(until-b.turn):' · sẵn sàng');
}
Object.assign(E,{HG40_TRAITS:TRAITS,hg40PrepareBattle:prepare,hg40BeforeAction:beforeAction,
 hg40MoveModifier:movement,hg40PlanStrike:plan,hg40Absorb:absorb,
 hg40AfterHit:afterHit,hg40EndTurn:endTurn,hg40StatusText:statusText,hg40SkillText:skillText});
root.HOG_HG40=Object.freeze({version:1,traits:40,save:7,mode:'deterministic-auto-tactical'});
})(typeof globalThis!=='undefined'?globalThis:this);
