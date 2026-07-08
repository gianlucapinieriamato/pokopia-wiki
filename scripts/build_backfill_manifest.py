#!/usr/bin/env python3
"""Build a manifest of the missing Serebii items with their favorite-category
membership and crafting recipes, parsed from cached HTML. No network access."""
import re, html, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
CACHE = Path(__file__).parent / 'cache'


def norm(s):
    s = html.unescape(s).lower().replace('é', 'e').replace('�', 'e')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def slugify(label):
    return re.sub(r'[^a-z0-9]+', '-', html.unescape(label).lower().replace('é', 'e')).strip('-')


def pascal(label):
    label = html.unescape(label).replace('é', 'e').replace('�', 'e')
    parts = re.split(r'[^A-Za-z0-9]+', label)
    return ''.join(p[:1].upper() + p[1:].lower() if p else '' for p in parts)


# ── Load item universe ──────────────────────────────────────────────────────
all_items = json.load(open(CACHE / 'all_items.json'))          # [{label,icon,href}]
href2label = {it['href']: it['label'] for it in all_items}
href2icon = {it['href']: it['icon'] for it in all_items}
known_hrefs = set(href2label)
missing = json.load(open(CACHE / 'missing_items.json'))          # [{label,icon,href}]
missing_hrefs = {it['href'] for it in missing}

# ── Existing items.ts consts/slugs/labels ───────────────────────────────────
its = (ROOT / 'app/lib/const/items.ts').read_text(encoding='utf-8')
existing_consts = set(re.findall(r'^  (\w+): \{', its, re.M))
existing_slugs = set(re.findall(r'slug: "([^"]+)"', its))
existing_label2const = {}
for m in re.finditer(r'^  (\w+): \{(.*?)\},', its, re.S | re.M):
    const, body = m.group(1), m.group(2)
    lm = re.search(r'label: "((?:[^"\\]|\\.)*)"', body)
    if lm:
        existing_label2const[norm(lm.group(1))] = const

# ── Parse favorites pages: category slug -> set(hrefs) ──────────────────────
cat_files = json.load(open(CACHE / 'cat_files.json'))            # slug -> filename
cat_membership = {}   # href -> [category slug]
for slug, fname in cat_files.items():
    t = (CACHE / 'fav' / f'{fname}.html').read_text(encoding='utf-8', errors='replace')
    seen = set()
    for h in re.findall(r'/pokemonpokopia/items/([^"]+\.shtml)', t):
        if h in known_hrefs and h not in seen:
            seen.add(h)
            cat_membership.setdefault(h, []).append(slug)

# ── Parse crafting.shtml: href -> {category, unlock, materials} ─────────────
craft = (CACHE / 'crafting.html').read_text(encoding='utf-8', errors='replace')
anchors = [(m.group(1).rstrip('.'), m.start())
           for m in re.finditer(r'<a name="([^"]+)"', craft)]
anchors.sort(key=lambda x: x[1])
CAT_LABEL = {'furniture': 'Furniture', 'misc': 'Misc', 'outdoor': 'Outdoor',
             'utilities': 'Utilities', 'buildings': 'Buildings', 'blocks': 'Blocks',
             'other': 'Other'}


def cat_at(pos):
    cur = None
    for name, start in anchors:
        if start <= pos:
            cur = name
        else:
            break
    return CAT_LABEL.get(cur, 'Misc')


recipes = {}   # href -> {category, unlock, materials:[(mat_href, mat_label, qty)]}
# Recipe rows contain a nested materials <table>, so slice the page between
# consecutive item picture cells and parse each slice independently.
pic_re = re.compile(
    r'<td class="cen"><a href="items/([^"]+\.shtml)"><img src="items/[^"]+"[^>]*alt="([^"]*)"\s*/></a></td>')
picks = [(m.group(1), m.start(), m.end()) for m in pic_re.finditer(craft)]
for i, (href, start, end) in enumerate(picks):
    stop = picks[i + 1][1] if i + 1 < len(picks) else len(craft)
    slice_ = craft[end:stop]
    # unlock = first fooinfo cell; may contain <br /> line breaks → " / "
    um = re.search(r'<td class="fooinfo">(.*?)</td>', slice_, re.S)
    unlock = ''
    if um:
        u = re.sub(r'<br\s*/?>', ' / ', um.group(1))
        u = re.sub(r'<[^>]+>', '', u)
        unlock = re.sub(r'\s+', ' ', html.unescape(u)).strip().replace('�', 'e')
    mats = []
    for mm in re.finditer(r'<a href="items/([^"]+\.shtml)"><u>([^<]+)</u></a>\s*\*\s*(\d+)', slice_):
        mats.append((mm.group(1), html.unescape(mm.group(2)).replace('�', 'e'), int(mm.group(3))))
    recipes[href] = {'category': cat_at(start), 'unlock': unlock, 'materials': mats}

# ── Assemble manifest for missing items ─────────────────────────────────────
manifest = []
used_consts = set(existing_consts)
used_slugs = set(existing_slugs)
collisions = []
for it in missing:
    href, label, icon = it['href'], it['label'], it['icon']
    slug = slugify(label)
    const = pascal(label)
    # collision resolution
    if const in used_consts:
        collisions.append(('const', const, label))
    if slug in used_slugs:
        collisions.append(('slug', slug, label))
    used_consts.add(const)
    used_slugs.add(slug)
    entry = {
        'label': label, 'slug': slug, 'const': const,
        'icon': f'/icons/items/{icon}', 'icon_file': icon, 'href': href,
        'categories': sorted(cat_membership.get(href, [])),
        'recipe': recipes.get(href),
    }
    manifest.append(entry)

# ── Resolve material label -> const (existing or new) ───────────────────────
new_label2const = {norm(e['label']): e['const'] for e in manifest}
label2const = {**existing_label2const, **new_label2const}
unresolved_mats = set()
for e in manifest:
    if e['recipe']:
        for mh, mlabel, qty in e['recipe']['materials']:
            if norm(mlabel) not in label2const:
                unresolved_mats.add(mlabel)

json.dump(manifest, open(CACHE / 'manifest.json', 'w'), indent=1)
print(f"missing items: {len(manifest)}")
print(f"  with >=1 favorite category: {sum(1 for e in manifest if e['categories'])}")
print(f"  with a recipe: {sum(1 for e in manifest if e['recipe'])}")
print(f"collisions (const/slug vs existing or dupes): {len(collisions)}")
for c in collisions[:20]:
    print("   ", c)
print(f"unresolved recipe materials: {len(unresolved_mats)}")
for u in sorted(unresolved_mats)[:20]:
    print("   ", repr(u))
