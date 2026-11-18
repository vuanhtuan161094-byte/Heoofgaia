from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys,traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa'
HTML=((ROOT/'index.html').read_text(encoding='utf-8'))
STUB='''<script>window.__P2_ENABLE_QA__=true;const __data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__data[k]??null,setItem:(k,v)=>__data[k]=String(v),removeItem:k=>delete __data[k]}});</script>'''
HTML=HTML.replace('<script>',STUB+'<script>',1)
checks=[]
def check(name,condition):
 checks.append((name,bool(condition)));print(('PASS' if condition else 'FAIL')+' '+name)
def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1380,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(getattr(e, 'stack', str(e))))
  page.set_content(HTML,wait_until='domcontentloaded');page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
  check('front-row target beats nearer rear',page.evaluate('''() => {const qa=__P2_QA__,b=qa.debugBattle();b.e=b.e.slice(0,3);[b.e[0].slot,b.e[1].slot,b.e[2].slot]=[0,2,6];let a=b.p.find(u=>u.id==='guan');return qa.p2Target(a,'front').slot===2}'''))
  check('ranged target prioritizes backline',page.evaluate('''() => {const qa=__P2_QA__,b=qa.debugBattle(),a={...b.p[0],type:'archer',troop:'archer',slot:4};return qa.p2Target(a,'back').slot===0}'''))
  values=page.evaluate('''() => {
    const qa=__P2_QA__,b=qa.debugBattle();
    const a={...b.p[0],atk:160,catk:160,matk:160,crit:0,troop:'cavalry'};
    function score(type){b.seed=555;const t={...b.e[0],def:26,tdef:26,mdef:26,hp:10000,maxHp:10000,troop:type,crit:0};return qa.p2Hit(a,t,'tactic',1).amount}
    return {vsInfantry:score('infantry'),vsArcher:score('archer'),vsSpear:score('spear')};
  }''')
  check('current cavalry > infantry, neutral archer, < spear',values['vsInfantry']>values['vsArcher']>values['vsSpear'])
  route=page.evaluate('''() => {
   const qa=__P2_QA__,b=qa.debugBattle(),a={...b.p[0],atk:150,catk:150,matk:150,crit:0,troop:'strategist'};
   function score(kind){b.seed=788;const t={...b.e[0],def:20,tdef:85,mdef:160,hp:10000,maxHp:10000,troop:'support'};return qa.p2Hit(a,t,kind,1).amount}
   return {physical:score('physical'),tactic:score('tactic'),magic:score('magic')};
  }''')
  check('three defense categories independently change output',route['physical']>route['tactic']>route['magic'])
  page.evaluate('window.__P2_QA__.closeBattle()')
  # spin fresh scenario with Zhou Yu skill burn and same recorded result replay
  page.evaluate('''() => {let g=__P2_QA__.getGame();g.roster.push('zhou');g.hero.zhou={level:1,xp:0,troops:320};g.slots=[null,null,null,null,null,null,null,null,'zhou'];__P2_QA__.setGame(g);__P2_QA__.beginBattle(1,'campaign');let b=__P2_QA__.debugBattle();b.p[0].morale=100;}''')
  page.evaluate('window.__P2_QA__.stepBattle()')
  first=page.evaluate('window.__P2_QA__.getBattle()')
  check('Zhou Yu casts personalized magic row skill', bool(first['events']) and first['events'][0]['skill']=='Hỏa Thiêu Xích Bích' and first['events'][0]['kind']=='magic')
  check('burn status assigned to target',any(any(s['kind']=='burn' for s in e.get('effects',[])) for e in first['e']))
  page.evaluate('''() => {for(let i=0;i<30;i++){const b=__P2_QA__.getBattle();if(b.finished||b.events.some(e=>e.mode==='dot'))break;__P2_QA__.stepBattle()}}''')
  b=page.evaluate('window.__P2_QA__.getBattle()')
  dots=[i for i,e in enumerate(b['events']) if e['mode']=='dot']
  check('damage over time produces first-class timeline event',len(dots)>0)
  page.evaluate('window.__P2_QA__.skipBattle()')
  page.locator('[data-replay-last]').click()
  check('replay seek control visibly rendered',page.locator('#replay-slider').count()==1)
  if dots:
   page.evaluate('''n=>{const el=document.querySelector('#replay-slider');el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));}''',dots[0]+1)
   rb=page.evaluate('window.__P2_QA__.getBattle()')
   check('DOT event seek reconstructs saved state',rb['replayIndex']==dots[0]+1 and rb['p']==rb['report']['events'][dots[0]]['state']['p'] and rb['e']==rb['report']['events'][dots[0]]['state']['e'])
  page.locator('[data-replay-reset]').click();page.locator('[data-replay-toggle]').click();page.wait_for_timeout(1300)
  check('replay play mode advances automatically',page.evaluate('window.__P2_QA__.getBattle().replayIndex>=1'))
  check('replay status stays read-only and XP single-accounted',len(page.evaluate('window.__P2_QA__.getGame().battleReports'))==1)
  check('advanced tests: no JavaScript errors',not errors)
  print('browser errors',errors)
  browser.close()
if __name__=='__main__':
 try:main()
 except Exception:traceback.print_exc();sys.exit(2)
 out={'total':len(checks),'passed':sum(x[1] for x in checks),'failed':[n for n,v in checks if not v]}
 (OUT/'QA_P2_ADVANCED.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
 print(out)
 sys.exit(0 if out['total']==out['passed'] else 1)
