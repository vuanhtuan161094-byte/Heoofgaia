/* HG88 — Tower first-clear rewards, one daily reset, earned special-hero cards.
 * Offline original gameplay, not source-verified 2009 server rates.
 * All claims live in canonical Save v07; no second roster or fabricated task.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg21TowerEnter||!E?.hg71SpecialStatus||!E?.hg81SkillStatus||
 !E?.hg87Craft||!E?.heroCountLimit||!E?.HG18_MATERIALS||E.V!==7)
 throw Error('HG88 requires HG21/HG18/HG71/HG81/HG87 Save v07 gameplay');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 modifiers:E.combatModifiers};
const TYPES=Object.freeze({
 resource_card:{label:'Thẻ triệu hồi Anh Kiệt',mult:1},
 resource_chest:{label:'Thẻ triệu hồi Thần Tướng',mult:3}
});
const HERO_NAMES=Object.freeze({
 human:['Chiến Vương Hoàng Kim','Thánh Nữ Thiên Khải','Thiên Khải Kiếm Chủ'],
 elf:['Tinh Nguyệt Thần Tiễn','Thánh Nữ Nguyệt Quang','Lâm Giới Chiến Vương'],
 orc:['Huyết Nham Đại Đế','Cuồng Phong Chiến Thần','Viễn Cổ Thú Vương'],
 undead:['Minh Vực Hoàng Tử','Hồn Hỏa Nữ Vương','U Minh Pháp Chủ']
});
const MILESTONES=Object.freeze([10,25,50,100,200,500,1000]);
const int=(n,max=1000000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
function ensure(s){
 if(!s.hg88)s.hg88={v:1,totalDrawn:0,summons:0,last:null,milestones:[]};
 if(!Array.isArray(s.hg88.milestones))s.hg88.milestones=[];
 return s.hg88;
}
function valid(s){
 const q=s?.hg88;
 return !!q&&q.v===1&&int(q.totalDrawn)&&int(q.summons)&&
  Array.isArray(q.milestones)&&q.milestones.length<=10000&&
  new Set(q.milestones).size===q.milestones.length&&
  q.milestones.every(f=>int(f,1000000)&&f>=5&&f%5===0)&&
  (q.last===null||!!q.last&&int(q.last.heroId)&&int(q.last.draws,500)&&
   ['platinum','rainbow','purple','green','yellow','blue','white'].includes(q.last.quality));
}
function strict(s){return old.strict(s)&&valid(s)}
function make(...args){return Object.assign(old.make(...args),{hg88:{v:1,totalDrawn:0,summons:0,last:null,milestones:[]}})}
function parse(text){const s=old.parse(text);ensure(s);if(!strict(s))throw Error('Save HG88 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG88 không hợp lệ');return old.serialize(s)}
const hash=n=>{
 let v=n>>>0;v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);
 return (v^(v>>>16))>>>0;
};
function cardStatus(s){
 ensure(s);
 return {small:s.hg18.materials.resource_card||0,large:s.hg18.materials.resource_chest||0,
  totalDrawn:s.hg88.totalDrawn,roster:s.heroes.length,cap:E.heroCountLimit(s.fame),
  last:s.hg88.last};
}
function summon(s,type,draws=1){
 if(!TYPES[type]||![1,10,100,200,500].includes(draws))throw Error('Chọn 1, 10, 100, 200 hoặc 500 thẻ hợp lệ');
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length||s.hg26?.enabled)
  throw Error('Kết thúc chiến đấu, hành quân và săn Boss trước khi triệu hồi');
 const q=ensure(s),wallet=s.hg18?.materials;
 if((wallet?.[type]||0)<draws)throw Error('Không đủ '+TYPES[type].label+' để mở '+draws+' thẻ');
 const cap=E.heroCountLimit(s.fame);
 if(s.heroes.length>=cap)throw Error('Đủ '+cap+' tướng theo Danh Vọng; hãy mở ô tướng trước khi dùng thẻ');
 if(q.totalDrawn+draws>1000000000||q.summons>=1000000000)throw Error('Đã đạt giới hạn lịch sử triệu hồi');
 const trial=E.clone(s);ensure(trial);
 // One summon selection PER batch; the count represents attempts to find
 // the strongest hero, never 500 new hero objects that bypass the Fame cap.
 const race=trial.race,offset=['human','elf','orc','undead'].indexOf(race);
 let best=null;
 for(let i=0;i<draws;i++){
  const seed=hash(Math.imul(q.totalDrawn+i+1,0x9e3779b1)^
   Math.imul((offset+1)*11,0x85ebca6b)^
   Math.imul(TYPES[type].mult,0x27d4eb2f));
  const roll=seed%1000;
  const tier=roll<TYPES[type].mult*28?'rainbow':
   roll<TYPES[type].mult*65?'platinum':
   roll<TYPES[type].mult*260?'purple':roll<580?'green':roll<790?'yellow':'blue';
  const quality=E.HERO_QUALITY_V2.find(x=>x.id===tier);
  const total=quality.totalMin+hash(seed^0x3ad76bd5)%(quality.totalMax-quality.totalMin+1);
  const candidate={total,seed,tier};
  if(!best||candidate.total>best.total)best=candidate;
 }
 // Explicit pity guarantees: 100 >= Platinum, 200/500 Rainbow; the
 // larger batch has a unique passive but consumes ALL cards honestly.
 let tier=best.tier,total=best.total;
 if(draws>=200&&tier!=='rainbow'){
  tier='rainbow';total=360+hash(best.seed^0x12d3b9)%20;
 }else if(draws>=100&&!['platinum','rainbow'].includes(tier)){
  tier='platinum';total=340+hash(best.seed^0x1f1337)%20;
 }
 if(draws===500&&tier==='rainbow')total=Math.max(376,total);
 const quality=E.HERO_QUALITY_V2.find(x=>x.id===tier);
 const values=Array(4).fill(Math.floor(total/4));
 for(let i=0;i<total%4;i++)values[(hash(best.seed+i)%4)]++;
 const names=HERO_NAMES[race]||HERO_NAMES.human,
  heroId=Math.max(0,...trial.heroes.map(h=>h.id))+1,
  template=E.clone(trial.heroes[0]);
 for(const key of ['questSpecial','fusionOrigin','fusionSource','cardSpecial','cardTier','rewardOrigin'])
  delete template[key];
 const index=hash(best.seed^0x34a7)%names.length;
 const stats={atk:values[0],def:values[1],spd:values[2],int:values[3]};
 const hero={...template,id:heroId,name:names[index]+' · '+(draws>=100?'Thiên Mệnh':'Anh Kiệt'),
  cityId:trial.activeCityId,race:trial.race,level:1,xp:0,...stats,
  qualityModel:3,qualityScore:total,quality:tier,
  cardSpecial:true,cardTier:draws>=500?500:draws>=200?200:draws>=100?100:10,
  rewardOrigin:'hg88_card_'+type,heroRank:1,rebirth:0,statPoints:0,
  spentAttributePoints:{atk:0,def:0,spd:0,int:0},hg18Base:{...stats},
  equippedSpells:[]};
 trial.heroes.push(hero);
 trial.equipment[heroId]={};
 E.hg82ActivateLocal?.(trial,heroId);
 trial.hg18.materials[type]-=draws;
 trial.hg88.totalDrawn+=draws;trial.hg88.summons++;
 trial.hg88.last={heroId,draws,quality:tier};
 E.note(trial,'✨ Triệu hồi '+draws+' '+TYPES[type].label+': chọn '+hero.name+
  ' ('+quality.label+', '+total+' điểm gốc), nhận 1 tướng; thẻ bị trừ đúng '+draws+'.');
 if(!E.strictSave(trial))throw Error('Không thể triệu hồi: Save v07 không hợp lệ, chưa trừ thẻ');
 for(const key of Object.keys(s))if(!Object.prototype.hasOwnProperty.call(trial,key))delete s[key];
 Object.assign(s,trial);
 return {heroId,name:hero.name,quality:tier,total,draws,cardsLeft:s.hg18.materials[type],
  skill:hero.cardTier===500?'Thiên Mệnh Vương Giả':hero.cardTier===200?'Thánh Hộ Huyền Cơ':'Anh Kiệt Chi Tâm'};
}
function modifiers(s,id=s.activeHero){
 const result=old.modifiers(s,id),hero=s.heroes.find(h=>h.id===id);
 if(!result||hero?.cardSpecial!==true||!String(hero.rewardOrigin||'').startsWith('hg88_card_'))return result;
 const level=hero.cardTier||10;
 const buff=level>=500?.16:level>=200?.12:level>=100?.09:.035;
 return {...result,
  damageBonus:Math.min(.5,(result.damageBonus||0)+buff),
  damageReduction:Math.min(.4,(result.damageReduction||0)+buff*.55)};
}
function towerStatus(s){
 E.hg21TowerPicks(s);
 const t=s.hg20.tower,ledger=t.hg88,now=new Date(s.lastTick).toISOString().slice(0,10);
 return {floor:t.floor,highest:ledger.highest,resetsUsed:ledger.resetDay===now?ledger.resetsUsed:0,
  resetReady:t.floor>1&&(ledger.resetDay!==now||ledger.resetsUsed<1)&&
    !s.battle&&!s.march&&!s.expedition&&!s.parallelMarches?.length,
  milestones:MILESTONES.map(floor=>({floor,done:ledger.highest>=floor})),
  repeat:t.floor<=ledger.highest};
}
function resetTower(s){
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length||s.hg26?.enabled)
  throw Error('Tướng đang chiến đấu, hành quân hoặc săn Boss; không thể reset Tháp');
 E.hg21TowerPicks(s);
 const t=s.hg20.tower,ledger=t.hg88;
 if(t.floor<=1)throw Error('Tháp đang ở tầng 1; chưa cần reset');
 if(ledger.resetsUsed>=1)throw Error('Đã reset Tháp hôm nay. Mỗi ngày được reset 1 lần');
 const original=t.floor;
 const trial=E.clone(s);
 trial.hg20.tower.floor=1;trial.hg20.tower.hg88.resetsUsed++;
 if(!E.strictSave(trial))throw Error('Không thể reset Tháp: Save v07 không hợp lệ');
 t.floor=1;t.hg88.resetsUsed++;
 E.note(s,'🔁 Reset Bí Cảnh từ tầng '+original+' về tầng 1; kỷ lục '+ledger.highest+
  ' được giữ. Thắng lại sẽ nhận ĐỦ tài nguyên, EXP, mảnh và trang bị đúng mốc.');
 return {from:original,to:1,highest:ledger.highest,used:t.hg88.resetsUsed};
}
function awardTower(s,floor,report){
 const ledger=ensure(s);
 const m=s.hg18?.materials,large=floor>=100?(floor===100?100:floor===200?200:floor===500?500:floor>=1000?500:0):
  floor%25===0?25:floor%10===0?10:0;
 const small=floor%5===0&&!large?Math.max(5,Math.min(20,Math.floor(floor/5))):0;
 const added={small:0,large:0,items:[]};
 if(m&&large&&m.resource_chest+large<=1000000){m.resource_chest+=large;added.large=large}
 if(m&&small&&m.resource_card+small<=1000000){m.resource_card+=small;added.small=small}
 if([100,200,500].includes(floor)&&s.inventory.length<2000){
  const slot={100:'weapon',200:'armor',500:'relic'}[floor],
   itemId='hg83_'+s.race+'_'+slot;
  if(E.ITEMS[itemId]){
   const item=E.addItem(s,itemId,'HG88 mốc Tháp '+floor+' — nhận một lần');
   added.items.push({uid:item.uid,id:item.itemId});
  }
 }
 if(added.small||added.large||added.items.length)
  E.note(s,'🏆 Tháp tầng '+floor+(report?.replay?' (lượt reset)':'')+': +'+added.small+' thẻ Anh Kiệt, +'+added.large+
   ' mảnh Thần Tướng'+(added.items.length?', và 1 Di vật Vương Miện':'')+'.');
 // Achievement ledger is unique, but no longer blocks genuine replay loot.
 if(floor%5===0&&!ledger.milestones.includes(floor))ledger.milestones.push(floor);
 report.heroCards=added;
 return added;
}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 combatModifiers:modifiers,hg88Summon:summon,hg88CardStatus:cardStatus,
 hg88TowerStatus:towerStatus,hg88ResetTower:resetTower,hg88AwardTower:awardTower});
root.HOG_HG88=Object.freeze({version:1,saveVersion:7,resetPerDay:1,
 cardBatchSizes:[1,10,100,200,500],oneHeroPerBatch:true,towerMilestones:MILESTONES});
})(typeof globalThis!=='undefined'?globalThis:this);
