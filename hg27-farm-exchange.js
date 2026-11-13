/* HG27: PvE earned-token exchange. Original offline rules; compatible with Save v07.
 * No instant combat results, no auto-claimed rewards, no retroactive grants.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg26Start||!E?.hg21TowerEnter||!E?.HG18_MATERIALS)throw Error('HG27 needs HG26/HG21/HG18');
const old={make:E.make,parse:E.parseSave,strict:E.strictSave,serialize:E.serializeSave,battleAct:E.battleAct};
const TYPES=Object.freeze({marks:{name:'Chiến tích quái',icon:'⚔'},boss:{name:'Ấn Boss',icon:'🔱'},tower:{name:'Phù ấn Tháp',icon:'🗼'}});
const RECIPES=Object.freeze([
 {id:'guard',group:'troop',name:'Chuyển 12 quân cơ bản thành 4.000 Thần Vệ',need:{marks:12,tower:3},troops:12,gold:3000,floor:4},
 {id:'sentinel_sword',group:'gear',name:'Kiếm Vệ Binh Gaia',need:{marks:8,tower:2},gold:1800},
 {id:'sentinel_plate',group:'gear',name:'Giáp Vệ Binh Gaia',need:{marks:8,tower:2},gold:1800},
 {id:'sentinel_seal',group:'gear',name:'Ấn Vệ Binh Gaia',need:{marks:8,tower:2},gold:1800},
 {id:'astral_sword',group:'gear',name:'Tinh Vân Thần Kiếm',need:{boss:3,tower:6,marks:15},gold:12000,floor:6},
 {id:'astral_plate',group:'gear',name:'Tinh Vân Hộ Giáp',need:{boss:3,tower:6,marks:15},gold:12000,floor:6},
 {id:'astral_seal',group:'gear',name:'Tinh Vân Thánh Ấn',need:{boss:3,tower:6,marks:15},gold:12000,floor:6}
]);
const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
function ensure(s){
 if(!s?.hg27)s.hg27={v:1,marks:0,boss:0,tower:0,processedWorld:s.hg18?.victories||0,processedTower:s.hg20?.tower?.victories||0,exchanges:0};
 return s.hg27;
}
function valid(s){
 const h=s?.hg27;
 return !!h&&h.v===1&&['marks','boss','tower','processedWorld','processedTower','exchanges'].every(k=>int(h[k]));
}
function earn(s,key,count){const h=ensure(s);if(!int(count,100))throw Error('HG27: phần thưởng sai');
 h[key]=Math.min(1e9,h[key]+count);
 E.note(s,'HG27: +'+count+' '+TYPES[key].name+' (đã ghi nhận chiến thắng thật).');
}
function battleAct(s,action,options){
 const before=s.battle?{kind:s.battle.kind,target:s.battle.target,floor:s.battle.hg21Tower?.floor||0}:null;
 const result=old.battleAct(s,action,options);
 if(!before||result?.type!=='win')return result;
 const h=ensure(s);
 if(before.kind==='tower'&&result.claimed){
  const n=s.hg20.tower.victories;
  if(n>h.processedTower){earn(s,'tower',before.floor%5===0?2:1);h.processedTower=n;}
 }else if(before.kind==='npc'||before.kind==='treasure'){
  const n=s.hg18.victories,t=E.getTile(before.target);
  if(n>h.processedWorld){
   earn(s,'marks',(before.kind==='npc'&&(E.getTile(before.target)?.level||0)>=5)?2:1);
   if((t?.eliteTier||0)>=11||before.kind==='treasure'&&t?.level>=9)earn(s,'boss',1);
   h.processedWorld=n;
  }
 }
 return result;
}
function reserved(s,unitId){
 return s.heroes.reduce((sum,hero)=>sum+(E.hg20HeroPlan(s,hero.id)||[])
  .filter(g=>g.unitId===unitId).reduce((n,g)=>n+g.count,0),0);
}
function catalogue(s){const h=ensure(s),floor=s.hg20?.tower?.floor||1,unitId=s.race+'_1';
 return RECIPES.map(r=>{
  const enough=Object.entries(r.need).every(([key,n])=>h[key]>=n);
  const free=Math.max(0,(s.army[unitId]||0)-reserved(s,unitId));
  const unlocked=floor>=(r.floor||1);
  return {...r,unlocked,freeTroops:free,canExchange:unlocked&&enough&&
   s.res.gold>=r.gold&&(!r.troops||free>=r.troops)&&(!r.troops||((s.army[s.race+'_quest_guard']||0)<=100000000-4000))&&
   (r.troops||s.inventory.length<2000)};
 });
}
function exchange(s,id){
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length)throw Error('Đội đang hành quân hoặc chiến đấu, chưa thể đổi thưởng');
 const r=catalogue(s).find(q=>q.id===id);if(!r)throw Error('Công thức không tồn tại');
 if(!r.unlocked)throw Error('Chưa vượt mốc Tháp '+r.floor);
 if(!r.canExchange)throw Error('Thiếu chiến tích, phù ấn, vàng, quân rảnh hoặc túi đồ đầy');
 const h=ensure(s),unitId=s.race+'_1';
 E.spend(s,{gold:r.gold});
 for(const [k,n] of Object.entries(r.need))h[k]-=n;
 let output;
 if(r.troops){s.army[unitId]-=r.troops;const special=s.race+'_quest_guard';
  s.army[special]=(s.army[special]||0)+4000;output={unitId:special,count:4000};
 }else{output=E.addItem(s,r.id,'HG27 đổi chiến tích từ quái/Boss/Tháp');}
 h.exchanges++;E.note(s,'HG27: đổi '+r.name+' sau khi tiêu hao nguyên liệu thật.');
 return {id:r.id,output,exchanges:h.exchanges};
}
function newGame(...args){const s=old.make(...args);ensure(s);return s;}
function parse(data){const s=old.parse(data);ensure(s);if(!strict(s))throw Error('Save HG27 không hợp lệ');return s;}
function strict(s){return old.strict(s)&&valid(s);}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG27 không hợp lệ');return old.serialize(s);}
Object.assign(E,{make:newGame,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,hg27Ensure:ensure,hg27Catalogue:catalogue,hg27Exchange:exchange,hg27Valid:valid,
 HG27_TOKENS:TYPES,HG27_RECIPES:RECIPES});
root.HOG_HG27=Object.freeze({version:1,saveVersion:7,mode:'earned-pve-exchange'});
})(typeof globalThis!=='undefined'?globalThis:this);
