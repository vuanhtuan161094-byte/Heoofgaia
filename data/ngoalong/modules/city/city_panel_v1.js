/* Mưu Định Tam Quốc / Chat 03 city 38-building interaction panel.
 * In-scope handoff component; Chat 08 embeds via canonical generator.
 * This file does NOT write Save, DOM global listeners or runtime bootstraps.
 * All formulas and building operations are original project SIMULATED rules. */
(function(root,create){
  const api=create();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NLCityPanel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const num=n=>Number(n||0).toLocaleString('vi-VN');
  const resources={silver:'Bạc',grain:'Lương',iron:'Sắt',prestige:'Uy danh',
    goods:'Hàng',parts:'Linh kiện',rations:'Quân nhu',tradeNotes:'Tín phiếu',
    orders:'Quân lệnh',engravingStones:'Đá khắc',horseGear:'Dụng cụ ngựa',
    soulShards:'Mảnh võ hồn',ships:'Thuyền',navalSupplies:'Vật tư biển',
    drillManuals:'Binh thư',permits:'Giấy thông hành',heroScrolls:'Thư chiêu mộ',trialTokens:'Thẻ thí luyện'};
  const labels={build:'Xây / nâng cấp',harvest:'Thu hoạch',operate:'Thực hiện',collect:'Nhận thành phẩm',research:'Nghiên cứu'};
  const stylesheet=String.raw`.nlcity{font-family:system-ui,sans-serif;color:#e8e3d7}
.nlcity-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.nlcity-pill{padding:5px 8px;border:1px solid #5f5b54;border-radius:6px}
.nlcity-layout{display:grid;grid-template-columns:minmax(270px,1.6fr) minmax(280px,1fr);gap:14px}
.nlcity-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.nlcity-tile{background:#282b31;border:1px solid #52565c;color:#eee5d9;text-align:left;padding:9px;border-radius:8px;min-height:82px;cursor:pointer}
.nlcity-tile[aria-pressed="true"]{outline:2px solid #c7a76a}
.nlcity-tile:disabled,.nlcity-action:disabled{opacity:.55;cursor:not-allowed}
.nlcity-tile b,.nlcity-tile small{display:block;overflow-wrap:anywhere}
.nlcity-detail{background:#242830;border:1px solid #57595d;border-radius:9px;padding:12px;min-width:0}
.nlcity-operations,.nlcity-tech{display:grid;gap:7px;margin-top:12px}
.nlcity-action{background:#4c3d2f;border:1px solid #ae8957;color:#f8e9cf;border-radius:6px;padding:8px 10px;text-align:left;cursor:pointer}
.nlcity-hint{opacity:.75;font-size:.88em;margin:6px 0;overflow-wrap:anywhere}
.nlcity-section{margin:16px 0 8px}
@media(max-width:760px){.nlcity-layout{grid-template-columns:1fr}.nlcity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  function createPanel(deps){
    if(!deps||!deps.engine||typeof deps.getGame!=='function'||typeof deps.save!=='function')
      throw Error('NL_CITY_PANEL_DEPENDENCIES_REQUIRED');
    const engine=deps.engine,clock=deps.now||Date.now;
    const catalog=deps.catalog,research=deps.research;
    if(!catalog||!Array.isArray(catalog.buildings)||catalog.buildings.length!==31||
       !Array.isArray(catalog.legacy)||catalog.legacy.length!==7)throw Error('NL_CITY_CATALOG_COVERAGE_MISMATCH');
    let selected='nl_city_hall';
    let rootElement=null;
    const allIds=new Set([...catalog.buildings,...catalog.legacy].map(b=>b.id));
    if(allIds.size!==38)throw Error('NL_CITY_DUPLICATE_BUILDING_ID');
    const techIds=new Set(catalog.research.ids);
    function snapshot(){
      return engine.view(deps.getGame(),clock());
    }
    function amount(amounts){
      const parts=Object.entries(amounts||{}).map(([id,qty])=>
        escape(resources[id]||id)+': '+num(qty));
      return parts.length?parts.join(' · '):'Không';
    }
    function token(kind,id,operationId){
      const g=deps.getGame(),seq=(g.nlCity&&g.nlCity.seq)||0;
      return ['city-ui',seq+1,kind,id,operationId||''].join(':');
    }
    function button(kind,id,operationId,label,disabled=false){
      return '<button type="button" class="nlcity-action" data-nl-city-kind="'+escape(kind)+
        '" data-nl-city-id="'+escape(id)+'" data-nl-city-operation="'+escape(operationId||'')+
        '" data-nl-city-action-id="'+escape(token(kind,id,operationId))+
        '"'+(disabled?' disabled':'')+'>'+label+'</button>';
    }
    function tile(b,legacy=false){
      const isSelected=selected===b.id;
      const level=b.level||0;
      return '<button type="button" class="nlcity-tile" aria-pressed="'+isSelected+
        '" data-nl-city-kind="select" data-nl-city-id="'+escape(b.id)+'">'+
        '<b>'+escape(b.name)+'</b><small>Cấp '+num(level)+(b.maxLevel?'/'+num(b.maxLevel):'')+'</small>'+
        '<small>'+escape(legacy?'Công trình hiện có':b.category)+(b.unlocked===false?' · Chưa mở':'')+'</small></button>';
    }
    function detail(dto){
      const b=[...dto.buildings,...dto.legacy].find(x=>x.id===selected)||dto.buildings[0];
      if(!b)return '';
      const legacy=dto.legacy.some(x=>x.id===b.id);
      let html='<section class="nlcity-detail" data-nl-city-detail="'+escape(b.id)+'"><h3>'+
        escape(b.name)+'</h3><p class="nlcity-hint">Cấp '+num(b.level)+
        (b.maxLevel?'/'+num(b.maxLevel):'')+'</p>';
      if(legacy){
        html+='<p class="nlcity-hint">Công trình có sẵn: sử dụng nâng cấp và tính năng bản gốc, không tạo bản sao.</p>';
        html+=button('navigateLegacy',b.id,'','Mở công trình gốc');
      }else{
        if(!b.unlocked)html+='<p class="nlcity-hint">Chưa đủ điều kiện mở khóa (xem Thành Chính / Doanh Trại / Quân Sư Phủ).</p>';
        if(b.level<b.maxLevel){
          html+='<p class="nlcity-hint">Nâng cấp: '+amount(b.nextCost)+' · '+num(b.nextSeconds)+' giây</p>';
          html+=button('build',b.id,'','Xây / nâng cấp',
            !b.unlocked||Boolean(dto.construction));
        }else html+='<p class="nlcity-hint">Đã đạt cấp tối đa.</p>';
        if(b.productionResource){
          html+='<p class="nlcity-hint">Sản xuất '+escape(resources[b.productionResource]||b.productionResource)+
            ': '+num(b.productionPerMinute)+'/phút · Kho '+num(b.stock)+'/'+num(b.capacity)+'</p>';
          html+=button('harvest',b.id,'','Thu hoạch',!(b.stock>0));
        }
      }
      if(dto.construction&&dto.construction.id===b.id){
        html+='<p class="nlcity-hint">Đang nâng cấp, hoàn thành lúc '+num(dto.construction.finishAt)+'</p>';
      }
      if(b.pendingOperation){
        html+='<p class="nlcity-hint">Lệnh đang xử lý: '+escape(b.pendingOperation.operationId)+
          (b.pendingOperation.ready?' · Đã hoàn thành':' · Chờ đến '+num(b.pendingOperation.finishAt))+'</p>';
        html+=button('collect',b.id,b.pendingOperation.operationId,'Nhận thành phẩm',
          !b.pendingOperation.ready);
      }
      if(b.operations&&b.operations.length){
        html+='<h4 class="nlcity-section">Thao tác thực tế</h4><div class="nlcity-operations">';
        for(const a of b.operations){
          html+=button('operate',b.id,a.id,escape(a.label)+' · Phí '+amount(a.cost)+
            ' · Nhận '+amount(a.reward)+(a.durationSeconds?' · '+num(a.durationSeconds)+'s':'')+
            (Number.isFinite(a.dailyLimit)?' · '+num(a.dailyUsed)+'/'+num(a.dailyLimit)+' lượt/ngày':''),
            !b.level||Boolean(b.pendingOperation)||clock()<a.availableAt||
            (Number.isFinite(a.dailyLimit)&&a.dailyUsed>=a.dailyLimit));
        }
        html+='</div>';
      }
      if(b.effects&&b.effects.length){
        html+='<h4 class="nlcity-section">Hiệu ứng</h4><p class="nlcity-hint">'+
          b.effects.map(x=>escape(x.target)+' (+'+num(x.perLevel)+'/cấp)').join(' · ')+
          '</p><p class="nlcity-hint">Hiệu ứng ngoài kinh tế chờ module chuyên trách tiếp nhận.</p>';
      }
      return html+'</section>';
    }
    function researchPanel(dto){
      if(!research||!Array.isArray(research.catalog))return '';
      let html='<h3 class="nlcity-section">Khoa kỹ hiện hành (8 ngành)</h3><div class="nlcity-tech">';
      const game=deps.getGame(),gate=research.progression;
      for(const t of research.catalog){
        if(!techIds.has(t.id))continue;
        const lv=game.technology&&game.technology[t.id]||0,next=lv+1;
        const academy=game.buildings&&game.buildings.academy||0;
        const max=lv>=t.maxLevel,locked=academy<Math.ceil(next/gate.academyLevelsPerTechLevel);
        let cost={};
        if(!max)for(const [key,rule] of Object.entries(gate.cost))
          cost[key]=key==='prestige'&&next===1&&rule.freeFirstLevel?0:
            Math.round(rule.base*Math.pow(next,rule.nextLevelExponent));
        html+=button('research',t.id,'',escape(t.name)+' · cấp '+lv+'/'+t.maxLevel+
          (max?' · Tối đa':' · '+amount(cost)),max||locked);
      }
      return html+'</div>';
    }
    function render(){
      const dto=snapshot();
      if(!allIds.has(selected))selected=dto.buildings[0].id;
      const finance=Object.entries(dto.resources).map(([id,n])=>
        '<span class="nlcity-pill">'+escape(resources[id]||id)+': '+num(n)+'</span>').join('');
      const owned=dto.buildings.map(b=>tile(b)).join('');
      const legacy=dto.legacy.map(b=>tile(b,true)).join('');
      return '<section class="nlcity" data-nl-city-panel="1">'+
        '<div class="nlcity-toolbar">'+finance+'</div>'+
        '<div class="nlcity-layout"><div>'+
        '<h3>Thành trì · '+dto.buildings.length+' công trình mới</h3>'+
        '<div class="nlcity-grid">'+owned+'</div>'+
        '<h3 class="nlcity-section">'+dto.legacy.length+' công trình đang hoạt động</h3>'+
        '<div class="nlcity-grid">'+legacy+'</div></div>'+
        '<div>'+detail(dto)+researchPanel(dto)+'</div></div>'+
        '</section>';
    }
    function handle(input){
      if(!input||typeof input!=='object'||typeof input.kind!=='string')return {ok:false,code:'INVALID_UI_INTENT'};
      if(input.kind==='select'){
        if(!allIds.has(input.id))return {ok:false,code:'UNKNOWN_BUILDING'};
        selected=input.id;
        return {ok:true,selected};
      }
      if(input.kind==='navigateLegacy'){
        if(!catalog.legacy.some(b=>b.id===input.id))return {ok:false,code:'INVALID_LEGACY_BUILDING'};
        if(typeof deps.openLegacy!=='function')return {ok:false,code:'LEGACY_HANDLER_REQUIRED'};
        deps.openLegacy(input.id);
        return {ok:true,kind:'navigateLegacy'};
      }
      if(!['build','harvest','operate','collect','research'].includes(input.kind))
        return {ok:false,code:'UNKNOWN_UI_ACTION'};
      if(input.kind==='research'){
        if(!techIds.has(input.id))return {ok:false,code:'UNKNOWN_RESEARCH'};
      }else if(!allIds.has(input.id))return {ok:false,code:'UNKNOWN_BUILDING'};
      const opKey=input.operationId||'';
      const expected=token(input.kind,input.id,opKey);
      if(input.actionId!==expected) {
        // Already committed click from a prior panel render: duplicate via persisted receipt key.
        const led=deps.getGame().nlCity&&deps.getGame().nlCity.receiptIndex;
        if(led&&led[input.actionId])return Object.assign({duplicate:true},led[input.actionId]);
        return {ok:false,code:'STALE_UI_ACTION_ID'};
      }
      const r=engine.act(deps.getGame(),{
        kind:input.kind,id:input.id,operationId:opKey,
        actionId:input.actionId,now:clock()
      });
      if(r.ok&&!r.duplicate)deps.save();
      if(typeof deps.onResult==='function')deps.onResult(r);
      return r;
    }
    function bind(element){
      if(!element||typeof element.addEventListener!=='function')throw Error('NL_CITY_ROOT_REQUIRED');
      if(rootElement)throw Error('NL_CITY_ALREADY_BOUND');
      rootElement=element;
      rootElement.innerHTML=render();
      const listener=event=>{
        const btn=event.target&&event.target.closest&&event.target.closest('[data-nl-city-kind]');
        if(!btn||btn.disabled||!rootElement.contains(btn))return;
        const result=handle({kind:btn.getAttribute('data-nl-city-kind'),
          id:btn.getAttribute('data-nl-city-id'),
          operationId:btn.getAttribute('data-nl-city-operation')||'',
          actionId:btn.getAttribute('data-nl-city-action-id')||''});
        if(result.ok&&!result.duplicate&&result.kind!=='navigateLegacy')rootElement.innerHTML=render();
      };
      element.addEventListener('click',listener);
      return ()=>{element.removeEventListener('click',listener);rootElement=null;};
    }
    return Object.freeze({render,handle,bind,select:id=>handle({kind:'select',id}),getSelection:()=>selected,
      coverage:Object.freeze({cityBuildings:catalog.buildings.length,legacyBuildings:catalog.legacy.length,
        techs:techIds.size})});
  }
  return Object.freeze({createPanel,stylesheet});
});
