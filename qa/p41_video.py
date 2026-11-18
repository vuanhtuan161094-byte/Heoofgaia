"""Capture genuine Chromium frames from actual engine battle events and encode native 1280x720 MP4.
Screen frames are sampled using a controlled VISUAL clock; combat event/hit data is real.
No gameplay rewards are fabricated; no detached mock animation is rendered.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json,os,hashlib
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
OUTPUT=ROOT/'qa/p41-combat-1280x720.mp4'
FRAMES=ROOT/'qa/p41_video_frames'
FRAMES.mkdir(parents=True,exist_ok=True)
SHIM="""<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"""
segments=[0,1,3,5] # step 0 is a real engine skill from a skill-ready test fixture.
receipts=[];index=0
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN') or None,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(HTML.replace('<script>',SHIM+'<script>',1),wait_until='domcontentloaded')
    page.wait_for_function('window.__P41_QA__?.image?.complete && __P41_QA__.image.naturalWidth===800',timeout=30000)
    page.evaluate("__P2_QA__.beginBattle(1,'campaign')")
    # Guarantee a real skill event in the visual sample despite counter/timing balance changes.
    # The setup only makes Quan Vũ skill-ready; targeting, damage and event are still engine-authored.
    page.evaluate("__P2_QA__.debugBattle().p.find(unit=>unit.id==='guan').morale=100")
    page.evaluate('__P2_QA__.debugBattle().next=Date.now()+999999')
    for step in range(max(segments)+1):
        page.evaluate('__P2_QA__.stepBattle()')
        if step not in segments:continue
        event=page.evaluate('__P41_QA__.currentEvent()')
        assert event and event['hits'],(step,event)
        receipts.append({'engineStep':step,'mode':event['mode'],'actor':event['actor'],'hits':event['hits']})
        # 12fps over one actual ~1100ms visual action, 13 frames per segment.
        for fi in range(13):
            page.evaluate('(ms)=>__P41_QA__.setVisualElapsed(ms)', min(1090,fi*92))
            page.screenshot(path=str(FRAMES/f'frame_{index:04d}.png'),animations='disabled')
            index+=1
    assert any(e['mode']=='skill' for e in receipts),receipts
    print('P4.1 real engine event receipts:',json.dumps(receipts,ensure_ascii=False),flush=True)
    assert not errors,errors
    browser.close()
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','12','-i',str(FRAMES/'frame_%04d.png'),'-vf','format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','25','-movflags','+faststart',str(OUTPUT)]
subprocess.run(cmd,check=True)
assert OUTPUT.stat().st_size>10000
report={'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'size':OUTPUT.stat().st_size,'width':1280,'height':720,'fps':12,'frames':index,'kind':'Chromium viewport capture of actual engine events, sampled visual clock; not live full-speed screen recording','events':receipts,'browserErrors':errors}
(ROOT/'qa/p41-video-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
