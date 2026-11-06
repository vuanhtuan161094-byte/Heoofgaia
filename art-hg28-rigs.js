/* HG28 modular high-tier battlefield rigs — presentation-only.
 * Preserve authored 512x512 painted masters by articulating separately
 * clipped wings, tails, and arms. This is a source-layer RIG, not a five-clip
 * frame atlas; the 40x5 genuine-frame audit remains unchanged.
 * Never touches canonical battle state or Save v07.
 */
(function(root){'use strict';
const S=512,TWO=Math.PI*2;
const r=(id,parts)=>Object.freeze({id,parts:Object.freeze(parts.map(p=>Object.freeze(p)))});
const RIGS=Object.freeze({
 human_9:r('human_9',[
  {name:'leftWing',layer:0,joint:[240,103],poly:[[56,227],[64,160],[108,100],[173,56],[249,3],[285,12],[267,47],[231,83],[222,143],[190,207],[167,309],[113,391],[78,383],[59,330]],motion:'wingL'},
  {name:'rightWing',layer:0,joint:[363,116],poly:[[339,61],[378,68],[417,97],[452,152],[475,225],[465,289],[450,352],[421,411],[403,379],[394,301],[374,238],[360,167]],motion:'wingR'}
 ]),
 human_10:r('human_10',[
  {name:'leftWing',layer:0,joint:[244,126],poly:[[39,195],[79,118],[124,79],[190,53],[235,20],[255,28],[235,65],[219,129],[196,191],[166,284],[119,403],[67,450],[32,411],[29,330]],motion:'wingL'},
  {name:'rightWing',layer:0,joint:[366,139],poly:[[345,88],[381,83],[429,127],[456,183],[481,250],[468,340],[444,421],[414,450],[396,412],[390,332],[368,255],[354,181]],motion:'wingR'}
 ]),
 elf_9:r('elf_9',[
  {name:'leftWing',layer:0,joint:[264,222],poly:[[19,226],[51,162],[126,107],[213,70],[281,48],[307,65],[285,107],[281,177],[247,249],[158,336],[83,385],[43,377],[24,320]],motion:'wingL'},
  {name:'innerWing',layer:0,joint:[290,201],poly:[[269,199],[289,152],[316,111],[348,125],[363,190],[335,249],[297,289],[266,256]],motion:'wingR'},
  {name:'tail',layer:0,joint:[228,326],poly:[[234,312],[190,323],[124,347],[64,385],[50,423],[58,460],[98,480],[191,496],[269,510],[338,492],[302,473],[210,466],[132,443],[96,419],[134,388],[222,359]],motion:'tail'}
 ]),
 elf_10:r('elf_10',[
  {name:'leftWing',layer:0,joint:[285,204],poly:[[15,167],[66,98],[153,64],[219,54],[284,73],[320,99],[306,150],[284,210],[236,253],[184,300],[116,336],[49,344],[28,303]],motion:'wingL'},
  {name:'innerWing',layer:0,joint:[314,225],poly:[[276,173],[303,125],[339,104],[361,132],[380,190],[355,252],[316,289],[282,268]],motion:'wingR'},
  {name:'tail',layer:0,joint:[230,343],poly:[[254,318],[199,329],[137,350],[76,363],[41,388],[48,438],[98,493],[215,505],[329,506],[345,484],[259,474],[172,466],[123,445],[148,401],[240,369]],motion:'tail'}
 ]),
 orc_9:r('orc_9',[
  {name:'leftArm',layer:1,joint:[177,195],poly:[[92,223],[107,191],[148,166],[187,181],[217,230],[206,277],[182,306],[140,363],[114,400],[74,404],[58,367],[79,331],[97,280]],motion:'armL'},
  {name:'rightArm',layer:1,joint:[374,198],poly:[[356,183],[390,184],[420,208],[442,247],[458,309],[459,367],[433,387],[394,373],[375,335],[367,287]],motion:'armR'}
 ]),
 orc_10:r('orc_10',[
  {name:'leftArm',layer:1,joint:[137,218],poly:[[60,192],[87,155],[133,147],[169,170],[183,216],[164,267],[139,310],[114,362],[81,401],[39,392],[29,354],[44,282]],motion:'armL'},
  {name:'rightArm',layer:1,joint:[400,220],poly:[[375,194],[415,198],[442,235],[458,290],[468,341],[460,386],[437,401],[409,381],[383,337],[370,272]],motion:'armR'}
 ]),
 undead_9:r('undead_9',[
  {name:'leftWing',layer:0,joint:[259,226],poly:[[17,209],[41,156],[85,110],[159,66],[228,51],[275,60],[295,89],[273,144],[260,203],[229,256],[168,317],[95,350],[45,371],[22,316]],motion:'wingL'},
  {name:'innerWing',layer:0,joint:[291,201],poly:[[250,179],[266,132],[310,101],[352,113],[363,177],[341,224],[306,268],[263,257]],motion:'wingR'},
  {name:'tail',layer:0,joint:[216,340],poly:[[232,323],[180,324],[128,362],[71,398],[42,439],[52,480],[107,500],[201,506],[311,511],[319,497],[231,481],[162,465],[109,443],[124,403],[210,365]],motion:'tail'}
 ]),
 undead_10:r('undead_10',[
  {name:'leftWing',layer:0,joint:[261,225],poly:[[19,196],[26,126],[80,66],[155,39],[237,31],[289,51],[312,96],[286,155],[264,235],[221,287],[147,339],[65,380],[26,351]],motion:'wingL'},
  {name:'innerWing',layer:0,joint:[299,214],poly:[[264,183],[286,136],[333,98],[358,120],[380,189],[340,261],[291,285]],motion:'wingR'},
  {name:'tail',layer:0,joint:[224,358],poly:[[257,333],[198,339],[131,368],[81,402],[53,438],[66,474],[112,502],[220,511],[344,510],[368,489],[278,469],[186,454],[116,432],[157,399],[238,371]],motion:'tail'}
 ])
});
const cached=new Map();
function layer(image,poly){
 const c=document.createElement('canvas');c.width=S;c.height=S;
 const ctx=c.getContext('2d',{willReadFrequently:false});
 ctx.beginPath();
 for(let j=0;j<poly.length;j++){const p=poly[j];if(!j)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}
 ctx.closePath();ctx.clip();ctx.drawImage(image,0,0,S,S);
 return c;
}
function prepare(id){
 if(typeof document==='undefined')return null;
 const cfg=RIGS[id],im=cfg&&document.getElementById('hg28-troop-'+id);
 if(!cfg||!im?.complete||im.naturalWidth!==S||im.naturalHeight!==S)return null;
 const last=cached.get(id);if(last?.src===im.src)return last;
 const base=document.createElement('canvas');base.width=S;base.height=S;
 const ctx=base.getContext('2d');ctx.drawImage(im,0,0,S,S);
 const parts=cfg.parts.map(p=>({...p,bitmap:layer(im,p.poly)}));
 // Cut each source pixel once, so moved wings/tails do not leave ghosts.
 // Soft image alpha from the original master is maintained in every layer.
 for(const p of cfg.parts){
  ctx.save();ctx.globalCompositeOperation='destination-out';
  ctx.beginPath();p.poly.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.restore();
 }
 const o={src:im.src,base,parts};cached.set(id,o);return o;
}
function angle(kind,action,t){
 const phase=t*TWO,sn=Math.sin(phase),cycle=Math.sin(phase*.5);
 const isWing=kind.startsWith('wing'),left=kind==='wingL';
 const sign=left?-1:1;
 if(isWing){
  if(action==='idle')return sign*(.025+sn*.045);
  if(action==='walk')return sign*(.055+Math.sin(phase*1.3)*.115);
  if(action==='attack')return sign*(.05+.30*Math.sin(Math.PI*Math.min(1,t))-.09*Math.sin(phase));
  if(action==='hit')return sign*(-.12-.15*Math.sin(Math.PI*Math.min(1,t)));
  if(action==='death')return sign*(-.48*Math.min(1,t));
 }
 if(kind==='tail'){
  if(action==='idle')return .045*sn;
  if(action==='walk')return .13*sn;
  if(action==='attack')return -.29*Math.sin(Math.PI*Math.min(1,t));
  if(action==='hit')return .12*cycle;
  if(action==='death')return -.22*Math.min(1,t);
 }
 if(kind==='armL'||kind==='armR'){
  const hand=kind==='armL'?-1:1;
  if(action==='idle')return hand*.015*sn;
  if(action==='walk')return hand*.08*sn;
  if(action==='attack')return hand*(.38*Math.sin(Math.PI*Math.min(1,t))-.08*Math.sin(2*phase));
  if(action==='hit')return -hand*.24*Math.sin(Math.PI*Math.min(1,t));
  if(action==='death')return hand*.20*Math.min(1,t);
 }
 return 0;
}
function drawPart(c,p,action,t){
 const a=angle(p.motion,action,t),[cx,cy]=p.joint;
 c.save();c.translate(cx,cy);c.rotate(a);c.translate(-cx,-cy);
 c.drawImage(p.bitmap,0,0);c.restore();
}
function draw(c,x,y,id,enemy,visual,k=1){
 if(!c||!visual||!RIGS[id])return false;
 const art=prepare(id);if(!art)return false;
 const profile=root.HOG_HG28_TROOPS?.profile(id),size=Math.max(64,Math.min(134,(profile?.size||124)*k));
 const action=['idle','walk','attack','hit','death'].includes(visual.action)?visual.action:'idle';
 const ms=Math.max(0,Number.isFinite(visual.time)?visual.time:0);
 const duration=Number.isFinite(visual.duration)&&visual.duration>0?visual.duration:
  ({idle:1100,walk:800,attack:650,hit:600,death:1200}[action]);
 const t=action==='idle'||action==='walk'?(ms%duration)/duration:Math.min(1,ms/duration);
 c.save();c.globalAlpha*=Math.max(0,Math.min(1,visual.alpha??1));
 c.translate(x,y);if(enemy)c.scale(-1,1);
 c.scale(size/S,size/S);c.translate(-S/2,-S*(profile?.pivot??.97));
 for(const p of art.parts)if(p.layer===0)drawPart(c,p,action,t);
 c.drawImage(art.base,0,0);
 for(const p of art.parts)if(p.layer===1)drawPart(c,p,action,t);
 c.restore();return true;
}
root.HOG_HG28_RIGS=Object.freeze({
 ids:()=>Object.keys(RIGS),RIGS,has:id=>!!RIGS[id],draw,
 type:'master-preserving layered rigs — NOT verified source-frame atlases'
});
})(typeof globalThis!=='undefined'?globalThis:this);
