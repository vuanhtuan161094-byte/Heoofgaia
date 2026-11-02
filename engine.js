/* Original engine code for Hẻoofgaia HG-only prototype v0.2. No reverse-engineered server code. */
(function(root){
'use strict';
const C=root.HOG_CATALOG||(typeof require==='function'?require('./data.js'):null);
const V=5, SAVE_KEY='heoofgaia_hg_only_v04', PREV_SAVE_KEY='heoofgaia_hg_only_v03';
const buildOrder=['hall','barracks','heroTower','tavern','warehouse','magicTower','arena','market','bazaar','embassy','stables','forge'];
const BASE_HOURLY={gold:160,wood:12,ore:12,sulfur:6,crystal:6}; // Wiki recorded base production
// HG10 offline catch-up: process at most 24 real wall-clock hours in one suspended-time step.
// This is a bounded runtime policy, not an asserted Heroes of Gaia server rule.
const MAX_OFFLINE_WALL_SECONDS=24*3600;
function gameElapsedSeconds(s,from,now){
 if(!Number.isFinite(from)||!Number.isFinite(now)||now<=from)return 0;
 const wallSeconds=Math.min(MAX_OFFLINE_WALL_SECONDS,(now-from)/1000);
 return wallSeconds*(s.speed===1?1:60);
}
function assert(ok,msg){if(!ok)throw new Error(msg)}
function make(race='human',now=Date.now()){
 assert(!!C.races[race],'Chủng tộc không tồn tại');
 const army={};C.units[race].forEach(u=>army[u.id]=0);army[`${race}_1`]=16;
 return {version:V,race,created:now,lastTick:now,speed:60,
  res:{gold:8000,wood:900,ore:900,sulfur:350,crystal:350},
  buildings:{hall:1,barracks:1,heroTower:1,tavern:1,warehouse:2,magicTower:1,arena:1,market:0,bazaar:0,embassy:0,stables:0,forge:0},
  spells:{},army,wounded:{},heroes:[{id:1,name:{human:'Aldric',elf:'Elaria',orc:'Gorak',undead:'Morwen'}[race],level:1,xp:0,atk:12,def:8,spd:7,int:6}],activeHero:1,castellan:null,ap:100,apMax:150,selected:null,
  formation:[],training:[],march:null,battle:null,battleAuto:false,battleOrder:'attack',battleTarget:null,mines:[],cleared:[],treasureCleared:[],woundFraction:{},fame:5,log:['Khởi đầu một thành trì ở vùng đất Gaia.'],serial:1};
}
function valid(s){return !!(s&&s.version===V&&C.races[s.race]&&s.res&&s.army&&s.buildings&&Array.isArray(s.heroes)&&Array.isArray(s.training)&&Array.isArray(s.log)&&Number.isFinite(s.lastTick))}
function arrUnits(s){return C.units[s.race]}
function getUnit(s,id){return arrUnits(s).find(u=>u.id===id)}
function clone(s){return JSON.parse(JSON.stringify(s))}
function fmt(n){return Math.floor(n||0).toLocaleString('vi-VN')}
function note(s,message){s.log.unshift(message);s.log=s.log.slice(0,100)}
function rate(s){let out={...BASE_HOURLY};
 out.gold+=Math.max(0,s.buildings.hall-1)*40; // demo extrapolation, NOT original
 for(const [key,spell] of Object.entries(C.spells)){
  const level=s.spells[key]||0;if(level&&spell.res) out[spell.res]=(out[spell.res]+spell.base*level)*(1+spell.rate*level);
 }
 // Captured-mine output follows the dated Chinese guide SRC39. Per-level scaling is not documented.
 const mineHourly={gold:200,wood:40,ore:40,sulfur:20,crystal:20};
 for(const m of s.mines){if((m.cityId||'main')===(s.activeCityId||'main')&&out[m.res]!==undefined)out[m.res]+=mineHourly[m.res]}
 // Hero INT increases only the basic Town Hall gold. Fandom's 2/3 percent per point is
 // community-reported and differs from an early Wikidot approximation; provisional.
 const castellan=s.heroes.find(h=>h.id===s.castellan);
 if(castellan)out.gold+=Math.max(0,castellan.int-10)*(BASE_HOURLY.gold+Math.max(0,s.buildings.hall-1)*40)/150;
 return out;
}
function limits(s){const l=s.buildings.warehouse||0;const table={0:[1500,1500,750,750,15000],1:[1500,1500,750,750,15000],2:[1500,1500,750,750,15000],3:[1500,1500,750,750,15000],4:[3000,3000,1500,1500,30000],5:[5250,5250,2625,2625,52500],6:[8250,8250,4125,4125,82500],7:[12000,12000,6000,6000,120000],8:[16500,16500,8250,8250,165000],9:[21000,21000,10500,10500,210000],10:[27000,27000,13500,13500,270000]};const [wood,ore,sulfur,crystal,gold]=table[Math.min(10,l)]; const f=1+(s.spells.storing||0)*.05;return {gold:gold*f,wood:wood*f,ore:ore*f,sulfur:sulfur*f,crystal:crystal*f};}
function cap(s){let lim=limits(s);for(let k of C.keys) s.res[k]=Math.max(0,Math.min(lim[k],s.res[k]));}
function canAfford(s,cost){return Object.entries(cost).every(([k,v])=>s.res[k]+1e-8>=v)}
function spend(s,cost){assert(canAfford(s,cost),'Không đủ tài nguyên');for(let [k,v] of Object.entries(cost))s.res[k]-=v}
function add(s,amount){const limit=limits(s);for(const [k,v] of Object.entries(amount))s.res[k]=Math.min(limit[k],Math.max(0,(s.res[k]||0)+v))}
function buildCost(s,key){const b=C.buildings[key];assert(!!b,'Công trình không tồn tại');const lv=s.buildings[key]||0;return Object.fromEntries(C.keys.map(k=>[k,Math.ceil((b.base[k]||0)*Math.pow(1.65,lv))]));}
function upgrade(s,key){assert(!!C.buildings[key],'Công trình không tồn tại');assert(C.buildings[key].state==='observed','Công trình mới chỉ có trong catalog');const l=s.buildings[key]||0;assert(l<10,'Đạt giới hạn mô phỏng cấp 10');assert(key==='hall'||l<s.buildings.hall,'Cần nâng Town Hall trước');const cost=buildCost(s,key);spend(s,cost);s.buildings[key]=l+1;note(s,`Nâng ${C.buildings[key].name} lên cấp ${l+1} (chi phí và thời gian nâng: mô phỏng).`);return cost;}
function recruitCost(s,u,count){const cost={};for(const k of C.keys) cost[k]=(u.cost[k]||0)*count;
 cost.gold=Math.ceil(cost.gold*(1-Math.min(.18,(s.spells.manufacturing||0)*.02)));
 return cost;}
function recruit(s,id,count){const u=getUnit(s,id);assert(!!u,'Không có quân của chủng tộc này');assert(Number.isSafeInteger(count)&&count>=1&&count<=1000,'Số lượng không hợp lệ');assert(u.tier<=s.buildings.barracks,'Cần nâng Barracks');if(u.tier===2) assert((s.spells.scouting||0)>=1,'Cần nghiên cứu Scouting cấp 1');const cost=recruitCost(s,u,count);spend(s,cost);
 const time=Math.ceil(u.timeSec*count*(1-Math.min(.18,(s.spells.bootcamp||0)*.02)));
 s.training.push({id:s.serial++,unitId:id,count,remaining:time,total:time});
 note(s,`Xếp hàng tuyển ${count} ${u.name}; thời gian cơ sở từ wiki 2009.`);return cost;
}
function spellCost(s,id){const l=s.spells[id]||0;return {gold:Math.ceil(240*Math.pow(1.7,l)),wood:Math.ceil(25*Math.pow(1.5,l)),ore:Math.ceil(25*Math.pow(1.5,l)),sulfur:Math.ceil(10*Math.pow(1.5,l)),crystal:Math.ceil(10*Math.pow(1.5,l))}}
function learn(s,id){assert(!!C.spells[id],'Không có phép');assert((s.buildings.magicTower||0)>=(s.spells[id]||0)+1,'Cần nâng Magic Tower trước');assert((s.spells[id]||0)<10,'Đạt cấp tối đa mô phỏng');const cost=spellCost(s,id);spend(s,cost);s.spells[id]=(s.spells[id]||0)+1;note(s,`Nghiên cứu ${C.spells[id].name} cấp ${s.spells[id]}.`);return cost;}
function hire(s){assert(s.buildings.tavern>=1,'Cần Tavern');assert(s.heroes.length<8,'Đạt giới hạn tướng demo');const cost={gold:500+s.heroes.length*300};spend(s,cost);const id=Math.max(...s.heroes.map(h=>h.id))+1;const names=['Seren','Eldwin','Tiriel','Thorne','Velmar','Rowan','Neris'];const name=names[(id-2)%names.length];s.heroes.push({id,name,level:1,xp:0,atk:9+id,def:8+id,spd:6,int:7});note(s,`Chiêu mộ tướng ${name} tại Tavern; giá demo.`);return id;}
function heroStationed(s,id){return Array.isArray(s.stationedHeroes)&&s.stationedHeroes.some(x=>x.heroId===id)}
function appoint(s,id){assert(s.heroes.some(h=>h.id===id),'Không có tướng');assert(!heroStationed(s,id),'Tướng đang đồn trú ngoài bản đồ');assert(!s.march&&!s.battle,'Không thể đổi Castellan khi đang hành quân');s.castellan=s.castellan===id?null:id;note(s,s.castellan?'Đã bổ nhiệm Castellan.':'Đã bỏ chức Castellan.');}
function selectHero(s,id){assert(s.heroes.some(h=>h.id===id),'Không có tướng');assert(!heroStationed(s,id),'Tướng đang đồn trú ngoài bản đồ');assert((!s.march||s.march.phase==='outbound')&&!s.battle,'Đang hành quân hoặc chiến đấu');assert(s.castellan!==id,'Castellan trấn thủ thành');s.activeHero=id;}
// The December 2009 Chinese guide prints world targets on a 0–99 coordinate
// grid. Terrain remains original procedural artwork; only listed landmark
// coordinates are evidence-backed. Other content is retained for save safety.
const WIDTH=100, HEIGHT=100;
const WORLD_BUILDINGS=Object.freeze([
 {id:'windmill',x:11,y:89,kind:'windmill',name:'Cối xay gió',fame:0,effect:'random-resource',source:'SRC43'},
 {id:'watermill-1',x:93,y:67,kind:'watermill',name:'Cối xay nước',fame:0,effect:'gold-2000',source:'SRC43'},
 {id:'watermill-2',x:27,y:88,kind:'watermill',name:'Cối xay nước',fame:0,effect:'gold-2000',source:'SRC43'},
 {id:'watermill-3',x:68,y:28,kind:'watermill',name:'Cối xay nước',fame:0,effect:'gold-2000',source:'SRC43'},
 {id:'watermill-4',x:88,y:38,kind:'watermill',name:'Cối xay nước',fame:0,effect:'gold-2000',source:'SRC43'},
 {id:'watermill-5',x:84,y:3,kind:'watermill',name:'Cối xay nước',fame:0,effect:'gold-2000',source:'SRC43'},
 {id:'war-academy',x:26,y:4,kind:'war-academy',name:'Học viện Chiến tranh',fame:0,effect:'atk-10',duration:7200,source:'SRC43'},
 {id:'defense-tower',x:94,y:1,kind:'defense-tower',name:'Tháp Phòng thủ',fame:0,effect:'def-10',duration:7200,source:'SRC43'},
 {id:'enlightenment-book',x:21,y:65,kind:'enlightenment-book',name:'Sách Khai sáng',fame:0,effect:'int-10',duration:7200,source:'SRC43'},
 {id:'prayer-temple',x:62,y:57,kind:'prayer-temple',name:'Đền Cầu nguyện',fame:0,effect:'spd-10',duration:7200,source:'SRC43'}
]);
// SRC46 (17173 / Yeyou, 2009-07-27) lists the Chinese edition's wild-NPC
// coordinate sets and recommended force values. These recommendations are
// guidance only; the original NPC troop rosters and exact battle stats were
// not recovered, so makeBattle remains an explicitly modeled encounter.
const NPC_STAR_GUIDE=Object.freeze({
 1:Object.freeze({minimumForce:1500,completeForce:3000,reportedGuardForce:1800,coords:'2,21 5,42 97,52 2,56 93,62 3,88 8,82 13,60 13,41 10,22 28,14 26,25 28,77 38,78 30,58 34,53 30,33 35,14 51,8 52,32 60,86 62,83 56,55 58,27 58,5 76,22 70,51 79,82 86,76 88,45 85,22'}),
 2:Object.freeze({minimumForce:4000,completeForce:8000,reportedGuardForce:4200,coords:'1,14 94,22 95,38 96,45 97,65 2,67 12,53 17,45 7,33 21,22 29,63 18,80 38,85 37,37 35,31 38,10 42,17 43,55 48,79 42,83 55,50 59,39 65,32 63,3 66,10 67,55 66,86 81,89 89,83 86,55 86,12 15,85'}),
 3:Object.freeze({minimumForce:15000,completeForce:30000,reportedGuardForce:15000,coords:'95,14 5,30 5,50 96,73 14,91 23,16 26,67 32,86 46,10 43,36 60,59 71,4 68,38 71,81 89,64 88,33'}),
 4:Object.freeze({minimumForce:45000,completeForce:90000,reportedGuardForce:45000,coords:'4,95 94,6 12,25 13,9 22,69 40,22 53,96 44,26 51,44 46,57 42,92 72,13 69,65 83,96 81,64 83,31'}),
 5:Object.freeze({minimumForce:150000,completeForce:300000,reportedGuardForce:150000,coords:'98,27 13,70 17,5 39,26 46,97 52,71 59,46 56,19 91,97'}),
 6:Object.freeze({minimumForce:360000,completeForce:700000,reportedGuardForce:360000,laterReportedGuardForce:400000,coords:'96,2 9,46 22,84 35,0 46,69 64,42 74,97 79,51'}),
 7:Object.freeze({minimumForce:720000,completeForce:1500000,reportedGuardForce:720000,laterReportedGuardForce:900000,coords:'96,98 22,97 21,38 38,73 47,5 65,97 77,4 72,31 76,69'}),
 8:Object.freeze({minimumForce:1200000,completeForce:2400000,reportedGuardForce:1200000,laterReportedGuardForce:1500000,coords:'1,4 22,52 37,97 32,43 56,65 61,22 91,26'})
});
const NPC_CAMPS_2009=Object.freeze(Object.entries(NPC_STAR_GUIDE).flatMap(([stars,row])=>row.coords.split(/\s+/).map((key,index)=>{
 const [x,y]=key.split(',').map(Number);
 return Object.freeze({key,x,y,stars:Number(stars),index:index+1,minimumForce:row.minimumForce,completeForce:row.completeForce,reportedGuardForce:row.reportedGuardForce,laterReportedGuardForce:row.laterReportedGuardForce??null,source:'SRC46',forceSource:'SRC47',laterForceSource:row.laterReportedGuardForce?'SRC45':null});
})));
// SRC20 (17173, 2009-12-27) publishes 76 equipment-camp coordinates and
// player-recommended minimum / complete-victory forces. SRC47 (Sina,
// 2009-08-23) separately prints guard-force reports for levels 1-10.
// These are dated Chinese-guide reports, not original server tables.
const TREASURE_GEAR_GUIDE=Object.freeze({
 1:Object.freeze({minimumForce:3000,completeForce:6000,reportedGuardForce:3000,coords:'4,60 12,16 27,32 31,79 64,52 55,8 88,40'}),
 2:Object.freeze({minimumForce:8000,completeForce:15000,reportedGuardForce:8400,coords:'4,33 97,55 2,77 27,14 38,58 51,83 61,30 91,22'}),
 3:Object.freeze({minimumForce:24000,completeForce:48000,reportedGuardForce:24000,coords:'3,16 10,52 33,31 43,85 64,7 71,72 78,86 87,48'}),
 4:Object.freeze({minimumForce:72000,completeForce:150000,reportedGuardForce:72000,coords:'12,76 26,51 37,7 52,36 76,13 67,91 90,61'}),
 5:Object.freeze({minimumForce:216000,completeForce:400000,reportedGuardForce:216000,coords:'1,72 9,29 21,18 27,38 46,93 68,13 67,59 89,88'}),
 6:Object.freeze({minimumForce:480000,completeForce:100000,completeForceStatus:'CONFLICT_SOURCE_TYPO_SUSPECTED',reportedGuardForce:480000,coords:'3,96 97,18 1,48 26,65 52,96 48,16 67,40 91,73'}),
 7:Object.freeze({minimumForce:960000,completeForce:1600000,reportedGuardForce:960000,coords:'10,8 22,57 36,97 51,67 68,18 79,29'}),
 8:Object.freeze({minimumForce:1440000,completeForce:2300000,reportedGuardForce:1440000,coords:'5,45 26,21 21,78 32,63 61,96 58,48 81,59 90,7'}),
 9:Object.freeze({minimumForce:2160000,completeForce:3000000,reportedGuardForce:2160000,coords:'96,95 17,64 19,1 41,43 45,98 58,72 55,14 90,27'}),
 10:Object.freeze({minimumForce:3000000,completeForce:4000000,reportedGuardForce:3000000,coords:'16,40 19,95 49,3 43,62 69,98 77,1 71,34 83,55'})
});
const TREASURE_CAMPS_2009=Object.freeze(Object.entries(TREASURE_GEAR_GUIDE).flatMap(([level,row])=>row.coords.split(/\s+/).map((key,index)=>{
 const [x,y]=key.split(',').map(Number);
 return Object.freeze({key,x,y,level:Number(level),index:index+1,minimumForce:row.minimumForce,completeForce:row.completeForce,
  completeForceStatus:row.completeForceStatus||'REPORTED',reportedGuardForce:row.reportedGuardForce,source:'SRC20',forceSource:'SRC47'});
})));
const TREASURE_BY_KEY=new Map(TREASURE_CAMPS_2009.map(camp=>[camp.key,camp]));
function mapTiles(){
 const tiles=[];
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  const valley=Math.abs(x-(49+3*Math.sin(y*.07)))<1.35;
  const n=Math.sin(x*.93+y*.37)*.4+Math.cos(x*.36-y*.81)*.28+Math.sin(x*.22+y*.31)*.35;
  let terrain=valley?'water':n>.43?'hill':n<-.29?'forest':'plain';
  if(valley&&(y===20||y===50||y===80))terrain='bridge';
  if((x+y)%13===0&&terrain==='plain')terrain='road';
  tiles.push({x,y,key:`${x},${y}`,terrain,kind:'empty'});
 }
 const at=(x,y)=>tiles[y*WIDTH+x];
 const home=at(3,4);home.kind='castle';home.race='human';home.value='Thành chính';home.terrain='plain';
 const secondary=at(9,10);secondary.kind='castle';secondary.race='elf';secondary.value='Thành Nguyệt';secondary.level=1;secondary.terrain='plain';
 for(const [x,y,race,name] of [[16,5,'orc','Thành Sắt'],[23,8,'undead','Thành Bóng'],[5,13,'undead','Thành Tro'],[12,12,'orc','Thành Sói']]){const city=at(x,y);city.kind='castle';city.race=race;city.value=name;city.level=1;city.terrain='plain';}
 const places=[
  [6,3,'mine','wood',1],[10,2,'mine','ore',1],[12,6,'mine','sulfur',1],[8,7,'mine','crystal',1],[1,7,'mine','gold',1],[14,2,'mine','wood',2],
  [5,6,'npc','Wolves',1],[8,3,'npc','Bandits',2],[13,4,'npc','Goblins',2],[2,1,'npc','Shadows',1],[10,8,'npc','Rogues',3],[15,8,'npc','Wyverns',4],
  [22,3,'mine','gold',2],[24,11,'mine','crystal',3],[21,15,'mine','ore',3],
  [23,6,'npc','Dark Guards',3],[26,12,'npc','Phantoms',4],[17,15,'npc','Warlocks',3]
 ];
 for(const [x,y,kind,value,level] of places){let t=at(x,y);t.kind=kind;t.value=value;t.level=level;t.terrain='plain';}
 for(const camp of NPC_CAMPS_2009){const t=at(camp.x,camp.y);t.kind='npc';t.value=`Quái vật ${camp.stars}★`;t.level=camp.stars;t.source=camp.source;t.minimumForce=camp.minimumForce;t.completeForce=camp.completeForce;t.reportedGuardForce=camp.reportedGuardForce;t.forceSource=camp.forceSource;t.laterReportedGuardForce=camp.laterReportedGuardForce;t.laterForceSource=camp.laterForceSource;t.terrain='plain';}
 // Keep dated treasure coordinates as a second world-target layer. Existing
 // NPC/castle/building tiles are preserved; 10,8 is one known prototype NPC
 // collision, and its treasure can still be chosen from the gear-site ledger.
 for(const camp of TREASURE_CAMPS_2009){const t=at(camp.x,camp.y);t.treasureCamp=camp;if(t.kind==='empty'){t.kind='treasure';t.value=`Kho báu cấp ${camp.level}`;t.level=camp.level;t.source='SRC20';t.terrain='plain';}}
 // The procedurally painted river would isolate the dated 46,69 NPC coordinate.
 // A one-cell bridge is an explicit map-connectivity accommodation, not a
 // recovered historical terrain feature.
 at(45,69).terrain='bridge';
 for(const building of WORLD_BUILDINGS){const t=at(building.x,building.y);t.kind='visit';t.value=building.name;t.structureId=building.id;t.terrain='plain';}
 return tiles;
}
const TILES=mapTiles(), TILE_LOOKUP=new Map(TILES.map(t=>[t.key,t]));
function getTile(key){return TILE_LOOKUP.get(key)}
function pathfind(fromKey,toKey){
 const start=getTile(fromKey),goal=getTile(toKey);assert(start&&goal,'Tọa độ không tồn tại');
 const queue=[start],visited=new Map([[start.key,null]]);
 for(let i=0;i<queue.length;i++){
  const t=queue[i];if(t.key===goal.key)break;
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nb=getTile(`${t.x+dx},${t.y+dy}`);
   if(!nb||visited.has(nb.key)||nb.terrain==='water')continue;
   visited.set(nb.key,t.key);queue.push(nb);
  }
 }
 if(!visited.has(goal.key))return null;
 const result=[];let k=goal.key;while(k){result.unshift(k);k=visited.get(k);}return result;
}
function setFormation(s,items){
 assert((!s.march||s.march.phase==='outbound')&&!s.battle,'Không thể đổi đội hình khi đang trở về hoặc chiến đấu');
 assert(Array.isArray(items)&&items.length<=7,'Đội hình giới hạn 7 nhóm chiến đấu');
 const sums={};const formation=[];
 for(const item of items){
  if(!item.unitId||!item.count)continue;
  const u=getUnit(s,item.unitId);assert(u,'Binh chủng không hợp lệ');
  const n=Number(item.count);assert(Number.isSafeInteger(n)&&n>0,'Số lính không hợp lệ');
  sums[u.id]=(sums[u.id]||0)+n;assert(sums[u.id]<=(s.army[u.id]||0),'Số quân phân bổ vượt quân hiện có');
  formation.push({unitId:u.id,count:n});
 }
 assert(formation.length>0,'Chưa chọn quân vào đội hình');
 s.formation=formation;note(s,`Đã bố trí ${formation.length} nhóm quân, tổng ${formation.reduce((n,u)=>n+u.count,0)} lính.`);
 return formation;
}
function startMarch(s,key,targetKind){
 assert(!s.march&&!s.battle,'Tướng đang bận');
 const t=getTile(key),camp=TREASURE_BY_KEY.get(key),isTreasure=targetKind==='treasure'||(!targetKind&&t?.kind==='treasure');
 assert(t&&(isTreasure?!!camp:['mine','npc','castle'].includes(t.kind)),'Chọn mỏ, quái, kho báu hoặc thành trung lập');
 assert(isTreasure?!s.treasureCleared?.includes(key):!s.cleared.includes(key),'Mục tiêu đã hoàn thành');
 assert(!s.cleared.includes(key)||isTreasure,'Mục tiêu đã hoàn thành');
 assert(s.formation?.length?s.formation.some(g=>g.count>0):Object.values(s.army).some(n=>n>0),'Không có quân được phân bổ');
 const hero=s.heroes.find(h=>h.id===s.activeHero);assert(hero&&s.castellan!==hero.id,'Tướng không sẵn sàng');
 const homeKey=s.activeCastleKey||'3,4';const path=pathfind(homeKey,key);assert(path&&path.length>1,'Không tìm thấy đường đi bộ qua địa hình');
 const apCost=!isTreasure&&t.kind==='mine'?6:8;assert(s.ap>=apCost,'Thiếu AP');s.ap-=apCost;
 const seconds=Math.max(40,Math.ceil(20+(path.length-1)*19/(1+hero.spd*.018)));
 s.march={target:key,...(isTreasure?{targetKind:'treasure'}:{}),fromKey:homeKey,remaining:seconds,total:seconds,heroId:hero.id,path};
 note(s,`${hero.name} dẫn quân đi ${path.length-1} ô tới (${t.x},${t.y}), -${apCost} AP.`);
}
function activeArmy(s){return arrUnits(s).filter(u=>s.army[u.id]>0)}
function makeBattle(s,target,remainingRatio=1,targetKind){
 const rawTile=getTile(target),camp=TREASURE_BY_KEY.get(target),isTreasure=targetKind==='treasure'||(!targetKind&&rawTile?.kind==='treasure');
 assert(!isTreasure||!!camp,'Không có trại kho báu tại tọa độ này');
 assert(!!rawTile&&(rawTile.kind!=='empty'||isTreasure),'Mục tiêu trận chiến không hợp lệ');
 const tile=isTreasure?{...rawTile,kind:'treasure',value:`Kho báu cấp ${camp.level}`,level:camp.level,treasureCamp:camp}:rawTile;
 const lv=tile.level||1;
 const fieldArmy=s.expedition?.army||s.army,fieldFormation=s.expedition?.formation||s.formation;
 const available=arrUnits(s).filter(u=>(fieldArmy[u.id]||0)>0);
 const selected=(fieldFormation?.length?fieldFormation:available.sort((a,b)=>b.tier-a.tier).slice(0,7).map(u=>({unitId:u.id,count:fieldArmy[u.id]})));
 // Historical guides distinguish ranged attacks and recommend that fast
 // ranged groups fire at enemy ranged groups, but the recovered 2009 catalog
 // has no numeric range. The 20-cell reach covers this prototype's whole grid;
 // this is an explicit playable approximation, not recovered server data.
 const allies=selected.filter(p=>p.count>0).map((p,i)=>{const u=getUnit(s,p.unitId),count=Math.min(p.count,fieldArmy[u.id]||0);return {id:`p${i}`,slot:fieldFormation?.length?i:null,side:'player',unitId:u.id,name:u.name,range:u.type==='Ranged'?20:1,
   count,initial:count,hp:u.hp,atk:u.atk,def:u.def,spd:Math.max(.1,u.spd+(((root.HOG_ENGINE?.heroStats?root.HOG_ENGINE.heroStats(s,s.activeHero)?.spd:null)??s.heroes.find(h=>h.id===s.activeHero)?.spd??10)-10)*.02),
   pool:count*u.hp,x:i<4?1:3,y:i<4?[0,2,5,8][i]:[1,4,7][i-4]}});
 const archetypes=[{name:'Dã thú',hp:37,atk:13,def:9,spd:4,range:1},
  {name:'Cung thủ cướp',hp:34,atk:16,def:9,spd:5,range:20},
  {name:'Vệ binh',hp:55,atk:20,def:15,spd:3.8,range:1}];
 const enemies=archetypes.slice(0,lv>=2?3:2).map((e,i)=>{
  const c=Math.max(2,Math.ceil((lv*.8+1.7)*(i===0?2:1)));
  return {id:`e${i}`,side:'enemy',unitId:null,name:e.name,range:e.range,count:c,initial:c,hp:e.hp,atk:e.atk+lv*2,def:e.def+lv,
   spd:e.spd,pool:c*e.hp,x:10,y:2+i*3};
 });
 for(const e of enemies){e.pool=Math.max(1,Math.ceil(e.pool*remainingRatio));e.count=Math.ceil(e.pool/e.hp)}
 return {target,name:tile.kind==='mine'?`${C.resource[tile.value].label} mine`:tile.value,kind:tile.kind,level:lv,...(isTreasure?{treasureCamp:{...camp}}:{}),
   turn:1,order:'attack',orders:{},focused:null,selected:allies[0]?.id||null,autoUntil:Date.now()+10_000,allies,enemies,
   history:['Tướng triển khai quân đội. Đội hình và AI hiện là bản thử nghiệm.']};
}
function battleOpen(s){s.battle=makeBattle(s,s.march.target,1,s.march.targetKind);s.march=null;s.battleAuto=false;s.battleOrder='attack';note(s,`Đụng độ tại ${s.battle.name}. Chọn đội quân và ra lệnh.`)}
function upgradeSaveV02(old){
 assert(old&&old.version===2&&old.res&&old.army,'Save v0.2 không hợp lệ');
 const s=clone(old);s.version=4;s.battleAuto=false;s.battleOrder='attack';s.battleTarget=null;s.formation=[];
 if(s.march){const p=pathfind('3,4',s.march.target);s.march.path=p||['3,4',s.march.target]}
 if(s.battle){const prev=s.battle;const ratio=prev.maxHP>0?Math.max(.01,prev.enemyHP/prev.maxHP):1;s.battle=makeBattle(s,prev.target,ratio,prev.kind==='treasure'?'treasure':prev.targetKind);}
 note(s,'Save HG-02 đã chuyển sang HG-03 (không sửa bản lưu cũ).');return s;
}
function tick(s,now=Date.now()){
 assert(valid(s),'Save không hợp lệ');if(now<=s.lastTick)return;
 const seconds=gameElapsedSeconds(s,s.lastTick,now);s.lastTick=now;
 const rates=rate(s);for(const k of C.keys) s.res[k]+=rates[k]*seconds/3600;cap(s);
 const ap=typeof API.fameApStats==='function'?API.fameApStats(s.fame):{max:s.apMax,perHour:s.apMax*.1};
 s.apMax=ap.max;s.ap=Math.min(s.apMax,s.ap+ap.perHour*seconds/3600);
 let left=seconds;
 while(s.training.length&&left>0){let task=s.training[0];const use=Math.min(left,task.remaining);task.remaining-=use;left-=use;if(task.remaining<=0.00001){s.army[task.unitId]=(s.army[task.unitId]||0)+task.count;note(s,`Hoàn tất tuyển ${task.count} ${getUnit(s,task.unitId).name}.`);s.training.shift();}else break;}
 if(s.march){s.march.remaining=Math.max(0,s.march.remaining-seconds);if(s.march.remaining<=0&&s.march.phase!=='return')battleOpen(s);}
}
function armyPower(s){return activeArmy(s).reduce((sum,u)=>sum+s.army[u.id]*u.atk,0)}
function killUnits(s,damage){let rest=damage,dead=0;for(let u of activeArmy(s).sort((a,b)=>a.tier-b.tier)){
 if(rest<=0)break;const d=Math.min(s.army[u.id],Math.ceil(rest/(u.hp||10)));s.army[u.id]-=d;dead+=d;rest-=d*u.hp;
 if(s.buildings.arena>=1){const frac=(s.woundFraction?.[u.id]||0)+d*.75;const wounded=Math.floor(frac);s.woundFraction=s.woundFraction||{};s.woundFraction[u.id]=frac-wounded;s.wounded[u.id]=(s.wounded[u.id]||0)+wounded;}
 }return dead;
}
function battleSelect(s,id){assert(s.battle,'Không có trận chiến');const st=[...s.battle.allies,...s.battle.enemies].find(t=>t.id===id&&t.pool>0);assert(st,'Đội quân không tồn tại');if(st.side==='enemy')s.battle.focused=id;else s.battle.selected=id;return st;}
function alive(arr){return arr.filter(u=>u.pool>0)}
function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
// SRC23 describes an auto target judged highest in military power; SRC24 says melee prefers the threatening stack in closest range while ranged attacks the strongest stack. The original score is missing; ATK×living-count is our explicit model.
function combatStackPower(u){return Math.max(0,u.atk*u.count)}
function casualty(s,unitId,n,slot=null){if(n<=0)return;const pool=s.expedition?.army||s.army;pool[unitId]=Math.max(0,(pool[unitId]||0)-n);const formation=s.expedition?.formation||s.formation;if(slot!==null&&formation?.[slot])formation[slot].count=Math.max(0,formation[slot].count-n);
 if(s.buildings.arena>=1){const fraction=(s.woundFraction[unitId]||0)+n*.75;const count=Math.floor(fraction);s.woundFraction[unitId]=fraction-count;s.wounded[unitId]=(s.wounded[unitId]||0)+count;}}
