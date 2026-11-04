/* HG19.1 — CC0 SpriteCook character sheets; no gameplay mutations. */
(function(root){
'use strict';
const CONFIG=Object.freeze({
 human_2:Object.freeze({name:'Scout',size:108,pivot:.985,sheets:Object.freeze({
  idle:Object.freeze({id:'hg191-human-scout-idle',cell:192,frames:8,ms:1250,loop:true})
 })}),
 human_7:Object.freeze({name:'Elite Knight',size:109,pivot:.975,sheets:Object.freeze({
  idle:Object.freeze({id:'hg191-human-elite-idle',cell:88,frames:8,ms:1050,loop:true}),
  walk:Object.freeze({id:'hg191-human-elite-walk',cell:88,frames:8,ms:670,loop:true}),
  attack:Object.freeze({id:'hg191-human-elite-attack',cell:88,frames:8,ms:620,loop:false}),
  hit:Object.freeze({id:'hg191-human-elite-hit',cell:88,frames:8,ms:520,loop:false}),
  death:Object.freeze({id:'hg191-human-elite-death',cell:88,frames:12,ms:1050,loop:false})
 })})
});
function image(id,action){
 const spec=CONFIG[id]?.sheets[action]||CONFIG[id]?.sheets.idle;
 return spec&&typeof document!=='undefined'?document.getElementById(spec.id):null;
}
function frame(id,action,time=0,duration=null){
 const cfg=CONFIG[id];if(!cfg)return null;
 const active=cfg.sheets[action]?action:'idle',spec=cfg.sheets[active],t=Math.max(0,Number.isFinite(time)?time:0);
 const ms=Number.isFinite(duration)&&duration>0&&active===action?duration:spec.ms;
 const tick=Math.floor(t*spec.frames/Math.max(1,ms)),n=spec.loop?tick%spec.frames:Math.min(spec.frames-1,tick);
 return {action:active,n,sx:n*spec.cell,sy:0,sw:spec.cell,sh:spec.cell,
  imageId:spec.id,loop:spec.loop,pivot:cfg.pivot,size:cfg.size};
}
function draw(c,x,y,id,enemy,visual,k=1){
 if(!c||!visual||!CONFIG[id])return false;
 const f=frame(id,visual.action,visual.time,visual.duration),im=image(id,f.action),spec=CONFIG[id].sheets[f.action];
 if(!im?.complete||im.naturalWidth!==f.sw*spec.frames||im.naturalHeight!==f.sh)return false;
 const size=Math.min(136,Math.max(64,f.size*k));
 let dx=0,dy=0,ang=0,sx=1,sy=1,alpha=Math.max(0,Math.min(1,visual.alpha??1));
 if(visual.action!==f.action){
  const pose=root.HOG_PAINTER?.motionPose?.(visual.action,visual.time,visual.duration);
  if(pose){dx=pose.dx||0;dy=pose.dy||0;ang=pose.angle||0;sx=pose.sx||1;sy=pose.sy||1;alpha*=pose.alpha??1;}
 }
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(enemy)c.scale(-1,1);
 c.translate(dx,dy-size*.4);c.rotate(ang);c.scale(sx,sy);c.translate(0,size*.4);
 const prev=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;
 c.drawImage(im,f.sx,0,f.sw,f.sh,-size/2,-size*f.pivot,size,size);
 c.imageSmoothingEnabled=prev;c.restore();return true;
}
function thumb(id,size){
 if(!CONFIG[id])return '';
 const im=image(id,'idle');if(!im?.complete||!im.naturalWidth)return '';
 const px=Math.max(24,Math.min(128,Number(size)||52)),frames=CONFIG[id].sheets.idle.frames;
 return '<span class="hog-unit-thumb" data-hog-unit="'+id+'" style="width:'+px+'px;height:'+px+'px;overflow:hidden;display:inline-block;vertical-align:middle;flex:0 0 auto">'+
 '<img alt="" width="'+(px*frames)+'" height="'+px+'" style="max-width:none;display:block;width:'+(px*frames)+'px;height:'+px+'px;image-rendering:pixelated" src="'+im.src+'"></span>';
}
root.HOG_FREE_SPRITES=Object.freeze({CONFIG,has:id=>!!CONFIG[id],frame,draw,thumb});
})(typeof globalThis!=='undefined'?globalThis:this);
