/* Original engine code for Hẻoofgaia HG-only prototype v0.2. No reverse-engineered server code. */
(function(root){
'use strict';
const C=root.HOG_CATALOG||(typeof require==='function'?require('./data.js'):null);
const V=5, SAVE_KEY='heoofgaia_hg_only_v04', PREV_SAVE_KEY='heoofgaia_hg_only_v03';
const buildOrder=['hall','barracks','heroTower','tavern','warehouse','magicTower','arena','market','bazaar','embassy','stables','forge'];
const BATTLE_GRID=Object.freeze({cols:12,rows:9,top:173,bottom:185});
// One geometry contract powers engine movement/range and the Canvas renderer.
// Saved stack coordinates remain integer odd-r offset cells (Save v07).
const HEX_DIRECTIONS=Object.freeze([[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(d=>Object.freeze(d)));
const battleHex=Object.freeze({
 orientation:'pointy-top',layout:'odd-r',directions:HEX_DIRECTIONS,
 offsetToAxial(x,y){return {q:x-Math.floor(y/2),r:y}},
 axialToOffset(q,r){const x=q+Math.floor(r/2);return {x:Object.is(x,-0)?0:x,y:Object.is(r,-0)?0:r}},
 offsetToCube(x,y){const a=this.offsetToAxial(x,y);return {x:a.q,y:-a.q-a.r,z:a.r}},
 distance(a,b){const x=this.offsetToAxial(a.x,a.y),y=this.offsetToAxial(b.x,b.y),dq=x.q-y.q,dr=x.r-y.r;return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))},
 neighbors(x,y){const a=this.offsetToAxial(x,y);return HEX_DIRECTIONS.map(([q,r])=>this.axialToOffset(a.q+q,a.r+r))},
 inBounds(x,y,grid=BATTLE_GRID){return Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<grid.cols&&y<grid.rows},
 center(x,y,radius,origin={x:0,y:0}){return {x:origin.x+Math.sqrt(3)*radius*(x+(y%2?0.5:0)),y:origin.y+1.5*radius*y}},
 corners(x,y,radius,origin={x:0,y:0}){const c=this.center(x,y,radius,origin);return Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return {x:c.x+radius*Math.cos(a),y:c.y+radius*Math.sin(a)}})},
 cubeRound(q,r){let x=q,z=r,y=-x-z,rx=Math.round(x),ry=Math.round(y),rz=Math.round(z),dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return {q:rx,r:rz}},
 pixelToCell(px,py,radius,origin,grid=BATTLE_GRID){if(!(radius>0)||!Number.isFinite(px)||!Number.isFinite(py))return null;const dx=px-origin.x,dy=py-origin.y,q=(Math.sqrt(3)/3*dx-dy/3)/radius,r=(2/3*dy)/radius,a=this.cubeRound(q,r),cell=this.axialToOffset(a.q,a.r);return this.inBounds(cell.x,cell.y,grid)?cell:null}
});
// Simulated offline defaults: historical formation/range values are not verified.
// Hex radii 9/10 stay close to the previous 11/12 Manhattan target reachability.
const TACTICAL_RANGE=Object.freeze({melee:1,ranged:9,eliteRanged:10});
function unitTacticalRange(unit){return unit?.type==='Ranged'?(unit.tier>=8?TACTICAL_RANGE.eliteRanged:TACTICAL_RANGE.ranged):TACTICAL_RANGE.melee;}
const BASE_HOURLY={gold:160,wood:12,ore:12,sulfur:6,crystal:6}; // Wiki recorded base production
// HG39 pacing profile is applied once after all effective HG38 modifiers.
// This is an offline game-speed setting, not a claim about the original server.
const HG39_CONFIG=Object.freeze({productionMultiplier:20,recruitSpeedMultiplier:50,
 constructionSpeedMultiplier:10,warehouseCapacityMultiplier:100,
 minimumRecruitGameSeconds:1,minimumConstructionGameSeconds:1});