function advance(a,b){
 const step=a.range>1?1:a.spd>=7?2:1;
 for(let i=0;i<step&&dist(a,b)>a.range;i++){
  const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
  if(Math.abs(b.x-a.x)>Math.abs(b.y-a.y))a.x=Math.max(0,Math.min(11,a.x+dx));
  else if(dy)a.y=Math.max(0,Math.min(8,a.y+dy));
  else a.x=Math.max(0,Math.min(11,a.x+dx));
 }
}
function strike(s,b,actor,target,order){
 if(actor.pool<=0||target.pool<=0)return 0;
 if(order==='advance'){if(dist(actor,target)>actor.range)advance(actor,target);return 0}
 if(dist(actor,target)>actor.range){if(order!=='defend')advance(actor,target);if(dist(actor,target)>actor.range)return 0;}
 const h=s.heroes.find(x=>x.id===s.activeHero);
 const bonus=actor.side==='player'?(1+(h?.atk||0)/100):1;
 const multiplier=order==='focus'?1.22:order==='defend'?.65:1;
 const base=actor.atk*actor.atk/(actor.atk+Math.max(1,target.def));
 const defendFactor=target.side==='player'?(1+(h?.def||0)/100):1;
 // The dated/community combat example reports 47,897 damage for an exact
 // 47,897.94 NPC calculation, so truncate the final stack result as observed.
 const dmg=Math.max(1,Math.floor(actor.count*base*bonus*multiplier/defendFactor));
 target.pool=Math.max(0,target.pool-dmg);
 const lost=Math.min(target.count,Math.max(0,target.count-Math.ceil(target.pool/target.hp)));
 if(lost>0){target.count-=lost;if(target.side==='player')casualty(s,target.unitId,lost,target.slot)}
 return dmg;
}
function battleAct(s,action){
 assert(!!s.battle,'Không có trận chiến');assert(['attack','advance','defend','focus','retreat'].includes(action),'Lệnh không hợp lệ');
 const b=s.battle;
 if(action==='retreat'){note(s,'Quân đội đã rút lui; thiệt hại trước đó không hoàn lại.');s.battle=null;s.battleAuto=false;return {type:'retreat'}}
 b.autoUntil=Date.now()+10_000;b.order=action;b.orders=b.orders||{};if(b.selected)b.orders[b.selected]=action;s.battleOrder=action;
 // 2009 Chinese player guidance describes speed-descending turns, then the
 // left formation column top-to-bottom followed by the next column. Keep the
 // equal-speed tie-break tied to the actual battlefield positions.
 const participants=[...alive(b.allies),...alive(b.enemies)].sort((x,y)=>y.spd-x.spd||x.x-y.x||x.y-y.y||x.id.localeCompare(y.id));
 let dealt=0,lost=0;const acted=[],lastTargets={};
 for(const actor of participants){
  if(actor.pool<=0)continue;
  const enemy=actor.side==='player'?alive(b.enemies):alive(b.allies);if(!enemy.length)break;
  const stance=actor.side==='player'?(b.orders[actor.id]||'attack'):'attack';
  const pref=actor.side==='player'&&b.focused&&stance==='focus'?enemy.find(t=>t.id===b.focused):null;
  const target=pref||[...enemy].sort((x,y)=>{const near=actor.range>1?0:dist(actor,x)-dist(actor,y),power=stance==='attack'?combatStackPower(y)-combatStackPower(x):0;return actor.range>1?power||near||x.id.localeCompare(y.id):near||power||x.id.localeCompare(y.id)})[0];
  lastTargets[actor.id]=target.id;acted.push(actor.id);
  const amount=strike(s,b,actor,target,stance);
  if(actor.side==='player')dealt+=amount;else lost+=amount;
 }
 const turn=b.turn++;b.lastActOrder=acted.slice();b.lastTargets=lastTargets;b.history.unshift(`Lượt ${turn}: quân ta gây ${dealt} sát thương, chịu ${lost}.`);b.history=b.history.slice(0,12);
 if(!alive(b.enemies).length){const tile=getTile(b.target),hero=s.heroes.find(h=>h.id===s.activeHero);
  if(b.kind==='treasure'){if(!Array.isArray(s.treasureCleared))s.treasureCleared=[];if(!s.treasureCleared.includes(tile.key))s.treasureCleared.push(tile.key);add(s,{gold:75*b.level,wood:8*b.level,ore:8*b.level,sulfur:5*b.level,crystal:5*b.level});note(s,`Đánh thắng kho báu cấp ${b.level}; đã dọn vị trí. Phần quà tài nguyên phụ là mô hình.`)}
  else if(tile.kind==='mine'){s.mines.push({key:tile.key,res:tile.value,level:tile.level,cityId:s.activeCityId||'main'});note(s,`Chiếm mỏ ${C.resource[tile.value].label} ★${tile.level}.`)}
  else if(tile.kind==='castle'){s.cleared.push(tile.key);note(s,`Đánh chiếm thành trung lập ${tile.value||tile.key}.`)}
  else{add(s,{gold:75*tile.level,wood:8*tile.level,ore:8*tile.level,sulfur:5*tile.level,crystal:5*tile.level});s.cleared.push(tile.key);note(s,`Đánh bại ${tile.value}.`)}
  if(hero){hero.xp+=30*b.level;while(hero.xp>=hero.level*80){hero.xp-=hero.level*80;hero.level++;hero.atk+=2;hero.def+=1;}}
  s.fame+=10*b.level;s.battle=null;s.battleAuto=false;return {type:'win',dealt,lost,order:acted.slice()};
 }
 if(b.turn>70){note(s,'Trận đánh hết 70 lượt mô phỏng; tướng rút khỏi giao tranh.');s.battle=null;s.battleAuto=false;return {type:'timeout',dealt,lost,order:acted.slice()};}
 if(!alive(b.allies).length){note(s,'Thua trận, thương binh đưa về Arena.');s.battle=null;s.battleAuto=false;return {type:'lose',dealt,lost,order:acted.slice()};}
 return {type:'continue',dealt,lost,order:acted.slice()};
}
function heal(s){let count=0,cost=0;for(const [id,n] of Object.entries(s.wounded)){const u=getUnit(s,id);if(!u||!n)continue;count+=n;cost+=Math.ceil(u.cost.gold*.35*n)}assert(count>0,'Không có quân thương');assert(s.res.gold>=cost,'Không đủ vàng chữa thương');s.res.gold-=cost;for(let [id,n] of Object.entries(s.wounded))s.army[id]=(s.army[id]||0)+n;s.wounded={};note(s,`Phục hồi ${count} quân tại Arena, -${cost} vàng (giá mô phỏng).`);return cost;}
function setSpeed(s,v){assert(v===1||v===60,'Chế độ không hợp lệ');s.speed=v;note(s,`Tốc độ ${v}× (chế độ trải nghiệm).`)}
const API={V,SAVE_KEY,PREV_SAVE_KEY,C,MAX_OFFLINE_WALL_SECONDS,gameElapsedSeconds,make,valid,clone,upgradeSaveV02,fmt,rate,limits,cap,canAfford,spend,add,buildCost,upgrade,recruitCost,recruit,spellCost,learn,hire,appoint,selectHero,getUnit,arrUnits,TILES,WIDTH,HEIGHT,WORLD_BUILDINGS,NPC_STAR_GUIDE,NPC_CAMPS_2009,TREASURE_GEAR_GUIDE,TREASURE_CAMPS_2009,getTreasureCamp:key=>TREASURE_BY_KEY.get(key)||null,getTile,pathfind,setFormation,startMarch,activeArmy,tick,armyPower,makeBattle,battleSelect,battleAct,heal,setSpeed,note,buildOrder};
root.HOG_ENGINE=API;if(typeof module==='object'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);


