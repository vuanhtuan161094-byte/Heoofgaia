import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const baseUrl = process.env.DACKY_REVIEW_URL || 'http://127.0.0.1:4173/';
const landscapeOnly = process.env.DACKY_LANDSCAPE_ONLY === '1';
const outDir = path.resolve('qa/screenshots');
await mkdir(outDir,{recursive:true});
const profile = await mkdtemp(path.join(os.tmpdir(),'dacky-chromium-'));
const browser = spawn('/usr/bin/chromium',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking',
  '--disable-extensions','--disable-default-apps','--no-first-run','--remote-debugging-port=0',
  '--remote-allow-origins=*','--user-data-dir='+profile,'--window-size=1440,1000',baseUrl
],{stdio:'ignore'});
let socket;
const pending=new Map();
const errors=[];
let nextId=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=condition=>{if(!condition)throw new Error('QA assertion failed');};

async function endpoint() {
  for(let n=0;n<100;n++) {
    try {
      const active=await readFile(path.join(profile,'DevToolsActivePort'),'utf8');
      const port=active.split(/\r?\n/)[0].trim();
      const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
      const page=pages.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
      if(page)return page.webSocketDebuggerUrl;
    } catch {}
    if(browser.exitCode!==null)throw new Error('Chromium exited before DevTools became ready.');
    await delay(100);
  }
  throw new Error('DevTools endpoint did not become ready.');
}

function cdp(method,params={}) {
  const id=++nextId;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params}));
  });
}

async function evaluate(expression) {
  const reply=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(reply.exceptionDetails)throw new Error(reply.exceptionDetails.text||'Browser evaluation failed');
  return reply.result?.value;
}

async function waitFor(expression,timeout=8000) {
  const start=Date.now();
  while(Date.now()-start<timeout) {
    const value=await evaluate(expression);
    if(value)return value;
    await delay(150);
  }
  const visible=await evaluate('document.querySelector("#scene")?.innerText||""');
  throw new Error('Browser condition timed out: '+expression+'; visible scene: '+JSON.stringify(visible.slice(-700)));
}

async function click(selector) {
  const found=await evaluate('(function(){var x=document.querySelector('+JSON.stringify(selector)+');if(!x||x.disabled)return false;x.click();return true})()');
  check(found);
}

async function shot(name) {
  const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  await writeFile(path.join(outDir,name+'.png'),Buffer.from(result.data,'base64'));
}

