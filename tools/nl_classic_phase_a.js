// === NL-CLASSIC-A-V1: classic WEB resource labels, tax & named recruiting ===
// All fees / gates / cooldowns are PROJECT SIMULATED, not VNG coefficients.
// Save key, schema 5, legacy wood/iron/gems, 14 original heroes, Hero207 and receipts remain intact.
const NL_A_RECRUIT = Object.freeze([
  {id:'zhao',method:'story',stage:0,silver:500,caption:'Chiêu mộ tân thủ / gặp gỡ tại thành'},
  {id:'huang',method:'story',stage:2,silver:650,caption:'Mở sau Trường Xã'},
  {id:'zhang',method:'story',stage:3,silver:850,caption:'Mở sau tiền doanh Hổ Lao'},
  {id:'ma',method:'story',stage:4,silver:1000,caption:'Mở sau Hổ Lao Quan'},
  {id:'guan',method:'story',stage:5,silver:1200,caption:'Mở sau Lạc Dương'},
  {id:'dian',method:'story',stage:6,silver:1100,caption:'Mở sau Bộc Dương'},
  {id:'zhou',method:'story',stage:8,silver:1650,caption:'Mở sau Quan Độ'},
  {id:'cao',method:'story',stage:12,silver:2500,caption:'Mở sau Xích Bích'},
  {id:'liu',method:'renown',prestige:80,silver:750,caption:'Ngưỡng Uy danh'},
  {id:'sunquan',method:'renown',prestige:160,silver:1050,caption:'Ngưỡng Uy danh'},
  {id:'zhuge',method:'renown',prestige:320,silver:2000,caption:'Ngưỡng Uy danh'},
  {id:'sun',method:'tavern',stage:3,silver:650,caption:'Hội đàm khi đã thắng ải 3'},
  {id:'xun',method:'tavern',stage:5,silver:1200,caption:'Hội đàm khi đã thắng ải 5'},
  {id:'lu',method:'tavern',stage:10,silver:2600,caption:'Hội đàm khi đã thắng ải 10'}
]);
const NL_A_RECRUIT_BY_ID = new Map(NL_A_RECRUIT.map(row=>[row.id,row]));
const NL_A_TAX_DAILY = 12, NL_A_TALK_DAILY=3, NL_A_ORDERS_CAP=60;
const NL_A_ORDER_MS=30*60*1000;
let nlARecruitFilter='story';
function nlAState(){
  const now=Date.now(),today=dayId();
  if(!game.nlClassicA || typeof game.nlClassicA!=='object' || Array.isArray(game.nlClassicA)) {
    game.nlClassicA={version:1,merit:180,meritSpent:0,orders:NL_A_ORDERS_CAP,lastOrderAt:now,
      taxDay:today,taxUsed:0,talkDay:today,talkUsed:0,recruitReceipts:[],taxReceipts:[],
      meritReceipts:[],orderReceipts:[],source:'PROJECT_SIMULATED_CLASSIC_A'};
  }
  const a=game.nlClassicA;
  a.version=1;
  for(const k of ['merit','meritSpent','orders','taxUsed','talkUsed']) {
    if(!Number.isFinite(a[k]) || a[k]<0)a[k]=0;
    a[k]=Math.floor(a[k]);
  }
  if(!Array.isArray(a.recruitReceipts))a.recruitReceipts=[];
  if(!Array.isArray(a.taxReceipts))a.taxReceipts=[];
  if(!Array.isArray(a.meritReceipts))a.meritReceipts=[];
  if(!Array.isArray(a.orderReceipts))a.orderReceipts=[];
  if(a.taxDay!==today){a.taxDay=today;a.taxUsed=0;}
  if(a.talkDay!==today){a.talkDay=today;a.talkUsed=0;}
  if(!Number.isFinite(a.lastOrderAt)||a.lastOrderAt>now)a.lastOrderAt=now;
  const generated=Math.floor((now-a.lastOrderAt)/NL_A_ORDER_MS);
  if(generated>0){a.orders=Math.min(NL_A_ORDERS_CAP,a.orders+generated);a.lastOrderAt+=generated*NL_A_ORDER_MS;}
  a.orders=Math.min(NL_A_ORDERS_CAP,a.orders);
  return a;
}
// Added to the already migrated v5 game; no delete/rename of old state.
nlAState();save();
const nlAOldResourceView=renderResources;
renderResources=function(){
  const a=nlAState();
  const rows=[['🪙','Bạc',game.silver],['🌾','Lương',game.grain],
    ['🏅','Uy danh',game.prestige],['⚔️','Chiến công',a.merit],['📜','Quân lệnh',a.orders]];
  const el=$('resources');if(!el)return nlAOldResourceView();
  el.innerHTML=rows.map(x=>'<div class="res" title="Tài nguyên chính Ngọa Long web; các hệ số trong Mưu Định Tam Quốc do dự án thiết kế"><span>'+x[0]+' '+x[1]+'</span><b>'+fmt(x[2])+'</b></div>').join('');
};
// The legacy conversion state is retained; it remains usable by old inventory,
// city and offline imports but no longer masquerades as classic WEB currency.
const nlAOldEarnedText=earnedText;
earnedText=function(r){return Object.entries(r).map(([k,v])=>{
  const names={silver:'🪙 Bạc',grain:'🌾 Lương',prestige:'🏅 Uy danh',iron:'⛓ Sắt (nguyên liệu cũ)',
    wood:'🌲 Gỗ (tương thích cũ)',gems:'💠 Ngọc',merit:'⚔️ Chiến công',orders:'📜 Quân lệnh'};
  return (names[k]||k)+' '+fmt(v);
}).join(' · ');};
// Generic atomic payment bridge for classic Chiến công (nested in Save v5).
const nlAPriorPayment=payment;
payment=function(cost){
  if(!cost || !Object.prototype.hasOwnProperty.call(cost,'merit'))return nlAPriorPayment(cost);
  const a=nlAState(),merit=cost.merit;
  if(!Number.isSafeInteger(merit)||merit<0||a.merit<merit)return false;
  const other={...cost};delete other.merit;
  if(!nlAPriorPayment(other))return false;
  a.merit-=merit;return true;
};
// R03 owns research. The late-binding module in R03 replaces its research
// functions after all R03 definitions; never run two research resolvers.
function nlATax(){
  if(battle)return false;
  const a=nlAState();
  if(a.taxUsed>=NL_A_TAX_DAILY){toast('Hôm nay đã đủ 12 lượt trưng thu.');return false;}
  const silver=100+(game.buildings.palace||1)*125+(game.buildings.market||1)*35;
  const prestige=2+Math.floor((game.buildings.palace||1)/4);
  const receipt='tax:'+a.taxDay+':'+(a.taxUsed+1);
  if(a.taxReceipts.includes(receipt))return false;
  game.silver+=silver;game.prestige+=prestige;
  a.taxUsed++;a.taxReceipts.push(receipt);a.taxReceipts=a.taxReceipts.slice(-90);
  log('Thành Chính · thu thuế +'+fmt(silver)+' Bạc, +'+prestige+' Uy danh (PROJECT SIMULATED).');
  save();render();toast('Thu thuế +'+fmt(silver)+' bạc · +'+prestige+' uy danh');
  return true;
}
function nlARouteReady(row){
  if(game.roster.includes(row.id)||!HEROES[row.id]||!game.hero)return false;
  if(row.method==='story')return row.stage===0||game.cleared.includes(row.stage);
  if(row.method==='renown')return game.prestige>=row.prestige;
  if(row.method==='tavern')return game.cleared.includes(row.stage)&&(game.buildings.tavern||0)>=1 && nlAState().talkUsed<NL_A_TALK_DAILY;
  return false;
}
function nlARecruitCost(row){
  // Honor the one-time old onboarding voucher, but never draw a random general.
  return row.id==='zhao' && game.freeRecruit ? 0 : row.silver;
}
function nlARecruitHero(id){
  if(battle)return false;
  const row=NL_A_RECRUIT_BY_ID.get(id),a=nlAState();
  if(!row||!nlARouteReady(row)){toast('Chưa mở khóa chiêu mộ võ tướng này.');return false;}
  const price=nlARecruitCost(row);
  if(game.silver<price){toast('Chưa đủ bạc chiêu mộ: '+fmt(price));return false;}
  if(a.recruitReceipts.some(x=>x.id===id) || game.roster.includes(id))return false;
  // One authoritative grant, one silver debit, one receipt. Existing gear/Save IDs are retained.
  game.silver-=price;
  game.roster.push(id);
  game.hero[id]={level:1,xp:0,troops:160};
  if(!game.troopModes||typeof game.troopModes!=='object')game.troopModes={};
  if(row.method==='tavern')a.talkUsed++;
  if(id==='zhao' && game.freeRecruit)game.freeRecruit=false;
  a.recruitReceipts.push({id,method:row.method,stage:row.stage||null,cost:price,at:Date.now(),source:'SIMULATED'});
  a.recruitReceipts=a.recruitReceipts.slice(-240);
  countTask('recruit');
  log('Chiêu mộ '+HEROES[id].name+' qua '+(row.method==='story'?'phó bản':row.method==='renown'?'Uy danh':'Hội đàm')+', chi phí '+fmt(price)+' bạc.');
  save();render();toast('Đã chiêu mộ '+HEROES[id].name+'.');
  return true;
}
// Retire the 1.800-silver random gacha from all legacy entrypoints.
// A one-time free tutorial recruit is still supported on fresh saves.
recruit=function(){
  if(game.freeRecruit && nlARouteReady(NL_A_RECRUIT_BY_ID.get('zhao'))){nlARecruitHero('zhao');return;}
  tab='heroes';nlARecruitFilter='story';render();
  toast('Hãy chọn võ tướng theo phó bản, Uy danh hoặc Hội đàm.');
};
function nlARecruitPanel(){
  const a=nlAState();
  const methods=[['story','🗺️ Phó bản'],['renown','🏅 Uy danh'],['tavern','🍵 Hội đàm']];
  const selected=NL_A_RECRUIT.filter(x=>x.method===nlARecruitFilter);
  const rows=selected.map(row=>{
    const h=HEROES[row.id],owned=game.roster.includes(row.id),available=nlARouteReady(row),cost=nlARecruitCost(row);
    const gate=row.method==='story'?(row.stage?'Vượt ải '+row.stage:'Tân thủ'):
      row.method==='renown'?'Uy danh ≥ '+fmt(row.prestige):'Vượt ải '+row.stage+' · Tửu Quán cấp 1';
    return '<div class="nl-a-hero-row" data-nla-hero="'+esc(row.id)+'"><div class="nl-a-hero-details"><b>'+esc(h.icon+' '+h.name)+'</b><small>'+esc(h.role||'Võ tướng')+' · '+gate+'</small><small>'+esc(row.caption)+' · dự án mô phỏng</small></div><button class="gold-button" data-nla-recruit="'+esc(row.id)+'" '+(owned||!available?'disabled':'')+'>'+(owned?'Đã sở hữu':available?'Chiêu mộ · '+fmt(cost)+' bạc':'Chưa mở')+'</button></div>';
  }).join('');
  return '<section class="panel mini-box nl-a-recruit" data-nla-recruit-panel="1"><h3>🍵 Chiêu Mộ Võ Tướng · Ngọa Long Web</h3>'+
    '<p class="tiny">Không quay tướng ngẫu nhiên. Tướng được mở theo điều kiện cụ thể. 14 tướng cơ sở giữ nguyên; 207 tướng mở rộng theo ải ở bảng phía sau. Ngưỡng và phí ở đây là <b>SIMULATED</b>.</p>'+
    '<div class="nl-a-switch">'+methods.map(m=>'<button class="dark-button '+(nlARecruitFilter===m[0]?'picked':'')+'" data-nla-filter="'+m[0]+'">'+m[1]+'</button>').join('')+'</div>'+
    (nlARecruitFilter==='tavern'?'<p class="tiny">Hội đàm còn '+(NL_A_TALK_DAILY-a.talkUsed)+'/'+NL_A_TALK_DAILY+' lần hôm nay; mở tướng sau khi vượt ải.</p>':'')+
    '<div class="nl-a-hero-list">'+rows+'</div></section>';
}
const nlAPriorHeroes=renderHeroes;
renderHeroes=function(){
  const raw=nlAPriorHeroes();
  const roster=raw.indexOf('<div class="hero-grid">');
  if(roster<0)throw Error('NL-CLASSIC-A: cannot locate authoritative hero roster');
  // Preserve the real roster cards, training and the existing Hero207 registry.
  return head('Danh tướng phò tá','Võ Tướng · Tửu Quán','Chiêu tướng theo phó bản, Uy danh và Hội đàm, không bốc ngẫu nhiên.',
    '<span class="pill">'+game.roster.length+' võ tướng đã sở hữu</span>')+
    nlARecruitPanel()+raw.slice(roster);
};
function nlATaxPanel(){
  const a=nlAState(),remaining=Math.max(0,NL_A_TAX_DAILY-a.taxUsed);
  const silver=100+(game.buildings.palace||1)*125+(game.buildings.market||1)*35;
  return '<section class="panel mini-box nl-a-taxes" data-nla-tax-panel="1"><h3>🏯 Thành Chính · Trưng Thu</h3>'+
    '<p class="tiny">Thu bạc và một ít Uy danh. Giới hạn <b>12 lượt/ngày</b> trên thiết bị; số bạc mỗi lượt dựa vào cấp Thành Chính/Chợ. Tỷ lệ là thiết kế SIMULATED.</p>'+
    '<div class="line"><span>Hôm nay còn '+remaining+'/12 lượt · mỗi lượt +'+fmt(silver)+' Bạc</span>'+
    '<button class="gold-button" data-nla-tax="1" '+(remaining?'':'disabled')+'>Thu thuế</button></div></section>';
}
const nlAPriorCity=renderCity;
renderCity=function(){return nlAPriorCity()+nlATaxPanel();};
const nlAPriorBattle=beginBattle;
beginBattle=function(stage,mode='campaign'){
  const a=nlAState(),active=Boolean(battle);
  if(!active && ['campaign','tower','arena'].includes(mode) && a.orders<1){toast('Đã hết Quân lệnh. Tự hồi 1 lệnh/30 phút.');return;}
  const out=nlAPriorBattle(stage,mode);
  if(!active && battle && !battle.replay && battle.mode===mode && ['campaign','tower','arena'].includes(mode)){
    a.orders--;a.orderReceipts.push({mode,stage,at:Date.now()});a.orderReceipts=a.orderReceipts.slice(-120);
    save();renderResources();
  }
  return out;
};
const nlAPriorFinish=finishBattle;
finishBattle=function(){
  if(!battle||battle.finished||battle.replay)return nlAPriorFinish();
  const stage=battle.stage,mode=battle.mode,first=(mode==='campaign'&&!game.cleared.includes(stage));
  const out=nlAPriorFinish();
  if(battle?.finished && battle.won && first && mode==='campaign'){
    const a=nlAState(),receipt='first-clear:'+stage;
    if(!a.meritReceipts.includes(receipt)){
      const merit=35+stage*9;a.merit+=merit;a.meritReceipts.push(receipt);
      a.meritReceipts=a.meritReceipts.slice(-120);
      log('Lập chiến công lần đầu ải '+stage+': +'+fmt(merit)+' (SIMULATED).');
      const box=document.querySelector('#battle-result .reward');
      if(box)box.insertAdjacentHTML('beforeend','<span>⚔️ +'+fmt(merit)+' Chiến công</span>');
      save();renderResources();
    }
  }
  return out;
};
document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-nla-tax],[data-nla-filter],[data-nla-recruit]');
  if(!btn||btn.disabled)return;
  if(btn.hasAttribute('data-nla-tax'))nlATax();
  else if(btn.hasAttribute('data-nla-filter')){nlARecruitFilter=btn.dataset.nlaFilter;render();}
  else if(btn.hasAttribute('data-nla-recruit'))nlARecruitHero(btn.dataset.nlaRecruit);
});
if(window.__P2_ENABLE_QA__)window.__NL_CLASSIC_A_QA__=Object.freeze({
  version:1,source:'SIMULATED',snapshot:()=>structuredClone(nlAState()),
  rows:()=>NL_A_RECRUIT.map(x=>({...x})),canRecruit:id=>nlARouteReady(NL_A_RECRUIT_BY_ID.get(id)||{}),
  tax:nlATax,recruit:nlARecruitHero,
  resourceLabels:()=>Array.from(document.querySelectorAll('#resources .res span')).map(x=>x.textContent)
});
// === end NL-CLASSIC-A-V1 ===
