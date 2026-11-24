// === NL-ART-D2-V1: native battle presentation, no game-state writes ===
(()=>{
'use strict';
// Expose only immutable display fields to the separate fixed-window art script.
window.__NL_ART_CATALOG__=Object.freeze(Object.fromEntries(Object.entries(HEROES).map(([id,h])=>[id,Object.freeze({name:h.name,faction:h.faction,type:h.type,role:h.role,skill:typeof h.skill==='string'?h.skill:''})])));
const source=__NL_D2_SHEETS__, sheets=new Map();
for(const [id,src] of Object.entries(source)){const im=new Image();im.src='data:image/svg+xml;base64,'+src;sheets.set(id,im)}
const fx=new Image();fx.src='data:image/svg+xml;base64,'+__NL_D2_FX__;
const families=['infantry','spear','cavalry','archer','strategist','support','drum'];
const actions=['idle','attack','hit','skill','disappear'];
const metrics={groups:0,soldiers:0,fx:0,projectiles:0,byAction:{},byFamily:{}};
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
function companions(ctx,u,now,pos,v){
 const im=sheets.get(sheet(u));if(!ready(im)||(!v.hit&&u.hp<=0))return;
 const f=family(u),dir=u.team==='e'?-1:1;
 const lift=v.actor&&v.phase==='release'&&['infantry','spear','cavalry'].includes(f)?dir*9:0;
 const frame=v.frame,row=actions.indexOf(v.action),sz=f==='cavalry'?39:34;
 // The native commander remains the large middle actor. Two smaller escorts
 // share the exact logical slot and event, never become additional combat units.
 ctx.save();
 if(v.action==='disappear')ctx.globalAlpha=1-frame*.24;
 const offsets=[[-27,-12],[27,-12]];
 for(let i=0;i<offsets.length;i++){
   const [dx,dy]=offsets[i],x=pos.x+dx+lift,y=pos.y+dy+26;
   ctx.fillStyle='rgba(8,18,19,.29)';ctx.beginPath();ctx.ellipse(x,y-1,12,3,0,0,Math.PI*2);ctx.fill();
   if(cel(ctx,im,row,frame,x,y,sz,sz*1.05,dir<0))metrics.soldiers++;
 }
 ctx.restore();
 metrics.groups++;metrics.byAction[v.action]=(metrics.byAction[v.action]||0)+1;metrics.byFamily[f]=(metrics.byFamily[f]||0)+1;
}
function effects(ctx,u,now,pos,v){
 if(!v.active||(!v.actor&&!v.hit))return;
 const f=family(u),row=families.indexOf(f),phase=['charge','release','contact','fade'].indexOf(v.phase);
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
 ready:()=>[...sheets.values()].every(ready)&&ready(fx),count:()=>sheets.size,
 visual:(u,now)=>{const v=visual(u,now);return {action:v.action,phase:v.phase,actor:v.actor,hit:v.hit,sheet:sheet(u)}},
 metrics:()=>JSON.parse(JSON.stringify(metrics)),
});
})(); // === END NL-ART-D2-V1 ===
