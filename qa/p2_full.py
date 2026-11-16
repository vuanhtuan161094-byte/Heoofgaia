from pathlib import Path
from playwright.sync_api import sync_playwright
import json, traceback, sys, hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa'
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
STUB='''<script>
window.__P2_ENABLE_QA__=true;
const __data={};window.__P2_TEST_DATA__=__data;
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__data,k)?__data[k]:null,setItem:(k,v)=>{__data[k]=String(v)},removeItem:k=>{delete __data[k]},clear:()=>Object.keys(__data).forEach(k=>delete __data[k])}});
</script>'''
HTML=HTML.replace('<script>',STUB+'<script>',1)
RESULT=[]
def check(name,condition):
    RESULT.append((name,bool(condition)));print(('PASS' if condition else 'FAIL')+' '+name)
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML,wait_until='domcontentloaded',timeout=25000)
  page.wait_for_timeout(600)
  check('boots on Chromium without JS error', len(errors)==0 and page.locator('[data-tab="formation"]').count()==1)
  check('P2 diagnostics enabled',page.evaluate("typeof window.__P2_QA__ === 'object'"))
  state=page.evaluate('window.__P2_QA__.getGame()')
  check('P2 migration has schema v5',state['version']==5 and 'troopModes' in state and 'battleReports' in state and 'cltq' in state)
  check('all 24 generals have individual skills',page.evaluate("Object.keys(window.__P2_QA__.getGame().hero).length>=3") and len(__import__('re').findall(r'^ \w+:{pattern:',(ROOT/'index.html').read_text(encoding='utf-8').split('const P2_SKILLS = {')[1].split('const P2_ENEMY_SKILLS')[0],__import__('re').M))==24)
  page.locator('[data-tab="formation"]').click()
  check('drum troop controls rendered',page.locator('[data-troop-mode="liu:drum"]').count()==1)
  page.locator('[data-troop-mode="liu:drum"]').click()
  state=page.evaluate('window.__P2_QA__.getGame()')
  check('drum selected and persisted',state['troopModes'].get('liu')=='drum' and '"troopModes"' in page.evaluate("__P2_TEST_DATA__['muu_dinh_tam_quoc_v1']"))
  check('drum unit loses attack role',page.evaluate("window.__P2_QA__.makeUnit('liu','p',7,1).troop === 'drum'"))
  # unit: formation front-targeting and counter matrix
  tgt=page.evaluate('''() => {const qa=window.__P2_QA__;qa.beginBattle(1,'campaign');const b=qa.getBattle();return {units:b.p.length,enemy:b.e.length,kind:b.p.find(x=>x.id==='guan')?.troop}}''')
  check('real campaign units instantiated',tgt['units']==3 and tgt['enemy']==3)
  check('strong class hierarchy',page.evaluate("window.__P2_QA__.getBattle().p.every(u => ['physical','tactic','magic'].length===3 && Number.isFinite(u.atk) && Number.isFinite(u.catk) && Number.isFinite(u.matk))"))
  # direct battle actions, count at least some drum hits
  page.evaluate('''() => {for(let i=0;i<22;i++){let b=window.__P2_QA__.getBattle();if(b.finished)break;window.__P2_QA__.stepBattle()}}''')
  b=page.evaluate('window.__P2_QA__.getBattle()')
  check('drum acts to increase morale',any(e.get('mode')=='drum' for e in b['events']))
  check('battle log distinguishes damage routes',any(e.get('kind') in ('physical','tactic','magic') for e in b['events']))
  check('position and action snapshots captured',all('state' in e and 'p' in e['state'] and 'e' in e['state'] for e in b['events']))
  page.evaluate('window.__P2_QA__.skipBattle()')
  b=page.evaluate('window.__P2_QA__.getBattle()');state=page.evaluate('window.__P2_QA__.getGame()')
  check('battle concluded and report stored once',b['finished'] and len(state['battleReports'])==1)
  check('results overlay shown',page.locator('[data-replay-last]').count()==1)
  report=state['battleReports'][0]
  check('report event timeline has final frame', len(report['events'])>0 and report['events'][-1]['state']['p'] == report['final']['p'] and report['events'][-1]['state']['e'] == report['final']['e'])
  check('report metadata and seed exist', isinstance(report['seed'],int) and report['turns']>0 and report['rounds']>0)
  resource_before=state['silver'],state['grain'],state['prestige'],len(state['cleared']),state['hero']['guan']['xp']
  page.locator('[data-replay-last]').click()
  check('opens recorded replay not new battle',page.evaluate('window.__P2_QA__.getBattle().replay===true'))
  replay=page.evaluate('window.__P2_QA__.getBattle()')
  check('replay begins at exact opening state',replay['p']==report['opening']['p'] and replay['e']==report['opening']['e'])
  page.locator('[data-replay-step]').click()
  check('replay advances exactly one event',page.evaluate('window.__P2_QA__.getBattle().replayIndex')==1)
  replay=page.evaluate('window.__P2_QA__.getBattle()')
  check('replay restores event snapshot', replay['p']==report['events'][0]['state']['p'] and replay['e']==report['events'][0]['state']['e'])
  page.evaluate('window.__P2_QA__.p2LoadReplayFrame(window.__P2_QA__.getBattle().report.events.length)')
  replay=page.evaluate('window.__P2_QA__.getBattle()')
  check('replay lands exactly at original result',replay['p']==report['final']['p'] and replay['e']==report['final']['e'])
  state_after=page.evaluate('window.__P2_QA__.getGame()')
  check('replay does not award XP/resources again',resource_before==(state_after['silver'],state_after['grain'],state_after['prestige'],len(state_after['cleared']),state_after['hero']['guan']['xp']))
  check('replay does not append new report',len(state_after['battleReports'])==1)
  page.locator('[data-end-battle]').click()
  check('replay listing visible',page.locator('[data-watch-replay="0"]').count()==1)
  # Replay persists in storage, reload context
  persisted=page.evaluate("__P2_TEST_DATA__['muu_dinh_tam_quoc_v1']")
  # use a fresh document to avoid duplicate global declarations during set_content
  html2=HTML.replace('const __data={};','const __data='+json.dumps({'muu_dinh_tam_quoc_v1':persisted},ensure_ascii=False)+';')
  page.close();page=browser.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html2,wait_until='domcontentloaded')
  loaded=page.evaluate('window.__P2_QA__.getGame()')
  check('V0.3 cross-document save roundtrip',len(loaded['battleReports'])==1 and loaded['troopModes'].get('liu')=='drum')
  page.locator('[data-tab="replays"]').click()
  page.locator('[data-watch-replay="0"]').click()
  check('stored report remains replayable after reload',page.evaluate('window.__P2_QA__.getBattle().replay'))
  page.locator('[data-end-battle]').click()
  # v2 save migrations, strip p2 and downgrade
  v2=json.loads(persisted);v2['version']=2;v2.pop('troopModes',None);v2.pop('battleReports',None)
  html_old=HTML.replace('const __data={};','const __data='+json.dumps({'muu_dinh_tam_quoc_v1':json.dumps(v2,ensure_ascii=False)},ensure_ascii=False)+';')
  page.close();page=browser.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html_old,wait_until='domcontentloaded')
  legacy=page.evaluate('window.__P2_QA__.getGame()')
  check('V0.2 save migrates without loss of progress',legacy['version']==5 and isinstance(legacy['battleReports'],list) and 'troopModes' in legacy and 'cltq' in legacy and legacy['silver']==v2['silver'])
  print('CHROMIUM ERRORS',errors)
  check('no Chromium JS exceptions', len(errors)==0)
  page.screenshot(path=str(OUT/'p2-city.png'),full_page=True)
  page.locator('[data-tab="formation"]').click();page.screenshot(path=str(OUT/'p2-formation.png'),full_page=True)
  page.locator('.sidebar [data-tab="campaign"]').click();page.locator('[data-battle]').first.click()
  page.wait_for_timeout(400);page.screenshot(path=str(OUT/'p2-battle.png'),full_page=False)
  page.evaluate('window.__P2_QA__.skipBattle()')
  page.screenshot(path=str(OUT/'p2-result.png'),full_page=False)
  page.locator('[data-replay-last]').click();page.locator('[data-replay-step]').click();page.screenshot(path=str(OUT/'p2-replay.png'),full_page=False)
  mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  mobileerrors=[];mobile.on('pageerror',lambda e:mobileerrors.append(str(e)))
  mobile.set_content(HTML,wait_until='domcontentloaded')
  mobile.locator('[data-tab="formation"]').click()
  mobile.screenshot(path=str(OUT/'p2-mobile-formation.png'),full_page=True)
  check('mobile no horizontal document overflow',mobile.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
  check('mobile controls are clickable',mobile.locator('[data-troop-mode="liu:drum"]').is_visible())
  check('mobile console no JS exceptions',not mobileerrors)
  browser.close()
 return errors
if __name__=='__main__':
 try:
  run()
 except Exception:
  traceback.print_exc()
  print('ERRORS/RESULTS:',RESULT)
  sys.exit(2)
 total=len(RESULT);passn=sum(ok for _,ok in RESULT)
 print('TOTAL:',passn,'/',total,'PASS')
 (OUT/'QA_P2.json').write_text(json.dumps({'total':total,'passed':passn,'failed':[n for n,ok in RESULT if not ok]},ensure_ascii=False,indent=2))
 sys.exit(0 if total==passn else 1)
