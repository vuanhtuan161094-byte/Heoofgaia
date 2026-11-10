/* HG56 — display-only UI feedback. One global HUD, no Save/economy hooks.
 * All callbacks are event-driven. No permanent RAF, interval or particles.
 */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const hud=document.querySelector('#app > .top'),resources=document.getElementById('resources');
 if(!hud||!resources)return;
 const reduced=()=>typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const old=new Map();let checkPending=false,lastTap=0;
 function reconcile(){
  checkPending=false;
  const buttons=[...resources.querySelectorAll('button.resource')];
  if(buttons.length!==5)return; // intro/transition; do not fabricate values
  for(let i=0;i<buttons.length;i++){
   const b=buttons[i],raw=b.querySelector('b')?.textContent?.replace(/[^\d]/g,'')||'';
   const value=Number(raw),previous=old.get(i);
   if(!Number.isSafeInteger(value))continue;
   // Pulse ONLY notable grants, not background 1-second economy production.
   if(previous!==undefined&&value>previous&&value-previous>=Math.max(1000,Math.floor(previous*.005))&&!reduced())
    b.classList.add('hg56-gain');
   old.set(i,value);
  }
 }
 const observer=new MutationObserver(()=>{
  if(checkPending)return;checkPending=true;
  queueMicrotask(reconcile);
 });
 observer.observe(resources,{childList:true,subtree:false});
 reconcile();
 document.addEventListener('click',event=>{
  if(reduced()||!event.isTrusted)return;
  const el=event.target?.closest?.('#app button,#app summary');
  if(!el||el.disabled)return;
  const now=typeof performance!=='undefined'?performance.now():0;
  if(now-lastTap<110)return;lastTap=now;
  const rect=el.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  const x=Number.isFinite(event.clientX)&&event.clientX?event.clientX:rect.left+rect.width/2,
   y=Number.isFinite(event.clientY)&&event.clientY?event.clientY:rect.top+rect.height/2;
  const spark=document.createElement('span');spark.className='hg56-tap-spark';
  spark.setAttribute('aria-hidden','true');
  spark.style.left=Math.max(3,Math.min(root.innerWidth-3,x))+'px';
  spark.style.top=Math.max(3,Math.min(root.innerHeight-3,y))+'px';
  document.body.appendChild(spark);
  spark.addEventListener('animationend',()=>spark.remove(),{once:true});
  // Fallback for browser tabs that suspend CSS animation while backgrounded.
  setTimeout(()=>spark.remove(),750);
 },{passive:true});
 root.HOG_HG56_UI=Object.freeze({version:1,saveChanged:false,persistentHud:true});
})(typeof globalThis!=='undefined'?globalThis:this);
