/* HG20 Private campaign: endless tower, hero-based troop allocations and collectibles.
 * Independent original offline mechanics. Never modifies the 40 source units,
 * historical AP/XP tables, battle animations, or Save version 7.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E||E.V!==7||!E.HG18_TASKS)throw Error('HG20 requires completed v07 HG18');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
 setFormation:E.setFormation,selectHero:E.selectHero,startMarch:E.startMarch,
 switchCity:E.switchCity,autoFormation:E.autoFormation,battleAct:E.battleAct,
 heroStats:E.heroStats,appoint:E.appoint};
const SPECIALS=Object.freeze({
 human:{name:'Thiên Giới Thánh Vệ',hp:1100,atk:490,def:365,spd:11,type:'Melee'},
 elf:{name:'Ngân Nguyệt Long Linh',hp:980,atk:520,def:310,spd:13,type:'Ranged'},
 orc:{name:'Viễn Cổ Chiến Thần',hp:1500,atk:570,def:390,spd:10,type:'Melee'},
 undead:{name:'U Minh Bất Diệt Vương',hp:1230,atk:535,def:345,spd:11,type:'Ranged'}
});
const ENEMIES=Object.freeze([
 {name:'U Minh Quỷ Vương',trait:'Bạo kích'},
 {name:'Viễn Cổ Long Hoàng',trait:'Giáp cứng'},
 {name:'Tinh Không Đại Ma',trait:'Phép thuật'},
 {name:'Huyết Nguyệt Ma Thần',trait:'Hút sinh lực'}
]);
const TEMPLATE=(race,info)=>Object.freeze({id:race+'_tower_sovereign',race,tier:10,
 name:info.name,type:info.type,hp:info.hp,atk:info.atk,def:info.def,spd:info.spd,load:200,
 cost:Object.freeze({gold:15000,wood:240,ore:240,sulfur:120,crystal:120}),
 timeSec:0,rewardOnly:true,towerExclusive:true});
C.rewardUnits=Object.freeze(Object.fromEntries(Object.entries(C.rewardUnits).map(([race,rows])=>
 [race,Object.freeze([...rows,TEMPLATE(race,SPECIALS[race])])])));
// Unique capturable city at an existing modeled world position.
const PRIVATE_CASTLE=E.TILES.filter(t=>t.kind==='castle'&&t.aiOwner)
 .sort((a,b)=>(b.x+b.y)-(a.x+a.y)||b.x-a.x)[0];
if(!PRIVATE_CASTLE)throw Error('No private collectible castle');
PRIVATE_CASTLE.value='Thành Huyền Tích';
PRIVATE_CASTLE.privateCollectible=true;
const TOWER_GEAR=[
 ['private_riftblade','Thần Kiếm Vô Tận','weapon','⚔',120,25,6],
 ['private_riftplate','Huyền Giáp Vạn Giới','armor','🛡',20,120,8],
 ['private_riftseal','Thiên Ngoại Thánh Ấn','charm','💠',55,45,18]
];
for(const [id,name,slot,icon,atk,def,spd] of TOWER_GEAR)
 E.ITEMS[id]={id,name,slot,icon,atk,def,spd,int:15,cost:0,level:1,shop:false,towerExclusive:true};
const date=ms=>new Date(ms).toISOString().slice(0,10);
const key=(cityId,heroId)=>cityId+':'+heroId;
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
function ensure(s){
 if(!s.hg20)s.hg20={version:1,plans:{},tower:{floor:1,day:date(s.lastTick),claims:0,
  attempts:0,team:[],essence:0,rank:0,victories:0,last:null},
  collection:{citadel:false,specialCityKey:null,sovereignWins:0,artifacts:[]}};
 const h=s.hg20;
 if(!h||h.version!==1||!h.plans||!h.tower||!h.collection)throw Error('Save HG20 không hợp lệ');
 if(h.collection.specialCityKey===undefined)h.collection.specialCityKey=null;
 if(h.tower.day!==date(s.lastTick)){h.tower.day=date(s.lastTick);h.tower.claims=0;}
 // Existing v07 saves have one active-city formation. It is migrated as the
 // current hero's *plan*, never as additional troops.
 const selected=key(s.activeCityId||'main',s.activeHero);
 if(!Object.prototype.hasOwnProperty.call(h.plans,selected)&&Array.isArray(s.formation)&&s.formation.some(x=>x.count>0))
  h.plans[selected]=s.formation.filter(x=>x.count>0).map(x=>({unitId:x.unitId,count:x.count}));
 return s;
}
function valid(s){
 const h=s?.hg20,t=h?.tower,c=h?.collection;
 if(!h||h.version!==1||!h.plans||typeof h.plans!=='object'||Array.isArray(h.plans)||
  !t||!c||!integer(t.floor,1)||!/^\d{4}-\d{2}-\d{2}$/.test(t.day||'')||
  !integer(t.claims,0,5)||!integer(t.attempts)||!integer(t.victories)||
  !integer(t.rank,0,100000000)||!integer(t.essence,0,1e12)||
  !Array.isArray(t.team)||t.team.length>3||new Set(t.team).size!==t.team.length||
  t.team.some(id=>!s.heroes.some(q=>q.id===id))||
  !integer(c.sovereignWins)||typeof c.citadel!=='boolean'||
  !Array.isArray(c.artifacts)||c.artifacts.length>100||new Set(c.artifacts).size!==c.artifacts.length||
  c.artifacts.some(x=>typeof x!=='string'||x.length>80))return false;
 for(const [k,v] of Object.entries(h.plans)){
  const [city,hero]=k.split(':');
  if(!s.cities.some(q=>q.id===city)||!s.heroes.some(q=>String(q.id)===hero)||
   !Array.isArray(v)||v.length>7)return false;
  const total={};for(const x of v){
   if(!x||!E.getUnit(s,x.unitId)||!integer(x.count,1,1e9))return false;
   total[x.unitId]=(total[x.unitId]||0)+x.count;
  }
  const character=s.heroes.find(q=>String(q.id)===hero);
  if(!character||!integer(E.formationPoints(s,v),0,E.heroLimit(character.level)))return false;
 }
 if(t.last!==null&&(!t.last||!integer(t.last.floor,1)||typeof t.last.outcome!=='string'||
  !['win','lose'].includes(t.last.outcome)||!integer(t.last.teamPower)||!integer(t.last.enemyPower)||
  !integer(t.last.rewardGold)||!integer(t.last.rewardEssence)||typeof t.last.enemy!=='string'))return false;
 return true;
}
function plan(s,id,cityId=s.activeCityId||'main'){
 ensure(s);return (s.hg20.plans[key(cityId,id)]||[]).map(g=>({...g}));
}
function role(s,id){
 const q=s.heroes.find(h=>h.id===id);if(!q)return {status:'missing',label:'Không tồn tại',army:[]};
 const exp=s.expedition?.heroId===id?s.expedition:null;
 const pending=s.parallelMarches?.find(x=>x.heroId===id);
 const station=s.stationedHeroes?.find(x=>x.heroId===id);
 const task=exp||pending||station;
 if(task){
  const army=Object.entries(task.army||{}).filter(([,count])=>count>0).map(([unitId,count])=>({unitId,count}));
  return {status:station?'stationed':exp?.phase==='battle'||s.battle&&exp?'fighting':exp?.phase==='returning'?'returning':'marching',
   label:station?'Đồn trú tại '+station.key:exp?.phase==='battle'||s.battle&&exp?'Đang chiến đấu':exp?.phase==='returning'?'Đang trở về':'Đang hành quân',
   army,target:station?.key||pending?.target||s.march?.target||null,heroId:id};
 }
 if(s.castellan===id)return {status:'castellan',label:'Trấn thủ thành',army:[],heroId:id};
 return {status:'home',label:'Sẵn sàng ở thành',army:plan(s,id),heroId:id};
}
function reservations(s,heroId,city=s.activeCityId||'main'){
 const totals={};
 for(const h of s.heroes){
  if(h.id===heroId)continue;
  for(const g of plan(s,h.id,city))totals[g.unitId]=(totals[g.unitId]||0)+g.count;
 }
 return totals;
}
function setPlan(s,heroId,groups){
 ensure(s);
 const hero=s.heroes.find(x=>x.id===heroId);
 if(!hero||role(s,heroId).status!=='home')throw Error('Tướng không ở thành để điều binh');
 if(!Array.isArray(groups)||groups.length>7)throw Error('Tối đa bảy stack');
 const validGroups=groups.filter(g=>g?.unitId&&Number(g.count)>0).map(g=>({unitId:g.unitId,count:Number(g.count)}));
 if(validGroups.some(g=>!integer(g.count,1,1e9)||!E.getUnit(s,g.unitId)))throw Error('Loại quân hoặc số quân không hợp lệ');
 const totals=reservations(s,heroId),needed={};
 for(const g of validGroups)needed[g.unitId]=(needed[g.unitId]||0)+g.count;
 for(const [unitId,n] of Object.entries(needed)){
  if(n+(totals[unitId]||0)>(s.army[unitId]||0))
   throw Error('Không đủ '+E.getUnit(s,unitId).name+' trong thành: đã phân cho tướng khác '+(totals[unitId]||0));
 }
 const points=E.formationPoints(s,validGroups);
 if(points>E.heroLimit(hero.level))throw Error('Quá sức chỉ huy '+hero.name);
 // Nonactive plans are written without switching away the current hero.
 if(heroId===s.activeHero)old.setFormation(s,validGroups);
 s.hg20.plans[key(s.activeCityId||'main',heroId)]=validGroups;
 return {heroId,points,limit:E.heroLimit(hero.level),total:validGroups.reduce((a,g)=>a+g.count,0)};
}
function setFormation(s,groups){
 return setPlan(s,s.activeHero,groups);
}
function selectHero(s,id){
 ensure(s);const previous=s.activeHero,city=s.activeCityId||'main';
 if(Array.isArray(s.formation)&&s.formation.some(g=>g.count>0))
  s.hg20.plans[key(city,previous)]=s.formation.filter(g=>g.count>0).map(g=>({...g}));
 const result=old.selectHero(s,id);
 s.formation=plan(s,id);
 return result;
}
function switchCity(s,id){
 ensure(s);const oldCity=s.activeCityId||'main',hero=s.activeHero;
 if(s.formation?.length)s.hg20.plans[key(oldCity,hero)]=s.formation.map(g=>({...g}));
 const result=old.switchCity(s,id);
 s.formation=plan(s,hero,id);
 return result;
}
function autoFormation(s){
 ensure(s);const hero=s.heroes.find(q=>q.id===s.activeHero);
 if(!hero||role(s,hero.id).status!=='home')throw Error('Tướng đang bận');
 const reserved=reservations(s,hero.id),limit=E.heroLimit(hero.level);
 const formation=[];let remaining=limit;
 const units=E.arrUnits(s).filter(u=>(s.army[u.id]||0)>(reserved[u.id]||0))
  .sort((a,b)=>b.tier-a.tier||b.atk-a.atk);
 for(const u of units){if(formation.length===7)break;
  const cost=E.unitValue(u),count=Math.min((s.army[u.id]||0)-(reserved[u.id]||0),Math.floor(remaining/cost));
  if(count>0){formation.push({unitId:u.id,count});remaining-=count*cost;}
 }
 if(!formation.length)throw Error('Hết quân rảnh hoặc không đủ điểm chỉ huy');
 return {...setPlan(s,hero.id,formation),formation};
}
function startMarch(s,target,kind){
 ensure(s);
 const heroId=s.activeHero;
 if(role(s,heroId).status!=='home')throw Error('Tướng chưa sẵn sàng xuất chinh');
 const current=plan(s,heroId);
 if(current.length){
  // Other heroes' reserved troops stay in the city. The dispatching army is
  // removed exactly once by the canonical HG08/GH10 march pipeline.
  for(const [unitId,count] of Object.entries(reservations(s,heroId)))
   if((s.army[unitId]||0)<count+(current.filter(g=>g.unitId===unitId).reduce((a,g)=>a+g.count,0)))
    throw Error('Quân phân cho nhiều tướng vượt tổng quân thật trong thành');
  s.formation=current.map(x=>({...x}));
 }
 const result=old.startMarch(s,target,kind);
 delete s.hg20.plans[key(s.activeCityId||'main',heroId)];
 return result;
}
function chooseTowerTeam(s,ids){
 ensure(s);if(!Array.isArray(ids)||ids.length<1||ids.length>3||
 new Set(ids).size!==ids.length||ids.some(id=>role(s,id).status!=='home'))
  throw Error('Tháp yêu cầu 1–3 tướng đang ở thành, không trùng nhau');
 s.hg20.tower.team=ids.slice();return ids.slice();
}
function teamPower(s,ids=s.hg20.tower.team){
 const reserved={};let power=0,groups=0,units=0;
 for(const id of ids){
  if(role(s,id).status!=='home')throw Error('Tướng '+id+' đang bận');
  const h=s.heroes.find(q=>q.id===id),formation=plan(s,id);
  if(!formation.length)throw Error('Hãy cấp quân cho '+h.name+' trước khi leo tháp');
  for(const g of formation){reserved[g.unitId]=(reserved[g.unitId]||0)+g.count;
   if(reserved[g.unitId]>(s.army[g.unitId]||0))throw Error('Quân bị cấp trùng nhiều tướng');
   units+=g.count;groups++;
  }
  const combat=E.heroStats(s,id)||h,points=E.formationPoints(s,formation);
  power+=points*(1+(combat.atk+combat.def+combat.spd+combat.int)/400);
 }
 return {power:Math.floor(power*(1+s.hg20.tower.rank*.18)),groups,units};
}
function monster(floor){return ENEMIES[(Math.floor((floor-1)/10))%ENEMIES.length]}
function enemyPower(floor){return Math.floor((700+floor*950)*(1+Math.floor((floor-1)/25)*.18))}
function towerStatus(s){ensure(s);const t=s.hg20.tower,enemy=monster(t.floor);
 return {floor:t.floor,enemy:enemy.name,trait:enemy.trait,enemyPower:enemyPower(t.floor),
  claims:t.claims,rewardLeft:Math.max(0,5-t.claims),team:t.team.slice(),
  rank:t.rank,essence:t.essence,victories:t.victories,
  upgradeCost:3+Math.floor(t.rank*.65),
  cityUnlocked:s.hg20.collection.citadel,last:t.last};
}
function towerClimb(s){
 ensure(s);const t=s.hg20.tower;
 if(s.march||s.battle||s.expedition||s.parallelMarches?.length)throw Error('Đang có đội quân ra ngoài; hãy hoàn tất trận rồi leo tháp');
 if(t.team.length<1||t.team.length>3)throw Error('Chọn 1–3 tướng vào tổ đội tháp');
 const ready=teamPower(s),floor=t.floor,enemy=monster(floor),strength=enemyPower(floor);
 const won=ready.power>=strength;
 const rewardGold=won&&t.claims<5?Math.min(1e8,2500+floor*900):0;
 const rewardEssence=won&&t.claims<5?Math.min(1000000,2+Math.floor(floor/4)):0;
 const report={floor,outcome:won?'win':'lose',enemy:enemy.name,teamPower:ready.power,
  enemyPower:strength,rewardGold,rewardEssence,claimed:won&&t.claims<5};
 t.attempts++;
 if(won){
  t.victories++;t.floor++;
  if(report.claimed){
   E.add(s,{gold:rewardGold,wood:Math.min(50000,250+floor*70),
    ore:Math.min(50000,250+floor*70),sulfur:Math.min(25000,100+floor*25),
    crystal:Math.min(25000,100+floor*25)});
   t.essence=Math.min(1e12,t.essence+rewardEssence);
   t.claims++;
   if(floor%10===0){
    const unit=C.rewardUnits[s.race].find(u=>u.towerExclusive);
    s.army[unit.id]=(s.army[unit.id]||0)+Math.max(1,Math.floor(floor/10));
    report.specialUnit=unit.id;
   }
   if(floor%25===0){
    const item='Huyền Binh · Tầng '+floor;
    s.hg20.collection.artifacts.push(item);
    if(s.hg20.collection.artifacts.length>100)s.hg20.collection.artifacts.shift();
    report.artifact=item;
   }
  }
  if(floor>=25)s.hg20.collection.citadel=true;
 }
 t.last=report;
 E.note(s,'Bí Cảnh Tháp tầng '+floor+': '+(won?'thắng':'thua')+
 (report.claimed?', thưởng '+rewardEssence+' tinh hoa':', không tiêu hao quân')+'.');
 return {...report,nextFloor:t.floor,dailyRewardsLeft:5-t.claims};
}
function towerUpgrade(s){
 ensure(s);const t=s.hg20.tower,cost=3+Math.floor(t.rank*.65);
 if(t.essence<cost)throw Error('Thiếu '+cost+' tinh hoa bí cảnh');
 if(t.rank>=100000000)throw Error('Đã đạt giới hạn dữ liệu an toàn');
 t.essence-=cost;t.rank++;E.note(s,'Thăng hoa bí cảnh +1, lực chiến toàn đội tháp +18% theo cộng dồn.');return t.rank;
}
function castleStatus(s){ensure(s);return {unlocked:s.hg20.collection.citadel,
 name:'Thiên Ngoại Bí Thành',description:'Thành sưu tầm: mở sau tầng 25; nâng sức mạnh đội tháp bằng tinh hoa, chưa là thành có bản đồ riêng.'};}
function strict(s){return old.strict(s)&&valid(s)}
function make(...args){const s=ensure(old.make(...args));E.add(s,{gold:25000,wood:8000,ore:8000,sulfur:3000,crystal:3000});return s}
function parse(text){const s=ensure(old.parse(text));if(!strict(s))throw Error('Save HG20 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG20 không hợp lệ');return old.serialize(s)}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 setFormation,selectHero,switchCity,autoFormation,startMarch,
 hg20Ensure:ensure,hg20HeroPlan:plan,hg20HeroRole:role,hg20Reservations:reservations,
 hg20SetHeroPlan:setPlan,hg20ChooseTowerTeam:chooseTowerTeam,
 hg20TowerStatus:towerStatus,hg20TowerClimb:towerClimb,hg20TowerUpgrade:towerUpgrade,
 hg20TowerPower:teamPower,hg20CastleStatus:castleStatus,hg20Valid:valid});
root.HOG_HG20=Object.freeze({version:1,kind:'private-collectible-pve',towerRewardWinsPerDay:5,towerHeroLimit:3});
})(typeof globalThis!=='undefined'?globalThis:this);
