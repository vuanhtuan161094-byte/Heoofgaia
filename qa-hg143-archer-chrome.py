"""HG14.3 live Chromium: source-registered 48-frame Archer in real combat."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,os,sys
if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs/evidence/hg143";OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/"docs/qa/hg143";QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screenshots=[]
def check(label,condition):
 ok=bool(condition);checks.append({"name":label,"passed":ok})
 print(("PASS " if ok else "FAIL ")+label,flush=True)
with sync_playwright() as pw:
 launch={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"]}
 if os.environ.get("HOG_CHROME_PATH"):launch["executable_path"]=os.environ["HOG_CHROME_PATH"]
 browser=pw.chromium.launch(**launch)
 page=browser.new_page(viewport={"width":1280,"height":720})
 page.on("pageerror",lambda e:errors.append(str(e)))
 page.set_default_timeout(12000)
 page.goto(HTML.as_uri(),wait_until="load")
 page.locator('[data-action="start"]').click()
 fixture=page.evaluate("""() => {
   const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),img=document.getElementById('unit-human-archer-atlas');
   s.army.human_3=16;E.setFormation(s,[{unitId:'human_3',count:16}]);
   const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
   E.startMarch(s,npc.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
   HOG_APP_DEBUG.render();
   return {loaded:img?.complete&&img.naturalWidth===2048&&img.naturalHeight===1536,
      inline:img?.src?.startsWith('data:image/png;base64,'),
      battle:!!s.battle,unit:s.battle?.allies.some(u=>u.unitId==='human_3'),
      valid:E.strictSave(s),clips:Object.keys(P.ARCHER_CLIPS)};
 }""")
 check("Standalone file:// embeds actual 2048x1536 Archer PNG atlas",fixture["loaded"] and fixture["inline"])
 check("Archer marches into live NPC battle with real 16 troops",fixture["battle"] and fixture["unit"])
 check("Battle state remains strict v07 save compatible",fixture["valid"])
 check("Renderer registers Idle Walk Draw Release Hit Death",fixture["clips"]==["idle","walk","draw","release","hit","death"])
 sample=page.evaluate("""() => {
   const c=document.getElementById('battle-canvas'),ctx=c.getContext('2d'),P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
   const old=ctx.drawImage,calls=[],runtimeId=HOG_HG33_TROOP_ATLASES?.resolve?.('human_3')?.imageId;
   ctx.drawImage=function(img,...args){if(img?.id==='unit-human-archer-atlas'||img?.id===runtimeId)calls.push([args[0],args[1],args.length]);return old.call(this,img,...args)};
   const before=JSON.stringify(E.clone(s));
   try{
    P.drawBattle(c,E,s,performance.now()+70);
    const actual=calls.length,frames=[];
    for(const [act,t,d] of [['idle',0,1100],['idle',350,1100],['walk',140,750],['walk',560,750],['draw',400,510],['release',180,360],['attack',180,650],['attack',590,650],['hit',120,540],['death',820,950]]){
      P.animatedArcher(ctx,240,290,false,{action:act,time:t,duration:d,alpha:1},1);
      const call=calls[calls.length-1];frames.push([act,call?.[0]/256,call?.[1]/256]);
    }
    return {actual,frames,runtimeAtlas:HOG_HG33_TROOP_ATLASES?.resolve?.('human_3')?.imageId||null,unchanged:JSON.stringify(E.clone(s))===before};
   }finally{ctx.drawImage=old}
 }""")
 check("Real battlefield renderer draws the runtime-resolved Archer atlas",sample["actual"]>=1)
 check("Renderer reads but never mutates battle state",sample["unchanged"])
 families={act:next((f[2] for f in sample["frames"] if f[0]==act),None) for act in ("idle","walk","draw","release","hit","death")}
 check("All six actions select their actual separate PNG rows",families=={"idle":0,"walk":1,"draw":2,"release":3,"hit":4,"death":5})
 check("Idle and walk select different sequential frames",sample["frames"][0][1]!=sample["frames"][1][1] and sample["frames"][2][1]!=sample["frames"][3][1])
 check("Attack triggers Draw then Release rather than a single-frame lunge",sample["frames"][6][2]==2 and sample["frames"][7][2]==3)
 check("All atlas frames stay within 0..7 columns",all(isinstance(f[1],(int,float)) and 0<=f[1]<=7 for f in sample["frames"]))
 page.evaluate("HOG_APP_DEBUG.render()")
 path=OUT/"human-archer-live-battle-desktop.png"
 page.screenshot(path=str(path),full_page=False);screenshots.append(str(path.relative_to(ROOT)))
 page.locator('[data-action="save-combat"]').click()
 page.reload(wait_until="load")
 check("Cold Save/Reload restores same playable Archer combat",page.evaluate("""() => {
  const s=HOG_APP_DEBUG.getState(),img=document.getElementById('unit-human-archer-atlas');
  return !!s?.battle&&s.battle.allies.some(u=>u.unitId==='human_3')&&img?.naturalWidth===2048;
 }"""))
 page.set_viewport_size({"width":960,"height":540})
 page.evaluate("window.dispatchEvent(new Event('resize'))")
 page.wait_for_timeout(180)
 check("Mobile landscape retains proper sprite and canvas aspect",page.evaluate("""() => {
  const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect(),P=HOG_PAINTER;
  const k=P.battleSpriteScale(c.height,0,9),
   soldierPx=Math.max(64,Math.min(125,113*k)),
   s=HOG_APP_DEBUG.getState(),
   layout=P.battleUnitLayout(s.battle,P.battleProjection(c,HOG_ENGINE),c.width,c.height);
  return Math.abs(c.width/r.width-c.height/r.height)<.008&&
   soldierPx>=64&&soldierPx<=110&&
   layout.every(e=>Math.abs(e.x-e.baseX)<=18.01&&Math.abs(e.y-e.baseY)<.01)&&
   document.documentElement.scrollWidth<=innerWidth+1;
 }"""))
 path=OUT/"human-archer-live-battle-landscape.png"
 page.screenshot(path=str(path),full_page=False);screenshots.append(str(path.relative_to(ROOT)))
 check("No page JavaScript errors",len(errors)==0)
 browser.close()
report={"status":"PASS" if all(c["passed"] for c in checks) else "FAIL",
 "passed":sum(c["passed"] for c in checks),"total":len(checks),
 "checks":checks,"draw_receipt":sample,"screenshots":screenshots,"errors":errors,
 "html_sha256":hashlib.sha256(HTML.read_bytes()).hexdigest()}
(QA/"archer-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(f"HG14.3 ARCHER CHROMIUM {report['passed']}/{report['total']} PASS",flush=True)
raise SystemExit(0 if report["status"]=="PASS" else 1)
