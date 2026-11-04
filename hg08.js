/* HG-08: evidence-labelled troop gates, canonical spell research and hero progression.
 * The original client/server code and commercial art are not included. Queue prices,
 * durations, tavern generation and combat XP are explicitly simulated.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==6)throw Error('HG08 requires HG06/HG07');
const prior={make:E.make,tick:E.tick,valid:E.valid,strict:E.strictSave,parse:E.parseSave,serialize:E.serializeSave,startMarch:E.startMarch,
 recruit:E.recruit,battleAct:E.battleAct,hire:E.hireCandidate,refreshTavern:E.refreshTavern,learn:E.learn,appoint:E.appoint,selectHero:E.selectHero};
const V=7,KEY='heoofgaia_hg_only_v07';
const XP_TO_NEXT=[150,369,653,990,1371,1793,2252,2745,3270,3824,4407,5018,5654,6315,7001,7710,8441,9194,9968];
// These are labels for the historical recruitment table, not a second level store.
const TECHNOLOGIES=Object.freeze({
 training:{name:'Bootcamp',vi:'Huấn luyện (Bootcamp)',spell:'bootcamp',max:10,source:'SRC04; SRC19; SRC20',status:'OBSERVED_REQUIREMENT; NAME_MAPPING_DERIVED; COST_AND_TIME_SIMULATED'},
 manufacturing:{name:'Manufacturing',vi:'Chế tạo (Manufacturing)',spell:'manufacturing',max:10,source:'SRC04; SRC19; SRC20',status:'OBSERVED_REQUIREMENT; COST_AND_TIME_SIMULATED'}
});
const HUMAN={
 1:{buildings:{hall:1,barracks:1},spells:{},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 2:{buildings:{barracks:2},spells:{scouting:1},sourceStatus:'PARTIAL_SCOUT_HALL_GATE',source:'SRC27; SRC04'},
 3:{buildings:{hall:3,barracks:3},spells:{bootcamp:1},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 4:{buildings:{hall:4,barracks:4,blacksmith:1},spells:{manufacturing:1},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 5:{buildings:{hall:5,barracks:5,stables:1},spells:{manufacturing:3},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 6:{buildings:{hall:6,barracks:6},spells:{bootcamp:5},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 7:{buildings:{hall:7,barracks:7,stables:4,blacksmith:4},spells:{bootcamp:6},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 8:{buildings:{hall:8,barracks:8,blacksmith:6},spells:{manufacturing:7},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 9:{buildings:{hall:9,barracks:9,stables:7,blacksmith:8},spells:{manufacturing:8},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 10:{buildings:{hall:10,barracks:10,stables:9,blacksmith:10},spells:{manufacturing:9,bootcamp:9},sourceStatus:'OBSERVED',source:'SRC19; SRC20'}
};
const SECONDARY={elf:{elf_1:{buildings:{barracks:1},spells:{},sourceStatus:'SECONDARY',source:'SRC28'}},orc:{orc_7:{buildings:{barracks:7,beastPen:4,blacksmith:4},spells:{bootcamp:6},sourceStatus:'SECONDARY',source:'SRC26'}}};
const FAME_MINE_CAPS=Object.freeze([[0,5],[2200,6],[5800,7],[11500,8],[21000,9],[33000,11],[54000,13],[80000,15],[150000,17],[300000,20],[500000,20],[700000,20],[1000000,20]]);
// SRC20's 2009-12-27 fame table also prints the account-wide hero cap.
// Repeated fame ranks with no cap change are omitted; no extra save field is needed.
const FAME_HERO_CAPS=Object.freeze([[0,2],[2200,3],[5800,4],[11500,6],[21000,7],[33000,8],[54000,9],[80000,10],[150000,11],[300000,13],[500000,14],[700000,16],[1000000,18]]);
// SRC20's Fame table records both maximum AP and hourly recovery for every rank.
// The minimum row represents a new account; older saves keep their current AP.
const FAME_AP=Object.freeze([[5,150,15],[200,165,16],[800,180,18],[2200,200,20],[5800,230,23],[11500,260,26],[21000,290,29],[33000,320,32],[54000,360,36],[80000,400,40],[150000,450,45],[300000,500,50],[500000,560,56],[700000,620,62],[1000000,700,70]]);
const MINE_HOURLY=Object.freeze({gold:200,wood:40,ore:40,sulfur:20,crystal:20});
function fameApStats(fame){
 if(!Number.isFinite(fame))fame=0;
 let index=0;for(let i=1;i<FAME_AP.length;i++){if(fame>=FAME_AP[i][0])index=i;else break;}
 const [threshold,max,perHour]=FAME_AP[index],nextFame=FAME_AP[index+1]?.[0]??null;
 return {threshold,max,perHour,nextFame};
}
function mineLimit(s){
 const fame=typeof s==='number'?s:s?.fame;
 if(!Number.isFinite(fame))return 5;
 let allowed=5;
 for(const [threshold,count] of FAME_MINE_CAPS){if(fame>=threshold)allowed=count;else break;}
 return allowed;
}
function heroCountLimit(fame){
 if(!Number.isFinite(fame))return 2;
 let allowed=2;
 for(const [threshold,count] of FAME_HERO_CAPS){if(fame>=threshold)allowed=count;else break;}
 return allowed;
}
const attrKeys=['atk','def','spd','int'];
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function legacyDispatch(s){
 if(!s.march&&!s.battle)return null;
 const form=[];
 if(s.battle?.allies?.length){for(const a of s.battle.allies)if(a.unitId&&a.count>0)form.push({unitId:a.unitId,count:a.count})}
 else if(s.formation?.length){for(const g of s.formation)if(g.unitId&&g.count>0)form.push({unitId:g.unitId,count:g.count})}
 else for(const u of E.activeArmy(s).sort((a,b)=>b.tier-a.tier).slice(0,7))form.push({unitId:u.id,count:s.army[u.id]||0});
 const army={};for(const g of form){const u=E.getUnit(s,g.unitId);if(!u)continue;const count=Math.min(Math.max(0,Math.floor(g.count)),s.army[u.id]||0);if(count){army[u.id]=(army[u.id]||0)+count;s.army[u.id]-=count}}
 if(!Object.keys(army).length)return null;
 const heroId=s.march?.heroId||s.activeHero;
 return {heroId,homeKey:'3,4',army,formation:form.filter(g=>army[g.unitId]>0),phase:s.battle?'battle':'outbound'};
}
function heroAway(s,id){return !!(s.expedition?.heroId===id||s.stationedHeroes?.some(x=>x.heroId===id)||s.parallelMarches?.some(x=>x.heroId===id))}
function heroesAwayCount(s){return (s.expedition?1:0)+(s.parallelMarches?.length||0)+(s.stationedHeroes?.length||0)}
function ensure(s){
 E.ensure06(s);
 const ap=fameApStats(s.fame);s.apMax=ap.max;if(Number.isFinite(s.ap))s.ap=Math.min(s.ap,ap.max);
 if(!Array.isArray(s.stationedHeroes))s.stationedHeroes=[];
 if(!Array.isArray(s.parallelMarches))s.parallelMarches=[];
 if(!Object.prototype.hasOwnProperty.call(s,'expedition'))s.expedition=legacyDispatch(s);
 if(s.march&&!s.march.phase)s.march.phase='outbound';
 if(s.march&&!s.march.fromKey)s.march.fromKey=s.march.path?.[0]||'3,4';
 if(s.expedition&&!s.expedition.homeCityId)s.expedition.homeCityId='main';
 for(const x of s.stationedHeroes)if(!x.homeCityId)x.homeCityId='main';
 for(const key of ['blacksmith','magicPool','natureTower','beastPen','darkHall','soulTower','graveyard'])if(!Number.isSafeInteger(s.buildings[key]))s.buildings[key]=key==='graveyard'&&s.race==='undead'?(s.buildings.barracks||0):0;
 if(!obj(s.spells))s.spells={};
 if(!Object.prototype.hasOwnProperty.call(s,'researchQueue'))s.researchQueue=null;
 if(!Object.prototype.hasOwnProperty.call(s,'arenaQueue'))s.arenaQueue=null;
 if(obj(s.arenaQueue)&&!Number.isSafeInteger(s.arenaQueue.reincarnationLevel))s.arenaQueue.reincarnationLevel=0;
 tavernOffers(s);
 for(const h of s.heroes){
  if(!Number.isSafeInteger(h.statPoints)||h.statPoints<0)h.statPoints=0;
  if(!obj(h.spentAttributePoints))h.spentAttributePoints={atk:0,def:0,spd:0,int:0};
  for(const k of attrKeys)if(!Number.isSafeInteger(h.spentAttributePoints[k])||h.spentAttributePoints[k]<0)h.spentAttributePoints[k]=0;
 }
 return s;
}
const COLORS=Object.freeze(['white','blue','yellow','green','purple']);
function nameColor(hero){const value=hero.atk+hero.def+hero.spd+hero.int-(hero.level||1)+1;return value<=125?'white':value<=160?'blue':value<=180?'yellow':value<=200?'green':'purple'}
function statColor(value){return value<=40?'white':value<=50?'blue':value<=60?'yellow':value<=70?'green':'purple'}
function enrichOffer(offer){
 if(!offer||typeof offer!=='object')return offer;
 if(!Number.isSafeInteger(offer.level)||offer.level<1)offer.level=1;
 offer.quality=nameColor(offer);offer.heroValue=offer.atk+offer.def+offer.spd+offer.int-offer.level+1;
 offer.statColors=Object.fromEntries(attrKeys.map(k=>[k,statColor(offer[k])]));return offer;
}
function tavernOffers(s){if(Array.isArray(s.tavern?.offers))for(const offer of s.tavern.offers)enrichOffer(offer)}
function sampleTavern10Stat(){
 // SRC21 (living Fandom page, build/date unknown) reports 6,708 sampled
 // attributes: 4,350 white + 2,226 blue, 130 yellow, 2 green, no purple.
 // Follow that community sample: common values are uniform 20-50; observed
 // yellow/green bands are 51-60/61-70. These are model weights, not server odds.
 const draw=Math.floor(Math.random()*6708);
 if(draw<6576)return 20+Math.floor(Math.random()*31);
 if(draw<6706)return 51+Math.floor(Math.random()*10);
 return 61+Math.floor(Math.random()*10);
}
function highTavernCommonStats(s){
 const level=s.buildings.tavern||0,raceIndex=Object.keys(E.C.races).indexOf(s.race),round=s.tavern.round||0;
 if(level>=6&&level<10&&s.tavern.offers.length){
  // SRC48 (17173, 2009-10-25) says Tavern levels above 5 almost always
  // refresh at least one blue hero, but gives no probability or stat table.
  // Keep that qualitative rule playable with one deterministic blue offer;
  // its 20-50 stats and blue-band adjustment are an explicit simulation.
  const i=(round+raceIndex)%s.tavern.offers.length,offer=s.tavern.offers[i];
  const seed=(round*104729+(i+1)*7919+(raceIndex+1)*1543)>>>0;
  for(let j=0;j<4;j++)offer[attrKeys[j]]=20+((seed+((j+1)*(j+17)*7919))%31);
  const target=126+(seed%35);let total=attrKeys.reduce((n,k)=>n+offer[k],0),step=seed%4,spins=0;
  while(total<target&&spins<256){const k=attrKeys[(step+spins)%4];if(offer[k]<50){offer[k]++;total++}spins++}
  while(total>target&&spins<512){const k=attrKeys[(step+spins)%4];if(offer[k]>20){offer[k]--;total--}spins++}
  offer.level=1;enrichOffer(offer);
 }
 if(level<10)return;
 for(let i=0;i<s.tavern.offers.length;i++){
  const offer=s.tavern.offers[i];
  for(const key of attrKeys)offer[key]=sampleTavern10Stat();
  offer.level=1;enrichOffer(offer);
 }
}
function refreshTavern(s){prior.refreshTavern(s);highTavernCommonStats(s);tavernOffers(s);return s.tavern.offers}
function cityBuildOrder(s){
 const unique=['magicPool','natureTower','beastPen','darkHall','soulTower','graveyard'];
 const map={human:['stables','blacksmith'],elf:['magicPool','natureTower'],orc:['beastPen','blacksmith'],undead:['graveyard','darkHall','soulTower']};
 return E.buildOrder.filter(key=>!unique.includes(key)&&key!=='blacksmith'&&key!=='stables'&&!(s.race==='undead'&&key==='barracks')).concat(map[s.race]||[]);
}
function buildingUpgradeGate(s,key){
 const def=E.C.buildings[key],level=s.buildings?.[key]||0,next=level+1;
 if(!def||def.state!=='observed')return {allowed:false,reason:'Công trình chưa được triển khai.'};
 if(level>=10)return {allowed:false,reason:'Đạt cấp tối đa mô phỏng.'};
 if(s.buildingQueue)return {allowed:false,reason:'Đang có một công trình trong hàng đợi.'};
 if(key==='heroTower'&&next===8){
  if((s.buildings.hall||0)<7)return {allowed:false,reason:'SRC03: cần Town Hall cấp 7 để nâng Tháp tướng lên cấp 8.',source:'SRC03'};
  return {allowed:true,reason:'SRC03: Tháp tướng cấp 8 mở khi Town Hall đạt cấp 7.',source:'SRC03',exception:'town-hall-cap'};
 }
 if(key==='tavern'&&next===10){
  if((s.buildings.hall||0)<7)return {allowed:false,reason:'SRC03: cần Town Hall cấp 7 cho chuỗi Quán trọ cấp 10.',source:'SRC03'};
  if((s.buildings.heroTower||0)<8)return {allowed:false,reason:'SRC03: cần Tháp tướng cấp 8 để nâng Quán trọ lên cấp 10.',source:'SRC03'};
  return {allowed:true,reason:'SRC03: Quán trọ cấp 10 cần Tháp tướng cấp 8 (Town Hall cấp 7).',source:'SRC03',exception:'town-hall-cap'};
 }
 if(key!=='hall'&&level>=(s.buildings.hall||0))return {allowed:false,reason:'Cần nâng Town Hall trước.',source:'SRC03'};
 return {allowed:true,reason:'',source:'SRC03'};
}
function buildingUpgradeCapException(s,key,next){
 return (key==='heroTower'&&next===8&&(s.buildings.hall||0)>=7)||
  (key==='tavern'&&next===10&&(s.buildings.hall||0)>=7&&(s.buildings.heroTower||0)>=8);
}
function troopBuildingKey(raceOrState){const race=typeof raceOrState==='string'?raceOrState:raceOrState?.race;return race==='undead'?'graveyard':'barracks'}
function expToNext(level){
 if(!Number.isSafeInteger(level)||level<1||level>=100)return null;
 if(level<=19)return XP_TO_NEXT[level-1];
 return 120*(level*level-300);
}
function heroTowerExperienceBonus(s){
 const level=s?.buildings?.heroTower;
 return Number.isSafeInteger(level)&&level>0?level:0;
}
// SRC45 is a dated 2009 Chinese player guide with exact NPC XP rewards for
// stars 4–8. Lower stars and non-NPC targets keep the prior explicit model.
const NPC_BATTLE_XP=Object.freeze({4:1000,5:4000,6:9000,7:18000,8:30000});
function battleExperienceReward(battle){
 const star=Number.isSafeInteger(battle?.level)&&battle.level>0?battle.level:1;
 const sourced=battle?.kind==='npc'&&Object.prototype.hasOwnProperty.call(NPC_BATTLE_XP,star);
 return {star,baseXp:sourced?NPC_BATTLE_XP[star]:30*star,source:sourced?'SRC45':'SIM'};
}
function grantHeroExperience(s,heroId,amount,reason='gameplay'){
 ensure(s);
 if(!Number.isFinite(amount)||amount<0||amount>1e12)throw Error('Kinh nghiệm không hợp lệ');
 const h=s.heroes.find(x=>x.id===heroId);if(!h)throw Error('Không tìm thấy tướng nhận kinh nghiệm');
 const bonusPercent=heroTowerExperienceBonus(s);
 if(h.level>=100||amount===0)return {base:0,gained:0,bonusPercent,levels:0,level:h.level,xp:h.xp};
 const gained=amount+amount*bonusPercent/100;
 h.xp+=gained;let levels=0;
 while(h.level<100){const need=expToNext(h.level);if(need===null||h.xp+1e-9<need)break;
  h.xp-=need;if(h.xp<1e-9)h.xp=0;h.level++;h.statPoints=(h.statPoints||0)+1;levels++;
 }
 if(levels)E.note(s,`${h.name} lên cấp ${h.level}, nhận ${levels} điểm thuộc tính (${reason}).`);
 return {base:amount,gained,bonusPercent,levels,level:h.level,xp:h.xp};
}
function castellanExperienceFromResources(cost){
 // SRC17's living, mixed-era wiki gives Castellan EXP as resource value / 3.
 // Unit production has this community formula; applying it to build/research
 // investments is explicitly a C-confidence model, not a dated 2009 formula.
 if(!cost||typeof cost!=='object')throw Error('Chi phí hoạt động không hợp lệ');
 const value=(cost.gold||0)+5*((cost.wood||cost.lumber||0)+(cost.ore||0))+10*((cost.sulfur||0)+(cost.crystal||0));
 if(!Number.isFinite(value)||value<0||value>3e12)throw Error('Giá trị kinh nghiệm Castellan không hợp lệ');
 return value/3;
}
// Fandom Newbie Guide: finished buildings/recruitment are important Fame
// sources. Coefficients here are offline-game balance, not historical ranks.
// Credit occurs on actual completion, never when adding a queue item.
function progressFame(s,cost,kind){
 const factor=kind==='building'?.20:kind==='research'?.08:kind==='training'?.04:0;
 if(!factor)throw Error('Loại thưởng Fame không hợp lệ.');
 const value=E.castellanExperienceFromResources?E.castellanExperienceFromResources(cost)*3:
  (cost.gold||0)+5*((cost.wood||0)+(cost.ore||0))+10*((cost.sulfur||0)+(cost.crystal||0));
 if(!Number.isFinite(value)||value<0||value>3e12)throw Error('Giá trị Fame không hợp lệ.');
 const gain=Math.max(1,Math.ceil(value*factor));
 if(!Number.isSafeInteger(gain)||s.fame+gain>1e12)throw Error('Vượt giới hạn Fame.');
 s.fame+=gain;const next=fameApStats(s.fame);s.apMax=next.max;s.ap=Math.min(s.ap,s.apMax);
 E.note(s,`Hoàn thành ${kind==='building'?'xây dựng':kind==='research'?'nghiên cứu':'huấn luyện'}: +${gain} Fame (cân bằng offline).`);
 return gain;
}
function grantCastellanActivityExperience(s,cost,activity){
 ensure(s);const hero=s.heroes.find(h=>h.id===s.castellan);if(!hero)return null;
 const base=castellanExperienceFromResources(cost);if(base<=0||hero.level>=100)return null;
 const result=grantHeroExperience(s,hero.id,base,`${activity} khi làm Castellan · mô hình SRC17`);
 E.note(s,`${hero.name} nhận ${result.gained.toLocaleString('vi-VN',{maximumFractionDigits:6})} EXP khi làm Castellan sau ${activity} (định giá tài nguyên/3, mô hình C; giá xây/nghiên cứu cũng đang mô phỏng).`);
 return result;
}
function allocateHeroPoint(s,heroId,attribute){
 ensure(s);if(!attrKeys.includes(attribute))throw Error('Thuộc tính không hợp lệ');
 if(s.march||s.battle||heroAway(s,heroId))throw Error('Không thể phân điểm khi tướng đang hành quân hoặc đồn trú');
 const h=s.heroes.find(x=>x.id===heroId);if(!h)throw Error('Không tìm thấy tướng');
 if(!Number.isSafeInteger(h.statPoints)||h.statPoints<1)throw Error('Tướng chưa có điểm thuộc tính chưa dùng');
 h[attribute]=(h[attribute]||0)+1;h.statPoints--;h.spentAttributePoints[attribute]++;
 E.note(s,`${h.name} tăng ${attribute.toUpperCase()} lên ${h[attribute]}.`);return h[attribute];
}
function technologySpell(id){const def=TECHNOLOGIES[id];if(!def)throw Error('Công nghệ không tồn tại');return def.spell}
function techLevel(s,id){return s.spells?.[technologySpell(id)]||0}
function techCost(s,id){return E.spellCost(s,technologySpell(id))}
function techDuration(s,id){const key=technologySpell(id);return Math.ceil(180*Math.pow(1.6,s.spells[key]||0))}
function researchSpell(s,id){
 ensure(s);const spell=E.C.spells[id];if(!spell)throw Error('Không có phép');
 if(s.researchQueue)throw Error('Đang có một nghiên cứu trong hàng đợi.');
 const level=s.spells[id]||0;if(level>=10)throw Error('Đã đạt cấp nghiên cứu tối đa.');
 if((s.buildings.magicTower||0)<level+1)throw Error(`Cần nâng Magic Tower lên cấp ${level+1}.`);
 const cost=E.spellCost(s,id),seconds=Math.ceil(180*Math.pow(1.6,level));E.spend(s,cost);
 s.researchQueue={id:s.serial++,key:id,level:level+1,total:seconds,remaining:seconds};
 E.note(s,`Bắt đầu nghiên cứu ${spell.vi||spell.name} cấp ${level+1}; chi phí và thời gian đang mô phỏng.`);return cost;
}
function researchTechnology(s,id){return researchSpell(s,technologySpell(id))}
function learn(s,id){return researchSpell(s,id)}
function finishResearch(s){
 const q=s.researchQueue;if(!q)return;
 if(!E.C.spells[q.key]||(s.spells[q.key]||0)!==q.level-1)throw Error('Hàng đợi nghiên cứu không khớp cấp phép');
 const cost=E.spellCost(s,q.key),spellName=E.C.spells[q.key].vi||E.C.spells[q.key].name;
 s.spells[q.key]=q.level;s.researchQueue=null;E.note(s,`Hoàn thành ${E.C.spells[q.key].vi||E.C.spells[q.key].name} cấp ${q.level}.`);
 grantCastellanActivityExperience(s,cost,`nghiên cứu ${spellName} cấp ${q.level}`);
 progressFame(s,cost,'research');
}
function unitPrerequisites(s,u){
 const trainingBuilding=troopBuildingKey(s);
 const derivedNonHuman=u.race==='elf'||u.race==='orc'||u.race==='undead';
 const sourceStatus=u.race==='human'?'DERIVED_SCOUT_GATE':derivedNonHuman?'DERIVED_TROOP_BUILDING_TIER':u.tier===2?'MODELED_SCOUT_PROXY':'MODELED_TIER_PROXY';
 const source=u.race==='undead'?(u.tier===2?'SRC02; SRC04; SRC11; SRC22':'SRC02; SRC11'):derivedNonHuman?(u.tier===2?'SRC02; SRC03; SRC04; SRC11; SRC22':'SRC02; SRC03; SRC11'):'SRC02; SRC03; SRC04';
 const base={buildings:{[trainingBuilding]:u.tier},spells:u.tier===2?{scouting:1}:{},sourceStatus,source};
 const r=u.race==='human'?(HUMAN[u.tier]||base):(SECONDARY[u.race]?.[u.id]||base);
 const checks=[];
 for(const [key,level] of Object.entries(r.buildings||{}))checks.push({kind:'building',key,level,actual:s.buildings[key]||0});
 for(const [key,level] of Object.entries(r.spells||{}))checks.push({kind:'spell',key,level,actual:s.spells[key]||0});
 const unmet=checks.filter(x=>x.actual<x.level);
 const confidence=r.sourceStatus==='OBSERVED'?(r.spells?.bootcamp?'A*':'A'):r.sourceStatus==='SECONDARY'?'C':r.sourceStatus.startsWith('MODELED_')?'P':'B';
 return {unitId:u.id,checks,unmet,available:unmet.length===0,confidence,status:r.sourceStatus,source:r.source};
}
function conditionName(c){
 if(c.kind==='building')return `${E.C.buildings[c.key]?.name||c.key} cấp ${c.level}`;
 if(c.key==='bootcamp')return `Bootcamp (Huấn luyện) cấp ${c.level}`;
 if(c.key==='manufacturing')return `Manufacturing (Chế tạo) cấp ${c.level}`;
 return `${E.C.spells[c.key]?.vi||E.C.spells[c.key]?.name||c.key} cấp ${c.level}`;
}
function recruitCost(s,u,count){
 const cost={};for(const k of E.C.keys)cost[k]=(u.cost[k]||0)*count;
 const level=s.spells?.manufacturing||0;cost.gold=Math.ceil(cost.gold*(1-Math.min(.2,level*.02)));return cost;
}
function recruit(s,id,count){
 ensure(s);const u=E.getUnit(s,id);if(!u)throw Error('Không có quân của chủng tộc này');
 if(!Number.isSafeInteger(count)||count<1||count>1000)throw Error('Số lượng không hợp lệ');
 const req=unitPrerequisites(s,u);if(!req.available)throw Error(`Chưa đủ điều kiện ${u.name}: ${conditionName(req.unmet[0])}.`);
 const cost=recruitCost(s,u,count);E.spend(s,cost);
 const time=Math.ceil(u.timeSec*count*(1-Math.min(.2,(s.spells.bootcamp||0)*.02)));
 s.training.push({id:s.serial++,unitId:id,count,remaining:time,total:time});
 E.note(s,`Xếp hàng tuyển ${count} ${u.name}; thời gian cơ sở theo bảng unit 2009.`);return cost;
}
function arenaHealCost(s,unitId,count){
 ensure(s);const u=E.getUnit(s,unitId);
 if(!u||!Number.isSafeInteger(count)||count<1)throw Error('Số quân hồi phục không hợp lệ');
 return Math.ceil(E.unitValue(u)*count/7);
}
function heal(s){
 ensure(s);if((s.buildings.arena||0)<1)throw Error('Cần xây Arena');
 if(s.arenaQueue)throw Error('Arena đang hồi phục một nhóm quân');
 const entry=E.arrUnits(s).map(u=>({u,count:s.wounded[u.id]||0})).find(x=>x.count>0);
 if(!entry)throw Error('Không có quân thương');
 const gold=arenaHealCost(s,entry.u.id,entry.count);
 E.spend(s,{gold});
 const defendingHero=s.heroes.find(h=>h.id===s.castellan),reincarnationLevel=s.race==='undead'&&defendingHero?.equippedSpells?.includes('reincarnation')?(s.heroMagic.reincarnation||0):0;
 const seconds=Math.max(1,Math.ceil(entry.u.timeSec*entry.count/.6*(1-reincarnationLevel*.01)));
 const q={id:s.serial++,unitId:entry.u.id,count:entry.count,total:seconds,remaining:seconds,paidGold:gold,reincarnationLevel};
 s.wounded[entry.u.id]=0;s.arenaQueue=q;
 E.note(s,`Arena bắt đầu hồi phục ${entry.count} ${entry.u.name}: ${gold} vàng; tốc độ 3/5${reincarnationLevel?`, Reincarnation Castellan -${reincarnationLevel}% thời gian`:''}.`);
 return {...q};
}
function progressArena(s,gameSeconds){
 const q=s.arenaQueue;if(!q||gameSeconds<=0)return;
 q.remaining=Math.max(0,q.remaining-gameSeconds);
 if(q.remaining>1e-9)return;
 s.army[q.unitId]=(s.army[q.unitId]||0)+q.count;s.arenaQueue=null;
 E.note(s,`Arena hồi phục xong ${q.count} ${E.getUnit(s,q.unitId).name}; quân đã trở lại thành.`);
}
function moveDuration(s,heroId,path){
 const hero=s.heroes.find(h=>h.id===heroId);if(!hero)throw Error('Không tìm thấy tướng hành quân');
 const speed=E.heroStats?.(s,heroId)?.spd??hero.spd;
 // Expedition formation is preserved after departure, so the slowest survivor
 // influences the return leg exactly as on the outward journey.
 const formation=s.expedition?.formation||[];
 return E.marchDuration(speed,path,E.armyMarchFactor(s,formation));
}
function finishReturn(s){
 const exp=s.expedition;if(!exp||exp.phase!=='returning')throw Error('Không có đội quân đang trở về');
 for(const [id,count] of Object.entries(exp.army)){if(!Number.isSafeInteger(count)||count<0)throw Error('Quân viễn chinh không hợp lệ')}
 if(root.HOG_HG10?.depositArmy)root.HOG_HG10.depositArmy(s,exp.homeCityId||'main',exp.army);else for(const [id,count] of Object.entries(exp.army))s.army[id]=(s.army[id]||0)+count;
 const hero=s.heroes.find(h=>h.id===exp.heroId);s.expedition=null;s.march=null;
 if(hero&&hero.id!==s.castellan)s.activeHero=hero.id;
 E.note(s,`${hero?.name||'Tướng'} trở về thành cùng ${Object.values(exp.army).reduce((a,b)=>a+b,0)} quân còn lại.`);return true;
}
function startReturn(s,fromKey){
 const exp=s.expedition;if(!exp)throw Error('Không có đội quân ngoài thành');
 const path=E.pathfind(fromKey,exp.homeKey);if(!path)throw Error('Không tìm thấy đường trở về thành');
 if(path.length===1){exp.phase='returning';return finishReturn(s)}
 const seconds=moveDuration(s,exp.heroId,path);exp.phase='returning';
 s.march={phase:'return',fromKey,target:exp.homeKey,remaining:seconds,total:seconds,heroId:exp.heroId,path};
 E.note(s,`${s.heroes.find(h=>h.id===exp.heroId).name} rời (${fromKey}) và đang trở về thành; hành quân ${path.length-1} ô.`);return seconds;
}
function recallHero(s,heroId){
 ensure(s);if(s.march||s.battle||s.expedition)throw Error('Tướng khác đang hành quân hoặc giao tranh');
 const index=s.stationedHeroes.findIndex(x=>x.heroId===heroId);if(index<0)throw Error('Tướng này không đồn trú ngoài bản đồ');
 const station=s.stationedHeroes[index],path=E.pathfind(station.key,station.homeKey||'3,4');if(!path)throw Error('Không tìm thấy đường trở về thành');
 s.stationedHeroes.splice(index,1);
 s.expedition={heroId:station.heroId,homeKey:station.homeKey||'3,4',homeCityId:station.homeCityId||'main',army:{...station.army},formation:(station.formation||[]).map(g=>({...g})),phase:'returning'};
 return startReturn(s,station.key);
}
function battleAct(s,action,options){
 ensure(s);const b=s.battle,exp=s.expedition,hero=s.heroes.find(h=>h.id===(exp?.heroId||s.activeHero)),snapshot=hero?{level:hero.level,xp:hero.xp,atk:hero.atk,def:hero.def}:null;
 if(exp)s.activeHero=exp.heroId;
 const reward=b?battleExperienceReward(b):{star:1,baseXp:0,source:'SIM'};if(hero)hero.xp=0;
 let result;try{result=prior.battleAct(s,action,options)}finally{if(hero&&snapshot)Object.assign(hero,snapshot)}
 if(result?.type==='win'&&hero){const label=b?.kind==='treasure'?`kho báu cấp ${reward.star}`:`${reward.star}★`,gained=grantHeroExperience(s,hero.id,reward.baseXp,`thắng trận ${label}`),shown=gained.gained.toLocaleString('vi-VN',{maximumFractionDigits:6});E.note(s,`${hero.name} nhận ${shown} EXP sau chiến thắng ${label} (${reward.source}).`)}
 if(exp&&s.expedition===exp){
  const key=b?.target,tile=E.getTile(key);
  if(result?.type==='win'&&(tile?.kind==='mine'||tile?.kind==='castle')){
   if(s.stationedHeroes.some(x=>x.key===key||x.heroId===exp.heroId))throw Error('Đích mỏ hoặc tướng đã có người đồn trú');
   s.stationedHeroes.push({heroId:exp.heroId,key,homeKey:exp.homeKey,homeCityId:exp.homeCityId||'main',army:{...exp.army},formation:(exp.formation||[]).map(g=>({...g}))});s.expedition=null;
   if(tile.kind==='mine'){const mine=s.mines.find(m=>m.key===key);if(mine)mine.cityId=exp.homeCityId||'main';E.note(s,`${hero?.name||'Tướng'} đóng quân tại mỏ (${key}); dùng lệnh Gọi về để trở lại thành.`)}
   else E.note(s,`${hero?.name||'Tướng'} đóng quân tại thành (${key}); đội quân chiếm thành đã sẵn sàng.`);
  }else if(result?.type==='lose'){
   startReturn(s,key||exp.homeKey);
  }else if(['win','retreat','timeout'].includes(result?.type))startReturn(s,key||exp.homeKey);
 }
 ensure(s);activateParallelMarch(s);return result;
}
function activateParallelMarch(s){
 if(s.expedition||s.march||s.battle||!s.parallelMarches.length)return false;
 let index=s.parallelMarches.findIndex(x=>x.phase==='arrived');if(index<0)index=0;
 const q=s.parallelMarches.splice(index,1)[0];s.activeHero=q.heroId;
 s.expedition={heroId:q.heroId,homeKey:q.homeKey,homeCityId:q.homeCityId,army:{...q.army},formation:q.formation.map(g=>({...g})),phase:q.phase==='arrived'?'battle':'outbound'};
 if(q.phase==='arrived'){
  s.march=null;s.battle=E.makeBattle(s,q.target,1,q.targetKind);s.battleAuto=false;s.battleOrder='attack';
  E.note(s,`${s.heroes.find(h=>h.id===q.heroId)?.name||'Tướng'} đã tới ${q.target}; giao tranh bắt đầu sau khi đạo quân trước kết thúc.`);
 }else s.march={phase:'outbound',target:q.target,...(q.targetKind?{targetKind:q.targetKind}:{}),fromKey:q.homeKey,remaining:q.remaining,total:q.total,heroId:q.heroId,path:q.path.slice()};
 return true;
}
function tick(s,now=Date.now()){
  ensure(s);if(!Number.isFinite(now)||now<=s.lastTick)return;
  const gameSeconds=E.gameElapsedSeconds(s,s.lastTick,now);
  const before={...s.army},priorTavernRound=s.tavern.round;
  s.version=6;try{prior.tick(s,now)}finally{s.version=V}
  for(const q of s.parallelMarches){q.remaining=Math.max(0,q.remaining-gameSeconds);if(q.remaining<=1e-9)q.phase='arrived'}
  if(s.battle&&s.expedition){s.expedition.phase='battle';s.activeHero=s.expedition.heroId}
  if(s.tavern.round!==priorTavernRound){highTavernCommonStats(s);tavernOffers(s)}
  if(s.castellan){let value=0;for(const u of E.arrUnits(s)){const made=Math.max(0,(s.army[u.id]||0)-(before[u.id]||0));if(made)value+=castellanExperienceFromResources(u.cost)*made}if(value>0)grantHeroExperience(s,s.castellan,value,'đào tạo quân khi làm Castellan · công thức cộng đồng')}
  // Fame from completed training only; Arena healing occurs later.
  const recruitedCost={};for(const u of E.arrUnits(s)){
   const made=Math.max(0,(s.army[u.id]||0)-(before[u.id]||0));
   if(made)for(const k of E.C.keys)recruitedCost[k]=(recruitedCost[k]||0)+(u.cost[k]||0)*made;
  }
  if(Object.keys(recruitedCost).length)progressFame(s,recruitedCost,'training');
  progressArena(s,gameSeconds);
  if(s.march?.phase==='return'&&s.march.remaining<=1e-9)finishReturn(s);
  activateParallelMarch(s);
  const q=s.researchQueue;if(q){q.remaining=Math.max(0,q.remaining-gameSeconds);if(q.remaining<=1e-9)finishResearch(s)}
  return s;
}
function startMarch(s,key,targetKind){
  ensure(s);
  const tile=E.getTile(key);
  // A captured mine is an owned resource node, not another neutral encounter.
  // Reject before AP/army reservation: re-fighting it previously appended a
  // second mine receipt and could multiply hourly production.
  if(targetKind!=='treasure'&&tile?.kind==='mine'&&s.mines?.some(m=>m.key===key))throw Error('Mỏ này đã thuộc quyền sở hữu; không thể chiếm lại để nhân đôi sản lượng.');
  if(targetKind!=='treasure'&&tile?.kind==='mine'&&(s.mines?.length||0)>=mineLimit(s))throw Error('Đã đạt hạn mức '+mineLimit(s)+' mỏ theo danh vọng '+E.fmt(s.fame)+'.');
  if(heroAway(s,s.activeHero))throw Error('Tướng đang đồn trú ngoài bản đồ');
  const selected=(s.formation?.length?s.formation:E.activeArmy(s).sort((a,b)=>b.tier-a.tier).slice(0,7).map(u=>({unitId:u.id,count:s.army[u.id]}))).filter(g=>g?.unitId&&g.count>0);
  const army={};for(const g of selected){const u=E.getUnit(s,g.unitId);if(!u||!Number.isSafeInteger(g.count)||g.count<1)throw Error('Đội hình hành quân không hợp lệ');army[u.id]=(army[u.id]||0)+g.count}
  if(!Object.keys(army).length)throw Error('Không có quân được bố trí');
  for(const [id,count] of Object.entries(army))if(count>(s.army[id]||0))throw Error('Đội hình vượt số quân hiện có trong thành');
  const heroId=s.activeHero,formation=selected.map(g=>({unitId:g.unitId,count:g.count}));
  if(heroAway(s,heroId)||heroId===s.castellan)throw Error('Tướng không sẵn sàng để xuất chinh');
  if(heroesAwayCount(s)>=3)throw Error('Đã có 3 tướng cùng xuất chinh; chờ một đạo quân trở về trước.');
  if(s.parallelMarches.some(q=>q.target===key)||s.march?.target===key||s.battle?.target===key)throw Error('Đã có đạo quân hướng tới mục tiêu này.');
  const parallel=!!(s.expedition||s.march||s.battle);
  if(parallel&&(!s.expedition||!s.march||s.march.phase!=='outbound'||s.battle))throw Error('Chỉ có thể điều thêm quân khi đạo hiện tại đang trên đường đi.');
  const old=parallel?{march:s.march,expedition:s.expedition,battle:s.battle,battleAuto:s.battleAuto,battleOrder:s.battleOrder}:null;
  if(parallel){s.march=null;s.expedition=null;s.battle=null}
  try{prior.startMarch(s,key,targetKind)}catch(err){if(old){s.march=old.march;s.expedition=old.expedition;s.battle=old.battle;s.battleAuto=old.battleAuto;s.battleOrder=old.battleOrder}throw err}
  const started={...s.march,path:s.march.path.slice()};
  if(old){s.march=old.march;s.expedition=old.expedition;s.battle=old.battle;s.battleAuto=old.battleAuto;s.battleOrder=old.battleOrder}
  for(const [id,count] of Object.entries(army))s.army[id]-=count;
  const homeKey=s.activeCastleKey||'3,4',homeCityId=s.activeCityId||'main';
  if(parallel){
   s.parallelMarches.push({heroId,target:key,...(started.targetKind?{targetKind:started.targetKind}:{}),homeKey,homeCityId,army,formation,phase:'outbound',remaining:started.remaining,total:started.total,path:started.path});
   s.formation=[];E.note(s,`${s.heroes.find(h=>h.id===heroId)?.name||'Tướng'} cùng xuất chinh; ${heroesAwayCount(s)}/3 tướng đang ở ngoài thành.`);return s.parallelMarches[s.parallelMarches.length-1];
  }
  s.expedition={heroId,homeKey,homeCityId,army,formation,phase:'outbound'};
  s.march.phase='outbound';s.march.fromKey=homeKey;s.formation=[];
  return s.march;
}
function appoint(s,id){ensure(s);if(heroAway(s,id))throw Error('Tướng đang hành quân hoặc đồn trú ngoài bản đồ');return prior.appoint(s,id)}
function selectHero(s,id){ensure(s);if(heroAway(s,id))throw Error('Tướng đang hành quân hoặc đồn trú ngoài bản đồ');if(!s.heroes.some(h=>h.id===id))throw Error('Không có tướng');if(s.castellan===id)throw Error('Castellan trấn thủ thành');if(s.battle||s.march&&s.march.phase!=='outbound')throw Error('Không thể đổi tướng đang giao tranh hoặc trở về');s.activeHero=id;return id}
function valid(s){
 if(!s||s.version!==V||!prior.valid({...s,version:6}))return false;
 if(!Array.isArray(s.stationedHeroes)||!Array.isArray(s.parallelMarches)||!Object.prototype.hasOwnProperty.call(s,'expedition'))return false;
 const armyValid=pool=>obj(pool)&&Object.entries(pool).every(([id,n])=>Object.values(E.C.units).some(list=>list.some(u=>u.id===id))&&Number.isSafeInteger(n)&&n>=0&&n<=1e9);
 const stationedIds=new Set();for(const x of s.stationedHeroes){if(!obj(x)||!Number.isSafeInteger(x.heroId)||!s.heroes.some(h=>h.id===x.heroId)||stationedIds.has(x.heroId)||!E.getTile(x.key)||!armyValid(x.army)||!Object.values(x.army).some(n=>n>0)||!Array.isArray(x.formation))return false;stationedIds.add(x.heroId)}
 if(s.expedition!==null){const x=s.expedition;if(!obj(x)||!Number.isSafeInteger(x.heroId)||!s.heroes.some(h=>h.id===x.heroId)||x.heroId===s.castellan||!E.getTile(x.homeKey)||!armyValid(x.army)||(!Object.values(x.army).some(n=>n>0)&&x.phase!=='returning')||!Array.isArray(x.formation)||!['outbound','battle','returning'].includes(x.phase))return false}
 if(s.march&&(!['outbound','return'].includes(s.march.phase)||!s.expedition||s.march.heroId!==s.expedition.heroId))return false;
 const deployedIds=new Set([...stationedIds]);if(s.expedition){if(deployedIds.has(s.expedition.heroId))return false;deployedIds.add(s.expedition.heroId)}
 for(const q of s.parallelMarches){const qt=E.getTile(q?.target),validTarget=q?.targetKind==='treasure'?!!E.getTreasureCamp(q.target):!q?.targetKind&&!!qt&&['mine','npc','castle'].includes(qt.kind);if(!obj(q)||!Number.isSafeInteger(q.heroId)||!s.heroes.some(h=>h.id===q.heroId)||q.heroId===s.castellan||deployedIds.has(q.heroId)||!['outbound','arrived'].includes(q.phase)||!validTarget||!E.getTile(q.homeKey)||typeof q.homeCityId!=='string'||!armyValid(q.army)||!Object.values(q.army).some(n=>n>0)||!Array.isArray(q.formation)||!Array.isArray(q.path)||q.path[0]!==q.homeKey||q.path.at(-1)!==q.target||!Number.isFinite(q.total)||q.total<=0||!Number.isFinite(q.remaining)||q.remaining<0||q.remaining>q.total)return false;deployedIds.add(q.heroId)}
 if(deployedIds.size>3)return false;
 if(!Array.isArray(s.treasureCleared)||new Set(s.treasureCleared).size!==s.treasureCleared.length||s.treasureCleared.some(key=>!E.getTreasureCamp(key)))return false;
 if(s.march?.targetKind!==undefined&&(s.march.targetKind!=='treasure'||!E.getTreasureCamp(s.march.target)))return false;
 if(!obj(s.spells)||Object.keys(s.spells).some(k=>!E.C.spells[k]))return false;
 for(const [id,level] of Object.entries(s.spells))if(!Number.isSafeInteger(level)||level<0||level>10)return false;
 if(!Object.prototype.hasOwnProperty.call(s.buildings,'blacksmith')||!Number.isSafeInteger(s.buildings.graveyard)||s.buildings.graveyard<0)return false;
 for(const h of s.heroes){
  if(!Number.isSafeInteger(h.statPoints)||h.statPoints<0||h.statPoints>1e8||!obj(h.spentAttributePoints))return false;
  if(attrKeys.some(k=>!Number.isSafeInteger(h.spentAttributePoints[k])||h.spentAttributePoints[k]<0||h.spentAttributePoints[k]>1e8))return false;
 }
 if(s.researchQueue!==null){
  const q=s.researchQueue;
  if(!(obj(q)&&E.C.spells[q.key]&&Number.isSafeInteger(q.id)&&q.id>0&&Number.isSafeInteger(q.level)&&q.level===(s.spells[q.key]||0)+1&&q.level<=10&&Number.isFinite(q.total)&&q.total>0&&Number.isFinite(q.remaining)&&q.remaining>=0&&q.remaining<=q.total))return false;
 }
 if(s.arenaQueue===null)return true;
 const a=s.arenaQueue;
 return !!(obj(a)&&E.getUnit(s,a.unitId)&&Number.isSafeInteger(a.id)&&a.id>0&&Number.isSafeInteger(a.count)&&a.count>0&&Number.isSafeInteger(a.paidGold)&&a.paidGold>=0&&Number.isSafeInteger(a.reincarnationLevel)&&a.reincarnationLevel>=0&&a.reincarnationLevel<=10&&Number.isFinite(a.total)&&a.total>0&&Number.isFinite(a.remaining)&&a.remaining>=0&&a.remaining<=a.total);
}
function strict(s){return valid(s)&&prior.strict({...s,version:6})}
function parse(text){
 if(typeof text!=='string'||text.length>2_000_000)throw Error('Tệp sao lưu vượt giới hạn 2 MB');
 let raw;try{raw=JSON.parse(text)}catch{throw Error('Tệp không phải JSON hợp lệ')}
 const src=raw?.format==='heoofgaia-save-1'?raw.state:raw;let s;
 if(src?.version===V){s=E.clone(src);ensure(s);if(!strict(s))throw Error('Save HG08 không hợp lệ')}
 else if(src&&Number.isInteger(src.version)&&src.version>=2&&src.version<=6){s=prior.parse(JSON.stringify(src));s.version=V;ensure(s);if(!strict(s))throw Error('Chuyển save HG02–HG07 thất bại')}
 else throw Error('Không hỗ trợ phiên bản save');
 return s;
}
function serialize(s){if(!strict(s))throw Error('Save HG08 không hợp lệ');return JSON.stringify({format:'heoofgaia-save-1',exportedAt:new Date().toISOString(),state:s},null,2)}
function make(...args){const s=prior.make(...args);s.version=V;return ensure(s)}
function hireCandidate(s,id){
 ensure(s);
 if(s.buildings.tavern<1)throw Error('Cần Tavern');
 const cap=heroCountLimit(s.fame);
 if(s.heroes.length>=cap)throw Error(`Đạt giới hạn ${cap} tướng theo danh vọng hiện tại`);
 const offer=s.tavern.offers.find(h=>h.id===id);
 if(!offer)throw Error('Ứng viên không còn trong Tavern');
 E.spend(s,{gold:offer.gold});
 const heroId=Math.max(0,...s.heroes.map(h=>h.id))+1;
 s.heroes.push({id:heroId,name:offer.name,level:1,xp:0,atk:offer.atk,def:offer.def,spd:offer.spd,int:offer.int,quality:offer.quality});
 s.tavern.offers=s.tavern.offers.filter(h=>h.id!==id);
 ensure(s);E.note(s,`Chiêu mộ ${offer.name} (${offer.quality}) từ Tavern; giới hạn hiện tại ${cap} tướng theo danh vọng · giá tuyển vẫn mô phỏng.`);
 return heroId;
}
if(Array.isArray(E.buildOrder)){for(const key of ['blacksmith','magicPool','natureTower','beastPen','darkHall','soulTower','graveyard'])if(!E.buildOrder.includes(key))E.buildOrder.push(key)}
E.make=make;E.hireCandidate=hireCandidate;E.refreshTavern=refreshTavern;E.tick=tick;E.recruit=recruit;E.heal=heal;E.battleAct=battleAct;E.learn=learn;E.startMarch=startMarch;E.appoint=appoint;E.selectHero=selectHero;E.recallHero=recallHero;E.finishReturn=finishReturn;E.heroAway=heroAway;E.valid=valid;
Object.assign(E,{V,SAVE_KEY:KEY,PREV_SAVE_KEY:'heoofgaia_hg_only_v06',TECHNOLOGIES,HUMAN_TROOP_REQUIREMENTS:HUMAN,FAME_MINE_CAPS,FAME_HERO_CAPS,FAME_AP,MINE_HOURLY,mineLimit,heroCountLimit,fameApStats,
 ensure08:ensure,experienceToNext:expToNext,heroTowerExperienceBonus,NPC_BATTLE_XP,battleExperienceReward,grantHeroExperience,allocateHeroPoint,heroNameColor:nameColor,heroStatColor:statColor,cityBuildOrder,
 buildingUpgradeGate,buildingUpgradeCapException,
technologyLevel:techLevel,technologyCost:techCost,technologyDuration:techDuration,researchTechnology,researchSpell,castellanExperienceFromResources,grantCastellanActivityExperience,progressFame,
 troopPrerequisites:unitPrerequisites,troopBuildingKey,recruitCost,arenaHealCost,strictSave:strict,parseSave:parse,serializeSave:serialize});
root.HOG_HG08={version:V,saveKey:KEY,status:'evidence-labelled-progression'};
})(typeof globalThis!=='undefined'?globalThis:this);
