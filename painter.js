/* Original canvas scenes and credited replacement sprite renderers. See asset manifests for provenance. */
(function(root){
'use strict';
const TAU=2*Math.PI;const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(x,y,z=0){let n=Math.sin(x*12.9898+y*78.233+z*33.34)*43758.5453;return n-Math.floor(n)}
function poly(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function rounded(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill()}
function line(c,x1,y1,x2,y2,width,color){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function text(c,s,x,y,size=13,color='#f6e8bf',align='center',weight='600'){c.font=`${weight} ${size}px Georgia,serif`;c.textAlign=align;c.fillStyle=color;c.fillText(String(s),x,y)}
function tree(c,x,y,k=1,kind='normal'){
 c.save();c.translate(x,y);c.scale(k,k);
 circle(c,1,6,10,'#091d1890');line(c,0,7,0,-12,4,'#63422f');
 const color=kind==='dark'?'#2c4553':kind==='pine'?'#214d3c':'#316849';
 if(kind==='pine'){for(let i=0;i<3;i++)poly(c,[[-12+i*2,-2-i*10],[0,-30-i*6],[12-i*2,-2-i*10]],i===0?'#204936':i===1?'#33704b':'#427b50');}
 else{circle(c,-6,-14,11,color);circle(c,6,-20,14,kind==='dark'?'#385369':'#3f7d54');circle(c,-7,-27,10,'#4e9763');circle(c,6,-29,7,'#78a16d')}
 c.restore();
}
function rock(c,x,y,k=1){c.save();c.translate(x,y);c.scale(k,k);poly(c,[[-18,4],[-13,-12],[0,-22],[13,-11],[19,5]],'#586c69');poly(c,[[-13,-12],[0,-22],[6,0],[-18,4]],'#899b92');poly(c,[[0,-22],[13,-11],[19,5],[6,0]],'#354e57');c.restore();}
function castle(c,x,y,k=1,race='human',level=1){
 const pal={human:['#b7b4a4','#ded7bc','#5b697c','#e4b664'],elf:['#8ba894','#e3d6a7','#4e8078','#a8d6ae'],orc:['#786c5a','#9e8970','#6a493e','#e6a45e'],undead:['#6b6877','#aaa6b2','#343451','#a16bb1']}[race];
 c.save();c.translate(x,y);c.scale(k,k);c.shadowColor='#0a181baf';c.shadowBlur=10;circle(c,0,9,53,'#15272195');c.shadowBlur=0;
 // walls and gate
 rounded(c,-53,-16,106,58,3,pal[0],'#36404a');for(let i=0;i<8;i++)rounded(c,-51+i*14,-21,10,13,1,pal[1]);
 rounded(c,-12,9,24,34,5,'#263842');line(c,-48,20,-15,20,3,'#6a6d68');line(c,15,20,48,20,3,'#6a6d68');
 for(const pos of [-44,44]){
  rounded(c,pos-13,-43,26,68,2,pal[0]);for(let j=0;j<3;j++)rounded(c,pos-10+j*10,-49,8,12,1,pal[1]);
  poly(c,[[pos-18,-43],[pos,-72],[pos+18,-43]],pal[2]);rounded(c,pos-4,-19,8,15,2,'#243a45');
 }
 rounded(c,-21,-52,42,51,3,pal[1]);poly(c,[[-27,-50],[0,-87],[27,-50]],pal[2]);rounded(c,-5,-35,10,17,3,'#344657');
 line(c,0,-86,0,-106,2,pal[1]);poly(c,[[0,-104],[24,-98],[0,-90]],pal[3]);
 if(level>2){rounded(c,26,-25,17,23,2,pal[1]);poly(c,[[23,-25],[34,-43],[46,-25]],pal[2]);}
 c.restore();
}
function mine(c,x,y,k=1,res='ore'){
 c.save();c.translate(x,y);c.scale(k,k);circle(c,0,6,30,'#18252698');
 if(res==='wood'){for(const v of [[-18,7,.7],[12,9,.9],[0,-6,.7]])tree(c,...v)}
 else if(res==='gold'){rock(c,0,1,1.1);for(const [dx,dy] of [[-11,-3],[8,3],[0,-12]])circle(c,dx,dy,4,'#e6c76a')}
 else if(res==='crystal'){for(const v of [[-10,0,18],[7,-4,23],[17,5,11]]){const [a,b,h]=v;poly(c,[[a-8,b+5],[a-4,b-h],[a+5,b-h-7],[a+11,b+5]],'#5b9eaa','#a6eaf0')}}
 else if(res==='sulfur'){rock(c,0,0);for(const v of [[-12,0],[12,-3],[2,-16]])circle(c,v[0],v[1],5,'#ded36e')}
 else rock(c,0,1,1.1);
 c.restore();
}
function monster(c,x,y,k=1,lv=1){
 c.save();c.translate(x,y);c.scale(k,k);
 circle(c,0,6,20,'#150c1a91');circle(c,0,-10,16,'#543e5a');
 poly(c,[[-10,-23],[-18,-38],[0,-27],[18,-38],[10,-23]],'#33293b');circle(c,-6,-13,3,'#fb9b5b');circle(c,6,-13,3,'#fb9b5b');
 rounded(c,-13,6,26,17,3,'#493d56');line(c,-15,5,-23,17,4,'#897d72');line(c,15,5,23,17,4,'#897d72');
 c.restore();
}
function treasureChest(c,x,y,k=1,cleared=false){
 c.save();c.translate(x,y);c.scale(k,k);circle(c,0,11,28,'#101d1c91');
 rounded(c,-24,-9,48,34,4,cleared?'#655f4d':'#8b572e','#302a22');
 rounded(c,-25,-18,50,16,5,cleared?'#8a805d':'#d2a74e','#473720');
 line(c,-24,2,24,2,4,'#d0a04d');rounded(c,-4,-9,8,17,2,cleared?'#77705a':'#f1d378','#4f4127');
 line(c,-18,-17,-18,18,2,'#68472b');line(c,18,-17,18,18,2,'#68472b');
 c.restore();
}
function worldBuilding(c,x,y,k=1,kind='windmill',visited=false){
 c.save();c.translate(x,y);c.scale(k,k);circle(c,0,8,35,'#0b1715a8');
 const stone='#8d8d7b',edge='#293b3b',gold='#e4c276';
 if(kind==='windmill'){
  rounded(c,-17,-15,34,37,3,'#b9a078',edge);poly(c,[[-21,-14],[0,-31],[21,-14]],'#715b42',edge);rounded(c,-5,2,10,20,2,'#5a4634');
  line(c,0,-22,0,-68,4,'#493a30');line(c,-32,-43,32,-43,4,'#493a30');line(c,-22,-65,22,-21,4,'#493a30');line(c,-22,-21,22,-65,4,'#493a30');circle(c,0,-43,7,gold);
 }else if(kind==='watermill'){
  rounded(c,-21,-20,42,42,3,'#b8a47d',edge);poly(c,[[-24,-20],[0,-37],[24,-20]],'#715b42',edge);rounded(c,-7,2,14,20,2,'#523c32');
  circle(c,28,1,19,'#805f3f');circle(c,28,1,12,'#c6a46e');circle(c,28,1,4,'#684c34');for(let a=0;a<8;a++){const r=a*Math.PI/4;line(c,28,1,28+Math.cos(r)*18,1+Math.sin(r)*18,3,'#d6bb86')}
  for(let i=0;i<3;i++)line(c,-31,25+i*7,22,25+i*7,2,'#69b5bd');
 }else if(kind==='war-academy'){
  rounded(c,-27,-28,54,52,4,'#8a8268',edge);poly(c,[[-32,-28],[0,-49],[32,-28]],'#694c42',edge);
  for(const x0 of [-17,0,17]){rounded(c,x0-4,-20,8,19,3,'#e0c886');line(c,x0-5,-21,x0,-31,2,'#d2c59e');line(c,x0,-31,x0+5,-21,2,'#d2c59e')}
  rounded(c,-7,5,14,19,2,'#3a3c3a');circle(c,0,-39,4,gold);
 }else if(kind==='defense-tower'){
  rounded(c,-20,-40,40,65,3,stone,edge);for(let i=0;i<4;i++)rounded(c,-21+i*12,-47,9,12,1,'#d6cfb2');
  poly(c,[[-25,-40],[0,-69],[25,-40]],'#61717a',edge);rounded(c,-6,-14,12,25,4,'#384446');line(c,0,-69,0,-79,2,gold);
 }else if(kind==='enlightenment-book'){
  poly(c,[[-30,-23],[-2,-31],[-2,15],[-30,23]],'#78999a',gold);poly(c,[[-2,-31],[30,-23],[30,23],[-2,15]],'#b59d6a',gold);
  line(c,-21,-12,-8,-16,2,'#efe1bd');line(c,-21,-3,-8,-7,2,'#efe1bd');line(c,7,-15,22,-11,2,'#f5e6c4');line(c,7,-6,22,-2,2,'#f5e6c4');circle(c,0,-39,6,'#a5e8e2');
 }else if(kind==='prayer-temple'){
  rounded(c,-30,-21,60,47,'#bcb69d',edge);poly(c,[[-36,-21],[0,-50],[36,-21]],'#827454',gold);
  for(const x0 of [-20,-7,7,20])rounded(c,x0-3,-14,6,31,2,'#eee1bd');rounded(c,-8,5,16,21,4,'#465257');
  line(c,0,-50,0,-66,3,gold);circle(c,0,-67,5,'#f5e0a4');
 }
 if(visited){circle(c,25,-31,10,'#2c6b53');text(c,'✓',25,-27,12,'#f2e2af')}
 c.restore();
}
const M={centerX:9.5,centerY:7.4,zoom:1.12};
function mapCamera(){return M}
function mapProjection(canvas){const scale=clamp(M.zoom,.65,2.05)*48;return {scale,offX:canvas.width/2-M.centerX*scale,offY:canvas.height/2-M.centerY*scale}}
function miniBounds(canvas){return {x:canvas.width-220,y:canvas.height-178,w:203,h:146};}
function drawMiniMap(c,canvas,E,s,selected){const m=miniBounds(canvas),pad=9,tw=(m.w-2*pad)/E.WIDTH,th=(m.h-2*pad)/E.HEIGHT;
 rounded(c,m.x-2,m.y-23,m.w+4,m.h+25,7,'#12272cdb','#c5a66c');text(c,'BẢN ĐỒ THU NHỎ',m.x+6,m.y-7,13,'#e7c78e','left');
 for(const t of E.TILES){let color={plain:'#6d8559',road:'#9e956a',bridge:'#d5c08a',forest:'#28533c',hill:'#6a7262',water:'#408b9c'}[t.terrain]||'#68805b';
  c.fillStyle=color;c.fillRect(m.x+pad+t.x*tw,m.y+pad+t.y*th,tw+.28,th+.28)}
 for(const t of E.TILES){if(t.kind==='empty')continue;
  const owned=E.cityForKey(s,t.key);c.fillStyle=t.kind==='castle'?(owned?(owned.main?'#ffe7ad':'#81d39a'):'#eee0b0'):t.kind==='mine'?'#f2cf55':t.kind==='visit'?'#75d5c5':'#e99987';
  c.fillRect(m.x+pad+(t.x+.2)*tw,m.y+pad+(t.y+.2)*th,Math.max(3,tw*.72),Math.max(3,th*.72))}
 if(selected){const t=E.getTile(selected);if(t){c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(m.x+pad+t.x*tw-1,m.y+pad+t.y*th-1,tw+2,th+2)}}
 const view=mapProjection(canvas);const vw=canvas.width/view.scale,vh=canvas.height/view.scale;
 c.strokeStyle='#f6dfb7';c.lineWidth=1.2;c.strokeRect(m.x+pad+clamp(M.centerX-vw/2,0,E.WIDTH)*tw,m.y+pad+clamp(M.centerY-vh/2,0,E.HEIGHT)*th,Math.min(vw,E.WIDTH)*tw,Math.min(vh,E.HEIGHT)*th);
}
function miniHit(canvas,x,y,E){const m=miniBounds(canvas),pad=9;if(x<m.x+pad||x>=m.x+m.w-pad||y<m.y+pad||y>=m.y+m.h-pad)return null;
 const tx=Math.floor((x-m.x-pad)/(m.w-2*pad)*E.WIDTH),ty=Math.floor((y-m.y-pad)/(m.h-2*pad)*E.HEIGHT);
 return E.getTile(`${tx},${ty}`)||null;
}
function drawWorld(canvas,E,s,selected){if(!canvas)return;const c=canvas.getContext('2d');const w=canvas.width,h=canvas.height;
 const grd=c.createLinearGradient(0,0,w,h);grd.addColorStop(0,'#213f35');grd.addColorStop(.5,'#446a50');grd.addColorStop(1,'#304338');c.fillStyle=grd;c.fillRect(0,0,w,h);
 const {scale:q,offX:ox,offY:oy}=mapProjection(canvas);
 const inside=(x,y)=>x+q>=-30&&x<w+30&&y+q>=-30&&y<h+30;
 c.save();c.translate(ox,oy);
 // Continuous, curving river: one painted waterway instead of hard square map tiles.
 const riverX=y=>(49+3*Math.sin(y*.07)+.5)*q;
 c.lineJoin='round';c.lineCap='round';c.beginPath();
 for(let y=-1;y<=E.HEIGHT+1;y+=.18){let xx=riverX(y),yy=(y+.5)*q;if(y===-1)c.moveTo(xx,yy);else c.lineTo(xx,yy)}
 c.strokeStyle='#234c61';c.lineWidth=q*1.24;c.stroke();c.strokeStyle='#36818b';c.lineWidth=q*1.03;c.stroke();c.strokeStyle='#70afb15c';c.lineWidth=q*.45;c.stroke();
 for(const t of E.TILES){const x=t.x*q,y=t.y*q;if(!inside(x+ox,y+oy))continue;
  let colors={forest:['#29543c','#385e3e'],hill:['#566c57','#687760'],water:['#327588','#2d8c92'],bridge:['#8c8b69','#a59d70'],road:['#537050','#657b58'],plain:['#476b4b','#4d754f']}[t.terrain];
  if(t.terrain!=='plain'&&t.terrain!=='road'&&t.terrain!=='water'&&t.terrain!=='bridge'){const g=c.createRadialGradient(x+q*.5,y+q*.5,q*.08,x+q*.5,y+q*.5,q*1.12);g.addColorStop(0,colors[0]);g.addColorStop(.52,colors[1]);g.addColorStop(1,'#4e715000');c.fillStyle=g;c.fillRect(x-q*.62,y-q*.62,q*2.24,q*2.24);}
  const r=random(t.x,t.y,3);if(t.terrain==='water'){
   for(let i=0;i<3;i++)line(c,x+q*(.15+i*.22),y+q*(.15+random(t.x+i,t.y)*.58),x+q*(.36+i*.2),y+q*(.14+random(t.x+i,t.y)*.58),1.4,'#a1ddc63d');
  }else if(t.terrain==='bridge'){c.fillStyle='#b8a67a';c.fillRect(x+3,y+q*.22,q-6,q*.57);for(let d=0;d<5;d++)line(c,x+5+d*(q-10)/4,y+q*.22,x+5+d*(q-10)/4,y+q*.79,1.4,'#685a41')}
  else if(t.terrain==='forest')for(let j=0;j<4;j++)tree(c,x+q*(.12+random(t.x+j,t.y)*.72),y+q*(.2+random(t.x,t.y+j)*.67),q/70*(.62+random(j,t.y)*.25),r>.58?'pine':'normal');
  else if(t.terrain==='hill'){rock(c,x+q*.46,y+q*.65,q/65);if(r>.5)rock(c,x+q*.72,y+q*.41,q/95)}
  else {if(r>.72)tree(c,x+q*.68,y+q*.63,q/94);for(let j=0;j<6;j++)circle(c,x+q*random(t.x,j,t.y),y+q*random(j,t.y,t.x),1,'#8da96a8a')}
 }
 // original road network leads from the capital to landmark targets
 c.save();c.strokeStyle='#aa926372';c.lineWidth=q*.13;c.lineCap='round';c.lineJoin='round';c.beginPath();[[3.5,4.5],[5.4,4.7],[7.6,4.4],[10.4,5.7],[14.3,7.1],[17.8,7.5],[20.1,8.6],[23.8,11]].forEach(([x,y],i)=>i?c.lineTo(x*q,y*q):c.moveTo(x*q,y*q));c.stroke();c.restore();
 for(const t of E.TILES){if(t.kind==='empty')continue;const x=(t.x+.5)*q,y=(t.y+.54)*q;if(!inside(x+ox,y+oy))continue;
  let done=s.mines.some(m=>m.key===t.key)||(t.kind==='treasure'?s.treasureCleared?.includes(t.key):s.cleared.includes(t.key));
  if(t.kind==='castle'){const owned=E.cityForKey(s,t.key);castle(c,x,y,q/145,owned?.race||t.race||s.race,owned?.local.buildings.hall||1)}
  if(t.kind==='mine')mine(c,x,y,q/95,t.value);
  if(t.kind==='npc'&&!done)monster(c,x,y,q/97,t.level);
  if(t.kind==='treasure')treasureChest(c,x,y,q/96,!!done);
  if(t.treasureCamp&&t.kind!=='treasure')treasureChest(c,x+q*.27,y+q*.19,q/220,!!s.treasureCleared?.includes(t.key));
  if(t.kind==='visit'){worldBuilding(c,x,y,q/100,t.structureId?.startsWith('watermill')?'watermill':t.structureId==='windmill'?'windmill':t.structureId,!!E.hasVisitedWorldBuilding?.(s,t.key));}
  if(done){c.save();c.globalAlpha=.88;circle(c,x+q*.3,y-q*.23,q*.13,'#d7bd70');c.restore()}
  if(selected===t.key){c.strokeStyle='#f3d7a1';c.lineWidth=3;c.strokeRect(t.x*q+2,t.y*q+2,q-4,q-4);}
  if(q>35){const city=E.cityForKey(s,t.key);text(c,t.kind==='castle'?(city?.name||t.value||'Thành trung lập'):t.kind==='mine'?{wood:'Rừng',ore:'Quặng',gold:'Mỏ vàng',sulfur:'Lưu huỳnh',crystal:'Pha lê'}[t.value]:t.value,x,y+q*.48,Math.max(11,Math.min(14,q*.21)),'#fff0c8');}
 }
 // Garrisoned heroes remain visible at occupied mines; traveling heroes follow their saved route.
 for(const g of (s.stationedHeroes||[])){const t=E.getTile(g.key);if(!t)continue;const x=(t.x+.5)*q,y=(t.y+.44)*q;circle(c,x,y,q*.27,'#263e57');circle(c,x,y,q*.20,'#e3c373');poly(c,[[x-q*.12,y-q*.17],[x,y-q*.38],[x+q*.12,y-q*.17]],'#314f72');text(c,'⚔',x,y-q*.31,15,'#fff0c8');}
 if(s.march){const m=s.march,progress=1-m.remaining/m.total,indices=(m.path||[m.fromKey||'3,4',m.target]);const t=clamp(progress,0,.999)*(indices.length-1),i=Math.floor(t);const a=E.getTile(indices[i]),b=E.getTile(indices[Math.min(i+1,indices.length-1)]);if(a&&b){let x=(a.x+(b.x-a.x)*(t-i)+.5)*q,y=(a.y+(b.y-a.y)*(t-i)+.5)*q;
  circle(c,x,y,q*.3,'#f0cc6388');circle(c,x,y,q*.16,'#eac77d');poly(c,[[x-q*.14,y-q*.2],[x,y-q*.47],[x+q*.14,y-q*.2]],'#344f6e');text(c,'⚔',x,y-q*.38,17,'#f9e0aa');}}
 for(const m of (s.parallelMarches||[])){const indices=m.path||[m.homeKey,m.target],progress=m.phase==='arrived'?1:clamp(1-m.remaining/m.total,0,.999),t=progress*(indices.length-1),i=Math.floor(t),a=E.getTile(indices[i]),b=E.getTile(indices[Math.min(i+1,indices.length-1)]);if(a&&b){const x=(a.x+(b.x-a.x)*(t-i)+.5)*q,y=(a.y+(b.y-a.y)*(t-i)+.5)*q;circle(c,x,y,q*.27,'#236e79dd');circle(c,x,y,q*.16,'#7fd7ce');poly(c,[[x-q*.12,y-q*.17],[x,y-q*.39],[x+q*.12,y-q*.17]],'#284c63');text(c,'⚔',x,y-q*.30,14,'#fff0c8');}}
 c.restore();
 // screen ornaments
 rounded(c,13,13,176,40,8,'#122a2ccf','#9b9160');text(c,'TÂN LỤC ĐỊA • GAIA',27,39,17,'#e7d29b','left');
 rounded(c,w-174,13,161,43,8,'#122a2ccf','#9b9160');text(c,`X ${Math.round(M.centerX)}  ·  Y ${Math.round(M.centerY)}`,w-94,40,16);
 rounded(c,13,h-36,280,25,5,'#172d2ecf');text(c,'Kéo bản đồ • Cuộn để zoom • Chạm mục tiêu',20,h-19,12,'#f0ddbb','left','500');
 drawMiniMap(c,canvas,E,s,selected);
}
function mapHit(canvas,x,y,E){const {scale,offX,offY}=mapProjection(canvas);const tx=Math.floor((x-offX)/scale),ty=Math.floor((y-offY)/scale);return E.getTile(`${tx},${ty}`)||null}
function panMap(dx,dy,width=100,height=100){M.centerX=clamp(M.centerX-dx,0,width-1);M.centerY=clamp(M.centerY-dy,0,height-1)}
function zoomMap(v){M.zoom=clamp(M.zoom*v,.65,2.05)}
const CITY_SITES=[['hall',.51,.40],['barracks',.20,.62],['heroTower',.77,.23],['tavern',.40,.75],['warehouse',.77,.59],['magicTower',.17,.23],['arena',.63,.68],['market',.50,.87],['bazaar',.93,.44],['embassy',.35,.35],['stables',.09,.49],['forge',.92,.74]];
const CITY_SITE_VARIANTS={elf:{market:[.10,.86]},orc:{market:[.14,.83]},undead:{market:[.10,.86]}};
function citySitesFor(race='human'){const overrides=CITY_SITE_VARIANTS[race]||{};return CITY_SITES.map(([key,x,y])=>[key,...(overrides[key]||[x,y])]);}
function drawTower(c,x,y,s,color,accent){c.save();c.translate(x,y);c.scale(s,s);
 rounded(c,-22,-96,44,106,3,color,'#1e2929');for(let i=0;i<4;i++)rounded(c,-21+i*12,-103,9,16,1,accent);
 poly(c,[[-27,-97],[0,-137],[27,-97]],accent);rounded(c,-7,-58,14,22,3,'#233b45');line(c,0,-137,0,-153,3,'#d7d4ad');poly(c,[[0,-152],[23,-144],[0,-138]],'#c29e56');
 c.restore();}
function drawCity(canvas,E,s,highlight){if(!canvas)return;canvas.dataset.race=s.race;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const artwork=typeof document!=='undefined'?document.getElementById('city-art-'+s.race):null;
 if(artwork?.complete&&artwork.naturalWidth){
  c.clearRect(0,0,w,h);c.drawImage(artwork,0,0,w,h);
  if(canvas.id==='intro-canvas')return;
  const shade=c.createLinearGradient(0,0,0,74);shade.addColorStop(0,'#10191bcc');shade.addColorStop(1,'#10191b00');c.fillStyle=shade;c.fillRect(0,0,w,74);
  rounded(c,17,15,265,41,8,'#10252cce','#d4bb7b');text(c,`${E.C.races[s.race].english.toUpperCase()} • ${E.activeCity(s).name.toUpperCase()}`,32,42,17,'#fff0c8','left');
  rounded(c,w-215,15,200,41,8,'#10252cce','#d4bb7b');text(c,`TOWN HALL • LV ${s.buildings.hall}`,w-115,42,14,'#fff0c8');
  for(const [key,px,py] of citySitesFor(s.race)){const x=w*px,y=h*py,level=s.buildings[key]||0,label=`${E.C.buildings[key].name} · Lv.${level}`;
   c.font='700 12px Georgia,serif';const bw=Math.max(86,Math.min(150,c.measureText(label).width+16)),bh=22;
   const ly=clamp(y+(py<.56?31:-31),bh/2+4,h-bh/2-4),lx=clamp(x,bw/2+4,w-bw/2-4);
   if(highlight===key){c.strokeStyle='#ffdf9e';c.lineWidth=3;c.beginPath();c.ellipse(x,y+3,50,18,0,0,TAU);c.stroke()}
   rounded(c,lx-bw/2,ly-bh/2,bw,bh,5,highlight===key?'#73552deF':'#10252cda',highlight===key?'#f3d58e':'#c1aa76');
   circle(c,lx-bw/2+8,ly,3.5,level>0?'#f2cc7d':'#9ca7a1');text(c,label,lx+3,ly+4,11,'#fff0c8');
  }
  if(s.buildingQueue){const q=s.buildingQueue;rounded(c,w-267,64,252,39,5,'#10252cdd','#d2b273');text(c,`${E.C.buildings[q.key].name} Lv.${q.level} • CONSTRUCTION`,w-255,81,11,'#fff0c8','left');rounded(c,w-254,89,224,6,3,'#24383c');rounded(c,w-253,90,Math.max(0,222*(1-q.remaining/q.total)),4,2,'#e1be6f')}
  return;
 }
 const palettes={human:{sky:['#778da0','#b4b0a0'],mount:'#536776',land:'#6a806b',wall:'#abb0a3',edge:'#66727a',roof:'#725d5c',light:'#d6c28f'},elf:{sky:['#60998d','#c3cda9'],mount:'#5b8977',land:'#4e8961',wall:'#a0c4a1',edge:'#4b7864',roof:'#38756b',light:'#e7d99e'},orc:{sky:['#a38a72','#d4b995'],mount:'#7d675f',land:'#7c7152',wall:'#857b64',edge:'#63544b',roof:'#815a43',light:'#d6a56d'},undead:{sky:['#47526c','#8a8495'],mount:'#424357',land:'#4e5960',wall:'#858393',edge:'#45475b',roof:'#444052',light:'#b49dc7'}};
 const p=palettes[s.race],sk=c.createLinearGradient(0,0,0,h);sk.addColorStop(0,p.sky[0]);sk.addColorStop(.63,p.sky[1]);sk.addColorStop(1,p.land);c.fillStyle=sk;c.fillRect(0,0,w,h);
 circle(c,w*.73,h*.21,46,s.race==='undead'?'#c1b6d9b0':'#f7dea0ad');
 for(let d=0;d<3;d++){const pts=[[-30,h*.5+d*50]];for(let i=0;i<=18;i++){const x=i*w/18;pts.push([x,h*(.39+d*.065)-Math.sin(i*.7+d)*27-Math.sin(i*.23)*23]);}pts.push([w+30,h],[0,h]);poly(c,pts,d===0?p.mount:d===1?p.land:'#465c50')}
 // courtyard
 poly(c,[[0,h*.76],[w*.38,h*.62],[w*.63,h*.63],[w,h*.79],[w,h],[0,h]],'#8b876a');
 for(let i=0;i<15;i++){let y=h*.67+i*i*.85;c.save();c.globalAlpha=.12;line(c,0,y,w,y,1.6,'#e8d7b8');c.restore()}
 // fantasy architectural backdrop
 for(let i=0;i<18;i++){const x=i*65+20,y=h*.67+(i%3)*15; if(i%4===0)tree(c,x,y,1.3,s.race==='undead'?'dark':'normal')}
 // walls & major keep
 rounded(c,w*.36,h*.38,w*.27,h*.33,6,p.wall,p.edge);
 for(let j=0;j<12;j++)rounded(c,w*.36+j*w*.023,h*.36,w*.016,h*.05,1,p.wall);
 drawTower(c,w*.39,h*.63,1.2,p.wall,p.roof);
 drawTower(c,w*.61,h*.66,1.28,p.wall,p.roof);
 drawTower(c,w*.49,h*.49,1.8,p.wall,p.roof);
 rounded(c,w*.475,h*.53,w*.045,h*.16,15,'#34404b');
 const sites=citySitesFor(s.race);
 const icons={hall:'♛',barracks:'⚔',heroTower:'✦',tavern:'✧',warehouse:'▣',magicTower:'☽',arena:'⛨',market:'⚖',bazaar:'❖',embassy:'⚑',stables:'♞',forge:'⚒'};
 for(const [key,px,py] of sites){if(key==='hall')continue;const level=s.buildings[key]||0,x=w*px,y=h*py;
  const size=key==='magicTower'||key==='heroTower'?1.02:.55;
  if(key==='magicTower'||key==='heroTower'||key==='embassy')drawTower(c,x,y,size,p.wall,p.roof);
  else{rounded(c,x-30,y-57,60,55,5,p.wall,p.edge);poly(c,[[x-35,y-55],[x,y-80],[x+35,y-55]],p.roof);rounded(c,x-10,y-39,20,22,2,'#314347');}
  if(level>0)circle(c,x+21,y-71,8,p.light);
  if(highlight===key){circle(c,x,y-42,42,'#e2ce7c47');c.strokeStyle='#ffdf9e';c.lineWidth=3;c.beginPath();c.ellipse(x,y-8,47,15,0,0,TAU);c.stroke()}
  rounded(c,x-52,y-20,104,20,5,'#162d34d8','#918767');text(c,icons[key]+' '+E.C.buildings[key].name+' Lv.'+level,x,y-6,10,'#f4dca9');
 }
 rounded(c,17,15,251,41,8,'#10252cb8','#c7ad7a');text(c,`${E.C.races[s.race].english.toUpperCase()} • ${E.activeCity(s).name.toUpperCase()}`,33,43,18,'#f7e3b8','left');
 rounded(c,w-215,15,200,41,8,'#10252cb8','#c7ad7a');text(c,`TOWN HALL • LV ${s.buildings.hall}`,w-115,42,16);
 if(s.buildingQueue){const q=s.buildingQueue;rounded(c,w-265,65,250,38,5,'#142a33db','#ac9162');text(c,'🏗 '+E.C.buildings[q.key].name+' Lv.'+q.level,w-254,81,12,'#f7d79e','left');rounded(c,w-252,87,224,7,3,'#253c3e');rounded(c,w-251,88,Math.max(0,222*(1-q.remaining/q.total)),5,2,'#d6b46c');}
}
function cityHit(canvas,x,y){let best=null,d=38;for(const [key,px,py] of citySitesFor(canvas?.dataset?.race||'human')){const dx=x-canvas.width*px,dy=y-canvas.height*py;let v=Math.hypot(dx,dy);if(v<d){d=v;best=key}}return best}
const HEAVY_CLIPS={idle:{count:13,ms:1066.666722,loop:true},walk:{count:13,ms:1066.666722,loop:true},attack:{count:13,ms:1066.666722,loop:false},hit:{count:8,ms:666.666686,loop:false},death:{count:10,ms:800.000012,loop:false}};
const battleVisualClocks=new WeakMap();
function visualNow(){return typeof performance!=='undefined'?performance.now():0}
function battleElapsed(b,now){let clock=battleVisualClocks.get(b);if(!clock||clock.turn!==b.turn){clock={turn:b.turn,start:now};battleVisualClocks.set(b,clock)}return Math.max(0,now-clock.start)}
function animationFrame(action,elapsed=0,duration=null){
 if(!HEAVY_CLIPS[action])action='idle';const clip=HEAVY_CLIPS[action],ms=duration||clip.ms,t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,raw=Math.floor(t/ms*clip.count),frame=clip.loop?raw%clip.count:Math.min(clip.count-1,raw);
 return {action,frame,sx:(frame%8)*256,sy:Math.floor(frame/8)*256,sw:256,sh:256,id:'unit-human-heavy-'+action};
}
function battleVisualState(b,u,elapsed,now=elapsed){
 const events=b.lastEvents||[],own=events.find(e=>e.actorId===u.id),incoming=events.filter(e=>e.targetId===u.id&&e.damage>0),movement=own?.path?.length>0;
 const base={action:'idle',time:now,duration:null,x:u.x,y:u.y,alpha:1};
 if(u.pool<=0){if(incoming.some(e=>e.death)&&elapsed<1200)return {...base,action:'death',time:elapsed,alpha:Math.min(1,(1200-elapsed)/400)};return null}
 if(movement&&elapsed<450){const progress=clamp(elapsed/450,0,1)*own.path.length,index=Math.min(own.path.length-1,Math.floor(progress)),from=index?own.path[index-1]:own.from,to=own.path[index],fraction=progress-index;return {...base,action:'walk',time:elapsed,duration:450,x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction}}
 const attackStart=movement?450:0,attackDuration=movement?450:650;
 if(own?.damage>0&&elapsed>=attackStart&&elapsed<attackStart+attackDuration)return {...base,action:'attack',time:elapsed-attackStart,duration:attackDuration};
 if(incoming.length&&elapsed<650)return {...base,action:'hit',time:elapsed,duration:650};
 return base;
}
function hasAnimatedTroops(b){return !!b&&[...b.allies,...b.enemies].some(u=>u.unitId==='human_4')}
function animatedSoldier(c,x,y,enemy,visual){
 if(typeof document==='undefined'||!visual)return false;const frame=animationFrame(visual.action,visual.time,visual.duration),image=document.getElementById(frame.id);
 if(!image?.complete||!image.naturalWidth)return false;
 const size=144;c.save();c.globalAlpha*=visual.alpha;c.translate(x,y);if(enemy)c.scale(-1,1);
 c.drawImage(image,frame.sx,frame.sy,frame.sw,frame.sh,-size*148/256,-size*216/256,size,size);c.restore();return true;
}
function battleHit(canvas,x,y,E,s,now=visualNow()){
 const b=s.battle;if(!b)return null;const g=E.BATTLE_GRID,elapsed=battleElapsed(b,now),sx=canvas.width/g.cols,sy=(canvas.height-g.top-g.bottom)/g.rows;
 let best=null,distance=80;for(const u of [...b.allies,...b.enemies]){if(u.pool<=0)continue;const visual=u.unitId==='human_4'?battleVisualState(b,u,elapsed,now):u,d=Math.hypot((visual.x+.5)*sx-x,g.top+(visual.y+.76)*sy-y);if(d<distance){best=u;distance=d}}return best;
}
function soldier(c,x,y,k=1,color='#c5bc98',enemy=false,archer=false,unitId=null){
 const spriteIds={orc_1:'unit-orc-imp',elf_1:'unit-elf-centaur',elf_2:'unit-elf-scout',human_3:'unit-human-archer',undead_1:'unit-undead-skeleton'};
 if(spriteIds[unitId]&&typeof document!=='undefined'){
  const sprite=document.getElementById(spriteIds[unitId]);
  if(sprite?.complete&&sprite.naturalWidth){const size=90;c.save();if(enemy){c.translate(x+size/2,y-size*(446/512));c.scale(-1,1);c.drawImage(sprite,0,0,size,size)}else c.drawImage(sprite,x-size/2,y-size*(446/512),size,size);c.restore();return true}
 }
 c.save();c.translate(x,y);c.scale(k,k);
 circle(c,2,7,16,'#071f2399');line(c,-1,-5,-4,17,8,color);circle(c,-2,-20,10,enemy?'#846078':'#afab94');
 poly(c,[[-14,-29],[0,-41],[12,-28]],enemy?'#794c66':'#4b6077');
 line(c,-4,-9,-17,6,5,enemy?'#99828a':'#c9d2c3');line(c,7,-9,18,6,5,color);
 if(archer){c.strokeStyle='#d8ab6f';c.lineWidth=3;c.beginPath();c.arc(17,-10,14,-Math.PI/2,Math.PI/2);c.stroke();line(c,18,-25,18,4,1,'#e9ddae')}
 else{line(c,20,-17,34,-50,4,'#d8d0b0');line(c,28,-46,40,-46,4,'#bbb4a6')}
 c.restore();}
function drawBattle(canvas,E,s,now=visualNow(),interaction={}){if(!canvas||!s.battle)return;const c=canvas.getContext('2d'),b=s.battle,w=canvas.width,h=canvas.height,elapsed=battleElapsed(b,now);
 const field=typeof document!=='undefined'?document.getElementById('battlefield-human-meadow'):null;
 if(field?.complete&&field.naturalWidth===w&&field.naturalHeight===h)c.drawImage(field,0,0,w,h);
 else{const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#354a50');sky.addColorStop(.56,'#4e6659');sky.addColorStop(1,'#798060');c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let i=0;i<25;i++){const x=(i*79)%w;tree(c,x,142+random(i,4)*36,.95+random(i,6)*.6,'pine')}
  poly(c,[[0,196],[w,196],[w,h],[0,h]],'#766d56');for(let i=0;i<25;i++){const x=random(i,9)*w,y=210+random(i,8)*(h-220);line(c,x,y,x+19,y+8,2,'#c3b59050')}}
 const grid=E.BATTLE_GRID||{cols:12,rows:9,top:173,bottom:185},scaleX=w/grid.cols,scaleY=(h-grid.top-grid.bottom)/grid.rows,offsetY=grid.top;
 const preview=interaction.movementModeId===b.selected&&E.battleMovePreview?E.battleMovePreview(b,b.selected):null,reachable=new Set(preview?.cells.map(cell=>`${cell.x},${cell.y}`)||[]);
 for(let i=0;i<grid.cols;i++)for(let j=0;j<grid.rows;j++){c.fillStyle=(i+j)%2===0?'#22371a15':'#fff4d90a';c.fillRect(i*scaleX,offsetY+j*scaleY,scaleX,scaleY);if(reachable.has(`${i},${j}`)){c.fillStyle='#3d9a983b';c.fillRect(i*scaleX,offsetY+j*scaleY,scaleX,scaleY);c.strokeStyle='#d2f5de';c.lineWidth=2;c.strokeRect(i*scaleX+2,offsetY+j*scaleY+2,scaleX-4,scaleY-4)}c.strokeStyle='#fff0c978';c.lineWidth=1;c.strokeRect(i*scaleX,offsetY+j*scaleY,scaleX,scaleY)}
 const units=[...b.allies,...b.enemies].sort((a,b)=>(a.pool>0?0:1)-(b.pool>0?0:1));
 for(const u of units){const visual=u.unitId==='human_4'?battleVisualState(b,u,elapsed,now):null;if(u.pool<=0){if(visual)animatedSoldier(c,(u.x+.5)*scaleX,offsetY+(u.y+.76)*scaleY,u.side==='enemy',visual);continue}const position=visual||u,x=(position.x+.5)*scaleX,y=offsetY+(position.y+.76)*scaleY,k=.9+Math.min(1.2,u.count/15);
  if(b.selected===u.id||b.focused===u.id){c.strokeStyle=u.side==='enemy'?'#f3a389':'#ebd17d';c.lineWidth=3;c.beginPath();c.ellipse(x,y+2,38,13,0,0,TAU);c.stroke()}
  const illustrated=(visual&&animatedSoldier(c,x,y,u.side==='enemy',visual))||soldier(c,x,y,k,u.side==='enemy'?'#b9858c':'#c9c9b5',u.side==='enemy',u.range>1,u.unitId),nameTop=illustrated?122:82,nameY=illustrated?108:68,hpTop=illustrated?100:61;
  rounded(c,x-41,y-nameTop,82,19,4,u.side==='enemy'?'#4d2838d9':'#1b3c43dc');text(c,u.name,x,y-nameY,12,'#f5e7c5');
  rounded(c,x-25,y-hpTop,50,14,3,'#182b34');c.fillStyle=u.side==='enemy'?'#d88b82':'#80c2a1';c.fillRect(x-24,y-hpTop+2,48*clamp(u.pool/(u.initial*u.hp),0,1),10);
  text(c,'×'+u.count,x,y+18,14,'#fff3c8');
 }
 if(b.activeSpell){rounded(c,250,16,245,38,8,'#52466adc','#d4b6e8');text(c,`✨ ${b.activeSpell.id.toUpperCase().replace(/_/g,' ')} • ${b.activeSpell.expiry-b.turn} lượt`,267,41,14,'#fff1db','left')}
 rounded(c,14,14,225,42,9,'#172a32de','#968664');text(c,`⚔  GIAO TRANH • LƯỢT ${b.turn}`,26,41,18,'#f5dbad','left');
 rounded(c,w-200,14,186,42,9,'#172a32de','#968664');text(c,`TA ${b.allies.reduce((n,u)=>n+u.count,0)} : ${b.enemies.reduce((n,u)=>n+u.count,0)} ĐỊCH`,w-108,41,15);
}
root.HOG_PAINTER={drawWorld,drawCity,drawBattle,battleHit,animationFrame,battleVisualState,hasAnimatedTroops,mapHit,mapCamera,panMap,zoomMap,miniHit,miniBounds,cityHit,CITY_SITES,citySitesFor};
})(typeof globalThis!=='undefined'?globalThis:this);


