"""P4 release gate: source WebP assets must equal base64 artwork in canonical HTML."""
from pathlib import Path
import base64, hashlib
import json
import re
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'index.html').read_text(encoding='utf-8')
pairs={'city':'city.webp','portraits':'portrait_atlas.webp','troops':'troops.webp','vfx':'vfx.webp'}
for key,name in pairs.items():
    marker=f'  {key}: `'
    start=s.index(marker)+len(marker)
    end=s.index('`.replace(',start)
    payload=''.join(s[start:end].split())
    assert payload.startswith('data:image/webp;base64,'),f'{name}: data URI invalid'
    packed=base64.b64decode(payload.split(',',1)[1],validate=True)
    source=(ROOT/'assets'/'p4'/name).read_bytes()
    assert hashlib.sha256(packed).hexdigest()==hashlib.sha256(source).hexdigest(), f'{name}: source mismatch'
    print('PASS P4 exact asset',name,len(source),hashlib.sha256(source).hexdigest())
print('P4 ART EXACT-SOURCE GATE 4/4 PASS')

# CL-P4 roster art is packed separately so the legacy P4 assets remain byte-for-byte intact.
manifest=json.loads((ROOT/'assets'/'p4'/'cl-p4-roster-manifest.json').read_text(encoding='utf-8'))
source=(ROOT/'index.html').read_text(encoding='utf-8')
start=source.index('// CL-P4_ROSTER_ASSETS_START')
end=source.index('// CL-P4_ROSTER_ASSETS_END',start)
block=source[start:end]
for key,row in manifest['assets'].items():
    original=(ROOT/'assets'/'p4'/row['source']).read_bytes()
    packed_file=(ROOT/'assets'/'p4'/row['webp']).read_bytes()
    match=re.search(rf'\b{re.escape(key)}:\s*\[(.*?)\]\.join\(""\)',block,re.S)
    assert match,f'{key}: missing packed roster art'
    uri=''.join(re.findall(r'"([^"]*)"',match.group(1)))
    assert uri.startswith('data:image/webp;base64,'),f'{key}: invalid packed data URI'
    embedded=base64.b64decode(uri.split(',',1)[1],validate=True)
    assert hashlib.sha256(original).hexdigest()==row['sourceSha256'],f'{key}: master source SHA mismatch'
    assert hashlib.sha256(packed_file).hexdigest()==row['webpSha256'],f'{key}: derivative SHA mismatch'
    assert embedded==packed_file,f'{key}: canonical HTML bytes mismatch'
    print('PASS CL-P4 exact roster art',row['webp'],len(packed_file),row['webpSha256'])
print('CL-P4 ROSTER ART EXACT-SOURCE GATE 3/3 PASS')
