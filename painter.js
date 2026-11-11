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
 const sprite=typeof document!=='undefined'?document.getElementById(kind==='pine'?'hg28-world-tree-pine':'hg28-world-tree-broadleaf'):null;
 if(sprite?.complete&&sprite.naturalWidth){const height=66,width=height*sprite.naturalWidth/sprite.naturalHeight;
  c.fillStyle='#071a168a';c.beginPath();c.ellipse(1,4,Math.max(11,width*.36),7,-.12,0,TAU);c.fill();
  c.shadowColor='#061511a8';c.shadowBlur=7;c.shadowOffsetY=3;c.drawImage(sprite,-width/2,-height,width,height);c.restore();return;
 }
 c.fillStyle='#071a168a';c.beginPath();c.ellipse(2,7,18,8,-.12,0,TAU);c.fill();
 c.shadowColor='#0615119a';c.shadowBlur=6;c.shadowOffsetY=2;
 if(kind==='pine'){
  poly(c,[[-16,4],[0,-38],[16,4]],'#17382f','#172c27');
  poly(c,[[-14,-8],[0,-46],[14,-8]],'#285648');
  poly(c,[[-11,-21],[0,-54],[11,-21]],'#3a7357');
  poly(c,[[-5,-33],[0,-53],[4,-34]],'#83a374');
 }else{
  line(c,1,9,0,-22,6,'#594535');line(c,0,-7,-8,-20,3,'#66503b');
  const colors=kind==='dark'?['#243943','#2c4b4c','#416166','#81948a']:['#244d3a','#32684a','#4b8556','#a2ad77'];
  const blobs=[[-9,-13,12,15],[-1,-26,16,18],[12,-17,13,15],[-10,-35,11,12],[7,-39,13,13]];
  for(let i=0;i<blobs.length;i++){const [bx,by,rx,ry]=blobs[i],g=c.createRadialGradient(bx-rx*.25,by-ry*.55,1,bx,by,Math.max(rx,ry));g.addColorStop(0,colors[Math.min(colors.length-1,i+1)]);g.addColorStop(.72,colors[Math.min(colors.length-1,i)]);g.addColorStop(1,'#142d27');c.fillStyle=g;c.beginPath();c.ellipse(bx,by,rx,ry,-.2,0,TAU);c.fill()}
  circle(c,-8,-31,2,'#d6d28b');circle(c,9,-23,1.6,'#e2d58d');
 }
 c.restore();
}
function rock(c,x,y,k=1){c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#0716158a';c.beginPath();c.ellipse(1,7,21,8,-.08,0,TAU);c.fill();poly(c,[[-18,5],[-16,-8],[-8,-18],[2,-23],[15,-14],[20,1],[10,7]],'#4d6263','#263e40');poly(c,[[-16,-8],[-8,-18],[2,-23],[4,-4],[-6,7],[-18,5]],'#92a29a');poly(c,[[2,-23],[15,-14],[20,1],[10,7],[4,-4]],'#374e53');poly(c,[[-9,-16],[2,-22],[0,-10]],'#c1c2a6');line(c,-10,-7,-4,-3,1.5,'#d0ceaf');line(c,7,-13,12,-9,1.2,'#7e918c');c.restore();}
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
const WORLD_CREATURES={
 wildland_beast:{rect:[48,160,530,390],height:.88},
 elite_guardian:{rect:[730,0,500,588],height:1.18},
 boss_dragon:{rect:[0,625,650,622],height:1.22},
 lich_warlord:{rect:[687,585,560,662],height:1.12}
};
function encounterKind(tile){return tile.eliteTier>=13?'lich_warlord':tile.eliteTier>=11?'boss_dragon':tile.eliteTier>0||tile.level>=5?'elite_guardian':'wildland_beast'}
function drawWorldEncounter(c,atlas,tile,x,y,q,selected=false,viewport={}){
 const kind=encounterKind(tile),source=WORLD_CREATURES[kind],boss=tile.eliteTier>=11,elite=kind==='elite_guardian';
 const [sx,sy,sw,sh]=source.rect,h=q*source.height,w=h*sw/sh;
 c.save();c.fillStyle=boss?'#11131bb5':elite?'#141714a8':'#071814a0';c.beginPath();c.ellipse(x,y+q*.12,w*.43,q*.105,0,0,TAU);c.fill();
 if(atlas?.complete&&atlas.naturalWidth){c.shadowColor=boss?'#62c9d4b5':'#000b';c.shadowBlur=selected?14:7;c.shadowOffsetY=3;c.drawImage(atlas,sx,sy,sw,sh,x-w/2,y-h*.84,w,h);}
 else monster(c,x,y,q/(boss?63:elite?74:79),tile.level);
 c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;
 if(boss||elite){const label=boss?`BOSS · T${tile.eliteTier}`:`ELITE · ${tile.level}★`,bw=Math.max(64,Math.min(94,q*1.68));
  const labelX=clamp(x+(viewport.offX||0),bw/2+5,(viewport.width||1260)-bw/2-5)-(viewport.offX||0);
  const labelY=clamp(y+(viewport.offY||0)-h*.92-14,18,(viewport.height||600)-18)-(viewport.offY||0);
  rounded(c,labelX-bw/2,labelY-7.5,bw,15,6,boss?'#3d2848eF':'#4a3c2ceF',boss?'#bb83b7':'#c2a36b');text(c,labelX,labelY+3,8.5,'#fff0cf','center','800')}
 else{circle(c,x+w*.32,y-h*.57,7,'#172b2deF');text(c,`${tile.level}★`,x+w*.32,y-h*.57+3,8,'#ffe2a2','center','800')}
 if(selected){c.beginPath();c.ellipse(x,y+q*.1,w*.56,q*.22,0,0,TAU);c.strokeStyle='#f4d58e';c.lineWidth=2.5;c.stroke()}
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
function drawMapLandmark(c,key,x,y,q,sizeFactor=1){
 if(!key||typeof document==='undefined')return false;
 const sprite=document.getElementById('hg28-map-'+key);
 if(!sprite?.complete||!sprite.naturalWidth)return false;
 const size=q*sizeFactor;
 c.save();c.fillStyle='#091714a1';c.beginPath();c.ellipse(x,y+q*.16,size*.36,q*.115,0,0,TAU);c.fill();
 c.shadowColor='#06140ecc';c.shadowBlur=Math.min(q*.22,12);c.shadowOffsetY=q*.08;
 c.drawImage(sprite,x-size/2,y+q*.18-size,size,size);c.restore();return true;
}
const M={centerX:9.5,centerY:7.4,zoom:1.3};
function mapCamera(){return M}
function mapProjection(canvas){const scale=clamp(M.zoom,.65,2.05)*48;return {scale,offX:canvas.width/2-M.centerX*scale,offY:canvas.height/2-M.centerY*scale}}
function miniBounds(canvas){
 // On phone Chrome the address bar may leave only 176 CSS px for the map.
 // Preserve minimap hit testing, but reclaim enough space to see the units.
 const compact=canvas.height<280;
 const scale=clamp(Math.min(1,canvas.width*.24/203,canvas.height*(compact?.22:.28)/146),compact?.30:.42,1);
 const w=203*scale,h=146*scale;
 return {x:canvas.width-w-(compact?8:17),y:canvas.height-h-(compact?8:32),w,h};
}
function drawMiniMap(c,canvas,E,s,selected){const m=miniBounds(canvas),pad=9,tw=(m.w-2*pad)/E.WIDTH,th=(m.h-2*pad)/E.HEIGHT;
 rounded(c,m.x-2,m.y-23,m.w+4,m.h+25,7,'#12272cdb','#c5a66c');text(c,m.w<120?'BẢN ĐỒ':'BẢN ĐỒ THU NHỎ',m.x+6,m.y-7,Math.max(8,13*m.w/203),'#e7c78e','left');
 for(const t of E.TILES){let color={plain:'#6d8559',road:'#9e956a',bridge:'#d5c08a',forest:'#28533c',hill:'#6a7262',water:'#408b9c'}[t.terrain]||'#68805b';
  c.fillStyle=color;c.fillRect(m.x+pad+t.x*tw,m.y+pad+t.y*th,tw+.28,th+.28)}
 for(const t of E.TILES){if(t.kind==='empty')continue;
  const owned=E.cityForKey(s,t.key),ai=E.aiCityAt?.(s,t.key);c.fillStyle=t.kind==='castle'?(owned?(owned.main?'#ffe7ad':'#81d39a'):ai?'#e37a63':'#eee0b0'):t.kind==='mine'?'#f2cf55':t.kind==='visit'?'#75d5c5':'#e99987';
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
 const {scale:q,offX:ox,offY:oy}=mapProjection(canvas);
 const grd=c.createLinearGradient(0,0,w,h);grd.addColorStop(0,'#213f35');grd.addColorStop(.5,'#446a50');grd.addColorStop(1,'#304338');c.fillStyle=grd;c.fillRect(0,0,w,h);
 const inside=(x,y)=>x+q>=-30&&x<w+30&&y+q>=-30&&y<h+30;
 c.save();c.translate(ox,oy);
 // HG28-A: generated seamless meadow art under the interactive terrain layer.
 // Pattern scale follows the world projection, so it stays anchored while panning/zooming.
 const meadow=typeof document!=='undefined'?document.getElementById('hg28-world-meadow'):null;
 if(meadow?.complete&&meadow.naturalWidth){const pattern=c.createPattern(meadow,'repeat');
  if(pattern?.setTransform&&typeof DOMMatrix!=='undefined')pattern.setTransform(new DOMMatrix([q*7/meadow.naturalWidth,0,0,q*7/meadow.naturalHeight,0,0]));
  if(pattern){c.save();c.globalAlpha=.52;c.fillStyle=pattern;c.fillRect(0,0,E.WIDTH*q,E.HEIGHT*q);c.restore();}
 }
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
  else if(t.terrain==='forest')for(let j=0;j<3;j++)tree(c,x+q*(.16+random(t.x+j,t.y)*.68),y+q*(.22+random(t.x,t.y+j)*.62),q/92*(.76+random(j,t.y)*.3),r>.58?'pine':'normal');
  else if(t.terrain==='hill'){rock(c,x+q*.46,y+q*.65,q/108);if(r>.5)rock(c,x+q*.72,y+q*.41,q/168)}
  else {if(r>.72)tree(c,x+q*.68,y+q*.63,q/94);for(let j=0;j<6;j++)circle(c,x+q*random(t.x,j,t.y),y+q*random(j,t.y,t.x),1,'#8da96a8a')}
 }
 // original road network leads from the capital to landmark targets
 c.save();c.strokeStyle='#aa926372';c.lineWidth=q*.13;c.lineCap='round';c.lineJoin='round';c.beginPath();[[3.5,4.5],[5.4,4.7],[7.6,4.4],[10.4,5.7],[14.3,7.1],[17.8,7.5],[20.1,8.6],[23.8,11]].forEach(([x,y],i)=>i?c.lineTo(x*q,y*q):c.moveTo(x*q,y*q));c.stroke();c.restore();
 const creatureAtlas=typeof document!=='undefined'?document.getElementById('hg28-world-creatures'):null;
 for(const t of E.TILES){if(t.kind==='empty')continue;const x=(t.x+.5)*q,y=(t.y+.54)*q;if(!inside(x+ox,y+oy))continue;
  let done=s.mines.some(m=>m.key===t.key)||(t.kind==='treasure'?s.treasureCleared?.includes(t.key):s.cleared.includes(t.key));
  if(t.kind==='castle'){
   const owned=E.cityForKey(s,t.key),ai=E.aiCityAt?.(s,t.key);
   const race=owned?.race||t.race||s.race||'human';
   if(!drawMapLandmark(c,'castle-'+race,x,y,q,1.28))castle(c,x,y,q/110,race,owned?.local.buildings.hall||ai?.level||1);
   if(ai){circle(c,x,y-q*.31,q*.11,'#9f3630');text(c,'AI',x,y-q*.27,Math.max(9,q*.20),'#fff0dc')}
  }
  if(t.kind==='mine'){
   const mineSprite={gold:'mine-gold',ore:'mine-ore',crystal:'mine-crystal',sulfur:'mine-sulfur'}[t.value];
   if(!drawMapLandmark(c,mineSprite,x,y,q,.98))mine(c,x,y,q/77,t.value);
  }
  if(t.kind==='npc'&&!done)drawWorldEncounter(c,creatureAtlas,t,x,y,q,selected===t.key,{offX:ox,offY:oy,width:w,height:h});
  if(t.kind==='treasure'){
   if(!drawMapLandmark(c,'structure-forest-camp',x,y,q,1.02))treasureChest(c,x,y,q/82,!!done);
  }
  if(t.treasureCamp&&t.kind!=='treasure'){
   if(!drawMapLandmark(c,'structure-forest-camp',x+q*.27,y+q*.19,q*.72,.98))treasureChest(c,x+q*.27,y+q*.19,q/220,!!s.treasureCleared?.includes(t.key));
  }
  if(t.kind==='visit'){
   const kind=t.structureId?.startsWith('watermill')?'watermill':t.structureId==='windmill'?'windmill':t.structureId;
   const visitSprite=kind==='defense-tower'?'tower-watch':kind==='windmill'?'structure-windmill':kind==='watermill'?'structure-watermill':null;
   if(!drawMapLandmark(c,visitSprite,x,y,q,1.03))worldBuilding(c,x,y,q/100,kind,!!E.hasVisitedWorldBuilding?.(s,t.key));
  }
  if(done){c.save();c.globalAlpha=.88;circle(c,x+q*.3,y-q*.23,q*.13,'#d7bd70');c.restore()}
  if(selected===t.key){c.strokeStyle='#f3d7a1';c.lineWidth=3;c.strokeRect(t.x*q+2,t.y*q+2,q-4,q-4);}
  if(selected===t.key&&q>20){const city=E.cityForKey(s,t.key),label=t.kind==='castle'?(city?.name||t.value||'Thành trung lập'):t.kind==='mine'?{wood:'Mỏ gỗ',ore:'Mỏ quặng',gold:'Mỏ vàng',sulfur:'Mỏ lưu huỳnh',crystal:'Mỏ pha lê'}[t.value]:t.value;
   const font=Math.max(10,Math.min(14,q*.24));c.font=`700 ${font}px system-ui`;const bw=Math.max(74,Math.min(176,c.measureText(label||'').width+22));
   const lx=clamp(x+ox,bw/2+5,w-bw/2-5)-ox,ly=clamp(y+oy-q*.72,28,h-28)-oy;
   rounded(c,lx-bw/2,ly-12,bw,24,7,'#10242beF','#d7b873');text(c,label,lx,ly+4,font,'#fff0cc','center','700');
  }
 }
 // Garrisoned heroes remain visible at occupied mines; traveling heroes follow their saved route.
 for(const g of (s.stationedHeroes||[])){const t=E.getTile(g.key);if(!t)continue;const x=(t.x+.5)*q,y=(t.y+.44)*q;circle(c,x,y,q*.27,'#263e57');circle(c,x,y,q*.20,'#e3c373');poly(c,[[x-q*.12,y-q*.17],[x,y-q*.38],[x+q*.12,y-q*.17]],'#314f72');text(c,'⚔',x,y-q*.31,15,'#fff0c8');}
 if(s.march){const m=s.march,progress=1-m.remaining/m.total,indices=(m.path||[m.fromKey||'3,4',m.target]);const t=clamp(progress,0,.999)*(indices.length-1),i=Math.floor(t);const a=E.getTile(indices[i]),b=E.getTile(indices[Math.min(i+1,indices.length-1)]);if(a&&b){let x=(a.x+(b.x-a.x)*(t-i)+.5)*q,y=(a.y+(b.y-a.y)*(t-i)+.5)*q;
  circle(c,x,y,q*.3,'#f0cc6388');circle(c,x,y,q*.16,'#eac77d');poly(c,[[x-q*.14,y-q*.2],[x,y-q*.47],[x+q*.14,y-q*.2]],'#344f6e');text(c,'⚔',x,y-q*.38,17,'#f9e0aa');}}
 for(const m of (s.parallelMarches||[])){const indices=m.path||[m.homeKey,m.target],progress=m.phase==='arrived'?1:clamp(1-m.remaining/m.total,0,.999),t=progress*(indices.length-1),i=Math.floor(t),a=E.getTile(indices[i]),b=E.getTile(indices[Math.min(i+1,indices.length-1)]);if(a&&b){const x=(a.x+(b.x-a.x)*(t-i)+.5)*q,y=(a.y+(b.y-a.y)*(t-i)+.5)*q;circle(c,x,y,q*.27,'#236e79dd');circle(c,x,y,q*.16,'#7fd7ce');poly(c,[[x-q*.12,y-q*.17],[x,y-q*.39],[x+q*.12,y-q*.17]],'#284c63');text(c,'⚔',x,y-q*.30,14,'#fff0c8');}}
 c.restore();
 // Screen ornaments: keep the world itself visible on small mobile
 // WebView/Chrome content:// viewports, not two huge badges and help ribbons.
 if(h<280){
  rounded(c,6,6,132,23,5,'#122a2cbb','#9b9160');
  text(c,`GAIA · X${Math.round(M.centerX)} Y${Math.round(M.centerY)}`,12,22,11,'#f0d99f','left');
 }else{
  rounded(c,13,13,176,40,8,'#122a2ccf','#9b9160');text(c,'TÂN LỤC ĐỊA • GAIA',27,39,17,'#e7d29b','left');
  rounded(c,w-174,13,161,43,8,'#122a2ccf','#9b9160');text(c,`X ${Math.round(M.centerX)}  ·  Y ${Math.round(M.centerY)}`,w-94,40,16);
  rounded(c,13,h-36,280,25,5,'#172d2ecf');text(c,'Kéo bản đồ • Cuộn để zoom • Chạm mục tiêu',20,h-19,12,'#f0ddbb','left','500');
 }
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
  for(const [key,px,py] of citySitesFor(s.race)){const x=w*px,y=h*py,level=s.buildings[key]||0;
   if(highlight===key){const label=`${E.C.buildings[key].name} · Lv.${level}`;c.font='700 12px Georgia,serif';const bw=Math.max(86,Math.min(150,c.measureText(label).width+18)),bh=22;
    const ly=clamp(y+(py<.56?31:-31),bh/2+4,h-bh/2-4),lx=clamp(x,bw/2+4,w-bw/2-4);
    c.strokeStyle='#ffe49b';c.lineWidth=3;c.beginPath();c.ellipse(x,y+3,48,19,0,0,TAU);c.stroke();
    rounded(c,lx-bw/2,ly-bh/2,bw,bh,6,'#172a30ef','#f3d58e');circle(c,lx-bw/2+8,ly,3.5,level>0?'#f2cc7d':'#9ca7a1');text(c,label,lx+3,ly+4,11,'#fff0c8');
   }else{circle(c,x,y+5,9,'#10252cda');circle(c,x,y+5,6.2,level>0?'#d9b968':'#9ba9a2');if(level>0)text(c,String(level),x,y+8,7,'#17282b','center','800')}
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
const VANGUARD_CLIPS=Object.freeze({
 idle:{row:0,count:8,ms:960,loop:true},walk:{row:1,count:8,ms:640,loop:true},
 attack:{row:2,count:8,ms:650,loop:false},hit:{row:3,count:8,ms:560,loop:false},
 death:{row:4,count:8,ms:1200,loop:false}
});
const battleVisualTimelines=new WeakMap();
const battlePendingPoolByFrame=new WeakMap(); // HG57-B: one receipt pass per visual frame, not 22+ scans
function visualNow(){return typeof performance!=='undefined'?performance.now():0}
const EMPTY_BATTLE_EVENTS=Object.freeze([]),BATTLE_VISUAL_STAGGER_MS=62,BATTLE_HEX_TRAVEL_MS=285;
// HG57 animation ledger: each stack completes its move/strike before the next
// starts. Different sides have a readable pause. Dynamic density makes 16-18
// Boss stacks brisk, while preserving actual sprite clips, hits and foot cells.
function battleVisualSchedule(events){
 const dense=events.length>=16,attackMs=dense?410:560,stepMs=dense?240:BATTLE_HEX_TRAVEL_MS;
 let cursor=0,prevSide=null;
 const steps=[];
 for(const event of events){
  const side=String(event?.actorId||'').startsWith('e')?'enemy':'player';
  if(prevSide!==null&&side!==prevSide)cursor+=dense?350:440;
  const path=Array.isArray(event?.path)?event.path:[],
   // A movement-only event is NOT a strike; never stage an empty attack
   // pose which makes people think damage failed or the enemy skipped a turn.
   moveMs=path.length*stepMs,
   attemptedHit=event?.damage>0||event?.shieldAbsorbed>0,
   actMs=attemptedHit?attackMs:path.length?155:
    ['attack','focus','skill'].includes(event?.order)?dense?165:200:130,
   start=cursor,impact=start+moveMs+actMs*.63;
  steps.push({start,moveMs,attackMs:actMs,impactAt:impact,
   animationEnd:start+moveMs+actMs});
  cursor+=moveMs+actMs+(dense?BATTLE_VISUAL_STAGGER_MS*.67:BATTLE_VISUAL_STAGGER_MS);
  prevSide=side;
 }
 return {steps,duration:Math.max(900,Math.ceil(cursor+90))};
}
function battleTimelinePrime(b,now=visualNow(),replay=false){
 if(!b||typeof b!=='object')return null;
 const events=Array.isArray(b.lastEvents)?b.lastEvents:EMPTY_BATTLE_EVENTS;
 const timeline={seen:events,items:[],nextStart:now};
 battleVisualTimelines.set(b,timeline);
 if(replay&&events.length)enqueueBattleReceipts(timeline,events,now,b.turn-1);
 return timeline;
}
function enqueueBattleReceipts(timeline,events,now,round=0){
 const start=Math.max(now,timeline.nextStart||now),schedule=battleVisualSchedule(events);
 for(let i=0;i<events.length;i++){
  const event=events[i];if(!event||typeof event.actorId!=='string')continue;
  const route=Array.isArray(event.path)?event.path.map(p=>({x:p.x,y:p.y})):[],
   item=schedule.steps[i],at=start+item.start,impactAt=start+item.impactAt,
   animationEnd=start+item.animationEnd;
  timeline.items.push({round,event:{...event,from:event.from?{...event.from}:null,to:event.to?{...event.to}:null,path:route},
   start:at,moveMs:item.moveMs,attackMs:item.attackMs,impactAt,animationEnd,
   deathEnd:event.death?impactAt+1200:0,
   effectEnd:event.death?impactAt+1200:event.damage>0?impactAt+760:animationEnd});
 }
 timeline.nextStart=start+schedule.duration;
}
function battleTimelineFor(b,now=visualNow()){
 if(!b||typeof b!=='object')return null;
 let timeline=battleVisualTimelines.get(b);
 if(!timeline)timeline=battleTimelinePrime(b,now,true);
 const events=Array.isArray(b.lastEvents)?b.lastEvents:EMPTY_BATTLE_EVENTS;
 if(timeline.seen!==events){timeline.seen=events;enqueueBattleReceipts(timeline,events,now,b.turn-1)}
 // Each of the up-to-22 drawn actors calls battleVisualState and
 // battleVisualPool at the SAME frame timestamp. Cull at most once per
 // frame/receipt, keeping identical expiration semantics on later frames.
 if(timeline.lastCullNow!==now||timeline.lastCullEvents!==events){
  if(timeline.items.length>180)timeline.items=timeline.items.filter(item=>item.deathEnd>now||item.effectEnd>now||item.animationEnd>now).slice(-160);
  else if(timeline.items.length>24)timeline.items=timeline.items.filter(item=>item.deathEnd>now||item.effectEnd>now||item.animationEnd>now);
  timeline.lastCullNow=now;timeline.lastCullEvents=events;
 }
 return timeline;
}
function battleTimelineTurnDuration(b){
 const events=Array.isArray(b?.lastEvents)?b.lastEvents:EMPTY_BATTLE_EVENTS;
 return events.length?battleVisualSchedule(events).duration:0;
}
function battleVisualPhase(b,now=visualNow()){
 const items=battleTimelineFor(b,now)?.items||[];
 // Retain the last active side during the short handoff pause.
 let current=null;
 for(const item of items){
  if(now>=item.start&&now<item.animationEnd)
   return {side:String(item.event.actorId).startsWith('e')?'enemy':'player',actorId:item.event.actorId};
  if(now>=item.animationEnd)current=item;
 }
 return current&&now<current.animationEnd+420?{
  side:String(current.event.actorId).startsWith('e')?'enemy':'player',actorId:current.event.actorId
 }:{side:null,actorId:null};
}
function battleElapsed(b,now){battleTimelineFor(b,now);return Math.max(0,now)}
function vanguardAtlasFrame(action,elapsed=0,duration=null){
 if(!VANGUARD_CLIPS[action])action='idle';const clip=VANGUARD_CLIPS[action],ms=duration||clip.ms,t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,raw=Math.floor(t/ms*clip.count),frame=clip.loop?raw%clip.count:Math.min(clip.count-1,raw);
 return {action,frame,sx:frame*192,sy:clip.row*204,sw:192,sh:204,id:'unit-human-vanguard-atlas'};
}
function battleVisualPool(b,u,now=visualNow()){
 const timeline=battleTimelineFor(b,now),items=timeline?.items||[];
 let cache=battlePendingPoolByFrame.get(b);
 if(!cache||cache.now!==now||cache.seen!==timeline?.seen||cache.items!==items){
  const pending=new Map(),rounds=new Map();
  for(const item of items){
   const event=item.event;
   if(event?.targetId&&Number.isFinite(event.poolBefore)&&
      Number.isFinite(event.poolAfter)&&item.round===b.turn-1){
    let row=rounds.get(event.targetId);
    if(!row){row=[];rounds.set(event.targetId,row);}
    row.push(item);
   }else if(event?.targetId&&event.damage>0&&now<item.impactAt){
    // Old Save v07 receipts remain playable with legacy pending-damage
    // reconstruction, without migrating or inventing missing snapshots.
    pending.set(event.targetId,(pending.get(event.targetId)||0)+event.damage);
   }
  }
  cache={now,seen:timeline?.seen,items,pending,rounds};
  battlePendingPoolByFrame.set(b,cache);
 }
 const hits=cache.rounds.get(u.id);
 if(hits?.length){
  // Real per-strike receipts, not final-turn HP plus guessed cumulative hits.
  // Multiple attackers from heroes 1/2/3 and enemy shields stay ordered.
  let value=hits[0].event.poolBefore;
  for(const item of hits){
   if(now<item.impactAt)break;
   value=item.event.poolAfter;
  }
  if(now>=hits[hits.length-1].animationEnd)
   value=u.pool; // settle genuine end-turn DoT/heals after visible attacks
  return clamp(value,0,Math.max(0,(u.initial||u.count||0)*(u.hp||1)));
 }
 return clamp((u.pool||0)+(cache.pending.get(u.id)||0),0,
  Math.max(0,(u.initial||u.count||0)*(u.hp||1)));
}
function battleVisualState(b,u,elapsed,now=elapsed){
 const timeline=battleTimelineFor(b,now),items=timeline?.items||[],
  own=items.find(item=>item.event.actorId===u.id&&now<item.animationEnd)||null,
  incoming=items.find(item=>item.event.targetId===u.id&&item.event.damage>0&&now<item.impactAt)||
   items.filter(item=>item.event.targetId===u.id&&item.event.damage>0&&
    now>=item.impactAt&&now<item.effectEnd).slice(-1)[0]||null;
 const base={action:'idle',time:now,duration:null,x:u.x,y:u.y,alpha:1,pool:battleVisualPool(b,u,now)};
 const pointFor=item=>{
  const e=item.event,route=item.event.path||[];
  if(!route.length)return {x:e.to?.x??u.x,y:e.to?.y??u.y};
  if(now<=item.start)return {x:e.from?.x??route[0].x,y:e.from?.y??route[0].y};
  const progress=clamp((now-item.start)/Math.max(1,item.moveMs),0,1)*route.length,
   index=Math.min(route.length-1,Math.floor(progress)),fraction=Math.min(1,progress-index),
   eased=fraction*fraction*(3-2*fraction),
   from=index?route[index-1]:(e.from||route[0]),to=route[index];
  return {x:from.x+(to.x-from.x)*eased,y:from.y+(to.y-from.y)*eased};
 };
 if(u.pool<=0){
  if(incoming?.event.death&&now>=incoming.impactAt&&now<incoming.deathEnd){
   const position=own?pointFor(own):(incoming.event.targetAt||base);
   return {...base,...position,action:'death',time:now-incoming.impactAt,duration:1200,
    alpha:Math.min(1,(incoming.deathEnd-now)/400)};
  }
  if(incoming?.event.death&&now<incoming.impactAt){
   const position=own?pointFor(own):(incoming.event.targetAt||base);
   return {...base,...position};
  }
  return null;
 }
 if(own){
  const position=pointFor(own),e=own.event;
  if(now<own.start)return {...base,...position};
  if(own.moveMs>0&&now<own.start+own.moveMs)
   return {...base,...position,action:'walk',time:Math.max(0,now-own.start),duration:own.moveMs,
    walkFrom:e.from,walkTo:e.to,walkRoute:e.path,walkFraction:clamp((now-own.start)/own.moveMs,0,1)};
  if(own.attackMs>0&&now<own.animationEnd)
   return {...base,...position,
    action:(e.damage>0||e.shieldAbsorbed>0)?'attack':'idle',
    time:Math.max(0,now-own.start-own.moveMs),duration:own.attackMs};
  if(now<own.start)return {...base,...position};
 }
 if(incoming&&now>=incoming.impactAt&&now<incoming.impactAt+650)
  return {...base,action:'hit',time:now-incoming.impactAt,duration:650};
 return base;
}
// HG14 Batch 1: existing real transparent PNG masters, not fabricated multi-pose atlases.
// Read-only procedural motion is derived from the same recorded battle events as Heavy Soldier.
// Full skeletal/frame animations still require approved separated pose/frame sources.
const MOTION_SPRITES=Object.freeze({
 human_1:Object.freeze({id:'hg28-battle-human-spear-militia',race:'human',size:116,pivot:.988,accent:'#d3b273',ranged:false}),
 human_3:Object.freeze({id:'unit-human-archer',race:'human',size:112,pivot:446/512,accent:'#f0c46d',ranged:true}),
 elf_1:Object.freeze({id:'unit-elf-centaur',race:'elf',size:122,pivot:446/512,accent:'#95e7a7',ranged:false}),
 elf_2:Object.freeze({id:'unit-elf-scout',race:'elf',size:130,pivot:446/512,accent:'#b1db91',ranged:false}),
 orc_1:Object.freeze({id:'unit-orc-imp',race:'orc',size:110,pivot:446/512,accent:'#ffa16b',ranged:false}),
 undead_1:Object.freeze({id:'unit-undead-skeleton',race:'undead',size:112,pivot:446/512,accent:'#c9a9f7',ranged:false})
});
const BOSS_SPRITES=Object.freeze({
 azrael:Object.freeze({id:'hg28-boss-azrael',size:126,pivot:.988,glow:'#82e8e8',boss:true}),
 'cyclop tyrant':Object.freeze({id:'hg28-boss-cyclops-tyrant',size:130,pivot:.988,glow:'#74d9cf',boss:true}),
 'demonlord samurai':Object.freeze({id:'hg28-boss-demonlord-samurai',size:126,pivot:.988,glow:'#9fe2df',boss:true})
});
function bossSprite(name){
 const key=String(name||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
 return BOSS_SPRITES[key]||null;
}
// HG63: source-facing metadata determines mirroring on BOTH deployment sides.
// Boss original atlases face left; troop atlases face right. Render only.
function hg63BattleMirror(enemy,sourceFacing='right'){return enemy?sourceFacing!=='left':sourceFacing==='left'}
function animatedUnitId(id,name=''){const atlas=root.HOG_HG33_TROOP_ATLASES;return id==='human_4'||Object.prototype.hasOwnProperty.call(MOTION_SPRITES,id)||!!atlas?.hasActor?.(id,name)||!!atlas?.hasUnit(id)||!!root.HOG_ART_PACK?.hasUnit(id)||!!bossSprite(name)}
function motionPose(action,time=0,duration=null){
 // Bounded deterministic transforms with no gameplay mutation.
 const ms=Math.max(0,Number.isFinite(time)?time:0),phase=ms/1000;
 if(action==='walk'){
  const t=ms/Math.max(1,duration||450),stride=2*Math.PI*t*3;
  return {dx:Math.sin(stride)*2.3,dy:-Math.abs(Math.sin(stride))*5.2,angle:Math.sin(stride)*.045,sx:1,sy:1,alpha:1,flash:0};
 }
 if(action==='attack'){
  const t=clamp(ms/Math.max(1,duration||650),0,1);
  const anticipation=clamp(t/.24,0,1),lunge=clamp((t-.24)/.27,0,1),recoil=clamp((t-.51)/.49,0,1);
  const drive=lunge*(1-recoil);
  return {dx:-1.5*anticipation+5*drive,dy:-1.5*Math.sin(Math.PI*t),angle:-.13*anticipation+.31*drive,sx:1+.065*drive,sy:1-.04*drive,alpha:1,flash:0};
 }
 if(action==='hit'){
  const t=clamp(ms/Math.max(1,duration||650),0,1),intensity=Math.pow(1-t,1.5);
  return {dx:-2.5*intensity+1.2*Math.sin(t*45)*intensity,dy:0,angle:-.105*intensity,sx:1+.03*intensity,sy:1-.04*intensity,alpha:1,flash:intensity};
 }
 if(action==='death'){
  const t=clamp(ms/Math.max(1,duration||1200),0,1),ease=1-Math.pow(1-t,3);
  return {dx:-6*ease,dy:12*ease,angle:-1.22*ease,sx:1,sy:Math.max(.53,1-.47*ease),alpha:Math.min(1,(1-t)*2),flash:0};
 }
 const breath=Math.sin(phase*2*Math.PI*.83);
 return {dx:Math.sin(phase*2*Math.PI*.44)*.8,dy:-1.2*breath,angle:.014*Math.sin(phase*2*Math.PI*.53),sx:1+.008*breath,sy:1-.012*breath,alpha:1,flash:0};
}
// HG14.3: Human Archer action sprites are genuine, distinct 256x256 PNG frames
// from a separately articulated source master. Never rerender a single whole PNG.
const ARCHER_CLIPS=Object.freeze({
 idle:{row:0,count:8,ms:1100,loop:true},
 walk:{row:1,count:8,ms:750,loop:true},
 draw:{row:2,count:8,ms:510,loop:false},
 release:{row:3,count:8,ms:360,loop:false},
 hit:{row:4,count:8,ms:540,loop:false},
 death:{row:5,count:8,ms:950,loop:false}
});
function archerAtlasFrame(action,time=0,duration=null){
 let elapsed=Math.max(0,Number.isFinite(time)?time:0),clipId=action,ms=duration||ARCHER_CLIPS[action]?.ms||1100;
 if(action==='attack'){
  const whole=duration||650,drawTime=whole*.70;
  if(elapsed<drawTime){clipId='draw';ms=drawTime}
  else{clipId='release';elapsed-=drawTime;ms=whole-drawTime}
 }
 if(!ARCHER_CLIPS[clipId])clipId='idle';
 const clip=ARCHER_CLIPS[clipId],raw=Math.floor(elapsed/Math.max(1,ms)*clip.count);
 const index=clip.loop?raw%clip.count:Math.min(clip.count-1,raw);
 return {action:clipId,index,sx:index*256,sy:clip.row*256,sw:256,sh:256,
         imageId:'unit-human-archer-atlas'};
}
function animatedArcher(c,x,y,enemy,visual,k=1){
 if(typeof document==='undefined'||!visual)return false;
 const image=document.getElementById('unit-human-archer-atlas');
 if(!image?.complete||image.naturalWidth!==2048||image.naturalHeight!==1536)return false;
 const frame=archerAtlasFrame(visual.action,visual.time,visual.duration),size=clamp(112*k,18,134);
 c.save();c.globalAlpha*=clamp(visual.alpha??1,0,1);c.translate(x,y);
 if(enemy)c.scale(-1,1);
 c.drawImage(image,frame.sx,frame.sy,256,256,-size*.485,-size*.87,size,size);
 c.restore();return true;
}
function motionSprite(c,x,y,unitId,enemy,visual,k=1,unitName=''){
 const A=root.HOG_ART_PACK,profile=bossSprite(unitName)||MOTION_SPRITES[unitId]||root.HOG_HG28_TROOPS?.profile(unitId)||(A?.hasUnit(unitId)?{id:null,size:112,pivot:118/128}:null);
 if(!profile||!visual||typeof document==='undefined')return false;
 const image=profile.id?document.getElementById(profile.id):A.unitImage(unitId);
 if(!image?.complete||!image.naturalWidth)return false;
 const pose=motionPose(visual.action,visual.time,visual.duration),size=clamp(profile.size*k,18,profile.boss?178:134);
 c.save();c.globalAlpha*=clamp((visual.alpha??1)*pose.alpha,0,1);
 c.translate(x,y);if(hg63BattleMirror(enemy,profile.enemyFacing||(profile.boss?'left':'right')))c.scale(-1,1);
 c.translate(pose.dx,pose.dy-size*.39);c.rotate(pose.angle);
 c.scale(pose.sx,pose.sy);c.translate(0,size*.39);
 if(profile.pixelated)c.imageSmoothingEnabled=false;
 if(profile.glow){
  c.shadowColor=profile.glow;c.shadowBlur=1.5;
  c.imageSmoothingQuality='high'; // keep true Boss images crisp after scale
 }
 const aspect=profile.pixelated?image.naturalWidth/Math.max(1,image.naturalHeight):1;
 const imgW=profile.pixelated&&aspect<1?size*aspect:size;
 const imgH=profile.pixelated&&aspect>1?size/aspect:size;
 c.drawImage(image,-imgW/2,-imgH*profile.pivot,imgW,imgH);
 if(pose.flash>0){
  // Compact impact halo follows the silhouette but does not repaint the entire battlefield.
  c.globalAlpha*=pose.flash*.54;c.strokeStyle='#ffbaa1';c.lineWidth=2.5;
  c.beginPath();c.ellipse(0,-size*.47,size*.19,size*.33,-.25,0,TAU);c.stroke();
 }
 c.restore();return true;
}

const HG403_SKILL_SIGILS=Object.freeze({
 'human_1':Object.freeze({unitId:'human_1',race:'human',tier:1,motif:'rampart',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_2':Object.freeze({unitId:'human_2',race:'human',tier:2,motif:'crosshair',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_3':Object.freeze({unitId:'human_3',race:'human',tier:3,motif:'triple-arrow',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_4':Object.freeze({unitId:'human_4',race:'human',tier:4,motif:'citadel',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_5':Object.freeze({unitId:'human_5',race:'human',tier:5,motif:'comet',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_6':Object.freeze({unitId:'human_6',race:'human',tier:6,motif:'healing-cross',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_7':Object.freeze({unitId:'human_7',race:'human',tier:7,motif:'banner',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_8':Object.freeze({unitId:'human_8',race:'human',tier:8,motif:'sanctuary',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_9':Object.freeze({unitId:'human_9',race:'human',tier:9,motif:'sunblade',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'human_10':Object.freeze({unitId:'human_10',race:'human',tier:10,motif:'sky-aegis',primary:'#ffd88e',pale:'#fff0c5',shadow:'#d19947'}),
 'elf_1':Object.freeze({unitId:'elf_1',race:'elf',tier:1,motif:'windblade',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_2':Object.freeze({unitId:'elf_2',race:'elf',tier:2,motif:'veil',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_3':Object.freeze({unitId:'elf_3',race:'elf',tier:3,motif:'oak',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_4':Object.freeze({unitId:'elf_4',race:'elf',tier:4,motif:'snare',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_5':Object.freeze({unitId:'elf_5',race:'elf',tier:5,motif:'windstep',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_6':Object.freeze({unitId:'elf_6',race:'elf',tier:6,motif:'root-cage',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_7':Object.freeze({unitId:'elf_7',race:'elf',tier:7,motif:'purify',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_8':Object.freeze({unitId:'elf_8',race:'elf',tier:8,motif:'twin-arrows',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_9':Object.freeze({unitId:'elf_9',race:'elf',tier:9,motif:'dragonbreath',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'elf_10':Object.freeze({unitId:'elf_10',race:'elf',tier:10,motif:'forest-shield',primary:'#75e9b9',pale:'#d4ffeb',shadow:'#3da779'}),
 'orc_1':Object.freeze({unitId:'orc_1',race:'orc',tier:1,motif:'fury',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_2':Object.freeze({unitId:'orc_2',race:'orc',tier:2,motif:'hunter',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_3':Object.freeze({unitId:'orc_3',race:'orc',tier:3,motif:'shatter',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_4':Object.freeze({unitId:'orc_4',race:'orc',tier:4,motif:'fang',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_5':Object.freeze({unitId:'orc_5',race:'orc',tier:5,motif:'stun-hammer',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_6':Object.freeze({unitId:'orc_6',race:'orc',tier:6,motif:'ambush',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_7':Object.freeze({unitId:'orc_7',race:'orc',tier:7,motif:'storm-chain',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_8':Object.freeze({unitId:'orc_8',race:'orc',tier:8,motif:'earthshock',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_9':Object.freeze({unitId:'orc_9',race:'orc',tier:9,motif:'overlord',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'orc_10':Object.freeze({unitId:'orc_10',race:'orc',tier:10,motif:'armor-rend',primary:'#ffab68',pale:'#ffe1a7',shadow:'#d55b36'}),
 'undead_1':Object.freeze({unitId:'undead_1',race:'undead',tier:1,motif:'bone-wall',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_2':Object.freeze({unitId:'undead_2',race:'undead',tier:2,motif:'phantom',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_3':Object.freeze({unitId:'undead_3',race:'undead',tier:3,motif:'plague',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_4':Object.freeze({unitId:'undead_4',race:'undead',tier:4,motif:'shadow-pierce',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_5':Object.freeze({unitId:'undead_5',race:'undead',tier:5,motif:'blood-drain',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_6':Object.freeze({unitId:'undead_6',race:'undead',tier:6,motif:'hex-curse',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_7':Object.freeze({unitId:'undead_7',race:'undead',tier:7,motif:'dark-surge',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_8':Object.freeze({unitId:'undead_8',race:'undead',tier:8,motif:'wither',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_9':Object.freeze({unitId:'undead_9',race:'undead',tier:9,motif:'death-breath',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'}),
 'undead_10':Object.freeze({unitId:'undead_10',race:'undead',tier:10,motif:'soul-sunder',primary:'#bf9dff',pale:'#efd7ff',shadow:'#8351c6'})
});
function hg403SkillProfile(id){return HG403_SKILL_SIGILS[id]||null}
function drawHG403Sigil(c,id,x,y,age,k=1){
 const p=hg403SkillProfile(id);if(!p||!Number.isFinite(age)||age<0||age>1)return false;
 const fade=Math.pow(1-age,1.15),r=(17+age*32)*Math.max(.45,k),n=3+p.tier%6,
  angle=age*Math.PI*.6+p.tier*.13;
 c.save();c.translate(x,y);c.globalAlpha*=fade*.94;
 c.lineWidth=2.1;c.strokeStyle=p.primary;c.fillStyle=p.pale;
 c.shadowColor=p.shadow;c.shadowBlur=9;
 c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();c.rotate(angle);
 const motif=p.motif;
 if(/shield|aegis|rampart|citadel|sanctuary|oak|bone-wall/.test(motif)){
  c.beginPath();c.moveTo(0,-r*.8);c.lineTo(r*.55,-r*.4);
  c.lineTo(r*.4,r*.5);c.lineTo(0,r*.85);c.lineTo(-r*.4,r*.5);
  c.lineTo(-r*.55,-r*.4);c.closePath();c.stroke();
 }else if(/healing|purify|blood-drain/.test(motif)){
  c.beginPath();c.moveTo(-r*.4,0);c.lineTo(r*.4,0);c.moveTo(0,-r*.4);c.lineTo(0,r*.4);c.stroke();
 }else if(/root|snare|forest|plague|wither/.test(motif)){
  for(let j=0;j<5;j++){const a=j*TAU/5;
   c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(
    Math.cos(a+.35)*r*.4,Math.sin(a+.35)*r*.45,
    Math.cos(a)*r*.82,Math.sin(a)*r*.82);c.stroke();}
 }else if(/arrow|crosshair|hunter|banner/.test(motif)){
  for(let j=0;j<3;j++){c.save();c.rotate(j*TAU/3);
   c.beginPath();c.moveTo(-r*.6,0);c.lineTo(r*.6,0);
   c.lineTo(r*.3,-r*.22);c.moveTo(r*.6,0);c.lineTo(r*.3,r*.22);c.stroke();c.restore();}
 }else if(/storm|stun|sunblade|dragonbreath|death-breath|earthshock/.test(motif)){
  c.beginPath();c.moveTo(-r*.28,-r*.82);c.lineTo(r*.12,-r*.2);
  c.lineTo(-r*.16,0);c.lineTo(r*.36,r*.74);c.stroke();
 }else if(/phantom|veil|shadow|wind|dash|dark-surge/.test(motif)){
  for(let j=0;j<3;j++){c.beginPath();c.arc(0,0,r*(.28+j*.2),
   -Math.PI*.7+j*.22,Math.PI*.23+j*.14);c.stroke();}
 }else if(/fang|shatter|rend|sunder|pierce|ambush|comet/.test(motif)){
  for(let j=0;j<3;j++){c.save();c.rotate(j*TAU/3);
   c.beginPath();c.moveTo(-r*.25,r*.6);c.lineTo(0,-r*.85);
   c.lineTo(r*.20,r*.12);c.stroke();c.restore();}
 }else{
  c.beginPath();for(let j=0;j<2*n;j++){
   const a=j*Math.PI/n-Math.PI/2,t=j%2?r*.28:r*.75;
   if(!j)c.moveTo(Math.cos(a)*t,Math.sin(a)*t);
   else c.lineTo(Math.cos(a)*t,Math.sin(a)*t);
  }c.closePath();c.stroke();
 }
 // Faction color, per-skill motif AND per-tier rune count ensure that a
 // shared Canvas primitive cannot collapse all forty spells into one icon.
 // These rays are decorative receipt effects only, never combat actions.
 for(let j=0;j<2+p.tier;j++){
  const a=j*TAU/(2+p.tier)+age*.35;
  c.beginPath();c.moveTo(Math.cos(a)*r*.66,Math.sin(a)*r*.66);
  c.lineTo(Math.cos(a)*r*.77,Math.sin(a)*r*.77);c.stroke();
 }
 for(let j=0;j<n;j++){const a=j*TAU/n+age*.9;
  c.beginPath();c.arc(Math.cos(a)*r*.85,Math.sin(a)*r*.85,1.3+p.tier%3*.3,0,TAU);c.fill();
 }
 c.restore();return true;
}
// HG14.5: exact receipt-driven visuals, never speculative or backend-mutating.
function battleFxPlan(b,camera,elapsed,layout){
 const byId=new Map(layout.map(e=>[e.id,e])),timeline=battleTimelineFor(b,elapsed);
 return (timeline?.items||[]).flatMap(item=>{
  const event=item.event;if(!(event.damage>0||event.shieldAbsorbed>0)||!event.targetId||elapsed<item.start||elapsed>item.impactAt+960)return [];
  const actor=byId.get(event.actorId),target=byId.get(event.targetId);
  if(!actor||!target)return [];
  const time=elapsed-item.start,
   // Move impacts with the displayed actors, including real recorded Walk
   // paths: a projectile must not strike an obsolete stationary cell.
   actorState=battleVisualState(b,actor.u,elapsed,elapsed),
   targetState=battleVisualState(b,target.u,elapsed,elapsed),
   actorCell=battleVisualPoint(camera,actorState,actor.u),
   targetCell=event.targetAt?camera.center(event.targetAt.x,event.targetAt.y):
    battleVisualPoint(camera,targetState,target.u);
  return [{actorId:event.actorId,targetId:event.targetId,damage:event.damage,
   absorbed:event.shieldAbsorbed||0,
   casualties:event.casualties||0,death:!!event.death,
   kind:event.order||'attack',skill:event.skill||null,actorUnitId:actor.u.unitId,
   ranged:event.order!=='dot'&&actor.u.range>1,
   side:actor.u.side,time,attackStart:item.moveMs,impactMs:item.impactAt-item.start,
   start:{x:actorCell.x+actor.x-actor.baseX,y:actorCell.y+actor.y-actor.baseY-actor.size*.50},
   end:{x:targetCell.x+target.x-target.baseX,y:targetCell.y+target.y-target.baseY-target.size*.52},
   floatX:targetCell.x+target.x-target.baseX+(target.u.side==='player'?-1:1)*Math.max(82,target.size*.75)}];
 });
}
// HG49: chromatic impact paint from the same verified HG09/HG40 battle receipt.
// Pure canvas, frame-local, deterministic spark positions; no extra hit/casualty.
function hg49ImpactBloom(c,fx,color,age,camera){
 if(age<0||age>520)return;
 const t=clamp(age/520,0,1),alpha=(1-t)*(1-t),radius=clamp(camera.radius*.82,15,36);
 const x=fx.end.x,y=fx.end.y;
 c.save();c.globalCompositeOperation='lighter';
 c.globalAlpha=.57*alpha;
 const aura=c.createRadialGradient(x,y,0,x,y,radius*(1.15+t*1.4));
 aura.addColorStop(0,'#fff5d0');
 aura.addColorStop(.22,color);
 aura.addColorStop(1,'#00000000');
 c.fillStyle=aura;c.fillRect(x-radius*3,y-radius*3,radius*6,radius*6);
 for(let ring=0;ring<2;ring++){
  c.globalAlpha=(ring===0?.78:.37)*alpha;c.strokeStyle=ring===0?'#fff3d1':color;
  c.lineWidth=ring===0?2.3:4.2;c.beginPath();
  c.ellipse(x,y,radius*(.31+1.18*t+ring*.21),
   radius*(.12+.55*t+ring*.18),-.14,0,TAU);c.stroke();
 }
 const key=String(fx.actorId)+'|'+String(fx.targetId),seed=[...key].reduce((a,ch)=>a*33+ch.charCodeAt(0),5381)>>>0;
 for(let i=0;i<9;i++){
  const theta=i*2.39996+(seed%73)*.021,span=(.24+((i*7+seed)%11)/14)*radius*(.5+1.3*t);
  const sx=x+Math.cos(theta)*span,sy=y+Math.sin(theta)*span*.68;
  c.globalAlpha=(.35+.60*(i%3)/2)*alpha;c.fillStyle=i%3===0?'#ffffff':color;
  c.save();c.translate(sx,sy);c.rotate(theta);
  c.fillRect(-1.2,-3.9+t*3,2.4,7.8*(1-t)+1.1);
  c.restore();
 }
 c.restore();
}
// HG56 — additive battle VFX, tied to canonical damage receipts and Boss phase.
// Frame-local and deterministic: no new timer, combat stat, reward or Save field.
function hg56ImpactStreaks(c,fx,color,age,camera){
 if(age<0||age>510)return;
 const t=clamp(age/510,0,1),fade=Math.pow(1-t,1.45),
  count=camera.radius<24?5:9,r=clamp(camera.radius*.87,13,43);
 const x=fx.end.x,y=fx.end.y;
 c.save();c.globalCompositeOperation='lighter';
 c.lineCap='round';
 for(let i=0;i<count;i++){
  const theta=i*2.39996323+(fx.side==='enemy'?-.55:.36)+
    (fx.kind==='dot'?1.2:0),span=r*(.30+t*(.9+(i%4)*.14));
  const dx=Math.cos(theta),dy=Math.sin(theta)*.74;
  c.globalAlpha=fade*(i%3===0?.75:.42);
  c.strokeStyle=i%4===0?'#fff9e9':color;
  c.lineWidth=i%3===0?2.4:1.45;
  c.beginPath();c.moveTo(x+dx*span*.58,y+dy*span*.58);
  c.lineTo(x+dx*span,y+dy*span);c.stroke();
 }
 // Staggered arc echoes make hits visually readable behind damage text.
 for(let ring=0;ring<2;ring++){
  c.globalAlpha=fade*(ring?.18:.40);
  c.strokeStyle=ring?color:'#fff8df';
  c.lineWidth=ring?1.35:2.1;
  c.beginPath();c.arc(x,y,r*(.36+t*1.1+ring*.14),
   -(Math.PI*.85)+t*.6+ring,Math.PI*.25+t*.8+ring);c.stroke();
 }
 c.restore();
}
function hg56BossPhaseAura(c,b,camera,elapsed,layout){
 const q=b?.hg50b;if(!q||q.phase==='armed')return;
 const targets=layout.filter(e=>e.u.side==='enemy'&&e.u.pool>0&&
  (q.tier===11?(b.hg40?.shields?.[e.u.id]?.amount||0)>0:
   q.tier===12?Number(e.u.id.replace(/^e/,''))>=16:
   true)).slice(0,q.tier===13?3:4);
 if(!targets.length)return;
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,
  pulse=reduced?.38:.45+.17*Math.sin(elapsed/260),
  tone=q.tier===11?'#7adfff':q.tier===12?'#c2a5ff':'#ff805d';
 c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
 for(const entry of targets){
  const u=entry.u,pos=camera.center(u.x,u.y),
   x=pos.x+entry.x-entry.baseX,y=pos.y+entry.y-entry.baseY-entry.size*.39,
   radius=clamp(entry.size*.34,12,37);
  c.globalAlpha=pulse*(q.phase==='warning'?.82:.53);
  c.strokeStyle=tone;c.lineWidth=q.phase==='warning'?3.4:2.2;
  c.shadowColor=tone;c.shadowBlur=reduced?0:7;
  c.beginPath();c.ellipse(x,y,radius*.91,radius*1.18,0,0,Math.PI*2);c.stroke();
  c.shadowBlur=0;
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2+(reduced?0:elapsed/1800)+(q.tier===12?.6:0);
   c.beginPath();c.arc(x+radius*.83*Math.cos(a),
     y+radius*.94*Math.sin(a),1.7,0,Math.PI*2);c.fillStyle=tone;c.fill();
  }
 }
 c.restore();
}

// HG58 actual HG40 skill trigger: keep names and VFX attached to the
// serialized actor receipt, never infer "special skills" from ordinary hits.
function drawHG58SkillCues(c,b,camera,elapsed,layout){
 const signals=(b.hg40?.lastSkills||[]).filter(x=>x.turn===b.turn-1&&x.actorId);
 if(!signals.length)return;
 const timeline=battleTimelineFor(b,elapsed)?.items||[],byId=new Map(layout.map(e=>[e.id,e]));
 for(const sig of signals){
  const item=timeline.find(x=>x.round===sig.turn&&x.event.actorId===sig.actorId);
  const actor=byId.get(sig.actorId);
  if(!item||!actor||elapsed<item.start||elapsed>item.animationEnd+450)continue;
  const age=Math.max(0,elapsed-item.start),fade=clamp((item.animationEnd+450-elapsed)/370,0,1),
   visual=battleVisualState(b,actor.u,elapsed,elapsed),
   pt=battleVisualPoint(camera,visual,actor.u),
   x=pt.x+actor.x-actor.baseX,y=pt.y+actor.y-actor.baseY,
   enemy=actor.u.side==='enemy',accent=enemy?'#ffae89':'#84eff2',
   radius=clamp(actor.size*.31,11,27),rise=Math.min(16,age/42);
  c.save();c.globalAlpha=fade;c.globalCompositeOperation='source-over';
  c.strokeStyle=accent;c.lineWidth=2.3;
  c.shadowColor=accent;c.shadowBlur=5;
  c.beginPath();c.ellipse(x,y-actor.size*.48,radius*(1+.10*Math.sin(age/100)),
   radius*.8,0,0,TAU);c.stroke();c.shadowBlur=0;
  for(let i=0;i<5;i++){
   const theta=i*TAU/5+age/470,px=x+radius*.8*Math.cos(theta),
    py=y-actor.size*.48+radius*.65*Math.sin(theta);
   c.fillStyle=i%2?'#fff7df':accent;c.beginPath();c.arc(px,py,1.7,0,TAU);c.fill();
  }
  c.font='bold 12px system-ui, sans-serif';c.textBaseline='middle';
  const label='✦ '+sig.skill,width=Math.min(176,Math.max(72,c.measureText(label).width+20)),
   top=Math.max(55,y-actor.size*.87-36-rise),left=clamp(x-width/2,4,c.canvas.width-width-4);
  rounded(c,left,top,width,24,6,enemy?'#4b2335ee':'#14394bee',accent);
  c.fillStyle='#fff5dc';c.textAlign='center';c.fillText(label,left+width/2,top+12);
  c.restore();
 }
}
function motionImpactFx(c,camera,b,elapsed,layout){
 const effects=battleFxPlan(b,camera,elapsed,layout);
 for(const fx of effects){
  const t=fx.time,signature=b.hg40?.v===1?hg403SkillProfile(fx.actorUnitId):null,
   bright=signature?.primary||(fx.kind==='dot'?'#c896ed':
   fx.kind==='skill'?'#a4e8ff':fx.side==='player'?'#ffe3a1':'#ff9e91');
  c.save();
  if(fx.ranged&&t>=fx.attackStart&&t<=fx.impactMs){
   const travel=clamp((t-fx.attackStart)/Math.max(1,fx.impactMs-fx.attackStart),0,1);
   const x=fx.start.x+(fx.end.x-fx.start.x)*travel;
   const y=fx.start.y+(fx.end.y-fx.start.y)*travel-19*Math.sin(Math.PI*travel);
   const angle=Math.atan2(fx.end.y-fx.start.y,fx.end.x-fx.start.x);
   c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=.96;
   c.shadowColor=bright;c.shadowBlur=11;
   line(c,-23,0,9,0,3.7,bright);
   c.shadowBlur=0;
   for(let trail=0;trail<3;trail++){c.globalAlpha=(.45-trail*.12)*Math.sin(Math.PI*travel);
    line(c,-27-trail*10,0,-11-trail*8,0,2.6-trail*.5,bright);}
   c.globalAlpha=.97;
   line(c,9,0,1,-5,1.7,'#fffaf0');line(c,9,0,1,5,1.7,'#fffaf0');
   c.fillStyle='#fffbe6';c.beginPath();c.arc(8,0,2.5,0,TAU);c.fill();
   c.restore();
  }else if(!fx.ranged&&t>=fx.attackStart&&t<=fx.impactMs){
   const phase=clamp((t-fx.attackStart)/Math.max(1,fx.impactMs-fx.attackStart),0,1),fade=1-phase;
   c.globalAlpha=.9*fade;c.strokeStyle=bright;c.lineWidth=3;
   c.beginPath();c.arc(fx.end.x,fx.end.y,27+phase*16,-1.6,1.1);c.stroke();
   c.beginPath();c.arc(fx.end.x+3,fx.end.y-3,19+phase*13,-1.4,.9);c.stroke();
  }
  const afterImpact=t-fx.impactMs;
  hg49ImpactBloom(c,fx,bright,afterImpact,camera);
  hg56ImpactStreaks(c,fx,bright,afterImpact,camera);
  if(signature&&afterImpact>=0&&afterImpact<=480)
   drawHG403Sigil(c,fx.actorUnitId,fx.end.x,fx.end.y,afterImpact/480,clamp(camera.radius/38,.52,1.12));
  if(afterImpact>=0&&afterImpact<=360){
   const scale=clamp(afterImpact/360,0,1);
   c.globalAlpha=(1-scale)*.85;
   c.strokeStyle=fx.side==='player'?'#ffecba':'#ffad9c';c.lineWidth=2.5;
   c.beginPath();c.arc(fx.end.x,fx.end.y,8+24*scale,0,TAU);c.stroke();
  }
  if(afterImpact>=0&&afterImpact<=700){
   const age=afterImpact/700,x=fx.floatX,
    y=fx.end.y-18-34*age;
   c.globalAlpha=clamp((700-afterImpact)/280,0,1);
   c.font='bold 17px sans-serif';c.textAlign='center';c.textBaseline='middle';
   c.lineWidth=3;c.strokeStyle='#1a191b';
   const damageLabel=fx.damage>0?'-'+Math.round(fx.damage):
     '🛡 CHẶN '+Math.round(fx.absorbed||0);
   c.strokeText(damageLabel,x,y);
   c.fillStyle=fx.damage<=0?'#b9e9ff':fx.kind==='dot'?'#d7afff':fx.kind==='skill'?'#b8edff':
    fx.side==='player'?'#ffe4a1':'#ffaea2';
   c.shadowColor=bright;c.shadowBlur=4;
   c.fillText(damageLabel,x,y);
   c.shadowBlur=0;
   if(fx.casualties>0){c.font='bold 11px sans-serif';c.fillStyle='#fff1dc';
    c.strokeText('-'+fx.casualties+' quân',x,y+16);c.fillText('-'+fx.casualties+' quân',x,y+16);}
  }
  if(fx.death&&afterImpact>=0&&afterImpact<=460){
   c.globalAlpha=clamp((460-afterImpact)/350,0,1);
   c.font='bold 22px sans-serif';c.textAlign='center';
   c.strokeStyle='#202128';c.lineWidth=4;
   c.strokeText('✖',fx.end.x,fx.end.y-50);
   c.fillStyle='#ffd0b3';c.fillText('✖',fx.end.x,fx.end.y-50);
  }
  c.restore();
 }
 return effects.length;
}
function hasAnimatedTroops(b){return !!b&&[...b.allies,...b.enemies].some(u=>u.pool>0)}
function animatedSoldier(c,x,y,enemy,visual,k=1){
 if(typeof document==='undefined'||!visual)return false;const frame=vanguardAtlasFrame(visual.action,visual.time,visual.duration),image=document.getElementById(frame.id);
 if(!image?.complete||image.naturalWidth!==1536||image.naturalHeight!==1024)return false;
 const width=clamp(112*k,18,134),height=width*204/192;c.save();c.globalAlpha*=clamp(visual.alpha??1,0,1);c.translate(x,y);if(enemy)c.scale(-1,1);
 c.drawImage(image,frame.sx,frame.sy,frame.sw,frame.sh,-width*.5,-height*.985,width,height);c.restore();return true;
}
// HG60: repeated asset resolution previously normalized every Boss name and
// re-resolved atlases for each frame, sprite, label and VFX. One bounded
// presentation-only cache; preserve named Boss priority and all animation.
const troopAtlasCache=new Map();
function troopAtlasDefinition(unitId,actorName=''){
 const key=String(unitId||'')+'|'+String(actorName||'');
 if(troopAtlasCache.has(key))return troopAtlasCache.get(key);
 const atlas=root.HOG_HG33_TROOP_ATLASES,
  value=atlas?.resolve?.(unitId,actorName)||atlas?.units?.[unitId]||null;
 if(troopAtlasCache.size>=128)troopAtlasCache.clear();
 troopAtlasCache.set(key,value);
 return value;
}
function troopAtlasFrame(unitId,action,time=0,duration=null,actorName=''){
 const unit=troopAtlasDefinition(unitId,actorName);if(!unit)return null;
 const clip=unit.actions[action]||unit.actions.idle,ms=Math.max(1,duration||clip.durationMs),t=Math.max(0,Number.isFinite(time)?time:0),raw=Math.floor(t/ms*clip.count),frame=clip.loop?raw%clip.count:Math.min(clip.count-1,raw);
 const frameSize=unit.frameDimensions||[unit.frameWidth,unit.frameHeight];return {unitId,actorName,action,frame,row:clip.row,sx:frame*frameSize[0],sy:clip.row*frameSize[1],sw:frameSize[0],sh:frameSize[1],imageId:unit.imageId};
}
// HG40.7 presentation-only Walk foot stabilization, measured from authored
// runtime alpha: central x=52..140, alpha>45, 192x204 original cells.
// Reference is each unit's median idle contact row; full-height frame-edge
// effects are interpolated from real adjacent valid walk frames. Native HG14
// Archer is unchanged. No gameplay, collision or Save v07 coordinates shift.
const HG407_WALK_FOOT=Object.freeze({
 human_1:[0,-1,-1,3,-1,3,1,4],human_2:[0,2,0,0,1,2,2,0],
 human_4:[4,4,4,4,4,4,4,4],human_5:[-1,4,7,-1,-1,-1,4,-2],
 human_6:[5,4,4,5,5,5,7,4],human_7:[2,2,4,1,2,2,1,2],
 human_8:[-1,-1,-1,-1,-1,0,0,-1],human_9:[0,1,1,-1,1,0,0,1],
 human_10:[1,2,13,8,4,2,3,3],
 elf_1:[3,4,4,4,3,2,2,7],elf_2:[3,4,5,6,6,6,6,4],
 elf_3:[2,0,-2,-1,0,-1,-2,6],elf_4:[-1,3,1,2,2,2,2,3],
 elf_5:[0,2,8,8,6,0,0,0],elf_6:[2,6,0,2,2,2,2,4],
 elf_7:[-1,3,4,6,8,7,8,4],elf_8:[6,6,8,9,9,9,8,7],
 elf_9:[0,-1,0,0,1,2,2,0],elf_10:[7,5,7,9,3,7,1,10],
 orc_1:[0,2,1,1,1,1,1,0],orc_2:[5,6,6,7,5,5,5,5],
 orc_3:[-1,0,2,1,0,0,0,-1],orc_4:[4,4,10,4,4,4,4,10],
 orc_5:[2,9,6,7,4,1,2,2],orc_6:[2,0,8,-2,0,19,2,2],
 orc_7:[-2,-2,1,-4,-5,-1,1,0],orc_8:[-3,8,-2,-1,0,2,4,1],
 orc_9:[1,1,1,2,4,0,0,-3],orc_10:[18,23,20,19,17,13,12,13],
 undead_1:[0,0,1,0,0,0,0,0],undead_2:[2,4,8,14,10,16,0,6],
 undead_3:[0,2,2,0,-2,-3,-2,0],undead_4:[8,16,28,26,24,20,12,8],
 undead_5:[-1,2,2,1,1,2,0,2],undead_6:[2,5,3,3,3,4,5,3],
 undead_7:[1,1,1,4,3,6,5,4],undead_8:[17,15,13,13,13,13,12,13],
 undead_9:[3,3,15,15,14,14,14,13],undead_10:[6,10,22,36,36,36,36,36]
});
function hg407FootOffset(unitId,action,frame,drawHeight,frameHeight=204){
 if(action!=='walk'||!Number.isFinite(drawHeight)||drawHeight<=0)return 0;
 const source=HG407_WALK_FOOT[unitId]?.[frame];
 return Number.isFinite(source)?source*drawHeight/frameHeight:0;
}
function animatedTroopAtlas(c,x,y,enemy,visual,k,unitId,actorName=''){
 const unit=troopAtlasDefinition(unitId,actorName);if(!unit||!visual||typeof document==='undefined')return false;
 const frame=troopAtlasFrame(unitId,visual.action,visual.time,visual.duration,actorName),image=document.getElementById(unit.imageId);if(!image)return false;
 if(!image.hasAttribute('src')){const src=image.dataset.hg33AtlasSrc;if(src){image.src=src;}return false;}
 const atlasSize=unit.atlasDimensions||[unit.atlasWidth,unit.atlasHeight],frameSize=unit.frameDimensions||[unit.frameWidth,unit.frameHeight];
 if(!image.complete||image.naturalWidth!==atlasSize[0]||image.naturalHeight!==atlasSize[1])return false;
 const width=clamp(unit.renderWidth*k,18,160),height=width*frameSize[1]/frameSize[0];
 c.save();c.globalAlpha*=clamp(visual.alpha??1,0,1);c.translate(x,y);if(hg63BattleMirror(enemy,unit.enemyFacing||'right'))c.scale(-1,1);
 const groundFix=hg407FootOffset(unitId,frame.action,frame.frame,height,frameSize[1]);
 const paintedY=-height*unit.pivot+groundFix;
 // Original Orc T10 Walk frames 2/3 contain stray duplicate alpha at the
 // atlas-row bottom, distinct from the main creature silhouette (observed
 // by real Chromium alpha audit). Mask ONLY those two source-frame overflows;
 // preserve the authored art, movement, hex anchor and all damage receipts.
 if(unitId==='orc_10'&&frame.action==='walk'&&(frame.frame===2||frame.frame===3)){
  c.beginPath();c.rect(-width*.5-1,paintedY-1,width+2,Math.max(1,3-paintedY));c.clip();
 }
 c.drawImage(image,frame.sx,frame.sy,frame.sw,frame.sh,-width*.5,paintedY,width,height);c.restore();return true;
}
function battleUnitArt(c,x,y,enemy,visual,k,u){
 if(troopAtlasDefinition(u.unitId,u.name))return animatedTroopAtlas(c,x,y,enemy,visual,k,u.unitId,u.name);
 if(u.unitId==='human_4')return animatedSoldier(c,x,y,enemy,visual,k);
 if(u.unitId==='human_3')return animatedArcher(c,x,y,enemy,visual,k)||motionSprite(c,x,y,u.unitId,enemy,visual,k,u.name);
 // Catalog actors use the original HG33 atlases above. Any uncovered NPC
 // falls back only to project-authored rigs or locally drawn geometry.
 return root.HOG_HG28_RIGS?.draw(c,x,y,u.unitId,enemy,visual,k)||motionSprite(c,x,y,u.unitId,enemy,visual,k,u.name);
}// HG33-H1: one real pointy-top odd-r hex projection shared with engine.js.
// Canonical Save v07 positions remain integer offset coordinates.
function battleProjection(canvas,E){
 const g=E.BATTLE_GRID||{cols:12,rows:9},hex=E.battleHex,w=canvas.width,h=canvas.height;
 const spanY=1.5*(g.rows-1)+2,spanX=Math.sqrt(3)*(g.cols+.5),
  radius=Math.max(8,Math.min((w-24)/spanX,(h-90)/spanY)),
  boardW=spanX*radius,boardH=spanY*radius,
  left=(w-boardW)/2,top=Math.max(62,Math.min(h-boardH-10,h*.14)),
  origin={x:left+Math.sqrt(3)*radius/2,y:top+radius};
 const center=(x,y)=>hex.center(x,y,radius,origin),
  corners=(x,y)=>hex.corners(x,y,radius,origin),
  point=(cx,cy)=>center(Math.round(cx-.5),Math.round(cy-.5)),
  pointBetween=(from,to,t)=>{const a=center(from.x,from.y),b=center(to.x,to.y),f=clamp(t,0,1);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}},
  cellAt=(px,py)=>hex.pixelToCell(px,py,radius,origin,g);
 return {g,hex,origin,radius,boardW,boardH,center,corners,point,pointBetween,cellAt};
}
function battleVisualPoint(camera,visual,fallback){
 // HG59: odd-r offset rows are DISCRETE. Passing a fractional row into
 // battleHex.center() changes row parity before reaching the next real hex,
 // so a smooth logical walk can make the sprite foot jump sideways.
 // Interpolate in PIXEL SPACE between the real neighboring hex centres.
 // Reapply the same per-step smoothstep used by battleVisualState.
 // Hitboxes and authoritative integer Save v07 positions are unchanged.
 const route=Array.isArray(visual?.walkRoute)?visual.walkRoute:null;
 if(route?.length&&Number.isFinite(visual?.walkFraction)){
  const progress=clamp(visual.walkFraction,0,1)*route.length,
   index=Math.min(route.length-1,Math.floor(progress)),
   fraction=clamp(progress-index,0,1),
   eased=fraction*fraction*(3-2*fraction),
   from=index?route[index-1]:(visual.walkFrom||fallback),
   to=route[index];
  // Some supported render callers supply only camera.center (e.g. NPC
  // fallback previews). Use the two integer hex anchors directly.
  const a=camera.center(from.x,from.y),z=camera.center(to.x,to.y);
  return {x:a.x+(z.x-a.x)*eased,y:a.y+(z.y-a.y)*eased};
 }
 return camera.center(visual?.x??fallback.x,visual?.y??fallback.y);
}
function battleGround(c,camera,w,h){
 // A transparent, landscape-consistent grade. The illustrated meadow is the
 // playable surface itself: no polygon platform, board edges or permanent grid.
 const grade=c.createLinearGradient(0,h*.28,0,h);
 grade.addColorStop(0,'#183a2900');
 grade.addColorStop(.65,'#16311e0a');
 grade.addColorStop(1,'#0e1c1421');
 c.fillStyle=grade;c.fillRect(0,0,w,h);
}
// HG14.5: identical 12x9 cell geometry for visible grid and pointer hit testing.
function battleGridCells(camera){
 const cells=[];
 for(let y=0;y<camera.g.rows;y++)for(let x=0;x<camera.g.cols;x++)
  cells.push({x,y,center:camera.center(x,y),corners:camera.corners(x,y)});
 return cells;
}
function battleGridOverlay(c,camera,layout,reachable){
 // Optional tactical guide, deliberately distinct from the visual ground.
 // The 108 logical hit cells always exist even when grid lines are hidden.
 // Sparse soft edges prevent the wireframe from fighting the fantasy backdrop.
 const cells=battleGridCells(camera);
 c.save();
 for(const cell of cells){
  const highlighted=reachable.has(cell.x+','+cell.y);
  if(highlighted){
   c.lineWidth=1.7;
   poly(c,cell.corners.map(p=>[p.x,p.y]),'#43cba52a','#9bead0b3');
  }else{
   c.lineWidth=.72;
   poly(c,cell.corners.map(p=>[p.x,p.y]),null,'#e9dfbd27');
  }
 }
 // No floating origin dots, diagonal foot connectors or coordinate numbers:
 // selection rings already identify actors; the grid is just a guide.
 c.restore();
 return cells.length;
}
function battleCellAt(canvas,x,y,E){return battleProjection(canvas,E).cellAt(x,y)}
function battleHit(canvas,x,y,E,s,now=visualNow()){
 const b=s.battle;if(!b)return null;
 const camera=battleProjection(canvas,E),elapsed=battleElapsed(b,now),
  layout=battleUnitLayout(b,camera,canvas.width,canvas.height,now);
 // The image, number plate and foot pivot can occupy very different pixels:
 // selecting by foot radius alone makes the upper half of tall troops unclickable.
 // Transform hitboxes by the same animation/spacing offset as drawBattle().
 const visible=layout.filter(entry=>entry.u.pool>0).map(entry=>{
  const u=entry.u,visual=battleVisualState(b,u,elapsed,now)||u,
   pt=battleVisualPoint(camera,visual,u);
  return {entry,u,dx:pt.x-entry.baseX,dy:pt.y-entry.baseY,
   footX:pt.x+entry.x-entry.baseX,footY:pt.y+entry.y-entry.baseY};
 }).sort((a,b)=>a.entry.y-b.entry.y||a.entry.x-b.entry.x);
 const inside=(rect)=>x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h;
 // HG44-H: A deliberate tap at the actual unit hex center must select its
 // canonical owner, even while a neighboring troop is visibly walking across
 // that pivot on the previous turn's animation timeline. HG41's 3x2 stacks
 // exposed the bug: a p0 foot tap could select p4 during a mid-walk frame.
 // Use a narrow center-only priority; sprite/label/hit animation remains
 // active for taps elsewhere. Pure hit testing; Save v07 is untouched.
 const homeRadius=Math.max(9,camera.radius*.32);
 let home=null,homeDistance=homeRadius;
 for(const e of visible){
  const d=Math.hypot(e.entry.baseX-x,e.entry.baseY-y);
  if(d<homeDistance){home=e.u;homeDistance=d}
 }
 if(home)return home;
 let anchored=null,anchorDistance=Math.max(16,canvas.width*.019);
 for(const e of visible){
  const d=Math.hypot(e.footX-x,e.footY-y);
  if(d<anchorDistance){anchored=e.u;anchorDistance=d}
 }
 if(anchored)return anchored; // A genuine click on a unit's feet must win.
 // Nameplates are rendered over silhouettes and are selectable too.
 for(let i=visible.length-1;i>=0;i--){
  const e=visible[i],l=e.entry.label;
  if(l&&inside({x:l.x+e.dx,y:l.y+e.dy,w:l.w,h:l.h}))return e.u;
 }
 // Prefer the frontmost actually drawn sprite where silhouettes intersect.
 for(let i=visible.length-1;i>=0;i--){
  const e=visible[i],q=e.entry.sprite;
  if(q&&inside({x:q.x+e.dx-2,y:q.y+e.dy-2,w:q.w+4,h:q.h+4}))return e.u;
 }
 // Retain forgiving taps around the ground markers for existing controls.
 let nearest=null,distance=Math.max(38,canvas.width*.055);
 for(const e of visible){
  const d=Math.hypot(e.footX-x,e.footY-y);
  if(d<distance){nearest=e.u;distance=d}
 }
 return nearest;
}
function soldier(c,x,y,k=1,color='#c5bc98',enemy=false,archer=false,unitId=null,unitName=''){
 // Illustrations are keyed to the actual troop archetype, not the quantity
 // of soldiers in its stack. Unknown troop art uses an honest emblem fallback.
 const named={
  'dã thú':'battle-unit-npc-beast',
  'cung thủ cướp':'battle-unit-npc-archer',
  'vệ binh':'battle-unit-npc-guard',
  'azrael':'hg28-boss-azrael',
  'cyclop tyrant':'hg28-boss-cyclops-tyrant',
  'demonlord samurai':'hg28-boss-demonlord-samurai'
 };
 const spriteIds={
  orc_1:'unit-orc-imp',elf_1:'unit-elf-centaur',elf_2:'unit-elf-scout',
  human_3:'unit-human-archer',undead_1:'unit-undead-skeleton',
  human_1:'hg28-battle-human-spear-militia'
 };
 const normalizedName=String(unitName||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
 const boss=bossSprite(unitName),spriteKey=spriteIds[unitId]||named[normalizedName]||null;
 const size=clamp((boss?.size||113)*k,18,boss?178:125);
 if(spriteKey&&typeof document!=='undefined'){
  const sprite=document.getElementById(spriteKey);
  if(sprite?.complete&&sprite.naturalWidth>0){
   const isLegacy=spriteKey.startsWith('unit-');
   const pivot=boss?.pivot||(isLegacy?446/512:239/256);
   c.save();
   if(hg63BattleMirror(enemy,boss?'left':'right')){c.translate(x,y);c.scale(-1,1);c.drawImage(sprite,-size/2,-size*pivot,size,size)}
   else c.drawImage(sprite,x-size/2,y-size*pivot,size,size);
   c.restore();return true;
  }
 }
 const generated=root.HOG_ART_PACK?.hasUnit(unitId)?root.HOG_ART_PACK.unitImage(unitId):null;
 if(generated?.complete&&generated.naturalWidth){
  c.save();c.translate(x,y);if(enemy)c.scale(-1,1);
  c.drawImage(generated,-size/2,-size*118/128,size,size);c.restore();return true;
 }
 // Fallback for missing art and non-catalog NPCs.
 // intentionally no giant stick figures or incorrect reassignment to other races.
 c.save();c.translate(x,y);
 const r=clamp(34*k,29,39);
 circle(c,0,-r*.7,r+3,'#142a35d8');
 poly(c,[[-r,-r],[r,-r],[r*.80,r*.25],[0,r*.63],[-r*.80,r*.25]],enemy?'#6b4c50':'#44657b','#d4bf8f');
 poly(c,[[-r*.70,-r*.82],[r*.70,-r*.82],[r*.54,r*.12],[0,r*.40],[-r*.54,r*.12]],enemy?'#8f6566':'#6d95aa','#a4c0bc');
 if(archer){c.strokeStyle='#e3c98d';c.lineWidth=4;c.beginPath();c.arc(0,-r*.17,r*.42,-1.4,1.4);c.stroke();line(c,0,-r*.67,0,r*.35,2,'#eadfc1')}
 else{line(c,-r*.16,-r*.72,r*.15,r*.13,5,'#e4d4a3');poly(c,[[-r*.33,-r*.81],[-r*.11,-r*1.22],[r*.05,-r*.88]],'#c5d9df','#8a9eaf')}
 c.restore();return false;
}
// Consistent sprite sizes on desktop and compact mobile landscape battle scenes.
// HG14.4: deterministic and presentation-only spacing + nameplate placement.
// Canonical battle x/y, commands, receipts, and Save/Load are left untouched.
function battleRectOverlap(a,b,pad=0){
 return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
}
// Label collision resolution has a wide candidate search and must never be
// repeated 60 times a second while actors remain on the same canonical cells.
// A WeakMap keeps this strictly presentation-only: no Save v07 fields added.
const battleLayoutCache=new WeakMap();
function battleUnitLayout(b,camera,width,height,now=visualNow()){
 const actors=[...b.allies,...b.enemies];
 // HG42: 16 enemy Boss stacks must not each trigger the quadratic search for
 // a full floating nameplate. Keep one full label for the focused enemy only.
 // This is presentation-only; every actor stays drawn, targetable and saved.
 const denseBoss=!!b.hg410?.boss&&b.hg410.enemyStacks>=12;
 const signature=width+'x'+height+'|'+camera.radius+'|'+b.turn+'|'+(denseBoss?(b.focused||'none'):'')+'|'+actors.map(u=>
  [u.id,u.side,u.unitId,u.name,u.x,u.y,battleVisualPool(b,u,now)>0?1:0].join(':')).join('|');
 const cached=battleLayoutCache.get(b);
 if(cached?.signature===signature)return cached.entries;
 const entries=actors.map(u=>{
  const pt=camera.center(u.x,u.y);
  // 16 real Boss actors occupy neighboring HG41 hexes. Scale only their
  // presentation sprites so every source atlas, foot anchor and hitbox stays
  // legible in two nine-cell columns; do not alter HP, stacks or Save v07.
  const sourceK=battleSpriteScale(height,u.y,camera.g.rows,camera.radius),
   // HG61: in compact desktop 960x540 3-hero Boss formation, player
   // top-row atlases overlapped the real 37px combat HUD by 3.6px.
   // Keep the foot exactly on its true hex; scale only that row's art.
   k=denseBoss&&u.side==='enemy'?sourceK*.54:
    denseBoss&&u.side==='player'&&u.y===0&&width<=960?sourceK*.86:sourceK,
   profile=bossSprite(u.name)||MOTION_SPRITES[u.unitId]||root.HOG_HG33_TROOP_ATLASES?.profile(u.unitId,u.name)||root.HOG_HG28_TROOPS?.profile(u.unitId),size=clamp((profile?.size||113)*k,camera.radius*(denseBoss&&u.side==='enemy'?.45:1.05),camera.radius*(profile?.boss?3.15:1.9));
  return {id:u.id,u,x:pt.x,y:pt.y,baseX:pt.x,baseY:pt.y,k,size,profile,displayPool:battleVisualPool(b,u,now)};
 });
 // Do not shift the boot anchor away from the canonical hex centre to
 // separate sprites: painter's depth sort and label solver handle overlap.
 for(const e of entries){
  e.x=e.baseX;e.y=e.baseY;
  const atlas=troopAtlasDefinition(e.u.unitId,e.u.name),
   dims=atlas?.frameDimensions||[atlas?.frameWidth||192,atlas?.frameHeight||204],
   width=atlas?clamp(atlas.renderWidth*e.k,18,160):e.size*.96,
   spriteH=width*dims[1]/dims[0],
   pivot=atlas?.pivot??e.profile?.pivot??.87;
  // The old approximate 0.96*size box did not match the real rendered atlas.
  // Share exactly the atlas's dest rectangle with hit testing & labels.
  e.sprite={x:e.x-width/2,y:e.y-spriteH*pivot,w:width,h:spriteH};
  // Dense Boss badges sit at their own feet, rather than across the next
  // enemy column. Keep atlas and badge rectangles shared with the QA solver.
  e.countBox=denseBoss&&e.u.side==='enemy'
   ?{x:e.x-18,y:e.y-10,w:36,h:14}
   :{x:e.x+22,y:e.y-23,w:37,h:19};
 }
 // HG40.3 Visual Gate: keep every dynamic name/HP plate clear of the
 // two team meters, round clock and bottom battle ticker, at all viewports.
 // These are the exact HUD bounds used by drawHG403BattleHUD; do not move
 // canonical hex anchors or alter combat receipts to solve a visual overlap.
 const hudWidth=clamp(width*.205,94,235);
 const reserved=[
  {x:12,y:9,w:hudWidth,h:37},
  {x:width/2-58,y:9,w:116,h:37},
  {x:width-12-hudWidth,y:9,w:hudWidth,h:37},
  {x:12,y:height-36,w:Math.max(0,width-24),h:27}
 ];
 for(const e of [...entries].filter(e=>e.displayPool>0).sort((a,b)=>a.y-b.y||a.x-b.x)){
  if(denseBoss&&e.u.side==='enemy'&&e.u.id!==b.focused){
   e.label=null; // Small HP/count only; selected enemy recovers full name.
   continue;
  }
  const compact=width<1050,w=compact?clamp(e.u.name.length*4.8+12,68,90):clamp(e.u.name.length*6.5+24,82,132),h=28,shift=e.size*.37+w/2+12;
  const left={cx:e.x-shift,top:e.y-60,mode:'left'},
   right={cx:e.x+shift,top:e.y-60,mode:'right'},
   upperLeft={cx:e.x-shift,top:e.y-87,mode:'upper-left'},
   upperRight={cx:e.x+shift,top:e.y-87,mode:'upper-right'},
   lowerLeft={cx:e.x-shift,top:e.y-34,mode:'lower-left'},
   lowerRight={cx:e.x+shift,top:e.y-34,mode:'lower-right'};
  const preferRight=e.u.side==='player';
  const candidates=[
   {cx:e.x,top:e.y-e.size*.83-36,mode:'above'},
   ...(preferRight?[right,left]:[left,right]),
   ...(preferRight?[upperRight,upperLeft]:[upperLeft,upperRight]),
   {cx:e.x,top:e.y-e.size*.83-54,mode:'high'},
   ...(preferRight?[lowerRight,lowerLeft]:[lowerLeft,lowerRight]),
   ...[-1,1].flatMap(sign=>[-1.35,1.35].map(mult=>({cx:e.x+sign*(e.size*.36+w*mult+24),top:e.y-e.size*.83-36,mode:'outer'}))),
   ...[-1,1].flatMap(sign=>[-1.35,1.35].flatMap(mult=>[-82,-112,-142,12,42].map(offset=>({cx:e.x+sign*(e.size*.36+w*mult+24),top:e.y+offset,mode:'outer'})))),
   ...[-1,1].flatMap(sign=>[-112,-142,12,42].map(offset=>({cx:e.x+sign*shift,top:e.y+offset,mode:'side'})))
  ];
  const scoreChoice=(choice,i)=>{
   const box={x:clamp(choice.cx-w/2,12,Math.max(12,width-w-12)),
    y:clamp(choice.top,60,Math.max(60,height-h-6)),w,h};
   let conflicts=0;
   for(const other of entries){
    if(other.displayPool<=0)continue;
    if(battleRectOverlap(box,other.sprite,3))conflicts+=other===e?100:10;
    if(battleRectOverlap(box,other.countBox,2))conflicts+=5;
   }
   for(const other of reserved)if(battleRectOverlap(box,other,3))conflicts+=8;
   const distance=Math.hypot(box.x+w/2-e.x,box.y-(e.y-e.size*.83-36));
   return {...box,mode:choice.mode,conflicts,score:conflicts*100000+distance+i*.01};
  };
  const preferred=candidates.map(scoreChoice),preferredSafe=preferred.filter(c=>c.conflicts===0);
  let best=preferredSafe.sort((a,b)=>a.score-b.score)[0];
  if(!best){
   const maxX=Math.max(12,width-w-12),maxY=Math.max(60,height-h-6),xs=[],ys=[];
   for(let x=12;x<=maxX;x+=20)xs.push(x);if(xs[xs.length-1]!==maxX)xs.push(maxX);
   for(let y=60;y<=maxY;y+=14)ys.push(y);if(ys[ys.length-1]!==maxY)ys.push(maxY);
   let fallback=null;
   for(const x of xs)for(const y of ys){
    const candidate=scoreChoice({cx:x+w/2,top:y,mode:'field'},0);
    if(candidate.conflicts===0){if(!best||candidate.score<best.score)best=candidate}
    else if(!fallback||candidate.conflicts<fallback.conflicts||candidate.conflicts===fallback.conflicts&&candidate.score<fallback.score)fallback=candidate;
   }
   best=best||fallback;
  }
  e.label={x:best.x,y:best.y,w:best.w,h:best.h,fontSize:compact?9:11,mode:best.mode,
   leader:best.mode!=='above'&&best.mode!=='high'};
  reserved.push(e.label);
 }
 battleLayoutCache.set(b,{signature,entries});
 return entries;
}
function battleSpriteScale(height,row,rows=9,radius=null){
 // A hex-based scale keeps silhouettes inside the pointy cells at compact
 // viewports. Legacy callers without a radius retain their responsive scale.
 const base=Number.isFinite(radius)?clamp(radius/60,.22,.82):clamp(height/740,.48,.82);
 return base*(.99+row/rows*.05);
}
// HG38: Open Field PNG, ground grade and the 108 static hex strokes have no
// reason to be rasterized 60 times per second. Cache one canvas per active
// battlefield canvas/viewport and rebuild ONLY if the image, size or grid
// visibility changes. Preview highlights and every actor remain dynamic.
const battleStaticLayers=new WeakMap();
function paintBattleStaticScene(c,canvas,E,showGrid){
 const w=canvas.width,h=canvas.height;
 const field=typeof document!=='undefined'?document.getElementById('battlefield-human-meadow'):null;
 if(field?.complete&&field.naturalWidth){
  const sw=field.naturalWidth,sh=field.naturalHeight,cropW=Math.min(sw,sh*w/h),cropH=Math.min(sh,sw*h/w);
  c.drawImage(field,(sw-cropW)/2,(sh-cropH)/2,cropW,cropH,0,0,w,h);
 }
 else{const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#354a50');sky.addColorStop(.56,'#4e6659');sky.addColorStop(1,'#798060');c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let i=0;i<25;i++){const x=(i*79)%w;tree(c,x,142+random(i,4)*36,.95+random(i,6)*.6,'pine')}
  poly(c,[[0,196],[w,196],[w,h],[0,h]],'#766d56');for(let i=0;i<25;i++){const x=random(i,9)*w,y=210+random(i,8)*(h-220);line(c,x,y,x+19,y+8,2,'#c3b59050')}}
 const camera=battleProjection(canvas,E);
 battleGround(c,camera,w,h);
 if(showGrid)battleGridOverlay(c,camera,[],new Set());
}
function battleStaticLayer(canvas,E,showGrid){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const img=document.getElementById('battlefield-human-meadow');
 // The single-file HTML embeds a large base64 PNG as img.src. Reading and
 // comparing that megabyte-scale URL 60×/s defeats a hot-path cache.
 // Source identity is fixed for the running HTML; decoded dimensions detect
 // the load transition, and the version tag identifies the original asset.
 const src=img?.dataset?.battleBackground||'',
  nw=img?.naturalWidth||0,nh=img?.naturalHeight||0;
 const old=battleStaticLayers.get(canvas);
 if(old&&old.width===canvas.width&&old.height===canvas.height&&
    old.grid===showGrid&&old.img===img&&old.src===src&&old.nw===nw&&old.nh===nh){
  old.hits++;return old.layer;
 }
 const layer=document.createElement('canvas');
 layer.width=canvas.width;layer.height=canvas.height;
 const cx=layer.getContext('2d');
 if(!cx)return null;
 paintBattleStaticScene(cx,canvas,E,showGrid);
 battleStaticLayers.set(canvas,{layer,width:canvas.width,height:canvas.height,
  grid:showGrid,img,src,nw,nh,builds:(old?.builds||0)+1,hits:old?.hits||0});
 return layer;
}
function battleStaticCacheStats(canvas){
 const o=battleStaticLayers.get(canvas);
 return o?{builds:o.builds,hits:o.hits,width:o.width,height:o.height,
  grid:o.grid,imageLoaded:o.nw>0&&o.nh>0}:null;
}

function drawHG403ProcCues(c,b,elapsed,layout){
 if(b.hg40?.v!==1||!b.hg40.lastSkills?.length)return 0;
 const timeline=battleTimelineFor(b,elapsed)?.items||[],
  byId=new Map(layout.map(e=>[e.id,e]));
 let shown=0;
 // Only confirmed HG40 journal activations on an actual actor hit.
 // Generic hit sigils alone are NOT a claim of a passive skill proc.
 for(const item of timeline){
  const actor=byId.get(item.event.actorId),age=elapsed-item.impactAt;
  if(!actor||!(item.event.damage>0)||age<0||age>620)continue;
  const skill=root.HOG_ENGINE?.HG40_TRAITS?.[actor.u.unitId];
  if(!skill)continue;
  const note=b.hg40.lastSkills.find(n=>n.turn===item.round&&
   n.skill===skill.name&&n.detail.startsWith(actor.u.name+' kích hoạt '));
  if(!note)continue;
  // Skill names on top-row actors must stay below the 46px team/turn HUD.
  // Clamp only the floating receipt cue, never the actor or canonical hex.
  const x=actor.x,y=Math.max(99,actor.y-actor.size*.65);
  drawHG403Sigil(c,actor.u.unitId,x,y,age/620,Math.max(.65,actor.k));
  c.save();c.globalAlpha=clamp((620-age)/220,0,1);
  c.font='bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.lineWidth=3;c.strokeStyle='#192128';
  c.strokeText(note.skill,x,y-24-age*.025);
  c.fillStyle=hg403SkillProfile(actor.u.unitId)?.pale||'#fff0c5';
  c.fillText(note.skill,x,y-24-age*.025);
  c.restore();shown++;
 }
 return shown;
}
function drawHG403BattleHUD(c,b,w,h){
 const width=clamp(w*.205,94,235),gap=12,compact=w<520,
  sides=[{troops:b.allies,x:gap,label:compact?'TA':'QUÂN TA',color:'#8cdfa5'},
         {troops:b.enemies,x:w-gap-width,label:compact?'ĐỊCH':'ĐỐI THỦ',color:'#f3a18d'}];
 for(const v of sides){
  const active=v.troops.filter(u=>u.pool>0),
   hp=v.troops.reduce((n,u)=>n+Math.max(0,u.pool||0),0),
   total=v.troops.reduce((n,u)=>n+Math.max(1,(u.initial||u.count||1)*u.hp),0);
  rounded(c,v.x,9,width,37,7,'#15252be9','#b0bdab79');
  c.save();c.font='bold 12px sans-serif';c.textBaseline='middle';
  c.textAlign='left';c.fillStyle=v.color;c.fillText(v.label,v.x+10,22);
  c.textAlign='right';c.fillStyle='#f7eddc';
  c.fillText(compact?String(active.length):active.length+' đội',v.x+width-10,22);
  rounded(c,v.x+10,30,width-20,7,3,'#071218df');
  c.fillStyle=v.color;c.fillRect(v.x+11,31,(width-22)*clamp(total?hp/total:0,0,1),5);
  c.restore();
 }
 rounded(c,w/2-58,9,116,37,7,'#1b3033ef','#e0c59577');
 text(c,'LƯỢT '+Math.max(1,b.turn),w/2,33,17,'#ffedc4');
 const note=b.hg40?.lastSkills?.filter(x=>x.turn===b.turn-1).slice(-1)[0],
  latest=(b.history||[]).find(x=>/^Lượt \d+:/.test(x)),
  report=note?.detail||latest||'';
 if(report){
  rounded(c,gap,h-36,w-gap*2,27,6,'#152831dc','#c8d4c75c');
  c.save();c.font='bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillStyle=note?'#baf3c6':'#f5e5d0';
  let value=report.slice(0,160);const max=w-gap*2-22;
  while(value.length>4&&c.measureText(value).width>max){
   value=value.endsWith('…')?value.slice(0,-5)+'…':value.slice(0,-4)+'…';
  }
  c.fillText(value,w/2,h-22);c.restore();
 }
}
// HG40.7: atlas profiles can carry long names (especially T9/T10).
// Keep the entire label inside its native Canvas plate instead of drawing
// across a neighbor's HP bar. Cache by literal text/width/font for RAF cost.
const battleNameplateTextCache=new Map();
function hg407FitName(c,value,maxWidth,fontSize=11){
 const name=String(value??''),width=Math.max(5,maxWidth||0),
  key=fontSize+'|'+Math.round(width)+'|'+name;
 if(battleNameplateTextCache.has(key))return battleNameplateTextCache.get(key);
 c.save();c.font='600 '+fontSize+'px Georgia,serif';
 let result=name;
 if(c.measureText(result).width>width){
  let lo=0,hi=name.length;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);
   if(c.measureText(name.slice(0,mid)+'…').width<=width)lo=mid;
   else hi=mid-1;
  }
  result=name.slice(0,lo).trimEnd()+'…';
 }
 c.restore();
 if(battleNameplateTextCache.size>400)battleNameplateTextCache.clear();
 battleNameplateTextCache.set(key,result);
 return result;
}
// HG45.1: real combat-side commander aura. It is pure canvas paint on the
// already-rendered army pivot, never a synthetic hit, damage, buff or Save field.
function hg451RarityAura(c,x,y,scale,kind,now){
 if(kind!=='platinum'&&kind!=='rainbow')return;
 const t=Number.isFinite(now)?now/1000:0;
 const rad=Math.max(13,Math.min(42,20*scale)),pulse=1+.05*Math.sin(t*2);
 c.save();c.translate(x,y+2);c.lineWidth=kind==='platinum'?2.2:1.7;
 if(kind==='platinum'){
  c.strokeStyle='#bfeeffc4';c.shadowColor='#a7e7ff';c.shadowBlur=9;
  c.beginPath();c.ellipse(0,0,rad*pulse,rad*.35*pulse,0,0,TAU);c.stroke();
  // Pale six-point protection glyph, no invented HP effect.
  c.strokeStyle='#e3fcffb9';c.beginPath();
  for(let n=0;n<6;n++){const a=n*TAU/6+t*.18;const px=Math.cos(a)*rad*.9,py=Math.sin(a)*rad*.30;
   if(n===0)c.moveTo(px,py);else c.lineTo(px,py)}
  c.closePath();c.stroke();
  for(let n=0;n<3;n++){const angle=n*TAU/3+t*.4;
   const px=rad*Math.cos(angle),py=rad*.42*Math.sin(angle)-rad*1.2;
   c.fillStyle='#e8faffc9';c.beginPath();c.arc(px,py,1.5,0,TAU);c.fill()}
 }else{
  const colors=['#ff88b9','#ffdf89','#93f1bf','#8fcdff','#d7a5ff'];
  c.shadowBlur=6;
  for(let i=0;i<colors.length;i++){
   const start=t*.34+i*TAU/colors.length;
   c.strokeStyle=colors[i]+'cc';c.shadowColor=colors[i];c.beginPath();
   c.ellipse(0,0,rad*pulse,rad*.33*pulse,0,start,start+TAU/colors.length*.86);c.stroke();
   const a=start+TAU/colors.length*.4;
   c.fillStyle=colors[i];c.beginPath();
   c.arc(Math.cos(a)*rad,Math.sin(a)*rad*.33-rad*.5,1.3,0,TAU);c.fill();
  }
 }
 c.restore();
}
function drawBattle(canvas,E,s,now=visualNow(),interaction={}){
 if(!canvas||!s.battle)return;
 const c=canvas.getContext('2d'),b=s.battle,w=canvas.width,h=canvas.height,
 elapsed=battleElapsed(b,now);
 const base=battleStaticLayer(canvas,E,interaction.showGrid!==false);
 if(base)c.drawImage(base,0,0);
 else paintBattleStaticScene(c,canvas,E,interaction.showGrid!==false);
 const camera=battleProjection(canvas,E),grid=camera.g;
 const preview=interaction.movementModeId===b.selected&&E.battleMovePreview?E.battleMovePreview(b,b.selected):null,reachable=new Set(preview?.cells.map(cell=>`${cell.x},${cell.y}`)||[]),attackable=new Set(E.battleTargetsInRange?E.battleTargetsInRange(b,b.selected):[]);
 const units=battleUnitLayout(b,camera,w,h,now).slice().sort((a,b)=>a.y-b.y||a.x-b.x);
 const hg451Owners=new Map((s.heroes||[]).map(h=>[h.id,E.hg408HeroQuality?.(h)||h.quality]));
 // Static outlines are already in the cached background. Only draw
 // changing reachable cells here, so hex hit-testing remains identical.
 if(reachable.size)for(const cell of battleGridCells(camera)){
  if(!reachable.has(cell.x+','+cell.y))continue;
  c.lineWidth=interaction.showGrid!==false?1.7:1.8;
  poly(c,cell.corners.map(pt=>[pt.x,pt.y]),
   interaction.showGrid!==false?'#43cba52a':'#39bda334',
   interaction.showGrid!==false?'#9bead0b3':'#9eeac9a8');
 }
 for(const entry of units){
  const u=entry.u;
  const visual=battleVisualState(b,u,elapsed,now),position=visual||u,displayPool=visual?.pool??u.pool,pt=battleVisualPoint(camera,visual,u),x=pt.x+entry.x-entry.baseX,y=pt.y+entry.y-entry.baseY,k=entry.k;
  if(displayPool<=0){if(visual)battleUnitArt(c,x,y,u.side==='enemy',visual,k,u);continue}
  if(b.selected===u.id||b.focused===u.id){c.strokeStyle=u.side==='enemy'?'#f3a389':'#ebd17d';c.lineWidth=3;c.beginPath();c.ellipse(x,y+2,38,13,0,0,TAU);c.stroke()}else if(u.side==='enemy'&&attackable.has(u.id)){c.strokeStyle='#f7cc75';c.lineWidth=2;c.beginPath();c.ellipse(x,y+2,44,17,0,0,TAU);c.stroke()}
  // Commander-bound premium aura also works in 3-hero / 6-stack Tower combat.
  // An unbound ordinary PvE stack inherits the actual active commander.
  if(u.side==='player'){
   const commanderQuality=hg451Owners.get(u.heroId??s.activeHero);
   if(commanderQuality==='platinum'||commanderQuality==='rainbow')
    hg451RarityAura(c,x,y,k,commanderQuality,elapsed);
  }
  // Shared character foot pivot and compact, legible unit labels.
  c.save();c.fillStyle='#071a1a4d';c.beginPath();c.ellipse(x,y+2,32*k,9*k,0,0,TAU);c.fill();c.restore();
 const atlasBacked=!!troopAtlasDefinition(u.unitId,u.name),illustrated=visual?battleUnitArt(c,x,y,u.side==='enemy',visual,k,u):false;
 if(!illustrated){
  // Unknown Tower NPCs have an honest fallback sprite, but still get the
  // SAME recorded walk/attack/hit motion rather than teleporting on foot.
  const pose=motionPose(visual?.action||'idle',visual?.time||0,visual?.duration);
  c.save();c.translate(x,y);c.translate(pose.dx,pose.dy);
  c.rotate(pose.angle*.35);
  soldier(c,0,0,k,u.side==='enemy'?'#b9858c':'#c9c9b5',u.side==='enemy',u.range>1,u.unitId,u.name);
  c.restore();
 }
  // HG40: render a light aura around the actual animated sprite foot pivot.
  // No sprite replacement, label overlay, timer or new canvas is created.
  if(b.hg40?.v===1){
   const shield=b.hg40.shields?.[u.id]?.amount||0;
   const statuses=(b.hg40.statuses||[]).filter(st=>st.target===u.id&&st.until>=b.turn&&(st.starts??0)<=b.turn);
   const threatened=statuses.some(st=>['dot','stun','root','defdown','atkdown','damageDown'].includes(st.kind));
   if(shield>0||threatened){
    c.save();c.lineWidth=shield>0?2.5:1.7;
    c.strokeStyle=shield>0?'#a0ecff9c':'#c59cf6a8';
    c.shadowColor=c.strokeStyle;c.shadowBlur=7;
    c.beginPath();c.ellipse(x,y-entry.size*.40,entry.size*.28,entry.size*.44,0,0,TAU);c.stroke();
    c.restore();
   }
  }
  // A compact 28px name/HP card is placed outside silhouette collision boxes.
  // Nameplates can be hidden without hiding HP and stack counters. Every
  // actor stays touch-selectable at its canonical hex; no Save modification.
  const plate=interaction.showLabels===false?null:entry.label,hpVisible=interaction.showHP!==false;
  const skillCharge=E.hg40SkillReadiness?.(b,u),cdShown=skillCharge&&!skillCharge.passive;
  if(!plate){
   // Dense Boss formation: small bar next to the genuine foot pivot, not
   // a phantom floating label over another sprite or the HUD.
   if(hpVisible){
    const barWidth=clamp(camera.radius*1.3,20,48),barY=y+7;
    rounded(c,x-barWidth/2,barY,barWidth,7,3,'#14252cdb','#b6b2a580');
    const hpRatio=clamp(displayPool/(u.initial*u.hp),0,1);
    c.fillStyle=hpRatio<.24?'#ff9775':u.side==='enemy'?'#ec9d89':'#88d1a0';
    c.fillRect(x-barWidth/2+1,barY+1,(barWidth-2)*hpRatio,5);
   }
   if(cdShown){
    const barWidth=clamp(camera.radius*1.3,20,48),barY=y+(hpVisible?15:7);
    c.fillStyle='#122538e0';c.fillRect(x-barWidth/2,barY,barWidth,3);
    c.fillStyle=skillCharge.ready?'#9ef3c2':'#609be9';
    c.fillRect(x-barWidth/2,barY,barWidth*skillCharge.progress/100,3);
   }
  }else{
  const bx=plate.x+x-entry.x,by=plate.y+y-entry.y;
  if(plate.leader){
   c.save();c.strokeStyle='#dccb947b';c.lineWidth=1;c.beginPath();
   c.moveTo(clamp(x,bx+5,bx+plate.w-5),by+plate.h);
   c.lineTo(x,y-k*34);c.stroke();c.restore();
  }
  rounded(c,bx,by,plate.w,hpVisible?plate.h:21,5,
   u.side==='enemy'?'#392b2fe9':'#1e3840ef',
   b.selected===u.id||b.focused===u.id?'#f4d996':'#abbdab65');
  text(c,hg407FitName(c,u.name,plate.w-12,plate.fontSize||11),bx+plate.w/2,by+14,plate.fontSize||11,'#f7e8c7');
  if(hpVisible){rounded(c,bx+8,by+21,plate.w-16,6,3,'#0b1d22e9');
   const hpRatio=clamp(displayPool/(u.initial*u.hp),0,1);
   c.fillStyle=hpRatio<.24?'#ff9775':u.side==='enemy'?'#ec9d89':'#88d1a0';
   c.fillRect(bx+9,by+22,(plate.w-18)*hpRatio,4);}
   if(cdShown){
    c.fillStyle='#122538e6';c.fillRect(bx+8,by+(hpVisible?29:21),plate.w-16,3);
    c.fillStyle=skillCharge.ready?'#9ef3c2':'#609be9';
    c.fillRect(bx+8,by+(hpVisible?29:21),(plate.w-16)*skillCharge.progress/100,3);
   }
  }
  const badge=entry.countBox,ox=x-entry.x,oy=y-entry.y;
  rounded(c,badge.x+ox,badge.y+oy,badge.w,badge.h,6,'#17292cdd','#c0aa7a77');
  text(c,'×'+Math.ceil(displayPool/u.hp),badge.x+ox+badge.w/2,
   badge.y+oy+badge.h*(badge.h<19?.76:.74),badge.h<19?10:12,'#fff0ca');
 }
 motionImpactFx(c,camera,b,elapsed,units);
 drawHG58SkillCues(c,b,camera,elapsed,units);
 hg56BossPhaseAura(c,b,camera,elapsed,units);
 drawHG403ProcCues(c,b,elapsed,units);
 // HG40 supplemental damage must stay OUT of canonical v07 lastEvents:
 // one event/actor is enforced by HG10 strictSave. Render actual extra
 // damage receipts as a separate floating overlay instead of re-playing an
 // actor's Attack animation or modifying its primary hit record.
 if(b.hg40?.events?.length){
  const timeline=battleTimelineFor(b,elapsed)?.items||[];
  for(const fx of b.hg40.events){
   if(!(fx.damage>0))continue;
   const entry=units.find(q=>q.u.id===fx.targetId);if(!entry)continue;
   let owner=null;
   for(let i=timeline.length-1;i>=0;i--)if(timeline[i].event.actorId===fx.actorId){owner=timeline[i];break;}
   owner=owner||timeline[timeline.length-1];
   if(!owner)continue;
   const age=elapsed-owner.impactAt;
   if(age<0||age>700)continue;
   const pos=camera.center(entry.u.x,entry.u.y),
    x=pos.x+entry.x-entry.baseX+Math.max(44,entry.size*.4),
    y=pos.y+entry.y-entry.baseY-27-27*age/700;
   c.save();c.globalAlpha=clamp((700-age)/250,0,1);
   c.font='bold 13px sans-serif';c.textAlign='center';c.textBaseline='middle';
   c.lineWidth=2.5;c.strokeStyle='#1b1830';
   const label=(fx.order==='dot'?'☣ ':'✦ ')+'-'+Math.round(fx.damage);
   c.strokeText(label,x,y);c.fillStyle=fx.order==='dot'?'#d6a9ff':'#9ce8ff';
   c.fillText(label,x,y);c.restore();
   // Secondary splash/DoT receipts never enter canonical v07 lastEvents.
   if(age<=480){const attacker=units.find(q=>q.u.id===fx.actorId);
    if(attacker)drawHG403Sigil(c,attacker.u.unitId,
     pos.x+entry.x-entry.baseX,pos.y+entry.y-entry.baseY-entry.size*.42,
     age/480,clamp(camera.radius/38,.52,1.05));}
  }
 }
 drawHG403BattleHUD(c,b,w,h);
 if(b.activeSpell){rounded(c,w/2-130,80,260,25,6,'#52466adc','#d4b6e8');
  text(c,'✨ '+b.activeSpell.id.toUpperCase().replace(/_/g,' ')+' · '+(b.activeSpell.expiry-b.turn)+' lượt',w/2,97,11,'#fff1db');}
}
root.HOG_PAINTER={drawWorld,drawCity,drawBattle,battleHit,battleCellAt,battleProjection,battleGround,battleSpriteScale,battleGridCells,battleGridOverlay,battleStaticCacheStats,HG407_WALK_FOOT,hg407FootOffset,hg407FitName,battleFxPlan,battleUnitLayout,battleRectOverlap,vanguardAtlasFrame,VANGUARD_CLIPS,troopAtlasFrame,animatedTroopAtlas,battleUnitArt,battleVisualPool,battleVisualState,battleVisualPoint,battleTimelinePrime,battleTimelineTurnDuration,battleTimelineFor,battleVisualSchedule,battleVisualPhase,hasAnimatedTroops,MOTION_SPRITES,BOSS_SPRITES,bossSprite,animatedUnitId,ARCHER_CLIPS,archerAtlasFrame,animatedArcher,motionPose,motionSprite,motionImpactFx,HG403_SKILL_SIGILS,hg403SkillProfile,drawHG403Sigil,drawHG403ProcCues,drawHG403BattleHUD,hg56ImpactStreaks,hg56BossPhaseAura,mapHit,mapCamera,panMap,zoomMap,miniHit,miniBounds,cityHit,CITY_SITES,citySitesFor};
})(typeof globalThis!=='undefined'?globalThis:this);
