"""Bake actual source rig clips in local Chrome. --master only is the first visual gate."""
from pathlib import Path
import argparse,base64,functools,hashlib,http.server,json,threading
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
out=root/'assets/licensed/kaykit-heavy-soldier/rendered';out.mkdir(parents=True,exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
args=argparse.ArgumentParser();args.add_argument('--master',action='store_true');options=args.parse_args()
def save_png(path,data):
    raw=base64.b64decode(data);path.write_bytes(raw)
    return {'path':path.relative_to(root).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper()}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True,args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        page=browser.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)))
        page.goto(f'http://127.0.0.1:{server.server_port}/tools/asset-renderer/export.html')
        page.wait_for_function('window.exporterReady===true||!!window.exporterError',timeout=30000)
        error=page.evaluate('window.exporterError');
        if error:raise RuntimeError(error)
        master=page.evaluate('window.exportMaster()');master['file']=save_png(out/'heavy-soldier-master.png',master.pop('png'))
        (out/'master-metadata.json').write_text(json.dumps(master,indent=2),encoding='utf-8');print('MASTER',master,flush=True)
        if not options.master:
            records=[]
            for name,clip in [('idle','Idle'),('walk','Walking_A'),('attack','1H_Melee_Attack_Chop'),('hit','Hit_A'),('death','Death_A')]:
                result=page.evaluate('([name,clip])=>window.exportAction(name,clip,12)',[name,clip])
                folder=out/name;folder.mkdir(exist_ok=True)
                for stale in folder.glob('*.png'):stale.unlink()
                for i,frame in enumerate(result['frames']):frame['file']=save_png(folder/f'{i:03}.png',frame.pop('png'))
                result['atlasFile']=save_png(out/f'{name}.png',result.pop('atlas'));records.append(result)
                print('ACTION',name,result['frameCount'],flush=True)
            (out/'animation-metadata.json').write_text(json.dumps({'source':'actual KayKit Knight GLB rig clips','status':'RECREATED','actions':records,'errors':errors},indent=2),encoding='utf-8')
        browser.close()
        if errors:raise RuntimeError(errors)
finally:server.shutdown();server.server_close()
