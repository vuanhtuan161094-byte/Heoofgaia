"""Bundle the documented editable HG06 RC1 sources into a single offline HTML file.
Run: python build_offline.py
"""
from pathlib import Path
import re
folder=Path(__file__).parent
html=(folder/'index.html').read_text(encoding='utf-8')
for css in ['style.css','style-hg03.css']:
    pattern=re.compile(r'<link\s+rel="stylesheet"\s+href="'+re.escape(css)+r'">')
    html,n=pattern.subn(lambda _: '<style>\n'+(folder/css).read_text(encoding='utf-8').rstrip()+ '\n</style>',html)
    assert n==1,(css,n)
for js in ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','painter.js','app.js']:
    pattern=re.compile(r'<script\s+src="'+re.escape(js)+r'"></script>')
    html,n=pattern.subn(lambda _: '<script>\n'+(folder/js).read_text(encoding='utf-8').rstrip()+'\n</script>',html)
    assert n==1,(js,n)
assert 'src="data.js"' not in html and 'href="style.css"' not in html
assert html.count('<script>')==8
(folder/'Play-Heoofgaia-HG07.html').write_text(html,encoding='utf-8')
print('Built offline HTML:',len(html),'characters')
