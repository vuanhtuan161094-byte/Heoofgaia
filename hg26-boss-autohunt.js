/* HG26 - opt-in boss hunting, canonical tactical battle receipts.
 * One pulse = at most one transition/turn/paid action. Never invents AP, army,
 * XP, victory or loot. The ordinary battle queue and Save v07 remain authority.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;if(!E?.hg24DispatchBoss||!E?.hg21TowerEnter)throw Error('HG26 requires HG24 and HG21');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,battleAct:E.battleAct};
const phases=new Set(['ready','outbound','battle','returning','recovery','halted']);
const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const troops=pool=>Object.values(pool||{}).reduce((a,b)=>a+(Number.isFinite(b)&&b>0?b:0),0);
function defaults(){return {target:null,heroId:null,maxRuns:3,keepAP:0,minUnits:1,minCoverage:70,
 maxLossPercent:30,autoHeal:true,autoRecruit:false,stopOnLoss:true}}
function ensure(s){
 if(!s.hg26)s.hg26={v:1,enabled:false,phase:'halted',config:defaults(),runs:0,wins:0,
  losses:0,departureUnits:0,last:null,reason:'Chưa bật tự săn Boss'};
 return s.hg26;
}
function valid(s){
 const q=s?.hg26,c=q?.config;
 if(!q||q.v!==1||typeof q.enabled!=='boolean'||!phases.has(q.phase)||
 !c||!(c.target===null||typeof c.target==='string'&&c.target.length<=20)||
 !(c.heroId===null||integer(c.heroId,1,1e9))||
 !integer(c.maxRuns,1,100)||!integer(c.keepAP,0,1000)||
 !integer(c.minUnits,1,100000000)||!integer(c.minCoverage,1,100)||
 !integer(c.maxLossPercent,0,100)||typeof c.autoHeal!=='boolean'||
 typeof c.autoRecruit!=='boolean'||typeof c.stopOnLoss!=='boolean'||
 !integer(q.runs,0,100)||!integer(q.wins,0,100)||!integer(q.losses,0,100)||
 q.wins+q.losses>q.runs||!integer(q.departureUnits,0,1e8)||
 typeof q.reason!=='string'||q.reason.length>220||!(q.last===null||
 (typeof q.last==='object'&&!Array.isArray(q.last)&&
 ['win','lose','timeout','retreat'].includes(q.last.outcome)&&
 integer(q.last.heroId,1,1e9)&&integer(q.last.unitsDeparted,0,1e8)&&
 integer(q.last.unitsSurvived,0,1e8)&&
 integer(q.last.lossPercent,0,100)&&integer(q.last.turns,0,100)&&
 (q.last.reportId===undefined||typeof q.last.reportId==='string') )))return false;
 if(q.enabled&&(!c.target||!c.heroId||q.phase==='halted'))return false;
 if(c.target&&(!E.getTile(c.target)||E.getTile(c.target).kind!=='npc'||E.getTile(c.target).eliteTier<11))return false;
 if(c.heroId&&!s.heroes.some(h=>h.id===c.heroId))return false;
 if(q.runs>c.maxRuns)return false;
 return true;
}
function stop(s,reason='Người chơi đã dừng'){
 const q=ensure(s);
 q.enabled=false;q.phase='halted';q.reason=String(reason).slice(0,200);
 if(s.battle?.target===q.config.target){s.battleAuto=false;s.battle.hg26NeedsManual=true;}
 E.note(s,'HG26: '+q.reason);
 return status(s);
}
function validateOpts(s,opts){
 const result={...defaults(),...opts};
 if(!result.target)throw Error('Chọn một Boss cụ thể để tự săn');
 if(!E.hg24RecommendBoss(s).some(x=>x.key===result.target))throw Error('Boss không có đường hành quân từ thành này');
 if(!integer(result.maxRuns,1,100)||!integer(result.keepAP,0,1000)||
 !integer(result.minUnits,1,100000000)||!integer(result.minCoverage,1,100)||
 !integer(result.maxLossPercent,0,100))throw Error('Giới hạn tự săn Boss không hợp lệ');
 for(const k of ['autoHeal','autoRecruit','stopOnLoss'])
  if(typeof result[k]!=='boolean')throw Error('Chính sách '+k+' phải là bật/tắt');
 if(result.heroId!==null&&(!integer(result.heroId,1,1e9)||!s.heroes.some(h=>h.id===result.heroId)))
  throw Error('Tướng săn Boss không tồn tại');
 return result;
}
function chooseHero(s,c){
 const picked=c.heroId??E.hg24RecommendBoss(s).find(x=>x.key===c.target)?.recommended?.heroId;
 const h=s.heroes.find(x=>x.id===picked);
 if(!h||E.hg20HeroRole(s,picked).status!=='home')throw Error('Không có tướng rảnh để tự săn Boss');
 return picked;
}
function prepare(s,c){
 const h=s.heroes.find(x=>x.id===c.heroId);
 if(!h||E.hg20HeroRole(s,c.heroId).status!=='home')throw Error('Tướng săn Boss chưa về thành');
 if(s.activeHero!==c.heroId)E.selectHero(s,c.heroId);
 const assigned=E.hg20HeroPlan(s,c.heroId);
 const template=E.hg24Template(s,c.heroId);
 // HG57-B: explicit manual squad owns the plan after the player disables
 // HG24 auto-fill. A saved historical 16-unit template is not permission to
 // silently replace a manually paid 61-unit team on HG26 Start.
 // Only an enabled auto-fill policy, or an otherwise empty plan, restores
 // the saved template. No new troops, AP or Save fields.
 if(template&&(template.autoFill||!assigned.length)){
  E.hg24Apply(s,c.heroId);
 }else if(!assigned.length){
  E.autoFormation(s);
 }
 const groups=E.hg20HeroPlan(s,c.heroId);
 if(!groups.length)throw Error('Không có quân thật để đi săn');
 const count=groups.reduce((a,g)=>a+g.count,0);
 if(count<c.minUnits)throw Error('Số quân thực thấp hơn giới hạn '+c.minUnits);
 const t=E.hg24Template(s,c.heroId);
 if(t){
  const desired=t.groups.reduce((a,g)=>a+g.count,0);
  if(count*100<desired*c.minCoverage)throw Error('Đội hình chưa đủ '+c.minCoverage+'% quân của mẫu');
 }
 // One template is created only when player enabled the farm; this is purely
 // allocation metadata, never a free troop or a promise of Boss victory.
 if(!t)E.hg24SaveTemplate(s,c.heroId);
 const cost=E.hg182MarchCost(s,c.target);
 if(s.ap+1e-9<cost+c.keepAP)throw Error('AP không đủ: cần '+cost+' xuất chinh và dự trữ '+c.keepAP);
 return {heroId:c.heroId,count,groups:groups.length,apCost:cost};
}
function start(s,opts){
 const q=ensure(s);
 if(q.enabled)throw Error('HG26 đã chạy; hãy dừng trước khi sửa chính sách');
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length)
  throw Error('Hãy kết thúc mọi hành quân hoặc trận chiến trước khi bật tự săn');
 const c=validateOpts(s,opts||{});
 c.heroId=chooseHero(s,c);
 prepare(s,c); // validates current force and AP before enabling
 Object.assign(q,{enabled:true,phase:'ready',config:c,runs:0,wins:0,losses:0,
  departureUnits:0,last:null,reason:''});
 E.note(s,'HG26: bật tự săn '+E.getTile(c.target).value+' bằng '+s.heroes.find(h=>h.id===c.heroId).name+'.');
 return status(s);
}
function status(s){
 const q=ensure(s),h=s.heroes.find(x=>x.id===q.config.heroId),tile=E.getTile(q.config.target);
 return {enabled:q.enabled,phase:q.phase,reason:q.reason,runs:q.runs,wins:q.wins,
  losses:q.losses,maxRuns:q.config.maxRuns,heroId:q.config.heroId,heroName:h?.name||null,
  target:q.config.target,targetName:tile?.value||null,config:{...q.config},last:q.last?{...q.last}:null};
}
function activeExp(s,q){
 return !!(s.expedition&&s.expedition.heroId===q.config.heroId&&
 (s.march?.target===q.config.target||s.battle?.target===q.config.target||
  s.expedition.phase==='returning'));
}
function step(s){
 const q=ensure(s),c=q.config;
 if(!q.enabled)return {changed:false,type:'off'};
 if(!valid(s))return {changed:true,type:'stopped',status:stop(s,'Chính sách hoặc Save không hợp lệ')};
 // Another UI action must never cause a bot to adopt unrelated trips/battles.
 if((s.parallelMarches?.length||s.stationedHeroes?.some(h=>h.heroId===c.heroId))||
  (s.battle||s.expedition||s.march)&&q.phase==='ready')
  return {changed:true,type:'stopped',status:stop(s,'Có hoạt động quân sự khác, dừng tự săn')};
 if(q.phase==='ready'){
  try{
   if(q.runs>=c.maxRuns)return {changed:true,type:'stopped',status:stop(s,'Đạt số trận tối đa')};
   const formation=prepare(s,c);
   const before=s.ap;
   const march=E.startMarch(s,c.target);
   if(!march||!s.expedition||s.expedition.heroId!==c.heroId||s.ap>=before)throw Error('Hành quân chưa trừ AP thật');
   q.phase='outbound';q.departureUnits=troops(s.expedition.army);
   q.reason='';
   return {changed:true,type:'dispatched',heroId:c.heroId,units:q.departureUnits,apSpent:before-s.ap};
  }catch(e){return {changed:true,type:'stopped',status:stop(s,'Không xuất chinh được: '+(e.message||e))}}
 }
 if(q.phase==='outbound'){
  if(s.battle?.target===c.target&&activeExp(s,q)){
   q.phase='battle';s.battleAuto=false;return {changed:true,type:'battle_open'};
  }
  if(!activeExp(s,q)||s.march?.phase!=='outbound')
   return {changed:true,type:'stopped',status:stop(s,'Đã thay đổi đạo quân hành quân')};
  return {changed:false,type:'travel',remaining:s.march.remaining};
 }
 if(q.phase==='battle'){
  if(!s.battle||s.battle.hg21Tower||s.battle.kind!=='npc'||
     s.battle.target!==c.target||!activeExp(s,q))
   return {changed:true,type:'stopped',status:stop(s,'Chiến trường không đúng đạo quân tự săn')};
  // Stop before the next round when live combat losses exceed the owner's
  // limit. Do not fake a retreat or complete the fight: leave the actual
  // battlefield available for manual control with auto disabled.
  const total=s.battle.allies.reduce((sum,u)=>sum+u.initial,0);
  const living=s.battle.allies.reduce((sum,u)=>sum+u.count,0);
  const liveLoss=total?Math.max(0,Math.round(100*(total-living)/total)):100;
  if(liveLoss>c.maxLossPercent)
   return {changed:true,type:'stopped',status:stop(s,
    'Đã mất '+liveLoss+'% quân trong trận (ngưỡng '+c.maxLossPercent+'%); chuyển điều khiển thủ công')};
  // Canonical tactical engine, exactly one real combat turn per call. The
  // E.battleAct hook records terminal outcome once, after all reward layers.
  const out=E.battleAct(s,'attack',{preserveMoveOrders:true});
  return {changed:true,type:out.type,turn:s.battle?.turn||null,reportId:out.reportId||null};
 }
 if(q.phase==='returning'){
  if(s.battle)return {changed:true,type:'stopped',status:stop(s,'Trận chiến khác đã chen vào khi về thành')};
  if(s.expedition||s.march){
   if(!s.expedition||s.expedition.heroId!==c.heroId||s.march?.phase!=='return')
    return {changed:true,type:'stopped',status:stop(s,'Đường về thành đã thay đổi')};
   return {changed:false,type:'returning',remaining:s.march.remaining};
  }
  q.phase='recovery';return {changed:true,type:'home'};
 }
 if(q.phase==='recovery'){
  if(s.battle||s.expedition||s.march||s.parallelMarches?.length)
   return {changed:true,type:'stopped',status:stop(s,'Đội quân chưa sẵn sàng hồi phục')};
  if(q.runs>=c.maxRuns)return {changed:true,type:'stopped',status:stop(s,'Hoàn tất '+q.runs+' trận theo giới hạn')};
  if(q.last?.outcome!=='win'&&c.stopOnLoss)
   return {changed:true,type:'stopped',status:stop(s,'Trận trước không thắng; dừng để kiểm tra chiến thuật')};
  if(q.last?.lossPercent>c.maxLossPercent)
   return {changed:true,type:'stopped',status:stop(s,'Tổn thất '+q.last.lossPercent+'% vượt ngưỡng '+c.maxLossPercent+'%')};
  const wounded=troops(s.wounded);
  if(c.autoHeal&&wounded){
   if(s.arenaQueue)return {changed:false,type:'healing',remaining:s.arenaQueue.remaining};
   try{
    E.heal(s);return {changed:true,type:'heal_queued',wounded};
   }catch(e){return {changed:true,type:'stopped',status:stop(s,'Không thể chữa thương: '+(e.message||e))}}
  }
  if(s.arenaQueue&&c.autoHeal)return {changed:false,type:'healing',remaining:s.arenaQueue.remaining};
  if(s.training?.length)return {changed:false,type:'training',remaining:s.training[0].remaining};
  try{
   const t=E.hg24Template(s,c.heroId);
   if(!t)return {changed:true,type:'stopped',status:stop(s,'Không có đội hình mẫu để hồi quân')};
   const receipt=E.hg24Replenish(s,c.heroId,c.autoRecruit);
   if(receipt.queued)return {changed:true,type:'recruit_queued',unitId:receipt.queued.unitId,count:receipt.queued.count};
   if(receipt.total<c.minUnits||receipt.total*100<t.groups.reduce((a,g)=>a+g.count,0)*c.minCoverage)
    return {changed:true,type:'stopped',status:stop(s,'Không đủ quân hoặc tài nguyên bổ sung an toàn')};
   if(s.ap+1e-9<E.hg182MarchCost(s,c.target)+c.keepAP)
    return {changed:false,type:'ap_regen',ap:s.ap};
   q.phase='ready';return {changed:true,type:'refilled',units:receipt.total};
  }catch(e){return {changed:true,type:'stopped',status:stop(s,'Lỗi hậu cần: '+(e.message||e))}}
 }
 return {changed:true,type:'stopped',status:stop(s,'Trạng thái tự săn không xác định')};
}
function battleAct(s,action,options){
 const q=ensure(s),b=s.battle;
 const eligible=q.enabled&&q.phase==='battle'&&!!b&&!b.hg21Tower&&
 b.kind==='npc'&&b.target===q.config.target&&s.expedition?.heroId===q.config.heroId;
 const initial=eligible?b.allies.reduce((n,u)=>n+u.initial,0):0;
 const result=old.battleAct(s,action,options);
 if(!eligible||!['win','lose','timeout','retreat'].includes(result?.type))return result;
 q.runs++;
 if(result.type==='win')q.wins++;else q.losses++;
 const surviving=b.allies.reduce((n,u)=>n+u.count,0);
 const loss=Math.max(0,Math.min(100,Math.round((1-surviving/Math.max(1,initial))*100)));
 q.last={outcome:result.type,heroId:q.config.heroId,unitsDeparted:initial,
  unitsSurvived:surviving,lossPercent:loss,turns:b.turn-1,
  ...(result.reportId?{reportId:result.reportId}:{})};
 q.phase='returning';s.battleAuto=false;
 E.note(s,'HG26 '+q.runs+'/'+q.config.maxRuns+': '+result.type+', tổn thất '+loss+'%, đang đưa quân về thành.');
 return result;
}
function strict(s){return old.strict(s)&&valid(s)}
function newGame(...args){const s=old.make(...args);ensure(s);return s}
function parse(text){const s=old.parse(text);ensure(s);if(!strict(s))throw Error('Save HG26 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG26 không hợp lệ');return old.serialize(s)}
Object.assign(E,{make:newGame,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,hg26Status:status,hg26Start:start,hg26Stop:stop,hg26Step:step,hg26Ensure:ensure,hg26Valid:valid});
root.HOG_HG26=Object.freeze({version:1,saveVersion:7,maxRuns:100,autoDefault:false});
})(typeof globalThis!=='undefined'?globalThis:this);
