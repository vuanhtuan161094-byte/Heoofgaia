/* HG42 — dedicated Boss screens, not another game state or HTML.
 * Read-only views. Navigation stays presentation-only; all dispatch, rewards,
 * auto-hunt and Save v07 remain in the canonical engine and app actions.
 */
(function(root){'use strict';
function render(s,E,ui,{screen='targets',tier=11}={}){
 const {esc,format,button,lootText,hunt,prep}=ui;
 const screens=[['targets','☠ Boss thế giới'],['expedition','🧭 Viễn Chinh'],['hunt','🧙 Đội săn & Auto'],['loot','🎁 Thưởng & chiến báo']];
 const targets=E.TILES.filter(t=>t.kind==='npc'&&Number.isInteger(t.eliteTier)&&t.eliteTier>=11)
  .sort((a,b)=>a.eliteTier-b.eliteTier||a.key.localeCompare(b.key));
 // Reading the active city through E.activeCity() synchronizes the root
 // local snapshot and can mutate an older Save just by opening a screen.
 // Boss previews must use the already-stored city key without that side effect.
 const homeKey=s.cities?.find(c=>c.id===s.activeCityId)?.key||s.cities?.find(c=>c.main)?.key||null;
 // HG44-D: read-only dispatch readiness from actual saved personnel and
 // active-city troop stock. Never call E.hg20HeroRole/activeCity here: those
 // may normalize old saves merely by viewing a Boss preview.
 const busyHeroes=new Set([
  s.expedition?.heroId,s.march?.heroId,
  ...(s.parallelMarches||[]).map(x=>x.heroId),
  ...(s.stationedHeroes||[]).map(x=>x.heroId)
 ].filter(x=>x!==null&&x!==undefined));
 const readyHeroes=(s.heroes||[]).filter(h=>h.id!==s.castellan&&!busyHeroes.has(h.id)).length;
 const troopStock=Object.values(s.army||{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
 const dispatchReadiness='<div class="hg44-boss-preparation" data-hg44-boss-preparation="true">'+
  '<span>🛡 <b>'+format(troopStock)+'</b> quân trong thành đang mở</span>'+
  '<span>🧙 <b>'+readyHeroes+'</b> tướng chưa bận</span>'+
  '<span>⚔ Tự săn: tối đa 3 tướng × 2 nhóm quân/tướng</span>'+
  '<small>'+(troopStock<1?'Chưa có quân: mở Quân đội để tuyển và bố trí.':
   readyHeroes<1?'Chưa có tướng rảnh: thu hồi hoặc thay đổi tướng trước khi xuất quân.':
   'Đây là quân trong kho, không phải dự báo thắng Boss. Kiểm tra đội hình và HP thực trước khi xuất chinh.')+
  '</small></div>';
 const selected=targets.filter(t=>t.eliteTier===tier);
 const available=selected.length?selected:targets.filter(t=>t.eliteTier===11);
 const preview=t=>E.hg409Preview('npc',t.key);
 const layout=t=>E.hg410EncounterPreview('npc',t.key);
 const threat=t=>{
  const p=preview(t),a=layout(t);
  return '<span class="hg42-boss-threat">♜ <b>Lv100 · Tím · CS'+p.cs+'/10</b> · '+a.stacks+
   ' stack · HP ×'+p.boost.hp+' · ATK ×'+p.boost.atk+' · DEF ×'+p.boost.def+'</span>';
 };
 const tileCard=t=>{
  const p=preview(t),a=layout(t),
   path=homeKey?E.pathfind(homeKey,t.key):null,reach=!!path,
   time=path?Math.max(0,path.length-1):null;
  return '<article class="hg42-boss-target" data-boss-id="'+esc(t.key)+'">'+
   '<header><div class="hg42-boss-emblem">☠</div><div><strong>'+esc(t.value||t.name||'Ma Vương')+'</strong>'+
   '<small>T'+t.eliteTier+' · tọa độ '+esc(t.key)+' · '+(reach?'Đường đi '+time+' bước':'Chưa tìm được đường đi')+'</small></div>'+
   '<span class="hg42-boss-stage">CS'+p.cs+'</span></header>'+
   threat(t)+
   '<div class="hg42-boss-payout"><b>Thưởng thắng thêm</b><span>'+esc(lootText(p))+'</span></div>'+
   '<p class="hg42-boss-detail">'+a.stacks+' nhóm quân địch thật. Mỗi nhóm tối thiểu '+format(a.minimumPerStack)+
   ' quân trước các điều chỉnh đội hình. Không áp giới hạn chỉ huy của người chơi.</p>'+
   '<div class="hg42-boss-buttons">'+
    button('hg42-boss-locate',{key:t.key},'📍 Xem trên bản đồ',false,'small secondary')+
    button('hg42-boss-dispatch',{key:t.key},'⚔ Chọn đội xuất chinh',!reach||!!s.battle,'small primary')+'</div>'+
   '</article>';
 };
 const receipt=(s.hg409?.rewards||[]).filter(r=>r.kind==='boss').slice(-6).reverse();
 const rewards=targets.filter((t,i,arr)=>arr.findIndex(x=>x.eliteTier===t.eliteTier)===i).map(t=>{
  const p=preview(t);
  const material=Object.entries(p.materials||{}).map(([id,n])=>
   '<div class="hg42-reward-item"><b>'+(E.HG18_MATERIALS[id]?.icon||'🎁')+' '+esc(E.HG18_MATERIALS[id]?.name||id)+'</b><span>×'+format(n)+'</span></div>').join('');
  return '<section class="hg42-reward-tier"><h3>☠ Boss T'+t.eliteTier+' · CS'+p.cs+'</h3>'+
   '<div class="hg42-reward-gold">🪙 +'+format(p.resources.gold)+' vàng</div>'+
   '<p>Gỗ '+format(p.resources.wood)+' · Quặng '+format(p.resources.ore)+
   ' · Lưu huỳnh '+format(p.resources.sulfur)+' · Pha lê '+format(p.resources.crystal)+'</p>'+
   '<div class="hg42-reward-items">'+(material||'<span>Không có thẻ bổ sung</span>')+'</div></section>';
 }).join('');
 const expeditionView=()=>{
  const journey=E.hg50Status(s),replay=journey.replay||E.hg50ReplayStatus(s);
  const repeatLabel=journey.done?'Đã mở tái chiến: vẫn phải xuất quân, mất AP và nhận thưởng gốc đúng một lần.':'Hoàn tất ba Boss theo thứ tự để mở tái chiến.';
  return '<div class="hg42-boss-select hg50-expedition" data-hg50-expedition="true">'+
   '<p><b>🧭 Viễn Chinh 3 chặng</b> · '+journey.completed.length+'/3 đã hoàn thành. Mở khóa bằng chiến thắng Boss thật.</p>'+
   '<div class="hg50-replay-meter" data-hg50-replay="true">'+
    '<span>☀ Ngày (UTC) <b>'+replay.today.length+'/3</b></span>'+
    '<span>📅 Tuần (UTC) <b>'+replay.thisWeek.length+'/3</b></span>'+
    '<span>🏆 Chiến thắng thật <b>'+format(Object.values(replay.total).reduce((a,n)=>a+n,0))+'</b></span>'+
    '<small>'+repeatLabel+' Không cấp vàng, mảnh hay quân lần hai cho chiến tích HG50-C.</small></div>'+
   dispatchReadiness+
   '<div class="hg42-boss-targets">'+journey.stages.map(stage=>{
    const tile=stage.target?E.getTile(stage.target):null;
    const route=tile&&homeKey?E.pathfind(homeKey,tile.key):null;
    const reachable=!!route,repeat=journey.done&&stage.completed;
    const ready=stage.unlocked&&(!stage.completed||repeat);
    const p=tile?preview(tile):null,goldHeadroom=p?Math.max(0,Math.floor(E.limits(s).gold-s.res.gold)):0;
    const goldNow=p?Math.min(p.resources.gold,goldHeadroom):0;
    const ap=tile?E.hg182MarchCost(s,tile.key):null;
    const badge=repeat?'↻ Tái chiến':stage.completed?'✓ Đã thắng':stage.unlocked?'⚔ Đang mở':'🔒 Chưa mở';
    return '<article class="hg42-boss-target" data-hg50-stage="'+stage.stage+'">'+
     '<header><div class="hg42-boss-emblem">🧭</div><div><strong>Chặng '+stage.stage+' · Boss T'+stage.tier+'</strong>'+
     '<small>'+esc(stage.name)+' · '+(tile?'tọa độ '+esc(tile.key):'Không có Boss hợp lệ')+'</small></div>'+
     '<span class="hg42-boss-stage">'+badge+'</span></header>'+
     (tile?threat(tile):'<p>Chưa có Boss trên bản đồ. Không tạo quái thay thế.</p>')+
     '<p class="hg42-boss-detail">'+(repeat?'Tái chiến từ Boss thật, không thưởng nhiệm vụ HG50 lần hai.':
      stage.completed?'Đã ghi nhận chiến thắng chặng này.':ready?
       'Phải sử dụng quân, AP và tổn thất thật.':'Hoàn thành chặng trước để tính tiến độ.')+
      ' Boss thường vẫn có thể săn ở màn Boss thế giới.</p>'+
     (p?'<p class="hg50-real-loot" data-hg50-loot="true">🪙 Thưởng Boss gốc: '+format(p.resources.gold)+
      ' vàng; chỗ trống kho hiện tại nhận tối đa '+format(goldNow)+
      ' vàng từ nguồn này · '+format(ap)+' AP/xuất chinh. Chưa trừ tổn thất hoặc tính các nguồn thưởng khác.</p>':'')+
     '<div class="hg42-boss-buttons">'+
     (tile?button('hg42-boss-locate',{key:tile.key},'📍 Định vị',false,'small secondary'):'')+
     (tile?button('hg42-boss-dispatch',{key:tile.key},repeat?'↻ Tái chiến bằng quân thật':'⚔ Chọn đội đánh Boss',!ready||!reachable||!!s.battle,'small primary'):'')+
     '</div></article>';
   }).join('')+'</div></div>';
 };
 const status=E.hg26Status?.(s);
 const note=status?.enabled?
  '<div class="hg42-boss-running">🔁 Tự săn đang hoạt động · '+esc(status.phase)+' · '+status.runs+'/'+status.maxRuns+' trận</div>':
  '<div class="hg42-boss-running idle">🔁 Tự săn đang tắt · bật thủ công khi đã phân quân</div>';
 const body=screen==='expedition'?expeditionView():screen==='hunt'?
  '<div class="hg42-boss-hunt">'+note+
   '<div class="hg42-boss-hunt-layout">'+hunt()+'</div></div>':
 screen==='loot'?
  '<div class="hg42-boss-reward-screen"><div class="hg42-boss-reward-grid">'+rewards+'</div>'+
   '<section class="hg42-boss-receipts"><h3>📜 Thắng Boss gần đây</h3>'+
   (receipt.length?receipt.map(r=>'<div><b>CS'+r.cs+' · '+esc(r.target)+'</b><small>'+
    esc(Object.entries(r.resources||{}).map(([k,n])=>k+': '+format(n)).join(' · '))+'</small></div>').join(''):
    '<p>Chưa có chiến thắng Boss được ghi vào sổ HG40.9.</p>')+
   button('tab',{tab:'reports'},'⚔ Mở chiến báo đầy đủ',false,'small secondary')+'</section></div>':
  '<div class="hg42-boss-select"><p>Chọn cấp Boss, xem lực lượng thật và thưởng trước khi xuất quân.</p>'+dispatchReadiness+
   '<div class="hg42-boss-tiers">'+[11,12,13].map(x=>button('hg42-boss-tier',{tier:x},
    'T'+x+' · CS'+(x-3),false,x===tier?'small primary':'small secondary')).join('')+'</div>'+
   '<div class="hg42-boss-targets">'+(available.length?available.map(tileCard).join(''):
    '<div class="hg42-boss-empty">Chưa có Boss thuộc cấp này trên bản đồ.</div>')+'</div></div>';
 return '<div class="hg42-boss-page" data-hg42-boss-screen="'+esc(screen)+'"><header class="hg42-boss-page-head">'+
  '<div><span class="eyebrow">HG42 · PHÂN MÀN RIÊNG</span><h1>☠ Săn Boss</h1></div>'+
  '<div class="hg42-boss-summary"><b>'+targets.length+' mục tiêu</b><small>T11–T13 · Boss CS8–CS10</small></div></header>'+
  '<nav class="hg42-boss-subnav" aria-label="Màn quản lý Boss">'+
  screens.map(([id,name])=>button('hg42-boss-screen',{id},name,false,screen===id?'small primary':'small secondary')).join('')+
  '</nav><section class="hg42-boss-content" data-screen-content="'+esc(screen)+'">'+body+'</section></div>';
}
root.HOG_HG42_SCREEN=Object.freeze({render,sections:['targets','expedition','hunt','loot'],bossTiers:[11,12,13]});
})(typeof globalThis!=='undefined'?globalThis:this);
