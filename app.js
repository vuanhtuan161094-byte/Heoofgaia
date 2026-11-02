(function(){
'use strict';
const E=window.HOG_ENGINE, C=window.HOG_CATALOG, P=window.HOG_PAINTER;
const $=id=>document.getElementById(id);let state=null,tab='map',newRace='human',selected=null,lastToast=0,selectedBuilding='hall';
const tabs=[['map','🗺 Thế giới'],['city','🏰 Thành trì'],['army','🛡 Quân đội'],['heroes','🧙 Tướng'],['magic','🔮 Pháp thuật'],['tasks','📜 Nhiệm vụ'],['sources','📚 Tư liệu']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=E.fmt;
function toast(message){const n=$('toast');n.textContent=message;n.classList.add('show');lastToast=Date.now();setTimeout(()=>{if(Date.now()-lastToast>=2700)n.classList.remove('show')},2800)}
function fail(fn){try{fn();save();render();}catch(e){toast(e.message||String(e))}}
function save(){if(!state)return false;try{localStorage.setItem(E.SAVE_KEY,JSON.stringify(state));return true}catch(e){toast('Không thể lưu: trình duyệt đang hạn chế storage.');return false}}
function load(){
 try{
  const current=localStorage.getItem(E.SAVE_KEY);
  if(current){const s=E.parseSave(current);E.tick(s);return s}
  if(localStorage.getItem('heoofgaia_hg06_skip_migration'))return null;
  for(const key of ['heoofgaia_hg_only_v05','heoofgaia_hg_only_v04','heoofgaia_hg_only_v03','heoofgaia_hg_only_v02']){
   const raw=localStorage.getItem(key);if(!raw)continue;
   try{const s=E.parseSave(raw);E.tick(s);localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));return s}
   catch(err){console.warn('Legacy save skipped:',key,err.message)}
  }
 }catch(e){console.warn('Save invalid',e)}return null;
}
function money(cost){return Object.entries(cost).filter(([,v])=>v>0).map(([k,v])=>`${C.resource[k].emoji} ${format(v)}`).join(' · ')}
function button(action,data,label,disabled=false,cls=''){return `<button ${disabled?'disabled':''} data-action="${esc(action)}" ${Object.entries(data||{}).map(([k,v])=>`data-${esc(k)}="${esc(v)}"`).join(' ')} class="${cls}">${label}</button>`}
function flags(){return `<span class="tag">📍 Thành Gaia (3,4)</span><span class="tag">🔋 AP ${Math.floor(state.ap)}/${state.apMax}</span><span class="tag">🏅 Danh vọng ${format(state.fame)}</span><span class="tag">⏱ ×${state.speed} demo</span>`}
function renderIntro(){
 $('nav').innerHTML='';$('resources').innerHTML='';$('status').innerHTML='<p>Một bản tái dựng độc lập lấy cảm hứng từ Heroes of Gaia (2009).</p>';$('logs').innerHTML='';
 $('main').innerHTML=`<section class="welcome"><div class="welcome-scene"><canvas id="intro-canvas" width="1176" height="560" aria-label="Phong cảnh thành trì theo chủng tộc"></canvas><div class="welcome-copy"><div class="eyebrow">CHRONICLES OF GAIA • REBUILD 06</div><h1>HẺOOFGAIA</h1><p>Phát triển thành trì • dẫn quân vượt thế giới • chinh phục mỏ và quái vật</p></div></div><div class="welcome-bottom"><h2>Chọn chủng tộc khởi đầu</h2><div class="race-grid">${Object.entries(C.races).map(([k,v])=>`<button data-action="race" data-race="${k}" class="race-card ${newRace===k?'active':''}"><span class="emoji">${v.emoji}</span><strong>${v.name}</strong><small>${v.english}</small></button>`).join('')}</div>${button('start',{},'⚔ Thành lập thành Gaia',false,'primary wide')}<p class="hint">Chế độ chơi offline; hình ảnh tự dựng, công thức chiến đấu hiện là thử nghiệm, chưa phải game chính thức.</p></div></section>`;
 P.drawCity($('intro-canvas'),E,E.make(newRace),'hall');
}
function renderHUD(){const lim=E.limits(state);$('resources').innerHTML=C.keys.map(k=>`<div class="resource">${C.resource[k].emoji} ${C.resource[k].label}<b>${format(state.res[k])}</b><small class="muted">/${format(lim[k])} · +${format(E.rate(state)[k])}/h</small></div>`).join('');
 $('nav').innerHTML=tabs.map(([id,name])=>`<button data-action="tab" data-tab="${id}" class="${tab===id?'active':''}">${name}</button>`).join('');
 const earning=E.rate(state);$('status').innerHTML=`<div class="vitals">${flags()}</div><div class="muted tiny">${C.races[state.race].emoji} ${C.races[state.race].name} · ${state.heroes.length} tướng · ${E.activeArmy(state).reduce((n,u)=>n+state.army[u.id],0)} lính</div><div class="hr"></div><div class="hint">Sản lượng / giờ game:</div><div class="tiny">${C.keys.map(k=>`${C.resource[k].emoji} +${format(earning[k])}`).join(' · ')}</div><div class="hr"></div><div class="hint"><b>🏗 Xây dựng:</b> ${state.buildingQueue?esc(C.buildings[state.buildingQueue.key].name)+' Lv.'+state.buildingQueue.level+' · '+Math.ceil(state.buildingQueue.remaining/state.speed)+'s thực':'Trống'}</div><div class="hr"></div><div class="hint">Hàng đợi: ${state.training.length?esc(E.getUnit(state,state.training[0].unitId).name)+' ('+format(state.training[0].remaining)+'s game)':'Trống'}</div>${state.march?`<p class="notice">🚩 Hành quân: ${Math.ceil(state.march.remaining)}s game</p>`:''}`;
 $('logs').innerHTML=state.log.map(t=>`<div>• ${esc(t)}</div>`).join('');$('speed').textContent=`⏱ ×${state.speed}`;
}
function mapView(){
 const target=E.getTile(selected||'3,4');const claimed=t=>state.mines.some(m=>m.key===t.key),cleared=t=>state.cleared.includes(t.key);
 const active=target&&['mine','npc'].includes(target.kind)&&!claimed(target)&&!cleared(target);
 const label=t=>t.kind==='castle'?'Thành Gaia':t.kind==='mine'?`Mỏ ${C.resource[t.value].label}`:t.value;
 const desc=target?target.kind==='castle'?'Thành chính • điểm xuất phát':target.kind==='mine'?`${label(target)} · cấp ${target.level}`:target.kind==='npc'?`Trại ${label(target)} · cấp ${target.level}`:`Địa hình ${target.terrain}`:'Chưa chọn mục tiêu';
 return `<div class="scene-title"><div><span class="eyebrow">WORLD EXPLORATION • 28 × 18</span><h1>Thế giới Gaia</h1></div><div class="scene-tools">${button('zoom',{dir:'in'},'＋',false,'secondary')}${button('zoom',{dir:'out'},'－',false,'secondary')}${button('center',{},'⌖ Về thành',false,'secondary')}</div></div>
 <div class="map-frame"><canvas id="world-canvas" width="1176" height="620" aria-label="Bản đồ thế giới tương tác, kéo và chạm chọn tọa độ"></canvas></div>
 <div class="scene-bottom"><div class="target-information"><span class="eyebrow">MỤC TIÊU ĐANG CHỌN</span><h2>${esc(desc)}</h2><p class="muted">${target?`Tọa độ (${target.x}, ${target.y}) · ${claimed(target)?'Đã chiếm':cleared(target)?'Đã dọn sạch':target.kind==='empty'?'Khám phá tự do':'Chưa chinh phục'}`:'—'}</p><div class="actions">${button('march',{},state.march?'Tướng đang hành quân':state.battle?'Đang giao tranh':'🚩 Xuất chinh',!active||!!state.march||!!state.battle||!E.activeArmy(state).length,'primary')}<span class="hint">Chiếm mỏ -6 AP • Quái -8 AP (mô phỏng)</span></div></div>
 <div class="landmarks"><span class="eyebrow">ĐỊA ĐIỂM GẦN ĐÂY</span><div class="landmark-list">${E.TILES.filter(t=>['mine','npc'].includes(t.kind)).sort((a,b)=>Math.abs(a.x-3)+Math.abs(a.y-4)-Math.abs(b.x-3)-Math.abs(b.y-4)).slice(0,7).map(t=>button('select',{key:t.key},`${t.kind==='mine'?'◆':'⚔'} ${esc(label(t))} (${t.x},${t.y})`,false,selected===t.key?'small primary':'small secondary')).join('')}</div></div></div>
 ${state.march?`<div class="banner">🚩 Đạo quân đang tiến tới (${state.march.target}) • ${Math.ceil(state.march.remaining/state.speed)} giây thực còn lại • Đường tránh sông được tính tự động</div>`:''}`;
}
function cityViewBase(){const k=selectedBuilding,b=C.buildings[k],lv=state.buildings[k],cost=E.buildCost(state,k),can=!state.buildingQueue&&b.state==='observed'&&lv<10&&(k==='hall'||lv<state.buildings.hall)&&E.canAfford(state,cost);
 return `<div class="scene-title"><div><span class="eyebrow">CASTLE • ${esc(C.races[state.race].english.toUpperCase())}</span><h1>Thành trì Gaia</h1></div><div class="scene-tools"><span class="tag">Town Hall Lv.${state.buildings.hall}</span><span class="tag">${E.buildOrder.filter(id=>state.buildings[id]>0).length} công trình đang hoạt động</span></div></div>
 <div class="city-frame"><canvas id="city-canvas" width="1176" height="560" aria-label="Toàn cảnh thành theo chủng tộc, nhấn công trình để chọn"></canvas></div>
 <div class="scene-bottom"><div class="target-information"><span class="eyebrow">CÔNG TRÌNH ĐANG CHỌN</span><h2>${b.icon} ${esc(b.name)} · cấp ${lv}</h2><p>${esc(b.desc)}</p><p class="cost">Chi phí cấp tiếp: ${money(cost)}</p><div class="actions">${button('upgrade',{key:k},state.buildingQueue?'⏳ Đang xây dựng':'⬆ Nâng cấp công trình',!can,'primary')}<span class="hint">${b.state!=='observed'?'Tính năng chưa xác minh':k!=='hall'&&lv>=state.buildings.hall?'Nâng Town Hall trước':'Giá nâng cấp hiện là demo'}</span></div></div>
 <div class="landmarks"><span class="eyebrow">DANH SÁCH CÔNG TRÌNH</span><div class="landmark-list">${E.buildOrder.map(id=>button('building',{key:id},`${C.buildings[id].icon} ${C.buildings[id].name} ${state.buildings[id]}`,false,id===k?'small primary':'small secondary')).join('')}</div></div></div>`;
}
function armyView(){
 const formations=(state.formation?.length?state.formation:E.activeArmy(state).slice(0,1).map(u=>({unitId:u.id,count:state.army[u.id]})));
 const opt=(sel)=>`<option value="">— Để trống —</option>${E.arrUnits(state).map(u=>`<option value="${u.id}" ${sel===u.id?'selected':''}>${esc(u.name)} (${state.army[u.id]} có sẵn)</option>`).join('')}`;
 return `<h1>🛡 Barracks · Doanh trại cấp ${state.buildings.barracks}</h1><p class="hint">Dữ liệu 10 quân của ${C.races[state.race].english}. Nâng Barracks để mở bậc quân. Quân đang tuyển chưa được đưa vào đội hình.</p>
 <div class="banner"><b>Hàng đợi tuyển quân</b> ${state.training.length?state.training.map((q,i)=>`<div>⌛ ${i+1}. ${q.count} ${esc(E.getUnit(state,q.unitId).name)} · ${Math.ceil(q.remaining/state.speed)} giây thực</div>`).join(''):'Trống'} </div>
 <div class="card"><h2>⚔ Bố trí quân theo nhóm</h2><p class="hint">Giá trị đội hình: <b>${format(E.troopValue(state))}</b> / <b>${format(E.heroLimit(state.heroes.find(h=>h.id===state.activeHero)?.level||1))}</b> điểm chỉ huy cơ bản (bảng tướng Lv1–100 của cộng đồng; bonus Arena/trang bị chưa hỗ trợ). </p><p class="hint">Có thể tách cùng một binh chủng thành nhiều nhóm. Tối đa 7 nhóm trong HG-07 (4 hàng sau + 3 hàng trước, theo ghi nhận cộng đồng); số quân còn lại ở thành. Đây là giới hạn demo, không khẳng định là số ô đúng của client gốc.</p><div class="formation-grid">${Array.from({length:7},(_,i)=>`<div class="formation-slot"><span class="tag">Nhóm ${i+1}</span><select id="formation_unit_${i}" aria-label="Binh chủng nhóm ${i+1}">${opt(formations[i]?.unitId)}</select><input type="number" min="0" max="100000" aria-label="Số quân nhóm ${i+1}" id="formation_count_${i}" value="${formations[i]?.count||0}"></div>`).join('')}</div>${button('formation',{},'✓ Lưu đội hình',!!state.march||!!state.battle,'primary')} <small class="muted">Quân không phân bổ sẽ không xuất chinh.</small></div>
 <div class="grid grid2" style="margin-top:12px">${E.arrUnits(state).map(u=>{const unlocked=u.tier<=state.buildings.barracks&&(u.tier!==2||!!state.spells.scouting),cost=E.recruitCost(state,u,1);return `<div class="card unitrow"><div><div class="heading">${u.tier>=9?'🐉':u.type==='Ranged'?'🏹':'⚔️'} ${esc(u.name)} <span class="tag">Bậc ${u.tier}</span></div><div class="hint">${u.type} · HP ${u.hp} · ATK ${u.atk} · DEF ${u.def} · SPD ${u.spd}</div><div>Quân trong thành <b class="key">${state.army[u.id]}</b> · ${u.timeSec}s/lính</div><div class="cost">Giá 1: ${money(cost)}</div></div><div class="entry"><input id="q_${u.id}" aria-label="Số lượng ${esc(u.name)}" type="number" min="1" max="1000" value="3">${button('recruit',{id:u.id},unlocked?'Tuyển':'🔒',!unlocked)}</div></div>`}).join('')}</div>`;
}
function heroesViewBase(){return `<h1>🧙 Tướng lĩnh & Arena</h1><p class="hint">Hero Tower, Castellan, Tavern và Arena là hệ thống Heroes of Gaia. Giới hạn chỉ huy cơ bản theo bảng cộng đồng Lv1–100; chỉ số khởi điểm và chi phí tuyển là mô phỏng.</p><div class="grid grid2"><div><h2>Danh sách tướng</h2>${state.heroes.map(h=>`<div class="card"><div class="heading">🧙 ${esc(h.name)} <span class="tag">Lv.${h.level}</span><span class="tag">Chỉ huy ${format(E.heroLimit(h.level))}</span>${h.id===state.activeHero?'<span class="tag">Chỉ huy</span>':''}${h.id===state.castellan?'<span class="tag yellow">Castellan</span>':''}</div><div class="hint">ATK ${h.atk} · DEF ${h.def} · SPD ${h.spd} · INT ${h.int} · EXP ${h.xp}</div><div class="entry">${button('hero',{id:h.id},'Chọn chỉ huy',h.id===state.castellan||!!state.march||!!state.battle,'small secondary')}${button('castellan',{id:h.id},h.id===state.castellan?'Bỏ Castellan':'Bổ nhiệm',!!state.march||!!state.battle,'small secondary')}</div></div>`).join('')}<div class="hr"></div><h3>🍺 Tavern — Ứng viên tướng</h3><p class="hint">Tự làm mới mỗi 60 phút game. Số ứng viên theo cấp Tavern; phẩm chất và giá tuyển là mô phỏng.</p><p class="muted tiny">Cấp ${state.buildings.tavern} · ${state.tavern.offers.length} ứng viên còn lại · ${Math.ceil(state.tavern.remaining/state.speed)} giây thực tới lượt làm mới</p><div class="tavern-offers">${state.tavern.offers.length?state.tavern.offers.map(o=>`<div class="card"><b>${esc(o.name)}</b> <span class="tag">${o.quality.toUpperCase()}</span><p class="tiny muted">ATK ${o.atk} · DEF ${o.def} · SPD ${o.spd} · INT ${o.int}</p>${button('hirecandidate',{id:o.id},'Tuyển · '+format(o.gold)+' vàng',state.heroes.length>=8||!E.canAfford(state,{gold:o.gold}),'small secondary')}</div>`).join(''):'<p class="hint">Đã tuyển hết ứng viên trong lượt này.</p>'}</div></div><div><h2>⚕ Arena · Bệnh xá</h2><div class="card">${Object.entries(state.wounded).filter(([,n])=>n>0).length?Object.entries(state.wounded).filter(([,n])=>n>0).map(([id,n])=>`${esc(E.getUnit(state,id)?.name||id)}: ${n}`).join('<br>'):'Không có quân bị thương.'}<p class="hint">Theo wiki: khoảng 75% quân bị hạ chuyển vào Arena. Chi phí hồi phục hiện đang mô phỏng.</p>${button('heal',{},'💚 Chữa thương',Object.values(state.wounded).every(n=>n<=0))}</div><div class="hr"></div><h2>📍 Tác vụ tướng</h2><p class="hint">Tướng là điều kiện bắt buộc để điều quân. Castellan phòng thủ thành; hệ thống nhiều thành và trang bị sẽ bổ sung sau.</p></div></div>`;}
function magicViewBase(){return `<h1>🔮 Magic Tower · cấp ${state.buildings.magicTower}</h1><p class="hint">Tên và hiệu ứng chín Castle Spells đối chiếu wiki 2009. Giá nghiên cứu là mô phỏng; phần Hero Spells chiến đấu chưa triển khai.</p><div class="grid grid3">${Object.entries(C.spells).map(([id,s])=>{const level=state.spells[id]||0,cost=E.spellCost(state,id);return `<div class="card"><div class="heading">✨ ${s.name}</div><div class="tag">Cấp ${level}</div><p class="hint">${s.res?`+${s.base} ${C.resource[s.res].label} cơ bản + ${s.rate*100}%/cấp`:s.capacity?'+5% giới hạn kho/cấp':s.goldDiscount?'-2% vàng tuyển quân/cấp':s.time?`-${s.time*100}% thời gian/cấp`:s.effect||'Đang xác minh'}</p><div class="cost">${money(cost)}</div>${button('learn',{id},'Nghiên cứu',!(level<state.buildings.magicTower&&E.canAfford(state,cost)))}</div>`}).join('')}</div>`}
// HG-04: Hero equipment, race-specific researched spells, quests and functional bazaar/market.
function itemName(uid){const f=state.inventory.find(i=>i.uid===uid);return f?E.ITEMS[f.itemId]?.name||'—':'Trống';}
function heroesView(){
 const h=state.heroes.find(x=>x.id===state.activeHero),stats=E.heroStats(state),eq=state.equipment[h.id]||{};
 const gear=Object.entries(E.ITEMS);
 const owned=state.inventory.map(i=>{const def=E.ITEMS[i.itemId],wearer=Object.entries(state.equipment).find(([,slots])=>Object.values(slots).includes(i.uid))?.[0];
 return `<div class="card gear-card"><div><b>${def.icon} ${esc(def.name)}</b><div class="hint">${def.slot} · ATK +${def.atk} · DEF +${def.def} · SPD +${def.spd}</div><small class="muted">${wearer?'Đang trang bị: '+esc(state.heroes.find(h=>String(h.id)===wearer)?.name||'tướng'):'Túi đồ'} · ${esc(i.origin||'')}</small></div>${button('equipitem',{uid:i.uid},wearer===String(h.id)?'Đã mặc':'Trang bị',!!state.march||!!state.battle||wearer===String(h.id),'small secondary')}</div>`}).join('');
 return heroesViewBase()+`<section class="card hg04-section"><span class="eyebrow">HERO EQUIPMENT</span><h2>🎒 Túi trang bị và chỉ số tướng đang chọn</h2><p>${esc(h.name)} — ATK <b>${stats.atk}</b> · DEF <b>${stats.def}</b> · SPD <b>${stats.spd}</b> · INT <b>${stats.int}</b></p>
 <div class="equipment-slots">${[['weapon','⚔ Vũ khí'],['armor','🛡 Giáp'],['charm','💍 Phụ kiện']].map(([k,label])=>`<div class="slot"><b>${label}</b><div>${esc(itemName(eq[k]))}</div>${eq[k]?button('unequip',{slot:k},'Tháo',!!state.march||!!state.battle,'small secondary'):''}</div>`).join('')}</div>
 <div class="grid grid2">${owned||'<p class="muted">Chưa có trang bị. Có thể mua ở Bazaar hoặc nhặt sau khi thắng quái.</p>'}</div>
 <p class="hint">Các loại ô lấy ý tưởng từ hệ trang bị Heroes of Gaia. Tên, chỉ số, giá và tỷ lệ rơi ở đây đều là demo.</p></section>`;
}
function magicView(){const active=state.heroes.find(h=>h.id===state.activeHero);
 return magicViewBase()+`<section class="card hg04-section"><span class="eyebrow">HERO SPELLS • MAGIC TOWER</span><h2>✨ Phép chiến đấu theo chủng tộc ${esc(C.races[state.race].english)}</h2><p class="hint">Theo bảng phép năm 2009: cần nghiên cứu ở Magic Tower rồi trang bị trên tướng (tối đa 5 ô). Kích hoạt trong trận; một phép thay thế hiệu ứng trước đó. Thời lượng và hồi chiêu trong bản này vẫn mô phỏng.</p>
 <p>Chỉ huy hiện tại: <b>${esc(active.name)}</b> · Đang trang bị ${active.equippedSpells.length}/5 phép</p>
 <div class="grid grid3">${E.spells(state).map(q=>{const level=state.heroMagic[q.id]||0,cost=E.heroSpellCost(state,q.id),equipped=active.equippedSpells.includes(q.id);
 return `<div class="card"><b>✧ ${esc(q.name)}</b><span class="tag">Lv ${level}</span><p class="hint">${esc(q.desc)}</p><p class="cost">${money(cost)}</p><div class="entry">${button('herolearn',{id:q.id},'Nghiên cứu',level>=state.buildings.magicTower||!E.canAfford(state,cost)||!!state.march||!!state.battle,'small')}${button('heroequip',{id:q.id},equipped?'Gỡ phép':'Trang bị',!level||!!state.march||!!state.battle,'small secondary')}</div></div>`}).join('')}</div></section>`;
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
 <p class="hint">Barracks Lv.${state.buildings.barracks} · Arena Lv.${state.buildings.arena}</p></div></div></section>`;
}
function cityView(){const market=state.buildings.market||0,bazaar=state.buildings.bazaar||0;
 return cityViewBase()+castleOverview()+`${state.buildingQueue?`<section class="card queue-card"><b>🏗 Công trình đang thi công: ${esc(C.buildings[state.buildingQueue.key].name)} Lv.${state.buildingQueue.level}</b><progress max="${state.buildingQueue.total}" value="${state.buildingQueue.total-state.buildingQueue.remaining}"></progress><small>${Math.ceil(state.buildingQueue.remaining/state.speed)} giây thực còn lại • tốc độ ×${state.speed} • thời gian mô phỏng</small></section>`:''}<section class="card hg04-section"><span class="eyebrow">CASTLE ECONOMY</span><h2>⚖ Market — bán tài nguyên lấy vàng</h2><p class="hint">Nguồn 2009 ghi nhận Market bán/đổi tài nguyên, không mua tài nguyên bằng vàng. Tỷ giá tại đây là mô phỏng.</p>
 <div class="trade-row"><select id="sell-type" aria-label="Loại tài nguyên bán">${['wood','ore','sulfur','crystal'].map(k=>`<option value="${k}">${C.resource[k].label}</option>`).join('')}</select><input type="number" min="1" max="50000" step="1" id="sell-qty" value="50" aria-label="Số tài nguyên bán">${button('sell',{},'Bán tài nguyên',market<1,'primary')}</div>
 <p class="hint">${market?'Market Lv.'+market:'Hãy xây Market ở danh sách công trình phía trên.'}</p>
 <h2>🏪 Bazaar — cửa hàng trang bị</h2><div class="grid grid3">${Object.values(E.ITEMS).map(item=>`<div class="card"><b>${item.icon} ${esc(item.name)}</b><p class="hint">${item.slot} · ATK +${item.atk} · DEF +${item.def} · SPD +${item.spd}</p><div class="cost">${format(item.cost)} 🪙 · cần Bazaar Lv.${item.level}</div>${button('buyitem',{id:item.id},'Mua vật phẩm',bazaar<item.level||state.res.gold<item.cost,'small secondary')}</div>`).join('')}</div></section>`;
}
function tasksView(){return `<h1>📜 Nhiệm vụ Gaia</h1><p class="hint">Hệ thống Tasks có trong game gốc; bốn nhiệm vụ dưới đây là chuỗi thử nghiệm, không sao chép phần thưởng hoặc điều kiện nhiệm vụ 2009.</p><div class="grid grid2">${E.QUESTS.map(q=>{const done=state.claimedQuests.includes(q.id),ready=q.ready(state);return `<div class="card"><h2>${done?'✅ ':ready?'📩 ':'📜 '}${esc(q.name)}</h2><p>${esc(q.desc)}</p><div class="cost">${money(q.reward)} · 🏅 ${q.fame}</div>${button('quest',{id:q.id},done?'Đã nhận':ready?'Nhận thưởng':'Chưa đạt',done||!ready,'primary')}</div>`}).join('')}</div>`;}

function combatView(){if(!state.battle)return `<h1>⚔ Chiến đấu</h1><p>Hiện không có trận đánh.</p>${button('tab',{tab:'map'},'🗺 Trở lại thế giới')}`;
 const b=state.battle;let selected=b.allies.find(u=>u.id===b.selected),focused=b.enemies.find(u=>u.id===b.focused);
 const cell=u=>`<button class="stack-card ${b.selected===u.id||b.focused===u.id?'chosen':''}" data-action="stack" data-id="${u.id}" ${u.pool<=0?'disabled':''}><span>${u.side==='enemy'?'☠':'⚔'} ${esc(u.name)}</span><b>${u.count} quân</b><small>HP ${Math.ceil(u.pool)} · SPD ${u.spd} · ${u.range>1?'Bắn xa':'Cận chiến'}</small></button>`;
 return `<div class="scene-title"><div><span class="eyebrow">TACTICAL COMBAT • THỬ NGHIỆM</span><h1>Giao tranh · ${esc(b.name)}</h1></div><div class="scene-tools"><span class="tag">Lượt ${b.turn} · ${b.allies.filter(u=>u.pool>0).length+b.enemies.filter(u=>u.pool>0).length} nhóm hoạt động</span><span class="tag">${b.allies.filter(u=>u.pool>0).length} đội ta : ${b.enemies.filter(u=>u.pool>0).length} đội địch</span></div></div>
 <div class="battle-frame"><canvas id="battle-canvas" width="1176" height="550" aria-label="Chiến trường nhóm quân"></canvas></div>
 <div class="battle-ui"><div><span class="eyebrow">QUÂN TA • BẤM CHỌN ĐƠN VỊ</span><div class="stack-list">${b.allies.map(cell).join('')}</div></div><div><span class="eyebrow">QUÂN ĐỊCH • BẤM CHỌN MỤC TIÊU</span><div class="stack-list">${b.enemies.map(cell).join('')}</div></div></div>
 <div class="command-bar"><div><div class="eyebrow">MỆNH LỆNH</div><small class="muted">${selected?'Đơn vị: '+esc(selected.name):'Chọn đơn vị'}${focused?' • Mục tiêu: '+esc(focused.name):''}</small></div>
 ${button('battle',{cmd:'attack'},'⚔ ATTACK',false,'primary')}${button('battle',{cmd:'defend'},'🛡 STAND BY',false,'secondary')}${button('battle',{cmd:'focus'},'🎯 FOCUS',false,'secondary')}${button('battle',{cmd:'retreat'},'↩ RETREAT',false,'danger')}
 ${button('auto',{},state.battleAuto?'⏸ Dừng tự đánh':'▶ Tự đánh',false,'secondary')}</div>
 <div class="card hg04-spellbar"><span class="eyebrow">PHÉP TƯỚNG TRANG BỊ</span><div class="hg04-spells">${(state.heroes.find(h=>h.id===state.activeHero)?.equippedSpells||[]).map(id=>{const sp=E.spell(state,id);if(!sp)return '';const wait=(b.spellCooldown?.[id]||0)>b.turn,used=b.castTurn===b.turn;
 return button('cast',{id},`✨ ${esc(sp.name)} Lv.${state.heroMagic[id]||0}${wait?' ⏳':''}`,wait||used,'small secondary');}).join('')||'<span class="muted">Chưa có phép trang bị. Nghiên cứu và trang bị trong Magic Tower trước khi xuất chinh.</span>'}</div><p class="hint">${b.activeSpell?`Đang hiệu lực: ${esc(E.spell(state,b.activeSpell.id)?.name||'')} · hết vào lượt ${b.activeSpell.expiry}`:'Không có phép đang hiệu lực'} · Mỗi lượt dùng tối đa 1 phép</p></div>
 <div class="combat-journal">${b.history.slice(0,3).map(l=>`<div>• ${esc(l)}</div>`).join('')}</div><p class="hint">Bản thử nghiệm: tối đa 7 nhóm quân, lượt theo tốc độ, tầm đánh, di chuyển, chọn mục tiêu, thương binh Arena. Phép Hero và trang bị đã hoạt động; thời lượng kỹ năng/AI và cân bằng là mô phỏng.</p>`;
}
function sourceView(){return `<h1>📚 Dữ liệu Heroes of Gaia 2009</h1><p class="hint">Bản game <b>chỉ</b> nghiên cứu Heroes of Gaia / Castle of Heroes / 英雄之城. Không nhập cơ chế từ bất kỳ trò chơi nào khác.</p><div class="grid grid2 source-links"><div class="card"><h3>Đã xác minh từ tài liệu</h3><ul><li>Bốn chủng tộc; 40 quân, 10 bậc/chủng tộc.</li><li>Năm tài nguyên gold, lumber, ore, sulfur, crystal.</li><li>Town Hall, Barracks, Tavern, Hero Tower, Arena, Warehouse, Magic Tower.</li><li>AP tái tạo 10% tối đa mỗi giờ; mỏ tài nguyên 6 AP.</li><li>Những phép thành trì ghi trong catalog.</li></ul></div><div class="card"><h3>Các điểm vẫn mô phỏng</h3><ul><li>Giá nâng và thời gian nâng công trình.</li><li>Cấp mở quân phụ và thời gian tuyển có tăng tốc demo.</li><li>Chất lượng/giá tướng, AI và sức mạnh NPC; chu kỳ Tavern 60 phút là thông số ghi nhận từ wiki.</li><li>Bonus mỏ, quà chiến đấu, tiêu hao và thời gian di chuyển.</li><li>Giá và tỷ lệ rơi trang bị, vị trí bản đồ, đa thành, PvP và multiplayer.</li></ul></div></div><div class="card source-links"><h3>Nguồn nghiên cứu</h3><p><a href="https://heroesofgaia.wikidot.com/game-units" target="_blank" rel="noopener">Bảng 40 quân (Wikidot, cập nhật 06/12/2009)</a> · <a href="https://heroesofgaia.wikidot.com/game-buildings" target="_blank" rel="noopener">Công trình</a> · <a href="https://heroesofgaia.wikidot.com/heroes-action" target="_blank" rel="noopener">AP và hành quân</a> · <a href="https://heroesofgaia.wikidot.com/game-spells" target="_blank" rel="noopener">Phép thuật</a> · <a href="https://heroesofgaia.wikidot.com/game-combat" target="_blank" rel="noopener">Công thức chiến đấu cộng đồng</a> · <a href="https://heroesofgaia.fandom.com/wiki/Castles" target="_blank" rel="noopener">Sản xuất cơ bản</a></p><p class="hint">Dữ liệu tham chiếu Wikidot ghi công nguồn và dẫn link, giấy phép CC BY-SA 3.0 được nêu trong SOURCES.md. Đồ họa, code engine và bản đồ viết mới, không tái sử dụng asset gốc.</p></div>`;}
function paint(){
 if(!state)return;
 if(tab==='map'){const canvas=$('world-canvas');if(!canvas)return;const draw=()=>P.drawWorld(canvas,E,state,selected);draw();
  let down=null,dragging=false;
  canvas.onpointerdown=e=>{down={x:e.clientX,y:e.clientY};dragging=false;canvas.setPointerCapture(e.pointerId)};
  canvas.onpointermove=e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>4)dragging=true;
   if(dragging){const rect=canvas.getBoundingClientRect(),unit=P.mapCamera().zoom*48;P.panMap(dx*canvas.width/rect.width/unit,dy*canvas.height/rect.height/unit);draw();down={x:e.clientX,y:e.clientY}}};
  canvas.onpointerup=e=>{if(down&&!dragging){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;const mini=P.miniHit(canvas,x,y,E);if(mini){Object.assign(P.mapCamera(),{centerX:mini.x,centerY:mini.y});selected=mini.key;render();return}const t=P.mapHit(canvas,x,y,E);if(t){selected=t.key;render();return}}down=null;};
  canvas.onwheel=e=>{e.preventDefault();P.zoomMap(e.deltaY>0?.9:1.1);draw()};
 }else if(tab==='city'){const canvas=$('city-canvas');P.drawCity(canvas,E,state,selectedBuilding);
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),key=P.cityHit(canvas,(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height);if(key){selectedBuilding=key;render()}};
 }else if(tab==='combat'){const canvas=$('battle-canvas');P.drawBattle(canvas,E,state);
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
   const all=[...state.battle.allies,...state.battle.enemies];const target=all.filter(u=>u.pool>0).sort((a,b)=>Math.hypot((a.x+.5)*canvas.width/12-x,173+(a.y+.76)*(canvas.height-185)/9-y)-Math.hypot((b.x+.5)*canvas.width/12-x,173+(b.y+.76)*(canvas.height-185)/9-y))[0];
   if(target&&Math.hypot((target.x+.5)*canvas.width/12-x,173+(target.y+.76)*(canvas.height-185)/9-y)<80)fail(()=>E.battleSelect(state,target.id));};
 }
}
function render(){if(!state){renderIntro();return}renderHUD();if(state.battle)tab='combat';const content=tab==='map'?mapView():tab==='city'?cityView():tab==='army'?armyView():tab==='heroes'?heroesView():tab==='magic'?magicView():tab==='combat'?combatView():tab==='tasks'?tasksView():sourceView();$('main').innerHTML=content;paint();}
$('app').addEventListener('click',evt=>{const target=evt.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;fail(()=>{
 if(action==='race'){newRace=target.dataset.race;render();return}
 if(action==='start'){state=E.make(newRace);tab='map';selected='3,4';return}
 if(action==='tab'){tab=target.dataset.tab;return}
 if(action==='select'){selected=target.dataset.key;return}
 if(action==='building'){selectedBuilding=target.dataset.key;return}
 if(action==='zoom'){P.zoomMap(target.dataset.dir==='in'?1.25:.8);return}
 if(action==='center'){Object.assign(P.mapCamera(),{centerX:9.5,centerY:7.4,zoom:1.12});selected='3,4';return}
 if(action==='stack'){E.battleSelect(state,target.dataset.id);return}
 if(action==='formation'){E.setFormation(state,Array.from({length:7},(_,i)=>({unitId:$('formation_unit_'+i).value,count:Number($('formation_count_'+i).value)})));toast('Đội hình đã lưu.');return}
 if(action==='auto'){state.battleAuto=!state.battleAuto;return}
 if(action==='upgrade'){E.upgrade(state,target.dataset.key);toast('Đã xếp hàng xây dựng.');return}
 if(action==='learn'){E.learn(state,target.dataset.id);return}
 if(action==='recruit'){const id=target.dataset.id,qty=Number($('q_'+id).value);E.recruit(state,id,qty);toast('Đã thêm hàng đợi tuyển quân.');return}
 if(action==='march'){E.startMarch(state,selected);toast('Tướng đã xuất chinh.');return}
 if(action==='battle'){const out=E.battleAct(state,target.dataset.cmd);if(out.type==='win'){tab='map';toast('Chiến thắng!')}else if(out.type==='lose'){tab='heroes';toast('Thất bại, có thể chữa thương.')}else if(out.type==='retreat'||out.type==='timeout'){tab='map';toast('Đã kết thúc giao tranh.')}return}
 if(action==='herolearn'){E.researchHeroSpell(state,target.dataset.id);return}
 if(action==='heroequip'){E.equipSpell(state,target.dataset.id);return}
 if(action==='cast'){E.cast(state,target.dataset.id);return}
 if(action==='equipitem'){E.equipItem(state,Number(target.dataset.uid));return}
 if(action==='unequip'){E.unequipItem(state,target.dataset.slot);return}
 if(action==='buyitem'){E.buyItem(state,target.dataset.id);return}
 if(action==='sell'){E.sell(state,$('sell-type').value,Number($('sell-qty').value));return}
 if(action==='quest'){E.claim(state,target.dataset.id);return}
 if(action==='hirecandidate'){E.hireCandidate(state,target.dataset.id);return}
 if(action==='hero'){E.selectHero(state,Number(target.dataset.id));return}
 if(action==='castellan'){E.appoint(state,Number(target.dataset.id));return}
 if(action==='heal'){E.heal(state);toast('Quân thương đã trở lại.');return}
 });});
$('save').onclick=()=>{if(save())toast('Đã lưu game vào trình duyệt.')};
$('speed').onclick=()=>{if(!state)return;fail(()=>E.setSpeed(state,state.speed===60?1:60))};
$('export-save').onclick=()=>{
 if(!state){toast('Hãy bắt đầu game trước.');return}
 try{
  save();const payload=E.serializeSave(state),blob=new Blob([payload],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
  link.download='Heoofgaia-HG07-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);
  link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Đã xuất file sao lưu JSON.');
 }catch(e){toast(e.message||String(e))}
};
$('import-save').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>2_000_000)throw Error('Tệp vượt giới hạn 2 MB');
  const imported=E.parseSave(await file.text());
  if(!confirm('Khôi phục save từ file? Tiến độ HG-06 hiện tại sẽ được thay bằng dữ liệu trong file.'))return;
  state=imported;E.tick(state);selected='3,4';tab=state.battle?'combat':'map';save();render();toast('Đã khôi phục save.');
 }catch(err){toast('Không thể nhập save: '+(err.message||String(err)))}
};
$('reset').onclick=()=>{if(!confirm('Xóa save phiên bản HG-06 và tạo vương quốc khác?'))return;state=null;newRace='human';selected=null;localStorage.removeItem(E.SAVE_KEY);localStorage.setItem('heoofgaia_hg06_skip_migration','1');render()};
state=load();if(state){selected='3,4';state.battleAuto=false;tab=state.battle?'combat':'map'}render();
setInterval(()=>{if(!state)return;const before=state.battle,training=state.training.length,building=state.buildingQueue?.key||null;try{E.tick(state);if(!before&&state.battle)tab='combat';if(document.activeElement&&['INPUT','SELECT'].includes(document.activeElement.tagName)){renderHUD()}else render();if(before!==state.battle||training!==state.training.length||building!==(state.buildingQueue?.key||null))save();}catch(e){console.warn('Tick:',e)}},1000);
setInterval(()=>{if(state&&state.battle&&state.battleAuto){try{const o=E.battleAct(state,state.battleOrder||'attack');if(o.type==='win'||o.type==='retreat'||o.type==='timeout')tab='map';if(o.type==='lose')tab='heroes';save();render();}catch(e){console.warn('Auto battle',e);state.battleAuto=false;}}},2300);
setInterval(save,10000);window.addEventListener('pagehide',save);
window.HOG_APP_DEBUG={getState:()=>state,render,save,resetForTests:()=>{state=E.make('human',Date.now());selected='5,6';render()}};
})();


