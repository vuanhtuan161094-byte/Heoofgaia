/* HG22.1 — MIT-source animated skeleton. NOT Meowa gallery art.
 * 5 source action clips x 10 frames; presentation only, no Save or combat mutation.
 */
(function(root){'use strict';
const UNIT='undead_1', CELL=256, COLS=5, FRAMES=10;
const CLIPS=Object.freeze({"idle":{"id":"hg22-skeleton-idle","ms":1200,"loop":true},"walk":{"id":"hg22-skeleton-walk","ms":850,"loop":true},"attack":{"id":"hg22-skeleton-attack","ms":700,"loop":false},"hit":{"id":"hg22-skeleton-hit","ms":550,"loop":false},"death":{"id":"hg22-skeleton-death","ms":1150,"loop":false}});
function has(id){return id===UNIT}
function image(action){const spec=CLIPS[action]||CLIPS.idle;return typeof document==='undefined'?null:document.getElementById(spec.id)}
function frame(action,time=0,duration=null){
 const kind=Object.prototype.hasOwnProperty.call(CLIPS,action)?action:'idle',spec=CLIPS[kind];
 const t=Math.max(0,Number.isFinite(time)?time:0);
 const ms=(duration>0&&Number.isFinite(duration))?duration:spec.ms;
 const tick=Math.floor(t/Math.max(1,ms)*FRAMES);
 const n=spec.loop?tick%FRAMES:Math.max(0,Math.min(FRAMES-1,tick));
 return {action:kind,n,sx:(n%COLS)*CELL,sy:Math.floor(n/COLS)*CELL,sw:CELL,sh:CELL,sourceId:spec.id};
}
function draw(c,x,y,id,enemy,visual,k=1){
 if(!has(id)||!visual||!c)return false;
 const f=frame(visual.action,visual.time,visual.duration),im=image(f.action);
 if(!im?.complete||im.naturalWidth!==COLS*CELL||im.naturalHeight!==2*CELL)return false;
 const size=Math.min(134,Math.max(64,118*k)),pose=root.HOG_PAINTER?.motionPose?.(visual.action,visual.time,visual.duration);
 const alpha=Math.max(0,Math.min(1,(visual.alpha??1)*(pose?.alpha??1)));
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(enemy)c.scale(-1,1);
 if(pose){c.translate(pose.dx||0,pose.dy||0);c.rotate((pose.angle||0)*.36)}
 c.imageSmoothingEnabled=false;
 c.drawImage(im,f.sx,f.sy,CELL,CELL,-size*.5,-size*.96,size,size);
 c.restore();return true;
}
function thumb(id,size){
 if(!has(id))return '';
 const im=image('idle');if(!im)return '';
 const px=Math.max(24,Math.min(128,Number(size)||52));
 return '<span class="hog-unit-thumb hog-pixel-troop" data-hog-unit="'+id+'" style="display:inline-block;vertical-align:middle;overflow:hidden;flex:0 0 auto;width:'+px+'px;height:'+px+'px">'+
 '<img alt="" width="'+(px*5)+'" height="'+(px*2)+'" src="'+im.src+'" style="display:block;max-width:none;width:'+(px*5)+'px;height:'+(px*2)+'px;image-rendering:pixelated"></span>';
}
root.HOG_HG22_SKELETON=Object.freeze({UNIT,CELL,COLS,FRAMES,CLIPS,has,frame,draw,thumb});
})(typeof globalThis!=='undefined'?globalThis:this);
