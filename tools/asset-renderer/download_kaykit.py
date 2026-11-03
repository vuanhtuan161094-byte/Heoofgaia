"""Acquire only selected CC0 sources from the author's pinned repository."""
from pathlib import Path
import hashlib,json,urllib.request,struct
root=Path(__file__).resolve().parents[2]
out=root/'assets/licensed/kaykit-heavy-soldier/source'
out.mkdir(parents=True,exist_ok=True)
commit='672074b73ba276876a19e8816ecdc5241817ab47'
base=f'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/{commit}/'
prefix='addons/kaykit_character_pack_adventures/'
paths=['LICENSE.txt',prefix+'Characters/gltf/Knight.glb',prefix+'Characters/gltf/knight_texture.png',prefix+'Assets/gltf/sword_1handed.gltf',prefix+'Assets/gltf/sword_1handed.bin',prefix+'Assets/gltf/shield_square.gltf',prefix+'Assets/gltf/shield_square.bin']
records=[]
for source in paths:
    url=base+source
    data=urllib.request.urlopen(url,timeout=30).read()
    dest=out/Path(source).name;dest.write_bytes(data)
    records.append({'path':dest.relative_to(root).as_posix(),'sourceUrl':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper()})
    print(dest.name,len(data),flush=True)
raw=(out/'Knight.glb').read_bytes()
assert raw[:4]==b'glTF' and struct.unpack_from('<I',raw,4)[0]==2
length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length])
manifest={'author':'Kay Lousberg','license':'CC0-1.0','sourceCommit':commit,'sourceRepository':'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0','files':records,'animations':[{'name':a.get('name'),'channels':len(a['channels'])} for a in gltf.get('animations',[])],'nodes':[n.get('name') for n in gltf['nodes']],'images':gltf.get('images',[])}
(out.parent/'source-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Animations:',[a.get('name') for a in gltf.get('animations',[])])
print('Slots:',[n.get('name') for n in gltf['nodes'] if any(x in n.get('name','').lower() for x in ['slot','hand'])])
