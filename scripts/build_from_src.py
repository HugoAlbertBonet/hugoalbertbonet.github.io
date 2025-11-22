#!/usr/bin/env python3
"""Build final index.html by inlining CSS and inserting partials from src/.

This script is safe to run locally and will overwrite root index.html with the assembled output.
Use this when you edit partials or CSS in src/.
"""
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent.parent
SRC = BASE / 'src'
TEMPLATE = SRC / 'template.html'
PARTIALS = SRC / 'partials'
CSS = SRC / 'css' / 'styles.css'
OUT = BASE / 'index.html'

PLACEHOLDERS = {
    'CSS': CSS,
    'NAV': PARTIALS / 'nav.html',
    'HERO': PARTIALS / 'hero.html',
    'ABOUT': PARTIALS / 'about.html',
    'EDUCATION': PARTIALS / 'education.html',
    'RESEARCH': PARTIALS / 'research.html',
    'SKILLS': PARTIALS / 'skills.html',
    'CONTACT': PARTIALS / 'contact.html',
    'FOOTER': PARTIALS / 'footer.html',
}

def read_text(p: Path):
    if not p.exists():
        print(f'Warning: missing {p}', file=sys.stderr)
        return ''
    return p.read_text(encoding='utf-8')

def build():
    if not TEMPLATE.exists():
        print('template.html not found in src/', file=sys.stderr)
        sys.exit(1)

    out = read_text(TEMPLATE)

    # inline CSS
    css_text = read_text(CSS)
    css_block = f"<style>\n{css_text}\n</style>" if css_text else ''
    out = out.replace('{{CSS}}', css_block)

    # insert partials
    for key, path in PLACEHOLDERS.items():
        if key == 'CSS':
            continue
        partial_text = read_text(path)
        out = out.replace('{{' + key + '}}', partial_text)

    OUT.write_text(out, encoding='utf-8')
    print('Wrote', OUT)

if __name__ == '__main__':
    build()
