/* NL-ART-D-V1 — original deterministic, offline presentation only. */
(()=>{'use strict';
 const NS='http://www.w3.org/2000/svg',cache=new Map();
 const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const palettes=[['#344f67','#8cb9bc'],['#704038','#cf9460'],['#365d4f','#94be91'],['#59506c','#c1a4d7'],['#6b5638','#d5bc79']];
 const svg=(body,w=96,h=96)=>'<svg xmlns="'+NS+'" viewBox="0 0 '+w+' '+h+'">'+body+'</svg>';
 const uri=source=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
 const defs='<defs><radialGradient id="halo"><stop stop-color="#f6df9b" stop-opacity=".3"/><stop offset="1" stop-color="#102126" stop-opacity="0"/></radialGradient><linearGradient id="iron" x2=".9" y2="1"><stop stop-color="#f0e4c2"/><stop offset=".45" stop-color="#60767b"/><stop offset=".7" stop-color="#303f49"/><stop offset="1" stop-color="#b6aa8a"/></linearGradient><linearGradient id="lacquer" x2="0" y2="1"><stop stop-color="#b7805e"/><stop offset="1" stop-color="#452f30"/></linearGradient><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#e7ca86"/><stop offset=".45" stop-color="#89683d"/><stop offset="1" stop-color="#eed69f"/></linearGradient><linearGradient id="dark" x2="0" y2="1"><stop stop-color="#36504c"/><stop offset="1" stop-color="#101e24"/></linearGradient><linearGradient id="skin" x2="1" y2="1"><stop stop-color="#f0c8a3"/><stop offset="1" stop-color="#a66e50"/></linearGradient><linearGradient id="roof" x2="0" y2="1"><stop stop-color="#72949b"/><stop offset="1" stop-color="#243d51"/></linearGradient></defs>';
 const frame='<rect x="2" y="2" width="92" height="92" rx="5" fill="url(#dark)" stroke="#987a49" stroke-width="2"/><path d="M6 17V6h12M78 6h12v12M6 78v12h12M78 90h12V78" fill="none" stroke="#d6b77b" stroke-width="2"/>';
 function faction(h){const n=norm(h?.faction);return /nguy|wei/.test(n)?0:/ngo|wu/.test(n)?1:/thuc|shu/.test(n)?2:/quan|qun/.test(n)?3:4}
 function portrait(id,h={}){
   const seed=hash(id),p=palettes[faction(h)],skin=seed%3,role=norm(h.type||h.role||h.skill),civil=/strateg|muu|van|support|drum/.test(role);
   const face=['M32 32Q29 22 48 20Q67 22 64 32L64 49Q62 61 48 66Q34 61 32 49Z','M30 32Q32 20 48 20Q64 20 66 32L62 53Q56 63 48 64Q40 63 34 53Z','M33 30Q34 20 48 20Q62 20 63 30L66 44Q64 58 48 65Q32 58 30 44Z'][skin];
   const beard=seed%5===0?'M33 50Q38 64 48 72Q58 64 63 50L53 55 48 52 43 55Z':seed%5===1?'M38 54Q48 59 58 54L55 67 48 76 41 67Z':seed%5===2?'M38 50l10 4 10-4-3 6H41Z':'';
   const head=civil?'<path d="M27 34L30 15 41 17 48 6 55 17 66 15 69 34Z" fill="#19262b" stroke="#d8b879"/><path d="M24 34H72" stroke="#d8b879" stroke-width="3"/>':
    ['<path d="M25 37Q26 12 48 11Q70 12 71 37L61 32 48 23 35 32Z" fill="url(#metal)" stroke="#352c20"/><path d="M48 7V28" stroke="#d4b977" stroke-width="4"/>','<path d="M26 34L32 18 48 9 64 18 70 34 60 29 48 34 36 29Z" fill="url(#metal)" stroke="#392e26"/><path d="M41 15L48 2 55 15" fill="'+p[1]+'"/>','<path d="M28 35Q26 13 48 12Q70 13 68 35L57 29 48 36 39 29Z" fill="#323a40" stroke="#dbb97a"/><path d="M25 29H71" stroke="#e3c182" stroke-width="4"/>'][seed%3];
   const trim=seed%2?'M18 91L31 71 48 83 65 71 78 91':'M22 75L48 88 74 75';
   // Distinctive fallback portraits: layered facial shading, clothing weave and
   // helmet/armour detail, never substitute a different named hero painting.
   const armourDetail=civil?'<path d="M22 78l12-7 14 14 14-14 12 7M23 84l11-7M73 84l-11-7" stroke="#e1bc81" fill="none" opacity=".7"/>':
     Array.from({length:4},(_,r)=>Array.from({length:7},(_,c)=>'<path d="M'+(20+c*8+(r%2)*3)+' '+(72+r*5)+'q3 5 6 0" stroke="#e5c88f" stroke-width=".7" fill="none" opacity=".64"/>').join('')).join('');
   const faceDetail='<path d="M34 46Q36 55 43 61M62 46Q60 55 53 61" stroke="#8b5847" stroke-width="1.6" opacity=".65" fill="none"/><path d="M37 45l6 1M53 46l6-1M45 51h5M44 55l4 1 4-1" stroke="#efd5aa" stroke-width=".9" opacity=".82" fill="none"/><circle cx="39.5" cy="41.6" r=".7" fill="#f4dfbc"/><circle cx="56.5" cy="41.6" r=".7" fill="#f4dfbc"/>';
   const ornament='<path d="M8 88h80M10 86l7-5M86 86l-7-5" fill="none" stroke="#c5a36c" stroke-width=".9"/><circle cx="48" cy="17" r="2.3" fill="#f3d18f" stroke="#765238" stroke-width=".7"/>';
   return svg(defs+frame+'<circle cx="48" cy="44" r="33" fill="'+p[0]+'" opacity=".75"/><circle cx="48" cy="38" r="43" fill="url(#halo)"/><path d="M8 91Q11 70 31 62L48 71 65 62Q85 70 88 91Z" fill="'+p[0]+'" stroke="#d2af71"/><path d="M15 78L30 65 41 74 30 88Z M81 78L66 65 55 74 66 88Z" fill="'+(civil?p[1]:'url(#metal)')+'" stroke="#283032"/><path d="'+trim+'" fill="none" stroke="'+p[1]+'" stroke-width="3"/><path d="'+face+'" fill="url(#skin)" stroke="#634334"/><path d="M30 37l-3 8 6 5M66 37l3 8-6 5" fill="#b98363" stroke="#634334"/><path d="M36 39l8 -2M52 37l8 2M47 41l-2 9 5 1M43 56q5 2 10 0" stroke="#49372e" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M37 42h5M54 42h5" stroke="#1d2728" stroke-width="2.3" stroke-linecap="round"/><path d="'+beard+'" fill="#302c2b"/>'+faceDetail+head+armourDetail+ornament+'<path d="M10 86h76" stroke="#d9b573" opacity=".5"/><circle cx="83" cy="12" r="5" fill="'+p[1]+'" stroke="#e5ca89"/><path d="M83 9v6M80 12h6" stroke="#493526"/>');
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

 // D3: original miniature architecture, campaign terrain and inventory illustrations.
 function architecture(id,label){
   const n=hash(id),s=norm(id+' '+label);
   const p=['#456b72','#70584b','#476551','#694d42'][n%4],tile=['#879fa2','#be9c67','#8ba17f','#bf7d5a'][n%4];
   const base='<path d="M5 69L48 48 91 70 49 91Z" fill="#887956" stroke="#d8bd80"/><path d="M5 69v7l44 18v-3L91 77v-7L49 91Z" fill="#493f31"/>';
   function house(x,y,w,h,roof=p){
      return '<g transform="translate('+x+' '+y+')"><path d="M0 '+h+'l'+w/2+' '+w*.24+' '+w/2+' -'+w*.24+'V0L0 0Z" fill="#b89b6c" stroke="#493a2b"/><path d="M'+w/2+' '+h+'v'+w*.24+'L'+w+' '+h+'V0L'+w/2+' '+w*.24+'Z" fill="#7b5b3d"/><path d="M-5 1L'+w/2+' -'+w*.39+' '+(w+5)+' 1 '+w/2+' '+w*.29+'Z" fill="'+roof+'" stroke="#cfbb85" stroke-width="1.4"/><path d="M-1 1L'+w/2+' -'+w*.31+' '+(w+1)+' 1M'+w*.18+' 5L'+w/2+' -'+w*.23+' '+w*.82+' 5" fill="none" stroke="'+tile+'" opacity=".8"/><path d="M'+w*.22+' '+h+'V'+h*.55+'h'+w*.13+'V'+(h+w*.06)+'Z" fill="#332c27"/><path d="M'+w*.72+' '+h*.7+'v-'+h*.3+'" stroke="#d7b47a" stroke-width="3"/></g>';
   }
   let body='';
   if(/farm|field|mill|ruong|dien|nong|grain/.test(s)){
     body='<path d="M9 63L43 45 75 61 43 79Z" fill="#8c9255" stroke="#c8ba71"/>'+Array.from({length:6},(_,i)=>'<path d="M'+(13+i*5)+' '+(62-i*2.6)+'l32 16" stroke="#d3b965" stroke-width="2"/>').join('')+house(54,38,27,17);
   }else if(/mine|silver|mo bac/.test(s)){
     body='<path d="M15 69L26 34 41 40 58 22 82 68 49 85Z" fill="#64716a" stroke="#a7a68a"/><path d="M41 68v-14q8-14 18 0v19l-10 5Z" fill="#222b2c" stroke="#ba9e69" stroke-width="3"/><path d="M22 72l13-5 12 6-13 7Z" fill="#c5c9ba"/>'+house(60,49,24,15);
   }else if(/tower|thap/.test(s)){
     body=house(29,51,38,17)+house(32,39,32,16)+house(36,26,24,14)+house(40,15,16,12);
   }else if(/barrack|drill|military|stable|binh|quan|train/.test(s)){
     body=house(9,46,32,20)+house(52,42,34,20)+'<path d="M42 70V26M42 28h22l-7 8 7 8H42" fill="#9a493e" stroke="#e4bf7b"/><path d="M29 77l17-8 17 8-17 8Z" fill="#bb9f70"/>';
   }else if(/palace|hall|thanh chinh|residence/.test(s)){
     body=house(10,47,27,18)+house(58,43,27,18)+house(24,38,48,30)+house(32,21,32,18,'#9a5845');
   }else if(/warehouse|granary|kho|treasury/.test(s)){
     body=house(15,43,38,25)+house(51,50,30,17)+'<path d="M39 74l10-6 12 7-11 7Z M55 80l8-5 8 4-9 6Z" fill="#d4a36c" stroke="#755331"/>';
   }else if(/shop|market|merchant|cho|workshop|forge/.test(s)){
     body=house(25,37,46,29)+'<path d="M9 60l20-13 17 8-20 13Z" fill="#ad674e" stroke="#e0bc81"/><path d="M13 60v15M42 56v16" stroke="#bd9a68" stroke-width="2"/><path d="M59 78l14-7 8 4-14 7Z" fill="#caa16f"/>';
   }else{
     body=house(19,39,51,27)+house(29,24,31,16)+ '<path d="M11 80l8-7 8 4-8 7Z" fill="'+tile+'"/>';
   }
   // Fine paving, roof highlights and ornamentation at the actual icon scale.
   const paving=Array.from({length:5},(_,i)=>'<path d="M'+(11+i*8)+' '+(74+i*3.7)+'l'+(26-i*2)+' -13" stroke="#b9a27b" opacity=".55" stroke-width=".65"/>').join('');
   const vegetation='<g fill="#62745a" stroke="#aab18a" stroke-width=".6"><circle cx="12" cy="60" r="5"/><circle cx="15" cy="55" r="4"/><circle cx="84" cy="61" r="6"/><circle cx="80" cy="56" r="4"/></g><path d="M13 61v7M83 62v8" stroke="#60492f" stroke-width="1.4"/>';
   return svg(defs+frame+'<circle cx="48" cy="42" r="44" fill="url(#halo)"/>'+base+paving+vegetation+body+'<path d="M7 70l42 20 41-20" fill="none" stroke="#e1c794" stroke-width=".7"/>');
 }
 function landscape(id){
   const n=hash(id),p=[['#577868','#b6b886','#667f9a'],['#77764e','#c0ad74','#627b79'],['#65747b','#aeb5b4','#586b83'],['#8e7757','#d3b580','#668a86']][n%4];
   let b='<rect x="4" y="4" width="152" height="88" rx="4" fill="'+p[0]+'"/><path d="M4 36Q35 10 60 33T116 22L156 41V4H4Z" fill="'+p[1]+'" opacity=".48"/>';
   for(let i=0;i<7;i++){let x=9+(n+i*41)%139,y=18+(n>>>i)%27;b+='<path d="M'+(x-15)+' '+(y+18)+'l15 -25 18 25Z" fill="#334f49" stroke="'+p[1]+'" stroke-width=".8"/><path d="M'+x+' '+(y-7)+'l-6 10 8-4 6 6Z" fill="'+p[1]+'"/>';}
   const river='M-5 '+(57+n%15)+'Q38 40 76 67T165 41';
   b+='<path d="'+river+'" fill="none" stroke="#b4b39a" stroke-width="13"/><path d="'+river+'" fill="none" stroke="'+p[2]+'" stroke-width="9"/><path d="M15 83Q53 69 77 45T139 17" fill="none" stroke="#d0b481" stroke-width="2.8" stroke-dasharray="4 3"/>';
   for(let i=0;i<4;i++){const x=19+(n+i*29)%123,y=51+(n>>>i)%27;b+='<g transform="translate('+x+' '+y+')"><path d="M-7 0h14v9H-7Z" fill="#c4ad82" stroke="#514939"/><path d="M-11 0L0-8 11 0Z" fill="#813f35" stroke="#d7be80"/><path d="M-2 9V4h4v5" fill="#392e27"/></g>'}
   return svg(b+'<rect x="2" y="2" width="156" height="92" rx="5" fill="none" stroke="#d4b477" stroke-width="3"/>',160,96);
 }
 function itemKind(v){const s=norm(v);return /weapon|vu khi|kiem|dao|thuong|cung/.test(s)?'blade':/armor|armour|giap|ao|helmet|mu/.test(s)?'armour':/horse|mount|ngua|ma phu/.test(s)?'horse':/book|sach|binh phap|scroll|bi kip/.test(s)?'book':/cloak|mantle|choang/.test(s)?'cloak':/artifact|banner|co|bao vat|quan an/.test(s)?'banner':/chest|bundle|ruong|tui|hop|goi/.test(s)?'chest':/gem|stone|ore|khoang|da|ngoc|reagent|tinh/.test(s)?'gem':/food|grain|luong|thuc/.test(s)?'grain':/silver|bac|coin|tien/.test(s)?'silver':/gold|vang/.test(s)?'gold':/potion|dan|thuoc|ruou/.test(s)?'potion':'token'}
 const loot={
 blade:'<path d="M23 76L65 20 80 12 75 29 34 84Z" fill="url(#metal)" stroke="#f7e4b3" stroke-width="1.5"/><path d="M30 72l41-50" stroke="#fff5d2" stroke-width="2"/><path d="M15 63l29 23" stroke="#b67d47" stroke-width="7"/><path d="M25 77l-12 12" stroke="#705245" stroke-width="8"/>',
 armour:'<path d="M13 30L30 15 48 25 66 15 83 30 71 50 61 44V83H35V44L25 50Z" fill="url(#metal)" stroke="#d7c089"/><path d="M48 29v52M35 45h26M35 55h26M35 65h26M16 31l16-8M80 31l-16-8" stroke="#544b3d" stroke-width="2.8"/><path d="M38 40l10 7 10-7" stroke="#fbdf98" fill="none"/>',
 horse:'<path d="M18 78Q24 49 35 42L28 26 48 12 62 25 76 36 80 47 67 54 52 48 45 76Z" fill="#a87952" stroke="#e4c18e" stroke-width="2"/><path d="M31 24L23 47 19 76 39 80 43 61 38 42Z" fill="#463931"/><path d="M47 23l10 8M64 37l4 2" stroke="#302820" stroke-width="3"/><path d="M37 45l21 6 8-12" fill="none" stroke="#d6b66f" stroke-width="3"/>',
 book:'<path d="M17 18h53l9 8v57H26l-9-7Z" fill="#7c503b" stroke="#d4b171"/><path d="M26 23h44v53H26Z" fill="#d2bd8d"/><path d="M30 32h33M30 42h33M30 52h27M30 62h33" stroke="#76583d" stroke-width="2"/><path d="M22 22v54" stroke="#c2a16c" stroke-width="3"/>',
 cloak:'<path d="M35 17L48 25 61 17 80 76Q48 92 16 76Z" fill="#8c4744" stroke="#d3b578" stroke-width="2"/><path d="M38 25L28 76M58 25l10 51M48 29v54" stroke="#d4a76d" fill="none"/><path d="M35 17h26l-13 15Z" fill="url(#metal)"/>',
 banner:'<path d="M25 13v73M25 19h53L64 35l14 18H25Z" fill="#974b41" stroke="#e2c58b" stroke-width="3"/><circle cx="48" cy="35" r="9" fill="url(#metal)"/><path d="M48 29v12M42 35h12" stroke="#7b4833" stroke-width="2"/>',
 chest:'<path d="M15 42Q15 24 31 22H65Q81 24 81 42V76H15Z" fill="#81563a" stroke="#d6b478" stroke-width="2"/><path d="M15 45h66M27 26v50M69 26v50" stroke="#c6a05e" stroke-width="5"/><rect x="42" y="41" width="12" height="19" rx="2" fill="url(#metal)" stroke="#e1c58c"/><path d="M48 46v8" stroke="#62452f" stroke-width="2"/>',
 gem:'<path d="M26 25L48 13 70 25 80 47 48 83 16 47Z" fill="#5b9c91" stroke="#d5ede0" stroke-width="2"/><path d="M26 25L48 45 70 25M16 47l32-2 32 2M48 13v32L48 83" fill="none" stroke="#b6d7cc" stroke-width="2"/><path d="M25 47l23 36-9-37Z" fill="#2b5d62"/>',
 potion:'<path d="M39 17h18v20Q77 49 72 69Q48 90 24 69Q19 49 39 37Z" fill="#608d82" stroke="#e0d6ad" stroke-width="2"/><path d="M27 58Q48 68 69 58L66 70Q48 80 30 70Z" fill="#a9cc87"/><path d="M36 16h24v13H36Z" fill="#b0824e" stroke="#e2bb82"/>',
 token:'<circle cx="48" cy="48" r="31" fill="url(#metal)" stroke="#e9cd8f" stroke-width="2"/><circle cx="48" cy="48" r="24" fill="#655640" stroke="#c8a46b"/><path d="M48 27l6 15 16 6-16 6-6 15-6-15-16-6 16-6Z" fill="#e2c17d"/>'
 };
 function lootArt(id,h){const k=itemKind(h?.kind||''),rar=norm(h?.rarity),n=hash(id),p=/legend|than|cam|orange/.test(rar)?'#dcaa57':/epic|tim|purple/.test(rar)?'#b49acc':/rare|lam|blue/.test(rar)?'#80b4d5':['#b5bbad','#8bbb9b','#c6ab74'][n%3];
   return svg(defs+frame+'<rect x="6" y="6" width="84" height="84" rx="4" fill="none" stroke="'+p+'" stroke-width="3"/><circle cx="48" cy="48" r="37" fill="'+p+'" opacity=".15"/>'+(loot[k]||shapes[k]||loot.token)+'<path d="M8 86h80" stroke="'+p+'" stroke-width="2"/>');
 }
 function icon(kind,id=''){return svg(defs+frame+(shapes[kind]||shapes.quests));}
 const heroMap=()=>window.__NL_ART_CATALOG__||{};
 function heroForName(name){const n=norm(name).trim();return Object.entries(heroMap()).find(([id,h])=>norm(h.name).trim()===n);}
 function art(kind,id,h){const key=kind+':'+id;if(!cache.has(key))cache.set(key,uri(kind==='hero'?portrait(id,h):kind==='architecture'?architecture(id,h?.name):kind==='landscape'?landscape(id):kind==='loot'?lootArt(id,h):families.includes(kind)?troop(kind,id):icon(kind,id)));return cache.get(key)}
 function decorate(el,kind,id,h,replace=false){
   if(!el||el.dataset.nlArtD===kind+':'+id)return;
   el.dataset.nlArtD=kind+':'+id;
   let im=el.querySelector(':scope > .nl-art-d-img');
   if(!im){im=document.createElement('img');im.className='nl-art-d-img';im.alt='';im.setAttribute('aria-hidden','true');im.decoding='async';el.prepend(im);}
   im.src=art(kind,id,h);
   im.classList.remove('nl-art-d4-scenic','nl-art-d4-fallback-portrait');
   im.style.objectPosition='';im.style.filter='';
   im.removeAttribute('title');
   if(kind==='landscape'&&window.__NL_ART_D4_UI__?.region){
     // Shared painted panorama, different viewing windows, not exact source maps.
     im.src=window.__NL_ART_D4_UI__.region;im.classList.add('nl-art-d4-scenic');
     const n=hash(id);im.style.objectPosition=(n%101)+'% '+((n>>>9)%101)+'%';
     im.style.filter='saturate('+(0.87+(n%4)*.07)+') brightness('+(0.87+(n%3)*.06)+')';
     im.title='Minh họa địa hình đại diện; không phải bản đồ địa lý gốc';
   }
   if(kind==='hero'){im.classList.add('nl-art-d4-fallback-portrait');im.title='Chân dung minh họa theo vai trò và phe';}
   if(replace)el.classList.add('nl-art-d-replace');
 }
 function buildingKind(s){s=norm(s);return /thap|tower/.test(s)?'tower':/quan|binh|barrack|stable|drill/.test(s)?'barracks':/kho|granary|luong|mill|farm/.test(s)?'grain':/thu[eế]|tax|bac|treasury|ngan|mine/.test(s)?'silver':/hoc|tech|nghien|academy/.test(s)?'tech':'city'}
 function family(s){s=norm(s);return /ky|cavalry/.test(s)?'cavalry':/cung|archer/.test(s)?'archer':/thuong|spear/.test(s)?'spear':/van|muu|strateg|drum|dance/.test(s)?'strategist':'infantry'}
 function heroRow(el,id){const h=heroMap()[id];if(h)decorate(el,'hero',id,h)}
 function apply(){
   document.documentElement.dataset.nlArtD='v4';
   const scene=document.querySelector('#view .city-visual');
   // Reuse existing city painting; only provide an offline fallback if absent.
   if(scene&&window.__NL_ART_D4_UI__?.city&&getComputedStyle(scene).backgroundImage==='none')
     scene.style.backgroundImage='url("'+window.__NL_ART_D4_UI__.city+'")';
   document.querySelectorAll('.nav[data-tab] .ico').forEach(el=>{let k=el.closest('[data-tab]').dataset.tab;decorate(el,k,k,null,true)});
   document.querySelectorAll('#view .building .symbol').forEach(el=>{const b=el.closest('.building'),id=b.dataset.focusBuilding||b.dataset.building||b.querySelector('b')?.textContent||b.textContent;decorate(el,'architecture',id,{name:b.querySelector('b')?.textContent||id},true)});
   document.querySelectorAll('#view .nlcity-tile').forEach(el=>{const id=el.dataset.nlCityId||el.textContent;decorate(el,'architecture',id,{name:el.querySelector('b')?.textContent||id})});
   document.querySelectorAll('#view [data-nl-city-detail] h3').forEach(el=>{const id=el.closest('[data-nl-city-detail]').dataset.nlCityDetail;decorate(el,'architecture',id,{name:el.textContent})});
   document.querySelectorAll('#view .stage[data-stage]').forEach(el=>decorate(el,'landscape','stage-'+el.dataset.stage));
   const map=document.querySelector('#view [data-nlc-map]');if(map){
     const heading=map.closest('[data-nlc-panel]')?.querySelector('h3');
     decorate(heading,'landscape',map.value);
   }
   document.querySelectorAll('#view .nla4-line').forEach(el=>{const b=el.querySelector('[data-nla4-action="move"]');if(b)decorate(el,'landscape',b.dataset.nla4Id)});
   document.querySelectorAll('#view [data-nl-art-item]').forEach(el=>decorate(el,'loot',el.dataset.nlArtItem,{kind:el.dataset.nlArtKind,rarity:el.dataset.nlArtRarity}));
   document.querySelectorAll('#view .nli-slot[data-slot]').forEach(el=>decorate(el,'loot','slot-'+el.dataset.slot,{kind:el.dataset.slot}));
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
     const p=el.querySelector('.portrait');if(!p||p.querySelector('.p4-face,.cl-p4-face,[data-p4-hero]')||p.matches('.p4-face,.cl-p4-face,[data-p4-hero]')||getComputedStyle(p).backgroundImage!=='none')return;
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
 if(window.__P2_ENABLE_QA__)window.__NL_ART_D_QA__={count:()=>Object.keys(heroMap()).length,portrait:id=>art('hero',id,heroMap()[id]),troop:(f,id)=>art(f,id),icons:Object.keys(shapes),apply,architecture:(id,name)=>art('architecture',id,{name}),landscape:id=>art('landscape',id),loot:(id,kind,rarity)=>art('loot',id,{kind,rarity}),mapCount:()=>Object.keys(window.__NL_ART_MAP_CATALOG__||{}).length};
 apply();
})();