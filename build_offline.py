"""Bundle the documented editable HG08 sources into a single offline HTML file.
Run: python build_offline.py
"""
from pathlib import Path
import base64
from io import BytesIO
import json
import re
import subprocess
import sys
from PIL import Image
folder=Path(__file__).parent
subprocess.check_call([sys.executable,str(folder/'tools/generate_hg143_archer.py')])
subprocess.check_call([sys.executable,str(folder/'tools/prepare_hg33_troop_atlases.py')])
subprocess.check_call([sys.executable,str(folder/'tools/prepare_hg33_additional_atlases.py')])
html=(folder/'index.html').read_text(encoding='utf-8')
hg33=json.loads((folder/'assets/generated/hg33/animation/troop-atlas-manifest.json').read_text(encoding='utf-8'))
extra_atlases=json.loads((folder/'assets/generated/hg33/animation/additional-atlas-manifest.json').read_text(encoding='utf-8'))
assert extra_atlases['schema']=='HG33-AdditionalActionAtlases-v1'
assert hg33['schema']=='HG33-OriginalTroopAnimationAtlases-v1' and hg33['unitCount']==40 and hg33['atlasCount']==38
inventory=json.loads((folder/'docs/qa/hg33/boss-art-inventory.json').read_text(encoding='utf-8'))
expected_units=set(inventory['catalog']['coreIds'])
base_units={item['unitId'] for item in hg33['assets']}
additional_units={item['unitId'] for item in extra_atlases['assets'] if item['kind']=='core' and item.get('unitId')}
assert base_units|additional_units==expected_units, (len(base_units|additional_units), sorted(expected_units-(base_units|additional_units)))
expected_bosses={item['name'] for item in inventory['bosses']['combatArchetypes']}
actual_bosses={item['bossName'] for item in extra_atlases['assets'] if item['kind']=='boss'}
assert actual_bosses==expected_bosses, (actual_bosses,expected_bosses)
expected_rewards=set(inventory['catalog']['rewardIds'])
actual_rewards={item['unitId'] for item in extra_atlases['assets'] if item['kind']=='reward'}
assert actual_rewards==expected_rewards, (actual_rewards,expected_rewards)
for item in extra_atlases['assets']:
    assert set(item['actions'])=={'idle','walk','attack','hit','death'}, item['id']
    assert all(action['count']==8 and len(action['frames'])==8 for action in item['actions'].values()), item['id']
overridden_core_units={item['unitId'] for item in extra_atlases['assets'] if item['kind']=='core' and item.get('unitId')}
atlas_marker='<!-- HG33_TROOP_ATLAS_IMAGES -->'
assert html.count(atlas_marker)==1,(atlas_marker,html.count(atlas_marker))
atlas_tags=[]
for item in hg33['assets']:
    if item['unitId']=='human_4' or item['unitId'] in overridden_core_units:
        continue
    atlas_tags.append(f'<img id="{item["imageId"]}" data-hg33-atlas-src="{item["runtimePath"]}" data-unit-animation="{item["unitId"]}:40-atlas-frames" width="1536" height="1024" alt="">')
for item in extra_atlases['assets']:
    label=item.get('unitId') or item.get('bossName')
    atlas_tags.append(f'<img id="{item["imageId"]}" data-hg33-atlas-src="{item["runtimePath"]}" data-additional-animation="{label}:40-atlas-frames" width="{item["atlasDimensions"][0]}" height="{item["atlasDimensions"][1]}" alt="">')
html=html.replace(atlas_marker,'\n'.join(atlas_tags))
thumb_marker='<!-- HG33_UNIT_THUMB_IMAGES -->'
assert html.count(thumb_marker)==1,(thumb_marker,html.count(thumb_marker))
runtime_atlases=[item for item in hg33['assets'] if item['unitId'] not in overridden_core_units]+extra_atlases['assets']
unit_assets={item['unitId']:item for item in runtime_atlases if item.get('unitId')}
assert set(unit_assets)==expected_units|expected_rewards,(len(unit_assets),sorted((expected_units|expected_rewards)-set(unit_assets)))
thumb_tags=[]
for unit_id,item in sorted(unit_assets.items()):
    with Image.open(folder/item['sourcePath']) as atlas:
        frame=atlas.convert('RGBA').crop((0,0,192,204)).resize((96,102),Image.Resampling.LANCZOS)
        thumb=BytesIO()
        frame.save(thumb,format='WEBP',lossless=True,method=6)
    encoded=base64.b64encode(thumb.getvalue()).decode('ascii')
    thumb_tags.append(f'<img id="hg33-thumb-{unit_id}" data-hg33-thumb-src="data:image/webp;base64,{encoded}" width="96" height="102" alt="">')
