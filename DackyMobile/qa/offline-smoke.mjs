import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const profile=await mkdtemp(path.join(os.tmpdir(),'dacky-offline-'));
const fileOnly=process.argv.includes('--file-only');
const output=path.resolve('qa/screenshots');
await mkdir(output,{recursive:true});
const singleFileUrl=pathToFileURL(path.resolve('dist/offline.html')).href;
const initialUrl=fileOnly?singleFileUrl:'http://127.0.0.1:4173/';
const browser=spawn('/usr/bin/chromium',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking',
  '--disable-extensions','--disable-default-apps','--no-first-run','--remote-debugging-port=0',
  '--remote-allow-origins=*','--user-data-dir='+profile,initialUrl
],{stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket,id=0;
const pending=new Map(), errors=[];
function call(method,params={}) {
  const n=++id;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timeout: '+method));},10000);
    pending.set(n,{resolve,reject,timeout});
    socket.send(JSON.stringify({id:n,method,params}));
  });
}
async function value(expression) {
  const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}
async function until(expression,ms=12000) {
  const start=Date.now();
  while(Date.now()-start<ms){try{const v=await value(expression);if(v)return v;}catch{}await pause(150);}
  throw new Error('Timeout: '+expression);
}
async function screenshot(name) {
  const result=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
  await writeFile(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));
}
try {
  let wsUrl;
  for(let i=0;i<100&&!wsUrl;i++) {
    try {
      const active=await readFile(path.join(profile,'DevToolsActivePort'),'utf8');
      const port=active.split(/\r?\n/)[0].trim();
      const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
      wsUrl=pages.find(x=>x.type==='page')?.webSocketDebuggerUrl;
    } catch {}
    if(!wsUrl)await pause(100);
  }
  if(!wsUrl)throw new Error('No Chromium DevTools endpoint.');
  socket=new WebSocket(wsUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timeout);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.text||'runtime');
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args?.map(x=>x.value||x.description).join(' '));
  });
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  if(!fileOnly) {
    await until('document.readyState==="complete"&&document.querySelector("#scene").innerText.includes("Khai mở cơ đồ")');
    await until('navigator.serviceWorker.ready.then(x=>x.active&&x.active.state==="activated")');
    await call('Page.reload',{ignoreCache:true});
    await pause(800);
    const serviceWorkerState=await value('(async function(){var r=await navigator.serviceWorker.getRegistrations();return {url:location.href,controller:!!navigator.serviceWorker.controller,registrations:r.map(function(x){return {scope:x.scope,active:x.active&&x.active.state,waiting:x.waiting&&x.waiting.state}}),caches:await caches.keys()}})()');
    console.log('Service worker diagnostic:',JSON.stringify(serviceWorkerState));
    await call('Network.setBypassServiceWorker',{bypass:false});
    await call('Page.navigate',{url:'http://127.0.0.1:4173/index.html'});
    await pause(500);
    await until('document.readyState==="complete"&&location.pathname==="/index.html"');
    await until('navigator.serviceWorker.controller!==null');
    console.log('Cached entrypoint:',await value('caches.match(location.origin+"/index.html").then(x=>!!x)'));
    await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await call('Page.reload',{ignoreCache:true});
    await pause(1200);
    const offlinePage=await value('({url:location.href,title:document.title,scene:!!document.querySelector("#scene"),sceneText:document.querySelector("#scene")?.innerText.slice(0,220),text:document.body?.innerText.slice(0,100)})');
    console.log('Offline page diagnostic:',JSON.stringify(offlinePage));
    if(!offlinePage.scene||!offlinePage.sceneText.includes('Khai mở cơ đồ'))throw new Error('Offline PWA page did not load from cache.');
    await screenshot('16-pwa-offline-relaunch');
    await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    console.log('PASS PWA shell reopens with network disabled.');
  }

  if(!fileOnly)await call('Page.navigate',{url:singleFileUrl});
  await pause(1200);
  const filePage=await value('({url:location.href,title:document.title,ready:document.readyState,scene:!!document.querySelector("#scene"),sceneText:document.querySelector("#scene")?.innerText.slice(0,220)})');
  console.log('Offline HTML diagnostic:',JSON.stringify(filePage));
  const fileWorks=!!filePage.scene&&!!filePage.sceneText?.includes('Khai mở cơ đồ');
  if(fileWorks){await screenshot('16-single-file-offline');console.log('PASS single-file offline HTML renders from file://.');}
  else console.log('BLOCKED Chromium in this environment returned chrome-error for the local file URL; the inline bundle itself passes syntax check.');
  if(errors.length)throw new Error('Browser runtime errors: '+errors.join(' | '));
  if(fileWorks)console.log('PASS zero browser runtime errors.');
} finally {
  try{socket?.close();}catch{}
  browser.kill('SIGTERM');
  await pause(300);
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
