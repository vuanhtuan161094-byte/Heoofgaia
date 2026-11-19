/* Equipment-panel UI bridge: ready to mount into the canonical Ngoa Long tab
 * by Chat08. No changes to Save, generator or shared runtime in this module.
 * Actual actions require caller-owned, durable receipt IDs.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NLItemEquipmentUI=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SLOTS=[
    ['all','Tất cả'],['weapon','Vũ khí'],['armor','Giáp'],
    ['horse','Ngựa'],['book','Binh thư'],['cloak','Áo choàng'],
    ['shield','Thuẫn'],['artifact','Bảo vật']
  ];
  const STYLES=`
.nli-panel{color:#e9dfc9;background:linear-gradient(155deg,#202f38,#111f29 80%);border:1px solid #957d4d;border-radius:12px;padding:16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 14px 40px #0005}
.nli-panel *{box-sizing:border-box}
.nli-panel .nli-heading{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #91785170;padding-bottom:10px}
.nli-panel h2{color:#f3d28c;font-size:21px;margin:0}
.nli-panel h3{color:#efc77a;font-size:15px;margin:14px 0 8px}
.nli-panel .nli-balance{font-variant-numeric:tabular-nums;color:#d8ccae}
.nli-panel .nli-tabs,.nli-panel .nli-switch,.nli-panel .nli-buttons{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0}
.nli-panel .nli-tabs{overflow-x:auto;flex-wrap:nowrap;padding-bottom:5px}
.nli-panel button{cursor:pointer;border:1px solid #ad8a54;background:#344550;color:#f3e6c9;padding:7px 10px;border-radius:7px;font-size:12px;white-space:nowrap}
.nli-panel button[aria-pressed=true],.nli-panel button:hover{background:#80612f;color:#fff6df}
.nli-panel button:disabled{opacity:.45;cursor:not-allowed}
.nli-panel label{display:block;color:#d5c4a1;margin:10px 0}
.nli-panel input{display:block;width:100%;max-width:410px;background:#101b25;border:1px solid #87754f;border-radius:7px;color:#f1e7ce;padding:9px;margin-top:5px;font-size:14px}
.nli-panel .nli-slots{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
.nli-panel .nli-slot{min-height:94px;padding:8px;background:#2c3c44;border:1px solid #8e7347;border-radius:8px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.nli-panel .nli-slot span{font-size:11px;color:#b8c6c8}
.nli-panel .nli-slot strong{font-size:12px;color:#f4d291;line-height:1.3;overflow-wrap:anywhere}
.nli-panel .nli-slot small{font-size:11px;color:#d5d4c9}
.nli-panel .nli-total,.nli-panel .nli-sets{padding:10px;margin:9px 0;background:#283a44;border-left:3px solid #b79552;border-radius:4px}
.nli-panel .nli-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:12px}
.nli-panel .nli-gear{background:#293a43;border:1px solid #796740;border-radius:9px;padding:11px;min-height:150px}
.nli-panel .nli-gear header{display:flex;align-items:center;justify-content:space-between;gap:8px}
.nli-panel .nli-gear header strong{font-size:14px;color:#f0d08c}
.nli-panel .nli-gear header span{font-size:11px;color:#ccc2ae}
.nli-panel .nli-gear small{color:#aebebf}
.nli-panel .nli-gear p{color:#e6d8b6}
.nli-panel .nli-gear .nli-buttons{margin-bottom:0}
@media(max-width:770px){.nli-panel{padding:11px}.nli-panel .nli-slots{grid-template-columns:repeat(3,minmax(0,1fr))}.nli-panel .nli-list{grid-template-columns:1fr}.nli-panel h2{font-size:19px}}
`;
  const statNames={atk:'Vật công',def:'Vật phòng',int:'Mưu công',
    hp:'Dẫn binh',tdef:'Chiến phòng',mdef:'Mưu phòng',
    weaponAtk:'Vũ khí',horseAtk:'Ngựa'};
  const escape=s=>String(s??'').replace(/[&<>"']/g,
    x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const money=(n)=>Number.isFinite(n)?Math.round(n).toLocaleString('vi-VN'):'0';
  function makeView(pack,api,state,heroId,{tab='all',search='',shop=false}={}){
    if(!state||!state.hero||!state.hero[heroId])throw new Error('HERO_NOT_FOUND');
    const model=pack.equipment.filter(x=>x.integration==='PLAYABLE');
    const map=Object.fromEntries(model.map(x=>[x.id,x]));
    const equipped=state.gear?.[heroId]||{};
    const worn=Object.fromEntries(Object.entries(equipped).filter(([,uid])=>uid!=null).map(([slot,uid])=>[String(uid),slot]));
    const owned=state.items.filter(x=>map[x.base]).map(x=>({...x,definition:map[x.base]}));
    const filter=item=>(tab==='all'||item.definition.slot===tab)&&
      (!search||item.definition.name.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
    const byStat=x=>Object.entries(x).filter(([k,v])=>v>0&&statNames[k])
      .map(([k,v])=>escape(statNames[k])+': +'+money(v)).join(' · ')||'Không có';
    const bonuses=api.bonuses(state,heroId);
    const setActivations=api.sets(state,heroId);
    const slotCards=SLOTS.slice(1).map(([slot,label])=>{
      const uid=equipped[slot]??(slot==='artifact'?equipped.banner:null);
      const item=owned.find(x=>String(x.uid)===String(uid));
      return '<div class="nli-slot" data-slot="'+slot+'"><span>'+escape(label)+'</span>'+
        '<strong>'+escape(item?.definition.name||'Chưa trang bị')+'</strong>'+
        (item?'<small>+'+(item.lv-1)+' · '+escape(item.definition.rarity)+'</small>':'')+'</div>';
    }).join('');
    const bagCards=owned.filter(filter).map(item=>{
      const row=item.definition,uid=String(item.uid),isWorn=Object.prototype.hasOwnProperty.call(worn,uid);
      const need=row.requiredLevel||1,allowed=state.hero[heroId].level>=need;
      return '<article class="nli-gear" data-uid="'+escape(uid)+'">'+
        '<header><strong>'+escape(row.name)+'</strong><span>'+escape(row.rarity)+'</span></header>'+
        '<small>'+escape(SLOTS.find(s=>s[0]===row.slot)?.[1]||row.slot)+
        ' · Cấp yêu cầu '+need+' · Cường hóa +'+(item.lv-1)+
        ' · Tinh luyện '+(item.refineLv||0)+'</small>'+
        '<p>'+byStat(row.stats)+'</p>'+
        '<div class="nli-buttons">'+
        (isWorn?'<button data-nli-action="unequip" data-uid="'+escape(uid)+'" data-slot="'+escape(worn[uid])+'">Tháo</button>':
          '<button data-nli-action="equip" data-uid="'+escape(uid)+'" '+(!allowed?'disabled':'')+'>Trang bị</button>')+
        '<button data-nli-action="reinforce" data-uid="'+escape(uid)+'">Cường hóa</button>'+
        '<button data-nli-action="refine" data-uid="'+escape(uid)+'">Tinh luyện</button></div></article>';
    }).join('');
    const shopCards=model.filter(row=>['SHOP','SHOP_OR_AUTHORIZED_REWARD'].includes(row.acquisitionRule?.kind))
      .filter(row=>(tab==='all'||tab===row.slot)&&
        (!search||row.name.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN'))))
      .map(row=>{
        const cost=row.acquisitionRule.shopCost;
        return '<article class="nli-gear"><header><strong>'+escape(row.name)+'</strong><span>'+
          escape(row.rarity)+'</span></header><small>'+escape(SLOTS.find(s=>s[0]===row.slot)?.[1]||row.slot)+
          ' · Cấp '+row.requiredLevel+'</small><p>'+byStat(row.stats)+'</p>'+
          '<div class="nli-buttons"><span>'+money(cost.silver)+' bạc · '+money(cost.iron)+' sắt</span>'+
          '<button data-nli-action="buy" data-item="'+escape(row.id)+'">Mua</button></div></article>';
      }).join('');
    return '<style data-nli-style="1">'+STYLES+'</style>'+
      '<section class="nli-panel" data-nli-root="1" aria-label="Trang bị">'+
      '<header class="nli-heading"><h2>Trang bị · Kho chiến cụ</h2>'+
      '<div class="nli-balance">Bạc: '+money(state.silver)+' · Sắt: '+money(state.iron)+
      ' · Trang bị: '+owned.length+'</div></header>'+
      '<div class="nli-tabs" role="group" aria-label="Loại trang bị">'+
      SLOTS.map(([key,label])=>'<button data-nli-tab="'+key+'" '+(tab===key?'aria-pressed="true"':'')+'>'+escape(label)+'</button>').join('')+'</div>'+
      '<label>Tìm trang bị <input type="search" data-nli-search="1" value="'+escape(search)+'" placeholder="Nhập tên trang bị"/></label>'+
      '<div class="nli-switch"><button data-nli-shop="0" '+(!shop?'aria-pressed="true"':'')+'>Kho của tôi</button>'+
      '<button data-nli-shop="1" '+(shop?'aria-pressed="true"':'')+'>Tiệm trang bị</button></div>'+
      '<h3>Tướng '+escape(heroId)+' · Cấp '+Number(state.hero[heroId].level||1)+'</h3>'+
      '<div class="nli-slots">'+slotCards+'</div>'+
      '<p class="nli-total"><strong>Chỉ số trang bị:</strong> '+byStat(bonuses)+'</p>'+
      (setActivations.length?'<p class="nli-sets">Bộ kích hoạt: '+
        setActivations.map(x=>escape(pack.equipment.find(row=>row.effectRule?.setId===x.setId)?.sourceGroup||x.setId)+' ('+x.activatedAt+' món)').join(' · ')+'</p>':'')+
      '<div class="nli-list">'+((shop?shopCards:bagCards)||'<p>Không có trang bị phù hợp.</p>')+'</div></section>';
  }
  function mount(host,options){
    if(!host||typeof host.addEventListener!=='function')throw new Error('INVALID_HOST');
    if(!options||typeof options.getState!=='function'||
      typeof options.setState!=='function'||
      typeof options.receiptId!=='function')throw new Error('RECEIPT_STATE_HOST_REQUIRED');
    const {pack,inventory,heroId,getState,setState,receiptId}=options;
    const ui={tab:'all',search:'',shop:false};
    function render(){host.innerHTML=makeView(pack,inventory,getState(),heroId,ui)}
    function handle(e){
      const t=e.target.closest('[data-nli-action], [data-nli-tab], [data-nli-shop]');
      if(!t||!host.contains(t))return;
      if(t.hasAttribute('data-nli-tab')){ui.tab=t.getAttribute('data-nli-tab');render();return}
      if(t.hasAttribute('data-nli-shop')){ui.shop=t.getAttribute('data-nli-shop')==='1';render();return}
      const action=t.getAttribute('data-nli-action');
      const uid=t.getAttribute('data-uid'),id=t.getAttribute('data-item');
      const slot=t.getAttribute('data-slot');
      // A durable unique ID is supplied by the authoritative Save/receipt owner.
      const rid=receiptId(action,{uid,id,slot,heroId});
      if(typeof rid!=='string'||!rid)throw new Error('RECEIPT_REQUIRED');
      const state=getState();
      const result=action==='buy'?inventory.buy(state,id,rid):
        action==='equip'?inventory.equip(state,heroId,uid,rid):
        action==='unequip'?inventory.unequip(state,heroId,slot,rid):
        action==='reinforce'?inventory.reinforce(state,uid,rid):
        action==='refine'?inventory.refine(state,uid,rid):
        {ok:false,code:'UNSUPPORTED_ACTION'};
      if(result.ok&&!result.duplicate){
        setState(result.state, {action,receiptId:rid,detail:result.detail});
        render();
      }else if(typeof options.onMessage==='function'){
        options.onMessage(result.code||'ALREADY_SETTLED',result);
      }
    }
    function search(e){
      if(!e.target.matches('[data-nli-search]'))return;
      const next=e.target.value;
      ui.search=next;
      render();
      const field=host.querySelector('[data-nli-search]');
      if(field){field.focus();field.setSelectionRange(next.length,next.length)}
    }
    host.addEventListener('click',handle);
    host.addEventListener('input',search);
    render();
    return {render,dispose(){host.removeEventListener('click',handle);
      host.removeEventListener('input',search)}};
  }
  return {SLOTS,STYLES,makeView,mount};
});
