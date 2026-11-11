(function(){
'use strict';
const E=window.HOG_ENGINE, C=window.HOG_CATALOG, P=window.HOG_PAINTER, U43=window.HOG_HG43_UI;
if(!U43||U43.total!==40)throw Error('HG43: thiếu bách khoa 40 quân đã nạp');
const A=window.HOG_ART_PACK,ico=(key,size)=>A?.iconHTML(key,size)||'';
const recruitDrafts=new Map();
// Presentation-only: the phone can hide the command rail to give the map
// the entire landscape viewport. This is not written into Save v07.
let mapExpanded=false;
// HG42: Boss screens are independent presentation routes, never Save fields.
let hg42BossScreen='targets',hg42BossTier=11;
// HG43 display-only: preserve combat/Save v07 and the existing recruitment UI.
let hg43ArmyPage='recruit',hg43ArmyRace='human';
// HG40.8: presentation-only hero selection; never stored inside Save v07.
let hg408InspectId=null,hg408Tab='overview',hg408DismissFor=null,hg408DismissStage=0;
// HG46 view-only filter/pagination; never persisted in Save v07.
let hg46GearFilter='all',hg46GearPage=0,hg47RaceView=null,hg47TierView='rare';
let hg63SeenReportId=null,hg63OpenReport=null;
const $=id=>document.getElementById(id);let state=null,hg261Draft=null,dispatchDraft=null,tab='map',newRace='human',newSpellEdition='international',selected=null,selectedTargetKind=null,lastToast=0,selectedBuilding='hall',movementModeId=null,showWorldIndex=false,showResourceInfo=false,modalOffset=0,armyOpsOpen=false,armyQuestOpen=false,combatDockOpen=true;
const tabs=[['map','🗺 Thế giới'],['city','🏰 Thành trì'],['army','🛡 Quân đội'],['heroes','🧙 Tướng'],['magic','🔮 Pháp thuật'],['relics','💎 Rèn & Di vật'],['tasks','📜 Nhiệm vụ'],['boss','☠ Boss'],['tower','🗼 Bí Cảnh'],['reports','⚔ Chiến báo'],['sources','📚 Tư liệu']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=E.fmt;
const hg408QualityClass=h=>'hg408-quality-'+E.hg408HeroQuality(h);
const hg408HeroNameHTML=h=>h?'<span class="'+hg408QualityClass(h)+'">'+esc(h.name)+'</span>':'Chưa có tướng';
// HG45.1: original vector hero portrait, drawn inside the actual hero cards.
// Unique hair/crown silhouette is stable per hero; rarity changes the frame
// and magical aura, not the face or troop art. No assets/network/extra HTML.
function hg45Portrait(hero){
 const name=String(hero?.name||''),hash=[...name].reduce((n,c)=>Math.imul(n,33)+c.charCodeAt(0)|0,hero?.id||0)>>>0;
 const hair=hash%3,crest=(hash>>>3)%3,rare=E.hg408HeroQuality(hero);
 const crown=crest===0?'<path class="hg45-crest" d="M24 32l-5-13 14 7 7-16 7 16 14-7-5 13Z"/>':
  crest===1?'<path class="hg45-crest" d="M20 33l8-18 12 11 12-11 8 18-10-5-10 5-10-5Z"/>':
  '<path class="hg45-crest" d="M28 30L22 12l18 12 18-12-6 18Z"/>';
 const fringe=hair===0?'<path class="hg45-hair" d="M22 34Q21 11 41 14Q62 16 60 35L49 30 44 22 34 31 27 27Z"/>':
  hair===1?'<path class="hg45-hair" d="M18 32Q17 10 40 13Q66 10 62 35L50 27 45 32 35 23 27 34Z"/>':
  '<path class="hg45-hair" d="M21 37Q17 17 30 14Q42 6 54 16Q67 22 58 37L45 27 34 35 28 25Z"/>';
 return '<span class="hg45-portrait-art hg45-portrait-'+rare+'" aria-hidden="true"><span class="hg45-portrait-aura"></span>'+
  '<svg viewBox="0 0 80 94" width="100%" height="100%" focusable="false" aria-hidden="true" preserveAspectRatio="xMidYMid meet">'+
  '<path class="hg45-cloak" d="M2 90Q9 58 27 60L52 60Q70 61 78 90Z"/>'+
  '<path class="hg45-armor" d="M16 90L22 65 34 60 40 72 46 60 59 65 66 90Z"/>'+
  '<path class="hg45-neck" d="M35 56h10v12H35z"/>'+
  '<path class="hg45-face" d="M25 30Q29 22 40 22Q55 23 56 36L54 54Q50 65 40 65Q29 64 26 52Z"/>'+
  '<path class="hg45-ear" d="M25 43l-4-6v13l5 3M55 43l4-6v13l-5 3"/>'+
  fringe+crown+
  '<path class="hg45-mask" d="M27 48l13 5 13-5-3 9-10 6-10-6Z"/>'+
  '<path class="hg45-eye" d="M30 42l8 2-8 2ZM42 44l8-2-1 4Z"/>'+
  '<path class="hg45-armor-trim" d="M20 70l12 3 8 16 8-16 12-3M40 71v18"/>'+
  '<path class="hg45-emblem" d="M40 67l5 8-5 8-5-8Z"/>'+
  '</svg><span class="hg45-portrait-stars"></span></span>';
}

const BATTLE_AUTO_DELAY_MS=10_000,BATTLE_AUTO_TURN_DELAY_MS=1350;
let battleAutoPulseBusy=false,combatVisualLockUntil=0;
let focusArmyRecruitOnOpen=false; // New Army-tab entry goes to actionable recruitment, not passive text.
// Visual QA preferences are separate from the canonical v07 gameplay save.
// Default both ON, as requested for verifying unit coordinates and HP.
const BATTLE_VIEW_PREF_KEY='heoofgaia_battle_display_v2';
const battleViewPrefs={grid:true,hp:true,labels:true,speed:1};
try{
 const stored=JSON.parse(localStorage.getItem(BATTLE_VIEW_PREF_KEY)||'null');
 if(stored&&typeof stored==='object'){
  if(typeof stored.grid==='boolean')battleViewPrefs.grid=stored.grid;
  if(typeof stored.hp==='boolean')battleViewPrefs.hp=stored.hp;
  if(typeof stored.labels==='boolean')battleViewPrefs.labels=stored.labels;
  if([1,2,3].includes(stored.speed))battleViewPrefs.speed=stored.speed;
 }
}catch(_error){}
// HG58 display-only speed keeps canonical turns/damage and Save v07 untouched.
let combatClockReal=performance.now(),combatClockVisual=combatClockReal;
function combatVisualNow(real=performance.now()){
 return combatClockVisual+(real-combatClockReal)*battleViewPrefs.speed;
}
function setCombatVisualSpeed(speed){
 if(![1,2,3].includes(speed))return;
 const real=performance.now(),current=combatVisualNow(real),old=battleViewPrefs.speed;
 combatClockReal=real;combatClockVisual=current;battleViewPrefs.speed=speed;
 if(state?.battle){
  combatVisualLockUntil=real+Math.max(0,combatVisualLockUntil-real)*old/speed;
  state.battle.autoUntil=Date.now()+Math.max(0,(state.battle.autoUntil||Date.now())-Date.now())*old/speed;
 }
 try{localStorage.setItem(BATTLE_VIEW_PREF_KEY,JSON.stringify(battleViewPrefs))}catch(_error){}
}
function combatTurnWallMs(b){return Math.max(900,(P.battleTimelineTurnDuration?.(b)||900)/battleViewPrefs.speed)}
function toggleBattleDisplay(which){
 if(!['grid','hp','labels'].includes(which))return;
 battleViewPrefs[which]=!battleViewPrefs[which];
 try{localStorage.setItem(BATTLE_VIEW_PREF_KEY,JSON.stringify(battleViewPrefs))}catch(_error){}
}

function ensureBattleAutoTimer(s){if(s?.battle&&!Number.isFinite(s.battle.autoUntil))s.battle.autoUntil=Date.now()+BATTLE_AUTO_DELAY_MS;return s}
function markBattleInput(){if(!state?.battle)return;state.battleAuto=false;state.battle.autoUntil=Date.now()+BATTLE_AUTO_DELAY_MS}
// Exactly one deadline-gated auto pulse handles the next battle turn. All game
// ticks, clicks, and browser timer callbacks must share this guard: otherwise
// double execution skips animation frames, changes targets and appears chaotic.
// Preserve explicit multi-turn MOVE destinations but retire one-shot stances.
function resolveAutomaticBattleTurn(){
 const s=state,b=s?.battle;
 if(!b||!s.battleAuto||battleAutoPulseBusy||Date.now()<(b.autoUntil||0)||
    (s.hg26?.enabled&&b.target===s.hg26.config?.target))return;
 battleAutoPulseBusy=true;
 try{
  b.orders=b.orders||{};
  for(const unit of b.allies){
   if(unit.pool>0&&['advance','defend','retreat'].includes(b.orders[unit.id]))
    b.orders[unit.id]='attack';
  }
  if(b.focused&&!b.enemies.some(u=>u.id===b.focused&&u.pool>0)){
   b.focused=null;
   for(const unit of b.allies)if(b.orders[unit.id]==='focus')b.orders[unit.id]='attack';
  }
  const hg63Before=hg63BattleSnapshot();
  const wasTower=!!b.hg21Tower,out=E.battleAct(s,'attack',{preserveMoveOrders:true,stableTargets:true});
  hg63CaptureBattleReport(b,hg63Before,out);
  if(s.battle===b)combatVisualLockUntil=performance.now()+combatTurnWallMs(b);
  if(out.type==='win'||out.type==='retreat'||out.type==='timeout')tab=wasTower?'tower':'map';
  if(out.type==='lose')tab=wasTower?'tower':'heroes';
  if(s.battle===b)b.autoUntil=Date.now()+Math.max(BATTLE_AUTO_TURN_DELAY_MS,combatTurnWallMs(b));
  save();
  // On a continuing auto turn, updating only the visible combat readouts keeps
  // the SAME canvas/RAF and decoded sprite atlases alive. Full render is only
  // needed when the battle ends or the scene changes.
  if(s.battle===b&&$('battle-canvas'))syncCombatTurnHUD();
  else render();
 }catch(e){
  console.warn('Auto battle',e);s.battleAuto=false;
  if(s.battle===b)b.autoUntil=Date.now()+BATTLE_AUTO_DELAY_MS;
 }finally{battleAutoPulseBusy=false}
}
// HG34-P0: update live combat readouts without replacing a canvas every turn.
// The delegated action handlers remain on #app, and no canonical battle fields
// are changed here. Open auxiliary panels can refresh independently.
// Uniform rAF decimation avoids 75Hz/90Hz half-rate aliasing and protects
// 8GB machines from unbounded 144Hz+ Canvas work. Presentation-only.
function battleRenderStride(periodMs){
 if(!Number.isFinite(periodMs)||periodMs<=0)return 1;
 return periodMs<5.6?3:periodMs<9.8?2:1;
}
// HG58-CD: real cooldown-only signal; passive abilities never cost MP.
function combatEnergyHTML(b,u){
 const r=u&&E.hg40SkillReadiness?.(b,u);
 if(!r)return '<div class="hg58-unit-energy absent">⚔ Đòn thường · không có kỹ năng HG40</div>';
 const label=r.passive?'NỘI TẠI':r.ready?'SẴN SÀNG':'HỒI CHIÊU';
 return '<div class="hg58-unit-energy" data-hg58-skill="'+esc(r.name)+
  '" title="'+esc(r.name)+' · '+(r.passive?'Nội tại kích hoạt theo điều kiện, không CD':
    'CD '+r.baseCooldown+' lượt; tự dùng nếu thỏa điều kiện')+'">'+
  '<span>✦ '+esc(r.name)+' <b>'+label+'</b></span>'+
  (r.passive?'<div class="hg58-cd-bar passive" aria-label="Kỹ năng nội tại"></div>':
   '<div class="hg58-cd-bar" role="progressbar" aria-label="Tiến độ hồi chiêu" aria-valuenow="'+r.progress+
   '" aria-valuemin="0" aria-valuemax="100"><i style="width:'+r.progress+'%"></i></div>'+
   '<small>'+(r.ready?'Có thể kích hoạt':('Còn '+r.cooldown+' lượt'))+
   ' · CD gốc '+r.baseCooldown+' lượt</small>')+
  '</div>';
}
function syncCombatTurnHUD(){
 const b=state?.battle,canvas=$('battle-canvas');if(!b||!canvas)return;
 const allies=b.allies.filter(u=>u.pool>0).length,enemies=b.enemies.filter(u=>u.pool>0).length;
 const tag=document.querySelector('.combat-scene-title .tag');
 if(tag)tag.textContent='Lượt '+b.turn+' · '+allies+' : '+enemies;
 const selected=b.allies.find(u=>u.id===b.selected),focused=b.enemies.find(u=>u.id===b.focused);
 const sides=document.querySelectorAll('.battle-selection-readout .battle-side-readout');
 for(const [node,actor,prompt] of [[sides[0],selected,'Chạm quân ta trên bàn cờ'],[sides[1],focused,'Bấm quân địch trên ô']]){
  if(!node)continue;
  const title=node.querySelector('b'),stats=node.querySelector('span');
  if(title)title.textContent=actor?.name||prompt;
  if(stats)stats.textContent=actor?format(actor.count)+' quân · '+format(Math.ceil(actor.pool))+' HP':prompt;
  const energy=node.querySelector('.hg58-unit-energy');
  if(energy)energy.outerHTML=combatEnergyHTML(b,actor);
 }
 const clock=$('battle-auto-clock');
 if(clock)clock.textContent=state.battleAuto?'Đang tự động':'Tự động sau '+Math.max(0,Math.ceil((b.autoUntil-Date.now())/1000))+' giây';
 // Keep the exact canvas, animation RAF and command dock alive. Only update
 // live numbers/CD/statuses on the selected and focused troop info cards.
 const hg43Panel=document.querySelector('.hg43-combat-cards');
 if(hg43Panel){
  const fresh=document.createElement('template');
  fresh.innerHTML=U43.battle(b,selected,focused||b.enemies.find(u=>u.pool>0)||null);
  const cards=fresh.content.querySelector('.hg43-combat-cards');
  if(cards&&cards.innerHTML!==hg43Panel.innerHTML)hg43Panel.innerHTML=cards.innerHTML;
 }
 const hg40Own=document.querySelector('.hg40-player'),hg40Enemy=document.querySelector('.hg40-enemy');
 if(hg40Own)hg40Own.textContent='⚔ '+(E.hg40SkillText?.(b,selected)||'Chọn quân để xem kỹ năng')+
  ' · '+(E.hg40StatusText?.(b,selected)||'Không trạng thái');
 if(hg40Enemy)hg40Enemy.textContent='☠ '+(E.hg40StatusText?.(b,focused)||'Chưa chọn mục tiêu');
 for(const ctrl of document.querySelectorAll('[data-action="combat-speed"]'))
  ctrl.setAttribute('aria-pressed',String(Number(ctrl.dataset.speed)===battleViewPrefs.speed));
 const auto=document.querySelector('.battle-command-dock [data-action="auto"]');
 if(auto)auto.textContent=state.battleAuto?'⏸ DỪNG TỰ ĐÁNH':'▶ TỰ ĐÁNH';
 const move=document.querySelector('.battle-command-dock [data-action="move-mode"]');
 const moveTarget=selected&&b.moveTargets?.[selected.id];
 if(move){
  move.disabled=!selected||selected.pool<=0;
  move.textContent=movementModeId?'✕ HỦY Ô':moveTarget?'↗ ĐỔI ĐÍCH':'⌖ ĐẶT ĐÍCH';
 }
 const steps=$('hg57-move-steps');if(steps)steps.textContent=selected?
  'Di chuyển: '+(E.battleMovePreview?.(b,selected.id)?.steps||0)+' ô/lượt · Tầm đánh: '+selected.range+' ô':
  'Chọn quân để xem tốc độ và tầm đánh';
 const prompt=$('battle-move-prompt');
 if(prompt)prompt.textContent=movementModeId?'Chọn ô lục giác viền sáng để đặt điểm đến.':
  moveTarget?'Đang tiến tới ô ('+(moveTarget.x+1)+', '+(moveTarget.y+1)+').':
  'Chọn quân ta trên bàn cờ rồi đặt điểm đến.';
 const report=document.querySelector('.battle-report-fold');
 if(report){
  const summary=report.querySelector('summary');
  if(summary)summary.textContent='📜 Diễn biến lượt '+Math.max(0,b.turn-1)+' · '+(b.lastEvents||[]).length+' hành động';
 }
 // Updating the expanded report/spell list must not destroy the battle
 // canvas or the 60Hz animation timeline.
 const spell=document.querySelector('.battle-spell-fold');
 if(report?.open||spell?.open){
  const temp=document.createElement('template');temp.innerHTML=combatView();
  if(report?.open){
   const next=temp.content.querySelector('.battle-report-fold');
   if(next)report.innerHTML=next.innerHTML;
  }
  if(spell?.open){
   const next=temp.content.querySelector('.battle-spell-fold');
   if(next){spell.innerHTML=next.innerHTML;spell.open=true;}
  }
 }
}
function toast(message){const n=$('toast');n.textContent=message;n.classList.add('show');lastToast=Date.now();setTimeout(()=>{if(Date.now()-lastToast>=2700)n.classList.remove('show')},2800)}
function fail(fn){try{
 const oldTab=tab,oldBattle=state?.battle,hg63Before=hg63BattleSnapshot();
 if(!$('game-modal')?.hidden)modalOffset=$('game-modal-body')?.scrollTop||0;
 fn();hg63CaptureBattleReport(oldBattle,hg63Before);if(oldTab!==tab)modalOffset=0;save();
 // A selection, command, or spell inside the SAME battle must not destroy
 // the RAF/canvas. New battles, terminal outcomes and tab changes still take
 // the full authoritative render path.
 if(oldTab==='combat'&&tab==='combat'&&oldBattle&&state?.battle===oldBattle&&$('battle-canvas'))
  syncCombatTurnHUD();
 else render();
 }catch(e){toast(e.message||String(e))}}
function save(){
 if(!state)return false;
 try{
  E.syncCityState(state);
  if(!E.strictSave(state))throw Error('Game state không hợp lệ');
  const payload=JSON.stringify(state);
  if(payload.length>2_000_000)throw Error('Save vượt giới hạn 2 MB');
  const current=localStorage.getItem(E.SAVE_KEY);
  if(current&&current!==payload){
   try{E.parseSave(current);localStorage.setItem(E.SAVE_KEY+'_backup',current)}catch(error){console.warn('Save backup unavailable',error)}
  }
  localStorage.setItem(E.SAVE_KEY,payload);
  return true;
 }catch(e){toast('Không thể lưu game: '+(e.message||String(e)));return false}
}
function load(){
 try{
  const current=localStorage.getItem(E.SAVE_KEY);
  if(current){
   try{const s=ensureBattleAutoTimer(E.parseSave(current));E.tick(s);if(s.battle)P.battleTimelinePrime?.(s.battle,combatVisualNow(),false);return s}
   catch(err){console.warn('Current save invalid',err.message)}
  }
  const backup=localStorage.getItem(E.SAVE_KEY+'_backup');
  if(backup){
   try{
    const s=ensureBattleAutoTimer(E.parseSave(backup));E.tick(s);if(s.battle)P.battleTimelinePrime?.(s.battle,combatVisualNow(),false);
    try{localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));toast('Đã khôi phục bản lưu dự phòng.')}
    catch(err){toast('Đã mở bản lưu dự phòng nhưng chưa ghi lại được; hãy xuất file JSON.')}
    return s;
   }catch(err){console.warn('Backup save invalid',err.message)}
  }
  if((localStorage.getItem('heoofgaia_hg08_skip_migration')||localStorage.getItem('heoofgaia_hg06_skip_migration')))return null;
  for(const key of ['heoofgaia_hg_only_v06','heoofgaia_hg_only_v05','heoofgaia_hg_only_v04','heoofgaia_hg_only_v03','heoofgaia_hg_only_v02']){
   const raw=localStorage.getItem(key);if(!raw)continue;
   try{const s=ensureBattleAutoTimer(E.parseSave(raw));E.tick(s);if(s.battle)P.battleTimelinePrime?.(s.battle,combatVisualNow(),false);localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));return s}
   catch(err){console.warn('Legacy save skipped:',key,err.message)}
  }
 }catch(e){console.warn('Save storage unavailable',e)}return null;
}
function money(cost){return Object.entries(cost).filter(([,v])=>v>0).map(([k,v])=>`${(ico(k,20)||C.resource[k].emoji)} ${format(v)}`).join(' · ')}
function button(action,data,label,disabled=false,cls=''){return `<button ${disabled?'disabled':''} data-action="${esc(action)}" ${Object.entries(data||{}).map(([k,v])=>`data-${esc(k)}="${esc(v)}"`).join(' ')} class="${cls}">${label}</button>`}
function flags(){const city=E.activeCity(state),ap=E.fameApStats(state.fame),next=ap.nextFame===null?'đã đạt bậc cao nhất':`còn ${format(ap.nextFame-state.fame)} Fame tới mốc tiếp`;return `<span class="tag">📍 ${esc(city.name)} (${city.key})</span><span class="tag" title="${ap.perHour} AP hồi mỗi giờ game · ${next}">🔋 AP ${Math.floor(state.ap)}/${ap.max} · +${ap.perHour}/giờ</span><span class="tag">🏅 Danh vọng ${format(state.fame)}</span><span class="tag">🏰 ${state.cities.length}/${E.cityLimit(state.fame)} thành</span><span class="tag">⏱ ×${state.speed} demo</span>`}
// Compact, actionable New Game path. Progress is derived only from the
// player's real state, not an unlock flag or bonus-resource tutorial seed.
function hg44JourneyView(s){
 if(!s)return '';
 // HG44-B: guide is a pure projection of real paid progression, not a
 // second quest ledger or another Save field. Compact by default to leave
 // the world canvas as the primary touch/desktop surface.
 const hg30=s.hg30||{},towerFloor=s.hg20?.tower?.floor||1;
 const cityCount=s.cities.length;
 const recruited=(s.army[s.race+'_1']||0)>16||
   s.training.some(t=>t.unitId===s.race+'_1');
 const first=[
  ['city','🏪','Xây Market',s.buildings.market>=1],
  ['magic','🌲','Nghiên cứu Forestry',!!s.spells.forestry],
  ['army','🛡','Tuyển lính',recruited],
  ['map','⛏','Chiếm mỏ',s.mines.length>0],
  ['city','🏅','Đạt 5.800 Fame',s.fame>=5800],
  ['map','🏰','Chiếm thành thứ hai',cityCount>=2]
 ];
 const expansion=[
  ['map','⚔','Thắng 2 NPC',(hg30.npcWins||0)>=2],
  ['tower','🗼','Vượt 1 tầng Tháp có thưởng',(hg30.paidTowerWins||0)>=1],
  ['army','🎖','Mở thử thách nâng quân',(hg30.stage||0)>=1],
  ['army','🛡','Đổi quân thường thành quân đặc biệt',(hg30.stage||0)>=2],
  ['heroes','🧙','Chiêu mộ đủ 3 tướng',s.heroes.length>=3],
  ['boss','☠','Hạ Boss đầu tiên',(hg30.bossWins||0)>=1]
 ];
 const endgame=[
  ['army','⚒','Hoàn thành thử thách đổi quân cuối',(hg30.stage||0)>=3],
  ['tower','🗼','Chinh phục tầng Tháp 10',towerFloor>=11],
  ['boss','☠','Thắng ít nhất 3 Boss',(hg30.bossWins||0)>=3],
  ['heroes','🧙','Sở hữu ít nhất 3 tướng',s.heroes.length>=3],
  ['tower','🏆','Chinh phục tầng Tháp 20',towerFloor>=21],
  ['boss','👑','Thắng ít nhất 10 Boss',(hg30.bossWins||0)>=10]
 ];
 const phase=cityCount<2?0:(hg30.stage||0)<2?1:2;
 const names=['🌱 Khởi nghiệp lãnh chúa','⚔ Mở rộng thế lực','👑 Chinh phục hậu kỳ'];
 const stages=[first,expansion,endgame][phase],done=stages.filter(x=>x[3]).length;
 const next=stages.find(x=>!x[3]);
 const mainAction=next?button('tab',{tab:next[0]},next[1]+' '+esc(next[2]),false,'small primary'):
  button('tab',{tab:'tower'},'✓ Đã đạt toàn bộ mốc · Mở Tháp',false,'small secondary');
 const all=stages.map(([target,icon,label,ok])=>button('tab',{tab:target},
  (ok?'✓':icon)+' '+esc(label),false,ok?'small secondary':'small')).join('');
 const detail=phase===0?'Dùng tài nguyên và quân thực; không cấp thưởng QA.':
  phase===1?'Mốc thắng trận và phần thưởng đều đọc từ sổ HG30 hiện có.':
  'Mốc Tháp tính theo tầng đã vượt: hiển thị tầng đang mở. Không cấp thêm lượt hoặc Boss.';
 return '<section class="card hg44-journey" aria-label="Lộ trình phát triển New Game" data-hg44-phase="'+phase+'">'+
  '<div class="hg44-journey-head"><b>'+names[phase]+'</b><span class="tag">'+done+'/6 mốc</span></div>'+
  '<div class="hg44-journey-next"><small>'+ (next?'BƯỚC TIẾP THEO':'ĐÃ ĐẠT CÁC MỐC HIỆN TẠI')+'</small>'+
    mainAction+'<span class="hg44-journey-stats">'+
    (phase===0?'Fame '+format(s.fame)+' · '+cityCount+' thành':
     'NPC '+format(hg30.npcWins||0)+' · Boss '+format(hg30.bossWins||0)+
     ' · Tháp '+towerFloor+' · Thử thách '+format(hg30.stage||0))+
    '</span></div>'+
  '<details class="hg44-journey-details"><summary>▸ Toàn bộ 6 mốc và điều kiện</summary>'+
    '<div class="hg44-journey-all">'+all+'</div>'+
    '<p class="tiny muted">'+detail+'</p></details></section>';
}
function newPlayerGuide(){return hg44JourneyView(state)}
function renderIntro(){
 $('nav').innerHTML='';$('resources').innerHTML='';$('status').innerHTML='<p>Một bản tái dựng độc lập lấy cảm hứng từ Heroes of Gaia (2009).</p>';$('logs').innerHTML='';
 $('main').innerHTML=`<section class="welcome"><div class="welcome-scene"><canvas id="intro-canvas" width="1176" height="560" aria-label="Phong cảnh thành trì theo chủng tộc"></canvas><div class="welcome-copy"><div class="eyebrow">BỐN CHỦNG TỘC • MỘT CHIẾN TRƯỜNG</div><h1>ANH HÙNG THỜI LOẠN</h1><p>Phát triển thành trì • dẫn quân vượt thế giới • chinh phục mỏ và quái vật</p></div></div><div class="welcome-bottom"><h2>Chọn chủng tộc khởi đầu</h2><div class="race-grid">${Object.entries(C.races).map(([k,v])=>`<button data-action="race" data-race="${k}" class="race-card ${newRace===k?'active':''}"><span class="emoji">${ico(k,42)||v.emoji}</span><strong>${v.name}</strong><small>${v.english}</small></button>`).join('')}</div><h3>Bộ phép chiến đấu</h3><div class="entry">${button('spelledition',{edition:'international'},'Quốc tế · Fandom',false,newSpellEdition==='international'?'primary':'secondary')}${button('spelledition',{edition:'china2009'},'Trung Quốc 2009 · Sina',false,newSpellEdition==='china2009'?'primary':'secondary')}</div><p class="hint">Lựa chọn này lưu trong vương quốc mới. Bộ Sina tái hiện các kỹ năng chiến đấu chủ động đã có chỉ số xác nhận; kỹ năng di chuyển và nội tại chưa được mô hình hóa. Save cũ mặc định giữ bộ Quốc tế.</p>${button('start',{},'⚔ Thành lập thành Gaia',false,'primary wide')}<p class="hint">Chế độ chơi offline; hình ảnh tự dựng, công thức chiến đấu hiện là thử nghiệm, chưa phải game chính thức.</p></div></section>`;
 P.drawCity($('intro-canvas'),E,E.make(newRace),'hall');
}
function renderResourceHUD(){const lim=E.limits(state);$('resources').innerHTML=C.keys.map(k=>`<button type="button" class="resource" data-action="resource-info" title="${esc(C.resource[k].label)}: ${format(state.res[k])}/${format(lim[k])} · +${format(E.rate(state)[k])}/giờ">${(ico(k,20)||C.resource[k].emoji)} <span>${C.resource[k].label}</span><b>${format(state.res[k])}</b><small class="muted">/${format(lim[k])} · +${format(E.rate(state)[k])}/h</small></button>`).join('');
}
function renderHUD(){renderResourceHUD();
 const rail=$('nav'),oldNavScroll=rail.scrollLeft;
 rail.innerHTML=tabs.map(([id,name])=>`<button data-action="tab" data-tab="${id}" title="${esc(name)}" aria-current="${tab===id?'page':'false'}" class="${tab===id?'active':''}">${A?(ico(id,20)+' '+esc(name.slice(name.indexOf(' ')+1))):name}</button>`).join('');
 // A rebuild on passive economy ticks must not snap the navigation back to
 // the map or lose the active screen on touch devices.
 rail.scrollLeft=oldNavScroll;
 const currentTab=rail.querySelector('button.active');
 if(currentTab){
  const left=currentTab.offsetLeft-rail.offsetLeft,right=left+currentTab.offsetWidth;
  if(left<rail.scrollLeft)rail.scrollLeft=left;
  else if(right>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=right-rail.clientWidth;
 }
 const earning=E.rate(state),hero=state.heroes.find(h=>h.id===state.activeHero),duty=E.hg20HeroRole(state,state.activeHero);$('status').innerHTML=`<div class="vitals">${flags()}</div><div class="muted tiny">${(ico(state.race,20)||C.races[state.race].emoji)} ${C.races[state.race].name} · ${state.heroes.length} tướng · ${E.activeArmy(state).reduce((n,u)=>n+state.army[u.id],0)} lính</div><div class="hr"></div><div class="hint">Sản lượng / giờ game:</div><div class="tiny">${C.keys.map(k=>`${(ico(k,20)||C.resource[k].emoji)} +${format(earning[k])}`).join(' · ')}</div><div class="hr"></div><div class="hint"><b>🏗 Xây dựng:</b> ${state.buildingQueue?esc(C.buildings[state.buildingQueue.key].name)+' Lv.'+state.buildingQueue.level+' · '+Math.ceil(state.buildingQueue.remaining/state.speed)+'s thực':'Trống'}</div><div class="hr"></div><div class="hint">Hàng đợi: ${state.training.length?esc(E.getUnit(state,state.training[0].unitId).name)+' ('+Math.ceil(state.training[0].remaining/state.speed)+' giây thực)':'Trống'}</div>${state.march?`<p class="notice">🚩 Hành quân: ${Math.ceil(state.march.remaining)}s game</p>`:''}`;
 $('status').innerHTML+='<div class="banner"><b>🎖 Tướng đang chọn: '+esc(hero?.name||'Không có')+'</b> · '+esc(duty.label)+' · '+format(duty.army.reduce((n,g)=>n+g.count,0))+' quân'+button('tab',{tab:'army'},'Điều binh',false,'small secondary')+'</div>';
 if(state.hg26?.enabled){
  const hunt=E.hg26Status(state);
  $('status').innerHTML+='<div class="banner hg26-hud"><b>🔁 Săn Boss tự động: '+esc(hunt.phase)+'</b> · '+hunt.runs+'/'+hunt.maxRuns+
   ' trận · '+esc(hunt.targetName||'Boss')+' · '+(hunt.team?.length||1)+' tướng '+button('hg26-stop',{},'■ Dừng',false,'small secondary')+'</div>';
 }
 if(state.battleReports?.length)$('status').innerHTML+=`<div class="hr"></div>${button('tab',{tab:'reports'},'⚔ Xem chiến báo gần nhất',false,'secondary')}`;
 $('logs').innerHTML=state.log.map(t=>`<div>• ${esc(t)}</div>`).join('');$('speed').textContent=`⏱ ×${state.speed}`;
}
function cityTransportView(){
 const names={outbound:'Đang tới thành nhận',holding:'Đã tới · kho nhận chưa đủ chỗ',return:'Đang quay về thành xuất'};
 const ledger=state.cityTransports?.length?`<div class="card city-transport-ledger"><b>🚚 Đoàn tiếp tế đang đi (${state.cityTransports.length})</b>${state.cityTransports.map(q=>{const from=state.cities.find(c=>c.id===q.sourceCityId),to=state.cities.find(c=>c.id===q.targetCityId),unit=E.transportUnit(q.unitId);return `<div class="entry"><span>${esc(from?.name||q.fromKey)} → ${esc(to?.name||q.toKey)} · ${q.count} ${esc(unit?.name||q.unitId)} · ${names[q.phase]}${q.phase==='holding'?' · hãy dùng tài nguyên ở thành nhận để mở chỗ':` · ${Math.ceil(q.remaining/state.speed)} giây thực`}</span></div>`}).join('')}</div>`:'';
 return ledger;
}
function cityTransportForm(target){
 const units=E.arrUnits(state).filter(u=>(state.army[u.id]||0)>0),busy=!!state.march||!!state.battle||!!state.expedition||!!state.parallelMarches?.length;
 const unitOptions=units.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${format(state.army[u.id])} sẵn có · tải ${u.load}</option>`).join('');
 return `<section class="card city-transport"><div class="heading">🚚 Gửi tiếp tế tới ${esc(target.name)}</div><p class="hint">Hướng dẫn Trung Quốc 2009 SRC59 xác nhận phải điều quân chở tài nguyên, tính sức tải, và mỗi chuyến tốn 20 AP. Tải dùng bảng quân: 1 điểm tải = 10 vàng tương đương; Gỗ/Quặng ×5, Lưu huỳnh/Pha lê ×10. ETA, tự giao khi kho đủ chỗ và đường về là mô hình của bản dựng.</p>${units.length?`<div class="grid grid2"><label>Quân vận chuyển<select id="city-transport-unit">${unitOptions}</select></label><label>Số quân<input id="city-transport-count" type="number" min="1" step="1" value="1"></label></div><div class="grid grid3">${C.keys.map(k=>`<label>${(ico(k,20)||C.resource[k].emoji)} ${C.resource[k].label}<input id="city-transport-${k}" type="number" min="0" step="1" value="0"></label>`).join('')}</div><div class="actions">${button('city-transport',{city:target.id},'🚚 Gửi đoàn tiếp tế · 20 AP',busy||state.ap<20||state.cityTransports.length>=20,'primary')}</div>`:`<p class="notice">Thành đang mở không có quân sẵn để làm đoàn vận chuyển.</p>`}<p class="tiny muted">Quân và tài nguyên rời kho ngay khi xuất phát. Nếu kho đích chưa đủ chỗ cho toàn bộ hàng, đoàn sẽ chờ tại nơi nhận mà không làm mất hàng.</p></section>`;
}
// Display-only per-battle baseline. The canonical Save v07 is never mutated.
function hg63ReceiptKey(q){return [q?.channel||q?.source||'',q?.itemId||q?.id||'',q?.target||'',q?.ordinal??'',q?.count??''].join('|')}
function hg63BattleSnapshot(){
 const wallet=(keys,table)=>Object.fromEntries(keys.map(k=>[k,Number(table?.[k]||0)]));
 return {
  r29:state?.hg29?.last||null,
  r47Seen:(state?.hg47?.history||[]).map(hg63ReceiptKey),
  r31Seen:(state?.hg31?.history||[]).map(hg63ReceiptKey),
  r409:state?.hg409?.rewards?.[0]||null,
  tokens:wallet(Object.keys(E.HG27_TOKENS||{}),state?.hg27),
  materials:wallet(Object.keys(E.HG18_MATERIALS||{}),state?.hg18?.materials),
  inventoryUids:(state?.inventory||[]).map(x=>x.uid),
  towerReport:state?.hg20?.tower?.last||null,
  towerEssence:state?.hg20?.tower?.essence||0,
  resources:wallet(C.keys,state?.res)
 };
}
function hg63CaptureBattleReport(beforeBattle,before,terminal){
 if(!beforeBattle||!state||state.battle===beforeBattle)return;
 const latest=state.battleReports?.[0]||null;
 const canonical=latest&&latest.id!==hg63SeenReportId&&latest.target===beforeBattle.target;
 const outcome=terminal?.type&&terminal.type!=='continue'?terminal.type:
  beforeBattle.enemies?.every(u=>u.pool<=0)?'win':beforeBattle.allies?.every(u=>u.pool<=0)?'lose':'retreat';
 const report=canonical?latest:{
  id:'display-'+String(Date.now())+'-'+String(beforeBattle.turn||0),
  target:beforeBattle.target||'',name:beforeBattle.hg21Tower?.floor?'Bí Cảnh tầng '+beforeBattle.hg21Tower.floor:
   beforeBattle.name||('Trận '+(beforeBattle.target||'giao tranh')),
  outcome,turns:Math.max(0,(beforeBattle.turn||1)-1),kind:beforeBattle.kind||'tower',
  heroName:state.heroes?.find(h=>h.id===state.activeHero)?.name||'Đội hình',
  allies:(beforeBattle.allies||[]).map(u=>({name:u.name,initial:u.initial,survived:u.count,lost:Math.max(0,u.initial-u.count),wounded:null})),
  enemies:(beforeBattle.enemies||[]).map(u=>({name:u.name,initial:u.initial,survived:u.count,lost:Math.max(0,u.initial-u.count)})),
  items:null,resources:null,heroXp:null,fame:null
 };
 if(canonical)hg63SeenReportId=report.id;
 const same=(a,b)=>a===b||(a?.ordinal!==undefined&&a.ordinal===b?.ordinal&&a.target===b?.target);
 const r29=state.hg29?.last||null,r409=state.hg409?.rewards?.[0]||null;
 const newlyEarned=(history,previous)=>{const seen=new Set(previous||[]);
  return (history||[]).filter(q=>!seen.has(hg63ReceiptKey(q))).slice(0,8);
 };
 const walletDelta=(keys,after,baseline)=>Object.fromEntries(keys.map(k=>[k,
  Math.max(0,Number(after?.[k]||0)-Number(baseline?.[k]||0))]));
 const knownItemUids=new Set([...(before?.inventoryUids||[]),...((report.items||[]).map(i=>i.uid))]);
 const previousTower=before?.towerReport,nowTower=state.hg20?.tower?.last||null;
 const extra={
  fragments:r29&&!same(r29,before?.r29)?r29:null,
  gearFragments:newlyEarned(state.hg47?.history,before?.r47Seen),
  legendaryFragments:newlyEarned(state.hg31?.history,before?.r31Seen),
  commander:r409&&r409!==before?.r409?r409:null,
  materials:walletDelta(Object.keys(E.HG18_MATERIALS||{}),state.hg18?.materials,before?.materials),
  tokens:walletDelta(Object.keys(E.HG27_TOKENS||{}),state.hg27,before?.tokens),
  items:state.inventory.filter(i=>!knownItemUids.has(i.uid)&&E.ITEMS[i.itemId])
   .map(i=>({uid:i.uid,name:E.ITEMS[i.itemId].name})),
  tower:beforeBattle.kind==='tower'&&nowTower&&nowTower!==previousTower?{
   claimed:!!nowTower.claimed,
   essence:Math.max(0,Number(state.hg20?.tower?.essence||0)-Number(before?.towerEssence||0)),
   resources:walletDelta(C.keys,state.res,before?.resources),
   floor:nowTower.floor
  }:null
 };
 hg63OpenReport={report,extra};
}
function hg63CloseReport(history=false){
 const kind=hg63OpenReport?.report?.kind;
 hg63OpenReport=null;
 document.getElementById('hg63-battle-result')?.remove();
 if(history){tab=kind==='tower'?'tower':'reports';modalOffset=0;showWorldIndex=false;showResourceInfo=false;render()}
}
function hg63ShowReport(){
 const entry=hg63OpenReport,existing=document.getElementById('hg63-battle-result');
 if(!entry){existing?.remove();return}
 if(existing?.dataset.reportId===entry.report.id)return;
 existing?.remove();
 const r=entry.report,x=entry.extra||{},winning=r.outcome==='win';
 const titles={win:'CHIẾN THẮNG',lose:'THẤT BẠI',timeout:'HẾT THỜI GIAN',retreat:'RÚT LUI'};
 const resourceText=(resources)=>Object.entries(resources||{}).filter(([,n])=>Number(n)>0)
  .map(([k,n])=>'<span class="hg63-reward-token">'+esc(C.resource[k]?.emoji||'✦')+' +'+format(n)+' '+esc(C.resource[k]?.label||k)+'</span>').join('');
 const materialsText=(materials)=>Object.entries(materials||{}).filter(([,n])=>Number(n)>0)
  .map(([k,n])=>'<span class="hg63-reward-token">'+esc(E.HG18_MATERIALS[k]?.icon||'✦')+' '+esc(E.HG18_MATERIALS[k]?.name||k)+' ×'+format(n)+'</span>').join('');
 const base=resourceText(r.resources);
 const acquired=Array.isArray(r.items)?r.items.map(i=>'<span class="hg63-reward-token">⚔ '+esc(i.name)+'</span>').join(''):'';
 const upgrade=r.heroXp!==null&&r.heroXp!==undefined?'<span class="hg63-reward-token">✧ EXP +'+format(r.heroXp)+'</span>':'';
 const fame=r.fame!==null&&r.fame!==undefined?'<span class="hg63-reward-token">♛ Danh vọng +'+format(r.fame)+'</span>':'';
 const bonus=x.commander?resourceText(x.commander.resources):'';
 const shards=x.fragments?.drops?.map(d=>'<span class="hg63-reward-token">'+esc(E.HG29_ITEMS[d.id]?.icon||'🧩')+' '+esc(E.HG29_ITEMS[d.id]?.name||d.id)+' ×'+format(d.count)+'</span>').join('')||'';
 const gear=[...(x.gearFragments||[]),...(x.legendaryFragments||[])].map(q=>
  '<span class="hg63-reward-token">💎 Mảnh '+esc(E.ITEMS[q.itemId||q.id]?.name||q.itemId||q.id)+' ×'+format(q.count)+'</span>').join('');
 const tokens=Object.entries(x.tokens||{}).filter(([,n])=>Number(n)>0).map(([k,n])=>
  '<span class="hg63-reward-token">'+esc(E.HG27_TOKENS[k]?.icon||'✦')+' '+esc(E.HG27_TOKENS[k]?.name||k)+' ×'+format(n)+'</span>').join('');
 const otherItems=(x.items||[]).map(i=>'<span class="hg63-reward-token">⚔ '+esc(i.name)+'</span>').join('');
 const towerLoot=x.tower?.claimed?resourceText(x.tower.resources)+
  (x.tower.essence?'<span class="hg63-reward-token">✨ Tinh hoa Bí Cảnh ×'+format(x.tower.essence)+'</span>':''):'';
 const allMaterials=materialsText(x.materials);
 const loss=(r.allies||[]).reduce((n,u)=>n+(u.lost||0),0),
  healed=(r.allies||[]).reduce((n,u)=>n+(u.wounded||0),0);
 const losses='<div class="hg63-losses"><span>🛡 Tổn thất <b>'+format(loss)+'</b></span><span>✚ Vào Arena <b>'+format(healed)+'</b></span><span>☠ Địch bị hạ <b>'+format((r.enemies||[]).reduce((n,u)=>n+(u.lost||0),0))+'</b></span></div>';
 const rewardSection=(name,content)=>content?'<section class="hg63-reward-section"><h3>'+name+'</h3><div class="hg63-reward-grid">'+content+'</div></section>':'';
 const sections=rewardSection('Phần thưởng trong chiến báo',base+acquired+upgrade+fame)+
  rewardSection('Thưởng tài nguyên Bí Cảnh thực nhận',towerLoot)+
  rewardSection('Thưởng chỉ huy PvE thực nhận',bonus)+
  rewardSection('Vật phẩm, thẻ và chiến tích đã vào kho',allMaterials+tokens+otherItems)+
  rewardSection('Mảnh ghép đã vào kho',shards+gear);
 const unknown=r.resources===null&&!x.tower?'<p class="hg63-evidence">Chế độ này chưa có báo cáo thưởng cơ bản hợp nhất. Chỉ các biên nhận có thật mới được hiển thị.</p>':'';
 const none=!sections?'<p class="hg63-evidence">Không có phần thưởng mới được ghi nhận ở trận này.</p>':'';
 const particles=Array.from({length:winning?12:5},(_,i)=>'<i style="--n:'+i+'"></i>').join('');
 const html='<div id="hg63-battle-result" data-report-id="'+esc(r.id)+'" class="hg63-report-overlay" role="presentation">'+
  '<section class="hg63-report-dialog '+(winning?'win':'loss')+'" role="dialog" aria-modal="true" aria-labelledby="hg63-report-title">'+
  '<div class="hg63-report-vfx" aria-hidden="true">'+particles+'</div>'+
  '<header class="hg63-report-head"><span class="hg63-report-emblem" aria-hidden="true">'+(winning?'✦':'☠')+'</span>'+
  '<div><small>⚔ CHIẾN BÁO SAU TRẬN</small><h2 id="hg63-report-title">'+(titles[r.outcome]||'TRẬN ĐẤU KẾT THÚC')+'</h2>'+
  '<p>'+esc(r.name)+' · '+format(r.turns)+' lượt · '+esc(r.heroName)+'</p></div></header>'+
  losses+'<div class="hg63-report-scroll">'+sections+unknown+none+
  '<p class="hg63-evidence">Dữ liệu đọc từ chiến báo và biên nhận phần thưởng trong Save v07; đã tự cộng vào kho, không có nút nhận lại.</p></div>'+
  '<footer class="hg63-report-actions"><button type="button" data-hg63-action="history">📜 Xem chi tiết</button>'+
  '<button type="button" data-hg63-action="close">Tiếp tục chơi</button></footer></section></div>';
 document.body.insertAdjacentHTML('beforeend',html);
 const node=document.getElementById('hg63-battle-result');
 node.addEventListener('click',e=>{
  const btn=e.target.closest('[data-hg63-action]');
  if(btn){hg63CloseReport(btn.dataset.hg63Action==='history');return}
  if(e.target===node)hg63CloseReport();
 });
 node.querySelector('[data-hg63-action="close"]')?.focus({preventScroll:true});
}
function hg63GearDetails(row,setsById){
 const def=row&&E.ITEMS[row.itemId];if(!def)return '';
 const stats=E.hg46Stats(row),slot=E.HG47_SLOTS.find(s=>s[0]===def.slot)?.[1]||def.slot;
 const rank={common:'Phổ thông',sentinel:'Vệ Binh',astral:'Tinh Vân',dragon:'Long Hồn',star:'Tinh Không',rare:'Cổ vật',divine:'Thần khí'}[E.hg46Kind(row)]||'Đặc biệt';
 const values=['atk','def','spd','int'].map(k=>{
  const raw=Number(def[k]||0),current=Number(stats?.[k]||0);
  return k.toUpperCase()+' '+format(current)+(current!==raw?' (gốc '+format(raw)+')':'');
 }).join(' · ');
 const set=setsById[def.set],affixes=E.hg47Affixes(row),effect=equipmentBattleText(def);
 return '<details class="hg63-item-details"><summary>ⓘ Chi tiết vật phẩm</summary>'+
  '<p><b>'+esc(def.name)+'</b> · '+esc(rank)+' · '+esc(slot)+' · cấp cường hóa +'+(row.enhance||0)+'</p>'+
  '<p><b>Chỉ số thực:</b> '+esc(values)+'</p>'+
  (effect?'<p><b>Hiệu ứng chiến đấu:</b> '+esc(effect)+'</p>':'')+
  (affixes.length?'<p><b>Dòng phụ:</b> '+esc(affixes.map(a=>a.label).join(' · '))+'</p>':'')+
  (set?'<p><b>Bộ '+esc(set.name)+':</b> '+esc(set.note||'Điều kiện kích hoạt theo số món đang mặc')+'</p>':'')+
  '<p><b>Nguồn nhận:</b> '+esc(row.origin||set?.source||'Không có biên nhận nguồn trong vật phẩm này')+'</p>'+
  '<small>Chỉ số hiển thị được đọc từ vật phẩm UID '+row.uid+'; nâng cấp/dòng phụ không tự tạo phần thưởng.</small></details>';
}
function battleReportsView(){
 const outcomes={win:'Chiến thắng',lose:'Thất bại',timeout:'Hết thời gian',retreat:'Rút lui'},locations={stationed:'Đóng quân tại mục tiêu',returning:'Lên đường quay về thành',home:'Ở thành'};
 const table=(rows,allied)=>`<p class="report-scroll-hint hint">Vuốt ngang bảng để xem đủ số quân và thương binh.</p><div class="battle-report-table"><table><thead><tr><th>Đội quân</th><th>Xuất trận</th><th>Còn sống</th><th>Tổn thất</th>${allied?'<th>Tử trận</th><th>Vào Arena</th>':''}</tr></thead><tbody>${rows.map(u=>`<tr><td>${esc(u.name)}</td><td>${format(u.initial)}</td><td>${format(u.survived)}</td><td>${format(u.lost)}</td>${allied?`<td>${u.wounded===null?'Chưa đủ dữ liệu':format(u.lost-u.wounded)}</td><td>${u.wounded===null?'Chưa đủ dữ liệu':format(u.wounded)}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
 return `${hg29LastView()}${hg409RewardHistoryUI()}<section class="card"><span class="eyebrow">LỊCH SỬ GIAO TRANH</span><h1>Chiến báo</h1><p class="hint">Tối đa 30 trận gần nhất · tương thích save v07</p>${!state.battleReports?.length?'<div class="hg28-empty-state"><span>⚔</span><h2>Chưa có chiến báo</h2><p>Hoàn tất một trận đánh để ghi nhận thương vong và phần thưởng.</p>'+button('tab',{tab:'map'},'🗺 Mở bản đồ',false,'primary')+'</div>':state.battleReports.map((r,i)=>`<details class="battle-report" data-report-id="${esc(r.id)}" ${i===0?'open':''}><summary><b>${outcomes[r.outcome]}</b> · ${esc(r.name)} (${esc(r.target)}) · ${esc(r.heroName)} · ${r.turns} lượt</summary><p>Thành xuất quân: ${esc(state.cities.find(c=>c.id===r.homeCityId)?.name||r.homeCityId)} · Sau trận: ${locations[r.disposition]}</p><h3>Quân ta</h3>${table(r.allies,true)}<h3>Quân địch</h3>${table(r.enemies,false)}<p><b>Trang bị:</b> ${r.items===null?'Chưa đủ dữ liệu':r.items.map(i=>esc(i.name)).join(', ')||'Không nhận trang bị'}</p><p class="report-rewards"><b>Thực nhận:</b> ${money(r.resources)||'Không có tài nguyên'} · +${r.heroXp.toLocaleString('vi-VN',{maximumFractionDigits:6})} EXP tướng · +${format(r.fame)} danh vọng</p><p class="hint">Thương binh là số đã ghi vào Arena trong trận. Trận từ save cũ thiếu sổ thương binh sẽ ghi chưa đủ dữ liệu. Công thức giao tranh và phần thưởng vẫn theo mô hình được công bố trong Tư liệu.</p></details>`).join('')}</section>`;
}
// One visible action for a nearest reachable NPC. Selecting does not start a march.
function selectNearestNpc(stars=1){
 if(!Number.isSafeInteger(stars)||stars<1||stars>8)throw Error('Cấp sao NPC không hợp lệ.');
 const origin=E.activeCity(state).key;
 const targets=E.NPC_CAMPS_2009.filter(n=>n.stars===stars)
  .map(n=>({npc:n,path:E.pathfind(origin,n.key)})).filter(n=>n.path)
  .sort((a,b)=>a.path.length-b.path.length||a.npc.key.localeCompare(b.npc.key));
 if(!targets.length)throw Error('Không tìm thấy NPC có đường đi từ thành đang mở.');
 const tile=E.getTile(targets[0].npc.key);
 selected=tile.key;selectedTargetKind=null;tab='map';
 Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y});
 return tile;
}
function mapView(){
 const target=E.getTile(selected||E.activeCity(state).key),treasure=selectedTargetKind==='treasure'?E.getTreasureCamp(target?.key):target?.treasureCamp,treasureSelected=!!treasure&&(selectedTargetKind==='treasure'||target?.kind==='treasure'),treasureDone=!!(treasureSelected&&state.treasureCleared?.includes(target.key)),owned=target&&E.cityForKey(state,target.key),claimed=t=>state.mines.some(m=>m.key===t.key),cleared=t=>state.cleared.includes(t.key),worldDef=target?.kind==='visit'?E.WORLD_BUILDING_BY_KEY.get(target.key):null;
 const neutralCastle=target?.kind==='castle'&&!owned,aiCity=target&&E.aiCityAt?.(state,target.key);
 const active=target&&(treasureSelected?!treasureDone:target.kind==='npc'||target.kind==='mine'&&!claimed(target)&&!cleared(target)||neutralCastle);
 const stationed=target&&state.stationedHeroes?.find(x=>x.key===target.key),stationedHero=stationed&&state.heroes.find(h=>h.id===stationed.heroId);
 const mineCount=Array.isArray(state.mines)?state.mines.length:0,mineLimit=E.mineLimit(state),mineCapReached=!treasureSelected&&target?.kind==='mine'&&mineCount>=mineLimit;
 const cityCapReached=neutralCastle&&state.cities.length>=E.cityLimit(state.fame);
 const awayCount=(state.stationedHeroes?.length||0)+(state.expedition?1:0)+(state.parallelMarches?.length||0),canDispatchAlongside=!!state.march&&state.march.phase==='outbound'&&!state.battle;
 const marchLabel=state.battle?'Đang giao tranh':awayCount>=3?'Đã đủ 3 tướng ngoài thành':state.march?.phase==='return'?'Tướng đang trở về':canDispatchAlongside?`🚩 Xuất thêm đạo quân · ${awayCount}/3`:state.march?'Tướng đang hành quân':mineCapReached?'Hết hạn mức mỏ':cityCapReached?'Cần thêm danh vọng':'🚩 Xuất chinh';
 const dispatchBusy=!!state.battle||!!(state.march&&!canDispatchAlongside)||!!(state.expedition&&!canDispatchAlongside);
 const marchDisabled=!active||dispatchBusy||awayCount>=3||!E.activeArmy(state).length||mineCapReached||cityCapReached;
 const visited=!!(worldDef&&E.hasVisitedWorldBuilding(state,target.key)),readyHero=state.heroes.find(h=>h.id===state.activeHero),visitDisabled=!worldDef||visited||state.fame<(worldDef?.fame||0)||!!state.march||!!state.battle||!!state.expedition||!!state.parallelMarches?.length||!readyHero||readyHero.id===state.castellan||!!E.heroAway?.(state,readyHero?.id);
 const targetStatus=treasureSelected?(treasureDone?'Đã dọn kho báu này':'Trại kho báu còn nguyên'):owned?`Lãnh thổ của bạn · ${C.races[owned.race].name} · ${owned.main?'Thành chính':'Thành phụ'}`:aiCity?`Thành AI · ${C.races[aiCity.race].name} · cấp ${aiCity.level} · ${Object.values(aiCity.garrison).reduce((a,b)=>a+b,0)} quân đồn trú`:stationed?`Đồn trú: ${stationedHero?.name||'Tướng'} · ${Object.values(stationed.army).reduce((a,b)=>a+b,0)} quân`:worldDef?(visited?'Đã nhận thưởng hôm nay':state.fame<(worldDef.fame||0)?`Cần ${format(worldDef.fame)} danh vọng`:'Sẵn sàng ghé thăm · tướng đang chọn: '+(readyHero?.name||'chưa có')):mineCapReached?'Đã đạt hạn mức mỏ theo Fame':cityCapReached?'Cần danh vọng '+(state.fame<5800?'5.800':'cao hơn')+' để mở thành':claimed(target)?'Đã chiếm':target?.kind==='npc'&&cleared(target)?'Đã thắng · có thể săn lại (8 AP/lần)':cleared(target)?'Đã dọn sạch':target?.kind==='npc'?'Có thể tấn công hoặc săn quái lấy EXP':target?.kind==='empty'?'Khám phá tự do':'Chưa chinh phục';
 const marchHint='Tướng đang ở ngoài thành '+awayCount+'/3 (hướng dẫn 17173, 16-10-2009) · mỏ: '+mineCount+'/'+mineLimit+' · thành: '+state.cities.length+'/'+E.cityLimit(state.fame)+' · AP chiếm thành 8 (mô phỏng)';
 const label=t=>t.kind==='castle'?(E.cityForKey(state,t.key)?.name||t.value||'Thành trung lập'):t.kind==='mine'?`Mỏ ${C.resource[t.value].label}`:t.value;
 const desc=target?treasureSelected?`Kho báu cấp ${treasure.level} · (${String(target.x).padStart(2,'0')},${String(target.y).padStart(2,'0')})`:target.kind==='castle'?`${label(target)} · ${C.races[E.cityForKey(state,target.key)?.race||target.race||'human'].name} · (${target.x},${target.y})`:target.kind==='mine'?`${label(target)} · cấp ${target.level}`:target.kind==='npc'?`Trại ${label(target)} · ${target.level}★ · (${target.x},${target.y})`:target.kind==='visit'?`${label(target)} · (${target.x},${target.y})`: `Địa hình ${target.terrain}`:'Chưa chọn mục tiêu';
 const visitHint=worldDef?({ 'random-resource':'Một trong: 400 Gỗ, 400 Quặng, 200 Lưu huỳnh hoặc 200 Pha lê.','gold-2000':'Nhận 2.000 Vàng theo hướng dẫn 17173 (27-12-2009).','atk-10':'Tướng được +10% Tấn công trong 2 giờ game.','def-10':'Tướng được +10% Phòng thủ trong 2 giờ game.','int-10':'Tướng được +10% Tri thức trong 2 giờ game.','spd-10':'Tướng được +10% Tốc độ trong 2 giờ game.'})[worldDef.effect]+' · Mỗi công trình một lượt/ngày; mốc UTC và việc ghé tức thời là mô hình vì nguồn không ghi giờ reset/di chuyển.' :marchHint;
 const npcHint=target?.kind==='npc'&&target.source==='SRC46'?`Sina 23-08-2009 (SRC47) ghi lực lượng quái trấn giữ ${format(target.reportedGuardForce)}. 17173 27-07-2009 (SRC46) khuyến nghị tối thiểu ${format(target.minimumForce)} và mốc thắng hoàn toàn ${format(target.completeForce)}.${target.laterReportedGuardForce?` Sina 21-09-2009 (SRC45) mô tả xấp xỉ ${format(target.laterReportedGuardForce)} cho quái ${target.level}★; đây là ước tính khác ngày.`:''} Đây là số liệu hướng dẫn, không phải cổng cứng; roster và chỉ số vào trận vẫn mô hình vì chưa tìm thấy dữ liệu NPC gốc.`:null;
 const treasureHint=treasureSelected?`SRC47 (23-08-2009) ghi lực lượng canh giữ ${format(treasure.reportedGuardForce)}; SRC20 (27-12-2009) khuyến nghị tối thiểu ${format(treasure.minimumForce)} và hoàn toàn ${format(treasure.completeForce)}.${treasure.completeForceStatus==='CONFLICT_SOURCE_TYPO_SUSPECTED'?' Mốc hoàn toàn 100.000 ở cấp 6 thấp hơn mốc tối thiểu 480.000; giữ nguyên và đánh dấu nghi lỗi bài, không dùng làm cổng.':''} Đây là khuyến nghị khác ngày, không phải cổng cứng. Thành phần quân, stats trận và loại/chỉ số món rơi chưa xác minh; quân địch và loot hiện mô phỏng.`:null;
 const targetHint=aiCity?`Thành AI phát triển tài nguyên và quân đồn trú khi game chạy/offline. Chi phí, sản lượng và AI này là mô hình offline, chưa phải quy tắc server 2009.`:treasureHint||worldDef?treasureHint||visitHint:owned&&owned.id!==state.activeCityId?'Thành bạn đang mở khác điểm này; dùng đội quân tại thành xuất phát để gửi tài nguyên, tính sức chở và 20 AP/chuyến (SRC59).':stationed?'Tướng và quân đang đồn trú tại điểm chiếm; lệnh Gọi về đưa quân tới thành đã xuất phát.':npcHint||marchHint;
 const enemyPreview=target&&(target.kind==='npc'||treasureSelected)?E.hg409Preview(treasureSelected?'treasure':target.kind,target.key,1,treasureSelected?treasure?.level:target.level):null;
 const hg410Preview=enemyPreview?E.hg410EncounterPreview(treasureSelected?'treasure':target.kind,target.key,1,treasureSelected?treasure?.level:target.level):null;
 const highStarNpc=E.NPC_CAMPS_2009.filter(q=>q.stars>=5);
 const highTierBosses=E.TILES.filter(q=>q.eliteTier>=11);
 const treasureGroups=Array.from({length:10},(_,i)=>E.TREASURE_CAMPS_2009.filter(q=>q.level===i+1));
 const cityAction=owned?button('city-switch',{id:owned.id},owned.id===state.activeCityId?'Đang ở thành này':'🏰 Chuyển tới thành',owned.id===state.activeCityId||!!state.march||!!state.battle||!!state.expedition||!!state.parallelMarches?.length,'primary'):null;
 const cityTransfer=owned&&owned.id!==state.activeCityId?cityTransportForm(owned):null;
 // This is the same 4-neighbor route and effective Hero SPD used by the
 // engine dispatch. ETA is a modeled estimate, not a recovered 2009 constant.
 const previewPath=active&&target?E.pathfind(E.activeCity(state).key,target.key):null;
 const previewHero=state.heroes.find(h=>h.id===state.activeHero);
 const previewSPD=previewHero?E.heroStats(state,previewHero.id)?.spd:null;
 const previewArmyFactor=E.armyMarchFactor(state);
 const previewGameSeconds=previewPath?.length>1&&Number.isFinite(previewSPD)?E.marchDuration(previewSPD,previewPath,previewArmyFactor):null;
 const previewTerrainUnits=previewPath?.length>1?E.pathTravelCost(previewPath):0;
 const previewAP=E.hg182MarchCost?E.hg182MarchCost(state,target?.key,treasureSelected?'treasure':undefined):!treasureSelected&&target?.kind==='mine'?6:8;
 const previewText=!active?'':!previewPath?'Không có tuyến đường bộ tới mục tiêu.':previewGameSeconds===null?'Chưa chọn tướng đủ điều kiện hành quân.':
  `🧭 ${previewPath.length-1} bước · ${previewTerrainUnits} điểm địa hình · sức quân ×${previewArmyFactor.toFixed(2)} · ETA ${Math.ceil(previewGameSeconds/(state.speed===1?1:60))} giây thực ở ${state.speed}× · ${previewGameSeconds} giây game · ${previewAP} AP (cân bằng offline).`;
 const quickHero=state.heroes.find(h=>h.id===state.activeHero),quickArmy=E.activeArmy(state).reduce((sum,u)=>sum+(state.army[u.id]||0),0),
  quickPoints=E.troopValue(state),quickLimit=E.heroLimit(quickHero?.level||1,quickHero),
  quickQuest=E.heroTaskStatus(state),quickStars=quickQuest.active?.stars||1,
  quickBlocked=!!state.battle||!!state.march&&state.march.phase!=='outbound'||quickHero?.id===state.castellan||E.heroAway?.(state,quickHero?.id),
  quickBar=`<section class="quickstart-strip" aria-label="Hướng dẫn xuất quân nhanh"><div class="quickstart-copy"><span class="eyebrow">BẮT ĐẦU CHƠI · 3 THAO TÁC</span><strong>🛡 ${format(quickArmy)} quân · ${state.formation?.length||0} nhóm · ${format(quickPoints)}/${format(quickLimit)} điểm chỉ huy</strong><small>Bố trí quân → nhận nhiệm vụ → tìm quái trên bản đồ. Chọn mục tiêu không tự xuất quân.</small></div><div class="quickstart-actions">${button('autoformation',{},'① ⚔ Bố trí nhanh',quickArmy<1||quickBlocked,'small primary')}${button('tab',{tab:'tasks'},'② 📜 Nhiệm vụ',false,'small secondary')}${button('findnpc',{},'③ ☠ NPC '+quickStars+'★',false,'small secondary')}</div></section>`;
 return `<div class="scene-title"><div><span class="eyebrow">WORLD EXPLORATION • 100 × 100</span><h1>Thế giới Gaia</h1></div><div class="scene-tools">${button('world-index',{},'📍 Điểm đến',false,'small secondary')}${button('zoom',{dir:'in'},'+',false,'secondary')}${button('zoom',{dir:'out'},'-',false,'secondary')}${button('center',{},'Về thành',false,'secondary')}</div></div>
 ${quickBar}<div class="map-frame"><canvas id="world-canvas" width="1176" height="620" aria-label="Bản đồ thế giới tương tác, kéo và chạm chọn tọa độ"></canvas>${button('map-expand',{},mapExpanded?'Hiện điều khiển':'Toàn bản đồ',false,'small secondary hg40-map-expand')}${hg29PreviewUI(treasureSelected?'treasure':target?.kind,target?.key,treasureSelected?treasure?.level:target?.level)}</div>
 <div class="scene-bottom"><div class="target-information"><span class="eyebrow">MỤC TIÊU ĐANG CHỌN</span><h2>${esc(desc)}</h2><p class="muted">${targetStatus}</p>${enemyPreview?`<p class="hg409-target-preview">♜ <b class="hg408-quality-purple">Tướng địch TÍM · Lv100 · B5 · CS${enemyPreview.cs}/10</b> · HP ×${enemyPreview.boost.hp}, ATK ×${enemyPreview.boost.atk}, DEF ×${enemyPreview.boost.def}. ☠ ${hg410Preview?.stacks||0} stack địch, tối thiểu ${format(hg410Preview?.minimumPerStack||0)} quân/stack trước điều chỉnh · Thắng thưởng thêm: ${esc(hg409LootText(enemyPreview))}.</p>`:''}${previewText?`<p class="tiny muted" aria-label="Ước tính hành quân">${esc(previewText)}</p>`:''}<div class="actions">${worldDef?button('visit',{key:target.key},visited?'✓ Đã ghé hôm nay':'✨ Ghé thăm',visitDisabled,'primary'):treasureSelected?button('dispatch-open',{kind:'treasure'},treasureDone?'✓ Đã dọn kho báu':marchLabel,marchDisabled||treasureDone,'primary'):stationed?button('recall',{id:stationed.heroId},'↩ Gọi tướng về',!!state.march||!!state.battle||!!state.expedition,'primary'):owned?cityAction:button('dispatch-open',{},marchLabel,marchDisabled,'primary')}<span class="hint">${esc(targetHint)}</span></div></div>
 <div class="landmarks"><span class="eyebrow">THÀNH AI VÀ TRUNG LẬP • ${E.TILES.filter(q=>q.kind==='castle'&&!E.cityForKey(state,q.key)).length} ĐỊA ĐIỂM</span><p class="tiny muted">Hiển thị 16 thành gần thành đang mở nhất. Các thành còn lại vẫn xuất hiện trên bản đồ và minimap; chạm để xem quân phòng thủ.</p><div class="landmark-list">${E.TILES.filter(q=>q.kind==='castle'&&!E.cityForKey(state,q.key)).sort((a,b)=>{const home=E.getTile(E.activeCity(state).key);return Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-Math.abs(b.x-home.x)-Math.abs(b.y-home.y)}).slice(0,16).map(q=>button('select',{key:q.key},`${E.aiCityAt(state,q.key)?'⚔ AI':'🏰'} ${esc(q.value)} · ${C.races[q.race].name} (${q.x},${q.y})`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">CÔNG TRÌNH NGOÀI THÀNH • TỌA ĐỘ 17173, 27-12-2009</span><div class="landmark-list">${E.WORLD_BUILDINGS.map(q=>button('select',{key:`${q.x},${q.y}`},`✨ ${esc(q.name)} (${q.x},${String(q.y).padStart(2,'0')})${E.hasVisitedWorldBuilding(state,`${q.x},${q.y}`)?' · Đã ghé':''}`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">MA GIỚI 9–10★ • QUÁI T11/T12 (FANDOM)</span><p class="tiny muted">Fandom xác nhận chỉ số quái Demon T11/T12, nhưng các tọa độ, số quân và xác suất rơi dưới đây là thiết kế HG18. Hạ Boss mở nhiệm vụ tuần, có mảnh Tinh Vân và đá cường hóa.</p><div class="landmark-list">${highTierBosses.map(q=>button('select',{key:q.key},`☠ ${q.level}★ · ${esc(q.value)} · T${q.eliteTier} (${q.x},${q.y})`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">QUÁI VẬT 5–8★ • TỌA ĐỘ HƯỚNG DẪN 17173, 27-07-2009</span><p class="tiny muted">${highStarNpc.length} mục tiêu. Chọn ở đây hoặc chạm ký hiệu trên bản đồ. Quân lực là khuyến nghị; roster trận chưa phục hồi từ dữ liệu gốc.</p><div class="landmark-list">${highStarNpc.map(q=>button('select',{key:q.key},`☠ ${q.stars}★ · (${String(q.x).padStart(2,'0')},${String(q.y).padStart(2,'0')}) · ${format(q.minimumForce)}+`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">TRẠI KHO BÁU • 76 TỌA ĐỘ HƯỚNG DẪN 17173, 27-12-2009</span><p class="tiny muted">Chọn theo cấp để xem địa điểm, lực lượng khuyến nghị SRC20 và báo cáo canh giữ SRC47. Danh sách dùng 76 tọa độ bài hướng dẫn Trung Quốc; quân địch, cách rơi và chỉ số loot vẫn mô phỏng.</p>${treasureGroups.map((group,i)=>{const row=E.TREASURE_GEAR_GUIDE[i+1],sel=selectedTargetKind==='treasure';return `<details class="treasure-level"><summary>🧰 Kho báu cấp ${i+1} · ${group.length} điểm · SRC47 canh giữ ${format(row.reportedGuardForce)}</summary><p class="tiny muted">SRC20: tối thiểu ${format(row.minimumForce)}; hoàn toàn ${format(row.completeForce)}.${row.completeForceStatus==='CONFLICT_SOURCE_TYPO_SUSPECTED'?' Mốc hoàn toàn do bài in thấp hơn mức tối thiểu; nghi lỗi nguồn, không dùng làm cổng.':''}</p><div class="landmark-list">${group.map(q=>button('select',{key:q.key,kind:'treasure'},`🧰 (${String(q.x).padStart(2,'0')},${String(q.y).padStart(2,'0')})${state.treasureCleared?.includes(q.key)?' · Đã dọn':''}`,false,sel&&selected===q.key?'small primary':'small secondary')).join('')}</div></details>`}).join('')}</div></div>
 ${cityTransfer||''}${cityTransportView()}${state.march?`<div class="banner">🚩 ${state.march.phase==='return'?'Đạo quân đang trở về thành từ '+state.march.fromKey:'Đạo quân đang tiến tới '+state.march.target} • ${Math.ceil(state.march.remaining/state.speed)} giây thực còn lại • ${awayCount}/3 tướng đang ở ngoài thành</div>`:''}${state.parallelMarches?.length?`<div class="card expedition-ledger"><b>🧭 Các đạo quân đang đi (${awayCount}/3)</b>${state.parallelMarches.map(q=>`<div class="entry"><span>${esc(state.heroes.find(h=>h.id===q.heroId)?.name||'Tướng')} → ${esc(E.getTile(q.target)?.value||q.target)} · ${q.phase==='arrived'?'đã tới, chờ giao tranh':Math.ceil(q.remaining/state.speed)+' giây còn lại'}</span></div>`).join('')}</div>`:''}`;
}
function citySwitcher(){const blocked=!!state.march||!!state.battle||!!state.expedition||!!state.parallelMarches?.length;return `<div class="hg28-city-switcher" aria-label="Các thành trì"><span class="hg28-city-count">🏰 ${state.cities.length}<small> / ${E.cityLimit(state.fame)}</small></span><div class="hg28-city-switch-list">${state.cities.map(c=>button('city-switch',{id:c.id},`${c.main?'♛':'🏰'} ${esc(c.name)} · ${C.races[c.race].name}`,blocked||c.id===state.activeCityId,c.id===state.activeCityId?'small primary':'small secondary')).join('')}</div></div>`}
// AP is paid by the canonical march engine only after a valid dispatch.
// UI has to reflect the exact HG18.2 Scouting discount, not a fixed 8 AP.
function dispatchRequiredAP(draft){
 const kind=draft.kind==='treasure'?'treasure':undefined;
 const tile=E.getTile(draft.targetKey);
 return E.hg182MarchCost?E.hg182MarchCost(state,draft.targetKey,kind):
  tile?.kind==='mine'?6:8;
}
function dispatchAPReady(draft){return state.ap+1e-8>=dispatchRequiredAP(draft)}
function dispatchAPReadout(draft){
 const cost=dispatchRequiredAP(draft),available=Math.floor(state.ap);
 return '🔋 AP '+format(available)+' / cần '+format(cost)+(dispatchAPReady(draft)?' · đủ AP':' · thiếu AP')+' · chỉ trừ khi xuất chinh';
}
function syncDispatchAP(){
 const draft=dispatchDraft,container=$('game-modal-body');
 if(!draft||!container?.querySelector('.hg39-dispatch'))return;
 const display=container.querySelector('[data-hg39-dispatch-ap]');
 if(display)display.textContent=dispatchAPReadout(draft);
 const confirm=container.querySelector('[data-action="dispatch-confirm"]');
 const hero=state.heroes.find(h=>h.id===draft.heroId);
 if(confirm)confirm.disabled=!(hero&&E.hg20HeroRole(state,hero.id).status==='home'&&
  E.formationPoints(state,draft.form)<=E.heroLimit(hero.level,hero)&&
  draft.form.some(g=>g.count>0)&&!!E.getTile(draft.targetKey)&&dispatchAPReady(draft));
}
function dispatchView(){
 const draft=dispatchDraft;if(!draft)return '';
 const hero=state.heroes.find(h=>h.id===draft.heroId),role=hero&&E.hg20HeroRole(state,hero.id),
  reserved=hero?E.hg20Reservations(state,hero.id):{},form=draft.form||[],
  points=hero?E.formationPoints(state,form):0,limit=hero?E.heroLimit(hero.level,hero):0,
  freeFor=id=>Math.max(0,(state.army[id]||0)-(reserved[id]||0)),
  target=E.getTile(draft.targetKey),targetLabel=target?.kind==='castle'?target.value:target?.kind==='mine'?`Mỏ ${C.resource[target.value]?.label||target.value}`:target?.value||draft.targetKey,
  total=form.reduce((n,g)=>n+g.count,0),canLaunch=!!hero&&role?.status==='home'&&points<=limit&&total>0&&!!target&&dispatchAPReady(draft);
 const heroCards=state.heroes.map(h=>{const r=E.hg20HeroRole(state,h.id),selected=h.id===draft.heroId,ready=r.status==='home';return `<button type="button" data-action="dispatch-select-hero" data-id="${h.id}" class="hg39-dispatch-hero ${selected?'active':''}" ${ready?'':'disabled'}><b>${hg408HeroNameHTML(h)}</b><small>Lv.${h.level} · ${esc(r.label)}</small></button>`}).join('');
 const rows=form.map((g,i)=>{const u=E.getUnit(state,g.unitId);if(!u)return '';const free=Math.max(0,freeFor(g.unitId)-form.reduce((n,x,j)=>n+(j!==i&&x.unitId===g.unitId?x.count:0),0));return `<div class="hg39-dispatch-row"><span class="hg39-dispatch-unit">${hg28ArmyUnitThumb(u,38)}<b>${esc(u.name)}</b><small>${format(free)} rảnh / ${format(reserved[u.id]||0)} giữ cho tướng khác</small></span><div class="hg39-dispatch-count"><button data-action="dispatch-adjust" data-slot="${i}" data-delta="-1" aria-label="Giảm quân" ${g.count<=1?'disabled':''}>−</button><input type="number" min="1" max="${free}" value="${g.count}" data-dispatch-slot="${i}" aria-label="Số ${esc(u.name)} xuất chinh"><button data-action="dispatch-adjust" data-slot="${i}" data-delta="1" aria-label="Tăng quân" ${g.count>=free?'disabled':''}>＋</button><button class="hg39-remove" data-action="dispatch-remove" data-slot="${i}" aria-label="Bỏ ${esc(u.name)}">×</button></div></div>`}).join('');
 const addable=E.arrUnits(state).filter(u=>freeFor(u.id)>form.reduce((n,g)=>n+(g.unitId===u.id?g.count:0),0));
 return `<section class="hg39-dispatch"><header><div><span class="eyebrow">ĐẠO QUÂN MỚI</span><h2>${esc(targetLabel)} <small>(${target?.x}, ${target?.y})</small></h2></div><button data-action="dispatch-close" class="secondary" aria-label="Đóng">×</button></header><div class="hg39-dispatch-heroes" aria-label="Chọn tướng xuất chinh">${heroCards}</div>${hero?`<div class="hg39-command-meter"><span data-hg39-dispatch-points>⚔ ${hg408HeroNameHTML(hero)} · ${format(points)} / ${format(limit)} điểm chỉ huy</span><progress max="${Math.max(1,limit)}" value="${Math.min(points,limit)}"></progress><small>Quân trong thành vẫn thuộc thành đến khi xác nhận xuất chinh.</small></div>`:''}<div class="hg39-army-roster">${rows||'<p class="muted">Chưa có quân trong đội hình này. Thêm quân đang rảnh bên dưới.</p>'}</div><div class="hg39-dispatch-add"><select id="hg39-dispatch-unit" aria-label="Chọn quân để thêm">${addable.length?addable.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${format(freeFor(u.id))} còn rảnh</option>`).join(''):'<option value="">Không còn quân khả dụng</option>'}</select><button data-action="dispatch-add-unit" class="secondary" ${!addable.length||form.length>=7?'disabled':''}>＋ Thêm quân</button></div><footer><span class="hg39-dispatch-total">${format(total)} quân · ${state.heroes.filter(h=>E.hg20HeroRole(state,h.id).status!=='home').length}/3 tướng đang bận</span><span data-hg39-dispatch-ap class="hg39-dispatch-ap" aria-live="polite">${esc(dispatchAPReadout(draft))}</span><button data-action="dispatch-auto" class="secondary" ${!hero||role?.status!=='home'}>⚔ Tự bố trí</button><button data-action="dispatch-save" class="secondary" ${!hero||role?.status!=='home'}>Lưu đội hình</button><button data-action="dispatch-confirm" class="primary" ${canLaunch?'':'disabled'}>🚩 Xuất chinh</button></footer></section>`;
}
function syncDispatchDraftUI(){
 const draft=dispatchDraft;if(!draft)return;
 const hero=state.heroes.find(h=>h.id===draft.heroId),role=hero&&E.hg20HeroRole(state,hero.id),form=draft.form||[],
  held=hero?E.hg20Reservations(state,hero.id):{},points=hero?E.formationPoints(state,form):0,limit=hero?E.heroLimit(hero.level,hero):0,
  total=form.reduce((sum,g)=>sum+g.count,0),busy=state.heroes.filter(h=>E.hg20HeroRole(state,h.id).status!=='home').length;
 const pointLabel=$('game-modal-body')?.querySelector('[data-hg39-dispatch-points]'),meter=$('game-modal-body')?.querySelector('.hg39-command-meter progress'),
  totalLabel=$('game-modal-body')?.querySelector('.hg39-dispatch-total'),confirm=$('game-modal-body')?.querySelector('[data-action="dispatch-confirm"]');
 if(pointLabel&&hero)pointLabel.textContent=`⚔ ${hero.name} · ${format(points)} / ${format(limit)} điểm chỉ huy`;
 if(meter){meter.max=Math.max(1,limit);meter.value=Math.min(points,limit)}
 if(totalLabel)totalLabel.textContent=`${format(total)} quân · ${busy}/3 tướng đang bận`;
 if(confirm)confirm.disabled=!(hero&&role?.status==='home'&&points<=limit&&total>0&&!!E.getTile(draft.targetKey)&&dispatchAPReady(draft));
 syncDispatchAP();
 for(const row of $('game-modal-body')?.querySelectorAll('.hg39-dispatch-row')||[]){
  const input=row.querySelector('[data-dispatch-slot]');if(!input)continue;
  const index=Number(input.dataset.dispatchSlot),group=form[index];
  const id=group?.unitId,free=id?Math.max(0,(state.army[id]||0)-(held[id]||0)-form.reduce((n,g,i)=>n+(i!==index&&g.unitId===id?g.count:0),0)):0;
  row.hidden=!group;input.value=group?String(group.count):'0';input.max=String(free);
  const minus=row.querySelector('[data-delta="-1"]'),plus=row.querySelector('[data-delta="1"]');
  if(minus)minus.disabled=!group||group.count<=1;if(plus)plus.disabled=!group||group.count>=free;
 }
}

function hg35ExpenseText(cost){return C.keys.filter(k=>cost[k]>0)
 .map(k=>C.resource[k].label+' -'+format(cost[k])).join(' · ')}
function hg35CostBreakdown(cost){
 return '<div class="hg35-cost-ledger" aria-label="Tài nguyên sẽ trừ khi xác nhận">'+
 C.keys.filter(k=>cost[k]>0).map(k=>{
  const before=state.res[k],spent=cost[k],left=before-spent;
  return '<div class="hg35-cost-line'+(left<0?' hg35-cost-short':'')+'">'+
   '<span>'+(ico(k,18)||C.resource[k].emoji)+' '+esc(C.resource[k].label)+'</span>'+
   '<strong>−'+format(spent)+'</strong>'+
   '<small>'+format(before)+' → '+(left<0?'Thiếu '+format(-left):format(left))+'</small></div>';
 }).join('')+'</div>';
}
// HG35: the visible effects are computed from REAL engine gates/counters.
// An unsupported building level is labelled as such, never given a fake buff.
function hg35BuildingEffects(key,level,compact=false){
 const next=Math.min(10,level+1),after=E.clone(state);after.buildings[key]=next;
 const tierKeys=['barracks','graveyard','stables','blacksmith','magicPool','natureTower','beastPen','darkHall','soulTower'];
 let title='Chức năng đang hoạt động',current='',future='',note='';
 const actionTab={barracks:'army',graveyard:'army',heroTower:'heroes',tavern:'heroes',
  magicTower:'magic',arena:'heroes'};
 if(key==='hall'){
  const rateNow=E.rate(state).gold,rateNext=E.rate(after).gold;
  current='Vàng: +'+format(rateNow)+'/giờ game (tổng sản lượng thành).';
  future='Sau cấp '+next+': +'+format(rateNext)+'/giờ game; Town Hall còn giới hạn cấp của các nhà khác.';
 }else if(key==='warehouse'){
  const a=E.limits(state),b=E.limits(after);
  current='Dung lượng tài nguyên: Vàng '+format(a.gold)+' · Gỗ/Quặng '+format(a.wood)+'.';
  future='Sau cấp '+next+': Vàng '+format(b.gold)+' · Gỗ/Quặng '+format(b.wood)+
   ' · Lưu huỳnh/Pha lê '+format(b.sulfur)+'.';
  note='Kho chỉ chứa tài nguyên, KHÔNG giới hạn quân ở trong thành.';
 }else if(key==='heroTower'){
  current='Thưởng kinh nghiệm tướng: +'+(E.heroTowerExperienceBonus?.(state)||0)+'%.';
  future='Sau cấp '+next+': +'+next+'% EXP; điều kiện tuyển tướng và Castellan vẫn áp dụng.';
 }else if(key==='tavern'){
  current='Chiêu mộ và làm mới ứng viên (Tavern Lv.'+level+').';
  future='Cấp '+next+' mở chất lượng ứng viên theo bảng Tavern hiện có; không bảo đảm mỗi lượt ra tướng hiếm.';
 }else if(key==='magicTower'){
  current='Nghiên cứu phép tại cấp '+level+'; phép đã học vẫn giữ nguyên.';
  future='Sau cấp '+next+': nghiên cứu các phép tiếp theo tối đa cấp '+next+' nếu đủ tài nguyên.';
 }else if(key==='arena'){
  current=level>0?'Hồi phục quân bị thương tại Đấu trường.':'Chưa mở hồi phục quân bị thương.';
  future='Cấp '+next+': vẫn dùng hàng đợi hồi phục hiện có.';
  note='Game chưa gắn thêm hệ số hồi phục riêng cho từng cấp Arena.';
 }else if(key==='market'){
  current=level?'Đã mở bán Gỗ, Quặng, Lưu huỳnh và Pha lê để nhận Vàng.':'Chưa mở chức năng bán tài nguyên.';
  future='Cấp '+next+': '+(next===1?'mở giao dịch thực tế.':'giữ giao dịch; tỷ giá đang mô phỏng, chưa có tăng tỷ giá theo cấp.');
 }else if(key==='bazaar'){
  const items=Object.values(E.ITEMS||{}).filter(i=>i.shop!==false);
  const available=items.filter(i=>i.level<=level),incoming=items.filter(i=>i.level===next);
  current='Đang bán '+available.length+' món đồ theo cấp Bazaar.';
  future='Cấp '+next+': '+(incoming.length?'mở '+incoming.slice(0,4).map(i=>i.name).join(', ')+'.':'không có món mới đã triển khai.');
 }else if(tierKeys.includes(key)){
  const all=E.arrUnits(state).filter(u=>!u.rewardOnly);
  const open=s=>all.filter(u=>E.troopPrerequisites(s,u).available);
  const have=open(state),will=open(after),ids=new Set(have.map(u=>u.id));
  const newly=will.filter(u=>!ids.has(u.id));
  current='Đã đủ điều kiện tuyển '+have.length+' loại quân của chủng tộc.';
  future='Cấp '+next+': '+(newly.length?'mở thêm '+newly.map(u=>u.name).join(', ')+'.':
   'chưa mở thêm quân nếu chỉ nâng nhà này; có thể còn thiếu nhà/phép khác.');
  note=key==='blacksmith'?'Blacksmith Lv.8 cùng Manufacturing Lv.6 trở lên còn giảm chi phí quân T9/T10 theo kinh tế hiện tại.':
   'Công trình này là điều kiện mở quân, không có buff chiến đấu độc lập đã code.';
 }else{
  current='Mô tả: '+(C.buildings[key]?.desc||'Chưa có cơ chế hoạt động.');
  future='Cấp '+next+': chưa có tác dụng riêng đã triển khai.';
 }
 if(level>=10)future='Đã đạt giới hạn cấp hiện tại.';
 // The full inspector sits BELOW the city canvas. Show the same calculated
 // real effects immediately beside the selected building, in two short rows.
 // Detailed text is preserved in the existing inspector and action below.
 if(compact)return '<div class="hg35-building-brief" id="hg35-building-brief" aria-label="Tác dụng công trình hiện tại và cấp kế tiếp">'+
  '<span class="hg35-brief-label">HIỆN</span><span title="'+esc(current)+'">'+esc(current)+'</span>'+
  '<span class="hg35-brief-label">CẤP TIẾP</span><span title="'+esc(future)+'">'+esc(future)+'</span>'+
  button('city-inspector',{},'ⓘ Chi tiết',false,'small secondary')+'</div>';
 const action=actionTab[key]?button('tab',{tab:actionTab[key]},
  key==='magicTower'?'🔮 Mở nghiên cứu phép':key==='arena'?'⚕ Mở hồi phục':
   key==='tavern'?'🍺 Mở chiêu mộ tướng':key==='heroTower'?'🧙 Mở tướng':
   '🛡 Mở tuyển quân',false,'small secondary'):
  (key==='market'||key==='bazaar')&&level>0?button('city-service',{key},
   key==='market'?'⚖ Mở giao dịch Market':'🏪 Mở cửa hàng Bazaar',false,'small secondary'):'';
 return '<div class="hg35-building-effects"><b>'+title+'</b><p>'+esc(current)+'</p>'+
  '<b>Ý nghĩa cấp tiếp</b><p>'+esc(future)+'</p>'+
  (note?'<small>'+esc(note)+'</small>':'')+
  (action?'<div class="hg35-building-actions">'+action+'</div>':'')+'</div>';
}
function cityViewBase(){const k=selectedBuilding,b=C.buildings[k],lv=state.buildings[k],cost=E.buildCost(state,k),gate=E.buildingUpgradeGate?.(state,k)||{allowed:k==='hall'||lv<state.buildings.hall,reason:k!=='hall'&&lv>=state.buildings.hall?'Cần nâng Town Hall trước.':''},can=!state.buildingQueue&&b.state==='observed'&&lv<10&&gate.allowed&&E.canAfford(state,cost),city=E.activeCity(state);
 const buildings=E.cityBuildOrder(state).map(id=>{const item=C.buildings[id],level=state.buildings[id]||0;return button('building',{key:id},`<span class="hg28-building-icon">${item.icon}</span><span>${esc(item.name)}</span><b>Lv.${level}</b>`,false,id===k?'hg28-building active':'hg28-building')}).join('');
 const stateHint=b.state!=='observed'?'Chưa thể nâng công trình này.':!gate.allowed?gate.reason:!E.canAfford(state,cost)?'Thiếu tài nguyên.':state.buildingQueue?'Đang có công trình trong hàng đợi.':'Sẵn sàng nâng cấp.';
 return `<section class="hg28-city-screen"><div class="hg28-city-title"><div><span class="eyebrow">${esc(C.races[city.race].english.toUpperCase())} · ${city.main?'THÀNH CHÍNH':'THÀNH PHỤ'}</span><h1>${esc(city.name)}</h1></div><div class="hg28-city-stats"><span>♛ Lv.${state.buildings.hall}</span><span>⚒ ${E.buildOrder.filter(id=>state.buildings[id]>0).length}</span></div></div>
 <div class="hg28-city-stage"><div class="city-frame"><canvas id="city-canvas" width="1176" height="560" aria-label="Cảnh thành tương tác, nhấn vị trí công trình để chọn"></canvas><span class="hg28-city-hint">Chạm công trình trong thành để chọn</span></div>
 <aside class="hg28-city-command"><div class="hg28-selected-building"><span class="hg28-building-emblem">${b.icon}</span><div><small>CÔNG TRÌNH</small><h2>${esc(b.name)}</h2><span>Cấp ${lv} / 10</span></div></div>
 <p class="hg28-building-desc" title="${esc(b.desc)}">${esc(b.desc)}</p>
 ${hg35BuildingEffects(k,lv,true)}
 <div class="hg28-upgrade"><div class="hg28-upgrade-cost">
 <small>${lv>=10?'ĐÃ TỐI ĐA':'NÂNG CẤP LÊN '+(lv+1)+' · TRỪ NGAY'}</small>
 <b>${lv<10?money(cost):'Đã đạt cấp 10'}</b></div>
 ${button('upgrade',{key:k},state.buildingQueue?'⏳ Đang xây':'⬆ Nâng cấp',!can,'primary')}
 <span class="hg28-upgrade-hint">${esc(stateHint)}</span></div>
 <div class="hg28-building-grid" aria-label="Chọn công trình">${buildings}</div></aside></div>
 <div class="hg35-city-inspector" id="hg35-city-inspector" aria-label="Công dụng và chi phí chi tiết của công trình đã chọn">
 <div class="hg35-city-inspector-title"><b>ⓘ ${esc(b.vi||b.name)} · Cấp ${lv}/10</b><span>Tác dụng thật, cấp kế tiếp và số dư sau khi trừ</span></div>
 <div class="hg35-city-inspector-grid">${hg35BuildingEffects(k,lv)}
 <div class="hg35-inspector-pay"><b>${lv<10?'Nâng lên cấp '+(lv+1)+' · trừ khi xác nhận':'Đã đạt cấp cao nhất'}</b>
 ${lv<10?hg35CostBreakdown(cost):'<p>Không phát sinh chi phí xây tiếp.</p>'}
 <small>${esc(stateHint)}</small></div></div></div></section>`;
}
function heroArmyCommandView(){
 const home=state.activeCityId||'main';
 const occupied=state.heroes.map(h=>{
  const duty=E.hg20HeroRole(state,h.id),troops=duty.army||[];
  const count=troops.reduce((sum,g)=>sum+g.count,0);
  const summary=troops.slice(0,3).map(g=>esc(E.getUnit(state,g.unitId)?.name||g.unitId)+' ×'+format(g.count)).join(' · ');
  const selected=h.id===state.activeHero;
  return '<div class="card"><div class="heading">🧙 '+hg408HeroNameHTML(h)+' · Lv.'+h.level+
   (selected?' <span class="tag">ĐANG CHỌN</span>':'')+'</div>'+
   '<p class="hint">'+esc(duty.label)+' · <b>'+format(count)+' lính</b> · '+troops.length+' nhóm'+
   (duty.target?' · mục tiêu '+esc(duty.target):'')+'</p>'+
   '<p class="tiny muted">'+(summary||'Chưa phân quân')+'</p>'+
   button('hero',{id:h.id},selected?'✓ Tướng hiện tại':'Chọn để điều binh',selected||duty.status!=='home','small secondary')+'</div>';
 }).join('');
 const other=E.hg20Reservations(state,state.activeHero);
 const allocated=Object.entries(other).filter(([,v])=>v>0).map(([id,count])=>esc(E.getUnit(state,id)?.name||id)+' ×'+format(count)).join(' · ');
 const hero=state.heroes.find(h=>h.id===state.activeHero),role=E.hg20HeroRole(state,state.activeHero);
 const leader=hg408HeroNameHTML(hero);
 return '<section class="card hg20-command"><h2>🎖 Điều binh theo từng tướng</h2>'+
 '<p class="hint">Đang điều binh cho <b>'+leader+'</b> · '+esc(role.label)+'. Chọn tướng trước, sau đó phân quân ở 7 ô bên dưới và bấm <b>Lưu đội hình</b>. Quân đang đi trận đã tách khỏi kho thành; mỗi đơn vị trong thành chỉ được phân cho một tướng.</p>'+
 '<div class="grid grid3">'+occupied+'</div><p class="tiny muted">Quân đã đặt trước cho tướng khác tại '+esc(home)+': '+(allocated||'không có')+
 '. Sau khi bấm Xuất chinh, quân thật được giao cho tướng và sẽ xuất hiện ở trạng thái hành quân/chiến đấu/đồn trú.</p></section>';
}
function hg26AutohuntView(){
 const farm=E.hg26Status(state),bosses=E.hg24RecommendBoss(state);
 const defaults=farm.enabled?farm.config:{target:null,maxRuns:3,keepAP:0,minUnits:10,
  minCoverage:70,maxLossPercent:30,autoHeal:true,autoRecruit:false,stopOnLoss:true};
 const first=[...bosses].sort((a,b)=>a.eliteTier-b.eliteTier||a.distance-b.distance)[0];
 const chosen=defaults.target||first?.key;
 const entry=(label,id,value,min,max)=>'<label>'+label+'<input id="'+id+'" type="number" min="'+min+'" max="'+max+'" step="1" value="'+value+'"></label>';
 const check=(label,id,v)=>'<label><input type="checkbox" id="'+id+'" '+(v?'checked':'')+'> '+label+'</label>';
 const last=farm.last?'<p class="notice">Trận gần nhất: '+esc(farm.last.outcome)+' · '+farm.last.unitsSurvived+'/'+farm.last.unitsDeparted+
  ' lính sống sót · tổn thất '+farm.last.lossPercent+'%'+(farm.last.reportId?' · báo cáo '+esc(farm.last.reportId):'')+'</p>':'';
 return '<section class="card hg26-autohunt" aria-label="HG26 săn Boss tự động">'+
  '<h2>🔁 HG-26 · 3 tướng săn Boss chung</h2>'+
  '<p class="hint">Đội săn chỉ được hành quân và đánh Boss khi <b>bạn bật</b>. Mỗi tick xử lý tối đa một lệnh: mất AP thật, quân thật, thương vong thật, tiền hồi phục/tuyển thật. Nếu không thắng hoặc vượt mức nguy hiểm, dừng theo chính sách. Không đánh Bí Cảnh.</p>'+
  '<p class="notice">Trạng thái: <b>'+(farm.enabled?'ĐANG CHẠY · '+esc(farm.phase):'ĐÃ DỪNG')+
  '</b> · '+farm.runs+'/'+farm.maxRuns+' trận · thắng '+farm.wins+' · không thắng '+farm.losses+
  (farm.heroName?' · 🧙 '+esc(farm.heroName):'')+(farm.reason?' · '+esc(farm.reason):'')+'</p>'+
  last+
  '<h3>🧙 Các tướng cùng vào MỘT trận Boss · tối đa 2 stack / người</h3>'+
  '<div class="grid grid3">'+Array.from({length:3},(_,i)=>{
   const suggested=hg261Draft?hg261Draft[i]:farm.team?.[i]?.heroId??state.heroes.filter(h=>E.hg20HeroRole(state,h.id).status==='home'&&E.hg20HeroPlan(state,h.id).length).slice(0,3)[i]?.id;
   const hero=state.heroes.find(h=>h.id===suggested);
   const troops=hero?E.hg20HeroPlan(state,hero.id):[];
   const slots=Array.from({length:2},(_,j)=>'<label>Stack '+(j+1)+
    '<select id="hg261_slot_'+i+'_'+j+'" '+(farm.enabled?'disabled':'')+'>'+
    '<option value="">— Trống —</option>'+
    troops.map((g,k)=>'<option value="'+k+'" '+(j===k?'selected':'')+'>'+
      esc(E.getUnit(state,g.unitId)?.name||g.unitId)+' ×'+format(g.count)+'</option>').join('')+
    '</select></label>').join('');
   return '<div class="card"><label>Tướng '+(i+1)+'<select id="hg261_team_'+i+'" '+(farm.enabled?'disabled':'')+'>'+
    '<option value="">— Không tham gia —</option>'+
    state.heroes.map(h=>'<option value="'+h.id+'" '+(h.id===suggested?'selected':'')+
     (E.hg20HeroRole(state,h.id).status==='home'?'':' disabled')+' class="'+hg408QualityClass(h)+'">'+
      esc(h.name)+' · '+E.hg20HeroPlan(state,h.id).length+' nhóm đã phân</option>').join('')+
    '</select></label>'+slots+'</div>';
  }).join('')+'</div>'+
  '<div class="actions">'+button('hg261-roster-refresh',{},'↻ Cập nhật ô quân sau khi chọn tướng',farm.enabled,'small secondary')+'</div>'+  '<p class="tiny muted">Ba tướng xuất chinh chung, tạo tối đa sáu stack có chủ riêng trong CÙNG một chiến trường; quân và AP bị trừ một lần theo đoàn. Chọn tướng đã có quân ở màn hình Quân đội; không luân phiên tướng.</p>'+
    '<div class="grid grid2"><label>Boss mục tiêu<select id="hg26_boss" '+(farm.enabled?'disabled':'')+'>'+
  [...bosses].sort((a,b)=>a.eliteTier-b.eliteTier||a.distance-b.distance).map(b=>
   '<option value="'+esc(b.key)+'" '+(chosen===b.key?'selected':'')+'>'+
   esc(b.name)+' · '+(b.privateBoss?'private · ':'')+b.stars+'★ · '+b.distance+' ô</option>').join('')+
  '</select></label>'+
  entry('Số trận tối đa','hg26_max_runs',defaults.maxRuns,1,100)+
  entry('Giữ lại AP tối thiểu','hg26_keep_ap',defaults.keepAP,0,1000)+
  entry('Quân tối thiểu','hg26_min_units',defaults.minUnits,1,100000000)+
  entry('Tỷ lệ quân theo mẫu (%)','hg26_coverage',defaults.minCoverage,1,100)+
  entry('Tổn thất cho phép (%)','hg26_loss',defaults.maxLossPercent,0,100)+'</div>'+
  '<div class="entry">'+
  check('Chữa thương thật qua Arena','hg26_heal',defaults.autoHeal)+
  check('Tự tuyển quân thiếu có trả phí','hg26_recruit',defaults.autoRecruit)+
  check('Dừng khi không thắng','hg26_stop_loss',defaults.stopOnLoss)+'</div>'+
  '<div class="actions">'+button('hg26-start',{},'▶ Bật săn Boss tự động',farm.enabled||!bosses.length||!!state.march||!!state.expedition||!!state.battle,'primary')+
  button('hg26-stop',{},'■ Dừng săn Boss',!farm.enabled,'secondary')+'</div>'+
  '<p class="tiny muted">Bot chỉ hoạt động khi trò chơi đang mở. Nếu dừng giữa chuyến, đạo quân đang đi vẫn cần hoàn thành lượt và trở về theo hệ thống thật. Không tự phát thắng hoặc loot. Bản lưu v07 giữ tiến độ; mở lại sẽ tiếp tục khi chính sách còn bật.</p></section>';
}
function hg24AutomationView(){
 const hero=state.heroes.find(h=>h.id===state.activeHero),duty=E.hg20HeroRole(state,state.activeHero),
  data=E.hg24Status(state),template=data.template,ready=duty.status==='home',
  canDrill=ready&&hero.level<100&&data.drillsLeft>0&&E.canAfford(state,data.drillCost);
 const listed=template?template.groups.map(g=>esc(E.getUnit(state,g.unitId)?.name||g.unitId)+' ×'+format(g.count)).join(' · '):'Chưa lưu';
 return '<section class="card hg24-controls" aria-label="Tự động hóa private HG24">'+
 '<h2>⚙ Điều binh tự động & tu luyện</h2>'+
 '<p class="hint">Mẫu của <b>'+hg408HeroNameHTML(hero)+'</b> tại '+esc(state.activeCityId||'main')+
 '. Giữ nguyên quân của tướng khác; tự tuyển chỉ khi chủ động bật và đủ tài nguyên, nhà tuyển và điều kiện binh chủng.</p>'+
 '<p class="tiny muted">Mẫu: '+listed+'</p>'+
 '<div class="actions">'+
 button('hg24-save-template',{},'💾 Lưu đội hình mẫu',!ready||!E.hg20HeroPlan(state,state.activeHero).length,'small primary')+
 button('hg24-apply-template',{},'↺ Bù quân từ kho',!ready||!template,'small secondary')+
 button('hg24-replenish',{},'⚒ Bù quân + tuyển thiếu',!ready||!template,'small secondary')+'</div>'+
 (template?'<div class="entry"><label><input id="hg24_auto_fill" type="checkbox" '+(template.autoFill?'checked':'')+'> Tự bù quân khi ở thành</label>'+
 '<label><input id="hg24_auto_train" type="checkbox" '+(template.autoTrain?'checked':'')+'> Tự tuyển quân thiếu (có chi phí)</label>'+
 button('hg24-policy',{},'✓ Lưu chính sách',!ready,'small secondary')+'</div>':'')+
 '<h3>☠ Chọn đội săn Boss</h3><p class="hint">Đề xuất tướng còn ở thành có quân phù hợp; bấm chuẩn bị để xem mục tiêu trên bản đồ hoặc xuất chinh ngay. Không tự đánh và không lấy quân của tướng khác.</p>'+
 '<div class="actions">'+button('hg24-boss-prepare',{},'🎯 Chọn tướng + Boss',!ready||!!state.march||!!state.battle,'small secondary')+
 button('hg24-boss-dispatch',{},'⚔ Xuất chinh săn Boss',!ready||!!state.march||!!state.battle,'small primary')+'</div>'+
 '<h3>📈 EXP và tài nguyên private</h3>'+
 '<p class="hint">Huấn luyện trả tài nguyên: +'+format(data.drillExp)+' EXP · còn '+data.drillsLeft+'/5 lượt hôm nay · '+money(data.drillCost)+
 '. Thu hoạch 1 lần/ngày khi có mỏ đã chiếm: '+data.mineCount+' mỏ đang sở hữu.</p>'+
 '<div class="actions">'+button('hg24-drill',{},'📚 Huấn luyện tướng',!canDrill,'small primary')+
 button('hg24-harvest',{},'⛏ Thu hoạch mỏ + EXP',!data.harvestAvailable,'small secondary')+'</div>'+
 '<p class="tiny muted">Đã săn thắng '+format(data.bossWins)+' Boss private trong hành trình; thắng Boss 9★+ cho thêm EXP và tài nguyên thực tế.</p></section>';
}
function bossView(){
 if(!window.HOG_HG42_SCREEN?.render)throw Error('Thiếu mô-đun màn Boss HG42');
 return window.HOG_HG42_SCREEN.render(state,E,
  {esc,format,button,lootText:hg409LootText,hunt:hg26AutohuntView},
  {screen:hg42BossScreen,tier:hg42BossTier});
}
function towerView(){
 const status=E.hg20TowerStatus(state),c=state.hg20.collection,castle=E.hg20CastleStatus(state),picks=E.hg21TowerPicks(state),purpleBoss=E.hg409Preview('tower','',status.floor,status.floor);
 const teamOptions=selected=>'<option value="">— Không chọn —</option>'+state.heroes.map(h=>{
  const duty=E.hg20HeroRole(state,h.id);
  return '<option value="'+h.id+'" '+(selected===h.id?'selected':'')+' '+(duty.status==='home'?'':'disabled')+' class="'+hg408QualityClass(h)+'">'+esc(h.name)+' · Lv.'+h.level+' · '+esc(duty.label)+'</option>';
 }).join('');
 const ready=E.hg21TowerReadiness(state);
 let strength='Chưa đủ quân';if(ready.ready){try{strength=format(E.hg20TowerPower(state).power)}catch(_){}}
 const troop=C.rewardUnits[state.race].find(u=>u.towerExclusive),owns=state.army[troop.id]||0;
 const slots=picks.map((entry,i)=>{
  const hero=state.heroes.find(h=>h.id===entry.heroId),formation=E.hg20HeroPlan(state,entry.heroId);
  const dropdown=j=>'<label>Đội '+(j+1)+'<select id="hg21_slot_'+i+'_'+j+'"><option value="">Không mang</option>'+formation.map((g,k)=>'<option value="'+k+'" '+(entry.slots[j]===k?'selected':'')+'>'+esc(E.getUnit(state,g.unitId)?.name||g.unitId)+' ×'+format(g.count)+' · ô '+(k+1)+'</option>').join('')+'</select></label>';
  return '<section class="hg28-tower-hero"><header><span>🧙</span><b>'+hg408HeroNameHTML(hero)+'</b><small>2 đội riêng</small></header><div class="hg28-tower-slots">'+dropdown(0)+dropdown(1)+'</div></section>';
 }).join('');
 return `<section class="hg28-tower-view"><header class="hg28-tower-title"><div><span class="eyebrow">BÍ CẢNH · CHIẾN THUẬT</span><h1>🗼 Tháp tầng ${format(status.floor)}</h1></div><div class="hg28-tower-badges"><span>🎁 ${status.rewardLeft}/5 lượt thưởng</span><span>⚔ ${strength}</span><span class="hg408-quality-purple">♜ Địch TÍM CS${purpleBoss.cs}/10 · Lv100 B5</span></div></header>
 <div class="hg409-tower-reward">☠ Tướng địch 100/100/100/100, CS${purpleBoss.cs}: HP ×${purpleBoss.boost.hp}, ATK ×${purpleBoss.boost.atk}, DEF ×${purpleBoss.boost.def}. Thắng trong 5 lượt thưởng/ngày nhận thêm: ${esc(hg409LootText(purpleBoss))}.</div><div class="hg28-tower-layout"><section class="card hg28-tower-command"><div class="hg28-tower-enemy"><span class="hg28-tower-enemy-icon">👹</span><div><small>ĐỐI THỦ · ${esc(status.trait)}</small><h2>${esc(status.enemy)}</h2><b>${format(status.enemyPower)} lực chiến</b></div><span class="tag">Tầng ${format(status.floor)}</span></div>
 <div class="hg28-tower-team"><div class="hg28-tower-section-head"><h3>Chọn tối đa 3 tướng</h3><span class="tag">${status.team.length}/3</span></div><div class="hg28-hero-picker">${Array.from({length:3},(_,i)=>'<label><small>TƯỚNG '+(i+1)+'</small><select id="hg20_tower_'+i+'">'+teamOptions(status.team[i])+'</select></label>').join('')}</div>${button('tower-team',{},'✓ Lưu đội hình tướng',false,'small primary')}</div>
 <div class="hg28-tower-stack-panel"><div class="hg28-tower-section-head"><h3>Quân đi theo chủ tướng</h3><span class="hint">Tối đa 2 đội / tướng</span></div>${slots?'<div class="hg28-tower-heroes">'+slots+'</div>':'<div class="hg28-tower-empty">Chọn và lưu tướng để gán đội quân.</div>'}<div class="hg28-tower-actions">${button('tower-auto-assign',{},'⚔ Tự chia quân từ kho',!status.team.length,'secondary')}${button('tower-picks',{},'Lưu 2 đội / tướng',!picks.length,'secondary')}${button('tower-climb',{},'⚔ Thách đấu tầng '+format(status.floor),!ready.ready,'primary')}</div>
 <p class="hint" id="hg36-tower-readiness" aria-live="polite">${ready.ready?'✓ '+format(ready.heroes)+' tướng · '+format(ready.stacks)+' đội · '+format(ready.units)+' quân thật sẵn sàng':esc(ready.reason)+' · Chọn Tự chia quân từ kho hoặc phân quân trong Quân đội.'}</p></div>
 ${status.last?'<div class="hg28-tower-last">'+(status.last.outcome==='win'?'🏆 Thắng':'🛡 Thất bại')+' tầng '+format(status.last.floor)+' · '+format(status.last.teamPower)+' / '+format(status.last.enemyPower)+' lực chiến · thưởng tinh hoa +'+format(status.last.rewardEssence)+'</div>':''}</section>
 <aside class="hg28-tower-rewards"><section class="card"><span class="eyebrow">TIẾN ĐỘ VÔ HẠN</span><div class="hg28-essence"><span>✨</span><div><b>${format(status.essence)}</b><small>Tinh hoa · Thăng hoa ${format(status.rank)}</small></div></div><p class="hint">+18% sức mạnh đội Tháp mỗi cấp</p>${button('tower-upgrade',{},'⬆ Thăng hoa · '+format(status.upgradeCost),status.essence<status.upgradeCost,'small primary')}</section>
 <section class="card"><h3>🏰 Thành đặc biệt</h3><p>${c.citadel?'🔓 Thiên Ngoại Bí Thành':'🔒 Hoàn thành tầng 25'}</p><small>${esc(castle.worldCity)} · ${esc(castle.worldCityKey)} · ${castle.worldCityOwned?'Đã chiếm':'Thành AI có thể công chiếm'}</small></section>
 <section class="card"><h3>🎖 Quân sưu tầm</h3><p>${esc(troop.name)} ×${format(owns)}</p><small>Thưởng mốc tầng 10, 20, 30…</small></section>
 <section class="card"><h3>💎 Di vật Tháp</h3><p>${c.artifacts.length?c.artifacts.slice(-3).map(esc).join(' · '):'Chưa sở hữu'}</p><small>Thưởng mốc tầng 25, 50, 75…</small></section></aside></div>
 <details class="hg28-tower-help"><summary>Cách tính đội hình</summary><p>Tối đa 3 tướng, mỗi người mang tối đa hai stack. Chỉ số, trang bị và phép áp dụng theo đúng chủ tướng. Tháp không tiêu hao quân thật hoặc AP; hết năm lượt thưởng vẫn có thể luyện tập.</p></details></section>`;
}
function hg28ArmyUnitThumb(unit,size){
 if(unit.id==='human_1'&&typeof document!=='undefined'){
  const src=document.getElementById('hg28-battle-human-spear-militia')?.src||'';
  if(src.startsWith('data:image/webp;base64,'))return `<img class="hog-unit-thumb hg28-spear-militia-thumb" data-hg28-unit-image="human_1" src="${src}" width="${size}" height="${size}" alt="${esc(unit.name)}">`;
 }
 return A?.unitHTML(unit.id,size)||(unit.tier>=9?'🐉':unit.type==='Ranged'?'🏹':'⚔️');
}

function hg35RecruitQuote(unit,qty){
 const max=E.recruitMax(state,unit.id);
 if(!E.troopPrerequisites(state,unit).available||unit.rewardOnly||unit.towerExclusive)
  return 'Chưa thể tuyển quân này từ công trình · kiểm tra điều kiện mở khóa.';
 if(max===0)return 'Chưa đủ tài nguyên để tuyển 1 quân; không phát sinh chi phí.';
 if(!Number.isSafeInteger(qty)||qty<1)return 'Nhập số nguyên ≥1 · tối đa có thể trả: '+format(max)+' quân.';
 if(qty>max)return 'Chưa đủ tài nguyên cho '+format(qty)+' quân. Tối đa thực trả: '+format(max)+'.';
 const cost=E.recruitCost(state,unit,qty),seconds=E.recruitDuration(state,unit,qty),
  ahead=state.training.reduce((sum,job)=>sum+job.remaining,0);
 const spend=C.keys.filter(k=>cost[k]>0).map(k=>C.resource[k].label+' -'+format(cost[k])+
  ' (còn '+format(state.res[k]-cost[k])+')').join(' · ');
 return 'TRỪ KHI TUYỂN '+format(qty)+' quân: '+spend+
  ' · Huấn luyện lô này ~'+format(Math.ceil(seconds/state.speed))+' giây thực (×'+state.speed+')'+
  ' · Hoàn tất sau ~'+format(Math.ceil((ahead+seconds)/state.speed))+' giây thực, gồm hàng chờ trước.';
}
function hg35RecruitDraftQty(unit,maxQty){
 const saved=recruitDrafts.get(unit.id);
 if(!Number.isSafeInteger(saved)||saved<1)return Math.min(3,Math.max(1,maxQty));
 const qty=Math.min(saved,Math.max(1,maxQty));
 if(qty!==saved)recruitDrafts.set(unit.id,qty);
 return qty;
}
function hg35UpdateRecruitQuote(id){
 const unit=state&&E.getUnit(state,id),input=$('q_'+id),preview=$('pay_'+id);
 if(!unit||!input||!preview)return;
 const qty=Number(input.value),max=E.recruitMax(state,id),unlocked=E.troopPrerequisites(state,unit).available&&!unit.rewardOnly&&!unit.towerExclusive;
 preview.textContent=hg35RecruitQuote(unit,qty);
 const recruit=document.querySelector('[data-action="recruit"][data-id="'+id+'"]');
 if(recruit)recruit.disabled=!unlocked||!Number.isSafeInteger(qty)||qty<1||qty>max;
 const meta=$('max_'+id);
 if(meta)meta.textContent='Tuyển tối đa ('+format(max)+')';
}
function armyView(){
 const hg43Navigation='<nav class="hg43-army-nav" aria-label="Trang quân đội">'+
  button('hg43-army-page',{page:'recruit'},'⚒ Tuyển quân & bố trí',false,hg43ArmyPage==='recruit'?'small primary':'small secondary')+
  button('hg43-army-page',{page:'codex'},'📖 Hồ sơ 40 quân',false,hg43ArmyPage==='codex'?'small primary':'small secondary')+'</nav>';
 if(hg43ArmyPage==='codex'){
  focusArmyRecruitOnOpen=false;
  return hg43Navigation+U43.codex(hg43ArmyRace,u=>hg28ArmyUnitThumb(u,64));
 }
 const formations=state.formation?.length?state.formation:[];
 const troopBuilding=E.troopBuildingKey(state),troopBuildingName=C.buildings[troopBuilding].name;
 const opt=(sel)=>`<option value="">— Để trống —</option>${E.arrUnits(state).map(u=>`<option value="${u.id}" ${sel===u.id?'selected':''}>${esc(u.name)} (${Math.max(0,(state.army[u.id]||0)-(E.hg20Reservations(state,state.activeHero)[u.id]||0))} còn có thể cấp)</option>`).join('')}`;
 const townTroops=E.arrUnits(state).reduce((n,u)=>n+(state.army[u.id]||0),0),
  pendingTroops=state.training.reduce((n,q)=>n+q.count,0);
 // Train jobs run sequentially; prefix sums are both accurate and linear.
 let queuedGameSeconds=0;
 const queueEtaReal=state.training.map(q=>Math.ceil((queuedGameSeconds+=q.remaining)/state.speed));
 return hg43Navigation+`<div class="hg28-army-main"><h1>🛡 ${esc(troopBuildingName)} · Lv.${state.buildings[troopBuilding]}</h1>
 <p class="hg35-garrison-info">${esc(C.races[state.race].name)} · <b>${format(townTroops)} quân trong thành</b> · ${format(pendingTroops)} đang tuyển. <b>Không áp dụng giới hạn chỉ huy cho kho quân.</b> Chỉ quân đem đi đánh mới phải tuân thủ sức chứa của từng tướng.</p>
 ${state.training.length?`<div class="banner"><b>Hàng đợi tuyển quân</b> ${state.training.map((q,i)=>`<div>⌛ ${i+1}. ${q.count} ${esc(E.getUnit(state,q.unitId).name)} · ${queueEtaReal[i]} giây thực đến khi xong</div>`).join('')} </div>`:''}
 <details class="hg28-army-ops hg28-army-quest" ${armyQuestOpen?'open':''}><summary>🎖 Nhiệm vụ đổi quân vô hạn · giai đoạn ${Math.max(0,Number(state.hg30?.stage)||0)}/3</summary>${hg30QuestView()}</details>
 <div class="grid grid2" style="margin-top:12px">${E.arrUnits(state).map(u=>{const unlock=E.troopPrerequisites(state,u),unlocked=unlock.available&&!u.rewardOnly&&!u.towerExclusive,maxQty=E.recruitMax(state,u.id),defaultQty=hg35RecruitDraftQty(u,maxQty),cost=E.recruitCost(state,u,1),checks=unlock.checks.map(c=>{const label=c.kind==='building'?C.buildings[c.key]?.name||c.key:c.key==='bootcamp'?'Bootcamp (Huấn luyện)':c.key==='manufacturing'?'Manufacturing (Chế tạo)':`Phép ${C.spells[c.key]?.vi||c.key}`;return `${esc(label)} ${c.actual}/${c.level}`}).join(' · '),confidence=unlock.status==='OBSERVED'?'Đối chiếu bảng Human trong hướng dẫn Trung Quốc 2009 và xác nhận chéo 2010':unlock.status==='SECONDARY'?(unlock.source==='SRC26'?`SRC26: gate Thunderbird lấy từ bảng thứ cấp; chỉ số khớp catalog 2009 nhưng chưa đối chiếu client gốc`:`SRC28: bài 17173 năm 2010 nêu Centaur tuyển ở Barracks cấp 1; chưa đối chiếu client gốc`):unlock.status==='PARTIAL_SCOUT_HALL_GATE'?`SRC27 (Trung Quốc 2009): Barracks 2 + Scouting 1; Town Hall riêng chưa xác minh; phép Scouting đối chiếu SRC04 (wiki Anh 2009)`:unlock.status==='DERIVED_SCOUT_GATE'?`Vai trò trinh sát và Scouting 1 được đối chiếu chéo phiên bản; Town Hall riêng cho Scout chưa xác minh`:unlock.status==='DERIVED_TROOP_BUILDING_TIER'?(u.race==='undead'?(u.tier===2?`SRC02 + SRC11: Graveyard cấp cao mở quân cấp cao; ánh xạ cấp nhà = bậc quân là B* suy luận, chưa có bảng từng quân. Scouting đối chiếu chéo SRC22 (Trung Quốc 2010) và SRC04 (wiki tiếng Anh 2009)`:`SRC02 + SRC11: Graveyard cấp cao mở quân cấp cao; ánh xạ cấp nhà = bậc quân là B* suy luận, chưa có bảng từng quân`):u.tier===2?`SRC02 + SRC03 + SRC11: suy luận B* theo bậc ${troopBuildingName}; Scouting đối chiếu chéo SRC22 (Trung Quốc 2010) và SRC04 (wiki tiếng Anh 2009); cổng phụ chưa xác minh`:`SRC02 + SRC03 + SRC11: suy luận B* theo bậc đơn vị ${troopBuildingName}; chưa xác minh từng cổng phụ gốc`):unlock.status==='MODELED_SCOUT_PROXY'?`MÔ HÌNH TẠM: ${troopBuildingName} cấp 2 chưa có bảng gốc xác nhận; Scouting 1 được đối chiếu vai trò trinh sát (Trung Quốc 2010, wiki tiếng Anh 2009)` :unlock.status==='MODELED_TIER_PROXY'?`MÔ HÌNH TẠM: ${troopBuildingName} cấp ${u.tier} theo bậc quân; không phải số liệu lịch sử đã xác minh`:`Đã xác minh ${troopBuildingName} là nhà tuyển quân; cổng phụ từng đơn vị của chủng tộc còn thiếu nguồn`;return `<div class="card unitrow"><div><div class="heading">${hg28ArmyUnitThumb(u,56)} ${esc(u.name)} <span class="tag">Bậc ${u.tier}</span><span class="tag">${unlock.confidence}</span></div><div class="hint">${u.type} · HP ${u.hp} · ATK ${u.atk} · DEF ${u.def} · SPD ${u.spd} · Tầm ${E.unitTacticalRange(u)} ô · Hành quân ×${Math.max(.8,Math.min(1.10,.8+u.spd/40)).toFixed(2)}</div>${U43.card(u,{compact:true})}<div>Quân trong thành <b class="key">${state.army[u.id]||0}</b> · ~${Math.ceil(E.recruitDuration(state,u,1)/state.speed)}s thực/lính (tuyển nhanh ×100)</div><details class="hg28-unit-evidence"><summary>Điều kiện & nguồn</summary><small>Điều kiện: ${checks}</small><small>${confidence}</small></details><div class="cost" title="Giá 1 quân tính theo công thức engine thực tế">Giá 1: ${money(cost)}${u.tier>=9&&(state.buildings.blacksmith||0)>=8&&(state.spells.manufacturing||0)>=6?' · ⚒ Hiệu suất tinh nhuệ':''}</div>
 <div class="hg35-recruit-preview" id="pay_${u.id}" aria-live="polite">${esc(hg35RecruitQuote(u,defaultQty))}</div></div>
 <div class="entry hg35-recruit-controls">
 <label for="q_${u.id}">Số lượng</label><input id="q_${u.id}" aria-label="Số lượng ${esc(u.name)}" type="number" inputmode="numeric" min="1" max="${Math.max(1,maxQty)}" value="${defaultQty}">
 ${button('recruit-max',{id:u.id},'Tuyển tối đa ('+format(maxQty)+')',!unlocked||maxQty<1,'small secondary')}
 ${button('recruit',{id:u.id},unlocked?'Tuyển · trừ tài nguyên':'🔒',!unlocked||maxQty<1,'primary')}</div></div>`}).join('')}</div><div class="card"><h2>⚔ Bố trí quân theo nhóm</h2><p class="hint">Điểm chỉ huy của đội hình tướng đang chọn: <b>${format(E.formationPoints(state,formations))}</b> / <b>${format(E.heroLimit(state.heroes.find(h=>h.id===state.activeHero)?.level||1,state.heroes.find(h=>h.id===state.activeHero)))}</b> điểm chỉ huy (CS1–CS5 nhân đôi sau mỗi lần chuyển sinh, giữ mốc Lv100 khi về Lv1). </p><details class="hg28-provenance"><summary>Giới hạn đội hình</summary><p class="hint">Có thể tách MỘT binh chủng ra NHIỀU slot độc lập. Tối đa 7 stack cho tướng, bố trí hai cột đầu quân ta: 4 slot hậu quân x=0 và 3 slot tiền quân x=1; phía địch bắt đầu ở x=10–11. Số quân còn lại vẫn ở thành.</p></details><div class="formation-grid">${Array.from({length:7},(_,i)=>`<div class="formation-slot ${i<4?'formation-back':'formation-front'}"><span class="tag" title="${i<4?'Hậu quân: x=0':'Tiền quân: x=1'} · Mỗi stack chịu giới hạn tổng điểm chỉ huy">${i<4?'⬅ Hậu':'➡ Tiền'} ${i<4?i+1:i-3}</span><select id="formation_unit_${i}" aria-label="Binh chủng nhóm ${i+1}">${opt(formations[i]?.unitId)}</select><input type="number" min="0" max="100000000" title="Không giới hạn cố định theo stack; số lượng chịu sức chứa chỉ huy và số quân đang có" aria-label="Số quân nhóm ${i+1}" id="formation_count_${i}" value="${formations[i]?.count||0}"></div>`).join('')}</div>${button('formation',{},'✓ Lưu đội hình',!!state.battle||!!(state.march&&state.march.phase!=='outbound'),'primary')} ${button('autoformation',{},'⚔ Bố trí quân nhanh',!!state.battle||!!(state.march&&state.march.phase!=='outbound')||!E.activeArmy(state).length,'secondary')} <small class="muted">Bố trí nhanh ưu tiên quân bậc cao trong giới hạn chỉ huy; có thể chỉnh thủ công bất cứ lúc nào.</small></div>
 </div><details class="hg28-army-ops" ${armyOpsOpen?'open':''}><summary>🧙 Điều binh · tự động hóa · săn Boss</summary>${heroArmyCommandView()}${hg24AutomationView()}${hg26AutohuntView()}</details>`;
}
function heroesViewBase(){const injured=Object.entries(state.wounded).filter(([,n])=>n>0),injuryText=injured.length?injured.map(([id,n])=>`${esc(E.getUnit(state,id)?.name||id)}: ${n}`).join('<br>'):'Không có quân bị thương.';const arena=state.arenaQueue,arenaUnit=arena?E.getUnit(state,arena.unitId):null,arenaCost=injured.length&&!arena?E.arenaHealCost(state,injured[0][0],injured[0][1]):0,heroCap=E.heroCountLimit(state.fame);return `<h1>🧙 Tướng lĩnh & Arena</h1><details class="hg28-provenance"><summary>📚 Giới hạn và nguồn tham chiếu</summary><p>Hero Tower, Castellan, Tavern và Arena là hệ thống Heroes of Gaia. Giới hạn số tướng theo bảng danh vọng Trung Quốc 2009: ${state.heroes.length}/${heroCap}. Giới hạn chỉ huy cơ bản theo bảng cộng đồng Lv1–100; chỉ số khởi điểm và chi phí tuyển vẫn được mô phỏng.</p></details><div class="grid grid2"><div><h2>Danh sách tướng</h2>${state.heroes.map(h=>`<div class="card"><div class="heading">🧙 ${esc(h.name)} <span class="tag">Lv.${h.level}</span><span class="tag">Chỉ huy ${format(E.heroLimit(h.level,h))}</span>${h.id===state.activeHero?'<span class="tag">Chỉ huy</span>':''}${h.id===state.castellan?'<span class="tag yellow">Castellan</span>':''}${state.stationedHeroes?.some(x=>x.heroId===h.id)?'<span class="tag yellow">Đồn trú ngoài bản đồ</span>':''}</div><div class="hint">ATK ${h.atk} · DEF ${h.def} · SPD ${h.spd} · INT ${h.int} · EXP ${h.xp}</div><div class="entry">${button('hero',{id:h.id},'Chọn chỉ huy',h.id===state.castellan||E.heroAway(state,h.id)||!!state.battle||!!(state.march&&state.march.phase!=='outbound'),'small secondary')}${button('castellan',{id:h.id},h.id===state.castellan?'Bỏ Castellan':'Bổ nhiệm',E.heroAway(state,h.id)||!!state.march||!!state.battle,'small secondary')}${button('recall',{id:h.id},'↩ Gọi về',!state.stationedHeroes?.some(x=>x.heroId===h.id)||!!state.march||!!state.battle||!!state.expedition,'small primary')}</div></div>`).join('')}<div class="hr"></div><h3>🍺 Tavern — Ứng viên tướng</h3><details class="hg28-provenance"><summary>📊 Cập nhật & xác suất Tavern</summary><p class="hint">Tự làm mới mỗi 60 phút game (SRC48). Cấp 6–9 mô phỏng một ứng viên tên xanh mỗi lượt theo ghi nhận “gần như luôn có”; xác suất gốc chưa rõ. Cấp 10 có 8 ứng viên/giờ (SRC21); mỗi chỉ số dùng mẫu cộng đồng: 98,03% trong 20–50, 1,94% trong 51–60, 0,03% trong 61–70. Đây không phải xác suất server. Chất lượng cấp thấp và giá tuyển chưa xác minh.</p></details><p class="muted tiny">Cấp ${state.buildings.tavern} · ${state.tavern.offers.length} ứng viên còn lại · ${Math.ceil(state.tavern.remaining/state.speed)} giây thực tới lượt làm mới</p><div class="tavern-offers">${state.tavern.offers.length?state.tavern.offers.map(o=>`<div class="card"><b>${esc(o.name)}</b> <span class="tag">${o.quality.toUpperCase()}</span><p class="tiny muted">Hero value ${o.heroValue} · ATK ${o.atk} (${o.statColors?.atk||'?'}) · DEF ${o.def} (${o.statColors?.def||'?'}) · SPD ${o.spd} (${o.statColors?.spd||'?'}) · INT ${o.int} (${o.statColors?.int||'?'})</p>${button('hirecandidate',{id:o.id},'Tuyển · '+format(o.gold)+' vàng',state.heroes.length>=heroCap||!E.canAfford(state,{gold:o.gold}),'small secondary')}</div>`).join(''):'<p class="hint">Đã tuyển hết ứng viên trong lượt này.</p>'}</div></div><div><h2>⚕ Arena · Bệnh xá</h2><div class="card">${injuryText}<details class="hg28-provenance"><summary>⚕ Tốc độ hồi phục & nguồn</summary><p class="hint">Nguồn Trung Quốc 2009 ghi 60–80% lính tổn thất thành thương binh, cứu chữa ở Arena bằng 1/7 giá trị quân bằng vàng và với tốc độ khoảng 3/5 tốc độ tuyển. Tỷ lệ 75% trong engine là mô hình điểm giữa. Wiki cộng đồng ghi Reincarnation pre-Babel giảm 1% thời gian mỗi cấp khi Castellan thủ thành (C).</p></details>${arena?`<div class="banner"><b>Đang điều trị:</b> ${arena.count} ${esc(arenaUnit?.name||arena.unitId)} · còn ${Math.ceil(arena.remaining/state.speed)} giây thực${arena.reincarnationLevel?` · Reincarnation -${arena.reincarnationLevel}%`:''}</div>`:''}${button('heal',{},arena?'Arena đang bận':`💚 Điều trị lượt đầu · ${format(arenaCost)} vàng`,!!arena||!injured.length||!E.canAfford(state,{gold:arenaCost}))}</div><div class="hr"></div><h2>📍 Tác vụ tướng</h2><p class="hint">Tướng là điều kiện bắt buộc để điều quân. Castellan gắn với thành đang mở; quân viễn chinh và quân đồn trú được theo dõi riêng.</p></div></div>`;}
function magicViewBase(){return `<h1>🔮 Magic Tower · Lv.${state.buildings.magicTower}</h1><details class="hg28-provenance"><summary>📜 Nguồn, chi phí và mô hình</summary><p class="hint">Tên và hiệu ứng chín Castle Spells đối chiếu wiki 2009. Toàn bộ nghiên cứu dùng một hàng đợi thật; chi phí và thời lượng đang mô phỏng. Hero Spells chiến đấu là hệ riêng.</p><p class="hint">SRC49 (17173, 2009) xác nhận Castellan nhận EXP khi nghiên cứu hoàn tất. Lượng EXP xây/nghiên cứu trong bản này dùng định giá tài nguyên/3 từ SRC17 như một mô hình C, không phải công thức gốc đã xác minh. Chi phí xây dựng/nghiên cứu còn mô phỏng. Bonus Hero Tower được áp dụng.</p></details><div class="grid grid3">${Object.entries(C.spells).filter(([id])=>!['manufacturing','bootcamp'].includes(id)).map(([id,s])=>{const level=state.spells[id]||0,cost=E.spellCost(state,id),queued=state.researchQueue?.key===id;return `<div class="card"><div class="heading">✨ ${s.name}</div><div class="tag">Cấp ${level}</div><p class="hint">${s.res?`+${s.base} ${C.resource[s.res].label} cơ bản + ${s.rate*100}%/cấp`:s.capacity?'+5% giới hạn kho/cấp':s.goldDiscount?'-2% vàng tuyển quân/cấp':s.time?`-${s.time*100}% thời gian/cấp`:s.effect||'Đang xác minh'}</p><div class="cost">${money(cost)}</div>${button('learn',{id},queued?'Đang nghiên cứu':'Nghiên cứu',!!state.researchQueue||!(level<state.buildings.magicTower&&E.canAfford(state,cost)))}</div>`}).join('')}</div>`}
// HG-04: Hero equipment, race-specific researched spells, quests and functional bazaar/market.
function itemName(uid){const f=state.inventory.find(i=>i.uid===uid);return f?E.ITEMS[f.itemId]?.name||'—':'Trống';}
function heroProgression(){
 const labels={atk:'ATK',def:'DEF',spd:'SPD',int:'INT'};
 return `<section class="card hg08-section"><span class="eyebrow">HERO PROGRESSION</span><h2>📈 Kinh nghiệm và thuộc tính</h2><p class="hint">Ngưỡng EXP và 1 điểm thuộc tính mỗi cấp theo bảng cộng đồng Heroes of Gaia. Hero Tower cấp ${E.heroTowerExperienceBonus(state)} tăng ${E.heroTowerExperienceBonus(state)}% EXP gốc (SRC03); HG18.2 thêm thưởng thám hiểm x${E.hg182CombatXpPreview(state,8,false).campaignFactor.toFixed(2)} cho NPC 8★ (mô hình riêng), cộng thưởng khám phá lần đầu. Nghiên cứu Trinh sát cấp ${state.spells.scouting||0} giảm AP xuất chinh tới NPC 4★+ (tối đa 3 AP). EXP hạ NPC 4★–8★ dùng bảng hướng dẫn Trung Quốc 2009 (SRC45); 1★–3★ và thưởng mục tiêu thành/mỏ vẫn là mô hình. SRC49 xác nhận Castellan nhận EXP khi hoàn tất huấn luyện, xây dựng và nghiên cứu; lượng EXP xây/nghiên cứu áp dụng định giá tài nguyên/3 từ SRC17 (C), không phải công thức gốc đã xác minh. Chi phí xây dựng/nghiên cứu còn mô phỏng.</p><div class="grid grid2">${state.heroes.map(hero=>{const need=E.experienceToNext(hero.level),progress=need===null?1:Math.min(need,hero.xp);return `<div class="card"><div class="heading">${esc(hero.name)} · Lv.${hero.level} · ${Math.floor(hero.xp).toLocaleString('vi-VN')}${need===null?' EXP tối đa':' / '+need.toLocaleString('vi-VN')+' EXP'}</div>${need===null?'':`<progress max="${need}" value="${progress}"></progress>`}<p class="hint">Điểm chưa dùng: <b>${hero.statPoints||0}</b> · ATK ${hero.atk} · DEF ${hero.def} · SPD ${hero.spd} · INT ${hero.int}</p><div class="entry">${Object.entries(labels).map(([key,label])=>button('heropoint',{id:hero.id,stat:key},`+1 ${label}`,!(hero.statPoints>0)||!!state.march||!!state.battle,'small secondary')).join('')}</div></div>`}).join('')}</div></section>`;
}
function equipmentBattleText(item){
 const rows=[];
 if(item.meleeDamage)rows.push(`⚔ cận chiến +${Math.round(item.meleeDamage*100)}% DMG`);
 if(item.rangedDamage)rows.push(`🏹 tầm xa +${Math.round(item.rangedDamage*100)}% DMG`);
 if(item.damageBonus)rows.push(`⚡ tổng sát thương +${Math.round(item.damageBonus*100)}%`);
 if(item.damageReduction)rows.push(`🛡 sát thương nhận -${Math.round(item.damageReduction*100)}%`);
 return rows.join(' · ');
}

function hg46GearView(h){
 const slots=state.equipment[h.id]||{},busy=!!(state.march||state.battle||state.expedition||state.parallelMarches?.length||state.hg26?.enabled||E.heroAway(state,h.id));
 const sets=E.hg46Sets(state,h.id);
 const modes=[['balanced','⚖ Cân bằng'],['attack','⚔ Công'],['defense','🛡 Thủ']];
 const names=Object.fromEntries(E.HG47_SLOTS.map(([key,label])=>[key,label]));
 const setsById={...E.HG18_SETS,...E.HG31_SETS,...E.HG47_SETS};
 const icon=row=>{
  const item=E.ITEMS[row.itemId];
  return E.hg47IconHTML?.(item.id,54)||E.hg31IconHTML?.(item.id,54)||ico(item.id,50)||item.icon||'◆';
 };
 const worn=E.HG47_SLOTS.map(([slot])=>{
  const row=state.inventory.find(i=>i.uid===slots[slot]),def=row&&E.ITEMS[row.itemId];
  const kind=row?E.hg46Kind(row):'empty',p=row?E.hg46Stats(row):null;
  const attrs=p?['atk','def','spd','int'].filter(k=>p[k]>0).map(k=>k.toUpperCase()+' +'+p[k]).join(' · '):'Chưa có trang bị';
  return '<article class="hg46-slot hg408-slot hg46-kind-'+kind+'" data-hg46-slot="'+slot+'">'+
   '<div class="hg46-slot-head"><b>'+esc(names[slot])+'</b><small>'+ (row?'+'+(row.enhance||0)+' cường hóa':'Trống')+'</small></div>'+
   '<div class="hg46-slot-content"><div class="hg46-gear-art">'+(row?icon(row):'◇')+'</div>'+
   '<div><strong>'+esc(def?.name||'Chưa trang bị')+'</strong><small>'+esc(attrs)+'</small>'+(row?hg63GearDetails(row,setsById):'')+ (row&&E.hg47Affixes(row).length?'<small class="hg47-affix">'+esc(E.hg47Affixes(row).map(x=>x.label).join(' · '))+'</small>':'')+
   (def?.set?'<small class="hg46-set-tag">'+esc(setsById[def.set]?.name||def.set)+'</small>':'')+
   '</div></div>'+
   (row?button('hg408-unequip',{id:h.id,slot},'Tháo trang bị',busy,'small secondary'):'')+
   '</article>';
 }).join('');
 // HG47 performance: never run 3 ten-slot searches on every UI repaint.
 // The actual bounded planner runs only when the user clicks a build mode.
 const buildChoices=modes.map(([id,label])=>button('hg46-auto',{id:h.id,mode:id},
  '⚒ '+label,!E.hg20HeroRole||busy||E.hg20HeroRole(state,h.id).status!=='home',
  'small '+(id==='balanced'?'primary':'secondary'))).join('');
 const setProgress=sets.map(q=>'<div class="hg46-set-progress">'+
  '<strong>'+esc(q.name)+'</strong><span>'+q.count+'/'+(q.max||3)+'</span>'+
  '<div class="hg46-progress-pips">'+Array.from({length:q.max||3},(_,i)=>'<i class="'+(q.count>i?'filled':'')+'"></i>').join('')+'</div>'+
  '<small>'+esc(q.note)+'</small></div>').join('');
 const inventory=state.inventory.filter(i=>E.ITEMS[i.itemId]&&(hg46GearFilter==='all'||E.ITEMS[i.itemId].slot===hg46GearFilter));
 const tiers={divine:7,star:6,rare:5,dragon:4,astral:3,sentinel:2,common:1};
 inventory.sort((a,b)=>((tiers[E.hg46Kind(b)]||0)-(tiers[E.hg46Kind(a)]||0))||
  (b.enhance||0)-(a.enhance||0)||a.uid-b.uid);
 const pageSize=36,pages=Math.max(1,Math.ceil(inventory.length/pageSize));
 hg46GearPage=Math.min(hg46GearPage,pages-1);
 const visible=inventory.slice(hg46GearPage*pageSize,(hg46GearPage+1)*pageSize);
 const options=[['all','Tất cả'],...E.HG47_SLOTS.map(([key,name,icon])=>[key,icon+' '+name])];
 const filters=options.map(([key,label])=>button('hg46-filter',{slot:key},label+' '+(key==='all'?state.inventory.length:state.inventory.filter(i=>E.ITEMS[i.itemId]?.slot===key).length),
  key===hg46GearFilter,'small '+(key===hg46GearFilter?'primary':'secondary'))).join('');
 const rows=visible.map(row=>{
  const def=E.ITEMS[row.itemId],owner=E.hg46Owner(state,row.uid),self=owner?.heroId===h.id,
   elsewhere=owner&&!self,kind=E.hg46Kind(row),p=E.hg46Stats(row),next=E.hg46NextEnhance(state,row.uid);
  const raw=['atk','def','spd','int'].filter(k=>p[k]>0).map(k=>k.toUpperCase()+' +'+p[k]).join(' · ');
  const salvage=E.hg46SalvagePreview(state,row.uid);
  const battle=equipmentBattleText(def),source=owner?
    'Đang mặc: '+(state.heroes.find(x=>x.id===owner.heroId)?.name||'Tướng khác'):'Trong kho';
  const setName=setsById[def.set]?.name||'Thường';
  return '<article class="hg46-inventory-card hg46-kind-'+kind+'" data-hg46-uid="'+row.uid+'">'+
   '<div class="hg46-gear-art">'+icon(row)+'</div>'+
   '<div class="hg46-item-description"><b>'+esc(def.name)+' <span>+'+(row.enhance||0)+'</span></b>'+
   '<small class="hg46-origin">'+esc(setName)+' · '+esc(source)+' · UID '+row.uid+'</small>'+
   '<small>'+esc(raw||'Không có điểm thuộc tính')+'</small>'+hg63GearDetails(row,setsById)+
   (battle?'<small class="hg46-effect">'+esc(battle)+'</small>':'')+
   (E.hg47Affixes(row).length?'<small class="hg47-affix">Dòng phụ: '+esc(E.hg47Affixes(row).map(x=>x.label).join(' · '))+'</small>':'')+
   (next.level<10?'<small class="hg46-cost">Nâng +'+(next.level+1)+': '+next.stones+' đá + '+format(next.gold)+' vàng · 100% thành công</small>':
    '<small class="hg46-cost">Đã đạt cấp +10</small>')+
   '<small class="hg46-cost">Phân giải: +'+salvage.stones+' đá'+(salvage.astralShards?', +'+salvage.astralShards+' mảnh Tinh Vân':'')+'</small></div>'+
   '<div class="hg46-card-actions">'+
   button('hg408-equip',{id:h.id,uid:row.uid},self?'Đang mặc':elsewhere?'Tướng khác':'Mặc',
    busy||self||!!elsewhere,'small '+(!self&&!elsewhere?'primary':'secondary'))+
   button('hg18-enhance',{uid:row.uid},'⚒ +1',
    busy||!!elsewhere||!next.possible,'small secondary')+
   button('hg46-salvage',{uid:row.uid},'Phân giải',busy||!!owner,'small secondary')+
   '</div></article>';
 }).join('');
 return '<div class="hg46-manager" aria-label="Trang bị và bộ đồ của tướng">'+
  '<div class="hg46-strip"><span>🎒 Kho '+state.inventory.length+'/2000</span><span>💎 Đá '+format(state.hg18.materials.enhance_stone)+'</span>'+
  '<span>🪙 Vàng '+format(state.res.gold)+'</span><span>10 ô · đồ của tướng khác không tự chuyển</span></div>'+ 
  '<div class="hg46-slots hg47-ten-slots">'+worn+'</div>'+ 
  '<section class="hg46-build-panel"><div><b>⚒ Đề xuất trang bị thực</b><small>Đánh giá 10 ô, dòng phụ và bộ đồ từ kho hiện có; không chuyển đồ từ tướng khác.</small></div>'+ 
  '<div class="hg46-build-buttons">'+buildChoices+'</div></section>'+
  '<details class="hg46-set-details"><summary>💠 Bộ trang bị · '+sets.filter(q=>q.count>=2).length+' bộ đang có hiệu ứng</summary>'+
  '<div class="hg46-set-grid">'+setProgress+'</div></details>'+
  '<div class="hg46-inventory-head"><b>TRANG BỊ TRONG KHO</b><span>'+inventory.length+' món · '+pages+' trang</span></div>'+ 
  '<div class="hg46-filter-bar">'+filters+'</div>'+
  '<div class="hg46-inventory-list">'+(rows||'<p class="hg408-note">Không có trang bị trong nhóm này. Kiếm rương từ nhiệm vụ hoặc ghép đồ tại Rèn & Di vật.</p>')+'</div>'+
  '<div class="hg46-pages">'+button('hg46-page',{direction:-1},'◀ Trang trước',hg46GearPage===0,'small secondary')+
  '<span>Trang '+(hg46GearPage+1)+'/'+pages+'</span>'+
  button('hg46-page',{direction:1},'Trang sau ▶',hg46GearPage>=pages-1,'small secondary')+'</div>'+
  '</div>';
}

function hg408HeroesView(){
 const validTabs=[['overview','♛ Tổng quan'],['stats','📈 Thuộc tính'],['gear','🛡 Trang bị'],['ascend','✦ Nâng bậc'],['tavern','🍺 Tavern']];
 if(!validTabs.some(q=>q[0]===hg408Tab))hg408Tab='overview';
 let h=state.heroes.find(x=>x.id===hg408InspectId);
 if(!h){h=state.heroes.find(x=>x.id===state.activeHero)||state.heroes[0];hg408InspectId=h.id;}
 const qual=q=>E.hg408HeroQuality(q);
 const tier=q=>E.hg408HeroQualityInfo(q);
 const qualityGlyph=q=>({white:'♜',blue:'♞',yellow:'♛',green:'✣',purple:'✦',platinum:'✧',rainbow:'✺'})[qual(q)]||'♜';
 const chances=E.heroQualityChances(state.buildings.tavern||1);
 const total=q=>E.heroInnateTotal(q);
 const rankEmblem=x=>['','◆','✦','❖','✺','♛'][Math.max(1,Math.min(5,x||1))];
 const color=q=>'hg408-quality-'+qual(q);
 const role=E.hg20HeroRole(state,h.id),check=E.hg408DismissCheck(state,h.id);
 const stats=E.heroStats(state,h.id);
 const rank=h.heroRank||1,rebirth=h.rebirth||0,need=E.experienceToNext(h.level);
 const expMax=need===null?1:Math.max(1,need),exp=need===null?1:Math.min(expMax,h.xp);
 const cap=E.heroCountLimit(state.fame),slots=state.equipment[h.id]||{};
 const available=!state.march&&!state.battle&&!E.heroAway(state,h.id);
 let combatPower=null;
 try{combatPower=E.hg20TowerPower(state,[h.id]).power}catch(_error){}
 const roster=state.heroes.map(q=>{
   const active=q.id===h.id,ready=E.hg20HeroRole(state,q.id);
   return `<button type="button" data-action="hg408-inspect" data-id="${q.id}" class="hg408-roster-card ${active?'selected':''}" aria-pressed="${active}" title="${esc(ready.label)}">
    <span class="hg408-mini-portrait ${color(q)}" aria-hidden="true">${hg45Portrait(q)}</span><span class="hg408-roster-name"><b class="${color(q)}">${esc(q.name)}</b><small>${esc(tier(q).label)} · Σ ${format(total(q))} · Lv.${q.level}</small></span><span class="hg408-role-dot ${ready.status==='home'?'free':'busy'}" title="${esc(ready.label)}"></span>
   </button>`;
 }).join('');
 const qualityLegend=`<section class="hg45-quality-legend" aria-label="Bảy phẩm chất tướng"><b>THẺ PHẨM CHẤT</b><div>${E.HERO_QUALITY_V2.map(q=>`<span class="hg45-legend-chip hg408-quality-${q.id}" title="${esc(q.buff)}">${esc(q.label)}</span>`).join('')}</div><small>Phẩm chất do tổng 4 chỉ số gốc quyết định, không do trang bị/cấp.</small></section>`;
 const identity=`<div class="hg408-identity">
    <div class="hg408-portrait ${color(h)}" aria-hidden="true">${hg45Portrait(h)}<small>${esc(tier(h).label)}</small></div>
    <div class="hg408-identity-main"><span class="hg408-eyebrow">HỒ SƠ TƯỚNG · ${esc(role.label)}</span>
      <h2 class="${color(h)}">${esc(h.name)}</h2>
      <div class="hg408-badges"><span>Lv ${h.level}/100</span><span>${rankEmblem(rank)} Bậc ${rank}/5</span><span>✦ Chuyển sinh ${rebirth}/5</span><span class="${color(h)}">${esc(tier(h).label)}</span><span>Σ ${format(total(h))} điểm gốc</span></div><div class="hg45-hero-buff ${color(h)}">✦ ${esc(tier(h).buff)}</div>
      <div class="hg408-exp"><span>EXP <b>${format(Math.floor(h.xp))}${need===null?' · MAX':' / '+format(need)}</b></span><progress max="${expMax}" value="${exp}"></progress></div>
    </div>
    <div class="hg408-power"><small>Chiến lực đội hình</small><strong>${combatPower===null?'—':format(combatPower)}</strong><small>${combatPower===null?'Chưa bố trí quân':'Chỉ số chiến đấu thực'}</small></div>
   </div>`;
 const statsGrid=`<div class="hg408-stats-grid">${[['atk','⚔','ATK'],['def','🛡','DEF'],['spd','➤','SPD'],['int','✧','INT']].map(([key,icon,label])=>`<div class="hg408-stat"><span>${icon} ${label}</span><strong class="hg408-quality-${E.heroStatColor(stats[key])}">${Number(stats[key]).toLocaleString('vi-VN',{maximumFractionDigits:2})}</strong></div>`).join('')}</div>`;
 const actions=`<div class="hg408-action-grid">
    ${button('hero',{id:h.id},h.id===state.activeHero?'✓ Đang chỉ huy':'♛ Chọn chỉ huy',h.id===state.activeHero||h.id===state.castellan||!available,'small primary')}
    ${button('castellan',{id:h.id},h.id===state.castellan?'Bỏ Castellan':'🏰 Bổ nhiệm',!available,'small secondary')}
    ${button('recall',{id:h.id},'↩ Gọi về',!state.stationedHeroes?.some(q=>q.heroId===h.id)||!!state.march||!!state.battle||!!state.expedition,'small secondary')}
    ${button('hg408-dismiss-review',{id:h.id},'✕ Sa thải',false,'small danger')}
   </div>`;
 let page='';
 if(hg408Tab==='overview'){
   page=`<div class="hg45-stat-heading">Chỉ số chiến đấu thực · bao gồm hiệu ứng phẩm chất</div>`+statsGrid+actions+`<div class="hg408-note">Sức chỉ huy ${format(E.heroLimit(h.level,h))} điểm · ${role.status==='home'?'Có mặt ở thành':'Đang thực hiện nhiệm vụ'} · ${Object.keys(slots).length}/10 ô trang bị</div>
     <details class="hg408-more"><summary>Chỉ số và tác động thực tế</summary><p>Chỉ số chiến đấu gồm thưởng trang bị và nâng bậc; sức mạnh đội hình chỉ hiển thị khi đã bố trí quân thật. Tướng đang giữ chức Castellan không thể đi chiến đấu.</p></details>`;
 }else if(hg408Tab==='stats'){
   page=statsGrid+`<div class="hg408-note">Điểm thuộc tính còn lại: <b>${h.statPoints||0}</b> · EXP từ chiến đấu, nhiệm vụ và huấn luyện</div>
    <div class="hg408-point-actions">${[['atk','ATK'],['def','DEF'],['spd','SPD'],['int','INT']].map(([k,label])=>button('heropoint',{id:h.id,stat:k},'+1 '+label,!(h.statPoints>0)||!available,'small secondary')).join('')}</div>
    <details class="hg408-more"><summary>Công thức và nguồn EXP</summary><p>Hero Tower Lv${E.heroTowerExperienceBonus(state)} tăng EXP cơ sở ${E.heroTowerExperienceBonus(state)}%; các nhiệm vụ và quái cấp cao vẫn sử dụng engine HG08/HG18.2. Chỉ số phân phối không thay đổi phẩm chất.</p></details>`;
 }else if(hg408Tab==='gear'){
   page=hg46GearView(h);
 }else if(hg408Tab==='ascend'){
   const mat=state.hg18.materials,spent=Object.values(h.spentAttributePoints||{}).reduce((a,b)=>a+b,0);
   page=`<div class="hg408-ascend-grid"><div><span>🔱 BẬC HIỆN TẠI</span><strong>${rankEmblem(rank)} ${rank}/5</strong><small>Mỗi bậc +2% chỉ số</small>${button('hg18-rank',{id:h.id},'Nâng bậc',!available||!mat.rank_emblem||rank>=5||h.level<rank*20,'small primary')}<small>Yêu cầu: Lv${rank*20} · ${mat.rank_emblem} Ấn còn lại</small></div>
   <div><span>✦ CHUYỂN SINH</span><strong>${rebirth}/5</strong><small>+4% mỗi lần chuyển sinh</small>${button('hg18-rebirth',{id:h.id},'Chuyển sinh',!available||!mat.rebirth_core||h.level!==100||rebirth>=5||state.castellan===h.id,'small primary')}<small>Cần Lv100 và lõi: ${mat.rebirth_core} còn lại</small></div></div>
   <div class="hg408-note">Thẻ tẩy ${mat.hero_reset} · điểm đã phân ${spent} · ${button('hg18-reset',{id:h.id},'Tẩy điểm',!available||!mat.hero_reset||!spent,'small secondary')}</div>`;
 }else{
   const arena=state.arenaQueue,wounded=Object.entries(state.wounded||{}).filter(([,v])=>v>0);
   const cost=wounded.length&&!arena?E.arenaHealCost(state,wounded[0][0],wounded[0][1]):0;
   page=`<div class="hg408-tavern-top"><b>🍺 Tavern Lv${state.buildings.tavern}</b><span>Danh vọng: ${state.heroes.length}/${cap} tướng</span><span>Làm mới: ${Math.ceil(state.tavern.remaining/state.speed)}s</span></div><div class="hg45-rate-bar"><span class="hg408-quality-purple">✦ Tím ${chances[4]}%</span><span class="hg408-quality-platinum">✧ Bạch Kim ${chances[5]}%</span><span class="hg408-quality-rainbow">✺ Cầu Vồng ${chances[6]}%</span></div>
    <div class="hg408-offers">${state.tavern.offers.map(o=>`<div class="hg408-offer hg45-tier-${qual(o)}"><div class="hg408-mini-portrait ${color(o)}">${hg45Portrait(o)}</div><div class="hg45-offer-info"><b class="${color(o)}">${esc(o.name)} <span class="hg45-tier-tag">${esc(tier(o).label)}</span></b><small>ATK ${o.atk} · DEF ${o.def} · SPD ${o.spd} · INT ${o.int} · Σ ${format(total(o))}</small><small class="hg45-offer-buff">✦ ${esc(tier(o).buff)}</small></div>${button('hirecandidate',{id:o.id},format(o.gold)+' 🪙',state.heroes.length>=cap||!E.canAfford(state,{gold:o.gold}),'small primary')}</div>`).join('')||'<p>Chờ lượt làm mới Tavern.</p>'}</div>
    <details class="hg408-more"><summary>ⓘ Xác suất & sức mạnh theo phẩm chất</summary><p>Mô hình HG45 riêng của game, không phải tỷ lệ server năm 2009. ${E.HERO_QUALITY_V2.map((q,i)=>esc(q.label)+' '+chances[i]+'% (tổng điểm '+q.totalMin+'–'+q.totalMax+')').join(' · ')}. Phẩm chất của ứng viên HG45.1 tính theo tổng 4 chỉ số nền. Khi lên cấp, phân điểm, mặc đồ hoặc chuyển sinh không đổi phẩm chất; tướng cũ giữ dữ liệu đã tuyển.</p></details>
    <details class="hg408-more"><summary>⚕ Arena · điều trị thương binh ${wounded.reduce((a,[,v])=>a+v,0)} quân</summary>
     ${arena?`<p>Đang điều trị ${arena.count} quân, còn ${Math.ceil(arena.remaining/state.speed)} giây thực.</p>`:'<p>Chữa thương bằng vàng theo giá trị quân.</p>'}
     ${button('heal',{},arena?'Arena đang bận':'Điều trị '+format(cost)+' 🪙',!!arena||!wounded.length||!E.canAfford(state,{gold:cost}),'small primary')}</details>`;
 }
 if(hg408DismissFor===h.id&&hg408DismissStage>0){
   const bad=check.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('');
   page+=`<section class="hg408-dismiss-dialog" role="alertdialog" aria-label="Xác nhận sa thải tướng">
    <h3>⚠ ${hg408DismissStage===1?'Kiểm tra điều kiện sa thải':'Xác nhận sa thải vĩnh viễn'}</h3>
    <p><b class="${color(h)}">${esc(h.name)}</b> · ${check.gear} món trang bị sẽ trở lại kho · ${check.plans} đội hình dự kiến được giải phóng. Không hoàn vàng, không trừ quân.</p>
    ${bad?`<ul>${bad}</ul>`:'<p class="hg408-clear">Đã đáp ứng điều kiện an toàn. Số suất tướng sẽ giảm 1.</p>'}
    <div class="hg408-dialog-actions">${button('hg408-dismiss-cancel',{},'Hủy',false,'small secondary')}
    ${hg408DismissStage===1?button('hg408-dismiss-next',{id:h.id},'Bước 2: Xác nhận',!check.allowed,'small danger'):button('hg408-dismiss-apply',{id:h.id},'Xác nhận sa thải',!check.allowed,'small danger')}</div></section>`;
 }
 return `<section class="hg408-screen" aria-label="HG40.8 quản lý tướng thật">
 <header class="hg408-summary"><b>♛ QUẢN LÝ TƯỚNG</b><span>${state.heroes.length}/${cap} suất theo danh vọng</span><span>${state.heroes.filter(q=>E.hg20HeroRole(state,q.id).status!=='home').length} tướng đang bận</span></header>
 <div class="hg408-layout">
  <aside class="hg408-roster"><div class="hg408-roster-head">DANH SÁCH <span>${state.heroes.length}</span></div><div class="hg408-roster-scroll">${roster}</div>${qualityLegend}</aside>
  <section class="hg408-profile">${identity}<nav class="hg408-tabs" aria-label="Chức năng tướng">${validTabs.map(([id,label])=>`<button type="button" data-action="hg408-tab" data-id="${id}" class="${hg408Tab===id?'active':''}" aria-pressed="${hg408Tab===id}">${label}</button>`).join('')}</nav>
  <div class="hg408-panel">${page}</div></section>
 </div></section>`;
}
function heroesView(){
 const h=state.heroes.find(x=>x.id===state.activeHero),stats=E.heroStats(state),eq=state.equipment[h.id]||{};
 const gear=Object.entries(E.ITEMS);
 const owned=state.inventory.map(i=>{const def=E.ITEMS[i.itemId],wearer=Object.entries(state.equipment).find(([,slots])=>Object.values(slots).includes(i.uid))?.[0];
 return `<div class="card gear-card"><div><b>${E.hg31IconHTML?.(def.id,30)||ico(def.id,23)||def.icon} ${esc(def.name)} +${i.enhance||0}</b><div class="hint">${def.slot} · ATK +${def.atk} · DEF +${def.def} · SPD +${def.spd}</div>${equipmentBattleText(def)?`<div class="tiny muted">${esc(equipmentBattleText(def))}</div>`:''}<small class="muted">${wearer?'Đang trang bị: '+esc(state.heroes.find(h=>String(h.id)===wearer)?.name||'tướng'):'Túi đồ'} · ${esc(i.origin||'')}</small></div>${button('equipitem',{uid:i.uid},wearer===String(h.id)?'Đã mặc':'Trang bị',!!state.march||!!state.battle||wearer===String(h.id),'small secondary')}${button('hg18-enhance',{uid:i.uid},'+1 Cường hóa',(state.hg18?.materials.enhance_stone||0)<(2+2*(i.enhance||0))||state.res.gold<250*((i.enhance||0)+1)||(i.enhance||0)>=10||!!state.march||!!state.battle,'small secondary')}${button('hg18-salvage',{uid:i.uid},'♻ Phân giải',!!wearer||!!state.march||!!state.battle,'small secondary')}</div>`}).join('');
 return heroesViewBase()+heroProgression()+heroAscensionView()+hg31HeroSetView()+`<section class="card hg04-section"><span class="eyebrow">HERO EQUIPMENT</span><h2>🎒 Túi trang bị và chỉ số tướng đang chọn</h2><p>${esc(h.name)} — ATK <b>${stats.atk}</b> · DEF <b>${stats.def}</b> · SPD <b>${stats.spd}</b> · INT <b>${stats.int}</b></p>
 <div class="equipment-slots">${[['weapon','⚔ Vũ khí'],['armor','🛡 Giáp'],['charm','💍 Phụ kiện']].map(([k,label])=>`<div class="slot"><b>${ico(k,22)||''} ${esc(label.slice(label.indexOf(' ')+1))}</b><div>${esc(itemName(eq[k]))}</div>${eq[k]?button('unequip',{slot:k},'Tháo',!!state.march||!!state.battle,'small secondary'):''}</div>`).join('')}</div>
 <div class="grid grid2">${owned||'<p class="muted">Chưa có trang bị. Có thể mua ở Bazaar hoặc nhặt sau khi thắng quái.</p>'}</div>
 <p class="hint">Các loại ô lấy ý tưởng từ hệ trang bị Heroes of Gaia. Tên, chỉ số, giá và tỷ lệ rơi ở đây đều là demo.</p></section>`;
}
// HG18: only completed real actions increment these period boards.
function hg18QuestView(){
 const groups=[['daily','HÀNG NGÀY'],['weekly','HÀNG TUẦN']];
 return groups.map(([cycle,label])=>{
  const tasks=E.hg18Tasks(state,cycle);
  return `<section class="card hg18-quests"><span class="eyebrow">HG18 • ${label} • MÔ HÌNH OFFLINE</span><h2>📜 Nhiệm vụ ${label.toLowerCase()}</h2>
   <p class="tiny muted">Tự ghi nhận xây xong công trình, quân tuyển hoàn tất và chiến thắng thật. Reset theo UTC, đã nhận không cộng trùng. Nhiệm vụ tuần cấp cao mới tặng quân đặc biệt.</p>
   <div class="grid grid2">${tasks.map(t=>`<div class="card"><b>${esc(t.name)}</b><span class="tag">${t.progress}/${t.need}</span>
    <progress max="${t.need}" value="${t.progress}"></progress><div class="tiny muted">Thưởng: ${Object.entries(t.reward).map(([k,n])=>k==='specialSoldier'?n+' quân đặc biệt':(ico(k,19)||E.HG18_MATERIALS[k]?.icon||'📦')+' '+n+' '+(E.HG18_MATERIALS[k]?.name||k)).join(' · ')}</div>
    ${button('hg18-claim',{cycle,id:t.id},t.claimed?'✓ Đã nhận':t.ready?'🎁 Nhận thưởng':'Chưa đủ tiến độ',!t.ready||t.claimed,'small primary')}</div>`).join('')}</div></section>`;
 }).join('');
}
function heroAscensionView(){
 const h=state.heroes.find(x=>x.id===state.activeHero),mat=state.hg18.materials,spent=Object.values(h.spentAttributePoints||{}).reduce((a,b)=>a+b,0);
 return `<section class="card"><span class="eyebrow">HG18 • TIẾN HÓA TƯỚNG</span><h2>🌟 Chuyển sinh & nâng bậc</h2>
  <p><b>${esc(h.name)}</b> · Cấp ${h.level}/100 · Bậc ${h.heroRank}/5 · Chuyển sinh ${h.rebirth}/5</p>
  <p class="tiny muted">Mỗi bậc +2% chỉ số tướng, mỗi lần chuyển sinh +4% chỉ số. Chuyển sinh tại cấp 100, về cấp 1 và trả các chỉ số phân phối về gốc; giữ bậc, trang bị và phép. Thẻ tẩy chỉ hoàn điểm đã tự phân phối.</p>
  <div class="entry">${button('hg18-rank',{id:h.id},'🔱 Nâng bậc (cần Lv '+(h.heroRank*20)+')',!mat.rank_emblem||h.heroRank>=5||h.level<h.heroRank*20||!!state.march||!!state.battle,'small secondary')}
  ${button('hg18-reset',{id:h.id},'🔄 Tẩy '+spent+' điểm',!mat.hero_reset||!spent||!!state.march||!!state.battle,'small secondary')}
  ${button('hg18-rebirth',{id:h.id},'🌟 Chuyển sinh cấp 100',!mat.rebirth_core||h.level!==100||h.rebirth>=5||!!state.march||!!state.battle||state.castellan===h.id,'small primary')}</div>
  <p class="tiny muted">Đang có: ${mat.rank_emblem} Ấn · ${mat.hero_reset} thẻ tẩy · ${mat.rebirth_core} lõi chuyển sinh. Lõi từ nhiệm vụ tuần đánh Boss 9–10★.</p></section>`;
}

function hg30QuestView(){
 if(!E.hg30Status)return '';
 const q=E.hg30Status(state),race=state.race,icons={guard:'🛡',sovereign:'👑'};
 const timeline=q.steps.map((step,i)=>{
  const done=step.done,part=step.progress||[];
  return `<div class="hg30-stage ${done?'done':step.active?'active':'locked'}"><span class="hg30-num">${done?'✓':i+1}</span><div><b>${esc(step.name)}</b><small>${done?'Hoàn thành':step.active?'Đang thực hiện':'Chờ giai đoạn trước'}</small></div></div>`;
 }).join('');
 const card=id=>{
  const r=q.recipes.find(x=>x.id===id),unit=E.getUnit(state,r.toUnit),source=E.getUnit(state,r.fromUnit);
  const wallet=[...Object.entries(r.fragments).map(([key,n])=>`<span class="${state.hg29.shards[key]>=n?'has':'missing'}">${E.HG29_ITEMS[key].icon} ${esc(E.HG29_ITEMS[key].name)} <b>${format(state.hg29.shards[key])}/${n}</b></span>`),
   ...Object.entries(r.tokens).map(([key,n])=>`<span class="${state.hg27[key]>=n?'has':'missing'}">${E.HG27_TOKENS[key].icon} ${esc(E.HG27_TOKENS[key].name)} <b>${format(state.hg27[key])}/${n}</b></span>`)].join('');
  const unmet=id==='sovereign'&&q.stage<3?`<p class="tiny muted">Sau khi mở Chiến Vệ: cần thêm ${r.needsBoss} Boss T11+ và ${r.needsTower} tầng Tháp có thưởng.</p>`:'';
  return `<div class="hg30-recipe" data-hg30-recipe="${id}">
   <div class="hg30-unit-line"><div>${A?.unitHTML(r.fromUnit,54)||'⚔'}<small>${esc(source?.name||r.fromUnit)} ×${r.fromCount}</small></div><span class="hg30-arrow">➜</span><div>${A?.unitHTML(r.toUnit,62)||icons[id]}<b>${esc(unit?.name||r.toName)}</b><small>Bậc ${unit?.tier||'-'} · ATK ${unit?.atk||0} · DEF ${unit?.def||0}</small></div></div>
   <h3>${esc(r.title)}</h3><p class="tiny muted">Quân rảnh ${format(r.free)}/${r.fromCount} · Vàng ${format(state.res.gold)}/${format(r.gold)} · Vượt Tháp tầng ${r.minFloor-1}</p>
   <div class="hg30-costs">${wallet}</div>${unmet}
   ${button('hg30-convert',{id},r.canConvert?'⚔ Chuyển hóa 1 quân':!r.story?'🔒 Chưa mở nhiệm vụ':'Thiếu nguyên liệu / quân',!r.canConvert,'primary')}
  </div>`;
 };
 const trial=q.steps[0];
 return `<section class="card hg30-quest" aria-label="HG30 nhiệm vụ đổi quân ba bậc">
  <span class="eyebrow">HG30 · NHIỆM VỤ ĐỔI QUÂN / ${esc(q.raceName)}</span>
  <div class="hg30-top"><h2>${E.HG30_NAMES[race].icon} Từ quân thường đến Quân Tối Thượng</h2><span class="tag">Giai đoạn ${q.stage}/3</span></div>
  <div class="hg30-steps">${timeline}</div>
  <div class="hg30-trial"><b>🎯 Thử thách mở khóa</b>
   <div class="hg30-progress">${trial.progress.map(x=>`<div><small>${esc(x.name)} · ${x.current}/${x.required}</small><progress value="${x.current}" max="${x.required}"></progress></div>`).join('')}</div>
   ${button('hg30-claim',{},trial.done?'✓ Đã mở thử thách':'Nhận chứng nhận thử thách',!trial.available,'small primary')}
  </div>
  <div class="hg30-recipes">${card('guard')}${card('sovereign')}</div>
  <p class="tiny muted">NHIỆM VỤ LIÊN TỤC: hoàn thành mở khóa một lần; về sau đổi bao nhiêu lần cũng được nếu đủ quân rảnh, vàng, mảnh, ấn và tầng Tháp. Không cần nhận lại nhiệm vụ hay chờ ngày mới. Quân của tướng khác không bị thu hồi.</p>
 </section>`;
}

function hg31ForgeView(){
 if(!E.hg31Status)return '';
 const s=E.hg31Status(state),busy=!!(state.battle||state.march||state.expedition||state.parallelMarches?.length||state.hg26?.enabled);
 const wallet=E.HG29_ITEMS,tokens=E.HG27_TOKENS;
 const section=setId=>{
  const set=E.HG31_SETS[setId],rows=s.recipes.filter(r=>r.set===setId);
  const isBoss=setId==='dragon';
  return `<div class="hg31-set" data-hg31-set="${setId}"><div class="hg31-set-heading"><div><h3>${set.icon} ${esc(set.name)}</h3><small>${esc(set.source)} · ${isBoss?'T11/T12 +1 mảnh; T13 +2':'Thắng có thưởng +1; tầng bội 5 +2'} · ${esc(set.note)}</small></div><span class="tag">${s.setCounts[setId]||0}/3 đang mặc</span></div>
   <div class="hg31-grid">${rows.map(r=>{
    const n=r.need,selected=r.focus,need=[
     `<span class="${r.have>=n.fragments?'ready':'missing'}">🧩 ${format(r.have)}/${n.fragments}</span>`,
     ...[['abyss',n.abyss],['hunter',n.hunter],['tower',n.tower],['hero',n.hero]].filter(([,v])=>v).map(([id,v])=>`<span class="${state.hg29.shards[id]>=v?'ready':'missing'}">${wallet[id].icon} ${format(state.hg29.shards[id])}/${v}</span>`),
     ...(n.bossToken?[ `<span class="${state.hg27.boss>=n.bossToken?'ready':'missing'}">${tokens.boss.icon} ${format(state.hg27.boss)}/${n.bossToken}</span>` ]:[]),
     `<span class="${state.res.gold>=r.price?'ready':'missing'}">🪙 ${format(state.res.gold)}/${format(r.price)}</span>`
    ].join('');
    return `<div class="hg31-card ${selected?'selected':''}" data-hg31-id="${r.id}">
     <div class="hg31-gear-top">${E.hg31IconHTML(r.id,62)}<div><b>${esc(r.name)}</b><small>${r.slot==='weapon'?'Vũ khí':r.slot==='armor'?'Giáp':'Phụ kiện'} · ATK +${r.atk} · DEF +${r.def} · SPD +${r.spd}</small><small>🔓 ${esc(r.unlockLabel)} · ${isBoss?'Không khóa theo tầng Tháp':'Không bắt buộc Ấn Boss'}</small><small>🧩 Mảnh cần farm thêm: ${r.missing.focused} · ${r.sourceDays!==null?'Tối thiểu khoảng '+r.sourceDays+' ngày Tháp nếu đủ 5 lượt thưởng/ngày':'Nguồn Boss T11–T13'} · Không có thưởng khi thua</small><small>${esc(set.note)} · Cần đúng nguyên liệu và vàng, không quay rương ngẫu nhiên.</small></div></div>
     <div class="hg31-costs">${need}</div>
     <div class="hg31-actions">${button('hg31-focus',{id:r.id},selected?'🎯 Đang săn món này':'🎯 Chọn farm',selected||busy,'small secondary')}
     ${button('hg31-craft',{id:r.id},r.canCraft?'⚒ Ghép đúng món':!r.unlocked?'🔒 Chưa mở':'Thiếu vật liệu',!r.canCraft,'small primary')}</div>
     </div>`;
   }).join('')}</div></div>`;
 };
 return `<section class="card hg31-forge" aria-label="HG31 bộ trang bị Long Hồn và Tinh Không">
  <span class="eyebrow">HG31 · TRANG BỊ CAO CẤP · FARM ĐÚNG MÓN</span>
  <h2>⚒ Lò Rèn Long Hồn & Tinh Không</h2><div class="hg46b-stage-rail"><span>Đầu: Bazaar & rương</span><span>Giữa: Vệ Binh / Tinh Vân</span><span>Cuối: Long Hồn / Tinh Không</span></div>
  <p class="tiny muted">Chọn trước món cần farm: <b>Long Hồn</b> chỉ cần chiến thắng Boss T11–T13 và nguyên liệu Boss; không yêu cầu tầng Tháp. <b>Tinh Không</b> lấy từ Tháp, chỉ dùng mảnh Tháp và mảnh Anh Hùng, không khóa bằng Ấn Boss. Mỗi ngày tối đa 5 trận Tháp có thưởng. Mảnh rơi từ chiến thắng thật, không cấp hồi tố.</p>
  <div class="hg31-status"><span>🐉 Boss thắng: <b>${s.bossWins}</b></span><span>🌌 Tháp có thưởng: <b>${s.towerWins}</b></span><span>⚒ Đã ghép: <b>${s.crafted}</b></span>${s.last?`<span>Vừa nhận: +${s.last.count} mảnh ${esc(E.ITEMS[s.last.id].name)}</span>`:''}</div>
  ${section('dragon')}${section('star')}
 </section>`;
}
function hg31GuideView(){
 const t=E.hg31Status(state);
 return `<section class="card hg31-guide"><span class="eyebrow">HG31 · HÀNH TRÌNH SĂN TRANG BỊ</span>
 <h2>🐉 Boss → Long Hồn · 🌌 Tháp → Tinh Không</h2>
 <div class="hg31-guide-row"><div>${E.hg31IconHTML(t.focus.boss,42)}<b>${esc(E.ITEMS[t.focus.boss].name)}</b><small>${format(t.fragments[t.focus.boss])} mảnh · Boss T11/T12: +1, T13: +2 · Không cần mở tầng Tháp 11</small></div>
 <div>${E.hg31IconHTML(t.focus.tower,42)}<b>${esc(E.ITEMS[t.focus.tower].name)}</b><small>${format(t.fragments[t.focus.tower])} mảnh · Tháp thắng có thưởng: +1, tầng bội 5: +2</small></div></div>
 <p class="tiny muted">Đến tab Rèn & Di vật để chọn món và ghép. Quy tắc này là thiết kế mới, không phải tỷ lệ HoG gốc.</p></section>`;
}
function hg31HeroSetView(){
 const sets=E.hg31Status(state).setCounts;
 return `<section class="card hg31-hero-sets"><h2>✦ Bộ trang bị cao cấp đang mặc</h2>${Object.entries(E.HG31_SETS).map(([id,set])=>`<div><b>${set.icon} ${esc(set.name)} · ${sets[id]||0}/3</b><small>${esc(set.note)} · ${sets[id]>=2?'Đã kích hoạt mốc 2':'Chưa mở mốc 2'} · ${sets[id]>=3?'Đã kích hoạt mốc 3':'Chưa mở mốc 3'}</small></div>`).join('')}</section>`;
}

function hg29PreviewUI(kind,target,level){
 const p=E.hg29Preview(state,{kind,target,level});if(!p||!p.paid)return '';
 return `<aside class='hg29-preview' aria-label='Dự kiến vật phẩm rơi'><b>🎁 ${esc(p.label)}</b><small>${p.guaranteed.map(x=>'✓ '+esc(x.name)+' ×'+x.count).concat(p.chances.map(x=>esc(x.name)+' '+x.percent+'%')).join(' · ')||'Không có mảnh'}</small></aside>`;
}

function hg47ForgeView(){
 const race=E.HG47_RACES[hg47RaceView]?hg47RaceView:state.race;
 const tier=E.HG47_TIERS[hg47TierView]?hg47TierView:'rare';
 const info=E.HG47_TIERS[tier],rows=E.hg47Status(state,race,tier);
 const busy=!!(state.march||state.battle||state.expedition||state.parallelMarches?.length||state.hg26?.enabled);
 const races=Object.entries(E.HG47_RACES).map(([key,r])=>
  button('hg47-race',{race:key},r.icon+' '+r.name,key===race,'small '+(key===race?'primary':'secondary'))).join('');
 const tiers=Object.entries(E.HG47_TIERS).map(([key,t])=>
  button('hg47-tier',{tier:key},t.icon+' '+t.name,key===tier,'small '+(key===tier?'primary':'secondary'))).join('');
 const items=rows.map(q=>{
  const def=E.ITEMS[q.id],counts=q.have+'/'+q.need,missing=Object.entries(q.missing)
    .filter(([,n])=>n>0).map(([key,n])=>({fragments:'Mảnh đích',gold:'Vàng',gear:'Mảnh rèn',
     hunter:'Huy hiệu',abyss:'Lõi Boss',tower:'Phù văn Tháp',hero:'Mảnh Anh Hùng',
     bossToken:'Ấn Boss',towerToken:'Ấn Tháp'})[key]+' '+format(n)).join(' · ');
  const label=q.gated?'Chưa thắng Boss T11+ và 3 lượt Tháp nhận thưởng':missing||'Đã đủ nguyên liệu';
  return '<article class="hg47-recipe hg47-tier-'+tier+' '+(q.focused&&race===state.race?'is-focus':'')+'">'+
    '<div class="hg47-recipe-art">'+(E.hg47IconHTML?.(q.id,44)||q.icon)+'</div><div class="hg47-recipe-body">'+
    '<b>'+esc(def.name)+'</b><small>'+esc(E.HG47_SLOTS.find(x=>x[0]===q.slot)?.[1]||q.slot)+
    ' · ⚔ '+def.atk+' · 🛡 '+def.def+' · ➤ '+def.spd+'</small>'+
    '<progress max="'+q.need+'" value="'+q.have+'"></progress>'+
    '<small>🧩 '+counts+' mảnh · '+format(q.cost)+' vàng</small>'+
    '<small title="'+esc(label)+'">'+esc(label)+'</small>'+
    '</div><div class="hg47-recipe-actions">'+
    button('hg47-focus',{tier,slot:q.slot},q.focused&&race===state.race?'✓ Đang săn':'🎯 Săn mảnh',
     race!==state.race||q.focused||busy,'small secondary')+
    button('hg47-craft',{id:q.id},'⚒ Ghép đúng món',!q.canCraft,'small primary')+'</div></article>';
 }).join('');
 const sets=Object.entries(E.HG47_SETS).filter(([,v])=>v.race===race).map(([id,v])=>
  '<div class="hg47-set-chip"><b>'+v.icon+' '+esc(v.name)+'</b>'+
  '<small>'+esc(v.note)+'</small><small>'+esc(v.source)+'</small></div>').join('');
 return '<section class="card hg47-forge" aria-label="HG47 mảnh trang bị, bốn chủng tộc, mười ô">'+
  '<span class="eyebrow">HG47 · 10 Ô / TƯỚNG · 4 CHỦNG TỘC · 8 BỘ</span>'+
  '<h2>⚒ Chọn món để săn mảnh và tự ghép</h2>'+
  '<p class="hint">Mỗi tướng có 10 ô riêng. Khi thắng quái, Boss hoặc Tháp, mảnh sẽ vào kho theo ô đang theo đuổi. Không tự phát đồ, không cần may rủi khi ghép. Chỉ chế tạo đồ của chủng tộc đang chơi.</p>'+
  '<div class="hg47-selector">'+races+'</div><div class="hg47-selector">'+tiers+'</div>'+
  '<div class="hg47-wallet"><span>Chủng tộc đang chơi: <b>'+esc(E.HG47_RACES[state.race].name)+'</b></span>'+
  '<span>Ấn Boss '+format(state.hg27.boss)+'</span><span>Ấn Tháp '+format(state.hg27.tower)+'</span>'+
  '<span>Lõi Boss '+format(state.hg29.shards.abyss)+'</span><span>Phù văn '+format(state.hg29.shards.tower)+'</span></div>'+
  '<p class="tiny muted">'+esc(info.oddsLabel)+'. '+(tier==='divine'?
    'Đồ Thần cần thêm 1 Ấn Boss, 1 Ấn Tháp, 3 Lõi Boss, 6 Phù văn, 2 Mảnh Ấn Anh Hùng và 18.000 vàng / món.':'Đồ Cổ cần thêm 5 Mảnh Rèn, 3 Huy hiệu Elite và 3.000 vàng / món.')+'</p>'+
  '<div class="hg47-recipe-grid">'+items+'</div>'+
  '<details class="hg47-set-info"><summary>✦ Hiệu ứng bộ và vị trí thu thập</summary><div class="hg47-set-grid">'+sets+'</div>'+
  '<p class="hint">3/6/10 món mặc đúng bộ mới kích hoạt buff chiến đấu. Dòng phụ cố định theo UID từng món, giữ nguyên sau Save/Load. Tỉ lệ được xác định từ kết quả chiến thắng thật, không cộng khi xem màn hình.</p></details></section>';
}

function hg29CraftView(){
 if(!E.hg29Catalogue)return '';
 const h=E.hg29Ensure(state),items=E.HG29_ITEMS,rows=E.hg29Catalogue(state);
 return `<section class='card hg29-craft' aria-label='HG29 Kho mảnh và ghép trang bị'><span class='eyebrow'>HG29 · SĂN QUÁI → NHẬT MẢNH → GHÉP</span><h2>🧩 Kho mảnh và chế tạo theo mục tiêu</h2><p class="tiny muted">Đầu game: quái 1–3★ + Bazaar và rương ngày. Giữa game: Elite 4–10★, Vệ Binh và đá cường hóa. Cuối game: Boss T11–T13 cho Long Hồn, Tháp tầng 21+ cho Tinh Không. Không có quà miễn phí.</p><div class='hg29-wallet'>${Object.entries(items).map(([id,item])=>`<span title='Nguồn: ${esc(item.source)}'>${item.icon} ${esc(item.name)} <strong>${format(h.shards[id])}</strong></span>`).join('')}</div><div class='hg29-recipes'>${rows.map(r=>`<div class='card hg29-recipe'><b>${esc(r.name)}</b><small>${Object.entries(r.cost).map(([id,count])=>items[id].icon+' '+format(h.shards[id])+'/'+count).join(' · ')}</small>${button('hg29-craft',{id:r.id},r.canCraft?'⚒ Ghép':'Thiếu mảnh',!r.canCraft,'small primary')}</div>`).join('')}</div><p class='tiny muted'>Lựa chọn đúng món cần chế tạo; chỉ tiêu hao mảnh nhận qua chiến thắng thật. Không cộng trùng mảnh Tinh Vân / Ấn Boss cũ.</p></section>`;
}
function hg29GuideView(){
 if(!E.HG29_TABLES)return '';
 return `<section class='card hg29-guide'><span class='eyebrow'>HG29 · BẢNG RƠI MINH BẠCH</span><h2>🎯 Farm ở đâu?</h2><div class='hg29-guides'>${Object.entries(E.HG29_TABLES).map(([id,p])=>`<div class='card'><b>${esc(p.label)}</b><small>${p.guaranteed.map(([k,n])=>'✓ '+esc(E.HG29_ITEMS[k].name)+' ×'+n).concat(p.roll.filter(r=>r[0]!=='none').map(r=>esc(E.HG29_ITEMS[r[0]].name)+' '+r[3]/100+'%')).join(' · ')}</small></div>`).join('')}</div><p class='hint'>Tỷ lệ HG46-B riêng của Hẻoofgaia, mỗi chiến thắng hợp lệ có đúng một lượt rút. Quái thường 30% rơi mảnh Rèn; quái 4★+ có 34% rơi mảnh Rèn. Boss/Tháp có phần bảo đảm ngoài lượt rút; đánh Tháp không còn lượt thưởng sẽ không nhận mảnh.</p></section>`;
}
function hg29LastView(){
 const r=state.hg29?.last;if(!r)return '';
 return `<section class='card hg29-last'><b>🧩 HG29 · Mảnh mới nhất từ ${esc(E.HG29_TABLES[r.source].label)}</b><p>${r.drops.length?r.drops.map(x=>E.HG29_ITEMS[x.id].icon+' '+esc(E.HG29_ITEMS[x.id].name)+' ×'+x.count).join(' · '):'Lượt này không rơi mảnh mới'} · lượt ${r.ordinal}</p><small>Đây là chiến lợi phẩm đã cộng vào kho, không có nút nhận lại.</small></section>`;
}
function hg27ExchangeView(group){
 if(!E.hg27Catalogue)return '';
 const h=E.hg27Ensure(state),rows=E.hg27Catalogue(state).filter(r=>r.group===group),tokens=E.HG27_TOKENS;
 return `<section class="card hg27-exchange" aria-label="Đổi thưởng chiến tích PvE"><span class="eyebrow">HG27 · FARM → GHÉP → ĐỔI THƯỞNG</span>
 <h2>${group==='troop'?'⚔ Chuyển quân thường thành quân đặc biệt':'✨ Đổi chiến tích lấy trang bị cao cấp'}</h2>
 <div class="hg27-wallet">${Object.entries(tokens).map(([k,v])=>`<span>${v.icon} ${esc(v.name)} <b>${format(h[k])}</b></span>`).join('')}</div>
 <p class="tiny muted">Chiến tích từ thắng quái trên bản đồ · Ấn Boss từ thắng Boss cấp cao · Phù ấn Tháp từ tầng thắng thật (tối đa 5 lượt thưởng/ngày). Không phát quà khi thua hoặc đánh Tháp quá hạn thưởng.</p>
 <div class="hg27-recipes">${rows.map(r=>`<div class="card hg27-recipe"><div><b>${esc(r.name)}</b><small>${Object.entries(r.need).map(([k,n])=>tokens[k].icon+' '+n+' '+esc(tokens[k].name)).join(' · ')} · 🪙 ${format(r.gold)}${r.troops?' · ⚔ '+r.troops+' lính cơ bản chưa phân đội':''}</small>${r.floor>1?`<small>Điều kiện: vượt Tháp tầng ${r.floor-1}</small>`:''}</div>
 ${button('hg27-exchange',{id:r.id},r.canExchange?'Đổi ngay':!r.unlocked?'🔒 Khóa':'Thiếu nguyên liệu',!r.canExchange,'small primary')}</div>`).join('')}</div>
 <p class="hint">Mọi nguyên liệu và lính cũ được trừ trước khi nhận vật phẩm; không đổi khi có đoàn quân đang hành quân. Đây là hệ thống offline mới của Hẻoofgaia.</p></section>`;
}
function hg409LootText(x){
 if(!x)return '';
 return [Object.entries(x.resources||{}).filter(([,n])=>n).map(([k,v])=>'+'+format(v)+' '+(C.resource[k]?.label||k)).join(' · '),
 Object.entries(x.materials||{}).filter(([,n])=>n).map(([k,v])=>'+'+v+' '+(E.HG18_MATERIALS[k]?.name||k)).join(' · ')].filter(Boolean).join(' | ');
}
function hg409RewardHistoryUI(){
 const rows=E.hg409RewardHistory?.(state)||[];if(!rows.length)return '';
 return '<details class="hg409-reward-history"><summary>🎁 Thưởng PvE thêm thực nhận ('+rows.length+' trận)</summary>'+
 rows.slice(0,6).map(q=>'<div><b class="hg408-quality-purple">CS'+q.cs+' · '+(q.kind==='boss'?'Boss':q.kind==='tower'?'Tháp':'Quái')+'</b><small>'+esc(hg409LootText(q))+'</small></div>').join('')+
 '<small>Đã cộng một lần khi thắng. Số thực nhận giảm khi kho đạt giới hạn; không có nút nhận lại.</small></details>';
}
function hg409MaterialGuide(id){
 const info={
 resource_card:'Dùng 1 thẻ: +600 vàng, +80 gỗ, +80 quặng, +20 lưu huỳnh và +20 pha lê. Phải đủ chỗ trong kho để nhận toàn bộ.',
 resource_chest:'Dùng 1 thẻ: +2.400 vàng, +300 gỗ, +300 quặng, +100 lưu huỳnh và +100 pha lê. Phải đủ chỗ trong kho.',
 gear_pack:'Mỗi lượt mở nhận đúng 1 trang bị trong chu kỳ 6 món: Kiếm đồng hành trình, Giáp sắt trinh sát, Cung tần bì, Áo choàng lữ khách, Nhẫn thạch anh, Hộ phù cổ. Không phải quay thưởng xác suất.',
 set_chest:'Mỗi lượt mở nhận đúng 1 món trong chu kỳ Kiếm, Giáp, Ấn của bộ Vệ Binh. Mặc 2 món giảm 2,5% sát thương; 3 món tăng 3,5% sát thương.',
 enhance_stone:'Để cường hóa tại hồ sơ Tướng: cần 2 + 2×cấp hiện tại đá và 250×cấp tiếp theo vàng. Tối đa +10, không có rủi ro thất bại.',
 hero_reset:'Dùng tại Tướng → Nâng bậc. Trả điểm đã phân bổ, không đổi phẩm chất, trang bị, bậc hay chuyển sinh.',
 rank_emblem:'1 ấn cho mỗi lần nâng bậc người chơi trong giới hạn bậc 1–5 và yêu cầu cấp. Mỗi bậc +2% chỉ số chiến đấu.',
 rebirth_core:'Dùng 1 lõi khi tướng người chơi đạt Lv100: về Lv1, giữ trang bị và bậc. Tối đa CS5 đối với người chơi; CS6–10 là sức mạnh tướng địch.',
 astral_shard:'8 mảnh ghép 1 món Tinh Vân theo thứ tự Kiếm, Giáp, Ấn trong Rèn & Di vật; không tự ghép, không mở như thẻ.'
 };
 return info[id]||'Nguyên liệu chế tạo hoặc tiến hóa trong Rèn & Di vật.';
}

function relicView(){
 const mat=state.hg18.materials,sets=E.hg18SetCounts(state,state.activeHero);
 const opens=['resource_card','resource_chest','gear_pack','set_chest'];
 const gearEntry=button('hg46-open-gear',{},'🛡 Mở kho trang bị và mặc đồ tướng',false,'primary');
 return `<h1>💎 Rèn đúc & kho di vật</h1><div class="hg46-forge-entry">${gearEntry}</div>${hg409RewardHistoryUI()}${hg47ForgeView()}${hg31ForgeView()}${hg29CraftView()}${hg27ExchangeView('gear')}
  <p class="hint">Thẻ, bộ trang bị, mảnh ghép và cường hóa do Hẻoofgaia thiết kế mới; Fandom xác nhận hệ trang bị và nguồn thưởng từ Bazaar/Babel, nhưng không xác nhận các công thức HG18 này.</p>
  <section class="card"><h2>🎒 Nguyên liệu và thẻ thưởng</h2><div class="grid grid3">${Object.entries(E.HG18_MATERIALS).map(([key,m])=>`<div class="card hg409-material-card"><div class="hg409-material-head"><b>${ico(key,25)||m.icon} ${esc(m.name)}</b><strong>×${format(mat[key])}</strong></div><details><summary>ⓘ Công dụng và định mức</summary><p>${esc(hg409MaterialGuide(key))}</p><small>Kiếm qua nhiệm vụ, chiến thắng Boss/Tháp, ghép mảnh. Không phát vật phẩm khi xem thẻ.</small></details>
  ${opens.includes(key)?button('hg18-open',{id:key},'Mở / Dùng',mat[key]<1,'small primary'):''}</div>`).join('')}</div></section>
  <section class="card"><h2>✨ Ghép bộ Tinh Vân</h2><p>Cần <b>8 mảnh Tinh Vân</b> / món, thứ tự Kiếm → Giáp → Ấn; nhận qua thắng quái cấp cao, nhiệm vụ ngày/tuần. Không bán trong Bazaar.</p>
   ${button('hg18-craft',{id:'astral'},'⚒ Ghép 8 mảnh (hiện '+format(mat.astral_shard)+')',mat.astral_shard<8,'primary')}</section>
  <section class="card"><h2>🛡 Kích hoạt bộ trang bị</h2>
   ${Object.entries(E.HG18_SETS).map(([id,set])=>`<p><b>${esc(set.name)}</b> · ${sets[id]||0}/3 món đang mặc · kích hoạt 2/3 và 3/3 theo bonus mô hình.</p>`).join('')}
   <p class="tiny muted">Cường hóa: tối đa +10, dùng 2 + 2× cấp hiện tại đá và 250× cấp mới vàng. Thành công chắc chắn; không thất bại RNG. Thực hiện trên trang Tướng.</p></section>`;
}
function technologyView(){
 const queue=state.researchQueue,queuedSpell=queue&&C.spells[queue.key];
 const military=[['training','Bootcamp','Giảm thời gian huấn luyện 2% mỗi cấp; là điều kiện tuyển quân ở một số bậc Human.'],['manufacturing','Manufacturing','Giảm chi phí vàng tuyển quân 2% mỗi cấp; là điều kiện tuyển quân ở một số bậc Human.']];
 return `<section class="card hg08-section"><span class="eyebrow">MILITARY RESEARCH</span><h2>⚙ Nghiên cứu quân sự</h2><p class="hint">Wiki tiếng Anh năm 2009 gọi các phép thụ động này là Bootcamp và Manufacturing; bảng Human tiếng Trung dùng “练兵技术” cho điều kiện huấn luyện. Việc ghép hai tên Bootcamp/练兵技术 là suy luận theo vai trò, không phải bản dịch chính thức. Hai nghiên cứu dùng cùng hàng đợi spell; chi phí và thời gian còn mô phỏng.</p>${queue?`<div class="queue-card"><b>Đang nghiên cứu: ${esc(queuedSpell?.vi||queuedSpell?.name||queue.key)} cấp ${queue.level}</b><progress max="${queue.total}" value="${queue.total-queue.remaining}"></progress><small>${Math.ceil(queue.remaining/state.speed)} giây thực còn lại</small></div>`:''}<div class="grid grid2">${military.map(([id,name,desc])=>{const key=E.TECHNOLOGIES[id].spell,level=state.spells[key]||0,cost=E.spellCost(state,key),towerReady=state.buildings.magicTower>=level+1;return `<div class="card"><div class="heading">${name} <span class="tag">Cấp ${level}/10</span></div><p class="hint">${desc}</p><div class="cost">${money(cost)} · ${E.technologyDuration(state,id)} giây mô phỏng</div><small class="muted">${towerReady?'Magic Tower đã đáp ứng':'Cần Magic Tower cấp '+(level+1)}</small><div>${button('learn',{id:key},'Nghiên cứu cấp '+(level+1),!!queue||!towerReady||level>=10||!E.canAfford(state,cost),'small primary')}</div></div>`}).join('')}</div></section>`;
}
function magicView(){const active=state.heroes.find(h=>h.id===state.activeHero),castellan=state.heroes.find(h=>h.id===state.castellan);
 return magicViewBase()+technologyView()+`<section class="card hg04-section"><span class="eyebrow">HERO SPELLS • MAGIC TOWER</span><h2>✨ Phép tướng theo chủng tộc ${esc(C.races[state.race].english)}</h2><p class="hint">Bộ đang chọn: ${state.spellEdition==='china2009'?'Trung Quốc 2009 · Sina':'Quốc tế · Fandom'}. Nghiên cứu tại Magic Tower rồi trang bị cho tướng (tối đa 5 ô). Trong bộ Trung Quốc, Bản năng chiến đấu của Thú tộc áp dụng đúng +1,5% quãng di chuyển cận chiến mỗi cấp; thời hạn, hồi chiêu và cách cộng dồn phần lẻ để đổi ra ô là mô hình vì Sina không ghi các chi tiết này.</p>
 <p>Chỉ huy hiện tại: <b>${hg408HeroNameHTML(active)}</b> · ${active.equippedSpells.filter(id=>E.spell(state,id)?.kind!=='castellan').length}/5 phép chiến đấu · Castellan: <b>${castellan?hg408HeroNameHTML(castellan):'chưa bổ nhiệm'}</b></p>
 <div class="grid grid3">${E.spells(state).map(q=>{const level=state.heroMagic[q.id]||0,cost=E.heroSpellCost(state,q.id),wearer=q.kind==='castellan'?castellan:active,equipped=!!wearer?.equippedSpells.includes(q.id),action=q.kind==='castellan'?'herocastellanequip':'heroequip',label=q.kind==='castellan'?(equipped?'Gỡ khỏi Castellan':castellan?'Gắn cho Castellan':'Cần bổ nhiệm Castellan'):equipped?'Gỡ phép':'Trang bị',blocked=q.kind==='castellan'?!castellan||!level:!level;
 return `<div class="card"><b>✧ ${esc(q.name)}</b>${q.sourceName?`<span class="muted tiny"> · ${esc(q.sourceName)}</span>`:''}<span class="tag">Lv ${level}</span>${q.kind==='castellan'?'<span class="tag">CASTELLAN</span>':''}<p class="hint">${esc(q.desc)}</p><p class="cost">${money(cost)}</p><div class="entry">${button('herolearn',{id:q.id},'Nghiên cứu',level>=state.buildings.magicTower||!E.canAfford(state,cost)||!!state.march||!!state.battle,'small')}${button(action,{id:q.id},label,blocked||!!state.march||!!state.battle,'small secondary')}</div></div>`}).join('')}</div></section>`;
}
function castleOverview(){
 const hero=state.heroes.find(h=>h.id===state.activeHero)||state.heroes[0];
 const military=E.activeArmy(state),count=military.reduce((n,u)=>n+state.army[u.id],0);
 return `<section class="card hg05-castle-overview"><div class="hg05-switches">
 ${button('tab',{tab:'heroes'},'♛ HERO',false,'secondary')}
 ${button('tab',{tab:'army'},'⚔ TROOPS',false,'secondary')}
 ${button('tab',{tab:'tasks'},'📜 TASK',false,'secondary')}
 </div><div class="hg05-castle-grid"><div><span class="eyebrow">CASTELLAN & LORD</span>
 <h3>⚜ ${hg408HeroNameHTML(hero)} · Lv.${hero.level}</h3>
 <p class="hint">${esc(C.races[state.race].english)} · ATK ${hero.atk} · DEF ${hero.def} · SPD ${hero.spd} · INT ${hero.int}</p>
 <p class="hint">Thành thủ: ${hg408HeroNameHTML(state.heroes.find(h=>h.id===state.castellan))} · Danh vọng ${format(state.fame)}</p></div>
 <div><span class="eyebrow">ARMY AT CASTLE</span><h3>${format(count)} lính · ${military.length} binh chủng</h3>
 <p class="hint">${military.slice(0,4).map(u=>esc(u.name)+' ×'+format(state.army[u.id])).join(' · ')||'Chưa có quân'}</p>
 <p class="hint">${esc(C.buildings[E.troopBuildingKey(state)].name)} Lv.${state.buildings[E.troopBuildingKey(state)]} · Arena Lv.${state.buildings.arena}</p></div></div></section>`;
}
function cityView(){const market=state.buildings.market||0,bazaar=state.buildings.bazaar||0;
 return citySwitcher()+cityViewBase()+castleOverview()+`${state.buildingQueue?`<section class="card queue-card"><b>🏗 Công trình đang thi công: ${esc(C.buildings[state.buildingQueue.key].name)} Lv.${state.buildingQueue.level}</b><progress max="${state.buildingQueue.total}" value="${state.buildingQueue.total-state.buildingQueue.remaining}"></progress><small>${Math.ceil(state.buildingQueue.remaining/state.speed)} giây thực còn lại • tốc độ ×${state.speed} • thời gian mô phỏng</small></section>`:''}<section class="card hg04-section"><span class="eyebrow">CASTLE ECONOMY</span><h2 id="city-market-service">⚖ Market — bán tài nguyên lấy vàng</h2><p class="hint">Nguồn 2009 ghi nhận Market bán/đổi tài nguyên, không mua tài nguyên bằng vàng. Tỷ giá tại đây là mô phỏng.</p>
 <div class="trade-row"><select id="sell-type" aria-label="Loại tài nguyên bán">${['wood','ore','sulfur','crystal'].map(k=>`<option value="${k}">${C.resource[k].label}</option>`).join('')}</select><input type="number" min="1" max="50000" step="1" id="sell-qty" value="50" aria-label="Số tài nguyên bán">${button('sell',{},'Bán tài nguyên',market<1,'primary')}</div>
 <p class="hint">${market?'Market Lv.'+market:'Hãy xây Market ở danh sách công trình phía trên.'}</p>
 <h2 id="city-bazaar-service">🏪 Bazaar — cửa hàng trang bị</h2><div class="grid grid3">${Object.values(E.ITEMS).filter(item=>item.shop!==false).map(item=>`<div class="card"><b>${ico(item.id,23)||item.icon} ${esc(item.name)}</b><p class="hint">${item.slot} · ATK +${item.atk} · DEF +${item.def} · SPD +${item.spd}</p><div class="cost">${format(item.cost)} 🪙 · cần Bazaar Lv.${item.level}</div>${button('buyitem',{id:item.id},'Mua vật phẩm',bazaar<item.level||state.res.gold<item.cost,'small secondary')}</div>`).join('')}</div></section>`;
}
function tasksView(){
 const main=E.activeCity(state).main,tasks=E.dailyTasks(state),china=E.china2009DailyTasks(state);
 const ht=E.heroTaskStatus(state),heroTaskCard=`<section class="card"><span class="eyebrow">HERO TASKS · FANDOM / BABEL</span><h2>⚔ Nhiệm vụ tướng <span class="tag">${ht.completed}/${ht.max} hôm nay</span></h2><progress max="20" value="${ht.completed}"></progress><p class="hint">${ht.active?`<b>${esc(ht.heroName)}</b> cần thắng NPC <b>${ht.stars}★</b> bằng chính tướng đã nhận. ${ht.active.ready?'Đã hoàn thành, nhận EXP ngay.':'Đang chờ chiến thắng.'}`:ht.available?`Tướng đang chọn: <b>${esc(ht.heroName)}</b> · Nhiệm vụ tiếp: NPC <b>${ht.stars}★</b>.`:'Đã hoàn thành 20 lượt hôm nay.'}</p><div class="cost">${ht.available?'Thưởng cơ bản +'+format(ht.exp)+' EXP tướng · Hero Tower có thể cộng thêm':'Tổng 43.000 EXP cơ bản / ngày'}</div><div class="actions">${!ht.available?button('acceptherotask',{},'✓ Hết nhiệm vụ hôm nay',true,'secondary'):!ht.active?button('acceptherotask',{},'🎯 Nhận nhiệm vụ tướng',!ht.canAccept,'primary'):ht.active.ready?button('claimherotask',{},'🎁 Nhận EXP cho tướng',!main,'primary'):button('findherotask',{},'🗺 Tìm NPC '+ht.stars+'★',false,'primary')}</div><p class="tiny muted">Theo Fandom: 20 lượt/ngày, 1.200–3.100 EXP/lượt. Thứ tự 1★→2★→3★ là lựa chọn offline; giao tranh vẫn tốn AP/quân.</p></section>`;
 const international=`<h2>Quốc tế · nhiệm vụ cộng đồng</h2><p class="hint">Bảng này tách nhiệm vụ theo chủng tộc và nguồn cộng đồng. Kongregate mô tả Get Task/Get Reward (SRC52); “Getting Started” và nhiệm vụ Undead “Clean Up Remnants” lấy từ Fandom sống nhiều phiên bản (SRC30, SRC53; độ tin cậy C). SRC61 ghi riêng rằng Undead có thể nhận một quân đánh xa cấp 8 mỗi ngày năm 2009, nhưng không nêu đúng tên nhiệm vụ hay các phần thưởng.</p><div class="grid grid2">${tasks.map(t=>`<div class="card"><h2>${t.claimed?'✅ ':t.ready?'📩 ':'📜 '}${esc(t.nameVi)} <span class="tag">${t.name}</span></h2><p>Thắng bất kỳ trại NPC ${t.stars}★ trên bản đồ thế giới. Tiến độ ${t.progress}/1.</p><div class="cost">+${format(t.gold)} Vàng · tối đa +${t.ap} AP${t.rewardUnitId?` · +${t.rewardUnits} ${esc(E.getUnit(state,t.rewardUnitId)?.name||t.rewardUnitId)}`:''}</div><p class="tiny muted">Nguồn ${t.source} · độ tin cậy ${t.confidence}. Mốc reset UTC là mô hình offline; task nguồn Trung Quốc không nhập vào bảng này.</p>${t.claimed?button('claimdaily',{id:t.id},'✓ Đã nhận hôm nay',true,'primary'):!t.accepted?button('acceptdaily',{id:t.id},'📥 Nhận nhiệm vụ',!main||!t.available,'primary'):t.ready?button('claimdaily',{id:t.id},'🎁 Nhận thưởng',!main,'primary'):button('acceptdaily',{id:t.id},'Đang theo dõi · chờ chiến thắng',true,'secondary')}</div>`).join('')}</div><p class="tiny muted">Nhiệm vụ khác, Main/Holiday và toàn bộ lịch sử thưởng chưa được dựng. Save v07 cũ được nạp với bảng mới trống.</p>`;
 const chinese=china.length?`<section class="card"><span class="eyebrow">CHINA DAILY TASKS • SINA 2009</span><h2>Chuỗi nhiệm vụ Nhân tộc Trung Quốc 2009</h2><p class="hint">Bảng này tách riêng khỏi nhiệm vụ cộng đồng quốc tế. SRC54 ghi nhiệm vụ “招募弓箭手”: tuyển 20 Cung thủ, thưởng 100 Gỗ và 10 Cung thủ. FAQ SRC61 nói tăng mỗi bậc Danh vọng sẽ làm mới nhiệm vụ ngày; bậc được đối chiếu theo bảng Fame SRC20 (cùng năm nhưng khác ngày). Mốc reset UTC vẫn là mô hình offline; bản này không mô phỏng bảo trì máy chủ.</p>${china.map(t=>`<div class="card"><h3>${t.claimed?'✅ ':t.ready?'📩 ':'📜 '}${esc(t.nameVi)} <span class="tag">${t.name}</span></h3><p>Hoàn tất huấn luyện Cung thủ tại thành chính · ${t.progress}/${t.required}.</p><div class="cost">+${format(t.rewardWood)} Gỗ · +${t.rewardUnits} Cung thủ</div><p class="tiny muted">Nguồn: ${t.source}, Sina 24-08-2009 · độ tin cậy ${t.confidence}. Điều kiện “huấn luyện hoàn tất” là cách triển khai có thể chơi được; bài gốc chỉ nêu phải tuyển 20.</p>${t.claimed?button('claimdaily2009',{id:t.id},'✓ Đã nhận hôm nay',true,'primary'):!t.accepted?button('acceptdaily2009',{id:t.id},'📥 Nhận nhiệm vụ',!main,'primary'):t.ready?button('claimdaily2009',{id:t.id},'🎁 Nhận thưởng',!main,'primary'):button('acceptdaily2009',{id:t.id},'Đang theo dõi · hoàn tất huấn luyện',true,'secondary')}</div>`).join('')}</section>`:'';
 return hg30QuestView()+hg31GuideView()+`<h1>📜 Nhiệm vụ hằng ngày</h1>`+hg29GuideView()+hg27ExchangeView('troop')+hg18QuestView()+heroTaskCard+international+chinese;
}

function towerSpellPanel(b){
 const cards=(b.hg21Tower||b.hg261Joint).team.map(id=>{
  const hero=state.heroes.find(h=>h.id===id),spells=(hero?.equippedSpells||[]).filter(sid=>E.spell(state,sid)?.kind!=='castellan');
  const actions=spells.map(sid=>{const sp=E.spell(state,sid);if(!sp)return '';
   const wait=(b.heroSpellCooldown?.[id+':'+sid]||0)>b.turn,used=b.heroCastTurn?.[id]===b.turn;
   return button('tower-cast',{hero:id,id:sid},'✨ '+esc(sp.name)+' Lv'+(state.heroMagic[sid]||0),wait||used,'small secondary');
  }).join('')||'<span class="muted">Chưa trang bị phép</span>';
  return '<div class="card"><b>🧙 '+esc(hero?.name||'Tướng')+'</b> · '+b.allies.filter(u=>u.heroId===id).length+' stack '+actions+'</div>';
 }).join('');
 return '<div class="card hg04-spellbar"><span class="eyebrow">PHÉP RIÊNG CỦA TỪNG TƯỚNG</span><div class="hg04-spells">'+cards+'</div><p class="hint">Buff của tướng nào chỉ tác động các stack do tướng đó chỉ huy. Mỗi tướng dùng tối đa một phép/lượt.</p></div>';
}
function combatView(){
 if(!state.battle)return `<h1>⚔ Chiến đấu</h1><p>Hiện không có trận đánh.</p>${button('tab',{tab:'map'},'🗺 Trở lại thế giới')}`;
 const b=state.battle;
 const selected=b.allies.find(u=>u.id===b.selected),focused=b.enemies.find(u=>u.id===b.focused);
 const selectedMoveTarget=selected&&b.moveTargets?.[selected.id];
 const targetSummary=Object.entries(b.lastTargets||{}).map(([a,t])=>{
  const actor=[...b.allies,...b.enemies].find(x=>x.id===a),target=[...b.allies,...b.enemies].find(x=>x.id===t);
  return actor&&target?`${actor.name} → ${target.name}`:'';
 }).filter(Boolean).join(' · ');
 const aliveAllies=b.allies.filter(u=>u.pool>0).length,aliveEnemies=b.enemies.filter(u=>u.pool>0).length;
 const statLine=u=>u?`${format(u.count)} quân · ${format(Math.ceil(u.pool))} HP`:'';
 const realFriendly=[...new Set(b.allies.filter(u=>u.pool>0).map(u=>u.heroId??state.activeHero))]
  .map(id=>state.heroes.find(h=>h.id===id)).filter(Boolean).slice(0,3);
 const realEnemy=b.hg409EnemyCommander||null;
 const heroBadge=(h,side)=>h?'<div class="hg57-hero-chip '+side+'" title="'+esc(h.name)+' · Lv.'+(h.level||100)+'">'+
   hg45Portrait(h)+'<span class="hg57-hero-description"><b>'+esc(h.name)+'</b>'+
   '<small>Lv.'+(h.level||100)+' · '+(side==='enemy'?'Chỉ huy địch':'Tướng tham chiến')+'</small></span></div>':'';
 const enemyBadge=realEnemy?heroBadge(realEnemy,'enemy'):
  '<div class="hg57-hero-chip enemy hg57-npc-commander"><span class="hg57-enemy-mark">☠</span>'+
  '<span class="hg57-hero-description"><b>'+esc(b.name||'Đội phòng thủ')+'</b>'+
  '<small>Thủ lĩnh NPC · không tạo tướng ảo</small></span></div>';
 const leaders='<div class="hg57-commander-strip" aria-label="Tướng hai phe chiến trường" data-hg57-leaders>'+
  '<div class="hg57-leader-team" data-hg57-friendly>'+realFriendly.map(h=>heroBadge(h,'friendly')).join('')+'</div>'+
  '<span class="hg57-versus" aria-hidden="true">VS</span>'+
  '<div class="hg57-leader-team enemy" data-hg57-enemy>'+enemyBadge+'</div></div>';
 const moveAllowance=selected?E.battleMovePreview?.(b,selected.id)?.steps||0:0;

 const selectedName=selected?esc(selected.name):'Chạm quân ta trên chiến trường';
 const focusedName=focused?esc(focused.name):'Chạm quân địch để chọn mục tiêu';
 const eventText=e=>{
  const actor=[...b.allies,...b.enemies].find(u=>u.id===e.actorId),target=[...b.allies,...b.enemies].find(u=>u.id===e.targetId),name=actor?.name||'Đội quân',targetName=target?.name||'mục tiêu',moved=e.from.x!==e.to.x||e.from.y!==e.to.y;
  let text;
  if(e.order==='dot')text=`${name} chịu sát thương theo thời gian`;
  else if(e.order==='skill')text=`${name} kích hoạt ${e.skill||'kỹ năng'} lên ${targetName}`;
  else if(e.order==='stunned')text=`${name} bị choáng, không thể hành động`;
  else if(e.order==='defend')text=`${name} chờ lệnh (Stand By)`;
  else if(e.order==='retreat')text=moved?`${name} lùi về ô (${e.to.x+1}, ${e.to.y+1})`:`${name} không thể lùi vì ô phía sau bị chặn`;
  else if(e.order==='move')text=e.path.length?`${name} di chuyển ${e.path.length} ô tới (${e.to.x+1}, ${e.to.y+1})`:`${name} đã tới điểm đến`;
  else if(e.order==='advance')text=moved?`${name} tiến về phía ${targetName} (${e.path.length} ô)`:`${name} giữ vị trí trước ${targetName}`;
  else if(e.order==='focus')text=`${name} tập trung đánh ${targetName}`;
  else text=`${name} tấn công ${targetName}`;
  const result=[];
  if(e.damage>0)result.push(`${format(e.damage)} sát thương`);
  if(e.shieldAbsorbed>0)result.push(`🛡 Chắn ${format(e.shieldAbsorbed)} sát thương`);
  if(e.casualties>0)result.push(`${format(e.casualties)} quân tổn thất`);
  if(e.death)result.push('đội bị tiêu diệt');
  if(!result.length&&e.order==='defend')result.push('bỏ lượt');
  else if(!result.length&&e.order==='retreat'&&!moved)result.push('không đổi vị trí');
  else if(!result.length&&e.order==='move'&&!e.path.length)result.push('đã chạm đích');
  else if(!result.length&&e.path.length)result.push('Đang di chuyển vào tầm (KHÔNG ra đòn lượt này)');
  else if(!result.length&&e.targetId)result.push('Chưa gây sát thương (kiểm tra tầm đánh/trạng thái)');
  return {name,text,result:result.join(' · ')};
 };
 const lastEvents=b.lastEvents||[],visibleEvents=lastEvents.slice(0,8);
 const eventRow=e=>{const r=eventText(e);return `<li data-battle-event="${esc(e.actorId)}" data-order="${esc(e.order||'')}" class="battle-event"><span><b>${esc(r.name)}</b><span>${esc(r.text)}</span></span><small>${esc(r.result||'Không có thay đổi')}</small></li>`};
 const spellIds=(state.heroes.find(h=>h.id===state.activeHero)?.equippedSpells||[]).filter(id=>E.spell(state,id)?.kind!=='castellan');
 const spellButtons=spellIds.map(id=>{const sp=E.spell(state,id);if(!sp)return '';const wait=(b.spellCooldown?.[id]||0)>b.turn,used=b.castTurn===b.turn;return button('cast',{id},`✨ ${esc(sp.name)} Lv.${state.heroMagic[id]||0}${wait?' ⏳':''}`,wait||used,'small secondary')}).join('')||'<span class="muted">Chưa có phép trang bị</span>';
 const spells=(b.hg21Tower||b.hg261Joint)?towerSpellPanel(b):`<div class="hg04-spells">${spellButtons}</div><small class="battle-spell-state">${b.activeSpell?`Đang hiệu lực: ${esc(E.spell(state,b.activeSpell.id)?.name||'')} · hết lượt ${b.activeSpell.expiry}`:'Không có phép đang hiệu lực'} · tối đa 1 phép/lượt</small>`;
 const hg40History=(b.hg40?.lastSkills||[]).slice(-3).reverse().map(x=>
  '<div>✦ Lượt '+x.turn+': '+esc(x.detail)+'</div>').join('');
 const movementHint=movementModeId?'Chọn ô lục giác viền sáng để đặt điểm đến.':selectedMoveTarget?`Đang tiến tới ô (${selectedMoveTarget.x+1}, ${selectedMoveTarget.y+1}).`:'Chọn quân ta trên bàn cờ rồi đặt điểm đến.';
 const autoLabel=state.battleAuto?'Đang tự động':`Tự động sau ${Math.max(0,Math.ceil((b.autoUntil-Date.now())/1000))} giây`;
 const enemyCS=b.hg409EnemyCommander,enemyCSInfo=enemyCS?'<div class="hg409-combat-boss"><b class="hg408-quality-purple">♜ '+esc(enemyCS.name)+' · TÍM Lv100 · B5 · CS'+enemyCS.cs+'/10</b><span>ATK/DEF/SPD/INT 100/100/100/100; HP ×'+enemyCS.boost.hp+' · ATK ×'+enemyCS.boost.atk+' · DEF ×'+enemyCS.boost.def+'</span></div>':'';
 const hg50PhaseInfo=b.hg50b?.v===1?'<div class="hg50-phase-alert hg50-phase-'+esc(b.hg50b.phase)+'" role="status" data-hg50-combat-phase="'+esc(b.hg50b.phase)+'"><strong>⚠ CHUYỂN PHA BOSS</strong><span>'+esc(E.hg50PhaseLabel?.(b)||'')+'</span></div>':'';
 const hg410Info=b.hg410?.v===1?'<div class="hg410-combat-army">⚔ Đội hình thực: '+b.allies.length+' stack ta / '+b.hg410.enemyStacks+' stack địch ('+format(b.hg410.enemyTroops)+' quân địch). Neo hai cột đầu mỗi bên · cận chiến 1 ô, cung 4–5 ô.</div>':'';
 const bossRoster=b.hg410?.boss&&b.enemies.length>=12?
  '<details class="hg42-boss-roster"><summary>🎯 Chọn riêng 1 trong '+aliveEnemies+' stack Boss đang sống · chạm để chọn, rồi bấm Tập trung</summary>'+
  '<div class="hg42-boss-roster-grid">'+b.enemies.filter(u=>u.pool>0).map(u=>
   button('hg42-boss-focus',{id:u.id},'☠ '+u.id.toUpperCase()+' · '+esc(u.name)+' ×'+format(u.count),
    false,b.focused===u.id?'small primary':'small secondary')).join('')+'</div></details>':'';
 const hg40Info=b.hg40?.v===1?'<div class="hg40-readout" aria-label="Kỹ năng và trạng thái chiến thuật">'+
  '<span class="hg40-player">⚔ '+esc(E.hg40SkillText?.(b,selected)||'Chọn quân để xem kỹ năng')+
  ' · '+esc(E.hg40StatusText?.(b,selected)||'Không trạng thái')+'</span>'+
  '<span class="hg40-enemy">☠ '+esc(E.hg40StatusText?.(b,focused)||'Chưa chọn mục tiêu')+'</span></div>':'';
 return `<div class="scene-title combat-scene-title"><div><span class="eyebrow">CHIẾN TRƯỜNG • CHIẾN THUẬT</span><h1>Giao tranh · ${esc(b.name)}</h1></div><div class="scene-tools">${button('save-combat',{},'💾',false,'small secondary')}<span class="tag">Lượt ${b.turn} · ${aliveAllies} : ${aliveEnemies}</span></div></div>
 ${hg50PhaseInfo}
 <div class="battle-frame battle-stage${combatDockOpen?'':' battle-stage-collapsed'}">${leaders}<canvas id="battle-canvas" width="1176" height="550" aria-label="Chiến trường lục giác. Bấm vào quân ta để chọn đội, quân địch để chọn mục tiêu; ra lệnh di chuyển rồi chọn ô trống."></canvas>
  <details class="battle-command-dock" ${combatDockOpen?'open':''}>
   <summary title="Thu gọn hoặc mở bảng lệnh" aria-label="Thu gọn hoặc mở bảng lệnh chiến đấu"><span class="battle-dock-label">⚔ LỆNH</span><span class="battle-dock-chevron" aria-hidden="true">⌄</span></summary>
   <div class="battle-command-content">
    <div class="battle-selection-readout"><div class="battle-side-readout"><small>QUÂN TA</small><b>${selectedName}</b><span>${selected?esc(statLine(selected)):'Chạm quân ta trên bàn cờ'}</span>${combatEnergyHTML(b,selected)}</div><div class="battle-side-readout enemy"><small>MỤC TIÊU</small><b>${focusedName}</b><span>${focused?esc(statLine(focused)):movementModeId?'Chọn ô lục giác để di chuyển':'Bấm quân địch trên ô'}</span>${combatEnergyHTML(b,focused)}</div></div>
    ${hg40Info}${U43.battle(b,selected,focused||b.enemies.find(u=>u.pool>0)||null)}${enemyCSInfo}${hg410Info}${bossRoster}
    <div class="battle-auto-state" id="battle-auto-clock">${autoLabel}</div><div class="hg57-phase-and-move"><b id="hg57-phase">PHE TA → PHE ĐỊCH</b><span id="hg57-move-steps">${selected?("Di chuyển: "+moveAllowance+" ô/lượt · Tầm đánh: "+selected.range+" ô"):"Chọn quân để xem tốc độ và tầm đánh"}</span></div>
    <div class="hg58-combat-speed" role="group" aria-label="Tốc độ xem hoạt ảnh">🌪 Tốc độ trận ${[1,2,3].map(v=>'<button type="button" data-action="combat-speed" data-speed="'+v+'" aria-pressed="'+(battleViewPrefs.speed===v)+'" title="Chỉ thay đổi tốc độ hiển thị, không đổi sát thương">×'+v+'</button>').join('')}<small>Chỉ hoạt ảnh · không đổi chỉ số</small></div>
    <div class="battle-display-tools" role="group" aria-label="Tùy chọn chiến trường"><button type="button" class="battle-display-toggle" data-action="battle-grid" aria-pressed="${battleViewPrefs.grid}" title="Hiện hoặc ẩn lưới lục giác">${battleViewPrefs.grid?'⬡ Lưới':'⬡ Lưới tắt'}</button><button type="button" class="battle-display-toggle" data-action="battle-hp" aria-pressed="${battleViewPrefs.hp}" title="Hiện hoặc ẩn thanh máu">${battleViewPrefs.hp?'♥ Máu':'♡ Máu tắt'}</button><button type="button" class="battle-display-toggle" data-action="battle-labels" aria-pressed="${battleViewPrefs.labels}" title="Hiện hoặc ẩn tên quân và quái vật">${battleViewPrefs.labels?'Aa Tên':'Aa Ẩn tên'}</button></div>
    <div class="battle-action-grid">${button('auto',{},state.battleAuto?'⏸ DỪNG TỰ ĐÁNH':'▶ TỰ ĐÁNH',false,'auto secondary')}${button('battle',{cmd:'attack'},'⚔ ĐÁNH',false,'primary')}${button('battle',{cmd:'advance'},'↗ TIẾN',false,'secondary')}${button('move-mode',{},movementModeId?'✕ HỦY Ô':selectedMoveTarget?'↗ ĐỔI ĐÍCH':'⌖ ĐẶT ĐÍCH',!selected||selected.pool<=0,'secondary')}${button('battle',{cmd:'defend'},'🛡 CHỜ',false,'secondary')}${button('battle',{cmd:'focus'},'🎯 TẬP TRUNG',false,'secondary')}${button('battle',{cmd:'retreat'},'↙ LÙI',false,'secondary')}</div>
    <p class="battle-move-prompt" id="battle-move-prompt">${movementHint}</p>
    <details class="battle-spell-fold"><summary>✨ Phép chiến đấu · ${spellIds.length||((b.hg21Tower||b.hg261Joint)?'tướng':'0')}</summary><div>${spells}</div></details>
   </div>
  </details>
 </div>
 <details class="battle-report-fold"><summary>📜 Diễn biến lượt ${Math.max(0,b.turn-1)} · ${lastEvents.length} hành động</summary><section class="battle-receipts" aria-label="Kết quả hành động lượt vừa qua" data-battle-receipts><div class="battle-receipts-heading"><h2>LƯỢT ${Math.max(0,b.turn-1)}</h2><span>${lastEvents.length} hành động</span></div>${lastEvents.length?`<ol class="battle-event-list">${visibleEvents.map(eventRow).join('')}</ol>${lastEvents.length>8?`<details class="battle-event-more"><summary>Xem ${lastEvents.length-8} hành động còn lại</summary><ol class="battle-event-list">${lastEvents.slice(8).map(eventRow).join('')}</ol></details>`:''}`:'<p class="battle-receipts-empty">Biên nhận sẽ hiện sau khi lượt đầu phân giải.</p>'}</section><div class="combat-journal">${hg40History}${b.history.slice(0,3).map(l=>`<div>• ${esc(l)}</div>`).join('')}</div><p class="hint">Thứ tự lượt trước: ${(b.lastActOrder||[]).map(id=>[...b.allies,...b.enemies].find(u=>u.id===id)?.name).filter(Boolean).map(esc).join(' → ')||'Chưa có'} · AI: ${esc(targetSummary||'Chưa có')}.</p><p class="hint">Thứ tự: phe ta đi và đánh hết, sau đó phe địch mới phản công. SPD xếp lượt trong mỗi phe; cận chiến thường đi 1–2 ô. Chỉ số và AI vẫn đang mô phỏng.</p></details>`;
}
function sourceView(){return `<section class="hg28-source-view"><header class="hg28-source-hero"><span class="eyebrow">HEROES OF GAIA · CASTLE OF HEROES · 英雄之城</span><h1>📚 Tư liệu game gốc</h1><p>Chỉ nghiên cứu Heroes of Gaia 2009–2010. Đồ họa và engine của bản này được tạo độc lập.</p><div class="hg28-source-facts"><span><b>4</b> chủng tộc</span><span><b>40</b> binh chủng</span><span><b>5</b> tài nguyên</span><span><b>v07</b> save</span></div></header><div class="hg28-source-grid"><details class="hg28-source-fold"><summary>✓ Dữ liệu đã xác minh</summary><ul><li>Bốn chủng tộc; 40 quân, 10 bậc/chủng tộc.</li><li>Năm tài nguyên gold, lumber, ore, sulfur, crystal.</li><li>Town Hall, Barracks, Graveyard cho Undead, Tavern, Hero Tower, Arena, Warehouse, Magic Tower.</li><li>AP tối đa 150–700 và hồi 15–70/giờ theo hạng Fame (bảng rank 2009, SRC20); mỏ tài nguyên tiêu tốn 6 AP.</li><li>Các phép thành trì ghi trong catalog.</li></ul></details><details class="hg28-source-fold"><summary>◷ Các điểm đang mô phỏng</summary><ul><li>Giá và thời gian nâng công trình; cấp mở quân phụ và thời gian tuyển.</li><li>Xác suất/giá tướng, AI và sức mạnh NPC. Tavern làm mới mỗi giờ (SRC48); L6–L9 có một ứng viên xanh theo mô hình định tính.</li><li>Bonus mỏ, quà chiến đấu, tiêu hao và thời gian di chuyển.</li><li>Giá/tỷ lệ rơi trang bị, vị trí bản đồ, đa thành, PvP và multiplayer.</li></ul></details></div><details class="hg28-source-fold hg28-source-links"><summary>🔎 Mở danh mục nguồn lịch sử</summary><div class="source-links"><a href="https://heroesofgaia.wikidot.com/game-units" target="_blank" rel="noopener">Bảng 40 quân · Wikidot 2009</a><a href="https://heroesofgaia.wikidot.com/game-buildings" target="_blank" rel="noopener">Công trình</a><a href="https://games.sina.com.cn/o/z/yxzc/2009-08-24/0019346777.shtml" target="_blank" rel="noopener">Undead · Sina 2009</a><a href="https://heroesofgaia.wikidot.com/heroes-action" target="_blank" rel="noopener">AP & hành quân</a><a href="https://heroesofgaia.wikidot.com/game-spells" target="_blank" rel="noopener">Phép thuật</a><a href="https://heroesofgaia.wikidot.com/game-combat" target="_blank" rel="noopener">Chiến đấu</a><a href="https://web.17173.com/content/2009-10-25/1256486243.shtml" target="_blank" rel="noopener">Tavern · 17173 2009</a></div><p class="tiny muted">Wikidot ghi công nguồn và dẫn link; giấy phép CC BY-SA 3.0 được nêu trong SOURCES.md. Tư liệu tham khảo không bao gồm asset gốc.</p></details></section>`;}
function paint(){
 if(!state)return;
 if(tab==='map'||(tab!=='combat'&&$('world-canvas'))){const canvas=$('world-canvas');if(!canvas)return;
  const draw=()=>{const rect=canvas.getBoundingClientRect();const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    P.drawWorld(canvas,E,state,selected)};draw();
  let down=null,dragging=false;
  canvas.onpointerdown=e=>{down={x:e.clientX,y:e.clientY};dragging=false;canvas.setPointerCapture(e.pointerId)};
  canvas.onpointermove=e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>4)dragging=true;
   if(dragging){const rect=canvas.getBoundingClientRect(),unit=P.mapCamera().zoom*48;P.panMap(dx*canvas.width/rect.width/unit,dy*canvas.height/rect.height/unit,E.WIDTH,E.HEIGHT);draw();down={x:e.clientX,y:e.clientY}}};
  canvas.onpointerup=e=>{if(down&&!dragging){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;const mini=P.miniHit(canvas,x,y,E);if(mini){Object.assign(P.mapCamera(),{centerX:mini.x,centerY:mini.y});selected=mini.key;selectedTargetKind=null;render();return}const t=P.mapHit(canvas,x,y,E);if(t){selected=t.key;selectedTargetKind=null;render();return}}down=null;};
  // A phone call, orientation change or interrupted touch must not leave
  // the map in a phantom drag state after the browser cancels the pointer.
  canvas.onpointercancel=()=>{down=null;dragging=false};
  canvas.onlostpointercapture=()=>{down=null;dragging=false};
  canvas.onwheel=e=>{e.preventDefault();P.zoomMap(e.deltaY>0?.9:1.1);draw()};
 }if(tab==='city'){const canvas=$('city-canvas');P.drawCity(canvas,E,state,selectedBuilding);
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),key=P.cityHit(canvas,(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height);if(key){selectedBuilding=key;render()}};
 }else if(tab==='combat'){
  const canvas=$('battle-canvas'),interaction={movementModeId,showGrid:battleViewPrefs.grid,showHP:battleViewPrefs.hp,showLabels:battleViewPrefs.labels};
  const dock=document.querySelector('.battle-command-dock');if(dock)dock.addEventListener('toggle',()=>{combatDockOpen=dock.open;dock.closest('.battle-stage')?.classList.toggle('battle-stage-collapsed',!dock.open)});
  // Match the canvas backing aspect to the rendered frame. The prior fixed
  // 1176x550 surface was squeezed into 960x540 landscape CSS, distorting the
  // art, soldier silhouettes and square ground cells non-uniformly.
  const rect=canvas.getBoundingClientRect();
  if(rect.width>0&&rect.height>0){
   canvas.width=Math.max(1,Math.round(rect.width));
   canvas.height=Math.max(1,Math.round(rect.height));
  }
  const drawCombatFrame=now=>{
   interaction.movementModeId=movementModeId;
   interaction.showGrid=battleViewPrefs.grid;
   interaction.showHP=battleViewPrefs.hp;
   interaction.showLabels=battleViewPrefs.labels;
   const virtualTime=combatVisualNow(now);
   P.drawBattle(canvas,E,state,virtualTime,interaction);
   const phase=$('hg57-phase'),visual=P.battleVisualPhase?.(state.battle,virtualTime);
   const label=visual?.side==='enemy'?'☠ PHE ĐỊCH ĐANG HÀNH ĐỘNG':visual?.side==='player'?'⚔ PHE TA ĐANG HÀNH ĐỘNG':'PHE TA → PHE ĐỊCH';
   if(phase&&phase.textContent!==label)phase.textContent=label;
  };
  drawCombatFrame(performance.now());
  if(P.hasAnimatedTroops(state.battle)){
   const battle=state.battle;
   let lastRaf=0,rafPeriod=0,samples=0,rafCount=0,stride=1,lastPaint=-Infinity;
   // On touch/compact phones, painting a full fantasy battle at 60Hz
   // wastes CPU/GPU and heats the device. Preserve 60/75Hz desktop cadence;
   // the canonical auto-combat clock, frame timeline and Save are unchanged.
   const denseBoss=!!state.battle?.hg410?.boss&&state.battle.hg410.enemyStacks>=12;
   const touchOrCompact=(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)||
     (innerWidth<=960&&innerHeight<=480);
   // HG57-B measured 22-actor Chromium draw p95 < 1ms while the OLD
   // 40ms/20ms caps produced only ~19.5fps touch and ~29fps desktop on
   // 60Hz: 16.7ms RAF rounding skips two refreshes. 29ms gives ~30fps
   // touch; 14ms admits ~60fps desktop when the device keeps up.
   // Real slower devices naturally throttle via their actual RAF cadence.
   // No extra RAF, AI tick, skill receipt, reward or Save mutation.
   const mobilePaintMinMs=denseBoss?(touchOrCompact?29:14):(touchOrCompact?29:0);
   // 60Hz-threshold filtering used to alias 75Hz monitors to ~37.5Hz:
   // each 13.3ms RAF failed a 14.7ms test, so only every OTHER refresh
   // was painted. Instead paint every native refresh up to ~100Hz; on
   // 120/144/165/240Hz monitors skip uniformly by an integer stride.
   // Never rewrite canonical turn clocks or insert a second animation loop.
   const animate=now=>{
    if(!state||state.battle!==battle||$('battle-canvas')!==canvas)return;
    if(lastRaf){
     const gap=now-lastRaf;
     if(gap>=3&&gap<=36){
      rafPeriod=rafPeriod?rafPeriod*.9+gap*.1:gap;
      samples++;
      if(samples===10||samples%120===0)stride=battleRenderStride(rafPeriod);
     }
    }
    lastRaf=now;
    if(rafCount++%stride===0&&(!mobilePaintMinMs||now-lastPaint>=mobilePaintMinMs)){
     drawCombatFrame(now);lastPaint=now;
    }
    requestAnimationFrame(animate);
   };
   requestAnimationFrame(animate);
  }
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
    const grid=E.BATTLE_GRID||{cols:12,rows:9,top:173,bottom:185};
    if(movementModeId){const cell=P.battleCellAt(canvas,x,y,E);if(!cell){toast('Hãy chọn một ô nằm trong lưới chiến trường.');return}fail(()=>{markBattleInput();const out=E.battleAct(state,'move',{x:cell.x,y:cell.y});movementModeId=null;const move=state.battle?.lastMoves?.find(m=>m.unitId===state.battle.selected);if(move)toast(`${state.battle.allies.find(u=>u.id===move.unitId)?.name||'Đội quân'} di chuyển ${move.steps} ô tới (${move.to.x}, ${move.to.y}).`);if(out.type==='win'){tab='map';toast('Chiến thắng!')}else if(out.type==='lose'){tab='heroes';toast('Thất bại, có thể chữa thương.')}else if(out.type==='retreat'||out.type==='timeout'){tab='map';toast('Đã kết thúc giao tranh.')}});return}
    const target=P.battleHit(canvas,x,y,E,state,combatVisualNow());
    if(target)fail(()=>{markBattleInput();E.battleSelect(state,target.id)});};
 }
}
// HG42: real Save / export / import / speed / reset buttons must remain
// reachable inside every full-stage screen. Move the original DOM controls,
// never duplicate them or their onclick handlers. Restore before rerendering.
let hg42ScreenToolbar=null;
function restoreScreenToolbar(){
 const q=hg42ScreenToolbar;if(!q)return;
 q.group.insertBefore(q.save,q.group.firstChild);
 if(q.marker.parentNode)q.marker.parentNode.insertBefore(q.group,q.marker);
 q.marker.remove();q.toolbar.remove();hg42ScreenToolbar=null;
}
function attachScreenToolbar(){
 if(!state||state.battle||tab==='map')return;
 const group=document.querySelector('.sidebar .buttons'),
  head=document.querySelector('.game-window-head'),close=head?.querySelector('[data-action="modal-close"]'),
  saveButton=group?.querySelector('#save');
 if(!group||!head||!saveButton||!close)return;
 const marker=document.createComment('HG42 original screen controls');
 group.parentNode.insertBefore(marker,group);
 const toolbar=document.createElement('div');toolbar.className='hg42-screen-utility';
 const menu=document.createElement('details');menu.className='hg42-screen-tool-menu';
 const summary=document.createElement('summary');
 summary.textContent='⚙';summary.title='Sao lưu, khôi phục, tốc độ và chơi lại';
 summary.setAttribute('aria-label','Mở công cụ game');
 menu.append(summary);menu.append(group);
 toolbar.append(saveButton,menu);
 head.insertBefore(toolbar,close);
 hg42ScreenToolbar={group,marker,toolbar,save:saveButton};
}
let hg39DockMoves=[];
let hg39MapDetailsOpen={};
function restoreWorldMapLayout(){
 for(const details of document.querySelectorAll('.hg39-map-dock .hg39-map-details')){const key=details.dataset.hg39Drawer;if(key)hg39MapDetailsOpen[key]=details.open}
 for(const {node,marker} of hg39DockMoves.reverse())if(marker.parentNode){marker.parentNode.insertBefore(node,marker);marker.remove()}
 hg39DockMoves=[];document.querySelector('.hg39-map-dock')?.remove();
 document.body.classList.remove('hg39-world-map-mode');
}
function enhanceWorldMapLayout(){
 if(tab!=='map'||state?.battle||dispatchDraft||showWorldIndex||showResourceInfo)return;
 const main=$('main'),wrap=main?.parentElement,sidebar=document.querySelector('.sidebar');if(!main||!wrap||!sidebar)return;
 const dock=document.createElement('aside');dock.className='hg39-map-dock';dock.setAttribute('aria-label','Điều khiển bản đồ');
 const controls=document.createElement('div');controls.className='hg39-map-tools';
 const title=main.querySelector('.scene-title'),tools=title?.querySelector('.scene-tools');
 const move=(node,parent)=>{if(!node)return;const marker=document.createComment('hg39-map-position');node.parentNode.insertBefore(marker,node);hg39DockMoves.push({node,marker});parent.append(node)};
 const addDetails=(node,label,open=false)=>{if(!node)return;const details=document.createElement('details');details.className='hg39-map-details';details.dataset.hg39Drawer=label;details.open=hg39MapDetailsOpen[label]??open;const summary=document.createElement('summary');summary.textContent=label;details.append(summary);dock.append(details);move(node,details)};
 if(tools)move(tools,controls);dock.append(controls);
 const target=main.querySelector('.scene-bottom .target-information');if(target){const card=document.createElement('section');card.className='hg39-map-target';dock.append(card);move(target,card)}
 // Move the New Game checklist off the playable map ONLY for short-screen
 // landscape phones; it stays accessible in the expandable command rail.
 if(typeof matchMedia==='function'&&matchMedia('(max-width:950px) and (max-height:500px) and (orientation:landscape)').matches)
  addDetails(main.querySelector('[aria-label="Lộ trình phát triển New Game"]'),'🌱 Tân thủ');
 addDetails(main.querySelector('.quickstart-strip'),'Tác vụ nhanh');
 addDetails(main.querySelector('.scene-bottom .landmarks'),'Điểm đến & tọa độ');
 addDetails(main.querySelector('.city-switcher'),'Thành trì');
 for(const [selector,label] of [['.city-transfer','Chuyển thành'],['.city-transport-ledger','Vận tải'],['.banner','Đạo quân hiện tại'],['.expedition-ledger','Các đạo quân']])addDetails(main.querySelector(selector),label);
 const actionButtons=sidebar.querySelector('.buttons');if(actionButtons){const utility=document.createElement('div');utility.className='hg39-map-utility';dock.append(utility);move(actionButtons,utility)}
 wrap.append(dock);document.body.classList.add('hg39-world-map-mode');
 document.body.classList.toggle('hg40-map-expanded',mapExpanded);
}
function render(){
 // HG49 visual faction palette only; never stored in Save v07.
 document.body.dataset.hg49Race=['human','elf','orc','undead'].includes(state?.race)?state.race:'human';
 restoreScreenToolbar();
 restoreWorldMapLayout();
 const enteringCombat=!!state?.battle&&!document.body.classList.contains('combat-mode');
 if(enteringCombat)combatDockOpen=true;
 document.body.classList.toggle('combat-mode',!!state?.battle);
 document.body.classList.toggle('hg42-boss-screen-open',!!state&&!state.battle&&tab==='boss');
 // Each management route is its own full-stage view, instead of a narrow
 // floating card with the world map visible underneath. Presentation only.
 document.body.classList.toggle('hg42-management-screen-open',!!state&&!state.battle&&tab!=='map'&&tab!=='boss');
 const overlay=$('game-modal'),body=$('game-modal-body');
 const existingArmyOps=body?.querySelector('.hg28-army-ops:not(.hg28-army-quest)');if(existingArmyOps)armyOpsOpen=existingArmyOps.open;
 const existingArmyQuest=body?.querySelector('.hg28-army-quest');if(existingArmyQuest)armyQuestOpen=existingArmyQuest.open;
 if(!state){overlay.hidden=true;showWorldIndex=false;document.body.classList.remove('window-open');renderIntro();return}
 if(!state.battle){movementModeId=null;if(tab==='combat')tab='map'}
 if(state.battle){tab='combat';showWorldIndex=false;showResourceInfo=false}
 renderHUD();
 // HG42: nav position varies with resources, viewport and device rotation.
 // Derive the management/Boss stage top from its ACTUAL lower edge rather than
 // guessing 68/100/145px. Separate screen controls must never sit under tabs.
 if(!state.battle&&tab!=='map'){
  const navBottom=$('nav')?.getBoundingClientRect().bottom||96;
  document.body.style.setProperty('--hg42-stage-top',Math.ceil(Math.max(55,navBottom+5))+'px');
 }
 const popup=!!dispatchDraft||tab!=='map'&&tab!=='combat'||tab==='map'&&(showWorldIndex||showResourceInfo);
 const content=dispatchDraft?dispatchView():tab==='map'?mapView():tab==='city'?cityView():tab==='army'?armyView():tab==='heroes'?hg408HeroesView():tab==='magic'?magicView():tab==='relics'?relicView():tab==='boss'?bossView():tab==='tower'?towerView():tab==='combat'?combatView():tab==='tasks'?tasksView():tab==='reports'?battleReportsView():sourceView();
 if(popup){
  $('main').innerHTML=mapView();
  $('game-modal-title').textContent=dispatchDraft?'🚩 Chọn tướng & quân':showResourceInfo&&tab==='map'?'💰 Tài nguyên & kho':showWorldIndex&&tab==='map'?'📍 Danh sách điểm đến':tabs.find(x=>x[0]===tab)?.[1]||'Quản lý';
  body.innerHTML=dispatchDraft?content:showResourceInfo&&tab==='map'?'<div class="grid grid3">'+C.keys.map(k=>{
   const limit=E.limits(state)[k],rate=E.rate(state)[k];
   return '<div class="card"><h2>'+esc(C.resource[k].label)+'</h2><strong>'+format(state.res[k])+' / '+format(limit)+'</strong><p class="hint">+'+format(rate)+' mỗi giờ game</p><progress max="'+limit+'" value="'+state.res[k]+'"></progress></div>';
  }).join('')+'</div>':showWorldIndex&&tab==='map'?$('main').querySelector('.landmarks')?.outerHTML||'':`<div class="hg28-tab hg28-tab-${tab}" data-hg28-screen="${tab}">${content}</div>`;
  overlay.hidden=false;document.body.classList.add('window-open');
  body.scrollTop=modalOffset;
  // At 960x540 the modal's visible height is small. Open the Army tab on its
  // first actionable troop card, leaving status/tasks accessible by scrolling
  // upward. Re-renders preserve the user's current scroll position.
  if(tab==='army'&&focusArmyRecruitOnOpen){
   const first=body.querySelector('.hg28-tab-army .unitrow');
   if(first){
    const bodyBox=body.getBoundingClientRect(),rowBox=first.getBoundingClientRect();
    body.scrollTop+=rowBox.top-bodyBox.top-5;
   }
   focusArmyRecruitOnOpen=false;
  }
 }else{
  overlay.hidden=true;body.innerHTML='';document.body.classList.remove('window-open');
  $('main').innerHTML=(tab==='map'?newPlayerGuide():'')+content;
 }
 enhanceWorldMapLayout();
 attachScreenToolbar();
 paint();
 hg63ShowReport();
 if(enteringCombat){$('toast')?.classList.remove('show');window.scrollTo({top:0,left:0,behavior:'instant'});}
}
$('app').addEventListener('input',evt=>{
 const field=evt.target;if(!field?.id?.startsWith('q_'))return;
 const id=field.id.slice(2),qty=Number(field.value);
 if(Number.isSafeInteger(qty)&&qty>=1)recruitDrafts.set(id,qty);else recruitDrafts.delete(id);
 hg35UpdateRecruitQuote(id);
});
$('app').addEventListener('change',evt=>{
 const field=evt.target,slot=Number(field?.dataset?.dispatchSlot);
 if(!dispatchDraft||!field?.hasAttribute('data-dispatch-slot')||!Number.isSafeInteger(slot))return;
 const hero=state.heroes.find(h=>h.id===dispatchDraft.heroId),form=dispatchDraft.form||[],group=form[slot];
 if(!hero||!group)return;
 const held=E.hg20Reservations(state,hero.id),other=form.filter((_,i)=>i!==slot),
  already=other.filter(g=>g.unitId===group.unitId).reduce((n,g)=>n+g.count,0),
  free=Math.max(0,(state.army[group.unitId]||0)-(held[group.unitId]||0)-already),
  weight=E.unitValue(E.getUnit(state,group.unitId)),
  remaining=Math.max(0,E.heroLimit(hero.level,hero)-E.formationPoints(state,other));
 const count=Math.min(free,Math.floor(remaining/weight),Math.max(0,Math.floor(Number(field.value)||0)));
 if(count>0)group.count=count;else form.splice(slot,1);
 field.value=count?String(count):'0';syncDispatchDraftUI();
});
$('app').addEventListener('click',evt=>{const target=evt.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
 if(action==='modal-page'){
  // A half-window step preserves full visibility of neighboring troop artwork
  // (T9/T10 on compact 960x540) instead of jumping past their shared row.
  const body=$('game-modal-body');const dir=Number(target.dataset.dir)||1;body.scrollTop=Math.max(0,Math.min(body.scrollHeight-body.clientHeight,body.scrollTop+dir*body.clientHeight*.45));modalOffset=body.scrollTop;return;}
 if(action==='modal-backdrop'){if(evt.target===target){showWorldIndex=false;showResourceInfo=false;dispatchDraft=null;tab='map';modalOffset=0;render();}return;}
 if(action==='recruit-max'){
  const id=target.dataset.id,qty=E.recruitMax(state,id),input=$('q_'+id);
  if(input){input.value=String(qty);recruitDrafts.set(id,qty);hg35UpdateRecruitQuote(id)}
  return;
 }
 if(action==='city-inspector'){
  const inspector=$('hg35-city-inspector');
  if(inspector)inspector.scrollIntoView({block:'start',behavior:'instant'});
  return;
 }
 if(action==='city-service'){
  const section=$('city-'+target.dataset.key+'-service');
  if(section)section.scrollIntoView({block:'center',behavior:'instant'});
  return;
 }
 if(action==='battle-grid'||action==='battle-hp'||action==='battle-labels'){
  const which=action==='battle-grid'?'grid':action==='battle-hp'?'hp':'labels';
  toggleBattleDisplay(which);
  const button=document.querySelector('.battle-command-dock [data-action="'+action+'"]');
  if(button){
   button.setAttribute('aria-pressed',String(battleViewPrefs[which]));
   button.textContent=which==='grid'?(battleViewPrefs.grid?'⬡ Lưới':'⬡ Lưới tắt'):
    which==='hp'?(battleViewPrefs.hp?'♥ Máu':'♡ Máu tắt'):(battleViewPrefs.labels?'Aa Tên':'Aa Ẩn tên');
  }
  // The continuously running RAF sees updated interaction preferences.
  if(!$('battle-canvas'))render();
  return;
 }
 fail(()=>{
 if(action==='hg43-army-page'){
  if(tab!=='army'||!['recruit','codex'].includes(target.dataset.page))throw Error('Trang quân đội không hợp lệ');
  hg43ArmyPage=target.dataset.page;hg43ArmyRace=state.race;focusArmyRecruitOnOpen=false;modalOffset=0;return;
 }
 if(action==='hg43-army-race'){
  if(tab!=='army'||hg43ArmyPage!=='codex'||!C.units[target.dataset.race])throw Error('Chủng tộc hồ sơ không hợp lệ');
  hg43ArmyRace=target.dataset.race;modalOffset=0;return;
 }
 if(action==='hg42-boss-focus'){
  if(!state.battle?.hg410?.boss)throw Error('Không có Boss đang giao tranh');
  markBattleInput();E.battleSelect(state,target.dataset.id);return;
 }
 if(action==='hg408-inspect'){hg408InspectId=Number(target.dataset.id);hg408DismissFor=null;hg408DismissStage=0;return}
 if(action==='hg408-tab'){hg408Tab=target.dataset.id;hg408DismissFor=null;hg408DismissStage=0;modalOffset=0;return}
 if(action==='hg408-dismiss-review'){hg408InspectId=Number(target.dataset.id);hg408DismissFor=hg408InspectId;hg408DismissStage=1;return}
 if(action==='hg408-dismiss-cancel'){hg408DismissFor=null;hg408DismissStage=0;return}
 if(action==='hg408-dismiss-next'){if(!E.hg408DismissCheck(state,Number(target.dataset.id)).allowed)throw Error('Tướng không đủ điều kiện sa thải.');hg408DismissStage=2;return}
 if(action==='hg408-dismiss-apply'){const result=E.hg408DismissHero(state,Number(target.dataset.id));hg408InspectId=result.activeHero;hg408DismissFor=null;hg408DismissStage=0;toast('Đã sa thải '+result.name+'; trang bị giữ nguyên trong kho.');return}
 if(action==='hg46-filter'){hg46GearFilter=target.dataset.slot||'all';hg46GearPage=0;return}
 if(action==='hg46-page'){hg46GearPage=Math.max(0,hg46GearPage+Number(target.dataset.direction||0));return}
 if(action==='hg46-auto'){const result=E.hg46AutoEquip(state,Number(target.dataset.id),target.dataset.mode);
  toast(result.applied?'Đã chọn bộ trang bị từ kho thực; thay '+result.changed+' ô.':'Bộ đang mặc đã phù hợp.');return}
 if(action==='hg46-salvage'){const uid=Number(target.dataset.uid),row=state.inventory.find(i=>i.uid===uid);
  const reward=E.hg46SalvagePreview(state,uid);
  if(!row||!reward||!confirm('Phân giải vĩnh viễn '+(E.ITEMS[row.itemId]?.name||'trang bị')+' #'+uid+'? Nhận '+reward.stones+' đá'+(reward.astralShards?' + '+reward.astralShards+' mảnh Tinh Vân':'')+'. Không thể hoàn tác.'))return;
  E.salvageHG18(state,uid);toast('Phân giải thành công, nguyên liệu về kho.');return}
 if(action==='hg46-open-gear'){tab='heroes';hg408Tab='gear';hg408InspectId=state.activeHero;return}
 if(action==='hg408-equip'){E.equipItem(state,Number(target.dataset.uid),Number(target.dataset.id));return}
 if(action==='hg408-unequip'){E.unequipItem(state,target.dataset.slot,Number(target.dataset.id));return}
 if(action==='modal-close'||action==='dispatch-close'){showWorldIndex=false;showResourceInfo=false;dispatchDraft=null;tab='map';modalOffset=0;return}
 if(action==='dispatch-open'){
  const heroId=state.activeHero;if(!selected)throw Error('Chọn mục tiêu trên bản đồ trước.');
  dispatchDraft={targetKey:selected,kind:target.dataset.kind||selectedTargetKind||null,heroId,
   form:E.hg20HeroPlan(state,heroId).map(g=>({...g}))};
  showWorldIndex=false;showResourceInfo=false;modalOffset=0;return;
 }
 if(action==='dispatch-select-hero'){
  const heroId=Number(target.dataset.id);E.selectHero(state,heroId);dispatchDraft.heroId=heroId;
  dispatchDraft.form=E.hg20HeroPlan(state,heroId).map(g=>({...g}));return;
 }
 if(action==='dispatch-add-unit'){
  const unitId=$('hg39-dispatch-unit')?.value,hero=state.heroes.find(h=>h.id===dispatchDraft?.heroId);
  if(!unitId||!hero)throw Error('Chọn loại quân và tướng trước.');
  if(dispatchDraft.form.length>=7)throw Error('Đội hình tối đa 7 nhóm.');
  const held=E.hg20Reservations(state,hero.id),already=dispatchDraft.form.filter(g=>g.unitId===unitId).reduce((n,g)=>n+g.count,0),available=Math.max(0,(state.army[unitId]||0)-(held[unitId]||0)-already);
  if(available<1)throw Error('Không còn quân rảnh thuộc thành này.');
  dispatchDraft.form.push({unitId,count:1});return;
 }
 if(action==='dispatch-adjust'){
  const index=Number(target.dataset.slot),form=dispatchDraft?.form||[],group=form[index];
  if(!Number.isSafeInteger(index)||!group)throw Error('Slot quân không còn tồn tại.');
  const hero=state.heroes.find(h=>h.id===dispatchDraft.heroId),held=E.hg20Reservations(state,hero.id),
   others=form.filter((_,i)=>i!==index),taken=others.filter(g=>g.unitId===group.unitId).reduce((n,g)=>n+g.count,0),
   available=Math.max(0,(state.army[group.unitId]||0)-(held[group.unitId]||0)-taken),
   byPoints=Math.floor(Math.max(0,E.heroLimit(hero.level,hero)-E.formationPoints(state,others))/E.unitValue(E.getUnit(state,group.unitId)));
  if(Math.min(available,byPoints)<1)throw Error('Không đủ sức chỉ huy hoặc quân rảnh.');
  group.count=Math.max(1,Math.min(available,byPoints,group.count+Number(target.dataset.delta||0)));return;
 }
 if(action==='dispatch-remove'){
  const index=Number(target.dataset.slot);
  if(!Number.isSafeInteger(index)||index<0||index>=dispatchDraft.form.length)throw Error('Slot quân không hợp lệ');
  dispatchDraft.form.splice(index,1);return;
 }
 if(action==='dispatch-auto'){
  const heroId=dispatchDraft.heroId;if(state.activeHero!==heroId)E.selectHero(state,heroId);
  dispatchDraft.form=E.autoFormation(state).formation.map(g=>({...g}));return;
 }
 if(action==='dispatch-save'){
  const saved=E.hg20SetHeroPlan(state,dispatchDraft.heroId,dispatchDraft.form);
  toast('Đã lưu '+format(saved.total)+' quân · '+format(saved.points)+' điểm chỉ huy cho tướng.');return;
 }
 if(action==='dispatch-confirm'){
  const draft=dispatchDraft,heroId=draft.heroId;
  if(state.activeHero!==heroId)E.selectHero(state,heroId);
  E.hg20SetHeroPlan(state,heroId,draft.form);
  const units=draft.form.reduce((n,g)=>n+g.count,0),targetKey=draft.targetKey;
  E.startMarch(state,targetKey,draft.kind==='treasure'?'treasure':undefined);
  dispatchDraft=null;tab='map';modalOffset=0;
  toast((state.heroes.find(h=>h.id===heroId)?.name||'Tướng')+' xuất chinh cùng '+format(units)+' quân.');return;
 }
 if(action==='hg42-boss-screen'){
  const id=target.dataset.id;
  if(!window.HOG_HG42_SCREEN.sections.includes(id))throw Error('Màn Boss không hợp lệ');
  hg42BossScreen=id;modalOffset=0;return;
 }
 if(action==='hg42-boss-tier'){
  const next=Number(target.dataset.tier);
  if(!window.HOG_HG42_SCREEN.bossTiers.includes(next))throw Error('Cấp Boss không hợp lệ');
  hg42BossTier=next;modalOffset=0;return;
 }
 if(action==='hg42-boss-locate'||action==='hg42-boss-dispatch'){
  const key=target.dataset.key,tile=E.getTile(key);
  if(!tile||tile.kind!=='npc'||(tile.eliteTier||0)<11)throw Error('Boss mục tiêu không hợp lệ');
  selected=key;selectedTargetKind=null;
  Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y});
  tab='map';showWorldIndex=false;showResourceInfo=false;modalOffset=0;
  if(action==='hg42-boss-dispatch'){
   if(state.battle)throw Error('Đang chiến đấu');
   const heroId=state.activeHero;
   dispatchDraft={targetKey:key,kind:null,heroId,form:E.hg20HeroPlan(state,heroId).map(g=>({...g}))};
  }
  return;
 }
 if(action==='map-expand'){mapExpanded=!mapExpanded;return}
 if(action==='world-index'){showWorldIndex=!showWorldIndex;showResourceInfo=false;modalOffset=0;return}
 if(action==='resource-info'){showResourceInfo=!showResourceInfo;showWorldIndex=false;tab='map';modalOffset=0;return}
 if(action==='race'){newRace=target.dataset.race;render();return}
 if(action==='spelledition'){newSpellEdition=target.dataset.edition;render();return}
 if(action==='start'){hg261Draft=null;hg42BossScreen='targets';hg42BossTier=11;hg43ArmyPage='recruit';hg43ArmyRace=newRace;state=E.make(newRace,Date.now(),newSpellEdition);hg47RaceView=newRace;hg47TierView='rare';tab='map';selected='3,4';selectedTargetKind=null;return}
 if(action==='tab'){tab=target.dataset.tab;showWorldIndex=false;showResourceInfo=false;modalOffset=0;
  if(tab==='army'){hg43ArmyPage='recruit';hg43ArmyRace=state.race}
  focusArmyRecruitOnOpen=tab==='army';return}
 if(action==='city-switch'){E.switchCity(state,target.dataset.id);selected=E.activeCity(state).key;tab='city';return}
 if(action==='city-transport'){const cargo=Object.fromEntries(C.keys.map(k=>[k,Number($(`city-transport-${k}`)?.value||0)])),convoy=E.startCityTransport(state,target.dataset.city,$('city-transport-unit')?.value,Number($('city-transport-count')?.value),cargo);toast(`Đoàn tiếp tế đã xuất phát; sức tải ${format(convoy.weight)}/${format(convoy.capacity)}.`);return}
 if(action==='select'){selected=target.dataset.key;selectedTargetKind=target.dataset.kind==='treasure'?'treasure':null;const tile=E.getTile(selected);if(tile)Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y});return}
 if(action==='building'){selectedBuilding=target.dataset.key;return}
 if(action==='zoom'){P.zoomMap(target.dataset.dir==='in'?1.25:.8);return}
 if(action==='center'){const city=E.activeCity(state),tile=E.getTile(city.key);Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y,zoom:1.3});selected=city.key;selectedTargetKind=null;return}
  if(action==='stack'){movementModeId=null;markBattleInput();E.battleSelect(state,target.dataset.id);return}
  if(action==='move-mode'){if(movementModeId){movementModeId=null;return}const unit=state.battle?.allies.find(u=>u.id===state.battle.selected&&u.pool>0);if(!unit)throw Error('Hãy chọn một đội quân còn sống để di chuyển.');movementModeId=unit.id;markBattleInput();return}
 if(action==='formation'){E.setFormation(state,Array.from({length:7},(_,i)=>({unitId:$('formation_unit_'+i).value,count:Number($('formation_count_'+i).value)})));toast('Đội hình đã lưu.');return}
 if(action==='hg261-roster-refresh'){hg261Draft=Array.from({length:3},(_,i)=>Number($('hg261_team_'+i)?.value)||null);toast('Đã cập nhật 2 ô quân riêng cho mỗi tướng.');return}
 if(action==='hg26-start'){
  const team=Array.from({length:3},(_,i)=>({heroId:Number($('hg261_team_'+i)?.value||0),
    slots:Array.from({length:2},(_,j)=>$('hg261_slot_'+i+'_'+j)?.value??'').filter(v=>v!=='').map(Number)}))
    .filter(x=>x.heroId>0);
  const cfg={target:$('hg26_boss').value,heroId:null,team,
   maxRuns:Number($('hg26_max_runs').value),keepAP:Number($('hg26_keep_ap').value),
   minUnits:Number($('hg26_min_units').value),minCoverage:Number($('hg26_coverage').value),
   maxLossPercent:Number($('hg26_loss').value),autoHeal:$('hg26_heal').checked,
   autoRecruit:$('hg26_recruit').checked,stopOnLoss:$('hg26_stop_loss').checked};
  const r=E.hg26Start(state,cfg);hg261Draft=null;toast('Đã bật HG-26: '+(r.team?.length||1)+' tướng tham gia CÙNG một trận '+r.targetName+'.');return
 }
 if(action==='hg26-stop'){E.hg26Stop(state,'Người chơi đã dừng tự săn');toast('Đã dừng tự săn; quân đang đi sẽ theo hành trình hiện tại.');return}
 if(action==='hg24-save-template'){E.hg24SaveTemplate(state);toast('Đã lưu đội hình mẫu của tướng.');return}
 if(action==='hg24-apply-template'){const r=E.hg24Apply(state);toast('Đã bố trí '+r.total+' lính từ kho thành'+(r.partial?' · còn thiếu '+r.missing:'')+'.');return}
 if(action==='hg24-replenish'){const r=E.hg24Replenish(state,state.activeHero,true);toast('Đã bố trí '+r.total+' lính'+(r.queued?' · xếp hàng tuyển '+r.queued.count+' quân':'')+'.');return}
 if(action==='hg24-policy'){const fill=$('hg24_auto_fill').checked,train=$('hg24_auto_train').checked;E.hg24SetAuto(state,state.activeHero,fill,train);toast('Đã lưu chính sách tự bổ sung quân.');return}
 if(action==='hg24-boss-prepare'||action==='hg24-boss-dispatch'){
  const targetBoss=E.hg24RecommendBoss(state).filter(q=>!q.privateBoss).sort((a,b)=>a.stars-b.stars||a.distance-b.distance)[0];
  if(!targetBoss)throw Error('Chưa có Boss thường có thể tới.');
  const r=action==='hg24-boss-dispatch'?E.hg24DispatchBoss(state,targetBoss.key):E.hg24PrepareBoss(state,targetBoss.key);
  selected=targetBoss.key;selectedTargetKind=null;const tile=E.getTile(targetBoss.key);
  Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y});
  tab='map';toast((r.launched?'Đã xuất chinh: ':'Đã chuẩn bị: ')+r.heroName+' · '+r.units+' lính → '+targetBoss.name+'.');return
 }
 if(action==='hg24-drill'){const r=E.hg24Drill(state);toast('Huấn luyện xong: +'+format(r.gained)+' EXP, còn '+r.remaining+' lượt.');return}
 if(action==='hg24-harvest'){const r=E.hg24Harvest(state);toast('Thu hoạch '+r.mines+' mỏ: +'+format(r.exp)+' EXP và tài nguyên.');return}
 if(action==='tower-team'){const ids=Array.from({length:3},(_,i)=>Number($('hg20_tower_'+i).value)).filter(x=>x>0);E.hg20ChooseTowerTeam(state,ids);toast('Đã chọn '+ids.length+' tướng; mỗi người góp tối đa hai stack.');return}
 if(action==='tower-auto-assign'){const q=E.hg21TowerAutoAssign(state);toast('Đã chia '+format(q.units)+' quân thật cho '+q.heroes+' tướng · '+q.stacks+' đội, không tuyển thêm quân.');return}
 if(action==='tower-picks'){const rows=E.hg20TowerStatus(state).team.map((id,i)=>({heroId:id,slots:Array.from({length:2},(_,j)=>$('hg21_slot_'+i+'_'+j)?.value??'').filter(x=>x!=='').map(Number)}));E.hg21SetTowerPicks(state,rows);toast('Đã lưu '+rows.length+' tướng và '+rows.reduce((n,r)=>n+r.slots.length,0)+' stack.');return}
 if(action==='tower-climb'){const r=E.hg21TowerEnter(state);tab='combat';toast('Tầng '+r.floor+': '+r.heroes+' tướng / '+r.stacks+' stack bắt đầu giao tranh.');return}
 if(action==='tower-upgrade'){E.hg20TowerUpgrade(state);toast('Đã tăng sức mạnh đội Bí Cảnh.');return}
 if(action==='autoformation'){const plan=E.autoFormation(state);toast(`Đã bố trí ${format(plan.totalUnits)} quân · ${format(plan.points)}/${format(plan.limit)} sức chứa.`);return}
 if(action==='findnpc'){selectNearestNpc(E.heroTaskStatus(state).active?.stars||1);return}
 if(action==='combat-speed'){setCombatVisualSpeed(Number(target.dataset.speed));syncCombatTurnHUD();return}
 if(action==='auto'){if(state.battle?.hg26NeedsManual)delete state.battle.hg26NeedsManual;state.battleAuto=!state.battleAuto;if(state.battle){const animationRemaining=Math.max(0,combatVisualLockUntil-performance.now());state.battle.autoUntil=Date.now()+Math.max(state.battleAuto?BATTLE_AUTO_TURN_DELAY_MS:BATTLE_AUTO_DELAY_MS,animationRemaining+110);}return}
 if(action==='upgrade'){
  const cost=E.upgrade(state,target.dataset.key);
  toast('Đã trừ '+hg35ExpenseText(cost)+'; bắt đầu xây.');return;
 }
 if(action==='learn'){E.learn(state,target.dataset.id);return}
 if(action==='research'){E.researchTechnology(state,target.dataset.id);return}
 if(action==='heropoint'){E.allocateHeroPoint(state,Number(target.dataset.id),target.dataset.stat);return}
 if(action==='recruit'){
  const id=target.dataset.id,qty=Number($('q_'+id).value);
  const spent=E.recruit(state,id,qty);recruitDrafts.delete(id);
  toast('Đã trừ '+hg35ExpenseText(spent)+'; xếp hàng '+format(qty)+' quân.');return;
 }
 if(action==='march'){const commander=state.heroes.find(h=>h.id===state.activeHero);let count=state.formation?.reduce((n,g)=>n+g.count,0)||0;if(!count){const starter=E.autoFormation(state);count=starter.total;toast('Tự bố trí '+count+' quân cho '+(commander?.name||'tướng')+'. Có thể tùy chỉnh trong Quân đội.');}E.startMarch(state,selected,target.dataset.kind==='treasure'?'treasure':undefined);toast((commander?.name||'Tướng')+' xuất chinh cùng '+count+' quân.');return}
 if(action==='visit'){const result=E.visitWorldBuilding(state,target.dataset.key);toast(result.reward?'Đã nhận thưởng từ công trình.':'Hiệu ứng đã áp dụng cho tướng.');return}
  if(action==='recall'){const seconds=E.recallHero(state,Number(target.dataset.id));toast(seconds===true?'Tướng đã về thành.':`Tướng đang trở về trong ${Math.ceil(seconds/state.speed)} giây thực.`);return}
  if(action==='save-combat'){$('save').click();return}
  if(action==='battle'){if(state.battle&&performance.now()<combatVisualLockUntil){toast('Đội quân đang kết thúc lượt, hãy chờ hiệu ứng hoàn tất.');return}movementModeId=null;state.battleAuto=false;const currentBattle=state.battle,wasTower=!!currentBattle?.hg21Tower,out=E.battleAct(state,target.dataset.cmd);if(state.battle===currentBattle)combatVisualLockUntil=performance.now()+combatTurnWallMs(currentBattle);else combatVisualLockUntil=0;if(out.type==='win'){tab=wasTower?'tower':'map';toast(wasTower?'Thắng Bí Cảnh tầng '+out.floor+'!':'Chiến thắng!')}else if(out.type==='lose'){tab=wasTower?'tower':'heroes';toast(wasTower?'Bí Cảnh thất bại; không mất quân và lượt thưởng.':'Thất bại, có thể chữa thương.')}else if(out.type==='retreat'||out.type==='timeout'){tab=wasTower?'tower':'map';toast('Đã kết thúc giao tranh.')}return}
 if(action==='tower-cast'){markBattleInput();E.hg21TowerCast(state,Number(target.dataset.hero),target.dataset.id);toast('Phép đã áp dụng theo chủ tướng.');return}
 if(action==='herolearn'){E.researchHeroSpell(state,target.dataset.id);return}
 if(action==='heroequip'){E.equipSpell(state,target.dataset.id);return}
 if(action==='herocastellanequip'){if(!state.castellan)throw Error('Cần bổ nhiệm Castellan trước');E.equipSpell(state,target.dataset.id,state.castellan);return}
 if(action==='cast'){if(state.battle)markBattleInput();E.cast(state,target.dataset.id);return}
 if(action==='equipitem'){E.equipItem(state,Number(target.dataset.uid));return}
 if(action==='unequip'){E.unequipItem(state,target.dataset.slot);return}
 if(action==='buyitem'){E.buyItem(state,target.dataset.id);return}

 if(action==='hg47-race'){hg47RaceView=target.dataset.race;return}
 if(action==='hg47-tier'){hg47TierView=target.dataset.tier;return}
 if(action==='hg47-focus'){const out=E.hg47SetFocus(state,target.dataset.tier,target.dataset.slot);toast('Đang săn mảnh '+E.ITEMS[out.id].name);return}
 if(action==='hg47-craft'){const out=E.hg47Craft(state,target.dataset.id);toast('Đã ghép '+E.ITEMS[out.itemId].name+' từ nguyên liệu thật');return}
 if(action==='hg31-focus'){const out=E.hg31SetFocus(state,target.dataset.id);toast('Đã chọn farm '+E.ITEMS[out.id].name);return}
 if(action==='hg31-craft'){const out=E.hg31Craft(state,target.dataset.id);toast('Đã ghép '+E.ITEMS[out.itemId].name);return}
 if(action==='hg30-claim'){E.hg30ClaimTrial(state);toast('Đã mở nhiệm vụ chuyển hóa Chiến Vệ.');return}
 if(action==='hg30-convert'){const r=E.hg30Convert(state,target.dataset.id);toast('Đã chuyển hóa thành '+r.toName);return}
 if(action==='hg29-craft'){const out=E.hg29Craft(state,target.dataset.id);toast('Đã ghép mảnh: '+out.id);return}
 if(action==='hg27-exchange'){const out=E.hg27Exchange(state,target.dataset.id);toast('Đổi thưởng thành công: '+out.id);return}
 if(action==='hg18-claim'){E.claimHG18Task(state,target.dataset.cycle,target.dataset.id);toast('Đã nhận thưởng nhiệm vụ.');return}
 if(action==='hg18-open'){E.openHG18Pack(state,target.dataset.id);toast('Đã sử dụng thẻ hoặc mở hòm.');return}
 if(action==='hg18-craft'){E.craftHG18(state,target.dataset.id);toast('Đã ghép trang bị Tinh Vân.');return}
 if(action==='hg18-enhance'){E.enhanceHG18(state,Number(target.dataset.uid));toast('Cường hóa trang bị thành công.');return}
 if(action==='hg18-salvage'){E.salvageHG18(state,Number(target.dataset.uid));toast('Đã phân giải trang bị; đá vào túi.');return}
 if(action==='hg18-rank'){E.rankHG18Hero(state,Number(target.dataset.id));return}
 if(action==='hg18-reset'){E.resetHG18Hero(state,Number(target.dataset.id));return}
 if(action==='hg18-rebirth'){if(!confirm('Chuyển sinh về cấp 1? Giữ trang bị, bậc và bonus chuyển sinh.'))return;E.rebirthHG18Hero(state,Number(target.dataset.id));return}
 if(action==='sell'){E.sell(state,$('sell-type').value,Number($('sell-qty').value));return}
 if(action==='quest'){E.claim(state,target.dataset.id);return}
 if(action==='acceptherotask'){E.acceptHeroTask(state);return}
 if(action==='claimherotask'){const r=E.claimHeroTask(state);toast(`+${format(r.gained)} EXP cho tướng · nhiệm vụ ${r.task}/20.`);return}
 if(action==='findherotask'){
  const task=E.heroTaskStatus(state).active;if(!task)throw Error('Chưa nhận nhiệm vụ tướng.');
  selectNearestNpc(task.stars);return;
 }
 if(action==='acceptdaily'){E.acceptDailyTask(state,target.dataset.id);return}
 if(action==='claimdaily'){E.claimDailyTask(state,target.dataset.id);return}
 if(action==='acceptdaily2009'){E.acceptChina2009DailyTask(state,target.dataset.id);return}
 if(action==='claimdaily2009'){E.claimChina2009DailyTask(state,target.dataset.id);return}
 if(action==='hirecandidate'){E.hireCandidate(state,target.dataset.id);return}
 if(action==='hero'){E.selectHero(state,Number(target.dataset.id));return}
 if(action==='castellan'){E.appoint(state,Number(target.dataset.id));return}
 if(action==='heal'){const q=E.heal(state);toast(`Arena bắt đầu điều trị ${q.count} quân; ${q.paidGold} vàng, ${Math.ceil(q.total/state.speed)} giây thực.`);return}
 });});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&hg63OpenReport){hg63CloseReport();return}if(e.key==='Escape'&&!$('game-modal').hidden){showWorldIndex=false;showResourceInfo=false;tab='map';modalOffset=0;render();}});
$('save').onclick=()=>{if(save())toast('Đã lưu game vào trình duyệt.')};
$('speed').onclick=()=>{if(!state)return;fail(()=>E.setSpeed(state,state.speed===60?1:60))};
$('export-save').onclick=()=>{
 if(!state){toast('Hãy bắt đầu game trước.');return}
 try{
  save();const payload=E.serializeSave(state),blob=new Blob([payload],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
  link.download='Heoofgaia-HG08-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);
  link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Đã xuất file sao lưu JSON.');
 }catch(e){toast(e.message||String(e))}
};
$('import-save').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>2_000_000)throw Error('Tệp vượt giới hạn 2 MB');
  const imported=E.parseSave(await file.text());if(imported.battle)P.battleTimelinePrime?.(imported.battle,combatVisualNow(),false);
  if(!confirm('Khôi phục save từ file? Tiến độ HG-08 hiện tại sẽ được thay bằng dữ liệu trong file.'))return;
  const beforeImport=state;try{state=imported;E.tick(state);if(!save())throw Error('Không thể lưu bản nhập; bản lưu cũ vẫn được giữ nguyên.');selected='3,4';selectedTargetKind=null;tab=state.battle?'combat':'map';render();toast('Đã khôi phục save.')}catch(error){state=beforeImport;throw error}
 }catch(err){toast('Không thể nhập save: '+(err.message||String(err)))}
};
$('reset').onclick=()=>{if(!confirm('Xóa save phiên bản HG-08 và tạo vương quốc khác?'))return;state=null;newRace='human';selected=null;selectedTargetKind=null;localStorage.removeItem(E.SAVE_KEY);localStorage.removeItem(E.SAVE_KEY+'_backup');localStorage.setItem('heoofgaia_hg08_skip_migration','1');render()};
 document.querySelectorAll('[data-city-art]').forEach(image=>image.addEventListener('load',()=>{if(state&&tab==='city')render()}));
 state=load();hg63SeenReportId=state?.battleReports?.[0]?.id||null;if(state){ensureBattleAutoTimer(state);selected='3,4';selectedTargetKind=null;state.battleAuto=false;tab=state.battle?'combat':'map'}render();
setInterval(()=>{if(!state)return;const before=state.battle,hg63Before=hg63BattleSnapshot(),training=state.training.length,building=state.buildingQueue?.key||null,arena=state.arenaQueue?.id||null;try{E.tick(state);const farmPulse=state.hg26?.enabled?E.hg26Step(state):null;hg63CaptureBattleReport(before,hg63Before);if(farmPulse?.changed)save();if(!before&&state.battle)tab='combat';if(state.battle&&!state.hg26?.enabled&&!state.battle.hg26NeedsManual&&!state.battleAuto&&Date.now()>=(state.battle.autoUntil||0))state.battleAuto=true;const changed=before!==state.battle||!!farmPulse?.changed||
 training!==state.training.length||building!==(state.buildingQueue?.key||null)||
 arena!==(state.arenaQueue?.id||null);
 // Preserve the existing battle canvas and 24fps RAF visual clock during
 // idle seconds. Recreating the entire DOM every 1s interrupted animations
 // and caused labels/controls to flicker between automatic turns.
 // HG26 Boss farming resolves its canonical turn inside this 1s tick
 // (farmPulse.changed). Recreating the canvas on every such turn caused a
 // visible animation reset even after the manual auto-turn fix.
 if(state.battle&&before===state.battle&&$('battle-canvas')){
  syncCombatTurnHUD();
  // HG56: keep the five real resource balances live even while combat RAF
  // owns the canvas. Do not rerender nav, battle DOM or Save each second.
  renderResourceHUD();
  if(training!==state.training.length||building!==(state.buildingQueue?.key||null)||
     arena!==(state.arenaQueue?.id||null))renderHUD();
 }else if(!changed){
  // AP regenerates while the dispatch drawer is open; update only its
  // price and button, never overwrite an in-progress troop quantity input.
  if(dispatchDraft)syncDispatchAP();
  // Update the real-time MAX and paid-total quote in place. Never replace an
  // actively edited quantity input when passive resources arrive each second.
  if(tab==='army'&&!$('game-modal')?.hidden)
   for(const unit of E.arrUnits(state))hg35UpdateRecruitQuote(unit.id);
  // Passive resource ticks must not destroy in-progress formation, Tower
  // hero selection, or recruit quantity inputs.
  renderHUD();
 }else if(document.activeElement&&['INPUT','SELECT'].includes(document.activeElement.tagName))renderHUD();
 else render();
 if(changed)save();}catch(e){console.warn('Tick:',e)}},1000);
// Refit canvas immediately after device rotation/window resize; one render per frame.
let battleResizeFrame=0;
window.addEventListener('resize',()=>{if(!state?.battle&&$('world-canvas')){paint();return;}if(!state?.battle||battleResizeFrame)return;
 battleResizeFrame=requestAnimationFrame(()=>{battleResizeFrame=0;if(state?.battle)render()});
});
// Single deadline-aware auto scheduler; the economy tick above never resolves battle turns.
setInterval(resolveAutomaticBattleTurn,120);
setInterval(save,10000);window.addEventListener('pagehide',save);
window.HOG_APP_DEBUG={getState:()=>state,hg44JourneyView,battleViewPrefs:()=>({...battleViewPrefs}),battleRenderStride,render,save,showCombatForTests:()=>{if(!state?.battle)throw Error('No live battle');tab='combat';render()},resetForTests:()=>{state=E.make('human',Date.now());selected='5,6';selectedTargetKind=null;render()}};
})();
