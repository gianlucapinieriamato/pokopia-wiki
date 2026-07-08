#!/usr/bin/env python3
"""Rewrite the requirements arrays of the affected habitats in habitat-config.ts
from parsed Serebii data, resolving all // TODO markers. No network access."""
import re, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
HC = ROOT / 'app/lib/const/habitat-config.ts'
CACHE = ROOT / 'scripts/cache'

reqs_by_label = json.load(open(CACHE / 'habitat_reqs.json'))
t = HC.read_text(encoding='utf-8')

# groupKey -> canonical label used elsewhere in the file (prefer existing style)
gk2label = {}
for m in re.finditer(r'groupKey: "([^"]+)",\s*(?:\n\s*)?label: "([^"]+)"', t):
    gk2label.setdefault(m.group(1), m.group(2))


def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')


def render(reqs):
    out = []
    for r in reqs:
        if r['type'] == 'item':
            out.append(
                '      {\n'
                '        type: "item" as const,\n'
                f'        item: Item.{r["const"]},\n'
                f'        label: "{esc(r["label"])}",\n'
                f'        qty: {r["qty"]},\n'
                '      },')
        else:
            label = gk2label.get(r['groupKey'], r['label'])
            out.append(
                '      {\n'
                '        type: "group" as const,\n'
                f'        groupKey: "{esc(r["groupKey"])}",\n'
                f'        label: "{esc(label)}",\n'
                f'        qty: {r["qty"]},\n'
                '      },')
    return '\n'.join(out)


# label -> TS block key: locate each habitat block by its label field
count = 0
for label, reqs in reqs_by_label.items():
    if not reqs:
        continue
    # find the block: `  KEY: {` ... `label: "<label>"` ... `requirements: [ ... ],`
    m = re.search(
        r'(label: "' + re.escape(label) + r'",\n(?:.*?\n)*?    requirements: )\[.*?\](,?\n  \},)',
        t, re.S)
    if not m:
        raise SystemExit(f'block not found for: {label!r}')
    new_block = m.group(1) + '[\n' + render(reqs) + '\n    ]' + m.group(2)
    t = t[:m.start()] + new_block + t[m.end():]
    count += 1

HC.write_text(t, encoding='utf-8')
remaining = t.count('// TODO: Item')
print(f'rewrote {count} habitats; remaining TODO markers: {remaining}')
