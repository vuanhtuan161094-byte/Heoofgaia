"""P4 release gate: source WebP assets must equal base64 artwork in canonical HTML."""
from pathlib import Path
import base64, hashlib
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
