/* HG-08: evidence-labelled troop gates, canonical spell research and hero progression.
 * The original client/server code and commercial art are not included. Queue prices,
 * durations, tavern generation and combat XP are explicitly simulated.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==6)throw Error('HG08 requires HG06/HG07');
const prior={make:E.make,tick:E.tick,valid:E.valid,strict:E.strictSave,parse:E.parseSave,serialize:E.serializeSave,
 recruit:E.recruit,battleAct:E.battleAct,hire:E.hireCandidate,refreshTavern:E.refreshTavern,learn:E.learn};
const V=7,KEY='heoofgaia_hg_only_v07';
const XP_TO_NEXT=[150,369,653,990,1371,1793,2252,2745,3270,3824,4407,5018,5654,6315,7001,7710,8441,9194,9968];
// These are labels for the historical recruitment table, not a second level store.
const TECHNOLOGIES=Object.freeze({
 training:{name:'Bootcamp',vi:'Huấn luyện (Bootcamp)',spell:'bootcamp',max:10,source:'SRC04; SRC19; SRC20',status:'OBSERVED_REQUIREMENT; NAME_MAPPING_DERIVED; COST_AND_TIME_SIMULATED'},
 manufacturing:{name:'Manufacturing',vi:'Chế tạo (Manufacturing)',spell:'manufacturing',max:10,source:'SRC04; SRC19; SRC20',status:'OBSERVED_REQUIREMENT; COST_AND_TIME_SIMULATED'}
});
const HUMAN={
 1:{buildings:{hall:1,barracks:1},spells:{},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 2:{buildings:{barracks:2},spells:{scouting:1},sourceStatus:'PARTIAL_SCOUT_HALL_GATE',source:'SRC03; SRC04'},
 3:{buildings:{hall:3,barracks:3},spells:{bootcamp:1},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 4:{buildings:{hall:4,barracks:4,blacksmith:1},spells:{manufacturing:1},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 5:{buildings:{hall:5,barracks:5,stables:1},spells:{manufacturing:3},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 6:{buildings:{hall:6,barracks:6},spells:{bootcamp:5},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 7:{buildings:{hall:7,barracks:7,stables:4,blacksmith:4},spells:{bootcamp:6},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 8:{buildings:{hall:8,barracks:8,blacksmith:6},spells:{manufacturing:7},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 9:{buildings:{hall:9,barracks:9,stables:7,blacksmith:8},spells:{manufacturing:8},sourceStatus:'OBSERVED',source:'SRC19; SRC20'},
 10:{buildings:{hall:10,barracks:10,stables:9,blacksmith:10},spells:{manufacturing:9,bootcamp:9},sourceStatus:'OBSERVED',source:'SRC19; SRC20'}
};
const attrKeys=['atk','def','spd','int'];
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function ensure(s){
 E.ensure06(s);
 for(const key of ['blacksmith','magicPool','natureTower','beastPen','darkHall','soulTower'])if(!Number.isSafeInteger(s.buildings[key]))s.buildings[key]=0;
 if(!obj(s.spells))s.spells={};
 if(!Object.prototype.hasOwnProperty.call(s,'researchQueue'))s.researchQueue=null;
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
function highTavernCommonStats(s){
 if((s.buildings.tavern||0)<10)return;
 const raceIndex=Object.keys(E.C.races).indexOf(s.race),round=s.tavern.round||0;
 for(let i=0;i<s.tavern.offers.length;i++){
  const offer=s.tavern.offers[i],seed=(round*104729+(i+1)*7919+(raceIndex+1)*1543)>>>0;
  for(let j=0;j<4;j++)offer[attrKeys[j]]=20+((seed+((j+1)*(j+17)*7919))%31);
  offer.level=1;enrichOffer(offer);
 }
}
function refreshTavern(s){prior.refreshTavern(s);highTavernCommonStats(s);tavernOffers(s);return s.tavern.offers}
function cityBuildOrder(s){
 const unique=['magicPool','natureTower','beastPen','darkHall','soulTower'];
 const map={human:['stables','blacksmith'],elf:['magicPool','natureTower'],orc:['beastPen','blacksmith'],undead:['darkHall','soulTower']};
 return E.buildOrder.filter(key=>!unique.includes(key)&&key!=='blacksmith'&&key!=='stables').concat(map[s.race]||[]);
}
function expToNext(level){
 if(!Number.isSafeInteger(level)||level<1||level>=100)return null;
 if(level<=19)return XP_TO_NEXT[level-1];
 return 120*(level*level-300);
}
function grantHeroExperience(s,heroId,amount,reason='gameplay'){
 ensure(s);
 if(!Number.isFinite(amount)||amount<0||amount>1e12)throw Error('Kinh nghiệm không hợp lệ');
 const h=s.heroes.find(x=>x.id===heroId);if(!h)throw Error('Không tìm thấy tướng nhận kinh nghiệm');
 if(h.level>=100||amount===0)return {gained:0,levels:0,level:h.level,xp:h.xp};
 h.xp+=amount;let levels=0;
 while(h.level<100){const need=expToNext(h.level);if(need===null||h.xp+1e-9<need)break;
  h.xp-=need;if(h.xp<1e-9)h.xp=0;h.level++;h.statPoints=(h.statPoints||0)+1;levels++;
 }
 if(levels)E.note(s,`${h.name} lên cấp ${h.level}, nhận ${levels} điểm thuộc tính (${reason}).`);
 return {gained:amount,levels,level:h.level,xp:h.xp};
}
function allocateHeroPoint(s,heroId,attribute){
 ensure(s);if(!attrKeys.includes(attribute))throw Error('Thuộc tính không hợp lệ');
 if(s.march||s.battle)throw Error('Không thể phân điểm khi tướng đang hành quân hoặc chiến đấu');
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
 s.spells[q.key]=q.level;s.researchQueue=null;E.note(s,`Hoàn thành ${E.C.spells[q.key].vi||E.C.spells[q.key].name} cấp ${q.level}.`);
}
function unitPrerequisites(s,u){
 const base={buildings:{barracks:u.tier},spells:u.tier===2?{scouting:1}:{},sourceStatus:u.tier===2?'DERIVED_SCOUT_GATE':'PARTIAL',source:u.tier===2?'SRC02; SRC03; SRC04':'SRC02; SRC03'};
 const r=u.race==='human'?(HUMAN[u.tier]||base):base;
 const checks=[];
 for(const [key,level] of Object.entries(r.buildings||{}))checks.push({kind:'building',key,level,actual:s.buildings[key]||0});
 for(const [key,level] of Object.entries(r.spells||{}))checks.push({kind:'spell',key,level,actual:s.spells[key]||0});
 const unmet=checks.filter(x=>x.actual<x.level);
 const confidence=r.sourceStatus==='OBSERVED'?(r.spells?.bootcamp?'A*':'A'):'B';
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
function battleAct(s,action){
 const b=s.battle,hero=s.heroes.find(h=>h.id===s.activeHero),snapshot=hero?{level:hero.level,xp:hero.xp,atk:hero.atk,def:hero.def}:null;
 const simulatedReward=b?30*b.level:0;
 if(hero)hero.xp=0;
 let result;try{result=prior.battleAct(s,action)}finally{if(hero&&snapshot)Object.assign(hero,snapshot)}
 if(result?.type==='win'&&hero)grantHeroExperience(s,hero.id,simulatedReward,'thắng trận · XP chiến đấu đang mô phỏng');
 return result;
}
function tick(s,now=Date.now()){
 ensure(s);if(!Number.isFinite(now)||now<=s.lastTick)return;
 const elapsed=Math.min((now-s.lastTick)/1000,8*3600),gameSeconds=elapsed*(s.speed===1?1:60);
 const before={...s.army},priorTavernRound=s.tavern.round;
 s.version=6;try{prior.tick(s,now)}finally{s.version=V}
 if(s.tavern.round!==priorTavernRound){highTavernCommonStats(s);tavernOffers(s)}
 if(s.castellan){
  let value=0;for(const u of E.arrUnits(s)){const made=Math.max(0,(s.army[u.id]||0)-(before[u.id]||0));if(made)value+=E.unitValue(u)*made/3}
  if(value>0)grantHeroExperience(s,s.castellan,value,'đào tạo quân khi làm Castellan · công thức cộng đồng');
 }
 const q=s.researchQueue;if(q){q.remaining=Math.max(0,q.remaining-gameSeconds);if(q.remaining<=1e-9)finishResearch(s)}
 return s;
}
function valid(s){
 if(!s||s.version!==V||!prior.valid({...s,version:6}))return false;
 if(!obj(s.spells)||Object.keys(s.spells).some(k=>!E.C.spells[k]))return false;
 for(const [id,level] of Object.entries(s.spells))if(!Number.isSafeInteger(level)||level<0||level>10)return false;
 if(!Object.prototype.hasOwnProperty.call(s.buildings,'blacksmith'))return false;
 for(const h of s.heroes){
  if(!Number.isSafeInteger(h.statPoints)||h.statPoints<0||h.statPoints>1e8||!obj(h.spentAttributePoints))return false;
  if(attrKeys.some(k=>!Number.isSafeInteger(h.spentAttributePoints[k])||h.spentAttributePoints[k]<0||h.spentAttributePoints[k]>1e8))return false;
 }
 if(s.researchQueue===null)return true;
 const q=s.researchQueue;
 return !!(obj(q)&&E.C.spells[q.key]&&Number.isSafeInteger(q.id)&&q.id>0&&Number.isSafeInteger(q.level)&&q.level===(s.spells[q.key]||0)+1&&q.level<=10&&Number.isFinite(q.total)&&q.total>0&&Number.isFinite(q.remaining)&&q.remaining>=0&&q.remaining<=q.total);
}
function strict(s){return valid(s)&&prior.strict({...s,version:6})}
function parse(text){
 if(typeof text!=='string'||text.length>2_000_000)throw Error('Tệp sao lưu vượt giới hạn 2 MB');
 let raw;try{raw=JSON.parse(text)}catch{throw Error('Tệp không phải JSON hợp lệ')}
 const src=raw?.format==='heoofgaia-save-1'?raw.state:raw;let s;
 if(src?.version===V){s=E.clone(src);if(!strict(s))throw Error('Save HG08 không hợp lệ')}
 else if(src&&Number.isInteger(src.version)&&src.version>=2&&src.version<=6){s=prior.parse(JSON.stringify(src));s.version=V;ensure(s);if(!strict(s))throw Error('Chuyển save HG02–HG07 thất bại')}
 else throw Error('Không hỗ trợ phiên bản save');
 return s;
}
function serialize(s){if(!strict(s))throw Error('Save HG08 không hợp lệ');return JSON.stringify({format:'heoofgaia-save-1',exportedAt:new Date().toISOString(),state:s},null,2)}
function make(...args){const s=prior.make(...args);s.version=V;return ensure(s)}
function hireCandidate(s,id){const result=prior.hire(s,id);ensure(s);return result}
if(Array.isArray(E.buildOrder)){for(const key of ['blacksmith','magicPool','natureTower','beastPen','darkHall','soulTower'])if(!E.buildOrder.includes(key))E.buildOrder.push(key)}
E.make=make;E.hireCandidate=hireCandidate;E.refreshTavern=refreshTavern;E.tick=tick;E.recruit=recruit;E.battleAct=battleAct;E.learn=learn;E.valid=valid;
Object.assign(E,{V,SAVE_KEY:KEY,PREV_SAVE_KEY:'heoofgaia_hg_only_v06',TECHNOLOGIES,HUMAN_TROOP_REQUIREMENTS:HUMAN,
 ensure08:ensure,experienceToNext:expToNext,grantHeroExperience,allocateHeroPoint,heroNameColor:nameColor,heroStatColor:statColor,cityBuildOrder,
 technologyLevel:techLevel,technologyCost:techCost,technologyDuration:techDuration,researchTechnology,researchSpell,
 troopPrerequisites:unitPrerequisites,recruitCost,strictSave:strict,parseSave:parse,serializeSave:serialize});
root.HOG_HG08={version:V,saveKey:KEY,status:'evidence-labelled-progression'};
})(typeof globalThis!=='undefined'?globalThis:this);
