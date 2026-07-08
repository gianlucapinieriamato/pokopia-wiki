#!/usr/bin/env python3
"""Apply the backfill manifest to the four data files. Idempotent-ish: refuses
to add consts/slugs/keys that already exist. No network access."""
import re, html, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
CACHE = Path(__file__).parent / 'cache'
ITEMS = ROOT / 'app/lib/const/items.ts'
CATS = ROOT / 'app/lib/const/categories.ts'
CRAFT = ROOT / 'app/lib/const/crafting.ts'
CMAP = ROOT / 'scripts/consts-map.json'


def norm(s):
    s = html.unescape(s).lower().replace('é', 'e').replace('�', 'e')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


manifest = json.load(open(CACHE / 'manifest.json'))
manifest.sort(key=lambda e: e['const'])

# ── label -> const (existing + new), for material resolution ────────────────
its = ITEMS.read_text(encoding='utf-8')
existing_consts = set(re.findall(r'^  (\w+): \{', its, re.M))
existing_slugs = set(re.findall(r'slug: "([^"]+)"', its))
label2const = {}
for m in re.finditer(r'^  (\w+): \{(.*?)\},', its, re.S | re.M):
    lm = re.search(r'label: "((?:[^"\\]|\\.)*)"', m.group(2))
    if lm:
        label2const[norm(lm.group(1))] = m.group(1)
for e in manifest:
    label2const[norm(e['label'])] = e['const']


def esc(s):  # escape for TS double-quoted string
    return html.unescape(s).replace('\\', '\\\\').replace('"', '\\"').replace('�', 'e')


# ── 1. items.ts ─────────────────────────────────────────────────────────────
new_items = [e for e in manifest if e['const'] not in existing_consts and e['slug'] not in existing_slugs]
blocks = []
for e in new_items:
    blocks.append(
        f'  {e["const"]}: {{\n'
        f'    slug: "{e["slug"]}",\n'
        f'    label: "{esc(e["label"])}",\n'
        f'    icon: "{e["icon"]}",\n'
        f'  }},')
insert = '\n'.join(blocks) + '\n'
assert its.count('\n} as const;') >= 1
its = its.replace('\n} as const;', '\n' + insert + '} as const;', 1)
ITEMS.write_text(its, encoding='utf-8')

# ── 2. consts-map.json ──────────────────────────────────────────────────────
cmap = CMAP.read_text(encoding='utf-8')
existing_cmap_keys = set(re.findall(r'"(Item::[^"]+)":', cmap))
lines = []
for e in manifest:
    key = f'Item::{e["slug"]}'
    if key in existing_cmap_keys:
        continue
    lines.append(f'  "{key}": "Item.{e["const"]}",')
assert cmap.startswith('{\n')
cmap = '{\n' + '\n'.join(lines) + '\n' + cmap[2:]
CMAP.write_text(cmap, encoding='utf-8')

# ── 3. categories.ts (only the items that have favorite categories) ─────────
cats = CATS.read_text(encoding='utf-8')
by_cat = {}
for e in manifest:
    for c in e['categories']:
        by_cat.setdefault(c, []).append(e['const'])
cat_added = 0
for slug, consts in by_cat.items():
    m = re.search(r'(slug: "' + re.escape(slug) + r'",.*?\n)(\s*)\] as ItemConst\[\],', cats, re.S)
    if not m:
        raise SystemExit(f'category block not found: {slug}')
    item_indent = m.group(2) + '  '
    addition = ''.join(f'{item_indent}Item.{c},\n' for c in consts)
    cats = cats[:m.end(1)] + addition + cats[m.end(1):]
    cat_added += len(consts)
CATS.write_text(cats, encoding='utf-8')

# ── 4. crafting.ts (new recipe keys only) ───────────────────────────────────
craft = CRAFT.read_text(encoding='utf-8')
existing_keys = set(re.findall(r'^  "([^"]+)":', craft, re.M))
rec_blocks = []
craft_added = 0
for e in manifest:
    r = e['recipe']
    if not r or e['slug'] in existing_keys:
        continue
    mats = ''
    mat_items = []
    for _mh, mlabel, qty in r['materials']:
        const = label2const[norm(mlabel)]
        mat_items.append(f'      {{\n        item: Item.{const},\n        qty: {qty},\n      }}')
    mats = ',\n'.join(mat_items)
    rec_blocks.append(
        f'  "{e["slug"]}": {{\n'
        f'    "category": "{r["category"]}",\n'
        f'    "unlock": "{esc(r["unlock"])}",\n'
        f'    "materials": [\n{mats}\n    ]\n'
        f'  }}')
    craft_added += 1
if rec_blocks:
    assert craft.rstrip().endswith('} as const;')
    craft = craft.replace('\n} as const;', ',\n' + ',\n'.join(rec_blocks) + '\n} as const;', 1)
    CRAFT.write_text(craft, encoding='utf-8')

print(f'items.ts: +{len(new_items)} items')
print(f'consts-map.json: +{len(lines)} mappings')
print(f'categories.ts: +{cat_added} category memberships across {len(by_cat)} categories')
print(f'crafting.ts: +{craft_added} new recipes (existing keys left untouched)')
