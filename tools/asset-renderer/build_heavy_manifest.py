from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[2]
BASE = Path('assets/licensed/kaykit-heavy-soldier')
base = ROOT / BASE

def sha(data):
    return hashlib.sha256(data).hexdigest().upper()

def png_info(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Not a PNG: {path}')
    width, height = struct.unpack('>II', data[16:24])
    return {'projectPath': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'resolution': f'{width}x{height}', 'sha256': sha(data)}

source = json.loads((base / 'source-manifest.json').read_text(encoding='utf-8'))
if (source['author'], source['license'], source['sourceCommit']) != ('Kay Lousberg', 'CC0-1.0', '672074b73ba276876a19e8816ecdc5241817ab47'):
    raise ValueError('Pinned source identity, license or commit changed')
source_files = []
for record in source['files']:
    path = ROOT / record['path']
    data = path.read_bytes()
    actual = {'path': record['path'], 'bytes': len(data), 'sha256': sha(data)}
    if actual['bytes'] != record['bytes'] or actual['sha256'] != record['sha256']:
        raise ValueError(f'Pinned source checksum mismatch: {record["path"]}')
    source_files.append({**record, 'verified': True})

metadata_path = base / 'rendered/animation-metadata.json'
metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
expected = {'idle': ('Idle', 13, True), 'walk': ('Walking_A', 13, True), 'attack': ('1H_Melee_Attack_Chop', 13, False), 'hit': ('Hit_A', 8, False), 'death': ('Death_A', 10, False)}
actions = []
frame_total = 0
for name, (clip_name, frame_count, loop) in expected.items():
    action = next((x for x in metadata['actions'] if x['name'] == name), None)
    if action is None or (action['clipName'], action['frameCount'], action['loop']) != (clip_name, frame_count, loop):
        raise ValueError(f'Unexpected clip mapping: {name}')
    if action['cell'] != 256 or action['pivot'] != [148, 216] or len(action['frames']) != frame_count:
        raise ValueError(f'Frame registration mismatch: {name}')
    frame_hashes = set()
    frames = []
    for frame in action['frames']:
        fpath = ROOT / frame['file']['path']
        record = png_info(fpath)
        if record['resolution'] != '256x256' or record['sha256'] != frame['file']['sha256'] or record['bytes'] != frame['file']['bytes']:
            raise ValueError(f'Frame file differs from render metadata: {fpath}')
        if frame['alphaPixels'] <= 0 or len(frame['bounds']) != 4 or frame['bounds'][0] < 0 or frame['bounds'][1] < 0 or frame['bounds'][2] >= 256 or frame['bounds'][3] >= 256:
            raise ValueError(f'Invalid alpha bounds: {fpath}')
        frame_hashes.add(record['sha256'])
        frames.append({**record, 'timeSeconds': frame['time'], 'alphaPixels': frame['alphaPixels'], 'alphaBounds': frame['bounds']})
    if len(frame_hashes) != frame_count:
        raise ValueError(f'Duplicate frame poses in {name}')
    atlas = png_info(ROOT / action['atlasFile']['path'])
    if atlas['sha256'] != action['atlasFile']['sha256'] or atlas['bytes'] != action['atlasFile']['bytes']:
        raise ValueError(f'Atlas checksum mismatch: {name}')
    if atlas['resolution'] != f'2048x{256 * ((frame_count + 7) // 8)}':
        raise ValueError(f'Atlas dimensions mismatch: {name}: {atlas["resolution"]}')
    frame_total += frame_count
    actions.append({'name': name, 'sourceClip': clip_name, 'sourceDurationSeconds': action['sourceDuration'], 'sampleFps': action['fps'], 'loop': loop, 'frameCount': frame_count, 'cellPixels': 256, 'pivotPixels': action['pivot'], 'frames': frames, 'atlas': atlas})
if frame_total != 57:
    raise ValueError(f'Expected 57 distinct frames, got {frame_total}')

receipt_path = ROOT / 'docs/qa/hg11/human-heavy-animation-chrome.json'
receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
if receipt['total'] != 20 or receipt['passed'] != 20 or receipt['failed'] != 0 or receipt['errors']:
    raise ValueError('Focused browser receipt is not a clean 20/20 run')
if not any(c['name'].startswith('v07 Save/Reload preserves the actual death result') and c['passed'] for c in receipt['checks']):
    raise ValueError('No v07 actual death Save/Reload check in receipt')
if receipt['observedAnimation']['hitFrames'] < 2 or receipt['observedAnimation']['deathFrames'] < 2:
    raise ValueError('Hit/death clips were not observed in rendered gameplay')

screenshot_names = [
    'human-heavy-soldier-battle-live-chrome.png',
    'human-heavy-soldier-death-frame-chrome.png',
    'human-heavy-soldier-live-animation-chrome.png',
    'human-heavy-soldier-death-animation-chrome.png',
]
screenshots = []
for name in screenshot_names:
    record = png_info(ROOT / 'docs/evidence/hg11' / name)
    expected_receipt = receipt['artifacts'].get(name)
    if expected_receipt and (record['sha256'] != expected_receipt['sha256'] or record['bytes'] != expected_receipt['bytes'] or record['resolution'] != expected_receipt['resolution']):
        raise ValueError(f'Browser receipt screenshot hash mismatch: {name}')
    record['role'] = 'Focused-QA receipt capture' if expected_receipt else 'Supplementary actual Chrome capture; not referenced by the focused machine receipt'
    screenshots.append(record)

node_receipt_path = ROOT / 'docs/evidence/hg09/QA-HG09-NODE-RESULTS.json'
node = json.loads(node_receipt_path.read_text(encoding='utf-8'))
if node['suitePassed'] != node['suiteTotal'] or node['suiteFailed'] != 0:
    raise ValueError('Node regression receipt is not fully passing')
html_path = ROOT / 'Play-Heoofgaia-HG11.html'
html = html_path.read_text(encoding='utf-8')
for action in expected:
    atlas = ROOT / f'assets/licensed/kaykit-heavy-soldier/rendered/{action}.png'
    encoded = __import__('base64').b64encode(atlas.read_bytes()).decode('ascii')
    if html.count(f'src="data:image/png;base64,{encoded}"') != 1:
        raise ValueError(f'Offline HTML does not embed exactly one {action} atlas')
if html.count('data:image/png;base64,') != 15:
    raise ValueError('Standalone bundle must embed exactly 15 runtime PNGs')
html_bytes = html_path.read_bytes()

manifest = {
    'schema': 'hog1-asset-manifest-v1',
    'assetId': 'HOG1-HG11-UNIT-HUMAN-HEAVY-SOLDIER-ANIM-V1',
    'project': 'Anh Hùng Thời Loạn / Heroes of Gaia 1 reconstruction',
    'createdAtUtc': datetime.now(timezone.utc).isoformat(),
    'target': {'stage': 'HG-11', 'unitId': 'human_4', 'unitName': 'Heavy Soldier', 'faction': 'human'},
    'status': 'RECREATED',
    'historicalVisualParity': 'UNVERIFIED: no original client capture or rights-cleared same-screen visual reference was available for direct comparison.',
    'source': {'author': source['author'], 'license': source['license'], 'repository': source['sourceRepository'], 'commit': source['sourceCommit'], 'licenseUrl': 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/672074b73ba276876a19e8816ecdc5241817ab47/LICENSE.txt', 'sourceFiles': source_files, 'animationClipCountInPinnedGLB': len(source['animations'])},
    'renderPipeline': {'method': 'Render the pinned rigged GLB source clips with local Three.js 0.160.0 and installed headless Chrome SwiftShader into registered transparent 256x256 cells; atlas output is baked into the game. No static still is presented as an animation.', 'threeJsLicense': {'projectPath': 'tools/asset-renderer/THREE-LICENSE.txt', 'license': 'MIT', 'sha256': sha((ROOT / 'tools/asset-renderer/THREE-LICENSE.txt').read_bytes())}, 'rendererSource': ['tools/asset-renderer/export.html', 'tools/asset-renderer/render_kaykit.py', 'tools/asset-renderer/package.json', 'tools/asset-renderer/package-lock.json']},
    'animation': {'distinctFrameCount': frame_total, 'commonCellPixels': 256, 'commonFootPivotPixels': [148, 216], 'actions': actions},
    'integration': {'runtime': 'painter.js battle renderer; only human_4 uses these atlases in this slice', 'gameplayEventSource': 'engine.js writes per-stack movement, attack, received damage and death events; rendering observes receipts and does not alter battle state.', 'standaloneHtml': {'projectPath': 'Play-Heoofgaia-HG11.html', 'bytes': len(html_bytes), 'characters': len(html), 'sha256': sha(html_bytes), 'embeddedRuntimePngCount': 15, 'allFiveAtlasesEmbedded': True}, 'saveSchema': 'v07 unchanged; old saves without lastEvents remain accepted.', 'nodeRegression': {'command': 'node qa-engine.cjs', 'suiteTotal': node['suiteTotal'], 'suitePassed': node['suitePassed'], 'suiteFailed': node['suiteFailed'], 'result': 'PASS'}, 'focusedBrowserQa': {'projectPath': receipt_path.relative_to(ROOT).as_posix(), 'command': receipt['command'], 'browser': receipt['browser'], 'mode': receipt['sourceMode'], 'total': receipt['total'], 'passed': receipt['passed'], 'failed': receipt['failed'], 'errors': receipt['errors'], 'result': 'PASS', 'fixtureDisclosure': receipt['fixtureDisclosure'], 'observedAnimation': receipt['observedAnimation'], 'enemyRendererCheck': receipt['enemyRendererCheck']}, 'screenshots': screenshots},
    'scopeLimitations': ['This is one modern licensed replacement for Human Heavy Soldier, not original Heroes of Gaia art.', 'Only this one unit identity has these five animated actions; the other 39 troops are not covered.', 'The focused QA uses disclosed enemy-only combat fixture adjustments so the battle stays observable and a real engine casualty occurs.', 'Visual parity against the original client remains unverified; the screenshot is of this reconstruction.'],
}
out = base / 'asset-manifest.json'
out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'manifest': out.relative_to(ROOT).as_posix(), 'frames': frame_total, 'actions': [a['name'] for a in actions], 'bundleBytes': len(html_bytes), 'bundleSha256': sha(html_bytes), 'nodeRegression': f"{node['suitePassed']}/{node['suiteTotal']}", 'focusedChrome': f"{receipt['passed']}/{receipt['total']}", 'screenshots': len(screenshots)}, ensure_ascii=False, indent=2))