// HG10 offline catch-up: process at most 24 real wall-clock hours in one suspended-time step.
// This is a bounded runtime policy, not an asserted Heroes of Gaia server rule.
const MAX_OFFLINE_WALL_SECONDS=24*3600;
function gameElapsedSeconds(s,from,now){
 if(!Number.isFinite(from)||!Number.isFinite(now)||now<=from)return 0;
 const wallSeconds=Math.min(MAX_OFFLINE_WALL_SECONDS,(now-from)/1000);
 return wallSeconds*(s.speed===1?1:60);
}
function assert(ok,msg){if(!ok)throw new Error(msg)}
function make(race='human',now=Date.now(),spellEdition='international'){
 assert(!!C.races[race],'Chủng tộc không tồn tại');
 assert(['international','china2009'].includes(spellEdition),'Bộ phép không hợp lệ');
 const army={};C.units[race].forEach(u=>army[u.id]=0);army[`${race}_1`]=16;
 return {version:V,race,spellEdition,created:now,lastTick:now,speed:60,
  res:{gold:8000,wood:900,ore:900,sulfur:350,crystal:350},
  buildings:{hall:1,barracks:1,heroTower:1,tavern:1,warehouse:2,magicTower:1,arena:1,market:0,bazaar:0,embassy:0,stables:0,forge:0},
  spells:{},army,wounded:{},heroes:[{id:1,name:{human:'Aldric',elf:'Elaria',orc:'Gorak',undead:'Morwen'}[race],level:1,xp:0,atk:12,def:8,spd:7,int:6}],activeHero:1,castellan:null,ap:100,apMax:150,selected:null,
  formation:[],training:[],march:null,battle:null,battleAuto:false,battleOrder:'attack',battleTarget:null,mines:[],cleared:[],treasureCleared:[],woundFraction:{},fame:5,log:['Khởi đầu một thành trì ở vùng đất Gaia.'],serial:1};
}
function valid(s){return !!(s&&s.version===V&&C.races[s.race]&&s.res&&s.army&&s.buildings&&Array.isArray(s.heroes)&&Array.isArray(s.training)&&Array.isArray(s.log)&&Number.isFinite(s.lastTick))}
function arrUnits(s){return C.units[s.race].concat(C.rewardUnits?.[s.race]||[])}
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
 if(s.hg20?.version===1){
  for(const k of C.keys)out[k]*=5;
  if(s.hg20.collection?.specialCityKey&&s.cities?.some(q=>q.key===s.hg20.collection.specialCityKey))
   for(const k of C.keys)out[k]*=1.5;
 }
 for(const k of C.keys)out[k]*=HG39_CONFIG.productionMultiplier;
 return out;
}
function limits(s){const l=s.buildings.warehouse||0;const table={0:[1500,1500,750,750,15000],1:[1500,1500,750,750,15000],2:[1500,1500,750,750,15000],3:[1500,1500,750,750,15000],4:[3000,3000,1500,1500,30000],5:[5250,5250,2625,2625,52500],6:[8250,8250,4125,4125,82500],7:[12000,12000,6000,6000,120000],8:[16500,16500,8250,8250,165000],9:[21000,21000,10500,10500,210000],10:[27000,27000,13500,13500,270000]};const [wood,ore,sulfur,crystal,gold]=table[Math.min(10,l)]; const f=(1+(s.spells.storing||0)*.05)*(s.hg20?.version===1?10:1)*HG39_CONFIG.warehouseCapacityMultiplier;return {gold:gold*f,wood:wood*f,ore:ore*f,sulfur:sulfur*f,crystal:crystal*f};}
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
 // Offline world expansion: preserve all existing castles and sourced NPC,
 // treasure and visitable tiles. Generated sites are marked MODELED.
 const candidates=[];
 for(let y=7;y<97;y+=9)for(let x=7;x<97;x+=8){
  const t=at(x,y);
  if(t.kind!=='empty'||t.terrain==='water'||t.terrain==='bridge')continue;
  if(tiles.some(other=>other.kind==='castle'&&Math.abs(other.x-x)+Math.abs(other.y-y)<6))continue;
  candidates.push(t);
 }
 candidates.sort((a,b)=>((a.x*89+a.y*31)%997)-((b.x*89+b.y*31)%997)||a.y-b.y||a.x-b.x);
 const EXTRA_CASTLES=54;
 if(candidates.length<EXTRA_CASTLES)throw Error('Not enough unoccupied sites for modeled offline castles');
 const races=['human','elf','orc','undead'];
 for(let i=0;i<EXTRA_CASTLES;i++){
  const t=candidates[i];t.kind='castle';t.race=races[(i+Math.floor(t.x/8)+Math.floor(t.y/9))%4];
  t.level=i===1?1:Math.min(5,1+Math.floor((t.x+t.y)/45));t.value=`Thành biên ${String(i+1).padStart(2,'0')}`;
  t.aiOwner=i%3!==0;t.source='MODELED_OFFLINE_CITY';t.terrain='plain';
 }
 // HG18: 9-10 star boss sites are original offline-map placements. Fandom
 // confirms Demon tier-11/12 monsters; positions and guardian counts are modeled.
 let eliteCount=0;
 for(const [x,y,star,name] of [[18,92,9,'Azrael'],[82,91,9,'Cyclop Tyrant'],[29,86,10,'Fiery Giant'],[70,76,10,'Earth Bear']]){
  let t=at(x,y);
  if(t.kind!=='empty'||t.terrain==='water')t=tiles.find(q=>q.kind==='empty'&&q.terrain!=='water'&&Math.abs(q.x-x)+Math.abs(q.y-y)<7);
  if(!t)throw Error('HG18 elite world site blocked');
  t.kind='npc';t.level=star;t.value=name;t.source='MODELED_HG18_BOSS';t.eliteTier=star===9?11:12;t.terrain='plain';eliteCount++;
 }
 if(eliteCount!==4)throw Error('Missing HG18 bosses');
 return tiles;
}
const TILES=mapTiles(), TILE_LOOKUP=new Map(TILES.map(t=>[t.key,t]));
function getTile(key){return TILE_LOOKUP.get(key)}
// HG-16 offline navigation weights. A hill route is genuinely slower;
// roads are worthwhile, so shortest-step BFS is not always the fastest route.
const WORLD_TERRAIN_COST=Object.freeze({road:8,plain:10,bridge:11,forest:13,hill:15});
function terrainStepCost(tile){return WORLD_TERRAIN_COST[tile?.terrain]??10;}
function pathfind(fromKey,toKey){
 const start=getTile(fromKey),goal=getTile(toKey);assert(start&&goal,'Tọa độ không tồn tại');
 if(start.terrain==='water'||goal.terrain==='water')return null;
 // Dijkstra with a small binary heap. Four cardinal neighbors, deterministic
 // tie order, and integral weights to avoid floating-point route drift.
 const heap=[],scores=new Map([[start.key,0]]),previous=new Map([[start.key,null]]);
 const push=(key,cost)=>{const v={key,cost};heap.push(v);let i=heap.length-1;
  while(i){const p=(i-1)>>1;if(heap[p].cost<=v.cost)break;heap[i]=heap[p];i=p}heap[i]=v;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;
  while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].cost<heap[j].cost)j++;
   if(last.cost<=heap[j].cost)break;heap[i]=heap[j];i=j}heap[i]=last}return first;};
 push(start.key,0);
 while(heap.length){
  const {key,cost}=pop();if(cost!==scores.get(key))continue;if(key===goal.key)break;
  const tile=getTile(key);
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const other=getTile(`${tile.x+dx},${tile.y+dy}`);
   if(!other||other.terrain==='water')continue;
   const next=cost+terrainStepCost(other);
   if(next<(scores.get(other.key)??Infinity)){
    scores.set(other.key,next);previous.set(other.key,key);push(other.key,next);
   }
  }
 }
 if(!scores.has(goal.key))return null;
 const result=[];for(let k=goal.key;k!==null;k=previous.get(k))result.push(k);
 return result.reverse();
}
function pathTravelCost(path){
 assert(Array.isArray(path)&&path.length>0,'Đường hành quân không hợp lệ');
 let units=0;
 for(let i=1;i<path.length;i++){
  const a=getTile(path[i-1]),b=getTile(path[i]);
  // Preserve the original unit-test contract for symbolic paths; real game
  // and serialized routes always contain known adjacent world coordinates.
  if(!a||!b){units++;continue}
  assert(b.terrain!=='water'&&Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1,'Đường bộ chứa đoạn không hợp lệ');
  units+=terrainStepCost(b)/10;
 }
 return Math.round(units*1000)/1000;
}
function armyMarchFactor(s,groups){
 const selected=groups||(s.formation?.length?s.formation:arrUnits(s).filter(u=>s.army[u.id]>0).map(u=>({unitId:u.id,count:s.army[u.id]})));
 let slowest=Infinity;
 for(const group of selected||[]){
  if(!group?.count||group.count<=0)continue;
  const unit=arrUnits(s).find(u=>u.id===group.unitId);
  if(unit)slowest=Math.min(slowest,unit.spd);
 }
 return slowest===Infinity?1:Math.max(.8,Math.min(1.10,.8+slowest/40));
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
// SRC20/SRC58 report +0.02 troop speed per Hero SPD point for the
// Chinese 2009 battle model. SRC42 says march duration depends on distance,
// while the exact land-march coefficient is missing. Reuse the sourced
// increment as a normalized, explicitly derived world-speed proxy (SPD 10 = 1x).
function heroSpeedAdjustment(heroSpeed){
 assert(Number.isFinite(heroSpeed),'Tốc độ tướng không hợp lệ');
 return (heroSpeed-10)/50;
}
function marchSpeedFactor(heroSpeed){return Math.max(.1,1+heroSpeedAdjustment(heroSpeed));}
function marchDuration(heroSpeed,path,armyFactor=1){
 assert(Number.isFinite(armyFactor)&&armyFactor>0,'Hệ số hành quân quân đội không hợp lệ');
 assert(Array.isArray(path)&&path.length>0,'Đường hành quân không hợp lệ');
 return Math.max(40,Math.ceil(20+pathTravelCost(path)*19/(marchSpeedFactor(heroSpeed)*armyFactor)));
}
function startMarch(s,key,targetKind){
 assert(!s.march&&!s.battle,'Tướng đang bận');
 const t=getTile(key),camp=TREASURE_BY_KEY.get(key),isTreasure=targetKind==='treasure'||(!targetKind&&t?.kind==='treasure');
 assert(t&&(isTreasure?!!camp:['mine','npc','castle'].includes(t.kind)),'Chọn mỏ, quái, kho báu hoặc thành trung lập');
 assert(isTreasure?!s.treasureCleared?.includes(key):t.kind==='npc'||!s.cleared.includes(key),'Mục tiêu đã hoàn thành');
 assert(t.kind==='npc'||!s.cleared.includes(key)||isTreasure,'Mục tiêu đã hoàn thành');
 assert(s.formation?.length?s.formation.some(g=>g.count>0):Object.values(s.army).some(n=>n>0),'Không có quân được phân bổ');
 const hero=s.heroes.find(h=>h.id===s.activeHero);assert(hero&&s.castellan!==hero.id,'Tướng không sẵn sàng');
 const homeKey=s.activeCastleKey||'3,4';const path=pathfind(homeKey,key);assert(path&&path.length>1,'Không tìm thấy đường đi bộ qua địa hình');
 const apCost=!isTreasure&&t.kind==='mine'?6:8;assert(s.ap>=apCost,'Thiếu AP');s.ap-=apCost;
 const seconds=marchDuration(hero.spd,path,armyMarchFactor(s));
 s.march={target:key,...(isTreasure?{targetKind:'treasure'}:{}),fromKey:homeKey,remaining:seconds,total:seconds,heroId:hero.id,path};
 note(s,`${hero.name} dẫn quân đi ${path.length-1} ô tới (${t.x},${t.y}), -${apCost} AP.`);
}
function activeArmy(s){return arrUnits(s).filter(u=>s.army[u.id]>0)}
function makeBattle(s,target,remainingRatio=1,targetKind){
 const rawTile=getTile(target),camp=TREASURE_BY_KEY.get(target),isTreasure=targetKind==='treasure'||(!targetKind&&rawTile?.kind==='treasure');
 assert(!isTreasure||!!camp,'Không có trại kho báu tại tọa độ này');
 assert(!!rawTile&&(rawTile.kind!=='empty'||isTreasure),'Mục tiêu trận chiến không hợp lệ');
 const tile=isTreasure?{...rawTile,kind:'treasure',value:`Kho báu cấp ${camp.level}`,level:camp.level,treasureCamp:camp}:rawTile;
 const aiCity=tile.kind==='castle'?root.HOG_ENGINE?.aiCityAt?.(s,target):null;
 const lv=aiCity?.level||tile.level||1;
 const fieldArmy=s.expedition?.army||s.army,fieldFormation=s.expedition?.formation||s.formation;
 const available=arrUnits(s).filter(u=>(fieldArmy[u.id]||0)>0);
 const selected=(fieldFormation?.length?fieldFormation:available.sort((a,b)=>b.tier-a.tier).slice(0,7).map(u=>({unitId:u.id,count:fieldArmy[u.id]})));
 // Ranged reach is a bounded 11–12-cell tactical model, not sourced 2009 range.
 const battleHeroSpeed=(root.HOG_ENGINE?.heroStats?root.HOG_ENGINE.heroStats(s,s.activeHero)?.spd:null)??s.heroes.find(h=>h.id===s.activeHero)?.spd??10;
 const allies=selected.filter(p=>p.count>0).map((p,i)=>{const u=getUnit(s,p.unitId),count=Math.min(p.count,fieldArmy[u.id]||0);return {id:`p${i}`,slot:fieldFormation?.length?i:null,side:'player',unitId:u.id,name:u.name,range:unitTacticalRange(u),
   count,initial:count,hp:u.hp,atk:u.atk,def:u.def,spd:Math.max(.1,u.spd+heroSpeedAdjustment(battleHeroSpeed)),
   pool:count*u.hp,x:i<4?1:3,y:i<4?[0,2,5,8][i]:[1,4,7][i-4]}});
 const archetypes=tile.eliteTier>=11?(
   tile.eliteTier===12?
    [{name:'Fiery Giant',hp:1101,atk:290,def:170,spd:9.58,range:1},
     {name:'Earth Bear',hp:1101,atk:290,def:170,spd:9.58,range:1},
     {name:'Fallen Treant',hp:1101,atk:290,def:170,spd:9.58,range:1}]:
    [{name:'Azrael',hp:800,atk:230,def:155,spd:11.89,range:1},
     {name:'Demonlord Samurai',hp:800,atk:230,def:155,spd:11.89,range:1},
     {name:'Cyclop Tyrant',hp:800,atk:230,def:155,spd:11.89,range:1}]
  ):[{name:'Dã thú',hp:37,atk:13,def:9,spd:4,range:1},
  {name:'Cung thủ cướp',hp:34,atk:16,def:9,spd:5,range:TACTICAL_RANGE.ranged},
  {name:'Vệ binh',hp:55,atk:20,def:15,spd:3.8,range:1}];
 // AI fortresses deploy persisted resource-funded garrisons instead of generic monsters.
 const enemies=aiCity?Object.entries(aiCity.garrison).filter(([,count])=>count>0).slice(0,3).map(([unitId,count],i)=>{
  const u=C.units[aiCity.race].find(x=>x.id===unitId);
  assert(!!u&&Number.isSafeInteger(count)&&count>0,'Dữ liệu quân phòng thủ AI không hợp lệ');
  return {id:`e${i}`,side:'enemy',unitId:u.id,name:u.name,range:unitTacticalRange(u),
   count,initial:count,hp:u.hp,atk:u.atk,def:u.def,spd:u.spd,pool:count*u.hp,x:10,y:2+i*3};
 }):archetypes.slice(0,lv>=2?3:2).map((e,i)=>{
  const c=Math.max(2,Math.ceil((lv*.8+1.7)*(i===0?2:1)));
  return {id:`e${i}`,side:'enemy',unitId:null,name:e.name,range:e.range,count:c,initial:c,hp:e.hp,atk:e.atk+lv*2,def:e.def+lv,
   spd:e.spd,pool:c*e.hp,x:10,y:2+i*3};
 });
 for(const e of enemies){e.pool=Math.max(1,Math.ceil(e.pool*remainingRatio));e.count=Math.ceil(e.pool/e.hp)}
 const battle={target,name:tile.kind==='mine'?`${C.resource[tile.value].label} mine`:tile.value,kind:tile.kind,level:lv,...(isTreasure?{treasureCamp:{...camp}}:{}),
   turn:1,order:'attack',orders:{},focused:null,selected:allies[0]?.id||null,autoUntil:Date.now()+10_000,allies,enemies,
   woundedByUnit:{},history:['Tướng triển khai quân đội. Đội hình và AI hiện là bản thử nghiệm.']};
 return root.HOG_ENGINE?.hg40PrepareBattle?.(s,battle)||battle;
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
function dist(a,b){return battleHex.distance(a,b)}
function battleTargetsInRange(b,actorId){const actor=b?.allies?.find(u=>u.id===actorId&&u.pool>0);return actor?alive(b.enemies||[]).filter(target=>dist(actor,target)<=actor.range).map(target=>target.id):[]}
function battleCellKey(x,y){return `${x},${y}`}
function battlePath(b,actor,destination){
 if(!battleHex.inBounds(destination?.x,destination?.y))return null;
 if(destination.x===actor.x&&destination.y===actor.y)return [];
 const occupied=new Set([...b.allies,...b.enemies].filter(u=>u.pool>0&&u.id!==actor.id).map(u=>battleCellKey(u.x,u.y)));
 if(occupied.has(battleCellKey(destination.x,destination.y)))return null;
 const start=battleCellKey(actor.x,actor.y),goal=battleCellKey(destination.x,destination.y),queue=[[actor.x,actor.y]],previous=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],key=battleCellKey(x,y);if(key===goal)break;
  for(const cell of battleHex.neighbors(x,y)){const {x:nx,y:ny}=cell,next=battleCellKey(nx,ny);if(!battleHex.inBounds(nx,ny)||occupied.has(next)||previous.has(next))continue;previous.set(next,key);queue.push([nx,ny])}
 }
 if(!previous.has(goal))return null;
 const path=[];for(let key=goal;key!==start;key=previous.get(key)){const [x,y]=key.split(',').map(Number);path.push({x,y})}return path.reverse();
}
function battleMovementBudget(b,actor,commitCredit=false){
 const joint=!!(b?.hg21Tower||b?.hg261Joint);
 let base=actor.range>1?1:actor.spd>=7?2:1;
 base=Math.max(1,Math.min(3,base+(root.HOG_ENGINE?.hg40MoveModifier?.(b,actor)||0)));
 const skill=joint?b.heroMovementInstinct?.[actor.heroId]:b?.movementInstinct;
 if(actor.side!=='player'||actor.range>1||!skill)return base;
 if(joint?b.turn>=skill.expiry:b.activeSpell?.id!==skill.id||b.turn>=b.activeSpell?.expiry)return base;
 const total=(Number.isFinite(actor.moveCredit)?actor.moveCredit:0)+base*.015*skill.level;
 const bonus=Math.floor(total+1e-9);if(commitCredit)actor.moveCredit=Number((total-bonus).toFixed(8));return base+bonus;
}
function battleMovementAllowance(b,actor){return battleMovementBudget(b,actor,true)}
function battleMovePreview(b,actorId){
 const actor=b?.allies?.find(u=>u.id===actorId&&u.pool>0);if(!actor)return {unitId:actorId||null,steps:0,cells:[]};
 const steps=battleMovementBudget(b,actor,false),occupied=new Set([...b.allies,...b.enemies].filter(u=>u.pool>0&&u.id!==actor.id).map(u=>battleCellKey(u.x,u.y)));
 const queue=[{x:actor.x,y:actor.y,steps:0}],seen=new Set([battleCellKey(actor.x,actor.y)]),cells=[];
 for(let i=0;i<queue.length;i++){const cell=queue[i];if(cell.steps>=steps)continue;for(const nextCell of battleHex.neighbors(cell.x,cell.y)){const {x,y}=nextCell,key=battleCellKey(x,y);if(!battleHex.inBounds(x,y)||occupied.has(key)||seen.has(key))continue;seen.add(key);const next={x,y,steps:cell.steps+1};queue.push(next);cells.push(next)}}
 return {unitId:actor.id,steps,cells};
}
function moveBattleStack(b,actor,destination){
 const path=battlePath(b,actor,destination);if(!path?.length)return null;
 // Reuse the existing Advance movement allowance. Exact original per-turn movement is unknown.
 const allowance=battleMovementAllowance(b,actor),from={x:actor.x,y:actor.y};let steps=0;
 for(const cell of path.slice(0,allowance)){
  if([...b.allies,...b.enemies].some(u=>u.pool>0&&u.id!==actor.id&&u.x===cell.x&&u.y===cell.y))break;
  actor.x=cell.x;actor.y=cell.y;steps++;
 }
 return steps?{unitId:actor.id,from,to:{x:actor.x,y:actor.y},steps,destination:{x:destination.x,y:destination.y},path:path.slice(0,steps)}:null;
}
// SRC23 describes an auto target judged highest in military power; SRC24 says melee prefers the threatening stack in closest range while ranged attacks the strongest stack. The original score is missing; ATK×living-count is our explicit model.
function combatStackPower(u){return Math.max(0,u.atk*u.count)}
function casualty(s,unitId,n,slot=null){if(n<=0)return;const pool=s.expedition?.army||s.army;pool[unitId]=Math.max(0,(pool[unitId]||0)-n);const formation=s.expedition?.formation||s.formation;if(slot!==null&&formation?.[slot])formation[slot].count=Math.max(0,formation[slot].count-n);
 if(s.buildings.arena>=1){const fraction=(s.woundFraction[unitId]||0)+n*.75;const count=Math.floor(fraction);s.woundFraction[unitId]=fraction-count;s.wounded[unitId]=(s.wounded[unitId]||0)+count;if(s.battle?.woundedByUnit)s.battle.woundedByUnit[unitId]=(s.battle.woundedByUnit[unitId]||0)+count;}}
