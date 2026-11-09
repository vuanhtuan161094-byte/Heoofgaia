/* HG42 — dedicated Boss screens, not another game state or HTML.
 * Read-only views. Navigation stays presentation-only; all dispatch, rewards,
 * auto-hunt and Save v07 remain in the canonical engine and app actions.
 */
(function(root){'use strict';
function render(s,E,ui,{screen='targets',tier=11}={}){
 const {esc,format,button,lootText,hunt,prep}=ui;
 const screens=[['targets','☠ Boss thế giới'],['hunt','🧙 Đội săn & Auto'],['loot','🎁 Thưởng & chiến báo']];
 const targets=E.TILES.filter(t=>t.kind==='npc'&&Number.isInteger(t.eliteTier)&&t.eliteTier>=11)
  .sort((a,b)=>a.eliteTier-b.eliteTier||a.key.localeCompare(b.key));
 // Reading the active city through E.activeCity() synchronizes the root
 // local snapshot and can mutate an older Save just by opening a screen.
 // Boss previews must use the already-stored city key without that side effect.
 const homeKey=s.cities?.find(c=>c.id===s.activeCityId)?.key||s.cities?.find(c=>c.main)?.key||null;
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
 const status=E.hg26Status?.(s);
 const note=status?.enabled?
  '<div class="hg42-boss-running">🔁 Tự săn đang hoạt động · '+esc(status.phase)+' · '+status.runs+'/'+status.maxRuns+' trận</div>':
  '<div class="hg42-boss-running idle">🔁 Tự săn đang tắt · bật thủ công khi đã phân quân</div>';
 const body=screen==='hunt'?
  '<div class="hg42-boss-hunt">'+note+
   '<div class="hg42-boss-hunt-layout">'+hunt()+'</div></div>':
 screen==='loot'?
  '<div class="hg42-boss-reward-screen"><div class="hg42-boss-reward-grid">'+rewards+'</div>'+
   '<section class="hg42-boss-receipts"><h3>📜 Thắng Boss gần đây</h3>'+
   (receipt.length?receipt.map(r=>'<div><b>CS'+r.cs+' · '+esc(r.target)+'</b><small>'+
    esc(Object.entries(r.resources||{}).map(([k,n])=>k+': '+format(n)).join(' · '))+'</small></div>').join(''):
    '<p>Chưa có chiến thắng Boss được ghi vào sổ HG40.9.</p>')+
   button('tab',{tab:'reports'},'⚔ Mở chiến báo đầy đủ',false,'small secondary')+'</section></div>':
  '<div class="hg42-boss-select"><p>Chọn cấp Boss, xem lực lượng thật và thưởng trước khi xuất quân.</p>'+
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
root.HOG_HG42_SCREEN=Object.freeze({render,sections:['targets','hunt','loot'],bossTiers:[11,12,13]});
})(typeof globalThis!=='undefined'?globalThis:this);
