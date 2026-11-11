"""HG40.1 file:// Chromium acceptance: real battle skill, owner-bound shield,
responsive HUD, deterministic Save v07, and actual animation-frame sampling.
The high-HP enemy fixture prevents a win/reward; it never grants resources.
"""
import json, hashlib, os, sys, base64
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg40'; ART=ROOT/'docs/evidence/hg40'
QA.mkdir(parents=True,exist_ok=True); ART.mkdir(parents=True,exist_ok=True)
checks=[]; errors=[]; screenshots=[]; metrics=[]

def check(label,condition,evidence=None):
    ok=bool(condition)
    checks.append({'name':label,'pass':ok,'evidence':evidence})
    print(('PASS ' if ok else 'FAIL ')+label+' '+str(evidence if evidence is not None else ''),flush=True)

def capture(page,name):
    target=ART/name
    page.screenshot(path=str(target),animations='disabled')
    screenshots.append({'path':str(target.relative_to(ROOT)),
                        'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})

with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(HTML.as_uri(),wait_until='load')
    page.locator('[data-action="start"]').click()
    prepared=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
      const max=Math.min(12,Math.floor(E.heroLimit(s.heroes.find(h=>h.id===s.activeHero).level)/E.unitValue(E.getUnit(s,'human_8'))));
      if(max<1)throw Error('HG40 hero command cap does not fit a single Priest');
      s.army.human_8=max;E.setFormation(s,[{unitId:'human_8',count:max}]);
      const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
      if(!npc)throw Error('HG40 no reachable NPC');
      E.startMarch(s,npc.key);
      E.tick(s,s.lastTick+(s.march.remaining/s.speed+1)*1000);
      if(!s.battle?.hg40)throw Error('HG40 real battle missing');
      for(const e of s.battle.enemies){e.hp=1000000;e.pool=e.hp*e.count;e.atk=0;e.def=0;}
      s.battleAuto=false;s.battle.autoUntil=Date.now()+10000000;
      HOG_APP_DEBUG.render();
      return {valid:E.strictSave(s),mode:s.battle.hg40.mode,stacks:s.battle.allies.length,
        skill:E.hg40SkillText(s.battle,s.battle.allies[0]),
        bVersion:s.battle.hg40.v,save:s.version};
    }""")
    check('real NPC expedition enters HG40 battle without reward',prepared['valid'] and
          prepared['mode']=='hg40' and prepared['stacks']==1 and prepared['bVersion']==1 and
          prepared['save']==7,prepared)
    check('real selected T8 unit displays proper skill', 'Thánh thuẫn' in prepared['skill'],prepared['skill'])

    # HG44-A: HG41 starts each side at its own board edge (x=0–1 vs
    # x=10–11). A melee Priest MUST walk into attack range before a real hit
    # can proc the HG40 shield. The old single-turn oracle expected a hit
    # from across the board, then falsely marked the real skill as broken.
    # Advance through *canonical* battleAct turns until the FIRST verified
    # Priest hit; do not teleport the unit, force the skill or inject a shield.
    turn=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),b=s.battle;
      const actor=b.allies[0],trace=[];let r=null,realHit=false;
      for(let step=0;step<18;step++){
        r=E.battleAct(s,'attack',{stableTargets:true});
        const hit=(b.lastEvents||[]).some(e=>e.actorId===actor.id&&e.damage>0);
        trace.push({turn:b.turn-1,position:{x:actor.x,y:actor.y},
          distance:Math.min(...b.enemies.filter(x=>x.pool>0).map(x=>E.battleHex.distance(actor,x))),
          hit,shield:b.hg40.shields[actor.id]?.amount||0});
        if(hit){realHit=true;break}
        if(r.type!=='continue')break;
      }
      HOG_APP_DEBUG.render();
      return {type:r?.type,turn:b.turn,valid:E.strictSave(s),realHit,
        attempted:trace.length,trace,
        shield:b.hg40.shields[actor.id]||null,
        skill:E.hg40SkillText(b,actor),
        hud:document.querySelector('.hg40-player')?.textContent,
        last:b.hg40.lastSkills.slice(-1)[0]||null};
    }""")
    check('HG44-A canonical march-to-hit triggers finite and capped Priest shield',
          turn['type']=='continue' and turn['realHit'] and turn['attempted']>1 and
          turn['valid'] and bool(turn['shield']) and turn['shield']['amount']>0 and
          turn['shield']['until']==turn['turn']+1 and
          'Thánh thuẫn' in (turn['hud'] or '') and
          'Thánh thuẫn' in (turn['last'] or {}).get('skill',''),turn)


    # HG40.3: actual file:// NPC battle, genuine hit and shield activation.
    # Seek its recorded impact frame in the very same Canvas used by the game;
    # a PNG taken via toDataURL is the real renderer output, not a mock image.
    scene=page.evaluate("""() => {
      const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),b=s.battle;
      const c=document.getElementById('battle-canvas');
      if(!b||!c)return {error:'battle/canvas absent'};
      const timeline=P.battleTimelineFor(b,performance.now());
      const impact=timeline.items.find(x=>x.event.actorId===b.allies[0].id&&x.event.damage>0);
      if(!impact)return {error:'no real hit receipt'};
      const at=impact.impactAt+85,cam=P.battleProjection(c,E);
      const layout=P.battleUnitLayout(b,cam,c.width,c.height,at);
      const fx=P.battleFxPlan(b,cam,at,layout);
      const cue=P.drawHG403ProcCues(c.getContext('2d'),b,at,layout);
      const foot=layout.every(x=>{
        const p=cam.center(x.u.x,x.u.y);
        return Math.abs(x.x-p.x)<.00001&&Math.abs(x.y-p.y)<.00001;
      });
      P.drawBattle(c,E,s,at,{showGrid:true,showHP:true});
      return {actor:b.allies[0].unitId,skill:E.hg40SkillText(b,b.allies[0]),
        vfx:P.hg403SkillProfile(b.allies[0].unitId)?.motif,
        profiles:Object.keys(P.HG403_SKILL_SIGILS).length,
        actualHits:fx.length,confirmedProc:cue,allBootsOnHex:foot,
        valid:E.strictSave(s),canvas:{w:c.width,h:c.height},
        png:c.toDataURL('image/png')};
    }""")
    png=scene.pop('png',None)
    check('HG40.3 real NPC hit paints distinct Priest sigil, confirmed shield proc and canonical hex feet',
          scene.get('actor')=='human_8' and scene.get('profiles')==40 and
          scene.get('actualHits',0)>=1 and scene.get('confirmedProc',0)>=1 and
          scene.get('allBootsOnHex') and scene.get('valid') and
          bool(png and png.startswith('data:image/png;base64,')),scene)
    if png and png.startswith('data:image/png;base64,'):
        artifact=ART/'hg403-npc-priest-shield-real-canvas.png'
        artifact.write_bytes(base64.b64decode(png.split(',',1)[1]))
        screenshots.append({'path':str(artifact.relative_to(ROOT)),
                            'sha256':hashlib.sha256(artifact.read_bytes()).hexdigest()})

    for width,height in ((1280,720),(960,540),(844,390)):
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate("window.dispatchEvent(new Event('resize'))")
        page.wait_for_timeout(120)
        view=page.evaluate("""() => {
          const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
          const c=document.getElementById('battle-canvas'),rect=c.getBoundingClientRect();
          const projection=P.battleProjection(c,E),layout=P.battleUnitLayout(s.battle,projection,c.width,c.height);
          const dock=document.querySelector('.battle-command-dock'),hd=document.querySelector('.hg40-readout');
          const dr=dock?.getBoundingClientRect(),hr=hd?.getBoundingClientRect(),
            content=document.querySelector('.battle-command-content')?.getBoundingClientRect(),
            orders=[...document.querySelectorAll('.battle-action-grid button')];
          // HG69 introduced the eighth real battle-always-auto setting button.
          // All eight commands must remain physically visible in the dock.
          const ordersAboveFold=!!content&&orders.length===8&&orders.every(btn=>{
            const rect=btn.getBoundingClientRect();return rect.top>=content.top-1&&rect.bottom<=content.bottom+1;
          });
          return {valid:E.strictSave(s),units:layout.length,grid:P.battleGridCells(projection).length,
            canvasStable:c===window._hg40Canvas||!window._hg40Canvas,
            canvasSize:{width:c.width,height:c.height},
            displayed:rect.width>100&&rect.height>100,
            hud:!!hr&&hr.width>60&&hr.height>0,
            dock:!!dr&&dr.width>100&&dr.height>10,ordersAboveFold,orderCount:orders.length,
            orderBounds:orders.map(btn=>{const r=btn.getBoundingClientRect();
              return {action:btn.dataset.action,top:r.top,bottom:r.bottom}}),
            horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
            spell:hd?.textContent?.includes('Thánh thuẫn'),
            clicked:layout.filter(x=>x.u.pool>0).every(x=>P.battleHit(c,x.x,x.y,E,s)?.id===x.id)};
        }""")
        metrics.append({'viewport':f'{width}x{height}','snapshot':view})
        check(f'HG40 {width}x{height} live HUD, hex hitbox and no horizontal overflow',
              view['valid'] and view['grid']==108 and view['displayed'] and view['hud'] and
              view['dock'] and view['ordersAboveFold'] and not view['horizontalOverflow'] and view['spell'] and view['clicked'],view)
        capture(page,f'hg40-1-real-skill-{width}x{height}.png')

    page.set_viewport_size({'width':1280,'height':720})
    page.locator('[data-action="save-combat"]').click()
    before=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {turn:s.battle.turn,
        shield:s.battle.hg40.shields,cd:s.battle.hg40.cd,
        statuses:s.battle.hg40.statuses,valid:HOG_ENGINE.strictSave(s)};
    }""")
    page.reload(wait_until='load')
    after=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {turn:s.battle.turn,
        shield:s.battle.hg40.shields,cd:s.battle.hg40.cd,
        statuses:s.battle.hg40.statuses,valid:HOG_ENGINE.strictSave(s)};
    }""")
    check('HG40 cold reload preserves tactical shield, cooldown and turn in v07',
          before==after and after['valid'],{'before':before,'after':after})
    # The browser's native RAF runs during battle; measure real canvas draws
    # and actual elapsed wall time. This is not a fabricated FPS from a loop.
    page.evaluate("""() => {
      const P=HOG_PAINTER,original=P.drawBattle,frames=[];
      P.drawBattle=function(canvas,...args){
        const out=original.call(this,canvas,...args);
        if(canvas.id==='battle-canvas')frames.push(performance.now());
        return out;
      };
      window._hg40FrameAudit={frames,original};
      const s=HOG_APP_DEBUG.getState();s.battleAuto=true;s.battle.autoUntil=Date.now()+80;
    }""")
    page.wait_for_timeout(1500)
    perf=page.evaluate("""() => {
      const a=window._hg40FrameAudit;HOG_PAINTER.drawBattle=a.original;
      const n=a.frames.length,elapsed=n>1?a.frames[n-1]-a.frames[0]:0;
      return {frames:n,fps:n>1?+(1000*(n-1)/elapsed).toFixed(2):0,
        canvas:!!document.getElementById('battle-canvas'),
        valid:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())};
    }""")
    metrics.append({'viewport':'1280x720','rafPerformance':perf})
    check('HG40 actual Chromium RAF is running and Save stays valid',
          perf['frames']>=20 and perf['fps']>=20 and perf['valid'] and perf['canvas'],perf)
    check('no uncaught browser JavaScript error',not errors,errors)
    browser.close()

report={'status':'PASS' if all(x['pass'] for x in checks) else 'FAIL',
        'passed':sum(x['pass'] for x in checks),'total':len(checks),'checks':checks,
        'screenshots':screenshots,'metrics':metrics,'errors':errors,
        'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
        'fixture':'real file:// NPC march; high-HP/zero-ATK enemy prevents reward, no wins seeded'}
(QA/'chromium-real-skill.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('HG40.1 REAL SKILL CHROMIUM '+str(report['passed'])+'/'+str(report['total'])+' '+report['status'],flush=True)
raise SystemExit(0 if report['status']=='PASS' else 1)
