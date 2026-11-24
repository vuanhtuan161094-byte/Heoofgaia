/* NL-ART-D-V1 — original deterministic, offline presentation only. */
(()=>{'use strict';
 const NS='http://www.w3.org/2000/svg',cache=new Map();
 const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const palettes=[['#344f67','#8cb9bc'],['#704038','#cf9460'],['#365d4f','#94be91'],['#59506c','#c1a4d7'],['#6b5638','#d5bc79']];
 const svg=(body,w=96,h=96)=>'<svg xmlns="'+NS+'" viewBox="0 0 '+w+' '+h+'">'+body+'</svg>';
 const uri=source=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
 const defs='<defs><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#e7ca86"/><stop offset=".45" stop-color="#89683d"/><stop offset="1" stop-color="#eed69f"/></linearGradient><linearGradient id="dark" x2="0" y2="1"><stop stop-color="#36504c"/><stop offset="1" stop-color="#101e24"/></linearGradient><linearGradient id="skin" x2="1" y2="1"><stop stop-color="#f0c8a3"/><stop offset="1" stop-color="#a66e50"/></linearGradient><linearGradient id="roof" x2="0" y2="1"><stop stop-color="#72949b"/><stop offset="1" stop-color="#243d51"/></linearGradient></defs>';
 const frame='<rect x="2" y="2" width="92" height="92" rx="5" fill="url(#dark)" stroke="#987a49" stroke-width="2"/><path d="M6 17V6h12M78 6h12v12M6 78v12h12M78 90h12V78" fill="none" stroke="#d6b77b" stroke-width="2"/>';
 function faction(h){const n=norm(h?.faction);return /nguy|wei/.test(n)?0:/ngo|wu/.test(n)?1:/thuc|shu/.test(n)?2:/quan|qun/.test(n)?3:4}
 function portrait(id,h={}){
   const seed=hash(id),p=palettes[faction(h)],skin=seed%3,role=norm(h.type||h.role||h.skill),civil=/strateg|muu|van|support|drum/.test(role);
   const face=['M32 32Q29 22 48 20Q67 22 64 32L64 49Q62 61 48 66Q34 61 32 49Z','M30 32Q32 20 48 20Q64 20 66 32L62 53Q56 63 48 64Q40 63 34 53Z','M33 30Q34 20 48 20Q62 20 63 30L66 44Q64 58 48 65Q32 58 30 44Z'][skin];
   const beard=seed%5===0?'M33 50Q38 64 48 72Q58 64 63 50L53 55 48 52 43 55Z':seed%5===1?'M38 54Q48 59 58 54L55 67 48 76 41 67Z':seed%5===2?'M38 50l10 4 10-4-3 6H41Z':'';
   const head=civil?'<path d="M27 34L30 15 41 17 48 6 55 17 66 15 69 34Z" fill="#19262b" stroke="#d8b879"/><path d="M24 34H72" stroke="#d8b879" stroke-width="3"/>':
    ['<path d="M25 37Q26 12 48 11Q70 12 71 37L61 32 48 23 35 32Z" fill="url(#metal)" stroke="#352c20"/><path d="M48 7V28" stroke="#d4b977" stroke-width="4"/>','<path d="M26 34L32 18 48 9 64 18 70 34 60 29 48 34 36 29Z" fill="url(#metal)" stroke="#392e26"/><path d="M41 15L48 2 55 15" fill="'+p[1]+'"/>','<path d="M28 35Q26 13 48 12Q70 13 68 35L57 29 48 36 39 29Z" fill="#323a40" stroke="#dbb97a"/><path d="M25 29H71" stroke="#e3c182" stroke-width="4"/>'][seed%3];
   const trim=seed%2?'M18 91L31 71 48 83 65 71 78 91':'M22 75L48 88 74 75';
   return svg(defs+frame+'<circle cx="48" cy="44" r="33" fill="'+p[0]+'" opacity=".75"/><path d="M8 91Q11 70 31 62L48 71 65 62Q85 70 88 91Z" fill="'+p[0]+'" stroke="#d2af71"/><path d="M15 78L30 65 41 74 30 88Z M81 78L66 65 55 74 66 88Z" fill="'+(civil?p[1]:'url(#metal)')+'" stroke="#283032"/><path d="'+trim+'" fill="none" stroke="'+p[1]+'" stroke-width="3"/><path d="'+face+'" fill="url(#skin)" stroke="#634334"/><path d="M30 37l-3 8 6 5M66 37l3 8-6 5" fill="#b98363" stroke="#634334"/><path d="M36 39l8 -2M52 37l8 2M47 41l-2 9 5 1M43 56q5 2 10 0" stroke="#49372e" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M37 42h5M54 42h5" stroke="#1d2728" stroke-width="2.3" stroke-linecap="round"/><path d="'+beard+'" fill="#302c2b"/>'+head+'<path d="M10 86h76" stroke="#d9b573" opacity=".5"/><circle cx="83" cy="12" r="5" fill="'+p[1]+'" stroke="#e5ca89"/><path d="M83 9v6M80 12h6" stroke="#493526"/>');
 }
 const shapes={
 city:'<path d="M16 72h64v10H16z M25 49h46v23H25z" fill="#b8a17a" stroke="#634e36"/><path d="M11 50l18-11 4-12 15 5 15-5 4 12 18 11-14 5H25Z" fill="url(#roof)" stroke="#b9c6a7"/><path d="M26 33l9-10 13-9 13 9 9 10-22 7Z" fill="url(#roof)" stroke="#c8bc8d"/><path d="M34 56v16M62 56v16" stroke="#733b31" stroke-width="6"/><path d="M44 58h8v14h-8z" fill="#352c28"/>',
 formation:'<g fill="#9b8151" stroke="#d8bf84" stroke-width="1.5">'+Array.from({length:9},(_,i)=>'<rect x="'+(17+i%3*22)+'" y="'+(17+Math.floor(i/3)*22)+'" width="17" height="17" rx="2" opacity="'+([0,2,4,6,8].includes(i)?1:.3)+'"/>').join('')+'</g>',
 campaign:'<path d="M13 25L34 17 60 24 83 15V70L60 80 34 72 13 81Z" fill="#aaa16d" stroke="#e0c58c"/><path d="M34 17v55M60 24v56" stroke="#6d7958" fill="none"/><path d="M20 62L35 45 51 54 70 32" stroke="#4b726d" stroke-width="5" fill="none"/><path d="M48 34l7-13 7 13-7 15z" fill="#964337" stroke="#e4bc76"/>',
 heroes:'<path d="M17 78l50-57 10-5-2 14-50 56zM26 26l50 48-8 8-50-48z" fill="url(#metal)" stroke="#e9d5a2"/><path d="M15 68l15 15M66 65l15 15" stroke="#a94b39" stroke-width="6"/>',
 barracks:'<path d="M17 77L73 19 82 14 80 27 26 84Z" fill="url(#metal)" stroke="#efd29a"/><path d="M22 28Q68 15 72 61Q49 76 22 28Z" fill="none" stroke="#b99553" stroke-width="5"/><path d="M22 28L72 61" stroke="#d9c69a" stroke-width="2"/>',
 tech:'<path d="M16 25q18-7 32 5 14-12 32-5v49q-18-7-32 5-14-12-32-5z" fill="#d2bb8b" stroke="#8d6d43" stroke-width="2"/><path d="M48 30v49M24 38l17 4M24 49l17 4M55 42l17-4M55 53l17-4" stroke="#654c32" stroke-width="2"/>',
 equipment:'<path d="M17 31l19-12 12 11 12-11 19 12-11 19-9-4v35H37V46l-9 4Z" fill="url(#metal)" stroke="#d8c191"/><path d="M48 37v42M38 52h20M39 60h18" stroke="#735f44" stroke-width="3"/>',
 tower:'<path d="M41 15h14v67H41z" fill="#ac986f"/>'+[19,34,49,64].map((y,i)=>'<path d="M'+(34-i*4)+' '+y+'l14-9 14 9 '+(10+i*4)+' 9H'+(24-i*4)+'Z" fill="url(#roof)" stroke="#d2ba80"/>').join(''),
 arena:'<path d="M15 25h66v45H15z" fill="#544a35" stroke="#d6bb79"/><path d="M11 25l37-13 37 13M11 71h74M22 32v32M74 32v32" stroke="#d6bb79" stroke-width="5"/><path d="M34 36l28 28M62 36L34 64" stroke="#e7c77a" stroke-width="5"/>',
 world:'<circle cx="48" cy="48" r="32" fill="#426b66" stroke="#c4b681" stroke-width="2"/><path d="M26 22l17 7 4 12-10 8 7 16-9 12-12-17-4-18ZM56 19l17 11 9 18-13 3-9-10-8-1ZM62 60l18-5-9 20-13 5Z" fill="#9aaf74"/>',
 quests:'<path d="M27 17h40q11 0 11 9t-11 9H38v35q0 12-11 12T16 70V28q0-11 11-11Z" fill="#d7c49a" stroke="#96774b"/><path d="M33 38h26M33 47h26M33 56h21M33 65h16" stroke="#6c5338" stroke-width="2"/>',
 nation:'<path d="M28 15v67M32 19h42L60 34l14 15H32Z" fill="#a74d40" stroke="#d9b579" stroke-width="3"/><circle cx="48" cy="34" r="7" fill="#e2c68c"/>',
 replays:'<circle cx="48" cy="48" r="30" fill="#314b4e" stroke="#c9ae75" stroke-width="3"/><path d="M40 32l23 16-23 16Z" fill="url(#metal)"/><path d="M20 32Q37 10 62 21" fill="none" stroke="#e5c88c" stroke-width="3"/>',
 journal:'<path d="M24 17h48v64H24Z" fill="#76523e" stroke="#c9a76a" stroke-width="2"/><path d="M31 24h35v50H31Z" fill="#c9b383"/><path d="M37 35h23M37 44h23M37 53h23M37 62h14" stroke="#6a4e37" stroke-width="2"/>',
 seal:'<path d="M28 59h40v20H28Z" fill="#9b4236" stroke="#e1c18a"/><path d="M36 58V34q0-18 12-18t12 18v24" fill="url(#metal)" stroke="#e1c18a"/><path d="M33 65h30v8H33Z" fill="#d8b673"/>',
 grain:'<path d="M49 78V19M49 36q-24-1-24-14 19 0 24 14M49 49q24-1 24-14-19 0-24 14M49 62q-24-1-24-14 19 0 24 14" stroke="#e1c36f" stroke-width="5" fill="none" stroke-linecap="round"/>',
 silver:'<path d="M21 54q6-25 27-17 21-8 27 17l-5 14H26Z" fill="#c1cecc" stroke="#eff2df" stroke-width="2"/><path d="M29 51q19 12 38 0" stroke="#697d80" fill="none" stroke-width="3"/>',
 gold:'<path d="M21 54q6-25 27-17 21-8 27 17l-5 14H26Z" fill="url(#metal)" stroke="#f1d58b" stroke-width="2"/><path d="M29 51q19 12 38 0" stroke="#8e632c" fill="none" stroke-width="3"/>'
 };
 const families=['infantry','spear','cavalry','archer','strategist'];
 function troop(f,id){const p=palettes[Math.max(0,families.indexOf(f))],n=hash(id);const weapon=f==='archer'?'<path d="M56 17Q83 31 57 49M56 17l1 32M51 32h23" stroke="#dec38b" stroke-width="3" fill="none"/>':f==='spear'?'<path d="M67 68V14l5 9-5 7" stroke="#dec38b" stroke-width="3" fill="none"/>':f==='strategist'?'<path d="M58 33q19-18 26 5L59 52Z" fill="#e3d5a7" stroke="#8d7954"/>':'<path d="M60 53l20-31 4-3-1 7-19 31Z" fill="url(#metal)"/>';
 const soldier=(x,y,k)=>'<g transform="translate('+x+' '+y+') scale('+k+')"><ellipse cx="22" cy="58" rx="20" ry="6" fill="#0b1418" opacity=".8"/>'+(f==='cavalry'?'<path d="M3 39Q17 28 37 39L47 25 53 28 51 44 43 49 39 61H34V49H15L10 61H5Z" fill="#76503c" stroke="#c4a270"/>':'')+'<path d="M11 29L22 24 33 29 37 49 27 52 22 45 17 52 7 49Z" fill="'+p[0]+'" stroke="#b9a16b"/><circle cx="22" cy="19" r="8" fill="url(#skin)"/><path d="M12 19Q12 7 22 6Q32 7 32 19L22 15Z" fill="url(#metal)" stroke="#352c20"/><path d="M12 33h20M14 40h16" stroke="'+p[1]+'" stroke-width="2"/><path d="M15 51l-2 7M29 51l2 7" stroke="#302a25" stroke-width="4"/></g>';
 return svg(defs+frame+'<path d="M10 75L48 48 86 75 48 88Z" fill="'+p[0]+'" opacity=".4"/>'+soldier(10,27,.78)+soldier(40,27,.78)+soldier(23,39,.9)+weapon+'<path d="M12 12h26v12H12Z" fill="'+p[0]+'" stroke="'+p[1]+'"/>'+Array.from({length:1+n%4},(_,i)=>'<circle cx="'+(16+i*5)+'" cy="18" r="1.6" fill="#e4ca83"/>').join(''));
 }
 function icon(kind,id=''){return svg(defs+frame+(shapes[kind]||shapes.quests));}
 const heroMap=()=>window.__NL_ART_CATALOG__||{};
 function heroForName(name){const n=norm(name).trim();return Object.entries(heroMap()).find(([id,h])=>norm(h.name).trim()===n);}
 function art(kind,id,h){const key=kind+':'+id;if(!cache.has(key))cache.set(key,uri(kind==='hero'?portrait(id,h):families.includes(kind)?troop(kind,id):icon(kind,id)));return cache.get(key)}
 function decorate(el,kind,id,h,replace=false){
   if(!el||el.dataset.nlArtD===kind+':'+id)return;
   el.dataset.nlArtD=kind+':'+id;
   let im=el.querySelector(':scope > .nl-art-d-img');
   if(!im){im=document.createElement('img');im.className='nl-art-d-img';im.alt='';im.setAttribute('aria-hidden','true');im.decoding='async';el.prepend(im);}
   im.src=art(kind,id,h);if(replace)el.classList.add('nl-art-d-replace');
 }
 function buildingKind(s){s=norm(s);return /thap|tower/.test(s)?'tower':/quan|binh|barrack|stable|drill/.test(s)?'barracks':/kho|granary|luong|mill|farm/.test(s)?'grain':/thu[eế]|tax|bac|treasury|ngan|mine/.test(s)?'silver':/hoc|tech|nghien|academy/.test(s)?'tech':'city'}
 function family(s){s=norm(s);return /ky|cavalry/.test(s)?'cavalry':/cung|archer/.test(s)?'archer':/thuong|spear/.test(s)?'spear':/van|muu|strateg|drum|dance/.test(s)?'strategist':'infantry'}
 function heroRow(el,id){const h=heroMap()[id];if(h)decorate(el,'hero',id,h)}
 function apply(){
   document.documentElement.dataset.nlArtD='v1';
   document.querySelectorAll('.nav[data-tab] .ico').forEach(el=>{let k=el.closest('[data-tab]').dataset.tab;decorate(el,k,k,null,true)});
   document.querySelectorAll('#view .building .symbol').forEach(el=>{let b=el.closest('.building'),k=buildingKind(b.dataset.focusBuilding||b.textContent);decorate(el,k,k,null,true)});
   document.querySelectorAll('#view .nlcity-tile').forEach(el=>{let k=buildingKind(el.textContent);decorate(el,k,k)});
   document.querySelectorAll('#view [data-nla-hero]').forEach(el=>heroRow(el,el.dataset.nlaHero));
   document.querySelectorAll('#view .nlc-row').forEach(el=>{const b=el.querySelector('[data-nlc-action]');if(!b)return;const a=b.dataset.nlcAction,id=b.dataset.nlcId;
     if(a==='recruit')heroRow(el,id);
     else if(a==='tier4')decorate(el,family(el.textContent),id);
     else if(a.includes('seal'))decorate(el,'seal',id);
     else if(a==='npc')decorate(el,'campaign',id);
     else if(a==='tower')decorate(el,'tower',id);
   });
   document.querySelectorAll('#view .nl-a2-hero-row').forEach(el=>{const text=el.querySelector('span')?.textContent||'';const found=Object.entries(heroMap()).find(([id,h])=>norm(text).endsWith(norm(h.name)));if(found)heroRow(el,found[0])});
   document.querySelectorAll('#view .hero-card').forEach(el=>{
     const p=el.querySelector('.portrait');if(!p||p.querySelector('.p4-face,[data-p4-hero]')||p.matches('.p4-face,[data-p4-hero]')||getComputedStyle(p).backgroundImage!=='none')return;
     const found=heroForName(el.querySelector('.hero-name')?.textContent);if(found)decorate(p,'hero',found[0],found[1],true);
   });
   document.querySelectorAll('#view .nlw-unit').forEach(el=>{const crest=el.querySelector('.nlw-crest');if(!crest)return;const f=families.find(x=>crest.classList.contains('nlw-family-'+x));if(f){decorate(crest,f,el.dataset.nlwUnit,null,true);crest.classList.add('nl-art-d-crest')}});
   const sel=document.querySelector('#view [data-nl207-select]');if(sel&&heroMap()[sel.value]){
     let preview=sel.parentElement.querySelector(':scope > .nl-art-d-preview');
     if(!preview){preview=document.createElement('span');preview.className='nl-art-d-preview';sel.before(preview);}
     decorate(preview,'hero',sel.value,heroMap()[sel.value]);
   }
 }
 let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply()})}
 // Observe native render boundaries, not subtree edits made by this presentation layer.
 for(const el of [document.getElementById('view'),document.getElementById('resources')])if(el)new MutationObserver(schedule).observe(el,{childList:true});
 document.addEventListener('change',schedule,true);document.addEventListener('click',schedule,true);
 if(window.__P2_ENABLE_QA__)window.__NL_ART_D_QA__={count:()=>Object.keys(heroMap()).length,portrait:id=>art('hero',id,heroMap()[id]),troop:(f,id)=>art(f,id),icons:Object.keys(shapes),apply};
 apply();
})();