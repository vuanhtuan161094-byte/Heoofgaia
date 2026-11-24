import { BUILDINGS, CONTENT_EVIDENCE, HEROES, HERO_QUALITY_MULTIPLIERS, HERO_SKILLS, IMMORTAL_MOUNTAINS, ITEMS, QUESTS, RESOURCE_INFO, TECHNOLOGIES, TROOPS, WORLD_NODES, BUZHOU_FLOORS, TOWER_FLOORS } from './catalog.js';
import { activeQuest, armyCount, armyPower, formatDuration, formatNumber, heroPower, productionPerHour, questProgress, quoteBuilding, quoteCityUpgrade, quoteItemPurchase, quoteResearch, quoteTraining, storageCapacity, TAX_POLICIES, TUTORIAL_STEPS, unlockedChapter } from './engine.js';

export const NAV = [
  ['city','城','Thành trì','Nội thành, kinh tế và hàng đợi'],
  ['heroes','仙','Thần tiên','Chiêu mộ, phân công và trang bị'],
  ['inventory','寶','Túi đồ','Trang bị, vật phẩm và rèn pháp bảo'],
  ['army','兵','Binh doanh','Huấn luyện, quân số và hồi phục'],
  ['world','地','Thế giới','Dã địa, danh thành và hành quân'],
  ['pve','塔','Thử thách','Phong Thần Tháp và Bất Chu Sơn'],
  ['tech','學','Khoa kỹ','Nghiên cứu 19 ngành học'],
  ['quests','令','Nhiệm vụ','Chính tuyến và phần thưởng'],
  ['market','市','Thị trường','Đổi tài nguyên với thương nhân NPC'],
  ['reports','報','Chiến báo','Kết quả hành quân và thử thách'],
  ['settings','設','Cài đặt','Lưu trữ, hỗ trợ và tùy chỉnh']
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const fmt = formatNumber;
const resourceGlyph = key => RESOURCE_INFO[key]?.glyph || '?';
const ELEMENT_NAMES=Object.freeze({fire:'Hỏa',water:'Thủy',wood:'Mộc',metal:'Kim',earth:'Thổ',wind:'Phong'});
const costText = cost => Object.entries(cost || {}).filter(([,n]) => n > 0).map(([key,n]) => `${resourceGlyph(key)} ${fmt(n)}`).join(' · ') || 'Miễn phí';
const isAffordable = (state, cost) => Object.entries(cost || {}).every(([key,n]) => (state.resources[key] || 0) >= n);
const button = (action, text, disabled = false, cls = 'button', extra = '') => `<button class="${cls}" data-action="${esc(action)}" ${disabled ? 'disabled' : ''} ${extra}>${text}</button>`;
const title = (name, description, aside='') => `<div class="heading-copy"><h1>${name}</h1><p>${description}</p></div><div class="heading-aside">${aside}</div>`;
const panel = (name, body, extra='') => `<section class="panel ${extra}"><div class="panel-title">${name}</div><div class="panel-body">${body}</div></section>`;
const subheading = (name, hint='') => `<div class="panel-title">${name}${hint ? `<small>${hint}</small>` : ''}</div>`;
function pageNavigation(page,total,pageSize,key,label){
  const pages=Math.max(1,Math.ceil(total/pageSize));
  const previousAttrs=`data-page-key="${key}" data-page="${page-1}"`;
  const nextAttrs=`data-page-key="${key}" data-page="${page+1}"`;
  return `<nav class="catalog-pages" aria-label="Trang ${esc(label)}">${button('catalogPage','‹ Trước',page<=0,'button ghost small',previousAttrs)}<span>Trang ${page+1} / ${pages} · ${fmt(total)} ${esc(label)}</span>${button('catalogPage','Tiếp ›',page>=pages-1,'button ghost small',nextAttrs)}</nav>`;
}

function navMarkup(active) {
  return NAV.map(([id,glyph,label], i) => `<button class="nav-item ${id === active ? 'active' : ''}" data-view="${id}" aria-current="${id === active ? 'page' : 'false'}"><span class="nav-glyph">${glyph}</span><span class="nav-label">${label}</span>${id === 'quests' ? '<span class="nav-counter" id="quest-counter">!</span>' : ''}</button>`).join('');
}

export function renderShell(state, activeView) {
  document.querySelector('#realm-title').textContent = state.profile.name;
  document.querySelector('#fame-value').textContent = fmt(state.fame);
  const prod = productionPerHour(state);
  document.querySelector('#resource-strip').innerHTML = Object.entries(RESOURCE_INFO).map(([key, resource]) => `<div class="resource-pill" title="${resource.name} · ${fmt(state.resources[key])} · +${fmt(prod[key])}/giờ"><span class="resource-glyph">${resource.glyph}</span><span class="resource-value">${fmt(state.resources[key])}</span><span class="resource-name">${resource.name}</span></div>`).join('');
  document.querySelector('#primary-nav').innerHTML = navMarkup(activeView);
  document.querySelector('#mobile-nav').innerHTML = navMarkup(activeView);
  const quest = activeQuest(state);
  const activeQuestButton = document.querySelectorAll('#primary-nav [data-view="quests"],#mobile-nav [data-view="quests"]');
  activeQuestButton.forEach(el => { const badge = el.querySelector('.nav-counter'); if (badge) badge.textContent = quest ? '!' : '✓'; });
}

function queueCard(label, q, now, lookupName, glyph) {
  if (!q) return `<div class="queue-card"><div class="queue-title"><span>${label}</span><span class="muted">Trống</span></div><div class="queue-meta"><span>Sẵn sàng tiếp nhận mệnh lệnh</span><span>${glyph}</span></div></div>`;
  const total = Math.max(1, q.finishAt - q.startAt);
  const remaining = Math.max(0, q.finishAt - now);
  const progress = Math.max(0, Math.min(100, (1 - remaining / total) * 100));
  return `<div class="queue-card"><div class="queue-title"><span>${label}</span><b>${esc(lookupName(q))}</b></div><div class="queue-progress"><span data-progress="${progress}" style="width:${progress}%"></span></div><div class="queue-meta"><span>${remaining ? `Còn <b data-queue-time="${q.finishAt}">${formatDuration(remaining)}</b>` : 'Đang hoàn tất…'}</span><span>${glyph} ${q.count ? `${q.count} quân` : ''}</span></div></div>`;
}

function queuePanel(state, now) {
  const c = queueCard('Xây dựng', state.queues.construction, now, q => q.cityId?`${state.cities.find(city=>city.id===q.cityId)?.name||'Thành phụ'} · cấp ${q.level}`:`${BUILDINGS.find(b => b.id === q.buildingId)?.name || ''} · cấp ${q.level}`, '營');
  const t = queueCard('Huấn luyện', state.queues.training, now, q => TROOPS.find(x => x.id === q.troopId)?.name || 'Đạo quân', '兵');
  const r = queueCard('Nghiên cứu', state.queues.research, now, q => `${TECHNOLOGIES.find(x => x.id === q.techId)?.name || ''} · cấp ${q.level}`, '學');
  const m = queueCard('Hành quân', state.queues.march, now, q => WORLD_NODES.find(x => x.id === q.nodeId)?.name || 'Ngoại vực', '騎');
  return `<section class="panel">${subheading('Mệnh lệnh trong thành','Thời gian mô phỏng cục bộ')}<div class="panel-body">${c}${t}${r}${m}</div></section>`;
}

function tutorialPanel(state) {
  const step=TUTORIAL_STEPS[state.tutorialStep];
  if(!step)return `<section class="panel tutorial-panel">${subheading('Chỉ dẫn nhập môn','Đã hoàn tất')}<div class="panel-body"><p>Thành trì, khoa kỹ, thần tiên, quân đội và trận chiến đầu tiên đã liên kết. Tiếp tục chính tuyến hoặc rèn luyện trước khi tới Triều Ca.</p><div class="field-row">${button('view-world','Mở bản đồ',false,'button small')}${button('view-pve','Thử thách endgame',false,'button ghost small')}</div></div></section>`;
  let action='';
  if(step.action==='upgrade'){
    const q=quoteBuilding(state,step.data.buildingId);
    action=button('upgrade','Nâng công trình',!!state.queues.construction||q.maxed||q.locked||!isAffordable(state,q.cost),'button small',`data-building="${step.data.buildingId}"`);
  }else if(step.action==='research'){
    const q=quoteResearch(state,step.data.techId);
    action=button('research','Nghiên cứu Nông Chính',!!state.queues.research||q.maxed||!isAffordable(state,q.cost),'button small',`data-tech="${step.data.techId}"`);
  }else if(step.action==='recruit'){
    const hero=HEROES.find(row=>row.id===step.data.heroId);
    action=button('recruit',`Mời ${hero?.name||'thần tiên'}`,!hero||(state.levels.altar||0)<1||(state.levels.manor||0)<1||state.heroes.length>=Math.min(60,3+(state.levels.manor||0)*2)||state.resources.gold<220+(hero?.wisdom||0)*2||state.resources.jade<(hero?.quality==='Thiên'?2:1),'button small',`data-hero="${step.data.heroId}"`);
  }else if(step.action==='equip'){
    action=button('equip','Trang bị Bạch Ngọc Kiếm',!state.heroes.some(h=>h.id===step.data.heroId)||!state.items.includes(step.data.itemId),'button small',`data-item="${step.data.itemId}" data-hero="${step.data.heroId}"`);
  }else if(step.action==='train'){
    const quote=quoteTraining(state,step.data.troopId,step.data.count);
    action=button('train','Huấn luyện 1 Dân binh',!!state.queues.training||quote.locked||!isAffordable(state,quote.cost),'button small',`data-troop="${step.data.troopId}" data-count="${step.data.count}"`);
  }else if(step.action==='march'){
    const count=state.army[step.data.troopId]||0;
    action=button('march','Hành quân tới Thanh Khâu Quan',!count||!!state.queues.march,'button small',`data-node="${step.data.nodeId}" data-troop="${step.data.troopId}" data-count="${count}"`);
  }
  return `<section class="panel tutorial-panel">${subheading(`Chỉ dẫn nhập môn · ${state.tutorialStep+1}/${TUTORIAL_STEPS.length}`,step.title)}<div class="panel-body"><p>${esc(step.description)}</p>${action}<small class="tiny muted" style="margin-left:9px">Hoàn thành tác vụ để mở bước kế tiếp.</small></div></section>`;
}

function satelliteManagementPanel(state) {
  const satellites=(state.cities||[]).filter(city=>!city.isCapital);
  const rows=satellites.map(city=>{
    const quote=quoteCityUpgrade(state,city.id);
    const lockedLabel=quote.locked?`Cần Tử Vi Thành cấp ${Math.max(2,Math.ceil(quote.level/2)+1)}`:quote.maxed?'Đạt cấp tối đa':`${costText(quote.cost)} · ${formatDuration(quote.seconds*1000)}`;
    const contribution=`+${fmt(city.level*25)} lương · ${fmt(city.level*18)} gỗ · ${fmt(city.level*14)} đá · ${fmt(city.level*12)} sắt · ${fmt(city.level*8)} đồng/giờ`;
    return `<article class="inventory-item"><b>${esc(city.name)} · thành phụ cấp ${city.level}/10</b><small>${contribution}</small><small>Nâng tiếp: ${lockedLabel}</small>${button('upgradeCity','Nâng thành phụ',!!state.queues.construction||quote.maxed||quote.locked||!isAffordable(state,quote.cost),'button small',`data-city="${city.id}"`)}</article>`;
  }).join('');
  return `<section class="panel">${subheading('Quản lý thành phụ',`${satellites.length} / ${WORLD_NODES.filter(node=>node.kind==='Danh thành').length} danh thành NPC`)}<div class="panel-body"><div class="hint" style="margin-bottom:10px">Mỗi cấp thành phụ tăng sản lượng ngũ cốc, gỗ, đá, sắt và đồng. Nâng cấp dùng chung hàng xây dựng và mở khóa theo cấp Tử Vi Thành.</div><div class="inventory-grid">${rows||'<div class="empty-state"><strong>Chưa có thành phụ</strong>Chiếm danh thành NPC trên bản đồ để mở nguồn lực này.</div>'}</div></div></section>`;
}

function cityScreen(state, now) {
  const active = activeQuest(state);
  const prod = productionPerHour(state);
  const capacity = storageCapacity(state);
  const cityOverview = `<div class="city-overview">
    <div class="overview-card"><span class="label">Quân lực · ${armyCount(state)} quân sĩ</span><strong>${fmt(armyPower(state))}</strong><small>Sức mạnh đội hình</small></div>
    <div class="overview-card"><span class="label">Dân tâm</span><strong>${Math.round(state.morale)}%</strong><small>Thuế và sĩ khí</small></div>
    <div class="overview-card"><span class="label">Dân số · ${state.cities?.length||1} thành</span><strong>${fmt(Math.floor(state.population))}</strong><small>Thành phụ góp thêm sản lượng</small></div>
    <div class="overview-card"><span class="label">Dung lượng kho</span><strong>${fmt(capacity)}</strong><small>Tài nguyên mỗi loại</small></div>
  </div>`;
  const cityHero = `<section class="city-hero"><div class="city-hero-content"><span class="city-kicker">VƯƠNG TRIỀU · TÂY KỲ</span><h2>${esc(state.profile.name)}</h2><p>Thành trì tự trị giữa thời loạn. Tích lương, tu thành, cầu hiền và giữ vững đường tiến quân trong một thế giới mô phỏng ngoại tuyến.</p><div class="city-hero-actions">${button('view-world','Mở bản đồ thiên hạ',false,'button')}${button('view-quests','Xem chính tuyến',false,'button ghost')}</div></div></section>`;
  const buildingCards = BUILDINGS.map(b => {
    const level = state.levels[b.id] || 0;
    const quote = quoteBuilding(state, b.id);
    const effects = {
      citadel:`Thuế dân cư +${fmt(Math.floor(state.population*.002))}/giờ · mở khóa cấp thành`,
      barracks:`Tăng tốc huấn luyện ${level*.8}% · mở lệnh tuyển quân`,
      granary:`Lương thực +${fmt(7*level)}/giờ · kho +${fmt(220*level)}`,
      lumber:`Gỗ +${fmt(12*level)}/giờ`, quarry:`Đá +${fmt(10*level)}/giờ`, foundry:`Sắt +${fmt(9*level)}/giờ`,
      market:`Đồng +${fmt(25*level)}/giờ`, academy:`Mở nghiên cứu · tăng tốc ${level}%`,
      altar:`Linh ngọc +${fmt(.12*level)}/giờ · mở chiêu mộ`, manor:`Tăng chỗ roster · ngọc +${fmt(.025*level)}/giờ`,
      training:`Tăng tốc huấn luyện ${level*2.5}%`, clinic:`Giảm chi phí chữa thương ${Math.min(45,level*1.5)}%`,
      wall:`Giảm thương vong hành quân tối đa ${Math.min(4,level*.1)}%`, watch:`Hành quân nhanh ${level*1.5}% · trinh sát rẻ hơn`,
      storehouse:`Dung lượng kho +${fmt(level*1_650)}`, farm:`Lương thực +${fmt(52*level)}/giờ`,
      grove:`Gỗ +${fmt(38*level)}/giờ`, mine:`Đá +${fmt(34*level)}/giờ`, foundryfield:`Sắt +${fmt(28*level)}/giờ`,
      embassy:`Giảm phí đổi NPC ${level*.6}%`, caravan:`Giảm phí đổi NPC ${level*1.2}%`
    };
    const effectName = effects[b.id] || 'Tăng năng lực thành trì';
    const afford = isAffordable(state, quote.cost);
    const locked = quote.locked || quote.maxed;
    const disabled = !!state.queues.construction || !afford || locked;
    const label = quote.maxed ? 'Đã tối đa' : quote.locked ? `Cần Tử Vi ${Math.max(1,Math.ceil(quote.level/2))}` : level ? `Nâng ${formatDuration(quote.seconds * 1000)}` : 'Xây dựng';
    const detail = quote.maxed ? 'Đạt giới hạn cấp 30' : quote.locked ? `Mở khi Tử Vi Thành đạt cấp ${Math.ceil(quote.level/2)}` : `${costText(quote.cost)} · ${formatDuration(quote.seconds * 1000)}`;
    return `<article class="building-card ${locked ? 'is-locked' : ''}"><div class="building-top"><span class="building-seal">${b.glyph}</span><span class="building-name">${b.name}</span><span class="building-lv">C.${level}</span></div><div class="building-effect">${effectName}<br><span class="muted">${detail}</span></div><button class="button small" data-action="upgrade" data-building="${b.id}" ${disabled ? 'disabled' : ''}>${state.queues.construction && !locked ? 'Đợi thợ xây' : label}</button></article>`;
  }).join('');
  const production = Object.entries(RESOURCE_INFO).map(([key,r]) => `<div class="production-line"><span class="resource-glyph">${r.glyph}</span><span>${r.name}</span><b>+${fmt(prod[key])}/giờ</b></div>`).join('');
  const questBody = active ? `<div class="eyebrow">HỒI ${active.chapter} · NHIỆM VỤ MỞ ĐẦU</div><p class="quest-title">${active.title}</p><p class="tiny muted">${fmt(questProgress(state,active))} / ${fmt(active.goal)} · Thưởng ${costText(active.reward)}</p>${button('view-quests','Mở sổ nhiệm vụ',false,'button small')}` : '<div class="empty-state"><strong>Chính tuyến đã khép lại</strong>Mở rộng các thử thách PvE để tiếp tục.</div>';
  const chronicle = state.notifications.slice(0,5).map(text => `<div class="chronicle-entry"><i></i><span>${esc(text)}</span></div>`).join('') || '<span class="muted tiny">Chưa có biến động.</span>';
  return `${cityHero}${tutorialPanel(state)}${cityOverview}${satelliteManagementPanel(state)}<div class="city-sections"><div><section class="panel">${subheading('Thành nội và ngoại thành','21 công trình · tối đa 30 cấp')}<div class="panel-body"><div class="building-grid">${buildingCards}</div></div></section></div><aside class="city-side">${queuePanel(state,now)}<section class="panel">${subheading('Lưu chuyển tài nguyên')}<div class="panel-body"><div class="production-list">${production}</div></div></section><section class="panel">${subheading('Tin trong thành')}<div class="panel-body"><div class="chronicle">${chronicle}</div></div></section><section class="panel">${subheading('Chính tuyến')}<div class="panel-body">${questBody}</div></section></aside></div>`;
}

function heroScreen(state, _now, uiState={}) {
  const owned = state.heroes.map(h => ({ data:HEROES.find(def => def.id === h.id), save:h })).filter(h => h.data);
  const slots = [0,1,2].map(index => {
    const h = owned.filter(x => x.save.assigned)[index];
    return `<div class="formation-slot"><b>${h ? HEROES.find(x => x.id === h.save.id).name : `Vị trí ${index+1}`}</b><small>${h ? `Cấp ${h.save.level} · ${fmt(heroPower(h.save,state))} lực chiến · Linh căn ${h.save.affinity}/100` : 'Chưa có thần tiên trong đội'}</small></div>`;
  }).join('');
  const cards = owned.map(({data,save}, i) => {
    const equipped = Object.values(save.equipment || {}).filter(Boolean).map(id => ITEMS.find(x => x.id === id)?.name).filter(Boolean);
    const nextXp=save.level>=60?0:100+save.level*save.level*34;
    const combatSkill=HERO_SKILLS.find(skill=>skill.name===data.skill);
    return `<article class="hero-card"><div class="portrait portrait-${i%6}" role="img" aria-label="Chân dung ${esc(data.name)}"></div><div class="hero-card-info"><h3 class="hero-name">${esc(data.name)}</h3><div class="hero-subtitle">${data.role} · ${data.quality} phẩm · +${Math.round((HERO_QUALITY_MULTIPLIERS[data.quality]-1)*100)}% căn cơ · ${data.element}</div><div class="hero-stats"><div class="hero-stat"><b>${data.attack+save.level*2}</b><small>Đánh</small></div><div class="hero-stat"><b>${data.defense+save.level*2}</b><small>Thủ</small></div><div class="hero-stat"><b>${fmt(heroPower(save,state))}</b><small>Lực chiến</small></div></div><div class="hero-subtitle">${esc(data.skill)} · ${esc(data.skillText)} · kỹ năng cấp ${save.skillLevel}</div>${combatSkill?`<div class="hero-subtitle">Bị động: ${esc(combatSkill.passive)} · Chủ động: ${esc(combatSkill.activeName)} (hiệp ${combatSkill.triggerRound})</div>`:''}<div class="hero-affinity"><div class="hero-affinity-head"><span>Linh căn</span><b>${save.affinity}/100</b></div><progress max="100" value="${save.affinity}"></progress><small>Tu luyện, hành quân và đấu pháp tăng linh căn; linh căn cường hóa lực chiến và pháp môn.</small></div><div class="hero-subtitle">Trang bị: ${equipped.length ? equipped.map(esc).join(' · ') : 'chưa có'} · ${fmt(save.xp)} / ${fmt(nextXp)} XP</div></div><div class="hero-footer">${button('assignHero',save.assigned?'Rời đội hình':'Vào đội hình',false,save.assigned?'button ghost small':'button small',`data-hero="${save.id}"`)}${button('trainHero',save.level>=60?'Kết mạch linh căn':'Tu luyện · + linh căn',state.resources.food<65*save.level||state.resources.gold<85*save.level||(save.level>=60&&save.affinity>=100),'button small',`data-hero="${save.id}"`)}<span class="tag simulated">SIMULATED</span></div></article>`;
  }).join('');
  const unowned = HEROES.filter(h => !state.heroes.some(ownedHero => ownedHero.id === h.id));
  const recruitPageSize=24,recruitPageCount=Math.max(1,Math.ceil(unowned.length/recruitPageSize));
  const recruitPage=Math.min(recruitPageCount-1,Math.max(0,Number(uiState.heroPage)||0));
  const recruitCap=Math.min(60,3+(state.levels.manor||0)*2);
  const canRecruit=(state.levels.altar||0)>=1&&(state.levels.manor||0)>=1&&state.heroes.length<recruitCap;
  const recruitRows=unowned.slice(recruitPage*recruitPageSize,(recruitPage+1)*recruitPageSize);
  const recruit = recruitRows.map(h => `<div class="inventory-item"><b>${esc(h.name)}</b><small>${h.role} · ${h.quality} phẩm · +${Math.round((HERO_QUALITY_MULTIPLIERS[h.quality]-1)*100)}% căn cơ · kỹ năng ${esc(h.skill)}</small><small>Chiêu mộ: ${fmt(220+h.wisdom*2)} đồng · ${h.quality==='Thiên'?2:1} ngọc</small>${button('recruit','Mời nhập phủ',!canRecruit||state.resources.gold<220+h.wisdom*2||state.resources.jade<(h.quality==='Thiên'?2:1),'button small',`data-hero="${h.id}"`)}</div>`).join('');
  const recruitPager=pageNavigation(recruitPage,unowned.length,recruitPageSize,'heroPage','thần tiên');
  const gear = state.items.map(id => ITEMS.find(i => i.id === id)).filter(i => i && i.type !== 'vật phẩm').map(item => `<div class="inventory-item"><b>${item.glyph} ${esc(item.name)}</b><small>${item.type} · ${item.effect}</small><label class="sr-only" for="equip-${item.id}">Chọn người nhận ${item.name}</label><select id="equip-${item.id}" class="input" data-equip-select="${item.id}">${owned.map(h=>`<option value="${h.save.id}">${esc(h.data.name)}</option>`).join('')}</select>${button('equip','Trang bị',!owned.length,'button small',`data-item="${item.id}"`)}</div>`).join('');
  return `<section class="panel">${subheading('Đội hình hành quân','Tối đa 3 vị trí')}<div class="panel-body"><div class="formation-row">${slots}</div><div class="hint">Phẩm chất nhân căn cơ; vũ khí tăng đòn đánh, giáp giảm sát thương nhận và pháp bảo cường hóa kỹ năng chủ động. Các hệ số đều mô phỏng; chân dung vector do dự án tự vẽ.</div></div></section><div class="divider"></div><section class="panel">${subheading(`Tiên Gia Phủ · ${owned.length} / ${Math.min(60,3+(state.levels.manor||0)*2)} thần tiên`)}<div class="panel-body"><div class="roster-grid">${cards || '<div class="empty-state"><strong>Phủ đang vắng</strong>Dựng Phong Thần Đàn để mời thần tiên.</div>'}</div></div></section><div class="divider"></div><section class="panel">${subheading('Lời mời nhập phủ',`${unowned.length} hồ sơ mô phỏng · trang ${recruitPage+1}/${recruitPageCount}`)}<div class="panel-body"><div class="inventory-grid">${recruit}</div>${recruitPager}<div class="hint" style="margin-top:10px">Chiêu mộ sử dụng linh ngọc và đồng. Tiên Gia Phủ / Phong Thần Đàn cần được xây dựng trước.</div></div></section><div class="divider"></div><section class="panel">${subheading(`Trang bị khả dụng · ${gear.split('inventory-item').length-1} món`)}<div class="panel-body"><div class="inventory-grid">${gear || '<div class="empty-state"><strong>Túi pháp bảo trống</strong>Nhận trang bị từ chiến thắng, nhiệm vụ và hoạt động.</div>'}</div></div></section>`;
}

function armyScreen(state) {
  const owned = Object.entries(state.army).map(([id,count]) => ({ troop:TROOPS.find(t=>t.id===id),count })).filter(x=>x.troop&&x.count>0);
  const wounded = Object.values(state.wounded).reduce((a,n)=>a+n,0);
  const selectedId = owned[0]?.troop.id || TROOPS[0].id;
  const selectOptions = TROOPS.map(t=>`<option value="${t.id}" ${t.id===selectedId?'selected':''} ${state.levels.citadel<t.unlockCity?'disabled':''}>${esc(t.name)} · ${t.role} · ${t.lane==='front'?'tuyến trước':t.lane==='rear'?'tuyến sau':'công thành'} · tầm ${t.range} · T${t.tier}${state.levels.citadel<t.unlockCity?` · cần thành ${t.unlockCity}`:''}</option>`).join('');
  const armyRows = owned.map(({troop,count})=>`<tr><td><span class="unit-glyph">${troop.glyph}</span> ${esc(troop.name)}</td><td>${troop.role} · ${troop.lane==='front'?'tuyến trước':troop.lane==='rear'?'tuyến sau':'công thành'} · tầm ${troop.range}</td><td>${troop.tier}</td><td>${fmt(count)}</td><td>${fmt(troop.attack)} / ${fmt(troop.defense)}</td><td>${costText(troop.cost)}</td></tr>`).join('');
  const catalogRows = TROOPS.map(t=>`<tr><td><span class="unit-glyph">${t.glyph}</span> ${esc(t.name)}</td><td>${t.role} · ${t.lane==='front'?'tuyến trước':t.lane==='rear'?'tuyến sau':'công thành'} · tầm ${t.range}</td><td>${t.tier}</td><td>${t.attack} / ${t.defense} / ${t.speed}</td><td>${t.counter}</td><td>${t.unlockCity}</td><td><span class="tag simulated">SIMULATED</span></td></tr>`).join('');
  return `<div class="city-overview"><div class="overview-card"><span class="label">Quân số sẵn sàng</span><strong>${fmt(armyCount(state))}</strong><small>${fmt(armyPower(state))} lực chiến</small></div><div class="overview-card"><span class="label">Quân bị thương</span><strong>${fmt(wounded)}</strong><small>Hồi Xuân Đường</small></div><div class="overview-card"><span class="label">Binh doanh</span><strong>Cấp ${state.levels.barracks||0}</strong><small>Huấn luyện theo hàng đợi</small></div><div class="overview-card"><span class="label">Sĩ khí thành</span><strong>${Math.round(state.morale)}%</strong><small>Ảnh hưởng chiến trường</small></div></div>
    <div class="world-layout"><section class="panel">${subheading('Chiêu mộ và huấn luyện quân sĩ','39 hồ sơ mô phỏng')}<div class="panel-body"><div class="field-row"><div class="field"><label for="train-unit">Binh chủng</label><select id="train-unit" class="input">${selectOptions}</select></div><div class="field"><label for="train-count">Số lượng · tối đa 500</label><input id="train-count" class="input" type="number" value="5" min="1" max="500" inputmode="numeric"></div><div class="field"><button class="button" data-action="train" data-troop-select="1" ${!!state.queues.training?'disabled':''}>Ra lệnh huấn luyện</button></div></div><p class="tiny muted">Chi phí theo loại quân · một hàng đợi huấn luyện. Binh chủng cao cấp cần nâng Tử Vi Thành.</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Binh chủng</th><th>Vai trò / tuyến</th><th>Bậc</th><th>Số lượng</th><th>Công / thủ</th><th>Chi phí / quân</th></tr></thead><tbody>${armyRows || '<tr><td colspan="6" class="muted">Chưa có quân; huấn luyện ở bảng trên.</td></tr>'}</tbody></table></div></div></section><aside>${queuePanel(state,Date.now())}${panel('Hồi Xuân Đường',`<p class="tiny muted">${wounded ? `${fmt(wounded)} quân sĩ đang bị thương, có thể hồi phục bằng lương thực và đồng.` : 'Không có thương binh. Thương vong chiến trận được giữ riêng.'}</p>${button('heal','Hồi phục quân',!wounded,'button block')}`)}</aside></div>
    <details class="panel" style="margin-top:12px"><summary class="panel-title">Toàn bộ danh mục binh chủng · 39 loại <small>Thông số mô phỏng</small></summary><div class="panel-body table-scroll"><table class="data-table"><thead><tr><th>Binh chủng</th><th>Vai trò / tuyến</th><th>Bậc</th><th>Công / thủ / tốc</th><th>Khắc chế</th><th>Cấp thành mở</th><th>Nguồn</th></tr></thead><tbody>${catalogRows}</tbody></table></div></details>`;
}

function inventoryScreen(state, _now, uiState={}) {
  const owned = state.items.map((id,index)=>({item:ITEMS.find(x=>x.id===id),index})).filter(x=>x.item);
  const ownedUnique = new Set(state.items);
  const unownedGear = ITEMS.filter(item=>item.type!=='vật phẩm'&&!ownedUnique.has(item.id)&&!state.heroes.some(h=>Object.values(h.equipment||{}).includes(item.id)));
  const cards = owned.map(({item,index})=>{
    if (item.type==='vật phẩm') return `<article class="inventory-item"><span class="unit-glyph">${item.glyph}</span><b>${esc(item.name)}</b><small>Vật phẩm · ${esc(item.effect)}</small>${button('useItem','Sử dụng',false,'button small','data-item="'+item.id+'" data-index="'+index+'"')}</article>`;
    const slot=item.type==='vũ khí'?'weapon':item.type==='giáp'?'armor':'artifact';
    const heroOptions=state.heroes.map(h=>`<option value="${h.id}">${esc(HEROES.find(x=>x.id===h.id)?.name||h.id)}</option>`).join('');
    return `<article class="inventory-item"><span class="unit-glyph">${item.glyph}</span><b>${esc(item.name)}</b><small>${item.type} · bậc ${item.tier} · ${esc(item.effect)}</small><div class="field" style="margin-top:7px"><label for="bag-equip-${index}">Thần tiên nhận trang bị</label><select class="input" id="bag-equip-${index}" data-equip-select="${item.id}">${heroOptions}</select></div>${button('equip','Trang bị',!state.heroes.length,'button small','data-item="'+item.id+'" data-index="'+index+'"')}</article>`;
  }).join('');
  const forgePageSize=24,forgePageCount=Math.max(1,Math.ceil(unownedGear.length/forgePageSize));
  const forgePage=Math.min(forgePageCount-1,Math.max(0,Number(uiState.forgePage)||0));
  const forgeRows=unownedGear.slice(forgePage*forgePageSize,(forgePage+1)*forgePageSize);
  const forge=forgeRows.map(item=>`<article class="inventory-item"><span class="unit-glyph">${item.glyph}</span><b>${esc(item.name)}</b><small>${item.type} · bậc ${item.tier} · ${esc(item.effect)}</small><small>Rèn: ${24*item.tier} sắt · ${55*item.tier} đồng · ${9*item.tier} đá${item.tier>=4?' · 1 ngọc':''}</small>${button('forge','Rèn pháp bảo',state.levels.foundry<1||state.resources.iron<24*item.tier||state.resources.gold<55*item.tier||state.resources.stone<9*item.tier||item.tier>=4&&state.resources.jade<1,'button small','data-item="'+item.id+'"')}</article>`).join('');
  const forgePager=pageNavigation(forgePage,unownedGear.length,forgePageSize,'forgePage','công thức rèn');
  const consumables=ITEMS.filter(item=>item.type==='vật phẩm');
  const consumablePageSize=24,consumablePageCount=Math.max(1,Math.ceil(consumables.length/consumablePageSize));
  const consumablePage=Math.min(consumablePageCount-1,Math.max(0,Number(uiState.consumablePage)||0));
  const consumableRows=consumables.slice(consumablePage*consumablePageSize,(consumablePage+1)*consumablePageSize);
  const merchant=consumableRows.map(item=>{
    const quote=quoteItemPurchase(state,item.id);
    const count=state.items.filter(id=>id===item.id).length;
    return `<article class="inventory-item"><span class="unit-glyph">${item.glyph}</span><b>${esc(item.name)}</b><small>${esc(item.effect)} · bậc ${item.tier}</small><small>Giá mua: ${costText(quote.cost)}</small><small>Trong túi: ${fmt(count)}</small>${button('buyItem','Mua vật phẩm',!quote.available,'button small','data-item="'+item.id+'"')}</article>`;
  }).join('');
  const consumablePager=pageNavigation(consumablePage,consumables.length,consumablePageSize,'consumablePage','vật phẩm tiêu hao');
  const gearCount=owned.filter(x=>x.item.type!=='vật phẩm').length;
  return `<div class="city-overview"><div class="overview-card"><span class="label">Kho đồ</span><strong>${owned.length} món</strong><small>${gearCount} trang bị · ${owned.length-gearCount} vật phẩm</small></div><div class="overview-card"><span class="label">Huyền Thiết Lò</span><strong>Cấp ${state.levels.foundry||0}</strong><small>Mở rèn trang bị</small></div><div class="overview-card"><span class="label">Pháp bảo</span><strong>${state.heroes.reduce((n,h)=>n+Object.values(h.equipment||{}).filter(Boolean).length,0)} đang trang bị</strong><small>Thần tiên trong Tiên Gia Phủ</small></div></div><section class="panel">${subheading('Túi đồ và vật phẩm',`${owned.length} món trong ${fmt(state.items.length)} vật phẩm`)}<div class="panel-body"><div class="inventory-grid">${cards||'<div class="empty-state"><strong>Túi đồ đang trống</strong>Thắng trận, hoàn thành nhiệm vụ hoặc rèn trang bị.</div>'}</div></div></section><div class="divider"></div><section class="panel">${subheading('Thương nhân vật phẩm',`${consumables.length} hồ sơ SIMULATED · trang ${consumablePage+1}/${consumablePageCount}`)}<div class="panel-body"><div class="hint" style="margin-bottom:10px">Mua vật phẩm tiêu hao bằng lương thực và đồng; đồ bậc cao cần thêm linh ngọc. Giá tăng theo bậc, tối đa 500 món trong túi.</div><div class="inventory-grid">${merchant}</div>${consumablePager}</div></section><div class="divider"></div><section class="panel">${subheading('Lò luyện pháp bảo',`${unownedGear.length} công thức · trang ${forgePage+1}/${forgePageCount}`)}<div class="panel-body"><div class="hint" style="margin-bottom:10px">Cần Huyền Thiết Lò cấp 1. Mỗi công thức tạo một món duy nhất và trừ tài nguyên ngay khi xác nhận.</div><div class="inventory-grid">${forge||'<div class="empty-state"><strong>Đã có đủ trang bị</strong>Tiếp tục tìm chiến lợi phẩm để nhận vật phẩm khác.</div>'}</div>${forgePager}</div></section><div class="divider"></div><section class="panel">${subheading('Trang bị đang sử dụng')}<div class="panel-body"><div class="inventory-grid">${state.heroes.map(h=>{const hero=HEROES.find(x=>x.id===h.id);return `<div class="inventory-item"><b>${esc(hero?.name||h.id)}</b><small>Cấp ${h.level} · lực chiến ${fmt(heroPower(h,state))}</small>${Object.entries(h.equipment||{}).map(([slot,id])=>`<small>${slot==='weapon'?'Vũ khí':slot==='armor'?'Giáp':'Pháp bảo'}: ${id?esc(ITEMS.find(i=>i.id===id)?.name||id):'Chưa có'}</small>`).join('')}</div>`}).join('')||'<div class="empty-state">Chưa chiêu mộ thần tiên.</div>'}</div></div></section>`;
}

function worldScreen(state, uiState) {
  const unlocked=unlockedChapter(state);
  const chapter = Math.min(unlocked,Math.max(1, Number(uiState.chapter) || 1));
  uiState.chapter=chapter;
  const nodes = WORLD_NODES.filter(n=>n.chapter===chapter);
  const selected = nodes.find(n=>n.id===uiState.nodeId) || nodes[0];
  if (selected && uiState.nodeId !== selected.id) uiState.nodeId = selected.id;
  const scouted=state.world.scouted.includes(selected.id);
  const scoutCost=Math.max(2,Math.ceil(Math.max(4,12+selected.chapter*3-(state.levels.watch||0))*(1-Math.min(0.36,(state.technologies['tech-18']||0)*0.012))));
  const enemyIntel=scouted?`<section class="recon-intel"><b>Chủ soái: ${esc(selected.enemy.commander)}</b><span>Đấu pháp: ${esc(selected.enemy.tactic.name)}</span><span>Ngũ hành: ${ELEMENT_NAMES[selected.enemy.element]||'Trung tính'}</span><span>${selected.enemy.formation.map(row=>`${esc(TROOPS.find(t=>t.id===row.unitId)?.name||row.unitId)} ${fmt(row.count)}`).join(' · ')}</span></section>`:'<div class="tiny muted recon-hint">Do thám để nhận diện chủ soái, chiến thuật và thành phần đạo quân.</div>';
  const pins = nodes.map((n,i)=>`<button class="map-node ${n.isBoss?'boss':n.kind==='Danh thành'?'':n.kind==='Dã địa'?'field':'mountain'} ${state.world.captures.includes(n.id)?'captured':''} ${selected.id===n.id?'selected':''}" style="left:${n.x}%;top:${n.y}%" data-action="selectNode" data-node="${n.id}" title="${esc(n.name)} · lực lượng ${fmt(n.power)}">${n.isBoss?'王':n.kind==='Danh thành'?'城':n.kind==='Dã địa'?'野':'仙'}</button>`).join('');
  const armyOptions = Object.entries(state.army).filter(([,n])=>n>0).map(([id,count])=>`<option value="${id}">${esc(TROOPS.find(t=>t.id===id)?.name||id)} · ${fmt(count)} quân</option>`).join('');
  const selectedTroop = state.army[Object.keys(state.army)[0]] || 0;
  const bossLocked = selected.isBoss && !state.world.campaignComplete && (state.stats.victories < 20 || state.stats.citiesCaptured < 7);
  const target = `<article class="target-card"><span class="target-kind">${selected.kind} · 第 ${selected.chapter} chương · cấp ${selected.level}</span><h2 class="target-name">${esc(selected.name)}</h2><p class="tiny muted">${selected.isBoss ? state.world.campaignComplete ? 'Trụ Vương đã bại trận. Triều Ca vẫn mở để tái chiến và chinh phục endgame.' : 'Đại Boss chiến dịch. Cần 20 trận thắng và 7 danh thành; thắng trận này sẽ mở kết cục Phong Thần.' : 'Đội NPC độc lập theo dữ liệu mô phỏng. Hành quân dùng quân thật của thành, có thương vong và chiến lợi phẩm.'}</p><div class="target-stats"><div class="target-stat"><small>Lực lượng đối thủ</small><b>${fmt(selected.power)}</b></div><div class="target-stat"><small>Chiến lợi phẩm ước tính</small><b>${costText(selected.loot)}</b></div></div>${enemyIntel}<div class="field-row"><div class="field"><label for="march-unit">Đạo quân</label><select id="march-unit" class="input">${armyOptions || '<option>Chưa có quân</option>'}</select></div><div class="field"><label for="march-count">Số quân điều động</label><input id="march-count" class="input" type="number" min="1" max="${selectedTroop}" value="${Math.min(18,selectedTroop)||1}" inputmode="numeric"></div></div><div class="field-row" style="margin-top:8px">${button('scout',scouted?'Do thám lại':'Trinh sát',state.resources.gold<scoutCost,'button ghost','data-node="'+selected.id+'"')}${button('march',selected.isBoss&&state.world.campaignComplete?'Tái chiến Triều Ca':'Hành quân',!armyCount(state)||!!state.queues.march||Boolean(bossLocked),'button','data-node="'+selected.id+'"')}</div><div class="tiny muted" style="margin-top:7px">${selected.isBoss&&bossLocked?`Tiến trình mở khóa: ${Math.min(20,state.stats.victories)} / 20 thắng · ${Math.min(7,state.stats.citiesCaptured)} / 7 thành.`:scouted?'Đã do thám. ':''}${state.queues.march?'Đội quân hiện đang hành quân.':bossLocked?'': 'Thời gian ước tính '+formatDuration(Math.max(7000,(7+selected.chapter*1.7)*1000))}</div></article>`;
  return `<div class="world-layout"><section class="panel">${subheading('Bản đồ Cửu Châu','120 địa điểm mô phỏng · 8 khu vực')}<div class="panel-body"><div class="field-row" style="margin-bottom:10px"><div class="field"><label for="world-chapter">Khu vực thiên hạ</label><select id="world-chapter" class="input" data-change="chapter">${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${chapter===i+1?'selected':''} ${i+1>unlocked?'disabled':''}>Chương ${i+1} · ${['Tây Kỳ','Thanh Khâu','Vân Mộng','Cửu Lê','Lạc Thủy','Bắc Minh','Phong Lăng','Quy Khư'][i]}${i+1>unlocked?' · chưa mở':''}</option>`).join('')}</select></div><div class="field"><label>Tiến trình chính tuyến</label><div class="input">Chặng ${fmt(state.world.storyStage)} · ${state.world.captures.length} danh thành · mở tới chương ${unlocked}</div></div></div><div class="world-map"><div class="map-river"></div><div class="map-mountain"></div><div class="map-mountain m2"></div><span class="map-label" style="left:43%;top:44%">九州山河圖</span><span class="map-label" style="left:8%;top:83%">長河</span>${pins}</div><div class="tiny muted" style="margin-top:8px">Thắng một trận dã địa hoặc Tiên Sơn trong chương hiện tại để mở chương kế tiếp. Danh thành giúp đạt điều kiện Boss; các chương chưa mở không thể trinh sát hoặc hành quân tới.</div></div></section><aside class="map-side">${target}${queuePanel(state,Date.now())}<section class="panel">${subheading('Ngoại giao và liên minh NPC')}<div class="panel-body"><div class="hint">V1.0 ưu tiên chơi đơn ngoại tuyến. Thương nhân, bang hội và đối thủ là NPC mô phỏng; không có người chơi trực tiếp hoặc dịch vụ nhiều người.</div><div class="field-row" style="margin-top:9px">${button('view-market','Giao thương NPC',false,'button small')}${button('view-quests','Chính tuyến',false,'button ghost small')}</div></div></section></aside></div>`;
}

function pveScreen(state, _now, uiState={}) {
  const tower=state.world.towerFloor,bz=state.world.buzhouFloor;
  const endingPanel=state.world.campaignComplete
    ? `<section class="panel ending-banner"><span class="eyebrow">ĐẠI KẾT CỤC · HỒI THỨ TÁM</span><h2>Thiên hạ quy Chu</h2><p>Trụ Vương bại trận, Phong Thần nghiệp định. Tiếp tục leo Phong Thần Tháp, vượt Bất Chu Sơn, chinh phục 624 Tiên Sơn và phát triển thành trì.</p></section>`
    : `<section class="panel ending-progress"><span class="eyebrow">CHÍNH TUYẾN · ĐẠI BOSS TRIỀU CA</span><p>Điều kiện mở: ${Math.min(20,state.stats.victories)} / 20 trận thắng · ${Math.min(7,state.stats.citiesCaptured)} / 7 danh thành.</p><small>Boss cuối được mô phỏng; thắng sẽ mở kết cục và thưởng chiến dịch một lần.</small></section>`;
  const mountainPageSize=24,mountainPageCount=Math.ceil(IMMORTAL_MOUNTAINS.length/mountainPageSize);
  const mountainPage=Math.min(mountainPageCount-1,Math.max(0,Number(uiState.mountainPage)||0));
  const mountains=IMMORTAL_MOUNTAINS.slice(mountainPage*mountainPageSize,(mountainPage+1)*mountainPageSize);
  const mountainCards=mountains.map(m=>`<article class="inventory-item"><span class="eyebrow">CHƯƠNG ${m.chapter} · HẠNG ${m.rank}</span><b>${esc(m.name)}</b><small>Lực lượng thủ sơn: ${fmt(m.power)}</small><small>Thưởng mô phỏng: ${costText(m.loot)}${state.world.mountainWins.includes(m.id)?' · đã chinh phục':''}</small>${button('duel','Thách đấu Tiên Sơn',!state.heroes.some(h=>h.assigned),'button small',`data-mode="mountain" data-mountain="${m.id}"`)}</article>`).join('');
  const mountainPanel=`<section class="panel"><div class="panel-title">Tiên Sơn · ${state.world.mountainWins.length} / ${IMMORTAL_MOUNTAINS.length} đã chinh phục<small>624 địa điểm · boss NPC và chiến lợi phẩm mô phỏng</small></div><div class="panel-body">${pageNavigation(mountainPage,IMMORTAL_MOUNTAINS.length,mountainPageSize,'mountainPage','Tiên Sơn')}<div class="inventory-grid">${mountainCards}</div>${pageNavigation(mountainPage,IMMORTAL_MOUNTAINS.length,mountainPageSize,'mountainPage','Tiên Sơn')}</div></section>`;
  return `${endingPanel}<div class="hint" style="margin-bottom:10px">Đấu pháp thần tiên offline; thành tích, phần thưởng và thủ lĩnh đều do game tính cục bộ, không giả danh PvP trực tuyến.</div><div class="activity-grid"><article class="activity-card"><div class="activity-crest">封</div><div class="eyebrow">THỬ THÁCH TẦNG</div><h3>Phong Thần Tháp</h3><p>Leo liên tầng, đối thủ tăng sức mạnh theo độ sâu. Tầng mô phỏng tối đa ${fmt(TOWER_FLOORS)}.</p><div class="overview-card"><span class="label">Thành tích hiện tại</span><strong>${fmt(tower)} / ${fmt(TOWER_FLOORS)}</strong><small>Đội hình: ${state.heroes.filter(h=>h.assigned).length} thần tiên</small></div><div style="margin-top:10px">${button('duel','Khiêu chiến tầng '+(tower+1),!state.heroes.some(h=>h.assigned),'button block','data-mode="tower"')}</div></article><article class="activity-card"><div class="activity-crest">山</div><div class="eyebrow">NGŨ QUAN BẤT CHU</div><h3>Bất Chu Sơn</h3><p>Thử sức năm cửa ải có thủ lĩnh NPC. Cần tăng cấp và trang bị trước khi tiến sâu.</p><div class="overview-card"><span class="label">Cửa ải đã qua</span><strong>${bz} / ${BUZHOU_FLOORS}</strong><small>Thử thách một lần mỗi cửa</small></div><div style="margin-top:10px">${button('duel','Thách đấu cửa '+(bz+1),bz>=BUZHOU_FLOORS||!state.heroes.some(h=>h.assigned),'button block','data-mode="buzhou"')}</div></article><article class="activity-card"><div class="activity-crest">日</div><div class="eyebrow">ENDGAME NPC</div><h3>Thử thách thiên hạ</h3><p>Tiếp tục tu luyện, giao thương và thảo phạt sau khi chiến dịch kết thúc.</p><div class="overview-card"><span class="label">Chiến báo PvE</span><strong>${fmt(state.stats.victories)} thắng</strong><small>${fmt(state.stats.duels)} lần đấu pháp</small></div><div style="margin-top:10px">${button('view-world','Tiếp tục hành trình',false,'button block')}</div></article></div><div class="divider"></div>${panel('Đội hình thần tiên',`<div class="formation-row">${state.heroes.filter(h=>h.assigned).slice(0,3).map(h=>`<div class="formation-slot"><b>${esc(HEROES.find(x=>x.id===h.id)?.name||h.id)}</b><small>Cấp ${h.level} · ${fmt(heroPower(h,state))} lực chiến</small></div>`).join('')||'<div class="empty-state">Chưa có đội hình.</div>'}</div><p class="tiny muted">Sát thương, hồi phục, thương vong và kỹ năng cụ thể đều được đánh dấu mô phỏng.</p>`)}<div class="divider"></div>${mountainPanel}<div class="divider"></div>${panel('Tiến trình PvE',`<div class="city-overview"><div class="overview-card"><span class="label">Danh thành chiếm được</span><strong>${state.stats.citiesCaptured}</strong><small>Trong ${WORLD_NODES.filter(n=>n.kind==='Danh thành').length} địa điểm mô phỏng</small></div><div class="overview-card"><span class="label">Trận thắng</span><strong>${state.stats.victories}</strong><small>NPC và chiến dịch</small></div><div class="overview-card"><span class="label">Cửa Bất Chu</span><strong>${bz}</strong><small>Thủ lĩnh NPC</small></div></div>`)}`;
}

function techScreen(state) {
  const cards = TECHNOLOGIES.map(t=>{
    const level = state.technologies[t.id]||0;
    const quote = quoteResearch(state,t.id);
    const effectText = ({food:'Tăng sản lượng lương thực',timber:'Tăng sản lượng gỗ',stone:'Tăng sản lượng đá',iron:'Tăng sản lượng sắt',gold:'Tăng thu đồng',population:'Tăng tốc tăng dân số',build:'Rút ngắn thời gian xây dựng',training:'Tăng tốc huấn luyện',attack:'Tăng sức mạnh quân đội',defense:'Giảm sát thương quân đội nhận',cavalry:'Tăng sức mạnh kỵ binh',archer:'Tăng sức mạnh xạ thủ',healing:'Giảm chi phí hồi thương binh',formation:'Tăng hiệu lực tương khắc',march:'Tăng tốc hành quân',hero:'Tăng lực chiến thần tiên',scout:'Giảm phí trinh sát',diplomacy:'Giảm phí và tăng tỷ lệ ngoại giao'}[t.effect]||t.name);
    const rateText=({gold:'· +1,2% mỗi cấp',population:'· +1,2% mỗi cấp',build:'· tăng 2,5% tốc độ mỗi cấp',training:'· tăng 2% tốc độ mỗi cấp',defense:'· giảm 0,4% sát thương mỗi cấp',cavalry:'· +1,2% sức mạnh mỗi cấp',archer:'· +1,2% sức mạnh mỗi cấp',healing:'· giảm 0,6% chi phí mỗi cấp',formation:'· +0,3% cơ bản và theo tương khắc mỗi cấp',march:'· tăng 4% tốc độ mỗi cấp',hero:'· +1,2% lực chiến mỗi cấp',scout:'· giảm 1,2% phí mỗi cấp',diplomacy:'· -0,1% phí giao thương; +0,8% ngoại giao mỗi cấp'}[t.effect]||'· +1,2% mỗi cấp');
    return `<article class="tech-card"><div class="tech-card-top"><h3>${esc(t.name)}</h3><span class="tag simulated">Cấp ${level} / 30</span></div><p class="tiny muted">${effectText} ${rateText} · hệ số SIMULATED</p><div class="level-dots">${Array.from({length:10},(_,i)=>`<i class="${level>i*3?'on':''}"></i>`).join('')}</div><div class="tech-card-top"><span class="progress-note">Bậc tiếp theo: ${quote.maxed?'tối đa':`C.${quote.level} · ${costText(quote.cost)}`}</span>${button('research','Nghiên cứu',!!state.queues.research||quote.maxed||!isAffordable(state,quote.cost),'button small','data-tech="'+t.id+'"')}</div></article>`;
  }).join('');
  return `<div class="hint" style="margin-bottom:10px">Mười chín nhánh khoa kỹ, ba mươi cấp mỗi nhánh. Các hệ số hiện dùng đường cong SIMULATED; hồ sơ gốc chưa được tải về để xác minh.</div><div class="city-overview"><div class="overview-card"><span class="label">Thái Học Viện</span><strong>Cấp ${state.levels.academy||0}</strong><small>Một hàng nghiên cứu</small></div><div class="overview-card"><span class="label">Ngành đã khai mở</span><strong>${Object.values(state.technologies).filter(x=>x>0).length} / 19</strong><small>Hệ số kinh tế và quân sự</small></div><div class="overview-card"><span class="label">Tổng cấp</span><strong>${fmt(Object.values(state.technologies).reduce((a,n)=>a+n,0))}</strong><small>Tối đa 570 cấp mô phỏng</small></div></div><div class="tech-grid">${cards}</div><div class="divider"></div>${queuePanel(state,Date.now())}`;
}

function questScreen(state, _now, uiState={}) {
  const pageSize=24,pageCount=Math.max(1,Math.ceil(QUESTS.length/pageSize));
  const page=Math.min(pageCount-1,Math.max(0,Number(uiState.questPage)||0));
  const visibleQuests=QUESTS.slice(page*pageSize,(page+1)*pageSize);
  const list = visibleQuests.map(q=>{
    const progress=questProgress(state,q), done=progress>=q.goal, claimed=state.claims.includes(q.id), locked=q.chapter>unlockedChapter(state), active=activeQuest(state)?.id===q.id;
    return `<article class="quest-card ${active?'quest-active':''}"><div class="quest-mark">${q.chapter}</div><div><div class="quest-title">${esc(q.title)}</div><div class="quest-desc">Chương ${q.chapter} · ${locked?'Cần mở chương · ':''}${esc(q.type==='chapterField'?'Thắng cửa ải tại chương này':q.type==='win'?'Thắng trận PvE':q.type==='capture'?'Chiếm danh thành':q.type==='tower'?'Vượt Phong Thần Tháp':q.type==='buzhou'?'Qua cửa Bất Chu':q.type==='guild'?'Kết minh cùng NPC':q.type==='upgrade'?'Nâng cấp công trình':q.type==='train'?'Huấn luyện quân đội':q.type==='recruit'?'Chiêu mộ thần tiên':q.type==='equip'?'Trang bị vật phẩm':'Tăng sức mạnh đội hình')}</div><div class="quest-progress-track"><span style="width:${Math.min(100,progress/q.goal*100)}%"></span></div><div class="quest-desc">${fmt(progress)} / ${fmt(q.goal)}</div></div><div class="quest-reward">Thưởng<br>${costText(q.reward)}<br>${q.reward.xp} kinh nghiệm</div>${claimed?'<span class="tag">Đã nhận</span>':button('claimQuest',locked?'Chưa mở':done?'Nhận thưởng':'Chưa xong',locked||!done,'button small','data-quest="'+q.id+'"')}</article>`;
  }).join('');
  return `<section class="panel">${subheading(`Sổ nhiệm vụ · ${state.claims.length} / ${QUESTS.length} đã nhận`,`${QUESTS.length} mục tiêu · chương ${visibleQuests[0]?.chapter||1} · trang ${page+1}/${pageCount}`)}<div class="panel-body"><div class="hint" style="margin-bottom:10px">Chính tuyến có tám cửa ải mở theo tiến trình chiến dịch; nhiệm vụ chương chưa mở sẽ không thể nhận thưởng. Nhiệm vụ phụ liên kết kinh tế, chiêu mộ, huấn luyện, hành quân và thử thách. Nội dung hiện là SIMULATED.</div>${pageNavigation(page,QUESTS.length,pageSize,'questPage','nhiệm vụ')}<div class="quest-list">${list}</div>${pageNavigation(page,QUESTS.length,pageSize,'questPage','nhiệm vụ')}</div></section>`;
}

function marketScreen(state) {
  const opts=Object.entries(RESOURCE_INFO).map(([id,r])=>`<option value="${id}">${r.glyph} ${r.name} · có ${fmt(state.resources[id])}</option>`).join('');
  const policies=Object.entries(TAX_POLICIES).map(([id,policy])=>`<div class="setting-row"><span><b>${esc(policy.label)}</b><small class="muted">${fmt(policy.income*100)}% thuế cơ sở · dân tâm ${policy.moralePerHour>0?'+':''}${fmt(policy.moralePerHour)}/giờ</small></span>${button('setTaxPolicy',state.taxPolicy===id?'Đang áp dụng':'Chọn',state.taxPolicy===id,'button ghost small',`data-policy="${id}"`)}</div>`).join('');
  return `<div class="world-layout"><section class="panel">${subheading('Thị trường Triều Ca','Giao thương với thương nhân NPC')}<div class="panel-body"><div class="city-hero" style="min-height:175px;background-position:center 60%"><div class="city-hero-content" style="min-height:175px"><span class="city-kicker">VẠN LÝ TRẠM · TÂY KỲ</span><h2 style="font-size:22px">Đường hàng mở lối</h2><p>Đổi tài nguyên theo giá trị tham chiếu. Phí thương mại giảm theo cấp Vạn Lý Trạm.</p></div></div><form data-form="trade" class="panel-body" style="padding-left:0;padding-right:0"><div class="field-row"><div class="field"><label for="trade-from">Giao hàng</label><select id="trade-from" class="input" name="from">${opts}</select></div><div class="field"><label for="trade-to">Nhận về</label><select id="trade-to" class="input" name="to">${opts}</select></div><div class="field"><label for="trade-amount">Số lượng</label><input class="input" type="number" name="amount" id="trade-amount" min="1" max="100000" value="100" inputmode="numeric"></div></div><button class="button" style="margin-top:10px">Xác nhận đổi hàng</button></form><div class="hint">Thị trường là kinh tế đơn người chơi; không kết nối hay giả lập người chơi thật. Tỷ giá và phí NPC được đánh dấu SIMULATED.</div></div></section><aside>${panel('Thuế và dân tâm',`<div class="overview-card"><span class="label">Dân tâm</span><strong>${Math.round(state.morale)}%</strong><small>${esc(TAX_POLICIES[state.taxPolicy].label)} · thu nhập đồng ${fmt(productionPerHour(state).gold)}/giờ</small></div>${policies}<p class="tiny muted">Thuế cao tăng nguồn thu nhưng làm dân tâm giảm dần; chính sách khoan giảm phục hồi dân tâm và giảm thuế.</p>`)}${queuePanel(state,Date.now())}</aside></div>`;
}

function reportsScreen(state) {
  const items=state.reports.map(r=>{
    const enemyUnits=(rows,key)=>Object.entries(rows||{}).map(([id,n])=>`${esc(TROOPS.find(t=>t.id===id)?.name||id)} ${fmt(n)}`).join(' · ')||'không';
    return `<article class="report-card"><div class="report-head"><b>${esc(r.target||'Chiến dịch')}</b><span class="report-result ${r.victory?'win':'loss'}">${r.victory?'Đại thắng':'Rút lui'}</span></div><div class="report-body"><div class="report-tactics"><span class="tag">${r.type==='duel'?'Đấu pháp thần tiên':'Hành quân quân đội'}</span><span class="tag">Sức ta ${fmt(r.ownPower||0)}</span><span class="tag">Đối thủ ${fmt(r.enemyPower||0)}</span>${r.rounds?.length?`<span class="tag">${r.rounds.length} hiệp</span>`:''}</div>${r.heroSkills?.length?`<p>Pháp môn đội hình: ${r.heroSkills.map(esc).join(' · ')}</p>`:''}${r.skillBonuses?.affinity?`<p>Linh căn đội hình +${Math.round(r.skillBonuses.affinity*100)}% · cộng hưởng đồng nguyên tố +${Math.round(r.skillBonuses.elementResonance*100)}%</p>`:''}${r.skillBonuses?.equipmentAttack||r.skillBonuses?.equipmentDefense||r.skillBonuses?.artifactSkillBonus?`<p>Trang bị đội hình: vũ khí +${fmt(r.skillBonuses.equipmentAttack*100)}% công · giáp giảm ${fmt(r.skillBonuses.equipmentDefense*100)}% sát thương · pháp bảo +${fmt(r.skillBonuses.artifactSkillBonus*100)}% hệ số kỹ năng.</p>`:''}${r.type==='duel'&&r.skillBonuses?.activePowerBonus?`<p>Độ tinh thông chủ động +${Math.round(r.skillBonuses.activePowerBonus*100)}% lực chiến thần tiên.</p>`:''}${r.enemyCommander?`<p>Chủ soái NPC: ${esc(r.enemyCommander)} · chiến thuật ${esc(r.enemyTactic||'dã chiến')}</p>${r.matchup?`<p>Tương khắc: ta +${r.matchup.ownCounterAdvantage}% · địch +${r.matchup.enemyCounterAdvantage}% · đội hình ${r.matchup.ownBalanced?'cân bằng':'chưa cân bằng'} · địch hệ ${ELEMENT_NAMES[r.enemyElement]||'Trung tính'} · ngũ hành ${r.matchup.heroElementAdvantage>0?'+':''}${r.matchup.heroElementAdvantage||0}%</p>`:''}<p>Đội hình địch: ${enemyUnits(Object.fromEntries((r.enemyFormation||[]).map(row=>[row.unitId,row.count])))}</p><p>Tổn thất địch: ${enemyUnits(r.enemyCasualties)}</p>`:''}<p>Quân điều động: ${Object.entries(r.troopsSent||{}).map(([id,n])=>`${esc(TROOPS.find(t=>t.id===id)?.name||id)} ${fmt(n)}`).join(' · ')||'Đội hình thần tiên'}.</p><p>Thương vong: ${enemyUnits(r.dead)}${Object.values(r.wounded||{}).reduce((a,n)=>a+n,0)?` · bị thương ${fmt(Object.values(r.wounded).reduce((a,n)=>a+n,0))}`:''}</p><p>Chiến lợi phẩm: ${r.loot&&Object.keys(r.loot).length?costText(r.loot):'không có'} · ${r.evidence||CONTENT_EVIDENCE.status}</p>${r.rounds?.length?`<details><summary>Diễn biến ${r.rounds.length} hiệp</summary><p>${r.rounds.map(x=>`Hiệp ${x.round}: ta gây ${fmt(x.ownDamage)}${x.skillDamage?` · kỹ năng ${fmt(x.skillDamage)}`:''}${x.elementDamage?` · ngũ hành ${x.elementDamage>0?'+':''}${fmt(x.elementDamage)}`:''}, chịu ${fmt(x.enemyDamage)}${x.shieldedDamage?` · hộ thể chặn ${fmt(x.shieldedDamage)}`:''}${x.skillHealing?` · hồi ${fmt(x.skillHealing)}`:''}; sĩ khí ${x.ownMorale}%${x.enemyMorale!==undefined?` · địch ${x.enemyMorale}%`:''}${x.activeSkills?.length?` · thi triển ${x.activeSkills.map(esc).join(' + ')}`:''}.`).join('<br>')}</p></details>`:''}</div></article>`;
  }).join('');
  return `<section class="panel">${subheading(`Chiến báo · ${state.reports.length} báo cáo`,'Phân giải trận đấu mô phỏng, lưu cục bộ')}<div class="panel-body"><div class="hint" style="margin-bottom:10px">Tất cả trận chiến được tính cục bộ và ghi vào save; thương vong, thương binh, thưởng và danh vọng chỉ áp dụng một lần khi hàng đợi hành quân hoàn tất.</div><div class="report-list">${items||'<div class="empty-state"><strong>Chưa có chiến báo</strong>Hành quân tới dã địa hoặc khiêu chiến tháp để bắt đầu.</div>'}</div></div></section>`;
}

function settingsScreen(state) {
  const check=(key,label)=>`<label class="setting-row"><span>${label}</span><input class="toggle" type="checkbox" data-setting="${key}" ${state.settings[key]?'checked':''}></label>`;
  return `<div class="settings-grid"><section class="panel">${subheading('Tùy chỉnh trải nghiệm')}<div class="panel-body">${check('autosave','Tự lưu sau mỗi thao tác')}${check('sound','Âm thanh giao diện')}${check('effects','Hiệu ứng chiến trường')}${check('reducedMotion','Giảm chuyển động')}<div class="divider"></div><div class="field"><label for="rename-city">Tên thành trì</label><div class="field-row"><input class="input" id="rename-city" maxlength="22" value="${esc(state.profile.name)}"><button class="button" data-action="rename">Đổi tên</button></div></div><div style="margin-top:10px">${button('save','Lưu ngay',false,'button ghost')}</div></div></section><section class="panel">${subheading('Sao lưu và chuyển thiết bị')}<div class="panel-body"><p class="tiny muted">Save ${state.version} lưu trong IndexedDB và có bản dự phòng localStorage. Không có dữ liệu người chơi hay tài khoản mạng.</p><div class="field-row"><button class="button" data-action="export">Xuất tệp lưu JSON</button><label class="button ghost" for="import-file">Nhập tệp lưu</label><input class="sr-only" id="import-file" type="file" accept="application/json"></div><div class="divider"></div><p class="tiny muted">Dung lượng kho ${fmt(storageCapacity(state))} mỗi loại · tiến trình offline giới hạn 8 giờ mỗi lần mở lại.</p><div class="hint">Không khôi phục được save gốc từ game Đắc Kỷ Mobile. Tệp nhập chỉ chấp nhận định dạng Dacky Mobile và được kiểm tra trước khi thay save.</div></div></section><section class="panel">${subheading('Kết nối và quyền riêng tư')}<div class="panel-body"><div class="setting-row"><span>Chế độ chơi</span><b>Đơn người chơi · offline-first</b></div><div class="setting-row"><span>Đối thủ thế giới</span><b>NPC mô phỏng</b></div><div class="setting-row"><span>Đồng bộ máy chủ</span><b>Không sử dụng</b></div><div class="setting-row"><span>Nguồn nội dung gameplay</span><b class="tag simulated">SIMULATED</b></div><p class="tiny muted">Game chạy bằng tài sản vector tự tạo; không tải nội dung ngoài sau khi cài. iPhone hỗ trợ thông qua PWA khi được host qua HTTPS.</p></div></section><section class="panel">${subheading('Tình trạng bản phát hành')}<div class="panel-body"><div class="setting-row"><span>Web responsive</span><b>Đã tích hợp trong mã nguồn</b></div><div class="setting-row"><span>PWA installable</span><b>Service Worker</b></div><div class="setting-row"><span>Android APK</span><b>Chưa build · thiếu Android SDK</b></div><div class="setting-row"><span>PixiJS / Capacitor packages</span><b>Không tải được qua proxy</b></div><p class="tiny muted">Xem docs/BUILD_GUIDE.md để chuẩn bị Android SDK và tạo bản đóng gói từ cùng codebase.</p></div></section></div><div class="divider"></div><section class="panel">${subheading('Ghi nhận phiên bản dữ liệu')}<div class="panel-body"><div class="hint">${esc(CONTENT_EVIDENCE.source)}. Các bộ danh mục trong build này là bản mô phỏng độc lập. Không đại diện cho dữ liệu chính thức Mobile hoặc cơ sở dữ liệu legacy.</div></div></section>`;
}

const screenMap = {
  city: ['Thành trì','Chỉ huy nội thành, tài nguyên và công trình.'],
  heroes: ['Thần tiên','Mời hiền sĩ, chỉnh đội hình và phân phối trang bị.'],
  inventory: ['Túi đồ','Sử dụng vật phẩm, trang bị thần tiên và rèn pháp bảo.'],
  army: ['Binh doanh','Huấn luyện quân đội, quản lý thương vong và đội hình.'],
  world: ['Bản đồ thiên hạ','Trinh sát, hành quân và giao chiến với NPC.'],
  pve: ['Phong Thần','Chinh phục tháp, tiên sơn và thử thách endgame.'],
  tech: ['Khoa kỹ','Nghiên cứu kinh tế, công thành và binh pháp.'],
  quests: ['Sổ nhiệm vụ','Theo dõi chính tuyến, mục tiêu và phần thưởng.'],
  market: ['Triều Ca Thị','Đổi tài nguyên với thương nhân NPC.'],
  reports: ['Chiến báo','Xem từng hiệp, thương vong và phần thưởng đã quyết toán.'],
  settings: ['Thiết lập','Lưu game, xuất nhập save và cài đặt offline.']
};

export function renderScreen(state, activeView, uiState = {}) {
  const [name, description] = screenMap[activeView] || screenMap.city;
  const aside = activeView === 'city' ? `TỬ VI THÀNH · CẤP ${state.levels.citadel}` : activeView === 'world' ? `KHU VỰC ${Math.min(unlockedChapter(state),uiState.chapter||1)} · ${state.world.storyStage} CHẶNG` : `DANH VỌNG · ${fmt(state.fame)}`;
  document.querySelector('#page-heading').innerHTML = title(name, description, aside);
  const screen = ({ city:cityScreen, heroes:heroScreen, inventory:inventoryScreen, army:armyScreen, world:worldScreen, pve:pveScreen, tech:techScreen, quests:questScreen, market:marketScreen, reports:reportsScreen, settings:settingsScreen })[activeView] || cityScreen;
  document.querySelector('#scene').innerHTML = screen(state, activeView === 'world' ? uiState : Date.now(), uiState);
  if(activeView==='world'){
    const side=document.querySelector('.map-side');
    side?.querySelectorAll('.panel').forEach(node=>{if(node.innerText.includes('Ngoại giao và liên minh NPC'))node.remove();});
    side?.insertAdjacentHTML('beforeend',renderSocietyPanel(state,uiState));
    const primary=document.querySelector('#march-unit')?.value;
    const support=Object.entries(state.army||{}).filter(([id,count])=>id!==primary&&count>0).map(([id,count])=>'<label class="march-support-row"><span>'+esc(TROOPS.find(t=>t.id===id)?.name||id)+' · có '+fmt(count)+'</span><input class="input" type="number" min="0" max="'+count+'" value="0" data-march-support="'+id+'" aria-label="Số '+esc(TROOPS.find(t=>t.id===id)?.name||id)+' hỗ trợ"></label>').join('');
    const formRow=document.querySelector('#march-unit')?.closest('.field-row');
    if(support&&formRow)formRow.insertAdjacentHTML('beforebegin','<details class="march-support"><summary>Thêm binh chủng hỗ trợ · '+(Object.keys(state.army).length-1)+'</summary><div class="march-support-list">'+support+'</div><small class="muted">Đạo quân kết hợp tận dụng tương khắc giữa các vai trò.</small></details>');
  }
  renderShell(state, activeView);
}

function renderSocietyPanel(state,uiState) {
  const node=WORLD_NODES.find(x=>x.id===uiState.nodeId);
  const guildLevel=state.world.guildLevel||0;
  const guildCost={gold:200*(guildLevel+1),timber:90*(guildLevel+1)};
  const guildReady=state.levels.embassy>0&&guildLevel<5&&isAffordable(state,guildCost);
  const alreadyTreatied=node&&state.world.treaties.includes(node.id);
  const diplomacyCost=node?120+node.chapter*40:0;
  const canTreaty=!!node&&node.kind==='Danh thành'&&!alreadyTreatied&&!state.world.captures.includes(node.id)&&state.levels.embassy>0&&state.resources.gold>=diplomacyCost;
  const towns=(state.cities||[]).map(city=>'<div class="production-line"><span class="resource-glyph">'+(city.isCapital?'周':'城')+'</span><span>'+esc(city.name)+' · cấp '+city.level+'</span><b>'+(city.isCapital?'Kinh đô':'Thành phụ')+'</b></div>').join('');
  return '<section class="panel">'+subheading('Minh hội và ngoại giao NPC')+'<div class="panel-body"><div class="hint">Đối thủ, thương nhân và minh hội là NPC ngoại tuyến; không có người chơi trực tiếp. Minh ước làm giảm sức một danh thành; thành phụ tăng sản lượng.</div><div class="setting-row"><span>Cấp minh hội NPC</span><b>'+guildLevel+' / 5 · giảm phí đổi '+(guildLevel*.5)+'%</b></div><div class="tiny muted">Kết minh tiếp theo: '+costText(guildCost)+' · cần Bát Phương Quán cấp 1.</div><div style="margin-top:7px">'+button('guild',guildLevel>=5?'Đã tối đa':'Mở rộng minh hội · cấp '+(guildLevel+1),!guildReady,'button small')+'</div><div class="divider"></div><div class="setting-row"><span>Địa điểm chọn</span><b>'+esc(node?.name||'Chưa chọn')+'</b></div><div class="tiny muted">'+(alreadyTreatied?'Minh ước đang có hiệu lực.':node?.kind==='Danh thành'?'Minh ước tốn '+fmt(diplomacyCost)+' đồng; cần Bát Phương Quán.':'Chọn danh thành NPC để đề nghị minh ước.')+'</div><div style="margin-top:7px">'+button('diplomacy',alreadyTreatied?'Đã ký minh ước':'Đề nghị minh ước',!canTreaty||alreadyTreatied,'button ghost small',node?'data-node="'+node.id+'"':'')+'</div><div class="divider"></div><div class="production-list">'+towns+'</div><div class="field-row" style="margin-top:9px">'+button('view-market','Giao thương NPC',false,'button small')+button('view-quests','Chính tuyến',false,'button ghost small')+'</div></div></section>';
}

export function renderStartup() {
  document.querySelector('#realm-title').textContent = 'Tân chủ';
  document.querySelector('#fame-value').textContent = '0';
  document.querySelector('#resource-strip').innerHTML = '';
  document.querySelector('#primary-nav').innerHTML = '';
  document.querySelector('#mobile-nav').innerHTML = '';
  document.querySelector('#offline-status').textContent = 'Thế giới đơn · dữ liệu lưu trên thiết bị';
  document.querySelector('#page-heading').innerHTML = title('Mưu định Phong Thần','Khởi đầu một cơ đồ trong thời loạn.','OFFLINE · MỘT NGƯỜI CHƠI');
  document.querySelector('#scene').innerHTML = `<section class="city-hero startup-hero"><div class="city-hero-content"><span class="city-kicker">THẦN THOẠI · CHIẾN LƯỢC · THÀNH TRÌ</span><h2>Thiên hạ đợi minh chủ</h2><p>Xây thành, tích lũy, chiêu mộ thần tiên, luyện đạo quân và từng bước vượt qua những thử thách của Phong Thần.</p><form data-form="new-game" class="startup-form"><label for="new-city-name">Tên thành trì</label><div class="field-row"><input class="input" id="new-city-name" name="name" maxlength="22" value="Triều Ca" autocomplete="off"><button class="button" type="submit">Khai mở cơ đồ</button></div></form><div class="startup-badges"><span class="tag">Chơi offline</span><span class="tag">Tự lưu trên máy</span><span class="tag simulated">Nội dung SIMULATED</span></div></div></section><div class="startup-cards"><article class="panel"><div class="panel-body"><span class="eyebrow">THÀNH TRÌ</span><h2 class="hero-name">Một nền kinh tế vận hành</h2><p class="tiny muted">Sản xuất theo thời gian, xây 21 công trình, mở khóa khoa kỹ và quản trị dân tâm.</p></div></article><article class="panel"><div class="panel-body"><span class="eyebrow">THẦN TIÊN · BINH CHỦNG</span><h2 class="hero-name">Đội hình có chiến lược</h2><p class="tiny muted">Tuyển mộ, trang bị, tương khắc đội quân, hành quân và chữa trị thương binh.</p></div></article><article class="panel"><div class="panel-body"><span class="eyebrow">THẾ GIỚI PVE</span><h2 class="hero-name">Một hành trình dài</h2><p class="tiny muted">120 địa điểm NPC, chính tuyến, Phong Thần Tháp và năm cửa Bất Chu Sơn.</p></div></article></div><div class="hint startup-disclosure">Lưu ý nguồn: truy cập tài liệu Mobile và cơ sở dữ liệu tham chiếu hiện bị proxy chặn. Bản khởi tạo dùng danh mục, hệ số và nội dung chiến đấu mô phỏng độc lập, được ghi rõ trong game.</div>`;
}

export function updateClock(state, now = Date.now()) {
  document.querySelectorAll('[data-queue-time]').forEach(el => {
    const finishAt = Number(el.dataset.queueTime);
    const remaining = finishAt - now;
    el.textContent = remaining > 0 ? formatDuration(remaining) : 'đang hoàn tất…';
    const progress = el.closest('.queue-card')?.querySelector('[data-progress]');
    if (progress) {
      const q = [state.queues.construction,state.queues.training,state.queues.research,state.queues.march].find(x=>x&&x.finishAt===finishAt);
      if (q) progress.style.width = `${Math.max(0,Math.min(100,(1-Math.max(0,remaining)/(q.finishAt-q.startAt))*100))}%`;
    }
  });
}

export function showToast(message, tone='normal') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  stack.append(toast);
  setTimeout(()=>toast.remove(),4000);
}

export function showDialog({ title:heading, message, confirm='Đồng ý', cancel='Đóng', onConfirm }) {
  const root = document.querySelector('#modal-root');
  root.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><h2>${esc(heading)}</h2><p>${esc(message)}</p><div class="modal-actions"><button class="button ghost" data-dialog-cancel>${esc(cancel)}</button><button class="button" data-dialog-confirm>${esc(confirm)}</button></div></div>`;
  root.querySelector('[data-dialog-cancel]').addEventListener('click',()=>root.replaceChildren());
  root.querySelector('[data-dialog-confirm]').addEventListener('click',async()=>{root.replaceChildren(); await onConfirm?.();});
}