function advance(a,target,battle){
 // Find a legal shortest route to hex attack range without stepping through a
 // living stack. The same six odd-r neighbors drive player path and hostile AI.
 const occupied=new Set([...battle.allies,...battle.enemies].filter(u=>u.pool>0&&u.id!==a.id).map(u=>battleCellKey(u.x,u.y)));
 const start=battleCellKey(a.x,a.y),queue=[{x:a.x,y:a.y}],previous=new Map([[start,null]]);let goal=null;
 for(let i=0;i<queue.length;i++){
  const p=queue[i],key=battleCellKey(p.x,p.y);if(dist(p,target)<=a.range){goal=key;break}
  for(const cell of battleHex.neighbors(p.x,p.y)){
   const {x,y}=cell,next=battleCellKey(x,y);
   if(!battleHex.inBounds(x,y)||occupied.has(next)||previous.has(next))continue;
   previous.set(next,key);queue.push({x,y});
  }
 }
 if(goal===null||goal===start)return [];
 const path=[];for(let key=goal;key!==start;key=previous.get(key)){const [x,y]=key.split(',').map(Number);path.push({x,y})}path.reverse();
 const allowance=battleMovementAllowance(battle,a),traversed=path.slice(0,allowance),last=traversed[traversed.length-1];a.x=last.x;a.y=last.y;return traversed;
}
// One casualty authority for direct hits, secondary damage and DoT.
function applyBattleDamage(s,b,target,incoming){
 const shield=root.HOG_ENGINE?.hg40Absorb?.(b,target,incoming)||{remaining:incoming,absorbed:0};
 const applied=Math.min(target.pool,Math.max(0,shield.remaining));
 target.pool=Math.max(0,target.pool-applied);
 const casualties=Math.min(target.count,Math.max(0,target.count-Math.ceil(target.pool/target.hp)));
 if(casualties>0){
  target.count-=casualties;
  if(target.side==='player'&&!b.hg21Tower)casualty(s,target.unitId,casualties,target.slot);
 }
 return {applied,absorbed:shield.absorbed,casualties};
}
function strike(s,b,actor,target,order,trace){
 if(actor.pool<=0||target.pool<=0)return 0;
 if(order==='advance'){if(dist(actor,target)>actor.range)trace.path=advance(actor,target,b);return 0}
 if(dist(actor,target)>actor.range){trace.path=advance(actor,target,b);if(dist(actor,target)>actor.range)return 0;}
 // A unit with zero attack must not inflict a fictitious minimum point.
 // The community PvE base is ATK²/(ATK+DEF), including a valid DEF=0 target.
 if(actor.atk<=0||actor.count<=0)return 0;
 // In a tower battle, each stack retains its own commander. The base world
 // campaign continues to use its canonical single activeHero path unchanged.
 const tower=!!(b.hg21Tower||b.hg261Joint);
 const attackId=tower&&actor.side==='player'?actor.heroId:s.activeHero;
 const defenseId=tower&&target.side==='player'?target.heroId:s.activeHero;
 const attacker=s.heroes.find(x=>x.id===attackId),defender=s.heroes.find(x=>x.id===defenseId);
 const attacking=tower&&actor.side==='player'?root.HOG_ENGINE?.heroStats?.(s,attackId):null;
 const defending=tower&&target.side==='player'?root.HOG_ENGINE?.heroStats?.(s,defenseId):null;
 const bonus=actor.side==='player'?(1+((attacking?.atk??attacker?.atk)||0)/100):1;
 // Physical defense alone cannot reduce unit damage below 30% of raw attack.
 // Equipment and Hero defense must follow each stack's owner, never a team-wide buff.
 const rules=root.HOG_ENGINE?.hg40PlanStrike?.(s,b,actor,target,trace)||null;
 const effectiveAtk=Math.max(0,actor.atk*(1-(rules?.atkPenalty||0)));
 // HG40 DEF reductions and direct penetration share one total cap: 25%,
 // 15% against Boss. Previously stacking the two bypassed both limits.
 const defensePenetration=rules?Math.min(rules.defCap??.25,
  1-(1-(rules.defPenalty||0))*(1-(rules.pierce||0))):0;
 const effectiveDef=Math.max(0,target.def*(1-defensePenetration));
 const base=Math.max(effectiveAtk*.30,effectiveAtk*effectiveAtk/(effectiveAtk+effectiveDef||1));
 const defendFactor=target.side==='player'?(1+((defending?.def??defender?.def)||0)/100):1;
 const attackMods=root.HOG_ENGINE?.combatModifiers?.(s,attackId)||{};
 const defenseMods=tower?root.HOG_ENGINE?.combatModifiers?.(s,defenseId)||{}:attackMods;
 const weaponMod=actor.side==='player'?(attackMods.damageBonus||0)+(actor.range>1?(attackMods.rangedDamage||0):(attackMods.meleeDamage||0)):0;
 const armorMod=target.side==='player'?Math.max(0,1-(defenseMods.damageReduction||0)):1;
 const guardMod=target.guardTurn===b.turn?.75:1;
 const mitigation=rules?Math.max(.35,armorMod*guardMod*(1-(rules.reduction||0))):armorMod*guardMod;
 const rawDamage=Math.max(1,Math.floor(actor.count*base*bonus/defendFactor*
  (1+weaponMod)*mitigation*(1+(rules?.bonus||0))));
 const hit=applyBattleDamage(s,b,target,rawDamage);
 const secondary=root.HOG_ENGINE?.hg40AfterHit?.(s,b,actor,target,hit,trace,
  (u,amount)=>applyBattleDamage(s,b,u,amount))||0;
 return hit.applied+secondary;
}
function battleAct(s,action,options){
 assert(!!s.battle,'Không có trận chiến');assert(['attack','advance','defend','focus','retreat','move'].includes(action),'Lệnh không hợp lệ');
 const b=s.battle;b.orders=b.orders||{};b.moveTargets=b.moveTargets||{};
 if(b.hg40?.v===1)b.hg40.events=[];
 if(action==='move'){
  const actor=b.allies.find(u=>u.id===b.selected&&u.pool>0);assert(actor,'Hãy chọn một đội quân còn sống để di chuyển.');
  const destination={x:options?.x,y:options?.y},path=battlePath(b,actor,destination);
  assert(path&&path.length>0,'Ô đích không hợp lệ, đang bị chiếm hoặc không thể tới.');
  b.moveTargets[actor.id]=destination;b.orders[actor.id]='move';
 }else if(b.selected&&!options?.preserveMoveOrders){b.orders[b.selected]=action;delete b.moveTargets[b.selected]}
 b.autoUntil=Date.now()+10_000;b.order=action;s.battleOrder=action;
 // Defense is active for the whole current turn, even if a faster enemy moves
 // before the defending group. It costs that group its attack this turn.
 for(const u of alive(b.allies))if(b.orders[u.id]==='defend')u.guardTurn=b.turn;
 // 2009 Chinese player guidance describes speed-descending turns, then the
 // left formation column top-to-bottom followed by the next column. Keep the
 // equal-speed tie-break tied to the actual battlefield positions.
 const participants=[...alive(b.allies),...alive(b.enemies)].sort((x,y)=>y.spd-x.spd||x.x-y.x||x.y-y.y||x.id.localeCompare(y.id));
 let dealt=0,lost=0;const acted=[],lastTargets={},lastMoves=[],lastEvents=[],origins=new Map(participants.map(u=>[u.id,{x:u.x,y:u.y}]));
 const record=(actor,target=null,damage=0,path=null,order='attack',casualties=0)=>{const from=origins.get(actor.id),to={x:actor.x,y:actor.y},route=path?.length?path:(from.x!==to.x||from.y!==to.y?[to]:[]);lastEvents.push({actorId:actor.id,from,to,path:route,targetId:target?.id||null,damage,death:!!(damage>0&&target?.pool<=0),order,casualties})};
 for(const actor of participants){
  if(actor.pool<=0)continue;
  if(root.HOG_ENGINE?.hg40BeforeAction?.(s,b,actor)){
   // Keep the canonical HG10 v07 action enum unchanged. HG40 status data
   // and visual journal carry the reason for this non-attacking turn.
   acted.push(actor.id);record(actor,null,0,[],'defend');continue;
  }
  const enemy=actor.side==='player'?alive(b.enemies):alive(b.allies);if(!enemy.length)break;
  const stance=actor.side==='player'?(b.orders[actor.id]||'attack'):'attack';
  const moveTarget=actor.side==='player'&&stance==='move'?b.moveTargets[actor.id]:null;
  if(actor.side==='player'&&stance==='move'){
   if(!moveTarget){b.orders[actor.id]='attack'}
   else if(actor.x===moveTarget.x&&actor.y===moveTarget.y){delete b.moveTargets[actor.id];b.orders[actor.id]='attack';acted.push(actor.id);record(actor,null,0,[],'move');continue}
   else{
    const movement=moveBattleStack(b,actor,moveTarget);if(movement)lastMoves.push(movement);
    if(actor.x===moveTarget.x&&actor.y===moveTarget.y){delete b.moveTargets[actor.id];b.orders[actor.id]='attack'}
    acted.push(actor.id);record(actor,null,0,movement?.path||[],'move');continue;
   }
  }
  if(actor.side==='player'&&stance==='defend'){acted.push(actor.id);b.orders[actor.id]='attack';record(actor,null,0,[],'defend');continue}
  if(actor.side==='player'&&stance==='retreat'){const x=Math.max(0,actor.x-1);if(![...b.allies,...b.enemies].some(u=>u.pool>0&&u.id!==actor.id&&u.x===x&&u.y===actor.y))actor.x=x;acted.push(actor.id);b.orders[actor.id]='attack';record(actor,null,0,[],'retreat');continue}
  const pref=actor.side==='player'&&b.focused&&stance==='focus'?enemy.find(t=>t.id===b.focused):null;
  // Auto-only target memory: continue engaging the same living stack rather
  // than flip targets whenever a different enemy's relative power changes.
  // Uses existing lastTargets receipts (v07 compatible; no new Save fields).
  // Manual commands and hostile AI preserve their original targeting rules.
  const sticky=actor.side==='player'&&options?.stableTargets&&stance==='attack'&&b.lastTargets?.[actor.id]?
   enemy.find(t=>t.id===b.lastTargets[actor.id]):null;
  const target=pref||sticky||[...enemy].sort((x,y)=>{
   if(b.hg40?.v===1&&root.HOG_ENGINE?.hg40TargetScore){
    const sx=root.HOG_ENGINE.hg40TargetScore(s,b,actor,x);
    const sy=root.HOG_ENGINE.hg40TargetScore(s,b,actor,y);
    return sy-sx||x.id.localeCompare(y.id);
   }
   const near=actor.range>1?0:dist(actor,x)-dist(actor,y),
    power=stance==='attack'?combatStackPower(y)-combatStackPower(x):0;
   return actor.range>1?power||near||x.id.localeCompare(y.id):
    near||power||x.id.localeCompare(y.id);
  })[0];
  lastTargets[actor.id]=target.id;acted.push(actor.id);
  const beforePool=target.pool,beforeCount=target.count,trace={path:[]},amount=strike(s,b,actor,target,stance,trace);record(actor,target,beforePool-target.pool,trace.path,stance,beforeCount-target.count);
  if(actor.side==='player')dealt+=amount;else lost+=amount;
 }
 const turn=b.turn;
 const dot=root.HOG_ENGINE?.hg40EndTurn?.(s,b,turn,
  (u,amount)=>applyBattleDamage(s,b,u,amount))||{dealt:0,lost:0};
 dealt+=dot.dealt;lost+=dot.lost;
 // HG10 Save v07 enforces one canonical lastEvent per actor and the
 // original six order names. Additional HG40 splash/DoT receipts remain in
 // battle.hg40.events rather than corrupting lastEvents/Save.
 b.turn++;b.lastActOrder=acted.slice();b.lastTargets=lastTargets;b.lastMoves=lastMoves;b.lastEvents=lastEvents;const movementSummary=lastMoves.map(m=>`${m.unitId} đi ${m.steps} ô tới (${m.to.x},${m.to.y})`).join('; ');b.history.unshift(`Lượt ${turn}: ${movementSummary?`${movementSummary}; `:''}quân ta gây ${dealt} sát thương, chịu ${lost}.`);b.history=b.history.slice(0,12);
 if(!alive(b.enemies).length){
  if(b.hg21Tower){s.battle=null;s.battleAuto=false;return {type:'win',dealt,lost,order:acted.slice()};}
  const tile=getTile(b.target),hero=s.heroes.find(h=>h.id===s.activeHero);
  if(b.kind==='treasure'){if(!Array.isArray(s.treasureCleared))s.treasureCleared=[];if(!s.treasureCleared.includes(tile.key))s.treasureCleared.push(tile.key);add(s,{gold:75*b.level,wood:8*b.level,ore:8*b.level,sulfur:5*b.level,crystal:5*b.level});note(s,`Đánh thắng kho báu cấp ${b.level}; đã dọn vị trí. Phần quà tài nguyên phụ là mô hình.`)}
  else if(tile.kind==='mine'){s.mines.push({key:tile.key,res:tile.value,level:tile.level,cityId:s.activeCityId||'main'});note(s,`Chiếm mỏ ${C.resource[tile.value].label} ★${tile.level}.`)}
  else if(tile.kind==='castle'){s.cleared.push(tile.key);note(s,`Đánh chiếm thành trung lập ${tile.value||tile.key}.`)}
  else{add(s,{gold:75*tile.level,wood:8*tile.level,ore:8*tile.level,sulfur:5*tile.level,crystal:5*tile.level});if(!s.cleared.includes(tile.key))s.cleared.push(tile.key);note(s,`Đánh bại ${tile.value}. Trại NPC vẫn có thể săn lại, mỗi lượt hành quân tiêu tốn AP.`)}
  if(hero){hero.xp+=30*b.level;while(hero.xp>=hero.level*80){hero.xp-=hero.level*80;hero.level++;hero.atk+=2;hero.def+=1;}}
  s.fame+=10*b.level;s.battle=null;s.battleAuto=false;return {type:'win',dealt,lost,order:acted.slice()};
 }
 if(b.turn>70){note(s,'Trận đánh hết 70 lượt mô phỏng; tướng rút khỏi giao tranh.');s.battle=null;s.battleAuto=false;return {type:'timeout',dealt,lost,order:acted.slice()};}
 if(!alive(b.allies).length){note(s,'Thua trận, thương binh đưa về Arena.');s.battle=null;s.battleAuto=false;return {type:'lose',dealt,lost,order:acted.slice()};}
 return {type:'continue',dealt,lost,order:acted.slice()};
}
function heal(s){let count=0,cost=0;for(const [id,n] of Object.entries(s.wounded)){const u=getUnit(s,id);if(!u||!n)continue;count+=n;cost+=Math.ceil(u.cost.gold*.35*n)}assert(count>0,'Không có quân thương');assert(s.res.gold>=cost,'Không đủ vàng chữa thương');s.res.gold-=cost;for(let [id,n] of Object.entries(s.wounded))s.army[id]=(s.army[id]||0)+n;s.wounded={};note(s,`Phục hồi ${count} quân tại Arena, -${cost} vàng (giá mô phỏng).`);return cost;}
function setSpeed(s,v){assert(v===1||v===60,'Chế độ không hợp lệ');s.speed=v;note(s,`Tốc độ ${v}× (chế độ trải nghiệm).`)}
const API={TACTICAL_RANGE,unitTacticalRange,V,SAVE_KEY,PREV_SAVE_KEY,C,HG39_CONFIG,MAX_OFFLINE_WALL_SECONDS,BATTLE_GRID,battleHex,gameElapsedSeconds,make,valid,clone,upgradeSaveV02,fmt,rate,limits,cap,canAfford,spend,add,buildCost,upgrade,recruitCost,recruit,spellCost,learn,hire,appoint,selectHero,getUnit,arrUnits,TILES,WIDTH,HEIGHT,WORLD_BUILDINGS,NPC_STAR_GUIDE,NPC_CAMPS_2009,TREASURE_GEAR_GUIDE,TREASURE_CAMPS_2009,getTreasureCamp:key=>TREASURE_BY_KEY.get(key)||null,getTile,pathfind,pathTravelCost,terrainStepCost,WORLD_TERRAIN_COST,armyMarchFactor,setFormation,heroSpeedAdjustment,marchSpeedFactor,marchDuration,startMarch,activeArmy,tick,armyPower,makeBattle,battleSelect,battleTargetsInRange,battleMovePreview,battlePath,battleAct,heal,setSpeed,note,buildOrder,battleActCore:battleAct};
root.HOG_ENGINE=API;if(typeof module==='object'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);


