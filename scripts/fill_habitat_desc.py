#!/usr/bin/env python3
"""Fill empty habitat descriptions in habitat-config.ts from Serebii's
habitats.shtml (already cached/parsed to habitat_desc.json)."""
import re, json, unicodedata
from pathlib import Path

ROOT = Path(__file__).parent.parent
HC = ROOT / 'app/lib/const/habitat-config.ts'
desc_by_name = json.load(open(ROOT / 'scripts/cache/habitat_desc.json'))


def norm_desc(s: str) -> str:
    s = s.replace('…', '...')       # ellipsis -> ...
    s = s.replace('é', 'e').replace('É', 'E')  # match file convention ("Pokemon")
    s = s.replace('\xa0', ' ')           # nbsp -> space
    s = re.sub(r'\s+', ' ', s).strip()
    return s


t = HC.read_text(encoding='utf-8')

# Find every habitat block with an empty description; fill from label match.
filled, skipped = [], []


def repl(m):
    label = m.group('label')
    if m.group('desc').strip() != '':
        return m.group(0)  # already has one
    raw = desc_by_name.get(label)
    if raw is None:
        skipped.append(label)
        return m.group(0)
    d = norm_desc(raw)
    if '"' in d or '\\' in d:
        d = d.replace('\\', '\\\\').replace('"', '\\"')
    filled.append(label)
    return f'{m.group("head")}"{d}"'


pat = re.compile(
    r'(?P<head>slug: "[^"]+",\n\s*label: "(?P<label>[^"]+)",\n\s*description:\n\s*)'
    r'"(?P<desc>(?:[^"\\]|\\.)*)"')
t = pat.sub(repl, t)
HC.write_text(t, encoding='utf-8')
print(f'filled {len(filled)} descriptions:')
for f in filled:
    print('  ', f)
if skipped:
    print('skipped (no Serebii match):', skipped)
