import { activeQuest, advance, createNewGame, doAction } from './engine.js';
import { QUESTS } from './catalog.js';
import { exportSave, importSaveFile, loadGame, saveGame } from './store.js';
import { NAV, renderScreen, renderShell, renderStartup, showDialog, showToast, updateClock } from './ui.js';

let game = null;
let activeView = 'city';
let dirty = false;
let busy = false;
const uiState = { chapter: 1, nodeId: 'node-001' };
const validViews = new Set(NAV.map(x=>x[0]));
const fmtFileDate = () => new Date().toISOString().slice(0,10);

function setSaveStatus(text, saved=false) {
  const node = document.querySelector('#save-status');
  if (!node) return;
  node.textContent = text;
  node.parentElement?.classList.toggle('is-saving', !saved);
}

function playChime() {
  if (!game?.settings?.sound || !globalThis.AudioContext) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(554, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(830, context.currentTime + .08);
    gain.gain.setValueAtTime(.018, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .24);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .25);
    oscillator.onended=()=>context.close();
  } catch { /* Audio is optional and never blocks play. */ }
}

async function persist(force=false) {
  if (!game || (!dirty && !force)) return;
  if (!force && !game.settings.autosave) { setSaveStatus('Có thay đổi chưa lưu'); return; }
  try {
    await saveGame(game);
    dirty = false;
    lastSave = Date.now();
    setSaveStatus('Đã lưu cục bộ', true);
  } catch (error) {
    setSaveStatus('Bản phụ localStorage đã cập nhật');
    showToast(`IndexedDB chưa lưu được: ${error.message}`, 'warning');
  }
}

function setView(view, updateHash=true) {
  if (!validViews.has(view)) return;
  activeView = view;
  document.body.classList.remove('startup-mode');
  if (updateHash) history.replaceState(null,'',`#${view}`);
  renderScreen(game, activeView, uiState);
}

function renderCurrent() {
  if (game) renderScreen(game, activeView, uiState);
  else renderStartup();
}

function markChanged(message) {
  dirty = true;
  if (message) showToast(message);
  playChime();
  renderCurrent();
  persist().catch(()=>{});
}

async function perform(action, data={}) {
  if (!game || busy) return;
  busy = true;
  try {
    game = doAction(game, { type:action, ...data }, Date.now());
    dirty = true;
    renderCurrent();
    playChime();
    await persist();
  } catch (error) {
    showToast(error?.message || 'Không thực hiện được mệnh lệnh.', 'warning');
  } finally { busy = false; }
}

function startGame(name) {
  game = createNewGame(name, Date.now());
  activeView = 'city';
  uiState.chapter = 1;
  uiState.nodeId = 'node-001';
  dirty = true;
  document.body.classList.remove('startup-mode');
  history.replaceState(null,'','#city');
  renderCurrent();
  showToast(`Cơ đồ ${game.profile.name} đã khai mở.`);
  persist(true).catch(()=>{});
}

async function initialize() {
  document.body.classList.add('startup-mode');
  try { game = await loadGame(); } catch (error) { showToast(`Không đọc được save: ${error.message}`, 'warning'); }
  if (game) {
    const result = advance(game, Date.now());
    game = result.state;
    activeView = location.hash.slice(1);
    if (!validViews.has(activeView)) activeView = 'city';
    document.body.classList.remove('startup-mode');
    if (result.elapsedSeconds > 1) {
      dirty = true;
      if (result.offlineCapped) showToast('Tiến trình offline đã tính tối đa 8 giờ.', 'normal');
      await persist(true).catch(()=>{});
    }
    renderCurrent();
  } else renderStartup();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      if (reg.waiting) showToast('Có bản game mới sẵn sàng sau khi tải lại.');
    }).catch(error=>console.info('PWA offline cache chưa đăng ký:',error.message));
  }
}

