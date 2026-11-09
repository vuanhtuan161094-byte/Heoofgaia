/* HG26.1 - real joint Boss battle: <=3 distinct commanders, <=2 real stacks each.
 * Retains the v07 world expedition, AP, tactical casualties, Arena and reward
 * authorities. No separate Boss instant result and no rotating solo commanders.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg26Start||!E?.hg21TowerCast||!E?.hg24RecommendBoss)throw Error('HG26.1 requires HG26/HG21/HG24');
const old={start:E.hg26Start,step:E.hg26Step,status:E.hg26Status,
 battleAct:E.battleAct,tick:E.tick,make:E.make,parse:E.parseSave,serialize:E.serializeSave,
 strict:E.strictSave,role:E.hg20HeroRole,select:E.selectHero,plan:E.hg20SetHeroPlan,
 heroAway:E.heroAway,appoint:E.appoint,
 startMarch:E.startMarch};
const isInt=(v,min=0,max=1e9)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const sum=groups=>groups.reduce((n,g)=>n+g.count,0);
const totalArmy=a=>Object.values(a||{}).reduce((n,v)=>n+v,0);
let internalMarch=false;
function copied(groups){return groups.map(g=>({unitId:g.unitId,count:g.count}))}
function teamSelection(s,requested){
 if(!Array.isArray(requested)||requested.length<1||requested.length>3)throw Error('Chỉ chọn tối đa 3 tướng cùng một trận Boss');
 const visited=new Set(),rows=[];
 for(const entry of requested){
  const id=Number(entry?.heroId),hero=s.heroes.find(h=>h.id===id);
  if(!hero||visited.has(id)||old.role(s,id).status!=='home')throw Error('Tướng bị trùng hoặc đang bận');
  visited.add(id);
  const plan=E.hg20HeroPlan(s,id);
  if(!Array.isArray(entry.slots)||entry.slots.length<1||entry.slots.length>2||
    entry.slots.some(x=>!isInt(x,0,6)||!plan[x])||new Set(entry.slots).size!==entry.slots.length)
    throw Error('Mỗi tướng chỉ được chọn 1 hoặc 2 slot có quân đã phân');
  const groups=entry.slots.map(i=>({unitId:plan[i].unitId,count:plan[i].count}));
  if(groups.some(g=>!isInt(g.count,1,1e8)||!E.getUnit(s,g.unitId)))throw Error('Stack không hợp lệ');
  if(E.formationPoints(s,groups)>E.heroLimit(hero.level,hero))throw Error('Vượt sức chỉ huy riêng của '+hero.name);
  rows.push({heroId:id,groups});
 }
 const demand={},members=new Set(rows.map(x=>x.heroId));
 for(const row of rows)for(const g of row.groups)demand[g.unitId]=(demand[g.unitId]||0)+g.count;
 const other={};for(const hero of s.heroes){
  if(members.has(hero.id))continue;
  for(const g of E.hg20HeroPlan(s,hero.id))other[g.unitId]=(other[g.unitId]||0)+g.count;
 }
 for(const [id,n] of Object.entries(demand))
  if(n+(other[id]||0)>(s.army[id]||0))throw Error('Không đủ quân thực; quân của tướng khác được bảo lưu: '+id);
 if(rows.reduce((n,r)=>n+r.groups.length,0)>6)throw Error('Trận Boss tối đa sáu stack');
 return rows;
}
function start(s,opts){
 if(!Array.isArray(opts?.team))return old.start(s,opts); // legacy HG26 Save/policy
 const party=teamSelection(s,opts.team),leader=party[0].heroId;
 const max=party.reduce((n,r)=>n+sum(r.groups),0);
 if(max<(opts.minUnits??1))throw Error('Tổng quân ba đội không đạt giới hạn tối thiểu');
 // Validate canonical HG26 policy before storing the new co-operative roster.
 const previous=s.activeHero;
 const accepted=old.start(s,{...opts,heroId:leader,minUnits:Math.max(1,sum(party[0].groups)),minCoverage:1});
 const q=s.hg26;
 // The legacy single-commander initializer checks only the leader. Restore
 // the owner's squad-wide thresholds; cooperative preflight checks all heroes.
 q.config.minUnits=opts.minUnits??1;q.config.minCoverage=opts.minCoverage??70;
 q.config.team=party.map(p=>p.heroId);
 q.joint={version:1,team:party.map(p=>({heroId:p.heroId,groups:copied(p.groups)})),
   lastVictoryShared:null};
 E.note(s,'HG26.1: '+party.length+' tướng, '+party.reduce((n,r)=>n+r.groups.length,0)+
  ' stack cùng tham gia MỘT trận Boss; không luân phiên đội.');
 return {...accepted,team:q.joint.team.map(p=>({heroId:p.heroId,groups:copied(p.groups)}))};
}
function active(s){const q=s.hg26;return !!(q?.joint&&Array.isArray(q.config?.team));}
function participants(s){return active(s)?s.hg26.joint.team:[]}
function protectedRole(s,id){
 const base=old.role(s,id),party=participants(s);
 if(!s.expedition||!party.some(p=>p.heroId===id)||id===s.expedition.heroId)return base;
 const phase=s.expedition.phase,army={};
 for(const g of s.expedition.formation||[]){
  if(g.hg261HeroId===id)army[g.unitId]=(army[g.unitId]||0)+g.count;
 }
 return {status:phase==='returning'?'returning':phase==='battle'?'fighting':'marching',
  label:phase==='returning'?'Đang trở về cùng đội Boss':phase==='battle'?'Đang đánh Boss chung':'Đang đi săn Boss chung',
  army:Object.entries(army).map(([unitId,count])=>({unitId,count})),heroId:id};
}
function select(s,id){
 if(s.expedition&&participants(s).some(p=>p.heroId===id))
  throw Error('Tướng đang tham gia chung một trận Boss');
 return old.select(s,id);
}
function heroAway(s,id){
 return !!old.heroAway?.(s,id)||!!(s.expedition&&participants(s).some(p=>p.heroId===id));
}
function appoint(s,id){
 if(s.expedition&&participants(s).some(p=>p.heroId===id))
  throw Error('Tướng đang cùng đoàn Boss không thể làm Castellan');
 return old.appoint(s,id);
}
function pauseTower(s){
 const j=s.hg26?.joint,t=s.hg20?.tower;
 if(!j||!t?.picks?.length||j.towerBackup)return;
 const members=new Set(j.team.map(p=>p.heroId));
 if(!t.picks.some(p=>members.has(p.heroId)))return;
 j.towerBackup={team:t.team.slice(),picks:t.picks.map(p=>({
  heroId:p.heroId,slots:p.slots.slice(),
  unitIds:p.slots.map(i=>E.hg20HeroPlan(s,p.heroId)[i]?.unitId||null)
 }))};
 t.picks=t.picks.filter(p=>!members.has(p.heroId));
 t.team=t.picks.map(p=>p.heroId);
 E.note(s,'HG26.1: tạm giữ lựa chọn Bí Cảnh để các tướng xuất quân thật; sẽ khôi phục khi đội về.');
}
function restoreTower(s){
 const j=s.hg26?.joint,backup=j?.towerBackup,t=s.hg20?.tower;
 if(!backup||s.expedition||s.battle)return false;
 const rebuilt=[];
 for(const p of backup.picks){
  const form=E.hg20HeroPlan(s,p.heroId),used=new Set(),slots=[];
  for(const unitId of p.unitIds){
   let index=form.findIndex((g,i)=>g.unitId===unitId&&!used.has(i));
   if(index<0)index=form.findIndex((g,i)=>!used.has(i));
   if(index>=0){used.add(index);slots.push(index)}
  }
  if(!slots.length&&p.slots.length)return false;
  rebuilt.push({heroId:p.heroId,slots});
 }
 t.team=backup.team.slice();t.picks=rebuilt;
 delete j.towerBackup;
 E.note(s,'HG26.1: đã khôi phục nhóm Bí Cảnh sau khi đoàn Boss trở về.');
 return true;
}
function setPlan(s,id,groups){
 if(s.expedition&&participants(s).some(p=>p.heroId===id))
  throw Error('Không thể phân lại quân của tướng đang săn Boss');
 return old.plan(s,id,groups);
}
function march(s,target,kind){
 if(active(s)&&s.hg26.enabled&&s.hg26.phase==='ready'&&!internalMarch)
  throw Error('HG26.1 đang chuẩn bị ba tướng; dùng vòng tự săn để xuất một đoàn Boss chung');
 return old.startMarch(s,target,kind);
}
function available(s,team){
 const present=new Set(team.map(p=>p.heroId)),other={};
 for(const hero of s.heroes){
  if(present.has(hero.id))continue;
  for(const g of E.hg20HeroPlan(s,hero.id))other[g.unitId]=(other[g.unitId]||0)+g.count;
 }
 const used={},plans=[];
 for(const r of team){
  let remain=E.heroLimit(s.heroes.find(h=>h.id===r.heroId)?.level||1,s.heroes.find(h=>h.id===r.heroId));
  const groups=[];
  for(const g of r.groups){
   const u=E.getUnit(s,g.unitId),weight=u&&E.unitValue(u);
   if(!u||!weight)continue;
   const free=Math.max(0,(s.army[g.unitId]||0)-(other[g.unitId]||0)-(used[g.unitId]||0));
   const n=Math.max(0,Math.min(g.count,free,Math.floor(remain/weight)));
   if(n){groups.push({unitId:g.unitId,count:n});used[g.unitId]=(used[g.unitId]||0)+n;remain-=n*weight}
  }
  plans.push({heroId:r.heroId,groups});
 }
 return plans;
}
function assignPlans(s,rows){
 const city=s.activeCityId||'main';
 // First release every current plan of these owners so a depleted team's
 // new proportional assignments cannot be rejected by obsolete reservations.
 for(const r of rows){
  delete s.hg20.plans[city+':'+r.heroId];
  if(s.activeHero===r.heroId)s.formation=[];
 }
 for(const r of rows){
  if(r.groups.length)old.plan(s,r.heroId,r.groups);
 }
}
function preflight(s,team){
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length)throw Error('Đội cũ chưa về thành');
 if(team.some(r=>old.role(s,r.heroId).status!=='home'))throw Error('Một tướng trong nhóm đang bận');
 const current=available(s,team),cfg=s.hg26.config;
 let total=0;
 for(let i=0;i<current.length;i++){
  const n=sum(current[i].groups),want=sum(team[i].groups);
  if(!n||n*100<want*cfg.minCoverage)throw Error('Đội '+(i+1)+' thiếu quân trong kho so với mẫu');
  total+=n;
 }
 if(total<cfg.minUnits)throw Error('Tổng quân thấp hơn ngưỡng an toàn');
 const ap=E.hg182MarchCost(s,cfg.target);
 if(s.ap+1e-9<cfg.keepAP+ap)throw Error('Chưa đủ AP thật cho cả đội');
 return {rows:current,total,ap};
}
function dispatch(s){
 const q=s.hg26,team=q.joint.team,p=preflight(s,team);
 pauseTower(s);
 assignPlans(s,p.rows);
 const lead=p.rows[0];
 if(s.activeHero!==lead.heroId)old.select(s,lead.heroId);
 const before=s.ap;internalMarch=true;
 let started;
 try{started=old.startMarch(s,q.config.target)}finally{internalMarch=false}
 if(!started||!s.expedition||s.expedition.heroId!==lead.heroId||!(s.ap<before))
  throw Error('Đoàn quân dẫn đầu chưa xuất chinh theo luật thật');
 const exp=s.expedition;
 for(const f of exp.formation)f.hg261HeroId=lead.heroId;
 for(const r of p.rows.slice(1)){
  for(const g of r.groups){
   if((s.army[g.unitId]||0)<g.count)throw Error('Lỗi kiểm kê quân đã phân đội');
   s.army[g.unitId]-=g.count;
   exp.army[g.unitId]=(exp.army[g.unitId]||0)+g.count;
   exp.formation.push({...g,hg261HeroId:r.heroId});
  }
  delete s.hg20.plans[(s.activeCityId||'main')+':'+r.heroId];
 }
 if(exp.formation.length>6||exp.formation.length<1)throw Error('Vượt giới hạn sáu stack');
 q.phase='outbound';q.departureUnits=totalArmy(exp.army);q.reason='';
 E.note(s,'HG26.1: 1 đoàn '+p.rows.length+' tướng, '+exp.formation.length+' stack, '+
  q.departureUnits+' quân; trừ '+(before-s.ap)+' AP đúng một lần.');
 return {changed:true,type:'dispatched',heroId:lead.heroId,heroes:p.rows.length,
  stacks:exp.formation.length,units:q.departureUnits,apSpent:before-s.ap};
}
function annotate(s){
 const b=s.battle,q=s.hg26;
 if(!b||!q?.joint||!s.expedition||b.hg21Tower||
 b.target!==q.config.target||b.kind!=='npc')return false;
 if(b.hg261Joint)return false;
 const formation=s.expedition.formation;
 if(b.allies.length!==formation.length||formation.length>6)
  throw Error('Đội hình Boss không khớp quân viễn chinh');
 const membership=q.joint.team.map(p=>p.heroId);
 const byHero={};
 for(let i=0;i<formation.length;i++){
  const group=formation[i],actor=b.allies[i],hero=s.heroes.find(h=>h.id===group.hg261HeroId);
  if(!hero||!membership.includes(hero.id)||actor.unitId!==group.unitId)
   throw Error('Lỗi sở hữu stack của tướng trong trận Boss');
  byHero[hero.id]=(byHero[hero.id]||0)+1;
  if(byHero[hero.id]>2)throw Error('Một tướng vượt hai stack');
  actor.heroId=hero.id;actor.heroName=hero.name;actor.sourceSlot=i;
  actor.spd=Math.max(.1,E.getUnit(s,actor.unitId).spd+E.heroSpeedAdjustment(E.heroStats(s,hero.id).spd));
 }
 b.hg261Joint={version:1,team:membership,slotsPerHero:2};
 b.heroCastTurn={};b.heroSpellCooldown={};b.heroEffects=[];b.heroMovementInstinct={};
 b.history.unshift('⚔ '+membership.map(id=>s.heroes.find(h=>h.id===id).name).join(' + ')+
  ': tối đa hai stack/tướng, phép và buff theo chủ sở hữu, quân thật hao hụt.');
 return true;
}
function tick(s,...args){
 const out=old.tick(s,...args);
 if(active(s)&&s.battle&&!s.battle.hg261Joint)annotate(s);
 if(active(s)&&!s.hg26.enabled&&!s.expedition&&!s.battle&&s.hg26.joint.towerBackup){
  try{assignPlans(s,available(s,s.hg26.joint.team));restoreTower(s)}
  catch(e){E.note(s,'HG26.1: cần phân quân lại trước khi khôi phục Bí Cảnh: '+e.message)}
 }
 return out;
}
function topUp(s,team){
 if(s.training?.length)return {type:'training',remaining:s.training[0].remaining};
 const allocation=available(s,team);
 for(let i=0;i<team.length;i++){
  const desired=team[i].groups,actual=allocation[i].groups,
   needed=sum(desired),filled=sum(actual);
  if(filled&&filled*100>=needed*s.hg26.config.minCoverage)continue;
  if(!s.hg26.config.autoRecruit)return {type:'halt',reason:'Đội '+(i+1)+' thiếu quân, không bật tự tuyển'};
  for(const g of desired){
   const u=E.getUnit(s,g.unitId);
   if(!u||u.rewardOnly||u.towerExclusive||!E.troopPrerequisites(s,u)?.available)continue;
   const have=actual.filter(x=>x.unitId===g.unitId).reduce((n,x)=>n+x.count,0);
   const missing=Math.max(0,g.count-have);
   if(!missing)continue;
   let lo=0,hi=Math.min(missing,1000);
   while(lo<hi){const n=Math.ceil((lo+hi)/2);if(E.canAfford(s,E.recruitCost(s,u,n)))lo=n;else hi=n-1}
   if(lo>0){const paid=E.recruit(s,g.unitId,lo);
    return {type:'recruit_queued',unitId:u.id,count:lo,paid};}
  }
  return {type:'halt',reason:'Không đủ tài nguyên hoặc quân hợp lệ bổ sung đội '+(i+1)};
 }
 assignPlans(s,allocation);
 restoreTower(s);
 const sumUnits=allocation.reduce((n,r)=>n+sum(r.groups),0);
 if(sumUnits<s.hg26.config.minUnits)return {type:'halt',reason:'Tổng số quân ba tướng quá thấp'};
 return {type:'ready',total:sumUnits};
}
function finishAfterReturn(s,reason){
 try{assignPlans(s,available(s,s.hg26.joint.team));restoreTower(s)}
 catch(e){E.note(s,'HG26.1: cần bố trí lại quân sau trận trước khi vào Bí Cảnh: '+e.message)}
 return {changed:true,type:'stopped',status:E.hg26Stop(s,reason)};
}
function recovery(s){
 const q=s.hg26,c=q.config;
 if(s.battle||s.expedition||s.march||s.parallelMarches?.length)
  return {changed:true,type:'stopped',status:E.hg26Stop(s,'Đoàn chưa về đủ ba tướng')};
 if(q.runs>=c.maxRuns)return finishAfterReturn(s,'Đã hoàn thành số trận đặt trước');
 if(c.stopOnLoss&&q.last?.outcome!=='win')
  return finishAfterReturn(s,'Trận trước chưa thắng');
 if(q.last?.lossPercent>c.maxLossPercent)
  return finishAfterReturn(s,'Tổn thất vượt ngưỡng');
 if(c.autoHeal){
  if(s.arenaQueue)return {changed:false,type:'healing',remaining:s.arenaQueue.remaining};
  if(totalArmy(s.wounded)){
   try{const healing=E.heal(s);return {changed:true,type:'heal_queued',wounded:healing.count}}
   catch(e){return {changed:true,type:'stopped',status:E.hg26Stop(s,'Thiếu tiền chữa thương: '+e.message)}}
  }
 }
 const refill=topUp(s,q.joint.team);
 if(refill.type==='halt')return {changed:true,type:'stopped',status:E.hg26Stop(s,refill.reason)};
 if(refill.type!=='ready')return {changed:refill.type==='recruit_queued',...refill};
 if(s.ap+1e-9<E.hg182MarchCost(s,c.target)+c.keepAP)
  return {changed:false,type:'ap_regen',ap:s.ap};
 q.phase='ready';return {changed:true,type:'refilled',units:refill.total,heroes:q.joint.team.length};
}
function step(s){
 const q=s.hg26;
 if(!active(s)||!q.enabled)return old.step(s);
 if(q.phase==='ready'){
  try{return dispatch(s)}
  catch(e){if(!s.expedition)restoreTower(s);return {changed:true,type:'stopped',status:E.hg26Stop(s,'Không thể xuất đoàn ba tướng: '+e.message)}}
 }
 if(q.phase==='recovery')return recovery(s);
 if(q.phase==='outbound'&&s.battle)annotate(s);
 return old.step(s);
}
function battleAct(s,cmd,options){
 const b=s.battle,joint=b?.hg261Joint,team=joint?.team||[];
 const before=joint?{target:b.target,team:team.slice(),run:s.hg26?.runs||0}:null;
 const result=old.battleAct(s,cmd,options);
 if(result?.type==='win'&&before){
  // The global NPC loot/quest/report occurs exactly ONCE in canonical HG24.
  // Secondary participating heroes receive one real-win XP receipt each,
  // never resources or a duplicate Boss kill counter.
  const base=E.battleExperienceReward({kind:'npc',level:E.getTile(before.target).level}).baseXp;
  const extra=E.hg182CombatXpPreview?.(s,E.getTile(before.target).level,false,'npc')?.extra||0;
  for(const heroId of before.team.slice(1))
   E.grantHeroExperience(s,heroId,base+extra,'cùng thắng Boss HG26.1');
 }
 return result;
}
function valid(s){
 if(!old.strict(s))return false;
 const q=s.hg26;if(!q?.joint)return true;
 const j=q.joint;
 if(j.version!==1||!Array.isArray(j.team)||j.team.length<1||j.team.length>3||
 typeof j.lastVictoryShared!=='object'||j.lastVictoryShared!==null&&!isInt(j.lastVictoryShared,0,1e8))return false;
 const ids=new Set(),totals={};
 for(const member of j.team){
  if(!isInt(member?.heroId,1)||ids.has(member.heroId)||!s.heroes.some(h=>h.id===member.heroId)||
    !Array.isArray(member.groups)||member.groups.length<1||member.groups.length>2)return false;
  ids.add(member.heroId);
  for(const g of member.groups){
   if(typeof g.unitId!=='string'||!E.getUnit(s,g.unitId)||!isInt(g.count,1,1e8))return false;
   totals[g.unitId]=(totals[g.unitId]||0)+g.count;
  }
 }
 if(q.config.team?.length!==ids.size||q.config.team.some((id,i)=>id!==j.team[i].heroId))return false;
 if(s.battle?.hg261Joint){
  const b=s.battle;
  if(b.kind!=='npc'||b.target!==q.config.target||b.allies.length>6||
    !b.allies.every(u=>ids.has(u.heroId)&&u.side==='player'))return false;
  for(const id of ids)if(b.allies.filter(u=>u.heroId===id).length>2)return false;
 }
 return true;
}
function strict(s){return old.strict(s)&&valid(s)}
function make(...args){return old.make(...args)}
function parse(text){const s=old.parse(text);if(s.hg26?.joint&&s.battle)annotate(s);if(!strict(s))throw Error('Save HG26.1 không hợp lệ');return s}
function serialize(s){if(!strict(s))throw Error('Save HG26.1 không hợp lệ');return old.serialize(s)}
function status(s){
 const x=old.status(s);return {...x,team:participants(s).map(p=>({
  heroId:p.heroId,name:s.heroes.find(h=>h.id===p.heroId)?.name||'?',stacks:p.groups.length,
  units:sum(p.groups)}))};
}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 tick,battleAct,startMarch:march,selectHero:select,heroAway,appoint,hg20HeroRole:protectedRole,
 hg20SetHeroPlan:setPlan,hg26Start:start,hg26Step:step,hg26Status:status,hg261Valid:valid});
root.HOG_HG261=Object.freeze({version:1,heroesPerBoss:3,stacksPerHero:2,
 mode:'same-battle-real-casualties',saveVersion:7});
})(typeof globalThis!=='undefined'?globalThis:this);
