/* === NL-WINDOW-UI-V2: semantic screens, no per-word atomization === */
(()=>{'use strict';
 const view=document.getElementById('view');
 const main=view?.closest('.main');
 if(!view||!main||document.getElementById('nl-screen-toolbar'))return;
 const bar=document.createElement('div');
 bar.id='nl-screen-toolbar';bar.className='nl-screen-toolbar';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','Điều khiển cửa sổ Ngọa Long');
 bar.innerHTML='<strong id="nl-screen-title" class="nl-screen-title">Thành Trì</strong><span id="nl-screen-caption" class="nl-screen-caption">Một màn hình · một cửa sổ · bấm để chuyển mục</span><div class="nl-screen-ctrl"><select id="nl-screen-select" aria-label="Chọn trang trong chức năng"></select><button id="nl-screen-prev" type="button" title="Trang trước">◀</button><span id="nl-screen-count" class="nl-screen-count">1/1</span><button id="nl-screen-next" type="button" title="Trang sau">▶</button></div>';
 main.insertBefore(bar,view);
 const chooser=bar.querySelector('#nl-screen-select');
 const prev=bar.querySelector('#nl-screen-prev');const next=bar.querySelector('#nl-screen-next');
 const count=bar.querySelector('#nl-screen-count');const title=bar.querySelector('#nl-screen-title');
 const hidden='nl-pane-hidden';const pageIndex=Object.create(null);
 let pages=[],activeTab='',busy=false,pending=false,ready=false,requestedCityDetail=false,visibleRoot=null;
 const nav=()=>document.querySelector('.nav.active[data-tab]');
 const currentTab=()=>nav()?.dataset.tab||'city';
 const viewportNarrow=()=>window.innerWidth<=650;
 function children(el){return [...el.children].filter(c=>c.tagName!=='SCRIPT'&&c.tagName!=='STYLE')}
 function semanticLabel(el,alt){return (el.querySelector('h1,h2,h3,.section-label,.section-break')?.textContent||el.textContent||alt).replace(/\s+/g,' ').trim().slice(0,40)||alt}
 function restore(){
   view.querySelectorAll('.'+hidden).forEach(el=>el.classList.remove(hidden));
   view.querySelectorAll('.nl-pane-scaling').forEach(el=>{el.classList.remove('nl-pane-scaling');el.style.transform='';el.style.transformOrigin='';el.style.width=''});
 }
 function pushPage(root,label,choices=[]){pages.push({root,label,choices})}
 function makeChunks(root,holder,items,chunkSize,label){
    for(let i=0;i<items.length;i+=chunkSize){
      const allowed=items.slice(i,i+chunkSize);
      pushPage(root,label+' · '+(Math.floor(i/chunkSize)+1),[{holder,items,allowed}]);
    }
 }
 function addPageForRoot(root,tab){
   const narrow=viewportNarrow();
   if((root.classList.contains('grid-2')||root.classList.contains('formation-wrap'))&&children(root).length>=2){
     const sides=children(root);
     const scene=tab==='campaign'?root.querySelector('.stage-grid'):null;
     const cards=scene&&children(scene);
     if(cards&&cards.length>=10){
       if(narrow){
         for(let i=0;i<cards.length;i+=8)pushPage(root,'Bản đồ · '+(1+Math.floor(i/8)),[
           {holder:root,items:sides,allowed:[sides[0]]},{holder:scene,items:cards,allowed:cards.slice(i,i+8)}]);
         for(let k=1;k<sides.length;k++)pushPage(root,semanticLabel(sides[k],'Địch quân'),[{holder:root,items:sides,allowed:[sides[k]]}]);
       }else{
         for(let i=0;i<cards.length;i+=12)pushPage(root,'Phó bản · '+(1+Math.floor(i/12)),[{holder:scene,items:cards,allowed:cards.slice(i,i+12)}]);
       }
       return;
     }
     if(narrow){
       for(let i=0;i<sides.length;i++)pushPage(root,i===0?(tab==='city'?'Bản đồ thành trì':'Phần chính'):semanticLabel(sides[i],'Quản lý'),[{holder:root,items:sides,allowed:[sides[i]]}]);
       return;
     }
     pushPage(root,tab==='city'?'Bản đồ thành trì':semanticLabel(root,'Chiến thuật'));
     return;
   }
   const listRoot=['hero-grid','feature-grid','shop-grid','world-regions','nlcity-grid','nl-chapter-steps','replay-list','quest-list','log-list','stage-grid'].find(cls=>root.classList.contains(cls));
   if(listRoot){
     const items=children(root);
     const size=narrow?(/grid|list/.test(listRoot)?3:4):Math.max(4,(listRoot==='hero-grid'?6:8));
     if(items.length>size){makeChunks(root,root,items,size,semanticLabel(root,listRoot));return;}
   }
   if(root.classList.contains('world-scene')){
     const list=root.querySelector('.world-regions');const items=list&&children(list);
     if(items&&items.length>(narrow?2:5)){
       makeChunks(root,list,items,narrow?2:5,'Châu quận');return;
     }
   }
   if(root.classList.contains('nl-command')&&narrow){
     const two=root.querySelector('.nl-content');const parts=two&&children(two);
     if(parts&&parts.length>=2){
       for(let i=0;i<parts.length;i++)pushPage(root,i===0?'Trung quân · Mệnh lệnh':'Trận đồ · Tham mưu', [{holder:two,items:parts,allowed:[parts[i]]}]);return;
     }
   }
   // Large dynamic panels: split only at actual direct child cards/sections.
   if(narrow&&root.children.length>8&&root.getBoundingClientRect().height>view.clientHeight*1.2){
     makeChunks(root,root,children(root),4,semanticLabel(root,'Danh mục'));return;
   }
   pushPage(root,semanticLabel(root,'Cửa sổ'));
 }
 function rebuild(){
   if(busy)return;busy=true;
   try{
     restore();
     const tab=currentTab();activeTab=tab;document.getElementById('app')?.setAttribute('data-nl-screen',tab);
     title.textContent=(nav()?.getAttribute('title')||nav()?.textContent||'Thành Trì').replace(/\s+/g,' ').trim();
     bar.querySelector('#nl-screen-caption').textContent=tab==='formation'&&viewportNarrow()?'Trang chọn tướng → chọn võ tướng → quay về trận đồ để đặt ô':'Một màn hình · một cửa sổ · bấm để chuyển mục';
     let roots=children(view);const head=roots.find(el=>el.classList.contains('head'));
     // Make the city scene the actual first screen, not an isolated text fragment.
     if(tab==='city'){
       const cityRoot=view.querySelector('.city-visual')?.closest('.grid-2');
       if(cityRoot&&cityRoot.parentElement===view&&head&&head.nextElementSibling!==cityRoot)view.insertBefore(cityRoot,head.nextElementSibling);
     }
     // B3 troop catalogue must be a real standalone semantic Barracks window,
     // not a descendant stranded inside an older hidden inventory/page root.
     if(tab==='barracks'){
       const troopCatalog=view.querySelector('[data-nlb3-troops]');
       if(troopCatalog&&head&&(troopCatalog.parentElement!==view||head.nextElementSibling!==troopCatalog))
         view.insertBefore(troopCatalog,head.nextElementSibling);
     }
     // Classic WEB 55 troops/ten formations open as the FIRST proper semantic
     // screens while keeping all older project panels available afterward.
     if(tab==='barracks'||tab==='formation'){
       const newPanel=view.querySelector('[data-nlw-b4-panel="'+(tab==='barracks'?'troops':'formations')+'"]');
       if(newPanel&&head&&(newPanel.parentElement!==view||head.nextElementSibling!==newPanel))
         view.insertBefore(newPanel,head.nextElementSibling);
     }
     if(tab==='heroes'){
       const heroRoot=view.querySelector('[data-nla-recruit-panel]')||view.querySelector('.hero-grid');
       if(heroRoot&&heroRoot.parentElement===view&&head&&head.nextElementSibling!==heroRoot)view.insertBefore(heroRoot,head.nextElementSibling);
       // Classic A2 Hero207 recruitment belongs immediately after the
       // main three-route recruit panel, ahead of the long owned-hero grid.
       const secondRecruit=view.querySelector('[data-nl-hero207]');
       if(secondRecruit&&heroRoot&&secondRecruit.parentElement===view&&heroRoot.nextElementSibling!==secondRecruit)
         view.insertBefore(secondRecruit,heroRoot.nextElementSibling);
     }
     roots=children(view);pages=[];
     let pendingLabel=null;
     for(let i=0;i<roots.length;i++){
       const root=roots[i];if(root===head)continue;
       const isLabel=root.classList.contains('section-break')||root.classList.contains('section-label');
       if(isLabel){pendingLabel=root;continue}
       const before=pages.length;addPageForRoot(root,tab);
       if(pendingLabel){for(let k=before;k<pages.length;k++)pages[k].preLabel=pendingLabel;pendingLabel=null;}
     }
     if(pendingLabel)pushPage(pendingLabel,semanticLabel(pendingLabel,'Mục'));
     // City should open on its playable map, not the legacy command-center preface.
     // Reorder only review pages; never modify canonical game markup or Save v5.
     if(tab==='city'){
       const mapPage=pages.findIndex(p=>p.root?.querySelector?.('.city-visual'));
       if(mapPage>0)pages.unshift(...pages.splice(mapPage,1));
       // The first economic action should be available immediately after the map.
       const taxPage=pages.findIndex(p=>p.root?.matches?.('[data-nla-tax-panel]'));
       if(taxPage>1)pages.splice(1,0,...pages.splice(taxPage,1));
     }
     // On mobile the native board and hero picker are the first two windows.
     // B4 presets and C seals remain selectable, but must not displace slot editing.
     if(tab==='formation'&&viewportNarrow()){
       const includesVisible=(p,selector)=>{
         const target=p.root?.matches?.(selector)?p.root:p.root?.querySelector?.(selector);
         return !!target&&!(p.choices||[]).some(pick=>pick.items.some(item=>
           !pick.allowed.includes(item)&&(item===target||item.contains(target))));
       };
       const board=pages.find(p=>includesVisible(p,'.formation-board')&&!includesVisible(p,'.roster-list'));
       const picker=pages.find(p=>includesVisible(p,'.roster-list')&&!includesVisible(p,'.formation-board'));
       if(board&&picker){pages=[board,picker,...pages.filter(p=>p!==board&&p!==picker)];}
     }
     if(pages.length===0)pages=[{root:null,label:'Tổng quan',choices:[]}];
     chooser.replaceChildren(...pages.map((p,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`${i+1} · ${p.label.slice(0,29)}`;return opt}));
     let idx=Math.min(Math.max(0,pageIndex[tab]||0),pages.length-1);
     if(requestedCityDetail&&tab==='city'){
       const hit=pages.findIndex(p=>p.root?.contains(document.querySelector('#detail-building')));
       if(hit>=0)idx=hit;
     }
     requestedCityDetail=false;
     showPage(idx);ready=true;
   }catch(e){restore();console.error('NL screen navigation:',e)}finally{busy=false}
 }
 function showPage(index){
   if(!pages.length)return;
   const idx=Math.max(0,Math.min(pages.length-1,index));const p=pages[idx];pageIndex[activeTab]=idx;
   restore();
   const roots=children(view),head=roots.find(el=>el.classList.contains('head'));
   for(const root of roots)if(root!==head&&root!==p.root&&root!==p.preLabel)root.classList.add(hidden);
   for(const pick of p.choices){for(const item of pick.items)if(!pick.allowed.includes(item))item.classList.add(hidden)}
   count.textContent=`${idx+1}/${pages.length}`;chooser.value=String(idx);prev.disabled=idx===0;next.disabled=idx===pages.length-1;
   // Fit a complete semantic component, never break a battle grid or hide all its cells.
   const budget=Math.max(100,view.clientHeight-(head?head.getBoundingClientRect().height+12:0));
   for(const root of [p.root]){
     if(!root)continue;
     const fullHeight=root.getBoundingClientRect().height;
     if(fullHeight>budget+8){const scale=Math.max(.62,Math.min(1,budget/fullHeight));root.classList.add('nl-pane-scaling');root.style.transform='scale('+scale+')';root.style.width=(100/scale)+'%';}
   }
   view.scrollTop=0;
 }
 function schedule(){if(pending||busy)return;pending=true;requestAnimationFrame(()=>{pending=false;rebuild()})}
 prev.addEventListener('click',()=>showPage((pageIndex[activeTab]||0)-1));
 next.addEventListener('click',()=>showPage((pageIndex[activeTab]||0)+1));
 chooser.addEventListener('change',()=>showPage(Number(chooser.value)));
 window.addEventListener('resize',schedule);
 document.addEventListener('keydown',ev=>{
   if(!ready||ev.defaultPrevented||ev.altKey||ev.ctrlKey||ev.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||''))return;
   if(ev.key==='PageDown'){ev.preventDefault();showPage((pageIndex[activeTab]||0)+1)}
   if(ev.key==='PageUp'){ev.preventDefault();showPage((pageIndex[activeTab]||0)-1)}
 });
 let swipe=null;
 view.addEventListener('touchstart',ev=>{if(ev.touches.length===1)swipe={x:ev.touches[0].clientX,y:ev.touches[0].clientY}},{passive:true});
 view.addEventListener('touchend',ev=>{
   if(!swipe||ev.changedTouches.length!==1)return;
   const dx=ev.changedTouches[0].clientX-swipe.x,dy=ev.changedTouches[0].clientY-swipe.y;
   if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.6)showPage((pageIndex[activeTab]||0)+(dx<0?1:-1));swipe=null;
 },{passive:true});
 const observer=new MutationObserver(m=>{if(!busy&&m.some(x=>x.target===view||x.type==='childList'&&!x.target.closest?.('#nl-screen-toolbar')))schedule()});
 // Original game re-renders entire #view when the selected screen or data changes.
 observer.observe(view,{childList:true});
 document.addEventListener('click',ev=>{
   const tabButton=ev.target.closest?.('.nav[data-tab]');
   if(tabButton&&tabButton.dataset.tab!==activeTab)pageIndex[tabButton.dataset.tab]=0;
   if(ev.target.closest?.('[data-focus-building]'))requestedCityDetail=true;
   if(viewportNarrow()&&ev.target.closest?.('[data-choose-hero]'))pageIndex.formation=0;
   if(!ev.target.closest?.('#nl-screen-toolbar'))schedule();
 },true);
 document.addEventListener('change',ev=>{if(!ev.target.closest?.('#nl-screen-toolbar'))schedule()},true);
 document.addEventListener('input',ev=>{if(ev.target.closest?.('#view'))schedule()},true);
 requestAnimationFrame(rebuild);
})();
/* === END NL-WINDOW-UI-V2 === */