document.body.addEventListener('click', async event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { setView(viewButton.dataset.view); return; }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action.startsWith('view-')) { setView(action.slice(5)); return; }
  switch(action) {
    case 'catalogPage': {
      const key=button.dataset.pageKey;
      if(['heroPage','forgePage','consumablePage','questPage','mountainPage'].includes(key)){uiState[key]=Math.max(0,Number(button.dataset.page)||0);renderCurrent();}
      return;
    }
    case 'selectNode':
      uiState.nodeId = button.dataset.node;
      renderCurrent();
      return;
    case 'upgrade': return perform('upgrade',{buildingId:button.dataset.building});
    case 'upgradeCity': return perform('upgradeCity',{cityId:button.dataset.city});
    case 'setTaxPolicy': return perform('setTaxPolicy',{policy:button.dataset.policy});
    case 'train': return perform('train',{troopId:document.querySelector('#train-unit')?.value||button.dataset.troop,count:document.querySelector('#train-count')?.value||button.dataset.count});
    case 'trainHero': return perform('trainHero',{heroId:button.dataset.hero});
    case 'recruit': return perform('recruit',{heroId:button.dataset.hero});
    case 'assignHero': return perform('assignHero',{heroId:button.dataset.hero});
    case 'equip': return perform('equip',{itemId:button.dataset.item,heroId:document.querySelector(`[data-equip-select="${button.dataset.item}"]`)?.value||button.dataset.hero});
    case 'useItem': return perform('useItem',{itemId:button.dataset.item,index:Number(button.dataset.index)});
    case 'buyItem': return perform('buyItem',{itemId:button.dataset.item});
    case 'forge': return perform('forge',{itemId:button.dataset.item});
    case 'research': return perform('research',{techId:button.dataset.tech});
    case 'scout': return perform('scout',{nodeId:button.dataset.node||uiState.nodeId});
    case 'march': {
      const troopId=document.querySelector('#march-unit')?.value||button.dataset.troop;
      const troops={};
      const count=Number(document.querySelector('#march-count')?.value||button.dataset.count)||0;
      if(troopId&&count>0)troops[troopId]=count;
      document.querySelectorAll('[data-march-support]').forEach(input=>{
        const amount=Math.max(0,Number(input.value)||0);
        if(input.dataset.marchSupport!==troopId&&amount>0)troops[input.dataset.marchSupport]=amount;
      });
      return perform('march',{nodeId:button.dataset.node||uiState.nodeId,troopId,count,troops});
    }
    case 'guild': return perform('guild',{});
    case 'diplomacy': return perform('diplomacy',{nodeId:button.dataset.node||uiState.nodeId});
    case 'duel': return perform('duel',{mode:button.dataset.mode,mountainId:button.dataset.mountain});
    case 'claimQuest': {
      await perform('claimQuest',{questId:button.dataset.quest});
      const current=activeQuest(game);
      const index=QUESTS.findIndex(q=>q.id===current?.id);
      if(index>=0){uiState.questPage=Math.floor(index/24);renderCurrent();}
      return;
    }
    case 'heal': return perform('heal',{});
    case 'export': {
      const blob=exportSave(game), url=URL.createObjectURL(blob), anchor=document.createElement('a');
      anchor.href=url; anchor.download=`dacky-save-${fmtFileDate()}.json`; anchor.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500); showToast('Đã xuất bản lưu JSON.'); return;
    }
    case 'save': await persist(true); showToast('Đã lưu tiến trình hiện tại.'); return;
    case 'rename': return perform('rename',{name:document.querySelector('#rename-city')?.value});
    default: showToast('Mệnh lệnh chưa được nối vào hệ thống.', 'warning');
  }
});

document.body.addEventListener('submit', async event => {
  const form=event.target;
  if (form.dataset.form==='new-game') {
    event.preventDefault();
    const name=new FormData(form).get('name');
    startGame(name);
  } else if (form.dataset.form==='trade') {
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    await perform('trade',{...data,amount:Number(data.amount)});
  }
});

document.body.addEventListener('change', async event => {
  const target=event.target;
  if (target.matches('[data-change="chapter"]')) {
    uiState.chapter=Number(target.value)||1;
    uiState.nodeId=null;
    renderCurrent();
  } else if (target.matches('[data-setting]')) {
    await perform('setting',{key:target.dataset.setting,value:target.checked});
    document.body.classList.toggle('effects-off',!game.settings.effects);
    document.body.classList.toggle('reduce-motion',game.settings.reducedMotion);
  } else if (target.id==='import-file' && target.files?.[0]) {
    try {
      const imported=await importSaveFile(target.files[0]);
      showDialog({title:'Thay thế bản lưu?',message:`Tệp hợp lệ cho ${imported.profile.name}; lưu hiện tại sẽ được thay thế trên thiết bị này.`,confirm:'Nhập và thay save',onConfirm:async()=>{
        game=advance(imported,Date.now()).state; activeView='city'; dirty=true; renderCurrent(); await persist(true); showToast('Đã nhập và kiểm tra bản lưu.');
      }});
    } catch(error) { showToast(`Không thể nhập save: ${error.message}`,'warning'); }
    target.value='';
  }
});

window.addEventListener('hashchange',()=>{
  if (game) { const view=location.hash.slice(1); if (validViews.has(view)) setView(view,false); }
});
window.addEventListener('beforeunload',()=>{
  if (!game||!dirty||!game.settings.autosave) return;
  try { localStorage.setItem('dacky-mobile-save-v1',JSON.stringify(game)); } catch { /* IndexedDB checkpoint continues asynchronously. */ }
  saveGame(game).catch(()=>{});
});
document.addEventListener('visibilitychange',()=>{
  if (document.visibilityState!=='visible'||!game) return;
  const oldQueues=JSON.stringify(game.queues);
  const result=advance(game,Date.now()); game=result.state;
  if (JSON.stringify(game.queues)!==oldQueues) { renderCurrent(); dirty=true; persist(true).catch(()=>{}); }
  if (result.offlineCapped) showToast('Tiến trình offline đã tính tối đa 8 giờ.');
});

let lastHud=0, lastSave=0;
setInterval(()=>{
  if (!game) return;
  const before=JSON.stringify(game.queues);
  const result=advance(game,Date.now()); game=result.state;
  const queueChanged=JSON.stringify(game.queues)!==before;
  updateClock(game,Date.now());
  if (queueChanged) {
    dirty=true;
    renderCurrent();
    const latest=game.notifications[0]; if (latest) showToast(latest);
    persist(true).catch(()=>{});
  }
  if (Date.now()-lastHud>9000) {
    document.querySelector('#realm-title').textContent=game.profile.name;
    document.querySelector('#fame-value').textContent=new Intl.NumberFormat('vi-VN').format(game.fame);
    renderShell(game,activeView);
    lastHud=Date.now();
  }
  if (game.settings.autosave && dirty && Date.now()-lastSave>25000) { lastSave=Date.now(); persist().catch(()=>{}); }
},1000);

initialize();
