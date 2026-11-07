from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,struct,base64
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'assets/generated/hg11/battlefield'
def record(path):
    data=path.read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError(f'Not PNG: {path}')
    w,h=struct.unpack('>II',data[16:24]);color=data[25]
    return {'projectPath':path.relative_to(ROOT).as_posix(),'resolution':f'{w}x{h}','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'pngColorType':color}
source=record(base/'source/open-field-v2-master.png');runtime=record(base/'open-field-v2-1176x550.png');prompt=base/'prompt-open-field-v2.txt';script=ROOT/'tools/build-open-field-battlefield.ps1'
if source['resolution']!='1817x866' or runtime['resolution']!='1176x550' or runtime['pngColorType']!=2:raise ValueError('Battlefield dimensions or opaque RGB PNG did not pass')
with Image.open(ROOT/runtime['projectPath']) as image: sampled_unique_rgb=len({image.getpixel((x,y)) for y in range(0,image.height,11) for x in range(0,image.width,11)})
receipt_path=ROOT/'docs/qa/hg11/battlefield-open-field-v2/human-heavy-animation-chrome.json';receipt=json.loads(receipt_path.read_text(encoding='utf-8'))
if receipt['failed'] or receipt['passed']!=receipt['total'] or receipt['total']<20 or receipt['errors']:raise ValueError('Focused Chrome receipt is not a clean 20/20 run')
check=next((c for c in receipt['checks'] if c['name'].startswith('Original action atlas') and 'battlefield load and draw offline' in c['name']),None)
if not check or not check['passed'] or '"draws":' not in check['detail']:raise ValueError('No passing live draw check for the background')
screenshot_name='human-heavy-soldier-battle-live-chrome.png';shot=receipt['artifacts'][screenshot_name]
screenshot=record(ROOT/'docs/evidence/hg11/battlefield-open-field-v2'/screenshot_name)
if any(screenshot[k]!=shot[k] for k in ('bytes','sha256','resolution')):raise ValueError('Screenshot differs from machine receipt')
html_path=ROOT/'Play-Heoofgaia-HG11.html';html=html_path.read_text(encoding='utf-8');encoded=base64.b64encode((ROOT/runtime['projectPath']).read_bytes()).decode('ascii')
if html.count(f'src="data:image/png;base64,{encoded}"')!=1 or 'assets/generated/hg11/battlefield/' in html:raise ValueError('Battlefield art is missing or not fully embedded in standalone HTML')
node=json.loads((ROOT/'docs/evidence/hg09/QA-HG09-NODE-RESULTS.json').read_text(encoding='utf-8'))
if node['suiteFailed'] or node['suitePassed']!=node['suiteTotal']:raise ValueError('Node regression did not pass')
manifest={'schema':'hog1-asset-manifest-v1','assetId':'HOG1-HG11-BATTLEFIELD-OPEN-FIELD-V2','project':'Anh Hùng Thời Loạn / Heroes of Gaia 1 reconstruction','createdAtUtc':datetime.now(timezone.utc).isoformat(),'target':{'stage':'HG-11','screen':'tactical battle canvas','backgroundId':'open-field-v2'},'status':'RECREATED','provider':'ChatGPT image_gen.imagegen','generationOutputId':'exec-86cdd75d-4ac6-4822-8271-a3f31e123b0e','generationPrompt':'assets/generated/hg11/battlefield/prompt-open-field-v2.txt','promptSha256':hashlib.sha256(prompt.read_bytes()).hexdigest().upper(),'sourceRoute':'Generated from text only with no Heroes of Gaia screenshot or original art as image input; saved master is included in repository.','historicalVisualParity':'UNVERIFIED; this is a new modern fantasy scene, not original HOG art.','source':{**source,'providerDefaultOutputPath':'C:/Users/Admin/.codex/generated_images/01a19a08-e09e-7801-88a0-49e6d7322f34/exec-86cdd75d-4ac6-4822-8271-a3f31e123b0e.png'},'runtime':{**runtime,'alpha':'opaque RGB24; PNG color type 2','cropAndResize':{'tool':script.relative_to(ROOT).as_posix(),'sourceCrop':'x=0, y=8, width=1817, height=850','destinationPixels':'1176x550','interpolation':'HighQualityBicubic'},'sampledUniqueRgb':sampled_unique_rgb},'integration':{'canvas':'#battle-canvas 1176×550','grid':'Engine-owned 12×9 BATTLE_GRID remains overlaid and traversability is unchanged.','drawPath':'painter.js drawBattle uses the open-field-v2 image; the pre-existing procedural background is retained only as an image-load fallback.','offlineEmbedded':True,'bundle':{'projectPath':'Play-Heoofgaia-HG11.html','bytes':html_path.stat().st_size,'sha256':hashlib.sha256(html_path.read_bytes()).hexdigest().upper(),'runtimePngCount':16},'nodeRegression':{'passed':node['suitePassed'],'total':node['suiteTotal'],'failed':node['suiteFailed'],'result':'PASS'},'focusedBrowserReceipt':receipt_path.relative_to(ROOT).as_posix(),'focusedBrowserCheck':check['name'],'focusedBrowserPass':True,'screenshot':screenshot},'scope':'One flattened static background only. It creates no collision, obstacles, pathfinding, terrain modifiers, layers, animations or gameplay rules.'}
out=base/'asset-manifest.json';out.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'manifest':out.relative_to(ROOT).as_posix(),'sourceSha256':source['sha256'],'runtimeSha256':runtime['sha256'],'bundleSha256':manifest['integration']['bundle']['sha256'],'browser':f"{receipt['passed']}/{receipt['total']}",'screenshot':screenshot},ensure_ascii=False,indent=2))