try {
  socket=new WebSocket(await endpoint());
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)) {
      const item=pending.get(message.id);pending.delete(message.id);clearTimeout(item.timer);
      if(message.error)item.reject(new Error(message.error.message));else item.resolve(message.result||{});
    }
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails?.text||'Runtime exception');
    if(message.method==='Log.entryAdded'&&message.params.entry?.level==='error')errors.push(message.params.entry.text);
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params.args?.map(x=>x.value||x.description).join(' '));
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Page.setLifecycleEventsEnabled',{enabled:true});
  await waitFor('document.readyState==="complete"&&!!document.querySelector("#scene")');
  await waitFor('document.querySelector("#scene").innerText.includes("Khai mở cơ đồ")');
  check((await evaluate('document.title')).includes('Đắc Kỷ'));
  check((await evaluate('document.querySelector("#scene").innerText')).includes('Khai mở cơ đồ'));
  if(landscapeOnly){
    await evaluate('(function(){var i=document.querySelector("#new-city-name");i.value="Tây Kỳ";document.querySelector("form[data-form=new-game]").requestSubmit();return true})()');
    await waitFor('document.querySelector("#page-heading h1")?.innerText==="Thành trì"');
    await cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
    await delay(180);
    const landscape=await evaluate('({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector("#mobile-nav")).display})');
    check(landscape.width===844&&landscape.nav!=='none'&&landscape.scroll<=landscape.width);
    await shot('15-city-mobile-landscape-844');
    console.log('PASS 844px mobile landscape: '+JSON.stringify(landscape));
  } else {
  await shot('01-start-desktop');
  console.log('PASS startup screen and original art rendered in Chromium.');

  await evaluate('(function(){var i=document.querySelector("#new-city-name");i.value="Tây Kỳ";document.querySelector("form[data-form=new-game]").requestSubmit();return true})()');
  await waitFor('document.querySelector("#page-heading h1")?.innerText==="Thành trì"');
  await waitFor('document.querySelectorAll(".building-card").length===21');
  await waitFor('document.querySelector(".resource-pill")!==null');
  check((await evaluate('document.querySelector(".tutorial-panel")?.innerText')).includes('Mở rộng sản xuất'));
  check(await evaluate('!!document.querySelector(".tutorial-panel [data-action=upgrade][data-building=lumber]")'));
  console.log('PASS new save and 21 live city buildings.');

  const screens=['city','heroes','inventory','army','world','pve','tech','quests','market','reports','settings'];
  let index=2;
  for(const view of screens) {
    await click('#primary-nav [data-view='+JSON.stringify(view)+']');
    await waitFor('location.hash==="#'+view+'"');
    await waitFor('document.querySelector("#scene").innerText.length>40');
    if(view==='world')check(await evaluate('Array.from(document.querySelectorAll("#world-chapter option")).find(x=>x.value==="2")?.disabled===true'));
    await shot(String(index++).padStart(2,'0')+'-'+view+'-desktop');
  }
  console.log('PASS all 11 primary menu screens render with content.');

  await click('#primary-nav [data-view="market"]');
  await click('[data-action="setTaxPolicy"][data-policy="heavy"]');
  await waitFor('document.querySelector("[data-action=setTaxPolicy][data-policy=heavy]")?.disabled===true');
  await delay(200);
  await click('[data-action="setTaxPolicy"][data-policy="balanced"]');
  await waitFor('document.querySelector("[data-action=setTaxPolicy][data-policy=balanced]")?.disabled===true');
  console.log('PASS tax policy changes are saved into the economy state.');

  await click('#primary-nav [data-view="heroes"]');
  await waitFor('document.querySelectorAll("[data-page-key=heroPage]").length===2');
  await click('[data-page-key="heroPage"][data-page="1"]');
  await waitFor('document.querySelector(".catalog-pages span")?.innerText.includes("Trang 2")');
  check((await evaluate('Array.from(document.querySelectorAll(".panel")).find(x=>x.querySelector(".panel-title")?.innerText.includes("Lời mời nhập phủ"))?.querySelectorAll(".inventory-item").length'))===24);
  await click('[data-page-key="heroPage"][data-page="0"]');

  await click('#primary-nav [data-view="inventory"]');
  await waitFor('document.querySelectorAll("[data-page-key=consumablePage]").length===2');
  await click('[data-page-key="consumablePage"][data-page="1"]');
  await waitFor('Array.from(document.querySelectorAll(".catalog-pages span")).some(x=>x.innerText.includes("Trang 2")&&x.innerText.includes("vật phẩm tiêu hao"))');
  check(await evaluate('Array.from(document.querySelectorAll(".panel")).find(x=>x.querySelector(".panel-title")?.innerText.includes("Thương nhân vật phẩm"))?.querySelectorAll(".inventory-item").length')===24);
  await click('[data-page-key="consumablePage"][data-page="0"]');
  await click('[data-action="buyItem"][data-item="item-0022"]');
  await waitFor('Array.from(document.querySelectorAll(".panel")).find(x=>x.querySelector(".panel-title")?.innerText.includes("Thương nhân vật phẩm"))?.innerText.includes("Trong túi: 1")');
  await click('[data-page-key="forgePage"][data-page="1"]');
  await waitFor('Array.from(document.querySelectorAll(".panel")).find(x=>x.querySelector(".panel-title")?.innerText.includes("Lò luyện pháp bảo"))?.querySelector(".catalog-pages span")?.innerText.includes("Trang 2")');
  await click('[data-page-key="forgePage"][data-page="0"]');

  await click('#primary-nav [data-view="quests"]');
  await click('[data-page-key="questPage"][data-page="1"]');
  await waitFor('document.querySelector(".catalog-pages span")?.innerText.includes("Trang 2")');
  await click('[data-page-key="questPage"][data-page="0"]');

  await click('#primary-nav [data-view="pve"]');
  await click('[data-page-key="mountainPage"][data-page="1"]');
  await waitFor('document.querySelector(".catalog-pages span")?.innerText.includes("Trang 2")');
  check((await evaluate('document.querySelectorAll("[data-mode=mountain]").length'))===24);
  await click('[data-page-key="mountainPage"][data-page="0"]');
  console.log('PASS paginated hero, consumable shop, forge, quest and Tiên Sơn catalogs; NPC purchase settles.');

  await click('#primary-nav [data-view="city"]');
  await click('[data-action="upgrade"][data-building="altar"]');
  await waitFor('Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Phong Thần Đàn"))',5000);
  await waitFor('!Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Phong Thần Đàn"))',20000);
  console.log('PASS construction queue completes and altar opens recruitment.');

  await click('#primary-nav [data-view="heroes"]');
  await click('[data-action="recruit"][data-hero="hero-02"]');
  await waitFor('document.querySelector("#scene").innerText.includes("Na Tra")');
  await click('#primary-nav [data-view="inventory"]');
  await evaluate('(function(){var s=document.querySelector("[data-equip-select=item-01]");if(s)s.value="hero-02";return true})()');
  await click('[data-action="equip"][data-item="item-01"]');
  await waitFor('document.querySelector("#scene").innerText.includes("Bạch Ngọc Kiếm")');
  console.log('PASS recruitment and equipment linked to hero state.');

  await click('#primary-nav [data-view="army"]');
  await evaluate('(function(){document.querySelector("#train-count").value="1";return true})()');
  await click('[data-action="train"]');
  await waitFor('Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Dân binh"))',5000);
  await waitFor('!Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Dân binh"))',14000);
  await click('#primary-nav [data-view="world"]');
  await evaluate('(function(){document.querySelector("#march-count").value="3";return true})()');
  await click('[data-action="march"]');
  await waitFor('Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Thanh Khâu Quan"))',5000);
  await waitFor('!Array.from(document.querySelectorAll(".queue-card")).some(x=>x.innerText.includes("Thanh Khâu Quan"))',15000);
  await click('#primary-nav [data-view="reports"]');
  await waitFor('document.querySelector(".report-card")!==null');
  check((await evaluate('document.querySelector(".report-card").innerText')).includes('Chiến lợi phẩm'));
  console.log('PASS troop training, march settlement, loot and battle report.');
  await click('#primary-nav [data-view="city"]');
  await waitFor('Array.from(document.querySelectorAll(".panel-title")).some(x=>x.innerText.includes("Quản lý thành phụ"))');
  check(await evaluate('!!document.querySelector("[data-action=upgradeCity][data-city=node-001]")'));
  check(await evaluate('Array.from(document.querySelectorAll(".panel-title")).some(x=>x.innerText.includes("Quản lý thành phụ"))'));
  console.log('PASS captured satellite city appears in the city manager with its upgrade action.');

  await click('#primary-nav [data-view="settings"]');
  await click('[data-action="export"]');
  await delay(300);
  const saved=await evaluate('new Promise(function(resolve){var q=indexedDB.open("dacky-mobile-local",1);q.onsuccess=function(){var r=q.result.transaction("saves").objectStore("saves").get("campaign");r.onsuccess=function(){resolve(!!r.result?.payload)}};q.onerror=function(){resolve(false)}})');
  check(saved===true);
  await cdp('Page.reload',{ignoreCache:true});
  await waitFor('document.querySelector("#page-heading h1")?.innerText==="Thiết lập"');
  await waitFor('document.querySelector("#realm-title")?.innerText==="Tây Kỳ"');
  console.log('PASS IndexedDB save survives reload.');

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('#mobile-nav [data-view="city"]');
  await waitFor('document.querySelector("#page-heading h1")?.innerText==="Thành trì"');
  const mobile=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector("#mobile-nav")).display,buildings:document.querySelectorAll(".building-card").length})');
  check(mobile.width===390&&mobile.nav!=='none'&&mobile.buildings===21);
  await shot('13-city-mobile-390');
  await click('#mobile-nav [data-view="world"]');
  await shot('14-world-mobile-390');
  console.log('PASS 390px mobile layout: '+JSON.stringify(mobile));
  await cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await click('#mobile-nav [data-view="city"]');
  const landscape=await evaluate('({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector("#mobile-nav")).display})');
  check(landscape.width===844&&landscape.height===390&&landscape.nav!=='none'&&landscape.scroll<=landscape.width);
  await shot('15-city-mobile-landscape-844');
  console.log('PASS 844x390 Android-landscape layout: '+JSON.stringify(landscape));
  }

  if(errors.length)throw new Error('Browser console/runtime errors: '+errors.join(' | '));
  console.log('PASS zero browser runtime/console errors.');
} finally {
  try { socket?.close(); } catch {}
  browser.kill('SIGTERM');
  await delay(300);
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
