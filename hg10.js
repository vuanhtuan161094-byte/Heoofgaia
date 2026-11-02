/* HG-10: separate owned-city economies, race-specific build queues and returns.
 * Source-backed: a Fame rank controls castle limits; capturing a secondary city
 * unlocks that city's race troop/research systems; returning heroes go to origin.
 * Unverified captured-city starting stock/buildings and castle AP price are explicit models.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==7||!E.ensure08)throw Error('HG10 requires the v07 HG08 engine');
const prior={make:E.make,tick:E.tick,valid:E.valid,strict:E.strictSave,parse:E.parseSave,serialize:E.serializeSave,startMarch:E.startMarch,battleAct:E.battleAct,rate:E.rate,claim:E.claim,appoint:E.appoint};
const CITY_FIELDS=['race','res','buildings','army','wounded','woundFraction','spells','training','formation','buildingQueue','researchQueue','arenaQueue','tavern','castellan'];
const GLOBAL_DURING_CITY_TICK=['lastTick','ap','apMax','fame','mines','cleared','expedition','parallelMarches','stationedHeroes','march','battle','battleAuto','battleOrder','battleTarget','activeHero','heroes','log','serial','speed','created','inventory','equipment','heroMagic','nextItem','lootWins','claimedQuests','version','selected'];
const CITY_LIMITS=Object.freeze([[0,1],[5800,2],[80000,3],[300000,4],[700000,5],[1000000,6]]);
function clone(v){return JSON.parse(JSON.stringify(v))}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k)}
function cityLimit(fame){let n=1;for(const [threshold,count] of CITY_LIMITS){if(fame>=threshold)n=count;else break}return n}
function currentLocal(s){const data={};for(const k of CITY_FIELDS)data[k]=clone(s[k]);return data}
function storeCurrent(s){const c=s.cities?.find(x=>x.id===s.activeCityId);if(c)c.local=currentLocal(s)}
function applyCity(s,c){for(const k of CITY_FIELDS)s[k]=clone(c.local[k]);s.activeCityId=c.id;s.activeCastleKey=c.key}
function ensure(s){
 E.ensure08(s);
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
function startMarch(s,key){
 ensure(s);const tile=E.getTile(key),owned=cityForKey(s,key);
 if(tile?.kind==='castle'){
  if(owned)throw Error('Thành này đã thuộc quyền của bạn.');
  if(s.cities.length>=cityLimit(s.fame))throw Error(`Cần thêm danh vọng để chiếm thành: ${s.cities.length}/${cityLimit(s.fame)} ô thành.`);
 }
 return prior.startMarch(s,key);
}
function battleAct(s,action){
 ensure(s);const tile=s.battle&&E.getTile(s.battle.target),homeCityId=s.expedition?.homeCityId||s.activeCityId;
 const result=prior.battleAct(s,action);
 if(result?.type==='win'&&tile?.kind==='castle'&&!cityForKey(s,tile.key))seedCapturedCity(s,tile);
 if(result?.type==='win'&&tile?.kind==='mine'){
  const mine=s.mines.find(m=>m.key===tile.key);if(mine)mine.cityId=homeCityId||'main';
 }
 storeCurrent(s);return result;
}
function tickOtherCity(s,city,from,now){
 const activeId=s.activeCityId,activeData=currentLocal(s),globals={};
 for(const k of GLOBAL_DURING_CITY_TICK)globals[k]=k==='parallelMarches'?clone(s[k]):s[k];
 applyCity(s,city);s.lastTick=from;s.march=null;s.battle=null;
 try{prior.tick(s,now);city.local=currentLocal(s)}
 finally{
  for(const k of GLOBAL_DURING_CITY_TICK)s[k]=globals[k];
  s.activeCityId=activeId;s.activeCastleKey=s.cities.find(c=>c.id===activeId)?.key||'3,4';
  for(const k of CITY_FIELDS)s[k]=clone(activeData[k]);s.version=7;
 }
}
function tick(s,now=Date.now()){
 ensure(s);if(!Number.isFinite(now)||now<=s.lastTick)return s;
 const from=s.lastTick,activeId=s.activeCityId;prior.tick(s,now);storeCurrent(s);
 for(const c of [...s.cities])if(c.id!==activeId)tickOtherCity(s,c,from,now);
 // The active city's tick is the single source of world time/AP. Restore its live root after offline city work.
 const active=s.cities.find(c=>c.id===activeId);if(active)applyCity(s,active);s.lastTick=now;s.version=7;return s;
}
function strict(s){
 if(!s||s.version!==7||!prior.strict(s))return false;
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
function rate(s){ensure(s);return prior.rate(s)}
function claim(s,id){ensure(s);if(!activeCity(s).main)throw Error('Theo hướng dẫn Trung Quốc 2009, thao tác nhiệm vụ chỉ thực hiện tại thành chính.');return prior.claim(s,id)}
function appoint(s,id){ensure(s);const c=activeCity(s);if(s.cities.some(x=>x.id!==c.id&&x.local.castellan===id))throw Error('Một tướng không thể đồng thời làm Castellan ở hai thành.');return prior.appoint(s,id)}
E.make=make;E.tick=tick;E.startMarch=startMarch;E.battleAct=battleAct;E.claim=claim;E.appoint=appoint;E.valid=valid;E.strictSave=strict;E.parseSave=parse;E.serializeSave=serialize;E.rate=rate;
Object.assign(E,{cityLimit,activeCity,cityForKey,switchCity,depositArmy,ensure10:ensure,syncCityState:storeCurrent,HG10_CITY_LIMITS:CITY_LIMITS});
root.HOG_HG10={status:'multi-city-prototype',sourceStatus:'2009-12 Chinese fame table; captured stock/building levels modeled',saveVersion:7,depositArmy};
})(typeof globalThis!=='undefined'?globalThis:this);
