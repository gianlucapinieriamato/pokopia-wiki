#!/usr/bin/env python3
"""Download icons for the backfill missing items from Serebii (crawl-delay 1.8s)."""
import json, time, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
ICONS = ROOT / 'public' / 'icons' / 'items'
ICONS.mkdir(parents=True, exist_ok=True)
BASE = 'https://www.serebii.net/pokemonpokopia/items'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
           'Referer': 'https://www.serebii.net/pokemonpokopia/'}
DELAY = 1.8

manifest = json.load(open(ROOT / 'scripts' / 'cache' / 'manifest.json'))
ok = skip = fail = 0
failed = []
for i, e in enumerate(manifest, 1):
    fn = e['icon_file']
    dest = ICONS / fn
    if dest.exists() and dest.stat().st_size > 0:
        skip += 1
        continue
    url = f'{BASE}/{fn}'
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        if r.status == 200 and data[:4] == b'\x89PNG':
            dest.write_bytes(data)
            ok += 1
        else:
            fail += 1; failed.append(fn)
        time.sleep(DELAY)
    except Exception as ex:
        fail += 1; failed.append(fn)
        print(f'  WARN {fn}: {ex}', file=sys.stderr)
    if i % 50 == 0:
        print(f'  [{i}/{len(manifest)}] ok={ok} skip={skip} fail={fail}', flush=True)

print(f'DONE: ok={ok} skip={skip} fail={fail}')
if failed:
    json.dump(failed, open(ROOT / 'scripts' / 'cache' / 'failed_icons.json', 'w'))
    print('failed:', failed[:20])
