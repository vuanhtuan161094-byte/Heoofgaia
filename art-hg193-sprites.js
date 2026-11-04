/* HG-19.3 — source-backed and original raster units for final seven catalog IDs.
 * Battle movement: HG14 motionPose. Human Monk additionally has 8 real idle frames.
 * This module does not alter combat state or serialization.
 */
(function(root){'use strict';
const SPECS=Object.freeze({"human_6":{"imageId":"hg193-unit-human_6","frames":8,"width":784,"height":98,"size":112,"pivot":0.985,"glow":null,"pixelated":true,"kind":"sheet"},"human_8":{"imageId":"hg193-unit-human_8","frames":1,"width":32,"height":32,"size":112,"pivot":1,"glow":null,"pixelated":true,"kind":"static"},"elf_4":{"imageId":"hg193-unit-elf_4","frames":1,"width":32,"height":32,"size":112,"pivot":1,"glow":null,"pixelated":true,"kind":"static"},"elf_5":{"imageId":"hg193-unit-elf_5","frames":1,"width":64,"height":64,"size":125,"pivot":1,"glow":"#bbefdf","pixelated":true,"kind":"static"},"elf_7":{"imageId":"hg193-unit-elf_7","frames":1,"width":64,"height":64,"size":117,"pivot":1,"glow":"#b6f5d6","pixelated":true,"kind":"static"},"orc_2":{"imageId":"hg193-unit-orc_2","frames":1,"width":64,"height":64,"size":125,"pivot":1,"glow":null,"pixelated":true,"kind":"static"},"orc_7":{"imageId":"hg193-unit-orc_7","frames":1,"width":32,"height":32,"size":117,"pivot":1,"glow":"#f9db67","pixelated":true,"kind":"static"}});
function profile(id){
 const spec=SPECS[id];return spec&&spec.kind==='static'?{id:spec.imageId,size:spec.size,pivot:spec.pivot,pixelated:true,glow:spec.glow}:null;
}
function has(id){return Object.prototype.hasOwnProperty.call(SPECS,id)}
function image(id){
 const spec=SPECS[id];return spec&&typeof document!=='undefined'?document.getElementById(spec.imageId):null;
}
function monkFrame(time=0){
 const ms=Math.max(0,Number.isFinite(time)?time:0);
 return Math.floor(ms/1120*8)%8;
}
function draw(c,x,y,id,enemy,visual,k=1){
 if(id!=='human_6'||!visual||!c||typeof document==='undefined')return false;
 const spec=SPECS[id],im=image(id);
 if(!im?.complete||im.naturalWidth!==784||im.naturalHeight!==98)return false;
 const pose=root.HOG_PAINTER?.motionPose?.(visual.action,visual.time,visual.duration)||
  {dx:0,dy:0,angle:0,sx:1,sy:1,alpha:1,flash:0};
 const size=Math.max(64,Math.min(134,spec.size*k));
 const index=monkFrame(visual.time);
 c.save();
 c.globalAlpha*=Math.max(0,Math.min(1,(visual.alpha??1)*pose.alpha));
 c.translate(x,y);if(enemy)c.scale(-1,1);
 c.translate(pose.dx,pose.dy-size*.39);c.rotate(pose.angle);
 c.scale(pose.sx,pose.sy);c.translate(0,size*.39);
 c.imageSmoothingEnabled=false;
 c.drawImage(im,index*98,0,98,98,-size/2,-size*.985,size,size);
 if(pose.flash>0){c.globalAlpha*=pose.flash*.54;c.strokeStyle='#ffbaa1';c.lineWidth=2.5;
  c.beginPath();c.ellipse(0,-size*.47,size*.19,size*.33,-.25,0,Math.PI*2);c.stroke()}
 c.restore();return true;
}
function thumb(id,size){
 const spec=SPECS[id];if(!spec||typeof document==='undefined')return '';
 const im=image(id);if(!im)return '';
 const px=Math.max(24,Math.min(128,Number(size)||52));
 if(spec.kind==='sheet'){
  return '<span class="hog-unit-thumb hog-pixel-troop" data-hog-unit="'+id+'" style="width:'+px+'px;height:'+px+'px;display:inline-block;vertical-align:middle;overflow:hidden;flex:0 0 auto">'+
  '<img alt="" src="'+im.src+'" width="'+(px*8)+'" height="'+px+'" style="max-width:none;width:'+(px*8)+'px;height:'+px+'px;display:block;image-rendering:pixelated"></span>';
 }
 return '<img class="hog-unit-thumb hog-pixel-troop" data-hog-unit="'+id+'" width="'+px+'" height="'+px+
  '" alt="" loading="lazy" src="'+im.src+'" style="image-rendering:pixelated;object-fit:contain">';
}
root.HOG_HG193_SPRITES=Object.freeze({SPECS,has,profile,image,monkFrame,draw,thumb,ids:()=>Object.keys(SPECS)});
})(typeof globalThis!=='undefined'?globalThis:this);
