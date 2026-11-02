/* Hẻoofgaia HG06: candidate Tavern, 2009-source combat and castellan fidelity pass.
 * Original implementation. Tavern rarities/prices are SIMULATED pending source verification.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;if(!E||E.V!==5)throw Error('HG06 needs HG05');
const old={make:E.make,tick:E.tick,valid:E.valid,strict:E.strictSave,parse:E.parseSave,serialize:E.serializeSave,hire:E.hire};
const V=6,KEY='heoofgaia_hg_only_v06';
const names=['Seren','Eldwin','Tiriel','Thorne','Velmar','Rowan','Neris','Cerys','Merek','Vesper','Elowen','Talan','Sylas','Irena'];
function slots(lv){return [0,2,3,3,4,4,5,5,6,7,8][Math.max(1,Math.min(10,lv|0))]}
function candidates(s,round){
 const lv=s.buildings.tavern||1;
 return Array.from({length:slots(lv)},(_,i)=>{
  const n=(round*13+i*7+Object.keys(E.C.races).indexOf(s.race)*3)>>>0;
  const quality=lv>=10&&n%31===0?'purple':lv>=6&&n%5===0?'blue':lv>=3&&n%3===0?'green':'white';
  const bonus={white:0,green:3,blue:6,purple:10}[quality];
  return {id:`r${round}c${i}`,name:names[n%names.length],quality,
    atk:8+(n%5)+bonus,def:7+((n*3)%5)+bonus,spd:6+((n*5)%5)+Math.floor(bonus/2),int:6+((n*7)%5)+bonus,
    gold:500+(i*90)+bonus*80};
 });
}
function ensure(s){E.ensure05(s);
 if(!s.tavern||typeof s.tavern!=='object'||Array.isArray(s.tavern))s.tavern={round:0,remaining:3600,offers:candidates(s,0)};
 if(!Number.isSafeInteger(s.tavern.round)||s.tavern.round<0)s.tavern.round=0;
 if(!Number.isFinite(s.tavern.remaining)||s.tavern.remaining<0)s.tavern.remaining=3600;
 if(!Array.isArray(s.tavern.offers))s.tavern.offers=candidates(s,s.tavern.round);
 return s;
}
function refresh(s){ensure(s);s.tavern.round++;s.tavern.offers=candidates(s,s.tavern.round);E.note(s,'Tavern đã làm mới danh sách tướng (chu kỳ 60 phút game).')}
function hire(s,candidateId){ensure(s);if(s.buildings.tavern<1)throw Error('Cần xây Tavern');
 if(s.heroes.length>=8)throw Error('Đạt giới hạn 8 tướng thử nghiệm');
 const offer=s.tavern.offers.find(h=>h.id===candidateId);
 if(!offer)throw Error('Ứng viên không còn trong Tavern');
 E.spend(s,{gold:offer.gold});const id=Math.max(0,...s.heroes.map(h=>h.id))+1;
 s.heroes.push({id,name:offer.name,level:1,xp:0,atk:offer.atk,def:offer.def,spd:offer.spd,int:offer.int,quality:offer.quality});
 s.tavern.offers=s.tavern.offers.filter(h=>h.id!==candidateId);
 E.ensure05(s);E.note(s,`Tuyển ${offer.name} (${offer.quality}) từ Tavern, -${offer.gold} vàng; bảng xác suất và giá đang mô phỏng.`);return id;
}
function tick(s,now=Date.now()){
 ensure(s);if(now<=s.lastTick)return;
 const gameSecs=Math.min((now-s.lastTick)/1000,8*3600)*(s.speed===1?1:60);
 // The previous engine expects schema v5 internally. Only temporarily normalize within
 // the synchronous tick; restore on errors and leave legacy saved data untouched.
 s.version=5;try{old.tick(s,now)}finally{s.version=V}
 let left=gameSecs;
 if(left>=s.tavern.remaining){left-=s.tavern.remaining;
   const cycles=1+Math.floor(left/3600);s.tavern.round+=cycles;
   s.tavern.offers=candidates(s,s.tavern.round);
   s.tavern.remaining=3600-(left%3600);
   E.note(s,`Tavern làm mới ${cycles} lần trong thời gian game đã trôi qua.`);
 }else s.tavern.remaining-=left;
}
function valid(s){return !!(s&&s.version===V&&old.valid({...s,version:5}));}
function strict(s){if(!valid(s)||!old.strict({...s,version:5}))return false;
 const t=s.tavern;if(!t||!Number.isSafeInteger(t.round)||t.round<0||t.round>1e9||!Number.isFinite(t.remaining)||t.remaining<0||t.remaining>3600||!Array.isArray(t.offers)||t.offers.length>8)return false;
 const ids=new Set();for(const h of t.offers){if(!h||typeof h.id!=='string'||h.id.length>24||ids.has(h.id)||typeof h.name!=='string'||h.name.length>64||!['white','green','blue','purple'].includes(h.quality)||!['atk','def','spd','int','gold'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0&&h[k]<=10000))return false;ids.add(h.id)}
 return true;
}
function parse(text){if(typeof text!=='string'||text.length>2000000)throw Error('Tệp sao lưu vượt giới hạn 2 MB');
 let raw;try{raw=JSON.parse(text)}catch{throw Error('JSON không hợp lệ')}
 const obj=raw?.format==='heoofgaia-save-1'?raw.state:raw;
 let s;
 if(obj?.version===6){s=E.clone(obj);if(!strict(s))throw Error('Save HG06 không hợp lệ')}
 else{s=old.parse(JSON.stringify(obj));s.version=6;ensure(s);if(!strict(s))throw Error('Chuyển save thất bại');E.note(s,'Đã chuyển save HG02–HG05 sang HG06; giữ nguyên bản cũ.')}
 return s;
}
function serialize(s){if(!strict(s))throw Error('Save HG06 không hợp lệ');return JSON.stringify({format:'heoofgaia-save-1',exportedAt:new Date().toISOString(),state:s},null,2)}
function unitValue(u){if(!u)throw Error('Không xác định binh chủng');const c=u.cost;return c.gold+5*(c.wood+c.ore)+10*(c.sulfur+c.crystal)}
function troopValue(s){ensure(s);return (s.formation||[]).reduce((total,g)=>total+unitValue(E.getUnit(s,g.unitId))*g.count,0)}
E.make=(...args)=>{const s=old.make(...args);s.version=V;return ensure(s)};
Object.assign(E,{V,SAVE_KEY:KEY,PREV_SAVE_KEY:'heoofgaia_hg_only_v05',ensure06:ensure,unitValue,troopValue,hireCandidate:hire,tavernSlots:slots,refreshTavern:refresh,tick,valid,strictSave:strict,parseSave:parse,serializeSave:serialize});
root.HOG_HG06={version:V,saveKey:KEY};
})(typeof globalThis!=='undefined'?globalThis:this);


