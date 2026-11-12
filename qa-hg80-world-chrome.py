"""HG80 real file:// browser: culling/performance, square province lines,
4 encounter archetypes, 100x100 world Save v07; Windows/Android emulated."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,atexit,sys
ROOT=Path(__file__).parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg80';ART=ROOT/'docs/evidence/hg80'
QA.mkdir(parents=True,exist_ok=True);ART.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screenshots=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(label,good,data=None):
    checks.append({'label':label,'pass':bool(good),'data':data})
    print('HG80 CHROME '+('PASS ' if good else 'FAIL ')+label+' '+str(data)[:340],flush=True)
    if not good:raise AssertionError(label+' '+str(data))
def report():
    (QA/'world-perf-chrome.json').write_text(json.dumps({
        'file_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
        'passed':sum(c['pass'] for c in checks),'total':len(checks),
        'checks':checks,'pageErrors':errors,'screenshots':screenshots,
        'browser':'real Chromium file://, no physical Android/Windows hardware'
    },ensure_ascii=False,indent=2),encoding='utf-8')
atexit.register(report)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,w,h,touch in [('pc-1280x720',1280,720,False),
                            ('phone-landscape-844x390',844,390,True),
                            ('phone-portrait-412x915',412,915,True)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,
                                has_touch=touch,device_scale_factor=2 if touch else 1)
        page=ctx.new_page();page.set_default_timeout(22000)
        page.on('pageerror',lambda e,screen=label:errors.append({'screen':screen,'error':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
        page.locator('[data-action="start"]').click()
        data=page.evaluate("""() => {
          const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
          const canvas=document.getElementById('world-canvas');
          const mini=P.hg80MiniTerrain(E,Math.round(P.miniBounds(canvas).w)-18,Math.round(P.miniBounds(canvas).h)-18);
          const miniAgain=P.hg80MiniTerrain(E,Math.round(P.miniBounds(canvas).w)-18,Math.round(P.miniBounds(canvas).h)-18);
          const world=P.mapCamera(),q=world.zoom*48,ox=canvas.width/2-world.centerX*q,oy=canvas.height/2-world.centerY*q;
          const cells=P.hg80VisibleTiles(E,q,ox,oy,canvas.width,canvas.height);
          const before=E.serializeSave(s),start=performance.now(),times=[];
          for(let i=0;i<12;i++){
           const t=performance.now();
           P.panMap(i%2?.4:-.4,.13,E.WIDTH,E.HEIGHT);
           P.drawWorld(canvas,E,s,null);
           times.push(performance.now()-t);
          }
          const elapsed=performance.now()-start;
          const hit=P.mapHit(canvas,canvas.width/2,canvas.height/2,E);
          const after=E.serializeSave(s);
          const oldState=JSON.parse(before),newState=JSON.parse(after);
          const changed=Object.keys(newState).filter(k=>JSON.stringify(oldState[k])!==JSON.stringify(newState[k]));
          return {valid:E.strictSave(s),save:s.version,visible:cells.length,total:E.TILES.length,
           cached:mini===miniAgain,saved:before===after,changedKeys:changed,
           changedValues:Object.fromEntries(changed.slice(0,3).map(k=>[k,{
             old:JSON.stringify(oldState[k])?.slice(0,160),current:JSON.stringify(newState[k])?.slice(0,160)
           }])),cameraHit:hit?.key||null,
           view:{width:canvas.width,height:canvas.height},
           ms12:Math.round(elapsed),frameMs:times.map(x=>Math.round(x*10)/10),
           monsterTypes:['Wolves','Bandits','Azrael','Wyverns'].map(value=>P.encounterKind({value,level:3,eliteTier:value==='Azrael'?11:0}))};
        }""")
        check(label+' visible-only terrain painting instead of 10000-cell world sweep',
              0<data['visible']<data['total']/5,data)
        check(label+' minimap reused immutable terrain raster and never changed Save v07',
              data['cached'] and data['saved'] and data['valid'] and data['save']==7,data)
        check(label+' four distinct world monster silhouettes, correct square-map hit',
              len(set(data['monsterTypes']))==4 and bool(data['cameraHit']),data['monsterTypes'])
        check(label+' 12 continuous pans render without fatal synchronous jank',
              max(data['frameMs'])<1000,{'frameMs':data['frameMs'],'ms12':data['ms12']})
        target=ART/(label+'-polished-world.png')
        page.screenshot(path=str(target),animations='disabled')
        screenshots.append({'path':target.relative_to(ROOT).as_posix(),
          'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        ctx.close()
    browser.close()
check('zero JavaScript exceptions in three real Chromium viewports',not errors,errors)
print('HG80 CHROME SUMMARY',sum(c['pass'] for c in checks),'/',len(checks),flush=True)