html=html.replace(thumb_marker,'\n'.join(thumb_tags))
for css in ['style.css','style-hg03.css']:
    pattern=re.compile(r'<link\s+rel="stylesheet"\s+href="'+re.escape(css)+r'">')
    html,n=pattern.subn(lambda _: '<style>\n'+(folder/css).read_text(encoding='utf-8').rstrip()+ '\n</style>',html)
    assert n==1,(css,n)
for js in ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js','hg24-private-automation.js','hg26-boss-autohunt.js','hg261-joint-boss.js','hg27-farm-exchange.js','hg29-loot.js','hg30-troop-ascension.js','hg31-legendary-gear.js','hg40-tactical.js','hg408-hero-management.js','hg46-equipment.js','hg409-enemy-commanders.js','hg410-battlefield.js','hg42-boss-screen.js','hg43-troop-profiles.js','art-free-icons-core.js','art-free-icons-extra.js','art-hg28-troops.js','art-hg28-rigs.js','art-pack.js','art-hg33-troop-atlases.js','art-hg33-additional-atlases.js','painter.js','app.js']:
    pattern=re.compile(r'<script\s+src="'+re.escape(js)+r'"></script>')
    html,n=pattern.subn(lambda _: '<script>\n'+(folder/js).read_text(encoding='utf-8').rstrip()+'\n</script>',html)
    assert n==1,(js,n)
for race in ['human','elf','orc','undead']:
    asset=f'assets/generated/hg11/cities/{race}-city-1176x560.png'
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
for asset in ['assets/generated/hg28/world/meadow-tile.png','assets/generated/hg28/world/world-creatures-atlas.png','assets/generated/hg28/world/tree-broadleaf.png','assets/generated/hg28/world/tree-pine.png']:
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
hg28_landmarks=json.loads((folder/'assets/generated/hg28/world/landmarks/asset-manifest.json').read_text(encoding='utf-8'))
assert hg28_landmarks['schema']=='HG28-WorldLandmarks-v1' and len(hg28_landmarks['assets'])==12
for item in hg28_landmarks['assets']:
    asset=item['path']
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert 'assets/generated/hg28/world/' not in html
hg28_troops=json.loads((folder/'assets/generated/hg28/troops/asset-manifest.json').read_text(encoding='utf-8'))
assert hg28_troops['schema']=='HG28-Troop-Masters-v1' and len(hg28_troops['units'])==8
for unit in hg28_troops['units']:
    asset=unit['path']
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert 'assets/generated/hg28/troops/' not in html
hg28_bosses=json.loads((folder/'assets/generated/hg28/bosses/asset-manifest.json').read_text(encoding='utf-8'))
assert hg28_bosses['schema']=='HG28-BossSprites-v1' and len(hg28_bosses['assets'])==3
for item in hg28_bosses['assets']:
    asset=item['runtime_path']
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/webp;base64,{data}"')
    assert asset not in html,asset
assert 'assets/generated/hg28/bosses/' not in html
hg28_spear=json.loads((folder/'assets/generated/hg28/battle/asset-manifest.json').read_text(encoding='utf-8'))
assert hg28_spear['schema']=='HG28-SingleBattleTroop-v1' and len(hg28_spear['assets'])==1
for item in hg28_spear['assets']:
    asset=item['runtime_path']
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/webp;base64,{data}"')
    assert asset not in html,asset
