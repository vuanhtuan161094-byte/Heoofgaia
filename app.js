(function(){
'use strict';
const E=window.HOG_ENGINE, C=window.HOG_CATALOG, P=window.HOG_PAINTER;
const A=window.HOG_ART_PACK,ico=(key,size)=>A?.iconHTML(key,size)||'';
const $=id=>document.getElementById(id);let state=null,hg261Draft=null,tab='map',newRace='human',newSpellEdition='international',selected=null,selectedTargetKind=null,lastToast=0,selectedBuilding='hall',movementModeId=null,showWorldIndex=false,showResourceInfo=false,modalOffset=0,armyOpsOpen=false,armyQuestOpen=false,combatDockOpen=true;
const tabs=[['map','🗺 Thế giới'],['city','🏰 Thành trì'],['army','🛡 Quân đội'],['heroes','🧙 Tướng'],['magic','🔮 Pháp thuật'],['relics','💎 Rèn & Di vật'],['tasks','📜 Nhiệm vụ'],['tower','🗼 Bí Cảnh'],['reports','⚔ Chiến báo'],['sources','📚 Tư liệu']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=E.fmt;
const BATTLE_AUTO_DELAY_MS=10_000,BATTLE_AUTO_TURN_DELAY_MS=1350;
let battleAutoPulseBusy=false;
let focusArmyRecruitOnOpen=false; // New Army-tab entry goes to actionable recruitment, not passive text.
// Visual QA preferences are separate from the canonical v07 gameplay save.
// Default both ON, as requested for verifying unit coordinates and HP.
const BATTLE_VIEW_PREF_KEY='heoofgaia_battle_display_v2';
const battleViewPrefs={grid:true,hp:true};
try{
 const stored=JSON.parse(localStorage.getItem(BATTLE_VIEW_PREF_KEY)||'null');
 if(stored&&typeof stored==='object'){
  if(typeof stored.grid==='boolean')battleViewPrefs.grid=stored.grid;
  if(typeof stored.hp==='boolean')battleViewPrefs.hp=stored.hp;
 }
}catch(_error){}
function toggleBattleDisplay(which){
 if(which!=='grid'&&which!=='hp')return;
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
  const wasTower=!!b.hg21Tower,out=E.battleAct(s,'attack',{preserveMoveOrders:true,stableTargets:true});
  if(out.type==='win'||out.type==='retreat'||out.type==='timeout')tab=wasTower?'tower':'map';
  if(out.type==='lose')tab=wasTower?'tower':'heroes';
  if(s.battle===b)b.autoUntil=Date.now()+BATTLE_AUTO_TURN_DELAY_MS;
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
 }
 const clock=$('battle-auto-clock');
 if(clock)clock.textContent=state.battleAuto?'Đang tự động':'Tự động sau '+Math.max(0,Math.ceil((b.autoUntil-Date.now())/1000))+' giây';
 const auto=document.querySelector('.battle-command-dock [data-action="auto"]');
 if(auto)auto.textContent=state.battleAuto?'⏸ DỪNG TỰ ĐÁNH':'▶ TỰ ĐÁNH';
 const move=document.querySelector('.battle-command-dock [data-action="move-mode"]');
 const moveTarget=selected&&b.moveTargets?.[selected.id];
 if(move){
  move.disabled=!selected||selected.pool<=0;
  move.textContent=movementModeId?'✕ HỦY Ô':moveTarget?'↗ ĐỔI ĐÍCH':'⌖ ĐẶT ĐÍCH';
 }
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
 const oldTab=tab,oldBattle=state?.battle;
 if(!$('game-modal')?.hidden)modalOffset=$('game-modal-body')?.scrollTop||0;
 fn();if(oldTab!==tab)modalOffset=0;save();
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
   try{const s=ensureBattleAutoTimer(E.parseSave(current));E.tick(s);return s}
   catch(err){console.warn('Current save invalid',err.message)}
  }
  const backup=localStorage.getItem(E.SAVE_KEY+'_backup');
  if(backup){
   try{
    const s=ensureBattleAutoTimer(E.parseSave(backup));E.tick(s);
    try{localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));toast('Đã khôi phục bản lưu dự phòng.')}
    catch(err){toast('Đã mở bản lưu dự phòng nhưng chưa ghi lại được; hãy xuất file JSON.')}
    return s;
   }catch(err){console.warn('Backup save invalid',err.message)}
  }
  if((localStorage.getItem('heoofgaia_hg08_skip_migration')||localStorage.getItem('heoofgaia_hg06_skip_migration')))return null;
  for(const key of ['heoofgaia_hg_only_v06','heoofgaia_hg_only_v05','heoofgaia_hg_only_v04','heoofgaia_hg_only_v03','heoofgaia_hg_only_v02']){
   const raw=localStorage.getItem(key);if(!raw)continue;
   try{const s=ensureBattleAutoTimer(E.parseSave(raw));E.tick(s);localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));return s}
   catch(err){console.warn('Legacy save skipped:',key,err.message)}
  }
 }catch(e){console.warn('Save storage unavailable',e)}return null;
}
function money(cost){return Object.entries(cost).filter(([,v])=>v>0).map(([k,v])=>`${(ico(k,20)||C.resource[k].emoji)} ${format(v)}`).join(' · ')}
function button(action,data,label,disabled=false,cls=''){return `<button ${disabled?'disabled':''} data-action="${esc(action)}" ${Object.entries(data||{}).map(([k,v])=>`data-${esc(k)}="${esc(v)}"`).join(' ')} class="${cls}">${label}</button>`}
function flags(){const city=E.activeCity(state),ap=E.fameApStats(state.fame),next=ap.nextFame===null?'đã đạt bậc cao nhất':`còn ${format(ap.nextFame-state.fame)} Fame tới mốc tiếp`;return `<span class="tag">📍 ${esc(city.name)} (${city.key})</span><span class="tag" title="${ap.perHour} AP hồi mỗi giờ game · ${next}">🔋 AP ${Math.floor(state.ap)}/${ap.max} · +${ap.perHour}/giờ</span><span class="tag">🏅 Danh vọng ${format(state.fame)}</span><span class="tag">🏰 ${state.cities.length}/${E.cityLimit(state.fame)} thành</span><span class="tag">⏱ ×${state.speed} demo</span>`}
// Compact, actionable New Game path. Progress is derived only from the
// player's real state, not an unlock flag or bonus-resource tutorial seed.
function newPlayerGuide(){
 if(!state||state.cities.length>=2)return '';
 const recruited=(state.army[state.race+'_1']||0)>16||state.training.some(t=>t.unitId===state.race+'_1');
 const stages=[
  ['city','🏪','Xây Market',state.buildings.market>=1],
  ['magic','🌲','Nghiên cứu Forestry',!!state.spells.forestry],
  ['army','🛡','Tuyển lính',recruited],
  ['map','⛏','Chiếm mỏ',state.mines.length>0],
  ['city','🏅','Đạt 5.800 Fame',state.fame>=5800],
  ['map','🏰','Chiếm thành thứ hai',state.cities.length>=2]
 ];
 const done=stages.filter(x=>x[3]).length;
 return `<section class="card" aria-label="Lộ trình phát triển New Game"><div class="entry"><b>🌱 Khởi nghiệp lãnh chúa · ${done}/6</b><span class="tag">🏅 ${format(state.fame)} / 5.800 Fame</span></div><div class="entry" style="flex-wrap:wrap">${stages.map(([tab,icon,label,ok])=>button('tab',{tab},`${ok?'✓':icon} ${esc(label)}`,false,ok?'small secondary':'small')).join('')}</div><p class="tiny muted">Dùng tài nguyên khởi đầu thật, xây dựng và tuyển quân để nhận Fame. Mốc thành thứ hai 5.800 là cân bằng offline (Fandom ghi 22.000). Không cấp quà QA.</p></section>`;
}
function renderIntro(){
 $('nav').innerHTML='';$('resources').innerHTML='';$('status').innerHTML='<p>Một bản tái dựng độc lập lấy cảm hứng từ Heroes of Gaia (2009).</p>';$('logs').innerHTML='';
 $('main').innerHTML=`<section class="welcome"><div class="welcome-scene"><canvas id="intro-canvas" width="1176" height="560" aria-label="Phong cảnh thành trì theo chủng tộc"></canvas><div class="welcome-copy"><div class="eyebrow">BỐN CHỦNG TỘC • MỘT CHIẾN TRƯỜNG</div><h1>ANH HÙNG THỜI LOẠN</h1><p>Phát triển thành trì • dẫn quân vượt thế giới • chinh phục mỏ và quái vật</p></div></div><div class="welcome-bottom"><h2>Chọn chủng tộc khởi đầu</h2><div class="race-grid">${Object.entries(C.races).map(([k,v])=>`<button data-action="race" data-race="${k}" class="race-card ${newRace===k?'active':''}"><span class="emoji">${ico(k,42)||v.emoji}</span><strong>${v.name}</strong><small>${v.english}</small></button>`).join('')}</div><h3>Bộ phép chiến đấu</h3><div class="entry">${button('spelledition',{edition:'international'},'Quốc tế · Fandom',false,newSpellEdition==='international'?'primary':'secondary')}${button('spelledition',{edition:'china2009'},'Trung Quốc 2009 · Sina',false,newSpellEdition==='china2009'?'primary':'secondary')}</div><p class="hint">Lựa chọn này lưu trong vương quốc mới. Bộ Sina tái hiện các kỹ năng chiến đấu chủ động đã có chỉ số xác nhận; kỹ năng di chuyển và nội tại chưa được mô hình hóa. Save cũ mặc định giữ bộ Quốc tế.</p>${button('start',{},'⚔ Thành lập thành Gaia',false,'primary wide')}<p class="hint">Chế độ chơi offline; hình ảnh tự dựng, công thức chiến đấu hiện là thử nghiệm, chưa phải game chính thức.</p></div></section>`;
 P.drawCity($('intro-canvas'),E,E.make(newRace),'hall');
}
function renderHUD(){const lim=E.limits(state);$('resources').innerHTML=C.keys.map(k=>`<button type="button" class="resource" data-action="resource-info" title="${esc(C.resource[k].label)}: ${format(state.res[k])}/${format(lim[k])} · +${format(E.rate(state)[k])}/giờ">${(ico(k,20)||C.resource[k].emoji)} <span>${C.resource[k].label}</span><b>${format(state.res[k])}</b><small class="muted">/${format(lim[k])} · +${format(E.rate(state)[k])}/h</small></button>`).join('');
 $('nav').innerHTML=tabs.map(([id,name])=>`<button data-action="tab" data-tab="${id}" class="${tab===id?'active':''}">${A?(ico(id,20)+' '+esc(name.slice(name.indexOf(' ')+1))):name}</button>`).join('');
 const earning=E.rate(state),hero=state.heroes.find(h=>h.id===state.activeHero),duty=E.hg20HeroRole(state,state.activeHero);$('status').innerHTML=`<div class="vitals">${flags()}</div><div class="muted tiny">${(ico(state.race,20)||C.races[state.race].emoji)} ${C.races[state.race].name} · ${state.heroes.length} tướng · ${E.activeArmy(state).reduce((n,u)=>n+state.army[u.id],0)} lính</div><div class="hr"></div><div class="hint">Sản lượng / giờ game:</div><div class="tiny">${C.keys.map(k=>`${(ico(k,20)||C.resource[k].emoji)} +${format(earning[k])}`).join(' · ')}</div><div class="hr"></div><div class="hint"><b>🏗 Xây dựng:</b> ${state.buildingQueue?esc(C.buildings[state.buildingQueue.key].name)+' Lv.'+state.buildingQueue.level+' · '+Math.ceil(state.buildingQueue.remaining/state.speed)+'s thực':'Trống'}</div><div class="hr"></div><div class="hint">Hàng đợi: ${state.training.length?esc(E.getUnit(state,state.training[0].unitId).name)+' ('+format(state.training[0].remaining)+'s game)':'Trống'}</div>${state.march?`<p class="notice">🚩 Hành quân: ${Math.ceil(state.march.remaining)}s game</p>`:''}`;
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
function battleReportsView(){
 const outcomes={win:'Chiến thắng',lose:'Thất bại',timeout:'Hết thời gian',retreat:'Rút lui'},locations={stationed:'Đóng quân tại mục tiêu',returning:'Lên đường quay về thành',home:'Ở thành'};
 const table=(rows,allied)=>`<p class="report-scroll-hint hint">Vuốt ngang bảng để xem đủ số quân và thương binh.</p><div class="battle-report-table"><table><thead><tr><th>Đội quân</th><th>Xuất trận</th><th>Còn sống</th><th>Tổn thất</th>${allied?'<th>Tử trận</th><th>Vào Arena</th>':''}</tr></thead><tbody>${rows.map(u=>`<tr><td>${esc(u.name)}</td><td>${format(u.initial)}</td><td>${format(u.survived)}</td><td>${format(u.lost)}</td>${allied?`<td>${u.wounded===null?'Chưa đủ dữ liệu':format(u.lost-u.wounded)}</td><td>${u.wounded===null?'Chưa đủ dữ liệu':format(u.wounded)}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
 return `${hg29LastView()}<section class="card"><span class="eyebrow">LỊCH SỬ GIAO TRANH</span><h1>Chiến báo</h1><p class="hint">Tối đa 30 trận gần nhất · tương thích save v07</p>${!state.battleReports?.length?'<div class="hg28-empty-state"><span>⚔</span><h2>Chưa có chiến báo</h2><p>Hoàn tất một trận đánh để ghi nhận thương vong và phần thưởng.</p>'+button('tab',{tab:'map'},'🗺 Mở bản đồ',false,'primary')+'</div>':state.battleReports.map((r,i)=>`<details class="battle-report" data-report-id="${esc(r.id)}" ${i===0?'open':''}><summary><b>${outcomes[r.outcome]}</b> · ${esc(r.name)} (${esc(r.target)}) · ${esc(r.heroName)} · ${r.turns} lượt</summary><p>Thành xuất quân: ${esc(state.cities.find(c=>c.id===r.homeCityId)?.name||r.homeCityId)} · Sau trận: ${locations[r.disposition]}</p><h3>Quân ta</h3>${table(r.allies,true)}<h3>Quân địch</h3>${table(r.enemies,false)}<p><b>Trang bị:</b> ${r.items===null?'Chưa đủ dữ liệu':r.items.map(i=>esc(i.name)).join(', ')||'Không nhận trang bị'}</p><p class="report-rewards"><b>Thực nhận:</b> ${money(r.resources)||'Không có tài nguyên'} · +${r.heroXp.toLocaleString('vi-VN',{maximumFractionDigits:6})} EXP tướng · +${format(r.fame)} danh vọng</p><p class="hint">Thương binh là số đã ghi vào Arena trong trận. Trận từ save cũ thiếu sổ thương binh sẽ ghi chưa đủ dữ liệu. Công thức giao tranh và phần thưởng vẫn theo mô hình được công bố trong Tư liệu.</p></details>`).join('')}</section>`;
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
  quickPoints=E.troopValue(state),quickLimit=E.heroLimit(quickHero?.level||1),
  quickQuest=E.heroTaskStatus(state),quickStars=quickQuest.active?.stars||1,
  quickBlocked=!!state.battle||!!state.march&&state.march.phase!=='outbound'||quickHero?.id===state.castellan||E.heroAway?.(state,quickHero?.id),
  quickBar=`<section class="quickstart-strip" aria-label="Hướng dẫn xuất quân nhanh"><div class="quickstart-copy"><span class="eyebrow">BẮT ĐẦU CHƠI · 3 THAO TÁC</span><strong>🛡 ${format(quickArmy)} quân · ${state.formation?.length||0} nhóm · ${format(quickPoints)}/${format(quickLimit)} điểm chỉ huy</strong><small>Bố trí quân → nhận nhiệm vụ → tìm quái trên bản đồ. Chọn mục tiêu không tự xuất quân.</small></div><div class="quickstart-actions">${button('autoformation',{},'① ⚔ Bố trí nhanh',quickArmy<1||quickBlocked,'small primary')}${button('tab',{tab:'tasks'},'② 📜 Nhiệm vụ',false,'small secondary')}${button('findnpc',{},'③ ☠ NPC '+quickStars+'★',false,'small secondary')}</div></section>`;
 return `<div class="scene-title"><div><span class="eyebrow">WORLD EXPLORATION • 100 × 100</span><h1>Thế giới Gaia</h1></div><div class="scene-tools">${button('world-index',{},'📍 Điểm đến',false,'small secondary')}${button('zoom',{dir:'in'},'＋',false,'secondary')}${button('zoom',{dir:'out'},'－',false,'secondary')}${button('center',{},'⌖ Về thành',false,'secondary')}</div></div>
 ${quickBar}<div class="map-frame"><canvas id="world-canvas" width="1176" height="620" aria-label="Bản đồ thế giới tương tác, kéo và chạm chọn tọa độ"></canvas>${hg29PreviewUI(treasureSelected?'treasure':target?.kind,target?.key,treasureSelected?treasure?.level:target?.level)}</div>
 <div class="scene-bottom"><div class="target-information"><span class="eyebrow">MỤC TIÊU ĐANG CHỌN</span><h2>${esc(desc)}</h2><p class="muted">${targetStatus}</p>${previewText?`<p class="tiny muted" aria-label="Ước tính hành quân">${esc(previewText)}</p>`:''}<div class="actions">${worldDef?button('visit',{key:target.key},visited?'✓ Đã ghé hôm nay':'✨ Ghé thăm',visitDisabled,'primary'):treasureSelected?button('march',{kind:'treasure'},treasureDone?'✓ Đã dọn kho báu':marchLabel,marchDisabled||treasureDone,'primary'):stationed?button('recall',{id:stationed.heroId},'↩ Gọi tướng về',!!state.march||!!state.battle||!!state.expedition,'primary'):owned?cityAction:button('march',{},marchLabel,marchDisabled,'primary')}<span class="hint">${esc(targetHint)}</span></div></div>
 <div class="landmarks"><span class="eyebrow">THÀNH AI VÀ TRUNG LẬP • ${E.TILES.filter(q=>q.kind==='castle'&&!E.cityForKey(state,q.key)).length} ĐỊA ĐIỂM</span><p class="tiny muted">Hiển thị 16 thành gần thành đang mở nhất. Các thành còn lại vẫn xuất hiện trên bản đồ và minimap; chạm để xem quân phòng thủ.</p><div class="landmark-list">${E.TILES.filter(q=>q.kind==='castle'&&!E.cityForKey(state,q.key)).sort((a,b)=>{const home=E.getTile(E.activeCity(state).key);return Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-Math.abs(b.x-home.x)-Math.abs(b.y-home.y)}).slice(0,16).map(q=>button('select',{key:q.key},`${E.aiCityAt(state,q.key)?'⚔ AI':'🏰'} ${esc(q.value)} · ${C.races[q.race].name} (${q.x},${q.y})`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">CÔNG TRÌNH NGOÀI THÀNH • TỌA ĐỘ 17173, 27-12-2009</span><div class="landmark-list">${E.WORLD_BUILDINGS.map(q=>button('select',{key:`${q.x},${q.y}`},`✨ ${esc(q.name)} (${q.x},${String(q.y).padStart(2,'0')})${E.hasVisitedWorldBuilding(state,`${q.x},${q.y}`)?' · Đã ghé':''}`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">MA GIỚI 9–10★ • QUÁI T11/T12 (FANDOM)</span><p class="tiny muted">Fandom xác nhận chỉ số quái Demon T11/T12, nhưng các tọa độ, số quân và xác suất rơi dưới đây là thiết kế HG18. Hạ Boss mở nhiệm vụ tuần, có mảnh Tinh Vân và đá cường hóa.</p><div class="landmark-list">${highTierBosses.map(q=>button('select',{key:q.key},`☠ ${q.level}★ · ${esc(q.value)} · T${q.eliteTier} (${q.x},${q.y})`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">QUÁI VẬT 5–8★ • TỌA ĐỘ HƯỚNG DẪN 17173, 27-07-2009</span><p class="tiny muted">${highStarNpc.length} mục tiêu. Chọn ở đây hoặc chạm ký hiệu trên bản đồ. Quân lực là khuyến nghị; roster trận chưa phục hồi từ dữ liệu gốc.</p><div class="landmark-list">${highStarNpc.map(q=>button('select',{key:q.key},`☠ ${q.stars}★ · (${String(q.x).padStart(2,'0')},${String(q.y).padStart(2,'0')}) · ${format(q.minimumForce)}+`,false,selected===q.key?'small primary':'small secondary')).join('')}</div><span class="eyebrow">TRẠI KHO BÁU • 76 TỌA ĐỘ HƯỚNG DẪN 17173, 27-12-2009</span><p class="tiny muted">Chọn theo cấp để xem địa điểm, lực lượng khuyến nghị SRC20 và báo cáo canh giữ SRC47. Danh sách dùng 76 tọa độ bài hướng dẫn Trung Quốc; quân địch, cách rơi và chỉ số loot vẫn mô phỏng.</p>${treasureGroups.map((group,i)=>{const row=E.TREASURE_GEAR_GUIDE[i+1],sel=selectedTargetKind==='treasure';return `<details class="treasure-level"><summary>🧰 Kho báu cấp ${i+1} · ${group.length} điểm · SRC47 canh giữ ${format(row.reportedGuardForce)}</summary><p class="tiny muted">SRC20: tối thiểu ${format(row.minimumForce)}; hoàn toàn ${format(row.completeForce)}.${row.completeForceStatus==='CONFLICT_SOURCE_TYPO_SUSPECTED'?' Mốc hoàn toàn do bài in thấp hơn mức tối thiểu; nghi lỗi nguồn, không dùng làm cổng.':''}</p><div class="landmark-list">${group.map(q=>button('select',{key:q.key,kind:'treasure'},`🧰 (${String(q.x).padStart(2,'0')},${String(q.y).padStart(2,'0')})${state.treasureCleared?.includes(q.key)?' · Đã dọn':''}`,false,sel&&selected===q.key?'small primary':'small secondary')).join('')}</div></details>`}).join('')}</div></div>
 ${cityTransfer||''}${cityTransportView()}${state.march?`<div class="banner">🚩 ${state.march.phase==='return'?'Đạo quân đang trở về thành từ '+state.march.fromKey:'Đạo quân đang tiến tới '+state.march.target} • ${Math.ceil(state.march.remaining/state.speed)} giây thực còn lại • ${awayCount}/3 tướng đang ở ngoài thành</div>`:''}${state.parallelMarches?.length?`<div class="card expedition-ledger"><b>🧭 Các đạo quân đang đi (${awayCount}/3)</b>${state.parallelMarches.map(q=>`<div class="entry"><span>${esc(state.heroes.find(h=>h.id===q.heroId)?.name||'Tướng')} → ${esc(E.getTile(q.target)?.value||q.target)} · ${q.phase==='arrived'?'đã tới, chờ giao tranh':Math.ceil(q.remaining/state.speed)+' giây còn lại'}</span></div>`).join('')}</div>`:''}`;
}
function citySwitcher(){const blocked=!!state.march||!!state.battle||!!state.expedition||!!state.parallelMarches?.length;return `<div class="hg28-city-switcher" aria-label="Các thành trì"><span class="hg28-city-count">🏰 ${state.cities.length}<small> / ${E.cityLimit(state.fame)}</small></span><div class="hg28-city-switch-list">${state.cities.map(c=>button('city-switch',{id:c.id},`${c.main?'♛':'🏰'} ${esc(c.name)} · ${C.races[c.race].name}`,blocked||c.id===state.activeCityId,c.id===state.activeCityId?'small primary':'small secondary')).join('')}</div></div>`}

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
  return '<div class="card"><div class="heading">🧙 '+esc(h.name)+' · Lv.'+h.level+
   (selected?' <span class="tag">ĐANG CHỌN</span>':'')+'</div>'+
   '<p class="hint">'+esc(duty.label)+' · <b>'+format(count)+' lính</b> · '+troops.length+' nhóm'+
   (duty.target?' · mục tiêu '+esc(duty.target):'')+'</p>'+
   '<p class="tiny muted">'+(summary||'Chưa phân quân')+'</p>'+
   button('hero',{id:h.id},selected?'✓ Tướng hiện tại':'Chọn để điều binh',selected||duty.status!=='home','small secondary')+'</div>';
 }).join('');
 const other=E.hg20Reservations(state,state.activeHero);
 const allocated=Object.entries(other).filter(([,v])=>v>0).map(([id,count])=>esc(E.getUnit(state,id)?.name||id)+' ×'+format(count)).join(' · ');
 const hero=state.heroes.find(h=>h.id===state.activeHero),role=E.hg20HeroRole(state,state.activeHero);
 const leader=hero?esc(hero.name):'Chưa chọn tướng';
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
     (E.hg20HeroRole(state,h.id).status==='home'?'':' disabled')+'>'+
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
 '<p class="hint">Mẫu của <b>'+esc(hero?.name||'Tướng')+'</b> tại '+esc(state.activeCityId||'main')+
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
function towerView(){
 const status=E.hg20TowerStatus(state),c=state.hg20.collection,castle=E.hg20CastleStatus(state),picks=E.hg21TowerPicks(state);
 const teamOptions=selected=>'<option value="">— Không chọn —</option>'+state.heroes.map(h=>{
  const duty=E.hg20HeroRole(state,h.id);
  return '<option value="'+h.id+'" '+(selected===h.id?'selected':'')+' '+(duty.status==='home'?'':'disabled')+'>'+esc(h.name)+' · Lv.'+h.level+' · '+esc(duty.label)+'</option>';
 }).join('');
 const ready=E.hg21TowerReadiness(state);
 let strength='Chưa đủ quân';if(ready.ready){try{strength=format(E.hg20TowerPower(state).power)}catch(_){}}
 const troop=C.rewardUnits[state.race].find(u=>u.towerExclusive),owns=state.army[troop.id]||0;
 const slots=picks.map((entry,i)=>{
  const hero=state.heroes.find(h=>h.id===entry.heroId),formation=E.hg20HeroPlan(state,entry.heroId);
  const dropdown=j=>'<label>Đội '+(j+1)+'<select id="hg21_slot_'+i+'_'+j+'"><option value="">Không mang</option>'+formation.map((g,k)=>'<option value="'+k+'" '+(entry.slots[j]===k?'selected':'')+'>'+esc(E.getUnit(state,g.unitId)?.name||g.unitId)+' ×'+format(g.count)+' · ô '+(k+1)+'</option>').join('')+'</select></label>';
  return '<section class="hg28-tower-hero"><header><span>🧙</span><b>'+esc(hero?.name||'Tướng')+'</b><small>2 đội riêng</small></header><div class="hg28-tower-slots">'+dropdown(0)+dropdown(1)+'</div></section>';
 }).join('');
 return `<section class="hg28-tower-view"><header class="hg28-tower-title"><div><span class="eyebrow">BÍ CẢNH · CHIẾN THUẬT</span><h1>🗼 Tháp tầng ${format(status.floor)}</h1></div><div class="hg28-tower-badges"><span>🎁 ${status.rewardLeft}/5 lượt thưởng</span><span>⚔ ${strength}</span></div></header>
 <div class="hg28-tower-layout"><section class="card hg28-tower-command"><div class="hg28-tower-enemy"><span class="hg28-tower-enemy-icon">👹</span><div><small>ĐỐI THỦ · ${esc(status.trait)}</small><h2>${esc(status.enemy)}</h2><b>${format(status.enemyPower)} lực chiến</b></div><span class="tag">Tầng ${format(status.floor)}</span></div>
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
 const cost=E.recruitCost(state,unit,qty),seconds=E.recruitDuration(state,unit,qty);
 const spend=C.keys.filter(k=>cost[k]>0).map(k=>C.resource[k].label+' -'+format(cost[k])+
  ' (còn '+format(state.res[k]-cost[k])+')').join(' · ');
 return 'TRỪ KHI TUYỂN '+format(qty)+' quân: '+spend+
  ' · Huấn luyện lô này ~'+format(Math.ceil(seconds/state.speed))+' giây thực (×'+state.speed+').';
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
 const formations=state.formation?.length?state.formation:[];
 const troopBuilding=E.troopBuildingKey(state),troopBuildingName=C.buildings[troopBuilding].name;
 const opt=(sel)=>`<option value="">— Để trống —</option>${E.arrUnits(state).map(u=>`<option value="${u.id}" ${sel===u.id?'selected':''}>${esc(u.name)} (${Math.max(0,(state.army[u.id]||0)-(E.hg20Reservations(state,state.activeHero)[u.id]||0))} còn có thể cấp)</option>`).join('')}`;
 const townTroops=E.arrUnits(state).reduce((n,u)=>n+(state.army[u.id]||0),0),
  pendingTroops=state.training.reduce((n,q)=>n+q.count,0);
 return `<div class="hg28-army-main"><h1>🛡 ${esc(troopBuildingName)} · Lv.${state.buildings[troopBuilding]}</h1>
 <p class="hg35-garrison-info">${esc(C.races[state.race].name)} · <b>${format(townTroops)} quân trong thành</b> · ${format(pendingTroops)} đang tuyển. <b>Không áp dụng giới hạn chỉ huy cho kho quân.</b> Chỉ quân đem đi đánh mới phải tuân thủ sức chứa của từng tướng.</p>
 ${state.training.length?`<div class="banner"><b>Hàng đợi tuyển quân</b> ${state.training.map((q,i)=>`<div>⌛ ${i+1}. ${q.count} ${esc(E.getUnit(state,q.unitId).name)} · ${Math.ceil(q.remaining/state.speed)} giây thực</div>`).join('')} </div>`:''}
 <details class="hg28-army-ops hg28-army-quest" ${armyQuestOpen?'open':''}><summary>🎖 Nhiệm vụ đổi quân · giai đoạn ${Math.max(0,Number(state.hg30?.stage)||0)}/3</summary>${hg30QuestView()}</details>
 <div class="grid grid2" style="margin-top:12px">${E.arrUnits(state).map(u=>{const unlock=E.troopPrerequisites(state,u),unlocked=unlock.available&&!u.rewardOnly&&!u.towerExclusive,maxQty=E.recruitMax(state,u.id),defaultQty=Math.min(3,Math.max(1,maxQty)),cost=E.recruitCost(state,u,1),checks=unlock.checks.map(c=>{const label=c.kind==='building'?C.buildings[c.key]?.name||c.key:c.key==='bootcamp'?'Bootcamp (Huấn luyện)':c.key==='manufacturing'?'Manufacturing (Chế tạo)':`Phép ${C.spells[c.key]?.vi||c.key}`;return `${esc(label)} ${c.actual}/${c.level}`}).join(' · '),confidence=unlock.status==='OBSERVED'?'Đối chiếu bảng Human trong hướng dẫn Trung Quốc 2009 và xác nhận chéo 2010':unlock.status==='SECONDARY'?(unlock.source==='SRC26'?`SRC26: gate Thunderbird lấy từ bảng thứ cấp; chỉ số khớp catalog 2009 nhưng chưa đối chiếu client gốc`:`SRC28: bài 17173 năm 2010 nêu Centaur tuyển ở Barracks cấp 1; chưa đối chiếu client gốc`):unlock.status==='PARTIAL_SCOUT_HALL_GATE'?`SRC27 (Trung Quốc 2009): Barracks 2 + Scouting 1; Town Hall riêng chưa xác minh; phép Scouting đối chiếu SRC04 (wiki Anh 2009)`:unlock.status==='DERIVED_SCOUT_GATE'?`Vai trò trinh sát và Scouting 1 được đối chiếu chéo phiên bản; Town Hall riêng cho Scout chưa xác minh`:unlock.status==='DERIVED_TROOP_BUILDING_TIER'?(u.race==='undead'?(u.tier===2?`SRC02 + SRC11: Graveyard cấp cao mở quân cấp cao; ánh xạ cấp nhà = bậc quân là B* suy luận, chưa có bảng từng quân. Scouting đối chiếu chéo SRC22 (Trung Quốc 2010) và SRC04 (wiki tiếng Anh 2009)`:`SRC02 + SRC11: Graveyard cấp cao mở quân cấp cao; ánh xạ cấp nhà = bậc quân là B* suy luận, chưa có bảng từng quân`):u.tier===2?`SRC02 + SRC03 + SRC11: suy luận B* theo bậc ${troopBuildingName}; Scouting đối chiếu chéo SRC22 (Trung Quốc 2010) và SRC04 (wiki tiếng Anh 2009); cổng phụ chưa xác minh`:`SRC02 + SRC03 + SRC11: suy luận B* theo bậc đơn vị ${troopBuildingName}; chưa xác minh từng cổng phụ gốc`):unlock.status==='MODELED_SCOUT_PROXY'?`MÔ HÌNH TẠM: ${troopBuildingName} cấp 2 chưa có bảng gốc xác nhận; Scouting 1 được đối chiếu vai trò trinh sát (Trung Quốc 2010, wiki tiếng Anh 2009)` :unlock.status==='MODELED_TIER_PROXY'?`MÔ HÌNH TẠM: ${troopBuildingName} cấp ${u.tier} theo bậc quân; không phải số liệu lịch sử đã xác minh`:`Đã xác minh ${troopBuildingName} là nhà tuyển quân; cổng phụ từng đơn vị của chủng tộc còn thiếu nguồn`;return `<div class="card unitrow"><div><div class="heading">${hg28ArmyUnitThumb(u,56)} ${esc(u.name)} <span class="tag">Bậc ${u.tier}</span><span class="tag">${unlock.confidence}</span></div><div class="hint">${u.type} · HP ${u.hp} · ATK ${u.atk} · DEF ${u.def} · SPD ${u.spd} · Tầm ${E.unitTacticalRange(u)} ô · Hành quân ×${Math.max(.8,Math.min(1.10,.8+u.spd/40)).toFixed(2)}</div><div>Quân trong thành <b class="key">${state.army[u.id]||0}</b> · ${E.recruitDuration(state,u,1)}s/lính (hiện tại)</div><details class="hg28-unit-evidence"><summary>Điều kiện & nguồn</summary><small>Điều kiện: ${checks}</small><small>${confidence}</small></details><div class="cost" title="Giá 1 quân tính theo công thức engine thực tế">Giá 1: ${money(cost)}${u.tier>=9&&(state.buildings.blacksmith||0)>=8&&(state.spells.manufacturing||0)>=6?' · ⚒ Hiệu suất tinh nhuệ':''}</div>
 <div class="hg35-recruit-preview" id="pay_${u.id}" aria-live="polite">${esc(hg35RecruitQuote(u,defaultQty))}</div></div>
 <div class="entry hg35-recruit-controls">
 <label for="q_${u.id}">Số lượng</label><input id="q_${u.id}" aria-label="Số lượng ${esc(u.name)}" type="number" inputmode="numeric" min="1" max="${Math.max(1,maxQty)}" value="${defaultQty}">
 ${button('recruit-max',{id:u.id},'Tuyển tối đa ('+format(maxQty)+')',!unlocked||maxQty<1,'small secondary')}
 ${button('recruit',{id:u.id},unlocked?'Tuyển · trừ tài nguyên':'🔒',!unlocked||maxQty<1,'primary')}</div></div>`}).join('')}</div><div class="card"><h2>⚔ Bố trí quân theo nhóm</h2><p class="hint">Điểm chỉ huy của đội hình tướng đang chọn: <b>${format(E.formationPoints(state,formations))}</b> / <b>${format(E.heroLimit(state.heroes.find(h=>h.id===state.activeHero)?.level||1))}</b> điểm chỉ huy cơ bản (bảng tướng Lv1–100 của cộng đồng; bonus Arena/trang bị chưa hỗ trợ). </p><details class="hg28-provenance"><summary>Giới hạn đội hình</summary><p class="hint">Có thể tách cùng một binh chủng thành nhiều nhóm. Tối đa 7 nhóm trong HG-07 (4 hàng sau + 3 hàng trước, theo ghi nhận cộng đồng); số quân còn lại ở thành. Đây là giới hạn demo, không khẳng định là số ô đúng của client gốc.</p></details><div class="formation-grid">${Array.from({length:7},(_,i)=>`<div class="formation-slot ${i<4?'formation-back':'formation-front'}"><span class="tag" title="${i<4?'Hậu quân: x=1':'Tiền quân: x=3'} · Mỗi stack chịu giới hạn tổng điểm chỉ huy">${i<4?'⬅ Hậu':'➡ Tiền'} ${i<4?i+1:i-3}</span><select id="formation_unit_${i}" aria-label="Binh chủng nhóm ${i+1}">${opt(formations[i]?.unitId)}</select><input type="number" min="0" max="100000000" title="Không giới hạn cố định theo stack; số lượng chịu sức chứa chỉ huy và số quân đang có" aria-label="Số quân nhóm ${i+1}" id="formation_count_${i}" value="${formations[i]?.count||0}"></div>`).join('')}</div>${button('formation',{},'✓ Lưu đội hình',!!state.battle||!!(state.march&&state.march.phase!=='outbound'),'primary')} ${button('autoformation',{},'⚔ Bố trí quân nhanh',!!state.battle||!!(state.march&&state.march.phase!=='outbound')||!E.activeArmy(state).length,'secondary')} <small class="muted">Bố trí nhanh ưu tiên quân bậc cao trong giới hạn chỉ huy; có thể chỉnh thủ công bất cứ lúc nào.</small></div>
 </div><details class="hg28-army-ops" ${armyOpsOpen?'open':''}><summary>🧙 Điều binh · tự động hóa · săn Boss</summary>${heroArmyCommandView()}${hg24AutomationView()}${hg26AutohuntView()}</details>`;
}
function heroesViewBase(){const injured=Object.entries(state.wounded).filter(([,n])=>n>0),injuryText=injured.length?injured.map(([id,n])=>`${esc(E.getUnit(state,id)?.name||id)}: ${n}`).join('<br>'):'Không có quân bị thương.';const arena=state.arenaQueue,arenaUnit=arena?E.getUnit(state,arena.unitId):null,arenaCost=injured.length&&!arena?E.arenaHealCost(state,injured[0][0],injured[0][1]):0,heroCap=E.heroCountLimit(state.fame);return `<h1>🧙 Tướng lĩnh & Arena</h1><details class="hg28-provenance"><summary>📚 Giới hạn và nguồn tham chiếu</summary><p>Hero Tower, Castellan, Tavern và Arena là hệ thống Heroes of Gaia. Giới hạn số tướng theo bảng danh vọng Trung Quốc 2009: ${state.heroes.length}/${heroCap}. Giới hạn chỉ huy cơ bản theo bảng cộng đồng Lv1–100; chỉ số khởi điểm và chi phí tuyển vẫn được mô phỏng.</p></details><div class="grid grid2"><div><h2>Danh sách tướng</h2>${state.heroes.map(h=>`<div class="card"><div class="heading">🧙 ${esc(h.name)} <span class="tag">Lv.${h.level}</span><span class="tag">Chỉ huy ${format(E.heroLimit(h.level))}</span>${h.id===state.activeHero?'<span class="tag">Chỉ huy</span>':''}${h.id===state.castellan?'<span class="tag yellow">Castellan</span>':''}${state.stationedHeroes?.some(x=>x.heroId===h.id)?'<span class="tag yellow">Đồn trú ngoài bản đồ</span>':''}</div><div class="hint">ATK ${h.atk} · DEF ${h.def} · SPD ${h.spd} · INT ${h.int} · EXP ${h.xp}</div><div class="entry">${button('hero',{id:h.id},'Chọn chỉ huy',h.id===state.castellan||E.heroAway(state,h.id)||!!state.battle||!!(state.march&&state.march.phase!=='outbound'),'small secondary')}${button('castellan',{id:h.id},h.id===state.castellan?'Bỏ Castellan':'Bổ nhiệm',E.heroAway(state,h.id)||!!state.march||!!state.battle,'small secondary')}${button('recall',{id:h.id},'↩ Gọi về',!state.stationedHeroes?.some(x=>x.heroId===h.id)||!!state.march||!!state.battle||!!state.expedition,'small primary')}</div></div>`).join('')}<div class="hr"></div><h3>🍺 Tavern — Ứng viên tướng</h3><details class="hg28-provenance"><summary>📊 Cập nhật & xác suất Tavern</summary><p class="hint">Tự làm mới mỗi 60 phút game (SRC48). Cấp 6–9 mô phỏng một ứng viên tên xanh mỗi lượt theo ghi nhận “gần như luôn có”; xác suất gốc chưa rõ. Cấp 10 có 8 ứng viên/giờ (SRC21); mỗi chỉ số dùng mẫu cộng đồng: 98,03% trong 20–50, 1,94% trong 51–60, 0,03% trong 61–70. Đây không phải xác suất server. Chất lượng cấp thấp và giá tuyển chưa xác minh.</p></details><p class="muted tiny">Cấp ${state.buildings.tavern} · ${state.tavern.offers.length} ứng viên còn lại · ${Math.ceil(state.tavern.remaining/state.speed)} giây thực tới lượt làm mới</p><div class="tavern-offers">${state.tavern.offers.length?state.tavern.offers.map(o=>`<div class="card"><b>${esc(o.name)}</b> <span class="tag">${o.quality.toUpperCase()}</span><p class="tiny muted">Hero value ${o.heroValue} · ATK ${o.atk} (${o.statColors?.atk||'?'}) · DEF ${o.def} (${o.statColors?.def||'?'}) · SPD ${o.spd} (${o.statColors?.spd||'?'}) · INT ${o.int} (${o.statColors?.int||'?'})</p>${button('hirecandidate',{id:o.id},'Tuyển · '+format(o.gold)+' vàng',state.heroes.length>=heroCap||!E.canAfford(state,{gold:o.gold}),'small secondary')}</div>`).join(''):'<p class="hint">Đã tuyển hết ứng viên trong lượt này.</p>'}</div></div><div><h2>⚕ Arena · Bệnh xá</h2><div class="card">${injuryText}<details class="hg28-provenance"><summary>⚕ Tốc độ hồi phục & nguồn</summary><p class="hint">Nguồn Trung Quốc 2009 ghi 60–80% lính tổn thất thành thương binh, cứu chữa ở Arena bằng 1/7 giá trị quân bằng vàng và với tốc độ khoảng 3/5 tốc độ tuyển. Tỷ lệ 75% trong engine là mô hình điểm giữa. Wiki cộng đồng ghi Reincarnation pre-Babel giảm 1% thời gian mỗi cấp khi Castellan thủ thành (C).</p></details>${arena?`<div class="banner"><b>Đang điều trị:</b> ${arena.count} ${esc(arenaUnit?.name||arena.unitId)} · còn ${Math.ceil(arena.remaining/state.speed)} giây thực${arena.reincarnationLevel?` · Reincarnation -${arena.reincarnationLevel}%`:''}</div>`:''}${button('heal',{},arena?'Arena đang bận':`💚 Điều trị lượt đầu · ${format(arenaCost)} vàng`,!!arena||!injured.length||!E.canAfford(state,{gold:arenaCost}))}</div><div class="hr"></div><h2>📍 Tác vụ tướng</h2><p class="hint">Tướng là điều kiện bắt buộc để điều quân. Castellan gắn với thành đang mở; quân viễn chinh và quân đồn trú được theo dõi riêng.</p></div></div>`;}
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
  <p class="tiny muted">Đổi một lần để mở giai đoạn kế tiếp; sau khi hoàn tất, vẫn có thể farm và đổi thêm. Quân đã phân cho tướng không bị thu hồi. Không tạo quân từ không khí.</p>
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
     `<span class="${state.hg27.boss>=n.bossToken?'ready':'missing'}">${tokens.boss.icon} ${format(state.hg27.boss)}/${n.bossToken}</span>`,
     `<span class="${state.res.gold>=r.price?'ready':'missing'}">🪙 ${format(state.res.gold)}/${format(r.price)}</span>`
    ].join('');
    return `<div class="hg31-card ${selected?'selected':''}" data-hg31-id="${r.id}">
     <div class="hg31-gear-top">${E.hg31IconHTML(r.id,62)}<div><b>${esc(r.name)}</b><small>${r.slot==='weapon'?'Vũ khí':r.slot==='armor'?'Giáp':'Phụ kiện'} · ATK +${r.atk} · DEF +${r.def} · SPD +${r.spd}</small><small>Yêu cầu: vượt Tháp ${r.minFloor-1} · ${isBoss?'ít nhất 1 Boss':'ít nhất 3 tầng Tháp có thưởng'}</small></div></div>
     <div class="hg31-costs">${need}</div>
     <div class="hg31-actions">${button('hg31-focus',{id:r.id},selected?'🎯 Đang săn món này':'🎯 Chọn farm',selected||busy,'small secondary')}
     ${button('hg31-craft',{id:r.id},r.canCraft?'⚒ Ghép đúng món':!r.unlocked?'🔒 Chưa mở':'Thiếu vật liệu',!r.canCraft,'small primary')}</div>
     </div>`;
   }).join('')}</div></div>`;
 };
 return `<section class="card hg31-forge" aria-label="HG31 bộ trang bị Long Hồn và Tinh Không">
  <span class="eyebrow">HG31 · TRANG BỊ CAO CẤP · FARM ĐÚNG MÓN</span>
  <h2>⚒ Lò Rèn Long Hồn & Tinh Không</h2>
  <p class="tiny muted">Chọn trước món cần farm. Boss trả mảnh Long Hồn, Tháp có thưởng trả mảnh Tinh Không. Mảnh nhận bằng chiến thắng thật, không phát hồi tố khi nâng phiên bản. Sau khi ghép, vào <b>Tướng</b> để mặc và kích hoạt 2/3 – 3/3 bộ set.</p>
  <div class="hg31-status"><span>🐉 Boss thắng: <b>${s.bossWins}</b></span><span>🌌 Tháp có thưởng: <b>${s.towerWins}</b></span><span>⚒ Đã ghép: <b>${s.crafted}</b></span>${s.last?`<span>Vừa nhận: +${s.last.count} mảnh ${esc(E.ITEMS[s.last.id].name)}</span>`:''}</div>
  ${section('dragon')}${section('star')}
 </section>`;
}
function hg31GuideView(){
 const t=E.hg31Status(state);
 return `<section class="card hg31-guide"><span class="eyebrow">HG31 · HÀNH TRÌNH SĂN TRANG BỊ</span>
 <h2>🐉 Boss → Long Hồn · 🌌 Tháp → Tinh Không</h2>
 <div class="hg31-guide-row"><div>${E.hg31IconHTML(t.focus.boss,42)}<b>${esc(E.ITEMS[t.focus.boss].name)}</b><small>${format(t.fragments[t.focus.boss])} mảnh · Boss T11/T12: +1, T13: +2</small></div>
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
function hg29CraftView(){
 if(!E.hg29Catalogue)return '';
 const h=E.hg29Ensure(state),items=E.HG29_ITEMS,rows=E.hg29Catalogue(state);
 return `<section class='card hg29-craft' aria-label='HG29 Kho mảnh và ghép trang bị'><span class='eyebrow'>HG29 · SĂN QUÁI → NHẬT MẢNH → GHÉP</span><h2>🧩 Kho mảnh và chế tạo theo mục tiêu</h2><div class='hg29-wallet'>${Object.entries(items).map(([id,item])=>`<span title='Nguồn: ${esc(item.source)}'>${item.icon} ${esc(item.name)} <strong>${format(h.shards[id])}</strong></span>`).join('')}</div><div class='hg29-recipes'>${rows.map(r=>`<div class='card hg29-recipe'><b>${esc(r.name)}</b><small>${Object.entries(r.cost).map(([id,count])=>items[id].icon+' '+format(h.shards[id])+'/'+count).join(' · ')}</small>${button('hg29-craft',{id:r.id},r.canCraft?'⚒ Ghép':'Thiếu mảnh',!r.canCraft,'small primary')}</div>`).join('')}</div><p class='tiny muted'>Lựa chọn đúng món cần chế tạo; chỉ tiêu hao mảnh nhận qua chiến thắng thật. Không cộng trùng mảnh Tinh Vân / Ấn Boss cũ.</p></section>`;
}
function hg29GuideView(){
 if(!E.HG29_TABLES)return '';
 return `<section class='card hg29-guide'><span class='eyebrow'>HG29 · BẢNG RƠI MINH BẠCH</span><h2>🎯 Farm ở đâu?</h2><div class='hg29-guides'>${Object.entries(E.HG29_TABLES).map(([id,p])=>`<div class='card'><b>${esc(p.label)}</b><small>${p.guaranteed.map(([k,n])=>'✓ '+esc(E.HG29_ITEMS[k].name)+' ×'+n).concat(p.roll.filter(r=>r[0]!=='none').map(r=>esc(E.HG29_ITEMS[r[0]].name)+' '+r[3]/100+'%')).join(' · ')}</small></div>`).join('')}</div><p class='hint'>Tỷ lệ mới của Hẻoofgaia; mỗi trận thắng rút một lần trên bảng xác suất. Boss và Tháp có phần thưởng bảo đảm ngoài lần rút.</p></section>`;
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
function relicView(){
 const mat=state.hg18.materials,sets=E.hg18SetCounts(state,state.activeHero);
 const opens=['resource_card','resource_chest','gear_pack','set_chest'];
 return `<h1>💎 Rèn đúc & kho di vật</h1>${hg31ForgeView()}${hg29CraftView()}${hg27ExchangeView('gear')}
  <p class="hint">Thẻ, bộ trang bị, mảnh ghép và cường hóa do Hẻoofgaia thiết kế mới; Fandom xác nhận hệ trang bị và nguồn thưởng từ Bazaar/Babel, nhưng không xác nhận các công thức HG18 này.</p>
  <section class="card"><h2>🎒 Nguyên liệu và thẻ thưởng</h2><div class="grid grid3">${Object.entries(E.HG18_MATERIALS).map(([key,m])=>`<div class="card"><b>${ico(key,25)||m.icon} ${esc(m.name)}</b><p>Số lượng <b>${format(mat[key])}</b></p>
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
 <p>Chỉ huy hiện tại: <b>${esc(active.name)}</b> · ${active.equippedSpells.filter(id=>E.spell(state,id)?.kind!=='castellan').length}/5 phép chiến đấu · Castellan: <b>${castellan?esc(castellan.name):'chưa bổ nhiệm'}</b></p>
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
 <h3>⚜ ${esc(hero.name)} · Lv.${hero.level}</h3>
 <p class="hint">${esc(C.races[state.race].english)} · ATK ${hero.atk} · DEF ${hero.def} · SPD ${hero.spd} · INT ${hero.int}</p>
 <p class="hint">Thành thủ: ${esc(state.heroes.find(h=>h.id===state.castellan)?.name||'Chưa bổ nhiệm')} · Danh vọng ${format(state.fame)}</p></div>
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
 const selectedName=selected?esc(selected.name):'Chạm quân ta trên chiến trường';
 const focusedName=focused?esc(focused.name):'Chạm quân địch để chọn mục tiêu';
 const eventText=e=>{
  const actor=[...b.allies,...b.enemies].find(u=>u.id===e.actorId),target=[...b.allies,...b.enemies].find(u=>u.id===e.targetId),name=actor?.name||'Đội quân',targetName=target?.name||'mục tiêu',moved=e.from.x!==e.to.x||e.from.y!==e.to.y;
  let text;
  if(e.order==='defend')text=`${name} chờ lệnh (Stand By)`;
  else if(e.order==='retreat')text=moved?`${name} lùi về ô (${e.to.x+1}, ${e.to.y+1})`:`${name} không thể lùi vì ô phía sau bị chặn`;
  else if(e.order==='move')text=e.path.length?`${name} di chuyển ${e.path.length} ô tới (${e.to.x+1}, ${e.to.y+1})`:`${name} đã tới điểm đến`;
  else if(e.order==='advance')text=moved?`${name} tiến về phía ${targetName} (${e.path.length} ô)`:`${name} giữ vị trí trước ${targetName}`;
  else if(e.order==='focus')text=`${name} tập trung đánh ${targetName}`;
  else text=`${name} tấn công ${targetName}`;
  const result=[];
  if(e.damage>0)result.push(`${format(e.damage)} sát thương`);
  if(e.casualties>0)result.push(`${format(e.casualties)} quân tổn thất`);
  if(e.death)result.push('đội bị tiêu diệt');
  if(!result.length&&e.order==='defend')result.push('bỏ lượt');
  else if(!result.length&&e.order==='retreat'&&!moved)result.push('không đổi vị trí');
  else if(!result.length&&e.order==='move'&&!e.path.length)result.push('đã chạm đích');
  else if(!result.length&&e.path.length)result.push('chưa vào tầm đánh');
  return {name,text,result:result.join(' · ')};
 };
 const lastEvents=b.lastEvents||[],visibleEvents=lastEvents.slice(0,8);
 const eventRow=e=>{const r=eventText(e);return `<li data-battle-event="${esc(e.actorId)}" data-order="${esc(e.order||'')}" class="battle-event"><span><b>${esc(r.name)}</b><span>${esc(r.text)}</span></span><small>${esc(r.result||'Không có thay đổi')}</small></li>`};
 const spellIds=(state.heroes.find(h=>h.id===state.activeHero)?.equippedSpells||[]).filter(id=>E.spell(state,id)?.kind!=='castellan');
 const spellButtons=spellIds.map(id=>{const sp=E.spell(state,id);if(!sp)return '';const wait=(b.spellCooldown?.[id]||0)>b.turn,used=b.castTurn===b.turn;return button('cast',{id},`✨ ${esc(sp.name)} Lv.${state.heroMagic[id]||0}${wait?' ⏳':''}`,wait||used,'small secondary')}).join('')||'<span class="muted">Chưa có phép trang bị</span>';
 const spells=(b.hg21Tower||b.hg261Joint)?towerSpellPanel(b):`<div class="hg04-spells">${spellButtons}</div><small class="battle-spell-state">${b.activeSpell?`Đang hiệu lực: ${esc(E.spell(state,b.activeSpell.id)?.name||'')} · hết lượt ${b.activeSpell.expiry}`:'Không có phép đang hiệu lực'} · tối đa 1 phép/lượt</small>`;
 const movementHint=movementModeId?'Chọn ô lục giác viền sáng để đặt điểm đến.':selectedMoveTarget?`Đang tiến tới ô (${selectedMoveTarget.x+1}, ${selectedMoveTarget.y+1}).`:'Chọn quân ta trên bàn cờ rồi đặt điểm đến.';
 const autoLabel=state.battleAuto?'Đang tự động':`Tự động sau ${Math.max(0,Math.ceil((b.autoUntil-Date.now())/1000))} giây`;
 return `<div class="scene-title combat-scene-title"><div><span class="eyebrow">CHIẾN TRƯỜNG • CHIẾN THUẬT</span><h1>Giao tranh · ${esc(b.name)}</h1></div><div class="scene-tools">${button('save-combat',{},'💾',false,'small secondary')}<span class="tag">Lượt ${b.turn} · ${aliveAllies} : ${aliveEnemies}</span></div></div>
 <div class="battle-frame battle-stage${combatDockOpen?'':' battle-stage-collapsed'}"><canvas id="battle-canvas" width="1176" height="550" aria-label="Chiến trường lục giác. Bấm vào quân ta để chọn đội, quân địch để chọn mục tiêu; ra lệnh di chuyển rồi chọn ô trống."></canvas>
  <details class="battle-command-dock" ${combatDockOpen?'open':''}>
   <summary title="Thu gọn hoặc mở bảng lệnh" aria-label="Thu gọn hoặc mở bảng lệnh chiến đấu"><span class="battle-dock-label">⚔ LỆNH</span><span class="battle-dock-chevron" aria-hidden="true">⌄</span></summary>
   <div class="battle-command-content">
    <div class="battle-selection-readout"><div class="battle-side-readout"><small>QUÂN TA</small><b>${selectedName}</b><span>${selected?esc(statLine(selected)):'Chạm quân ta trên bàn cờ'}</span></div><div class="battle-side-readout enemy"><small>MỤC TIÊU</small><b>${focusedName}</b><span>${focused?esc(statLine(focused)):movementModeId?'Chọn ô lục giác để di chuyển':'Bấm quân địch trên ô'}</span></div></div>
    <div class="battle-auto-state" id="battle-auto-clock">${autoLabel}</div>
    <div class="battle-display-tools" role="group" aria-label="Tùy chọn chiến trường"><button type="button" class="battle-display-toggle" data-action="battle-grid" aria-pressed="${battleViewPrefs.grid}" title="Hiện hoặc ẩn lưới lục giác">${battleViewPrefs.grid?'⬡ Lưới':'⬡ Lưới tắt'}</button><button type="button" class="battle-display-toggle" data-action="battle-hp" aria-pressed="${battleViewPrefs.hp}" title="Hiện hoặc ẩn thanh máu">${battleViewPrefs.hp?'♥ Máu':'♡ Máu tắt'}</button></div>
    <div class="battle-action-grid">${button('battle',{cmd:'attack'},'⚔ ĐÁNH',false,'primary')}${button('battle',{cmd:'advance'},'↗ TIẾN',false,'secondary')}${button('move-mode',{},movementModeId?'✕ HỦY Ô':selectedMoveTarget?'↗ ĐỔI ĐÍCH':'⌖ ĐẶT ĐÍCH',!selected||selected.pool<=0,'secondary')}${button('battle',{cmd:'defend'},'🛡 CHỜ',false,'secondary')}${button('battle',{cmd:'focus'},'🎯 TẬP TRUNG',false,'secondary')}${button('battle',{cmd:'retreat'},'↙ LÙI',false,'secondary')}${button('auto',{},state.battleAuto?'⏸ DỪNG TỰ ĐÁNH':'▶ TỰ ĐÁNH',false,'auto secondary')}</div>
    <p class="battle-move-prompt" id="battle-move-prompt">${movementHint}</p>
    <details class="battle-spell-fold"><summary>✨ Phép chiến đấu · ${spellIds.length||((b.hg21Tower||b.hg261Joint)?'tướng':'0')}</summary><div>${spells}</div></details>
   </div>
  </details>
 </div>
 <details class="battle-report-fold"><summary>📜 Diễn biến lượt ${Math.max(0,b.turn-1)} · ${lastEvents.length} hành động</summary><section class="battle-receipts" aria-label="Kết quả hành động lượt vừa qua" data-battle-receipts><div class="battle-receipts-heading"><h2>LƯỢT ${Math.max(0,b.turn-1)}</h2><span>${lastEvents.length} hành động</span></div>${lastEvents.length?`<ol class="battle-event-list">${visibleEvents.map(eventRow).join('')}</ol>${lastEvents.length>8?`<details class="battle-event-more"><summary>Xem ${lastEvents.length-8} hành động còn lại</summary><ol class="battle-event-list">${lastEvents.slice(8).map(eventRow).join('')}</ol></details>`:''}`:'<p class="battle-receipts-empty">Biên nhận sẽ hiện sau khi lượt đầu phân giải.</p>'}</section><div class="combat-journal">${b.history.slice(0,3).map(l=>`<div>• ${esc(l)}</div>`).join('')}</div><p class="hint">Thứ tự lượt trước: ${(b.lastActOrder||[]).map(id=>[...b.allies,...b.enemies].find(u=>u.id===id)?.name).filter(Boolean).map(esc).join(' → ')||'Chưa có'} · AI: ${esc(targetSummary||'Chưa có')}.</p><p class="hint">Mô hình hiện tại: lượt theo tốc độ; Stand By bỏ lượt; Lùi quân dịch 1 ô. Công thức sát thương và AI vẫn đang mô phỏng.</p></details>`;
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
  canvas.onwheel=e=>{e.preventDefault();P.zoomMap(e.deltaY>0?.9:1.1);draw()};
 }if(tab==='city'){const canvas=$('city-canvas');P.drawCity(canvas,E,state,selectedBuilding);
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),key=P.cityHit(canvas,(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height);if(key){selectedBuilding=key;render()}};
 }else if(tab==='combat'){
  const canvas=$('battle-canvas'),interaction={movementModeId,showGrid:battleViewPrefs.grid,showHP:battleViewPrefs.hp};
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
   P.drawBattle(canvas,E,state,now,interaction);
  };
  drawCombatFrame(undefined);
  if(P.hasAnimatedTroops(state.battle)){
   const battle=state.battle;let lastFrame=0;
   // Display frames at the monitor cadence (capped at ~60Hz), not the old
   // enforced 24fps jitter. The RAF dies when navigation replaces the canvas.
   const animate=now=>{
    if(!state||state.battle!==battle||$('battle-canvas')!==canvas)return;
    if(!lastFrame||now-lastFrame>=1000/60-2){
     drawCombatFrame(now);lastFrame=now;
    }
    requestAnimationFrame(animate);
   };
   requestAnimationFrame(animate);
  }
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
    const grid=E.BATTLE_GRID||{cols:12,rows:9,top:173,bottom:185};
    if(movementModeId){const cell=P.battleCellAt(canvas,x,y,E);if(!cell){toast('Hãy chọn một ô nằm trong lưới chiến trường.');return}fail(()=>{markBattleInput();const out=E.battleAct(state,'move',{x:cell.x,y:cell.y});movementModeId=null;const move=state.battle?.lastMoves?.find(m=>m.unitId===state.battle.selected);if(move)toast(`${state.battle.allies.find(u=>u.id===move.unitId)?.name||'Đội quân'} di chuyển ${move.steps} ô tới (${move.to.x}, ${move.to.y}).`);if(out.type==='win'){tab='map';toast('Chiến thắng!')}else if(out.type==='lose'){tab='heroes';toast('Thất bại, có thể chữa thương.')}else if(out.type==='retreat'||out.type==='timeout'){tab='map';toast('Đã kết thúc giao tranh.')}});return}
    const target=P.battleHit(canvas,x,y,E,state);
    if(target)fail(()=>{markBattleInput();E.battleSelect(state,target.id)});};
 }
}
function render(){
 const enteringCombat=!!state?.battle&&!document.body.classList.contains('combat-mode');
 if(enteringCombat)combatDockOpen=true;
 document.body.classList.toggle('combat-mode',!!state?.battle);
 const overlay=$('game-modal'),body=$('game-modal-body');
 const existingArmyOps=body?.querySelector('.hg28-army-ops:not(.hg28-army-quest)');if(existingArmyOps)armyOpsOpen=existingArmyOps.open;
 const existingArmyQuest=body?.querySelector('.hg28-army-quest');if(existingArmyQuest)armyQuestOpen=existingArmyQuest.open;
 if(!state){overlay.hidden=true;showWorldIndex=false;document.body.classList.remove('window-open');renderIntro();return}
 if(!state.battle){movementModeId=null;if(tab==='combat')tab='map'}
 if(state.battle){tab='combat';showWorldIndex=false;showResourceInfo=false}
 renderHUD();
 const popup=tab!=='map'&&tab!=='combat'||tab==='map'&&(showWorldIndex||showResourceInfo);
 const content=tab==='map'?mapView():tab==='city'?cityView():tab==='army'?armyView():tab==='heroes'?heroesView():tab==='magic'?magicView():tab==='relics'?relicView():tab==='tower'?towerView():tab==='combat'?combatView():tab==='tasks'?tasksView():tab==='reports'?battleReportsView():sourceView();
 if(popup){
  $('main').innerHTML=mapView();
  $('game-modal-title').textContent=showResourceInfo&&tab==='map'?'💰 Tài nguyên & kho':showWorldIndex&&tab==='map'?'📍 Danh sách điểm đến':tabs.find(x=>x[0]===tab)?.[1]||'Quản lý';
  body.innerHTML=showResourceInfo&&tab==='map'?'<div class="grid grid3">'+C.keys.map(k=>{
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
 paint();
 if(enteringCombat){$('toast')?.classList.remove('show');window.scrollTo({top:0,left:0,behavior:'instant'});}
}
$('app').addEventListener('input',evt=>{
 const field=evt.target;if(field?.id?.startsWith('q_'))hg35UpdateRecruitQuote(field.id.slice(2));
});
$('app').addEventListener('click',evt=>{const target=evt.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
 if(action==='modal-page'){const body=$('game-modal-body');const dir=Number(target.dataset.dir)||1;body.scrollTop=Math.max(0,Math.min(body.scrollHeight-body.clientHeight,body.scrollTop+dir*body.clientHeight*.86));modalOffset=body.scrollTop;return;}
 if(action==='modal-backdrop'){if(evt.target===target){showWorldIndex=false;showResourceInfo=false;tab='map';modalOffset=0;render();}return;}
 if(action==='recruit-max'){
  const id=target.dataset.id,qty=E.recruitMax(state,id),input=$('q_'+id);
  if(input){input.value=String(qty);hg35UpdateRecruitQuote(id)}
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
 if(action==='battle-grid'||action==='battle-hp'){
  const which=action==='battle-grid'?'grid':'hp';
  toggleBattleDisplay(which);
  const button=document.querySelector('.battle-command-dock [data-action="'+action+'"]');
  if(button){
   button.setAttribute('aria-pressed',String(battleViewPrefs[which]));
   button.textContent=which==='grid'?(battleViewPrefs.grid?'⬡ Lưới':'⬡ Lưới tắt'):
    (battleViewPrefs.hp?'♥ Máu':'♡ Máu tắt');
  }
  // The continuously running RAF sees updated interaction preferences.
  if(!$('battle-canvas'))render();
  return;
 }
 fail(()=>{
 if(action==='modal-close'){showWorldIndex=false;showResourceInfo=false;tab='map';modalOffset=0;return}
 if(action==='world-index'){showWorldIndex=!showWorldIndex;showResourceInfo=false;modalOffset=0;return}
 if(action==='resource-info'){showResourceInfo=!showResourceInfo;showWorldIndex=false;tab='map';modalOffset=0;return}
 if(action==='race'){newRace=target.dataset.race;render();return}
 if(action==='spelledition'){newSpellEdition=target.dataset.edition;render();return}
 if(action==='start'){hg261Draft=null;state=E.make(newRace,Date.now(),newSpellEdition);tab='map';selected='3,4';selectedTargetKind=null;return}
 if(action==='tab'){tab=target.dataset.tab;showWorldIndex=false;showResourceInfo=false;modalOffset=0;
  focusArmyRecruitOnOpen=tab==='army';return}
 if(action==='city-switch'){E.switchCity(state,target.dataset.id);selected=E.activeCity(state).key;tab='city';return}
 if(action==='city-transport'){const cargo=Object.fromEntries(C.keys.map(k=>[k,Number($(`city-transport-${k}`)?.value||0)])),convoy=E.startCityTransport(state,target.dataset.city,$('city-transport-unit')?.value,Number($('city-transport-count')?.value),cargo);toast(`Đoàn tiếp tế đã xuất phát; sức tải ${format(convoy.weight)}/${format(convoy.capacity)}.`);return}
 if(action==='select'){selected=target.dataset.key;selectedTargetKind=target.dataset.kind==='treasure'?'treasure':null;const tile=E.getTile(selected);if(tile)Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y});return}
 if(action==='building'){selectedBuilding=target.dataset.key;return}
 if(action==='zoom'){P.zoomMap(target.dataset.dir==='in'?1.25:.8);return}
 if(action==='center'){const city=E.activeCity(state),tile=E.getTile(city.key);Object.assign(P.mapCamera(),{centerX:tile.x,centerY:tile.y,zoom:1.12});selected=city.key;selectedTargetKind=null;return}
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
 if(action==='auto'){if(state.battle?.hg26NeedsManual)delete state.battle.hg26NeedsManual;state.battleAuto=!state.battleAuto;if(state.battle)state.battle.autoUntil=Date.now()+(state.battleAuto?BATTLE_AUTO_TURN_DELAY_MS:BATTLE_AUTO_DELAY_MS);return}
 if(action==='upgrade'){
  const cost=E.upgrade(state,target.dataset.key);
  toast('Đã trừ '+hg35ExpenseText(cost)+'; bắt đầu xây.');return;
 }
 if(action==='learn'){E.learn(state,target.dataset.id);return}
 if(action==='research'){E.researchTechnology(state,target.dataset.id);return}
 if(action==='heropoint'){E.allocateHeroPoint(state,Number(target.dataset.id),target.dataset.stat);return}
 if(action==='recruit'){
  const id=target.dataset.id,qty=Number($('q_'+id).value);
  const spent=E.recruit(state,id,qty);
  toast('Đã trừ '+hg35ExpenseText(spent)+'; xếp hàng '+format(qty)+' quân.');return;
 }
 if(action==='march'){const commander=state.heroes.find(h=>h.id===state.activeHero);let count=state.formation?.reduce((n,g)=>n+g.count,0)||0;if(!count){const starter=E.autoFormation(state);count=starter.total;toast('Tự bố trí '+count+' quân cho '+(commander?.name||'tướng')+'. Có thể tùy chỉnh trong Quân đội.');}E.startMarch(state,selected,target.dataset.kind==='treasure'?'treasure':undefined);toast((commander?.name||'Tướng')+' xuất chinh cùng '+count+' quân.');return}
 if(action==='visit'){const result=E.visitWorldBuilding(state,target.dataset.key);toast(result.reward?'Đã nhận thưởng từ công trình.':'Hiệu ứng đã áp dụng cho tướng.');return}
  if(action==='recall'){const seconds=E.recallHero(state,Number(target.dataset.id));toast(seconds===true?'Tướng đã về thành.':`Tướng đang trở về trong ${Math.ceil(seconds/state.speed)} giây thực.`);return}
  if(action==='save-combat'){$('save').click();return}
  if(action==='battle'){movementModeId=null;state.battleAuto=false;const wasTower=!!state.battle?.hg21Tower,out=E.battleAct(state,target.dataset.cmd);if(out.type==='win'){tab=wasTower?'tower':'map';toast(wasTower?'Thắng Bí Cảnh tầng '+out.floor+'!':'Chiến thắng!')}else if(out.type==='lose'){tab=wasTower?'tower':'heroes';toast(wasTower?'Bí Cảnh thất bại; không mất quân và lượt thưởng.':'Thất bại, có thể chữa thương.')}else if(out.type==='retreat'||out.type==='timeout'){tab=wasTower?'tower':'map';toast('Đã kết thúc giao tranh.')}return}
 if(action==='tower-cast'){markBattleInput();E.hg21TowerCast(state,Number(target.dataset.hero),target.dataset.id);toast('Phép đã áp dụng theo chủ tướng.');return}
 if(action==='herolearn'){E.researchHeroSpell(state,target.dataset.id);return}
 if(action==='heroequip'){E.equipSpell(state,target.dataset.id);return}
 if(action==='herocastellanequip'){if(!state.castellan)throw Error('Cần bổ nhiệm Castellan trước');E.equipSpell(state,target.dataset.id,state.castellan);return}
 if(action==='cast'){if(state.battle)markBattleInput();E.cast(state,target.dataset.id);return}
 if(action==='equipitem'){E.equipItem(state,Number(target.dataset.uid));return}
 if(action==='unequip'){E.unequipItem(state,target.dataset.slot);return}
 if(action==='buyitem'){E.buyItem(state,target.dataset.id);return}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('game-modal').hidden){showWorldIndex=false;showResourceInfo=false;tab='map';modalOffset=0;render();}});
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
  const imported=E.parseSave(await file.text());
  if(!confirm('Khôi phục save từ file? Tiến độ HG-08 hiện tại sẽ được thay bằng dữ liệu trong file.'))return;
  const beforeImport=state;try{state=imported;E.tick(state);if(!save())throw Error('Không thể lưu bản nhập; bản lưu cũ vẫn được giữ nguyên.');selected='3,4';selectedTargetKind=null;tab=state.battle?'combat':'map';render();toast('Đã khôi phục save.')}catch(error){state=beforeImport;throw error}
 }catch(err){toast('Không thể nhập save: '+(err.message||String(err)))}
};
$('reset').onclick=()=>{if(!confirm('Xóa save phiên bản HG-08 và tạo vương quốc khác?'))return;state=null;newRace='human';selected=null;selectedTargetKind=null;localStorage.removeItem(E.SAVE_KEY);localStorage.removeItem(E.SAVE_KEY+'_backup');localStorage.setItem('heoofgaia_hg08_skip_migration','1');render()};
 document.querySelectorAll('[data-city-art]').forEach(image=>image.addEventListener('load',()=>{if(state&&tab==='city')render()}));
 state=load();if(state){ensureBattleAutoTimer(state);selected='3,4';selectedTargetKind=null;state.battleAuto=false;tab=state.battle?'combat':'map'}render();
setInterval(()=>{if(!state)return;const before=state.battle,training=state.training.length,building=state.buildingQueue?.key||null,arena=state.arenaQueue?.id||null;try{E.tick(state);const farmPulse=state.hg26?.enabled?E.hg26Step(state):null;if(farmPulse?.changed)save();if(!before&&state.battle)tab='combat';if(state.battle&&!state.hg26?.enabled&&!state.battle.hg26NeedsManual&&!state.battleAuto&&Date.now()>=(state.battle.autoUntil||0))state.battleAuto=true;const changed=before!==state.battle||!!farmPulse?.changed||
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
  if(training!==state.training.length||building!==(state.buildingQueue?.key||null)||
     arena!==(state.arenaQueue?.id||null))renderHUD();
 }else if(!changed){
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
window.HOG_APP_DEBUG={getState:()=>state,battleViewPrefs:()=>({...battleViewPrefs}),render,save,resetForTests:()=>{state=E.make('human',Date.now());selected='5,6';selectedTargetKind=null;render()}};
})();
