#!/usr/bin/env python3
"""List all GTFS datasets available on dados.gov.pt."""
import urllib.request, ssl, json, sys

ctx = ssl._create_unverified_context()

all_items = []
# Try the correct API endpoint
for page in range(1, 10):
    req = urllib.request.Request(
        f'https://dados.gov.pt/api/1/datasets/?q=gtfs&page={page}&page_size=20',
        headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
    )
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=15)
    except Exception as e:
        print(f"Page {page} error: {e}")
        break
    obj = json.loads(r.read().decode('utf-8'))
    items = obj.get('data', [])
    if not items:
        break
    all_items.extend(items)
    req = urllib.request.Request(
        f'https://dados.gov.pt/api/1/datasets/?q=gtfs&page={page}&page_size=20',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=15)
    except Exception as e:
        print(f"Page {page} error: {e}")
        break
    obj = json.loads(r.read().decode('utf-8'))
    items = obj.get('data', [])
    if not items:
        break
    all_items.extend(items)

print(f"Total GTFS datasets: {len(all_items)}\n")
for d in all_items:
    title = d.get('title') or d.get('id') or '?'
    acronym = d.get('acronym') or '-'
    did = d.get('id', '')
    print(f"  {acronym:35} | {str(title)[:80]}")
    # Print resource download URLs if any
    for res in d.get('resources', []):
        url = res.get('url') or res.get('latest', '')
        if url and ('gtfs' in url.lower() or '.zip' in url.lower()):
            print(f"    -> {url[:120]}")
