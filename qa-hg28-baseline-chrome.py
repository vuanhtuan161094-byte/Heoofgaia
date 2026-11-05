"""HG28 PRE-ART BASELINE — independent real-Chromium captures, no fixture resources.

Collect both landscape sizes across all ten game tabs. Record dialog scroll,
first-screen text density and actual viewport/canvas geometry for screenshot-driven
HG28 implementation. This does NOT assert the UI already looks polished.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs'/'evidence'/'hg28'/'before'
RECEIPT=ROOT/'docs'/'qa'/'hg28'/'baseline.json'
OUT.mkdir(parents=True,exist_ok=True)
RECEIPT.parent.mkdir(parents=True,exist_ok=True)

TABS=['map','city','army','heroes','magic','relics','tasks','tower','reports','sources']
SIZES=[(1280,720),(960,540)]
errors=[]
receipts=[]
images=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=[
        '--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for width,height in SIZES:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
        assert page.locator('[data-action="start"]').count()==1, 'No real New Game'
        page.locator('[data-action="start"]').click()
        assert page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"),'Invalid New Game Save'
        for index,tab in enumerate(TABS,1):
            page.locator('[data-action="tab"][data-tab="'+tab+'"]').first.click()
            # No mutation of gameplay balances, hero stats or elapsed time.
            entry=page.evaluate("""({tab})=>{
               const body=document.querySelector('.game-window-body');
               const modal=document.querySelector('#game-modal');
               const stage=document.querySelector('#world-canvas');
               const buttons=[...document.querySelectorAll('button')];
               const visible=e=>!!e&&e.getClientRects().length>0;
               const rect=stage?.getBoundingClientRect();
               return {tab,width:innerWidth,height:innerHeight,
                 documentOverflowX:document.scrollingElement.scrollWidth-innerWidth,
                 documentOverflowY:document.scrollingElement.scrollHeight-innerHeight,
                 modalVisible:!!modal&&!modal.hidden,
                 dialogHeight:body?.clientHeight||0,
                 dialogScrollHeight:body?.scrollHeight||0,
                 dialogTextChars:body?.innerText.trim().length||0,
                 visibleButtons:buttons.filter(visible).length,
                 disabledButtons:buttons.filter(b=>visible(b)&&b.disabled).length,
                 canvasRect:rect?{width:Math.round(rect.width),height:Math.round(rect.height)}:null,
                 canvasPixels:stage?{width:stage.width,height:stage.height}:null,
                 strictSave:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())};
            }""",{'tab':tab})
            assert entry['strictSave'],f'Save invalid after opening {tab}'
            assert entry['documentOverflowX']<=2 and entry['documentOverflowY']<=2, f'Document overflow on {tab} {width}x{height}'
            filename=f'{index:02d}-{tab}-BEFORE-{width}x{height}.png'
            screenshot=OUT/filename
            page.screenshot(path=str(screenshot),full_page=False)
            images.append((screenshot,tab,width,height))
            entry['screenshot']=str(screenshot.relative_to(ROOT))
            receipts.append(entry)
        page.close()
    browser.close()

# Produce a compact contact sheet from genuine Chrome PNG captures, not mockups.
thumb_width,thumb_height=320,180
sheet=Image.new('RGB',(thumb_width*5,225*4),(16,31,38))
d=ImageDraw.Draw(sheet)
for i,(path,tab,width,height) in enumerate(images):
    row=i//5
    col=i%5
    pic=Image.open(path).convert('RGB')
    pic.thumbnail((thumb_width,thumb_height),Image.Resampling.LANCZOS)
    left=col*thumb_width+(thumb_width-pic.width)//2
    top=row*225+18
    sheet.paste(pic,(left,top))
    d.text((col*thumb_width+8,row*225+201),f'{tab} | {width}x{height}',fill=(242,223,181))
sheet_path=OUT/'HG28-BEFORE-20-screen-contact-sheet.jpg'
sheet.save(sheet_path,quality=88,optimize=True)
result={'kind':'real-Chromium-before-art','pass':not errors and len(receipts)==20,
        'baselineOnly':True,'noResourceFixture':True,'sizes':['1280x720','960x540'],
        'screens':receipts,'uncaughtErrors':errors,'contactSheet':str(sheet_path.relative_to(ROOT))}
RECEIPT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
assert result['pass'],f'Baseline failed: {errors}'
print('HG28 baseline PASS 20/20 real screens (before art), strict Save, no document overflow')
print('Actual screenshots:',str(OUT.relative_to(ROOT)),flush=True)
