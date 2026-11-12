/* HG81: earned hero doctrine, protected fusion and real EXP consumables.
 * Save v07 remains the only authority. No invented purchases or duplicate
 * troops: all mutations validate before commit, all combat uses HG40 dealt HP.
 */
(function(root){'use strict';
 const E=root.HOG_ENGINE;
 if(!E?.hg408DismissHero||!E?.hg30Convert||!E?.hg71SpecialStatus||!E?.hg47Status)
  throw Error('HG81 needs completed HG30/HG47/HG71/HG73 hero engine');
 const prior={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
  xp:E.grantHeroExperience,battleXp:E.battleExperienceReward,after:E.hg40AfterHit};
 const MAX=5,EXP_CARD_PRICE=12000,EXP_CARD_USES=8;
 const TREE=Object.freeze([
  Object.freeze({id:'infantry',name:'Quân Đoàn Thiết Giáp',icon:'🛡',type:'Cận chiến',
   description:'Mỗi cấp tăng 5% sát thương thực từ bộ binh cận chiến.',perLevel:.05}),
  Object.freeze({id:'archery',name:'Thần Tiễn',icon:'🏹',type:'Đánh xa',
   description:'Mỗi cấp tăng 5% sát thương thực từ đội đánh xa.',perLevel:.05}),
  Object.freeze({id:'flying',name:'Thống Lĩnh Thiên Không',icon:'🐉',type:'Quân bay',
   description:'Mỗi cấp tăng 6% sát thương thực từ quân bay.',perLevel:.06}),
  Object.freeze({id:'elite',name:'Chiến Thuật Hoàng Gia',icon:'⚜',type:'T8–T10 & quân nhiệm vụ',
   description:'Mỗi cấp tăng 4% sát thương thực từ quân T8–T10 và quân nhiệm vụ.',perLevel:.04})
 ]);
 const FLYERS=new Set(['human_5','human_9','human_10','elf_5','elf_9','elf_10',
   'orc_6','orc_7','undead_9','undead_10']);
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x||{},k);
 const isInt=(n,min=0,max=100000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 function ensure(s){
  if(!s.hg81)s.hg81={v:1,skills:{},cards:0,activeUses:0,fusions:[]};
  return s.hg81;
 }
 function points(h){return Math.floor(Math.max(0,h.level-1)/5)+Math.max(0,h.rebirth||0)*2}
 function treeStatus(s,id){
  const h=s.heroes.find(h=>h.id===id),q=ensure(s);
  if(!h)throw Error('Tướng không tồn tại.');
  const levels=q.skills[id]||{},used=TREE.reduce((n,t)=>n+(levels[t.id]||0),0);
  const earned=points(h);
  return {heroId:id,earned,used,available:Math.max(0,earned-used),
   nodes:TREE.map(t=>({...t,level:levels[t.id]||0,max:MAX})),origin:!!h.fusionOrigin};
 }
 function valid(s){
  const q=s?.hg81;
  if(!q||q.v!==1||!isInt(q.cards,0,100)||!isInt(q.activeUses,0,EXP_CARD_USES)||
   !q.skills||typeof q.skills!=='object'||Array.isArray(q.skills)||
   !Array.isArray(q.fusions)||q.fusions.length>12)return false;
  for(const [id,levels] of Object.entries(q.skills)){
   const h=s.heroes?.find(x=>String(x.id)===id);
   if(!h||!levels||typeof levels!=='object'||Array.isArray(levels)||
    Object.keys(levels).some(k=>!TREE.some(t=>t.id===k)))return false;
   const amount=Object.values(levels);
   if(amount.some(n=>!isInt(n,0,MAX))||amount.reduce((a,b)=>a+b,0)>points(h))return false;
  }
  const seen=new Set();
  for(const h of s.heroes||[]){
   if(h.fusionOrigin===true){
    if(seen.has(h.id)||h.quality!=='origin'||h.level!==100||h.rebirth!==5||
      h.heroRank!==5||h.qualityModel!==4)return false;
    seen.add(h.id);
   }
  }
  return q.fusions.every(x=>x&&typeof x.name==='string'&&x.name.length<=120&&
   isInt(x.survivor,1,100000000)&&typeof x.donorName==='string'&&x.donorName.length<=120);
 }
 function skillUp(s,id,key){
  const t=TREE.find(t=>t.id===key),h=s.heroes.find(h=>h.id===id);
  if(!h||!t)throw Error('Chọn tướng và nhánh kỹ năng hợp lệ.');
  if(s.battle||s.march||s.expedition||s.parallelMarches?.length||
   E.hg20HeroRole(s,id).status!=='home')throw Error('Chỉ nâng kỹ năng khi tướng đang rảnh trong thành.');
  const q=ensure(s),old=q.skills[id]||{},before=treeStatus(s,id);
  if(before.available<1||(old[key]||0)>=MAX)throw Error('Không có điểm kỹ năng hoặc nhánh đã tối đa.');
  const next={...old,[key]:(old[key]||0)+1};
  const trial=E.clone(s);ensure(trial).skills[id]=next;
  if(!E.strictSave(trial))throw Error('Không thể ghi điểm kỹ năng: Save v07 không hợp lệ.');
  q.skills[id]=next;
  E.note(s,h.name+' nâng '+t.name+' lên '+next[key]+'/'+MAX+'; trừ 1 điểm kỹ năng.');
  return {heroId:id,skill:key,level:next[key],remaining:before.available-1};
 }
 function busy(s,id){
  return !!(s.battle||s.march||s.expedition||s.parallelMarches?.length||
   E.hg26Status?.(s)?.enabled||E.hg20HeroRole(s,id).status!=='home');
 }
 function strip(s,id,mode='all'){
  if(!['all','gear','army'].includes(mode))throw Error('Lệnh thu hồi không hợp lệ.');
  const h=s.heroes.find(x=>x.id===id);if(!h)throw Error('Không tìm thấy tướng.');
  if(busy(s,id))throw Error('Tướng đang hành quân, giao tranh hoặc săn Boss; không thể tháo.');
  const trial=E.clone(s);
  let gear=0,troops=0;
  if(mode!=='army'){
   gear=Object.values(trial.equipment?.[id]||{}).filter(uid=>uid!==null&&uid!==undefined).length;
   if(gear)trial.equipment[id]={};
  }
  if(mode!=='gear'){
   for(const key of Object.keys(trial.hg20?.plans||{}))if(key.endsWith(':'+id)){
    troops+=trial.hg20.plans[key].reduce((n,g)=>n+g.count,0);
    trial.hg20.plans[key]=[];
   }
   if(trial.activeHero===id){troops=Math.max(troops,(trial.formation||[]).reduce((n,g)=>n+g.count,0));trial.formation=[]}
   for(const key of Object.keys(trial.hg24?.templates||{}))if(key.endsWith(':'+id))delete trial.hg24.templates[key];
  }
  if(!E.strictSave(trial))throw Error('Dọn tướng thất bại khi xác minh Save; không thay đổi gì.');
  if(mode!=='army')s.equipment[id]={};
  if(mode!=='gear'){
   for(const key of Object.keys(trial.hg20?.plans||{}))if(key.endsWith(':'+id))s.hg20.plans[key]=[];
   if(s.activeHero===id)s.formation=[];
   for(const key of Object.keys(s.hg24?.templates||{}))if(key.endsWith(':'+id))delete s.hg24.templates[key];
  }
  E.note(s,'HG81: '+h.name+' tháo '+gear+' trang bị, giải phóng '+troops+' quân dự kiến. Không mất đồ hay quân.');
  return {heroId:id,gear,troops,version:s.version};
 }
 function fusionCheck(s){
  const r=s.heroes.filter(h=>E.hg408HeroQuality(h)==='rainbow'&&h.level===100&&(h.rebirth||0)===5&&!h.fusionOrigin&&!h.questSpecial);
  const p=s.heroes.filter(h=>E.hg408HeroQuality(h)==='platinum'&&h.level===100&&(h.rebirth||0)===5&&!h.fusionOrigin&&!h.questSpecial);
  const ready=h=>!busy(s,h.id)&&h.id!==s.castellan&&E.hg408DismissCheck(s,h.id).reasons.every(x=>!x.includes('nhiệm vụ'));
  const rainbow=r.find(ready),platinum=p.find(ready);
  return {rainbow:rainbow?.id||null,platinum:platinum?.id||null,
   candidates:{rainbow:r.length,platinum:p.length},
   allowed:!!rainbow&&!!platinum&&rainbow.id!==platinum.id,
   requirements:'Cần 1 Cầu Vồng + 1 Bạch Kim, cả hai Lv100 và chuyển sinh 5/5, ở thành và không trong nhiệm vụ.'};
 }
 function fuse(s,rainbowId,platinumId){
  if(!isInt(rainbowId,1)||!isInt(platinumId,1)||rainbowId===platinumId)throw Error('Phải chọn hai tướng khác nhau.');
  if(s.battle||s.march||s.expedition||s.parallelMarches?.length||E.hg26Status?.(s)?.enabled)
   throw Error('Chờ kết thúc chiến đấu, hành quân và săn Boss trước khi hợp thể.');
  const r=s.heroes.find(h=>h.id===rainbowId),p=s.heroes.find(h=>h.id===platinumId);
  if(!r||!p||E.hg408HeroQuality(r)!=='rainbow'||E.hg408HeroQuality(p)!=='platinum'||
   r.level!==100||p.level!==100||r.rebirth!==5||p.rebirth!==5||r.questSpecial||p.questSpecial||
   r.fusionOrigin||p.fusionOrigin)throw Error('Hai nguyên liệu phải là Cầu Vồng và Bạch Kim Lv100/CS5 thật.');
  if(r.id===s.castellan||p.id===s.castellan||busy(s,r.id)||busy(s,p.id))
   throw Error('Hai tướng phải ở thành, không giữ chức Castellan hoặc bị điều động.');
  const trial=E.clone(s),winner=trial.heroes.find(h=>h.id===rainbowId),donor=trial.heroes.find(h=>h.id===platinumId);
  // One protected rollback boundary: existing dismissal cleans the donor's
  // equipment, army plans, Tower slots, UI state and orphan references.
  // Remove skill ledger first: the canonical dismissal validates the draft
  // against HG81 strict Save before it commits its own transactional change.
  ensure(trial);delete trial.hg81.skills[platinumId];
  const dismissed=E.hg408DismissHero(trial,platinumId);
  for(const key of ['atk','def','spd','int']){
   const a=Number(winner.hg18Base?.[key]||winner[key]),b=Number(donor.hg18Base?.[key]||donor[key]);
   const combined=Math.round((a+b)*.90);
   winner[key]=combined;
   winner.hg18Base=winner.hg18Base||{};
   winner.hg18Base[key]=combined;
  }
  winner.level=100;winner.xp=0;winner.heroRank=5;winner.rebirth=5;
  winner.statPoints=0;winner.spentAttributePoints={atk:0,def:0,spd:0,int:0};
  winner.fusionOrigin=true;winner.quality='origin';winner.qualityModel=4;
  winner.qualityScore=['atk','def','spd','int'].reduce((v,k)=>v+winner[k],0);
  winner.name='Thần Khởi Nguyên '+(winner.name||'');
  ensure(trial).fusions.unshift({survivor:winner.id,name:winner.name,donorName:donor.name});
  trial.hg81.fusions=trial.hg81.fusions.slice(0,12);
  delete trial.hg81.skills[platinumId];
  if(!E.strictSave(trial))throw Error('Hợp thể không vượt kiểm tra Save v07; không tiêu hao tướng.');
  for(const k of Object.keys(s))if(!own(trial,k))delete s[k];
  Object.assign(s,trial);
  E.note(s,'🌈✧ Hai tướng Lv100/CS5 hợp thể thành '+winner.name+'. Tất cả đồ của '+donor.name+' được giữ nguyên trong kho.');
  return {id:winner.id,name:winner.name,used:[rainbowId,platinumId],returnedGear:dismissed.returnedGear,version:7};
 }
 function xpStatus(s){const q=ensure(s);return {cards:q.cards,activeUses:q.activeUses,price:EXP_CARD_PRICE,uses:EXP_CARD_USES,
  canBuy:s.res.gold>=EXP_CARD_PRICE&&q.cards<100,canActivate:q.cards>0&&q.activeUses===0}}
 function buyXpCard(s){
  const q=ensure(s);
  if(q.cards>=100)throw Error('Kho thẻ đã đầy.');
  E.spend(s,{gold:EXP_CARD_PRICE});q.cards++;
  E.note(s,'Mua thẻ EXP ×2 thật: trừ '+EXP_CARD_PRICE+' vàng, còn '+q.cards+' thẻ.');return xpStatus(s);
 }
 function activateXpCard(s){
  const q=ensure(s);
  if(!q.cards||q.activeUses)throw Error('Không có thẻ hoặc hiệu lực thẻ EXP đang hoạt động.');
  q.cards--;q.activeUses=EXP_CARD_USES;
  E.note(s,'Kích hoạt EXP ×2 cho '+EXP_CARD_USES+' lượt nhận EXP từ quái/Tháp.');return xpStatus(s);
 }
 function xpReward(b){
  const source=prior.battleXp(b),factor=b?.kind==='npc'?3:b?.kind==='treasure'?2:2;
  return {...source,baseXp:Math.min(1e12,Math.round(source.baseXp*factor)),source:'HG81+'+source.source};
 }
 function grantXP(s,id,amount,reason='gameplay'){
  const q=ensure(s),battle=/thắng trận|vượt Bí Cảnh|thắng Boss|vượt Tháp/i.test(reason);
  const t=Number.isFinite(amount)?Math.max(0,amount):amount;
  const factor=/vượt Bí Cảnh|vượt Tháp/i.test(reason)?3:1;
  const eligible=battle&&q.activeUses>0&&s.heroes.some(h=>h.id===id&&h.level<100)&&t>0;
  const adjusted=Number.isFinite(t)?Math.min(1e12,t*factor*(eligible?2:1)):amount;
  const receipt=prior.xp(s,id,adjusted,reason);
  if(eligible&&receipt.gained>0){q.activeUses--;E.note(s,'Thẻ EXP ×2: còn '+q.activeUses+' lần nhận EXP từ chiến đấu.');}
  return {...receipt,hg81Base:amount,hg81Factor:factor*(eligible?2:1),cardApplied:eligible};
 }
 function afterHit(s,b,actor,target,hit,trace,deal){
  const base=prior.after?.(s,b,actor,target,hit,trace,deal)||0;
  if(actor?.side!=='player'||!target||target.pool<=0||!hit?.applied||!b?.hg40?.v)return base;
  const id=actor.heroId??s.expedition?.heroId??s.activeHero,levels=ensure(s).skills[id];
  if(!levels)return base;
  const u=Object.values(E.C.units).concat(Object.values(E.C.rewardUnits||{})).flat().find(q=>q.id===actor.unitId);
  if(!u)return base;
  const flying=FLYERS.has(u.id),ranged=actor.range>1;
  const extraRatio=Math.min(.60,
   (flying?levels.flying||0:!ranged?levels.infantry||0:0)*(flying?.06:.05)+
   (ranged?levels.archery||0:0)*.05+
   ((u.tier>=8||u.rewardUnit)?levels.elite||0:0)*.04);
  if(extraRatio<=0)return base;
  const additional=Math.max(1,Math.floor(hit.applied*extraRatio));
  const landed=deal(target,additional);
  if(!landed?.applied)return base;
  b.hg40.events.push({actorId:actor.id,targetId:target.id,from:{x:actor.x,y:actor.y},
   to:{x:actor.x,y:actor.y},path:[],damage:landed.applied,
   casualties:landed.casualties||0,death:target.pool<=0,order:'skill',skill:'Chiến Thuật Tướng'});
  return base+landed.applied;
 }
 function make(...a){const s=prior.make(...a);ensure(s);return s}
 function parse(...a){const s=prior.parse(...a);ensure(s);if(!strict(s))throw Error('Save HG81 không hợp lệ');return s}
 function strict(s){return prior.strict(s)&&valid(s)}
 function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG81 không hợp lệ');return prior.serialize(s)}
 Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
  grantHeroExperience:grantXP,battleExperienceReward:xpReward,hg40AfterHit:afterHit,
  hg81Ensure:ensure,hg81SkillStatus:treeStatus,hg81SkillUp:skillUp,hg81StripHero:strip,
  hg81FusionStatus:fusionCheck,hg81Fuse:fuse,hg81XpStatus:xpStatus,
  hg81BuyXpCard:buyXpCard,hg81ActivateXpCard:activateXpCard,hg81Valid:valid,HG81_SKILLS:TREE});
 root.HOG_HG81=Object.freeze({version:1,saveVersion:7,skillCount:TREE.length,xpCardUses:EXP_CARD_USES,
  fusion:'Thần Khởi Nguyên · Cầu Vồng + Bạch Kim Lv100/CS5',tavernOriginChance:0});
})(typeof globalThis!=='undefined'?globalThis:this);
