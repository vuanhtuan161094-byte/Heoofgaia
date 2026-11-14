/* HG82 · City-bound heroes, safe transfers and per-city dispatch.
   Keeps exact Save v07, one HTML and independent army stores. */
(function(root){'use strict';
 const E=root.HOG_ENGINE;
 if(!E?.hg81Ensure||!E?.hg408DismissHero||!E?.hg20HeroPlan||!E?.activeCity||!E?.marchDuration)
  throw Error('HG82 requires HG10/HG20/HG81');
 const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,
  hire:E.hireCandidate,heroTask:E.claimHeroTask,claimUnique:E.hg71ClaimSpecial,
  switchCity:E.switchCity,selectHero:E.selectHero,role:E.hg20HeroRole,plan:E.hg20HeroPlan,
  reservations:E.hg20Reservations,setPlan:E.hg20SetHeroPlan,auto:E.autoFormation,
  startMarch:E.startMarch,appoint:E.appoint,tick:E.tick,dismiss:E.hg408DismissHero,
  dismissCheck:E.hg408DismissCheck,skillUp:E.hg81SkillUp,strip:E.hg81StripHero};
 const copy=o=>JSON.parse(JSON.stringify(o));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 const int=(x,min=0,max=1e9)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const city=(s,id)=>s.cities.find(c=>c.id===id);
 const home=(s,id)=>s.heroes.find(h=>h.id===id)?.cityId||null;
 const active=s=>s.activeCityId||'main';
 const cityLabel=(s,id)=>city(s,id)?.name||'thành '+id;
 function initialCity(s,h){
  const stationed=s.stationedHeroes?.find(q=>q.heroId===h.id);
  const moving=s.expedition?.heroId===h.id?s.expedition:s.parallelMarches?.find(q=>q.heroId===h.id);
  const declared=stationed?.homeCityId||moving?.homeCityId;
  if(city(s,declared))return declared;
  const castellanCity=s.cities.find(c=>c.local?.castellan===h.id||c.id===active(s)&&s.castellan===h.id);
  if(castellanCity)return castellanCity.id;
  const plans=Object.entries(s.hg20?.plans||{}).filter(([k,v])=>
   k.endsWith(':'+h.id)&&Array.isArray(v)&&v.some(g=>g.count>0)&&city(s,k.split(':')[0]))
   .map(([k])=>k.split(':')[0]);
  if(plans.includes(active(s))&&s.activeHero===h.id)return active(s);
  if(plans.includes('main'))return 'main';
  if(plans.length)return plans[0];
  return city(s,active(s))&&h.id===s.activeHero?active(s):'main';
 }
 function ensure(s){
  if(!Array.isArray(s?.cities)||!Array.isArray(s.heroes))throw Error('Thiếu dữ liệu thành/tướng HG82');
  if(!s.hg82)s.hg82={v:1,transfers:[]};
  if(!Array.isArray(s.hg82.transfers))throw Error('Hành trình điều tướng HG82 hỏng');
  for(const h of s.heroes)if(!city(s,h.cityId))h.cityId=initialCity(s,h);
  // Legacy plans could bind the same hero to several cities. They reserve only
  // city-local stock, so releasing stale foreign drafts never reduces troops.
  for(const key of Object.keys(s.hg20?.plans||{})){
   const sep=key.lastIndexOf(':'),ci=key.slice(0,sep),id=Number(key.slice(sep+1));
   if(home(s,id)&&home(s,id)!==ci)delete s.hg20.plans[key];
  }
  for(const key of Object.keys(s.hg24?.templates||{})){
   const row=s.hg24.templates[key];
   if(home(s,row?.heroId)&&home(s,row.heroId)!==row.cityId)delete s.hg24.templates[key];
  }
  for(const c of s.cities){
   if(c.local?.castellan&&home(s,c.local.castellan)!==c.id)c.local.castellan=null;
  }
  if(s.castellan&&home(s,s.castellan)!==active(s))s.castellan=null;
  const h=s.heroes.find(h=>h.id===s.activeHero);
  if(h&&h.cityId!==active(s))s.formation=[];
  return s;
 }
 function valid(s){
  const x=s.hg82;
  if(!x||x.v!==1||!Array.isArray(x.transfers)||x.transfers.length>10)return false;
  if(!Array.isArray(s.heroes)||s.heroes.some(h=>!city(s,h.cityId)))return false;
  if(s.castellan&&home(s,s.castellan)!==active(s))return false;
  for(const c of s.cities)if(c.local?.castellan&&home(s,c.local.castellan)!==c.id)return false;
  for(const k of Object.keys(s.hg20?.plans||{})){
   const ci=k.slice(0,k.lastIndexOf(':')),h=Number(k.slice(k.lastIndexOf(':')+1));
   if(home(s,h)&&home(s,h)!==ci)return false;
  }
  const unique=new Set();
  for(const q of x.transfers){
   if(!q||!int(q.heroId,1)||unique.has(q.heroId)||home(s,q.heroId)!==q.fromCityId||
     !city(s,q.fromCityId)||!city(s,q.toCityId)||q.fromCityId===q.toCityId||
     !Array.isArray(q.path)||q.path.length<2||
     q.path[0]!==city(s,q.fromCityId).key||q.path.at(-1)!==city(s,q.toCityId).key||
     !Number.isFinite(q.total)||q.total<1||q.total>1e8||
     !Number.isFinite(q.remaining)||q.remaining<0||q.remaining>q.total)return false;
   unique.add(q.heroId);
  }
  return true;
 }
 function strict(s){return old.strict(s)&&valid(s)}
 function make(...args){const s=old.make(...args);ensure(s);return s}
 function parse(...args){const s=old.parse(...args);ensure(s);if(!strict(s))throw Error('Save v07 thành/tướng HG82 không hợp lệ');return s}
 function serialize(s){ensure(s);if(!strict(s))throw Error('Không thể sao lưu trạng thái thành/tướng HG82');return old.serialize(s)}
 function localHeroes(s,cityId=active(s)){ensure(s);return s.heroes.filter(h=>h.cityId===cityId)}
 function role(s,id){
  const h=s.heroes.find(q=>q.id===id);
  if(!h)return old.role(s,id);
  const job=s.hg82?.transfers?.find(q=>q.heroId===id);
  if(job)return {status:'relocating',heroId:id,cityId:h.cityId,army:[],
   label:'Đang chuyển đến '+cityLabel(s,job.toCityId)+' · '+Math.ceil(job.remaining/Math.max(1,s.speed))+' giây'};
  if(h.cityId!==active(s))return {status:'other_city',heroId:id,cityId:h.cityId,army:[],
   label:'Đang thuộc '+cityLabel(s,h.cityId)+' (không ở thành này)'};
  const r=old.role(s,id);return {...r,cityId:h.cityId};
 }
 function plan(s,id,cityId=active(s)){
  const h=s.heroes.find(q=>q.id===id);
  if(h&&h.cityId!==cityId)return [];
  return old.plan(s,id,cityId);
 }
 function reservations(s,id,cityId=active(s)){
  // HG20 canonical reservations remain per-city after stale old plans migrate.
  return old.reservations(s,id,cityId);
 }
 function requireLocal(s,id){
  const h=s.heroes.find(q=>q.id===id);
  if(!h)throw Error('Tướng không tồn tại');
  if(h.cityId!==active(s))throw Error(h.name+' đang ở '+cityLabel(s,h.cityId)+'. Hãy mở đúng thành để điều quân.');
  return h;
 }
 function selectHero(s,id){ensure(s);requireLocal(s,id);if(role(s,id).status==='relocating')throw Error('Tướng đang chuyển thành');return old.selectHero(s,id)}
 function setPlan(s,id,groups){ensure(s);requireLocal(s,id);return old.setPlan(s,id,groups)}
 function auto(s){ensure(s);requireLocal(s,s.activeHero);return old.auto(s)}
 function startMarch(s,...args){ensure(s);requireLocal(s,s.activeHero);return old.startMarch(s,...args)}
 function appoint(s,id){ensure(s);requireLocal(s,id);return old.appoint(s,id)}
 function hire(s,...args){
  ensure(s);const id=old.hire(s,...args),h=s.heroes.find(h=>h.id===id);
  if(h)h.cityId=active(s);
  // A newly hired hero immediately becomes the commander only when the
  // opened town previously had no local commander. Never teleport another.
  if(h&&home(s,s.activeHero)!==active(s)&&!s.march&&!s.battle)old.selectHero(s,id);
  E.hg81Ensure(s);return id;
 }
 function newQuest(s,method,args){
  const before=new Set(s.heroes.map(h=>h.id)),res=method(s,...args);
  for(const h of s.heroes)if(!before.has(h.id)){
   h.cityId=active(s);
   if(home(s,s.activeHero)!==active(s)&&!s.march&&!s.battle)old.selectHero(s,h.id);
   E.hg81Ensure(s);
  }
  return res;
 }

 // HG90: pick a genuine local, idle commander after city switch, arrival or
 // receiving a new hero. Never teleport the selected hero from another city.
 function activateLocal(s,preferredId=null){
  ensure(s);if(s.march||s.battle||s.expedition||s.parallelMarches?.length)return null;
  const ready=h=>h&&h.cityId===active(s)&&h.id!==s.castellan&&
    role(s,h.id).status==='home';
  const chosen=s.heroes.find(h=>h.id===preferredId&&ready(h))||
    (ready(s.heroes.find(h=>h.id===s.activeHero))?
      s.heroes.find(h=>h.id===s.activeHero):null)||
    localHeroes(s).find(ready);
  if(!chosen)return null;
  if(s.activeHero!==chosen.id){
   s.activeHero=chosen.id;
   s.formation=plan(s,chosen.id).map(g=>({...g}));
   const c=city(s,active(s));if(c?.local)c.local.formation=s.formation.map(g=>({...g}));
  }
  return chosen.id;
 }
 function chooseLocal(s){
  const rows=localHeroes(s),available=rows.filter(h=>role(s,h.id).status==='home'&&h.id!==s.castellan);
  return available[0]||rows.find(h=>role(s,h.id).status!=='relocating')||null;
 }
 function switchCity(s,id){
  ensure(s);if(!city(s,id))throw Error('Thành đích không tồn tại');
  if(id===active(s))return city(s,id);
  const src=active(s),current=s.heroes.find(h=>h.id===s.activeHero);
  if(current?.cityId===src&&Array.isArray(s.formation)&&s.formation.some(g=>g.count>0))
   s.hg20.plans[src+':'+current.id]=s.formation.map(g=>({...g}));
  // HG20's old switchCity would seed a destination plan for the source hero
  // from a saved city-local formation, effectively sharing heroes by teleport.
  s.formation=[];
  const dest=city(s,id);
  if(Array.isArray(dest.local?.formation))dest.local.formation=[];
  const result=old.switchCity(s,id);
  const local=chooseLocal(s);
  // Do not select a busy Castellan, transfer or foreign commander by default.
  const ready=local&&role(s,local.id).status==='home'&&local.id!==s.castellan;
  if(ready)s.activeHero=local.id;
  s.formation=ready?plan(s,local.id,id):[];
  if(city(s,id)?.local)city(s,id).local.formation=s.formation.map(g=>({...g}));
  return result;
 }
 function propose(s,id){
  ensure(s);const hero=requireLocal(s,id);
  if(role(s,id).status!=='home')return {heroId:id,formation:[],total:0,points:0,limit:E.heroLimit(hero.level,hero)};
  const held=reservations(s,id),limit=E.heroLimit(hero.level,hero),groups=[];
  let left=limit;
  for(const u of E.arrUnits(s).slice().sort((a,b)=>b.tier-a.tier||b.atk-a.atk)){
   if(groups.length>=7)break;
   const free=Math.max(0,(s.army[u.id]||0)-(held[u.id]||0)),price=E.unitValue(u);
   const count=Math.min(free,Math.floor(left/price));
   if(count>0){groups.push({unitId:u.id,count});left-=count*price;}
  }
  return {heroId:id,formation:groups,total:groups.reduce((n,x)=>n+x.count,0),
   points:limit-left,limit,cityId:active(s)};
 }
 function transfer(s,id,toCityId){
  ensure(s);const h=requireLocal(s,id),fromCityId=active(s),dest=city(s,toCityId);
  if(!dest||toCityId===fromCityId)throw Error('Chọn một thành đích khác');
  if(s.hg82.transfers.some(q=>q.heroId===id)||old.role(s,id).status!=='home'||
   s.march||s.battle||s.expedition||s.parallelMarches?.length)
   throw Error('Chỉ điều tướng đang rảnh và không trong giao tranh/hành quân');
  if(s.castellan===id||s.cities.some(c=>c.local?.castellan===id))
   throw Error('Tướng đang trấn thủ thành. Hãy miễn nhiệm trước khi điều đi.');
  if(s.dailyTaskState?.heroTask?.active?.heroId===id)
   throw Error('Tướng còn nhiệm vụ đang nhận; hãy hoàn thành hoặc hủy nhiệm vụ trước khi điều đi.');
  const hunt=s.hg26;
  if(hunt?.enabled&&(hunt.config?.heroId===id||hunt.config?.team?.includes(id)||hunt.joint?.team?.some(x=>x.heroId===id)))
   throw Error('Tắt tự săn Boss của tướng trước khi điều thành');
  const path=E.pathfind(city(s,fromCityId).key,dest.key);
  if(!path||path.length<2)throw Error('Không có đường nối giữa hai thành');
  const speed=E.heroStats(s,id)?.spd??h.spd;
  const total=Math.max(1,E.marchDuration(speed,path,1)),q={heroId:id,fromCityId,toCityId,total,remaining:total,path};
  const trial=copy(s);E.hg81Ensure(trial);
  trial.hg20.plans[fromCityId+':'+id]=[];
  for(const key of Object.keys(trial.hg24?.templates||{}))
   if(trial.hg24.templates[key]?.heroId===id)delete trial.hg24.templates[key];
  if(trial.activeHero===id)trial.formation=[];
  trial.hg82.transfers.push(q);
  // The previous active commander is now relocating. Immediately switch to
  // another local commander if available, leaving the outgoing one in transit.
  if(trial.activeHero===id){
   const replacement=trial.heroes.find(other=>other.id!==id&&
     other.cityId===fromCityId&&other.id!==trial.castellan&&
     !trial.hg82.transfers.some(t=>t.heroId===other.id)&&
     !E.heroAway(trial,other.id));
   if(replacement){
    trial.activeHero=replacement.id;
    trial.formation=plan(trial,replacement.id).map(g=>({...g}));
   }
  }
  if(!strict(trial))throw Error('Điều tướng không đạt Save v07; chưa thay đổi dữ liệu');
  Object.assign(s,trial);
  E.note(s,h.name+' đang đi bộ từ '+cityLabel(s,fromCityId)+' đến '+cityLabel(s,toCityId)+
   ' ('+(path.length-1)+' bước; ETA '+Math.ceil(total/Math.max(1,s.speed))+' giây thực). Không chuyển quân hoặc tài nguyên.');
  return {...q,name:h.name};
 }
 function tick(s,now){
  const from=s.lastTick,r=old.tick(s,now);
  if(!s.hg82?.transfers?.length||!(s.lastTick>from))return r;
  const elapsed=E.gameElapsedSeconds(s,from,s.lastTick);
  for(const q of s.hg82.transfers)q.remaining=Math.max(0,q.remaining-elapsed);
  const done=s.hg82.transfers.filter(q=>q.remaining===0);
  s.hg82.transfers=s.hg82.transfers.filter(q=>q.remaining>0);
  for(const q of done){
   const h=s.heroes.find(h=>h.id===q.heroId);
   if(!h)continue;
   h.cityId=q.toCityId;
   if(s.activeHero===h.id&&active(s)!==q.toCityId)s.formation=[];
   if(active(s)===q.toCityId&&(!home(s,s.activeHero)||home(s,s.activeHero)!==active(s))){
    s.activeHero=h.id;s.formation=plan(s,h.id);
   }
   E.note(s,h.name+' đã đến '+cityLabel(s,q.toCityId)+'. Tướng chỉ có thể nhận quân tại thành này.');
  }
  activateLocal(s);
  return r;
 }
 function quickDismiss(s,id){
  ensure(s);const h=requireLocal(s,id);
  if(s.heroes.length<=1)throw Error('Không thể sa thải tướng cuối cùng. Hãy tuyển tướng thay thế trước.');
  if(h.questSpecial&&h.rewardOrigin==='hero_task_20')
   throw Error('Tướng nhiệm vụ độc bản được bảo vệ; không thể sa thải.');
  if(h.mythicId&&h.mythicOrigin==='hg89_fragments')
   throw Error('Thần Tướng thần thoại đã thức tỉnh là độc bản; không thể sa thải và mất vĩnh viễn.');
  if(s.hg82.transfers.some(q=>q.heroId===id)||E.heroAway(s,id)||
   s.battle||s.march||s.expedition||s.parallelMarches?.length)
   throw Error('Tướng đang ở ngoài hoặc còn chiến đấu/hành quân. Hãy gọi tướng về trước.');
  const trial=copy(s);E.hg81Ensure(trial);
  const cancelledTask=trial.dailyTaskState?.heroTask?.active?.heroId===id;
  if(cancelledTask)trial.dailyTaskState.heroTask.active=null;
  let releasedCastle=false;
  if(trial.castellan===id){
   trial.castellan=null;
   const c=city(trial,active(trial));if(c?.local)c.local.castellan=null;
   releasedCastle=true;
  }
  const hunt=trial.hg26;
  const hunted=!!(hunt?.enabled&&(hunt.config?.heroId===id||hunt.config?.team?.includes(id)||
   hunt.joint?.team?.some(p=>p.heroId===id)));
  if(hunted)E.hg26Stop(trial,'Giải tán đội săn Boss để giải ngũ tướng '+h.name);
  // If the target is the only active commander and the only alternative
  // currently holds a castle, free that holder too. No troops are touched.
  if(trial.activeHero===id){
   const other=trial.heroes.find(a=>a.id!==id&&a.cityId===active(trial)&&
    !E.heroAway(trial,a.id)&&!trial.hg82.transfers.some(t=>t.heroId===a.id));
   if(other&&trial.castellan===other.id){
    trial.castellan=null;
    const c=city(trial,active(trial));if(c?.local)c.local.castellan=null;
    releasedCastle=true;
   }
  }
  // The canonical HG408/HG81 transaction returns gear from all ten slots,
  // clears stored plans, Tower team, Boss config and training ledgers.
  const result=old.dismiss(trial,id);
  if(!strict(trial))throw Error('Sa thải nhanh không vượt kiểm tra Save v07; không thay đổi gì.');
  for(const k of Object.keys(s))if(!own(trial,k))delete s[k];
  Object.assign(s,trial);
  E.note(s,'HG82: sa thải '+h.name+'; bảo toàn kho trang bị và quân'+
   (cancelledTask?', hủy nhiệm vụ tướng chưa lĩnh thưởng':'')+
   (releasedCastle?', miễn nhiệm chức Trấn thủ':'')+'.');
  return {...result,cancelledTask,stoppedHunt:hunted,releasedCastle};
 }
 function dismiss(s,id){
  ensure(s);const h=requireLocal(s,id);
  if(h.mythicId&&h.mythicOrigin==='hg89_fragments')
   throw Error('Không thể sa thải Thần Tướng độc bản. Hãy điều chuyển giữa các thành.');
  if(s.hg82.transfers.some(q=>q.heroId===id))throw Error('Tướng đang chuyển thành');
  const res=old.dismiss(s,id);
  // No heroic units were created or moved during dismissal.
  if(!valid(s))throw Error('Dữ liệu liên kết thành HG82 sau sa thải bị lỗi');
  return res;
 }
 function dismissCheck(s,id){
  const q=old.dismissCheck(s,id),h=s.heroes.find(h=>h.id===id);
  if(h&&h.cityId!==active(s))return {...q,allowed:false,reasons:[...q.reasons,'Tướng thuộc '+cityLabel(s,h.cityId)+'; mở đúng thành để sa thải.']};
  if(s.hg82?.transfers?.some(t=>t.heroId===id))
   return {...q,allowed:false,reasons:[...q.reasons,'Tướng đang trên đường chuyển thành.']};
  if(h?.mythicId&&h.mythicOrigin==='hg89_fragments')
   return {...q,allowed:false,reasons:[...q.reasons,'Thần Tướng thần thoại độc bản; không được sa thải.']};
  return q;
 }
 function skillUp(s,id,key){ensure(s);requireLocal(s,id);return old.skillUp(s,id,key)}
 function strip(s,id,mode){ensure(s);requireLocal(s,id);return old.strip(s,id,mode)}
 Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
  hireCandidate:hire,claimHeroTask:(s,...a)=>newQuest(s,old.heroTask,a),
  hg71ClaimSpecial:(s,...a)=>newQuest(s,old.claimUnique,a),
  switchCity,selectHero,hg20HeroRole:role,hg20HeroPlan:plan,hg20Reservations:reservations,
  hg20SetHeroPlan:setPlan,autoFormation:auto,startMarch,appoint,tick,
  hg408DismissHero:dismiss,hg408DismissCheck:dismissCheck,
  hg81SkillUp:skillUp,hg81StripHero:strip,
  hg82Ensure:ensure,hg82Valid:valid,hg82HeroCity:home,hg82CityHeroes:localHeroes,
  hg82ProposePlan:propose,hg82TransferHero:transfer,hg82QuickDismiss:quickDismiss,hg82Transfers:s=>ensure(s).hg82.transfers,
  hg82ActivateLocal:activateLocal});
 root.HOG_HG82=Object.freeze({version:1,saveVersion:7,model:'hero ownership scoped to city; world SPD transfer ETA; no shared city garrisons'});
})(typeof globalThis!=='undefined'?globalThis:this);
