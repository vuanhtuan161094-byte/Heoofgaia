// === NL-ART-D2-V1: native battle presentation, no game-state writes ===
(()=>{
'use strict';
// Expose only immutable display fields to the separate fixed-window art script.
window.__NL_ART_CATALOG__=Object.freeze(Object.fromEntries(Object.entries({...Object.fromEntries(NL_HERO207_ROWS.map(h=>[h.id,h])),...HEROES}).map(([id,h])=>[id,Object.freeze({name:h.name,faction:h.faction,type:h.type,role:h.role,skill:typeof h.skill==='string'?h.skill:''})])));
window.__NL_ART_MAP_CATALOG__=Object.freeze(Object.fromEntries(NL_CONTENT_C.maps.map(m=>[m.id,Object.freeze({name:m.name,level:m.sourceLevel})])));
const source=__NL_D2_SHEETS__, sheets=new Map();
for(const [id,src] of Object.entries(source)){const im=new Image();im.src='data:image/svg+xml;base64,'+src;sheets.set(id,im)}
const fx=new Image();fx.src='data:image/svg+xml;base64,'+__NL_D2_FX__;
// D4: original P41/P5 raster sprites are used for four family groups; the
// specialist R06 spear, support and war-drum art remains identifiable.
const raster=__NL_D4_RASTER__;
const p41=new Image(),p5=new Image();
p41.src='data:image/webp;base64,'+raster.p41;p5.src='data:image/webp;base64,'+raster.p5;
const families=['infantry','spear','cavalry','archer','strategist','support','drum'];
const actions=['idle','attack','hit','skill','disappear'];
const metrics={groups:0,soldiers:0,fx:0,projectiles:0,raster:0,vector:0,polishFx:0,byAction:{},byFamily:{},byFxKind:{}};
const ready=im=>im?.complete&&im.naturalWidth>0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function family(u){
 const t=u?.troop||u?.type||'infantry';
 if(t==='dancer')return 'support';
 const map={bulwark:'infantry',crusher:'infantry',spearwall:'spear',shock:'cavalry',raider:'cavalry',marksman:'archer',volley:'archer',ember:'strategist',disrupt:'strategist',medic:'support',rally:'drum'};
 return families.includes(t)?t:(map[t]||'infantry');
}
function sheet(u){
 const candidates=[u?.troop,u?.nlClassicWebUnit,u?.branch,u?.type];
 return candidates.find(x=>sheets.has(x))||family(u);
}
const same=(a,b)=>!!a&&!!b&&(a===b||(a.id===b.id&&a.team===b.team&&a.slot===b.slot));
function visual(u,now){
 const ev=battle?.current,elapsed=ev?now-ev.time:Infinity;
 const active=Number.isFinite(elapsed)&&elapsed>=0&&elapsed<1000;
 const hit=active&&(ev.hits||[]).some(h=>same(h.target,u));
 const actor=active&&same(ev.attacker,u);
 const phase=elapsed<220?'charge':elapsed<430?'release':elapsed<650?'contact':'fade';
 const skill=actor&&(/skill|tactic|magic|heal|buff|morale/i.test(String(ev.kind))||Boolean(ev.skill));
 let action='idle',frame=Math.floor(now/180)%4;
 if(hit&&elapsed>=430){action=u.hp<=0?'disappear':'hit';frame=clamp(Math.floor((elapsed-430)/100),0,3)}
 else if(actor){action=skill?'skill':'attack';frame=clamp(Math.floor(elapsed/180),0,3)}
 return {ev,elapsed,phase,actor,hit,action,frame,active};
}
function cel(ctx,im,row,frame,x,y,w,h,flip){
 if(!ready(im))return false;
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 ctx.drawImage(im,frame*160,row*168,160,168,-w/2,-h,w,h);ctx.restore();return true;
}
function rasterCel(ctx,f,team,v,x,y,w,h,offset){
 const dir=team==='e'?'left':'right';
 if(f==='infantry'&&ready(p5)){
   const act=v.action==='disappear'?'death':v.action==='hit'?'hurt':v.action==='skill'?'attack':v.action;
   const row=raster.p5Rows.indexOf(act+'/'+dir);
   if(row<0)return false;
   const frame=v.action==='idle'?(v.frame+offset)%4:v.frame;
   ctx.drawImage(p5,frame*100,row*144,100,144,x-w/2,y-h,w,h);
   return true;
 }
 if(!ready(p41)||!raster.p41Units[f])return false;
 const action=v.action==='disappear'?'hit':v.action==='skill'?'attack':v.action;
 const frames=raster.p41Units[f]?.[dir]?.[action];if(!frames)return false;
 const frame=v.action==='idle'?(v.frame+offset)%frames.length:Math.min(frames.length-1,Math.round(v.frame*(frames.length-1)/3));
 const i=frames[frame];
 ctx.drawImage(p41,(i%8)*100,Math.floor(i/8)*144,100,144,x-w/2,y-h,w,h);
 return true;
}
function companions(ctx,u,now,pos,v){
 const im=sheets.get(sheet(u));if(!ready(im)||(!v.hit&&u.hp<=0))return;
 const f=family(u),dir=u.team==='e'?-1:1;
 const lift=v.actor&&v.phase==='release'&&['infantry','spear','cavalry'].includes(f)?dir*9:0;
 const frame=v.frame,row=actions.indexOf(v.action),sz=f==='cavalry'?40:36;
 // The native commander remains the large middle actor. Two smaller escorts
 // share the exact logical slot and event, never become additional combat units.
 ctx.save();
 if(v.action==='disappear')ctx.globalAlpha=1-frame*.24;
 const offsets=[[-27,-12],[27,-12]];
 for(let i=0;i<offsets.length;i++){
   const [dx,dy]=offsets[i],x=pos.x+dx+lift,y=pos.y+dy+26;
   ctx.fillStyle='rgba(8,18,19,.29)';ctx.beginPath();ctx.ellipse(x,y-1,12,3,0,0,Math.PI*2);ctx.fill();
   // Match the original commander scale with directional painted miniatures.
   // The native slot, hitbox, HP and target are not altered.
   if(rasterCel(ctx,f,u.team,v,x,y,sz,sz*1.44,i)){metrics.soldiers++;metrics.raster++;}
   else if(cel(ctx,im,row,frame,x,y,sz,sz*1.05,dir<0)){metrics.soldiers++;metrics.vector++;}
   // Small faction pennant at the base; does not obscure the actor.
   ctx.fillStyle=u.team==='e'?'#b36a54':'#6ea0a3';
   ctx.fillRect(x-4,y+1,8,1.5);
 }
 ctx.restore();
 metrics.groups++;metrics.byAction[v.action]=(metrics.byAction[v.action]||0)+1;metrics.byFamily[f]=(metrics.byFamily[f]||0)+1;
}
function effectKind(v,f){
 const e=v.ev||{},kind=String([e.kind,e.type,e.tag,e.skill?.kind,e.skill?.tag, ...((e.hits||[]).slice(0,3).map(h=>h.kind))].join(' ')).toLowerCase();
 if(/heal|restore|hồi|trị/.test(kind))return 'heal';
 if(/buff|morale|support|sĩ khí/.test(kind)||f==='drum'||f==='support')return 'support';
 if(/magic|spell|pháp/.test(kind)||f==='strategist')return 'magic';
 if(/tactic|skill|chiến pháp/.test(kind))return 'tactic';
 return 'physical';
}
function polishedFx(ctx,u,pos,v,f){
 const k=effectKind(v,f),palette={physical:['#fff0bb','#d4944f'],tactic:['#ffe3a4','#f39852'],magic:['#d6f1ff','#6ba8da'],heal:['#d5f7b8','#75ca99'],support:['#ffefb3','#d2b86d']}[k];
 const phase=v.phase,at=phase==='charge'?v.elapsed/220:phase==='release'?(v.elapsed-220)/210:phase==='contact'?(v.elapsed-430)/220:(v.elapsed-650)/350;
 const t=clamp(at,0,1),x=pos.x,y=pos.y+7,side=u.team==='e'?-1:1;
 ctx.save();ctx.globalCompositeOperation='screen';
 const ring=(rx,ry,alpha,w)=>{ctx.globalAlpha=alpha;ctx.strokeStyle=palette[0];ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();};
 if(v.actor&&phase==='charge'){
   ring(16+t*8,7+t*4,.42+.18*t,1.4);
   for(let i=0;i<5;i++){const a=i*1.256+t*2.2;ctx.globalAlpha=.5;ctx.fillStyle=palette[1];ctx.fillRect(x+Math.cos(a)*(21-9*t),y-13+Math.sin(a)*10-11*t,2,4);}
 }else if(v.actor&&phase==='release'){
   if(k==='heal'||k==='support'){ring(18+15*t,8+7*t,.65*(1-t),2);ring(11+10*t,5+4*t,.5*(1-t),1);}
   else{ctx.globalAlpha=.72*(1-t*.5);ctx.strokeStyle=palette[0];ctx.lineWidth=2.5;ctx.shadowColor=palette[1];ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(x-side*9,y+3);ctx.quadraticCurveTo(x+side*20,y-39,x+side*(37+13*t),y-12);ctx.stroke();}
 }else if(v.hit&&(phase==='contact'||phase==='fade')){
   const a=phase==='contact'?1-t*.55:.45*(1-t);
   ring(14+20*t,8+10*t,.55*a,2);
   ctx.globalAlpha=a;ctx.strokeStyle=palette[0];ctx.lineWidth=1.7;
   for(let i=0;i<7;i++){const ang=i*Math.PI*2/7;const r=9+20*t;ctx.beginPath();ctx.moveTo(x+Math.cos(ang)*r,y-16+Math.sin(ang)*r*.65);ctx.lineTo(x+Math.cos(ang)*(r+7),y-16+Math.sin(ang)*(r+7)*.65);ctx.stroke();}
 }else{ctx.restore();return;}
 ctx.restore();metrics.polishFx++;metrics.byFxKind[k]=(metrics.byFxKind[k]||0)+1;
}
function effects(ctx,u,now,pos,v){
 if(!v.active||(!v.actor&&!v.hit))return;
 const f=family(u),row=families.indexOf(f),phase=['charge','release','contact','fade'].indexOf(v.phase);
 polishedFx(ctx,u,pos,v,f);
 const show=v.actor&&phase<2||v.hit&&phase>=2;
 if(show&&ready(fx)){
   ctx.save();ctx.globalAlpha=phase===3?.55:.88;ctx.globalCompositeOperation='screen';
   if(cel(ctx,fx,row,phase,pos.x,pos.y+22,74,77,u.team==='e'))metrics.fx++;
   ctx.restore();
 }
 // Ranged trail is anchored to actual native recorded hit targets.
 if(v.actor&&phase===1&&['archer','strategist','spear'].includes(f)){
   const target=v.ev.hits?.[0]?.target;if(!target)return;
   const end=coords(target);if(!end||!Number.isFinite(end.x))return;
   const t=clamp((v.elapsed-220)/210,0,1),x=pos.x+(end.x-pos.x)*t,y=pos.y+(end.y-pos.y)*t-18-Math.sin(t*Math.PI)*22;
   const dx=end.x-pos.x,dy=end.y-pos.y,dist=Math.hypot(dx,dy)||1;
   ctx.save();ctx.strokeStyle=f==='strategist'?'#b6e4ff':'#f6dd96';ctx.lineWidth=2.5;ctx.shadowBlur=7;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x-dx/dist*21,y-dy/dist*21);ctx.lineTo(x,y);ctx.stroke();ctx.restore();metrics.projectiles++;
 }
}
const oldDraw=drawUnit;
drawUnit=function(ctx,u,now){
 if(!u||!battle||battle.mode==='cltq'||!Number.isFinite(now))return oldDraw.apply(this,arguments);
 const pos=coords(u);if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return oldDraw.apply(this,arguments);
 const v=visual(u,now);
 companions(ctx,u,now,pos,v);
 oldDraw.apply(this,arguments);
 effects(ctx,u,now,pos,v);
};
if(window.__P2_ENABLE_QA__)window.__NL_ART_D2_QA__=Object.freeze({
 ready:()=>[...sheets.values()].every(ready)&&ready(fx)&&ready(p41)&&ready(p5),count:()=>sheets.size,
 raster:()=>({p41:[p41.naturalWidth,p41.naturalHeight],p5:[p5.naturalWidth,p5.naturalHeight]}),
 visual:(u,now)=>{const v=visual(u,now);return {action:v.action,phase:v.phase,actor:v.actor,hit:v.hit,sheet:sheet(u)}},
 metrics:()=>JSON.parse(JSON.stringify(metrics)),
});
})(); // === END NL-ART-D2-V1 ===
