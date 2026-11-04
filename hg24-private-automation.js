/* HG24 Private logistics. Safe templates, volunteer restock, paid XP and boss scouting.
 * Runs after HG21; world combat authority and Save version 7 remain canonical.
 * No graphic or animation changes; all actions are explicit or opt-in.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E||E.V!==7||!E.hg21TowerEnter||!E.hg20SetHeroPlan)throw Error('HG24 requires HG21 tactical private game');
const prior={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,tick:E.tick,battleAct:E.battleAct};
const date=ms=>new Date(ms).toISOString().slice(0,10),natural=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const templateKey=(city,id)=>city+':'+id;
function ensure(s){
 if(!s.hg24)s.hg24={v:1,templates:{},daily:{day:date(s.lastTick),drills:0,harvest:false},bossWins:0};
 const q=s.hg24;if(!q||q.v!==1||!q.templates||!q.daily)throw Error('Save HG24 bị lỗi');
 if(q.daily.day!==date(s.lastTick)){q.daily.day=date(s.lastTick);q.daily.drills=0;q.daily.harvest=false}
 return q;
}
function valid(s){
 const q=s?.hg24;if(!q||q.v!==1||!q.templates||Array.isArray(q.templates)||typeof q.templates!=='object'||!q.daily||
  !/^\d{4}-\d{2}-\d{2}$/.test(q.daily.day||'')||!natural(q.daily.drills,5)||
  typeof q.daily.harvest!=='boolean'||!natural(q.bossWins,1e8))return false;
 const entries=Object.entries(q.templates);
 if(entries.length>48)return false;
 for(const [key,t] of entries){
  if(!t||typeof t.cityId!=='string'||!natural(t.heroId,1e9)||key!==templateKey(t.cityId,t.heroId)||
   !s.heroes.some(h=>h.id===t.heroId)||!s.cities.some(c=>c.id===t.cityId)||
   typeof t.autoFill!=='boolean'||typeof t.autoTrain!=='boolean'||!Array.isArray(t.groups)||!t.groups.length||t.groups.length>7)return false;
  const city=s.cities.find(c=>c.id===t.cityId);
  const units=(C.units[city.race]||[]).concat(C.rewardUnits[city.race]||[]);
  let points=0;
  for(const group of t.groups){
   const unit=units.find(u=>u.id===group?.unitId);
   if(!unit||!natural(group.count,1e8)||group.count===0)return false;
   points+=E.unitValue(unit)*group.count;
  }
  if(!Number.isSafeInteger(points))return false;
 }
 return true;
}
function savedTemplate(s,id=s.activeHero,city=s.activeCityId||'main'){
 ensure(s);const t=s.hg24.templates[templateKey(city,id)];
 return t?{...t,groups:t.groups.map(g=>({...g}))}:null;
}
function setTemplate(s,id=s.activeHero){
 ensure(s);
 const home=s.activeCityId||'main',plan=E.hg20HeroPlan(s,id);
 const hero=s.heroes.find(h=>h.id===id);
 if(!hero||E.hg20HeroRole(s,id).status!=='home'||!plan.length)throw Error('Chọn tướng sẵn sàng và lưu đội hình có quân trước');
 if(plan.length>7||plan.some(g=>!natural(g.count,1e8)||!g.count))throw Error('Đội hình mẫu không hợp lệ');
 const k=templateKey(home,id),before=s.hg24.templates[k];
 if(!before&&Object.keys(s.hg24.templates).length>=48)throw Error('Đã đủ 48 mẫu điều binh');
 const row={heroId:id,cityId:home,groups:plan.map(g=>({...g})),
  autoFill:before?.autoFill||false,autoTrain:before?.autoTrain||false};
 s.hg24.templates[k]=row;E.note(s,'Đã lưu đội hình mẫu cho '+hero.name+' tại thành '+home+'.');
 return savedTemplate(s,id);
}
function options(s,id,fill,train){
 ensure(s);const row=s.hg24.templates[templateKey(s.activeCityId||'main',id)];
 if(!row)throw Error('Hãy lưu đội hình mẫu trước');
 if(typeof fill!=='boolean'||typeof train!=='boolean')throw Error('Chế độ tự động phải là bật hoặc tắt');
 row.autoFill=fill;row.autoTrain=fill&&train;return savedTemplate(s,id);
}
function calculate(s,id){
 const template=savedTemplate(s,id);if(!template)throw Error('Chưa có đội hình mẫu cho tướng');
 if(template.cityId!==s.activeCityId)throw Error('Hãy mở đúng thành lưu đội hình mẫu');
 const hero=s.heroes.find(h=>h.id===id),reserved=E.hg20Reservations(s,id);
 if(!hero||E.hg20HeroRole(s,id).status!=='home')throw Error('Tướng đang hành quân hoặc đồn trú');
 let space=E.heroLimit(hero.level),total=0;const result=[],demands={};
 for(const group of template.groups){
  const unit=E.getUnit(s,group.unitId);
  if(!unit||!natural(group.count,1e8)||!group.count)throw Error('Mẫu quân đã lỗi thời');
  const used=demands[group.unitId]||0;
  const free=Math.max(0,(s.army[group.unitId]||0)-(reserved[group.unitId]||0)-used);
  const value=E.unitValue(unit);
  const count=Math.max(0,Math.min(group.count,free,Math.floor(space/value)));
  if(count>0){result.push({unitId:group.unitId,count});demands[group.unitId]=used+count;total+=count;space-=count*value}
 }
 return {heroId:id,groups:result,desired:template.groups.map(g=>({...g})),
  missing:template.groups.reduce((n,g)=>n+g.count,0)-total,
  points:E.heroLimit(hero.level)-space,total};
}
function apply(s,id=s.activeHero){
 const receipt=calculate(s,id),previous=E.hg20HeroPlan(s,id);
 const unchanged=JSON.stringify(previous)===JSON.stringify(receipt.groups);
 if(!unchanged){
  // Canonical setFormation refuses an empty party; an empty template fill is
  // a legitimate waiting state, not an occasion to invent a soldier.
  if(receipt.groups.length)E.hg20SetHeroPlan(s,id,receipt.groups);
  else{
   s.hg20.plans[templateKey(s.activeCityId||'main',id)]=[];
   if(s.activeHero===id)s.formation=[];
  }
  // HG21 persisted Tower picks refer to positions, so remap their chosen
  // unit identities when a partially filled plan compresses its slots.
  const towerPick=s.hg20?.tower?.picks?.find(p=>p.heroId===id);
  if(towerPick){
   const source=towerPick.slots.map(i=>previous[i]?.unitId);
   const used=new Set(),mapped=[];
   for(const unitId of source){
    let next=receipt.groups.findIndex((g,i)=>g.unitId===unitId&&!used.has(i));
    if(next<0)next=receipt.groups.findIndex((g,i)=>!used.has(i));
    if(next>=0){used.add(next);mapped.push(next)}
   }
   towerPick.slots=mapped;
  }
 }
 return {...receipt,partial:receipt.missing>0,changed:!unchanged};
}
function recruitMissing(s,id){
 const row=savedTemplate(s,id);if(!row||!row.autoTrain)return null;
 if(s.training?.length||s.battle||s.march||s.expedition||s.parallelMarches?.length)return null;
 if(E.hg20HeroRole(s,id).status!=='home')return null;
 const existing=E.hg20HeroPlan(s,id),needed={},assigned={};
 for(const g of row.groups)needed[g.unitId]=(needed[g.unitId]||0)+g.count;
 for(const g of existing)assigned[g.unitId]=(assigned[g.unitId]||0)+g.count;
 const reserved=E.hg20Reservations(s,id);
 for(const [unitId,wanted] of Object.entries(needed)){
  const unit=E.getUnit(s,unitId);
  if(!unit||unit.rewardOnly||unit.towerExclusive)continue;
  const stockFree=Math.max(0,(s.army[unitId]||0)-(reserved[unitId]||0)-(assigned[unitId]||0));
  const lack=Math.max(0,wanted-(assigned[unitId]||0)-stockFree);
  if(lack<1)continue;
  if(!E.troopPrerequisites(s,unit)?.available)continue;
  let lo=0,hi=Math.min(1000,lack);
  while(lo<hi){const n=Math.floor((lo+hi+1)/2);
   if(E.canAfford(s,E.recruitCost(s,unit,n)))lo=n;else hi=n-1;
  }
  if(lo<1)return null;
  const spent=E.recruit(s,unitId,lo);
  return {heroId:id,unitId,count:lo,paid:spent};
 }
 return null;
}
function replenish(s,id=s.activeHero,withTraining=false){
 ensure(s);
 const receipt=apply(s,id);
 const row=savedTemplate(s,id);
 let queued=null;
 if(withTraining&&row){
  const enabled=row.autoTrain;row.autoTrain=true;
  try{queued=recruitMissing(s,id)}finally{row.autoTrain=enabled}
 }
 return {...receipt,queued};
}
function tick(s,...args){
 ensure(s);const result=prior.tick(s,...args);ensure(s);
 // Opt-in auto-fill only, no recursive queued hiring or silent disband.
 if(!s.battle&&!s.march&&!s.expedition&&!s.parallelMarches?.length){
  const city=s.activeCityId||'main';
  for(const t of Object.values(s.hg24.templates).sort((a,b)=>a.heroId-b.heroId)){
   if(t.cityId!==city||!t.autoFill||E.hg20HeroRole(s,t.heroId).status!=='home')continue;
   try{apply(s,t.heroId)}catch(e){E.note(s,'Không thể bổ sung '+t.heroId+': '+String(e.message||e).slice(0,100))}
  }
  for(const t of Object.values(s.hg24.templates).sort((a,b)=>a.heroId-b.heroId)){
   if(t.cityId===city&&t.autoTrain){const queued=recruitMissing(s,t.heroId);if(queued)break}
  }
 }
 return result;
}
function bossCandidates(s){
 ensure(s);
 const home=E.activeCity(s),origin=home?.key||'3,4';
 const heroes=s.heroes.filter(h=>E.hg20HeroRole(s,h.id).status==='home');
 const active=s.activeHero;
 const rows=E.TILES.filter(t=>t.kind==='npc'&&t.eliteTier>=11).map(t=>{
  const route=E.pathfind(origin,t.key),ap=E.hg182MarchCost(s,t.key);
  const scored=heroes.map(h=>{
   const saved=E.hg20HeroPlan(s,h.id),row=saved.length?saved:(savedTemplate(s,h.id)?.groups||[]);
   const power=row.reduce((total,g)=>{
    const u=E.getUnit(s,g.unitId);return total+(u?(u.atk+u.def*.4+u.hp*.015)*g.count:0);
   },0);
   const stats=E.heroStats(s,h.id);
   return {heroId:h.id,name:h.name,score:Math.floor(power*(1+(stats?.atk||0)/100)),
    assigned:saved.length>0,fromTemplate:!saved.length&&!!savedTemplate(s,h.id),units:row.reduce((n,g)=>n+g.count,0)};
  }).sort((a,b)=>b.score-a.score||b.units-a.units||a.heroId-b.heroId);
  return {key:t.key,name:t.value,stars:t.level,eliteTier:t.eliteTier,privateBoss:!!t.privateBoss,
   distance:route?route.length-1:null,apCost:ap,recommended:scored[0]||null};
 }).filter(x=>x.distance!==null);
 return rows.sort((a,b)=>b.privateBoss-a.privateBoss||a.distance-b.distance||a.key.localeCompare(b.key));
}
function prepareBoss(s,key){
 ensure(s);if(s.battle||s.march||s.expedition||s.parallelMarches?.length)throw Error('Đang có đạo quân hoạt động, chưa thể tự chọn tướng săn Boss');
 const candidate=bossCandidates(s).find(x=>x.key===key);
 if(!candidate)throw Error('Mục tiêu không phải Boss hoặc không thể tới');
 if(!candidate.recommended)throw Error('Không có tướng rảnh để săn Boss');
 if(s.ap<candidate.apCost)throw Error('Thiếu AP để đi săn Boss');
 const id=candidate.recommended.heroId;
 if(s.activeHero!==id)E.selectHero(s,id);
 if(!E.hg20HeroPlan(s,id).length){
  if(savedTemplate(s,id))apply(s,id);
  else E.autoFormation(s);
 }
 const group=E.hg20HeroPlan(s,id);
 if(!group.length)throw Error('Không có quân hợp lệ; hãy tuyển thêm trước');
 return {target:key,heroId:id,heroName:s.heroes.find(h=>h.id===id).name,
  groups:group.length,units:group.reduce((n,g)=>n+g.count,0),apCost:candidate.apCost,
  ready:true};
}
function bossDispatch(s,key){
 const before=s.ap,prepared=prepareBoss(s,key);
 const result=E.startMarch(s,key);
 if(s.ap>=before||!result)throw Error('Lệnh hành quân săn Boss không thành công');
 E.note(s,prepared.heroName+' đi săn Boss '+E.getTile(key).value+'; quân mang theo có ghi trong s.expedition.');
 return {...prepared,launched:true};
}
function drillCost(hero){return {gold:Math.ceil(2500+hero.level*220),wood:Math.ceil(60+hero.level*3),ore:Math.ceil(60+hero.level*3),sulfur:Math.ceil(24+hero.level),crystal:Math.ceil(24+hero.level)}}
function drillXp(hero){return Math.floor(40000+hero.level*5000)}
function status(s,id=s.activeHero){
 const q=ensure(s),hero=s.heroes.find(h=>h.id===id);
 const mineCount=s.mines?.length||0;
 return {day:q.daily.day,drillsUsed:q.daily.drills,drillsLeft:5-q.daily.drills,harvestAvailable:mineCount>0&&!q.daily.harvest,
  mineCount,bossWins:q.bossWins,heroLevel:hero?.level||0,
  drillCost:hero?drillCost(hero):null,drillExp:hero?drillXp(hero):0,
  template:hero?savedTemplate(s,id):null};
}
function drill(s,id=s.activeHero){
 const q=ensure(s),hero=s.heroes.find(h=>h.id===id);
 if(!hero||hero.level>=100)throw Error('Tướng đã đạt Lv100 hoặc không còn tồn tại');
 if(E.hg20HeroRole(s,id).status!=='home')throw Error('Tướng phải ở thành để tu luyện');
 if(q.daily.drills>=5)throw Error('Đã hoàn thành 5 lượt huấn luyện hôm nay');
 const cost=drillCost(hero);if(!E.canAfford(s,cost))throw Error('Không đủ tài nguyên huấn luyện');
 E.spend(s,cost);q.daily.drills++;
 const xp=E.grantHeroExperience(s,id,drillXp(hero),'huấn luyện private');
 E.note(s,hero.name+' luyện binh cùng tài nguyên lãnh địa, +'+Math.floor(xp.gained)+' EXP.');
 return {heroId:id,gained:xp.gained,cost,remaining:5-q.daily.drills,level:hero.level};
}
function harvest(s,id=s.activeHero){
 const q=ensure(s),count=s.mines?.length||0,hero=s.heroes.find(h=>h.id===id);
 if(!count)throw Error('Hãy chiếm ít nhất một mỏ thực tế để mở thu hoạch');
 if(q.daily.harvest)throw Error('Đã nhận thu hoạch hôm nay');
 if(!hero)throw Error('Không có tướng nhận EXP');
 const resources={gold:2500+count*6000,wood:500+count*500,ore:500+count*500,
  sulfur:200+count*250,crystal:200+count*250};
 const before={...s.res};E.add(s,resources);
 const gained=Object.fromEntries(C.keys.map(k=>[k,Math.floor(s.res[k]-before[k])]));
 const xp=E.grantHeroExperience(s,id,20000+count*12000,'thu hoạch mỏ private');
 q.daily.harvest=true;
 E.note(s,'Thu hoạch từ '+count+' mỏ: +' +Math.floor(xp.gained)+' EXP và tài nguyên thực còn chỗ trong kho.');
 return {heroId:id,mines:count,resources:gained,exp:xp.gained};
}
function battleAct(s,action,opts){
 const source=s.battle?{kind:s.battle.kind,level:s.battle.level,key:s.battle.target,heroId:s.expedition?.heroId||s.activeHero}:null;
 const result=prior.battleAct(s,action,opts);
 if(result?.type!=='win'||source?.kind!=='npc'||(source.level||0)<9)return result;
 const q=ensure(s),tile=E.getTile(source.key),privateBoss=!!tile?.privateBoss;
 const extra=(privateBoss?550000:source.level>=10?300000:200000)+Math.min(1e6,q.bossWins*5000);
 const earned=E.grantHeroExperience(s,source.heroId,extra,'chiến tích Boss private HG24');
 q.bossWins=Math.min(1e8,q.bossWins+1);
 const loot={gold:privateBoss?40000:18000,wood:privateBoss?1500:650,ore:privateBoss?1500:650,
  sulfur:privateBoss?700:250,crystal:privateBoss?700:250};
 const before={...s.res};E.add(s,loot);
 const receipt=s.battleReports?.find(r=>r.id===result.reportId);
 if(receipt){
  receipt.heroXp+=earned.gained;
  for(const k of C.keys)receipt.resources[k]+=Math.max(0,s.res[k]-before[k]);
 }
 E.note(s,'Chiến tích săn '+tile?.value+': +'+Math.floor(earned.gained)+' EXP, thêm tài nguyên vào kho.');
 return result;
}
function strict(s){return prior.strict(s)&&valid(s)}
function make(...args){const s=prior.make(...args);ensure(s);return s}
function parse(raw){const s=prior.parse(raw);ensure(s);if(!strict(s))throw Error('Save HG24 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG24 không hợp lệ');return prior.serialize(s)}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 tick,battleAct,hg24Ensure:ensure,hg24Valid:valid,hg24Status:status,
 hg24Template:savedTemplate,hg24SaveTemplate:setTemplate,hg24SetAuto:options,
 hg24Preview:calculate,hg24Apply:apply,hg24Replenish:replenish,
 hg24RecommendBoss:bossCandidates,hg24PrepareBoss:prepareBoss,hg24DispatchBoss:bossDispatch,
 hg24Drill:drill,hg24Harvest:harvest});
root.HOG_HG24=Object.freeze({version:1,saveVersion:7,maxTemplates:48,drillsPerDay:5});
})(typeof globalThis!=='undefined'?globalThis:this);
