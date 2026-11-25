#!/usr/bin/env python3
"""Add UI window V2 to the canonical Ngọa Long HTML, preserving gameplay/Save.

The original build chain remains the single source of gameplay. This tool adds
an isolated, idempotent review-only UI overlay after canonical build, never
rewrites gameplay source, and fails closed if the input shape changes.
"""
from __future__ import annotations
import argparse
import base64
import json
import hashlib
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CSS = HERE / 'nl_review_window_v2.css'
JS = HERE / 'nl_review_window_v2.js'
STYLE_TAG = '<style id="nl-fixed-window-style">'
SCRIPT_TAG = '<script id="nl-fixed-window-review-script">'


def build(html: Path) -> str:
    html = html.resolve()
    if not html.exists():
        raise FileNotFoundError(html)
    raw = html.read_text(encoding='utf-8')
    if raw.count('</head>') != 1 or raw.count('</body>') != 1:
        raise ValueError('Expected a normal single-document HTML entrypoint')
    if not all(x in raw for x in ('id="app"', 'id="view"')):
        raise ValueError('Missing expected app/view anchors; review source change')
    css = CSS.read_text(encoding='utf-8') + '\n' + (HERE / 'nl_art_d.css').read_text(encoding='utf-8')
    # Original painted scene assets; shared once per offline document.
    def scene_uri(path):
        raw = path.read_bytes()
        if raw[:4] != b'RIFF' or raw[8:12] != b'WEBP':
            raise ValueError('D4 scene is not original packed WebP')
        return 'data:image/webp;base64,' + base64.b64encode(raw).decode('ascii')
    root = HERE.parent
    d4 = {'region':scene_uri(root/'assets/p5/cl-p5-region-map.webp'),
          'city':scene_uri(root/'assets/p4/city.webp')}
    js = JS.read_text(encoding='utf-8') + '\nwindow.__NL_ART_D4_UI__=' + json.dumps(d4,separators=(',',':')) + ';\n' + (HERE / 'nl_art_d.js').read_text(encoding='utf-8')
    if 'NL-WINDOW-UI-V2' not in js or 'NL FIXED WINDOW V2' not in css:
        raise ValueError('UI V2 source markers missing')
    # Idempotent; do not silently combine the obsolete V1 overlay with V2.
    if 'NL-WINDOW-UI-20261121:' in raw:
        raise ValueError('Obsolete V1 overlay detected; rebuild canonical HTML before V2')
    raw = re.sub(r'<style id="nl-fixed-window-style">.*?</style>\s*', '', raw, flags=re.S)
    raw = re.sub(r'<script id="nl-fixed-window-review-script">.*?</script>\s*', '', raw, flags=re.S)
    raw = raw.replace('</head>', f'{STYLE_TAG}\n{css}</style>\n</head>', 1)
    raw = raw.replace('</body>', f'{SCRIPT_TAG}\n{js}</script>\n</body>', 1)
    if raw.count(STYLE_TAG) != 1 or raw.count(SCRIPT_TAG) != 1:
        raise AssertionError('Failed to insert exactly one review overlay')
    html.write_text(raw,encoding='utf-8')
    return hashlib.sha256(html.read_bytes()).hexdigest()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--html',type=Path,default=Path('index.html'))
    args = p.parse_args()
    sha = build(args.html)
    print('NL UI V2 review generated:', args.html, sha)


if __name__ == '__main__':
    main()
