/* Group04 item warehouse UI. All mutations go through receipt-protected engine. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NLItemConsumablesUI=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>
   ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CATEGORIES=['all','Rương','Vật Liệu','Tài Nguyên','Túi Phúc',
   'Ấn Thạch','Danh Phẩm','Bí Tịch','Truyền Thừa Lệnh','Lệnh','Chìa Khóa','Khác'];
 const STYLE=[
  '.nli-items-panel{padding:14px;margin:12px 0;background:#182a32;color:#e7ddca;border:1px solid #9b7942;border-radius:12px;font:13px/1.5 system-ui,sans-serif}',
  '.nli-items-panel *{box-sizing:border-box}.nli-items-panel h2{margin:0;color:#f0d49c;font-size:19px}',
  '.nli-items-meta{font-size:12px;color:#bac5c3;margin-bottom:8px}',
  '.nli-items-cats,.nli-items-switch,.nli-items-pagination{display:flex;gap:6px;overflow-x:auto;margin:8px 0}',
  '.nli-items-panel button{background:#34444c;border:1px solid #967b51;color:#eedcbc;padding:7px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}',
  '.nli-items-panel button:disabled{opacity:.4;cursor:not-allowed}.nli-items-panel button[aria-pressed=true]{background:#816233}',
  '.nli-items-panel input{width:100%;max-width:430px;padding:9px;border:1px solid #94794e;border-radius:7px;background:#0e1c22;color:#fff}',
  '.nli-items-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px;margin:12px 0}',
  '.nli-items-card{background:#263941;border:1px solid #6e6b58;border-radius:9px;padding:11px;min-width:0}',
  '.nli-items-card b{color:#f4dca7}.nli-items-card small{display:block;color:#a7babd}',
  '.nli-items-card{overflow-wrap:anywhere}.nli-items-meta{overflow-wrap:anywhere}',
  '.nli-items-summary{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:7px 0}',
  '.nli-items-card .nli-items-cost{padding:7px 8px;background:#1c3039;border-radius:5px;color:#e8d5a8}',
  '.nli-items-panel button:focus-visible,.nli-items-panel input:focus-visible{outline:2px solid #ffe0a1;outline-offset:2px}',
  '.nli-items-actions{margin-top:8px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}',
  '@media(max-width:500px){.nli-items-panel{padding:9px}.nli-items-list{grid-template-columns:1fr}}'
 ].join('');
 function view(pack,engine,state,options={}){
   const perPage=25;
   const category=options.category||'all',search=String(options.search||'').toLocaleLowerCase('vi-VN');
   const page=Math.max(0,Math.floor(Number(options.page)||0));
   const stacks=state?.nlItemsV1?.stacks||{};
   const mode=options.mode==='wiki'?'wiki':'bag';
   const rows=pack.items.filter(row=>mode==='wiki'?row.integration==='REFERENCE_ONLY':
     row.integration==='PLAYABLE'&&(stacks[row.id]||0)>0);
   const filtered=rows.filter(row=>(category==='all'||row.sourceCategory===category)&&
     (!search||row.name.toLocaleLowerCase('vi-VN').includes(search)));
   const pages=Math.max(1,Math.ceil(filtered.length/perPage)),current=Math.min(page,pages-1);
   const cards=filtered.slice(current*perPage,(current+1)*perPage).map(row=>{
     const owned=stacks[row.id]||0,rule=row.effectRule||{},needs=rule.needPieces||1;
     const silverCost=rule.silverCost||0;
     const canProcess=owned>=needs&&(state.silver||0)>=silverCost;
     const action=mode==='wiki'||row.integration!=='PLAYABLE'?'':rule.kind==='CRAFT_REAGENT'?
       '<button data-nli-item-action="process" data-nli-item-id="'+esc(row.id)+'" '+(!canProcess?'disabled':'')+'>Gia công ×'+needs+'</button>':
       rule.kind==='REFINEMENT_REAGENT'?'':'<button data-nli-item-action="use" data-nli-item-id="'+esc(row.id)+'">'+
       (rule.kind==='OPEN_BUNDLE'?'Mở rương':'Sử dụng')+'</button>';
     const effect=mode==='wiki'?'Chưa xác minh tác dụng Wiki':
       rule.kind==='OPEN_BUNDLE'?'Mở nhận '+Object.entries(rule.resources||{}).map(([key,value])=>
         esc(key)+' ×'+esc(value)).join(' · ')+(Object.keys(rule.stacks||{}).length?
         ' · '+Object.entries(rule.stacks).map(([key,value])=>esc(key)+' ×'+esc(value)).join(' · '):'') :
       rule.kind==='GRANT_RESOURCE'?'Nhận '+esc(rule.resource)+' ×'+esc(rule.amount):
       rule.kind==='TRAIN_HERO_XP'?'EXP tướng +'+esc(rule.amount):
       rule.kind==='CRAFT_REAGENT'?'Cần '+needs+' nguyên liệu và '+esc(silverCost)+' bạc → '+esc(rule.outputQuantity||1)+' tinh khoáng':
       'Nguyên liệu rèn luyện';
     return '<article class="nli-items-card" data-nl-art-item="'+esc(row.id)+'" data-nl-art-kind="'+esc(row.sourceCategory||row.sourceGroup||rule.kind||'token')+'" data-nl-art-rarity="'+esc(row.rarity||'')+'"><b>'+esc(row.name)+'</b><small>'+
       esc(row.sourceCategory||row.sourceGroup||'Vật phẩm')+' · '+
       (mode==='wiki'?'Wiki (chỉ đọc)':'Sở hữu: '+owned)+'</small><p>'+effect+
       '</p>'+(rule.kind==='CRAFT_REAGENT'&&mode!=='wiki'?
       '<div class="nli-items-cost" data-nli-craft-status="'+(canProcess?'ready':'insufficient')+'">'+
       'Có '+owned+'/'+needs+' · Bạc '+esc(state.silver||0)+'/'+esc(silverCost)+
       (canProcess?' · Đủ điều kiện':' · Chưa đủ điều kiện')+'</div>':'')+
       '<div class="nli-items-actions"><small>'+
       (row.displayedLevel==null?'Không ghi cấp':'Cấp hiển thị: '+esc(row.displayedLevel))+
       '</small>'+action+'</div></article>';
   }).join('');
   return '<style data-nli-items-style>'+STYLE+'</style><section class="nli-items-panel" data-nli-items-panel="1">'+
     '<h2>Vật tư · Kho tàng</h2><p class="nli-items-meta">Tên Wiki tham chiếu; tác dụng là thiết kế riêng của Mưu Định Tam Quốc.</p>'+
     '<div class="nli-items-switch"><button data-nli-item-mode="bag" '+(mode==='bag'?'aria-pressed="true"':'')+'>Kho của tôi</button>'+
     '<button data-nli-item-mode="wiki" '+(mode==='wiki'?'aria-pressed="true"':'')+'>Danh mục Wiki (chỉ đọc)</button></div>'+
     '<div class="nli-items-cats">'+CATEGORIES.map(c=>'<button data-nli-item-category="'+esc(c)+'" '+(c===category?'aria-pressed="true"':'')+'>'+esc(c==='all'?'Tất cả':c)+'</button>').join('')+'</div>'+
     '<input data-nli-item-search type="search" aria-label="Tìm vật phẩm" value="'+esc(options.search||'')+'" placeholder="Tìm vật phẩm..."/>'+
     '<div class="nli-items-summary"><span data-nli-items-results="'+filtered.length+'">'+
       filtered.length+' mục phù hợp</span><span>Bạc: '+esc(state.silver||0)+
       ' · Tinh khoáng: '+esc(stacks['mdt-tinh-khoang']||0)+'</span></div>'+
     '<div class="nli-items-list">'+(cards||'<p>Không có vật phẩm phù hợp.</p>')+'</div>'+
     '<div class="nli-items-pagination"><button data-nli-item-page="'+(current-1)+'" '+(current===0?'disabled':'')+'>Trang trước</button><span>Trang '+(current+1)+'/'+pages+' · '+filtered.length+' mục</span><button data-nli-item-page="'+(current+1)+'" '+(current===pages-1?'disabled':'')+'>Trang tiếp</button></div></section>';
 }
 function mount(host,options){
   if(!host||typeof host.addEventListener!=='function'||!options||
     typeof options.getState!=='function'||typeof options.setState!=='function'||
     typeof options.receiptId!=='function')throw Error('ITEM_HOST_REQUIRED');
   const {pack,engine,getState,setState,receiptId}=options;
   const filters={mode:'bag',category:'all',search:'',page:0};
   function render(){host.innerHTML=view(pack,engine,getState(),filters)}
   function click(ev){
     const t=ev.target.closest('[data-nli-item-action],[data-nli-item-mode],[data-nli-item-category],[data-nli-item-page]');
     if(!t||!host.contains(t))return;
     if(t.hasAttribute('data-nli-item-mode')){filters.mode=t.getAttribute('data-nli-item-mode');filters.page=0;render();return}
     if(t.hasAttribute('data-nli-item-category')){filters.category=t.getAttribute('data-nli-item-category');filters.page=0;render();return}
     if(t.hasAttribute('data-nli-item-page')){filters.page=Math.max(0,Number(t.getAttribute('data-nli-item-page'))||0);render();return}
     const action=t.getAttribute('data-nli-item-action'),id=t.getAttribute('data-nli-item-id');
     const heroId=typeof options.getHeroId==='function'?options.getHeroId():null;
     const rid=receiptId(action,{id,heroId});
     if(typeof rid!=='string'||!rid)throw Error('RECEIPT_REQUIRED');
     const result=action==='use'?engine.use(getState(),id,rid,heroId):
       action==='process'?engine.process(getState(),id,rid):
       {ok:false,code:'UNKNOWN_ACTION'};
     if(result.ok&&!result.duplicate){setState(result.state,{receiptId:rid,detail:result.detail});render()}
     else if(options.onMessage)options.onMessage(result.code||'ALREADY_SETTLED',result);
   }
   function input(ev){
     if(!ev.target.matches('[data-nli-item-search]'))return;
     filters.search=ev.target.value;filters.page=0;render();
     const el=host.querySelector('[data-nli-item-search]');
     if(el){el.focus();el.setSelectionRange(filters.search.length,filters.search.length)}
   }
   host.addEventListener('click',click);host.addEventListener('input',input);render();
   return {render,dispose(){host.removeEventListener('click',click);host.removeEventListener('input',input)}};
 }
 return {CATEGORIES,STYLE,view,mount};
});
