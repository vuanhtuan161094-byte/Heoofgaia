/* Hẻoofgaia HG-05: queued construction, hardened save validation and version-preserving migrations.
 * Rules marked SIMULATED remain provisional until verified against original client data.
 */
(function(root){
'use strict';
const E=root.HOG_ENGINE;
if(!E||!E.ensure)throw Error('HG-05 must load after hg04.js');
const original={make:E.make,tick:E.tick,upgrade:E.upgrade,valid:E.valid,
 migrate02:E.upgradeSaveV02,migrate03:E.upgradeSaveV03};
const VERSION=5, KEY='heoofgaia_hg_only_v05';
function ensure(s){E.ensure(s);if(!Object.prototype.hasOwnProperty.call(s,'buildingQueue'))s.buildingQueue=null;return s;}
function duration(s,key){const next=(s.buildings[key]||0)+1;
 // SIMULATED seconds, deliberately NOT claimed to match the original 2009 client.
 const base=key==='hall'?210:160;
 return Math.max(30,Math.ceil(base*Math.pow(1.4,next-1)*(1-Math.min(.27,(s.spells.construction||0)*.03))));
}
function upgrade(s,key){ensure(s);
 if(s.buildingQueue)throw Error('Đang có một công trình trong hàng đợi. Hãy đợi hoàn tất.');
 if(!E.C.buildings[key]||E.C.buildings[key].state!=='observed')throw Error('Công trình chưa được triển khai');
 const lv=s.buildings[key]||0;
 if(lv>=10)throw Error('Đạt cấp tối đa mô phỏng');
 if(key!=='hall'&&lv>=s.buildings.hall)throw Error('Cần nâng Town Hall trước');
 const cost=E.buildCost(s,key);
 E.spend(s,cost);const seconds=duration(s,key);
 s.buildingQueue={id:s.serial++,key,level:lv+1,total:seconds,remaining:seconds};
 E.note(s,`Bắt đầu nâng ${E.C.buildings[key].name} Lv.${lv+1}, chờ ${seconds} giây game (mô phỏng).`);
 return cost;
}
function finishConstruction(s){
 const q=s.buildingQueue;if(!q)return;
 if((s.buildings[q.key]||0)!==q.level-1)throw Error('Hàng đợi xây dựng không khớp cấp công trình');
 s.buildings[q.key]=q.level;s.buildingQueue=null;
 E.note(s,`Hoàn thành ${E.C.buildings[q.key].name} Lv.${q.level}.`);
}
function tick(s,now=Date.now()){
 ensure(s);const oldTime=s.lastTick;if(now<=oldTime)return;
 const cappedSeconds=Math.min((now-oldTime)/1000,8*3600);
 const factor=s.speed===1?1:60,gameSeconds=cappedSeconds*factor;
 const q=s.buildingQueue;
 // Split the exact tick at the construction completion boundary. This is important:
 // production rates, storage or unlocks gained after completion apply to the remainder
 // of a long offline interval, with no resource duplication and no lost post-build time.
 if(q&&q.remaining>0&&gameSeconds>=q.remaining){
  const halfway=oldTime+q.remaining/factor*1000;
  original.tick(s,halfway);
  q.remaining=0;finishConstruction(s);
  const cappedEnd=oldTime+cappedSeconds*1000;
  if(cappedEnd>halfway)original.tick(s,cappedEnd);
  // Maintain engine's offline limit: explicitly consume the rest of the wall interval.
  s.lastTick=now;
 }else{
  original.tick(s,now);
  if(q){q.remaining=Math.max(0,q.remaining-gameSeconds);if(q.remaining<=1e-9)finishConstruction(s)}
 }
}
function valid(s){
 if(!original.valid(s)||s.version!==VERSION)return false;
 if(!s.buildingQueue)return true;
 const q=s.buildingQueue;
 return !!(q&&E.C.buildings[q.key]&&Number.isSafeInteger(q.id)&&Number.isSafeInteger(q.level)&&
 Number.isFinite(q.total)&&q.total>0&&Number.isFinite(q.remaining)&&q.remaining>=0&&q.remaining<=q.total&&
 Number.isSafeInteger(s.buildings[q.key])&&s.buildings[q.key]===q.level-1);
}
function strictSave(s){
 if(!valid(s))return false;
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!obj(s.res)||!obj(s.army)||!obj(s.buildings)||!obj(s.wounded)||!obj(s.spells))return false;
 if(!Number.isSafeInteger(s.serial)||s.serial<1||s.serial>1e9)return false;
 if(!Number.isFinite(s.lastTick)||s.lastTick>Date.now()+5*60e3)return false;
 if(![1,60].includes(s.speed)||!Number.isFinite(s.ap)||s.ap<0||!Number.isFinite(s.apMax)||s.apMax<=0||s.ap>s.apMax+1e-6)return false;
 for(const k of E.C.keys)if(!Number.isFinite(s.res[k])||s.res[k]<0||s.res[k]>1e12)return false;
 for(const [k,lv] of Object.entries(s.buildings))if(!E.C.buildings[k]||!Number.isSafeInteger(lv)||lv<0||lv>10)return false;
 const allowedUnits=new Set(E.arrUnits(s).map(u=>u.id));
 for(const [k,n] of Object.entries(s.army))if(!allowedUnits.has(k)||!Number.isSafeInteger(n)||n<0||n>1e8)return false;
 for(const [k,n] of Object.entries(s.wounded))if(!allowedUnits.has(k)||!Number.isSafeInteger(n)||n<0||n>1e8)return false;
 if(s.heroes.length<1||s.heroes.length>8||new Set(s.heroes.map(h=>h.id)).size!==s.heroes.length)return false;
 for(const h of s.heroes)if(!Number.isSafeInteger(h.id)||h.id<1||typeof h.name!=='string'||h.name.length>120||!['level','xp','atk','def','spd','int'].every(k=>Number.isFinite(h[k])&&h[k]>=0&&h[k]<1e9))return false;
 if(s.training.length>100)return false;
 for(const t of s.training)if(!allowedUnits.has(t.unitId)||!Number.isSafeInteger(t.count)||t.count<1||t.count>1e8||!Number.isFinite(t.remaining)||t.remaining<0||t.remaining>1e10)return false;
 if(s.formation&&(!Array.isArray(s.formation)||s.formation.length>7||s.formation.some(t=>!allowedUnits.has(t.unitId)||!Number.isSafeInteger(t.count)||t.count<0)))return false;
 if(s.march&&(!obj(s.march)||!E.getTile(s.march.target)||!Number.isFinite(s.march.remaining)||s.march.remaining<0))return false;
 if(s.battle&&(!obj(s.battle)||!E.getTile(s.battle.target)||!Array.isArray(s.battle.allies)||!Array.isArray(s.battle.enemies)||s.battle.allies.length>7||s.battle.enemies.length>20))return false;
 if(!Array.isArray(s.inventory)||s.inventory.length>2000||!Array.isArray(s.claimedQuests)||s.claimedQuests.length>100)return false;
 if(s.log.length>100||s.log.some(l=>typeof l!=='string'||l.length>500))return false;
 return true;
}
function migrate04(old){
 if(!old||old.version!==4||!E.C.races[old.race])throw Error('Save HG-04 không hợp lệ');
 const s=E.clone(old);ensure(s);s.version=VERSION;s.buildingQueue=null;
 E.note(s,'Chuyển HG-04 sang HG-05; bản lưu HG-04 cũ giữ nguyên.');
 if(!strictSave(s))throw Error('Không thể chuyển save HG-04: dữ liệu không hợp lệ');
 return s;
}
function migrate03(old){const v4=original.migrate03(old);return migrate04(v4)}
function migrate02(old){const v4=original.migrate02(old);return migrate04(v4)}
function parseSave(text){
 if(typeof text!=='string'||text.length>2_000_000)throw Error('Tệp sao lưu vượt giới hạn 2 MB');
 let raw;try{raw=JSON.parse(text)}catch(e){throw Error('Tệp không phải JSON hợp lệ')}
 const src=raw?.format==='heoofgaia-save-1'?raw.state:raw;
 let s;
 if(src?.version===5)s=E.clone(src);
 else if(src?.version===4)s=migrate04(src);
 else if(src?.version===3)s=migrate03(src);
 else if(src?.version===2)s=migrate02(src);
 else throw Error('Không hỗ trợ phiên bản save');
 ensure(s);
 if(!strictSave(s))throw Error('Save không đạt kiểm tra an toàn hoặc tính nhất quán');
 return s;
}
function serialize(s){if(!strictSave(s))throw Error('Không thể xuất save không hợp lệ');return JSON.stringify({format:'heoofgaia-save-1',exportedAt:new Date().toISOString(),state:s},null,2)}
E.make=(...a)=>{let s=original.make(...a);s.version=VERSION;return ensure(s)};
E.tick=tick;E.upgrade=upgrade;E.valid=valid;
E.upgradeSaveV04=migrate04;E.upgradeSaveV03=migrate03;E.upgradeSaveV02=migrate02;
Object.assign(E,{V:VERSION,SAVE_KEY:KEY,PREV_SAVE_KEY:'heoofgaia_hg_only_v04',ensure05:ensure,
 buildDuration:duration,strictSave,parseSave,serializeSave:serialize});
root.HOG_HG05={version:VERSION,saveKey:KEY};
})(typeof globalThis!=='undefined'?globalThis:this);


