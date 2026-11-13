"""HG86: production ImageGen WEBP renders are actually used for hero/gear UI.
Each race receives genuine starter-state QA items via explicitly labeled
fixture setup (not a game reward). Tests use the exact built ONE offline HTML.
"""
from pathlib import Path
import json,hashlib,atexit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/evidence/hg86';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'docs/qa/hg86/rendered-art-chrome.json';REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];shots=[];errors=[]
def check(name,ok,value=None):
    passed=bool(ok);checks.append({'name':name,'pass':passed})
    print(('HG86 PASS ' if passed else 'HG86 FAIL ')+name+' '+str(value or '')[:320],flush=True)
    if not passed:raise AssertionError(name+' '+str(value)[:800])
def shot(page,name):
    p=OUT/(name+'.png');page.screenshot(path=str(p),animations='disabled')
    shots.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
@atexit.register
def report():
    REPORT.write_text(json.dumps({'total':len(checks),'passed':sum(x['pass'] for x in checks),
      'success':all(x['pass'] for x in checks),'screenshots':shots,'checks':checks,
      'errors':errors,'offline_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None},
      ensure_ascii=False,indent=2),encoding='utf8')
with sync_playwright() as rt:
    browser=rt.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for viewport,mode,mobile in [({'width':1280,'height':720},'pc',False),
                                 ({'width':844,'height':390},'mobile-landscape',True)]:
      for race in ['human','elf','orc','undead']:
        context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
        page=context.new_page();page.set_default_timeout(22000)
        page.on('pageerror',lambda err,mode=mode,race=race:errors.append(mode+'-'+race+': '+str(err)))
        page.goto(HTML.as_uri(),wait_until='load',timeout=180000)
        images=page.evaluate("""async()=>{
          const art=[...document.querySelectorAll('[data-hg86-kind]')];
          await Promise.all(art.map(x=>x.decode()));
          return {count:art.length,ok:art.every(x=>x.complete&&x.naturalWidth>=256&&
            x.naturalHeight>=256&&x.src.startsWith('data:image/webp;base64,')),
            heroes:art.filter(x=>x.dataset.hg86Kind==='hero').length,
            gear:art.filter(x=>x.dataset.hg86Kind==='gear').length,
            sampleSizes:art.map(x=>[x.naturalWidth,x.naturalHeight]).slice(0,4)};
        }""")
        check(mode+' '+race+' all 16 real WEBP assets decoded offline',images['count']==16 and
          images['ok'] and images['heroes']==4 and images['gear']==12,images)
        if race!='human':
          page.locator(f'[data-action="race"][data-race="{race}"]').click()
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        portrait=page.evaluate("""async race=>{
          const img=document.querySelector('.hg408-profile .hg86-rendered-portrait .hg86-rendered-hero-img');
          if(img)await img.decode();
          const s=HOG_APP_DEBUG.getState();
          return {found:!!img,race:document.querySelector('.hg408-profile [data-hg86-hero]')?.dataset.hg86Hero,
            src:img?.currentSrc?.split(':')[0]||'',width:img?.naturalWidth||0,
            svgFallback:document.querySelector('.hg408-profile .hg86-rendered-portrait svg')!==null,
            valid:HOG_ENGINE.strictSave(s),version:s.version};
        }""",race)
        check(mode+' '+race+' visible hero portrait is a real render, no SVG block fallback',
          portrait['found'] and portrait['race']==race and portrait['width']>=256 and
          not portrait['svgFallback'] and portrait['version']==7 and portrait['valid'],portrait)
        shot(page,mode+'-'+race+'-hero-render')
        rows=page.evaluate("""race=>{
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          const ids=['weapon','armor','ring'].map(slot=>'hg83_'+race+'_'+slot);
          for(const id of ids)E.addItem(s,id,'HG86 visual QA fixture ONLY');
          HOG_APP_DEBUG.render();
          return {ids,valid:E.strictSave(s),inventory:s.inventory.length};
        }""",race)
        check(mode+' '+race+' QA inventory fixture has only three canonical items',
          rows['valid'] and rows['inventory']==3,rows)
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        gear=page.evaluate("""async race=>{
          const imgs=[...document.querySelectorAll('.hg83-inventory-tile .hg86-rendered-gear-img')];
          await Promise.all(imgs.map(x=>x.decode()));
          const keys=[...document.querySelectorAll('.hg83-inventory-tile [data-hg86-gear]')]
            .map(x=>x.dataset.hg86Gear);
          return {count:imgs.length,keys,valid:imgs.every(i=>i.naturalWidth==256&&i.naturalHeight==256),
            onlyRendered:document.querySelectorAll('.hg83-inventory-tile .hg86-rendered-gear').length===3,
            hiddenDetails:document.querySelector('.hg83-inspector')===null,
            gradeFrames:document.querySelectorAll('.hg83-inventory-tile[class*="hg73-tier-"]').length===3};
        }""",race)
        check(mode+' '+race+' three genuine equipment renders visible in compact inventory',
          gear['count']==3 and gear['valid'] and gear['onlyRendered'] and gear['hiddenDetails'] and
          gear['gradeFrames'] and set(gear['keys'])=={
            'gear-'+race+'-weapon','gear-'+race+'-armor','gear-'+race+'-offhand'},gear)
        shot(page,mode+'-'+race+'-gear-render')
        page.locator('.hg83-inventory-tile').first.click()
        check(mode+' '+race+' rendered icon remains clickable and inspect-only',
          page.locator('.hg83-inspector').count()==1 and
          page.locator('.hg83-inspector .hg86-rendered-gear-img').count()==1)
        page.locator('[data-action="hg46-inspect-close"]').click()
        check(mode+' '+race+' close inspector preserves all three rendered item UIDs',
          page.locator('.hg83-inspector').count()==0 and
          page.locator('.hg83-inventory-tile').count()==3)
        page.evaluate('HOG_APP_DEBUG.save()')
        page.reload(wait_until='load',timeout=180000)
        cold=page.evaluate("""()=>{
          const s=HOG_APP_DEBUG.getState();
          return {race:s?.race,version:s?.version,valid:HOG_ENGINE.strictSave(s),n:s.inventory.length}
        }""")
        check(mode+' '+race+' cold reload preserves real UIDs and Save v07',
          cold['race']==race and cold['version']==7 and cold['valid'] and cold['n']==3,cold)
        context.close()
    browser.close()
check('No Chromium runtime/page errors',not errors,errors)
print('HG86 UI '+str(sum(c['pass'] for c in checks))+'/'+str(len(checks))+' PASS',flush=True)
