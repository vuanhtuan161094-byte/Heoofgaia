/* HG40.8: transactional hero dismissal and immutable-quality migration; Save v07 unchanged. */
(function installHG408(root){
 'use strict';
 const E=root.HOG_ENGINE;
 if(!E||E.V!==7||!E.hg20HeroRole||!E.hg21TowerEnter||!E.hg26Status)throw Error('HG40.8 requires the complete Save v07 hero engine');
 const previous={make:E.make,parseSave:E.parseSave};
 const colors=new Set(['white','blue','yellow','green','purple']);
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v||{},k);
 const heroById=(s,id)=>s.heroes.find(h=>h.id===id);
 function baseQuality(h){
   if(colors.has(h?.quality))return h.quality;
   const spent=h?.spentAttributePoints||{},base=h?.hg18Base||{};
   const initial={level:1};
   for(const k of ['atk','def','spd','int']){
     const stored=Number(base[k]);
     initial[k]=Number.isFinite(stored)?stored:Math.max(0,Number(h?.[k]||0)-Number(spent[k]||0));
   }
   return E.heroNameColor(initial);
 }
 function normalize(s){
   if(s?.heroes)for(const h of s.heroes)if(!colors.has(h.quality))h.quality=baseQuality(h);
   return s;
 }
 function refs(s,id){
   const matches=[];
   const walk=(node,path)=>{
     if(!node||typeof node!=='object')return;
     for(const [k,v] of Object.entries(node)){
       const p=path+'.'+k;
       if((k==='heroId'||k==='hg261HeroId'||k==='ownerHeroId')&&Number(v)===id)matches.push(p);
       else if(k==='team'&&Array.isArray(v)&&/(tower|hg26|hg21|hg261)/i.test(path)&&v.includes(id))matches.push(p);
       else if(k==='heroCastTurn'||k==='heroMovementInstinct'||k==='heroSpellCooldown'){
         if(v&&typeof v==='object'&&Object.keys(v).some(q=>q===String(id)||q.startsWith(id+':')))matches.push(p);
       }
       if(v&&typeof v==='object')walk(v,p);
     }
   };
   walk(s,'state');
   return matches;
 }
 function inspect(s,id){
   const h=heroById(s,id),reasons=[];
   if(!h)return {allowed:false,reasons:['Tướng không tồn tại.'],hero:null,gear:0,plans:0};
   if(s.heroes.length<=1)reasons.push('Không được sa thải tướng cuối cùng.');
   if(s.castellan===id)reasons.push('Phải miễn nhiệm Castellan trước.');
   if(E.heroAway(s,id)||E.hg20HeroRole(s,id).status!=='home')reasons.push('Tướng còn hành quân, đồn trú hoặc trở về thành.');
   if(s.battle||s.march||s.expedition?.heroId===id||s.parallelMarches?.some(q=>q.heroId===id))reasons.push('Chờ kết thúc toàn bộ giao tranh và hành quân đang diễn ra.');
   const hunt=s.hg26;
   const listed=hunt?.config?.heroId===id||hunt?.config?.team?.includes(id)||hunt?.joint?.team?.some(p=>p.heroId===id);
   if(hunt?.enabled&&listed)reasons.push('Tắt đội săn Boss tự động và chờ giải phóng tướng.');
   if(hunt?.joint?.towerBackup?.team?.includes(id)&&hunt.enabled)reasons.push('Tướng còn trong đội Tháp đang được Boss tạm giữ.');
   if(s.dailyTaskState?.heroTask?.active?.heroId===id)reasons.push('Còn nhiệm vụ tướng đang thực hiện; cần hoàn tất trước.');
   if(s.activeHero===id&&!s.heroes.some(q=>q.id!==id&&q.id!==s.castellan&&E.hg20HeroRole(s,q.id).status==='home'))
     reasons.push('Cần một tướng khác ở thành, không giữ chức Castellan, để thay chỉ huy.');
   const gear=Object.values(s.equipment?.[id]||{}).filter(x=>x!==null&&x!==undefined);
   if(gear.some(uid=>!s.inventory?.some(item=>item.uid===uid)))reasons.push('Trang bị đang mặc thiếu bản ghi trong kho; chặn để bảo toàn đồ.');
   const gearIds=new Set(gear);
   if(gear.some(uid=>Object.entries(s.equipment||{}).some(([other,slots])=>Number(other)!==id&&Object.values(slots).includes(uid))))
     reasons.push('Một trang bị bị gắn trên nhiều tướng; cần sửa dữ liệu trước.');
   const plans=Object.keys(s.hg20?.plans||{}).filter(k=>k.endsWith(':'+id)).length;
   return {allowed:reasons.length===0,reasons,hero:h,gear:gearIds.size,plans};
 }
 function dismiss(s,id){
   if(!Number.isSafeInteger(id))throw Error('ID tướng không hợp lệ.');
   const check=inspect(s,id);
   if(!check.allowed)throw Error(check.reasons.join(' '));
   const trial=JSON.parse(JSON.stringify(s));
   const removed=heroById(trial,id);
   const owned=Object.values(trial.equipment?.[id]||{});
   // Inventory is authoritative; releasing slots never creates, destroys or copies an item.
   delete trial.equipment[id];
   for(const k of Object.keys(trial.hg20?.plans||{}))if(k.endsWith(':'+id))delete trial.hg20.plans[k];
   for(const k of Object.keys(trial.hg24?.templates||{}))if(k.endsWith(':'+id))delete trial.hg24.templates[k];
   const tower=trial.hg20?.tower;
   if(tower){
     tower.team=tower.team.filter(q=>q!==id);
     if(Array.isArray(tower.picks))tower.picks=tower.picks.filter(q=>q.heroId!==id);
   }
   // Tower's last encounter is history, not a live hero reference. Retain its
   // identity as a name snapshot without an orphan foreign-key value.
   if(tower?.last){
     const last=tower.last;
     if(Array.isArray(last.team)&&last.team.includes(id)){
       last.retiredHeroNames=[...(last.retiredHeroNames||[]),removed.name];
       last.team=last.team.filter(q=>q!==id);
     }
     if(Array.isArray(last.stackLosses))last.stackLosses=last.stackLosses.map(q=>{
       if(q.heroId!==id)return q;
       const {heroId,...battleRecord}=q;
       return {...battleRecord,retiredHeroName:removed.name};
     });
   }
   if(Array.isArray(trial.heroBuffs))trial.heroBuffs=trial.heroBuffs.filter(q=>q.heroId!==id);
   const hunt=trial.hg26;
   if(hunt){
     if(hunt.config?.heroId===id)hunt.config.heroId=null;
     if(Array.isArray(hunt.config?.team)&&hunt.config.team.includes(id)){
       delete hunt.config.team;delete hunt.joint;
     }
     if(hunt.joint?.team?.some(p=>p.heroId===id))delete hunt.joint;
     if(hunt.last?.heroId===id)hunt.last=null;
   }
   trial.heroes=trial.heroes.filter(h=>h.id!==id);
   if(trial.activeHero===id){
     // Prevent HG20's old v07 formation migration from re-creating a deleted plan.
     trial.formation=[];
     const fallback=trial.heroes.find(h=>h.id!==trial.castellan&&E.hg20HeroRole(trial,h.id).status==='home');
     if(!fallback)throw Error('Không thể chọn chỉ huy thay thế.');
     trial.activeHero=fallback.id;
     trial.formation=E.hg20HeroPlan(trial,fallback.id).map(g=>({...g}));
   }
   // A one-pass strict validation is a transactional preflight. Nothing is changed on failure.
   const dangling=refs(trial,id);
   if(dangling.length)throw Error('Còn tham chiếu tướng chưa thể giải phóng an toàn: '+dangling.slice(0,5).join(', '));
   if(!E.strictSave(trial))throw Error('Dữ liệu v07 sau sa thải không hợp lệ, không thay đổi Save.');
   for(const key of Object.keys(s))if(!own(trial,key))delete s[key];
   Object.assign(s,trial);
   E.note(s,'Sa thải '+removed.name+'; trả '+owned.length+' món trang bị về kho, giải phóng '+check.plans+' đội hình dự kiến; không hoàn vàng hoặc thay đổi quân.');
   return {heroId:id,name:removed.name,returnedGear:owned.length,removedPlans:check.plans,activeHero:s.activeHero,slotsFree:1};
 }
 E.make=function(...args){return normalize(previous.make(...args))};
 E.parseSave=function(...args){return normalize(previous.parseSave(...args))};
 Object.assign(E,{hg408HeroQuality:baseQuality,hg408DismissCheck:inspect,hg408DismissHero:dismiss,hg408DanglingRefs:refs});
 root.HOG_HG408=Object.freeze({version:1,saveVersion:7});
})(typeof globalThis!=='undefined'?globalThis:this);
