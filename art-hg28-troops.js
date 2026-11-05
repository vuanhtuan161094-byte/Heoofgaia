/* HG28 — high-tier original troop masters.
 * These PNGs are still masters. Battle uses the existing HG14 action timing and
 * motion poses; new frame animation is only added from a real frame source.
 */
(function(root){'use strict';
const MAP=Object.freeze({
 human_9:{id:'hg28-troop-human_9',size:120,pivot:.97,glow:'#f5d68d'},
 human_10:{id:'hg28-troop-human_10',size:124,pivot:.97,glow:'#ffe7a6'},
 elf_9:{id:'hg28-troop-elf_9',size:124,pivot:.97,glow:'#a8e478'},
 elf_10:{id:'hg28-troop-elf_10',size:124,pivot:.97,glow:'#9deaff'},
 orc_9:{id:'hg28-troop-orc_9',size:122,pivot:.97,glow:'#d2c27a'},
 orc_10:{id:'hg28-troop-orc_10',size:128,pivot:.97,glow:'#f0bb79'},
 undead_9:{id:'hg28-troop-undead_9',size:124,pivot:.97,glow:'#bbd9dc'},
 undead_10:{id:'hg28-troop-undead_10',size:128,pivot:.97,glow:'#9be8f3'}
});
function profile(id){const item=MAP[id];return item?{id:item.id,size:item.size,pivot:item.pivot,pixelated:false,glow:item.glow}:null;}
function image(id){const item=MAP[id];return item&&typeof document!=='undefined'?document.getElementById(item.id):null;}
function has(id){return Object.prototype.hasOwnProperty.call(MAP,id);}
function thumb(id,size){
 const item=MAP[id],im=image(id);if(!item||!im)return '';
 const px=Math.max(24,Math.min(128,Number(size)||52));
 return '<img class="hog-unit-thumb hg28-troop-thumb" data-hg28-troop="'+id+'" width="'+px+'" height="'+px+'" alt="" loading="lazy" src="'+im.src+'">';
}
root.HOG_HG28_TROOPS=Object.freeze({MAP,has,image,profile,thumb,ids:()=>Object.keys(MAP)});
})(typeof globalThis!=='undefined'?globalThis:this);
