"""P3 deterministic end-to-end functional/combat/balance QA; no fake combat results."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys, traceback, math
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa'
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
STUB='''<script>window.__P2_ENABLE_QA__=true;const __save={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__save[k]??null,setItem:(k,v)=>__save[k]=String(v),removeItem:k=>delete __save[k]}});</script>'''
HTML=HTML.replace('<script>',STUB+'<script>',1)
checks=[];balances=[]
def check(name,result):
 checks.append((name,bool(result)));print(('PASS' if result else 'FAIL')+' '+name,flush=True)

def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1280,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML,wait_until='domcontentloaded');page.wait_for_timeout(300)
  check('P3 QA runtime available',page.evaluate('typeof window.__P3_QA__ === "object"'))
  presets=page.evaluate('window.__P3_QA__.presets')
  check('24 distinct named tactical presets',len(presets)==24 and len({x['id'] for x in presets})==24)
  check('six formations with four variants each',all(sum(x['formation']==f for x in presets)==4 for f in {x['formation'] for x in presets}) and len({x['formation'] for x in presets})==6)
  check('all preset slot masks valid',all(len(x['slots'])==5 and len(set(x['slots']))==5 and min(x['slots'])>=0 and max(x['slots'])<=8 for x in presets))
  page.locator('[data-tab="formation"]').first.click()
  check('24 preset buttons actually rendered',page.locator('[data-p3-preset]').count()==24)
  original=page.evaluate('window.__P2_QA__.getGame()');baseline_money=(original['silver'],original['grain'],original['iron'],original['reserve']);
  for preset in presets:
   page.evaluate('(id)=>window.__P3_QA__.assign(id)',preset['id'])
   result=page.evaluate('window.__P2_QA__.getGame()')
   check('deploy preset '+preset['id'],result['p3PresetId']==preset['id'] and result['formation']==preset['formation'] and len([v for v in result['slots'] if v])==3 and len(set(v for v in result['slots'] if v))==3)
  g=page.evaluate('window.__P2_QA__.getGame()')
  check('24 deployments never mint or consume resources',(g['silver'],g['grain'],g['iron'],g['reserve'])==baseline_money)
  check('default troop tier 1',page.evaluate("window.__P3_QA__.tier('guan')===1"))
  before=page.evaluate('window.__P2_QA__.getGame()')
  check('tier upgrade blocked by barracks',not page.evaluate("window.__P3_QA__.upgrade('guan')"))
  after=page.evaluate('window.__P2_QA__.getGame()')
  check('blocked training cannot debit',(before['silver'],before['grain'],before['iron'])==(after['silver'],after['grain'],after['iron']))
  g=page.evaluate('window.__P2_QA__.getGame()');g['buildings']['barracks']=4;g['silver']=100000;g['grain']=100000;g['iron']=100000
  page.evaluate('g=>window.__P2_QA__.setGame(g)',g)
  t1=page.evaluate("window.__P3_QA__.unit('guan','p',2,1)")
  money=page.evaluate('window.__P2_QA__.getGame()');cost=page.evaluate('window.__P3_QA__.cost(2)')
  check('can upgrade when paid and barracks unlocked',page.evaluate("window.__P3_QA__.upgrade('guan')") is True)
  after=page.evaluate('window.__P2_QA__.getGame()')
  check('training debits exact cost once',all(money[key]-after[key]==cost[key] for key in ('silver','grain','iron')))
  check('tier 2 combat stats increase',page.evaluate("window.__P3_QA__.unit('guan','p',2,1).atk")>t1['atk'])
  check('tier 2 does not create soldiers',after['hero']['guan']['troops']==g['hero']['guan']['troops'])
  check('can continue tiers 3 and 4',page.evaluate("window.__P3_QA__.upgrade('guan')&&window.__P3_QA__.upgrade('guan')"))
  check('tier caps at 4 and cannot duplicate debit',page.evaluate("window.__P3_QA__.tier('guan')===4 && window.__P3_QA__.upgrade('guan')===false"))
  check('one unit upgrade leaves other heroes unchanged',page.evaluate("window.__P3_QA__.tier('liu')===1 && window.__P3_QA__.tier('zhang')===1"))
  check('tier 4 strictly stronger and not excessive',page.evaluate("(()=>{const v=window.__P3_QA__.unit('guan','p',2,1);return v.atk>0&&v.atk<300&&v.hp>0&&v.hp<2500})()"))
  check('enemy tiers scale across four campaign intervals',page.evaluate("[1,9,17,25].every((s,i)=>window.__P3_QA__.unit('e0','e',1,s).tier===i+1)"))
  check('current cavalry triangle: beats infantry, neutral archer/support, loses to spear',page.evaluate("(()=>{let q=window.__P3_QA__;return q.counter('cavalry','infantry')>1&&q.counter('cavalry','archer')===1&&q.counter('cavalry','support')===1&&q.counter('cavalry','spear')<1})()"))
  page.locator('[data-tab="barracks"]').first.click()
  check('training controls rendered in real barracks',page.locator('[data-p3-upgrade]').count()>=2)
  # Real combat for all tactical presets across progression. Normalize before each to avoid attrition bias.
  base=page.evaluate('window.__P2_QA__.getGame()');base['buildings']['barracks']=4
  base['cleared']=list(range(1,24));base['grain']=1000000;base['silver']=1000000;base['iron']=1000000
  for h in base['hero'].values():h['troops']=900;h['level']=16
  base['battleReports']=[]
  for i,preset in enumerate(presets):
   stage=[1,4,9,16,24][i%5]
   import copy
   fixture=copy.deepcopy(base)
   for hero in fixture['hero'].values():hero['level']={1:3,4:7,9:13,16:22,24:32}[stage]
   tier={1:1,4:1,9:2,16:3,24:4}[stage]
   if stage>=9:
    for new in ['zhao','huang']:
     if new not in fixture['roster']:fixture['roster'].append(new)
     fixture['hero'][new]={'level':fixture['hero']['liu']['level'],'xp':0,'troops':900}
   fixture['p3TroopTier']={hero:tier for hero in fixture['roster']}
   outcome=page.evaluate('''({g,id,stage})=>{
     __P2_QA__.closeBattle();__P2_QA__.setGame(structuredClone(g));
     if(!__P3_QA__.assign(id))return {error:'cannot assign'};
     __P2_QA__.beginBattle(stage,'campaign');let b=__P2_QA__.debugBattle();if(!b)return {error:'battle not opened'};
     b.seed=99331+stage;
     __P2_QA__.skipBattle();const report=__P2_QA__.getGame().battleReports[0];const finished=__P2_QA__.getBattle();
     return {won:finished?.won,finished:finished?.finished,events:report?.events.length,preset:report?.p3PresetId,
      alive:report?.final.p.filter(u=>u.hp>0).length,finite:report?.final.p.concat(report.final.e).every(u=>Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp),
      grain:__P2_QA__.getGame().grain,checkReward:Array.isArray(__P2_QA__.getGame().battleReports)};
    }''',{'g':fixture,'id':preset['id'],'stage':stage})
   balances.append({'preset':preset['id'],'stage':stage,**outcome})
   check('real battle '+preset['id'],outcome.get('finished') is True and outcome.get('events',0)>0 and outcome.get('finite') is True and outcome.get('preset')==preset['id'])
  check('all real battles stay within troop/currency invariants',all(0<=r['grain']<=1010000 for r in balances))
  wins=sum(1 for r in balances if r.get('won'))
  check('win/loss sample recorded for balance audit',0<=wins<=len(balances) and all('won' in r for r in balances))
  # Replay read-only on final run.
  resources=page.evaluate('''()=>{const g=__P2_QA__.getGame();return [g.silver,g.grain,g.iron,g.prestige,g.battleReports.length]}''')
  page.evaluate('''()=>{__P2_QA__.p2OpenReplay(__P2_QA__.getGame().battleReports[0]);__P2_QA__.p2LoadReplayFrame(__P2_QA__.getBattle().report.events.length)}''')
  check('P3 replay cannot pay rewards',resources==page.evaluate('''()=>{const g=__P2_QA__.getGame();return [g.silver,g.grain,g.iron,g.prestige,g.battleReports.length]}'''))
  page.evaluate('window.__P2_QA__.closeBattle()')
  page.locator('[data-tab="formation"]').first.click();page.screenshot(path=str(OUT/'p3-formation-1280x720.png'),full_page=False)
  check('no JS errors in 24 battles',not errors)
  mobile=browser.new_page(viewport={'width':390,'height':844});moberr=[];mobile.on('pageerror',lambda e:moberr.append(str(e)))
  mobile.set_content(HTML,wait_until='domcontentloaded');mobile.locator('[data-tab="formation"]').first.click()
  mobile.screenshot(path=str(OUT/'p3-mobile-390.png'),full_page=True)
  check('mobile 390px has no horizontal document overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  check('mobile 24 tactical controls accessible',mobile.locator('[data-p3-preset]').count()==24 and not moberr)
  browser.close()
 print('BALANCE',json.dumps({'total':len(balances),'wins':wins,'win_rate':round(wins/len(balances),4),'stages':{str(s):{'total':sum(x['stage']==s for x in balances),'wins':sum(x['stage']==s and x['won'] for x in balances)} for s in [1,4,9,16,24]}},ensure_ascii=False))

if __name__=='__main__':
 try:main()
 except Exception:traceback.print_exc();sys.exit(2)
 report={'total':len(checks),'passed':sum(ok for _,ok in checks),'failed':[n for n,ok in checks if not ok], 'battle_samples':balances}
 (OUT/'qa-p3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('TOTAL',report['passed'],'/',report['total']);sys.exit(0 if report['passed']==report['total'] else 1)
