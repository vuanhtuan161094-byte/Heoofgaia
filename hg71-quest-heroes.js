/* HG71: unique quest-only Celestial hero, 4-turn splash skill and passive.
 * Earned once from the actual 20th Hero Task. Never in Tavern, never minted
 * by Save/Reload or passive world tick. Compatible with existing Save v07.
 */
(function(root){'use strict';
 const E=root.HOG_ENGINE;
 if(!E?.claimHeroTask||!E?.hg40AfterHit||!E?.heroCountLimit||!E?.hg408HeroQuality)throw Error('HG71 needs HG10/HG40/HG408');
 const old={make:E.make,parse:E.parseSave,strict:E.strictSave,serialize:E.serializeSave,
  claim:E.claimHeroTask,mods:E.combatModifiers,after:E.hg40AfterHit};
 const SKILL=Object.freeze({id:'celestial_oath',name:'Thiên Khải Liên Kích',kind:'AOE',
  cooldown:4,splash:0.45,maxTargets:2,passiveDamage:0.12,passiveDefense:0.08,
  description:'Mỗi 4 lượt, khi tấn công trúng sẽ gây thêm 45% sát thương lên tối đa 2 đội địch gần mục tiêu. Nội tại tăng 12% sát thương, giảm 8% sát thương nhận.'});
 const NAMES=Object.freeze({human:'Thánh Sứ Thiên Khải',elf:'Tinh Linh Thất Sắc',
  orc:'Chiến Thần Huyết Thệ',undead:'Minh Vương Bất Diệt'});
 function ensure(s){
  if(!s.hg71)s.hg71={v:1,unlocked:false,claimed:false,heroId:null};
  const q=s.hg71;
  if(s.dailyTaskState?.heroTask?.completed>=20)q.unlocked=true;
  const existing=s.heroes?.find(h=>h.questSpecial===SKILL.id&&h.rewardOrigin==='hero_task_20');
  if(existing){q.unlocked=true;q.claimed=true;q.heroId=existing.id}
  return q;
 }
 function valid(s){
  const q=s.hg71;
  return !!q&&q.v===1&&typeof q.unlocked==='boolean'&&typeof q.claimed==='boolean'&&
   (q.heroId===null||Number.isSafeInteger(q.heroId)&&q.heroId>0)&&
   (!q.claimed||q.unlocked);
 }
 function status(s){
  const q=ensure(s),hero=s.heroes.find(h=>h.id===q.heroId);
  return {unlocked:q.unlocked,claimed:q.claimed,pending:q.unlocked&&!q.claimed,
   heroId:q.heroId,name:hero?.name||NAMES[s.race]||NAMES.human,
   canClaim:q.unlocked&&!q.claimed&&s.heroes.length<Math.min(8,E.heroCountLimit(s.fame)),
   skill:SKILL,source:'Nhiệm vụ tướng 20/20',exclusive:true};
 }
 function claim(s){
  const q=ensure(s);if(!q.unlocked)throw Error('Cần hoàn thành đủ 20 nhiệm vụ tướng để mở khóa.');
  if(q.claimed)throw Error('Tướng độc bản đã được nhận; không thể nhân bản.');
  if(s.heroes.length>=Math.min(8,E.heroCountLimit(s.fame)))
   throw Error('Đủ số tướng cho phép. Hãy tăng Danh Vọng hoặc giải phóng một ô tướng để nhận thưởng.');
  const id=Math.max(0,...s.heroes.map(h=>h.id))+1;
  const original=s.heroes[0];if(!original)throw Error('Không tìm thấy tướng mẫu để tạo bản ghi v07 an toàn.');
  const h=JSON.parse(JSON.stringify(original));
  Object.assign(h,{id,name:NAMES[s.race]||NAMES.human,level:1,xp:0,
   atk:92,def:90,spd:88,int:94,qualityModel:3,qualityScore:364,
   quality:'rainbow',statPoints:0,spentAttributePoints:{atk:0,def:0,spd:0,int:0},
   heroRank:1,rebirth:0,equippedSpells:[],
   questSpecial:SKILL.id,rewardOrigin:'hero_task_20'});
  h.hg18Base={atk:92,def:90,spd:88,int:94};
  s.heroes.push(h);
  const oldState={claimed:q.claimed,heroId:q.heroId};
  q.claimed=true;q.heroId=id;
  if(!old.strict(s)){
   s.heroes.pop();q.claimed=oldState.claimed;q.heroId=oldState.heroId;
   throw Error('Tướng phần thưởng không tương thích Save v07; chưa ghi nhận để tránh mất dữ liệu.');
  }
  E.note(s,'✨ Hoàn tất 20 nhiệm vụ tướng: nhận '+h.name+' độc bản và kỹ năng '+SKILL.name+'.');
  return {id,name:h.name,quality:h.quality,skill:SKILL.name,version:s.version,source:'hero_task_20'};
 }
 function claimTask(s,...args){
  const receipt=old.claim(s,...args),q=ensure(s);
  if(receipt.completed===20&&q.unlocked&&!q.claimed){
   if(status(s).canClaim)receipt.uniqueHero=claim(s);
   else receipt.uniqueHeroPending=true;
  }
  return receipt;
 }
 function modifiers(s,id=s.activeHero){
  const value=old.mods(s,id),hero=s.heroes.find(h=>h.id===id);
  if(hero?.questSpecial!==SKILL.id||hero.rewardOrigin!=='hero_task_20')return value;
  return {...value,
   damageBonus:Math.min(.5,(value.damageBonus||0)+SKILL.passiveDamage),
   damageReduction:Math.min(.4,(value.damageReduction||0)+SKILL.passiveDefense)};
 }
 function afterHit(s,b,actor,target,hit,trace,deal){
  const original=old.after(s,b,actor,target,hit,trace,deal);
  if(actor?.side!=='player'||!b?.hg40?.v||!Number.isFinite(hit?.applied)||hit.applied<=0)return original;
  const hero=s.heroes.find(h=>h.id===(actor.heroId??s.expedition?.heroId??s.activeHero));
  if(hero?.questSpecial!==SKILL.id||hero.rewardOrigin!=='hero_task_20')return original;
  const hg=b.hg40,key=actor.id+':'+SKILL.id;
  if((hg.cd[key]||0)>b.turn)return original;
  const others=b.enemies.filter(u=>u.pool>0&&u.id!==target.id&&
   E.battleHex.distance(u,target)<=2)
   .sort((a,c)=>E.battleHex.distance(a,target)-E.battleHex.distance(c,target)||a.id.localeCompare(c.id))
   .slice(0,SKILL.maxTargets);
  // Single enemy still receives an empowered strike; a dense formation gets
  // two independently resolved splash hits through the same damage callback.
  const targets=others.length?others:target.pool>0?[target]:[];
  let extra=0;for(const enemy of targets){
   const amount=Math.max(1,Math.floor(hit.applied*SKILL.splash));
   const dealt=deal(enemy,amount);if(!dealt?.applied)continue;
   extra+=dealt.applied;
   hg.events.push({actorId:actor.id,targetId:enemy.id,from:{x:actor.x,y:actor.y},
    to:{x:actor.x,y:actor.y},path:[],damage:dealt.applied,
    casualties:dealt.casualties||0,death:enemy.pool<=0,order:'skill',skill:SKILL.name});
  }
  if(extra>0){
   hg.cd[key]=b.turn+SKILL.cooldown;
   hg.lastSkills.push({turn:b.turn,skill:SKILL.name,
    detail:hero.name+' kích hoạt '+SKILL.name+' · '+extra+' sát thương lan',
    actorId:actor.id,side:'player'});
   hg.lastSkills=hg.lastSkills.slice(-15);
  }
  return original+extra;
 }
 function make(...args){const s=old.make(...args);ensure(s);return s}
 function parse(text){const s=old.parse(text);ensure(s);if(!strict(s))throw Error('Save HG71 không hợp lệ');return s}
 function strict(s){return old.strict(s)&&valid(s)}
 function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG71 không hợp lệ');return old.serialize(s)}
 Object.assign(E,{make,parseSave:parse,strictSave:strict,valid:strict,serializeSave:serialize,
  claimHeroTask:claimTask,combatModifiers:modifiers,hg40AfterHit:afterHit,
  hg71SpecialStatus:status,hg71ClaimSpecial:claim,hg71Valid:valid,HG71_CELESTIAL_SKILL:SKILL});
 root.HOG_HG71=Object.freeze({version:1,save:7,source:'20-genuine-hero-tasks',tavern:false});
})(typeof globalThis!=='undefined'?globalThis:this);
