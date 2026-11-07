"""HG34/P0: real file:// battle animation pacing, canvas continuity and Save v07.

A synthetic high-HP / zero-ATK opponent is used ONLY to keep a real NPC
battle alive long enough to observe multiple auto turns. No rewards are
claimed; no performance metric is fabricated or obtained from a mock canvas.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import hashlib
import sys
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs/qa/hg34'
SCREENS=ROOT/'docs/evidence/hg34'
OUT.mkdir(parents=True,exist_ok=True)
SCREENS.mkdir(parents=True,exist_ok=True)
HTML=ROOT/'Play-Heoofgaia-HG11.html'
checks=[]
metrics=[]
errors=[]

def check(name,condition,evidence=None):
    ok=bool(condition)
    checks.append({'name':name,'pass':ok,'evidence':evidence})
    print(('PASS ' if ok else 'FAIL ')+name+' '+(json.dumps(evidence,ensure_ascii=False)[:250] if evidence is not None else ''),flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for width,height in ((1280,720),(960,540)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_default_timeout(15000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(HTML.as_uri(),wait_until='load')
        page.locator('[data-action="start"]').click()
        fixture=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          s.army.human_1=16;E.setFormation(s,[{unitId:'human_1',count:16}]);
          const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
          if(!npc)throw new Error('No reachable 1-star NPC');
          E.startMarch(s,npc.key);
          E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
          if(!s.battle)throw new Error('Real march did not open an NPC battle');
          // Fixture prolongs an authentic engine battle without grant of loot.
          for(const enemy of s.battle.enemies){
            enemy.hp=100000000;enemy.pool=enemy.hp*enemy.count;
            enemy.atk=0;enemy.def=0;
          }
          const b=s.battle;
          s.battleAuto=true;b.autoUntil=Date.now()+150;
          HOG_APP_DEBUG.render();
          const c=document.getElementById('battle-canvas');
          const P=HOG_PAINTER,cam=P.battleProjection(c,E);
          const a=P.battleUnitLayout(b,cam,c.width,c.height),a2=P.battleUnitLayout(b,cam,c.width,c.height);
          const metrics={calls:[],drawMs:[],turns:[],canvasChanged:0};
          const draw=P.drawBattle;
          P.drawBattle=function(canvas,...args){
            const start=performance.now();
            const output=draw.call(this,canvas,...args);
            if(canvas.id==='battle-canvas'){
              metrics.calls.push(performance.now());
              metrics.drawMs.push(performance.now()-start);
              metrics.turns.push(s.battle?.turn||0);
              if(canvas!==c)metrics.canvasChanged++;
            }
            return output;
          };
          window._hg34={canvas:c,metrics,original:draw};
          return {valid:E.strictSave(s),cachedLayout:a===a2,
            canvasW:c.width,canvasH:c.height,
            battleId:b.target,initialTurn:b.turn};
        }""")
        label=f'{width}x{height}'
        check(label+' initial real NPC battle and reusable layout',
              fixture['valid'] and fixture['cachedLayout'] and fixture['canvasW']>300 and fixture['canvasH']>250,fixture)
        page.wait_for_timeout(4250)
        result=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),b=s.battle;
          const m=window._hg34.metrics,now=document.getElementById('battle-canvas');
          const deltas=m.calls.slice(1).map((v,i)=>v-m.calls[i]).sort((a,b)=>a-b);
          const sorted=m.drawMs.slice().sort((a,b)=>a-b);
          const pct=(a,p)=>a.length?a[Math.floor((a.length-1)*p)]:null;
          const fps=m.calls.length>1?(m.calls.length-1)*1000/(m.calls[m.calls.length-1]-m.calls[0]):0;
          const turn=b?.turn||0;
          HOG_PAINTER.drawBattle=window._hg34.original;
          let reload=null;
          try{reload=E.parseSave(E.serializeSave(s)).battle?.turn;}catch(e){reload='ERR '+e.message;}
          return {
            observedFrames:m.calls.length,observedFps:+fps.toFixed(2),
            frameP50Ms:pct(deltas,.50),frameP75Ms:pct(deltas,.75),frameP95Ms:pct(deltas,.95),
            drawP50Ms:pct(sorted,.5),drawP95Ms:pct(sorted,.95),
            drawWorstMs:sorted[sorted.length-1],
            canvasStable:now===window._hg34.canvas&&m.canvasChanged===0,
            turn,renderedTurns:[...new Set(m.turns)],header:document.querySelector('.combat-scene-title .tag')?.textContent,
            valid:E.strictSave(s),coldCopyTurn:reload,
            viewport:{innerWidth,innerHeight},
            scrollX:document.documentElement.scrollWidth>innerWidth+1
          };
        }""")
        metrics.append({'viewport':label,'fixture':fixture,'result':result})
        check(label+' automatic combat advanced without resetting canvas',
              result['turn']>=fixture['initialTurn']+2 and result['canvasStable'] and
              len(result['renderedTurns'])>=2, result)
        check(label+' frame pacing exceeds obsolete 24 FPS throttle',
              result['observedFps']>=29 and result['frameP75Ms'] is not None and
              result['frameP75Ms']<40.5,{'fps':result['observedFps'],'frameP75Ms':result['frameP75Ms']})
        check(label+' current turn HUD and Save v07 remain consistent',
              result['valid'] and result['coldCopyTurn']==result['turn'] and
              result['header'] is not None and
              result['header'].startswith('Lượt '+str(result['turn'])+' ·') and
              not result['scrollX'],
              {'turn':result['turn'],'header':result['header'],'save':result['coldCopyTurn']})
        page.screenshot(path=str(SCREENS/f'combat-auto-live-{width}x{height}.png'),animations='disabled')
        page.close()
    # A distinct HG26 real joint Boss expedition advances its turns through the
    # 1-second economy tick, not the manual auto scheduler. This previously
    # destroyed and recreated the canvas once per Boss turn.
    bossPage=browser.new_page(viewport={'width':960,'height':540})
    bossPage.on('pageerror',lambda e:errors.append(str(e)))
    bossPage.goto(HTML.as_uri(),wait_until='load')
    bossPage.locator('[data-action="start"]').click()
    bossFixture=bossPage.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      const base=JSON.parse(JSON.stringify(s.heroes[0]));
      for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'QA hero '+id});
      for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[
        {unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
      const target=E.hg24RecommendBoss(s).filter(x=>!x.privateBoss)
        .sort((a,b)=>a.stars-b.stars||a.distance-b.distance)[0];
      if(!target)throw new Error('No reachable real world Boss');
      const team=[1,2,3].map(heroId=>({heroId,slots:[0,1]}));
      E.hg26Start(s,{target:target.key,heroId:null,maxRuns:1,keepAP:0,
        minUnits:12,minCoverage:100,maxLossPercent:100,
        autoHeal:false,autoRecruit:false,stopOnLoss:true,team});
      const departed=E.hg26Step(s);
      E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
      const entered=E.hg26Step(s);
      for(const enemy of s.battle.enemies){
        enemy.hp=2000000;enemy.pool=enemy.count*enemy.hp;
        enemy.atk=0;enemy.def=0;
      }
      HOG_APP_DEBUG.render();
      const canvas=document.getElementById('battle-canvas');
      const P=HOG_PAINTER,original=P.drawBattle;
      const metric={calls:[],stable:true};
      P.drawBattle=function(c,...args){
        if(c.id==='battle-canvas'){
          metric.calls.push(performance.now());
          if(c!==canvas)metric.stable=false;
        }
        return original.call(this,c,...args);
      };
      window._bossPerf={original,metric,canvas};
      return {valid:E.strictSave(s),deployed:departed.type,
        entered:entered.type,turn:s.battle.turn,
        ownerIds:s.battle.allies.map(u=>u.heroId),
        bossNames:s.battle.enemies.map(u=>u.name)};
    }""")
    check('HG26 real 3-hero × 2-stack Boss auto pacing fixture valid',
          bossFixture['valid'] and bossFixture['deployed']=='dispatched' and
          bossFixture['entered']=='battle_open' and
          bossFixture['ownerIds']==[1,1,2,2,3,3] and
          len(bossFixture['bossNames'])==3,bossFixture)
    bossPage.wait_for_timeout(3550)
    bossResult=bossPage.evaluate("""() => {
      const m=window._bossPerf,s=HOG_APP_DEBUG.getState(),
        c=document.getElementById('battle-canvas');
      HOG_PAINTER.drawBattle=m.original;
      const n=m.metric.calls.length;
      const fps=n>1?(n-1)*1000/(m.metric.calls[n-1]-m.metric.calls[0]):0;
      return {turn:s.battle?.turn,valid:HOG_ENGINE.strictSave(s),
        sceneCanvasStable:c===m.canvas&&m.metric.stable,
        frames:n,fps:+fps.toFixed(2),
        header:document.querySelector('.combat-scene-title .tag')?.textContent,
        owners:s.battle?.allies.map(u=>u.heroId)};
    }""")
    metrics.append({'viewport':'960x540 joint Boss HG26','fixture':bossFixture,'result':bossResult})
    check('HG26 multi-hero Boss bot advances actual turns without canvas replacement',
          bossResult['turn']>=bossFixture['turn']+2 and bossResult['valid'] and
          bossResult['sceneCanvasStable'] and bossResult['fps']>=24 and
          bossResult['header'] is not None and
          bossResult['header'].startswith('Lượt '+str(bossResult['turn'])+' ·'),
          bossResult)
    bossPage.screenshot(path=str(SCREENS/'combat-hg26-joint-boss-960x540.png'),animations='disabled')
    bossPage.close()
    check('No uncaught JavaScript errors in either real browser battle',not errors,errors)
    browser.close()
receipt={'status':'PASS' if all(x['pass'] for x in checks) else 'FAIL',
         'checks':checks,'metrics':metrics,'errors':errors,
         'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
         'fixture_note':'Real NPC march and engine auto; enemy HP/ATK fixture prolongs the fight, no rewards or wins seeded'}
(OUT/'combat-smoothness.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('HG34 COMBAT SMOOTHNESS CHROMIUM '+str(sum(c['pass'] for c in checks))+'/'+str(len(checks))+' '+receipt['status'],flush=True)
raise SystemExit(0 if receipt['status']=='PASS' else 1)
