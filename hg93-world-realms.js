/* HG93: four realms and 20 capturable endgame settlements.
 * Local offline gameplay; future multiplayer requires a server authority.
 * Sprites intentionally reuse canonical T10 artwork until visual approval.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E||E.V!==7||E.WIDTH!==200||E.HEIGHT!==200||!C?.rewardUnits)throw Error('HG93 dependency mismatch');
const RACES=['human','elf','orc','undead'];
const realms=E.TILES.filter(t=>t.worldTier).sort((a,b)=>a.race.localeCompare(b.race)||a.key.localeCompare(b.key));
if(realms.length!==20||realms.filter(t=>t.worldTier==='saint').length!==16||realms.filter(t=>t.worldTier==='divine').length!==4)
 throw Error('HG93 requires 16 Saint and 4 Divine cities');
const previous=C.rewardUnits,extra=Object.fromEntries(RACES.map(r=>[r,[]]));
for(const city of realms){
 const base=C.units[city.race].slice().sort((a,b)=>b.tier-a.tier||b.atk-a.atk)[0];
 if(!base||base.tier<9)throw Error('HG93 highest-tier soldier unavailable '+city.race);
 const multiplier=city.worldTier==='divine'?5:3;
 const price=Object.freeze(Object.fromEntries(C.keys.map(k=>[k,Math.max(1,Math.ceil((base.cost?.[k]||1)*multiplier*2))])));
 extra[city.race].push(Object.freeze({...base,id:city.worldTroopId,
  name:(multiplier===5?'Thần Binh ':'Thánh Binh ')+city.value.replace(/^(Thánh Thành |Thần Đô |Thần Điện |Thần Bảo |Thần Vực )/,''),
  hp:Math.ceil(base.hp*multiplier),atk:Math.ceil(base.atk*multiplier),def:Math.ceil(base.def*multiplier),
  cost:price,rewardOnly:true,worldExclusive:true,realmCityKey:city.key,realmFactor:multiplier,
  visualSourceId:base.id,timeSec:0}));
}
C.rewardUnits=Object.freeze(Object.fromEntries(RACES.map(r=>[r,Object.freeze([...(previous[r]||[]),...extra[r]])])));
const byKey=new Map(realms.map(t=>[t.key,t]));
function quote(s,key,count=1){
 const tile=byKey.get(key);if(!tile)throw Error('Không có Thành Thánh/Thần ở tọa độ này');
 if(!Number.isSafeInteger(count)||count<1||count>20)throw Error('Chỉ tuyển 1–20 quân mỗi lượt');
 const city=s.cities?.find(c=>c.key===key),unit=extra[tile.race].find(u=>u.realmCityKey===key);
 if(!unit)throw Error('Thiếu danh mục quân HG93');
 const cost=Object.fromEntries(C.keys.map(k=>[k,unit.cost[k]*count]));
 const active=!!city&&s.activeCityId===city.id,owned=!!city;
 const existing=s.army?.[unit.id]||0;
 return {tile,city,unit,count,cost,owned,active,
  allowed:active&&existing+count<=1000000&&C.keys.every(k=>(s.res?.[k]||0)>=cost[k])};
}
function recruit(s,key,count=1){
 const q=quote(s,key,count);
 if(!q.owned)throw Error('Phải chiếm thành đặc biệt trước khi tuyển');
 if(!q.active)throw Error('Hãy chuyển sang thành đã chiếm để tuyển quân');
 if(!q.allowed)throw Error('Thiếu tài nguyên hoặc vượt hạn mức quân đặc biệt');
 const trial=E.clone(s);E.spend(trial,q.cost);
 trial.army[q.unit.id]=(trial.army[q.unit.id]||0)+count;
 E.note(trial,'HG93: tuyển '+count+' '+q.unit.name+' tại '+q.city.name+'.');
 if(!E.strictSave(trial))throw Error('HG93 Save v07 không hợp lệ, không trừ tài nguyên');
 Object.assign(s,trial);
 return {count,name:q.unit.name,unitId:q.unit.id,cityName:q.city.name,cost:q.cost};
}
Object.assign(E,{hg93Realms:realms,hg93Quote:quote,hg93Recruit:recruit});
root.HOG_HG93=Object.freeze({version:1,worldWidth:200,worldHeight:200,realmSize:100,
 regions:4,saintCities:16,divineCities:4,multiplayer:false,saveVersion:7});
})(typeof globalThis!=='undefined'?globalThis:this);
