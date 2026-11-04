/* Real Chrome headless CDP smoke: opens the portable file, uses the real UI,
   plays a normal unmodified castle battle, then verifies capture/switch/save-load. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=__dirname,html=path.join(root,'Play-Heoofgaia-HG11.html'),evidence=path.join(root,'docs','evidence','hg10'),qa=path.join(root,'docs','qa','hg10');
const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const checks=[];let exceptions=[];
function check(name,ok,detail=''){checks.push({name,ok:!!ok,detail});if(!ok)throw new Error('FAIL '+name+': '+detail)}
function pause(ms){return new Promise(r=>setTimeout(r,ms))}
function port(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p))})})}
async function saveScreenshot(cdp,file){const r=await cdp.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true});fs.writeFileSync(file,Buffer.from(r.data,'base64'))}
async function main(){
 fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(qa,{recursive:true});check('Offline HTML exists',fs.existsSync(html),html);check('Chrome executable exists',fs.existsSync(chrome),chrome);
 const debugPort=await port(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'hog10-cdp-'));
 const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
 let ws=null;
 try{
  let targets=[];for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${debugPort}/json/list`);if(r.ok){targets=await r.json();if(targets.some(t=>t.type==='page'))break}}catch{}await pause(200)}
  const target=targets.find(t=>t.type==='page');check('Chrome DevTools page is live',!!target);
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let seq=0;const pending=new Map();ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(String(ev.data))}catch{return}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails?.text||'runtime exception');if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
  const cdp={call(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}};
  await cdp.call('Page.enable');await cdp.call('Runtime.enable');await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:980,deviceScaleFactor:1,mobile:false});
  const url=pathToFileURL(html).href;await cdp.call('Page.navigate',{url});await pause(800);
  async function evalPage(expression){const r=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
  let info=await evalPage("({title:document.title,ready:document.readyState,engine:window.HOG_ENGINE?.V,body:!!document.querySelector('#app')})");check('Chrome rendered the offline game',info?.ready==='complete'&&info?.engine===7&&info?.body,JSON.stringify(info));
  await saveScreenshot(cdp,path.join(evidence,'screenshot-hg10-offline-intro-chrome.png'));
  let started=await evalPage("(()=>{document.querySelector('[data-action=start]')?.click();const s=window.HOG_APP_DEBUG.getState();if(!s)return false;s.fame=5800;window.HOG_APP_DEBUG.save();window.HOG_APP_DEBUG.render();return true})()");check('New-game control starts a playable kingdom with fixture Fame',started,'Fame 5,800 is seeded solely to reach the documented secondary-city gate in this browser QA.');
  const selected=await evalPage("(()=>{const b=document.querySelector('[data-action=select][data-key=\\\"9,10\\\"]');if(!b)return 'missing neutral castle selector';b.click();return document.querySelector('[data-action=select][data-key=\"9,10\"]')?.className.includes('primary')})()");check('Neutral Elf castle is selectable',selected===true,String(selected));
  await evalPage("document.querySelector('[data-action=march]')?.click()");
  let dispatched=await evalPage("(()=>{const s=window.HOG_APP_DEBUG.getState();if(!s.march)return false;s.march.remaining=.01;window.HOG_APP_DEBUG.save();return true})()");check('March action dispatches the real starting army',dispatched);
  await pause(1200);let opened=await evalPage("(()=>{const s=window.HOG_APP_DEBUG.getState();return !!s.battle&&s.battle.target==='9,10'})()");
  if(!opened){await pause(1200);opened=await evalPage("(()=>{const s=window.HOG_APP_DEBUG.getState();return !!s.battle&&s.battle.target==='9,10'})()")}check('Travel opens the real castle battle',opened,'Travel timer was shortened after the UI dispatch; enemy composition, stats, army and combat were not changed.');
  await saveScreenshot(cdp,path.join(evidence,'screenshot-hg10-neutral-castle-battle-chrome.png'));
  const outcome=await evalPage("(async()=>{for(let i=0;i<70;i++){const s=window.HOG_APP_DEBUG.getState();if(!s.battle)break;const b=document.querySelector('[data-action=battle][data-cmd=attack]');if(!b)break;b.click();await new Promise(r=>setTimeout(r,20))}const s=window.HOG_APP_DEBUG.getState();return {battle:!!s.battle,cities:s.cities.length,city:s.cities.find(c=>c.key==='9,10')?.race,stationed:s.stationedHeroes.find(h=>h.key==='9,10')?.army,army:s.army.human_1}})()");
  check('Real attack control wins and captures the city',!!outcome&&!outcome.battle&&outcome.cities===2&&outcome.city==='elf'&&!!outcome.stationed,JSON.stringify(outcome));
  await evalPage("document.querySelector('[data-action=tab][data-tab=city]')?.click()");await pause(200);
  let switchResult=await evalPage("(()=>{const b=document.querySelector('[data-action=city-switch][data-id=\\\"city-9-10\\\"]');if(!b)return 'missing city switch';b.click();const s=window.HOG_APP_DEBUG.getState();return {id:s.activeCityId,race:s.race,name:document.querySelector('h1')?.textContent}})()");
  check('City selector switches the actual active economy to Elf',switchResult?.id==='city-9-10'&&switchResult?.race==='elf',JSON.stringify(switchResult));
  const taskControls=await evalPage("(()=>{document.querySelector('[data-action=tab][data-tab=tasks]')?.click();const q=[...document.querySelectorAll('[data-action=acceptdaily],[data-action=claimdaily],[data-action=acceptdaily2009],[data-action=claimdaily2009]')],hero=document.querySelector('[data-action=acceptherotask]');return {count:q.length,allDisabled:q.length>0&&q.every(x=>x.disabled),heroTaskDisabled:!!hero&&hero.disabled}})()");check('Secondary-city task claims are visibly disabled',taskControls?.count>0&&taskControls.allDisabled&&taskControls.heroTaskDisabled,JSON.stringify(taskControls));await evalPage("document.querySelector('[data-action=tab][data-tab=city]')?.click()");
  await saveScreenshot(cdp,path.join(evidence,'screenshot-hg10-secondary-city-chrome.png'));
  await evalPage('location.reload()');await pause(1000);
  const reload=await evalPage("(()=>{const s=window.HOG_APP_DEBUG.getState();return {id:s?.activeCityId,race:s?.race,cities:s?.cities?.length,stationed:s?.stationedHeroes?.some(h=>h.key==='9,10')}})()");
  check('Save persists both castles and garrison across file reload',reload?.id==='city-9-10'&&reload?.race==='elf'&&reload?.cities===2&&reload?.stationed,JSON.stringify(reload));
  check('Chrome reported no JavaScript exceptions',exceptions.length===0,exceptions.join('; '));
  const report={date:new Date().toISOString(),browser:'Google Chrome headless via local DevTools Protocol',viewport:'1280x980',url,seedDisclosure:'Fame set to 5,800 and outbound travel timer shortened after a real March click. Initial army, neutral defenders, battle rules and real Attack controls remained untouched.',checks,exceptions,screenshots:['docs/evidence/hg10/screenshot-hg10-offline-intro-chrome.png','docs/evidence/hg10/screenshot-hg10-neutral-castle-battle-chrome.png','docs/evidence/hg10/screenshot-hg10-secondary-city-chrome.png']};
  fs.writeFileSync(path.join(qa,'chrome-smoke.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({total:checks.length,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,screenshots:report.screenshots,checks},null,2));
 }finally{if(ws&&ws.readyState===WebSocket.OPEN)ws.close();browser.kill();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
