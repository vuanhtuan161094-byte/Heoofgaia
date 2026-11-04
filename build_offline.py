"""Bundle the documented editable HG08 sources into a single offline HTML file.
Run: python build_offline.py
"""
from pathlib import Path
import base64
import re
import subprocess
import sys
folder=Path(__file__).parent
subprocess.check_call([sys.executable,str(folder/'tools/generate_hg143_archer.py')])
html=(folder/'index.html').read_text(encoding='utf-8')
for css in ['style.css','style-hg03.css']:
    pattern=re.compile(r'<link\s+rel="stylesheet"\s+href="'+re.escape(css)+r'">')
    html,n=pattern.subn(lambda _: '<style>\n'+(folder/css).read_text(encoding='utf-8').rstrip()+ '\n</style>',html)
    assert n==1,(css,n)
for js in ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','painter.js','app.js']:
    pattern=re.compile(r'<script\s+src="'+re.escape(js)+r'"></script>')
    html,n=pattern.subn(lambda _: '<script>\n'+(folder/js).read_text(encoding='utf-8').rstrip()+'\n</script>',html)
    assert n==1,(js,n)
for race in ['human','elf','orc','undead']:
    asset=f'assets/generated/hg11/cities/{race}-city-1176x560.png'
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    data=base64.b64encode((folder/asset).read_bytes()).decode('ascii')
    html=html.replace(needle,f'src="data:image/png;base64,{data}"')
for unit_asset in ['assets/generated/hg11/units/orc-imp.png','assets/generated/hg11/units/elf-centaur.png','assets/generated/hg11/units/elf-scout.png','assets/generated/hg11/units/human-archer.png','assets/generated/hg11/units/undead-skeleton.png']:
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
for action in ['idle','walk','attack','hit','death']:
    asset=f'assets/licensed/kaykit-heavy-soldier/rendered/{action}.png'
    needle=f'src="{asset}"'
    assert html.count(needle)==1,(asset,html.count(needle))
    html=html.replace(needle,f'src="data:image/png;base64,{base64.b64encode((folder/asset).read_bytes()).decode("ascii")}"')
assert 'assets/licensed/kaykit-heavy-soldier/rendered/' not in html
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
battlefield_asset='assets/generated/hg11/battlefield/human-meadow-1176x550.png'
needle=f'src="{battlefield_asset}"'
assert html.count(needle)==1,(battlefield_asset,html.count(needle))
data=base64.b64encode((folder/battlefield_asset).read_bytes()).decode('ascii')
html=html.replace(needle,f'src="data:image/png;base64,{data}"')
assert 'assets/generated/hg11/battlefield/' not in html
assert 'src="data.js"' not in html and 'href="style.css"' not in html
assert 'assets/generated/hg11/cities/' not in html
assert 'assets/generated/hg11/units/' not in html
assert 'assets/generated/hg11/buildings/' not in html
assert html.count('<script>')==11
(folder/'Play-Heoofgaia-HG11.html').write_text(html,encoding='utf-8')
print('Built offline HTML:',len(html),'characters')