assert 'assets/generated/hg28/battle/' not in html
hg33_elf=json.loads((folder/'assets/generated/hg33/troops/asset-manifest.json').read_text(encoding='utf-8'))
assert hg33_elf['schema']=='HG33-OriginalBattleSprite-v1' and hg33_elf['unitId']=='elf_2'
asset=hg33_elf['runtimePath']
needle=f'src="{asset}"'
assert html.count(needle)==1,(asset,html.count(needle))
data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
html=html.replace(needle,f'src="data:image/webp;base64,{data}"')
assert asset not in html,asset
assert 'assets/generated/hg33/troops/' not in html
for unit_asset in ['assets/generated/hg11/units/orc-imp.png','assets/generated/hg11/units/elf-centaur.png','assets/generated/hg11/units/human-archer.png','assets/generated/hg11/units/undead-skeleton.png']:
    needle=f'src="{unit_asset}"'
    assert html.count(needle)==1,(unit_asset,html.count(needle))
    data=base64.b64encode((folder/unit_asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
archer_atlas='assets/generated/hg143/animation/human-archer-atlas.png'
needle=f'src="{archer_atlas}"'
assert html.count(needle)==1,(archer_atlas,html.count(needle))
data=base64.b64encode((folder/archer_atlas).read_bytes()).decode('ascii')
html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert archer_atlas not in html
for building_asset in ['assets/generated/hg11/buildings/human-barracks.png','assets/generated/hg11/buildings/human-town-hall.png']:
    needle=f'src="{building_asset}"'
    assert html.count(needle)==1,(building_asset,html.count(needle))
    data=base64.b64encode((folder/building_asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert hg33['atlasCount']==38 and len(hg33['assets'])==38
for item in runtime_atlases:
    asset=item['runtimePath']
    needle=f'data-hg33-atlas-src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    encoded=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'data-hg33-atlas-src="data:image/webp;base64,{encoded}"')
    assert asset not in html,asset
assert 'assets/generated/hg33/animation/runtime/' not in html
assert 'assets/original/hg33/troops/' not in html
assert 'assets/licensed/kaykit-heavy-soldier/rendered/' not in html
# HG33 H5: release runtime excludes internet-sourced sprite packs. Original
# HG33 atlases stay bundled; legacy source files remain available only for
# provenance tests and are never referenced by this playable HTML.
forbidden_runtime_paths=['assets/licensed/spritecook/','assets/licensed/dcss-cc0/','assets/licensed/hg22-skeleton/','assets/licensed/hg193/','assets/generated/hg193/']
for asset_path in forbidden_runtime_paths:
    assert asset_path not in html,asset_path
for module in ['art-free-sprites.js','art-hg192-sprites.js','art-hg193-sprites.js','art-hg22-skeleton.js']:
    assert module not in html,module
assert html.count('id="hg33-thumb-')==48
# HG12 vector combat units are bundled into the same standalone HTML without
# network dependencies. They are source-separated, transparent illustrated assets.
for unit_asset in [
    'assets/generated/hg12/combat/human-spear-militia.svg',
    'assets/generated/hg12/combat/npc-wild-beast.svg',
    'assets/generated/hg12/combat/npc-bandit-archer.svg',
    'assets/generated/hg12/combat/npc-guard.svg',
]:
    needle=f'src="{unit_asset}"'
    assert html.count(needle)==1,(unit_asset,html.count(needle))
    data=base64.b64encode((folder/unit_asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/svg+xml;base64,{data}"')
assert 'assets/generated/hg12/combat/' not in html
battlefield_asset='assets/generated/hg11/battlefield/open-field-v2-1176x550.png'
needle=f'src="{battlefield_asset}"'
assert html.count(needle)==1,(battlefield_asset,html.count(needle))
data=base64.b64encode((folder/battlefield_asset).read_bytes()).decode('ascii')
html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert 'assets/generated/hg11/battlefield/' not in html
assert 'src="data.js"' not in html and 'href="style.css"' not in html
assert 'assets/generated/hg11/cities/' not in html
assert 'assets/generated/hg11/units/' not in html
assert 'assets/generated/hg11/buildings/' not in html
assert html.count('<script>')==35, 'Expected 35 offline game modules including HG43 40-troop intelligence'
html=html.rstrip()+'\n'
(folder/'Play-Heoofgaia-HG11.html').write_text(html,encoding='utf-8',newline='\n')
print('Built offline HTML:',len(html),'characters')
