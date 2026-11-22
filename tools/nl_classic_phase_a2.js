// === NL-CLASSIC-A2-V1: project-original economy bridge & 207 source-routed recruits ===
// Classic WEB is the design target; all new prices and hero route mappings are SIMULATED.
// Keep original Save-v5 fields, identities, item receipts and native combat owners.
if(typeof NL_HERO207_ROWS==='undefined'||typeof nlAState!=='function'||typeof BUILDINGS==='undefined'||
   typeof NL_CITY_CATALOG==='undefined'||typeof nlHero207Recruit!=='function')
 throw Error('NL-CLASSIC-A2: missing integration dependency');
const NL_A2_EXCHANGE_RATE=4; // Original/project silver equivalent of one deprecated construction iron unit.
const NL_A2_COMPAT_BUILDINGS=Object.freeze([
 'nl_city_ironworks','nl_city_depot','nl_city_bank','nl_city_trade_society','nl_city_hunting',
 'nl_city_mint','nl_city_state_office','nl_city_engraving','nl_city_soul_hall',
 'nl_city_naval_port','nl_city_naval_drill','nl_city_cargo_port','nl_city_dock',
 'nl_city_navy_hall','nl_city_navy_warehouse','nl_city_lighthouse'
]);
let nlA2HeroRoute='all',nlA2HeroSearch='',nlA2HeroPage=0,nlA2AdvancedCity=false;
// Compatibility note: this bridge does not mutate old inventory/gear or convert a saved iron balance.
// Legacy equipment still uses its source-authored material contract until equipment C10.
function nlA2BuildingCost(id){
 const b=BUILDINGS[id];if(!b)return null;
 const level=game.buildings[id];if(!Number.isInteger(level)||level<1)return null;
 const oldSilver=Math.round(b.base*Math.pow(1.75,level-1));
 const oldIron=Math.round(b.iron*Math.pow(1.65,level-1));
 return {silver:oldSilver+oldIron*NL_A2_EXCHANGE_RATE,grain:Math.ceil(oldIron/2)};
}
buildingCost=nlA2BuildingCost;
upgrade=function(id){
 if(!BUILDINGS[id])return;
 const b=BUILDINGS[id],level=game.buildings[id],c=buildingCost(id);
 if(level>=12)return toast('Công trình đã đạt cấp tối đa.');
 if(id!=='palace'&&level>=game.buildings.palace+2)return toast('Cần nâng cấp Thành Chính trước.');
 if(!payment(c))return toast('Không đủ Bạc hoặc Lương để nâng cấp.');
 game.buildings[id]++;countTask('upgrade');log('Nâng cấp '+b.name+' lên cấp '+(level+1)+' (giá mô phỏng A2).');
 save();toast(b.name+' đã lên cấp '+(level+1));render();
};
if(BUILDINGS.palace){BUILDINGS.palace.name='Thành Chính';BUILDINGS.palace.desc='Trung tâm quản lý, nâng cấp mở khóa công trình.';}
if(BUILDINGS.mine){BUILDINGS.mine.name='Mỏ Bạc';BUILDINGS.mine.desc='Khai thác bạc cho thành trì. Sắt cũ chỉ giữ làm nguyên liệu tương thích.';}
if(BUILDINGS.market)BUILDINGS.market.desc='Sản xuất bạc, mua bán lương thực.';
// Native production tick is the sole owner. Redirect only the mine's OLD iron yield,
// calculated from the actual delta of native tick, into silver on this same tick.
// No standalone timer and no double-credit on repeated calls without elapsed ticks.
const nlA2PreviousTick=tick;
tick=function(){
 const oldIron=game.iron,oldSilver=game.silver;
 const result=nlA2PreviousTick.apply(this,arguments);
 const emitted=Number.isSafeInteger(game.iron)&&Number.isSafeInteger(oldIron)?Math.max(0,game.iron-oldIron):0;
 if(emitted>0){
   game.iron-=emitted;
   game.silver+=emitted*NL_A2_EXCHANGE_RATE;
   if(!Number.isSafeInteger(game.silver)||game.silver<oldSilver)throw Error('NL-CLASSIC-A2: silver overflow');
   save();renderResources();
 }
 return result;
};
// 207 characters already have exact source PROJECT stage+silver gates, real roles and skills.
// This is an *original project routing policy*, not a verified VNG recruit map.
function nlA2Route(id){
 const hero=NL_HERO207_BY_ID.get(id),gate=NL_HERO207_UNLOCKS[id];
 if(!hero||!gate)return null;
 if(gate.stage<=2)return {method:'story',stage:gate.stage,silver:gate.silverCost};
 if(['strategist','support'].includes(hero.type))return {
   method:'renown',stage:gate.stage,prestige:Math.max(30,gate.stage*10),silver:gate.silverCost};
 return {method:'tavern',stage:gate.stage,silver:gate.silverCost};
}
const nlA2BeforeCan=nlHero207CanRecruit;
nlHero207CanRecruit=function(id){
 const route=nlA2Route(id),a=nlAState();
 if(!route||!nlA2BeforeCan(id))return false;
 if(route.method==='renown'&&game.prestige<route.prestige)return false;
 if(route.method==='tavern'&&((game.buildings.tavern||0)<1||a.talkUsed>=NL_A_TALK_DAILY))return false;
 return true;
};
const nlA2Before207Recruit=nlHero207Recruit;
nlHero207Recruit=function(id){
 const route=nlA2Route(id);
 if(!route||!nlHero207CanRecruit(id))return false;
 const wasOwned=nlHero207Owned(id),beforeSilver=game.silver;
 const done=nlA2Before207Recruit(id);
 if(!done||wasOwned||!nlHero207Owned(id))return false;
 const a=nlAState();
 if(route.method==='tavern')a.talkUsed++;
 if(!a.recruitReceipts.some(x=>x.id===id))a.recruitReceipts.push({id,method:route.method,stage:route.stage,cost:beforeSilver-game.silver,at:Date.now(),source:'PROJECT_SIMULATED_A2'});
 a.recruitReceipts=a.recruitReceipts.slice(-500);
 save();render();return true;
};
// Preserve the established [data-nl207-select] / [data-nl207-recruit] bridge for
// real Hero207+equipment tests; no second hero state owner is created.
const nlA2Routes=Object.freeze([['all','Tất cả'],['story','Phó bản'],['renown','Uy danh'],['tavern','Hội đàm']]);
function nlA2RouteDescription(route){
 if(route.method==='story')return 'Thắng ải '+route.stage;
 if(route.method==='renown')return 'Thắng ải '+route.stage+' · Uy danh ≥ '+fmt(route.prestige);
 return 'Thắng ải '+route.stage+' · Tửu Quán · Hội đàm';
}
nlHero207Panel=function(){
 const owned=NL_HERO207_ROWS.filter(h=>nlHero207Owned(h.id)).length;
 const search=nlA2HeroSearch.toLocaleLowerCase('vi-VN');
 const unowned=NL_HERO207_ROWS.filter(h=>!nlHero207Owned(h.id) && (nlA2HeroRoute==='all'||nlA2Route(h.id)?.method===nlA2HeroRoute) &&
  (!search||h.name.toLocaleLowerCase('vi-VN').includes(search)));
 const ordered=unowned.sort((a,b)=>NL_HERO207_UNLOCKS[a.id].stage-NL_HERO207_UNLOCKS[b.id].stage||a.name.localeCompare(b.name,'vi'));
 const eligible=ordered.filter(h=>nlHero207CanRecruit(h.id));
 const locked=ordered.filter(h=>!nlHero207CanRecruit(h.id));
 const all=[...eligible,...locked];
 const pageSize=8,pages=Math.max(1,Math.ceil(all.length/pageSize));nlA2HeroPage=Math.min(nlA2HeroPage,pages-1);
 const visible=all.slice(nlA2HeroPage*pageSize,(nlA2HeroPage+1)*pageSize);
 const opts=eligible.map(h=>{
   const route=nlA2Route(h.id);
   return '<option value="'+esc(h.id)+'">'+esc(h.name)+' · '+esc(nlA2RouteDescription(route))+' · '+fmt(route.silver)+' Bạc</option>';
 }).join('');
 const rows=visible.map(h=>{
   const route=nlA2Route(h.id),ready=nlHero207CanRecruit(h.id);
   return '<div class="nl-a2-hero-row"><span>'+esc(h.icon+' '+h.name)+'</span><small>'+esc(nlA2RouteDescription(route))+' · '+fmt(route.silver)+' Bạc</small><b>'+(ready?'Có thể mời':'Chưa đủ điều kiện')+'</b></div>';
 }).join('');
 const buttons=nlA2Routes.map(([id,label])=>'<button type="button" class="dark-button '+(nlA2HeroRoute===id?'picked':'')+'" data-nla2-route="'+id+'">'+label+'</button>').join('');
 return '<section class="panel mini-box nl-a2-recruits" data-nl-hero207="1"><h3>🍵 Danh Tướng · 207 nhân vật mở rộng</h3>'+
  '<p class="tiny">Đã sở hữu '+owned+'/207. Phó bản / Uy danh / Hội đàm chỉ là quy tắc <b>SIMULATED</b> cho nhân vật mở rộng; tên, kỹ năng, chỉ số không được xác nhận trùng Wiki.</p>'+
  '<div class="nl-a2-tabs">'+buttons+'</div><div class="nl-a2-search"><input data-nla2-search type="search" aria-label="Tìm võ tướng mở rộng" placeholder="Tìm tên tướng..." value="'+esc(nlA2HeroSearch)+'" />'+
  '<span>'+eligible.length+' có thể chiêu mộ / '+ordered.length+' còn lại</span></div>'+
  '<div class="nl-a2-list">'+rows+'</div><div class="nl-a2-footer"><button type="button" class="dark-button" data-nla2-prev '+(nlA2HeroPage===0?'disabled':'')+'>◀</button>'+
  '<span>Trang '+(nlA2HeroPage+1)+'/'+pages+'</span><button type="button" class="dark-button" data-nla2-next '+(nlA2HeroPage>=pages-1?'disabled':'')+'>▶</button></div>'+
  '<div class="nl207-recruit"><select data-nl207-select aria-label="Chọn tướng đủ điều kiện">'+opts+'</select>'+
  '<button class="gold-button" data-nl207-recruit '+(!opts?'disabled':'')+'>Chiêu mộ</button></div></section>';
};
// Keep 14 original recruit paths in Phase A and one shared account-wide tavern quota.
const nlA2PreviousCity=renderCity;
renderCity=function(){
  let html=nlA2PreviousCity.apply(this,arguments);
  const advanced=nlA2AdvancedCity?'1':'0';
  const marker='<section class="nlcity"';
  html=html.replace(marker,'<section class="nlcity" data-nla2-advanced="'+advanced+'"');
  html=html.replace('31 công trình mới','Các công trình thành trì (31 hồ sơ, gồm phần di sản)');
  const at=html.indexOf('data-nl-city-panel="1"');
  if(at>=0){
    const pos=html.indexOf('>',at);
    if(pos>0)html=html.slice(0,pos+1)+'<div class="nl-a2-city-switch"><strong>🏯 Thành Chính · Bạc & Lương</strong><button type="button" class="dark-button" data-nla2-advanced="1">'+
      (nlA2AdvancedCity?'Ẩn công trình mở rộng':'Xem công trình mở rộng / tương thích')+'</button></div>'+html.slice(pos+1);
  }
  return html;
};
document.addEventListener('click',ev=>{
 const btn=ev.target.closest?.('[data-nla2-route],[data-nla2-prev],[data-nla2-next],[data-nla2-advanced]');
 if(!btn||btn.disabled)return;
 if(btn.hasAttribute('data-nla2-route')){nlA2HeroRoute=btn.dataset.nla2Route;nlA2HeroPage=0;tab='heroes';render();}
 else if(btn.hasAttribute('data-nla2-prev')){nlA2HeroPage=Math.max(0,nlA2HeroPage-1);render();}
 else if(btn.hasAttribute('data-nla2-next')){nlA2HeroPage++;render();}
 else if(btn.hasAttribute('data-nla2-advanced')){nlA2AdvancedCity=!nlA2AdvancedCity;tab='city';render();}
});
document.addEventListener('change',ev=>{
 const input=ev.target.closest?.('[data-nla2-search]');
 if(!input)return;
 nlA2HeroSearch=input.value.trim().slice(0,64);nlA2HeroPage=0;tab='heroes';render();
});
if(window.__P2_ENABLE_QA__)window.__NL_CLASSIC_A2_QA__=Object.freeze({
 version:1,source:'PROJECT_SIMULATED_A2',route:id=>nlA2Route(id),
 canRecruit:id=>nlHero207CanRecruit(id),recruit:id=>nlHero207Recruit(id),
 legacyCost:id=>buildingCost(id),cityCatalogue:()=>structuredClone(NL_CITY_CATALOG),
 owned207:()=>NL_HERO207_ROWS.filter(h=>nlHero207Owned(h.id)).length,
 tick:()=>tick(),upgrade:id=>upgrade(id),
 heroes:()=>NL_HERO207_ROWS.map(h=>({id:h.id,name:h.name,route:nlA2Route(h.id)})),
 advancedCity:()=>nlA2AdvancedCity
});
if(window.__P2_ENABLE_QA__ && window.__NL_HERO207_QA__){
  window.__NL_HERO207_QA__.canRecruit=nlHero207CanRecruit;
  window.__NL_HERO207_QA__.recruit=nlHero207Recruit;
}
// === end NL-CLASSIC-A2-V1 ===
