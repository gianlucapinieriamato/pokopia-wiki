#!/usr/bin/env python3
"""Parse the Requirements table from cached habitatdex pages: item rows (mapped
to Item consts) and group rows ("X (any)" -> ITEM_GROUPS key). Empty quantity
cells default to 1. Reports anything unresolved."""
import re, html, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
CACHE = ROOT / 'scripts/cache'


def norm(s):
    s = html.unescape(s).lower().replace('é', 'e').replace('�', 'e')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


all_items = json.load(open(CACHE / 'all_items.json'))
href2label = {it['href']: it['label'] for it in all_items}

its = (ROOT / 'app/lib/const/items.ts').read_text(encoding='utf-8')
label2const, const2label = {}, {}
for m in re.finditer(r'^  (\w+): \{(.*?)\},', its, re.S | re.M):
    lm = re.search(r'label: "((?:[^"\\]|\\.)*)"', m.group(2))
    if lm:
        label2const[norm(lm.group(1))] = m.group(1)
        const2label[m.group(1)] = lm.group(1)

ig = (ROOT / 'app/lib/const/item-groups.ts').read_text(encoding='utf-8')
hc = (ROOT / 'app/lib/const/habitat-config.ts').read_text(encoding='utf-8')
# valid group keys = those defined in ITEM_GROUPS plus those already used by
# existing habitats (the data uses some groupKeys without an ITEM_GROUPS entry).
group_keys = set(re.findall(r'"([^"]+)":\s*\[', ig)) | set(re.findall(r'groupKey: "([^"]+)"', hc))


def group_key(name):
    k = re.sub(r'\s*\(any\)\s*$', '', name.strip(), flags=re.I)
    k = re.sub(r'\s+', ' ', k.lower()).strip()
    k = re.sub(r'\s*\(', ' (', k)   # normalize "table(large)" -> "table (large)"
    return k


hrefs = json.load(open(CACHE / 'hab_hrefs.json'))
out, unresolved = {}, []
for label, href in hrefs.items():
    t = (CACHE / 'hab' / href.replace("'", '')).read_text(encoding='utf-8', errors='replace')
    i = t.find('<h2>Requirements</h2>')
    reqs = []
    if i >= 0:
        tbl = t[i:t.find('</table>', i) + 8]
        for row in re.findall(r'<tr>(.*?)</tr>', tbl, re.S):
            if 'fooevo' in row:      # header row
                continue
            nm = re.search(r'<u>([^<]+)</u>', row)
            if not nm:
                continue
            name = html.unescape(nm.group(1)).replace('�', 'e').strip()
            qm = re.search(r'<td class="fooinfo">\s*(\d*)\s*</td>\s*$', row.strip())
            qty = int(qm.group(1)) if (qm and qm.group(1)) else 1
            link = re.search(r'items/([^"]+\.shtml)', row)
            if link:  # item requirement
                rhref = link.group(1)
                const = label2const.get(norm(name)) or label2const.get(norm(href2label.get(rhref, '')))
                if const:
                    reqs.append({'type': 'item', 'const': const,
                                 'label': const2label[const], 'qty': qty})
                else:
                    unresolved.append((label, name, rhref))
                    reqs.append({'type': 'item', 'const': None, 'label': name, 'qty': qty})
            else:      # group requirement
                gk = group_key(name)
                if gk not in group_keys:
                    unresolved.append((label, name, f'group:{gk}'))
                reqs.append({'type': 'group', 'groupKey': gk, 'label': name, 'qty': qty})
    out[label] = reqs

json.dump(out, open(CACHE / 'habitat_reqs.json', 'w'), indent=1)
for label, reqs in out.items():
    disp = ', '.join(
        (f"[{r['groupKey']}]" if r['type'] == 'group' else r['label'])
        + f"×{r['qty']}" + ('' if r.get('const') or r['type'] == 'group' else ' [UNRESOLVED]')
        for r in reqs)
    print(f"{label}: {disp if reqs else '(none)'}")
if unresolved:
    print("\nUNRESOLVED:")
    for h, n, x in unresolved:
        print(f"  {h}: {n!r} ({x})")
