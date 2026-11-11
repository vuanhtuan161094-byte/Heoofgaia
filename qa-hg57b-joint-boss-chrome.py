"""HG57-B real file:// 3 hero x 2 stacks / 16 Boss combat draw benchmark.
Each instance uses a canonical dispatched Boss. Two cloned *hero records* are
a documented QA fixture; six owners, real available troops, no free currency.
Only after validating the real deployment, the in-memory defender HP/ATK are
stabilized to stress *rendering*, without claiming a combat win.
"""
from pathlib import Path
import atexit,hashlib,json,statistics,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg57b';SHOTS=ROOT/'docs/evidence/hg57b'
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];measurements=[];errors=[];screens=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf8',errors='replace')
def check(label,ok,detail=None):
 checks.append({'name':label,'pass':bool(ok),'details':detail})
 print(('HG57B PASS ' if ok else 'HG57B FAIL ')+label+' '+str(detail)[:320],flush=True)
 if not ok:raise AssertionError(label+' '+str(detail)[:800])
def shot(page,label):
 file=SHOTS/(label+'.png');page.screenshot(path=str(file),animations='disabled')
 screens.append({'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
def dump():
 data={'suite':'HG57-B 3 genuine hero owner groups x2 vs 16 real Boss stack rendering',
  'source_html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
  'passed':sum(x['pass'] for x in checks),'total':len(checks),
  'checks':checks,'metrics':measurements,'errors':errors,'screenshots':screens,
  'fixture':'Real HG26 dispatch/AP/12 starting army/6 owner slots/16 enemy actors; render-only test makes enemy damage zero and health very high to prevent premature battle completion. NO rewards claimed and no game authority modified in GitHub.'}
 (OUT/'joint-boss-performance.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(dump)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files','--enable-precise-memory-info'])
 for label,w,h,touch in [('desktop-1280x720',1280,720,False),
  ('ultrawide-1818x830',1818,830,False),
  ('mobile-landscape-844x390',844,390,True),('mobile-portrait-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=touch,has_touch=touch)
  page=ctx.new_page();page.set_default_timeout(20000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="start"]').click()
  deployed=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    const base=JSON.parse(JSON.stringify(s.heroes[0]));
    for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'HG57-B hero '+id});
    for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[
      {unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
    const target=E.hg24RecommendBoss(s).filter(x=>!x.privateBoss)
      .sort((a,b)=>a.stars-b.stars||a.distance-b.distance)[0];
    if(!target)throw Error('No reachable Boss');
    const ap=s.ap,army=s.army.human_1;
    E.hg26Start(s,{target:target.key,heroId:null,maxRuns:1,keepAP:0,
      minUnits:12,minCoverage:100,maxLossPercent:100,autoHeal:false,
      autoRecruit:false,stopOnLoss:true,team:[1,2,3].map(heroId=>({heroId,slots:[0,1]}))});
    const departed=E.hg26Step(s),apAfterDispatch=s.ap;
    E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
    const arrived=E.hg26Step(s),b=s.battle;
    const original={valid:E.strictSave(s),apBefore:ap,apAfter:s.ap,
      apAfterDispatch,armyBefore:army,armyAfter:s.army.human_1,rewards:s.hg409.rewards.length,
      roster:b?.allies.map(u=>u.heroId),enemies:b?.enemies.length,
      heroNames:s.heroes.slice(0,3).map(h=>h.name),
      phase:b?.hg261Joint?.version||b?.hg261Joint?.v,
      deployment:departed.type,arrival:arrived.type,
      code:E.V};
    // QA stress-only: never interpret this synthetic toughness as balancing.
    // Same original 22 visual actors, renderer, CSS and HUD, real owner IDs.
    for(const enemy of b.enemies){enemy.hp=2000000;
      enemy.pool=enemy.hp*enemy.count;enemy.atk=0;enemy.def=0;}
    HOG_APP_DEBUG.render();
    original.commanders=document.querySelectorAll('[data-hg57-leaders] .hg57-hero-chip').length;
    const canvas=document.getElementById('battle-canvas'),stage=document.querySelector('.battle-stage');
    const canvasRect=canvas.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    original.stageGeometry={canvasTop:canvasRect.top,canvasBottom:canvasRect.bottom,
     stageTop:stageRect.top,stageBottom:stageRect.bottom,
     fits:canvasRect.top>=stageRect.top-1&&canvasRect.bottom<=stageRect.bottom+1};
    const P=HOG_PAINTER,
      old=P.drawBattle,metric={calls:[],drawMs:[],sameCanvas:true,
        heapBefore:performance.memory?.usedJSHeapSize??null};
    P.drawBattle=function(c,...args){
      const start=performance.now(),result=old.call(this,c,...args);
      if(c.id==='battle-canvas'){metric.calls.push(performance.now());
        metric.drawMs.push(performance.now()-start);
        if(c!==canvas)metric.sameCanvas=false;}
      return result;
    };
    window._hg57b={old,metric,canvas};
    return {...original,postStressValid:E.strictSave(s)};
  }""")
  check(label+' 3 real commanders x2 slots, 16 actual Boss actors, strict Save v07',
   deployed['valid'] and deployed['postStressValid'] and
   deployed['roster']==[1,1,2,2,3,3] and deployed['enemies']==16 and
   deployed['deployment']=='dispatched' and deployed['arrival']=='battle_open' and
   deployed['apAfterDispatch']<deployed['apBefore'] and
   deployed['armyAfter']<=deployed['armyBefore'] and
   deployed['rewards']==0 and deployed['code']==7,deployed)
  check(label+' 3 actual hero portraits and actual opponent commander visible',
   deployed['commanders']==4,{'cards':deployed['commanders'],'heroes':deployed['heroNames']})
  if w>=1000:
   check(label+' battle canvas fits inside stage (feet/commands never clipped)',
    deployed['stageGeometry']['fits'],deployed['stageGeometry'])
  page.wait_for_timeout(2600)
  frame=page.evaluate("""() => {
   const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),P=HOG_PAINTER,m=window._hg57b.metric,
     n=m.calls.length,delta=m.calls.slice(1).map((v,i)=>v-m.calls[i]),
     sorted=(a)=>a.filter(Number.isFinite).sort((x,y)=>x-y),
     d=sorted(delta),cost=sorted(m.drawMs),
     pct=(a,p)=>a.length?a[Math.floor((a.length-1)*p)]:null;
   P.drawBattle=window._hg57b.old;
   const memory=performance.memory?.usedJSHeapSize??null;
   return {frames:n,fps:n>1?+(1000*(n-1)/(m.calls[n-1]-m.calls[0])).toFixed(2):0,
    deltaP95Ms:pct(d,.95),drawP50Ms:pct(cost,.5),drawP95Ms:pct(cost,.95),
    drawWorstMs:cost[cost.length-1]??null,heapBeforeBytes:m.heapBefore,
    heapAfterBytes:memory,heapGrowthBytes:memory===null||m.heapBefore===null?null:memory-m.heapBefore,
    stableCanvas:m.sameCanvas&&document.getElementById('battle-canvas')===window._hg57b.canvas,
    strictSave:E.strictSave(s),gameOver:!s.battle,
    currentTurn:s.battle?.turn??null,realGroups:s.battle?.allies.map(u=>u.heroId),
    totalActors:s.battle?s.battle.allies.length+s.battle.enemies.length:0,
    activeHUD:document.querySelectorAll('#resources button.resource').length};
  }""")
  measurements.append({'viewport':label,'dimensions':[w,h],'performance':frame,'deployment':deployed})
  minimum=20 if not touch else 16
  check(label+' sampled real Canvas FPS meets runner minimum',
   frame['fps']>=minimum and frame['frames']>=25 and
   frame['stableCanvas'] and frame['drawP95Ms'] is not None and
   frame['drawP95Ms']<55 and frame['deltaP95Ms']<85,frame)
  check(label+' no Canvas recreation, UI source or Save corruption during 22 actor stress',
   frame['strictSave'] and frame['stableCanvas'] and not frame['gameOver'] and
   frame['activeHUD']==5 and frame['totalActors']==22 and
   frame['realGroups']==[1,1,2,2,3,3],frame)
  shot(page,label+'-3heroes-16boss-real-canvas')
  check(label+' zero uncaught JS exceptions',not [e for e in errors if e['viewport']==label],errors)
  ctx.close()
 browser.close()
print('HG57B BROWSER '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks)),flush=True)
