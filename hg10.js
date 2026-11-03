/* HG-10: separate owned-city economies, race-specific build queues and returns.
 * Source-backed: a Fame rank controls castle limits; capturing a secondary city
 * unlocks that city's race troop/research systems; returning heroes go to origin.
 * Unverified captured-city starting stock/buildings and castle AP price are explicit models.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==7||!E.ensure08)throw Error('HG10 requires the v07 HG08 engine');
const prior={make:E.make,tick:E.tick,valid:E.valid,strict:E.strictSave,parse:E.parseSave,serialize:E.serializeSave,startMarch:E.startMarch,battleAct:E.battleAct,rate:E.rate,heroStats:E.heroStats,claim:E.claim,appoint:E.appoint};
const CITY_FIELDS=['race','res','buildings','army','wounded','woundFraction','spells','training','formation','buildingQueue','researchQueue','arenaQueue','tavern','castellan'];
const GLOBAL_DURING_CITY_TICK=['lastTick','ap','apMax','fame','mines','cleared','treasureCleared','worldVisits','heroBuffs','dailyTaskState','china2009DailyTaskState','cityTransports','expedition','parallelMarches','stationedHeroes','march','battle','battleAuto','battleOrder','battleTarget','activeHero','heroes','log','serial','speed','created','inventory','equipment','heroMagic','nextItem','lootWins','claimedQuests','version','selected'];
const CITY_LIMITS=Object.freeze([[0,1],[5800,2],[80000,3],[300000,4],[700000,5],[1000000,6]]);
const WORLD_BUILDINGS=E.WORLD_BUILDINGS||[];
const WORLD_BUILDING_BY_KEY=new Map(WORLD_BUILDINGS.map(b=>[`${b.x},${b.y}`,b]));
function clone(v){return JSON.parse(JSON.stringify(v))}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k)}
function worldDayKey(now=Date.now()){if(!Number.isFinite(now))throw Error('Thời gian ghé thăm không hợp lệ.');return new Date(now).toISOString().slice(0,10)}
const DAILY_TASKS=Object.freeze([
 Object.freeze({id:'getting_started',name:'Getting Started',nameVi:'Khởi đầu',stars:1,fame:0,gold:500,ap:7,objective:'Engage and destroy any 1 Star NPC.',source:'SRC52/SRC53',confidence:'C'}),
 Object.freeze({id:'clean_up_remnants',name:'Clean Up Remnants',nameVi:'Dọn sạch tàn quân',race:'undead',stars:3,fame:2200,gold:800,ap:9,rewardUnitId:'undead_8',rewardUnits:1,objective:'Engage and destroy any 3 Star NPC.',source:'SRC30; SRC61',confidence:'C / mixed-edition'})
]);
// The dated 2009 Chinese task profile is kept separate from the living Fandom/Kongregate list.
const CHINA_2009_DAILY_TASKS=Object.freeze([
 Object.freeze({id:'recruit_archers',name:'招募弓箭手',nameVi:'Tuyển mộ cung thủ',unitId:'human_3',required:20,rewardUnitId:'human_3',rewardUnits:10,rewardWood:100,source:'SRC54',confidence:'B'})
]);
function china2009FameStage(s){return E.fameApStats(s.fame).threshold}
function freshChina2009TaskBoard(day,fameStage){return {day,fameStage,accepted:[],claimed:[],progress:{recruit_archers:0}}}
function syncChina2009TaskBoard(s,now=s.lastTick){
 const day=worldDayKey(Number.isFinite(now)?now:Date.now()),fameStage=china2009FameStage(s);
 if(s.china2009DailyTaskState===undefined||s.china2009DailyTaskState===null){s.china2009DailyTaskState=freshChina2009TaskBoard(day,fameStage);return s.china2009DailyTaskState}
 const board=s.china2009DailyTaskState;if(typeof board!=='object'||Array.isArray(board))throw Error('Dữ liệu nhiệm vụ Trung Quốc 2009 không hợp lệ.');
 if(board.day!==day){s.china2009DailyTaskState=freshChina2009TaskBoard(day,fameStage);return s.china2009DailyTaskState}
 if(own(board,'fameStage')&&!E.FAME_AP.some(([threshold])=>threshold===board.fameStage))throw Error('Bậc danh vọng của nhiệm vụ Trung Quốc 2009 không hợp lệ.');
 // SRC61 says every Fame-rank promotion restarts the daily tasks. Legacy v07
 // boards lack fameStage; preserve their current progress once while migrating.
 if(!own(board,'fameStage'))board.fameStage=fameStage;
 else if(board.fameStage!==fameStage){s.china2009DailyTaskState=freshChina2009TaskBoard(day,fameStage);E.note(s,`Danh vọng lên bậc ${fameStage.toLocaleString('vi-VN')}: nhiệm vụ ngày Trung Quốc 2009 được làm mới (SRC61).`);return s.china2009DailyTaskState}
 if(!board.progress)board.progress={recruit_archers:0};return board;
}
function syncDailyTaskBoard(s,now=s.lastTick){
 const day=worldDayKey(Number.isFinite(now)?now:Date.now());
 if(!s.dailyTaskState){s.dailyTaskState={day,accepted:[],claimed:[],progress:{},heroTask:{completed:0,active:null}};return s.dailyTaskState}
 // International/community sources do not say that accepted work is erased.
 // The separate China 2009 board follows SRC61's Fame-stage reset in its own sync.
 if(s.dailyTaskState.day!==day)s.dailyTaskState={day,accepted:[],claimed:[],progress:{},heroTask:{completed:0,active:null}};
 if(own(s.dailyTaskState,'fameRank'))delete s.dailyTaskState.fameRank; // tolerate unreleased prototype saves
 if(!own(s.dailyTaskState,'progress'))s.dailyTaskState.progress={}; // old v07 boards have no per-day win ledger
 if(!own(s.dailyTaskState,'heroTask'))s.dailyTaskState.heroTask={completed:0,active:null}; // legacy v07
 return s.dailyTaskState;
}
// Fandom Hero Tasks: 20 daily missions, XP 1200..3100, +100 each.
// The star difficulty curve is a playable offline design rather than server RNG.
const HERO_TASK_MAX=20;
function heroTaskStars(completed){return completed<8?1:completed<15?2:3}
function heroTaskExperience(completed){return 1200+100*completed}
function validHeroTask(s,b){
 if(!b||typeof b!=='object'||Array.isArray(b)||!Number.isSafeInteger(b.completed)||b.completed<0||b.completed>HERO_TASK_MAX)return false;
 if(b.active===null)return true;
 const q=b.active;
 return b.completed<HERO_TASK_MAX&&q&&typeof q==='object'&&!Array.isArray(q)&&s.heroes.some(h=>h.id===q.heroId)&&q.stars===heroTaskStars(b.completed)&&typeof q.ready==='boolean';
}
function hasVisitedWorldBuilding(s,key,now=Date.now()){return s?.worldVisits?.[key]===worldDayKey(now)}
function cityLimit(fame){let n=1;for(const [threshold,count] of CITY_LIMITS){if(fame>=threshold)n=count;else break}return n}
function currentLocal(s){const data={};for(const k of CITY_FIELDS)data[k]=clone(s[k]);return data}
function storeCurrent(s){const c=s.cities?.find(x=>x.id===s.activeCityId);if(c)c.local=currentLocal(s)}
function applyCity(s,c){for(const k of CITY_FIELDS)s[k]=clone(c.local[k]);s.activeCityId=c.id;s.activeCastleKey=c.key}
function ensure(s){
 E.ensure08(s);
 if(s.battleReports===undefined)s.battleReports=[];
 if(!Array.isArray(s.battleReports))throw Error('Lịch sử chiến báo không hợp lệ.');
 for(const r of s.battleReports)if(r&&typeof r==='object'&&r.items===undefined)r.items=null;
 if(s.worldVisits===undefined)s.worldVisits={};
 if(!s.worldVisits||typeof s.worldVisits!=='object'||Array.isArray(s.worldVisits))throw Error('Dữ liệu thăm công trình thế giới không hợp lệ.');
 if(s.heroBuffs===undefined)s.heroBuffs=[];
 if(!Array.isArray(s.heroBuffs))throw Error('Dữ liệu hiệu ứng tướng không hợp lệ.');
 if(s.cityTransports===undefined)s.cityTransports=[];
 if(!Array.isArray(s.cityTransports))throw Error('Dữ liệu đoàn vận chuyển không hợp lệ.');
 syncDailyTaskBoard(s,s.lastTick);
 syncChina2009TaskBoard(s,s.lastTick);
 if(!Array.isArray(s.cities)||!s.cities.length){s.cities=[{id:'main',key:'3,4',name:'Thành Gaia',race:s.race,main:true,sourceStatus:'LEGACY_MAIN',local:currentLocal(s)}];s.activeCityId='main'}
 if(typeof s.activeCityId!=='string')throw Error('Save HG-10 thiếu thành đang mở.');
 const rootCity=s.cities.find(c=>c.id===s.activeCityId);
 if(!rootCity||!rootCity.local||typeof rootCity.local!=='object')throw Error('Save HG-10 tham chiếu thành không tồn tại.');
 if(rootCity.race!==s.race||rootCity.local.race!==s.race)throw Error('Dữ liệu chủng tộc của thành đang mở không nhất quán.');
 if(typeof s.activeCastleKey==='string'&&s.activeCastleKey!==rootCity.key)throw Error('Save HG-10 có tọa độ thành đang mở không khớp.');
 for(const c of s.cities)if(!c||!c.local||typeof c.local!=='object'||CITY_FIELDS.some(k=>!own(c.local,k)))throw Error('Save HG-10 thiếu dữ liệu thành riêng.');
 // Root HG-07 fields stay authoritative for the active city when upgrading a legacy v07 save.
 rootCity.local=currentLocal(s);s.activeCastleKey=rootCity.key;
 for(const g of s.stationedHeroes||[])if(!g.homeCityId)g.homeCityId='main';
 if(s.expedition&&!s.expedition.homeCityId)s.expedition.homeCityId='main';
 for(const g of s.parallelMarches||[])if(!g.homeCityId)g.homeCityId='main';
 return s;
}
function activeCity(s){ensure(s);return s.cities.find(c=>c.id===s.activeCityId)}
function cityForKey(s,key){ensure(s);return s.cities.find(c=>c.key===key)||null}
function switchCity(s,id){
 ensure(s);if(s.march||s.battle||s.expedition||s.parallelMarches?.length)throw Error('Hãy chờ hành quân, trận chiến hoặc lệnh trở về kết thúc trước khi chuyển thành.');
 const target=s.cities.find(c=>c.id===id);if(!target)throw Error('Không tìm thấy thành này.');if(target.id===s.activeCityId)return target;
 storeCurrent(s);applyCity(s,target);E.note(s,`Đã chuyển tới ${target.name} (${target.key}), chủng tộc ${E.C.races[target.race].name}.`);return target;
}
function depositArmy(s,cityId,army){
 ensure(s);const c=s.cities.find(x=>x.id===cityId)||s.cities.find(x=>x.main);if(!c)throw Error('Không tìm thấy thành nhận quân trở về.');
 if(c.id===s.activeCityId){for(const [id,n] of Object.entries(army))s.army[id]=(s.army[id]||0)+n;return}
 for(const [id,n] of Object.entries(army)){
  if(!E.C.units[c.race]?.some(u=>u.id===id))throw Error(`Quân ${id} không thuộc chủng tộc của thành gốc.`);
  c.local.army[id]=(c.local.army[id]||0)+n;
 }
}
function transportUnit(unitId){for(const units of Object.values(E.C.units||{})){const unit=units.find(u=>u.id===unitId);if(unit)return unit}return null}
function transportWeight(resources){return resources.gold+5*(resources.wood+resources.ore)+10*(resources.sulfur+resources.crystal)}
function withCityLocal(s,city,run){
 const activeId=s.activeCityId,activeKey=s.activeCastleKey,activeData=currentLocal(s);applyCity(s,city);
 try{return run()}finally{
  city.local=currentLocal(s);
  if(activeId!==city.id){for(const k of CITY_FIELDS)s[k]=clone(activeData[k]);s.activeCityId=activeId;s.activeCastleKey=activeKey;}
 }
}
function canDeliverCityTransport(s,shipment){
 const city=s.cities.find(c=>c.id===shipment.targetCityId);if(!city)return false;
 return withCityLocal(s,city,()=>{const cap=E.limits(s);return E.C.keys.every(k=>(s.res[k]||0)+shipment.resources[k]<=cap[k]+1e-7)})
}
function deliverCityTransport(s,shipment){
 if(!canDeliverCityTransport(s,shipment)){shipment.phase='holding';shipment.remaining=0;E.note(s,`Đoàn tiếp tế ${shipment.id} đã tới ${s.cities.find(c=>c.id===shipment.targetCityId)?.name||'thành đích'}, nhưng kho chưa đủ chỗ; hàng và quân được giữ nguyên đến khi có chỗ.`);return false}
 const target=s.cities.find(c=>c.id===shipment.targetCityId);withCityLocal(s,target,()=>E.add(s,shipment.resources));
 shipment.phase='return';shipment.remaining=shipment.returnTotal;
 E.note(s,`Đã giao đủ tài nguyên tới ${target.name}; đoàn ${shipment.count} ${transportUnit(shipment.unitId)?.name||shipment.unitId} đang quay về.`);return true;
}
function startCityTransport(s,targetCityId,unitId,count,resources){
 ensure(s);const source=activeCity(s),target=s.cities.find(c=>c.id===targetCityId);
 if(!target||target.id===source.id)throw Error('Hãy chọn một thành khác đang thuộc quyền của bạn.');
 if(s.march||s.battle||s.expedition||s.parallelMarches?.length)throw Error('Hãy chờ các đạo quân đang hành quân hoặc giao tranh trước khi gửi tiếp tế.');
 if(!Array.isArray(s.cityTransports)||s.cityTransports.length>=20)throw Error('Tối đa 20 đoàn tiếp tế đang hoạt động.');
 const unit=transportUnit(unitId),n=Number(count);
 if(!unit||unit.race!==source.race)throw Error('Binh chủng vận chuyển phải thuộc chủng tộc của thành xuất phát.');
 if(!Number.isSafeInteger(n)||n<1||n>(s.army[unitId]||0))throw Error('Số quân vận chuyển vượt quá quân hiện có ở thành xuất phát.');
 const cargo={};for(const k of E.C.keys){const v=Number(resources?.[k]??0);if(!Number.isSafeInteger(v)||v<0)throw Error(`Số ${E.C.resource[k].label} gửi phải là số nguyên không âm.`);cargo[k]=v;}
 if(!E.C.keys.some(k=>cargo[k]>0))throw Error('Hãy chọn ít nhất một loại tài nguyên để gửi.');
 const capacity=unit.load*n*10,weight=transportWeight(cargo);if(weight>capacity)throw Error(`Quá tải: sức chở ${E.fmt(capacity)} đơn vị vàng tương đương, hàng đang chọn ${E.fmt(weight)}.`);
 for(const k of E.C.keys)if(cargo[k]>(s.res[k]||0))throw Error(`Không đủ ${E.C.resource[k].label} tại thành xuất phát.`);
 if(s.ap<20)throw Error('Mỗi chuyến vận chuyển tốn 20 AP theo hướng dẫn Trung Quốc 2009.');
 const path=E.pathfind(source.key,target.key);if(!path||path.length<2)throw Error('Không tìm được tuyến đường giữa hai thành.');
 const duration=Math.max(40,20+(path.length-1)*19);if(!Number.isSafeInteger(s.serial)||s.serial<1||s.serial>=Number.MAX_SAFE_INTEGER)throw Error('Bộ đếm save không hợp lệ.');
 s.army[unitId]-=n;for(const k of E.C.keys)s.res[k]-=cargo[k];s.ap-=20;
 const shipment={id:`convoy-${s.serial++}`,sourceCityId:source.id,targetCityId:target.id,fromKey:source.key,toKey:target.key,unitId,count:n,resources:cargo,weight,capacity,path:path.slice(),phase:'outbound',total:duration,remaining:duration,returnTotal:duration};
 s.cityTransports.push(shipment);E.note(s,`Đoàn ${n} ${unit.name} xuất phát tới ${target.name}, mang ${E.fmt(weight)}/${E.fmt(capacity)} sức chở vàng tương đương; -20 AP.`);return clone(shipment);
}
function advanceCityTransports(s,elapsedGame){
 if(!Array.isArray(s.cityTransports)||!s.cityTransports.length)return;
 for(const shipment of [...s.cityTransports]){
  if(shipment.phase==='outbound'||shipment.phase==='return')shipment.remaining=Math.max(0,shipment.remaining-elapsedGame);
  if(shipment.phase==='holding'){deliverCityTransport(s,shipment);continue}
  if(shipment.remaining>1e-8)continue;
  if(shipment.phase==='outbound'){deliverCityTransport(s,shipment);continue}
  if(shipment.phase==='return'){
   const source=s.cities.find(c=>c.id===shipment.sourceCityId),unit=transportUnit(shipment.unitId);
   if(!source||!unit)continue;
   withCityLocal(s,source,()=>{s.army[shipment.unitId]=(s.army[shipment.unitId]||0)+shipment.count});
   s.cityTransports=s.cityTransports.filter(q=>q.id!==shipment.id);E.note(s,`Đoàn tiếp tế ${shipment.id} đã trở về ${source.name} cùng ${shipment.count} ${unit.name}.`);
  }
 }
}
function seedCapturedCity(s,tile){
 if(s.cities.some(c=>c.key===tile.key))throw Error('Thành này đã thuộc quyền sở hữu.');
 if(s.cities.length>=cityLimit(s.fame))throw Error('Danh vọng hiện tại chưa mở thêm ô thành.');
 const seed=prior.make(tile.race,s.lastTick);E.ensure08(seed);
 for(const k of E.C.keys)seed.res[k]=0;
 for(const id of Object.keys(seed.army))seed.army[id]=0;
 seed.wounded={};seed.woundFraction={};seed.formation=[];seed.mines=[];seed.cleared=[];
 seed.training=[];seed.buildingQueue=null;seed.researchQueue=null;seed.arenaQueue=null;seed.spells={};seed.castellan=null;
 seed.buildings.hall=1;seed.buildings.warehouse=1;
 const id=`city-${tile.key.replace(',','-')}`;
 const city={id,key:tile.key,name:tile.value||`Thành ${E.C.races[tile.race].name}`,race:tile.race,main:false,capturedAt:s.lastTick,sourceStatus:'MODELED_STARTING_CITY',local:{}};
 city.local={race:tile.race,res:clone(seed.res),buildings:clone(seed.buildings),army:clone(seed.army),wounded:clone(seed.wounded),woundFraction:clone(seed.woundFraction),spells:clone(seed.spells),training:clone(seed.training),formation:clone(seed.formation),buildingQueue:seed.buildingQueue,researchQueue:seed.researchQueue,arenaQueue:seed.arenaQueue,tavern:clone(seed.tavern),castellan:null};
 s.cities.push(city);E.note(s,`${city.name} (${tile.key}) đã được chiếm. Thành khác tộc mở nhà tuyển quân và phép theo dữ liệu riêng; kho và cấp công trình ban đầu là mô hình do tư liệu thiếu.`);return city;
}
function startMarch(s,key,targetKind){
 ensure(s);const tile=E.getTile(key),owned=cityForKey(s,key);
 if(targetKind!=='treasure'&&tile?.kind==='castle'){
  if(owned)throw Error('Thành này đã thuộc quyền của bạn.');
  if(s.cities.length>=cityLimit(s.fame))throw Error(`Cần thêm danh vọng để chiếm thành: ${s.cities.length}/${cityLimit(s.fame)} ô thành.`);
 }
 const hero=s.heroes.find(h=>h.id===s.activeHero),oldSpeed=hero?.spd,boosted=hero?heroStats(s,hero.id)?.spd:oldSpeed;
 try{if(hero)hero.spd=boosted;return prior.startMarch(s,key,targetKind)}finally{if(hero)hero.spd=oldSpeed}
}
function battleAct(s,action,options){
 ensure(s);const tile=s.battle&&E.getTile(s.battle.target),homeCityId=s.expedition?.homeCityId||s.activeCityId;
 const battle=s.battle,beforeResources={...s.res},beforeFame=s.fame,beforeItems=new Set(s.inventory.map(i=>i.uid));
 const hero=s.heroes.find(h=>h.id===(s.expedition?.heroId||s.activeHero)),old=hero?{atk:hero.atk,def:hero.def}:null;
 const beforeXp=hero?reportHeroXp(hero):0;
 if(hero&&s.heroBuffs.some(q=>q.heroId===hero.id&&q.stat==='atk'&&q.remaining>0))hero.atk*=1.1;
 if(hero&&s.heroBuffs.some(q=>q.heroId===hero.id&&q.stat==='def'&&q.remaining>0))hero.def*=1.1;
 let result;try{result=prior.battleAct(s,action,options)}finally{if(hero&&old)Object.assign(hero,old)}
 if(result?.type==='win'&&tile?.kind==='castle'&&!cityForKey(s,tile.key))seedCapturedCity(s,tile);
 if(result?.type==='win'&&tile?.kind==='mine'){
  const mine=s.mines.find(m=>m.key===tile.key);if(mine)mine.cityId=homeCityId||'main';
 }
 syncChina2009TaskBoard(s,s.lastTick);
 if(result?.type==='win'&&tile?.kind==='npc'){
  const board=syncDailyTaskBoard(s,s.lastTick),mainRace=s.cities.find(c=>c.main)?.race||s.race;
  for(const task of DAILY_TASKS)if(task.stars===tile.level&&(!task.race||task.race===mainRace)&&board.accepted.includes(task.id)&&!board.claimed.includes(task.id))board.progress[task.id]=1;
  const quest=board.heroTask.active;
  if(quest&&!quest.ready&&quest.heroId===hero?.id&&quest.stars===tile.level)quest.ready=true;
 }
 if(battle&&['win','lose','timeout','retreat'].includes(result?.type)){
  const groups=new Map();for(const u of battle.allies){const row=groups.get(u.unitId)||{unitId:u.unitId,name:u.name,initial:0,survived:0};row.initial+=u.initial;row.survived+=u.count;groups.set(u.unitId,row)}
  const allies=[...groups.values()].map(row=>({...row,lost:row.initial-row.survived,wounded:battle.woundedByUnit===undefined?null:(battle.woundedByUnit[row.unitId]||0)}));
  let reportId;do{reportId=`battle-${s.serial++}`}while(s.battleReports.some(r=>r.id===reportId));
  const report={id:reportId,outcome:result.type,target:battle.target,name:String(battle.kind==='mine'?'Mỏ '+E.C.resource[tile.value].label:battle.name||tile?.value||battle.target),kind:battle.kind,turns:battle.turn-1,completedAt:s.lastTick,homeCityId,heroId:hero?.id||s.activeHero,heroName:hero?.name||'Tướng',heroXp:hero?Math.max(0,reportHeroXp(hero)-beforeXp):0,fame:Math.max(0,s.fame-beforeFame),resources:Object.fromEntries(E.C.keys.map(k=>[k,Math.max(0,s.res[k]-beforeResources[k])])),items:s.inventory.filter(i=>!beforeItems.has(i.uid)).map(i=>({uid:i.uid,itemId:i.itemId,name:E.ITEMS[i.itemId].name})),allies,enemies:battle.enemies.map(u=>({name:u.name,initial:u.initial,survived:u.count,lost:u.initial-u.count})),disposition:s.stationedHeroes.some(g=>g.heroId===hero?.id&&g.key===battle.target)?'stationed':s.march?.heroId===hero?.id&&s.march.phase==='return'?'returning':'home'};
  s.battleReports.unshift(report);s.battleReports=s.battleReports.slice(0,30);result.reportId=report.id;
 }
 storeCurrent(s);return result;
}
function reportHeroXp(hero){let total=hero.xp;for(let level=1;level<hero.level;level++)total+=E.experienceToNext(level);return total}
function validBattleReports(s){
 if(!Array.isArray(s.battleReports)||s.battleReports.length>30)return false;
 const nonnegative=n=>Number.isFinite(n)&&n>=0&&n<=1e12,integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12,text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
 const ids=new Set();for(const r of s.battleReports){
  if(!r||!text(r.id,48)||!/^battle-[1-9]\d*$/.test(r.id)||ids.has(r.id)||!['win','lose','timeout','retreat'].includes(r.outcome)||!E.getTile(r.target)||!text(r.name,120)||!['npc','mine','castle','treasure'].includes(r.kind)||!integer(r.turns)||r.turns<1||r.turns>71||!Number.isFinite(r.completedAt)||r.completedAt<0||r.completedAt>1e15||!s.cities.some(c=>c.id===r.homeCityId)||!s.heroes.some(h=>h.id===r.heroId)||!text(r.heroName,120)||!nonnegative(r.heroXp)||!nonnegative(r.fame)||!['home','returning','stationed'].includes(r.disposition)||!r.resources||E.C.keys.some(k=>!nonnegative(r.resources[k]))||!Array.isArray(r.allies)||r.allies.length>7||!Array.isArray(r.enemies)||r.enemies.length>20)return false;
  if(r.items!==null&&(!Array.isArray(r.items)||r.items.length>100||new Set(r.items.map(i=>i?.uid)).size!==r.items.length||r.items.some(i=>!i||!integer(i.uid)||!E.ITEMS[i.itemId]||!text(i.name,120))))return false;
  for(const row of [...r.allies,...r.enemies])if(!row||!text(row.name,120)||![row.initial,row.survived,row.lost].every(integer)||row.initial!==row.survived+row.lost)return false;
  for(const row of r.allies)if(!Object.values(E.C.units).flat().some(u=>u.id===row.unitId)||(row.wounded!==null&&(!integer(row.wounded)||row.wounded>row.lost)))return false;
  ids.add(r.id);
 }
 const ledger=s.battle?.woundedByUnit;if(ledger!==undefined&&(!ledger||typeof ledger!=='object'||Array.isArray(ledger)||Object.entries(ledger).some(([id,n])=>!Object.values(E.C.units).flat().some(u=>u.id===id)||(!integer(n)||n>(s.battle.allies||[]).filter(u=>u.unitId===id).reduce((total,u)=>total+u.initial-u.count,0)))))return false;
 return true;
}
function tickOtherCity(s,city,from,now){
 const activeId=s.activeCityId,activeData=currentLocal(s),globals={};
 for(const k of GLOBAL_DURING_CITY_TICK)globals[k]=k==='parallelMarches'?clone(s[k]):s[k];
 applyCity(s,city);s.lastTick=from;s.march=null;s.battle=null;
 try{timedTick(s,from,now);city.local=currentLocal(s)}
 finally{
  for(const k of GLOBAL_DURING_CITY_TICK)s[k]=globals[k];
  s.activeCityId=activeId;s.activeCastleKey=s.cities.find(c=>c.id===activeId)?.key||'3,4';
  for(const k of CITY_FIELDS)s[k]=clone(activeData[k]);s.version=7;
 }
}
function tick(s,now=Date.now()){
 ensure(s);if(!Number.isFinite(now)||now<=s.lastTick)return s;
 const from=s.lastTick,activeId=s.activeCityId,gameSeconds=E.gameElapsedSeconds(s,from,now);timedTick(s,from,now);storeCurrent(s);
 for(const c of [...s.cities])if(c.id!==activeId)tickOtherCity(s,c,from,now);
 // The active city's tick is the single source of world time/AP. Restore its live root after offline city work.
 const active=s.cities.find(c=>c.id===activeId);if(active)applyCity(s,active);advanceCityTransports(s,gameSeconds);storeCurrent(s);s.lastTick=now;s.version=7;syncDailyTaskBoard(s,now);syncChina2009TaskBoard(s,now);return s;
}
function strict(s){
 if(!s||s.version!==7||!prior.strict(s))return false;
 if(!validBattleReports(s))return false;
 if(s.battle?.lastEvents!==undefined){
  const b=s.battle,ids=new Set([...b.allies,...b.enemies].map(u=>u.id)),events=b.lastEvents,seen=new Set(),cell=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.y)&&p.x>=0&&p.x<E.BATTLE_GRID.cols&&p.y>=0&&p.y<E.BATTLE_GRID.rows;
  if(!Array.isArray(events)||events.length>ids.size)return false;
  for(const e of events){
   if(!e||!ids.has(e.actorId)||seen.has(e.actorId)||!cell(e.from)||!cell(e.to)||(e.targetId!==null&&!ids.has(e.targetId))||!Number.isFinite(e.damage)||e.damage<0||typeof e.death!=='boolean'||(e.death&&e.damage<=0)||!Array.isArray(e.path)||e.path.length>108||('order'in e&&!['attack','advance','defend','focus','retreat','move'].includes(e.order))||('casualties'in e&&(!Number.isSafeInteger(e.casualties)||e.casualties<0||e.casualties>1e8)))return false;
   let previous=e.from;for(const p of e.path){if(!cell(p)||Math.abs(p.x-previous.x)+Math.abs(p.y-previous.y)!==1)return false;previous=p}
   if(previous.x!==e.to.x||previous.y!==e.to.y)return false;seen.add(e.actorId);
  }
 }
 if(!['international','china2009'].includes(s.spellEdition))return false;
 if(!s.worldVisits||typeof s.worldVisits!=='object'||Array.isArray(s.worldVisits)||!Array.isArray(s.heroBuffs))return false;
 const china=s.china2009DailyTaskState,chinaIds=new Set(CHINA_2009_DAILY_TASKS.map(t=>t.id));
 if(!china||typeof china!=='object'||Array.isArray(china)||typeof china.day!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(china.day)||(own(china,'fameStage')&&!E.FAME_AP.some(([threshold])=>threshold===china.fameStage))||!Array.isArray(china.accepted)||!Array.isArray(china.claimed)||new Set(china.accepted).size!==china.accepted.length||new Set(china.claimed).size!==china.claimed.length||china.accepted.some(id=>!chinaIds.has(id))||china.claimed.some(id=>!chinaIds.has(id)||!china.accepted.includes(id))||!china.progress||typeof china.progress!=='object'||Array.isArray(china.progress)||Object.keys(china.progress).some(id=>!chinaIds.has(id))||CHINA_2009_DAILY_TASKS.some(t=>!Number.isSafeInteger(china.progress[t.id])||china.progress[t.id]<0||china.progress[t.id]>t.required))return false;
 const board=s.dailyTaskState,knownTaskIds=new Set(DAILY_TASKS.map(t=>t.id));
 if(!board||typeof board!=='object'||Array.isArray(board)||typeof board.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(board.day)||!Array.isArray(board.accepted)||!Array.isArray(board.claimed)||new Set(board.accepted).size!==board.accepted.length||new Set(board.claimed).size!==board.claimed.length||board.accepted.some(id=>!knownTaskIds.has(id))||board.claimed.some(id=>!knownTaskIds.has(id)||!board.accepted.includes(id))||!board.progress||typeof board.progress!=='object'||Array.isArray(board.progress)||Object.entries(board.progress).some(([id,n])=>!knownTaskIds.has(id)||!board.accepted.includes(id)||!Number.isSafeInteger(n)||n<0||n>1)||!validHeroTask(s,board.heroTask))return false;
 for(const [key,day] of Object.entries(s.worldVisits))if(!WORLD_BUILDING_BY_KEY.has(key)||typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 for(const b of s.heroBuffs)if(!b||!s.heroes.some(h=>h.id===b.heroId)||!['atk','def','spd','int'].includes(b.stat)||!Number.isFinite(b.remaining)||b.remaining<=0||b.remaining>7200||!WORLD_BUILDING_BY_KEY.has(b.sourceKey))return false;
 if(!Array.isArray(s.cities)||s.cities.length<1||s.cities.length>6||typeof s.activeCityId!=='string')return false;
 const ids=new Set(),keys=new Set();let mainCount=0;
 for(const c of s.cities){
  if(!c||typeof c.id!=='string'||!c.id||c.id.length>48||ids.has(c.id)||typeof c.key!=='string'||keys.has(c.key)||!E.getTile(c.key)||E.getTile(c.key).kind!=='castle'||!E.C.races[c.race]||typeof c.name!=='string'||c.name.length>80||!c.local||typeof c.local!=='object')return false;
  ids.add(c.id);keys.add(c.key);if(c.main)mainCount++;
  if(c.local.race!==c.race||CITY_FIELDS.some(k=>!own(c.local,k)))return false;
  const probe={...s,...clone(c.local),version:7,activeCityId:c.id,activeCastleKey:c.key};
  if(!prior.strict(probe))return false;
 }
 const main=s.cities.find(c=>c.main),active=s.cities.find(c=>c.id===s.activeCityId);
 if(mainCount!==1||!main||main.id!=='main'||main.key!=='3,4'||!active||s.activeCastleKey!==active.key)return false;
 if(!Array.isArray(s.cityTransports)||s.cityTransports.length>20)return false;
 const transportIds=new Set();for(const q of s.cityTransports){
  const source=s.cities.find(c=>c.id===q?.sourceCityId),target=s.cities.find(c=>c.id===q?.targetCityId),unit=transportUnit(q?.unitId),cargo=q?.resources;
  if(!q||typeof q.id!=='string'||!/^convoy-[1-9]\d*$/.test(q.id)||transportIds.has(q.id)||!source||!target||source.id===target.id||q.fromKey!==source.key||q.toKey!==target.key||!unit||unit.race!==source.race||!Number.isSafeInteger(q.count)||q.count<1||q.count>1_000_000_000||!Array.isArray(q.path)||q.path.length<2||q.path[0]!==source.key||q.path[q.path.length-1]!==target.key||q.path.length!==E.pathfind(source.key,target.key)?.length||q.path.some(key=>!E.getTile(key))||!['outbound','holding','return'].includes(q.phase)||!Number.isFinite(q.total)||q.total<40||q.total>200000||!Number.isFinite(q.returnTotal)||q.returnTotal!==q.total||!Number.isFinite(q.remaining)||q.remaining<0||q.remaining>q.total||!cargo||typeof cargo!=='object'||Array.isArray(cargo)||Object.keys(cargo).some(k=>!E.C.keys.includes(k))||E.C.keys.some(k=>!Number.isSafeInteger(cargo[k])||cargo[k]<0)||E.C.keys.every(k=>cargo[k]===0)||!Number.isSafeInteger(q.weight)||q.weight!==transportWeight(cargo)||q.weight>unit.load*q.count*10||q.capacity!==unit.load*q.count*10)return false;
  if(q.phase==='holding'&&q.remaining!==0)return false;transportIds.add(q.id);
 }
 if(!Array.isArray(s.parallelMarches)||s.parallelMarches.some(g=>!s.cities.some(c=>c.id===g.homeCityId)))return false;
 return true;
}
function valid(s){return strict(s)}
function parse(raw){
 if(typeof raw!=='string'||raw.length>2_000_000)throw Error('Save vượt giới hạn 2 MB');
 const s=prior.parse(raw);ensure(s);if(!strict(s))throw Error('Save HG-10 không hợp lệ');return s;
}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG-10 không hợp lệ');return prior.serialize(s)}
function make(...args){const s=prior.make(...args);return ensure(s)}
function rate(s){ensure(s);return withCastellanWorldBuff(s,()=>prior.rate(s))}
function heroStats(s,heroId=s.activeHero){
 const stats=prior.heroStats?.(s,heroId);if(!stats)return stats;
 for(const buff of s.heroBuffs||[])if(buff.heroId===heroId&&buff.remaining>0&&['atk','def','spd','int'].includes(buff.stat))stats[buff.stat]*=1.1;
 return stats;
}
function withCastellanWorldBuff(s,run){
 const hero=s.heroes.find(h=>h.id===s.castellan);if(!hero)return run();
 const old=hero.int,boosted=heroStats(s,hero.id)?.int??old;
 try{hero.int=boosted;return run()}finally{hero.int=old}
}
function timedTick(s,from,now){
 const wallMs=Math.min(E.MAX_OFFLINE_WALL_SECONDS*1000,Math.max(0,now-from)),end=from+wallMs;let cursor=from;
 while(cursor<end){
  const speed=s.speed===1?1:60,expiry=Math.min(Infinity,...(s.heroBuffs||[]).map(b=>Math.max(0,b.remaining||0)));
  const next=Number.isFinite(expiry)?Math.min(end,cursor+Math.max(.001,expiry/speed*1000)):end;
  const trainingBefore=Array.isArray(s.training)?s.training.map(q=>({unitId:q.unitId,count:q.count,remaining:q.remaining})):[];
  withCastellanWorldBuff(s,()=>prior.tick(s,next));
  if(s.activeCityId==='main'&&s.race==='human'){
   const board=syncChina2009TaskBoard(s,cursor),availableGame=E.gameElapsedSeconds(s,cursor,next);let cumulative=0;
   for(const q of trainingBefore){cumulative+=q.remaining;if(q.unitId!=='human_3'||cumulative>availableGame+1e-8)continue;
    const completedAt=cursor+cumulative/speed*1000;
    if(board.day===worldDayKey(completedAt)&&board.accepted.includes('recruit_archers')&&!board.claimed.includes('recruit_archers'))board.progress.recruit_archers=Math.min(20,board.progress.recruit_archers+q.count);
   }
  }
  const elapsed=E.gameElapsedSeconds(s,cursor,next);
  for(const b of s.heroBuffs)b.remaining=Math.max(0,b.remaining-elapsed);
  s.heroBuffs=s.heroBuffs.filter(b=>b.remaining>1e-9);cursor=next;
 }
 // Preserve the core's 24-hour offline policy when a tick is split at buff expiry.
 if(s.lastTick<now)s.lastTick=now;
}
function visitWorldBuilding(s,key,now=Date.now()){
 ensure(s);const def=WORLD_BUILDING_BY_KEY.get(key),tile=E.getTile(key);
 if(!def||tile?.kind!=='visit')throw Error('Không có công trình đặc biệt ở vị trí này.');
 if(!Number.isFinite(now))throw Error('Thời gian ghé thăm không hợp lệ.');
 if(s.fame<(def.fame||0))throw Error(`Cần ${E.fmt(def.fame)} danh vọng để ghé ${def.name}.`);
 if(s.march||s.battle||s.expedition||s.parallelMarches?.length)throw Error('Chờ các đạo quân đang hành quân hoặc giao tranh trước khi ghé công trình.');
 const hero=s.heroes.find(h=>h.id===s.activeHero);if(!hero||hero.id===s.castellan||E.heroAway?.(s,hero.id))throw Error('Hãy chọn một tướng sẵn sàng ngoài nhiệm vụ đồn trú.');
 const day=worldDayKey(now);if(s.worldVisits[key]===day)throw Error('Công trình này đã được thăm hôm nay.');
 let reward=null,boost=null;
 if(def.effect==='random-resource'){
  const outcomes=[{wood:400},{ore:400},{sulfur:200},{crystal:200}],seed=(Math.imul(s.serial||1,1664525)+1013904223)>>>0;
  reward=outcomes[seed%outcomes.length];s.serial++;
 }else if(def.effect==='gold-2000')reward={gold:2000};
 else {const match=/^(atk|def|spd|int)-10$/.exec(def.effect||'');if(!match||def.duration!==7200)throw Error('Hiệu ứng công trình chưa được cấu hình.');boost={heroId:hero.id,stat:match[1],remaining:7200,sourceKey:key};}
 const before=reward?{...s.res}:null;
 if(reward)E.add(s,reward);
 if(boost){s.heroBuffs=s.heroBuffs.filter(b=>!(b.heroId===boost.heroId&&b.stat===boost.stat));s.heroBuffs.push(boost)}
 s.worldVisits[key]=day;
 // Resource ticks can leave fractional balances. Avoid displaying a full
 // 2,000 reward as 1,999 due solely to binary floating-point subtraction.
 const gain=reward?Object.fromEntries(Object.entries(reward).map(([k,v])=>[k,Math.floor((s.res[k]||0)-(before[k]||0)+1e-7)])):null;
 E.note(s,reward?`Đã ghé ${def.name}; nhận ${Object.entries(gain).map(([k,v])=>`+${E.fmt(v)} ${E.C.resource[k].label}`).join(', ')}.`:`${hero.name} ghé ${def.name}; ${({atk:'Tấn công',def:'Phòng thủ',spd:'Tốc độ',int:'Tri thức'})[boost.stat]} +10% trong 2 giờ game.`);
 return {building:def.id,key,heroId:hero.id,reward:gain,buff:boost?{...boost}:null,day};
}
function dailyTaskProgress(s,task){return s.dailyTaskState?.progress?.[task.id]||0}
function dailyTasks(s,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);const board=s.dailyTaskState,mainRace=s.cities.find(c=>c.main)?.race||s.race;
 return DAILY_TASKS.filter(task=>!task.race||task.race===mainRace).map(task=>{const progress=Math.min(1,dailyTaskProgress(s,task));return {...task,progress,available:s.fame>=task.fame,accepted:board.accepted.includes(task.id),claimed:board.claimed.includes(task.id),ready:progress>=1}});
}
function acceptDailyTask(s,id,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);if(!activeCity(s).main)throw Error('Hãy nhận nhiệm vụ tại thành chính.');
 const task=DAILY_TASKS.find(t=>t.id===id);if(!task)throw Error('Nhiệm vụ hằng ngày không hợp lệ.');
 if(task.race&&s.cities.find(c=>c.main)?.race!==task.race)throw Error('Nhiệm vụ này không áp dụng cho chủng tộc thành chính.');
 if(s.fame<task.fame)throw Error(`Cần ${E.fmt(task.fame)} danh vọng để nhận nhiệm vụ.`);
 const board=s.dailyTaskState;if(board.accepted.includes(id)||board.claimed.includes(id))throw Error('Nhiệm vụ này đã được nhận hôm nay.');
 board.accepted.push(id);E.note(s,`Đã nhận nhiệm vụ hằng ngày “${task.name}”: ${task.objective}`);return true;
}
function claimDailyTask(s,id,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);if(!activeCity(s).main)throw Error('Hãy nhận thưởng nhiệm vụ tại thành chính.');
 const task=DAILY_TASKS.find(t=>t.id===id);if(!task)throw Error('Nhiệm vụ hằng ngày không hợp lệ.');
 if(task.race&&s.cities.find(c=>c.main)?.race!==task.race)throw Error('Nhiệm vụ này không áp dụng cho chủng tộc thành chính.');
 const board=s.dailyTaskState;if(!board.accepted.includes(id))throw Error('Hãy nhận nhiệm vụ trước khi nhận thưởng.');
 if(board.claimed.includes(id))throw Error('Phần thưởng nhiệm vụ hôm nay đã nhận.');
 if(dailyTaskProgress(s,task)<1)throw Error('Chưa thắng trại NPC cấp sao yêu cầu.');
 if(s.res.gold+task.gold>E.limits(s).gold+1e-7)throw Error('Kho vàng không đủ chỗ; hãy dùng vàng rồi nhận thưởng.');
 const owned=task.rewardUnitId?(s.army[task.rewardUnitId]||0):0;
 if(task.rewardUnitId&&(!E.C.units[task.race||s.race]?.some(u=>u.id===task.rewardUnitId)||!Number.isSafeInteger(owned)||owned>1_000_000_000-task.rewardUnits))throw Error('Phần thưởng quân không hợp lệ hoặc vượt giới hạn save an toàn.');
 const beforeAp=s.ap;E.add(s,{gold:task.gold});if(task.rewardUnitId)s.army[task.rewardUnitId]=owned+task.rewardUnits;s.ap=Math.min(s.apMax,s.ap+task.ap);board.claimed.push(id);const apAward=s.ap-beforeAp;
 const unitText=task.rewardUnitId?`, +${task.rewardUnits} ${E.getUnit(s,task.rewardUnitId).name}`:'';
 E.note(s,`Hoàn thành nhiệm vụ “${task.name}”: +${task.gold} vàng${unitText}, +${apAward} AP thực nhận (tối đa ${task.ap}; AP không vượt trần).`);
 return {gold:task.gold,ap:apAward,...(task.rewardUnitId?{unitId:task.rewardUnitId,units:task.rewardUnits}:{})};
}
function heroTaskStatus(s,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);
 const board=s.dailyTaskState.heroTask,q=board.active,hero=s.heroes.find(h=>h.id===(q?.heroId||s.activeHero));
 return {completed:board.completed,max:HERO_TASK_MAX,active:q?{...q}:null,heroId:hero?.id||null,heroName:hero?.name||'Chưa có tướng',
  stars:q?.stars??heroTaskStars(board.completed),exp:board.completed<HERO_TASK_MAX?heroTaskExperience(board.completed):0,
  available:board.completed<HERO_TASK_MAX,
  canAccept:board.completed<HERO_TASK_MAX&&!q&&!!hero&&hero.id!==s.castellan&&!E.heroAway?.(s,hero.id)};
}
function acceptHeroTask(s,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);
 const board=s.dailyTaskState.heroTask,hero=s.heroes.find(h=>h.id===s.activeHero);
 if(board.completed>=HERO_TASK_MAX)throw Error('Hôm nay đã hoàn thành 20 nhiệm vụ tướng.');
 if(board.active)throw Error('Hãy hoàn thành nhiệm vụ tướng đang nhận trước.');
 if(!hero||hero.id===s.castellan||E.heroAway?.(s,hero.id))throw Error('Hãy chọn một tướng đang sẵn sàng để nhận nhiệm vụ.');
 board.active={heroId:hero.id,stars:heroTaskStars(board.completed),ready:false};
 E.note(s,`Nhiệm vụ tướng ${board.completed+1}/20: ${hero.name} đánh thắng NPC ${board.active.stars}★ để nhận ${heroTaskExperience(board.completed)} EXP cơ bản.`);
 return heroTaskStatus(s,now);
}
function claimHeroTask(s,now=Date.now()){
 ensure(s);syncDailyTaskBoard(s,now);
 const board=s.dailyTaskState.heroTask,task=board.active;
 if(!task||!task.ready)throw Error('Nhiệm vụ tướng chưa hoàn thành: cần thắng NPC đúng cấp sao bằng tướng đã nhận.');
 const hero=s.heroes.find(h=>h.id===task.heroId);
 if(!hero)throw Error('Tướng nhận nhiệm vụ không còn tồn tại.');
 const baseXp=heroTaskExperience(board.completed),ordinal=board.completed+1;
 const reward=E.grantHeroExperience(s,hero.id,baseXp,'Hero Task · Fandom');
 board.completed++;board.active=null;
 E.note(s,`${hero.name} nhận ${reward.gained.toLocaleString('vi-VN',{maximumFractionDigits:3})} EXP cho nhiệm vụ tướng ${ordinal}/20.`);
 return {heroId:hero.id,task:ordinal,baseXp,gained:reward.gained,completed:board.completed};
}
function china2009DailyTasks(s,now=Date.now()){
 ensure(s);syncChina2009TaskBoard(s,now);const main=s.cities.find(c=>c.main);if(main?.race!=='human')return [];
 const board=s.china2009DailyTaskState;
 return CHINA_2009_DAILY_TASKS.map(task=>({...task,fameStage:board.fameStage,progress:Math.min(task.required,board.progress[task.id]||0),accepted:board.accepted.includes(task.id),claimed:board.claimed.includes(task.id),ready:(board.progress[task.id]||0)>=task.required}));
}
function acceptChina2009DailyTask(s,id,now=Date.now()){
 ensure(s);syncChina2009TaskBoard(s,now);if(!activeCity(s).main)throw Error('Chuỗi nhiệm vụ Trung Quốc 2009 chỉ nhận tại thành chính.');
 const task=CHINA_2009_DAILY_TASKS.find(t=>t.id===id);if(!task||s.cities.find(c=>c.main)?.race!=='human')throw Error('Nhiệm vụ Trung Quốc 2009 không áp dụng cho thành chính này.');
 const board=s.china2009DailyTaskState;if(board.accepted.includes(id)||board.claimed.includes(id))throw Error('Nhiệm vụ Trung Quốc 2009 này đã nhận hôm nay.');
 board.accepted.push(id);E.note(s,`Đã nhận nhiệm vụ Trung Quốc 2009 “${task.name}” (SRC54): tuyển hoàn tất ${task.required} Cung thủ tại thành chính.`);return true;
}
function claimChina2009DailyTask(s,id,now=Date.now()){
 ensure(s);syncChina2009TaskBoard(s,now);if(!activeCity(s).main)throw Error('Chuỗi nhiệm vụ Trung Quốc 2009 chỉ nhận thưởng tại thành chính.');
 const task=CHINA_2009_DAILY_TASKS.find(t=>t.id===id);if(!task||s.cities.find(c=>c.main)?.race!=='human')throw Error('Nhiệm vụ Trung Quốc 2009 không áp dụng cho thành chính này.');
 const board=s.china2009DailyTaskState;if(!board.accepted.includes(id))throw Error('Hãy nhận nhiệm vụ trước khi nhận thưởng.');if(board.claimed.includes(id))throw Error('Phần thưởng nhiệm vụ Trung Quốc 2009 hôm nay đã nhận.');
 if((board.progress[id]||0)<task.required)throw Error('Hãy hoàn tất huấn luyện đủ 20 Cung thủ trước.');
 if(s.res.wood+task.rewardWood>E.limits(s).wood+1e-7)throw Error('Kho gỗ không đủ chỗ; hãy dùng gỗ rồi nhận thưởng.');
 const owned=s.army[task.rewardUnitId]||0;if(!Number.isSafeInteger(owned)||owned>1_000_000_000-task.rewardUnits)throw Error('Số quân vượt giới hạn save an toàn.');
 E.add(s,{wood:task.rewardWood});s.army[task.rewardUnitId]=owned+task.rewardUnits;board.claimed.push(id);
 E.note(s,`Hoàn thành nhiệm vụ 2009 “${task.name}” (SRC54): +${task.rewardWood} gỗ, +${task.rewardUnits} Cung thủ.`);return {wood:task.rewardWood,unitId:task.rewardUnitId,units:task.rewardUnits};
}
function claim(s,id){ensure(s);if(!activeCity(s).main)throw Error('Theo hướng dẫn Trung Quốc 2009, thao tác nhiệm vụ chỉ thực hiện tại thành chính.');const result=prior.claim(s,id);syncChina2009TaskBoard(s,s.lastTick);return result}
function appoint(s,id){ensure(s);const c=activeCity(s);if(s.cities.some(x=>x.id!==c.id&&x.local.castellan===id))throw Error('Một tướng không thể đồng thời làm Castellan ở hai thành.');return prior.appoint(s,id)}
E.make=make;E.tick=tick;E.startMarch=startMarch;E.battleAct=battleAct;E.claim=claim;E.appoint=appoint;E.heroStats=heroStats;E.valid=valid;E.strictSave=strict;E.parseSave=parse;E.serializeSave=serialize;E.rate=rate;
Object.assign(E,{cityLimit,activeCity,cityForKey,switchCity,depositArmy,ensure10:ensure,syncCityState:storeCurrent,HG10_CITY_LIMITS:CITY_LIMITS,WORLD_BUILDING_BY_KEY,DAILY_TASKS,CHINA_2009_DAILY_TASKS,worldDayKey,hasVisitedWorldBuilding,visitWorldBuilding,startCityTransport,transportUnit,transportWeight,dailyTasks,acceptDailyTask,claimDailyTask,heroTaskStatus,acceptHeroTask,claimHeroTask,china2009DailyTasks,acceptChina2009DailyTask,claimChina2009DailyTask});
root.HOG_HG10={status:'partial-world-building-visits',sourceStatus:'2009 Chinese guide daily visitation and listed rewards; UTC reset and instant visit are implementation models',saveVersion:7,depositArmy};
})(typeof globalThis!=='undefined'?globalThis:this);
